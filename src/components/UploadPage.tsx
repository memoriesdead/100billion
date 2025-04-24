'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player';
import { useAuth } from '@/context/AuthContext'; // Now uses Supabase Auth
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client from new path
// Removed Firebase DB/Storage imports
// Remove Firebase DB/Storage imports: import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';
import { FileVideo, Upload, X, Clock, CheckCircle, AlertCircle, Image as ImageIcon, DollarSign } from 'lucide-react';
// Remove MCP hook import - no longer creating Stripe objects here
// import { useMcpTool } from '@/hooks/useMcpTool';
import { TablesInsert } from '@/lib/database.types';

// UI Components
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Import Input component
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MAX_VIDEO_DURATION = 60; // Maximum duration in seconds
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
const MIN_SALE_PRICE = 0.50; // Minimum price in USD

export default function UploadPage() {
  const { user } = useAuth();
  // console.log('Current User ID:', user?.id); // Log user ID for debugging profile creation - Replaced with UI display
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image' | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null); // Specific to video
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null); // Specific to video
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  // const [isPaidContent, setIsPaidContent] = useState(false); // Replaced by isForSale
  const [isForSale, setIsForSale] = useState(false); // New state for sale flag
  const [salePrice, setSalePrice] = useState(''); // New state for sale price (string for input)
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Remove MCP hook usage
  // const { callTool: callStripeTool, isLoading: isStripeLoading } = useMcpTool('github.com/stripe/agent-toolkit');
  const [error, setError] = useState<string | null>(null);
  const [isValidDuration, setIsValidDuration] = useState<boolean | null>(null);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null); // Keep for potential future use, though ReactPlayer handles preview

  // Clear all states and start fresh
  const resetState = useCallback(() => {
    // Revoke previous object URL to prevent memory leaks
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setVideoDuration(null);
    setVideoThumbnail(null);
    setCaption('');
    setTags([]);
    setTagInput('');
    setIsPrivate(false);
    // setIsPaidContent(false); // Remove reset for old state
    setIsForSale(false); // Reset new state
    setSalePrice(''); // Reset new state
    setIsUploading(false);
    setUploadProgress(0);
    setError(null);
    setIsValidDuration(null);
    setCurrentTabIndex(0);
  }, [mediaPreviewUrl]); // Dependency for revokeObjectURL

  // Generic file validation
  const validateFile = useCallback((file: File): boolean => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`);
      return false;
    }

    // Check file type (basic check)
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
      setError('Invalid file type. Please select a video or image file.');
      return false;
    }

    return true;
  }, []); // setError is stable

  // Generate video thumbnail (moved before processMediaFile)
  const generateThumbnail = useCallback((videoUrl: string) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous'; // Important for cross-origin data fetching
    video.currentTime = 1; // Seek to 1 second for the thumbnail frame

    video.onloadeddata = () => {
      // Ensure video dimensions are available
      if (video.videoWidth && video.videoHeight) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          try {
            const thumbnail = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG format, quality 0.8
            setVideoThumbnail(thumbnail);
          } catch (e) {
            console.error("Error generating thumbnail:", e);
            // Handle potential security errors with canvas.toDataURL
          }
        }
      }
    };
    video.onerror = (e) => {
      console.error("Error loading video for thumbnail generation:", e);
    };
  }, []); // setVideoThumbnail is stable

  // Process media file after selection
  const processMediaFile = useCallback((file: File) => {
    if (!validateFile(file)) return;

    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreviewUrl(url);

    // Determine media type
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMediaType(type);

    // Reset video-specific states
    setIsValidDuration(null);
    setVideoDuration(null);
    setVideoThumbnail(null); // Reset thumbnail

    if (type === 'video') {
      // Generate thumbnail for video when possible
      // Use a slight delay to ensure the video element can be processed
      setTimeout(() => {
        generateThumbnail(url);
      }, 500);
      // Duration check will happen via ReactPlayer's onDuration prop
    } else {
      // For images, duration is not applicable
      setIsValidDuration(true); // Mark as valid for navigation purposes
    }
  }, [validateFile, generateThumbnail]); // Dependencies are memoized functions

  // Handle loaded metadata (video duration check) - Called by ReactPlayer
  const handleLoadedMetadata = (duration: number) => {
    if (mediaType !== 'video') return; // Only process for videos

    setVideoDuration(duration);
    if (duration > MAX_VIDEO_DURATION) {
      setError(`Video is too long (${Math.round(duration)}s). Maximum duration is ${MAX_VIDEO_DURATION} seconds.`);
      setIsValidDuration(false);
    } else {
      setIsValidDuration(true);
      setError(null); // Clear previous errors if duration is now valid
    }
  };

  // Tag management
  const addTag = () => {
    const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/gi, ''); // Sanitize tag
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // React-dropzone setup
  const onDrop = useCallback((acceptedFiles: File[]) => {
    resetState(); // Clear previous state on new drop
    if (acceptedFiles.length > 0) {
      processMediaFile(acceptedFiles[0]);
    } else {
      // Handle rejected files (e.g., wrong type, too many files)
      // The useDropzone hook provides `fileRejections` which can be used here
      // For simplicity, we rely on the validation within processMediaFile for now
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processMediaFile, resetState]); // resetState depends on mediaPreviewUrl, processMediaFile is stable. This is correct.

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm'], // Be more specific if needed
      'image/*': ['.jpeg', '.png', '.jpg', '.gif', '.webp'],
    },
    maxFiles: 1,
    multiple: false,
    // Add maxSize validation here too for immediate feedback
    maxSize: MAX_FILE_SIZE,
    onDropRejected: (fileRejections) => {
      // Provide more specific feedback on rejection
      const firstRejection = fileRejections[0];
      if (firstRejection) {
        const error = firstRejection.errors[0];
        if (error.code === 'file-too-large') {
          setError(`File is too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
        } else if (error.code === 'file-invalid-type') {
          setError('Invalid file type. Please upload a supported video or image.');
        } else {
          setError('File rejected. Please try again.');
        }
      }
      resetState(); // Clear state if file is rejected
    }
  });

  // Get dropzone styling based on state
  const getDropzoneClassName = () => {
    return `relative border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ease-in-out cursor-pointer
      ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/80'}
      ${isDragAccept ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
      ${isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
      ${mediaPreviewUrl ? '' : 'min-h-[200px] flex flex-col justify-center items-center'}`; // Maintain min height only when empty
  };

  // Upload the media (video or image)
  const handleUpload = async () => {
    // Basic validation: check for user and file
    if (!user) {
      setError("You must be logged in to upload.");
      toast.error("You must be logged in to upload.");
      return;
    }
    if (!mediaFile) {
      setError("Please select a file to upload.");
      toast.error("Please select a file to upload.");
      return;
    }
    if (!caption.trim()) {
       setError("Please enter a caption.");
       toast.error("Please enter a caption.");
       return;
    }

    // Video-specific validation
    if (mediaType === 'video' && !isValidDuration) {
      setError(`Video duration must be ${MAX_VIDEO_DURATION} seconds or less.`);
       toast.error(`Video duration must be ${MAX_VIDEO_DURATION} seconds or less.`);
       return;
     }

     // Check if marked for sale and price is valid
     let priceInCents: number | null = null;
     if (isForSale) {
        if (!salePrice || isNaN(parseFloat(salePrice))) {
            setError("Please enter a valid price for the item.");
            toast.error("Please enter a valid price.");
            return;
        }
        priceInCents = Math.round(parseFloat(salePrice) * 100);
        if (priceInCents < MIN_SALE_PRICE * 100) {
            setError(`Price must be at least $${MIN_SALE_PRICE.toFixed(2)}.`);
            toast.error(`Price must be at least $${MIN_SALE_PRICE.toFixed(2)}.`);
            return;
        }
     }

     // Add check for mediaType before proceeding
     if (!mediaType) {
       setError("Media type could not be determined. Please re-select the file.");
       toast.error("Media type could not be determined. Please re-select the file.");
       setIsUploading(false); // Ensure loading stops
       return;
     }

      // Combine loading states
      setIsUploading(true); // Use mutation's isLoading eventually? For now, manual state.
      setError(null); // Clear previous errors
      setUploadProgress(0); // Reset progress

    // Create a loading toast
    const uploadToastId = toast.loading('Preparing to upload...');

    // Determine storage path based on media type
    // --- Supabase Upload Logic ---
    try {
      // --- Check/Create Supabase Profile ---
      console.log('[Upload] Step 1: Checking user profile...'); // Added log
      toast.loading('Checking user profile...', { id: uploadToastId });
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to get null if not found

      if (profileError) {
        // Add more specific logging for profile check failure
        console.error("[Upload Error] Supabase profile check failed:", profileError);
        throw new Error(`Failed to check profile: ${profileError.message}`);
      }
      console.log('[Upload] Profile check result:', profileData ? 'Exists' : 'Does not exist', 'Error:', profileError); // Added log

      if (!profileData) {
        // Profile doesn't exist, create it
        toast.loading('Creating user profile...', { id: uploadToastId });
        // Generate a simple temporary username - consider a better strategy if usernames must be unique and user-settable later
        const tempUsername = `user_${user.id.substring(0, 8)}`;
        console.log(`[Upload] Step 2: Profile not found. Attempting to create profile with id=${user.id}, uid=${user.id}, username=${tempUsername}`); // Added log
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id, // Corresponds to auth.users.id
            uid: user.id, // Set the non-null uid column, assuming it's the same as the auth id
            username: tempUsername,
            // Initialize other non-null profile fields here if necessary
          });

        if (insertProfileError) {
           // Handle potential unique constraint violation for username if it happens
           if (insertProfileError.code === '23505') { // Unique violation code for PostgreSQL
               console.warn(`Temporary username ${tempUsername} conflict. Profile might already exist or needs manual update.`);
               // Decide how to handle: retry with different username, or proceed assuming profile exists?
               // For now, we'll proceed cautiously, but this might need refinement.
               console.error(`[Upload Error] Profile username conflict for ${tempUsername}.`, insertProfileError); // Added log
               toast.error(`Profile username conflict. Please try again or update your profile.`, { id: uploadToastId });
               throw new Error(`Profile username conflict.`); // Stop the upload
           } else {
               console.error("[Upload Error] Failed to create profile:", insertProfileError); // Added log
               throw new Error(`Failed to create profile: ${insertProfileError.message}`);
           }
        } else {
           console.log('[Upload] Step 2: User profile created successfully.'); // Added log
           // Optionally update toast, or let the next step overwrite it
        }
      } else {
        console.log('[Upload] Step 2: Profile already exists, skipping creation.'); // Added log
      }
      // --- End Check/Create Supabase Profile ---

      // 1. Upload Media File (Video or Image)
      const mediaBucket = mediaType === 'video' ? 'videos' : 'images';
      console.log(`[Upload] Step 3: Uploading ${mediaType} to bucket '${mediaBucket}'...`);
      const mediaFilePath = `${user.id}/${Date.now()}_${mediaFile.name}`;
      console.log(`[Upload] Media file path: ${mediaFilePath}`);

      toast.loading(`Uploading ${mediaType}...`, { id: uploadToastId });

      const { data: mediaUploadData, error: mediaUploadError } = await supabase.storage
        .from(mediaBucket)
        .upload(mediaFilePath, mediaFile, { cacheControl: '3600', upsert: false });

      if (mediaUploadError) throw mediaUploadError;
      console.log(`[Upload] Step 3: ${mediaType} uploaded successfully.`);
      toast.loading(`Processing...`, { id: uploadToastId });

      console.log(`[Upload] Step 4: Getting public URL for ${mediaType}...`);
      const { data: mediaUrlData } = supabase.storage.from(mediaBucket).getPublicUrl(mediaFilePath);
      const mediaPublicUrl = mediaUrlData?.publicUrl;
      if (!mediaPublicUrl) throw new Error(`Failed to get public URL for ${mediaType}`);
      console.log(`[Upload] Step 4: Got public URL: ${mediaPublicUrl}`);

      // 2. Upload Thumbnail (only for videos)
      let thumbnailPublicUrl: string | null = null;
      if (mediaType === 'video' && videoThumbnail) {
        console.log('[Upload] Step 5: Uploading video thumbnail...');
        try {
          const response = await fetch(videoThumbnail);
          const blob = await response.blob();
          const thumbnailFilePath = `thumbnails/${user.id}/${Date.now()}_thumbnail.jpg`;
          console.log(`[Upload] Thumbnail file path: ${thumbnailFilePath}`);
          const { error: thumbUploadError } = await supabase.storage.from('thumbnails').upload(thumbnailFilePath, blob, { upsert: false });
          if (thumbUploadError) throw thumbUploadError;
          const { data: thumbUrlData } = supabase.storage.from('thumbnails').getPublicUrl(thumbnailFilePath);
          thumbnailPublicUrl = thumbUrlData?.publicUrl || null;
          console.log(`[Upload] Step 5a: Got thumbnail public URL: ${thumbnailPublicUrl}`);
        } catch (thumbError) {
          console.warn("[Upload Warning] Error during thumbnail processing/upload:", thumbError);
        }
      } else if (mediaType === 'video') {
        console.log('[Upload] Step 5: Skipping thumbnail upload.');
      } else {
          console.log('[Upload] Step 6: Skipping Stripe product/price creation (will be handled at checkout).');
      }

      // 4. Save metadata to Supabase Database ('posts' table)
      console.log('[Upload] Step 7: Preparing post metadata for database insert...');
      // Stripe IDs will be null here when saving the post initially
      const stripeProductId: string | null = null;
      const stripePriceId: string | null = null;
      const postData: TablesInsert<'posts'> = {
        user_id: user.id,
        caption: caption.trim(),
        tags: tags,
        is_private: isPrivate,
        likes_count: 0,
        views_count: 0,
        comments_count: 0,
        type: mediaType,
        is_for_sale: isForSale, // Use the new flag
        price: isForSale ? priceInCents : null, // Set price only if for sale
        currency: isForSale ? 'usd' : null, // Set currency only if for sale
        stripe_product_id: isForSale ? stripeProductId : null, // Set Stripe ID only if for sale
        stripe_price_id: isForSale ? stripePriceId : null, // Set Stripe ID only if for sale
        ...(mediaType === 'video' && {
          video_url: mediaPublicUrl,
          thumbnail_url: thumbnailPublicUrl,
          duration: videoDuration ? Math.round(videoDuration) : 0,
        }),
        ...(mediaType === 'image' && {
          image_url: mediaPublicUrl,
        }),
      };
      console.log('[Upload] Post data to insert:', postData);

      console.log('[Upload] Step 8: Inserting post metadata into database...');
      toast.loading('Saving post details...', { id: uploadToastId });
      const { error: insertError } = await supabase.from('posts').insert(postData);

      if (insertError) {
        // Attempt cleanup on DB insert failure
        await supabase.storage.from(mediaBucket).remove([mediaFilePath]);
        if (thumbnailPublicUrl) await supabase.storage.from('thumbnails').remove([thumbnailPublicUrl.split('/').pop()!]);
        // TODO: Consider deleting Stripe product/price here
        throw insertError;
      }

      console.log('[Upload] Step 8: Post metadata inserted successfully.');
      toast.success(`${mediaType === 'video' ? 'Video' : 'Image'} published successfully!`, { id: uploadToastId });
      resetState(); // Reset form after successful upload

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Upload Error] Overall upload process failed:", err);
      setError(`Operation failed: ${message}`);
      toast.error(`Operation failed: ${message}`, { id: uploadToastId });
    } finally {
      console.log('[Upload] Upload process finished (finally block).');
      setIsUploading(false); // Ensure loading state is always reset
    }
  };

  // Advance to next tab
  const goToNextTab = () => {
    // Add validation check before proceeding from step 1
    if (currentTabIndex === 0) {
       if (!mediaFile) {
         toast.error("Please select a file first.");
         return;
       }
       if (mediaType === 'video' && !isValidDuration) {
         toast.error("Video duration is invalid.");
         return;
       }
    }
    // Add validation check before proceeding from step 2
    if (currentTabIndex === 1) {
        if (!caption.trim()) {
            toast.error("Please enter a caption.");
            return;
        }
    }

    if (currentTabIndex < 2) {
      setCurrentTabIndex(currentTabIndex + 1);
    }
  };

  // Go back to previous tab
  const goToPreviousTab = () => {
    if (currentTabIndex > 0) {
      setCurrentTabIndex(currentTabIndex - 1);
    }
  };

  // Determine if the "Continue" or "Publish" button should be disabled
  const isNextDisabled = () => {
    if (currentTabIndex === 0) {
      return !mediaFile || (mediaType === 'video' && !isValidDuration);
    }
    if (currentTabIndex === 1) {
      return !caption.trim();
    }
    if (currentTabIndex === 2) {
      return isUploading || !mediaFile || !caption.trim() || (mediaType === 'video' && !isValidDuration);
    }
    return true; // Should not happen
  };


  return (
    <div className="container mx-auto px-4 py-8 flex justify-center min-h-[calc(100vh-80px)]">
      <Toaster position="top-center" reverseOrder={false} />

      <Card className="w-full max-w-4xl border bg-card shadow-xl overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl md:text-3xl font-bold text-center">Create New Post</CardTitle>
          <CardDescription className="text-center">Share a video or image with your subscribers</CardDescription>
        </CardHeader>

        <CardContent>
          {/* Display User ID for debugging */}
          {user?.id && (
            <Alert variant="default" className="mb-6 bg-blue-900/20 border-blue-500 text-blue-300"> {/* Changed variant to default */}
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertTitle className="text-blue-300">Debug Info</AlertTitle>
              <AlertDescription className="text-blue-400">Current User ID: {user.id}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={String(currentTabIndex)} onValueChange={(val) => setCurrentTabIndex(parseInt(val))} className="relative">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="0" disabled={isUploading}>1. Upload</TabsTrigger>
              <TabsTrigger value="1" disabled={!mediaFile || (mediaType === 'video' && !isValidDuration) || isUploading}>2. Details</TabsTrigger>
              <TabsTrigger value="2" disabled={!mediaFile || !caption.trim() || (mediaType === 'video' && !isValidDuration) || isUploading}>3. Review</TabsTrigger>
            </TabsList>

            {/* Step 1: Upload Media */}
            <TabsContent value="0" className="space-y-4">
              <div {...getRootProps({ className: getDropzoneClassName() })}>
                <input {...getInputProps()} />

                {!mediaPreviewUrl ? (
                  <div className="text-center text-muted-foreground p-4">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="flex items-center justify-center space-x-4 text-primary">
                         <FileVideo className="h-10 w-10" />
                         <ImageIcon className="h-10 w-10" />
                      </div>
                      <p className="font-semibold text-lg">Drag & drop video or image here</p>
                      <p className="text-sm">or click to select file</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Video: Max {MAX_VIDEO_DURATION}s</span>
                        <span>&bull;</span>
                        <span>Max Size: {MAX_FILE_SIZE / 1024 / 1024}MB</span>
                      </div>
                       <p className="text-xs text-muted-foreground pt-2">(MP4, MOV, JPG, PNG, GIF, etc.)</p>
                    </motion.div>
                  </div>
                ) : (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center" // Use aspect-video for consistency
                    >
                      <Button
                        variant="destructive" // More visible
                        size="icon"
                        className="absolute top-2 right-2 z-10 rounded-full h-7 w-7" // Smaller button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent dropzone activation
                          resetState();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      {mediaType === 'video' && mediaPreviewUrl && (
                        <ReactPlayer
                          url={mediaPreviewUrl}
                          controls
                          width="100%"
                          height="100%" // Fill the container
                          style={{ position: 'absolute', top: 0, left: 0 }} // Ensure it covers the area
                          onDuration={handleLoadedMetadata}
                          onError={(e) => { console.error('ReactPlayer Error:', e); setError("Could not load video preview.")}}
                        />
                      )}
                      {mediaType === 'image' && mediaPreviewUrl && (
                        <img
                          src={mediaPreviewUrl}
                          alt="Image preview"
                          className="max-h-full max-w-full object-contain" // Contain within the aspect ratio box
                        />
                      )}

                      {/* Duration indicator only for videos */}
                      {mediaType === 'video' && videoDuration !== null && (
                        <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium backdrop-blur-sm
                          ${isValidDuration === false ? 'bg-red-600/80 text-white' : 'bg-black/60 text-white'}`} // Adjusted styling
                        >
                          <div className="flex items-center gap-1">
                            {isValidDuration === false ? <AlertCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            <span>{Math.round(videoDuration)}s / {MAX_VIDEO_DURATION}s</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {/* Continue Button for Step 1 */}
              <div className="flex justify-end pt-4">
                 <Button
                    onClick={goToNextTab}
                    disabled={isNextDisabled()}
                    className="w-full md:w-auto"
                  >
                    Continue
                  </Button>
              </div>
            </TabsContent>

            {/* Step 2: Add Details */}
            <TabsContent value="1" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="caption" className="text-base font-medium">Caption</Label>
                  <Textarea
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={`Write a caption for your ${mediaType ?? 'post'}...`}
                    rows={3}
                    maxLength={2200} // Increased caption length
                    className="mt-1.5 resize-none bg-background"
                    disabled={isUploading}
                  />
                  <div className="flex justify-end mt-1 text-xs text-muted-foreground">
                    {caption.length} / 2200
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags" className="text-base font-medium">Tags (up to 5)</Label>
                  <div className="flex mt-1.5">
                    <input
                      type="text"
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} // Prevent form submission on Enter
                      placeholder="Add a tag and press Enter"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={tags.length >= 5 || isUploading}
                    />
                    <Button
                      type="button" // Ensure it doesn't submit a form
                      variant="outline"
                      className="ml-2 shrink-0" // Prevent shrinking
                      onClick={addTag}
                      disabled={!tagInput.trim() || tags.length >= 5 || isUploading}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                        #{tag}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 ml-1 opacity-60 hover:opacity-100 hover:bg-transparent"
                          onClick={() => removeTag(tag)}
                          disabled={isUploading}
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                     {tags.length < 5 && <p className="text-xs text-muted-foreground self-center">You can add {5 - tags.length} more tags.</p>}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="private-switch" className="text-base font-medium">Private Post</Label>
                    <p className="text-sm text-muted-foreground">Only you will see this post (feature WIP)</p>
                  </div>
                  <Switch
                    id="private-switch"
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                    disabled={isUploading}
                  />
                </div>
                {/* Mark as For Sale Switch */}
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="sale-switch" className="text-base font-medium">Mark as For Sale</Label>
                    <p className="text-sm text-muted-foreground">Set a price for direct purchase.</p>
                  </div>
                  <Switch
                    id="sale-switch"
                    checked={isForSale}
                    onCheckedChange={setIsForSale}
                    disabled={isUploading}
                  />
                </div>
                {/* Price Input (Conditional) */}
                <AnimatePresence>
                  {isForSale && (
                    <motion.div
                      key="price-input"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4">
                        <Label htmlFor="sale-price" className="text-base font-medium">Price (USD)</Label>
                        <div className="relative mt-1.5">
                           <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="sale-price"
                              type="number"
                              value={salePrice}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSalePrice(e.target.value)} // Add type to event
                              placeholder="e.g., 5.00"
                              className="pl-8" // Add padding for the icon
                             step="0.01"
                             min={MIN_SALE_PRICE.toFixed(2)}
                             disabled={isUploading}
                           />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Minimum price is ${MIN_SALE_PRICE.toFixed(2)}.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Buttons for Step 2 */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={goToPreviousTab} disabled={isUploading}>
                  Back
                </Button>
                <Button onClick={goToNextTab} disabled={isNextDisabled()}>
                  Continue
                </Button>
              </div>
            </TabsContent>

            {/* Step 3: Review and Upload */}
            <TabsContent value="2" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Preview Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-lg">Preview</h3>
                  <div className="rounded-lg overflow-hidden border bg-muted aspect-video flex items-center justify-center relative">
                     {mediaType === 'video' && mediaPreviewUrl && (
                       <ReactPlayer
                         url={mediaPreviewUrl}
                         controls
                         width="100%"
                         height="100%"
                         light={videoThumbnail || true} // Use thumbnail for light preview
                         style={{ position: 'absolute', top: 0, left: 0 }}
                       />
                     )}
                     {mediaType === 'image' && mediaPreviewUrl && (
                       <img
                         src={mediaPreviewUrl}
                         alt="Final preview"
                         className="max-h-full max-w-full object-contain"
                       />
                     )}
                     {!mediaPreviewUrl && <p className="text-muted-foreground text-sm">No preview available</p>}
                   </div>
                </div>

                {/* Details Section */}
                <div className="space-y-3">
                  <h3 className="font-medium text-lg">Details</h3>
                  <div className="rounded-md border bg-background p-4 space-y-3 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground font-semibold">Caption</Label>
                      <p className="mt-1 whitespace-pre-wrap break-words">{caption || "(No caption)"}</p>
                    </div>

                    {tags.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground font-semibold">Tags</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground font-semibold">Visibility</Label>
                      <Badge variant={isPrivate ? "secondary" : "outline"} className="text-xs">
                        {isPrivate ? 'Private' : 'Public'}
                      </Badge>
                    </div>
                     <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground font-semibold">Access</Label>
                      <Badge variant={isForSale ? "default" : "outline"} className={`text-xs ${isForSale ? 'bg-green-600 hover:bg-green-700 text-white border-green-700' : ''}`}>
                        {isForSale ? `For Sale ($${salePrice || '?.??'})` : 'Free'}
                      </Badge>
                    </div>

                    {/* Show duration only for videos */}
                    {mediaType === 'video' && (
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground font-semibold">Duration</Label>
                        <Badge variant="outline" className="text-xs">{videoDuration ? `${Math.round(videoDuration)}s` : 'N/A'}</Badge>
                      </div>
                    )}
                     <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground font-semibold">Type</Label>
                        <Badge variant="outline" className="text-xs capitalize">{mediaType || 'N/A'}</Badge>
                      </div>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2 pt-4">
                  <Progress value={uploadProgress} className="w-full h-2" />
                  <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Upload className="h-4 w-4 animate-pulse" />
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}

              {/* Navigation Buttons for Step 3 */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={goToPreviousTab} disabled={isUploading}>
                  Back
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* Wrap button in div for tooltip when disabled */}
                      <div>
                        <Button
                          onClick={handleUpload}
                          disabled={isNextDisabled()}
                          className="min-w-[120px]"
                          aria-label="Publish post"
                        >
                          {isUploading ? (
                             <>
                               <Upload className="h-4 w-4 mr-2 animate-pulse" />
                               Uploading...
                             </>
                          ) : (
                             `Publish ${mediaType ? (mediaType === 'video' ? 'Video' : 'Image') : 'Post'}`
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Share your content with the world!</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
