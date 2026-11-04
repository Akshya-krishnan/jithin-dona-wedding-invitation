/**
 * HEART-GAME.JS
 * "Catch the hearts" — a little game at the end of the invitation.
 *
 * 1. Intro: the couple's photo and a playful question ("will you play with us?").
 * 2. Pick a basket: Jithin's or Dona's.
 * 3. Game: hearts rain down; drag (or use the arrow keys) to move the basket and
 *    catch them. Each catch scores a point. The first heart that hits the ground
 *    ends the game. Best scores for each basket are remembered on the device.
 */

const STORAGE_KEY = 'jd-heart-catch-best';

export class HeartCatchGame {
  constructor({ scrollContainer = null } = {}) {
    this.section = document.getElementById('wedding-game');
    if (!this.section) return;

    this.scrollContainer = scrollContainer;
    this.intro = document.getElementById('game-intro');
    this.later = document.getElementById('game-later');
    this.pick = document.getElementById('game-pick');
    this.stage = document.getElementById('game-stage');
    this.canvas = document.getElementById('game-canvas');
    this.scoreEl = document.getElementById('game-score');
    this.bestGroomEl = document.getElementById('game-best-groom');
    this.bestBrideEl = document.getElementById('game-best-bride');
    this.crownGroom = document.getElementById('game-crown-groom');
    this.crownBride = document.getElementById('game-crown-bride');
    this.over = document.getElementById('game-over');
    this.overTitle = document.getElementById('game-over-title');
    this.overText = document.getElementById('game-over-text');
    this.overScore = document.getElementById('game-over-score');
    this.emoji = document.getElementById('game-emoji');
    this.result = document.getElementById('game-result');
    this.resultLast = document.getElementById('game-result-last');
    this.resultGroom = document.getElementById('game-result-groom');
    this.resultBride = document.getElementById('game-result-bride');
    this.rcrownGroom = document.getElementById('game-rcrown-groom');
    this.rcrownBride = document.getElementById('game-rcrown-bride');
    this.yesBtn = document.getElementById('game-yes');
    this.returnTimer = null;

    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.side = 'groom';
    this.running = false;
    this.raf = null;
    this.hearts = [];
    this.jarHearts = [];
    this.score = 0;
    this.best = this.loadBest();
    this.avatars = {
      groom: this.loadImage('/assets/images/people/groom-face.png'),
      bride: this.loadImage('/assets/images/people/bride-face.png')
    };
    this.audioCtx = null;

    this.bindEvents();
    this.renderBest();
    window.__heartGame = this; // handy for testing in the browser console
  }

  /* ------------------------------------------------------------ helpers */
  loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  loadBest() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return { groom: Number(parsed.groom) || 0, bride: Number(parsed.bride) || 0 };
    } catch (e) {
      return { groom: 0, bride: 0 };
    }
  }

  saveBest() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.best)); } catch (e) {}
  }

  renderBest() {
    const pad = (n) => String(n).padStart(3, '0');
    if (this.bestGroomEl) this.bestGroomEl.textContent = pad(this.best.groom);
    if (this.bestBrideEl) this.bestBrideEl.textContent = pad(this.best.bride);
    const groomLeads = this.best.groom > this.best.bride;
    const brideLeads = this.best.bride > this.best.groom;
    if (this.crownGroom) this.crownGroom.classList.toggle('show', groomLeads);
    if (this.crownBride) this.crownBride.classList.toggle('show', brideLeads);
    if (this.resultGroom) this.resultGroom.textContent = pad(this.best.groom);
    if (this.resultBride) this.resultBride.textContent = pad(this.best.bride);
    if (this.rcrownGroom) this.rcrownGroom.classList.toggle('show', groomLeads);
    if (this.rcrownBride) this.rcrownBride.classList.toggle('show', brideLeads);
    if (this.result && (this.best.groom || this.best.bride)) this.result.hidden = false;
  }

  /** After a round: back to the question page, with the points shown there. */
  returnToIntro(lastScore = null) {
    this.running = false;
    cancelAnimationFrame(this.raf);
    if (this.returnTimer) clearTimeout(this.returnTimer);
    this.hide(this.over);
    this.hide(this.stage);
    this.hide(this.pick);
    this.hide(this.later);
    this.lockScroll(false);
    if (lastScore !== null && this.resultLast) {
      const name = this.side === 'bride' ? 'Dona' : 'Jithin';
      this.resultLast.textContent = `Your last bouquet: ${lastScore} rose${lastScore === 1 ? '' : 's'} for ${name}`;
      if (this.result) this.result.hidden = false;
      if (this.yesBtn) this.yesBtn.textContent = 'Play again! ♥';
    }
    this.renderBest();
    this.show(this.intro);
    this.scrollToSection();
  }

  show(el) { if (el) el.hidden = false; }
  hide(el) { if (el) el.hidden = true; }

  lockScroll(lock) {
    if (!this.scrollContainer) return;
    this.scrollContainer.style.overflow = lock ? 'hidden' : '';
    this.scrollContainer.classList.toggle('game-playing', lock);
  }

  scrollToSection() {
    if (!this.scrollContainer || !this.section) return;
    const top = this.section.offsetTop;
    this.scrollContainer.scrollTo({ top, behavior: 'smooth' });
  }

  /* ------------------------------------------------------------- events */
  bindEvents() {
    const stop = (e) => e.stopPropagation();
    this.section.addEventListener('click', stop);

    const yes = document.getElementById('game-yes');
    const no = document.getElementById('game-no');
    const laterYes = document.getElementById('game-later-yes');
    if (yes) yes.addEventListener('click', () => { this.hide(this.intro); this.hide(this.later); this.show(this.pick); this.scrollToSection(); });
    if (no) no.addEventListener('click', () => { this.hide(this.intro); this.show(this.later); });
    if (laterYes) laterYes.addEventListener('click', () => { this.hide(this.later); this.show(this.pick); this.scrollToSection(); });

    this.section.querySelectorAll('[data-side]').forEach((btn) => {
      btn.addEventListener('click', () => { if (this.over && !this.over.hidden) return; this.start(btn.dataset.side); });
    });

    const close = document.getElementById('game-close');
    if (close) close.addEventListener('click', () => { if (this.over && !this.over.hidden) return; this.returnToIntro(this.running ? this.score : null); });
    if (this.over) ['click', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach((ev) => this.over.addEventListener(ev, (e) => { e.stopPropagation(); if (ev !== 'click') e.preventDefault(); }, { passive: false }));

    if (this.canvas) {
      this.canvas.style.touchAction = 'none';
      const move = (e) => {
        if (!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        this.targetX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      };
      this.canvas.addEventListener('pointerdown', (e) => { try { this.canvas.setPointerCapture(e.pointerId); } catch (err) {} move(e); });
      this.canvas.addEventListener('pointermove', move);
      // older mobile browsers: follow raw touches too, and never let a drag scroll or zoom the page
      const touchMove = (e) => {
        if (!this.running) return;
        const t = e.touches && e.touches[0];
        if (t) { e.preventDefault(); move({ clientX: t.clientX }); }
      };
      this.canvas.addEventListener('touchstart', touchMove, { passive: false });
      this.canvas.addEventListener('touchmove', touchMove, { passive: false });
      this.stage.addEventListener('touchmove', (e) => { if (this.running) e.preventDefault(); }, { passive: false });
      window.addEventListener('keydown', (e) => {
        if (!this.running) return;
        if (e.key === 'ArrowLeft') this.targetX = Math.max(0, (this.targetX ?? this.basket.x) - 60);
        if (e.key === 'ArrowRight') this.targetX = Math.min(this.canvas.width, (this.targetX ?? this.basket.x) + 60);
      });
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (!this.running) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (this.running) { this.resize(); this.bouquetCache = null; } }, 150);
    });
  }

  /* --------------------------------------------------------------- game */
  resize() {
    const rect = this.stage.getBoundingClientRect();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.spriteCache = new Map();
    this.bouquetCache = null;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.dpr = dpr;
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.basket = {
      x: this.basket ? Math.min(W, this.basket.x) : W / 2,
      w: Math.min(W * 0.3, 128 * dpr),
      h: 96 * dpr,
      y: H - 150 * dpr
    };
  }

  start(side) {
    if (!this.ctx) return;
    this.side = side === 'bride' ? 'bride' : 'groom';
    this.hide(this.pick);
    this.hide(this.over);
    this.show(this.stage);
    this.stage.dataset.side = this.side;
    this.lockScroll(true);
    this.scrollToSection();
    this.resize();

    this.hearts = [];
    this.jarHearts = [];
    this.score = 0;
    this.scoreEl.textContent = '0';
    this.targetX = this.basket.x;
    this.spawnEvery = 1000;
    this.lastSpawn = performance.now() + 700;
    this.lastTime = performance.now();
    this.running = true;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  exit() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.hide(this.stage);
    this.hide(this.over);
    this.lockScroll(false);
    this.show(this.pick);
  }

  spawn() {
    const W = this.canvas.width;
    const dpr = this.dpr;
    const size = (26 + Math.random() * 12) * dpr;
    this.hearts.push({
      x: size + Math.random() * (W - size * 2),
      y: -size,
      size,
      vy: (1.6 + Math.min(2.6, this.score * 0.08)) * dpr * (0.9 + Math.random() * 0.3),
      sway: (Math.random() - 0.5) * 0.9 * dpr,
      phase: Math.random() * Math.PI * 2,
      rot: (Math.random() - 0.5) * 0.5,
      hue: [350, 345, 0, 8, 330][Math.floor(Math.random() * 5)],
      kind: Math.random() < 0.18 ? 'bud' : 'rose'
    });
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(40, now - this.lastTime) / 16.67;
    this.lastTime = now;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const dpr = this.dpr;

    if (now - this.lastSpawn > this.spawnEvery) {
      this.spawn();
      this.lastSpawn = now;
      this.spawnEvery = Math.max(420, 1000 - this.score * 22);
    }

    // basket follows the finger smoothly
    const b = this.basket;
    b.x += ((this.targetX ?? b.x) - b.x) * 0.25 * dt;
    b.x = Math.max(b.w / 2, Math.min(W - b.w / 2, b.x));

    for (const h of this.hearts) {
      h.y += h.vy * dt;
      h.phase += 0.05 * dt;
      h.x += Math.sin(h.phase) * h.sway * dt;
      h.x = Math.max(h.size / 2, Math.min(W - h.size / 2, h.x));
    }

    // catches
    const rimTop = b.y - b.h * 0.15;
    const rimBottom = b.y + b.h * 0.45;
    this.hearts = this.hearts.filter((h) => {
      const inX = Math.abs(h.x - b.x) < b.w / 2 - h.size * 0.15;
      const inY = h.y + h.size * 0.35 > rimTop && h.y < rimBottom;
      if (inX && inY) {
        this.score++;
        this.jarHearts.push({ dx: (Math.random() - 0.5) * 0.62, rot: (Math.random() - 0.5) * 0.8, hue: h.hue });
        this.scoreEl.textContent = String(this.score);
        this.scoreEl.classList.remove('bump');
        void this.scoreEl.offsetWidth;
        this.scoreEl.classList.add('bump');
        this.pop();
        return false;
      }
      return true;
    });

    // a miss ends the game
    const missed = this.hearts.find((h) => h.y - h.size * 0.4 > H);
    this.draw();
    if (missed) {
      this.gameOver();
      return;
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const dpr = this.dpr;
    ctx.clearRect(0, 0, W, H);

    // ground line
    ctx.strokeStyle = 'rgba(120, 100, 20, 0.18)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(0, H - 40 * dpr);
    ctx.lineTo(W, H - 40 * dpr);
    ctx.stroke();

    for (const h of this.hearts) this.drawHeart(h);
    this.drawBasket();
  }

  drawHeart(h) {
    this.drawRose(h);
  }

  /** A rose seen from above: layered petals around a tight centre, with two leaves. */
  drawRose(h) {
    const ctx = this.ctx;
    const sprite = this.roseSprite(h.hue, h.kind === 'bud' ? 'bud' : 'rose');
    const s = h.size * 2.2; // sprite has margin for leaves
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot + Math.sin(h.phase) * 0.12);
    ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  /** One pre-rendered rose per hue/kind (drawn once at 96px, scaled when used). */
  roseSprite(hue, kind) {
    const key = hue + ':' + kind;
    if (!this.spriteCache) this.spriteCache = new Map();
    let c = this.spriteCache.get(key);
    if (c) return c;
    const size = 96;
    c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const s = size / 2.2;
    ctx.translate(size / 2, size / 2);
    ctx.fillStyle = '#5f8f5a';
    for (const a of [2.4, 0.5]) {
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(s * 0.42, 0, s * 0.28, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const rings = kind === 'bud' ? [[6, 0.42, 0.78], [5, 0.26, 0.6]] : [[7, 0.5, 0.78], [6, 0.36, 0.64], [5, 0.22, 0.52]];
    rings.forEach(([n, rad, light], ri) => {
      for (let i = 0; i < n; i++) {
        ctx.save(); ctx.rotate((i / n) * Math.PI * 2 + ri * 0.4);
        const gr = ctx.createRadialGradient(rad * s * 0.6, 0, s * 0.05, rad * s * 0.6, 0, rad * s);
        gr.addColorStop(0, 'hsl(' + hue + ', 85%, ' + Math.round(light * 100) + '%)');
        gr.addColorStop(1, 'hsl(' + hue + ', 80%, ' + (Math.round(light * 100) - 22) + '%)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.ellipse(rad * s * 0.55, 0, rad * s * 0.5, rad * s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    });
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.16);
    cg.addColorStop(0, 'hsl(' + hue + ', 90%, 58%)');
    cg.addColorStop(1, 'hsl(' + hue + ', 85%, 34%)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2); ctx.fill();
    this.spriteCache.set(key, c);
    return c;
  }

  drawBasket() {
    this.drawJar();
  }

  drawJar() {
    // the bouquet only changes when a rose is caught, so keep it as a cached image
    const key = this.side + ':' + this.jarHearts.length + ':' + Math.round(this.basket.w) + ':' + (this.avatars[this.side] && this.avatars[this.side].complete ? 1 : 0);
    if (!this.bouquetCache || this.bouquetCache.key !== key) {
      const w = Math.ceil(this.basket.w * 1.5);
      const h = Math.ceil(this.basket.h * 2.4);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const saved = { ctx: this.ctx, basket: this.basket };
      this.ctx = c.getContext('2d');
      this.basket = { x: w / 2, y: h - this.basket.h - 4, w: saved.basket.w, h: saved.basket.h };
      this.drawBouquet();
      this.ctx = saved.ctx; this.basket = saved.basket;
      this.bouquetCache = { key, canvas: c, w, h };
    }
    const bc = this.bouquetCache;
    this.ctx.drawImage(bc.canvas, Math.round(this.basket.x - bc.w / 2), Math.round(this.basket.y + this.basket.h + 4 - bc.h));
  }

  /** An empty bouquet (paper wrap + ribbon) that fills with the roses caught. */
  drawBouquet(noFace = false) {
    const ctx = this.ctx;
    const b = this.basket;
    const dpr = this.dpr;
    const x = b.x;
    const y = b.y;
    const w = b.w;
    const h = b.h;

    // the person holding it (face above the bouquet)
    const img = this.avatars[this.side];
    const r = Math.min(w * 0.3, 30 * dpr);
    const ay = y - r * 1.15;
    if (!noFace) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, ay, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#fff6d8';
    ctx.fill();
    ctx.clip();
    if (img && img.complete && img.naturalWidth) {
      const side = img.naturalWidth;
      const srcY = 0;
      ctx.drawImage(img, 0, srcY, side, side, x - r, ay - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, ay, r, 0, Math.PI * 2);
    ctx.lineWidth = 3 * dpr;
    ctx.strokeStyle = '#cfa344';
    ctx.stroke();
    }

    // wrap: a cone of cream paper with a lace edge
    const topW = w;
    const botW = w * 0.3;
    const topY = y + h * 0.1;
    const botY = y + h;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0)';
    const paper = ctx.createLinearGradient(x - topW / 2, 0, x + topW / 2, 0);
    paper.addColorStop(0, '#e8d7bf');
    paper.addColorStop(0.5, '#fff8ec');
    paper.addColorStop(1, '#e3cfb3');
    ctx.fillStyle = paper;
    ctx.beginPath();
    ctx.moveTo(x - topW / 2, topY);
    ctx.lineTo(x + topW / 2, topY);
    ctx.lineTo(x + botW / 2, botY);
    ctx.lineTo(x - botW / 2, botY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // back fold of the wrap (darker) behind the roses
    ctx.fillStyle = '#d9c6a6';
    ctx.beginPath();
    ctx.ellipse(x, topY, topW / 2, h * 0.16, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // roses gathered so far, clipped above the wrap
    const mini = Math.max(10 * dpr, w * 0.17);
    const flowers = this.jarHearts.slice(-24);
    flowers.forEach((f, i) => {
      const row = Math.floor(i / 6) % 4;
      const col = i % 6;
      const spread = topW * 0.82;
      const fx = x - spread / 2 + (spread / 5) * col + f.dx * mini * 0.6;
      const fy = topY - mini * 0.35 - row * mini * 0.55 + Math.abs(col - 2.5) * mini * 0.12;
      this.drawRose({ x: fx, y: fy, size: mini * (0.9 + (i % 3) * 0.08), rot: f.rot, phase: 0, hue: f.hue, kind: 'rose' });
    });
    // sprigs of greenery once there are a few roses
    if (flowers.length >= 3) {
      ctx.strokeStyle = '#6f9c67';
      ctx.lineWidth = 2 * dpr;
      ctx.lineCap = 'round';
      for (const [dx, dy] of [[-0.46, -0.5], [0.44, -0.55], [0, -0.75]]) {
        ctx.beginPath();
        ctx.moveTo(x + dx * topW * 0.6, topY);
        ctx.lineTo(x + dx * topW * 0.9, topY + dy * h);
        ctx.stroke();
      }
    }

    // front lip of the wrap + lace edge
    ctx.fillStyle = '#fff4e2';
    ctx.beginPath();
    ctx.ellipse(x, topY, topW / 2, h * 0.16, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#cfa344';
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.ellipse(x, topY, topW / 2, h * 0.16, 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(207, 163, 68, 0.6)';
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.moveTo(x - topW / 2, topY);
    ctx.lineTo(x - botW / 2, botY);
    ctx.moveTo(x + topW / 2, topY);
    ctx.lineTo(x + botW / 2, botY);
    ctx.stroke();

    // ribbon with a bow
    const ry = y + h * 0.62;
    const rw = topW * 0.52;
    ctx.fillStyle = '#e8475f';
    ctx.fillRect(x - rw / 2, ry - 4 * dpr, rw, 8 * dpr);
    ctx.beginPath();
    ctx.ellipse(x - 9 * dpr, ry, 9 * dpr, 6 * dpr, -0.5, 0, Math.PI * 2);
    ctx.ellipse(x + 9 * dpr, ry, 9 * dpr, 6 * dpr, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c93652';
    ctx.beginPath();
    ctx.arc(x, ry, 3.5 * dpr, 0, Math.PI * 2);
    ctx.fill();

    // name tag
    ctx.fillStyle = '#4a3d10';
    ctx.font = `700 ${Math.round(11 * dpr)}px 'Cormorant Garamond', Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${this.side === 'bride' ? 'Dona' : 'Jithin'} 🌹`, x, ry + 9 * dpr);
  }

  gameOver() {
    this.running = false;
    this.overSince = Date.now();
    cancelAnimationFrame(this.raf);
    if (this.score > this.best[this.side]) {
      this.best[this.side] = this.score;
      this.saveBest();
    }
    this.renderBest();

    const name = this.side === 'bride' ? 'Dona' : 'Jithin';
    const s = this.score;
    let title;
    let text;
    if (s === 0) { title = 'Oops, butterfingers!'; text = `Not a single rose for ${name}. Love takes practice… try again?`; }
    else if (s < 6) { title = 'A good start!'; text = `${name}'s bouquet has ${s} rose${s === 1 ? '' : 's'}. Cupid says keep going.`; }
    else if (s < 15) { title = 'Not bad, cupid!'; text = `${s} roses for ${name}. That bouquet is starting to look lovely.`; }
    else if (s < 30) { title = 'Rose gatherer!'; text = `${s} roses! ${name} is clearly the lucky one.`; }
    else { title = 'Bouquet champion!'; text = `${s} roses for ${name}. The most beautiful bouquet of the day.`; }
    if (this.overTitle) this.overTitle.textContent = title;
    if (this.overText) this.overText.textContent = text;
    if (this.overScore) this.overScore.textContent = String(s);
    this.renderOverBouquet(name);
    this.show(this.over);
    this.buzz();

    // A moment to read the result, then back to the question page with the points
    if (this.returnTimer) clearTimeout(this.returnTimer);
    const shownAt = Date.now();
    const back = () => { const left = 5000 - (Date.now() - shownAt); if (left > 30) { this.returnTimer = setTimeout(back, left); return; } this.returnToIntro(s); };
    this.returnTimer = setTimeout(back, 5000);
  }

  /** Draws the bouquet the player built onto the result card, with the chosen face above it. */
  renderOverBouquet(name) {
    const canvas = document.getElementById('game-over-bouquet');
    const forEl = document.getElementById('game-over-for');
    const avatar = document.getElementById('game-over-avatar');
    if (forEl) forEl.textContent = this.score > 0 ? `You made this bouquet for ${name}` : `An empty bouquet for ${name}… next time!`;
    if (avatar) {
      const img = avatar.querySelector('img');
      if (img) img.src = this.side === 'bride' ? '/assets/images/people/bride-face.png' : '/assets/images/people/groom-face.png';
    }
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // draw with the game's own bouquet routine, scaled to the card
    const saved = { ctx: this.ctx, canvas: this.canvas, basket: this.basket, dpr: this.dpr, side: this.side };
    this.ctx = ctx;
    this.canvas = canvas;
    this.dpr = 1;
    this.basket = { x: W / 2, y: H * 0.5, w: W * 0.62, h: H * 0.42 };
    this.drawBouquetOnly();
    this.ctx = saved.ctx;
    this.canvas = saved.canvas;
    this.basket = saved.basket;
    this.dpr = saved.dpr;
  }

  /** The bouquet without the holder's face (the card shows the face separately). */
  drawBouquetOnly() {
    const keep = this.avatars;
    this.avatars = { groom: null, bride: null };
    this.drawBouquet(true);
    this.avatars = keep;
  }

  /* -------------------------------------------------------------- sounds */
  audio() {
    if (!this.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.audioCtx = new AC();
    }
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
    return this.audioCtx;
  }

  pop() {
    return; // sound effects disabled: the site plays no audio
    try {
      const ctx = this.audio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(660 + Math.random() * 120, now);
      o.frequency.exponentialRampToValueAtTime(990, now + 0.08);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.15);
    } catch (e) {}
  }

  buzz() {
    return; // sound effects disabled: the site plays no audio
    try {
      const ctx = this.audio();
      if (!ctx) return;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, now);
      o.frequency.exponentialRampToValueAtTime(110, now + 0.35);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.42);
    } catch (e) {}
  }
}
