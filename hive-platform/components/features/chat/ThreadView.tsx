"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Send, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { RichContent } from "./RichContent";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ThreadViewProps {
  parentMessage: {
    id: string;
    content: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
    createdAt: string;
    channelId: string;
  };
  onClose: () => void;
}

interface ThreadMessage {
  id: string;
  content: string;
  userId: string;
  threadId: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export function ThreadView({ parentMessage, onClose }: ThreadViewProps) {
  const [replyContent, setReplyContent] = useState("");
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch thread replies
  const { data: threadMessages = [], isLoading } = useQuery({
    queryKey: ['thread', parentMessage.id],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/messages/${parentMessage.id}/thread`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hive_auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load thread');
      }

      const result = await response.json();
      return result.value as ThreadMessage[];
    },
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      const result = await api.messages.send(parentMessage.channelId, {
        content,
        threadId: parentMessage.id,
      });

      if (!result.ok) {
        throw new Error(result.issues[0]?.message || 'Failed to send reply');
      }

      return result.value;
    },
    onSuccess: () => {
      setReplyContent("");
      queryClient.invalidateQueries({ queryKey: ['thread', parentMessage.id] });
      queryClient.invalidateQueries({ queryKey: ['messages', parentMessage.channelId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current && threadMessages.length) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [threadMessages]);

  const handleSendReply = () => {
    if (!replyContent.trim()) return;
    sendReplyMutation.mutate(replyContent.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Count total replies
  const replyCount = threadMessages.length;

  return (
    <div className="fixed inset-0 z-50 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-[400px] bg-background border-l border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h2 className="font-semibold">Thread</h2>
          {replyCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Original Message */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(parentMessage.user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-medium text-sm">
                {parentMessage.user?.name || 'Unknown'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(parentMessage.createdAt)}
              </span>
            </div>
            <div className="text-sm break-words">
              <RichContent content={parentMessage.content} />
            </div>
          </div>
        </div>
      </div>

      {/* Thread Messages */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Loading replies...
            </div>
          ) : threadMessages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No replies yet. Be the first to reply!
            </div>
          ) : (
            threadMessages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">
                    {getInitials(message.user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {message.user?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.createdAt)}
                    </span>
                  </div>
                  <div className="text-sm break-words">
                    <RichContent content={message.content} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Reply Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Reply to thread..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendReplyMutation.isPending}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleSendReply}
            disabled={!replyContent.trim() || sendReplyMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
