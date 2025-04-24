"use client";

import Image from "next/image";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaChevronLeft, FaChevronRight, FaHeart } from "react-icons/fa";

// Trending videos data with their thumbnails
const trendingVideos = [
  {
    id: "1",
    thumbnailSrc: "https://ext.same-assets.com/2207927190/1475092834.gif",
    likes: "4974"
  },
  {
    id: "2",
    thumbnailSrc: "https://ext.same-assets.com/2207927190/3917746331.jpeg",
    likes: "58.9K"
  },
  {
    id: "3",
    thumbnailSrc: "https://ext.same-assets.com/2207927190/2353998803.jpeg",
    likes: "921"
  },
  {
    id: "4",
    thumbnailSrc: "https://ext.same-assets.com/2207927190/1305127548.jpeg",
    likes: "118"
  },
  {
    id: "5",
    thumbnailSrc: "https://ext.same-assets.com/2207927190/288875986.jpeg",
    likes: "62"
  },
  {
    id: "6",
    thumbnailSrc: "https://ext.same-assets.com/2207927190/466999124.jpeg",
    likes: "27"
  },
  {
    id: "7",
    thumbnailSrc: "https://ext.same-assets.com/2207927190/1149058947.jpeg",
    likes: "58"
  }
];

export function TrendingSection() {
  return (
    <div className="relative">
      <h2 className="text-xl font-bold mb-4">Trending today</h2>

      <div className="relative group">
        <ScrollArea className="w-full">
          <div className="flex space-x-4 pb-4">
            {trendingVideos.map((video) => (
              <Link
                key={video.id}
                href={`/video/${video.id}`}
                className="relative min-w-[230px] w-[230px] aspect-[9/16] rounded-lg overflow-hidden group/item"
              >
                <Image
                  src={video.thumbnailSrc}
                  alt="Trending video"
                  fill
                  className="object-cover group-hover/item:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity flex items-end p-3">
                  <div className="flex items-center gap-1.5 text-white">
                    <FaHeart />
                    <span className="text-sm font-medium">{video.likes}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>

        {/* Navigation buttons */}
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 rounded-full flex items-center justify-center text-foreground/70 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none -ml-4 backdrop-blur-sm"
          aria-label="Previous"
        >
          <FaChevronLeft size={16} />
        </button>
        <button
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 rounded-full flex items-center justify-center text-foreground/70 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none -mr-4 backdrop-blur-sm"
          aria-label="Next"
        >
          <FaChevronRight size={16} />
        </button>
      </div>

      <div className="absolute right-2 bottom-6 bg-primary/90 text-white text-xs px-2 py-1 rounded">
        Zizy challenge girl
      </div>
    </div>
  );
}
