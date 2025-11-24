"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Hash, Lock, Users } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

interface CreateChannelData {
  name: string;
  description: string;
  type: 'core' | 'workstream' | 'committee';
  isPrivate: boolean;
}

// Backend channel service (to be added to backend)
const createChannel = async (workspaceId: string, data: CreateChannelData) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/workspaces/${workspaceId}/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('hive_auth_token')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create channel');
  }

  return response.json();
};

export function CreateChannelModal({ open, onOpenChange, workspaceId }: CreateChannelModalProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<CreateChannelData>({
    name: '',
    description: '',
    type: 'core',
    isPrivate: false,
  });

  const createChannelMutation = useMutation({
    mutationFn: () => createChannel(workspaceId, formData),
    onSuccess: () => {
      toast.success(`Channel #${formData.name} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
      onOpenChange(false);
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'core',
        isPrivate: false,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create channel');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Channel name is required');
      return;
    }

    // Validate channel name (lowercase, no spaces, alphanumeric and dashes)
    const channelName = formData.name.toLowerCase().replace(/\s+/g, '-');
    if (!/^[a-z0-9-]+$/.test(channelName)) {
      toast.error('Channel name can only contain lowercase letters, numbers, and dashes');
      return;
    }

    createChannelMutation.mutate();
  };

  const getTypePrefix = () => {
    switch (formData.type) {
      case 'workstream':
        return 'workstreams/';
      case 'committee':
        return 'committees/';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a channel</DialogTitle>
            <DialogDescription>
              Channels are where your team communicates. They're best when organized around a topic.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Channel Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Channel Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'core' | 'workstream' | 'committee') => 
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      <span>Core Channel</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="workstream">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Workstream</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="committee">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Committee</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {formData.type === 'core' && 'Core channels are for general team communication'}
                {formData.type === 'workstream' && 'Workstreams are for specific projects or initiatives'}
                {formData.type === 'committee' && 'Committees are for cross-functional groups'}
              </p>
            </div>

            {/* Channel Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center px-3 py-2 bg-muted rounded-md">
                  {formData.isPrivate ? <Lock className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                </div>
                <div className="flex-1 relative">
                  {getTypePrefix() && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {getTypePrefix()}
                    </span>
                  )}
                  <Input
                    id="name"
                    placeholder="e.g. marketing, engineering"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      name: e.target.value.toLowerCase().replace(/\s+/g, '-')
                    }))}
                    className={getTypePrefix() ? `pl-[${getTypePrefix().length * 8 + 12}px]` : ''}
                    style={getTypePrefix() ? { paddingLeft: `${getTypePrefix().length * 8 + 12}px` } : {}}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Names must be lowercase, without spaces or periods, and can't be longer than 80 characters.
              </p>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="What's this channel about?"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                Let people know what this channel is for.
              </p>
            </div>

            {/* Private Channel */}
            <div className="flex items-center justify-between">
              <div className="grid gap-0.5">
                <Label htmlFor="private">Make private</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.isPrivate 
                    ? 'Only specific people can view and join'
                    : 'Anyone in your workspace can view and join'
                  }
                </p>
              </div>
              <Switch
                id="private"
                checked={formData.isPrivate}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createChannelMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createChannelMutation.isPending || !formData.name.trim()}
            >
              {createChannelMutation.isPending ? 'Creating...' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
