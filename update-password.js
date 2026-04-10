// Update Password Handler for Housing Disrepair Portal
const updateForm = document.getElementById('updateForm');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const updateBtn = document.getElementById('updateBtn');

if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            errorMsg.innerText = "Passwords do not match.";
            return;
        }

        // Extract token from URL hash (standard Supabase redirect format)
        // Format: #access_token=...&refresh_token=...&expires_in=...&token_type=bearer&type=recovery
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');

        if (!accessToken) {
            errorMsg.innerText = "Recovery token missing or expired. Please request a new link.";
            return;
        }

        updateBtn.innerText = 'Updating...';
        updateBtn.disabled = true;
        errorMsg.innerText = '';

        try {
            const res = await fetch('/api/auth?action=update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    accessToken,
                    newPassword: password
                })
            });

            const data = await res.json();

            if (res.ok) {
                successMsg.style.display = 'block';
                updateForm.style.display = 'none';
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 3000);
            } else {
                errorMsg.innerText = data.error || 'Failed to update password. Link may be expired.';
                updateBtn.innerText = 'Update Password';
                updateBtn.disabled = false;
            }
        } catch (err) {
            console.error("Update Error:", err);
            errorMsg.innerText = 'Network error: Check your connection.';
            updateBtn.innerText = 'Update Password';
            updateBtn.disabled = false;
        }
    });
}
