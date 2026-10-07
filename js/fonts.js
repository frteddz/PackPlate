const BUILTIN_FONTS = [
  { key: "Press Start 2P", label: "Press Start 2P", kind: "pixel", weights: [400] },
  { key: "Silkscreen", label: "Silkscreen", kind: "pixel", weights: [400, 700] },
  { key: "Pixelify Sans", label: "Pixelify Sans", kind: "pixel", weights: [400, 700] },
  { key: "VT323", label: "VT323", kind: "pixel", weights: [400] },
  { key: "Inter", label: "Inter", kind: "clean", weights: [400, 600, 700] }
];

const FONT_FACES = [
  { family: "Press Start 2P", src: "url(../assets/fonts/press-start-2p-latin-400-normal.woff2)", weight: "400" },
  { family: "Silkscreen", src: "url(../assets/fonts/silkscreen-latin-400-normal.woff2)", weight: "400" },
  { family: "Silkscreen", src: "url(../assets/fonts/silkscreen-latin-700-normal.woff2)", weight: "700" },
  { family: "Pixelify Sans", src: "url(../assets/fonts/pixelify-sans-latin-400-normal.woff2)", weight: "400" },
  { family: "Pixelify Sans", src: "url(../assets/fonts/pixelify-sans-latin-700-normal.woff2)", weight: "700" },
  { family: "VT323", src: "url(../assets/fonts/vt323-latin-400-normal.woff2)", weight: "400" },
  { family: "Inter", src: "url(../assets/fonts/inter-latin-400-normal.woff2)", weight: "400" },
  { family: "Inter", src: "url(../assets/fonts/inter-latin-600-normal.woff2)", weight: "600" },
  { family: "Inter", src: "url(../assets/fonts/inter-latin-700-normal.woff2)", weight: "700" }
];

const customFonts = new Map();
let customFontSeq = 0;

function cssFamily(key) {
  return key.indexOf("PPF-") === 0 ? key : '"' + key + '"';
}

function fontList() {
  const list = BUILTIN_FONTS.map((f) => ({ key: f.key, label: f.label, kind: f.kind, custom: false }));
  customFonts.forEach((f) => list.push({ key: f.key, label: f.label, kind: "custom", custom: true }));
  return list;
}

function fontLabel(key) {
  const hit = BUILTIN_FONTS.find((f) => f.key === key);
  if (hit) return hit.label;
  const c = customFonts.get(key);
  return c ? c.label : key;
}

function fontIsAvailable(key) {
  if (customFonts.has(key)) return true;
  return BUILTIN_FONTS.some((f) => f.key === key);
}

function weightFor(key, bold) {
  if (bold) return 700;
  const hit = BUILTIN_FONTS.find((f) => f.key === key);
  if (hit && hit.weights.indexOf(700) === -1) return 400;
  return 700;
}

async function loadFontFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (["ttf", "otf", "woff2"].indexOf(ext) === -1) {
    throw new Error(file.name + " is not a .ttf, .otf or .woff2 file");
  }
  const buf = await file.arrayBuffer();
  const raw = file.name.replace(/\.(ttf|otf|woff2)$/i, "").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
  const label = raw || "Font " + (customFontSeq + 1);
  const key = "PPF-" + label + "-" + ++customFontSeq;
  let face;
  try {
    face = new FontFace(key, buf);
    await face.load();
  } catch (e) {
    throw new Error("could not read " + file.name);
  }
  document.fonts.add(face);
  customFonts.set(key, { key: key, label: label, fileName: file.name });
  return key;
}

function removeCustomFont(key) {
  const f = customFonts.get(key);
  if (!f) return;
  customFonts.delete(key);
  document.fonts.forEach((face) => {
    if (face.family === key) document.fonts.delete(face);
  });
}

async function ensureFontReady(key, weight) {
  if (!key) return;
  const spec = weight + " 32px " + cssFamily(key);
  try {
    await document.fonts.load(spec);
  } catch (e) {
    return;
  }
  if (document.fonts.check(spec)) return;
  try {
    await document.fonts.ready;
  } catch (e) {
    return;
  }
}