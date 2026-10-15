document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await window.API.get('/authority/analytics');
        const data = res.data;

        document.getElementById('m_total').innerText = data.totalIncidents;
        document.getElementById('m_active').innerText = data.activeCases;
        document.getElementById('m_closed').innerText = data.closedCases;

    } catch (e) {
        console.error("Dashboard error:", e);
    }
});
