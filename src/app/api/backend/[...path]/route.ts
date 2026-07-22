import { NextRequest, NextResponse } from "next/server";
import { handleMockBackendRequest } from "@/lib/mock-backend";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const SESSION_COOKIE = "evalora_session";
const REMEMBERED_SESSION_SECONDS = 60 * 60 * 24 * 30;
const AUTH_RESPONSE_PATHS = new Set(["auth/login", "auth/google", "auth/verify-email", "organization/invites/accept"]);

/**
 * Backend mode for local/dev UX:
 * - "true"  → always use the in-app mock API (no Nest required)
 * - "false" → always call the real backend (no mock fallback)
 * - "auto"  → try the real backend; if it is unreachable, fall back to mock
 *
 * Default is "auto" so the frontend stays usable without a running backend.
 */
const BACKEND_MODE = normalizeBackendMode(process.env.NEXT_PUBLIC_USE_MOCK_BACKEND);

/** After a connection failure, skip live attempts briefly so the UI stays snappy offline. */
const LIVE_COOLDOWN_MS = 15_000;
let liveUnavailableUntil = 0;

type RouteContext = { params: Promise<{ path: string[] }> };

export const dynamic = "force-dynamic";

export function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ message: "Cross-origin request blocked." }, { status: 403 });
  }

  const { path } = await context.params;
  if (!path.length || path.some((segment) => segment === "." || segment === "..")) {
    return NextResponse.json({ message: "Invalid API path." }, { status: 400 });
  }

  const relativePath = path.map(encodeURIComponent).join("/");

  // Body can only be read once; buffer it so mock fallback can reuse the same request.
  const isBodyless = request.method === "GET" || request.method === "HEAD";
  let bodyBuffer: ArrayBuffer | undefined;
  if (!isBodyless) {
    bodyBuffer = await request.arrayBuffer();
  }
  const rememberedSession = requestsRememberedSession(relativePath, bodyBuffer);

  if (BACKEND_MODE === "true" || (BACKEND_MODE === "auto" && Date.now() < liveUnavailableUntil)) {
    return withMockHeader(await handleMockBackendRequest(rebuildRequest(request, bodyBuffer), relativePath));
  }

  const target = `${BACKEND_URL}/${relativePath}${request.nextUrl.search}`;
  const headers = new Headers({ Accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const backendResponse = await fetch(target, {
      method: request.method,
      headers,
      body: bodyBuffer,
      cache: "no-store",
      redirect: "manual",
      // Prefer reusing TCP connections to Nest during multi-request page loads.
      keepalive: true,
    });
    liveUnavailableUntil = 0;

    // Auth responses need token stripping; stream other bodies through as text once.
    const responseContentType = backendResponse.headers.get("content-type") ?? "application/json; charset=utf-8";
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", responseContentType);
    responseHeaders.set("X-Evalora-Data-Source", "live");

    if (backendResponse.ok && AUTH_RESPONSE_PATHS.has(relativePath)) {
      const responseText = await backendResponse.text();
      let outgoingBody = responseText;
      let sessionToken: string | undefined;
      if (responseText) {
        const payload = JSON.parse(responseText) as { token?: string; [key: string]: unknown };
        sessionToken = payload.token;
        delete payload.token;
        outgoingBody = JSON.stringify(payload);
      }
      const response = new NextResponse(outgoingBody || null, {
        status: backendResponse.status,
        headers: responseHeaders,
      });
      if (sessionToken) {
        response.cookies.set(SESSION_COOKIE, sessionToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          ...(rememberedSession ? { maxAge: REMEMBERED_SESSION_SECONDS } : {}),
        });
      }
      return response;
    }

    const responseText = await backendResponse.text();
    const response = new NextResponse(responseText || null, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
    if (relativePath === "auth/logout" && backendResponse.ok) {
      response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    }
    return response;
  } catch {
    if (BACKEND_MODE === "auto") {
      liveUnavailableUntil = Date.now() + LIVE_COOLDOWN_MS;
      // Rebuild a Request with the buffered body so mock handlers can read JSON again.
      return withMockHeader(await handleMockBackendRequest(rebuildRequest(request, bodyBuffer), relativePath));
    }

    return NextResponse.json(
      {
        message:
          "The Evalora API is unavailable. Start the backend, or set NEXT_PUBLIC_USE_MOCK_BACKEND=auto (or true) to use local demo data.",
      },
      { status: 502 },
    );
  }
}

function normalizeBackendMode(value: string | undefined): "true" | "false" | "auto" {
  const normalized = (value ?? "auto").trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "mock") return "true";
  if (normalized === "false" || normalized === "0" || normalized === "live") return "false";
  return "auto";
}

function withMockHeader(response: NextResponse): NextResponse {
  response.headers.set("X-Evalora-Data-Source", "mock");
  return response;
}

function rebuildRequest(request: NextRequest, bodyBuffer?: ArrayBuffer): NextRequest {
  if (bodyBuffer === undefined) return request;
  return new NextRequest(request.url, {
    method: request.method,
    headers: request.headers,
    body: bodyBuffer.byteLength ? bodyBuffer : undefined,
  });
}

function requestsRememberedSession(relativePath: string, bodyBuffer?: ArrayBuffer): boolean {
  if ((relativePath !== "auth/login" && relativePath !== "auth/google") || !bodyBuffer?.byteLength) return false;
  try {
    const body = JSON.parse(new TextDecoder().decode(bodyBuffer)) as { remember?: unknown };
    return body.remember === true;
  } catch {
    return false;
  }
}

function isTrustedMutation(request: NextRequest): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
