"use client";

import Link from 'next/link';
// Removed Input import
import { Button } from "@/components/ui/button";
import React, { useState } from 'react'; // Import useState
import { FaEllipsisV, FaGoogle } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { SignupFlow } from './auth/SignupFlow'; // Import the signup flow component
import { LoginModal } from './auth/LoginModal'; // Import the login modal component

export function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const [isSignupOpen, setIsSignupOpen] = useState(false); // State for signup modal
  const [isLoginOpen, setIsLoginOpen] = useState(false);   // State for login modal

  // Auth handlers remain the same
  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    // Header is simpler now, just contains actions/auth
    <header className="fixed top-0 right-0 left-[240px] h-16 flex items-center justify-end px-6 bg-background/95 backdrop-blur-sm z-10"> {/* Changed justify-between to justify-end */}

      {/* Removed Search Input Area */}

      {/* Right side elements (Upload, Auth) */}
      <div className="flex items-center gap-3">
        <Link href="/upload">
          <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 font-semibold">
            Upload
          </Button>
        </Link>

        {loading ? (
          <Button disabled>Loading...</Button>
        ) : user ? (
          <>
             {/* Ensure profile link uses userId */}
             <Link href={`/profile/${user.id}`} passHref>
                <Avatar className="h-8 w-8 cursor-pointer">
                  <AvatarImage
                    src={user.user_metadata?.avatar_url || undefined}
                    alt={user.user_metadata?.full_name || user.email || 'User'}
                  />
                  <AvatarFallback>
                    {user.user_metadata?.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
             </Link>
            <Button onClick={handleSignOut} variant="outline">
              Log out
            </Button>
          </>
        ) : (
          <>
            {/* Login Button (Opens Modal) */}
            <Button variant="outline" onClick={() => setIsLoginOpen(true)}>
              Log in
            </Button>
            {/* Signup button removed, signup is accessed via Login modal */}
            {/* Optional: Keep Google Sign-in as a separate button or move into modals */}
            {/* <Button onClick={handleSignIn} variant="outline" size="icon" aria-label="Log in with Google">
              <FaGoogle />
            </Button> */}
          </>
        )}

        <Button variant="ghost" size="icon">
          <FaEllipsisV />
        </Button>
      </div>

      {/* Render Modals */}
      <SignupFlow
        isOpen={isSignupOpen}
        onOpenChange={setIsSignupOpen}
        // onSwitchToLogin={() => { setIsSignupOpen(false); setIsLoginOpen(true); }} // Add switch handler
      />
      <LoginModal
        isOpen={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        onSwitchToSignup={() => { setIsLoginOpen(false); setIsSignupOpen(true); }} // Add switch handler
      />
    </header>
  );
}
