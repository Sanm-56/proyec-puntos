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
        let cart = loadCart(); let latestPointsSummary = { subtotal: 0, total: 0, puntosGanados: 0 };
        const cartList = document.getElementById("listaCarrito"); const subtotalElement = document.getElementById("subtotalCarrito"); const totalElement = document.getElementById("totalCarrito"); const countElement = document.getElementById("contadorCarrito"); const pointsElement = document.getElementById("puntosGanados");
        function createButton(text, label, action) { const button = document.createElement("button"); button.type = "button"; button.textContent = text; button.setAttribute("aria-label", label); button.addEventListener("click", action); return button; }
        function render() {
            if (!cartList || !subtotalElement || !totalElement || !countElement || !pointsElement) return;
            cartList.innerHTML = ""; let subtotal = 0; let totalQuantity = 0;
            cart.forEach((product, index) => {
                const item = document.createElement("li"); const description = document.createElement("span");
                description.textContent = `${product.nombre} - ${namespace.formatPrice(product.precio)} x${product.cantidad}`;
                item.append(description, createButton("-", `Restar una unidad de ${product.nombre}`, () => decrement(index)), createButton("X", `Eliminar ${product.nombre} del carrito`, () => remove(index)));
                cartList.appendChild(item); subtotal += product.precio * product.cantidad; totalQuantity += product.cantidad;
            });
            const earnedPoints = Math.floor(subtotal / 1000); latestPointsSummary = { subtotal, total: subtotal, puntosGanados: earnedPoints };
            subtotalElement.textContent = subtotal.toLocaleString("es-CO"); totalElement.textContent = subtotal.toLocaleString("es-CO"); countElement.textContent = totalQuantity; pointsElement.textContent = earnedPoints; localStorage.setItem("carrito", JSON.stringify(cart));
        }
        function add(button) { if (button.disabled) return; const name = button.dataset.nombre.trim(); const price = Number(button.dataset.precio); const existing = cart.find(product => product.nombre === name); if (existing) existing.cantidad += 1; else cart.push({ nombre: name, precio: price, cantidad: 1 }); render(); }
        function remove(index) { cart.splice(index, 1); render(); }
        function decrement(index) { if (cart[index].cantidad > 1) cart[index].cantidad -= 1; else cart.splice(index, 1); render(); }
        function empty() { cart = []; render(); }
        function checkout() { if (cart.length === 0) { alert("El carrito esta vacio"); return; } const message = namespace.whatsapp.buildCheckoutMessage(cart, latestPointsSummary); empty(); window.open(namespace.whatsapp.createWhatsappUrl(message), "_blank", "noopener,noreferrer"); }
        return { add, checkout, empty, render };
    }
    namespace.cart = { createCartController };
}(window.GoTienda = window.GoTienda || {}));
