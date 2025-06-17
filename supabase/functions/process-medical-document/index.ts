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
  // Only require documentText if documentImage is not present
  if (!data.documentText && !data.documentImage) {
    throw new Error("Either document text or document image is required for analysis");
  }
}
serve(async (req)=>{
  let startTime = performance.now();
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

    // Setup clients
  // @ts-expect-error Deno global is only available in Deno runtime, not Node
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  // @ts-expect-error Deno global is only available in Deno runtime, not Node
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  // @ts-expect-error Deno global is only available in Deno runtime, not Node
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
        Authorization: req.headers.get("Authorization")
      }
      }
    });
  // @ts-expect-error Deno global is only available in Deno runtime, not Node
    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY") || ""
    });

  let requestData;
  let documentId = null;
  try {
    requestData = await req.json();
    validateRequest(requestData);
    documentId = requestData.documentId;
  } catch (e) {
    console.error("Request validation error:", e);
    return new Response(JSON.stringify({
      success: false,
      error: e.message || "Invalid request"
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }

  try {
    const { documentText, documentType, documentTitle, documentImage } = requestData;
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

    let text = documentText;
    // If no valid text, but image is present, use GPT-4o Vision API
    if ((!text || text.trim().length < 20) && documentImage) {
      try {
        console.log('Starting image processing with URL:', documentImage);

        // 1. First verify the image URL is accessible
        try {
          const urlTest = await fetch(documentImage);
          console.log('URL test status:', urlTest.status);
          
          if (!urlTest.ok) {
            throw new Error(`Image URL not accessible: ${urlTest.status}`);
          }
          
          // Check content type
          const contentType = urlTest.headers.get('content-type');
          console.log('Image content type:', contentType);
          
          if (!contentType?.startsWith('image/')) {
            throw new Error(`Invalid content type: ${contentType}`);
          }
        } catch (urlError) {
          console.error('URL verification failed:', urlError);
          throw new Error(`Image URL verification failed: ${urlError.message}`);
        }

        // 2. Call GPT-4o with the image
        console.log("About to call GPT-4o with image URL:", documentImage);
        console.log("Payload to OpenAI:", JSON.stringify([
          {
            type: "image_url",
            image_url: { url: documentImage }
          }
        ], null, 2));
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "system",
              content: "You are a medical document analyzer specialized in extracting information from medical reports, lab results, and clinical images. Extract all relevant medical information including test results, reference ranges, diagnoses, and recommendations. Format numeric values and units consistently."
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: documentImage
                  }
                },
                {
                  type: "text",
                  text: "Please analyze this medical document and extract all relevant information. Include test results with values and reference ranges if present. Structure the information clearly."
                }
              ]
            }
          ],
          max_tokens: 4096
        });

        console.log("GPT-4o raw response:", JSON.stringify(visionResponse, null, 2));

        const content = visionResponse?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("Empty response from GPT-4o");
        }

        console.log('GPT-4o content:', content);

        // 3. Try to parse the response
        try {
          // First attempt to parse as JSON
          const parsedContent = JSON.parse(content);
          text = JSON.stringify(parsedContent);
          console.log('Successfully parsed GPT response as JSON');
        } catch (parseError) {
          // If not JSON, use the raw text
          console.log('Response is not JSON, using raw text');
          text = content;
        }

        // 4. Validate the extracted text
        if (!text || text.trim().length < 20) {
          console.error('Extracted text too short:', text);
          throw new Error("Insufficient text extracted from image");
        }

        console.log('Successfully extracted text from image:', text.substring(0, 100) + '...');

      } catch (visionError) {
        console.error('Vision processing error:', visionError);
        throw new Error(`Image processing failed: ${visionError.message}`);
      }
    }
    // If still no valid text, throw error
    if (!text || text.trim().length < 20) {
      throw new Error("Could not extract text from the uploaded document. Please upload a valid medical report PDF or image.");
    }
    // Call OpenAI to analyze the document
    let response;
    let prePrompt = "";
    if (documentType && documentType.toLowerCase().includes("image")) {
      prePrompt = `The following text was extracted from an image (possibly a photo or scan of a medical report). The text may be noisy or unstructured. If you detect tabular or list-like data (such as lab results), do your best to reconstruct the table and extract each row as a key finding. If the image is a narrative report, extract diagnoses, medications, symptoms, and other findings as usual.\n\n`;
    }
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4",
      messages: [
        {
          role: "system",
            content: `${prePrompt}You are a medical document analyzer capable of processing any type of medical document in any language. Your tasks are:

1. If the document is not in English, first translate it to English (do not include the translation in your response).
2. Analyze the (translated) document and extract as much structured information as possible, even if the document is narrative, tabular, or not in a standard format.
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
- **If the input is a noisy or unstructured OCR extraction from an image (including non-English text), do your best to:**
  - Translate all medical terms and values to English.
  - Reconstruct tables or lists of findings.
  - For each lab result or finding, create a key finding with:
    - marker: The test name (translated to English, e.g., 'ΕΡΥΘΡΑ ΑΙΜΟΣΦΑΙΡΙΑ (RBC)' → 'Red Blood Cells (RBC)')
    - value: The measured value and units (e.g., '4.81 10^6/μl')
    - reference_range: The normal/reference range (e.g., '3.60 - 5.50')
    - interpretation: 'High', 'Low', or 'Normal' based on the value and reference range
    - category: 'Lab Result'

EXAMPLE (for a Greek lab report row):
OCR: 'ΕΡΥΘΡΑ ΑΙΜΟΣΦΑΙΡΙΑ (RBC)   4.81   10^6/μl   3.60 - 5.50'
JSON:
{
  "marker": "Red Blood Cells (RBC)",
  "value": "4.81 10^6/μl",
  "reference_range": "3.60 - 5.50",
  "interpretation": "Normal",
  "category": "Lab Result"
}

- If the document is not in English, always translate all findings and the summary to English.
- If the OCR is messy, do your best to infer the correct columns and values.
- **Never leave key_findings empty for a medical document.**
- **If the input is a noisy or unstructured OCR extraction from an image, do your best to reconstruct the table or list of findings. For each lab result or finding, create a key finding as in the example. If you see lines like 'LEUKOCYTES, BLOOD 11.0 x10^9/L H 4.0-10.0', parse them as marker, value, interpretation, and reference range.**
- **EXAMPLES for narrative and tabular data:**
  - marker: "Diagnosis", value: "Colitis Ulcerosa", category: "Diagnosis"
  - marker: "Medication", value: "Prednisone 10mg daily", category: "Medication"
  - marker: "Symptom", value: "Dyspnoea", category: "Symptom"
  - marker: "Lab Result", value: "Leukocytes 11.0 x10^9/L", reference_range: "4.0-10.0", interpretation: "High", category: "Lab Result"
  - marker: "Lab Result", value: "Hemoglobin 150 g/L", reference_range: "135-175", interpretation: "Normal", category: "Lab Result"`
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
        // If not JSON, treat the whole content as summary
        analysis = {
          summary: content,
          key_findings: [],
          recommendations: [],
          critical_values: [],
          metadata: {}
        };
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
    console.error('Full error details:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    const errorStatus = error instanceof Error && error.message.includes('not accessible') 
      ? 400 
      : 500;

    // Update document status with detailed error
    if (documentId) {
      await supabaseClient.from("documents").update({
        processing_status: "error",
        status: "Error",
        error_message: `Processing failed: ${errorMessage}`
      }).eq("id", documentId);
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      status: errorStatus,
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: errorStatus,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

