import { analyze, cosine } from "./text.js";

export class TfidfIndex {
  private readonly df = new Map<string, number>();
  private readonly vectors = new Map<string, Map<string, number>>();
  private n = 0;

  add(id: string, text: string): void {
    const terms = analyze(text);
    const tf = new Map<string, number>();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    const existed = this.vectors.has(id);
    this.vectors.set(id, tf);
    if (!existed) {
      this.n += 1;
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
  }

  private weight(tf: Map<string, number>): Map<string, number> {
    const out = new Map<string, number>();
    const maxTf = Math.max(1, ...tf.values());
    for (const [term, raw] of tf) {
      const df = this.df.get(term) ?? 0;
      const idf = Math.log((1 + this.n) / (1 + df)) + 1;
      out.set(term, (0.5 + 0.5 * (raw / maxTf)) * idf);
    }
    return out;
  }

  query(text: string): Map<string, number> {
    const tf = new Map<string, number>();
    for (const t of analyze(text)) tf.set(t, (tf.get(t) ?? 0) + 1);
    return this.weight(tf);
  }

  similarity(id: string, queryVec: Map<string, number>): number {
    const tf = this.vectors.get(id);
    if (!tf) return 0;
    return cosine(this.weight(tf), queryVec);
  }

  topTerms(id: string, queryText: string, k = 6): string[] {
    const q = new Set(analyze(queryText));
    const tf = this.vectors.get(id);
    if (!tf) return [];
    return [...tf.keys()]
      .filter((t) => q.has(t) && t.includes(" "))
      .concat([...tf.keys()].filter((t) => q.has(t) && !t.includes(" ")))
      .slice(0, k);
  }
}
