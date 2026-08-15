/**
 * HIGGSFIELD AI — GLOBAL APP COORDINATOR, MODALS & SUPERCOMPUTER AGENT CHAT
 * 100% Free, Standalone & Self-contained
 */

(function () {
  // Toast System
  const toastContainer = document.getElementById('toast-container');

  window.showToast = function (message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Search Modal & Command Palette
  const searchModal = document.getElementById('search-modal');
  const searchInput = document.getElementById('search-input');
  const searchTriggers = document.querySelectorAll('.search-trigger');
  const modalCloses = document.querySelectorAll('.modal-close-btn');

  function openSearch() {
    if (searchModal) {
      searchModal.classList.add('active');
      if (searchInput) {
        searchInput.value = '';
        setTimeout(() => searchInput.focus(), 50);
      }
    }
  }

  function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  searchTriggers.forEach(btn => btn.addEventListener('click', openSearch));

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') {
      closeModals();
    }
  });

  modalCloses.forEach(btn => {
    btn.addEventListener('click', closeModals);
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModals();
    });
  });

  // Auth / Sign In Modal
  const authModal = document.getElementById('auth-modal');
  const authTriggers = document.querySelectorAll('.auth-trigger');

  authTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      if (authModal) authModal.classList.add('active');
    });
  });

  const authSubmit = document.getElementById('auth-submit-btn');
  if (authSubmit) {
    authSubmit.addEventListener('click', async (e) => {
      e.preventDefault();
      const emailInput = document.querySelector('#auth-modal input[type="email"]');
      const passInput = document.querySelector('#auth-modal input[type="password"]');
      const email = emailInput ? emailInput.value : '';
      const pass = passInput ? passInput.value : '';

      if (window.SupabaseAuth && email && pass) {
        window.showToast("Authenticating with Supabase...");
        const res = await window.SupabaseAuth.signIn(email, pass);
        if (res.error) {
          // If login fails, try signup
          const signRes = await window.SupabaseAuth.signUp(email, pass);
          if (signRes.error) {
            window.showToast(`Supabase: ${signRes.error.message || signRes.error}`);
          } else {
            closeModals();
            window.showToast(`✓ Account created! Welcome, ${email}`);
          }
        } else {
          closeModals();
          window.showToast(`✓ Welcome back, ${email}!`);
        }
      } else {
        closeModals();
        window.showToast("✓ Welcome to Higgsfield AI! Full creator tier activated.");
      }
    });
  }

  // Contest Submission Modal
  const contestModal = document.getElementById('contest-modal');
  const contestTriggers = document.querySelectorAll('.contest-trigger');

  contestTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      if (contestModal) contestModal.classList.add('active');
    });
  });

  const contestSubmit = document.getElementById('contest-submit-btn');
  if (contestSubmit) {
    contestSubmit.addEventListener('click', (e) => {
      e.preventDefault();
      closeModals();
      // There is no submission backend, so claiming a film was submitted and
      // will be reviewed is simply untrue.
      window.showToast("This form isn't connected to a submission service yet.");
    });
  }

  // Mobile menu toggle
  const mobileToggle = document.querySelector('.mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-drawer-menu');
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });
  }

  // Supercomputer Live Chat Agent
  const chatMessages = document.getElementById('supercomputer-chat-messages');
  const chatInput = document.getElementById('supercomputer-chat-input');
  const chatSendBtn = document.getElementById('supercomputer-chat-send');

  function sendChatMessage(text) {
    if (!text || !text.trim() || !chatMessages) return;

    // User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-msg user';
    userMsg.innerHTML = `<div class="chat-bubble">${text}</div>`;
    chatMessages.appendChild(userMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (chatInput) chatInput.value = '';

    // Simulate Agent Thinking & Planning Response
    setTimeout(() => {
      const agentMsg = document.createElement('div');
      agentMsg.className = 'chat-msg agent';
      agentMsg.innerHTML = `
        <div class="chat-bubble">
          <div style="font-weight:700; margin-bottom:4px; color:var(--accent-orange);">Higgsfield Supercomputer:</div>
          <div>I've formulated a complete multi-shot storyboard for your prompt using <strong>Seedance 2.5</strong> and <strong>Nano Banana Pro</strong>.</div>
          <div class="chat-step-card">
            <strong>Shot 1:</strong> Establishing wide aerial tracking (35mm lens, golden hour fog)<br>
            <strong>Shot 2:</strong> Dynamic FPV swoop into character focal point (60fps)<br>
            <strong>Audio:</strong> Cinematic deep sub-bass pulse with environmental Foley
          </div>
          <button class="btn btn-accent btn-sm" style="margin-top:10px;" onclick="window.loadPresetIntoStudio({prompt: '${text.replace(/'/g, "\\'")}', camera: 'FPV Dive'})">
            🚀 Render Full Storyboard in Studio
          </button>
        </div>
      `;
      chatMessages.appendChild(agentMsg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 700);
  }

  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', () => sendChatMessage(chatInput.value));
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage(chatInput.value);
    });
  }

  // Film Festival Countdown Timer (Sep 3)
  function initCountdown() {
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minsEl = document.getElementById('countdown-mins');
    const secsEl = document.getElementById('countdown-secs');

    if (!daysEl) return;
    const targetDate = new Date("2026-09-03T23:59:59Z").getTime();

    function update() {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        daysEl.textContent = "00";
        hoursEl.textContent = "00";
        minsEl.textContent = "00";
        secsEl.textContent = "00";
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      daysEl.textContent = String(d).padStart(2, '0');
      hoursEl.textContent = String(h).padStart(2, '0');
      minsEl.textContent = String(m).padStart(2, '0');
      secsEl.textContent = String(s).padStart(2, '0');
    }

    update();
    setInterval(update, 1000);
  }

  window.addEventListener('DOMContentLoaded', () => {
    initCountdown();
  });
})();
