document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('poolContainer');
    const loader = document.getElementById('loader');
    const emptyState = document.getElementById('emptyState');

    try {
        const res = await window.API.get('/ngo/cases');
        const poolCases = res.data.filter(c => c.status === 'pending_acceptance');

        loader.style.display = 'none';

        if (poolCases.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        poolCases.forEach(c => {
            const el = document.createElement('div');
            el.className = 'glass-card case-card';
            el.innerHTML = `
                <div class="header-bar">
                    <h3 class="m-0">${escapeHtml(c.incident?.animalType || 'Unknown')} - ${escapeHtml(c.incident?.concernType || 'Unknown')}</h3>
                    ${c.incident?.urgencyFlag ? '<span class="urgent-tag">🔴 CRITICAL SOS</span>' : ''}
                </div>
                <div class="meta"><strong>Location:</strong> Lat ${c.incident?.location?.coordinates[1]?.toFixed(5) || 0}, Lng ${c.incident?.location?.coordinates[0]?.toFixed(5) || 0}</div>
                <div class="meta"><strong>Time:</strong> ${new Date(c.assignedAt || Date.now()).toLocaleString()}</div>
                <p class="mt-15">${escapeHtml(c.incident?.description || 'No description')}</p>
                
                <div class="actions">
                    <button data-action="accept" data-id="${c._id}" class="btn btn-primary btn-sm">Accept & Deploy</button>
                    <button data-action="pass" data-id="${c._id}" class="btn btn-outline text-muted btn-sm">Pass Case</button>
                </div>
            `;
            container.appendChild(el);
        });

    } catch (e) {
        loader.innerText = "Error: " + e.message;
    }
});

async function acceptCase(assignmentId) {
    try {
        await window.API.patch(`/ngo/cases/${assignmentId}/accept`, {});
        toast("Case accepted. You will find it under Active Cases.", 'success');
        setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
        toast("Failed to accept: " + e.message, 'error');
    }
}

async function passCase(assignmentId) {
    try {
        await window.API.patch(`/ngo/cases/${assignmentId}/reject`, {});
        toast("Case passed. It will be offered to another NGO.", 'success');
        setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
        toast("Failed to pass case: " + e.message, 'error');
    }
}

onAction(document, {
    accept: (el) => acceptCase(el.dataset.id),
    pass: (el) => passCase(el.dataset.id)
});
