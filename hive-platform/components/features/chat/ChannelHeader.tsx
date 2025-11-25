"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Hash, MessageCircle, Settings } from "lucide-react";
import type { Channel } from "@/lib/hooks/useChannels";
import { WorkspaceSettings } from "@/components/features/workspace/WorkspaceSettings";
import { useOrganization } from "@/contexts/OrganizationContext";
import { motion } from "framer-motion";

interface ChannelHeaderProps {
  channel?: Channel | null;
}

export function ChannelHeader({ channel }: ChannelHeaderProps) {
  const { currentOrg } = useOrganization();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!channel) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
            <Hash className="h-4 w-4 text-muted-foreground/50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-muted-foreground font-medium">Select a channel</h1>
            <p className="text-sm text-muted-foreground/70 truncate hidden sm:block">
              Choose a channel from the sidebar to start messaging
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const isDM = channel.type === 'dm';
  const Icon = isDM ? MessageCircle : Hash;
  const typeLabel = channel.type === 'workstream' ? 'Workstream' :
                    channel.type === 'committee' ? 'Committee' :
                    channel.type === 'dm' ? 'Direct Message' : 'Channel';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-background/80 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center justify-between sticky top-0 z-10"
      >
        <div className="flex items-center gap-3 min-w-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDM ? 'bg-blue-500/10' : 'bg-primary/10'
            }`}
          >
            <Icon className={`h-4 w-4 ${isDM ? 'text-blue-500' : 'text-primary'}`} />
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-foreground font-semibold truncate">{channel.name}</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium uppercase">
                {typeLabel}
              </span>
              {channel.description && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="truncate hidden sm:block max-w-[300px]">
                    {channel.description}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {currentOrg && (
        <WorkspaceSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          workspaceId={currentOrg.id}
        />
      )}
    </>
  );
}
