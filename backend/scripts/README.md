# Database Seeding Scripts

This directory contains scripts for seeding the database with demo data and verifying the seeded content.

## Scripts

### `seed.ts` - Main Seed Script

Populates the database with realistic demo data for development and testing.

**What it creates:**

- **Users (3)**:
  - Alice Johnson (alice@example.com) - Admin
  - Bob Chen (bob@example.com) - Member
  - Carol Martinez (carol@example.com) - Member

- **Workspace**:
  - Demo Team (demo-team)

- **Channels (5)**:
  - #general (core) - 16 messages
  - #random (core) - 14 messages
  - #engineering (workstream) - 19 messages
  - #design (workstream) - 14 messages
  - #marketing (workstream) - 15 messages

- **Messages**: 78 total channel messages with realistic conversations
- **Direct Messages**: 13 messages between users

**Usage:**

```bash
npm run seed
```

**Login Credentials:**

```
Email: alice@example.com   | Password: demo123
Email: bob@example.com     | Password: demo123
Email: carol@example.com   | Password: demo123
```

### `verify-seed.ts` - Verification Script

Displays a summary of all seeded data including counts and details.

**Usage:**

```bash
./node_modules/.bin/tsx scripts/verify-seed.ts
```

**Output:**
- Total counts for users, workspaces, channels, messages, and direct messages
- List of all users with their emails
- List of all channels with descriptions

### `show-sample-data.ts` - Sample Data Display

Shows sample messages from each channel and direct message conversations.

**Usage:**

```bash
./node_modules/.bin/tsx scripts/show-sample-data.ts
```

**Output:**
- Sample messages (first 5) from each channel
- Sample direct messages with timestamps
- Total message counts per channel

## Message Content

The seed script creates realistic conversations that simulate a real team collaboration workspace:

### General Channel
- Welcome messages
- Team announcements
- Standup reminders
- General team discussions

### Random Channel
- Sports discussions
- Coffee shop recommendations
- Book recommendations
- Personal chats

### Engineering Channel
- API design discussions
- Code review requests
- Release planning
- Technical implementation details

### Design Channel
- Design mockup reviews
- Accessibility discussions
- Feedback iterations
- Design handoff coordination

### Marketing Channel
- Campaign planning
- Customer success stories
- Webinar planning
- Social media metrics

### Direct Messages
- One-on-one technical discussions
- Design review requests
- Quick clarification questions

## Database Tables Populated

- `users` - User accounts with hashed passwords
- `workspaces` - Team workspace
- `workspace_members` - User-workspace associations with roles
- `channels` - Communication channels
- `messages` - Channel messages with timestamps
- `direct_messages` - Private messages between users

## Features

- **Idempotent**: Can be run multiple times safely (checks for existing data)
- **Realistic Timestamps**: Messages are timestamped in chronological order
- **Contextual Content**: Messages match the purpose of each channel
- **User Interactions**: Conversations flow naturally between team members

## Notes

- All passwords are hashed using bcrypt with 10 salt rounds
- Messages are created with staggered timestamps to simulate real conversations
- The script will skip creating data that already exists (idempotent)
- The workspace owner is the first user (Alice Johnson)
