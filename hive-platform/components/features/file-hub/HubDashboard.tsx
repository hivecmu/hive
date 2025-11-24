import { useState, useEffect } from "react";
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
  Link,
  Search,
  Filter,
  Download,
  ExternalLink,
  Copy,
  FileText,
  Image,
  File,
  Calendar,
  Tag,
  GitBranch,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  Eye,
  Upload,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface HubDashboardProps {
  onBack: () => void;
}

interface FileItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  channelId?: string;
  messageId?: string;
  uploadedBy: string;
  uploadedAt: string;
  tags?: string[];
  indexed?: boolean;
  s3Key: string;
  metadata?: Record<string, any>;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-5 w-5 text-chart-4" />;
  } else if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-destructive" />;
  } else if (mimeType.includes('text')) {
    return <FileText className="h-5 w-5 text-chart-1" />;
  } else {
    return <File className="h-5 w-5 text-foreground" />;
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
  if (bytes < 1073741824) return Math.round(bytes / 1048576) + ' MB';
  return Math.round(bytes / 1073741824) + ' GB';
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
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
  const queryClient = useQueryClient();
  
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMimeType, setSelectedMimeType] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dedupeEnabled, setDedupeEnabled] = useState(true);
  const [similarityEnabled, setSimilarityEnabled] = useState(false);

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
        return result.value as FileItem[];
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
    // TODO: Implement file upload
    toast.info('File upload coming soon');
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
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="bg-card text-card-foreground border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
            <div>
              <h1 className="text-2xl flex items-center gap-2">
                <FolderOpen className="h-6 w-6" />
                Hub Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {totalFiles} files
                </Badge>
                {currentOrg?.workspace?.blueprintApproved && (
                  <Badge variant="outline" className="text-xs">
                    Blueprint Approved
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncFiles}
              disabled={syncFilesMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncFilesMutation.isPending ? 'animate-spin' : ''}`} />
              Sync Files
            </Button>
            <Button size="sm" onClick={handleFileUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="files" className="h-full">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="files" className="px-6 pb-6 h-[calc(100%-5rem)]">
            <div className="flex flex-col h-full gap-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalFiles}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Indexed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{indexedFiles}</div>
                    <Progress value={(indexedFiles / Math.max(totalFiles, 1)) * 100} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Tagged</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{taggedFiles}</div>
                    <Progress value={(taggedFiles / Math.max(totalFiles, 1)) * 100} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedMimeType} onValueChange={setSelectedMimeType}>
                  <SelectTrigger className="w-[180px]">
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
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              {/* Files Grid */}
              <ScrollArea className="flex-1">
                {filesLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading files...</div>
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <File className="h-12 w-12 text-muted-foreground" />
                    <div className="text-muted-foreground">No files found</div>
                    <Button onClick={handleSyncFiles} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Files
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {files.map((file) => (
                      <Card 
                        key={file.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedFile(file)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getFileIcon(file.mimeType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{file.filename}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {formatFileSize(file.size)}
                                </Badge>
                                {file.indexed && (
                                  <Badge variant="secondary" className="text-xs">
                                    Indexed
                                  </Badge>
                                )}
                              </div>
                              {file.tags && file.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {file.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-2">
                                {formatTimestamp(file.uploadedAt)}
                              </div>
                              <div className="flex gap-2 mt-2">
                                {!file.indexed && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleIndexFile(file.id);
                                    }}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Index
                                  </Button>
                                )}
                                {(!file.tags || file.tags.length === 0) && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTagFile(file.id);
                                    }}
                                  >
                                    <Tag className="h-3 w-3 mr-1" />
                                    Tag
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="px-6 pb-6">
            <Card>
              <CardHeader>
                <CardTitle>File Sources</CardTitle>
                <CardDescription>Connect external services to sync files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        📁
                      </div>
                      <div>
                        <div className="font-medium">Local Upload</div>
                        <div className="text-sm text-muted-foreground">Upload files directly</div>
                      </div>
                    </div>
                    <Button onClick={handleFileUpload}>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        🗂️
                      </div>
                      <div>
                        <div className="font-medium">Google Drive</div>
                        <div className="text-sm text-muted-foreground">Coming soon</div>
                      </div>
                    </div>
                    <Button disabled variant="outline">
                      Connect
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        📦
                      </div>
                      <div>
                        <div className="font-medium">Dropbox</div>
                        <div className="text-sm text-muted-foreground">Coming soon</div>
                      </div>
                    </div>
                    <Button disabled variant="outline">
                      Connect
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  <Label>Auto-tagging</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Automatically tag files based on content and context
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const untaggedFiles = files.filter(f => !f.tags || f.tags.length === 0);
                      if (untaggedFiles.length > 0) {
                        toast.info(`Tagging ${untaggedFiles.length} files...`);
                        untaggedFiles.forEach(f => handleTagFile(f.id));
                      } else {
                        toast.info('All files are already tagged');
                      }
                    }}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Tag All Untagged Files
                  </Button>
                </div>

                <Separator />

                <div>
                  <Label>Indexing</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Index files for semantic search
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const unindexedFiles = files.filter(f => !f.indexed);
                      if (unindexedFiles.length > 0) {
                        toast.info(`Indexing ${unindexedFiles.length} files...`);
                        unindexedFiles.forEach(f => handleIndexFile(f.id));
                      } else {
                        toast.info('All files are already indexed');
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Index All Files
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* File Detail Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getFileIcon(selectedFile.mimeType)}
                  <div>
                    <CardTitle>{selectedFile.filename}</CardTitle>
                    <CardDescription>{selectedFile.mimeType}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Size</Label>
                  <div className="text-sm">{formatFileSize(selectedFile.size)}</div>
                </div>
                <div>
                  <Label>Uploaded</Label>
                  <div className="text-sm">{formatTimestamp(selectedFile.uploadedAt)}</div>
                </div>
                <div>
                  <Label>Uploaded By</Label>
                  <div className="text-sm">{selectedFile.uploadedBy}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    {selectedFile.indexed && <Badge variant="secondary">Indexed</Badge>}
                    {selectedFile.tags && selectedFile.tags.length > 0 && <Badge variant="secondary">Tagged</Badge>}
                  </div>
                </div>
              </div>

              {selectedFile.tags && selectedFile.tags.length > 0 && (
                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFile.tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
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
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      handleIndexFile(selectedFile.id);
                      setSelectedFile(null);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Index
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}