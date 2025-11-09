# Hive Messaging - Implementation Roadmap

## Quick Start: Connecting the Frontend to Real Backend (Est. 4-6 hours)

### Phase 1: Enable Real API (5 minutes)
**File**: `hive-platform/.env.local`
```env
NEXT_PUBLIC_USE_REAL_BACKEND=true
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### Phase 2: Load Messages from API (1-2 hours)
**File**: `hive-platform/components/features/chat/MessagePane.tsx`

**Current State**: 
```typescript
const messages = [ /* 6 hardcoded messages */ ];
```

**Required Changes**:
1. Add `useState` for messages, loading, error
2. Add `useEffect` to load messages on mount:
   ```typescript
   useEffect(() => {
     const channelId = /* get from props/context */;
     api.messages.list(channelId).then(result => {
       if (result.ok) setMessages(result.value);
     });
   }, [channelId]);
   ```
3. Add loading skeleton/spinner
4. Add error boundary
5. Add infinite scroll/pagination on `before` timestamp

### Phase 3: Send Messages via Form (30 mins - 1 hour)
**File**: `hive-platform/components/features/chat/MessageInput.tsx`

**Current State**:
```typescript
<Input placeholder="Message #general" />
// No handlers, no submission
```

**Required Changes**:
1. Add `useState` for message content
2. Add form submission handler:
   ```typescript
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     const result = await api.messages.send(channelId, { content });
     if (result.ok) {
       setMessage('');
       // Optionally optimistically update messages
     }
   };
   ```
3. Add input onChange handler
4. Add loading state to send button
5. Add validation (non-empty, max length)

### Phase 4: Track Selected Channel (30 mins)
**File**: `hive-platform/app/app/page.tsx`

**Current State**: No channel state tracking

**Required Changes**:
1. Add `useState` for selectedChannelId
2. Pass to MessagePane and MessageInput as props
3. Update when user clicks channel in Sidebar
4. Join/leave WebSocket room on channel change

### Phase 5: Connect WebSocket (1-2 hours)
**File**: Create `hive-platform/hooks/useWebSocket.ts`

**Required Implementation**:
```typescript
export function useWebSocket() {
  useEffect(() => {
    const socket = connectWebSocket();
    
    const handleMessage = (data: any) => {
      // Update messages state with new message
      setMessages(prev => [...prev, data.message]);
    };
    
    onMessage(handleMessage);
    
    return () => offMessage(handleMessage);
  }, []);
}
```

Then in MessagePane:
```typescript
useWebSocket(); // Connect listener
```

### Phase 6: Real-time Typing Indicators (30 mins)
**File**: Modify MessageInput and create typing context

**Changes**:
1. Emit `typing-start` on input focus/onChange
2. Emit `typing-stop` on blur or send
3. Show typing users list in UI
4. Add debounce to avoid spam

---

## Estimated Effort by Feature

| Feature | Effort | Priority | Blocking |
|---------|--------|----------|----------|
| Enable real API | 5 min | P0 | Yes |
| Load messages | 1-2h | P0 | Yes |
| Send messages | 30m-1h | P0 | Yes |
| Track channel state | 30m | P0 | Yes |
| WebSocket real-time | 1-2h | P1 | No |
| Typing indicators | 30m | P2 | No |
| Edit/Delete UI | 1h | P2 | No |
| Thread replies | 1-2h | P2 | No |
| Message search | 2-3h | P3 | No |
| Message reactions | 1-2h | P3 | No |

---

## Testing After Implementation

### Backend Tests (Manual or API tester)
```bash
# 1. Register user
POST http://localhost:3001/auth/register
Body: { "email": "test@example.com", "password": "test123", "name": "Test" }

# 2. Login and get token
POST http://localhost:3001/auth/login
Body: { "email": "test@example.com", "password": "test123" }
Response: { "ok": true, "value": { "token": "jwt...", "user": {...} } }

# 3. Create workspace (if API exists)
POST http://localhost:3001/v1/workspaces
Headers: Authorization: Bearer {token}
Body: { "name": "Test Workspace", "slug": "test" }

# 4. Create channel
POST http://localhost:3001/v1/workspaces/{id}/channels
Headers: Authorization: Bearer {token}
Body: { "name": "general" }

# 5. Send message
POST http://localhost:3001/v1/channels/{id}/messages
Headers: Authorization: Bearer {token}
Body: { "content": "Hello, World!" }

# 6. Get messages
GET http://localhost:3001/v1/channels/{id}/messages?limit=50
Headers: Authorization: Bearer {token}
```

### Frontend Tests
- [ ] Login page works with real credentials
- [ ] App loads with real workspaces
- [ ] Sidebar shows real channels from API
- [ ] MessagePane loads real messages
- [ ] MessageInput sends message to API
- [ ] New message appears in list
- [ ] WebSocket connects (check console)
- [ ] Message from another client appears in real-time
- [ ] Typing indicator appears when typing
- [ ] Can edit own message
- [ ] Can delete own message

---

## Files Modified Checklist

### Frontend
- [ ] `.env.local` - Enable real API
- [ ] `components/features/chat/MessagePane.tsx` - Load messages
- [ ] `components/features/chat/MessageInput.tsx` - Send messages
- [ ] `app/app/page.tsx` - Track channel state
- [ ] Create `hooks/useWebSocket.ts` - WebSocket integration
- [ ] Create `hooks/useMessages.ts` - Message state management
- [ ] Create `contexts/ChatContext.tsx` - Shared chat state

### Backend (Only if extending)
- [ ] Create `DirectMessageService.ts` - DM support
- [ ] Add message reactions endpoint
- [ ] Add message search endpoint
- [ ] Add presence tracking

---

## Common Pitfalls to Avoid

1. **Token Management**
   - Don't forget to clear token on logout
   - Handle expired token (401 response)
   - Implement token refresh if needed

2. **WebSocket**
   - Don't forget to unsubscribe from listeners (memory leak)
   - Handle disconnection and reconnection
   - Don't open multiple connections

3. **Race Conditions**
   - Load messages while sending creates issues
   - Use proper state management to prevent duplicates
   - Debounce typing indicators

4. **UI State**
   - Loading state blocks user from typing
   - Error state allows retry
   - Empty state for no messages
   - Scroll to bottom on new message

5. **Performance**
   - Paginate messages (don't load all)
   - Virtualize long lists (use react-window)
   - Debounce typing indicators
   - Optimize re-renders

---

## Architecture Diagram After Implementation

```
Frontend
├── Login/Signup (real API)
│   └── JWT Token → localStorage
├── App (context providers)
│   ├── OrganizationContext (real API)
│   ├── ChatContext (new - real-time state)
│   │   ├── messages (from API + WebSocket)
│   │   ├── typingUsers
│   │   ├── selectedChannel
│   │   └── selectedWorkspace
│   ├── Sidebar (real channels from API)
│   ├── MessagePane (real messages + WebSocket)
│   └── MessageInput (form → API + WebSocket)

Backend
├── HTTP Server (Fastify)
│   ├── Auth Routes (JWT)
│   ├── Messaging Routes
│   │   ├── Channels (CRUD)
│   │   ├── Messages (CRUD + paginate)
│   │   └── Direct Messages (new)
│   └── Structure Routes (existing)
├── WebSocket Server (Socket.IO)
│   ├── Authentication
│   ├── Room Management
│   ├── Event Broadcasting
│   └── Typing Indicators
└── Database (PostgreSQL)
    ├── users
    ├── channels
    ├── messages
    ├── direct_messages
    └── (other tables)
```

---

## Success Metrics

- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Can view real channels for workspace
- [ ] Can load message history (100+ messages)
- [ ] Can send message in real-time
- [ ] Can see new messages from others immediately
- [ ] Can see typing indicators
- [ ] Can edit/delete own messages
- [ ] App handles network errors gracefully
- [ ] WebSocket auto-reconnects on disconnect

