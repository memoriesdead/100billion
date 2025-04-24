'use client';

import React, { useState } from 'react'; // Added useState
import { useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js'; // Import Stripe JS loader
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShoppingBag, Loader2 } from 'lucide-react'; // Added Loader2
import { Badge } from '@/components/ui/badge';
import { Tables } from '@/lib/database.types'; // Import Tables type
import { toast } from 'react-hot-toast'; // For showing errors

// Define the type for a store item based on the table definition
type StoreItem = Tables<'store_items'>;

interface StoreItemListProps {
  userId: string; // ID of the profile owner whose items we want to display
}

// Initialize Stripe outside component to avoid re-creating on every render
// Use NEXT_PUBLIC_ prefix for client-side environment variables
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Helper function to format price (cents to dollars)
const formatPrice = (priceInCents: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceInCents / 100);
};

export function StoreItemList({ userId }: StoreItemListProps) {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null); // Track loading state per item

  // Fetch store items using React Query
  const { data: items, isLoading, error } = useQuery<StoreItem[], Error>({
    queryKey: ['store_items', userId], // Query key includes the user ID
    queryFn: async () => {
      // Fetch items from Supabase
      const { data, error } = await supabase
        .from('store_items')
        .select('*') // Select all columns for now
        .eq('user_id', userId)
        .order('created_at', { ascending: false }); // Order by newest first

      if (error) {
        console.error("Error fetching store items:", error);
        throw new Error(`Failed to fetch store items: ${error.message}`);
      }
      return data || []; // Return data or empty array
    },
    enabled: !!userId, // Only run query if userId is available
  });

  // Function to handle the "Buy Now" click
  const handleBuyClick = async (priceId: string | null, itemId: string) => {
    if (!priceId) {
      toast.error("This item doesn't have a valid price ID configured.");
      console.error("Missing Stripe Price ID for item:", itemId);
      return;
    }

    setLoadingItemId(itemId); // Set loading state for this specific item
    let sessionId = ''; // Declare sessionId outside try block

    try {
      // 1. Call the backend API route to create a checkout session
      const response = await fetch('/api/stripe/create-item-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }), // Send the Stripe Price ID
      });

      const sessionData = await response.json();
      sessionId = sessionData.sessionId; // Assign sessionId here

      if (!response.ok || !sessionId) {
        throw new Error(sessionData.error || 'Failed to create checkout session.');
      }

      // 2. Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

      if (stripeError) {
        console.error("Stripe redirect error:", stripeError);
        throw new Error(stripeError.message || 'Failed to redirect to Stripe.');
      }
      // If redirectToCheckout succeeds, the user is navigated away.

    } catch (err) {
      console.error("Buy item error:", err);
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Purchase failed: ${errorMsg}`);
      if (sessionId) {
          console.error("Checkout Session ID (if created):", sessionId);
      }
    } finally {
      setLoadingItemId(null); // Reset loading state regardless of success or failure
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="aspect-square bg-muted rounded-t-lg"></div>
            <CardHeader><div className="h-4 bg-muted rounded w-3/4"></div></CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
            <CardFooter><div className="h-8 bg-muted rounded w-1/4"></div></CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="text-center py-10 text-red-600">
        <AlertCircle className="mx-auto h-12 w-12 mb-4" />
        <p>Error loading store items: {error.message}</p>
      </div>
    );
  }

  // Render empty state
  if (!items || items.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
         <ShoppingBag className="mx-auto h-12 w-12 mb-4 text-gray-400" />
        <p>This user hasn't listed any items for sale yet.</p>
      </div>
    );
  }

  // Render the list of items
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const isButtonLoading = loadingItemId === item.id; // Check if this specific button is loading
        return (
          <Card key={item.id} className="overflow-hidden flex flex-col">
            <CardHeader className="p-0 relative aspect-square">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-t-lg"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center rounded-t-lg">
                  <ShoppingBag className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <CardTitle className="text-lg font-semibold mb-1 line-clamp-2">{item.name}</CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {item.description || 'No description available.'}
              </p>
            </CardContent>
            <CardFooter className="p-4 flex justify-between items-center border-t">
              <Badge variant="secondary" className="text-base font-bold">
                {formatPrice(item.price, item.currency)}
              </Badge>
              {/* Updated Buy Button */}
              <Button
                size="sm"
                onClick={() => handleBuyClick(item.stripe_price_id, item.id)}
                disabled={!item.stripe_price_id || isButtonLoading} // Disable if no price ID or loading
              >
                {isButtonLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isButtonLoading ? 'Processing...' : 'Buy Now'}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
