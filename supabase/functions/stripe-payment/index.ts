import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID') || '';
const DOMAIN = 'https://second-light-ai.netlify.app';
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { type, userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get user from Supabase
    const { data: user, error: userError } = await supabaseClient.from('profiles').select('stripe_customer_id').eq('id', userId).single();
    if (userError) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let customerId = user.stripe_customer_id;
    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          supabaseUserId: userId
        }
      });
      customerId = customer.id;
      // Update user with Stripe customer ID
      await supabaseClient.from('profiles').update({
        stripe_customer_id: customerId,
        subscription_start_date: new Date().toISOString()
      }).eq('id', userId);
    }
    switch(type){
      case 'create-checkout-session': {
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          line_items: [
            {
              price: PRICE_ID,
              quantity: 1
            }
          ],
          mode: 'subscription',
          success_url: `${DOMAIN}/account?success=true`,
          cancel_url: `${DOMAIN}/account?canceled=true`,
          metadata: {
            userId
          }
        });
        // Always update subscription_start_date when a new checkout session is created
        await supabaseClient.from('profiles').update({
          subscription_start_date: new Date().toISOString()
        }).eq('id', userId);
        return new Response(JSON.stringify({
          url: session.url
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      case 'create-portal-session': {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${DOMAIN}/account`
        });
        return new Response(JSON.stringify({
          url: portalSession.url
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      case 'get-subscription': {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1
        });
        const subscription = subscriptions.data[0];
        
        if (!subscription) {
          return new Response(JSON.stringify({
            status: 'inactive',
            reportsRemaining: 0,
            nextBillingDate: null
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Check if subscription is active or cancelled but still has access
        const isActive = subscription.status === 'active';
        const isCancelledButActive = subscription.status === 'active' && subscription.cancel_at_period_end;
        const hasAccess = isActive || (subscription.status === 'cancelled' && new Date() < new Date(subscription.current_period_end * 1000));

        if (!hasAccess) {
          return new Response(JSON.stringify({
            status: 'inactive',
            reportsRemaining: 0,
            nextBillingDate: null
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Use current billing period start for report calculation
        const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
        console.log('Calculating reports for period starting:', currentPeriodStart);
        
        const { data: reports, error: reportsError } = await supabaseClient
          .from('documents')
          .select('id, created_at')
          .eq('user_id', userId)
          .gte('created_at', currentPeriodStart);
          
        if (reportsError) {
          console.error('Error fetching reports:', reportsError);
        }
        
        console.log('Reports found:', reports?.length || 0, 'reports:', reports);
        const reportsUsed = reports?.length || 0;
        const reportsRemaining = Math.max(0, 30 - reportsUsed);

        // Determine status to return
        let statusToReturn = subscription.status;
        if (subscription.cancel_at_period_end || isCancelledButActive) {
          statusToReturn = 'cancelled';
        }

        return new Response(JSON.stringify({
          status: statusToReturn,
          reportsRemaining,
          nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      case 'cancel-subscription': {
        const activeSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1
        });
        if (activeSubscriptions.data.length === 0) {
          return new Response(JSON.stringify({
            error: 'No active subscription found'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        
        // Cancel at period end instead of immediately
        const canceledSubscription = await stripe.subscriptions.update(
          activeSubscriptions.data[0].id,
          { cancel_at_period_end: true }
        );
        
        console.log('Canceled subscription at period end:', canceledSubscription);
        return new Response(JSON.stringify({
          status: 'cancelled',
          cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
          currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000).toISOString()
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      default:
        return new Response(JSON.stringify({
          error: 'Invalid request type'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
