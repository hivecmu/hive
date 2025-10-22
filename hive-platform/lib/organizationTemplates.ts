import type { OrganizationType, WorkspaceStructure } from '@/types/organization';

export interface OrganizationTemplate {
  type: OrganizationType;
  name: string;
  description: string;
  emoji: string;
  suggestedActivities: string[];
  defaultWorkspace: Partial<WorkspaceStructure>;
}

const defaultDirectMessages = [
  { id: 1, name: "Emma Rodriguez", avatar: "ER", online: true, unread: 0 },
  { id: 2, name: "David Kim", avatar: "DK", online: true, unread: 2 },
  { id: 3, name: "Maria Santos", avatar: "MS", online: false, unread: 0 },
  { id: 4, name: "Alex Thompson", avatar: "AT", online: true, unread: 1 },
  { id: 5, name: "Jordan Lee", avatar: "JL", online: false, unread: 0 },
];

export const organizationTemplates: Record<OrganizationType, OrganizationTemplate> = {
  club: {
    type: 'club',
    name: 'Club/Team',
    description: 'Perfect for student clubs, sports teams, or hobby groups',
    emoji: '🎯',
    suggestedActivities: ['Events', 'Projects', 'Recruiting', 'Social'],
    defaultWorkspace: {
      coreChannels: [
        { id: 1, name: 'announcements', unread: 0, description: 'Important club announcements' },
        { id: 2, name: 'general', unread: 0, description: 'General discussion for all members' },
        { id: 3, name: 'events', unread: 0, description: 'Event planning and coordination' },
        { id: 4, name: 'social', unread: 0, description: 'Off-topic and social chat' },
      ],
      workstreams: [
        { id: 5, name: 'workstreams/outreach', unread: 0, description: 'Community outreach and growth' },
      ],
      committees: [
        {
          id: 1,
          name: 'Events Committee',
          members: 0,
          channels: [
            { id: 6, name: 'committees/events', unread: 0 },
          ]
        },
      ],
      directMessages: defaultDirectMessages,
      blueprintApproved: false,
      blueprintVersion: 0,
      blueprintData: null,
      wizardData: null,
    },
  },

  company: {
    type: 'company',
    name: 'Company',
    description: 'Ideal for startups, agencies, or corporate teams',
    emoji: '🏢',
    suggestedActivities: ['Projects', 'Departments', 'Client Work', 'Internal Tools'],
    defaultWorkspace: {
      coreChannels: [
        { id: 1, name: 'announcements', unread: 0, description: 'Company-wide announcements' },
        { id: 2, name: 'general', unread: 0, description: 'General team discussion' },
        { id: 3, name: 'random', unread: 0, description: 'Off-topic chat' },
        { id: 4, name: 'help-desk', unread: 0, description: 'Internal support and questions' },
      ],
      workstreams: [
        { id: 5, name: 'workstreams/product', unread: 0, description: 'Product development' },
        { id: 6, name: 'workstreams/marketing', unread: 0, description: 'Marketing initiatives' },
      ],
      committees: [
        {
          id: 1,
          name: 'Leadership',
          members: 0,
          channels: [
            { id: 7, name: 'committees/leadership', unread: 0 },
          ]
        },
      ],
      directMessages: defaultDirectMessages,
      blueprintApproved: false,
      blueprintVersion: 0,
      blueprintData: null,
      wizardData: null,
    },
  },

  community: {
    type: 'community',
    name: 'Community',
    description: 'For online communities, Discord servers, or forums',
    emoji: '👥',
    suggestedActivities: ['Events', 'Support', 'Discussion', 'Content Creation'],
    defaultWorkspace: {
      coreChannels: [
        { id: 1, name: 'welcome', unread: 0, description: 'Welcome new members!' },
        { id: 2, name: 'announcements', unread: 0, description: 'Community announcements' },
        { id: 3, name: 'general', unread: 0, description: 'General chat' },
        { id: 4, name: 'help-desk', unread: 0, description: 'Get help from moderators' },
        { id: 5, name: 'showcase', unread: 0, description: 'Share your work' },
      ],
      workstreams: [
        { id: 6, name: 'workstreams/events', unread: 0, description: 'Community events and meetups' },
      ],
      committees: [
        {
          id: 1,
          name: 'Moderators',
          members: 0,
          channels: [
            { id: 7, name: 'committees/moderators', unread: 0 },
          ]
        },
      ],
      directMessages: defaultDirectMessages,
      blueprintApproved: false,
      blueprintVersion: 0,
      blueprintData: null,
      wizardData: null,
    },
  },

  educational: {
    type: 'educational',
    name: 'Educational',
    description: 'For classrooms, courses, or learning groups',
    emoji: '📚',
    suggestedActivities: ['Coursework', 'Projects', 'Study Groups', 'Q&A'],
    defaultWorkspace: {
      coreChannels: [
        { id: 1, name: 'announcements', unread: 0, description: 'Course announcements' },
        { id: 2, name: 'general', unread: 0, description: 'General course discussion' },
        { id: 3, name: 'questions', unread: 0, description: 'Ask questions about coursework' },
        { id: 4, name: 'resources', unread: 0, description: 'Share learning resources' },
      ],
      workstreams: [
        { id: 5, name: 'workstreams/group-projects', unread: 0, description: 'Collaborative group projects' },
      ],
      committees: [
        {
          id: 1,
          name: 'Study Groups',
          members: 0,
          channels: [
            { id: 6, name: 'committees/study-group-1', unread: 0 },
          ]
        },
      ],
      directMessages: defaultDirectMessages,
      blueprintApproved: false,
      blueprintVersion: 0,
      blueprintData: null,
      wizardData: null,
    },
  },

  personal: {
    type: 'personal',
    name: 'Personal',
    description: 'For individual use, side projects, or personal organization',
    emoji: '🚀',
    suggestedActivities: ['Projects', 'Learning', 'Ideas', 'Archive'],
    defaultWorkspace: {
      coreChannels: [
        { id: 1, name: 'general', unread: 0, description: 'General notes and thoughts' },
        { id: 2, name: 'ideas', unread: 0, description: 'Project ideas and brainstorming' },
        { id: 3, name: 'archive', unread: 0, description: 'Completed or paused projects' },
      ],
      workstreams: [
        { id: 4, name: 'workstreams/active-project', unread: 0, description: 'Current active project' },
      ],
      committees: [], // No committees for personal workspace
      directMessages: [], // No DMs for personal workspace
      blueprintApproved: false,
      blueprintVersion: 0,
      blueprintData: null,
      wizardData: null,
    },
  },
};

export function getTemplateForType(type: OrganizationType): OrganizationTemplate {
  return organizationTemplates[type];
}

export function getAllTemplates(): OrganizationTemplate[] {
  return Object.values(organizationTemplates);
}

// Color palette for organizations
export const organizationColors = [
  { name: 'Warm Gold', value: '#F5DAA7' },
  { name: 'Sky Blue', value: '#A8B8D8' },
  { name: 'Mint Green', value: '#98D8C8' },
  { name: 'Coral Pink', value: '#F7B1AB' },
  { name: 'Lavender', value: '#D4A5A5' },
  { name: 'Sunshine Yellow', value: '#FFD93D' },
  { name: 'Ocean Blue', value: '#6BCF8F' },
  { name: 'Purple Haze', value: '#B388EB' },
];

// Emoji suggestions for organizations
export const emojiSuggestions = [
  '🎨', '💻', '🚀', '📚', '🎯', '🏢', '👥', '⚡',
  '🌟', '🔥', '💡', '🎉', '🏆', '🎵', '🌈', '✨',
  '🎭', '🎬', '📱', '🖥️', '⚙️', '🔬', '🧪', '🎓',
];
