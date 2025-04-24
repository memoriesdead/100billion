import React from 'react';
import type { Tables } from '@/lib/database.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Profile = Pick<Tables<'profiles'>, 'id' | 'username' | 'name' | 'profile_picture_url'>;

interface UserListDisplayProps {
  users: Profile[] | null;
  isLoading: boolean;
  error: string | null;
  listType: 'Followers' | 'Following'; // To customize messages
  emptyMessage?: string;
}

export const UserListDisplay: React.FC<UserListDisplayProps> = ({
  users,
  isLoading,
  error,
  listType,
  emptyMessage = `No ${listType.toLowerCase()} found.`,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading {listType.toLowerCase()}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTitle>Error Loading {listType}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6">
      {users.map((user) => (
        <Link
          href={`/profile/${user.username ?? user.id}`} // Link to profile page
          key={user.id}
          className="flex items-center space-x-4 p-3 rounded-lg hover:bg-accent transition-colors duration-150 ease-in-out"
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.profile_picture_url ?? undefined} alt={user.username ?? 'User'} />
            <AvatarFallback>
              {user.name?.charAt(0)?.toUpperCase() ?? user.username?.charAt(0)?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name ?? 'User Name'}</p>
            <p className="text-sm text-muted-foreground truncate">@{user.username ?? 'username'}</p>
          </div>
          {/* Optional: Add Follow/Unfollow button here if needed */}
        </Link>
      ))}
    </div>
  );
};
