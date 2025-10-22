"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Organization, WorkspaceStructure } from '@/types/organization';
import { getDatabase, MockDatabaseService } from '@/lib/mockDb';
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

  const loadData = () => {
    setIsLoading(true);
    const allOrgs = db.getAllOrganizations();
    const currOrg = db.getCurrentOrganization();
    const currOrgId = db.getCurrentOrgId();

    setOrganizations(allOrgs);
    setCurrentOrg(currOrg);
    setCurrentOrgId(currOrgId);
    setIsLoading(false);
  };

  const switchOrganization = (orgId: string) => {
    const success = db.switchOrganization(orgId);
    if (success) {
      const newOrg = db.getOrganization(orgId);
      setCurrentOrg(newOrg);
      setCurrentOrgId(orgId);
      toast.success(`Switched to ${newOrg?.name || 'organization'}`);
    } else {
      toast.error('Failed to switch organization');
    }
  };

  const createOrganization = (org: Organization) => {
    const createdOrg = db.createOrganization(org);
    setCurrentOrg(createdOrg);
    setCurrentOrgId(createdOrg.id);
    setOrganizations(db.getAllOrganizations());
    toast.success(`Created ${createdOrg.name}`);
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
