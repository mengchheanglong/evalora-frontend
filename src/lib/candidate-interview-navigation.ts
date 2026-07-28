type FollowUpState = {
  id: string;
  status: "sent" | "answered" | "cancelled";
  required: boolean;
  parentQuestionId?: string;
};

type ResumeDecision = {
  resolved: boolean;
  resume: boolean;
  nextBlockingId?: string;
};

/**
 * Decide what happens after a candidate submits an interviewer answer.
 * Only a question that interrupted Continue may resume the assessment plan.
 */
export function decideInterviewerResume({
  activeQuestionId,
  changedFollowUpId,
  refreshedFollowUps,
  resumeAfterFollowUpId,
}: {
  activeQuestionId?: string;
  changedFollowUpId: string;
  refreshedFollowUps: FollowUpState[];
  resumeAfterFollowUpId: string;
}): ResumeDecision {
  const changed = refreshedFollowUps.find((item) => item.id === changedFollowUpId);
  if (changed?.status !== "answered") return { resolved: false, resume: false };
  if (resumeAfterFollowUpId !== changedFollowUpId) return { resolved: true, resume: false };

  const remainingRequired = refreshedFollowUps.filter(
    (item) => item.id !== changedFollowUpId && item.required && item.status === "sent",
  );
  const nextBlocking = remainingRequired.find((item) => item.parentQuestionId === activeQuestionId)
    ?? remainingRequired[0];

  return nextBlocking
    ? { resolved: true, resume: false, nextBlockingId: nextBlocking.id }
    : { resolved: true, resume: true };
}
