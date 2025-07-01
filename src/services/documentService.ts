import { supabase } from "@/integrations/supabase/client";
import Tesseract from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';

// Initialize PDF.js worker
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface Document {
  id: string;
  title: string;
  date: string;
  type: string;
  status: string;
  user_id: string;
  processing_status?: string;
  error_message?: string;
  file_path?: string;
}

export interface DocumentDetail extends Document {
  document_type: string;
  metadata?: {
    patient_info?: {
      date?: string;
      provider?: string;
      facility?: string;
    };
  };
  key_findings: {
    marker: string;
    value: string;
    reference_range?: string;
    interpretation?: string;
    category?: string;
  }[];
  recommendations: string[];
  critical_values?: string[];
  summary: string;
}

export interface DocumentUpload {
  title: string;
  type: string;
  file: File;
}

export interface MultipleDocumentUpload {
  title: string;
  type: string;
  files: File[];
}

const SUPABASE_URL = "https://qlkkjojkaoniwhgdxelh.supabase.co";

export const documentService = {
  // Get all documents for the current user
  async getDocuments(): Promise<Document[]> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("User not authenticated", userError);
      return [];
    }
    const userId = userData.user.id;
    const { data: documents, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      throw new Error(error.message);
    }

    return documents || [];
  },

  // Get a single document by ID
  async getDocumentById(id: string): Promise<DocumentDetail | null> {
    console.log("Fetching document with ID:", id);
    
    try {
      // Get the document details with all fields explicitly listed
      const { data: document, error: docError } = await supabase
        .from("documents")
        .select(`
          id,
          title,
          date,
          type,
          status,
          summary,
          user_id,
          processing_status,
          error_message,
          file_path,
          created_at,
          updated_at
        `)
        .eq("id", id)
        .single();

      if (docError) {
        console.error("Error fetching document:", docError);
        if (docError.code === "PGRST116") {
          // Document not found
          return null;
        }
        throw new Error(docError.message);
      }

      if (!document) {
        console.log("Document not found");
        return null;
      }

      console.log("Document found:", document);
      
      // For documents still in processing, we can return early with minimal details
      if (document.status === "Processing" || 
          document.processing_status === "processing" || 
          document.processing_status === "pending") {
        return {
          ...document,
          summary: "",
          key_findings: [],
          recommendations: []
        };
      }

      // Get key findings
      const { data: keyFindings, error: findingsError } = await supabase
        .from("key_findings")
        .select("marker, value, reference_range, interpretation, category")
        .eq("document_id", id);

      if (findingsError) {
        console.error("Error fetching key findings:", findingsError);
        // Don't throw here, we'll just return empty findings
      }

      // Get recommendations
      const { data: recommendations, error: recommendationsError } = await supabase
        .from("recommendations")
        .select("content")
        .eq("document_id", id);

      if (recommendationsError) {
        console.error("Error fetching recommendations:", recommendationsError);
        // Don't throw here, we'll just return empty recommendations
      }

      // Format the document with the additional data
      const documentDetail: DocumentDetail = {
        ...document,
        key_findings: keyFindings || [],
        recommendations: recommendations ? recommendations.map(rec => rec.content) : [],
      };

      console.log("Document detail prepared:", documentDetail);
      return documentDetail;
    } catch (error) {
      console.error("Error in getDocumentById:", error);
      throw error;
    }
  },

  // Upload a new document
  async uploadDocument(documentData: DocumentUpload): Promise<Document> {
    // First upload the file to storage
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${documentData.file.name}`;
    const filePath = `${(await supabase.auth.getUser()).data.user?.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, documentData.file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw new Error(uploadError.message);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(uploadData.path);

    if (!urlData?.publicUrl) {
      throw new Error("Failed to get public URL for uploaded file");
    }

    console.log('Generated public URL:', urlData.publicUrl);

    // Wait until the image is available (max 10 tries, 1 second each)
    let available = false;
    for (let i = 0; i < 10; i++) {
      try {
        const resp = await fetch(urlData.publicUrl, { method: 'HEAD' });
        if (resp.ok) {
          const contentType = resp.headers.get('content-type');
          console.log(`File is accessible (attempt ${i + 1}):`, {
            status: resp.status,
            contentType
          });
          available = true;
          break;
        }
      } catch (error) {
        console.log(`Attempt ${i + 1} failed:`, error);
      }
      await new Promise(res => setTimeout(res, 1000)); // wait 1s
    }

    if (!available) {
      throw new Error("File not available at public URL after upload. Please try again.");
    }

    // Create document record
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        title: documentData.title,
        type: documentData.type,
        file_path: uploadData.path,
        status: "Processing",
        processing_status: "pending",
        user_id: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating document record:", insertError);
      throw new Error(insertError.message);
    }

    // Process the document with OpenAI
    this.processDocument(document.id, documentData.title, documentData.type, documentData.file)
      .catch(error => {
        console.error("Error processing document:", error);
      });

    return document;
  },

  // Upload multiple documents
  async uploadMultipleDocuments(documentData: MultipleDocumentUpload): Promise<Document[]> {
    const uploadedDocuments: Document[] = [];
    
    for (let i = 0; i < documentData.files.length; i++) {
      const file = documentData.files[i];
      
      // Create a unique title for each file
      const baseTitle = documentData.title || file.name.replace(/\.[^/.]+$/, "");
      const title = documentData.files.length > 1 ? `${baseTitle} (${i + 1})` : baseTitle;
      
      try {
        const document = await this.uploadDocument({
          title,
          type: documentData.type,
          file: file
        });
        
        uploadedDocuments.push(document);
      } catch (error) {
        console.error(`Error uploading file ${i + 1}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    return uploadedDocuments;
  },

  // Process a document with OpenAI
  async processDocument(
    documentId: string, 
    title: string, 
    type: string, 
    file?: File
  ): Promise<void> {
    try {
      // Update document status to processing
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          processing_status: "processing",
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Error updating document status:", updateError);
      }

      // Get the auth token
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error("User is not authenticated");
      }

      // Get the document to get its file path
      const { data: document, error: docError } = await supabase
        .from("documents")
        .select("file_path")
        .eq("id", documentId)
        .single();

      if (docError || !document?.file_path) {
        throw new Error("Could not find document file path");
      }

      // Construct the file URL
      const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/documents/${document.file_path}`;
      console.log('Constructed file URL:', fileUrl);

      // Verify the file URL is accessible
      try {
        const fileCheck = await fetch(fileUrl, { method: 'HEAD' });
        if (!fileCheck.ok) {
          throw new Error(`File URL not accessible: ${fileCheck.status}`);
        }
        console.log('File URL is accessible:', fileCheck.status, fileCheck.headers.get('content-type'));
      } catch (error) {
        console.error('File URL verification failed:', error);
        throw new Error('Could not access the file URL. Please try again.');
      }

      // Prepare the request payload
      const payload: any = {
        documentId,
        documentType: file?.type || type,
        documentTitle: title,
        documentImage: fileUrl,
      };

      // For PDFs, we'll also include the extracted text
      if (file?.type === 'application/pdf') {
        try {
          // Convert File to ArrayBuffer
          const arrayBuffer = await file.arrayBuffer();
          
          // Load the PDF document
          const pdf = await getDocument({ data: arrayBuffer }).promise;
          
          // Extract text from all pages
          const numPages = pdf.numPages;
          const textPromises = [];
          
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            textPromises.push(pageText);
          }
          
          const documentText = (await Promise.all(textPromises)).join('\n\n');
          payload.documentText = documentText;
      } catch (error) {
          console.error("Error extracting PDF text:", error);
          // Continue without text extraction
        }
      }

      // Call the edge function to process the document
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/process-medical-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      // Log the request payload for debugging
      console.log('Request payload:', payload);
          
      // Log the response for debugging
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('Processing error:', result);
        throw new Error(result.error || "Error processing document");
      }

      console.log('Processing success:', result);
      return;
      } catch (error) {
      // Update document status to error
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          processing_status: "error",
          status: "Error",
          error_message: error instanceof Error ? error.message : "Unknown error during processing",
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Error updating document status:", updateError);
      }

      throw error;
    }
  },

  // Process multiple images as a single document
  async processMultipleImagesAsSingleDocument(
    documentId: string,
    title: string,
    type: string,
    imageUrls: string[]
  ): Promise<void> {
    try {
      // Update document status to processing
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          processing_status: "processing",
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Error updating document status:", updateError);
      }

      // Get the auth token
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        throw new Error("User is not authenticated");
      }

      // Prepare the request payload for multiple images
      const payload = {
        documentId,
        documentType: type,
        documentTitle: title,
        documentImages: imageUrls,
      };

      console.log('Multi-image processing payload:', payload);

      // Call the edge function to process the multiple images
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/process-medical-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      // Log the response for debugging
      const responseText = await response.text();
      console.log('Multi-image processing response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('Multi-image processing error:', result);
        throw new Error(result.error || "Error processing multiple images");
      }

      console.log('Multi-image processing success:', result);
      return;
    } catch (error) {
      // Update document status to error
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          processing_status: "error",
          status: "Error",
          error_message: error instanceof Error ? error.message : "Unknown error during processing",
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Error updating document status:", updateError);
      }

      throw error;
    }
  },

  // Delete a document
  async deleteDocument(id: string): Promise<void> {
    // First get the document to find its file path
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("file_path")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching document for deletion:", fetchError);
      throw new Error(fetchError.message);
    }

    // Delete the document record
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting document record:", deleteError);
      throw new Error(deleteError.message);
    }

    // Delete the file if it exists
    if (document?.file_path) {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([document.file_path]);

      if (storageError) {
        console.error("Error deleting document file:", storageError);
        // We don't throw here since the record is already deleted
      }
    }
  }
};
