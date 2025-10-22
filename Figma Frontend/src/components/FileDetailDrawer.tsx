import { X, Copy, AlertCircle, MapPin, Tag, Clock, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import type { FileItem } from "./types";

interface FileDetailDrawerProps {
  file: FileItem;
  onClose: () => void;
}

export function FileDetailDrawer({ file, onClose }: FileDetailDrawerProps) {
  return (
    <div className="w-[380px] border-l border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between bg-card">
        <h3 className="text-base">File Details</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 bg-background">
        <div className="p-5 space-y-6">
          {/* Overview */}
          <div>
            <h4 className="mb-4 text-xs text-muted-foreground uppercase tracking-wide">Overview</h4>
            <div className="space-y-2">
              <p className="break-words">{file.title}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{file.size}</span>
                <span>•</span>
                <span>{file.type.toUpperCase()}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Modified {file.modifiedDate}
              </p>
            </div>
          </div>

          <Separator />

          {/* Locations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4" />
              <h4>Locations</h4>
            </div>
            <div className="space-y-2">
              {file.locations.map((location, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-muted rounded text-sm flex items-start gap-2"
                >
                  <span className="text-xs text-muted-foreground mt-0.5">{idx + 1}.</span>
                  <span className="break-all">{location}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4" />
              <h4>Tags</h4>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Auto-generated</p>
                <div className="flex flex-wrap gap-1">
                  {file.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Custom tags</p>
                <Input placeholder="Add custom tag..." size={32} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Channel/Subgroup */}
          <div>
            <h4 className="mb-3">Classification</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Channel</span>
                <Badge variant="outline">{file.channel}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subgroup</span>
                <Badge variant="outline">{file.subgroup}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="outline">{file.source}</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Versions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              <h4>Versions</h4>
            </div>
            <div className="p-3 bg-muted rounded">
              <p className="text-sm">{file.versions} versions tracked</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hash: {file.contentHash}
              </p>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div>
            <h4 className="mb-3">Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy Hub Link
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <MapPin className="h-4 w-4 mr-2" />
                Refocus to Channel...
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <AlertCircle className="h-4 w-4 mr-2" />
                Report Incorrect Tag
              </Button>
            </div>
          </div>

          <Separator />

          {/* Audit Log */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4" />
              <h4>Audit Log</h4>
            </div>
            <div className="space-y-2">
              <div className="text-xs">
                <p className="text-muted-foreground">Indexed</p>
                <p className="mt-1">2025-10-05 10:23 AM</p>
              </div>
              <div className="text-xs">
                <p className="text-muted-foreground">Last Accessed</p>
                <p className="mt-1">2025-10-05 02:14 PM</p>
              </div>
              <div className="text-xs">
                <p className="text-muted-foreground">Auto-tagged</p>
                <p className="mt-1">via Blueprint v1</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
