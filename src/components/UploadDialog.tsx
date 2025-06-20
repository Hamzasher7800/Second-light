import { useState } from "react";
import { Upload, Shield, FileText, AlertCircle, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { documentService } from "@/services/documentService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

interface UploadDialogProps {
  onClose: () => void;
  onUploadComplete?: (newDocId?: string) => void;
}

interface FileWithStatus {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

const UploadDialog = ({ onClose, onUploadComplete }: UploadDialogProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string>("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pdfPassword, setPdfPassword] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { subscription, hasActiveAccess, canUploadFile } = useSubscription();

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
    
    if (!hasActiveAccess()) {
      setUploadError("Please subscribe to upload documents");
      toast.error("Please subscribe to upload documents");
      return;
    }

    if (!canUploadFile()) {
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasActiveAccess()) {
      setUploadError("Please subscribe to upload documents");
      toast.error("Please subscribe to upload documents");
      return;
    }

    if (!canUploadFile()) {
      return;
    }

    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    const validFiles: FileWithStatus[] = [];
    
    for (const file of files) {
    if (file.type === "application/pdf") {
      // Try to load PDF without password
      const arrayBuffer = await file.arrayBuffer();
      try {
        await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        // Not encrypted, proceed as normal
          validFiles.push({
            file,
            status: 'pending',
            progress: 0
          });
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
          validFiles.push({
            file,
            status: 'pending',
            progress: 0
          });
        setPdfError(null);
      } else {
          setUploadError("Please upload PDF, DOC, DOCX, or image files");
          toast.error("Please upload PDF, DOC, DOCX, or image files");
        }
      }
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handlePasswordSubmit = async () => {
    if (!pendingFile) return;
    const arrayBuffer = await pendingFile.arrayBuffer();
    try {
      await pdfjsLib.getDocument({ data: arrayBuffer, password: pdfPassword }).promise;
      // Password correct, proceed
      setSelectedFiles(prev => [...prev, {
        file: pendingFile,
        status: 'pending',
        progress: 0
      }]);
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

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    if (!hasActiveAccess()) {
      setUploadError("Please subscribe to upload documents");
      toast.error("Please subscribe to upload documents");
      return;
    }

    if (!canUploadFile()) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      setProcessingMessage("Uploading documents...");

      const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
      
      if (pendingFiles.length === 0) {
        toast.success("No files to upload");
        return;
      }

      // If we have multiple image files, process them as a single document
      if (pendingFiles.length > 1 && pendingFiles.every(f => f.file.type.startsWith("image/"))) {
        setProcessingMessage("Processing multiple images as single document...");
        
        // Upload all files to storage first
        const uploadedFiles = [];
        for (const fileWithStatus of pendingFiles) {
          try {
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${fileWithStatus.file.name}`;
            const filePath = `${(await supabase.auth.getUser()).data.user?.id}/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("documents")
              .upload(filePath, fileWithStatus.file);

            if (uploadError) {
              throw new Error(uploadError.message);
            }

            // Get the public URL
            const { data: urlData } = supabase.storage
              .from("documents")
              .getPublicUrl(uploadData.path);

            if (!urlData?.publicUrl) {
              throw new Error("Failed to get public URL for uploaded file");
            }

            uploadedFiles.push({
              file: fileWithStatus.file,
              path: uploadData.path,
              url: urlData.publicUrl
            });
          } catch (error) {
            console.error(`Error uploading file ${fileWithStatus.file.name}:`, error);
            throw error;
          }
        }

        // Create a single document record
        const baseTitle = uploadedFiles[0]?.file?.name ? uploadedFiles[0].file.name.replace(/\.[^/.]+$/, "") : "Document";
        const { data: document, error: insertError } = await supabase
          .from("documents")
          .insert({
            title: baseTitle,
            type: "Multiple Images",
            file_path: uploadedFiles[0].path, // Use first file path as primary
            status: "Processing",
            processing_status: "pending",
            user_id: (await supabase.auth.getUser()).data.user?.id,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        // Process all images together
        const imageUrls = uploadedFiles.map(f => f.url);
        await documentService.processMultipleImagesAsSingleDocument(
          document.id,
          baseTitle,
          "Multiple Images",
          imageUrls
        );

        // Update all file statuses to completed
        setSelectedFiles(prev => prev.map((fileWithStatus, index) => {
          const isPending = pendingFiles.some(pf => pf.file === fileWithStatus.file);
          if (isPending) {
            return { 
              ...fileWithStatus, 
              status: 'completed', 
              progress: 100, 
              documentId: document.id 
            };
          }
          return fileWithStatus;
        }));

        setProcessingMessage("Multiple images processed as single document!");
        toast.success("Multiple images processed as single document!");
        
      if (onUploadComplete) {
          onUploadComplete(document.id);
        } else {
          onClose();
        }
      } else {
        // Process files individually (existing logic)
        const files = pendingFiles.map(f => f.file);
        const baseTitle = files.length > 1 ? "Multiple Documents" : files[0].name.replace(/\.[^/.]+$/, "");
        
        // Determine file type (assuming all files are the same type)
        const fileType = files[0].type.startsWith("image/") ? "Image" : 
                        files[0].type === "application/pdf" ? "PDF" : "Word Document";

        const documents = await documentService.uploadMultipleDocuments({
          title: baseTitle,
          type: fileType,
          files: files
        });

        // Update file statuses to completed
        setSelectedFiles(prev => prev.map((fileWithStatus, index) => {
          const docIndex = documents.findIndex(doc => 
            doc.title.includes(fileWithStatus.file.name.replace(/\.[^/.]+$/, ""))
          );
          if (docIndex !== -1) {
            return { 
              ...fileWithStatus, 
              status: 'completed', 
              progress: 100, 
              documentId: documents[docIndex].id 
            };
          }
          return fileWithStatus;
        }));
        
        setProcessingMessage("All documents uploaded! Analysis in progress...");
        toast.success("All documents uploaded! Analysis in progress...");
        
        if (onUploadComplete && documents.length > 0) {
          onUploadComplete(documents[0].id); // Navigate to first document
      } else {
        onClose();
        }
      }
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

  const getStatusIcon = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
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
      
      {!hasActiveAccess() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Subscription Required</AlertTitle>
          <AlertDescription>
            Please subscribe to upload and analyze documents.
            <Button
              variant="link"
              className="p-0 h-auto font-normal text-primary ml-2"
              onClick={() => navigate('/dashboard/account')}
            >
              Go to subscription page
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {hasActiveAccess() && subscription?.reportsRemaining <= 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Monthly Limit Reached</AlertTitle>
          <AlertDescription>
            You've reached your monthly report limit. Your limit will reset on {new Date(subscription.nextBillingDate || '').toLocaleDateString()}.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Spinner and message for upload/analysis */}
      {isUploading && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="animate-spin h-8 w-8 text-second" />
          <p className="text-base font-semibold text-second">
            {processingMessage || "Uploading and analyzing your files. This may take a moment..."}
          </p>
        </div>
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
              <Upload className="h-6 w-6 text-second" />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {selectedFiles.length > 0 
                ? `${selectedFiles.length} file(s) selected` 
                : "Drag and drop your files here"
              }
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedFiles.length > 0 
                ? `${selectedFiles.length} file(s) ready to upload` 
                : "PDF, DOC, DOCX, or image files (max 10MB each)"
              }
            </p>
          </div>
          
          {selectedFiles.length === 0 && (
            <div className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-second hover:bg-second-dark text-dark rounded-md px-4 py-2 text-sm cursor-pointer flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Select files
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
                multiple
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          )}
          
          {selectedFiles.length > 0 && !isUploading && (
            <Button 
              className="bg-second hover:bg-second-dark text-dark" 
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
            >
              Upload and Analyze All
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Shield className="h-3 w-3" /> Your files are encrypted and never shared
          </p>
        </div>
      </div>

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Selected Files</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map((fileWithStatus, index) => (
              <div
                key={`${fileWithStatus.file.name}-${index}`}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getStatusIcon(fileWithStatus.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {fileWithStatus.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(fileWithStatus.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {fileWithStatus.status === 'uploading' && (
                    <Progress value={fileWithStatus.progress} className="w-20" />
                  )}
                  {fileWithStatus.status === 'error' && (
                    <p className="text-xs text-red-500">{fileWithStatus.error}</p>
                  )}
                  {/* Hide remove button while uploading */}
                  {fileWithStatus.status === 'pending' && !isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground mt-4">
        <p className="font-medium">What happens after upload?</p>
        <ol className="list-decimal list-inside mt-1 space-y-1">
          <li>Your documents are securely uploaded and encrypted</li>
          <li>Our AI analyzes the content to extract key medical information</li>
          <li>You'll receive detailed reports with findings and recommendations</li>
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
