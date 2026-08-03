/**
 * Génère les PNG Expo / admin à partir des SVG marque DôniPay.
 */
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

async function renderSvg(svgPath, outPath, { width, height, background }) {
  const svg = await readFile(svgPath);
  let pipeline = sharp(svg, { density: 300 }).resize(width, height, {
    fit: 'contain',
    background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });
  if (background && background !== 'transparent') {
    pipeline = pipeline.flatten({ background });
  }
  await mkdir(path.dirname(outPath), { recursive: true });
  await pipeline.png().toFile(outPath);
  console.log('wrote', path.relative(root, outPath));
}

async function main() {
  const mark = path.join(__dirname, 'logo-mark.svg');
  const full = path.join(__dirname, 'logo-full.svg');

  // Copie SVG source
  await mkdir(path.join(root, 'mobile/assets/brand'), { recursive: true });
  await mkdir(path.join(root, 'admin/public/brand'), { recursive: true });
  await writeFile(
    path.join(root, 'mobile/assets/brand/logo-mark.svg'),
    await readFile(mark),
  );
  await writeFile(
    path.join(root, 'mobile/assets/brand/logo-full.svg'),
    await readFile(full),
  );
  await writeFile(
    path.join(root, 'admin/public/brand/logo-mark.svg'),
    await readFile(mark),
  );
  await writeFile(
    path.join(root, 'admin/public/brand/logo-full.svg'),
    await readFile(full),
  );

  // App icon (carré violet)
  await renderSvg(mark, path.join(root, 'mobile/assets/icon.png'), {
    width: 1024,
    height: 1024,
  });
  await renderSvg(mark, path.join(root, 'mobile/assets/adaptive-icon.png'), {
    width: 1024,
    height: 1024,
  });
  await renderSvg(
    mark,
    path.join(root, 'mobile/assets/android-icon-foreground.png'),
    { width: 1024, height: 1024 },
  );
  // Fond adaptatif blanc
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toFile(path.join(root, 'mobile/assets/android-icon-background.png'));
  console.log('wrote mobile/assets/android-icon-background.png');

  // Monochrome (violet plein pour Android)
  await renderSvg(
    mark,
    path.join(root, 'mobile/assets/android-icon-monochrome.png'),
    { width: 1024, height: 1024 },
  );

  await renderSvg(mark, path.join(root, 'mobile/assets/favicon.png'), {
    width: 48,
    height: 48,
  });
  await renderSvg(mark, path.join(root, 'mobile/assets/splash-icon.png'), {
    width: 512,
    height: 512,
  });

  // Wordmark transparent (mobile + admin)
  await renderSvg(
    full,
    path.join(root, 'mobile/assets/brand/logo-full.png'),
    { width: 920, height: 220 },
  );
  await renderSvg(
    mark,
    path.join(root, 'mobile/assets/brand/logo-mark.png'),
    { width: 512, height: 512 },
  );
  await renderSvg(
    full,
    path.join(root, 'admin/public/brand/logo-full.png'),
    { width: 920, height: 220 },
  );
  await renderSvg(
    mark,
    path.join(root, 'admin/public/brand/logo-mark.png'),
    { width: 256, height: 256 },
  );
  await renderSvg(mark, path.join(root, 'admin/public/favicon.png'), {
    width: 48,
    height: 48,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
