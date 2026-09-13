import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WhoElseEngine } from "./engine.js";
import { inferVertical, parseUniversal } from "./parse.js";

const engine = WhoElseEngine.fromSeed();

const VIEWS = [
  "products",
  "experts",
  "capital",
  "travel",
  "events",
  "childcare",
  "collab",
  "compute",
  "data",
  "local",
] as const;

describe("marketplace factory — same operator", () => {
  it("seeds thin proofs for ten factory views without new types-as-engines", () => {
    for (const view of VIEWS) {
      const rows = engine.store.all().filter((e) => e.metadata.vertical === view);
      assert.ok(rows.length >= 5, `${view} n=${rows.length}`);
    }
    const types = new Set(engine.store.all().map((e) => e.type));
    assert.ok(types.has("product"));
    assert.ok(types.has("dataset"));
    assert.ok(types.has("community"));
    const src = Object.getOwnPropertyNames(WhoElseEngine.prototype).join(" ");
    assert.doesNotMatch(src, /productsEngine|expertsEngine|travelEngine|capitalEngine/);
  });

  it("products: in-stock cheaper equivalent drill", () => {
    const q = parseUniversal("Who else has a cheaper equivalent 18V drill?");
    assert.equal(q.view, "products");
    assert.ok(q.hard.some((a) => a.key === "kind" && a.value === "drill"));
    const result = engine.whoelse({
      context: "Who else has a cheaper equivalent 18V drill in stock?",
      limit: 8,
    });
    assert.ok(result.candidates.length > 0);
    assert.ok(result.candidates.some((c) => /Brushless|Harbor|PriceHop|Hardware/i.test(c.entity.name)));
    assert.ok(result.candidates.every((c) => c.entity.attributes.inStock !== false));
  });

  it("experts: knows about this market — human and AI", () => {
    assert.equal(inferVertical("Who else knows about this market?"), "experts");
    const result = engine.whoelse({ context: "Who else knows about this market?", limit: 8 });
    const types = new Set(result.candidates.map((c) => c.entity.type));
    assert.ok(types.has("human"), `types=${[...types]}`);
    assert.ok(types.has("ai") || types.has("company"), `types=${[...types]}`);
    assert.ok(result.candidates.some((c) => /Mira|MarketSocrates|Owen|Civic/i.test(c.entity.name)));
  });

  it("capital: $250k checks find investors, not openings", () => {
    const q = parseUniversal("Who else invests and writes $250k checks?");
    assert.equal(q.view, "capital");
    assert.deepEqual(q.roles, ["investor"]);
    assert.ok(q.hard.some((a) => a.key === "ticketSize" && Number(a.value) === 250000));
    const result = engine.whoelse({ context: "Who else invests and writes $250k checks?", limit: 8 });
    assert.ok(result.candidates.length > 0);
    assert.ok(result.candidates.every((c) => c.entity.attributes.role === "investor"));
    assert.ok(result.candidates.some((c) => /Pat|Anacostia/i.test(c.entity.name)));
  });

  it("travel reuses listing/seeker — room tonight in Berlin", () => {
    const q = parseUniversal("Who else has a room tonight in Berlin?");
    assert.equal(q.view, "travel");
    assert.deepEqual(q.roles, ["listing"]);
    const result = engine.whoelse({ context: "Who else has a room tonight in Berlin?", limit: 8 });
    assert.ok(result.candidates.length > 0);
    assert.ok(result.candidates.some((c) => /Mitte|Kreuzberg|Alexanderplatz|Berlin/i.test(c.entity.name)));
    assert.ok(result.candidates.every((c) => c.entity.attributes.role === "listing"));
  });

  it("travel reciprocal is the same SEEK↔OFFER as Georgetown apartments", () => {
    const result = engine.reciprocal("stay-berlin-tonight", { limit: 5 });
    assert.equal(result.inferredConstraints.side, "seek");
    assert.ok(result.candidates.some((c) => /Going to Berlin|Sam is going/i.test(c.entity.name)));
  });

  it("events: attending from my city", () => {
    const result = engine.whoelse({ context: "Who else is attending a meetup from my city?", limit: 8 });
    assert.equal(result.inferredView, "events");
    assert.ok(result.candidates.some((c) => /Riley|Nico|Builders/i.test(c.entity.name)));
  });

  it("childcare: babysit tonight + evidence contrast", () => {
    const result = engine.whoelse({ context: "Who else can babysit tonight nearby?", limit: 8 });
    assert.equal(result.inferredView, "childcare");
    assert.ok(result.candidates.some((c) => /Priya|Jordan|Cash-only/i.test(c.entity.name)));
    assert.ok(result.candidates.some((c) => c.entity.trust?.evidence?.verified));
  });

  it("collab: complementary design/write without a team engine", () => {
    const result = engine.whoelse({
      context: "Who else has complementary design and wants to join this project?",
      limit: 8,
    });
    assert.equal(result.inferredView, "collab");
    assert.ok(result.candidates.some((c) => /Cleo|Bo|Pax|Zine|CollabMuse/i.test(c.entity.name)));
  });

  it("compute: cheaper GPU host with capacity/state", () => {
    const result = engine.whoelse({ context: "Who else can host a GPU cheaper?", limit: 8 });
    assert.equal(result.inferredView, "compute");
    assert.ok(result.candidates.some((c) => c.entity.attributes.gpu === true));
    assert.ok(result.candidates.some((c) => /Thrift|Dupont|LaneRouter/i.test(c.entity.name)));
  });

  it("data: original source / verify this claim", () => {
    const result = engine.whoelse({ context: "Who else has a dataset that is the original source?", limit: 8 });
    assert.equal(result.inferredView, "data");
    assert.ok(result.candidates.some((c) => c.entity.type === "dataset" || /Claim Ledger|Civic Facts/i.test(c.entity.name)));
  });

  it("local: open now + deliver today", () => {
    const result = engine.whoelse({ context: "Who else sells nearby and is open now?", limit: 8 });
    assert.equal(result.inferredView, "local");
    assert.ok(result.candidates.some((c) => c.entity.attributes.openNow === true));
    assert.ok(result.candidates.every((c) => c.entity.attributes.openNow !== false));
  });

  it("meta: understanding this market returns mixed entity types — vertical is optional", () => {
    const q = parseUniversal("I need help understanding this market.");
    assert.equal(q.view, undefined);
    assert.notEqual(q.entityType, "human");
    const result = engine.whoelse({ context: "I need help understanding this market.", limit: 10 });
    const types = new Set(result.candidates.map((c) => c.entity.type));
    assert.ok(result.candidates.length >= 4, `n=${result.candidates.length}`);
    assert.ok(types.has("human"), `types=${[...types]}`);
    assert.ok(types.has("ai") || types.has("agent"), `types=${[...types]}`);
    assert.ok(types.has("company") || types.has("community"), `types=${[...types]}`);
    assert.ok(types.has("dataset") || types.has("resource"), `types=${[...types]}`);
    const blob = result.candidates.map((c) => `${c.entity.type}:${c.entity.name}`).join(" | ");
    assert.match(blob, /Mira|MarketSocrates|dataset|report|Watchers|Civic/i);
  });

  it("does not flood dating first-five with factory cards", () => {
    const result = engine.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    const factory = result.candidates.filter((c) =>
      VIEWS.includes(c.entity.metadata.vertical as (typeof VIEWS)[number]),
    );
    assert.ok(factory.length <= 1, `leaked: ${result.candidates.map((c) => c.entity.name).join(", ")}`);
  });

  it("does not steal apartment 1-bedroom to travel", () => {
    const q = parseUniversal("Who else has a 1-bedroom apartment in DC under $2,500?");
    assert.equal(q.view, "apartment");
  });
});
