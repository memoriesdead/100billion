'use client';

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera } from 'lucide-react';

interface VideoUploadInputProps {
  id: string;
  label: string;
  initialVideoUrl?: string | null;
  onFileChange: (file: File | null) => void; // Callback with the final File or null
  disabled?: boolean;
  buttonText?: string;
}

export function VideoUploadInput({
  id,
  label,
  initialVideoUrl = null,
  onFileChange,
  disabled = false,
  buttonText = "Change Video"
}: VideoUploadInputProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialVideoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Update preview if initialVideoUrl changes externally
  useEffect(() => {
    setPreviewUrl(initialVideoUrl);
  }, [initialVideoUrl]);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear previous errors
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError("Invalid file type. Please select a video.");
        // Clear the input value
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        onFileChange(null); // Notify parent that selection failed/was cleared
        setPreviewUrl(initialVideoUrl); // Revert preview
        return;
      }

      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      onFileChange(file); // Pass the selected file back

      // Clean up previous object URL if exists to prevent memory leaks
      // Note: This might revoke the URL before the video element fully loads it in some cases.
      // A more robust solution might involve tracking the previous URL and revoking it in an effect cleanup.
      // For simplicity here, we revoke immediately. Consider revising if preview issues arise.
      // if (previewUrl && previewUrl.startsWith('blob:')) {
      //   URL.revokeObjectURL(previewUrl);
      // }

    } else {
      // No file selected, revert to initial state
      setPreviewUrl(initialVideoUrl);
      onFileChange(null);
    }
    // Clear the input value so selecting the same file again triggers onChange
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Input
        id={id}
        type="file"
        accept="video/mp4, video/webm, video/quicktime, video/ogg" // Common video types
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <div
        className="relative w-full h-32 bg-muted rounded-md border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
        onClick={triggerFileInput}
        title={`Click to change ${label.toLowerCase()}`}
      >
        {previewUrl ? (
          <video
            src={previewUrl}
            className="w-full h-full object-cover rounded-md"
            autoPlay
            loop
            muted // Muted is important for autoplay in most browsers
            playsInline // Important for iOS Safari
            key={previewUrl} // Force re-render on change
          />
        ) : (
          <span className="text-muted-foreground text-sm">Click to upload {label.toLowerCase()}</span>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-md">
          <Camera className="text-white h-8 w-8" />
        </div>
      </div>
       <Button type="button" variant="link" size="sm" onClick={triggerFileInput} disabled={disabled} className="text-sm -mt-1">
          {buttonText}
        </Button>
    </div>
  );
}
