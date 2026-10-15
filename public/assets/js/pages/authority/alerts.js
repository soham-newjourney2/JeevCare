document.getElementById('alertForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('formError');
    if (errorDiv) errorDiv.style.display = 'none';

    const severity = document.getElementById('severity').value;
    const targetArea = document.getElementById('targetArea').value;
    const message = document.getElementById('messageText').value;

    if (!message.trim()) {
        toast('Please enter a message', 'error');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerText : 'Broadcast Message';
    if (btn) {
        btn.innerText = 'Broadcasting...';
        btn.disabled = true;
    }

    try {
        await window.API.post('/authority/broadcast', { severity, targetArea, message });
        toast('Alert successfully broadcasted!', 'success');
        e.target.reset();
    } catch (err) {
        if (errorDiv) {
            errorDiv.innerText = err.message || 'Failed to broadcast alert';
            errorDiv.style.display = 'block';
        } else {
            toast('Failed to broadcast alert: ' + err.message, 'error');
        }
    } finally {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
});
