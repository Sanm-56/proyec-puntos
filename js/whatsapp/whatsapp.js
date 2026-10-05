(function (namespace) {
    const businessPhone = "573132082366";
    const client = () => namespace.supabase && namespace.supabase.isAvailable() ? namespace.supabase.client : null;
    const price = value => namespace.formatPrice ? namespace.formatPrice(Number(value)) : "$" + Number(value || 0).toLocaleString("es-CO");
    const statusLabel = status => namespace.orders && namespace.orders.statusLabel ? namespace.orders.statusLabel(status) : ({ pending: "Pendiente", confirmed: "Confirmado", preparing: "En preparación", completed: "Completado", cancelled: "Cancelado" }[status] || "No disponible");
    const createWhatsappUrl = message => `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
    const openMessage = message => { const url = createWhatsappUrl(message); const popup = window.open(url, "_blank", "noopener,noreferrer"); return { url, opened: Boolean(popup) }; };

    function pointsLine(order) {
        const points = Number(order?.points_earned) || 0;
        if (points <= 0) return "";
        if (order.status === "completed") return `Puntos acreditados: ${points}`;
        if (order.status === "cancelled") return `Puntos no acreditados: ${points}`;
        return `Puntos por acreditar: ${points}`;
    }
    function buildCheckoutMessage(order) {
        const lines = ["Hola, quiero continuar con mi pedido en GO TIENDA.", "", `Pedido: ${order.order_number}`, "", "Cliente:", order.customer_name || "", "", "Teléfono:", order.customer_phone || "", "", "Entrega:"];
        if (order.delivery_city) lines.push(`Ciudad/Municipio: ${order.delivery_city}`);
        if (order.delivery_neighborhood) lines.push(`Barrio: ${order.delivery_neighborhood}`);
        if (order.delivery_address) lines.push(`Dirección: ${order.delivery_address}`);
        if (order.delivery_instructions) lines.push(`Indicaciones: ${order.delivery_instructions}`);
        lines.push("", "Productos:");
        (order.items || []).forEach(item => lines.push(`• ${item.product_name || "Producto"} × ${item.quantity} — ${price(item.line_total)}`));
        lines.push("", "Total:", price(order.total), "", "Estado:", statusLabel(order.status));
        const points = pointsLine(order); if (points) lines.push("", points);
        lines.push("", "El pedido ya fue registrado en GO TIENDA.");
        return lines.filter((line, index, all) => line || index === 0 || all[index - 1] !== "").join("\n");
    }
    function buildOrderSupportMessage(order) {
        const lines = [`Hola, necesito ayuda con mi pedido ${order.order_number}.`, "", "Estado actual:", statusLabel(order.status)];
        if (Number.isFinite(Number(order.total))) lines.push("", "Total:", price(order.total));
        const points = pointsLine(order); if (points) lines.push("", points);
        lines.push("", "Quisiera consultar información sobre este pedido.");
        return lines.join("\n");
    }
    const buildGeneralSupportMessage = () => "Hola, necesito ayuda con GO TIENDA.";
    async function loadPersistedOrder(orderNumber) {
        if (!client() || !orderNumber) throw new Error("ORDER_UNAVAILABLE");
        const result = await client().from("orders").select("id, order_number, customer_name, customer_phone, delivery_city, delivery_neighborhood, delivery_address, delivery_instructions, status, subtotal, total, points_earned, created_at").eq("order_number", orderNumber).single();
        if (result.error || !result.data) throw result.error || new Error("ORDER_UNAVAILABLE");
        const itemsResult = await client().from("order_items").select("product_code, product_reference, product_name, unit_price, quantity, line_total").eq("order_id", result.data.id).order("created_at", { ascending: true });
        if (itemsResult.error) throw itemsResult.error;
        return { ...result.data, items: Array.isArray(itemsResult.data) ? itemsResult.data : [] };
    }
    async function openPersistedOrder(orderNumber) { const order = await loadPersistedOrder(orderNumber); return { order, ...openMessage(buildCheckoutMessage(order)) }; }
    async function openOrderSupport(orderNumber) { const order = await loadPersistedOrder(orderNumber); return { order, ...openMessage(buildOrderSupportMessage(order)) }; }
    namespace.whatsapp = Object.freeze({ businessPhone, createWhatsappUrl, openMessage, buildCheckoutMessage, buildOrderSupportMessage, buildGeneralSupportMessage, loadPersistedOrder, openPersistedOrder, openOrderSupport });
    document.addEventListener("DOMContentLoaded", () => { const button = document.getElementById("btnWhatsappGeneral"); if (button) button.addEventListener("click", () => openMessage(buildGeneralSupportMessage())); });
}(window.GoTienda = window.GoTienda || {}));
