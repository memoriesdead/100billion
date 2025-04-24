"use client"; // Keep client directive if needed by VideoGrid or its children

import { VideoGrid } from "./VideoGrid"; // Import VideoGrid

// ExplorePage now simply renders the VideoGrid, similar to the main page
export default function ExplorePage() {
  return <VideoGrid />;
}
