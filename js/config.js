// Configuración central del prototipo. Todo lo ajustable vive aquí.
export const CONFIG = {
  // Archivos de datos (rutas relativas a index.html)
  stickersUrl: "data/stickers.json",
  codesUrl: "data/codes.json",
  assetsBase: "assets/",

  // Clave de localStorage (cambia el sufijo para empezar con datos limpios)
  storageKey: "album-prototipo-v1",

  // Ancho base de una página. El alto y las proporciones salen de "page_size_px" en
  // data/stickers.json (tamaño real de las imágenes), no hay que tocarlos a mano.
  pageBaseWidth: 300,

  // Cómo se acomoda la estampa dentro del hueco de la página:
  //   "contain" = completa y sin deformar (puede dejar ver parte del hueco)
  //   "cover"   = llena el hueco sin deformar (recorta los bordes de la estampa)
  //   "fill"    = llena el hueco estirando la estampa
  stickerFit: "contain",

  // Opciones del flipbook (StPageFlip)
  flip: {
    size: "stretch",
    // Límites del ancho por página. Son muy altos a propósito: el tamaño real lo decide el CSS
    // (ancho disponible y alto de la ventana). Los límites de alto se calculan solos.
    minWidth: 240,
    maxWidth: 1400,
    maxShadowOpacity: 0.4,
    // La portada se ve sola (página 1) y el resto en pliegos de dos páginas
    showCover: true,
    mobileScrollSupport: false,
    flippingTime: 700,
  },

  // Duración (ms) del mensaje emergente
  toastMs: 2600,
};
