// @ts-expect-error Deno imports are only available in Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error Deno imports are only available in Deno runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
// @ts-expect-error Deno imports are only available in Deno runtime
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
  // Support both single image and multiple images
  if (!data.documentText && !data.documentImage && !data.documentImages) {
    throw new Error("Either document text, document image, or document images are required for analysis");
  }
}

// Add text chunking function
function splitTextIntoChunks(text: string, maxChunkSize: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  
  // Split by paragraphs or sections
  const sections = text.split(/\n\n+/);
  
  for (const section of sections) {
    // If adding this section would exceed chunk size, start a new chunk
    if ((currentChunk + section).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    
    // If a single section is too large, split it by sentences
    if (section.length > maxChunkSize) {
      const sentences = section.split(/[.!?]+/);
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }
        currentChunk += sentence + ". ";
      }
    } else {
      currentChunk += section + "\n\n";
    }
  }
  
  // Add the last chunk if not empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Add TypeScript interfaces for better type safety
interface KeyFinding {
  marker: string;
  value: string;
  reference_range?: string;
  interpretation?: string;
  category?: string;
  explanation?: string;
}

interface AnalysisResult {
  summary?: string;
  key_findings?: KeyFinding[];
  recommendations?: string[];
  critical_values?: string[];
  metadata?: {
    patient_info?: {
      date?: string;
      provider?: string;
      facility?: string;
    }
  }
}

// Update mergeAnalysisResults function with proper type safety
function mergeAnalysisResults(results: AnalysisResult[]): AnalysisResult {
  const merged: AnalysisResult = {
    summary: "",
    key_findings: [],
    recommendations: [],
    critical_values: [],
    metadata: {
      patient_info: {
        date: "",
        provider: "",
        facility: ""
      }
    }
  };

  for (const result of results) {
    // Concatenate summaries
    if (result.summary) {
      merged.summary = ((merged.summary || "") + " " + result.summary).trim();
    }

    // Merge key findings
    if (result.key_findings && merged.key_findings) {
      merged.key_findings.push(...result.key_findings);
    }

    // Merge recommendations
    if (result.recommendations && merged.recommendations) {
      merged.recommendations.push(...result.recommendations);
    }

    // Merge critical values
    if (result.critical_values && merged.critical_values) {
      merged.critical_values.push(...result.critical_values);
    }

    // Update metadata if present
    if (result.metadata?.patient_info && merged.metadata?.patient_info) {
      const patientInfo = merged.metadata.patient_info;
      const newInfo = result.metadata.patient_info;
      
      if (!patientInfo.date && newInfo.date) {
        patientInfo.date = newInfo.date;
      }
      if (!patientInfo.provider && newInfo.provider) {
        patientInfo.provider = newInfo.provider;
      }
      if (!patientInfo.facility && newInfo.facility) {
        patientInfo.facility = newInfo.facility;
      }
    }
  }

  // Remove duplicate findings
  if (merged.key_findings) {
    merged.key_findings = Array.from(new Map(
      merged.key_findings.map(item => [item.marker + item.value, item])
    ).values());
  }

  // Remove duplicate recommendations
  if (merged.recommendations) {
    merged.recommendations = [...new Set(merged.recommendations)];
  }

  // Remove duplicate critical values
  if (merged.critical_values) {
    merged.critical_values = [...new Set(merged.critical_values)];
  }

  // Summarize the merged summary if it's too long
  if (merged.summary && merged.summary.length > 500) {
    merged.summary = merged.summary.substring(0, 497) + "...";
  }

  return merged;
}

// Add function to process multiple images as a single document
async function processMultipleImagesAsSingleDocument(openai: OpenAI, images: string[], documentTitle: string): Promise<string> {
  console.log(`Processing ${images.length} images as a single document: ${documentTitle}`);
  
  const imageContents = [];
  
  for (let i = 0; i < images.length; i++) {
    const imageUrl = images[i];
    console.log(`Processing image ${i + 1}/${images.length}:`, imageUrl);
    
    try {
      // Verify the image URL is accessible
      const urlTest = await fetch(imageUrl);
      if (!urlTest.ok) {
        console.error(`Image ${i + 1} not accessible:`, urlTest.status);
        continue;
      }
      
      const contentType = urlTest.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        console.error(`Image ${i + 1} invalid content type:`, contentType);
        continue;
      }
      
      // Process the image with GPT-4 Vision
      const visionResponse = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: `You are a medical document analyzer specialized in extracting information from medical reports, lab results, and clinical images. This is image ${i + 1} of ${images.length} in a series for document "${documentTitle}". Extract all relevant medical information including test results, reference ranges, diagnoses, and recommendations. Format numeric values and units consistently. If this appears to be part of a multi-page document, note any page numbers or sequence indicators.`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl }
              },
              {
                type: "text",
                text: `Please analyze this medical document (image ${i + 1} of ${images.length}) and extract all relevant information. Include test results with values and reference ranges if present. Structure the information clearly. If this is part of a multi-page document, maintain context with other pages.`
              }
            ]
          }
        ],
        max_tokens: 4096
      });
      
      const content = visionResponse?.choices?.[0]?.message?.content;
      if (content) {
        imageContents.push(`--- Image ${i + 1} Content ---\n${content}`);
      }
      
    } catch (error) {
      console.error(`Error processing image ${i + 1}:`, error);
      imageContents.push(`--- Image ${i + 1} Error ---\nFailed to process image: ${error.message}`);
    }
  }
  
  // Combine all image contents into a single text
  const combinedText = imageContents.join('\n\n');
  
  // If we have multiple images, create a summary analysis
  if (images.length > 1) {
    try {
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are analyzing a multi-image medical document. The following text contains information extracted from ${images.length} images. Please provide a comprehensive analysis that combines all the information into a coherent medical report.`
          },
          {
            role: "user",
            content: `Please analyze this multi-image medical document and provide a comprehensive summary:\n\n${combinedText}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      });
      
      const summaryContent = summaryResponse?.choices?.[0]?.message?.content;
      if (summaryContent) {
        return summaryContent;
      }
    } catch (error) {
      console.error('Error creating summary analysis:', error);
    }
  }
  
  return combinedText;
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
  // @ts-expect-error Deno global is only available in Deno runtime
    const supabaseUrl = Deno?.env.get("SUPABASE_URL") || "";
  // @ts-expect-error Deno global is only available in Deno runtime
    const supabaseAnonKey = Deno?.env.get("SUPABASE_ANON_KEY") || "";
  // @ts-expect-error Deno global is only available in Deno runtime
    const supabaseServiceKey = Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
        Authorization: req.headers.get("Authorization")
        }
      }
    });
  // @ts-expect-error Deno global is only available in Deno runtime
    const openai = new OpenAI({
      // @ts-expect-error Deno global is only available in Deno runtime
      apiKey: Deno?.env.get("OPENAI_API_KEY") || ""
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
    const { documentText, documentType, documentTitle, documentImage, documentImages } = requestData;
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
    
    // Handle multiple images if present
    if (documentImages && Array.isArray(documentImages) && documentImages.length > 0) {
      try {
        console.log('Starting multi-image processing with', documentImages.length, 'images');
        text = await processMultipleImagesAsSingleDocument(openai, documentImages, documentTitle);
        console.log('Successfully processed multiple images');
      } catch (multiImageError) {
        console.error('Multi-image processing error:', multiImageError);
        throw new Error(`Multi-image processing failed: ${multiImageError.message}`);
      }
    }
    // Fallback to single image processing
    else if ((!text || text.trim().length < 20) && documentImage) {
      try {
        console.log('Starting single image processing with URL:', documentImage);

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

    // Split text into chunks if it's too long
    const chunks = splitTextIntoChunks(text);
    const analysisResults: AnalysisResult[] = [];

    for (const chunk of chunks) {
      try {
        // Update the system prompt in the OpenAI call
        const systemPrompt = `${prePrompt}You are analyzing a chunk of a larger medical document. Focus on extracting key information from this section. ${chunks.length > 1 ? "This is one part of a larger document, so focus on the information present in this chunk." : ""}

Your task is to analyze medical documents and extract structured information. Please return a JSON object with the following structure:
{
  "summary": "A concise summary of the key points",
  "key_findings": [
    {
      "marker": "Test/Measurement name",
      "value": "Actual value",
      "reference_range": "Normal range if available",
      "interpretation": "High/Low/Normal",
      "category": "Lab/Vital/Imaging/etc",
      "explanation": "Additional context"
    }
  ],
  "recommendations": ["List of recommendations"],
  "critical_values": ["List of any critical or abnormal values"],
  "metadata": {
    "patient_info": {
      "date": "Document date if found",
      "provider": "Provider name if found",
      "facility": "Facility name if found"
    }
  }
}

Focus on accuracy and maintain medical terminology. If processing a partial document, extract information present in this section only.`;

        const chunkResponse = await openai.chat.completions.create({
          model: "gpt-4",
      messages: [
        {
          role: "system",
              content: systemPrompt
        },
        {
          role: "user",
              content: chunk
            }
          ],
          temperature: 0.2,
          max_tokens: 2000
        });

        const content = chunkResponse?.choices?.[0]?.message?.content;
        if (content) {
          try {
            const chunkAnalysis: AnalysisResult = JSON.parse(content.trim());
            analysisResults.push(chunkAnalysis);
          } catch (parseError) {
            console.error("Error parsing chunk response:", parseError);
          }
        }
      } catch (apiError) {
        console.error("OpenAI API Error for chunk:", apiError);
      }
    }

    // Merge results from all chunks
    const analysis = mergeAnalysisResults(analysisResults);

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

