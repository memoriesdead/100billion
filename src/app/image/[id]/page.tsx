"use client";

import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from '@/context/AuthContext';
import { PostInteractionButtons } from '@/components/PostInteractionButtons';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Heart, MessageCircle, Bookmark, Send, X } from 'lucide-react';
import type { Tables } from "@/lib/database.types";

// Define the type for a single post with profile info
type PostDetail = {
  id: string;
  user_id: string;
  caption: string | null;
  type: 'image';
  image_url: string;
  likes_count: number | null;
  comments_count: number | null;
  is_private: boolean | null;
  is_for_sale: boolean; // Add is_for_sale
  created_at: string;
  profiles: {
    username: string | null;
    profile_picture_url: string | null;
  } | null;
};

// Type for comments, ensuring profiles relation is correctly typed
type CommentWithProfile = Tables<'comments'> & {
  profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'profile_picture_url'> | null;
};

export default function ImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: loggedInUser } = useContext(AuthContext);
  const postId = params.id as string;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  // Function to fetch comments
  const fetchComments = useCallback(async () => {
     if (!postId) return;
     setLoadingComments(true);
     setCommentError(null);
     try {
       // 1. Fetch comments without profile data first
       const { data: commentsData, error: commentFetchError } = await supabase
         .from('comments')
         .select(`*`)
         .eq('post_id', postId)
         .order('created_at', { ascending: true });

       if (commentFetchError) throw commentFetchError;
       if (!commentsData) {
          setComments([]);
          return;
       }

       // 2. Extract unique user IDs
       const userIds = [...new Set(commentsData.map(c => c.user_id).filter(id => id))];

       // 3. Fetch profiles
       const profilesMap: Map<string, Pick<Tables<'profiles'>, 'id' | 'username' | 'profile_picture_url'>> = new Map();
       if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, profile_picture_url')
            .in('id', userIds);

          if (profilesError) {
             console.error("Error fetching comment author profiles:", profilesError);
          } else if (profilesData) {
             profilesData.forEach(p => profilesMap.set(p.id, p));
          }
       }

       // 4. Combine comments and profiles
       const commentsWithProfiles = commentsData.map(comment => ({
         ...comment,
         profiles: profilesMap.get(comment.user_id) || null,
       }));

       setComments(commentsWithProfiles as CommentWithProfile[]);

     } catch (err: unknown) {
       const message = err instanceof Error ? err.message : String(err);
       console.error("Error fetching comments for image:", err);
       setCommentError(`Failed to load comments: ${message}`);
       setComments([]);
     } finally {
       setLoadingComments(false);
     }
  }, [postId]); // Dependency on postId

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) {
        setError("Post ID is missing.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(`*, is_for_sale, profiles (username, profile_picture_url)`) // Select is_for_sale
          .eq('id', postId)
          .eq('type', 'image')
          .single();
        if (fetchError) throw fetchError;
        if (!data) throw new Error("Image post not found.");
        if (data.type !== 'image' || !data.image_url) throw new Error("Fetched post is not a valid image post.");
        setPost(data as PostDetail);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error fetching image post:", err);
        setError(message || "Failed to load image post.");
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    const checkLikeStatus = async () => {
      if (!loggedInUser || !postId) return;
      try {
        const { data, error } = await supabase.from('likes').select('id').eq('user_id', loggedInUser.id).eq('post_id', postId).maybeSingle();
        if (error) throw error;
        setIsLiked(!!data);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error fetching like status for image:', message);
      }
    };

    fetchPost();
    checkLikeStatus();
    fetchComments();
  }, [postId, loggedInUser, fetchComments]); // Add fetchComments to dependency array

  // Callbacks for interaction component
  const handleLikeSuccess = useCallback((newLikesCount: number) => {
    setPost(currentPost => currentPost ? { ...currentPost, likes_count: newLikesCount } : null);
  }, []);

  const handleCommentSuccess = useCallback(() => {
    setPost(currentPost => currentPost ? { ...currentPost, comments_count: (currentPost.comments_count ?? 0) + 1 } : null);
    // Refetch comments to ensure list is up-to-date after posting (simpler than merging)
    fetchComments();
  }, [fetchComments]); // Add fetchComments dependency

  // Comment posting logic
  const handlePostComment = useCallback(async () => {
     if (!newComment.trim() || !loggedInUser || !postId) return;
     const originalCommentText = newComment; // Store original text for potential revert
     setNewComment(""); // Clear input optimistically

     const commentToPost = {
       post_id: postId,
       user_id: loggedInUser.id,
       text: originalCommentText.trim(),
     };

     try {
       const { error: insertError } = await supabase
         .from('comments')
         .insert(commentToPost);

       if (insertError) throw insertError;

       handleCommentSuccess(); // Call success callback to update count and refetch comments

     } catch (err: unknown) {
       const message = err instanceof Error ? err.message : String(err);
       console.error("Error posting comment:", err);
       setCommentError(`Failed to post comment: ${message}`);
       setNewComment(originalCommentText); // Revert input field on error
       // No need to revert optimistic comment list update as fetchComments will run
     }
  }, [newComment, loggedInUser, postId, handleCommentSuccess]); // Add handleCommentSuccess dependency

  // Placeholder handlers
  const handleBookmark = () => setIsBookmarked(!isBookmarked);
  const handleShare = () => { /* TODO */ };

  // Loading/Error/Not Found states
  if (loading) return <div className="fixed inset-0 flex justify-center items-center bg-black text-white z-50">Loading...</div>;
  if (error) return (
    <div className="fixed inset-0 flex flex-col justify-center items-center bg-black text-white z-50 p-4">
      <Alert variant="destructive" className="max-w-md"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      <Button variant="secondary" onClick={() => router.back()} className="mt-4">Go Back</Button>
    </div>
  );
  if (!post) return (
    <div className="fixed inset-0 flex flex-col justify-center items-center bg-black text-white z-50 p-4">
      <Alert className="max-w-md"><AlertTitle>Not Found</AlertTitle><AlertDescription>This image post could not be found.</AlertDescription></Alert>
      <Button variant="secondary" onClick={() => router.back()} className="mt-4">Go Back</Button>
    </div>
  );

  const isOwner = loggedInUser?.id === post.user_id;

  return (
    <div className="fixed inset-0 flex bg-background text-foreground z-50">
       <Button variant="ghost" size="icon" className="absolute top-4 left-4 text-white bg-black/50 hover:bg-black/70 rounded-full z-50" onClick={() => router.back()} aria-label="Close image"><X size={24} /></Button>
       <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative">
         <img src={post.image_url} alt={post.caption || 'Image post'} className="block max-w-full max-h-full object-contain" />
         <PostInteractionButtons
           postId={post.id}
           userId={post.user_id}
           username={post.profiles?.username || 'Unknown User'}
           profilePictureUrl={post.profiles?.profile_picture_url || undefined}
           initialLikes={post.likes_count ?? 0}
           initialIsLiked={isLiked}
           commentsCount={(post.comments_count ?? 0).toString()}
           sharesCount={'0'}
           initialIsPrivate={post.is_private ?? false}
           isOwner={isOwner}
           postType="image"
           is_for_sale={post.is_for_sale ?? false} // Pass is_for_sale (default to false if null/undefined)
           onLikeSuccess={handleLikeSuccess} // Pass callback
         />
       </div>
       <div className="w-[400px] lg:w-[500px] border-l border-border bg-background flex flex-col h-full">
          <div className="p-4 border-b border-border">
             <div className="flex items-center justify-between mb-3">
               <Link href={`/profile/${post.profiles?.username || ''}`} className="flex items-center gap-2 group">
                 <Avatar className="w-10 h-10"><AvatarImage src={post.profiles?.profile_picture_url || undefined} alt={post.profiles?.username || 'User'} /><AvatarFallback>{post.profiles?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback></Avatar>
                 <div><p className="font-semibold group-hover:underline">{post.profiles?.username || 'Unknown User'}</p></div>
               </Link>
               {!isOwner && <Button variant="outline" size="sm">Follow</Button>}
             </div>
             {post.caption && <p className="text-sm mb-3">{post.caption}</p>}
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-4">
                 <button className="flex items-center gap-1.5 text-sm hover:text-primary" onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth' })}>
                   <MessageCircle size={20} />{post.comments_count ?? 0}
                 </button>
                 <button onClick={handleBookmark} className="flex items-center gap-1.5 text-sm hover:text-primary">
                   <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} /> 0
                 </button>
               </div>
               <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" className="hover:bg-muted" aria-label="Share options" onClick={handleShare}><Send size={20} /></Button>
               </div>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4" id="comments">
             {loadingComments && <p className="text-muted-foreground text-center">Loading comments...</p>}
             {commentError && <p className="text-red-500 text-center">{commentError}</p>}
             {!loadingComments && comments.length === 0 && <p className="text-muted-foreground text-center">No comments yet.</p>}
             {comments.map((comment) => (
               <div key={comment.id} className="flex items-start gap-2">
                 <Avatar className="w-8 h-8"><AvatarImage src={comment.profiles?.profile_picture_url ?? undefined} alt={comment.profiles?.username ?? 'User'} /><AvatarFallback>{comment.profiles?.username?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback></Avatar>
                 <div className="text-sm flex-1">
                   <p><span className="font-semibold mr-1">{comment.profiles?.username ?? 'User'}</span>{comment.text}</p>
                   <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                     <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                   </div>
                 </div>
               </div>
             ))}
          </div>
          <div className="p-4 border-t border-border bg-background">
             {!loggedInUser ? (
               <p className="text-sm text-muted-foreground text-center"><Link href="#" className="text-primary hover:underline" onClick={(e) => { e.preventDefault(); /* TODO: Trigger login modal */ }}>Log in</Link> to add a comment.</p>
             ) : (
               <div className="flex items-center gap-2">
                 <Input placeholder="Add comment..." className="flex-1" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handlePostComment()} />
                 <Button onClick={handlePostComment} disabled={!newComment.trim()}>Post</Button>
               </div>
             )}
          </div>
       </div>
    </div>
  );
}
