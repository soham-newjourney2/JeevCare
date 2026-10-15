function getLocation() {
    if (navigator.geolocation) {
        document.getElementById('mapWarning').innerText = "Detecting location...";
        document.getElementById('mapWarning').style.color = "var(--brand-dark)";
        navigator.geolocation.getCurrentPosition((position) => {
            document.getElementById('lat').value = position.coords.latitude;
            document.getElementById('lng').value = position.coords.longitude;
            document.getElementById('mapWarning').innerText = "✓ Location detected.";
            document.getElementById('mapWarning').style.color = "var(--color-success)";
        }, () => {
            showManualEntry("We couldn't detect your location. Type the latitude and longitude instead, or try again.");
        });
    } else {
        showManualEntry("This browser can't detect location. Type the latitude and longitude instead.");
    }
}

// Show the problem inline and let the user type coordinates instead
function showManualEntry(message) {
    const warning = document.getElementById('mapWarning');
    warning.innerText = message;
    warning.style.color = "var(--color-warning)";
    document.getElementById('lat').removeAttribute('readonly');
    document.getElementById('lng').removeAttribute('readonly');
    document.getElementById('lat').placeholder = 'e.g. 19.0760';
    document.getElementById('lng').placeholder = 'e.g. 72.8777';
}

document.getElementById('incidentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submitBtn');
    const statusBox = document.getElementById('statusBox');

    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;

    if (!lat || !lng) {
        showManualEntry("Tap \"Detect Current Location\" or type the latitude and longitude so we can route this case.");
        document.getElementById('mapWarning').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    btn.innerText = "Processing & Routing...";
    btn.disabled = true;
    statusBox.style.display = "none";

    const formData = new FormData();
    formData.append('animalType', document.getElementById('animalType').value);
    formData.append('concernType', document.getElementById('concernType').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('latitude', lat);
    formData.append('longitude', lng);
    formData.append('urgencyFlag', document.getElementById('urgencyFlag').checked);

    const imageFile = document.getElementById('image').files[0];
    if (imageFile) formData.append('image', imageFile);

    try {
        const res = await window.API.post('/incidents', formData);

        statusBox.style.display = 'block';
        if (res.data && res.data.status === 'duplicate') {
            statusBox.style.background = "hsla(38, 92%, 50%, 0.1)";
            statusBox.style.color = "var(--brand-accent)";
            statusBox.innerText = `Report logged as DUPLICATE. A similar nearby report exists.`;
            setTimeout(() => window.location.href = '/citizen/my-reports.html', 3000);
        } else {
            statusBox.style.background = "hsla(145, 63%, 42%, 0.1)";
            statusBox.style.color = "var(--color-success)";
            statusBox.innerText = res.assignedTo
                ? 'Thank you! Your report was sent to the nearest rescue NGO.'
                : 'Thank you! Your report is in the open pool for nearby NGOs to pick up.';
            setTimeout(() => window.location.href = '/citizen/my-reports.html', 2000);
        }
        document.getElementById('incidentForm').reset();
    } catch (e) {
        statusBox.style.display = 'block';
        statusBox.style.background = "hsla(354, 70%, 54%, 0.1)";
        statusBox.style.color = "var(--color-danger)";
        statusBox.innerText = e.message;
    } finally {
        btn.innerText = "Submit Emergency Report";
        btn.disabled = false;
    }
});

onAction(document, {
    'detect-location': () => getLocation()
});
