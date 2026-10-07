# PackPlate

Makes on-screen name cards for Minecraft texture packs. Drop in resource pack zips, edit the card, export a transparent PNG and drop it into your video.

Free and open source (MIT). No accounts, no tracking, no network requests. It runs from a folder on your own PC and stays there.

## Run it

1. Download the PackPlate zip, either with the Download PackPlate button on the site or from the releases page.
2. Unzip it anywhere you like. A folder called `PackPlate` will appear.
3. Double click `index.html` inside it. It opens in your browser.

That is the whole install. No server, no build step, no install.

Works on Windows, Linux and Mac in any modern browser: Chrome, Edge, Firefox, Safari, Brave, Vivaldi.

You can move or copy the folder anywhere. Everything inside uses relative paths, so a USB stick works fine.

## How to use it

1. Drag one or more resource pack `.zip` files onto the page, or click the drop area to pick them.
2. Each pack becomes a card. `pack.png` is used as the icon, `pack.mcmeta` gives the second line, and the zip file name gives the pack name.
3. Click a card in the left list to edit it. The middle panel shows a live preview on a checkerboard so you can see what is transparent.
4. Add more zips whenever you like. The cards you already made stay.

## Editing

Text: pack name, optional second line, font, sizes, colour, bold, alignment, outline, text shadow.

Icon: show or hide, size, square / rounded / circle, pixelated rendering so the icon stays crisp, or upload your own image.

Card: width, height, padding, icon layout (left or on top), corner radius, border, shadow.

Background: off or on. Solid colour, gradient, or your own image. Opacity slider.

Every change is live. Tick Apply every change to all cards to push the same look across the whole list at once, or use the To all button to copy the current card onto every pack.

## Fonts

Six fonts are bundled: Monocraft, Press Start 2P, Silkscreen, Pixelify Sans, VT323 and Inter. No internet needed. Monocraft is the default everywhere.

You can add your own. Click Upload font and pick a `.ttf`, `.otf` or `.woff2` file. It shows up in the font list with a sample of the actual glyphs so you can check it is the right file. The font applies to the card you have selected, or to every card if Apply every change to all cards is on.

Custom fonts live in memory for the session only. To keep using one after you close the tab, drop the file in again. It is never uploaded anywhere.

## Presets

Save your look once, reuse it next time you make cards. Presets are kept in the browser's local storage on your own machine, so the look stays the same between sessions. They are not synced anywhere and clearing browser data removes them.

Presets store the card look. Your uploaded fonts and images are not stored, so a preset falls back to a bundled font or the pack's own `pack.png` if the file is not loaded.

## Export

- Export PNG: one card at 1x, 2x or 4x. The background is transparent outside the card.
- Copy PNG: puts the same image on your clipboard. Browsers only allow this on https or localhost, so over `file://` use Export PNG instead.
- Export all as zip: every card as its own PNG, named after the pack.
- Full frame: 1920x1080 or 1080x1920 with the card at the top centre and the rest transparent. Drag it straight onto your video timeline.

## Files

```
PackPlate/
  index.html              the app
  css/packplate.css       all styling
  js/app.js               UI, panels, export
  js/render.js            card drawing on canvas
  js/pack.js              reading pack.png and pack.mcmeta out of zips
  js/fonts.js             bundled fonts and your uploaded fonts
  js/presets.js           local storage presets
  js/icons.js             icon set, inlined as paths
  js/ui-icons.js          icon placement for the shell
  js/selfpack.js          builds the PackPlate zip in the browser
  js/bundle.js            app files, used by the download button
  js/vendor/jszip.min.js  zip read and write
  assets/fonts/           the bundled font files
  assets/icons/           the icon svg sources
  LICENSE                 MIT
  README.md               this file
```

## Credits

- Icons from [pixelarticons.com](https://pixelarticons.com), MIT.
- Fonts under the SIL Open Font License: Monocraft, Press Start 2P, Silkscreen, Pixelify Sans, VT323, Inter.
- [JSZip](https://stuk.github.io/jszip/) for reading and writing zips, MIT or GPL.

## Licence

MIT. See `LICENSE`.