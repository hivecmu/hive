"use client";

import { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Check, UserPlus, LogOut } from "lucide-react";
import { JoinWorkspace } from "../workspace/JoinWorkspace";
import { api } from "@/lib/api/client";

interface OrganizationSwitcherProps {
  onCreateOrg?: () => void;
}

export function OrganizationSwitcher({ onCreateOrg }: OrganizationSwitcherProps) {
  const { currentOrg, organizations, switchOrganization, isLoading } = useOrganization();
  const [open, setOpen] = useState(false);
  const [joinWorkspaceOpen, setJoinWorkspaceOpen] = useState(false);

  if (isLoading || !currentOrg) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-8 h-8 bg-muted rounded-md"></div>
        <div className="w-32 h-4 bg-muted rounded"></div>
      </div>
    );
  }

  const handleSwitchOrg = (orgId: string) => {
    if (orgId !== currentOrg.id) {
      switchOrganization(orgId);
    }
    setOpen(false);
  };

  const handleCreateOrg = () => {
    setOpen(false);
    if (onCreateOrg) {
      onCreateOrg();
    }
  };

  const handleJoinWorkspace = () => {
    setOpen(false);
    setJoinWorkspaceOpen(true);
  };

  const handleSignOut = () => {
    setOpen(false);
    api.auth.logout();
  };

  // Count unread messages across current org
  const getTotalUnread = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return 0;

    let total = 0;
    org.workspace.coreChannels.forEach(c => total += c.unread);
    org.workspace.workstreams.forEach(w => total += w.unread);
    org.workspace.committees.forEach(committee => {
      committee.channels.forEach(c => total += c.unread);
    });
    org.workspace.directMessages.forEach(dm => total += dm.unread);
    return total;
  };

  const currentUnread = getTotalUnread(currentOrg.id);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <div className="flex items-center gap-3 w-full px-4 py-3 rounded-md hover:bg-sidebar-accent transition-colors">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: currentOrg.color + '30', border: `2px solid ${currentOrg.color}` }}
            >
              {currentOrg.emoji}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <div className="font-medium text-sidebar-foreground truncate">
                {currentOrg.name}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{currentOrg.memberCount} members</span>
                {currentUnread > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-destructive font-medium">{currentUnread} unread</span>
                  </>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">
          Switch Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => {
          const unread = getTotalUnread(org.id);
          const isActive = org.id === currentOrg.id;

          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitchOrg(org.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: org.color + '30', border: `1.5px solid ${org.color}` }}
                >
                  {org.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{org.name}</span>
                    {isActive && (
                      <Check className="h-4 w-4 text-chart-1 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span>{org.memberCount} members</span>
                    {unread > 0 && (
                      <>
                        <span>•</span>
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                          {unread}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleJoinWorkspace}
          className="cursor-pointer"
        >
          <UserPlus className="h-4 w-4 mr-2 text-primary" />
          <span className="text-primary font-medium">Join Workspace</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleCreateOrg}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2 text-primary" />
          <span className="text-primary font-medium">Create Workspace</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
      <JoinWorkspace open={joinWorkspaceOpen} onOpenChange={setJoinWorkspaceOpen} />
    </DropdownMenu>
  );
}
