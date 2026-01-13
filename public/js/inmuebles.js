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
const btnNuevoInmuebleDashboard = document.getElementById('btnNuevoInmuebleDashboard');
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
            <tr><td colspan="7" class="text-center">No se encontraron inmuebles</td></tr>
        `;
        return;
    }

    inmueblesTableBody.innerHTML = '';

    inmuebles.forEach(inm => {
        const badgeClass = {
            'Disponible': 'bg-success',
            'Vendido': 'bg-danger',
            'Alquilado': 'bg-info',
            'Reservado': 'bg-warning'
        }[inm.estado_nombre] || 'bg-secondary';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${inm.imagen_principal 
                    ? `<img src="${inm.imagen_principal}" alt="Foto" class="table-img">` 
                    : '<span class="no-image">Sin foto</span>'}
            </td>
            <td>
                <strong>${inm.tipo_vivienda}</strong><br>
                <small>${inm.medidas} m² · ${inm.habitaciones} hab · ${inm.banos} baños</small>
            </td>
            <td>
                ${inm.direccion}<br>
                <small>${inm.barrio ? inm.barrio + ', ' : ''}${inm.ciudad}</small>
            </td>
            <td>${inm.tipo_transaccion}</td>
            <td>$${Number(inm.precio).toLocaleString('es-CO')}</td>
            <td><span class="badge ${badgeClass}">${inm.estado_nombre}</span></td>
            <td>
                <button class="btn btn-sm btn-primary editar-btn" data-id="${inm.id}">Editar</button>
                <button class="btn btn-sm btn-danger eliminar-btn" data-id="${inm.id}">Eliminar</button>
            </td>
        `;
        inmueblesTableBody.appendChild(tr);
    });

    // Eventos (ya los tienes, pero asegúrate)
    document.querySelectorAll('.editar-btn').forEach(btn => {
        btn.addEventListener('click', () => editarInmueble(btn.dataset.id));
    });

    document.querySelectorAll('.eliminar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            eliminarInmueble(btn.dataset.id);
        });
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
function abrirModalNuevoInmueble() {
    inmuebleActual = null;
    document.getElementById('modalInmuebleTitle').textContent = 'Nuevo Inmueble';
    formInmueble.reset();
    document.getElementById('inmuebleId').value = '';
    openModal(modalInmueble);
}

if (btnNuevoInmueble) {
    btnNuevoInmueble.addEventListener('click', abrirModalNuevoInmueble);
}

if (btnNuevoInmuebleDashboard) {
    btnNuevoInmuebleDashboard.addEventListener('click', abrirModalNuevoInmueble);
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
            
            // Características - CORRECCIÓN AQUÍ
            if (inmuebleActual.caracteristicas) {
                let caracteristicasObj = inmuebleActual.caracteristicas;
                
                // Si llega como string → parsear con seguridad
                if (typeof caracteristicasObj === 'string') {
                    try {
                        caracteristicasObj = JSON.parse(caracteristicasObj);
                    } catch (e) {
                        console.error('Error parseando características:', e);
                        caracteristicasObj = {}; // fallback vacío
                    }
                }
                
                // Ahora caracteristicasObj es objeto → marcar checkboxes
                Object.keys(caracteristicasObj).forEach(key => {
                    const checkbox = document.querySelector(`input[name="${key}"]`);
                    if (checkbox) {
                        checkbox.checked = !!caracteristicasObj[key]; // fuerza boolean
                    }
                });
            }
            
            // Abrir modal
            openModal(modalInmueble);
        } else {
            showAlert(data.message || 'Inmueble no encontrado', 'error');
        }
    } catch (error) {
        console.error('Error al cargar inmueble:', error);
        showAlert('Error al cargar inmueble', 'error');
    }
}

// ============================================
// ELIMINAR INMUEBLE
// ============================================
let inmuebleIdToDelete = null;

function eliminarInmueble(id) {
    inmuebleIdToDelete = id;
    // Abre el modal de confirmación bonito
    document.getElementById('confirmDeleteModal').classList.add('active');
    // Opcional: personaliza el mensaje si quieres
    document.getElementById('confirmDeleteMessage').textContent = 
        '¿Estás seguro de eliminar este inmueble? Esta acción no se puede deshacer.';
}

// Confirmar eliminación (botón "Sí, eliminar")
document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
    if (!inmuebleIdToDelete) return;

    const id = inmuebleIdToDelete;
    inmuebleIdToDelete = null;
    document.getElementById('confirmDeleteModal').classList.remove('active');

    try {
        const response = await fetch(`${API_URL}/inmuebles/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showSuccessModal('Inmueble eliminado exitosamente');
            cargarInmuebles(paginaActual);
        } else {
            showAlert(data.message || 'Error al eliminar inmueble', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar inmueble:', error);
        showAlert('Error al eliminar inmueble', 'error');
    }
});

// Cancelar eliminación (botón "Cancelar")
document.getElementById('cancelDelete')?.addEventListener('click', () => {
    inmuebleIdToDelete = null;
    document.getElementById('confirmDeleteModal').classList.remove('active');
});

// Cerrar modal al clic fuera
document.getElementById('confirmDeleteModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmDeleteModal')) {
        inmuebleIdToDelete = null;
        document.getElementById('confirmDeleteModal').classList.remove('active');
    }
});

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
                showSuccessModal(id ? 'Inmueble actualizado con éxito' : 'Inmueble agregado con éxito');
                modalInmueble.classList.remove('active');
                formInmueble.reset();
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

// Modal de éxito
const successModal = document.getElementById('successModal');
const closeSuccessModal = document.getElementById('closeSuccessModal');
const successMessage = document.getElementById('successMessage');

function showSuccessModal(message = 'Inmueble agregado con éxito') {
    successMessage.textContent = message;
    successModal.classList.add('active');
}

closeSuccessModal?.addEventListener('click', () => {
    successModal.classList.remove('active');
});

successModal?.addEventListener('click', (e) => {
    if (e.target === successModal) successModal.classList.remove('active');
});

// Hacer las funciones globales para los botones inline
window.editarInmueble = editarInmueble;
window.eliminarInmueble = eliminarInmueble;