/**
 * INTRO-EXPERIENCE.JS
 * Drives the invitation pages.
 *
 * 1. On load the watercolor painting of the couple walking to the church is
 *    "washed" onto the paper while the names are lettered into the blank sky.
 * 2. A tap dissolves the painting into the verse page: corner leaves grow in, the
 *    cross and Matthew 19:6 fade up, the bottom foliage rises and keeps swaying.
 *    The vinyl record on that page plays / pauses the song.
 * 3. "Continue" starts the song (if not already playing) and reveals the engagement
 *    ceremony invitation: the artwork sharpens into view and the text is lettered in.
 * 4. "Wedding Ceremony Invitation" opens the wedding slides: the groom, then the bride,
 *    then the couple with greetings, date and venue ("Next" or a tap advances).
 *    Scrolling down on the couple slide reveals the memories gallery.
 */

export class IntroExperience {
  constructor(audioPlayer = null) {
    this.audioPlayer = audioPlayer;

    // DOM Elements
    this.pageStack = document.getElementById('page-stack');
    this.introStage = document.getElementById('watercolor-intro-stage');
    this.introImg = document.getElementById('wc-art-img');
    this.tapPrompt = document.getElementById('wc-tap-prompt');
    this.verseStage = document.getElementById('verse-intro-stage');
    this.verseBtn = document.getElementById('verse-continue-btn');
    this.gramophone = document.getElementById('verse-gramophone');
    this.nextStage = document.getElementById('engagement-stage');
    this.engNextBtn = document.getElementById('engagement-continue-btn');
    this.weddingStage = document.getElementById('wedding-stage');
    this.weddingSlides = Array.from(document.querySelectorAll('#wedding-slides .wd-slide'));
    this.weddingDots = Array.from(document.querySelectorAll('#wedding-dots span'));
    this.weddingNextBtn = document.getElementById('wedding-next-btn');
    this.weddingIndex = 0;
    this.slideLeaveTimer = null;
    this.coupleSlide = document.querySelector('#wedding-slides .wd-slide-couple');
    this.memories = document.getElementById('wedding-memories');
    this.lightbox = document.getElementById('memory-lightbox');
    this.lightboxImg = document.getElementById('memory-lightbox-img');
    this.lightboxClose = document.getElementById('memory-lightbox-close');

    // State
    this.introEnded = false;   // painting dismissed
    this.verseEnded = false;   // verse page dismissed
    this.introStartTimer = null;

    this.bindEvents();
    this.setupMemories();
    this.startCountdown();
    this.playIntro();
  }

  /** Memories gallery on the couple slide: reveal on scroll, tap to enlarge. */
  setupMemories() {
    if (!this.coupleSlide || !this.memories) return;

    // Hide the "scroll down" hint once the guest starts scrolling
    this.coupleSlide.addEventListener('scroll', () => {
      this.coupleSlide.classList.toggle('scrolled', this.coupleSlide.scrollTop > 40);
      if (this.weddingStage) this.weddingStage.classList.toggle('scrolled', this.coupleSlide.scrollTop > 40);
    }, { passive: true });

    // Reveal the section heading and each polaroid as it scrolls into view
    const targets = [this.memories, ...this.memories.querySelectorAll('.mem-card')];
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      }, { root: this.coupleSlide, threshold: 0.15 });
      targets.forEach((t) => io.observe(t));
    } else {
      targets.forEach((t) => t.classList.add('in-view'));
    }

    // Tap a card to enlarge the photo it is showing right now
    this.memories.querySelectorAll('.mem-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const img = card.querySelector('.mem-card-a');
        this.openLightbox(card.dataset.full || (img && img.src), img ? img.alt : '');
      });
    });


    const close = (e) => {
      if (e) e.stopPropagation();
      this.closeLightbox();
    };
    // the photo list, in page order, for prev/next
    this.gallery = Array.from(this.memories.querySelectorAll('.mem-card')).map((c) => {
      const img = c.querySelector('img');
      const fc = c.querySelector('figcaption');
      return { src: c.dataset.full || (img && img.src), alt: img ? img.alt : '', caption: c.dataset.caption || (fc ? fc.textContent.trim() : '') };
    });
    this.galleryIndex = 0;
    const bg = document.getElementById('memory-lightbox-bg');
    const frame = document.getElementById('memory-lightbox-frame');
    const prev = document.getElementById('memory-lightbox-prev');
    const next = document.getElementById('memory-lightbox-next');
    if (bg) bg.addEventListener('click', close);
    if (this.lightboxClose) this.lightboxClose.addEventListener('click', close);
    if (prev) prev.addEventListener('click', (e) => { e.stopPropagation(); this.stepLightbox(-1); });
    if (next) next.addEventListener('click', (e) => { e.stopPropagation(); this.stepLightbox(1); });
    if (frame) {
      frame.addEventListener('click', (e) => e.stopPropagation());
      let x0 = null;
      frame.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
      frame.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) this.stepLightbox(dx < 0 ? 1 : -1); });
    }
    if (this.lightbox) this.lightbox.addEventListener('click', (e) => e.stopPropagation());
    window.addEventListener('keydown', (e) => {
      if (!this.lightbox || this.lightbox.hidden) return;
      if (e.key === 'Escape') this.closeLightbox();
      if (e.key === 'ArrowRight') this.stepLightbox(1);
      if (e.key === 'ArrowLeft') this.stepLightbox(-1);
    });
  }

  /** "N DAYS TO GO" until the wedding (11 January 2027, 4:00 PM). */
  startCountdown() {
    const title = document.getElementById('wedding-countdown');
    const sub = document.getElementById('wedding-countdown-sub');
    if (!title) return;
    const wedding = new Date(2027, 0, 11, 16, 0, 0);
    const update = () => {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startWedding = new Date(wedding.getFullYear(), wedding.getMonth(), wedding.getDate());
      const days = Math.round((startWedding - startToday) / 86400000);
      if (days > 1) {
        title.textContent = days === 30 ? 'One month to go' : `${days} days to go`;
        if (sub) sub.textContent = 'until we say “I do”';
      } else if (days === 1) {
        title.textContent = 'One day to go';
        if (sub) sub.textContent = 'Tomorrow we say “I do”';
      } else if (days === 0) {
        title.textContent = 'Today is the day';
        if (sub) sub.textContent = '11 January 2027 · 4:00 PM';
      } else {
        title.textContent = 'Happily married';
        if (sub) sub.textContent = 'Since 11 January 2027';
      }
    };
    update();
    setInterval(update, 60 * 1000);
  }

  /** The three cards keep changing photos, one card at a time, with a soft crossfade. */
  startCardCycle() {
    const cards = Array.from(this.memories.querySelectorAll('.mem-card'));
    const photos = (this.memories.dataset.photos || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (cards.length < 2 || photos.length <= cards.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const alts = {};
    cards.forEach((c) => { const a = c.querySelector('.mem-card-a'); if (a) alts[a.getAttribute('src')] = a.alt; });

    let turn = 0;
    const swap = () => {
      if (!this.memories.classList.contains('in-view')) return;
      if (this.lightbox && !this.lightbox.hidden) return;
      const card = cards[turn % cards.length];
      turn++;
      const showing = cards.map((c) => c.querySelector('.mem-card-a').getAttribute('src'));
      const candidates = photos.filter((p) => !showing.includes(p));
      if (!candidates.length) return;
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      const a = card.querySelector('.mem-card-a');
      const b = card.querySelector('.mem-card-b');
      if (!a || !b) return;
      b.src = next;
      b.alt = '';
      const finish = () => {
        card.classList.add('swapping');
        setTimeout(() => {
          a.src = next;
          a.alt = alts[next] || 'Jithin and Dona';
          card.dataset.full = next;
          card.classList.remove('swapping');
          b.src = '';
        }, 950);
      };
      if (b.complete && b.naturalWidth) finish();
      else b.addEventListener('load', finish, { once: true });
    };
    setInterval(swap, 3600);
  }

  openLightbox(src, alt) {
    if (!this.lightbox || !this.lightboxImg || !src) return;
    const idx = (this.gallery || []).findIndex((g) => g.src === src);
    this.galleryIndex = idx >= 0 ? idx : 0;
    this.showLightboxPhoto(false);
    this.lightbox.hidden = false;
    void this.lightbox.offsetWidth;
    this.lightbox.classList.add('open');
  }

  stepLightbox(dir) {
    if (!this.gallery || !this.gallery.length) return;
    this.galleryIndex = (this.galleryIndex + dir + this.gallery.length) % this.gallery.length;
    this.showLightboxPhoto(true, dir);
  }

  showLightboxPhoto(animate, dir = 1) {
    const g = (this.gallery || [])[this.galleryIndex];
    if (!g) return;
    const frame = document.getElementById('memory-lightbox-frame');
    const bg = document.getElementById('memory-lightbox-bg');
    const cap = document.getElementById('memory-lightbox-caption');
    const count = document.getElementById('memory-lightbox-count');
    const swap = () => {
      this.lightboxImg.src = g.src;
      this.lightboxImg.alt = g.alt || '';
      if (bg) bg.style.backgroundImage = 'url("' + g.src + '")';
      if (cap) cap.textContent = g.caption || 'Jithin & Dona';
      if (count) count.textContent = (this.galleryIndex + 1) + ' of ' + this.gallery.length;
    };
    if (!animate || !frame) { swap(); return; }
    frame.classList.remove('slide-l', 'slide-r');
    void frame.offsetWidth;
    frame.classList.add(dir > 0 ? 'slide-l' : 'slide-r');
    setTimeout(swap, 160);
    setTimeout(() => frame.classList.remove('slide-l', 'slide-r'), 420);
  }

  closeLightbox() {
    if (!this.lightbox || this.lightbox.hidden) return;
    this.lightbox.classList.remove('open');
    setTimeout(() => {
      this.lightbox.hidden = true;
      if (this.lightboxImg) this.lightboxImg.src = '';
    }, 350);
  }

  bindEvents() {
    // Tap anywhere on the painting (or the prompt) reveals the verse page
    if (this.introStage) {
      this.introStage.addEventListener('click', () => this.showVersePage());
    }
    if (this.tapPrompt) {
      this.tapPrompt.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showVersePage();
      });
    }

    // Vinyl record on the verse page: play / pause the song without leaving the page
    if (this.gramophone) {
      this.gramophone.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.audioPlayer) this.audioPlayer.toggle();
      });
    }

    // "Wedding Ceremony Invitation" on the engagement page
    if (this.engNextBtn) {
      this.engNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showWeddingPage();
      });
    }

    // Wedding slides: "Next" (or a tap anywhere on the slide) moves to the next slide
    if (this.weddingNextBtn) {
      this.weddingNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextWeddingSlide();
      });
    }
    if (this.weddingStage) {
      this.weddingStage.addEventListener('click', () => this.nextWeddingSlide());
    }

    // "Continue" (or a tap anywhere else on the verse page) moves to the next page
    if (this.verseStage) {
      this.verseStage.addEventListener('click', () => this.showNextPage());
    }
    if (this.verseBtn) {
      this.verseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showNextPage();
      });
    }
  }

  /** "Wedding Ceremony Invitation" on the engagement page opens the wedding slides. */
  showWeddingPage() {
    if (this.weddingShown) return;
    this.weddingShown = true;
    this.hideStage(this.nextStage, false);
    if (this.weddingStage) {
      this.weddingStage.classList.remove('at-end');
      this.showStage(this.weddingStage);
      this.setWeddingSlide(0, true);
    }
    window.dispatchEvent(new CustomEvent('weddingPageShown'));
  }

  /** Groom → bride → couple. */
  nextWeddingSlide() {
    if (!this.weddingShown) return;
    if (this.weddingIndex >= this.weddingSlides.length - 1) return;
    this.setWeddingSlide(this.weddingIndex + 1);
  }

  /** The big butterfly stays put; a few tiny ones flutter across the card when the page opens. */
  scheduleButterfly(active) {
    const stage = document.getElementById('butterfly-stage');
    if (this.bfTimer) { clearTimeout(this.bfTimer); this.bfTimer = null; }
    if (!stage) return;
    const tinies = Array.from(stage.querySelectorAll('.bf-tiny'));
    if (!active) {
      tinies.forEach((t) => t.classList.remove('fly'));
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const release = () => {
      tinies.forEach((t) => {
        t.classList.remove('fly');
        void t.offsetWidth;
        t.classList.add('fly');
      });
      // a fresh little flight now and then
      this.bfTimer = setTimeout(release, 26000);
    };
    this.bfTimer = setTimeout(release, 900);
  }

  /** The sealed envelope: the ribbon bow unties, the flap lifts and the card slides out. */
  armEnvelope() {
    const scene = document.getElementById('env-scene');
    const bow = document.getElementById('env-bow');
    if (!scene || !bow || this.envelopeArmed) return;
    if (this.envOpenTimer) clearTimeout(this.envOpenTimer);
    this.envelopeArmed = true;
    if (this.coupleSlide) this.coupleSlide.classList.add('env-sealed');

    const open = (e) => {
      if (e) e.stopPropagation();
      if (scene.classList.contains('untying') || scene.classList.contains('opened')) return;
      scene.classList.add('untying', 'flap-open');                  // both flaps start swinging open
      setTimeout(() => scene.classList.add('card-out'), 400);
      setTimeout(() => {
        scene.classList.add('opened');                              // envelope gone, names letter in
        this.releaseInvButterflies();
        if (this.coupleSlide) this.coupleSlide.classList.remove('env-sealed');
      }, 950);
      if (this.audioPlayer && !this.audioPlayer.isPlaying) this.audioPlayer.play();
    };
    bow.addEventListener('click', open);
    this.envOpenTimer = setTimeout(() => open(), 450);
    bow.addEventListener('pointerdown', (e) => e.stopPropagation());
    scene.addEventListener('click', (e) => { if (!scene.classList.contains('opened')) open(e); });
  }

  /** Small butterflies flutter across the opened invitation card, now and then. */
  releaseInvButterflies() {
    const host = document.getElementById('inv-bfs');
    if (!host) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const flies = Array.from(host.querySelectorAll('.inv-bf'));
    // two butterflies fly in once as the details appear, then the card stays with a soft flower shower
    const flowers = document.getElementById('inv-flowers');
    if (this.invBfTimer) clearTimeout(this.invBfTimer);
    this.invBfTimer = setTimeout(() => {
      flies.forEach((f) => { f.classList.remove('fly'); void f.offsetWidth; f.classList.add('fly'); });
      setTimeout(() => { if (flowers) flowers.classList.add('on'); }, 2500);
    }, 400);
  }

  setWeddingSlide(index, instant = false) {
    if (!this.weddingSlides.length) return;
    if (this.slideLeaveTimer) clearTimeout(this.slideLeaveTimer);
    const previous = this.weddingSlides[this.weddingIndex];
    this.weddingIndex = index;

    this.weddingSlides.forEach((slide, i) => {
      slide.classList.remove('leaving');
      if (i === index) {
        slide.classList.remove('active');
        void slide.offsetWidth; // restart the slide's entrance animations
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    if (!instant && previous && previous !== this.weddingSlides[index]) {
      previous.classList.add('leaving');
      this.slideLeaveTimer = setTimeout(() => previous.classList.remove('leaving'), 800);
    }

    this.weddingDots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    if (this.weddingNextBtn) {
      const last = this.weddingSlides.length - 1;
      this.weddingNextBtn.textContent = index === last - 1 ? '✦ View our wedding ✦' : 'Next ✦';
    }
    this.scheduleButterfly(index === this.weddingSlides.length - 1);
    if (index === this.weddingSlides.length - 1) this.armEnvelope();
    if (this.weddingStage) {
      this.weddingStage.classList.toggle('at-end', index === this.weddingSlides.length - 1);
    }
    window.dispatchEvent(new CustomEvent('weddingSlideShown', { detail: { index } }));
  }

  /**
   * Paints the watercolor artwork onto the screen.
   * The CSS animation starts only once the image has decoded so the reveal
   * never begins on an empty canvas (with a short fallback for slow networks).
   */
  playIntro() {
    this.introEnded = false;
    this.verseEnded = false;
    this.weddingShown = false;
    if (this.introStartTimer) clearTimeout(this.introStartTimer);
    this.hideStage(this.verseStage, true);
    this.hideStage(this.nextStage, true);
    this.hideStage(this.weddingStage, true);
    this.weddingSlides.forEach((s) => s.classList.remove('active', 'leaving'));
    if (this.weddingStage) this.weddingStage.classList.remove('at-end');
    this.weddingIndex = 0;

    if (!this.introStage) {
      this.showVersePage();
      return;
    }

    // Rewind the painting so the CSS animations restart from the first brush stroke
    this.introStage.classList.remove('intro-hidden', 'playing');
    void this.introStage.offsetWidth; // force reflow so the animations restart

    let started = false;
    const start = () => {
      if (started || this.introEnded) return;
      started = true;
      if (this.introStartTimer) clearTimeout(this.introStartTimer);
      this.introStage.classList.add('playing');
    };

    if (this.introImg && !this.introImg.complete) {
      this.introImg.addEventListener('load', start, { once: true });
      this.introImg.addEventListener('error', start, { once: true });
      this.introStartTimer = setTimeout(start, 1800);
    } else {
      start();
    }
  }

  /** The painting dissolves and the verse page animates in. */
  showVersePage() {
    if (this.introEnded) return;
    this.introEnded = true;
    if (this.introStartTimer) clearTimeout(this.introStartTimer);

    if (this.introStage) {
      this.introStage.classList.add('intro-hidden');
    }

    // The first tap is the guest's first gesture: start the song right here
    if (this.audioPlayer && !this.audioPlayer.isPlaying) {
      this.audioPlayer.play();
    }

    if (!this.verseStage) {
      this.showNextPage();
      return;
    }

    this.showStage(this.verseStage);
    window.dispatchEvent(new CustomEvent('versePageShown'));
  }

  /** "Continue": start the song and reveal the next page. */
  showNextPage() {
    if (this.verseEnded) return;
    this.verseEnded = true;
    this.introEnded = true;

    if (this.audioPlayer && !this.audioPlayer.isPlaying) {
      this.audioPlayer.play();
    }

    if (this.introStage) {
      this.introStage.classList.add('intro-hidden');
    }
    this.hideStage(this.verseStage, false);

    if (this.nextStage) {
      this.showStage(this.nextStage);
    }
    window.dispatchEvent(new CustomEvent('nextPageShown'));
  }

  showStage(stage) {
    if (!stage) return;
    if (stage.classList.contains('playing') && !stage.classList.contains('stage-hidden')) return; // already showing: never restart it
    stage.classList.remove('stage-hidden', 'playing');
    void stage.offsetWidth; // restart the CSS animations from the beginning
    stage.classList.add('playing');
  }

  hideStage(stage, instant = false) {
    if (!stage) return;
    stage.classList.add('stage-hidden');
    if (instant) {
      stage.classList.remove('playing');
    }
  }

  replayIntro() {
    if (this.audioPlayer && this.audioPlayer.isPlaying) {
      this.audioPlayer.pause();
    }
    this.playIntro();
  }
}
