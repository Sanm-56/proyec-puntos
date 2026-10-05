(function (namespace) {
    function getCatalog() {
        const catalog = new Map();
        document.querySelectorAll(".agregar-carrito").forEach(button => catalog.set(button.dataset.nombre.trim(), Number(button.dataset.precio)));
        namespace.products.variantGalleries.forEach(gallery => {
            const familyPrice = gallery.flavors.map(([, , reference]) => catalog.get(reference)).find(Number.isFinite);
            if (Number.isFinite(familyPrice)) gallery.flavors.forEach(([, , reference]) => catalog.set(reference, familyPrice));
        });
        return catalog;
    }
    function loadCart() {
        try {
            const catalog = getCatalog(); const savedCart = JSON.parse(localStorage.getItem("carrito")) || [];
            if (!Array.isArray(savedCart)) return [];
            return savedCart.filter(product => typeof product.nombre === "string" && Number.isInteger(product.cantidad) && product.cantidad > 0 && catalog.has(product.nombre.trim())).map(product => ({ nombre: product.nombre.trim(), precio: catalog.get(product.nombre.trim()), cantidad: product.cantidad }));
        } catch (error) { localStorage.removeItem("carrito"); return []; }
    }
    function createCartController() {
        let cart = loadCart(); let latestPointsSummary = { subtotal: 0, total: 0 };
        const cartList = document.getElementById("listaCarrito"); const subtotalElement = document.getElementById("subtotalCarrito"); const totalElement = document.getElementById("totalCarrito"); const countElement = document.getElementById("contadorCarrito"); const pointsElement = document.getElementById("puntosGanados"); const pointsLabel = document.getElementById("puntosGanadosEtiqueta"); const pointsValue = document.getElementById("puntosGanadosValor");
        function createButton(text, label, action) { const button = document.createElement("button"); button.type = "button"; button.textContent = text; button.setAttribute("aria-label", label); button.addEventListener("click", action); return button; }
        function render() {
            if (!cartList || !subtotalElement || !totalElement || !countElement || !pointsElement || !pointsLabel || !pointsValue) return;
            cartList.innerHTML = ""; let subtotal = 0; let totalQuantity = 0;
            cart.forEach((product, index) => {
                const item = document.createElement("li"); const description = document.createElement("span");
                description.textContent = `${product.nombre} - ${namespace.formatPrice(product.precio)} x${product.cantidad}`;
                item.append(description, createButton("-", `Restar una unidad de ${product.nombre}`, () => decrement(index)), createButton("X", `Eliminar ${product.nombre} del carrito`, () => remove(index)));
                cartList.appendChild(item); subtotal += product.precio * product.cantidad; totalQuantity += product.cantidad;
            });
            latestPointsSummary = { subtotal, total: subtotal };
            subtotalElement.textContent = subtotal.toLocaleString("es-CO"); totalElement.textContent = subtotal.toLocaleString("es-CO"); countElement.textContent = totalQuantity; renderPoints(subtotal); localStorage.setItem("carrito", JSON.stringify(cart));
        }
        function renderPoints(subtotal) {
            const clarification = document.querySelector(".regla-puntos");
            const loyalty = namespace.loyalty;
            const settings = loyalty && loyalty.getSettings && loyalty.getSettings();
            const settingsStatus = loyalty && loyalty.getSettingsStatus ? loyalty.getSettingsStatus() : "error";
            pointsValue.hidden = true;
            if (settingsStatus === "idle" || settingsStatus === "loading") { pointsLabel.textContent = "Cargando programa de puntos..."; if (clarification) clarification.textContent = "La conversi\u00f3n se mostrar\u00e1 cuando el programa est\u00e9 disponible."; return; }
            if (!settings) { pointsLabel.textContent = "Puntos estimados no disponibles."; if (clarification) clarification.textContent = "No pudimos cargar la conversi\u00f3n de puntos."; return; }
            if (!settings.enabled) { pointsLabel.textContent = "El programa de puntos est\u00e1 temporalmente desactivado."; if (clarification) clarification.textContent = "Los puntos de compras anteriores no cambian."; return; }
            const estimate = loyalty.estimatePoints(subtotal, settings);
            if (estimate === null) { pointsLabel.textContent = "Puntos estimados no disponibles."; return; }
            pointsLabel.textContent = "Puntos estimados por esta compra: ";
            pointsElement.textContent = estimate.toString();
            pointsValue.hidden = false;
            if (clarification) clarification.textContent = "Los puntos se acreditan cuando el pedido se completa. El c\u00e1lculo final lo confirma el servidor.";
        }
        function add(button) { if (button.disabled) return; const name = button.dataset.nombre.trim(); const price = Number(button.dataset.precio); const existing = cart.find(product => product.nombre === name); if (existing) existing.cantidad += 1; else cart.push({ nombre: name, precio: price, cantidad: 1 }); render(); }
        function remove(index) { cart.splice(index, 1); render(); }
        function decrement(index) { if (cart[index].cantidad > 1) cart[index].cantidad -= 1; else cart.splice(index, 1); render(); }
        function empty() { cart = []; render(); }
        function clearPersistedSnapshot(snapshot) {
            const current = JSON.stringify(cart);
            const persisted = JSON.stringify(snapshot);
            if (current === persisted) empty();
        }
        function checkout() {
            if (!namespace.orders) {
                const status = document.getElementById("checkoutStatus");
                if (status) {
                    status.textContent = "El servicio de pedidos no est\u00e1 disponible en este momento.";
                    status.classList.add("checkout-status-error");
                }
                return;
            }
            return namespace.orders.checkout(cart.map(product => ({ ...product })), clearPersistedSnapshot);
        }
        if (namespace.loyalty && namespace.loyalty.subscribe) namespace.loyalty.subscribe(() => render());
        if (namespace.loyalty && namespace.loyalty.loadSettings) namespace.loyalty.loadSettings().catch(() => {});
        return { add, checkout, empty, render };
    }
    namespace.cart = { createCartController };
}(window.GoTienda = window.GoTienda || {}));
