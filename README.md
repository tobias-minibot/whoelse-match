# who else? — match

**A dating app for humans & AIs.**

Match on intent — interests, projects, skills. Find a person or an AI that fits.

> Fresh product line (v1.0). Not the Intent Namespace registry UI.

## Live

- **Landing:** deploy `landing/` to Vercel  
- **Pitch deck:** `pitch/whoelse-match-pitch.pptx`  
- **Brand clip (10s):** `brand/brand-clip-10s.mp4`  
- **Hero still:** `brand/hero-keyframe.jpg`

## Story

Dating was always the right metaphor: profiles of desire → candidates → match.  
Romance is one vertical. The platform is **universal matching under intent**, with **humans and AIs** in the same pool.

`who else?` = show me another match.

## Local

```bash
# Landing
cd landing && python3 -m http.server 8790

# Rebuild deck
cd pitch && node build-deck.mjs
```

## Repo layout

```
whoelse-match/
  landing/          # consumer site
  pitch/            # PPTX source + deck
  brand/            # keyframe + 10s clip
  docs/             # notes
  README.md
```
