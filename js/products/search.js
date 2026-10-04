(function initializeProductSearch(namespace) {
    const state = { results: [], snapshot: null, revealedProducts: new Map(), highlightTimer: null };
    const byId = id => document.getElementById(id);
    const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
    const categoryLabel = category => ({ bebidas: "Bebidas", pasabocas: "Pasabocas", dulceria: "Dulcería", galletas: "Galletas", hogar: "Hogar" })[category] || category;
    const copy = entry => entry && { ...entry };
    function score(entry, query) {
        const code = normalize(entry.code), reference = normalize(entry.reference), name = normalize(entry.name), category = normalize(entry.category);
        if (code === query) return 0; if (reference === query) return 1; if (name === query) return 2;
        if (code.startsWith(query)) return 3; if (reference.startsWith(query)) return 4; if (name.startsWith(query)) return 5;
        if (code.includes(query)) return 6; if (reference.includes(query)) return 7; if (name.includes(query)) return 8;
        if (category === query || category.startsWith(query) || category.includes(query)) return 9;
        return -1;
    }
    function setStatus(text) { byId("productSearchStatus").textContent = text; }
    function closePanel() { const panel = byId("productSearchResults"), input = byId("productSearchInput"); panel.hidden = true; input.setAttribute("aria-expanded", "false"); }
    function render() {
        const panel = byId("productSearchResults"), input = byId("productSearchInput");
        panel.textContent = "";
        if (!state.results.length) {
            const message = document.createElement("p"); message.className = "product-search-empty"; message.textContent = "No encontramos productos con esa búsqueda."; panel.appendChild(message); panel.hidden = false; input.setAttribute("aria-expanded", "true"); setStatus(message.textContent); return;
        }
        state.results.forEach((entry, index) => {
            const button = document.createElement("button"); const heading = document.createElement("strong"); const details = document.createElement("span"); const meta = document.createElement("span");
            button.type = "button"; button.className = "product-search-result"; button.setAttribute("role", "option"); button.setAttribute("aria-label", `Ver ${entry.name}, código ${entry.code}`);
            heading.textContent = entry.name; details.textContent = `${entry.code} · ${categoryLabel(entry.category)} · ${namespace.formatPrice(entry.price)}`; meta.textContent = entry.available ? "Disponible" : "Agotado";
            meta.className = entry.available ? "search-available" : "search-unavailable"; button.append(heading, details, meta);
            button.addEventListener("click", () => selectResult(index));
            button.addEventListener("keydown", event => handleResultKey(event, index)); panel.appendChild(button);
        });
        panel.hidden = false; input.setAttribute("aria-expanded", "true"); setStatus(`${state.results.length} resultado${state.results.length === 1 ? "" : "s"} disponible${state.results.length === 1 ? "" : "s"}.`);
    }
    function snapshotCatalog() {
        if (state.snapshot) return;
        state.snapshot = Array.from(document.querySelectorAll("#productos .categoria-seccion")).map(section => ({ section, inactive: section.classList.contains("inactive") }));
    }
    function revealProduct(product) {
        if (!product) return;
        snapshotCatalog();
        state.snapshot.forEach(({ section }) => section.classList.remove("inactive"));
        if (!state.revealedProducts.has(product)) state.revealedProducts.set(product, product.classList.contains("mostrar"));
        if (Array.from(product.classList).some(name => name.startsWith("oculto-"))) product.classList.add("mostrar");
        product.classList.remove("producto-resaltado"); void product.offsetWidth; product.classList.add("producto-resaltado");
        clearTimeout(state.highlightTimer); state.highlightTimer = setTimeout(() => product.classList.remove("producto-resaltado"), 1800);
        product.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    function findProduct(entry) { const buttons = Array.from(document.querySelectorAll(".agregar-carrito")); const button = buttons.find(item => item.dataset.codigo === entry.code || item.dataset.nombre === entry.reference); return button && button.closest(".producto"); }
    function selectResult(index) {
        const entry = state.results[index]; if (!entry) return;
        const product = entry.variantFamily && namespace.products.selectVariant ? namespace.products.selectVariant(entry.reference) : findProduct(entry);
        revealProduct(product || findProduct(entry)); closePanel();
    }
    function handleResultKey(event, index) {
        const buttons = Array.from(byId("productSearchResults").querySelectorAll(".product-search-result"));
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length; buttons[next].focus(); }
        if (event.key === "Escape") { event.preventDefault(); closePanel(); byId("productSearchInput").focus(); }
    }
    function search(query) {
        const normalizedQuery = normalize(query);
        if (!normalizedQuery) { state.results = []; closePanel(); setStatus(""); return []; }
        state.results = namespace.products.getAll().map(entry => ({ entry, rank: score(entry, normalizedQuery) })).filter(result => result.rank >= 0).sort((a, b) => a.rank - b.rank || a.entry.code.localeCompare(b.entry.code)).map(result => result.entry);
        render(); return getResults();
    }
    function restoreCatalog() {
        if (state.snapshot) state.snapshot.forEach(({ section, inactive }) => section.classList.toggle("inactive", inactive));
        state.revealedProducts.forEach((wasShown, product) => product.classList.toggle("mostrar", wasShown));
        state.snapshot = null; state.revealedProducts.clear();
    }
    function clear() { const input = byId("productSearchInput"), clearButton = byId("clearProductSearch"); input.value = ""; state.results = []; closePanel(); restoreCatalog(); clearButton.hidden = true; setStatus(""); }
    function focus() { byId("productSearchInput").focus(); }
    function getResults() { return state.results.map(copy); }
    function init() {
        const input = byId("productSearchInput"), clearButton = byId("clearProductSearch"); if (!input || input.dataset.ready) return; input.dataset.ready = "true";
        input.addEventListener("input", () => { const hasQuery = Boolean(normalize(input.value)); clearButton.hidden = !hasQuery; if (hasQuery) search(input.value); else clear(); });
        input.addEventListener("keydown", event => { if (event.key === "ArrowDown" && state.results.length) { event.preventDefault(); const first = byId("productSearchResults").querySelector(".product-search-result"); if (first) first.focus(); } if (event.key === "Escape") closePanel(); });
        clearButton.addEventListener("click", clear);
    }
    namespace.productSearch = { init, search, clear, focus, getResults };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
}(window.GoTienda = window.GoTienda || {}));
