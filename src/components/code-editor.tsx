"use client";

import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

export const CODE_LANGUAGES = [
  { value: "javascript", label: "JavaScript (Node)", file: "solution.js" },
  { value: "typescript", label: "TypeScript", file: "solution.ts" },
  { value: "python", label: "Python 3", file: "solution.py" },
  { value: "java", label: "Java", file: "Main.java" },
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number]["value"];

/** Minimal runnable scaffold per language so switching never leaves a blank editor. */
export const STARTER_BY_LANGUAGE: Record<CodeLanguage, string> = {
  javascript: `const input = require("fs").readFileSync(0, "utf8").trim();\n// Read stdin, print the answer with console.log\nconsole.log(input);\n`,
  typescript: `const input: string = require("fs").readFileSync(0, "utf8").trim();\n// Read stdin, print the answer with console.log\nconsole.log(input);\n`,
  python: `import sys\n\ndata = sys.stdin.read().strip()\n# Read stdin, print the answer\nprint(data)\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Read stdin, print the answer\n        if (scanner.hasNextLine()) System.out.println(scanner.nextLine());\n    }\n}\n`,
};

export function languageLabel(language: CodeLanguage): string {
  return CODE_LANGUAGES.find((entry) => entry.value === language)?.label ?? language;
}

export function languageFileName(language: CodeLanguage): string {
  return CODE_LANGUAGES.find((entry) => entry.value === language)?.file ?? "solution.txt";
}

/**
 * Syntax-highlighted editor. TypeScript reuses the JavaScript grammar with the
 * `typescript` flag, which is what CodeMirror's JS package is designed for.
 */
export function CodeEditor({
  value,
  language,
  onChange,
  readOnly,
  minHeight = "360px",
}: {
  value: string;
  language: CodeLanguage;
  onChange: (next: string) => void;
  readOnly?: boolean;
  minHeight?: string;
}) {
  const extensions = useMemo(() => {
    switch (language) {
      case "python":
        return [python()];
      case "java":
        return [java()];
      case "typescript":
        return [javascript({ typescript: true })];
      default:
        return [javascript()];
    }
  }, [language]);

  return (
    <CodeMirror
      basicSetup={{ autocompletion: true, bracketMatching: true, closeBrackets: true, highlightActiveLine: !readOnly, lineNumbers: true }}
      editable={!readOnly}
      extensions={extensions}
      height="100%"
      minHeight={minHeight}
      onChange={onChange}
      readOnly={readOnly}
      theme={oneDark}
      value={value}
    />
  );
}

export function LanguagePicker({
  language,
  onChange,
  disabled,
}: {
  language: CodeLanguage;
  onChange: (next: CodeLanguage) => void;
  disabled?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
      <span className="sr-only">Programming language</span>
      <select
        className="h-8 rounded-md border border-white/15 bg-[#161c26] px-2 text-xs text-slate-200 outline-none disabled:opacity-50"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as CodeLanguage)}
        value={language}
      >
        {CODE_LANGUAGES.map((entry) => (
          <option key={entry.value} value={entry.value}>{entry.label}</option>
        ))}
      </select>
    </label>
  );
}
