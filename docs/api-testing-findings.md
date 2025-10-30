# API Testing Findings - Actual vs Documented

## Summary

Testing the actual API revealed several important differences from the documented specification. This document captures the real API behavior to ensure accurate implementation.

## Key Findings

### 1. ✅ RESOLVED: `name` Field is Optional but Supported

**Finding**: The `name` field is NOT returned by default in `contexts/list`, BUT can be set via `context/update` and IS supported!

**Default Response** (no name):

```json
{
  "id": "08584399106709302333364558984CU00",
  "isArchived": false,
  "createdAt": "10/29/2025 12:03:34 AM",
  "updatedAt": "10/29/2025 12:03:35 AM",
  "status": "Running",
  "lastTask": { ... }
}
```

**After `context/update`** (with name):

```json
{
  "id": "08584399106709302333364558984CU00",
  "name": "Test Chat Name",
  "isArchived": false,
  "createdAt": "10/29/2025 12:03:34 AM",
  "updatedAt": "10/29/2025 12:13:37 AM",
  "status": "Running"
}
```

**Impact**:

- Server DOES support storing chat names via `context/update`
- Name field is optional and only present when explicitly set
- Need to set name on context creation or after first message
- Need fallback logic for contexts without names: "New Chat", "Chat from [date]", or first message preview

**Action Items**:

- ✅ Confirmed: `context/update` with `Name` parameter works
- ⏳ Verify: Does `name` persist in `contexts/list` response? (Need fresh token to test)
- Implement: Auto-generate and set names when creating new chats
- Implement: Fallback display logic for unnamed contexts

### 2. Lowercase Field Values (not documented)

**Finding**: All enum-like values are lowercase, not PascalCase as documented.

**Documented**:

- `role: "User" | "Agent"`
- `kind: "Text" | "Message" | "Task"`
- `state: "Completed"`

**Actual**:

- `role: "user" | "agent"`
- `kind: "text" | "message" | "task"`
- `state: "completed"`

**Impact**:

- Type definitions must use lowercase
- String comparisons must use lowercase
- Don't rely on documentation casing

### 3. Duplicate `status` and `taskStatus` Fields

**Finding**: Tasks have both `taskStatus` and `status` fields with identical data.

**Actual Structure**:

```json
{
  "id": "...",
  "taskStatus": {
    "state": "completed",
    "message": { ... },
    "timestamp": "..."
  },
  "status": {
    "state": "completed",
    "message": { ... },
    "timestamp": "..."
  },
  "history": [ ... ]
}
```

**Impact**:

- Use `taskStatus` for consistency with documentation
- Ignore `status` field (appears to be duplicate/legacy)
- Or prefer `status` if that's the newer field - need clarification

### 4. Messages Have `metadata.timestamp`

**Finding**: Messages include a nested timestamp in metadata, separate from task timestamp.

**Actual Structure**:

```json
{
  "messageId": "366bbbde6ce84dc08f55103d0f3b5131",
  "role": "agent",
  "parts": [ ... ],
  "metadata": {
    "timestamp": "10/29/2025 12:03:40 AM"
  },
  "kind": "message"
}
```

**Impact**:

- Use `metadata.timestamp` for message-level timestamps
- Task-level `taskStatus.timestamp` appears to be different (possibly completion time)
- Need to parse both timestamps for accurate message ordering

### 5. History Order is Reverse Chronological

**Finding**: Messages in `history` array appear in reverse chronological order (newest first).

**Actual Order in History**:

1. Agent response (later message)
2. User query (earlier message)

**Impact**:

- Must reverse the history array when displaying messages
- Or verify if this is consistent and document the behavior
- Check if this is always true or context-specific

### 6. Context Status Field

**Finding**: Contexts have a `status: "Running"` field not mentioned in docs.

**Actual**:

```json
{
  "id": "...",
  "status": "Running",
  "isArchived": false,
  ...
}
```

**Impact**:

- Track context status (Running, Completed, Failed?)
- May need to filter by status in addition to isArchived
- Could be useful for UI indicators

## Tested API Calls

### ✅ contexts/list

**Request**:

```json
{
  "jsonrpc": "2.0",
  "id": "test-1",
  "method": "contexts/list",
  "params": {
    "limit": 5,
    "includeLastTask": true,
    "includeArchived": false
  }
}
```

**Response**: ✅ Works as expected (except missing `name` field)

- Returns array of contexts
- `includeLastTask` includes full task with history
- `includeArchived: false` filters out archived contexts

### ✅ tasks/list

**Request**:

```json
{
  "jsonrpc": "2.0",
  "id": "test-2",
  "method": "tasks/list",
  "params": {
    "Id": "08584399106709302333364558984CU00"
  }
}
```

**Response**: ✅ Works as expected

- Returns array of tasks for the context
- Each task includes `history` array with all messages
- Duplicate `status`/`taskStatus` fields

### ✅ context/update (TESTED - Method name is singular!)

**CRITICAL**: The method name is `context/update` (singular), NOT `contexts/update` (plural)!

**Discovered Methods** (from error message):

- `message/send`
- `tasks/get`
- `message/stream`
- `message/post`
- `contexts/create`
- `contexts/list`
- `tasks/list`
- `context/update` ⚠️ (singular!)

**Request**:

```json
{
  "jsonrpc": "2.0",
  "id": "test-3",
  "method": "context/update",
  "params": {
    "Id": "08584399106709302333364558984CU00",
    "Name": "Test Chat Name"
  }
}
```

**Response**: ✅ Works perfectly!

```json
{
  "jsonrpc": "2.0",
  "id": "test-3",
  "result": {
    "id": "08584399106709302333364558984CU00",
    "name": "Test Chat Name",
    "isArchived": false,
    "createdAt": "10/29/2025 12:03:34 AM",
    "updatedAt": "10/29/2025 12:13:37 AM",
    "status": "Running"
  }
}
```

**Key Findings**:

1. ✅ Setting `Name` via `context/update` WORKS
2. ✅ Response includes the `name` field
3. ✅ `updatedAt` timestamp updated correctly
4. ⏳ Need to verify `name` persists in `contexts/list` (token expired during testing)
5. ⏳ Still need to test archive functionality

## Updated Type Definitions

Based on actual responses:

```typescript
// Server Response Types (ACTUAL, not documented)
type ServerContext = {
  id: string;
  name?: string; // Optional - only present if set via context/update
  isArchived: boolean;
  createdAt: string; // Format: "10/29/2025 12:03:34 AM"
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
    // Duplicate of taskStatus
    state: string;
    message: ServerMessage;
    timestamp: string;
  };
  history: ServerMessage[]; // Appears to be reverse chronological
  kind: 'task'; // lowercase
};

type ServerMessage = {
  messageId: string;
  taskId: string;
  contextId: string;
  role: 'user' | 'agent'; // lowercase, not "User" | "Agent"
  parts: Array<
    | { text: string; kind: 'text' } // lowercase
    | { data: unknown; kind: 'data' } // lowercase
  >;
  metadata: {
    timestamp: string; // Message-level timestamp
  };
  kind: 'message'; // lowercase
};
```

## Date Format

**Format**: `"MM/DD/YYYY hh:mm:ss AM/PM"`
**Examples**:

- `"10/29/2025 12:03:34 AM"`
- `"10/29/2025 12:03:40 AM"`

**Parsing Strategy**:

```typescript
const parseServerDate = (dateStr: string): Date => {
  // Use Date constructor or date parsing library
  return new Date(dateStr);
};
```

## Next Steps

### Immediate Actions

1. ✅ Test `contexts/update` to see if we can set/retrieve names
2. ⏳ Verify message history ordering (is it always reverse chronological?)
3. ⏳ Test archiving with `contexts/update`
4. ⏳ Test with multiple tasks in a context to see full history

### Implementation Updates Needed

1. **Remove name assumption from types**
   - Change `ServerContext.name` to optional or remove
   - Implement name generation logic

2. **Use lowercase enums everywhere**
   - Update all type definitions
   - Update transformers to expect lowercase

3. **Handle duplicate status fields**
   - Decide which to use (taskStatus or status)
   - Document the choice

4. **Parse metadata timestamps**
   - Use `metadata.timestamp` for message times
   - Handle date format properly

5. **Reverse history arrays**
   - Ensure messages display in chronological order
   - Document the reversal logic

## Questions for Backend Team

1. **Context Names**: Is there a way to set/retrieve context names via the API?
2. **Status Fields**: Why are both `status` and `taskStatus` present? Which should we use?
3. **History Order**: Is the history array always reverse chronological, or can it vary?
4. **Date Format**: Is the date format always US format (MM/DD/YYYY)? Does it respect locale?
5. **Context Status**: What are all possible values for context `status` field?

## Test Data

### Test Context ID

`08584399106709302333364558984CU00`

### Test Task ID

`08584399106709902886792621495_08584399106709302333364558984CU00`

### Test Messages

- User: "test"
- Agent: "I can only help with questions about the Microsoft Ignite Conference..."

See `/tmp/contexts-list-response.json` and `/tmp/tasks-list-response.json` for full responses.
