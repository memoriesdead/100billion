"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailPasswordStepProps {
  onNext: (data: { email: string; password: string }) => void;
  isLoading: boolean;
  // Add onPrevious if this step can go back (e.g., from Birthday)
  // onPrevious?: () => void;
}

export function EmailPasswordStep({ onNext, isLoading }: EmailPasswordStepProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');

  const handleNext = () => {
    setError(''); // Clear previous errors

    // Basic validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    onNext({ email: email.trim(), password });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button
        onClick={handleNext}
        disabled={isLoading || !email || !password || !confirmPassword || password !== confirmPassword}
        className="w-full"
      >
        {isLoading ? 'Loading...' : 'Next'}
      </Button>
      {/* Add Previous button if needed */}
      {/* {onPrevious && <Button variant="outline" onClick={onPrevious} disabled={isLoading} className="w-full mt-2">Previous</Button>} */}
    </div>
  );
}
