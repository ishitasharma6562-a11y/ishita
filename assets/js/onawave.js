// ============================================================
// ONAWAVE CASE STUDY — behavior
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

// ---------- footer year ----------
const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---------- Header height ----------
// The hero sizes itself to the screen minus the sticky header, and the header
// is not a fixed height across breakpoints, so publish the real number as a
// custom property. CSS carries a desktop fallback, so this only ever refines
// a value that already works.
(function headerHeight() {
  const header = document.querySelector('header');
  if (!header) return;

  let ticking = false;
  function measure() {
    ticking = false;
    document.documentElement.style.setProperty('--ow-header-h', header.offsetHeight + 'px');
  }
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(measure);
  }

  measure();
  window.addEventListener('resize', schedule, { passive: true });
  // The logo is an image, so the header can settle a little after first paint.
  window.addEventListener('load', measure);
})();

// ---------- Reveal on scroll ----------
// The hidden state already came from CSS ([data-rv] under .ow-anim, set in the
// head before first paint). All this does is stagger siblings and add .is-in.
// If .ow-anim was never set — no JS gate, or reduced motion — bail out: the
// elements are already visible and observing them would do nothing useful.
(function reveal() {
  if (reduceMotion || !document.documentElement.classList.contains('ow-anim')) return;

  const targets = Array.from(document.querySelectorAll('[data-rv]'));
  if (!targets.length) return;

  // Stagger by position among the siblings that also reveal, so a row of four
  // cards cascades but a lone heading doesn't inherit someone else's delay.
  const seen = new Map();
  targets.forEach(el => {
    const parent = el.parentElement;
    const i = seen.get(parent) || 0;
    seen.set(parent, i + 1);
    el.style.setProperty('--rv-i', i);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, {
    // Fire a little before the element reaches the bottom edge, so the motion
    // reads as the page settling rather than as things popping in late.
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.08
  });

  targets.forEach(el => observer.observe(el));

  // Anything already in view on load shouldn't wait for a scroll event.
  requestAnimationFrame(() => {
    targets.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
    });
  });
})();

// ---------- Reading progress ----------
(function progress() {
  const bar = document.querySelector('.ow-progress');
  if (!bar || reduceMotion) return;

  let ticking = false;

  function update() {
    ticking = false;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const p = scrollable > 0 ? window.scrollY / scrollable : 0;
    bar.style.setProperty('--ow-p', Math.min(1, Math.max(0, p)).toFixed(4));
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();

// ---------- 04 persona meters ----------
// Each bar's final width is already in the markup, so with JS off they are
// simply correct. .ow-anim (set pre-paint) holds them at zero; this grows
// them once the card is actually on screen, so the count-up is seen.
(function meters() {
  const bars = Array.from(document.querySelectorAll('.ow-meter-track i'));
  if (!bars.length) return;
  if (reduceMotion || !document.documentElement.classList.contains('ow-anim')) {
    bars.forEach(b => b.classList.add('is-fill'));
    return;
  }

  const card = document.querySelector('.ow-p-meters');
  const fill = () => bars.forEach((b, i) => {
    // Stagger so they read as three separate measurements, not one wipe.
    setTimeout(() => b.classList.add('is-fill'), i * 130);
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      fill();
      obs.disconnect();
    });
  }, { threshold: 0.4 });
  observer.observe(card || bars[0]);
})();

// ---------- 05 current journey ----------
// One stage at a time: the dots and the arrows both drive the same index.
// Everything here is additive — the markup without JS is five stages in order.
(function journey() {
  const root = document.getElementById('owJourney');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('.ow-track button'));
  const stages = Array.from(root.querySelectorAll('.ow-stage'));
  const arrows = Array.from(root.querySelectorAll('.ow-arrow'));
  if (tabs.length !== stages.length || !stages.length) return;

  // A stage image that isn't on disk yet falls back to a labelled placeholder
  // rather than a broken-image icon. Drop stage-N.jpg in and it just appears.
  stages.forEach(stage => {
    const media = stage.querySelector('.ow-stage-media');
    const img = media && media.querySelector('img');
    if (!media || !img) return;
    const miss = () => media.classList.add('is-missing');
    if (img.complete && !img.naturalWidth) miss();
    img.addEventListener('error', miss);
  });

  let i = 0;

  function go(next, focusTab) {
    i = (next + stages.length) % stages.length;
    stages.forEach((s2, n) => {
      s2.classList.toggle('is-on', n === i);
      if (n === i) s2.removeAttribute('aria-hidden');
      else s2.setAttribute('aria-hidden', 'true');
    });
    tabs.forEach((t, n) => {
      const on = n === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    if (focusTab) tabs[i].focus();
  }

  tabs.forEach((t, n) => t.addEventListener('click', () => go(n)));
  arrows.forEach(a => a.addEventListener('click', () => go(i + Number(a.dataset.dir))));

  // Arrow keys move along the tablist, which is what a tablist should do.
  root.querySelector('.ow-track').addEventListener('keydown', (e) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    go(i + dir, true);
  });

  // Only now does the stepped layout apply, so a JS failure above leaves the
  // five stages visible rather than collapsing them all into one cell.
  root.classList.add('is-stepped');
  go(0);
})();

// ---------- 06 the eight decisions ----------
// Opening a decision fades a still of the dashboard over the live prototype,
// glides it so the relevant region sits in the middle of the screen, and
// rings that region. Closing it hands the prototype back. Everything here is
// additive: with no JS the cards are eight headings over eight paragraphs and
// the prototype is simply always live.
(function decisions() {
  const root = document.getElementById('owReason');
  const annot = document.getElementById('owAnnot');
  const scroller = document.getElementById('owAnnotScroll');
  const hl = document.getElementById('owHl');
  const mode = document.getElementById('owMode');
  const back = document.getElementById('owBack');
  if (!root || !annot || !scroller || !hl) return;

  const cards = Array.from(root.querySelectorAll('.ow-rcard'));
  if (!cards.length) return;

  const LIVE = mode ? mode.textContent : '';
  const screen = annot.parentElement;
  let open = null;

  function place(card) {
    const box = (card.dataset.box || '').split(',').map(Number);
    if (box.length !== 4 || box.some(isNaN)) return false;

    // The card already carries its category colour, so read it off rather
    // than keeping a second copy of the palette in here.
    const cs = getComputedStyle(card);
    hl.style.setProperty('--hl-rgb', cs.getPropertyValue('--hl-rgb').trim());
    hl.style.left = box[0] + '%';
    hl.style.top = box[1] + '%';
    hl.style.width = box[2] + '%';
    hl.style.height = box[3] + '%';

    // Glide the still so the ringed region lands in the middle of the glass,
    // without ever pulling past either end of the image.
    const imgH = scroller.offsetHeight;
    const screenH = screen.clientHeight;
    const centre = (box[1] + box[3] / 2) / 100 * imgH;
    const y = Math.max(Math.min(0, screenH / 2 - centre), Math.min(0, screenH - imgH));
    scroller.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
    return true;
  }

  function show(card) {
    cards.forEach(c => {
      const on = c === card;
      c.classList.toggle('is-open', on);
      c.querySelector('.ow-rcard-head').setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    open = card;
    if (!place(card)) return hide();
    annot.classList.add('is-on');
    annot.setAttribute('aria-hidden', 'false');
    hl.classList.add('is-on');
    if (mode) mode.textContent = 'Showing ' + card.querySelector('.ow-rtitle').textContent.toLowerCase();
    if (back) back.hidden = false;
  }

  function hide() {
    cards.forEach(c => {
      c.classList.remove('is-open');
      c.querySelector('.ow-rcard-head').setAttribute('aria-expanded', 'false');
    });
    open = null;
    annot.classList.remove('is-on');
    annot.setAttribute('aria-hidden', 'true');
    hl.classList.remove('is-on');
    if (mode) mode.textContent = LIVE;
    if (back) back.hidden = true;
  }

  cards.forEach(card => {
    card.querySelector('.ow-rcard-head').addEventListener('click', () => {
      if (open === card) hide(); else show(card);
    });
  });

  if (back) back.addEventListener('click', hide);

  // The image decides where the glide stops, so a resize — or the image
  // finishing its lazy load — has to re-run the sum.
  const img = scroller.querySelector('img');
  if (img) img.addEventListener('load', () => { if (open) place(open); });
  window.addEventListener('resize', () => { if (open) place(open); }, { passive: true });
})();
