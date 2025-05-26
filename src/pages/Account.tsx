import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import MobileMenu from "@/components/MobileMenu";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { PasswordForm } from "@/components/forms/PasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

interface SubscriptionStatus {
  status: 'active' | 'inactive';
  reportsRemaining: number;
  nextBillingDate: string | null;
}

const Account = () => {
  const { profile, isLoading, updateProfile, updatePassword } = useProfile();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isSuccess = params.get("success");
  const isCanceled = params.get("canceled");

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
      setIsLoadingSubscription(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  const handleSubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: { 
          type: 'create-checkout-session', 
          userId: user?.id,
          successUrl: `${window.location.origin}/account?success=true`,
          cancelUrl: `${window.location.origin}/account?canceled=true`
        }
      });

      if (error) throw error;
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: { type: 'create-portal-session', userId: user?.id }
      });

      if (error) throw error;
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: { type: 'cancel-subscription', userId: user?.id }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Your subscription will be canceled at the end of the billing period",
      });
      
      fetchSubscriptionStatus();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <MobileMenu />
        
        <main className="flex-1 p-6 md:p-8 overflow-y-auto dashboard-gradient">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-medium mb-8">Account Settings</h1>
            
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your account profile details</CardDescription>
                </CardHeader>
                <CardContent>
                  {profile ? (
                    <ProfileForm 
                      initialData={{
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        email: profile.email
                      }}
                      onSubmit={updateProfile}
                      isLoading={isLoading}
                    />
                  ) : (
                    <div className="py-4 text-center text-muted-foreground">
                      Loading profile information...
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>Manage your subscription plan</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingSubscription ? (
                    <div className="py-4 text-center text-muted-foreground">
                      Loading subscription information...
                    </div>
                  ) : (
                    <>
                      <div className="bg-light-dark p-5 rounded-lg mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">Current Plan</h3>
                            <p className="text-muted-foreground">
                              {subscription?.status === 'active' ? 'Monthly Subscription' : 'No Active Subscription'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xl font-medium">$9.99/month</span>
                          </div>
                        </div>
                        {subscription?.status === 'active' && (
                          <div className="text-sm text-muted-foreground">
                            <p>Next billing date: {new Date(subscription.nextBillingDate!).toLocaleDateString()}</p>
                            <p className="mt-2">Reports remaining this month: {subscription.reportsRemaining}/30</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        {subscription?.status === 'active' ? (
                          <>
                            <Button variant="outline" onClick={handleManageSubscription}>
                              Manage Payment Methods
                            </Button>
                            <Button 
                              variant="outline" 
                              className="text-destructive"
                              onClick={handleCancelSubscription}
                            >
                              Cancel Subscription
                            </Button>
                          </>
                        ) : (
                          <Button onClick={handleSubscribe}>
                            Subscribe Now
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              

              
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Update your password</CardDescription>
                </CardHeader>
                <CardContent>
                  <PasswordForm
                    onSubmit={updatePassword}
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Account; 