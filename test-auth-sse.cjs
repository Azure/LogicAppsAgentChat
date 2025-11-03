// Quick test to see the auth SSE output
const { randomUUID } = require('crypto');

function createSSEMessage(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

const requestId = 'test-123';
const taskId = `task-${randomUUID()}`;
const contextId = `ctx-${randomUUID()}`;

const authEvent = createSSEMessage({
  jsonrpc: '2.0',
  id: requestId,
  result: {
    taskId,
    contextId,
    kind: 'status-update',
    status: {
      state: 'auth-required',
      timestamp: new Date().toLocaleString('en-US'),
      message: {
        role: 'assistant',
        parts: [
          {
            kind: 'data',
            data: {
              messageType: 'InTaskAuthRequired',
              consentLink: 'https://consent.example.com/auth',
              status: 'Unauthenticated',
              serviceName: 'Microsoft Graph',
              serviceIcon: 'https://example.com/icons/graph.png',
              description: 'Access to your Microsoft Graph data is required'
            }
          }
        ]
      }
    },
    final: false
  }
});

console.log('Auth SSE Event:');
console.log(authEvent);
console.log('\nParsed JSON:');
const jsonStr = authEvent.substring(6, authEvent.length - 2); // Remove 'data: ' and '\n\n'
console.log(JSON.stringify(JSON.parse(jsonStr), null, 2));
