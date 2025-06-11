import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  console.log("Reset password REQUEST function called, method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Processing password reset request...");
    
    const requestBody = await req.json();
    console.log("Request body:", requestBody);
    
    const { email } = requestBody;
    console.log("Email:", email);
    
    if (!email) {
      console.log("Email is missing from request");
      return new Response(JSON.stringify({
        error: "Email is required"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Checking environment variables...");
    if (!SENDGRID_API_KEY) {
      console.log("Missing SENDGRID_API_KEY");
      return new Response(JSON.stringify({
        error: "Server misconfiguration - SendGrid API key missing"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Generate a secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    // Use localhost for development
    const BASE_URL = "http://localhost:8080";
    const resetUrl = `${BASE_URL}/auth/reset-password?token=${token}`;
    
    console.log("Generated token:", token);
    console.log("Reset URL:", resetUrl);
    
    // Try to initialize Supabase client and store token (but don't fail if this fails)
    let tokenStored = false;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        console.log("Attempting to store token in database...");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        const { error: tokenError } = await supabase
          .from("password_reset_tokens")
          .insert({
            email: email,
            token: token,
            expires_at: expiresAt.toISOString(),
            used: false
          });

        if (tokenError) {
          console.error("Error storing token:", tokenError);
        } else {
          tokenStored = true;
          console.log("Token stored successfully");
        }
      } catch (dbError) {
        console.error("Database connection error:", dbError);
      }
    }
    
    // Send email via SendGrid
    console.log("Sending password reset email...");
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
            subject: "Reset your password - Second Light"
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
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #f4a6a6 0%, #e87d7d 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 600;">Second Light</h1>
                    <p style="margin: 8px 0 0 0; color: #333333; font-size: 16px; opacity: 0.8;">Password Reset Request</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 40px 20px;">
                    <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">Reset Your Password</h2>
                    
                    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We received a request to reset the password for your Second Light account associated with <strong>${email}</strong>.
                    </p>
                    
                    <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                      Click the button below to create a new password:
                    </p>
                    
                    <!-- Reset Button -->
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${resetUrl}" 
                         style="background-color: #f4a6a6; 
                                color: #333333; 
                                padding: 16px 32px; 
                                text-decoration: none; 
                                border-radius: 8px; 
                                display: inline-block; 
                                font-weight: 600; 
                                font-size: 16px;
                                transition: background-color 0.3s ease;">
                        Reset My Password
                      </a>
                    </div>
                    
                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 20px 0;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="word-break: break-all; color: #4a90e2; font-size: 14px; background-color: #f8f9fa; padding: 12px; border-radius: 4px; margin: 0 0 30px 0;">
                      ${resetUrl}
                    </p>
                    
                    <!-- Security Info -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 16px; margin: 30px 0;">
                      <h3 style="color: #856404; margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">Security Information</h3>
                      <ul style="color: #856404; font-size: 14px; line-height: 1.5; margin: 0; padding-left: 20px;">
                        <li>This link will expire in <strong>1 hour</strong> for security reasons</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Your current password will remain unchanged until you complete the reset process</li>
                      </ul>
                    </div>
                    
                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      If you have any questions or need assistance, please contact our support team.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0; color: #6c757d; font-size: 12px;">
                      © ${new Date().getFullYear()} Second Light Health. All rights reserved.
                    </p>
                    <p style="margin: 8px 0 0 0; color: #6c757d; font-size: 12px;">
                      This is an automated message, please do not reply to this email.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `
          }
        ]
      })
    });

    console.log("SendGrid response status:", sendgridRes.status);
    if (!sendgridRes.ok) {
      const err = await sendgridRes.text();
      console.error("SendGrid error:", err);
      return new Response(JSON.stringify({
        error: "Failed to send reset email"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log("Password reset email sent successfully!");
    return new Response(JSON.stringify({
      message: "Password reset link has been sent to your email address.",
      tokenStored: tokenStored
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Password reset request error:", err);
    return new Response(JSON.stringify({
      error: "An unexpected error occurred. Please try again later.",
      details: err.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});