(function (namespace) {
    const businessPhone = "573132082366";
    const createWhatsappUrl = message => `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;

    function buildCheckoutMessage(cart, summary) {
        let message = "*NUEVO PEDIDO*\n\n";
        cart.forEach(product => {
            message += `${product.nombre}\n`;
            message += `   Cantidad: ${product.cantidad}\n`;
            message += `   Precio unitario: ${namespace.formatPrice(product.precio)}\n`;
            message += `   Subtotal: ${namespace.formatPrice(product.precio * product.cantidad)}\n\n`;
        });
        message += `Subtotal: ${namespace.formatPrice(summary.subtotal)}\n`;
        message += `*TOTAL: ${namespace.formatPrice(summary.total)}*\n`;
        return `${message}Puntos estimados con este pedido: ${summary.puntosGanados}`;
    }

    namespace.whatsapp = { createWhatsappUrl, buildCheckoutMessage };
}(window.GoTienda = window.GoTienda || {}));
