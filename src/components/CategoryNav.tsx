"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

const categories = [
  "All",
  "Singing & Dancing",
  "Comedy",
  "Sports",
  "Anime & Comics",
  "Relationship",
  "Shows",
  "Lipsync",
  "Daily",
  "Gaming",
  "Food",
  "Beauty",
  "Animals",
  "Science & Education",
  "Travel"
];

export function CategoryNav() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="w-full relative">
      <ScrollArea className="w-full">
        <div className="flex items-center space-x-2 pb-3 px-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-4 py-2 rounded-full whitespace-nowrap text-sm transition-colors",
                activeCategory === category
                  ? "bg-secondary font-medium text-foreground"
                  : "bg-transparent hover:bg-secondary/50 text-muted-foreground"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
