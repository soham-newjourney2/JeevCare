document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const name = params.get('name');
    const type = params.get('type');

    if (!id) {
        document.getElementById('formTitle').innerText = "Invalid Provider ID";
        document.getElementById('bookingForm').style.display = 'none';
        return;
    }

    if (name) {
        document.getElementById('formTitle').innerText = `Book: ${decodeURIComponent(name)}`;
    }
    if (type) {
        const typeSelect = document.getElementById('serviceType');
        typeSelect.value = type;
        if (!typeSelect.value) {
            typeSelect.innerHTML += `<option value="${escapeHtml(type)}" selected>${escapeHtml(type)}</option>`;
        }
    }

    document.getElementById('providerId').value = id;

    const slotSelect = document.getElementById('slotSelect');
    try {
        const res = await window.API.get(`/services/${id}/slots`);
        let slots = res.data || [];

        if (slots.length === 0) {
            slotSelect.innerHTML = '<option value="">No available slots found for this provider.</option>';
            slotSelect.disabled = true;
            document.getElementById('submitBtn').disabled = true;
        } else {
            slots.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

            slotSelect.innerHTML = '<option value="">Select a slot</option>';
            slots.forEach(slot => {
                const d = new Date(slot.date + 'T' + slot.time);
                const displayDate = d.toLocaleDateString();
                const displayTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                slotSelect.innerHTML += `<option value='${escapeHtml(JSON.stringify({ date: slot.date, time: slot.time }))}'>${escapeHtml(displayDate)} at ${escapeHtml(displayTime)}</option>`;
            });
        }
    } catch (err) {
        slotSelect.innerHTML = `<option value="">Error fetching slots</option>`;
    }
});

document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submitBtn');
    const statusBox = document.getElementById('statusBox');

    const slotVal = document.getElementById('slotSelect').value;
    if (!slotVal) {
        toast("Please select a valid time slot.", 'error');
        return;
    }

    const selectedSlot = JSON.parse(slotVal);

    btn.innerText = "Submitting Request...";
    btn.disabled = true;
    statusBox.style.display = "none";

    const payload = {
        providerId: document.getElementById('providerId').value,
        serviceType: document.getElementById('serviceType').value,
        date: selectedSlot.date,
        timeSlot: selectedSlot.time,
        notes: document.getElementById('notes').value
    };

    try {
        const res = await window.API.post('/services/book', payload);
        statusBox.style.display = 'block';
        statusBox.style.background = "hsla(145, 63%, 42%, 0.1)";
        statusBox.style.color = "var(--color-success)";
        statusBox.innerText = `Success! Appointment requested.`;
        document.getElementById('bookingForm').reset();

        const sel = document.getElementById('slotSelect');
        sel.remove(sel.selectedIndex);
        if (sel.options.length <= 1) { // Only the default option remains
            sel.innerHTML = '<option value="">No more available slots.</option>';
            sel.disabled = true;
            btn.disabled = true;
            btn.innerText = "Request Appointment";
        }
    } catch (e) {
        statusBox.style.display = 'block';
        statusBox.style.background = "hsla(354, 70%, 54%, 0.1)";
        statusBox.style.color = "var(--color-danger)";
        statusBox.innerText = "Error: " + (e.message || "Failed to book");
    } finally {
        if (!btn.disabled || btn.innerText !== "Request Appointment") {
            btn.innerText = "Request Appointment";
            btn.disabled = false;
        }
    }
});
