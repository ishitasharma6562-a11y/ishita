// ============================================================
// PEN-TOOL CURSOR
// Replaces the native pointer with a pen nib, drawn so the nib's tip sits
// exactly on the pointer position — the hotspot, the way a real tool cursor
// works. The glyph is the standard pen-tool nib: solid body, slit up the
// middle, round hole, angled barrel.
//
// Only ever runs on a real mouse. Touch, stylus and reduced-motion get the
// ordinary native cursor and none of this code.
// ============================================================

(function penCursor() {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || noMotion.matches) return;

  // viewBox 0 0 24 24, tip at (3,21). Three subpaths with evenodd so the slit
  // and the hole are cut out rather than painted — the page shows through,
  // which is what makes it read as a nib and not a blob.
  const NIB =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill-rule="evenodd" d="' +
        // nib body: apex at the tip, base square to the 45° axis
        'M3 21 L10.6 8.6 L15.4 13.4 Z ' +
        // slit, along the axis
        'M4.6 19.4 L10.2 13.8 L10.9 14.5 L5.3 20.1 Z ' +
        // hole
        'M12.1 10.9 a1.75 1.75 0 1 0 0.01 0 Z ' +
        // barrel, set off from the base by a gap
        'M11.5 7.7 L14 5.2 L18.8 10 L16.3 12.5 Z' +
      '"/>' +
    '</svg>';

  const el = document.createElement('div');
  el.className = 'pen-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = NIB;
  document.body.appendChild(el);
  document.documentElement.classList.add('pen-on');

  // Start off-screen so it doesn't flash in the corner before the first move.
  let x = -200, y = -200;
  let started = false;
  let queued = false;

  function draw() {
    queued = false;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }

  function onMove(e) {
    x = e.clientX;
    y = e.clientY;
    if (!started) {
      started = true;
      document.documentElement.classList.add('pen-live');
    }
    if (!queued) {
      queued = true;
      requestAnimationFrame(draw);
    }
  }

  window.addEventListener('mousemove', onMove, { passive: true });

  // Leaving the window hides it; the native cursor is gone, so leaving it
  // stranded mid-page would look like a bug.
  document.addEventListener('mouseleave', () => document.documentElement.classList.remove('pen-live'));
  document.addEventListener('mouseenter', () => { if (started) document.documentElement.classList.add('pen-live'); });

  // An iframe swallows mousemove, so ours would freeze at its edge.
  // Hand the native cursor back instead.
  document.querySelectorAll('iframe').forEach(frameEl => {
    frameEl.addEventListener('mouseenter', () => document.documentElement.classList.remove('pen-live'));
    frameEl.addEventListener('mouseleave', () => { if (started) document.documentElement.classList.add('pen-live'); });
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
    document.documentElement.classList.remove('pen-on', 'pen-live', 'pen-hot', 'pen-down');
    el.remove();
  });
})();
