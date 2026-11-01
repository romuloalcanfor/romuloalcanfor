"""Desenha o contrib.svg a partir de data/contributions.json.

Só biblioteca padrão. Mostra o que o gráfico verde do GitHub não mostra:
contribuições por mês em barras que sobem uma a uma, com o total contando
junto, e ao lado as sequências, o melhor dia e a média.

Uso: python3 scripts/render_contrib_svg.py
"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data/contributions.json"
OUT = ROOT / "contrib.svg"

W, H = 860, 330
BAR = 34
# Barras: área da esquerda, linha de base e altura máxima.
CHART_X0, CHART_X1, BASE, TALL = 40, 520, 268, 150
BAR_W = 24
# Blocos de números: duas colunas à direita.
TILE_X, TILE_Y, TILE_W, TILE_H, TILE_GAP = 548, 100, 140, 60, 12
START, STEP = 0.3, 0.12  # tempo da primeira barra e entre as barras
MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"


def fmt_day(iso):
    d = date.fromisoformat(iso)
    return f"{MONTHS[d.month - 1]} {d.day}"


def main():
    data = json.loads(DATA.read_text())
    months = list(data["months"].items())[-12:]
    top = max(v for _, v in months) or 1
    slot = (CHART_X1 - CHART_X0) / len(months)

    bars, counter_frames, total = [], [(0.0, 0)], 0
    for i, (key, value) in enumerate(months):
        x = CHART_X0 + i * slot + (slot - BAR_W) / 2
        h = max(2, value / top * TALL)
        delay = START + i * STEP
        peak = " peak" if value == top else ""
        bars.append(
            f'<rect class="bar{peak}" x="{x:.1f}" y="{BASE - h:.1f}" width="{BAR_W}" '
            f'height="{h:.1f}" rx="3" style="animation-delay:{delay:.2f}s"/>'
            f'<text class="num late" x="{x + BAR_W / 2:.1f}" y="{BASE - h - 6:.1f}" '
            f'text-anchor="middle" style="animation-delay:{delay + 0.35:.2f}s">{value:,}</text>'
            f'<text class="lbl" x="{x + BAR_W / 2:.1f}" y="{BASE + 18}" '
            f'text-anchor="middle">{MONTHS[int(key[5:]) - 1]}</text>')
        total += value
        if total != counter_frames[-1][1]:
            counter_frames.append((delay + 0.3, total))
    # O último quadro é sempre o total exato do ano.
    if counter_frames[-1][1] != data["total"]:
        counter_frames.append((counter_frames[-1][0] + 0.05, data["total"]))
    done = START + len(months) * STEP + 0.3

    num_x = 20 + len(f"{data['total']:,}") * 13.2
    counter = []
    for n, (t, value) in enumerate(counter_frames):
        end = f'end="{counter_frames[n + 1][0]:.3f}s"' if n + 1 < len(counter_frames) else 'fill="freeze"'
        counter.append(
            f'<text x="{num_x:.0f}" y="74" text-anchor="end" class="big" visibility="hidden">'
            f'{value:,}<set attributeName="visibility" to="visible" begin="{t:.3f}s" {end}/></text>')

    days = data["days"]
    active = sum(1 for d in days if d["count"])
    best = data["best_day"]
    tiles = [
        ("$ current streak", f'{data["current_streak"]}', "days", True),
        ("$ longest streak", f'{data["longest_streak"]}', "days", False),
        ("$ contributions", f'{data["total"]:,}', "total", False),
        ("$ active days", f"{active}", f"of {len(days)}", False),
        ("$ best day", f'{best["count"]}', fmt_day(best["date"]), False),
        ("$ avg / active day", f'{data["total"] / max(active, 1):.1f}', "per day", False),
    ]
    tile_svg = []
    for i, (label, value, sub, hot) in enumerate(tiles):
        x = TILE_X + (i % 2) * (TILE_W + TILE_GAP)
        y = TILE_Y + (i // 2) * (TILE_H + TILE_GAP)
        tile_svg.append(
            f'<g class="late" style="animation-delay:{done + i * 0.1:.2f}s">'
            f'<rect x="{x}" y="{y}" width="{TILE_W}" height="{TILE_H}" rx="8" fill="#161b22" '
            f'stroke="#30363d"/>'
            f'<text x="{x + 12}" y="{y + 18}" class="lbl">{label}</text>'
            f'<text x="{x + 12}" y="{y + 44}" class="tile{" hot" if hot else ""}">{value}'
            f'<tspan class="lbl" dx="6">{sub}</tspan></text></g>')

    style = f"""
    text {{ font-family: {FONT}; }}
    .lbl {{ font-size: 10px; fill: #7d8590; }}
    .dim {{ font-size: 12px; fill: #7d8590; }}
    .num {{ font-size: 10px; fill: #c9d1d9; }}
    .big {{ font-size: 22px; font-weight: 700; fill: #ff6b6b; }}
    .sub {{ font-size: 13px; fill: #c9d1d9; }}
    .tile {{ font-size: 20px; font-weight: 700; fill: #f0f6fc; }}
    .hot {{ fill: #ff6b6b; }}
    .bar {{ fill: url(#barfill); transform-box: fill-box; transform-origin: bottom;
            transform: scaleY(0); animation: grow .6s cubic-bezier(.2,.8,.3,1.1) forwards; }}
    .peak {{ fill: #ff6b6b; }}
    .late {{ opacity: 0; animation: fade .5s ease-out forwards; }}
    @keyframes grow {{ to {{ transform: scaleY(1); }} }}
    @keyframes fade {{ to {{ opacity: 1; }} }}
    """
    dots = "".join(
        f'<circle cx="{22 + i * 18}" cy="{BAR / 2}" r="5.5" fill="{c}"/>'
        for i, c in enumerate(["#ff5f57", "#febc2e", "#28c840"]))

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="t">
<title id="t">{data["total"]:,} contributions in the last 12 months</title>
<defs>
<linearGradient id="barfill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#e5383b"/><stop offset="1" stop-color="#6e1518"/>
</linearGradient>
<style>{style}</style>
</defs>
<rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" rx="12" fill="#0d1117" stroke="#30363d"/>
<path d="M0.5 {BAR} H{W - 0.5}" stroke="#30363d"/>{dots}
<text x="{W / 2}" y="{BAR / 2 + 4}" text-anchor="middle" class="dim">romulo@glousoft: ~/contributions</text>
{"".join(counter)}
<text x="{num_x + 8:.0f}" y="74" class="sub">contributions in the last 12 months</text>
<path d="M{CHART_X0} {BASE + 0.5} H{CHART_X1}" stroke="#30363d"/>
{"".join(bars)}
{"".join(tile_svg)}
</svg>
"""
    OUT.write_text(svg)
    print(f"{OUT.name}: {len(svg) // 1024} KB, atualizado em {data['updated']}")


if __name__ == "__main__":
    main()
