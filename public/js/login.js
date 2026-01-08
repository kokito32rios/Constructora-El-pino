// ============================================
// LOGIN.JS - PÁGINA DE LOGIN
// ============================================

const API_URL = 'http://localhost:3000';

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const loginForm = document.getElementById('loginForm');
const cedulaInput = document.getElementById('cedula');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const btnLogin = document.getElementById('btnLogin');
const btnText = btnLogin.querySelector('.btn-text');
const btnLoader = btnLogin.querySelector('.btn-loader');

// Modales
const requestAccountModal = document.getElementById('requestAccountModal');
const userNotFoundModal = document.getElementById('userNotFoundModal');
const requestAccountLink = document.getElementById('requestAccountLink');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Botones de cierre
const closeRequestModal = document.getElementById('closeRequestModal');
const acceptRequestModal = document.getElementById('acceptRequestModal');
const closeUserNotFoundModal = document.getElementById('closeUserNotFoundModal');
const acceptUserNotFoundModal = document.getElementById('acceptUserNotFoundModal');

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        const eyeOpen = togglePasswordBtn.querySelector('.eye-open');
        const eyeClosed = togglePasswordBtn.querySelector('.eye-closed');
        
        if (type === 'text') {
            eyeOpen.style.display = 'none';
            eyeClosed.style.display = 'block';
        } else {
            eyeOpen.style.display = 'block';
            eyeClosed.style.display = 'none';
        }
    });
}

// ============================================
// ABRIR MODAL SOLICITAR CUENTA
// ============================================
if (requestAccountLink) {
    requestAccountLink.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(requestAccountModal);
    });
}

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(requestAccountModal);
    });
}

// ============================================
// CERRAR MODALES
// ============================================
const closeModals = [
    { btn: closeRequestModal, modal: requestAccountModal },
    { btn: acceptRequestModal, modal: requestAccountModal },
    { btn: closeUserNotFoundModal, modal: userNotFoundModal },
    { btn: acceptUserNotFoundModal, modal: userNotFoundModal }
];

closeModals.forEach(({ btn, modal }) => {
    if (btn) {
        btn.addEventListener('click', () => closeModal(modal));
    }
});

// Cerrar al hacer clic fuera
[requestAccountModal, userNotFoundModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
});

// Cerrar con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal(requestAccountModal);
        closeModal(userNotFoundModal);
    }
});

// ============================================
// FUNCIONES DE MODAL
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

// ============================================
// MANEJO DEL FORMULARIO DE LOGIN
// ============================================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const cedula = cedulaInput.value.trim();
        const password = passwordInput.value;
        
        // Validaciones
        if (!cedula || !password) {
            showAlert('Por favor completa todos los campos', 'error');
            return;
        }
        
        // Mostrar loader
        btnLogin.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cedula, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Guardar token
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('usuario', JSON.stringify(data.data.usuario));
                
                // Mostrar mensaje de éxito
                showAlert('¡Inicio de sesión exitoso!', 'success');
                
                // Redireccionar al dashboard
                setTimeout(() => {
                    window.location.href = '/views/dashboard.html';
                }, 1000);
                
            } else {
                // Verificar si es usuario no encontrado
                if (data.errorCode === 'USER_NOT_FOUND') {
                    openModal(userNotFoundModal);
                } else if (data.errorCode === 'INVALID_PASSWORD') {
                        showAlert('Contraseña incorrecta', 'error');
                } else {
                    showAlert(data.message || 'Error al iniciar sesión', 'error');
                }
                
                // Restaurar botón
                btnLogin.disabled = false;
                btnText.style.display = 'block';
                btnLoader.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            showAlert('Error de conexión. Por favor, intenta nuevamente.', 'error');
            
            // Restaurar botón
            btnLogin.disabled = false;
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }
    });
}

// ============================================
// SISTEMA DE ALERTAS
// ============================================
function showAlert(message, type = 'info') {
    // Remover alertas anteriores
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `custom-alert alert-${type}`;
    
    const icon = type === 'success' 
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    
    alert.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    document.body.appendChild(alert);
    
    // Agregar estilos dinámicamente si no existen
    if (!document.getElementById('alert-styles')) {
        const style = document.createElement('style');
        style.id = 'alert-styles';
        style.textContent = `
            .custom-alert {
                position: fixed;
                top: 2rem;
                right: 2rem;
                padding: 1rem 1.5rem;
                border-radius: 10px;
                display: flex;
                align-items: center;
                gap: 1rem;
                font-weight: 600;
                z-index: 10001;
                animation: slideInRight 0.3s ease;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            
            .alert-success {
                background: #16a34a;
                color: white;
            }
            
            .alert-error {
                background: #dc2626;
                color: white;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @media (max-width: 768px) {
                .custom-alert {
                    right: 1rem;
                    left: 1rem;
                    top: 1rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto-remover después de 4 segundos
    setTimeout(() => {
        alert.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

// ============================================
// VERIFICAR SI YA ESTÁ LOGUEADO
// ============================================
const token = localStorage.getItem('token');
if (token) {
    // Verificar si el token es válido
    fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Token válido, redireccionar al dashboard
            window.location.href = '/views/dashboard.html';
        } else {
            // Token inválido, limpiar storage
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
        }
    })
    .catch(err => {
        console.error('Error al verificar token:', err);
    });
}

// ============================================
// AUTO-FOCUS EN PRIMER CAMPO
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    if (cedulaInput) {
        cedulaInput.focus();
    }
});