export type UserRole = "admin" | "organization" | "interviewer" | "candidate";
export type SessionStatus = "not_started" | "in_progress" | "completed" | "expired";
export type ModuleType =
  | "ai_interview"
  | "coding"
  | "debugging"
  | "work_style"
  | "behavioral"
  | "leadership"
  | "communication"
  | "problem_solving";
export type QuestionType = "mcq" | "scale" | "short_answer" | "coding" | "scenario" | "roleplay";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  organizationId?: string;
  profilePhoto?: string;
}

/** Workspace organization profile from GET/PUT /organization. */
export interface WorkspaceProfile {
  id: string;
  name: string;
  memberCount: number;
  ownerName?: string;
  ownerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Live data counts + retention copy from GET /organization/privacy. */
export interface WorkspacePrivacySummary {
  organizationId: string;
  organizationName: string;
  memberCount: number;
  templateCount: number;
  sessionCount: number;
  completedSessionCount: number;
  reportCount: number;
  inviteCount: number;
  oldestSessionAt?: string;
  newestSessionAt?: string;
  retentionPolicy: string;
  advisoryNotice: string;
}

/** Full workspace export payload from GET /organization/export. */
export interface WorkspaceExportPayload {
  exportedAt: string;
  organization: WorkspaceProfile;
  privacy: WorkspacePrivacySummary;
  members: WorkspaceMember[];
  templates: Array<{
    id: string;
    title: string;
    description?: string;
    roleType: string;
    timeLimitMin?: number | null;
    moduleCount: number;
    questionCount: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
  sessions: Array<{
    id: string;
    title?: string | null;
    candidateName?: string;
    candidateEmail?: string;
    templateId: string;
    templateTitle?: string;
    status: string;
    accessCode: string;
    startedAt?: string | null;
    completedAt?: string | null;
    createdAt?: string;
  }>;
  reports: Array<{
    sessionId: string;
    overallScore: number;
    summary: string;
    createdAt?: string;
  }>;
}

export interface DeleteWorkspaceDataResult {
  deleted: true;
  organizationId: string;
  deletedTemplates: number;
  deletedSessions: number;
  deletedInvites: number;
  message: string;
}

export interface AuthResponse {
  user: AuthUser;
  message: string;
}

export interface EmailVerificationRequestResponse {
  message: string;
  emailDelivery: {
    status: "sent" | "skipped" | "failed" | "queued";
    reason?: string;
  };
  verificationUrl?: string;
}

export interface RegistrationResponse extends EmailVerificationRequestResponse {
  email: string;
  requiresEmailVerification: true;
}

/** Workspace teammate (owner or interviewer). */
export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  organizationId?: string;
  createdAt?: string;
  isCurrentUser?: boolean;
  profilePhoto?: string;
}

export type InviteStatus = "pending" | "accepted" | "cancelled" | "expired";

export interface EmailDelivery {
  status: "sent" | "skipped" | "failed" | "queued";
  reason?: string;
  messageId?: string;
  provider?: "resend" | "gmail" | "none";
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: UserRole;
  status: InviteStatus;
  token: string;
  inviteUrlPath: string;
  inviteUrl?: string;
  invitedBy?: { id: string; name: string };
  expiresAt: string;
  createdAt?: string;
  acceptedAt?: string;
  emailDelivery?: EmailDelivery;
}

export interface InvitePreview {
  email: string;
  organizationName: string;
  role: UserRole;
  roleLabel: string;
  expiresAt: string;
  inviterName?: string;
}

export interface Question {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options?: JsonValue;
  rubric?: JsonValue;
}

export interface AssessmentModule {
  id: string;
  type: ModuleType;
  title: string;
  description: string;
  weight: number;
  orderIndex: number;
  settings?: JsonValue;
  questions?: Question[];
}

export interface AssessmentTemplate {
  id: string;
  title: string;
  description: string;
  roleType: string;
  timeLimitMin?: number;
  scoringRules?: JsonValue;
  createdById?: string;
  organizationId?: string;
  modules: AssessmentModule[];
}

/** Read-only prebuilt blueprint from GET /templates/catalog */
export interface CatalogTemplateSummary {
  id: string;
  title: string;
  description: string;
  roleType: string;
  timeLimitMin?: number;
  moduleCount: number;
  questionCount: number;
  moduleTypes: ModuleType[];
  source: "prebuilt";
}

export interface InterviewSession {
  id: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail?: string;
  templateId: string;
  templateTitle?: string;
  targetRole?: string;
  title?: string;
  interviewType?: string;
  interviewers?: string[];
  interviewerName?: string;
  interviewerRole?: string;
  notes?: string;
  department?: string;
  scheduledAt?: string;
  durationMin?: number;
  language?: string;
  timeZone?: string;
  createdById?: string;
  organizationId?: string;
  status: SessionStatus;
  accessCode: string;
  assessmentUrl?: string;
  emailDelivery?: EmailDelivery;
  overallScore?: number;
  reportReady?: boolean;
  reportStatus?: "generated" | "pending";
  /** Official integrity warning counters, always server-authored. */
  warningCount?: number;
  warningLimit?: number;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Browser signals the candidate can report. The backend decides what counts. */
export type IntegrityEventType = "visibilitychange" | "blur" | "pagehide" | "beforeunload";

/** One stored integrity signal, as returned by the backend. */
export interface IntegrityEvent {
  id: string;
  sessionId: string;
  clientEventId: string;
  type: IntegrityEventType | string;
  detectedAt: string;
  returnedAt?: string;
  durationMs?: number;
  /** True only when the backend counted this event toward the official warning. */
  counted: boolean;
  reason: string;
}

/** Body of POST /sessions/access/:accessCode/integrity-events. */
export interface IntegrityEventRequest {
  clientEventId: string;
  type: IntegrityEventType;
  detectedAt: string;
  returnedAt?: string;
  durationMs?: number;
}

/**
 * What the backend decided for a reported event. Never client-supplied — the
 * browser sends a signal and receives the decision back.
 */
export type IntegrityAction = "warned" | "terminated" | "duplicate" | "recorded";

/** Official response of the candidate integrity endpoint. */
export interface IntegrityEventResult {
  sessionId: string;
  clientEventId: string;
  counted: boolean;
  warningCount: number;
  warningLimit: number;
  /** Official session status after the decision (REST field name). */
  sessionStatus: SessionStatus;
  action: IntegrityAction;
  reason: string;
  event: IntegrityEvent;
}

/** Reviewer-facing integrity summary from GET /sessions/:id/integrity-events. */
export interface IntegritySummary {
  sessionId: string;
  warningCount: number;
  warningLimit: number;
  status: SessionStatus;
  events: IntegrityEvent[];
}

export interface CandidateAccessSession extends InterviewSession {
  template: AssessmentTemplate;
}

export interface CandidateResponse {
  id: string;
  sessionId: string;
  questionId?: string;
  responseText: string;
  responseJson?: JsonValue;
  savedAt?: string;
  createdAt?: string;
}

export type InterviewerFollowUpStatus = "sent" | "answered" | "cancelled";

/**
 * A question a human interviewer sent to one candidate mid-session. Distinct
 * from AI follow-ups / adaptive questions — reviewers must be able to tell
 * human-authored evidence from AI-generated evidence.
 */
export interface InterviewerFollowUp {
  id: string;
  sessionId: string;
  moduleId?: string;
  parentQuestionId?: string;
  questionText: string;
  answerText?: string;
  required: boolean;
  sequence: number;
  status: InterviewerFollowUpStatus;
  askedBy: { id?: string; name: string };
  sentAt: string;
  answerSavedAt?: string;
  answeredAt?: string;
  cancelledAt?: string;
}

export interface CandidateReport {
  sessionId: string;
  candidateName: string;
  assessmentName: string;
  completedAt?: string;
  overallScore: number;
  moduleScores: Record<string, number>;
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  evidence: string[];
  reviewerSummary?: string;
  advisoryNotice: string;
  generatedAt?: string;
  persistence?: { status: "persisted" | "skipped" | "failed"; reason?: string; evaluationCount?: number };
}

export interface ReviewerNote {
  id: string;
  sessionId: string;
  note: string;
  reviewer: { id: string; name: string };
  createdAt?: string;
}

export interface ModulePerformance {
  moduleId?: string;
  moduleType: string;
  title: string;
  average: number;
  evaluationCount: number;
}

export interface AnalyticsSummary {
  asOf: string;
  dataWindow: "all_time";
  scope: "organization" | "platform";
  totalCandidates: number;
  totalTemplates: number;
  totalSessions: number;
  completedAssessments: number;
  inProgressAssessments: number;
  pendingAssessments: number;
  expiredAssessments: number;
  activeAssessments: number;
  closedAssessments: number;
  reportReadyAssessments: number;
  reportsPending: number;
  closedCompletionRate: number | null;
  reportCoverageRate: number | null;
  statusBreakdown: Array<{ status: SessionStatus; count: number }>;
}

export interface UpcomingAssessment {
  sessionId: string;
  candidateName: string;
  targetRole: string;
  status: Extract<SessionStatus, "not_started" | "in_progress">;
  scheduledAt?: string;
  expiresAt?: string;
}

export interface ScoreDistributionBucket {
  label: string;
  count: number;
  noEvidence?: boolean;
}

export interface CompletionDuration {
  templateId: string;
  medianMinutes: number | null;
  sampleSize: number;
  buckets: Array<{ label: string; count: number }>;
}

export interface TemplateUsageItem {
  templateId: string;
  title: string;
  assignments: number;
  completed: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  score: number;
  completedCount: number;
}

export interface AnalyticsThemes {
  strengths: Array<{ label: string; count: number }>;
  improvementAreas: Array<{ label: string; count: number }>;
}

export interface ActivityItem {
  id: string;
  sessionId: string;
  type: string;
  message: string;
  candidateName: string;
  assessmentName: string;
  status: SessionStatus;
  createdAt: string;
}

export interface CodeQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  starterCode: string;
  language: "javascript";
  sampleInput: string;
  sampleOutput: string;
  examples: Array<{ input: string; expectedOutput: string }>;
  testCaseCount: number;
}

export interface CodeRunResult {
  status: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  executionTime: number;
}

export interface CodeSubmitResult extends CodeRunResult {
  submissionId: string;
  sessionId: string;
  questionId: string;
  score: number;
  totalTestCases: number;
  passedTestCases: number;
  testResults: Array<{
    stdin: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    status: string;
    executionTime: number;
  }>;
}

export interface CandidateCodeSubmitResult extends Omit<CodeSubmitResult, "testResults"> {
  testResults: Array<{ case: number; passed: boolean; status: string; executionTime: number }>;
}

export interface CandidateCodeSubmission {
  id: string;
  sessionId: string;
  questionId: string;
  language: string;
  sourceCode: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  status: string;
  executionTime: number;
  score: number;
  createdAt: string;
  updatedAt: string;
}

/** Where a transcript entry came from — the reviewer's provenance discriminator. */
export type TranscriptOrigin = "template" | "ai_adaptive" | "interviewer_follow_up" | "code_submission";

export type TranscriptFollowUpStatus = "sent" | "answered" | "cancelled";

export interface TranscriptCodeArtifact {
  language: string;
  sourceCode: string;
  stdout?: string;
  stderr?: string;
  testResults?: JsonValue;
}

export interface TranscriptEntry {
  id: string;
  origin: TranscriptOrigin;
  questionId?: string;
  /** Interviewer follow-ups only: the question whose answer prompted it. */
  parentQuestionId?: string;
  moduleId?: string;
  moduleTitle?: string;
  moduleType?: string;
  /** 1-based position in `entries`, so a reviewer can cite "line 7" of a transcript. */
  sequence: number;
  questionText: string;
  questionTextIsSnapshot?: boolean;
  liveQuestionText?: string;
  answerText?: string;
  /** Interviewer follow-ups only: the human who asked. */
  askedBy?: { id?: string; name: string };
  askedAt?: string;
  answeredAt?: string;
  /** Interviewer follow-ups only. */
  status?: TranscriptFollowUpStatus;
  code?: TranscriptCodeArtifact;
  /** True when this entry's ANSWER reached the scoring pipeline as candidate evidence. */
  isEvidence: boolean;
}

export interface TranscriptCounts {
  template: number;
  aiAdaptive: number;
  interviewerFollowUp: number;
  codeSubmission: number;
}

/** Rows the backend leaves out per source when a session exceeds the read cap. */
export interface TranscriptSourceCounts {
  responses: number;
  aiMessages: number;
  codeSubmissions: number;
  interviewerFollowUps: number;
}

/**
 * A trail shown to a reviewer as complete evidence must never quietly stop short,
 * so the backend states the shortfall instead of hiding it.
 */
export interface TranscriptTruncation {
  truncated: boolean;
  limit: number;
  omitted: TranscriptSourceCounts;
}

/** Full evidence trail for one session from GET /sessions/:id/transcript. */
export interface SessionTranscript {
  sessionId: string;
  status: SessionStatus;
  canManageFollowUps?: boolean;
  startedAt?: string;
  completedAt?: string;
  candidate: { id: string; name: string; email: string };
  templateTitle?: string;
  entries: TranscriptEntry[];
  counts: TranscriptCounts;
  truncation: TranscriptTruncation;
  /** Official integrity warning summary + timeline for the reviewer UI. */
  warningCount?: number;
  warningLimit?: number;
  integrityEvents?: IntegrityEvent[];
}
