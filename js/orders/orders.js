(function (namespace) {
    const pendingKey = "goTiendaPendingCheckout";
    const historyPageSize = 20;
    const byId = id => document.getElementById(id);

    function setStatus(message, isError = false) {
        const status = byId("checkoutStatus");
        if (!status) return;
        status.textContent = message;
        status.classList.toggle("checkout-status-error", isError);
    }

    function setBusy(isBusy) {
        const button = byId("btnEnviarPedido");
        if (!button) return;
        button.disabled = isBusy;
        button.dataset.defaultText ||= button.textContent;
        button.textContent = isBusy ? "Guardando pedido..." : button.dataset.defaultText;
    }

    function getClient() {
        return namespace.supabase && namespace.supabase.client;
    }

    function statusLabel(status) {
        const labels = {
            pending: "Pendiente",
            confirmed: "Confirmado",
            preparing: "En preparación",
            completed: "Completado",
            cancelled: "Cancelado"
        };
        return labels[status] || "Estado no disponible";
    }

    async function getMyOrders(offset = 0, limit = historyPageSize) {
        if (!getClient()) throw new Error("ORDERS_UNAVAILABLE");
        const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
        const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= historyPageSize ? limit : historyPageSize;
        const result = await getClient().from("orders")
            .select("id, order_number, created_at, status, subtotal, total")
            .order("created_at", { ascending: false })
            .range(safeOffset, safeOffset + safeLimit);
        if (result.error) throw result.error;
        const rows = Array.isArray(result.data) ? result.data : [];
        return { orders: rows.slice(0, safeLimit), hasMore: rows.length > safeLimit };
    }

    async function getOrderDetails(orderId) {
        if (!getClient() || typeof orderId !== "string" || !orderId) throw new Error("ORDER_DETAILS_UNAVAILABLE");
        const result = await getClient().from("order_items")
            .select("product_name, product_reference, product_code, quantity, unit_price, line_total")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true });
        if (result.error) throw result.error;
        return Array.isArray(result.data) ? result.data : [];
    }

    function cartFingerprint(items) {
        return items.map(item => item.code + ":" + item.quantity).sort().join("|");
    }

    function createRequestId() {
        if (!window.crypto || typeof window.crypto.randomUUID !== "function") {
            throw new Error("REQUEST_ID_UNAVAILABLE");
        }
        return window.crypto.randomUUID();
    }

    function getRequestId(fingerprint) {
        try {
            const saved = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
            if (saved && saved.cartFingerprint === fingerprint && typeof saved.requestId === "string") {
                return saved.requestId;
            }
            const requestId = createRequestId();
            sessionStorage.setItem(pendingKey, JSON.stringify({ requestId, cartFingerprint: fingerprint, createdAt: Date.now() }));
            return requestId;
        } catch (error) {
            throw new Error("REQUEST_ID_UNAVAILABLE");
        }
    }

    function clearRequestId() {
        try {
            sessionStorage.removeItem(pendingKey);
        } catch (error) {
            // Storage is only an idempotency aid; a failed cleanup is safe.
        }
    }

    function buildItems(cart) {
        const quantities = new Map();
        if (!namespace.products || typeof namespace.products.getByReference !== "function") {
            throw new Error("CATALOG_UNAVAILABLE");
        }
        cart.forEach(item => {
            const product = namespace.products.getByReference(item.nombre);
            if (!product || !product.code) throw new Error("UNKNOWN_PRODUCT");
            const quantity = Number(item.cantidad);
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("INVALID_QUANTITY");
            quantities.set(product.code, (quantities.get(product.code) || 0) + quantity);
        });
        const items = Array.from(quantities, ([code, quantity]) => ({ code, quantity }));
        if (!items.length || items.some(item => item.quantity > 999)) throw new Error("INVALID_CART");
        return items;
    }

    function errorMessage(error) {
        const message = String(error && error.message || error || "").toUpperCase();
        if (message.includes("AUTH_REQUIRED")) return "Inicia sesión antes de guardar tu pedido.";
        if (message.includes("PROFILE_INCOMPLETE")) return "Completa tu perfil antes de guardar el pedido.";
        if (message.includes("PRODUCT_UNAVAILABLE")) return "Uno o más productos ya no están disponibles. Revisa tu carrito.";
        if (message.includes("PRODUCT_INACTIVE")) return "Uno o más productos ya no están activos. Revisa tu carrito.";
        if (message.includes("UNKNOWN_PRODUCT")) return "No fue posible validar un producto del carrito. Revisa el catálogo.";
        if (message.includes("INVALID_QUANTITY") || message.includes("INVALID_CART")) return "El carrito contiene una cantidad no válida.";
        if (message.includes("REQUEST_ID_UNAVAILABLE")) return "Tu navegador no puede preparar el pedido de forma segura. Actualízalo e inténtalo de nuevo.";
        return "No se pudo guardar el pedido. Tu carrito se conserva para que puedas intentarlo nuevamente.";
    }

    async function getSession() {
        if (!namespace.auth || typeof namespace.auth.getSession !== "function") return null;
        const result = await namespace.auth.getSession();
        return result && result.data && result.data.session;
    }

    function showWhatsappFallback(url) {
        const fallback = byId("checkoutWhatsappFallback");
        if (!fallback) return;
        fallback.href = url;
        fallback.hidden = false;
    }

    async function checkout(cart, clearCart) {
        if (!Array.isArray(cart) || !cart.length) {
            setStatus("El carrito está vacío.", true);
            return;
        }
        if (!getClient()) {
            setStatus("El servicio de pedidos no está disponible en este momento.", true);
            return;
        }

        let session;
        try {
            session = await getSession();
        } catch (error) {
            setStatus("No se pudo verificar tu sesión. Tu carrito se conserva.", true);
            return;
        }
        if (!session) {
            setStatus("Inicia sesión para guardar tu pedido. Tu carrito permanece intacto.", true);
            const authButton = byId("btnAbrirAuth");
            if (authButton) authButton.click();
            return;
        }

        let items;
        let requestId;
        try {
            items = buildItems(cart);
            requestId = getRequestId(cartFingerprint(items));
        } catch (error) {
            setStatus(errorMessage(error), true);
            return;
        }

        setBusy(true);
        setStatus("Guardando tu pedido...");
        let result;
        try {
            result = await getClient().rpc("create_order_from_cart", {
                p_items: items,
                p_client_request_id: requestId
            });
        } catch (error) {
            setBusy(false);
            setStatus(errorMessage(error), true);
            return;
        }
        setBusy(false);
        const { data, error } = result;
        if (error) {
            setStatus(errorMessage(error), true);
            return;
        }

        const order = Array.isArray(data) ? data[0] : data;
        if (!order || !order.order_number || !Number.isFinite(Number(order.total))) {
            setStatus("El pedido no devolvió una confirmación válida. Tu carrito se conserva.", true);
            return;
        }

        clearRequestId();
        if (typeof clearCart === "function") clearCart(cart);
        const trustedTotal = Number(order.total);
        const trustedSummary = { subtotal: Number(order.subtotal), total: trustedTotal, puntosGanados: Math.floor(trustedTotal / 1000) };
        const message = "Pedido: " + order.order_number + "\n\n" + namespace.whatsapp.buildCheckoutMessage(cart, trustedSummary);
        const whatsappUrl = namespace.whatsapp.createWhatsappUrl(message);
        setStatus("Pedido " + order.order_number + " guardado. Total confirmado: " + namespace.formatPrice(trustedTotal) + ".");
        showWhatsappFallback(whatsappUrl);
        const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        if (!popup) setStatus("Pedido " + order.order_number + " guardado. Usa el enlace para abrir WhatsApp.");
        return order;
    }

    namespace.orders = Object.freeze({ checkout, buildItems, errorMessage, getMyOrders, getOrderDetails, statusLabel, historyPageSize });
}(window.GoTienda = window.GoTienda || {}));
