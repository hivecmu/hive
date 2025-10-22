import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Separator } from "./ui/separator";
import { Hash, Users, ChevronDown, ChevronRight, Shield, Clock, Target, TrendingUp } from "lucide-react";

interface RecommendationViewProps {
  data: {
    channels: number;
    subgroups: number;
    archiveCandidates: number;
    channelBudgetUsed: number;
    channelBudgetMax: number;
  };
  onApprove: () => void;
  onBack: () => void;
}

const coreChannels = [
  { name: "announcements", description: "write: officers", icon: <Shield className="h-4 w-4" /> },
  { name: "general", description: "all", icon: <Hash className="h-4 w-4" /> },
  { name: "random", description: "all", icon: <Hash className="h-4 w-4" /> },
  { name: "help-desk", description: "officers triage", icon: <Hash className="h-4 w-4" /> }
];

const workstreams = [
  { name: "workstreams/app-redesign", description: "Mobile app redesign project" },
  { name: "workstreams/website", description: "Company website overhaul" },
  { name: "workstreams/outreach", description: "Community outreach initiatives" }
];

const subgroups = [
  { 
    name: "Design Committee", 
    members: 12,
    channels: ["committees/design", "design-critique"]
  },
  { 
    name: "Development Committee", 
    members: 15,
    channels: ["committees/development", "dev-standup"]
  },
  { 
    name: "Marketing Committee", 
    members: 9,
    channels: ["committees/marketing"]
  }
];

const rationales = [
  {
    icon: <Shield className="h-5 w-5 text-chart-1" />,
    title: "Announcements is write-limited to officers to reduce noise",
    description: "Based on your moderation capacity and community size"
  },
  {
    icon: <Target className="h-5 w-5 text-chart-2" />,
    title: "Workstreams created because you reported ≥3 concurrent initiatives", 
    description: "Projects activity selected in core activities"
  },
  {
    icon: <Users className="h-5 w-5 text-chart-4" />,
    title: "Committees exceed size threshold; subgroups improve focus",
    description: "Community size 25-100 with specialized roles"
  },
  {
    icon: <Clock className="h-5 w-5 text-chart-3" />,
    title: "2 channels inactive >45 days are marked for archival",
    description: "Optimizing channel budget utilization"
  },
  {
    icon: <TrendingUp className="h-5 w-5 text-chart-5" />,
    title: "Naming rules promote consistency and discoverability",
    description: "Following &lt;org&gt;-&lt;topic&gt;-&lt;scope&gt; pattern"
  }
];

export function RecommendationView({ data, onApprove, onBack }: RecommendationViewProps) {
  const [showRationale, setShowRationale] = useState(true);

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${showRationale ? 'mr-[360px]' : ''}`}>
        {/* Header */}
        <div className="bg-card text-card-foreground border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl mb-1">Recommended Communication Blueprint</h1>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">v1 Draft</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Recompute</Button>
              <Button variant="outline" size="sm">Edit Rules</Button>
              <Button variant="outline" size="sm">Save Draft</Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="p-6 border-b border-border bg-background text-foreground">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-medium">{data.channels}</div>
                <div className="text-sm text-muted-foreground">Channels (proposed)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-medium">{data.subgroups}</div>
                <div className="text-sm text-muted-foreground">Subgroups</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-medium">{data.archiveCandidates}</div>
                <div className="text-sm text-muted-foreground">Archive candidates</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Channel budget used</span>
                    <span>{data.channelBudgetUsed}/{data.channelBudgetMax}</span>
                  </div>
                  <Progress value={(data.channelBudgetUsed / data.channelBudgetMax) * 100} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Blueprint Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Core Channels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Core Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {coreChannels.map((channel) => (
                  <div key={channel.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {channel.icon}
                      <span className="font-medium">#{channel.name}</span>
                    </div>
                    <Badge variant="outline">{channel.description}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Workstreams */}
            <Collapsible defaultOpen>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      <Hash className="h-5 w-5" />
                      Workstreams/
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    {workstreams.map((stream) => (
                      <div key={stream.name} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Hash className="h-4 w-4 mt-0.5" />
                          <div>
                            <div className="font-medium">{stream.name}</div>
                            <div className="text-sm text-muted-foreground">{stream.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Subgroups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Subgroups (Committees)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subgroups.map((group) => (
                  <div key={group.name} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{group.name}</h4>
                      <Badge variant="secondary">{group.members} members</Badge>
                    </div>
                    <div className="space-y-2">
                      {group.channels.map((channel) => (
                        <div key={channel} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          <span>{channel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Naming Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Naming Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  <div className="text-muted-foreground mb-2">Pattern:</div>
                  <div>&lt;org&gt;-&lt;topic&gt;-&lt;scope&gt;</div>
                  <div className="text-muted-foreground mt-3 mb-1">Example:</div>
                  <div className="text-chart-1">dt-design-critique</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="bg-card text-card-foreground border-t border-border p-6">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onApprove}>
                View Diff
              </Button>
              <Button onClick={onApprove} className="bg-accent-primary hover:bg-accent-primary-pressed">
                Approve & Create ChangeSet
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Rationale Panel */}
      {showRationale && (
        <div className="fixed right-0 top-0 w-[360px] h-full bg-card text-card-foreground border-l border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Rationale</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowRationale(false)}
              >
                ×
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
              <span className="text-sm text-muted-foreground">High confidence</span>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              {rationales.map((rationale, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {rationale.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{rationale.title}</div>
                    <div className="text-xs text-muted-foreground">{rationale.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              All recommendations are previews; nothing changes until you approve.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}