document.addEventListener('DOMContentLoaded', async () => {
    try {
        try {
            const profileRes = await window.API.get('/auth/profile');
            if (profileRes.data && profileRes.data.name) {
                document.getElementById('bizName').innerText = profileRes.data.name;
            }
            if (profileRes.data.profile && profileRes.data.profile.serviceType === 'shelter') {
                const adoptionsNav = document.getElementById('nav-item-adoptions');
                if (adoptionsNav) adoptionsNav.classList.remove('d-none');
            }
        } catch (e) { console.error('Failed to load profile', e) }

        const bookingsRes = await window.API.get('/services/bookings');
        const pBookings = bookingsRes.data || [];

        // Pending count includes tele-consult requests
        let tPendingCount = 0;
        try {
            const tRes = await window.API.get('/teleconsult');
            tPendingCount = (tRes.data || []).filter(b => b.status === 'requested').length;
        } catch (e) { }

        const pending = pBookings.filter(b => b.status === 'pending').length + tPendingCount;
        const confirmed = pBookings.filter(b => b.status === 'confirmed').length;

        document.getElementById('statPending').innerText = pending;
        document.getElementById('statConfirmed').innerText = confirmed;

        const slotsRes = await window.API.get('/services/slots');
        document.getElementById('statSlots').innerText = slotsRes.data ? slotsRes.data.length : 0;

    } catch (e) {
        console.error("Dashboard error:", e);
        document.getElementById('statPending').innerText = "err";
        document.getElementById('statConfirmed').innerText = "err";
        document.getElementById('statSlots').innerText = "err";
    }
});
