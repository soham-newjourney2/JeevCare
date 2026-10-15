const renderSlots = (slots) => {
    const container = document.getElementById('slotsContainer');
    if (!slots || slots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="fs-3 mb-15">📅</div>
                <h3 class="mb-5">Your calendar is completely open</h3>
                <p class="text-muted mx-auto mw-300">You have no published time slots. Use the control panel to start accepting bookings.</p>
            </div>
        `;
        return;
    }

    const grouped = {};
    slots.forEach(slot => {
        const dateObj = new Date(slot.date + 'T' + slot.time);

        if (isNaN(dateObj)) return;

        const dictKey = slot.date;
        if (!grouped[dictKey]) {
            const options = { weekday: 'long', month: 'short', day: 'numeric' };
            grouped[dictKey] = {
                niceHeader: dateObj.toLocaleDateString('en-US', options),
                slots: []
            };
        }

        const displayTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        grouped[dictKey].slots.push({ ...slot, displayTime, timeObj: dateObj });
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b));

    let html = '';
    sortedDates.forEach(dateStr => {
        const group = grouped[dateStr];

        group.slots.sort((a, b) => a.timeObj - b.timeObj);

        let slotsHtml = '';
        group.slots.forEach(s => {
            slotsHtml += `
                <div class="slot-block">
                    <span class="time-badge">🕒 ${escapeHtml(s.displayTime)}</span>
                    <button class="btn btn-outline text-danger border-0 btn-xs" data-action="remove-slot" data-id="${s._id}">Remove</button>
                </div>
            `;
        });

        html += `
            <div class="agenda-day">
                <div class="agenda-header">
                    🗓️ ${escapeHtml(group.niceHeader)}
                </div>
                ${slotsHtml}
            </div>
        `;
    });

    container.innerHTML = html;
};

const loadSlots = async () => {
    try {
        try {
            const profileRes = await window.API.get('/auth/profile');
            if (profileRes.data.profile && profileRes.data.profile.serviceType === 'shelter') {
                const adoptionsNav = document.getElementById('nav-item-adoptions');
                if (adoptionsNav) adoptionsNav.classList.remove('d-none');
            }
        } catch (e) { }
        const res = await window.API.get('/services/slots');
        renderSlots(res.data);
    } catch (err) {
        document.getElementById('slotsContainer').innerHTML = `<div class="empty-state"><p class="text-danger">Error: ${escapeHtml(err.message)}</p></div>`;
    }
};

document.getElementById('addSlotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('slotDate').value;
    const time = document.getElementById('slotTime').value;
    const errorDiv = document.getElementById('errorMsg');
    errorDiv.style.display = 'none';

    try {
        const res = await window.API.post('/services/slots', { date, time });
        renderSlots(res.data);
        document.getElementById('addSlotForm').reset();
    } catch (err) {
        errorDiv.innerText = err.message || 'Failed to add slot';
        errorDiv.style.display = 'block';
    }
});

window.removeSlot = async (id) => {
    try {
        const res = await window.API.delete(`/services/slots/${id}`);
        renderSlots(res.data);
    } catch (err) {
        toast('Error removing slot: ' + err.message, 'error');
    }
};

document.addEventListener('DOMContentLoaded', loadSlots);

onAction(document, {
    'remove-slot': (el) => window.removeSlot(el.dataset.id)
});
