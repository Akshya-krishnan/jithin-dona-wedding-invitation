/**
 * AUDIO-PLAYER.JS
 * Background music: "Love Never Fails", looped, starting as soon as the link opens.
 *
 * Browsers only allow sound after the guest has touched the page, so the player
 * tries to start immediately and, if refused, starts on the very first touch,
 * tap, scroll or key press anywhere. It never shows any controls.
 */

const TRACK = '/assets/audio/love-never-fails.mp3';
const VOLUME = 0.85;

export class BackgroundMusic {
  constructor() {
    this.isPlaying = false;
    this.fadeTimer = null;
    this.audioEl = this.createTrack();
    this.autoStart();
  }

  createTrack() {
    const existing = document.getElementById('background-music-track');
    if (existing) return existing;
    const audio = document.createElement('audio');
    audio.id = 'background-music-track';
    audio.src = TRACK;
    audio.loop = true;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.volume = 0;
    audio.style.display = 'none';
    audio.addEventListener('error', () => {
      console.warn('Background music: could not load ' + TRACK);
    });
    (document.body || document.documentElement).appendChild(audio);
    return audio;
  }

  fadeTo(target, seconds) {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    const el = this.audioEl;
    const start = el.volume;
    const steps = Math.max(1, Math.round(seconds * 30));
    let i = 0;
    this.fadeTimer = setInterval(() => {
      i++;
      const t = Math.min(1, i / steps);
      const eased = t * t * (3 - 2 * t);
      el.volume = Math.max(0, Math.min(1, start + (target - start) * eased));
      if (t >= 1) { clearInterval(this.fadeTimer); this.fadeTimer = null; }
    }, (seconds * 1000) / steps);
  }

  play() {
    if (this.isPlaying || !this.audioEl) return Promise.resolve();
    const p = this.audioEl.play();
    const promise = p && typeof p.then === 'function' ? p : Promise.resolve();
    return promise
      .then(() => { this.isPlaying = true; this.fadeTo(VOLUME, 2); })
      .catch(() => { this.isPlaying = false; });
  }

  pause() {
    if (!this.isPlaying || !this.audioEl) return;
    this.isPlaying = false;
    this.fadeTo(0, 0.5);
    setTimeout(() => { if (!this.isPlaying) this.audioEl.pause(); }, 550);
  }

  toggle() { if (this.isPlaying) this.pause(); else this.play(); }

  autoStart() {
    const attempt = () => (this.isPlaying ? Promise.resolve() : this.play());
    if (document.readyState === 'complete') attempt(); else window.addEventListener('load', attempt, { once: true });

    const events = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];
    const onGesture = () => {
      attempt().then(() => {
        if (this.isPlaying) events.forEach((ev) => window.removeEventListener(ev, onGesture, true));
      });
    };
    events.forEach((ev) => window.addEventListener(ev, onGesture, { capture: true, passive: true }));

    // keep playing after the guest switches apps and comes back
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isPlaying && this.audioEl.paused) this.audioEl.play().catch(() => {});
    });
  }
}
