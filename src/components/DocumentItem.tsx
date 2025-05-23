
import React from "react";
import { Link } from "react-router-dom";
import { FileText, AlertCircle, Loader2 } from "lucide-react";
import { Document } from "@/services/documentService";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DocumentItemProps {
  document: Document;
}

const DocumentItem: React.FC<DocumentItemProps> = ({ document }) => {
  const formattedDate = document.date
    ? formatDistanceToNow(new Date(document.date), { addSuffix: true })
    : "Unknown date";
    
  const isProcessing = document.status === "Processing";
  const hasError = document.status === "Error";
    
  return (
    <Link
      key={document.id}
      to={`/dashboard/documents/${document.id}`}
      className="block"
    >
      <div className="flex items-center p-4 rounded-lg hover:bg-muted transition-colors">
        <div className="h-12 w-12 rounded-md bg-second/10 flex items-center justify-center mr-4">
          <FileText className="h-6 w-6 text-second" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{document.title}</p>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>
        <div className="flex items-center">
          <span className="text-xs bg-second/10 text-second px-2 py-1 rounded mr-4">
            {document.type}
          </span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${
                  isProcessing 
                    ? 'bg-amber-100 text-amber-800' 
                    : hasError
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
                  {hasError && <AlertCircle className="h-3 w-3" />}
                  {document.status}
                </span>
              </TooltipTrigger>
              
              {hasError && document.error_message && (
                <TooltipContent>
                  <p>Error: {document.error_message}</p>
                </TooltipContent>
              )}
              
              {isProcessing && (
                <TooltipContent>
                  <p>Your document is being processed by AI</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </Link>
  );
};

export default DocumentItem;
