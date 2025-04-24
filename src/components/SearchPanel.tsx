"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaSearch, FaTimes } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from '@/lib/supabaseClient';
import type { Tables } from '@/lib/database.types';
import { debounce } from 'lodash';

// --- Suggestion Types ---
type ProfileSuggestion = Pick<Tables<'profiles'>, 'id' | 'username' | 'name' | 'profile_picture_url'>;
type TextSuggestion = string; // Could be recent searches, popular terms etc.
type Suggestion =
 | { type: 'profile'; data: ProfileSuggestion }
 | { type: 'text'; data: TextSuggestion };

// --- Component Props ---
interface SearchPanelProps {
  isVisible: boolean; // To control internal logic if needed, though parent controls rendering
  setActiveSearchQuery: (query: string) => void; // Update parent's query for main content
  setIsSearchActive: (isActive: boolean) => void; // Signal parent if search is active
  closePanel: () => void; // Function to call when closing the panel
}

export function SearchPanel({
  isVisible, // isVisible might not be strictly needed if parent handles rendering
  setActiveSearchQuery,
  setIsSearchActive,
  closePanel
}: SearchPanelProps) {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState(''); // Internal state for the input
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true); // Keep suggestions visible while panel is open
  const panelRef = useRef<HTMLDivElement>(null); // Ref for the panel itself

  // --- Debounced Fetching for Suggestions ---
  const debouncedFetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 1) {
        // TODO: Fetch/show recent searches or default suggestions
        setSuggestions([
            { type: 'text', data: 'metal sonic edit' },
            { type: 'text', data: 'meta quest 3' },
        ]);
        setIsSearchingSuggestions(false);
        return;
      }
      setIsSearchingSuggestions(true);
      let combinedSuggestions: Suggestion[] = [];

      try {
        // Fetch profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, name, profile_picture_url')
          .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
          .limit(4);

        if (profileError) console.error("Profile suggestion error:", profileError);
        else if (profiles) {
          combinedSuggestions = combinedSuggestions.concat(
            profiles.map(p => ({ type: 'profile' as const, data: p as ProfileSuggestion }))
          );
        }

        // TODO: Fetch dynamic text suggestions
        const staticTextSuggestions: TextSuggestion[] = [
            "metal sonic edit", "metal gear solid", "meta quest 3", "metallica",
        ].filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

        combinedSuggestions = combinedSuggestions.concat(
            staticTextSuggestions.map(s => ({ type: 'text' as const, data: s }))
        );

        // Sort suggestions (e.g., text first, then profiles)
        combinedSuggestions.sort((a, b) => {
            if (a.type === 'text' && b.type === 'profile') return -1;
            if (a.type === 'profile' && b.type === 'text') return 1;
            return 0;
        });

        setSuggestions(combinedSuggestions);

      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setSuggestions([]);
      } finally {
       setIsSearchingSuggestions(false);
       }
     }, 300),
     [] // Debounce function is stable, empty dependency array is correct.
   );

  // --- Effects ---
  // Fetch suggestions when query changes
  useEffect(() => {
     debouncedFetchSuggestions(localQuery);
     // Cleanup debounce on unmount or query change
     return () => debouncedFetchSuggestions.cancel();
  }, [localQuery, debouncedFetchSuggestions]); // Keep debouncedFetchSuggestions here

  // --- Handlers ---
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setLocalQuery(query);
    setActiveSearchQuery(query); // Update parent state for main content results
    setIsSearchActive(true); // Ensure main content shows results
  };

  // Handle submitting search (e.g., clicking "View all results")
  const handleSearchSubmit = (query: string) => {
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      setLocalQuery(trimmedQuery);
      setActiveSearchQuery(trimmedQuery);
      setIsSearchActive(true);
      // Optionally close panel on submit? Or keep it open? Let's keep it open for now.
      // closePanel();
      // Navigation happens implicitly by MainLayout rendering SearchResultsDisplay
    }
  };

   const handleSuggestionClick = (suggestion: string) => {
     handleSearchSubmit(suggestion);
  };

  const handleProfileClick = () => {
     closePanel(); // Close panel when navigating to profile
  };

  const handleClearInput = () => {
     setLocalQuery('');
     setActiveSearchQuery(''); // Clear parent query
     setSuggestions([]); // Clear suggestions
     debouncedFetchSuggestions.cancel();
     // Optionally set search inactive?
     // setIsSearchActive(false);
  };

  // --- Render ---
  return (
    // Panel styling - fixed position next to sidebar
    <div
      ref={panelRef}
      className="fixed left-[240px] top-0 w-[350px] h-full bg-background border-r border-border z-20 flex flex-col shadow-lg" // Example width, adjust as needed
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground">Search</h2>
        <Button variant="ghost" size="icon" onClick={closePanel} aria-label="Close search">
          <FaTimes className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Panel Search Input */}
      <div className="p-4 flex-shrink-0">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search accounts and videos"
            value={localQuery}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(localQuery)}
            className="bg-secondary border-0 pl-10 pr-10 h-10 rounded-md text-sm focus-visible:ring-1 focus-visible:ring-primary"
            autoFocus
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
            <FaSearch size={16} />
          </div>
          {localQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground h-10 w-10"
              onClick={handleClearInput}
              aria-label="Clear search"
            >
              <FaTimes className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Area */}
      <div className="flex-grow overflow-y-auto px-4 pb-4">
        {isSearchingSuggestions && suggestions.length === 0 && (
          <p className="text-muted-foreground text-center p-4 text-sm">Searching...</p>
        )}
        {!isSearchingSuggestions && suggestions.length === 0 && localQuery.trim().length > 0 && (
           <p className="text-muted-foreground text-center p-4 text-sm">No results found for "{localQuery}"</p>
        )}
        {/* TODO: Add Recent Searches section here */}
        {suggestions.length > 0 && (
          <ul className="space-y-1">
            {/* Text Suggestions */}
            {suggestions.filter(s => s.type === 'text').map((s, i) => (
               <li key={`text-${i}`}>
                 <button onClick={() => handleSuggestionClick(s.data as string)} className="flex items-center gap-3 w-full text-left p-2 rounded hover:bg-secondary transition-colors">
                   <FaSearch className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                   <span className="text-sm text-foreground truncate">{s.data as string}</span>
                 </button>
               </li>
            ))}
            {/* Profile Suggestions */}
            {suggestions.filter(s => s.type === 'profile').length > 0 && (
               <li className="px-2 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase">Accounts</li>
            )}
            {suggestions.filter(s => s.type === 'profile').map((s) => {
               const profile = s.data as ProfileSuggestion;
               return (
                 <li key={profile.id}>
                   <Link href={`/profile/${profile.username}`} onClick={handleProfileClick} className="flex items-center gap-3 p-2 rounded hover:bg-secondary transition-colors">
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={profile.profile_picture_url || undefined} alt={profile.username || 'User'} />
                       <AvatarFallback className="text-xs">{profile.username?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
                     </Avatar>
                     <div>
                       <p className="font-medium text-sm text-foreground">{profile.username}</p>
                       <p className="text-xs text-muted-foreground">{profile.name}</p>
                     </div>
                   </Link>
                 </li>
               );
            })}
          </ul>
        )}
        {/* "View all results" button */}
        {localQuery.trim() && !isSearchingSuggestions && (
           <div className="mt-4 pt-4 border-t border-border">
               <button
                  onClick={() => handleSearchSubmit(localQuery)}
                  className="flex items-center gap-3 w-full text-left p-2 rounded hover:bg-secondary transition-colors text-primary"
               >
                  <FaSearch className="w-4 h-4" />
                  <span className="text-sm font-medium">View all results for "{localQuery}"</span>
               </button>
           </div>
        )}
         {!localQuery.trim() && !isSearchingSuggestions && suggestions.length === 0 && (
             <p className="text-muted-foreground text-center p-4 text-sm">Search for accounts or videos.</p>
         )}
      </div>
    </div>
  );
}
