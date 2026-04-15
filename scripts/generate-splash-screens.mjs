// Generates iOS PWA splash screen images for all current iPhone sizes.
// Run once locally: node scripts/generate-splash-screens.mjs
// Commit the output PNGs — Vercel doesn't need to run this at build time.

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICON_PATH = join(ROOT, 'public/icons/icon-512x512.png');
const OUT_DIR = join(ROOT, 'public/splash');

// All current iPhone screen sizes (portrait, physical pixels).
// Media queries use logical pixels (device-width/device-height) + pixel ratio.
const SCREENS = [
  { w: 750,  h: 1334, dw: 375, dh: 667, dpr: 2 },  // iPhone SE 3rd gen
  { w: 1242, h: 2208, dw: 414, dh: 736, dpr: 3 },  // iPhone 8 Plus
  { w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3 },  // iPhone X/XS/11 Pro/12 mini/13 mini/16e
  { w: 828,  h: 1792, dw: 414, dh: 896, dpr: 2 },  // iPhone XR/11
  { w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3 },  // iPhone XS Max/11 Pro Max
  { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 },  // iPhone 12/12 Pro/13/13 Pro/14
  { w: 1284, h: 2778, dw: 428, dh: 926, dpr: 3 },  // iPhone 12 Pro Max/13 Pro Max/14 Plus
  { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 },  // iPhone 14 Pro/15/15 Pro/16
  { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 },  // iPhone 14 Pro Max/15 Pro Max/16 Plus
  { w: 1206, h: 2622, dw: 402, dh: 874, dpr: 3 },  // iPhone 16 Pro
  { w: 1320, h: 2868, dw: 440, dh: 956, dpr: 3 },  // iPhone 16 Pro Max
];

const THEMES = [
  { name: 'dark',  bg: { r: 10, g: 10, b: 11, alpha: 1 } },    // #0A0A0B
  { name: 'light', bg: { r: 255, g: 255, b: 255, alpha: 1 } },  // #FFFFFF
];

mkdirSync(OUT_DIR, { recursive: true });

// Remove the icon's baked-in dark background by making near-black pixels
// transparent. This way the arrows composite cleanly onto any splash color
// without a visible dark square.
async function removeIconBackground(iconPath) {
  const { data, info } = await sharp(iconPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const THRESHOLD = 35; // pixels with R, G, B all below this become transparent
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < THRESHOLD && data[i + 1] < THRESHOLD && data[i + 2] < THRESHOLD) {
      data[i + 3] = 0; // set alpha to 0
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

const transparentIcon = await removeIconBackground(ICON_PATH);

let count = 0;

for (const screen of SCREENS) {
  const iconSize = Math.round(screen.w * 0.35);
  const resizedIcon = await sharp(transparentIcon)
    .resize(iconSize, iconSize)
    .toBuffer();

  for (const theme of THEMES) {
    const filename = `splash-${theme.name}-${screen.w}x${screen.h}.png`;
    const outPath = join(OUT_DIR, filename);

    await sharp({
      create: {
        width: screen.w,
        height: screen.h,
        channels: 4,
        background: theme.bg,
      },
    })
      .composite([
        {
          input: resizedIcon,
          top: Math.round((screen.h - iconSize) / 2),
          left: Math.round((screen.w - iconSize) / 2),
        },
      ])
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    count++;
    console.log(`[${count}/22] ${filename} (${screen.w}x${screen.h})`);
  }
}

console.log(`\nDone. Generated ${count} splash screens in public/splash/`);
