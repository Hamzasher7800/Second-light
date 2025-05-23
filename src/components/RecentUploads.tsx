
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileText, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useDocuments } from "@/hooks/useDocuments";
import { Skeleton } from "@/components/ui/skeleton";

const RecentUploads = () => {
  const { documents, isLoading, error, refetchDocuments } = useDocuments();
  
  // Take only the 3 most recent documents, safely handling null/undefined
  const recentUploads = documents?.slice?.(0, 3) || [];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center p-3 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-md mr-4" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-10 ml-4" />
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center py-8">
          <p className="text-muted-foreground mb-4">Unable to load documents</p>
          <Button variant="outline" size="sm" onClick={() => refetchDocuments()}>
            Try Again
          </Button>
        </div>
      );
    }

    if (!recentUploads || recentUploads.length === 0) {
      return (
        <div className="flex flex-col items-center py-8 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-2">No documents uploaded yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your first document to get started
          </p>
          <Link to="/dashboard/documents">
            <Button variant="outline" size="sm">
              Upload Now
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {recentUploads.map((doc) => {
          let formattedDate = "Unknown date";
          try {
            if (doc.date) {
              formattedDate = formatDistanceToNow(new Date(doc.date), { addSuffix: true });
            }
          } catch (e) {
            console.error("Error formatting date:", e);
          }

          return (
            <Link 
              key={doc.id} 
              to={`/dashboard/documents/${doc.id}`}
              className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-md bg-second/10 flex items-center justify-center mr-4">
                <FileText className="h-5 w-5 text-second" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title || "Untitled Document"}</p>
                <p className="text-xs text-muted-foreground">{formattedDate}</p>
              </div>
              <div className="ml-4">
                <span className="text-xs bg-second/10 text-second px-2 py-1 rounded">
                  {doc.type || "Unknown"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
        <CardDescription>
          Your recently uploaded documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
      <CardFooter>
        <Link to="/dashboard/documents" className="w-full">
          <Button variant="outline" className="w-full">
            View All Documents
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default RecentUploads;
