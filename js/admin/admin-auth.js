(function initializeAdminAuth(namespace) {
    const byId = id => document.getElementById(id);
    const listeners = new Set();
    const state = { user: null, role: null, isAdmin: false, loading: false, requestVersion: 0 };
    const client = () => namespace.supabase && namespace.supabase.isAvailable() ? namespace.supabase.client : null;
    let focusReturnTarget = null;

    function snapshot() {
        return Object.freeze({ role: state.role, isAdmin: state.isAdmin, loading: state.loading });
    }

    function renderEntry() {
        const entry = byId("btnAbrirAdmin");
        if (entry) entry.hidden = !state.isAdmin;
    }

    function notify() {
        renderEntry();
        const current = snapshot();
        listeners.forEach(listener => listener(current));
    }

    function closeAdmin() {
        const modal = byId("adminModal");
        if (!modal) return;
        const entry = byId("btnAbrirAdmin");
        const target = [focusReturnTarget, entry].find(node => node && node.isConnected && !node.hidden && !node.disabled && !modal.contains(node));
        if (target) target.focus();
        else if (modal.contains(document.activeElement)) document.activeElement.blur();
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        focusReturnTarget = null;
    }

    function clear() {
        state.requestVersion += 1;
        state.user = null;
        state.role = null;
        state.isAdmin = false;
        state.loading = false;
        closeAdmin();
        notify();
    }

    async function refresh(user = state.user) {
        if (!user || !client()) {
            clear();
            return snapshot();
        }
        const version = ++state.requestVersion;
        state.user = user;
        state.role = null;
        state.isAdmin = false;
        state.loading = true;
        notify();
        try {
            const result = await client().from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
            if (version !== state.requestVersion || !state.user || state.user.id !== user.id) return snapshot();
            const role = !result.error && result.data && ["user", "admin"].includes(result.data.role) ? result.data.role : null;
            state.role = role;
            state.isAdmin = role === "admin";
        } catch (_) {
            if (version !== state.requestVersion) return snapshot();
            state.role = null;
            state.isAdmin = false;
        } finally {
            if (version === state.requestVersion) {
                state.loading = false;
                notify();
            }
        }
        return snapshot();
    }

    function handleAuthState(user) {
        if (!user) {
            clear();
            return;
        }
        refresh(user);
    }

    function setModalContent(title, text, authorized) {
        byId("adminModalTitle").textContent = title;
        byId("adminMessage").textContent = text;
        byId("adminShellContent").hidden = !authorized;
    }

    function openAdmin(trigger) {
        const modal = byId("adminModal");
        if (!modal) return false;
        focusReturnTarget = trigger && trigger.isConnected && !modal.contains(trigger) ? trigger : byId("btnAbrirAdmin");
        const authorized = state.isAdmin;
        setModalContent(
            authorized ? "Panel de administración" : "Acceso restringido",
            authorized ? "Acceso administrativo verificado." : "No tienes permisos para acceder a esta sección.",
            authorized
        );
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        byId("btnCerrarAdmin").focus();
        return authorized;
    }

    function subscribe(listener) {
        if (typeof listener !== "function") return () => {};
        listeners.add(listener);
        listener(snapshot());
        return () => listeners.delete(listener);
    }

    function bind() {
        const open = byId("btnAbrirAdmin");
        const close = byId("btnCerrarAdmin");
        const modal = byId("adminModal");
        if (open) open.addEventListener("click", event => openAdmin(event.currentTarget));
        if (close) close.addEventListener("click", closeAdmin);
        if (modal) modal.addEventListener("click", event => { if (event.target === modal) closeAdmin(); });
        document.addEventListener("keydown", event => { if (event.key === "Escape" && modal && !modal.hidden) closeAdmin(); });
        renderEntry();
    }

    namespace.adminAuth = Object.freeze({ refresh, handleAuthState, isAdmin: () => state.isAdmin, getState: snapshot, clear, openAdmin, closeAdmin, subscribe });
    document.addEventListener("DOMContentLoaded", bind);
}(window.GoTienda = window.GoTienda || {}));
