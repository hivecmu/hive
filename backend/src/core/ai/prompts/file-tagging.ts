/**
 * Prompt template for file tagging
 * User Story 2: AI-Driven Centralized File Hub
 */

export interface FileContext {
  fileName: string;
  mimeType?: string;
  size?: number;
  channelName?: string;
  uploaderName?: string;
  existingTags?: string[];
}

export interface FileTagsProposal {
  tags: string[];
  category: string;
  confidence: number;
  summary: string;
}

export function buildFileTaggingPrompt(context: FileContext): string {
  return `You are an expert in document classification and knowledge organization. Your task is to analyze file metadata and generate relevant tags for search and discovery.

## File Metadata

**File Name:** ${context.fileName}
${context.mimeType ? `**Type:** ${context.mimeType}` : ''}
${context.size ? `**Size:** ${Math.round(context.size / 1024)} KB` : ''}
${context.channelName ? `**Channel:** ${context.channelName}` : ''}
${context.uploaderName ? `**Uploaded By:** ${context.uploaderName}` : ''}
${context.existingTags?.length ? `**Existing Tags:** ${context.existingTags.join(', ')}` : ''}

## Your Task

Generate appropriate tags for this file that will help users:
- Search and discover related files
- Understand file content at a glance
- Filter by category, project, or topic

## Tag Guidelines

1. **Specificity:** Use specific, actionable tags (not generic like "document")
2. **Consistency:** Use standard terminology
3. **Quantity:** Generate 3-7 tags (not too many, not too few)
4. **Categories:** Include type, topic, and project/team tags where relevant
5. **Format:** Lowercase, hyphenated (e.g., "project-alpha", "q4-2025")

## Output Format

Respond with a JSON object:

{
  "tags": ["tag1", "tag2", "tag3"],
  "category": "Main category (e.g., 'engineering', 'design', 'marketing')",
  "confidence": 0.0 to 1.0,
  "summary": "Brief one-sentence summary of what this file likely contains"
}

## Examples

**Input:** "Q4_Product_Roadmap_2025.pdf"
**Output:**
{
  "tags": ["roadmap", "product", "q4-2025", "planning"],
  "category": "product-management",
  "confidence": 0.95,
  "summary": "Product roadmap document for Q4 2025"
}

**Input:** "bug-fix-auth-flow.mp4"
**Output:**
{
  "tags": ["bug-fix", "authentication", "engineering", "video-recording"],
  "category": "engineering",
  "confidence": 0.85,
  "summary": "Screen recording demonstrating an authentication bug fix"
}

Now generate tags for the file above.`;
}

export const fileTagsSchema = {
  type: 'object',
  required: ['tags', 'category', 'confidence', 'summary'],
  properties: {
    tags: {
      type: 'array',
      items: { type: 'string', pattern: '^[a-z0-9-]+$' },
      minItems: 3,
      maxItems: 7,
    },
    category: { type: 'string', minLength: 1 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string', minLength: 1, maxLength: 200 },
  },
};
