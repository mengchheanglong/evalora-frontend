import { ApiError, apiGet, apiPost, apiRequest, getErrorMessage, invalidateGetCache } from "@/lib/api";
import type { ModuleType, QuestionType } from "@/lib/types";

/**
 * Client for the AI-assisted template draft endpoints (`/templates/drafts`).
 *
 * A draft is a proposal, not an assessment: the backend only creates a real
 * template when the confirm endpoint is called, and it re-validates and
 * re-balances everything a client sends. Module weights are integer
 * percentages that the backend always normalizes to total exactly 100 —
 * weights sent from here are treated as relative intent, never stored as-is.
 */

/** The generator's 1-5 ratings that the backend turns into weights. */
export interface DraftWeightSignals {
  roleImportance: number;
  riskIfWeak: number;
  evidenceVolume: number;
  difficulty: number;
  essential: boolean;
}

export interface DraftQuestion {
  key: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
  rubric: string[];
}

export interface DraftModule {
  key: string;
  type: ModuleType;
  title: string;
  description: string;
  orderIndex: number;
  /** Integer percent share of 100, computed by the backend. */
  weight: number;
  /** Plain-language reason for this module's share. */
  weightRationale: string;
  weightSignals: DraftWeightSignals;
  questions: DraftQuestion[];
}

export interface TemplateDraft {
  title: string;
  description: string;
  roleType: string;
  timeLimitMin: number;
  modules: DraftModule[];
  /** What validation changed on the way in — shown to the reviewer. */
  warnings: string[];
}

export type TemplateDraftStatus = "draft" | "published" | "discarded";
export type TemplateDraftSource = "document" | "prompt";
export type TemplateDraftProvider = "deepseek" | "fallback";

export interface TemplateDraftDto {
  id: string;
  status: TemplateDraftStatus;
  source: TemplateDraftSource;
  sourceFileName?: string;
  provider: TemplateDraftProvider;
  draft: TemplateDraft;
  /** The proposal exactly as generated, before any edit. */
  aiProposal: TemplateDraft;
  publishedTemplateId?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateDraftSummary {
  id: string;
  status: TemplateDraftStatus;
  source: TemplateDraftSource;
  sourceFileName?: string;
  provider: TemplateDraftProvider;
  title: string;
  roleType: string;
  moduleCount: number;
  questionCount: number;
  publishedTemplateId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Exactly the fields the backend PATCH DTO whitelists — anything extra is a 400. */
export interface UpdateDraftInput {
  title?: string;
  description?: string;
  roleType?: string;
  timeLimitMin?: number;
  modules: Array<{
    key?: string;
    type: ModuleType;
    title: string;
    description?: string;
    weight?: number;
    weightRationale?: string;
    weightSignals?: Partial<DraftWeightSignals>;
    questions?: Array<{
      key?: string;
      questionText: string;
      questionType?: QuestionType;
      options?: string[];
      rubric?: string[];
    }>;
  }>;
}

/** Mirrors the backend's multer limit so an oversized file fails before uploading. */
export const MAX_DRAFT_UPLOAD_BYTES = 5 * 1024 * 1024;

export const DRAFT_UPLOAD_ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

export function generateDraftFromIdea(input: { idea: string; roleType?: string }): Promise<TemplateDraftDto> {
  return apiPost<TemplateDraftDto>("/templates/drafts", {
    idea: input.idea,
    ...(input.roleType?.trim() ? { roleType: input.roleType.trim() } : {}),
  });
}

/**
 * Multipart upload. The shared api wrapper JSON-encodes every body, so this one
 * call uses fetch directly against the same proxy; the proxy forwards raw
 * bodies and the original Content-Type, and the browser sets the multipart
 * boundary itself.
 */
export async function generateDraftFromDocument(input: {
  file: File;
  idea?: string;
  roleType?: string;
}): Promise<TemplateDraftDto> {
  if (input.file.size > MAX_DRAFT_UPLOAD_BYTES) {
    throw new ApiError("That file is larger than 5 MB. Export a smaller version or paste the text instead.", 413);
  }

  const form = new FormData();
  form.append("document", input.file);
  if (input.idea?.trim()) form.append("idea", input.idea.trim());
  if (input.roleType?.trim()) form.append("roleType", input.roleType.trim());

  const response = await fetch("/api/backend/templates/drafts", {
    method: "POST",
    body: form,
    cache: "no-store",
    credentials: "same-origin",
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | TemplateDraftDto
    | null;

  if (!response.ok) {
    throw new ApiError(uploadErrorMessage(response.status, payload), response.status, payload);
  }
  if (!payload || !("id" in payload)) {
    throw new ApiError("Draft generation returned an unexpected response. Please try again.", 502);
  }
  // This request bypassed the wrapper, so the wrapper's GET cache still holds
  // the pre-upload drafts list; drop it or the new draft is invisible for 15s.
  invalidateGetCache();
  return payload;
}

export function listDrafts(): Promise<TemplateDraftSummary[]> {
  return apiGet<TemplateDraftSummary[]>("/templates/drafts");
}

export function getDraft(id: string): Promise<TemplateDraftDto> {
  return apiGet<TemplateDraftDto>(`/templates/drafts/${encodeURIComponent(id)}`);
}

export function updateDraft(id: string, input: UpdateDraftInput): Promise<TemplateDraftDto> {
  return apiRequest<TemplateDraftDto>(`/templates/drafts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
}

export function confirmDraft(id: string, input: { title?: string } = {}): Promise<{ id: string }> {
  return apiPost<{ id: string }>(`/templates/drafts/${encodeURIComponent(id)}/confirm`, input);
}

export function discardDraft(id: string): Promise<{ id: string; status: TemplateDraftStatus }> {
  return apiRequest<{ id: string; status: TemplateDraftStatus }>(`/templates/drafts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * The raw-fetch path bypasses the wrapper's message sanitising, so backend
 * messages are only surfaced when they are the curated 4xx guidance the drafts
 * API writes for users; everything else gets a generic line.
 */
function uploadErrorMessage(status: number, payload: { message?: string | string[] } | TemplateDraftDto | null): string {
  if (status === 413) return "That file is larger than 5 MB. Export a smaller version or paste the text instead.";
  if (status === 429) return "You have generated a lot of drafts recently. Please wait a few minutes and try again.";
  if (status === 401) return "Your session has expired. Please sign in again.";

  const message = payload && "message" in payload ? payload.message : undefined;
  const text = Array.isArray(message) ? message[0] : message;
  if (status >= 400 && status < 500 && typeof text === "string" && text.trim()) return text;
  return getErrorMessage(new ApiError("Draft generation failed.", status), "Draft generation failed. Please try again.");
}
