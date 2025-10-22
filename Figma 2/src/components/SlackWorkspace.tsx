import { Hash, Lock, ChevronDown, Plus, MessageSquare, Sparkles, FolderOpen } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface SlackWorkspaceProps {
  onOpenWizard: () => void;
  hubUnlocked: boolean;
  reorganized?: boolean;
}

export function SlackWorkspace({ onOpenWizard, hubUnlocked, reorganized = false }: SlackWorkspaceProps) {
  return (
    <div className="flex h-full bg-[#1a1d21]">
      {/* Sidebar */}
      <div className="w-64 bg-[#19171d] border-r border-[#2e2d33] flex flex-col">
        {/* Workspace Header */}
        <div className="p-4 border-b border-[#2e2d33]">
          <button className="flex items-center justify-between w-full text-white hover:bg-[#2e2d33] rounded px-2 py-1.5">
            <span className="font-semibold">My Community</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Channels */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {!reorganized ? (
              <>
                {/* Original Structure */}
                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-1 text-[#ffffffb3] hover:text-white cursor-pointer">
                    <span className="text-sm">Channels</span>
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <ChannelItem name="general" active />
                    <ChannelItem name="announcements" />
                    <ChannelItem name="random" />
                    <ChannelItem name="introductions" />
                    <ChannelItem name="help-desk" />
                    <ChannelItem name="events" />
                    <ChannelItem name="resources" />
                    <ChannelItem name="feedback" />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-1 text-[#ffffffb3] hover:text-white cursor-pointer">
                    <span className="text-sm">Direct Messages</span>
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <DMItem name="Alice" />
                    <DMItem name="Bob" />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Reorganized Structure */}
                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-1 text-[#ffffffb3] hover:text-white cursor-pointer">
                    <span className="text-sm">Core Channels</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <ChannelItem name="announcements" badge="📢" />
                    <ChannelItem name="general" active />
                    <ChannelItem name="introductions" />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-1 text-[#ffffffb3] hover:text-white cursor-pointer">
                    <span className="text-sm">Workstreams</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <ChannelItem name="ws-product" />
                    <ChannelItem name="ws-marketing" />
                    <ChannelItem name="ws-operations" />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-1 text-[#ffffffb3] hover:text-white cursor-pointer">
                    <span className="text-sm">Committees</span>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <ChannelItem name="committee-governance" subgroup />
                    <ChannelItem name="committee-events" subgroup />
                    <ChannelItem name="committee-outreach" subgroup />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between px-2 py-1 text-[#ffffffb3] hover:text-white cursor-pointer">
                    <span className="text-sm">Direct Messages</span>
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <DMItem name="Alice" />
                    <DMItem name="Bob" />
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Wizard Button */}
        <div className="p-3 border-t border-[#2e2d33] space-y-2">
          <Button
            onClick={onOpenWizard}
            className="w-full justify-start gap-2 bg-[#611f69] hover:bg-[#7a2f7f] text-white"
          >
            <Sparkles className="w-4 h-4" />
            Run AI Structure Wizard
          </Button>
          
          <Button
            disabled={!hubUnlocked}
            className="w-full justify-start gap-2 bg-[#2e2d33] hover:bg-[#3e3d43] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen className="w-4 h-4" />
            Hub
            {!hubUnlocked && <Lock className="w-3 h-3 ml-auto" />}
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-14 border-b border-[#2e2d33] flex items-center px-4 bg-[#1a1d21]">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-[#ffffffb3]" />
            <span className="text-white font-semibold">general</span>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-4xl">
            <MessageItem 
              user="Alice"
              time="10:30 AM"
              message="Hey everyone! Welcome to the community."
            />
            <MessageItem 
              user="Bob"
              time="10:35 AM"
              message="Thanks! Excited to be here."
            />
            <MessageItem 
              user="Charlie"
              time="11:00 AM"
              message="Looking forward to collaborating with you all!"
            />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-[#2e2d33]">
          <div className="bg-[#2e2d33] rounded-lg px-4 py-3 text-[#ffffffb3]">
            Message #general
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelItem({ name, active = false, badge, subgroup = false }: { name: string; active?: boolean; badge?: string; subgroup?: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer ${
        active ? 'bg-[#1164a3] text-white' : 'text-[#ffffffb3] hover:bg-[#2e2d33] hover:text-white'
      }`}
    >
      {subgroup ? (
        <MessageSquare className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Hash className="w-4 h-4 flex-shrink-0" />
      )}
      <span className="text-sm truncate">{name}</span>
      {badge && <span className="text-xs">{badge}</span>}
    </div>
  );
}

function DMItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-[#ffffffb3] hover:bg-[#2e2d33] hover:text-white">
      <div className="w-4 h-4 rounded bg-[#3e3d43] flex-shrink-0" />
      <span className="text-sm truncate">{name}</span>
    </div>
  );
}

function MessageItem({ user, time, message }: { user: string; time: string; message: string }) {
  return (
    <div className="flex gap-3 mb-4 hover:bg-[#2e2d33]/30 -mx-2 px-2 py-1 rounded">
      <div className="w-10 h-10 rounded bg-[#611f69] flex items-center justify-center text-white flex-shrink-0">
        {user[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-white">{user}</span>
          <span className="text-xs text-[#ffffffb3]">{time}</span>
        </div>
        <p className="text-[#ffffffb3]">{message}</p>
      </div>
    </div>
  );
}
