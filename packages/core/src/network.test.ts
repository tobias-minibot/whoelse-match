import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WhoElseEngine } from "./engine.js";
import { inferVertical, parseUniversal } from "./parse.js";
import { publicationsOf } from "./publications.js";

const LENS_SMOKE: [string, RegExp][] = [
  ["Who else wants to build a network of voice assistants?", /Sam|Leo|Nia|voice/i],
  ["Who else should I date?", /Riley|Harper|Theo|dinner/i],
  ["Who else has a 1-bedroom apartment in DC under $2,500?", /Adams|Georgetown|Shaw|Petworth/i],
  ["Who else is hiring AI people in Washington?", /Northwind|opening|Civic/i],
  ["Who else can give me a ride from Georgetown to Dupont?", /Georgetown|Dupont|Ride/i],
  ["Who else can babysit tonight nearby?", /babysit|Priya|childcare/i],
];

describe("OFFER / SEEK as first-class network objects", () => {
  it("hydrates string bags into addressable publication records", () => {
    const engine = WhoElseEngine.fromSeed();
    const summarizer = engine.store.get("agent-pdf-summarizer");
    assert.ok(summarizer);
    const pubs = publicationsOf(summarizer);
    assert.ok(pubs.some((p) => p.kind === "offer" && /pdf|summar/i.test(p.capability)));
    assert.ok(pubs.every((p) => p.id && p.entityId === summarizer.id && p.created_at));
    assert.ok(engine.store.stats().offerRecords > 0);
    assert.ok(engine.store.stats().seekRecords > 0);
  });

  it("seeded InboxClerk SEEK matches Holdwright OFFER with no lens", () => {
    const engine = WhoElseEngine.fromSeed();
    const clerk = engine.store.get("agent-inbox-clerk");
    const hold = engine.store.get("agent-holdwright");
    assert.ok(clerk && hold);
    assert.ok(publicationsOf(clerk).some((p) => p.kind === "seek" && p.capability === "calendar hold resolution"));
    assert.ok(publicationsOf(hold).some((p) => p.kind === "offer" && p.capability === "calendar hold resolution"));

    const query = "Who else can do calendar hold resolution?";
    assert.equal(inferVertical(query), undefined);
    const parsed = parseUniversal(query);
    assert.equal(parsed.view, undefined);
    assert.ok(!parsed.roles?.length);

    const found = engine.whoelse({ context: query, requester: clerk.id, limit: 8 });
    assert.equal(found.inferredVertical, undefined);
    assert.ok(
      found.candidates.some((c) => c.entity.id === hold.id),
      found.candidates.map((c) => c.entity.name).join(", "),
    );
    const hit = found.candidates.find((c) => c.entity.id === hold.id);
    assert.ok(hit?.matched?.offer?.capability === "calendar hold resolution");
  });

  it("register + publish is idempotent and findable without a vertical", () => {
    const isolated = WhoElseEngine.fromSeed();
    const a = isolated.register({
      id: "agent-reg-seek-demo",
      name: "Needwright",
      description: "Test agent that only seeks a capability.",
      seeks: [{ capability: "ics conflict resolution", phrases: ["resolve ics conflicts"] }],
    });
    assert.equal(a.id, "agent-reg-seek-demo");
    assert.ok(a.seeks.some((s) => /ics conflict/i.test(s)));
    assert.ok(publicationsOf(a).some((p) => p.kind === "seek" && p.capability === "ics conflict resolution"));

    const b = isolated.register({
      id: "agent-reg-offer-demo",
      name: "Conflictwright",
      description: "Test agent that offers ics conflict resolution.",
      offers: [{ capability: "ics conflict resolution", phrases: ["resolve ics conflicts"] }],
    });
    const again = isolated.register({
      id: "agent-reg-offer-demo",
      name: "Conflictwright",
      description: "Updated copy. Still the same offer.",
      offers: [{ capability: "ics conflict resolution", phrases: ["resolve ics conflicts", "calendar ics repair"] }],
    });
    assert.equal(again.id, b.id);
    assert.equal(isolated.store.all().filter((e) => e.id === b.id).length, 1);
    assert.ok(publicationsOf(again).some((p) => /calendar ics repair/i.test(p.phrases?.join(" ") ?? "")));

    isolated.publish(a.id, [{ kind: "seek", capability: "ics conflict resolution", phrases: ["need ics repair"] }]);
    const found = isolated.whoelse({
      context: "Who else can do ics conflict resolution?",
      requester: a.id,
      limit: 8,
    });
    assert.equal(found.inferredVertical, undefined);
    assert.ok(
      found.candidates.some((c) => c.entity.id === b.id),
      found.candidates.map((c) => `${c.entity.id}:${c.entity.name}`).join(", "),
    );
  });

  it("invoke writes a receipt the same way delegate does", () => {
    const isolated = WhoElseEngine.fromSeed();
    const invoked = isolated.invoke("agent-holdwright", { task: "place a Tuesday hold" });
    assert.equal(invoked.ok, true);
    assert.ok(invoked.receipt?.id);
    assert.equal(invoked.receipt?.toAgentId, "agent-holdwright");
    assert.ok(isolated.store.receipts.some((r) => r.id === invoked.receipt.id));
  });

  it("delegate from InboxClerk to Holdwright still writes a receipt", () => {
    const isolated = WhoElseEngine.fromSeed();
    const delegated = isolated.delegate({
      from: "agent-inbox-clerk",
      task: "Resolve the Tuesday 3pm hold on Maya's calendar",
      intent: "Who else can do calendar hold resolution?",
      select: "first",
    });
    assert.equal(delegated.ok, true);
    assert.equal(delegated.selected?.entity.id, "agent-holdwright");
    assert.ok(delegated.receipt?.id);
    assert.equal(delegated.receipt?.toAgentId, "agent-holdwright");
    assert.ok(delegated.match?.status === "invoked" || delegated.match?.status === "verified");
  });

  it("existing lenses still return in-cluster first-five", () => {
    const engine = WhoElseEngine.fromSeed();
    for (const [query, expect] of LENS_SMOKE) {
      const result = engine.whoelse({ context: query, limit: 5 });
      assert.ok(result.candidates.length > 0, query);
      const blob = result.candidates.map((c) => `${c.entity.name} ${c.entity.offers.join(" ")}`).join(" ");
      assert.match(blob, expect, `${query} → ${blob}`);
    }
  });
});
