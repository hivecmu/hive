import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Hash, Plus, MessageCircle, X, FolderOpen, Lock, ChevronDown, ChevronRight, Users } from "lucide-react";

const baseChannels = [
  { id: 1, name: "general", unread: 0 },
  { id: 2, name: "announcements", unread: 2 },
  { id: 3, name: "random", unread: 0 },
  { id: 4, name: "development", unread: 5 },
  { id: 5, name: "design", unread: 1 },
  { id: 6, name: "marketing", unread: 0 },
];

const approvedChannels = [
  { id: 1, name: "announcements", unread: 2 },
  { id: 2, name: "general", unread: 0 },
  { id: 3, name: "random", unread: 0 },
];

const workstreams = [
  { id: 4, name: "workstreams/app-redesign", unread: 3 },
  { id: 5, name: "workstreams/website", unread: 1 },
  { id: 6, name: "workstreams/outreach", unread: 0 },
];

const committees = [
  { 
    id: 1, 
    name: "Design Committee", 
    members: 12,
    channels: [
      { id: 7, name: "committees/design", unread: 2 },
      { id: 8, name: "design-critique", unread: 1 },
    ]
  },
  { 
    id: 2, 
    name: "Development Committee", 
    members: 15,
    channels: [
      { id: 9, name: "committees/development", unread: 4 },
      { id: 10, name: "dev-standup", unread: 0 },
    ]
  },
  { 
    id: 3, 
    name: "Marketing Committee", 
    members: 9,
    channels: [
      { id: 11, name: "committees/marketing", unread: 1 },
    ]
  },
];

const directMessages = [
  { id: 1, name: "Emma Rodriguez", avatar: "ER", online: true, unread: 0 },
  { id: 2, name: "David Kim", avatar: "DK", online: true, unread: 2 },
  { id: 3, name: "Maria Santos", avatar: "MS", online: false, unread: 0 },
  { id: 4, name: "Alex Thompson", avatar: "AT", online: true, unread: 1 },
  { id: 5, name: "Jordan Lee", avatar: "JL", online: false, unread: 0 },
];

interface SidebarProps {
  onClose?: () => void;
  onOpenHub?: () => void;
  onOpenWizard?: () => void;
  blueprintApproved?: boolean;
  currentView?: string;
}

export function Sidebar({ onClose, onOpenHub, onOpenWizard, blueprintApproved, currentView }: SidebarProps) {
  const channelsToShow = blueprintApproved ? approvedChannels : baseChannels;

  return (
    <TooltipProvider>
      <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border">
        {/* Workspace Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sidebar-foreground mb-1">Design Team Hub</h2>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Emma Rodriguez</span>
              </div>
            </div>
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
                {channelsToShow.map((channel) => (
                  <div
                    key={channel.id}
                    className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
                      channel.name === "general" && currentView === 'chat'
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Hash className="h-4 w-4" />
                    <span className="flex-1">{channel.name}</span>
                    {channel.unread > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {channel.unread}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Workstreams Section (only after approval) */}
            {blueprintApproved && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 text-muted-foreground text-sm uppercase tracking-wide hover:text-sidebar-foreground">
                  <span>Workstreams</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {workstreams.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                      <Hash className="h-4 w-4" />
                      <span className="flex-1">{channel.name}</span>
                      {channel.unread > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {channel.unread}
                        </span>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Committees Section (only after approval) */}
            {blueprintApproved && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 text-muted-foreground text-sm uppercase tracking-wide hover:text-sidebar-foreground">
                  <span>Committees</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  {committees.map((committee) => (
                    <Collapsible key={committee.id}>
                      <CollapsibleTrigger className="flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full">
                        <ChevronRight className="h-3 w-3" />
                        <Users className="h-4 w-4" />
                        <span className="flex-1 text-left">{committee.name}</span>
                        <span className="text-xs text-muted-foreground">({committee.members})</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-5 space-y-1 mt-1">
                        {committee.channels.map((channel) => (
                          <div
                            key={channel.id}
                            className="flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                          >
                            <Hash className="h-4 w-4" />
                            <span className="flex-1">{channel.name}</span>
                            {channel.unread > 0 && (
                              <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {channel.unread}
                              </span>
                            )}
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
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
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-muted-foreground text-sm uppercase tracking-wide">Direct messages</h3>
                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {directMessages.map((dm) => (
                  <div
                    key={dm.id}
                    className="flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {dm.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {dm.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border border-sidebar rounded-full"></div>
                      )}
                    </div>
                    <span className="flex-1">{dm.name}</span>
                    {dm.unread > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {dm.unread}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer with Run AI Structure button */}
        {!blueprintApproved && (
          <div className="p-4 border-t border-sidebar-border">
            <Button
              onClick={onOpenWizard}
              size="sm"
              className="w-full bg-accent-primary hover:bg-accent-primary-pressed text-sidebar-primary-foreground"
            >
              Run AI Structure
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}