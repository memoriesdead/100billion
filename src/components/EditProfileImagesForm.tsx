'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ImageUploadInput } from './ImageUploadInput'; // Import new component
import { VideoUploadInput } from './VideoUploadInput'; // Import new component

interface EditProfileImagesFormProps {
  initialProfileImageUrl: string | null;
  initialBannerImageUrl: string | null;
  initialProfilePath: string | null | undefined; // Keep paths for potential deletion logic
  initialBannerPath: string | null | undefined; // Keep paths for potential deletion logic
  onSave: () => void;
  onCancel: () => void;
}

// Function to determine initial media type based on URL
const getInitialMediaType = (url: string | null): 'image' | 'video' | null => {
    if (!url) return null;
    try {
        const path = new URL(url).pathname;
        const extension = path.split('.').pop()?.toLowerCase();
        if (extension && ['mp4', 'webm', 'mov', 'ogg', 'mkv', 'avi'].includes(extension)) {
            return 'video';
        }
        // Add common image extensions check if needed, otherwise assume image
        if (extension && ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
            return 'image';
        }
        // If extension is missing or not recognized, might need a more robust check,
        // but for now, let's default to image if it's not clearly video.
        // Or return null if unsure? Let's assume image for simplicity if not video.
        return 'image';
    } catch (e) {
        console.warn("Could not parse URL to determine media type:", url, e);
        return null; // Or default to 'image'
    }
};


export function EditProfileImagesForm({
  initialProfileImageUrl,
  initialBannerImageUrl,
  initialProfilePath,
  initialBannerPath,
  onSave,
  onCancel
}: EditProfileImagesFormProps) {
  const { user } = useAuth();
  const [selectedProfileFile, setSelectedProfileFile] = useState<File | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine initial banner type and manage current type if user uploads a different one
  const [currentBannerType, setCurrentBannerType] = useState<'image' | 'video' | null>(
      getInitialMediaType(initialBannerImageUrl)
  );

  // Update banner type if a new file is selected
  useEffect(() => {
      if (selectedBannerFile) {
          setCurrentBannerType(selectedBannerFile.type.startsWith('video/') ? 'video' : 'image');
      } else {
          // If file is deselected, revert to initial type
          setCurrentBannerType(getInitialMediaType(initialBannerImageUrl));
      }
  }, [selectedBannerFile, initialBannerImageUrl]);


  // Upload file to Supabase Storage and return the path (modified slightly)
  const uploadFile = async (bucket: string, file: File, fileType: 'profile' | 'banner'): Promise<string | null> => {
    if (!user) throw new Error("User not authenticated.");

    const fileExt = file.name.split('.').pop();
    const fileName = `${fileType}.${fileExt}`; // e.g., banner.mp4 or profile.png
    const filePath = `${user.id}/${fileName}`; // Path: userId/profile.ext or userId/banner.ext
    const contentType = file.type;

    console.log(`Uploading ${fileType} (${contentType}) to: ${bucket}/${filePath}`);

    // --- Deletion Logic (Simplified - assumes paths passed are correct) ---
    const pathToDelete = fileType === 'profile' ? initialProfilePath : initialBannerPath;
    if (pathToDelete) {
        try {
            console.log(`Attempting to remove old ${fileType} file from storage: ${pathToDelete}`);
            const { error: removeError } = await supabase.storage.from(bucket).remove([pathToDelete]);
            if (removeError && removeError.message !== 'The resource was not found') {
                console.warn(`Failed to remove old ${fileType} file at ${pathToDelete}:`, removeError.message);
            } else if (!removeError) {
                console.log(`Successfully removed old ${fileType} file: ${pathToDelete}`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`Error during removal of old ${fileType} file:`, message);
        }
    } else {
         console.log(`No initial ${fileType} path provided for deletion.`);
    }
    // --- End Deletion Logic ---

    // Upload the new file
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite if same path exists
          contentType: contentType
      });

    if (uploadError) {
      console.error(`Upload error for ${fileType}:`, uploadError);
      throw new Error(`Failed to upload ${fileType} file: ${uploadError.message}`);
    }
    console.log(`Successfully uploaded ${fileType} to ${data?.path}`);
    return data?.path ?? null; // Return the storage path
  };

  // Handle form submission
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      setError("Cannot save images. User not authenticated.");
      return;
    }

    // Check if any file has actually been selected for upload
    if (!selectedProfileFile && !selectedBannerFile) {
      setError("No new images or videos selected to save.");
      // Optionally, call onCancel() or provide feedback that nothing changed
      // onCancel(); // Example: Close form if nothing changed
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let newProfilePictureStoragePath: string | null | undefined = undefined; // Use undefined to track if upload happened
      let newBannerImageStoragePath: string | null | undefined = undefined; // Use undefined to track if upload happened

      // Upload profile picture if selected
      if (selectedProfileFile) {
        newProfilePictureStoragePath = await uploadFile('avatars', selectedProfileFile, 'profile');
        if (newProfilePictureStoragePath === null) throw new Error("Failed to get profile picture storage path after upload.");
      }

      // Upload banner if selected
      if (selectedBannerFile) {
        newBannerImageStoragePath = await uploadFile('banners', selectedBannerFile, 'banner');
        if (newBannerImageStoragePath === null) throw new Error("Failed to get banner image storage path after upload.");
      }

      // Prepare data for database update
      const profileUpdateData: { profile_picture_url?: string | null, banner_image_url?: string | null, updated_at: string } = {
        updated_at: new Date().toISOString(),
      };

      let needsDbUpdate = false;
      if (newProfilePictureStoragePath !== undefined) { // Check if upload occurred
        profileUpdateData.profile_picture_url = newProfilePictureStoragePath;
        needsDbUpdate = true;
      }
      if (newBannerImageStoragePath !== undefined) { // Check if upload occurred
        profileUpdateData.banner_image_url = newBannerImageStoragePath;
        needsDbUpdate = true;
      }

      // Update database only if a new file was uploaded
      if (needsDbUpdate) {
        console.log('Updating profile images data in DB:', profileUpdateData);
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileUpdateData)
          .eq('id', user.id);

        if (updateError) {
          console.error("Database update error:", updateError);
          throw new Error(`Failed to update profile data: ${updateError.message}`);
        }
        console.log('Profile images updated successfully in DB!');
      } else {
        console.log("No new files were uploaded, skipping database update.");
      }

      onSave(); // Call the onSave callback provided by the parent

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to update profile images:', err);
      setError(`Failed to update images: ${message}. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Render Form
  return (
    // Use React.Fragment explicitly to be safe, given previous issues
    <React.Fragment>
      <form onSubmit={handleSubmit} className="space-y-6 p-4 border rounded-lg shadow-sm bg-card">
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {/* Banner Upload Section */}
        {currentBannerType === 'video' ? (
            <VideoUploadInput
                id="bannerVideo"
                label="Banner Video"
                initialVideoUrl={initialBannerImageUrl}
                onFileChange={setSelectedBannerFile}
                disabled={isSaving}
                buttonText="Change Banner"
            />
        ) : (
            // Default to Image Upload if type is 'image' or null/unknown
            <ImageUploadInput
                id="bannerImage"
                label="Banner Image"
                initialImageUrl={initialBannerImageUrl}
                aspect={16 / 9} // Banner aspect ratio
                circularCrop={false}
                onFileChange={setSelectedBannerFile}
                disabled={isSaving}
                previewType="banner"
                buttonText="Change Banner"
                modalTitle="Edit banner photo"
            />
        )}
        {/* Consider adding a toggle if you want users to switch between uploading image/video banner */}


        {/* Profile Picture Upload Section */}
        <ImageUploadInput
          id="profilePicture"
          label="Profile Picture"
          initialImageUrl={initialProfileImageUrl}
          aspect={1} // Square aspect ratio
          circularCrop={true}
          onFileChange={setSelectedProfileFile}
          disabled={isSaving}
          previewType="avatar"
          buttonText="Change Picture"
          modalTitle="Edit profile photo"
        />

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving || (!selectedProfileFile && !selectedBannerFile)}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </React.Fragment>
  );
}
