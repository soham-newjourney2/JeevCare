document.addEventListener('DOMContentLoaded', async () => {
    const lc = document.getElementById('logsCard');
    const container = document.getElementById('logsContainer');
    const loader = document.getElementById('loader');

    try {
        const res = await window.API.get('/authority/audit-logs');
        const logs = res.data;

        loader.style.display = 'none';
        lc.style.display = 'block';

        if (logs.length === 0) {
            container.innerHTML = '<p>No audit logs found.</p>';
            return;
        }

        logs.forEach(log => {
            const date = new Date(log.createdAt).toLocaleString();
            const userName = log.performedBy ? log.performedBy.name : 'Unknown User';
            const userRole = log.performedBy ? log.performedBy.role : 'N/A';

            const el = document.createElement('div');
            el.className = 'log-entry';
            el.innerHTML = `
                <span class="text-muted">[${date}]</span> 
                <span class="log-action">${escapeHtml(log.action)}</span> by 
                <strong>${escapeHtml(userName)} (${escapeHtml(userRole)})</strong> 
                &rarr; Target: ${log.targetModel} [${log.targetId || 'N/A'}]
            `;
            container.appendChild(el);
        });
    } catch (err) {
        loader.innerText = 'Failed to load audit logs: ' + err.message;
    }
});
