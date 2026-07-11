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
  role: UserRole;
  organizationId?: string;
}

export interface AuthResponse {
  user: AuthUser;
  message: string;
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

export interface InterviewSession {
  id: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail?: string;
  templateId: string;
  templateTitle?: string;
  targetRole?: string;
  organizationId?: string;
  status: SessionStatus;
  accessCode: string;
  overallScore?: number;
  reportReady?: boolean;
  reportStatus?: "generated" | "pending";
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
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
  totalCandidates: number;
  totalTemplates: number;
  totalSessions: number;
  completedAssessments: number;
  inProgressAssessments: number;
  pendingAssessments: number;
  expiredAssessments: number;
  averageScore: number;
  completionRate: number;
  statusBreakdown: Array<{ status: SessionStatus; count: number }>;
  modulePerformance: ModulePerformance[];
  recentCompleted: Array<{
    sessionId: string;
    candidateName: string;
    candidateEmail?: string;
    assessmentName: string;
    targetRole: string;
    overallScore?: number;
    completedAt?: string;
  }>;
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
