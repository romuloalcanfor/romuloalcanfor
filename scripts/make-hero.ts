// Gera o hero.svg: retrato ASCII à esquerda e cartão estilo neofetch à direita.
// O retrato é assets/portrait.webp (feito pelo render-portrait.ts) e a logo é
// assets/glousoft-logo.png. Tudo vai embutido em base64 porque o GitHub não
// carrega imagem externa de dentro de um SVG.
// Uso: node scripts/make-hero.ts
import { writeFileSync } from "node:fs";
import { FONT, base64, esc, root, terminal } from "./lib.ts";

const W = 860;
const H = 600;

// Retrato: coluna da esquerda, mesmo tamanho do render-portrait.ts.
const [PX, PY] = [20, 46];
const [AREA_W, AREA_H] = [404, 540];
const [BANDS, REVEAL_SECONDS] = [38, 2.2];

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
  // O rosto entra em faixas que correm da esquerda para a direita, de cima
  // para baixo, como se estivesse sendo digitado. A imagem vem pronta do
  // render-portrait.ts, então animar custa pouco para o navegador.
  const bandH = AREA_H / BANDS;
  const clips = Array.from({ length: BANDS }, (_, i) => {
    const begin = 0.25 + (i * REVEAL_SECONDS) / BANDS;
    return (
      `<rect x="${PX}" y="${(PY + i * bandH).toFixed(2)}" width="0" height="${(bandH + 0.5).toFixed(2)}">` +
      `<animate attributeName="width" from="0" to="${AREA_W}" begin="${begin.toFixed(3)}s" ` +
      `dur="0.45s" fill="freeze"/></rect>`
    );
  });
  return (
    `<clipPath id="wipe">${clips.join("")}</clipPath>` +
    `<image x="${PX}" y="${PY}" width="${AREA_W}" height="${AREA_H}" clip-path="url(#wipe)" ` +
    `href="data:image/webp;base64,${base64("assets/portrait.webp")}"/>`
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
