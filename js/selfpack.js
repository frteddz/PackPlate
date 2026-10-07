const APP_VERSION = "1.0.0";
const APP_FOLDER = "PackPlate";

function buildAppZip() {
  if (typeof FILE_BUNDLE === "undefined" || !FILE_BUNDLE) {
    return Promise.reject(new Error("bundle data is missing"));
  }
  const zip = new JSZip();
  const folder = zip.folder(APP_FOLDER);
  const names = Object.keys(FILE_BUNDLE);
  names.forEach((name) => {
    const entry = FILE_BUNDLE[name];
    if (entry.t === "b") {
      folder.file(name, base64ToBytes(entry.d));
    } else {
      folder.file(name, entry.d);
    }
  });
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function downloadApp() {
  setBusy(true);
  buildAppZip()
    .then((blob) => {
      downloadBlob(blob, "PackPlate-" + APP_VERSION + ".zip");
      toast("PackPlate downloaded", "Unzip it anywhere, then open index.html.", "ok");
    })
    .catch((e) => {
      toast("Download failed", e.message || String(e), "bad");
    })
    .finally(() => setBusy(false));
}