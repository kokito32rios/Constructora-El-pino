// ============================================
// DASHBOARD.JS
// ============================================

const API_URL_DASHBOARD = "http://localhost:3000/api";

// ============================================
// VERIFICAR AUTENTICACIÓN
// ============================================
const TOKEN_DASHBOARD = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

if (!TOKEN_DASHBOARD) {
  window.location.href = "/views/login.html";
}

// ============================================
// MOSTRAR DATOS DEL USUARIO
// ============================================
const userNameElement = document.getElementById("userName");
const userNameProfileElement = document.getElementById("userNameProfile");
const userRoleElement = document.getElementById("userRole");
const userAvatarElement = document.getElementById("userAvatar");

if (usuario.nombre) {
  userNameElement.textContent = usuario.nombre;
  userNameProfileElement.textContent = usuario.nombre;
  userRoleElement.textContent = usuario.rol_nombre || "Usuario";

  // Avatar con iniciales
  const iniciales = usuario.nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2);
  userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    usuario.nombre
  )}&background=D4AF37&color=1a1a1a&bold=true`;
}

// ============================================
// MOSTRAR FECHA ACTUAL
// ============================================
const currentDateElement = document.getElementById("currentDate");
const now = new Date();
const opciones = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};
currentDateElement.textContent = now.toLocaleDateString("es-CO", opciones);

// ============================================
// NAVEGACIÓN SIDEBAR
// ============================================
const navItems = document.querySelectorAll(".nav-item[data-section]");
const sections = document.querySelectorAll(".content-section");

navItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();

    // Quitar active de todos
    navItems.forEach((nav) => nav.classList.remove("active"));
    sections.forEach((section) => section.classList.remove("active"));

    // Agregar active al clickeado
    item.classList.add("active");
    const sectionId = item.getAttribute("data-section");
    document.getElementById(`section-${sectionId}`).classList.add("active");

    // Cerrar sidebar en móvil
    sidebar.classList.remove("active");
  });
});

// ============================================
// MOBILE MENU
// ============================================
const sidebar = document.getElementById("sidebar");
const mobileMenuToggle = document.getElementById("mobileMenuToggle");

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });
}

// ============================================
// LOGOUT
// ============================================
const logoutBtn = document.getElementById("logoutBtn");

const logoutModal = document.getElementById("logoutModal");
const confirmLogout = document.getElementById("confirmLogout");
const cancelLogout = document.getElementById("cancelLogout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    logoutModal.classList.add("active");
  });
}

cancelLogout.addEventListener("click", () => {
  logoutModal.classList.remove("active");
});

confirmLogout.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "/views/login.html";
});


// ============================================
// CARGAR ESTADÍSTICAS
// ============================================
async function cargarEstadisticas() {
  try {
    // Cargar total de inmuebles
    const inmueblesRes = await fetch(`${API_URL_DASHBOARD}/inmuebles`, {
      headers: {
        Authorization: `Bearer ${TOKEN_DASHBOARD }`,
      },
    });
    const inmueblesData = await inmueblesRes.json();

    if (inmueblesData.success) {
      document.getElementById("totalInmuebles").textContent =
        inmueblesData.pagination.total;

      // Contar disponibles
      const disponibles = inmueblesData.data.filter(
        (i) => i.estado_nombre === "Disponible"
      ).length;
      document.getElementById("inmueblesDisponibles").textContent = disponibles;
    }

    // Cargar total de clientes
    const clientesRes = await fetch(`${API_URL_DASHBOARD}/clientes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const clientesData = await clientesRes.json();

    if (clientesData.success) {
      document.getElementById("totalClientes").textContent =
        clientesData.pagination.total;
    }

    // Transacciones del mes (simulado por ahora)
    document.getElementById("transaccionesMes").textContent = "0";
  } catch (error) {
    console.error("Error al cargar estadísticas:", error);
  }
}

// ============================================
// CARGAR INMUEBLES RECIENTES
// ============================================
async function cargarInmueblesRecientes() {
  const container = document.getElementById("recentProperties");

  try {
    const response = await fetch(`${API_URL_DASHBOARD}/inmuebles?limit=5`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      container.innerHTML = "";

      data.data.forEach((inmueble) => {
        const card = crearTarjetaInmueble(inmueble);
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `
                <div class="empty-state" style="padding: 2rem;">
                    <p>No hay inmuebles registrados</p>
                </div>
            `;
    }
  } catch (error) {
    console.error("Error al cargar inmuebles:", error);
    container.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <p style="color: #ef4444;">Error al cargar inmuebles</p>
            </div>
        `;
  }
}

// ============================================
// CREAR TARJETA DE INMUEBLE
// ============================================
function crearTarjetaInmueble(inmueble) {
  const card = document.createElement("div");
  card.style.cssText = `
        background: var(--white-soft);
        padding: 1rem;
        border-radius: 8px;
        display: grid;
        grid-template-columns: 80px 1fr auto;
        gap: 1rem;
        align-items: center;
        transition: all 0.3s ease;
        cursor: pointer;
    `;

  const mediaUrl =
    inmueble.imagen_principal || "/public/images/placeholder.jpg";

  const esVideo = /\.(mp4|webm|ogg)$/i.test(mediaUrl);

  const mediaHTML = esVideo
    ? `
        <video 
          src="${mediaUrl}" 
          muted 
          preload="metadata"
          style="width:100%; height:100%; object-fit:cover;">
        </video>
      `
    : `
        <img 
          src="${mediaUrl}" 
          alt="${inmueble.tipo_vivienda}"
          style="width:100%; height:100%; object-fit:cover;">
      `;

  card.innerHTML = `
        <div style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; background: var(--gray-lighter);">
            ${mediaHTML}
        </div>
        <div>
            <h4 style="margin-bottom: 0.25rem; color: var(--dark-primary);">
              ${inmueble.tipo_vivienda}
            </h4>
            <p style="font-size: 0.9rem; color: var(--gray-medium); margin-bottom: 0.25rem;">
              ${inmueble.direccion}, ${inmueble.ciudad}
            </p>
            <span style="display: inline-block; padding: 0.25rem 0.75rem; background: ${
              inmueble.estado_nombre === "Disponible"
                ? "var(--green)"
                : "var(--gray-medium)"
            }; color: white; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">
                ${inmueble.estado_nombre}
            </span>
        </div>
        <div style="text-align: right;">
            <p style="font-size: 1.25rem; font-weight: 700; color: var(--gold-primary); font-family: var(--font-heading);">
                $${formatearPrecio(inmueble.precio)}
            </p>
            <p style="font-size: 0.8rem; color: var(--gray-medium);">
              ${inmueble.tipo_transaccion}
            </p>
        </div>
    `;

  // ▶ hover play / pause SOLO si es video
  if (esVideo) {
    const video = card.querySelector("video");

    card.addEventListener("mouseenter", () => {
      video.currentTime = 0;
      video.play();
    });

    card.addEventListener("mouseleave", () => {
      video.pause();
      video.currentTime = 0;
    });
  }

  card.addEventListener("mouseenter", () => {
    card.style.background = "var(--white)";
    card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
    card.style.transform = "translateX(5px)";
  });

  card.addEventListener("mouseleave", () => {
    card.style.background = "var(--white-soft)";
    card.style.boxShadow = "none";
    card.style.transform = "translateX(0)";
  });

  return card;
}


// ============================================
// CARGAR CLIENTES RECIENTES
// ============================================
async function cargarClientesRecientes() {
  const container = document.getElementById("recentClients");

  try {
    const response = await fetch(`${API_URL_DASHBOARD}/clientes?limit=5`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      container.innerHTML = "";

      data.data.forEach((cliente) => {
        const card = crearTarjetaCliente(cliente);
        container.appendChild(card);
      });
    } else {
      container.innerHTML = `
                <div class="empty-state" style="padding: 2rem;">
                    <p>No hay clientes registrados</p>
                </div>
            `;
    }
  } catch (error) {
    console.error("Error al cargar clientes:", error);
    container.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <p style="color: #ef4444;">Error al cargar clientes</p>
            </div>
        `;
  }
}

// ============================================
// CREAR TARJETA DE CLIENTE
// ============================================
function crearTarjetaCliente(cliente) {
  const card = document.createElement("div");
  card.style.cssText = `
        background: var(--white-soft);
        padding: 1rem;
        border-radius: 8px;
        display: grid;
        grid-template-columns: 60px 1fr auto;
        gap: 1rem;
        align-items: center;
        transition: all 0.3s ease;
        cursor: pointer;
    `;

  const iniciales = cliente.nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2);

  card.innerHTML = `
        <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; color: var(--dark-primary); font-weight: 700; font-size: 1.25rem;">
            ${iniciales}
        </div>
        <div>
            <h4 style="margin-bottom: 0.25rem; color: var(--dark-primary);">${
              cliente.nombre
            }</h4>
            <p style="font-size: 0.9rem; color: var(--gray-medium); margin-bottom: 0.25rem;">CC: ${
              cliente.cedula
            }</p>
            ${
              cliente.telefono
                ? `<p style="font-size: 0.85rem; color: var(--gray-medium);">📞 ${cliente.telefono}</p>`
                : ""
            }
        </div>
        <div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </div>
    `;

  card.addEventListener("mouseenter", () => {
    card.style.background = "var(--white)";
    card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
    card.style.transform = "translateX(5px)";
  });

  card.addEventListener("mouseleave", () => {
    card.style.background = "var(--white-soft)";
    card.style.boxShadow = "none";
    card.style.transform = "translateX(0)";
  });

  return card;
}

// ============================================
// FORMATEAR PRECIO
// ============================================
function formatearPrecio(precio) {
  return new Intl.NumberFormat("es-CO").format(precio);
}

// ============================================
// INICIALIZAR DASHBOARD
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  cargarEstadisticas();
  cargarInmueblesRecientes();
  cargarClientesRecientes();
});
