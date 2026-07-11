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
    <div className={`inline-flex items-center gap-1 rounded-[8px] border border-neutral-200 bg-white p-1 ${compact ? "h-[38px]" : "h-10"}`} aria-label="Theme selector">
      {themes.map((item) => (
        <button
          aria-label={`Use ${item.label} theme`}
          className={`flex h-full w-8 items-center justify-center rounded-[6px] transition ${theme === item.value ? "bg-primary-700 text-white shadow-sm" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}
          key={item.value}
          onClick={() => setTheme(item.value)}
          title={item.label}
          type="button"
        >
          <Icon name={item.icon} size={15} />
        </button>
      ))}
    </div>
  );
}
