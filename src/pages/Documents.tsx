import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import MobileMenu from "@/components/MobileMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UploadDialog from "@/components/UploadDialog";
import { useDocuments } from "@/hooks/useDocuments";
import DocumentItem from "@/components/DocumentItem";
import { useAuth } from "@/contexts/AuthContext";
import EmptyDocumentsState from "@/components/EmptyDocumentsState";
import DocumentSkeleton from "@/components/DocumentSkeleton";
import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Documents = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { documents, isLoading, error, refetchDocuments } = useDocuments();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscription, hasActiveAccess } = useSubscription();

  const handleUploadClick = () => {
    if (!hasActiveAccess()) {
      navigate('/dashboard/account');
      return;
    }
    setUploadDialogOpen(true);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col md:ml-64 relative min-w-0">
        <DashboardHeader />
        <MobileMenu />
        
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto dashboard-gradient">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="pr-12 sm:pr-16 md:pr-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-medium break-words">Documents</h1>
              </div>
              <div className="w-full">
                <Button 
                  className="bg-second hover:bg-second-dark text-dark w-full sm:w-auto min-w-0"
                  onClick={handleUploadClick}
                >
                  <Plus className="h-4 w-4 mr-2 flex-shrink-0" /> 
                  <span className="truncate">New Upload</span>
                </Button>
              </div>
            </div>

            {!hasActiveAccess() && (
              <Alert className="mb-6">
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
              <Alert className="mb-6">
                <AlertTitle>Monthly Limit Reached</AlertTitle>
                <AlertDescription>
                  You've reached your monthly report limit. Your limit will reset on {new Date(subscription.nextBillingDate || '').toLocaleDateString()}.
                </AlertDescription>
              </Alert>
            )}
            
            <Card className="w-full">
              <div className="p-3 sm:p-4 md:p-6">
                {isLoading ? (
                  <div className="space-y-3 sm:space-y-4 md:space-y-6">
                    {[...Array(3)].map((_, index) => (
                      <DocumentSkeleton key={index} />
                    ))}
                  </div>
                ) : documents && documents.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4 md:space-y-6">
                    {documents.map((doc) => (
                      <DocumentItem key={doc.id} document={doc} />
                    ))}
                  </div>
                ) : (
                  <EmptyDocumentsState onUpload={handleUploadClick} />
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Upload Medical Document</DialogTitle>
          </DialogHeader>
          <UploadDialog onClose={() => setUploadDialogOpen(false)} onUploadComplete={(newDocId) => {
            setUploadDialogOpen(false);
            refetchDocuments();
            if (newDocId) {
              navigate(`/dashboard/documents/${newDocId}`);
            }
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
