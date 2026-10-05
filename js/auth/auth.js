(function initializeAuth(namespace) {
    const byId = id => document.getElementById(id);
    const client = () => namespace.supabase && namespace.supabase.client;
    let recoveryActive = false;
    let recoveryWaiting = false;

    function setMessage(text, error = false) {
        const node = byId("authMessage");
        if (!node) return;
        node.textContent = text;
        node.classList.toggle("auth-error", error);
    }

    function authErrorMessage(error) {
        const text = String(error && error.message || "").toLowerCase();
        if (text.includes("invalid login")) return "Correo o contraseña incorrectos.";
        if (text.includes("already")) return "Ya existe una cuenta con este correo.";
        if (text.includes("password")) return "La contraseña debe tener al menos 6 caracteres.";
        return "No se pudo conectar. Intenta nuevamente.";
    }

    function recoveryErrorMessage(error, fallback) {
        const text = String(error && error.message || "").toLowerCase();
        if (text.includes("rate") || text.includes("too many")) return "Espera un momento antes de solicitar otro enlace.";
        return fallback;
    }

    function pending(form, value) {
        const button = form.querySelector('button[type="submit"]');
        if (!button) return;
        button.disabled = value;
        button.dataset.text ||= button.textContent;
        button.textContent = value ? "Procesando…" : button.dataset.text;
    }

    function suppressNormalAuthenticatedUi() {
        ["authUserLabel", "btnAbrirCuenta", "btnAbrirAdmin", "btnCerrarSesion"].forEach(id => {
            const node = byId(id);
            if (node) node.hidden = true;
        });
        const login = byId("btnAbrirAuth");
        if (login) login.hidden = true;
        ["accountModal", "adminModal"].forEach(id => {
            const modal = byId(id);
            if (modal) {
                modal.hidden = true;
                modal.setAttribute("aria-hidden", "true");
            }
        });
        if (namespace.cartOverlay && namespace.cartOverlay.close) namespace.cartOverlay.close();
    }

    function updateUi(user) {
        if (recoveryActive || recoveryWaiting) {
            suppressNormalAuthenticatedUi();
            return;
        }
        const label = byId("authUserLabel");
        const open = byId("btnAbrirAuth");
        const account = byId("btnAbrirCuenta");
        const admin = byId("btnAbrirAdmin");
        const logout = byId("btnCerrarSesion");
        if (user) {
            label.textContent = `Hola, ${(user.user_metadata && user.user_metadata.full_name) || user.email}`;
            label.hidden = false;
            open.hidden = true;
            account.hidden = false;
            logout.hidden = false;
        } else {
            label.hidden = true;
            open.hidden = false;
            account.hidden = true;
            admin.hidden = true;
            logout.hidden = true;
        }
        if (namespace.delivery) namespace.delivery.handleAuthState(user);
        if (namespace.loyalty) namespace.loyalty.handleAuthState(user);
        if (namespace.adminAuth) namespace.adminAuth.handleAuthState(user);
        if (namespace.account) namespace.account.handleAuthState(user);
    }

    function addField(form, { id, name, label, type, autocomplete, minlength }) {
        const labelNode = document.createElement("label");
        labelNode.htmlFor = id;
        labelNode.textContent = label;
        const input = document.createElement("input");
        input.id = id;
        input.name = name;
        input.type = type;
        input.autocomplete = autocomplete;
        input.required = true;
        if (minlength) input.minLength = minlength;
        form.append(labelNode, input);
        return input;
    }

    function addLink(form, id, text) {
        const paragraph = document.createElement("p");
        const button = document.createElement("button");
        button.id = id;
        button.className = "auth-link";
        button.type = "button";
        button.textContent = text;
        paragraph.appendChild(button);
        form.appendChild(paragraph);
        return button;
    }

    function ensureRecoveryUi() {
        const login = byId("loginForm");
        const register = byId("registerForm");
        if (!login || !register) return;

        if (!byId("mostrarRecuperacion")) addLink(login, "mostrarRecuperacion", "¿Olvidaste tu contraseña?");

        if (!byId("recoveryRequestForm")) {
            const request = document.createElement("form");
            request.id = "recoveryRequestForm";
            request.className = "auth-form";
            request.noValidate = true;
            request.hidden = true;
            const explanation = document.createElement("p");
            explanation.textContent = "Ingresa el correo asociado a tu cuenta y te enviaremos un enlace para crear una nueva contraseña.";
            request.appendChild(explanation);
            addField(request, { id: "recoveryEmail", name: "email", label: "Correo electrónico", type: "email", autocomplete: "email" });
            const submit = document.createElement("button");
            submit.className = "boton";
            submit.type = "submit";
            submit.textContent = "Enviar enlace de recuperación";
            request.appendChild(submit);
            addLink(request, "volverLoginRecuperacion", "Volver a iniciar sesión");
            register.after(request);
        }

        if (!byId("updatePasswordForm")) {
            const update = document.createElement("form");
            update.id = "updatePasswordForm";
            update.className = "auth-form";
            update.noValidate = true;
            update.hidden = true;
            addField(update, { id: "recoveryNewPassword", name: "password", label: "Nueva contraseña", type: "password", autocomplete: "new-password", minlength: 6 });
            addField(update, { id: "recoveryPasswordConfirm", name: "passwordConfirm", label: "Confirmar nueva contraseña", type: "password", autocomplete: "new-password", minlength: 6 });
            const submit = document.createElement("button");
            submit.className = "boton";
            submit.type = "submit";
            submit.textContent = "Guardar nueva contraseña";
            update.appendChild(submit);
            addLink(update, "cancelarRecuperacion", "Cancelar recuperación");
            byId("recoveryRequestForm").after(update);
        }
    }

    function show(mode, preserveMessage = false) {
        ensureRecoveryUi();
        const forms = {
            login: byId("loginForm"),
            register: byId("registerForm"),
            recoveryRequest: byId("recoveryRequestForm"),
            updatePassword: byId("updatePasswordForm")
        };
        Object.entries(forms).forEach(([name, form]) => {
            if (form) form.hidden = name !== mode;
        });
        const title = {
            login: "Ingresar",
            register: "Crear cuenta",
            recoveryRequest: "Recuperar contraseña",
            updatePassword: "Crear nueva contraseña"
        }[mode] || "Ingresar";
        byId("authModalTitle").textContent = title;
        if (!preserveMessage) setMessage("");
        const focusTarget = {
            login: "loginEmail",
            register: "registerName",
            recoveryRequest: "recoveryEmail",
            updatePassword: "recoveryNewPassword"
        }[mode];
        const field = byId(focusTarget);
        if (field) field.focus();
    }

    function close() {
        const modal = byId("authModal");
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
    }

    function open(mode = "login", preserveMessage = false) {
        const modal = byId("authModal");
        modal.hidden = false;
        modal.setAttribute("aria-hidden", "false");
        show(mode, preserveMessage);
    }

    function recoveryUrlState() {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const query = new URLSearchParams(window.location.search);
        const recovery = hash.get("type") === "recovery" || query.get("type") === "recovery";
        const error = hash.has("error") || query.has("error") || hash.has("error_code") || query.has("error_code");
        return { recovery, error };
    }

    function cleanRecoveryUrl() {
        const url = new URL(window.location.href);
        ["code", "type", "error", "error_code", "error_description"].forEach(name => url.searchParams.delete(name));
        url.hash = "";
        history.replaceState({}, document.title, url.pathname + url.search);
    }

    function enterRecovery() {
        recoveryWaiting = false;
        recoveryActive = true;
        suppressNormalAuthenticatedUi();
        cleanRecoveryUrl();
        open("updatePassword");
    }

    function enterInvalidRecovery() {
        recoveryWaiting = false;
        recoveryActive = true;
        suppressNormalAuthenticatedUi();
        cleanRecoveryUrl();
        open("recoveryRequest", true);
        setMessage("Este enlace de recuperación ya no es válido o ha expirado. Solicita un nuevo enlace.", true);
    }

    async function signUp(form) {
        const fullName = form.fullName.value.trim();
        const email = form.email.value.trim();
        const phone = form.phone.value.trim();
        const password = form.password.value;
        if (!client()) return setMessage("El acceso no está disponible en este momento.", true);
        if (!fullName || !email || !phone || !password) return setMessage("Completa todos los campos requeridos.", true);
        if (!form.email.checkValidity()) return setMessage("Ingresa un correo electrónico válido.", true);
        if (password.length < 6) return setMessage("La contraseña debe tener al menos 6 caracteres.", true);
        if (password !== form.passwordConfirm.value) return setMessage("Las contraseñas no coinciden.", true);
        pending(form, true);
        const { data, error } = await client().auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } });
        pending(form, false);
        if (error) return setMessage(authErrorMessage(error), true);
        form.reset();
        setMessage(data.session ? "Cuenta creada e iniciada correctamente." : "Cuenta creada. Revisa tu correo para confirmar tu cuenta.");
    }

    async function signIn(form) {
        const email = form.email.value.trim();
        const password = form.password.value;
        if (!client()) return setMessage("El acceso no está disponible en este momento.", true);
        if (!email || !password) return setMessage("Completa correo y contraseña.", true);
        if (!form.email.checkValidity()) return setMessage("Ingresa un correo electrónico válido.", true);
        pending(form, true);
        const { error } = await client().auth.signInWithPassword({ email, password });
        pending(form, false);
        if (error) return setMessage(authErrorMessage(error), true);
        close();
    }

    async function requestRecovery(form) {
        const email = form.email.value.trim();
        if (!client()) return setMessage("El acceso no está disponible en este momento.", true);
        if (!email || !form.email.checkValidity()) return setMessage("Ingresa un correo electrónico válido.", true);
        pending(form, true);
        const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/" });
        pending(form, false);
        if (error) return setMessage(recoveryErrorMessage(error, "No pudimos solicitar el enlace. Intenta nuevamente."), true);
        form.reset();
        setMessage("Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña.");
    }

    async function finishRecovery(message) {
        recoveryActive = false;
        recoveryWaiting = false;
        cleanRecoveryUrl();
        let signOutError = false;
        const supabaseClient = client();
        if (!supabaseClient) {
            signOutError = true;
        } else {
            try {
                const { error } = await supabaseClient.auth.signOut();
                signOutError = Boolean(error);
            } catch (_) {
                signOutError = true;
            }
        }
        updateUi(null);
        open("login", true);
        setMessage(signOutError ? message + " Cierra y vuelve a abrir la página o cierra sesión manualmente." : message + " Inicia sesión con tu nueva contraseña.", signOutError);
    }

    async function updatePassword(form) {
        const password = form.password.value;
        const confirmation = form.passwordConfirm.value;
        if (!client() || !recoveryActive) return setMessage("La recuperación no está disponible. Solicita un nuevo enlace.", true);
        if (!password || password.length < 6) return setMessage("La contraseña debe tener al menos 6 caracteres.", true);
        if (password !== confirmation) return setMessage("Las contraseñas no coinciden.", true);
        pending(form, true);
        const { error } = await client().auth.updateUser({ password });
        pending(form, false);
        if (error) return setMessage(recoveryErrorMessage(error, "No pudimos actualizar la contraseña. Solicita un nuevo enlace si el problema continúa."), true);
        form.reset();
        await finishRecovery("Contraseña actualizada correctamente.");
    }

    async function cancelRecovery() {
        await finishRecovery("Recuperación cancelada.");
    }

    async function signOut() {
        if (client()) await client().auth.signOut();
    }

    async function init() {
        if (!client()) return;
        const urlState = recoveryUrlState();
        recoveryWaiting = urlState.recovery || urlState.error;
        client().auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                enterRecovery();
                return;
            }
            if (recoveryActive || recoveryWaiting) return;
            updateUi(session && session.user);
        });
        const { data } = await client().auth.getSession();
        if (urlState.error) {
            enterInvalidRecovery();
        } else if (urlState.recovery) {
            setTimeout(() => {
                if (!recoveryWaiting) return;
                if (data && data.session) enterRecovery();
                else enterInvalidRecovery();
            }, 0);
        } else {
            updateUi(data.session && data.session.user);
        }
    }

    function dismissAuthModal() {
        if (recoveryActive) {
            cancelRecovery();
            return;
        }
        close();
    }

    function bind() {
        ensureRecoveryUi();
        byId("btnAbrirAuth").addEventListener("click", () => open());
        byId("btnCerrarAuth").addEventListener("click", dismissAuthModal);
        byId("btnCerrarSesion").addEventListener("click", signOut);
        byId("mostrarRegistro").addEventListener("click", () => open("register"));
        byId("mostrarLogin").addEventListener("click", () => open("login"));
        byId("mostrarRecuperacion").addEventListener("click", () => open("recoveryRequest"));
        byId("volverLoginRecuperacion").addEventListener("click", () => recoveryActive ? cancelRecovery() : open("login"));
        byId("cancelarRecuperacion").addEventListener("click", cancelRecovery);
        byId("loginForm").addEventListener("submit", event => { event.preventDefault(); signIn(event.currentTarget); });
        byId("registerForm").addEventListener("submit", event => { event.preventDefault(); signUp(event.currentTarget); });
        byId("recoveryRequestForm").addEventListener("submit", event => { event.preventDefault(); requestRecovery(event.currentTarget); });
        byId("updatePasswordForm").addEventListener("submit", event => { event.preventDefault(); updatePassword(event.currentTarget); });
        byId("authModal").addEventListener("click", event => { if (event.target === event.currentTarget) dismissAuthModal(); });
        document.addEventListener("keydown", event => { if (event.key === "Escape" && !byId("authModal").hidden) dismissAuthModal(); });
    }

    namespace.auth = {
        init,
        signUp,
        signIn,
        signOut,
        requestRecovery,
        updatePassword,
        getSession: () => client() && client().auth.getSession(),
        getUser: () => client() && client().auth.getUser(),
        isAuthenticated: async () => client() ? Boolean((await client().auth.getSession()).data.session) : false
    };

    document.addEventListener("DOMContentLoaded", () => {
        bind();
        init();
    });
}(window.GoTienda = window.GoTienda || {}));
