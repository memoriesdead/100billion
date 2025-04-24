"use client";

import Link from 'next/link';
// Removed Input import
import { Button } from "@/components/ui/button";
import { FaEllipsisV, FaGoogle } from "react-icons/fa"; // Removed FaSearch
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation'; // Keep for potential future use? Or remove if unused.
import type React from 'react';

// Removed HeaderProps interface

export function Header() { // Removed props
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const router = useRouter();

  // Removed all search-related state and handlers

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
             <Link href={`/profile/${user.user_metadata?.username || user.id}`} passHref>
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
          <Button onClick={handleSignIn} className="tiktok-button px-4 py-2 flex items-center gap-2">
            {/* Wrap content in a span to prevent potential nesting issues */}
            <span><FaGoogle /> Log in</span>
          </Button>
        )}

        <Button variant="ghost" size="icon">
          <FaEllipsisV />
        </Button>
      </div>
    </header>
  );
}
