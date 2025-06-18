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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const { canUploadFile, subscription, isLoading: isLoadingSubscription } = useSubscription();

  // Determine the correct message for upload restriction
  let restrictionMessage = '';
  if (!isLoadingSubscription && subscription) {
    if (subscription.status === 'cancelled') {
      if (subscription.reportsRemaining > 0) {
        restrictionMessage = `Your subscription is cancelled. You can still upload documents until your credits run out (${subscription.reportsRemaining} left) or your billing period ends (${new Date(subscription.currentPeriodEnd!).toLocaleDateString()}).`;
      } else {
        restrictionMessage = 'Your subscription is cancelled and you have no credits left. Please reactivate to continue uploading.';
      }
    } else if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      restrictionMessage = 'You must have an active subscription to upload documents.';
    }
  } else if (!isLoadingSubscription && !subscription) {
    restrictionMessage = 'You must have an active subscription to upload documents.';
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadFile()) {
      toast.error("You must have an active subscription to upload documents.");
      return;
    }
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
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
    } else {
      toast.error("Please upload a PDF, DOC, DOCX, or image file");
    }
  };

  const handleUpload = async (password?: string) => {
    if (!selectedFile) return;
    if (!canUploadFile()) {
      toast.error("You must have an active subscription to upload documents.");
      return;
    }
    setIsUploading(true);
    try {
      let fileType = "Other";
      if (selectedFile.type.startsWith("image/")) fileType = "Image";
      else if (selectedFile.type === "application/pdf") fileType = "PDF";
      else if (
        selectedFile.type === "application/msword" ||
        selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        selectedFile.name.toLowerCase().endsWith(".doc") ||
        selectedFile.name.toLowerCase().endsWith(".docx")
      ) fileType = "Word Document";

      const title = selectedFile.name.replace(/\.[^/.]+$/, "");
      
      // Pass password if provided
      const document = await documentService.uploadDocument({
        title,
        type: fileType,
        file: selectedFile,
        password,
      });
      
      setSelectedFile(null);
      toast.success("Document uploaded! Analysis in progress...");
      navigate(`/dashboard/documents/${document.id}`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "PDF_PASSWORD_REQUIRED") {
        setPendingFile(selectedFile);
        setShowPasswordModal(true);
        return;
      }
      if (error instanceof Error && error.message === "PDF_PASSWORD_INCORRECT") {
        setShowPasswordModal(true);
        setPdfPassword("");
        toast.error("Incorrect password. Please try again.");
        return;
      }
      toast.error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    document.getElementById('file-upload')?.click();
  };

  const handlePasswordSubmit = async () => {
    if (!pendingFile) return;
    setShowPasswordModal(false);
    setSelectedFile(pendingFile);
    await handleUpload(pdfPassword);
    setPdfPassword("");
    setPendingFile(null);
  };

  if (!isLoadingSubscription && (!subscription || subscription.status !== "active" && subscription.status !== "trialing" && !(subscription.status === 'cancelled' && subscription.reportsRemaining > 0))) {
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
            {restrictionMessage}
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
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
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
        {/* Password Modal */}
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
              <div className="flex justify-end gap-2">
                <Button onClick={handlePasswordSubmit} className="bg-second text-dark">Submit</Button>
                <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadCard;
