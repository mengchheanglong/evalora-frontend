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

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("evalora-theme");
    if (savedTheme === "dark" || savedTheme === "ocean") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    window.localStorage.setItem("evalora-theme", theme);
  }, [theme]);

  return (
    <div
      aria-label="Theme selector"
      className={`inline-flex items-center gap-1 rounded-[8px] border p-1 ${compact ? "h-[38px]" : "h-10"}`}
      style={{
        backgroundColor: "var(--theme-panel)",
        borderColor: "var(--theme-border)",
        boxShadow: "var(--theme-shadow)",
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
