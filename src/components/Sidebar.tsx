"use client";

import Link from "next/link";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { FollowingList } from "./FollowingList"; // Import the new component
// Removed Input and other search-related imports
import { FaHome, FaCompass, FaUser, FaVideo, FaTv, FaEnvelope, FaSearch } from "react-icons/fa";
import { IoMdPeople } from "react-icons/io";

// --- Sidebar Props ---
interface SidebarProps {
  // Callback to toggle the search panel visibility
  toggleSearchPanel: () => void;
  // Callback to deactivate search mode when navigating
  deactivateSearch: () => void;
}

export function Sidebar({ toggleSearchPanel, deactivateSearch }: SidebarProps) {
  const { user } = useAuth(); // Get logged-in user state

  // Determine the correct profile link
  // Link to /profile/[username] if available, otherwise link to the generic /profile page
  const profileHref = (user && user.user_metadata?.username)
    ? `/profile/${user.user_metadata.username}`
    : '/profile'; // Default to /profile if not logged in or no username

  return (
    <div className="flex flex-col h-screen w-[240px] border-r border-border pb-4">
      {/* Logo */}
      <div className="p-4 flex-shrink-0">
        <Link href="/" className="flex items-center" onClick={deactivateSearch}> {/* Deactivate search on logo click */}

          <span className="text-xl font-bold">SubScroll</span>
        </Link>
      </div>

      {/* Removed Search Input Area */}

      {/* Navigation Links Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 py-2">
          {/* Search Toggle Button */}
          <button
            onClick={toggleSearchPanel}
            className={`flex items-center gap-3 px-4 py-4 rounded-md transition-colors w-full text-foreground/80 hover:text-foreground hover:bg-secondary/50`}
          >
            <FaSearch size={20} />
            <span className="text-base">Search</span>
          </button>
          {/* Standard Nav Items */}
          <NavItem href="/" icon={<FaHome size={20} />} label="For You" onClick={deactivateSearch} />
          <NavItem href="/explore" icon={<FaCompass size={20} />} label="Explore" onClick={deactivateSearch} />
          <NavItem href="/following" icon={<IoMdPeople size={20} />} label="Following" onClick={deactivateSearch} />
          <NavItem href="/messages" icon={<FaEnvelope size={20} />} label="Messages" onClick={deactivateSearch} /> {/* Also deactivate search */}
          <NavItem href="/upload" icon={<FaVideo size={20} />} label="Upload" onClick={deactivateSearch} /> {/* Also deactivate search */}
          {/* Use dynamic profileHref */}
          <NavItem href={profileHref} icon={<FaUser size={20} />} label="Profile" onClick={deactivateSearch} />
        </div>

        <Separator className="my-4" />

        {/* Following Users List */}
        <NavGroup title="Following">
          <FollowingList />
        </NavGroup>

        {/* Removed login prompt and footer links */}
      </ScrollArea>
    </div>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void; // Added optional onClick prop
}

function NavItem({ href, icon, label, active, onClick }: NavItemProps) { // Added onClick to destructuring
  // Make link full width, increase vertical padding, adjust horizontal padding
  return (
    <Link href={href} onClick={onClick} className={`flex items-center gap-3 px-4 py-4 rounded-md transition-colors w-full ${active ? 'font-semibold bg-secondary' : 'text-foreground/80 hover:text-foreground hover:bg-secondary/50'}`}>
      {icon}
      <span className="text-base">{label}</span>
    </Link>
  );
}

interface NavGroupProps {
  title: string;
  children: React.ReactNode;
}

function NavGroup({ title, children }: NavGroupProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

function NavLink({ href, children }: NavLinkProps) {
  return (
    <Link href={href} className="block text-xs text-muted-foreground hover:underline">
      {children}
    </Link>
  );
}
