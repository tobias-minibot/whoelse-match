export type Vertical =
  | "dating"
  | "apartment"
  | "jobs"
  | "rides"
  | "services"
  | "products"
  | "experts"
  | "capital"
  | "travel"
  | "events"
  | "childcare"
  | "collab"
  | "compute"
  | "data"
  | "local";

export type MarketSide = "seek" | "offer";

export type Lens = {
  id: Vertical;
  label: string;
  hasSides: boolean;
  mixed: boolean;
  offerRoles: string[];
  seekRoles: string[];
  examplesSeek: string[];
  examplesOffer: string[];
  banner: string;
};

export const LENSES: Lens[] = [
  {
    id: "dating",
    label: "Dating",
    hasSides: false,
    mixed: false,
    offerRoles: [],
    seekRoles: [],
    examplesSeek: [
      "Who else wants to build a network of voice assistants?",
      "Who else near me is into mountain biking?",
      "Who else works on real estate projects in DC right now?",
      "Who else wants a low-key dinner and a walk, not an app marathon?",
      "Who else is a founder looking for a thought partner?",
    ],
    examplesOffer: [],
    banner:
      "Demo pool only. Every human is synthetic. Every AI is labeled AI — never a stand-in person. No real dating sites were used. WhoElse is for humans and machines.",
  },
  {
    id: "apartment",
    label: "Apt",
    hasSides: true,
    mixed: false,
    offerRoles: ["listing"],
    seekRoles: ["seeker"],
    examplesSeek: [
      "Who else has a 1-bedroom apartment in DC under $2,500?",
      "Who else has a furnished sublet in Berlin for three months?",
      "Who else has a place near Georgetown?",
      "Who else accepts pets?",
      "Who else has something available next month?",
    ],
    examplesOffer: [
      "I have a furnished 1-bedroom in Georgetown for $2,200 that allows pets",
      "Who else needs a furnished apartment in Berlin?",
      "Who else is looking for exactly the apartment I have?",
      "Who else might be a good tenant for this listing?",
      "Who else is looking for a 2-bedroom in DC?",
    ],
    banner:
      "DEMO data. Every apartment listing and seeker is synthetic — not a real home, not a real person, not scraped. Same WhoElse engine. Same whoelse.find.",
  },
  {
    id: "jobs",
    label: "Jobs",
    hasSides: true,
    mixed: true,
    offerRoles: ["opening", "employer", "worker"],
    seekRoles: ["applicant"],
    examplesSeek: [
      "Who else is hiring AI people in Washington?",
      "Who else needs someone with my background?",
      "Who else is available for a two-week coding project?",
      "Who else can do this work for under $5,000?",
      "Who else could do this job — human or AI?",
    ],
    examplesOffer: [
      "I have AI engineering experience and can start immediately",
      "Who else is looking for a role like this?",
      "Who else should I recruit?",
      "Who else has done this exact kind of work before?",
      "Who else is a better fit but less obvious?",
    ],
    banner:
      "DEMO data. Employers, openings, freelancers, and AI workers are synthetic. Trust is evidence stubs (portfolio / outcomes / verified), not a reputation market. Same whoelse.find — never jobs.find.",
  },
  {
    id: "rides",
    label: "Rides",
    hasSides: true,
    mixed: false,
    offerRoles: ["driver"],
    seekRoles: ["passenger"],
    examplesSeek: [
      "Who else can give me a ride from Georgetown to Dupont?",
      "Who else can give me a ride to the airport?",
      "Who else has seats to Moab Saturday?",
      "Who else can give me a ride?",
    ],
    examplesOffer: [
      "I have 3 seats from Georgetown to Dupont Saturday",
      "Who else needs a ride to the airport?",
      "Who else needs a seat to Moab Saturday?",
    ],
    banner: "DEMO data. Synthetic rides with origin, destination, seats, and changing state. Not real drivers. Same whoelse.find.",
  },
  {
    id: "services",
    label: "Services",
    hasSides: true,
    mixed: false,
    offerRoles: ["provider"],
    seekRoles: ["client"],
    examplesSeek: [
      "Who else can fix a leak under my sink before the weekend?",
      "Who else is a licensed plumber near me?",
      "Who else can do emergency handyman work in DC?",
    ],
    examplesOffer: [
      "I am a licensed plumber available tonight",
      "Who else needs a licensed plumber?",
      "Who else needs a handyman before the weekend?",
    ],
    banner: "DEMO data. Synthetic plumbers and handypeople. Licensing is a stub field, not a credential. Same whoelse.find.",
  },
  {
    id: "products",
    label: "Products",
    hasSides: true,
    mixed: true,
    offerRoles: ["seller"],
    seekRoles: ["buyer"],
    examplesSeek: [
      "Who else sells this drill in stock?",
      "Who else has a cheaper equivalent 18V drill?",
      "Who else has this product in stock under $40?",
    ],
    examplesOffer: [
      "I have an 18V drill in stock for $40",
      "Who else needs a cheaper equivalent drill?",
    ],
    banner:
      "DEMO data. Product identity, substitution, and inventory are attributes — not a shop. Same whoelse.find. Never products.find.",
  },
  {
    id: "experts",
    label: "Experts",
    hasSides: true,
    mixed: true,
    offerRoles: ["expert"],
    seekRoles: ["asker"],
    examplesSeek: [
      "Who else knows about this market?",
      "Who else is a notary near me?",
      "Who else disagrees?",
    ],
    examplesOffer: [
      "I know about this market — who else needs a briefing?",
      "Who else wants to ask an expert?",
    ],
    banner:
      "DEMO data. Expertise is offers + evidence (license / portfolio), not a guru score. Humans and AIs stay labeled. Same whoelse.find.",
  },
  {
    id: "capital",
    label: "Capital",
    hasSides: true,
    mixed: true,
    offerRoles: ["investor"],
    seekRoles: ["founder"],
    examplesSeek: [
      "Who else invests and writes $250k checks?",
      "Who else has capital for a seed round in DC?",
    ],
    examplesOffer: [
      "I am raising — who else writes $250k checks?",
      "Who else needs an introduction to an investor?",
    ],
    banner: "DEMO data. Ticket size, stage, and geo are attributes. Not a fund. Same whoelse.find.",
  },
  {
    id: "travel",
    label: "Travel",
    hasSides: true,
    mixed: false,
    offerRoles: ["listing"],
    seekRoles: ["seeker"],
    examplesSeek: [
      "Who else has a room tonight in Berlin?",
      "I am going to Berlin — who else has accommodation?",
      "Who else has a hostel stay in Berlin?",
    ],
    examplesOffer: [
      "I have a room tonight in Georgetown",
      "Who else needs a stay in Berlin tonight?",
    ],
    banner:
      "DEMO data. Travel reuses apartment listing/seeker + rent + city. Nights, not months. If this collides with Apt, that is the finding. Same whoelse.find.",
  },
  {
    id: "events",
    label: "Events",
    hasSides: true,
    mixed: true,
    offerRoles: ["event", "speaker"],
    seekRoles: ["attendee"],
    examplesSeek: [
      "Who else is attending a meetup in DC?",
      "Who else is speaking at an event from my city?",
    ],
    examplesOffer: [
      "I am speaking Saturday — who else is attending?",
      "Who else is going from my city?",
    ],
    banner: "DEMO data. Events are resources; attendees and speakers are people (and one AI). Same whoelse.find.",
  },
  {
    id: "childcare",
    label: "Childcare",
    hasSides: true,
    mixed: true,
    offerRoles: ["caregiver"],
    seekRoles: ["parent"],
    examplesSeek: [
      "Who else can babysit tonight nearby?",
      "Who else can do childcare tonight?",
    ],
    examplesOffer: [
      "I can babysit tonight — who else needs childcare?",
      "Who else needs a babysitter nearby?",
    ],
    banner:
      "DEMO data. Safety is evidence stubs (verified / references), not a score. Reciprocal swap is offer+seek on one entity. Same whoelse.find.",
  },
  {
    id: "collab",
    label: "Collab",
    hasSides: true,
    mixed: true,
    offerRoles: [],
    seekRoles: [],
    examplesSeek: [
      "Who else has complementary design and wants to join this project?",
      "Who else writes and wants a design partner?",
    ],
    examplesOffer: [
      "I design — who else will write together on this project?",
      "Who else wants to join this project?",
    ],
    banner:
      "DEMO data. Team formation is complementary offers↔seeks. No new type. Multi-party is a project resource. Same whoelse.find.",
  },
  {
    id: "compute",
    label: "Compute",
    hasSides: true,
    mixed: true,
    offerRoles: ["compute"],
    seekRoles: ["workload"],
    examplesSeek: [
      "Who else can host a GPU cheaper?",
      "Who else has GPU compute capacity?",
    ],
    examplesOffer: [
      "I host a GPU — who else needs cheaper compute?",
      "Who else needs GPU capacity?",
    ],
    banner: "DEMO data. Machines are entities with capacity, latency, and state. Agent routing is whoelse.find. Not a cloud.",
  },
  {
    id: "data",
    label: "Data",
    hasSides: true,
    mixed: true,
    offerRoles: ["publisher"],
    seekRoles: ["researcher"],
    examplesSeek: [
      "Who else has a dataset that is the original source?",
      "Who else can verify this claim?",
    ],
    examplesOffer: [
      "I have a dataset — who else needs the original source?",
      "Who else needs to verify this claim?",
    ],
    banner: "DEMO data. Provenance and access are evidence / attributes. Type dataset is reserved, not a new matcher. Same whoelse.find.",
  },
  {
    id: "local",
    label: "Local",
    hasSides: true,
    mixed: true,
    offerRoles: ["seller"],
    seekRoles: ["buyer"],
    examplesSeek: [
      "Who else sells nearby and is open now?",
      "Who else can deliver today?",
    ],
    examplesOffer: [
      "I am open now — who else needs something nearby?",
      "Who else needs deliver today?",
    ],
    banner:
      "DEMO data. Open now / deliver today are state attributes. Overlaps Products on purpose (seller + price). Same whoelse.find.",
  },
];

export function lensById(id: Vertical): Lens {
  return LENSES.find((l) => l.id === id) ?? LENSES[0];
}

export const HAS_SIDES = LENSES.filter((l) => l.hasSides).map((l) => l.id);

export const FORCE_SIDE: Vertical[] = ["apartment", "rides", "services", "travel"];

export const OFFER_SIDE_ROLES = [
  "listing",
  "opening",
  "employer",
  "worker",
  "driver",
  "provider",
  "seller",
  "investor",
  "expert",
  "speaker",
  "event",
  "caregiver",
  "compute",
  "publisher",
];

export function examplesFor(vertical: Vertical, side: MarketSide): string[] {
  const lens = lensById(vertical);
  if (!lens.hasSides || side === "seek") return lens.examplesSeek;
  return lens.examplesOffer.length ? lens.examplesOffer : lens.examplesSeek;
}
