"use client";

import type { CodeQuestion } from "@/lib/types";

type CodingChallengePickerProps = {
  challenges: CodeQuestion[];
  value: string;
  onChange: (challenge: CodeQuestion) => void;
};

export function CodingChallengePicker({ challenges, value, onChange }: CodingChallengePickerProps) {
  const selected = challenges.find((challenge) => challenge.id === value);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-[var(--theme-muted)]">
        Executable challenge <span className="text-[var(--color-status-critical)]">*</span>
        <select
          className="control mt-1 h-10 w-full rounded-xl text-sm"
          onChange={(event) => {
            const challenge = challenges.find((item) => item.id === event.target.value);
            if (challenge) onChange(challenge);
          }}
          value={value}
        >
          <option value="">Choose a challenge</option>
          {challenges.map((challenge) => (
            <option key={challenge.id} value={challenge.id}>
              {challenge.title} ({challenge.difficulty})
            </option>
          ))}
        </select>
      </label>

      {selected ? (
        <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-[var(--theme-heading)]">{selected.title}</p>
            <span className="rounded bg-[var(--theme-panel-soft)] px-2 py-1 text-xs font-semibold capitalize text-[var(--theme-muted)]">
              {selected.difficulty}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--theme-muted)]">{selected.description}</p>
          <p className="mt-2 text-xs text-[var(--theme-faint)]">
            Includes a public example and private grading cases managed by Evalora.
          </p>
        </div>
      ) : (
        <p className="text-xs leading-5 text-[var(--theme-muted)]">
          Select a curated challenge so the candidate receives a runnable problem with secure grading cases.
        </p>
      )}
    </div>
  );
}
