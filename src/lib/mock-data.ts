export const assessmentModules = [
  {
    title: "AI Interview",
    description: "Role-based questions, follow-ups, and an interview summary for reviewers.",
    status: "Ready",
    duration: "20 min",
    accent: "blue",
  },
  {
    title: "Coding Assessment",
    description: "JavaScript task with sample cases, run output, timeout handling, and final code capture.",
    status: "In progress",
    duration: "35 min",
    accent: "violet",
  },
  {
    title: "Work-Style Assessment",
    description: "Structured prompts about collaboration, ownership, adaptability, motivation, and learning style.",
    status: "Ready",
    duration: "15 min",
    accent: "emerald",
  },
  {
    title: "Leadership Scenario",
    description: "Workplace scenario responses reviewed for empathy, accountability, and decision quality.",
    status: "Upcoming",
    duration: "15 min",
    accent: "amber",
  },
];

export const landingFeatures = [
  {
    title: "AI Interview",
    description: "Real-time AI interviews that ask smart follow-up questions and evaluate responses objectively.",
    icon: "message",
  },
  {
    title: "Coding Assessment",
    description: "Built-in code editor with real-time evaluation, test cases, and automated scoring.",
    icon: "code",
  },
  {
    title: "Behavioral Assessment",
    description: "Evaluate soft skills, personality, work style, and problem-solving approach.",
    icon: "users",
  },
  {
    title: "Leadership Scenarios",
    description: "Assess leadership, decision-making, communication, and crisis management.",
    icon: "sparkle",
  },
  {
    title: "Smart Reports",
    description: "AI-generated reports with detailed feedback, strengths, weaknesses, and recommendations.",
    icon: "file",
  },
] as const;

export const howItWorks = [
  {
    title: "Create Assessment",
    description: "Build or choose from pre-made assessment templates tailored to your needs.",
    icon: "file",
    tint: "bg-sky-100 text-blue-600",
  },
  {
    title: "Invite Candidates",
    description: "Send assessment invitations to candidates and track their progress in real time.",
    icon: "plusUser",
    tint: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "AI Evaluates",
    description: "Our AI evaluates responses across all modules and generates objective scores.",
    icon: "sparkle",
    tint: "bg-fuchsia-100 text-fuchsia-700",
  },
  {
    title: "Review & Decide",
    description: "Review comprehensive reports and make confident hiring decisions.",
    icon: "clipboard",
    tint: "bg-amber-100 text-amber-700",
  },
] as const;

export const landingStats = [
  { label: "Candidates Assessed", value: "10,000+", detail: "and growing every day", icon: "users" },
  { label: "Organizations", value: "350+", detail: "trust Evalora", icon: "building" },
  { label: "Time Saved", value: "85%", detail: "in hiring process", icon: "clock" },
  { label: "User Satisfaction", value: "4.8/5", detail: "based on reviews", icon: "star" },
] as const;

export const testimonials = [
  {
    quote: "Evalora has completely transformed our hiring process. The AI interviews are incredibly accurate and save us so much time.",
    name: "Jessica Parker",
    role: "HR Manager, FutureSoft",
  },
  {
    quote: "The coding assessments are excellent. Real-time execution and detailed feedback help us identify top technical talent easily.",
    name: "Michael Chen",
    role: "Engineering Lead",
  },
  {
    quote: "Reports are super detailed and easy to understand. It helps our team make data-driven hiring decisions with confidence.",
    name: "Sarah Wilson",
    role: "Talent Acquisition, Nexora",
  },
] as const;

export const dashboardStats = [
  { label: "Total candidates", value: "1,256", change: "+12.4%", icon: "users" },
  { label: "Completed assessments", value: "832", change: "+8.1%", icon: "clipboard" },
  { label: "Completion rate", value: "78%", change: "+5.2%", icon: "trend" },
  { label: "Average score", value: "4.1/5", change: "+0.3", icon: "star" },
] as const;

export const recentActivity = [
  {
    title: "Daniel Lee completed Frontend Developer Interview",
    time: "10 min ago",
    type: "completed",
  },
  {
    title: "Emma Johnson started JavaScript Developer Session",
    time: "28 min ago",
    type: "progress",
  },
  {
    title: "New assessment template created by your team",
    time: "1 hr ago",
    type: "template",
  },
  {
    title: "Report generated for Sofia Williams",
    time: "2 hr ago",
    type: "report",
  },
];

export const candidates = [
  {
    name: "Daniel Lee",
    role: "Frontend Developer",
    status: "Completed",
    score: "4.4",
    progress: 100,
    updated: "Today, 9:42 AM",
  },
  {
    name: "Emma Johnson",
    role: "JavaScript Developer",
    status: "In progress",
    score: "Pending",
    progress: 64,
    updated: "Today, 9:10 AM",
  },
  {
    name: "Sofia Williams",
    role: "Product Manager",
    status: "Report ready",
    score: "4.1",
    progress: 100,
    updated: "Yesterday, 4:18 PM",
  },
  {
    name: "Noah Kim",
    role: "Engineering Manager",
    status: "Invited",
    score: "Not started",
    progress: 0,
    updated: "Yesterday, 2:05 PM",
  },
];

export const templates = [
  {
    title: "Frontend Developer Assessment",
    modules: "AI interview, coding, work-style",
    duration: "70 min",
    usage: "126 sessions",
  },
  {
    title: "Engineering Manager Assessment",
    modules: "AI interview, leadership, communication",
    duration: "60 min",
    usage: "54 sessions",
  },
  {
    title: "Product Manager Assessment",
    modules: "Behavioral, case study, leadership",
    duration: "55 min",
    usage: "73 sessions",
  },
];

export const analyticsModules = [
  { label: "Technical", value: 82 },
  { label: "Communication", value: 76 },
  { label: "Leadership", value: 71 },
  { label: "Work style", value: 88 },
];

export const reportSections = [
  {
    title: "Overall summary",
    body: "The candidate gave clear, relevant answers and connected examples to measurable outcomes. AI feedback is advisory and ready for human review.",
    score: "4.2/5",
  },
  {
    title: "Technical evidence",
    body: "Code structure was readable, edge cases were discussed, and tradeoffs were explained before submission.",
    score: "4.3/5",
  },
  {
    title: "Behavioral insight",
    body: "Responses suggest a collaborative work style based on the examples provided. This is not a personality or mental-health assessment.",
    score: "4.0/5",
  },
  {
    title: "Leadership and communication",
    body: "Scenario answers showed accountability, calm prioritization, and a practical escalation path.",
    score: "4.1/5",
  },
];

export const reviewerNotes = [
  "Follow up on how the candidate approaches ambiguous product requirements.",
  "Review final code submission against team-specific style expectations.",
  "Compare leadership scenario evidence with live interview notes.",
];
