import { NextRequest, NextResponse } from "next/server";
import { handleMockBackendRequest } from "@/lib/mock-backend";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
const SESSION_COOKIE = "evalora_session";
const AUTH_RESPONSE_PATHS = new Set(["auth/login", "auth/register", "auth/google", "organization/invites/accept"]);
const USE_MOCK_BACKEND = process.env.NEXT_PUBLIC_USE_MOCK_BACKEND !== "false";

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
  if (USE_MOCK_BACKEND) {
    return handleMockBackendRequest(request, relativePath);
  }

  const target = `${BACKEND_URL}/${relativePath}${request.nextUrl.search}`;
  const headers = new Headers({ Accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const isBodyless = request.method === "GET" || request.method === "HEAD";
    const backendResponse = await fetch(target, {
      method: request.method,
      headers,
      body: isBodyless ? undefined : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
      // Prefer reusing TCP connections to Nest during multi-request page loads.
      keepalive: true,
    });

    // Auth responses need token stripping; stream other bodies through as text once.
    const contentType = backendResponse.headers.get("content-type") ?? "application/json; charset=utf-8";
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);

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
          maxAge: 60 * 60 * 24,
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
    return NextResponse.json(
      { message: "The Evalora API is unavailable. Confirm the backend is running and try again." },
      { status: 502 },
    );
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
