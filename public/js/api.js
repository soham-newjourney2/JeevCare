/**
 * JeevCare API Utility
 * Simplifies REST API calls, manages JWT tokens, and handles global redirects.
 */

const API = {
    BASE_URL: '/api',

    // Helper to get token
    getToken() {
        return localStorage.getItem('jeevcare_token');
    },

    // Helper to set token
    setToken(token) {
        localStorage.setItem('jeevcare_token', token);
    },

    // Helper to log out
    logout() {
        localStorage.removeItem('jeevcare_token');
        localStorage.removeItem('jeevcare_user');
        window.location.href = '/auth/login.html';
    },

    // Core HTTP Request function
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

        // If body is FormData (for image uploads), don't set Content-Type manually
        if (options.body && options.body instanceof FormData) {
            delete headers['Content-Type'];
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            // Unauthorized - Invalid or expired token
            if (response.status === 401 || response.status === 403) {
                console.warn('Unauthorized or Forbidden access detected. Redirecting to login.');
                this.logout();
                throw new Error(data.message || 'Authentication required');
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

    // Shortcuts for HTTP Methods
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

    // Auth helpers
    async getProfile() {
        return this.get('/auth/profile');
    },

    // Role-based redirect helper
    redirectByRole(role) {
        switch (role) {
            case 'citizen': window.location.href = '/citizen/dashboard.html'; break;
            case 'ngo': window.location.href = '/ngo/dashboard.html'; break;
            case 'authority': window.location.href = '/authority/dashboard.html'; break;
            case 'service_provider': window.location.href = '/services/dashboard.html'; break;
            default: window.location.href = '/index.html';
        }
    }
};

window.API = API;
