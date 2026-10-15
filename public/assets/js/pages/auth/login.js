document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errorBox = document.getElementById('errorBox');

    btn.innerText = "Signing in...";
    btn.disabled = true;
    errorBox.style.display = "none";

    const payload = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        const res = await window.API.post('/auth/login', payload);
        window.API.setToken(res.data.token);
        localStorage.setItem('jeevcare_user', JSON.stringify(res.data));
        window.API.redirectByRole(res.data.role);
    } catch (err) {
        errorBox.innerText = err.message;
        errorBox.style.display = "block";
        btn.innerText = "Sign In";
        btn.disabled = false;
    }
});
