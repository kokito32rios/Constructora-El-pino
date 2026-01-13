// ============================================
// INMUEBLES.JS - GESTIÓN DE INMUEBLES
// ============================================

const API_URL = 'http://localhost:3000/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/views/login.html';
}

// Variables globales
let inmuebleActual = null;
let paginaActual = 1;
const itemsPorPagina = 10;
let inmuebleIdToDelete = null;

// Elementos DOM
const btnNuevoInmueble = document.getElementById('btnNuevoInmueble');
const btnNuevoInmuebleDashboard = document.getElementById('btnNuevoInmuebleDashboard');
const modalInmueble = document.getElementById('modalInmueble');
const closeModalInmueble = document.getElementById('closeModalInmueble');
const btnCancelarInmueble = document.getElementById('btnCancelarInmueble');
const formInmueble = document.getElementById('formInmueble');
const btnGuardarInmueble = document.getElementById('btnGuardarInmueble');
const inmueblesTableBody = document.getElementById('inmueblesTableBody');
const paginationInmuebles = document.getElementById('paginationInmuebles');
const mediosFilesInput = document.getElementById('mediosFiles');
const mediosGaleria = document.getElementById('mediosGaleria');

// Filtros y modales
const searchInmuebles = document.getElementById('searchInmuebles');
const filterCiudad = document.getElementById('filterCiudad');
const filterTipo = document.getElementById('filterTipo');
const filterEstado = document.getElementById('filterEstado');
const btnFiltrar = document.getElementById('btnFiltrar');
const successModal = document.getElementById('successModal');
const closeSuccessModal = document.getElementById('closeSuccessModal');
const successMessage = document.getElementById('successMessage');
const confirmDeleteModal = document.getElementById('confirmDeleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDelete = document.getElementById('cancelDelete');

// ============================================
// CARGAR CATÁLOGOS
// ============================================
async function cargarCatalogos() {
    try {
        const response = await fetch(`${API_URL}/catalogos/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            // Tipos de vivienda
            const tiposVivienda = document.getElementById('tipo_vivienda_id');
            data.data.tiposVivienda.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.id;
                option.textContent = tipo.nombre;
                tiposVivienda.appendChild(option);
                filterTipo.appendChild(option.cloneNode(true));
            });
            
            // Tipos de transacción
            const tiposTransaccion = document.getElementById('tipo_transaccion_id');
            data.data.tiposTransaccion.forEach(tipo => tiposTransaccion.add(new Option(tipo.nombre, tipo.id)));
            
            // Estados
            const estados = document.getElementById('estado_id');
            data.data.estados.forEach(estado => {
                const option = document.createElement('option');
                option.value = estado.id;
                option.textContent = estado.nombre;
                estados.appendChild(option);
                filterEstado.appendChild(option.cloneNode(true));
            });
            
            // Condiciones
            const condiciones = document.getElementById('condicion_id');
            data.data.condiciones.forEach(condicion => condiciones.add(new Option(condicion.nombre, condicion.id)));
            
            // Ciudades
            const ciudades = document.getElementById('ciudad_id');
            data.data.ciudades.forEach(ciudad => {
                const option = document.createElement('option');
                option.value = ciudad.id;
                option.textContent = ciudad.nombre;
                ciudades.appendChild(option);
                filterCiudad.appendChild(option.cloneNode(true));
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
        
        if (searchInmuebles.value.trim()) params.append('search', searchInmuebles.value.trim());
        if (filterCiudad.value) params.append('ciudad', filterCiudad.value);
        if (filterTipo.value) params.append('tipo_vivienda', filterTipo.value);
        if (filterEstado.value) params.append('estado', filterEstado.value);
        
        const response = await fetch(`${API_URL}/inmuebles?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        console.log('RESPUESTA API:', data);
        
        if (data.success) {
            mostrarInmuebles(data.data);
            mostrarPaginacion(data.pagination);
            paginaActual = pagina;
        } else {
            inmueblesTableBody.innerHTML = '<tr><td colspan="7">No se encontraron inmuebles</td></tr>';
        }
    } catch (error) {
        console.error('Error al cargar inmuebles:', error);
        inmueblesTableBody.innerHTML = '<tr><td colspan="7">Error al cargar inmuebles</td></tr>';
    }
}

// ============================================
// MOSTRAR INMUEBLES EN TABLA
// ============================================
function mostrarInmuebles(inmuebles) {
    if (inmuebles.length === 0) {
        inmueblesTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron inmuebles</td></tr>';
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
                ${renderMediaTabla(inm.imagen_principal)}
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

    document.querySelectorAll('.editar-btn').forEach(btn => {
        btn.addEventListener('click', () => editarInmueble(btn.dataset.id));
    });

    document.querySelectorAll('.eliminar-btn').forEach(btn => {
        btn.addEventListener('click', () => eliminarInmueble(btn.dataset.id));
    });
}

// ============================================
// MOSTRAR VIDEOS
// ============================================
function renderMediaTabla(url) {
    if (!url) {
        return '<span class="no-image">Sin medio</span>';
    }

    const ext = url.split('.').pop().toLowerCase();

    if (['mp4', 'webm', 'ogg'].includes(ext)) {
        return `
            <video 
                src="${url}" 
                class="table-video"
                muted
                preload="metadata">
            </video>
        `;
    }

    return `<img src="${url}" alt="Foto" class="table-img">`;
}


// ============================================
// MOSTRAR PAGINACIÓN
// ============================================
function mostrarPaginacion(pagination) {
    const container = document.getElementById('paginationInmuebles');
    container.innerHTML = '';
    
    const { page, totalPages } = pagination;
    
    const btnPrev = document.createElement('button');
    btnPrev.textContent = 'Anterior';
    btnPrev.disabled = page === 1;
    btnPrev.onclick = () => cargarInmuebles(page - 1);
    container.appendChild(btnPrev);
    
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === page ? 'active' : '';
        btn.onclick = () => cargarInmuebles(i);
        container.appendChild(btn);
    }
    
    const btnNext = document.createElement('button');
    btnNext.textContent = 'Siguiente';
    btnNext.disabled = page === totalPages;
    btnNext.onclick = () => cargarInmuebles(page + 1);
    container.appendChild(btnNext);
}

// ============================================
// ABRIR MODAL NUEVO INMUEBLE
// ============================================
btnNuevoInmueble?.addEventListener('click', () => {
    inmuebleActual = null;
    document.getElementById('modalInmuebleTitle').textContent = 'Nuevo Inmueble';
    formInmueble.reset();
    document.getElementById('inmuebleId').value = '';
    document.getElementById('mediosGaleria').innerHTML = '';
    mediosFilesInput.value = '';
    modalInmueble.classList.add('active');
});

btnNuevoInmuebleDashboard?.addEventListener('click', () => {
    inmuebleActual = null;
    document.getElementById('modalInmuebleTitle').textContent = 'Nuevo Inmueble';
    formInmueble.reset();
    document.getElementById('inmuebleId').value = '';
    document.getElementById('mediosGaleria').innerHTML = '';
    mediosFilesInput.value = '';
    modalInmueble.classList.add('active');
});

// ============================================
// EDITAR INMUEBLE
// ============================================
async function editarInmueble(id) {
    try {
        const response = await fetch(`${API_URL}/inmuebles/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            inmuebleActual = data.data;
            document.getElementById('modalInmuebleTitle').textContent = 'Editar Inmueble';
            
            document.getElementById('inmuebleId').value = inmuebleActual.id;
            document.getElementById('tipo_vivienda_id').value = inmuebleActual.tipo_vivienda_id || '';
            document.getElementById('tipo_transaccion_id').value = inmuebleActual.tipo_transaccion_id || '';
            document.getElementById('condicion_id').value = inmuebleActual.condicion_id || '';
            document.getElementById('estado_id').value = inmuebleActual.estado_id || '';
            document.getElementById('direccion').value = inmuebleActual.direccion || '';
            document.getElementById('barrio').value = inmuebleActual.barrio || '';
            document.getElementById('ciudad_id').value = inmuebleActual.ciudad_id || '';
            document.getElementById('medidas').value = inmuebleActual.medidas || '';
            document.getElementById('habitaciones').value = inmuebleActual.habitaciones || '';
            document.getElementById('banos').value = inmuebleActual.banos || '';
            document.getElementById('precio').value = inmuebleActual.precio || '';
            document.getElementById('descripcion').value = inmuebleActual.descripcion || '';
            document.getElementById('latitud').value = inmuebleActual.latitud || '';
            document.getElementById('longitud').value = inmuebleActual.longitud || '';
            
            // Características
            if (inmuebleActual.caracteristicas) {
                let caracteristicasObj = inmuebleActual.caracteristicas;
                if (typeof caracteristicasObj === 'string') {
                    try {
                        caracteristicasObj = JSON.parse(caracteristicasObj);
                    } catch (e) {
                        caracteristicasObj = {};
                    }
                }
                Object.keys(caracteristicasObj).forEach(key => {
                    const checkbox = document.querySelector(`input[name="${key}"]`);
                    if (checkbox) checkbox.checked = !!caracteristicasObj[key];
                });
            }
            
            // Cargar medios existentes
            await cargarMediosEnModal(id);
            
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
// CARGAR MEDIOS EN MODO EDICIÓN
// ============================================
// ============================================
// CARGAR MEDIOS EN MODO EDICIÓN
// ============================================
async function cargarMediosEnModal(inmuebleId) {
    const galeria = document.getElementById('mediosGaleria');
    galeria.innerHTML = '<p>Cargando medios...</p>';

    try {
        const response = await fetch(`${API_URL}/inmuebles/${inmuebleId}/medios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        galeria.innerHTML = '';

        if (data.success && data.data.length > 0) {
            data.data.forEach(medio => {
                const div = document.createElement('div');
                div.className = 'medios-item';

                div.innerHTML = `
                    ${medio.tipo === 'imagen'
                        ? `<img src="${medio.url}" alt="Imagen">`
                        : `<video src="${medio.url}" controls></video>`}

                    ${medio.es_principal
                        ? `<span class="principal-badge">Principal</span>`
                        : `<button class="btn-principal" data-id="${medio.id}">
                                Marcar como principal
                           </button>`}

                    <div class="actions">
                        <button class="btn-delete-medio" data-id="${medio.id}">×</button>
                    </div>
                `;

                galeria.appendChild(div);

                // Marcar como principal
                const btnPrincipal = div.querySelector('.btn-principal');
                if (btnPrincipal) {
                    btnPrincipal.addEventListener('click', () => {
                        marcarImagenPrincipal(inmuebleId, medio.id);
                    });
                }

                // Eliminar medio
                div.querySelector('.btn-delete-medio').addEventListener('click', () => {
                    if (confirm('¿Eliminar este medio?')) {
                        eliminarMedio(inmuebleId, medio.id);
                    }
                });
            });
        } else {
            galeria.innerHTML = '<p style="color:#999;">No hay medios subidos</p>';
        }

    } catch (error) {
        console.error('Error al cargar medios:', error);
        galeria.innerHTML = '<p style="color:#ef4444;">Error al cargar medios</p>';
    }
}

// ============================================
// MARCAR IMAGEN COMO PRINCIPAL
// ============================================
async function marcarImagenPrincipal(inmuebleId, mediaId) {
    try {
        const response = await fetch(
            `${API_URL}/inmuebles/${inmuebleId}/medios/${mediaId}/principal`,
            {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        const data = await response.json();

        if (data.success) {
            showAlert('Imagen marcada como principal', 'success');
            cargarMediosEnModal(inmuebleId); // Recargar galería
            cargarInmuebles(paginaActual);   // Actualizar tabla
        } else {
            showAlert(data.message || 'Error al marcar imagen', 'error');
        }

    } catch (error) {
        console.error('Error al marcar principal:', error);
        showAlert('Error al marcar imagen principal', 'error');
    }
}



// ============================================
// ELIMINAR MEDIO
// ============================================
async function eliminarMedio(inmuebleId, mediaId) {
    try {
        const response = await fetch(`${API_URL}/inmuebles/${inmuebleId}/medios/${mediaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Medio eliminado exitosamente', 'success');
            cargarMediosEnModal(inmuebleId);
        } else {
            showAlert(data.message || 'Error al eliminar medio', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar medio:', error);
        showAlert('Error al eliminar medio', 'error');
    }
}

// ============================================
// ELIMINAR INMUEBLE (abre modal de confirmación)
// ============================================
function eliminarInmueble(id) {
    inmuebleIdToDelete = id;
    document.getElementById('confirmDeleteModal').classList.add('active');
    document.getElementById('confirmDeleteMessage').textContent = 
        '¿Estás seguro de eliminar este inmueble? Esta acción no se puede deshacer.';
}

// Confirmar eliminación
document.getElementById('confirmDeleteBtn')?.addEventListener('click', async () => {
    if (!inmuebleIdToDelete) return;

    const id = inmuebleIdToDelete;
    inmuebleIdToDelete = null;
    document.getElementById('confirmDeleteModal').classList.remove('active');

    try {
        const response = await fetch(`${API_URL}/inmuebles/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
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

// Cancelar eliminación
document.getElementById('cancelDelete')?.addEventListener('click', () => {
    inmuebleIdToDelete = null;
    document.getElementById('confirmDeleteModal').classList.remove('active');
});

document.getElementById('confirmDeleteModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('confirmDeleteModal')) {
        inmuebleIdToDelete = null;
        document.getElementById('confirmDeleteModal').classList.remove('active');
    }
});

// ============================================
// GUARDAR INMUEBLE + SUBIR MEDIOS
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
            // 1. Preparar datos del inmueble (sin medios)
            const formData = new FormData(formInmueble);
            const inmuebleData = {};
            
            for (let [key, value] of formData.entries()) {
                if (key !== 'id' && key !== 'mediosFiles') {
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
            
            // 2. Guardar inmueble (crear o actualizar)
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(inmuebleData)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                showAlert(data.message || 'Error al guardar inmueble', 'error');
                return;
            }

            // Obtener ID del inmueble (nuevo o existente)
            const inmuebleId = id ? id : data.data.id;

            // 3. Subir medios si hay archivos seleccionados
            if (mediosFilesInput.files.length > 0) {
                const mediosFormData = new FormData();
                for (let file of mediosFilesInput.files) {
                    mediosFormData.append('medios', file);
                }

                const uploadResponse = await fetch(`${API_URL}/inmuebles/${inmuebleId}/upload-medios`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: mediosFormData
                });

                const uploadData = await uploadResponse.json();

                if (!uploadData.success) {
                    showAlert('Inmueble guardado, pero error al subir medios: ' + (uploadData.message || 'Desconocido'), 'error');
                } else {
                    showAlert('Medios subidos correctamente', 'success');
                }
            }

            // 4. Éxito final
            showSuccessModal(id ? 'Inmueble actualizado con éxito' : 'Inmueble agregado con éxito');
            modalInmueble.classList.remove('active');
            formInmueble.reset();
            mediosFilesInput.value = ''; // Limpiar input file
            document.getElementById('mediosGaleria').innerHTML = '';
            cargarInmuebles(paginaActual);
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
btnFiltrar?.addEventListener('click', () => {
    paginaActual = 1;
    cargarInmuebles(1);
});

// ============================================
// CERRAR MODALES
// ============================================
closeModalInmueble?.addEventListener('click', () => modalInmueble.classList.remove('active'));
btnCancelarInmueble?.addEventListener('click', () => modalInmueble.classList.remove('active'));

modalInmueble?.addEventListener('click', (e) => {
    if (e.target === modalInmueble) modalInmueble.classList.remove('active');
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

function showSuccessModal(message = 'Inmueble agregado con éxito') {
    successMessage.textContent = message;
    successModal.classList.add('active');
}

closeSuccessModal?.addEventListener('click', () => successModal.classList.remove('active'));

successModal?.addEventListener('click', (e) => {
    if (e.target === successModal) successModal.classList.remove('active');
});

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogos();
    
    const inmuebleSection = document.getElementById('section-inmuebles');
    if (inmuebleSection && inmuebleSection.classList.contains('active')) {
        cargarInmuebles();
    }
});

document.querySelectorAll('.nav-item[data-section="inmuebles"]').forEach(item => {
    item.addEventListener('click', () => {
        setTimeout(() => cargarInmuebles(), 100);
    });
});

// ============================================
// EVENTOS PARA PREVIEW DE VIDEO EN TABLA
// ============================================

document.addEventListener('mouseover', e => {
    if (e.target.tagName === 'VIDEO') {
        e.target.play();
    }
});

document.addEventListener('mouseout', e => {
    if (e.target.tagName === 'VIDEO') {
        e.target.pause();
        e.target.currentTime = 0;
    }
});


// Hacer funciones globales para botones inline
window.editarInmueble = editarInmueble;
window.eliminarInmueble = eliminarInmueble;