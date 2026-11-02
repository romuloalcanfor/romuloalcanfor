// Baixa o gráfico público de contribuições e salva em data/contributions.json.
// Usa a mesma página que o GitHub mostra no perfil, então entram as
// contribuições privadas (só a contagem, nunca o nome do repositório).
// Sem dependências, para o Action rodar só com o Node.
// Uso: node scripts/fetch-contributions.ts
import { writeFileSync } from "node:fs";

const USER = "romuloalcanfor";
const URL_ = `https://github.com/users/${USER}/contributions`;
const OUT = new URL("../data/contributions.json", import.meta.url);

type Day = { date: string; level: number; count: number };

function attr(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function count(tip: string | undefined): number {
  const m = (tip ?? "").match(/^\s*([\d,]+) contributions?/);
  return m ? Number(m[1].replaceAll(",", "")) : 0;
}

function streaks(days: Day[]): [number, number] {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // A sequência atual não quebra só porque hoje ainda não teve commit.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count) current++;
    else if (i < days.length - 1) break;
  }
  return [longest, current];
}

const html = await (await fetch(URL_, { headers: { "User-Agent": "Mozilla/5.0" } })).text();

const tips = new Map<string, string>();
for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
  tips.set(m[1], m[2]);
}
const days: Day[] = [];
for (const [tag] of html.matchAll(/<td\b[^>]*\bdata-date="[^"]+"[^>]*>/g)) {
  days.push({
    date: attr(tag, "data-date")!,
    level: Number(attr(tag, "data-level") ?? 0),
    count: count(tips.get(attr(tag, "id") ?? "")),
  });
}
if (!days.length) throw new Error("não achei o calendário na página, o layout do GitHub mudou?");
days.sort((a, b) => a.date.localeCompare(b.date));

const months: Record<string, number> = {};
for (const d of days) months[d.date.slice(0, 7)] = (months[d.date.slice(0, 7)] ?? 0) + d.count;
const best = days.reduce((a, b) => (b.count > a.count ? b : a));
const [longest, current] = streaks(days);

const data = {
  user: USER,
  updated: new Date().toISOString().slice(0, 10),
  total: days.reduce((s, d) => s + d.count, 0),
  longest_streak: longest,
  current_streak: current,
  best_day: { date: best.date, count: best.count },
  months,
  days,
};
writeFileSync(OUT, JSON.stringify(data, null, 1) + "\n");
console.log(`${days.length} dias, ${data.total} contribuições, maior sequência ${longest}, atual ${current}`);
