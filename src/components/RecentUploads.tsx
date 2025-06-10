import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDocuments } from "@/hooks/useDocuments";
import DocumentItem from "@/components/DocumentItem";
import DocumentSkeleton from "@/components/DocumentSkeleton";
import EmptyDocumentsState from "@/components/EmptyDocumentsState";

const RecentUploads = () => {
  const { documents, isLoading, error, refetchDocuments } = useDocuments();

  return (
    <Card className="w-full max-w-full">
      <CardHeader className="max-w-full">
        <CardTitle>Recent Uploads</CardTitle>
        <CardDescription>Your recently uploaded documents</CardDescription>
      </CardHeader>
      <CardContent className="max-w-full px-4 md:px-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <DocumentSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-8">
            <p className="text-muted-foreground mb-4">Unable to load documents</p>
            <Button variant="outline" size="sm" onClick={() => refetchDocuments()}>
              Try Again
            </Button>
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
  );
};

export default RecentUploads; 