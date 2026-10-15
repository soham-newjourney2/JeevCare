document.addEventListener('DOMContentLoaded', async () => {
    const vetSelect = document.getElementById('tVet');
    const slotSelect = document.getElementById('tSlot');

    try {
        const res = await window.API.get('/teleconsult/vets');
        if (!res.data || res.data.length === 0) {
            vetSelect.innerHTML = '<option value="">No vets available right now.</option>';
        } else {
            vetSelect.innerHTML = '<option value="">-- Choose --</option>' + res.data.map(v => `<option value="${v._id}">${escapeHtml(v.businessName || v.name)} (${v.slotsAvailable} slots)</option>`).join('');
        }
    } catch (err) {
        vetSelect.innerHTML = '<option value="">Error loading vets.</option>';
    }

    vetSelect.addEventListener('change', async (e) => {
        const vetId = e.target.value;
        if (!vetId) {
            slotSelect.innerHTML = '<option value="">Select a vet first...</option>';
            slotSelect.disabled = true;
            return;
        }

        slotSelect.innerHTML = '<option value="">Loading slots...</option>';
        slotSelect.disabled = true;

        try {
            const res = await window.API.get(`/services/${vetId}/slots`);
            let slots = res.data || [];

            if (slots.length === 0) {
                slotSelect.innerHTML = '<option value="">No available slots found.</option>';
            } else {
                slots.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

                slotSelect.innerHTML = '<option value="">Select a slot</option>';
                slots.forEach(slot => {
                    const d = new Date(slot.date + 'T' + slot.time);
                    const displayDate = d.toLocaleDateString();
                    const displayTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    slotSelect.innerHTML += `<option value='${escapeHtml(JSON.stringify({ date: slot.date, time: slot.time }))}'>${escapeHtml(displayDate)} at ${escapeHtml(displayTime)}</option>`;
                });
                slotSelect.disabled = false;
            }
        } catch (err) {
            slotSelect.innerHTML = `<option value="">Error fetching slots</option>`;
        }
    });

    loadConsults();

    document.getElementById('bookForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const slotVal = document.getElementById('tSlot').value;
        if (!slotVal) {
            toast("Please select a valid time slot.", 'error');
            return;
        }

        const selectedSlot = JSON.parse(slotVal);

        const data = {
            vet: document.getElementById('tVet').value,
            animalType: document.getElementById('tAnimal').value,
            symptoms: document.getElementById('tSymptoms').value,
            date: selectedSlot.date,
            timeSlot: selectedSlot.time
        };

        if (!data.vet) return toast("Please select a vet.", 'error');
        try {
            await window.API.post('/teleconsult', data);
            toast("Consultation requested successfully.", 'success');
            document.getElementById('bookForm').reset();
            document.getElementById('tSlot').innerHTML = '<option value="">Select a vet first...</option>';
            document.getElementById('tSlot').disabled = true;
            loadConsults();
        } catch (err) {
            toast("Error: " + err.message, 'error');
        }
    });
});

async function loadConsults() {
    const container = document.getElementById('consultsList');
    try {
        const res = await window.API.get('/teleconsult');
        if (res.data.length === 0) {
            container.innerHTML = '<p>No past or upcoming consultations.</p>';
            return;
        }
        container.innerHTML = res.data.map(c => {
            const timeObj = new Date(c.date + 'T' + c.timeSlot);
            const timeStr = isNaN(timeObj) ? `${c.date} ${c.timeSlot}` : timeObj.toLocaleString();

            const action = c.status === 'scheduled' && c.meetingLink
                ? `<a href="${escapeHtml(safeUrl(c.meetingLink))}" target="_blank" rel="noopener" class="btn btn-primary mt-10 d-inline-block btn-xs">Join Meeting</a>`
                : '';
            return `
            <div class="consult-card">
                <h4 class="m-0">With ${escapeHtml(c.vet.name)}</h4>
                <p><strong>Time:</strong> ${escapeHtml(timeStr)}</p>
                <p><strong>Symptoms:</strong> ${escapeHtml(c.symptoms)}</p>
                <p>Status: <strong class="capitalize">${escapeHtml(c.status)}</strong></p>
                ${action}
            </div>
        `}).join('');
    } catch (err) {
        container.innerHTML = "Error loading consults.";
    }
}
