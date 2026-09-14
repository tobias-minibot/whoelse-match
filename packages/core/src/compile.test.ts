import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WhoElseEngine } from "./engine.js";
import {
  LOCKED_COMPILE_EXAMPLES,
  compileAsync,
  compileLanguage,
} from "./compile.js";

describe("whoelse.compile / Sentinel v0", () => {
  it("classifies Tobias locked examples without OpenAI", () => {
    for (const { text, expected } of LOCKED_COMPILE_EXAMPLES) {
      const result = compileLanguage(text);
      assert.equal(result.classification, expected, `${text} → ${result.classification} (${result.reason})`);
      assert.equal(result.locked, true);
      assert.equal(result.usedLlm, false);
      if (expected === "NOT_WHOELSE") {
        assert.equal(result.seekDraft, undefined);
      } else {
        assert.ok(result.seekDraft?.capability, text);
        assert.equal(result.seekDraft?.kind, "seek");
        assert.ok(result.ir.intent.toLowerCase().includes("who") || result.ir.intent.length > 0);
      }
    }
  });

  it("does not force chitchat or weather into a find", () => {
    assert.equal(compileLanguage("thanks!").classification, "NOT_WHOELSE");
    assert.equal(compileLanguage("What's the weather in Berlin?").classification, "NOT_WHOELSE");
    assert.equal(compileLanguage("").classification, "NOT_WHOELSE");
  });

  it("emits IR constraints for a priced apartment sentence", () => {
    const result = compileLanguage("Who else has a 1-bedroom in DC under $2,500?");
    assert.equal(result.classification, "WHOELSE_COMPILABLE");
    assert.ok(result.ir.constraints.city === "Washington" || result.ir.constraints.region === "DC");
    assert.ok(result.ir.constraints.attributes?.some((a) => a.key === "bedrooms" || a.key === "rent" || a.key === "budget"));
  });

  it("optional find uses the same engine, not a second matcher", async () => {
    const engine = WhoElseEngine.fromSeed();
    const result = await compileAsync("Who else can summarize this PDF?", engine, { find: true, limit: 3 });
    assert.equal(result.classification, "WHOELSE_COMPILABLE");
    assert.ok(result.find);
    assert.ok(result.find!.candidates.some((c) => /Summarizer|pdf/i.test(c.entity.name + c.entity.id)));
    const src = Object.getOwnPropertyNames(WhoElseEngine.prototype).join(" ");
    assert.doesNotMatch(src, /compileEngine|sentinelEngine/);
  });

  it("partial tax sentence drafts a SEEK but does not claim to file", async () => {
    const result = compileLanguage("I want to file my taxes!");
    assert.equal(result.classification, "PARTIALLY_COMPILABLE");
    assert.match(result.reason, /cannot file/i);
    assert.ok(result.seekDraft?.capability);
  });
});
