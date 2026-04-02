import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const SCREENSHOTS = [
  { name: 'screenshot-mobile.png', width: 1080, height: 1920, formFactor: 'narrow' },
  { name: 'screenshot-desktop.png', width: 1920, height: 1080, formFactor: 'wide' },
];

async function main() {
  const logoPath = process.argv[2];
  if (!logoPath) {
    console.error('Usage: npx tsx scripts/generate-screenshots.ts <path-to-logo.png>');
    process.exit(1);
  }

  const resolvedLogo = path.resolve(logoPath);
  if (!fs.existsSync(resolvedLogo)) {
    console.error(`Logo file not found: ${resolvedLogo}`);
    process.exit(1);
  }

  const outDir = path.resolve(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  for (const { name, width, height } of SCREENSHOTS) {
    const logoSize = Math.round(Math.min(width, height) * 0.25);
    const resizedLogo = await sharp(resolvedLogo)
      .resize(logoSize, logoSize)
      .toBuffer();

    // Create text SVG for the tagline
    const textSvg = Buffer.from(`
      <svg width="${width}" height="60">
        <text x="${width / 2}" y="40" text-anchor="middle"
          font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="500"
          fill="#9CA3AF">Build Better Habits</text>
      </svg>
    `);

    const outPath = path.join(outDir, name);

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 10, g: 10, b: 11, alpha: 1 }, // #0A0A0B
      },
    })
      .composite([
        {
          input: resizedLogo,
          left: Math.round((width - logoSize) / 2),
          top: Math.round((height - logoSize) / 2) - 40,
        },
        {
          input: textSvg,
          left: 0,
          top: Math.round((height + logoSize) / 2),
        },
      ])
      .png()
      .toFile(outPath);

    console.log(`Generated: ${outPath}`);
  }

  console.log('\nDone! Screenshots generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
