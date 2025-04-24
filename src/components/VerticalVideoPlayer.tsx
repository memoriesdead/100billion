"use client";

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Pause, Volume2, VolumeX, Lock, Loader2, ShoppingCart } from 'lucide-react';
import { PostInteractionButtons } from './PostInteractionButtons';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe outside the component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Define the props based on the data available
interface VerticalVideoPlayerProps {
  id: string;
  username: string;
  verified?: boolean;
  profilePictureUrl?: string;
  caption: string | null; // Allow null for caption
  videoSrc: string;
  posterSrc?: string;
  likes: string;
  comments: string;
  shares: string;
  isPrivate?: boolean | null;
  isOwner?: boolean;
  userId: string;
  is_for_sale: boolean;
  price?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  isLocked?: boolean; // Locked by subscription?
}

// Helper function to format price
const formatPrice = (priceInCents: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
};

export function VerticalVideoPlayer({
  id,
  username,
  verified,
  profilePictureUrl,
  caption,
  videoSrc,
  posterSrc,
  likes,
  comments,
  shares,
  isPrivate: initialIsPrivate,
  isOwner,
  userId,
  is_for_sale,
  price,
  currency,
  isLocked: isSubLocked,
}: VerticalVideoPlayerProps) {
  const { user: loggedInUser } = useContext(AuthContext);
  const router = useRouter(); // Get router instance

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuying, setIsBuying] = useState(false);

  // Determine lock status
  const isContentLocked = (is_for_sale && !isOwner) || (isSubLocked && !isOwner);
  const isLockedForPurchase = is_for_sale && !isOwner;

  // Fetch video blob only if content is not locked
  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl: string | null = null;
    const fetchVideoAsBlob = async () => {
      if (isContentLocked || !videoSrc) {
        setIsLoading(false); return;
      }
      setIsLoading(true); setErrorState(null); setObjectUrl(null);
      try {
        const urlParts = videoSrc.split('/public/');
        if (urlParts.length < 2) throw new Error("Invalid video URL format");
        const bucketAndPath = urlParts[1];
        const firstSlashIndex = bucketAndPath.indexOf('/');
        if (firstSlashIndex === -1) throw new Error("Invalid bucket/path format");
        const bucketName = bucketAndPath.substring(0, firstSlashIndex);
        const filePath = bucketAndPath.substring(firstSlashIndex + 1);
        const { data: blob, error: downloadError } = await supabase.storage.from(bucketName).download(filePath);
        if (downloadError) throw downloadError;
        if (!blob) throw new Error("Downloaded data is null");
        currentObjectUrl = URL.createObjectURL(blob);
        if (isMounted) setObjectUrl(currentObjectUrl);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (isMounted) setErrorState(`Failed to load video: ${message}`);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchVideoAsBlob();
    return () => { isMounted = false; if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); };
  }, [id, videoSrc, isContentLocked]);

  // Intersection Observer for autoplay
  useEffect(() => {
    const videoElement = videoRef.current;
    if (isContentLocked || !videoElement || !objectUrl) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) videoElement.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      else if (!videoElement.paused) { videoElement.pause(); setIsPlaying(false); }
    }, { threshold: 0.5 });
    observer.observe(videoElement);
    return () => observer.disconnect();
  }, [objectUrl, id, isContentLocked]);

  // Control Handlers (prevented if locked)
  const togglePlayPause = useCallback(() => {
    console.log("Video area clicked"); // Log video area click
    if (isContentLocked) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) video.play().catch(e => console.error("Play error:", e));
    else video.pause();
  }, [isContentLocked]);

  const toggleMute = useCallback(() => {
    if (isContentLocked) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, [isContentLocked]);

  const handleTimeUpdate = useCallback(() => {
    if (isContentLocked) return;
    const video = videoRef.current;
    if (!video || !duration) return;
    const currentProgress = (video.currentTime / duration) * 100;
    setProgress(currentProgress);
  }, [duration, isContentLocked]);

  const handleLoadedMetadata = useCallback(() => {
    if (isContentLocked) return;
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  }, [isContentLocked]);

  // Purchase Handler
  const handlePurchase = useCallback(async () => {
    if (!loggedInUser) { toast.error("Please log in to purchase."); return; }
    if (!id || !is_for_sale || !price || price <= 0) { toast.error("Item not purchasable."); return; }
    setIsBuying(true);
    try {
      const response = await fetch('/api/stripe/create-item-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: id }),
      });
      const sessionData = await response.json();
      if (!response.ok) throw new Error(sessionData.error || 'Failed to create session');
      if (!sessionData.sessionId) throw new Error('Session ID missing');
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe.js failed');
      const { error } = await stripe.redirectToCheckout({ sessionId: sessionData.sessionId });
      if (error) throw new Error(error.message);
    } catch (error) {
      toast.error(`Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsBuying(false);
    }
  }, [loggedInUser, id, is_for_sale, price]);

  // Handler for clicking the profile avatar in PostInteractionButtons
  const handleProfileClick = () => {
    router.push('/profile'); // Navigate to the main profile page
  };

  // Handler for clicking the profile avatar on the post
  // Reverted back to standard Link, removed explicit handler
  // const handleAvatarClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  //   e.stopPropagation(); // Prevent triggering video play/pause
   //   router.push(`/profile/${username}`);
   // };
 
   return (
     <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group">
       {/* Conditional Rendering */}
      {isContentLocked ? (
        // --- Locked State ---
        <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white relative p-4">
          {/* Centered Lock Info */}
          <div className="flex flex-col items-center justify-center text-center z-10">
            <Lock size={48} className="mb-3 opacity-80" />
            <span className="text-lg font-semibold mb-1">
              {isLockedForPurchase ? 'Purchase to View' : 'Subscribe to View'}
            </span>
            {/* Restore Price Badge */}
            {isLockedForPurchase && price && (
              <Badge variant="secondary" className="text-sm font-bold cursor-default mb-4">
                {formatPrice(price, currency ?? undefined)} {/* Fix: Handle null currency */}
              </Badge>
            )}
          </div>
          {/* Restore Buy Button */}
          {isLockedForPurchase && (
            <Button
              variant="default"
              size="sm"
              className="mt-4 h-9 px-5 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-full absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20"
              onClick={handlePurchase}
              disabled={isBuying || !loggedInUser}
              aria-label={`Buy for ${formatPrice(price ?? 0, currency ?? undefined)}`}
            >
              {isBuying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              {isBuying ? 'Processing...' : 'Buy'}
            </Button>
          )}
        </div>
      ) : (
        // --- Unlocked State ---
        <>
          {/* Video Player */}
          {isLoading && <div className="text-white absolute z-10">Loading...</div>}
          {errorState && <div className="text-red-500 absolute z-10 p-4 text-center">{errorState}</div>}
          <video
            ref={videoRef}
            key={objectUrl} // Use objectUrl as key to force re-render when it changes
            src={objectUrl ?? undefined}
            poster={posterSrc}
            className={`w-full h-full object-contain ${!objectUrl || isLoading || errorState ? 'invisible' : ''}`}
            playsInline loop muted={isMuted}
            onClick={togglePlayPause}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onError={(e) => console.error(`Video Error (ID: ${id}):`, (e.target as HTMLVideoElement).error)}
          />
          {/* Center Play/Pause Button */}
          {!isPlaying && objectUrl && !isLoading && !errorState && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
              <button onClick={togglePlayPause} className="p-4 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors" aria-label="Play">
                <Play size={60} fill="currentColor" />
              </button>
            </div>
          )}
          {/* Mute/Unmute Button */}
          {objectUrl && !isLoading && !errorState && (
            <button onClick={toggleMute} className="absolute bottom-4 right-4 p-2 bg-black/40 rounded-full text-white z-20 pointer-events-auto" aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          )}
          {/* Info Overlay & Interaction Buttons Container */}
          <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-gradient-to-t from-black/60 via-black/30 to-transparent">
            <div className="p-4 flex justify-between items-end pointer-events-auto"> {/* Changed back to justify-between */}
              {/* Left Side: Profile Info */}
              <div className="text-white max-w-[calc(100%-80px)]"> {/* Limit width */}
                 <div // Changed Link to div
                   className="flex items-center gap-1.5 group cursor-pointer" // Added cursor-pointer
                   onClick={(e) => {
                     console.log("Bottom-left profile clicked, navigating to OWN profile"); // Updated log
                     e.preventDefault(); // Add preventDefault for extra safety
                     e.stopPropagation(); // Prevent click bubbling
                     router.push('/profile'); // Navigate to the logged-in user's profile page
                   }}
                   aria-label={`View profile of ${username}`} // Keep label as post author for clarity
                   role="button" // Accessibility
                   tabIndex={0}  // Accessibility
                   onKeyDown={(e) => { // Accessibility
                     if (e.key === 'Enter' || e.key === ' ') {
                       e.preventDefault();
                       router.push('/profile'); // Navigate to own profile on key press
                     }
                   }}
                 >
                   <Avatar className="h-7 w-7 border border-gray-600 group-hover:scale-110 transition-transform">
                     <AvatarImage src={profilePictureUrl ?? undefined} alt={username ?? 'User profile'} />
                     <AvatarFallback>{username?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
                   </Avatar>
                   <span className="font-bold text-sm hover:underline">
                     @{username}
                   </span>
                 </div>
                 {/* Add For Sale Badge Here */}
                 {is_for_sale && !isContentLocked && price && (
                   <Badge variant="secondary" className="mt-1 text-xs font-semibold cursor-default bg-green-600 hover:bg-green-700 text-white">
                     For Sale: {formatPrice(price, currency ?? undefined)} {/* Fix: Handle null currency */}
                   </Badge>
                 )}
               {/* Optionally re-add caption link here if needed */}
               {/* {caption && (
                 <Link href={`/video/${id}`} className="text-xs hover:underline block mt-1" onClick={(e) => e.stopPropagation()}>
                   {caption}
                 </Link>
               )} */}
              </div>

               {/* Right Side: Interaction Buttons - Rendered directly */}
               <PostInteractionButtons
                 postId={id}
                 userId={userId}
                   username={username}
                   profilePictureUrl={profilePictureUrl ?? undefined} // Ensure undefined if null
                   initialLikes={parseInt(likes, 10) || 0}
                   initialIsLiked={false} // TODO: Fetch initial like status
                   // onProfileClick prop removed
                  commentsCount={comments}
                   sharesCount={shares}
                   initialIsPrivate={initialIsPrivate ?? false}
                   postType="video"
                   isOwner={isOwner ?? false}
                   videoCaption={caption ?? undefined} // Ensure undefined if null
                   is_for_sale={is_for_sale}
                   price={price}
                   currency={currency}
              />
              {/* Removed the wrapper div */}
            </div> {/* Close p-4 Div */}
          </div> {/* Close Info Overlay Div */}
        </>
      )}
    </div> // Close Root Div
  );
}
