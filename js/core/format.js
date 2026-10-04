(function (namespace) {
    namespace.formatPrice = value => `$${Number(value).toLocaleString("es-CO")}`;
}(window.GoTienda = window.GoTienda || {}));
