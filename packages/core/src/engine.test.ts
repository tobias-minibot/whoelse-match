import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WhoElseEngine } from "./engine.js";

const engine = WhoElseEngine.fromSeed();
const fromEntities = WhoElseEngine.fromEntities(engine.store.all());

describe("seed integrity", () => {
  it("has at least 20 synthetic humans and 10 labeled AIs", () => {
    const humans = engine.store.all().filter((e) => e.type === "human");
    const ais = engine.store.all().filter((e) => e.type === "ai");
    assert.ok(humans.length >= 20, `humans=${humans.length}`);
    assert.ok(ais.length >= 10, `ais=${ais.length}`);
    for (const h of humans) {
      assert.equal(h.provenance, "synthetic");
      assert.equal(h.attributes.synthetic, true);
      assert.equal(h.metadata.demo, true);
      assert.match(String(h.metadata.demoLabel), /synthetic/i);
    }
    for (const a of ais) {
      assert.ok(a.provenance === "ai_generated" || a.metadata.isAI === true);
      assert.match(String(a.metadata.aiDisclosure), /AI/i);
      assert.notEqual(a.type, "human");
    }
  });

  it("includes required AI personas", () => {
    const names = engine.store.all().filter((e) => e.type === "ai").map((e) => e.name);
    for (const need of ["Nova", "Socrates", "FounderBot"]) {
      assert.ok(names.includes(need), `missing ${need}`);
    }
  });

  it("fromEntities loads the same pool as fromSeed", () => {
    const again = WhoElseEngine.fromEntities(engine.store.all());
    assert.equal(again.store.all().length, engine.store.all().length);
    assert.ok(again.whoelse({ context: "Who else likes cycling?", limit: 1 }).candidates.length > 0);
  });

  it("seeds a labeled apartment vertical with listings and seekers", () => {
    const apts = engine.store.all().filter((e) => e.metadata.vertical === "apartment");
    assert.ok(apts.length >= 30, `apartment entities=${apts.length}`);
    const listings = apts.filter((e) => e.attributes.role === "listing");
    const seekers = apts.filter((e) => e.attributes.role === "seeker");
    assert.ok(listings.length >= 20, `listings=${listings.length}`);
    assert.ok(seekers.length >= 10, `seekers=${seekers.length}`);
    const cities = new Set(apts.map((e) => e.location?.city));
    assert.ok(cities.has("Washington") && cities.has("Berlin"));
    assert.ok(cities.size >= 3, `cities=${[...cities].join(",")}`);
    for (const e of apts) {
      assert.equal(e.provenance, "synthetic");
      assert.match(String(e.metadata.demoLabel), /DEMO|synthetic/i);
    }
  });

  it("gives every entity offers and seeks; type is open-ended", () => {
    for (const e of engine.store.all()) {
      assert.ok(e.offers.length > 0, `${e.id} missing offers`);
      assert.ok(e.seeks.length > 0, `${e.id} missing seeks`);
      assert.ok(e.trust?.status, `${e.id} missing trust stub`);
    }
    const types = new Set(engine.store.all().map((e) => e.type));
    assert.ok(types.has("human") && types.has("ai") && types.has("agent"));
    assert.ok(types.has("resource") && types.has("service") && types.has("company"));
  });

  it("gives every agent an invoke stub endpoint", () => {
    const agents = engine.store.all().filter((e) => e.type === "agent");
    assert.ok(agents.length >= 9, `agents=${agents.length}`);
    for (const a of agents) {
      assert.match(String(a.attributes.apiEndpoint), /\/api\/agents\/.+\/invoke/);
      assert.equal(a.attributes.mcpEndpoint, "/api/mcp");
      assert.ok(a.attributes.authRequirements);
    }
  });
});

describe("WHOELSE", () => {
  it("returns plausible voice-network matches in the first 5", () => {
    const result = engine.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    assert.equal(result.candidates.length, 5);
    const blob = result.candidates
      .map((c) => `${c.entity.name} ${c.entity.description} ${c.entity.capabilities.join(" ")}`)
      .join(" ")
      .toLowerCase();
    assert.match(blob, /voice/);
    assert.ok(result.candidates.some((c) => c.entity.type === "human"));
    assert.ok(result.candidates.some((c) => c.entity.type === "ai"));
    for (const c of result.candidates) {
      assert.ok(c.explanation.why.length > 0);
    }
  });

  it("keeps DC bike people near the top for a local ride query", () => {
    const result = engine.whoelse({
      context: "Who else near me is into mountain biking?",
      limit: 5,
    });
    const names = result.candidates.map((c) => c.entity.name);
    assert.ok(
      names.some((n) => /Jordan|Carmen|Trail/i.test(n)),
      `unexpected top names: ${names.join(", ")}`,
    );
    assert.equal(result.inferredConstraints.city, "Washington");
  });

  it("recursive more-like excludes the exemplar and stays in-cluster", () => {
    const sam = engine.store.all().find((e) => e.name === "Sam Okonkwo");
    assert.ok(sam);
    const result = engine.moreLike(sam.id, { limit: 5 });
    assert.ok(result.candidates.every((c) => c.entity.id !== sam.id));
    assert.notEqual(result.inferredConstraints.type, "ai");
    const names = result.candidates.map((c) => c.entity.name);
    assert.ok(
      names.some((n) => /Nia|Leo|Handoff|Open Voice|Founder|Sasha/i.test(n)),
      `unexpected more-like set: ${names.join(", ")}`,
    );
    assert.ok(result.candidates.some((c) => c.entity.type === "human"));
    assert.ok(
      names.filter((n) => /Jonah|Riley|Chris Adeyemi/i.test(n)).length === 0,
      `off-cluster leaked into more-like: ${names.join(", ")}`,
    );
  });

  it("honors an explicit AI-only request without treating 'agents' as a type lock", () => {
    const onlyAi = engine.whoelse({ context: "Who else is an AI that can help with voice assistants?", limit: 5 });
    assert.equal(onlyAi.inferredConstraints.type, "ai");
    assert.ok(onlyAi.candidates.every((c) => c.entity.type === "ai"));
    const mixed = engine.whoelse({ context: "Who else works on federated agents and voice assistants?", limit: 5 });
    assert.notEqual(mixed.inferredConstraints.type, "ai");
  });

  it("records less-like feedback and ranks that entity lower", () => {
    const isolated = WhoElseEngine.fromSeed();
    const first = isolated.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    const target = first.candidates[0].entity.id;
    isolated.feedback(target, "less", "Who else wants to build a network of voice assistants?");
    const again = isolated.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    const before = first.candidates.find((c) => c.entity.id === target)!.score;
    const after = again.candidates.find((c) => c.entity.id === target)?.score ?? -1;
    assert.ok(after < before);
  });
});

describe("same primitive, other verticals", () => {
  const cases: [string, RegExp][] = [
    ["Who else can summarize this PDF?", /Summarizer|pdf/i],
    ["Who else can browse the web?", /Browsewright|brows/i],
    ["Who else can translate German to English?", /Bridge|translat/i],
    ["Who else can verify this result?", /Checkmate|verif/i],
    ["Who else can run this task more cheaply?", /ThriftWorker|cheap/i],
    ["Who else can execute this workflow?", /Flowhand|workflow/i],
    ["Who else can take over if the primary agent fails?", /Understudy|failover/i],
    ["Who else exposes this capability?", /CapIndex|capability/i],
    ["Who else should I delegate to?", /Hand-off|delegat/i],
    ["Who else should I date?", /Riley|Harper|Theo|dinner/i],
    ["Who else should I meet?", /Sam|Nia|Nova|Jordan/i],
    ["Who else has an apartment?", /apartment|Adams/i],
    ["Who else can give me a ride?", /Ride|transport/i],
    ["Who else has a 1-bedroom apartment in DC under $2,500?", /Adams|Georgetown|Shaw|Petworth|1-bedroom/i],
    ["Who else has a furnished sublet in Berlin for three months?", /Mitte|Friedrichshain|Prenzlauer|sublet/i],
    ["Who else needs a furnished apartment in Berlin?", /Lena|Omar|Jonas/i],
    ["Who else is hiring AI people in Washington?", /Northwind|opening|AI engineer/i],
    ["Who else can do this work for under $5,000?", /Aisha|Cleo|Imani|BudgetCoder|Under-5k/i],
    ["Who else can give me a ride from Georgetown to Dupont?", /Georgetown|Dupont|Ride/i],
    ["Who else can fix a leak under my sink before the weekend?", /Leak|Plumber|Shaw/i],
  ];

  for (const [query, expect] of cases) {
    it(`ranks a plausible entity for: ${query}`, () => {
      const result = engine.whoelse({ context: query, limit: 5 });
      assert.ok(result.candidates.length > 0);
      const blob = result.candidates
        .map((c) => `${c.entity.type} ${c.entity.name} ${c.entity.offers.join(" ")} ${c.entity.description}`)
        .join(" ");
      assert.match(blob, expect, blob);
      assert.ok(result.byType);
    });
  }
});

describe("apartment offer / seek on the same operator", () => {
  it("filters 1-bedroom DC listings under $2500", () => {
    const result = engine.whoelse({
      context: "Who else has a 1-bedroom apartment in DC under $2,500?",
      limit: 8,
    });
    assert.equal(result.inferredConstraints.side, "offer");
    assert.equal(result.inferredConstraints.city, "Washington");
    assert.ok(result.candidates.length > 0);
    for (const c of result.candidates) {
      assert.notEqual(c.entity.attributes.role, "seeker");
      if (c.entity.attributes.role === "listing") {
        assert.equal(c.entity.attributes.bedrooms, 1);
        assert.ok(Number(c.entity.attributes.rent) <= 2500);
        assert.equal(c.entity.attributes.currency, "USD");
      }
    }
    const names = result.candidates.map((c) => c.entity.name).join(" ");
    assert.match(names, /Adams|Shaw|Petworth|Georgetown/i);
    assert.doesNotMatch(names, /Navy Yard/);
  });

  it("finds furnished Berlin sublets for three months", () => {
    const result = engine.whoelse({
      context: "Who else has a furnished sublet in Berlin for three months?",
      limit: 5,
    });
    assert.ok(result.candidates.some((c) => c.entity.attributes.listingKind === "sublet"));
    for (const c of result.candidates.filter((x) => x.entity.attributes.role === "listing")) {
      assert.equal(c.entity.location?.city, "Berlin");
      assert.equal(c.entity.attributes.furnished, true);
      assert.equal(c.entity.attributes.listingKind, "sublet");
    }
  });

  it("ranks Georgetown when asked for a place near Georgetown", () => {
    const result = engine.whoelse({
      context: "Who else has a place near Georgetown?",
      limit: 5,
    });
    assert.equal(result.inferredConstraints.neighborhood, "Georgetown");
    assert.ok(
      result.candidates.some((c) => c.entity.attributes.neighborhood === "Georgetown"),
      result.candidates.map((c) => c.entity.name).join(", "),
    );
  });

  it("keeps pet-friendly listings for accepts-pets", () => {
    const result = engine.whoelse({ context: "Who else accepts pets?", limit: 8 });
    assert.ok(result.candidates.length > 0);
    for (const c of result.candidates.filter((x) => x.entity.attributes.role === "listing")) {
      assert.equal(c.entity.attributes.pets, true);
    }
  });

  it("prefers listings available next month", () => {
    const result = engine.whoelse({
      context: "Who else has something available next month?",
      limit: 8,
    });
    assert.ok(result.candidates.length > 0);
    for (const c of result.candidates.filter((x) => x.entity.attributes.availableFrom)) {
      assert.ok(String(c.entity.attributes.availableFrom) <= "2026-10-31");
    }
  });

  it("reverse: who else needs a furnished apartment in Berlin", () => {
    const result = engine.whoelse({
      context: "Who else needs a furnished apartment in Berlin?",
      limit: 5,
    });
    assert.equal(result.inferredConstraints.side, "seek");
    assert.ok(result.candidates.every((c) => c.entity.attributes.role !== "listing"));
    const names = result.candidates.map((c) => c.entity.name).join(" ");
    assert.match(names, /Lena|Omar|Jonas/i);
  });

  it("reverse: good tenant for a Georgetown listing", () => {
    const listing = engine.store.get("resource-apt-dc-georgetown-1br");
    assert.ok(listing);
    const result = engine.whoelse({
      context: "Who else might be a good tenant for this listing?",
      entityId: listing.id,
      limit: 5,
    });
    assert.equal(result.inferredConstraints.side, "seek");
    assert.ok(result.candidates.every((c) => c.entity.id !== listing.id));
    assert.ok(result.candidates.some((c) => /Kai|Marcus|Nora|Priya/i.test(c.entity.name)));
  });

  it("exemplar cheaper stays in-cluster and under the asking rent", () => {
    const listing = engine.store.get("resource-apt-dc-georgetown-1br");
    assert.ok(listing);
    const result = engine.whoelse({
      context: "Who else has something like this apartment, but cheaper?",
      entityId: listing.id,
      limit: 5,
    });
    assert.ok(result.candidates.length > 0);
    for (const c of result.candidates.filter((x) => x.entity.attributes.role === "listing")) {
      assert.ok(Number(c.entity.attributes.rent) < Number(listing.attributes.rent));
    }
  });

  it("dating first-five is not flooded by apartment listings", () => {
    const result = engine.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    const apt = result.candidates.filter((c) => c.entity.metadata.vertical === "apartment");
    assert.ok(apt.length <= 1, `apartment leaked: ${result.candidates.map((c) => c.entity.name).join(", ")}`);
    assert.ok(result.candidates.some((c) => c.entity.type === "human" && c.entity.metadata.vertical !== "apartment"));
  });
});

describe("jobs on the same operator", () => {
  it("seeds 40+ labeled job/gig entities", () => {
    const jobs = engine.store.all().filter((e) => e.metadata.vertical === "jobs");
    assert.ok(jobs.length >= 40, `jobs=${jobs.length}`);
    const roles = new Set(jobs.map((e) => e.attributes.role));
    assert.ok(roles.has("employer") && roles.has("opening") && roles.has("worker") && roles.has("applicant"));
    assert.ok(jobs.some((e) => e.type === "company"));
    assert.ok(jobs.some((e) => e.type === "human"));
    assert.ok(jobs.some((e) => e.type === "agent"));
    assert.ok(jobs.some((e) => e.trust?.status === "evidence"));
  });

  it("hiring AI people in Washington returns openings/employers", () => {
    const result = engine.whoelse({
      context: "Who else is hiring AI people in Washington?",
      limit: 8,
    });
    assert.equal(result.inferredVertical, "jobs");
    assert.ok(result.inferredConstraints.roles?.includes("opening"));
    assert.ok(result.candidates.length > 0);
    for (const c of result.candidates) {
      const role = c.entity.attributes.role;
      assert.ok(role === "opening" || role === "employer", `${c.entity.name} role=${role}`);
    }
    const blob = result.candidates.map((c) => c.entity.name).join(" ");
    assert.match(blob, /Northwind|opening|Civic|Hybrid/i);
  });

  it("task vs job: human, company, and AI coexist for the same outcome", () => {
    const result = engine.whoelse({
      context: "Who else can do this work for under $5,000?",
      limit: 8,
    });
    assert.ok(result.candidates.every((c) => c.entity.attributes.role === "worker"));
    const types = new Set(result.candidates.map((c) => c.entity.type));
    assert.ok(types.has("human"), `types=${[...types]}`);
    assert.ok(
      types.has("agent") || types.has("company") || result.candidates.some((c) => c.entity.type === "agent"),
      `expected a machine or company in the labor pool: ${result.candidates.map((c) => `${c.entity.type}:${c.entity.name}`).join(", ")}`,
    );
    for (const c of result.candidates) {
      const rate = Number(c.entity.attributes.rate ?? c.entity.attributes.priceUsd ?? 0);
      if (rate) assert.ok(rate <= 5000, `${c.entity.name} rate=${rate}`);
    }
  });

  it("looking for a role returns applicants, not openings", () => {
    const result = engine.whoelse({
      context: "Who else is looking for a role like this?",
      limit: 5,
    });
    assert.equal(result.inferredConstraints.side, "seek");
    assert.ok(result.candidates.every((c) => c.entity.attributes.role !== "opening"));
    assert.ok(result.candidates.some((c) => c.entity.attributes.role === "applicant"));
  });

  it("done-this-before boosts evidence without becoming a reputation market", () => {
    const result = engine.whoelse({
      context: "Who else has done this exact kind of work before?",
      limit: 8,
    });
    assert.ok(result.candidates.some((c) => /Drew|Aisha/i.test(c.entity.name)));
    assert.ok(result.candidates.some((c) => c.entity.trust?.evidence?.outcomes?.length));
  });

  it("human or AI does not lock type=human", () => {
    const result = engine.whoelse({
      context: "Who else could do this job — human or AI?",
      limit: 8,
    });
    assert.notEqual(result.inferredConstraints.type, "human");
    const types = new Set(result.candidates.map((c) => c.entity.type));
    assert.ok(types.has("human"));
    assert.ok(types.has("agent") || types.has("ai"));
  });

  it("dating first-five is not flooded by job cards", () => {
    const result = engine.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    const jobs = result.candidates.filter((c) => c.entity.metadata.vertical === "jobs");
    assert.ok(jobs.length <= 1, `jobs leaked: ${result.candidates.map((c) => c.entity.name).join(", ")}`);
  });
});

describe("rides and services slices", () => {
  it("synthetic rides have origin, destination, seats, and changing state", () => {
    const rides = engine.store.all().filter((e) => e.metadata.vertical === "rides");
    assert.ok(rides.length >= 12, `rides=${rides.length}`);
    assert.ok(rides.some((e) => e.attributes.state === "open"));
    assert.ok(rides.some((e) => e.attributes.state === "full" || e.attributes.state === "completed"));
    assert.ok(rides.some((e) => e.attributes.role === "driver"));
    assert.ok(rides.some((e) => e.attributes.role === "passenger"));
  });

  it("ride query keeps open drivers and drops completed", () => {
    const result = engine.whoelse({
      context: "Who else can give me a ride from Georgetown to Dupont?",
      limit: 8,
    });
    assert.ok(result.candidates.length > 0);
    assert.ok(result.candidates.some((c) => /Georgetown|Dupont/i.test(c.entity.name + c.entity.description)));
    assert.ok(result.candidates.every((c) => c.entity.attributes.state !== "completed"));
  });

  it("licensed emergency plumber ranks for the leak-under-sink sentence", () => {
    const result = engine.whoelse({
      context: "Who else can fix a leak under my sink before the weekend, not too pricey?",
      limit: 5,
    });
    assert.ok(result.candidates.length > 0);
    const blob = result.candidates.map((c) => `${c.entity.name} ${c.entity.offers.join(" ")}`).join(" ");
    assert.match(blob, /plumb|leak|handyman/i);
    assert.ok(result.candidates.some((c) => c.entity.attributes.licensed === true));
  });
});
