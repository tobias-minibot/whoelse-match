import { offersOf, seeksOf } from "./store.js";
import type { Entity, TrustArtifact, TrustEvidence } from "./types.js";

/** Composable artifacts — not one magical trust score. */
export function explainTrust(entity: Entity): TrustArtifact[] {
  const out: TrustArtifact[] = [];
  const ev = entity.trust?.evidence;
  if (entity.metadata?.aiDisclosure) {
    out.push({
      kind: "disclosure",
      label: "Labeled machine",
      detail: String(entity.metadata.aiDisclosure),
    });
  }
  if (entity.metadata?.demoLabel) {
    out.push({
      kind: "disclosure",
      label: "Demo disclosure",
      detail: String(entity.metadata.demoLabel),
    });
  }
  if (ev?.verified) {
    out.push({
      kind: "verified",
      label: ev.verifiedBy ? `Verified by ${ev.verifiedBy}` : "Verified stub",
      detail: "Verification is a field, not a verifier network.",
    });
  }
  for (const href of ev?.portfolio ?? []) {
    out.push({ kind: "portfolio", label: "Portfolio", href, detail: href });
  }
  for (const outcome of ev?.outcomes ?? []) {
    out.push({
      kind: "outcome",
      label: outcome.label,
      detail: outcome.result ?? "past-outcome stub",
    });
  }
  for (const license of ev?.licenses ?? []) {
    out.push({ kind: "license", label: "License", detail: license });
  }
  for (const ref of ev?.references ?? []) {
    out.push({ kind: "reference", label: "Reference", detail: ref });
  }
  for (const receipt of ev?.receipts ?? []) {
    out.push({ kind: "receipt", label: "Receipt", detail: receipt });
  }
  if (entity.attributes?.licensed === true && !ev?.licenses?.length) {
    out.push({ kind: "license", label: "Licensed (attribute stub)", detail: String(entity.attributes.trade ?? "licensed") });
  }
  if (!out.length) {
    out.push({
      kind: "disclosure",
      label: "Unscored",
      detail: `${entity.name} has no attached evidence. Trust is not a score.`,
    });
  }
  return out;
}

export function evidenceFromArtifacts(artifacts: TrustArtifact[]): TrustEvidence {
  const evidence: TrustEvidence = {};
  for (const a of artifacts) {
    if (a.kind === "verified") evidence.verified = true;
    if (a.kind === "portfolio" && a.href) (evidence.portfolio ??= []).push(a.href);
    if (a.kind === "outcome") (evidence.outcomes ??= []).push({ label: a.label, result: a.detail });
    if (a.kind === "license" && a.detail) (evidence.licenses ??= []).push(a.detail);
    if (a.kind === "reference" && a.detail) (evidence.references ??= []).push(a.detail);
    if (a.kind === "receipt" && a.detail) (evidence.receipts ??= []).push(a.detail);
  }
  return evidence;
}

export function trustHeadline(entity: Entity): string {
  const artifacts = explainTrust(entity).filter((a) => a.kind !== "disclosure");
  if (!artifacts.length) return "No evidence attached — not a reputation score.";
  return artifacts.map((a) => a.label).slice(0, 3).join(" · ");
}

export function complementHint(entity: Entity): { has: string; needs: string } {
  const has = offersOf(entity)[0] ?? entity.name;
  const needs = seeksOf(entity)[0] ?? "a complement";
  return { has, needs };
}
