"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smile, Paperclip, Send } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useSendMessage } from "@/lib/hooks/useMessages";
import { toast } from "sonner";

interface MessageInputProps {
  channelId: string | null;
  channelName?: string;
}

export function MessageInput({ channelId, channelName = 'general' }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isConnected, emitTypingStart, emitTypingStop } = useSocket();
  const sendMessageMutation = useSendMessage(channelId);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Typing indicator logic
    if (value.trim() && isConnected && channelId) {
      if (!isTyping) {
        setIsTyping(true);
        emitTypingStart(channelId);
      }

      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (channelId) emitTypingStop(channelId);
      }, 2000);
    } else if (isTyping) {
      setIsTyping(false);
      if (channelId) emitTypingStop(channelId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      return;
    }

    if (!channelId) {
      toast.error("No channel selected");
      return;
    }

    try {
      // Send message via API
      await sendMessageMutation.mutateAsync(message.trim());

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        emitTypingStop(channelId);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }

      // Clear input
      setMessage("");
    } catch (error) {
      // Error is already handled by the mutation
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-card border-t border-border p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3 bg-input-background border border-border rounded-lg p-2 sm:p-3">
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message #${channelName}`}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-foreground placeholder:text-muted-foreground"
            disabled={!channelId}
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
            disabled={!channelId}
          >
            <Smile className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
            disabled={!channelId}
          >
            <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50"
            onClick={handleSendMessage}
            disabled={!channelId || !message.trim() || sendMessageMutation.isPending}
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Status indicators */}
      {!channelId && (
        <div className="mt-2 text-xs text-muted-foreground italic">
          Select a channel to start messaging
        </div>
      )}
      {channelId && !isConnected && (
        <div className="mt-2 text-xs text-muted-foreground italic">
          Connecting to messaging server...
        </div>
      )}
    </div>
  );
}