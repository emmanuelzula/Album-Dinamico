#!/usr/bin/env python3
"""Prepara los assets del visor a partir de las imágenes originales.

Entrada (carpeta --source):
    page-01.png ... page-NN.png        páginas del álbum (todas del mismo tamaño)
    sticker-01.png ... sticker-NN.png  estampas, una por página con hueco

Salida (carpeta --out, por defecto la raíz del proyecto):
    assets/pages/page-XX.webp          páginas optimizadas
    assets/stickers/sticker-XX.webp    estampas optimizadas
    data/stickers.json                 tamaño de página, lista de páginas y hueco de cada estampa
    data/codes.json                    un código de prueba por estampa (PROTO-01, PROTO-02, ...)

El hueco de cada estampa se detecta solo: en las páginas con estampa se busca la forma clara más
grande sobre el fondo verde (el recuadro festoneado). Sus coordenadas se guardan en porcentaje
del tamaño de la página, así el visor funciona con cualquier tamaño de pantalla.

Uso:
    python3 -I tools/build_assets.py --source ruta/a/originales
    python3 -I tools/build_assets.py --source ruta/a/originales --debug ruta/debug

Dependencias: pip install pillow opencv-python-headless numpy
"""
import argparse
import json
import re
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

# ---- Parámetros de detección del hueco (ajustar solo si cambia el diseño de las páginas) ----
LIGHT_MIN = 165        # brillo mínimo (en R, G y B) para considerar un píxel "claro"
MAX_SATURATION = 45    # diferencia máxima entre el canal mayor y el menor (gris, no color)
OPEN_PX = 15           # elimina líneas más delgadas que esto (las líneas del campo)
MIN_AREA_PCT = 5.0     # el hueco debe ocupar al menos este % de la página


def natural_key(path: Path):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", path.name)]


def parse_range(text: str):
    first, last = (int(v) for v in text.split("-"))
    if last < first:
        raise argparse.ArgumentTypeError("el rango debe ser ascendente, por ejemplo 6-17")
    return first, last


def find_slot(path: Path, debug_dir: Path | None):
    """Devuelve (x, y, w, h) en píxeles del hueco claro más grande de la página."""
    image = Image.open(path).convert("RGB")
    rgb = np.asarray(image).astype(int)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    mask = ((mn >= LIGHT_MIN) & (mx - mn <= MAX_SATURATION)).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (OPEN_PX, OPEN_PX))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    count, _, stats, _ = cv2.connectedComponentsWithStats(mask)
    if count < 2:
        raise RuntimeError(f"{path.name}: no se encontró ninguna zona clara para el hueco")
    best = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    x, y, w, h, area = (int(v) for v in stats[best])

    page_area = image.width * image.height
    if area / page_area * 100 < MIN_AREA_PCT:
        raise RuntimeError(f"{path.name}: el hueco detectado es muy pequeño ({area / page_area:.1%} de la página)")

    if debug_dir is not None:
        debug_dir.mkdir(parents=True, exist_ok=True)
        canvas = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)
        cv2.rectangle(canvas, (x, y), (x + w, y + h), (0, 0, 255), 6)
        cv2.imwrite(str(debug_dir / f"slot-{path.stem}.png"), cv2.resize(canvas, None, fx=0.4, fy=0.4))
    return x, y, w, h


def save_webp(src: Path, dest: Path, quality: int):
    Image.open(src).convert("RGB").save(dest, "WEBP", quality=quality, method=6)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, type=Path, help="carpeta con page-XX.png y sticker-XX.png")
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent,
                    help="raíz del proyecto (por defecto, la carpeta que contiene tools/)")
    ap.add_argument("--sticker-pages", type=parse_range, default=(6, 17), metavar="A-B",
                    help="páginas que llevan estampa, una por página (por defecto 6-17)")
    ap.add_argument("--quality", type=int, default=90, help="calidad WebP de 1 a 100 (por defecto 90)")
    ap.add_argument("--code-prefix", default="PROTO", help="prefijo de los códigos de prueba")
    ap.add_argument("--debug", type=Path, default=None, help="carpeta donde guardar imágenes con el hueco marcado")
    args = ap.parse_args()

    pages = sorted(args.source.glob("page-*.png"), key=natural_key)
    if not pages:
        sys.exit(f"No hay archivos page-XX.png en {args.source}")
    sizes = {Image.open(p).size for p in pages}
    if len(sizes) != 1:
        sys.exit(f"Las páginas tienen tamaños distintos: {sorted(sizes)}")
    page_w, page_h = sizes.pop()

    first, last = args.sticker_pages
    if last > len(pages):
        sys.exit(f"--sticker-pages llega a la página {last}, pero solo hay {len(pages)} páginas")
    count = last - first + 1
    stickers = [args.source / f"sticker-{i:02d}.png" for i in range(1, count + 1)]
    missing = [s.name for s in stickers if not s.exists()]
    if missing:
        sys.exit("Faltan estampas: " + ", ".join(missing))

    pages_dir = args.out / "assets" / "pages"
    stickers_dir = args.out / "assets" / "stickers"
    for folder in (pages_dir, stickers_dir):
        folder.mkdir(parents=True, exist_ok=True)
        for old in list(folder.glob("*.png")) + list(folder.glob("*.webp")):
            old.unlink()

    page_files = []
    for number, src in enumerate(pages, start=1):
        name = f"page-{number:02d}.webp"
        save_webp(src, pages_dir / name, args.quality)
        page_files.append(f"pages/{name}")

    entries = []
    for i, src in enumerate(stickers, start=1):
        page_number = first + i - 1
        x, y, w, h = find_slot(pages[page_number - 1], args.debug)
        name = f"sticker-{i:02d}.webp"
        save_webp(src, stickers_dir / name, args.quality)
        entries.append({
            "id": i,
            "page": page_number,
            "file": f"stickers/{name}",
            "x_pct": round(x / page_w * 100, 3),
            "y_pct": round(y / page_h * 100, 3),
            "w_pct": round(w / page_w * 100, 3),
            "h_pct": round(h / page_h * 100, 3),
        })
        print(f"estampa {i:02d} -> página {page_number:02d}  hueco x={x} y={y} {w}x{h} px")

    data_dir = args.out / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "stickers.json").write_text(
        json.dumps({"page_size_px": [page_w, page_h], "pages": page_files, "stickers": entries},
                   indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    codes = {f"{args.code_prefix}-{i:02d}": i for i in range(1, count + 1)}
    (data_dir / "codes.json").write_text(json.dumps(codes, indent=2) + "\n", encoding="utf-8")

    total = sum(f.stat().st_size for f in list(pages_dir.glob("*.webp")) + list(stickers_dir.glob("*.webp")))
    print(f"\n{len(page_files)} páginas y {count} estampas listas. Peso total de las imágenes: {total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
