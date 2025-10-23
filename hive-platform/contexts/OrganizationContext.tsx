"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Organization, WorkspaceStructure } from '@/types/organization';
import { getDatabase, MockDatabaseService } from '@/lib/mockDb';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

const USE_REAL_BACKEND = process.env.NEXT_PUBLIC_USE_REAL_BACKEND === 'true';

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
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const [db] = useState<MockDatabaseService>(() => getDatabase());
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    if (USE_REAL_BACKEND) {
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
            channels: [], // Will be loaded separately
            workstreams: [],
            committees: [],
            directMessages: [],
            workspace: {
              coreChannels: [],
              workstreams: [],
              committees: [],
              directMessages: [],
              blueprintApproved: false,
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
        }
      } catch (error) {
        console.error('Failed to load organizations:', error);
        toast.error('Failed to load workspaces');
      }
    } else {
      // Use mock database
      const allOrgs = db.getAllOrganizations();
      const currOrg = db.getCurrentOrganization();
      const currOrgId = db.getCurrentOrgId();

      setOrganizations(allOrgs);
      setCurrentOrg(currOrg);
      setCurrentOrgId(currOrgId);
    }

    setIsLoading(false);
  };

  const switchOrganization = async (orgId: string) => {
    if (USE_REAL_BACKEND) {
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
    } else {
      const success = db.switchOrganization(orgId);
      if (success) {
        const newOrg = db.getOrganization(orgId);
        setCurrentOrg(newOrg);
        setCurrentOrgId(orgId);
        toast.success(`Switched to ${newOrg?.name || 'organization'}`);
      } else {
        toast.error('Failed to switch organization');
      }
    }
  };

  const createOrganization = async (org: Organization) => {
    if (USE_REAL_BACKEND) {
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
    } else {
      const createdOrg = db.createOrganization(org);
      setCurrentOrg(createdOrg);
      setCurrentOrgId(createdOrg.id);
      setOrganizations(db.getAllOrganizations());
      toast.success(`Created ${createdOrg.name}`);
    }
  };

  const updateOrganization = (orgId: string, updates: Partial<Organization>) => {
    const updated = db.updateOrganization(orgId, updates);
    if (updated) {
      if (orgId === currentOrgId) {
        setCurrentOrg(updated);
      }
      setOrganizations(db.getAllOrganizations());
    }
  };

  const updateWorkspace = (orgId: string, workspace: Partial<WorkspaceStructure>) => {
    const success = db.updateWorkspace(orgId, workspace);
    if (success) {
      if (orgId === currentOrgId) {
        const updated = db.getOrganization(orgId);
        setCurrentOrg(updated);
      }
      setOrganizations(db.getAllOrganizations());
    }
  };

  const approveBlueprint = (orgId: string, blueprintData: any) => {
    const success = db.approveBlueprint(orgId, blueprintData);
    if (success) {
      if (orgId === currentOrgId) {
        const updated = db.getOrganization(orgId);
        setCurrentOrg(updated);
      }
      setOrganizations(db.getAllOrganizations());
      toast.success('Blueprint approved! Hub is now unlocked.');
    }
  };

  const deleteOrganization = (orgId: string) => {
    const success = db.deleteOrganization(orgId);
    if (success) {
      loadData(); // Reload everything
      toast.success('Organization deleted');
    }
  };

  const refreshOrganizations = () => {
    loadData();
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
