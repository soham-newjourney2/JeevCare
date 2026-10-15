document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('servicesContainer');
    const loader = document.getElementById('loader');

    try {
        const res = await window.API.get('/services');
        const providers = res.data;

        loader.style.display = 'none';

        if (providers.length === 0) {
            container.style.display = 'block';
            container.innerHTML = '<div class="glass-card text-center col-span-all"><h3>No Services Found</h3><p>There are currently no verified service providers on the platform.</p></div>';
            return;
        }

        container.style.display = 'grid';
        providers.forEach(prov => {
            const el = document.createElement('div');
            el.className = 'service-card';
            el.innerHTML = `
                <div class="sv-type">${escapeHtml(prov.serviceType)}</div>
                <h3 class="mb-5">${escapeHtml(prov.businessName)}</h3>
                <p class="text-muted fs-09 mb-20">★ ${prov.rating} / 5</p>
                <a href="/citizen/book-service.html?id=${prov._id}&name=${encodeURIComponent(prov.businessName)}&type=${encodeURIComponent(prov.serviceType)}" class="btn btn-outline w-100">Book Appointment</a>
            `;
            container.appendChild(el);
        });

    } catch (e) {
        loader.innerText = "Error loading services: " + e.message;
    }
});
