import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import MobileMenu from "@/components/MobileMenu";
import UploadCard from "@/components/UploadCard";
import RecentUploads from "@/components/RecentUploads";
import UsageSummary from "@/components/UsageSummary";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import DashboardEmptyState from "@/components/DashboardEmptyState";
import { useDocuments } from "@/hooks/useDocuments";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const { user } = useAuth();
  const { documents, isLoading: isLoadingDocuments } = useDocuments();
  const hasDocuments = documents && documents.length > 0;
  const { subscription, isLoading: isLoadingSubscription } = useSubscription();
  
  useEffect(() => {
    // Show welcome toast if user is logged in
    if (user) {
      toast({
        title: "Welcome back!",
        description: "Your dashboard is ready.",
      });
    }
  }, [user]);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
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
                        {isLoadingSubscription ? "..." : `${30 - (subscription?.reportsRemaining ?? 0)}/${30}`}
                      </div>
                    </div>
                    <div className="flex-1 bg-muted rounded-lg p-6">
                      <div className="text-muted-foreground mb-1">Subscription</div>
                      <div className="text-2xl font-semibold">
                        {isLoadingSubscription
                          ? "..."
                          : subscription?.status === "active"
                          ? "Monthly"
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full min-w-0">
                  <div className="w-full max-w-full min-w-0">
                    <UploadCard />
                  </div>
                  <div className="w-full max-w-full min-w-0">
                    <RecentUploads />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
