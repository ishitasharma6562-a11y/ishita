// ============================================================
// FURLENCO CASE STUDY — behavior
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
}

// ---------- Stats count up from 0 when scrolled into view ----------
(function countUp() {
  const nums = Array.from(document.querySelectorAll('[data-count-to]'));
  if (!nums.length) return;

  function render(el, value) {
    el.textContent = value + (el.dataset.suffix || '');
  }

  if (reduceMotion) {
    nums.forEach(el => render(el, Number(el.dataset.countTo)));
    return;
  }

  // Start at zero so the first painted frame matches where the animation begins.
  nums.forEach(el => render(el, 0));

  function animate(el) {
    const target = Number(el.dataset.countTo);
    const duration = 1400;
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — fast off the mark, settles gently on the final number
      const eased = 1 - Math.pow(1 - t, 3);
      render(el, Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  nums.forEach(el => observer.observe(el));
})();

// ---------- Problem collage: three continuously scrolling columns ----------
(function collage() {
  const cols = Array.from(document.querySelectorAll('.fx-collage-track'));
  if (!cols.length) return;

  // Column order matches the staggered 3x3 grid in the Figma layout.
  const sets = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ];

  cols.forEach((track, i) => {
    const build = () => sets[i].map(n => {
      const img = document.createElement('img');
      img.src = `../assets/images/furlenco/collage-${n}.jpg`;
      img.alt = '';
      img.loading = 'lazy';
      return img;
    });
    // Twice, so the -50% translate loops seamlessly.
    build().forEach(img => track.appendChild(img));
    build().forEach(img => track.appendChild(img));
  });
})();

// ---------- Before / after: play only while on screen ----------
(function beforeAfterVideos() {
  const vids = Array.from(document.querySelectorAll('.fx-ba-item video'));
  if (!vids.length) return;

  if (reduceMotion) {
    // Poster frame stands in; never start playback.
    vids.forEach(v => v.removeAttribute('src'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const v = entry.target;
      if (entry.isIntersecting) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.3 });

  vids.forEach(v => observer.observe(v));
})();

// ---------- footer year ----------
const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = new Date().getFullYear();
