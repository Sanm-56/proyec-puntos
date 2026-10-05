(function initializeAdminDashboard(namespace) {
    const pageSize = 20;
    const byId = id => document.getElementById(id);
    const emptyCollection = () => ({ rows: [], hasMore: false, loading: false });
    const state = { loading: false, loaded: false, activeTab: "summary", summary: {}, orders: emptyCollection(), users: emptyCollection(), details: new Map(), mutatingOrders: new Set() };
    const client = () => namespace.supabase && namespace.supabase.isAvailable() ? namespace.supabase.client : null;
    const isAdmin = () => Boolean(namespace.adminAuth && namespace.adminAuth.isAdmin && namespace.adminAuth.isAdmin());
    const formatPrice = value => namespace.formatPrice(Number(value));
    const formatDate = value => { try { return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch (_) { return "No disponible"; } };
    const statusLabel = value => namespace.orders && namespace.orders.statusLabel ? namespace.orders.statusLabel(value) : "Estado no disponible";

    function setStatus(text, error = false) {
        const node = byId("adminDashboardStatus");
        if (!node) return;
        node.textContent = text;
        node.classList.toggle("auth-error", error);
    }

    function clearMemory() {
        state.loading = false;
        state.loaded = false;
        state.summary = {};
        state.orders = emptyCollection();
        state.users = emptyCollection();
        state.details = new Map();
        state.mutatingOrders = new Set();
        ["adminSummaryCards", "adminSummaryBreakdown", "adminOrdersList", "adminUsersList"].forEach(id => {
            const node = byId(id);
            if (node) node.replaceChildren();
        });
        ["btnVerMasAdminPedidos", "btnVerMasAdminUsuarios"].forEach(id => {
            const node = byId(id);
            if (node) node.hidden = true;
        });
        setStatus("");
    }

    function addText(parent, tag, text, className) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        parent.appendChild(node);
        return node;
    }

    async function countRows(table, filter) {
        let query = client().from(table).select("*", { count: "exact", head: true });
        if (filter) query = filter(query);
        const result = await query;
        if (result.error) throw result.error;
        return result.count || 0;
    }

    async function loadSummary() {
        const requests = {
            users: () => countRows("profiles"),
            admins: () => countRows("user_roles", query => query.eq("role", "admin")),
            normalUsers: () => countRows("user_roles", query => query.eq("role", "user")),
            products: () => countRows("catalog_products"),
            activeProducts: () => countRows("catalog_products", query => query.eq("active", true)),
            availableProducts: () => countRows("catalog_products", query => query.eq("available", true)),
            unavailableProducts: () => countRows("catalog_products", query => query.eq("available", false)),
            orders: () => countRows("orders"),
            pending: () => countRows("orders", query => query.eq("status", "pending")),
            confirmed: () => countRows("orders", query => query.eq("status", "confirmed")),
            preparing: () => countRows("orders", query => query.eq("status", "preparing")),
            completed: () => countRows("orders", query => query.eq("status", "completed")),
            cancelled: () => countRows("orders", query => query.eq("status", "cancelled"))
        };
        const results = await Promise.all(Object.entries(requests).map(async ([key, request]) => {
            try {
                return [key, { value: await request(), error: false }];
            } catch (_) {
                return [key, { value: null, error: true }];
            }
        }));
        if (!isAdmin()) return true;
        state.summary = Object.fromEntries(results);
        renderSummary();
        return results.some(([, result]) => result.error);
    }

    function metric(key) {
        const item = state.summary[key];
        return item && !item.error ? String(item.value) : "No disponible";
    }

    function renderSummary() {
        const cards = byId("adminSummaryCards");
        const breakdown = byId("adminSummaryBreakdown");
        cards.replaceChildren();
        [
            ["Usuarios", metric("users")],
            ["Productos", metric("products")],
            ["Pedidos", metric("orders")],
            ["Pedidos pendientes", metric("pending")]
        ].forEach(([label, value]) => {
            const card = document.createElement("article");
            card.className = "admin-summary-card";
            addText(card, "p", label);
            addText(card, "strong", value);
            cards.appendChild(card);
        });
        breakdown.replaceChildren();
        const groups = [
            ["Usuarios", [["Administradores", "admins"], ["Usuarios normales", "normalUsers"]]],
            ["Catálogo", [["Activos", "activeProducts"], ["Disponibles", "availableProducts"], ["No disponibles", "unavailableProducts"]]],
            ["Pedidos", [["Pendientes", "pending"], ["Confirmados", "confirmed"], ["En preparación", "preparing"], ["Completados", "completed"], ["Cancelados", "cancelled"]]]
        ];
        groups.forEach(([title, values]) => {
            const section = document.createElement("section");
            section.className = "admin-metric-group";
            addText(section, "h3", title);
            values.forEach(([label, key]) => addText(section, "p", label + ": " + metric(key)));
            breakdown.appendChild(section);
        });
    }

    async function loadOrders(append = false) {
        if (!isAdmin() || state.orders.loading) return false;
        state.orders.loading = true;
        const offset = append ? state.orders.rows.length : 0;
        try {
            const result = await client().from("orders")
                .select("id, order_number, customer_name, customer_phone, created_at, status, subtotal, total, delivery_city, delivery_neighborhood, delivery_address, delivery_instructions")
                .order("created_at", { ascending: false })
                .range(offset, offset + pageSize);
            if (result.error) throw result.error;
            const rows = Array.isArray(result.data) ? result.data : [];
            if (!isAdmin()) return true;
            state.orders.rows = append ? state.orders.rows.concat(rows.slice(0, pageSize)) : rows.slice(0, pageSize);
            state.orders.hasMore = rows.length > pageSize;
            renderOrders();
            return false;
        } catch (_) {
            if (!append) state.orders.rows = [];
            state.orders.hasMore = false;
            renderOrders();
            return true;
        } finally {
            state.orders.loading = false;
        }
    }

    async function loadUsers(append = false) {
        if (!isAdmin() || state.users.loading) return false;
        state.users.loading = true;
        const offset = append ? state.users.rows.length : 0;
        try {
            const profilesResult = await client().from("profiles")
                .select("id, full_name, phone, created_at")
                .order("created_at", { ascending: false })
                .range(offset, offset + pageSize);
            if (profilesResult.error) throw profilesResult.error;
            const profileRows = Array.isArray(profilesResult.data) ? profilesResult.data : [];
            const visibleProfiles = profileRows.slice(0, pageSize);
            let roles = [];
            if (visibleProfiles.length) {
                const rolesResult = await client().from("user_roles").select("user_id, role").in("user_id", visibleProfiles.map(profile => profile.id));
                if (rolesResult.error) throw rolesResult.error;
                roles = Array.isArray(rolesResult.data) ? rolesResult.data : [];
            }
            const roleByUser = new Map(roles.map(role => [role.user_id, role.role]));
            const rows = visibleProfiles.map(profile => ({ full_name: profile.full_name, phone: profile.phone, created_at: profile.created_at, role: roleByUser.get(profile.id) === "admin" ? "Administrador" : "Usuario" }));
            if (!isAdmin()) return true;
            state.users.rows = append ? state.users.rows.concat(rows) : rows;
            state.users.hasMore = profileRows.length > pageSize;
            renderUsers();
            return false;
        } catch (_) {
            if (!append) state.users.rows = [];
            state.users.hasMore = false;
            renderUsers();
            return true;
        } finally {
            state.users.loading = false;
        }
    }

    function renderOrderDetails(container, order, items) {
        container.replaceChildren();
        addText(container, "h4", "Pedido " + (order.order_number || ""));
        addText(container, "p", "Cliente: " + (order.customer_name || "No disponible"));
        addText(container, "p", "Teléfono: " + (order.customer_phone || "No disponible"));
        addText(container, "p", "Fecha: " + formatDate(order.created_at));
        addText(container, "p", "Estado: " + statusLabel(order.status));
        addText(container, "p", "Subtotal: " + formatPrice(order.subtotal));
        addText(container, "p", "Total: " + formatPrice(order.total));
        addText(container, "h5", "Entrega");
        if (!order.delivery_address) {
            addText(container, "p", "Sin información de entrega registrada.");
        } else {
            addText(container, "p", "Ciudad/Municipio: " + (order.delivery_city || "No disponible"));
            if (order.delivery_neighborhood) addText(container, "p", "Barrio: " + order.delivery_neighborhood);
            addText(container, "p", "Dirección: " + order.delivery_address);
            if (order.delivery_instructions) addText(container, "p", "Indicaciones: " + order.delivery_instructions);
        }
        addText(container, "h5", "Productos");
        const itemList = document.createElement("div");
        itemList.className = "admin-order-items";
        items.forEach(item => {
            const row = document.createElement("article");
            row.className = "admin-order-item";
            addText(row, "h6", item.product_name || "Producto");
            addText(row, "p", "Referencia: " + (item.product_reference || "No disponible"));
            addText(row, "p", "Código: " + (item.product_code || "No disponible"));
            addText(row, "p", "Cantidad: " + String(item.quantity));
            addText(row, "p", "Precio unitario: " + formatPrice(item.unit_price));
            addText(row, "p", "Total de línea: " + formatPrice(item.line_total));
            itemList.appendChild(row);
        });
        if (!items.length) addText(container, "p", "No se encontraron productos para este pedido.");
        container.appendChild(itemList);
    }

    async function toggleOrderDetails(order, button, container) {
        if (!container.hidden) {
            container.hidden = true;
            button.textContent = "Ver detalle";
            button.setAttribute("aria-expanded", "false");
            return;
        }
        container.hidden = false;
        button.textContent = "Ocultar detalle";
        button.setAttribute("aria-expanded", "true");
        if (state.details.has(order.id)) {
            renderOrderDetails(container, order, state.details.get(order.id));
            return;
        }
        container.replaceChildren();
        addText(container, "p", "Cargando detalle...");
        try {
            const result = await client().from("order_items")
                .select("product_name, product_reference, product_code, quantity, unit_price, line_total")
                .eq("order_id", order.id)
                .order("created_at", { ascending: true });
            if (result.error || !isAdmin()) throw result.error || new Error("not-admin");
            const items = Array.isArray(result.data) ? result.data : [];
            state.details.set(order.id, items);
            renderOrderDetails(container, order, items);
        } catch (_) {
            container.replaceChildren();
            addText(container, "p", "No pudimos cargar el detalle del pedido.", "auth-error");
        }
    }

    async function changeOrderStatus(order, nextStatus, actions) {
        if (!namespace.orderManagement || state.mutatingOrders.has(order.order_number)) return;
        const transition = namespace.orderManagement.getAllowedTransitions(order.status).find(item => item.status === nextStatus);
        if (!transition) return;
        if (transition.destructive && !window.confirm("¿Seguro que deseas cancelar el pedido " + order.order_number + "? Esta acción no se puede deshacer.")) return;
        state.mutatingOrders.add(order.order_number);
        actions.querySelectorAll("button").forEach(button => { button.disabled = true; });
        setStatus("Actualizando el pedido " + order.order_number + "...");
        try {
            const result = await namespace.orderManagement.updateStatus(order.order_number, nextStatus);
            order.status = result.new_status;
            order.updated_at = result.updated_at;
            state.details.delete(order.id);
            await refresh();
            setStatus(result.changed ? "Pedido " + result.order_number + " actualizado a " + statusLabel(result.new_status) + "." : "El pedido ya tenía ese estado.");
        } catch (error) {
            setStatus(namespace.orderManagement.errorMessage(error), true);
        } finally {
            state.mutatingOrders.delete(order.order_number);
            if (!state.loading) actions.querySelectorAll("button").forEach(button => { button.disabled = false; });
        }
    }

    function renderOrderActions(order) {
        const actions = document.createElement("div");
        actions.className = "admin-order-actions";
        const transitions = namespace.orderManagement ? namespace.orderManagement.getAllowedTransitions(order.status) : [];
        if (!transitions.length) {
            addText(actions, "p", "Estado final: no admite más cambios.", "admin-order-terminal");
            return actions;
        }
        addText(actions, "p", "Cambiar estado:", "admin-order-actions-label");
        transitions.forEach(transition => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "auth-link admin-status-action" + (transition.destructive ? " admin-status-cancel" : "");
            button.textContent = transition.label;
            button.setAttribute("aria-label", transition.label + " pedido " + order.order_number);
            button.addEventListener("click", () => changeOrderStatus(order, transition.status, actions));
            actions.appendChild(button);
        });
        return actions;
    }

    function renderOrders() {
        const list = byId("adminOrdersList");
        const more = byId("btnVerMasAdminPedidos");
        list.replaceChildren();
        if (!state.orders.rows.length) {
            addText(list, "p", "No hay pedidos recientes para mostrar.", "admin-empty");
        } else {
            state.orders.rows.forEach((order, index) => {
                const card = document.createElement("article");
                card.className = "admin-record-card";
                addText(card, "h3", order.order_number || "Pedido");
                addText(card, "p", "Cliente: " + (order.customer_name || "No disponible"));
                addText(card, "p", "Teléfono: " + (order.customer_phone || "No disponible"));
                addText(card, "p", formatDate(order.created_at));
                addText(card, "p", "Estado: " + statusLabel(order.status));
                addText(card, "p", "Total: " + formatPrice(order.total), "admin-record-total");
                card.appendChild(renderOrderActions(order));
                const button = document.createElement("button");
                const details = document.createElement("div");
                button.type = "button";
                button.className = "auth-link admin-detail-toggle";
                button.textContent = "Ver detalle";
                button.setAttribute("aria-expanded", "false");
                details.id = "adminOrderDetails" + index;
                details.hidden = true;
                details.className = "admin-order-details";
                button.setAttribute("aria-controls", details.id);
                button.addEventListener("click", () => toggleOrderDetails(order, button, details));
                card.append(button, details);
                list.appendChild(card);
            });
        }
        more.hidden = !state.orders.hasMore;
    }

    function renderUsers() {
        const list = byId("adminUsersList");
        const more = byId("btnVerMasAdminUsuarios");
        list.replaceChildren();
        if (!state.users.rows.length) {
            addText(list, "p", "No hay usuarios para mostrar.", "admin-empty");
        } else {
            state.users.rows.forEach(user => {
                const card = document.createElement("article");
                card.className = "admin-record-card";
                addText(card, "h3", user.full_name || "Sin nombre");
                addText(card, "p", "Teléfono: " + (user.phone || "No disponible"));
                addText(card, "p", "Tipo de cuenta: " + user.role);
                addText(card, "p", "Registro: " + formatDate(user.created_at));
                list.appendChild(card);
            });
        }
        more.hidden = !state.users.hasMore;
    }

    function setTab(tab, focus = false) {
        const tabs = { summary: byId("adminTabSummary"), orders: byId("adminTabOrders"), users: byId("adminTabUsers") };
        const panels = { summary: byId("adminSummaryPanel"), orders: byId("adminOrdersPanel"), users: byId("adminUsersPanel") };
        const active = Object.prototype.hasOwnProperty.call(tabs, tab) ? tab : "summary";
        state.activeTab = active;
        Object.keys(tabs).forEach(key => {
            const selected = key === active;
            tabs[key].setAttribute("aria-selected", String(selected));
            tabs[key].tabIndex = selected ? 0 : -1;
            panels[key].hidden = !selected;
        });
        if (focus) tabs[active].focus();
    }

    async function refresh() {
        if (!isAdmin() || !client() || state.loading) {
            if (!isAdmin() && namespace.adminAuth) namespace.adminAuth.openAdmin();
            return false;
        }
        state.loading = true;
        byId("btnActualizarAdmin").disabled = true;
        setStatus("Cargando panel administrativo...");
        const results = await Promise.all([loadSummary(), loadOrders(false), loadUsers(false)]);
        if (!isAdmin()) {
            close();
            return false;
        }
        state.loading = false;
        state.loaded = true;
        byId("btnActualizarAdmin").disabled = false;
        setStatus(results.some(Boolean) ? "No pudimos cargar algunos datos administrativos." : "Panel administrativo actualizado.", results.some(Boolean));
        return !results.some(Boolean);
    }

    async function open() {
        if (!isAdmin()) {
            if (namespace.adminAuth) namespace.adminAuth.openAdmin();
            return false;
        }
        if (namespace.adminAuth) namespace.adminAuth.openAdmin();
        if (!state.loaded) await refresh();
        return true;
    }

    function close() {
        clearMemory();
        if (namespace.adminAuth) namespace.adminAuth.closeAdmin();
    }

    function bindTabs() {
        const names = ["summary", "orders", "users"];
        names.forEach((name, index) => {
            const tab = byId("adminTab" + name.charAt(0).toUpperCase() + name.slice(1));
            tab.addEventListener("click", () => setTab(name));
            tab.addEventListener("keydown", event => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? names.length - 1 : (index + (event.key === "ArrowRight" ? 1 : names.length - 1)) % names.length;
                setTab(names[next], true);
            });
        });
    }

    function init() {
        byId("btnAbrirAdmin").addEventListener("click", open);
        byId("btnActualizarAdmin").addEventListener("click", refresh);
        byId("btnVerMasAdminPedidos").addEventListener("click", () => loadOrders(true));
        byId("btnVerMasAdminUsuarios").addEventListener("click", () => loadUsers(true));
        bindTabs();
        if (namespace.adminAuth && namespace.adminAuth.subscribe) namespace.adminAuth.subscribe(adminState => {
            if (!adminState.isAdmin) close();
        });
    }

    namespace.adminDashboard = Object.freeze({ init, open, close, refresh, getState: () => Object.freeze({ loading: state.loading, loaded: state.loaded, activeTab: state.activeTab }) });
    document.addEventListener("DOMContentLoaded", init);
}(window.GoTienda = window.GoTienda || {}));
