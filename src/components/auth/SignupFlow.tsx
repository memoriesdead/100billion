"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button"; // Import Button
import { BirthdayStep } from './BirthdayStep';
import { UsernameStep } from './UsernameStep';
import { EmailPasswordStep } from './EmailPasswordStep'; // Import the new step
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner'; // Using sonner for toasts

interface SignupFlowProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSwitchToLogin?: () => void; // Add prop to switch to login modal
}

export function SignupFlow({ isOpen, onOpenChange, onSwitchToLogin }: SignupFlowProps) {
  const [step, setStep] = useState(1); // 1: Email/Password, 2: Birthday, 3: Username
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    birthday: '', // Store as string for now, adjust as needed
    username: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setStep(prev => prev - 1);
  };

  // Function to generate a default username (example)
  const generateDefaultUsername = (email: string): string => {
    const namePart = email.split('@')[0];
    // Basic sanitization and adding random numbers
    const sanitizedName = namePart.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 15);
    return `${sanitizedName}${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const handleFinalSubmit = async (usernameData: { username: string; skipped: boolean }) => {
    setIsLoading(true);
    let finalUsername = usernameData.username;

    // Generate default username if skipped
    if (usernameData.skipped || !finalUsername.trim()) {
      finalUsername = generateDefaultUsername(formData.email);
      console.log(`Username skipped, generated default: ${finalUsername}`);
    }

    const finalData = { ...formData, username: finalUsername };
    console.log("Attempting final signup with data:", finalData); // Log data before signup

    try {
      // 1. Sign up the user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: finalData.email,
        password: finalData.password,
      });

      if (authError) {
        console.error("Supabase Auth Error:", authError);
        throw new Error(authError.message || "Authentication failed.");
      }
      if (!authData.user) {
        throw new Error("Authentication succeeded but no user data returned.");
      }

      console.log("Supabase Auth successful, user ID:", authData.user.id);

      // 2. Insert/Update the profile in the 'profiles' table
      // Use upsert to ensure the profile exists and the username is set.
      // It will insert if no profile exists for the user ID, or update if it does.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,  // Provide 'id' as it's likely the PK and FK to auth.users
          uid: authData.user.id, // Also provide 'uid' to satisfy the potentially incorrect type definition
          username: finalData.username,
          // email: finalData.email, // Removed: 'email' column likely doesn't exist in 'profiles' table
          // Add birthday if your profiles table has a birthday column
          // birthday: finalData.birthday,
          // Add any other default profile fields needed on signup
        }, {
          onConflict: 'id' // Specify the conflict target (the user ID)
        });

      if (profileError) {
        console.error("Supabase Profile Upsert Error:", profileError);
        // Profile creation/update failed, but auth succeeded. Inform user.
        toast.error("Account created, but failed to save profile details. Please try updating your profile later.");
        // Optionally, you might want to clean up the auth user if profile creation is critical
      } else {
         console.log("Profile upserted successfully with username:", finalData.username);
      }

      toast.success("Signup successful! Please check your email for verification if required.");
      onOpenChange(false); // Close the modal on success
      setStep(1); // Reset step for next time
      setFormData({ email: '', password: '', username: '', birthday: '' }); // Clear form

    } catch (error) {
      console.error("Final Signup Error:", error);
      toast.error(`Signup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <EmailPasswordStep onNext={handleNext} isLoading={isLoading} />;
      case 2:
        return <BirthdayStep onNext={handleNext} isLoading={isLoading} /* onPrevious={handlePrevious} */ />; // Add onPrevious if needed
      case 3:
        return <UsernameStep onNext={handleFinalSubmit} onPrevious={handlePrevious} isLoading={isLoading} />;
      default:
        return <div>Invalid step</div>; // Should not happen
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign up</DialogTitle>
          <DialogDescription>
            Step {step} of 3
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {renderStep()}
        </div>
        {/* Add switch to login link/button */}
        {onSwitchToLogin && (
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={onSwitchToLogin}>
              Log in
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
