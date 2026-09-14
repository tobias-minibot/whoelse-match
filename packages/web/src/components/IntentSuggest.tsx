"use client";

import type { IntentSearchHit } from "@whoelse/core/vocab-search";

export function IntentSuggest({
  hits,
  active,
  visible,
  onHover,
  onPick,
}: {
  hits: IntentSearchHit[];
  active: number;
  visible: boolean;
  onHover: (index: number) => void;
  onPick: (hit: IntentSearchHit) => void;
}) {
  if (!visible || hits.length === 0) return null;
  return (
    <ul className="intent-suggest" role="listbox" aria-label="Matching intents">
      {hits.map((hit, i) => (
        <li key={hit.id} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={i === active}
            className={i === active ? "active" : ""}
            onMouseEnter={() => onHover(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(hit);
            }}
          >
            <span className="intent-suggest-label">{hit.label}</span>
            <span className="intent-suggest-meta">
              {hit.category}
              {hit.coverage ? ` · ${hit.coverage}` : ""}
            </span>
            <span className="intent-suggest-q">{hit.question}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function IntentChips({
  items,
  onRemove,
}: {
  items: { id: string; label: string }[];
  onRemove?: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="intent-chips" aria-label="Picked intents">
      {items.map((item) => (
        <span key={item.id} className="intent-chip">
          {item.label}
          {onRemove ? (
            <button type="button" aria-label={`Remove ${item.label}`} onClick={() => onRemove(item.id)}>
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}
