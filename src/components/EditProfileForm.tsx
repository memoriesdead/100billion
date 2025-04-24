'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// Removed Switch import
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

// Type for the form data passed to onSave
export interface ProfileFormData {
  name: string;
  username: string;
  bio: string;
  subscription_price: number | null; // Added subscription price
  // Removed is_private flag
}

// Type for the initial data passed into the component
interface InitialProfileData {
  name: string | null;
  username: string | null;
  bio: string | null;
  subscription_price: number | null; // Added subscription price
  // Removed is_private flag
}

interface EditProfileFormProps {
  initialProfileData: InitialProfileData;
  onSave: (formData: ProfileFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function EditProfileForm({ 
  initialProfileData, 
  onSave, 
  onCancel, 
  isSaving 
}: EditProfileFormProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [subscriptionPrice, setSubscriptionPrice] = useState<string>(''); // Store as string for input, convert on save
  // Removed isPrivate state

  // Initialize form state when initial data changes
  useEffect(() => {
    setName(initialProfileData.name || '');
    setUsername(initialProfileData.username || '');
    setBio(initialProfileData.bio || '');
    // Initialize subscription price, handle null/undefined
    setSubscriptionPrice(initialProfileData.subscription_price?.toString() ?? '');
    // Removed isPrivate initialization
  }, [initialProfileData]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    let priceValue: number | null = null; // Initialize priceValue

    if (subscriptionPrice.trim() !== '') {
      const parsedPrice = parseFloat(subscriptionPrice);
      // Check if parsing failed or if the price is negative
      if (isNaN(parsedPrice) || parsedPrice < 0) { 
        alert("Please enter a valid, non-negative subscription price or leave it blank for free content.");
        return;
      }
      priceValue = parsedPrice; // Assign the valid, non-negative number
    }
    // If subscriptionPrice was empty or only whitespace, priceValue remains null

    onSave({
      name: name.trim(),
      username: username.trim(),
      bio: bio.trim(),
      subscription_price: priceValue, // Pass validated value (number or null)
      // Removed is_private state
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Details</CardTitle>
        <CardDescription>Update your name, username, and bio.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Your full name"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Your unique username"
              disabled={isSaving}
              // Add validation pattern if needed: pattern="^[a-zA-Z0-9_.]+$"
            />
             <p className="text-xs text-muted-foreground">Usernames can only contain letters, numbers, underscores, and periods.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio" 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              placeholder="Tell us a little about yourself"
              rows={4}
              maxLength={150}
              className="resize-none"
              disabled={isSaving}
            />
             <p className="text-xs text-muted-foreground text-right">{bio.length} / 150</p>
          </div>
          {/* Subscription Price Input */}
          <div className="space-y-1.5">
            <Label htmlFor="subscriptionPrice">Monthly Subscription Price (USD)</Label>
            <Input
              id="subscriptionPrice"
              type="number" // Use number type for better input control
              step="0.01" // Allow cents
              min="0" // Prevent negative prices
              value={subscriptionPrice}
              onChange={(e) => setSubscriptionPrice(e.target.value)}
              placeholder="Leave blank for free"
              disabled={isSaving}
              className="w-1/2" // Adjust width as needed
            />
            <p className="text-xs text-muted-foreground">Set a price for users to subscribe to your exclusive content. Leave blank if all your content is free.</p>
          </div>
          {/* Removed Private Profile Switch */}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
