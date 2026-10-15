// "14 months" -> "1 yr 2 mo"; returns null when the age is unknown
function formatAge(months) {
    if (months === undefined || months === null) return null;
    const y = Math.floor(months / 12), m = months % 12;
    return [y ? y + ' yr' : '', m ? m + ' mo' : ''].filter(Boolean).join(' ') || 'Under 1 mo';
}

document.addEventListener('DOMContentLoaded', async () => {
    loadAvailablePets();

    document.getElementById('applyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const petId = document.getElementById('petId').value;
        const data = {
            applicationType: document.getElementById('aType').value,
            experience: document.getElementById('aExp').value,
            housingType: document.getElementById('aHouse').value,
            reason: document.getElementById('aReason').value
        };
        try {
            await window.API.post(`/adoptions/${petId}/apply`, data);
            toast("Application submitted successfully! The shelter will review it and get back to you.", 'success');
            closeModal();
        } catch (err) {
            toast("Error: " + err.message, 'error');
        }
    });
});

async function loadAvailablePets() {
    const container = document.getElementById('petsContainer');
    try {
        const res = await window.API.get('/adoptions');
        if (res.data.length === 0) {
            container.innerHTML = '<p>No pets currently available for adoption.</p>';
            container.style.display = 'block';
            return;
        }
        container.innerHTML = res.data.map(p => `
            <div class="glass-card p-24 d-flex flex-col">
                <div class="fs-3 mb-10 text-center">🐾</div>
                <h3 class="text-center mb-5">${escapeHtml(p.name)}</h3>
                <p class="text-center text-muted mb-15">${escapeHtml([p.species, p.breed && p.breed !== 'Unknown' ? p.breed : null, formatAge(p.ageMonths), p.healthStatus].filter(Boolean).join(' • '))}</p>
                <p class="mb-15 flex-1">${escapeHtml(p.description)}</p>
                <p class="mb-20 text-muted"><strong>Rescued by:</strong> ${escapeHtml(p.provider ? p.provider.name : 'Verified Shelter')}</p>
                <button class="btn btn-primary w-100 mt-auto" data-name="${escapeHtml(p.name)}" data-action="apply" data-id="${p._id}">Apply Now</button>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = 'Error loading pets.';
    }
}

function openModal(petId, petName) {
    document.getElementById('petId').value = petId;
    document.getElementById('modalTitle').innerText = `Apply for ${petName}`;
    document.getElementById('applyModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('applyModal').style.display = 'none';
    document.getElementById('applyForm').reset();
}

onAction(document, {
    apply: (el) => openModal(el.dataset.id, el.dataset.name),
    'close-modal': () => closeModal()
});
