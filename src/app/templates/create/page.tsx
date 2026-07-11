"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icons";
import { InlineAlert } from "@/components/ui-states";
import { apiPost, getErrorMessage } from "@/lib/api";
import type { AssessmentTemplate } from "@/lib/types";

export default function CreateTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Real Form State
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("Technical");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid Level (2 - 5 years)");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState("70");
  const [timeLimit, setTimeLimit] = useState("120");

  // --- Target Roles Logic ---
  function addRole() {
    const role = newRole.trim();
    if (role && !targetRoles.includes(role)) {
      setTargetRoles([...targetRoles, role]);
      setNewRole("");
    }
  }

  function handleRoleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addRole();
    }
  }

  function removeRole(role: string) {
    setTargetRoles(targetRoles.filter(r => r !== role));
  }

  // --- Backend Submission ---
  async function handleSubmit() {
    // Basic Validation
    if (!templateName.trim()) {
      setError("Template Name is required.");
      return;
    }
    if (targetRoles.length === 0) {
      setError("At least one Target Role is required.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // Map UI state to Backend Payload structure
      const payload = {
        title: templateName,
        roleType: targetRoles.join(", "), // Backend expects a string for roleType
        description: description,
        timeLimitMin: timeLimit ? Number(timeLimit) : undefined,
        scoringRules: { 
          passScore: passingScore ? Number(passingScore) : undefined, 
          scale: "1-5", 
          advisoryOnly: true 
        },
        modules: [] // Step 1: Create basic template. Modules will be added in Step 2.
      };

      // Call Backend API
      const createdTemplate = await apiPost<AssessmentTemplate>("/templates", payload);
      
      // On Success: Redirect to templates list (or to /templates/${createdTemplate.id}/edit if you build an edit page for modules)
      router.push("/templates");
      router.refresh();
      
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to create template. Please check your inputs."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell active="templates" title="" description="" showPageHeader={false}>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Custom Page Header */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/templates" className="hover:text-gray-900">Assessment Templates</Link>
          <Icon name="chevron" size={12} className="text-gray-400 rotate-180" />
          <span className="text-gray-900 font-medium">Create Template</span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Assessment Template</h1>
          <p className="text-sm text-gray-500 mt-1">Build a comprehensive assessment template by adding basic information and modules.</p>
        </div>

        {/* Error Alert */}
        {error && (
          <InlineAlert tone="error">{error}</InlineAlert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Area (Left Column) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-6 overflow-x-auto">
              <StepItem number={1} title="Basic Information" active={true} />
            </div>

            {/* Template Information Section */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Template Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Template Name" value={templateName} onChange={setTemplateName} required />
                <InputField label="Category" value={category} onChange={setCategory} required />
                
                {/* Target Roles (Now Functional) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-[42px] items-center bg-white">
                    {targetRoles.map(role => (
                      <span key={role} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1 border border-gray-200">
                        {role}
                        <button type="button" onClick={() => removeRole(role)} className="text-gray-400 hover:text-gray-600 ml-1">×</button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      placeholder="Add role and press Enter..." 
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      onKeyDown={handleRoleKeyDown}
                      onBlur={addRole}
                      className="flex-1 min-w-[150px] outline-none text-sm bg-transparent" 
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Enter roles and press Enter to add.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                  <select 
                    className="w-full h-[42px] border border-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white" 
                    value={experienceLevel} 
                    onChange={(e) => setExperienceLevel(e.target.value)}
                  >
                    <option>Mid Level (2 - 5 years)</option>
                    <option>Junior (0 - 2 years)</option>
                    <option>Senior (5+ years)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Select the most relevant experience level.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Description</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 min-h-[100px] bg-white" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                  />
                  <p className="text-xs text-gray-400 mt-1">Provide a short description of this assessment template.</p>
                </div>
              </div>
            </div>

            {/* Assessment Settings Section */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Assessment Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full h-[42px] border border-gray-300 rounded-lg px-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-sky-500" 
                      value={passingScore} 
                      onChange={(e) => setPassingScore(e.target.value)} 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Minimum score required to pass this assessment.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full h-[42px] border border-gray-300 rounded-lg px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-sky-500" 
                      value={timeLimit} 
                      onChange={(e) => setTimeLimit(e.target.value)} 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">min</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Total time limit for the entire assessment.</p>
                </div>
              </div>
            </div>

            {/* Template Thumbnail Section */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Template Thumbnail (Optional)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition bg-white">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <Icon name="file" size={20} className="text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Upload image</p>
                  <p className="text-xs text-gray-400 mt-1">Or click to browse (max 10 files, up to 5MB each)</p>
                </div>
                {/* Live Preview Box */}
                <div className="border border-gray-200 rounded-lg p-4 flex items-center gap-3 bg-white">
                  <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
                    <Icon name="code" size={24} className="text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{templateName || "Template Preview"}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded font-medium">{category}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar (Right Column) */}
          <div className="space-y-6">
            {/* Template Summary Card (Now Live) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Template Summary</h3>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon name="clipboard" size={20} className="text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{templateName || "Untitled Template"}</p>
                  <span className="text-xs text-purple-600 font-medium">{category}</span>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <SummaryRow icon="clock" label="Time Limit" value={timeLimit ? `${timeLimit} minutes` : "Not set"} />
                <SummaryRow icon="users" label="Experience Level" value={experienceLevel} />
                <SummaryRow icon="user" label="Target Roles" value={targetRoles.length > 0 ? `${targetRoles.length} roles` : "None"} />
                <SummaryRow icon="clipboard" label="Modules" value="0 modules added" />
                <SummaryRow icon="check" label="Passing Score" value={passingScore ? `${passingScore}%` : "Not set"} />
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-sky-50 rounded-xl border border-sky-100 p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Tips for a Great Template</h3>
              <div className="space-y-4">
                <TipItem icon="shield" title="Keep it focused" description="Include only the most relevant modules for accurate evaluation." />
                <TipItem icon="report" title="Balanced assessment" description="Combine technical, behavioral, and communication modules." />
                <TipItem icon="file" title="Clear instructions" description="Provide clear guidelines for candidates to understand expectations." />
                <TipItem icon="eye" title="Review before publish" description="Make sure to review all modules and settings before publishing." />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Link href="/templates" className="flex-1 h-10 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition bg-white flex items-center justify-center">
                Cancel
              </Link>
              <button 
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 h-10 bg-sky-500 rounded-lg text-sm font-medium text-white hover:bg-sky-600 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving..." : "Save & Next"} <Icon name="chevron" size={14} className="-rotate-90" />
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

function InputField({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  required = false 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  type?: string; 
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input 
        type={type} 
        className="w-full h-[42px] border border-gray-300 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon name={icon} size={14} className="text-gray-400" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="font-medium text-gray-900 text-xs">{value}</span>
    </div>
  );
}

function TipItem({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm border border-sky-100">
        <Icon name={icon} size={16} className="text-sky-600" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}