import { useState } from "react";
import { Upload, Shield, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { documentService } from "@/services/documentService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

interface UploadDialogProps {
  onClose: () => void;
  onUploadComplete?: () => void;
}

const UploadDialog = ({ onClose, onUploadComplete }: UploadDialogProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string>("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const navigate = useNavigate();

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
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    if (file.type === "application/pdf") {
      // Try to load PDF without password
      const arrayBuffer = await file.arrayBuffer();
      try {
        await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        // Not encrypted, proceed as normal
        setSelectedFile(file);
        setPdfError(null);
      } catch (err: any) {
        if (err?.name === "PasswordException") {
          // Encrypted PDF, prompt for password
          setPendingFile(file);
          setShowPasswordModal(true);
          setPdfError(null);
        } else {
          setPdfError("Failed to read PDF file.");
        }
      }
    } else {
      // Check if file is PDF, DOC, DOCX, or image
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
        setSelectedFile(file);
        setPdfError(null);
      } else {
        setUploadError("Please upload a PDF, DOC, DOCX, or image file");
        toast.error("Please upload a PDF, DOC, DOCX, or image file");
      }
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pendingFile) return;
    const arrayBuffer = await pendingFile.arrayBuffer();
    try {
      await pdfjsLib.getDocument({ data: arrayBuffer, password: pdfPassword }).promise;
      // Password correct, proceed
      setSelectedFile(pendingFile);
      setShowPasswordModal(false);
      setPdfPassword("");
      setPdfError(null);
    } catch (err: any) {
      if (err?.name === "PasswordException") {
        setPdfError("Incorrect password. Please try again.");
      } else {
        setPdfError("Failed to read PDF file.");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);
      setUploadProgress(10);
      setUploadError(null);
      setProcessingMessage("Preparing document...");
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      // Remove the loading toast
      // toast.loading("Uploading and analyzing your document...");
      // Determine file type from mime type
      let fileType = "Other";
      if (selectedFile.type.startsWith("image/")) fileType = "Image";
      else if (selectedFile.type === "application/pdf") fileType = "PDF";
      else if (
        selectedFile.type === "application/msword" ||
        selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        selectedFile.name.toLowerCase().endsWith(".doc") ||
        selectedFile.name.toLowerCase().endsWith(".docx")
      ) fileType = "Word Document";
      // Use the file name as the title, but remove the extension
      const title = selectedFile.name.replace(/\.[^/.]+$/, "");
      setProcessingMessage(fileType === "PDF" ? "Extracting text from PDF..." : "Processing image...");
      const document = await documentService.uploadDocument({
        title,
        type: fileType,
        file: selectedFile
      });
      clearInterval(progressInterval);
      setUploadProgress(100);
      setProcessingMessage("Analyzing document content...");
      toast.success("Document uploaded! Analysis in progress...");
      if (onUploadComplete) {
        onUploadComplete();
      } else {
        onClose();
      }
      // Navigate to document detail page
      navigate(`/dashboard/documents/${document.id}`);
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : String(error));
      toast.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    document.getElementById('dialog-file-upload')?.click();
  };

  return (
    <div className="space-y-4">
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      
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
                : "PDF, DOC, DOCX, or image files (max 10MB)"
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
                id="dialog-file-upload"
                name="dialog-file-upload"
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          )}
          
          {selectedFile && !isUploading && (
            <Button 
              className="bg-second hover:bg-second-dark text-dark" 
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
            >
              Upload and Analyze
            </Button>
          )}
          
          {isUploading && (
            <div className="w-full space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground">
                {processingMessage || (uploadProgress < 100 ? "Uploading..." : "Processing...")}
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Shield className="h-3 w-3" /> Your files are encrypted and never shared
          </p>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground mt-4">
        <p className="font-medium">What happens after upload?</p>
        <ol className="list-decimal list-inside mt-1 space-y-1">
          <li>Your document is securely uploaded and encrypted</li>
          <li>Our AI analyzes the content to extract key medical information</li>
          <li>You'll receive a detailed report with findings and recommendations</li>
        </ol>
      </div>
      
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xs">
            <h2 className="text-lg font-semibold mb-2">PDF Password Required</h2>
            <input
              type="password"
              className="w-full border rounded px-3 py-2 mb-3"
              value={pdfPassword}
              onChange={e => setPdfPassword(e.target.value)}
              placeholder="Enter PDF password"
            />
            {pdfError && <div className="text-red-500 text-sm mb-2">{pdfError}</div>}
            <div className="flex justify-end gap-2">
              <Button onClick={handlePasswordSubmit} className="bg-second text-dark">Submit</Button>
              <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDialog;
