"use client";

import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { VerticalVideoPlayer } from './VerticalVideoPlayer';
import { Loader2 } from 'lucide-react';
import { AuthContext } from '@/context/AuthContext';

interface VideoPost {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  thumbnail_url?: string | null;
  likes_count: number;
  comments_count: number;
  is_private: boolean | null;
  is_for_sale: boolean;
  price?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  profiles: {
    username: string;
    profile_picture_url?: string | null;
  } | null;
  current_user_liked?: boolean;
}

export function ForYouPage() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeIndex, setActiveIndex] = useState(0);
  const { user: loggedInUser } = useContext(AuthContext);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
        .eq('type', 'video')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      let postsWithLikeStatus: VideoPost[] = [];

      if (data) {
        postsWithLikeStatus = data as VideoPost[];

        if (loggedInUser) {
          const postIds = data.map(post => post.id);
          const { data: likesData, error: likesError } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', loggedInUser.id)
            .in('post_id', postIds);

          if (likesError) {
            console.error("Error fetching likes:", likesError);
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

    } catch (err: unknown) {
      console.error("Error fetching videos:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load videos: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [loggedInUser]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    videoRefs.current.clear();
  }, [videos]);

  useEffect(() => {
    const observerOptions = {
      root: containerRef.current,
      rootMargin: '0px',
      threshold: 0.6,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const targetElement = entry.target as HTMLDivElement;
          const videoId = Array.from(videoRefs.current.entries()).find(([id, ref]) => ref === targetElement)?.[0];
          const index = videos.findIndex(v => v.id === videoId);

          if (index !== -1) {
            setActiveIndex(index);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    const refsToObserve = Array.from(videoRefs.current.values());
    refsToObserve.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
      refsToObserve.forEach(ref => {
        if (ref) observer.unobserve(ref);
      });
      observer.disconnect();
    };
  }, [videos, loading]);

  // Force body to have no padding/margin that could affect layout
  useEffect(() => {
    // Save original styling
    const originalBodyStyle = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      overflow: document.body.style.overflow
    };
    
    // Apply clean styling to body
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    
    // Restore original styling on unmount
    return () => {
      document.body.style.margin = originalBodyStyle.margin;
      document.body.style.padding = originalBodyStyle.padding;
      document.body.style.overflow = originalBodyStyle.overflow;
    };
  }, []);

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
    <>
      {/* Main content area */}
      <div 
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0, 
          bottom: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'black',
          zIndex: 10,
          overflow: 'hidden'
        }}
      >
        {videos.length === 0 ? (
          <div className="flex items-center justify-center h-full w-full text-gray-500">
            No videos found.
          </div>
        ) : (
          <div 
            className="w-full h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar" 
            style={{ overscrollBehavior: 'none' }}
          >
            {videos.map((video, index) => (
              <div
                key={video.id || index}
                ref={el => {
                  if (el) videoRefs.current.set(video.id, el);
                  else videoRefs.current.delete(video.id);
                }}
                className="w-full h-screen snap-start snap-always"
                style={{ 
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0, // Start from the actual left edge
                    width: '100%', // Take full width
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center', // Center the player within the full width
                    overflow: 'hidden',
                    background: 'black'
                  }}
                >
                  <VerticalVideoPlayer
                    id={video.id}
                    isActive={index === activeIndex}
                    username={video.profiles?.username ?? 'unknown'}
                    profilePictureUrl={video.profiles?.profile_picture_url ?? undefined}
                    caption={video.caption}
                    videoSrc={video.video_url}
                    posterSrc={video.thumbnail_url ?? undefined}
                    likes={String(video.likes_count ?? 0)}
                    comments={String(video.comments_count ?? 0)}
                    shares={"0"}
                    initialIsLiked={video.current_user_liked}
                    isPrivate={video.is_private ?? undefined}
                    isOwner={loggedInUser?.id === video.user_id}
                    userId={video.user_id}
                    is_for_sale={video.is_for_sale}
                    price={video.price}
                    currency={video.currency}
                    stripe_price_id={video.stripe_price_id}
                    isLocked={(video.is_private ?? false) && loggedInUser?.id !== video.user_id}
                    showControls={true}
                    isForYouPage={true}
                    interactionVariant="compact"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
