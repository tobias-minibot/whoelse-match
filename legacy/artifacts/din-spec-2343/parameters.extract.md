# DIN SPEC 2343 — recovered parameter table

**Standard:** DIN SPEC 2343:2020-09  
**Title:** Definition of AI parameters and formats for transferring language-based data between artificial intelligences  
**Initiators (public):** Tobias Martens (whoelse.ai), Alexander Klug  
**Source:** DIN press release + secondary parameter table (kpt-bj.com summary of the 22-page SPEC)  
**Fetched:** 2026-09-12  
**PROVENANCE:** public descriptions of the SPEC. The paid DIN PDF was not retrieved. This is **not** the 36 global slot-role list.

## Thesis (DIN press, 2020)

Intent must be transmitted. Intent is usually a word, e.g. "Restaurant". Optional: speech-to-text or audio. Not transmitting the literal command is a privacy advantage.

## JSON parameter sketch (secondary source)

Mandatory:

- Timestamp (DIN ISO 8601 string)
- RequestId (string)
- Intent (object)

Recommended:

- DataSecurity (object)
- Confidence (object)
- SpeechToText (string)
- LinkToAudio (string)

Optional:

- BiometricData, Location, Session, User, Entity, Device, Application
- SystemVersion, Receiver, AccessToken, StandardVersion, Locale

Serialization: JSON.

## Count note

These are **transfer parameters** (~18), not the later "36 global slot roles" of WhoElse Protocol v2. Documented separately.
