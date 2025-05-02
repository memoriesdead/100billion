"use client";

import React from 'react'; // Import React
import { VerticalVideoPlayer } from './VerticalVideoPlayer';

// Define the props type - should match VerticalVideoPlayerProps
interface ClientVideoPlayerWrapperProps {
  id: string;
  username: string;
  verified?: boolean;
  profilePictureUrl?: string; // Add profile picture URL prop
  caption: string;
  videoSrc: string;
  posterSrc?: string;
  likes: string;
  comments: string;
  shares: string;
  isPrivate?: boolean | null;
  isOwner?: boolean;
  userId: string; // Post owner's ID
  // Add sale-related props passed from VideoGrid
  is_for_sale: boolean;
  price?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
  isLocked?: boolean; // Locked by subscription or sale
  isPaidContent?: boolean | null | undefined; // Allow null as well
  disableClickToPlay?: boolean; // Add prop from VerticalVideoPlayer
  hideProgressBar?: boolean; // Add prop to pass down
}

// Wrap the component with React.memo to prevent unnecessary re-renders
// if the props haven't changed.
export const ClientVideoPlayerWrapper = React.memo(function ClientVideoPlayerWrapper(props: ClientVideoPlayerWrapperProps) {
  // Log that the wrapper is rendering (can be removed after debugging)
  // console.log(`Rendering ClientVideoPlayerWrapper for ID: ${props.id}`);
  // Pass all props down to VerticalVideoPlayer
  return <VerticalVideoPlayer {...props} />;
});

// Optional: Add a display name for better debugging in React DevTools
ClientVideoPlayerWrapper.displayName = 'ClientVideoPlayerWrapper';
