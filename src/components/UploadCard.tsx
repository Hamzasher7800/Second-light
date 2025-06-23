import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Shield, FileText, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { documentService } from "@/services/documentService";
import { useSubscription } from "../hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FileWithStatus {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

const UploadCard = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUploadFile, subscription, isLoading: isLoadingSubscription, hasActiveAccess } = useSubscription();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadFile()) {
      toast.error("You must have an active subscription to upload documents.");
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles: FileWithStatus[] = files.filter(file => {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      if (
        fileType === "application/pdf" ||
        fileType === "application/msword" ||
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileType.startsWith("image/") ||
        fileName.endsWith(".doc") ||
        fileName.endsWith(".docx")
      ) {
        return true;
      } else {
        toast.error(`Unsupported file type: ${file.name}`);
        return false;
      }
    }).map(file => ({ file, status: 'pending', progress: 0 }));

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !canUploadFile()) {
      toast.error("No files to upload or subscription inactive.");
      return;
    }

    setIsUploading(true);
    const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
    
    try {
      if (pendingFiles.length > 1 && pendingFiles.every(f => f.file.type.startsWith("image/"))) {
        setProcessingMessage("Uploading images as single document...");
        
        const uploadedFileUrls: { url: string, path: string }[] = [];
        for (const { file } of pendingFiles) {
            const fileName = `${user?.id}/${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage.from('documents').upload(fileName, file);
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(data.path);
            uploadedFileUrls.push({ url: urlData.publicUrl, path: data.path });
        }

        const title = pendingFiles[0].file.name.replace(/\.[^/.]+$/, "");
        const { data: document, error } = await supabase.from('documents').insert({
            title,
            type: 'Multiple Images',
            status: 'Processing',
            user_id: user?.id,
            file_path: uploadedFileUrls[0].path,
        }).select().single();

        if (error) throw error;

        await documentService.processMultipleImagesAsSingleDocument(document.id, title, 'Multiple Images', uploadedFileUrls.map(u => u.url));
        
        toast.success("Image series uploaded! Analysis started.");
        navigate(`/dashboard/documents/${document.id}`);

      } else {
        setProcessingMessage("Uploading files individually...");
        const documents = await documentService.uploadMultipleDocuments({
          title: "Document Upload",
          type: "Mixed",
          files: pendingFiles.map(f => f.file),
        });
        toast.success(`${documents.length} document(s) uploaded! Analysis has started.`);
        if (documents.length > 0) {
          navigate(`/dashboard/documents`);
        }
      }
    } catch (error: unknown) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : "An unknown error occurred"}`);
    } finally {
      setIsUploading(false);
      setSelectedFiles([]);
    }
  };

  const openFileDialog = () => {
    document.getElementById('file-upload-card')?.click();
  };
  
  if (!isLoadingSubscription && !hasActiveAccess()) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upload Medical Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-muted-foreground">
            You must have an active subscription to upload documents.
          </div>
          <Button className="w-full" onClick={() => navigate('/dashboard/account')}>View Subscription</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full flex flex-col min-h-[350px]">
      <CardHeader>
        <CardTitle>Upload Medical Document</CardTitle>
        <CardDescription>
          Drag and drop files or click to select.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center ${
            isDragging ? "border-second bg-second/5" : "border-border"
          } transition-colors cursor-pointer flex flex-col items-center justify-center h-full flex-grow`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-second" />
              <p className="text-base font-semibold text-second">{processingMessage}</p>
            </div>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-second/20 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-second" />
              </div>
              <p className="text-sm font-medium">
                {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : "Drag and drop files here"}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, DOCX, or image files
              </p>
              <input
                id="file-upload-card"
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </>
          )}
        </div>
        {selectedFiles.length > 0 && !isUploading && (
          <div className="mt-4 space-y-2 max-h-32 overflow-y-auto pr-2">
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate" title={f.file.name}>{f.file.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removeFile(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {selectedFiles.length > 0 && !isUploading && (
        <CardFooter>
            <Button className="w-full" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? "Uploading..." : `Upload ${selectedFiles.length} File(s)`}
            </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default UploadCard;
