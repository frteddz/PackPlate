async function readPack(file) {
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (e) {
    throw new Error(file.name + " is not a valid zip file");
  }
  const files = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  if (!files.length) throw new Error(file.name + " is an empty zip");

  const find = (base) => {
    const exact = files.filter((n) => n === base);
    if (exact.length) return exact[0];
    const nested = files.filter((n) => n.toLowerCase().endsWith("/" + base));
    nested.sort((a, b) => a.split("/").length - b.split("/").length || a.length - b.length);
    return nested[0] || null;
  };

  const iconEntry = find("pack.png");
  const metaEntry = find("pack.mcmeta");

  if (!iconEntry && !metaEntry) {
    throw new Error(file.name + " has no pack.png or pack.mcmeta, so it is not a resource pack");
  }

  let description = "";
  let metaError = "";
  if (metaEntry) {
    const raw = await zip.file(metaEntry).async("string");
    let meta;
    try {
      meta = JSON.parse(raw.replace(/^\uFEFF/, ""));
    } catch (e) {
      metaError = file.name + " has broken pack.mcmeta, name taken from the file name";
    }
    if (meta && meta.pack) {
      const d = meta.pack.description;
      if (typeof d === "string") description = d;
      else if (d && typeof d.text === "string") description = d.text;
      if (description) description = description.replace(/\n+/g, " ").trim();
    }
  }

  let iconURL = "";
  if (iconEntry) {
    const blob = await zip.file(iconEntry).async("blob");
    iconURL = await blobToDataURL(blob);
  }

  return {
    fileName: file.name.replace(/\.zip$/i, ""),
    zipName: file.name,
    iconURL: iconURL,
    hasIcon: !!iconEntry,
    description: description,
    warning: metaError
  };
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error("could not read the pack icon"));
    fr.readAsDataURL(blob);
  });
}

function dataURLToImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("no image"));
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load the image"));
    img.src = src;
  });
}

function sanitizeFileName(name) {
  const clean = String(name || "pack")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return clean || "pack";
}