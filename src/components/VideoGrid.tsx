"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ClientVideoPlayerWrapper } from "./ClientVideoPlayerWrapper";
import { ImageCard } from './ImageCard';
import { Button } from '@/components/ui/button';
import { Trash2, Lock, Pencil } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { EditPostSaleModal } from './EditPostSaleModal';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast'; // Import toast

// Define types
type PostWithProfile = {
  id: string;
  user_id: string;
  caption: string | null;
  type: string;
  video_url: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  likes_count: number | null;
  comments_count: number | null;
  is_private: boolean | null;
  is_for_sale: boolean;
  price: number | null;
  currency: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  profiles: {
    username: string | null;
    profile_picture_url: string | null;
  } | null;
};

type RawPostData = {
  id: string;
  user_id: string;
  caption: string | null;
  type: string;
  video_url: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  likes_count: number | null;
  comments_count: number | null;
  is_private: boolean | null;
  is_for_sale: boolean;
  price: number | null;
  currency: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  profiles: {
    username: string | null;
    profile_picture_url: string | null;
  } | null;
};

interface VideoGridProps {
  userId?: string; // For profile page
  searchQuery?: string; // For search results
  followedUserIds?: string[]; // For following feed
  allowDeletion?: boolean;
}

export function VideoGrid({ userId, searchQuery, followedUserIds, allowDeletion = false }: VideoGridProps) {
  const router = useRouter();
  const { user: loggedInUser } = useAuth();
  const queryClient = useQueryClient();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [postIdToDelete, setPostIdToDelete] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostWithProfile | null>(null);

  // Delete handler
  const handleDelete = useCallback(async (postIdToDelete: string) => {
    if (deletingId) return;
    setDeletingId(postIdToDelete);
    setError(null);
    try {
      const postToDelete = posts.find(p => p.id === postIdToDelete);
      if (!postToDelete) throw new Error("Post not found.");
      const { error: dbError } = await supabase.from('posts').delete().eq('id', postIdToDelete);
      if (dbError) throw dbError;
      // Storage deletion logic...
      setPosts(currentPosts => currentPosts.filter(p => p.id !== postIdToDelete));
      queryClient.invalidateQueries({ queryKey: ['posts', userId] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete post: ${message}`);
    } finally {
      setDeletingId(null);
      setPostIdToDelete(null);
      setIsConfirmDeleteDialogOpen(false);
    }
  }, [posts, deletingId, queryClient, userId]);

  // Fetch posts effect
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('posts')
          .select(`
            id, user_id, caption, type, video_url, image_url, thumbnail_url,
            likes_count, comments_count, is_private, is_for_sale, price,
            currency, stripe_price_id, stripe_product_id,
            profiles (username, profile_picture_url)
          `)
          .order('created_at', { ascending: false });

        if (userId) {
          // Profile page: Fetch posts for a specific user
          query = query.eq('user_id', userId);
          // Optionally decide if owner should see their private/sale posts here
          // if (!allowDeletion) { // If not owner's view, hide private/sale
          //   query = query.eq('is_private', false).eq('is_for_sale', false);
          // }
        } else if (searchQuery?.trim()) {
          // Search page: Fetch public posts matching query
          query = query.ilike('caption', `%${searchQuery}%`).eq('is_private', false);
        } else if (followedUserIds && followedUserIds.length > 0) {
          // Following page: Fetch posts from followed users (including private/sale)
          query = query.in('user_id', followedUserIds);
        } else {
          // Explore page (default): Fetch public, non-sale posts
          query = query.eq('is_private', false).eq('is_for_sale', false);
        }

        const { data, error: fetchError } = await query; // Removed type assertion
        if (fetchError) throw fetchError;

        if (data?.length) {
          const formattedPosts = data.map((post: RawPostData) => ({
            ...post,
            profiles: post.profiles,
            likes_count: post.likes_count ?? 0,
            comments_count: post.comments_count ?? 0,
            is_private: post.is_private, // Keep as boolean | null
            is_for_sale: post.is_for_sale ?? false,
            price: post.price,
            currency: post.currency,
            stripe_price_id: post.stripe_price_id,
            stripe_product_id: post.stripe_product_id,
          }));
          setPosts(formattedPosts);
        } else setPosts([]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message || "Error fetching posts.");
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [userId, searchQuery, followedUserIds]); // Add followedUserIds dependency

  // Loading/Error/Empty states
  if (loading) return <div className="text-center p-4">Loading posts...</div>;
  if (error) return <div className="text-center text-red-500 p-4">{error}</div>;
  if (posts.length === 0) return <div className="text-center text-muted-foreground p-4">No posts found.</div>;

  const openDeleteConfirmDialog = (postId: string) => {
    setPostIdToDelete(postId);
    setIsConfirmDeleteDialogOpen(true);
  };
  const confirmDelete = () => {
    if (postIdToDelete) handleDelete(postIdToDelete);
  };

  // Function to open edit modal
  const openEditModal = (post: PostWithProfile) => {
    setEditingPost(post);
    setIsEditModalOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
        {posts.map((post) => {
          const isOwner = loggedInUser?.id === post.user_id;
          const isSubscriptionLocked = post.is_private && !isOwner;
          const canNavigate = !isSubscriptionLocked;

          let PostContent;
          if (post.type === 'video' && post.video_url) {
            PostContent = (
              <ClientVideoPlayerWrapper
                id={post.id}
                userId={post.user_id}
                username={post.profiles?.username || 'Unknown User'}
                profilePictureUrl={post.profiles?.profile_picture_url || undefined}
                caption={post.caption || ''}
                videoSrc={post.video_url}
                likes={(post.likes_count ?? 0).toString()}
                comments={(post.comments_count ?? 0).toString()}
                shares={'0'}
                isPrivate={post.is_private}
                isOwner={isOwner}
                is_for_sale={post.is_for_sale}
                price={post.price}
                currency={post.currency}
                stripe_price_id={post.stripe_price_id}
                isLocked={isSubscriptionLocked === null ? undefined : isSubscriptionLocked}
                isPaidContent={post.is_private === null ? undefined : post.is_private} // Convert null to undefined
              />
            );
          } else if (post.type === 'image' && post.image_url) {
            PostContent = (
              <ImageCard
                id={post.id}
                userId={post.user_id}
                username={post.profiles?.username || 'Unknown User'}
                profilePictureUrl={post.profiles?.profile_picture_url || undefined}
                caption={post.caption}
                imageUrl={post.image_url}
                likes={post.likes_count ?? 0}
                comments={(post.comments_count ?? 0).toString()}
                shares={'0'}
                isPrivate={post.is_private ?? false} // Revert to ?? false for ImageCard
                isOwner={isOwner}
                initialIsLiked={false}
                is_for_sale={post.is_for_sale}
                price={post.price}
                currency={post.currency}
                stripe_price_id={post.stripe_price_id}
                isLocked={isSubscriptionLocked === null ? undefined : isSubscriptionLocked} // Convert null to undefined
                isPaidContent={post.is_private === null ? undefined : post.is_private} // Convert null to undefined
              />
            );
          } else {
            PostContent = <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-xs p-2">Invalid post data</div>;
          }

          const handleNavigate = () => {
            if (canNavigate) {
              const detailUrl = post.type === 'video' ? `/video/${post.id}` : `/image/${post.id}`;
              router.push(detailUrl);
            } else {
              toast('Subscription required to view this content.'); // Use imported toast
            }
          };

          return (
            <div
              key={post.id}
              className="aspect-[9/16] overflow-hidden rounded-lg relative group bg-black cursor-pointer"
              onClick={handleNavigate}
            >
              <>
                {PostContent}
                {!canNavigate && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 pointer-events-none">
                    <Lock className="h-10 w-10 text-white/80" />
                  </div>
                )}
              </>

              {/* Edit/Delete Buttons for Owner (Top Left) */}
              {allowDeletion && isOwner && (
                <div className="absolute top-2 left-2 z-40 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button
                     variant="outline"
                     size="icon"
                     className="h-7 w-7 bg-black/50 hover:bg-black/70 border-white/30 text-white"
                     onClick={(e) => {
                       e.stopPropagation();
                       e.preventDefault();
                       openEditModal(post);
                     }}
                     aria-label="Edit post"
                   >
                     <Pencil className="h-4 w-4" />
                   </Button>
                   <Button
                     variant="destructive"
                     size="icon"
                     className="h-7 w-7 bg-black/50 hover:bg-red-700"
                     onClick={(e) => {
                       e.stopPropagation();
                       e.preventDefault();
                       openDeleteConfirmDialog(post.id);
                     }}
                     disabled={deletingId === post.id}
                     aria-label="Delete post"
                   >
                     {deletingId === post.id ? (
                       <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                     ) : (
                       <Trash2 className="h-4 w-4" />
                     )}
                   </Button>
                 </div>
              )}

              {deletingId === post.id && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white z-50">Deleting...</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete this post? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteDialogOpen(false)} disabled={!!deletingId}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={!!deletingId}>
              {deletingId ? 'Deleting...' : 'Delete Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostSaleModal
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          postData={{
             id: editingPost.id,
             user_id: editingPost.user_id,
             caption: editingPost.caption,
             is_for_sale: editingPost.is_for_sale,
             price: editingPost.price,
             currency: editingPost.currency,
             stripe_product_id: editingPost.stripe_product_id,
             stripe_price_id: editingPost.stripe_price_id,
          }}
          onSaveSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['posts', userId] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            setEditingPost(null);
          }}
        />
      )}
    </>
  );
}
