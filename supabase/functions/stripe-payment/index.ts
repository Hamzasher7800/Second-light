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
      case 'create-checkout-session':
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
      case 'create-portal-session':
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
      case 'get-subscription':
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1
        });
        const subscription = subscriptions.data[0];
        if (!subscription || subscription.status !== 'active') {
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
        // Fetch the user's subscription start date
        const { data: profile } = await supabaseClient.from('profiles').select('subscription_start_date').eq('id', userId).single();
        const subscriptionStart = profile?.subscription_start_date || '1970-01-01';
        const { data: reports } = await supabaseClient.from('documents').select('id').eq('user_id', userId).gte('created_at', subscriptionStart);
        const reportsUsed = reports?.length || 0;
        const reportsRemaining = Math.max(0, 30 - reportsUsed);
        return new Response(JSON.stringify({
          status: subscription.status,
          reportsRemaining,
          nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString()
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      case 'cancel-subscription':
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
        const canceledSubscription = await stripe.subscriptions.del(activeSubscriptions.data[0].id);
        console.log('Canceled subscription:', canceledSubscription);
        return new Response(JSON.stringify({
          status: canceledSubscription.status,
          cancelAt: canceledSubscription.canceled_at ? new Date(canceledSubscription.canceled_at * 1000).toISOString() : null
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
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
