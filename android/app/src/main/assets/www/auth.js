/**
 * BoostlyAuth — sign up, sign in, session (localStorage + sessionStorage).
 * Form handlers auto-bind on signin.html / signup.html.
 */
(function () {
  'use strict';

  const USERS_KEY = 'boostly_users_v1';
  const SESSION_KEY = 'boostly_session_v1';
  const memory = {};

  function canUse(store) {
    try {
      const k = '__boostly_probe__';
      store.setItem(k, '1');
      store.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  const hasLocal = canUse(localStorage);
  const hasSession = canUse(sessionStorage);

  function getItem(key) {
    if (hasLocal) {
      try {
        const v = localStorage.getItem(key);
        if (v !== null) return v;
      } catch { /* fall through */ }
    }
    if (hasSession) {
      try {
        const v = sessionStorage.getItem(key);
        if (v !== null) return v;
      } catch { /* fall through */ }
    }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }

  function setItem(key, value) {
    memory[key] = value;
    if (hasLocal) {
      try { localStorage.setItem(key, value); } catch { /* continue */ }
    }
    if (hasSession) {
      try { sessionStorage.setItem(key, value); } catch { /* continue */ }
    }
    return { ok: true };
  }

  function removeItem(key) {
    delete memory[key];
    if (hasLocal) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
    if (hasSession) {
      try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    }
  }

  function readUsers() {
    try {
      const raw = getItem(USERS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function writeUsers(users) {
    setItem(USERS_KEY, JSON.stringify(users));
  }

  function hashPassword(password) {
    try {
      return btoa(String(password));
    } catch {
      return String(password);
    }
  }

  function uid() {
    return `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function getSession() {
    try {
      const raw = getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(user) {
    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      businessName: user.businessName || '',
      signedInAt: new Date().toISOString(),
    };
    setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function signUp({ name, email, password, businessName }) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedName = (name || '').trim();

    if (!trimmedName || !trimmedEmail || !password) {
      return { ok: false, error: 'Please fill in name, email, and password.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { ok: false, error: 'Please enter a valid email (e.g. you@business.com).' };
    }

    const users = readUsers();
    if (users.some((u) => u.email === trimmedEmail)) {
      return { ok: false, error: 'This email is already registered. Use Sign in instead.' };
    }

    const user = {
      id: uid(),
      name: trimmedName,
      email: trimmedEmail,
      passwordHash: hashPassword(password),
      businessName: (businessName || '').trim(),
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    writeUsers(users);
    setSession(user);

    const check = getSession();
    if (!check || check.email !== trimmedEmail) {
      return {
        ok: false,
        error: 'Could not save your session. Double-click start.bat in the project folder, then open http://localhost:3000/signup.html',
      };
    }

    return { ok: true, user };
  }

  function signIn({ email, password }) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail || !password) {
      return { ok: false, error: 'Enter your email and password.' };
    }

    const users = readUsers();
    const user = users.find(
      (u) => u.email === trimmedEmail && u.passwordHash === hashPassword(password)
    );

    if (!user) {
      if (!users.length) {
        return {
          ok: false,
          error: 'No account found on this device. Create an account first.',
        };
      }
      return { ok: false, error: 'Wrong email or password.' };
    }

    setSession(user);
    if (!getSession()) {
      return { ok: false, error: 'Could not save session. Run start.bat and use http://localhost:3000/signin.html' };
    }

    return { ok: true, user };
  }

  function signOut() {
    removeItem(SESSION_KEY);
  }

  function requireAuth(redirectTo) {
    if (!getSession()) {
      window.location.replace(redirectTo || 'signin.html');
      return false;
    }
    return true;
  }

  function storageKey(base, userId) {
    const id = userId || getSession()?.userId || 'guest';
    return `${base}_${id}`;
  }

  function getData(key) {
    return getItem(key);
  }

  function setData(key, value) {
    return setItem(key, value);
  }

  function setBtnLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.label = btn.textContent;
      btn.textContent = 'Please wait…';
    } else if (btn.dataset.label) {
      btn.textContent = btn.dataset.label;
    }
  }

  function showAuthError(msg, gate) {
    const id = gate ? 'auth-gate-error' : 'auth-error';
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.classList.add('visible');
    } else {
      alert(msg);
    }
  }

  function clearAuthError(gate) {
    const id = gate ? 'auth-gate-error' : 'auth-error';
    document.getElementById(id)?.classList.remove('visible');
  }

  function onAuthSuccess() {
    if (document.getElementById('app-shell')) {
      document.getElementById('auth-gate')?.setAttribute('hidden', '');
      document.getElementById('app-shell')?.removeAttribute('hidden');
      window.dispatchEvent(new CustomEvent('boostly-authed'));
      return;
    }
    window.location.replace('index.html');
  }

  function bindGateForms() {
    const tabIn = document.getElementById('tab-signin');
    const tabUp = document.getElementById('tab-signup');
    const panelIn = document.getElementById('panel-signin');
    const panelUp = document.getElementById('panel-signup');

    tabIn?.addEventListener('click', () => {
      tabIn.classList.add('is-active');
      tabUp?.classList.remove('is-active');
      panelIn?.removeAttribute('hidden');
      panelUp?.setAttribute('hidden', '');
      clearAuthError(true);
    });
    tabUp?.addEventListener('click', () => {
      tabUp.classList.add('is-active');
      tabIn?.classList.remove('is-active');
      panelUp?.removeAttribute('hidden');
      panelIn?.setAttribute('hidden', '');
      clearAuthError(true);
    });

    document.getElementById('form-gate-signin')?.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAuthError(true);
      const btn = document.getElementById('btn-gate-signin');
      setBtnLoading(btn, true);
      const result = signIn({
        email: document.getElementById('gate-email-in')?.value,
        password: document.getElementById('gate-password-in')?.value,
      });
      if (!result.ok) {
        showAuthError(result.error, true);
        setBtnLoading(btn, false);
        return;
      }
      onAuthSuccess();
    });

    document.getElementById('form-gate-signup')?.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAuthError(true);
      const btn = document.getElementById('btn-gate-signup');
      setBtnLoading(btn, true);
      const result = signUp({
        name: document.getElementById('gate-name')?.value,
        businessName: document.getElementById('gate-business')?.value,
        email: document.getElementById('gate-email-up')?.value,
        password: document.getElementById('gate-password-up')?.value,
      });
      if (!result.ok) {
        showAuthError(result.error, true);
        setBtnLoading(btn, false);
        return;
      }
      onAuthSuccess();
    });
  }

  function bindAuthForms() {
    bindGateForms();

    const signinForm = document.getElementById('form-signin');
    const signupForm = document.getElementById('form-signup');

    if (getSession() && signinForm && !document.getElementById('app-shell')) {
      window.location.replace('index.html');
      return;
    }

    if (signinForm) {
      signinForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAuthError(false);
        const btn = document.getElementById('btn-signin');
        setBtnLoading(btn, true);
        const result = signIn({
          email: document.getElementById('input-email')?.value,
          password: document.getElementById('input-password')?.value,
        });
        if (!result.ok) {
          showAuthError(result.error, false);
          setBtnLoading(btn, false);
          return;
        }
        onAuthSuccess();
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAuthError(false);
        const btn = document.getElementById('btn-signup');
        setBtnLoading(btn, true);
        const result = signUp({
          name: document.getElementById('input-name')?.value,
          businessName: document.getElementById('input-business')?.value,
          email: document.getElementById('input-email')?.value,
          password: document.getElementById('input-password')?.value,
        });
        if (!result.ok) {
          showAuthError(result.error, false);
          setBtnLoading(btn, false);
          return;
        }
        onAuthSuccess();
      });
    }
  }

  window.BoostlyAuth = {
    USERS_KEY,
    SESSION_KEY,
    getSession,
    signUp,
    signIn,
    signOut,
    requireAuth,
    storageKey,
    getData,
    setData,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAuthForms);
  } else {
    bindAuthForms();
  }
})();
