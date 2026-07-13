/** Marketing copy for the public landing page only. Workspace pages use live API data. */

export const landingFeatures = [
  {
    title: "AI Interview",
    description: "Role-based questions, follow-ups, and structured evidence for reviewers.",
    icon: "message",
  },
  {
    title: "Coding Assessment",
    description: "Browser coding workspace with sample runs and hidden-test scoring.",
    icon: "code",
  },
  {
    title: "Behavioral Assessment",
    description: "Work-style and soft-skill prompts reviewed with advisory AI feedback.",
    icon: "user",
  },
  {
    title: "Leadership Scenarios",
    description: "Decision-making and communication scenarios for people-leader roles.",
    icon: "users",
  },
  {
    title: "Advisory Reports",
    description: "Evidence-backed scores and notes that support human hiring decisions.",
    icon: "file",
  },
] as const;

export const howItWorks = [
  {
    title: "Create Assessment",
    description: "Build templates or start from researched role banks for your hiring needs.",
    icon: "file",
    tint: "bg-sky-100 text-blue-600",
  },
  {
    title: "Invite Candidates",
    description: "Send private assessment links and track progress in your workspace.",
    icon: "plusUser",
    tint: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "AI Supports Review",
    description: "Responses are evaluated with rubrics and evidence for human reviewers.",
    icon: "sparkle",
    tint: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    title: "Review & Decide",
    description: "Open advisory reports, add notes, and make the hiring decision yourself.",
    icon: "clipboard",
    tint: "bg-amber-100 text-amber-700",
  },
] as const;

export const landingStats = [
  { label: "Assessment modules", value: "8+", detail: "technical and behavioral", icon: "clipboard" },
  { label: "Workspace roles", value: "Owner + team", detail: "invite interviewers freely", icon: "users" },
  { label: "Candidate access", value: "Private link", detail: "no platform login required", icon: "lock" },
  { label: "AI feedback", value: "Advisory", detail: "humans stay in control", icon: "shield" },
] as const;

export const testimonials = [
  {
    quote: "Structured templates and evidence-backed reports help our team review candidates consistently.",
    name: "Hiring lead",
    role: "People team",
    avatarUrl: "",
  },
  {
    quote: "The coding workspace and AI interview flow keep technical and soft-skill signals in one place.",
    name: "Engineering manager",
    role: "Product engineering",
    avatarUrl: "",
  },
  {
    quote: "Invite links for candidates and teammates make collaboration simple without shared logins.",
    name: "Recruiter",
    role: "Talent acquisition",
    avatarUrl: "",
  },
] as const;
