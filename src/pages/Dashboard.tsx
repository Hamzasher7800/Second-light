import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import MobileMenu from "@/components/MobileMenu";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import DashboardEmptyState from "@/components/DashboardEmptyState";
import { useDocuments } from "@/hooks/useDocuments";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DocumentSkeleton from "@/components/DocumentSkeleton";
import DocumentItem from "@/components/DocumentItem";
import EmptyDocumentsState from "@/components/EmptyDocumentsState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UploadDialog from "@/components/UploadDialog";
import { Plus } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { documents, isLoading: isLoadingDocuments, refetchDocuments } = useDocuments();
  const hasDocuments = documents && documents.length > 0;
  const { subscription, isLoading: isLoadingSubscription, hasActiveAccess } = useSubscription();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const navigate = useNavigate();
  
  const reportsUsed = subscription && (subscription.status === 'active' || subscription.status === 'cancelled' || subscription.status === 'trialing')
    ? 30 - (subscription.reportsRemaining ?? 0)
    : 0;
  const reportsTotal = 30;

  useEffect(() => {
    if (user && !sessionStorage.getItem('dashboard_welcome_toast')) {
      toast({
        title: "Welcome back!",
        description: "Your dashboard is ready.",
      });
      sessionStorage.setItem('dashboard_welcome_toast', '1');
    }
  }, [user]);

  const handleUploadClick = useCallback(() => {
    if (!hasActiveAccess()) {
      navigate('/dashboard/account');
      return;
    }
    setUploadDialogOpen(true);
  }, [hasActiveAccess, navigate]);

  const handleUploadComplete = useCallback(async (newDocId: string | null) => {
    setUploadDialogOpen(false);
    await refetchDocuments();
    if (newDocId) {
      navigate(`/dashboard/documents/${newDocId}`);
    }
  }, [navigate, refetchDocuments]);


  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 relative">
        <DashboardHeader />
        <MobileMenu />
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden dashboard-gradient">
          <div className="max-w-7xl mx-auto w-full">
            <h1 className="text-2xl md:text-3xl font-medium mb-6 md:mb-8">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
            </h1>
            
            {/* Always show UsageSummary component */}
            <div className="grid grid-cols-1 gap-4 md:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>Your account usage overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 bg-muted rounded-lg p-6">
                      <div className="text-muted-foreground mb-1">Reports this month</div>
                      <div className="text-2xl font-semibold">
                        {isLoadingSubscription
                          ? "..."
                          : (subscription && (subscription.status === 'active' || subscription.status === 'cancelled' || subscription.status === 'trialing'))
                            ? `${reportsUsed}/${reportsTotal}`
                            : `0/${reportsTotal}`}
                      </div>
                    </div>
                    <div className="flex-1 bg-muted rounded-lg p-6">
                      <div className="text-muted-foreground mb-1">Subscription</div>
                      <div className="text-2xl font-semibold">
                        {isLoadingSubscription
                          ? "..."
                          : subscription && (subscription.status === 'active' || subscription.status === 'trialing')
                            ? "Monthly"
                            : subscription && subscription.status === 'cancelled'
                              ? "Cancelled"
                              : "Free"}
                      </div>
                    </div>
                    <div className="flex-1 bg-muted rounded-lg p-6">
                      <div className="text-muted-foreground mb-1">Next billing</div>
                      <div className="text-2xl font-semibold">
                        {isLoadingSubscription
                          ? "..."
                          : subscription?.nextBillingDate
                          ? new Date(subscription.nextBillingDate).toLocaleDateString()
                          : "-"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {!isLoadingDocuments && !hasDocuments ? (
                <DashboardEmptyState />
              ) : user ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full min-w-0">
                  <div className="w-full max-w-full min-w-0">
                    <Card className="flex flex-col items-center justify-center p-6 h-full">
                      <CardHeader>
                        <CardTitle>New Upload</CardTitle>
                        <CardDescription>Upload a new medical document</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow flex items-center justify-center">
                        <Button
                          className="bg-second hover:bg-second-dark text-dark text-lg px-8 py-6"
                          onClick={handleUploadClick}
                        >
                          <Plus className="h-5 w-5 mr-3" />
                          Upload Document
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="w-full max-w-full min-w-0">
                    <Card className="w-full max-w-full">
                      <CardHeader className="max-w-full">
                        <CardTitle>Recent Uploads</CardTitle>
                        <CardDescription>Your recently uploaded documents</CardDescription>
                      </CardHeader>
                      <CardContent className="max-w-full px-4 md:px-6">
                        {isLoadingDocuments ? (
                          <div className="space-y-4">
                            {[...Array(3)].map((_, index) => (
                              <DocumentSkeleton key={index} />
                            ))}
                          </div>
                        ) : documents && documents.length > 0 ? (
                          <div className="space-y-4">
                            {documents.slice(0, 3).map((doc) => (
                              <DocumentItem key={doc.id} document={doc} />
                            ))}
                          </div>
                        ) : (
                          <EmptyDocumentsState onUpload={() => {}} />
                        )}
                      </CardContent>
                      <CardFooter>
                        <Link to="/dashboard/documents" className="w-full">
                          <Button variant="outline" className="w-full">
                            View All Documents
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle>Upload Medical Document</DialogTitle>
          </DialogHeader>
          <UploadDialog 
            onClose={() => setUploadDialogOpen(false)} 
            onUploadComplete={handleUploadComplete} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
