# Next Steps: Complete Implementation Based on Design Mockups

## Current Status

✅ **Completed:**
- Next.js 14 project setup with TypeScript
- Design system with #F5DAA7 accent color
- Marketing pages (landing, login, signup) with animations
- Mock authentication system
- All design mockup components copied to `components/features/`

❌ **Not Yet Built (What You're Seeing):**
- The main app page is showing a basic dashboard instead of the chat interface
- Wizard, recommendations, changeset, and file hub are placeholders
- No proper view switching logic
- Missing Slack-like chat interface

## What Should Be Built

### Main App Structure (Based on `/Users/akeilsmith/hive-1/Full Frotned Desgin Concept`)

The app should work like this:

1. **Default View: Chat Interface** (`/app` route)
   - Sidebar with channels (like Slack)
   - Channel header showing current channel
   - Message pane with chat messages
   - Message input at bottom
   - Button to launch AI Wizard
   - Button to open File Hub (locked until wizard approved)

2. **Wizard Flow** (triggered from chat)
   - Step 1: Community Wizard (questions about team size, activities, etc.)
   - Step 2: Recommendation View (shows proposed channels/subgroups)
   - Step 3: ChangeSet Preview (diff of what will be created)
   - Step 4: Approval → unlocks File Hub → back to chat

3. **File Hub** (accessible after wizard approval)
   - Overview tab
   - Files tab with grid
   - Sources tab for integrations
   - Rules tab for deduplication
   - Audits tab for logs

## Files Already Copied (Ready to Use)

All these are in `components/features/`:

### Chat Components
- `Sidebar.tsx` - Full Slack-like sidebar with channels
- `ChannelHeader.tsx` - Shows current channel name
- `MessagePane.tsx` - Chat messages display
- `MessageInput.tsx` - Message composer at bottom

### Wizard Components
- `CommunityWizard.tsx` - 3-step intake form (294 lines)
- `RecommendationView.tsx` - Shows AI proposals (303 lines)
- `ChangeSetPreview.tsx` - Shows diff before approval

### File Hub
- `HubDashboard.tsx` - Complete file hub with all tabs (665 lines)

## What Needs to Be Done

### 1. Replace `/app/page.tsx` with Chat Interface

Instead of the dashboard cards, it should show:
```tsx
<div className="h-screen flex">
  <Sidebar {...props} />
  <div className="flex-1 flex flex-col">
    <ChannelHeader />
    <MessagePane />
    <MessageInput />
  </div>
</div>
```

### 2. Add View State Management

The app needs state to track which view is showing:
- `'chat'` - Default Slack-like chat (DEFAULT)
- `'wizard'` - Community wizard dialog
- `'recommendation'` - AI recommendations
- `'changeset'` - Preview of changes
- `'hub'` - File hub dashboard

### 3. Connect the Flow

- Clicking "AI Wizard" button → shows wizard dialog
- Wizard complete → shows recommendations
- Approve recommendations → shows changeset
- Approve changeset → unlocks hub, returns to chat
- Clicking "File Hub" → shows hub (if unlocked)

### 4. Update Path Structure

Remove placeholder pages and use view switching:
- Keep `/app/page.tsx` as main chat
- Remove `/app/wizard`, `/app/files`, `/app/settings` routes
- Use modals/overlays for wizard flow
- Use full-screen view for file hub

## Implementation Priority

### HIGH PRIORITY (Do This First)
1. ✅ Copy all design components (DONE)
2. ⏳ Replace `/app/page.tsx` with proper chat interface
3. ⏳ Add view state management
4. ⏳ Wire up wizard button to show CommunityWizard
5. ⏳ Wire up hub button (with locked/unlocked logic)

### MEDIUM PRIORITY
6. Fix import paths in copied components
7. Add proper TypeScript types
8. Connect wizard → recommendation → changeset flow
9. Add toast notifications for state changes
10. Test full wizard approval flow

### LOW PRIORITY
11. Add actual message data/state
12. Make chat messages interactive
13. Add channel switching
14. Polish animations and transitions

## Key Differences from Current Implementation

| Current (Wrong) | Should Be (Design Mockup) |
|----------------|---------------------------|
| Dashboard with cards | Slack-like chat interface |
| Separate routes for wizard/files | Modal wizard, full-screen hub |
| Empty placeholder pages | Complete functional components |
| No view switching | Dynamic view state management |
| Generic layout | Specific chat layout |

## Design Reference Locations

- **Main Chat**: `/Users/akeilsmith/hive-1/Full Frotned Desgin Concept/src/App.tsx`
- **Wizard**: `/Users/akeilsmith/hive-1/Figma 2/`
- **File Hub**: `/Users/akeilsmith/hive-1/Figma Frontend/`
- **All Components**: `/Users/akeilsmith/hive-1/Full Frotned Desgin Concept/src/components/`

## Quick Start to Fix

1. **Read** the `App.tsx` from design mockup to understand the structure
2. **Copy** that pattern to `/app/page.tsx`
3. **Update** imports to use the copied components
4. **Add** state management for view switching
5. **Test** the full flow: chat → wizard → approval → hub

## Expected User Flow

1. User logs in → sees **chat interface** (not dashboard)
2. Clicks "AI Structure Wizard" → **wizard modal** opens
3. Completes wizard → sees **recommendations**
4. Approves → sees **changeset preview**
5. Final approval → toast success, **returns to chat**, hub unlocked
6. Clicks "File Hub" → **full-screen hub** view
7. Clicks back → **returns to chat**

---

**Bottom Line:** The app should feel like Slack with AI features, not a generic admin dashboard. All the pieces are already built in the design mockup - they just need to be properly integrated into the Next.js app structure.
