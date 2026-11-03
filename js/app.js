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
  toast: $("toast"),
};

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

        const badge = document.createElement("span");
        badge.className = "badge";

        wrap.append(img, badge);
        inner.appendChild(wrap);
        stickerEls.set(s.id, { wrap, badge });
      });

    page.appendChild(inner);
    els.book.appendChild(page);
  });

  pageFlip = new St.PageFlip(els.book, {
    width: CONFIG.page.width,
    height: CONFIG.page.height,
    ...CONFIG.flip,
  });
  pageFlip.loadFromHTML(els.book.querySelectorAll(".page"));
  pageFlip.on("flip", updatePageLabel);
  updatePageLabel();
}

function updatePageLabel() {
  const current = pageFlip.getCurrentPageIndex() + 1;
  els.pageLabel.textContent = `Página ${current} de ${pagesList.length}`;
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
    stickers = data.stickers;
    pagesList = data.pages;

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
