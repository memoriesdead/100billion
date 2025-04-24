"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import { PostInteractionButtons } from './PostInteractionButtons';
import { Lock, ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-hot-toast';
import Image from 'next/image'; // Keep standard Image import
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaImage, FaLock } from 'react-icons/fa';

// Define props for ImageCard
interface ImageCardProps {
  id: string;
  userId: string;
  username: string;
  profilePictureUrl?: string;
  caption: string | null;
  imageUrl: string;
  likes: number;
  comments: string;
  shares: string;
  isPrivate: boolean;
  isOwner: boolean;
  initialIsLiked: boolean;
  is_for_sale: boolean;
  price?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  isLocked?: boolean;
  isPaidContent?: boolean;
}

// Initialize Stripe outside component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Helper function to format price
const formatPrice = (priceInCents: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
};

export function ImageCard({
  id,
  userId,
  username,
  profilePictureUrl,
  caption,
  imageUrl,
  likes,
  comments,
  shares,
  isPrivate,
  isOwner,
  initialIsLiked,
  is_for_sale,
  price,
  currency,
  stripe_price_id,
  isLocked,
}: ImageCardProps) {
  const router = useRouter(); // Get router instance
  const [isBuying, setIsBuying] = useState(false);
  const userInitial = username.charAt(0).toUpperCase();

  // Handler for profile click
  const handleProfileClick = () => {
    router.push('/profile'); // Navigate to the main profile page
  };

  // Determine lock status
  const isContentLocked = is_for_sale || isLocked;

  // Handle Buy Now click
  const handleBuyClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!is_for_sale) return;

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

  // Component for the main media area (image + overlays)
  function MediaArea() {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {/* Image Display or Blackout */}
        {isContentLocked ? (
          <div className="w-full h-full bg-black" />
        ) : (
          <img
            src={imageUrl}
            alt={caption || 'User uploaded image'}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        )}

        {/* Centered Overlay for Purchasable Content */}
        {is_for_sale && (
           <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
             <FaLock className="text-4xl mb-2 text-white" />
             <span className="text-sm font-semibold text-white">Purchase to View</span>
             {price && currency && (
               <Badge variant="secondary" className="mt-1.5 text-sm font-bold">
                 {formatPrice(price, currency)}
               </Badge>
             )}
             {isBuying && <Loader2 className="absolute top-4 right-4 h-5 w-5 animate-spin text-white" />}
           </div>
        )}
        {/* Centered Overlay for Subscription Locked Content */}
        {isLocked && !is_for_sale && (
           <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none bg-black/60">
             <FaLock className="text-4xl mb-2 text-white" />
             <span className="text-xs font-semibold text-white">Subscribe to View</span>
           </div>
        )}
        {/* Bottom Info Overlay (Caption Only) - Show only if NOT locked */}
        {!isContentLocked && caption && (
           <div className="absolute inset-x-0 bottom-0 z-10 p-4 pointer-events-none bg-gradient-to-t from-black/60 via-black/30 to-transparent">
             <p className="text-white text-sm truncate">{caption}</p>
           </div>
         )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group">

      {/* Content Area (Link or Div) */}
      {isContentLocked ? (
        <div className="block w-full h-full cursor-default">
          <MediaArea />
        </div>
      ) : (
        <Link href={`/image/${id}`} className="block w-full h-full">
          <MediaArea />
        </Link>
       )}

      {/* Interaction Buttons - Rendered directly inside the relative root div */}
      <PostInteractionButtons
        postId={id}
        userId={userId}
           username={username}
           profilePictureUrl={profilePictureUrl}
           initialLikes={likes}
           initialIsLiked={initialIsLiked}
           commentsCount={comments}
           sharesCount={shares}
           initialIsPrivate={isPrivate ?? false}
           isOwner={isOwner}
           postType={'image'} // Pass 'image' directly
           is_for_sale={is_for_sale}
           price={price}
           currency={currency}
           // onProfileClick prop removed
         />
      {/* Removed the wrapper div */}

      {/* Separate Buy Button (Only if for sale) */}
      {is_for_sale && (
         <Button
           variant="default"
           size="sm"
           className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 h-8 px-4 text-sm bg-pink-600 hover:bg-pink-700 text-white rounded-full"
           onClick={handleBuyClick}
           disabled={isBuying}
           aria-label={`Buy ${caption || 'image'}`}
         >
           {isBuying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
           {isBuying ? 'Processing...' : 'Buy'}
         </Button>
       )}
    </div>
  );
}
