'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation'; // For navigation
import ReactCrop, { type Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // For the hidden file input

// Helper function to generate cropped image blob (same as before)
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
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

// Helper function to center the crop (same as before)
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}


export function ProfileImageEditor() {
  const router = useRouter();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aspect = 1; // For circular/square crop

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null); // Clear previous errors
      setCrop(undefined); // Reset crop on new image
      setScale(1); // Reset zoom
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
      };
      reader.onerror = () => {
        setError("Failed to read the selected file.");
        setImageSrc(null);
      }
      reader.readAsDataURL(file);
    } else {
        setImageSrc(null); // Clear image if no file selected
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }

  const handleApplyCrop = async () => {
    if (!completedCrop || !imgRef.current || !imageSrc) {
      setError("Cannot apply crop. Please select an image and define a crop area.");
      return;
    }
    try {
      setError(null);
      const croppedBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        scale
      );

      if (croppedBlob) {
        // TODO: Decide how to pass this blob/file back to the profile edit page.
        // Options:
        // 1. Store in Context API state
        // 2. Store in localStorage/sessionStorage (as base64 or blob URL)
        // 3. Pass via router query params (limited size, maybe just a flag?)
        // For now, let's just log it and navigate back.
        console.log("Cropped Blob:", croppedBlob);
        const blobUrl = URL.createObjectURL(croppedBlob);
        console.log("Blob URL:", blobUrl);
        // Example: Store blob URL in session storage
        sessionStorage.setItem('croppedProfileImage', blobUrl);
        // Navigate back to the previous page (presumably the main edit page)
        router.back();
      }
    } catch (e) {
      console.error("Error cropping image:", e);
      setError("Could not crop the image. Please try again.");
    }
  };

  const handleCancel = () => {
    // Clear any stored temporary image if needed
    sessionStorage.removeItem('croppedProfileImage');
    router.back(); // Go back to the previous page
  };

  return (
    <div className="flex flex-col items-center p-4 space-y-6 bg-card text-card-foreground rounded-lg border shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight">Edit photo</h2>

      {/* Hidden File Input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Button to trigger file selection if no image is loaded */}
      {!imageSrc && (
        <Button onClick={triggerFileSelect}>Select Image</Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Cropper Section */}
      {imageSrc && (
        <div className="w-full max-w-md flex flex-col items-center space-y-4">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            circularCrop
            keepSelection
          >
            <img
              ref={imgRef}
              alt="Crop preview"
              src={imageSrc}
              style={{ transform: `scale(${scale})`, maxHeight: '60vh' }}
              onLoad={onImageLoad}
            />
          </ReactCrop>

          {/* Zoom Slider */}
          <div className="w-full flex items-center space-x-2 pt-4">
            <Label htmlFor="zoom" className="w-16 text-sm">Zoom</Label>
            <Slider
              id="zoom"
              min={1}
              max={3}
              step={0.01}
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
              className="flex-1"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {imageSrc && (
        <div className="flex justify-center space-x-4 pt-4 w-full max-w-md">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleApplyCrop} disabled={!completedCrop}>Apply</Button>
        </div>
      )}
    </div>
  );
}
