"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client from the new file

interface AuthContextType {
  user: User | null;
  session: Session | null; // Add session state
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Export the context itself
export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  // Provide dummy implementations for context default value
  signInWithGoogle: async () => { console.warn("signInWithGoogle called before AuthProvider initialized"); },
  signUpWithEmail: async () => { console.warn("signUpWithEmail called before AuthProvider initialized"); },
  signInWithEmail: async () => { console.warn("signInWithEmail called before AuthProvider initialized"); },
  sendPasswordReset: async () => { console.warn("sendPasswordReset called before AuthProvider initialized"); },
  signOut: async () => { console.warn("signOut called before AuthProvider initialized"); },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check initial session state
    const fetchSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error("Error fetching initial Supabase session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    // 2. Listen for Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        console.log("Supabase auth state changed:", _event, currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        // No need to manually set loading false here unless fetchSession hasn't finished
        // setLoading(false); // Might cause flicker if fetchSession is slow
      }
    );

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // --- Authentication Functions (Supabase) ---

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        // options: { redirectTo: window.location.origin } // Optional: Redirect URL after login
      });
      if (error) throw error;
      // Auth state listener will handle setting user/session and loading state
    } catch (error) {
      console.error("Error signing in with Google (Supabase):", error);
      setLoading(false); // Ensure loading is false on error
      // Handle error (e.g., show notification to user)
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // options: { emailRedirectTo: window.location.origin } // Optional: For email verification link
      });
      if (error) throw error;
      // Inform user to check email for verification if enabled
      if (data.user && !data.user.email_confirmed_at) {
         console.log("Sign up successful. Please check your email for verification.");
         // Add UI feedback here
      }
      // Auth state listener handles user/session update
    } catch (error) {
      console.error("Error signing up (Supabase):", error);
      setLoading(false);
      // Handle specific errors and inform user
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Auth state listener handles user/session update
    } catch (error) {
      console.error("Error signing in (Supabase):", error);
      setLoading(false);
       // Handle specific errors and inform user
    }
  };

  const sendPasswordReset = async (email: string) => {
     try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // redirectTo: `${window.location.origin}/update-password`, // URL for password update form
      });
      if (error) throw error;
      console.log("Password reset email sent (Supabase).");
      // Inform user via UI that the email was sent
    } catch (error) {
      console.error("Error sending password reset email (Supabase):", error);
      // Handle error and inform user
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Auth state listener will handle setting user/session to null
      console.log("Supabase sign out successful.");
    } catch (error) {
      console.error("Error signing out from Supabase:", error);
      // Handle error if needed
    }
  };

  const value = {
    user,
    session, // Expose session
    loading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    sendPasswordReset,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Render children only when initial loading is complete */}
      {!loading ? children : <div>Loading Authentication...</div> /* Or a proper spinner */}
    </AuthContext.Provider>
  );
};

// Update useAuth hook if needed (no change needed here)
export const useAuth = () => useContext(AuthContext);
