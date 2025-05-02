'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // Keep DialogClose
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface EditPostModalProps {
  postId: string | null;
  initialCaption: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess?: () => void; // Optional callback on successful save
}

export function EditPostModal({
  postId,
  initialCaption,
  isOpen,
  onOpenChange,
  onSaveSuccess,
}: EditPostModalProps) {
  const { user } = useAuth(); // Get logged-in user
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState('');

  // Reset caption when the modal opens with a new post
  useEffect(() => {
    if (isOpen && initialCaption !== null) {
      setCaption(initialCaption);
    } else if (!isOpen) {
      // Optionally reset when closing, or let it persist until next open
      // setCaption('');
    }
  }, [isOpen, initialCaption]);

  const editPostMutation = useMutation({
    mutationFn: async (newCaption: string) => {
      if (!postId || !user) throw new Error("Post ID or user is missing.");

      const { error } = await supabase
        .from('posts')
        .update({ caption: newCaption.trim() || null }) // Update caption, set to null if empty/whitespace
        .eq('id', postId)
        .eq('user_id', user.id); // Ensure user owns the post

      if (error) {
        throw error;
      }
      return postId; // Return postId on success
    },
    onSuccess: (updatedPostId) => {
      toast.success("Post updated successfully!");
      // Invalidate queries related to posts to refresh data
      queryClient.invalidateQueries({ queryKey: ['homeFeedPosts', user?.id] });
      // Optionally invalidate specific post query if you have one
      // queryClient.invalidateQueries({ queryKey: ['post', updatedPostId] });
      onSaveSuccess?.(); // Call the success callback if provided
      onOpenChange(false); // Close the modal
    },
    onError: (error) => {
      console.error("Failed to update post:", error);
      toast.error(`Failed to update post: ${error.message}`);
    },
  });

  const handleSave = () => {
    // Prevent saving if no changes or during mutation
    if (caption === initialCaption || editPostMutation.isPending) {
      // Optionally close if no changes, or show a message
      if (caption === initialCaption) {
        onOpenChange(false);
      }
      return;
    }
    editPostMutation.mutate(caption);
  };

  // Handle closing the dialog
  const handleClose = () => {
    if (!editPostMutation.isPending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            Make changes to your post caption here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="caption" className="text-right">
              Caption
            </Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="col-span-3 h-24 resize-none"
              placeholder="Enter your caption"
            />
          </div>
        </div>
        <DialogFooter>
          {/* Use DialogClose for the Cancel button */}
          <DialogClose asChild>
             <Button type="button" variant="outline" disabled={editPostMutation.isPending}>
               Cancel
             </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={editPostMutation.isPending || caption === initialCaption}>
            {editPostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
