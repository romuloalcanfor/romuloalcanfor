"""Gera o hero.svg: retrato ASCII à esquerda e cartão estilo neofetch à direita.

Só usa a biblioteca padrão. O retrato vem de data/portrait.txt (feito pelo
make_ascii.py) e a logo de assets/glousoft-logo.png, embutida em base64
porque o GitHub não carrega imagem externa de dentro de um SVG.

Uso: python3 scripts/make_hero_svg.py
"""
import base64
import random
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "hero.svg"

W, H = 860, 600
BAR = 34  # altura da barra de título

# Retrato: coluna da esquerda; a largura sai da grade do portrait.txt.
PX, PY = 20, 46
AREA_W, AREA_H = 404, 540
CELL_RATIO = 1.5  # altura / largura de cada caractere, igual ao make_ascii.py
DENSE = "0896$S3B%&"  # igual ao make_ascii.py, para o código vivo
FLICKER = 140
K = 10  # escala interna do retrato (ver portrait())

# Cartão
CX, CY = 444, 50  # CY desce o cartão para ficar no meio da altura
KEY_W = 88
FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace"

ROWS = [
    ("Role", "Founder & lead engineer @ GlouSoft"),
    ("Builds", "SaaS, mobile apps, APIs, AI automation"),
    ("Ships to", "App Store · Google Play · Web"),
    ("Mobile", "Capacitor · Expo · React Native · PWA"),
    ("Frontend", "TypeScript · React · Next.js · Tailwind"),
    ("Backend", "Supabase · Postgres · Node · Deno · Java"),
    ("Cloud", "Cloudflare Workers · D1 · R2"),
    ("Messaging", "WhatsApp Cloud API · SMS OTP · e-mail"),
    ("Live app", "Time da Leoa (iOS + Android)"),
    # Número fixo: atualizar à mão quando mudar (gh api graphql, privacy: PRIVATE).
    ("Repos", "18 private"),
    ("Site", "glousoft.com"),
]

# Vermelho da marca, pretos e cinzas: os blocos de cor do neofetch.
SWATCHES = ["#010101", "#3f1012", "#6e1518", "#a2171a", "#e5383b",
            "#7e7c7f", "#c9d1d9", "#f0f6fc"]


def portrait():
    lines = (ROOT / "data/portrait.txt").read_text().rstrip("\n").split("\n")
    cols, rows = max(len(l) for l in lines), len(lines)
    # Tudo do retrato é desenhado 10x maior e reduzido no fim, com coordenadas
    # inteiras. A letra é um pouco menor que a linha: com um vão fino e igual em
    # todas, não aparecem faixas quando o navegador encaixa as linhas no pixel.
    cell_h = AREA_H / rows * K
    cell_w = cell_h / CELL_RATIO
    width = cols * cell_w
    x0 = (PX + AREA_W / 2) * K - width / 2
    y0 = PY * K
    fill = base64.b64encode((ROOT / "assets/portrait-fill.jpg").read_bytes()).decode()
    base = base64.b64encode((ROOT / "assets/portrait-base.jpg").read_bytes()).decode()
    # Espaço comum some no começo da linha; o não separável segura a coluna.
    padded = [l.ljust(cols).replace(" ", "\u00a0") for l in lines]

    clips, texts = [], []
    for i, line in enumerate(padded):
        y = y0 + i * cell_h
        begin = 0.25 + i * 2.2 / rows
        clips.append(
            f'<rect x="{x0:.0f}" y="{y:.0f}" width="0" height="{cell_h + 6:.0f}">'
            f'<animate attributeName="width" from="0" to="{width:.0f}" begin="{begin:.3f}s" '
            f'dur="0.45s" fill="freeze"/></rect>')
        if line.strip("\u00a0"):
            texts.append(
                f'<text x="{x0:.0f}" y="{y + cell_h * 0.8:.0f}" textLength="{width:.0f}" '
                f'lengthAdjust="spacing">{escape(line)}</text>')

    # Código vivo: depois que o rosto aparece, algumas letras trocam por um instante.
    rng = random.Random(7)
    spots = [(r, c) for r, l in enumerate(lines) for c, ch in enumerate(l) if ch != " "]
    flicker = []
    for r, c in rng.sample(spots, FLICKER):
        ch = rng.choice(DENSE)
        dur = rng.uniform(2.5, 6.0)
        on = rng.uniform(0.05, 0.8)
        off = on + rng.uniform(0.12, 0.3) / dur
        x, y = x0 + c * cell_w, y0 + r * cell_h
        flicker.append(
            f'<g opacity="0"><rect x="{x:.0f}" y="{y:.0f}" width="{cell_w:.0f}" '
            f'height="{cell_h:.0f}" fill="#0d1117"/>'
            f'<text x="{x:.0f}" y="{y + cell_h * 0.8:.0f}">{escape(ch)}</text>'
            f'<animate attributeName="opacity" values="0;1;0" keyTimes="0;{on:.3f};{off:.3f}" '
            f'calcMode="discrete" dur="{dur:.2f}s" begin="{2.8 + rng.uniform(0, 3):.2f}s" '
            f'repeatCount="indefinite"/></g>')

    area_h = AREA_H * K
    return (
        f'<pattern id="photo" patternUnits="userSpaceOnUse" x="{x0:.0f}" y="{y0:.0f}" '
        f'width="{width:.0f}" height="{area_h:.0f}"><image width="{width:.0f}" height="{area_h:.0f}" '
        f'preserveAspectRatio="none" href="data:image/jpeg;base64,{fill}"/></pattern>'
        f'<clipPath id="wipe">{"".join(clips)}</clipPath>'
        f'<g class="ascii" transform="scale({1 / K})" font-size="{cell_w / 0.62:.0f}">'
        f'<g clip-path="url(#wipe)"><image x="{x0:.0f}" y="{y0:.0f}" width="{width:.0f}" '
        f'height="{area_h:.0f}" preserveAspectRatio="none" '
        f'href="data:image/jpeg;base64,{base}"/>{"".join(texts)}</g>{"".join(flicker)}</g>'
    )


def card():
    logo = base64.b64encode((ROOT / "assets/glousoft-logo.png").read_bytes()).decode()
    out = [
        f'<g class="in" style="animation-delay:.5s">'
        f'<image x="{CX}" y="{CY + 58}" width="190" height="46" href="data:image/png;base64,{logo}"/></g>',
        f'<g class="in" style="animation-delay:.65s">'
        f'<text x="{CX}" y="{CY + 140}" class="host"><tspan class="red">romulo</tspan>'
        f'<tspan class="dim">@</tspan><tspan class="red">glousoft.com</tspan></text>'
        f'<text x="{CX}" y="{CY + 158}" class="dim">{"-" * 19}</text></g>',
    ]
    y = CY + 184
    for n, (key, value) in enumerate(ROWS):
        delay = 0.8 + n * 0.12
        out.append(
            f'<g class="in" style="animation-delay:{delay:.2f}s">'
            f'<text x="{CX}" y="{y}" class="key">{escape(key)}</text>'
            f'<text x="{CX + KEY_W}" y="{y}" class="val">{escape(value)}</text></g>')
        y += 21
    delay = 0.8 + len(ROWS) * 0.12
    blocks = "".join(
        f'<rect x="{CX + i * 22}" y="{y + 2}" width="18" height="18" rx="3" fill="{c}" '
        f'stroke="#30363d"/>' for i, c in enumerate(SWATCHES))
    out.append(f'<g class="in" style="animation-delay:{delay:.2f}s">{blocks}</g>')
    out.append(
        f'<g class="in" style="animation-delay:{delay + 0.15:.2f}s">'
        f'<text x="{CX}" y="{y + 60}" class="val"><tspan class="red">romulo@glousoft</tspan>'
        f'<tspan class="dim">:~$ </tspan></text>'
        f'<rect class="cur" x="{CX + 19 * 7.8:.1f}" y="{y + 48}" width="8" height="15" '
        f'fill="#e5383b"/></g>')
    return "".join(out)


def chrome():
    dots = "".join(
        f'<circle cx="{22 + i * 18}" cy="{BAR / 2}" r="5.5" fill="{c}"/>'
        for i, c in enumerate(["#ff5f57", "#febc2e", "#28c840"]))
    return (
        f'<rect x="0.5" y="0.5" width="{W - 1}" height="{H - 1}" rx="12" fill="#0d1117" '
        f'stroke="#30363d"/>'
        f'<path d="M0.5 {BAR} H{W - 0.5}" stroke="#30363d"/>{dots}'
        f'<text x="{W / 2}" y="{BAR / 2 + 4}" text-anchor="middle" class="dim small">'
        f'romulo@glousoft: ~ (neofetch)</text>'
    )


def main():
    style = f"""
    text {{ font-family: {FONT}; }}
    .ascii text {{ fill: url(#photo); font-weight: 700; }}
    .ascii {{ text-rendering: geometricPrecision; }}
    .host {{ font-size: 16px; font-weight: 700; }}
    .key {{ font-size: 13px; fill: #ff6b6b; font-weight: 700; }}
    .val {{ font-size: 13px; fill: #c9d1d9; }}
    .red {{ fill: #ff6b6b; }}
    .dim {{ fill: #7d8590; font-size: 13px; }}
    .small {{ font-size: 12px; }}
    .in {{ opacity: 0; animation: in .5s ease-out forwards; }}
    .cur {{ animation: blink 1.1s steps(1) infinite; }}
    @keyframes in {{ from {{ opacity: 0; transform: translateX(10px); }}
                    to {{ opacity: 1; transform: none; }} }}
    @keyframes blink {{ 50% {{ opacity: 0; }} }}
    """
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="t d">
<title id="t">Romulo Alcanfor</title>
<desc id="d">Founder and lead engineer at GlouSoft. Builds SaaS, mobile apps for the App Store and Google Play, APIs and AI automation.</desc>
<defs>
<style>{style}</style>
</defs>
{chrome()}
{portrait()}
{card()}
</svg>
"""
    OUT.write_text(svg)
    print(f"{OUT.name}: {len(svg) // 1024} KB")


if __name__ == "__main__":
    main()
