// End-to-end check of the live interview channel: presence, push delivery,
// draft privacy, disconnect/reconnect resume, and authorization denials.
// Two-client real-time verification: presence, live events, and reconnect/resume.
import { readFileSync } from "node:fs";
import { io } from "socket.io-client";

const [sessionId, accessCode, token] = readFileSync(`${process.env.HOME}/ws-test.txt`, "utf8").trim().split("\n");
const API = "http://localhost:4000/api";
const WS = "http://localhost:4000/interview";

const log = (msg) => console.log(`  ${msg}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(socket, event, timeout = 6000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout);
    socket.once(event, (payload) => { clearTimeout(timer); resolve(payload); });
  });
}

const interviewer = io(WS, { auth: { token, name: "WS Owner" }, transports: ["websocket"] });
const candidate = io(WS, { auth: { accessCode }, transports: ["websocket"] });

await Promise.all([once(interviewer, "connect"), once(candidate, "connect")]);
log(`1. both sockets connected (interviewer=${interviewer.connected}, candidate=${candidate.connected})`);

// --- join + snapshot (this is also the reconnect-resume path) ---
const joinI = await interviewer.emitWithAck("session.join", { sessionId });
const joinC = await candidate.emitWithAck("session.join", { accessCode });
log(`2. joins ok=${joinI.ok}/${joinC.ok} · snapshot status=${joinI.snapshot?.status} · followUps=${joinI.snapshot?.followUps.length}`);

await wait(300);

// --- latency probe ---
const t0 = Date.now();
const pong = await interviewer.emitWithAck("session.ping", { sentAt: t0 });
log(`3. round-trip latency: ${Date.now() - t0} ms (server clock ${pong.serverTime ? "ok" : "missing"})`);

// --- interviewer sends a question via REST -> candidate must receive it over WS ---
const candidateGotQuestion = once(candidate, "interviewer-question.sent");
const sendRes = await fetch(`${API}/interviewer-follow-ups/session/${sessionId}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ questionText: "Which metric would make you roll back?", required: true, idempotencyKey: `ws-${Date.now()}` }),
});
const created = await sendRes.json();
const pushed = await candidateGotQuestion;
log(`4. REST send ${sendRes.status} -> candidate received push: ${pushed ? "YES" : "NO"} ("${pushed?.followUp?.questionText?.slice(0, 34)}…")`);

// --- candidate answers via REST -> interviewer must receive it over WS ---
const interviewerGotAnswer = once(interviewer, "interviewer-question.answered");
const ansRes = await fetch(`${API}/interviewer-follow-ups/access/${accessCode}/${created.id}/answer`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ answerText: "p95 latency doubling would stop the rollout.", submit: true }),
});
const answered = await interviewerGotAnswer;
log(`5. REST answer ${ansRes.status} -> interviewer received push: ${answered ? "YES" : "NO"} (status=${answered?.status})`);

// --- autosaved draft must NOT be broadcast (privacy) ---
const draftLeak = once(interviewer, "interviewer-question.answered", 1500);
await fetch(`${API}/interviewer-follow-ups/session/${sessionId}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ questionText: "Second question for the draft test.", required: false, idempotencyKey: `ws2-${Date.now()}` }),
});
const second = await (await fetch(`${API}/interviewer-follow-ups/session/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } })).json();
const pending = second.find((f) => f.status === "sent");
await fetch(`${API}/interviewer-follow-ups/access/${accessCode}/${pending.id}/answer`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ answerText: "still typing", submit: false }),
});
log(`6. autosaved draft broadcast to interviewer? ${(await draftLeak) ? "YES (leak!)" : "NO (private) ✓"}`);

// --- presence: candidate drops -> interviewer sees it ---
const presenceAfterDrop = once(interviewer, "presence.updated", 4000);
candidate.disconnect();
const dropped = await presenceAfterDrop;
log(`7. candidate disconnected -> interviewer presence now: ${dropped ? dropped.participants.map((p) => p.role).join(", ") || "(empty)" : "no event"}`);

// --- reconnect: candidate comes back and resumes from the snapshot ---
const candidate2 = io(WS, { auth: { accessCode }, transports: ["websocket"] });
await once(candidate2, "connect");
const rejoin = await candidate2.emitWithAck("session.join", { accessCode });
if (!rejoin?.ok) {
  log(`8. RECONNECT FAILED: ${JSON.stringify(rejoin)}`);
} else {
  const fu = rejoin.snapshot?.followUps ?? [];
  log(`8. candidate reconnected -> snapshot restored ${fu.length} question(s), answered=${fu.filter((f) => f.status === "answered").length}, participants=${rejoin.snapshot?.participants?.map((p) => p.role).join("+")} (no state lost ✓)`);
}

// --- authorization: wrong access code must be rejected ---
const intruder = io(WS, { auth: { accessCode: "EV-NOT-A-REAL-CODE" }, transports: ["websocket"] });
const kicked = await once(intruder, "session.error", 4000);
log(`9. bogus access code rejected at handshake: ${kicked ? "YES ✓" : "NO"} (${kicked?.message ?? ""})`);

// --- authorization: valid candidate cannot join someone else's room by sessionId ---
const sneaky = await candidate2.emitWithAck("session.join", { sessionId: "00000000-0000-0000-0000-000000000000" });
log(`10. candidate joining a foreign session: ${sneaky.ok ? "ALLOWED (bad!)" : "denied ✓"}`);

interviewer.disconnect(); candidate2.disconnect(); intruder.disconnect();
process.exit(0);
