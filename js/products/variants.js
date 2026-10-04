(function (namespace) {
    const variantGalleries = [
        { products: ["gritsnat9"], flavors: [["Natural", "img/paquetes/gritsnat9.jpeg", "gritsnat9", "PAS-007"], ["Pollo", "img/paquetes/gritsnat9.jpeg", "gritspol9", "PAS-017"], ["Caramelo", "img/paquetes/gritscara9.jpeg", "gritscara9", "PAS-018"], ["Picante", "img/paquetes/gritspic9.jpeg", "gritspic9", "PAS-019"]] },
        { products: ["gristcara33"], flavors: [["Caramelo", "img/paquetes/gristcara33.jpeg", "gristcara33", "PAS-008"], ["Picante", "img/paquetes/gritspic33.jpeg", "gritspic33", "PAS-020"], ["Queso", "img/paquetes/gritsque33.jpeg", "gritsque33", "PAS-021"], ["Natural", "img/paquetes/gritsnat33.jpeg", "gritsnat33", "PAS-022"]] },
        { products: ["gritsque50"], flavors: [["Queso", "img/paquetes/gritsque50.jpeg", "gritsque50", "PAS-009"], ["Natural", "img/paquetes/gritsnat50.jpeg", "gritsnat50", "PAS-023"]] },
        { products: ["toclim"], flavors: [["Limon", "img/paquetes/toclim.jpeg", "toclim", "PAS-005"], ["Picante", "img/paquetes/tocpic.jpeg", "tocpic", "PAS-024"], ["Miel", "img/paquetes/tocmie.jpeg", "tocmie", "PAS-025"]] },
        { products: ["troclim"], flavors: [["Limon", "img/paquetes/troclim.jpeg", "troclim", "PAS-006"], ["Picante", "img/paquetes/trocpic.jpeg", "trocpic", "PAS-026"], ["Pollo", "img/paquetes/trocpol.jpeg", "trocpol", "PAS-027"]] },
        { products: ["tostolim"], flavors: [["Limon", "img/paquetes/tostolim.jpeg", "tostolim", "PAS-015"], ["Maduro", "img/paquetes/tostomadu.jpeg", "tostomadu", "PAS-028"]] },
        { products: ["lissitazlimon"], flavors: [["Limon", "img/paquetes/MINILIMO.jpeg", "lissitazlimon", "PAS-012"], ["BBQ", "img/paquetes/MINIBBQ.jpeg", "lissitazbbq", "PAS-029"], ["Hot chilli", "img/paquetes/MINIHOTCHILI.jpeg", "lissitazhotchilli", "PAS-030"], ["Mayonesa", "img/paquetes/MINIMAYO.jpeg", "lissitazmayonesa", "PAS-031"], ["Pollo", "img/paquetes/MINIPOLLO.jpeg", "lissitazpollo", "PAS-032"]] },
        { products: ["candycere"], flavors: [["Cereza", "img/dulceria/candycere.jpeg", "candycere", "DUL-033"], ["Manzana", "img/dulceria/candymanz.jpeg", "candymanz", "DUL-047"], ["Mora", "img/dulceria/candymora.jpeg", "candymora", "DUL-048"]] },
        { products: ["galleblanc77"], flavors: [["Blanco", "img/galletas/galleblanc77.jpeg", "galleblanc77", "GAL-001"], ["Negro", "img/galletas/galleneg77.jpeg", "galleneg77", "GAL-007"], ["Fresa", "img/galletas/galletafresa77.jpg", "galletafresa77", "GAL-008"]] },
        { products: ["gallepoki"], flavors: [["Vainilla", "img/galletas/POKIVAI.jpeg", "pokivainilla", "GAL-009"], ["Fresa", "img/galletas/POKIFRESA.jpeg", "pokifresa", "GAL-010"], ["Limon", "img/galletas/POKILIM.jpeg", "pokilimon", "GAL-011"], ["Chocolate", "img/galletas/POKICHOCO.jpeg", "pokichocolate", "GAL-012"], ["Vainilla black", "img/galletas/POKIBLACK.jpeg", "pokivainillablack", "GAL-013"]] }
    ];
    const outOfStockReferences = new Set([]);
    const isOutOfStock = reference => outOfStockReferences.has(reference);

    function configurePrices() {
        document.querySelectorAll(".producto").forEach(product => {
            const price = product.querySelector(".precio");
            const addButton = product.querySelector(".agregar-carrito");
            if (price && addButton) price.textContent = namespace.formatPrice(addButton.dataset.precio);
        });
    }

    function applySelectedAvailability(product, reference) {
        const status = product.querySelector(".estado");
        const addButton = product.querySelector(".agregar-carrito");
        const orderLink = product.querySelector("a.boton");
        const outOfStock = isOutOfStock(reference);
        if (status) { status.classList.toggle("agotado", outOfStock); status.classList.toggle("disponible", !outOfStock); status.textContent = outOfStock ? "Agotado" : "Disponible"; }
        if (addButton) { addButton.disabled = outOfStock; addButton.textContent = outOfStock ? "Agotado" : "Agregar"; }
        if (orderLink) { orderLink.classList.toggle("boton-agotado", outOfStock); orderLink.setAttribute("aria-disabled", String(outOfStock)); orderLink.style.pointerEvents = outOfStock ? "none" : ""; }
    }

    function configureFlavorGalleries() {
        const galleriesByProduct = new Map();
        variantGalleries.forEach(gallery => gallery.products.forEach(name => galleriesByProduct.set(name, gallery.flavors)));
        document.querySelectorAll(".agregar-carrito").forEach((addButton, index) => {
            const flavors = galleriesByProduct.get(addButton.dataset.nombre.trim());
            const product = addButton.closest(".producto");
            if (!flavors || !product) return;
            const mainImage = product.querySelector("img");
            const orderLink = product.querySelector("a.boton");
            const galleryButton = document.createElement("button");
            const panel = document.createElement("div");
            const panelId = `galeria-sabores-${index}`;
            product.classList.add("producto-con-sabores");
            galleryButton.type = "button"; galleryButton.className = "boton-sabores"; galleryButton.setAttribute("aria-controls", panelId); galleryButton.setAttribute("aria-expanded", "false"); galleryButton.setAttribute("aria-label", "Ver sabores disponibles"); galleryButton.textContent = "+";
            panel.id = panelId; panel.className = "galeria-sabores"; panel.setAttribute("aria-label", "Sabores disponibles");
            flavors.forEach(([name, image, reference, code]) => {
                const option = document.createElement("button"); const thumbnail = document.createElement("img"); const label = document.createElement("span");
                option.type = "button"; option.className = "sabor-opcion"; option.setAttribute("aria-label", `Ver sabor ${name}`); option.classList.toggle("sabor-agotado", isOutOfStock(reference));
                thumbnail.src = image; thumbnail.alt = name; label.textContent = name; option.append(thumbnail, label);
                option.addEventListener("click", event => {
                    event.stopPropagation(); mainImage.src = image; mainImage.alt = `Producto sabor ${name}`; addButton.dataset.nombre = reference; addButton.dataset.codigo = code;
                    if (orderLink) orderLink.href = namespace.whatsapp.createWhatsappUrl(`Hola, quiero informacion sobre ${reference}.`);
                    const description = product.querySelector("p:not(.precio)");
                    if (description) description.textContent = description.textContent.replace(/-[^-.\s]+\.?$/, `-${name.toUpperCase()}.`);
                    applySelectedAvailability(product, reference); product.classList.remove("galeria-fijada"); galleryButton.setAttribute("aria-expanded", "false");
                });
                panel.appendChild(option);
            });
            galleryButton.addEventListener("click", event => { event.stopPropagation(); const isOpen = product.classList.toggle("galeria-fijada"); galleryButton.setAttribute("aria-expanded", String(isOpen)); });
            product.prepend(galleryButton); product.appendChild(panel); applySelectedAvailability(product, addButton.dataset.nombre.trim());
        });
        document.addEventListener("click", event => document.querySelectorAll(".producto-con-sabores.galeria-fijada").forEach(product => {
            if (product.contains(event.target)) return;
            product.classList.remove("galeria-fijada"); product.querySelector(".boton-sabores").setAttribute("aria-expanded", "false");
        }));
    }
    function resolveVariant(reference) { for (const gallery of variantGalleries) { for (const [, , variantReference, code] of gallery.flavors) { if (variantReference === reference) { const entry = namespace.products.getByReference && namespace.products.getByReference(reference); return { code, reference, price: entry && entry.price, availability: !isOutOfStock(reference) }; } } } return null; }
    namespace.products = { variantGalleries, configurePrices, configureFlavorGalleries, resolveVariant };
}(window.GoTienda = window.GoTienda || {}));
