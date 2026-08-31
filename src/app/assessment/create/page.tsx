"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon, type IconName } from "@/components/icons";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, InterviewSession, WorkspaceMember } from "@/lib/types";

const fieldClass =
  "w-full h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15";
const fieldWithLeftIconClass =
  "w-full h-11 rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15";
const fieldHintClass = "mt-1.5 text-xs text-slate-500";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteOutcome {
  email: string;
  ok: boolean;
  /** Failure reason when the session could not be created. */
  reason: string;
  /** Whether the invitation email was sent or queued for a created session. */
  emailQueued: boolean;
}

export default function CreateSessionPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [failedInvites, setFailedInvites] = useState<{ email: string; reason: string }[]>([]);
  const [deliveryWarning, setDeliveryWarning] = useState("");

  // Form state (Cleared defaults for real usage)
  const [sessionTitle, setSessionTitle] = useState("");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [interviewerQuery, setInterviewerQuery] = useState("");
  const [interviewerPickerOpen, setInterviewerPickerOpen] = useState(false);
  const [activeInterviewerIndex, setActiveInterviewerIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [sessionLanguage, setSessionLanguage] = useState("English");
  
  const [candidateEmails, setCandidateEmails] = useState<string[]>([]);
  const [candidateEmailInput, setCandidateEmailInput] = useState("");
  const [candidateEmailError, setCandidateEmailError] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("120");
  const [timeZone, setTimeZone] = useState("GMT+07:00 Phnom Penh");

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      apiGet<AssessmentTemplate[]>("/templates"),
      apiGet<WorkspaceMember[]>("/organization/members"),
    ])
      .then(([items, workspaceMembers]) => {
        if (cancelled) return;
        setTemplates(items);
        setMembers(workspaceMembers);
        const requested = new URLSearchParams(window.location.search).get("templateId");
        setSelectedTemplateId(items.some((item) => item.id === requested) ? requested! : items[0]?.id ?? "");
      })
      .catch((requestError) => { if (!cancelled) setError(getErrorMessage(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, user?.id]);

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId), [selectedTemplateId, templates]);
  const selectedInterviewers = useMemo(
    () => interviewerIds.map((id) => members.find((member) => member.id === id)).filter((member): member is WorkspaceMember => Boolean(member)),
    [interviewerIds, members],
  );
  const creator = useMemo(
    () => members.find((member) => member.isCurrentUser) ?? members.find((member) => member.id === user?.id),
    [members, user?.id],
  );
  const availableInterviewers = useMemo(() => {
    const selected = new Set(interviewerIds);
    const query = interviewerQuery.trim().toLowerCase();
    return members.filter((member) => {
      if (selected.has(member.id)) return false;
      if (!query) return true;
      return member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query);
    });
  }, [interviewerIds, interviewerQuery, members]);
  const defaultInterviewerName = creator?.name ?? user?.name ?? "Session creator";

  // --- Interviewers Logic ---
  function addInterviewer(member: WorkspaceMember) {
    setInterviewerIds((current) => current.includes(member.id) ? current : [...current, member.id]);
    setInterviewerQuery("");
    setActiveInterviewerIndex(0);
    setInterviewerPickerOpen(true);
  }

  function handleInterviewerKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setInterviewerPickerOpen(true);
      setActiveInterviewerIndex((current) => Math.min(current + 1, Math.max(availableInterviewers.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveInterviewerIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const member = availableInterviewers[activeInterviewerIndex] ?? availableInterviewers[0];
      if (member) addInterviewer(member);
      return;
    }
    if (e.key === "Escape") {
      setInterviewerPickerOpen(false);
      return;
    }
    if (e.key === "Backspace" && !interviewerQuery && interviewerIds.length) {
      setInterviewerIds((current) => current.slice(0, -1));
    }
  }

  function removeInterviewer(id: string) {
    setInterviewerIds((current) => current.filter((interviewerId) => interviewerId !== id));
  }

  // --- Candidate Emails Logic ---
  /** Splits raw text into email tokens and merges valid ones into the chip list. Returns the merged list, or null when a token is invalid. */
  function mergeCandidateEmails(raw: string): string[] | null {
    const tokens = raw.split(/[\s,;]+/).map((token) => token.trim()).filter(Boolean);
    const invalid = tokens.filter((token) => !EMAIL_PATTERN.test(token));
    if (invalid.length) {
      setCandidateEmailError(`Not a valid email: ${invalid.join(", ")}`);
      return null;
    }
    setCandidateEmailError("");
    const seen = new Set(candidateEmails.map((item) => item.toLowerCase()));
    const merged = [...candidateEmails];
    for (const token of tokens) {
      const normalized = token.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      merged.push(token);
    }
    return merged;
  }

  function commitCandidateEmails(raw: string) {
    const merged = mergeCandidateEmails(raw);
    if (!merged) return;
    setCandidateEmails(merged);
    setCandidateEmailInput("");
  }

  function handleCandidateEmailKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commitCandidateEmails(candidateEmailInput);
      return;
    }
    if (e.key === "Backspace" && !candidateEmailInput && candidateEmails.length) {
      setCandidateEmails((current) => current.slice(0, -1));
    }
  }

  function handleCandidateEmailPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!/[\s,;]/.test(text.trim())) return;
    e.preventDefault();
    commitCandidateEmails(`${candidateEmailInput} ${text}`);
  }

  function removeCandidateEmail(email: string) {
    setCandidateEmails((current) => current.filter((item) => item !== email));
  }

  // --- Backend Submission ---
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Fold anything still typed in the email input into the chip list before validating.
    const emails = mergeCandidateEmails(candidateEmailInput);
    if (!emails) return;
    setCandidateEmails(emails);
    setCandidateEmailInput("");

    if (!emails.length) {
      setError("Add at least one candidate email.");
      return;
    }
    if (!selectedTemplateId) {
      setError("Please select an assessment template.");
      return;
    }

    setError("");
    setSuccess("");
    setFailedInvites([]);
    setDeliveryWarning("");
    setSubmitting(true);

    // Map UI state to Backend Payload (matches POST /sessions workspace metadata).
    // The backend derives each candidate's name from their email. The absolute
    // timestamp preserves the interviewer's local wall-clock time.
    const scheduledAt = sessionDate && startTime
      ? new Date(`${sessionDate}T${startTime}`).toISOString()
      : undefined;
    const basePayload = {
      templateId: selectedTemplateId,
      title: sessionTitle || undefined,
      interviewType: interviewType || undefined,
      interviewers: selectedInterviewers.length ? selectedInterviewers.map((member) => member.name) : undefined,
      interviewerIds: selectedInterviewers.length ? selectedInterviewers.map((member) => member.id) : undefined,
      notes: notes || undefined,
      targetRole: position || undefined,
      department: department || undefined,
      scheduledAt,
      sessionDate: sessionDate || undefined,
      startTime: startTime || undefined,
      durationMin: duration ? Number(duration) : undefined,
      language: sessionLanguage || undefined,
      timeZone: timeZone || undefined,
    };

    // One session per candidate — each gets their own access code and invite email.
    const results = await Promise.all(
      emails.map(async (email): Promise<InviteOutcome> => {
        try {
          const session = await apiPost<InterviewSession>("/sessions", { ...basePayload, candidateEmail: email });
          const delivery = session.emailDelivery;
          return { email, ok: true, reason: "", emailQueued: delivery?.status === "sent" || delivery?.status === "queued" };
        } catch (requestError) {
          return { email, ok: false, reason: getErrorMessage(requestError, "Unable to create the session."), emailQueued: false };
        }
      }),
    );

    const failed = results.filter((result) => !result.ok);
    const created = results.filter((result) => result.ok);
    const unsent = created.filter((result) => !result.emailQueued);

    setFailedInvites(failed.map(({ email, reason }) => ({ email, reason })));
    setDeliveryWarning(
      unsent.length
        ? `The invitation email could not be sent to ${unsent.map((result) => result.email).join(", ")}. Share their assessment links from the session list instead.`
        : "",
    );

    if (!failed.length) {
      setCandidateEmails([]);
      if (unsent.length) {
        setSuccess(created.length === 1 ? "Session created." : `Sessions created for all ${created.length} candidates.`);
      } else {
        setSuccess(
          created.length === 1
            ? "Session created — the invitation email is on its way to the candidate."
            : `Sessions created — invitation emails are on their way to all ${created.length} candidates.`,
        );
        window.setTimeout(() => {
          router.push("/assessment");
          router.refresh();
        }, 2500);
      }
    } else {
      // Keep only the failed emails in the field so the user can retry them.
      setCandidateEmails(failed.map((result) => result.email));
      if (created.length) {
        setSuccess(`Sessions created and invitations sent for ${created.length} of ${results.length} candidates.`);
      }
      setError(
        failed.length === 1
          ? "1 invitation failed. The failed email was kept in the form — fix the issue and create again."
          : `${failed.length} invitations failed. The failed emails were kept in the form — fix the issue and create again.`,
      );
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <AppShell active="session" title="" description="">
        <PageLoader label="Loading assessment templates" />
      </AppShell>
    );
  }

  if (error && !templates.length) {
    return (
      <AppShell active="session" title="" description="">
        <ErrorState message={error} />
      </AppShell>
    );
  }

  if (!templates.length) {
    return (
      <AppShell active="session" title="" description="">
        <ErrorState message="Create an assessment template before inviting a candidate." />
      </AppShell>
    );
  }

  return (
    <AppShell active="session" title="" description="" showPageHeader={false}>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Custom Page Header */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/assessment" className="hover:text-gray-900">Interview Session</Link>
          <Icon name="chevron" size={12} className="text-gray-400 rotate-180" />
          <span className="text-gray-900 font-medium">Create Session</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Interview Session</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign an assessment template to one or more candidates and schedule the session.
          </p>
        </div>

        {error ? (
          <InlineAlert tone="error">
            {error}
            {failedInvites.length ? (
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                {failedInvites.map((failure) => (
                  <li key={failure.email}>
                    <span className="font-semibold">{failure.email}</span> — {failure.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </InlineAlert>
        ) : null}
        {success || deliveryWarning ? (
          <div className="mb-4 space-y-2">
            {success ? <InlineAlert tone="success">{success}</InlineAlert> : null}
            {deliveryWarning ? <InlineAlert tone="warning">{deliveryWarning}</InlineAlert> : null}
          </div>
        ) : null}

        {/* Wrap the main area in a form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form Area (Left Column) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
              {/* Stepper */}
              <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6 overflow-x-auto">
                <StepItem number={1} title="Session Details" active={true} />
              </div>

              {/* Template Information Section */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Template Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Session Title" value={sessionTitle} onChange={setSessionTitle} required />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template <span className="text-red-500">*</span></label>
                    <select
                      className={fieldClass}
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      required
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    <p className={fieldHintClass}>Choose an assessment template.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interview Type <span className="text-red-500">*</span></label>
                    <select
                      className={fieldClass}
                      value={interviewType}
                      onChange={(e) => setInterviewType(e.target.value)}
                    >
                      <option>Technical Interview</option>
                      <option>Behavioral Interview</option>
                      <option>Leadership Interview</option>
                    </select>
                    <p className={fieldHintClass}>Select the type of interview.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="interviewer-search">
                      Interviewers
                    </label>
                    <div className="relative">
                      <div className="interviewer-token-field flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 transition hover:border-slate-400 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-500/15">
                        {selectedInterviewers.map((interviewer) => (
                          <span
                            className="interviewer-token inline-flex h-7 items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 text-xs font-medium text-sky-800"
                            key={interviewer.id}
                          >
                            {interviewer.name}
                            <button
                              aria-label={`Remove ${interviewer.name}`}
                              className="text-sky-500 transition hover:text-sky-800"
                              onClick={() => removeInterviewer(interviewer.id)}
                              type="button"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          aria-activedescendant={
                            interviewerPickerOpen && availableInterviewers[activeInterviewerIndex]
                              ? `interviewer-option-${availableInterviewers[activeInterviewerIndex].id}`
                              : undefined
                          }
                          aria-autocomplete="list"
                          aria-controls="interviewer-options"
                          aria-expanded={interviewerPickerOpen}
                          autoComplete="off"
                          className="interviewer-token-input h-7 min-w-[170px] flex-1 bg-transparent px-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                          id="interviewer-search"
                          onBlur={() => window.setTimeout(() => setInterviewerPickerOpen(false), 120)}
                          onChange={(event) => {
                            setInterviewerQuery(event.target.value);
                            setActiveInterviewerIndex(0);
                            setInterviewerPickerOpen(true);
                          }}
                          onFocus={() => setInterviewerPickerOpen(true)}
                          onKeyDown={handleInterviewerKeyDown}
                          placeholder={selectedInterviewers.length ? "Add another member..." : "Search team members..."}
                          role="combobox"
                          type="text"
                          value={interviewerQuery}
                        />
                      </div>

                      {interviewerPickerOpen ? (
                        <ul
                          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                          id="interviewer-options"
                          role="listbox"
                        >
                          {availableInterviewers.length ? (
                            availableInterviewers.map((member, index) => (
                              <li
                                aria-selected={index === activeInterviewerIndex}
                                className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                                  index === activeInterviewerIndex ? "bg-sky-50 text-sky-900" : "text-slate-700 hover:bg-slate-50"
                                }`}
                                id={`interviewer-option-${member.id}`}
                                key={member.id}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  addInterviewer(member);
                                }}
                                role="option"
                              >
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold uppercase text-sky-700">
                                  {member.name.slice(0, 1)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2 font-semibold">
                                    <span className="truncate">{member.name}</span>
                                    {member.isCurrentUser ? (
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                                        You
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="block truncate text-xs text-slate-500">{member.email}</span>
                                </span>
                                <span className="text-xs text-slate-400">{member.roleLabel}</span>
                              </li>
                            ))
                          ) : (
                            <li className="px-3 py-3 text-sm text-slate-500">
                              {interviewerQuery.trim() ? "No matching team member." : "All team members are selected."}
                            </li>
                          )}
                        </ul>
                      ) : null}
                    </div>
                    <p className={fieldHintClass}>
                      {selectedInterviewers.length
                        ? `${selectedInterviewers.length} team ${selectedInterviewers.length === 1 ? "member" : "members"} assigned.`
                        : `${defaultInterviewerName} will be assigned by default.`}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                      className="min-h-[92px] w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <p className={fieldHintClass}>Add any additional notes for interviewers.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Language</label>
                    <select
                      className={fieldClass}
                      value={sessionLanguage}
                      onChange={(e) => setSessionLanguage(e.target.value)}
                    >
                      <option>English</option>
                      <option>Khmer</option>
                    </select>
                    <p className={fieldHintClass}>Language for the interview session.</p>
                  </div>
                </div>
              </div>

              {/* Candidate Information Section */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Candidate Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="candidate-emails">
                      Candidate Emails <span className="text-red-500">*</span>
                    </label>
                    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 transition hover:border-slate-400 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-500/15">
                      {candidateEmails.map((email) => (
                        <span
                          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 text-xs font-medium text-sky-800"
                          key={email}
                        >
                          {email}
                          <button
                            aria-label={`Remove ${email}`}
                            className="text-sky-500 transition hover:text-sky-800"
                            onClick={() => removeCandidateEmail(email)}
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      <input
                        autoComplete="off"
                        className="h-7 min-w-[220px] flex-1 bg-transparent px-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        id="candidate-emails"
                        onBlur={() => { if (candidateEmailInput.trim()) commitCandidateEmails(candidateEmailInput); }}
                        onChange={(event) => {
                          setCandidateEmailInput(event.target.value);
                          if (candidateEmailError) setCandidateEmailError("");
                        }}
                        onKeyDown={handleCandidateEmailKeyDown}
                        onPaste={handleCandidateEmailPaste}
                        placeholder={candidateEmails.length ? "Add another email..." : "candidate@example.com, another@example.com"}
                        type="text"
                        value={candidateEmailInput}
                      />
                    </div>
                    <p className={candidateEmailError ? "mt-1.5 text-xs text-red-600" : fieldHintClass}>
                      {candidateEmailError ||
                        (candidateEmails.length
                          ? `${candidateEmails.length} candidate${candidateEmails.length === 1 ? "" : "s"} will be invited — each gets their own session and assessment link.`
                          : "Type an email and press Enter, or paste a comma-separated list to invite several candidates at once.")}
                    </p>
                  </div>
                  <InputField label="Position" value={position} onChange={setPosition} />
                  <InputField label="Department (Optional)" value={department} onChange={setDepartment} />
                </div>
              </div>

              {/* Schedule Section */}
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Schedule</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Date <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Icon name="calendar" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="date" 
                        className={fieldWithLeftIconClass}
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="time" 
                        className={fieldWithLeftIconClass}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="number" 
                        className="w-full h-11 rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">min</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Icon name="globe" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        className={fieldWithLeftIconClass}
                        value={timeZone}
                        onChange={(e) => setTimeZone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Each candidate will receive their own email invitation with the session details.</p>
              </div>
            </div>

            {/* Sidebar (Right Column) */}
            <div className="space-y-6">
              {/* Session Summary Card (Live Updates) */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4">Session Summary</h3>
                <div className="space-y-4 text-sm">
                  <SummaryRow icon="clipboard" label="Session Title" value={sessionTitle || "Untitled Session"} />
                  <SummaryRow icon="file" label="Template" value={selectedTemplate?.title || "Not selected"} />
                  <SummaryRow icon="message" label="Interview Type" value={interviewType} />
                  <SummaryRow
                    icon="users"
                    label="Interviewers"
                    value={
                      selectedInterviewers.length
                        ? selectedInterviewers.map((member) => member.name).join(", ")
                        : `${defaultInterviewerName} (default)`
                    }
                  />
                  <SummaryRow
                    icon="user"
                    label="Candidates"
                    value={
                      candidateEmails.length
                        ? `${candidateEmails.length} invited: ${candidateEmails.join(", ")}`
                        : "None added"
                    }
                  />
                  <SummaryRow icon="clock" label="Estimated Duration" value={duration ? `${duration} minutes` : "Not set"} />
                  <SummaryRow icon="globe" label="Language" value={sessionLanguage} />
                </div>
              </div>

              {/* Selected Modules Card (Now shows real modules from the template) */}
              <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900">Selected Modules</h3>
                  <span className="text-xs text-gray-500">{selectedTemplate?.modules.length || 0} modules included</span>
                </div>
                {selectedTemplate && selectedTemplate.modules.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTemplate.modules.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs text-gray-600">
                        <Icon name="check" size={12} className="text-sky-500" />
                        <span>{m.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Icon name="clipboard" size={32} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">No modules selected</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                      The selected template does not have any modules yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Link href="/assessment" className="flex-1 h-10 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition bg-white flex items-center justify-center">
                  Cancel
                </Link>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-10 bg-sky-500 rounded-lg text-sm font-medium text-white hover:bg-sky-600 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Creating..." : candidateEmails.length > 1 ? `Create ${candidateEmails.length} Sessions` : "Create Session"} <Icon name="chevron" size={14} className="-rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

// --- Sub-Components ---

function StepItem({ number, title, active }: { number: number; title: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${active ? "bg-sky-500 text-white" : "bg-gray-200 text-gray-500"}`}>
        {number}
      </div>
      <span className={`text-sm font-medium whitespace-nowrap ${active ? "text-sky-500" : "text-gray-500"}`}>{title}</span>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", required = false }: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  type?: string; 
  required?: boolean 
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} size={16} className="text-gray-400 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
