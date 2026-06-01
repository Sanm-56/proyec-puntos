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
    document.querySelectorAll("[data-toggle-productos]").forEach(boton => {
        boton.addEventListener("click", () => {
            const productos = document.querySelectorAll(boton.dataset.toggleProductos);
            const expandido = boton.getAttribute("aria-expanded") === "true";

            productos.forEach(producto => producto.classList.toggle("mostrar", !expandido));
            boton.setAttribute("aria-expanded", String(!expandido));
            boton.textContent = expandido ? "Ver más" : "Ver menos";
        });
    });
}

// ================= CARRITO =================
function obtenerCatalogo() {
    const catalogo = new Map();

    document.querySelectorAll(".agregar-carrito").forEach(boton => {
        catalogo.set(boton.dataset.nombre.trim(), Number(boton.dataset.precio));
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

// ================= DISPONIBILIDAD =================
function cargarDisponibilidad() {
    document.querySelectorAll(".producto").forEach(producto => {
        const estado = producto.querySelector(".estado");
        const botonAgregar = producto.querySelector(".agregar-carrito");
        const enlacePedido = producto.querySelector("a.boton");
        const agotado = estado && estado.classList.contains("agotado");

        if (!agotado) return;

        estado.textContent = "Agotado";
        if (botonAgregar) {
            botonAgregar.disabled = true;
            botonAgregar.textContent = "Agotado";
        }
        if (enlacePedido) {
            enlacePedido.classList.add("boton-agotado");
            enlacePedido.setAttribute("aria-disabled", "true");
            enlacePedido.removeAttribute("href");
        }
    });
}

// ================= NAVEGACION Y ANIMACIONES =================
document.addEventListener("DOMContentLoaded", () => {
    configurarPrecios();
    configurarExpansores();
    cargarDisponibilidad();

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
