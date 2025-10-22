import { useState } from "react";
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
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface HubDashboardProps {
  onBack: () => void;
}

const sources = [
  { id: 1, name: "Google Drive", status: "linked", icon: "🗂️", lastSync: "2 min ago", filesCount: 1247 },
  { id: 2, name: "Dropbox", status: "linking", icon: "📦", lastSync: "Syncing...", filesCount: 0 },
  { id: 3, name: "OneDrive", status: "unlinked", icon: "☁️", lastSync: "Never", filesCount: 0 },
  { id: 4, name: "Notion", status: "linked", icon: "📝", lastSync: "5 min ago", filesCount: 89 },
  { id: 5, name: "GitHub", status: "reauth", icon: "⚡", lastSync: "1 hour ago", filesCount: 156 },
];

const files = [
  {
    id: 1,
    title: "Mobile App Redesign Brief.pdf",
    type: "pdf",
    source: "Google Drive",
    tags: ["workstreams/app-redesign"],
    duplicates: 2,
    modified: "2 hours ago",
    size: "2.4 MB"
  },
  {
    id: 2,
    title: "Homepage wireframes.fig",
    type: "figma",
    source: "Dropbox",
    tags: ["workstreams/website"],
    duplicates: 0,
    modified: "1 day ago",
    size: "18.2 MB"
  },
  {
    id: 3,
    title: "client-pitch.md",
    type: "markdown",
    source: "GitHub",
    tags: ["committees/marketing"],
    duplicates: 0,
    modified: "3 days ago",
    size: "45 KB"
  },
  {
    id: 4,
    title: "Meeting Notes - 2025-09-20",
    type: "notion",
    source: "Notion",
    tags: ["#general"],
    duplicates: 1,
    modified: "1 week ago",
    size: "12 KB"
  },
  {
    id: 5,
    title: "Design System Components.sketch",
    type: "sketch",
    source: "Google Drive",
    tags: ["committees/design"],
    duplicates: 3,
    modified: "2 weeks ago",
    size: "156 MB"
  },
  {
    id: 6,
    title: "API Documentation.pdf",
    type: "pdf",
    source: "GitHub",
    tags: ["committees/development"],
    duplicates: 0,
    modified: "3 weeks ago",
    size: "890 KB"
  }
];

const getFileIcon = (type: string) => {
  switch (type) {
    case "pdf":
      return <FileText className="h-5 w-5 text-destructive" />;
    case "figma":
    case "sketch":
      return <Image className="h-5 w-5 text-chart-4" />;
    case "markdown":
      return <File className="h-5 w-5 text-chart-1" />;
    case "notion":
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    default:
      return <File className="h-5 w-5 text-foreground" />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "linked":
      return <CheckCircle className="h-4 w-4 text-chart-2" />;
    case "linking":
      return <RefreshCw className="h-4 w-4 text-chart-1 animate-spin" />;
    case "reauth":
      return <AlertCircle className="h-4 w-4 text-chart-4" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export function HubDashboard({ onBack }: HubDashboardProps) {
  const [selectedFile, setSelectedFile] = useState<typeof files[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  const [dedupeEnabled, setDedupeEnabled] = useState(true);
  const [similarityEnabled, setSimilarityEnabled] = useState(false);

  const handleLinkSource = (sourceId: number) => {
    const source = sources.find(s => s.id === sourceId);
    if (source) {
      // Simulate OAuth flow
      toast.success(`Linking to ${source.name}...`);
      setTimeout(() => {
        toast.success(`${source.name} linked successfully! Full sync started.`);
      }, 2000);
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = selectedSource === "all" || file.source === selectedSource;
    const matchesChannel = selectedChannel === "all" || file.tags.some(tag => tag.includes(selectedChannel));
    return matchesSearch && matchesSource && matchesChannel;
  });

  const linkedSources = sources.filter(s => s.status === "linked");
  const totalFiles = linkedSources.reduce((sum, source) => sum + source.filesCount, 0);

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
                  Structured by: Blueprint v1
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 text-xs text-muted-foreground hover:text-foreground"
                >
                  View structure
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        <div className={`flex-1 ${selectedFile ? 'mr-[400px]' : ''} transition-all duration-200`}>
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="border-b border-border">
              <TabsList className="grid w-full grid-cols-5 max-w-2xl">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="audits">Audits</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="overview" className="h-full p-6">
                {linkedSources.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <Card className="w-96">
                      <CardHeader className="text-center">
                        <div className="mx-auto mb-4 p-3 bg-muted rounded-full w-fit">
                          <FolderOpen className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle>Connect sources to start consolidating files</CardTitle>
                        <CardDescription>
                          We'll tag files by channel/subgroup automatically.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {sources.filter(s => s.status === "unlinked").map(source => (
                            <Badge 
                              key={source.id}
                              variant="outline" 
                              className="cursor-pointer hover:bg-accent"
                              onClick={() => handleLinkSource(source.id)}
                            >
                              {source.icon} {source.name}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-6">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-medium">{totalFiles.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Total Files</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-medium">{linkedSources.length}</div>
                          <div className="text-sm text-muted-foreground">Connected Sources</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-2xl font-medium">12</div>
                          <div className="text-sm text-muted-foreground">Duplicates Collapsed</div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <CheckCircle className="h-4 w-4 text-chart-2" />
                            <span>Google Drive sync completed - 1,247 files processed</span>
                            <span className="text-muted-foreground">2 min ago</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <RefreshCw className="h-4 w-4 text-chart-1" />
                            <span>Dropbox sync in progress...</span>
                            <span className="text-muted-foreground">5 min ago</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <Tag className="h-4 w-4 text-chart-4" />
                            <span>Auto-tagged 89 files to workstreams/app-redesign</span>
                            <span className="text-muted-foreground">1 hour ago</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="files" className="h-full p-6">
                <div className="space-y-4 h-full flex flex-col">
                  {/* Toolbar */}
                  <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search titles, text, tags"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={selectedSource} onValueChange={setSelectedSource}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        {sources.filter(s => s.status === "linked").map(source => (
                          <SelectItem key={source.id} value={source.name}>{source.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Channel/Subgroup" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Channels</SelectItem>
                        <SelectItem value="workstreams">Workstreams</SelectItem>
                        <SelectItem value="committees">Committees</SelectItem>
                        <SelectItem value="general">#general</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dedup Banner */}
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">We collapsed 12 duplicates by content hash.</span>
                      <Button variant="ghost" size="sm" className="text-foreground hover:text-muted-foreground">
                        View rules →
                      </Button>
                    </div>
                  </div>

                  {/* Files Grid */}
                  <ScrollArea className="flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredFiles.map((file) => (
                        <Card 
                          key={file.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedFile(file)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getFileIcon(file.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium truncate">{file.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {file.source}
                                  </Badge>
                                  {file.duplicates > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {file.duplicates} duplicates
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {file.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  {file.modified} • {file.size}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="sources" className="h-full p-6">
                <div className="space-y-4">
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <span className="text-sm">We only request read-only scopes by default.</span>
                  </div>
                  
                  <div className="grid gap-4">
                    {sources.map((source) => (
                      <Card key={source.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{source.icon}</span>
                              <div>
                                <h3 className="font-medium">{source.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {getStatusIcon(source.status)}
                                  <span className="capitalize">{source.status}</span>
                                  <span>•</span>
                                  <span>Last sync: {source.lastSync}</span>
                                  {source.filesCount > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{source.filesCount.toLocaleString()} files</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {source.status === "unlinked" && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleLinkSource(source.id)}
                                >
                                  Link
                                </Button>
                              )}
                              {source.status === "linked" && (
                                <Button variant="outline" size="sm">
                                  Manage
                                </Button>
                              )}
                              {source.status === "reauth" && (
                                <Button variant="outline" size="sm">
                                  Reauth
                                </Button>
                              )}
                              <Button variant="ghost" size="sm">
                                ⋮
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="h-full p-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Dedupe Rules</CardTitle>
                      <CardDescription>Configure how we identify and handle duplicate files</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="hash-dedupe">Hash-only deduplication</Label>
                          <p className="text-sm text-muted-foreground">Identify duplicates by content hash (exact matches)</p>
                        </div>
                        <Switch 
                          id="hash-dedupe" 
                          checked={dedupeEnabled} 
                          onCheckedChange={setDedupeEnabled} 
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between opacity-50">
                        <div>
                          <Label htmlFor="similarity-dedupe">Similarity ≥ 90%</Label>
                          <p className="text-sm text-muted-foreground">Identify similar files (coming soon)</p>
                        </div>
                        <Switch 
                          id="similarity-dedupe" 
                          checked={similarityEnabled} 
                          onCheckedChange={setSimilarityEnabled} 
                          disabled
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tagging Rules</CardTitle>
                      <CardDescription>Rules for automatically tagging files by channel/subgroup</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm font-medium">Current Rules</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                            <span>path contains /workstreams/app-redesign</span>
                            <span>→</span>
                            <Badge variant="outline">workstreams/app-redesign</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                            <span>path contains /design/</span>
                            <span>→</span>
                            <Badge variant="outline">committees/design</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                            <span>filename contains "meeting"</span>
                            <span>→</span>
                            <Badge variant="outline">#general</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="ghost" className="text-muted-foreground">
                      Restore defaults
                    </Button>
                    <Button onClick={() => toast.success("Rules saved successfully")}>
                      Save
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="audits" className="h-full p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Audit Log</CardTitle>
                    <CardDescription>Recent changes and system events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Google Drive full sync completed</span>
                        <span className="text-muted-foreground">2 min ago</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Tag className="h-4 w-4 text-chart-4" />
                        <span>Auto-tagged 89 files based on path rules</span>
                        <span className="text-muted-foreground">1 hour ago</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Settings className="h-4 w-4 text-chart-1" />
                        <span>Deduplication rules updated</span>
                        <span className="text-muted-foreground">2 hours ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* File Detail Drawer */}
        {selectedFile && (
          <div className="fixed right-0 top-0 w-[400px] h-full bg-card text-card-foreground border-l border-border flex flex-col">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">File Details</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  ×
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Overview */}
                <div>
                  <h4 className="font-medium mb-3">Overview</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      {getFileIcon(selectedFile.type)}
                      <div className="flex-1">
                        <div className="font-medium">{selectedFile.title}</div>
                        <div className="text-sm text-muted-foreground">{selectedFile.size}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Source</div>
                        <div>{selectedFile.source}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Modified</div>
                        <div>{selectedFile.modified}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Locations */}
                <div>
                  <h4 className="font-medium mb-3">Locations</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      <span>Open in {selectedFile.source}</span>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {selectedFile.duplicates > 0 && (
                      <div className="text-sm text-muted-foreground">
                        + {selectedFile.duplicates} other locations
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h4 className="font-medium mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedFile.tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h4 className="font-medium mb-3">Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Hub link
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Tag className="h-4 w-4 mr-2" />
                      Refocus to channel...
                    </Button>
                  </div>
                </div>

                {/* Audit */}
                <div>
                  <h4 className="font-medium mb-3">Recent Activity</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      <span>Auto-tagged to workstreams/app-redesign</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="h-3 w-3" />
                      <span>Synced from Google Drive</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      <span>File created</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}