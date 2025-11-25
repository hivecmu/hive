"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Hash, Plus, MessageCircle, X, FolderOpen, Lock, ChevronDown, ChevronRight, Users, Sparkles } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { OrganizationSwitcher } from "@/components/features/org/OrganizationSwitcher";
import { useChannels } from "@/lib/hooks/useChannels";
import { CreateChannelModal } from "./CreateChannelModal";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Animated channel item component
interface ChannelItemProps {
  channel: { id: string; name: string; type: string };
  isSelected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

function ChannelItem({ channel, isSelected, onClick, icon }: ChannelItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      whileHover={{ x: 2 }}
      onClick={onClick}
      className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm cursor-pointer transition-all duration-150 ${
        isSelected
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      <span className={`flex-shrink-0 transition-colors duration-150 ${
        isSelected ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
      }`}>
        {icon || <Hash className="h-4 w-4" />}
      </span>
      <span className="flex-1 truncate font-medium">{channel.name}</span>
      {isSelected && (
        <motion.div
          layoutId="channel-indicator"
          className="w-1 h-4 rounded-full bg-sidebar-primary-foreground/30"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.div>
  );
}

// Section header component
interface SectionHeaderProps {
  title: string;
  onAdd?: () => void;
  showAdd?: boolean;
}

function SectionHeader({ title, onAdd, showAdd = false }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {showAdd && (
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onAdd}
          title="Create channel"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

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
  const [createChannelOpen, setCreateChannelOpen] = useState(false);

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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border overflow-hidden"
        >
          <div className="p-4 space-y-3">
            <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-6 bg-muted/30 rounded animate-pulse w-2/3" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-muted/20 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </motion.div>
      </TooltipProvider>
    );
  }

  const workspace = currentOrg.workspace;
  const blueprintApproved = workspace.blueprintApproved;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border overflow-hidden"
      >
        {/* Organization Switcher Header */}
        <div className="border-b border-sidebar-border/50 bg-sidebar/80 backdrop-blur-sm">
          <div className="flex items-center justify-between pr-3">
            <OrganizationSwitcher onCreateOrg={onCreateOrg} />
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 lg:hidden text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-5">
            {/* Core Channels Section */}
            <div className="group">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {blueprintApproved ? "Channels" : "Channels"}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-all"
                  onClick={() => setCreateChannelOpen(true)}
                  title="Create channel"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-0.5">
                {isLoadingChannels ? (
                  <div className="space-y-1.5 px-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-7 bg-muted/30 rounded animate-pulse" />
                    ))}
                  </div>
                ) : categorizedChannels.core.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-2.5 py-3 text-sm text-muted-foreground text-center rounded-md border border-dashed border-sidebar-border"
                  >
                    No channels yet
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {categorizedChannels.core.map((channel, index) => (
                      <motion.div
                        key={channel.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <ChannelItem
                          channel={channel}
                          isSelected={selectedChannelId === channel.id && currentView === 'chat'}
                          onClick={() => onChannelSelect?.(channel.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Workstreams Section (only after approval) */}
            {blueprintApproved && categorizedChannels.workstreams.length > 0 && (
              <Collapsible defaultOpen className="group">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-sidebar-foreground transition-colors">
                  <span className="flex items-center gap-1.5">
                    <ChevronDown className="h-3 w-3 transition-transform group-data-[state=closed]:-rotate-90" />
                    Workstreams
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5">
                  <AnimatePresence>
                    {categorizedChannels.workstreams.map((channel, index) => (
                      <motion.div
                        key={channel.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <ChannelItem
                          channel={channel}
                          isSelected={selectedChannelId === channel.id && currentView === 'chat'}
                          onClick={() => onChannelSelect?.(channel.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Committees Section (only after approval) */}
            {blueprintApproved && categorizedChannels.committees.length > 0 && (
              <Collapsible defaultOpen className="group">
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-sidebar-foreground transition-colors">
                  <span className="flex items-center gap-1.5">
                    <ChevronDown className="h-3 w-3 transition-transform group-data-[state=closed]:-rotate-90" />
                    Committees
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5">
                  <AnimatePresence>
                    {categorizedChannels.committees.map((channel, index) => (
                      <motion.div
                        key={channel.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <ChannelItem
                          channel={channel}
                          isSelected={selectedChannelId === channel.id && currentView === 'chat'}
                          onClick={() => onChannelSelect?.(channel.id)}
                          icon={<Users className="h-4 w-4" />}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Apps Section */}
            <div className="group">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apps</h3>
              </div>
              <div className="space-y-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      whileHover={blueprintApproved ? { x: 2 } : {}}
                      onClick={blueprintApproved ? onOpenHub : undefined}
                      className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all duration-150 ${
                        !blueprintApproved
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : currentView === 'hub'
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm cursor-pointer"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
                      }`}
                    >
                      <span className={`flex-shrink-0 transition-colors duration-150 ${
                        !blueprintApproved
                          ? "text-muted-foreground/50"
                          : currentView === 'hub'
                            ? "text-sidebar-primary-foreground"
                            : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                      }`}>
                        {!blueprintApproved ? <Lock className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                      </span>
                      <span className="flex-1 font-medium">Hub</span>
                      {!blueprintApproved && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Locked</span>
                      )}
                    </motion.div>
                  </TooltipTrigger>
                  {!blueprintApproved && (
                    <TooltipContent side="right" className="max-w-[200px]">
                      <p className="text-xs">Hub is locked until a communication blueprint is approved. Run the AI Structure Wizard to continue.</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* AI Structure Wizard */}
                <motion.div
                  whileHover={{ x: 2 }}
                  onClick={onOpenWizard}
                  className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all duration-150 ${
                    currentView === 'wizard' || currentView === 'recommendation' || currentView === 'changeset'
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm cursor-pointer"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
                  }`}
                >
                  <span className={`flex-shrink-0 transition-colors duration-150 ${
                    currentView === 'wizard' || currentView === 'recommendation' || currentView === 'changeset'
                      ? "text-sidebar-primary-foreground"
                      : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                  }`}>
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="flex-1 font-medium">AI Wizard</span>
                </motion.div>
              </div>
            </div>

            {/* Direct Messages Section */}
            {categorizedChannels.dms.length > 0 && (
              <div className="group">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direct messages</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-0.5">
                  <AnimatePresence>
                    {categorizedChannels.dms.map((channel, index) => (
                      <motion.div
                        key={channel.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <ChannelItem
                          channel={channel}
                          isSelected={selectedChannelId === channel.id && currentView === 'chat'}
                          onClick={() => onChannelSelect?.(channel.id)}
                          icon={<MessageCircle className="h-4 w-4" />}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Run AI Structure button */}
        {!blueprintApproved && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-3 border-t border-sidebar-border/50 bg-gradient-to-t from-sidebar to-transparent"
          >
            <Button
              onClick={onOpenWizard}
              size="sm"
              className="w-full bg-primary hover:bg-amber-700 dark:hover:bg-amber-600 text-primary-foreground font-medium shadow-md hover:shadow-lg transition-all duration-200 gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Run AI Structure
            </Button>
          </motion.div>
        )}
      </motion.div>
      
      {/* Create Channel Modal */}
      {currentOrg && (
        <CreateChannelModal
          open={createChannelOpen}
          onOpenChange={setCreateChannelOpen}
          workspaceId={currentOrg.id}
        />
      )}
    </TooltipProvider>
  );
}