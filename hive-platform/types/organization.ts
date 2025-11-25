// Organization types for multi-org support

export type OrganizationType = 'club' | 'company' | 'community' | 'educational' | 'personal';

export interface Channel {
  id: number;
  name: string;
  unread: number;
  description?: string;
}

export interface Workstream {
  id: number;
  name: string;
  unread: number;
  description?: string;
}

export interface Committee {
  id: number;
  name: string;
  members: number;
  channels: Channel[];
}

export interface DirectMessage {
  id: number;
  name: string;
  avatar: string;
  online: boolean;
  unread: number;
}

export interface BlueprintData {
  channels: number;
  subgroups: number;
  archiveCandidates: number;
  channelBudgetUsed: number;
  channelBudgetMax: number;
}

export interface WorkspaceStructure {
  coreChannels: Channel[];
  workstreams: Workstream[];
  committees: Committee[];
  directMessages: DirectMessage[];
  blueprintApproved: boolean;
  blueprintVersion: number;
  blueprintData: BlueprintData | null;
  wizardData: any;
}

export interface FileSource {
  id: number;
  name: string;
  status: 'linked' | 'linking' | 'unlinked' | 'reauth';
  icon: string;
  lastSync: string;
  filesCount: number;
}

export interface HubFile {
  id: number;
  name: string;
  type: string;
  source: string;
  channel?: string;
  dateAdded: string;
  size: string;
  tags?: string[];
}

export interface Hub {
  sources: FileSource[];
  files: HubFile[];
  totalFiles: number;
  connectedSources: number;
  duplicatesCollapsed: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  color: string;
  type: OrganizationType;
  description: string;
  industry?: string;
  memberCount: number;
  timezone: string;
  createdAt: string;
  inviteCode?: string;
  workspace: WorkspaceStructure;
  hub: Hub;
}

export interface OrganizationDatabase {
  organizations: { [orgId: string]: Organization };
  currentOrgId: string | null;
  userId: string;
}

export interface OrganizationWizardData {
  // Step 1: Organization Basics
  name: string;
  type: OrganizationType;
  emoji: string;
  color: string;

  // Step 2: Organization Details
  description: string;
  industry?: string;
  memberCount: string;
  timezone: string;

  // Steps 3-6: Workspace Structure (existing wizard)
  communitySize: string;
  coreActivities: string[];
  moderationCapacity: string;
  channelBudget: number;
  importWorkspace: boolean;
  copyFromOrgId?: string;
}
