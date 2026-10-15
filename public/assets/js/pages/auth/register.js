const roleBtns = document.querySelectorAll('.role-btn');
const roleHiddenInput = document.getElementById('selectedRole');
const allDynamicFields = document.querySelectorAll('.dynamic-fields');

roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        roleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const role = btn.getAttribute('data-role');
        roleHiddenInput.value = role;

        allDynamicFields.forEach(f => f.classList.remove('active'));
        document.getElementById('fields_' + role).classList.add('active');
    });
});

// Links such as /auth/register.html?role=ngo open the matching tab
const requestedRole = new URLSearchParams(window.location.search).get('role');
const requestedTab = [...roleBtns].find(b => b.dataset.role === requestedRole);
if (requestedTab) requestedTab.click();

function detectLocation(latId, lngId, btnElement) {
    if (navigator.geolocation) {
        const originalText = btnElement.innerText;
        btnElement.innerText = "Finding your location...";

        const warningDiv = btnElement.nextElementSibling;
        warningDiv.innerText = "";
        warningDiv.style.color = "var(--brand-primary)";

        navigator.geolocation.getCurrentPosition((position) => {
            document.getElementById(latId).value = position.coords.latitude;
            document.getElementById(lngId).value = position.coords.longitude;
            btnElement.innerText = originalText;
            warningDiv.innerText = "✓ Exact coordinates locked.";
            warningDiv.style.color = "#34d399";
        }, (err) => {
            toast("Location detection failed: " + err.message + ". Please type coordinates manually.", 'error');
            btnElement.innerText = originalText;
        });
    } else {
        toast("Geolocation is not supported by this browser.", 'error');
    }
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const errorBox = document.getElementById('errorBox');

    btn.innerText = "Creating Account...";
    btn.disabled = true;
    errorBox.style.display = "none";

    const role = roleHiddenInput.value;
    const payload = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        role: role
    };

    if (role === 'ngo') {
        payload.organizationName = document.getElementById('organizationName').value;
        payload.registrationNumber = document.getElementById('registrationNumber').value;

        let lat = parseFloat(document.getElementById('ngo_lat').value);
        let lng = parseFloat(document.getElementById('ngo_lng').value);
        if (isNaN(lat) || isNaN(lng)) {
            errorBox.innerText = "Please detect or input valid layout coordinates for your NGO HQ.";
            errorBox.style.display = "block";
            btn.innerText = "Create Account";
            btn.disabled = false;
            return;
        }
        payload.location = { type: "Point", coordinates: [lng, lat] };

    } else if (role === 'service_provider') {
        payload.businessName = document.getElementById('businessName').value;
        payload.serviceType = document.getElementById('serviceType').value;

        let lat = parseFloat(document.getElementById('sp_lat').value);
        let lng = parseFloat(document.getElementById('sp_lng').value);
        if (isNaN(lat) || isNaN(lng)) {
            errorBox.innerText = "Please detect or input valid layout coordinates for your Clinic/Service.";
            errorBox.style.display = "block";
            btn.innerText = "Create Account";
            btn.disabled = false;
            return;
        }
        payload.location = { type: "Point", coordinates: [lng, lat] };
    }

    try {
        const res = await window.API.post('/auth/register', payload);
        window.API.setToken(res.data.token);
        localStorage.setItem('jeevcare_user', JSON.stringify(res.data));
        window.API.redirectByRole(res.data.role);
    } catch (err) {
        errorBox.innerText = err.message || "An error occurred";
        errorBox.style.display = "block";
        btn.innerText = "Create Account";
        btn.disabled = false;
    }
});

onAction(document, {
    'detect-location': (el) => detectLocation(el.dataset.lat, el.dataset.lng, el)
});
