"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";

type ThemeName = "light" | "dark" | "ocean";

const themes: Array<{ icon: IconName; label: string; value: ThemeName }> = [
  { icon: "sun", label: "Light", value: "light" },
  { icon: "moon", label: "Dark", value: "dark" },
  { icon: "waves", label: "Ocean", value: "ocean" },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeName>("light");
  const [mounted, setMounted] = useState(false);

  // Sync from storage / the pre-hydration <html data-theme> (set by the inline
  // script in layout.tsx) once, after mount. Kept out of the initial render so
  // SSR and first client render stay identical (no hydration mismatch).
  useEffect(() => {
    const saved = window.localStorage.getItem("evalora-theme");
    const applied = document.documentElement.dataset.theme as ThemeName | undefined;
    const resolved: ThemeName =
      saved === "dark" || saved === "ocean" || saved === "light"
        ? saved
        : applied === "dark" || applied === "ocean"
          ? applied
          : "light";
    setTheme(resolved);
    setMounted(true);
  }, []);

  // Apply + persist only after the sync above, so the "light" default never
  // overwrites the correct theme the inline script already applied on first paint.
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    window.localStorage.setItem("evalora-theme", theme);
  }, [theme, mounted]);

  return (
    <div
      aria-label="Theme selector"
      className={`inline-flex items-center gap-1 rounded-[8px] border p-1 ${compact ? "h-[38px]" : "h-10"}`}
      style={{
        backgroundColor: "var(--theme-panel)",
        borderColor: "var(--theme-border)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
      }}
    >
      {themes.map((item) => {
        const active = theme === item.value;
        return (
          <button
            aria-label={`Use ${item.label} theme`}
            aria-pressed={active}
            className="flex h-full w-8 items-center justify-center rounded-[6px] transition"
            key={item.value}
            onClick={() => setTheme(item.value)}
            suppressHydrationWarning
            style={
              active
                ? {
                    backgroundColor: "var(--theme-active)",
                    color: "var(--theme-active-text)",
                    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 35%, transparent)",
                  }
                : {
                    color: "var(--theme-muted)",
                    backgroundColor: "transparent",
                  }
            }
            title={item.label}
            type="button"
            onMouseEnter={(event) => {
              if (active) return;
              event.currentTarget.style.backgroundColor = "var(--theme-panel-soft)";
              event.currentTarget.style.color = "var(--theme-heading)";
            }}
            onMouseLeave={(event) => {
              if (active) return;
              event.currentTarget.style.backgroundColor = "transparent";
              event.currentTarget.style.color = "var(--theme-muted)";
            }}
          >
            <Icon name={item.icon} size={15} />
          </button>
        );
      })}
    </div>
  );
}
