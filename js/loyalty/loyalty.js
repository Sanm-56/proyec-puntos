(function initializeLoyalty(namespace) {
    const byId = id => document.getElementById(id);
    const state = { settings: null, settingsStatus: "idle", settingsPromise: null, userId: null, account: null, transactions: [], listeners: new Set() };
    const client = () => namespace.supabase && namespace.supabase.isAvailable() ? namespace.supabase.client : null;
    const formatNumber = value => new Intl.NumberFormat("es-CO").format(Number(value) || 0);
    const formatDate = value => { try { return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(value)); } catch (_) { return "Fecha no disponible"; } };

    function normalizeSettings(row) {
        const copAmount = Number(row && (row.cop_amount ?? row.copAmount));
        const pointsAmount = Number(row && (row.points_amount ?? row.pointsAmount));
        if (!Number.isSafeInteger(copAmount) || copAmount <= 0 || !Number.isSafeInteger(pointsAmount) || pointsAmount <= 0 || typeof row?.enabled !== "boolean") return null;
        return { copAmount, pointsAmount, enabled: row.enabled };
    }

    function getSettings() { return state.settings && { ...state.settings }; }
    function getSettingsStatus() { return state.settingsStatus; }
    function formatConversion(settings = state.settings) { return settings ? "$" + formatNumber(settings.copAmount) + " COP = " + formatNumber(settings.pointsAmount) + " punto(s)" : "Conversión no disponible"; }
    function estimatePoints(amount, settings = state.settings) {
        if (!settings || !settings.enabled || !Number.isSafeInteger(settings.copAmount) || !Number.isSafeInteger(settings.pointsAmount) || settings.copAmount <= 0 || settings.pointsAmount <= 0 || !Number.isSafeInteger(amount) || amount < 0) return null;
    return (BigInt(amount) * BigInt(settings.pointsAmount)) / BigInt(settings.copAmount);
    }
    function notify() { state.listeners.forEach(listener => listener(getSettings())); }
    function subscribe(listener) { state.listeners.add(listener); return () => state.listeners.delete(listener); }

    async function loadSettings(force = false) {
        if (state.settingsStatus === "ready" && !force) return getSettings();
        if (state.settingsStatus === "loading" && state.settingsPromise) return state.settingsPromise;
        state.settingsStatus = "loading";
        notify();
        state.settingsPromise = (async () => {
            if (!client()) throw new Error("LOYALTY_UNAVAILABLE");
            const result = await client().from("loyalty_settings").select("id, cop_amount, points_amount, enabled").eq("id", 1).single();
            if (result.error) throw result.error;
            const settings = normalizeSettings(result.data);
            if (!settings) throw new Error("LOYALTY_SETTINGS_UNAVAILABLE");
            state.settings = settings;
            state.settingsStatus = "ready";
            notify();
            return getSettings();
        })();
        try {
            return await state.settingsPromise;
        } catch (error) {
            state.settings = null;
            state.settingsStatus = "error";
            notify();
            throw error;
        } finally {
            state.settingsPromise = null;
        }
    }

    function mapTransactionType(type) { return type === "order_earned" ? "Puntos acreditados por pedido" : "Movimiento de puntos"; }
    function getOrderPointsState(order) {
        const points = Number(order && order.points_earned) || 0;
        if (points <= 0) return "Este pedido no generó puntos.";
        if (order.status === "completed") return "Puntos acreditados: " + formatNumber(points);
        if (order.status === "cancelled") return "Puntos no acreditados: " + formatNumber(points);
        return "Puntos por acreditar: " + formatNumber(points);
    }

    function addText(parent, tag, text, className) { const node = document.createElement(tag); if (className) node.className = className; node.textContent = text; parent.appendChild(node); return node; }
    function accountStatus(text, error = false) { const node = byId("loyaltyAccountStatus"); if (node) { node.textContent = text; node.classList.toggle("auth-error", error); } }
    function renderAccount() {
        const balance = byId("loyaltyBalance"), lifetime = byId("loyaltyLifetime"), conversion = byId("loyaltyConversion"), program = byId("loyaltyProgramStatus"), list = byId("loyaltyTransactionList");
        if (!balance || !lifetime || !conversion || !program || !list) return;
        balance.textContent = formatNumber(state.account?.balance || 0) + " puntos";
        lifetime.textContent = formatNumber(state.account?.lifetime_earned || 0) + " puntos";
        conversion.textContent = formatConversion();
        program.textContent = state.settings ? (state.settings.enabled ? "Activo" : "Desactivado") : "No disponible";
        list.replaceChildren();
        if (!state.transactions.length) addText(list, "p", "Aún no tienes movimientos de puntos.", "account-history-message");
        state.transactions.forEach(transaction => {
            const row = document.createElement("article"); row.className = "loyalty-transaction";
            addText(row, "strong", "+" + formatNumber(transaction.points) + " puntos");
            addText(row, "p", mapTransactionType(transaction.transaction_type));
            if (transaction.description) addText(row, "p", transaction.description);
            addText(row, "p", formatDate(transaction.created_at), "order-history-date");
            list.appendChild(row);
        });
    }

    async function loadAccount(userId) {
        if (!userId || !client()) throw new Error("LOYALTY_UNAVAILABLE");
        state.userId = userId;
        accountStatus("Cargando puntos...");
        try {
            const [accountResult, transactionResult, settingsResult] = await Promise.all([
                client().from("loyalty_accounts").select("balance, lifetime_earned").eq("user_id", userId).maybeSingle(),
                client().from("loyalty_transactions").select("transaction_type, points, description, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
                loadSettings().catch(() => null)
            ]);
            if (state.userId !== userId) return;
            if (accountResult.error || transactionResult.error) throw accountResult.error || transactionResult.error;
            state.account = accountResult.data || { balance: 0, lifetime_earned: 0 };
            state.transactions = Array.isArray(transactionResult.data) ? transactionResult.data : [];
            renderAccount();
            accountStatus(settingsResult || state.settings ? "Los puntos se acreditan cuando el pedido se marca como Completado." : "Puntos estimados no disponibles.");
        } catch (_) {
            if (state.userId !== userId) return;
            state.account = { balance: 0, lifetime_earned: 0 };
            state.transactions = [];
            renderAccount();
            accountStatus("No pudimos cargar tus puntos en este momento.", true);
        }
    }

    function adminStatus(text, error = false) { const node = byId("adminLoyaltyStatus"); if (node) { node.textContent = text; node.classList.toggle("auth-error", error); } }
    function renderAdmin() {
        const settings = state.settings;
        const form = byId("adminLoyaltyForm");
        if (!form) return;
        byId("adminLoyaltyCurrent").textContent = settings ? (settings.enabled ? "Programa activo. " : "Programa desactivado. ") + formatConversion(settings) : "Configuración no disponible.";
        form.elements.copAmount.value = settings?.copAmount || "";
        form.elements.pointsAmount.value = settings?.pointsAmount || "";
        form.elements.enabled.checked = Boolean(settings?.enabled);
        renderAdminPreview();
    }
    function renderAdminPreview() {
        const form = byId("adminLoyaltyForm"), preview = byId("adminLoyaltyPreview"); if (!form || !preview) return;
        const settings = normalizeSettings({ copAmount: Number(form.elements.copAmount.value), pointsAmount: Number(form.elements.pointsAmount.value), enabled: Boolean(form.elements.enabled.checked) });
        if (!settings) { preview.textContent = "Ingresa una conversión válida para ver ejemplos."; return; }
        if (!settings.enabled) { preview.textContent = "El programa quedará desactivado."; return; }
        preview.textContent = "$10.000 COP → " + formatNumber(estimatePoints(10000, settings)) + " puntos · $50.000 COP → " + formatNumber(estimatePoints(50000, settings)) + " puntos · $100.000 COP → " + formatNumber(estimatePoints(100000, settings)) + " puntos";
    }
    function adminError(error) { const text = String(error?.message || error || "").toUpperCase(); if (text.includes("ADMIN_REQUIRED") || text.includes("AUTH_REQUIRED") || text.includes("PERMISSION")) return "No tienes permisos para cambiar la configuración de puntos."; if (text.includes("INVALID_COP_AMOUNT") || text.includes("INVALID_POINTS_AMOUNT") || text.includes("INVALID_LOYALTY_ENABLED")) return "La conversión de puntos no es válida."; return "No pudimos guardar la configuración de puntos."; }
    async function updateSettingsAsAdmin(values) {
        if (!namespace.adminAuth || !namespace.adminAuth.isAdmin()) throw new Error("ADMIN_REQUIRED");
        const copAmount = Number(values.copAmount), pointsAmount = Number(values.pointsAmount);
        if (!Number.isSafeInteger(copAmount) || copAmount <= 0 || !Number.isSafeInteger(pointsAmount) || pointsAmount <= 0 || typeof values.enabled !== "boolean") throw new Error("INVALID_COP_AMOUNT");
        const result = await client().rpc("admin_update_loyalty_settings", { p_cop_amount: copAmount, p_points_amount: pointsAmount, p_enabled: values.enabled });
        if (result.error) throw result.error;
        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        state.settings = normalizeSettings(row);
        state.settingsStatus = state.settings ? "ready" : "error";
        notify();
        return getSettings();
    }

    function createAccountPanel() {
        const tabs = byId("accountModal")?.querySelector(".account-tabs"); const orders = byId("accountOrdersPanel");
        if (!tabs || !orders || byId("accountTabLoyalty")) return;
        const tab = document.createElement("button"); tab.id = "accountTabLoyalty"; tab.className = "account-tab"; tab.type = "button"; tab.setAttribute("role", "tab"); tab.setAttribute("aria-selected", "false"); tab.setAttribute("aria-controls", "accountLoyaltyPanel"); tab.tabIndex = -1; tab.textContent = "Puntos";
        const panel = document.createElement("section"); panel.id = "accountLoyaltyPanel"; panel.className = "account-loyalty-panel"; panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id); panel.hidden = true;
        addText(panel, "h3", "Saldo de puntos");
        const cards = document.createElement("div"); cards.className = "loyalty-summary";
        [["Saldo actual", "loyaltyBalance"], ["Total ganado", "loyaltyLifetime"], ["Conversión actual", "loyaltyConversion"], ["Estado", "loyaltyProgramStatus"]].forEach(([label, id]) => { const card = document.createElement("div"); addText(card, "span", label); const value = addText(card, "strong", "Cargando..."); value.id = id; cards.appendChild(card); });
        panel.appendChild(cards); addText(panel, "p", "Los puntos de una compra se acreditan cuando el pedido se marca como Completado.", "account-readonly"); addText(panel, "h4", "Historial de puntos"); const status = addText(panel, "p", "", "account-history-message"); status.id = "loyaltyAccountStatus"; const list = document.createElement("div"); list.id = "loyaltyTransactionList"; list.className = "loyalty-transaction-list"; panel.appendChild(list);
        tabs.appendChild(tab); orders.insertAdjacentElement("afterend", panel);
    }
    function createAdminPanel() {
        const tabs = byId("adminModal")?.querySelector(".admin-tabs"); const users = byId("adminUsersPanel");
        if (!tabs || !users || byId("adminTabLoyalty")) return;
        const tab = document.createElement("button"); tab.id = "adminTabLoyalty"; tab.className = "admin-tab"; tab.type = "button"; tab.setAttribute("role", "tab"); tab.setAttribute("aria-selected", "false"); tab.setAttribute("aria-controls", "adminLoyaltyPanel"); tab.tabIndex = -1; tab.textContent = "Puntos";
        const panel = document.createElement("section"); panel.id = "adminLoyaltyPanel"; panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id); panel.hidden = true;
        addText(panel, "h3", "Configuración de puntos"); const current = addText(panel, "p", "Cargando configuración..."); current.id = "adminLoyaltyCurrent"; const form = document.createElement("form"); form.id = "adminLoyaltyForm"; form.className = "auth-form admin-loyalty-form"; form.noValidate = true;
        [["COP requeridos", "copAmount"], ["Puntos otorgados", "pointsAmount"]].forEach(([label, name]) => { const labelNode = document.createElement("label"); labelNode.htmlFor = "adminLoyalty" + name; labelNode.textContent = label; const input = document.createElement("input"); input.id = "adminLoyalty" + name; input.name = name; input.type = "number"; input.min = "1"; input.step = "1"; input.required = true; labelNode.appendChild(input); form.appendChild(labelNode); input.addEventListener("input", renderAdminPreview); });
        const enabledLabel = document.createElement("label"); enabledLabel.className = "loyalty-enabled"; const enabled = document.createElement("input"); enabled.type = "checkbox"; enabled.name = "enabled"; enabled.addEventListener("change", renderAdminPreview); enabledLabel.append(enabled, document.createTextNode(" Programa activo")); form.appendChild(enabledLabel); const preview = addText(form, "p", "", "account-readonly"); preview.id = "adminLoyaltyPreview"; addText(form, "p", "Los cambios solo afectan pedidos nuevos. Los pedidos ya creados conservan sus puntos.", "account-readonly"); const button = document.createElement("button"); button.type = "submit"; button.className = "boton"; button.textContent = "Guardar configuración"; form.appendChild(button); const status = addText(form, "p", "", "admin-dashboard-status"); status.id = "adminLoyaltyStatus"; form.addEventListener("submit", async event => { event.preventDefault(); const values = { copAmount: form.elements.copAmount.value, pointsAmount: form.elements.pointsAmount.value, enabled: Boolean(form.elements.enabled.checked) }; if (!window.confirm("¿Guardar la nueva conversión de puntos?\n\nLos pedidos nuevos usarán esta configuración. Los pedidos ya existentes no cambiarán.")) return; button.disabled = true; adminStatus("Guardando configuración..."); try { await updateSettingsAsAdmin(values); await loadSettings(true); renderAdmin(); adminStatus("Configuración de puntos actualizada correctamente."); } catch (error) { adminStatus(adminError(error), true); } finally { button.disabled = false; } });
        panel.appendChild(form); tabs.appendChild(tab); users.insertAdjacentElement("afterend", panel);
    }
    function clear() { state.userId = null; state.account = null; state.transactions = []; const panel = byId("accountLoyaltyPanel"); if (panel) panel.hidden = true; }
    function handleAuthState(user) { if (!user) clear(); }
    document.addEventListener("DOMContentLoaded", () => { createAccountPanel(); createAdminPanel(); loadSettings().catch(() => {}); });
    namespace.loyalty = Object.freeze({ loadSettings, getSettings, getSettingsStatus, formatConversion, estimatePoints, loadAccount, mapTransactionType, getOrderPointsState, updateSettingsAsAdmin, subscribe, renderAdmin, clear, handleAuthState });
}(window.GoTienda = window.GoTienda || {}));
