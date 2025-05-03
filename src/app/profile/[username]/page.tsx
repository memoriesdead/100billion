"use client";

import React, { useState, useEffect, useContext, useCallback } from 'react'; // Import useCallback
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { AuthContext } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { Tables } from '@/lib/database.types';
import { MainLayout } from "@/components/MainLayout";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { VideoGrid } from '@/components/VideoGrid';
import ProfileHomeFeed from '@/components/ProfileHomeFeed'; // Import ProfileHomeFeed
// Removed UserListDisplay import
import { format } from 'date-fns';
import {
  Calendar, UserPlus, Mail, MoreHorizontal, UserCheck, Loader2,
  FileText // Removed Users, kept User for potential future use or consistency
} from "lucide-react";
import { toast } from 'react-hot-toast';

// Type definition based on actual schema
type ProfileData = Tables<'profiles'> | null;
// Removed UserListItem type

export default function UserProfilePage() {
  const router = useRouter();
  // Treat the 'username' param as 'userId' due to folder naming convention
  const { username: userIdParam } = useParams();
  const userId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam; // Ensure userId is a string
  const [profile, setProfile] = useState<ProfileData>(null);
  const { user: loggedInUser } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content'); // Default back to content
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowStatusLoading, setIsFollowStatusLoading] = useState(true);

  // Removed state for follower/following lists

  // Function to check follow status
  const checkFollowStatus = useCallback(async () => {
    if (!loggedInUser || !profile || loggedInUser.id === profile.id) {
      setIsFollowing(false);
      setIsFollowStatusLoading(false);
      return false;
    }
    setIsFollowStatusLoading(true);
    try {
      const { error, count } = await supabase
        .from('relationships')
        .select('*', { count: 'exact', head: true })
        .eq('follower_uid', loggedInUser.id)
        .eq('followed_uid', profile.id);
      if (error) throw error;
      const doesFollow = (count ?? 0) > 0;
      setIsFollowing(doesFollow);
      return doesFollow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error checking follow status:", err);
      toast.error("Could not verify follow status.");
      setIsFollowing(false);
      return false;
    } finally {
      setIsFollowStatusLoading(false);
    }
  }, [loggedInUser, profile]);

  // Fetch profile data using userId
  useEffect(() => {
    if (!userId || typeof userId !== 'string') {
      setError("Invalid user ID.");
      setIsLoading(false);
      return;
    }
    const loadProfileData = async () => {
      setIsLoading(true);
      setError(null);
      setProfile(null);
      try {
        // Fetch profile data using the user ID
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*') // Assuming counts are in profiles table
          .ilike('username', userId) // Use case-insensitive search
          .single();
        if (profileError) throw profileError;
        setProfile(profileData as ProfileData);
      } catch (err: unknown) {
        console.error("Error loading profile:", err); // Log the raw error first
        let errorMessage = "An unknown error occurred while loading the profile.";
        const code = typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : undefined;

        if (code === 'PGRST116') {
          errorMessage = `Profile not found for user ID: ${userId}`;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
          // Handle Supabase error objects or other objects with a message property
          errorMessage = err.message;
        }
        // Set a clear, user-friendly string state
        setError(`Failed to load profile: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfileData();
  }, [userId]); // Depend on userId

  // Fetch initial follow status
  useEffect(() => {
    if (profile && loggedInUser) {
      checkFollowStatus();
    } else {
      setIsFollowStatusLoading(false);
      setIsFollowing(false);
    }
  }, [loggedInUser, profile, checkFollowStatus]);

  // Removed fetchFollowList function

  // Simplified tab change handler
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // --- Follow/Unfollow Logic ---
  // Keep the logic to update relationship and optimistically update local profile count
  const handleFollowToggle = async () => {
    if (!loggedInUser || !profile || loggedInUser.id === profile.id) {
      toast.error("Cannot follow/unfollow.");
      return;
    }
    setIsFollowLoading(true);
    const currentFollowState = isFollowing;
    try {
      if (currentFollowState) {
        const { error } = await supabase
          .from('relationships')
          .delete()
          .match({ follower_uid: loggedInUser.id, followed_uid: profile.id });
        if (error) throw error;
        toast.success(`Unfollowed @${profile.username}`);
        setIsFollowing(false);
        // Optimistic UI update for count
        setProfile(prevProfile => prevProfile ? {
          ...prevProfile,
          followers_count: Math.max(0, (prevProfile.followers_count ?? 0) - 1)
        } : null);
      } else {
        const { error } = await supabase
          .from('relationships')
          .insert({ follower_uid: loggedInUser.id, followed_uid: profile.id });
        if (error) throw error;
        toast.success(`Followed @${profile.username}`);
        setIsFollowing(true);
        // Optimistic UI update for count
        setProfile(prevProfile => prevProfile ? {
          ...prevProfile,
          followers_count: (prevProfile.followers_count ?? 0) + 1
        } : null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error toggling follow (Full Error):", err);
      toast.error(`Failed to ${currentFollowState ? 'unfollow' : 'follow'}: ${message}`);
      setIsFollowing(currentFollowState); // Revert button state on error
      // Consider reverting count update on error too, or refetching profile
    } finally {
      setIsFollowLoading(false);
    }
  };

  // --- Message Logic (Unchanged) ---
  const handleMessage = () => {
    if (!loggedInUser || !profile || loggedInUser.id === profile.id) {
      toast.error("Cannot message this user.");
      return;
    }
    // Navigate to the messages page with the target user's ID as a query parameter
    router.push(`/messages?userId=${profile.id}`);
    // Optional: Update toast message or remove it
    // toast(`Opening conversation with @${profile.username}...`);
  };

  // --- Render Logic ---
  if (isLoading) {
    // ... loading state ... (unchanged)
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    // ... error state ... (unchanged)
     return (
      <MainLayout>
        <div className="container max-w-3xl mx-auto px-4 py-12">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    // ... profile not found state ... (unchanged)
     return (
       <MainLayout>
         <div className="container max-w-3xl mx-auto px-4 py-12">
           <Alert>
             <AlertTitle>Profile Not Found</AlertTitle>
             {/* Display ID in error if profile not found */}
             <AlertDescription>The profile for user ID {userId} could not be loaded.</AlertDescription>
           </Alert>
         </div>
       </MainLayout>
      );
   }

   // --- Profile Page Structure ---
   return (
    <MainLayout>
      {/* Hero banner */}
      <motion.div
        className="relative w-full h-48 md:h-64 overflow-hidden bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
      >
        {profile.banner_image_url && (
          <Image src={profile.banner_image_url} alt="Profile banner" className="object-cover object-center" fill priority quality={90} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      </motion.div>

      <div className="container max-w-3xl mx-auto px-4">
        {/* Profile header section */}
        <motion.div
          className="relative -mt-16 md:-mt-20 flex flex-col md:flex-row gap-6 md:gap-8 mb-8"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
             <Avatar className="h-32 w-32 md:h-36 md:w-36 border-4 border-background shadow-lg">
               <AvatarImage src={profile.profile_picture_url ?? undefined} alt={profile.username ?? 'User'} />
               <AvatarFallback className="text-3xl">{profile.name?.charAt(0)?.toUpperCase() ?? profile.username?.charAt(0)?.toUpperCase() ?? 'U'}</AvatarFallback>
            </Avatar>
          </div>
          {/* Info */}
          <div className="flex-1 space-y-3 pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{profile.name ?? 'User Name'}</h1>
                <h2 className="text-lg text-muted-foreground">@{profile.username ?? 'username'}</h2>
              </div>
              {/* Action Buttons */}
              {loggedInUser && profile && loggedInUser.id !== profile.id && (
                <div className="flex flex-wrap gap-2">
                  <Button variant={isFollowing ? "secondary" : "default"} onClick={handleFollowToggle} disabled={isFollowLoading || isFollowStatusLoading}>
                    {isFollowLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : isFollowing ? <UserCheck className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                    {isFollowLoading ? 'Processing...' : isFollowing ? 'Followed' : 'Follow'}
                  </Button>
                  <Button variant="outline" onClick={handleMessage}>
                    <Mail className="h-4 w-4 mr-2" /> Message
                  </Button>
                  <Button variant="ghost" size="icon"><MoreHorizontal className="h-5 w-5" /></Button>
                </div>
              )}
            </div>
            {/* Bio */}
            {profile.bio && <p className="max-w-3xl text-sm md:text-base mr-2">{profile.bio}</p>}
            {/* Metadata */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {profile.created_at && (
                <div className="flex items-center"><Calendar className="h-4 w-4 mr-1" /> Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</div>
              )}
            </div>
            {/* Stats */}
            <div className="flex gap-6 pt-2">
              <div className="flex flex-col">
                 <span className="font-bold">{profile.following_count?.toLocaleString() ?? '0'}</span>
                <span className="text-sm text-muted-foreground">Following</span>
              </div>
              <div className="flex flex-col">
                 <span className="font-bold">{profile.followers_count?.toLocaleString() ?? '0'}</span>
                <span className="text-sm text-muted-foreground">Followers</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main content area with Tabs - Moved INSIDE the container */}
        <div className="mb-16">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b">
              <TabsList className="justify-start h-12">
                <TabsTrigger value="content" className="flex items-center"><FileText className="h-4 w-4 mr-2" /> Content</TabsTrigger>
                <TabsTrigger value="home" className="flex items-center"><FileText className="h-4 w-4 mr-2" /> Home</TabsTrigger>
                {/* Removed Followers/Following Triggers */}
              </TabsList>
            </div>

            <TabsContent value="content">
              {/* Pass custom grid classes for profile page */}
              <VideoGrid
                userId={profile.id}
                allowDeletion={false}
                disableClickToPlay={true}
                hideProgressBar={true}
                gridColsClass="grid-cols-1 sm:grid-cols-2 md:grid-cols-3" // Fewer columns for profile
              />
            </TabsContent>
            <TabsContent value="home">
              {/* Render ProfileHomeFeed instead of the placeholder */}
              <ProfileHomeFeed />
            </TabsContent>
            {/* Removed Followers/Following Content */}
          </Tabs>
        </div>
      </div> {/* Closing the container div here */}
    </MainLayout>
  );
}
