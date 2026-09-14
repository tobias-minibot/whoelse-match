"use client";

export type CompilePayload = {
  classification: "WHOELSE_COMPILABLE" | "PARTIALLY_COMPILABLE" | "NOT_WHOELSE";
  reason: string;
  confidence: number;
  locked?: boolean;
  usedLlm?: boolean;
  ir: {
    intent: string;
    constraints: Record<string, unknown>;
    exclusions: string[];
  };
  seekDraft?: { kind: string; capability: string; phrases?: string[] };
  find?: { candidates?: { entity: { id: string; name: string; type: string } }[] };
  error?: string;
};

export function CompilePanel({
  result,
  onUseIntent,
}: {
  result: CompilePayload | null;
  onUseIntent?: (intent: string) => void;
}) {
  if (!result) return null;
  if (result.error) return <p className="empty">{result.error}</p>;
  const klass =
    result.classification === "WHOELSE_COMPILABLE"
      ? "ok"
      : result.classification === "PARTIALLY_COMPILABLE"
        ? "partial"
        : "no";
  const constraints = Object.entries(result.ir.constraints ?? {}).filter(([, v]) => {
    if (v == null || v === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
  return (
    <div className="sentinel" aria-live="polite">
      <div className="eyebrow">Sentinel v0 · whoelse.compile</div>
      <p>
        <span className={`klass ${klass}`}>{result.classification}</span>
        {result.usedLlm ? " · LLM refine" : " · heuristic"}
        {result.locked ? " · locked example" : ""}
      </p>
      <p className="facts">{result.reason}</p>
      <p>
        intent <strong>{result.ir.intent}</strong>
      </p>
      {constraints.length > 0 && (
        <p className="facts">
          constraints{" "}
          {constraints
            .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
            .join(" · ")}
        </p>
      )}
      {result.ir.exclusions?.length ? <p className="facts">exclusions {result.ir.exclusions.join(", ")}</p> : null}
      {result.seekDraft && (
        <p className="facts">
          SEEK draft · {result.seekDraft.capability}
        </p>
      )}
      {result.find?.candidates?.length ? (
        <p className="facts">
          find preview{" "}
          {result.find.candidates
            .slice(0, 4)
            .map((c) => `${c.entity.name} (${c.entity.type})`)
            .join(" · ")}
        </p>
      ) : null}
      {onUseIntent && result.classification !== "NOT_WHOELSE" && (
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="btn btn-coral btn-sm" type="button" onClick={() => onUseIntent(result.ir.intent)}>
            Who else? with compiled intent
          </button>
        </div>
      )}
    </div>
  );
}
