/**
 * Socket.io fuzz tester for VibeMap server.
 *
 * Usage:
 *   node fuzz.js [SERVER_URL]
 *
 * Defaults to http://localhost:4000. Requires the server to be running.
 * Install deps first: npm install socket.io-client
 */

'use strict';

const { io } = require('socket.io-client');

const SERVER_URL = process.argv[2] || 'http://localhost:4000';
const TIMEOUT_MS = 300; // ms between payloads

// ── Fuzz payload library ────────────────────────────────────────────────────

const EDGE_STRINGS = [
  '',
  ' ',
  '\x00',
  '\n\r\t',
  'A'.repeat(100_000),
  '{"__proto__":{"polluted":true}}',
  '${7*7}',
  '<script>alert(1)</script>',
  "'; DROP TABLE vibe_logs; --",
  '../../../etc/passwd',
  null,
  undefined,
];

const EDGE_NUMBERS = [
  0,
  -1,
  Infinity,
  -Infinity,
  NaN,
  Number.MAX_SAFE_INTEGER,
  Number.MIN_SAFE_INTEGER,
  1e308,
  -1e308,
  1.7976931348623157e308,
];

const EDGE_VALUES = [
  ...EDGE_STRINGS,
  ...EDGE_NUMBERS,
  [],
  {},
  [1, 2, 3],
  { nested: { deeply: { value: 'x' } } },
  true,
  false,
  Symbol('sym'),
  () => {},
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let pass = 0;
let fail = 0;
let warn = 0;

function log(status, event, payload, note = '') {
  const label = { PASS: '\x1b[32mPASS\x1b[0m', FAIL: '\x1b[31mFAIL\x1b[0m', WARN: '\x1b[33mWARN\x1b[0m' }[status];
  const short = JSON.stringify(payload, (_k, v) =>
    typeof v === 'string' && v.length > 60 ? v.slice(0, 60) + '…' : v
  );
  console.log(`  [${label}] ${event.padEnd(20)} payload=${short}${note ? '  ← ' + note : ''}`);
  if (status === 'PASS') pass++;
  else if (status === 'FAIL') fail++;
  else warn++;
}

// ── Fuzz cases per event ────────────────────────────────────────────────────

const CASES = {
  update_location: [
    // Valid baseline
    { userId: 'user-1', lat: 40.75, lng: -73.98 },
    // Missing fields
    { lat: 40.75, lng: -73.98 },
    { userId: 'user-1', lng: -73.98 },
    { userId: 'user-1', lat: 40.75 },
    {},
    // Type confusion on coords
    ...EDGE_NUMBERS.map((n) => ({ userId: 'u', lat: n, lng: n })),
    // userId edge cases
    ...EDGE_STRINGS.map((s) => ({ userId: s, lat: 40.75, lng: -73.98 })),
    // Totally wrong types
    null,
    undefined,
    42,
    'string payload',
    [],
    // Prototype pollution attempt
    JSON.parse('{"__proto__":{"admin":true},"userId":"x","lat":0,"lng":0}'),
    // Oversized userId
    { userId: 'x'.repeat(1_000_000), lat: 0, lng: 0 },
    // Out-of-range coordinates
    { userId: 'u', lat: 91, lng: 181 },
    { userId: 'u', lat: -91, lng: -181 },
  ],

  set_vibe: [
    // Valid baseline
    { lat: 40.75, lng: -73.98, vibeType: 'chill' },
    // Missing fields
    { lat: 40.75, lng: -73.98 },
    { vibeType: 'chill' },
    {},
    // SQL injection in vibeType
    ...["' OR '1'='1", "'; DROP TABLE vibe_logs;--", "chill\x00evil"].map((v) => ({
      lat: 40.75, lng: -73.98, vibeType: v,
    })),
    // Numeric/null vibeType
    { lat: 40.75, lng: -73.98, vibeType: null },
    { lat: 40.75, lng: -73.98, vibeType: 0 },
    { lat: 40.75, lng: -73.98, vibeType: {} },
    // Extreme coords
    ...EDGE_NUMBERS.map((n) => ({ lat: n, lng: n, vibeType: 'chill' })),
    // Massive string
    { lat: 0, lng: 0, vibeType: 'x'.repeat(1_000_000) },
    null,
    'not an object',
  ],

  join_video_room: [
    'room-1',
    '',
    null,
    undefined,
    42,
    {},
    [],
    'x'.repeat(1_000_000),
    '../secret',
    '<img src=x onerror=alert(1)>',
    '\x00\x01\x02',
  ],

  rtc_offer: [
    { to: 'socket-abc', offer: { type: 'offer', sdp: 'v=0\r\n' } },
    { to: '', offer: {} },
    { to: null, offer: null },
    { offer: { type: 'offer', sdp: '' } },
    { to: 'socket-abc' },
    {},
    null,
    { to: 'x'.repeat(100_000), offer: 'x'.repeat(100_000) },
  ],

  rtc_answer: [
    { to: 'socket-abc', answer: { type: 'answer', sdp: 'v=0\r\n' } },
    { to: null, answer: null },
    {},
    null,
    { to: 'x'.repeat(100_000), answer: {} },
  ],

  rtc_ice_candidate: [
    { to: 'socket-abc', candidate: { candidate: 'candidate:...', sdpMid: '0' } },
    { to: null, candidate: null },
    { to: 'x', candidate: {} },
    {},
    null,
    { to: 'x'.repeat(100_000), candidate: 'x'.repeat(100_000) },
  ],
};

// ── Runner ──────────────────────────────────────────────────────────────────

async function runFuzz() {
  console.log(`\n\x1b[1mVibeMap Socket.io Fuzzer\x1b[0m`);
  console.log(`Target: ${SERVER_URL}\n`);

  // First check the health endpoint
  try {
    const res = await fetch(`${SERVER_URL}/health`);
    const body = await res.json();
    console.log(`Health check: ${JSON.stringify(body)}\n`);
  } catch (e) {
    console.error(`\x1b[31mCannot reach server at ${SERVER_URL}\x1b[0m`);
    console.error('Start the server first: node index.js\n');
    process.exit(1);
  }

  const socket = io(SERVER_URL, { reconnection: false, timeout: 5000 });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });

  console.log(`Connected as ${socket.id}\n`);

  // Listen for any server-emitted errors
  socket.onAny((event, ...args) => {
    if (event === 'error') {
      log('WARN', 'server-error', args, 'server emitted error event');
    }
  });

  for (const [event, payloads] of Object.entries(CASES)) {
    console.log(`\x1b[1m${event}\x1b[0m (${payloads.length} cases)`);

    for (const payload of payloads) {
      // Track whether the socket drops during emission
      const wasConnected = socket.connected;

      try {
        socket.emit(event, payload);
        await delay(TIMEOUT_MS);

        if (!socket.connected && wasConnected) {
          log('FAIL', event, payload, 'server closed connection');
        } else {
          log('PASS', event, payload);
        }
      } catch (err) {
        log('FAIL', event, payload, err.message);
      }
    }

    console.log('');
  }

  socket.disconnect();

  console.log('─'.repeat(60));
  console.log(
    `Results: \x1b[32m${pass} passed\x1b[0m  \x1b[31m${fail} failed\x1b[0m  \x1b[33m${warn} warnings\x1b[0m`
  );

  if (fail > 0) {
    console.log('\n\x1b[31mFailed cases indicate the server crashed or dropped the connection.\x1b[0m');
    process.exit(1);
  } else {
    console.log('\n\x1b[32mServer handled all payloads without crashing.\x1b[0m');
    process.exit(0);
  }
}

runFuzz().catch((err) => {
  console.error('Fuzzer error:', err.message);
  process.exit(1);
});
