"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';

interface JoinWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinWorkspace({ open, onOpenChange }: JoinWorkspaceProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshOrganizations } = useOrganization();

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      const result = await api.workspaces.joinByInviteCode(inviteCode.trim().toUpperCase());
      if (result.ok) {
        toast.success('Successfully joined workspace!');
        await refreshOrganizations();
        onOpenChange(false);
        setInviteCode('');
      } else {
        toast.error(result.issues[0]?.message || 'Failed to join workspace');
      }
    } catch (error) {
      toast.error('Failed to join workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join a Workspace</DialogTitle>
          <DialogDescription>
            Enter the invite code to join an existing workspace
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="Enter 8-character code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="uppercase font-mono"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoin();
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={loading || !inviteCode.trim()}>
            {loading ? 'Joining...' : 'Join Workspace'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

