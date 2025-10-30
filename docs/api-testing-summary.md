# API Testing Summary - Key Discoveries

Date: 2025-10-28
Agent URL: `https://igniteagent-dffghpd2f2bedxdn.canadacentral-01.azurewebsites.net/api/agents/IgniteHelper`

## Executive Summary

Successfully tested the A2A server history APIs and discovered several critical differences from documentation that will impact implementation. The good news: **chat names ARE supported** via `context/update`, and the core functionality works as expected.

## Critical Discoveries

### 1. ✅ Chat Names ARE Supported

- **Initial finding**: `contexts/list` doesn't include `name` field by default
- **Resolution**: `context/update` with `Name` parameter successfully adds the name
- **Impact**: We CAN store chat names server-side, but must explicitly set them
- **Implementation**: Auto-generate names after first message and call `context/update`

### 2. ⚠️ Method Name Inconsistency

- **Documentation says**: `contexts/update`
- **Reality is**: `context/update` (singular!)
- **Impact**: Must use correct method name or API returns `MethodNotFound` error

### 3. ⚠️ Lowercase Enum Values

All enum-like string values are lowercase, not PascalCase as documented:

| Documented                            | Actual                                |
| ------------------------------------- | ------------------------------------- |
| `role: "User" \| "Agent"`             | `role: "user" \| "agent"`             |
| `kind: "Text" \| "Message" \| "Task"` | `kind: "text" \| "message" \| "task"` |
| `state: "Completed"`                  | `state: "completed"`                  |

**Impact**: All type definitions and string comparisons must use lowercase.

### 4. 🤔 Duplicate Status Fields

Tasks have both `taskStatus` and `status` fields with identical data.

```json
{
  "taskStatus": { "state": "completed", "message": {...}, "timestamp": "..." },
  "status": { "state": "completed", "message": {...}, "timestamp": "..." }
}
```

**Question for backend team**: Which field is canonical? Which should we use?

### 5. 📅 Message Timestamps in Metadata

Messages have timestamps in a nested `metadata` object:

```json
{
  "messageId": "...",
  "role": "agent",
  "parts": [...],
  "metadata": {
    "timestamp": "10/29/2025 12:03:40 AM"
  },
  "kind": "message"
}
```

**Date Format**: `MM/DD/YYYY hh:mm:ss AM/PM`

### 6. ↕️ Message Order in History

The `history` array appears to be in reverse chronological order (newest first):

1. Agent response (later)
2. User query (earlier)

**Impact**: Must reverse when displaying or verify this is consistent behavior.

### 7. 🆕 Context Status Field

Contexts include a `status` field (e.g., `"Running"`) not mentioned in docs.

**Questions**: What are all possible status values? Should we filter/display based on status?

## Tested API Endpoints

### ✅ contexts/list

```json
{
  "jsonrpc": "2.0",
  "method": "contexts/list",
  "params": {
    "limit": 5,
    "includeLastTask": true,
    "includeArchived": false
  }
}
```

**Works as expected**. Returns contexts array, respects filters.

### ✅ tasks/list

```json
{
  "jsonrpc": "2.0",
  "method": "tasks/list",
  "params": {
    "Id": "<context-id>"
  }
}
```

**Works as expected**. Returns tasks with full history arrays.

### ✅ context/update (Note: singular!)

```json
{
  "jsonrpc": "2.0",
  "method": "context/update",
  "params": {
    "Id": "<context-id>",
    "Name": "New Name"
  }
}
```

**Works perfectly**. Sets name, updates timestamp, returns updated context.

### ⏳ Not Yet Tested

- **Archiving**: `context/update` with `isArchived: true`
- **Name persistence**: Does name appear in subsequent `contexts/list` calls?
- **contexts/create**: How do we create a new context?
- **Multiple tasks**: Message ordering with multiple tasks

## Updated Type Definitions

```typescript
// Actual server types based on testing
type ServerContext = {
  id: string;
  name?: string; // Optional - set via context/update
  isArchived: boolean;
  createdAt: string; // "MM/DD/YYYY hh:mm:ss AM/PM"
  updatedAt: string;
  status: string; // "Running", etc.
  lastTask?: ServerTask;
};

type ServerTask = {
  id: string;
  contextId: string;
  taskStatus: ServerTaskStatus; // Use this one
  status: ServerTaskStatus; // Duplicate - ignore?
  history: ServerMessage[]; // May be reverse chronological
  kind: 'task'; // lowercase
};

type ServerTaskStatus = {
  state: string; // "completed", "running", etc. (lowercase)
  message: ServerMessage;
  timestamp: string;
};

type ServerMessage = {
  messageId: string;
  taskId: string;
  contextId: string;
  role: 'user' | 'agent'; // lowercase!
  parts: ServerMessagePart[];
  metadata: {
    timestamp: string; // Message-level timestamp
  };
  kind: 'message'; // lowercase
};

type ServerMessagePart =
  | { text: string; kind: 'text' } // lowercase
  | { data: unknown; kind: 'data' }; // lowercase
```

## Implementation Impact

### Name Handling Strategy

**✅ DECISION**: If `name` is not present, display the context `id` as the name.

1. **On Chat Display**:
   - Check if `name` field exists in context
   - If yes: display `context.name`
   - If no: display `context.id`

2. **On Chat Rename**:
   - Call `context/update` with new name
   - Update local state
   - Future displays will show the custom name

3. **On Chat Creation**:
   - Context auto-creates on first message (no explicit name needed)
   - User can optionally rename later via UI

### Data Transformation

All transformations must account for:

- ✅ Lowercase enum values
- ✅ Optional `name` field
- ✅ Message timestamps in `metadata.timestamp`
- ✅ Possible reverse chronological order in history
- ✅ Duplicate status fields (choose one)
- ✅ US date format parsing

## Questions for Backend Team

1. **Name Persistence**: After `context/update` sets a name, does it persist in `contexts/list`?
2. **Context Creation**: Do we call `contexts/create` explicitly, or does the first message auto-create?
3. **Status vs TaskStatus**: Which field is canonical? Can we ignore one?
4. **History Order**: Is history always reverse chronological?
5. **Context Status Values**: What are all possible values for `context.status`?
6. **Date Format**: Is the format always US (MM/DD/YYYY)? Does it respect user locale?
7. **Archive Behavior**: When we set `isArchived: true`, does it immediately stop appearing in lists?

## Next Steps

1. ✅ **Update type definitions** in migration plan with actual types
2. ✅ **Update API method names** (context/update is singular)
3. ⏳ **Test archiving** functionality
4. ⏳ **Test name persistence** with fresh auth token
5. ⏳ **Test contexts/create** to understand context creation flow
6. ⏳ **Clarify questions** with backend team
7. 🚀 **Begin implementation** of Step 1 (API layer)

## Test Artifacts

- Full response samples: `/tmp/contexts-list-response.json`, `/tmp/tasks-list-response.json`
- Test context ID: `08584399106709302333364558984CU00`
- Test messages: User "test" → Agent response about Ignite Conference

## Confidence Level

| Aspect                  | Confidence | Notes               |
| ----------------------- | ---------- | ------------------- |
| contexts/list structure | ✅ High    | Tested, documented  |
| tasks/list structure    | ✅ High    | Tested, documented  |
| context/update name     | ✅ High    | Tested successfully |
| context/update archive  | 🟡 Medium  | Not yet tested      |
| Name persistence        | 🟡 Medium  | Needs verification  |
| Message ordering        | 🟡 Medium  | Needs more tests    |
| Date format consistency | 🟡 Medium  | Only saw one format |

## Conclusion

The API is **functional and usable** for our migration. The main adjustments needed:

1. Use lowercase values everywhere
2. Use `context/update` (singular)
3. Implement name generation and setting logic
4. Handle optional `name` field with fallbacks
5. Parse US date format correctly
6. Reverse history arrays if needed

See `docs/api-testing-findings.md` for detailed findings.
