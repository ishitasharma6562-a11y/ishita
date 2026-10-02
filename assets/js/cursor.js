// ============================================================
// PRESENCE CURSORS
// Two pointers: the visitor's ("You"), drawn exactly on their pointer so it
// feels native, and mine ("Ishita"), trailing a fixed offset behind with
// easing — as if we were both in the file at the same time.
//
// Only ever runs on a real mouse. Touch, stylus and reduced-motion get the
// ordinary native cursor and none of this code.
// ============================================================

(function presenceCursors() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || noMotion.matches) return;

  // Trailing offset: far enough back that mine reads as a second person in the
  // room rather than something hovering on the viewer's own pointer.
  const TRAIL_X = -196;
  const TRAIL_Y = 104;
  // Deliberately loose. A tight follow reads as something stuck to the
  // viewer's pointer; this ambles over to where they are instead.
  const EASE = 0.045;

  const ARROW = '<svg class="pc-arrow" viewBox="0 0 11 16" aria-hidden="true">' +
    '<path d="M0 0 L0 14.2 L3.6 10.8 L5.9 15.6 L8.2 14.6 L6.0 9.9 L10.4 9.7 Z"/></svg>';

  function build(variant, label) {
    const el = document.createElement('div');
    el.className = 'pc-cursor pc-cursor--' + variant;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = ARROW + '<span class="pc-tag">' + label + '</span>';
    return el;
  }

  const you = build('you', 'You');
  const me = build('me', 'Ishita');
  document.body.append(you, me);
  document.documentElement.classList.add('pc-on');

  // Start off-screen so neither flashes in the corner before the first move.
  let px = -200, py = -200;           // pointer
  let mx = -200, my = -200;           // mine, eased
  let started = false;
  let raf = null;

  function frame() {
    mx += (px + TRAIL_X - mx) * EASE;
    my += (py + TRAIL_Y - my) * EASE;
    you.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';
    me.style.transform = 'translate3d(' + Math.round(mx * 10) / 10 + 'px,' + Math.round(my * 10) / 10 + 'px,0)';
    raf = requestAnimationFrame(frame);
  }

  function onMove(e) {
    px = e.clientX;
    py = e.clientY;
    if (!started) {
      started = true;
      // Drop mine in at the offset rather than letting it fly across the page.
      mx = px + TRAIL_X;
      my = py + TRAIL_Y;
      document.documentElement.classList.add('pc-live');
      frame();
    }
  }

  window.addEventListener('mousemove', onMove, { passive: true });

  // Leaving the window hides the pair; the native cursor is gone, so leaving
  // them stranded mid-page would look like a bug.
  document.addEventListener('mouseleave', () => document.documentElement.classList.remove('pc-live'));
  document.addEventListener('mouseenter', () => { if (started) document.documentElement.classList.add('pc-live'); });

  // Pointer over an embedded prototype: the iframe swallows mousemove, so our
  // cursors would freeze at its edge. Hand the native cursor back instead.
  document.querySelectorAll('iframe').forEach(frameEl => {
    frameEl.addEventListener('mouseenter', () => document.documentElement.classList.remove('pc-live'));
    frameEl.addEventListener('mouseleave', () => { if (started) document.documentElement.classList.add('pc-live'); });
  });

  // Small press feedback, and a nudge on anything clickable.
  window.addEventListener('mousedown', () => document.documentElement.classList.add('pc-down'));
  window.addEventListener('mouseup', () => document.documentElement.classList.remove('pc-down'));

  const HOT = 'a, button, [role="button"], summary, .skill-item, .thumb-frame';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest && e.target.closest(HOT)) document.documentElement.classList.add('pc-hot');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest && e.target.closest(HOT)) document.documentElement.classList.remove('pc-hot');
  });

  // If the mouse is unplugged or the viewer switches to touch, bow out cleanly.
  finePointer.addEventListener('change', (e) => {
    if (e.matches) return;
    if (raf) cancelAnimationFrame(raf);
    document.documentElement.classList.remove('pc-on', 'pc-live');
    you.remove();
    me.remove();
  });
})();
