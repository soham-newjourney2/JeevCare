document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await window.API.get('/community/leaderboard');
        if (res.data.length === 0) {
            document.getElementById('leaderboardList').innerHTML = '<p class="p-20">No ranking data yet.</p>';
            return;
        }
        document.getElementById('leaderboardList').innerHTML = res.data.map((c, i) => {
            let rankClass = `top-${i + 1}`;
            let badges = c.badges.map(b => `<span class="badge-tag">${escapeHtml(b)}</span>`).join('');
            return `
                <div class="leaderboard-row">
                    <div class="d-flex items-center">
                        <div class="rank ${rankClass}">#${i + 1}</div>
                        <div>
                            <h3 class="m-0">${escapeHtml(c.user ? c.user.name : 'Anonymous')}</h3>
                            <div class="mt-5">${badges}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="fs-12 fw-700 text-brand">${c.trustScore}</div>
                        <div class="fs-08 text-muted">Trust Score</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        document.getElementById('leaderboardList').innerHTML = '<p class="p-20 text-danger">Error loading leaderboard.</p>';
    }
});
