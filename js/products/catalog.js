(function initializeCatalog(namespace) {
    const CATEGORY_PREFIXES = Object.freeze({ bebidas: "BEB", pasabocas: "PAS", dulceria: "DUL", galletas: "GAL", hogar: "HOG" });
    const CODE_PATTERN = /^[A-Z]{3}-[0-9]{3}$/;
    let entries = [];
    let byCode = new Map();
    let byReference = new Map();
    let diagnostics = [];

    const clean = value => String(value || "").trim();
    const copy = entry => entry && { ...entry };
    function report(message) { diagnostics.push(message); console.warn(`[GO TIENDA catalog] ${message}`); }
    function add(entry) {
        if (!entry.code) report(`Código faltante para la referencia "${entry.reference}".`);
        else if (!CODE_PATTERN.test(entry.code)) report(`Código inválido "${entry.code}" para "${entry.reference}".`);
        else if (byCode.has(entry.code)) report(`Código duplicado "${entry.code}".`);
        if (!entry.reference) report(`Referencia faltante para el código "${entry.code || "sin código"}".`);
        else if (byReference.has(entry.reference)) report(`Referencia vendible duplicada "${entry.reference}".`);
        if (!entry.code || !entry.reference || !CODE_PATTERN.test(entry.code) || byCode.has(entry.code) || byReference.has(entry.reference)) return;
        entries.push(Object.freeze(entry)); byCode.set(entry.code, entry); byReference.set(entry.reference, entry);
    }
    function initialize() {
        entries = []; byCode = new Map(); byReference = new Map(); diagnostics = [];
        document.querySelectorAll(".agregar-carrito").forEach(button => {
            const product = button.closest(".producto");
            const category = clean(button.closest(".categoria-seccion") && button.closest(".categoria-seccion").id);
            const code = clean(button.dataset.codigo), reference = clean(button.dataset.nombre);
            if (!CATEGORY_PREFIXES[category]) report(`Categoría no soportada para "${reference}".`);
            else if (code && !code.startsWith(`${CATEGORY_PREFIXES[category]}-`)) report(`El código "${code}" no coincide con la categoría "${category}".`);
            add({ code, reference, category, name: clean(product && product.querySelector("h3") && product.querySelector("h3").textContent) || reference, price: Number(button.dataset.precio), available: !button.disabled });
        });
        (namespace.products.variantGalleries || []).forEach(gallery => {
            const family = gallery.products.map(reference => byReference.get(reference)).find(Boolean);
            gallery.flavors.forEach(([flavor, , reference, code]) => {
                if (!code) { report(`Variante "${reference}" sin código.`); return; }
                const existing = byReference.get(reference);
                if (existing) { if (existing.code !== code) report(`La variante "${reference}" no coincide con el código del catálogo.`); return; }
                if (!family) { report(`Variante "${reference}" sin familia vendible.`); return; }
                add({ code, reference, category: family.category, name: `${family.name} - ${flavor}`, price: family.price, available: family.available, variantFamily: family.reference });
            });
        });
    }
    function getAll() { return entries.map(copy); }
    function getByCode(code) { return copy(byCode.get(clean(code).toUpperCase())); }
    function getByReference(reference) { return copy(byReference.get(clean(reference))); }
    function getDiagnostics() { return diagnostics.slice(); }
    namespace.products = Object.assign(namespace.products || {}, { CATEGORY_PREFIXES, getAll, getByCode, getByReference, getDiagnostics, initializeCatalog: initialize });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize); else initialize();
}(window.GoTienda = window.GoTienda || {}));
