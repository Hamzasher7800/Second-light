import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import OpenAI from "https://esm.sh/openai@4.20.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// Add input validation
function validateRequest(data) {
  if (!data.documentId) {
    throw new Error("Document ID is required");
  }
  if (!data.documentType) {
    throw new Error("Document type is required");
  }
  if (!data.documentTitle) {
    throw new Error("Document title is required");
  }
  if (!data.documentText) {
    throw new Error("Document text is required for analysis");
  }
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }
    // Setup clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Ensure storage bucket exists
    // await ensureStorageBucketExists(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY") || ""
    });
    const startTime = performance.now();
    // Parse and validate the request
    const requestData = await req.json();
    validateRequest(requestData);
    const { documentId, documentText, documentType, documentTitle } = requestData;
    // Start the processing
    await supabaseClient.from("documents").update({
      processing_status: "processing",
      status: "Processing",
      error_message: null
    }).eq("id", documentId);
    // Log the request
    const { data: logData, error: logError } = await supabaseClient.from("document_processing_logs").insert({
      document_id: documentId,
      request_payload: requestData,
      status: "processing"
    }).select().single();
    if (logError) {
      console.error("Error logging request:", logError);
    }
    const logId = logData?.id;
    // Let's simulate document text if none provided (for real implementation, you'd extract text from files)
    if (!documentText || documentText.trim().length < 20) {
      throw new Error("Could not extract text from the uploaded document. Please upload a valid medical report PDF or image.");
    }
    const text = documentText;
    // Call OpenAI to analyze the document
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a medical document analyzer. ONLY process documents that are written in English and are medical in nature (e.g., medical reports, lab results, prescriptions, doctor's notes, or documents discussing medical issues, symptoms, diagnoses, or treatments). If the document is not in English or is not a medical document, respond with a JSON object: {\"error\": \"This document is not a valid English medical document.\"}. Otherwise, extract key information from the document and provide a response in JSON format. Do not include any markdown formatting or backticks. The response should be a valid JSON object with this structure:\n{\n  \"summary\": \"Brief 2-3 sentence overview of the document\",\n  \"key_findings\": [\n    { \"marker\": \"Finding name or category\", \"explanation\": \"Detailed explanation of the finding\" }\n  ],\n  \"recommendations\": [\"List of recommendations based on findings\"]\n}"
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: {
        type: "json_object"
      } // Enforce JSON response format
    });
    // Parse the response with better error handling
    let analysis;
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }
      // Remove any potential markdown formatting if present
      const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanJson);
      // If OpenAI returns an error object, throw an error
      if (analysis.error) {
        throw new Error(analysis.error);
      }
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse document analysis results");
    }
    // Update the document with the analysis results
    const { error: updateError } = await supabaseClient.from("documents").update({
      summary: analysis.summary || "",
      status: "Analyzed",
      processing_status: "completed",
      error_message: null
    }).eq("id", documentId);
    if (updateError) {
      console.error("Error updating document:", updateError);
      throw new Error("Failed to update document with analysis results");
    }
    // Insert key findings
    if (analysis.key_findings && analysis.key_findings.length > 0) {
      const { error: findingsError } = await supabaseClient.from("key_findings").upsert(analysis.key_findings.map((finding)=>({
          document_id: documentId,
          marker: finding.marker,
          explanation: finding.explanation
        })));
      if (findingsError) {
        console.error("Error inserting key findings:", findingsError);
      }
    }
    // Insert recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      const { error: recommendationsError } = await supabaseClient.from("recommendations").upsert(analysis.recommendations.map((recommendation)=>({
          document_id: documentId,
          content: recommendation
        })));
      if (recommendationsError) {
        console.error("Error inserting recommendations:", recommendationsError);
      }
    }
    // Update the processing log
    if (logId) {
      const { error: logUpdateError } = await supabaseClient.from("document_processing_logs").update({
        response_payload: analysis,
        status: "completed",
        completed_at: new Date().toISOString()
      }).eq("id", logId);
      if (logUpdateError) {
        console.error("Error updating processing log:", logUpdateError);
      }
    }
    const endTime = performance.now();
    console.log(`Processing completed in ${(endTime - startTime) / 1000} seconds`);
    return new Response(JSON.stringify({
      message: "Document processed successfully",
      summary: analysis.summary,
      processingTime: (endTime - startTime) / 1000
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Error processing document:", error);
    // Enhanced error handling
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStatus = error instanceof Error && error.message.includes("required") ? 400 : 500;
    // Try to extract document ID from request for error logging
    let documentId = null;
    try {
      const requestData = await req.clone().json();
      documentId = requestData.documentId;
    } catch (e) {
      console.error("Could not parse request for error logging:", e);
    }
    // Update document status if we have the ID
    if (documentId) {
      const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_ANON_KEY") || "", {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") || ""
          }
        }
      });
      await supabaseClient.from("documents").update({
        processing_status: "error",
        status: "Error",
        error_message: errorMessage
      }).eq("id", documentId);
      await supabaseClient.from("document_processing_logs").update({
        status: "error",
        error_message: errorMessage
      }).eq("document_id", documentId).order("created_at", {
        ascending: false
      }).limit(1);
    }
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      status: errorStatus
    }), {
      status: errorStatus,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
