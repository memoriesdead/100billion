'use client';

import React, { useState } from 'react'; // Import useState
import { MainLayout } from '@/components/MainLayout';
import { EditProfileForm, ProfileFormData } from '@/components/EditProfileForm'; // Use named import and ProfileFormData type
// Removed EditProfileImagesForm import
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient'; // Import supabase
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import query hooks
import { useRouter } from 'next/navigation'; // Import router for navigation

// Define the shape of profile data needed for the form
interface EditProfileData {
  username: string | null;
  name: string | null;
  bio: string | null;
  subscription_price: number | null; // Added subscription price
  // Removed is_private flag
}

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch current profile data
  const { data: initialProfileData, isLoading: profileLoading, error: profileError } = useQuery<EditProfileData | null>({
    queryKey: ['editProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('username, name, bio, subscription_price') // Fetch subscription_price
        .eq('id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // Ignore 'not found' error, handle null data
      return data;
    },
    enabled: !!user?.id && !authLoading,
  });

  // Mutation for saving profile data
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: ProfileFormData) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name: formData.name,
          username: formData.username,
          bio: formData.bio,
          subscription_price: formData.subscription_price, // Save subscription_price
          // Removed is_private flag
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }); // Invalidate main profile query
      queryClient.invalidateQueries({ queryKey: ['editProfile', user?.id] }); // Invalidate edit profile query
      // Optionally show success toast
      router.push('/profile'); // Navigate back to profile page on success
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
      // Optionally show error toast
    }
  });

  const handleSave = (formData: ProfileFormData) => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    router.push('/profile'); // Navigate back to profile page
  };

  if (authLoading || profileLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <p>Loading...</p> {/* Consider a spinner component */}
        </div>
      </MainLayout>
    );
  }

  if (!user) { // Check if user is logged out after loading
    return (
      <MainLayout>
        <div className="container max-w-2xl mx-auto px-4 py-12">
          <Alert>
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              You need to be logged in to edit your profile.
              <Button variant="link" className="p-0 h-auto ml-2" asChild>
                <Link href="/login">Log In</Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Edit Profile</h1>
          <p className="text-muted-foreground">Update your profile information and images.</p>
        </div>
        
        <Separator /> 

        {/* Render the form for text details, passing props */}
        {profileError ? (
           <Alert variant="destructive">
             <AlertTitle>Error Loading Profile Data</AlertTitle>
             <AlertDescription>{(profileError as Error).message}</AlertDescription>
           </Alert>
        ) : initialProfileData ? (
           <EditProfileForm 
             initialProfileData={initialProfileData} 
             onSave={handleSave} 
             onCancel={handleCancel}
             isSaving={updateProfileMutation.isPending} // Pass saving state
           />
        ) : (
           <p>Could not load profile data to edit.</p> // Handle case where profile doesn't exist yet
        )}

        {/* Removed EditProfileImagesForm */}

      </div>
    </MainLayout>
  );
}
