/**
 * Shared browser helpers: API requests, session handling and small UI utilities.
 */

const API = {
    BASE_URL: '/api',

    getToken() {
        return localStorage.getItem('jeevcare_token');
    },

    setToken(token) {
        localStorage.setItem('jeevcare_token', token);
    },

    logout() {
        localStorage.removeItem('jeevcare_token');
        localStorage.removeItem('jeevcare_user');
        window.location.href = '/auth/login.html';
    },

    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Let the browser set the multipart boundary for file uploads
        if (options.body && options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            let data = {};
            try { data = await response.json(); } catch (e) { /* non-JSON error page */ }

            // Expired or invalid session. A 401 without a token is just a failed login.
            if (response.status === 401 && token) {
                this.logout();
                throw new Error(data.message || 'Your session has expired. Please log in again.');
            }

            if (response.status === 429) {
                throw new Error('Too many requests. Please wait a few minutes and try again.');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
        const isFormData = body instanceof FormData;
        return this.request(endpoint, {
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body)
        });
    },

    async patch(endpoint, body) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    async getProfile() {
        return this.get('/auth/profile');
    },

    redirectByRole(role) {
        switch (role) {
            case 'citizen': window.location.href = '/citizen/dashboard.html'; break;
            case 'ngo': window.location.href = '/ngo/dashboard.html'; break;
            case 'authority': window.location.href = '/authority/dashboard.html'; break;
            case 'service_provider': window.location.href = '/provider/dashboard.html'; break;
            default: window.location.href = '/index.html';
        }
    }
};

window.API = API;

/**
 * Escape user-provided text before inserting it with innerHTML.
 */
window.escapeHtml = function (value) {
    return String(value ?? '').replace(/[&<>"'`]/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;'
    }[c]));
};

/**
 * Click handling for elements marked with data-action, including ones rendered later.
 * Usage: onAction(document, { remove: (el) => removeItem(el.dataset.id) });
 */
window.onAction = function (root, handlers) {
    root.addEventListener('click', (event) => {
        const el = event.target.closest('[data-action]');
        if (el && handlers[el.dataset.action]) handlers[el.dataset.action](el, event);
    });
};

/**
 * Short non-blocking message. type: 'success' | 'error' | 'info'
 */
window.toast = function (message, type = 'info', durationMs = 4000) {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toast-stack';
        stack.setAttribute('role', 'status');
        stack.setAttribute('aria-live', 'polite');
        document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => {
        el.classList.add('toast-hide');
        setTimeout(() => el.remove(), 300);
    }, durationMs);
};

/**
 * The URL if it is http(s), otherwise '#' (blocks javascript: links).
 */
window.safeUrl = function (value) {
    try {
        const url = new URL(value, window.location.origin);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch (e) {
        return '#';
    }
};
