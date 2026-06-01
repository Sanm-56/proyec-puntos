// ================= FORMATO Y EXPANSORES =================
function formatearPrecio(valor) {
    return `$${Number(valor).toLocaleString("es-CO")}`;
}

function configurarPrecios() {
    document.querySelectorAll(".producto").forEach(producto => {
        const precio = producto.querySelector(".precio");
        const botonAgregar = producto.querySelector(".agregar-carrito");

        if (precio && botonAgregar) {
            precio.textContent = formatearPrecio(botonAgregar.dataset.precio);
        }
    });
}

function configurarExpansores() {
    function cambiarEstado(selector, expandido, desplazarAlInicio = false) {
        document.querySelectorAll(selector).forEach(producto => {
            producto.classList.toggle("mostrar", expandido);
        });

        document.querySelectorAll(`[data-toggle-productos="${selector}"]`).forEach(boton => {
            boton.setAttribute("aria-expanded", String(expandido));
            boton.closest(".control-productos").classList.toggle("oculto", expandido);

            if (desplazarAlInicio) {
                boton.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });

        document.querySelectorAll(`[data-collapse-productos="${selector}"]`).forEach(boton => {
            boton.closest(".control-productos-final").classList.toggle("mostrar", expandido);
        });
    }

    document.querySelectorAll("[data-toggle-productos]").forEach(boton => {
        boton.addEventListener("click", () => {
            cambiarEstado(boton.dataset.toggleProductos, true);
        });
    });

    document.querySelectorAll("[data-collapse-productos]").forEach(boton => {
        boton.addEventListener("click", () => {
            cambiarEstado(boton.dataset.collapseProductos, false, true);
        });
    });
}

const galeriasSabores = [
    {
        productos: ["gritsnat9"],
        sabores: [
            ["Natural", "img/paquetes/gritsnat9.jpeg", "gritsnat9"],
            ["Pollo", "img/paquetes/gritsnat9.jpeg", "gritspol9"],
            ["Caramelo", "img/paquetes/gritscara9.jpeg", "gritscara9"],
            ["Picante", "img/paquetes/gritspic9.jpeg", "gritspic9"]
        ]
    },
    {
        productos: ["gristcara33"],
        sabores: [
            ["Caramelo", "img/paquetes/gristcara33.jpeg", "gristcara33"],
            ["Picante", "img/paquetes/gritspic33.jpeg", "gritspic33"],
            ["Queso", "img/paquetes/gritsque33.jpeg", "gritsque33"],
            ["Natural", "img/paquetes/gritsnat33.jpeg", "gritsnat33"]
        ]
    },
    {
        productos: ["gritsque50"],
        sabores: [
            ["Queso", "img/paquetes/gritsque50.jpeg", "gritsque50"],
            ["Natural", "img/paquetes/gritsnat50.jpeg", "gritsnat50"]
        ]
    },
    {
        productos: ["toclim"],
        sabores: [
            ["Limon", "img/paquetes/toclim.jpeg", "toclim"],
            ["Picante", "img/paquetes/tocpic.jpeg", "tocpic"],
            ["Miel", "img/paquetes/tocmie.jpeg", "tocmie"]
        ]
    },
    {
        productos: ["troclim"],
        sabores: [
            ["Limon", "img/paquetes/troclim.jpeg", "troclim"],
            ["Picante", "img/paquetes/trocpic.jpeg", "trocpic"],
            ["Pollo", "img/paquetes/trocpol.jpeg", "trocpol"]
        ]
    },
    {
        productos: ["tostolim"],
        sabores: [
            ["Limon", "img/paquetes/tostolim.jpeg", "tostolim"],
            ["Maduro", "img/paquetes/tostomadu.jpeg", "tostomadu"]
        ]
    },
    {
        productos: ["candycere"],
        sabores: [
            ["Cereza", "img/dulceria/candycere.jpeg", "candycere"],
            ["Manzana", "img/dulceria/candymanz.jpeg", "candymanz"],
            ["Mora", "img/dulceria/candymora.jpeg", "candymora"]
        ]
    },
    {
        productos: ["galleblanc77"],
        sabores: [
            ["Blanco", "img/galletas/galleblanc77.jpeg", "galleblanc77"],
            ["Negro", "img/galletas/galleneg77.jpeg", "galleneg77"],
            ["Fresa", "img/galletas/galletafresa77.jpg", "galletafresa77"]
        ]
    }
];

// Agrega aqui las referencias agotadas para bloquear solo esa variante.
const referenciasAgotadas = new Set([]);

function referenciaAgotada(referencia) {
    return referenciasAgotadas.has(referencia);
}

function aplicarDisponibilidadSeleccionada(producto, referencia) {
    const estado = producto.querySelector(".estado");
    const botonAgregar = producto.querySelector(".agregar-carrito");
    const enlacePedido = producto.querySelector("a.boton");
    const agotado = referenciaAgotada(referencia);

    if (estado) {
        estado.classList.toggle("agotado", agotado);
        estado.classList.toggle("disponible", !agotado);
        estado.textContent = agotado ? "Agotado" : "Disponible";
    }

    if (botonAgregar) {
        botonAgregar.disabled = agotado;
        botonAgregar.textContent = agotado ? "Agotado" : "Agregar";
    }

    if (enlacePedido) {
        enlacePedido.classList.toggle("boton-agotado", agotado);
        enlacePedido.setAttribute("aria-disabled", String(agotado));
        enlacePedido.style.pointerEvents = agotado ? "none" : "";
    }
}

function configurarGaleriasSabores() {
    const galeriasPorProducto = new Map();

    galeriasSabores.forEach(galeria => {
        galeria.productos.forEach(nombre => galeriasPorProducto.set(nombre, galeria.sabores));
    });

    document.querySelectorAll(".agregar-carrito").forEach((botonAgregar, index) => {
        const sabores = galeriasPorProducto.get(botonAgregar.dataset.nombre.trim());
        const producto = botonAgregar.closest(".producto");
        if (!sabores || !producto) return;

        const imagenPrincipal = producto.querySelector("img");
        const enlacePedido = producto.querySelector("a.boton");
        const botonGaleria = document.createElement("button");
        const panel = document.createElement("div");
        const panelId = `galeria-sabores-${index}`;

        producto.classList.add("producto-con-sabores");
        botonGaleria.type = "button";
        botonGaleria.className = "boton-sabores";
        botonGaleria.setAttribute("aria-controls", panelId);
        botonGaleria.setAttribute("aria-expanded", "false");
        botonGaleria.setAttribute("aria-label", "Ver sabores disponibles");
        botonGaleria.textContent = "+";

        panel.id = panelId;
        panel.className = "galeria-sabores";
        panel.setAttribute("aria-label", "Sabores disponibles");

        sabores.forEach(([nombre, imagen, referencia]) => {
            const opcion = document.createElement("button");
            const miniatura = document.createElement("img");
            const etiqueta = document.createElement("span");

            opcion.type = "button";
            opcion.className = "sabor-opcion";
            opcion.setAttribute("aria-label", `Ver sabor ${nombre}`);
            opcion.classList.toggle("sabor-agotado", referenciaAgotada(referencia));
            miniatura.src = imagen;
            miniatura.alt = nombre;
            etiqueta.textContent = nombre;
            opcion.append(miniatura, etiqueta);

            opcion.addEventListener("click", event => {
                event.stopPropagation();
                imagenPrincipal.src = imagen;
                imagenPrincipal.alt = `Producto sabor ${nombre}`;
                botonAgregar.dataset.nombre = referencia;
                if (enlacePedido) {
                    enlacePedido.href = `https://wa.me/573132082366?text=${encodeURIComponent(`Hola, quiero informacion sobre ${referencia}.`)}`;
                }
                const descripcion = producto.querySelector("p:not(.precio)");
                if (descripcion) {
                    descripcion.textContent = descripcion.textContent.replace(/-[^-.\s]+\.?$/, `-${nombre.toUpperCase()}.`);
                }
                aplicarDisponibilidadSeleccionada(producto, referencia);
                producto.classList.remove("galeria-fijada");
                botonGaleria.setAttribute("aria-expanded", "false");
            });

            panel.appendChild(opcion);
        });

        function alternarGaleria(event) {
            event.stopPropagation();
            const abierta = producto.classList.toggle("galeria-fijada");
            botonGaleria.setAttribute("aria-expanded", String(abierta));
        }

        botonGaleria.addEventListener("click", alternarGaleria);
        producto.prepend(botonGaleria);
        producto.appendChild(panel);
    });

    document.addEventListener("click", event => {
        document.querySelectorAll(".producto-con-sabores.galeria-fijada").forEach(producto => {
            if (producto.contains(event.target)) return;

            producto.classList.remove("galeria-fijada");
            producto.querySelector(".boton-sabores").setAttribute("aria-expanded", "false");
        });
    });
}

// ================= CARRITO =================
function obtenerCatalogo() {
    const catalogo = new Map();

    document.querySelectorAll(".agregar-carrito").forEach(boton => {
        catalogo.set(boton.dataset.nombre.trim(), Number(boton.dataset.precio));
    });

    galeriasSabores.forEach(galeria => {
        const botonBase = document.querySelector(`[data-nombre="${galeria.productos[0]}"]`);
        if (!botonBase) return;

        galeria.sabores.forEach(([, , referencia]) => {
            catalogo.set(referencia, Number(botonBase.dataset.precio));
        });
    });

    return catalogo;
}

function cargarCarrito() {
    try {
        const catalogo = obtenerCatalogo();
        const carritoGuardado = JSON.parse(localStorage.getItem("carrito")) || [];
        if (!Array.isArray(carritoGuardado)) return [];

        return carritoGuardado.filter(producto =>
            typeof producto.nombre === "string" &&
            Number.isInteger(producto.cantidad) &&
            producto.cantidad > 0 &&
            catalogo.has(producto.nombre.trim())
        ).map(producto => ({
            nombre: producto.nombre.trim(),
            precio: catalogo.get(producto.nombre.trim()),
            cantidad: producto.cantidad
        }));
    } catch (error) {
        localStorage.removeItem("carrito");
        return [];
    }
}

let carrito = cargarCarrito();
let ultimoResumenPuntos = {
    subtotal: 0,
    total: 0,
    puntosGanados: 0
};

const botonesAgregar = document.querySelectorAll(".agregar-carrito");
const listaCarrito = document.getElementById("listaCarrito");
const subtotalCarrito = document.getElementById("subtotalCarrito");
const totalCarrito = document.getElementById("totalCarrito");
const contadorCarrito = document.getElementById("contadorCarrito");
const carritoPanel = document.getElementById("carritoPanel");
const btnCarrito = document.getElementById("btnCarrito");
const puntosGanados = document.getElementById("puntosGanados");

btnCarrito.addEventListener("click", () => {
    carritoPanel.classList.toggle("activo");
});

botonesAgregar.forEach(boton => {
    boton.addEventListener("click", () => {
        if (boton.disabled) return;

        try {
            animateAddToCart(boton);
        } catch (error) {
            // La animacion es decorativa y no debe bloquear el pedido.
        }

        const nombre = boton.dataset.nombre.trim();
        const precio = Number(boton.dataset.precio);
        const productoExistente = carrito.find(producto => producto.nombre === nombre);

        if (productoExistente) {
            productoExistente.cantidad += 1;
        } else {
            carrito.push({ nombre, precio, cantidad: 1 });
        }

        actualizarCarrito();
    });
});

function animateAddToCart(boton) {
    const producto = boton.closest(".producto");
    const imagen = producto && producto.querySelector("img");
    if (!imagen) return;

    const imagenRect = imagen.getBoundingClientRect();
    const carritoRect = btnCarrito.getBoundingClientRect();
    const clon = imagen.cloneNode(true);

    clon.classList.add("fly-img");
    clon.style.width = `${imagenRect.width}px`;
    clon.style.height = `${imagenRect.height}px`;
    clon.style.left = `${imagenRect.left}px`;
    clon.style.top = `${imagenRect.top}px`;
    clon.style.opacity = "1";
    document.body.appendChild(clon);
    clon.getBoundingClientRect();

    const translateX = carritoRect.left + carritoRect.width / 2 - (imagenRect.left + imagenRect.width / 2);
    const translateY = carritoRect.top + carritoRect.height / 2 - (imagenRect.top + imagenRect.height / 2);
    clon.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.18)`;
    clon.style.opacity = "0.6";

    btnCarrito.classList.add("cart-bounce");
    setTimeout(() => btnCarrito.classList.remove("cart-bounce"), 600);
    setTimeout(() => clon.remove(), 750);
}

function crearBotonCarrito(texto, etiqueta, accion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = texto;
    boton.setAttribute("aria-label", etiqueta);
    boton.addEventListener("click", accion);
    return boton;
}

function actualizarCarrito() {
    listaCarrito.innerHTML = "";
    let subtotal = 0;
    let cantidadTotal = 0;

    carrito.forEach((producto, index) => {
        const li = document.createElement("li");
        const descripcion = document.createElement("span");
        descripcion.textContent = `${producto.nombre} - ${formatearPrecio(producto.precio)} x${producto.cantidad}`;

        const botonRestar = crearBotonCarrito(
            "-",
            `Restar una unidad de ${producto.nombre}`,
            () => restarCantidad(index)
        );
        const botonEliminar = crearBotonCarrito(
            "X",
            `Eliminar ${producto.nombre} del carrito`,
            () => eliminarProducto(index)
        );

        li.append(descripcion, botonRestar, botonEliminar);
        listaCarrito.appendChild(li);

        subtotal += producto.precio * producto.cantidad;
        cantidadTotal += producto.cantidad;
    });

    const puntosDelPedido = Math.floor(subtotal / 1000);
    ultimoResumenPuntos = {
        subtotal,
        total: subtotal,
        puntosGanados: puntosDelPedido
    };

    subtotalCarrito.textContent = subtotal.toLocaleString("es-CO");
    totalCarrito.textContent = subtotal.toLocaleString("es-CO");
    contadorCarrito.textContent = cantidadTotal;
    puntosGanados.textContent = puntosDelPedido;
    localStorage.setItem("carrito", JSON.stringify(carrito));
}

function eliminarProducto(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

function restarCantidad(index) {
    if (carrito[index].cantidad > 1) {
        carrito[index].cantidad -= 1;
    } else {
        carrito.splice(index, 1);
    }

    actualizarCarrito();
}

function vaciarCarrito() {
    carrito = [];
    actualizarCarrito();
}

// ================= ENVIAR PEDIDO A WHATSAPP =================
function enviarPedido() {
    if (carrito.length === 0) {
        alert("El carrito esta vacio");
        return;
    }

    let mensaje = "*NUEVO PEDIDO*\n\n";

    carrito.forEach(producto => {
        mensaje += `${producto.nombre}\n`;
        mensaje += `   Cantidad: ${producto.cantidad}\n`;
        mensaje += `   Precio unitario: ${formatearPrecio(producto.precio)}\n`;
        mensaje += `   Subtotal: ${formatearPrecio(producto.precio * producto.cantidad)}\n\n`;
    });

    mensaje += `Subtotal: ${formatearPrecio(ultimoResumenPuntos.subtotal)}\n`;
    mensaje += `*TOTAL: ${formatearPrecio(ultimoResumenPuntos.total)}*\n`;
    mensaje += `Puntos estimados con este pedido: ${ultimoResumenPuntos.puntosGanados}`;

    carrito = [];
    actualizarCarrito();

    window.open(
        `https://wa.me/573132082366?text=${encodeURIComponent(mensaje)}`,
        "_blank",
        "noopener,noreferrer"
    );
}

// ================= NAVEGACION Y ANIMACIONES =================
document.addEventListener("DOMContentLoaded", () => {
    configurarPrecios();
    configurarExpansores();
    configurarGaleriasSabores();

    document.querySelectorAll('a[target="_blank"]').forEach(enlace => {
        enlace.setAttribute("rel", "noopener noreferrer");
    });

    const navLinks = document.querySelectorAll(".categoria-nav a");
    const sections = document.querySelectorAll("#productos .categoria-seccion");
    const mostrarTodos = document.getElementById("mostrarTodos");

    function clearActiveNav() {
        navLinks.forEach(link => link.classList.remove("active"));
    }

    function showOnlySection(id) {
        sections.forEach(section => {
            if (section.id === id) {
                section.classList.remove("inactive");
                section.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
                section.classList.add("inactive");
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener("click", event => {
            const href = link.getAttribute("href");
            if (!href || href === "#") return;

            event.preventDefault();
            clearActiveNav();
            link.classList.add("active");
            showOnlySection(href.replace("#", ""));
        });
    });

    if (mostrarTodos) {
        mostrarTodos.addEventListener("click", event => {
            event.preventDefault();
            clearActiveNav();
            sections.forEach(section => section.classList.remove("inactive"));
            window.scrollTo({
                top: document.getElementById("productos").offsetTop - 20,
                behavior: "smooth"
            });
        });
    }

    if (sections.length) {
        const defaultId = sections[0].id;
        const defaultLink = document.querySelector(`.categoria-nav a[href="#${defaultId}"]`);
        clearActiveNav();
        if (defaultLink) defaultLink.classList.add("active");
        showOnlySection(defaultId);
    }

    try {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add("visible");
            });
        }, { root: null, rootMargin: "0px", threshold: 0.08 });

        document.querySelectorAll(".producto, .categoria-seccion").forEach(elemento => {
            observer.observe(elemento);
        });
    } catch (error) {
        document.querySelectorAll(".producto, .categoria-seccion").forEach(elemento => {
            elemento.classList.add("visible");
        });
    }
});

actualizarCarrito();
