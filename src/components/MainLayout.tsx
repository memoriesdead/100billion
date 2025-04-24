"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SearchPanel } from "./SearchPanel";
// import { SearchResultsDisplay } from "./SearchResultsDisplay"; // Remove this import
import { VideoGrid } from "./VideoGrid"; // Import VideoGrid

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isSearchPanelVisible, setIsSearchPanelVisible] = useState(false); // State for the panel

  // Toggle search panel visibility
  const toggleSearchPanel = () => {
    setIsSearchPanelVisible(prev => !prev);
    // Optionally deactivate search results when closing panel
    if (isSearchPanelVisible) {
       // setIsSearchActive(false); // Decide if closing panel should clear results
    }
  };

  // Deactivate search mode (e.g., when clicking nav links)
  const deactivateSearch = () => {
    setIsSearchActive(false);
    setIsSearchPanelVisible(false); // Also close panel
    setActiveSearchQuery(''); // Clear query
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Fixed sidebar - Pass correct handlers */}
      <div className="fixed left-0 top-0 w-[240px] h-full z-30">
        <Sidebar
          toggleSearchPanel={toggleSearchPanel}
          deactivateSearch={deactivateSearch}
        />
      </div>

      {/* Search Panel (conditionally rendered) */}
      {isSearchPanelVisible && (
         <SearchPanel
            isVisible={isSearchPanelVisible} // Pass visibility state
            setActiveSearchQuery={setActiveSearchQuery} // Pass setter for main content query
            setIsSearchActive={setIsSearchActive} // Pass setter for search mode
            closePanel={() => setIsSearchPanelVisible(false)} // Pass close handler
         />
      )}

      {/* Main content area - Adjust margin based on search panel visibility */}
      <div className={`w-full transition-all duration-200 ease-in-out ${isSearchPanelVisible ? 'ml-[540px]' : 'ml-[240px]'}`}> {/* Adjust margin: 240 + 300 = 540 */}
        {/* Fixed header */}
        <div className={`fixed top-0 right-0 transition-all duration-200 ease-in-out z-10 ${isSearchPanelVisible ? 'left-[540px]' : 'left-[240px]'}`}>
          <Header />
        </div>

        {/* Conditional Content: Render Search Results or Page Content */}
        <div className="w-full pt-14 h-[calc(100vh-theme(space.14))] overflow-y-auto">
          {isSearchActive && activeSearchQuery.trim() ? (
            // Render VideoGrid with the search query when search is active
            <VideoGrid searchQuery={activeSearchQuery} />
          ) : (
            // Render the normal page content (children)
            children
          )}
        </div>
      </div>
    </div>
  );
}
