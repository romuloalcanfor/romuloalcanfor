"""Transforma a foto do rosto em texto ASCII (roda só local, uma vez).

Antes rode os dois scripts do Vision:
  swift scripts/segment.swift assets/rosto-original.jpg assets/rosto-mask-full.png
  swift scripts/jaw.swift assets/rosto-original.jpg assets/jaw.json

Saídas:
  data/portrait.txt         os caracteres, linha por linha
  assets/portrait-fill.jpg  a cor de cada ponto (branco em cima, vermelho
                            embaixo, apagado onde a foto é escura); o
                            make-hero.ts usa como preenchimento das letras
  assets/portrait-base.jpg  a mesma foto mais apagada e só na cabeça, que fica
                            atrás das letras

A pele vira uma trama de dígitos quase todos do mesmo peso, e quem desenha o
rosto é a cor que passa por dentro deles. Entre as letras aparece a foto
apagada, o que deixa o retrato claro e com cara de foto. As partes escuras
ficam vazias.

Uso: .venv/bin/python scripts/make_ascii.py
"""
import json
import random
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PHOTO = ROOT / "assets/rosto-original.jpg"
MASK = ROOT / "assets/rosto-mask-full.png"
JAW = ROOT / "assets/jaw.json"
OUT_TXT = ROOT / "data/portrait.txt"
OUT_FILL = ROOT / "assets/portrait-fill.jpg"
OUT_BASE = ROOT / "assets/portrait-base.jpg"

# Recorte na foto em pé (x0, y0, x1, y1): cabelo, orelhas, barba e pescoço.
CROP = (1008, 1028, 2064, 2460)
COLS = 168
CELL_RATIO = 1.5  # altura / largura de cada caractere
# Coordenadas abaixo são no recorte.
# Fio de cabelo caído na testa: vira um risco no ASCII.
STRAND = [(533, 385), (528, 398), (516, 440), (511, 480), (512, 520), (517, 560),
          (526, 590), (536, 614)]
# Gola da camiseta: dali para baixo, e dos ombros para fora, não entra.
SHOULDERS = 1280
COLLAR = [(850, 1290), (760, 1378), (530, 1408), (300, 1378), (210, 1290)]
# O pescoço vai apagando entre essas duas alturas, como na referência.
FADE = (1330, 1420)
# Quanto escurece abaixo da linha do maxilar: é essa sombra que desenha o queixo.
NECK_SHADE = 0.7
# Tom: CONTRAST acima de 1 afunda os meios-tons, LIFT devolve o brilho da pele.
SHARPEN, CONTRAST, LIFT = 0.8, 1.6, 1.7
BASE = 0.42  # brilho da foto que fica atrás das letras
STRAND_CUT = 0.25  # no cabelo, abaixo disso é vão entre os fios
# Do mais leve ao mais cheio. Abaixo de EMPTY fica vazio.
LIGHT, MID, DENSE = ".,:'", ";i1!7", "0896$S3B%&"
EMPTY, SPARSE, HALF = 0.07, 0.14, 0.22
BG = np.array([13, 17, 23], dtype=np.float32)  # #0d1117, fundo do painel
TOP = np.array([238, 241, 245], dtype=np.float32)
BOTTOM = np.array([240, 98, 108], dtype=np.float32)


def head_mask():
    """Silhueta da pessoa (cabelo, orelhas, rosto e pescoço) até a gola, de 0 a 1."""
    person = Image.open(MASK).convert("L").crop(CROP)
    w, h = person.size
    cut = Image.new("L", (w, h), 0)
    ImageDraw.Draw(cut).polygon(
        [(0, 0), (w, 0), (w, SHOULDERS), *COLLAR, (0, SHOULDERS)], fill=255)
    cut = cut.filter(ImageFilter.GaussianBlur(8))
    return np.minimum(np.asarray(person, np.float32), np.asarray(cut, np.float32)) / 255


def below_jaw(size):
    """De 0 a 1: quanto o ponto está abaixo da linha do maxilar (o pescoço)."""
    w, h = size
    jaw = [(x - CROP[0], y - CROP[1]) for x, y in json.loads(JAW.read_text())]
    # Desce um pouco a curva para a sombra começar na borda da barba.
    cx, cy = sum(x for x, _ in jaw) / len(jaw), jaw[0][1]
    jaw = [(cx + (x - cx) * 1.03, cy + (y - cy) * 1.03) for x, y in jaw]
    neck = Image.new("L", size, 0)
    ImageDraw.Draw(neck).polygon([(w, jaw[0][1]), *jaw, (0, jaw[-1][1]), (0, h), (w, h)], fill=255)
    return np.asarray(neck.filter(ImageFilter.GaussianBlur(14)), np.float32) / 255


def brightness(inside):
    """Foto em tons de 0 a 1, sem o fio da testa, com volume e detalhe nos escuros."""
    rgb = np.asarray(Image.open(PHOTO).convert("RGB").crop(CROP))
    strand = np.zeros(rgb.shape[:2], np.uint8)
    cv2.polylines(strand, [np.array(STRAND, np.int32)], False, 255, 11)
    gray = cv2.cvtColor(cv2.inpaint(rgb, strand, 7, cv2.INPAINT_TELEA), cv2.COLOR_RGB2GRAY)

    def stretch(img):
        arr = img.astype(np.float32) / 255
        lo, hi = np.percentile(arr[inside], [1, 99.5])
        return np.clip((arr - lo) / (hi - lo), 0, 1)

    # Nitidez fina: pelo da barba, cílios, textura da pele.
    soft = cv2.GaussianBlur(gray, (0, 0), 2.5)
    gray = cv2.addWeighted(gray, 1 + SHARPEN, soft, -SHARPEN, 0)
    full = stretch(gray)
    # No cabelo só o fio que brilha ganha letra; o vão entre os fios fica preto.
    local = stretch(cv2.createCLAHE(clipLimit=6.0, tileGridSize=(16, 16)).apply(gray))
    strands = np.clip((local - STRAND_CUT) * 2.0, 0, 1)
    # Isso vale só no que é bem escuro (cabelo, sobrancelha); a pele e a barba
    # seguem a luz natural da foto, que é o que dá volume ao rosto.
    weight = np.clip(1 - full / 0.28, 0, 1)
    return weight * strands + (1 - weight) * full ** CONTRAST


def shrink(arr, size):
    return np.asarray(Image.fromarray(arr.astype(np.float32)).resize(size, Image.LANCZOS)).clip(0, 1)


def glyph(b, rng):
    if b < EMPTY:
        return " "
    if b < SPARSE:
        return rng.choice(LIGHT)
    if b < HALF:
        return rng.choice(MID)
    return rng.choice(DENSE)


def main():
    w, h = CROP[2] - CROP[0], CROP[3] - CROP[1]
    region = head_mask()
    b = brightness(region > 0.5)
    y = np.arange(h, dtype=np.float32)[:, None]
    b = b * np.clip((FADE[1] - y) / (FADE[1] - FADE[0]), 0, 1)
    b = b * (1 - NECK_SHADE * below_jaw((w, h)))

    rows = round(COLS * h / w / CELL_RATIO)
    grid = shrink(b, (COLS, rows))
    alpha = shrink(region, (COLS, rows))
    rng = random.Random(29)
    # Sem rstrip: a grade precisa ter sempre COLS colunas para casar com o mapa de cor.
    lines = ["".join(glyph(v, rng) if a > 0.5 else " " for v, a in zip(row, arow))
             for row, arow in zip(grid, alpha)]
    OUT_TXT.parent.mkdir(exist_ok=True)
    OUT_TXT.write_text("\n".join(lines) + "\n")

    # Mapa de cor em 1,5x o tamanho em que aparece, para as letras pegarem o tom certo.
    fw = 600
    fh = round(fw * h / w)
    # A letra só cobre parte da célula, então o tom da pele vai mais para o claro.
    s2 = np.clip(shrink(b, (fw, fh)) * LIFT, 0, 1)[:, :, None] ** 0.85
    v = (np.arange(fh, dtype=np.float32) + 0.5) / fh
    tint = np.clip((v - 0.5) / 0.42, 0, 1)[:, None, None]
    color = TOP + (BOTTOM - TOP) * tint
    fill = BG + (color - BG) * s2
    Image.fromarray(fill.clip(0, 255).astype(np.uint8)).save(OUT_FILL, quality=72, optimize=True)
    # Atrás das letras só a pele clara aparece de verdade (s2 ao quadrado): o
    # cabelo e as sombras continuam pretos entre as letras, como na referência.
    inside = shrink((region > 0.5).astype(np.float32), (fw, fh))[:, :, None]
    base = BG + (color - BG) * s2 ** 2 * inside * BASE
    Image.fromarray(base.clip(0, 255).astype(np.uint8)).resize((fw // 2, fh // 2), Image.LANCZOS) \
        .save(OUT_BASE, quality=75, optimize=True)

    print(f"{OUT_TXT.relative_to(ROOT)}: {COLS}x{rows}, {OUT_FILL.relative_to(ROOT)}: {fw}x{fh}")


if __name__ == "__main__":
    main()
