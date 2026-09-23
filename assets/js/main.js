// ============================================================
// ISHITA SHARMA — PORTFOLIO — behavior
// Kept in one file, grouped by section, so each piece can be
// found and edited independently.
// ============================================================

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Nav toggle (mobile menu) ----------
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));
}

// ---------- Hero vinyl: only the disc spins (base photo stays put) ----------
// click to spin, click again to stop where it is.
(function heroDisc() {
  const inner = document.getElementById('heroImageInner');
  const disc = document.getElementById('heroDiscSpin');
  const base = inner ? inner.querySelector('img:not(.hero-disc-spin)') : null;
  if (!inner || !base || !disc) return;

  // Measured from the source photo (hero-turntable.png, 1611x1344 natural):
  // the disc's true circle (via Hough transform) is centered at (746,640)
  // with radius 592. disc-hero.png is a square crop of that circle at
  // 1190x1190, so its top-left lands at (746-595, 640-595) in base-image
  // natural pixels — recomputed in real px on load/resize so it tracks the
  // rendered size exactly, with no CSS percentage rounding.
  const BASE_NATURAL_W = 1611;
  const DISC_NATURAL = 1190;
  const DISC_OFFSET_X = 151;
  const DISC_OFFSET_Y = 45;

  function layout() {
    if (!base.clientWidth) return;
    const scale = base.clientWidth / BASE_NATURAL_W;
    disc.style.left = (DISC_OFFSET_X * scale) + 'px';
    disc.style.top = (DISC_OFFSET_Y * scale) + 'px';
    disc.style.width = (DISC_NATURAL * scale) + 'px';
    disc.style.height = (DISC_NATURAL * scale) + 'px';
  }

  if (base.complete) layout(); else base.addEventListener('load', layout);
  window.addEventListener('resize', layout);

  // Single source of truth for play/pause, shared between clicking the vinyl
  // itself and the sticky button (see stickyAudioToggle below) — whichever
  // one is used, both stay in sync since they both call this.
  const audio = document.getElementById('heroVinylAudio');
  const stickyBtn = document.getElementById('stickyAudioToggle');

  function setPlaying(playing) {
    disc.classList.toggle('is-spinning', playing);
    if (stickyBtn) {
      stickyBtn.classList.toggle('is-playing', playing);
      stickyBtn.setAttribute('aria-pressed', String(playing));
      stickyBtn.setAttribute('aria-label', playing ? 'Pause song' : 'Play song');
    }
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  inner.addEventListener('click', () => {
    setPlaying(!disc.classList.contains('is-spinning'));
  });
  if (stickyBtn) {
    stickyBtn.addEventListener('click', () => {
      setPlaying(!disc.classList.contains('is-spinning'));
    });
  }
})();

// ---------- Selected Projects: pinned horizontal-scroll carousel ----------
(function projectsCarousel() {
  const section = document.querySelector('.projects-pin-section');
  const track = document.getElementById('projectsTrack');
  if (!section || !track) return;

  const slides = Array.from(track.querySelectorAll('.project-slide'));
  const dots = Array.from(document.querySelectorAll('.projects-progress span'));
  const count = slides.length;

  function isMobileLayout() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function setActive(idx) {
    slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }

  function layout() {
    if (isMobileLayout()) {
      section.style.height = 'auto';
      return;
    }
    // Extra scroll distance so the pin has room to translate through
    // all slides before releasing back to normal vertical scroll.
    section.style.height = `${count * 100}vh`;
  }

  let lastP = null;
  function onScroll() {
    if (isMobileLayout()) return;
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    // Section is nowhere near the viewport — skip the transform write
    // entirely rather than just clamping. Writing an unchanged transform
    // on every scroll frame (all the way down the page) still forces
    // Chromium to keep this layer "live", which under this page's other
    // concurrent infinite animations (playground marquees, video
    // crossfades) can manifest as stale-layer/ghosting artifacts far
    // from the actual pinned section.
    if (rect.bottom < -vh || rect.top > vh * 2) return;

    const scrollable = rect.height - vh;
    let p = scrollable > 0 ? (-rect.top) / scrollable : 0;
    p = Math.min(1, Math.max(0, p));
    if (p === lastP) return;
    lastP = p;

    track.style.transform = `translateX(-${p * (count - 1) * 100}%)`;

    const idx = Math.min(count - 1, Math.round(p * (count - 1)));
    setActive(idx);
  }

  // Mobile: highlight active dot/state via native scroll position instead.
  function onTrackScroll() {
    if (!isMobileLayout()) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    setActive(Math.min(count - 1, Math.max(0, idx)));
  }

  window.addEventListener('resize', layout);
  window.addEventListener('scroll', onScroll, { passive: true });
  track.addEventListener('scroll', onTrackScroll, { passive: true });

  layout();
  onScroll();
  setActive(0);
})();

// ---------- "What I do" — hover swaps the video on the right, active one plays muted+looped ----------
const skillItems = document.querySelectorAll('.skill-item');
const skillVideos = document.querySelectorAll('.skill-visual video');
skillItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    skillItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const idx = item.dataset.skill;
    skillVideos.forEach(video => {
      const isActive = video.dataset.idx === idx;
      video.classList.toggle('active', isActive);
      if (isActive) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  });
});
const initialVideo = document.querySelector('.skill-visual video.active');
if (initialVideo) initialVideo.play().catch(() => {});

// ---------- Playground — two strips, opposite directions, real photos ----------
(function playground() {
  const rowLeft = document.getElementById('pgRowLeft');
  const rowRight = document.getElementById('pgRowRight');
  if (!rowLeft || !rowRight) return;

  function buildRow(el, photos) {
    // Duplicate the tile set so the CSS translateX(-50%) loop is seamless.
    const makeSet = () => photos.map(({ src, width }) => {
      const tile = document.createElement('div');
      tile.className = 'pg-tile';
      tile.style.width = width + 'px';
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      tile.appendChild(img);
      return tile;
    });
    makeSet().forEach(t => el.appendChild(t));
    makeSet().forEach(t => el.appendChild(t));
  }

  buildRow(rowLeft, [
    { src: 'assets/images/playground-1.jpg?v=2', width: 280 },
    { src: 'assets/images/playground-2.jpg?v=2', width: 340 },
    { src: 'assets/images/playground-3.jpg?v=2', width: 240 },
    { src: 'assets/images/playground-4.jpg?v=2', width: 300 },
  ]);
  buildRow(rowRight, [
    { src: 'assets/images/playground-5.jpg?v=2', width: 240 },
    { src: 'assets/images/playground-6.jpg?v=2', width: 320 },
    { src: 'assets/images/playground-7.jpg?v=2', width: 280 },
    { src: 'assets/images/playground-8.jpg?v=2', width: 340 },
  ]);
})();

// ---------- Footer: rat runs in, pauses, eats a crumb, then leaves ----------
(function exitRat() {
  const exitRat = document.getElementById('exitRat');
  const crumb = document.getElementById('exitCrumb');
  const footer = document.querySelector('footer');
  if (!exitRat || !footer) return;

  if (reduceMotion) return;

  function playSequence() {
    exitRat.classList.add('running');
    exitRat.addEventListener('animationend', function onRunIn(e) {
      if (e.animationName !== 'runIn') return;
      exitRat.removeEventListener('animationend', onRunIn);

      setTimeout(() => {
        exitRat.classList.add('eating');
        if (crumb) crumb.classList.add('eaten');

        setTimeout(() => {
          exitRat.classList.remove('running', 'eating');
          exitRat.classList.add('leaving');
        }, 1000);
      }, 700);
    });
  }

  const footerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        playSequence();
        footerObserver.disconnect();
      }
    });
  }, { threshold: 0.6 });
  footerObserver.observe(footer);
})();

// ---------- footer year ----------
const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = new Date().getFullYear();
