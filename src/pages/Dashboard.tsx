
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

const Dashboard = () => {
  const { user } = useAuth();
  const { documents, isLoading: isLoadingDocuments } = useDocuments();
  const hasDocuments = documents && documents.length > 0;
  
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
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <MobileMenu />
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto dashboard-gradient">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-medium mb-6 md:mb-8">
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
            </h1>
            
            {/* Always show UsageSummary component */}
            <div className="grid grid-cols-1 gap-6 md:gap-8">
              <UsageSummary />
              
              {!isLoadingDocuments && !hasDocuments ? (
                <DashboardEmptyState />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  <UploadCard />
                  <RecentUploads />
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
