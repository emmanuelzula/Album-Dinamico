// Capa de datos LOCAL (localStorage + codes.json).
//
// Contrato que debe cumplir cualquier almacén (este, o el de Supabase después):
//   load()                 -> Promise<void>
//   getOwned()             -> Promise<{ [stickerId]: cantidad }>
//   redeemCode(codigo)     -> Promise<{ ok: true, stickerId } | { ok: false, error }>
//   grantSticker(id)       -> Promise<{ ok: true, stickerId }>   (solo para pruebas)
//   reset()                -> Promise<void>
//
// Para pasar a Supabase solo hay que escribir otro archivo con estas mismas funciones
// y cambiar el import en app.js.

export function createLocalStore(config) {
  let codes = {};
  let state = { owned: {}, usedCodes: [] };

  const normalize = (code) => String(code).trim().toUpperCase();

  function save() {
    localStorage.setItem(config.storageKey, JSON.stringify(state));
  }

  return {
    async load() {
      const res = await fetch(config.codesUrl);
      if (!res.ok) throw new Error(`No se pudo cargar ${config.codesUrl}`);
      codes = await res.json();
      try {
        const raw = localStorage.getItem(config.storageKey);
        if (raw) state = { owned: {}, usedCodes: [], ...JSON.parse(raw) };
      } catch {
        state = { owned: {}, usedCodes: [] };
      }
    },

    async getOwned() {
      return { ...state.owned };
    },

    async redeemCode(input) {
      const code = normalize(input);
      if (!code) return { ok: false, error: "Escribe un código." };
      if (!(code in codes)) return { ok: false, error: "Código no válido." };
      if (state.usedCodes.includes(code)) return { ok: false, error: "Ese código ya fue canjeado." };

      const stickerId = codes[code];
      state.usedCodes.push(code);
      state.owned[stickerId] = (state.owned[stickerId] || 0) + 1;
      save();
      return { ok: true, stickerId };
    },

    async grantSticker(stickerId) {
      state.owned[stickerId] = (state.owned[stickerId] || 0) + 1;
      save();
      return { ok: true, stickerId };
    },

    async reset() {
      state = { owned: {}, usedCodes: [] };
      save();
    },
  };
}
