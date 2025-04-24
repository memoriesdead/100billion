import React from 'react';
import { MoreHorizontal, Image as ImageIcon, AlignLeft, Type, Edit, ChevronRight } from 'lucide-react';

export default function OnlyFansPost() {
  return (
    <div className="flex flex-col w-full max-w-xl bg-white rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="text-lg font-bold">HOME</div>
        <div className="mt-4 text-gray-500">Compose new post...</div>
        
        <div className="flex mt-4 space-x-6">
          <ImageIcon size={20} className="text-gray-400" />
          <AlignLeft size={20} className="text-gray-400" />
          <Edit size={20} className="text-gray-400" />
          <Type size={20} className="text-gray-400" />
        </div>
      </div>
      
      {/* Filter tabs */}
      <div className="flex p-2 space-x-2">
        <div className="px-4 py-1 bg-blue-100 text-blue-500 rounded-full text-sm">All</div>
        <div className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full flex items-center text-sm">
          <Edit size={14} className="mr-1" />
        </div>
      </div>
      
      {/* Post */}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15Z" fill="white"/>
                <path d="M20 20C20 20 20 16 12 16C4 16 4 20 4 20H20Z" fill="white"/>
              </svg>
            </div>
            <div className="ml-3">
              <div className="font-semibold flex items-center">
                OnlyFans 
                <svg className="ml-1" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#1DA1F2"/>
                  <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-gray-500 text-sm">@onlyfans</div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="text-gray-400 text-sm mr-2">Yesterday</div>
            <MoreHorizontal size={16} className="text-gray-400" />
          </div>
        </div>
        
        {/* Post content */}
        <div className="mt-3">
          <p className="text-gray-800">
            The holidays are here, and <span className="text-blue-400">@stretchwithvtv</span> is making a super fun Easter dirt cake to celebrate! This treat is so good, you'll be digging in for seconds (and maybe thirds)! 🍰🥕
          </p>
          <div className="text-blue-400 mt-1 text-sm">
            onlyfans.com/stretchwithvtv / onlyfans.com/oftv
          </div>
        </div>
        
        {/* Post image */}
        <div className="mt-3 relative rounded-lg overflow-hidden">
          <div className="aspect-w-16 aspect-h-9 bg-gray-200 relative">
            <div className="w-full h-full bg-gray-200 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-pink-50 flex items-center justify-center">
                <img 
                  src="/api/placeholder/600/400" 
                  alt="Easter dirt cake with decorations" 
                  className="object-cover"
                />
                <div className="absolute bottom-0 right-0 p-4">
                  <div className="text-white font-bold text-3xl tracking-wider">
                    EASTER
                  </div>
                  <div className="text-white font-bold text-3xl tracking-wider">
                    DIRT CAKE
                  </div>
                  <div className="mt-2 bg-pink-500 rounded-full px-4 py-1 text-white font-bold flex items-center">
                    WITH V
                    <span className="ml-2">🥕</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}