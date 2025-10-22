import type {
  Organization,
  OrganizationDatabase,
  Channel,
  Workstream,
  Committee,
  DirectMessage,
  WorkspaceStructure,
  Hub,
} from '@/types/organization';

const STORAGE_KEY = 'hive_organizations_db';

// Default direct messages (shared across all orgs)
const defaultDirectMessages: DirectMessage[] = [
  { id: 1, name: "Emma Rodriguez", avatar: "ER", online: true, unread: 0 },
  { id: 2, name: "David Kim", avatar: "DK", online: true, unread: 2 },
  { id: 3, name: "Maria Santos", avatar: "MS", online: false, unread: 0 },
  { id: 4, name: "Alex Thompson", avatar: "AT", online: true, unread: 1 },
  { id: 5, name: "Jordan Lee", avatar: "JL", online: false, unread: 0 },
];

// Seed organization 1: Design Team Hub (current/existing data - blueprint approved)
const designTeamOrg: Organization = {
  id: 'org-design-team',
  name: 'Design Team Hub',
  slug: 'design-team',
  emoji: '🎨',
  color: '#F5DAA7',
  type: 'company',
  description: 'Professional design team collaboration workspace',
  industry: 'Design & Creative',
  memberCount: 45,
  timezone: 'America/Los_Angeles',
  createdAt: new Date('2024-01-15').toISOString(),
  workspace: {
    coreChannels: [
      { id: 1, name: "announcements", unread: 2, description: "Important team announcements" },
      { id: 2, name: "general", unread: 0, description: "General team discussion" },
      { id: 3, name: "random", unread: 0, description: "Off-topic chat" },
    ],
    workstreams: [
      { id: 4, name: "workstreams/app-redesign", unread: 3, description: "Mobile app redesign project" },
      { id: 5, name: "workstreams/website", unread: 1, description: "Company website overhaul" },
      { id: 6, name: "workstreams/outreach", unread: 0, description: "Community outreach initiatives" },
    ],
    committees: [
      {
        id: 1,
        name: "Design Committee",
        members: 12,
        channels: [
          { id: 7, name: "committees/design", unread: 2 },
          { id: 8, name: "design-critique", unread: 1 },
        ]
      },
      {
        id: 2,
        name: "Development Committee",
        members: 15,
        channels: [
          { id: 9, name: "committees/development", unread: 4 },
          { id: 10, name: "dev-standup", unread: 0 },
        ]
      },
      {
        id: 3,
        name: "Marketing Committee",
        members: 9,
        channels: [
          { id: 11, name: "committees/marketing", unread: 1 },
        ]
      },
    ],
    directMessages: defaultDirectMessages,
    blueprintApproved: true,
    blueprintVersion: 1,
    blueprintData: {
      channels: 9,
      subgroups: 3,
      archiveCandidates: 2,
      channelBudgetUsed: 9,
      channelBudgetMax: 10,
    },
    wizardData: null,
  },
  hub: {
    sources: [
      { id: 1, name: "Google Drive", status: "linked", icon: "🗂️", lastSync: "2 min ago", filesCount: 1247 },
      { id: 2, name: "Dropbox", status: "linking", icon: "📦", lastSync: "Syncing...", filesCount: 0 },
      { id: 4, name: "Notion", status: "linked", icon: "📝", lastSync: "5 min ago", filesCount: 89 },
    ],
    files: [],
    totalFiles: 1336,
    connectedSources: 2,
    duplicatesCollapsed: 12,
  },
};

// Seed organization 2: ACM Computer Club (student club - blueprint NOT approved)
const acmClubOrg: Organization = {
  id: 'org-acm-club',
  name: 'ACM Computer Club',
  slug: 'acm-club',
  emoji: '💻',
  color: '#A8B8D8',
  type: 'club',
  description: 'University computer science club for students passionate about technology',
  industry: 'Education',
  memberCount: 28,
  timezone: 'America/New_York',
  createdAt: new Date('2024-09-01').toISOString(),
  workspace: {
    coreChannels: [
      { id: 1, name: "announcements", unread: 5, description: "Club announcements and updates" },
      { id: 2, name: "general", unread: 12, description: "General chat for all members" },
      { id: 3, name: "random", unread: 3, description: "Random off-topic discussion" },
      { id: 4, name: "workshop-planning", unread: 2, description: "Plan upcoming workshops" },
      { id: 5, name: "project-showcase", unread: 1, description: "Share your projects" },
      { id: 6, name: "help-desk", unread: 0, description: "Get help with coursework or projects" },
    ],
    workstreams: [],
    committees: [],
    directMessages: defaultDirectMessages,
    blueprintApproved: false, // Needs wizard to be run
    blueprintVersion: 0,
    blueprintData: null,
    wizardData: null,
  },
  hub: {
    sources: [
      { id: 1, name: "Google Drive", status: "linked", icon: "🗂️", lastSync: "10 min ago", filesCount: 342 },
      { id: 5, name: "GitHub", status: "linked", icon: "⚡", lastSync: "1 hour ago", filesCount: 156 },
    ],
    files: [],
    totalFiles: 498,
    connectedSources: 2,
    duplicatesCollapsed: 5,
  },
};

// Seed organization 3: Personal Projects (personal org - blueprint approved, minimal structure)
const personalProjectsOrg: Organization = {
  id: 'org-personal',
  name: 'Personal Projects',
  slug: 'personal',
  emoji: '🚀',
  color: '#98D8C8',
  type: 'personal',
  description: 'My personal workspace for side projects and learning',
  memberCount: 1,
  timezone: 'America/Los_Angeles',
  createdAt: new Date('2024-06-10').toISOString(),
  workspace: {
    coreChannels: [
      { id: 1, name: "general", unread: 0, description: "General notes and ideas" },
      { id: 2, name: "ideas", unread: 1, description: "Project ideas backlog" },
      { id: 3, name: "archive", unread: 0, description: "Completed or abandoned projects" },
    ],
    workstreams: [
      { id: 4, name: "workstreams/side-project-1", unread: 2, description: "AI-powered recipe generator" },
      { id: 5, name: "workstreams/learning-goals", unread: 0, description: "Learning Rust and WebAssembly" },
    ],
    committees: [], // No committees in personal workspace
    directMessages: [], // No DMs in personal workspace
    blueprintApproved: true,
    blueprintVersion: 1,
    blueprintData: {
      channels: 3,
      subgroups: 0,
      archiveCandidates: 0,
      channelBudgetUsed: 5,
      channelBudgetMax: 8,
    },
    wizardData: null,
  },
  hub: {
    sources: [
      { id: 1, name: "Google Drive", status: "linked", icon: "🗂️", lastSync: "30 min ago", filesCount: 89 },
      { id: 5, name: "GitHub", status: "linked", icon: "⚡", lastSync: "2 hours ago", filesCount: 234 },
    ],
    files: [],
    totalFiles: 323,
    connectedSources: 2,
    duplicatesCollapsed: 3,
  },
};

// Initialize database with seed data
function getInitialDatabase(): OrganizationDatabase {
  return {
    organizations: {
      [designTeamOrg.id]: designTeamOrg,
      [acmClubOrg.id]: acmClubOrg,
      [personalProjectsOrg.id]: personalProjectsOrg,
    },
    currentOrgId: designTeamOrg.id, // Start with Design Team
    userId: 'user-1',
  };
}

// Mock Database Service
export class MockDatabaseService {
  private db: OrganizationDatabase;

  constructor() {
    this.db = this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): OrganizationDatabase {
    if (typeof window === 'undefined') {
      return getInitialDatabase();
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored database:', e);
      }
    }

    // First time - initialize with seed data
    const initialDb = getInitialDatabase();
    this.saveToLocalStorage(initialDb);
    return initialDb;
  }

  private saveToLocalStorage(db?: OrganizationDatabase) {
    if (typeof window === 'undefined') return;
    const dataToSave = db || this.db;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }

  // Get all organizations
  getAllOrganizations(): Organization[] {
    return Object.values(this.db.organizations);
  }

  // Get current organization
  getCurrentOrganization(): Organization | null {
    if (!this.db.currentOrgId) return null;
    return this.db.organizations[this.db.currentOrgId] || null;
  }

  // Get organization by ID
  getOrganization(orgId: string): Organization | null {
    return this.db.organizations[orgId] || null;
  }

  // Switch to different organization
  switchOrganization(orgId: string): boolean {
    if (!this.db.organizations[orgId]) {
      console.error(`Organization ${orgId} not found`);
      return false;
    }

    this.db.currentOrgId = orgId;
    this.saveToLocalStorage();
    return true;
  }

  // Create new organization
  createOrganization(org: Organization): Organization {
    this.db.organizations[org.id] = org;
    this.db.currentOrgId = org.id; // Auto-switch to new org
    this.saveToLocalStorage();
    return org;
  }

  // Update organization
  updateOrganization(orgId: string, updates: Partial<Organization>): Organization | null {
    const org = this.db.organizations[orgId];
    if (!org) return null;

    this.db.organizations[orgId] = { ...org, ...updates };
    this.saveToLocalStorage();
    return this.db.organizations[orgId];
  }

  // Update workspace structure
  updateWorkspace(orgId: string, workspace: Partial<WorkspaceStructure>): boolean {
    const org = this.db.organizations[orgId];
    if (!org) return false;

    org.workspace = { ...org.workspace, ...workspace };
    this.saveToLocalStorage();
    return true;
  }

  // Approve blueprint for organization
  approveBlueprint(orgId: string, blueprintData: any): boolean {
    const org = this.db.organizations[orgId];
    if (!org) return false;

    org.workspace.blueprintApproved = true;
    org.workspace.blueprintVersion = (org.workspace.blueprintVersion || 0) + 1;
    org.workspace.blueprintData = blueprintData;
    this.saveToLocalStorage();
    return true;
  }

  // Delete organization
  deleteOrganization(orgId: string): boolean {
    if (!this.db.organizations[orgId]) return false;

    delete this.db.organizations[orgId];

    // If deleting current org, switch to first available
    if (this.db.currentOrgId === orgId) {
      const remainingOrgs = Object.keys(this.db.organizations);
      this.db.currentOrgId = remainingOrgs[0] || null;
    }

    this.saveToLocalStorage();
    return true;
  }

  // Get current org ID
  getCurrentOrgId(): string | null {
    return this.db.currentOrgId;
  }

  // Reset database to seed data (for testing)
  resetToSeedData(): void {
    this.db = getInitialDatabase();
    this.saveToLocalStorage();
  }
}

// Singleton instance
let dbInstance: MockDatabaseService | null = null;

export function getDatabase(): MockDatabaseService {
  if (!dbInstance) {
    dbInstance = new MockDatabaseService();
  }
  return dbInstance;
}
