/**
 * MAIN.JS
 * Jithin & Dona wedding invitation: the painting intro, the verse page and the song.
 */

import { BackgroundMusic } from './audio-player.js';
import { IntroExperience } from './intro-experience.js';
import { HeartCatchGame } from './heart-game.js';
import { Finale } from './finale.js';

document.addEventListener('DOMContentLoaded', () => {
  if (window.__jdBooted) return;        // guard against the script running twice (e.g. dev hot reload)
  window.__jdBooted = true;
  const music = new BackgroundMusic();   // starts as soon as the link opens (or on the first touch)
  new IntroExperience(music);
  const coupleSlide = document.querySelector('#wedding-slides .wd-slide-couple');
  new HeartCatchGame({ scrollContainer: coupleSlide });
  new Finale({ scrollContainer: coupleSlide });
  console.log('Jithin & Dona invitation loaded');
});
