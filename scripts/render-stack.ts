// Desenha o stack.svg a partir de data/stack.json (feito pelo scan-stack.ts).
// À esquerda, as linguagens que o próprio GitHub mede nos repositórios, com as
// cores dele; à direita, frameworks e ferramentas com em quantos repositórios
// aparecem. Só totais: nenhum nome de repositório.
// Uso: node scripts/render-stack.ts
import { writeFileSync } from "node:fs";
import { FONT, counter, esc, readJson, root, terminal } from "./lib.ts";

const W = 860;
const [LX, LW] = [20, 390]; // coluna das linguagens
const [TX, TX1] = [440, 840]; // coluna das ferramentas
const TOP = 108;
const SHOW_LANGS = 8;
// Ferramentas de build que só repetem o que já aparece (Java, Android).
const SKIP = new Set(["Maven", "Gradle"]);
const NAMES: Record<string, string> = { PLpgSQL: "PL/pgSQL" };
// A barra das linguagens e o número se repetem, como no gráfico de contribuições.
const CYCLE = 10;
const RESET = 9.6;

type Lang = { name: string; color: string; pct: number };
const data = readJson("data/stack.json");
const langs: Lang[] = data.languages.filter((l: Lang) => l.pct >= 0.05).slice(0, SHOW_LANGS);
const tools: { name: string; repos: number }[] = data.tools.filter((t: { name: string }) => !SKIP.has(t.name));

// Barra única dividida por linguagem, como a do GitHub, crescendo da esquerda.
let x = LX;
const sum = langs.reduce((s, l) => s + l.pct, 0);
const segments = langs.map((l, i) => {
  const w = (l.pct / sum) * LW;
  const seg =
    `<rect class="seg" x="${x.toFixed(1)}" y="${TOP + 10}" width="${Math.max(w, 1.5).toFixed(1)}" height="10" ` +
    `fill="${l.color}" style="animation-delay:${(0.3 + i * 0.12).toFixed(2)}s"/>`;
  x += w;
  return seg;
});
const legend = langs.map((l, i) => {
  const lx = LX + (i % 2) * (LW / 2);
  const ly = TOP + 48 + Math.floor(i / 2) * 24;
  return (
    `<g class="late" style="animation-delay:${(0.5 + i * 0.08).toFixed(2)}s">` +
    `<circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${l.color}"/>` +
    `<text x="${lx + 16}" y="${ly}" class="name">${esc(NAMES[l.name] ?? l.name)}</text>` +
    `<text x="${lx + LW / 2 - 16}" y="${ly}" class="pct" text-anchor="end">${l.pct.toFixed(1)}%</text></g>`
  );
});
const legendBottom = TOP + 48 + Math.ceil(langs.length / 2) * 24;

// Etiquetas das ferramentas, quebrando linha quando não cabe.
let [cx, cy] = [TX, TOP + 6];
const chips = tools.map((t, i) => {
  const w = t.name.length * 7.2 + String(t.repos).length * 7 + 30;
  if (cx + w > TX1) [cx, cy] = [TX, cy + 32];
  const chip =
    `<g class="late" style="animation-delay:${(0.8 + i * 0.05).toFixed(2)}s">` +
    `<rect x="${cx.toFixed(1)}" y="${cy}" width="${w.toFixed(0)}" height="24" rx="12" fill="#161b22" stroke="#30363d"/>` +
    `<text x="${(cx + 12).toFixed(1)}" y="${cy + 16}" class="chip">${esc(t.name)}</text>` +
    `<text x="${(cx + w - 12).toFixed(0)}" y="${cy + 16}" class="count" text-anchor="end">${t.repos}</text></g>`;
  cx += w + 8;
  return chip;
});
const H = Math.max(legendBottom + 40, cy + 24 + 26);

// O número de repositórios conta de 0 até o total enquanto as barras entram.
const frames: [number, number][] = Array.from({ length: data.private + 1 }, (_, n) => [
  n === 0 ? 0 : 0.2 + (n / data.private) * 0.9,
  n,
]);
const numX = 20 + String(data.private).length * 13.2;

const style = `
    text { font-family: ${FONT}; }
    .lbl { font-size: 10px; fill: #7d8590; letter-spacing: .08em; }
    .dim { font-size: 12px; fill: #7d8590; }
    .big { font-size: 22px; font-weight: 700; fill: #ff6b6b; }
    .sub { font-size: 13px; fill: #c9d1d9; }
    .name { font-size: 12px; fill: #c9d1d9; }
    .pct { font-size: 12px; fill: #7d8590; }
    .chip { font-size: 12px; fill: #c9d1d9; }
    .count { font-size: 11px; font-weight: 700; fill: #ff6b6b; }
    .seg { transform-box: fill-box; transform-origin: left;
           animation: grow ${CYCLE}s ease-out infinite both; }
    .late { opacity: 0; animation: fade .5s ease-out forwards; }
    @keyframes grow { 0% { transform: scaleX(0); } 5%, 94% { transform: scaleX(1); } 100% { transform: scaleX(0); } }
    @keyframes fade { to { opacity: 1; } }
    `;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">Languages and frameworks across ${data.private} private repositories</title>
<defs>
<clipPath id="round"><rect x="${LX}" y="${TOP + 10}" width="${LW}" height="10" rx="5"/></clipPath>
<style>${style}</style>
</defs>
${terminal(W, H, "romulo@glousoft: ~/stack")}
${counter(frames, numX, 74, CYCLE, RESET)}
<text x="${(numX + 8).toFixed(0)}" y="74" class="sub">private repositories, code stays private</text>
<text x="${LX}" y="${TOP}" class="lbl">LANGUAGES (MEASURED BY GITHUB)</text>
<g clip-path="url(#round)">${segments.join("")}</g>
${legend.join("")}
<text x="${TX}" y="${TOP}" class="lbl">FRAMEWORKS &amp; TOOLS (REPOS USING IT)</text>
${chips.join("")}
</svg>
`;
writeFileSync(root("stack.svg"), svg);
console.log(`stack.svg: ${Math.floor(svg.length / 1024)} KB, ${langs.length} linguagens, ${tools.length} ferramentas`);
