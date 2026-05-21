// ================= VER MÁS / VER MENOS =================
function togglePasabocas() {
    const productos = document.querySelectorAll(".oculto-pasabocas");
    const boton = document.getElementById("btnPasabocas");

    productos.forEach(producto => {
        producto.classList.toggle("mostrar");
    });

    const texto = boton.textContent.trim().toLowerCase();
    if (texto.includes("menos")) {
        boton.textContent = "Ver más";
    } else {
        boton.textContent = "Ver menos";
    }
}
function toggleDulceria() {
    const productos = document.querySelectorAll(".oculto-dulceria");
    const boton = document.getElementById("btnDulceria");

    productos.forEach(producto => {
        producto.classList.toggle("mostrar");
    });

    const textoD = boton.textContent.trim().toLowerCase();
    if (textoD.includes("menos")) {
        boton.textContent = "Ver más";
    } else {
        boton.textContent = "Ver menos";
    }
}
// ================= CARRITO =================
// ================= CARRITO =================
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let puntosCliente = Number(localStorage.getItem("puntosCliente")) || 0;
let ultimoResumenPuntos = {
    subtotal: 0,
    descuento: 0,
    total: 0,
    puntosGanados: 0,
    puntosUsados: 0
};

const botonesAgregar = document.querySelectorAll(".agregar-carrito");
const listaCarrito = document.getElementById("listaCarrito");
const subtotalCarrito = document.getElementById("subtotalCarrito");
const totalCarrito = document.getElementById("totalCarrito");
const contadorCarrito = document.getElementById("contadorCarrito");
const carritoPanel = document.getElementById("carritoPanel");
const btnCarrito = document.getElementById("btnCarrito");
const saldoPuntos = document.getElementById("saldoPuntos");
const puntosGanados = document.getElementById("puntosGanados");
const descuentoPuntos = document.getElementById("descuentoPuntos");
const usarPuntos = document.getElementById("usarPuntos");

// ABRIR / CERRAR CARRITO
btnCarrito.addEventListener("click", () => {
    carritoPanel.classList.toggle("activo");
});

usarPuntos.addEventListener("change", actualizarCarrito);

// AGREGAR PRODUCTO
botonesAgregar.forEach(boton => {
    boton.addEventListener("click", () => {
        const nombre = boton.dataset.nombre;
        const precio = Number(boton.dataset.precio);

        const productoExistente = carrito.find(p => p.nombre === nombre);

        if (productoExistente) {
            productoExistente.cantidad += 1;
        } else {
            carrito.push({
                nombre: nombre,
                precio: precio,
                cantidad: 1
            });
        }

        actualizarCarrito();
    });
});

// ACTUALIZAR CARRITO
function actualizarCarrito() {
    listaCarrito.innerHTML = "";
    let subtotal = 0;
    let cantidadTotal = 0;

    carrito.forEach((producto, index) => {
        const li = document.createElement("li");

        li.innerHTML = `
            ${producto.nombre} - $${producto.precio} x${producto.cantidad}
            <button onclick="restarCantidad(${index})">➖</button>
            <button onclick="eliminarProducto(${index})">❌</button>
        `;

        listaCarrito.appendChild(li);

        subtotal += producto.precio * producto.cantidad;
        cantidadTotal += producto.cantidad;
    });

          const puntosRedimibles = usarPuntos.checked ? Math.floor(puntosCliente / 100) * 100 : 0;
          const maximoPorSubtotal = Math.floor(subtotal / 1000) * 100;
          const puntosUsados = Math.min(puntosRedimibles, maximoPorSubtotal);
          const descuento = (puntosUsados / 100) * 1000;
          const total = Math.max(subtotal - descuento, 0);
          const puntosDelPedido = Math.floor(total / 1000);

          ultimoResumenPuntos = {
              subtotal: subtotal,
              descuento: descuento,
              total: total,
              puntosGanados: puntosDelPedido,
              puntosUsados: puntosUsados
          };

          subtotalCarrito.textContent = subtotal;
          descuentoPuntos.textContent = descuento;
          totalCarrito.textContent = total;
          contadorCarrito.textContent = cantidadTotal;
          saldoPuntos.textContent = puntosCliente;
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
    usarPuntos.checked = false;
    actualizarCarrito();
}

// ENVIAR PEDIDO A WHATSAPP
function enviarPedido() {
    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    let mensaje = "🛒 *NUEVO PEDIDO* %0A%0A";

    carrito.forEach(producto => {
        mensaje += `📦 ${producto.nombre}%0A`;
        mensaje += `   Cantidad: ${producto.cantidad}%0A`;
        mensaje += `   Precio unitario: $${producto.precio}%0A`;
        mensaje += `   Subtotal: $${producto.precio * producto.cantidad}%0A%0A`;
    });

    mensaje += `Subtotal: $${ultimoResumenPuntos.subtotal}%0A`;

    if (ultimoResumenPuntos.puntosUsados > 0) {
        mensaje += `Puntos redimidos: ${ultimoResumenPuntos.puntosUsados}%0A`;
        mensaje += `Descuento por puntos: -$${ultimoResumenPuntos.descuento}%0A`;
    }

    mensaje += `💰 *TOTAL: $${ultimoResumenPuntos.total}*%0A`;
    mensaje += `Puntos ganados con este pedido: ${ultimoResumenPuntos.puntosGanados}%0A`;
    mensaje += `Saldo de puntos despues del pedido: ${puntosCliente - ultimoResumenPuntos.puntosUsados + ultimoResumenPuntos.puntosGanados}`;

    puntosCliente = puntosCliente - ultimoResumenPuntos.puntosUsados + ultimoResumenPuntos.puntosGanados;
    localStorage.setItem("puntosCliente", puntosCliente);
    carrito = [];
    usarPuntos.checked = false;
    actualizarCarrito();

    window.open(`https://wa.me/573132082366?text=${mensaje}`, "_blank");
}
actualizarCarrito();

// ================= ADMIN OCULTO PRO =================

const claveAdmin = "841026";
let modoAdmin = localStorage.getItem("modoAdmin") === "true";

// Crear indicador visual
const indicadorAdmin = document.createElement("div");
indicadorAdmin.textContent = "🔐 Modo Admin Activo";
indicadorAdmin.style.position = "fixed";
indicadorAdmin.style.top = "10px";
indicadorAdmin.style.right = "10px";
indicadorAdmin.style.background = "#111";
indicadorAdmin.style.color = "#fff";
indicadorAdmin.style.padding = "6px 10px";
indicadorAdmin.style.borderRadius = "6px";
indicadorAdmin.style.fontSize = "12px";
indicadorAdmin.style.zIndex = "3000";
indicadorAdmin.style.display = "none";
document.body.appendChild(indicadorAdmin);

// Activar con teclado secreto
document.addEventListener("keydown", function(e) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "ñ") {
        const clave = prompt("Ingrese clave de administrador:");

        if (clave === claveAdmin) {
            modoAdmin = true;
            localStorage.setItem("modoAdmin", "true");
            activarModoAdmin();
            indicadorAdmin.style.display = "block";
            alert("Modo administrador activado");
        } else {
            alert("Clave incorrecta");
        }
    }
});

// Cerrar admin con Ctrl + Shift + Q
document.addEventListener("keydown", function(e) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "q") {
        modoAdmin = false;
        localStorage.removeItem("modoAdmin");
        indicadorAdmin.style.display = "none";
        alert("Modo administrador desactivado");
    }
});

// Cargar estados al iniciar
document.addEventListener("DOMContentLoaded", () => {
    cargarEstados();
    if (modoAdmin) {
        activarModoAdmin();
        indicadorAdmin.style.display = "block";
    }
});

function cargarEstados() {
    document.querySelectorAll(".producto").forEach((producto, index) => {

        const estado = producto.querySelector(".estado");
        const botonAgregar = producto.querySelector(".agregar-carrito");

        const idProducto = "estado_producto_" + index;
        const estadoGuardado = localStorage.getItem(idProducto);

        if (estadoGuardado === "agotado") {
            aplicarAgotado(estado, botonAgregar);
        } else {
            aplicarDisponible(estado, botonAgregar);
        }

        estado.addEventListener("click", () => {
            if (!modoAdmin) return;

            if (estado.classList.contains("disponible")) {
                aplicarAgotado(estado, botonAgregar);
                localStorage.setItem(idProducto, "agotado");
            } else {
                aplicarDisponible(estado, botonAgregar);
                localStorage.setItem(idProducto, "disponible");
            }
        });
    });
}

function activarModoAdmin() {
    document.querySelectorAll(".estado").forEach(e => {
        e.style.cursor = "pointer";
    });
}

function aplicarAgotado(estado, botonAgregar) {
    estado.classList.remove("disponible");
    estado.classList.add("agotado");
    estado.textContent = "Agotado";

    if (botonAgregar) {
        botonAgregar.disabled = true;
        botonAgregar.textContent = "Agotado";
    }
}

function aplicarDisponible(estado, botonAgregar) {
    estado.classList.remove("agotado");
    estado.classList.add("disponible");
    estado.textContent = "Disponible";

    if (botonAgregar) {
        botonAgregar.disabled = false;
        botonAgregar.textContent = "Agregar";
    }
}

function mostrarDetal() {
  document.getElementById("detal").style.display = "block";
  document.getElementById("mayorista").style.display = "none";
}

function mostrarMayorista() {
  document.getElementById("detal").style.display = "none";
  document.getElementById("mayorista").style.display = "block";
}
