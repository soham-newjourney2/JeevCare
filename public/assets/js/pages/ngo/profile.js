document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('profileContainer');
    const loader = document.getElementById('loader');

    try {
        const res = await window.API.get('/ngo/profile');
        const profile = res.data;

        document.getElementById('orgName').innerText = profile.organizationName || 'Not Set';
        document.getElementById('pocName').innerText = 'Point of Contact: ' + (profile.user?.name || '---');
        document.getElementById('pEmail').innerText = profile.user?.email || '---';
        document.getElementById('regNumber').innerText = profile.registrationNumber || 'Not Provided';
        document.getElementById('pDate').innerText = new Date(profile.createdAt).toLocaleDateString();

        const badgeContainer = document.getElementById('verifyBadgeContainer');
        if (profile.isVerified) {
            badgeContainer.innerHTML = '<span class="verified-badge">✓ Verified Partner</span>';
        } else {
            badgeContainer.innerHTML = '<span class="unverified-badge">⚠️ Pending Verification</span>';
        }

        loader.style.display = 'none';
        container.style.display = 'block';

    } catch (e) {
        loader.innerText = "Error loading profile: " + e.message;
    }
});
