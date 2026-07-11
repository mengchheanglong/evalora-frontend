"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate, InterviewSession } from "@/lib/types";

export default function CreateSessionPage() {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<AssessmentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [createdSession, setCreatedSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [sessionTitle, setSessionTitle] = useState("Frontend Developer Interview - David Lee");
  const [interviewType, setInterviewType] = useState("Technical Interview");
  const [interviewers, setInterviewers] = useState(["Sophia Kim", "Michael Chen"]);
  const [notes, setNotes] = useState("This session will evaluate the candidate's technical skills, problem-solving ability and communication.");
  const [sessionLanguage, setSessionLanguage] = useState("English");
  const [candidate, setCandidate] = useState("David Lee (david.lee@email.com)");
  const [candidateEmail, setCandidateEmail] = useState("david.lee@email.com");
  const [position, setPosition] = useState("Frontend Developer");
  const [department, setDepartment] = useState("Engineering");
  const [sessionDate, setSessionDate] = useState("May 28, 2026");
  const [startTime, setStartTime] = useState("10:00 AM");
  const [duration, setDuration] = useState("120m");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setSubmitting(true);
    try {
      const expiresOn = String(form.get("expiresOn") ?? "");
      const session = await apiPost<InterviewSession>("/sessions", {
        candidateName: String(form.get("candidateName") ?? ""),
        candidateEmail: String(form.get("candidateEmail") ?? ""),
        templateId: String(form.get("templateId") ?? ""),
        expiresAt: expiresOn ? new Date(`${expiresOn}T23:59:59.999Z`).toISOString() : undefined,
      });
      setCreatedSession(session);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create the invitation."));
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
            Build a comprehensive assessment template by adding basic information and modules.
          </p>
        </div>

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
                    className="w-full h-[42px] border border-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Choose an assessment template.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interview Type <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full h-[42px] border border-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value)}
                  >
                    <option>Technical Interview</option>
                    <option>Behavioral Interview</option>
                    <option>Leadership Interview</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Select the type of interview.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interviewers <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-[42px] items-center bg-white">
                    {interviewers.map(interviewer => (
                      <span key={interviewer} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1 border border-gray-200">
                        {interviewer}
                        <button className="text-gray-400 hover:text-gray-600 ml-1">×</button>
                      </span>
                    ))}
                    <input type="text" placeholder="Add interviewer..." className="flex-1 min-w-[100px] outline-none text-sm bg-transparent" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Select one or more interviewers.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 min-h-[80px] bg-white"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Add any additional notes for interviewers.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session Language</label>
                  <select 
                    className="w-full h-[42px] border border-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    value={sessionLanguage}
                    onChange={(e) => setSessionLanguage(e.target.value)}
                  >
                    <option>English</option>
                    <option>Khmer</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Language for the interview session.</p>
                </div>
              </div>
            </div>

            {/* Candidate Information Section */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Candidate Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    className="w-full h-[42px] border border-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    value={candidate}
                    onChange={(e) => setCandidate(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Select the candidate for this session.</p>
                </div>
                <InputField label="Candidate Email" value={candidateEmail} onChange={setCandidateEmail} type="email" />
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
                      type="text" 
                      className="w-full h-[42px] border border-gray-300 rounded-lg pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      className="w-full h-[42px] border border-gray-300 rounded-lg pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Icon name="clock" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      className="w-full h-[42px] border border-gray-300 rounded-lg pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Icon name="globe" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" 
                      className="w-full h-[42px] border border-gray-300 rounded-lg pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">The candidate will receive an email invitation with the session details.</p>
            </div>
          </div>

          {/* Sidebar (Right Column) */}
          <div className="space-y-6">
            {/* Session Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Session Summary</h3>
              <div className="space-y-4 text-sm">
                <SummaryRow icon="clipboard" label="Session Title" value={sessionTitle} />
                <SummaryRow icon="file" label="Template" value={selectedTemplate?.title || "Not selected"} />
                <SummaryRow icon="message" label="Interview Type" value={interviewType} />
                <SummaryRow icon="users" label="Interviewers" value={`${interviewers.length} interviewers`} />
                <SummaryRow icon="user" label="Candidate" value={candidate.split(' ')[0] || "Not selected"} />
                <SummaryRow icon="clock" label="Estimated Duration" value={duration} />
                <SummaryRow icon="globe" label="Language" value={sessionLanguage} />
              </div>
            </div>

            {/* Selected Modules Card */}
            <div className="bg-white rounded-xl border-2 border-sky-400 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Selected Modules</h3>
                <span className="text-xs text-gray-500">0 modules selected</span>
              </div>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Icon name="clipboard" size={32} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No modules selected yet</p>
                <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                  In the next step, you will select the assessment modules to include in this session.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button className="flex-1 h-10 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition bg-white">
                Cancel
              </button>
              <button className="flex-1 h-10 bg-sky-500 rounded-lg text-sm font-medium text-white hover:bg-sky-600 transition flex items-center justify-center gap-2 shadow-sm">
                Save & Continue <Icon name="chevron" size={14} className="-rotate-90" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// --- Sub-Components ---

function StepItem({ number, title, active }: { number: number; title: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${active ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"}`}>
        {number}
      </div>
      <span className={`text-sm font-medium whitespace-nowrap ${active ? "text-purple-600" : "text-gray-500"}`}>{title}</span>
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
        {/* This adds the red asterisk if 'required' is true */}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input 
        type={type} 
        className="w-full h-[42px] border border-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required} // Adds HTML5 required validation too
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