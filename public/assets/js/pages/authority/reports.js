document.addEventListener('DOMContentLoaded', async () => {
    const tc = document.getElementById('tableCard');
    const tb = document.getElementById('reportsBody');
    const loader = document.getElementById('loader');

    const loadCases = async () => {
        try {
            const res = await window.API.get('/authority/cases');
            const cases = res.data;

            loader.style.display = 'none';
            tc.style.display = 'block';
            tb.innerHTML = '';

            cases.forEach(incident => {
                const date = new Date(incident.createdAt).toLocaleDateString();
                const reporter = incident.reporter ? incident.reporter.name : 'Anonymous';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="border-b">${date}</td>
                    <td class="border-b">${escapeHtml(reporter)}</td>
                    <td class="border-b">${escapeHtml(incident.animalType)}</td>
                    <td class="border-b">
                        <span class="status-pill status-${incident.status}">${incident.status.replace('_', ' ')}</span>
                    </td>
                    <td class="border-b text-right">
                        ${!['false_report', 'resolved', 'closed'].includes(incident.status) ? `<button class="btn btn-outline btn-xs btn-outline-danger" data-action="mark-false" data-id="${incident._id}">Flag as False</button>` : `<span class="text-muted fs-08">Flagged</span>`}
                    </td>
                `;
                tb.appendChild(tr);
            });
        } catch (err) {
            loader.innerText = 'Failed to load cases: ' + err.message;
        }
    };

    window.markFalse = async (id) => {
        if (confirm('Are you sure you want to mark this incident as a FALSE REPORT? This will penalize the reporter.')) {
            try {
                await window.API.patch(`/authority/cases/${id}/mark-false`);
                toast('Marked as false report successfully.', 'success');
                loadCases();
            } catch (err) {
                toast('Error: ' + err.message, 'error');
            }
        }
    };

    loadCases();
});

onAction(document, {
    'mark-false': (el) => window.markFalse(el.dataset.id)
});
