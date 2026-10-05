(function initializeDelivery(namespace) {
    const fields = ["city", "neighborhood", "address", "instructions"];
    const byId = id => document.getElementById(id);
    const emptyAddress = () => ({ city: "", neighborhood: "", address: "", instructions: "" });
    const state = { defaultAddress: emptyAddress(), modal: null, form: null, submit: null, cancel: null, busy: false, onConfirm: null, onCancel: null };
    const client = () => namespace.supabase && namespace.supabase.isAvailable() ? namespace.supabase.client : null;

    function normalize(data) {
        return fields.reduce((address, field) => {
            address[field] = typeof data?.[field] === "string" ? data[field].trim() : "";
            return address;
        }, {});
    }

    function validate(data, allowEmpty = false) {
        const address = normalize(data);
        const errors = {};
        const noAddress = !address.city && !address.address && !address.neighborhood && !address.instructions;
        if (allowEmpty && noAddress) return { valid: true, value: address, errors };
        if (address.city.length < 2 || address.city.length > 120) errors.city = "Ingresa una ciudad o municipio entre 2 y 120 caracteres.";
        if (address.address.length < 5 || address.address.length > 250) errors.address = "Ingresa una dirección entre 5 y 250 caracteres.";
        if (address.neighborhood.length > 120) errors.neighborhood = "El barrio no puede superar 120 caracteres.";
        if (address.instructions.length > 500) errors.instructions = "Las indicaciones no pueden superar 500 caracteres.";
        return { valid: Object.keys(errors).length === 0, value: address, errors };
    }

    function createField(form, id, label, options = {}) {
        const node = document.createElement(options.textarea ? "textarea" : "input");
        const labelNode = document.createElement("label");
        labelNode.htmlFor = id;
        labelNode.textContent = label;
        node.id = id;
        node.name = options.name;
        node.maxLength = options.maxLength;
        if (options.required) node.required = true;
        if (options.textarea) node.rows = 3;
        else node.type = "text";
        node.autocomplete = options.autocomplete || "off";
        form.append(labelNode, node);
        return node;
    }

    function addStatus(parent, id) {
        const status = document.createElement("p");
        status.id = id;
        status.className = "delivery-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        parent.appendChild(status);
        return status;
    }

    function setStatus(id, text, error = false) {
        const status = byId(id);
        if (!status) return;
        status.textContent = text;
        status.classList.toggle("auth-error", error);
    }

    function getFormAddress(form) {
        return normalize({ city: form.elements.city.value, neighborhood: form.elements.neighborhood.value, address: form.elements.address.value, instructions: form.elements.instructions.value });
    }

    function fillForm(form, address) {
        const value = normalize(address);
        fields.forEach(field => { if (form.elements[field]) form.elements[field].value = value[field]; });
    }

    function createDefaultAddressForm() {
        const anchor = byId("accountForm");
        if (!anchor || byId("deliveryDefaultForm")) return;
        const form = document.createElement("form");
        form.id = "deliveryDefaultForm";
        form.className = "auth-form delivery-default-form";
        form.noValidate = true;
        const title = document.createElement("h3");
        title.textContent = "Dirección predeterminada";
        form.appendChild(title);
        createField(form, "defaultDeliveryCity", "Ciudad o municipio", { name: "city", maxLength: 120, autocomplete: "address-level2" });
        createField(form, "defaultDeliveryNeighborhood", "Barrio", { name: "neighborhood", maxLength: 120, autocomplete: "address-level3" });
        createField(form, "defaultDeliveryAddress", "Dirección de entrega", { name: "address", maxLength: 250, autocomplete: "street-address" });
        createField(form, "defaultDeliveryInstructions", "Indicaciones para encontrar el lugar", { name: "instructions", maxLength: 500, textarea: true });
        const note = document.createElement("p");
        note.className = "account-readonly";
        note.textContent = "Opcional. Para guardar una dirección, completa ciudad o municipio y dirección.";
        form.appendChild(note);
        const button = document.createElement("button");
        button.className = "boton";
        button.type = "submit";
        button.textContent = "Guardar dirección predeterminada";
        form.append(button, addStatus(form, "deliveryDefaultStatus"));
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;
            setStatus("deliveryDefaultStatus", "Guardando dirección...");
            try {
                const address = await saveDefaultAddress(getFormAddress(form));
                fillForm(form, address);
                setStatus("deliveryDefaultStatus", "Dirección predeterminada actualizada.");
            } catch (error) {
                setStatus("deliveryDefaultStatus", error.message || "No pudimos guardar la dirección.", true);
            } finally {
                button.disabled = false;
            }
        });
        anchor.insertAdjacentElement("afterend", form);
    }

    function createModal() {
        if (byId("deliveryModal")) return;
        const modal = document.createElement("div");
        modal.id = "deliveryModal";
        modal.className = "auth-modal delivery-modal";
        modal.hidden = true;
        modal.setAttribute("aria-hidden", "true");
        const dialog = document.createElement("div");
        dialog.className = "auth-dialog delivery-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "deliveryModalTitle");
        const close = document.createElement("button");
        close.type = "button";
        close.className = "auth-close";
        close.setAttribute("aria-label", "Cerrar confirmación de entrega");
        close.textContent = "×";
        const title = document.createElement("h2");
        title.id = "deliveryModalTitle";
        title.textContent = "Confirmar entrega";
        const form = document.createElement("form");
        form.id = "deliveryCheckoutForm";
        form.className = "auth-form delivery-checkout-form";
        form.noValidate = true;
        const contact = document.createElement("div");
        contact.className = "delivery-contact";
        const name = document.createElement("p");
        name.id = "deliveryContactName";
        const phone = document.createElement("p");
        phone.id = "deliveryContactPhone";
        contact.append(name, phone);
        form.appendChild(contact);
        createField(form, "deliveryCity", "Ciudad o municipio", { name: "city", maxLength: 120, required: true, autocomplete: "address-level2" });
        createField(form, "deliveryNeighborhood", "Barrio", { name: "neighborhood", maxLength: 120, autocomplete: "address-level3" });
        createField(form, "deliveryAddress", "Dirección de entrega", { name: "address", maxLength: 250, required: true, autocomplete: "street-address" });
        createField(form, "deliveryInstructions", "Indicaciones para encontrar el lugar", { name: "instructions", maxLength: 500, textarea: true });
        const saveLabel = document.createElement("label");
        saveLabel.className = "delivery-save-default";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = "saveAsDefault";
        saveLabel.append(checkbox, document.createTextNode(" Guardar esta dirección para próximos pedidos"));
        form.appendChild(saveLabel);
        addStatus(form, "deliveryCheckoutStatus");
        const actions = document.createElement("div");
        actions.className = "delivery-actions";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "auth-link";
        cancel.textContent = "Cancelar";
        const submit = document.createElement("button");
        submit.type = "submit";
        submit.className = "boton";
        submit.textContent = "Confirmar pedido";
        actions.append(cancel, submit);
        form.appendChild(actions);
        dialog.append(close, title, form);
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        state.modal = modal;
        state.form = form;
        state.submit = submit;
        state.cancel = cancel;
        const cancelCheckout = () => { if (!state.busy) closeCheckout(true); };
        close.addEventListener("click", cancelCheckout);
        cancel.addEventListener("click", cancelCheckout);
        modal.addEventListener("click", event => { if (event.target === modal) cancelCheckout(); });
        document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden && !state.busy) cancelCheckout(); });
        form.addEventListener("submit", async event => {
            event.preventDefault();
            const validation = validate(getFormAddress(form));
            if (!validation.valid) return setStatus("deliveryCheckoutStatus", Object.values(validation.errors)[0], true);
            if (typeof state.onConfirm !== "function") return;
            state.busy = true;
            submit.disabled = true;
            cancel.disabled = true;
            setStatus("deliveryCheckoutStatus", "Confirmando pedido...");
            try {
                const completed = await state.onConfirm(validation.value, Boolean(form.elements.saveAsDefault.checked));
                if (completed) closeCheckout(false);
            } catch (error) {
                setStatus("deliveryCheckoutStatus", error.message || "No pudimos confirmar el pedido.", true);
            } finally {
                state.busy = false;
                submit.disabled = false;
                cancel.disabled = false;
            }
        });
    }

    async function getDefaultAddress(userId) {
        if (!client() || !userId) throw new Error("No pudimos cargar la dirección predeterminada.");
        const result = await client().from("profiles")
            .select("default_delivery_city, default_delivery_neighborhood, default_delivery_address, default_delivery_instructions")
            .eq("id", userId)
            .maybeSingle();
        if (result.error) throw new Error("La dirección predeterminada estará disponible cuando se actualice el servicio.");
        const authResult = await client().auth.getUser();
        if (!authResult.data || !authResult.data.user || authResult.data.user.id !== userId) throw new Error("La sesión cambió mientras se cargaba la dirección.");
        state.defaultAddress = normalize({
            city: result.data?.default_delivery_city,
            neighborhood: result.data?.default_delivery_neighborhood,
            address: result.data?.default_delivery_address,
            instructions: result.data?.default_delivery_instructions
        });
        const form = byId("deliveryDefaultForm");
        if (form) fillForm(form, state.defaultAddress);
        return { ...state.defaultAddress };
    }

    async function saveDefaultAddress(data) {
        const validation = validate(data, true);
        if (!validation.valid) throw new Error(Object.values(validation.errors)[0]);
        if (!client()) throw new Error("El servicio de dirección no está disponible.");
        const authResult = await client().auth.getUser();
        const userId = authResult.data && authResult.data.user && authResult.data.user.id;
        if (!userId) throw new Error("Inicia sesión para guardar una dirección.");
        const result = await client().from("profiles").update({
            default_delivery_city: validation.value.city || null,
            default_delivery_neighborhood: validation.value.neighborhood || null,
            default_delivery_address: validation.value.address || null,
            default_delivery_instructions: validation.value.instructions || null
        }).eq("id", userId).select("default_delivery_city, default_delivery_neighborhood, default_delivery_address, default_delivery_instructions").maybeSingle();
        if (result.error || !result.data) throw new Error("No pudimos guardar la dirección predeterminada.");
        state.defaultAddress = normalize({ city: result.data.default_delivery_city, neighborhood: result.data.default_delivery_neighborhood, address: result.data.default_delivery_address, instructions: result.data.default_delivery_instructions });
        return { ...state.defaultAddress };
    }

    async function openCheckout(options = {}) {
        createModal();
        if (options.userId) {
            try { await getDefaultAddress(options.userId); } catch (_) { /* Defaults remain optional during backend rollout. */ }
        }
        state.onConfirm = options.onConfirm;
        state.onCancel = options.onCancel;
        state.form.reset();
        fillForm(state.form, state.defaultAddress);
        byId("deliveryContactName").textContent = "Nombre: " + (options.profile?.full_name || "No disponible");
        byId("deliveryContactPhone").textContent = "Teléfono: " + (options.profile?.phone || "No disponible");
        setStatus("deliveryCheckoutStatus", "");
        state.modal.hidden = false;
        state.modal.setAttribute("aria-hidden", "false");
        state.form.elements.city.focus();
    }

    function closeCheckout(abandoned = false) {
        if (!state.modal) return;
        state.modal.hidden = true;
        state.modal.setAttribute("aria-hidden", "true");
        if (abandoned && typeof state.onCancel === "function") state.onCancel();
        state.onConfirm = null;
        state.onCancel = null;
    }

    function handleAuthState(user) {
        if (user) return;
        closeCheckout(false);
        state.defaultAddress = emptyAddress();
        const form = byId("deliveryDefaultForm");
        if (form) form.reset();
        try { sessionStorage.removeItem("goTiendaPendingCheckout"); } catch (_) { /* no persisted delivery state remains */ }
    }

    document.addEventListener("DOMContentLoaded", () => { createDefaultAddressForm(); createModal(); });
    namespace.delivery = Object.freeze({ normalize, validate, getDefaultAddress, saveDefaultAddress, openCheckout, closeCheckout, getConfirmedDelivery: () => state.form && !state.modal.hidden ? getFormAddress(state.form) : null, handleAuthState });
}(window.GoTienda = window.GoTienda || {}));
