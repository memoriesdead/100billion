'use client';

import React, { useState, useEffect, useRef, ChangeEvent } from 'react'; // Added ChangeEvent
import { MainLayout } from "@/components/MainLayout";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import Image from 'next/image'; // Keep Image for profile pic and potentially initial banner
import Link from 'next/link'; // Keep Link for other potential uses
import { useRouter } from 'next/navigation'; // Import useRouter
import ReactCrop, { type Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'; // Crop imports
import 'react-image-crop/dist/ReactCrop.css'; // Crop CSS

// shadcn/ui components & Lucide icons
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger, DialogClose
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from '@/components/ui/slider'; // Import Slider for zoom
import {
  MapPin, Globe, Calendar, Settings, Share2, Bookmark,
  MoreHorizontal, Mail, UserPlus, Camera, FileText, PlusCircle, Pencil, // Keep Camera
  ShoppingBag
} from "lucide-react";
import { VideoGrid } from '@/components/VideoGrid';
// Import the new component for the Home tab feed
import ProfileHomeFeed from '@/components/ProfileHomeFeed'; // Import the new feed component

// Type definition based on actual schema
interface ProfileData {
  id: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  bio: string | null;
  banner_image_url: string | null;
  created_at: string | null;
  following_count: number;
  followers_count: number;
}


// --- Cropping Helper Functions ---
// Helper function to generate cropped image blob
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  scale = 1,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = 1; // window.devicePixelRatio;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/png'); // Or 'image/jpeg'
  });
}

// Helper function to center the crop
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90, // Initial crop size (percentage)
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}
// --- End Cropping Helper Functions ---


export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter(); // Get router instance
  const queryClient = useQueryClient();
  const [editedBio, setEditedBio] = useState('');
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);

  // --- Banner State ---
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null); // Holds the final file (cropped image or video)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null); // For the preview in the modal
  const [bannerMediaType, setBannerMediaType] = useState<'image' | 'video' | null>(null); // Track type
  const [bannerImageSrcForCrop, setBannerImageSrcForCrop] = useState<string | null>(null); // Source for react-image-crop (only used if image)
  const [bannerCrop, setBannerCrop] = useState<Crop>();
  const [completedBannerCrop, setCompletedBannerCrop] = useState<PixelCrop>();
  const [bannerScale, setBannerScale] = useState(1);
  const bannerAspect = 16 / 9; // Banner aspect ratio
  const bannerImgRef = useRef<HTMLImageElement>(null); // Ref for the image element in the cropper
  const bannerFileInputRef = useRef<HTMLInputElement>(null); // Ref for the hidden file input
  const [bannerError, setBannerError] = useState<string | null>(null); // Error state for banner modal
  const [bannerOriginalWidth, setBannerOriginalWidth] = useState<number | null>(null); // State for original width
  const [bannerOriginalHeight, setBannerOriginalHeight] = useState<number | null>(null); // State for original height

  // --- Avatar State ---
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('content'); // Default to content tab

  // --- React Query ---
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, name, profile_picture_url, bio,
          banner_image_url, created_at, following_count,
          followers_count
        `)
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? data as ProfileData : null;
    },
    enabled: !!user?.id && !authLoading,
  });

  // --- Effects ---
  useEffect(() => {
    if (profile) {
      setEditedBio(profile.bio || '');
      // Set initial banner state based on fetched profile data
      setBannerPreviewUrl(profile.banner_image_url);
      if (profile.banner_image_url) {
        const extension = profile.banner_image_url.split('.').pop()?.split('?')[0]?.toLowerCase();
        setBannerMediaType(extension && ['mp4', 'webm', 'mov', 'ogg', 'mkv', 'avi'].includes(extension) ? 'video' : 'image');
      } else {
        setBannerMediaType(null);
      }
    }
  }, [profile]);

  // --- Mutations ---
  const updateBioMutation = useMutation({
    mutationFn: async (newBio: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { error } = await supabase
        .from('profiles')
        .update({ bio: newBio, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setIsBioModalOpen(false);
    },
    onError: (error) => console.error("Failed to update bio:", error),
  });

  const updateBannerMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!file) throw new Error("No file selected");

      const fileExt = file.name.split('.').pop();
      const fileName = `banner.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const contentType = file.type;

      console.log(`Uploading banner ${contentType} to: banners/${filePath}`);

      // --- Deletion of Old Banner ---
      const { data: currentProfileData, error: fetchError } = await supabase
        .from('profiles')
        .select('banner_image_url')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Error fetching current banner URL for deletion:", fetchError);
      }

      const currentDbFilePath = currentProfileData?.banner_image_url;
      const storagePathRegex = /\/banners\/(.+?)(\?|$)/;
      const match = currentDbFilePath?.match(storagePathRegex);
      const currentStoragePath = match ? match[1] : null;

      if (currentStoragePath && currentStoragePath !== filePath) {
        try {
          console.log(`Attempting to remove old banner file from storage: ${currentStoragePath}`);
          const { error: removeError } = await supabase.storage.from('banners').remove([currentStoragePath]);
          if (removeError && removeError.message !== 'The resource was not found') {
            console.warn(`Failed to remove old banner file at ${currentStoragePath}:`, removeError.message);
          } else if (!removeError) {
            console.log(`Successfully removed old banner file: ${currentStoragePath}`);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`Error during removal of old banner file:`, message);
        }
      }
      // --- End Deletion Logic ---

      // 1. Upload new banner
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: contentType });
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      // 2. Get public URL with cache buster
      const timestamp = `t=${new Date().getTime()}`;
      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(filePath);
      let publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL for banner. Check bucket RLS.");
      publicUrl = publicUrl.includes('?') ? `${publicUrl}&${timestamp}` : `${publicUrl}?${timestamp}`;

      // 3. Update profile table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

      return publicUrl;
    },
    onSuccess: (newUrl) => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      // Reset banner modal state *after* successful upload
      setIsBannerModalOpen(false);
      setSelectedBannerFile(null);
      setBannerImageSrcForCrop(null);
      setBannerCrop(undefined);
      setCompletedBannerCrop(undefined);
      setBannerError(null);
      // Reset dimensions state after successful upload
      setBannerOriginalWidth(null);
      setBannerOriginalHeight(null);
    },
    onError: (error) => {
      console.error("Failed to update banner:", error);
      setBannerError(`Failed to update banner: ${error.message}`);
    }
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("User not authenticated");
      if (!file) throw new Error("No file selected");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles') // Assuming avatar bucket is named 'profiles'
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL for avatar");

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setIsAvatarModalOpen(false);
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
    },
    onError: (error) => console.error("Failed to update avatar:", error),
  });

  // --- Handlers ---
  const handleSaveBio = () => {
    updateBioMutation.mutate(editedBio);
  };

  // Called when the BANNER image loads in the cropper
  function onBannerImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setBannerCrop(centerAspectCrop(width, height, bannerAspect));
  }

  // Updated Banner File Change Handler (triggers cropper for images)
  const handleBannerFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setBannerError(null); // Clear previous errors
    if (file) {
      // Reset relevant states before processing new file
      setSelectedBannerFile(null);
      setBannerImageSrcForCrop(null);
      setBannerCrop(undefined);
      setCompletedBannerCrop(undefined);
      setBannerOriginalWidth(null); // Reset dimensions
      setBannerOriginalHeight(null); // Reset dimensions

      if (file.type.startsWith('video/')) {
        setBannerMediaType('video');
        setSelectedBannerFile(file); // Set the final file state immediately
        setBannerPreviewUrl(URL.createObjectURL(file)); // Update preview for modal
      } else if (file.type.startsWith('image/')) {
        setBannerMediaType('image');
        setBannerScale(1); // Reset zoom
        const reader = new FileReader();
        reader.onloadend = () => {
          const img = document.createElement('img');
          img.onload = () => {
            setBannerOriginalWidth(img.naturalWidth); // Set original width
            setBannerOriginalHeight(img.naturalHeight); // Set original height
            setBannerImageSrcForCrop(reader.result as string); // Set source for cropper
            setBannerPreviewUrl(reader.result as string); // Also set preview for initial display in cropper
          };
          img.onerror = () => {
             console.error("Failed to load image for dimension reading.");
             setBannerError("Failed to read image dimensions.");
             setBannerImageSrcForCrop(null);
             setBannerOriginalWidth(null);
             setBannerOriginalHeight(null);
          };
          img.src = reader.result as string; // Set src for the temporary image element
        };
        reader.onerror = () => {
          console.error("Failed to read the selected banner image file.");
          setBannerImageSrcForCrop(null);
          setBannerError("Failed to read the selected image file.");
        }
        reader.readAsDataURL(file);
      } else {
        setBannerError("Unsupported file type. Please select an image or video.");
        setBannerMediaType(null);
        setSelectedBannerFile(null);
        setBannerPreviewUrl(profile?.banner_image_url ?? null); // Revert preview
      }
    } else {
      // No file selected, reset to initial state
      setSelectedBannerFile(null);
      setBannerImageSrcForCrop(null);
      setBannerPreviewUrl(profile?.banner_image_url ?? null);
      setBannerMediaType(profile?.banner_image_url ? (profile.banner_image_url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image') : null);
      setBannerOriginalWidth(null); // Reset dimensions
      setBannerOriginalHeight(null); // Reset dimensions
    }
  };

  // Handle applying the BANNER crop from the modal
  const handleApplyBannerCrop = async () => {
    if (!completedBannerCrop || !bannerImgRef.current || !bannerImageSrcForCrop) {
      console.error("Banner Crop details, image ref, or image source not available");
      setBannerError("Could not apply crop. Please try again.");
      return;
    }
    try {
      setBannerError(null);
      const croppedBlob = await getCroppedImg(
        bannerImgRef.current,
        completedBannerCrop,
        bannerScale
      );

      if (croppedBlob) {
        const fileExtMatch = bannerImageSrcForCrop.match(/data:image\/(.+);/);
        const fileExt = fileExtMatch ? fileExtMatch[1] : 'png';
        const fileName = `banner_cropped_${Date.now()}.${fileExt}`;
        const croppedFile = new File([croppedBlob], fileName, { type: `image/${fileExt}` });

        setSelectedBannerFile(croppedFile); // Set the final cropped file
        setBannerPreviewUrl(URL.createObjectURL(croppedBlob)); // Update preview shown in modal
        setBannerMediaType('image'); // Ensure type is image
        setBannerImageSrcForCrop(null); // Clear cropper source after applying
      }
    } catch (e) {
      console.error("Error cropping banner image:", e);
      setBannerError("Could not crop the image. Please try again.");
    } finally {
      // Clear the file input value *after* processing
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = "";
      }
    }
  };

  // Handle cancelling the BANNER crop/upload modal (called by Dialog onOpenChange or Cancel button)
  const handleCancelBannerChange = () => {
    setIsBannerModalOpen(false); // Close the main modal
    // Reset all banner-related temporary states
    setSelectedBannerFile(null);
    setBannerImageSrcForCrop(null);
    setBannerCrop(undefined);
    setCompletedBannerCrop(undefined);
    setBannerError(null);
    setBannerOriginalWidth(null); // Reset dimensions on cancel
    setBannerOriginalHeight(null); // Reset dimensions on cancel
    // Revert preview URL and type shown outside the modal to the initial profile state
    setBannerPreviewUrl(profile?.banner_image_url ?? null);
    if (profile?.banner_image_url) {
       const extension = profile.banner_image_url.split('.').pop()?.split('?')[0]?.toLowerCase();
       setBannerMediaType(extension && ['mp4', 'webm', 'mov', 'ogg', 'mkv', 'avi'].includes(extension) ? 'video' : 'image');
    } else {
       setBannerMediaType(null);
    }
    if (bannerFileInputRef.current) {
      bannerFileInputRef.current.value = ""; // Clear file input
    }
  };

  // Handle Save Banner (triggers mutation with the selected file - either original video or cropped image)
  const handleSaveBanner = () => {
    if (selectedBannerFile) {
      setBannerError(null); // Clear previous errors before saving
      updateBannerMutation.mutate(selectedBannerFile);
      // onSuccess in the mutation handles closing the modal and resetting state
    } else {
      setBannerError("Please select a file first.");
    }
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedAvatarFile(null);
      setAvatarPreviewUrl(null);
    }
  };

  const handleSaveAvatar = () => {
    if (selectedAvatarFile) {
      updateAvatarMutation.mutate(selectedAvatarFile);
    }
  };

  // --- Animation Variants ---
  const bannerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } }
  };

  const profileVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 } }
  };

  // --- Render Logic ---
  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading authentication...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="container max-w-6xl mx-auto px-4 py-12">
          <Alert>
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription> Please log in to view this profile. </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-6xl mx-auto px-4 py-12 text-center">
           <p>Loading profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container max-w-6xl mx-auto px-4 py-12">
          <Alert variant="destructive">
            <AlertTitle>Error Loading Profile</AlertTitle>
            <AlertDescription> {(error as Error).message || "Failed to load profile data."} </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
     return (
       <MainLayout>
         <div className="container max-w-6xl mx-auto px-4 py-12">
           <Alert>
             <AlertTitle>Profile Not Found</AlertTitle>
             <AlertDescription> This profile could not be found. </AlertDescription>
           </Alert>
         </div>
       </MainLayout>
      );
   }

   return (
     <MainLayout>
       {/* Hero banner - Removed motion.div for debugging asChild error */}
       <div
         className="relative w-full h-72 md:h-96 overflow-hidden bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800" // Increased height
         // variants={bannerVariants} // Removed animation props
         // initial="hidden"
        // animate="visible"
      >
        {/* Display Current Banner (Image or Video) */}
        {profile.banner_image_url ? (
          (profile.banner_image_url.match(/\.(mp4|webm|mov|ogg)$/i)) ? (
            <video
              src={profile.banner_image_url}
              className="w-full h-full object-cover"
              autoPlay loop muted playsInline key={profile.banner_image_url} // Key forces reload if URL changes
            />
          ) : (
            <Image
              src={profile.banner_image_url}
              alt="Profile banner"
              className="object-cover object-center"
              fill // Use fill layout
              priority
              quality={90}
              key={profile.banner_image_url} // Key forces reload if URL changes
            />
          )
        ) : (
          <div className="absolute inset-0 bg-muted"></div> // Placeholder if no banner
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

        {/* Edit Banner Button & Modal */}
        {/* Use handleCancelBannerChange for onOpenChange when closing */}
        <Dialog
          open={isBannerModalOpen}
          onOpenChange={(isOpen) => {
            // Update the controlled state based on the event
            setIsBannerModalOpen(isOpen);

            if (!isOpen) {
              // Reset state fully on close using the existing handler
              handleCancelBannerChange();
            } else {
              // If opening, reset temporary states needed for the modal
              setSelectedBannerFile(null);
              setBannerImageSrcForCrop(null);
              setBannerCrop(undefined);
              setCompletedBannerCrop(undefined);
              setBannerError(null);
              // Set preview to current profile banner when opening
              setBannerPreviewUrl(profile?.banner_image_url ?? null);
              setBannerMediaType(profile?.banner_image_url ? (profile.banner_image_url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image') : null);
              if (bannerFileInputRef.current) {
                bannerFileInputRef.current.value = ""; // Clear file input on open
              }
            }
          }}
        >
          {/* Removed asChild from DialogTrigger, trigger manually */}
          <DialogTrigger asChild={false}> 
            {/* Button now triggers manually */}
            <Button
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white border-white/20 backdrop-blur-sm"
              onClick={() => {
                // Manually trigger opening and reset state
                setSelectedBannerFile(null);
                setBannerImageSrcForCrop(null);
                setBannerCrop(undefined);
                setCompletedBannerCrop(undefined);
                setBannerError(null);
                setBannerPreviewUrl(profile?.banner_image_url ?? null);
                setBannerMediaType(profile?.banner_image_url ? (profile.banner_image_url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image') : null);
                if (bannerFileInputRef.current) {
                  bannerFileInputRef.current.value = ""; // Clear file input
                }
                setIsBannerModalOpen(true); // Open the dialog
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              Change Banner
            </Button>
          </DialogTrigger> 
          {/* Increase max width for cropper */}
          <DialogContent className="sm:max-w-lg bg-card">
            <DialogHeader>
              <DialogTitle>Change Banner</DialogTitle>
              <DialogDescription>
                Select a new image or video. Images can be cropped.
              </DialogDescription>
            </DialogHeader>

            {/* Conditionally render Cropper or Preview/Input */}
            {bannerImageSrcForCrop ? (
              // --- Cropper View ---
              <div className="space-y-4 py-4">
                <div className="relative flex justify-center items-center overflow-hidden p-4 border rounded-md" style={{ maxHeight: '60vh' }}>
                  <ReactCrop
                    crop={bannerCrop}
                    onChange={(_, percentCrop) => setBannerCrop(percentCrop)}
                    onComplete={(c) => setCompletedBannerCrop(c)}
                    aspect={bannerAspect}
                    keepSelection
                  >
                    <img
                      ref={bannerImgRef}
                      alt="Crop banner"
                      src={bannerImageSrcForCrop}
                      style={{ transform: `scale(${bannerScale})`, objectFit: 'contain', width: '100%', height: 'auto' }}
                      onLoad={onBannerImageLoad}
                    />
                  </ReactCrop>
                </div>
                <div className="w-full max-w-xs mx-auto flex items-center space-x-2 px-4">
                  <Label htmlFor="bannerZoom" className="w-12 text-sm text-muted-foreground">Zoom</Label>
                  <Slider
                    id="bannerZoom"
                    min={1} max={3} step={0.01} value={[bannerScale]}
                    onValueChange={(value) => setBannerScale(value[0])}
                    className="flex-1"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                   {/* Back button clears the cropper source, returning to upload view */}
                   <Button variant="outline" onClick={() => {
                       setBannerImageSrcForCrop(null);
                       // Revert preview based on original profile data
                       setBannerPreviewUrl(profile?.banner_image_url ?? null);
                       setBannerMediaType(profile?.banner_image_url ? (profile.banner_image_url.match(/\.(mp4|webm|mov|ogg)$/i) ? 'video' : 'image') : null);
                       setSelectedBannerFile(null); // Clear selection
                       if (bannerFileInputRef.current) bannerFileInputRef.current.value = ""; // Clear file input
                   }}>Back</Button>
                    <Button onClick={handleApplyBannerCrop} disabled={!completedBannerCrop}>Apply Crop</Button>
                 </div>
                 {/* Display original dimensions in cropper view */}
                 {bannerOriginalWidth && bannerOriginalHeight && (
                   <p className="text-xs text-muted-foreground text-center pt-1">
                     Original: {bannerOriginalWidth} x {bannerOriginalHeight} px
                   </p>
                 )}
               </div>
             ) : (
               // --- Initial Upload/Preview View ---
              <div className="space-y-4 py-4">
                {/* Preview Area */}
                <div className="w-full aspect-[16/5] bg-muted rounded border border-dashed flex items-center justify-center overflow-hidden relative">
                  {bannerPreviewUrl ? (
                    bannerMediaType === 'video' ? (
                      <video
                        src={bannerPreviewUrl}
                        className="w-full h-full object-cover"
                        autoPlay loop muted playsInline key={bannerPreviewUrl}
                      />
                    ) : ( // Assumes image if not video
                      <Image src={bannerPreviewUrl} alt="Banner preview" layout="fill" className="object-cover" quality={90} key={bannerPreviewUrl} />
                    )
                  ) : (
                    <span className="text-sm text-muted-foreground">Select file below</span>
                  )}
                </div>
                {/* File Input */}
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="banner-upload">Select Image or Video</Label>
                  <Input
                    id="banner-upload"
                    type="file"
                    // Accept common image and video types
                    accept="image/png, image/jpeg, image/webp, video/mp4, video/webm, video/quicktime, video/ogg"
                    ref={bannerFileInputRef}
                    onChange={handleBannerFileChange}
                    className="cursor-pointer"
                   />
                   <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, MP4, WEBM, MOV, OGG. Max 10MB.</p>
                   {/* Display original dimensions in initial view */}
                   {bannerMediaType === 'image' && bannerOriginalWidth && bannerOriginalHeight && (
                     <p className="text-xs text-muted-foreground text-center">
                       Original: {bannerOriginalWidth} x {bannerOriginalHeight} px
                     </p>
                   )}
                 </div>
                 {bannerError && <p className="text-sm text-red-600">{bannerError}</p>}
               </div>
            )}

            <DialogFooter>
              {/* Use the specific cancel handler */}
              <Button type="button" variant="outline" onClick={handleCancelBannerChange}>Cancel</Button>
              <Button
                type="button"
                onClick={handleSaveBanner}
                // Disable Save if: no file selected OR mutation is pending OR user is currently in cropping view
                disabled={!selectedBannerFile || updateBannerMutation.isPending || !!bannerImageSrcForCrop}
              >
                {updateBannerMutation.isPending ? 'Saving...' : 'Save Banner'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div> {/* End of banner div */}

      <div className="container max-w-6xl mx-auto px-4">
        {/* Profile header section - Removed motion.div */}
        <div
          className="relative -mt-16 md:-mt-20 flex flex-col md:flex-row gap-6 md:gap-8 mb-8"
          // variants={profileVariants} // Removed animation props
          // initial="hidden"
          // animate="visible"
        >
          {/* Profile avatar */}
          <div className="relative flex-shrink-0">
             <Avatar className="h-32 w-32 md:h-36 md:w-36 border-4 border-background shadow-lg">
               <AvatarImage src={profile?.profile_picture_url ?? undefined} alt={profile?.username ?? 'User'} />
               <AvatarFallback className="text-3xl">
                {profile?.name?.charAt(0)?.toUpperCase() ?? profile?.username?.charAt(0)?.toUpperCase() ?? 'U'}
               </AvatarFallback>
            </Avatar>
            {/* Edit Avatar Button with Modal */}
            {/* Remove DialogTrigger and trigger manually */}
            <Dialog open={isAvatarModalOpen} onOpenChange={setIsAvatarModalOpen}>
              {/* No DialogTrigger here */}
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-1 right-1 bg-background rounded-full h-8 w-8 shadow-md" // Removed absolute positioning
                aria-label="Change profile picture"
                onClick={() => setIsAvatarModalOpen(true)} // Open modal directly
              >
                <Camera className="h-4 w-4" />
              </Button>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Profile Picture</DialogTitle>
                  <DialogDescription> Select a new image for your avatar. </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                   <div className="flex justify-center">
                     <Avatar className="h-32 w-32 border-2 border-primary">
                       <AvatarImage src={avatarPreviewUrl ?? profile?.profile_picture_url ?? undefined} alt="Avatar preview" />
                       <AvatarFallback className="text-3xl">
                         {profile?.name?.charAt(0)?.toUpperCase() ?? profile?.username?.charAt(0)?.toUpperCase() ?? 'U'}
                       </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
                    <Label htmlFor="avatar-picture">Select Image</Label>
                    <Input id="avatar-picture" type="file" accept="image/png, image/jpeg, image/webp" ref={avatarFileInputRef} onChange={handleAvatarFileChange} className="cursor-pointer" />
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 2MB.</p>
                  </div>
                 </div>
                 <DialogFooter>
                   {/* Removed asChild from DialogClose */}
                   <DialogClose> <Button type="button" variant="outline">Cancel</Button> </DialogClose>
                   <Button type="button" onClick={handleSaveAvatar} disabled={!selectedAvatarFile || updateAvatarMutation.isPending}>
                     {updateAvatarMutation.isPending ? 'Uploading...' : 'Save Avatar'}
                   </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Profile info */}
          <div className="flex-1 space-y-3 pt-4 md:pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{profile?.name ?? 'User Name'}</h1>
                <h2 className="text-lg text-muted-foreground">@{profile?.username ?? 'username'}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                 {/* Changed Button to navigate programmatically */}
                 <Button variant="outline" onClick={() => router.push('/profile/edit')}>
                   <Pencil className="h-4 w-4 mr-2" /> Edit Profile
                 </Button>
                 <Button variant="ghost" size="icon"> <MoreHorizontal className="h-5 w-5" /> </Button>
               </div>
             </div>

             {/* Bio with Edit Modal */}
             {profile && (
               <div className="flex items-center">
                 <p className="max-w-3xl text-sm md:text-base mr-2"> {profile.bio ?? 'No bio available.'} </p>
                 <Dialog open={isBioModalOpen} onOpenChange={setIsBioModalOpen}>
                   {/* Removed asChild, trigger manually */}
                   <DialogTrigger asChild={false}>
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-6 w-6 text-primary flex-shrink-0"
                       onClick={() => setIsBioModalOpen(true)} // Open manually
                     >
                       <Pencil className="h-3 w-3" />
                     </Button>
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-[425px]">
                     <DialogHeader>
                       <DialogTitle>Edit Bio</DialogTitle>
                       <DialogDescription> Make changes to your bio here. Click save when you're done. </DialogDescription>
                     </DialogHeader>
                     <div className="grid gap-4 py-4">
                       <div className="grid grid-cols-4 items-center gap-4">
                         <Label htmlFor="bio" className="text-right sr-only"> Bio </Label>
                         <Textarea id="bio" value={editedBio} onChange={(e) => setEditedBio(e.target.value)} className="col-span-4 h-24" maxLength={150} />
                       </div>
                      <p className="text-xs text-muted-foreground text-right col-span-4"> {editedBio.length} / 150 </p>
                     </div>
                     <DialogFooter>
                       {/* Removed asChild from DialogClose */}
                       <DialogClose> <Button type="button" variant="outline">Cancel</Button> </DialogClose>
                       <Button type="button" onClick={handleSaveBio} disabled={updateBioMutation.isPending}>
                         {updateBioMutation.isPending ? 'Saving...' : 'Save changes'}
                       </Button>
                     </DialogFooter>
                   </DialogContent>
                 </Dialog>
               </div>
             )}

            {/* Profile metadata */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {profile?.created_at && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 pt-2">
              <div className="flex flex-col">
                <span className="font-bold">{profile?.following_count?.toLocaleString() ?? 0}</span>
                <span className="text-sm text-muted-foreground">Following</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold">{profile?.followers_count?.toLocaleString() ?? 0}</span>
                <span className="text-sm text-muted-foreground">Followers</span>
              </div>
            </div>
          </div>
        </div> {/* End of profile header div */}

        {/* Main content area - Simplified */}
        <div className="mb-16">
           <Tabs defaultValue="content" className="w-full">
             <div className="border-b">
               <TabsList className="justify-start h-12">
                 {/* Wrap TabsTrigger content in spans */}
                 <TabsTrigger value="content" className="flex items-center">
                   <span><FileText className="h-4 w-4 mr-2 inline-block" /> Content</span>
                 </TabsTrigger>
                 <TabsTrigger value="home" className="flex items-center">
                   <span><FileText className="h-4 w-4 mr-2 inline-block" /> Home</span>
                 </TabsTrigger>
               </TabsList>
             </div>
              <TabsContent value="content" className="py-6">
               <div className="mb-6 flex items-center justify-between">
                 <h2 className="text-xl font-semibold">My Content</h2>
                  {/* Changed Button to navigate programmatically */}
                  <Button onClick={() => router.push('/upload')}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Create New
                  </Button>
               </div>
               <VideoGrid userId={user.id} allowDeletion={true} />
             </TabsContent>
            <TabsContent value="home" className="py-6">
              <ProfileHomeFeed />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
