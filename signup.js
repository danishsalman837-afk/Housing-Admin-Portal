// Sign-Up Handler for Housing Admin Portal
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    const errorMsg = document.getElementById('errorMsg');

    if (signupForm) {

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
                    // Registration successful - smooth transition to login
                    document.body.classList.add('page-exit');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 500); // Match transition duration
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
