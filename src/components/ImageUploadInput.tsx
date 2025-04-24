'use client';

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal'; // Import the modal

interface ImageUploadInputProps {
  id: string;
  label: string;
  initialImageUrl?: string | null;
  aspect: number;
  circularCrop?: boolean;
  onFileChange: (file: File | null) => void; // Callback with the final File or null
  disabled?: boolean;
  previewType?: 'avatar' | 'banner'; // Optional prop for styling preview
  buttonText?: string;
  modalTitle?: string;
}

export function ImageUploadInput({
  id,
  label,
  initialImageUrl = null,
  aspect,
  circularCrop = false,
  onFileChange,
  disabled = false,
  previewType = 'avatar', // Default to avatar style
  buttonText = "Change Picture",
  modalTitle = "Edit photo"
}: ImageUploadInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);
  const [imageSrcForCrop, setImageSrcForCrop] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Update preview if initialImageUrl changes externally
  useEffect(() => {
    setPreviewUrl(initialImageUrl);
  }, [initialImageUrl]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear previous errors
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("Invalid file type. Please select an image.");
        // Clear the input value
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrcForCrop(reader.result as string);
        setIsCropModalOpen(true);
      };
      reader.onerror = () => {
        setError("Failed to read the selected file.");
        setImageSrcForCrop(null);
      };
      reader.readAsDataURL(file);
    } else {
        setImageSrcForCrop(null); // Reset crop source if no file selected
    }
    // Clear the input value so selecting the same file again triggers onChange
    // Important: Do this *after* initiating the FileReader
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleApplyCrop = (croppedBlob: Blob) => {
    setError(null);
    // Create a File object from the blob
    const fileExtMatch = imageSrcForCrop?.match(/data:image\/(.+);/); // Use optional chaining
    const fileExt = fileExtMatch ? fileExtMatch[1] : 'png'; // Default to png
    const fileName = `${id}_cropped_${Date.now()}.${fileExt}`;
    const croppedFile = new File([croppedBlob], fileName, { type: `image/${fileExt}` });

    setPreviewUrl(URL.createObjectURL(croppedBlob)); // Update preview
    onFileChange(croppedFile); // Pass the cropped file back
    setIsCropModalOpen(false); // Close modal handled by modal itself now
    setImageSrcForCrop(null); // Clear crop source
  };

  const handleCancelCrop = () => {
    setIsCropModalOpen(false);
    setImageSrcForCrop(null);
    // No need to clear input ref here as it's cleared on selection
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Render different preview styles based on prop
  const renderPreview = () => {
    if (previewType === 'banner') {
      return (
        <div
          className="relative w-full h-32 bg-muted rounded-md border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
          onClick={triggerFileInput}
          title="Click to change banner"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`${label} Preview`}
              className="w-full h-full object-cover rounded-md"
              key={previewUrl} // Force re-render on change
            />
          ) : (
            <span className="text-muted-foreground text-sm">Click to upload {label.toLowerCase()}</span>
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-md">
            <Camera className="text-white h-8 w-8" />
          </div>
        </div>
      );
    } else { // Default to 'avatar' style
      return (
        <div className="flex items-center space-x-4">
          <div className="relative cursor-pointer" onClick={triggerFileInput} title={`Click to change ${label.toLowerCase()}`}>
            <Avatar className="w-24 h-24 border-2 border-muted">
              <AvatarImage src={previewUrl ?? undefined} alt={`${label} Preview`} key={previewUrl} />
              <AvatarFallback className="text-3xl">??</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
              <Camera className="text-white h-6 w-6" />
            </div>
          </div>
          <Button type="button" variant="link" size="sm" onClick={triggerFileInput} disabled={disabled} className="text-sm">
            {buttonText}
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Input
        id={id}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      {renderPreview()}
      {/* Render banner change button separately if type is banner */}
      {previewType === 'banner' && (
         <Button type="button" variant="link" size="sm" onClick={triggerFileInput} disabled={disabled} className="text-sm -mt-1">
            {buttonText}
          </Button>
      )}

      {/* Conditionally render the modal */}
      {imageSrcForCrop && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={handleCancelCrop}
          imageSrc={imageSrcForCrop}
          aspect={aspect}
          circularCrop={circularCrop}
          onApply={handleApplyCrop}
          title={modalTitle}
        />
      )}
    </div>
  );
}
