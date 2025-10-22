import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Hash, Plus, Archive, Edit3, MoveRight, Download, Copy } from "lucide-react";

interface ChangeSetPreviewProps {
  onApprove: () => void;
  onBack: () => void;
}

const changes = [
  {
    type: "create",
    count: 5,
    items: [
      { name: "workstreams/app-redesign", rationale: "new project structure" },
      { name: "workstreams/website", rationale: "new project structure" },
      { name: "workstreams/outreach", rationale: "new project structure" },
      { name: "committees/design", rationale: "subgroup organization" },
      { name: "committees/development", rationale: "subgroup organization" },
    ]
  },
  {
    type: "rename",
    count: 1,
    items: [
      { name: "marketing → committees/marketing", rationale: "naming rule" }
    ]
  },
  {
    type: "archive",
    count: 2,
    items: [
      { name: "old-projects", rationale: "inactive 45d" },
      { name: "temp-channel", rationale: "inactive 45d" }
    ]
  },
  {
    type: "move",
    count: 3,
    items: [
      { name: "design-critique → committees/design", rationale: "subgroup organization" },
      { name: "dev-standup → committees/development", rationale: "subgroup organization" },
      { name: "client-feedback → workstreams/app-redesign", rationale: "project alignment" }
    ]
  }
];

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

export function ChangeSetPreview({ onApprove, onBack }: ChangeSetPreviewProps) {
  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="bg-card text-card-foreground border-b border-border p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl mb-1">ChangeSet Preview</h1>
            <p className="text-muted-foreground">Review the changes that will be applied to your workspace</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Left Column - Current */}
        <div className="flex-1 p-6 bg-background text-foreground">
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Current</h2>
            <p className="text-sm text-muted-foreground">Your existing workspace structure</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 p-2 text-sm">
                <Hash className="h-4 w-4" />
                <span>general</span>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm">
                <Hash className="h-4 w-4" />
                <span>announcements</span>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm">
                <Hash className="h-4 w-4" />
                <span>random</span>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm">
                <Hash className="h-4 w-4" />
                <span>development</span>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm">
                <Hash className="h-4 w-4" />
                <span>design</span>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm opacity-50">
                <Hash className="h-4 w-4" />
                <span>marketing</span>
                <Badge variant="outline" className="ml-auto text-xs">rename</Badge>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm opacity-50">
                <Hash className="h-4 w-4" />
                <span>old-projects</span>
                <Badge variant="destructive" className="ml-auto text-xs">archive</Badge>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm opacity-50">
                <Hash className="h-4 w-4" />
                <span>temp-channel</span>
                <Badge variant="destructive" className="ml-auto text-xs">archive</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Proposed */}
        <div className="flex-1 p-6 border-l border-border bg-background text-foreground">
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Proposed</h2>
            <p className="text-sm text-muted-foreground">New recommended structure</p>
          </div>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-4">
              {/* Core Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Core Channels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 p-2 text-sm">
                    <Hash className="h-4 w-4" />
                    <span>announcements</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 text-sm">
                    <Hash className="h-4 w-4" />
                    <span>general</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 text-sm">
                    <Hash className="h-4 w-4" />
                    <span>random</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 text-sm bg-muted/50 rounded">
                    <Hash className="h-4 w-4" />
                    <span>help-desk</span>
                    <Badge variant="default" className="ml-auto text-xs">new</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Workstreams */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workstreams/</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 p-2 text-sm bg-muted/50 rounded">
                    <Hash className="h-4 w-4" />
                    <span>workstreams/app-redesign</span>
                    <Badge variant="default" className="ml-auto text-xs">new</Badge>
                  </div>
                  <div className="flex items-center gap-2 p-2 text-sm bg-muted/50 rounded">
                    <Hash className="h-4 w-4" />
                    <span>workstreams/website</span>
                    <Badge variant="default" className="ml-auto text-xs">new</Badge>
                  </div>
                  <div className="flex items-center gap-2 p-2 text-sm bg-muted/50 rounded">
                    <Hash className="h-4 w-4" />
                    <span>workstreams/outreach</span>
                    <Badge variant="default" className="ml-auto text-xs">new</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Committees */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Committees/</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Design Committee</div>
                    <div className="ml-4 space-y-1">
                      <div className="flex items-center gap-2 p-2 text-sm bg-muted/50 rounded">
                        <Hash className="h-4 w-4" />
                        <span>committees/design</span>
                        <Badge variant="default" className="ml-auto text-xs">new</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Development Committee</div>
                    <div className="ml-4 space-y-1">
                      <div className="flex items-center gap-2 p-2 text-sm bg-muted/50 rounded">
                        <Hash className="h-4 w-4" />
                        <span>committees/development</span>
                        <Badge variant="default" className="ml-auto text-xs">new</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Marketing Committee</div>
                    <div className="ml-4 space-y-1">
                      <div className="flex items-center gap-2 p-2 text-sm bg-muted/50 rounded">
                        <Hash className="h-4 w-4" />
                        <span>committees/marketing</span>
                        <Badge variant="secondary" className="ml-auto text-xs">renamed</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Diff Summary */}
      <div className="bg-muted/50 text-foreground border-t border-border p-6">
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
          <Button onClick={onApprove} className="bg-accent-primary hover:bg-accent-primary-pressed">
            Approve Changes
          </Button>
        </div>
      </div>
    </div>
  );
}