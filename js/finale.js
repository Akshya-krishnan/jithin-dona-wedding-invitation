/**
 * FINALE.JS
 * The last two sections of the couple slide:
 *  - the "drive into forever" video, which plays by itself when scrolled into view
 *  - the finale: venue maps, a wishes wall that shows every posted greeting, thank you
 */

/**
 * Shared wishes store. Leave empty to keep wishes on each guest's own device.
 * To let every guest see everyone's wishes, point this at a tiny web endpoint that
 * answers GET with a JSON array of {name, message, at} and accepts POST of one such
 * object (a Google Apps Script web app bound to a Google Sheet works well).
 */
const WISHES_ENDPOINT = '';
const WISHES_KEY = 'jd-wishes';

export class Finale {
  constructor({ scrollContainer = null } = {}) {
    this.scrollContainer = scrollContainer;
    this.videoSection = document.getElementById('wedding-video');
    this.video = document.getElementById('car-video');
    this.finalSection = document.getElementById('wedding-final');
    this.form = document.getElementById('greet-form');
    this.nameInput = document.getElementById('greet-name');
    this.msgInput = document.getElementById('greet-message');
    this.sendBtn = document.getElementById('greet-send');
    this.status = document.getElementById('greet-status');
    this.chips = Array.from(document.querySelectorAll('.greet-chip'));

    this.setupVideo();
    this.setupReveal();
    this.setupGreetings();
  }

  /* ------------------------------------------------------------- video */
  setupVideo() {
    if (!this.video || !this.videoSection) return;
    const video = this.video;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.videoSection.classList.add('in-view');
            tryPlay();
          } else {
            video.pause();
          }
        });
      }, { root: this.scrollContainer, threshold: 0.35 });
      io.observe(this.videoSection);
    } else {
      this.videoSection.classList.add('in-view');
      tryPlay();
    }

    // Tap the video to toggle sound (it starts muted so phones allow autoplay)
    const soundBtn = document.getElementById('car-video-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        soundBtn.classList.toggle('on', !video.muted);
        soundBtn.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
        tryPlay();
      });
    }
  }

  /* ------------------------------------------------------------ reveal */
  setupReveal() {
    if (!this.finalSection) return;
    const targets = Array.from(this.finalSection.querySelectorAll('.fin-reveal'));
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { root: this.scrollContainer, threshold: 0.2 });
    targets.forEach((t) => io.observe(t));
  }

  /* --------------------------------------------------------- greetings */
  setupGreetings() {
    if (!this.form) return;
    this.wall = document.getElementById('greet-wall');
    this.wallList = document.getElementById('greet-wall-list');
    this.wallEmpty = document.getElementById('greet-wall-empty');
    this.wallCount = document.getElementById('greet-wall-count');
    this.wishes = [];

    const stop = (e) => e.stopPropagation();
    this.form.addEventListener('click', stop);
    this.form.addEventListener('pointerdown', stop);
    if (this.wall) this.wall.addEventListener('click', stop);

    this.chips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.msgInput) {
          this.msgInput.value = chip.dataset.text || chip.textContent.trim();
          this.msgInput.focus();
        }
      });
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.post();
    });

    this.loadWishes();
  }

  setStatus(text, ok = true) {
    if (!this.status) return;
    this.status.textContent = text;
    this.status.classList.toggle('ok', ok);
    this.status.classList.toggle('err', !ok);
  }

  /* Storage: the shared store when configured, otherwise this device only */
  readLocal() {
    try { return JSON.parse(localStorage.getItem(WISHES_KEY) || '[]'); } catch (e) { return []; }
  }

  writeLocal(list) {
    try { localStorage.setItem(WISHES_KEY, JSON.stringify(list.slice(0, 300))); } catch (e) {}
  }

  async loadWishes() {
    this.wishes = this.readLocal();
    this.renderWall();
    if (!WISHES_ENDPOINT) return;
    try {
      const res = await fetch(WISHES_ENDPOINT, { method: 'GET', cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const remote = await res.json();
      if (Array.isArray(remote)) {
        this.wishes = remote
          .filter((w) => w && typeof w.message === 'string' && w.message.trim())
          .map((w) => ({ name: String(w.name || 'A well-wisher').slice(0, 60), message: String(w.message).slice(0, 500), at: Number(w.at) || Date.now() }))
          .sort((x, y) => y.at - x.at);
        this.writeLocal(this.wishes);
        this.renderWall();
      }
    } catch (e) {
      // keep whatever this device remembers
    }
  }

  async post() {
    const name = (this.nameInput && this.nameInput.value.trim()) || 'A well-wisher';
    const message = (this.msgInput && this.msgInput.value.trim()) || '';
    if (!message) {
      this.setStatus('Write a few words first ♥', false);
      if (this.msgInput) this.msgInput.focus();
      return;
    }
    const wish = { name: name.slice(0, 60), message: message.slice(0, 500), at: Date.now() };

    this.wishes.unshift(wish);
    this.writeLocal(this.wishes);
    this.renderWall(wish);
    if (this.msgInput) this.msgInput.value = '';
    if (this.sendBtn) { this.sendBtn.disabled = true; setTimeout(() => { this.sendBtn.disabled = false; }, 1500); }
    this.setStatus('Thank you! Your wishes are on the wall ♥');
    this.burstHearts();

    if (WISHES_ENDPOINT) {
      try {
        await fetch(WISHES_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(wish)
        });
      } catch (e) {
        this.setStatus('Saved on this phone. It will reach the shared wall when you are back online.', true);
      }
    }
  }

  renderWall(fresh = null) {
    if (!this.wallList) return;
    this.wallList.innerHTML = '';
    this.wishes.slice(0, 100).forEach((w, i) => {
      const li = document.createElement('li');
      li.className = 'greet-card' + (fresh && w === fresh ? ' is-new' : '');
      li.style.setProperty('--tilt', `${((i % 3) - 1) * 1.2}deg`);
      const msg = document.createElement('p');
      msg.className = 'greet-card-msg';
      msg.textContent = w.message;
      const who = document.createElement('p');
      who.className = 'greet-card-who';
      who.textContent = `— ${w.name}`;
      const when = document.createElement('span');
      when.className = 'greet-card-when';
      when.textContent = this.timeAgo(w.at);
      who.appendChild(when);
      li.appendChild(msg);
      li.appendChild(who);
      this.wallList.appendChild(li);
    });
    if (this.wallEmpty) this.wallEmpty.hidden = this.wishes.length > 0;
    if (this.wallCount) this.wallCount.textContent = String(this.wishes.length);
  }

  timeAgo(at) {
    const diff = Math.max(0, Date.now() - at);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
    return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  burstHearts() {
    const host = document.getElementById('greet-burst');
    if (!host) return;
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'greet-heart';
      s.textContent = '♥';
      s.style.left = `${10 + Math.random() * 80}%`;
      s.style.animationDelay = `${Math.random() * 0.4}s`;
      s.style.fontSize = `${14 + Math.random() * 16}px`;
      host.appendChild(s);
      setTimeout(() => s.remove(), 2600);
    }
  }
}
