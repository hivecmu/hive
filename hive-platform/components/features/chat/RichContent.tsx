"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  X,
  Maximize2,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ZoomIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// File type detection utilities
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
const PDF_EXTENSIONS = ['pdf'];
const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'];
const CODE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'css', 'html', 'json', 'yml', 'yaml', 'md'];
const SPREADSHEET_EXTENSIONS = ['xlsx', 'xls', 'csv'];
const DOCUMENT_EXTENSIONS = ['doc', 'docx', 'txt', 'rtf', 'odt'];

function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() || '';
    return ext;
  } catch {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    return ext.split('?')[0];
  }
}

function getFileType(url: string): 'image' | 'video' | 'audio' | 'pdf' | 'archive' | 'code' | 'spreadsheet' | 'document' | 'unknown' {
  const ext = getFileExtension(url);
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
  if (ARCHIVE_EXTENSIONS.includes(ext)) return 'archive';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  if (SPREADSHEET_EXTENSIONS.includes(ext)) return 'spreadsheet';
  if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
  return 'unknown';
}

function getFileIcon(type: string) {
  switch (type) {
    case 'image': return FileImage;
    case 'video': return FileVideo;
    case 'audio': return FileAudio;
    case 'pdf': return FileText;
    case 'archive': return FileArchive;
    case 'code': return FileCode;
    case 'spreadsheet': return FileSpreadsheet;
    case 'document': return FileText;
    default: return File;
  }
}

function getFileColor(type: string) {
  switch (type) {
    case 'image': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    case 'video': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
    case 'audio': return 'text-pink-500 bg-pink-500/10 border-pink-500/20';
    case 'pdf': return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'archive': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'code': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'spreadsheet': return 'text-green-500 bg-green-500/10 border-green-500/20';
    case 'document': return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
    default: return 'text-muted-foreground bg-muted/50 border-border';
  }
}

// Parse markdown-style links: [text](url)
function parseMarkdownLinks(content: string): Array<{ type: 'text' | 'link'; text: string; url?: string; name?: string }> {
  const parts: Array<{ type: 'text' | 'link'; text: string; url?: string; name?: string }> = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'link', text: match[1], url: match[2], name: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', text: content }];
}

// Parse plain URLs in text
function parseUrls(text: string): Array<{ type: 'text' | 'url'; content: string }> {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
  const parts: Array<{ type: 'text' | 'url'; content: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'url', content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}

// Image Preview with Lightbox
function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline inline-flex items-center gap-1"
      >
        <FileImage className="h-4 w-4" />
        {alt}
      </a>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative group my-2 max-w-sm cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <div className="relative rounded-xl overflow-hidden bg-muted/20 shadow-sm hover:shadow-md transition-shadow duration-200">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30 backdrop-blur-sm">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          <img
            src={url}
            alt={alt}
            className="max-w-full max-h-[280px] object-contain rounded-xl"
            onLoad={() => setIsLoading(false)}
            onError={() => setError(true)}
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl">
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
              <span className="text-white/90 text-xs font-medium truncate max-w-[70%]">{alt}</span>
              <div className="flex items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ZoomIn className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none rounded-2xl overflow-hidden" showCloseButton={false}>
          <VisuallyHidden>
            <DialogTitle>Image Preview: {alt}</DialogTitle>
            <DialogDescription>Full size preview of the image</DialogDescription>
          </VisuallyHidden>
          <div className="relative flex items-center justify-center min-h-[60vh] p-4">
            <img
              src={url}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
              <span className="text-white/90 text-sm font-medium truncate max-w-[60%]">{alt}</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center gap-3 bg-gradient-to-t from-black/50 to-transparent">
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="sm" className="rounded-full gap-2 bg-white/10 hover:bg-white/20 text-white border-0">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="sm" className="rounded-full gap-2 bg-white/10 hover:bg-white/20 text-white border-0">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Video Player
function VideoPlayer({ url, name }: { url: string; name: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return <FilePreview url={url} name={name} type="video" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-2 max-w-lg"
    >
      <div className="relative rounded-xl overflow-hidden bg-black shadow-lg">
        <video
          src={url}
          controls
          className="w-full max-h-[400px] rounded-xl"
          onError={() => setError(true)}
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="flex items-center gap-2 mt-2 px-1">
        <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
          <FileVideo className="h-3.5 w-3.5 text-purple-500" />
        </div>
        <span className="text-xs text-muted-foreground truncate">{name}</span>
      </div>
    </motion.div>
  );
}

// Audio Player
function AudioPlayer({ url, name }: { url: string; name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-2 max-w-md"
    >
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-gradient-to-br from-pink-500/5 to-purple-500/5 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <FileAudio className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate mb-1">{name}</div>
          <audio src={url} controls className="w-full h-8" preload="metadata" />
        </div>
      </div>
    </motion.div>
  );
}

// PDF Preview
function PDFPreview({ url, name }: { url: string; name: string }) {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-2"
    >
      {showEmbed ? (
        <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-2xl" showCloseButton={false}>
            <VisuallyHidden>
              <DialogTitle>PDF Preview: {name}</DialogTitle>
              <DialogDescription>Embedded PDF document viewer</DialogDescription>
            </VisuallyHidden>
            <div className="relative">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-background to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-red-500" />
                  </div>
                  <span className="font-medium text-sm truncate max-w-[300px]">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a href={url} download target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-full gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEmbed(false)}
                    className="rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <iframe
                src={url}
                className="w-full h-[80vh] pt-16"
                title={name}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <div
          className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-orange-500/5 hover:from-red-500/10 hover:to-orange-500/10 transition-all duration-200 cursor-pointer group max-w-sm shadow-sm hover:shadow-md"
          onClick={() => setShowEmbed(true)}
        >
          <div className="w-12 h-14 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">PDF Document</div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmbed(true);
              }}
            >
              <Maximize2 className="h-4 w-4 text-red-500" />
            </Button>
            <a href={url} download target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10">
                <Download className="h-4 w-4 text-red-500" />
              </Button>
            </a>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Generic File Preview
function FilePreview({ url, name, type }: { url: string; name: string; type: string }) {
  const Icon = getFileIcon(type);
  const colorClasses = getFileColor(type);
  const ext = getFileExtension(url).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="my-2 inline-block"
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download
        className={`flex items-center gap-3 p-3 rounded-xl border ${colorClasses} hover:shadow-md transition-all duration-200 group max-w-sm`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{ext} File</div>
        </div>
        <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    </motion.div>
  );
}

// Link Preview
function LinkPreview({ url }: { url: string }) {
  const [hostname, setHostname] = useState<string>('');

  useMemo(() => {
    try {
      setHostname(new URL(url).hostname);
    } catch {
      setHostname(url);
    }
  }, [url]);

  // Check if it's a file URL
  const fileType = getFileType(url);
  if (fileType !== 'unknown') {
    const fileName = url.split('/').pop()?.split('?')[0] || 'File';

    switch (fileType) {
      case 'image':
        return <ImagePreview url={url} alt={fileName} />;
      case 'video':
        return <VideoPlayer url={url} name={fileName} />;
      case 'audio':
        return <AudioPlayer url={url} name={fileName} />;
      case 'pdf':
        return <PDFPreview url={url} name={fileName} />;
      default:
        return <FilePreview url={url} name={fileName} type={fileType} />;
    }
  }

  // Regular link
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-1 break-all transition-colors"
    >
      {url}
      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-70" />
    </a>
  );
}

// Main RichContent Component
interface RichContentProps {
  content: string;
}

export function RichContent({ content }: RichContentProps) {
  const parsedContent = useMemo(() => {
    const markdownParts = parseMarkdownLinks(content);
    const allParts: Array<{ type: 'text' | 'link' | 'url'; content: string; url?: string; name?: string }> = [];

    for (const part of markdownParts) {
      if (part.type === 'text') {
        const urlParts = parseUrls(part.text);
        for (const urlPart of urlParts) {
          allParts.push({
            type: urlPart.type,
            content: urlPart.content,
            url: urlPart.type === 'url' ? urlPart.content : undefined
          });
        }
      } else {
        allParts.push({
          type: 'link',
          content: part.text,
          url: part.url,
          name: part.name
        });
      }
    }

    return allParts;
  }, [content]);

  // Group consecutive file attachments together
  const groupedContent = useMemo(() => {
    const groups: Array<{ type: 'text' | 'attachments'; items: typeof parsedContent }> = [];
    let currentTextGroup: typeof parsedContent = [];
    let currentAttachmentGroup: typeof parsedContent = [];

    for (const part of parsedContent) {
      if (part.type === 'link' && part.url) {
        const fileType = getFileType(part.url);
        if (fileType !== 'unknown') {
          if (currentTextGroup.length > 0) {
            groups.push({ type: 'text', items: currentTextGroup });
            currentTextGroup = [];
          }
          currentAttachmentGroup.push(part);
        } else {
          if (currentAttachmentGroup.length > 0) {
            groups.push({ type: 'attachments', items: currentAttachmentGroup });
            currentAttachmentGroup = [];
          }
          currentTextGroup.push(part);
        }
      } else if (part.type === 'url' && part.url) {
        const fileType = getFileType(part.url);
        if (fileType !== 'unknown') {
          if (currentTextGroup.length > 0) {
            groups.push({ type: 'text', items: currentTextGroup });
            currentTextGroup = [];
          }
          currentAttachmentGroup.push(part);
        } else {
          if (currentAttachmentGroup.length > 0) {
            groups.push({ type: 'attachments', items: currentAttachmentGroup });
            currentAttachmentGroup = [];
          }
          currentTextGroup.push(part);
        }
      } else {
        if (currentAttachmentGroup.length > 0) {
          groups.push({ type: 'attachments', items: currentAttachmentGroup });
          currentAttachmentGroup = [];
        }
        currentTextGroup.push(part);
      }
    }

    if (currentTextGroup.length > 0) {
      groups.push({ type: 'text', items: currentTextGroup });
    }
    if (currentAttachmentGroup.length > 0) {
      groups.push({ type: 'attachments', items: currentAttachmentGroup });
    }

    return groups;
  }, [parsedContent]);

  return (
    <div className="space-y-1">
      {groupedContent.map((group, groupIndex) => {
        if (group.type === 'text') {
          return (
            <div key={groupIndex} className="leading-relaxed">
              {group.items.map((part, partIndex) => {
                if (part.type === 'text') {
                  return part.content.split('\n').map((line, lineIndex) => (
                    <span key={`${partIndex}-${lineIndex}`}>
                      {line}
                      {lineIndex < part.content.split('\n').length - 1 && <br />}
                    </span>
                  ));
                } else if (part.type === 'url' && part.url) {
                  return <LinkPreview key={partIndex} url={part.url} />;
                } else if (part.type === 'link' && part.url) {
                  return (
                    <a
                      key={partIndex}
                      href={part.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {part.content}
                    </a>
                  );
                }
                return null;
              })}
            </div>
          );
        } else {
          return (
            <div key={groupIndex} className="flex flex-wrap gap-3">
              {group.items.map((part, partIndex) => {
                if (!part.url) return null;
                const fileType = getFileType(part.url);
                const fileName = part.name || part.url.split('/').pop()?.split('?')[0] || 'File';

                switch (fileType) {
                  case 'image':
                    return <ImagePreview key={partIndex} url={part.url} alt={fileName} />;
                  case 'video':
                    return <VideoPlayer key={partIndex} url={part.url} name={fileName} />;
                  case 'audio':
                    return <AudioPlayer key={partIndex} url={part.url} name={fileName} />;
                  case 'pdf':
                    return <PDFPreview key={partIndex} url={part.url} name={fileName} />;
                  default:
                    return <FilePreview key={partIndex} url={part.url} name={fileName} type={fileType} />;
                }
              })}
            </div>
          );
        }
      })}
    </div>
  );
}
