const DEFAULTS = {
  name: "",
  sub: "",
  fontKey: "Minecraft",
  fontSize: 34,
  subSize: 18,
  textColor: "#ffffff",
  bold: false,
  align: "left",
  layout: "icon-left",
  shrink: true,
  outlineOn: true,
  outlineColor: "#101010",
  outlineWidth: 4,
  textShadowOn: false,
  textShadowColor: "#000000",
  textShadowOffset: 3,
  width: 640,
  height: 160,
  padding: 24,
  gap: 18,
  radius: 0,
  borderOn: true,
  borderColor: "#ffffff",
  borderWidth: 4,
  shadowOn: false,
  shadowColor: "#000000",
  shadowOffset: 6,
  shadowBlur: 0,
  bgOn: true,
  bgType: "solid",
  bgColor: "#1b1b1f",
  bgColor2: "#3b2f5c",
  bgAngle: 160,
  bgOpacity: 92,
  bgImage: "",
  iconShow: true,
  iconSize: 96,
  iconShape: "square",
  iconPixelated: true,
  iconRadius: 8,
  customIcon: ""
};

const STYLE_KEYS = Object.keys(DEFAULTS).filter((k) => k !== "name" && k !== "sub" && k !== "customIcon");

function makeStyle(patch) {
  const s = Object.assign({}, DEFAULTS);
  if (patch) {
    for (const k of STYLE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(patch, k)) s[k] = patch[k];
    }
    if (Object.prototype.hasOwnProperty.call(patch, "name")) s.name = patch.name;
    if (Object.prototype.hasOwnProperty.call(patch, "sub")) s.sub = patch.sub;
  }
  return s;
}

function styleToPack(style) {
  const out = {};
  for (const k of STYLE_KEYS) out[k] = style[k];
  out.name = style.name;
  out.sub = style.sub;
  return out;
}

function hexToRgba(hex, alpha) {
  const h = String(hex || "#000000").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6) || "000000", 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

function fontSpec(style, px) {
  return (style.bold ? 700 : weightFor(style.fontKey, false)) + " " + px + "px " + cssFamily(style.fontKey);
}

function shapePath(ctx, x, y, w, h, radius, shape) {
  ctx.beginPath();
  const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
  if (shape === "circle") {
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    return;
  }
  if (r <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function iconCorner(style) {
  if (style.iconShape === "square") return 0;
  if (style.iconShape === "circle") return 9999;
  return style.iconRadius;
}

function drawPlaceholderIcon(ctx, x, y, size) {
  const u = size / 16;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#2b2f38";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#6ec24a";
  ctx.fillRect(2 * u, 5 * u, 12 * u, 9 * u);
  ctx.fillStyle = "#8bd85f";
  ctx.fillRect(2 * u, 5 * u, 12 * u, 2 * u);
  ctx.fillStyle = "#4a7f30";
  ctx.fillRect(2 * u, 12 * u, 12 * u, 2 * u);
  ctx.fillStyle = "#3a3f4a";
  ctx.fillRect(5 * u, 8 * u, 3 * u, 2 * u);
  ctx.fillRect(9 * u, 8 * u, 3 * u, 2 * u);
  ctx.fillRect(7 * u, 10 * u, 3 * u, 1 * u);
  ctx.restore();
}

function drawIcon(ctx, style, x, y, size, img) {
  ctx.save();
  shapePath(ctx, x, y, size, size, iconCorner(style), style.iconShape);
  ctx.clip();
  if (img && img.complete && img.naturalWidth) {
    ctx.imageSmoothingEnabled = !style.iconPixelated;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.min(size / iw, size / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
  } else {
    drawPlaceholderIcon(ctx, x, y, size);
  }
  ctx.restore();
}

function drawBackground(ctx, style, w, h, img) {
  const op = Math.max(0, Math.min(100, style.bgOpacity)) / 100;
  ctx.save();
  ctx.globalAlpha = op;
  if (style.bgType === "solid") {
    ctx.fillStyle = style.bgColor;
  } else if (style.bgType === "gradient") {
    const a = (style.bgAngle * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const len = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
    const dx = (Math.cos(a) * len) / 2;
    const dy = (Math.sin(a) * len) / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, style.bgColor);
    g.addColorStop(1, style.bgColor2);
    ctx.fillStyle = g;
  } else if (style.bgType === "image" && img && img.complete && img.naturalWidth) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = style.bgColor;
  }
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawBody(ctx, style, w, h, bgImg) {
  const radius = style.radius;
  if (style.shadowOn) {
    ctx.save();
    ctx.shadowColor = hexToRgba(style.shadowColor, 0.85);
    ctx.shadowBlur = Math.max(0, style.shadowBlur);
    ctx.shadowOffsetX = style.shadowOffset;
    ctx.shadowOffsetY = style.shadowOffset;
    ctx.fillStyle = "#000000";
    shapePath(ctx, 0, 0, w, h, radius, "rect");
    ctx.fill();
    ctx.restore();
  }
  if (style.bgOn) {
    ctx.save();
    shapePath(ctx, 0, 0, w, h, radius, "rect");
    ctx.clip();
    drawBackground(ctx, style, w, h, bgImg);
    ctx.restore();
  }
  if (style.borderOn && style.borderWidth > 0) {
    ctx.save();
    shapePath(ctx, 0, 0, w, h, radius, "rect");
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = style.borderWidth;
    ctx.stroke();
    ctx.restore();
  }
}

function drawTextLine(ctx, style, text, x, y, px, align) {
  ctx.font = fontSpec(style, px);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = align;
  if (style.textShadowOn) {
    ctx.save();
    ctx.shadowColor = hexToRgba(style.textShadowColor, 0.9);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = style.textShadowOffset;
    ctx.shadowOffsetY = style.textShadowOffset;
    if (style.outlineOn) {
      ctx.strokeStyle = hexToRgba(style.outlineColor, 1);
      ctx.lineWidth = style.outlineWidth * 2;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = style.textColor;
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }
  if (style.outlineOn) {
    ctx.strokeStyle = hexToRgba(style.outlineColor, 1);
    ctx.lineWidth = style.outlineWidth * 2;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = style.textColor;
  ctx.fillText(text, x, y);
}

const __measureCtx = document.createElement("canvas").getContext("2d");

function layoutCard(style, ctx) {
  const mc = ctx || __measureCtx;
  const w = Math.max(80, style.width);
  const h = Math.max(48, style.height);
  const pad = Math.max(0, style.padding);
  const innerX = pad;
  const innerW = w - pad * 2;
  const innerY = pad;
  const innerH = h - pad * 2;

  const iconBox = style.iconShow ? Math.max(0, style.iconSize) : 0;
  const gap = style.iconShow ? style.gap : 0;
  const stacked = style.layout === "icon-top";

  let textLeft;
  let textWidth;
  let iconX;
  let iconY;

  if (!stacked) {
    iconX = innerX;
    iconY = innerY + (innerH - iconBox) / 2;
    textLeft = innerX + iconBox + gap;
    textWidth = Math.max(20, innerW - iconBox - gap);
  } else {
    iconX = innerX + (innerW - iconBox) / 2;
    iconY = innerY;
    textLeft = innerX;
    textWidth = innerW;
  }

  const align = style.align;
  let anchorX;
  if (align === "center") anchorX = textLeft + textWidth / 2;
  else if (align === "right") anchorX = textLeft + textWidth;
  else anchorX = textLeft;

  const hasSub = !!(style.sub && style.sub.trim());
  let nameSize = Math.max(6, style.fontSize);
  let subSize = Math.max(6, style.subSize);

  mc.font = fontSpec(style, Math.max(6, style.fontSize));
  const fullW = style.name ? mc.measureText(style.name).width : 0;

  if (style.shrink) {
    mc.font = fontSpec(style, nameSize);
    const avail = textWidth;
    const mw = mc.measureText(style.name || "").width;
    if (mw > avail && mw > 0) {
      nameSize = Math.max(8, Math.floor((nameSize * avail) / mw));
    }
    if (hasSub) {
      mc.font = fontSpec(style, subSize);
      const ms = mc.measureText(style.sub).width;
      if (ms > avail && ms > 0) {
        subSize = Math.max(7, Math.floor((subSize * avail) / ms));
      }
    }
  }

  mc.font = fontSpec(style, nameSize);
  const nameW = style.name ? mc.measureText(style.name).width : 0;
  mc.font = fontSpec(style, subSize);
  const subW = hasSub ? mc.measureText(style.sub).width : 0;

  const lineGap = Math.max(2, Math.round(nameSize * 0.18));
  const nameH = nameSize * 0.78;
  const subH = hasSub ? subSize * 0.8 : 0;
  const blockH = nameH + (hasSub ? lineGap + subH : 0);

  let blockY;
  if (stacked) {
    blockY = innerY + iconBox + gap + Math.max(0, (innerH - iconBox - gap - blockH) / 2);
  } else {
    blockY = innerY + (innerH - blockH) / 2;
  }

  return {
    w: w,
    h: h,
    pad: pad,
    innerX: innerX,
    innerW: innerW,
    innerY: innerY,
    innerH: innerH,
    iconBox: iconBox,
    gap: gap,
    stacked: stacked,
    iconX: iconX,
    iconY: iconY,
    textLeft: textLeft,
    textWidth: textWidth,
    anchorX: anchorX,
    align: align,
    hasSub: hasSub,
    nameSize: nameSize,
    subSize: subSize,
    fullW: fullW,
    nameW: nameW,
    subW: subW,
    blockY: blockY,
    nameBaseline: blockY + nameH,
    lineGap: lineGap,
    nameH: nameH,
    subH: subH
  };
}

function measureCard(style) {
  return layoutCard(style, __measureCtx);
}

function drawCard(ctx, style, assets) {
  const bgImg = assets.bgImg || null;
  const iconImg = assets.iconImg || null;
  const L = layoutCard(style, ctx);

  drawBody(ctx, style, L.w, L.h, bgImg);

  ctx.save();
  shapePath(ctx, 0, 0, L.w, L.h, style.radius, "rect");
  ctx.clip();

  if (style.name) drawTextLine(ctx, style, style.name, L.anchorX, L.nameBaseline, L.nameSize, L.align);
  if (L.hasSub) {
    drawTextLine(ctx, style, style.sub, L.anchorX, L.nameBaseline + L.lineGap + L.subH, L.subSize, L.align);
  }

  if (L.iconBox > 0) {
    drawIcon(ctx, style, L.iconX, L.iconY, L.iconBox, style.customIcon ? assets.customImg : iconImg);
  }

  ctx.restore();
}

async function paintCard(canvas, style, assets, scale) {
  const s = Math.max(1, Math.min(8, scale || 1));
  const w = Math.max(80, style.width);
  const h = Math.max(48, style.height);
  canvas.width = Math.round(w * s);
  canvas.height = Math.round(h * s);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  await ensureFontReady(style.fontKey, style.bold ? 700 : 400);
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawCard(ctx, style, assets);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

async function renderCardCanvas(style, assets, scale) {
  const c = document.createElement("canvas");
  await paintCard(c, style, assets, scale);
  return c;
}

async function renderFrame(style, assets, frameW, frameH, margin) {
  const c = document.createElement("canvas");
  c.width = frameW;
  c.height = frameH;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, frameW, frameH);
  await ensureFontReady(style.fontKey, style.bold ? 700 : 400);
  const cardW = Math.max(80, style.width);
  ctx.save();
  ctx.translate(Math.round((frameW - cardW) / 2), Math.round(margin));
  drawCard(ctx, style, assets);
  ctx.restore();
  return c;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}