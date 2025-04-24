'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useMcpTool } from '@/hooks/useMcpTool'; // Import the custom hook
import { TablesInsert } from '@/lib/database.types'; // Import generated types

// shadcn/ui components & Lucide icons
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, UploadCloud, X } from 'lucide-react';

// Define the type for the store item data based on database.types.ts
// Assuming TablesInsert<'store_items'> is available or define manually
type StoreItemInsert = {
  user_id: string;
  name: string;
  description?: string | null;
  price: number; // Price in cents
  currency?: string;
  image_url?: string | null;
  stripe_product_id?: string | null; // Will store Stripe Product ID
  stripe_price_id?: string | null; // Will store Stripe Price ID
};

// Type for the mutation function arguments
interface SaveItemArgs {
  name: string;
  description: string | null;
  priceInCents: number;
  currency: string;
  file: File;
  userId: string;
}

interface StoreItemFormProps {
  // Add props if needed, e.g., for editing existing items
  onSaveSuccess?: () => void; // Callback after successful save
}

export function StoreItemForm({ onSaveSuccess }: StoreItemFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(''); // Store as string for input, convert later
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const [isLoading, setIsLoading] = useState(false); // Replaced by mutation's status
  const [error, setError] = useState<string | null>(null);
  // Use the custom hook for Stripe MCP tools
  const { callTool: callStripeTool, isLoading: isStripeLoading, error: stripeError } = useMcpTool('github.com/stripe/agent-toolkit');

  // Mutation for saving the item (Supabase upload, Stripe product/price, Supabase insert)
  const saveItemMutation = useMutation({
    mutationFn: async ({ name, description, priceInCents, currency, file, userId }: SaveItemArgs) => {
      setError(null); // Clear previous errors

      // 1. Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const imageFileName = `${userId}/${Date.now()}.${fileExt}`; // Unique file name
      const imageBucket = 'store-item-images'; // Assumed bucket name

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(imageBucket)
        .upload(imageFileName, file, {
          cacheControl: '3600',
          upsert: false, // Don't upsert, generate unique name instead
        });

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      // Get public URL for the uploaded image
      const { data: urlData } = supabase.storage.from(imageBucket).getPublicUrl(imageFileName);
      const imageUrl = urlData?.publicUrl;
      if (!imageUrl) {
        await supabase.storage.from(imageBucket).remove([imageFileName]); // Cleanup image
        throw new Error("Failed to get image public URL after upload.");
      }

      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;

      try {
        // 2. Create Stripe Product
        const productArgs = { name, description: description ?? undefined };
        const productResult = await callStripeTool('create_product', productArgs);
        if (!productResult || typeof productResult !== 'object' || !('id' in productResult)) {
           throw new Error('Failed to create Stripe product or invalid response received.');
        }
        stripeProductId = productResult.id as string;

        // 3. Create Stripe Price
        const priceArgs = {
          product: stripeProductId,
          unit_amount: priceInCents,
          currency: currency,
        };
        const priceResult = await callStripeTool('create_price', priceArgs);
         if (!priceResult || typeof priceResult !== 'object' || !('id' in priceResult)) {
           throw new Error('Failed to create Stripe price or invalid response received.');
         }
        stripePriceId = priceResult.id as string;

        // 4. Insert into Supabase 'store_items' table
        const newItemData: TablesInsert<'store_items'> = {
          user_id: userId,
          name: name,
          description: description,
          price: priceInCents,
          currency: currency,
          image_url: imageUrl,
          stripe_product_id: stripeProductId,
          stripe_price_id: stripePriceId,
        };

        const { error: insertError } = await supabase
          .from('store_items')
          .insert(newItemData);

        if (insertError) {
          throw new Error(`Database insert failed: ${insertError.message}`);
        }

        return { ...newItemData, id: 'temp-id-until-fetched' }; // Placeholder ID

      } catch (stripeOrDbError) {
          // Cleanup cascade on Stripe/DB error
          console.error("Error during Stripe/DB operation, attempting cleanup:", stripeOrDbError);
          await supabase.storage.from(imageBucket).remove([imageFileName]); // Remove image
          // TODO: Add cleanup for Stripe product/price if needed (more complex)
          throw stripeOrDbError; // Re-throw the error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_items', user?.id] });
      if (onSaveSuccess) onSaveSuccess();
      handleOpenChange(false); // Close dialog on success
    },
    onError: (error) => {
      console.error("Failed to save item:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred during save.");
      // Also consider showing stripeError if it exists
      if (stripeError) {
         console.error("Stripe MCP Error:", stripeError);
         // Potentially append Stripe error to the main error state
         setError(prev => `${prev ? prev + ' ' : ''}Stripe Error: ${stripeError.message}`);
      }
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    // No need for setIsLoading(false) as mutation handles loading state
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm(); // Reset form when closing
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !name || !price || !selectedFile) {
      setError("Please fill in all required fields and select an image.");
      return;
    }

    // Don't need setIsLoading(true) here, mutation handles it

    try {
      const priceInCents = Math.round(parseFloat(price) * 100);
      if (isNaN(priceInCents) || priceInCents < 0) {
        throw new Error("Invalid price entered.");
      }

      // Call the mutation
      saveItemMutation.mutate({
        name,
        description: description || null,
        priceInCents,
        currency: 'usd', // Assuming USD for now
        file: selectedFile,
        userId: user.id,
      });

    } catch (err) {
      // Catch potential synchronous errors before mutation call (e.g., price parsing)
      console.error("Pre-mutation error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    }
    // No finally block needed here for loading state
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Store Item</DialogTitle>
          <DialogDescription>
            Fill in the details for the item you want to sell.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Item Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
                maxLength={100}
              />
            </div>

            {/* Item Description */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3 h-20"
                maxLength={500}
              />
            </div>

            {/* Item Price */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price (USD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="col-span-3"
                required
                step="0.01"
                min="0.50" // Stripe minimum charge
                placeholder="e.g., 19.99"
              />
            </div>

            {/* Image Upload */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="item-image" className="text-right pt-2">
                Image <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3">
                <Input
                  id="item-image"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden" // Hide default input
                  required={!previewUrl} // Require if no image is previewed (for initial add)
                />
                {previewUrl ? (
                  <div className="relative group w-full h-32 border rounded-md overflow-hidden">
                    <Image src={previewUrl} alt="Item preview" layout="fill" objectFit="cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleRemoveImage}
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-32 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <UploadCloud className="h-8 w-8 mb-2" />
                      <span>Click or drag to upload</span>
                      <span className="text-xs">PNG, JPG, WEBP up to 5MB</span>
                    </div>
                  </Button>
                )}
                 <p className="text-xs text-muted-foreground mt-1">A preview image for your item.</p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="col-span-4 text-red-600 text-sm text-center bg-red-100 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saveItemMutation.isPending || isStripeLoading}>
              {saveItemMutation.isPending || isStripeLoading ? 'Saving...' : 'Save Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
