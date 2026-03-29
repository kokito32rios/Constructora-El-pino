const CLIENTES_API_URL = 'http://localhost:3000/api/clientes';

function authFetchClientes(url, options = {}) {
    if (typeof authFetch === 'function') {
        return authFetch(url, options);
    }

    return fetch(url, {
        ...options,
        credentials: 'same-origin'
    });
}

const btnNuevoCliente = document.getElementById('btnNuevoCliente');
const btnBuscarClientes = document.getElementById('btnBuscarClientes');
const searchClientes = document.getElementById('searchClientes');
const clientesTableBody = document.getElementById('clientesTableBody');
const paginationClientes = document.getElementById('paginationClientes');
const modalCliente = document.getElementById('modalCliente');
const closeModalCliente = document.getElementById('closeModalCliente');
const btnCancelarCliente = document.getElementById('btnCancelarCliente');
const formCliente = document.getElementById('formCliente');
const btnGuardarCliente = document.getElementById('btnGuardarCliente');
const modalClienteTitle = document.getElementById('modalClienteTitle');
const confirmDeleteClienteModal = document.getElementById('confirmDeleteClienteModal');
const confirmDeleteClienteBtn = document.getElementById('confirmDeleteClienteBtn');
const cancelDeleteCliente = document.getElementById('cancelDeleteCliente');
const confirmDeleteClienteMessage = document.getElementById('confirmDeleteClienteMessage');
const modalClienteTransacciones = document.getElementById('modalClienteTransacciones');
const closeModalClienteTransacciones = document.getElementById('closeModalClienteTransacciones');
const clienteTransaccionesTitle = document.getElementById('clienteTransaccionesTitle');
const clienteTransaccionesBody = document.getElementById('clienteTransaccionesBody');

let paginaClientesActual = 1;
const clientesPorPagina = 10;
let clienteIdToDelete = null;
let busquedaClientesTimer = null;

function showClientAlert(message, type = 'info') {
    if (typeof showAlert === 'function') {
        showAlert(message, type);
        return;
    }

    window.alert(message);
}

function showClientSuccess(message) {
    if (typeof showSuccessModal === 'function') {
        showSuccessModal(message);
        return;
    }

    window.alert(message);
}

function openClientModal(modal) {
    if (typeof openModal === 'function') {
        openModal(modal);
        return;
    }

    modal?.classList.add('active');
}

function closeClientModal(modal) {
    if (typeof closeModal === 'function') {
        closeModal(modal);
        return;
    }

    modal?.classList.remove('active');
}

function formatearFechaCliente(fecha) {
    if (!fecha) {
        return '-';
    }

    return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatearMonedaCliente(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return '-';
    }

    return `$${new Intl.NumberFormat('es-CO').format(Number(valor))}`;
}

function renderClientes(clientes) {
    if (!clientesTableBody) {
        return;
    }

    if (!clientes.length) {
        clientesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No se encontraron clientes</td>
            </tr>
        `;
        return;
    }

    clientesTableBody.innerHTML = clientes.map((cliente) => `
        <tr>
            <td>${cliente.cedula}</td>
            <td>${cliente.nombre}</td>
            <td>${cliente.telefono || '-'}</td>
            <td>${cliente.email || '-'}</td>
            <td>${cliente.direccion || '-'}</td>
            <td>
                <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary editar-cliente-btn" data-id="${cliente.id}">Editar</button>
                    <button class="btn btn-sm btn-secondary transacciones-cliente-btn" data-id="${cliente.id}" data-nombre="${cliente.nombre.replace(/"/g, '&quot;')}">Transacciones</button>
                    <button class="btn btn-sm btn-danger eliminar-cliente-btn" data-id="${cliente.id}" data-nombre="${cliente.nombre.replace(/"/g, '&quot;')}">Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.editar-cliente-btn').forEach((button) => {
        button.addEventListener('click', () => editarCliente(button.dataset.id));
    });

    document.querySelectorAll('.transacciones-cliente-btn').forEach((button) => {
        button.addEventListener('click', () => verTransaccionesCliente(button.dataset.id, button.dataset.nombre));
    });

    document.querySelectorAll('.eliminar-cliente-btn').forEach((button) => {
        button.addEventListener('click', () => confirmarEliminarCliente(button.dataset.id, button.dataset.nombre));
    });
}

function renderPaginacionClientes(pagination) {
    if (!paginationClientes) {
        return;
    }

    paginationClientes.innerHTML = '';

    if (!pagination || pagination.totalPages <= 1) {
        return;
    }

    const { page, totalPages } = pagination;

    const btnPrev = document.createElement('button');
    btnPrev.textContent = 'Anterior';
    btnPrev.disabled = page === 1;
    btnPrev.addEventListener('click', () => cargarClientes(page - 1));
    paginationClientes.appendChild(btnPrev);

    for (let i = 1; i <= totalPages; i += 1) {
        const button = document.createElement('button');
        button.textContent = String(i);
        if (i === page) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => cargarClientes(i));
        paginationClientes.appendChild(button);
    }

    const btnNext = document.createElement('button');
    btnNext.textContent = 'Siguiente';
    btnNext.disabled = page === totalPages;
    btnNext.addEventListener('click', () => cargarClientes(page + 1));
    paginationClientes.appendChild(btnNext);
}

async function cargarClientes(page = 1) {
    if (!clientesTableBody) {
        return;
    }

    try {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(clientesPorPagina)
        });

        if (searchClientes?.value.trim()) {
            params.append('search', searchClientes.value.trim());
        }

        const response = await authFetchClientes(`${CLIENTES_API_URL}?${params.toString()}`);
        const data = await response.json();

        if (response.status === 403) {
            clientesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Disponible solo para administradores</td>
                </tr>
            `;
            paginationClientes.innerHTML = '';
            return;
        }

        if (!data.success) {
            throw new Error(data.message || 'No se pudieron cargar los clientes');
        }

        paginaClientesActual = page;
        renderClientes(data.data);
        renderPaginacionClientes(data.pagination);
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        clientesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color:#ef4444;">Error al cargar clientes</td>
            </tr>
        `;
    }
}

function limpiarFormularioCliente() {
    formCliente?.reset();
    const clienteId = document.getElementById('clienteId');
    if (clienteId) {
        clienteId.value = '';
    }
}

function abrirNuevoCliente() {
    limpiarFormularioCliente();
    if (modalClienteTitle) {
        modalClienteTitle.textContent = 'Nuevo Cliente';
    }
    openClientModal(modalCliente);
}

async function editarCliente(id) {
    try {
        const response = await authFetchClientes(`${CLIENTES_API_URL}/${id}`);
        const data = await response.json();

        if (!data.success) {
            showClientAlert(data.message || 'Cliente no encontrado', 'error');
            return;
        }

        if (modalClienteTitle) {
            modalClienteTitle.textContent = 'Editar Cliente';
        }

        document.getElementById('clienteId').value = data.data.id || '';
        document.getElementById('clienteCedula').value = data.data.cedula || '';
        document.getElementById('clienteNombre').value = data.data.nombre || '';
        document.getElementById('clienteTelefono').value = data.data.telefono || '';
        document.getElementById('clienteEmail').value = data.data.email || '';
        document.getElementById('clienteDireccion').value = data.data.direccion || '';
        document.getElementById('clienteNotas').value = data.data.notas || '';

        openClientModal(modalCliente);
    } catch (error) {
        console.error('Error al cargar cliente:', error);
        showClientAlert('Error al cargar cliente', 'error');
    }
}

function confirmarEliminarCliente(id, nombre) {
    clienteIdToDelete = id;
    if (confirmDeleteClienteMessage) {
        confirmDeleteClienteMessage.textContent = `¿Seguro que deseas eliminar el cliente ${nombre}?`;
    }
    confirmDeleteClienteModal?.classList.add('active');
}

async function eliminarClienteConfirmado() {
    if (!clienteIdToDelete) {
        return;
    }

    try {
        const response = await authFetchClientes(`${CLIENTES_API_URL}/${clienteIdToDelete}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (!data.success) {
            showClientAlert(data.message || 'Error al eliminar cliente', 'error');
            return;
        }

        showClientSuccess('Cliente eliminado exitosamente');
        confirmDeleteClienteModal?.classList.remove('active');
        clienteIdToDelete = null;
        cargarClientes(paginaClientesActual);
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        showClientAlert('Error al eliminar cliente', 'error');
    }
}

async function verTransaccionesCliente(id, nombre) {
    if (clienteTransaccionesTitle) {
        clienteTransaccionesTitle.textContent = `Historial de ${nombre}`;
    }

    if (clienteTransaccionesBody) {
        clienteTransaccionesBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Cargando transacciones...</td>
            </tr>
        `;
    }

    openClientModal(modalClienteTransacciones);

    try {
        const response = await authFetchClientes(`${CLIENTES_API_URL}/${id}/transacciones`);
        const data = await response.json();

        if (!data.success || !Array.isArray(data.data) || !data.data.length) {
            clienteTransaccionesBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Este cliente no tiene transacciones registradas</td>
                </tr>
            `;
            return;
        }

        clienteTransaccionesBody.innerHTML = data.data.map((item) => `
            <tr>
                <td>${item.tipo_vivienda} - ${item.direccion}</td>
                <td>${item.ciudad || '-'}</td>
                <td>${item.tipo_transaccion || '-'}</td>
                <td>${item.estado || '-'}</td>
                <td>${formatearFechaCliente(item.fecha_transaccion)}</td>
                <td>${formatearMonedaCliente(item.valor_transaccion || item.precio)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar transacciones del cliente:', error);
        clienteTransaccionesBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color:#ef4444;">Error al cargar transacciones</td>
            </tr>
        `;
    }
}

if (btnNuevoCliente) {
    btnNuevoCliente.addEventListener('click', abrirNuevoCliente);
}

searchClientes?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        cargarClientes(1);
    }
});

searchClientes?.addEventListener('input', () => {
    if (busquedaClientesTimer) {
        clearTimeout(busquedaClientesTimer);
    }

    busquedaClientesTimer = setTimeout(() => {
        cargarClientes(1);
    }, 250);
});

closeModalCliente?.addEventListener('click', () => closeClientModal(modalCliente));
btnCancelarCliente?.addEventListener('click', () => closeClientModal(modalCliente));
modalCliente?.addEventListener('click', (event) => {
    if (event.target === modalCliente) {
        closeClientModal(modalCliente);
    }
});

closeModalClienteTransacciones?.addEventListener('click', () => closeClientModal(modalClienteTransacciones));
modalClienteTransacciones?.addEventListener('click', (event) => {
    if (event.target === modalClienteTransacciones) {
        closeClientModal(modalClienteTransacciones);
    }
});

cancelDeleteCliente?.addEventListener('click', () => {
    clienteIdToDelete = null;
    confirmDeleteClienteModal?.classList.remove('active');
});

confirmDeleteClienteModal?.addEventListener('click', (event) => {
    if (event.target === confirmDeleteClienteModal) {
        clienteIdToDelete = null;
        confirmDeleteClienteModal.classList.remove('active');
    }
});

confirmDeleteClienteBtn?.addEventListener('click', eliminarClienteConfirmado);

formCliente?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const btnText = btnGuardarCliente?.querySelector('.btn-text');
    const btnLoader = btnGuardarCliente?.querySelector('.btn-loader');

    if (btnGuardarCliente) {
        btnGuardarCliente.disabled = true;
    }
    if (btnText) {
        btnText.style.display = 'none';
    }
    if (btnLoader) {
        btnLoader.style.display = 'inline-flex';
    }

    try {
        const formData = new FormData(formCliente);
        const clienteData = {};

        for (const [key, value] of formData.entries()) {
            if (key !== 'id') {
                clienteData[key] = typeof value === 'string' ? value.trim() : value;
            }
        }

        const clienteId = document.getElementById('clienteId').value;
        const url = clienteId ? `${CLIENTES_API_URL}/${clienteId}` : CLIENTES_API_URL;
        const method = clienteId ? 'PUT' : 'POST';

        const response = await authFetchClientes(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteData)
        });

        const data = await response.json();

        if (!data.success) {
            const validationMessage = Array.isArray(data.errors) && data.errors.length
                ? data.errors[0].msg
                : null;
            showClientAlert(validationMessage || data.message || 'Error al guardar cliente', 'error');
            return;
        }

        closeClientModal(modalCliente);
        limpiarFormularioCliente();
        showClientSuccess(clienteId ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente');
        cargarClientes(clienteId ? paginaClientesActual : 1);
    } catch (error) {
        console.error('Error al guardar cliente:', error);
        showClientAlert('Error al guardar cliente', 'error');
    } finally {
        if (btnGuardarCliente) {
            btnGuardarCliente.disabled = false;
        }
        if (btnText) {
            btnText.style.display = 'inline';
        }
        if (btnLoader) {
            btnLoader.style.display = 'none';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const clientesSection = document.getElementById('section-clientes');
    if (clientesSection?.classList.contains('active')) {
        cargarClientes();
    }
});

document.querySelectorAll('.nav-item[data-section="clientes"]').forEach((item) => {
    item.addEventListener('click', () => {
        setTimeout(() => cargarClientes(), 100);
    });
});

window.addEventListener('realtime:cliente-changed', () => {
    if (clientesTableBody) {
        cargarClientes(paginaClientesActual);
    }
});
