// Gera o hero.svg: retrato ASCII à esquerda e cartão estilo neofetch à direita.
// O retrato vem de data/portrait.txt e das duas imagens feitas pelo
// make_ascii.py; a logo é assets/glousoft-logo.png. Tudo vai embutido em
// base64 porque o GitHub não carrega imagem externa de dentro de um SVG.
// Uso: node scripts/make-hero.ts
import { readFileSync, writeFileSync } from "node:fs";
import { FONT, base64, esc, root, seeded, terminal } from "./lib.ts";

const W = 860;
const H = 600;

// Retrato: coluna da esquerda; a largura sai da grade do portrait.txt.
const [PX, PY] = [20, 46];
const [AREA_W, AREA_H] = [404, 540];
const CELL_RATIO = 1.5; // altura / largura de cada caractere, igual ao make_ascii.py
const DENSE = "0896$S3B%&"; // igual ao make_ascii.py, para o código vivo
const FLICKER = 140;
const K = 10; // escala interna do retrato (ver portrait())

// Cartão
const [CX, CY] = [444, 50]; // CY desce o cartão para ficar no meio da altura
const KEY_W = 88;

const ROWS: [string, string][] = [
  ["Role", "Founder & lead engineer @ GlouSoft"],
  ["Builds", "SaaS, mobile apps, APIs, AI automation"],
  ["Ships to", "App Store · Google Play · Web"],
  ["Mobile", "Capacitor · Expo · React Native · PWA"],
  ["Frontend", "TypeScript · React · Next.js · Tailwind"],
  ["Backend", "Supabase · Postgres · Node · Deno · Java"],
  ["Cloud", "Cloudflare Workers · D1 · R2"],
  ["Messaging", "WhatsApp Cloud API · SMS OTP · e-mail"],
  ["Live app", "Time da Leoa (iOS + Android)"],
  // Número fixo: atualizar à mão quando mudar (ver data/stack.json, campo private).
  ["Repos", "18 private"],
  ["Site", "glousoft.com"],
];

// Vermelho da marca, pretos e cinzas: os blocos de cor do neofetch.
const SWATCHES = ["#010101", "#3f1012", "#6e1518", "#a2171a", "#e5383b", "#7e7c7f", "#c9d1d9", "#f0f6fc"];

function portrait(): string {
  const lines = readFileSync(root("data/portrait.txt"), "utf8").replace(/\n+$/, "").split("\n");
  const cols = Math.max(...lines.map((l) => l.length));
  const rows = lines.length;
  // Tudo do retrato é desenhado 10x maior e reduzido no fim, com coordenadas
  // inteiras. A letra é um pouco menor que a linha: com um vão fino e igual em
  // todas, não aparecem faixas quando o navegador encaixa as linhas no pixel.
  const cellH = (AREA_H / rows) * K;
  const cellW = cellH / CELL_RATIO;
  const width = cols * cellW;
  const x0 = (PX + AREA_W / 2) * K - width / 2;
  const y0 = PY * K;
  const r0 = (n: number) => n.toFixed(0);

  const clips: string[] = [];
  const texts: string[] = [];
  lines.forEach((line, i) => {
    const y = y0 + i * cellH;
    const begin = 0.25 + (i * 2.2) / rows;
    clips.push(
      `<rect x="${r0(x0)}" y="${r0(y)}" width="0" height="${r0(cellH + 6)}">` +
        `<animate attributeName="width" from="0" to="${r0(width)}" begin="${begin.toFixed(3)}s" ` +
        `dur="0.45s" fill="freeze"/></rect>`,
    );
    if (line.trim()) {
      // Espaço comum some no começo da linha; o não separável segura a coluna.
      const padded = line.padEnd(cols).replaceAll(" ", " ");
      texts.push(
        `<text x="${r0(x0)}" y="${r0(y + cellH * 0.8)}" textLength="${r0(width)}" ` +
          `lengthAdjust="spacing">${esc(padded)}</text>`,
      );
    }
  });

  // Código vivo: depois que o rosto aparece, algumas letras trocam por um instante.
  const rng = seeded(7);
  const spots: [number, number][] = [];
  lines.forEach((l, r) => [...l].forEach((ch, c) => ch !== " " && spots.push([r, c])));
  const flicker = rng.sample(spots, FLICKER).map(([r, c]) => {
    const ch = rng.choice(DENSE);
    const dur = rng.uniform(2.5, 6.0);
    const on = rng.uniform(0.05, 0.8);
    const off = on + rng.uniform(0.12, 0.3) / dur;
    const [x, y] = [x0 + c * cellW, y0 + r * cellH];
    return (
      `<g opacity="0"><rect x="${r0(x)}" y="${r0(y)}" width="${r0(cellW)}" height="${r0(cellH)}" fill="#0d1117"/>` +
      `<text x="${r0(x)}" y="${r0(y + cellH * 0.8)}">${esc(ch)}</text>` +
      `<animate attributeName="opacity" values="0;1;0" keyTimes="0;${on.toFixed(3)};${off.toFixed(3)}" ` +
      `calcMode="discrete" dur="${dur.toFixed(2)}s" begin="${(2.8 + rng.uniform(0, 3)).toFixed(2)}s" ` +
      `repeatCount="indefinite"/></g>`
    );
  });

  const areaH = AREA_H * K;
  return (
    `<pattern id="photo" patternUnits="userSpaceOnUse" x="${r0(x0)}" y="${r0(y0)}" ` +
    `width="${r0(width)}" height="${r0(areaH)}"><image width="${r0(width)}" height="${r0(areaH)}" ` +
    `preserveAspectRatio="none" href="data:image/jpeg;base64,${base64("assets/portrait-fill.jpg")}"/></pattern>` +
    `<clipPath id="wipe">${clips.join("")}</clipPath>` +
    `<g class="ascii" transform="scale(${1 / K})" font-size="${r0(cellW / 0.62)}">` +
    `<g clip-path="url(#wipe)"><image x="${r0(x0)}" y="${r0(y0)}" width="${r0(width)}" ` +
    `height="${r0(areaH)}" preserveAspectRatio="none" ` +
    `href="data:image/jpeg;base64,${base64("assets/portrait-base.jpg")}"/>${texts.join("")}</g>${flicker.join("")}</g>`
  );
}

function card(): string {
  const out = [
    `<g class="in" style="animation-delay:.5s">` +
      `<image x="${CX}" y="${CY + 58}" width="190" height="46" href="data:image/png;base64,${base64("assets/glousoft-logo.png")}"/></g>`,
    `<g class="in" style="animation-delay:.65s">` +
      `<text x="${CX}" y="${CY + 140}" class="host"><tspan class="red">romulo</tspan>` +
      `<tspan class="dim">@</tspan><tspan class="red">glousoft.com</tspan></text>` +
      `<text x="${CX}" y="${CY + 158}" class="dim">${"-".repeat(19)}</text></g>`,
  ];
  let y = CY + 184;
  ROWS.forEach(([key, value], n) => {
    out.push(
      `<g class="in" style="animation-delay:${(0.8 + n * 0.12).toFixed(2)}s">` +
        `<text x="${CX}" y="${y}" class="key">${esc(key)}</text>` +
        `<text x="${CX + KEY_W}" y="${y}" class="val">${esc(value)}</text></g>`,
    );
    y += 21;
  });
  const delay = 0.8 + ROWS.length * 0.12;
  const blocks = SWATCHES.map(
    (c, i) => `<rect x="${CX + i * 22}" y="${y + 2}" width="18" height="18" rx="3" fill="${c}" stroke="#30363d"/>`,
  ).join("");
  out.push(`<g class="in" style="animation-delay:${delay.toFixed(2)}s">${blocks}</g>`);
  out.push(
    `<g class="in" style="animation-delay:${(delay + 0.15).toFixed(2)}s">` +
      `<text x="${CX}" y="${y + 60}" class="val"><tspan class="red">romulo@glousoft</tspan>` +
      `<tspan class="dim">:~$ </tspan></text>` +
      `<rect class="cur" x="${(CX + 19 * 7.8).toFixed(1)}" y="${y + 48}" width="8" height="15" fill="#e5383b"/></g>`,
  );
  return out.join("");
}

const style = `
    text { font-family: ${FONT}; }
    .ascii text { fill: url(#photo); font-weight: 700; }
    .ascii { text-rendering: geometricPrecision; }
    .host { font-size: 16px; font-weight: 700; }
    .key { font-size: 13px; fill: #ff6b6b; font-weight: 700; }
    .val { font-size: 13px; fill: #c9d1d9; }
    .red { fill: #ff6b6b; }
    .dim { fill: #7d8590; font-size: 13px; }
    .small { font-size: 12px; }
    .in { opacity: 0; animation: in .5s ease-out forwards; }
    .cur { animation: blink 1.1s steps(1) infinite; }
    @keyframes in { from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: none; } }
    @keyframes blink { 50% { opacity: 0; } }
    `;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Romulo Alcanfor</title>
<desc id="d">Founder and lead engineer at GlouSoft. Builds SaaS, mobile apps for the App Store and Google Play, APIs and AI automation.</desc>
<defs>
<style>${style}</style>
</defs>
${terminal(W, H, "romulo@glousoft: ~ (neofetch)", "dim small")}
${portrait()}
${card()}
</svg>
`;
writeFileSync(root("hero.svg"), svg);
console.log(`hero.svg: ${Math.floor(svg.length / 1024)} KB`);
