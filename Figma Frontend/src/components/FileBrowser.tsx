import { useState, useMemo } from "react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { 
  Search, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  FileCode, 
  Presentation,
  Info,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { mockFiles, mockChannels } from "./mockData";
import type { FileItem } from "./types";

interface FileBrowserProps {
  onFileSelect: (file: FileItem) => void;
  isBlueprintApproved: boolean;
}

export function FileBrowser({ onFileSelect, isBlueprintApproved }: FileBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const filteredFiles = useMemo(() => {
    return mockFiles.filter(file => {
      const matchesSearch = 
        file.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesSource = sourceFilter === "all" || file.source === sourceFilter;
      const matchesType = typeFilter === "all" || file.type === typeFilter;
      const matchesChannel = channelFilter === "all" || file.channel === channelFilter;

      return matchesSearch && matchesSource && matchesType && matchesChannel;
    });
  }, [searchQuery, sourceFilter, typeFilter, channelFilter]);

  const getFileIcon = (type: FileItem["type"]) => {
    switch (type) {
      case "doc":
        return <FileText className="h-12 w-12" />;
      case "sheet":
        return <FileSpreadsheet className="h-12 w-12" />;
      case "image":
        return <FileImage className="h-12 w-12" />;
      case "code":
        return <FileCode className="h-12 w-12" />;
      case "presentation":
        return <Presentation className="h-12 w-12" />;
      default:
        return <FileText className="h-12 w-12" />;
    }
  };

  const getSourceColor = (source: FileItem["source"]) => {
    const colors = {
      drive: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      dropbox: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      onedrive: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
      notion: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      github: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    };
    return colors[source];
  };

  return (
    <div className="flex h-full bg-background">
      {/* Left Filter Rail */}
      <div className="w-64 border-r border-border bg-card/50 p-4">
        <h3 className="mb-4 text-sm">Filter by Channel</h3>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2">
            <Button
              variant={channelFilter === "all" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setChannelFilter("all")}
            >
              All Channels
              <Badge variant="outline" className="ml-auto">
                {mockFiles.length}
              </Badge>
            </Button>
            
            <Accordion type="single" collapsible className="w-full">
              {mockChannels.map(channel => (
                <AccordionItem key={channel.id} value={channel.id}>
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center justify-between flex-1 pr-2">
                      <span className="text-sm">{channel.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {mockFiles.filter(f => f.channel === channel.name).length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-4 space-y-1">
                      {channel.subgroups.map(subgroup => (
                        <Button
                          key={subgroup.id}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => setChannelFilter(channel.name)}
                        >
                          {subgroup.name}
                          <Badge variant="outline" className="ml-auto text-xs">
                            {mockFiles.filter(f => f.subgroup === subgroup.name).length}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-6 space-y-4 bg-card/30">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search titles, text, tags"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/80"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="drive">Drive</SelectItem>
                <SelectItem value="dropbox">Dropbox</SelectItem>
                <SelectItem value="onedrive">OneDrive</SelectItem>
                <SelectItem value="notion">Notion</SelectItem>
                <SelectItem value="github">GitHub</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="doc">Docs</SelectItem>
                <SelectItem value="sheet">Sheets</SelectItem>
                <SelectItem value="presentation">Slides</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="pdf">PDFs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isBlueprintApproved && (
            <Alert className="bg-primary/10 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                We collapsed 12 duplicates by content hash.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* File Grid */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {filteredFiles.map(file => (
                <button
                  key={file.id}
                  onClick={() => onFileSelect(file)}
                  className="group text-left p-4 border border-border rounded-lg hover:border-primary/40 hover:bg-card/50 transition-all bg-card"
                >
                  {/* File Icon */}
                  <div className="mb-3 flex items-center justify-center h-24 rounded-md bg-muted/40 group-hover:bg-muted/60 transition-colors">
                    <div className="text-muted-foreground">
                      {getFileIcon(file.type)}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="space-y-2.5">
                    <div>
                      <h4 className="text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors leading-snug">
                        {file.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {file.modifiedDate}
                      </p>
                    </div>

                    {/* Source Badge */}
                    <div>
                      <Badge 
                        className={`${getSourceColor(file.source)} text-xs px-2 py-0.5 h-5`} 
                        variant="secondary"
                      >
                        {file.source}
                      </Badge>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {file.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 h-5">
                          {tag}
                        </Badge>
                      ))}
                      {file.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                          +{file.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {filteredFiles.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No files found matching your filters.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
