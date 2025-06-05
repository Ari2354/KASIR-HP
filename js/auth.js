// Authentication and role-based redirect logic
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loadingSpinner = document.getElementById('loading-spinner');

function showLoading() {
  loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
  loadingSpinner.classList.add('hidden');
}

function showError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}

function hideError() {
  loginError.textContent = '';
  loginError.classList.add('hidden');
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  showLoading();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  try {
    console.log('Attempting login with:', email);
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    console.log('Login successful, user:', user.email);

    // Get user role from Firestore
    console.log('Fetching user role...');
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      throw new Error('User role not found. Please contact admin.');
    }
    
    const role = userDoc.data().role;

    // Redirect based on role
    if (role === 'admin') {
      window.location.href = 'admin.html';
    } else if (role === 'kasir') {
      window.location.href = 'kasir.html';
    } else {
      throw new Error('Invalid user role. Please contact admin.');
    }
  } catch (error) {
    console.error('Login error details:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
    
    // Show user-friendly error messages
    let errorMessage = 'An error occurred during login. Please try again.';
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-login-credentials') {
      errorMessage = 'Invalid email or password. Please note: If you are a new user, please contact the administrator to create your account.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    showError(errorMessage);
  } finally {
    hideLoading();
  }
});

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data().role;
        if (role === 'admin') {
          window.location.href = 'admin.html';
        } else if (role === 'kasir') {
          window.location.href = 'kasir.html';
        }
      }
    } catch (error) {
      console.error('Auth state check error:', error);
    }
  }
});
