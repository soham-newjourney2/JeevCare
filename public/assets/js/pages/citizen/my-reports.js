document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('reportsContainer');
    const loader = document.getElementById('loader');
    const emptyState = document.getElementById('emptyState');

    try {
        const res = await window.API.get('/incidents/my-reports');
        const reports = res.data;

        loader.style.display = 'none';

        if (reports.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        reports.forEach(report => {
            const date = new Date(report.createdAt).toLocaleString();
            const urgencyHTML = report.urgencyFlag ? `<span class="urgency-badge">SOS Critical</span>` : '';

            const el = document.createElement('div');
            el.className = 'glass-card report-card';
            el.innerHTML = `
                <div>
                    <div class="grid-header">${escapeHtml(report.animalType)} - ${escapeHtml(report.concernType)} ${urgencyHTML}</div>
                    <div class="meta-text">Reported on: ${date}</div>
                    <div class="meta-text">Location: Lat ${report.location.coordinates[1].toFixed(4)}, Lng ${report.location.coordinates[0].toFixed(4)}</div>
                </div>
                <div class="text-right">
                    <div class="status-pill status-${report.status}">${report.status.replace('_', ' ')}</div>
                    <div class="mt-15">
                        <a href="/citizen/incident-detail.html?id=${report._id}" class="btn btn-outline btn-xs">View Details</a>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });

    } catch (e) {
        loader.innerText = "Error loading reports: " + e.message;
    }
});
