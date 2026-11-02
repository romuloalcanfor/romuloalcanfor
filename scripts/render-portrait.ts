// Monta o retrato ASCII em vetor (assets/portrait.svg) e tira dele uma imagem
// em 2x (assets/portrait.webp), que é a que vai no hero.svg.
// Por que imagem: são mais de 25 mil caracteres com a cor da foto por dentro, e
// o navegador levava mais de meio segundo para redesenhar isso a cada quadro de
// animação. Em 2x a imagem fica igual ao vetor numa tela retina.
// Roda só local: precisa do Google Chrome e do Python com Pillow (.venv).
// Uso: node scripts/render-portrait.ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { base64, esc, root } from "./lib.ts";

export const [AREA_W, AREA_H] = [404, 540];
const CELL_RATIO = 1.5; // altura / largura de cada caractere, igual ao make_ascii.py
const K = 10;
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PYTHON = fileURLToPath(root(".venv/bin/python"));

const lines = readFileSync(root("data/portrait.txt"), "utf8").replace(/\n+$/, "").split("\n");
const cols = Math.max(...lines.map((l) => l.length));
// Desenhado 10x maior e reduzido no fim, com coordenadas inteiras. A letra é um
// pouco menor que a linha: com um vão fino e igual em todas, não aparecem faixas
// quando o navegador encaixa as linhas no pixel.
const cellH = (AREA_H / lines.length) * K;
const cellW = cellH / CELL_RATIO;
const width = cols * cellW;
const x0 = (AREA_W * K - width) / 2;
const areaH = AREA_H * K;
const r0 = (n: number) => n.toFixed(0);

const texts = lines.flatMap((line, i) => {
  if (!line.trim()) return [];
  // Espaço comum some no começo da linha; o não separável segura a coluna.
  const padded = line.padEnd(cols).replaceAll(" ", " ");
  return [
    `<text x="${r0(x0)}" y="${r0(i * cellH + cellH * 0.8)}" textLength="${r0(width)}" ` +
      `lengthAdjust="spacing">${esc(padded)}</text>`,
  ];
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${AREA_W}" height="${AREA_H}" viewBox="0 0 ${AREA_W} ${AREA_H}">
<defs>
<pattern id="photo" patternUnits="userSpaceOnUse" x="${r0(x0)}" y="0" width="${r0(width)}" height="${r0(areaH)}"><image width="${r0(width)}" height="${r0(areaH)}" preserveAspectRatio="none" href="data:image/jpeg;base64,${base64("assets/portrait-fill.jpg")}"/></pattern>
<style>
  text { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
         fill: url(#photo); font-weight: 700; }
  g { text-rendering: geometricPrecision; }
</style>
</defs>
<rect width="${AREA_W}" height="${AREA_H}" fill="#0d1117"/>
<g transform="scale(${1 / K})" font-size="${r0(cellW / 0.62)}">
<image x="${r0(x0)}" y="0" width="${r0(width)}" height="${r0(areaH)}" preserveAspectRatio="none" href="data:image/jpeg;base64,${base64("assets/portrait-base.jpg")}"/>
${texts.join("\n")}
</g>
</svg>
`;
writeFileSync(root("assets/portrait.svg"), svg);

// Fotografa o vetor em 3x e reduz para 2x: a redução deixa a borda das letras lisa.
const tmp = mkdtempSync(join(tmpdir(), "retrato-"));
const png = join(tmp, "3x.png");
execFileSync(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--default-background-color=0d1117ff",
  `--screenshot=${png}`, `--window-size=${AREA_W},${AREA_H}`, "--force-device-scale-factor=3",
  fileURLToPath(root("assets/portrait.svg")),
], { stdio: "ignore" });
execFileSync(PYTHON, ["-c", `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB").resize((${AREA_W * 2}, ${AREA_H * 2}), Image.LANCZOS)
im.save(sys.argv[2], "WEBP", quality=92, method=6)
`, png, fileURLToPath(root("assets/portrait.webp"))]);
console.log(`assets/portrait.svg + assets/portrait.webp (${AREA_W * 2}x${AREA_H * 2})`);
