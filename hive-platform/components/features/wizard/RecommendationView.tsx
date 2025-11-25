import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Hash, Users, ChevronDown, ChevronRight, Shield, Clock, Target, TrendingUp } from "lucide-react";

interface Channel {
  name: string;
  description: string;
  type: 'core' | 'workstream' | 'committee';
  isPrivate: boolean;
  suggestedMembers?: string[];
}

interface Committee {
  name: string;
  description: string;
  purpose: string;
}

interface StructureProposal {
  channels: Channel[];
  committees: Committee[];
  rationale: string;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

interface RecommendationViewProps {
  proposal: StructureProposal;
  channelBudgetMax: number;
  onApprove: () => void;
  onBack: () => void;
  embedded?: boolean; // If true, optimize for modal display
}

export function RecommendationView({ proposal, channelBudgetMax, onApprove, onBack, embedded = false }: RecommendationViewProps) {
  const [showRationale, setShowRationale] = useState(false);

  // Group channels by type
  const coreChannels = proposal.channels.filter(ch => ch.type === 'core');
  const workstreamChannels = proposal.channels.filter(ch => ch.type === 'workstream');
  const committeeChannels = proposal.channels.filter(ch => ch.type === 'committee');

  // Parse rationale into individual points (split by newlines or periods)
  const rationalePoints = proposal.rationale
    .split(/\n+/)
    .filter(point => point.trim().length > 0)
    .map(point => point.trim());

  return (
    <div className={`flex ${embedded ? 'h-full' : 'h-screen'} overflow-hidden flex-col`}>
      {/* Header */}
      <div className={`bg-card text-card-foreground border-b border-border flex-shrink-0 ${embedded ? 'px-8 py-6' : 'p-6'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl mb-1">Recommended Communication Blueprint</h1>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">v1 Draft</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {!embedded && (
                <Button variant="outline" size="sm" onClick={() => setShowRationale(!showRationale)}>
                  {showRationale ? "Hide" : "Show"} Rationale
                </Button>
              )}
              <Button variant="outline" size="sm">Recompute</Button>
              <Button variant="outline" size="sm">Edit Rules</Button>
              <Button variant="outline" size="sm">Save Draft</Button>
            </div>
          </div>
        </div>

      {/* Summary Cards */}
      <div className={`border-b border-border bg-background text-foreground flex-shrink-0 ${embedded ? 'px-8 py-4' : 'p-6'}`}>
        <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-medium">{proposal.channels.length}</div>
                <div className="text-sm text-muted-foreground">Channels (proposed)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-medium">{proposal.committees.length}</div>
                <div className="text-sm text-muted-foreground">Committees</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-medium">{proposal.estimatedComplexity}</div>
                <div className="text-sm text-muted-foreground">Complexity</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Channel budget used</span>
                    <span>{proposal.channels.length}/{channelBudgetMax}</span>
                  </div>
                  <Progress value={(proposal.channels.length / channelBudgetMax) * 100} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Blueprint Content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`space-y-6 ${embedded ? 'px-8 py-6' : 'p-6'}`}>
            {/* Core Channels */}
            {coreChannels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />
                    Core Channels
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {coreChannels.map((channel) => (
                    <div key={channel.name} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-3 flex-1">
                        <Hash className="h-4 w-4 mt-1" />
                        <div className="flex-1">
                          <div className="font-medium">#{channel.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">{channel.description}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-2">
                        {channel.isPrivate && <Badge variant="outline">Private</Badge>}
                        {channel.suggestedMembers && channel.suggestedMembers.length > 0 && (
                          <Badge variant="secondary">{channel.suggestedMembers.join(', ')}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Workstreams */}
            {workstreamChannels.length > 0 && (
              <Collapsible defaultOpen>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4" />
                        <Hash className="h-5 w-5" />
                        Workstreams
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      {workstreamChannels.map((stream) => (
                        <div key={stream.name} className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-start gap-3 flex-1">
                            <Hash className="h-4 w-4 mt-1" />
                            <div className="flex-1">
                              <div className="font-medium">#{stream.name}</div>
                              <div className="text-sm text-muted-foreground mt-1">{stream.description}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0 ml-2">
                            {stream.isPrivate && <Badge variant="outline">Private</Badge>}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Committees (Subgroups) */}
            {proposal.committees.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Committees
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proposal.committees.map((committee) => {
                    // Find all committee channels for this committee
                    const relatedChannels = committeeChannels.filter(ch =>
                      ch.name.toLowerCase().includes(committee.name.toLowerCase().replace(/\s+/g, '-'))
                    );

                    return (
                      <div key={committee.name} className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium mb-1">{committee.name}</h4>
                            <p className="text-sm text-muted-foreground">{committee.description}</p>
                            <p className="text-xs text-muted-foreground mt-2 italic">{committee.purpose}</p>
                          </div>
                        </div>
                        {relatedChannels.length > 0 && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-border">
                            <div className="text-xs font-medium text-muted-foreground">Related Channels:</div>
                            {relatedChannels.map((channel) => (
                              <div key={channel.name} className="flex items-center gap-2 text-sm">
                                <Hash className="h-3 w-3 text-muted-foreground" />
                                <span>#{channel.name}</span>
                                {channel.isPrivate && <Badge variant="outline" className="text-xs">Private</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

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
        </div>

      {/* Footer */}
      <div className={`bg-card text-card-foreground border-t border-border flex-shrink-0 ${embedded ? 'px-8 py-6' : 'p-6'}`}>
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onApprove}>
              View Diff
            </Button>
            <Button onClick={onApprove} className="bg-accent hover:bg-accent-hover text-accent-foreground">
              Approve & Create ChangeSet
            </Button>
          </div>
        </div>
      </div>

      {/* Rationale Panel - Only show in non-embedded mode */}
      {!embedded && showRationale && (
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
              {rationalePoints.map((point, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-chart-2 mt-2"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm">{point}</div>
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