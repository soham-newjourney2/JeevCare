document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('campaignsContainer');
    const loader = document.getElementById('loader');

    const loadMyCampaigns = async () => {
        try {
            const res = await window.API.get('/donations');
            const campaigns = res.data;

            loader.style.display = 'none';
            container.style.display = 'grid';
            container.innerHTML = '';

            if (campaigns.length === 0) {
                container.innerHTML = '<div class="glass-card text-center col-span-all"><h3>No Active Campaigns</h3><p>You have not launched any fundraisers yet.</p></div>';
                return;
            }

            campaigns.forEach(camp => {
                const percent = Math.min(100, (camp.currentAmount / camp.targetAmount) * 100);

                const el = document.createElement('div');
                el.className = 'glass-card campaign-card';
                el.innerHTML = `
                    <div class="d-flex justify-between items-start mb-10">
                        <h3 class="fs-12 mb-5">${escapeHtml(camp.title)}</h3>
                        <span class="status-pill status-${camp.status === 'active' ? 'assigned' : 'resolved'} fs-075">${camp.status.toUpperCase()}</span>
                    </div>
                    <p class="fs-09 text-muted mb-15 line-clamp-2">${escapeHtml(camp.description)}</p>
                    
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                    </div>
                    <div class="campaign-stats">
                        <span>₹${camp.currentAmount.toLocaleString()} Raised</span>
                        <span>Goal: ₹${camp.targetAmount.toLocaleString()}</span>
                    </div>
                `;
                container.appendChild(el);
            });

        } catch (e) {
            loader.innerText = "Error loading campaigns: " + e.message;
        }
    };

    window.openCreateModal = () => {
        document.getElementById('createModal').style.display = 'flex';
    };

    window.closeCreateModal = () => {
        document.getElementById('createModal').style.display = 'none';
        document.getElementById('campaignForm').reset();
        document.getElementById('modalError').style.display = 'none';
    };

    document.getElementById('campaignForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = document.getElementById('modalError');
        const btn = document.getElementById('submitBtn');

        btn.innerText = 'Creating...';
        btn.disabled = true;

        try {
            const payload = {
                title: document.getElementById('campTitle').value,
                description: document.getElementById('campDesc').value,
                targetAmount: Number(document.getElementById('campTarget').value)
            };

            const caseId = document.getElementById('campCase').value;
            if (caseId) payload.relatedCase = caseId;

            await window.API.post('/donations', payload);

            closeCreateModal();
            loadMyCampaigns();
        } catch (err) {
            errBox.innerText = err.message;
            errBox.style.display = 'block';
        } finally {
            btn.innerText = 'Launch Campaign';
            btn.disabled = false;
        }
    });

    loadMyCampaigns();
});

onAction(document, {
    'open-create': () => window.openCreateModal(),
    'close-create': () => window.closeCreateModal()
});
