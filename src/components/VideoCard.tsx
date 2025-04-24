"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from 'react'; // Removed useRef, useEffect
import { useRouter } from 'next/navigation'; // Import useRouter
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FaPlay, FaHeart, FaComment, FaShare, FaLock, FaDonate, FaImage } from "react-icons/fa"; // Removed FaShoppingCart
import { Button } from "@/components/ui/button";
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-hot-toast';
import { Loader2, ShoppingCart } from 'lucide-react'; // Added ShoppingCart
import { PostInteractionButtons } from './PostInteractionButtons';

// Define PostType if not already globally defined
type PostType = 'video' | 'image';

interface VideoCardProps {
  id: string;
  username: string;
  verified?: boolean;
  caption: string;
  type: PostType;
  videoSrc?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  likes: string | number;
  comments?: string | number;
  shares?: string | number;
  isPaidContent: boolean;
  // isLocked prop removed
  is_for_sale: boolean;
  price?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  userId: string;
  profilePictureUrl?: string;
  isOwner: boolean;
  initialIsLiked: boolean;
  isPrivate: boolean | null;
}

// Initialize Stripe outside component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Helper function to format price (cents to dollars)
const formatPrice = (priceInCents: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
};

export function VideoCard({
  id,
  username,
  verified = false,
  caption,
  type,
  videoSrc,
  thumbnailUrl,
  imageUrl,
  likes,
  comments = "0",
  shares = "0",
  isPaidContent,
  // isLocked removed from destructuring
  is_for_sale,
  price,
  currency,
  stripe_price_id,
  userId,
  profilePictureUrl,
  isOwner,
  initialIsLiked,
  isPrivate,
}: VideoCardProps) {
  const router = useRouter(); // Instantiate router
  const [isBuying, setIsBuying] = useState(false);
  const userInitial = username.charAt(0).toUpperCase();
  // Removed videoRef
  // Removed isContentLocked variable definition

  // Handle Buy Now click
  const handleBuyClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!is_for_sale) return; // Should only be triggered by Buy button

    setIsBuying(true);
    let sessionId = '';
    try {
      const response = await fetch('/api/stripe/create-item-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id }),
      });
      const sessionData = await response.json();
      sessionId = sessionData.sessionId;
      if (!response.ok || !sessionId) throw new Error(sessionData.error || 'Failed to create session.');
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe.js failed.');
      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
      if (stripeError) throw new Error(stripeError.message || 'Redirect failed.');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error.';
      toast.error(`Purchase failed: ${errorMsg}`);
      if (sessionId) console.error("Session ID:", sessionId);
    } finally {
      setIsBuying(false);
    }
  };

  // Component for the main media area (restored structure)
  const MediaArea = () => (
    <div className="relative aspect-[9/16] overflow-hidden bg-black">
      {is_for_sale ? ( // Use is_for_sale directly
        // --- Locked State ---
        <>
          <div className="w-full h-full bg-black" />
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            {is_for_sale ? (
              <>
                <FaLock className="text-4xl mb-2 text-white" />
                <span className="text-sm font-semibold text-white">Purchase to View</span>
                {price && currency && (
                  <Badge variant="secondary" className="mt-1.5 text-sm font-bold">
                    {formatPrice(price, currency)}
                  </Badge>
                )}
              </>
            ) : ( // isLocked by subscription
              <>
                <FaLock className="text-4xl mb-2 text-white" />
                <span className="text-xs font-semibold text-white">Subscribe to View</span>
              </>
            )}
            {isBuying && <Loader2 className="absolute top-4 right-4 h-5 w-5 animate-spin text-white" />}
          </div>
        </>
      ) : (
        // --- Unlocked State ---
        type === 'video' ? (
          videoSrc ? (
            <video
              key={id + '-video'} // Keep key for potential list updates
              src={videoSrc}
              poster={thumbnailUrl ?? undefined}
              className="w-full h-full object-cover"
              preload="auto" // Changed from metadata to auto
              muted
              playsInline
              controls={false} // Ensure no controls
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-muted">
              <FaPlay className="h-12 w-12" />
            </div>
          )
        ) : ( // type === 'image'
          imageUrl ? (
            <Image
              src={imageUrl}
              alt={caption || 'Post image'}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-muted">
              <FaImage className="h-12 w-12" />
            </div>
          )
        )
      )}
    </div>
  );

  return (
    <Card className="group overflow-hidden bg-card/50 hover:bg-card transition-colors rounded-lg relative">

      {/* Content Area Container - Conditionally renders Lock Screen or MediaArea */}
      <div
        // Apply interactive props only if NOT for sale
        {...(!is_for_sale && { // Use !is_for_sale directly
          onClick: (e) => {
            // Prevent navigation if click is on buy button or interaction buttons
            if ((e.target as Element).closest('button') || (e.target as Element).closest('.interaction-buttons')) {
              return;
            }
            // Prevent navigation if click originated in profile area (handled by PostInteractionButtons)
            if ((e.target as Element).closest('.profile-link-area')) {
               return;
            }
            router.push(`/${type}/${id}`);
          },
          className: "block w-full h-full cursor-pointer",
          'aria-label': `View post by ${username}`,
          role: "link",
          tabIndex: 0,
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Prevent navigation if focus is on buy button or interaction buttons
              if (document.activeElement?.closest('button') || document.activeElement?.closest('.interaction-buttons')) {
                 return;
              }
              router.push(`/${type}/${id}`);
            }
          }
        })}
        // Default class if for sale
        className={is_for_sale ? "block w-full h-full cursor-default" : "block w-full h-full cursor-pointer"} // Use is_for_sale directly
      >
        {/* Render MediaArea */}
         <MediaArea />
       </div>

      {/* Interaction Buttons - Rendered directly inside the relative Card */}
      <PostInteractionButtons
        postId={id}
        userId={userId}
           username={username}
           profilePictureUrl={profilePictureUrl}
           initialLikes={Number(likes) || 0}
           initialIsLiked={initialIsLiked}
           commentsCount={comments.toString()}
           sharesCount={shares.toString()}
           initialIsPrivate={isPrivate ?? false}
           isOwner={isOwner}
           postType={type}
           // Pass sale props down
           is_for_sale={is_for_sale}
           price={price}
           currency={currency}
      />

      {/* Separate Buy Button (Only if for sale) */}
      {is_for_sale && (
         <Button
           variant="default"
           size="sm"
           className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 h-8 px-4 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-full" // Centered button
           onClick={handleBuyClick}
           // data-no-navigate="true" // Removed data-no-navigate
           disabled={isBuying}
           aria-label={`Buy ${caption || 'post'}`}
         >
           {isBuying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />} {/* Changed to ShoppingCart */}
           {isBuying ? 'Processing...' : 'Buy'}
         </Button>
       )}
    </Card>
  );
}
