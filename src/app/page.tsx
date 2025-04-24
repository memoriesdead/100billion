"use client";

import { useState, useEffect, useContext } from "react";
import { MainLayout } from "@/components/MainLayout";
import { ClientVideoPlayerWrapper } from "@/components/ClientVideoPlayerWrapper";
import { ImageCard } from "@/components/ImageCard";
import { supabase } from '@/lib/supabaseClient';
import { AuthContext } from '@/context/AuthContext';
import type { Tables } from "@/lib/database.types";
import { Button } from "@/components/ui/button";

// Define a more generic Post type
type PostWithProfile = Tables<'posts'> & {
  profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'profile_picture_url' | 'name'> | null;
};

export default function Home() {
  const { user: loggedInUser } = useContext(AuthContext);
  const [videos, setVideos] = useState<PostWithProfile[]>([]);
  const [images, setImages] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'videos' | 'images'>('videos');

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      setError(null);
      try {
        console.log("Starting to fetch posts for For You page...");
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(`*, profiles!inner(*)`) // Use explicit join syntax
          .is('is_private', false) // Fetch only public posts
          .eq('is_for_sale', false) // Exclude items that are for sale
          .order('created_at', { ascending: false });

         if (fetchError) throw fetchError;

         if (data && data.length > 0) {
           // Restore original mapping logic
           // Use a more specific type for post within map
           const allPosts = data.map((post: Tables<'posts'> & { profiles: Tables<'profiles'> }) => ({
              ...post,
              // Ensure profiles is an object or null
              profiles: (post.profiles && typeof post.profiles === 'object' && !Array.isArray(post.profiles)) ? post.profiles : null,
              likes_count: post.likes_count ?? 0,
              comments_count: post.comments_count ?? 0,
              is_private: post.is_private, // Keep as boolean | null
             is_for_sale: post.is_for_sale ?? false,
             price: post.price,
             currency: post.currency,
             stripe_price_id: post.stripe_price_id,
             stripe_product_id: post.stripe_product_id,
           })) as PostWithProfile[];

          // Restore filtering based on URLs
          const videoPosts = allPosts.filter(p => p.type === 'video' && p.video_url);
          const imagePosts = allPosts.filter(p => p.type === 'image' && p.image_url);
          setVideos(videoPosts);
          setImages(imagePosts);
        } else {
          setVideos([]);
          setImages([]);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error fetching posts:", err);
        setError(message || "Failed to fetch posts");
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  if (loading) {
    return <MainLayout><div className="flex h-full justify-center items-center text-white">Loading posts...</div></MainLayout>;
  }
  if (error) {
    return <MainLayout><div className="flex h-full justify-center items-center text-white">Error: {error}</div></MainLayout>;
  }

  const postsToDisplay = viewMode === 'videos' ? videos : images;
  const noContentMessage = viewMode === 'videos' ? "No videos found" : "No images found";

  return (
    <MainLayout>
      <div className="flex justify-center p-2 space-x-2 bg-background border-b border-border sticky top-0 z-10">
         <Button variant={viewMode === 'videos' ? 'secondary' : 'ghost'} onClick={() => setViewMode('videos')}>Videos</Button>
         <Button variant={viewMode === 'images' ? 'secondary' : 'ghost'} onClick={() => setViewMode('images')}>Images</Button>
      </div>
      <div className="h-[calc(100vh-theme(space.14)-52px)] overflow-y-auto"> {/* Removed snap classes */}
        {postsToDisplay.length === 0 ? (
          <div className="flex h-full flex-col justify-center items-center text-white">
            <p className="text-xl mb-4">{noContentMessage}</p>
            <p className="text-sm text-gray-400">Upload content to see it here</p>
          </div>
        ) : (
          postsToDisplay.map((post) => (
            <div key={`post-${post.id}`} className="w-full h-full snap-start flex-shrink-0 flex items-center justify-center bg-black">
               {post.type === 'video' ? (
                 <ClientVideoPlayerWrapper
                    id={post.id}
                    userId={post.user_id}
                    // Restore props using fetched data
                    username={post.profiles?.username ?? "Unknown User"}
                    profilePictureUrl={post.profiles?.profile_picture_url ?? undefined}
                    caption={post.caption ?? ""}
                    videoSrc={post.video_url ?? ""}
                    posterSrc={post.thumbnail_url ?? undefined}
                    likes={(post.likes_count ?? 0).toString()}
                    comments={(post.comments_count ?? 0).toString()}
                    shares={"0"}
                    isPrivate={post.is_private ?? undefined}
                    isOwner={loggedInUser?.id === post.user_id}
                    is_for_sale={post.is_for_sale}
                    price={post.price}
                    currency={post.currency}
                    stripe_price_id={post.stripe_price_id}
                    isLocked={(post.is_private ?? false) && !(loggedInUser?.id === post.user_id)}
                    isPaidContent={post.is_private ?? undefined}
                  />
                ) : (
                  <ImageCard
                    id={post.id}
                    userId={post.user_id}
                    // Restore props using fetched data
                    username={post.profiles?.username || 'Unknown User'}
                    profilePictureUrl={post.profiles?.profile_picture_url || undefined}
                    caption={post.caption}
                    imageUrl={post.image_url!}
                    likes={post.likes_count ?? 0}
                    comments={(post.comments_count ?? 0).toString()}
                    shares={'0'}
                    isPrivate={post.is_private ?? false}
                    isOwner={loggedInUser?.id === post.user_id}
                    initialIsLiked={false} // Assuming initial like status isn't fetched here
                    is_for_sale={post.is_for_sale}
                    price={post.price}
                    currency={post.currency}
                    stripe_price_id={post.stripe_price_id}
                    isLocked={(post.is_private ?? false) && !(loggedInUser?.id === post.user_id)}
                    isPaidContent={post.is_private ?? undefined}
                  />
                )}
            </div>
          ))
        )}
      </div>
    </MainLayout>
  );
}
