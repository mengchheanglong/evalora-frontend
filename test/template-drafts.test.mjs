import test from "node:test";
import assert from "node:assert/strict";
import {
  DRAFT_UPLOAD_ACCEPT,
  MAX_DRAFT_CHAT_HISTORY_TURNS,
  MAX_DRAFT_CHAT_MESSAGE_LENGTH,
  MAX_DRAFT_UPLOAD_BYTES,
  generateDraftFromDocument,
  generateDraftFromIdea,
  getDraft,
  listDrafts,
  updateDraft,
  chatWithDraft,
  confirmDraft,
  discardDraft,
} from "../src/lib/template-drafts.ts";
import { ApiError } from "../src/lib/api.ts";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("MAX_DRAFT_UPLOAD_BYTES is 5 MB and DRAFT_UPLOAD_ACCEPT covers expected extensions", () => {
  assert.equal(MAX_DRAFT_UPLOAD_BYTES, 5 * 1024 * 1024);
  assert.equal(MAX_DRAFT_CHAT_MESSAGE_LENGTH, 2000);
  assert.equal(MAX_DRAFT_CHAT_HISTORY_TURNS, 12);
  assert.ok(DRAFT_UPLOAD_ACCEPT.includes(".pdf"));
  assert.ok(DRAFT_UPLOAD_ACCEPT.includes(".docx"));
  assert.ok(DRAFT_UPLOAD_ACCEPT.includes(".txt"));
  assert.ok(DRAFT_UPLOAD_ACCEPT.includes(".md"));
});

test("generateDraftFromDocument rejects files over 5 MB before network request", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return Response.json({});
  };

  const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" });
  await assert.rejects(
    generateDraftFromDocument({ file: largeFile }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 413);
      assert.match(error.message, /larger than 5 MB/i);
      return true;
    },
  );
  assert.equal(fetchCalled, false);
});

test("generateDraftFromDocument parses actionable 4xx messages from upload endpoint", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Could not read text from this file." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });

  const validFile = new File([new Uint8Array(100)], "jd.txt", { type: "text/plain" });
  await assert.rejects(
    generateDraftFromDocument({ file: validFile }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.message, "Could not read text from this file.");
      return true;
    },
  );
});

test("generateDraftFromDocument maps 429 and 401 upload statuses to helpful copy", async () => {
  const validFile = new File([new Uint8Array(100)], "jd.txt", { type: "text/plain" });

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Too many requests" }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });

  await assert.rejects(
    generateDraftFromDocument({ file: validFile }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 429);
      assert.match(error.message, /wait a few minutes/i);
      return true;
    },
  );

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

  await assert.rejects(
    generateDraftFromDocument({ file: validFile }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 401);
      assert.match(error.message, /session has expired/i);
      return true;
    },
  );
});

test("generateDraftFromDocument returns draft DTO on 200 response", async () => {
  const mockDto = {
    id: "draft-123",
    status: "draft",
    source: "document",
    provider: "deepseek",
    draft: {
      title: "Backend Engineer Assessment",
      description: "Backend screen",
      roleType: "Backend Engineer",
      timeLimitMin: 60,
      warnings: [],
      modules: [],
    },
    aiProposal: {
      title: "Backend Engineer Assessment",
      description: "Backend screen",
      roleType: "Backend Engineer",
      timeLimitMin: 60,
      warnings: [],
      modules: [],
    },
  };

  globalThis.fetch = async () =>
    new Response(JSON.stringify(mockDto), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const validFile = new File([new Uint8Array(100)], "jd.txt", { type: "text/plain" });
  const result = await generateDraftFromDocument({ file: validFile, roleType: "Backend Engineer" });
  assert.equal(result.id, "draft-123");
  assert.equal(result.draft.roleType, "Backend Engineer");
});

test("generateDraftFromIdea calls POST /templates/drafts with trimmed idea and role", async () => {
  let capturedUrl = "";
  let capturedBody = "";

  globalThis.fetch = async (url, options) => {
    capturedUrl = String(url);
    capturedBody = String(options?.body);
    return new Response(
      JSON.stringify({
        id: "draft-456",
        status: "draft",
        source: "prompt",
        provider: "deepseek",
        draft: { title: "QA Engineer Assessment", roleType: "QA Engineer", timeLimitMin: 60, modules: [], warnings: [] },
        aiProposal: { title: "QA Engineer Assessment", roleType: "QA Engineer", timeLimitMin: 60, modules: [], warnings: [] },
      }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  };

  const result = await generateDraftFromIdea({ idea: "Senior QA engineer for web apps", roleType: "QA Engineer" });
  assert.equal(result.id, "draft-456");
  assert.ok(capturedUrl.includes("/templates/drafts"));
  const parsed = JSON.parse(capturedBody);
  assert.equal(parsed.idea, "Senior QA engineer for web apps");
  assert.equal(parsed.roleType, "QA Engineer");
});

test("chatWithDraft caps history to MAX_DRAFT_CHAT_HISTORY_TURNS", async () => {
  let capturedBody = "";

  globalThis.fetch = async (url, options) => {
    capturedBody = String(options?.body);
    return new Response(
      JSON.stringify({
        applied: true,
        reply: "I added a coding module.",
        draft: { id: "draft-789", status: "draft" },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const manyTurns = Array.from({ length: 20 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `Turn ${i + 1}`,
  }));

  const result = await chatWithDraft("draft-789", {
    message: "Make the coding question harder",
    history: manyTurns,
  });

  assert.equal(result.applied, true);
  assert.equal(result.reply, "I added a coding module.");
  const parsed = JSON.parse(capturedBody);
  assert.equal(parsed.history.length, MAX_DRAFT_CHAT_HISTORY_TURNS);
  assert.equal(parsed.history[parsed.history.length - 1].content, "Turn 20");
});

test("listDrafts, getDraft, updateDraft, confirmDraft, discardDraft invoke corresponding endpoints and methods", async () => {
  const calls = [];

  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), method: options?.method || "GET", body: options?.body });
    const u = String(url);
    if (u.endsWith("/templates/drafts") && (!options?.method || options?.method === "GET")) {
      return new Response(JSON.stringify([{ id: "draft-1", title: "Test", status: "draft" }]), { status: 200 });
    }
    if (u.endsWith("/templates/drafts/draft-1") && (!options?.method || options?.method === "GET")) {
      return new Response(JSON.stringify({ id: "draft-1", status: "draft" }), { status: 200 });
    }
    if (u.endsWith("/templates/drafts/draft-1") && options?.method === "PATCH") {
      return new Response(JSON.stringify({ id: "draft-1", status: "draft" }), { status: 200 });
    }
    if (u.endsWith("/templates/drafts/draft-1/confirm") && options?.method === "POST") {
      return new Response(JSON.stringify({ id: "tpl-100" }), { status: 201 });
    }
    if (u.endsWith("/templates/drafts/draft-1") && options?.method === "DELETE") {
      return new Response(JSON.stringify({ id: "draft-1", status: "discarded" }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const list = await listDrafts();
  assert.equal(list.length, 1);

  const single = await getDraft("draft-1");
  assert.equal(single.id, "draft-1");

  const updated = await updateDraft("draft-1", { title: "New Title", modules: [] });
  assert.equal(updated.id, "draft-1");

  const confirmed = await confirmDraft("draft-1", { title: "Confirmed Title" });
  assert.equal(confirmed.id, "tpl-100");

  const discarded = await discardDraft("draft-1");
  assert.equal(discarded.status, "discarded");

  assert.equal(calls.length, 5);
  assert.ok(calls[0].url.includes("/templates/drafts"));
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[2].method, "PATCH");
  assert.equal(calls[3].method, "POST");
  assert.equal(calls[4].method, "DELETE");
});
