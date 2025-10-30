# Server-Side Chat History Migration Plan

## Overview

This plan outlines the migration from browser-based storage (localStorage/IndexedDB) to server-side chat history using A2A protocol APIs. The goal is zero browser storage with all chat history managed server-side.

## Key Requirements

1. **Archived = Deleted**: Archived chats should not be shown in the UI (treat as deleted)
2. **Delete = Archive**: Delete operations should call the archive API (isArchived: true)
3. **Context = Chat Session**: Server contexts map to our chat sessions/threads
4. **Tasks = Messages**: Each task contains the message history for that exchange
5. **Server Format Differs**: Need to transform server response format to our internal format

## Server API Summary

### Available Endpoints

1. **contexts/list** - Get all chat sessions
   - Supports pagination (before/after)
   - Can include/exclude archived
   - Can include last task
   - Returns contexts with optional lastTask

2. **tasks/list** - Get all messages in a context
   - Takes contextId
   - Returns array of tasks with history arrays
   - Each history item is a message

3. **context/update** - Update context metadata (⚠️ method name is SINGULAR!)
   - Update name (rename)
   - Update isArchived (delete/archive)

## Architecture Changes

### Phase 1: API Client Layer

**Location**: `packages/a2a-core/src/api/history-api.ts` (new file)

Create typed API client functions:

```typescript
// Types
type ListContextsParams = {
  limit?: number;
  before?: string;
  after?: string;
  includeLastTask?: boolean;
  includeArchived?: boolean;
};

type UpdateContextParams = {
  id: string;
  name?: string;
  isArchived?: boolean;
};

// Functions
- listContexts(agentUrl: string, params?: ListContextsParams): Promise<Context[]>
- listTasks(agentUrl: string, contextId: string): Promise<Task[]>
- updateContext(agentUrl: string, params: UpdateContextParams): Promise<Context>

// Note: Method name is "context/update" (singular), not "contexts/update"
```

**Key Implementation Details**:

- Use the same SSE/JSON-RPC pattern as existing agent communication
- POST to `{agentUrl}` with JSON-RPC method
- Handle authentication the same way as chat messages
- Use Zod schemas for response validation

### Phase 2: Type Definitions

**Location**: `packages/a2a-core/src/types/history-types.ts` (new file)

Define server response types and our internal types:

```typescript
// Server Response Types (ACTUAL - tested against live API)
type ServerContext = {
  id: string;
  name?: string; // Optional - only present if set via context/update
  isArchived: boolean;
  createdAt: string; // Format: "MM/DD/YYYY hh:mm:ss AM/PM"
  updatedAt: string;
  status: string; // e.g., "Running"
  lastTask?: ServerTask;
};

type ServerTask = {
  id: string;
  contextId: string;
  taskStatus: {
    state: string; // lowercase: "completed", not "Completed"
    message: ServerMessage;
    timestamp: string;
  };
  status: {
    // Duplicate of taskStatus - use taskStatus
    state: string;
    message: ServerMessage;
    timestamp: string;
  };
  history: ServerMessage[]; // May be reverse chronological
  kind: 'task'; // lowercase, not "Task"
};

type ServerMessage = {
  messageId: string;
  taskId: string;
  contextId: string;
  role: 'user' | 'agent'; // lowercase, not "User" | "Agent"
  parts: Array<
    | { text: string; kind: 'text' } // lowercase
    | { data: unknown; kind: 'data' }
  >;
  metadata: {
    timestamp: string; // Message-level timestamp
  };
  kind: 'message'; // lowercase, not "Message"
};

// Internal Types (what we use in the UI)
type ChatSession = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message;
  messageCount?: number;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent[];
  timestamp: Date;
  contextId: string;
};
```

### Phase 3: Data Transformation Layer

**Location**: `packages/a2a-core/src/api/history-transformers.ts` (new file)

Create functions to transform server format to internal format:

```typescript
// Transform server context to our ChatSession
function transformContext(serverContext: ServerContext): ChatSession {
  // Map server fields to our internal format:
  // - Use name if present, otherwise use id as fallback
  // - Parse createdAt/updatedAt strings to Date objects (MM/DD/YYYY format)
  // - Extract last message from lastTask.history if present
  // - Reverse history array if needed (may be reverse chronological)
  // - Use taskStatus (not status) for task state
  // - Parse metadata.timestamp for message times
  return {
    id: serverContext.id,
    name: serverContext.name ?? serverContext.id, // Fallback to id
    createdAt: new Date(serverContext.createdAt),
    updatedAt: new Date(serverContext.updatedAt),
    lastMessage: serverContext.lastTask ? extractLastMessage(serverContext.lastTask) : undefined,
  };
}

// Transform server task history to our Message array
function transformTasksToMessages(serverTasks: ServerTask[]): Message[] {
  // Flatten all task histories into a single message array
  // Sort by timestamp
  // Transform message format (role, parts, etc.)
}

// Transform our message to server format (for sending)
function transformMessageToServer(message: Message): ServerMessage {
  // Convert our format to server's expected format
}
```

**Key Transformations**:

1. **Context → ChatSession**:
   - `id` → `id` (same)
   - `name` → `name` OR fallback to `id` if name is absent
   - `createdAt` string → `Date` object (parse US date format)
   - `updatedAt` string → `Date` object
   - `lastTask.history[last]` → `lastMessage` (may need to reverse array first)
   - Ignore `status` field, use `taskStatus`

2. **Task History → Messages**:
   - Flatten all tasks' history arrays
   - Each history item becomes a Message
   - ⚠️ **IMPORTANT**: `role: "user"|"agent"` (lowercase!) → `role: "user"|"assistant"`
   - `parts` array → `content` array
   - Use `metadata.timestamp` for message time
   - Check if history is reverse chronological and reverse if needed

3. **Parts Transformation**:
   - Server uses `{text: string, kind: "text"}` (lowercase!)
   - Server uses `{data: unknown, kind: "data"}` (lowercase!)
   - Map to our internal MessageContent format
   - Handle both text and data parts

### Phase 4: Storage Abstraction Interface

**Location**: `packages/a2a-core/src/storage/history-storage.ts` (modify existing)

Create interface that works with both local and server storage:

```typescript
interface ChatHistoryStorage {
  // Chat Sessions
  listSessions(): Promise<ChatSession[]>;
  createSession(name?: string): Promise<ChatSession>;
  getSession(id: string): Promise<ChatSession | null>;
  updateSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession>;
  deleteSession(id: string): Promise<void>;

  // Messages
  listMessages(sessionId: string): Promise<Message[]>;
  addMessage(sessionId: string, message: Message): Promise<void>;

  // Utility
  clear(): Promise<void>;
}
```

### Phase 5: Server Storage Implementation

**Location**: `packages/a2a-core/src/storage/server-history-storage.ts` (new file)

Implement the storage interface using server APIs:

```typescript
class ServerHistoryStorage implements ChatHistoryStorage {
  constructor(
    private agentUrl: string,
    private getAuthToken?: () => Promise<string>
  ) {}

  async listSessions(): Promise<ChatSession[]> {
    // Call listContexts with includeArchived: false, includeLastTask: true
    // Transform response with transformContext
    // Sort by updatedAt desc
  }

  async createSession(name?: string): Promise<ChatSession> {
    // Server creates context automatically when first message is sent
    // So this might be a no-op or generate a local ID until first message
    // Return a new session object with pending state
  }

  async getSession(id: string): Promise<ChatSession | null> {
    // Call listContexts with includeLastTask: true
    // Filter to find the specific context
    // Or call listTasks and get metadata from there
  }

  async updateSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession> {
    // Call contexts/update
    // Transform name update → server Name
    // Handle other updates as needed
  }

  async deleteSession(id: string): Promise<void> {
    // Call contexts/update with isArchived: true
    // This is the key requirement: delete = archive
  }

  async listMessages(sessionId: string): Promise<Message[]> {
    // Call listTasks(sessionId)
    // Transform with transformTasksToMessages
    // Return sorted chronologically
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    // This happens through normal chat flow (tasks/invoke)
    // Not a separate history operation
    // Might be a no-op or optimistic update to cache
  }

  async clear(): Promise<void> {
    // Archive all contexts
    // Or might not be supported server-side
  }
}
```

**Key Implementation Notes**:

- Cache responses in memory to avoid excessive API calls
- Use includeLastTask: true when listing sessions to avoid extra calls
- Handle authentication the same way as chat messages
- Implement retry logic for failed requests

### Phase 6: Update Chat Store

**Location**: `packages/a2a-core/src/react/store/chatStore.ts` (modify)

Update Zustand store to use the storage abstraction:

```typescript
interface ChatStore {
  // Existing fields
  messages: Message[];
  isLoading: boolean;

  // New fields
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoadingSessions: boolean;
  isLoadingMessages: boolean;
  sessionError: string | null;

  // Updated actions
  loadSessions: () => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  createNewSession: (name?: string) => Promise<ChatSession>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
}
```

**Key Changes**:

1. Replace localStorage calls with storage.listSessions()
2. Add loading states for async operations
3. Add error handling
4. Implement session switching
5. Clear messages when switching sessions

### Phase 7: Configuration Update

**Location**: `packages/a2a-core/src/config.ts` (modify)

Add configuration option for storage type:

```typescript
interface A2AChatConfig {
  // Existing config
  agentUrl: string;

  // New config
  storage?: {
    type: 'browser' | 'server';
    // If server, use ServerHistoryStorage
    // If browser, use existing localStorage implementation
  };

  // Or simpler:
  useServerHistory?: boolean; // default: false for backward compatibility
}
```

### Phase 8: Update React Components

**Location**: Various component files

Components that need updates:

1. **ChatInterface.tsx**:
   - Add loading states for sessions
   - Show error messages if session loading fails
   - Handle empty states

2. **ChatHistory.tsx** (or sidebar):
   - Display sessions from store
   - Add rename functionality
   - Add delete (archive) functionality
   - Filter out archived sessions

3. **MessageList.tsx**:
   - Handle loading state while fetching messages
   - Show skeleton/loading indicator

**Key UI Considerations**:

- Show loading spinners during async operations
- Disable interactions while loading
- Show error messages gracefully
- Implement optimistic updates where appropriate

### Phase 9: Migration Strategy

**For Existing Users with Local Data**:

1. **Option A - No Migration** (Recommended for MVP):
   - Users start fresh with server storage
   - Old data remains in localStorage but isn't shown
   - Simplest implementation

2. **Option B - One-time Migration**:
   - On first load with server storage enabled:
     - Read from localStorage
     - For each local session, check if exists on server
     - If not, create on server
     - Send all messages to server
     - Mark migration complete in localStorage
   - More complex but preserves history

**Recommendation**: Start with Option A. Add Option B later if user feedback demands it.

## Implementation Plan

### Step 1: Foundation (API Layer)

- [ ] Create `history-types.ts` with all type definitions
- [ ] Create Zod schemas for API response validation
- [ ] Create `history-api.ts` with API client functions
- [ ] Write tests for API functions (mock responses)

### Step 2: Transformation Layer

- [ ] Create `history-transformers.ts`
- [ ] Implement `transformContext()`
- [ ] Implement `transformTasksToMessages()`
- [ ] Write comprehensive transformation tests

### Step 3: Storage Implementation

- [ ] Create `ChatHistoryStorage` interface
- [ ] Refactor existing localStorage code to implement interface (backward compatibility)
- [ ] Create `ServerHistoryStorage` class
- [ ] Write integration tests with mock server

### Step 4: Store Integration

- [ ] Update `chatStore.ts` with new fields and actions
- [ ] Replace localStorage calls with storage interface
- [ ] Add error handling and loading states
- [ ] Test store with both storage implementations

### Step 5: Configuration

- [ ] Add storage configuration to config
- [ ] Create factory function to instantiate correct storage
- [ ] Update initialization code

### Step 6: UI Updates

- [ ] Add loading states to components
- [ ] Implement session management UI
- [ ] Add error handling UI
- [ ] Test user flows end-to-end

### Step 7: Testing & Polish

- [ ] Integration tests with real server (if available)
- [ ] Manual testing of all flows
- [ ] Performance testing (caching strategy)
- [ ] Documentation updates

## Testing Strategy

### Unit Tests

- API client functions with mocked fetch
- Transformation functions with sample server data
- Storage implementation with mocked API client
- Store actions with mocked storage

### Integration Tests

- Full flow: list sessions → select session → load messages
- Create session → send message → verify storage
- Delete session → verify archived on server
- Rename session → verify updated on server

### Manual Testing

- Test with real server endpoints
- Verify pagination works
- Test error scenarios (network failures, auth failures)
- Test edge cases (empty history, very long history)

## Rollout Strategy

### Phase 1: Feature Flag

- Deploy with `useServerHistory: false` by default
- Allow opt-in for testing
- Monitor for issues

### Phase 2: Gradual Rollout

- Enable for new users first
- Enable for percentage of existing users
- Monitor error rates and performance

### Phase 3: Full Rollout

- Enable for all users
- Keep localStorage implementation for fallback
- Plan deprecation timeline for localStorage

## Open Questions

1. **Context Name Field**: Does contexts/list always return a `name` field?
   - **Assumption**: Yes, based on contexts/update response showing name field
   - **Question**: Is name required or optional? What's the default if not set?
   - **Impact**: Affects whether we need fallback name generation logic

2. **Session Creation**: Does the server auto-create context on first message, or do we need explicit context/create API?
   - **Impact**: Affects how createSession() is implemented

3. **Pagination**: How do we handle large message lists in a context?
   - **Current**: tasks/list returns all tasks
   - **Question**: Is there pagination for tasks?
   - **Impact**: May need to implement virtual scrolling or lazy loading

4. **Real-time Updates**: If user has multiple tabs/devices, how do we sync?
   - **Question**: Are there webhooks or polling needed?
   - **Impact**: May need polling or WebSocket for multi-device sync

5. **Authentication**: How do history APIs handle auth?
   - **Assumption**: Same as chat (SSE with auth flow)
   - **Verify**: Test with auth-required scenarios

6. **Offline Support**: What happens when server is unreachable?
   - **Question**: Fall back to localStorage temporarily?
   - **Impact**: Affects user experience and implementation complexity

7. **Message Deduplication**: How do we handle messages that are in-flight?
   - **Question**: Use optimistic updates + reconciliation?
   - **Impact**: Affects message sending flow

## Success Criteria

- [ ] Zero browser storage used for chat history
- [ ] Users can refresh and see full history
- [ ] Users can switch devices and see same history
- [ ] Delete operation archives (not permanent delete)
- [ ] Archived chats never shown in UI
- [ ] Rename operation persists across sessions
- [ ] Performance is acceptable (< 2s to load session list)
- [ ] Error handling is graceful (no crashes)
- [ ] All existing features continue to work

## Files to Create

1. `packages/a2a-core/src/api/history-api.ts`
2. `packages/a2a-core/src/api/history-transformers.ts`
3. `packages/a2a-core/src/types/history-types.ts`
4. `packages/a2a-core/src/storage/history-storage.ts` (interface)
5. `packages/a2a-core/src/storage/server-history-storage.ts`
6. `packages/a2a-core/src/storage/browser-history-storage.ts` (refactor existing)

## Files to Modify

1. `packages/a2a-core/src/react/store/chatStore.ts`
2. `packages/a2a-core/src/config.ts`
3. `packages/a2a-core/src/react/components/ChatInterface.tsx`
4. `packages/a2a-core/src/react/components/ChatHistory.tsx` (if exists)
5. `packages/a2a-core/src/react/components/MessageList.tsx`

## Timeline Estimate

- **Step 1-2** (Foundation + Transformation): 2-3 days
- **Step 3** (Storage Implementation): 2-3 days
- **Step 4** (Store Integration): 1-2 days
- **Step 5** (Configuration): 0.5 day
- **Step 6** (UI Updates): 2-3 days
- **Step 7** (Testing & Polish): 2-3 days

**Total**: 10-15 days for full implementation and testing

## Risks & Mitigations

| Risk                                    | Impact | Mitigation                           |
| --------------------------------------- | ------ | ------------------------------------ |
| Server API changes during development   | High   | Lock API contract, use versioning    |
| Performance issues with large histories | Medium | Implement pagination, caching        |
| Breaking existing users' workflows      | High   | Feature flag, gradual rollout        |
| Authentication complexity               | Medium | Follow existing SSE auth pattern     |
| Data loss during migration              | High   | Don't auto-migrate, let users opt-in |

## Next Steps

1. **Review this plan** with team
2. **Clarify open questions** with backend team
3. **Set up test server** for integration testing
4. **Begin Step 1** implementation
5. **Regular check-ins** to adjust plan as needed
