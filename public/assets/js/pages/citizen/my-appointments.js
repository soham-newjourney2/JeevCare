document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('appointmentsContainer');
    const loader = document.getElementById('loader');
    const errorMsg = document.getElementById('errorMsg');

    try {
        const res = await window.API.get('/services/my-patient-bookings');
        loader.style.display = 'none';
        container.style.display = 'block';

        if (!res.data || res.data.length === 0) {
            container.innerHTML = `
                <div class="glass-card text-center p-40">
                    <p class="text-muted mb-20">You have no appointments booked.</p>
                    <a href="/citizen/services.html" class="btn btn-primary">Find a Provider</a>
                </div>
            `;
            return;
        }

        let html = '';
        res.data.forEach(bk => {
            const dateObj = new Date(bk.date);
            const displayDate = dateObj.toLocaleDateString();
            const providerName = bk.provider?.profile?.businessName || bk.provider?.name || 'Unknown Provider';

            html += `
                <div class="booking-card">
                    <div class="booking-details">
                        <h4>Appointment with ${escapeHtml(providerName)}</h4>
                        <p><strong>Date:</strong> ${displayDate} | <strong>Time:</strong> ${escapeHtml(bk.timeSlot)}</p>
                        <p><strong>Service:</strong> <span class="capitalize">${escapeHtml(bk.serviceType)}</span></p>
                        <p><strong>Notes:</strong> ${escapeHtml(bk.notes || '--')}</p>
                    </div>
                    <div>
                        <span class="status-pill status-${bk.status === 'cancelled' ? 'resolved' : bk.status}" 
                              ${bk.status === 'cancelled' ? 'style="background: hsla(354, 70%, 54%, 0.1); color: var(--color-danger);"' : ''}>
                            ${bk.status.toUpperCase()}
                        </span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (err) {
        loader.style.display = 'none';
        errorMsg.innerText = 'Error: ' + err.message;
        errorMsg.style.display = 'block';
    }
});
