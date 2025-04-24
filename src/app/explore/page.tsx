import { MainLayout } from "@/components/MainLayout"; // Corrected import
import ExplorePage from "@/components/ExplorePage";

export default function ExploreRoute() { // Corrected function name
  return (
    <MainLayout>
      <ExplorePage />
    </MainLayout>
  );
}
