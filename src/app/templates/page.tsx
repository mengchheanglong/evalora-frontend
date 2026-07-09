import { AppShell } from "@/components/app-shell";
import { ButtonLink } from "@/components/button-link";
import { Icon } from "@/components/icons";
import { assessmentModules, templates } from "@/lib/mock-data";

export default function TemplatesPage() {
  return (
    <AppShell
      active="templates"
      actions={<ButtonLink href="/assessment/demo-session">Preview Flow</ButtonLink>}
      description="Reusable assessment templates for technical and non-technical roles."
      title="Assessment Templates"
    >
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {templates.map((template) => (
            <article className="card p-6" key={template.title}>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <h2 className="text-2xl font-black">{template.title}</h2>
                  <p className="mt-3 text-neutral-600">{template.modules}</p>
                </div>
                <ButtonLink href="/assessment/demo-session" variant="outline">
                  Use template
                </ButtonLink>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[8px] bg-neutral-50 p-4">
                  <p className="text-sm font-semibold text-neutral-500">Estimated duration</p>
                  <p className="mt-1 text-xl font-black">{template.duration}</p>
                </div>
                <div className="rounded-[8px] bg-neutral-50 p-4">
                  <p className="text-sm font-semibold text-neutral-500">Usage</p>
                  <p className="mt-1 text-xl font-black">{template.usage}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="card h-fit p-6">
          <h2 className="text-xl font-black">Default modules</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Templates can combine role-specific interview prompts, coding tasks, behavioral questions, and scenario exercises.
          </p>
          <div className="mt-6 space-y-4">
            {assessmentModules.map((module) => (
              <div className="flex gap-3 rounded-[8px] bg-neutral-50 p-4" key={module.title}>
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-sky-100 text-blue-700">
                  <Icon name={module.title.includes("Coding") ? "code" : module.title.includes("Leadership") ? "sparkle" : module.title.includes("Work") ? "users" : "message"} size={22} />
                </span>
                <div>
                  <p className="font-bold">{module.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">{module.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
