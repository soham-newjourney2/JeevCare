// Next steps for each stage (matches server/services/caseLifecycle.js)
const ACTIONS = {
    accepted: [['dispatch', 'Dispatch team'], ['on_site', 'Team on site'], ['resolved', 'Mark resolved']],
    team_dispatched: [['on_site', 'Team on site'], ['resolved', 'Mark resolved']],
    on_site: [['resolved', 'Mark resolved']]
};
const STAGE_LABEL = { accepted: 'Accepted', team_dispatched: 'Team dispatched', on_site: 'Team on site' };

async function loadCases() {
    const container = document.getElementById('activeContainer');
    const loader = document.getElementById('loader');
    const emptyState = document.getElementById('emptyState');

    try {
        const res = await window.API.get('/ngo/cases');
        const activeCases = res.data.filter(c => !c.isVirtual && ACTIONS[c.status] && c.incident);

        loader.style.display = 'none';
        container.innerHTML = '';
        emptyState.style.display = activeCases.length ? 'none' : 'block';
        container.style.display = activeCases.length ? 'block' : 'none';

        activeCases.forEach(c => {
            const el = document.createElement('div');
            el.className = 'case-card';
            const buttons = ACTIONS[c.status].map(([action, label]) =>
                `<button class="btn ${action === 'resolved' ? 'btn-primary' : 'btn-outline'} btn-sm" data-id="${c._id}" data-action="${action}">${label}</button>`
            ).join('');
            el.innerHTML = `
                <div class="header-bar">
                    <div>
                        <h3 class="m-0">${escapeHtml(c.incident.animalType || 'Unknown')} - ${escapeHtml(c.incident.concernType || 'Unknown')}</h3>
                        <div class="meta mt-10"><strong>Location:</strong> Lat ${c.incident.location?.coordinates[1]?.toFixed(5) || 0}, Lng ${c.incident.location?.coordinates[0]?.toFixed(5) || 0}</div>
                        <div class="meta">${escapeHtml(c.incident.description || '')}</div>
                    </div>
                    <span class="status-pill status-${c.status === 'accepted' ? 'in_progress' : c.status}">${STAGE_LABEL[c.status]}</span>
                </div>
                <div class="d-flex gap-10 flex-wrap mt-15">${buttons}</div>
            `;
            container.appendChild(el);
        });
    } catch (e) {
        loader.innerText = 'Could not load cases: ' + e.message;
    }
}

async function runAction(id, action, button) {
    button.disabled = true;
    try {
        if (action === 'dispatch') {
            await window.API.post(`/ngo/cases/${id}/dispatch`, { ETA: 20 });
            toast('Team dispatched. The reporter has been notified.', 'success');
        } else {
            await window.API.patch(`/ngo/cases/${id}/status`, {
                status: action,
                note: action === 'resolved' ? 'Case successfully resolved by NGO' : 'Team reached the location'
            });
            toast(action === 'resolved' ? 'Case resolved. Great work!' : 'Marked as on site.', 'success');
        }
        loadCases();
    } catch (e) {
        toast(e.message, 'error');
        button.disabled = false;
    }
}

document.getElementById('activeContainer').addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (button) runAction(button.dataset.id, button.dataset.action, button);
});

document.addEventListener('DOMContentLoaded', loadCases);
