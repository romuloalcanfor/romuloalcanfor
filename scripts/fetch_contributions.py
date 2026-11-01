"""Baixa o gráfico público de contribuições e salva em data/contributions.json.

Usa a mesma página que o GitHub mostra no perfil, então entram as
contribuições privadas (só a contagem, nunca o nome do repositório).
Só biblioteca padrão, para o Action rodar sem instalar nada.

Uso: python3 scripts/fetch_contributions.py
"""
import json
import re
import urllib.request
from collections import defaultdict
from datetime import date, timedelta
from html.parser import HTMLParser
from pathlib import Path

USER = "romuloalcanfor"
URL = f"https://github.com/users/{USER}/contributions"
OUT = Path(__file__).resolve().parent.parent / "data/contributions.json"


class Calendar(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cells = {}     # id -> (data, nível)
        self.tips = {}      # id -> texto do tooltip
        self._tip_for = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "td" and "data-date" in a:
            self.cells[a["id"]] = (a["data-date"], int(a.get("data-level", 0)))
        elif tag == "tool-tip":
            self._tip_for = a.get("for")

    def handle_data(self, data):
        if self._tip_for:
            self.tips[self._tip_for] = self.tips.get(self._tip_for, "") + data

    def handle_endtag(self, tag):
        if tag == "tool-tip":
            self._tip_for = None


def count(tip):
    m = re.match(r"\s*([\d,]+) contributions?", tip or "")
    return int(m.group(1).replace(",", "")) if m else 0


def streaks(days):
    longest = run = 0
    for d in days:
        run = run + 1 if d["count"] else 0
        longest = max(longest, run)
    # A sequência atual não quebra só porque hoje ainda não teve commit.
    current = 0
    for i, d in enumerate(reversed(days)):
        if d["count"]:
            current += 1
        elif i > 0:
            break
    return longest, current


def main():
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    cal = Calendar()
    cal.feed(html)
    if not cal.cells:
        raise SystemExit("não achei o calendário na página, o layout do GitHub mudou?")

    days = sorted(
        ({"date": d, "level": lvl, "count": count(cal.tips.get(cid))}
         for cid, (d, lvl) in cal.cells.items()),
        key=lambda d: d["date"])

    months = defaultdict(int)
    for d in days:
        months[d["date"][:7]] += d["count"]
    best = max(days, key=lambda d: d["count"])
    longest, current = streaks(days)

    data = {
        "user": USER,
        "updated": date.today().isoformat(),
        "total": sum(d["count"] for d in days),
        "longest_streak": longest,
        "current_streak": current,
        "best_day": {"date": best["date"], "count": best["count"]},
        "months": dict(sorted(months.items())),
        "days": days,
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(f"{len(days)} dias, {data['total']} contribuições, "
          f"maior sequência {longest}, atual {current}")


if __name__ == "__main__":
    main()
