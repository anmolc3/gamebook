document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginForm = document.getElementById('login-form');
  const usernameOrEmailInput = document.getElementById('usernameOrEmail');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const eyeIcon = togglePasswordBtn?.querySelector('.eye-icon');
  const eyeOffIcon = togglePasswordBtn?.querySelector('.eye-off-icon');

  const signinBtn = document.getElementById('signin-btn');
  const signinBtnText = signinBtn?.querySelector('.btn-text');
  const signinSpinner = signinBtn?.querySelector('.btn-spinner');
  const signinArrow = signinBtn?.querySelector('.btn-arrow');

  const googleBtn = document.getElementById('google-signin-btn');
  const googleBtnText = googleBtn?.querySelector('.google-btn-text');
  const googleSpinner = googleBtn?.querySelector('.google-spinner');

  const feedbackBanner = document.getElementById('feedback-banner');
  const feedbackText = document.getElementById('feedback-text');

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const createAccountLink = document.getElementById('create-account-link');

  // Helper: Display Feedback
  function showFeedback(message, type = 'error') {
    if (!feedbackBanner || !feedbackText) return;
    feedbackText.textContent = message;
    feedbackBanner.className = `feedback-banner ${type}`;
    feedbackBanner.classList.remove('hidden');
  }

  function hideFeedback() {
    if (!feedbackBanner) return;
    feedbackBanner.classList.add('hidden');
  }

  // 1. Password Visibility Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      if (eyeIcon && eyeOffIcon) {
        eyeIcon.classList.toggle('hidden', isPassword);
        eyeOffIcon.classList.toggle('hidden', !isPassword);
      }
    });
  }

  // 2. Standard Form Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFeedback();

      const usernameOrEmail = usernameOrEmailInput.value.trim();
      const password = passwordInput.value;

      if (!usernameOrEmail || !password) {
        showFeedback('Please enter both your username/email and password.');
        return;
      }

      // Enter loading state
      setButtonLoading(signinBtn, signinBtnText, signinSpinner, signinArrow, true, 'Signing In...');

      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail, password }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error?.message || 'Invalid username or password');
        }

        // Store session token
        if (json.data?.token) {
          localStorage.setItem('gameapp_token', json.data.token);
          localStorage.setItem('gameapp_user', JSON.stringify(json.data.user));
        }

        showFeedback(`Welcome back, ${json.data.user.displayName || json.data.user.username}!`, 'success');

        // Redirect after brief delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      } catch (err) {
        showFeedback(err.message || 'Login failed. Please check your credentials.');
      } finally {
        setButtonLoading(signinBtn, signinBtnText, signinSpinner, signinArrow, false, 'Sign In');
      }
    });
  }

  // Helper for button loading state
  function setButtonLoading(btn, textEl, spinnerEl, iconEl, isLoading, defaultText) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (textEl) textEl.textContent = defaultText;
    if (spinnerEl) spinnerEl.classList.toggle('hidden', !isLoading);
    if (iconEl) iconEl.classList.toggle('hidden', isLoading);
  }

  // 3. Google Sign-In Integration (Google Identity Services)
  let googleClientId = null;

  // Function to process Google ID Token with backend
  async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      showFeedback('Google sign-in was cancelled or failed.');
      return;
    }

    hideFeedback();
    setGoogleLoading(true);

    try {
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Google authentication failed on server');
      }

      if (json.data?.token) {
        localStorage.setItem('gameapp_token', json.data.token);
        localStorage.setItem('gameapp_user', JSON.stringify(json.data.user));
      }

      showFeedback(`Signed in with Google as ${json.data.user.displayName || json.data.user.username}!`, 'success');

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (err) {
      showFeedback(err.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  function setGoogleLoading(isLoading) {
    if (!googleBtn) return;
    googleBtn.disabled = isLoading;
    if (googleBtnText) googleBtnText.textContent = isLoading ? 'Signing in with Google...' : 'Continue with Google';
    if (googleSpinner) googleSpinner.classList.toggle('hidden', !isLoading);
  }

  // Initialize Google Identity Services
  function initGoogleIdentity() {
    // Check if Google Client ID is configured in meta or fetch it from public config
    fetch('/api/v1')
      .then((r) => r.json())
      .catch(() => ({}));

    // If Google GSI library is loaded
    if (typeof window.google !== 'undefined' && window.google.accounts) {
      const configuredId = window.GOOGLE_CLIENT_ID || '584037157308-6jortk40dk68qg2hiuam5pjqgrro0lam.apps.googleusercontent.com';
      try {
        window.google.accounts.id.initialize({
          client_id: configuredId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (e) {
        console.warn('Google Identity initialization warning:', e.message);
      }
    }
  }

  // Trigger Google Sign-In on button click
  if (googleBtn) {
    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      hideFeedback();

      if (typeof window.google !== 'undefined' && window.google.accounts && window.google.accounts.id) {
        // Prompt Google One Tap / popup
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed()) {
            console.log('Google prompt not displayed reason:', notification.getNotDisplayedReason());
            showFeedback('Google Sign-In: Please allow popups or configure your Google Client ID.');
          } else if (notification.isSkippedMoment()) {
            console.log('Google prompt skipped reason:', notification.getSkippedReason());
          }
        });
      } else {
        showFeedback('Google Identity Services SDK is still loading. Please check your network connection.');
      }
    });
  }

  // Try initializing GIS when script is ready
  window.addEventListener('load', () => {
    setTimeout(initGoogleIdentity, 500);
  });

  // Navigation Links
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      const entered = usernameOrEmailInput?.value.trim();
      const redirectUrl = entered ? `/forgot-password?identifier=${encodeURIComponent(entered)}` : '/forgot-password';
      showFeedback('Redirecting to password recovery...', 'success');
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 300);
    });
  }

  if (createAccountLink) {
    createAccountLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/register';
    });
  }
});
