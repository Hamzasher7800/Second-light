
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      
      setIsSubmitted(true);
      toast({
        title: "Email sent",
        description: "Check your email for a password reset link",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center landing-gradient px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-medium">Second Light</h1>
          </Link>
          <p className="text-dark-light mt-2">Reset your password</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm">
          {isSubmitted ? (
            <div className="text-center py-4">
              <h2 className="text-xl font-medium mb-2">Check your email</h2>
              <p className="text-dark-light mb-6">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <Button asChild>
                <Link to="/auth/login" className="bg-second hover:bg-second-dark text-dark">
                  Back to login
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-second hover:bg-second-dark text-dark"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
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
