
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

interface EmptyDocumentsStateProps {
  onUpload: () => void;
}

const EmptyDocumentsState = ({ onUpload }: EmptyDocumentsStateProps) => {
  return (
    <div className="text-center py-12">
      <div className="rounded-full bg-second/10 p-4 mx-auto w-fit mb-4">
        <UploadCloud className="h-12 w-12 text-second" />
      </div>
      <p className="mt-4 text-xl font-medium">No documents found</p>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        Upload your first medical document to start analyzing and tracking your health information
      </p>
      <Button 
        className="bg-second hover:bg-second-dark text-dark mt-6"
        onClick={onUpload}
      >
        Upload Your First Document
      </Button>
    </div>
  );
};

export default EmptyDocumentsState;
