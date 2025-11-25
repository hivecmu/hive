import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  FolderOpen,
  Search,
  Download,
  ExternalLink,
  FileText,
  Image,
  File,
  Tag,
  CheckCircle,
  RefreshCw,
  Eye,
  Upload,
  Plus,
  FileJson,
  FileCode,
  MoreVertical,
  Sparkles,
  HardDrive,
  FileCheck,
  Tags
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery, useMutation } from "@tanstack/react-query";

interface HubDashboardProps {
  onBack: () => void;
}

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number | null;
  channelId?: string;
  messageId?: string;
  uploadedBy: string;
  uploadedAt: string;
  tags?: string[];
  indexed?: boolean;
  s3Key: string;
  metadata?: Record<string, any>;
  // Search result fields
  similarity?: number;
  contentPreview?: string;
  extractionMethod?: string;
  matchReason?: string;
}

// Map backend response to frontend FileItem
const mapApiFile = (file: any): FileItem => {
  // Ensure size is a number (PostgreSQL returns bigint as string)
  const rawSize = file.sizeBytes ?? file.size ?? null;
  const size = rawSize !== null ? Number(rawSize) : null;

  return {
    id: file.fileId || file.id,
    filename: file.name || file.filename || 'Unknown',
    mimeType: file.mimeType || 'application/octet-stream',
    size: isNaN(size as number) ? null : size,
    channelId: file.channelId,
    messageId: file.messageId,
    uploadedBy: file.uploadedBy || 'Unknown',
    uploadedAt: file.createdAt || file.uploadedAt,
    tags: file.tags || [],
    indexed: file.indexed || false,
    s3Key: file.s3Key || file.url || '',
    // Search result fields
    similarity: file.similarity,
    contentPreview: file.contentPreview,
    extractionMethod: file.extractionMethod,
    matchReason: file.matchReason,
  };
};

const getFileIcon = (mimeType: string, filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();

  // Check by extension first for more specific icons
  if (ext === 'json') {
    return <FileJson className="h-5 w-5 text-amber-500" />;
  }
  if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
    return <FileCode className="h-5 w-5 text-blue-500" />;
  }
  if (mimeType.startsWith('image/')) {
    return <Image className="h-5 w-5 text-purple-500" />;
  }
  if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (mimeType.includes('text') || ext === 'txt' || ext === 'md') {
    return <FileText className="h-5 w-5 text-emerald-500" />;
  }
  return <File className="h-5 w-5 text-slate-400" />;
};

const formatFileSize = (bytes: number | null | undefined) => {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return 'Unknown size';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  if (bytes < 1073741824) return Math.round(bytes / 1048576) + ' MB';
  return Math.round(bytes / 1073741824) + ' GB';
};

const formatTimestamp = (timestamp: string | null | undefined) => {
  if (!timestamp) return 'Unknown date';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Unknown date';
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return minutes === 0 ? 'Just now' : `${minutes} min ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export function HubDashboard({ onBack }: HubDashboardProps) {
  const { currentOrg } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMimeType, setSelectedMimeType] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dedupeEnabled, setDedupeEnabled] = useState(true);
  const [similarityEnabled, setSimilarityEnabled] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  // Fetch files from backend
  const { data: files = [], isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['files', currentOrg?.id, searchQuery, selectedMimeType, selectedTags],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      const params: any = {};
      if (searchQuery) params.q = searchQuery;
      if (selectedMimeType !== 'all') params.mimeType = selectedMimeType;
      if (selectedTags.length > 0) params.tags = selectedTags.join(',');
      params.limit = 100;

      const result = await api.files.search(params);
      if (result.ok) {
        return (result.value as any[]).map(mapApiFile);
      } else {
        toast.error('Failed to load files');
        return [];
      }
    },
    enabled: !!currentOrg?.id,
  });

  // Create sync job mutation
  const syncFilesMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg?.id) throw new Error('No workspace selected');
      return api.files.createSyncJob(currentOrg.id);
    },
    onSuccess: () => {
      toast.success('File sync started');
      setTimeout(() => refetchFiles(), 2000); // Refetch after 2 seconds
    },
    onError: () => {
      toast.error('Failed to start file sync');
    },
  });

  // Tag file mutation
  const tagFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return api.files.tag(fileId);
    },
    onSuccess: () => {
      toast.success('File tagged successfully');
      refetchFiles();
    },
    onError: () => {
      toast.error('Failed to tag file');
    },
  });

  // Index file mutation
  const indexFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return api.files.index(fileId);
    },
    onSuccess: () => {
      toast.success('File indexed successfully');
      refetchFiles();
    },
    onError: () => {
      toast.error('Failed to index file');
    },
  });

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!currentOrg) {
      toast.error('No workspace selected');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 10MB`);
        continue;
      }

      await uploadFile(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    if (!currentOrg) return;

    const fileKey = `${file.name}-${file.size}`;
    setUploadingFiles(prev => new Set(prev).add(fileKey));

    const formData = new FormData();
    formData.append('file', file);

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

      if (result.ok) {
        toast.success(`${file.name} uploaded successfully`);
        refetchFiles();
      } else {
        throw new Error(result.issues?.[0]?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}`);
    } finally {
      setUploadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileKey);
        return next;
      });
    }
  };

  const handleSyncFiles = () => {
    syncFilesMutation.mutate();
  };

  const handleTagFile = (fileId: string) => {
    tagFileMutation.mutate(fileId);
  };

  const handleIndexFile = (fileId: string) => {
    indexFileMutation.mutate(fileId);
  };

  // Extract unique mime types and tags from files
  const mimeTypes = Array.from(new Set(files.map(f => f.mimeType)));
  const allTags = Array.from(new Set(files.flatMap(f => f.tags || [])));

  // Calculate stats
  const totalFiles = files.length;
  const indexedFiles = files.filter(f => f.indexed).length;
  const taggedFiles = files.filter(f => f.tags && f.tags.length > 0).length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-muted/30 to-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.json,.xml"
      />

      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <FolderOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">File Hub</h1>
                  <p className="text-xs text-muted-foreground">
                    {totalFiles} files {currentOrg?.workspace?.blueprintApproved && "• Blueprint Approved"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFiles}
                disabled={syncFilesMutation.isPending}
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncFilesMutation.isPending ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button
                size="sm"
                onClick={handleFileUpload}
                disabled={uploadingFiles.size > 0}
                className="h-9 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
              >
                <Upload className={`h-4 w-4 mr-2 ${uploadingFiles.size > 0 ? 'animate-pulse' : ''}`} />
                {uploadingFiles.size > 0 ? `Uploading...` : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="files" className="h-full flex flex-col">
          <div className="px-6 pt-4 pb-2">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="files" className="data-[state=active]:bg-background">Files</TabsTrigger>
              <TabsTrigger value="sources" className="data-[state=active]:bg-background">Sources</TabsTrigger>
              <TabsTrigger value="insights" className="data-[state=active]:bg-background">Insights</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-background">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="files" className="flex-1 overflow-hidden">
            <div className="flex flex-col h-full px-6 pb-6">
              {/* Stats Row - Compact horizontal layout */}
              <div className="flex gap-6 py-4 border-b border-border/50 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <HardDrive className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{totalFiles}</p>
                    <p className="text-xs text-muted-foreground">Total Files</p>
                  </div>
                </div>

                <div className="h-12 w-px bg-border/50" />

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{indexedFiles}</p>
                    <p className="text-xs text-muted-foreground">Indexed</p>
                  </div>
                </div>

                <div className="h-12 w-px bg-border/50" />

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Tags className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{taggedFiles}</p>
                    <p className="text-xs text-muted-foreground">Tagged</p>
                  </div>
                </div>

                <div className="h-12 w-px bg-border/50" />

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <HardDrive className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{formatFileSize(files.reduce((sum, f) => sum + (f.size || 0), 0))}</p>
                    <p className="text-xs text-muted-foreground">Total Size</p>
                  </div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files by name or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background border-border/50 focus-visible:ring-amber-500/20"
                  />
                </div>
                <Select value={selectedMimeType} onValueChange={setSelectedMimeType}>
                  <SelectTrigger className="w-[150px] bg-background border-border/50">
                    <SelectValue placeholder="File type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {mimeTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.split('/')[1] || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Files Grid */}
              <ScrollArea className="flex-1 -mx-1 px-1">
                {filesLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Loading files...
                    </div>
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <FolderOpen className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">No files yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Upload files or sync from chat attachments</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleFileUpload} size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                      <Button onClick={handleSyncFiles} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="group flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-background hover:bg-muted/30 hover:border-border transition-all cursor-pointer"
                        onClick={() => setSelectedFile(file)}
                      >
                        {/* File Icon */}
                        <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                          {getFileIcon(file.mimeType, file.filename)}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate text-sm">{file.filename}</h3>
                            {file.indexed && (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                            {/* Similarity score badge when searching */}
                            {searchQuery && file.similarity !== undefined && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-0">
                                {Math.round(file.similarity * 100)}% match
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(file.uploadedAt)}</span>
                            {file.tags && file.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                {file.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-600 border-0">
                                    {tag}
                                  </Badge>
                                ))}
                                {file.tags.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">+{file.tags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Match reason when searching - shows why this file matched */}
                          {searchQuery && file.matchReason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.matchReason}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!file.indexed && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIndexFile(file.id);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Index
                            </Button>
                          )}
                          {(!file.tags || file.tags.length === 0) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTagFile(file.id);
                              }}
                            >
                              <Sparkles className="h-3.5 w-3.5 mr-1" />
                              Tag
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="px-6 pb-6 pt-2">
            <div className="max-w-2xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">File Sources</h2>
                <p className="text-sm text-muted-foreground mt-1">Connect sources to automatically sync files to your Hub</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">Local Upload</div>
                      <div className="text-sm text-muted-foreground">Upload files directly to the Hub</div>
                    </div>
                  </div>
                  <Button onClick={handleFileUpload} size="sm" className="h-9">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Upload
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                      <FolderOpen className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">Chat Attachments</div>
                      <div className="text-sm text-muted-foreground">Sync files shared in channel messages</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSyncFiles} disabled={syncFilesMutation.isPending} className="h-9">
                    <RefreshCw className={`h-4 w-4 mr-1.5 ${syncFilesMutation.isPending ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="px-6 pb-6">
                  <Card>
                    <CardHeader>
                <CardTitle>File Insights</CardTitle>
                <CardDescription>Analytics and patterns in your files</CardDescription>
                    </CardHeader>
                    <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">File Types Distribution</h3>
                        <div className="space-y-2">
                      {mimeTypes.map(type => {
                        const count = files.filter(f => f.mimeType === type).length;
                        const percentage = (count / Math.max(totalFiles, 1)) * 100;
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <div className="w-32 text-sm">{type.split('/')[1] || type}</div>
                            <div className="flex-1">
                              <Progress value={percentage} />
                            </div>
                            <div className="text-sm text-muted-foreground">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                          </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-2">Top Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {allTags.slice(0, 10).map(tag => {
                        const count = files.filter(f => f.tags?.includes(tag)).length;
                        return (
                          <Badge key={tag} variant="secondary">
                            {tag} ({count})
                          </Badge>
                        );
                      })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
          </TabsContent>

          <TabsContent value="settings" className="px-6 pb-6">
            <Card>
              <CardHeader>
                <CardTitle>Hub Settings</CardTitle>
                <CardDescription>Configure file processing and organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dedupe">Automatic Deduplication</Label>
                    <p className="text-sm text-muted-foreground">Remove duplicate files automatically</p>
                  </div>
                  <Switch
                    id="dedupe"
                    checked={dedupeEnabled}
                    onCheckedChange={setDedupeEnabled}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="similarity">Similarity Detection</Label>
                    <p className="text-sm text-muted-foreground">Find and group similar files</p>
                      </div>
                  <Switch
                    id="similarity"
                    checked={similarityEnabled}
                    onCheckedChange={setSimilarityEnabled}
                  />
                      </div>

                <Separator />

                <div>
                  <Label>Auto-tagging & Indexing</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Automatically tag and index all files for semantic search
                  </p>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!currentOrg?.id) return;
                      toast.info('Starting bulk tagging and indexing...');
                      const result = await api.files.tagAll(currentOrg.id);
                      if (result.ok) {
                        toast.success(`Tagged ${result.value.tagged} files, indexed ${result.value.indexed} files`);
                        refetchFiles();
                      } else {
                        toast.error('Failed to tag and index files');
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Tag & Index All Files
                  </Button>
                      </div>
                  </CardContent>
                </Card>
              </TabsContent>
          </Tabs>
        </div>

      {/* File Detail Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedFile(null)}>
          <div className="w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-border/50">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                  {getFileIcon(selectedFile.mimeType, selectedFile.filename)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate">{selectedFile.filename}</h2>
                  <p className="text-sm text-muted-foreground">{selectedFile.mimeType}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => setSelectedFile(null)}
                >
                  <span className="text-lg">&times;</span>
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Size</p>
                  <p className="text-sm font-medium">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Uploaded</p>
                  <p className="text-sm font-medium">{formatTimestamp(selectedFile.uploadedAt)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                  <div className="flex items-center gap-2">
                    {selectedFile.indexed ? (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Indexed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">Not indexed</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Uploaded By</p>
                  <p className="text-sm font-medium">{selectedFile.uploadedBy || 'Unknown'}</p>
                </div>
              </div>

              {selectedFile.tags && selectedFile.tags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFile.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-purple-500/10 text-purple-600 border-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 pt-0 flex gap-2">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
              {!selectedFile.indexed && (
                <Button
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                  onClick={() => {
                    handleIndexFile(selectedFile.id);
                    setSelectedFile(null);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Index
                </Button>
              )}
              {(!selectedFile.tags || selectedFile.tags.length === 0) && (
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0"
                  onClick={() => {
                    handleTagFile(selectedFile.id);
                    setSelectedFile(null);
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Tag
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}