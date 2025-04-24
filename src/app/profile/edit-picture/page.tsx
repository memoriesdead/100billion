'use client'; // Needs to be a client component for hooks and handlers

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EditProfileImagesForm } from '@/components/EditProfileImagesForm'; // Use the correct form
import { MainLayout } from '@/components/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
// Removed incorrect import: import { getPublicUrl } from '@/lib/utils';

export default function EditProfilePicturePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [initialProfileImageUrl, setInitialProfileImageUrl] = useState<string | null>(null);
  const [initialBannerImageUrl, setInitialBannerImageUrl] = useState<string | null>(null);
  const [initialProfilePath, setInitialProfilePath] = useState<string | null>(null);
  const [initialBannerPath, setInitialBannerPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setError("User not authenticated.");
        setIsLoading(false);
        // Optionally redirect to login
        // router.push('/login');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('profile_picture_url, banner_image_url')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            // Profile doesn't exist yet, which is fine, initial values will be null
            console.log("Profile not found, initializing with null images.");
          } else {
            throw fetchError; // Rethrow other errors
          }
        }

        // Store the paths directly from the database
        const profilePath = data?.profile_picture_url ?? null;
        const bannerPath = data?.banner_image_url ?? null;
        setInitialProfilePath(profilePath);
        setInitialBannerPath(bannerPath);

        // Generate full public URLs for display using Supabase client
        setInitialProfileImageUrl(profilePath ? supabase.storage.from('avatars').getPublicUrl(profilePath).data.publicUrl : null);
        setInitialBannerImageUrl(bannerPath ? supabase.storage.from('banners').getPublicUrl(bannerPath).data.publicUrl : null);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Failed to fetch profile data:", err);
        setError(`Failed to load profile images: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user, router]); // Re-fetch if user changes

  const handleSave = () => {
    console.log("Profile images saved successfully, navigating back.");
    // Navigate back to the main profile edit page or the profile view page
    // Adjust the target route as needed
    router.push('/profile/edit'); // Or router.back() or router.push(`/profile/${username}`)
    // Optionally, add a success message/toast here
  };

  const handleCancel = () => {
    console.log("Image editing cancelled.");
    router.back(); // Go back to the previous page
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Edit Profile Images</h1>
        {isLoading && <p>Loading profile data...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}
        {!isLoading && !error && user && (
          <EditProfileImagesForm
            initialProfileImageUrl={initialProfileImageUrl}
            initialBannerImageUrl={initialBannerImageUrl}
            initialProfilePath={initialProfilePath}
            initialBannerPath={initialBannerPath}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
         {!isLoading && !user && !error && (
           <p>Please log in to edit your profile images.</p>
         )}
      </div>
    </MainLayout>
  );
}
