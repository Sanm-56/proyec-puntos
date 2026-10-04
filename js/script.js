(function (namespace) {
    function configureExpanders() {
        function changeState(selector, expanded, scrollToStart = false) {
            document.querySelectorAll(selector).forEach(product => product.classList.toggle("mostrar", expanded));
            document.querySelectorAll(`[data-toggle-productos="${selector}"]`).forEach(button => {
                button.setAttribute("aria-expanded", String(expanded)); button.closest(".control-productos").classList.toggle("oculto", expanded);
                if (scrollToStart) button.scrollIntoView({ behavior: "smooth", block: "center" });
            });
            document.querySelectorAll(`[data-collapse-productos="${selector}"]`).forEach(button => button.closest(".control-productos-final").classList.toggle("mostrar", expanded));
        }
        document.querySelectorAll("[data-toggle-productos]").forEach(button => button.addEventListener("click", () => changeState(button.dataset.toggleProductos, true)));
        document.querySelectorAll("[data-collapse-productos]").forEach(button => button.addEventListener("click", () => changeState(button.dataset.collapseProductos, false, true)));
    }
    function animateAddToCart(button, cartButton) {
        const product = button.closest(".producto"); const image = product && product.querySelector("img");
        if (!image || !cartButton) return;
        const imageRect = image.getBoundingClientRect(); const cartRect = cartButton.getBoundingClientRect(); const clone = image.cloneNode(true);
        clone.classList.add("fly-img"); clone.style.width = `${imageRect.width}px`; clone.style.height = `${imageRect.height}px`; clone.style.left = `${imageRect.left}px`; clone.style.top = `${imageRect.top}px`; clone.style.opacity = "1"; document.body.appendChild(clone); clone.getBoundingClientRect();
        clone.style.transform = `translate(${cartRect.left + cartRect.width / 2 - (imageRect.left + imageRect.width / 2)}px, ${cartRect.top + cartRect.height / 2 - (imageRect.top + imageRect.height / 2)}px) scale(0.18)`; clone.style.opacity = "0.6";
        cartButton.classList.add("cart-bounce"); setTimeout(() => cartButton.classList.remove("cart-bounce"), 600); setTimeout(() => clone.remove(), 750);
    }
    function configureCart(controller) {
        const cartPanel = document.getElementById("carritoPanel"); const cartButton = document.getElementById("btnCarrito");
        if (cartButton && cartPanel) cartButton.addEventListener("click", () => cartPanel.classList.toggle("activo"));
        document.querySelectorAll(".agregar-carrito").forEach(button => button.addEventListener("click", () => { if (button.disabled) return; try { animateAddToCart(button, cartButton); } catch (error) { /* La animacion es decorativa y no debe bloquear el pedido. */ } controller.add(button); }));
        const emptyButton = document.getElementById("btnVaciarCarrito"); const checkoutButton = document.getElementById("btnEnviarPedido");
        if (emptyButton) emptyButton.addEventListener("click", controller.empty); if (checkoutButton) checkoutButton.addEventListener("click", controller.checkout);
    }
    function configureCategoryNavigation() {
        const navLinks = document.querySelectorAll(".categoria-nav a"); const sections = document.querySelectorAll("#productos .categoria-seccion"); const showAll = document.getElementById("mostrarTodos");
        const clearActiveNav = () => navLinks.forEach(link => link.classList.remove("active"));
        function showOnlySection(id) { sections.forEach(section => { if (section.id === id) { section.classList.remove("inactive"); section.scrollIntoView({ behavior: "smooth", block: "start" }); } else section.classList.add("inactive"); }); }
        navLinks.forEach(link => link.addEventListener("click", event => { const href = link.getAttribute("href"); if (!href || href === "#") return; event.preventDefault(); clearActiveNav(); link.classList.add("active"); showOnlySection(href.replace("#", "")); }));
        if (showAll) showAll.addEventListener("click", event => { event.preventDefault(); clearActiveNav(); sections.forEach(section => section.classList.remove("inactive")); const productsSection = document.getElementById("productos"); if (productsSection) window.scrollTo({ top: productsSection.offsetTop - 20, behavior: "smooth" }); });
        if (sections.length) { const defaultId = sections[0].id; const defaultLink = document.querySelector(`.categoria-nav a[href="#${defaultId}"]`); clearActiveNav(); if (defaultLink) defaultLink.classList.add("active"); showOnlySection(defaultId); }
    }
    function configureAnimations() {
        try { const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("visible"); }), { root: null, rootMargin: "0px", threshold: 0.08 }); document.querySelectorAll(".producto, .categoria-seccion").forEach(element => observer.observe(element)); }
        catch (error) { document.querySelectorAll(".producto, .categoria-seccion").forEach(element => element.classList.add("visible")); }
    }
    const cartController = namespace.cart.createCartController();
    cartController.render();
    document.addEventListener("DOMContentLoaded", () => {
        namespace.products.configurePrices(); configureExpanders(); namespace.products.configureFlavorGalleries(); configureCart(cartController);
        document.querySelectorAll('a[target="_blank"]').forEach(link => link.setAttribute("rel", "noopener noreferrer"));
        configureCategoryNavigation(); configureAnimations();
    });
}(window.GoTienda = window.GoTienda || {}));
