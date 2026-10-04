(function (namespace) {
    const variantGalleries = [
        { products: ["gritsnat9"], flavors: [["Natural", "img/paquetes/gritsnat9.jpeg", "gritsnat9"], ["Pollo", "img/paquetes/gritsnat9.jpeg", "gritspol9"], ["Caramelo", "img/paquetes/gritscara9.jpeg", "gritscara9"], ["Picante", "img/paquetes/gritspic9.jpeg", "gritspic9"]] },
        { products: ["gristcara33"], flavors: [["Caramelo", "img/paquetes/gristcara33.jpeg", "gristcara33"], ["Picante", "img/paquetes/gritspic33.jpeg", "gritspic33"], ["Queso", "img/paquetes/gritsque33.jpeg", "gritsque33"], ["Natural", "img/paquetes/gritsnat33.jpeg", "gritsnat33"]] },
        { products: ["gritsque50"], flavors: [["Queso", "img/paquetes/gritsque50.jpeg", "gritsque50"], ["Natural", "img/paquetes/gritsnat50.jpeg", "gritsnat50"]] },
        { products: ["toclim"], flavors: [["Limon", "img/paquetes/toclim.jpeg", "toclim"], ["Picante", "img/paquetes/tocpic.jpeg", "tocpic"], ["Miel", "img/paquetes/tocmie.jpeg", "tocmie"]] },
        { products: ["troclim"], flavors: [["Limon", "img/paquetes/troclim.jpeg", "troclim"], ["Picante", "img/paquetes/trocpic.jpeg", "trocpic"], ["Pollo", "img/paquetes/trocpol.jpeg", "trocpol"]] },
        { products: ["tostolim"], flavors: [["Limon", "img/paquetes/tostolim.jpeg", "tostolim"], ["Maduro", "img/paquetes/tostomadu.jpeg", "tostomadu"]] },
        { products: ["lissitazlimon"], flavors: [["Limon", "img/paquetes/MINILIMO.jpeg", "lissitazlimon"], ["BBQ", "img/paquetes/MINIBBQ.jpeg", "lissitazbbq"], ["Hot chilli", "img/paquetes/MINIHOTCHILI.jpeg", "lissitazhotchilli"], ["Mayonesa", "img/paquetes/MINIMAYO.jpeg", "lissitazmayonesa"], ["Pollo", "img/paquetes/MINIPOLLO.jpeg", "lissitazpollo"]] },
        { products: ["candycere"], flavors: [["Cereza", "img/dulceria/candycere.jpeg", "candycere"], ["Manzana", "img/dulceria/candymanz.jpeg", "candymanz"], ["Mora", "img/dulceria/candymora.jpeg", "candymora"]] },
        { products: ["galleblanc77"], flavors: [["Blanco", "img/galletas/galleblanc77.jpeg", "galleblanc77"], ["Negro", "img/galletas/galleneg77.jpeg", "galleneg77"], ["Fresa", "img/galletas/galletafresa77.jpg", "galletafresa77"]] },
        { products: ["gallepoki"], flavors: [["Vainilla", "img/galletas/POKIVAI.jpeg", "pokivainilla"], ["Fresa", "img/galletas/POKIFRESA.jpeg", "pokifresa"], ["Limon", "img/galletas/POKILIM.jpeg", "pokilimon"], ["Chocolate", "img/galletas/POKICHOCO.jpeg", "pokichocolate"], ["Vainilla black", "img/galletas/POKIBLACK.jpeg", "pokivainillablack"]] }
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
            flavors.forEach(([name, image, reference]) => {
                const option = document.createElement("button"); const thumbnail = document.createElement("img"); const label = document.createElement("span");
                option.type = "button"; option.className = "sabor-opcion"; option.setAttribute("aria-label", `Ver sabor ${name}`); option.classList.toggle("sabor-agotado", isOutOfStock(reference));
                thumbnail.src = image; thumbnail.alt = name; label.textContent = name; option.append(thumbnail, label);
                option.addEventListener("click", event => {
                    event.stopPropagation(); mainImage.src = image; mainImage.alt = `Producto sabor ${name}`; addButton.dataset.nombre = reference;
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
    namespace.products = { variantGalleries, configurePrices, configureFlavorGalleries };
}(window.GoTienda = window.GoTienda || {}));
