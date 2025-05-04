"use client";

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
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
  caption: string | null;
  videoSrc: string;
  posterSrc?: string;
  likes: string;
  comments: string;
  shares: string;
  initialIsLiked?: boolean;
  isPrivate?: boolean | null;
  isOwner?: boolean;
  userId: string;
  is_for_sale: boolean;
  price?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  isLocked?: boolean;
  showControls?: boolean; // Add new prop
  isForYouPage?: boolean; // Add prop to indicate if on For You page
  isActive?: boolean; // Add prop to control playback externally (e.g., from FYP)
  disableClickToPlay?: boolean;
  hideProgressBar?: boolean;
  interactionVariant?: 'default' | 'compact'; // Add prop for interaction variant
}

// Helper function to format price
const formatPrice = (priceInCents: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
   }).format(priceInCents / 100);
 };

 // Helper function to format time (e.g., 0:05, 1:23)
 const formatTime = (timeInSeconds: number): string => {
   if (isNaN(timeInSeconds) || timeInSeconds < 0) {
    return "0:00"; // Return default or error state
  }
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
  initialIsLiked = false,
  showControls = true, // Destructure showControls, default to true
  isForYouPage = false, // Destructure isForYouPage, default to false
  isActive, // Destructure isActive prop
  disableClickToPlay = false,
  hideProgressBar = false,
  interactionVariant = 'default', // Destructure new prop, default to 'default'
}: VerticalVideoPlayerProps) {
  const { user: loggedInUser } = useContext(AuthContext);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarContainerRef = useRef<HTMLDivElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuying, setIsBuying] = useState(false);
  const [accumulatedWatchTimeMs, setAccumulatedWatchTimeMs] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
   const watchIntervalRef = useRef<NodeJS.Timeout | null>(null);
   const reportedWatchTimeRef = useRef(false);
   const [isHovering, setIsHovering] = useState(false); // State for hover
   const [hoverTime, setHoverTime] = useState(0); // State for time preview on hover
   const [isScrubbing, setIsScrubbing] = useState(false); // State for scrubbing
   const [currentTimeFormatted, setCurrentTimeFormatted] = useState("0:00"); // State for current time display
   const [showOverlayOnEnd, setShowOverlayOnEnd] = useState(false); // State to show overlay on video end
   const [videoBounds, setVideoBounds] = useState({ top: 0, left: 0, width: 0, height: 0 }); // State for calculated video bounds

   // Determine lock status
   const isContentLocked = (is_for_sale && !isOwner) || (isSubLocked && !isOwner);
  const isLockedForPurchase = is_for_sale && !isOwner;

  // Refs to hold latest state values for cleanup function
  const durationRef = useRef(duration);
  const accumulatedWatchTimeMsRef = useRef(accumulatedWatchTimeMs);
  const isContentLockedRef = useRef(isContentLocked);

  // Keep refs updated
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { accumulatedWatchTimeMsRef.current = accumulatedWatchTimeMs; }, [accumulatedWatchTimeMs]);
  useEffect(() => { isContentLockedRef.current = isContentLocked; }, [isContentLocked]);


  // Fetch video blob only if content is not locked
  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl: string | null = null;
    const fetchVideoAsBlob = async () => {
      if (isContentLockedRef.current || !videoSrc) { // Use ref
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
  }, [id, videoSrc]); // Removed isContentLocked dependency, rely on ref

  // Control Handlers
  const togglePlayPause = useCallback(() => {
    if (isContentLockedRef.current) return; // Use ref
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) video.play().catch(e => console.error("Play error:", e));
    else video.pause();
  }, []); // No dependencies needed as it uses refs

  const toggleMute = useCallback(() => {
    if (isContentLockedRef.current) return; // Use ref
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []); // No dependencies needed as it uses refs

  const handleTimeUpdate = useCallback(() => {
    // Don't update progress if scrubbing or locked
    if (isScrubbing || isContentLockedRef.current) return;
    const video = videoRef.current;
    const progressBarContainer = progressBarContainerRef.current;
    // Use durationRef here
    if (!video || !durationRef.current || !progressBarContainer) return;
    const currentTime = video.currentTime;
    const currentProgress = (currentTime / durationRef.current) * 100;
    setProgress(currentProgress);
    setCurrentTimeFormatted(formatTime(currentTime)); // Update formatted time state
    // Flash effect logic (optional, kept for consistency)
    if (currentTime < 0.1 && durationRef.current > 0 && !video.seeking) {
      if (progressBarContainer && !progressBarContainer.classList.contains('flash-effect')) { // Added null check
        progressBarContainer.classList.add('flash-effect');
        setTimeout(() => {
          // Check again if the element exists before removing class
          if (progressBarContainerRef.current) {
             progressBarContainerRef.current.classList.remove('flash-effect');
          }
        }, 200);
      }
    }
  }, [isScrubbing]); // Add isScrubbing dependency

  // Function to calculate the rendered video bounds
  const calculateVideoBounds = useCallback(() => {
    const video = videoRef.current;
    // Use the parent of the video element as the container for bounds calculation
    const container = video?.parentElement;

    if (video && container && video.videoWidth > 0 && video.videoHeight > 0) {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const videoRatio = video.videoWidth / video.videoHeight;
      const containerRatio = containerWidth / containerHeight;

      let renderedWidth = containerWidth;
      let renderedHeight = containerHeight;
      let top = 0;
      let left = 0;

      if (videoRatio > containerRatio) {
        // Video is wider than container (letterboxed top/bottom)
        renderedHeight = containerWidth / videoRatio;
        top = (containerHeight - renderedHeight) / 2;
      } else {
        // Video is taller than container (pillarboxed left/right)
        renderedWidth = containerHeight * videoRatio;
        left = (containerWidth - renderedWidth) / 2;
      }

      setVideoBounds({
        top: Math.round(top), // Round to nearest pixel
        left: Math.round(left),
        width: Math.round(renderedWidth),
        height: Math.round(renderedHeight),
      });
    } else {
      // Reset or set default if video/container not ready
      setVideoBounds({ top: 0, left: 0, width: container?.offsetWidth ?? 0, height: container?.offsetHeight ?? 0 });
    }
  }, []); // Dependencies: videoRef (implicitly via videoRef.current)

  // Recalculate bounds when video metadata is loaded
  const handleLoadedMetadata = useCallback(() => {
    if (isContentLockedRef.current) return; // Use ref
    const video = videoRef.current;
    if (!video) return;
     setDuration(video.duration); // Update state, which updates durationRef via its effect
     setCurrentTimeFormatted(formatTime(0)); // Reset time display on new video load
     calculateVideoBounds(); // Calculate bounds now that dimensions are known
   }, [calculateVideoBounds]); // Added calculateVideoBounds dependency

  // Recalculate bounds on container resize
  useEffect(() => {
    const container = videoRef.current?.parentElement; // Get container
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateVideoBounds();
    });

    resizeObserver.observe(container);

    // Initial calculation in case metadata loaded before effect ran
    calculateVideoBounds();

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateVideoBounds]); // Re-run if the calculation function changes

  // Seek handler for progress bar click
  const handleSeek = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isContentLockedRef.current) return;
    const progressBarContainer = progressBarContainerRef.current;
    const video = videoRef.current;
    const currentDuration = durationRef.current; // Use ref

    if (!progressBarContainer || !video || !currentDuration || currentDuration <= 0) return;

    const rect = progressBarContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const barWidth = rect.width;
    const seekPercentage = Math.max(0, Math.min(1, clickX / barWidth)); // Clamp between 0 and 1
    const seekTime = seekPercentage * currentDuration;

    video.currentTime = seekTime;
    // Update progress state immediately for responsiveness
     setProgress(seekPercentage * 100);
     setCurrentTimeFormatted(formatTime(seekTime)); // Update time display on seek

   }, []); // No dependencies needed as it uses refs

  // Hover handlers for progress bar preview
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isContentLockedRef.current) return;
    const progressBarContainer = progressBarContainerRef.current;
    const currentDuration = durationRef.current;

    if (!progressBarContainer || !currentDuration || currentDuration <= 0) return;

    const rect = progressBarContainer.getBoundingClientRect();
    const hoverX = event.clientX - rect.left;
    const barWidth = rect.width;
    const hoverPercentage = Math.max(0, Math.min(1, hoverX / barWidth));
    setHoverTime(hoverPercentage * currentDuration);

  }, []); // Dependencies: none, uses refs

  const handleMouseEnter = useCallback(() => {
    if (isContentLockedRef.current) return;
    setIsHovering(true);
  }, []); // Dependencies: none, uses refs

  const handleMouseLeave = useCallback(() => {
    if (isContentLockedRef.current) return;
     setIsHovering(false);
   }, []); // Dependencies: none, uses refs

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    if (isForYouPage) {
      setShowOverlayOnEnd(true);
    }
    setIsPlaying(false); // Update playing state
  }, [isForYouPage]);

  // Scrubbing handlers
  const handleScrubMove = (event: MouseEvent) => {
    if (!isScrubbing || isContentLockedRef.current) return;

    const progressBarContainer = progressBarContainerRef.current;
    const video = videoRef.current;
    const currentDuration = durationRef.current;

    if (!progressBarContainer || !video || !currentDuration || currentDuration <= 0) return;

    const rect = progressBarContainer.getBoundingClientRect();
    const clientX = event.clientX;
    const scrubX = clientX - rect.left;
    const barWidth = rect.width;
    const scrubPercentage = Math.max(0, Math.min(1, scrubX / barWidth));
    const seekTime = scrubPercentage * currentDuration;

    video.currentTime = seekTime;
    setProgress(scrubPercentage * 100);
    setHoverTime(seekTime);
    setCurrentTimeFormatted(formatTime(seekTime));
  };

  const handleScrubEnd = () => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    document.removeEventListener('mousemove', handleScrubMove);
    document.removeEventListener('mouseup', handleScrubEnd);
  };

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isContentLockedRef.current) return;
    setIsScrubbing(true);
    setShowOverlayOnEnd(false);
    handleSeek(event); // Seek immediately on mouse down
    document.addEventListener('mousemove', handleScrubMove);
    document.addEventListener('mouseup', handleScrubEnd);
  }, [handleSeek, handleScrubMove, handleScrubEnd]); // Corrected dependencies

  // Cleanup global listeners on component unmount
  useEffect(() => {
    const cleanup = () => {
      document.removeEventListener('mousemove', handleScrubMove);
      document.removeEventListener('mouseup', handleScrubEnd);
    };
    return cleanup;
   }, [handleScrubMove, handleScrubEnd]); // Corrected dependencies

   // Intersection Observer and Watch Time Reporting Effect
   useEffect(() => {
    const videoElement = videoRef.current;
    if (isContentLockedRef.current || !videoElement || !objectUrl) return;

    // --- Playback control based on isActive prop ---
    if (typeof isActive !== 'undefined') {
      if (isActive) {
        videoElement.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        if (!videoElement.paused) {
          videoElement.pause();
          setIsPlaying(false);
        }
      }
      return () => { /* No observer cleanup needed */ };
    }
    // --- Fallback to IntersectionObserver if isActive is not provided ---

    const reportWatchTimeOnCleanup = async () => {
      const currentDuration = durationRef.current;
      const currentAccumulatedTime = accumulatedWatchTimeMsRef.current;
      const currentContentLocked = isContentLockedRef.current;

      if (reportedWatchTimeRef.current || currentContentLocked || currentDuration <= 0 || currentAccumulatedTime <= 0) {
        return;
      }
      reportedWatchTimeRef.current = true;
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
      const payload = {
        post_id: id,
        watch_time_ms: Math.round(currentAccumulatedTime),
        video_duration_ms: Math.round(currentDuration * 1000),
      };
      console.log(`Reporting watch time for post ${id} (Cleanup):`, payload);
      try {
        const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/record-watch-time`;
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        console.log(`Successfully reported watch time for post ${id} (Cleanup)`);
      } catch (error) {
        console.error(`Failed to report watch time for post ${id} (Cleanup):`, error);
        reportedWatchTimeRef.current = false;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const currentlyVisible = entry.isIntersecting;
        setIsVisible(currentlyVisible);

        if (currentlyVisible) {
          reportedWatchTimeRef.current = false;
          videoElement.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          if (!videoElement.paused) {
            videoElement.pause();
            setIsPlaying(false);
          }
          reportWatchTimeOnCleanup();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(videoElement);

    return () => {
      observer.disconnect();
      reportWatchTimeOnCleanup();
    };
   }, [objectUrl, id, isActive]); // Corrected dependencies

   // Watch Time Accumulation Interval Effect
   useEffect(() => {
    if (isPlaying && isVisible && !isContentLockedRef.current) {
      if (!watchIntervalRef.current) {
        watchIntervalRef.current = setInterval(() => {
          setAccumulatedWatchTimeMs(prev => prev + 100);
        }, 100);
      }
    } else {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
    }
    return () => {
      if (watchIntervalRef.current) {
        clearInterval(watchIntervalRef.current);
        watchIntervalRef.current = null;
      }
    };
  }, [isPlaying, isVisible]); // Corrected dependencies

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
    } finally {
      setIsBuying(false);
    }
  }, [loggedInUser, id, is_for_sale, price]);

  // Profile Click Handler
  const handleProfileClick = () => {
    router.push(`/profile/${username}`);
   };

   return (
       <div
         ref={containerRef}
         className="relative w-full h-full bg-black overflow-hidden group flex flex-col"
       >
        {isContentLocked ? (
           <div className="flex-grow w-full bg-black flex flex-col items-center justify-center text-white relative p-4">
             <div className="flex flex-col items-center justify-center text-center z-10">
               <Lock size={48} className="mb-3 opacity-80" />
               <span className="text-lg font-semibold mb-1">
                 {isLockedForPurchase ? 'Purchase to View' : 'Subscribe to View'}
               </span>
               {isLockedForPurchase && price && (
                 <Badge variant="secondary" className="text-sm font-bold cursor-default mb-4">
                   {formatPrice(price, currency ?? undefined)}
                 </Badge>
               )}
             </div>
             {isLockedForPurchase && (
               <Button
                 variant="default" size="sm"
                 className="mt-4 h-9 px-5 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-full absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20"
                 onClick={handlePurchase} disabled={isBuying || !loggedInUser}
                 aria-label={`Buy for ${formatPrice(price ?? 0, currency ?? undefined)}`}
               >
                 {isBuying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                 {isBuying ? 'Processing...' : 'Buy'}
               </Button>
             )}
           </div>
         ) : (
           <>
             {/* Video Area */}
             <div className="relative flex-grow flex-shrink min-h-0">
               {isLoading && <div className="absolute inset-0 flex items-center justify-center text-white z-10"><Loader2 className="h-8 w-8 animate-spin" /></div>}
               {errorState && <div className="absolute inset-0 flex items-center justify-center text-red-500 z-10 p-4 text-center">{errorState}</div>}
               <video
                 ref={videoRef} key={objectUrl} src={objectUrl ?? undefined} poster={posterSrc}
                 className={`w-full h-full object-contain ${!objectUrl || isLoading || errorState ? 'invisible' : ''} border-0 bg-black`}
                 playsInline loop muted={isMuted} onClick={disableClickToPlay ? undefined : togglePlayPause}
                 onPlay={() => { setIsPlaying(true); setShowOverlayOnEnd(false); }} onPause={() => setIsPlaying(false)}
                 onEnded={handleVideoEnd}
                 onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate}
                 onError={(e) => console.error(`Video Error (ID: ${id}):`, (e.target as HTMLVideoElement).error)}
               />

               {/* Overlay Container - Positioned exactly over the rendered video */}
               <div
                 className="absolute pointer-events-none z-20"
                 style={{
                   top: `${videoBounds.top}px`,
                   left: `${videoBounds.left}px`,
                   width: `${videoBounds.width}px`,
                   height: `${videoBounds.height}px`,
                 }}
               >
                 {/* Conditional Play Button Overlay (Centered) */}
                 {!isPlaying && !disableClickToPlay && !isContentLocked && objectUrl && !isLoading && !errorState && (
                   <div
                     className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer pointer-events-auto" // Centered again
                     onClick={togglePlayPause}
                     aria-label="Play video"
                   >
                     <Play size={64} className="text-white/80" fill="currentColor" />
                   </div>
                 )}

                 {/* User Info & Caption */}
                 {!isContentLocked && objectUrl && !isLoading && !errorState && (
                   <div className={`absolute bottom-12 left-4 text-white pointer-events-auto max-w-[calc(100%-80px)]`}> {/* Changed bottom-4 to bottom-12 */}
                     <div className={`flex items-center gap-1.5 group cursor-pointer`} onClick={handleProfileClick}
                        aria-label={`View profile of ${username}`} role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProfileClick(); } }}
                    >
                     <Avatar className="h-7 w-7 border border-gray-600 group-hover:scale-110 transition-transform">
                       <AvatarImage src={profilePictureUrl ?? undefined} alt={username ?? 'User profile'} />
                       <AvatarFallback>{username?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
                     </Avatar>
                     <span className="font-bold text-sm hover:underline">@{username}</span>
                   </div>
                   {caption && <p className="text-xs text-white mt-1 max-w-full break-words line-clamp-2">{caption}</p>}
                   {is_for_sale && !isContentLocked && price && (
                     <Badge variant="secondary" className="mt-1 text-xs font-semibold cursor-default bg-green-600 hover:bg-green-700 text-white">
                       For Sale: {formatPrice(price, currency ?? undefined)}
                     </Badge>
                   )}
                 </div>
               )}

               {/* Mute Button */}
               {objectUrl && !isLoading && !errorState && !isContentLocked && (
                 <button onClick={toggleMute} className={`absolute bottom-12 right-4 p-2 bg-black/40 rounded-full text-white pointer-events-auto`} aria-label={isMuted ? 'Unmute' : 'Mute'}> {/* Changed bottom-5 to bottom-12 */}
                   {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                 </button>
               )}

               {/* Interaction Buttons */}
               {!isContentLocked && (
                 <div className={`absolute bottom-20 right-4 pointer-events-auto opacity-100 transition-opacity duration-300`}>
                   <PostInteractionButtons
                     postId={id} userId={userId} username={username}
                     profilePictureUrl={profilePictureUrl ?? undefined}
                     initialLikes={parseInt(likes, 10) || 0} initialIsLiked={initialIsLiked}
                     commentsCount={comments} sharesCount={shares}
                     initialIsPrivate={initialIsPrivate ?? false} postType="video"
                     isOwner={isOwner ?? false} videoCaption={caption ?? undefined}
                     is_for_sale={is_for_sale} price={price} currency={currency}
                     variant={interactionVariant}
                   />
                 </div>
               )}

               {/* Controls Area (Moved inside overlay container) */}
               {!isContentLocked && objectUrl && !isLoading && !errorState && !hideProgressBar && showControls && duration > 0 && (
                 <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 pt-1 z-30 pointer-events-none"> {/* Positioned at bottom, removed bg-black, added z-index */}
                   <div className="relative pointer-events-auto"> {/* Enable pointer events for controls */}
                     <div
                         ref={progressBarContainerRef}
                       className={`relative h-1.5 w-full bg-gray-500/30 cursor-pointer group-hover:opacity-100 transition-opacity duration-200 ${isScrubbing ? 'opacity-100' : 'opacity-70'}`}
                       onClick={handleSeek}
                       onMouseDown={handleMouseDown}
                       onMouseMove={handleMouseMove}
                       onMouseEnter={handleMouseEnter}
                       onMouseLeave={handleMouseLeave}
                     >
                       <div className="absolute top-0 left-0 h-full w-full bg-gray-500/30" />
                       <div
                         className="absolute top-0 left-0 h-full bg-white/80 transition-colors duration-200 group-hover:bg-white"
                         style={{ width: `${progress}%` }}
                       />
                       <div
                         className={`absolute top-1/2 w-3 h-3 bg-white rounded-full transform -translate-y-1/2 -translate-x-1/2 pointer-events-none`}
                         style={{ left: `${progress}%` }}
                       />
                       {(isHovering || isScrubbing) && (
                         <div
                           className="absolute bottom-full mb-1 left-0 transform -translate-x-1/2 px-2 py-0.5 bg-black/70 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none"
                           style={{ left: `${(hoverTime / duration) * 100}%` }}
                         >
                           {formatTime(hoverTime)}
                         </div>
                       )}
                     </div>
                     <div className={`mt-1 text-white text-xs font-mono pointer-events-none select-none`}>
                       {currentTimeFormatted} / {formatTime(duration)}
                     </div>
                   </div>
                 </div>
               )}
             </div> {/* Closing tag for the overlay container */}
             </div> {/* Closing tag for Video Area */}
           </>
         )}
       </div>
     );
 }
