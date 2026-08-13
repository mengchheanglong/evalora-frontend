"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, InlineAlert } from "@/components/ui-states";
import { getErrorMessage } from "@/lib/api";
import {
  DRAFT_UPLOAD_ACCEPT,
  MAX_DRAFT_CHAT_MESSAGE_LENGTH,
  MAX_DRAFT_UPLOAD_BYTES,
  chatWithDraft,
  confirmDraft,
  discardDraft,
  generateDraftFromDocument,
  generateDraftFromIdea,
  getDraft,
  listDrafts,
  updateDraft,
  type DraftChatTurn,
  type DraftWeightSignals,
  type TemplateDraftDto,
  type TemplateDraftSummary,
  type UpdateDraftInput,
} from "@/lib/template-drafts";
import type { ModuleType, QuestionType } from "@/lib/types";

/**
 * AI template builder: upload a job description or describe the role, review
 * the AI's proposed assessment — modules, questions, rubrics, and explained
 * weights — edit anything, then publish it as a real template.
 *
 * The backend owns every guarantee this page relies on: nothing is published
 * until Publish is confirmed here, and module weights are always re-balanced
 * server-side to total exactly 100%.
 */

const QUESTION_TYPES: QuestionType[] = ["short_answer", "scenario", "roleplay", "mcq", "scale", "coding"];

const CHAT_SUGGESTIONS = [
  "Senior backend engineer for our payments platform",
  "Junior React developer, strong on fundamentals",
  "QA engineer who designs great test plans",
];

const MODULE_META: Record<ModuleType, { label: string; icon: IconName; tile: string; bar: string }> = {
  ai_interview: { label: "AI Interview", icon: "message", tile: "bg-[var(--color-status-good)]/15 text-[var(--color-status-good)]", bar: "bg-emerald-500" },
  coding: { label: "Coding", icon: "code", tile: "bg-indigo-100 text-indigo-600", bar: "bg-indigo-500" },
  debugging: { label: "Debugging", icon: "search", tile: "bg-teal-100 text-teal-600", bar: "bg-teal-500" },
  work_style: { label: "Work Style", icon: "clipboard", tile: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]", bar: "bg-slate-400" },
  behavioral: { label: "Behavioral", icon: "users", tile: "bg-orange-100 text-orange-600", bar: "bg-orange-500" },
  leadership: { label: "Leadership", icon: "crown", tile: "bg-blue-100 text-blue-600", bar: "bg-blue-500" },
  communication: { label: "Communication", icon: "message", tile: "bg-sky-100 text-sky-600", bar: "bg-sky-500" },
  // violet, not purple: the dark theme patches violet-100 chips but has no
  // purple rules at all, which would leave a glowing light tile.
  problem_solving: { label: "Problem Solving", icon: "sparkle", tile: "bg-violet-100 text-violet-600", bar: "bg-violet-500" },
};

const INPUT_CLASS =
  "block w-full rounded-lg border border-[var(--theme-border-strong)] bg-sky-50 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:bg-[var(--theme-panel)]";

type Phase = "source" | "review";

interface ChatMessage {
  key: string;
  role: "user" | "assistant";
  content: string;
  /** Error bubbles are rendered differently and never replayed as history. */
  tone: "normal" | "error";
}

interface EditableQuestion {
  key: string;
  questionText: string;
  questionType: QuestionType;
  optionsText: string;
  rubricText: string;
}

interface EditableModule {
  key: string;
  type: ModuleType;
  title: string;
  description: string;
  weight: string;
  weightRationale: string;
  weightSignals: DraftWeightSignals;
  collapsed: boolean;
  questions: EditableQuestion[];
}

export default function TemplateAiBuilderPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("source");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Source phase
  const [file, setFile] = useState<File | null>(null);

  // Chat with the assistant. The transcript lives only in this component: the
  // backend stores drafts, not conversations, so a refresh starts a fresh chat
  // against the same draft.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);

  // Recent drafts
  const [drafts, setDrafts] = useState<TemplateDraftSummary[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [resumingId, setResumingId] = useState("");
  const [discardTarget, setDiscardTarget] = useState<TemplateDraftSummary | null>(null);
  const [discarding, setDiscarding] = useState(false);

  // Review phase
  const [draftId, setDraftId] = useState("");
  const [serverDraft, setServerDraft] = useState<TemplateDraftDto | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [roleType, setRoleType] = useState("");
  const [timeLimitMin, setTimeLimitMin] = useState("60");
  const [modules, setModules] = useState<EditableModule[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [removeModuleKey, setRemoveModuleKey] = useState("");

  // Bumped on every edit. A save snapshots it before the request and compares
  // after: hydrating the server response over edits typed mid-flight would
  // silently discard them and claim they were saved.
  const editVersionRef = useRef(0);
  // Bumped per openDraft call so a slow earlier response cannot clobber a
  // draft the user opened afterwards.
  const openSeqRef = useRef(0);

  const refreshDrafts = useCallback(async () => {
    try {
      setDrafts(await listDrafts());
    } catch {
      // The list is a convenience; generation and review still work without it.
    } finally {
      setDraftsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshDrafts();
  }, [refreshDrafts]);

  const hydrate = useCallback((dto: TemplateDraftDto, options: { scroll?: boolean; keepCollapsed?: boolean } = {}) => {
    setDraftId(dto.id);
    setServerDraft(dto);
    setTitle(dto.draft.title);
    setDescription(dto.draft.description);
    setRoleType(dto.draft.roleType);
    setTimeLimitMin(String(dto.draft.timeLimitMin));
    setModules((previous) =>
      dto.draft.modules.map((module) => ({
        key: module.key,
        type: module.type,
        title: module.title,
        description: module.description,
        weight: String(module.weight),
        weightRationale: module.weightRationale,
        weightSignals: module.weightSignals,
        // A save must not spring every collapsed module back open mid-review.
        collapsed: options.keepCollapsed === true
          ? previous.find((candidate) => candidate.key === module.key)?.collapsed ?? false
          : false,
        questions: module.questions.map((question) => ({
          key: question.key,
          questionText: question.questionText,
          questionType: question.questionType,
          optionsText: (question.options ?? []).join("\n"),
          rubricText: question.rubric.join(", "),
        })),
      })),
    );
    setDirty(false);
    setPhase("review");
    if (options.scroll !== false && typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  const openDraft = useCallback(
    async (id: string) => {
      const seq = (openSeqRef.current += 1);
      setResumingId(id);
      setError("");
      try {
        const dto = await getDraft(id);
        // A newer open superseded this one while it was loading.
        if (openSeqRef.current !== seq) return;
        // A conversation belongs to one draft; opening another starts fresh.
        setChatMessages([]);
        hydrate(dto);
      } catch (err) {
        if (openSeqRef.current !== seq) return;
        setError(getErrorMessage(err, "Unable to open that draft."));
      } finally {
        if (openSeqRef.current === seq) setResumingId("");
      }
    },
    [hydrate],
  );

  // Deep link: /templates/ai?draft=<id> resumes a draft directly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("draft");
    if (requested) void openDraft(requested);
  }, [openDraft]);

  function markDirty() {
    editVersionRef.current += 1;
    setDirty(true);
    setNotice("");
  }

  function handleFilePick(picked?: File) {
    setError("");
    if (!picked) return;
    if (picked.size > MAX_DRAFT_UPLOAD_BYTES) {
      setError("That file is larger than 5 MB. Export a smaller version or paste the text instead.");
      return;
    }
    setFile(picked);
  }

  function appendChat(role: ChatMessage["role"], content: string, tone: ChatMessage["tone"] = "normal") {
    setChatMessages((current) => [...current, { key: newKey("m"), role, content, tone }]);
  }

  /**
   * One chat turn. Before a draft exists the message — and whatever document is
   * attached — generates one; afterwards it becomes a refinement instruction
   * against the stored draft. Failures land in the thread as assistant bubbles,
   * not page errors — the conversation is where the user is looking.
   */
  async function handleChatSend(rawMessage: string) {
    if (chatSending) return;
    const message = rawMessage.trim().slice(0, MAX_DRAFT_CHAT_MESSAGE_LENGTH);
    const startingDraft = phase === "source" || !draftId;
    const attached = startingDraft ? file : null;
    if (!message && !attached) return;
    // Snapshot before appending: the history replayed to the model must not
    // include the message it is being sent alongside.
    const history: DraftChatTurn[] = chatMessages
      .filter((entry) => entry.tone === "normal")
      .map((entry) => ({ role: entry.role, content: entry.content }));
    appendChat("user", attached ? `${message ? `${message}\n` : ""}📎 ${attached.name}` : message);
    setChatSending(true);
    try {
      if (startingDraft) {
        const dto = attached
          ? await generateDraftFromDocument({ file: attached, idea: message })
          : await generateDraftFromIdea({ idea: message });
        // Only clear the attachment once it generated something; a failed send
        // keeps it in the composer for the retry.
        setFile(null);
        hydrate(dto);
        void refreshDrafts();
        appendChat("assistant", describeDraft(dto));
      } else {
        if (dirty) {
          const problem = validateDraft();
          if (problem) {
            appendChat("assistant", `Save your edits first — ${problem}`, "error");
            return;
          }
          // The assistant revises the draft the server knows about, so unsaved
          // edits are saved first; otherwise its revision would erase them.
          hydrate(await updateDraft(draftId, buildPatchBody()), { scroll: false, keepCollapsed: true });
        }
        const result = await chatWithDraft(draftId, { message, history });
        if (result.applied) {
          hydrate(result.draft, { scroll: false, keepCollapsed: true });
          void refreshDrafts();
        }
        // applied: false is still a conversational answer ("I didn't change
        // anything because…"), not an error — it stays in the replayed history.
        appendChat("assistant", result.reply);
      }
    } catch (err) {
      appendChat("assistant", getErrorMessage(err, "Something went wrong. Please try again."), "error");
    } finally {
      setChatSending(false);
    }
  }

  function validateDraft(): string | null {
    if (!title.trim()) return "Give the assessment a title before saving.";
    // A blank role would silently revert to the previous value server-side.
    if (!roleType.trim()) return "Name the role this assessment is for.";
    if (modules.length === 0) return "A draft needs at least one module.";
    for (const module of modules) {
      if (!module.title.trim()) return "Every module needs a title.";
      if (module.type === "ai_interview") continue;
      for (const question of module.questions) {
        if (!question.questionText.trim()) {
          return `A question in "${module.title}" is empty. Write it or remove it.`;
        }
      }
    }
    return null;
  }

  // Length caps mirror the backend DTO limits, which hard-reject rather than
  // truncate. Inputs also carry maxLength, so trimming here only catches
  // pasted content that slipped past (e.g. into an unmounted field).
  function buildPatchBody(): UpdateDraftInput {
    return {
      title: title.trim().slice(0, 160),
      description: description.trim().slice(0, 600) || undefined,
      roleType: roleType.trim().slice(0, 160) || undefined,
      timeLimitMin: clampInt(timeLimitMin, 5, 480, 60),
      modules: modules.map((module) => ({
        key: module.key,
        type: module.type,
        title: module.title.trim().slice(0, 160),
        description: module.description.trim().slice(0, 600) || undefined,
        // The DTO rejects weights over 100; the backend re-balances whatever
        // passes, so clamping here just keeps a typo from failing the save.
        weight: Math.min(100, positiveNumber(module.weight)),
        weightRationale: module.weightRationale.trim().slice(0, 400) || undefined,
        weightSignals: module.weightSignals,
        questions: module.type === "ai_interview" ? [] : module.questions.map((question) => ({
          key: question.key,
          questionText: question.questionText.trim().slice(0, 1200),
          questionType: question.questionType,
          ...(question.questionType === "mcq"
            ? { options: splitLines(question.optionsText).slice(0, 8).map((option) => option.slice(0, 200)) }
            : {}),
          rubric: splitCsv(question.rubricText).slice(0, 8).map((criterion) => criterion.slice(0, 120)),
        })),
      })),
    };
  }

  async function handleSave(): Promise<TemplateDraftDto | null> {
    const problem = validateDraft();
    if (problem) {
      setError(problem);
      return null;
    }
    setError("");
    setSaving(true);
    const versionAtSave = editVersionRef.current;
    try {
      const dto = await updateDraft(draftId, buildPatchBody());
      if (editVersionRef.current === versionAtSave) {
        hydrate(dto, { scroll: false, keepCollapsed: true });
        setNotice("Draft saved. Weights were re-balanced to total 100%.");
      } else {
        // The reviewer kept typing while the request was in flight. Replacing
        // their state with the server copy would silently delete those edits,
        // so keep the editor as-is and leave it marked unsaved.
        setServerDraft(dto);
        setNotice("Draft saved, but you have newer edits — save again to keep them.");
      }
      void refreshDrafts();
      return dto;
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save the draft."));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishOpen(false);
    setError("");
    setPublishing(true);
    try {
      // Unsaved edits publish exactly as shown: save first, then confirm.
      if (dirty) {
        const saved = await handleSaveInsidePublish();
        if (!saved) return;
      }
      const template = await confirmDraft(draftId, {});
      router.push(`/templates/${encodeURIComponent(template.id)}/edit?created=1`);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Publishing this draft failed."));
    } finally {
      setPublishing(false);
    }
  }

  async function handleSaveInsidePublish(): Promise<boolean> {
    const problem = validateDraft();
    if (problem) {
      setError(problem);
      return false;
    }
    const dto = await updateDraft(draftId, buildPatchBody());
    hydrate(dto, { scroll: false, keepCollapsed: true });
    return true;
  }

  async function handleDiscard() {
    if (!discardTarget) return;
    setDiscarding(true);
    setError("");
    try {
      await discardDraft(discardTarget.id);
      setDrafts((current) => current.filter((draft) => draft.id !== discardTarget.id));
      if (discardTarget.id === draftId) {
        setPhase("source");
        setDraftId("");
        setServerDraft(null);
      }
      setNotice("Draft discarded.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to discard that draft."));
    } finally {
      setDiscarding(false);
      setDiscardTarget(null);
    }
  }

  function updateModule(key: string, patch: Partial<EditableModule>) {
    setModules((current) => current.map((module) => (module.key === key ? { ...module, ...patch } : module)));
    markDirty();
  }

  /** Collapse is pure view state — it is never sent to the server, so toggling
   *  it must not flip the draft to "unsaved changes". */
  function toggleCollapsed(key: string) {
    setModules((current) => current.map((module) => (module.key === key ? { ...module, collapsed: !module.collapsed } : module)));
  }

  function removeModule(key: string) {
    setModules((current) => current.filter((module) => module.key !== key));
    markDirty();
  }

  function updateQuestion(moduleKey: string, questionKey: string, patch: Partial<EditableQuestion>) {
    setModules((current) =>
      current.map((module) =>
        module.key === moduleKey
          ? { ...module, questions: module.questions.map((question) => (question.key === questionKey ? { ...question, ...patch } : question)) }
          : module,
      ),
    );
    markDirty();
  }

  function addQuestion(moduleKey: string) {
    setModules((current) =>
      current.map((module) =>
        module.key === moduleKey
          ? {
              ...module,
              questions: [
                ...module.questions,
                { key: newKey("q"), questionText: "", questionType: defaultQuestionType(module.type), optionsText: "", rubricText: "" },
              ],
            }
          : module,
      ),
    );
    markDirty();
  }

  function removeQuestion(moduleKey: string, questionKey: string) {
    setModules((current) =>
      current.map((module) =>
        module.key === moduleKey ? { ...module, questions: module.questions.filter((question) => question.key !== questionKey) } : module,
      ),
    );
    markDirty();
  }

  // Rounded to one decimal: user-typed decimals would otherwise produce float
  // noise like 99.99999999999999 in the total and defeat the ===100 check.
  const weightTotal = Math.round(modules.reduce((sum, module) => sum + positiveNumber(module.weight), 0) * 10) / 10;
  const weightsBalanced = Math.abs(weightTotal - 100) < 0.05;
  const questionTotal = modules.reduce((sum, module) => sum + module.questions.length, 0);
  const visibleDrafts = drafts.filter((draft) => draft.status !== "discarded");

  return (
    <AppShell active="templates" title="" description="" showPageHeader={false}>
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-[var(--theme-muted)]">
              <Link className="font-semibold hover:text-[var(--theme-heading)]" href="/templates">Templates</Link>
              <Icon className="rotate-180 text-[var(--theme-faint)]" name="chevron" size={12} />
              <span className="font-semibold text-[var(--theme-heading)]">Generate with AI</span>
            </div>
            <h1 className="mt-2 flex items-center gap-2.5 text-3xl font-bold text-[var(--theme-heading)]">
              <span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><Icon name="sparkle" size={22} /></span>
              AI Template Builder
            </h1>
            <p className="mt-1 text-[var(--theme-muted)]">
              Chat with the assistant to draft an assessment. You review, edit, and decide what publishes.
            </p>
          </div>
          <Link className="inline-flex h-10 items-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel)] px-4 text-sm font-medium text-[var(--theme-text)] hover:bg-[var(--theme-panel-soft)]" href="/templates">
            Cancel
          </Link>
        </div>

        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {notice && <InlineAlert tone="success">{notice}</InlineAlert>}

        {phase === "source" && (
          <div className="mx-auto w-full max-w-3xl space-y-10">
            <>
                <div className="pt-4">
                  <div className="mb-5 text-center">
                    <h2 className="text-2xl font-bold text-[var(--theme-heading)]">What are you hiring for?</h2>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--theme-muted)]">
                      Describe the role, or attach a job description or question list with the{" "}
                      <span className="font-semibold text-[var(--theme-text)]">+</span> button — questions in a document are kept word-for-word.
                    </p>
                  </div>

                  <DraftChatPanel
                    attach={{ file, onPick: handleFilePick, onClear: () => setFile(null) }}
                    messages={chatMessages}
                    onSend={(message) => void handleChatSend(message)}
                    placeholder="Describe the role you're hiring for…"
                    rows={2}
                    sending={chatSending}
                    sendingLabel={draftId ? undefined : "Designing your assessment — modules, questions, rubrics, and weights. This can take a minute or two."}
                  />

                  {chatMessages.length === 0 && !chatSending && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {CHAT_SUGGESTIONS.map((suggestion) => (
                        <button
                          className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-panel)] px-3.5 py-1.5 text-xs font-medium text-[var(--theme-muted)] transition hover:border-sky-400 hover:text-sky-600"
                          key={suggestion}
                          onClick={() => void handleChatSend(suggestion)}
                          type="button"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className="mt-4 text-center text-xs leading-5 text-[var(--theme-faint)]">
                    PDF · Word · text, up to 5 MB · nothing goes live without your confirmation
                  </p>
                </div>

                <SectionCard description="Pick up where you left off, or revisit what a published template started from." title="Recent drafts">
                  {!draftsLoaded ? (
                    <p className="text-sm text-[var(--theme-muted)]">Loading drafts…</p>
                  ) : visibleDrafts.length === 0 ? (
                    <EmptyState description="Drafts you generate will appear here until you publish or discard them." icon="sparkle" title="No drafts yet" />
                  ) : (
                    <ul className="divide-y divide-[var(--theme-border)]">
                      {visibleDrafts.map((draft) => (
                        <li className="flex items-center justify-between gap-4 py-3" key={draft.id}>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-[var(--theme-heading)]">{draft.title}</p>
                              <span className="shrink-0"><StatusBadge status={draft.status} /></span>
                              {draft.provider === "fallback" && (
                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Blueprint start</span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-[var(--theme-muted)]">
                              {draft.roleType} · {draft.moduleCount} modules · {draft.questionCount} questions
                              {draft.sourceFileName ? ` · ${draft.sourceFileName}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {draft.status === "draft" && (
                              <>
                                <button
                                  className="button-secondary h-9 px-3.5 text-xs"
                                  disabled={resumingId === draft.id}
                                  onClick={() => void openDraft(draft.id)}
                                  type="button"
                                >
                                  {resumingId === draft.id ? "Opening…" : "Open"}
                                </button>
                                <button
                                  aria-label="Discard draft"
                                  className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--color-status-critical)]"
                                  onClick={() => setDiscardTarget(draft)}
                                  type="button"
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              </>
                            )}
                            {draft.status === "published" && draft.publishedTemplateId && (
                              <Link className="button-secondary h-9 px-3.5 text-xs" href={`/templates/${encodeURIComponent(draft.publishedTemplateId)}/edit`}>
                                View template
                              </Link>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
            </>
          </div>
        )}

        {phase === "review" && serverDraft && (
          <div className="space-y-6">
            {serverDraft.provider === "fallback" && (
              <InlineAlert tone="warning">
                The AI assistant was unavailable, so this draft started from Evalora&apos;s closest researched blueprint. Review it carefully — it is fully editable.
              </InlineAlert>
            )}
            {serverDraft.draft.warnings.length > 0 && (
              <InlineAlert tone="info">
                <span className="font-semibold">What changed during validation:</span>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {serverDraft.draft.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </InlineAlert>
            )}

            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="min-w-0 space-y-6">
                <SectionCard description="Everything below is editable before publishing." title="Assessment details">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field label="Template name" required>
                      <input className={INPUT_CLASS} maxLength={160} onChange={(event) => { setTitle(event.target.value); markDirty(); }} value={title} />
                    </Field>
                    <Field label="Role" required>
                      <input className={INPUT_CLASS} maxLength={160} onChange={(event) => { setRoleType(event.target.value); markDirty(); }} value={roleType} />
                    </Field>
                    <Field hint="5–480" label="Time limit (minutes)">
                      <input
                        className={INPUT_CLASS}
                        max={480}
                        min={5}
                        onChange={(event) => { setTimeLimitMin(event.target.value); markDirty(); }}
                        type="number"
                        value={timeLimitMin}
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Description">
                        <textarea
                          className={`${INPUT_CLASS} min-h-20 resize-y`}
                          maxLength={600}
                          onChange={(event) => { setDescription(event.target.value); markDirty(); }}
                          rows={3}
                          value={description}
                        />
                      </Field>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  description="The AI rated each module's importance; Evalora turned the ratings into percentages. Edit any weight — the set always re-balances to total exactly 100%."
                  title="Module weights"
                >
                  <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[var(--theme-panel-soft)]">
                    {modules.map((module) => {
                      const share = weightTotal > 0 ? (positiveNumber(module.weight) / weightTotal) * 100 : 0;
                      return <div className={MODULE_META[module.type].bar} key={module.key} style={{ width: `${share}%` }} title={`${module.title}: ${module.weight}%`} />;
                    })}
                  </div>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {modules.map((module) => (
                      <li className="flex items-center gap-2 text-xs text-[var(--theme-text)]" key={module.key}>
                        <span className={`size-2.5 shrink-0 rounded-full ${MODULE_META[module.type].bar}`} />
                        <span className="truncate font-semibold">{module.title}</span>
                        <span className="ml-auto font-bold text-[var(--theme-heading)]">{module.weight}%</span>
                      </li>
                    ))}
                  </ul>
                  {!weightsBalanced && (
                    <p className="mt-3 text-xs font-semibold text-amber-600">
                      Current inputs total {weightTotal}%. Saving re-balances them to exactly 100%.
                    </p>
                  )}
                </SectionCard>

                {modules.map((module, index) => (
                  <ModuleEditor
                    index={index}
                    key={module.key}
                    module={module}
                    onAddQuestion={() => addQuestion(module.key)}
                    onRemove={() => setRemoveModuleKey(module.key)}
                    onRemoveQuestion={(questionKey) => removeQuestion(module.key, questionKey)}
                    onToggleCollapse={() => toggleCollapsed(module.key)}
                    onUpdate={(patch) => updateModule(module.key, patch)}
                    onUpdateQuestion={(questionKey, patch) => updateQuestion(module.key, questionKey, patch)}
                  />
                ))}
              </div>

              {/* Side column */}
              <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--theme-heading)]">
                    <Icon className="text-sky-500" name="message" size={15} /> Ask for changes
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">
                    Tell the assistant what to change — add or drop modules, rewrite questions, or reshape what came from your document. It edits this draft; you still publish.
                  </p>
                  <div className="mt-4">
                    <DraftChatPanel
                      disabled={publishing}
                      messages={chatMessages}
                      onSend={(message) => void handleChatSend(message)}
                      placeholder={serverDraft.source === "document" ? "e.g. summarize the document…" : "e.g. add a coding module…"}
                      sending={chatSending}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
                  <h2 className="text-sm font-bold text-[var(--theme-heading)]">Draft summary</h2>
                  <dl className="mt-4 space-y-3">
                    <SummaryRow label="Source" value={serverDraft.sourceFileName ?? (serverDraft.source === "prompt" ? "Written idea" : "Document")} />
                    <SummaryRow label="Generated by" value={serverDraft.provider === "deepseek" ? "Evalora AI" : "Researched blueprint"} />
                    <SummaryRow label="Modules" value={String(modules.length)} />
                    <SummaryRow label="Questions" value={String(questionTotal)} />
                    <SummaryRow label="Time limit" value={`${timeLimitMin} min`} />
                    <SummaryRow label="Weight total" value={weightsBalanced ? "100% ✓" : `${weightTotal}% → re-balances to 100%`} />
                  </dl>
                </div>
                <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--theme-heading)]">
                    <Icon className="text-sky-500" name="shield" size={15} /> You stay in control
                  </h2>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-[var(--theme-muted)]">
                    <li>Nothing is published until you confirm below.</li>
                    <li>Publishing uses your edited version; the original AI proposal is kept for reference.</li>
                    <li>Weights are validated and re-balanced by Evalora, never taken from the AI as-is.</li>
                    <li>AI feedback stays advisory — final decisions belong to your team.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Sticky action bar */}
            <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-4 shadow-[var(--theme-shadow)]">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
                onClick={() => { setPhase("source"); setNotice(""); setError(""); void refreshDrafts(); }}
                type="button"
              >
                <Icon className="rotate-90" name="chevron" size={14} /> Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--theme-muted)]">{dirty ? "Unsaved changes" : "All changes saved"}</span>
                <button className="button-secondary h-10 px-4 text-xs" disabled={saving || publishing || !dirty} onClick={() => void handleSave()} type="button">
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <button className="session-blue-button h-10 px-5 text-xs" disabled={saving || publishing} onClick={() => setPublishOpen(true)} type="button">
                  <Icon name="check" size={16} /> {publishing ? "Publishing…" : "Publish template"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="Publish template"
        message="Your edited draft becomes a real template in your workspace, ready to assign to candidates. You can keep editing it afterwards."
        onCancel={() => setPublishOpen(false)}
        onConfirm={() => void handlePublish()}
        open={publishOpen}
        pending={publishing}
        title="Publish this template?"
        tone="primary"
      />
      <ConfirmDialog
        confirmLabel="Discard draft"
        message={discardTarget ? `"${discardTarget.title}" will be discarded. This cannot be undone.` : ""}
        onCancel={() => setDiscardTarget(null)}
        onConfirm={() => void handleDiscard()}
        open={discardTarget !== null}
        pending={discarding}
        title="Discard this draft?"
        tone="danger"
      />
      <ConfirmDialog
        confirmLabel="Remove module"
        message="Its questions are removed with it. Remaining weights re-balance to 100% on save."
        onCancel={() => setRemoveModuleKey("")}
        onConfirm={() => { removeModule(removeModuleKey); setRemoveModuleKey(""); }}
        open={removeModuleKey !== ""}
        title="Remove this module?"
        tone="danger"
      />
    </AppShell>
  );
}

function ModuleEditor({ module, index, onUpdate, onRemove, onAddQuestion, onUpdateQuestion, onRemoveQuestion, onToggleCollapse }: {
  module: EditableModule;
  index: number;
  onUpdate: (patch: Partial<EditableModule>) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onUpdateQuestion: (questionKey: string, patch: Partial<EditableQuestion>) => void;
  onRemoveQuestion: (questionKey: string) => void;
  onToggleCollapse: () => void;
}) {
  const meta = MODULE_META[module.type];
  const signals = module.weightSignals;

  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.tile}`}>
            <Icon name={meta.icon} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--theme-faint)]">Module {index + 1} · {meta.label}</span>
              {signals.essential && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">Essential</span>}
            </div>
            <input
              className="mt-1 block w-full border-0 bg-transparent p-0 text-base font-bold text-[var(--theme-heading)] outline-none placeholder:text-[var(--theme-faint)]"
              maxLength={160}
              onChange={(event) => onUpdate({ title: event.target.value })}
              placeholder="Module title"
              value={module.title}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-muted)]">
            Weight
            <input
              className="w-16 rounded-lg border border-[var(--theme-border-strong)] bg-sky-50 px-2 py-1.5 text-center text-sm font-bold outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              min={0}
              onChange={(event) => onUpdate({ weight: event.target.value })}
              type="number"
              value={module.weight}
            />
            %
          </label>
          <button
            aria-label="Remove module"
            className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--color-status-critical)]"
            onClick={onRemove}
            type="button"
          >
            <Icon name="trash" size={15} />
          </button>
          <button
            aria-label={module.collapsed ? "Expand module" : "Collapse module"}
            className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
            onClick={onToggleCollapse}
            type="button"
          >
            <Icon className={module.collapsed ? "" : "rotate-180"} name="chevron" size={14} />
          </button>
        </div>
      </div>

      {/* Why this weight */}
      <div className="mt-4 rounded-lg border border-[var(--theme-border)] bg-sky-50/60 p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
          <Icon name="sparkle" size={13} /> Why this weight
        </p>
        <textarea
          className="mt-1.5 block w-full resize-y border-0 bg-transparent p-0 text-xs leading-5 text-[var(--theme-text)] outline-none"
          maxLength={400}
          onChange={(event) => onUpdate({ weightRationale: event.target.value })}
          rows={2}
          value={module.weightRationale}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <SignalChip label="Role importance" value={signals.roleImportance} />
          <SignalChip label="Risk if weak" value={signals.riskIfWeak} />
          <SignalChip label="Evidence" value={signals.evidenceVolume} />
          <SignalChip label="Difficulty" value={signals.difficulty} />
        </div>
      </div>

      {!module.collapsed && (
        <div className="mt-4 space-y-4">
          <Field label="Module description">
            <textarea
              className={`${INPUT_CLASS} min-h-16 resize-y`}
              maxLength={600}
              onChange={(event) => onUpdate({ description: event.target.value })}
              rows={2}
              value={module.description}
            />
          </Field>

          {module.type === "ai_interview" ? (
            <div className="rounded-lg border border-dashed border-[var(--theme-border-strong)] bg-[var(--theme-panel-soft)] p-4 text-sm text-[var(--theme-muted)]">
              Questions for this module are generated live during the assessment, adapting to each candidate&apos;s answers — there is nothing to author here.
            </div>
          ) : (
            <>
              {module.questions.map((question, questionIndex) => (
                <div className="rounded-lg border border-[var(--theme-border)] p-4" key={question.key}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[var(--theme-faint)]">Question {questionIndex + 1}</span>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-lg border border-[var(--theme-border-strong)] bg-sky-50 px-2 py-1.5 text-xs font-semibold outline-none transition focus:border-sky-500"
                        onChange={(event) => onUpdateQuestion(question.key, { questionType: event.target.value as QuestionType })}
                        value={question.questionType}
                      >
                        {QUESTION_TYPES.map((type) => (
                          <option key={type} value={type}>{questionTypeLabel(type)}</option>
                        ))}
                      </select>
                      <button
                        aria-label="Remove question"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--color-status-critical)]"
                        onClick={() => onRemoveQuestion(question.key)}
                        type="button"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    className={`${INPUT_CLASS} mt-2 min-h-20 resize-y`}
                    maxLength={1200}
                    onChange={(event) => onUpdateQuestion(question.key, { questionText: event.target.value })}
                    placeholder="Question text"
                    rows={3}
                    value={question.questionText}
                  />
                  {question.questionType === "mcq" && (
                    <Field hint="one per line, up to 8" label="Answer choices">
                      <textarea
                        className={`${INPUT_CLASS} min-h-16 resize-y`}
                        maxLength={1700}
                        onChange={(event) => onUpdateQuestion(question.key, { optionsText: event.target.value })}
                        rows={3}
                        value={question.optionsText}
                      />
                    </Field>
                  )}
                  <div className="mt-2">
                    <Field hint="comma-separated, up to 8" label="What to look for">
                      <textarea
                        className={`${INPUT_CLASS} min-h-14 resize-y`}
                        maxLength={1000}
                        onChange={(event) => onUpdateQuestion(question.key, { rubricText: event.target.value })}
                        placeholder="e.g. correctness, edge cases, clarity"
                        rows={2}
                        value={question.rubricText}
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <button
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-[var(--theme-border-strong)] px-3 text-xs font-semibold text-[var(--theme-muted)] transition hover:border-sky-400 hover:text-sky-600"
                onClick={onAddQuestion}
                type="button"
              >
                <Icon name="plus" size={14} /> Add question
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The chat thread and composer, without a card around it — each phase provides
 * its own framing. One composer covers both inputs: text in the bar, and (when
 * `attach` is provided) a document via the + button, shown as a chip until it
 * is sent. Enter sends; Shift+Enter makes a newline.
 */
function DraftChatPanel({ messages, sending, sendingLabel, disabled, placeholder, intro, rows = 1, attach, onSend }: {
  messages: ChatMessage[];
  sending: boolean;
  /** Shown in the thread while waiting; defaults to a short working note. */
  sendingLabel?: string;
  disabled?: boolean;
  placeholder: string;
  /** Assistant-style opener shown while the thread is still empty. */
  intro?: string;
  rows?: number;
  /** When set, the composer offers a + button that attaches one document. */
  attach?: { file: File | null; onPick: (file?: File) => void; onClear: () => void };
  onSend: (message: string) => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep the newest message in view; only the thread scrolls, never the page.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, sending]);

  const canSend = !sending && !disabled && (Boolean(input.trim()) || Boolean(attach?.file));

  /** Grow with the text instead of showing a scrollbar, up to a sane ceiling. */
  function autoGrow() {
    const field = textareaRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
  }

  function send() {
    if (!canSend) return;
    const message = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(message);
  }

  return (
    <div>
      {(messages.length > 0 || sending || intro) && (
        <div className="mb-3 max-h-96 space-y-2.5 overflow-y-auto pr-1" ref={scrollRef}>
          {messages.length === 0 && !sending && intro && (
            <div className="flex justify-start">
              <span className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-[var(--theme-panel-soft)] px-3.5 py-2.5 text-sm leading-5 text-[var(--theme-text)]">
                {intro}
              </span>
            </div>
          )}
          {messages.map((message) => (
            <ChatBubble key={message.key} message={message} />
          ))}
          {sending && (
            <div className="flex justify-start">
              <span className="inline-flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-[var(--theme-panel-soft)] px-3.5 py-2.5 text-sm leading-5 text-[var(--theme-muted)]">
                <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                {sendingLabel ?? "Working on it…"}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--theme-border-strong)] bg-[var(--theme-panel)] shadow-sm transition focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
        {attach?.file && (
          <div className="flex items-center justify-between gap-3 border-b border-[var(--theme-border)] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <Icon name="file" size={13} />
              </span>
              <p className="truncate text-xs font-semibold text-[var(--theme-heading)]">{attach.file.name}</p>
              <p className="shrink-0 text-xs text-[var(--theme-muted)]">{formatBytes(attach.file.size)}</p>
            </div>
            <button
              aria-label="Remove file"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
              onClick={attach.onClear}
              type="button"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1 p-2">
          {attach && (
            <>
              <input
                accept={DRAFT_UPLOAD_ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  attach.onPick(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
              <button
                aria-label="Attach a job description"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[var(--theme-muted)] transition hover:bg-[var(--theme-panel-soft)] hover:text-[var(--theme-heading)]"
                disabled={disabled}
                onClick={() => fileInputRef.current?.click()}
                title="Attach a job description (PDF, DOCX, TXT — up to 5 MB)"
                type="button"
              >
                <Icon name="plus" size={17} />
              </button>
            </>
          )}
          <textarea
            className="chat-composer-input max-h-40 min-w-0 flex-1 resize-none px-2 py-1.5 text-sm leading-6 placeholder:text-[var(--theme-faint)]"
            disabled={disabled}
            maxLength={MAX_DRAFT_CHAT_MESSAGE_LENGTH}
            onChange={(event) => {
              setInput(event.target.value);
              autoGrow();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            ref={textareaRef}
            rows={rows}
            value={input}
          />
          <button
            aria-label="Send message"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canSend}
            onClick={send}
            type="button"
          >
            <Icon name="paperPlane" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <span className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-sky-100 px-3.5 py-2.5 text-sm leading-5 text-sky-700">
          {message.content}
        </span>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <span
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-5 ${
          message.tone === "error"
            ? "bg-[var(--theme-panel-soft)] font-medium text-[var(--color-status-critical)]"
            : "bg-[var(--theme-panel-soft)] text-[var(--theme-text)]"
        }`}
      >
        {message.content}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: TemplateDraftSummary["status"] }) {
  const styles: Record<TemplateDraftSummary["status"], string> = {
    draft: "bg-sky-100 text-sky-700",
    published: "bg-emerald-100 text-emerald-700",
    discarded: "bg-[var(--theme-panel-soft)] text-[var(--theme-muted)]",
  };
  const labels: Record<TemplateDraftSummary["status"], string> = { draft: "Draft", published: "Published", discarded: "Discarded" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function SignalChip({ label, value }: { label: string; value: number }) {
  // sky-100/sky-700 rather than white-on-tint: both carry dark-theme patches
  // in globals.css, so the chips stay readable in all three themes.
  return (
    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
      {label} {value}/5
    </span>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-panel)] p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--theme-heading)]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[var(--theme-muted)]">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[var(--theme-text)]">
        {label}{required && <span className="text-[var(--color-status-critical)]"> *</span>}
        {hint ? <span className="ml-1.5 font-normal text-[var(--theme-faint)]">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="shrink-0 text-[var(--theme-muted)]">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-[var(--theme-heading)]" title={value}>
        {value}
      </dd>
    </div>
  );
}

// Utilities

/** The assistant's first bubble after a draft lands, inviting refinement. */
function describeDraft(dto: TemplateDraftDto): string {
  const questions = dto.draft.modules.reduce((sum, module) => sum + module.questions.length, 0);
  return `Here's a draft of "${dto.draft.title}": ${dto.draft.modules.length} modules and ${questions} questions. Tell me what to change — add or remove modules, rewrite questions, shift the focus — or edit anything directly.`;
}

function questionTypeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    short_answer: "Short answer",
    scenario: "Scenario",
    roleplay: "Roleplay",
    mcq: "Multiple choice",
    scale: "Scale",
    coding: "Coding",
  };
  return labels[type];
}

function defaultQuestionType(moduleType: ModuleType): QuestionType {
  if (moduleType === "coding" || moduleType === "debugging") return "coding";
  if (moduleType === "leadership" || moduleType === "problem_solving") return "scenario";
  if (moduleType === "communication") return "roleplay";
  return "short_answer";
}

function splitLines(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter(Boolean);
}

function splitCsv(text: string): string[] {
  return text.split(",").map((part) => part.trim()).filter(Boolean);
}

function positiveNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function clampInt(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function newKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
