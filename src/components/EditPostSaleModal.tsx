'use client';

import React, { useState, useEffect, useContext } from 'react'; // Added useContext
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
// Remove MCP hook import - no longer creating Stripe objects here
// import { useMcpTool } from '@/hooks/useMcpTool';
import { Tables, TablesUpdate } from '@/lib/database.types';
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

// Define the type for the post data passed to the modal
type PostData = Pick<Tables<'posts'>, 'id' | 'user_id' | 'caption' | 'is_for_sale' | 'price' | 'currency' | 'stripe_product_id' | 'stripe_price_id'>; // Added user_id

// Define a type for the mutation function arguments, including the temporary price field
type UpdatePostMutationArgs = {
  is_for_sale: boolean;
  newPriceInCents?: number | null; // Temporary field for price logic
  // Include other fields from TablesUpdate<'posts'> if they were editable here
};


interface EditPostSaleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  postData: PostData | null;
  onSaveSuccess?: () => void;
}

const MIN_SALE_PRICE = 0.50; // Minimum price in USD

export function EditPostSaleModal({ isOpen, onOpenChange, postData, onSaveSuccess }: EditPostSaleModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Get user from AuthContext
  const [isForSale, setIsForSale] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Remove MCP hook usage
  // const { callTool: callStripeTool, isLoading: isStripeLoading } = useMcpTool('github.com/stripe/agent-toolkit');
  const isStripeLoading = false; // Remove placeholder loading state

  // Effect to initialize form state when postData changes
  useEffect(() => {
    if (postData) {
      setIsForSale(postData.is_for_sale ?? false);
      setSalePrice(postData.price ? (postData.price / 100).toFixed(2) : '');
      setError(null); // Clear errors when modal opens with new data
    }
  }, [postData]);

  // --- Mutation Logic ---
  const updatePostMutation = useMutation({
    // Use the specific argument type here
    mutationFn: async (args: UpdatePostMutationArgs) => {
      if (!postData) throw new Error("No post data available for update.");
      setError(null);

      // Prepare update payload for Supabase
      const finalUpdateData: TablesUpdate<'posts'> = {
        is_for_sale: args.is_for_sale,
        price: args.is_for_sale ? args.newPriceInCents : null,
        currency: args.is_for_sale ? 'usd' : null,
        // Clear Stripe IDs if toggling off sale, otherwise keep existing (or null)
        // Stripe objects will be created/managed by the backend route on purchase attempt
        stripe_product_id: args.is_for_sale ? postData.stripe_product_id : null,
        stripe_price_id: args.is_for_sale ? postData.stripe_price_id : null,
      };

      // Update Supabase posts table
      const { error: updateError } = await supabase
        .from('posts')
        .update(finalUpdateData) // Pass the cleaned payload
        .eq('id', postData.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Post sale status updated!");
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['posts'] }); // General posts query (if used elsewhere)
      queryClient.invalidateQueries({ queryKey: ['posts', postData?.user_id] }); // Posts by this specific user
      queryClient.invalidateQueries({ queryKey: ['homeFeedPosts', user?.id] }); // <<< Invalidate the Profile Home Feed query
      if (onSaveSuccess) onSaveSuccess();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to update post sale status:", err);
      setError(message || "Failed to update post.");
      toast.error(`Update failed: ${message}`);
    }
  });
  // --- End Mutation Logic ---

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!postData) return;

    let priceInCents: number | null = null;
    if (isForSale) {
      if (!salePrice || isNaN(parseFloat(salePrice))) {
        setError("Please enter a valid price.");
        return;
      }
      priceInCents = Math.round(parseFloat(salePrice) * 100);
      if (priceInCents < MIN_SALE_PRICE * 100) {
        setError(`Price must be at least $${MIN_SALE_PRICE.toFixed(2)}.`);
        return;
      }
    }

    // Use the specific argument type for the mutation
    const mutationArgs: UpdatePostMutationArgs = {
      is_for_sale: isForSale,
      newPriceInCents: isForSale ? priceInCents : null,
    };

    updatePostMutation.mutate(mutationArgs);
  };

  if (!postData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Post Sale Status</DialogTitle>
          <DialogDescription>
            Update whether this post is for sale and set its price.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Is For Sale Switch */}
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="sale-switch-edit" className="flex flex-col space-y-1">
                <span>Mark as For Sale</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Enable this to set a price for direct purchase.
                </span>
              </Label>
              <Switch
                id="sale-switch-edit" // Ensure unique ID if multiple modals exist
                checked={isForSale}
                onCheckedChange={setIsForSale}
                disabled={updatePostMutation.isPending} // Remove isStripeLoading
              />
            </div>

            {/* Price Input (Conditional) */}
            <AnimatePresence>
              {isForSale && (
                <motion.div
                  key="price-input-edit"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-2"
                >
                  <Label htmlFor="sale-price-edit">Price (USD)</Label>
                  <div className="relative">
                     <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                     <Input
                       id="sale-price-edit"
                       type="number"
                       value={salePrice}
                       onChange={(e) => setSalePrice(e.target.value)}
                       placeholder="e.g., 5.00"
                       className="pl-8"
                       step="0.01"
                       min={MIN_SALE_PRICE.toFixed(2)}
                       disabled={updatePostMutation.isPending} // Remove isStripeLoading
                       required={isForSale}
                     />
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum price is ${MIN_SALE_PRICE.toFixed(2)}.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={updatePostMutation.isPending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={updatePostMutation.isPending}>
              {updatePostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
