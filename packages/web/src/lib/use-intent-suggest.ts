"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { INTENT_CATALOG } from "@/lib/intent-catalog";
import { refineWhoElseQuery, searchIntents, type IntentSearchHit } from "@whoelse/core/vocab-search";

function isSearchFragment(query: string, minLength: number): boolean {
  const t = query.trim();
  if (t.length < minLength || t.length > 56) return false;
  if (/[.!?]$/.test(t)) return false;
  if (t.split(/\s+/).length > 6) return false;
  return true;
}

export function useIntentSuggest(query: string, opts: { minLength?: number; limit?: number } = {}) {
  const minLength = opts.minLength ?? 2;
  const limit = opts.limit ?? 8;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const searchable = isSearchFragment(query, minLength);

  const hits = useMemo(
    () =>
      searchable ? searchIntents(INTENT_CATALOG, query, { minLength, limit, uniqueLabels: true }) : [],
    [query, minLength, limit, searchable],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  const visible = open && hits.length > 0 && query.trim().length >= minLength;

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, onAsk?: () => void) {
    if (visible && hits.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (i + 1) % hits.length);
        return "handled";
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i - 1 + hits.length) % hits.length);
        return "handled";
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return "handled";
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        return hits[active] ?? hits[0];
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAsk?.();
      return "ask";
    }
    return null;
  }

  return { hits, active, setActive, open, setOpen, visible, onKeyDown };
}

export { refineWhoElseQuery };
export type { IntentSearchHit };
