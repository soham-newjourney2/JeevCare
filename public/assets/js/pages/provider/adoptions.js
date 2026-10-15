document.addEventListener('DOMContentLoaded', async () => {
    let userId = null;
    try {
        const profileRes = await window.API.get('/auth/profile');
        userId = profileRes.data._id;

        // The Adoptions menu item is only for shelters
        if (profileRes.data.profile && profileRes.data.profile.serviceType === 'shelter') {
            const adoptionsNav = document.getElementById('nav-item-adoptions');
            if (adoptionsNav) adoptionsNav.classList.remove('d-none');
        }
    } catch (e) {
        return window.location.href = '/auth/login.html';
    }

    loadPets(userId);
    loadApplications();

    document.getElementById('addPetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const petData = {
            name: document.getElementById('pName').value,
            species: document.getElementById('pSpecies').value,
            breed: document.getElementById('pBreed').value.trim() || undefined,
            ageMonths: document.getElementById('pAge').value ? Number(document.getElementById('pAge').value) : undefined,
            healthStatus: document.getElementById('pHealth').value,
            description: document.getElementById('pDesc').value
        };
        try {
            await window.API.post('/adoptions', petData);
            toast("Pet profile created!", 'success');
            document.getElementById('addPetForm').reset();
            loadPets(userId);
        } catch (err) {
            toast("Error creating profile: " + err.message, 'error');
        }
    });

    async function loadPets(providerId) {
        const container = document.getElementById('myPetsContainer');
        try {
            const res = await window.API.get(`/adoptions?provider=${providerId}`);
            if (res.data.length === 0) {
                container.innerHTML = '<p>No pets listed currently.</p>';
                return;
            }
            container.innerHTML = res.data.map(p => `
                <div class="pet-card">
                    <h3 class="m-0">${escapeHtml(p.name)} (${escapeHtml(p.species)})</h3>
                    <p>Status: <strong>${escapeHtml(p.status)}</strong></p>
                </div>
            `).join('');
        } catch (err) {
            container.innerHTML = 'Error loading pets.';
        }
    }

    async function loadApplications() {
        const container = document.getElementById('applicationsContainer');
        try {
            const res = await window.API.get('/adoptions/provider/applications');
            const apps = res.data.filter(a => a.status === 'pending');
            if (apps.length === 0) {
                container.innerHTML = '<p>No pending applications.</p>';
                return;
            }
            container.innerHTML = apps.map(a => `
                <div class="app-card">
                    <h4>${escapeHtml(a.applicant.name)} wants to ${escapeHtml(a.applicationType)} ${escapeHtml(a.pet.name)}</h4>
                    <p><strong>Experience:</strong> ${escapeHtml(a.experience)}</p>
                    <p><strong>Home:</strong> ${escapeHtml(a.housingType)}</p>
                    <p class="mb-10"><strong>Reason:</strong> ${escapeHtml(a.reason)}</p>
                    <button class="btn btn-primary" data-action="approve" data-id="${a._id}">Approve</button>
                    <button class="btn btn-outline" data-action="reject" data-id="${a._id}">Reject</button>
                </div>
            `).join('');
        } catch (err) {
            container.innerHTML = 'Error loading applications.';
        }
    }

    window.updateApp = async function (id, status) {
        try {
            await window.API.patch(`/adoptions/applications/${id}/status`, { status });
            toast("Application " + status, 'success');
            loadApplications();
            loadPets(userId);
        } catch (err) {
            toast("Error: " + err.message, 'error');
        }
    }
});

onAction(document, {
    approve: (el) => window.updateApp(el.dataset.id, 'approved'),
    reject: (el) => window.updateApp(el.dataset.id, 'rejected')
});
