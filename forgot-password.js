// Forgot Password Handler for Housing Disrepair Portal
const recoverForm = document.getElementById('recoverForm');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const recoverBtn = document.getElementById('recoverBtn');

if (recoverForm) {
    recoverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;

        recoverBtn.innerText = 'Sending...';
        recoverBtn.disabled = true;
        errorMsg.innerText = '';
        successMsg.style.display = 'none';

        try {
            const res = await fetch('/api/auth?action=forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email,
                    redirectTo: window.location.origin + '/update-password.html'
                })
            });

            const data = await res.json();

            if (res.ok) {
                successMsg.style.display = 'block';
                recoverForm.style.display = 'none';
                recoverBtn.style.display = 'none';
            } else {
                errorMsg.innerText = data.error || 'Failed to send reset link. Please try again.';
                recoverBtn.innerText = 'Send Reset Link';
                recoverBtn.disabled = false;
            }
        } catch (err) {
            console.error("Recovery Error:", err);
            errorMsg.innerText = 'Network error: Check your connection.';
            recoverBtn.innerText = 'Send Reset Link';
            recoverBtn.disabled = false;
        }
    });
}
