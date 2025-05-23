import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  status: 'active' | 'inactive';
  reportsRemaining: number;
  nextBillingDate: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: { type: 'get-subscription', userId: user?.id }
      });

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast({
        title: "Error",
        description: "Failed to fetch subscription status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  const canUploadFile = () => {
    if (!subscription || subscription.status !== 'active') {
      toast({
        title: "Subscription Required",
        description: "Please subscribe to upload files",
        variant: "destructive",
      });
      return false;
    }

    if (subscription.reportsRemaining <= 0) {
      toast({
        title: "Monthly Limit Reached",
        description: "You've reached your monthly report limit. Please wait for your next billing cycle.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  return {
    subscription,
    isLoading,
    canUploadFile,
    refreshSubscription: fetchSubscriptionStatus
  };
} 