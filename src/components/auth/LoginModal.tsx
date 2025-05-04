"use client";

import React, { useState, useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"; // Removed DialogClose
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { FaGoogle, FaFacebook, FaApple, FaQrcode, FaUser } from 'react-icons/fa'; // Import icons

interface LoginModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // Optional: Callback to open signup modal if user doesn't have an account
  onSwitchToSignup?: () => void;
}

export function LoginModal({ isOpen, onOpenChange, onSwitchToSignup }: LoginModalProps) {
  const { signInWithEmail, signInWithGoogle } = useAuth(); // Get sign-in functions
  const [showEmailForm, setShowEmailForm] = useState(false); // State to toggle email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      toast.success("Logged in successfully!");
      handleClose(); // Close and reset on success
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      console.error("Email Login Error:", err);
      setError(message);
      toast.error(message);
      setIsLoading(false); // Keep modal open on error
    }
    // setIsLoading(false) // isLoading is reset in handleClose or kept true on error
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true); // Show loading state on the button maybe? Or whole modal?
    try {
      await signInWithGoogle();
      // Listener will handle success, maybe close modal optimistically?
      // handleClose(); // Let listener handle state changes
    } catch (error) {
      toast.error("Google Sign-in failed.");
      setIsLoading(false);
    }
  };

  // Reset state and close modal
  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    setShowEmailForm(false); // Hide email form on close
    setIsLoading(false);
    onOpenChange(false);
  };

  // Handle modal open/close change from Dialog primitive
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose(); // Ensure state is reset when closed via overlay click or escape key
    } else {
      onOpenChange(true); // Propagate open state upwards if needed
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0"> {/* Remove default padding */}
        <DialogHeader className="p-6 pb-4"> {/* Add padding back here */}
          <DialogTitle className="text-2xl font-bold text-center">Log in to FanTok</DialogTitle>
          {/* No description needed */}
         </DialogHeader>

        <div className="p-6 pt-0 space-y-4"> {/* Increased spacing */}
          {/* Login Options */}
          {/* Removed QR Code Button */}
          <Button variant="outline" className="w-full justify-start gap-3 text-base py-4" onClick={() => setShowEmailForm(true)}> {/* Reverted variant to outline */}
            <FaUser className="w-5 h-5" /> Log in with Email / Username
          </Button>
          {/* Removed Facebook Button */}
          <Button variant="outline" className="w-full justify-start gap-3 text-base py-4" onClick={handleGoogleLogin} disabled={isLoading}> {/* Reverted variant to outline */}
            {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin"/> : <FaGoogle className="w-5 h-5" />} Log in with Google
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 text-base py-4" disabled> {/* Reverted variant to outline */}
            <FaApple className="w-5 h-5" /> Log in with Apple
          </Button>

          {/* Email/Password Form (Conditional) */}
          {showEmailForm && (
            <form onSubmit={handleEmailLogin} className="space-y-4 p-4 mt-4 border-t bg-muted/30 rounded-md"> {/* Added padding, margin-top, background, border-radius */}
              <h3 className="font-semibold text-center">Log in with Email</h3>
              <div className="space-y-1">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="login-password">Password</Label>
                <Input id="login-password" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" disabled={isLoading || !email || !password} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Log in
               </Button>
               <Button type="button" variant="outline" size="sm" onClick={() => setShowEmailForm(false)} className="w-full text-muted-foreground"> {/* Changed variant to outline */}
                  Back to options
               </Button>
             </form>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 bg-muted/50 border-t text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms of Service</a> and confirm you have read our <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a>.
          </p>
          <div className="mt-4 text-center text-sm w-full">
             Don't have an account?{' '}
             {onSwitchToSignup ? (
                <Button variant="link" className="p-0 h-auto font-semibold text-primary" onClick={onSwitchToSignup}>
                   Sign up
                </Button>
             ) : (
                <span className="font-semibold text-primary">Sign up</span> // Fallback if no switch handler
             )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
