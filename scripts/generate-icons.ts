import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SIZES = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
];

const APPLE_ICON_SIZE = 180;

async function main() {
  const sourcePath = process.argv[2];
  if (!sourcePath) {
    console.error('Usage: npx tsx scripts/generate-icons.ts <path-to-1024x1024-source.png>');
    process.exit(1);
  }

  const resolvedSource = path.resolve(sourcePath);
  if (!fs.existsSync(resolvedSource)) {
    console.error(`Source file not found: ${resolvedSource}`);
    process.exit(1);
  }

  const outDir = path.resolve(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  for (const { name, size, maskable } of SIZES) {
    const outPath = path.join(outDir, name);
    if (maskable) {
      // Maskable icons: safe zone is inner 80%. Add 10% padding on each side
      // by placing the source on a larger canvas with the background color.
      const padding = Math.round(size * 0.1);
      const innerSize = size - padding * 2;
      const resized = await sharp(resolvedSource)
        .resize(innerSize, innerSize)
        .toBuffer();

      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 10, g: 10, b: 11, alpha: 1 }, // #0A0A0B
        },
      })
        .composite([{ input: resized, left: padding, top: padding }])
        .png()
        .toFile(outPath);
    } else {
      await sharp(resolvedSource).resize(size, size).png().toFile(outPath);
    }
    console.log(`Generated: ${outPath}`);
  }

  // Apple icon (180x180)
  const appleIconPath = path.resolve(__dirname, '..', 'app', 'apple-icon.png');
  await sharp(resolvedSource).resize(APPLE_ICON_SIZE, APPLE_ICON_SIZE).png().toFile(appleIconPath);
  console.log(`Generated: ${appleIconPath}`);

  // Favicon (48x48 PNG for modern browsers, alongside existing .ico)
  const faviconPath = path.resolve(__dirname, '..', 'app', 'icon.png');
  await sharp(resolvedSource).resize(48, 48).png().toFile(faviconPath);
  console.log(`Generated: ${faviconPath}`);

  console.log('\nDone! Icons generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
