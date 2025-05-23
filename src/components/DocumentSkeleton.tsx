
import { Skeleton } from "@/components/ui/skeleton";

const DocumentSkeleton = () => {
  return (
    <div className="flex items-center p-4 rounded-lg">
      <Skeleton className="h-12 w-12 rounded-md mr-4" />
      <div className="flex-1">
        <Skeleton className="h-5 w-48 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center">
        <Skeleton className="h-6 w-16 rounded mr-4" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
    </div>
  );
};

export default DocumentSkeleton;
