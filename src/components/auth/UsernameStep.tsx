"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

interface UsernameStepProps {
  onNext: (data: { username: string; skipped: boolean }) => void;
  onPrevious: () => void;
  isLoading: boolean;
}

// Basic debounce function using generics (reverted constraint)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function UsernameStep({ onNext, onPrevious, isLoading }: UsernameStepProps) {
  const [username, setUsername] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Debounced username check function
  const checkUsernameAvailability = debounce(async (name: string) => {
    if (!name || name.length < 3) {
      setValidationError('Username must be at least 3 characters.');
      setIsAvailable(null);
      setIsValidating(false);
      return;
    }
    // Basic validation for allowed characters (alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        setValidationError('Username can only contain letters, numbers, and underscores.');
        setIsAvailable(null);
        setIsValidating(false);
        return;
    }

    setIsValidating(true);
    setValidationError(null);
    setIsAvailable(null);

    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('username', name);

      if (error) throw error;

      setIsAvailable(count === 0);
    } catch (error) {
      console.error("Error checking username:", error);
      setValidationError("Couldn't check username. Please try again.");
      setIsAvailable(null);
    } finally {
      setIsValidating(false);
    }
  }, 500); // 500ms debounce delay

  useEffect(() => {
    if (username) {
      checkUsernameAvailability(username);
    } else {
      // Clear validation state if input is empty
      setValidationError(null);
      setIsAvailable(null);
      setIsValidating(false);
    }
    // Cleanup debounce timer if component unmounts or username changes quickly
    return () => {
        // No explicit cleanup needed for this debounce implementation,
        // but good practice if timers were managed differently.
    };
  }, [username, checkUsernameAvailability]); // Added checkUsernameAvailability dependency

  const handleNext = () => {
    if (isAvailable === false) {
      setValidationError('Username is already taken.');
      return;
    }
    if (validationError && validationError !== "Couldn't check username. Please try again.") {
        // Prevent proceeding if there's a validation error other than the check failure
        return;
    }
    // Proceed even if validation failed due to network/DB error,
    // the backend signup logic should handle final validation/generation.
    onNext({ username: username.trim(), skipped: false });
  };

  const handleSkip = () => {
    // Pass empty username and skipped flag
    onNext({ username: '', skipped: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="username">Create username</Label>
        <div className="relative mt-1">
          <Input
            id="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`pr-10 ${isAvailable === false ? 'border-red-500' : isAvailable === true ? 'border-green-500' : ''}`}
            aria-describedby="username-validation"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {isValidating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {!isValidating && isAvailable === true && <span className="text-green-500 text-xs">Available</span>}
            {!isValidating && isAvailable === false && <span className="text-red-500 text-xs">Taken</span>}
          </div>
        </div>
        {validationError && <p id="username-validation" className="text-sm text-red-500 mt-1">{validationError}</p>}
        {/* TODO: Add suggested usernames based on input or email */}
        {/* <div className="mt-2 text-sm text-muted-foreground">Suggested: ...</div> */}
      </div>
      <Button onClick={handleNext} disabled={isLoading || isValidating || isAvailable === false || !!validationError} className="w-full">
        {isLoading ? 'Signing up...' : 'Sign up'}
      </Button>
      <Button variant="outline" onClick={handleSkip} disabled={isLoading} className="w-full">
        Skip
      </Button>
      <Button variant="ghost" onClick={onPrevious} disabled={isLoading} className="w-full text-sm">
        Previous
      </Button>
    </div>
  );
}
