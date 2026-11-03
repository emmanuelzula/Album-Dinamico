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
| `data/stickers.json` | Posición de cada estampa en su página (en %) |
| `data/codes.json` | Códigos de prueba `PROTO-01` a `PROTO-48` |
| `assets/pages`, `assets/stickers` | Imágenes de páginas y estampas |

## Cambiar a Supabase más adelante

Crear `js/store-supabase.js` con las mismas funciones que `store-local.js` (`load`, `getOwned`, `redeemCode`, `grantSticker`, `reset`) y cambiar el import en `js/app.js`.
