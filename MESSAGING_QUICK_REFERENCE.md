# Hive Messaging - Quick Reference Guide

## Current State at a Glance

| Component | Status | Details |
|-----------|--------|---------|
| **Backend API** | ✅ Ready | All endpoints working |
| **WebSocket Server** | ✅ Ready | Connected to all features |
| **Database** | ✅ Ready | All tables and indexes in place |
| **Frontend Auth** | ✅ Ready | Login/Signup functional |
| **Frontend Messaging** | ❌ Mocked | UI only, no real data |

---

## Backend Messaging API (Working)

### Authentication
```
POST /auth/register
POST /auth/login
GET /auth/me
```

### Channels
```
GET  /v1/workspaces/{workspaceId}/channels
GET  /v1/channels/{id}
```

### Messages
```
GET    /v1/channels/{id}/messages?limit=50&before={date}
POST   /v1/channels/{id}/messages
PATCH  /v1/messages/{id}
DELETE /v1/messages/{id}
```

### WebSocket Events
```
# Client → Server
join-workspace {workspaceId}
join-channel {channelId}
leave-channel {channelId}
typing-start {channelId}
typing-stop {channelId}

# Server → Client
message {channelId, message}
user-typing {userId, channelId}
user-stopped-typing {userId, channelId}
```

---

## Frontend Files Needing Changes

### High Priority (Blocking)
```
hive-platform/components/features/chat/
├── MessagePane.tsx          ← Remove hardcoded messages
└── MessageInput.tsx         ← Add form submission

hive-platform/app/app/page.tsx
└── Add selected channel state

hive-platform/.env.local
└── Set NEXT_PUBLIC_USE_REAL_BACKEND=true
```

### Medium Priority
```
hive-platform/hooks/
├── useWebSocket.ts (NEW)    ← Connect WebSocket
└── useMessages.ts (NEW)     ← Manage message state

hive-platform/contexts/
└── ChatContext.tsx (NEW)    ← Share real-time state
```

---

## Key Code Snippets

### Enable Real API
```typescript
// .env.local
NEXT_PUBLIC_USE_REAL_BACKEND=true
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### Load Messages
```typescript
// components/features/chat/MessagePane.tsx
import { api } from '@/lib/api/client';

export function MessagePane({ channelId }: { channelId: string }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      const result = await api.messages.list(channelId);
      if (result.ok) setMessages(result.value);
      setLoading(false);
    };
    loadMessages();
  }, [channelId]);

  if (loading) return <div>Loading...</div>;
  
  return (
    <ScrollArea>
      {messages.map(msg => (
        <div key={msg.id}>
          <span>{msg.user}</span>
          <p>{msg.content}</p>
        </div>
      ))}
    </ScrollArea>
  );
}
```

### Send Messages
```typescript
// components/features/chat/MessageInput.tsx
export function MessageInput({ channelId }: { channelId: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setLoading(true);
    const result = await api.messages.send(channelId, { content });
    
    if (result.ok) {
      setContent('');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input 
        value={content} 
        onChange={(e) => setContent(e.target.value)}
        placeholder="Message #general"
      />
      <Button type="submit" disabled={loading || !content.trim()}>
        {loading ? "Sending..." : "Send"}
      </Button>
    </form>
  );
}
```

### WebSocket Integration
```typescript
// hooks/useWebSocket.ts
import { useEffect } from 'react';
import { 
  connectWebSocket, 
  onMessage, 
  offMessage,
  joinChannel,
  leaveChannel 
} from '@/lib/api/websocket';

export function useWebSocket(
  channelId: string,
  onNewMessage: (message: any) => void
) {
  useEffect(() => {
    const socket = connectWebSocket();
    if (!socket) return;

    joinChannel(channelId);

    const handleMessage = (data: any) => {
      if (data.channelId === channelId) {
        onNewMessage(data.message);
      }
    };

    onMessage(handleMessage);

    return () => {
      offMessage(handleMessage);
      leaveChannel(channelId);
    };
  }, [channelId, onNewMessage]);
}
```

---

## Database Schema Quick Reference

### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  channel_id UUID REFERENCES channels,
  user_id UUID REFERENCES users ON DELETE SET NULL,
  content TEXT NOT NULL,
  thread_id UUID REFERENCES messages,  -- For replies
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Channels Table
```sql
CREATE TABLE channels (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces,
  name TEXT NOT NULL,
  description TEXT,
  type channel_type,  -- 'core', 'workstream', 'committee'
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(workspace_id, name)  -- Unique per workspace
);
```

---

## API Client Methods

```typescript
// Authentication
api.auth.register({ email, password, name })
api.auth.login({ email, password })
api.auth.logout()

// Channels
api.channels.list(workspaceId)
api.channels.get(id)

// Messages
api.messages.list(channelId, { limit?, before? })
api.messages.send(channelId, { content, threadId? })
api.messages.edit(id, content)
api.messages.delete(id)
```

---

## Common Tasks

### Check if Backend is Running
```bash
curl http://localhost:3001/health
```

### Test Authentication
```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Message API
```bash
# Get messages (need valid JWT token)
curl http://localhost:3001/v1/channels/{channelId}/messages \
  -H "Authorization: Bearer {token}"

# Send message
curl -X POST http://localhost:3001/v1/channels/{channelId}/messages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello!"}'
```

---

## Debugging Checklist

- [ ] Backend running on port 3001?
- [ ] Frontend can reach API (check NEXT_PUBLIC_API_URL)?
- [ ] WebSocket URL correct (check NEXT_PUBLIC_WS_URL)?
- [ ] JWT token stored in localStorage?
- [ ] Bearer token attached to requests?
- [ ] WebSocket connects without errors (check browser console)?
- [ ] Database has test data (channels, messages)?
- [ ] Environment variable USE_REAL_BACKEND is true?

---

## Performance Considerations

1. **Message Pagination**: Always use `limit` parameter, default 50
2. **WebSocket Listeners**: Unsubscribe when component unmounts
3. **Typing Debounce**: Don't emit on every keystroke
4. **Message Deduplication**: Check IDs before adding to state
5. **Virtual Scrolling**: For 1000+ messages, use react-window

---

## Security Notes

- JWT expires based on JWT_EXPIRES_IN (default: 24h)
- Password hashed with bcrypt (10 rounds)
- Message ownership checked on edit/delete
- WebSocket requires valid JWT token
- All API endpoints require authentication
- SQL injection prevented with parameterized queries

---

## Next Steps

1. Set `NEXT_PUBLIC_USE_REAL_BACKEND=true`
2. Modify MessagePane to load real messages
3. Modify MessageInput to send messages
4. Connect WebSocket in MessagePane
5. Add typing indicators
6. Add edit/delete UI

Estimated time: **4-6 hours** for core functionality.

