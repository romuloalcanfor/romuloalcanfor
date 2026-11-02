// Pedaços comuns aos SVGs do perfil: fonte, janela de terminal e formatação.
import { readFileSync } from "node:fs";

export const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
export const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
export const BAR = 34; // altura da barra de título

export const root = (path: string) => new URL(`../${path}`, import.meta.url);
export const readJson = (path: string) => JSON.parse(readFileSync(root(path), "utf8"));
export const base64 = (path: string) => readFileSync(root(path)).toString("base64");

// 5294 -> "5,294", como o resto do perfil (em inglês).
export const num = (n: number) => n.toLocaleString("en-US");

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[c]!);
}

export function fmtDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

// Fundo, borda, as três bolinhas e o título no meio da barra.
export function terminal(w: number, h: number, title: string, titleClass = "dim"): string {
  const dots = ["#ff5f57", "#febc2e", "#28c840"]
    .map((c, i) => `<circle cx="${22 + i * 18}" cy="${BAR / 2}" r="5.5" fill="${c}"/>`)
    .join("");
  return (
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="#0d1117" stroke="#30363d"/>` +
    `<path d="M0.5 ${BAR} H${w - 0.5}" stroke="#30363d"/>${dots}` +
    `<text x="${w / 2}" y="${BAR / 2 + 4}" text-anchor="middle" class="${titleClass}">${esc(title)}</text>`
  );
}

// Número grande que vai contando: um quadro por valor, cada um visível até o
// próximo. Com cycle, a contagem recomeça a cada cycle segundos (volta a 0 em
// resetAt), para quem rolar a página até o painel ainda ver o número subir.
export function counter(frames: [number, number][], x: number, y: number, cycle?: number, resetAt?: number): string {
  return frames
    .map(([t, value], n) => {
      const open = `<text x="${x.toFixed(0)}" y="${y}" text-anchor="end" class="big" visibility="hidden">${num(value)}`;
      if (!cycle) {
        const end = n + 1 < frames.length ? `end="${frames[n + 1][0].toFixed(3)}s"` : 'fill="freeze"';
        return `${open}<set attributeName="visibility" to="visible" begin="${t.toFixed(3)}s" ${end}/></text>`;
      }
      const k = (s: number) => (s / cycle).toFixed(4);
      const last = n + 1 === frames.length;
      const [values, times] = n === 0
        ? ["visible;hidden;visible", `0;${k(frames[1]?.[0] ?? resetAt!)};${k(resetAt!)}`]
        : ["hidden;visible;hidden", `0;${k(t)};${k(last ? resetAt! : frames[n + 1][0])}`];
      return (
        `${open}<animate attributeName="visibility" calcMode="discrete" values="${values}" ` +
        `keyTimes="${times}" dur="${cycle}s" repeatCount="indefinite"/></text>`
      );
    })
    .join("");
}
