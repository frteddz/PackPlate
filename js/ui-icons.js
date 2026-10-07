function setIcon(id, name, size) {
  const node = document.getElementById(id);
  if (node) node.innerHTML = icon(name, size || 18);
}

function paintStaticIcons() {
  el("brandLogo").innerHTML = icon("package", 22) + "<span>PACKPLATE</span>";
  el("leftHead").innerHTML = icon("package", 18) + "<span>PACKS</span>";
  el("dzIcon").innerHTML = icon("drag-and-drop", 34);
  el("dropHead").innerHTML = icon("upload", 20) + "<span>DROP PACKS</span>";
  el("presetHead").innerHTML = '<span class="caret">' + icon("chevron-down", 16) + "</span>" + icon("card-text", 18) + "<span>FONTS</span>";
  el("presetsHead").innerHTML = '<span class="caret">' + icon("chevron-down", 16) + "</span>" + icon("save", 18) + "<span>PRESETS</span>";
  el("helpHead").innerHTML = '<span class="caret">' + icon("chevron-right", 16) + "</span>" + icon("circle-info", 18) + "<span>HOW TO USE</span>";
  el("ossHead").innerHTML = '<span class="caret">' + icon("chevron-right", 16) + "</span>" + icon("git-branch", 18) + "<span>OPEN SOURCE</span>";
  el("fontPickIcon").innerHTML = icon("upload", 16);
}

document.addEventListener("DOMContentLoaded", paintStaticIcons);