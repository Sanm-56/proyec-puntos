(function initializeAccount(namespace) {
    const byId = id => document.getElementById(id);
    const initialHistory = () => ({ orders: [], details: new Map(), hasMore: false, loaded: false, loading: false });
    const state = { user: null, profile: null, role: "user", saving: false, activeTab: "profile", history: initialHistory() };
    const client = () => namespace.supabase && namespace.supabase.isAvailable() ? namespace.supabase.client : null;
    const message = (text, error = false) => { const element = byId("accountMessage"); element.textContent = text; element.classList.toggle("auth-error", error); };
    const historyMessage = (text, error = false) => { const element = byId("orderHistoryMessage"); element.textContent = text; element.classList.toggle("auth-error", error); };
    const formatDate = value => { try { return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(value)); } catch (_) { return "No disponible"; } };
    const formatOrderDate = value => { try { return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch (_) { return "No disponible"; } };
    const roleLabel = role => role === "admin" ? "Administrador" : "Usuario";
    const price = value => namespace.formatPrice(Number(value));
    const orderStatus = status => namespace.orders && namespace.orders.statusLabel ? namespace.orders.statusLabel(status) : "Estado no disponible";

    function clearHistory() {
        state.history = initialHistory();
        const list = byId("orderHistoryList");
        if (list) list.replaceChildren();
        const more = byId("btnVerMasPedidos");
        if (more) more.hidden = true;
        const status = byId("orderHistoryMessage");
        if (status) {
            status.textContent = "";
            status.classList.remove("auth-error");
        }
    }

    function clear() {
        state.user = null;
        state.profile = null;
        state.role = "user";
        state.activeTab = "profile";
        clearHistory();
        byId("accountContent").hidden = true;
    }

    function closeAccount() {
        const modal = byId("accountModal");
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
    }

    function setAccountTab(tab, focus = false) {
        const profile = tab !== "orders";
        state.activeTab = profile ? "profile" : "orders";
        const profileTab = byId("accountTabProfile");
        const ordersTab = byId("accountTabOrders");
        profileTab.setAttribute("aria-selected", String(profile));
        ordersTab.setAttribute("aria-selected", String(!profile));
        profileTab.tabIndex = profile ? 0 : -1;
        ordersTab.tabIndex = profile ? -1 : 0;
        byId("accountProfilePanel").hidden = !profile;
        byId("accountOrdersPanel").hidden = profile;
        if (focus) (profile ? profileTab : ordersTab).focus();
        if (!profile && state.user && !state.history.loaded && !state.history.loading) loadOrderHistory();
    }

    function renderAccount() {
        if (!state.user || !state.profile) return;
        byId("accountEmail").textContent = state.user.email || "No disponible";
        byId("accountCreatedAt").textContent = state.user.created_at ? formatDate(state.user.created_at) : "No disponible";
        byId("accountRole").textContent = roleLabel(state.role);
        byId("accountFullName").value = state.profile.full_name || "";
        byId("accountPhone").value = state.profile.phone || "";
        byId("accountContent").hidden = false;
        setAccountTab(state.activeTab);
    }

    function addText(parent, tag, value, className) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value;
        parent.appendChild(element);
        return element;
    }

    function addItemDetail(parent, label, value) {
        addText(parent, "p", label + ": " + value, "order-item-value");
    }

    function renderOrderDetails(container, order, items) {
        container.replaceChildren();
        addText(container, "h4", "Pedido " + (order.order_number || ""));
        const summary = document.createElement("div");
        summary.className = "order-detail-summary";
        addText(summary, "p", "Fecha: " + formatOrderDate(order.created_at));
        addText(summary, "p", "Estado: " + orderStatus(order.status));
        addText(summary, "p", "Subtotal: " + price(order.subtotal));
        addText(summary, "p", "Total: " + price(order.total));
        container.appendChild(summary);
        addText(container, "h5", "Productos");
        if (!items.length) {
            addText(container, "p", "No se encontraron productos para este pedido.", "account-history-message");
            return;
        }
        const itemList = document.createElement("div");
        itemList.className = "order-item-list";
        items.forEach(item => {
            const row = document.createElement("article");
            row.className = "order-item";
            addText(row, "h5", item.product_name || "Producto");
            if (item.product_reference) addItemDetail(row, "Referencia", item.product_reference);
            addItemDetail(row, "Código", item.product_code || "No disponible");
            addItemDetail(row, "Cantidad", String(item.quantity));
            addItemDetail(row, "Precio unitario", price(item.unit_price));
            addItemDetail(row, "Total de línea", price(item.line_total));
            itemList.appendChild(row);
        });
        container.appendChild(itemList);
    }

    async function toggleOrderDetails(order, button, container) {
        if (!container.hidden) {
            container.hidden = true;
            button.setAttribute("aria-expanded", "false");
            button.textContent = "Ver detalles";
            return;
        }
        container.hidden = false;
        button.setAttribute("aria-expanded", "true");
        button.textContent = "Ocultar detalles";
        const cached = state.history.details.get(order.id);
        if (cached) {
            renderOrderDetails(container, order, cached);
            return;
        }
        container.replaceChildren();
        addText(container, "p", "Cargando detalles...", "account-history-message");
        const userId = state.user && state.user.id;
        try {
            const items = await namespace.orders.getOrderDetails(order.id);
            if (!state.user || state.user.id !== userId) return;
            state.history.details.set(order.id, items);
            renderOrderDetails(container, order, items);
        } catch (_) {
            if (!state.user || state.user.id !== userId) return;
            container.replaceChildren();
            addText(container, "p", "No pudimos cargar los detalles del pedido. Inténtalo nuevamente.", "account-history-message auth-error");
        }
    }

    function renderOrderHistory() {
        const list = byId("orderHistoryList");
        const more = byId("btnVerMasPedidos");
        list.replaceChildren();
        if (!state.history.orders.length) {
            if (state.history.loaded) historyMessage("Aún no tienes pedidos registrados.");
            more.hidden = true;
            return;
        }
        historyMessage("");
        state.history.orders.forEach((order, index) => {
            const card = document.createElement("article");
            card.className = "order-history-card";
            addText(card, "h3", order.order_number || "Pedido");
            addText(card, "p", formatOrderDate(order.created_at), "order-history-date");
            addText(card, "p", "Estado: " + orderStatus(order.status), "order-history-status");
            addText(card, "p", "Total: " + price(order.total), "order-history-total");
            const button = document.createElement("button");
            const details = document.createElement("div");
            const detailsId = "orderHistoryDetails" + index;
            button.className = "auth-link order-details-toggle";
            button.type = "button";
            button.textContent = "Ver detalles";
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-controls", detailsId);
            details.id = detailsId;
            details.className = "order-history-details";
            details.hidden = true;
            button.addEventListener("click", () => toggleOrderDetails(order, button, details));
            card.append(button, details);
            list.appendChild(card);
        });
        more.hidden = !state.history.hasMore;
    }

    async function loadOrderHistory(append = false) {
        if (state.history.loading || !state.user || !namespace.orders || !namespace.orders.getMyOrders) return;
        state.history.loading = true;
        historyMessage(append ? "Cargando más pedidos..." : "Cargando pedidos...");
        const userId = state.user.id;
        try {
            const offset = append ? state.history.orders.length : 0;
            const result = await namespace.orders.getMyOrders(offset);
            if (!state.user || state.user.id !== userId) return;
            state.history.orders = append ? state.history.orders.concat(result.orders) : result.orders;
            state.history.hasMore = result.hasMore;
            state.history.loaded = true;
            renderOrderHistory();
        } catch (_) {
            if (!state.user || state.user.id !== userId) return;
            historyMessage("No pudimos cargar tus pedidos. Inténtalo nuevamente.", true);
            byId("btnVerMasPedidos").hidden = true;
        } finally {
            state.history.loading = false;
        }
    }

    async function loadOwnProfile() {
        if (!state.user || !client()) return;
        const userId = state.user.id;
        message("Cargando cuenta...");
        byId("accountContent").hidden = true;
        try {
            const profileResult = await client().from("profiles").select("full_name, phone").eq("id", userId).maybeSingle();
            if (!state.user || state.user.id !== userId) return;
            if (profileResult.error) throw profileResult.error;
            if (!profileResult.data) {
                message("No se encontró tu perfil. Cierra sesión e intenta nuevamente; si continúa, contacta soporte.", true);
                return;
            }
            state.profile = profileResult.data;
            const roleResult = await client().from("user_roles").select("role").eq("user_id", userId).maybeSingle();
            if (!state.user || state.user.id !== userId) return;
            state.role = !roleResult.error && roleResult.data && roleResult.data.role === "admin" ? "admin" : "user";
            renderAccount();
            message("Cuenta lista.");
        } catch (_) {
            message("No fue posible cargar tu cuenta. Intenta nuevamente.", true);
        }
    }

    async function updateOwnProfile(form) {
        if (state.saving || !state.user || !client()) return;
        const fullName = form.fullName.value.trim();
        const phone = form.phone.value.trim();
        if (!fullName || !phone) return message("Completa nombre y teléfono.", true);
        if (fullName.length > 120 || phone.length > 40) return message("Revisa la longitud de los datos ingresados.", true);
        state.saving = true;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        message("Guardando cambios...");
        try {
            const result = await client().from("profiles").update({ full_name: fullName, phone }).eq("id", state.user.id).select("full_name, phone").maybeSingle();
            if (result.error || !result.data) throw result.error || new Error("profile-not-updated");
            state.profile = result.data;
            renderAccount();
            message("Perfil actualizado correctamente.");
        } catch (_) {
            message("No fue posible actualizar el perfil. Intenta nuevamente.", true);
        } finally {
            state.saving = false;
            button.disabled = false;
        }
    }

    function openAccount() {
        if (!state.user) return;
        const modal = byId("accountModal");
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        if (state.profile) renderAccount();
        else loadOwnProfile();
        byId("btnCerrarCuenta").focus();
    }

    async function refresh() { await loadOwnProfile(); }

    function handleAuthState(user) {
        if (!user) {
            closeAccount();
            clear();
            return;
        }
        const changedUser = !state.user || state.user.id !== user.id;
        state.user = user;
        if (changedUser) clearHistory();
        loadOwnProfile();
    }

    function bindTabs() {
        const tabs = [byId("accountTabProfile"), byId("accountTabOrders")];
        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => setAccountTab(index === 0 ? "profile" : "orders"));
            tab.addEventListener("keydown", event => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
                setAccountTab(next === 0 ? "profile" : "orders", true);
            });
        });
    }

    function bind() {
        byId("btnAbrirCuenta").addEventListener("click", openAccount);
        byId("btnCerrarCuenta").addEventListener("click", closeAccount);
        byId("btnCerrarSesionCuenta").addEventListener("click", () => namespace.auth && namespace.auth.signOut());
        byId("accountForm").addEventListener("submit", event => { event.preventDefault(); updateOwnProfile(event.currentTarget); });
        byId("btnVerMasPedidos").addEventListener("click", () => loadOrderHistory(true));
        byId("accountModal").addEventListener("click", event => { if (event.target === event.currentTarget) closeAccount(); });
        document.addEventListener("keydown", event => { if (event.key === "Escape" && !byId("accountModal").hidden) closeAccount(); });
        bindTabs();
        if (namespace.auth && namespace.auth.getUser) namespace.auth.getUser().then(result => handleAuthState(result && result.data && result.data.user));
    }

    namespace.account = { loadOwnProfile, updateOwnProfile, renderAccount, openAccount, closeAccount, refresh, handleAuthState, loadOrderHistory };
    document.addEventListener("DOMContentLoaded", bind);
}(window.GoTienda = window.GoTienda || {}));
