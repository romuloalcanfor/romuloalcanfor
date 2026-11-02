// Desenha o contrib.svg a partir de data/contributions.json.
// Mostra o que o gráfico verde do GitHub não mostra: contribuições por mês em
// barras que sobem uma a uma, com o total contando junto, e ao lado as
// sequências, o melhor dia e a média.
// Uso: node scripts/render-contrib.ts
import { writeFileSync } from "node:fs";
import { FONT, MONTHS, counter, fmtDay, num, readJson, root, terminal } from "./lib.ts";

const W = 860;
const H = 330;
// Barras: área da esquerda, linha de base e altura máxima.
const [CHART_X0, CHART_X1, BASE, TALL] = [40, 520, 268, 150];
const BAR_W = 24;
// Blocos de números: duas colunas à direita.
const [TILE_X, TILE_Y, TILE_W, TILE_H, TILE_GAP] = [548, 100, 140, 60, 12];
const [START, STEP] = [0.3, 0.12]; // tempo da primeira barra e entre as barras

const data = readJson("data/contributions.json");
const months: [string, number][] = Object.entries<number>(data.months).slice(-12);
const top = Math.max(...months.map(([, v]) => v)) || 1;
const slot = (CHART_X1 - CHART_X0) / months.length;

const bars: string[] = [];
const frames: [number, number][] = [[0, 0]];
let total = 0;
months.forEach(([key, value], i) => {
  const x = CHART_X0 + i * slot + (slot - BAR_W) / 2;
  const h = Math.max(2, (value / top) * TALL);
  const delay = START + i * STEP;
  const peak = value === top ? " peak" : "";
  const cx = (x + BAR_W / 2).toFixed(1);
  bars.push(
    `<rect class="bar${peak}" x="${x.toFixed(1)}" y="${(BASE - h).toFixed(1)}" width="${BAR_W}" ` +
      `height="${h.toFixed(1)}" rx="3" style="animation-delay:${delay.toFixed(2)}s"/>` +
      `<text class="num late" x="${cx}" y="${(BASE - h - 6).toFixed(1)}" text-anchor="middle" ` +
      `style="animation-delay:${(delay + 0.35).toFixed(2)}s">${num(value)}</text>` +
      `<text class="lbl" x="${cx}" y="${BASE + 18}" text-anchor="middle">${MONTHS[Number(key.slice(5)) - 1]}</text>`,
  );
  total += value;
  if (total !== frames.at(-1)![1]) frames.push([delay + 0.3, total]);
});
// O último quadro é sempre o total exato do ano.
if (frames.at(-1)![1] !== data.total) frames.push([frames.at(-1)![0] + 0.05, data.total]);
const done = START + months.length * STEP + 0.3;
const numX = 20 + num(data.total).length * 13.2;

const days: { count: number }[] = data.days;
const active = days.filter((d) => d.count).length;
const tiles: [string, string, string, boolean][] = [
  ["$ current streak", `${data.current_streak}`, "days", true],
  ["$ longest streak", `${data.longest_streak}`, "days", false],
  ["$ contributions", num(data.total), "total", false],
  ["$ active days", `${active}`, `of ${days.length}`, false],
  ["$ best day", `${data.best_day.count}`, fmtDay(data.best_day.date), false],
  ["$ avg / active day", (data.total / Math.max(active, 1)).toFixed(1), "per day", false],
];
const tileSvg = tiles.map(([label, value, sub, hot], i) => {
  const x = TILE_X + (i % 2) * (TILE_W + TILE_GAP);
  const y = TILE_Y + Math.floor(i / 2) * (TILE_H + TILE_GAP);
  return (
    `<g class="late" style="animation-delay:${(done + i * 0.1).toFixed(2)}s">` +
    `<rect x="${x}" y="${y}" width="${TILE_W}" height="${TILE_H}" rx="8" fill="#161b22" stroke="#30363d"/>` +
    `<text x="${x + 12}" y="${y + 18}" class="lbl">${label}</text>` +
    `<text x="${x + 12}" y="${y + 44}" class="tile${hot ? " hot" : ""}">${value}` +
    `<tspan class="lbl" dx="6">${sub}</tspan></text></g>`
  );
});

const style = `
    text { font-family: ${FONT}; }
    .lbl { font-size: 10px; fill: #7d8590; }
    .dim { font-size: 12px; fill: #7d8590; }
    .num { font-size: 10px; fill: #c9d1d9; }
    .big { font-size: 22px; font-weight: 700; fill: #ff6b6b; }
    .sub { font-size: 13px; fill: #c9d1d9; }
    .tile { font-size: 20px; font-weight: 700; fill: #f0f6fc; }
    .hot { fill: #ff6b6b; }
    .bar { fill: url(#barfill); transform-box: fill-box; transform-origin: bottom;
            transform: scaleY(0); animation: grow .6s cubic-bezier(.2,.8,.3,1.1) forwards; }
    .peak { fill: #ff6b6b; }
    .late { opacity: 0; animation: fade .5s ease-out forwards; }
    @keyframes grow { to { transform: scaleY(1); } }
    @keyframes fade { to { opacity: 1; } }
    `;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">${num(data.total)} contributions in the last 12 months</title>
<defs>
<linearGradient id="barfill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#e5383b"/><stop offset="1" stop-color="#6e1518"/>
</linearGradient>
<style>${style}</style>
</defs>
${terminal(W, H, "romulo@glousoft: ~/contributions")}
${counter(frames, numX, 74)}
<text x="${(numX + 8).toFixed(0)}" y="74" class="sub">contributions in the last 12 months</text>
<path d="M${CHART_X0} ${BASE + 0.5} H${CHART_X1}" stroke="#30363d"/>
${bars.join("")}
${tileSvg.join("")}
</svg>
`;
writeFileSync(root("contrib.svg"), svg);
console.log(`contrib.svg: ${Math.floor(svg.length / 1024)} KB, atualizado em ${data.updated}`);
