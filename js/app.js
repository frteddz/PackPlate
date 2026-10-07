const el = (id) => document.getElementById(id);
const qs = (sel, root) => (root || document).querySelector(sel);
const qsa = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

const state = {
  packs: [],
  active: null,
  seq: 0,
  applyAll: false,
  scale: 2,
  zoom: 1,
  busy: false
};

const dom = {};

function packAssets(pack) {
  if (!pack) return { iconImg: null, customImg: null, bgImg: null };
  return pack.assets;
}

function activePack() {
  return state.packs.find((p) => p.id === state.active) || null;
}

function toast(title, detail, kind) {
  const node = document.createElement("div");
  node.className = "toast" + (kind ? " " + kind : "");
  node.innerHTML =
    '<span class="ico">' +
    icon(kind === "bad" ? "circle-info" : "check", 20) +
    "</span><span class='msg'><b>" +
    escapeHTML(title) +
    "</b>" +
    (detail ? "<span>" + escapeHTML(detail) + "</span>" : "") +
    "</span>";
  el("toasts").appendChild(node);
  const life = kind === "bad" ? 8000 : 3600;
  setTimeout(() => {
    node.style.opacity = "0";
    setTimeout(() => node.remove(), 200);
  }, life);
  node.addEventListener("click", () => node.remove());
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function setBusy(on) {
  state.busy = on;
  qsa("[data-lock]").forEach((b) => {
    b.disabled = on;
  });
}

async function addFiles(fileList) {
  const files = Array.prototype.slice.call(fileList).filter((f) => /\.zip$/i.test(f.name) || /\.ttf$|\.otf$|\.woff2$/i.test(f.name));
  if (!files.length) {
    toast("Nothing to add", "Drop .zip resource packs. Font files go in the Font panel.", "bad");
    return;
  }
  const bar = el("packProg");
  const fill = el("packProgFill");
  const txt = el("packProgTxt");
  const showProg = files.length > 1;
  if (showProg) {
    bar.hidden = false;
    txt.hidden = false;
  }
  let done = 0;
  const tick = async () => {
    done++;
    if (!showProg) return;
    fill.style.width = Math.round((done / files.length) * 100) + "%";
    txt.textContent = "Reading pack " + done + " of " + files.length;
    await new Promise((r) => setTimeout(r, 30));
  };
  for (const file of files) {
    if (/\.(ttf|otf|woff2)$/i.test(file.name)) {
      await addFontFile(file);
      await tick();
      continue;
    }
    try {
      const data = await readPack(file);
      const dup = state.packs.find((p) => p.zipName === data.zipName);
      if (dup) {
        toast("Already added", data.zipName + " is already in the list.");
        continue;
      }
      const pack = {
        id: "p" + ++state.seq,
        fileName: data.fileName,
        zipName: data.zipName,
        hasIcon: data.hasIcon,
        iconURL: data.iconURL,
        assets: { iconImg: null, customImg: null, bgImg: null },
        style: makeStyle({
          name: data.fileName,
          sub: data.description || "",
          bgImage: "",
          customIcon: ""
        })
      };
      if (data.iconURL) {
        try {
          pack.assets.iconImg = await loadImage(data.iconURL);
        } catch (e) {
          pack.assets.iconImg = null;
        }
      }
      state.packs.push(pack);
      if (!state.active) state.active = pack.id;
      if (data.warning) toast("Heads up", data.warning, "bad");
    } catch (e) {
      toast("Could not read that pack", e.message || String(e), "bad");
    }
    await tick();
  }
  if (showProg) {
    bar.hidden = true;
    txt.hidden = true;
    fill.style.width = "0%";
  }
  renderList();
  buildPanels();
  await renderPreview();
}

async function addFontFile(file) {
  try {
    const key = await loadFontFile(file);
    const packs = state.packs.length ? state.packs : [];
    if (packs.length) {
      const target = state.applyAll ? packs : packs.filter((p) => p.id === state.active);
      (target.length ? target : packs).forEach((p) => {
        p.style.fontKey = key;
      });
      if (!packs.some((p) => p.id === state.active) || !packs.length) {
        state.fontFallback = key;
      }
    } else {
      state.fontFallback = key;
    }
    toast("Font loaded", fontLabel(key) + " is ready. Chosen for the current card.", "ok");
    renderFonts();
    renderList();
    buildPanels();
    await renderPreview();
  } catch (e) {
    toast("Font not loaded", e.message || String(e), "bad");
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load the image"));
    img.src = src;
  });
}

async function renderList() {
  const list = el("packList");
  list.innerHTML = "";
  if (!state.packs.length) {
    el("emptyHint").hidden = false;
    return;
  }
  el("emptyHint").hidden = true;
  for (const pack of state.packs) {
    const li = document.createElement("li");
    li.className = "pack" + (pack.id === state.active ? " on" : "");
    li.tabIndex = 0;
    li.dataset.id = pack.id;
    const src = pack.style.customIcon ? pack.style.customIcon : pack.iconURL;
    li.innerHTML =
      (src
        ? "<img class='thumb' src='" + src + "' alt=''>"
        : "<span class='thumb'></span>") +
      "<span class='meta'><span class='nm'>" +
      escapeHTML(pack.style.name || pack.fileName) +
      "</span><span class='src'>" +
      escapeHTML(pack.zipName) +
      (pack.hasIcon ? "" : " (no pack.png)") +
      "</span></span>" +
      "<button class='kill' title='Remove' aria-label='Remove " +
      escapeHTML(pack.fileName) +
      "'>" +
      icon("trash", 18) +
      "</button>";
    li.addEventListener("click", (e) => {
      if (e.target.closest(".kill")) return;
      selectPack(pack.id);
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectPack(pack.id);
      }
    });
    qs(".kill", li).addEventListener("click", (e) => {
      e.stopPropagation();
      removePack(pack.id);
    });
    list.appendChild(li);
  }
}

function selectPack(id) {
  state.active = id;
  renderList();
  buildPanels();
  renderPreview();
}

function removePack(id) {
  const at = state.packs.findIndex((p) => p.id === id);
  if (at < 0) return;
  state.packs.splice(at, 1);
  if (state.active === id) state.active = state.packs.length ? state.packs[Math.max(0, at - 1)].id : null;
  renderList();
  buildPanels();
  renderPreview();
}

let previewSeq = 0;

async function renderPreview() {
  const pack = activePack();
  const canvas = el("preview");
  if (!pack) {
    const ctx = canvas.getContext("2d");
    canvas.width = 480;
    canvas.height = 160;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const mine = ++previewSeq;
  const box = qs(".stage");
  const avail = Math.max(160, (box ? box.clientWidth : 720) - 90);
  const w = pack.style.width;
  const fit = Math.min(1, avail / w);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const s = Math.max(0.25, fit * dpr);
  await paintCard(canvas, pack.style, pack.assets, s);
  if (mine !== previewSeq) return;
  canvas.style.width = Math.round(w * fit * state.zoom) + "px";
  canvas.style.height = "auto";
  el("cardSize").textContent = w + " x " + pack.style.height + " px";
  updateFitMeter(pack);
}

function updateFitMeter(pack) {
  const bar = el("fitFill");
  const txt = el("fitMeter");
  if (!bar || !txt) return;
  const L = measureCard(pack.style);
  const avail = Math.max(1, Math.round(L.textWidth));
  const full = Math.round(L.fullW);
  const pct = Math.max(0, Math.min(100, Math.round((full / avail) * 100)));
  bar.style.width = pct + "%";
  bar.classList.toggle("over", full > avail && !pack.style.shrink);
  bar.classList.toggle("shrunk", full > avail && !!pack.style.shrink);
  if (!pack.style.name) {
    txt.textContent = "Type a pack name to measure it.";
  } else if (full > avail && pack.style.shrink) {
    txt.textContent = "Name is " + full + " px in " + avail + " px, shrunk to fit.";
  } else if (full > avail) {
    txt.textContent = "Name is " + full + " px in " + avail + " px, it overflows.";
  } else {
    txt.textContent = "Name is " + full + " px, " + (avail - full) + " px to spare.";
  }
}

function setZoom(z) {
  state.zoom = Math.max(0.25, Math.min(3, Math.round(z * 100) / 100));
  const lbl = el("zoomLabel");
  if (lbl) lbl.textContent = Math.round(state.zoom * 100) + "%";
  renderPreview();
}

function controlsSchema() {
  return [
    {
      title: "Text",
      iconName: "card-text",
      open: true,
      fields: [
        { k: "name", label: "Pack name", type: "text" },
        { k: "sub", label: "Second line", type: "text" },
        {
          k: "align",
          label: "Alignment",
          type: "seg",
          options: [
            { v: "left", iconName: "text-align-left", title: "Left" },
            { v: "center", iconName: "text-align-center", title: "Center" },
            { v: "right", iconName: "text-align-right", title: "Right" }
          ]
        },
        { k: "fontKey", label: "Font", type: "font" },
        { k: "fontSize", label: "Name size", type: "number", min: 8, max: 160, unit: "px" },
        { k: "subSize", label: "Second line size", type: "number", min: 6, max: 120, unit: "px" },
        { k: "textColor", label: "Text colour", type: "color" },
        { k: "bold", label: "Bold", type: "check" },
        { k: "shrink", label: "Shrink long text to fit", type: "check" },
        { k: "outlineOn", label: "Outline", type: "check" },
        { k: "outlineColor", label: "Outline colour", type: "color", showIf: "outlineOn" },
        { k: "outlineWidth", label: "Outline width", type: "number", min: 0, max: 20, unit: "px", showIf: "outlineOn" },
        { k: "textShadowOn", label: "Text shadow", type: "check" },
        { k: "textShadowColor", label: "Shadow colour", type: "color", showIf: "textShadowOn" },
        { k: "textShadowOffset", label: "Shadow offset", type: "number", min: 0, max: 20, unit: "px", showIf: "textShadowOn" }
      ]
    },
    {
      title: "Icon",
      iconName: "image",
      open: true,
      fields: [
        { k: "iconShow", label: "Show icon", type: "check" },
        { k: "iconSize", label: "Icon size", type: "number", min: 0, max: 600, unit: "px", showIf: "iconShow" },
        {
          k: "iconShape",
          label: "Shape",
          type: "seg",
          showIf: "iconShow",
          options: [
            { v: "square", iconName: "square", title: "Square" },
            { v: "rounded", iconName: "shapes", title: "Rounded" },
            { v: "circle", iconName: "circle", title: "Circle" }
          ]
        },
        { k: "iconRadius", label: "Corner radius", type: "number", min: 0, max: 200, unit: "px", showIf: "iconShow", showIfVal: "iconShape", showIfEq: "rounded" },
        { k: "iconPixelated", label: "Pixelated (crisp)", type: "check", showIf: "iconShow" },
        { k: "__customIcon", label: "Icon image", type: "image", showIf: "iconShow" }
      ]
    },
    {
      title: "Card",
      iconName: "card",
      open: true,
      fields: [
        { k: "width", label: "Width", type: "number", min: 120, max: 3840, unit: "px" },
        { k: "height", label: "Height", type: "number", min: 48, max: 2160, unit: "px" },
        { k: "padding", label: "Padding", type: "number", min: 0, max: 200, unit: "px" },
        { k: "gap", label: "Icon gap", type: "number", min: 0, max: 200, unit: "px", showIf: "iconShow" },
        {
          k: "layout",
          label: "Layout",
          type: "seg",
          options: [
            { v: "icon-left", iconName: "layout", title: "Icon left" },
            { v: "icon-top", iconName: "card", title: "Icon on top" }
          ]
        },
        { k: "radius", label: "Corner radius", type: "number", min: 0, max: 300, unit: "px" },
        { k: "borderOn", label: "Border", type: "check" },
        { k: "borderColor", label: "Border colour", type: "color", showIf: "borderOn" },
        { k: "borderWidth", label: "Border width", type: "number", min: 0, max: 40, unit: "px", showIf: "borderOn" },
        { k: "shadowOn", label: "Shadow", type: "check" },
        { k: "shadowColor", label: "Shadow colour", type: "color", showIf: "shadowOn" },
        { k: "shadowOffset", label: "Shadow offset", type: "number", min: 0, max: 60, unit: "px", showIf: "shadowOn" },
        { k: "shadowBlur", label: "Shadow blur", type: "number", min: 0, max: 60, unit: "px", showIf: "shadowOn" }
      ]
    },
    {
      title: "Background",
      iconName: "image-2-plus",
      open: false,
      fields: [
        { k: "bgOn", label: "Background", type: "check" },
        {
          k: "bgType",
          label: "Type",
          type: "seg",
          showIf: "bgOn",
          options: [
            { v: "solid", iconName: "square", title: "Solid" },
            { v: "gradient", iconName: "shapes", title: "Gradient" },
            { v: "image", iconName: "image", title: "Image" }
          ]
        },
        { k: "bgColor", label: "Colour", type: "color", showIf: "bgOn", showIfVal: "bgType", showIfNotEq: ["gradient", "image"] },
        { k: "bgColor", label: "Colour from", type: "color", showIf: "bgOn", showIfVal: "bgType", showIfEq: "gradient" },
        { k: "bgColor2", label: "Colour to", type: "color", showIf: "bgOn", showIfVal: "bgType", showIfEq: "gradient" },
        { k: "bgAngle", label: "Angle", type: "number", min: 0, max: 360, unit: "deg", showIf: "bgOn", showIfVal: "bgType", showIfEq: "gradient" },
        { k: "__bgImage", label: "Background image", type: "image", showIf: "bgOn", showIfVal: "bgType", showIfEq: "image" },
        { k: "bgOpacity", label: "Opacity", type: "number", min: 0, max: 100, unit: "%", showIf: "bgOn" }
      ]
    }
  ];
}

function fieldVisible(field, style) {
  if (field.showIf && !style[field.showIf]) return false;
  if (field.showIfVal) {
    const v = style[field.showIfVal];
    if (field.showIfEq !== undefined && v !== field.showIfEq) return false;
    if (field.showIfNotEq && field.showIfNotEq.indexOf(v) >= 0) return false;
  }
  return true;
}

function buildPanels() {
  const host = el("panels");
  const pack = activePack();
  const style = pack ? pack.style : makeStyle({});
  host.innerHTML = "";
  const all = controlsSchema();

  const head = document.createElement("div");
  head.className = "col-head";
  head.innerHTML = "<span>" + (pack ? "CARD SETTINGS" : "NO CARD SELECTED") + "</span>";
  host.appendChild(head);

  if (!pack) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Drop a pack zip to start.";
    host.appendChild(empty);
    return;
  }

  const applyRow = document.createElement("div");
  applyRow.className = "body";
  applyRow.innerHTML =
    '<label class="chk"><input type="checkbox" id="applyAll"' +
    (state.applyAll ? " checked" : "") +
    '> Apply every change to all cards</label>' +
    '<div class="grid2"><button class="pill" id="copyStyleAll">' +
    icon("copy", 16) +
    "<span>To all</span></button>" +
    '<button class="pill" id="resetStyle">' +
    icon("refresh", 16) +
    "<span>Reset</span></button></div>" +
    '<button class="pill" id="fontToAll" style="width:100%">' +
    icon("card-text", 16) +
    "<span>Font to all cards</span></button>";
  host.appendChild(applyRow);
  qs("#applyAll", applyRow).addEventListener("change", (e) => {
    state.applyAll = e.target.checked;
    toast(e.target.checked ? "Apply to all on" : "Apply to all off", "");
  });
  qs("#copyStyleAll", applyRow).addEventListener("click", () => {
    state.packs.forEach((p) => {
      p.style = styleToPack(pack.style);
    });
    buildPanels();
    renderPreview();
    toast("Style copied", "Your current look is now on all " + state.packs.length + " cards.", "ok");
  });
  qs("#fontToAll", applyRow).addEventListener("click", () => {
    state.packs.forEach((p) => {
      p.style.fontKey = pack.style.fontKey;
    });
    buildPanels();
    renderPreview();
    toast("Font applied", fontLabel(pack.style.fontKey) + " is now on all " + state.packs.length + " cards.", "ok");
  });
  qs("#resetStyle", applyRow).addEventListener("click", () => {
    const keep = {
      name: pack.style.name,
      sub: pack.style.sub,
      customIcon: pack.style.customIcon,
      bgImage: pack.style.bgImage
    };
    const fresh = makeStyle(keep);
    if (state.applyAll) state.packs.forEach((p) => (p.style = styleToPack(fresh)));
    else pack.style = fresh;
    buildPanels();
    renderPreview();
    toast("Reset", "Card settings are back to the defaults.");
  });

  all.forEach((section, si) => {
    const det = document.createElement("details");
    det.className = "panel";
    det.open = !!section.open;
    const sum = document.createElement("summary");
    sum.innerHTML = "<span>" + section.title + "</span>";
    det.appendChild(sum);
    const body = document.createElement("div");
    body.className = "body";
    det.appendChild(body);

    section.fields.forEach((field) => {
      if (!fieldVisible(field, style)) return;
      body.appendChild(buildField(field, style));
    });

    if (si === 0) {
      const meter = document.createElement("div");
      meter.className = "meter";
      meter.innerHTML = '<div class="fill" id="fitFill" style="width:0%"></div>';
      const note = document.createElement("p");
      note.className = "note";
      note.id = "fitMeter";
      note.textContent = "Type a pack name to measure it.";
      body.appendChild(meter);
      body.appendChild(note);
    }

    if (si === all.length - 1) {
      const btn = document.createElement("button");
      btn.className = "pill";
      btn.style.width = "100%";
      btn.innerHTML = icon("save", 16) + "<span>Save this as a preset</span>";
      btn.addEventListener("click", openPresetDialog);
      body.appendChild(btn);
    }

    host.appendChild(det);
  });
}

function buildField(field, style) {
  const row = document.createElement("div");
  row.className = "row";
  row.dataset.field = field.k;

  const label = document.createElement("label");
  label.textContent = field.label;
  row.appendChild(label);

  if (field.type === "check") {
    const wrap = document.createElement("label");
    wrap.className = "chk";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = !!style[field.k];
    box.addEventListener("change", () => {
      setField(field.k, box.checked);
      buildPanels();
    });
    wrap.appendChild(box);
    wrap.appendChild(document.createTextNode(""));
    row.innerHTML = "<label>" + field.label + "</label>";
    row.appendChild(wrap);
    return row;
  }

  if (field.type === "seg") {
    row.innerHTML = "<label>" + field.label + "</label>";
    const seg = document.createElement("div");
    seg.className = "seg";
    field.options.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.title = o.title;
      b.setAttribute("aria-label", o.title);
      b.setAttribute("aria-pressed", style[field.k] === o.v ? "true" : "false");
      b.innerHTML = icon(o.iconName, 16) + "<span>" + o.title + "</span>";
      b.addEventListener("click", () => {
        setField(field.k, o.v);
        buildPanels();
        renderPreview();
      });
      seg.appendChild(b);
    });
    row.appendChild(seg);
    return row;
  }

  if (field.type === "font") {
    row.innerHTML = "<label>" + field.label + "</label>";
    const sel = document.createElement("select");
    const cur = style[field.k];
    const list = fontList();
    if (cur && !list.some((f) => f.key === cur)) {
      const missing = document.createElement("option");
      missing.value = cur;
      missing.textContent = cur + " (not loaded)";
      sel.appendChild(missing);
    }
    list.forEach((f) => {
      const o = document.createElement("option");
      o.value = f.key;
      o.textContent = f.label + (f.kind === "pixel" ? "  [pixel]" : f.kind === "custom" ? "  [your font]" : "  [clean]");
      sel.appendChild(o);
    });
    sel.value = cur;
    sel.addEventListener("change", () => {
      setField("fontKey", sel.value);
      renderPreview();
    });
    row.appendChild(sel);
    return row;
  }

  if (field.type === "color") {
    row.innerHTML = "<label>" + field.label + "</label>";
    const input = document.createElement("input");
    input.type = "color";
    const v = style[field.k];
    input.value = /^#[0-9a-f]{6}$/i.test(v) ? v : "#000000";
    input.addEventListener("input", () => {
      setField(field.k, input.value);
      renderPreview();
    });
    row.appendChild(input);
    return row;
  }

  if (field.type === "image") {
    const wrap = document.createElement("div");
    wrap.className = "stack";
    const key = field.k === "__customIcon" ? "customIcon" : "bgImage";
    const pick = document.createElement("button");
    pick.className = "pill";
    pick.innerHTML = icon("upload", 16) + "<span>Choose image</span>";
    pick.addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/png,image/jpeg,image/webp,image/gif";
      inp.addEventListener("change", async () => {
        const file = inp.files && inp.files[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
          toast("Image too big", "Keep background and icon images under 8 MB.", "bad");
          return;
        }
        const url = await readFileURL(file);
        const pack = activePack();
        if (!pack) return;
        if (state.applyAll) state.packs.forEach((p) => (p.style[key] = url));
        else pack.style[key] = url;
        try {
          const img = await loadImage(url);
          if (key === "customIcon") pack.assets.customImg = img;
          else pack.assets.bgImg = img;
        } catch (e) {
          toast("Could not read that image", file.name, "bad");
        }
        renderList();
        buildPanels();
        renderPreview();
      });
      inp.click();
    });
    const clear = document.createElement("button");
    clear.className = "pill";
    clear.innerHTML = icon("eraser", 16) + "<span>Use the pack icon again</span>";
    clear.addEventListener("click", () => {
      const pack = activePack();
      if (!pack) return;
      if (state.applyAll) state.packs.forEach((p) => (p.style[key] = ""));
      else pack.style[key] = "";
      if (key === "customIcon") {
        if (!state.applyAll) pack.assets.customImg = null;
        else state.packs.forEach((p) => (p.assets.customImg = null));
      } else {
        if (!state.applyAll) pack.assets.bgImg = null;
        else state.packs.forEach((p) => (p.assets.bgImg = null));
      }
      buildPanels();
      renderPreview();
    });
    wrap.appendChild(pick);
    wrap.appendChild(clear);
    if (style[key]) {
      const prev = document.createElement("img");
      prev.src = style[key];
      prev.alt = "";
      prev.style.maxWidth = "100%";
      prev.style.imageRendering = "pixelated";
      prev.style.border = "2px solid #333a47";
      wrap.appendChild(prev);
    }
    row.innerHTML = "<label>" + field.label + "</label>";
    row.style.flexWrap = "wrap";
    row.appendChild(wrap);
    return row;
  }

  if (field.type === "number") {
    const val = document.createElement("span");
    val.className = "val";
    val.textContent = style[field.k] + (field.unit || "");
    const range = document.createElement("input");
    range.type = "range";
    range.min = field.min;
    range.max = field.max;
    range.value = style[field.k];
    range.setAttribute("aria-label", field.label);
    range.addEventListener("input", () => {
      const v = parseInt(range.value, 10);
      val.textContent = v + (field.unit || "");
      setField(field.k, v);
    });
    const num = document.createElement("input");
    num.type = "number";
    num.min = field.min;
    num.max = field.max;
    num.value = style[field.k];
    num.style.width = "58px";
    num.setAttribute("aria-label", field.label + " exact value");
    num.addEventListener("change", () => {
      let v = parseInt(num.value, 10);
      if (isNaN(v)) v = parseInt(range.value, 10);
      v = Math.max(field.min, Math.min(field.max, v));
      num.value = v;
      range.value = v;
      val.textContent = v + (field.unit || "");
      setField(field.k, v);
    });
    const box = document.createElement("div");
    box.className = "stack";
    box.style.flex = "1";
    box.style.minWidth = "0";
    box.style.flexDirection = "row";
    box.style.gap = "6px";
    box.style.alignItems = "center";
    box.appendChild(range);
    box.appendChild(num);
    row.appendChild(val);
    row.appendChild(box);
    return row;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.value = style[field.k] == null ? "" : style[field.k];
  input.placeholder = field.placeholder || "";
  input.addEventListener("input", () => {
    setField(field.k, input.value);
    if (field.k === "name" || field.k === "sub") renderListThrottled();
  });
  row.appendChild(input);
  return row;
}

let listTimer = null;
function renderListThrottled() {
  if (listTimer) clearTimeout(listTimer);
  listTimer = setTimeout(() => {
    const pack = activePack();
    if (!pack) return;
    const node = qs(".pack[data-id='" + pack.id + "'] .nm");
    if (node) node.textContent = pack.style.name || pack.fileName;
  }, 200);
}

function setField(key, value) {
  const pack = activePack();
  if (!pack) return;
  if (state.applyAll) state.packs.forEach((p) => (p.style[key] = value));
  else pack.style[key] = value;
  if (key === "width" || key === "height") schedulePreview();
  else schedulePreview();
}

let previewTimer = null;
function schedulePreview() {
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 40);
}

function readFileURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error("could not read the file"));
    fr.readAsDataURL(file);
  });
}

function setFieldFromPreset(style) {
  const pack = activePack();
  if (!pack) return;
  const target = state.applyAll ? state.packs : [pack];
  target.forEach((p) => {
    const keep = { name: p.style.name, sub: p.style.sub, customIcon: p.style.customIcon, bgImage: p.style.bgImage };
    p.style = Object.assign(makeStyle(keep), styleToPack(style));
    if (styleToPack(style).customIcon === undefined) p.style.customIcon = keep.customIcon;
  });
  buildPanels();
  renderPreview();
}

function renderPresets() {
  const host = el("presetList");
  const list = loadPresets();
  host.innerHTML = "";
  if (!list.length) {
    host.innerHTML = "<p class='note'>No presets saved yet.</p>";
    return;
  }
  list.forEach((p) => {
    const row = document.createElement("div");
    row.className = "fontitem";
    row.innerHTML =
      '<span class="preview" style="font-family:' +
      cssFamily(p.style.fontKey) +
      '">' +
      escapeHTML(p.name) +
      "</span>" +
      '<button class="kill" title="Delete preset" aria-label="Delete preset ' +
      escapeHTML(p.name) +
      '">' +
      icon("trash", 16) +
      "</button>";
    row.addEventListener("click", (e) => {
      if (e.target.closest(".kill")) return;
      setFieldFromPreset(p.style);
      toast("Preset applied", p.name, "ok");
    });
    qs(".kill", row).addEventListener("click", (e) => {
      e.stopPropagation();
      removePreset(p.name);
      renderPresets();
      toast("Preset deleted", p.name);
    });
    host.appendChild(row);
  });
}

function openPresetDialog() {
  const wrap = document.createElement("div");
  wrap.className = "modal-wrap";
  wrap.innerHTML =
    '<div class="modal" role="dialog" aria-modal="true" aria-label="Save preset"><h2>' +
    icon("save", 18) +
    "SAVE PRESET</h2><div class='body'>" +
    "<label class='drop-hint' for='presetName'>Name your look</label>" +
    "<input type='text' id='presetName' placeholder='My video look' maxlength='40'>" +
    "<p class='note'>Presets live in this browser only. Nothing leaves your PC.</p>" +
    "</div><div class='foot'>" +
    "<button class='pill ghost' id='pCancel'>Cancel</button>" +
    "<button class='pill primary' id='pSave'>Save</button>" +
    "</div></div>";
  document.body.appendChild(wrap);
  const input = qs("#presetName", wrap);
  input.focus();
  const close = () => wrap.remove();
  qs("#pCancel", wrap).addEventListener("click", close);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) close();
  });
  qs("#pSave", wrap).addEventListener("click", () => {
    const pack = activePack();
    if (!pack) {
      close();
      return;
    }
    const res = upsertPreset(input.value, pack.style);
    close();
    renderPresets();
    if (!res.ok) toast("Could not save", "Browser storage is full or blocked.", "bad");
    else toast("Preset saved", res.name + " is ready next time.", "ok");
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") qs("#pSave", wrap).click();
    if (e.key === "Escape") close();
  });
}

function renderFonts() {
  const host = el("fontList");
  host.innerHTML = "";
  const list = fontList();
  list.forEach((f) => {
    const row = document.createElement("div");
    row.className = "fontitem";
    row.innerHTML =
      '<span class="preview" style="font-family:' +
      cssFamily(f.key) +
      '">' +
      escapeHTML(f.label) +
      "</span>" +
      (f.custom
        ? '<button class="kill" title="Remove font" aria-label="Remove ' + escapeHTML(f.label) + '">' + icon("x", 16) + "</button>"
        : "");
    if (f.custom) {
      qs(".kill", row).addEventListener("click", () => {
        removeCustomFont(f.key);
        state.packs.forEach((p) => {
          if (p.style.fontKey === f.key) p.style.fontKey = "Minecraft";
        });
        renderFonts();
        buildPanels();
        renderPreview();
        toast("Font removed", f.label, "ok");
      });
    }
    host.appendChild(row);
  });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function exportCurrentPNG() {
  const pack = activePack();
  if (!pack) {
    toast("No card selected", "Add a pack first.", "bad");
    return;
  }
  setBusy(true);
  try {
    const canvas = await renderCardCanvas(pack.style, pack.assets, state.scale);
    const blob = await canvasToBlob(canvas);
    if (!blob) throw new Error("canvas could not be encoded");
    downloadBlob(blob, sanitizeFileName(pack.style.name || pack.fileName) + "@" + state.scale + "x.png");
    toast("Saved", state.scale + "x PNG: " + canvas.width + " x " + canvas.height, "ok");
  } catch (e) {
    toast("Export failed", e.message || String(e), "bad");
  } finally {
    setBusy(false);
  }
}

async function copyCurrentPNG() {
  const pack = activePack();
  if (!pack) {
    toast("No card selected", "Add a pack first.", "bad");
    return;
  }
  if (!navigator.clipboard || typeof ClipboardItem === "undefined" || !window.isSecureContext) {
    toast("Clipboard blocked", "Browsers only allow PNG copy on https or localhost. Use Export PNG instead.", "bad");
    return;
  }
  setBusy(true);
  try {
    const canvas = await renderCardCanvas(pack.style, pack.assets, state.scale);
    const blob = await canvasToBlob(canvas);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast("Copied", "PNG is on your clipboard.", "ok");
  } catch (e) {
    toast("Copy failed", e.message || String(e), "bad");
  } finally {
    setBusy(false);
  }
}

async function exportAllZip() {
  if (!state.packs.length) {
    toast("No cards", "Add at least one pack.", "bad");
    return;
  }
  setBusy(true);
  try {
    const zip = new JSZip();
    const used = {};
    for (const pack of state.packs) {
      const canvas = await renderCardCanvas(pack.style, pack.assets, state.scale);
      const blob = await canvasToBlob(canvas);
      if (!blob) continue;
      let base = sanitizeFileName(pack.style.name || pack.fileName);
      const n = (used[base] = (used[base] || 0) + 1);
      zip.file((n > 1 ? base + " (" + n + ")" : base) + "@" + state.scale + "x.png", blob);
    }
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, "PackPlate-cards-" + state.scale + "x.zip");
    toast("Saved", state.packs.length + " PNG files zipped.", "ok");
  } catch (e) {
    toast("Export failed", e.message || String(e), "bad");
  } finally {
    setBusy(false);
  }
}

async function exportFrame(mode) {
  const pack = activePack();
  if (!pack) {
    toast("No card selected", "Add a pack first.", "bad");
    return;
  }
  const w = mode === "vertical" ? 1080 : 1920;
  const h = mode === "vertical" ? 1920 : 1080;
  const margin = mode === "vertical" ? 120 : 80;
  setBusy(true);
  try {
    const canvas = await renderFrame(pack.style, pack.assets, w, h, margin);
    const blob = await canvasToBlob(canvas);
    if (!blob) throw new Error("canvas could not be encoded");
    downloadBlob(blob, sanitizeFileName(pack.style.name || pack.fileName) + "-" + w + "x" + h + ".png");
    toast("Saved", w + " x " + h + " with the card at top centre, rest transparent.", "ok");
  } catch (e) {
    toast("Export failed", e.message || String(e), "bad");
  } finally {
    setBusy(false);
  }
}

function initDrops() {
  const overlay = el("dropOverlay");
  let depth = 0;
  const hot = (on) => {
    overlay.hidden = !on;
    qs(".dropzone").classList.toggle("hot", on);
  };
  window.addEventListener("dragenter", (e) => {
    e.preventDefault();
    depth++;
    hot(true);
  });
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("dragleave", (e) => {
    e.preventDefault();
    depth = Math.max(0, depth - 1);
    if (!depth) hot(false);
  });
  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    depth = 0;
    hot(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      await addFiles(e.dataTransfer.files);
    }
  });
}

async function init() {
  try {
    await loadBundledFonts();
  } catch (e) {
    toast("Fonts did not load", "The site still works with fallback fonts.", "bad");
  }
  ["packList", "preview", "toasts", "panels", "presetList", "fontList", "cardSize", "emptyHint", "dropOverlay", "repoLink"].forEach((id) => {
    dom[id] = el(id);
  });

  qs(".dropzone").addEventListener("click", () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".zip,application/zip";
    inp.multiple = true;
    inp.addEventListener("change", async () => {
      if (inp.files && inp.files.length) await addFiles(inp.files);
    });
    inp.click();
  });

  qs(".dropzone").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      qs(".dropzone").click();
    }
  });

  qs("#btnFontPick").addEventListener("click", () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".ttf,.otf,.woff2";
    inp.addEventListener("change", async () => {
      if (inp.files && inp.files[0]) await addFontFile(inp.files[0]);
    });
    inp.click();
  });

  qsa("[data-scale]").forEach((b) => {
    b.addEventListener("click", () => {
      state.scale = parseInt(b.dataset.scale, 10);
      qsa("[data-scale]").forEach((o) => o.setAttribute("aria-pressed", o === b ? "true" : "false"));
    });
  });

  qs("#btnPng").addEventListener("click", exportCurrentPNG);
  qs("#btnCopy").addEventListener("click", copyCurrentPNG);
  qs("#btnZip").addEventListener("click", exportAllZip);
  qs("#btnFrameWide").addEventListener("click", () => exportFrame("wide"));
  qs("#btnFrameTall").addEventListener("click", () => exportFrame("vertical"));

  qs("#btnAboutFoot").addEventListener("click", openAbout);
  qs("#btnDownloadApp").addEventListener("click", downloadApp);
  qs("#btnDownloadApp2").addEventListener("click", downloadApp);
  qs("#zoomOut").addEventListener("click", () => setZoom(state.zoom - 0.25));
  qs("#zoomIn").addEventListener("click", () => setZoom(state.zoom + 0.25));
  qs("#zoomLabel").addEventListener("click", () => setZoom(1));
  qs("#btnResetPacks").addEventListener("click", () => {
    if (!state.packs.length) return;
    state.packs = [];
    state.active = null;
    renderList();
    buildPanels();
    renderPreview();
    toast("Cleared", "All cards removed. Presets are untouched.");
  });

  window.addEventListener("resize", () => {
    if (state.active) renderPreview();
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select")) return;
    const list = state.packs;
    if (!list.length) return;
    const at = list.findIndex((p) => p.id === state.active);
    if (e.key === "ArrowDown" && at < list.length - 1) {
      e.preventDefault();
      selectPack(list[at + 1].id);
    }
    if (e.key === "ArrowUp" && at > 0) {
      e.preventDefault();
      selectPack(list[at - 1].id);
    }
    if (e.key === "Delete" || (e.key === "Backspace" && at >= 0)) {
      e.preventDefault();
      removePack(list[at].id);
    }
  });

  renderPresets();
  renderFonts();
  renderList();
  buildPanels();
  renderPreview();
  initDrops();
}

function openAbout() {
  const wrap = document.createElement("div");
  wrap.className = "modal-wrap";
  wrap.innerHTML =
    '<div class="modal" role="dialog" aria-modal="true" aria-label="About PackPlate">' +
    "<h2>" +
    icon("circle-info", 18) +
    "ABOUT</h2>" +
    "<div class='body about'>" +
    "<p>PackPlate makes name cards for Minecraft texture packs. Drop in resource pack zips, edit the card, export a PNG with a transparent background and drop it into your video.</p>" +
    "<h3>Open source</h3>" +
    "<p>Free and MIT licensed. No accounts, no tracking, no network calls. Everything runs from this folder.</p>" +
    "<p>Source code: <a href='https://github.com/frteddz/PackPlate' id='aboutRepo' target='_blank' rel='noopener noreferrer'>https://github.com/frteddz/PackPlate</a></p>" +
    "<h3>Keys</h3>" +
    "<ul><li><kbd>Up</kbd> <kbd>Down</kbd> pick a card</li><li><kbd>Delete</kbd> remove the card</li></ul>" +
    "<h3>Credits</h3>" +
    "<ul><li>Icons: pixelarticons.com, MIT</li><li>Fonts: Press Start 2P, Silkscreen, Pixelify Sans, VT323, Inter, all SIL Open Font License</li><li>Zip handling: JSZip, MIT or GPL</li></ul>" +
    "</div><div class='foot'>" +
    "<button class='pill primary' id='aClose'>Close</button></div></div>";
  document.body.appendChild(wrap);
  qs("#aClose", wrap).addEventListener("click", () => wrap.remove());
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) wrap.remove();
  });
  document.addEventListener("keydown", function esc(ev) {
    if (ev.key === "Escape") {
      wrap.remove();
      document.removeEventListener("keydown", esc);
    }
  });
}

document.addEventListener("DOMContentLoaded", init);