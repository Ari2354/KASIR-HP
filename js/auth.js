// Authentication and role-based redirect logic

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Get user role from Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      loginError.textContent = 'User role not found. Contact admin.';
      await auth.signOut();
      return;
    }
    const role = userDoc.data().role;

    // Redirect based on role
    if (role === 'admin') {
      window.location.href = 'admin.html';
    } else if (role === 'kasir') {
      window.location.href = 'kasir.html';
    } else {
      loginError.textContent = 'Invalid user role.';
      await auth.signOut();
    }
  } catch (error) {
    loginError.textContent = error.message;
  }
});
