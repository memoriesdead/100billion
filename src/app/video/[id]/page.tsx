"use client";

import { useState, useEffect, useCallback } from "react"; // Add useCallback
import { useParams, useRouter } from "next/navigation"; // Import useRouter
import Link from 'next/link'; // Import Link
import { ClientVideoPlayerWrapper } from "@/components/ClientVideoPlayerWrapper"; // Import player wrapper
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from '@/context/AuthContext'; // Import useAuth for posting comments
import type { Tables } from "@/lib/database.types"; // Import types
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Re-import Avatar
import { Button } from "@/components/ui/button"; // Re-import Button
import { Input } from "@/components/ui/input"; // Re-import Input
import { Separator } from "@/components/ui/separator"; // Re-import Separator
// Import icons, add Trash2 for delete, Share2 for general share, and placeholders
import { Heart, MessageCircle, Send, Bookmark, Copy, X, Trash2, Share2, Facebook, Twitter, Link2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns'; // Import date formatting function
// Keep Avatar imports if needed elsewhere, or remove if truly unused after layout change
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Keep other UI imports if needed for future comment implementation
// import { FaHeart, FaComment, FaShare, FaLink, FaCode } from "react-icons/fa";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Separator } from "@/components/ui/separator";
// import { cn } from "@/lib/utils";

// Define combined type for post and profile data
type PostWithProfile = Tables<'posts'> & {
  // Ensure profiles relation includes all fields needed by VerticalVideoPlayer
  // Include necessary fields for the right column
  // Removed 'uid' as it's not in the updated profiles type
  profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'profile_picture_url' | 'name'> | null; // Added 'id' for join key
};

// Type for comments, ensuring profiles relation is correctly typed
type CommentWithProfile = Tables<'comments'> & {
  // Added 'id' for join key
  profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'profile_picture_url'> | null;
};


export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter(); // For close button
  const { user: loggedInUser } = useAuth(); // Get logged-in user for posting
  const videoId = params.id as string;

  // State for fetched data, loading, and errors
  const [postData, setPostData] = useState<PostWithProfile | null>(null);
  const [comments, setComments] = useState<CommentWithProfile[]>([]); // Use updated type
  const [loading, setLoading] = useState(true); // Loading for post data
  const [error, setError] = useState<string | null>(null); // Error for post data
  const [loadingComments, setLoadingComments] = useState(false); // Separate loading for comments
  const [commentError, setCommentError] = useState<string | null>(null); // Separate error for comments
  const [newComment, setNewComment] = useState(""); // State for new comment input
  const [isLiked, setIsLiked] = useState(false); // Placeholder state
  const [isBookmarked, setIsBookmarked] = useState(false); // Placeholder state
  const [copied, setCopied] = useState(false); // State for copy feedback
  const [isDeleting, setIsDeleting] = useState(false); // State for delete operation

  // --- Delete Handler ---
  const handleDeletePost = useCallback(async () => {
     if (!postData || !loggedInUser || postData.user_id !== loggedInUser.id || isDeleting) return;

     if (!window.confirm('Are you sure you want to delete this video?')) {
       return;
     }

     setIsDeleting(true);
     setError(null); // Clear previous errors

     try {
       // 1. Delete from 'posts' table
       const { error: dbError } = await supabase
         .from('posts')
         .delete()
         .eq('id', postData.id);

       if (dbError) throw dbError;

       // 2. Delete from Storage (video and thumbnail if they exist)
       const storagePathsToDelete: string[] = [];
       if (postData.video_url) {
         try {
           const urlParts = postData.video_url.split('/public/');
           if (urlParts.length >= 2) {
             const bucketAndPath = urlParts[1];
             const firstSlashIndex = bucketAndPath.indexOf('/');
             if (firstSlashIndex !== -1) {
               storagePathsToDelete.push(bucketAndPath.substring(firstSlashIndex + 1));
             }
           }
         } catch (parseError) { console.error("Could not parse video URL for deletion:", postData.video_url, parseError); }
       }
       if (postData.thumbnail_url) {
         try {
           const urlParts = postData.thumbnail_url.split('/public/');
           if (urlParts.length >= 2) {
             const bucketAndPath = urlParts[1];
             const firstSlashIndex = bucketAndPath.indexOf('/');
             if (firstSlashIndex !== -1) {
               storagePathsToDelete.push(bucketAndPath.substring(firstSlashIndex + 1));
             }
           }
         } catch (parseError) { console.error("Could not parse thumbnail URL for deletion:", postData.thumbnail_url, parseError); }
       }

       if (storagePathsToDelete.length > 0) {
         const { error: storageError } = await supabase.storage
           .from('posts') // Assuming 'posts' bucket
           .remove(storagePathsToDelete);
         if (storageError) console.error("Error deleting from storage:", storageError);
       }

       // 3. Navigate away after successful deletion
       router.back(); // Or redirect to profile: router.push(`/profile/${loggedInUser.user_metadata?.username || ''}`);

     } catch (err: unknown) {
       const message = err instanceof Error ? err.message : String(err);
       console.error("Error deleting post:", err);
       setError(`Failed to delete post: ${message}`);
       setIsDeleting(false); // Reset deleting state on error
     }
     // No finally block needed as navigation happens on success
  }, [postData, loggedInUser, isDeleting, router]);


  // Fetch video data from Supabase
  useEffect(() => {
    const fetchVideoData = async () => {
      if (!videoId) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(`*`) // Select only post data initially
          .eq('id', videoId)
          .single(); // Fetch a single post

        if (fetchError) {
          // Handle case where video ID doesn't exist
          if (fetchError.code === 'PGRST116') { // Not found
             throw new Error("Video not found.");
          }
          throw fetchError; // Rethrow other errors
        }

        if (data) {
          // Now fetch the profile data separately using the user_id from the post
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, name, profile_picture_url')
            .eq('id', data.user_id) // Join based on user_id -> profiles.id
            .single();

          if (profileError && profileError.code !== 'PGRST116') { // Ignore 'not found' error for profile, handle below
             console.error("Error fetching post author profile:", profileError);
             // Proceed without profile data or throw? For now, proceed.
          }

          console.log("Fetched Post Data:", data);
          console.log("Fetched Profile Data:", profileData);

          // Combine post and profile data
          // Type assertion needed here as we are manually constructing the joined type
          setPostData({ ...data, profiles: profileData || null } as PostWithProfile);

        } else {
          setError("Video not found."); // Post itself not found
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error fetching video data:", err);
        setError(`Failed to load video: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    // Function to fetch comments
    const fetchComments = async () => {
       if (!videoId) return;
       setLoadingComments(true);
       setCommentError(null);
       try {
         // Use explicit join syntax: foreign_table!fk_column(columns_to_select)
         // 1. Fetch comments without profile data first
         const { data: commentsData, error: commentFetchError } = await supabase
           .from('comments')
           .select(`*`) // Select only comment data
           .eq('post_id', videoId)
           .order('created_at', { ascending: true });

         if (commentFetchError) throw commentFetchError;
         if (!commentsData) {
            setComments([]); // No comments found
            return;
         }

         // 2. Extract unique user IDs from comments
         const userIds = [...new Set(commentsData.map(c => c.user_id).filter(id => id))]; // Filter out potential nulls/undefined

         // 3. Fetch profiles for these user IDs
         const profilesMap: Map<string, Pick<Tables<'profiles'>, 'id' | 'username' | 'profile_picture_url'>> = new Map();
         if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, username, profile_picture_url')
              .in('id', userIds);

            if (profilesError) {
               console.error("Error fetching comment author profiles:", profilesError);
               // Proceed without profile data for comments or throw? For now, proceed.
            } else if (profilesData) {
               profilesData.forEach(p => profilesMap.set(p.id, p));
            }
         }

         // 4. Combine comments and profiles
         const commentsWithProfiles = commentsData.map(comment => ({
           ...comment,
           profiles: profilesMap.get(comment.user_id) || null,
         }));

         // Type assertion needed as we manually constructed the joined type
         setComments(commentsWithProfiles as CommentWithProfile[]);

       } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         console.error("Error fetching comments:", err);
         setCommentError(`Failed to load comments: ${message}`);
         setComments([]);
       } finally {
         setLoadingComments(false);
       }
    };

    fetchVideoData();
    fetchComments(); // Fetch comments along with video data

  }, [videoId]); // Re-run effect if videoId changes

  // --- Action Handlers ---
  const handleLike = () => setIsLiked(!isLiked);
  const handleBookmark = () => setIsBookmarked(!isBookmarked);
  const handleCopyLink = () => {
     const videoUrl = window.location.href;
     navigator.clipboard.writeText(videoUrl).then(() => {
       setCopied(true);
       setTimeout(() => setCopied(false), 2000);
     }).catch(err => console.error('Failed to copy URL: ', err));
  };
  const handlePostComment = useCallback(async () => {
     if (!newComment.trim() || !loggedInUser || !videoId) return;

     const commentToPost = {
       post_id: videoId,
       user_id: loggedInUser.id,
       text: newComment.trim(),
     };

     // Optimistic UI update (optional but good UX)
     const optimisticComment: CommentWithProfile = {
        ...commentToPost,
        id: `temp-${Date.now()}`, // Temporary ID
        created_at: new Date().toISOString(),
        profiles: { // Use logged-in user's info for optimistic update
           id: loggedInUser.id, // Add the user ID here
           username: loggedInUser.user_metadata?.user_name || 'You',
           profile_picture_url: loggedInUser.user_metadata?.avatar_url || null,
        }
     };
     setComments(current => [...current, optimisticComment]);
     setNewComment(""); // Clear input immediately

     try {
       // 1. Insert the comment without selecting related data
       const { data: insertedComment, error: insertError } = await supabase
         .from('comments')
         .insert(commentToPost)
         .select() // Select the inserted comment itself
         .single();

       if (insertError) throw insertError;
       if (!insertedComment) throw new Error("Failed to retrieve inserted comment.");

       // 2. Manually construct the final comment object with profile data
       //    (We already have the profile data in optimisticComment.profiles)
       const finalComment: CommentWithProfile = {
         ...insertedComment,
         profiles: optimisticComment.profiles, // Use profile data from optimistic update
       };


       // 3. Replace optimistic comment with the final one
       setComments(current =>
         current.map(c =>
           c.id === optimisticComment.id ? finalComment : c
         )
       );

     } catch (err: unknown) {
       const message = err instanceof Error ? err.message : String(err);
       console.error("Error posting comment:", err);
       setCommentError(`Failed to post comment: ${message}`);
       // Revert optimistic update on error
       setComments(current => current.filter(c => c.id !== optimisticComment.id));
       setNewComment(commentToPost.text); // Put text back in input
     }
  }, [newComment, loggedInUser, videoId]);

  // --- UI Render Logic ---

  // Loading state for the main video data
  if (loading) {
    return (
      <div className="flex justify-center items-center w-screen h-screen bg-black text-white">
        <p>Loading video...</p>
      </div>
    );
  }

  // Error state for the main video data
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center w-screen h-screen bg-black text-white">
        <p className="text-red-500 mb-4">{error}</p>
        <Button variant="secondary" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Video not found or missing URL
  if (!postData || !postData.video_url) {
    return (
      <div className="flex flex-col justify-center items-center w-screen h-screen bg-black text-white">
        <p className="mb-4">Video not found or source is unavailable.</p>
        <Button variant="secondary" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Extract data needed for rendering
  const {
    id,
    caption,
    video_url,
    thumbnail_url,
    likes_count,
    comments_count,
    views_count, // Assuming shares might be views or calculated differently
    profiles,
  } = postData;

  const username = profiles?.username || "Unknown";
  const profileName = profiles?.name || username; // Fallback to username if name is missing
  const profilePic = profiles?.profile_picture_url;

  return (
    // Full screen container
    <div className="fixed inset-0 flex bg-background text-foreground z-50"> {/* Use fixed positioning */}

      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 text-white bg-black/50 hover:bg-black/70 rounded-full z-50"
        onClick={() => router.back()} // Go back in history
        aria-label="Close video"
      >
        <X size={24} />
      </Button>

      {/* Left Column: Video Player */}
      <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative">
        <ClientVideoPlayerWrapper
          id={id}
          username={username}
          profilePictureUrl={profilePic ?? undefined}
          // verified={profiles?.verified ?? false} // Add if verified exists
          caption={caption ?? ""}
          videoSrc={video_url} // Already checked this exists
          posterSrc={thumbnail_url ?? undefined}
          likes={(likes_count ?? 0).toString()}
          comments={(comments_count ?? 0).toString()}
          // Use views_count for shares placeholder, or implement actual shares
          shares={(views_count ?? 0).toString()}
          userId={postData.user_id} // Add missing userId prop
          is_for_sale={postData.is_for_sale ?? false} // Add missing is_for_sale prop (default to false)
          // Note: Delete button logic might need adjustment if it relies on profile page context
        />
      </div>

      {/* Right Column: Details & Comments */}
      <div className="w-[400px] lg:w-[500px] border-l border-border bg-background flex flex-col h-full">

        {/* Top Section: Creator Info & Caption */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            {/* Use userId for the link href */}
            <Link href={`/profile/${postData.user_id}`} className="flex items-center gap-2 group">
              <Avatar className="w-10 h-10">
                <AvatarImage src={profilePic ?? undefined} alt={username} />
                {/* Display username if available, otherwise fallback */}
                <AvatarFallback>{username?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold group-hover:underline">{username}</p>
                <p className="text-sm text-muted-foreground">{profileName} · <span className="text-xs">5d ago</span></p> {/* Placeholder date */}
              </div>
            </Link>
            <Button variant="outline" size="sm">Follow</Button> {/* Placeholder */}
          </div>
          <p className="text-sm mb-2">{caption ?? "No caption"}</p>
          {/* TODO: Add Hashtags and Music info here if available */}
          <p className="text-sm font-semibold text-muted-foreground mb-3">♫ original sound - placeholder</p>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-4">
                <button onClick={handleLike} className="flex items-center gap-1.5 text-sm hover:text-primary">
                   <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? 'text-red-500' : ''} />
                   {likes_count ?? 0}
                </button>
                <button className="flex items-center gap-1.5 text-sm hover:text-primary">
                   <MessageCircle size={20} />
                   {comments_count ?? 0}
                </button>
                <button onClick={handleBookmark} className="flex items-center gap-1.5 text-sm hover:text-primary">
                   <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} />
                   {/* Add bookmark count if available */} 0
                </button>
             </div>
             <div className="flex items-center gap-2">
                {/* TODO: Implement actual sharing options (e.g., social media) */}
                <Button variant="ghost" size="icon" className="hover:bg-muted" aria-label="Share options">
                   <Send size={20} />
                </Button>
             </div>
          </div>

          {/* Copy Link */}
          <div className="flex items-center border border-input rounded-md bg-muted">
             <p className="flex-1 px-3 py-1.5 text-sm text-muted-foreground truncate">
                {window.location.href} {/* Display current URL */}
             </p>
             <Button
                variant="ghost"
                size="sm"
                className="rounded-l-none"
                onClick={handleCopyLink}
             >
                {copied ? 'Copied' : 'Copy link'}
             </Button>
          </div>
        </div>

        {/* Middle Section: Comments */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Placeholder for comments */}
          {loadingComments && <p className="text-muted-foreground text-center">Loading comments...</p>}
          {commentError && <p className="text-red-500 text-center">{commentError}</p>}
          {!loadingComments && comments.length === 0 && <p className="text-muted-foreground text-center">No comments yet.</p>}

          {/* Map over actual comments */}
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={comment.profiles?.profile_picture_url ?? undefined} alt={comment.profiles?.username ?? 'User'} />
                <AvatarFallback>{comment.profiles?.username?.charAt(0).toUpperCase() ?? 'U'}</AvatarFallback>
              </Avatar>
              <div className="text-sm flex-1">
                <p>
                  <span className="font-semibold mr-1">{comment.profiles?.username ?? 'User'}</span>
                  {comment.text}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {/* TODO: Format date properly */}
                  <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  <button className="hover:underline">Reply</button>
                  <button className="flex items-center gap-0.5 hover:text-red-500">
                    <Heart size={12} /> 0 {/* Placeholder like count */}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Add Comment - Disable if not logged in */}
        <div className="p-4 border-t border-border bg-background">
          {!loggedInUser ? (
             <p className="text-sm text-muted-foreground text-center">
               <Link href="#" className="text-primary hover:underline" onClick={(e) => { e.preventDefault(); /* TODO: Trigger login modal */ }}>Log in</Link> to add a comment.
             </p>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add comment..."
                className="flex-1"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
              />
              <Button onClick={handlePostComment} disabled={!newComment.trim()}>Post</Button>
            </div>
          )}
        </div>
        {/* Removed duplicated block from here */}
      </div>
    </div>
  );
}
