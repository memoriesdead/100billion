'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, format } from 'date-fns';
import { ImageIcon, Send, Loader2, MoreHorizontal, AlignLeft, Type, Edit, CheckCircle, Smile, X, Trash2, Link as LinkIcon, Flag } from 'lucide-react';
import { Tables } from '@/lib/database.types';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Corrected path alias if needed, assuming it's @/components/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClientVideoPlayerWrapper } from './ClientVideoPlayerWrapper';
import { PostInteractionButtons } from './PostInteractionButtons';
import { EditPostModal } from './EditPostModal'; // Import the new modal
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

// Define the structure of a post, including profile info
type PostWithProfile = Tables<'posts'> & {
  profiles: Pick<Tables<'profiles'>, 'username' | 'name' | 'profile_picture_url'> | null;
};

// Define type for the profile data needed in this component
type UserProfileData = Pick<Tables<'profiles'>, 'id' | 'username' | 'name' | 'profile_picture_url'> | null;


export default function ProfileHomeFeed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [postIdToDelete, setPostIdToDelete] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for edit modal visibility
  const [editingPost, setEditingPost] = useState<PostWithProfile | null>(null); // State for post being edited

  // Fetch the current user's profile data
  const { data: userProfileData, isLoading: isLoadingProfile } = useQuery<UserProfileData>({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, profile_picture_url')
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching user profile:", error);
        throw error;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch posts for the home feed
  const { data: posts, isLoading: isLoadingPosts, error: postsError } = useQuery<PostWithProfile[]>({
    queryKey: ['homeFeedPosts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: followingData, error: followingError } = await supabase
        .from('relationships')
        .select('followed_uid')
        .eq('follower_uid', user.id);
      if (followingError) throw new Error(followingError.message);
      const followedIds = followingData?.map(f => f.followed_uid) || [];
      const userIdsToFetch = [user.id, ...followedIds];
      const { data, error } = await supabase
        .from('posts')
        .select(`*, profiles ( username, name, profile_picture_url )`)
        .in('user_id', userIdsToFetch)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as PostWithProfile[];
    },
    enabled: !!user?.id,
  });

  // Mutation for creating a new post (text or image)
  const createPostMutation = useMutation({
    mutationFn: async ({ content, imageFile }: { content: string; imageFile: File | null }) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!content.trim() && !imageFile) throw new Error("Post content or image cannot be empty");

      let imageUrl: string | null = null;
      let postType: 'text' | 'image' = 'text';
      let filePath: string | null = null; // Declare filePath outside the if block

      // --- Image Upload Logic ---
      if (imageFile) {
        postType = 'image';
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        filePath = `${fileName}`; // Assign value here

        console.log(`Uploading image to bucket 'posts' at path: ${filePath}`);

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, imageFile, {
             cacheControl: '3600',
             upsert: false,
          });

        if (uploadError) {
          console.error("Supabase storage upload error:", uploadError);
          if (uploadError.message.includes('Bucket not found')) {
             throw new Error("Storage bucket 'posts' not found. Please create it in Supabase.");
          } else if (uploadError.message.includes('policy')) {
             throw new Error("Storage policy violation. Check bucket permissions.");
          }
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);
        imageUrl = urlData?.publicUrl;

        if (!imageUrl) {
           console.error("Failed to get public URL for uploaded image.");
           throw new Error("Failed to get public URL for image");
        }
        console.log("Image uploaded successfully. Public URL:", imageUrl);
      }
      // --- End Image Upload Logic ---

      // Insert post record into the database
      try {
        const { data, error: insertError } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            caption: content.trim() || null,
            type: postType,
            image_url: imageUrl,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          throw insertError; // Throw error to be caught below
        }
        console.log("Post record created successfully:", data);
        return data;
      } catch (insertError: unknown) { // Catch the error here
        const message = insertError instanceof Error ? insertError.message : String(insertError);
        console.error("Error inserting post record:", insertError);
        // If insert fails after upload, attempt to delete the uploaded storage object
        if (imageUrl && filePath) { // Check if filePath is not null
           console.warn("Post insert failed after image upload. Attempting to delete uploaded image:", filePath);
           // Use await here for cleanup
           await supabase.storage.from('posts').remove([filePath]);
        }
        // Re-throw the error after cleanup attempt
        throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeFeedPosts', user?.id] });
      setNewPostContent('');
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setShowEmojiPicker(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    },
    onError: (error) => {
      console.error("Failed to create post (Mutation onError):", error);
      // Display user-friendly error message here (e.g., using a toast library)
      alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const handleCreatePost = () => {
    createPostMutation.mutate({ content: newPostContent, imageFile: selectedImageFile });
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
    } else {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  const clearSelectedImage = () => {
     setSelectedImageFile(null);
     setImagePreviewUrl(null);
     if (imageInputRef.current) {
       imageInputRef.current.value = '';
     }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewPostContent(prevInput => prevInput + emojiData.emoji);
  };

  const getDisplayTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
     }
  };

  // --- Start of new handlers ---

  // Handler to copy post link
  const handleCopyLink = useCallback((postId: string, postType: 'video' | 'image') => {
    const url = postType === 'video'
      ? `${window.location.origin}/video/${postId}`
      : `${window.location.origin}/image/${postId}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(err => {
        console.error('Failed to copy link:', err);
        toast.error("Failed to copy link.");
      });
  }, []);

  // Placeholder handler for editing post - Updated
  const handleEditPost = useCallback((post: PostWithProfile) => {
    setEditingPost(post);
    setIsEditModalOpen(true);
  }, []);

  // Handler to open delete confirmation dialog
  const openDeleteConfirmDialog = useCallback((postId: string) => {
    setPostIdToDelete(postId);
    setIsConfirmDeleteDialogOpen(true);
  }, []);

  // Handler for actual deletion after confirmation
  const handleDeletePost = useCallback(async () => {
    if (!postIdToDelete || !user) return;

    // Find the post to potentially delete associated storage objects
    const postToDelete = posts?.find(p => p.id === postIdToDelete);

    try {
      // Delete from 'posts' table
      const { error: dbError } = await supabase
        .from('posts')
        .delete()
        .match({ id: postIdToDelete, user_id: user.id }); // Ensure ownership

      if (dbError) throw dbError;

      // Attempt to delete associated storage object if it exists
      if (postToDelete) {
        let filePathToDelete: string | null = null;
        if (postToDelete.type === 'image' && postToDelete.image_url) {
          try {
            const urlParts = postToDelete.image_url.split('/posts/');
            if (urlParts.length > 1) filePathToDelete = decodeURIComponent(urlParts[1]);
          } catch (e) { console.error("Error parsing image URL for deletion:", e); }
        } else if (postToDelete.type === 'video' && postToDelete.video_url) {
           try {
             const urlParts = postToDelete.video_url.split('/posts/');
             if (urlParts.length > 1) filePathToDelete = decodeURIComponent(urlParts[1]);
           } catch (e) { console.error("Error parsing video URL for deletion:", e); }
        }

        if (filePathToDelete) {
          console.log("Attempting to delete storage object:", filePathToDelete);
          const { error: storageError } = await supabase.storage.from('posts').remove([filePathToDelete]);
          if (storageError) {
            // Log storage error but don't necessarily block UI feedback if DB delete succeeded
            console.error("Error deleting storage object:", storageError);
            toast.warning("Post deleted, but failed to remove associated file from storage.");
          } else {
             console.log("Storage object deleted successfully.");
          }
        }
      }

      toast.success("Post deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ['homeFeedPosts', user.id] }); // Refresh feed
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to delete post: ${message}`);
      console.error('Error deleting post:', message);
    } finally {
      setIsConfirmDeleteDialogOpen(false);
      setPostIdToDelete(null);
    }
  }, [postIdToDelete, user, queryClient, posts]); // Added posts dependency

  // Placeholder handler for reporting post
  const handleReportPost = useCallback((postId: string) => {
    // TODO: Implement report functionality
    toast.info(`Report action triggered for post ${postId}. (Not implemented)`);
  }, []);

  // --- End of new handlers ---


  return (
    <div className="space-y-4 max-w-xl mx-auto"> {/* Reduced max-width further and centering */}
      {/* Compose Post Section */}
      <Card className="mb-4 relative">
        <CardHeader className="border-b p-4">
          <div className="text-muted-foreground text-sm mb-3">Compose new post...</div>
          <div className="flex space-x-4">
             <input
               type="file"
               ref={imageInputRef}
               onChange={handleFileChange}
               accept="image/png, image/jpeg, image/webp"
               className="hidden"
               aria-label="Upload image"
             />
             <ImageIcon
               size={20}
               className="text-muted-foreground cursor-pointer hover:text-foreground"
               onClick={handleImageClick}
               aria-label="Add image"
             />
            <AlignLeft size={20} className="text-muted-foreground cursor-pointer hover:text-foreground" aria-label="Format text" />
            <Type size={20} className="text-muted-foreground cursor-pointer hover:text-foreground" aria-label="Text options" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-4">
           <div className="flex items-start space-x-3 mb-2">
             {isLoadingProfile ? (
               <Avatar className="w-10 h-10 flex-shrink-0 bg-muted rounded-full" />
             ) : (
               <Avatar className="w-10 h-10 flex-shrink-0">
                 <AvatarImage src={userProfileData?.profile_picture_url ?? undefined} alt={userProfileData?.username ?? 'User'} />
                 <AvatarFallback>{userProfileData?.name?.charAt(0)?.toUpperCase() ?? userProfileData?.username?.charAt(0)?.toUpperCase() ?? 'U'}</AvatarFallback>
               </Avatar>
             )}
             <Textarea
               placeholder="Compose new post..."
               value={newPostContent}
               onChange={(e) => setNewPostContent(e.target.value)}
               className="flex-grow resize-none border rounded-md p-2 min-h-[60px]"
               rows={2}
             />
           </div>
           {imagePreviewUrl && (
             <div className="ml-13 mb-3 relative w-32 h-32">
               <Image
                 src={imagePreviewUrl}
                 alt="Selected image preview"
                 layout="fill"
                 objectFit="cover"
                 className="rounded-md border"
                 // Clean up object URL on unmount or when preview changes
                 onLoad={() => { if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl) }}
               />
               <Button
                 variant="destructive"
                 size="icon"
                 className="absolute top-1 right-1 h-6 w-6 rounded-full"
                 onClick={clearSelectedImage}
                 aria-label="Remove selected image"
               >
                 <X size={14} />
               </Button>
             </div>
           )}
           <div className="flex justify-between items-center">
              <Button
                 variant="ghost"
                 size="icon"
                 className="text-muted-foreground hover:text-foreground"
                 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                 aria-label="Add emoji"
               >
                 <Smile size={20} />
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={(!newPostContent.trim() && !selectedImageFile) || createPostMutation.isPending || isLoadingProfile}
                size="sm"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...
                  </>
                ) : (
                  'Post'
                )}
              </Button>
           </div>
           {showEmojiPicker && (
             <div className="absolute z-10 mt-2 right-0 sm:right-auto sm:left-12">
               <EmojiPicker
                 onEmojiClick={onEmojiClick}
                 autoFocusSearch={false}
                 lazyLoadEmojis={true}
                 height={350}
               />
             </div>
           )}
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <div className="flex p-3 space-x-2 border-b border-border bg-card rounded-t-lg">
        <Badge variant="default" className="cursor-pointer">All</Badge>
        <Badge variant="secondary" className="cursor-pointer flex items-center">
          <Edit size={14} className="mr-1" />
        </Badge>
      </div>


      {/* Posts Feed */}
      {isLoadingPosts && (
         <div className="flex justify-center items-center py-10">
           <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
           <span className="ml-2 text-muted-foreground">Loading posts...</span>
         </div>
      )}
      {postsError && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 text-destructive-foreground">
            Error loading posts: {(postsError as Error).message}
          </CardContent>
        </Card>
      )}
      {!isLoadingPosts && !postsError && posts?.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Your feed is empty. Follow some users or create a post!
          </CardContent>
        </Card>
      )}
      {posts?.map((post) => (
        <Card key={post.id} className="rounded-none first:rounded-t-lg last:rounded-b-lg border-t-0 first:border-t">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={post.profiles?.profile_picture_url ?? undefined} alt={post.profiles?.username ?? 'User'} />
                  <AvatarFallback>{post.profiles?.name?.charAt(0)?.toUpperCase() ?? post.profiles?.username?.charAt(0)?.toUpperCase() ?? 'U'}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <div className="font-semibold flex items-center text-foreground">
                    {post.profiles?.name ?? post.profiles?.username ?? 'Unknown User'}
                  </div>
                  <div className="text-muted-foreground text-sm">@{post.profiles?.username ?? 'username'}</div>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-muted-foreground text-sm mr-2">{getDisplayTime(post.created_at)}</div>
                {/* Dropdown Menu Trigger */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground h-6 w-6">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}> {/* Added type for 'e' */}
                    <DropdownMenuItem onClick={() => handleCopyLink(post.id, post.type as 'video' | 'image')}>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      <span>Copy link</span>
                    </DropdownMenuItem>
                    {user?.id === post.user_id ? (
                      <>
                        <DropdownMenuItem onClick={() => handleEditPost(post)}> {/* Pass the whole post object */}
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit post</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-700 focus:bg-red-50"
                          onClick={() => openDeleteConfirmDialog(post.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete post</span>
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem onClick={() => handleReportPost(post.id)}>
                        <Flag className="mr-2 h-4 w-4" />
                        <span>Report post</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Post Content */}
            {post.caption && (
              <p className="text-foreground text-sm mb-2 whitespace-pre-wrap">
                {post.caption.split(/(\s)/).map((word, index) =>
                  word.startsWith('@') ? (
                    <span key={index} className="text-primary cursor-pointer hover:underline">{word}</span>
                  ) : word.match(/^(https?:\/\/[^\s]+)/) ? (
                    <a key={index} href={word} target="_blank" rel="noopener noreferrer" className="text-primary cursor-pointer hover:underline">{word}</a>
                  ) : (
                    word
                  )
                )}
              </p>
            )}

            {/* Media */}
            {post.type === 'image' && post.image_url && (
              <div className="mt-3 relative rounded-lg overflow-hidden border max-w-full">
                {post.image_url !== '/api/placeholder/400/300' ? (
                   <Image src={post.image_url} alt="Post image" width={600} height={600} className="object-contain w-full h-auto" />
                ) : (
                   <div className="w-full h-64 bg-muted flex items-center justify-center text-muted-foreground">Image Loading...</div>
                 )}
                 {/* Add Interaction Buttons for Images */}
                 <PostInteractionButtons
                   postId={post.id}
                   userId={post.user_id}
                   username={post.profiles?.username ?? 'user'}
                   profilePictureUrl={post.profiles?.profile_picture_url ?? undefined}
                   initialLikes={post.likes_count ?? 0}
                   initialIsLiked={false} // Assuming initial state is not liked; adjust if needed
                   commentsCount={(post.comments_count ?? 0).toString()}
                   sharesCount={"0"} // Assuming shares count is 0; adjust if needed
                   initialIsPrivate={post.is_private ?? false}
                   isOwner={post.user_id === user?.id}
                   postType="image"
                   is_for_sale={post.is_for_sale ?? false}
                   price={post.price}
                   currency={post.currency}
                 />
              </div>
             )}
             {post.type === 'video' && post.video_url && (
                <div className="mt-3 rounded-lg overflow-hidden border bg-black"> {/* Removed aspect-video */}
                  <ClientVideoPlayerWrapper
                    id={post.id}
                    username={post.profiles?.username ?? 'user'}
                    profilePictureUrl={post.profiles?.profile_picture_url ?? undefined}
                    caption={post.caption ?? ''}
                    videoSrc={post.video_url}
                    posterSrc={post.thumbnail_url ?? undefined}
                    likes={(post.likes_count ?? 0).toString()}
                    comments={(post.comments_count ?? 0).toString()}
                    shares={"0"}
                    isPrivate={post.is_private}
                    isOwner={post.user_id === user?.id}
                    userId={post.user_id}
                    is_for_sale={post.is_for_sale}
                    price={post.price}
                    currency={post.currency}
                    stripe_price_id={post.stripe_price_id}
                    isLocked={false}
                    isPaidContent={post.is_for_sale || post.is_private}
                  />
                </div>
             )}
           </CardContent>
        </Card>
      ))}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePost}>
              Delete Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          postId={editingPost.id}
          initialCaption={editingPost.caption}
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSaveSuccess={() => {
            setEditingPost(null); // Clear editing state on success
          }}
        />
      )}
    </div>
  );
}
