// ============================================================
// ABOUT — the desk, and what is inside each folder.
// Everything here is additive. With no JS the desk never locks, every
// section renders down the page, and the only things missing are the
// note board and the record player.
// ============================================================

const abReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- footer year ----------
(function year() {
  const el = document.querySelector('[data-year]');
  if (el) el.textContent = new Date().getFullYear();
})();

// ---------- nav toggle ----------
(function nav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
})();

// ---------- header height ----------
// The desk sizes itself to the screen minus the sticky header, and the
// back bars stick just below it. Both need the real number.
(function headerHeight() {
  const header = document.querySelector('header');
  if (!header) return;
  let ticking = false;
  const measure = () => {
    ticking = false;
    document.documentElement.style.setProperty('--ab-header-h', header.offsetHeight + 'px');
  };
  const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(measure); } };
  measure();
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', measure);
})();

// ---------- the desk ----------
// One view at a time: either the folders, or one folder's contents.
// The open folder is kept in the URL hash so a section can be linked to
// directly and the browser's own back button behaves as expected.
(function desk() {
  const deskEl = document.getElementById('abDesk');
  const sections = Array.from(document.querySelectorAll('.ab-sec'));
  if (!deskEl || !sections.length) return;

  const byId = new Map(sections.map(s => [s.id, s]));
  let current = null;

  function showDesk(push) {
    sections.forEach(s => { s.hidden = true; });
    deskEl.hidden = false;
    document.body.classList.add('ab-locked');
    current = null;
    if (push) history.pushState({ ab: null }, '', location.pathname);
    window.scrollTo(0, 0);
    document.title = 'About — Ishita Sharma';
  }

  function showSection(id, push) {
    const sec = byId.get(id);
    if (!sec) return showDesk(push);
    deskEl.hidden = true;
    sections.forEach(s => { s.hidden = s !== sec; });
    // The desk is the only locked view; a section scrolls normally.
    document.body.classList.remove('ab-locked');
    current = id;
    if (push) history.pushState({ ab: id }, '', '#' + id);
    window.scrollTo(0, 0);
    const h = sec.querySelector('h2');
    document.title = (h ? h.textContent.trim() + ' — ' : '') + 'About — Ishita Sharma';
    // Move focus so a keyboard user lands inside what they just opened.
    const back = sec.querySelector('[data-back]');
    if (back) back.focus({ preventScroll: true });
  }

  document.querySelectorAll('.ab-folder').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.opens, true));
  });
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => showDesk(true));
  });

  // Escape closes an open folder, which is what every other overlay does.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current) showDesk(true);
  });

  window.addEventListener('popstate', (e) => {
    const id = (e.state && e.state.ab) || location.hash.replace('#', '');
    if (id && byId.has(id)) showSection(id, false);
    else showDesk(false);
  });

  const initial = location.hash.replace('#', '');
  if (initial && byId.has(initial)) showSection(initial, false);
  else showDesk(false);
})();

// ---------- 01 the note board ----------
// Per-visitor by design: notes live in this browser and never leave it.
// Every read and write is guarded, because storage throws in private mode
// and comes back empty when site data is cleared.
(function notes() {
  const board = document.getElementById('abNoteBoard');
  const addBtn = document.getElementById('abNoteAdd');
  const empty = document.getElementById('abNoteEmpty');
  if (!board || !addBtn) return;

  const KEY = 'ishita.about.notes.v1';
  const COLOURS = ['#FFE8A3', '#CFE9D6', '#FAD4CF', '#D8E3F7', '#F2E2C4'];
  let notes = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      notes = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(notes)) notes = [];
    } catch (e) { notes = []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch (e) { /* full or blocked */ }
  }

  function render() {
    board.innerHTML = '';
    notes.forEach((n, i) => {
      const li = document.createElement('li');
      li.className = 'ab-note';
      li.style.setProperty('--note', n.colour || COLOURS[i % COLOURS.length]);
      li.style.setProperty('--note-tilt', (n.tilt || 0) + 'deg');

      const text = document.createElement('textarea');
      text.className = 'ab-note-text';
      text.rows = 4;
      text.placeholder = 'say something nice (or don’t)';
      text.value = n.text || '';
      text.setAttribute('aria-label', 'Note');
      text.addEventListener('input', () => { notes[i].text = text.value; save(); });

      const who = document.createElement('input');
      who.className = 'ab-note-who';
      who.type = 'text';
      who.placeholder = '— your name';
      who.value = n.who || '';
      who.setAttribute('aria-label', 'Your name');
      who.addEventListener('input', () => { notes[i].who = who.value; save(); });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ab-note-del';
      del.innerHTML = '&times;';
      del.setAttribute('aria-label', 'Remove this note');
      del.addEventListener('click', () => { notes.splice(i, 1); save(); render(); });

      li.append(text, who, del);
      board.appendChild(li);
    });
    if (empty) empty.hidden = notes.length > 0;
  }

  addBtn.addEventListener('click', () => {
    notes.push({
      text: '',
      who: '',
      colour: COLOURS[notes.length % COLOURS.length],
      // A little hand-pinned wobble, but never enough to look broken.
      tilt: (Math.random() * 5 - 2.5).toFixed(2)
    });
    save();
    render();
    const last = board.querySelector('.ab-note:last-child .ab-note-text');
    if (last) last.focus();
  });

  load();
  render();
})();

// ---------- 03 the record player ----------
// One audio element for all five tracks. The disc's rotation is a CSS
// animation whose play state follows the audio, so the record is turning
// exactly when there is sound and stops the moment there isn't.
(function music() {
  const list = document.getElementById('abTracks');
  const vinyl = document.getElementById('abVinyl');
  const titleEl = document.getElementById('abVinylTitle');
  const deck = document.querySelector('.ab-deck');
  const missing = document.getElementById('abMusicMissing');
  if (!list || !vinyl) return;

  const tracks = Array.from(list.querySelectorAll('.ab-track'));
  if (!tracks.length) return;

  const LABELS = ['#F3E7D0', '#E8D3C0', '#DCE7E0', '#EFE0E6', '#E4E0CE'];
  const audio = new Audio();
  audio.preload = 'none';
  let currentIndex = -1;

  function paint() {
    tracks.forEach((t, i) => {
      const on = i === currentIndex;
      t.classList.toggle('is-active', on);
      t.classList.toggle('is-playing', on && !audio.paused);
    });
    const playing = currentIndex >= 0 && !audio.paused;
    vinyl.classList.toggle('is-spinning', playing);
    if (deck) deck.classList.toggle('is-playing', playing);
  }

  function select(i) {
    currentIndex = i;
    const t = tracks[i];
    audio.src = t.dataset.src;
    const title = t.querySelector('.ab-track-title');
    const artist = t.querySelector('.ab-track-artist');
    if (titleEl) titleEl.textContent = title ? title.textContent : '';
    const label = vinyl.querySelector('.ab-vinyl-label');
    if (label) label.style.setProperty('--label', LABELS[i % LABELS.length]);
    if (titleEl) {
      titleEl.title = (title ? title.textContent : '') + (artist ? ' — ' + artist.textContent : '');
    }
  }

  tracks.forEach((t, i) => {
    t.querySelector('.ab-track-btn').addEventListener('click', () => {
      if (i === currentIndex) {
        if (audio.paused) audio.play().catch(() => {}); else audio.pause();
      } else {
        select(i);
        audio.play().catch(() => {});
      }
      paint();
    });
  });

  audio.addEventListener('play', paint);
  audio.addEventListener('pause', paint);
  audio.addEventListener('ended', () => {
    // Roll on to the next record rather than stopping dead.
    const next = (currentIndex + 1) % tracks.length;
    select(next);
    audio.play().catch(paint);
    paint();
  });

  // The clips may not be on the server yet. Say so once, plainly, and keep
  // the disc turning so the section still demonstrates itself.
  audio.addEventListener('error', () => {
    if (missing) missing.hidden = false;
    vinyl.classList.add('is-spinning');
    if (deck) deck.classList.add('is-playing');
    tracks.forEach((t, i) => {
      t.classList.toggle('is-playing', i === currentIndex);
      t.classList.toggle('is-active', i === currentIndex);
    });
  });

  select(0);
})();

// ---------- 04 the sticker board ----------
// Hand-placed angles to begin with, draggable after that, and wherever a
// visitor leaves them is remembered in their own browser.
(function stickers() {
  const board = document.getElementById('abStickerBoard');
  const resetBtn = document.getElementById('abStickerReset');
  if (!board) return;

  const KEY = 'ishita.about.stickers.v1';
  const items = Array.from(board.querySelectorAll('.ab-sticker'));
  if (!items.length) return;

  // Keep the mock's placement so "put them back" has something to go back to.
  const home = new Map(items.map(el => [el.dataset.id, {
    x: el.style.getPropertyValue('--x').trim(),
    y: el.style.getPropertyValue('--y').trim(),
    tilt: el.style.getPropertyValue('--tilt').trim()
  }]));

  function savedPositions() {
    try {
      const raw = localStorage.getItem(KEY);
      const v = raw ? JSON.parse(raw) : {};
      return (v && typeof v === 'object') ? v : {};
    } catch (e) { return {}; }
  }
  function store(pos) {
    try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch (e) { /* ignore */ }
  }

  function apply(pos) {
    items.forEach(el => {
      const p = pos[el.dataset.id];
      if (!p) return;
      el.style.setProperty('--x', p.x);
      el.style.setProperty('--y', p.y);
    });
  }
  apply(savedPositions());

  // Dragging is a pointer-capture affair so it survives the cursor leaving
  // the sticker, and it is skipped entirely on the stacked phone layout.
  let drag = null;

  items.forEach(el => {
    el.addEventListener('pointerdown', (e) => {
      if (window.matchMedia('(max-width: 520px)').matches) return;
      if (e.button !== undefined && e.button !== 0) return;
      const rect = el.getBoundingClientRect();
      const board_ = board.getBoundingClientRect();
      drag = {
        el,
        dx: e.clientX - rect.left,
        dy: e.clientY - rect.top,
        bw: board_.width,
        bh: board_.height,
        bx: board_.left,
        by: board_.top,
        w: rect.width,
        h: rect.height
      };
      el.classList.add('is-dragging');
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (!drag || drag.el !== el) return;
      // Clamp so a sticker can never be dropped off the edge of the board.
      const x = Math.min(Math.max(e.clientX - drag.bx - drag.dx, 0), Math.max(0, drag.bw - drag.w));
      const y = Math.min(Math.max(e.clientY - drag.by - drag.dy, 0), Math.max(0, drag.bh - drag.h));
      el.style.setProperty('--x', (x / drag.bw * 100).toFixed(2) + '%');
      el.style.setProperty('--y', (y / drag.bh * 100).toFixed(2) + '%');
    });

    const end = (e) => {
      if (!drag || drag.el !== el) return;
      el.classList.remove('is-dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      const pos = savedPositions();
      pos[el.dataset.id] = {
        x: el.style.getPropertyValue('--x').trim(),
        y: el.style.getPropertyValue('--y').trim()
      };
      store(pos);
      drag = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      items.forEach(el => {
        const h = home.get(el.dataset.id);
        if (!h) return;
        el.style.setProperty('--x', h.x);
        el.style.setProperty('--y', h.y);
      });
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    });
  }
})();
