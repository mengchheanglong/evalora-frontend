import test from "node:test";
import assert from "node:assert/strict";
import { decideInterviewerResume } from "../src/lib/candidate-interview-navigation.ts";

test("an answered blocking follow-up resumes the assessment", () => {
  assert.deepEqual(
    decideInterviewerResume({
      activeQuestionId: "question-1",
      changedFollowUpId: "follow-up-1",
      refreshedFollowUps: [
        { id: "follow-up-1", status: "answered", required: true, parentQuestionId: "question-1" },
      ],
      resumeAfterFollowUpId: "follow-up-1",
    }),
    { resolved: true, resume: true },
  );
});

test("answering an unsolicited follow-up does not skip the current assessment question", () => {
  assert.deepEqual(
    decideInterviewerResume({
      activeQuestionId: "question-1",
      changedFollowUpId: "follow-up-1",
      refreshedFollowUps: [
        { id: "follow-up-1", status: "answered", required: true, parentQuestionId: "question-1" },
      ],
      resumeAfterFollowUpId: "",
    }),
    { resolved: true, resume: false },
  );
});

test("a newer required follow-up is shown before the assessment resumes", () => {
  assert.deepEqual(
    decideInterviewerResume({
      activeQuestionId: "question-1",
      changedFollowUpId: "follow-up-1",
      refreshedFollowUps: [
        { id: "follow-up-1", status: "answered", required: true, parentQuestionId: "question-1" },
        { id: "follow-up-2", status: "sent", required: true, parentQuestionId: "question-1" },
      ],
      resumeAfterFollowUpId: "follow-up-1",
    }),
    { resolved: true, resume: false, nextBlockingId: "follow-up-2" },
  );
});

test("optional pending follow-ups do not block the normal next question", () => {
  assert.deepEqual(
    decideInterviewerResume({
      activeQuestionId: "question-1",
      changedFollowUpId: "follow-up-1",
      refreshedFollowUps: [
        { id: "follow-up-1", status: "answered", required: true, parentQuestionId: "question-1" },
        { id: "optional-1", status: "sent", required: false, parentQuestionId: "question-1" },
      ],
      resumeAfterFollowUpId: "follow-up-1",
    }),
    { resolved: true, resume: true },
  );
});
