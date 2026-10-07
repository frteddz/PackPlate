function setIcon(id, name, size) {
  const node = document.getElementById(id);
  if (node) node.innerHTML = icon(name, size || 18);
}

function paintStaticIcons() {
  el("brandLogo").innerHTML = icon("package", 22) + "<span>PACKPLATE</span>";
  el("leftHead").innerHTML = "<span>PACKS</span>";
  el("dzIcon").innerHTML = icon("drag-and-drop", 34);
  el("dropHead").innerHTML = icon("upload", 20) + "<span>DROP PACKS</span>";
  el("presetHead").innerHTML = "<span>FONTS</span>";
  el("presetsHead").innerHTML = "<span>PRESETS</span>";
  el("helpHead").innerHTML = "<span>HOW TO USE</span>";
  el("ossHead").innerHTML = "<span>OPEN SOURCE</span>";
  el("fontPickIcon").innerHTML = icon("upload", 16);
}

document.addEventListener("DOMContentLoaded", paintStaticIcons);