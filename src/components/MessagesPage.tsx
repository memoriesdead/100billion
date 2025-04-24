"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
// Import RealtimePresenceState type
import { RealtimeChannel, RealtimePostgresChangesPayload, RealtimePresenceState } from '@supabase/supabase-js';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // Removed AvatarImage import as it's commented out
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaSmile, FaPaperPlane } from "react-icons/fa";
import { FiSearch, FiMessageSquare, FiLoader } from "react-icons/fi";
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Database } from '@/lib/database.types'; // Import generated types

// Use generated types if available, otherwise fallback to interfaces
type UserProfile = Database['public']['Tables']['profiles']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    participantDetails?: { [userId: string]: UserProfile }; // Add participantDetails back
    unreadCount?: { [userId: string]: number }; // Add unreadCount back
};

/* Fallback Interfaces if generated types are not configured/working
interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string | null; // Allow null from DB
}

interface Message {
  // Assuming id is UUID based on Supabase default. Change if it's different (e.g., number for bigint).
  id: string;
  conversation_id: string; // UUID
  sender_uid: string; // UUID
  content: string;
  created_at: string; // ISO timestamp string
}

interface Conversation {
  id: string; // UUID
  participant_uids: string[]; // Array of UUIDs
  participantDetails?: { [userId: string]: UserProfile }; // Keyed by UUID
  last_message_content?: string | null; // Allow null
  last_message_sender_uid?: string | null; // Allow null
  last_message_created_at?: string | null; // Allow null
  updated_at: string; // ISO timestamp string
  // Unread count logic might need adjustment based on Supabase schema/triggers
  unreadCount?: { [userId: string]: number };
}
*/ // End of fallback interfaces


// --- Utility Functions ---
const getOtherParticipantId = (conversation: Conversation | null, currentUserId: string): string | undefined => {
  // Ensure participant_uids exists and is an array before finding
  if (!conversation?.participant_uids || !Array.isArray(conversation.participant_uids)) {
      return undefined;
  }
  return conversation.participant_uids.find(pId => pId !== currentUserId);
};

// Updated to handle ISO strings from Supabase
const formatMessageTime = (timestampString: string | undefined | null): string => { // Allow null
  if (!timestampString) return '';
  const date = new Date(timestampString);
  if (isNaN(date.getTime())) return ''; // Invalid date string

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
};

// --- Sub-Components ---

const ConversationItem: React.FC<{
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  currentUserId: string;
}> = ({ conversation, isSelected, onClick, currentUserId }) => {
  const otherUserId = getOtherParticipantId(conversation, currentUserId);
  const otherUser = otherUserId ? conversation.participantDetails?.[otherUserId] : undefined;
  const lastMessageContent = conversation.last_message_content;
  const lastMessageSenderUid = conversation.last_message_sender_uid;
  const lastMessageCreatedAt = conversation.last_message_created_at;
  const unread = conversation.unreadCount?.[currentUserId] ?? 0;

  // Loading state if participant details aren't loaded yet
  if (!otherUser) {
      return (
          <div className="flex items-center p-3 h-[72px] animate-pulse">
              <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-700"></div>
              <div className="ml-3 flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
          </div>
      );
  }

  return (
    <div
      className={cn(
        "flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-md mb-1",
        isSelected && "bg-gray-100 dark:bg-gray-800"
      )}
      onClick={onClick}
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          {/* Removed avatar_url reference - Assuming UserProfile type doesn't have it */}
          {/* <AvatarImage src={otherUser.avatar_url ?? undefined} alt={otherUser.username ?? 'User'} /> */}
          <AvatarFallback>{otherUser.username?.substring(0, 2).toUpperCase() ?? '??'}</AvatarFallback>
        </Avatar>
        {/* Online status logic can be added later */}
      </div>
        <div className="ml-3 flex-1 overflow-hidden">
          <div className="flex justify-between items-center">
            <p className="font-medium truncate">{otherUser.username ?? 'Unknown User'}</p>
            {lastMessageCreatedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatMessageTime(lastMessageCreatedAt)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            {lastMessageContent && (
              <p className={cn(
                  "text-sm truncate text-gray-500 dark:text-gray-400 max-w-[70%]",
                  unread > 0 && "font-semibold text-gray-800 dark:text-gray-200"
              )}>
                {lastMessageSenderUid === currentUserId ? 'You: ' : ''}
                {lastMessageContent}
              </p>
            )}
            {unread > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageItem: React.FC<{
  message: Message;
  isOwnMessage: boolean; // True if the current user sent the message
  showAvatar?: boolean;
  senderProfile?: UserProfile;
}> = ({ message, isOwnMessage, showAvatar = true, senderProfile }) => {
  const avatarContent = senderProfile ? (
      <>
          {/* Removed avatar_url reference */}
          {/* <AvatarImage src={senderProfile.avatar_url ?? undefined} alt={senderProfile.username ?? 'User'} /> */}
          <AvatarFallback>{senderProfile.username?.substring(0, 2).toUpperCase() ?? '??'}</AvatarFallback>
      </>
  ) : (
      <div className="h-full w-full rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse"></div>
  );

  return (
    // Reverse the justify-start/justify-end based on isOwnMessage
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Show avatar on the LEFT for RECEIVED messages */}
      {!isOwnMessage && showAvatar && (
        <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
          {avatarContent}
        </Avatar>
      )}
      <div className={`max-w-[70%]`}>
        <div
          className={cn(
            "px-4 py-2 rounded-2xl text-sm break-words",
            isOwnMessage
              // Sender (Own Message) - Right side, different corner rounded
              ? "bg-blue-500 text-white rounded-bl-none"
              // Receiver (Other's Message) - Left side, different corner rounded
              : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-br-none"
          )}
        >
          {message.content}
        </div>
        {/* Timestamp alignment matches message alignment */}
        <div className={`flex text-xs text-gray-500 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <span>{formatMessageTime(message.created_at)}</span>
          {/* Read status logic can be added later */}
        </div>
      </div>
      {/* Show avatar on the RIGHT for SENT messages */}
      {isOwnMessage && showAvatar && (
        <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
          {avatarContent}
        </Avatar>
      )}
    </div>
  );
};

// --- MessageComposer ---
const MessageComposer: React.FC<{
  onSendMessage: (content: string) => void;
  onTypingChange: (isTyping: boolean, currentMessage: string) => void; // Add prop to report typing changes
  disabled?: boolean;
}> = ({ onSendMessage, onTypingChange, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for typing timeout

  // Effect for handling clicks outside the emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && event.target instanceof Node && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []); // Empty dependency array ensures this runs only once on mount

  // Debounce typing notification
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentMessage = e.target.value;
    setMessage(currentMessage);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If typing, notify immediately
    if (currentMessage.trim()) {
      onTypingChange(true, currentMessage); // Notify started typing
    } else {
      // If input cleared, notify immediately stopped typing
      onTypingChange(false, currentMessage);
    }
  };

  // Separate useEffect for typing timeout cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []); // This useEffect is for the typing timeout cleanup, no external dependencies needed

  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message); // Parent handles sending
      setMessage('');
      setShowEmojiPicker(false);
      // Ensure typing status is set to false on send
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); // Clear any lingering timeout just in case
      onTypingChange(false, ''); // Explicitly notify stopped typing on send
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="p-3 border-t border-gray-200 dark:border-gray-700">
      <div className="relative flex items-center">
        <div className="relative">
          <Button variant="ghost" size="icon" type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-500" disabled={disabled}>
            <FaSmile className="h-5 w-5" />
          </Button>
          {showEmojiPicker && (
            <div className="absolute bottom-12 left-0 z-10" ref={emojiPickerRef}>
              <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.AUTO} width={320} height={400} />
            </div>
          )}
        </div>
        {/* Use the new handleInputChange */}
        <Input ref={inputRef} className="flex-1 mx-2" placeholder={disabled ? "Select a conversation" : "Type a message..."} value={message} onChange={handleInputChange} onKeyDown={handleKeyDown} disabled={disabled} />
        <Button variant="ghost" size="icon" type="button" onClick={handleSendMessage} disabled={!message.trim() || disabled} className={`text-blue-500 ${(!message.trim() || disabled) ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <FaPaperPlane className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function MessagesPage() {
  // --- Hooks ---
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [loadingConversations, setLoadingConversations] = useState(true); // Start true for initial load
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [participantProfiles, setParticipantProfiles] = useState<{ [userId: string]: UserProfile }>({});
  const [targetUserId, setTargetUserId] = useState<string | null>(null); // Store userId from URL for potential new convo
  const [targetUserProfile, setTargetUserProfile] = useState<UserProfile | null>(null); // Store profile of target user
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false); // State for typing indicator
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for local user typing timeout broadcast
  const conversationsRef = useRef(conversations); // Ref to hold latest conversations state

  // Update ref whenever conversations state changes
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // --- Helper: Fetch User Profile (Memoized) ---
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!userId) {
      console.warn("fetchUserProfile called with invalid userId");
      return null;
    }
    if (participantProfiles[userId]) {
      return participantProfiles[userId];
    }
    try {
      // Select only fields known to exist in the UserProfile type based on database.types.ts
      // If avatar_url *does* exist in your profiles table and types, add it back here.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username') // Removed avatar_url from select
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Cast to UserProfile, assuming the selected fields match the type
        const profileData = data as UserProfile;
        setParticipantProfiles(prev => ({ ...prev, [userId]: profileData }));
        return profileData;
      } else {
         // This block executes if data is null (user not found)
         console.warn(`User profile not found for ID: ${userId}`);
         // Create and cache the minimal profile if user not found
         // Ensure this matches the UserProfile type structure
         const minimalProfile = {
             id: userId,
             username: 'Unknown User',
             // Initialize other required fields from UserProfile type with default/null values
             // Example: bio: null, created_at: new Date().toISOString(), etc.
             // This needs to match your actual UserProfile type definition precisely.
             // For now, assuming id and username are the core requirements.
         } as UserProfile; // Cast to UserProfile
         setParticipantProfiles(prev => ({ ...prev, [userId]: minimalProfile }));
         return minimalProfile; // Return the minimal profile
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching user profile for ${userId}:`, error);
      return null;
    }
  }, [participantProfiles]); // Dependency: participantProfiles cache

  // --- Helper: Fetch Profiles for a Conversation ---
  const fetchConversationProfiles = useCallback(async (conversation: Conversation): Promise<Conversation> => {
    const participantIds = conversation.participant_uids || [];
    const profilesToFetch = participantIds.filter(id => !participantProfiles[id]);

    if (profilesToFetch.length > 0) {
      await Promise.all(profilesToFetch.map(fetchUserProfile));
    }

    // Return conversation with potentially updated participantDetails from the state cache
    // This ensures we use the latest profiles after fetching
    const updatedDetails = participantIds.reduce((acc, id) => {
      if (participantProfiles[id]) {
        acc[id] = participantProfiles[id];
      }
      return acc;
    }, {} as { [userId: string]: UserProfile });

    return { ...conversation, participantDetails: updatedDetails };
  }, [fetchUserProfile, participantProfiles]);


  // --- Effects ---

  // Fetch Current User Profile
  useEffect(() => {
    if (user?.id && !participantProfiles[user.id]) {
      fetchUserProfile(user.id);
    }
  }, [user, participantProfiles, fetchUserProfile]); // Added fetchUserProfile

  // Handle URL parameters (targetUserId for new conversation)
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');
    const conversationIdFromUrl = searchParams.get('conversationId'); // Also check for direct convo link

    if (userIdFromUrl && userIdFromUrl !== user?.id) {
        setTargetUserId(userIdFromUrl);
        setSelectedConversationId(null); // Ensure no conversation is selected if targeting user
        setTargetUserProfile(null); // Reset target profile until fetched
        setMessages([]);
        if (window.innerWidth < 768) setMobileView('chat');
    } else if (conversationIdFromUrl) {
        // If conversationId is in URL, we'll select it once conversations load
        setTargetUserId(null);
        setTargetUserProfile(null);
        // Don't setSelectedConversationId here yet, wait for initial load/subscription
    } else {
        setTargetUserId(null);
        setTargetUserProfile(null);
    }
  }, [searchParams, user?.id]); // Rerun when searchParams or user changes

  // Fetch Target User Profile if targetUserId is set
  useEffect(() => {
    if (targetUserId && !participantProfiles[targetUserId]) {
      fetchUserProfile(targetUserId).then(profile => {
        if (profile) {
          setTargetUserProfile(profile);
        } else {
          toast.error(`Could not load profile for user ID: ${targetUserId}`);
          setTargetUserId(null); // Reset if profile fetch fails
        }
      });
    } else if (targetUserId && participantProfiles[targetUserId]) {
      // If profile is already cached
      setTargetUserProfile(participantProfiles[targetUserId]);
    }
  }, [targetUserId, fetchUserProfile, participantProfiles]);


  // Initial Fetch and Realtime Subscription for Conversations
  useEffect(() => {
    if (!user?.id) {
      setConversations([]);
      setLoadingConversations(false);
      return () => { // Cleanup on user logout
          if (conversationChannelRef.current) {
              supabase.removeChannel(conversationChannelRef.current);
              conversationChannelRef.current = null;
          }
      };
    }

    setLoadingConversations(true);

    // 1. Initial Fetch
    const initialFetch = async () => {
      try {
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .contains('participant_uids', [user.id])
          .order('updated_at', { ascending: false });

        if (convError) throw convError;

        if (convData) {
          // Fetch profiles for all participants initially
          const conversationsWithProfiles = await Promise.all(
            convData.map(conv => fetchConversationProfiles(conv as Conversation))
          );
          setConversations(conversationsWithProfiles);

          // Handle pre-selection from URL *after* initial load
          const conversationIdFromUrl = searchParams.get('conversationId');
          const userIdFromUrl = searchParams.get('userId');

          if (conversationIdFromUrl) {
            const foundConv = conversationsWithProfiles.find(c => c.id === conversationIdFromUrl);
            if (foundConv) {
                setSelectedConversationId(foundConv.id);
                setTargetUserId(null); // Clear target user if selecting existing convo
                setTargetUserProfile(null);
                 if (window.innerWidth < 768) setMobileView('chat');
            } else {
                 console.warn(`Conversation ID ${conversationIdFromUrl} from URL not found.`);
            }
          } else if (userIdFromUrl && userIdFromUrl !== user.id) {
             // Check if an existing conversation exists for this target user
             const existingConv = conversationsWithProfiles.find(c => c.participant_uids.includes(userIdFromUrl));
             if (existingConv) {
                 setSelectedConversationId(existingConv.id);
                 setTargetUserId(null); // Clear target user as we found existing convo
                 setTargetUserProfile(null);
                 if (window.innerWidth < 768) setMobileView('chat');
             } else {
                 // Keep targetUserId set, targetUserProfile should be fetched by its own effect
                 setSelectedConversationId(null);
                 if (window.innerWidth < 768) setMobileView('chat');
             }
          }

        } else {
          setConversations([]);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error fetching initial conversations:", error);
        toast.error("Failed to load conversations.");
      } finally {
        setLoadingConversations(false);
      }
    };

    initialFetch();

    // 2. Realtime Subscription
    const handleConversationUpdate = async (payload: RealtimePostgresChangesPayload<any>) => { // Use any temporarily if exact type causes issues
      console.log('Conversation change received:', payload);
      const newConv = payload.new as Conversation;
      const oldConv = payload.old as Conversation; // Might be needed for DELETE

      // Fetch profiles for the affected conversation if it's an INSERT or UPDATE
      let convWithProfiles = newConv;
      if (payload.eventType !== 'DELETE' && newConv) {
          convWithProfiles = await fetchConversationProfiles(newConv);
      }


      setConversations(currentConversations => {
        let updatedConversations = [...currentConversations];
        const existingIndex = updatedConversations.findIndex(c => c.id === (newConv?.id ?? oldConv?.id));

        if (payload.eventType === 'INSERT' && convWithProfiles) {
          if (existingIndex === -1) {
            updatedConversations.push(convWithProfiles);
          } else {
             // Already exists? Update it just in case
             updatedConversations[existingIndex] = convWithProfiles;
          }
        } else if (payload.eventType === 'UPDATE' && convWithProfiles) {
          if (existingIndex !== -1) {
            updatedConversations[existingIndex] = convWithProfiles;
          } else {
            // Received update for a convo not in list? Add it.
            updatedConversations.push(convWithProfiles);
          }
        } else if (payload.eventType === 'DELETE' && oldConv) {
          // Use the ID from the 'old' payload for delete
          updatedConversations = updatedConversations.filter(c => c.id !== oldConv.id);
          // If the deleted conversation was selected, deselect it
          if (selectedConversationId === oldConv.id) {
              setSelectedConversationId(null);
              setMessages([]); // Clear messages
          }
        }

        // Re-sort conversations by updated_at timestamp
        updatedConversations.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return updatedConversations;
      });
    };

    // Ensure existing channel is removed before creating a new one
    if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
    }

    const channel = supabase.channel(`conversations:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'conversations',
          filter: `participant_uids=cs.{"${user.id}"}` // Filter for conversations containing the user's ID
        },
        handleConversationUpdate
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to conversations channel');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Conversation subscription error:', status, err);
          toast.error('Realtime connection issue. Try refreshing.');
          // Optional: Implement retry logic here
        }
      });

    conversationChannelRef.current = channel;

    // Cleanup function
    return () => {
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
        conversationChannelRef.current = null;
        console.log('Unsubscribed from conversations channel');
      }
    };

  }, [user?.id, fetchConversationProfiles, searchParams]); // Dependencies

  // Memoize selected conversation object for stability
  const selectedConversation = useMemo(() => {
      return conversations.find(c => c.id === selectedConversationId) ?? null;
  }, [selectedConversationId, conversations]);

  // Initial Fetch, Realtime Subscription for Messages, and Presence
  useEffect(() => {
    // Clean up previous message/presence subscription if selected conversation changes
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current)
        .then(() => console.log('Unsubscribed from previous messages/presence channel'))
        .catch(err => console.error("Error unsubscribing:", err));
      messageChannelRef.current = null;
    }
    setIsOtherUserTyping(false); // Reset typing indicator on conversation change

    if (!selectedConversationId || !user?.id) {
      setMessages([]);
      setLoadingMessages(false);
      return; // No cleanup needed if no channel was created
    }

    setLoadingMessages(true);

    // 1. Initial Fetch for selected conversation
    const initialFetchMessages = async () => {
      try {
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', selectedConversationId)
          .order('created_at', { ascending: true })
          .limit(100); // Load more initially? Or implement pagination later

        if (msgError) throw msgError;

        if (msgData) {
          // Fetch profiles for senders if not already cached
          const senderUids = new Set(msgData.map(msg => msg.sender_uid));
          await Promise.all(Array.from(senderUids).map(id => fetchUserProfile(id)));
          setMessages(msgData as Message[]);
        } else {
          setMessages([]);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error fetching initial messages:", error);
        toast.error("Failed to load messages.");
      } finally {
        setLoadingMessages(false);
      }
    };

    initialFetchMessages();

    // 2. Realtime Subscription for new messages in this conversation
    const handleNewMessage = async (payload: RealtimePostgresChangesPayload<any>) => { // Use any temporarily
        console.log('Message change received:', payload);
        if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            // Ensure the sender's profile is fetched if not already cached
            await fetchUserProfile(newMessage.sender_uid);
            // Add message only if it doesn't already exist (prevents duplicates from initial fetch + subscription)
            console.log("--- handleNewMessage: Received new message data ---", newMessage); // Log received message
            setMessages(currentMessages => {
                if (!currentMessages.some(msg => msg.id === newMessage.id)) {
                    console.log("--- handleNewMessage: Adding new message to state ---");
                    return [...currentMessages, newMessage];
                }
                console.log("--- handleNewMessage: Message already exists in state ---");
                return currentMessages; // Already exists, no change
            });
        } else {
            console.log("--- handleNewMessage: Received non-INSERT event ---", payload.eventType);
        }
        // Handle UPDATE/DELETE if needed
    };

    // --- Presence Handling ---
    const handlePresenceSync = () => {
        console.log("--- handlePresenceSync: Fired ---");
        // Access latest conversations state via ref inside the handler
        const currentSelectedConv = conversationsRef.current.find(c => c.id === selectedConversationId);
        if (!messageChannelRef.current || !user?.id || !currentSelectedConv) {
            console.log("--- handlePresenceSync: Aborting (no channel, user, or selected convo) ---");
            return;
        }

        const presenceState = messageChannelRef.current.presenceState();
        console.log("--- handlePresenceSync: Current presence state ---", presenceState);
        const otherUserId = getOtherParticipantId(currentSelectedConv, user.id);

        if (!otherUserId) {
            setIsOtherUserTyping(false);
            return;
        }

        const otherUserPresence = presenceState[otherUserId];
        // Check if the other user's presence state exists and has a 'typing: true' field
        // Cast `p` to `any` or a more specific type if known, to access dynamic properties like 'typing'
        const isTyping = otherUserPresence?.some((p: any) => p.typing === true) ?? false;
        console.log(`--- handlePresenceSync: Other user (${otherUserId}) is typing: ${isTyping} ---`);
        setIsOtherUserTyping(isTyping);
    };

    // Channel name includes 'presence' for clarity, though not strictly required
    const channel = supabase.channel(`messages-presence:${selectedConversationId}`, {
        config: {
            presence: {
                key: user.id, // Unique key for this client's presence
            },
        },
    })
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Primarily listen for new messages
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`
        },
        handleNewMessage
      )
      // Add presence listeners
      .on('presence', { event: 'sync' }, () => {
          console.log("--- Presence Event: sync ---");
          handlePresenceSync();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('--- Presence Event: join ---', { key, newPresences });
        // Optional: Trigger sync or directly update typing status if needed
        handlePresenceSync(); // Re-evaluate typing status on join
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('--- Presence Event: leave ---', { key, leftPresences });
        // If the user who left was the other participant, ensure their typing status is false
        // Access latest conversations state via ref inside the handler
        const currentSelectedConv = conversationsRef.current.find(c => c.id === selectedConversationId);
        const otherUserId = currentSelectedConv ? getOtherParticipantId(currentSelectedConv, user.id) : null;

        if (key === otherUserId) {
            setIsOtherUserTyping(false);
        }
        // handlePresenceSync(); // Sync might be sufficient here, avoid redundant calls if sync handles it
      })
      .subscribe(async (status, err) => { // Make async to allow await for track
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to messages/presence channel for conversation ${selectedConversationId}`);
          // Track initial state (not typing) when subscribed
          try {
            const trackStatus = await channel.track({ typing: false });
            console.log('--- Subscription: Initial presence track status ---', trackStatus);
          } catch (trackError) {
            console.error("--- Subscription: Error tracking initial presence ---", trackError);
          }
        } else {
             console.log(`--- Subscription: Status changed to ${status} ---`);
        }
         if (err) {
             console.error('--- Subscription: Error ---', status, err);
             toast.error(`Realtime connection error: ${err.message}`);
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('--- Subscription: Channel Error/Timeout ---', status);
          toast.error('Realtime connection issue. Try refreshing.');
        } else if (status === 'CLOSED') {
            console.log('--- Subscription: Channel closed ---');
        }
      });

    messageChannelRef.current = channel;

    // Cleanup on component unmount or when selectedConversationId changes
    return () => {
        if (messageChannelRef.current) {
            // Untrack presence before removing channel
            messageChannelRef.current.untrack()
                .then(() => supabase.removeChannel(messageChannelRef.current!)) // Use non-null assertion as we check above
                .then(() => console.log('Untracked and unsubscribed from messages/presence channel'))
                .catch(err => console.error("Error unsubscribing/untracking:", err));
            messageChannelRef.current = null;
        }
    };
    // Only depend on stable values like IDs. Access dynamic state via refs or functional updates.
  }, [selectedConversationId, user?.id, fetchUserProfile]); // Added selectedConversationId and fetchUserProfile

  // Scroll to bottom when messages change
  useEffect(() => {
    // Add a small delay to allow the DOM to update after new message arrives
    const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Handle window resize for mobile view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileView('list'); // Always show list on desktop
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Derived State & Event Handlers ---

  const filteredConversations = useMemo(() => {
      return conversations.filter(conversation => {
          if (!user?.id) return false;
          const otherUserId = getOtherParticipantId(conversation, user.id);
          if (!otherUserId) return false;
          // Use cached profiles directly
          const otherUser = participantProfiles[otherUserId];
          // If profile not loaded yet, maybe show loading or filter out? For now, filter out.
          if (!otherUser) return false;
          return otherUser.username?.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [conversations, user?.id, participantProfiles, searchTerm]);


  // --- Create Conversation and Send First Message ---
  const createConversationAndSendMessage = async (recipientId: string, content: string) => {
    if (!user?.id || !recipientId || user.id === recipientId) {
      toast.error("Invalid users for conversation.");
      return;
    }
    if (isCreatingConversation) return;

    setIsCreatingConversation(true);
    const trimmedContent = content.trim();
    if (!trimmedContent) {
        setIsCreatingConversation(false);
        return;
    }

    try {
        // Ensure recipient profile exists (sender profile fetched on load)
        const recipientProfile = await fetchUserProfile(recipientId);
        if (!recipientProfile || recipientProfile.username === 'Unknown User') {
            throw new Error("Recipient profile not found or incomplete.");
        }

        // Check if conversation already exists between these two users
        const { data: existingConv, error: checkError } = await supabase
            .from('conversations')
            .select('id')
            .contains('participant_uids', [user.id, recipientId])
            .limit(1)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingConv) {
            // Conversation already exists, just select it and send the message
            console.log("Existing conversation found:", existingConv.id);
            setSelectedConversationId(existingConv.id); // Select the existing conversation
            setTargetUserId(null); // Clear target user state
            setTargetUserProfile(null);
            if (window.innerWidth < 768) setMobileView('chat');
            // Now send the message to the existing conversation
            await handleSendMessage(trimmedContent, existingConv.id); // Pass content and existing ID
            toast.success("Existing conversation selected."); // Use toast.success

        } else {
            // Create new conversation
            console.log("Creating new conversation...");
            const { data: newConversationData, error: createConvError } = await supabase
                .from('conversations')
                .insert({
                    participant_uids: [user.id, recipientId],
                    last_message_content: trimmedContent, // Initialize metadata
                    last_message_sender_uid: user.id,
                    last_message_created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (createConvError || !newConversationData) {
                throw createConvError || new Error("Failed to create conversation.");
            }

            const newConversationId = newConversationData.id;
            console.log("New conversation created:", newConversationId);

            // Insert the first message
            const { error: insertMsgError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: newConversationId,
                    sender_uid: user.id,
                    content: trimmedContent,
                });

            if (insertMsgError) {
                // Attempt to clean up the created conversation if message fails? Or just log error.
                console.error("Error inserting first message, conversation created but message failed:", insertMsgError);
                throw insertMsgError;
            }

            // Realtime subscription should pick up the new conversation and message.
            // We can optimistically select the new conversation ID here.
            setSelectedConversationId(newConversationId);
            setTargetUserId(null); // Clear target user state
            setTargetUserProfile(null);
            if (window.innerWidth < 768) setMobileView('chat');

            toast.success("Conversation started!");
        }

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error in createConversationAndSendMessage:", error);
        toast.error(`Failed to start conversation: ${message || 'Unknown error'}`);
    } finally {
        setIsCreatingConversation(false);
    }
};


  // --- Send Message (Handles Existing and New Conversations) ---
  // Updated to optionally accept conversationId for the create->send flow
  const handleSendMessage = async (content: string, convId?: string) => {
    const trimmedContent = content.trim();
    const conversationIdToSend = convId ?? selectedConversationId; // Use provided ID or selected one

    if (!trimmedContent || !user?.id || !conversationIdToSend) {
        console.error("Cannot send message: Missing content, user ID, or conversation ID.", { trimmedContent, userId: user?.id, conversationIdToSend });
        toast.error("Cannot send message. Please select a conversation.");
        return;
    }

    const newMessageData = {
      conversation_id: conversationIdToSend,
      sender_uid: user.id,
      content: trimmedContent,
    };

    try {
      // 1. Insert the new message
      const { error: insertError } = await supabase
        .from('messages')
        .insert(newMessageData); // No need to select here

      if (insertError) throw insertError;

      // 2. Update the conversation's metadata (fire and forget is okay here)
      //    Realtime listener on conversations table will update the UI list order.
      supabase
        .from('conversations')
        .update({
          last_message_content: trimmedContent,
          last_message_sender_uid: user.id,
          last_message_created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationIdToSend)
        .then(({ error: updateConvError }) => {
          if (updateConvError) {
            // Log warning, but don't block user
            console.warn("Message sent, but failed to update conversation metadata:", updateConvError);
          }
        });

        // No optimistic UI update needed here - Realtime subscription will handle it.

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message.");
      // No UI revert needed as we removed optimistic update
    } finally {
        // Ensure typing status is set to false after sending
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        handleTypingBroadcast(false); // Broadcast stopped typing
    }
  };

  // --- Handle Typing Broadcast ---
  const handleTypingBroadcast = (isTyping: boolean) => {
    if (!messageChannelRef.current || !user?.id) return;

    // Clear existing timeout if we're about to broadcast 'false'
    // This timeout is now only set below if isTyping is true
    if (!isTyping && typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
    }

    // Broadcast the current typing status
    messageChannelRef.current.track({ typing: isTyping })
        .then(status => {
            if (status !== 'ok') console.warn('Presence track failed:', status);
        })
        .catch(err => console.error('Error tracking presence:', err));

    // If starting to type, set a timeout to automatically broadcast 'false'
    // ONLY if we are broadcasting 'true'. Remove timeout if broadcasting 'false'.
    if (isTyping) {
        // Clear any previous timeout before setting a new one
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            // This timeout is now removed in MessageComposer,
            // but we keep the ref clearing logic here for safety.
            // The broadcast(false) is handled by MessageComposer now.
            typingTimeoutRef.current = null;
        }, 3000); // Keep timeout short, just in case of abrupt stops
    }
  };


  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setTargetUserId(null); // Clear target user if selecting existing convo
    setTargetUserProfile(null);
    setMessages([]); // Clear old messages immediately, new ones will load via effect/subscription
    if (window.innerWidth < 768) {
      setMobileView('chat');
    }
    // TODO: Implement marking conversation as read (e.g., call a Supabase function or update a 'read' status)
  };

  const handleBackToList = () => {
    setMobileView('list');
    setSelectedConversationId(null); // Deselect conversation
    setTargetUserId(null); // Also clear target user
    setTargetUserProfile(null);
  };

  // --- Render Logic ---

  if (authLoading) {
    return <div className="flex items-center justify-center h-full"><FiLoader className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center h-full text-center text-gray-500">Please log in to view your messages.</div>;
  }

  // Determine the 'other user' for the header based on selectedConversation or targetUserProfile
  const otherUserForHeader = useMemo(() => {
      if (selectedConversation) {
          const otherUserId = getOtherParticipantId(selectedConversation, user.id);
          return otherUserId ? participantProfiles[otherUserId] : null;
      } else if (targetUserProfile) {
          return targetUserProfile;
      }
      return null;
  }, [selectedConversation, targetUserProfile, user?.id, participantProfiles]);


  return (
    <div className="flex flex-1 h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Conversations List */}
      <div className={cn("w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full", mobileView === 'chat' && "hidden md:flex")}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h1 className="text-xl font-bold mb-4 flex items-center"><FiMessageSquare className="mr-2" /> Messages</h1>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <Input placeholder="Search conversations..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3">
            {loadingConversations ? (
              <div className="flex justify-center items-center py-4"><FiLoader className="animate-spin h-6 w-6 text-blue-500" /></div>
            ) : filteredConversations.length === 0 && !targetUserId ? ( // Show only if not trying to start new convo
              <p className="text-center text-gray-500 my-4">No conversations found</p>
            ) : (
              filteredConversations.map((conversation: Conversation) => ( // Added explicit type
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversationId === conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  currentUserId={user.id}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn("flex-1 flex flex-col h-full", mobileView === 'list' && "hidden md:flex")}>
        {selectedConversationId || targetUserProfile ? ( // Show chat if a conversation is selected OR we are targeting a user
          <>
            {/* Chat Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center flex-shrink-0">
              <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={handleBackToList}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 111.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
              </Button>
              {otherUserForHeader ? (
                  <>
                      <Avatar className="h-10 w-10">
                          {/* Removed avatar_url reference */}
                          {/* <AvatarImage src={otherUserForHeader.avatar_url ?? undefined} alt={otherUserForHeader.username ?? 'User'} /> */}
                          <AvatarFallback>{otherUserForHeader.username?.substring(0, 2).toUpperCase() ?? '??'}</AvatarFallback>
                      </Avatar>
                      <div className="ml-3"><p className="font-medium">{otherUserForHeader.username ?? 'Unknown User'}</p>{/* Online status can be added */}</div>
                      <div className="ml-auto"><Button variant="ghost" size="icon"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></Button></div>
                  </>
              ) : ( // Loading state for header
                  <div className="flex items-center animate-pulse w-full"><div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700"></div><div className="ml-3 space-y-1"><div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div><div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16"></div></div></div>
              )}
            </div>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loadingMessages && messages.length === 0 ? ( // Show loader only on initial message load
                <div className="flex justify-center items-center h-full"><FiLoader className="animate-spin h-6 w-6 text-blue-500" /></div>
              ) : messages.length === 0 ? (
                 // Show slightly different message if starting a new conversation vs empty existing one
                 selectedConversationId ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500"><FiMessageSquare className="h-12 w-12 mb-2" /><p>No messages yet</p><p className="text-sm">Send a message to start the conversation</p></div>
                 ) : ( // Must be targetUserProfile case
                    <div className="flex flex-col items-center justify-center h-full text-gray-500"><FiMessageSquare className="h-12 w-12 mb-2" /><p>Start the conversation</p><p className="text-sm">Send your first message to @{targetUserProfile?.username ?? 'this user'}.</p></div>
                 )
              ) : (
                messages.map((message, index) => {
                  const isOwnMessage = message.sender_uid === user.id;
                  // Determine if avatar should be shown:
                  // - For own messages: Always show (or apply sequence logic if needed later)
                  // - For received messages: Show if first message or sender changed
                  const showAvatar = isOwnMessage || (index === 0 || messages[index - 1]?.sender_uid !== message.sender_uid);
                  // Get sender profile from cache
                  const senderProfile = participantProfiles[message.sender_uid];
                  return <MessageItem key={message.id} message={message} isOwnMessage={isOwnMessage} showAvatar={showAvatar} senderProfile={senderProfile} />;
                })
              )}
            <div ref={messagesEndRef} />
             {/* Typing Indicator */}
             {isOtherUserTyping && otherUserForHeader && (
                <div className="px-4 pb-2 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                    {otherUserForHeader.username ?? 'User'} is typing...
                </div>
             )}
          </ScrollArea>
          {/* Message Composer */}
          <div className="flex-shrink-0">
            <MessageComposer
              onSendMessage={(content) => {
                    if (selectedConversationId) {
                        handleSendMessage(content);
                    } else if (targetUserId) {
                        createConversationAndSendMessage(targetUserId, content);
                  }
              }}
              // Pass the typing handler
              onTypingChange={(isTyping, currentMessage) => {
                  // Only broadcast if there's an active channel
                  if (messageChannelRef.current) {
                      handleTypingBroadcast(isTyping);
                  }
              }}
              disabled={loadingMessages || isCreatingConversation || (!selectedConversationId && !targetUserProfile)}
            />
          </div>
          </>
        ) : (
          // Default view when no conversation or target user is selected
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center"><FiMessageSquare className="h-16 w-16 mb-4" /><p className="text-xl font-semibold mb-2">Your Messages</p><p className="max-w-md mb-4">Select a conversation from the list or find a user profile to start messaging.</p></div>
        )}
      </div>
    </div>
  );
}
