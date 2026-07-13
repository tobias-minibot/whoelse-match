import pptxgen from "pptxgenjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "whoelse-match-pitch.pptx");
const hero = path.join(__dirname, "../brand/hero-keyframe.jpg");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "who else?";
pres.title = "who else? — a dating app for humans & AIs";
pres.subject = "V1.0 product pitch";

const C = {
  deep: "2A211C",
  cream: "FAF8F5",
  ink: "1C1916",
  muted: "6E675F",
  coral: "E85D04",
  sand: "F3EEE6",
  white: "FFFFFF",
  card: "FFFFFF",
};

// 1 Title
{
  const s = pres.addSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.deep } });
  s.addImage({ path: hero, x: 5.2, y: 0.8, w: 4.4, h: 2.75, rounding: 0.1 });
  s.addText("who else?", {
    x: 0.55, y: 1.4, w: 4.5, h: 0.7,
    fontFace: "Georgia", fontSize: 40, color: C.cream, bold: true, margin: 0,
  });
  s.addText("A dating app for humans & AIs", {
    x: 0.55, y: 2.15, w: 4.6, h: 0.9,
    fontFace: "Calibri", fontSize: 22, color: C.coral, margin: 0,
  });
  s.addText("Match on intent — interests, projects, skills.\nFind a person or an AI that fits.", {
    x: 0.55, y: 3.2, w: 4.6, h: 0.9,
    fontFace: "Calibri", fontSize: 15, color: "CFC3B7", margin: 0,
  });
  s.addText("V1.0  ·  Product line  ·  2026", {
    x: 0.55, y: 5.1, w: 4, h: 0.3,
    fontFace: "Calibri", fontSize: 12, color: "8A8078", margin: 0,
  });
}

// 2 Problem
{
  const s = pres.addSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.cream } });
  s.addText("The problem", {
    x: 0.55, y: 0.4, w: 9, h: 0.5,
    fontFace: "Georgia", fontSize: 32, color: C.ink, bold: true, margin: 0,
  });
  s.addText("Desire is trapped inside apps. Agents have no place to be found.", {
    x: 0.55, y: 1.0, w: 9, h: 0.45,
    fontFace: "Calibri", fontSize: 16, color: C.muted, italic: true, margin: 0,
  });
  const cards = [
    { t: "Fragmented apps", d: "Dating, jobs, hobbies, collabs — each forces a new profile and a new dialect." },
    { t: "AIs are invisible", d: "Skills live in tool menus, not in a matchable pool next to people." },
    { t: "You re-explain forever", d: "Every platform forgets what you want. No shared encoding of intent." },
  ];
  cards.forEach((c, i) => {
    const x = 0.55 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.7, w: 2.9, h: 2.9,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", blur: 12, opacity: 0.08, offset: 3 },
      rectRadius: 0.12,
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: x + 0.2, y: 1.95, w: 0.45, h: 0.45,
      fill: { color: C.coral }, rectRadius: 0.08,
    });
    s.addText(String(i + 1), {
      x: x + 0.2, y: 1.95, w: 0.45, h: 0.45,
      fontFace: "Calibri", fontSize: 16, color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(c.t, {
      x: x + 0.2, y: 2.6, w: 2.5, h: 0.55,
      fontFace: "Calibri", fontSize: 16, color: C.ink, bold: true, margin: 0,
    });
    s.addText(c.d, {
      x: x + 0.2, y: 3.25, w: 2.5, h: 1.1,
      fontFace: "Calibri", fontSize: 13, color: C.muted, margin: 0,
    });
  });
}

// 3 Insight
{
  const s = pres.addSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.cream } });
  s.addText("The insight", {
    x: 0.55, y: 0.4, w: 9, h: 0.5,
    fontFace: "Georgia", fontSize: 32, color: C.ink, bold: true, margin: 0,
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.55, y: 1.2, w: 8.9, h: 1.6,
    fill: { color: C.deep }, rectRadius: 0.12,
  });
  s.addText("Dating was always the right metaphor:\nprofiles of desire → a pool of candidates → a match.", {
    x: 0.8, y: 1.45, w: 8.4, h: 1.15,
    fontFace: "Georgia", fontSize: 22, color: C.cream, margin: 0,
  });
  s.addText([
    { text: "Romance is one vertical. ", options: { bold: true } },
    { text: "The platform is universal matching under intent — collaborators, hobbies, skills, projects — humans and AIs in the same pool.", options: { breakLine: false } },
  ], {
    x: 0.55, y: 3.15, w: 8.9, h: 1.0,
    fontFace: "Calibri", fontSize: 16, color: C.ink, margin: 0,
  });
  s.addText("who else?  =  the expand operator for “show me another match”", {
    x: 0.55, y: 4.4, w: 8.9, h: 0.4,
    fontFace: "Calibri", fontSize: 15, color: C.coral, bold: true, margin: 0,
  });
}

// 4 Product
{
  const s = pres.addSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.cream } });
  s.addText("The product", {
    x: 0.55, y: 0.35, w: 9, h: 0.45,
    fontFace: "Georgia", fontSize: 32, color: C.ink, bold: true, margin: 0,
  });
  s.addText("Type anything. Match humans & AIs. Expand with who else?", {
    x: 0.55, y: 0.9, w: 9, h: 0.35,
    fontFace: "Calibri", fontSize: 15, color: C.muted, italic: true, margin: 0,
  });

  const steps = [
    { n: "01", t: "Say what you want", d: "In the app or inside Claude — plain language." },
    { n: "02", t: "Encode the intent", d: "VOICE NETWORK who else? — shared, inspectable form." },
    { n: "03", t: "Match the pool", d: "Humans who opted in + AIs that publish skills." },
    { n: "04", t: "who else?", d: "Same intent, more candidates — no re-explaining." },
  ];
  steps.forEach((st, i) => {
    const y = 1.45 + i * 0.95;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y, w: 8.9, h: 0.85,
      fill: { color: C.white }, rectRadius: 0.1,
      shadow: { type: "outer", color: "000000", blur: 8, opacity: 0.06, offset: 2 },
    });
    s.addText(st.n, {
      x: 0.75, y, w: 0.8, h: 0.85,
      fontFace: "Calibri", fontSize: 18, color: C.coral, bold: true, valign: "middle", margin: 0,
    });
    s.addText(st.t, {
      x: 1.7, y: y + 0.12, w: 7.4, h: 0.35,
      fontFace: "Calibri", fontSize: 16, color: C.ink, bold: true, margin: 0,
    });
    s.addText(st.d, {
      x: 1.7, y: y + 0.42, w: 7.4, h: 0.3,
      fontFace: "Calibri", fontSize: 13, color: C.muted, margin: 0,
    });
  });
}

// 5 Why now
{
  const s = pres.addSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.cream } });
  s.addText("Why now", {
    x: 0.55, y: 0.4, w: 9, h: 0.5,
    fontFace: "Georgia", fontSize: 32, color: C.ink, bold: true, margin: 0,
  });
  const pts = [
    { t: "Agent explosion", d: "Millions of AIs need to be discoverable — not buried in tool menus." },
    { t: "Human overload", d: "People won’t install 40 apps for 40 desires. One matching layer wins." },
    { t: "Protocol ready", d: "Intent packets + who else? operator = shared language across chat, apps, platforms." },
    { t: "Claude-native", d: "The product lives in conversation. Landing + skill, not another dashboard war." },
  ];
  pts.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.55 + col * 4.7;
    const y = 1.2 + row * 1.85;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w: 4.4, h: 1.65,
      fill: { color: i === 0 || i === 3 ? C.deep : C.white },
      rectRadius: 0.12,
    });
    const titleC = i === 0 || i === 3 ? C.cream : C.ink;
    const bodyC = i === 0 || i === 3 ? "CFC3B7" : C.muted;
    s.addText(p.t, {
      x: x + 0.25, y: y + 0.3, w: 3.9, h: 0.4,
      fontFace: "Calibri", fontSize: 18, color: titleC, bold: true, margin: 0,
    });
    s.addText(p.d, {
      x: x + 0.25, y: y + 0.8, w: 3.9, h: 0.6,
      fontFace: "Calibri", fontSize: 14, color: bodyC, margin: 0,
    });
  });
}

// 6 Market / wedge
{
  const s = pres.addSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.cream } });
  s.addText("Wedge → platform", {
    x: 0.55, y: 0.4, w: 9, h: 0.5,
    fontFace: "Georgia", fontSize: 32, color: C.ink, bold: true, margin: 0,
  });
  const wedges = [
    { h: "Now", t: "Collaborators & interests", d: "Opt-in people + skill AIs. Claude skill. Consumer landing." },
    { h: "Next", t: "Vertical depth", d: "Local hobbies, project partners, expert access — same match engine." },
    { h: "Then", t: "Universal layer", d: "Platforms & agents publish intents. who else? becomes default discovery." },
  ];
  wedges.forEach((w, i) => {
    const x = 0.55 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.3, w: 2.95, h: 3.5,
      fill: { color: i === 2 ? C.deep : C.white },
      rectRadius: 0.12,
      shadow: { type: "outer", color: "000000", blur: 10, opacity: 0.07, offset: 2 },
    });
    s.addText(w.h, {
      x: x + 0.2, y: 1.55, w: 2.55, h: 0.35,
      fontFace: "Calibri", fontSize: 12, color: C.coral, bold: true, margin: 0,
    });
    s.addText(w.t, {
      x: x + 0.2, y: 2.05, w: 2.55, h: 0.9,
      fontFace: "Georgia", fontSize: 20, color: i === 2 ? C.cream : C.ink, margin: 0,
    });
    s.addText(w.d, {
      x: x + 0.2, y: 3.15, w: 2.55, h: 1.3,
      fontFace: "Calibri", fontSize: 14, color: i === 2 ? "CFC3B7" : C.muted, margin: 0,
    });
  });
}

// 7 Close
{
  const s = pres.addSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.deep } });
  s.addText("who else?", {
    x: 0.55, y: 1.5, w: 9, h: 0.7,
    fontFace: "Georgia", fontSize: 40, color: C.cream, bold: true, margin: 0,
  });
  s.addText("It’s a dating app — for anything you want —\nand the matches can be humans or AIs.", {
    x: 0.55, y: 2.35, w: 9, h: 1.1,
    fontFace: "Calibri", fontSize: 22, color: C.coral, margin: 0,
  });
  s.addText("Landing  ·  Brand clip  ·  This deck  ·  Fresh repo", {
    x: 0.55, y: 4.6, w: 9, h: 0.35,
    fontFace: "Calibri", fontSize: 14, color: "8A8078", margin: 0,
  });
}

await pres.writeFile({ fileName: out });
console.log("Wrote", out);
