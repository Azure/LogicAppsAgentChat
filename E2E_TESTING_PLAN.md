# E2E Testing Plan - A2A Chat

**Mission-Critical Testing Strategy**

This document tracks the comprehensive end-to-end testing implementation for the A2A Chat client. The testing approach treats the chat client as mission-critical infrastructure where failure is not an option.

## 🚨 CRITICAL UPDATE - SSE Streaming Limitations

**Date**: 2025-10-31
**Status**: Phase 1 Complete with Important Findings

After implementing and debugging E2E tests using Playwright, we've discovered **fundamental limitations** with mocking SSE (Server-Sent Events) in Playwright. See `e2e/E2E_TESTING_FINDINGS.md` for full technical details.

### Key Finding

**Playwright's `route.fulfill()` cannot properly simulate long-lived SSE connections.** The mock sends data and immediately closes the connection before the client can process streaming events.

### What This Means

✅ **CAN Test** (10 working tests):

- UI interactions and state transitions
- Empty states, loading states, error states
- Form inputs and button clicks
- User message display
- Typing indicators
- Session management UI
- Navigation and multi-session switching

❌ **CANNOT Reliably Test**:

- Complete SSE streaming responses
- Incremental text accumulation during streaming
- Stream interruption/reconnection
- Full end-to-end chat conversations

### Revised Testing Strategy

1. **Playwright E2E (UI Layer)** ← Current implementation
   - Focus: User-visible behavior without SSE completion dependency
   - Status: ✅ 10/10 tests passing
   - Location: `e2e/tests/ui/`

2. **Integration Tests (with Real Mock Server)** ← Recommended next step
   - Use Express.js or similar to create proper SSE server
   - Status: Not yet implemented
   - Location: `e2e/tests/integration/` (to be created)

3. **E2E Tests (Staging Environment)** ← For critical flows
   - Test against real agents in staging
   - Status: Not yet implemented
   - Location: `e2e/tests/e2e/` (to be created)

---

## Implementation Status

### Phase 1: Foundation ✅

- [x] Playwright setup with multi-browser config
- [x] MSW mock server infrastructure
- [x] SSE mock helpers
- [x] Basic test helpers and utilities
- [x] First critical path test (basic chat)

### Phase 2: Critical Paths

- [ ] Complete basic chat flow test
- [ ] Authentication flow test
- [ ] Auth popup lifecycle test
- [ ] Error recovery test (network failure)
- [ ] Error recovery test (SSE disconnect)
- [ ] Error recovery test (invalid response)

### Phase 3: Feature Coverage

- [ ] Text message handling (various lengths, unicode, emojis)
- [ ] Data content messages
- [ ] Mixed content messages
- [ ] Large messages (stress test)
- [ ] Rapid-fire messages
- [ ] Message ordering preservation
- [ ] SSE connection establishment
- [ ] SSE reconnection logic
- [ ] SSE timeout handling
- [ ] Multi-session creation
- [ ] Multi-session switching
- [ ] Session persistence
- [ ] Plugin analytics events
- [ ] Plugin logger integration

### Phase 4: Edge Cases

- [ ] Empty message handling
- [ ] Whitespace-only messages
- [ ] Maximum length messages
- [ ] Special characters/injection attempts
- [ ] Rapid user actions (race conditions)
- [ ] Message send during reconnect
- [ ] Auth during message stream
- [ ] Network status changes
- [ ] Tab visibility changes
- [ ] Browser back/forward navigation
- [ ] Page refresh during operation
- [ ] Malformed SSE events
- [ ] Server errors (4xx, 5xx)
- [ ] Timeout scenarios
- [ ] Rate limiting

### Phase 5: Quality & Performance

- [ ] Keyboard navigation test
- [ ] Screen reader announcements
- [ ] Focus management
- [ ] WCAG AA compliance
- [ ] Memory leak detection (long sessions)
- [ ] Performance benchmarks
- [ ] Visual regression setup
- [ ] CI/CD integration

---

## Test Infrastructure

### 1. Playwright Configuration

**Multi-browser Support:**

- Chromium (desktop + mobile)
- Firefox (desktop)
- WebKit (desktop + mobile)

**Test Types:**

- Unit integration tests
- Iframe app standalone tests
- Cross-origin iframe embedding tests
- Performance tests
- Accessibility tests

### 2. Mock API Architecture

**SSE Mock Server Features:**

- Programmable response sequences
- Delay/timing control
- Error injection capabilities
- Connection drop simulation
- Partial message simulation
- Auth flow simulation

**Mock Scenarios:**

- ✅ Happy path responses
- ✅ Auth required flow
- ✅ Network failures
- ✅ SSE disconnections
- ✅ Malformed responses
- ✅ Server errors
- ✅ Timeout scenarios

### 3. Test Organization

```
e2e/
├── config/
│   ├── playwright.config.ts      - Multi-browser configuration
│   ├── test-helpers.ts           - Shared test utilities
│   └── mock-server.ts            - SSE mock server setup
├── fixtures/
│   ├── mock-responses.ts         - SSE response templates
│   ├── test-data.ts              - Test message data
│   └── scenarios.ts              - Reusable test scenarios
├── tests/
│   ├── critical/                 - Must-pass tests
│   │   ├── basic-chat.spec.ts
│   │   ├── auth-flow.spec.ts
│   │   └── error-recovery.spec.ts
│   ├── features/
│   │   ├── messaging.spec.ts
│   │   ├── sse-streaming.spec.ts
│   │   ├── multi-session.spec.ts
│   │   └── plugins.spec.ts
│   ├── integration/
│   │   ├── iframe-embedding.spec.ts
│   │   └── cross-origin.spec.ts
│   ├── edge-cases/
│   │   ├── network-failures.spec.ts
│   │   ├── timing-issues.spec.ts
│   │   └── boundary-conditions.spec.ts
│   ├── accessibility/
│   │   ├── keyboard-navigation.spec.ts
│   │   └── screen-reader.spec.ts
│   └── performance/
│       ├── load-testing.spec.ts
│       └── memory-leaks.spec.ts
└── utils/
    ├── sse-mock-helpers.ts       - SSE testing utilities
    ├── auth-mock-helpers.ts      - Auth flow helpers
    └── assertion-helpers.ts      - Custom assertions
```

---

## Critical Test Scenarios

### 1. Core Chat Flow (Must Never Fail)

1. ✅ User opens chat → UI visible
2. ✅ User types message → appears in input
3. ✅ User sends message → message in chat history
4. ✅ Loading state → shows during processing
5. ✅ Response streams → appears incrementally
6. ✅ Response completes → chat ready state

### 2. Authentication Flow (Must Never Fail)

1. ✅ Auth required event → consent popup opens
2. ✅ User completes auth → popup closes
3. ✅ Auth completion sent → chat continues
4. ✅ Token refresh → seamless continuation

### 3. Error Recovery (Must Never Fail)

1. ✅ Network failure → retry logic triggers
2. ✅ SSE disconnect → reconnection happens
3. ✅ Invalid response → error shown, chat usable
4. ✅ Auth failure → clear error, recovery available

---

## Test Coverage Matrix

### Message Handling

| Scenario              | Test Status | Notes                   |
| --------------------- | ----------- | ----------------------- |
| Text messages (short) | ⬜ Pending  |                         |
| Text messages (long)  | ⬜ Pending  | Test 10k+ chars         |
| Unicode/Emojis        | ⬜ Pending  | Full unicode support    |
| Data content          | ⬜ Pending  | Various JSON structures |
| Mixed content         | ⬜ Pending  | Text + data             |
| Empty message         | ⬜ Pending  | Should be blocked       |
| Whitespace only       | ⬜ Pending  | Should be blocked       |
| Rapid-fire messages   | ⬜ Pending  | Stress test             |
| Message ordering      | ⬜ Pending  | Verify order preserved  |
| Duplicate detection   | ⬜ Pending  | No duplicate rendering  |

### SSE Streaming

| Scenario                    | Test Status | Notes               |
| --------------------------- | ----------- | ------------------- |
| Successful connection       | ⬜ Pending  |                     |
| Reconnection (disconnect)   | ⬜ Pending  | Exponential backoff |
| Connection timeout          | ⬜ Pending  |                     |
| Partial message             | ⬜ Pending  | Incomplete JSON     |
| Malformed event             | ⬜ Pending  | Invalid SSE format  |
| Server error mid-stream     | ⬜ Pending  | 500 during stream   |
| Multiple concurrent streams | ⬜ Pending  | Multi-session       |
| Stream interruption         | ⬜ Pending  | Network drop        |

### Authentication

| Scenario              | Test Status | Notes               |
| --------------------- | ----------- | ------------------- |
| Initial auth required | ⬜ Pending  |                     |
| Popup lifecycle       | ⬜ Pending  | Open/close tracking |
| Multiple consent URLs | ⬜ Pending  | Sequential popups   |
| Popup blocked         | ⬜ Pending  | Fallback UI         |
| User closes popup     | ⬜ Pending  | Cancel handling     |
| Auth timeout          | ⬜ Pending  |                     |
| Invalid auth response | ⬜ Pending  |                     |
| Token expiration      | ⬜ Pending  | During active chat  |

### UI Interactions

| Scenario             | Test Status | Notes                |
| -------------------- | ----------- | -------------------- |
| Message input typing | ⬜ Pending  |                      |
| Send button states   | ⬜ Pending  | Disabled/enabled     |
| Loading indicators   | ⬜ Pending  | Shown at right times |
| Auto-scroll behavior | ⬜ Pending  | Scroll to bottom     |
| User scroll override | ⬜ Pending  | Don't auto-scroll    |
| Timestamps           | ⬜ Pending  | Correct formatting   |
| Keyboard shortcuts   | ⬜ Pending  | Enter to send        |
| Focus management     | ⬜ Pending  | After send, etc      |

### Error States

| Scenario            | Test Status | Notes            |
| ------------------- | ----------- | ---------------- |
| Network errors      | ⬜ Pending  | No connection    |
| Server errors (4xx) | ⬜ Pending  | Client errors    |
| Server errors (5xx) | ⬜ Pending  | Server errors    |
| Validation errors   | ⬜ Pending  | Invalid input    |
| Timeout errors      | ⬜ Pending  | Request timeout  |
| Rate limiting       | ⬜ Pending  | 429 responses    |
| Malformed JSON      | ⬜ Pending  | Invalid response |

---

## Success Criteria

- [ ] **100% coverage** of critical user paths
- [ ] **Zero flaky tests** in critical suite
- [ ] **All error paths** have recovery tests
- [ ] **Cross-browser compatibility** verified
- [ ] **Accessibility** WCAG AA compliance
- [ ] **Performance benchmarks** established
- [ ] **Visual regression** system operational
- [ ] **CI/CD integration** complete

---

## Mock Server API

### SSE Mock Helper Usage

```typescript
// Example: Mock successful chat response
const mockChatResponse = createSSEMock({
  messages: [{ kind: 'text', text: 'Hello! How can I help?' }],
  delay: 100, // ms
});

// Example: Mock auth required
const mockAuthRequired = createSSEMock({
  authRequired: true,
  consentUrls: ['https://consent.example.com/auth'],
});

// Example: Mock network failure
const mockNetworkFailure = createSSEMock({
  error: 'network',
  retryable: true,
});

// Example: Mock malformed response
const mockMalformedResponse = createSSEMock({
  malformed: true,
  data: 'not valid json',
});
```

---

## Timeline

| Phase                          | Duration | Target Completion |
| ------------------------------ | -------- | ----------------- |
| Phase 1: Foundation            | 1 week   | TBD               |
| Phase 2: Critical Paths        | 1 week   | TBD               |
| Phase 3: Feature Coverage      | 1 week   | TBD               |
| Phase 4: Edge Cases            | 1 week   | TBD               |
| Phase 5: Quality & Performance | 1 week   | TBD               |

---

## Notes & Decisions

### Decision Log

- **2025-10-31**: Chose Playwright over Cypress for better multi-browser support and native SSE handling
- **2025-10-31**: Using Playwright route mocking instead of MSW for better control over SSE streams
- **2025-10-31**: Created comprehensive fixtures and helpers for SSE response mocking
- **2025-10-31**: Fixed configuration issues - port mismatch (5173→3001) and missing agentCard requirement
- **2025-10-31**: Created agent card mock helpers to simplify test setup
- **2025-10-31**: Phase 1 completed - Foundation infrastructure is in place and working

### Completed in Phase 1

- ✅ Multi-browser Playwright configuration (Chromium, Firefox, WebKit, mobile)
- ✅ SSE mock response fixtures with various scenarios (success, error, streaming, auth)
- ✅ SSE mock helpers for route interception and stream simulation
- ✅ General test helper utilities (waits, interactions, assertions)
- ✅ Page Object Models for Chat interface
- ✅ Mock server configuration system
- ✅ First critical path test suite (basic-chat.spec.ts)
- ✅ Smoke test suite for basic verification
- ✅ NPM scripts for running e2e tests
- ✅ Agent card mock fixtures and helpers
- ✅ Configuration issue resolution (port mismatch, missing required params)

### Known Challenges

- SSE testing requires careful timing control - ADDRESSED with configurable delays in fixtures
- Auth popup testing needs special handling for popup blockers - Page object created, ready for testing
- Cross-origin iframe testing requires proper security configuration - To be addressed in integration tests
- Components need data-testid attributes for more robust selectors - Currently using semantic selectors

### Next Steps (Phase 2)

1. Add data-testid attributes to React components for robust selectors
2. Implement auth flow test with popup handling
3. Add error recovery tests (network, server, validation errors)
4. Create SSE reconnection test
5. Test streaming message updates

### Future Enhancements

- Load testing with thousands of messages
- Chaos engineering tests (random failures)
- Performance profiling integration
- Automated visual regression with Percy/Chromatic
