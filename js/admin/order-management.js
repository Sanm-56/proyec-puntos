(function initializeAdminOrderManagement(namespace) {
    const allowedTransitions = Object.freeze({
        pending: Object.freeze([{ status: "confirmed", label: "Confirmar" }, { status: "cancelled", label: "Cancelar", destructive: true }]),
        confirmed: Object.freeze([{ status: "preparing", label: "Marcar en preparación" }, { status: "cancelled", label: "Cancelar", destructive: true }]),
        preparing: Object.freeze([{ status: "completed", label: "Completar" }, { status: "cancelled", label: "Cancelar", destructive: true }]),
        completed: Object.freeze([]),
        cancelled: Object.freeze([])
    });
    function getClient() { return namespace.supabase && namespace.supabase.isAvailable() ? namespace.supabase.client : null; }
    function getAllowedTransitions(status) { return allowedTransitions[status] || []; }
    function errorMessage(error) {
        const message = String(error && (error.message || error.code) || "");
        if (message.includes("AUTH_REQUIRED")) return "Tu sesión ha expirado. Inicia sesión nuevamente.";
        if (message.includes("ADMIN_REQUIRED") || message.includes("permission denied")) return "No tienes permiso para administrar pedidos.";
        if (message.includes("ORDER_NOT_FOUND")) return "El pedido ya no está disponible. Actualiza el panel.";
        if (message.includes("INVALID_STATUS_TRANSITION")) return "El estado del pedido cambió. Actualiza el panel e inténtalo de nuevo.";
        if (message.includes("INVALID_STATUS") || message.includes("INVALID_ORDER_NUMBER")) return "No se pudo validar el cambio de estado.";
        return "No pudimos actualizar el estado del pedido. Inténtalo de nuevo.";
    }
    async function updateStatus(orderNumber, newStatus) {
        const client = getClient();
        if (!client) throw new Error("SUPABASE_UNAVAILABLE");
        const result = await client.rpc("admin_update_order_status", { p_order_number: orderNumber, p_new_status: newStatus });
        if (result.error) throw result.error;
        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        if (!row) throw new Error("EMPTY_RPC_RESULT");
        return row;
    }
    namespace.orderManagement = Object.freeze({ getAllowedTransitions, updateStatus, errorMessage });
}(window.GoTienda = window.GoTienda || {}));
