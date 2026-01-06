// ============================================
// INDEX.JS - PÁGINA PRINCIPAL
// ============================================

const API_URL = 'http://localhost:3000/api';

// ============================================
// MOBILE MENU TOGGLE
// ============================================
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        menuToggle.classList.toggle('active');
    });
}

// Cerrar menú al hacer clic en un enlace
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.classList.remove('active');
    });
});

// ============================================
// STICKY HEADER
// ============================================
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(26, 26, 26, 0.98)';
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    } else {
        header.style.background = 'rgba(26, 26, 26, 0.95)';
        header.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    }
});

// ============================================
// ACTIVE NAV LINK ON SCROLL
// ============================================
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (window.scrollY >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ============================================
// CARGAR CATÁLOGOS PARA FILTROS
// ============================================
async function cargarCatalogos() {
    try {
        // Cargar ciudades
        const ciudadesRes = await fetch(`${API_URL}/catalogos/ciudades`);
        const ciudades = await ciudadesRes.json();
        
        const selectCiudad = document.getElementById('searchCiudad');
        if (selectCiudad && ciudades.success) {
            ciudades.data.forEach(ciudad => {
                const option = document.createElement('option');
                option.value = ciudad.id;
                option.textContent = ciudad.nombre;
                selectCiudad.appendChild(option);
            });
        }
        
        // Cargar tipos de vivienda
        const tiposRes = await fetch(`${API_URL}/catalogos/tipos-vivienda`);
        const tipos = await tiposRes.json();
        
        const selectTipo = document.getElementById('searchTipo');
        if (selectTipo && tipos.success) {
            tipos.data.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.id;
                option.textContent = tipo.nombre;
                selectTipo.appendChild(option);
            });
        }
        
        // Cargar tipos de transacción
        const transaccionesRes = await fetch(`${API_URL}/catalogos/tipos-transaccion`);
        const transacciones = await transaccionesRes.json();
        
        const selectTransaccion = document.getElementById('searchTransaccion');
        if (selectTransaccion && transacciones.success) {
            transacciones.data.forEach(trans => {
                const option = document.createElement('option');
                option.value = trans.id;
                option.textContent = trans.nombre;
                selectTransaccion.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Error al cargar catálogos:', error);
    }
}

// ============================================
// CARGAR PROPIEDADES DESTACADAS
// ============================================
async function cargarPropiedadesDestacadas() {
    const propertiesGrid = document.getElementById('propertiesGrid');
    
    try {
        const response = await fetch(`${API_URL}/inmuebles?limit=6&estado=1`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            propertiesGrid.innerHTML = '';
            
            data.data.forEach(propiedad => {
                const card = crearTarjetaPropiedad(propiedad);
                propertiesGrid.appendChild(card);
            });
        } else {
            propertiesGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p style="color: #6b6b6b; font-size: 1.125rem;">
                        No hay propiedades disponibles en este momento.
                    </p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar propiedades:', error);
        propertiesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="color: #d32f2f; font-size: 1.125rem;">
                    Error al cargar las propiedades. Por favor, intenta más tarde.
                </p>
            </div>
        `;
    }
}

// ============================================
// CREAR TARJETA DE PROPIEDAD
// ============================================
function crearTarjetaPropiedad(propiedad) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.style.cssText = `
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        cursor: pointer;
    `;
    
    // Imagen principal
    const imagenPrincipal = propiedad.imagen_principal || '/public/images/placeholder.jpg';
    
    card.innerHTML = `
        <div style="position: relative; height: 250px; overflow: hidden;">
            <img src="${imagenPrincipal}" 
                 alt="${propiedad.tipo_vivienda}"
                 style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;"
                 onmouseover="this.style.transform='scale(1.1)'"
                 onmouseout="this.style.transform='scale(1)'">
            <div style="position: absolute; top: 1rem; left: 1rem; background: linear-gradient(135deg, #D4AF37 0%, #F4E5B3 100%); 
                        color: #1a1a1a; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem;">
                ${propiedad.tipo_transaccion}
            </div>
            ${propiedad.estado_nombre !== 'Disponible' ? `
                <div style="position: absolute; top: 1rem; right: 1rem; background: rgba(26,26,26,0.9); 
                            color: white; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem;">
                    ${propiedad.estado_nombre}
                </div>
            ` : ''}
        </div>
        
        <div style="padding: 1.5rem;">
            <h3 style="font-family: 'Playfair Display', serif; font-size: 1.5rem; 
                       color: #1a1a1a; margin-bottom: 0.5rem; line-height: 1.3;">
                ${propiedad.tipo_vivienda}
            </h3>
            
            <p style="color: #6b6b6b; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                ${propiedad.ciudad}, ${propiedad.barrio || ''}
            </p>
            
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; padding: 1rem 0; 
                        border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
                <div style="display: flex; align-items: center; gap: 0.5rem; color: #6b6b6b;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    </svg>
                    <span style="font-size: 0.95rem;">${propiedad.medidas} m²</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; color: #6b6b6b;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    <span style="font-size: 0.95rem;">${propiedad.habitaciones} hab</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; color: #6b6b6b;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 2v2.5A2.5 2.5 0 0 1 6.5 7H4v2.5A2.5 2.5 0 0 1 1.5 12v0A2.5 2.5 0 0 1 4 14.5V17h2.5A2.5 2.5 0 0 1 9 19.5V22"></path>
                    </svg>
                    <span style="font-size: 0.95rem;">${propiedad.banos} baños</span>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p style="color: #9b9b9b; font-size: 0.875rem; margin-bottom: 0.25rem;">Precio</p>
                    <p style="font-size: 1.75rem; font-weight: 700; color: #D4AF37; font-family: 'Playfair Display', serif;">
                        $${formatearPrecio(propiedad.precio)}
                    </p>
                </div>
                <button onclick="verDetalle(${propiedad.id})" 
                        style="background: linear-gradient(135deg, #D4AF37 0%, #F4E5B3 100%); 
                               color: #1a1a1a; border: none; padding: 0.75rem 1.5rem; 
                               border-radius: 8px; font-weight: 600; cursor: pointer; 
                               transition: transform 0.3s ease;"
                        onmouseover="this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.transform='translateY(0)'">
                    Ver Más
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// ============================================
// FORMATEAR PRECIO
// ============================================
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO').format(precio);
}

// ============================================
// VER DETALLE DE PROPIEDAD
// ============================================
function verDetalle(id) {
    window.location.href = `/views/detalle.html?id=${id}`;
}

// ============================================
// FORMULARIO DE BÚSQUEDA
// ============================================
const searchForm = document.getElementById('searchForm');
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(searchForm);
        const params = new URLSearchParams();
        
        for (let [key, value] of formData.entries()) {
            if (value) {
                params.append(key, value);
            }
        }
        
        window.location.href = `/views/catalogo.html?${params.toString()}`;
    });
}

// ============================================
// FORMULARIO DE CONTACTO
// ============================================
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;
        
        // Simular envío (aquí integrarías con tu backend o servicio de email)
        setTimeout(() => {
            alert('¡Gracias por contactarnos! Te responderemos pronto.');
            contactForm.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 1500);
    });
}

// ============================================
// SMOOTH SCROLL PARA ENLACES INTERNOS
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ============================================
// ANIMACIONES AL HACER SCROLL
// ============================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Aplicar animación a las secciones
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogos();
    cargarPropiedadesDestacadas();
});