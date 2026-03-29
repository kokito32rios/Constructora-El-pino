const USUARIOS_API_URL = 'http://localhost:3000/api/usuarios';
const CATALOGOS_USUARIOS_API_URL = 'http://localhost:3000/api/catalogos/all';

function authFetchUsuarios(url, options = {}) {
    if (typeof authFetch === 'function') {
        return authFetch(url, options);
    }

    return fetch(url, {
        ...options,
        credentials: 'same-origin'
    });
}

const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
const searchUsuarios = document.getElementById('searchUsuarios');
const filterRolUsuario = document.getElementById('filterRolUsuario');
const filterEstadoUsuario = document.getElementById('filterEstadoUsuario');
const usuariosTableBody = document.getElementById('usuariosTableBody');
const paginationUsuarios = document.getElementById('paginationUsuarios');
const modalUsuario = document.getElementById('modalUsuario');
const closeModalUsuario = document.getElementById('closeModalUsuario');
const btnCancelarUsuario = document.getElementById('btnCancelarUsuario');
const formUsuario = document.getElementById('formUsuario');
const modalUsuarioTitle = document.getElementById('modalUsuarioTitle');
const usuarioMode = document.getElementById('usuarioMode');
const usuarioCedula = document.getElementById('usuarioCedula');
const usuarioNombre = document.getElementById('usuarioNombre');
const usuarioEmail = document.getElementById('usuarioEmail');
const usuarioRolId = document.getElementById('usuarioRolId');
const usuarioActivo = document.getElementById('usuarioActivo');
const usuarioPassword = document.getElementById('usuarioPassword');
const usuarioPasswordHint = document.getElementById('usuarioPasswordHint');
const usuarioPasswordHelp = document.getElementById('usuarioPasswordHelp');
const usuarioFormError = document.getElementById('usuarioFormError');
const btnGuardarUsuario = document.getElementById('btnGuardarUsuario');
const modalUsuarioInmuebles = document.getElementById('modalUsuarioInmuebles');
const closeModalUsuarioInmuebles = document.getElementById('closeModalUsuarioInmuebles');
const usuarioInmueblesTitle = document.getElementById('usuarioInmueblesTitle');
const usuarioInmueblesBody = document.getElementById('usuarioInmueblesBody');

let usuariosData = [];
let rolesData = [];
let paginaUsuariosActual = 1;
const usuariosPorPagina = 10;
let busquedaUsuariosTimer = null;

function mostrarErrorFormularioUsuario(message) {
    if (!usuarioFormError) {
        return;
    }

    usuarioFormError.textContent = message;
    usuarioFormError.classList.remove('hidden');
}

function limpiarErrorFormularioUsuario() {
    if (!usuarioFormError) {
        return;
    }

    usuarioFormError.textContent = '';
    usuarioFormError.classList.add('hidden');
}

function showUserAlert(message, type = 'info') {
    if (type === 'error') {
        mostrarErrorFormularioUsuario(message);
        return;
    }

    if (typeof showAlert === 'function') {
        showAlert(message, type);
        return;
    }

    window.alert(message);
}

function showUserSuccess(message) {
    if (typeof showSuccessModal === 'function') {
        showSuccessModal(message);
        return;
    }

    window.alert(message);
}

function openUserModal(modal) {
    if (typeof openModal === 'function') {
        openModal(modal);
        return;
    }

    modal?.classList.add('active');
}

function closeUserModal(modal) {
    if (typeof closeModal === 'function') {
        closeModal(modal);
        return;
    }

    modal?.classList.remove('active');
}

function formatearFechaUsuario(fecha) {
    if (!fecha) {
        return '-';
    }

    return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatearMonedaUsuario(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return '-';
    }

    return `$${new Intl.NumberFormat('es-CO').format(Number(valor))}`;
}

function obtenerPrimerError(data, fallback) {
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
        return data.errors[0].msg || fallback;
    }

    return data?.message || fallback;
}

function actualizarUIConRoles() {
    if (!filterRolUsuario || !usuarioRolId) {
        return;
    }

    const options = rolesData.map((rol) => `<option value="${rol.id}">${rol.nombre}</option>`).join('');
    filterRolUsuario.innerHTML = `<option value="">Todos</option>${options}`;
    usuarioRolId.innerHTML = `<option value="">Selecciona un rol</option>${options}`;
}

async function cargarRolesUsuarios() {
    try {
        const response = await authFetchUsuarios(CATALOGOS_USUARIOS_API_URL);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'No se pudieron cargar los roles');
        }

        rolesData = Array.isArray(data.data?.roles) ? data.data.roles : [];
        actualizarUIConRoles();
    } catch (error) {
        console.error('Error al cargar roles:', error);
    }
}

function obtenerUsuariosFiltrados() {
    const termino = (searchUsuarios?.value || '').trim().toLowerCase();
    const rol = filterRolUsuario?.value || '';
    const estado = filterEstadoUsuario?.value || '';

    return usuariosData.filter((usuario) => {
        const coincideBusqueda = !termino || [usuario.cedula, usuario.nombre, usuario.email]
            .filter(Boolean)
            .some((valor) => String(valor).toLowerCase().includes(termino));

        const coincideRol = !rol || String(usuario.rol_id) === String(rol);
        const coincideEstado = estado === '' || String(Number(Boolean(usuario.activo))) === String(estado);

        return coincideBusqueda && coincideRol && coincideEstado;
    });
}

function renderPaginacionUsuarios(totalItems) {
    if (!paginationUsuarios) {
        return;
    }

    paginationUsuarios.innerHTML = '';

    const totalPages = Math.ceil(totalItems / usuariosPorPagina);
    if (totalPages <= 1) {
        return;
    }

    const btnPrev = document.createElement('button');
    btnPrev.textContent = 'Anterior';
    btnPrev.disabled = paginaUsuariosActual === 1;
    btnPrev.addEventListener('click', () => {
        paginaUsuariosActual -= 1;
        renderUsuarios();
    });
    paginationUsuarios.appendChild(btnPrev);

    for (let i = 1; i <= totalPages; i += 1) {
        const button = document.createElement('button');
        button.textContent = String(i);
        if (i === paginaUsuariosActual) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            paginaUsuariosActual = i;
            renderUsuarios();
        });
        paginationUsuarios.appendChild(button);
    }

    const btnNext = document.createElement('button');
    btnNext.textContent = 'Siguiente';
    btnNext.disabled = paginaUsuariosActual === totalPages;
    btnNext.addEventListener('click', () => {
        paginaUsuariosActual += 1;
        renderUsuarios();
    });
    paginationUsuarios.appendChild(btnNext);
}

function renderUsuarios() {
    if (!usuariosTableBody) {
        return;
    }

    const usuariosFiltrados = obtenerUsuariosFiltrados();
    const totalPages = Math.max(1, Math.ceil(usuariosFiltrados.length / usuariosPorPagina));

    if (paginaUsuariosActual > totalPages) {
        paginaUsuariosActual = 1;
    }

    if (!usuariosFiltrados.length) {
        usuariosTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No se encontraron usuarios</td>
            </tr>
        `;
        renderPaginacionUsuarios(0);
        return;
    }

    const start = (paginaUsuariosActual - 1) * usuariosPorPagina;
    const usuariosPagina = usuariosFiltrados.slice(start, start + usuariosPorPagina);

    usuariosTableBody.innerHTML = usuariosPagina.map((usuario) => `
        <tr>
            <td>${usuario.cedula}</td>
            <td>${usuario.nombre}</td>
            <td>${usuario.email}</td>
            <td>${usuario.rol_nombre || 'Sin rol'}</td>
            <td>
                <span class="table-badge ${usuario.activo ? 'badge-disponible' : 'badge-vendido'}">
                    ${usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>${formatearFechaUsuario(usuario.created_at)}</td>
            <td>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <button class="btn btn-primary editar-usuario-btn" data-cedula="${usuario.cedula}">Editar</button>
                    <button class="btn btn-secondary inmuebles-usuario-btn" data-cedula="${usuario.cedula}" data-nombre="${usuario.nombre.replace(/"/g, '&quot;')}">Inmuebles</button>
                    <button class="btn ${usuario.activo ? 'btn-danger' : 'btn-secondary'} toggle-usuario-btn" data-cedula="${usuario.cedula}" data-activo="${usuario.activo ? '1' : '0'}">
                        ${usuario.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button class="btn btn-danger eliminar-usuario-btn" data-cedula="${usuario.cedula}" data-nombre="${usuario.nombre.replace(/"/g, '&quot;')}">
                        Eliminar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.editar-usuario-btn').forEach((button) => {
        button.addEventListener('click', () => editarUsuario(button.dataset.cedula));
    });

    document.querySelectorAll('.inmuebles-usuario-btn').forEach((button) => {
        button.addEventListener('click', () => verInmueblesUsuario(button.dataset.cedula, button.dataset.nombre));
    });

    document.querySelectorAll('.toggle-usuario-btn').forEach((button) => {
        button.addEventListener('click', () => toggleEstadoUsuario(button.dataset.cedula, button.dataset.activo === '1'));
    });

    document.querySelectorAll('.eliminar-usuario-btn').forEach((button) => {
        button.addEventListener('click', () => eliminarUsuario(button.dataset.cedula, button.dataset.nombre));
    });

    renderPaginacionUsuarios(usuariosFiltrados.length);
}

async function cargarUsuarios() {
    if (!usuariosTableBody) {
        return;
    }

    try {
        const response = await authFetchUsuarios(`${USUARIOS_API_URL}?page=1&limit=500`);
        const data = await response.json();

        if (response.status === 403) {
            usuariosTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">Disponible solo para administradores</td>
                </tr>
            `;
            paginationUsuarios.innerHTML = '';
            return;
        }

        if (!data.success) {
            throw new Error(data.message || 'No se pudieron cargar los usuarios');
        }

        usuariosData = Array.isArray(data.data) ? data.data : [];
        renderUsuarios();
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        usuariosTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="color:#ef4444;">Error al cargar usuarios</td>
            </tr>
        `;
    }
}

function resetFormularioUsuario() {
    formUsuario?.reset();
    limpiarErrorFormularioUsuario();
    if (usuarioMode) {
        usuarioMode.value = 'create';
    }
    if (modalUsuarioTitle) {
        modalUsuarioTitle.textContent = 'Nuevo Usuario';
    }
    if (usuarioCedula) {
        usuarioCedula.disabled = false;
        usuarioCedula.value = '';
    }
    if (usuarioPassword) {
        usuarioPassword.required = true;
        usuarioPassword.value = '';
    }
    if (usuarioPasswordHint) {
        usuarioPasswordHint.textContent = '*';
    }
    if (usuarioPasswordHelp) {
        usuarioPasswordHelp.textContent = 'La contrase�a debe tener al menos 6 caracteres.';
    }
    if (btnGuardarUsuario) {
        btnGuardarUsuario.querySelector('.btn-text').textContent = 'Guardar Usuario';
    }
    usuarioActivo.value = '1';
}

function abrirNuevoUsuario() {
    resetFormularioUsuario();
    openUserModal(modalUsuario);
}

async function editarUsuario(cedula) {
    limpiarErrorFormularioUsuario();
    try {
        const response = await authFetchUsuarios(`${USUARIOS_API_URL}/${cedula}`);
        const data = await response.json();

        if (!data.success) {
            showUserAlert(data.message || 'No se pudo cargar el usuario', 'error');
            return;
        }

        resetFormularioUsuario();
        usuarioMode.value = 'edit';
        modalUsuarioTitle.textContent = 'Editar Usuario';
        usuarioCedula.value = data.data.cedula || '';
        usuarioCedula.disabled = true;
        usuarioNombre.value = data.data.nombre || '';
        usuarioEmail.value = data.data.email || '';
        usuarioRolId.value = data.data.rol_id || '';
        usuarioActivo.value = data.data.activo ? '1' : '0';
        usuarioPassword.required = false;
        usuarioPassword.value = '';
        usuarioPasswordHint.textContent = '(opcional)';
        usuarioPasswordHelp.textContent = 'D�jala vac�a si no deseas cambiar la contrase�a.';
        btnGuardarUsuario.querySelector('.btn-text').textContent = 'Guardar Cambios';
        openUserModal(modalUsuario);
    } catch (error) {
        console.error('Error al cargar usuario:', error);
        showUserAlert('Error al cargar usuario', 'error');
    }
}

async function toggleEstadoUsuario(cedula, activoActual) {
    const accion = activoActual ? 'desactivar' : 'activar';
    const confirmar = window.confirm(`�Deseas ${accion} este usuario?`);
    if (!confirmar) {
        return;
    }

    try {
        const response = await authFetchUsuarios(`${USUARIOS_API_URL}/${cedula}/toggle-activo`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();

        if (!data.success) {
            showUserAlert(data.message || `No se pudo ${accion} el usuario`, 'error');
            return;
        }

        showUserSuccess(`Usuario ${activoActual ? 'desactivado' : 'activado'} exitosamente`);
        await cargarUsuarios();
    } catch (error) {
        console.error(`Error al ${accion} usuario:`, error);
        showUserAlert(`Error al ${accion} usuario`, 'error');
    }
}

async function eliminarUsuario(cedula, nombre) {
    const confirmar = window.confirm(`¿Deseas eliminar el usuario ${nombre}? Esta acción lo dejará inactivo.`);
    if (!confirmar) {
        return;
    }

    try {
        const response = await authFetchUsuarios(`${USUARIOS_API_URL}/${cedula}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!data.success) {
            showUserAlert(data.message || 'No se pudo eliminar el usuario', 'error');
            return;
        }

        showUserSuccess('Usuario eliminado exitosamente');
        await cargarUsuarios();
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        showUserAlert('Error al eliminar usuario', 'error');
    }
}

async function verInmueblesUsuario(cedula, nombre) {
    if (usuarioInmueblesTitle) {
        usuarioInmueblesTitle.textContent = `Inmuebles de ${nombre}`;
    }

    usuarioInmueblesBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">Cargando inmuebles...</td>
        </tr>
    `;

    openUserModal(modalUsuarioInmuebles);

    try {
        const response = await authFetchUsuarios(`${USUARIOS_API_URL}/${cedula}/inmuebles`);
        const data = await response.json();

        if (!data.success || !Array.isArray(data.data) || !data.data.length) {
            usuarioInmueblesBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">Este usuario no ha registrado inmuebles</td>
                </tr>
            `;
            return;
        }

        usuarioInmueblesBody.innerHTML = data.data.map((item) => `
            <tr>
                <td>${item.tipo_vivienda || '-'}</td>
                <td>${item.direccion || '-'}</td>
                <td>${item.ciudad || '-'}</td>
                <td>${item.tipo_transaccion || '-'}</td>
                <td>${item.estado || '-'}</td>
                <td>${formatearMonedaUsuario(item.precio)}</td>
                <td>${formatearFechaUsuario(item.created_at)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar inmuebles del usuario:', error);
        usuarioInmueblesBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="color:#ef4444;">Error al cargar inmuebles</td>
            </tr>
        `;
    }
}

btnNuevoUsuario?.addEventListener('click', abrirNuevoUsuario);
closeModalUsuario?.addEventListener('click', () => closeUserModal(modalUsuario));
btnCancelarUsuario?.addEventListener('click', () => closeUserModal(modalUsuario));
closeModalUsuarioInmuebles?.addEventListener('click', () => closeUserModal(modalUsuarioInmuebles));

searchUsuarios?.addEventListener('input', () => {
    if (busquedaUsuariosTimer) {
        clearTimeout(busquedaUsuariosTimer);
    }

    busquedaUsuariosTimer = setTimeout(() => {
        paginaUsuariosActual = 1;
        renderUsuarios();
    }, 250);
});

filterRolUsuario?.addEventListener('change', () => {
    paginaUsuariosActual = 1;
    renderUsuarios();
});

filterEstadoUsuario?.addEventListener('change', () => {
    paginaUsuariosActual = 1;
    renderUsuarios();
});

formUsuario?.addEventListener('submit', async (event) => {
    event.preventDefault();
    limpiarErrorFormularioUsuario();

    const modo = usuarioMode?.value || 'create';
    const cedula = usuarioCedula?.value.trim();
    const payload = {
        nombre: usuarioNombre?.value.trim(),
        email: usuarioEmail?.value.trim(),
        rol_id: Number(usuarioRolId?.value),
        activo: usuarioActivo?.value === '1'
    };

    if (modo === 'create') {
        payload.cedula = cedula;
        payload.password = usuarioPassword?.value || '';
    } else if (usuarioPassword?.value.trim()) {
        payload.password = usuarioPassword.value.trim();
    }

    try {
        const response = await authFetchUsuarios(
            modo === 'create' ? USUARIOS_API_URL : `${USUARIOS_API_URL}/${cedula}`,
            {
                method: modo === 'create' ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!data.success) {
            showUserAlert(obtenerPrimerError(data, 'No se pudo guardar el usuario'), 'error');
            return;
        }

        closeUserModal(modalUsuario);
        showUserSuccess(modo === 'create' ? 'Usuario creado exitosamente' : 'Usuario actualizado exitosamente');
        await cargarUsuarios();
    } catch (error) {
        console.error('Error al guardar usuario:', error);
        showUserAlert('Error al guardar usuario', 'error');
    }
});

window.addEventListener('realtime:usuario-changed', () => {
    cargarUsuarios();
});

document.addEventListener('DOMContentLoaded', async () => {
    if (!usuariosTableBody) {
        return;
    }

    await cargarRolesUsuarios();
    await cargarUsuarios();
});



