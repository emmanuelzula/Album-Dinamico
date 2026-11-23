# Álbum Dinámico · Prototipo

Visor de álbum con flipbook y estampas. Esta versión guarda todo en el navegador (`localStorage`).

## Probar en local

No abras `index.html` con doble clic (el navegador bloquea la carga de los JSON). Usa un servidor:

```
python3 -m http.server 8000
```

y abre http://localhost:8000

## Publicar en GitHub Pages

1. Sube esta carpeta a un repositorio.
2. En el repositorio: Settings → Pages → Source: rama `main`, carpeta `/ (root)`.

## Estructura

| Ruta | Contenido |
|---|---|
| `index.html` | Página principal |
| `css/style.css` | Estilos |
| `js/config.js` | Toda la configuración (rutas, tamaños, opciones del flipbook) |
| `js/store-local.js` | Capa de datos local; el contrato está documentado al inicio del archivo |
| `js/app.js` | Flipbook, canje de códigos, botones de prueba |
| `js/vendor/page-flip.browser.js` | Librería StPageFlip |
| `data/stickers.json` | Tamaño de las páginas y hueco de cada estampa (en %). Lo genera `tools/build_assets.py` |
| `data/codes.json` | Códigos de prueba `PROTO-01` a `PROTO-12` (uno por estampa). Lo genera el mismo script |
| `assets/pages`, `assets/stickers` | Imágenes optimizadas (WebP) de páginas y estampas |
| `tools/build_assets.py` | Prepara las imágenes y los datos a partir de los originales |

## Cambiar las imágenes

Las imágenes originales (PNG) no van en el proyecto: pesan mucho. Ponlas en una carpeta aparte con estos nombres:

```
page-01.png ... page-19.png        las 19 páginas (todas del mismo tamaño)
sticker-01.png ... sticker-12.png  una estampa por cada página con hueco
```

y ejecuta, desde la carpeta del proyecto:

```
pip install pillow opencv-python-headless numpy
python3 -I tools/build_assets.py --source ruta/a/originales
```

El script optimiza las imágenes, **detecta solo el hueco de cada estampa** y reescribe `data/stickers.json` y `data/codes.json`. Las estampas van en las páginas 6 a 17; para otro rango usa `--sticker-pages A-B`. Con `--debug carpeta` guarda imágenes con el hueco marcado para revisarlo.

Cómo se acomoda la estampa dentro del hueco se cambia con `stickerFit` en `js/config.js`.

## Cambiar a Supabase más adelante

Crear `js/store-supabase.js` con las mismas funciones que `store-local.js` (`load`, `getOwned`, `redeemCode`, `grantSticker`, `reset`) y cambiar el import en `js/app.js`.
