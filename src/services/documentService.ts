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
}

export interface DocumentDetail extends Document {
  summary: string;
  key_findings: {
    marker: string;
    explanation: string;
  }[];
  recommendations: string[];
}

export interface DocumentUpload {
  title: string;
  type: string;
  file: File;
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
        .select("marker, explanation")
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

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, documentData.file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw new Error(uploadError.message);
    }

    // Then create a record in the documents table
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        title: documentData.title,
        type: documentData.type,
        file_path: filePath,
        status: "Processing", // Initial status
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

  // Process a document with OpenAI
  async processDocument(
    documentId: string, 
    title: string, 
    type: string, 
    file?: File
  ): Promise<void> {
    let documentText = "";
    
    if (file) {
      try {
        if (file.type === 'application/pdf') {
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
          
          documentText = (await Promise.all(textPromises)).join('\n\n');
        } else if (file.type.startsWith('image/')) {
          // Convert File to base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          
          // Use Tesseract.js for OCR
          const result = await Tesseract.recognize(
            base64,
            'eng',
            { logger: m => console.log(m) }
          );
          documentText = result.data.text;
        }
      } catch (error) {
        console.error("Error extracting text:", error);
        documentText = `Medical information related to ${title}`;
      }
    }

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

      // Call the edge function to process the document
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/process-medical-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.session.access_token}`,
          },
          body: JSON.stringify({
            documentId,
            documentText,
            documentType: type,
            documentTitle: title,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error processing document");
      }

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
