import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import MobileMenu from "@/components/MobileMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UploadDialog from "@/components/UploadDialog";
import { useDocuments } from "@/hooks/useDocuments";
import DocumentItem from "@/components/DocumentItem";
import { useAuth } from "@/contexts/AuthContext";
import EmptyDocumentsState from "@/components/EmptyDocumentsState";
import DocumentSkeleton from "@/components/DocumentSkeleton";

const Documents = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { documents, isLoading, error, refetchDocuments } = useDocuments();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <MobileMenu />
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto dashboard-gradient">
          <div className="w-full mx-auto box-border">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-medium">Documents</h1>
              <Button 
                className="bg-second hover:bg-second-dark text-dark"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> New Upload
              </Button>
            </div>
            
            <Card>
              <div className="p-6">
                {isLoading ? (
                  <div className="space-y-6">
                    {[...Array(3)].map((_, index) => (
                      <DocumentSkeleton key={index} />
                    ))}
                  </div>
                ) : documents && documents.length > 0 ? (
                  <div className="space-y-6">
                    {documents.map((doc) => (
                      <DocumentItem key={doc.id} document={doc} />
                    ))}
                  </div>
                ) : (
                  <EmptyDocumentsState onUpload={() => setUploadDialogOpen(true)} />
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Medical Document</DialogTitle>
          </DialogHeader>
          <UploadDialog onClose={() => setUploadDialogOpen(false)} onUploadComplete={() => {
            setUploadDialogOpen(false);
            refetchDocuments();
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
