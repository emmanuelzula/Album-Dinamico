// Configuración central del prototipo. Todo lo ajustable vive aquí.
export const CONFIG = {
  // Archivos de datos (rutas relativas a index.html)
  stickersUrl: "data/stickers.json",
  codesUrl: "data/codes.json",
  assetsBase: "assets/",

  // Clave de localStorage (cambia el sufijo para empezar con datos limpios)
  storageKey: "album-prototipo-v1",

  // Tamaño base de una página (misma proporción que las imágenes: 15 x 21)
  page: { width: 300, height: 420 },

  // Opciones del flipbook (StPageFlip)
  flip: {
    size: "stretch",
    // Límites por página. Son muy altos a propósito: el tamaño real lo decide el CSS
    // (ancho disponible y alto de la ventana), no estos valores.
    minWidth: 240,
    maxWidth: 1400,
    minHeight: 336,
    maxHeight: 1960,
    maxShadowOpacity: 0.4,
    showCover: false,
    mobileScrollSupport: false,
    flippingTime: 700,
  },

  // Duración (ms) del mensaje emergente
  toastMs: 2600,
};
