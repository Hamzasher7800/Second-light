import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  console.log("Reset password CONFIRM function called, method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    
    const { token, newPassword } = requestBody;
    
    console.log("Token:", token);
    console.log("New password provided:", !!newPassword);
    
    if (!token || !newPassword) {
      console.log("Missing token or password");
      return new Response(JSON.stringify({
        error: "Token and new password are required",
        receivedToken: !!token,
        receivedPassword: !!newPassword
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.log("Missing environment variables");
      return new Response(JSON.stringify({
        error: "Server misconfiguration"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find and validate the reset token
    console.log("Looking up token in database...");
    const { data: tokenRow, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single();

    console.log("Token lookup result:", tokenRow);
    console.log("Token lookup error:", tokenError);

    if (tokenError || !tokenRow) {
      console.log("Token not found or error:", tokenError);
      return new Response(JSON.stringify({
        error: "Invalid or expired reset token",
        details: tokenError?.message || "Token not found in database"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if token has expired
    const tokenExpiry = new Date(tokenRow.expires_at);
    const now = new Date();
    console.log("Token expiry:", tokenExpiry);
    console.log("Current time:", now);
    console.log("Token expired:", tokenExpiry < now);
    
    if (tokenExpiry < now) {
      console.log("Token has expired");
      return new Response(JSON.stringify({
        error: "Reset token has expired",
        expiredAt: tokenExpiry.toISOString(),
        currentTime: now.toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Find the user by email
    console.log("Looking up user by email:", tokenRow.email);
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching users:", authError);
      return new Response(JSON.stringify({
        error: "Error finding user",
        details: authError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = authUser.users.find(u => u.email === tokenRow.email);
    console.log("User found:", !!user);
    
    if (!user) {
      console.log("User not found for email:", tokenRow.email);
      return new Response(JSON.stringify({
        error: "User not found",
        email: tokenRow.email
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Update the user's password
    console.log("Updating password for user:", user.id);
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(JSON.stringify({
        error: "Failed to update password",
        details: updateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Mark the token as used
    console.log("Marking token as used...");
    const { error: markUsedError } = await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("token", token);

    if (markUsedError) {
      console.error("Error marking token as used:", markUsedError);
    }

    console.log("Password reset completed successfully!");
    return new Response(JSON.stringify({
      message: "Password successfully updated"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Password reset confirm error:", err);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}); 