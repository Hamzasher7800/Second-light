import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add new types for custom signup/verification
export type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signupPendingUser: (email: string, password: string) => Promise<void>;
  verifyEmailToken: (token: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && !isInitialLoad) {
          toast({
            title: "Success!",
            description: "You have successfully signed in.",
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed out",
            description: "You have been signed out.",
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      setIsInitialLoad(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Custom signup: call the edge function
  async function signupPendingUser(email: string, password: string) {
    setIsLoading(true);
    try {
      // Store password temporarily for verification
      localStorage.setItem('temp_password', password);
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/signup-pending-user`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Signup error response:', err);
        throw new Error(err);
      }

      const result = await res.text();
      console.log('Signup success response:', result);

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      navigate('/auth/login');
    } catch (error: unknown) {
      // Clear temporary password on error
      localStorage.removeItem('temp_password');
      console.error('Signup error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Custom verification: call the edge function
  async function verifyEmailToken(token: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-email-token`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ token })
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Verification error response:', err);
        throw new Error(err);
      }

      const result = await res.text();
      console.log('Verification success response:', result);

      toast({
        title: "Email verified!",
        description: "You can now log in.",
      });
      navigate('/auth/login');
    } catch (error: unknown) {
      console.error('Verification error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/dashboard');
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signupPendingUser, verifyEmailToken, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
