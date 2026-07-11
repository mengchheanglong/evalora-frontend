"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { EmptyState, PageLoader } from "@/components/ui-states";

// --- Mock Data to match Figma Design exactly ---
// In a real app, you would fetch this from your API and map it to this structure.
type TemplateStatus = "Active" | "Draft" | "Archived";
type TemplateCategory = "Technical" | "Behavioral" | "Leadership" | "Communication" | "General";

interface TemplateRow {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  targetRoles: string;
  modulesCount: number;
  questionsCount: number;
  lastUpdate: string;
  updatedBy: string;
  status: TemplateStatus;
  icon: IconName;
  iconColor: string;
}

const mockTemplates: TemplateRow[] = [
  {
    id: "1",
    title: "Frontend Developer Interview",
    description: "Complete assessment for frontend developer candidates",
    category: "Technical",
    targetRoles: "Frontend Developer, UI Developer",
    modulesCount: 5,
    questionsCount: 28,
    lastUpdate: "May 28, 2026",
    updatedBy: "Sophia kim",
    status: "Active",
    icon: "code",
    iconColor: "bg-indigo-100 text-indigo-600",
  },
  {
    id: "2",
    title: "Backend Developer Assessment",
    description: "Evaluate backend development skills and problem solving",
    category: "Technical",
    targetRoles: "Backend Developer, API Developer",
    modulesCount: 6,
    questionsCount: 32,
    lastUpdate: "May 25, 2026",
    updatedBy: "Sophia kim",
    status: "Active",
    icon: "user",
    iconColor: "bg-blue-100 text-blue-600",
  },
  {
    id: "3",
    title: "Behavioral Assessment",
    description: "Assess personality, work style, and behavioral competencies",
    category: "Behavioral",
    targetRoles: "All Roles",
    modulesCount: 4,
    questionsCount: 24,
    lastUpdate: "May 20, 2026",
    updatedBy: "Sophia kim",
    status: "Active",
    icon: "analytics",
    iconColor: "bg-orange-100 text-orange-600",
  },
  {
    id: "4",
    title: "Leadership & Communication",
    description: "Evaluate leadership potential and communication skills",
    category: "Leadership",
    targetRoles: "Team Lead, Manager, Senior Roles",
    modulesCount: 4,
    questionsCount: 20,
    lastUpdate: "May 18, 2026",
    updatedBy: "Sophia kim",
    status: "Active",
    icon: "message",
    iconColor: "bg-sky-100 text-sky-600",
  },
  {
    id: "5",
    title: "Full Stack Developer Assessment",
    description: "Comprehensive assessment for full stack developer",
    category: "Technical",
    targetRoles: "Full Stack Developer",
    modulesCount: 7,
    questionsCount: 36,
    lastUpdate: "May 15, 2026",
    updatedBy: "Sophia kim",
    status: "Draft",
    icon: "file", 
    iconColor: "bg-blue-100 text-blue-600",
  },
  {
    id: "6",
    title: "Data Scientist Evaluation",
    description: "Assess data science skills and analytical thinking",
    category: "Technical",
    targetRoles: "Data Scientist, ML Engineer",
    modulesCount: 6,
    questionsCount: 30,
    lastUpdate: "May 15, 2026",
    updatedBy: "Sophia kim",
    status: "Draft",
    icon: "analytics",
    iconColor: "bg-blue-100 text-blue-600",
  },
  {
    id: "7",
    title: "Product Manager Assessment",
    description: "Evaluate product thinking and decision making",
    category: "General",
    targetRoles: "Product Manager, Associate PM",
    modulesCount: 5,
    questionsCount: 22,
    lastUpdate: "Apr 28, 2026",
    updatedBy: "Sophia kim",
    status: "Archived",
    icon: "building",
    iconColor: "bg-orange-100 text-orange-600",
  },
];

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<"All" | TemplateCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logic
  const filteredTemplates = mockTemplates.filter((t) => {
    const matchesTab = activeTab === "All" || t.category === activeTab;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Stats calculation
  const stats = {
    total: mockTemplates.length,
    active: mockTemplates.filter((t) => t.status === "Active").length,
    draft: mockTemplates.filter((t) => t.status === "Draft").length,
    archived: mockTemplates.filter((t) => t.status === "Archived").length,
  };

  const tabs: Array<"All" | TemplateCategory> = ["All", "Technical", "Behavioral", "Leadership", "Communication", "General"];

  return (
    <AppShell active="templates" title="" description="">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assessment Templates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Created and manage assessment templates for different roles and evaluation types.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Icon name="menu" size={16} /> Filters
            </button>
            <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none">
              <option>All Categories</option>
            </select>
            <Link href="/templates/create" className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 shadow-sm">
              <Icon name="plus" size={16} /> New Template
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Templates"
            value={stats.total}
            detail="Across all categories"
            icon="clipboard"
            tone="bg-purple-100 text-purple-600"
          />
          <StatCard
            label="Active Templates"
            value={stats.active}
            detail="Currently in use"
            icon="check"
            tone="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Draft Templates"
            value={stats.draft}
            detail="Not yet published"
            icon="clock"
            tone="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Archived Templates"
            value={stats.archived}
            detail="Temporarily archived"
            icon="folder"
            tone="bg-yellow-100 text-yellow-600"
          />
        </section>

        {/* Main Content Card */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tabs and Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 px-5 py-4 gap-4">
            <div className="flex items-center gap-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm font-medium whitespace-nowrap pb-1 border-b-2 transition-colors ${
                    activeTab === tab
                      ? "text-sky-600 border-sky-600"
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  }`}
                >
                  {tab === "All" ? "All Templates" : tab}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" name="search" size={16} />
              <input
                type="search"
                placeholder="Search Template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Template Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Target Roles</th>
                  <th className="px-4 py-3">Modules</th>
                  <th className="px-4 py-3">Questions</th>
                  <th className="px-4 py-3">Last Updates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${template.iconColor}`}>
                          <Icon name={template.icon} size={20} />
                        </span>
                        <div>
                          <p className="font-bold text-gray-900">{template.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 max-w-[250px] truncate">{template.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <CategoryBadge category={template.category} />
                    </td>
                    <td className="px-4 py-4 text-gray-600 text-xs">{template.targetRoles}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Icon name="clipboard" size={14} className="text-gray-400" />
                        <span className="font-medium">{template.modulesCount}</span>
                        <span className="text-xs text-gray-400">Modules</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Icon name="message" size={14} className="text-gray-400" />
                        <span className="font-medium">{template.questionsCount}</span>
                        <span className="text-xs text-gray-400">Questions</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {template.lastUpdate}
                      <br />
                      <span className="text-gray-400">by {template.updatedBy}</span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={template.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                          <Icon name="code" size={16} /> {/* Edit icon placeholder */}
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Icon name="file" size={16} /> {/* Copy icon placeholder */}
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Icon name="menu" size={16} /> {/* More icon placeholder */}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredTemplates.length === 0 && (
            <div className="p-10 text-center">
              <EmptyState title="No templates found" description="Try adjusting your search or filter." icon="clipboard" />
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

// --- Sub-Components ---

function StatCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: IconName; tone: string }) {
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

function CategoryBadge({ category }: { category: TemplateCategory }) {
  const styles: Record<TemplateCategory, string> = {
    Technical: "bg-indigo-50 text-indigo-600 border-indigo-100",
    Behavioral: "bg-orange-50 text-orange-600 border-orange-100",
    Leadership: "bg-blue-50 text-blue-600 border-blue-100",
    Communication: "bg-sky-50 text-sky-600 border-sky-100",
    General: "bg-gray-50 text-gray-600 border-gray-100",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${styles[category]}`}>
      {category}
    </span>
  );
}

function StatusBadge({ status }: { status: TemplateStatus }) {
  const styles: Record<TemplateStatus, string> = {
    Active: "text-green-600 bg-green-50",
    Draft: "text-gray-500 bg-gray-50",
    Archived: "text-gray-400 bg-gray-50",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}