document.addEventListener('DOMContentLoaded', async () => {
    try {
        const profile = await window.API.getProfile();
        document.getElementById('userName').innerText = profile.data.name;
        document.getElementById('userNameTitle').innerText = profile.data.name.split(' ')[0];

        const reportsRes = await window.API.get('/incidents/my-reports');
        const reports = reportsRes.data;

        document.getElementById('m_reports').innerText = reports.length;
        document.getElementById('m_active').innerText = reports.filter(r => ['reported', 'assigned', 'in_progress', 'team_dispatched', 'on_site'].includes(r.status)).length;

        const commRes = await window.API.get('/community/me');
        if (commRes.data) {
            document.getElementById('m_score').innerText = commRes.data.trustScore;
            document.getElementById('m_reports').innerText = commRes.data.validReports;
            const badges = commRes.data.badges;
            const badgesHtml = badges.length > 0
                ? badges.map(b => `<span class="status-pill badge-gold">🎖️ ${escapeHtml(b)}</span>`).join(' ')
                : '<span class="text-muted">No badges yet - keep reporting to earn them!</span>';
            document.getElementById('badgesContainer').innerHTML = badgesHtml;
        }

        const socket = io({ auth: { token: window.API.getToken() } });
        socket.on('status_update', (data) => {
            toast(data.message, 'success');
            setTimeout(() => window.location.reload(), 2500);
        });

        // City-wide alerts sent by authorities
        socket.on('authority_broadcast', (data) => {
            const banner = document.getElementById('broadcastBanner');
            banner.className = 'notice-banner' + (data.severity === 'critical' ? ' critical' : '');
            banner.textContent = `City alert${data.targetArea && data.targetArea !== 'all' ? ' (' + data.targetArea + ')' : ''}: ${data.message}`;
            banner.style.display = 'block';
        });

    } catch (e) {
        console.error("Dashboard error:", e);
    }
});
