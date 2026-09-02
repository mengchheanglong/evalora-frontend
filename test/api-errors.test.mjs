import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { afterEach, test } from "node:test";
import { ApiError, apiPost, getErrorMessage } from "../src/lib/api.ts";
import * as apiPolicy from "../src/lib/api.ts";
import { isTrustedMutationOrigin } from "../src/lib/request-origin.ts";

const originalFetch = globalThis.fetch;
const SERVICE_ERROR = "Evalora could not reach the service. Please try again shortly.";

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("HTML server failures become a safe service message", async () => {
  globalThis.fetch = async () => new Response(
    "<!DOCTYPE html><html><body><pre>Error: Jest worker failed\n at ChildProcessWorker.initialize</pre></body></html>",
    { status: 500, headers: { "content-type": "text/html; charset=utf-8" } },
  );

  await assert.rejects(
    apiPost("/auth/login", { email: "owner@example.com", password: "not-a-secret" }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.message, SERVICE_ERROR);
      assert.doesNotMatch(error.message, /doctype|html|jest|stack/i);
      return true;
    },
  );
});

test("JSON 5xx details never become user-facing messages", async () => {
  globalThis.fetch = async () => Response.json(
    { message: "Prisma connection failed", stack: "Error at database.ts:42" },
    { status: 503 },
  );

  await assert.rejects(
    apiPost("/sessions", {}),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.message, SERVICE_ERROR);
      return true;
    },
  );
});

test("short JSON validation messages remain actionable", async () => {
  globalThis.fetch = async () => Response.json(
    { message: "Email must be a valid address." },
    { status: 400 },
  );

  await assert.rejects(
    apiPost("/auth/register", {}),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.message, "Email must be a valid address.");
      return true;
    },
  );
});

test("workspace invite conflict messages remain actionable", async () => {
  const conflictMessages = [
    "This person is already a member of your workspace.",
    "An account with this email already exists. Ask them to use a different work email.",
  ];

  for (const conflictMessage of conflictMessages) {
    globalThis.fetch = async () => Response.json({ message: conflictMessage }, { status: 409 });
    await assert.rejects(
      apiPost("/organization/invites", { email: "someone@example.com" }),
      (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(getErrorMessage(error, "Unable to create invitation."), conflictMessage);
        return true;
      },
    );
  }
});

test("arbitrary HTML Error objects use the caller fallback", () => {
  const message = getErrorMessage(
    new Error("<!DOCTYPE html><html><body>Internal stack trace</body></html>"),
    "Unable to sign in.",
  );

  assert.equal(message, "Unable to sign in.");
});

test("network exception details use the caller fallback", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed: connect ECONNREFUSED 127.0.0.1:4000");
  };

  try {
    await apiPost("/auth/login", {});
    assert.fail("Expected login request to fail");
  } catch (error) {
    assert.equal(getErrorMessage(error, "Unable to sign in."), "Unable to sign in.");
  }
});

test("browser Failed to fetch exceptions use the caller fallback", () => {
  assert.equal(
    getErrorMessage(new TypeError("Failed to fetch"), "Unable to load workspace."),
    "Unable to load workspace.",
  );
});

test("unrecognized machine-path exceptions use the caller fallback", () => {
  assert.equal(
    getErrorMessage(new Error("Error: connect EACCES C:\\Users\\User\\private-service.sock"), "Unable to sign in."),
    "Unable to sign in.",
  );
});

test("proxy policy strips HTML and JSON 5xx details", async () => {
  assert.equal(typeof apiPolicy.safeUpstreamErrorResponse, "function");
  const htmlResponse = await apiPolicy.safeUpstreamErrorResponse(
    new Response("<!DOCTYPE html><pre>worker stack</pre>", { status: 500, headers: { "content-type": "text/html" } }),
    "text/html",
  );
  assert.equal(htmlResponse.status, 500);
  assert.equal(htmlResponse.headers.get("content-type"), "application/json");
  assert.deepEqual(await htmlResponse.json(), { message: SERVICE_ERROR });

  const jsonResponse = await apiPolicy.safeUpstreamErrorResponse(
    Response.json({ message: "Database failed", stack: "C:\\private\\server.ts:9" }, { status: 503 }),
    "application/json",
  );
  assert.equal(jsonResponse.status, 503);
  assert.deepEqual(await jsonResponse.json(), { message: SERVICE_ERROR });
});

test("proxy policy preserves safe JSON 4xx responses", async () => {
  assert.equal(typeof apiPolicy.safeUpstreamErrorResponse, "function");
  const response = await apiPolicy.safeUpstreamErrorResponse(
    Response.json({ message: "Email must be a valid address." }, { status: 400 }),
    "application/json; charset=utf-8",
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Email must be a valid address." });
});

test("technical JSON 4xx messages never become user-facing", async () => {
  const privateMessages = [
    "Unable to read C:\\private\\service.sock",
    "Unable to read /srv/evalora/private/service.sock",
    "WorkerInitializationException: child process failed",
    "QueryFailedError: relation candidates does not exist",
    "authorization=Bearer secret-token",
    "DATABASE_URL=postgresql://owner:***@localhost:5432/evalora",
    "Connection refused at 127.0.0.1:5432",
    "Connection failed at db.internal:5432",
    "at handler (src/server.ts:42:7)",
    "See https://internal.example/debug/42",
    "clientKey => abc123-private-value",
  ];

  for (const privateMessage of privateMessages) {
    globalThis.fetch = async () => Response.json({ message: privateMessage }, { status: 400 });
    await assert.rejects(
      apiPost("/auth/login", {}),
      (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(getErrorMessage(error, "Unable to sign in."), "Request failed (400).");
        assert.doesNotMatch(error.message, /private|secret|localhost|127\.0\.0\.1|Exception|FailedError/i);
        return true;
      },
    );
  }
});

test("proxy policy rejects missing, dishonest, and malformed JSON error bodies", async () => {
  const unsafeResponses = [
    [new Response("internal diagnostic", { status: 400 }), ""],
    [new Response("<!DOCTYPE html><pre>secret stack</pre>", { status: 400, headers: { "content-type": "application/json" } }), "application/json"],
    [new Response('{"message":', { status: 400, headers: { "content-type": "application/json" } }), "application/json"],
  ];

  for (const [upstreamResponse, contentType] of unsafeResponses) {
    const response = await apiPolicy.safeUpstreamErrorResponse(upstreamResponse, contentType);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { message: SERVICE_ERROR });
  }
});

test("proxy policy reconstructs a minimal sanitized JSON 4xx payload", async () => {
  const response = await apiPolicy.safeUpstreamErrorResponse(
    Response.json(
      {
        message: "Email must be a valid address.",
        stack: "C:\\private\\server.ts:42",
        token: "must-not-leak",
      },
      { status: 400 },
    ),
    "application/json",
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Email must be a valid address." });
});

test("proxy policy replaces technical JSON 4xx messages with a safe status message", async () => {
  const response = await apiPolicy.safeUpstreamErrorResponse(
    Response.json({ message: "Unable to read C:\\private\\service.sock" }, { status: 400 }),
    "application/json",
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Request failed (400)." });
});

test("mutation origin policy accepts browser-visible localhost and LAN hosts", () => {
  const sharedInput = {
    method: "POST",
    forwardedProto: "http",
    requestOrigin: "http://0.0.0.0:3010",
  };

  assert.equal(isTrustedMutationOrigin({ ...sharedInput, origin: "http://localhost:3010", host: "localhost:3010" }), true);
  assert.equal(isTrustedMutationOrigin({ ...sharedInput, origin: "http://10.1.64.27:3010", host: "10.1.64.27:3010" }), true);
  assert.equal(isTrustedMutationOrigin({ ...sharedInput, origin: "http://malicious.example", host: "localhost:3010" }), false);
  assert.equal(isTrustedMutationOrigin({ ...sharedInput, origin: "not a URL", host: "localhost:3010" }), false);
});

test("React error boundaries never log or render raw error details", async () => {
  const boundaryUrls = [
    new URL("../src/app/error.tsx", import.meta.url),
    new URL("../src/app/global-error.tsx", import.meta.url),
  ];

  for (const boundaryUrl of boundaryUrls) {
    const source = await readFile(boundaryUrl, "utf8");
    assert.doesNotMatch(source, /console\.(?:error|log|warn)\s*\(\s*error\b/);
    assert.doesNotMatch(source, /error\.(?:message|stack|digest)\b/);
  }
});
