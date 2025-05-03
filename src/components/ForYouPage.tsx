"use client";

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
// Import the standard VerticalVideoPlayer
import { VerticalVideoPlayer } from './VerticalVideoPlayer';
import { Loader2 } from 'lucide-react';
import { AuthContext } from '@/context/AuthContext';

// Define the structure of a video post based on your database schema
interface VideoPost {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  thumbnail_url?: string | null; // Optional poster image
  likes_count: number; // Re-added based on schema
  comments_count: number; // Re-added based on schema
  // shares_count does not exist
  is_private: boolean | null;
  is_for_sale: boolean;
  price?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  // Need user details too - assuming a join or separate fetch
  profiles: {
    username: string;
    profile_picture_url?: string | null; // Corrected column name
    // is_verified does not exist
  } | null;
  // Need like status for the logged-in user
  current_user_liked?: boolean; // You'll need to fetch this based on logged-in user
}


export function ForYouPage() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLDivElement>>(new Map()); // Use a Map for refs keyed by video ID
  const [activeIndex, setActiveIndex] = useState(0); // Index of the currently playing video
  const { user: loggedInUser } = useContext(AuthContext); // Get logged-in user

  // Basic fetch function - replace with your actual FYP logic
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Example fetch: Get public, non-private videos, ordered by creation date
      // You'll need to implement your actual FYP algorithm/query here
      // This likely involves joining with profiles and potentially checking like status
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          video_url,
          caption,
          created_at,
          thumbnail_url,
          likes_count,
          comments_count,
          is_private,
          is_for_sale,
          price,
          currency,
          stripe_price_id,
          profiles ( username, profile_picture_url )
        `)
        .eq('type', 'video') // Corrected column name from post_type to type
        .eq('is_private', false) // Example: only public videos
        .order('created_at', { ascending: false })
        .limit(10); // Example limit

      if (fetchError) throw fetchError;

      let postsWithLikeStatus: VideoPost[] = [];

      // Handle potential null data more gracefully
      if (data) {
        postsWithLikeStatus = data as VideoPost[]; // Initial data

        // Fetch like status for the current user if logged in
        if (loggedInUser) {
          const postIds = data.map(post => post.id);
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', loggedInUser.id)
            .in('post_id', postIds);

          if (likesError) {
            console.error("Error fetching likes:", likesError);
            // Proceed without like status if fetch fails
          } else if (likesData) {
            const likedPostIds = new Set(likesData.map(like => like.post_id));
            postsWithLikeStatus = postsWithLikeStatus.map(post => ({
              ...post,
              current_user_liked: likedPostIds.has(post.id),
            }));
          }
        }
        setVideos(postsWithLikeStatus);
      } else {
        setVideos([]);
      }

    } catch (err: unknown) { // Use unknown instead of any
      console.error("Error fetching videos:", err);
      // Type check the error before accessing properties
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load videos: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Effect to initialize/clear refs when videos change
  useEffect(() => {
    videoRefs.current.clear();
    // Optional: Pre-populate map keys if needed, though setting in render is usually fine
  }, [videos]);

  // Intersection Observer for active video detection
  useEffect(() => {
    const observerOptions = {
      root: containerRef.current, // Observe within the scrolling container
      rootMargin: '0px',
      threshold: 0.6, // Trigger when 60% of the video is visible
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Find the index corresponding to the target element's video ID
          const targetElement = entry.target as HTMLDivElement;
          const videoId = Array.from(videoRefs.current.entries()).find(([id, ref]) => ref === targetElement)?.[0];
          const index = videos.findIndex(v => v.id === videoId);

          if (index !== -1) {
            // console.log(`Video ${index} (${videoId}) is active`);
            setActiveIndex(index);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all video refs stored in the map
    const refsToObserve = Array.from(videoRefs.current.values());
    refsToObserve.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    // Cleanup
    return () => {
      refsToObserve.forEach(ref => {
        if (ref) observer.unobserve(ref);
      });
      observer.disconnect();
    };
  }, [videos, loading]); // Re-run when videos load or change

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-12 w-12 animate-spin text-pink-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-full text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    // Ensure container uses h-full to inherit height correctly
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-black hide-scrollbar"
    >
      {videos.length === 0 && !loading && (
        // Ensure empty state uses h-full
        <div className="flex items-center justify-center h-full w-full text-gray-500">
          No videos found.
        </div>
      )}
      {videos.map((video, index) => (
        // Assign ref to each video container using the Map
        <div
          key={video.id || index}
          ref={el => {
            if (el) videoRefs.current.set(video.id, el);
            else videoRefs.current.delete(video.id);
          }}
          // Ensure snap items use h-full
          className="w-full h-full snap-start flex justify-center relative bg-black"
        >
          <VerticalVideoPlayer // Use the standard player
            id={video.id}
            isActive={index === activeIndex} // Pass isActive prop
            username={video.profiles?.username ?? 'unknown'}
            // verified prop doesn't exist on player or schema
            profilePictureUrl={video.profiles?.profile_picture_url ?? undefined} // Correct prop and null check
            caption={video.caption}
            videoSrc={video.video_url}
            posterSrc={video.thumbnail_url ?? undefined} // Fix null assignment
            // Pass actual counts as strings
            likes={String(video.likes_count ?? 0)}
            comments={String(video.comments_count ?? 0)}
            shares={"0"} // shares_count doesn't exist
            initialIsLiked={video.current_user_liked} // Pass fetched like status
            isPrivate={video.is_private ?? undefined} // Fix null assignment issue
            isOwner={loggedInUser?.id === video.user_id} // Implement isOwner check
            userId={video.user_id}
            is_for_sale={video.is_for_sale}
            price={video.price}
            currency={video.currency}
            stripe_price_id={video.stripe_price_id}
            // TODO: Implement actual lock status check (e.g., check subscriptions/purchases table for loggedInUser)
            isLocked={(video.is_private ?? false) && loggedInUser?.id !== video.user_id}
            showControls={true}
            isForYouPage={true} // Indicate it's for the FYP context
            interactionVariant="compact" // Pass the compact variant prop
          />
        </div>
      ))}
    </div>
  );
}
