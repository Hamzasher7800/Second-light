import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  status: 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
  reportsRemaining: number;
  nextBillingDate: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
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

  // Check if user has active access (including cancelled subs that haven't expired)
  const hasActiveAccess = () => {
    if (!subscription) return false;
    
    // Active subscriptions have access
    if (subscription.status === 'active') return true;
    
    // Cancelled subscriptions have access until period end
    if (subscription.status === 'cancelled' && subscription.currentPeriodEnd) {
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const now = new Date();
      return now < periodEnd;
    }
    
    // Trialing subscriptions have access
    if (subscription.status === 'trialing') return true;
    
    return false;
  };

  const canUploadFile = () => {
    if (!hasActiveAccess()) {
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
    hasActiveAccess,
    canUploadFile,
    refreshSubscription: fetchSubscriptionStatus
  };
} 