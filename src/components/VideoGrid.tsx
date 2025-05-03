"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ClientVideoPlayerWrapper } from "./ClientVideoPlayerWrapper";
import { ImageCard } from './ImageCard';
import { Button } from '@/components/ui/button';
import { Trash2, Lock, Pencil, MoreHorizontal, Link as LinkIcon, Flag, Edit as EditIcon } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Removed EditPostSaleModal import as EditPostModal handles caption edits
import { EditPostModal } from './EditPostModal';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tables } from '@/lib/database.types'; // Import Tables type

// Define types (assuming Tables<'posts'> includes all necessary fields)
type PostWithProfile = Tables<'posts'> & {
  profiles: Pick<Tables<'profiles'>, 'username' | 'profile_picture_url'> | null; // Simplified profile type
};

// RawPostData might be redundant if Tables<'posts'> is accurate, but kept for safety
type RawPostData = Tables<'posts'> & {
  profiles: Pick<Tables<'profiles'>, 'username' | 'profile_picture_url'> | null;
};


interface VideoGridProps {
  userId?: string; // For profile page
  searchQuery?: string; // For search results
  followedUserIds?: string[]; // For following feed
  allowDeletion?: boolean;
  disableClickToPlay?: boolean;
  hideProgressBar?: boolean;
  gridColsClass?: string; // New prop for custom grid columns
}

export function VideoGrid({
  userId,
  searchQuery,
  followedUserIds,
  allowDeletion = false,
  disableClickToPlay = false,
  hideProgressBar = false,
  gridColsClass // Destructure the new prop
}: VideoGridProps) {
  const router = useRouter();
  const { user: loggedInUser } = useAuth();
  const queryClient = useQueryClient();

  // --- State Hooks ---
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [postIdToDelete, setPostIdToDelete] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostWithProfile | null>(null);

  // --- Mutations ---
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!loggedInUser) throw new Error("User not authenticated.");
      const postToDelete = posts?.find(p => p.id === postId);
      const { error: dbError } = await supabase
        .from('posts')
        .delete()
        .match({ id: postId, user_id: loggedInUser.id });
      if (dbError) throw dbError;

      if (postToDelete) {
        let filePathToDelete: string | null = null;
        if (postToDelete.type === 'image' && postToDelete.image_url) {
          try { filePathToDelete = decodeURIComponent(postToDelete.image_url.split('/posts/')[1]); } catch (e) { console.error("Error parsing image URL:", e); }
        } else if (postToDelete.type === 'video' && postToDelete.video_url) {
          try { filePathToDelete = decodeURIComponent(postToDelete.video_url.split('/posts/')[1]); } catch (e) { console.error("Error parsing video URL:", e); }
        }
        if (filePathToDelete) {
          const { error: storageError } = await supabase.storage.from('posts').remove([filePathToDelete]);
          if (storageError) toast.warning("Post deleted, but failed to remove file.");
        }
      }
      return postId;
    },
    onSuccess: (deletedPostId: string) => {
      toast.success("Post deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ['posts', userId] });
      queryClient.invalidateQueries({ queryKey: ['homeFeedPosts', loggedInUser?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
    onSettled: () => {
      setIsConfirmDeleteDialogOpen(false);
      setPostIdToDelete(null);
    }
  });

  // --- Callback Hooks ---
  const openDeleteConfirmDialog = useCallback((postId: string) => {
    setPostIdToDelete(postId);
    setIsConfirmDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (postIdToDelete) {
      deletePostMutation.mutate(postIdToDelete);
    }
  }, [postIdToDelete, deletePostMutation]);

  const openEditModal = useCallback((post: PostWithProfile) => {
    setEditingPost(post);
    setIsEditModalOpen(true);
  }, []);

  const handleCopyLink = useCallback((postId: string, postType: 'video' | 'image') => {
    const url = `${window.location.origin}/${postType}/${postId}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link copied!"))
      .catch(() => toast.error("Failed to copy link."));
  }, []);

  const handleReportPost = useCallback((postId: string) => {
    toast.info(`Report action for post ${postId}. (Not implemented)`);
  }, []);

  // --- Effect Hooks ---
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('posts')
          .select(`*, profiles (username, profile_picture_url)`) // Select necessary profile fields
          .order('created_at', { ascending: false });

        if (userId) {
          query = query.eq('user_id', userId);
        } else if (searchQuery?.trim()) {
          query = query.ilike('caption', `%${searchQuery}%`).eq('is_private', false);
        } else if (followedUserIds && followedUserIds.length > 0) {
          query = query.in('user_id', followedUserIds);
        } else {
          query = query.eq('is_private', false).eq('is_for_sale', false);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        // Ensure data is correctly typed
        setPosts((data as PostWithProfile[]) || []);

      } catch (err: unknown) {
        console.error("Error fetching posts:", err); // Log the raw error
        let errorMessage = "An unknown error occurred while fetching posts.";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
          // Handle Supabase error objects or other objects with a message property
          errorMessage = err.message;
        }
        // Set a clear, user-friendly string state
        setError(`Failed to load search results: ${errorMessage}`);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [userId, searchQuery, followedUserIds, supabase]); // Added supabase as dependency

  // --- Render Logic ---
  if (loading) return <div className="text-center p-4">Loading posts...</div>;
  if (error) return <div className="text-center text-red-500 p-4">{error}</div>;
  if (posts.length === 0) return <div className="text-center text-muted-foreground p-4">No posts found.</div>;

  // Define default grid classes if custom ones aren't provided
  const defaultGridClasses = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  const finalGridClasses = gridColsClass || defaultGridClasses;

  return (
    <>
      {/* Use finalGridClasses for the grid layout */}
      <div className={`grid ${finalGridClasses} gap-4 p-4`}>
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
                shares={'0'} // Assuming shares are not tracked or displayed here
                isPrivate={post.is_private}
                isOwner={isOwner}
                is_for_sale={post.is_for_sale ?? false}
                price={post.price}
                currency={post.currency}
                stripe_price_id={post.stripe_price_id}
                isLocked={isSubscriptionLocked ?? undefined}
                isPaidContent={post.is_private ?? undefined}
                disableClickToPlay={disableClickToPlay}
                hideProgressBar={hideProgressBar}
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
                shares={'0'} // Assuming shares are not tracked or displayed here
                isPrivate={post.is_private ?? false}
                isOwner={isOwner}
                initialIsLiked={false} // Needs actual like status if available
                is_for_sale={post.is_for_sale ?? false}
                price={post.price}
                currency={post.currency}
                stripe_price_id={post.stripe_price_id}
                isLocked={isSubscriptionLocked ?? undefined}
                isPaidContent={post.is_private ?? undefined}
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
              toast('Subscription required to view this content.');
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

              {/* Top-Left Buttons (Kept for now, consider removing if dropdown replaces fully) */}
              {allowDeletion && isOwner && (
                <div className="absolute top-2 left-2 z-40 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   {/* This button now opens the caption edit modal */}
                   <Button
                     variant="outline" size="icon" className="h-7 w-7 bg-black/50 hover:bg-black/70 border-white/30 text-white"
                     onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEditModal(post); }}
                     aria-label="Edit post caption"
                   > <Pencil className="h-4 w-4" /> </Button>
                   {/* This button opens the delete confirmation */}
                   <Button
                     variant="destructive" size="icon" className="h-7 w-7 bg-black/50 hover:bg-red-700"
                     onClick={(e) => { e.stopPropagation(); e.preventDefault(); openDeleteConfirmDialog(post.id); }}
                     disabled={deletePostMutation.isPending && postIdToDelete === post.id}
                     aria-label="Delete post"
                   >
                     {(deletePostMutation.isPending && postIdToDelete === post.id) ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <Trash2 className="h-4 w-4" />}
                   </Button>
                 </div>
              )}

              {/* More Options Dropdown (Top Right) */}
              <div className="absolute top-2 right-2 z-40 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => handleCopyLink(post.id, post.type as 'video' | 'image')}>
                      <LinkIcon className="mr-2 h-4 w-4" /><span>Copy link</span>
                    </DropdownMenuItem>
                    {isOwner ? (
                      <>
                        <DropdownMenuItem onClick={() => openEditModal(post)}>
                          <EditIcon className="mr-2 h-4 w-4" /><span>Edit caption</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => openDeleteConfirmDialog(post.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /><span>Delete post</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => handleReportPost(post.id)}>
                        <Flag className="mr-2 h-4 w-4" /><span>Report post</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete this post? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteDialogOpen(false)} disabled={deletePostMutation.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePostMutation.isPending}>
              {deletePostMutation.isPending ? 'Deleting...' : 'Delete Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Caption Modal */}
      {editingPost && (
        <EditPostModal
          postId={editingPost.id}
          initialCaption={editingPost.caption}
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSaveSuccess={() => setEditingPost(null)}
        />
      )}
    </>
  );
}
