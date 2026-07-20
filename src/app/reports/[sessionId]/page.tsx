"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ReportGeneratePrompt, ReportView } from "@/components/report-view";
import { ErrorState, InlineAlert, PageLoader } from "@/components/ui-states";
import { ApiError, apiGet, apiPost, getErrorMessage } from "@/lib/api";
import type { CandidateReport, InterviewSession, ReviewerNote } from "@/lib/types";

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [notes, setNotes] = useState<ReviewerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextSession = await apiGet<InterviewSession>(`/sessions/${encodeURIComponent(sessionId)}`);
      setSession(nextSession);
      const [nextNotes, nextReport] = await Promise.all([
        apiGet<ReviewerNote[]>(`/reports/${encodeURIComponent(sessionId)}/notes`),
        apiGet<CandidateReport>(`/reports/${encodeURIComponent(sessionId)}`).catch((requestError) => {
          if (requestError instanceof ApiError && requestError.status === 404) return null;
          throw requestError;
        }),
      ]);
      setNotes(nextNotes);
      setReport(nextReport);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  async function generateReport() {
    setGenerating(true);
    setError("");
    try {
      const generated = await apiPost<CandidateReport>(`/reports/${encodeURIComponent(sessionId)}/generate`);
      setReport(generated);
      setNotice(generated.persistence?.status === "persisted" ? "Report generated from saved candidate evidence." : "Report processing completed, but persistence is still pending.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to generate this report."));
    } finally {
      setGenerating(false);
    }
  }

  async function addNote(note: string): Promise<boolean> {
    const trimmed = note.trim();
    if (!trimmed) return false;
    setSavingNote(true);
    setError("");
    try {
      const saved = await apiPost<ReviewerNote>(`/reports/${encodeURIComponent(sessionId)}/notes`, { note: trimmed });
      setNotes((current) => [saved, ...current]);
      setNotice("Reviewer note saved.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to save this note."));
      return false;
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <AppShell active="candidates" description="AI-supported assessment summary and extracted candidate insights." showPageHeader={false} title="Candidate Report">
      {loading ? <PageLoader label="Loading private report" /> : null}
      {!loading && error && !session ? <ErrorState message={error} onRetry={() => void loadReport()} /> : null}
      {!loading && session ? (
        <div className="mx-auto max-w-[1180px] space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-primary-600">Candidate Report</p>
              <h1 className="mt-1 text-[28px] font-black leading-tight text-neutral-950">Assessment Summary</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link className="button-secondary h-11 rounded-[9px] px-4 text-[13px]" href={`/candidates/${session.id}`}>
                <Icon className="rotate-90" name="chevron" size={14} /> Back
              </Link>
              {report ? (
                <button className="button-primary h-11 rounded-[9px] px-4 text-[13px] !bg-primary-600 hover:!bg-primary-700" onClick={() => window.print()} type="button">
                  <Icon name="file" size={15} /> Print / Export
                </button>
              ) : null}
            </div>
          </header>

          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
          {notice ? <InlineAlert tone="success">{notice}</InlineAlert> : null}

          {report
            ? <ReportView notes={notes} onAddNote={addNote} report={report} role={session.targetRole} savingNote={savingNote} />
            : <ReportGeneratePrompt completed={session.status === "completed"} generating={generating} onGenerate={() => void generateReport()} />}
        </div>
      ) : null}
    </AppShell>
  );
}
