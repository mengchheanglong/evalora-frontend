const API_PROXY_BASE = "/api/backend";

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
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_PROXY_BASE}${normalizePath(path)}`, {
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

  return payload as T;
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
