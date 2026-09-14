export type CoverageClass = "A" | "B" | "C" | "D" | "E";

export type CatalogIntent = {
  n: number;
  id: string;
  label: string;
  subgroup: string;
  routing: string;
  status: string;
  deep: number;
  slots: string[];
  source: string;
  kind?: string;
  alias_of?: string;
};

export type CompileSnapshot = {
  classification: string;
  reason: string;
  confidence: number;
  locked: boolean;
  intent: string;
  capability?: string;
  constraints: Record<string, unknown>;
};

export type ExpectedIR = {
  side: "offer" | "seek";
  capability: string;
  entityType?: string;
  roles?: string[];
  constraints: Record<string, unknown>;
  notes: string;
};

export type CoverageRow = {
  n: number;
  id: string;
  label: string;
  subgroup: string;
  routing: string;
  catalogStatus: string;
  source: string;
  attested: boolean;
  deep: boolean;
  slots: string[];
  aliasOf?: string;
  duplicateLabel: boolean;
  class: CoverageClass;
  reason: string;
  extension?: string;
  canonicalQuery: string;
  paraphrases: string[];
  expectedIr: ExpectedIR;
  compile?: CompileSnapshot;
};

export type CoverageSummary = {
  generatedAt: string;
  denominator: {
    catalog: string;
    count: 505;
    attested: number;
    reconstructed: number;
    uniqueLabels: number;
    duplicateLabelExtraRows: number;
    idSkip: string[];
    idRange: string;
    note: string;
  };
  counts: Record<CoverageClass, number>;
  effectiveCoverage: {
    numerator: number;
    denominator: 505;
    percent: number;
    formula: "A+B / 505";
  };
  uiLenses: string[];
  extensions: { extension: string; intents: number; ids: string[] }[];
  deprecations: { id: string; label: string; aliasOf?: string; reason: string }[];
  samples: { a: { id: string; reason: string }[]; d: { id: string; reason: string }[] };
};
