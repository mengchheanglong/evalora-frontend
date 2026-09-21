import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { handleMockBackendRequest } from "../src/lib/mock-backend.ts";

test("GET /health answers ok so useBackendHealth() does not report the mock as unreachable", async () => {
  const request = new NextRequest("http://mock.local/health");
  const response = await handleMockBackendRequest(request, "health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
});
