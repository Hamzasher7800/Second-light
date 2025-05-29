import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";

const DashboardEmptyState = () => {
  return (
    <Card className="w-full max-w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 max-w-full px-4 md:px-8">
        <div className="rounded-full bg-second/10 p-4 mb-4">
          <UploadCloud className="h-12 w-12 text-second" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Welcome to your dashboard</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Upload your first document to start analyzing medical information and see your dashboard come to life.
        </p>
        <Link to="/dashboard/documents">
          <Button className="bg-second hover:bg-second-dark text-dark">
            Upload Your First Document
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default DashboardEmptyState;
