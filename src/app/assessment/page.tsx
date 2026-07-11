"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";

// --- Mock Data to match Figma Design exactly ---
type SessionStatusUI = "Completed" | "In Progress" | "Scheduled" | "Cancelled";

interface SessionRow {
  id: string;
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  templateTitle: string;
  category: string;
  interviewerName: string;
  interviewerRole: string;
  date: string;
  time: string;
  status: SessionStatusUI;
  progress: number;
}

const mockSessions: SessionRow[] = [
  {
    id: "1", sessionId: "SES-2026-0156", candidateName: "David Lee", candidateEmail: "david.lee@email.com",
    templateTitle: "Frontend Developer Interview", category: "Technical",
    interviewerName: "Sophia Kim", interviewerRole: "Team Lead",
    date: "May 28, 2026", time: "10:00 AM", status: "Completed", progress: 100,
  },
  {
    id: "2", sessionId: "SES-2026-0155", candidateName: "Emma Johnson", candidateEmail: "emma.j@email.com",
    templateTitle: "Backend Developer Assessment", category: "Technical",
    interviewerName: "Michael Chen", interviewerRole: "Senior Engineer",
    date: "May 28, 2026", time: "10:00 AM", status: "In Progress", progress: 65,
  },
  {
    id: "3", sessionId: "SES-2026-0154", candidateName: "Daniel Johnson", candidateEmail: "daniel.j@email.com",
    templateTitle: "Data Scientist Evaluation", category: "Technical",
    interviewerName: "Olivia Smith", interviewerRole: "Data Lead",
    date: "May 28, 2026", time: "10:00 AM", status: "Scheduled", progress: 0,
  },
  {
    id: "4", sessionId: "SES-2026-0153", candidateName: "Sophie Martin", candidateEmail: "sophie.m@email.com",
    templateTitle: "Data Scientist Evaluation", category: "Technical",
    interviewerName: "Michael Chen", interviewerRole: "Senior Engineer",
    date: "May 28, 2026", time: "10:00 AM", status: "Scheduled", progress: 0,
  },
  {
    id: "5", sessionId: "SES-2026-0152", candidateName: "James Brown", candidateEmail: "james.b@email.com",
    templateTitle: "Data Scientist Evaluation", category: "Behavioral",
    interviewerName: "Sophia Kim", interviewerRole: "Team Lead",
    date: "May 28, 2026", time: "10:00 AM", status: "Completed", progress: 100,
  },
  {
    id: "6", sessionId: "SES-2026-0151", candidateName: "James Brown", candidateEmail: "james.b@email.com",
    templateTitle: "Leadership & Communication", category: "Leadership",
    interviewerName: "Michael Chen", interviewerRole: "Senior Engineer",
    date: "May 28, 2026", time: "10:00 AM", status: "Cancelled", progress: 0,
  },
  {
    id: "7", sessionId: "SES-2026-0150", candidateName: "James Brown", candidateEmail: "james.b@email.com",
    templateTitle: "Data Scientist Evaluation", category: "Technical",
    interviewerName: "Sophia Kim", interviewerRole: "Team Lead",
    date: "May 28, 2026", time: "10:00 AM", status: "Completed", progress: 100,
  },
];

export default function SessionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  // Filter logic (mock)
  const filteredSessions = mockSessions.filter((s) => {
    const matchesSearch = s.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.sessionId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppShell active="session" title="" description="">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interview Sessions</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create, manage, and monitor all candidate interview sessions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
              <Icon name="file" size={16} className="text-purple-600" /> Export
            </button>
            <Link href="/assessment/create" className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 shadow-sm">
              <Icon name="plus" size={16} /> New Session
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Sessions" value="156" detail="All time sessions" icon="clipboard" tone="bg-purple-100 text-purple-600" />
          <StatCard label="Completed" value="82" detail="52.6% of total" icon="check" tone="bg-emerald-100 text-emerald-600" />
          <StatCard label="In Progress" value="41" detail="26.3% of total" icon="clock" tone="bg-sky-100 text-sky-600" />
          <StatCard label="Scheduled" value="28" detail="17.9% of total" icon="calendar" tone="bg-blue-100 text-blue-600" />
          <StatCard label="Cancelled" value="5" detail="3.2% of total" icon="more" tone="bg-rose-100 text-rose-600" />
        </section>

        {/* Main Content Card */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-gray-200 px-5 py-4 gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <SelectFilter value={statusFilter} onChange={setStatusFilter} options={["All Status", "Completed", "In Progress", "Scheduled", "Cancelled"]} />
              <SelectFilter value="All Templates" onChange={() => {}} options={["All Templates", "Technical", "Behavioral"]} />
              <SelectFilter value="All Interviewers" onChange={() => {}} options={["All Interviewers", "Sophia Kim", "Michael Chen"]} />
              <SelectFilter value="May 1, 2026 - May 31, 2026" onChange={() => {}} options={["May 1, 2026 - May 31, 2026"]} />
            </div>
            <div className="relative w-full lg:w-64">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" name="search" size={16} />
              <input
                type="search"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
                  <th className="px-4 py-3">Session ID</th>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Interviewer</th>
                  <th className="px-4 py-3">Session Date & Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-600">{session.sessionId}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs">
                          {session.candidateName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{session.candidateName}</p>
                          <p className="text-xs text-gray-500">{session.candidateEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900">{session.templateTitle}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(session.category)}`}>
                        {session.category}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xs">
                          {session.interviewerName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{session.interviewerName}</p>
                          <p className="text-xs text-gray-500">{session.interviewerRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Icon name="calendar" size={12} className="text-gray-400" />
                          <span className="text-xs">{session.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Icon name="clock" size={12} className="text-gray-400" />
                          <span className="text-xs">{session.time}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-4 py-4 w-32">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-900 w-8">{session.progress}%</span>
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${session.progress === 100 ? 'bg-sky-500' : session.progress > 0 ? 'bg-sky-400' : 'bg-gray-200'}`} 
                            style={{ width: `${session.progress}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                          <Icon name="eye" size={16} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Icon name="more" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

// --- Sub-Components ---

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: IconName; tone: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start gap-4">
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} size={24} />
      </span>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-[10px] text-gray-400 mt-1">{detail}</p>
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (val: string) => void; options: string[] }) {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

function StatusBadge({ status }: { status: SessionStatusUI }) {
  const styles: Record<SessionStatusUI, string> = {
    Completed: "text-emerald-700 bg-emerald-50 border-emerald-100",
    "In Progress": "text-sky-700 bg-sky-50 border-sky-100",
    Scheduled: "text-amber-700 bg-amber-50 border-amber-100",
    Cancelled: "text-rose-700 bg-rose-50 border-rose-100",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${styles[status]}`}>
      {status}
    </span>
  );
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    Technical: "bg-purple-50 text-purple-600",
    Behavioral: "bg-emerald-50 text-emerald-600",
    Leadership: "bg-sky-50 text-sky-600",
  };
  return colors[category] || "bg-gray-50 text-gray-600";
}