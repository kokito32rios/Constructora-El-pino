// ============================================
// INMUEBLES.JS - GESTIÓN DE INMUEBLES
// ============================================

const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

// Variables globales
let inmuebleActual = null;
let paginaActual = 1;
const itemsPorPagina = 10;

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const btnNuevoInmueble = document.getElementById('btnNuevoInmueble');
const modalInmueble = document.getElementById('modalInmueble');
const closeModalInmueble = document.getElementById('closeModalInmueble');
const btnCancelarInmueble = document.getElementById('btnCancelarInmueble');
const formInmueble = document.getElementById('formInmueble');
const btnGuardarInmueble = document.getElementById('btnGuardarInmueble');
const inmueblesTableBody = document.getElementById('inmueblesTableBody');

// Filtros
const searchInmuebles = document.getElementById('searchInmuebles');
const filterCiudad = document.getElementById('filterCiudad');
const filterTipo = document.getElementById('filterTipo');
const filterEstado = document.getElementById('filterEstado');
const btnFiltrar = document.getElementById('btnFiltrar');

// ============================================
// CARGAR CATÁLOGOS
// ============================================
async function cargarCatalogos() {
    try {
        const response = await fetch(`${API_URL}/catalogos/all`);
        const data = await response.json();
        
        if (data.success) {
            // Tipos de vivienda
            const tiposVivienda = document.getElementById('tipo_vivienda_id');
            data.data.tiposVivienda.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.id;
                option.textContent = tipo.nombre;
                tiposVivienda.appendChild(option);
                
                // También para filtros
                const optionFilter = option.cloneNode(true);
                filterTipo.appendChild(optionFilter);
            });
            
            // Tipos de transacción
            const tiposTransaccion = document.getElementById('tipo_transaccion_id');
            data.data.tiposTransaccion.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.id;
                option.textContent = tipo.nombre;
                tiposTransaccion.appendChild(option);
            });
            
            // Estados
            const estados = document.getElementById('estado_id');
            data.data.estados.forEach(estado => {
                const option = document.createElement('option');
                option.value = estado.id;
                option.textContent = estado.nombre;
                estados.appendChild(option);
                
                // También para filtros
                const optionFilter = option.cloneNode(true);
                filterEstado.appendChild(optionFilter);
            });
            
            // Condiciones
            const condiciones = document.getElementById('condicion_id');
            data.data.condiciones.forEach(condicion => {
                const option = document.createElement('option');
                option.value = condicion.id;
                option.textContent = condicion.nombre;
                condiciones.appendChild(option);
            });
            
            // Ciudades
            const ciudades = document.getElementById('ciudad_id');
            data.data.ciudades.forEach(ciudad => {
                const option = document.createElement('option');
                option.value = ciudad.id;
                option.textContent = ciudad.nombre;
                ciudades.appendChild(option);
                
                // También para filtros
                const optionFilter = option.cloneNode(true);
                filterCiudad.appendChild(optionFilter);
            });
        }
    } catch (error) {
        console.error('Error al cargar catálogos:', error);
        showAlert('Error al cargar catálogos', 'error');
    }
}

// ============================================
// CARGAR INMUEBLES
// ============================================
async function cargarInmuebles(pagina = 1) {
    try {
        const params = new URLSearchParams({
            page: pagina,
            limit: itemsPorPagina
        });
        
        // Agregar filtros si existen
        if (searchInmuebles.value) params.append('search', searchInmuebles.value);
        if (filterCiudad.value) params.append('ciudad', filterCiudad.value);
        if (filterTipo.value) params.append('tipo_vivienda', filterTipo.value);
        if (filterEstado.value) params.append('estado', filterEstado.value);
        
        const response = await fetch(`${API_URL}/inmuebles?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarInmuebles(data.data);
            mostrarPaginacion(data.pagination);
        }
    } catch (error) {
        console.error('Error al cargar inmuebles:', error);
        inmueblesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <p style="color: #ef4444; padding: 2rem;">Error al cargar inmuebles</p>
                </td>
            </tr>
        `;
    }
}

// ============================================
// MOSTRAR INMUEBLES EN TABLA
// ============================================
function mostrarInmuebles(inmuebles) {
    if (inmuebles.length === 0) {
        inmueblesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <p style="padding: 2rem; color: var(--gray-medium);">No se encontraron inmuebles</p>
                </td>
            </tr>
        `;
        return;
    }
    
    inmueblesTableBody.innerHTML = '';
    
    inmuebles.forEach(inmueble => {
        const tr = document.createElement('tr');
        
        // Clase de badge según estado
        let badgeClass = 'badge-disponible';
        if (inmueble.estado_nombre === 'Vendido') badgeClass = 'badge-vendido';
        else if (inmueble.estado_nombre === 'Alquilado') badgeClass = 'badge-alquilado';
        else if (inmueble.estado_nombre === 'Reservado') badgeClass = 'badge-reservado';
        
        tr.innerHTML = `
            <td>
                <img src="${inmueble.imagen_principal || '/public/images/placeholder.jpg'}" 
                     alt="${inmueble.tipo_vivienda}" 
                     class="table-img">
            </td>
            <td>
                <strong>${inmueble.tipo_vivienda}</strong><br>
                <small style="color: var(--gray-medium);">${inmueble.medidas} m² · ${inmueble.habitaciones} hab · ${inmueble.banos} baños</small>
            </td>
            <td>
                ${inmueble.direccion}<br>
                <small style="color: var(--gray-medium);">${inmueble.barrio || ''} ${inmueble.ciudad}</small>
            </td>
            <td>${inmueble.tipo_transaccion}</td>
            <td>
                <strong style="color: var(--gold-primary);">$${formatearPrecio(inmueble.precio)}</strong>
            </td>
            <td>
                <span class="table-badge ${badgeClass}">${inmueble.estado_nombre}</span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon btn-edit" onclick="editarInmueble(${inmueble.id})" title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="eliminarInmueble(${inmueble.id})" title="Eliminar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        inmueblesTableBody.appendChild(tr);
    });
}

// ============================================
// MOSTRAR PAGINACIÓN
// ============================================
function mostrarPaginacion(pagination) {
    const container = document.getElementById('paginationInmuebles');
    container.innerHTML = '';
    
    const { page, totalPages } = pagination;
    
    // Botón anterior
    const btnPrev = document.createElement('button');
    btnPrev.textContent = '← Anterior';
    btnPrev.disabled = page === 1;
    btnPrev.onclick = () => {
        paginaActual = page - 1;
        cargarInmuebles(paginaActual);
    };
    container.appendChild(btnPrev);
    
    // Páginas
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
            const btnPage = document.createElement('button');
            btnPage.textContent = i;
            btnPage.className = i === page ? 'active' : '';
            btnPage.onclick = () => {
                paginaActual = i;
                cargarInmuebles(paginaActual);
            };
            container.appendChild(btnPage);
        } else if (i === page - 2 || i === page + 2) {
            const span = document.createElement('span');
            span.textContent = '...';
            span.style.padding = '0.5rem';
            container.appendChild(span);
        }
    }
    
    // Botón siguiente
    const btnNext = document.createElement('button');
    btnNext.textContent = 'Siguiente →';
    btnNext.disabled = page === totalPages;
    btnNext.onclick = () => {
        paginaActual = page + 1;
        cargarInmuebles(paginaActual);
    };
    container.appendChild(btnNext);
}

// ============================================
// ABRIR MODAL NUEVO INMUEBLE
// ============================================
if (btnNuevoInmueble) {
    btnNuevoInmueble.addEventListener('click', () => {
        inmuebleActual = null;
        document.getElementById('modalInmuebleTitle').textContent = 'Nuevo Inmueble';
        formInmueble.reset();
        document.getElementById('inmuebleId').value = '';
        openModal(modalInmueble);
    });
}

// ============================================
// EDITAR INMUEBLE
// ============================================
async function editarInmueble(id) {
    try {
        const response = await fetch(`${API_URL}/inmuebles/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            inmuebleActual = data.data;
            document.getElementById('modalInmuebleTitle').textContent = 'Editar Inmueble';
            
            // Llenar formulario
            document.getElementById('inmuebleId').value = inmuebleActual.id;
            document.getElementById('tipo_vivienda_id').value = inmuebleActual.tipo_vivienda_id;
            document.getElementById('tipo_transaccion_id').value = inmuebleActual.tipo_transaccion_id;
            document.getElementById('condicion_id').value = inmuebleActual.condicion_id;
            document.getElementById('estado_id').value = inmuebleActual.estado_id;
            document.getElementById('direccion').value = inmuebleActual.direccion;
            document.getElementById('barrio').value = inmuebleActual.barrio || '';
            document.getElementById('ciudad_id').value = inmuebleActual.ciudad_id;
            document.getElementById('medidas').value = inmuebleActual.medidas;
            document.getElementById('habitaciones').value = inmuebleActual.habitaciones;
            document.getElementById('banos').value = inmuebleActual.banos;
            document.getElementById('precio').value = inmuebleActual.precio;
            document.getElementById('descripcion').value = inmuebleActual.descripcion || '';
            document.getElementById('latitud').value = inmuebleActual.latitud || '';
            document.getElementById('longitud').value = inmuebleActual.longitud || '';
            
            // Características
            if (inmuebleActual.caracteristicas) {
                const caracteristicas = JSON.parse(inmuebleActual.caracteristicas);
                Object.keys(caracteristicas).forEach(key => {
                    const checkbox = document.querySelector(`input[name="${key}"]`);
                    if (checkbox) checkbox.checked = caracteristicas[key];
                });
            }
            
            openModal(modalInmueble);
        }
    } catch (error) {
        console.error('Error al cargar inmueble:', error);
        showAlert('Error al cargar inmueble', 'error');
    }
}

// ============================================
// ELIMINAR INMUEBLE
// ============================================
async function eliminarInmueble(id) {
    if (!confirm('¿Estás seguro de eliminar este inmueble?')) return;
    
    try {
        const response = await fetch(`${API_URL}/inmuebles/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Inmueble eliminado exitosamente', 'success');
            cargarInmuebles(paginaActual);
        } else {
            showAlert(data.message || 'Error al eliminar inmueble', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar inmueble:', error);
        showAlert('Error al eliminar inmueble', 'error');
    }
}

// ============================================
// GUARDAR INMUEBLE
// ============================================
if (formInmueble) {
    formInmueble.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnText = btnGuardarInmueble.querySelector('.btn-text');
        const btnLoader = btnGuardarInmueble.querySelector('.btn-loader');
        
        btnGuardarInmueble.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        
        try {
            const formData = new FormData(formInmueble);
            const inmuebleData = {};
            
            for (let [key, value] of formData.entries()) {
                if (key !== 'id') {
                    inmuebleData[key] = value;
                }
            }
            
            // Características
            const caracteristicas = {};
            ['garaje', 'piscina', 'ascensor', 'terraza', 'balcon', 'zona_lavanderia'].forEach(char => {
                const checkbox = document.querySelector(`input[name="${char}"]`);
                caracteristicas[char] = checkbox ? checkbox.checked : false;
            });
            inmuebleData.caracteristicas = JSON.stringify(caracteristicas);
            
            const id = document.getElementById('inmuebleId').value;
            const url = id ? `${API_URL}/inmuebles/${id}` : `${API_URL}/inmuebles`;
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(inmuebleData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert(`Inmueble ${id ? 'actualizado' : 'creado'} exitosamente`, 'success');
                closeModal(modalInmueble);
                cargarInmuebles(paginaActual);
            } else {
                showAlert(data.message || 'Error al guardar inmueble', 'error');
            }
        } catch (error) {
            console.error('Error al guardar inmueble:', error);
            showAlert('Error al guardar inmueble', 'error');
        } finally {
            btnGuardarInmueble.disabled = false;
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }
    });
}

// ============================================
// FILTRAR
// ============================================
if (btnFiltrar) {
    btnFiltrar.addEventListener('click', () => {
        paginaActual = 1;
        cargarInmuebles(1);
    });
}

// ============================================
// CERRAR MODALES
// ============================================
if (closeModalInmueble) {
    closeModalInmueble.addEventListener('click', () => closeModal(modalInmueble));
}

if (btnCancelarInmueble) {
    btnCancelarInmueble.addEventListener('click', () => closeModal(modalInmueble));
}

modalInmueble?.addEventListener('click', (e) => {
    if (e.target === modalInmueble) {
        closeModal(modalInmueble);
    }
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function openModal(modal) {
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO').format(precio);
}

function showAlert(message, type = 'info') {
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) existingAlert.remove();
    
    const alert = document.createElement('div');
    alert.className = `custom-alert alert-${type}`;
    
    const icon = type === 'success' 
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    
    alert.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogos();
    
    // Solo cargar si estamos en la sección de inmuebles
    const inmuebleSection = document.getElementById('section-inmuebles');
    if (inmuebleSection && inmuebleSection.classList.contains('active')) {
        cargarInmuebles();
    }
});

// Cargar cuando se cambie a la sección de inmuebles
document.querySelectorAll('.nav-item[data-section="inmuebles"]').forEach(item => {
    item.addEventListener('click', () => {
        setTimeout(() => cargarInmuebles(), 100);
    });
});

// Hacer las funciones globales para los botones inline
window.editarInmueble = editarInmueble;
window.eliminarInmueble = eliminarInmueble;