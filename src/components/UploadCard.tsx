import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Shield, FileText } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { documentService } from "@/services/documentService";
import { useSubscription } from "../hooks/useSubscription";

const UploadCard = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { canUploadFile, subscription, isLoading: isLoadingSubscription } = useSubscription();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadFile()) {
      toast.error("You must have an active subscription to upload documents.");
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // Check if file is PDF or image
    const fileType = file.type;
    if (
      fileType === "application/pdf" ||
      fileType.startsWith("image/")
    ) {
      setSelectedFile(file);
    } else {
      toast.error("Please upload a PDF or image file");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!canUploadFile()) {
      toast.error("You must have an active subscription to upload documents.");
      return;
    }

    setIsUploading(true);

    // Show loading toast and keep the id
    const toastId = toast.loading("Uploading and analyzing your document...");

    try {
      toast.loading("Uploading and analyzing your document...");
      
      // Determine file type from mime type
      const fileType = selectedFile.type.startsWith("image/") ? "Image" : "PDF";
      
      // Use the file name as the title, but remove the extension
      const title = selectedFile.name.replace(/\.[^/.]+$/, "");
      
      const document = await documentService.uploadDocument({
        title,
        type: fileType,
        file: selectedFile
      });
      
      setSelectedFile(null);
      
      // Update the toast to success
      toast.success("Document uploaded! Analysis in progress...", { id: toastId });
      
      // Navigate to document detail page
      navigate(`/dashboard/documents/${document.id}`);
    } catch (error: any) {
      // Update the toast to error
      toast.error(`Upload failed: ${error.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    document.getElementById('file-upload')?.click();
  };

  if (!isLoadingSubscription && (!subscription || subscription.status !== "active")) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upload Medical Document</CardTitle>
          <CardDescription>
            Upload a medical document to receive an AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center text-red-600 font-medium">
            You must have an active subscription to upload documents.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Medical Document</CardTitle>
        <CardDescription>
          Upload a medical document to receive an AI-powered analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center ${
            isDragging ? "border-second bg-second/5" : "border-border"
          } transition-colors cursor-pointer`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-second/20 flex items-center justify-center">
              {selectedFile?.type.startsWith("image/") ? (
                <FileText className="h-6 w-6 text-second" />
              ) : (
                <Upload className="h-6 w-6 text-second" />
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {selectedFile ? selectedFile.name : "Drag and drop your file here"}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedFile 
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` 
                  : "PDF or image files (max 10MB)"
                }
              </p>
            </div>
            
            {!selectedFile && (
              <div className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-second hover:bg-second-dark text-dark rounded-md px-4 py-2 text-sm cursor-pointer flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Select file
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white text-dark border border-second/20">
                      <p>Your files are encrypted and never shared</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".pdf,image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </div>
            )}
            
            {selectedFile && (
              <Button 
                className="bg-second hover:bg-second-dark text-dark" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={isUploading}
              >
                {isUploading ? "Processing..." : "Upload and Analyze"}
              </Button>
            )}
            
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Shield className="h-3 w-3" /> Your files are encrypted and never shared
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadCard;
