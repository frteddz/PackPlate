const PRESET_KEY = "packplate.presets.v1";

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((p) => p && typeof p.name === "string" && p.style);
  } catch (e) {
    return [];
  }
}

function savePresets(list) {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

function presetStyle(style) {
  const copy = styleToPack(style);
  delete copy.bgImage;
  delete copy.customIcon;
  return copy;
}

function upsertPreset(name, style) {
  const list = loadPresets();
  const clean = String(name || "").trim() || "My look";
  const copy = presetStyle(style);
  const at = list.findIndex((p) => p.name.toLowerCase() === clean.toLowerCase());
  const entry = { name: clean, style: copy, savedAt: new Date().toISOString() };
  if (at >= 0) list[at] = entry;
  else list.push(entry);
  if (!savePresets(list)) return { ok: false, list: list, name: clean };
  return { ok: true, list: list, name: clean };
}

function removePreset(name) {
  const list = loadPresets();
  const next = list.filter((p) => p.name.toLowerCase() !== String(name).toLowerCase());
  savePresets(next);
  return next;
}