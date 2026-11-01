"""Desenha o contrib-heatmap.svg a partir de data/contributions.json.

Só biblioteca padrão. O ano vai sendo preenchido semana a semana, da esquerda
para a direita, com o total subindo junto; no fim o dia de hoje fica pulsando.

Uso: python3 scripts/render_heatmap_svg.py
"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data/contributions.json"
OUT = ROOT / "contrib-heatmap.svg"

W, H = 860, 300
BAR = 34
CELL, GAP = 12, 3
STEP = CELL + GAP
X0, Y0 = 48, 112
# Nível 0 a 4, na escala do vermelho da GlouSoft.
PALETTE = ["#161b22", "#3f1012", "#6e1518", "#a2171a", "#e5383b"]
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
# Tempo da animação: começo, cada semana e o atraso entre as linhas da coluna.
START, WEEK_T, ROW_T = 0.3, 0.075, 0.02
FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"


def fmt_day(iso):
    d = date.fromisoformat(iso)
    return f"{MONTHS[d.month - 1]} {d.day}"


def main():
    data = json.loads(DATA.read_text())
    days = data["days"]
    first = date.fromisoformat(days[0]["date"])
    # O calendário do GitHub começa no domingo.
    start = first.toordinal() - (first.isoweekday() % 7)

    cells, labels = [], []
    weekly = {}
    last_month = None
    for i, d in enumerate(days):
        dt = date.fromisoformat(d["date"])
        week, row = divmod(dt.toordinal() - start, 7)
        weekly[week] = weekly.get(week, 0) + d["count"]
        x, y = X0 + week * STEP, Y0 + row * STEP
        delay = START + week * WEEK_T + row * ROW_T
        today = " today" if i == len(days) - 1 else ""
        cells.append(
            f'<rect class="c{today}" x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="2.5" '
            f'fill="{PALETTE[d["level"]]}" style="animation-delay:{delay:.3f}s"/>')
        if dt.month != last_month and row == 0 and week < 52:
            labels.append(f'<text x="{x}" y="{Y0 - 8}" class="lbl m" '
                          f'style="animation-delay:{delay:.2f}s">{MONTHS[dt.month - 1]}</text>')
            last_month = dt.month

    for row, name in ((1, "Mon"), (3, "Wed"), (5, "Fri")):
        labels.append(f'<text x="16" y="{Y0 + row * STEP + 10}" class="lbl">{name}</text>')

    legend_x = W - 20 - 5 * STEP - 34
    legend = "".join(
        f'<rect x="{legend_x + i * STEP}" y="62" width="{CELL}" height="{CELL}" rx="2.5" fill="{c}"/>'
        for i, c in enumerate(PALETTE))
    legend += (f'<text x="{legend_x - 8}" y="72" class="lbl" text-anchor="end">Less</text>'
               f'<text x="{legend_x + 5 * STEP + 4}" y="72" class="lbl">More</text>')

    # Contador: um quadro por semana com o total acumulado até ali.
    frames, total = [(0.0, 0)], 0
    for week in sorted(weekly):
        total += weekly[week]
        if total != frames[-1][1]:
            frames.append((START + week * WEEK_T + 6 * ROW_T, total))
    num_x = 20 + len(f"{data['total']:,}") * 13.2
    counter = []
    for n, (t, value) in enumerate(frames):
        end = f'end="{frames[n + 1][0]:.3f}s"' if n + 1 < len(frames) else 'fill="freeze"'
        counter.append(
            f'<text x="{num_x:.0f}" y="74" text-anchor="end" class="big" visibility="hidden">'
            f'{value:,}<set attributeName="visibility" to="visible" begin="{t:.3f}s" {end}/></text>')
    done = START + max(weekly) * WEEK_T + 6 * ROW_T

    busiest = max(data["months"].items(), key=lambda kv: kv[1])
    by, bm = busiest[0].split("-")
    stats = [
        ("LONGEST STREAK", f'{data["longest_streak"]} days'),
        ("CURRENT STREAK", f'{data["current_streak"]} days'),
        ("BEST DAY", f'{data["best_day"]["count"]} on {fmt_day(data["best_day"]["date"])}'),
        ("BUSIEST MONTH", f'{MONTHS[int(bm) - 1]} {by} · {busiest[1]:,}'),
    ]
    col = (W - 40) / len(stats)
    footer = "".join(
        f'<text x="{20 + i * col + 8}" y="{H - 44}" class="lbl">{k}</text>'
        f'<text x="{20 + i * col + 8}" y="{H - 22}" class="stat">{v}</text>'
        for i, (k, v) in enumerate(stats))
    seps = "".join(
        f'<path d="M{20 + i * col} {H - 58} V{H - 16}" stroke="#21262d"/>' for i in range(1, len(stats)))

    style = f"""
    text {{ font-family: {FONT}; }}
    .lbl {{ font-size: 10px; fill: #7d8590; }}
    .dim {{ font-size: 12px; fill: #7d8590; }}
    .big {{ font-size: 22px; font-weight: 700; fill: #ff6b6b; }}
    .sub {{ font-size: 13px; fill: #c9d1d9; }}
    .stat {{ font-size: 15px; font-weight: 700; fill: #f0f6fc; }}
    .c {{ opacity: 0; transform-box: fill-box; transform-origin: center;
          animation: pop .45s cubic-bezier(.2,.8,.3,1.3) forwards; }}
    .today {{ animation: pop .45s cubic-bezier(.2,.8,.3,1.3) forwards, glow 1.8s {done + .4:.2f}s ease-in-out infinite; }}
    .m {{ opacity: 0; animation: fade .4s ease-out forwards; }}
    .late {{ opacity: 0; animation: fade .6s {done + .2:.2f}s ease-out forwards; }}
    @keyframes pop {{ from {{ opacity: 0; transform: scale(.3); }} to {{ opacity: 1; transform: none; }} }}
    @keyframes fade {{ to {{ opacity: 1; }} }}
    @keyframes glow {{ 50% {{ fill: #ff8a80; }} }}
    """
    dots = "".join(
        f'<circle cx="{22 + i * 18}" cy="{BAR / 2}" r="5.5" fill="{c}"/>'
        for i, c in enumerate(["#ff5f57", "#febc2e", "#28c840"]))

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="t">
<title id="t">{data["total"]:,} contributions in the last 12 months</title>
<defs><style>{style}</style></defs>
<rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" rx="12" fill="#0d1117" stroke="#30363d"/>
<path d="M0.5 {BAR} H{W - 0.5}" stroke="#30363d"/>{dots}
<text x="{W / 2}" y="{BAR / 2 + 4}" text-anchor="middle" class="dim">romulo@glousoft: ~/contributions</text>
{"".join(counter)}
<text x="{num_x + 8:.0f}" y="74" class="sub">contributions in the last 12 months</text>
{legend}
{"".join(labels)}
{"".join(cells)}
<path d="M20 {H - 74} H{W - 20}" stroke="#21262d"/>
<g class="late">{seps}{footer}</g>
</svg>
"""
    OUT.write_text(svg)
    print(f"{OUT.name}: {len(svg) // 1024} KB, atualizado em {data['updated']}")


if __name__ == "__main__":
    main()
