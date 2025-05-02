"use client"; // Keep client directive if needed by VideoGrid or its children

import { VideoGrid } from "./VideoGrid"; // Import VideoGrid

// ExplorePage now renders the VideoGrid, disables click-to-play, and hides the progress bar
export default function ExplorePage() {
  return <VideoGrid disableClickToPlay={true} hideProgressBar={true} />;
}
