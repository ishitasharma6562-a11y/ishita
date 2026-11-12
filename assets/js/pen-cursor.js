// ============================================================
// PEN-TOOL CURSOR
// The native pointer is replaced by a pen nib whose tip sits exactly on the
// pointer, and the path you move along is inked behind you: a smoothed
// hairline, hollow anchor squares dropped as you go, and bezier direction
// handles at the nib — then the whole thing fades out.
//
// The ink lives on its own canvas using mix-blend-mode: difference, so a
// single white stroke reads dark over the cream and light over the black
// sections without ever needing to know what it is crossing.
//
// Only ever runs on a real mouse. Touch, stylus and reduced-motion get the
// ordinary native cursor and none of this code.
// ============================================================

(function penCursor() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || noMotion.matches) return;

  // ---- tuning ----
  const LIFE = 900;        // ms a point stays before it is gone
  const FADE_FROM = 0.45;  // fraction of LIFE after which a point starts fading
  const ANCHOR_EVERY = 92; // px of travel between dropped anchor squares
  const ANCHOR_SIZE = 5;   // px, hollow square
  const HANDLE = 13;       // px, each arm of the direction handle
  const LINE_W = 1;        // px hairline

  // ---- the nib ----
  // viewBox 0 0 24 24, tip at (3,21). evenodd so the slit and the hole are
  // cut out rather than painted.
  const NIB =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill-rule="evenodd" d="' +
        'M3 21 L10.6 8.6 L15.4 13.4 Z ' +
        'M4.6 19.4 L10.2 13.8 L10.9 14.5 L5.3 20.1 Z ' +
        'M12.1 10.9 a1.75 1.75 0 1 0 0.01 0 Z ' +
        'M11.5 7.7 L14 5.2 L18.8 10 L16.3 12.5 Z' +
      '"/>' +
    '</svg>';

  const el = document.createElement('div');
  el.className = 'pen-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = NIB;

  const canvas = document.createElement('canvas');
  canvas.className = 'pen-ink';
  canvas.setAttribute('aria-hidden', 'true');

  document.body.append(canvas, el);
  document.documentElement.classList.add('pen-on');

  const ctx = canvas.getContext('2d');
  let dpr = 1;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  window.addEventListener('resize', size);

  // ---- state ----
  let x = -200, y = -200;
  let started = false;
  let raf = null;
  const pts = [];      // {x, y, t}
  const anchors = [];  // {x, y, t}
  let sinceAnchor = 0;

  function onMove(e) {
    const nx = e.clientX, ny = e.clientY;
    if (!started) {
      started = true;
      document.documentElement.classList.add('pen-live');
      if (raf === null) raf = requestAnimationFrame(frame);
    } else {
      sinceAnchor += Math.hypot(nx - x, ny - y);
      if (sinceAnchor >= ANCHOR_EVERY) {
        sinceAnchor = 0;
        anchors.push({ x: nx, y: ny, t: performance.now() });
      }
    }
    x = nx; y = ny;
    pts.push({ x, y, t: performance.now() });
  }

  function alphaFor(age) {
    const k = age / LIFE;
    if (k >= 1) return 0;
    if (k <= FADE_FROM) return 1;
    return 1 - (k - FADE_FROM) / (1 - FADE_FROM);
  }

  function frame() {
    const now = performance.now();

    while (pts.length && now - pts[0].t > LIFE) pts.shift();
    while (anchors.length && now - anchors[0].t > LIFE) anchors.shift();

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = LINE_W;
    ctx.strokeStyle = '#fff';

    // The trail, drawn as quadratic curves through the midpoints of
    // consecutive samples — that is what turns a jittery pointer log into
    // something that reads as a drawn path.
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const al = alphaFor(now - a.t);
      if (al <= 0) continue;
      ctx.globalAlpha = al;
      ctx.beginPath();
      ctx.moveTo((pts[i - 1].x + a.x) / 2, (pts[i - 1].y + a.y) / 2);
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.stroke();
    }

    // Anchor points: hollow squares, the way a pen tool leaves them.
    const h = ANCHOR_SIZE / 2;
    for (const p of anchors) {
      const al = alphaFor(now - p.t);
      if (al <= 0) continue;
      ctx.globalAlpha = al;
      ctx.strokeRect(Math.round(p.x) - h, Math.round(p.y) - h, ANCHOR_SIZE, ANCHOR_SIZE);
    }

    // Direction handles at the head: a tangent bar with a dot on each end,
    // angled along the way the pointer is actually travelling.
    if (pts.length > 3) {
      const head = pts[pts.length - 1];
      const prev = pts[Math.max(0, pts.length - 5)];
      const dx = head.x - prev.x, dy = head.y - prev.y;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        const ux = dx / len, uy = dy / len;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(head.x - ux * HANDLE, head.y - uy * HANDLE);
        ctx.lineTo(head.x + ux * HANDLE, head.y + uy * HANDLE);
        ctx.stroke();
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(head.x + ux * HANDLE * s, head.y + uy * HANDLE * s, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('mousemove', onMove, { passive: true });

  function sleep() {
    document.documentElement.classList.remove('pen-live');
    pts.length = 0;
    anchors.length = 0;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
  function wake() { if (started) document.documentElement.classList.add('pen-live'); }

  // Leaving the window hides it; the native cursor is gone, so leaving the
  // nib stranded mid-page would look like a bug.
  document.addEventListener('mouseleave', sleep);
  document.addEventListener('mouseenter', wake);

  // An iframe swallows mousemove, so ours would freeze at its edge.
  // Hand the native cursor back instead.
  document.querySelectorAll('iframe').forEach(frameEl => {
    frameEl.addEventListener('mouseenter', sleep);
    frameEl.addEventListener('mouseleave', wake);
  });

  window.addEventListener('mousedown', () => document.documentElement.classList.add('pen-down'));
  window.addEventListener('mouseup', () => document.documentElement.classList.remove('pen-down'));

  const HOT = 'a, button, [role="button"], summary, .skill-item, .thumb-frame';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest && e.target.closest(HOT)) document.documentElement.classList.add('pen-hot');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest && e.target.closest(HOT)) document.documentElement.classList.remove('pen-hot');
  });

  // If the mouse is unplugged or the viewer switches to touch, bow out cleanly.
  finePointer.addEventListener('change', (e) => {
    if (e.matches) return;
    if (raf !== null) cancelAnimationFrame(raf);
    document.documentElement.classList.remove('pen-on', 'pen-live', 'pen-hot', 'pen-down');
    el.remove();
    canvas.remove();
  });
})();
