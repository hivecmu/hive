/**
 * Prompt template for workspace structure generation
 * User Story 1: AI-Generated Slack Workspace Structure
 */

export interface StructureContext {
  communitySize: string;
  coreActivities: string[];
  moderationCapacity: string;
  channelBudget: number;
  additionalContext?: string;
  workspaceName: string;
}

export interface StructureProposal {
  channels: Array<{
    name: string;
    description: string;
    type: 'core' | 'workstream' | 'committee';
    isPrivate: boolean;
    suggestedMembers?: string[];
  }>;
  committees: Array<{
    name: string;
    description: string;
    purpose: string;
  }>;
  rationale: string;
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
}

export function buildStructurePrompt(context: StructureContext): string {
  return `You are an expert in organizational design and workspace architecture. Your task is to design an optimal communication structure for a collaborative workspace.

## Workspace Context

**Name:** ${context.workspaceName}
**Community Size:** ${context.communitySize}
**Core Activities:** ${context.coreActivities.join(', ')}
**Moderation Capacity:** ${context.moderationCapacity}
**Channel Budget:** ${context.channelBudget} channels maximum
${context.additionalContext ? `**Additional Context:** ${context.additionalContext}` : ''}

## Your Task

Design a workspace structure that includes:

1. **Core Channels** - Essential channels for general communication
2. **Workstreams** - Activity-specific channels for focused work
3. **Committees** - Groups for specific governance or project areas (optional)

## Design Principles

- **Clarity:** Channel names should be self-explanatory
- **Scalability:** Structure should grow with the community
- **Discoverability:** Members should easily find relevant channels
- **Purpose:** Each channel should have a clear, unique purpose
- **Moderation:** Consider moderation capacity when suggesting private channels

## Naming Conventions

- Use lowercase with hyphens (e.g., "general-discussion")
- Prefix workstreams with category (e.g., "eng-backend", "design-ux")
- Keep names under 80 characters
- Avoid abbreviations unless universally understood

## Output Format

Respond with a JSON object matching this exact structure:

{
  "channels": [
    {
      "name": "channel-name",
      "description": "Clear description of purpose",
      "type": "core" | "workstream" | "committee",
      "isPrivate": boolean,
      "suggestedMembers": ["role1", "role2"] // optional
    }
  ],
  "committees": [
    {
      "name": "Committee Name",
      "description": "What this committee does",
      "purpose": "Why this committee exists"
    }
  ],
  "rationale": "Explanation of your design decisions",
  "estimatedComplexity": "simple" | "moderate" | "complex"
}

## Constraints

- Total channels must not exceed ${context.channelBudget}
- At minimum include: #general, #announcements, #random
- Private channels should be ≤20% of total (considering moderation)
- Each workstream should align with core activities
- Avoid redundant or overlapping channels

Now generate the optimal structure for this workspace.`;
}

export const structureSchema = {
  type: 'object',
  required: ['channels', 'committees', 'rationale', 'estimatedComplexity'],
  properties: {
    channels: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description', 'type', 'isPrivate'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 80 },
          description: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['core', 'workstream', 'committee'] },
          isPrivate: { type: 'boolean' },
          suggestedMembers: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    committees: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'description', 'purpose'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          purpose: { type: 'string', minLength: 1 },
        },
      },
    },
    rationale: { type: 'string', minLength: 1 },
    estimatedComplexity: {
      type: 'string',
      enum: ['simple', 'moderate', 'complex'],
    },
  },
};
