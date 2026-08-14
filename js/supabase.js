/**
 * HIGGSFIELD AI — SUPABASE CLOUD CLIENT & AUTH INTEGRATION
 * URL: https://iegrskjlzngddgxdrxws.supabase.co
 */

(function () {
  const SUPABASE_URL = 'https://iegrskjlzngddgxdrxws.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_NoaAPpnYVosdVq1GMrOrJA_3MXx2NFL';

  // Expose configuration globally
  window.SUPABASE_CONFIG = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY
  };

  let currentUser = null;

  // Generic REST Helper for Supabase (Zero dependency browser friendly)
  async function supabaseRequest(endpoint, options = {}) {
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (currentUser && currentUser.access_token) {
      headers['Authorization'] = `Bearer ${currentUser.access_token}`;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}${endpoint}`, {
        ...options,
        headers
      });
      return await res.json();
    } catch (e) {
      console.warn("Supabase request error:", e);
      return { error: e.message };
    }
  }

  // Supabase Auth Methods
  window.SupabaseAuth = {
    async signUp(email, password) {
      const res = await supabaseRequest('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.user) {
        currentUser = res;
        localStorage.setItem('higgsfield_user', JSON.stringify(res));
      }
      return res;
    },

    async signIn(email, password) {
      const res = await supabaseRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.access_token) {
        currentUser = res;
        localStorage.setItem('higgsfield_user', JSON.stringify(res));
      }
      return res;
    },

    async signOut() {
      currentUser = null;
      localStorage.removeItem('higgsfield_user');
      window.location.reload();
    },

    getUser() {
      if (!currentUser) {
        const cached = localStorage.getItem('higgsfield_user');
        if (cached) {
          try { currentUser = JSON.parse(cached); } catch (e) {}
        }
      }
      return currentUser;
    }
  };

  // Check initial session
  window.addEventListener('DOMContentLoaded', () => {
    const user = window.SupabaseAuth.getUser();
    if (user && user.user) {
      const loginBtns = document.querySelectorAll('.auth-trigger');
      if (loginBtns.length > 0) {
        loginBtns[0].textContent = user.user.email.split('@')[0];
        if (loginBtns[1]) {
          loginBtns[1].textContent = "Sign Out";
          loginBtns[1].onclick = () => window.SupabaseAuth.signOut();
        }
      }
    }
  });
})();
