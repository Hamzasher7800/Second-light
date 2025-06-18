import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No token provided.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const { error } = await supabase.functions.invoke('verify-email-token', {
          body: { token }
        });

        if (error) throw error;

        setStatus("success");
        setMessage("Email verified! Redirecting to login...");
        toast({
          title: "Success",
          description: "Email verified successfully. You can now log in.",
        });
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          navigate("/auth/login");
        }, 2000);
      } catch (error: Error | unknown) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Verification failed.");
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Email verification failed. Please try again.",
        });
      }
    };

    verifyEmail();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center landing-gradient">
      <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4">Email Verification</h1>
          {status === "verifying" && (
            <p className="text-dark-light">Verifying your email address...</p>
          )}
          {status === "success" && (
            <p className="text-green-600 font-medium">{message}</p>
          )}
          {status === "error" && (
            <p className="text-red-600 font-medium">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}