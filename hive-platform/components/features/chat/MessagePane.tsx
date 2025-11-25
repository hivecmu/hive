"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, MoreHorizontal, Pencil, Trash2, X, Check } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useMessages, useEditMessage, useDeleteMessage } from "@/lib/hooks/useMessages";
import { ThreadView } from "./ThreadView";
import { RichContent } from "./RichContent";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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

// Get current user ID from token
function getCurrentUserId(): string | null {
  try {
    const token = localStorage.getItem('hive_auth_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId;
  } catch {
    return null;
  }
}

interface MessagePaneProps {
  channelId: string | null;
}

interface ThreadCount {
  [messageId: string]: number;
}

export function MessagePane({ channelId }: MessagePaneProps) {
  const { data: messages = [], isLoading, error } = useMessages(channelId);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { isConnected, onMessage, onUserTyping, onUserStoppedTyping, joinChannel, leaveChannel } = useSocket();
  const editMessageMutation = useEditMessage();
  const deleteMessageMutation = useDeleteMessage();

  const currentUserId = getCurrentUserId();

  // Fetch thread counts for all messages
  const { data: threadCounts = {} } = useQuery<ThreadCount>({
    queryKey: ['threadCounts', channelId],
    queryFn: async () => {
      if (!channelId) return {};

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/channels/${channelId}/thread-counts`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hive_auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        return {};
      }

      const result = await response.json();
      return result.value || {};
    },
    enabled: !!channelId,
  });

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

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editContent.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      await editMessageMutation.mutateAsync({ messageId, content: editContent.trim() });
      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessageId || !channelId) return;

    try {
      await deleteMessageMutation.mutateAsync({ messageId: deleteMessageId, channelId });
      setDeleteMessageId(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!channelId) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 bg-background flex items-center justify-center"
      >
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto"
          >
            <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
          </motion.div>
          <p className="text-muted-foreground font-medium">Select a channel to start messaging</p>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-background flex flex-col p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-muted/50 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-24 bg-muted/50 rounded" />
                <div className="h-3 w-16 bg-muted/30 rounded" />
              </div>
              <div className="h-4 bg-muted/30 rounded w-3/4" />
              <div className="h-4 bg-muted/20 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 bg-background flex items-center justify-center"
      >
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Error loading messages</p>
          <p className="text-sm text-muted-foreground/70">Please try again later</p>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1 bg-background w-full" ref={scrollAreaRef}>
        <div className="p-4 sm:p-5 w-full">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const replyCount = message.threadId ? threadCounts[message.id] || 0 : threadCounts[message.id] || 0;
              const isThreadParent = !message.threadId && replyCount > 0;
              const isOwnMessage = message.userId === currentUserId;
              const isEditing = editingMessageId === message.id;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.1) }}
                  className="relative group"
                >
                  {/* Hover action bar - only show for own messages */}
                  {isOwnMessage && !isEditing && (
                    <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                      <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-sm p-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-muted rounded"
                          onClick={() => setSelectedThread(message)}
                          title="Reply in thread"
                        >
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-muted rounded"
                              title="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStartEdit(message)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteMessageId(message.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete message
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}

                  {/* Thread reply button for other users' messages */}
                  {!isOwnMessage && !isEditing && (
                    <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
                      <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-sm p-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-muted rounded"
                          onClick={() => setSelectedThread(message)}
                          title="Reply in thread"
                        >
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="flex gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors duration-150">
                    <Avatar className="h-9 w-9 mt-0.5 flex-shrink-0 ring-2 ring-background">
                      <AvatarFallback className="text-sm font-medium bg-primary text-primary-foreground">
                        {getInitials(message.user?.name || 'Unknown')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                        <span className="text-foreground font-semibold hover:underline cursor-pointer">
                          {message.user?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(message.createdAt)}
                        </span>
                        {message.threadId && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                            Thread reply
                          </Badge>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="text-foreground"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(message.id);
                              }
                              if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-7 px-2"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(message.id)}
                              className="h-7 px-2 bg-primary hover:bg-amber-700"
                              disabled={editMessageMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-foreground break-words">
                          <RichContent content={message.content} />
                        </div>
                      )}

                      {/* Thread indicator */}
                      {!message.threadId && isThreadParent && !isEditing && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => setSelectedThread(message)}
                          className="flex items-center gap-2 mt-2 text-xs text-primary hover:text-amber-700 dark:hover:text-amber-400 font-medium transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                          <span className="text-muted-foreground">View thread</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {typingUsers.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-3 py-2 px-3 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                </div>
                <span className="font-medium">
                  {typingUsers.size === 1 ? 'Someone is typing...' : `${typingUsers.size} people are typing...`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Thread View */}
      {selectedThread && (
        <ThreadView
          parentMessage={selectedThread}
          onClose={() => setSelectedThread(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This message will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMessageMutation.isPending}
            >
              {deleteMessageMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
