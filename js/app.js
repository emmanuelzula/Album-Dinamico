import { CONFIG } from "./config.js";
import { createLocalStore } from "./store-local.js";

const store = createLocalStore(CONFIG);

const $ = (id) => document.getElementById(id);
const els = {
  book: $("book"),
  count: $("count"),
  pageLabel: $("page-label"),
  prev: $("btn-prev"),
  next: $("btn-next"),
  form: $("redeem-form"),
  code: $("code-input"),
  random: $("btn-random"),
  reset: $("btn-reset"),
  hint: $("hint"),
  toast: $("toast"),
};

let pageSize = [1, 1];        // tamaño en píxeles de las imágenes de página (stickers.json)
let stickers = [];            // lista de estampas (stickers.json)
let pagesList = [];           // rutas de imágenes de página
let stickerEls = new Map();   // id -> { img, badge }
let pageFlip = null;
let toastTimer = null;

// ---------------------------------------------------------------- utilidades
function showToast(text, isError = false) {
  els.toast.textContent = text;
  els.toast.classList.toggle("error", isError);
  els.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("visible"), CONFIG.toastMs);
}

function assetUrl(path) {
  return CONFIG.assetsBase + path;
}

// ---------------------------------------------------------------- construcción
function buildPages() {
  els.book.innerHTML = "";
  pagesList.forEach((pagePath, index) => {
    const page = document.createElement("div");
    page.className = "page";

    const inner = document.createElement("div");
    inner.className = "page-inner";

    const bg = document.createElement("img");
    bg.className = "page-bg";
    bg.src = assetUrl(pagePath);
    bg.alt = `Página ${index + 1}`;
    bg.draggable = false;
    inner.appendChild(bg);

    stickers
      .filter((s) => s.page === index + 1)
      .forEach((s) => {
        const wrap = document.createElement("div");
        wrap.className = "sticker";
        wrap.style.left = s.x_pct + "%";
        wrap.style.top = s.y_pct + "%";
        wrap.style.width = s.w_pct + "%";
        wrap.style.height = s.h_pct + "%";

        const img = document.createElement("img");
        img.src = assetUrl(s.file);
        img.alt = `Estampa ${s.id}`;
        img.draggable = false;
        img.style.objectFit = CONFIG.stickerFit;

        const badge = document.createElement("span");
        badge.className = "badge";

        wrap.append(img, badge);
        inner.appendChild(wrap);
        stickerEls.set(s.id, { wrap, badge });
      });

    page.appendChild(inner);
    els.book.appendChild(page);
  });

  // Todas las medidas del flipbook salen de la proporción real de las imágenes
  const ratio = pageSize[1] / pageSize[0]; // alto / ancho de una página
  const baseW = CONFIG.pageBaseWidth;
  pageFlip = new St.PageFlip(els.book, {
    ...CONFIG.flip,
    width: baseW,
    height: Math.round(baseW * ratio),
    minHeight: Math.round(CONFIG.flip.minWidth * ratio),
    maxHeight: Math.round(CONFIG.flip.maxWidth * ratio),
  });
  pageFlip.loadFromHTML(els.book.querySelectorAll(".page"));
  pageFlip.on("flip", updatePageLabel);
  updatePageLabel();
}

function updatePageLabel() {
  const total = pagesList.length;
  const left = pageFlip.getCurrentPageIndex(); // página izquierda del pliego (empieza en 0)
  const isSpread = pageFlip.getOrientation() === "landscape" && left > 0 && left + 1 < total;
  els.pageLabel.textContent = isSpread
    ? `Páginas ${left + 1}–${left + 2} de ${total}`
    : `Página ${left + 1} de ${total}`;
}

// ---------------------------------------------------------------- estado
async function refresh(newStickerId = null) {
  const owned = await store.getOwned();

  stickerEls.forEach(({ wrap, badge }, id) => {
    const qty = owned[id] || 0;
    wrap.classList.toggle("owned", qty > 0);
    badge.textContent = qty > 1 ? `x${qty}` : "";
    badge.hidden = qty <= 1;
  });

  const distinct = Object.keys(owned).filter((id) => owned[id] > 0).length;
  els.count.textContent = `${distinct} / ${stickers.length}`;

  if (newStickerId !== null) {
    const el = stickerEls.get(newStickerId);
    if (el) {
      el.wrap.classList.remove("pop");
      void el.wrap.offsetWidth; // reinicia la animación
      el.wrap.classList.add("pop");
      // Se quita al terminar: si no, el navegador la repite cada vez que el flipbook
      // oculta y vuelve a mostrar la página.
      el.wrap.addEventListener("animationend", () => el.wrap.classList.remove("pop"), { once: true });
    }
  }
}

function goToStickerPage(stickerId) {
  const s = stickers.find((x) => x.id === stickerId);
  if (s) pageFlip.flip(s.page - 1);
}

async function handleResult(result) {
  if (!result.ok) {
    showToast(result.error, true);
    return;
  }
  goToStickerPage(result.stickerId);
  await refresh(result.stickerId);
  showToast(`¡Obtuviste la estampa ${result.stickerId}!`);
}

// ---------------------------------------------------------------- eventos
function bindEvents() {
  els.prev.addEventListener("click", () => pageFlip.flipPrev());
  els.next.addEventListener("click", () => pageFlip.flipNext());

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await store.redeemCode(els.code.value);
    if (result.ok) els.code.value = "";
    await handleResult(result);
  });

  els.random.addEventListener("click", async () => {
    const pick = stickers[Math.floor(Math.random() * stickers.length)];
    await handleResult(await store.grantSticker(pick.id));
  });

  els.reset.addEventListener("click", async () => {
    if (!confirm("¿Borrar todas las estampas y códigos canjeados de este navegador?")) return;
    await store.reset();
    await refresh();
    showToast("Álbum reiniciado.");
  });
}

// ---------------------------------------------------------------- arranque
async function init() {
  try {
    const res = await fetch(CONFIG.stickersUrl);
    if (!res.ok) throw new Error(`No se pudo cargar ${CONFIG.stickersUrl}`);
    const data = await res.json();
    pageSize = data.page_size_px;
    stickers = data.stickers;
    pagesList = data.pages;
    // Proporción de un pliego (dos páginas): el CSS la usa para no pasar del alto de la ventana
    document.documentElement.style.setProperty("--spread-ratio", String((2 * pageSize[0]) / pageSize[1]));
    els.hint.innerHTML =
      `Los códigos de prueba son <code>PROTO-01</code> a <code>PROTO-${String(stickers.length).padStart(2, "0")}</code> ` +
      `(uno por estampa, un solo uso).`;

    await store.load();
    buildPages();
    bindEvents();
    await refresh();
  } catch (err) {
    console.error(err);
    showToast("Error al iniciar: " + err.message + " (¿abriste con un servidor local?)", true);
  }
}

init();
