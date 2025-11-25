"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Organization, WorkspaceStructure } from '@/types/organization';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

interface OrganizationContextType {
  // Current organization
  currentOrg: Organization | null;
  currentOrgId: string | null;

  // All organizations
  organizations: Organization[];

  // Actions
  switchOrganization: (orgId: string) => void;
  createOrganization: (org: Organization) => void;
  updateOrganization: (orgId: string, updates: Partial<Organization>) => void;
  updateWorkspace: (orgId: string, workspace: Partial<WorkspaceStructure>) => void;
  approveBlueprint: (orgId: string, blueprintData: any) => void;
  deleteOrganization: (orgId: string) => void;
  refreshOrganizations: () => void;

  // Loading state
  isLoading: boolean;

  // Error state - distinguishes API errors from empty workspaces
  hasError: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setHasError(false);

    // Verify token exists before making API calls
    const token = localStorage.getItem('hive_auth_token');
    if (!token) {
      // No token means user isn't authenticated - clear cookie and redirect
      // Use multiple methods to reliably clear the cookie
      document.cookie = "hive_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "hive_authenticated=; path=/; max-age=0";
      // Use small delay to ensure cookie is processed before redirect
      setTimeout(() => {
        window.location.href = '/login';
      }, 50);
      return;
    }

      // Load from real API
      try {
        const result = await api.workspaces.list();

        if (result.ok) {
          // Map backend workspaces to frontend Organization type
          const orgs = result.value.map((ws: any) => ({
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            emoji: ws.emoji,
            color: ws.color,
            type: ws.type,
            memberCount: ws.memberCount,
            description: ws.description || '',
            industry: ws.industry || '',
            timezone: ws.timezone || 'UTC',
            createdAt: ws.createdAt,
            inviteCode: ws.inviteCode, // Map the invite code from backend
            // Note: channels are loaded separately via useChannels hook
            channels: [],
            workstreams: [],
            committees: [],
            directMessages: [],
            workspace: {
              coreChannels: [],
              workstreams: [],
              committees: [],
              directMessages: [],
              blueprintApproved: ws.blueprintApproved || false, // Map from backend
              blueprintVersion: 0,
              blueprintData: null,
              wizardData: null,
            },
            hub: {
              sources: [],
              files: [],
              totalFiles: 0,
              connectedSources: 0,
              duplicatesCollapsed: 0,
            },
          }));

          setOrganizations(orgs);

          // Set first org as current if exists
          if (orgs.length > 0) {
            const savedOrgId = localStorage.getItem('hive_current_org_id');
            const current = savedOrgId ? orgs.find(o => o.id === savedOrgId) : orgs[0];
            if (current) {
              setCurrentOrg(current);
              setCurrentOrgId(current.id);
            }
          }
        } else {
          // API returned an error (but not 401, which is handled in apiRequest)
          setHasError(true);
          toast.error(result.issues?.[0]?.message || 'Failed to load workspaces');
        }
      } catch (error) {
        console.error('Failed to load organizations:', error);
        setHasError(true);
        toast.error('Failed to load workspaces');
      }

    setIsLoading(false);
  };

  const switchOrganization = async (orgId: string) => {
      try {
        const result = await api.workspaces.get(orgId);
        if (result.ok) {
          localStorage.setItem('hive_current_org_id', orgId);
          const newOrg = organizations.find(o => o.id === orgId);
          if (newOrg) {
            setCurrentOrg(newOrg);
            setCurrentOrgId(orgId);
            toast.success(`Switched to ${newOrg.name}`);
          }
        } else {
          toast.error('Failed to switch workspace');
        }
      } catch (error) {
        toast.error('Connection error');
    }
  };

  const createOrganization = async (org: Organization) => {
      try {
        const result = await api.workspaces.create({
          name: org.name,
          slug: org.name.toLowerCase().replace(/\s+/g, '-'),
          type: org.type,
          emoji: org.emoji,
          color: org.color,
        });

        if (result.ok) {
          toast.success(`Created ${org.name}`);
          await loadData(); // Reload all organizations
        } else {
          toast.error(result.issues[0]?.message || 'Failed to create workspace');
        }
      } catch (error) {
        toast.error('Connection error');
      }
  };

  const updateOrganization = async (orgId: string, updates: Partial<Organization>) => {
    try {
      const result = await api.workspaces.update(orgId, updates);
      if (result.ok) {
        await loadData();
        toast.success('Workspace updated');
      } else {
        toast.error('Failed to update workspace');
      }
    } catch (error) {
      toast.error('Connection error');
    }
  };

  const updateWorkspace = async (orgId: string, workspace: Partial<WorkspaceStructure>) => {
    // Update workspace structure via backend
    try {
      const result = await api.workspaces.update(orgId, { ...workspace });
      if (result.ok) {
        await loadData();
      } else {
        toast.error('Failed to update workspace');
      }
    } catch (error) {
      toast.error('Connection error');
    }
  };

  const approveBlueprint = async (orgId: string, blueprintData: any) => {
    // The backend already updates blueprintApproved when structure is applied
    // Just refresh the organization data
    await loadData();
      toast.success('Blueprint approved! Hub is now unlocked.');
  };

  const deleteOrganization = async (orgId: string) => {
    try {
      const result = await api.workspaces.delete(orgId);
      if (result.ok) {
        await loadData(); // Reload everything
        toast.success('Workspace deleted');
      } else {
        toast.error('Failed to delete workspace');
      }
    } catch (error) {
      toast.error('Connection error');
    }
  };

  const refreshOrganizations = async () => {
    await loadData();
  };

  const value: OrganizationContextType = {
    currentOrg,
    currentOrgId,
    organizations,
    switchOrganization,
    createOrganization,
    updateOrganization,
    updateWorkspace,
    approveBlueprint,
    deleteOrganization,
    refreshOrganizations,
    isLoading,
    hasError,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
