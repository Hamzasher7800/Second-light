
import { useState, useEffect } from 'react';
import { profileService, ProfileFormData, PasswordFormData } from '@/services/profileService';
import { toast } from "@/hooks/use-toast";

export function useProfile() {
  const [profile, setProfile] = useState<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchProfile() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await profileService.getProfile();
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
        toast({
          variant: "destructive",
          title: "Error loading profile",
          description: err.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProfile();
  }, []);
  
  async function updateProfile(data: ProfileFormData) {
    try {
      setIsLoading(true);
      await profileService.updateProfile(data);
      
      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email
      } : null);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      return true;
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: err.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }
  
  async function updatePassword(data: PasswordFormData) {
    try {
      setIsLoading(true);
      
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("New passwords don't match");
      }
      
      await profileService.updatePassword(data.currentPassword, data.newPassword);
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      
      return true;
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error updating password",
        description: err.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }
  
  return {
    profile,
    isLoading,
    error,
    updateProfile,
    updatePassword
  };
}
