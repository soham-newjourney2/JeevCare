document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('campaignsContainer');
    const loader = document.getElementById('loader');

    const loadCampaigns = async () => {
        try {
            const res = await window.API.get('/donations');
            const campaigns = res.data;

            loader.style.display = 'none';
            container.style.display = 'grid';
            container.innerHTML = '';

            if (campaigns.length === 0) {
                container.innerHTML = '<div class="glass-card text-center col-span-all"><h3>No Active Campaigns</h3><p>There are currently no urgent fundraising requests from NGOs.</p></div>';
                return;
            }

            campaigns.forEach(camp => {
                const percent = Math.min(100, (camp.currentAmount / camp.targetAmount) * 100);

                const el = document.createElement('div');
                el.className = 'glass-card fundraiser-card';
                el.innerHTML = `
                    <div>
                        <span class="status-pill status-assigned mb-10 fs-075">${escapeHtml(camp.ngo ? camp.ngo.name : 'Verified NGO')}</span>
                        <h3 class="fs-12 mb-10">${escapeHtml(camp.title)}</h3>
                        <p class="fs-09 text-muted mb-15 line-clamp-3">${escapeHtml(camp.description)}</p>
                    </div>
                    
                    <div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                        </div>
                        <div class="campaign-stats">
                            <span>₹${camp.currentAmount.toLocaleString()} raised</span>
                            <span>Goal: ₹${camp.targetAmount.toLocaleString()}</span>
                        </div>
                        
                        <button class="btn btn-primary w-100" data-title="${escapeHtml(camp.title)}" data-ngo="${escapeHtml(camp.ngo ? camp.ngo.name : 'NGO')}" data-action="donate" data-id="${camp._id}">Support Cause</button>
                    </div>
                `;
                container.appendChild(el);
            });

        } catch (e) {
            loader.innerText = "Error loading campaigns: " + e.message;
        }
    };

    const loadHistory = async () => {
        const box = document.getElementById('historyContainer');
        try {
            const res = await window.API.get('/donations/history');
            if (res.data.length === 0) {
                box.innerHTML = '<p class="text-muted">You haven\'t donated yet. Every contribution helps an animal in need.</p>';
                return;
            }
            const total = res.data.reduce((sum, d) => sum + d.amount, 0);
            box.innerHTML = `
                <p class="mb-15">You've given <strong>₹${total.toLocaleString('en-IN')}</strong> across ${res.data.length} donation${res.data.length === 1 ? '' : 's'}.</p>
                ${res.data.map(d => `
                    <div class="d-flex justify-between gap-10 border-t py-10">
                        <span>${escapeHtml(d.campaign ? d.campaign.title : 'Campaign')}<br><span class="fs-08 text-muted">${new Date(d.createdAt).toLocaleDateString()} · ${escapeHtml(d.transactionId || '')}</span></span>
                        <strong class="nowrap">₹${d.amount.toLocaleString('en-IN')}</strong>
                    </div>`).join('')}
                <p class="fs-08 text-muted mt-10">Payments in this demo are simulated. No real money is charged.</p>`;
        } catch (e) {
            box.innerText = 'Could not load your donations: ' + e.message;
        }
    };

    window.openModal = (id, title, ngo) => {
        document.getElementById('activeCampaignId').value = id;
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalNgo').innerText = 'Fundraiser by: ' + ngo;
        document.getElementById('donationAmount').value = '';
        document.getElementById('modalError').style.display = 'none';
        document.getElementById('donationModal').style.display = 'flex';
    };

    window.closeModal = () => {
        document.getElementById('donationModal').style.display = 'none';
    };

    window.processDonation = async () => {
        const id = document.getElementById('activeCampaignId').value;
        const amt = document.getElementById('donationAmount').value;
        const errBox = document.getElementById('modalError');
        const btn = document.getElementById('donateBtn');

        if (!amt || isNaN(amt) || amt <= 0) {
            errBox.innerText = 'Please enter a valid amount.';
            errBox.style.display = 'block';
            return;
        }

        btn.innerText = 'Processing...';
        btn.disabled = true;

        try {
            const res = await window.API.post('/donations/donate', {
                campaignId: id,
                amount: Number(amt)
            });

            toast(res.message, 'success');
            closeModal();
            loadCampaigns();
            loadHistory();
        } catch (e) {
            errBox.innerText = e.message;
            errBox.style.display = 'block';
        } finally {
            btn.innerText = 'Donate Now';
            btn.disabled = false;
        }
    };

    loadCampaigns();
    loadHistory();
});

onAction(document, {
    donate: (el) => window.openModal(el.dataset.id, el.dataset.title, el.dataset.ngo),
    'confirm-donation': () => window.processDonation(),
    'close-modal': () => window.closeModal()
});
