import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, Plus, Archive, Edit3, MoveRight, Download, Copy } from "lucide-react";

interface ProposedChannel {
  name: string;
  description: string;
  type: 'core' | 'workstream' | 'committee' | 'social';
  isPrivate: boolean;
}

interface ExistingChannel {
  id: string;
  name: string;
  description?: string;
  type: 'core' | 'workstream' | 'committee' | 'dm';
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface ChangeSetPreviewProps {
  proposedChannels: ProposedChannel[];
  existingChannels: ExistingChannel[];
  onApprove: () => void;
  onBack: () => void;
  embedded?: boolean; // If true, optimize for modal display
}

interface ChangeItem {
  name: string;
  rationale: string;
}

interface ChangeGroup {
  type: string;
  count: number;
  items: ChangeItem[];
}

function computeChanges(proposed: ProposedChannel[], existing: ExistingChannel[]): ChangeGroup[] {
  const changeGroups: ChangeGroup[] = [];

  // Create a set of existing channel names for quick lookup
  const existingNames = new Set(existing.map(ch => ch.name.toLowerCase()));

  // Compute "create" changes - channels in proposal but not in existing
  const createItems: ChangeItem[] = [];
  proposed.forEach(channel => {
    if (!existingNames.has(channel.name.toLowerCase())) {
      createItems.push({
        name: channel.name,
        rationale: `new ${channel.type} channel`
      });
    }
  });

  if (createItems.length > 0) {
    changeGroups.push({
      type: "create",
      count: createItems.length,
      items: createItems
    });
  }

  // Note: Archive, rename, and move operations would require additional logic
  // For now, we focus on create operations which is the primary use case

  return changeGroups;
}

const getChangeIcon = (type: string) => {
  switch (type) {
    case "create":
      return <Plus className="h-4 w-4 text-green-500" />;
    case "rename":
      return <Edit3 className="h-4 w-4 text-blue-500" />;
    case "archive":
      return <Archive className="h-4 w-4 text-orange-500" />;
    case "move":
      return <MoveRight className="h-4 w-4 text-purple-500" />;
    default:
      return <Hash className="h-4 w-4" />;
  }
};

const getChangeBadgeVariant = (type: string) => {
  switch (type) {
    case "create":
      return "default";
    case "rename":
      return "secondary";
    case "archive":
      return "destructive";
    case "move":
      return "outline";
    default:
      return "outline";
  }
};

export function ChangeSetPreview({ proposedChannels, existingChannels, onApprove, onBack, embedded = false }: ChangeSetPreviewProps) {
  const changes = computeChanges(proposedChannels, existingChannels);

  // Group proposed channels by type
  const coreChannels = proposedChannels.filter(ch => ch.type === 'core');
  const workstreamChannels = proposedChannels.filter(ch => ch.type === 'workstream');
  const committeeChannels = proposedChannels.filter(ch => ch.type === 'committee');
  const socialChannels = proposedChannels.filter(ch => ch.type === 'social');

  // Group existing channels by type (excluding DMs)
  const existingCoreChannels = existingChannels.filter(ch => ch.type === 'core');
  const existingWorkstreamChannels = existingChannels.filter(ch => ch.type === 'workstream');
  const existingCommitteeChannels = existingChannels.filter(ch => ch.type === 'committee');

  // Helper to check if a channel will be created
  const isNewChannel = (channelName: string) => {
    return !existingChannels.some(ch => ch.name.toLowerCase() === channelName.toLowerCase());
  };

  return (
    <div className={`flex flex-col ${embedded ? 'h-full' : 'h-screen'} overflow-hidden bg-background text-foreground`}>
      {/* Header */}
      <div className={`bg-card text-card-foreground border-b border-border flex-shrink-0 ${embedded ? 'px-8 py-6' : 'p-6'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-1">ChangeSet Preview</h1>
            <p className="text-muted-foreground">Review the changes that will be applied to your workspace</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Current */}
        <div className={`flex-1 bg-background text-foreground overflow-y-auto ${embedded ? 'px-8 py-6' : 'p-6'}`}>
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Current</h2>
            <p className="text-sm text-muted-foreground">Your existing workspace structure</p>
          </div>

          <div className="space-y-4">
            {/* Core Channels */}
            {existingCoreChannels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Core Channels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {existingCoreChannels.map((channel) => (
                    <div key={channel.id} className="flex items-center gap-2 p-2 text-sm">
                      <Hash className="h-4 w-4" />
                      <span>{channel.name}</span>
                      {channel.description && (
                        <span className="text-xs text-muted-foreground ml-2">{channel.description}</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Workstream Channels */}
            {existingWorkstreamChannels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workstreams</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {existingWorkstreamChannels.map((channel) => (
                    <div key={channel.id} className="flex items-center gap-2 p-2 text-sm">
                      <Hash className="h-4 w-4" />
                      <span>{channel.name}</span>
                      {channel.description && (
                        <span className="text-xs text-muted-foreground ml-2">{channel.description}</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Committee Channels */}
            {existingCommitteeChannels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Committees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {existingCommitteeChannels.map((channel) => (
                    <div key={channel.id} className="flex items-center gap-2 p-2 text-sm">
                      <Hash className="h-4 w-4" />
                      <span>{channel.name}</span>
                      {channel.description && (
                        <span className="text-xs text-muted-foreground ml-2">{channel.description}</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {existingChannels.length === 0 && (
              <Card>
                <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                  No existing channels
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column - Proposed */}
        <div className={`flex-1 border-l border-border bg-background text-foreground overflow-y-auto ${embedded ? 'px-8 py-6' : 'p-6'}`}>
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Proposed</h2>
            <p className="text-sm text-muted-foreground">New recommended structure</p>
          </div>

          <div className="space-y-4">
            {/* Core Channels */}
            {coreChannels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Core Channels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {coreChannels.map((channel) => {
                    const isNew = isNewChannel(channel.name);
                    return (
                      <div key={channel.name} className={`flex items-center gap-2 p-2 text-sm ${isNew ? 'bg-muted/50 rounded' : ''}`}>
                        <Hash className="h-4 w-4" />
                        <span>{channel.name}</span>
                        {channel.description && (
                          <span className="text-xs text-muted-foreground ml-2">{channel.description}</span>
                        )}
                        {isNew && <Badge variant="default" className="ml-auto text-xs">new</Badge>}
                        {channel.isPrivate && <Badge variant="outline" className="ml-auto text-xs">Private</Badge>}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Workstreams */}
            {workstreamChannels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workstreams</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workstreamChannels.map((channel) => {
                    const isNew = isNewChannel(channel.name);
                    return (
                      <div key={channel.name} className={`flex items-center gap-2 p-2 text-sm ${isNew ? 'bg-muted/50 rounded' : ''}`}>
                        <Hash className="h-4 w-4" />
                        <span>{channel.name}</span>
                        {channel.description && (
                          <span className="text-xs text-muted-foreground ml-2">{channel.description}</span>
                        )}
                        {isNew && <Badge variant="default" className="ml-auto text-xs">new</Badge>}
                        {channel.isPrivate && <Badge variant="outline" className="ml-auto text-xs">Private</Badge>}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Committees */}
            {committeeChannels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Committees</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {committeeChannels.map((channel) => {
                    const isNew = isNewChannel(channel.name);
                    return (
                      <div key={channel.name} className={`flex items-center gap-2 p-2 text-sm ${isNew ? 'bg-muted/50 rounded' : ''}`}>
                        <Hash className="h-4 w-4" />
                        <span>{channel.name}</span>
                        {channel.description && (
                          <span className="text-xs text-muted-foreground ml-2">{channel.description}</span>
                        )}
                        {isNew && <Badge variant="default" className="ml-auto text-xs">new</Badge>}
                        {channel.isPrivate && <Badge variant="outline" className="ml-auto text-xs">Private</Badge>}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Social Channels */}
            {socialChannels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Social Channels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {socialChannels.map((channel) => {
                    const isNew = isNewChannel(channel.name);
                    return (
                      <div key={channel.name} className={`flex items-center gap-2 p-2 text-sm ${isNew ? 'bg-muted/50 rounded' : ''}`}>
                        <Hash className="h-4 w-4" />
                        <span>{channel.name}</span>
                        {channel.description && (
                          <span className="text-xs text-muted-foreground ml-2">{channel.description}</span>
                        )}
                        {isNew && <Badge variant="default" className="ml-auto text-xs">new</Badge>}
                        {channel.isPrivate && <Badge variant="outline" className="ml-auto text-xs">Private</Badge>}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Diff Summary */}
      <div className={`bg-muted/50 text-foreground border-t border-border flex-shrink-0 ${embedded ? 'px-8 py-6' : 'p-6'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Change Summary</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Checklist
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Runbook
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {changes.map((changeGroup) => (
            <div key={changeGroup.type} className="text-center">
              <div className="text-2xl font-medium mb-1">
                {changeGroup.count}
              </div>
              <div className="text-sm text-muted-foreground capitalize flex items-center justify-center gap-1">
                {getChangeIcon(changeGroup.type)}
                {changeGroup.type}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onApprove} className="bg-accent hover:bg-accent-hover text-accent-foreground">
            Approve Changes
          </Button>
        </div>
      </div>
    </div>
  );
}