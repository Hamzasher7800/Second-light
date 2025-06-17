import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setMessage("No verification token found. Please check your verification link.");
        return;
      }

      try {
        // Call the Edge Function to verify the token
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/verify-email-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ token }),
          }
        );

        const text = await response.text();
        
        if (response.ok) {
          setStatus("success");
          setMessage("Email verified successfully! Redirecting to login...");
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            navigate("/auth/login");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(text || "Failed to verify email. Please try again or contact support.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("An error occurred during verification. Please try again later.");
      }
    };

    verifyEmail();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Email Verification
          </h2>
          <div className="mt-4">
            {status === "verifying" && (
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-gray-600">Verifying your email address...</p>
              </div>
            )}
            {status === "success" && (
              <div className="space-y-4">
                <p className="text-green-600 font-medium">{message}</p>
                <button
                  onClick={() => navigate("/auth/login")}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Go to Login
                </button>
              </div>
            )}
            {status === "error" && (
              <div className="space-y-4">
                <p className="text-red-600 font-medium">{message}</p>
                <button
                  onClick={() => navigate("/auth/login")}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}