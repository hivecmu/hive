"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, RefreshCw, Settings } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";

interface WorkspaceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

export function WorkspaceSettings({ open, onOpenChange, workspaceId }: WorkspaceSettingsProps) {
  const { currentOrg, refreshOrganizations } = useOrganization();
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  if (!currentOrg) return null;

  const inviteCode = currentOrg.inviteCode || 'Loading...';
  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${inviteCode}`
    : '';

  const copyInviteCode = () => {
    if (inviteCode !== 'Loading...') {
      navigator.clipboard.writeText(inviteCode);
      toast.success('Invite code copied to clipboard');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard');
  };

  const handleRegenerateCode = async () => {
    if (!confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }

    setRegeneratingCode(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/workspaces/${currentOrg.id}/regenerate-invite`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('hive_auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to regenerate invite code');
      }

      toast.success('Invite code regenerated successfully');
      setConfirmRegenerate(false);

      // Refresh to get new invite code
      if (refreshOrganizations) {
        await refreshOrganizations();
      }
    } catch (error) {
      toast.error('Failed to regenerate invite code');
    } finally {
      setRegeneratingCode(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Workspace Settings
          </DialogTitle>
          <DialogDescription>
            Manage your workspace settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="invite">Invite</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Information</CardTitle>
                <CardDescription>
                  Basic information about your workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Workspace Name</Label>
                  <Input value={currentOrg.name} disabled />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Input value={currentOrg.type || 'organization'} disabled className="capitalize" />
                </div>
                <div className="grid gap-2">
                  <Label>Members</Label>
                  <Input value={`${currentOrg.memberCount || 1} member${(currentOrg.memberCount || 1) > 1 ? 's' : ''}`} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invite Team Members</CardTitle>
                <CardDescription>
                  Share your workspace invite code or link with team members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Invite Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteCode}
                      readOnly
                      className="font-mono text-lg"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyInviteCode}
                      disabled={inviteCode === 'Loading...'}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this code with team members to join your workspace
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="text-sm"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyInviteLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Direct link to join your workspace
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Regenerate Invite Code</p>
                      <p className="text-sm text-muted-foreground">
                        This will invalidate the current invite code
                      </p>
                    </div>
                    <Button
                      variant={confirmRegenerate ? "destructive" : "outline"}
                      size="sm"
                      onClick={handleRegenerateCode}
                      disabled={regeneratingCode}
                    >
                      {regeneratingCode ? (
                        <>Regenerating...</>
                      ) : confirmRegenerate ? (
                        <>Confirm Regenerate</>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </div>
                  {confirmRegenerate && (
                    <p className="text-sm text-destructive mt-2">
                      Are you sure? Click again to confirm.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Join Another Workspace</CardTitle>
                <CardDescription>
                  Enter an invite code to join another workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JoinWorkspaceForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function JoinWorkspaceForm() {
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const { refreshOrganizations } = useOrganization();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/workspaces/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('hive_auth_token')}`,
          },
          body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.issues?.[0]?.message || 'Failed to join workspace');
      }

      toast.success(`Successfully joined ${result.value.name}!`);
      setInviteCode('');

      // Refresh workspace list
      if (refreshOrganizations) {
        await refreshOrganizations();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to join workspace');
    } finally {
      setJoining(false);
    }
  };

  return (
    <form onSubmit={handleJoin} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="join-code">Invite Code</Label>
        <Input
          id="join-code"
          placeholder="Enter invite code (e.g., ABC12345)"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          className="font-mono"
          maxLength={12}
        />
      </div>
      <Button type="submit" disabled={joining || !inviteCode.trim()}>
        {joining ? 'Joining...' : 'Join Workspace'}
      </Button>
    </form>
  );
}
