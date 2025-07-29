# Chat History API Design

## Overview

This document outlines the design for server-side chat history APIs that eliminate the need for browser-side storage in the A2A Chat SDK. The design follows the A2A protocol specification while providing efficient history retrieval and management capabilities using A2A terminology (contexts and tasks).

## Goals

1. **Zero Browser Storage**: All chat history is stored server-side
2. **Seamless Experience**: Users can refresh or switch devices without losing context
3. **Performance**: Efficient retrieval with pagination and filtering
4. **A2A Compliance**: Follow A2A protocol patterns and conventions

## Core Concepts

In alignment with A2A protocol:

- **Context**: A logical grouping of related interactions (conversation thread)
- **Task**: Individual message exchanges within a context
- **Message**: The actual content exchanged between user and agent

## API Design

### 1. Get Contexts

Retrieve all contexts (conversation threads) for the authenticated user.

```typescript
GET /api/chat/contexts (all urls are placeholder)

Query Parameters:
- limit?: number (default: 20, max: 100)
- before?: string (contextId for pagination)
- after?: string (contextId for pagination)
- sortBy?: 'createdAt' | 'updatedAt' (default: 'updatedAt')
- sortOrder?: 'asc' | 'desc' (default: 'desc')

Response:
{
  "contexts": [
    {
      "contextId": "ctx_abc123",
      "title": "Product Support Chat",
      "createdAt": "2024-01-29T10:00:00Z",
      "updatedAt": "2024-01-29T10:30:00Z",
      "lastTask": {
        "taskId": "task_789",
        "state": "completed",
        "lastMessage": {
          "text": "Thank you for your help!",
          "role": "user",
          "timestamp": "2024-01-29T10:30:00Z"
        }
      },
    }
  ],
  "total": 45,
  "hasMore": true
}
```

### 2. Get Context Tasks

Retrieve all tasks within a specific context.

```typescript
GET /api/chat/contexts/{contextId}/tasks

Query Parameters:
- limit?: number (default: 20, max: 100)
- before?: string (taskId for pagination)
- after?: string (taskId for pagination)
- includeMessages?: boolean (default: false, if true includes message history)

Response:
{
  "contextId": "ctx_abc123",
  "tasks": [
    {
      "taskId": "task_123",
      "state": "active",
      "createdAt": "2024-01-29T10:00:00Z",
      "updatedAt": "2024-01-29T10:05:00Z",
      "messageCount": 3,
      "messages": [ // only if includeMessages=true
        {
          "messageId": "msg_789",
          "role": "user",
          "parts": [
            {
              "kind": "text",
              "text": "How can I reset my password?"
            }
          ],
          "timestamp": "2024-01-29T10:00:00Z"
        },
        {
          "messageId": "msg_790",
          "role": "agent",
          "parts": [
            {
              "kind": "text",
              "text": "I can help you reset your password..."
            }
          ],
          "timestamp": "2024-01-29T10:01:00Z"
        }
      ]
    }
  ],
  "hasMore": false
}
```

### 3. Get Task History

Retrieve detailed message history for a specific task.

```typescript
GET /api/chat/tasks/{taskId}/messages

Query Parameters:
- limit?: number (default: 50, max: 200)
- before?: string (messageId for pagination)
- after?: string (messageId for pagination)

Response:
{
  "taskId": "task_123",
  "contextId": "ctx_abc123",
  "state": "active",
  "messages": [
    {
      "messageId": "msg_789",
      "role": "user",
      "parts": [
        {
          "kind": "text",
          "text": "How can I reset my password?"
        }
      ],
      "timestamp": "2024-01-29T10:00:00Z",
      "metadata": {}
    },
    {
      "messageId": "msg_790",
      "role": "agent",
      "parts": [
        {
          "kind": "text",
          "text": "I can help you reset your password..."
        },
        {
          "kind": "data",
          "data": {
            "type": "password_reset_link",
            "url": "https://example.com/reset"
          }
        }
      ],
      "timestamp": "2024-01-29T10:01:00Z"
    }
  ],
  "artifacts": [ // if any artifacts were generated
    {
      "artifactId": "artifact_123",
      "name": "reset_instructions.md",
      "type": "text/markdown",
      "content": "..."
    }
  ],
  "hasMore": false
}
```

### 7. Update Context Metadata

Update context title or other metadata.

```typescript
PATCH /api/chat/contexts/{contextId}
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "title"?: string,
  "metadata"?: {},
  "archived"?: boolean
}

Response:
{
  "contextId": "ctx_abc123",
  "title": "Chat 123"
  "updated": true,
  "updatedAt": "2024-01-29T10:40:00Z"
}
```
