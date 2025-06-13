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
      
      <div className="flex-1 flex flex-col md:ml-64 relative min-w-0">
        <DashboardHeader />
        <MobileMenu />
        
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto dashboard-gradient">
          <div className="max-w-4xl mx-auto w-full">
            <div className="pr-12 sm:pr-16 md:pr-0 mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-medium break-words">Account Settings</h1>
            </div>
            
            <div className="space-y-6 sm:space-y-8">
              {/* Profile Information Card */}
              <Card className="w-full">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Update your account profile details
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
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
                    <div className="py-6 sm:py-8 text-center text-muted-foreground text-sm sm:text-base">
                      Loading profile information...
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Subscription Card */}
              <Card className="w-full">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">Subscription</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Manage your subscription plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {isLoadingSubscription ? (
                    <div className="py-6 sm:py-8 text-center text-muted-foreground text-sm sm:text-base">
                      Loading subscription information...
                    </div>
                  ) : (
                    <>
                      <div className="bg-light-dark p-4 sm:p-5 rounded-lg mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm sm:text-base">Current Plan</h3>
                            <p className="text-muted-foreground text-xs sm:text-sm break-words">
                              {hasActiveAccess() 
                                ? subscription?.status === 'cancelled' 
                                  ? 'Monthly Subscription (Cancelled)' 
                                  : 'Monthly Subscription'
                                : 'No Active Subscription'}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-lg sm:text-xl font-medium">$9.99/month</span>
                          </div>
                        </div>
                        {hasActiveAccess() && (
                          <div className="text-xs sm:text-sm text-muted-foreground space-y-2">
                            {subscription?.status === 'cancelled' ? (
                              <p className="text-orange-600 font-medium break-words">
                                Subscription cancelled - Access until: {new Date(subscription.currentPeriodEnd || subscription.nextBillingDate!).toLocaleDateString()}
                              </p>
                            ) : (
                              <p className="break-words">
                                Next billing date: {new Date(subscription.nextBillingDate!).toLocaleDateString()}
                              </p>
                            )}
                            <p className="break-words">
                              Reports remaining this month: {subscription.reportsRemaining}/30
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-3 sm:gap-4">
                        {hasActiveAccess() ? (
                          <>
                            {subscription?.status === 'cancelled' ? (
                              <div className="space-y-3">
                                <p className="text-xs sm:text-sm text-muted-foreground break-words">
                                  Your subscription is cancelled and will end on {new Date(subscription.currentPeriodEnd || subscription.nextBillingDate!).toLocaleDateString()}
                                </p>
                                <Button 
                                  onClick={handleSubscribe}
                                  className="w-full sm:w-auto text-sm sm:text-base"
                                >
                                  Reactivate Subscription
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <Button 
                                  variant="outline" 
                                  onClick={handleManageSubscription}
                                  className="w-full sm:w-auto text-sm sm:text-base"
                                >
                              Manage Payment Methods
                            </Button>
                            <Button 
                              variant="outline" 
                                  className="text-destructive w-full sm:w-auto text-sm sm:text-base"
                              onClick={handleCancelSubscription}
                            >
                              Cancel Subscription
                            </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <Button 
                            onClick={handleSubscribe}
                            className="w-full sm:w-auto text-sm sm:text-base"
                          >
                            Subscribe Now
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Security Card */}
              <Card className="w-full">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl">Security</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Update your password
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
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