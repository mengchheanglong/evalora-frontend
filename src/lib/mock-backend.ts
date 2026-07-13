import { NextRequest, NextResponse } from "next/server";
import type {
  ActivityItem,
  AnalyticsSummary,
  AssessmentTemplate,
  AuthResponse,
  AuthUser,
  CandidateAccessSession,
  CandidateCodeSubmission,
  CandidateCodeSubmitResult,
  CandidateReport,
  CandidateResponse,
  CatalogTemplateSummary,
  CodeQuestion,
  CodeRunResult,
  InterviewSession,
  JsonValue,
  ModulePerformance,
  ModuleType,
  QuestionType,
  ReviewerNote,
  SessionStatus,
} from "@/lib/types";

const mockUser: AuthUser = {
  id: "user-demo-owner",
  name: "Maya Chen",
  email: "maya@evalora.demo",
  role: "organization",
  organizationId: "org-demo",
};

const now = Date.now();
const iso = (offsetHours: number) => new Date(now + offsetHours * 60 * 60 * 1000).toISOString();

type MockMember = {
  id: string;
  name: string;
  email: string;
  role: AuthUser["role"];
  roleLabel: string;
  organizationId?: string;
  createdAt?: string;
  isCurrentUser?: boolean;
};

type MockInvite = {
  id: string;
  email: string;
  role: AuthUser["role"];
  status: "pending" | "accepted" | "cancelled" | "expired";
  token: string;
  inviteUrlPath: string;
  invitedBy?: { id: string; name: string };
  expiresAt: string;
  createdAt?: string;
  acceptedAt?: string;
};

const mockMembers: MockMember[] = [
  {
    id: mockUser.id,
    name: mockUser.name,
    email: mockUser.email,
    role: "organization",
    roleLabel: "Owner",
    organizationId: mockUser.organizationId,
    createdAt: iso(-720),
    isCurrentUser: true,
  },
];

const mockInvites: MockInvite[] = [];

/** Compact mock catalog blueprints (full banks live in the Nest prebuilt catalog). */
function buildCatalogTemplate(input: {
  id: string;
  title: string;
  description: string;
  roleType: string;
  timeLimitMin: number;
  modules: Array<{ type: ModuleType; title: string; description: string; questions: string[] }>;
}): AssessmentTemplate {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    roleType: input.roleType,
    timeLimitMin: input.timeLimitMin,
    scoringRules: { passScore: 3.5, scale: "1-5", advisoryOnly: true, source: "prebuilt-researched-v2" },
    modules: input.modules.map((module, moduleIndex) => ({
      id: `${input.id}-mod-${moduleIndex + 1}`,
      type: module.type,
      title: module.title,
      description: module.description,
      weight: 1,
      orderIndex: moduleIndex + 1,
      questions: module.questions.map((questionText, questionIndex) => ({
        id: `${input.id}-q-${moduleIndex + 1}-${questionIndex + 1}`,
        questionText,
        questionType: (module.type === "coding"
          ? "coding"
          : module.type === "work_style"
            ? "scale"
            : module.type === "communication"
              ? "roleplay"
              : "scenario") as QuestionType,
        rubric: ["clarity", "evidence", "judgment", "impact"],
      })),
    })),
  };
}

/** Read-only prebuilt library (mirrors backend GET /templates/catalog role set). */
const catalogTemplates: AssessmentTemplate[] = [
  buildCatalogTemplate({
    id: "prebuilt-software-engineer-assessment",
    title: "Software Engineer Assessment",
    description: "Coding, debugging, system design, communication, and engineering behavioral evidence.",
    roleType: "Software Engineer",
    timeLimitMin: 90,
    modules: [
      { type: "ai_interview", title: "AI Interview", description: "Technical ownership discussion.", questions: ["Tell us about a technical project you owned. What trade-offs did you make and how did you measure success?", "Describe a time you had to learn a new system quickly. What did you do first?"] },
      { type: "coding", title: "Coding", description: "Practical JavaScript tasks.", questions: ["Implement a function that returns whether any two numbers sum to the target.", "Normalize a list of display names: trim, drop blanks, and title-case words."] },
      { type: "debugging", title: "Debugging", description: "Root-cause analysis.", questions: ["A production bug appears only for a small percentage of users. How would you isolate and verify the fix?"] },
      { type: "problem_solving", title: "System Design", description: "Architecture judgment.", questions: ["Design a rate-limited public API for a mobile client. What trade-offs matter first?"] },
      { type: "communication", title: "Communication", description: "Engineering updates.", questions: ["Write a short update explaining a delayed release and recovery plan."] },
      { type: "behavioral", title: "Behavioral", description: "Ownership and collaboration.", questions: ["Tell us about a technical disagreement with a teammate. What changed your mind or theirs?"] },
    ],
  }),
  buildCatalogTemplate({
    id: "prebuilt-frontend-developer-assessment",
    title: "Frontend Developer Assessment",
    description: "UI coding, debugging, accessibility, performance, and collaboration for frontend screens.",
    roleType: "Frontend Developer",
    timeLimitMin: 85,
    modules: [
      { type: "coding", title: "Frontend Coding", description: "UI logic tasks.", questions: ["Implement a debounce utility and describe which bugs you would test for.", "Group UI events by type and sort by frequency descending."] },
      { type: "debugging", title: "UI Debugging", description: "Browser and state issues.", questions: ["A React page re-renders on every keystroke and feels laggy. How do you isolate the cause?", "Users report a form sometimes submits stale values. Walk through your debugging approach."] },
      { type: "ai_interview", title: "Frontend Interview", description: "Architecture and a11y.", questions: ["How do you make a complex modal dialog accessible?", "A dashboard is slow on first load. What measurements would you prioritize?"] },
      { type: "communication", title: "Communication", description: "Design/PM collaboration.", questions: ["Write a short note explaining why a polished animation should slip to next sprint."] },
      { type: "behavioral", title: "Behavioral", description: "Delivery ownership.", questions: ["Tell us about a UI feature you owned end-to-end. How did you measure success?"] },
      { type: "work_style", title: "Work Style", description: "Quality preferences.", questions: ["How strongly do you prefer automated UI tests before merging user-facing changes?"] },
    ],
  }),
  buildCatalogTemplate({
    id: "prebuilt-product-manager-assessment",
    title: "Product Manager Assessment",
    description: "Product judgment, prioritization, stakeholder communication, and cross-functional leadership.",
    roleType: "Product Manager",
    timeLimitMin: 75,
    modules: [
      { type: "problem_solving", title: "Product Judgment", description: "Ambiguous product scenarios.", questions: ["A key activation metric drops 18% after a release. How would you investigate?", "Engineering can only ship one of three competing features. How would you choose?"] },
      { type: "communication", title: "Stakeholder Communication", description: "Executive-ready writing.", questions: ["Write a short leadership update explaining a delayed launch and recovery plan."] },
      { type: "leadership", title: "Cross-functional Leadership", description: "Influence without authority.", questions: ["Two senior stakeholders push conflicting priorities. How do you move the team toward one decision?"] },
      { type: "behavioral", title: "Behavioral Evidence", description: "Past product ownership.", questions: ["Walk through a product you owned from discovery to launch."] },
      { type: "work_style", title: "Work Style", description: "Operating preferences.", questions: ["How strongly do you prefer written decision records before committing Engineering capacity?"] },
      { type: "ai_interview", title: "AI Product Interview", description: "Open-ended product sense.", questions: ["Pick a product you know well. Which one metric would you optimize and which would you refuse to sacrifice?"] },
    ],
  }),
  buildCatalogTemplate({
    id: "prebuilt-data-analyst-assessment",
    title: "Data Analyst Assessment",
    description: "Analytical problem solving, metric design, experimentation judgment, and insight communication.",
    roleType: "Data Analyst",
    timeLimitMin: 70,
    modules: [
      { type: "problem_solving", title: "Analytical Problem Solving", description: "Investigation structure.", questions: ["Weekly active users fell 12%. Outline your investigation plan.", "An A/B test shows +4% lift with p=0.08 after two days. What do you recommend?"] },
      { type: "communication", title: "Insight Communication", description: "Decision-ready writing.", questions: ["Write a 5-bullet executive summary that a feature is not driving retention."] },
      { type: "behavioral", title: "Behavioral Evidence", description: "Past analytical impact.", questions: ["Tell us about an analysis that changed a real business decision."] },
      { type: "work_style", title: "Work Style", description: "Rigor preferences.", questions: ["How strongly do you prefer fully reproducible analysis before sharing conclusions?"] },
      { type: "leadership", title: "Analytical Leadership", description: "Standards and influence.", questions: ["How would you establish a shared metric dictionary when teams disagree on definitions?"] },
      { type: "ai_interview", title: "Analytics Interview", description: "Open-ended judgment.", questions: ["If you joined as the first analyst on a product, what would you instrument in month one?"] },
    ],
  }),
  buildCatalogTemplate({
    id: "prebuilt-team-leader-assessment",
    title: "Team Leader Assessment",
    description: "Leadership judgment, communication, problem solving, and people-management evidence.",
    roleType: "Team Leader",
    timeLimitMin: 75,
    modules: [
      { type: "leadership", title: "Leadership Scenarios", description: "Conflict and accountability.", questions: ["Two strong team members disagree publicly and progress is blocked. How would you handle it?", "A reliable teammate starts missing deadlines and says they are overloaded. How do you handle it?"] },
      { type: "communication", title: "Communication", description: "Stakeholder clarity.", questions: ["Write a short update to leadership explaining a delayed release and recovery plan."] },
      { type: "behavioral", title: "Behavioral", description: "Past leadership evidence.", questions: ["Describe a time you had to reset expectations with your team under pressure."] },
      { type: "problem_solving", title: "Problem Solving", description: "Delivery under constraints.", questions: ["Your team is likely to miss an important deadline. What do you communicate and change?"] },
      { type: "work_style", title: "Work Style", description: "Operating rhythm.", questions: ["How strongly do you prefer written decision logs after major team meetings?"] },
      { type: "ai_interview", title: "Leadership Interview", description: "Adaptive scenarios.", questions: ["How would you coach a team that is overusing AI tools without reviewing quality?"] },
    ],
  }),
  buildCatalogTemplate({
    id: "prebuilt-hr-generalist-assessment",
    title: "HR Generalist Assessment",
    description: "Behavioral, ethics, communication, and workplace scenario prompts for HR screens.",
    roleType: "HR Generalist",
    timeLimitMin: 75,
    modules: [
      { type: "behavioral", title: "Behavioral", description: "Judgment and professionalism.", questions: ["Describe a time you handled sensitive employee information. How did you protect trust?", "Tell us about resolving a workplace conflict between peers."] },
      { type: "communication", title: "Communication", description: "Clear workplace communication.", questions: ["A manager asks for advice on a tense team conflict. How would you respond?"] },
      { type: "work_style", title: "Work Style", description: "Process and confidentiality.", questions: ["How strongly do you prefer documented process for every employee request?"] },
      { type: "problem_solving", title: "Problem Solving", description: "People process issues.", questions: ["Hiring funnel conversion dropped sharply. How would you investigate?"] },
      { type: "leadership", title: "People Leadership", description: "Influence and standards.", questions: ["How would you roll out a new performance review process with resistant managers?"] },
      { type: "ai_interview", title: "AI Ethics Interview", description: "Responsible people tech.", questions: ["When is it appropriate to use AI screening tools, and what human review bar would you set?"] },
    ],
  }),
  buildCatalogTemplate({
    id: "prebuilt-customer-success-assessment",
    title: "Customer Success Assessment",
    description: "Customer communication, churn handling, account problem solving, and relationship ownership.",
    roleType: "Customer Success",
    timeLimitMin: 65,
    modules: [
      { type: "communication", title: "Customer Communication", description: "Calm professional writing.", questions: ["A customer is frustrated after three failed tickets. Write your first reply email.", "You must tell a customer their requested feature will not ship this quarter. How do you communicate it?"] },
      { type: "problem_solving", title: "Account Problem Solving", description: "Churn and adoption.", questions: ["Usage dropped 40% for a renewing account. What is your 48-hour action plan?"] },
      { type: "behavioral", title: "Behavioral Evidence", description: "Past customer outcomes.", questions: ["Tell us about a time you saved an at-risk customer relationship."] },
      { type: "leadership", title: "Customer Leadership", description: "Alignment and escalation.", questions: ["Two stakeholders at a customer disagree on success criteria. How do you lead alignment?"] },
      { type: "work_style", title: "Work Style", description: "CRM and proactivity.", questions: ["How strongly do you prefer updating CRM notes the same day as every interaction?"] },
      { type: "ai_interview", title: "CS Interview", description: "Account strategy.", questions: ["What would your first 90 days look like owning a book of 40 mid-market accounts?"] },
    ],
  }),
];

/** Organization-owned copies used by sessions and "My templates". */
const templates: AssessmentTemplate[] = [
  cloneTemplateIntoOrg(catalogTemplates[0], "tpl-software-engineer"),
  cloneTemplateIntoOrg(catalogTemplates[4], "tpl-team-leader"),
  cloneTemplateIntoOrg(catalogTemplates[5], "tpl-hr-generalist"),
];

const sessions: InterviewSession[] = [
  {
    id: "sess-daniel-lee",
    candidateId: "cand-daniel",
    candidateName: "Daniel Lee",
    candidateEmail: "daniel.lee@example.com",
    templateId: "tpl-software-engineer",
    templateTitle: "Software Engineer Assessment",
    targetRole: "Frontend Engineer",
    organizationId: mockUser.organizationId,
    status: "completed",
    accessCode: "DEMO-DANIEL",
    overallScore: 4.4,
    reportReady: true,
    reportStatus: "generated",
    startedAt: iso(-28),
    completedAt: iso(-24),
    expiresAt: iso(120),
    createdAt: iso(-52),
    updatedAt: iso(-24),
  },
  {
    id: "sess-emma-johnson",
    candidateId: "cand-emma",
    candidateName: "Emma Johnson",
    candidateEmail: "emma.johnson@example.com",
    templateId: "tpl-software-engineer",
    templateTitle: "Software Engineer Assessment",
    targetRole: "JavaScript Developer",
    organizationId: mockUser.organizationId,
    status: "in_progress",
    accessCode: "DEMO-EMMA",
    reportReady: false,
    startedAt: iso(-2),
    expiresAt: iso(72),
    createdAt: iso(-20),
    updatedAt: iso(-1),
  },
  {
    id: "sess-sofia-williams",
    candidateId: "cand-sofia",
    candidateName: "Sofia Williams",
    candidateEmail: "sofia.williams@example.com",
    templateId: "tpl-team-leader",
    templateTitle: "Team Leader Assessment",
    targetRole: "Product Manager",
    organizationId: mockUser.organizationId,
    status: "completed",
    accessCode: "DEMO-SOFIA",
    overallScore: 4.1,
    reportReady: true,
    reportStatus: "generated",
    startedAt: iso(-52),
    completedAt: iso(-48),
    expiresAt: iso(48),
    createdAt: iso(-75),
    updatedAt: iso(-48),
  },
  {
    id: "sess-noah-kim",
    candidateId: "cand-noah",
    candidateName: "Noah Kim",
    candidateEmail: "noah.kim@example.com",
    templateId: "tpl-hr-generalist",
    templateTitle: "HR Generalist Assessment",
    targetRole: "HR Generalist",
    organizationId: mockUser.organizationId,
    status: "not_started",
    accessCode: "DEMO-NOAH",
    reportReady: false,
    expiresAt: iso(96),
    createdAt: iso(-6),
    updatedAt: iso(-6),
  },
  {
    id: "sess-olivia-smith",
    candidateId: "cand-olivia",
    candidateName: "Olivia Smith",
    candidateEmail: "olivia.smith@example.com",
    templateId: "tpl-software-engineer",
    templateTitle: "Frontend Developer Assessment",
    targetRole: "Frontend Developer",
    organizationId: mockUser.organizationId,
    status: "completed",
    accessCode: "DEMO-OLIVIA",
    overallScore: 3.9,
    reportReady: true,
    reportStatus: "generated",
    startedAt: iso(-12),
    completedAt: iso(-9),
    expiresAt: iso(120),
    createdAt: iso(-34),
    updatedAt: iso(-9),
  },
  {
    id: "sess-liam-chen",
    candidateId: "cand-liam",
    candidateName: "Liam Chen",
    candidateEmail: "liam.chen@example.com",
    templateId: "tpl-team-leader",
    templateTitle: "Team Leader Assessment",
    targetRole: "Product Analyst",
    organizationId: mockUser.organizationId,
    status: "in_progress",
    accessCode: "DEMO-LIAM",
    reportReady: false,
    startedAt: iso(-5),
    expiresAt: iso(80),
    createdAt: iso(-18),
    updatedAt: iso(-4),
  },
];

const reports: CandidateReport[] = [
  {
    sessionId: "sess-daniel-lee",
    candidateName: "Daniel Lee",
    assessmentName: "Software Engineer Assessment",
    completedAt: iso(-24),
    overallScore: 4.4,
    moduleScores: { "AI Interview": 4.5, "Coding Assessment": 4.6, Debugging: 4.2, "Work Style": 4.3 },
    summary:
      "Daniel gave concrete engineering examples, described trade-offs clearly, and showed a pragmatic debugging approach. The coding submission was readable and handled common edge cases.",
    strengths: ["Explains technical trade-offs clearly", "Uses practical debugging and verification steps", "Communicates ownership without overclaiming"],
    improvementAreas: ["Ask for more detail on long-term maintainability decisions", "Probe testing strategy for asynchronous UI flows"],
    evidence: [
      "Described reducing bundle size by measuring route-level chunks before changing the loading strategy.",
      "Outlined a production debugging flow using logs, feature flags, rollback criteria, and regression tests.",
      "Coding task used readable helper functions and guarded empty input cases.",
    ],
    reviewerSummary: "Strong technical signal. Pair with live system-design discussion.",
    advisoryNotice: "AI feedback is advisory and must be reviewed by a human interviewer before any decision.",
    generatedAt: iso(-23),
    persistence: { status: "persisted", evaluationCount: 4 },
  },
  {
    sessionId: "sess-sofia-williams",
    candidateName: "Sofia Williams",
    assessmentName: "Product Manager Assessment",
    completedAt: iso(-48),
    overallScore: 4.1,
    moduleScores: { "Problem Solving": 4.2, Communication: 4.1, Leadership: 4.0 },
    summary:
      "Sofia structured ambiguous product issues well and communicated risk in a calm, executive-ready way. Her leadership answers showed strong facilitation instincts.",
    strengths: ["Frames decisions around customer impact", "Communicates trade-offs with concise context", "Shows steady stakeholder management"],
    improvementAreas: ["Clarify how success metrics are instrumented", "Ask for examples involving constrained engineering capacity"],
    evidence: [
      "Broke an activation drop into instrumentation, cohort, release, and qualitative investigation paths.",
      "Wrote a delayed-release update with clear impact, owner, next milestone, and mitigation.",
    ],
    advisoryNotice: "AI feedback is advisory and must be reviewed by a human interviewer before any decision.",
    generatedAt: iso(-47),
    persistence: { status: "persisted", evaluationCount: 3 },
  },
];

const reviewerNotes: ReviewerNote[] = [
  {
    id: "note-1",
    sessionId: "sess-daniel-lee",
    note: "Follow up on how Daniel would scale this UI architecture across multiple teams.",
    reviewer: { id: mockUser.id, name: mockUser.name },
    createdAt: iso(-22),
  },
  {
    id: "note-2",
    sessionId: "sess-sofia-williams",
    note: "Good product judgment signal. Verify analytics instrumentation experience in live interview.",
    reviewer: { id: mockUser.id, name: mockUser.name },
    createdAt: iso(-46),
  },
];

const responses: CandidateResponse[] = [
  {
    id: "resp-emma-1",
    sessionId: "sess-emma-johnson",
    questionId: "q-se-ai-1",
    responseText:
      "I owned a dashboard migration where we had to balance delivery speed with long-term maintainability. I started by mapping the riskiest user flows and shipped behind a feature flag.",
    createdAt: iso(-1.8),
    savedAt: iso(-1.8),
  },
];

const codeQuestions: CodeQuestion[] = [
  {
    id: "code-two-sum",
    title: "Pair Sum",
    description: "Return true when any two numbers in the array add up to the target. Focus on clear logic and edge cases.",
    difficulty: "easy",
    language: "javascript",
    starterCode: "function hasPairSum(numbers, target) {\n  // Write your solution here\n  return false;\n}\n\nconsole.log(hasPairSum([2, 7, 11, 15], 9));",
    sampleInput: "[2,7,11,15], 9",
    sampleOutput: "true",
    examples: [{ input: "[2,7,11,15], 9", expectedOutput: "true" }],
    testCaseCount: 6,
  },
  {
    id: "code-normalize",
    title: "Normalize Names",
    description: "Given an array of names, trim whitespace, remove blank values, and return title-cased names.",
    difficulty: "medium",
    language: "javascript",
    starterCode: "function normalizeNames(names) {\n  return names;\n}\n\nconsole.log(normalizeNames([' ada ', '', 'GRACE hopper']));",
    sampleInput: "[' ada ', '', 'GRACE hopper']",
    sampleOutput: "['Ada', 'Grace Hopper']",
    examples: [{ input: "[' ada ', '', 'GRACE hopper']", expectedOutput: "['Ada', 'Grace Hopper']" }],
    testCaseCount: 7,
  },
  {
    id: "code-group",
    title: "Group By Status",
    description: "Group candidate records by status and return a count for each status.",
    difficulty: "medium",
    language: "javascript",
    starterCode: "function countByStatus(candidates) {\n  return {};\n}\n\nconsole.log(countByStatus([{ status: 'completed' }, { status: 'completed' }, { status: 'in_progress' }]));",
    sampleInput: "[{status:'completed'}, {status:'completed'}, {status:'in_progress'}]",
    sampleOutput: "{ completed: 2, in_progress: 1 }",
    examples: [{ input: "[{status:'completed'}, {status:'completed'}]", expectedOutput: "{ completed: 2 }" }],
    testCaseCount: 5,
  },
];

const codeSubmissions: CandidateCodeSubmission[] = [];

export async function handleMockBackendRequest(request: NextRequest, relativePath: string): Promise<NextResponse> {
  const method = request.method;
  const segments = relativePath.split("/").filter(Boolean);
  const body = method === "GET" || method === "HEAD" ? undefined : await readJson(request);

  if (relativePath === "auth/me" && method === "GET") return json(mockUser);
  if ((relativePath === "auth/login" || relativePath === "auth/register" || relativePath === "auth/google") && method === "POST") {
    const input = asRecord(body);
    if (relativePath === "auth/google") {
      const credential = String(input.credential ?? input.idToken ?? "").trim();
      if (!credential) return json({ message: "Google credential is required." }, 400);
      return json<AuthResponse>({
        user: {
          ...mockUser,
          name: "Google Demo User",
          email: "google.demo@evalora.demo",
        },
        message: "Google sign-in successful (mock).",
      });
    }
    return json<AuthResponse>({ user: mockUser, message: "Signed in to mock workspace." });
  }
  if (relativePath === "auth/logout" && method === "POST") return json({ message: "Signed out." });

  if (relativePath === "organization/members" && method === "GET") {
    return json(
      mockMembers.map((member) => ({
        ...member,
        isCurrentUser: member.id === mockUser.id,
      })),
    );
  }
  if (relativePath === "organization/invites" && method === "GET") return json(mockInvites);
  if (relativePath === "organization/invites" && method === "POST") {
    const input = asRecord(body);
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!email) return json({ message: "Email is required." }, 400);
    if (mockMembers.some((member) => member.email === email)) {
      return json({ message: "This person is already a member of your workspace." }, 409);
    }
    if (mockInvites.some((invite) => invite.email === email && invite.status === "pending")) {
      return json({ message: "A pending invitation already exists for this email." }, 409);
    }
    const token = `mock-invite-${Math.random().toString(36).slice(2, 10)}`;
    const invite: MockInvite = {
      id: `invite-${Date.now()}`,
      email,
      role: "interviewer",
      status: "pending",
      token,
      inviteUrlPath: `/invite/${token}`,
      invitedBy: { id: mockUser.id, name: mockUser.name },
      expiresAt: iso(168),
      createdAt: new Date().toISOString(),
    };
    mockInvites.unshift(invite);
    return json(
      {
        ...invite,
        inviteUrl: `http://localhost:3010${invite.inviteUrlPath}`,
        emailDelivery: {
          status: "skipped",
          reason: "Mock backend does not send real email. Share the invite link manually.",
        },
      },
      201,
    );
  }
  if (segments[0] === "organization" && segments[1] === "invites" && segments[2] === "token" && segments[3] && method === "GET") {
    const invite = mockInvites.find((row) => row.token === decodeURIComponent(segments[3]) && row.status === "pending");
    if (!invite) return json({ message: "Invitation not found." }, 404);
    return json({
      email: invite.email,
      organizationName: "Evalora Demo Workspace",
      role: invite.role,
      roleLabel: "Interviewer",
      expiresAt: invite.expiresAt,
      inviterName: invite.invitedBy?.name,
    });
  }
  if (relativePath === "organization/invites/accept" && method === "POST") {
    const input = asRecord(body);
    const invite = mockInvites.find((row) => row.token === String(input.token ?? "") && row.status === "pending");
    if (!invite) return json({ message: "Invitation not found." }, 404);
    invite.status = "accepted";
    invite.acceptedAt = new Date().toISOString();
    const joined: MockMember = {
      id: `user-${Date.now()}`,
      name: String(input.name ?? "New Interviewer"),
      email: invite.email,
      role: "interviewer",
      roleLabel: "Interviewer",
      organizationId: mockUser.organizationId,
      createdAt: new Date().toISOString(),
    };
    mockMembers.push(joined);
    return json<AuthResponse>({
      user: { id: joined.id, name: joined.name, email: joined.email, role: "interviewer", organizationId: joined.organizationId },
      message: "Invitation accepted. Welcome to the workspace.",
    });
  }
  if (segments[0] === "organization" && segments[1] === "invites" && segments[2] && method === "DELETE") {
    const invite = mockInvites.find((row) => row.id === decodeURIComponent(segments[2]));
    if (!invite) return json({ message: "Invitation not found." }, 404);
    invite.status = "cancelled";
    return json({ id: invite.id, cancelled: true });
  }
  if (segments[0] === "organization" && segments[1] === "members" && segments[2] && method === "DELETE") {
    const id = decodeURIComponent(segments[2]);
    const index = mockMembers.findIndex((member) => member.id === id && member.role === "interviewer");
    if (index < 0) return json({ message: "Member not found." }, 404);
    mockMembers.splice(index, 1);
    return json({ id, removed: true });
  }

  // Prebuilt catalog (must be registered before /templates/:id)
  if (relativePath === "templates/catalog" && method === "GET") {
    return json(catalogTemplates.map(toCatalogSummary));
  }
  if (segments[0] === "templates" && segments[1] === "catalog" && segments[2] && method === "GET") {
    const catalogId = decodeURIComponent(segments[2]).toLowerCase();
    const found = catalogTemplates.find(
      (template) => template.id.toLowerCase() === catalogId || template.id.toLowerCase() === `prebuilt-${catalogId}`,
    );
    return jsonOr404(found, "Catalog template not found.");
  }
  if (relativePath === "templates/from-catalog" && method === "POST") {
    const input = asRecord(body);
    const catalogId = String(input.catalogId ?? "").trim().toLowerCase();
    if (!catalogId) return json({ message: "Catalog template id is required." }, 400);
    const source = catalogTemplates.find(
      (template) => template.id.toLowerCase() === catalogId || template.id.toLowerCase() === `prebuilt-${catalogId}`,
    );
    if (!source) return json({ message: "Catalog template not found." }, 404);
    const title = typeof input.title === "string" && input.title.trim() ? input.title.trim() : source.title;
    const cloned = cloneTemplateIntoOrg(source, undefined, title, {
      ...(typeof source.scoringRules === "object" && source.scoringRules && !Array.isArray(source.scoringRules)
        ? (source.scoringRules as Record<string, unknown>)
        : {}),
      clonedFromCatalogId: source.id,
      advisoryOnly: true,
    });
    templates.unshift(cloned);
    return json(cloned, 201);
  }

  if (relativePath === "templates" && method === "GET") return json(templates);
  if (relativePath === "templates" && method === "POST") {
    const input = asRecord(body);
    const template = normalizeTemplate(input);
    templates.unshift(template);
    return json(template, 201);
  }
  if (segments[0] === "templates" && segments[1] && segments[2] === "duplicate" && method === "POST") {
    const id = decodeURIComponent(segments[1]);
    const source = templates.find((template) => template.id === id);
    if (!source) return json({ message: "Template not found." }, 404);
    const copy = cloneTemplateIntoOrg(source, undefined, `${source.title} (Copy)`);
    templates.unshift(copy);
    return json(copy, 201);
  }
  if (segments[0] === "templates" && segments[1] && method === "GET") {
    return jsonOr404(templates.find((template) => template.id === decodeURIComponent(segments[1])), "Template not found.");
  }
  if (segments[0] === "templates" && segments[1] && method === "PUT") {
    const id = decodeURIComponent(segments[1]);
    const index = templates.findIndex((template) => template.id === id);
    if (index < 0) return json({ message: "Template not found." }, 404);
    const input = asRecord(body);
    const existing = templates[index];
    const nextModules = Array.isArray(input.modules)
      ? input.modules.map((item, moduleIndex) => {
          const module = asRecord(item);
          const questions = Array.isArray(module.questions) ? module.questions : [];
          return {
            id: `mod-${id}-${moduleIndex + 1}`,
            type: String(module.type ?? "behavioral") as ModuleType,
            title: String(module.title ?? "Module"),
            description: String(module.description ?? ""),
            weight: Number(module.weight ?? 1),
            orderIndex: Number(module.orderIndex ?? moduleIndex + 1),
            settings: toJsonValue(module.settings),
            questions: questions.map((question, questionIndex) => {
              const record = asRecord(question);
              return {
                id: `q-${id}-${moduleIndex + 1}-${questionIndex + 1}`,
                questionText: String(record.questionText ?? ""),
                questionType: String(record.questionType ?? "short_answer") as QuestionType,
                options: toJsonValue(record.options),
                rubric: toJsonValue(record.rubric),
              };
            }),
          };
        })
      : existing.modules;
    const updated: AssessmentTemplate = {
      ...existing,
      title: typeof input.title === "string" ? input.title : existing.title,
      description: typeof input.description === "string" ? input.description : existing.description,
      roleType: typeof input.roleType === "string" ? input.roleType : existing.roleType,
      timeLimitMin: input.timeLimitMin !== undefined ? Number(input.timeLimitMin) : existing.timeLimitMin,
      scoringRules: input.scoringRules !== undefined ? toJsonValue(input.scoringRules) : existing.scoringRules,
      modules: nextModules,
    };
    templates[index] = updated;
    return json(updated);
  }
  if (segments[0] === "templates" && segments[1] && method === "DELETE") {
    const id = decodeURIComponent(segments[1]);
    const index = templates.findIndex((template) => template.id === id);
    if (index >= 0) templates.splice(index, 1);
    return json({ id, deleted: true });
  }

  if (relativePath === "sessions" && method === "GET") return json(sessions);
  if (relativePath === "sessions" && method === "POST") {
    const input = asRecord(body);
    const template = templates.find((item) => item.id === String(input.templateId)) ?? templates[0];
    const session: InterviewSession = {
      id: `sess-${slug(String(input.candidateName ?? "demo-candidate"))}-${Date.now()}`,
      candidateId: `cand-${Date.now()}`,
      candidateName: String(input.candidateName ?? "Demo Candidate"),
      candidateEmail: String(input.candidateEmail ?? "candidate@example.com"),
      templateId: template.id,
      templateTitle: template.title,
      targetRole: template.roleType,
      organizationId: mockUser.organizationId,
      status: "not_started",
      accessCode: `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      reportReady: false,
      expiresAt: typeof input.expiresAt === "string" ? input.expiresAt : iso(168),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    sessions.unshift(session);
    return json(
      {
        ...session,
        assessmentUrl: `http://localhost:3010/assessment/${session.accessCode}`,
        emailDelivery: {
          status: "skipped",
          reason: "Mock backend does not send real email. Share the assessment link manually.",
        },
      },
      201,
    );
  }
  if (segments[0] === "sessions" && segments[1] === "access" && segments[2]) return handleCandidateSession(method, decodeURIComponent(segments[2]), segments[3]);
  if (segments[0] === "sessions" && segments[1] && method === "GET") {
    return jsonOr404(sessions.find((session) => session.id === decodeURIComponent(segments[1])), "Session not found.");
  }

  if (segments[0] === "responses" && segments[1] === "access" && segments[2]) {
    const session = findSessionByAccessCode(decodeURIComponent(segments[2]));
    if (!session) return json({ message: "Invitation not found." }, 404);
    if (method === "GET") return json(responses.filter((response) => response.sessionId === session.id));
    if (method === "POST") {
      const input = asRecord(body);
      const existing = responses.find((response) => response.sessionId === session.id && response.questionId === input.questionId);
      const saved: CandidateResponse = {
        id: existing?.id ?? `resp-${Date.now()}`,
        sessionId: session.id,
        questionId: typeof input.questionId === "string" ? input.questionId : undefined,
        responseText: String(input.responseText ?? ""),
        responseJson: toJsonValue(input.responseJson),
        savedAt: new Date().toISOString(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      if (existing) Object.assign(existing, saved);
      else responses.push(saved);
      return json(saved);
    }
  }
  if (segments[0] === "responses" && segments[1] === "session" && segments[2] && method === "GET") {
    return json(responses.filter((response) => response.sessionId === decodeURIComponent(segments[2])));
  }

  if (relativePath === "analytics/summary" && method === "GET") return json(createSummary());
  if (relativePath === "analytics/activity" && method === "GET") return json(createActivity());
  if (relativePath === "analytics/module-performance" && method === "GET") return json(createModulePerformance());
  if (relativePath === "analytics/score-distribution" && method === "GET") return json(createDistribution());
  if (relativePath === "analytics/themes" && method === "GET") return json(createThemes());
  if (relativePath === "analytics/trend" && method === "GET") return json(createTrend());

  if (segments[0] === "ai" && segments[1] === "access" && segments[2] && segments[3] === "follow-up" && method === "POST") {
    const session = findSessionByAccessCode(decodeURIComponent(segments[2]));
    if (!session) return json({ message: "Invitation not found." }, 404);
    const input = asRecord(body);
    const prior = String(input.answer ?? input.responseText ?? input.previousAnswer ?? "").trim();
    return json({
      question: prior
        ? "Can you walk through one concrete trade-off you made, including the alternatives you rejected and how you measured the outcome?"
        : "Tell us about a specific decision you owned recently and what evidence told you it was the right call.",
    });
  }

  if (segments[0] === "reports" && segments[1]) return handleReports(method, decodeURIComponent(segments[1]), segments[2], body);
  if (segments[0] === "code" && segments[1] === "access" && segments[2]) return handleCode(method, decodeURIComponent(segments[2]), segments[3], body);

  return json({ message: `Mock endpoint not implemented: ${method} /${relativePath}` }, 404);
}

function handleCandidateSession(method: string, accessCode: string, action?: string) {
  const session = findSessionByAccessCode(accessCode);
  if (!session) return json({ message: "Invitation not found." }, 404);
  if (method === "GET" && !action) return json(withTemplate(session));
  if (method === "PUT" && action === "start") {
    session.status = "in_progress";
    session.startedAt ??= new Date().toISOString();
    session.updatedAt = new Date().toISOString();
    return json(withTemplate(session));
  }
  if (method === "PUT" && action === "complete") {
    session.status = "completed";
    session.completedAt = new Date().toISOString();
    session.reportReady = true;
    session.reportStatus = "generated";
    session.overallScore = 4.0;
    session.updatedAt = new Date().toISOString();
    if (!reports.some((report) => report.sessionId === session.id)) reports.push(generateReportFor(session));
    return json(withTemplate(session));
  }
  return json({ message: "Unsupported candidate session action." }, 404);
}

function handleReports(method: string, sessionId: string, action?: string, body?: unknown) {
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) return json({ message: "Session not found." }, 404);
  if (method === "GET" && !action) return jsonOr404(reports.find((report) => report.sessionId === sessionId), "Report not ready.");
  if (method === "POST" && action === "generate") {
    let report = reports.find((item) => item.sessionId === sessionId);
    report ??= generateReportFor(session);
    if (!reports.includes(report)) reports.push(report);
    session.reportReady = true;
    session.reportStatus = "generated";
    session.overallScore = report.overallScore;
    return json(report);
  }
  if (method === "GET" && action === "notes") return json(reviewerNotes.filter((note) => note.sessionId === sessionId));
  if (method === "POST" && action === "notes") {
    const input = asRecord(body);
    const note: ReviewerNote = {
      id: `note-${Date.now()}`,
      sessionId,
      note: String(input.note ?? ""),
      reviewer: { id: mockUser.id, name: mockUser.name },
      createdAt: new Date().toISOString(),
    };
    reviewerNotes.unshift(note);
    return json(note, 201);
  }
  return json({ message: "Unsupported report action." }, 404);
}

function handleCode(method: string, accessCode: string, action?: string, body?: unknown) {
  const session = findSessionByAccessCode(accessCode);
  if (!session) return json({ message: "Invitation not found." }, 404);
  if (method === "GET" && action === "questions") return json(codeQuestions);
  if (method === "GET" && action === "submissions") return json(codeSubmissions.filter((submission) => submission.sessionId === session.id));
  if (method === "POST" && action === "run") return json<CodeRunResult>({ status: "Accepted", stdout: "Sample output matched.\n", stderr: "", compileOutput: "", executionTime: 0.04 });
  if (method === "POST" && action === "submit") {
    const input = asRecord(body);
    const questionId = String(input.questionId ?? codeQuestions[0].id);
    const result: CandidateCodeSubmitResult = {
      submissionId: `sub-${Date.now()}`,
      sessionId: session.id,
      questionId,
      status: "Accepted",
      stdout: "Hidden tests completed.",
      stderr: "",
      compileOutput: "",
      executionTime: 0.08,
      score: 88,
      totalTestCases: 6,
      passedTestCases: 5,
      testResults: [
        { case: 1, passed: true, status: "Accepted", executionTime: 0.03 },
        { case: 2, passed: true, status: "Accepted", executionTime: 0.04 },
        { case: 3, passed: true, status: "Accepted", executionTime: 0.05 },
      ],
    };
    codeSubmissions.unshift({
      id: result.submissionId,
      sessionId: session.id,
      questionId,
      language: "javascript",
      sourceCode: String(input.sourceCode ?? ""),
      stdout: result.stdout,
      stderr: "",
      compileOutput: "",
      status: result.status,
      executionTime: result.executionTime,
      score: result.score,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return json(result);
  }
  return json({ message: "Unsupported code action." }, 404);
}

function createSummary(): AnalyticsSummary {
  const completed = sessions.filter((session) => session.status === "completed");
  const averageScore = average(completed.map((session) => session.overallScore ?? 0).filter(Boolean));
  const count = (status: SessionStatus) => sessions.filter((session) => session.status === status).length;
  return {
    totalCandidates: new Set(sessions.map((session) => session.candidateId ?? session.candidateEmail ?? session.id)).size,
    totalTemplates: templates.length,
    totalSessions: sessions.length,
    completedAssessments: count("completed"),
    inProgressAssessments: count("in_progress"),
    pendingAssessments: count("not_started"),
    expiredAssessments: count("expired"),
    averageScore,
    completionRate: sessions.length ? completed.length / sessions.length : 0,
    statusBreakdown: (["not_started", "in_progress", "completed", "expired"] as SessionStatus[]).map((status) => ({ status, count: count(status) })),
    modulePerformance: createModulePerformance(),
    recentCompleted: completed.map((session) => ({
      sessionId: session.id,
      candidateName: session.candidateName,
      candidateEmail: session.candidateEmail,
      assessmentName: session.templateTitle ?? "Assessment",
      targetRole: session.targetRole ?? "Candidate",
      overallScore: session.overallScore,
      completedAt: session.completedAt,
    })),
  };
}

function createActivity(): ActivityItem[] {
  return sessions.map((session, index) => ({
    id: `activity-${session.id}`,
    sessionId: session.id,
    type: session.status,
    message:
      session.status === "completed"
        ? `${session.candidateName} completed ${session.templateTitle}`
        : session.status === "in_progress"
          ? `${session.candidateName} is working through the assessment`
          : `Invitation sent to ${session.candidateName}`,
    candidateName: session.candidateName,
    assessmentName: session.templateTitle ?? "Assessment",
    status: session.status,
    createdAt: session.updatedAt ?? iso(-index),
  }));
}

function createModulePerformance(): ModulePerformance[] {
  return [
    { moduleId: "mod-ai", moduleType: "ai_interview", title: "AI Interview", average: 4.3, evaluationCount: 12 },
    { moduleId: "mod-code", moduleType: "coding", title: "Coding Assessment", average: 4.1, evaluationCount: 8 },
    { moduleId: "mod-comm", moduleType: "communication", title: "Communication", average: 4.0, evaluationCount: 10 },
    { moduleId: "mod-lead", moduleType: "leadership", title: "Leadership", average: 3.9, evaluationCount: 7 },
  ];
}

function createDistribution() {
  // Analytics UI expects a flat array of score buckets.
  return [
    { label: "1-2", count: 1 },
    { label: "2-3", count: 2 },
    { label: "3-4", count: 5 },
    { label: "4-5", count: 9 },
  ];
}

function createTrend() {
  const completed = sessions.filter((session) => session.status === "completed" && session.overallScore);
  if (completed.length === 0) {
    return [
      { date: iso(-336), score: 72 },
      { date: iso(-240), score: 78 },
      { date: iso(-144), score: 81 },
      { date: iso(-48), score: 86 },
    ];
  }

  return completed
    .slice()
    .sort((a, b) => new Date(a.completedAt ?? a.updatedAt ?? 0).getTime() - new Date(b.completedAt ?? b.updatedAt ?? 0).getTime())
    .map((session) => ({
      date: session.completedAt ?? session.updatedAt ?? new Date().toISOString(),
      score: Math.round(((session.overallScore ?? 0) / 5) * 100),
    }));
}

function createThemes() {
  return {
    strengths: [{ label: "Clear trade-offs", count: 7 }, { label: "Ownership", count: 6 }, { label: "Structured communication", count: 5 }],
    improvementAreas: [{ label: "Testing depth", count: 4 }, { label: "Metric design", count: 3 }, { label: "Prioritization detail", count: 2 }],
  };
}

function toCatalogSummary(template: AssessmentTemplate): CatalogTemplateSummary {
  const modules = template.modules ?? [];
  const questionCount = modules.reduce((total, module) => total + (module.questions?.length ?? 0), 0);
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    roleType: template.roleType,
    timeLimitMin: template.timeLimitMin,
    moduleCount: modules.length,
    questionCount,
    moduleTypes: modules.map((module) => module.type),
    source: "prebuilt",
  };
}

/** Deep-clone a catalog or org template into a new org-owned row with fresh ids. */
function cloneTemplateIntoOrg(
  source: AssessmentTemplate,
  fixedId?: string,
  titleOverride?: string,
  scoringRules?: JsonValue,
): AssessmentTemplate {
  const id = fixedId ?? `tpl-${slug(titleOverride ?? source.title)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    title: titleOverride ?? source.title,
    description: source.description,
    roleType: source.roleType,
    timeLimitMin: source.timeLimitMin,
    scoringRules: scoringRules ?? toJsonValue(source.scoringRules),
    createdById: mockUser.id,
    organizationId: mockUser.organizationId,
    modules: (source.modules ?? []).map((module, index) => ({
      id: `mod-${id}-${index + 1}`,
      type: module.type,
      title: module.title,
      description: module.description,
      weight: module.weight,
      orderIndex: module.orderIndex,
      settings: toJsonValue(module.settings),
      questions: (module.questions ?? []).map((question, questionIndex) => ({
        id: `q-${id}-${index + 1}-${questionIndex + 1}`,
        questionText: question.questionText,
        questionType: question.questionType,
        options: toJsonValue(question.options),
        rubric: toJsonValue(question.rubric),
      })),
    })),
  };
}

function normalizeTemplate(input: Record<string, unknown>): AssessmentTemplate {
  const id = `tpl-${slug(String(input.title ?? "custom-template"))}-${Date.now()}`;
  const modules = Array.isArray(input.modules) ? input.modules : [];
  return {
    id,
    title: String(input.title ?? "Custom Assessment"),
    description: String(input.description ?? ""),
    roleType: String(input.roleType ?? "General Role"),
    timeLimitMin: Number(input.timeLimitMin ?? 60),
    scoringRules: toJsonValue(input.scoringRules),
    createdById: mockUser.id,
    organizationId: mockUser.organizationId,
    modules: modules.map((item, index) => {
      const module = asRecord(item);
      const questions = Array.isArray(module.questions) ? module.questions : [];
      return {
        id: `mod-${id}-${index + 1}`,
        type: String(module.type ?? "behavioral") as ModuleType,
        title: String(module.title ?? "Module"),
        description: String(module.description ?? ""),
        weight: Number(module.weight ?? 1),
        orderIndex: Number(module.orderIndex ?? index + 1),
        settings: toJsonValue(module.settings),
        questions: questions.map((question, questionIndex) => {
          const record = asRecord(question);
          return {
            id: `q-${id}-${index + 1}-${questionIndex + 1}`,
            questionText: String(record.questionText ?? ""),
            questionType: String(record.questionType ?? "short_answer") as QuestionType,
            rubric: toJsonValue(record.rubric),
          };
        }),
      };
    }),
  };
}

function generateReportFor(session: InterviewSession): CandidateReport {
  return {
    sessionId: session.id,
    candidateName: session.candidateName,
    assessmentName: session.templateTitle ?? "Assessment",
    completedAt: session.completedAt ?? new Date().toISOString(),
    overallScore: session.overallScore ?? 4.0,
    moduleScores: { "Interview Evidence": 4.1, "Role Fit": 4.0, Communication: 3.9 },
    summary: `${session.candidateName} completed the assessment with clear, reviewable evidence. This mock report is generated locally for frontend testing.`,
    strengths: ["Clear communication", "Practical examples", "Structured reasoning"],
    improvementAreas: ["Validate claims in live interview", "Ask one deeper role-specific follow-up"],
    evidence: ["Mock response evidence is available for UI testing.", "Code and written responses are represented with sample local data."],
    advisoryNotice: "AI feedback is advisory and must be reviewed by a human interviewer before any decision.",
    generatedAt: new Date().toISOString(),
    persistence: { status: "persisted", evaluationCount: 3 },
  };
}

function withTemplate(session: InterviewSession): CandidateAccessSession {
  return { ...session, template: templates.find((template) => template.id === session.templateId) ?? templates[0] };
}

function findSessionByAccessCode(accessCode: string) {
  return sessions.find((session) => session.accessCode.toLowerCase() === accessCode.toLowerCase());
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

function jsonOr404<T>(data: T | undefined, message: string) {
  return data ? json(data) : json({ message }, 404);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

async function readJson(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
