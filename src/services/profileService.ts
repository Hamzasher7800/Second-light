
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ProfileFormData = {
  firstName: string;
  lastName: string;
  email: string;
};

export type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export const profileService = {
  /**
   * Get the current user's profile
   */
  async getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not found");
      }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        throw error;
      }
      
      return {
        userId: user.id,
        email: user.email || "",
        firstName: profile?.display_name?.split(' ')[0] || "",
        lastName: profile?.display_name?.split(' ')[1] || "",
        avatarUrl: profile?.avatar_url || ""
      };
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
      throw error;
    }
  },
  
  /**
   * Update the user's profile
   */
  async updateProfile(data: ProfileFormData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not found");
      }
      
      // Update display name in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: `${data.firstName} ${data.lastName}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (profileError) {
        throw profileError;
      }
      
      // If email has changed, update it in auth
      if (data.email !== user.email) {
        const { error: emailError } = await supabase.auth
          .updateUser({ email: data.email });
          
        if (emailError) {
          throw emailError;
        }
        
        toast({
          title: "Email update requested",
          description: "Check your inbox to confirm your new email address.",
        });
      }
      
      return true;
    } catch (error: any) {
      console.error("Error updating profile:", error.message);
      throw error;
    }
  },
  
  /**
   * Update the user's password
   */
  async updatePassword(currentPassword: string, newPassword: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        throw new Error("User not found");
      }
      
      // First verify the current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (signInError) {
        throw new Error("Current password is incorrect");
      }
      
      // Update to the new password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error: any) {
      console.error("Error updating password:", error.message);
      throw error;
    }
  }
};
