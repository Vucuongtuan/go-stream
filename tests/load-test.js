import http from 'k6/http';
import { sleep } from 'k6';

// k6 configurations
export const options = {
  scenarios: {
    // Scenario 1: Users listening to SSE Chat stream (Simulates continuous connection)
    chat_listeners: {
      executor: 'constant-vus',
      vus: 100, // 100 concurrent listeners
      duration: '30s',
      exec: 'listenToChatStream',
    },
    // Scenario 2: Active users sending chat messages concurrently
    chat_senders: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 messages sent per second overall
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 50,
      exec: 'sendChatMessage',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // Http error rate should be less than 1%
    http_req_duration: ['p(95)<200'], // 95% of request durations should be under 200ms
  },
};

const BASE_URL = 'http://localhost'; // Routes requests through Nginx proxy port 80

// 1. Scenario: Simulate User opening Stream connection to listen to Chat
export function listenToChatStream() {
  const roomId = 1;
  const url = `${BASE_URL}/api/rooms/${roomId}/chat/stream`;

  const params = {
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
    timeout: '35s', // Ensure k6 doesn't close connection prematurely during the 30s test duration
  };

  // k6 will block here keeping the HTTP connection open, simulating SSE stream listener
  const res = http.get(url, params);

  // Assertions
  if (res.status !== 200) {
    console.error(`Failed SSE connection: status ${res.status}`);
  }
}

// 2. Scenario: Simulate Users sending chat messages (HTTP POST)
export function sendChatMessage() {
  const roomId = 1;
  const url = `${BASE_URL}/api/rooms/${roomId}/chat`;

  const payload = JSON.stringify({
    content: `Test Message from k6 load test! Timestamp: ${new Date().toISOString()}`,
    user_id: Math.floor(Math.random() * 1000) + 1,
    user_name: `User_${__VU}`,
    avatar: 'https://i.pravatar.cc/150',
    type: 'text',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  if (res.status !== 201) {
    console.error(`Failed to send chat: status ${res.status}, body: ${res.body}`);
  }

  // Brief pause between requests
  sleep(0.5);
}
