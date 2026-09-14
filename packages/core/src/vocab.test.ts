import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compileLanguage } from "./compile.js";
import { parseCompound } from "./compound.js";
import { matchVocabLabels, searchVocab } from "./vocab.js";
import { refineWhoElseQuery, searchIntents } from "./vocab-search.js";

describe("intent search / typeahead", () => {
  it("finds tennis, visa, kindergarten, and pdf from natural fragments", () => {
    const tennis = searchVocab("tennis");
    assert.ok(tennis.some((h) => h.label === "TENNIS"), tennis.map((h) => h.label).join(","));

    const visa = searchVocab("visa");
    assert.ok(visa.some((h) => h.label === "IMMIGRATION"), visa.map((h) => h.label).join(","));

    const kinder = searchVocab("kindergarten");
    assert.ok(kinder.some((h) => h.label === "PRESCHOOL"), kinder.map((h) => h.label).join(","));

    const pdf = searchVocab("pdf");
    assert.ok(pdf.some((h) => h.label === "PDF SUMMARIZER"), pdf.map((h) => h.label).join(","));
  });

  it("matches category terms and coverage class letters", () => {
    const legal = searchVocab("legal");
    assert.ok(
      legal.some((h) => h.category.toUpperCase().includes("LEGAL")),
      legal.map((h) => `${h.label}:${h.category}`).join(","),
    );
    const classA = searchVocab("A", { minLength: 1 });
    assert.ok(classA.some((h) => h.coverage === "A"));
  });

  it("refines a short search into a Who else? question and appends onto an existing one", () => {
    const tennis = searchVocab("tennis")[0];
    assert.ok(tennis);
    const q = refineWhoElseQuery("tennis", tennis);
    assert.match(q, /who else/i);
    assert.match(q, /tennis/i);
    const date = searchVocab("date")[0];
    assert.ok(date);
    const compound = refineWhoElseQuery(q, date);
    assert.match(compound, /tennis/i);
    assert.match(compound, /date/i);
  });

  it("does not treat the catalog as 451 apps — unique labels only", () => {
    const hits = searchVocab("lawyer", { limit: 20 });
    const lawyers = hits.filter((h) => h.label === "LAWYER");
    assert.equal(lawyers.length, 1, lawyers.map((h) => h.id).join(","));
  });

  it("searchIntents works on a client-shaped catalog without fs", () => {
    const hits = searchIntents(
      [
        {
          id: "i048-tennis",
          label: "TENNIS",
          category: "FITNESS & SPORT",
          coverage: "A",
          question: "Who else wants to play tennis?",
        },
      ],
      "tennis",
    );
    assert.equal(hits[0]?.label, "TENNIS");
  });
});

describe("compile recall on paraphrases", () => {
  it("reaches obscure intents from natural phrases, not only Source Labels", () => {
    const pdf = matchVocabLabels("Who else can summarize this PDF?");
    assert.ok(pdf.some((h) => h.label === "PDF SUMMARIZER"), pdf.map((h) => h.label).join(","));

    const kinder = matchVocabLabels("Find me a kindergarten near me");
    assert.ok(kinder.some((h) => h.label === "PRESCHOOL"), kinder.map((h) => h.label).join(","));

    const visa = matchVocabLabels("Who else can help with a visa?");
    assert.ok(visa.some((h) => h.label === "IMMIGRATION"), visa.map((h) => h.label).join(","));

    const looking = compileLanguage("Looking for a kindergarten");
    assert.ok(looking.ir.intents.some((i) => i.label === "PRESCHOOL"));
    assert.ok(looking.vocabHits?.some((h) => h.label === "PRESCHOOL"));
  });

  it("keeps DATE ∩ TENNIS and APARTMENT constrained by SCHOOL", () => {
    const tennis = parseCompound("Find me someone nearby I might like who wants to play tennis tonight.");
    const labels = tennis.intents.map((i) => i.label);
    assert.ok(labels.includes("DATE") && labels.includes("TENNIS"), labels.join(","));
    assert.ok(tennis.relations.some((e) => e.kind === "intersect"));

    const apt = parseCompound("Find me an apartment near a good school in DC.");
    const aptLabels = apt.intents.map((i) => i.label);
    assert.ok(aptLabels.includes("APARTMENT") && aptLabels.includes("SCHOOL"), aptLabels.join(","));
    assert.ok(apt.relations.some((e) => e.kind === "constrains"));
  });

  it("does not force greetings into a find even if vocab search is empty-ish", () => {
    assert.equal(compileLanguage("Hello").classification, "NOT_WHOELSE");
    assert.equal(compileLanguage("What's the weather in Berlin?").classification, "NOT_WHOELSE");
  });
});
