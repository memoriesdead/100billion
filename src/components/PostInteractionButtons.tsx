"use client";

import React, { useState, useCallback, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Keep useRouter import
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Use Font Awesome icons for closer match to original screenshot
import { FaHeart, FaCommentDots, FaShare } from "react-icons/fa";
import { Lock, Unlock, ShoppingCart, Loader2 } from 'lucide-react'; // Keep Lock/Unlock for internal logic if needed elsewhere, but remove from UI stack
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe outside the component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PostInteractionButtonsProps {
  postId: string;
  userId: string; // ID of the post owner
  // onProfileClick prop removed
  username: string;
  profilePictureUrl?: string;
  initialLikes: number;
  initialIsLiked: boolean;
  commentsCount: string;
  sharesCount: string;
  initialIsPrivate: boolean;
  isOwner: boolean;
  videoCaption?: string;
  postType: 'video' | 'image';
  is_for_sale: boolean;
  price?: number | null;
  currency?: string | null;
  onLikeSuccess?: (newLikesCount: number) => void;
  // onCommentSuccess prop removed as it wasn't used
}

export function PostInteractionButtons({
  postId,
  userId,
  username,
  profilePictureUrl,
  initialLikes,
  initialIsLiked,
  commentsCount,
  sharesCount,
  initialIsPrivate,
  isOwner,
  videoCaption,
  postType,
  is_for_sale,
  price,
  currency,
  onLikeSuccess,
  // onProfileClick removed from destructuring
}: PostInteractionButtonsProps) {
  const router = useRouter(); // Keep router instance
  const { user: loggedInUser } = useContext(AuthContext);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [currentLikes, setCurrentLikes] = useState(initialLikes);
  const [currentIsPrivate, setCurrentIsPrivate] = useState(initialIsPrivate);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // --- Like Handler ---
  const handleLike = useCallback(async () => {
    if (!loggedInUser) {
      toast.info("Please log in to like posts.");
      return;
    }
    const originalLiked = isLiked;
    const originalLikesCount = currentLikes;
    const newLikedStatus = !isLiked;
    const newLikesCount = newLikedStatus ? currentLikes + 1 : currentLikes - 1;

    setIsLiked(newLikedStatus);
    setCurrentLikes(newLikesCount);

    try {
      if (newLikedStatus) {
        const { error } = await supabase.from('likes').insert({ user_id: loggedInUser.id, post_id: postId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes').delete().match({ user_id: loggedInUser.id, post_id: postId });
        if (error) throw error;
      }
      onLikeSuccess?.(newLikesCount);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setIsLiked(originalLiked);
      setCurrentLikes(originalLikesCount);
      toast.error("Failed to update like status.");
      console.error('[InteractionButtons] Error updating like status:', message); // Use the extracted message
    }
  }, [loggedInUser, postId, isLiked, currentLikes, onLikeSuccess]);

  // --- Share Handler ---
  const handleShare = useCallback(async () => {
    const shareData = {
      title: `Check out this post by @${username}!`,
      text: videoCaption || `Check out this post by @${username}!`,
      url: postType === 'video'
         ? `${window.location.origin}/video/${postId}`
         : `${window.location.origin}/image/${postId}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error('Error sharing:', error);
      if ((error as DOMException).name !== 'AbortError') {
        toast.error("Could not share post.");
      }
    }
  }, [postId, username, videoCaption, postType]);

  // --- Privacy Toggle Handler ---
  const handleTogglePrivacy = useCallback(async () => {
    if (!isOwner || isUpdatingPrivacy || !loggedInUser) {
      if (!loggedInUser) toast.error("You must be logged in.");
      return;
    }
    setIsUpdatingPrivacy(true);
    const originalIsPrivate = currentIsPrivate;
    const newIsPrivate = !currentIsPrivate;
    setCurrentIsPrivate(newIsPrivate); // Optimistic update

    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_private: newIsPrivate })
        .eq('id', postId)
        .eq('user_id', loggedInUser.id);
      if (error) throw error;
      toast.success(`Post set to ${newIsPrivate ? 'Private' : 'Public'}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setCurrentIsPrivate(originalIsPrivate); // Revert on error
      toast.error("Failed to update privacy status.");
      console.error('Error updating privacy status:', message);
    } finally {
      setIsUpdatingPrivacy(false);
    }
  }, [isOwner, isUpdatingPrivacy, loggedInUser, postId, currentIsPrivate]);

  // --- Purchase Handler ---
  const handlePurchase = useCallback(async () => {
    if (!loggedInUser) {
      toast.info("Please log in to purchase items.");
      return;
    }
    if (!postId || !is_for_sale || !price || price <= 0) {
      toast.error("This item cannot be purchased currently.");
      return;
    }
    setIsCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/create-item-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const sessionData = await response.json();
      if (!response.ok) throw new Error(sessionData.error || 'Failed to create checkout session');
      if (!sessionData.sessionId) throw new Error('Session ID not received from server');
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe.js failed to load.');
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId: sessionData.sessionId });
      if (stripeError) throw new Error(stripeError.message);
    } catch (error) {
      console.error('Purchase initiation error:', error);
      toast.error(`Failed to initiate purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCheckoutLoading(false);
    }
   }, [loggedInUser, postId, is_for_sale, price]);

   const PrivacyIcon = currentIsPrivate ? Lock : Unlock;

   // Determine container classes based on is_for_sale
  const containerClasses = is_for_sale
    ? "absolute top-4 right-4 z-20 pointer-events-auto" // Top-right for sale items
    : "absolute bottom-12 right-3 z-20 flex flex-col items-end space-y-1 pointer-events-auto"; // Position even lower, tighten spacing, adjust right offset

  return (
    <div className={containerClasses}>
      {/* Profile Link (Always rendered, position handled by container) */}
      <Link
        href={`/profile/${username}`} // Link to the user's profile page
        onClick={(e) => {
          e.stopPropagation(); // Prevent parent Link navigation
        }}
        className={`profile-link-area text-white cursor-pointer ${!is_for_sale && postType === 'video' ? 'mt-4' : ''} ${!is_for_sale ? 'mb-1' : ''} ${is_for_sale ? '' : 'flex flex-col items-center'}`}
        aria-label={`View profile for ${username}`}
      >
        <Avatar className="w-10 h-10 border-2 border-white">
          <AvatarImage src={profilePictureUrl ?? ''} alt={`${username}'s profile picture`} />
          <AvatarFallback>{username?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
        </Avatar>
      </Link>

      {/* Like Button (Only render if not for sale) */}
      {/* Like Button (Using FaHeart) */}
      {!is_for_sale && (
        <button onClick={handleLike} className="flex flex-col items-center text-white group/like">
          <div className={`w-10 h-10 bg-black/40 rounded-full flex items-center justify-center mb-1 transition-colors ${isLiked ? 'bg-red-500/80' : 'group-hover/like:bg-white/20'}`}>
            <FaHeart size={24} className={`${isLiked ? 'text-red-500' : 'text-white'} transition-transform group-hover/like:scale-110`} /> {/* Use FaHeart */}
          </div>
          <span className="text-xs font-semibold">{currentLikes}</span>
        </button>
      )}

      {/* Comment Button */}
      {!is_for_sale && (
        <Link
          href={postType === 'video' ? `/video/${postId}#comments` : `/image/${postId}#comments`}
          className="flex flex-col items-center text-white"
          aria-label="View comments"
          onClick={(e) => e.stopPropagation()} // Keep stopPropagation here too
        >
          <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center mb-1">
            <FaCommentDots size={24} /> {/* Use FaCommentDots */}
          </div>
          <span className="text-xs font-semibold">{commentsCount}</span>
        </Link>
      )}

      {/* Share Button */}
      {/* Share Button (Using FaShare) */}
      {!is_for_sale && (
        <button onClick={handleShare} className="flex flex-col items-center text-white group/share">
          <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center mb-1 transition-colors group-hover/share:bg-white/20">
            <FaShare size={22} className="transition-transform group-hover/share:scale-110" /> {/* Use FaShare, slightly smaller */}
          </div>
          <span className="text-xs font-semibold">{sharesCount}</span>
        </button>
      )}

      {/* Privacy Status Display/Button REMOVED from UI stack */}


      {/* Buy Button (Conditional - Now removed entirely for sale items based on feedback) */}
      {/* {is_for_sale && price && price > 0 && !isOwner && (
        <button
          onClick={handlePurchase}
          disabled={isCheckoutLoading || !loggedInUser}
          className="flex flex-col items-center text-white group/buy mt-2"
          aria-label={`Purchase for ${(price / 100).toFixed(2)} ${currency?.toUpperCase() ?? 'USD'}`}
        >
          <div className={`w-10 h-10 bg-green-600/80 hover:bg-green-500/90 rounded-full flex items-center justify-center mb-1 transition-colors`}>
            {isCheckoutLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart size={24} />}
          </div>
          <span className="text-xs font-semibold">Buy (${(price / 100).toFixed(2)})</span>
        </button>
      )} */}
    </div>
  );
}
