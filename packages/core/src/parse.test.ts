import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferConstraints, inferSide, parseAttributeConstraints, wantsCheaper } from "./parse.js";

const cities = ["Washington", "Berlin", "New York", "Lisbon"];
const places = [
  { neighborhood: "Georgetown", city: "Washington", region: "DC" },
  { neighborhood: "Mitte", city: "Berlin", region: "BE" },
];

describe("generic constraint parsing", () => {
  it("treats who-else-has as offer side and who-else-needs as seek side", () => {
    assert.equal(inferSide("Who else has a 1-bedroom apartment in DC?"), "offer");
    assert.equal(inferSide("Who else needs a furnished apartment in Berlin?"), "seek");
    assert.equal(inferSide("Who else might be a good tenant for this listing?"), "seek");
    assert.equal(inferSide("I have a furnished 1-bedroom in Georgetown"), "seek");
  });

  it("parses price, bedrooms, pets, furnished without apartment-only types", () => {
    const attrs = parseAttributeConstraints(
      "Who else has a 1-bedroom apartment in DC under $2,500?",
      "offer",
    );
    assert.ok(attrs.some((a) => a.key === "bedrooms" && a.value === 1));
    assert.ok(attrs.some((a) => a.key === "rent" && a.op === "lte" && a.value === 2500));
    assert.ok(attrs.some((a) => a.key === "currency" && a.value === "USD"));
  });

  it("parses euro furnished sublet for three months", () => {
    const c = inferConstraints(
      "Who else has a furnished sublet in Berlin for three months under €2000?",
      cities,
      undefined,
      places,
    );
    assert.equal(c.side, "offer");
    assert.equal(c.city, "Berlin");
    assert.ok(c.attributes?.some((a) => a.key === "furnished" && a.op === "truthy"));
    assert.ok(c.attributes?.some((a) => a.key === "listingKind" && a.value === "sublet"));
    assert.ok(c.attributes?.some((a) => a.key === "durationMonths" && a.value === 3));
    assert.ok(c.attributes?.some((a) => a.key === "rent" && a.op === "lte" && a.value === 2000));
  });

  it("maps near Georgetown to neighborhood + DC", () => {
    const c = inferConstraints("Who else has a place near Georgetown?", cities, undefined, places);
    assert.equal(c.neighborhood, "Georgetown");
    assert.equal(c.city, "Washington");
    assert.equal(c.side, "offer");
  });

  it("marks cheaper queries", () => {
    assert.equal(wantsCheaper("Who else has something like this apartment, but cheaper?"), true);
  });

  it("does not lock dating queries to a housing side", () => {
    const c = inferConstraints("Who else wants to build a network of voice assistants?", cities);
    assert.equal(c.side, undefined);
    assert.equal(c.attributes, undefined);
  });
});
