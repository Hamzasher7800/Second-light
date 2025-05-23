
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsageSummary } from "@/hooks/useUsageSummary";
import { format } from 'date-fns';

const UsageSummary = () => {
  const { usageSummary, isLoading, error } = useUsageSummary();
  
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 bg-light-dark rounded-lg">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Format the next billing date safely
  const formattedBillingDate = (() => {
    try {
      return format(new Date(usageSummary.nextBillingDate), 'MMM d, yyyy');
    } catch (e) {
      console.error("Error formatting date:", e);
      return "N/A";
    }
  })();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Summary</CardTitle>
        <CardDescription>
          Your account usage overview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-light-dark rounded-lg">
            <p className="text-sm text-muted-foreground">Reports this month</p>
            <p className="text-2xl font-medium mt-1">
              {usageSummary.processedDocuments}/{usageSummary.totalDocuments || 0}
            </p>
          </div>
          
          <div className="p-4 bg-light-dark rounded-lg">
            <p className="text-sm text-muted-foreground">Subscription</p>
            <p className="text-2xl font-medium mt-1">
              {usageSummary.subscriptionType === 'Pro' ? '$9.99/mo' : 'Free'}
            </p>
          </div>
          
          <div className="p-4 bg-light-dark rounded-lg">
            <p className="text-sm text-muted-foreground">Next billing</p>
            <p className="text-2xl font-medium mt-1">{formattedBillingDate}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsageSummary;
