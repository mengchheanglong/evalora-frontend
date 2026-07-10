import { AppShell } from "@/components/app-shell";

export default function CandidatesPage() {
  return (
    <AppShell active="candidates" showPageHeader={false} title="Candidates">
      <div className="min-h-[calc(100vh-152px)]" />
    </AppShell>
  );
}
