import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    setEmailError("");
    setIsLoading(true);

    try {
      // Use custom password reset function
      console.log("Calling function with email:", email);
      console.log("Supabase client config:", {
        url: supabase.supabaseUrl,
        key: supabase.supabaseKey?.substring(0, 20) + "..."
      });
      
      const { data, error } = await supabase.functions.invoke('reset-password-request', {
        body: { email }
      });

      console.log("Function response:", { data, error });

      if (error) throw error;
      
      setIsSubmitted(true);
      toast({
        title: "Email sent",
        description: "Check your email for a password reset link. Don't forget to check your spam folder!",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      console.error("Error details:", {
        message: error.message,
        cause: error.cause,
        context: error.context
      });
      
      // Try to get more specific error information
      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          console.error("Parsed error body:", errorBody);
        } catch (parseError) {
          console.error("Raw error body:", error.context.body);
        }
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reset email. Please check the console for details.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center landing-gradient px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium">Second Light</h1>
          <p className="text-dark-light mt-2">Reset your password</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          {isSubmitted ? (
            <div className="text-center py-4">
              <h2 className="text-xl font-medium mb-2">Check your email</h2>
              <p className="text-dark-light mb-6">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Don't see the email? Check your spam folder.
              </p>
              <Button asChild>
                <Link to="/auth/login" className="bg-second hover:bg-second-dark text-dark">
                  Back to login
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> If you encounter issues with the reset email, 
                  please contact support at support@second-light-ai.com for manual password reset.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    required
                    disabled={isLoading}
                    className={emailError ? "border-red-500" : ""}
                  />
                  {emailError && (
                    <p className="text-red-500 text-sm mt-1">{emailError}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-second hover:bg-second-dark text-dark"
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>
        
        <div className="text-center mt-6">
          <Link to="/auth/login" className="text-second hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
