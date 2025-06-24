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
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response("Email and password required", {
        status: 400,
        headers: corsHeaders
      });
    }
    if (!SENDGRID_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ENCRYPTION_SECRET) {
      return new Response("Server misconfiguration", {
        status: 500,
        headers: corsHeaders
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if pending user exists
    const { data: existing, error: existingError } = await supabase
      .from("pending_users")
      .select("*")
      .eq("email", email)
      .single();

    let userId: string;
    let resend = false;

    const encryptedPassword = await encrypt(password, ENCRYPTION_SECRET);

    if (existing && !existing.is_verified) {
      // Update encrypted password and resend verification
      const { error: updateError } = await supabase
        .from("pending_users")
        .update({ encrypted_password: encryptedPassword })
        .eq("email", email);
      if (updateError) {
        return new Response(updateError.message, {
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
        return new Response(userError.message, {
          status: 400,
          headers: corsHeaders
        });
      }
      userId = user.id;
    }

    // Generate new token
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Insert new token (optionally, you can mark old tokens as used)
    await supabase.from("email_verification_tokens").insert({
      user_id: userId,
      token,
      expires_at,
      used: false
    });

    // Send email via SendGrid
    const BASE_URL = Deno.env.get("BASE_URL") || "http";
    const verificationUrl = `${BASE_URL}/verify-email?token=${token}`;
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
            subject: "Verify your email"
          }
        ],
        from: {
          email: "noreply@secondlight.health",
          name: "Second Light"
        },
        content: [
          {
            type: "text/html",
            value: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`
          }
        ]
      })
    });

    if (!sendgridRes.ok) {
      const err = await sendgridRes.text();
      return new Response(`SendGrid error: ${err}`, {
        status: 500,
        headers: corsHeaders
      });
    }

    return new Response(
      resend
        ? "Verification email resent. Please check your inbox."
        : "Check your email to verify your account.",
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders
    });
  }
});
