import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Shield } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { documentService } from "@/services/documentService";
import { useSubscription } from "../hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDocuments } from "@/hooks/useDocuments";

const UploadCard = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canUploadFile, subscription, isLoading: isLoadingSubscription, hasActiveAccess } = useSubscription();
  const { refetchDocuments } = useDocuments();
  const [uploadQueue, setUploadQueue] = useState<{ file: File; status: 'pending' | 'uploading' | 'success' | 'error'; error?: string }[]>([]);

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

  const handleFiles = async (files: File[]) => {
    toast.success(`${files.length} file(s) selected for upload!`);
    // Add files to upload queue
    setUploadQueue(prev => [
      ...prev,
      ...files.map(file => ({ file, status: 'pending' as const }))
    ]);
    // Start upload
    for (const file of files) {
      setUploadQueue(prev => prev.map(item => item.file === file ? { ...item, status: 'uploading' } : item));
      try {
        await documentService.uploadDocument({
          title: file.name,
          type: file.type || 'unknown',
          file,
        });
        setUploadQueue(prev => prev.map(item => item.file === file ? { ...item, status: 'success' } : item));
        await refetchDocuments();
      } catch (err: unknown) {
        let errorMsg = 'Upload failed';
        if (err && typeof err === 'object' && 'message' in err) {
          errorMsg = String((err as { message: unknown }).message);
        }
        setUploadQueue(prev => prev.map(item => item.file === file ? { ...item, status: 'error', error: errorMsg } : item));
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const openFileDialog = () => {
    document.getElementById('file-upload-card')?.click();
  };

  if (!isLoadingSubscription && !hasActiveAccess()) {
    return (
      <Card className="w-full">
        <div className="p-6 text-center text-muted-foreground">
            You must have an active subscription to upload documents.
          </div>
        <Button className="w-full" onClick={() => navigate('/dashboard/account')}>View Subscription</Button>
      </Card>
    );
  }

  return (
    <Card className="w-full flex flex-col items-center justify-center py-8 px-2 bg-background border-none shadow-none">
        <div
        className={`w-full max-w-md mx-auto border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center justify-center transition-colors ${
            isDragging ? "border-second bg-second/5" : "border-border"
        }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        style={{ cursor: 'pointer' }}
        >
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-second/10 flex items-center justify-center mx-auto">
            <Upload className="h-8 w-8 text-second" />
            </div>
            <div className="space-y-2">
            <p className="text-lg font-semibold">Drag and drop your files here</p>
            <p className="text-sm text-muted-foreground">PDF, DOC, DOCX, or image files (max 10MB each)</p>
            </div>
          <Button
            type="button"
            className="bg-second hover:bg-second-dark text-dark mt-2 px-6 py-2 rounded-lg flex items-center gap-2 text-base font-medium"
            onClick={e => {
              e.stopPropagation();
              openFileDialog();
            }}
          >
            <Shield className="h-5 w-5 mr-2" /> Select files
          </Button>
                <input
            id="file-upload-card"
                  type="file"
            multiple
                  className="sr-only"
                  onChange={handleFileChange}
            disabled={isUploading}
          />
          <div className="flex items-center justify-center mt-2">
            <Shield className="h-4 w-4 mr-1 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Your files are encrypted and never shared</span>
          </div>
        </div>
              </div>
      {/* Show upload queue */}
      {uploadQueue.length > 0 && (
        <div className="mt-4 w-full max-w-md mx-auto">
          <p className="text-sm font-medium mb-2">Upload status:</p>
          <ul className="space-y-1">
            {uploadQueue.map((item, idx) => (
              <li key={item.file.name + idx} className="flex items-center gap-2 text-xs">
                <span>{item.file.name}</span>
                {item.status === 'pending' && <span className="text-gray-500">Pending</span>}
                {item.status === 'uploading' && <span className="text-blue-500">Uploading...</span>}
                {item.status === 'success' && <span className="text-green-600">Uploaded</span>}
                {item.status === 'error' && <span className="text-red-600">Error: {item.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-8 text-xs text-muted-foreground max-w-md mx-auto w-full">
        <p className="font-medium mb-1">What happens after upload?</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Your documents are securely uploaded and encrypted</li>
          <li>Our AI analyzes the content to extract key medical information</li>
          <li>You'll receive detailed reports with findings and recommendations</li>
        </ol>
          </div>
    </Card>
  );
};

export default UploadCard;
