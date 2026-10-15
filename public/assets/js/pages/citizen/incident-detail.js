document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        document.getElementById('titleText').innerText = "Invalid Case ID";
        return;
    }

    try {
        const res = await window.API.get(`/incidents/${id}`);
        const incident = res.data;

        document.getElementById('titleText').innerText = `Case Details: ${incident.animalType}`;

        const sb = document.getElementById('statusBadge');
        sb.innerText = incident.status.replace(/_/g, ' ').toUpperCase();
        sb.className = `status-pill status-${incident.status}`;

        document.getElementById('d_animal').innerText = incident.animalType;
        document.getElementById('d_concern').innerText = incident.concernType;
        document.getElementById('d_desc').innerText = incident.description;
        document.getElementById('d_loc').innerText = `${incident.location.coordinates[1]}, ${incident.location.coordinates[0]}`;

        if (incident.imageUrl) {
            document.getElementById('imageBox').style.display = 'block';
            document.getElementById('d_img').src = incident.imageUrl;
        }

        // One step per stage of the rescue (matches server/services/caseLifecycle.js)
        const STAGES = [
            ['reported', 'Report received'],
            ['assigned', 'Sent to the nearest rescue NGO'],
            ['in_progress', 'NGO accepted the case'],
            ['team_dispatched', 'Rescue team on the way'],
            ['on_site', 'Rescue team reached the animal'],
            ['resolved', 'Animal rescued. Case resolved']
        ];
        const reached = incident.status === 'closed' ? STAGES.length - 1 : STAGES.findIndex(s => s[0] === incident.status);
        const timeline = document.getElementById('timelineContainer');
        timeline.innerHTML = '';

        if (incident.status === 'duplicate' || incident.status === 'false_report') {
            timeline.innerHTML = `
                <div class="timeline-item">
                    <div class="timeline-date">${new Date(incident.createdAt).toLocaleString()}</div>
                    <div>Report received</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-date">Review</div>
                    <div>${incident.status === 'duplicate'
                        ? 'Someone already reported this animal nearby, so your report was linked to that case.'
                        : 'An authority reviewed this report and marked it as not genuine.'}</div>
                </div>`;
        } else {
            STAGES.forEach(([key, label], i) => {
                if (i > reached) return;
                timeline.innerHTML += `
                    <div class="timeline-item">
                        <div class="timeline-date">${i === 0 ? new Date(incident.createdAt).toLocaleString() : 'Step ' + (i + 1)}</div>
                        <div>${label}</div>
                    </div>`;
            });
            if (reached >= 1) {
                document.getElementById('ngoBox').style.display = 'block';
                document.getElementById('ngoNameText').innerText = 'A verified rescue NGO is handling this case.';
            }
        }

        const socket = io({ auth: { token: window.API.getToken() } });
        socket.on('status_update', (data) => {
            if (data.incidentId === id) {
                window.location.reload();
            }
        });

    } catch (e) {
        document.getElementById('titleText').innerText = "Error: " + e.message;
    }
});
