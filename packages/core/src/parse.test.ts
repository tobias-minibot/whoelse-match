import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferConstraints,
  inferRoles,
  inferSide,
  inferVertical,
  parseAttributeConstraints,
  parseUniversal,
  wantsCheaper,
} from "./parse.js";

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

  it("infers jobs hire vs labor vs applicant without new tools", () => {
    assert.equal(inferSide("Who else is hiring AI people in Washington?"), "offer");
    assert.deepEqual(inferRoles("Who else is hiring AI people in Washington?"), ["opening", "employer"]);
    assert.equal(inferSide("Who else can do this work for under $5,000?"), "offer");
    assert.deepEqual(inferRoles("Who else can do this work for under $5,000?"), ["worker"]);
    assert.equal(inferSide("Who else is looking for a role like this?"), "seek");
    assert.deepEqual(inferRoles("Who else is looking for a role like this?"), ["applicant"]);
    assert.equal(inferVertical("Who else is hiring AI people in Washington?"), "jobs");
    assert.equal(inferVertical("Who else wants to build a network of voice assistants?"), "dating");
    assert.equal(inferVertical("Who else has a 1-bedroom apartment in DC?"), "apartment");
    assert.equal(inferVertical("Who else can give me a ride to the airport?"), "rides");
    assert.equal(inferVertical("Who else can fix a leak under my sink?"), "services");
    const hire = inferConstraints("Who else is hiring AI people in Washington?", cities);
    assert.notEqual(hire.type, "human");
    assert.equal(hire.side, "offer");
  });

  it("treats I-need-someone-who-can as labor, not a hire board", () => {
    const q = parseUniversal("I need someone who can redesign my website next week for under $2,000.", cities);
    assert.equal(q.side, "offer");
    assert.deepEqual(q.roles, ["worker"]);
    assert.notEqual(q.entityType, "human");
    assert.ok(q.hard.some((a) => a.key === "rate" && a.op === "lte" && Number(a.value) === 2000));
  });

  it("does not treat 'someone with my background' as a human-only type lock", () => {
    const c = inferConstraints("Who else needs someone with my background?", cities);
    assert.notEqual(c.type, "human");
    assert.equal(c.side, "seek");
  });

  it("parses two-week, immediate start, and rate instead of rent for gigs", () => {
    const attrs = parseAttributeConstraints(
      "Who else is available for a two-week coding project under $5,000 and can start immediately?",
      "offer",
    );
    assert.ok(attrs.some((a) => a.key === "durationWeeks" && a.value === 2));
    assert.ok(attrs.some((a) => a.key === "start" && a.value === "immediate"));
    assert.ok(attrs.some((a) => a.key === "rate" && a.op === "lte" && a.value === 5000));
  });

  it("emits a universal query with view as costume, not a second core", () => {
    const anything = parseUniversal("Who else can do this?", cities);
    assert.ok(anything.hard);
    assert.ok(anything.ranking);
    const dating = parseUniversal("Who else wants to build a network of voice assistants?", cities);
    assert.equal(dating.view, "dating");
    assert.equal(dating.side, undefined);
  });

  it("parses factory views as costumes, not new cores", () => {
    assert.equal(inferVertical("Who else has a cheaper equivalent 18V drill in stock?"), "products");
    assert.equal(inferVertical("Who else knows about this market?"), "experts");
    assert.equal(inferVertical("Who else invests and writes $250k checks?"), "capital");
    assert.equal(inferVertical("Who else has a room tonight in Berlin?"), "travel");
    assert.equal(inferVertical("Who else is attending a meetup from my city?"), "events");
    assert.equal(inferVertical("Who else can babysit tonight nearby?"), "childcare");
    assert.equal(inferVertical("Who else has complementary design and wants to join this project?"), "collab");
    assert.equal(inferVertical("Who else can host a GPU cheaper?"), "compute");
    assert.equal(inferVertical("Who else has a dataset that is the original source?"), "data");
    assert.equal(inferVertical("Who else sells nearby and is open now?"), "local");
    assert.equal(inferVertical("I need help understanding this market."), undefined);
    const capital = parseUniversal("Who else invests and writes $250k checks?");
    assert.ok(capital.hard.some((a) => a.key === "ticketSize" && a.value === 250000));
    const local = parseUniversal("Who else sells nearby and is open now?");
    assert.ok(local.hard.some((a) => a.key === "openNow"));
  });

  it("parses ride origin/destination and service license", () => {
    const ride = parseAttributeConstraints("Who else has a ride from Georgetown to Dupont?", "offer");
    assert.ok(ride.some((a) => a.key === "origin" && String(a.value).includes("Georgetown")));
    assert.ok(ride.some((a) => a.key === "destination" && String(a.value).includes("Dupont")));
    const svc = parseAttributeConstraints("Who else is a licensed plumber for an emergency leak?", "offer");
    assert.ok(svc.some((a) => a.key === "licensed" && a.op === "truthy"));
    assert.ok(svc.some((a) => a.key === "urgency" && a.value === "emergency"));
  });
});
