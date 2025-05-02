"use client";

import { ForYouPage } from "@/components/ForYouPage";
import { MainLayout } from "@/components/MainLayout";

export default function Home() {
  // The MainLayout provides the sidebar and header.
  // ForYouPage handles the main content area (the video feed).
  return (
    <MainLayout>
      <ForYouPage />
    </MainLayout>
  );
}
