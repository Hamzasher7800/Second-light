import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// --- AES-GCM encryption/decryption helpers ---
function getKey(secret: string) {
  const raw = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(text: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(secret);
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return btoa(String.fromCharCode(...iv) + String.fromCharCode(...new Uint8Array(ciphertext)));
}

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENCRYPTION_SECRET = Deno.env.get("ENCRYPTION_SECRET"); // 32 bytes, base64

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    // Log request headers for debugging
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response("Email and password required", {
        status: 400,
        headers: corsHeaders
      });
    }

    // Check environment variables
    if (!SENDGRID_API_KEY) {
      console.error("Missing SENDGRID_API_KEY");
      return new Response("Server misconfiguration: Missing SendGrid API key", {
        status: 500,
        headers: corsHeaders
      });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ENCRYPTION_SECRET) {
      console.error("Missing required environment variables");
      return new Response("Server misconfiguration: Missing required environment variables", {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log("Creating Supabase client...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if pending user exists
    console.log("Checking for existing user...");
    const { data: existing, error: existingError } = await supabase
      .from("pending_users")
      .select("*")
      .eq("email", email)
      .single();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("Error checking existing user:", existingError);
      return new Response(`Database error: ${existingError.message}`, {
        status: 500,
        headers: corsHeaders
      });
    }

    let userId: string;
    let resend = false;

    console.log("Encrypting password...");
    const encryptedPassword = await encrypt(password, ENCRYPTION_SECRET);

    if (existing && !existing.is_verified) {
      console.log("Updating existing unverified user...");
      // Update encrypted password and resend verification
      const { error: updateError } = await supabase
        .from("pending_users")
        .update({ encrypted_password: encryptedPassword })
        .eq("email", email);
      if (updateError) {
        console.error("Error updating user:", updateError);
        return new Response(`Database error: ${updateError.message}`, {
          status: 500,
          headers: corsHeaders
        });
      }
      userId = existing.id;
      resend = true;
    } else if (existing && existing.is_verified) {
      return new Response("Account already exists. Please log in.", {
        status: 400,
        headers: corsHeaders
      });
    } else {
      console.log("Creating new pending user...");
      // Create new pending user
      const { data: user, error: userError } = await supabase
        .from("pending_users")
        .insert({
          email,
          encrypted_password: encryptedPassword,
          is_verified: false
        })
        .select()
        .single();
      if (userError) {
        console.error("Error creating user:", userError);
        return new Response(`Database error: ${userError.message}`, {
          status: 400,
          headers: corsHeaders
        });
      }
      userId = user.id;
    }

    // Generate new token
    console.log("Generating verification token...");
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Insert new token
    console.log("Storing verification token...");
    const { error: tokenError } = await supabase.from("email_verification_tokens").insert({
      user_id: userId,
      token,
      expires_at,
      used: false
    });

    if (tokenError) {
      console.error("Error storing token:", tokenError);
      return new Response(`Database error: ${tokenError.message}`, {
        status: 500,
        headers: corsHeaders
      });
    }

    // Send email via SendGrid
    console.log("Preparing to send verification email...");
    const BASE_URL = Deno.env.get("BASE_URL") || "https://second-light-ai.netlify.app";
    const verificationUrl = `${BASE_URL}/auth/verify-email?token=${token}`;
    
    console.log("Sending verification email to:", email);
    console.log("Verification URL:", verificationUrl);
    
    const sendgridRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email }],
            subject: "Verify your Second Light account"
          }
        ],
        from: {
          email: "noreply@secondlight.health",
          name: "Second Light"
        },
        content: [
          {
            type: "text/html",
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Second Light!</h2>
                <p>Thank you for signing up. Please verify your email address to complete your registration.</p>
                <p style="margin: 20px 0;">
                  <a href="${verificationUrl}" 
                     style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    Verify Email Address
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  If you didn't create an account with Second Light, you can safely ignore this email.
                </p>
              </div>
            `
          }
        ]
      })
    });

    if (!sendgridRes.ok) {
      const err = await sendgridRes.text();
      console.error("SendGrid error:", err);
      return new Response(`Failed to send verification email: ${err}`, {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log("Email sent successfully!");
    return new Response(
      resend
        ? "Verification email resent. Please check your inbox."
        : "Check your email to verify your account.",
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(`Internal server error: ${err instanceof Error ? err.message : String(err)}`, {
      status: 500,
      headers: corsHeaders
    });
  }
});
