'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  aspect: number; // e.g., 1 for square, 16/9 for banner
  circularCrop?: boolean;
  onApply: (croppedBlob: Blob) => void;
  title?: string;
}

// Helper function to generate cropped image blob (copied from original form)
async function getCroppedImg(
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
  const pixelRatio = 1; // Or window.devicePixelRatio;

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
    }, 'image/png');
  });
}

// Helper function to center the crop (copied from original form)
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

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  aspect,
  circularCrop = false,
  onApply,
  title = "Edit photo"
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Reset state when imageSrc changes (modal opens with new image)
  useEffect(() => {
    if (imageSrc) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setScale(1);
      setError(null);
    }
  }, [imageSrc]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    if (width > 0 && height > 0) {
        setCrop(centerAspectCrop(width, height, aspect));
    } else {
        setError("Could not load image dimensions.");
    }
  }

  const handleApplyCrop = async () => {
    setError(null);
    if (!completedCrop || !imgRef.current || !imageSrc) {
      console.error("Crop details, image ref, or image source not available");
      setError("Could not apply crop. Please ensure an image is loaded and selected.");
      return;
    }
    if (completedCrop.width === 0 || completedCrop.height === 0) {
        setError("Invalid crop dimensions. Please select an area to crop.");
        return;
    }

    try {
      const croppedBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        scale
      );
      if (croppedBlob) {
        onApply(croppedBlob);
        onClose(); // Close modal on successful apply
      } else {
        setError("Failed to generate cropped image.");
      }
    } catch (e) {
      console.error("Error cropping image:", e);
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(`Could not crop the image: ${message}. Please try again.`);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[625px] bg-black text-white border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-red-600 px-6 pb-2">{error}</p>}
        <div className="relative flex justify-center items-center overflow-hidden p-4" style={{ maxHeight: '70vh' }}>
          {imageSrc ? (
            <div className="flex flex-col items-center space-y-4 w-full">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                circularCrop={circularCrop}
                keepSelection
              >
                <img
                  ref={imgRef}
                  alt="Crop preview"
                  src={imageSrc}
                  style={{
                    transform: `scale(${scale})`,
                    objectFit: 'contain',
                    width: '100%',
                    height: 'auto',
                    maxHeight: '60vh' // Limit image display height
                  }}
                  onLoad={onImageLoad}
                  onError={() => setError("Failed to load image for cropping.")}
                />
              </ReactCrop>
              <div className="w-full max-w-xs flex items-center space-x-2 mt-4 px-4 self-center">
                <Label htmlFor="zoom" className="w-12 text-sm text-gray-400">Zoom</Label>
                <Slider
                  id="zoom"
                  min={1}
                  max={3}
                  step={0.01}
                  value={[scale]}
                  onValueChange={(value) => setScale(value[0])}
                  className="flex-1 [&>span:first-child]:h-1 [&>span:first-child>span]:bg-white [&>span:last-child]:bg-gray-600 [&>span:last-child]:border-0"
                />
              </div>
            </div>
          ) : (
             <p className="text-gray-400">No image selected for cropping.</p> // Handle case where imageSrc is null
          )}
        </div>
        <DialogFooter className="bg-black pt-4 pb-6 px-6 border-t border-gray-800 sm:justify-between">
          <Button type="button" variant="ghost" onClick={handleCancel} className="text-white hover:bg-gray-700">Cancel</Button>
          <Button
            type="button"
            onClick={handleApplyCrop}
            disabled={!completedCrop || completedCrop.width === 0 || completedCrop.height === 0 || !imageSrc}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
