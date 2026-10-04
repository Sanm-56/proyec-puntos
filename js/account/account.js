(function initializeAccount(namespace) {
    const byId = id => document.getElementById(id);
    const state = { user: null, profile: null, role: "user", saving: false };
    const client = () => namespace.supabase && namespace.supabase.isAvailable() ? namespace.supabase.client : null;
    const message = (text, error = false) => { const element = byId("accountMessage"); element.textContent = text; element.classList.toggle("auth-error", error); };
    const formatDate = value => { try { return new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(value)); } catch (_) { return "No disponible"; } };
    const roleLabel = role => role === "admin" ? "Administrador" : "Usuario";
    function clear() { state.user = null; state.profile = null; state.role = "user"; byId("accountContent").hidden = true; }
    function closeAccount() { const modal = byId("accountModal"); modal.hidden = true; modal.setAttribute("aria-hidden", "true"); }
    function renderAccount() {
        if (!state.user || !state.profile) return;
        byId("accountEmail").textContent = state.user.email || "No disponible";
        byId("accountCreatedAt").textContent = state.user.created_at ? formatDate(state.user.created_at) : "No disponible";
        byId("accountRole").textContent = roleLabel(state.role);
        byId("accountFullName").value = state.profile.full_name || "";
        byId("accountPhone").value = state.profile.phone || "";
        byId("accountContent").hidden = false;
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
            if (!profileResult.data) { message("No se encontró tu perfil. Cierra sesión e intenta nuevamente; si continúa, contacta soporte.", true); return; }
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
        const fullName = form.fullName.value.trim(), phone = form.phone.value.trim();
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
    function openAccount() { if (!state.user) return; const modal = byId("accountModal"); modal.hidden = false; modal.setAttribute("aria-hidden", "false"); if (state.profile) renderAccount(); else loadOwnProfile(); byId("btnCerrarCuenta").focus(); }
    async function refresh() { await loadOwnProfile(); }
    function handleAuthState(user) { if (!user) { closeAccount(); clear(); return; } state.user = user; loadOwnProfile(); }
    function bind() {
        byId("btnAbrirCuenta").addEventListener("click", openAccount);
        byId("btnCerrarCuenta").addEventListener("click", closeAccount);
        byId("btnCerrarSesionCuenta").addEventListener("click", () => namespace.auth && namespace.auth.signOut());
        byId("accountForm").addEventListener("submit", event => { event.preventDefault(); updateOwnProfile(event.currentTarget); });
        byId("accountModal").addEventListener("click", event => { if (event.target === event.currentTarget) closeAccount(); });
        document.addEventListener("keydown", event => { if (event.key === "Escape" && !byId("accountModal").hidden) closeAccount(); });
        if (namespace.auth && namespace.auth.getUser) namespace.auth.getUser().then(result => handleAuthState(result && result.data && result.data.user));
    }
    namespace.account = { loadOwnProfile, updateOwnProfile, renderAccount, openAccount, closeAccount, refresh, handleAuthState };
    document.addEventListener("DOMContentLoaded", bind);
}(window.GoTienda = window.GoTienda || {}));
