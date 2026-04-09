// Sign-Up Handler for Housing Admin Portal
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    const errorMsg = document.getElementById('errorMsg');

    if (signupForm) {
        // --- Password Visibility Toggle ---
        const passwordInput = document.getElementById('password');
        const togglePwd = document.querySelector('.toggle-pwd');
        
        if (togglePwd && passwordInput) {
            togglePwd.addEventListener('click', () => {
                const isPassword = passwordInput.getAttribute('type') === 'password';
                passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
                
                // Toggle Lucide Icon
                togglePwd.setAttribute('data-lucide', isPassword ? 'eye' : 'eye-off');
                lucide.createIcons(); // Re-render icon
            });
        }

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            signupBtn.innerText = 'Creating Account...';
            signupBtn.disabled = true;
            errorMsg.innerText = '';

            const fullName = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    alert('Registration successful! You can now log in.');
                    window.location.href = '/index.html';
                } else {
                    errorMsg.innerText = data.error || 'Registration failed.';
                    signupBtn.innerText = 'Get Started';
                    signupBtn.disabled = false;
                }
            } catch (err) {
                console.error("Signup Error:", err);
                errorMsg.innerText = 'Network error: Check your connection.';
                signupBtn.innerText = 'Get Started';
                signupBtn.disabled = false;
            }
        });
    }
});
