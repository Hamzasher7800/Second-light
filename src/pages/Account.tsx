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
import { useSubscription } from "@/hooks/useSubscription";

const Account = () => {
  const { profile, isLoading, updateProfile, updatePassword } = useProfile();
  const { user } = useAuth();
  const { subscription, isLoading: isLoadingSubscription, hasActiveAccess } = useSubscription();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isSuccess = params.get("success");
  const isCanceled = params.get("canceled");



  const handleSubscribe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: { 
          type: 'create-checkout-session', 
          userId: user?.id,
          domain: 'https://second-light-ai.netlify.app'
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: { 
          type: 'create-portal-session', 
          userId: user?.id,
          domain: 'https://second-light-ai.netlify.app'
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
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
      
      <div className="flex-1 flex flex-col md:ml-64">
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
                              {hasActiveAccess() 
                                ? subscription?.status === 'cancelled' 
                                  ? 'Monthly Subscription (Cancelled)' 
                                  : 'Monthly Subscription'
                                : 'No Active Subscription'}
                            </p>
                          </div>
                          <div>
                            <span className="text-xl font-medium">$9.99/month</span>
                          </div>
                        </div>
                        {hasActiveAccess() && (
                          <div className="text-sm text-muted-foreground">
                            {subscription?.status === 'cancelled' ? (
                              <p className="text-orange-600 font-medium">
                                Subscription cancelled - Access until: {new Date(subscription.currentPeriodEnd || subscription.nextBillingDate!).toLocaleDateString()}
                              </p>
                            ) : (
                              <p>Next billing date: {new Date(subscription.nextBillingDate!).toLocaleDateString()}</p>
                            )}
                            <p className="mt-2">Reports remaining this month: {subscription.reportsRemaining}/30</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        {hasActiveAccess() ? (
                          <>
                            {subscription?.status === 'cancelled' ? (
                              <div className="flex flex-col gap-2">
                                <p className="text-sm text-muted-foreground">
                                  Your subscription is cancelled and will end on {new Date(subscription.currentPeriodEnd || subscription.nextBillingDate!).toLocaleDateString()}
                                </p>
                                <Button onClick={handleSubscribe}>
                                  Reactivate Subscription
                                </Button>
                              </div>
                            ) : (
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
                            )}
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