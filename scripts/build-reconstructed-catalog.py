#!/usr/bin/env python3
"""Build the reconstructed surviving-catalog snapshot + mapping JSON.

PROVENANCE: "user-pasted surviving catalog 2026-09-12"
This is NOT the missing machine files (intent-slots-506.csv / intent-protocol.json).
Do not treat generated IDs as the original 506 SHA-stable identifiers.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# 36 reconstructed global slot roles — NOT recovered from a machine file.
# Sources: DIN SPEC 2343 transfer fields + whoelse-meaning-app examples
# + typical NLU roles implied by "Date/Apartment/Delivery who else?" encodings.
SLOT_ROLES = [
    {"id": "LOCATION", "kind": "constraint", "examples": ["near the office", "DC", "near me"]},
    {"id": "DESTINATION", "kind": "constraint", "examples": ["airport", "trailhead"]},
    {"id": "ORIGIN", "kind": "constraint", "examples": ["home", "Mall"]},
    {"id": "RADIUS", "kind": "constraint", "examples": ["2 miles", "walking distance"]},
    {"id": "TIME", "kind": "constraint", "examples": ["after 5pm", "this weekend"]},
    {"id": "DATE", "kind": "constraint", "examples": ["Thursday", "Saturday"]},
    {"id": "DURATION", "kind": "constraint", "examples": ["1 hour", "overnight"]},
    {"id": "URGENCY", "kind": "constraint", "examples": ["before the weekend", "emergency"]},
    {"id": "AVAILABILITY", "kind": "constraint", "examples": ["weekday evenings", "always on"]},
    {"id": "PARTY_SIZE", "kind": "constraint", "examples": ["four of us", "just me"]},
    {"id": "RECIPIENT", "kind": "constraint", "examples": ["a friend", "my parents"]},
    {"id": "REQUESTER", "kind": "actor", "examples": ["who is asking"]},
    {"id": "PROVIDER_TYPE", "kind": "constraint", "examples": ["human", "AI", "service"]},
    {"id": "SKILL", "kind": "predicate", "examples": ["summarize PDF", "fix a leak"]},
    {"id": "OBJECT", "kind": "predicate", "examples": ["apartment", "gift", "PDF"]},
    {"id": "ACTIVITY", "kind": "predicate", "examples": ["dinner + walk", "mountain biking"]},
    {"id": "VIBE", "kind": "preference", "examples": ["low-key", "not an app marathon"]},
    {"id": "QUALITY", "kind": "preference", "examples": ["vetted", "best available"]},
    {"id": "EXPERIENCE", "kind": "preference", "examples": ["intermediate", "specialist"]},
    {"id": "LANGUAGE", "kind": "constraint", "examples": ["German to English", "Hebrew"]},
    {"id": "BUDGET", "kind": "constraint", "examples": ["under $60", "not too pricey"]},
    {"id": "PRICE", "kind": "constraint", "examples": ["cheap task execution"]},
    {"id": "PAYMENT", "kind": "constraint", "examples": ["insurance", "invoice"]},
    {"id": "INSURANCE", "kind": "constraint", "examples": ["takes my insurance", "your plan"]},
    {"id": "CERTIFICATION", "kind": "constraint", "examples": ["licensed", "notary commission"]},
    {"id": "CONSTRAINT", "kind": "constraint", "examples": ["one of us is vegan"]},
    {"id": "PREFERENCE", "kind": "preference", "examples": ["pour-over coffee"]},
    {"id": "QUANTITY", "kind": "constraint", "examples": ["one-bedroom", "fourth for tennis"]},
    {"id": "CONDITION", "kind": "constraint", "examples": ["deep-clean", "needs a callback"]},
    {"id": "BRAND", "kind": "constraint", "examples": ["Alexa", "MyTaxi"]},
    {"id": "METHOD", "kind": "constraint", "examples": ["API", "phone call", "in person"]},
    {"id": "CONTACT", "kind": "constraint", "examples": ["callback", "confirmation"]},
    {"id": "SOURCE", "kind": "constraint", "examples": ["independent witness"]},
    {"id": "CONFIDENCE", "kind": "meta", "examples": ["DIN Confidence object"]},
    {"id": "LOCALE", "kind": "meta", "examples": ["en", "de"]},
    {"id": "EXEMPLAR", "kind": "anchor", "examples": ["like Nova", "instead of X"]},
]

# Operation families derived from evidence (not life categories).
# Smallest set that still explains the catalog AND the live engine.
OPERATION_FAMILIES = [
    {
        "id": "FIND",
        "name": "Find additional entities satisfying an intent",
        "live": "whoelse.find / WHOELSE(context, predicate?, constraints?, exclude?, mode?)",
        "note": "The live primitive. Almost every legacy INTENT who else? is this.",
    },
    {
        "id": "ANCHOR",
        "name": "Find relative to an exemplar",
        "live": "whoelse.find({ entityId, mode: expand|peers|substitute })",
        "note": "Recursive Who else? / more-like / instead-of. Same operator, mode + exemplar.",
    },
    {
        "id": "FULFILL",
        "name": "Act on a chosen entity",
        "live": "NOT whoelse.find — invoke/chat/interest stubs",
        "note": "Legacy catalog implied book/call/pay. Live engine correctly stops at find.",
    },
]

# Life categories: Body & Health → Shopping & Gifts, plus evidenced extras.
# Each tuple: (ID, name, category, aliases, slots, family, human_phrase, find_intent, entity_hint, notes, evidence)
#
# evidence tags:
#   named     = named in the 2026-09-12 brief (DATE/DATING/APARTMENT/RIDESHARE/JOB/NOTARY/PLUMBER)
#   public    = whoelse.ai / DIN / meaning-app / landing / startups pitch
#   reconstructed = systematic expansion of the surviving category spine
#   missed    = AI/agent class the old life catalog typically omitted (506+x)

INTENTS: list[dict] = []


def add(
    id: str,
    name: str,
    category: str,
    *,
    aliases: list[str] | None = None,
    slots: list[str],
    family: str = "FIND",
    phrase: str | None = None,
    find: str | None = None,
    type_hint: str | None = None,
    notes: str = "",
    evidence: str = "reconstructed",
    july18: str = "present",
    aug15: str = "present",
    v2: str = "unknown",
    matrix: list[str] | None = None,
):
    INTENTS.append(
        {
            "id": id,
            "name": name,
            "category": category,
            "aliases": aliases or [],
            "slots": slots,
            "operation_family": family,
            "human_phrase": phrase or f"{name} who else?",
            "whoelse_find": {
                "intent": find or f"Who else can help with {name.lower()}?",
                "type": type_hint,
                "mode": "expand",
            },
            "notes": notes,
            "evidence": evidence,
            "versions": {
                "july_18_2026_506": july18,
                "august_15_2026_505": aug15,
                "protocol_v2_452": v2,
            },
            "network_matrix": matrix or ["human", "service"],
        }
    )


# ---------------------------------------------------------------------------
# Body & Health
# ---------------------------------------------------------------------------
H = "Body & Health"
HS = ["LOCATION", "TIME", "INSURANCE", "AVAILABILITY", "URGENCY"]
for id, name, extra in [
    ("DENTIST", "Dentist", "meaning-app dentist+insurance+after 5pm example"),
    ("ORTHODONTIST", "Orthodontist", ""),
    ("DENTAL_HYGIENIST", "Dental hygienist", ""),
    ("DOCTOR", "Doctor", "DIN-era 'best AI available' for medical lookup"),
    ("GP", "General practitioner", ""),
    ("PEDIATRICIAN", "Pediatrician", ""),
    ("DERMATOLOGIST", "Dermatologist", ""),
    ("CARDIOLOGIST", "Cardiologist", ""),
    ("GYNECOLOGIST", "Gynecologist", ""),
    ("ENT", "ENT", ""),
    ("OPHTHALMOLOGIST", "Ophthalmologist", ""),
    ("OPTICIAN", "Optician", ""),
    ("PSYCHIATRIST", "Psychiatrist", ""),
    ("PSYCHOLOGIST", "Psychologist", ""),
    ("THERAPIST", "Therapist", ""),
    ("COUNSELOR", "Counselor", ""),
    ("PHYSIOTHERAPIST", "Physiotherapist", ""),
    ("CHIROPRACTOR", "Chiropractor", ""),
    ("ACUPUNCTURIST", "Acupuncturist", ""),
    ("MASSAGE", "Massage", ""),
    ("PHARMACY", "Pharmacy", ""),
    ("URGENT_CARE", "Urgent care", ""),
    ("ER", "Emergency room", ""),
    ("HOSPITAL", "Hospital", ""),
    ("LAB_TEST", "Lab test", ""),
    ("VACCINATION", "Vaccination", ""),
    ("RADIOLOGIST", "Radiologist", ""),
    ("NUTRITIONIST", "Nutritionist", ""),
    ("MIDWIFE", "Midwife", ""),
    ("DOULA", "Doula", ""),
    ("PODIATRIST", "Podiatrist", ""),
    ("ALLERGIST", "Allergist", ""),
    ("SLEEP", "Sleep clinic", ""),
    ("ADDICTION", "Addiction support", ""),
    ("SPEECH_THERAPY", "Speech therapy", ""),
    ("AUDIOLOGIST", "Audiologist", ""),
]:
    add(
        id,
        name,
        H,
        slots=HS,
        find=f"Who else is a {name.lower()} near me who is available this week?",
        type_hint="service",
        notes=extra,
        evidence="public" if id == "DENTIST" else "reconstructed",
        matrix=["human", "service", "ai"],
    )

# ---------------------------------------------------------------------------
# Home & Housing
# ---------------------------------------------------------------------------
HH = "Home & Housing"
add(
    "APARTMENT",
    "Apartment",
    HH,
    aliases=["FLAT", "RENTAL"],
    slots=["LOCATION", "BUDGET", "QUANTITY", "DATE"],
    phrase="Apartment who else?",
    find="Who else has an apartment?",
    type_hint="resource",
    notes="Named in brief. whoelse.ai example. Live seed has resource-apartment-adams.",
    evidence="named",
    v2="likely-canonical",
    matrix=["resource", "service", "human"],
)
for id, name in [
    ("HOUSE", "House"),
    ("ROOM", "Room"),
    ("STUDIO", "Studio"),
    ("SUBLET", "Sublet"),
    ("ROOMMATE", "Roommate"),
    ("LANDLORD", "Landlord"),
    ("REAL_ESTATE", "Real estate"),
    ("REALTOR", "Realtor"),
    ("PROPERTY_MANAGER", "Property manager"),
    ("LEASE", "Lease"),
    ("HOME_INSPECTOR", "Home inspector"),
    ("MOVER", "Mover"),
    ("STORAGE", "Storage"),
    ("CLEANER", "Cleaner"),
    ("HOUSEKEEPER", "Housekeeper"),
    ("HANDYMAN", "Handyman"),
    ("LOCKSMITH", "Locksmith"),
]:
    add(
        id,
        name,
        HH,
        slots=["LOCATION", "TIME", "BUDGET"],
        find=f"Who else can help with {name.lower()}?",
        type_hint="service" if id not in {"ROOMMATE", "LANDLORD"} else "human",
        evidence="public" if id == "REAL_ESTATE" else "reconstructed",
        matrix=["human", "service", "resource"],
    )

# ---------------------------------------------------------------------------
# Home repair & trades (includes PLUMBER)
# ---------------------------------------------------------------------------
TR = "Home Repair & Trades"
add(
    "PLUMBER",
    "Plumber",
    TR,
    slots=["LOCATION", "URGENCY", "BUDGET", "TIME", "OBJECT"],
    phrase="Plumber who else?",
    find="Who else can fix a leak under my sink before the weekend, not too pricey?",
    type_hint="service",
    notes="Named in brief. meaning-app leak-under-sink example.",
    evidence="named",
    v2="likely-canonical",
    matrix=["human", "service"],
)
for id, name in [
    ("ELECTRICIAN", "Electrician"),
    ("HVAC", "HVAC"),
    ("CARPENTER", "Carpenter"),
    ("PAINTER", "Painter"),
    ("ROOFER", "Roofer"),
    ("FLOORING", "Flooring"),
    ("TILE", "Tiler"),
    ("DRYWALL", "Drywall"),
    ("MASON", "Mason"),
    ("GLAZIER", "Glazier"),
    ("LANDSCAPER", "Landscaper"),
    ("GARDENER", "Gardener"),
    ("TREE_SERVICE", "Tree service"),
    ("PEST_CONTROL", "Pest control"),
    ("APPLIANCE_REPAIR", "Appliance repair"),
    ("BOILER", "Boiler"),
    ("WATER_HEATER", "Water heater"),
    ("GUTTER", "Gutter"),
    ("SOLAR", "Solar installer"),
    ("INSULATION", "Insulation"),
    ("DECK", "Deck builder"),
    ("POOL", "Pool service"),
]:
    add(
        id,
        name,
        TR,
        slots=["LOCATION", "URGENCY", "BUDGET", "TIME"],
        find=f"Who else is a {name.lower()} near me available this week?",
        type_hint="service",
        matrix=["human", "service"],
    )

# ---------------------------------------------------------------------------
# Food & Dining
# ---------------------------------------------------------------------------
FD = "Food & Dining"
add(
    "DELIVERY",
    "Delivery",
    FD,
    slots=["LOCATION", "TIME", "CONSTRAINT", "BUDGET"],
    phrase="Delivery who else?",
    find="Who else can deliver food near me tonight?",
    type_hint="service",
    notes="whoelse.ai verbatim example.",
    evidence="public",
    v2="likely-canonical",
    matrix=["service", "human"],
)
add(
    "RESTAURANT",
    "Restaurant",
    FD,
    slots=["LOCATION", "TIME", "PARTY_SIZE", "CONSTRAINT", "VIBE"],
    phrase="Restaurant who else?",
    find="Who else can get the four of us to dinner Friday somewhere central, one of us is vegan?",
    type_hint="service",
    notes="DIN press uses Restaurant as the example intent word. meaning-app dinner example.",
    evidence="public",
    v2="likely-canonical",
    matrix=["service", "human", "ai"],
)
for id, name in [
    ("CAFE", "Cafe"),
    ("BAR", "Bar"),
    ("TAKEOUT", "Takeout"),
    ("CATERING", "Catering"),
    ("CHEF", "Chef"),
    ("BAKER", "Baker"),
    ("GROCER", "Grocer"),
    ("FARMERS_MARKET", "Farmers market"),
    ("FOOD_TRUCK", "Food truck"),
    ("RESERVATION", "Reservation"),
    ("BRUNCH", "Brunch"),
    ("COFFEE", "Coffee"),
    ("WINE", "Wine"),
    ("BREWERY", "Brewery"),
]:
    add(
        id,
        name,
        FD,
        slots=["LOCATION", "TIME", "CONSTRAINT", "VIBE"],
        find=f"Who else for {name.lower()} near me?",
        type_hint="service",
        matrix=["service", "human"],
    )

# ---------------------------------------------------------------------------
# Transport & Travel
# ---------------------------------------------------------------------------
TT = "Transport & Travel"
add(
    "RIDESHARE",
    "Rideshare",
    TT,
    aliases=["RIDE", "RIDESHARE_RIDE"],
    slots=["ORIGIN", "DESTINATION", "TIME", "BUDGET", "PARTY_SIZE"],
    phrase="Rideshare who else?",
    find="Who else can give me a ride?",
    type_hint="service",
    notes="Named in brief. whoelse.ai 'find me a ride-share'. Live seed has service-dc-ride.",
    evidence="named",
    v2="likely-canonical",
    matrix=["service", "human", "ai"],
)
for id, name in [
    ("TAXI", "Taxi"),
    ("BUS", "Bus"),
    ("TRAIN", "Train"),
    ("FLIGHT", "Flight"),
    ("AIRPORT", "Airport transfer"),
    ("RENTAL_CAR", "Rental car"),
    ("CARSHARE", "Car share"),
    ("BIKE_SHARE", "Bike share"),
    ("SCOOTER", "Scooter"),
    ("EV_CHARGING", "EV charging"),
    ("PARKING", "Parking"),
    ("TOW", "Tow"),
    ("MECHANIC", "Mechanic"),
    ("TIRE", "Tire shop"),
    ("COURIER", "Courier"),
    ("SHIPPING", "Shipping"),
    ("HOTEL", "Hotel"),
    ("HOSTEL", "Hostel"),
    ("SHORT_STAY", "Short stay"),
    ("TRAVEL_AGENT", "Travel agent"),
    ("TOUR_GUIDE", "Tour guide"),
]:
    add(
        id,
        name,
        TT,
        slots=["ORIGIN", "DESTINATION", "TIME", "BUDGET"],
        find=f"Who else can help with {name.lower()}?",
        type_hint="service",
        evidence="public" if id in {"HOTEL", "RENTAL_CAR"} else "reconstructed",
        matrix=["service", "human"],
    )

# ---------------------------------------------------------------------------
# Work & Career
# ---------------------------------------------------------------------------
WK = "Work & Career"
add(
    "JOB",
    "Job",
    WK,
    aliases=["EMPLOYMENT", "HIRING"],
    slots=["LOCATION", "SKILL", "BUDGET", "AVAILABILITY"],
    phrase="Job who else?",
    find="Who else is hiring for this kind of work?",
    type_hint="company",
    notes="Named in brief.",
    evidence="named",
    v2="likely-canonical",
    matrix=["human", "company", "service"],
)
for id, name, hint in [
    ("INTERNSHIP", "Internship", "company"),
    ("FREELANCE", "Freelance", "human"),
    ("CONTRACT", "Contract work", "human"),
    ("RECRUITER", "Recruiter", "human"),
    ("RESUME", "Resume help", "ai"),
    ("INTERVIEW", "Interview prep", "ai"),
    ("COWORKING", "Coworking", "resource"),
    ("MENTOR", "Mentor", "human"),
    ("COFOUNDER", "Cofounder", "human"),
    ("COLLABORATOR", "Collaborator", "human"),
    ("CONSULTANT", "Consultant", "human"),
    ("ACCOUNTANT", "Accountant", "service"),
    ("BOOKKEEPER", "Bookkeeper", "service"),
    ("HR", "HR", "service"),
    ("CAREER_COACH", "Career coach", "human"),
    ("TEMP", "Temp work", "human"),
    ("GIG", "Gig", "human"),
]:
    add(
        id,
        name,
        WK,
        slots=["LOCATION", "SKILL", "AVAILABILITY"],
        find=f"Who else for {name.lower()}?",
        type_hint=hint,
        evidence="public" if id in {"COFOUNDER", "COLLABORATOR"} else "reconstructed",
        matrix=["human", "ai", "service", "company"],
    )

# ---------------------------------------------------------------------------
# Legal & Admin
# ---------------------------------------------------------------------------
LG = "Legal & Admin"
add(
    "NOTARY",
    "Notary",
    LG,
    slots=["LOCATION", "TIME", "CERTIFICATION", "OBJECT"],
    phrase="Notary who else?",
    find="Who else is a notary near me available today?",
    type_hint="service",
    notes="Named in brief.",
    evidence="named",
    v2="likely-canonical",
    matrix=["human", "service"],
)
add(
    "LAWYER",
    "Lawyer",
    LG,
    aliases=["ATTORNEY", "DIGITAL_LAWYER"],
    slots=["LOCATION", "SKILL", "LANGUAGE", "BUDGET"],
    find="Who else is a lawyer who can review this?",
    type_hint="service",
    notes="whoelse.ai Digital Lawyer example. startups pitch: European patent law agent.",
    evidence="public",
    v2="likely-canonical",
    matrix=["human", "service", "ai"],
)
for id, name in [
    ("PARALEGAL", "Paralegal"),
    ("IMMIGRATION", "Immigration help"),
    ("DIVORCE", "Divorce"),
    ("WILLS", "Wills"),
    ("ESTATE", "Estate"),
    ("CONTRACT_REVIEW", "Contract review"),
    ("PATENT", "Patent"),
    ("TRADEMARK", "Trademark"),
    ("SMALL_CLAIMS", "Small claims"),
    ("MEDIATION", "Mediation"),
    ("APOSTILLE", "Apostille"),
    ("INCORPORATION", "Incorporation"),
    ("TAX_PREP", "Tax prep"),
    ("TAX_FILING", "Tax filing"),
]:
    add(
        id,
        name,
        LG,
        slots=["LOCATION", "SKILL", "LANGUAGE", "BUDGET"],
        find=f"Who else can help with {name.lower()}?",
        type_hint="service",
        evidence="public" if id == "TAX_FILING" else "reconstructed",
        matrix=["human", "service", "ai"],
    )

# ---------------------------------------------------------------------------
# Money & Finance
# ---------------------------------------------------------------------------
MN = "Money & Finance"
for id, name in [
    ("BANK", "Bank"),
    ("CREDIT_UNION", "Credit union"),
    ("LOAN", "Loan"),
    ("MORTGAGE", "Mortgage"),
    ("FINANCIAL_ADVISOR", "Financial advisor"),
    ("INSURANCE", "Insurance"),
    ("HEALTH_INSURANCE", "Health insurance"),
    ("CAR_INSURANCE", "Car insurance"),
    ("INVESTMENT", "Investment"),
    ("DEBT", "Debt help"),
    ("INVOICE", "Invoice"),
]:
    add(
        id,
        name,
        MN,
        slots=["LOCATION", "BUDGET", "LANGUAGE"],
        find=f"Who else can help with {name.lower()}?",
        type_hint="service",
        matrix=["service", "human", "ai"],
    )

# ---------------------------------------------------------------------------
# Education
# ---------------------------------------------------------------------------
ED = "Education"
for id, name, hint in [
    ("TUTOR", "Tutor", "human"),
    ("TEACHER", "Teacher", "human"),
    ("SCHOOL", "School", "company"),
    ("COURSE", "Course", "product"),
    ("BOOTCAMP", "Bootcamp", "company"),
    ("LANGUAGE_LESSON", "Language lesson", "human"),
    ("MUSIC_LESSON", "Music lesson", "human"),
    ("TEST_PREP", "Test prep", "human"),
    ("COLLEGE_COUNSELOR", "College counselor", "human"),
    ("LIBRARY", "Library", "resource"),
    ("WORKSHOP", "Workshop", "human"),
]:
    add(
        id,
        name,
        ED,
        slots=["LOCATION", "SKILL", "LANGUAGE", "BUDGET"],
        find=f"Who else for {name.lower()}?",
        type_hint=hint,
        matrix=["human", "ai", "service"],
    )

# ---------------------------------------------------------------------------
# Dating & Relationships — DATE vs DATING is the version fork
# ---------------------------------------------------------------------------
DR = "Dating & Relationships"
add(
    "DATE",
    "Date",
    DR,
    aliases=["DATING"],
    slots=["LOCATION", "TIME", "VIBE", "ACTIVITY", "PREFERENCE"],
    phrase="Date who else?",
    find="Who else wants a low-key dinner and a walk, not an app marathon?",
    type_hint="human",
    notes=(
        "Named in brief. whoelse.ai + landing encoding DATE who else?. "
        "July 18 2026: DATE and DATING both present (506). "
        "August 15 2026: DATING folded into DATE (505)."
    ),
    evidence="named",
    july18="canonical",
    aug15="canonical",
    v2="likely-canonical",
    matrix=["human", "ai"],
)
add(
    "DATING",
    "Dating",
    DR,
    aliases=["DATE"],
    slots=["LOCATION", "TIME", "VIBE", "ACTIVITY", "PREFERENCE"],
    phrase="Dating who else?",
    find="Who else should I date?",
    type_hint="human",
    notes=(
        "Separate ID on July 18 2026 snapshot (contributes to 506). "
        "Folded into DATE on August 15 2026 (505). "
        "Do not silently merge versions — this row is the July-only ID."
    ),
    evidence="named",
    july18="canonical",
    aug15="folded-into:DATE",
    v2="alias-or-absent",
    matrix=["human", "ai"],
)
for id, name in [
    ("FRIEND", "Friend"),
    ("HANGOUT", "Hangout"),
    ("ACTIVITY_PARTNER", "Activity partner"),
    ("MATCHMAKER", "Matchmaker"),
    ("RELATIONSHIP", "Relationship"),
]:
    add(
        id,
        name,
        DR,
        slots=["LOCATION", "VIBE", "ACTIVITY"],
        find=f"Who else for {name.lower()}?",
        type_hint="human",
        matrix=["human", "ai"],
    )

# ---------------------------------------------------------------------------
# Family & Childcare
# ---------------------------------------------------------------------------
FM = "Family & Childcare"
for id, name in [
    ("BABYSITTER", "Babysitter"),
    ("NANNY", "Nanny"),
    ("DAYCARE", "Daycare"),
    ("ELDERCARE", "Eldercare"),
    ("CAREGIVER", "Caregiver"),
    ("PLAYDATE", "Playdate"),
]:
    add(
        id,
        name,
        FM,
        slots=["LOCATION", "TIME", "CERTIFICATION", "BUDGET"],
        find=f"Who else is a {name.lower()} near me?",
        type_hint="human",
        matrix=["human", "service"],
    )

# ---------------------------------------------------------------------------
# Pets
# ---------------------------------------------------------------------------
PT = "Pets"
for id, name in [
    ("VET", "Vet"),
    ("PET_SITTER", "Pet sitter"),
    ("DOG_WALKER", "Dog walker"),
    ("GROOMER", "Groomer"),
    ("PET_TRAINER", "Pet trainer"),
    ("PET_BOARDING", "Pet boarding"),
    ("PET_ADOPTION", "Pet adoption"),
]:
    add(
        id,
        name,
        PT,
        slots=["LOCATION", "TIME", "BUDGET"],
        find=f"Who else for {name.lower()}?",
        type_hint="service",
        matrix=["human", "service"],
    )

# ---------------------------------------------------------------------------
# Sports & Fitness
# ---------------------------------------------------------------------------
SP = "Sports & Fitness"
add(
    "CYCLING",
    "Cycling",
    SP,
    aliases=["MOUNTAIN_BIKING", "MTB"],
    slots=["LOCATION", "TIME", "EXPERIENCE", "ACTIVITY"],
    phrase="Mountain biking who else?",
    find="Who else near me is into mountain biking?",
    type_hint="human",
    notes="Landing encoding MOUNTAIN BIKING who else?. Live seed clusters this.",
    evidence="public",
    v2="likely-canonical",
    matrix=["human", "ai"],
)
for id, name in [
    ("GYM", "Gym"),
    ("PERSONAL_TRAINER", "Personal trainer"),
    ("YOGA", "Yoga"),
    ("CLIMBING", "Climbing"),
    ("RUNNING", "Running"),
    ("SWIMMING", "Swimming"),
    ("TEAM_SPORT", "Team sport"),
    ("COACH", "Coach"),
    ("TENNIS", "Tennis"),
]:
    add(
        id,
        name,
        SP,
        slots=["LOCATION", "TIME", "EXPERIENCE"],
        find=f"Who else wants to do {name.lower()}?",
        type_hint="human",
        matrix=["human", "service"],
    )

# ---------------------------------------------------------------------------
# Entertainment & Events
# ---------------------------------------------------------------------------
EV = "Entertainment & Events"
for id, name in [
    ("CONCERT", "Concert"),
    ("MOVIE", "Movie"),
    ("THEATER", "Theater"),
    ("MUSEUM", "Museum"),
    ("EVENT", "Event"),
    ("TICKET", "Ticket"),
    ("DJ", "DJ"),
    ("PHOTOGRAPHER", "Photographer"),
    ("VIDEOGRAPHER", "Videographer"),
    ("BAND", "Band"),
]:
    add(
        id,
        name,
        EV,
        slots=["LOCATION", "TIME", "BUDGET", "VIBE"],
        find=f"Who else for {name.lower()}?",
        type_hint="service",
        matrix=["human", "service"],
    )

# ---------------------------------------------------------------------------
# Shopping & Gifts
# ---------------------------------------------------------------------------
SH = "Shopping & Gifts"
add(
    "GIFT",
    "Gift",
    SH,
    slots=["BUDGET", "RECIPIENT", "PREFERENCE", "TIME"],
    phrase="Gift who else?",
    find="Who else has a gift under $60 for a friend who just got into pour-over coffee?",
    type_hint="product",
    notes="meaning-app commerce example.",
    evidence="public",
    v2="likely-canonical",
    matrix=["product", "service", "ai"],
)
for id, name in [
    ("FLOWERS", "Flowers"),
    ("JEWELRY", "Jewelry"),
    ("CLOTHING", "Clothing"),
    ("ELECTRONICS", "Electronics"),
    ("FURNITURE", "Furniture"),
    ("GROCERIES", "Groceries"),
    ("THRIFT", "Thrift"),
    ("CUSTOM_MADE", "Custom made"),
]:
    add(
        id,
        name,
        SH,
        slots=["BUDGET", "LOCATION", "PREFERENCE"],
        find=f"Who else can help me buy {name.lower()}?",
        type_hint="product",
        matrix=["product", "service"],
    )

# ---------------------------------------------------------------------------
# Civic / ambient (early whoelse.ai coworking catalog)
# ---------------------------------------------------------------------------
CV = "Civic & Places"
for id, name, ev in [
    ("AIR_CONDITION", "Air condition", "public"),
    ("ROOM_BOOKING", "Room booking", "public"),
    ("REGISTER_GUEST", "Register guest", "public"),
    ("PERMIT", "Permit", "public"),
    ("ZONING", "Zoning", "public"),
    ("PASSPORT", "Passport", "reconstructed"),
    ("VISA", "Visa", "reconstructed"),
    ("DMV", "DMV", "reconstructed"),
]:
    add(
        id,
        name,
        CV,
        slots=["LOCATION", "TIME", "OBJECT"],
        find=f"Who else can help with {name.lower()}?",
        type_hint="service",
        evidence=ev,
        matrix=["service", "ai", "human"],
    )

# ---------------------------------------------------------------------------
# 506+x — AI / agent classes the life-category catalog missed
# ---------------------------------------------------------------------------
AX = "AI & Agent classes (506+x)"
for rec in [
    ("PDF_SUMMARIZER", "PDF summarizer", "Who else can summarize this PDF?", "agent", "live seed agent-pdf-summarizer"),
    ("WEB_BROWSER", "Web browser agent", "Who else can browse the web?", "agent", "live seed"),
    ("TRANSLATOR", "Translator", "Who else can translate German to English?", "agent", "live seed + Deepgram meeting translator"),
    ("VERIFIER", "Verifier", "Who else can verify this result?", "agent", "live seed + witness thesis"),
    ("FAILOVER", "Failover agent", "Who else can take over if the primary agent fails?", "agent", "live seed"),
    ("DELEGATE", "Delegate", "Who else should I delegate this to?", "agent", "live seed"),
    ("CHEAP_RUNNER", "Cheap runner", "Who else can run this task more cheaply?", "agent", "live seed"),
    ("WORKFLOW", "Workflow agent", "Who else can run this workflow?", "agent", "live seed"),
    ("CAPABILITY_INDEX", "Capability index", "Who else knows who can do this?", "agent", "live seed CapIndex"),
    ("VOICE_ROUTER", "Voice router", "Who else can route this intent across assistants?", "ai", "landing Open Voice Router"),
    ("PERMIT_PATH", "Permit path", "Who else can route a DC permit?", "ai", "landing / seed"),
    ("PLAN_A_DATE", "Plan-a-date", "Who else can turn a vibe into a date itinerary?", "ai", "seed"),
    ("TRAIL_CONDITIONS", "Trail conditions", "Who else knows if the trail is rideable?", "ai", "seed"),
    ("HANDOFF", "Handoff concierge", "Who else can hand this to another assistant?", "ai", "seed"),
    ("RESEARCHER", "Researcher", "Who else can research this claim?", "agent", "missed"),
    ("EVALUATOR", "Evaluator", "Who else can evaluate this output?", "agent", "missed"),
    ("MODERATOR", "Moderator", "Who else can moderate this thread?", "agent", "missed"),
    ("SCHEDULER", "Scheduler", "Who else can schedule this across calendars?", "agent", "missed"),
    ("EMBEDDING_INDEX", "Embedding index", "Who else can retrieve similar documents?", "agent", "missed"),
    ("MCP_SERVER", "MCP server", "Who else exposes this tool over MCP?", "agent", "missed — 2026 machine surface"),
    ("PRICE_QUOTE", "Price quote", "Who else can quote this entity?", "agent", "adjacent PriceMCP/QuoteCall"),
    ("WITNESS", "Witness", "Who else has seen this / disagrees?", "agent", "startups protocol pitch"),
]:
    add(
        rec[0],
        rec[1],
        AX,
        slots=["SKILL", "OBJECT", "LANGUAGE", "PRICE", "EXEMPLAR"],
        find=rec[2],
        type_hint=rec[3],
        notes=rec[4],
        evidence="missed",
        july18="absent-or-unstated",
        aug15="absent-or-unstated",
        v2="absent-or-unstated",
        matrix=["ai", "agent", "service"],
        family="FIND",
    )


def expressibility(row: dict) -> dict:
    """Schema-level expressibility vs whoelse.find. Seed coverage is a lab fact, not a schema fact."""
    intent = row["whoelse_find"]["intent"]
    slots = row["slots"]
    mapped = {
        "LOCATION": "city / location",
        "ORIGIN": "intent text + location",
        "DESTINATION": "intent text / predicate",
        "RADIUS": "intent text (no structured radius)",
        "TIME": "intent text (no structured time)",
        "DATE": "intent text",
        "DURATION": "intent text",
        "URGENCY": "intent text",
        "AVAILABILITY": "availability",
        "PARTY_SIZE": "intent text",
        "RECIPIENT": "intent text",
        "REQUESTER": "requester",
        "PROVIDER_TYPE": "type",
        "SKILL": "intent / predicate",
        "OBJECT": "intent",
        "ACTIVITY": "intent",
        "VIBE": "intent",
        "QUALITY": "intent",
        "EXPERIENCE": "intent",
        "LANGUAGE": "intent / predicate",
        "BUDGET": "intent text (no structured price)",
        "PRICE": "intent text",
        "PAYMENT": "intent text",
        "INSURANCE": "intent text",
        "CERTIFICATION": "intent text",
        "CONSTRAINT": "intent / predicate",
        "PREFERENCE": "intent",
        "QUANTITY": "intent text",
        "CONDITION": "intent text",
        "BRAND": "intent text",
        "METHOD": "intent text",
        "CONTACT": "not in find (next-step stubs)",
        "SOURCE": "intent text",
        "CONFIDENCE": "not in find (score is ranker-internal)",
        "LOCALE": "not in find",
        "EXEMPLAR": "entityId + mode",
    }
    slot_map = {s: mapped.get(s, "intent text") for s in slots}
    structured_missing = [
        s
        for s in slots
        if slot_map[s].startswith("intent text")
        or slot_map[s].startswith("not in find")
    ]
    if row["operation_family"] == "FULFILL":
        verdict = "NOT_OPERATOR"
        why = "This is execution (book/pay/call), not find."
    else:
        verdict = "EXPRESSIBLE_AS_FIND"
        why = (
            "whoelse.find accepts free-text intent. The noun is not an endpoint. "
            "Structured slots mostly ride inside the sentence."
        )
    return {
        "verdict": verdict,
        "why": why,
        "slot_map": slot_map,
        "structured_slots_missing_from_schema": structured_missing,
        "human_language_preserved": True,
        "hardcoded_endpoint_required": False,
        "example_call": {
            "tool": "whoelse.find",
            "arguments": {
                k: v
                for k, v in {
                    "intent": intent,
                    "type": row["whoelse_find"]["type"],
                    "mode": "expand",
                    "limit": 5,
                }.items()
                if v is not None
            },
        },
    }


def main() -> None:
    ids = [r["id"] for r in INTENTS]
    assert len(ids) == len(set(ids)), "duplicate IDs"

    snapshot = {
        "provenance": "user-pasted surviving catalog 2026-09-12",
        "warning": (
            "Machine files intent-slots-506.csv and intent-protocol.json were NOT recovered "
            "from any reachable tobias-minibot GitHub repo on 2026-09-12. This snapshot "
            "reconstructs the surviving category spine (Body & Health through Shopping & Gifts) "
            "plus named IDs (DATE/DATING/APARTMENT/RIDESHARE/JOB/NOTARY/PLUMBER) and "
            "public whoelse.ai / DIN / meaning-app / landing evidence. "
            "Do NOT treat these IDs as the original SHA-stable 506."
        ),
        "recovered_machine_files": {
            "intent-slots-506.csv": None,
            "intent-protocol.json": None,
            "july_18_2026_snapshot": None,
            "august_15_2026_snapshot": None,
            "mcp4mcp_import": None,
            "whoelse_protocol_v2": None,
        },
        "version_records": {
            "public_2018_2022": {
                "count_claimed": 200,
                "source": "whoelse.ai home + idea pages (also 150 in Medium 2019)",
                "note": "Early public claim. Not 506.",
            },
            "july_18_2026": {
                "count_claimed": 506,
                "includes": "DATING as its own ID alongside DATE",
                "machine_file": None,
                "status": "claimed-not-recovered",
            },
            "august_15_2026": {
                "count_claimed": 505,
                "change": "DATING folded into DATE",
                "machine_file": None,
                "status": "claimed-not-recovered",
            },
            "protocol_v2": {
                "canonical_concepts_claimed": 452,
                "ids_claimed": 506,
                "permanent_aliases_claimed": 54,
                "global_slot_roles_claimed": 36,
                "arithmetic": "452 + 54 aliases = 506 IDs",
                "machine_file": None,
                "status": "claimed-not-recovered",
                "note": "Do not silently reconcile 506 vs 505 vs 452+54. They are different snapshots.",
            },
        },
        "reconstructed_slot_roles_36": SLOT_ROLES,
        "operation_families": OPERATION_FAMILIES,
        "intent_count": len(INTENTS),
        "intents": INTENTS,
    }

    mapping = {
        "schema_version": "1.1",
        "provenance": snapshot["provenance"],
        "warning": snapshot["warning"],
        "live_operator": {
            "name": "whoelse.find",
            "http": "POST https://whoelse-dating.vercel.app/api/whoelse",
            "mcp": "https://whoelse-dating.vercel.app/api/mcp",
            "fields": [
                "intent|context",
                "requester",
                "predicate",
                "type",
                "city|location",
                "availability",
                "exclude",
                "knownEntities",
                "entityId",
                "limit",
                "mode",
                "ranking",
                "minTrust",
            ],
        },
        "operation_families": OPERATION_FAMILIES,
        "intents": [],
    }
    for row in INTENTS:
        expr = expressibility(row)
        mapping["intents"].append(
            {
                "id": row["id"],
                "name": row["name"],
                "category": row["category"],
                "aliases": row["aliases"],
                "evidence": row["evidence"],
                "versions": row["versions"],
                "operation_family": row["operation_family"],
                "human_phrase": row["human_phrase"],
                "slots": row["slots"],
                "network_matrix": row["network_matrix"],
                "whoelse_find": expr["example_call"]["arguments"],
                "expressibility": {
                    "verdict": expr["verdict"],
                    "why": expr["why"],
                    "slot_map": expr["slot_map"],
                    "structured_slots_missing_from_schema": expr["structured_slots_missing_from_schema"],
                    "human_language_preserved": expr["human_language_preserved"],
                    "hardcoded_endpoint_required": expr["hardcoded_endpoint_required"],
                },
                "notes": row["notes"],
            }
        )

    art = ROOT / "legacy" / "artifacts" / "reconstructed-2026-09-12"
    art.mkdir(parents=True, exist_ok=True)
    (art / "surviving-catalog.json").write_text(json.dumps(snapshot, indent=2) + "\n")
    (ROOT / "legacy-intent-mapping.json").write_text(json.dumps(mapping, indent=2) + "\n")

    by_ev = {}
    for r in INTENTS:
        by_ev[r["evidence"]] = by_ev.get(r["evidence"], 0) + 1
    print(f"intents={len(INTENTS)} by_evidence={by_ev}")
    print(f"wrote {art / 'surviving-catalog.json'}")
    print(f"wrote {ROOT / 'legacy-intent-mapping.json'}")


if __name__ == "__main__":
    main()
