const API_PROXY_BASE = "/api/backend";
const GET_CACHE_TTL_MS = 15_000;
const MAX_CACHED_GETS = 100;

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
  return error instanceof Error && error.message.trim() ? error.message : fallback;
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
  if (payload && typeof payload === "object") {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === "string").join(" ");
    if (typeof message === "string" && message.trim()) return message;
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  if (typeof payload === "string" && payload.trim()) return payload;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to access this workspace.";
  if (status >= 500) return "Evalora could not reach the service. Please try again shortly.";
  return `Request failed (${status}).`;
}
