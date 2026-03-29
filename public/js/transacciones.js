const TRANSACCIONES_API_URL = 'http://localhost:3000/api/transacciones';
const CATALOGOS_API_URL = 'http://localhost:3000/api/catalogos/all';

function authFetchTransacciones(url, options = {}) {
    if (typeof authFetch === 'function') {
        return authFetch(url, options);
    }

    return fetch(url, {
        ...options,
        credentials: 'same-origin'
    });
}

const searchTransacciones = document.getElementById('searchTransacciones');
const filterTransaccionTipo = document.getElementById('filterTransaccionTipo');
const filterTransaccionEstado = document.getElementById('filterTransaccionEstado');
const filterFechaDesde = document.getElementById('filterFechaDesde');
const filterFechaHasta = document.getElementById('filterFechaHasta');
const transaccionesTableBody = document.getElementById('transaccionesTableBody');
const paginationTransacciones = document.getElementById('paginationTransacciones');
const modalTransaccionDetalle = document.getElementById('modalTransaccionDetalle');
const closeModalTransaccionDetalle = document.getElementById('closeModalTransaccionDetalle');

let paginaTransaccionesActual = 1;
const transaccionesPorPagina = 10;
let busquedaTransaccionesTimer = null;

function formatFechaTransaccion(fecha) {
    if (!fecha) {
        return '-';
    }

    return new Date(fecha).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatMonedaTransaccion(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return '-';
    }

    return `$${new Intl.NumberFormat('es-CO').format(Number(valor))}`;
}

async function cargarCatalogosTransacciones() {
    try {
        const response = await authFetchTransacciones(CATALOGOS_API_URL);
        const data = await response.json();

        if (!data.success) {
            return;
        }

        if (filterTransaccionTipo && filterTransaccionTipo.options.length <= 1) {
            data.data.tiposTransaccion.forEach((tipo) => {
                filterTransaccionTipo.add(new Option(tipo.nombre, tipo.id));
            });
        }

        if (filterTransaccionEstado && filterTransaccionEstado.options.length <= 1) {
            data.data.estados.forEach((estado) => {
                filterTransaccionEstado.add(new Option(estado.nombre, estado.id));
            });
        }
    } catch (error) {
        console.error('Error al cargar catálogos de transacciones:', error);
    }
}

function renderTransacciones(rows) {
    if (!transaccionesTableBody) {
        return;
    }

    if (!rows.length) {
        transaccionesTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">No se encontraron transacciones</td>
            </tr>
        `;
        return;
    }

    transaccionesTableBody.innerHTML = rows.map((item) => `
        <tr>
            <td>${formatFechaTransaccion(item.fecha_transaccion)}</td>
            <td>
                <strong>${item.cliente_nombre || '-'}</strong><br>
                <small>${item.cliente_cedula || '-'}</small>
            </td>
            <td>${item.tipo_vivienda} - ${item.direccion}</td>
            <td>${item.ciudad || '-'}</td>
            <td>${item.tipo_transaccion || '-'}</td>
            <td>${item.estado || '-'}</td>
            <td>${formatMonedaTransaccion(item.valor_transaccion || item.precio)}</td>
            <td>
                <button class="btn btn-sm btn-primary ver-transaccion-btn" data-id="${item.id}">
                    Ver detalle
                </button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.ver-transaccion-btn').forEach((button) => {
        button.addEventListener('click', () => verDetalleTransaccion(button.dataset.id));
    });
}

function renderPaginacionTransacciones(pagination) {
    if (!paginationTransacciones) {
        return;
    }

    paginationTransacciones.innerHTML = '';

    if (!pagination || pagination.totalPages <= 1) {
        return;
    }

    const { page, totalPages } = pagination;

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Anterior';
    prevButton.disabled = page === 1;
    prevButton.addEventListener('click', () => cargarTransacciones(page - 1));
    paginationTransacciones.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i += 1) {
        const button = document.createElement('button');
        button.textContent = String(i);
        if (i === page) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => cargarTransacciones(i));
        paginationTransacciones.appendChild(button);
    }

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Siguiente';
    nextButton.disabled = page === totalPages;
    nextButton.addEventListener('click', () => cargarTransacciones(page + 1));
    paginationTransacciones.appendChild(nextButton);
}

async function cargarTransacciones(page = 1) {
    if (!transaccionesTableBody) {
        return;
    }

    try {
        const params = new URLSearchParams({
            page: String(page),
            limit: String(transaccionesPorPagina)
        });

        if (searchTransacciones?.value.trim()) {
            params.append('search', searchTransacciones.value.trim());
        }
        if (filterTransaccionTipo?.value) {
            params.append('tipo_transaccion', filterTransaccionTipo.value);
        }
        if (filterTransaccionEstado?.value) {
            params.append('estado', filterTransaccionEstado.value);
        }
        if (filterFechaDesde?.value) {
            params.append('fecha_desde', filterFechaDesde.value);
        }
        if (filterFechaHasta?.value) {
            params.append('fecha_hasta', filterFechaHasta.value);
        }

        const response = await authFetchTransacciones(`${TRANSACCIONES_API_URL}?${params.toString()}`);
        const data = await response.json();

        if (response.status === 403) {
            transaccionesTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">Disponible solo para administradores</td>
                </tr>
            `;
            paginationTransacciones.innerHTML = '';
            return;
        }

        if (!data.success) {
            throw new Error(data.message || 'No se pudieron cargar las transacciones');
        }

        paginaTransaccionesActual = page;
        renderTransacciones(data.data);
        renderPaginacionTransacciones(data.pagination);
    } catch (error) {
        console.error('Error al cargar transacciones:', error);
        transaccionesTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="color:#ef4444;">Error al cargar transacciones</td>
            </tr>
        `;
    }
}

async function verDetalleTransaccion(id) {
    try {
        const response = await authFetchTransacciones(`${TRANSACCIONES_API_URL}/${id}`);
        const data = await response.json();

        if (!data.success) {
            if (typeof showAlert === 'function') {
                showAlert(data.message || 'No se pudo cargar la transacción', 'error');
            }
            return;
        }

        document.getElementById('detalleTransaccionCliente').value = data.data.cliente_nombre || '-';
        document.getElementById('detalleTransaccionCedula').value = data.data.cliente_cedula || '-';
        document.getElementById('detalleTransaccionTipo').value = data.data.tipo_transaccion || '-';
        document.getElementById('detalleTransaccionEstado').value = data.data.estado || '-';
        document.getElementById('detalleTransaccionFecha').value = formatFechaTransaccion(data.data.fecha_transaccion);
        document.getElementById('detalleTransaccionValor').value = formatMonedaTransaccion(data.data.valor_transaccion || data.data.precio);
        document.getElementById('detalleTransaccionPropiedad').value = `${data.data.tipo_vivienda} - ${data.data.direccion}`;
        document.getElementById('detalleTransaccionCiudad').value = data.data.ciudad || '-';
        document.getElementById('detalleTransaccionAsesor').value = data.data.asesor_nombre || '-';
        document.getElementById('detalleTransaccionNotas').value = data.data.notas_transaccion || '';

        if (typeof openModal === 'function') {
            openModal(modalTransaccionDetalle);
        } else {
            modalTransaccionDetalle?.classList.add('active');
        }
    } catch (error) {
        console.error('Error al obtener detalle de transacción:', error);
        if (typeof showAlert === 'function') {
            showAlert('Error al cargar detalle de transacción', 'error');
        }
    }
}

function dispararFiltroTransacciones() {
    if (busquedaTransaccionesTimer) {
        clearTimeout(busquedaTransaccionesTimer);
    }

    busquedaTransaccionesTimer = setTimeout(() => {
        cargarTransacciones(1);
    }, 250);
}

searchTransacciones?.addEventListener('input', dispararFiltroTransacciones);
filterTransaccionTipo?.addEventListener('change', () => cargarTransacciones(1));
filterTransaccionEstado?.addEventListener('change', () => cargarTransacciones(1));
filterFechaDesde?.addEventListener('change', () => cargarTransacciones(1));
filterFechaHasta?.addEventListener('change', () => cargarTransacciones(1));

closeModalTransaccionDetalle?.addEventListener('click', () => {
    if (typeof closeModal === 'function') {
        closeModal(modalTransaccionDetalle);
    } else {
        modalTransaccionDetalle?.classList.remove('active');
    }
});

modalTransaccionDetalle?.addEventListener('click', (event) => {
    if (event.target === modalTransaccionDetalle) {
        if (typeof closeModal === 'function') {
            closeModal(modalTransaccionDetalle);
        } else {
            modalTransaccionDetalle.classList.remove('active');
        }
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await cargarCatalogosTransacciones();

    const transaccionesSection = document.getElementById('section-transacciones');
    if (transaccionesSection?.classList.contains('active')) {
        cargarTransacciones();
    }
});

document.querySelectorAll('.nav-item[data-section="transacciones"]').forEach((item) => {
    item.addEventListener('click', async () => {
        await cargarCatalogosTransacciones();
        setTimeout(() => cargarTransacciones(), 100);
    });
});

window.addEventListener('realtime:transaccion-changed', () => {
    if (transaccionesTableBody) {
        cargarTransacciones(paginaTransaccionesActual);
    }
});
