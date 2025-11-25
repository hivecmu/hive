"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send, X, FileText } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useSendMessage } from "@/lib/hooks/useMessages";
import { toast } from "sonner";
import { useOrganization } from "@/contexts/OrganizationContext";
import { AnimatePresence, motion } from "framer-motion";

interface FileAttachment {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploadedUrl?: string;
  error?: string;
}

interface MessageInputProps {
  channelId: string | null;
  channelName?: string;
}

export function MessageInput({ channelId, channelName = 'general' }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isConnected, emitTypingStart, emitTypingStop } = useSocket();
  const sendMessageMutation = useSendMessage(channelId);
  const { currentOrg } = useOrganization();

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!currentOrg) {
      toast.error("No workspace selected");
      return;
    }

    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 10MB`);
        continue;
      }

      const attachment: FileAttachment = { file };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Upload files immediately
    for (const attachment of newAttachments) {
      uploadFile(attachment);
    }
  };

  const uploadFile = async (attachment: FileAttachment) => {
    if (!currentOrg) return;

    const fileName = attachment.file.name;
    const fileSize = attachment.file.size;

    const formData = new FormData();
    formData.append('file', attachment.file);

    setAttachments(prev => prev.map(a =>
      a.file.name === fileName && a.file.size === fileSize ? { ...a, uploading: true } : a
    ));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/upload/message?workspaceId=${currentOrg.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hive_auth_token')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      setAttachments(prev => prev.map(a =>
        a.file.name === fileName && a.file.size === fileSize ? { ...a, uploading: false, uploadedUrl: result.value.url } : a
      ));
    } catch (error) {
      console.error('Upload error:', error);
      setAttachments(prev => prev.map(a =>
        a.file.name === fileName && a.file.size === fileSize ? { ...a, uploading: false, error: 'Upload failed' } : a
      ));
      toast.error(`Failed to upload ${fileName}`);
    }
  };

  const removeAttachment = (index: number) => {
    const attachment = attachments[index];
    if (attachment.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) {
      return;
    }

    if (!channelId) {
      toast.error("No channel selected");
      return;
    }

    // Check if any files are still uploading
    const uploadingFiles = attachments.filter(a => a.uploading);
    if (uploadingFiles.length > 0) {
      toast.error("Please wait for files to finish uploading");
      return;
    }

    try {
      // Build message with attachments
      let fullMessage = message.trim();

      // Add attachment URLs to message
      const uploadedAttachments = attachments.filter(a => a.uploadedUrl);
      if (uploadedAttachments.length > 0) {
        if (fullMessage) fullMessage += '\n\n';
        uploadedAttachments.forEach(a => {
          fullMessage += `[${a.file.name}](${a.uploadedUrl})\n`;
        });
      }

      // Send message via API
      await sendMessageMutation.mutateAsync(fullMessage);

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        emitTypingStop(channelId);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }

      // Clear input and attachments
      setMessage("");
      attachments.forEach(a => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      setAttachments([]);
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

  const canSend = channelId && (message.trim() || attachments.length > 0) && !sendMessageMutation.isPending;

  return (
    <div className="bg-background border-t border-border p-3 sm:p-4">
      <div className={`
        flex items-center gap-2 bg-muted/30 border rounded-xl transition-all duration-200 px-3 py-2
        ${channelId ? 'border-border hover:border-muted-foreground/30 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20' : 'border-border opacity-50'}
      `}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          id="message-file-input"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />
        <label
          htmlFor={channelId ? "message-file-input" : undefined}
          className={`
            inline-flex items-center justify-center h-8 w-8 p-0 rounded-lg transition-colors flex-shrink-0
            ${channelId
              ? 'text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer'
              : 'text-muted-foreground/50 cursor-not-allowed'}
          `}
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </label>

        <Input
          value={message}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={`Message #${channelName}`}
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-foreground placeholder:text-muted-foreground h-auto py-1 flex-1"
          disabled={!channelId}
        />

        <Button
          size="sm"
          onClick={handleSendMessage}
          disabled={!canSend}
          className={`
            h-8 w-8 p-0 rounded-lg transition-all duration-200
            ${canSend
              ? 'bg-primary hover:bg-amber-700 text-primary-foreground shadow-sm hover:shadow'
              : 'bg-muted text-muted-foreground'
            }
          `}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* File attachments preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex flex-wrap gap-2"
          >
            {attachments.map((attachment, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group bg-muted/50 border border-border rounded-lg p-2 flex items-center gap-2 max-w-[200px] hover:bg-muted/80 transition-colors"
              >
                {attachment.uploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-lg flex items-center justify-center"
                  >
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </motion.div>
                )}

                {attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.file.name}
                    className="h-10 w-10 object-cover rounded-md"
                  />
                ) : (
                  <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">
                    {attachment.file.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(attachment.file.size / 1024).toFixed(0)} KB
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive rounded-md"
                  onClick={() => removeAttachment(index)}
                  disabled={attachment.uploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>

                {attachment.error && (
                  <span className="absolute -bottom-5 left-0 text-xs text-destructive font-medium">
                    {attachment.error}
                  </span>
                )}

                {attachment.uploadedUrl && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status indicators */}
      <AnimatePresence>
        {!channelId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-xs text-muted-foreground text-center"
          >
            Select a channel to start messaging
          </motion.div>
        )}
        {channelId && !isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"
          >
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Connecting to messaging server...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
