import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

    // Call your Edge Function to verify the token
    fetch("https://qlkkjojkaoniwhgdxelh.supabase.co/functions/v1/verify-email-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsa2tqb2prYW9uaXdoZ2R4ZWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MjE4NjUsImV4cCI6MjA2MjA5Nzg2NX0.vbR2omz7_PSaiAy5geCmM-NaXnmB6jaCXXac3JXlXjU",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsa2tqb2prYW9uaXdoZ2R4ZWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MjE4NjUsImV4cCI6MjA2MjA5Nzg2NX0.vbR2omz7_PSaiAy5geCmM-NaXnmB6jaCXXac3JXlXjU"
      },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setMessage("Email verified! Redirecting to login...");
          // Redirect to login page after 2 seconds
          setTimeout(() => {
            navigate("/auth/login");
          }, 2000);
        } else {
          const text = await res.text();
          setStatus("error");
          setMessage(text || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Verification failed.");
      });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow">
        {status === "verifying" && <p>Verifying your email...</p>}
        {status === "success" && <p className="text-green-600">{message}</p>}
        {status === "error" && <p className="text-red-600">{message}</p>}
      </div>
    </div>
  );
}