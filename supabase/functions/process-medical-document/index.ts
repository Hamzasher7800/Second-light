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
    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4",
      messages: [
        {
          role: "system",
            content: `You are a medical document analyzer capable of processing any type of medical document in any language. Your tasks are:

1. If the document is not in English, first translate it to English (do not include the translation in your response).
2. Analyze the (translated) document and extract as much structured information as possible, even if the document is narrative or not in a standard format.
3. Always return your response in English, in the following JSON format:
{
  "summary": "Brief 2-3 sentence overview of the document",
  "key_findings": [
    {
      "marker": "Diagnosis, symptom, medication, allergy, lab result, or other key finding (inferred or explicit)",
      "value": "Details or value if available, otherwise 'Not specified'",
      "reference_range": "Normal range if applicable, otherwise ''",
      "interpretation": "Clinical interpretation or significance, otherwise ''",
      "category": "Diagnosis | Symptom | Medication | Allergy | Lab Result | History | Other"
    }
  ],
  "metadata": {
    "patient_info": {
      "date": "Document date if available, otherwise ''",
      "provider": "Healthcare provider if available, otherwise ''",
      "facility": "Medical facility if available, otherwise ''"
    }
  },
  "recommendations": [
    "List of recommendations, follow-ups, or next steps"
  ],
  "critical_values": [
    "Any values or findings that require immediate attention"
  ]
}

- If a field is not present in the document, fill it with an empty string or 'Not specified'.
- If the document is not medical in nature, respond ONLY with this JSON: {"error": "This document does not appear to be a medical document"}
- Do NOT include the translation in your response, only the analysis in English.
- If the document is corrupted or unreadable, respond with a summary explaining that no meaningful information could be extracted.
- **Never leave key_findings empty for a medical document. If explicit findings are not present, INFER or SUMMARIZE likely diagnoses, medications, symptoms, or other findings based on the content. Always provide at least 2-3 key findings, even if they must be inferred from the context.**
- **EXAMPLES for narrative:**
  - marker: "Diagnosis", value: "Colitis Ulcerosa", category: "Diagnosis"
  - marker: "Medication", value: "Prednisone 10mg daily", category: "Medication"
  - marker: "Symptom", value: "Dyspnoea", category: "Symptom"
  - marker: "Allergy", value: "Penicillin", category: "Allergy"
  - marker: "Lab Result", value: "Hemoglobin 12.5 g/dL", reference_range: "13-17 g/dL", interpretation: "Low", category: "Lab Result"`
        },
        {
          role: "user",
          content: text
        }
      ],
        temperature: 0.2,
        max_tokens: 2000
      });
    } catch (apiError) {
      console.error("OpenAI API Error:", apiError);
      throw new Error(`OpenAI API error: ${apiError.message}`);
    }

    // Parse the response with better error handling
    let analysis;
    try {
      const content = response?.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error("Empty or invalid response:", response);
        throw new Error("Empty or invalid response from OpenAI");
      }

      try {
        // Try to parse the content directly first
        analysis = JSON.parse(content.trim());
      } catch (jsonError) {
        // If direct parsing fails, try to clean the content first
        console.error("Initial JSON Parse Error:", jsonError);
        // Remove any potential markdown formatting or extra text
        const cleanJson = content
          .replace(/```json\n?|\n?```/g, '')
          .replace(/^[\s\n]*{/, '{')
          .replace(/}[\s\n]*$/, '}')
          .trim();
        
        try {
      analysis = JSON.parse(cleanJson);
        } catch (secondJsonError) {
          console.error("JSON Parse Error after cleaning:", secondJsonError);
          console.error("Raw content:", content);
          console.error("Cleaned content:", cleanJson);
          throw new Error(`Invalid JSON response from OpenAI: ${secondJsonError.message}`);
        }
      }

      // Validate the response structure
      if (!analysis || typeof analysis !== 'object') {
        throw new Error("Response is not a valid object");
      }

      // Special handling for error responses
      if (analysis.error) {
        // Log the text content for debugging
        console.log("Document text being analyzed:", text);
        // If it looks like a lab report but was rejected, override the error
        if (text.toLowerCase().includes('blood') || 
            text.toLowerCase().includes('test') || 
            text.toLowerCase().includes('laboratory') ||
            text.toLowerCase().includes('specimen')) {
          console.log("Detected medical terms in document, proceeding with analysis");
          throw new Error("Document appears to be medical but analysis failed");
        }
        throw new Error(analysis.error);
      }

      // Validate required fields
      if (!analysis.summary || !Array.isArray(analysis.key_findings)) {
        console.error("Invalid response structure:", analysis);
        throw new Error("Response missing required fields (summary or key_findings)");
      }

      // Ensure each key finding has the required structure
      analysis.key_findings.forEach((finding, index) => {
        if (!finding.marker || !finding.value) {
          throw new Error(`Invalid key finding at index ${index}: missing required fields`);
        }
      });

      if (!analysis.key_findings || analysis.key_findings.length === 0) {
        // Fallback: second OpenAI call for key findings extraction
        const fallbackResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert medical information extractor. Given the following medical report, extract all possible key findings as a JSON array. Each finding should have:
- marker: Diagnosis, medication, symptom, allergy, lab result, or other key finding (inferred or explicit)
- value: Details or value if available, otherwise 'Not specified'
- reference_range: Normal range if applicable, otherwise ''
- interpretation: Clinical interpretation or significance, otherwise ''
- category: Diagnosis | Symptom | Medication | Allergy | Lab Result | History | Other

Return ONLY a JSON array of findings, e.g.:
[
  {"marker": "Diagnosis", "value": "Colitis Ulcerosa", "reference_range": "", "interpretation": "", "category": "Diagnosis"},
  {"marker": "Medication", "value": "Prednisone 10mg daily", "reference_range": "", "interpretation": "", "category": "Medication"}
]`
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.2,
          max_tokens: 1000
        });

        // Parse the fallback response
        let fallbackFindings = [];
        try {
          const fallbackContent = fallbackResponse?.choices?.[0]?.message?.content;
          fallbackFindings = JSON.parse(fallbackContent.trim());
          if (Array.isArray(fallbackFindings) && fallbackFindings.length > 0) {
            analysis.key_findings = fallbackFindings;
          }
        } catch (e) {
          console.error("Fallback extraction failed:", e);
        }
      }

    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error(`Failed to parse document analysis results: ${parseError.message}`);
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
      const { error: findingsError } = await supabaseClient.from("key_findings").upsert(
        analysis.key_findings.map((finding) => ({
          document_id: documentId,
          marker: finding.marker,
          value: finding.value || finding.explanation || "Not specified",
          reference_range: finding.reference_range,
          interpretation: finding.interpretation,
          category: finding.category,
          explanation: finding.explanation || finding.value || "Not specified", // for backward compatibility
        }))
      );
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

