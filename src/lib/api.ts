const API_PROXY_BASE = "/api/backend";
const GET_CACHE_TTL_MS = 15_000;
const MAX_CACHED_GETS = 100;
const SERVICE_UNAVAILABLE_MESSAGE = "Evalora could not reach the service. Please try again shortly.";
const PUBLIC_API_MESSAGES = new Set([
  SERVICE_UNAVAILABLE_MESSAGE,
  "Your session has expired. Please sign in again.",
  "You do not have permission to access this workspace.",
  "Email must be a valid address.",
  "Email is required.",
  "Password is required.",
  "Password must be at most 128 characters.",
  "Password must be at least 8 characters.",
  "Password must include a lowercase letter.",
  "Password must include an uppercase letter.",
  "Password must include a number.",
  "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
  "Name is required.",
  "Invalid email or password.",
  "Invalid credentials.",
  "Google credential is required.",
  "Reset token is required.",
  "Organization name is required.",
  "Catalog template id is required.",
  "templateId is required for comparable analytics",
  "This verification link is invalid or has expired.",
  "Confirmation name does not match the organization name.",
  "This person is already a member of your workspace.",
  "A pending invitation already exists for this email.",
  "Invitation not found.",
  "Member not found.",
  "Candidate not found.",
  "Catalog template not found.",
  "Template not found.",
  "Session not found.",
  "Question not found.",
  "Report not ready.",
]);

type CachedResponse = {
  expiresAt: number;
  value: unknown;
};

const responseCache = new Map<string, CachedResponse>();
const pendingGets = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const normalizedPath = normalizePath(path);
  const method = (options.method ?? "GET").toUpperCase();
  const cacheKey = method === "GET" && !options.signal && !options.headers ? normalizedPath : null;

  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;
    if (cached) responseCache.delete(cacheKey);
    const pending = pendingGets.get(cacheKey);
    if (pending) return pending as Promise<T>;
  } else if (method !== "GET" && method !== "HEAD") {
    cacheGeneration += 1;
    responseCache.clear();
    pendingGets.clear();
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const generationAtStart = cacheGeneration;
  const request = (async () => {
    const response = await fetch(`${API_PROXY_BASE}${normalizedPath}`, {
      ...options,
      body,
      headers,
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readPayload(response);

    if (!response.ok) {
      throw new ApiError(errorMessage(payload, response.status), response.status, payload);
    }

    if (cacheKey && generationAtStart === cacheGeneration) {
      if (responseCache.size >= MAX_CACHED_GETS) {
        const oldestKey = responseCache.keys().next().value;
        if (oldestKey) responseCache.delete(oldestKey);
      }
      responseCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, value: payload });
    }
    return payload as T;
  })();

  if (cacheKey) pendingGets.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (cacheKey && pendingGets.get(cacheKey) === request) pendingGets.delete(cacheKey);
  }
}

export function apiGet<T>(path: string, options: Omit<ApiRequestOptions, "body" | "method"> = {}) {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, "body" | "method"> = {}) {
  return apiRequest<T>(path, { ...options, body, method: "POST" });
}

export function apiPut<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, "body" | "method"> = {}) {
  return apiRequest<T>(path, { ...options, body, method: "PUT" });
}

export function apiDelete<T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, "body" | "method"> = {}) {
  return apiRequest<T>(path, { ...options, body, method: "DELETE" });
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(error instanceof ApiError)) return fallback;
  return safeUserMessage(error.message) ?? fallback;
}

export function serviceUnavailableResponse(status = 502, dataSource = "live"): Response {
  return Response.json(
    { message: SERVICE_UNAVAILABLE_MESSAGE },
    {
      status,
      headers: { "X-Evalora-Data-Source": dataSource },
    },
  );
}

export async function safeUpstreamErrorResponse(response: Response, contentType: string): Promise<Response> {
  const isJson = /(?:application|text)\/(?:[\w.+-]*\+)?json\b/i.test(contentType);
  if (response.status >= 500 || !isJson) {
    // Drain the upstream body without forwarding framework HTML, stacks, or machine details.
    await response.arrayBuffer();
    return serviceUnavailableResponse(response.status >= 500 ? response.status : 502);
  }

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseText) as unknown;
  } catch {
    return serviceUnavailableResponse();
  }

  return Response.json(
    { message: errorMessage(payload, response.status) },
    {
      status: response.status,
      headers: { "X-Evalora-Data-Source": "live" },
    },
  );
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (status >= 500) return SERVICE_UNAVAILABLE_MESSAGE;
  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) {
      const combined = message.filter((item): item is string => typeof item === "string").join(" ");
      const safeMessage = safeUserMessage(combined);
      if (safeMessage) return safeMessage;
    }
    if (typeof message === "string") {
      const safeMessage = safeUserMessage(message);
      if (safeMessage) return safeMessage;
    }
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") {
      const safeMessage = safeUserMessage(error);
      if (safeMessage) return safeMessage;
    }
  }
  if (typeof payload === "string") {
    const safeMessage = safeUserMessage(payload);
    if (safeMessage) return safeMessage;
  }
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to access this workspace.";
  return `Request failed (${status}).`;
}

function safeUserMessage(value: string): string | null {
  const message = value.trim();
  if (PUBLIC_API_MESSAGES.has(message)) return message;
  return /^Request failed \([1-5]\d{2}\)\.$/.test(message) ? message : null;
}
