
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';

interface UsageSummary {
  totalDocuments: number;
  processedDocuments: number;
  subscriptionType: string;
  nextBillingDate: string;
}

async function fetchUsageSummary(): Promise<UsageSummary> {
  try {
    // Get user's usage stats from the new usage_stats table
    const { data: usageStats, error: usageError } = await supabase
      .from("usage_stats")
      .select("*")
      .single();
      
    if (usageError) {
      console.error("Error fetching usage stats:", usageError);
    }
    
    // Get total documents count
    const { count: totalDocuments, error: countError } = await supabase
      .from("documents")
      .select("*", { count: 'exact', head: true });
      
    if (countError) {
      console.error("Error counting documents:", countError);
    }
    
    // Get processed documents count
    const { count: processedDocuments, error: processedError } = await supabase
      .from("documents")
      .select("*", { count: 'exact', head: true })
      .eq('status', 'Analyzed');
      
    if (processedError) {
      console.error("Error counting processed documents:", processedError);
    }
    
    return {
      totalDocuments: totalDocuments || 0,
      processedDocuments: processedDocuments || 0,
      subscriptionType: usageStats?.subscription_type || 'Free',
      nextBillingDate: usageStats?.next_billing_date || new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching usage summary:", error);
    // Return default values in case of error
    return {
      totalDocuments: 0,
      processedDocuments: 0,
      subscriptionType: 'Free',
      nextBillingDate: new Date().toISOString()
    };
  }
}

export function useUsageSummary() {
  const { user } = useAuth();
  
  const { 
    data: usageSummary,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['usageSummary', user?.id],
    queryFn: fetchUsageSummary,
    enabled: !!user,
  });
  
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    usageSummary: usageSummary || {
      totalDocuments: 0,
      processedDocuments: 0,
      subscriptionType: 'Free', // Default value
      nextBillingDate: new Date().toISOString()
    },
    isLoading,
    error: errorMessage || null,
    refetchUsageSummary: refetch
  };
}
