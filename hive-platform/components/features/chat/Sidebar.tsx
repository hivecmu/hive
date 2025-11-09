"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Hash, Plus, MessageCircle, X, FolderOpen, Lock, ChevronDown, ChevronRight, Users } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { OrganizationSwitcher } from "@/components/features/org/OrganizationSwitcher";
import { useChannels } from "@/lib/hooks/useChannels";
import { useMemo } from "react";

interface SidebarProps {
  onClose?: () => void;
  onOpenHub?: () => void;
  onOpenWizard?: () => void;
  onCreateOrg?: () => void;
  currentView?: string;
  selectedChannelId?: string | null;
  onChannelSelect?: (channelId: string) => void;
}

export function Sidebar({ onClose, onOpenHub, onOpenWizard, onCreateOrg, currentView, selectedChannelId, onChannelSelect }: SidebarProps) {
  const { currentOrg } = useOrganization();
  const { data: channels = [], isLoading: isLoadingChannels } = useChannels(currentOrg?.id || null);

  // Categorize channels by type
  const categorizedChannels = useMemo(() => {
    const core = channels.filter(ch => ch.type === 'core');
    const workstreams = channels.filter(ch => ch.type === 'workstream');
    const committees = channels.filter(ch => ch.type === 'committee');
    const dms = channels.filter(ch => ch.type === 'dm');

    return { core, workstreams, committees, dms };
  }, [channels]);

  if (!currentOrg) {
    return (
      <TooltipProvider>
        <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border">
          <div className="p-4 animate-pulse">
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  const workspace = currentOrg.workspace;
  const blueprintApproved = workspace.blueprintApproved;

  return (
    <TooltipProvider>
      <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border">
        {/* Organization Switcher Header */}
        <div className="border-b border-sidebar-border">
          <div className="flex items-center justify-between pr-4">
            <OrganizationSwitcher onCreateOrg={onCreateOrg} />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 lg:hidden text-muted-foreground hover:text-sidebar-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Core Channels Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground text-sm uppercase tracking-wide">
                  {blueprintApproved ? "Core Channels" : "Channels"}
                </h3>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {isLoadingChannels ? (
                  <div className="px-2 py-1 text-sm text-muted-foreground">Loading...</div>
                ) : categorizedChannels.core.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-muted-foreground">No channels yet</div>
                ) : (
                  categorizedChannels.core.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => onChannelSelect?.(channel.id)}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
                        selectedChannelId === channel.id && currentView === 'chat'
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Hash className="h-4 w-4" />
                      <span className="flex-1">{channel.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Workstreams Section (only after approval) */}
            {blueprintApproved && categorizedChannels.workstreams.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 text-muted-foreground text-sm uppercase tracking-wide hover:text-sidebar-foreground">
                  <span>Workstreams</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {categorizedChannels.workstreams.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => onChannelSelect?.(channel.id)}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
                        selectedChannelId === channel.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Hash className="h-4 w-4" />
                      <span className="flex-1">{channel.name}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Committees Section (only after approval) */}
            {blueprintApproved && categorizedChannels.committees.length > 0 && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 text-muted-foreground text-sm uppercase tracking-wide hover:text-sidebar-foreground">
                  <span>Committees</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {categorizedChannels.committees.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => onChannelSelect?.(channel.id)}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
                        selectedChannelId === channel.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Hash className="h-4 w-4" />
                      <span className="flex-1">{channel.name}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Apps Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground text-sm uppercase tracking-wide">Apps</h3>
              </div>
              <div className="space-y-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onClick={onOpenHub}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
                        !blueprintApproved 
                          ? "text-muted-foreground opacity-50" 
                          : currentView === 'hub'
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      {!blueprintApproved ? <Lock className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                      <span className="flex-1">Hub</span>
                    </div>
                  </TooltipTrigger>
                  {!blueprintApproved && (
                    <TooltipContent side="right">
                      <p>Hub is locked until a communication blueprint is approved. Run the AI Structure Wizard to continue.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </div>

            {/* Direct Messages Section */}
            {categorizedChannels.dms.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-muted-foreground text-sm uppercase tracking-wide">Direct messages</h3>
                  <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {categorizedChannels.dms.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => onChannelSelect?.(channel.id)}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
                        selectedChannelId === channel.id
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="flex-1">{channel.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Run AI Structure button */}
        {!blueprintApproved && (
          <div className="p-4 border-t border-sidebar-border">
            <Button
              onClick={onOpenWizard}
              size="sm"
              className="w-full bg-accent hover:bg-accent-hover text-accent-foreground font-medium"
            >
              Run AI Structure
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}