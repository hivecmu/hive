"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/useSocket";
import { useMessages } from "@/lib/hooks/useMessages";

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } else if (diffInHours < 48) {
    return 'Yesterday ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface MessagePaneProps {
  channelId: string | null;
}

export function MessagePane({ channelId }: MessagePaneProps) {
  const { data: messages = [], isLoading, error } = useMessages(channelId);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { isConnected, onMessage, onUserTyping, onUserStoppedTyping, joinChannel, leaveChannel } = useSocket();

  // Join channel on mount
  useEffect(() => {
    if (isConnected && channelId) {
      joinChannel(channelId);
      return () => {
        leaveChannel(channelId);
      };
    }
  }, [isConnected, channelId, joinChannel, leaveChannel]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && messages?.length) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Listen for typing indicators
  useEffect(() => {
    const cleanupTyping = onUserTyping((data) => {
      if (data.channelId === channelId) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
      }
    });

    const cleanupStoppedTyping = onUserStoppedTyping((data) => {
      if (data.channelId === channelId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    });

    return () => {
      cleanupTyping();
      cleanupStoppedTyping();
    };
  }, [onUserTyping, onUserStoppedTyping, channelId]);

  if (!channelId) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Select a channel to start messaging</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Error loading messages</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-background" ref={scrollAreaRef}>
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex gap-3 hover:bg-accent p-2 -m-2 rounded transition-colors group"
          >
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 mt-0.5 flex-shrink-0">
              <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                {getInitials(message.user?.name || 'Unknown')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <span className="text-foreground font-medium">{message.user?.name || 'Unknown'}</span>
                <span className="text-sm text-muted-foreground">{formatTimestamp(message.createdAt)}</span>
              </div>

              <div className="text-foreground break-words">
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex gap-3 p-2 -m-2 opacity-70">
            <div className="h-8 w-8 sm:h-9 sm:w-9 mt-0.5 flex-shrink-0" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
              <span className="flex gap-1">
                <span className="animate-bounce delay-0">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </span>
              <span>
                {typingUsers.size === 1 ? 'Someone is typing' : `${typingUsers.size} people are typing`}
              </span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}