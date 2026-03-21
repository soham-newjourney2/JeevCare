/**
 * JeevCare UI Component Injector
 * Handles dynamic rendering of Navbars and Sidebars across the application
 */

const Layout = {
    /**
     * Injects the Public Navigation Bar into a target element
     * @param {string} targetId - The ID of the element to inject into (e.g., 'nav-placeholder')
     * @param {string} activePage - The current page ('home', 'about', 'contact', 'faq')
     */
    renderPublicNav(targetId, activePage) {
        const el = document.getElementById(targetId);
        if (!el) return;

        const navHtml = `
        <!-- Background Orbs Injected Globally -->
        <div class="bg-glow-1"></div>
        <div class="bg-glow-2"></div>

        <nav class="navbar">
            <div class="container nav-container" style="max-width: 100%; padding: 0 40px;">
                <a href="/index.html" class="nav-logo">🐾 JeevCare</a>
                <button class="mobile-menu-toggle" id="publicMobileMenuBtn" style="display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer;">☰</button>
                <div class="nav-links">
                    <a href="/about.html" style="${activePage === 'about' ? 'color: var(--brand-primary); font-weight: 700;' : ''}">About</a>
                    <a href="/faq.html" style="${activePage === 'faq' ? 'color: var(--brand-primary); font-weight: 700;' : ''}">FAQ</a>
                    <a href="/contact.html" style="${activePage === 'contact' ? 'color: var(--brand-primary); font-weight: 700;' : ''}">Contact</a>
                    <a href="/team.html" style="${activePage === 'team' ? 'color: var(--brand-primary); font-weight: 700;' : ''}">Team</a>
                    <a href="/auth/login.html" class="btn btn-outline" style="padding: 8px 16px;">Login</a>
                    <a href="/auth/register-citizen.html" class="btn btn-primary" style="padding: 8px 16px;">Join Network</a>
                </div>
            </div>
        </nav>
        <aside class="dash-sidebar public-sidebar" id="publicMobileSidebar" style="padding-top: 80px; position: fixed; top: 0; left: 0;">
            <a href="/about.html" class="nav-item">📖 About</a>
            <a href="/faq.html" class="nav-item">❓ FAQ</a>
            <a href="/contact.html" class="nav-item">📞 Contact</a>
            <a href="/team.html" class="nav-item">👥 Team</a>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid rgba(255,255,255,0.1);">
            <a href="/auth/login.html" class="nav-item" style="color: var(--brand-primary); font-weight: 600;">🚪 Login</a>
            <div style="padding: 0 16px;">
                <a href="/auth/register-citizen.html" class="btn btn-primary" style="width: 100%; margin-top: 10px; display: block;">Join Network</a>
            </div>
        </aside>
        <div class="sidebar-overlay" id="publicSidebarOverlay"></div>
        `;
        el.outerHTML = navHtml;

        setTimeout(() => {
            const toggleBtn = document.getElementById('publicMobileMenuBtn');
            const sidebar = document.getElementById('publicMobileSidebar');
            const overlay = document.getElementById('publicSidebarOverlay');
            if (toggleBtn && sidebar && overlay) {
                toggleBtn.addEventListener('click', () => {
                    sidebar.classList.toggle('open');
                    overlay.classList.toggle('open');
                });
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                });
            }
        }, 100);
    },

    /**
     * Injects the App Navigation Bar into a target element
     */
    renderAppNav(targetId, roleDisplay) {
        const el = document.getElementById(targetId);
        if (!el) return;

        const navHtml = `
        <!-- Background Orbs Injected Globally -->
        <div class="bg-glow-1"></div>
        <div class="bg-glow-2"></div>

        <nav class="navbar" style="border-bottom: 1px solid var(--glass-border);">
            <div class="container nav-container" style="max-width: 100%; padding: 0 40px;">
                <a href="#" class="nav-logo">🐾 JeevCare <span style="font-size:0.9rem; color:#6b7280; margin-left:10px; font-weight:400;">${roleDisplay}</span></a>
                <!-- Mobile Menu Toggle -->
                <button class="mobile-menu-toggle" id="mobileMenuBtn" style="display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer;">☰</button>
                <div class="nav-links">
                    <span id="userName" style="font-weight: 600;"></span>
                    <button onclick="window.API.logout()" class="btn btn-outline" style="padding: 6px 14px; font-size:0.9rem;">Logout</button>
                </div>
            </div>
        </nav>
        `;
        el.outerHTML = navHtml;

        // Load username dynamically if profile exists
        if (window.API && window.API.getToken()) {
            const userStr = localStorage.getItem('jeevcare_user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    const nameEl = document.getElementById('userName');
                    if (nameEl) nameEl.innerText = user.name || 'User';
                } catch (e) { }
            }
        }
    },

    /**
     * Injects the specialized Sidebar based on User Role
     */
    renderSidebar(targetId, role, activePage) {
        const el = document.getElementById(targetId);
        if (!el) return;

        const roleMenus = {
            ngo: [
                { name: 'Dashboard', url: '/ngo/dashboard.html', id: 'dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>` },
                { name: 'Cases Pool', url: '/ngo/cases-pool.html', id: 'pool', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" /></svg>` },
                { name: 'Active Cases', url: '/ngo/active-cases.html', id: 'active', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>` },
                { name: 'Campaign Manager', url: '/ngo/fundraisers.html', id: 'fundraisers', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>` },
                { name: 'Verification & Profile', url: '/ngo/profile.html', id: 'profile', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.001 12.001 0 002.92 12c0 3.072 1.23 5.872 3.24 7.957L12 22.957l5.84-5.004c2.01-2.085 3.24-4.885 3.24-7.957a12.001 12.001 0 00-3.322-8.016z" /></svg>` },
            ],
            citizen: [
                { name: 'Dashboard', url: '/citizen/dashboard.html', id: 'dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>` },
                { name: 'Urgent & Fundraisers', url: '/citizen/urgent-cases.html', id: 'donations', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>` },
                { name: 'Report Emergency', url: '/citizen/report.html', id: 'report', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>` },
                { name: 'My Reports', url: '/citizen/my-reports.html', id: 'history', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>` },
                { name: 'Adopt/Foster', url: '/citizen/adopt.html', id: 'adopt', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>` },
                { name: 'Tele-Triage', url: '/citizen/tele-triage.html', id: 'tele-triage', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>` },
                { name: 'Leaderboard', url: '/citizen/leaderboard.html', id: 'leaderboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>` },
                { name: 'Pet Services', url: '/citizen/services.html', id: 'services', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>` },
                { name: 'My Appointments', url: '/citizen/my-appointments.html', id: 'appointments', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>` },
            ],
            authority: [
                { name: 'Analytics', url: '/authority/dashboard.html', id: 'dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>` },
                { name: 'Broadcast Alerts', url: '/authority/alerts.html', id: 'alerts', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.433 13.317C3.58 13.041 2 11.305 2 9c0-1.657 1.343-3 3-3s3 1.343 3 3c0 1.305-1.58 3.041-3.433 3.317zM12 20h9" /></svg>` },
                { name: 'View Reports', url: '/authority/reports.html', id: 'reports', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>` },
                { name: 'Audit Logs', url: '/authority/audit-logs.html', id: 'audit-logs', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>` },
            ],
            service_provider: [
                { name: 'Provider Hub', url: '/services/dashboard.html', id: 'dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>` },
                { name: 'Availability', url: '/services/availability.html', id: 'availability', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>` },
                { name: 'Bookings', url: '/services/bookings.html', id: 'bookings', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>` },
                { name: 'Adoptions', url: '/services/adoptions.html', id: 'adoptions', isShelterOnly: true, icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>` }
            ],
            admin: [
                { name: 'Admin Dashboard', url: '/admin/dashboard.html', id: 'dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>` },
            ],
            donor: [
                { name: 'Impact Dashboard', url: '/donor/dashboard.html', id: 'dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>` },
            ],
            volunteer: [
                { name: 'Task Board', url: '/volunteer/dashboard.html', id: 'dashboard', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>` },
            ]
        };

        let linksHtml = '';

        if (roleMenus[role]) {
            linksHtml = roleMenus[role].map(m => `
                <a href="${m.url}" id="nav-item-${m.id}" class="nav-item ${activePage === m.id ? 'active' : ''}" style="display: ${m.isShelterOnly ? 'none' : 'flex'}; align-items: center; gap: 8px;">
                    <span style="width: 20px; height: 20px;">${m.icon}</span> ${m.name}
                </a>
            `).join('');
        }

        const sidebarHtml = `
            <aside class="dash-sidebar" id="mobileSidebar">
                ${linksHtml}
                <a href="#" class="nav-item" onclick="window.API.logout()" style="color: var(--color-danger); margin-top: 10px; display: flex; align-items: center; gap: 8px;">
                    <span style="width: 20px; height: 20px;">🚪</span> Logout
                </a>
            </aside>
            <!--Overlay for mobile-->
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
        `;

        el.outerHTML = sidebarHtml;

        // Mobile toggle binding
        setTimeout(() => {
            const toggleBtn = document.getElementById('mobileMenuBtn');
            const sidebar = document.getElementById('mobileSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (toggleBtn && sidebar && overlay) {
                toggleBtn.addEventListener('click', () => {
                    sidebar.classList.toggle('open');
                    overlay.classList.toggle('open');
                });
                overlay.addEventListener('click', () => {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('open');
                });
            }
        }, 100);
    },

};

window.Layout = Layout;
