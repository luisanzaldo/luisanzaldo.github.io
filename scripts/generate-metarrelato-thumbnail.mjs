import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const W = 1080;
const H = 1920;

// Download Barlow Condensed from Google Fonts API
async function fetchFont(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getFontBase64(weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@${weight}&display=swap`;
  const css = (await fetchFont(cssUrl)).toString();
  // Accept both woff2 and ttf
  const match = css.match(/src: url\((https:\/\/[^)]+\.(woff2|ttf))\)/);
  if (!match) throw new Error('No font URL found in: ' + css.slice(0, 300));
  const ext = match[2];
  const fontBuf = await fetchFont(match[1]);
  return { base64: fontBuf.toString('base64'), ext };
}

async function main() {
  console.log('Downloading fonts...');
  const [f900, f800] = await Promise.all([
    getFontBase64(900),
    getFontBase64(800),
  ]);
  const font900 = f900, font800 = f800;

  console.log('Processing image...');
  const srcImage = join(root, 'src/assets/images/blog/ia-social.jpg');

  // Crop source image (1600×830 landscape) to 9:16 center crop
  const srcW = 1600, srcH = 830;
  const cropW = Math.round(srcH * (9 / 16)); // 467
  const cropX = Math.round((srcW - cropW) / 2);

  const base = await sharp(srcImage)
    .extract({ left: cropX, top: 0, width: cropW, height: srcH })
    .resize(W, H)
    .modulate({ brightness: 0.85 })
    .sharpen({ sigma: 0.5 })
    .toBuffer();

  // Vignette SVG (bottom-to-top dark gradient, matching template)
  const vignetteSvg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.25" stop-color="rgba(0,0,0,0)"/>
      <stop offset="0.50" stop-color="rgba(0,0,0,0.15)"/>
      <stop offset="0.68" stop-color="rgba(0,0,0,0.70)"/>
      <stop offset="0.84" stop-color="rgba(0,0,0,0.93)"/>
      <stop offset="1"    stop-color="#000000"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`);

  // Text SVG with Barlow Condensed embedded
  const PAD_X = 72;
  const PAD_Y = 180;
  const LIME = '#C7F801';
  const WHITE = '#ffffff';

  // Bottom-up layout (same as template default: v=bottom, h=left)
  // Subtitle: "metarrelato"  S_SIZE=72, letter-spacing 0.12em
  // Divider: lime gradient line
  // Line2: "de procesos"    L2_SIZE=96
  // Title: "Automatización" T_SIZE=196

  const T_SIZE  = 108;
  const L2_SIZE = 96;
  const S_SIZE  = 72;
  const T_LH    = T_SIZE * 0.82;
  const L2_LH   = L2_SIZE * 0.9;
  const L2_MB   = 28;
  const DIV_H   = 4;
  const DIV_GAP = 24;

  // y positions (from bottom)
  let y = H - PAD_Y;
  const subY = y;
  y -= S_SIZE + DIV_GAP + DIV_H + L2_MB;
  const line2Y = y;
  y -= L2_LH;
  const titleY = y;

  const divTop = H - PAD_Y - S_SIZE - DIV_GAP - DIV_H;
  const divW = W - 2 * PAD_X;

  const textSvg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'BarlowC';
        font-weight: 900;
        src: url('data:font/${font900.ext === 'woff2' ? 'woff2' : 'truetype'};base64,${font900.base64}') format('${font900.ext === 'woff2' ? 'woff2' : 'truetype'}');
      }
      @font-face {
        font-family: 'BarlowC';
        font-weight: 800;
        src: url('data:font/${font800.ext === 'woff2' ? 'woff2' : 'truetype'};base64,${font800.base64}') format('${font800.ext === 'woff2' ? 'woff2' : 'truetype'}');
      }
    </style>
    <linearGradient id="divGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"   stop-color="${LIME}" stop-opacity="1"/>
      <stop offset="0.5" stop-color="${LIME}" stop-opacity="0.2"/>
      <stop offset="1"   stop-color="${LIME}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Title: AUTOMATIZACIÓN -->
  <text
    x="${PAD_X}" y="${titleY}"
    font-family="BarlowC" font-weight="900" font-size="${T_SIZE}"
    fill="${LIME}"
    text-anchor="start"
    dominant-baseline="text-before-edge"
    letter-spacing="${T_SIZE * -0.01}"
    text-rendering="geometricPrecision"
  >AUTOMATIZACIÓN</text>

  <!-- Line 2: DE PROCESOS -->
  <text
    x="${PAD_X}" y="${line2Y}"
    font-family="BarlowC" font-weight="800" font-size="${L2_SIZE}"
    fill="${WHITE}"
    text-anchor="start"
    dominant-baseline="text-before-edge"
    letter-spacing="${L2_SIZE * 0.02}"
    text-rendering="geometricPrecision"
  >DE PROCESOS</text>

  <!-- Divider line -->
  <rect x="${PAD_X}" y="${divTop}" width="${divW}" height="${DIV_H}" fill="url(#divGrad)"/>

  <!-- Subtitle: METARRELATO -->
  <text
    x="${PAD_X}" y="${subY}"
    font-family="BarlowC" font-weight="900" font-size="${S_SIZE}"
    fill="${LIME}"
    text-anchor="start"
    dominant-baseline="text-before-edge"
    letter-spacing="${S_SIZE * 0.12}"
    text-rendering="geometricPrecision"
  >METARRELATO</text>
</svg>`);

  console.log('Compositing layers...');
  const output = join(root, 'public/fastart/_miniatura_metarrelato.png');

  await sharp(base)
    .composite([
      { input: vignetteSvg, blend: 'over' },
      { input: textSvg,     blend: 'over' },
    ])
    .png()
    .toFile(output);

  console.log('Done →', output);
}

main().catch(err => { console.error(err); process.exit(1); });
