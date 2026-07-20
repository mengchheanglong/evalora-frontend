"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, InterviewSession } from "@/lib/types";

const fieldClass =
  "w-full h-11 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15";
const fieldWithLeftIconClass =
  "w-full h-11 rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15";
const fieldHintClass = "mt-1.5 text-xs text-slate-500";

export default function CreateSessionPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdLink, setCreatedLink] = useState("");

  // Form state (Cleared defaults for real usage)
  const [sessionTitle, setSessionTitle] = useState("");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [newInterviewer, setNewInterviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionLanguage, setSessionLanguage] = useState("English");
  
  const [candidate, setCandidate] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("120");
  const [timeZone, setTimeZone] = useState("GMT+07:00 Phnom Penh");

  useEffect(() => {
    let cancelled = false;
    apiGet<AssessmentTemplate[]>("/templates")
      .then((items) => {
        if (cancelled) return;
        setTemplates(items);
        const requested = new URLSearchParams(window.location.search).get("templateId");
        setSelectedTemplateId(items.some((item) => item.id === requested) ? requested! : items[0]?.id ?? "");
      })
      .catch((requestError) => { if (!cancelled) setError(getErrorMessage(requestError)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId), [selectedTemplateId, templates]);

  // --- Interviewers Logic ---
  function addInterviewer() {
    const name = newInterviewer.trim();
    if (name && !interviewers.includes(name)) {
      setInterviewers([...interviewers, name]);
      setNewInterviewer("");
    }
  }

  function handleInterviewerKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addInterviewer();
    }
  }

  function removeInterviewer(name: string) {
    setInterviewers(interviewers.filter(i => i !== name));
  }

  // --- Backend Submission ---
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!candidate.trim() || !candidateEmail.trim()) {
      setError("Candidate Name and Email are required.");
      return;
    }
    if (!selectedTemplateId) {
      setError("Please select an assessment template.");
      return;
    }

    setError("");
    setSuccess("");
    setCreatedLink("");
    setSubmitting(true);

    try {
      // Map UI state to Backend Payload (matches POST /sessions workspace metadata).
      const payload = {
        candidateName: candidate,
        candidateEmail: candidateEmail,
        templateId: selectedTemplateId,
        title: sessionTitle || undefined,
        interviewType: interviewType || undefined,
        interviewers: interviewers.length ? interviewers : undefined,
        notes: notes || undefined,
        targetRole: position || undefined,
        department: department || undefined,
        sessionDate: sessionDate || undefined,
        startTime: startTime || undefined,
        durationMin: duration ? Number(duration) : undefined,
        language: sessionLanguage || undefined,
        timeZone: timeZone || undefined,
      };

      const session = await apiPost<InterviewSession>("/sessions", payload);
      const link =
        session.assessmentUrl ||
        `${window.location.origin}/assessment/${encodeURIComponent(session.accessCode)}`;
      setCreatedLink(link);
      const delivery = session.emailDelivery;
      if (delivery?.status === "sent") {
        setSuccess(`Session created and assessment email sent to ${candidateEmail}.`);
      } else if (delivery?.status === "queued") {
        setSuccess(`Session created. Email is sending in the background to ${candidateEmail}. Copy the link below as backup.`);
      } else if (delivery?.status === "failed") {
        setSuccess(`Session created, but email failed (${delivery.reason ?? "unknown"}). Copy the assessment link below.`);
      } else {
        setSuccess(
          `Session created. ${delivery?.reason ?? "Email is not configured — share the assessment link below."}`,
        );
      }
      // Brief pause so the user can copy the link, then go to the list.
      window.setTimeout(() => {
        router.push("/assessment");
        router.refresh();
      }, 2500);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create the session."));
    } finally {
      setSubmitting(false);
    }
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
            Assign an assessment template to a candidate and schedule the session.
          </p>
        </div>

        {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
        {success ? (
          <div className="mb-4 space-y-2">
            <InlineAlert tone="success">{success}</InlineAlert>
            {createdLink ? (
              <div className="rounded-lg border border-primary-100 bg-primary-50/40 p-3 text-sm">
                <p className="text-[11px] font-bold text-primary-800">Assessment link</p>
                <code className="mt-1 block break-all text-[12px] text-neutral-800">{createdLink}</code>
                <button
                  className="mt-2 text-[12px] font-bold text-primary-700 hover:text-primary-600"
                  onClick={() => void navigator.clipboard.writeText(createdLink)}
                  type="button"
                >
                  Copy link
                </button>
              </div>
            ) : null}
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

                  {/* Interviewers (Now Functional) */}
{/* Interviewers (Now Functional) */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Interviewers <span className="text-red-500">*</span></label>
  <div className="flex w-full  rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition hover:border-gray-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/15">
    {interviewers.map(interviewer => (
      <span key={interviewer} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1 border]">
        {interviewer}
        <button type="button" onClick={() => removeInterviewer(interviewer)} className="text-gray-400 hover:text-gray-600 ml-1">×</button>
      </span>
    ))}
    <input 
      type="text" 
      placeholder="Add interviewer and press Enter..." 
      value={newInterviewer}
      onChange={(e) => setNewInterviewer(e.target.value)}
      onKeyDown={handleInterviewerKeyDown}
      onBlur={addInterviewer}
      className="min-w-[150px] flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
    />
  </div>
  <p className={fieldHintClass}>Select one or more interviewers.</p>
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
                  <InputField label="Candidate Name" value={candidate} onChange={setCandidate} required />
                  <InputField label="Candidate Email" value={candidateEmail} onChange={setCandidateEmail} type="email" required />
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
                <p className="mt-2 text-xs text-slate-500">The candidate will receive an email invitation with the session details.</p>
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
                  <SummaryRow icon="users" label="Interviewers" value={interviewers.length > 0 ? `${interviewers.length} interviewers` : "None"} />
                  <SummaryRow icon="user" label="Candidate" value={candidate || "Not selected"} />
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
                  {submitting ? "Creating..." : "Create Session"} <Icon name="chevron" size={14} className="-rotate-90" />
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
