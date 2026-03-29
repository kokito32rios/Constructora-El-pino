const API_URL = '';

const loginForm = document.getElementById('loginForm');
const cedulaInput = document.getElementById('cedula');
const passwordInput = document.getElementById('password');
const captchaImage = document.getElementById('captchaImage');
const captchaAnswerInput = document.getElementById('captchaAnswer');
const captchaIdInput = document.getElementById('captchaId');
const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
const togglePasswordBtn = document.getElementById('togglePassword');
const btnLogin = document.getElementById('btnLogin');
const btnText = btnLogin.querySelector('.btn-text');
const btnLoader = btnLogin.querySelector('.btn-loader');

const requestAccountModal = document.getElementById('requestAccountModal');
const requestAccountLink = document.getElementById('requestAccountLink');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const closeRequestModal = document.getElementById('closeRequestModal');
const acceptRequestModal = document.getElementById('acceptRequestModal');

async function loadCaptcha() {
    if (!captchaImage || !captchaIdInput) {
        return;
    }

    captchaImage.removeAttribute('src');
    captchaIdInput.value = '';
    if (captchaAnswerInput) {
        captchaAnswerInput.value = '';
    }
    if (refreshCaptchaBtn) {
        refreshCaptchaBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/captcha`, {
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'No se pudo cargar el captcha');
        }

        captchaImage.src = data.data.imageData;
        captchaIdInput.value = data.data.captchaId;
    } catch (error) {
        console.error('Error al cargar captcha:', error);
        showAlert('No se pudo cargar el captcha. Intenta de nuevo.', 'error');
    } finally {
        if (refreshCaptchaBtn) {
            refreshCaptchaBtn.disabled = false;
        }
    }
}

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

if (refreshCaptchaBtn) {
    refreshCaptchaBtn.addEventListener('click', () => {
        loadCaptcha();
    });
}

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

[closeRequestModal, acceptRequestModal].forEach((button) => {
    if (button) {
        button.addEventListener('click', () => closeModal(requestAccountModal));
    }
});

requestAccountModal?.addEventListener('click', (e) => {
    if (e.target === requestAccountModal) {
        closeModal(requestAccountModal);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal(requestAccountModal);
    }
});

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

function getLoginValidationMessage(cedula, password, captchaAnswer, captchaId) {
    if (!cedula || !password) {
        return 'Completa todos los campos';
    }

    if (cedula.length < 6 || cedula.length > 20) {
        return 'La cédula no es válida';
    }

    if (password.length < 6) {
        return 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!captchaId) {
        return 'No se pudo cargar el captcha';
    }

    if (!captchaAnswer) {
        return 'Ingresa el codigo de seguridad';
    }

    return null;
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const cedula = cedulaInput.value.trim();
        const password = passwordInput.value;
        const captchaAnswer = captchaAnswerInput ? captchaAnswerInput.value.trim() : '';
        const captchaId = captchaIdInput ? captchaIdInput.value : '';
        const validationMessage = getLoginValidationMessage(cedula, password, captchaAnswer, captchaId);

        if (validationMessage) {
            showAlert(validationMessage, 'error');
            return;
        }

        btnLogin.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cedula, password, captchaId, captchaAnswer })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('usuario', JSON.stringify(data.data.usuario));
                showAlert('Inicio de sesion exitoso', 'success');

                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
                return;
            }

            const serverValidationMessage = Array.isArray(data.errors) && data.errors.length > 0
                ? data.errors[0].msg
                : null;

            showAlert(serverValidationMessage || data.message || 'Credenciales inválidas', 'error');
            await loadCaptcha();
        } catch (error) {
            console.error('Error en login:', error);
            showAlert('Error de conexion. Por favor, intenta nuevamente.', 'error');
        } finally {
            btnLogin.disabled = false;
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
        }
    });
}

function showAlert(message, type = 'info') {
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = `custom-alert alert-${type}`;

    const icon = type === 'success'
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

    alert.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(alert);

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

    setTimeout(() => {
        alert.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => alert.remove(), 300);
    }, 4000);
}

fetch(`${API_URL}/api/auth/verify`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
        'Content-Type': 'application/json'
    }
})
    .then((res) => res.json())
    .then((data) => {
        if (data.success) {
            localStorage.setItem('usuario', JSON.stringify(data.data.usuario));
            window.location.href = '/dashboard.html';
        } else {
            localStorage.removeItem('usuario');
        }
    })
    .catch((err) => {
        console.error('Error al verificar sesion:', err);
    });

window.addEventListener('DOMContentLoaded', () => {
    if (cedulaInput) {
        cedulaInput.focus();
    }

    loadCaptcha();
});

