// Login Handler for Housing Disrepair Portal
const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        loginBtn.innerText = 'Verifying...';
        loginBtn.disabled = true;
        errorMsg.innerText = '';

        try {
            const res = await fetch('/api/auth?action=login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok && data.session) {
                // Save access token (Supabase standard)
                localStorage.setItem('admin_session', JSON.stringify(data.session));
                
                // Redirect to dashboard with smooth transition
                document.body.classList.add('page-exit');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 500);
            } else {
                errorMsg.innerText = data.error || 'Access Denied: Invalid credentials.';
                loginBtn.innerText = 'Secure Log In';
                loginBtn.disabled = false;
            }
        } catch (err) {
            console.error("Login Error:", err);
            errorMsg.innerText = 'Network error: Check your connection.';
            loginBtn.innerText = 'Secure Log In';
            loginBtn.disabled = false;
        }
    });
}

// Redirect if already logged in
const session = localStorage.getItem('admin_session');
if (session) {
    window.location.href = '/index.html';
}
