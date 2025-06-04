import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// --- AES-GCM decryption helper ---
function getKey(secret: string) {
  const raw = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function decrypt(data: string, secret: string): Promise<string> {
  const raw = atob(data);
  const iv = Uint8Array.from(raw.slice(0, 12), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(raw.slice(12), c => c.charCodeAt(0));
  const key = await getKey(secret);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ENCRYPTION_SECRET = Deno.env.get("ENCRYPTION_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    let token = "";
    if (req.method === "POST") {
      const body = await req.json();
      token = body.token;
    } else {
      const url = new URL(req.url);
      token = url.searchParams.get("token") ?? "";
    }
    if (!token) return new Response("Token required", {
      status: 400,
      headers: corsHeaders
    });
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ENCRYPTION_SECRET) {
      return new Response("Server misconfiguration", {
        status: 500,
        headers: corsHeaders
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find token and user
    const { data: tokenRow, error } = await supabase
      .from("email_verification_tokens")
      .select("*, pending_users(*)")
      .eq("token", token)
      .single();
    if (error || !tokenRow || tokenRow.used || new Date(tokenRow.expires_at) < new Date()) {
      return new Response("Invalid or expired token", {
        status: 400,
        headers: corsHeaders
      });
    }

    // Mark token as used and user as verified
    await supabase.from("email_verification_tokens").update({
      used: true
    }).eq("id", tokenRow.id);
    await supabase.from("pending_users").update({
      is_verified: true
    }).eq("id", tokenRow.user_id);

    // Decrypt password and create user in Supabase Auth
    const { email, encrypted_password } = tokenRow.pending_users;
    console.log("Token row:", tokenRow);
    console.log("About to decrypt password...");
    const plainPassword = await decrypt(encrypted_password, ENCRYPTION_SECRET);
    console.log("Decrypted password:", plainPassword, "length:", plainPassword.length);
    console.log("Creating user in Auth:", { email, plainPassword });
    
    // Create user in Auth with more detailed error handling
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: plainPassword,
      email_confirm: true
    });
    
    if (createError) {
      console.error("Failed to create user in Auth:", createError);
      // Rollback the verification status
      await supabase.from("pending_users").update({
        is_verified: false
      }).eq("id", tokenRow.user_id);
      await supabase.from("email_verification_tokens").update({
        used: false
      }).eq("id", tokenRow.id);
      return new Response("Failed to create user in Auth: " + createError.message, {
        status: 500,
        headers: corsHeaders
      });
    }

    if (!authUser) {
      console.error("No user data returned from createUser");
      // Rollback the verification status
      await supabase.from("pending_users").update({
        is_verified: false
      }).eq("id", tokenRow.user_id);
      await supabase.from("email_verification_tokens").update({
        used: false
      }).eq("id", tokenRow.id);
      return new Response("Failed to create user in Auth: No user data returned", {
        status: 500,
        headers: corsHeaders
      });
    }

    console.log("User created in Auth:", authUser);

    // Delete encrypted password for security
    await supabase.from("pending_users").update({
      encrypted_password: null
    }).eq("id", tokenRow.user_id);

    return new Response("Email verified! You can now log in.", {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response("Internal server error", {
      status: 500,
      headers: corsHeaders
    });
  }
});
