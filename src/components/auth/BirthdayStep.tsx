"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BirthdayStepProps {
  onNext: (data: { birthday: string }) => void;
  isLoading: boolean;
  // Add onPrevious if this step can go back
  // onPrevious?: () => void;
}

export function BirthdayStep({ onNext, isLoading }: BirthdayStepProps) {
  const [month, setMonth] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleNext = () => {
    if (!month || !day || !year) {
      setError('Please select your full birthday.');
      return;
    }
    // Basic validation (e.g., check if date is reasonable) - more robust validation could be added
    const selectedYear = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    if (selectedYear > currentYear - 5 || selectedYear < currentYear - 100) { // Example age range
        setError('Please enter a valid birth year.');
        return;
    }

    setError('');
    // Format birthday as YYYY-MM-DD or keep as separate fields if preferred
    const birthdayString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    onNext({ birthday: birthdayString });
  };

  // Generate options for day, month, year
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i - 5)); // Example: last 100 years starting 5 years ago

  return (
    <div className="space-y-4">
      <div>
        <Label>When's your birthday?</Label>
        <p className="text-sm text-muted-foreground">Your birthday won't be shown publicly.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
          <SelectContent>
            {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button onClick={handleNext} disabled={isLoading || !month || !day || !year} className="w-full">
        {isLoading ? 'Loading...' : 'Next'}
      </Button>
      {/* Add Previous button if needed */}
      {/* {onPrevious && <Button variant="outline" onClick={onPrevious} disabled={isLoading} className="w-full mt-2">Previous</Button>} */}
    </div>
  );
}
