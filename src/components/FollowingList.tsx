"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient'; // Assuming supabase client is exported from here
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Using Shadcn Avatar

// Define the type for a followed user profile (subset of Profiles table)
type FollowedProfile = {
  id: string;
  username: string | null;
  profile_picture_url: string | null;
};

export function FollowingList() {
  const { user } = useAuth();
  const [followingProfiles, setFollowingProfiles] = useState<FollowedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!user) {
        setLoading(false);
        setFollowingProfiles([]); // Clear profiles if user logs out
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch relationships where the current user is the follower
        // Join with profiles table to get followed user details
        const { data, error: fetchError } = await supabase
          .from('relationships')
          // Hint the join using the correct foreign key name
          .select(`
            followed_uid,
            profiles:profiles!relationships_followed_uid_fkey (
              id,
              username,
              profile_picture_url
            )
          `)
          .eq('follower_uid', user.id);

        if (fetchError) {
          throw fetchError;
        }

        // Type assertion for the expected data structure after hinting
        const typedData = data as {
          followed_uid: string;
          profiles: FollowedProfile | null; // profiles should now match FollowedProfile or be null
        }[] | null;


        // Extract profile data safely
        const profiles: FollowedProfile[] = typedData
          ? typedData
              .map(rel => rel.profiles) // Extract the profiles object
              .filter((profile): profile is FollowedProfile => // Filter out nulls and ensure type
                profile !== null &&
                typeof profile === 'object' &&
                'id' in profile &&
                'username' in profile && // Check for username existence
                'profile_picture_url' in profile // Check for profile picture URL existence
              )
          : []; // Handle case where data is null

        setFollowingProfiles(profiles);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error fetching following list:", err);
        setError("Failed to load following list.");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [user]); // Re-run effect when user changes

  if (!user) {
    // Optionally show a login prompt or nothing
    return null; // Don't show the section if not logged in
  }

  if (loading) {
    return <div className="px-4 py-2 text-sm text-muted-foreground">Loading following...</div>;
  }

  if (error) {
    return <div className="px-4 py-2 text-sm text-destructive">{error}</div>;
  }

  if (followingProfiles.length === 0) {
    return <div className="px-4 py-2 text-sm text-muted-foreground">Not following anyone yet.</div>;
  }

  return (
    <div className="space-y-2">
      {followingProfiles.map((profile) => (
        <Link
          key={profile.id}
          href={`/profile/${profile.username || profile.id}`} // Link to username profile if available
          className="flex items-center gap-3 px-4 py-2 rounded-md transition-colors w-full text-foreground/80 hover:text-foreground hover:bg-secondary/50"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile.profile_picture_url ?? undefined} alt={profile.username ?? 'User'} />
            <AvatarFallback>{profile.username?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">{profile.username ?? 'Unnamed User'}</span>
        </Link>
      ))}
    </div>
  );
}
