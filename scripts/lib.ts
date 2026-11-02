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

// Número grande que vai contando: um quadro por valor, cada um visível até o próximo.
export function counter(frames: [number, number][], x: number, y: number): string {
  return frames
    .map(([t, value], n) => {
      const end = n + 1 < frames.length ? `end="${frames[n + 1][0].toFixed(3)}s"` : 'fill="freeze"';
      return (
        `<text x="${x.toFixed(0)}" y="${y}" text-anchor="end" class="big" visibility="hidden">` +
        `${num(value)}<set attributeName="visibility" to="visible" begin="${t.toFixed(3)}s" ${end}/></text>`
      );
    })
    .join("");
}

// Sorteio com semente fixa, para o SVG sair igual toda vez que for gerado.
export function seeded(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    uniform: (lo: number, hi: number) => lo + (hi - lo) * next(),
    choice: <T>(items: ArrayLike<T>) => items[Math.floor(next() * items.length)],
    sample<T>(items: T[], k: number): T[] {
      const pool = [...items];
      for (let i = 0; i < k; i++) {
        const j = i + Math.floor(next() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, k);
    },
  };
}
