document.addEventListener('DOMContentLoaded', async () => {
    try {
        const profile = await window.API.getProfile();
        document.getElementById('userName').innerText = profile.data.name;

        const ngoDataRes = await window.API.get('/ngo/profile');
        if (!ngoDataRes.data.isVerified) {
            document.getElementById('unverifiedAlert').style.display = 'block';
        }

        const [casesRes, statsRes] = await Promise.all([
            window.API.get('/ngo/cases'),          // includes open cases nearby that anyone can claim
            window.API.get('/ngo/analytics')       // counts of this NGO's own cases
        ]);

        const pool = casesRes.data.filter(c => c.status === 'pending_acceptance').length;

        document.getElementById('m_pool').innerText = pool;
        document.getElementById('m_active').innerText = statsRes.data.active;
        document.getElementById('m_resolved').innerText = statsRes.data.resolved;

        if (pool > 0) {
            const pb = document.getElementById('poolBadge');
            if (pb) {
                pb.innerText = pool;
                pb.style.display = 'inline-block';
            }
        }

        const socket = io({ auth: { token: window.API.getToken() } });
        socket.on('case_assigned', (data) => {
            toast(`New case assigned: ${data.animalType}. Updating your dashboard...`, 'info');
            setTimeout(() => window.location.reload(), 2500);
        });

    } catch (e) { console.error(e); }
});
