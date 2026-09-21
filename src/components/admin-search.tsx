"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccountStatusBadge, Avatar, PlanBadge, RoleBadge, useDebouncedValue } from "@/components/admin-ui";
import { Icon } from "@/components/icons";
import { type AdminSearchResults, buildAdminQuery, searchAdminDirectory } from "@/lib/admin";
import { getErrorMessage } from "@/lib/api";
import { ADMIN_HOME } from "@/lib/auth-routes";

type ResultItem =
  | { kind: "organization"; id: string; href: string }
  | { kind: "user"; id: string; href: string }
  | { kind: "more"; id: string; href: string };

const MIN_QUERY_LENGTH = 2;

/**
 * Command-palette search across every workspace and account. Opening a result
 * lands on the list page with that row's detail panel already open, so the
 * operator keeps the surrounding context instead of a bare detail page.
 */
export function AdminSearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 250);
  const [results, setResults] = useState<AdminSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults(null);
    setError("");
    setCursor(0);
    const handle = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(handle);
  }, [open]);

  useEffect(() => {
    if (!open || debounced.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    searchAdminDirectory(debounced)
      .then((next) => {
        if (cancelled) return;
        setResults(next);
        setCursor(0);
      })
      .catch((requestError) => {
        if (!cancelled) setError(getErrorMessage(requestError, "Search is unavailable right now."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const items = useMemo<ResultItem[]>(() => {
    if (!results) return [];
    const list: ResultItem[] = [];
    for (const organization of results.organizations) {
      list.push({ kind: "organization", id: organization.id, href: `${ADMIN_HOME}/organizations${buildAdminQuery({ q: debounced, open: organization.id })}` });
    }
    if (results.organizationTotal > results.organizations.length) {
      list.push({ kind: "more", id: "more-organizations", href: `${ADMIN_HOME}/organizations${buildAdminQuery({ q: debounced })}` });
    }
    for (const user of results.users) {
      list.push({ kind: "user", id: user.id, href: `${ADMIN_HOME}/users${buildAdminQuery({ q: debounced, open: user.id })}` });
    }
    if (results.userTotal > results.users.length) {
      list.push({ kind: "more", id: "more-users", href: `${ADMIN_HOME}/users${buildAdminQuery({ q: debounced })}` });
    }
    return list;
  }, [debounced, results]);

  const go = useCallback(
    (item: ResultItem | undefined) => {
      if (!item) return;
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((current) => (items.length ? (current + 1) % items.length : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((current) => (items.length ? (current - 1 + items.length) % items.length : 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        go(items[cursor]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cursor, go, items, onClose, open]);

  if (!open) return null;

  const organizationIndexOffset = 0;
  const userIndexOffset = items.findIndex((item) => item.kind === "user");

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[10vh]">
      <button aria-label="Close search" className="absolute inset-0 bg-neutral-950/50 backdrop-blur-[2px]" onClick={onClose} type="button" />
      <div aria-label="Search the platform" aria-modal="true" className="card relative z-10 w-full max-w-[640px] overflow-hidden rounded-2xl border border-[var(--theme-border)] shadow-2xl" role="dialog">
        <label className="flex h-14 items-center gap-3 border-b border-[var(--theme-border)] px-4">
          <Icon className="shrink-0 text-[var(--theme-muted)]" name="search" size={18} />
          <span className="sr-only">Search workspaces and people</span>
          <input
            aria-activedescendant={items[cursor] ? `admin-search-${items[cursor].id}` : undefined}
            aria-controls="admin-search-results"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--theme-heading)] outline-none placeholder:text-[var(--theme-muted)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workspaces by name or owner email, people by name or email…"
            ref={inputRef}
            role="combobox"
            aria-expanded={items.length > 0}
            type="text"
            value={query}
          />
          <kbd className="hidden rounded border border-[var(--theme-border)] px-1.5 py-0.5 text-xs font-semibold text-[var(--theme-faint)] sm:block">Esc</kbd>
        </label>

        <div className="max-h-[60vh] overflow-y-auto" id="admin-search-results" role="listbox">
          {debounced.length < MIN_QUERY_LENGTH ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--theme-muted)]">Type at least two characters. Use ↑ ↓ to move and Enter to open.</p>
          ) : null}
          {error ? <p className="px-4 py-6 text-center text-xs text-rose-600">{error}</p> : null}
          {loading && !results ? <p className="px-4 py-6 text-center text-xs text-[var(--theme-muted)]">Searching…</p> : null}
          {results && !items.length ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--theme-muted)]">No workspace or account matches “{debounced}”.</p>
          ) : null}

          {results?.organizations.length ? (
            <section className="py-2">
              <h3 className="px-4 pb-1 text-xs font-bold uppercase tracking-wider text-[var(--theme-faint)]">Workspaces</h3>
              {results.organizations.map((organization, index) => {
                const itemIndex = organizationIndexOffset + index;
                const selected = cursor === itemIndex;
                return (
                  <button
                    aria-selected={selected}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${selected ? "bg-[var(--theme-active)]/40" : "hover:bg-[var(--theme-panel-soft)]"}`}
                    id={`admin-search-${organization.id}`}
                    key={organization.id}
                    onClick={() => go(items[itemIndex])}
                    onMouseEnter={() => setCursor(itemIndex)}
                    role="option"
                    type="button"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-panel-soft)] text-[var(--theme-heading)]">
                      <Icon name="globe" size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--theme-heading)]">{organization.name}</span>
                      <span className="block truncate text-xs text-[var(--theme-muted)]">{organization.owner?.email ?? "No owner account"} · {organization.memberCount} members</span>
                    </span>
                    <PlanBadge plan={organization.plan} />
                    <AccountStatusBadge suspended={organization.isSuspended} />
                  </button>
                );
              })}
              {results.organizationTotal > results.organizations.length ? (
                <MoreRow count={results.organizationTotal} label="workspaces" selected={cursor === results.organizations.length} onSelect={() => go(items[results.organizations.length])} onHover={() => setCursor(results.organizations.length)} />
              ) : null}
            </section>
          ) : null}

          {results?.users.length ? (
            <section className="border-t border-[var(--theme-border)] py-2">
              <h3 className="px-4 pb-1 text-xs font-bold uppercase tracking-wider text-[var(--theme-faint)]">People</h3>
              {results.users.map((user, index) => {
                const itemIndex = userIndexOffset + index;
                const selected = cursor === itemIndex;
                return (
                  <button
                    aria-selected={selected}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${selected ? "bg-[var(--theme-active)]/40" : "hover:bg-[var(--theme-panel-soft)]"}`}
                    id={`admin-search-${user.id}`}
                    key={user.id}
                    onClick={() => go(items[itemIndex])}
                    onMouseEnter={() => setCursor(itemIndex)}
                    role="option"
                    type="button"
                  >
                    <Avatar name={user.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--theme-heading)]">{user.name}</span>
                      <span className="block truncate text-xs text-[var(--theme-muted)]">
                        {user.email}
                        {user.organization ? ` · ${user.organization.name}` : ""}
                      </span>
                    </span>
                    <RoleBadge label={user.roleLabel} role={user.role} />
                    <AccountStatusBadge suspended={user.isSuspended} />
                  </button>
                );
              })}
              {results.userTotal > results.users.length ? (
                <MoreRow count={results.userTotal} label="accounts" selected={cursor === items.length - 1} onSelect={() => go(items[items.length - 1])} onHover={() => setCursor(items.length - 1)} />
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MoreRow({ count, label, selected, onSelect, onHover }: { count: number; label: string; selected: boolean; onSelect: () => void; onHover: () => void }) {
  return (
    <button
      aria-selected={selected}
      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-[var(--color-primary-700)] transition ${selected ? "bg-[var(--theme-active)]/40" : "hover:bg-[var(--theme-panel-soft)]"}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      type="button"
    >
      Show all {count.toLocaleString()} matching {label}
      <Icon className="-rotate-90" name="chevron" size={12} />
    </button>
  );
}

/** Ctrl/⌘+K anywhere in the console, or "/" outside a text field, opens the palette. */
export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target ? ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable : false;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      } else if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpen]);
}
