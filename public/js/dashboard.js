const API_URL_DASHBOARD = '/api';
const API_URL_AUTH = '/api/auth';
const API_URL_NOTIFICATIONS = '/api/notificaciones';

let usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

const userNameElement = document.getElementById('userName');
const userNameProfileElement = document.getElementById('userNameProfile');
const userRoleElement = document.getElementById('userRole');
const userAvatarElement = document.getElementById('userAvatar');
const currentDateElement = document.getElementById('currentDate');
const navItems = document.querySelectorAll('.nav-item[data-section]');
const sections = document.querySelectorAll('.content-section');
const sidebar = document.getElementById('sidebar');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const logoutBtn = document.getElementById('logoutBtn');
const logoutModal = document.getElementById('logoutModal');
const confirmLogout = document.getElementById('confirmLogout');
const cancelLogout = document.getElementById('cancelLogout');
const notificationWrapper = document.getElementById('notificationWrapper');
const notificationBtn = document.getElementById('notificationBtn');
const notificationBadge = document.getElementById('notificationBadge');
const notificationPanel = document.getElementById('notificationPanel');
const notificationList = document.getElementById('notificationList');
const notificationSubtitle = document.getElementById('notificationSubtitle');
const markNotificationsReadBtn = document.getElementById('markNotificationsRead');
let realtimeSocket = null;
let realtimeRefreshTimer = null;
let notifications = [];

function authFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
}

function actualizarDatosUsuario(usuarioActual) {
  if (!usuarioActual) {
    return;
  }

  usuario = usuarioActual;
  localStorage.setItem('usuario', JSON.stringify(usuarioActual));

  if (userNameElement) {
    userNameElement.textContent = usuarioActual.nombre;
  }

  if (userNameProfileElement) {
    userNameProfileElement.textContent = usuarioActual.nombre;
  }

  if (userRoleElement) {
    userRoleElement.textContent = usuarioActual.rol_nombre || 'Usuario';
  }

  if (userAvatarElement) {
    userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      usuarioActual.nombre
    )}&background=D4AF37&color=1a1a1a&bold=true`;
  }

  actualizarVisibilidadNotificaciones();
}

if (usuario) {
  actualizarDatosUsuario(usuario);
}

function esAdministrador(usuarioActual) {
  if (!usuarioActual) {
    return false;
  }

  const rolNombre = String(usuarioActual.rol_nombre || '').toLowerCase();
  return usuarioActual.rol_id === 1 || rolNombre.includes('admin');
}

function actualizarVisibilidadNotificaciones() {
  if (!notificationWrapper) {
    return;
  }

  if (esAdministrador(usuario)) {
    notificationWrapper.classList.remove('hidden');
  } else {
    notificationWrapper.classList.add('hidden');
  }
}

function formatearMomentoNotificacion(timestamp) {
  if (!timestamp) {
    return 'Ahora';
  }

  return new Date(timestamp).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actualizarBadgeNotificaciones() {
  if (!notificationBadge) {
    return;
  }

  const unread = notifications.filter((item) => !item.read).length;
  notificationBadge.textContent = String(unread);
  notificationBadge.classList.toggle('hidden', unread === 0);
}

function renderNotificaciones() {
  if (!notificationList || !notificationSubtitle) {
    return;
  }

  if (!notifications.length) {
    notificationSubtitle.textContent = 'Sin novedades';
    notificationList.innerHTML = '<div class="notification-empty">No hay notificaciones por ahora.</div>';
    actualizarBadgeNotificaciones();
    return;
  }

  const unread = notifications.filter((item) => !item.read).length;
  notificationSubtitle.textContent = unread
    ? `${unread} nueva(s) por revisar`
    : 'Todo al día';

  notificationList.innerHTML = notifications
    .map(
      (item) => `
        <div class="notification-item ${item.read ? '' : 'unread'}">
          <div class="notification-item-header">
            <span class="notification-item-title">${item.title || 'Actualización'}</span>
            <span class="notification-item-time">${formatearMomentoNotificacion(item.timestamp)}</span>
          </div>
          <div class="notification-item-message">${item.message || 'Hay una actualización reciente.'}</div>
        </div>
      `
    )
    .join('');

  actualizarBadgeNotificaciones();
}

function agregarNotificacion(payload) {
  notifications.unshift({
    ...payload,
    read: Boolean(payload.read),
  });

  notifications = notifications.slice(0, 25);
  renderNotificaciones();
}

async function cargarNotificaciones() {
  if (!esAdministrador(usuario)) {
    notifications = [];
    renderNotificaciones();
    return;
  }

  try {
    const response = await authFetch(`${API_URL_NOTIFICATIONS}?limit=25`);
    const data = await response.json();

    if (response.status === 403) {
      notifications = [];
      renderNotificaciones();
      return;
    }

    if (!data.success) {
      throw new Error(data.message || 'No se pudieron cargar las notificaciones');
    }

    notifications = data.data;
    renderNotificaciones();
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
  }
}

if (currentDateElement) {
  const now = new Date();
  currentDateElement.textContent = now.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

navItems.forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();

    navItems.forEach((nav) => nav.classList.remove('active'));
    sections.forEach((section) => section.classList.remove('active'));

    item.classList.add('active');
    const sectionId = item.getAttribute('data-section');
    document.getElementById(`section-${sectionId}`)?.classList.add('active');

    sidebar?.classList.remove('active');
  });
});

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', () => {
    sidebar?.classList.toggle('active');
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    logoutModal?.classList.add('active');
  });
}

cancelLogout?.addEventListener('click', () => {
  logoutModal?.classList.remove('active');
});

notificationBtn?.addEventListener('click', (event) => {
  event.stopPropagation();
  notificationPanel?.classList.toggle('hidden');
});

markNotificationsReadBtn?.addEventListener('click', () => {
  authFetch(`${API_URL_NOTIFICATIONS}/read-all`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.success) {
        throw new Error(data.message || 'No se pudieron marcar como leídas');
      }

      notifications = notifications.map((item) => ({
        ...item,
        read: true,
      }));
      renderNotificaciones();
    })
    .catch((error) => {
      console.error('Error al marcar notificaciones como leídas:', error);
    });
});

document.addEventListener('click', (event) => {
  if (!notificationWrapper?.contains(event.target)) {
    notificationPanel?.classList.add('hidden');
  }
});

function programarActualizacionTiempoReal(payload = {}) {
  if (realtimeRefreshTimer) {
    clearTimeout(realtimeRefreshTimer);
  }

  realtimeRefreshTimer = setTimeout(() => {
    cargarEstadisticas();
    cargarInmueblesRecientes();
    window.dispatchEvent(
      new CustomEvent('realtime:inmueble-changed', {
        detail: payload,
      })
    );
  }, 250);
}

function inicializarTiempoReal() {
  if (!window.io || realtimeSocket || !esAdministrador(usuario)) {
    return;
  }

  realtimeSocket = window.io({
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  realtimeSocket.on('inmueble:changed', (payload) => {
    programarActualizacionTiempoReal(payload);
  });

  realtimeSocket.on('dashboard:notification', (payload) => {
    agregarNotificacion(payload);

    if (payload?.type === 'cliente') {
      cargarClientesRecientes();
      window.dispatchEvent(
        new CustomEvent('realtime:cliente-changed', {
          detail: payload,
        })
      );
    }

    if (payload?.type === 'usuario') {
      window.dispatchEvent(
        new CustomEvent('realtime:usuario-changed', {
          detail: payload,
        })
      );
    }

    if (payload?.action === 'transaction_registered') {
      window.dispatchEvent(
        new CustomEvent('realtime:transaccion-changed', {
          detail: payload,
        })
      );
    }
  });

  realtimeSocket.on('connect_error', (error) => {
    console.error('Error de conexion en tiempo real:', error.message);
  });
}

confirmLogout?.addEventListener('click', async () => {
  try {
    await authFetch(`${API_URL_AUTH}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error al cerrar sesion:', error);
  } finally {
    localStorage.removeItem('usuario');
    window.location.href = '/login.html';
  }
});

async function verificarSesion() {
  try {
    const response = await authFetch(`${API_URL_AUTH}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      localStorage.removeItem('usuario');
      window.location.href = '/login.html';
      return false;
    }

    actualizarDatosUsuario(data.data.usuario);
    return true;
  } catch (error) {
    console.error('Error al verificar sesion:', error);
    localStorage.removeItem('usuario');
    window.location.href = '/login.html';
    return false;
  }
}

async function cargarEstadisticas() {
  try {
    const inmueblesRes = await authFetch(`${API_URL_DASHBOARD}/inmuebles`);
    const inmueblesData = await inmueblesRes.json();

    if (inmueblesData.success) {
      document.getElementById('totalInmuebles').textContent =
        inmueblesData.pagination.total;

      const disponibles = inmueblesData.data.filter(
        (item) => item.estado_nombre === 'Disponible'
      ).length;
      document.getElementById('inmueblesDisponibles').textContent = disponibles;
    }

    const clientesRes = await authFetch(`${API_URL_DASHBOARD}/clientes`);
    const clientesData = await clientesRes.json();

    if (clientesRes.status === 403) {
      document.getElementById('totalClientes').textContent = 'Restringido';
    } else if (clientesData.success) {
      document.getElementById('totalClientes').textContent =
        clientesData.pagination.total;
    }

    const transaccionesRes = await authFetch(`${API_URL_DASHBOARD}/transacciones?limit=100`);
    const transaccionesData = await transaccionesRes.json();

    if (transaccionesRes.status === 403) {
      document.getElementById('transaccionesMes').textContent = 'Restringido';
    } else if (transaccionesData.success) {
      const now = new Date();
      const transaccionesDelMes = transaccionesData.data.filter((item) => {
        if (!item.fecha_transaccion) {
          return false;
        }

        const fecha = new Date(item.fecha_transaccion);
        return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear();
      }).length;

      document.getElementById('transaccionesMes').textContent = String(transaccionesDelMes);
    }
  } catch (error) {
    console.error('Error al cargar estadisticas:', error);
  }
}

async function cargarInmueblesRecientes() {
  const container = document.getElementById('recentProperties');
  if (!container) {
    return;
  }

  try {
    const response = await authFetch(`${API_URL_DASHBOARD}/inmuebles?limit=5`);
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      container.innerHTML = '';
      data.data.forEach((inmueble) => {
        container.appendChild(crearTarjetaInmueble(inmueble));
      });
      return;
    }

    container.innerHTML = `
      <div class="empty-state" style="padding: 2rem;">
        <p>No hay inmuebles registrados</p>
      </div>
    `;
  } catch (error) {
    console.error('Error al cargar inmuebles:', error);
    container.innerHTML = `
      <div class="empty-state" style="padding: 2rem;">
        <p style="color: #ef4444;">Error al cargar inmuebles</p>
      </div>
    `;
  }
}

function crearTarjetaInmueble(inmueble) {
  const card = document.createElement('div');
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

  const mediaUrl = inmueble.imagen_principal || '/images/placeholder.jpg';
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
        inmueble.estado_nombre === 'Disponible' ? 'var(--green)' : 'var(--gray-medium)'
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

  if (esVideo) {
    const video = card.querySelector('video');
    card.addEventListener('mouseenter', () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    });
    card.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
  }

  card.addEventListener('mouseenter', () => {
    card.style.background = 'var(--white)';
    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    card.style.transform = 'translateX(5px)';
  });

  card.addEventListener('mouseleave', () => {
    card.style.background = 'var(--white-soft)';
    card.style.boxShadow = 'none';
    card.style.transform = 'translateX(0)';
  });

  return card;
}

async function cargarClientesRecientes() {
  const container = document.getElementById('recentClients');
  if (!container) {
    return;
  }

  try {
    const response = await authFetch(`${API_URL_DASHBOARD}/clientes?limit=5`);
    const data = await response.json();

    if (response.status === 403) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 2rem;">
          <p>Disponible solo para administradores</p>
        </div>
      `;
      return;
    }

    if (data.success && data.data.length > 0) {
      container.innerHTML = '';
      data.data.forEach((cliente) => {
        container.appendChild(crearTarjetaCliente(cliente));
      });
      return;
    }

    container.innerHTML = `
      <div class="empty-state" style="padding: 2rem;">
        <p>No hay clientes registrados</p>
      </div>
    `;
  } catch (error) {
    console.error('Error al cargar clientes:', error);
    container.innerHTML = `
      <div class="empty-state" style="padding: 2rem;">
        <p style="color: #ef4444;">Error al cargar clientes</p>
      </div>
    `;
  }
}

function crearTarjetaCliente(cliente) {
  const card = document.createElement('div');
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
    .split(' ')
    .map((nombre) => nombre[0])
    .join('')
    .substring(0, 2);

  card.innerHTML = `
    <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--gold-gradient); display: flex; align-items: center; justify-content: center; color: var(--dark-primary); font-weight: 700; font-size: 1.25rem;">
      ${iniciales}
    </div>
    <div>
      <h4 style="margin-bottom: 0.25rem; color: var(--dark-primary);">${cliente.nombre}</h4>
      <p style="font-size: 0.9rem; color: var(--gray-medium); margin-bottom: 0.25rem;">CC: ${cliente.cedula}</p>
      ${
        cliente.telefono
          ? `<p style="font-size: 0.85rem; color: var(--gray-medium);">Telefono: ${cliente.telefono}</p>`
          : ''
      }
    </div>
    <div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </div>
  `;

  card.addEventListener('mouseenter', () => {
    card.style.background = 'var(--white)';
    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    card.style.transform = 'translateX(5px)';
  });

  card.addEventListener('mouseleave', () => {
    card.style.background = 'var(--white-soft)';
    card.style.boxShadow = 'none';
    card.style.transform = 'translateX(0)';
  });

  return card;
}

function formatearPrecio(precio) {
  return new Intl.NumberFormat('es-CO').format(precio);
}

function formatearFecha(fecha) {
  if (!fecha) {
    return '-';
  }

  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const sesionValida = await verificarSesion();
  if (!sesionValida) {
    return;
  }

  renderNotificaciones();
  await cargarNotificaciones();
  inicializarTiempoReal();
  cargarEstadisticas();
  cargarInmueblesRecientes();
  cargarClientesRecientes();
});








