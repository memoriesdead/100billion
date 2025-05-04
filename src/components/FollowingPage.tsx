'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { VideoGrid } from './VideoGrid'; // Import VideoGrid
import { MainLayout } from './MainLayout';
// Removed LegalFooter import

const FollowingPage = () => {
  const { user } = useAuth();
  const [followingUserIds, setFollowingUserIds] = useState<string[] | null>(null); // Store only IDs, null initially
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetching Logic - Only fetch followed user IDs
  useEffect(() => {
    const fetchFollowingIds = async () => {
      if (!user?.id) {
        setLoading(false);
        setFollowingUserIds([]); // Set to empty array if not logged in
        return;
      }

      setLoading(true);
      setError(null);
      setFollowingUserIds(null); // Reset while fetching

      try {
        // 1. Get the list of users the current user (user.id) is following
        const { data: followingData, error: followingError } = await supabase
          .from('relationships')
          .select('followed_uid')
          .eq('follower_uid', user.id);

        if (followingError) throw followingError;

        const ids = followingData?.map(rel => rel.followed_uid) || [];
        setFollowingUserIds(ids);

        if (ids.length === 0) {
          console.log('User is not following anyone.');
        }

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Error fetching following user IDs:', err);
        setError(`Failed to load following list: ${message}.`);
        setFollowingUserIds([]); // Set to empty on error to avoid infinite loading
      } finally {
        setLoading(false);
      }
    };

    fetchFollowingIds();
  }, [user]); // Dependency only on user

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Following</h1>
        {loading && <p>Loading following list...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* Render VideoGrid only after IDs are fetched (or determined to be empty) */}
        {!loading && followingUserIds !== null && (
          followingUserIds.length === 0 ? (
            <p>No posts found from the users you follow, or you are not following anyone yet.</p>
          ) : (
            // Pass the fetched IDs to VideoGrid
            <VideoGrid followedUserIds={followingUserIds} />
          )
        )}
      </div>
      {/* Removed LegalFooter component */}
    </MainLayout>
  );
};

export default FollowingPage;
