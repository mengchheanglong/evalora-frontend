// Concurrency + latency harness for the live interview channel.
//
// Opens N candidate sessions simultaneously, joins each session room over
// WebSocket, then measures:
//   - connect + join time per session
//   - round-trip latency (p50/p95/max) under sustained load
//   - broadcast fan-out delivery (does every joined client receive an event?)
//   - reconnect success after a forced drop
//
// Usage:
//   node scripts/load-test.mjs --sessions 25 --pings 10
//   node scripts/load-test.mjs --sessions 50 --pings 5 --api http://localhost:4000/api
//
// Requires a workspace token + template so it can create the sessions:
//   LOAD_TEST_TOKEN=<jwt> LOAD_TEST_TEMPLATE=<templateId> node scripts/load-test.mjs
import { io } from "socket.io-client";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith("--")) pairs.push([value.slice(2), all[index + 1]]);
    return pairs;
  }, []),
);

const API = args.api ?? process.env.LOAD_TEST_API ?? "http://localhost:4000/api";
const WS = API.replace(/\/api\/?$/, "") + "/interview";
const SESSIONS = Number(args.sessions ?? 20);
const PINGS = Number(args.pings ?? 10);
const TOKEN = args.token ?? process.env.LOAD_TEST_TOKEN;
const TEMPLATE_ID = args.template ?? process.env.LOAD_TEST_TEMPLATE;

if (!TOKEN || !TEMPLATE_ID) {
  console.error("Set LOAD_TEST_TOKEN and LOAD_TEST_TEMPLATE (or pass --token/--template).");
  process.exit(1);
}

const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` };
const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};
const ms = (n) => `${n.toFixed(1)} ms`;

async function createSession(index) {
  const response = await fetch(`${API}/sessions`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      templateId: TEMPLATE_ID,
      candidateName: `Load Candidate ${index}`,
      candidateEmail: `load-${Date.now()}-${index}@loadtest.local`,
    }),
  });
  if (!response.ok) throw new Error(`create session ${index}: ${response.status}`);
  const session = await response.json();
  await fetch(`${API}/sessions/access/${encodeURIComponent(session.accessCode)}/start`, { method: "PUT" });
  return session;
}

function connectAndJoin(session) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = io(WS, { auth: { accessCode: session.accessCode }, transports: ["websocket"], reconnection: true });
    const fail = setTimeout(() => resolve({ socket, ok: false, joinMs: null }), 20_000);
    socket.on("connect", async () => {
      try {
        const result = await socket.emitWithAck("session.join", { accessCode: session.accessCode });
        clearTimeout(fail);
        resolve({ socket, ok: Boolean(result?.ok), joinMs: Date.now() - startedAt, session });
      } catch {
        clearTimeout(fail);
        resolve({ socket, ok: false, joinMs: null, session });
      }
    });
    socket.on("connect_error", () => { clearTimeout(fail); resolve({ socket, ok: false, joinMs: null, session }); });
  });
}

console.log(`\nLoad test → ${SESSIONS} concurrent sessions, ${PINGS} pings each\n${"─".repeat(58)}`);

// 1. Create every session in parallel (also exercises concurrent REST writes).
const createStart = Date.now();
const created = await Promise.allSettled(Array.from({ length: SESSIONS }, (_, i) => createSession(i)));
const sessions = created.filter((r) => r.status === "fulfilled").map((r) => r.value);
console.log(`1. Session creation      ${sessions.length}/${SESSIONS} in ${Date.now() - createStart} ms` +
  ` (${((Date.now() - createStart) / Math.max(1, sessions.length)).toFixed(0)} ms/session)`);

// 2. Connect + join all sockets at once.
const joinStart = Date.now();
const clients = await Promise.all(sessions.map(connectAndJoin));
const joined = clients.filter((c) => c.ok);
const joinTimes = joined.map((c) => c.joinMs).filter((n) => typeof n === "number");
console.log(`2. Concurrent WS joins   ${joined.length}/${sessions.length} in ${Date.now() - joinStart} ms` +
  ` · join p50 ${ms(percentile(joinTimes, 50))} · p95 ${ms(percentile(joinTimes, 95))}`);

// 3. Sustained round-trip latency with every client active at once.
const latencies = [];
for (let round = 0; round < PINGS; round += 1) {
  const results = await Promise.all(
    joined.map(async ({ socket }) => {
      const sentAt = Date.now();
      try {
        await socket.emitWithAck("session.ping", { sentAt });
        return Date.now() - sentAt;
      } catch {
        return null;
      }
    }),
  );
  latencies.push(...results.filter((n) => typeof n === "number"));
}
console.log(`3. Round-trip latency    ${latencies.length} samples · p50 ${ms(percentile(latencies, 50))}` +
  ` · p95 ${ms(percentile(latencies, 95))} · max ${ms(Math.max(0, ...latencies))}`);

// 4. Broadcast fan-out: one REST write must reach the matching client.
let delivered = 0;
const sample = joined.slice(0, Math.min(10, joined.length));
await Promise.all(
  sample.map(async ({ socket, session }) => {
    const received = new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), 8_000);
      socket.once("interviewer-question.sent", () => { clearTimeout(timer); resolve(true); });
    });
    await fetch(`${API}/interviewer-follow-ups/session/${session.id}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ questionText: "Load test broadcast probe question.", required: false, idempotencyKey: `load-${session.id}` }),
    });
    if (await received) delivered += 1;
  }),
);
console.log(`4. Broadcast delivery    ${delivered}/${sample.length} clients received the push`);

// 5. Forced reconnect: every dropped client must come back and resume.
const reconnectSample = joined.slice(0, Math.min(10, joined.length));
let resumed = 0;
await Promise.all(
  reconnectSample.map(({ socket, session }) => new Promise((resolve) => {
    const timer = setTimeout(resolve, 15_000);
    socket.once("connect", async () => {
      try {
        const result = await socket.emitWithAck("session.join", { accessCode: session.accessCode });
        if (result?.ok && result.snapshot) resumed += 1;
      } catch { /* counted as a failure */ }
      clearTimeout(timer);
      resolve();
    });
    socket.io.engine.close(); // simulate a network drop
  })),
);
console.log(`5. Reconnect + resume    ${resumed}/${reconnectSample.length} recovered with a full snapshot`);

console.log(`${"─".repeat(58)}`);
console.log(`Peak concurrent sockets: ${joined.length}`);
console.log(`Sessions created:        ${sessions.length}`);
console.log(`Latency p95 under load:  ${ms(percentile(latencies, 95))}\n`);

for (const { socket } of clients) socket.disconnect();
process.exit(0);
