function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const profileRes = await window.API.get('/auth/profile');
        if (profileRes.data.profile && profileRes.data.profile.serviceType === 'shelter') {
            const adoptionsNav = document.getElementById('nav-item-adoptions');
            if (adoptionsNav) adoptionsNav.classList.remove('d-none');
        }
    } catch (e) { }

    const loadPhysical = async () => {
        const tb = document.getElementById('physicalGrid');
        try {
            const res = await window.API.get('/services/bookings');
            document.getElementById('loaderPhysical').style.display = 'none';
            tb.innerHTML = '';
            if (res.data.length === 0) return tb.innerHTML = '<div class="glass-card text-center p-40 text-muted">No physical bookings found.</div>';

            res.data.forEach(bk => {
                const date = new Date(bk.date).toLocaleDateString();
                const client = bk.citizen ? bk.citizen.name : 'Unknown';

                let actions = '';
                if (bk.status === 'pending') {
                    actions = `
                        <div class="d-flex gap-10">
                            <button class="btn btn-outline btn-outline-danger" data-action="booking-status" data-id="${bk._id}" data-status="cancelled">Decline</button>
                            <button class="btn btn-primary" data-action="booking-status" data-id="${bk._id}" data-status="confirmed">Accept Booking</button>
                        </div>
                    `;
                } else if (bk.status === 'confirmed') {
                    actions = `<button class="btn btn-primary" data-action="booking-status" data-id="${bk._id}" data-status="completed">Mark Completed</button>`;
                }

                tb.innerHTML += `
                <div class="req-card ${bk.status}">
                    <div>
                        <h3 class="mb-5">${escapeHtml(client)}</h3>
                        <p class="text-muted fs-095 mb-10">
                            <strong>Date:</strong> ${escapeHtml(date)} at ${escapeHtml(bk.timeSlot)} &bull; 
                            <strong>Service:</strong> <span class="capitalize">${escapeHtml(bk.serviceType)}</span>
                        </p>
                        <p class="fs-095 text-muted"><strong>Notes:</strong> ${escapeHtml(bk.notes || 'None provided')}</p>
                        <div class="mt-10">
                            <span class="status-pill status-${bk.status}">${bk.status.toUpperCase()}</span>
                        </div>
                    </div>
                    <div>
                        ${actions}
                    </div>
                </div>`;
            });
        } catch (err) {
            document.getElementById('loaderPhysical').innerText = 'Error: ' + err.message;
        }
    };

    const loadVirtual = async () => {
        const tb = document.getElementById('virtualGrid');
        try {
            const res = await window.API.get('/teleconsult');
            document.getElementById('loaderVirtual').style.display = 'none';
            tb.innerHTML = '';
            if (res.data.length === 0) return tb.innerHTML = '<div class="glass-card text-center p-40 text-muted">No virtual consultations found.</div>';

            res.data.forEach(bk => {
                const timeObj = new Date(bk.date + 'T' + bk.timeSlot);
                const displayDate = isNaN(timeObj) ? bk.date : timeObj.toLocaleDateString();
                const displayTime = isNaN(timeObj) ? bk.timeSlot : timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                const client = bk.citizen ? bk.citizen.name : 'Unknown';
                let actions = '';
                if (bk.status === 'requested') {
                    actions = `
                        <div class="d-flex gap-10">
                            <button class="btn btn-outline btn-outline-danger" data-action="consult-status" data-id="${bk._id}" data-status="cancelled">Decline</button>
                            <button class="btn btn-primary" data-action="consult-schedule" data-id="${bk._id}">Accept & Schedule</button>
                        </div>
                    `;
                } else if (bk.status === 'scheduled') {
                    actions = `
                        <div class="d-flex gap-10">
                            <a href="${escapeHtml(safeUrl(bk.meetingLink))}" target="_blank" rel="noopener" class="btn btn-outline">Join Call</a>
                            <button class="btn btn-primary" data-action="consult-status" data-id="${bk._id}" data-status="completed">Mark Done</button>
                        </div>
                    `;
                }

                tb.innerHTML += `
                <div class="req-card ${bk.status === 'requested' ? 'pending' : bk.status}">
                    <div>
                        <h3 class="mb-5">${escapeHtml(client)}</h3>
                        <p class="text-muted fs-095 mb-10">
                            <strong>Date:</strong> ${escapeHtml(displayDate)} at ${escapeHtml(displayTime)} &bull; 
                            <strong>Animal:</strong> <span class="capitalize">${escapeHtml(bk.animalType)}</span>
                        </p>
                        <p class="fs-095 text-muted"><strong>Symptoms:</strong> ${escapeHtml(bk.symptoms)}</p>
                        <div class="mt-10">
                            <span class="status-pill status-${bk.status === 'requested' ? 'pending' : bk.status}">${bk.status.toUpperCase()}</span>
                        </div>
                    </div>
                    <div>
                        ${actions}
                    </div>
                </div>`;
            });
        } catch (err) {
            document.getElementById('loaderVirtual').innerText = 'Error: ' + err.message;
        }
    };

    window.updateBk = async (id, status) => {
        try { await window.API.patch(`/services/bookings/${id}`, { status }); loadPhysical(); }
        catch (err) { toast('Error: ' + err.message, 'error'); }
    };

    window.updateVirtual = async (id, status) => {
        try { await window.API.patch(`/teleconsult/${id}/status`, { status }); loadVirtual(); }
        catch (err) { toast('Error: ' + err.message, 'error'); }
    };

    window.approveVirtual = async (id) => {
        const link = prompt("Paste a video meeting link (Zoom, Meet...), or leave empty to create a free Jitsi room:");
        if (link === null) return;
        try { await window.API.patch(`/teleconsult/${id}/status`, { status: 'scheduled', meetingLink: link.trim() || undefined }); loadVirtual(); }
        catch (err) { toast('Error: ' + err.message, 'error'); }
    };

    loadPhysical();
    loadVirtual();
});

onAction(document, {
    tab: (el) => switchTab(el.dataset.tab),
    'booking-status': (el) => window.updateBk(el.dataset.id, el.dataset.status),
    'consult-status': (el) => window.updateVirtual(el.dataset.id, el.dataset.status),
    'consult-schedule': (el) => window.approveVirtual(el.dataset.id)
});
