document.documentElement.classList.add('js');

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

var year = document.querySelector('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());

/* Typewriter hero. Lines exist statically in the markup (works JS-off);
   this empties them and retypes, matching stevenbleau.design's landing.
   Inline highlights (<em class="hl">) survive: each step rebuilds the line
   from its original nodes, cut off at the current character count.
   Runs regardless of prefers-reduced-motion: it's a short text reveal, not
   parallax or large-area motion, so it stays on for phones in Reduce Motion. */
(function () {
  var container = document.getElementById('typed-container');
  if (!container) return;

  var lines = Array.prototype.slice.call(container.querySelectorAll('.typed-line'));
  if (!lines.length) return;

  var texts = lines.map(function (el) { return el.textContent; });
  var sources = lines.map(function (el) {
    return Array.prototype.slice.call(el.childNodes).map(function (n) { return n.cloneNode(true); });
  });

  function render(i, count) {
    var el = lines[i];
    el.textContent = '';
    var left = count;
    sources[i].forEach(function (n) {
      if (left <= 0) return;
      var t = n.textContent;
      var part = t.length <= left ? n.cloneNode(true) : null;
      if (!part) {
        part = n.nodeType === 3 ? document.createTextNode(t.slice(0, left)) : n.cloneNode(false);
        if (n.nodeType !== 3) part.textContent = t.slice(0, left);
      }
      el.appendChild(part);
      left -= t.length;
    });
  }

  lines.forEach(function (el) {
    el.textContent = '';
    el.classList.remove('cursor');
    el.hidden = true;
  });

  var lineIndex = 0;
  var charIndex = 0;

  function type() {
    if (lineIndex >= lines.length) return;
    var el = lines[lineIndex];
    var text = texts[lineIndex];

    if (charIndex === 0) {
      el.hidden = false;
      el.classList.add('cursor');
    }

    // The statement lines are long and smaller, so they type at double speed
    // and the second follows the first with only a short pause.
    var small = el.classList.contains('typed-line--small');

    if (charIndex <= text.length) {
      render(lineIndex, charIndex);
      charIndex++;
      setTimeout(type, small ? 12 : 25);
    } else {
      // keep cursor blinking on the final line
      if (lineIndex < lines.length - 1) el.classList.remove('cursor');
      lineIndex++;
      charIndex = 0;
      if (lineIndex >= lines.length) container.classList.add('typed-done');
      else setTimeout(type, small ? 200 : 500);
    }
  }

  /* A keyboard user shouldn't wait on the animation to reach the links: the
     first Tab fills every line in at once. */
  function finish() {
    if (lineIndex >= lines.length) return;
    lines.forEach(function (el, i) {
      render(i, texts[i].length);
      el.hidden = false;
      el.classList.toggle('cursor', i === lines.length - 1);
    });
    lineIndex = lines.length;
    container.classList.add('typed-done');
  }
  document.addEventListener('keydown', function onTab(e) {
    if (e.key !== 'Tab') return;
    finish();
    document.removeEventListener('keydown', onTab);
  });

  type();
})();

/* Dot menu scroll-spy: the dot whose section fills the viewport middle is
   the active one, by click (set immediately for feedback) and by scroll.
   Sections that have no dot (education, contact) leave the last match
   active, so a dot always marks where you are. */
(function () {
  var dots = Array.prototype.slice.call(document.querySelectorAll('.dot-nav a'));
  if (dots.length < 2) return;
  var targets = dots.map(function (d) {
    var href = d.getAttribute('href') || '';
    var hash = href.indexOf('#');
    return hash === -1 ? null : document.getElementById(href.slice(hash + 1));
  });
  var active = -1;
  dots.forEach(function (d, j) { if (d.classList.contains('is-active')) active = j; });
  function activate(i) {
    if (i === active) return; // scroll fires this constantly; only touch the DOM on a change
    active = i;
    dots.forEach(function (d, j) {
      d.classList.toggle('is-active', j === i);
      if (j === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }
  function spy() {
    var mid = window.innerHeight * 0.5;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t) continue;
      var r = t.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) {
        activate(i);
        return;
      }
    }
  }
  /* At most one measurement per painted frame, however many scroll events
     the browser delivers in it. */
  var spyQueued = false;
  function queueSpy() {
    if (spyQueued) return;
    spyQueued = true;
    requestAnimationFrame(function () { spyQueued = false; spy(); });
  }
  dots.forEach(function (d, i) {
    d.addEventListener('click', function () { activate(i); });
  });
  window.addEventListener('scroll', queueSpy, { passive: true });
  window.addEventListener('resize', queueSpy);
  spy();
})();

/* Section jumps (dot menu, floating brand, skip link). The page snaps
   section-to-section (scroll-snap-type: y mandatory) and a same-page link
   glides there (scroll-behavior: smooth). The two fight on some phones: while
   the glide is in flight the browser re-evaluates the snap whenever the layout
   or the viewport changes (a dot label opening, the dot column hiding, the
   browser bars sliding), and re-snaps to whichever section is nearest at that
   instant, so the page lands on the wrong section. Snapping is switched off
   for the length of the glide (html.is-jumping) and back on once the page has
   come to rest on the target, which is itself a snap point, so nothing moves
   when it returns. Any touch, wheel or key hands control straight back. */
(function () {
  var root = document.documentElement;
  var timer = 0;

  function end() {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
    root.classList.remove('is-jumping');
  }
  function hold(ms) {
    clearTimeout(timer);
    timer = setTimeout(end, ms);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    root.classList.add('is-jumping');
    hold(500); // covers a jump that doesn't move (already there): no scroll events follow
  });
  // The glide is over when scroll events stop arriving.
  window.addEventListener('scroll', function () { if (timer) hold(200); }, { passive: true });
  document.addEventListener('scrollend', end);
  ['touchstart', 'wheel', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, end, { passive: true });
  });
})();

/* Hero collage: slow auto-scroll in a seamless loop + mouse-drag scrolling.
   Touch/trackpad scroll natively (CSS overflow). Clones are aria-hidden; the
   authored tiles are one arrow-key group (the post modal adds names and
   Enter/Space). It always starts in motion (a slow drift, kept on even under
   reduced-motion phone settings); the pause button stops all gallery motion.
   Without JS it's a static scrollable strip. */
(function () {
  var strip = document.querySelector('[data-collage]');
  if (!strip) return;

  var tiles = Array.prototype.slice.call(strip.children);
  if (!tiles.length) return;

  /* Each shot sits in a fixed .tile box; the media inside is what zooms, so
     neighboring boxes never move. */
  Array.prototype.forEach.call(strip.children, function (t) {
    var box = document.createElement('span');
    box.className = 'tile';
    strip.replaceChild(box, t);
    box.appendChild(t);
  });
  tiles = Array.prototype.slice.call(strip.children);

  function addCopy() {
    tiles.forEach(function (t) {
      var c = t.cloneNode(true);
      c.classList.add('tile--clone');
      c.setAttribute('aria-hidden', 'true');
      strip.appendChild(c);
    });
  }

  // One period = the authored block; add copies until there's room to wrap
  // on both sides at any viewport width.
  addCopy();
  var n = tiles.length; // tiles per period

  /* Geometry is measured, cached, and re-measured on resize; nothing in the
     per-frame loop asks the browser for layout. The tile width follows the
     viewport (vw), so the period does too: a period measured once at load goes
     stale on a rotate or window resize, and every wrap after that lands on the
     wrong shot (a visible jump). It is also fractional at most widths, where
     offsetLeft rounds to a whole pixel, so it is read from the fractional
     rects with the strip's own intro scale divided back out. */
  var period = 0, pitch = 0, rows = 1, cw = 0, maxScroll = 0;
  function measure() {
    var kids = strip.children;
    var first = kids[0], next = kids[n];
    var rough = next.offsetLeft - first.offsetLeft;
    var layoutW = parseFloat(getComputedStyle(strip).width);
    var k = layoutW > 0 ? strip.getBoundingClientRect().width / layoutW : 1;
    var exact = (next.getBoundingClientRect().left - first.getBoundingClientRect().left) / (k || 1);
    period = Math.abs(exact - rough) <= 1 ? exact : rough;
    // Column-flow grid: the first tile that starts a new column gives the row count.
    for (rows = 1; rows < n && kids[rows].offsetLeft === first.offsetLeft; rows++) {}
    pitch = period / Math.ceil(n / rows);
    cw = strip.clientWidth;
    maxScroll = strip.scrollWidth - cw;
  }
  measure();

  // One period = the authored block; add copies until there's room to wrap
  // on both sides at any viewport width.
  var copies = 2;
  while (strip.scrollWidth < period * 2 + strip.clientWidth && copies < 6) {
    addCopy();
    copies++;
  }
  maxScroll = strip.scrollWidth - cw;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = 18; // px per second
  var pos = period; // start one period in so leftward scrolling has room
  var pausedUntil = 0;
  var dragging = false, startX = 0, startScroll = 0;
  var touching = false;
  var kbd = false; // a tile holds keyboard focus: the strip stays put
  var last = null;
  var lastSet = pos;      // the last scroll position this script wrote
  var autoOwned = false;  // the auto-scroll moved the strip on the last frame
  var foreignAt = 0;      // last time something else (finger, wheel, momentum) moved it
  var pageScrollAt = 0;   // last time the page itself scrolled
  var ticking = false;    // a frame is queued
  var heroVisible = true; // the gallery is at least partly on screen

  function setScroll(x) {
    strip.scrollLeft = x;
    lastSet = x;
  }
  setScroll(pos);

  function rest(ms) { pausedUntil = performance.now() + ms; }

  var hero = strip.closest('.hero-collage');
  var brand = document.querySelector('.brand-float');
  var nav = document.querySelector('.dot-nav');
  var heroH = hero ? hero.offsetHeight : 0;
  /* The dot column and the hero intro share one job: guiding the visitor
     through the page. While the intro is on screen in the gallery it is the
     navigation, so the column stays hidden; minimizing the intro hands the job
     over. Everywhere outside the gallery the column is always visible. */
  function syncNav() {
    if (!nav || !hero) return;
    var inGallery = window.scrollY <= heroH * 0.65;
    var hide = inGallery && !hero.classList.contains('browsing');
    if (nav.hidden !== hide) {
      nav.hidden = hide;
      schedule(); // the dots moved in or out from under the pointer
    }
  }
  /* Swipe/drag fades the hero type away and condenses the floating brand to
     just the logo. The dismissal holds while the visitor is in the gallery
     section; once they scroll past it and come back, the type is restored
     (until they swipe it away again). Clicking the floating brand restores it
     in place even when already at the top. */
  function browsing() {
    if (!hero) return;
    hero.classList.add('browsing');
    syncNav();
    if (brand) brand.classList.add('is-condensed');
  }

  function reshown() {
    if (!hero) return;
    hero.classList.remove('browsing');
    syncNav();
  }

  var away = false;
  function restoreOnReturn() {
    pageScrollAt = performance.now();
    if (!hero) return;
    var threshold = heroH * 0.65;
    if (window.scrollY > threshold) away = true;
    else if (away) {
      away = false;
      reshown();
    }
    syncNav();
  }
  window.addEventListener('scroll', restoreOnReturn, { passive: true });
  syncNav();

  if (brand) {
    /* On touch there's no hover-out, so focus keeps the wordmark expanded after
       a tap until something else is clicked. Blur the link on activation: the
       next drag/scroll re-condenses it via .is-condensed. */
    brand.addEventListener('click', function () {
      reshown();
      brand.blur();
    });
  }

  /* Cursor gravity: tiles grow and lean toward the pointer, scaled by how
     close they are to it along the strip. Eased every frame; off under
     reduced motion and on touch (no hover). */
  var hoverCap = matchMedia('(hover: hover)').matches;
  var fx = hoverCap && !reduce; // pointer-proximity effects are on
  var px = null, py = null;
  var scales = [];
  var rects = [];
  var dotEls = Array.prototype.slice.call(document.querySelectorAll('.dot-nav a'));
  var dotEased = [];
  var dotOpen = [];
  var dotRects = [];

  /* The loop re-anchors the strip by whole periods (see home()). The shots
     are identical there, but each tile element carries its own eased zoom, so
     the zoom state moves across with the jump; otherwise the tile under the
     pointer would snap back to rest and regrow at every re-anchor. */
  function carryScales(d) { // the strip just moved by d periods
    if (!fx || !d) return;
    var total = strip.children.length, src = scales.slice(), shift = d * n;
    for (var j = 0; j < total; j++) scales[j] = src[(((j - shift) % total) + total) % total];
  }

  function setTransform(el, s) {
    if (el._tf === s) return; // unchanged since the last frame: no style write
    el._tf = s;
    el.style.transform = s;
  }

  function tileGravity() {
    var kids = strip.children;
    // Only the columns on screen (plus one each side), found from the scroll
    // position rather than by measuring every tile in every copy.
    var from = Math.max(0, (Math.floor(pos / pitch) - 1) * rows);
    var to = Math.min(kids.length, (Math.floor((pos + cw) / pitch) + 2) * rows);
    var i, inner, cur;

    if (px === null) {
      // Pointer is off the page: nothing to measure, zoomed tiles ease home.
      for (i = from; i < to; i++) {
        cur = scales[i];
        if (cur === undefined || cur === 1) continue;
        cur += (1 - cur) * 0.12;
        if (Math.abs(cur - 1) < 0.0005) cur = 1;
        scales[i] = cur;
        setTransform(kids[i].firstElementChild || kids[i], 'translate(0.00px,0.00px) scale(' + cur.toFixed(3) + ')');
      }
      return;
    }

    // Read every rect first, then write every transform, so the browser
    // resolves style once per frame instead of once per tile.
    for (i = from; i < to; i++) rects[i - from] = (kids[i].firstElementChild || kids[i]).getBoundingClientRect();
    var vw = window.innerWidth;
    var reach = (cw || 1) * 0.55;
    for (i = from; i < to; i++) {
      var r = rects[i - from];
      if (r.right < 0 || r.left > vw) continue;
      var dx = r.left + r.width / 2 - px;
      var dy = r.top + Math.min(r.height / 2, 160) - py;
      var fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / reach);
      fall *= fall;
      cur = scales[i];
      if (cur === undefined) cur = 1;
      cur += (1 + fall * 0.18 - cur) * 0.12;
      scales[i] = cur;
      var tx = fall ? Math.max(-12, Math.min(12, dx * 0.06 * fall)) : 0;
      var ty = fall ? Math.max(-12, Math.min(12, dy * 0.06 * fall)) : 0;
      setTransform(kids[i].firstElementChild || kids[i], 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + cur.toFixed(3) + ')');
    }
  }

  /* Side dots: grow toward the pointer and open their label by proximity,
     same easing family as the tiles. Text stays fully opaque throughout —
     only the box width moves. Returns true while a dot is still easing. */
  function dotGravity() {
    var busy = false, j;
    for (j = 0; j < dotEls.length; j++) dotRects[j] = dotEls[j].getBoundingClientRect();
    for (j = 0; j < dotEls.length; j++) {
      var a = dotEls[j];
      var ar = dotRects[j];
      var afall = 0;
      if (px !== null) {
        var adx = ar.right - 7 - px, ady = ar.top + ar.height / 2 - py;
        afall = Math.max(0, 1 - Math.sqrt(adx * adx + ady * ady) / 180);
        afall *= afall;
      }
      var acur = dotEased[j];
      if (acur === undefined) acur = 0;
      if (Math.abs(afall - acur) < 0.0005) acur = afall;
      else {
        acur += (afall - acur) * 0.14;
        busy = true;
      }
      dotEased[j] = acur;
      setTransform(a, 'scale(' + (1 + acur * 0.5).toFixed(3) + ')');
      var lbl = a.firstElementChild;
      var open = acur > 0.5;
      if (lbl && dotOpen[j] !== open) {
        dotOpen[j] = open;
        if (open) {
          if (!lbl._full) lbl._full = Math.ceil(lbl.scrollWidth / (parseFloat(getComputedStyle(lbl).fontSize) || 12)) + 1.5;
          lbl.style.maxWidth = lbl._full + 'em';
          lbl.style.paddingInline = '0.5em';
          lbl.style.boxShadow = 'var(--float-shadow)';
        } else {
          lbl.style.maxWidth = '0';
          lbl.style.paddingInline = '0';
          lbl.style.boxShadow = '';
        }
      }
    }
    return busy;
  }

  window.addEventListener('pointermove', function (e) {
    px = e.clientX; py = e.clientY;
    if (fx) schedule();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () {
    px = py = null;
    if (fx) schedule();
  });

  /* Seamless loop: the strip holds identical copies of the authored block, so
     moving it by exactly one period changes nothing on screen. home() maps a
     position into the home range [period, 2*period), which keeps a full
     period of room on the left and nearly one on the right. */
  function home(x) {
    if (!(period > 0)) return x;
    if (x >= period * 2) return (x % period) + period;
    if (x < period - 1) return x + period;
    return x;
  }

  /* Before a new gesture (press, touch, first wheel tick): if the strip is at
     rest outside the home range, hop it home so the gesture starts with room
     on both sides. Without this, a few swipes in a row ran into the real end
     of the strip, a hard stop (a rubber-band bounce on iOS). Skipped while a
     previous fling is still coasting: rewriting the position mid-momentum is
     what makes a strip stutter. */
  function settleHome() {
    if (performance.now() - foreignAt < 150) return;
    var x = strip.scrollLeft, h = home(x);
    if (h === x) return;
    carryScales(Math.round((h - x) / period));
    setScroll(h);
    pos = h;
  }

  function step(ts) {
    /* Auto-scroll runs unless paused (button, or reduced motion at load), a
       tile has keyboard focus, a drag/touch/rest window is in effect, or the
       page itself is mid-scroll (the drift holds still for the section flip,
       so the browser isn't repainting the strip while it moves the page). */
    var auto = !paused && !kbd && !dragging && !touching && ts > pausedUntil && ts - pageScrollAt > 120;
    var advance = auto && last !== null;
    var x = advance ? pos + SPEED * Math.min(ts - last, 100) / 1000 : strip.scrollLeft;
    last = ts;

    // Seamless wrap: re-anchor into the home range only while the auto-scroll
    // owns the strip. While a user scroll (touch, drag, or wheel/trackpad
    // momentum) is in flight, the native scroll is the source of truth;
    // re-anchoring mid-momentum yanked the strip back to the start (the
    // "bounce"). Deferred until the pause ends, where a modulo wrap absorbs
    // any overshoot in a single frame.
    if (auto) {
      var h = home(x);
      if (h !== x) carryScales(Math.round((h - x) / period));
      if (advance || h !== x) setScroll(h);
      x = h;
    }
    pos = x;
    autoOwned = auto;
  }

  /* One loop for everything animated here. It runs every frame only while
     the gallery is on screen; with the gallery scrolled away it wakes just
     long enough for the side dots to finish easing after the pointer moves. */
  function tick(ts) {
    ticking = false;
    var busy = false;
    if (heroVisible) {
      step(ts);
      if (fx) tileGravity();
      hsbSync();
      busy = true;
    } else {
      last = null; // no catch-up jump when the gallery comes back
    }
    if (fx && dotGravity()) busy = true;
    if (busy) schedule();
  }

  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[entries.length - 1].isIntersecting;
      if (heroVisible) schedule();
    }).observe(hero);
  }

  /* Draggable scrollbar for mouse users: thumb mirrors scroll position and is
     re-synced every frame (the strip auto-scrolls). Dragging the thumb scrolls
     the strip and pauses the loop; clicking the track jumps. The seamless loop
     re-anchors scrollLeft at the period boundaries, so the thumb fraction maps
     the current position inside [0, scrollWidth - clientWidth]. */
  var track = document.createElement('div');
  track.className = 'hsb';
  var thumb = document.createElement('div');
  thumb.className = 'hsb-thumb';
  // Pointer-only affordance; keyboard users browse the tiles with arrow keys.
  track.setAttribute('aria-hidden', 'true');
  track.appendChild(thumb);
  hero.appendChild(track);

  /* The thumb's size only changes with the layout, so it is set on measure;
     its position is a transform (compositor-only) from cached numbers. It used
     to be a margin computed from fresh layout reads every frame, which made
     the browser lay the page out again on every frame, forever. */
  var thumbDrag = false, tStartX = 0, tStartScroll = 0;
  var trackW = 0, thumbW = 0, thumbX = null;
  function measureHsb() {
    trackW = track.clientWidth;
    var sw = strip.scrollWidth;
    if (sw <= 0 || trackW <= 0) return;
    thumb.style.width = Math.max(24, (cw / sw) * trackW) + 'px';
    thumbW = thumb.offsetWidth;
    thumbX = null;
  }
  function hsbSync() {
    if (thumbDrag || maxScroll <= 0 || trackW <= 0) return;
    var dpr = window.devicePixelRatio || 1;
    var x = Math.round((pos / maxScroll) * (trackW - thumbW) * dpr) / dpr;
    if (x === thumbX) return;
    thumbX = x;
    thumb.style.transform = 'translateX(' + x + 'px)';
  }
  measureHsb();

  /* Rotate / resize: re-measure, and keep the same shots at the left edge by
     scaling the position with the period (the browser keeps the raw pixel
     offset, which points at different shots once the tiles change size). */
  window.addEventListener('resize', function () {
    var old = period;
    measure();
    measureHsb();
    if (hero) heroH = hero.offsetHeight;
    if (old > 0 && period > 0 && Math.abs(period - old) > 0.01) {
      var x = strip.scrollLeft * period / old;
      setScroll(x);
      pos = x;
    }
    schedule();
  });

  thumb.addEventListener('pointerdown', function (e) {
    thumbDrag = true;
    tStartX = e.clientX;
    tStartScroll = strip.scrollLeft;
    thumb.setPointerCapture(e.pointerId);
    rest(2500);
    e.preventDefault();
  });
  thumb.addEventListener('pointermove', function (e) {
    if (!thumbDrag) return;
    var maxScroll = strip.scrollWidth - strip.clientWidth;
    var span = track.clientWidth - thumb.offsetWidth;
    var target = tStartScroll + (e.clientX - tStartX) * (maxScroll / span);
    target = Math.max(0, Math.min(maxScroll, target));
    strip.scrollLeft = target;
    pos = target;
    rest(1000);
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    thumb.addEventListener(ev, function () { thumbDrag = false; rest(2500); });
  });
  track.addEventListener('pointerdown', function (e) {
    if (e.target === thumb) return;
    var tw = thumb.offsetWidth;
    var frac = (e.clientX - track.getBoundingClientRect().left - tw / 2) / (track.clientWidth - tw);
    frac = Math.max(0, Math.min(1, frac));
    strip.scrollLeft = frac * (strip.scrollWidth - strip.clientWidth);
    pos = strip.scrollLeft;
    rest(2500);
    browsing();
  });

  ['wheel', 'touchstart'].forEach(function (ev) {
    strip.addEventListener(ev, function () {
      if (ev === 'touchstart') touching = true;
      else settleHome(); // touch is settled on pointerdown, before the tap handlers sample the position
      rest(2500);
      browsing();
    }, { passive: true });
  });
  // Native scrolling the loop didn't cause (a fling still coasting after the
  // finger lifts, trackpad momentum) keeps the auto paused, so it never
  // fights the momentum. The loop's own writes land within a pixel of what it
  // last wrote; anything else is someone else's scroll, however slow. (This
  // used to compare against the position one frame ago and ignore anything
  // under 2px, so the slow tail of a fling didn't count: the auto-scroll could
  // resume, and re-anchor, while the strip was still coasting.)
  strip.addEventListener('scroll', function () {
    if (autoOwned && Math.abs(strip.scrollLeft - lastSet) <= 1.5) return;
    var now = performance.now();
    foreignAt = now;
    if (pausedUntil < now + 400) pausedUntil = now + 400;
  }, { passive: true });

  // Lift of the finger ends the gesture: keep the auto paused for a grace
  // period, then resume from wherever the user left the strip.
  ['touchend', 'touchcancel'].forEach(function (ev) {
    strip.addEventListener(ev, function () { touching = false; rest(2500); }, { passive: true });
  });

  strip.addEventListener('pointerdown', function (e) {
    settleHome();
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startScroll = strip.scrollLeft;
    strip.classList.add('dragging');
    strip.setPointerCapture(e.pointerId);
    browsing();
  });

  strip.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var x = startScroll - (e.clientX - startX);
    // Dragged to either real end of the strip: hop one period and keep going.
    if (period > 0 && (x < 0 || x > maxScroll)) {
      var d = x < 0 ? 1 : -1;
      startScroll += d * period;
      x += d * period;
      carryScales(d);
    }
    setScroll(x);
    browsing();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    strip.classList.remove('dragging');
    rest(2500);
  }

  strip.addEventListener('pointerup', endDrag);
  strip.addEventListener('pointercancel', endDrag);

  /* Pause / play: stops the drift, the looping video tiles, and the animated
     images (a canvas snapshot of the current frame stands in while paused). */
  var paused = false;
  var pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'hero-pause';
  pauseBtn.setAttribute('aria-label', 'Pause gallery motion');
  pauseBtn.innerHTML =
    '<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12"/><rect x="9.5" y="2" width="3.5" height="12"/></svg>' +
    '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z"/></svg>';
  hero.appendChild(pauseBtn);

  function freezeGif(img) {
    if (img._still || !img.naturalWidth) return;
    var c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    c.setAttribute('aria-hidden', 'true');
    img.after(c);
    img.style.display = 'none';
    img._still = c;
  }

  function thawGif(img) {
    if (!img._still) return;
    img._still.remove();
    img._still = null;
    img.style.display = '';
  }

  function setPaused(p) {
    paused = p;
    strip.classList.toggle('is-paused', p);
    pauseBtn.setAttribute('aria-pressed', String(p));
    strip.querySelectorAll('video').forEach(function (v) {
      if (p) v.pause();
      else { var r = v.play(); if (r && r.catch) r.catch(function () {}); }
    });
    strip.querySelectorAll('img[src$=".gif"], img[data-animated]').forEach(function (img) {
      if (!p) return thawGif(img);
      if (img.complete) freezeGif(img);
      else img.addEventListener('load', function () { if (paused) freezeGif(img); }, { once: true });
    });
  }

  pauseBtn.addEventListener('click', function () { setPaused(!paused); });
  setPaused(false);

  /* Minimize: the same hand-off as swiping the gallery, for visitors who
     don't think to swipe. Sits in the type block's bottom-right corner. */
  var typed = document.getElementById('typed-container');
  if (typed) {
    var minBtn = document.createElement('button');
    minBtn.type = 'button';
    minBtn.className = 'hero-minimize';
    minBtn.setAttribute('aria-label', 'Minimize intro and browse the gallery');
    minBtn.innerHTML =
      '<svg viewBox="71 35 74 74" aria-hidden="true"><rect x="75.3" y="39.4" width="65.8" height="65.8"/>' +
      '<polyline points="113.5 94.9 113.5 76.9 131.3 76.9"/><polyline points="104.4 50 104.4 68 86.7 68"/></svg>';
    typed.appendChild(minBtn);
    minBtn.addEventListener('click', function () {
      browsing();
      minBtn.blur();
    });
  }

  /* Keyboard: one Tab stop for the authored tiles (first appearance of each
     shot), arrows/Home/End move between them. A focused tile is centered and
     the hero type steps aside so it isn't covered. Repeats and clones stay
     out of the accessibility tree. */
  var seen = {};
  var keyTiles = tiles.filter(function (t) {
    var m = t.querySelector('img, video');
    var src = m && m.getAttribute('src');
    if (!src || seen[src]) { t.setAttribute('aria-hidden', 'true'); return false; }
    seen[src] = true;
    return true;
  });
  keyTiles.forEach(function (t, i) { t.tabIndex = i === 0 ? 0 : -1; });

  function centerTile(t) {
    var tr = t.getBoundingClientRect();
    var sr = strip.getBoundingClientRect();
    strip.scrollTo({
      left: strip.scrollLeft + (tr.left + tr.width / 2) - (sr.left + sr.width / 2),
      behavior: reduce ? 'auto' : 'smooth'
    });
  }

  strip.addEventListener('keydown', function (e) {
    var i = keyTiles.indexOf(document.activeElement);
    if (i < 0) return;
    var n = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: keyTiles.length - 1 }[e.key];
    if (n === undefined) return;
    e.preventDefault();
    n = Math.max(0, Math.min(keyTiles.length - 1, n));
    keyTiles[i].tabIndex = -1;
    keyTiles[n].tabIndex = 0;
    keyTiles[n].focus({ preventScroll: true });
  });

  strip.addEventListener('focusin', function (e) {
    var t = e.target;
    if (keyTiles.indexOf(t) < 0 || !t.matches(':focus-visible')) return;
    kbd = true;
    browsing();
    centerTile(t);
  });
  strip.addEventListener('focusout', function () { kbd = false; rest(2500); });

  schedule();
})();

/* Gallery post modal: clicking a collage tile (without dragging) opens an
   Instagram-style post, shot on the left, caption on the right. Dismiss with
   the X, a click on the backdrop, or Escape. Captions keyed by collage file. */
(function () {
  var strip = document.querySelector('[data-collage]');
  if (!strip) return;

  var CAPTIONS = {
    '01': { t: 'Felt jewelry display', x: 'Flat-pack felt jewelry display concept for Fair Anita. Stiffened felt explored as a low-cost, flat-pack, sustainable alternative to conventional point-of-sale displays.' },
    '02': { t: 'Telo Y-Cane render', x: 'The Telo Y-Cane, rendered and textured in Blender.' },
    '03': { t: 'Echolocation eyewear', x: 'Form studies of speculative echolocation eyewear, inspired by bats.' },
    '04': { t: 'Ossur Ibex prosthetic', x: 'Prosthetic foot concept designed specifically for hikers.' },
    '05': { t: 'Pigeon donation app', x: 'Pigeon, a crowdsourced physical donation platform that lets communities coordinate hyper-local donation drives.' },
    '06': { t: 'VL mountaineering inflatable', x: 'Inflatable mountaineering prototype made with thermowelded TPU nylon.' },
    '07': { t: 'Creation Studios projects', x: 'Program projects used to teach vector design and 3D CAD software, part of an open-source Creation Studios program bringing digital fabrication to public libraries and schools.' },
    '08': { t: 'Open robotics chassis', x: 'Open robotics platform chassis used to teach and develop mobile robotics.' },
    '09': { t: 'Apple stethoscope', x: 'Speculative Apple stethoscope, exploring how Apple might lean further into health diagnostics after the Apple Watch.' },
    '10': { t: 'Scout 50cc scooter', x: 'Scout 50cc off-road motor scooter concept, a sketch render from work at the transportation design studio Studio 04.' },
    '11': { t: 'FetchBot', x: 'FetchBot, a robotics platform built to test ultra-wideband localization and wayfinding applications.' },
    '12': { t: 'Submarine-inspired scooter', x: 'Concept motor scooter exploration taking inspiration from submarine form language.' },
    '13': { t: 'Motor scooter sketches', x: 'Concept motor scooter sketch explorations in Prisma color pencils.' },
    '14': { t: 'Scooter body render', x: 'Sketch render of a concept motor scooter body, testing different material finishes and contours.' },
    '15': { t: 'Echolocation sport glasses', x: 'Concept sketches of speculative echolocation sport glasses for the visually impaired.' },
    '16': { t: 'Hiking prosthetic sketches', x: 'Concept sketch exploration of an off-road hiking prosthetic.' },
    '17': { t: 'Hiking prosthetic illustration', x: 'Illustration of a concept hiking prosthetic.' },
    '18': { t: 'Upright wheelchair sketches', x: 'Concept exploration sketches of a self-balancing upright wheelchair with posture support.' },
    '19': { t: 'Apple stethoscope sketches', x: 'Concept exploration sketches of the speculative Apple stethoscope project.' },
    '20': { t: 'Robot CAD render', x: 'Blender 3D render of a robot CAD model.' },
    '21': { t: 'Depth camera test', x: 'Depth camera test using two low-cost Logitech webcams, putting theory to application.' },
    '22': { t: 'Web UI particle motion', x: 'Web UI particle motion study.' },
    '23': { t: 'Y-Cane walk cycle', x: 'Informational walk cycle of the Y-Cane for Telo Design, animated in Adobe After Effects.' },
    '24': { t: 'Y-Cane exploded view', x: 'Animated exploded view of the Telo Y-Cane handle assembly, rendered in Blender.' }
  };

  function keyOf(src) {
    var m = /\/(\d{2})\.(?:webp|mp4|webm|mov|gif)/.exec(src || '');
    return m ? m[1] : null;
  }

  var overlay = document.createElement('div');
  overlay.className = 'post-modal';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Gallery item');
  overlay.innerHTML =
    '<div class="post-card">' +
      '<div class="post-media"><img alt="">' +
        '<video muted loop playsinline preload="metadata" controls hidden></video></div>' +
      '<div class="post-caption">' +
        '<div class="post-handle"><span>stevenbleau . design</span>' +
        '<button class="post-close" type="button" aria-label="Close post">&times;</button></div>' +
        '<h2 class="post-title"></h2>' +
        '<p class="post-text"></p>' +
        '<p class="post-index"></p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var bigImg = overlay.querySelector('.post-media img');
  var bigVid = overlay.querySelector('.post-media video');
  var titleEl = overlay.querySelector('.post-title');
  var textEl = overlay.querySelector('.post-text');
  var indexEl = overlay.querySelector('.post-index');
  var closeBtn = overlay.querySelector('.post-close');
  var lastFocus = null;

  var hideTimer = 0;
  var openedAt = 0;
  function open(tile) {
    var src = tile.getAttribute('src');
    var k = keyOf(src);
    var cap = (k && CAPTIONS[k]) || { t: 'From the studio sketchbook', x: 'A page from the working gallery.' };
    var isVid = tile.tagName === 'VIDEO';
    if (isVid) {
      bigImg.hidden = true;
      bigVid.hidden = false;
      bigVid.src = src;
      bigVid.currentTime = 0;
      bigVid.play().catch(function () {});
    } else {
      bigVid.pause();
      bigVid.hidden = true;
      bigImg.hidden = false;
      bigImg.src = src;
      bigImg.alt = cap.t;
    }
    titleEl.textContent = cap.t;
    textEl.textContent = cap.x;
    indexEl.textContent = k ? '.' + k + ' · gallery' : '';
    lastFocus = document.activeElement;
    clearTimeout(hideTimer);
    overlay.hidden = false;
    openedAt = Date.now();
    document.documentElement.classList.add('modal-open');
    closeBtn.focus();
    /* second frame: the transition starts from opacity 0 / offset card */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    });
  }

  function close() {
    bigVid.pause();
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('modal-open');
    hideTimer = setTimeout(function () { overlay.hidden = true; }, 340);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* Tiles open on a stationary press-release. The collage loop auto-scrolls,
     so position is sampled at pointerdown and re-checked at pointerup; a
     moving shot under a held finger is browsing, not a tap. Pointer capture
     during a drag redirects click events to the strip, so hit-test here.
     A press while the intro is up only minimizes it: the check runs in the
     capture phase, ahead of the handlers that add .browsing. */
  var hero = strip.closest('.hero-collage');
  var downX = 0, downY = 0, downScroll = 0, introUp = false;
  strip.addEventListener('pointerdown', function () {
    introUp = !!hero && !hero.classList.contains('browsing');
  }, true);
  strip.addEventListener('pointerdown', function (e) {
    downX = e.clientX; downY = e.clientY;
    downScroll = strip.scrollLeft;
  });
  strip.addEventListener('pointerup', function (e) {
    if (introUp) return;
    if (Math.abs(e.clientX - downX) > 8 || Math.abs(e.clientY - downY) > 8) return;
    if (Math.abs(strip.scrollLeft - downScroll) > 8) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.tagName === 'CANVAS') el = el.previousElementSibling; // paused GIF still
    if (el && (el.tagName === 'IMG' || el.tagName === 'VIDEO') && strip.contains(el)) open(el);
  });

  /* Every tile (clones too) carries its caption title for the hover chip. */
  strip.querySelectorAll('.tile').forEach(function (t) {
    var m = t.querySelector('img, video');
    var cap = m && CAPTIONS[keyOf(m.getAttribute('src'))];
    if (cap) t.dataset.title = cap.t;
  });

  /* Keyboard tiles (tabbable ones from the collage script): named by their
     caption title, opened with Enter or Space like a button. */
  strip.querySelectorAll('.tile[tabindex]').forEach(function (t) {
    var m = t.querySelector('img, video');
    var cap = CAPTIONS[keyOf(m.getAttribute('src'))];
    t.setAttribute('role', 'button');
    t.setAttribute('aria-label', cap ? cap.t : 'Gallery item');
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      open(m);
    });
  });

  /* Backdrop click dismisses. The tile's pointerup already opened the overlay,
     and the click dispatched right after can land on the now-visible backdrop
     (tile edges, top/bottom rows sit near row gaps), which would instantly
     close what just opened. Ignore the backdrop during that hand-off window. */
  overlay.addEventListener('click', function (e) {
    if (e.target !== overlay) return;
    if (Date.now() - openedAt < 400) return;
    close();
  });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (overlay.hidden) return;
    if (e.key === 'Escape') close();
    /* Keep Tab inside the open post: wrap between its first and last
       focusable controls instead of reaching the page behind. */
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(
      overlay.querySelectorAll('button, [href], video[controls]'),
      function (el) { return !el.hidden && el.offsetParent !== null; }
    );
    if (!f.length) return;
    var first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && (document.activeElement === lastEl || !overlay.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  });
})();

/* Horizontal snap rows: make the strip keyboard-scrollable and build a slot
   pager under the strip, one clickable slot per card. Clicking a slot
   smooth-scrolls that card to center; the centered card's slot is filled.
   Cards scale with cursor proximity (shared eased loop below) instead of the
   old center-pop. Without IntersectionObserver, the slots alone still drive scrollTo. */
(function () {
  var snapLists = [];
  document.querySelectorAll('[data-hsnap]').forEach(function (list) {
    var items = Array.prototype.slice.call(list.children);
    if (items.length < 2) return;
    list.tabIndex = 0;
    list.setAttribute('role', 'list');

    var slots = document.createElement('div');
    slots.className = 'hsnap-slots';
    var slotEls = items.map(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hsnap-slot';
      b.setAttribute('aria-label', 'Show item ' + (i + 1) + ' of ' + items.length);
      b.addEventListener('click', function () {
        list.scrollTo({
          left: it.offsetLeft + it.offsetWidth / 2 - list.clientWidth / 2,
          behavior: reduceMotion() ? 'auto' : 'smooth',
        });
      });
      slots.appendChild(b);
      return b;
    });
    list.insertAdjacentElement('afterend', slots);

    function activate(it) {
      var i = items.indexOf(it);
      slotEls.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
    }
    activate(items[0]);

    /* Growth budget: half the inter-card gap per side, so scaled cards can
       never touch their neighbors. */
    var gap = items[1].offsetLeft - items[0].offsetLeft - items[0].offsetWidth;
    snapLists.push({
      els: items,
      eased: items.map(function () { return 1; }),
      cap: Math.min(0.05, Math.max(0.02, gap / Math.max(1, items[0].offsetWidth))),
    });

    /* Scroll-linked frost: each card's --frost follows how far the strip sits
       from that card's snap position, measured against its neighbors' snap
       positions (the last card's is clamped by the scroll range, so the steps
       aren't equal). */
    var snaps = [];
    function measure() {
      var max = list.scrollWidth - list.clientWidth;
      snaps = items.map(function (it) {
        var center = getComputedStyle(it).scrollSnapAlign.indexOf('center') !== -1;
        var at = center ? it.offsetLeft + it.offsetWidth / 2 - list.clientWidth / 2 : it.offsetLeft;
        return Math.max(0, Math.min(max, at));
      });
    }
    function frost() {
      var x = list.scrollLeft;
      items.forEach(function (it, i) {
        var at = snaps[i], f = 1;
        if (x < at && i > 0) f = Math.min(1, (at - x) / (at - snaps[i - 1]));
        else if (x >= at && i < items.length - 1) f = Math.min(1, (x - at) / (snaps[i + 1] - at));
        else if (x >= at || i === 0) f = 0;
        // Written only when the value moves: every card is recomputed on
        // every scroll frame, but only the two around the swipe change.
        var v = f.toFixed(3);
        if (it._frost === v) return;
        it._frost = v;
        it.style.setProperty('--frost', v);
        it.classList.toggle('is-clear', f < 0.002);
      });
    }
    var frostQueued = false;
    function queueFrost() {
      if (frostQueued) return;
      frostQueued = true;
      requestAnimationFrame(function () { frostQueued = false; frost(); });
    }
    function remeasure() { measure(); queueFrost(); }
    measure();
    frost();
    list.classList.add('hsnap-frost');
    list.addEventListener('scroll', queueFrost, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) activate(en.target);
      });
    }, { root: list, threshold: 0.75 });
    items.forEach(function (it) { io.observe(it); });
  });

  /* Cursor proximity scaling: cards in every snap row breathe together —
     each grows toward the pointer (fall-off spans several cards), eased so
     the field settles without overlaps. The loop sleeps once every card has
     settled and wakes on whatever can change the answer: the pointer moving,
     or the page or a row scrolling under it. */
  if (snapLists.length && matchMedia('(hover: hover)').matches && !reduceMotion()) {
    var sx = null, sy = null;
    var looping = false;
    var media = null; // [{ el, cap }], collected once on the first frame

    function collect() {
      media = [];
      snapLists.forEach(function (cfg) {
        cfg.els.forEach(function (el) {
          Array.prototype.forEach.call(el.querySelectorAll('img, video'), function (m) {
            if (!m.classList.contains('no-zoom')) media.push({ el: m, cap: cfg.cap, r: null });
          });
        });
      });
    }

    function snapLoop() {
      looping = false;
      if (!media) collect();
      var busy = false, vw = window.innerWidth, j, o;
      // Read every rect, then write every transform.
      for (j = 0; j < media.length; j++) media[j].r = media[j].el.getBoundingClientRect();
      for (j = 0; j < media.length; j++) {
        o = media[j];
        var m = o.el, r = o.r;
        if (r.right < 0 || r.left > vw) continue;
        var fall = 0;
        if (sx !== null) {
          var dx = r.left + r.width / 2 - sx, dy = r.top + r.height / 2 - sy;
          fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (Math.max(r.width, 360) * 1.1));
          fall *= fall;
        }
        var target = 1 + fall * o.cap * 3;
        var cur = m._gs === undefined ? 1 : m._gs;
        if (Math.abs(target - cur) < 0.0005) cur = target;
        else {
          cur += (target - cur) * 0.12;
          busy = true;
        }
        m._gs = cur;
        var t = 'scale(' + cur.toFixed(3) + ')';
        if (m._tf !== t) {
          m._tf = t;
          m.style.transform = t;
        }
      }
      if (busy) wake();
    }

    function wake() {
      if (looping) return;
      looping = true;
      requestAnimationFrame(snapLoop);
    }

    window.addEventListener('pointermove', function (e) { sx = e.clientX; sy = e.clientY; wake(); }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { sx = sy = null; wake(); });
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    snapLists.forEach(function (cfg) {
      cfg.els[0].parentNode.addEventListener('scroll', wake, { passive: true });
    });
    wake();
  }
})();

/* Below-the-fold images are loading="lazy" so they don't compete with the
   first screen. Once the page has loaded, fetch them anyway while the browser
   is idle: a lazy image only starts loading as it scrolls into view, which
   lands the download and decode in the middle of a section flip or a gallery
   swipe (blank tiles popping in, a hitch in the scroll). */
(function () {
  function warm() {
    Array.prototype.forEach.call(document.querySelectorAll('img[loading="lazy"]'), function (img) {
      img.loading = 'eager';
    });
  }
  function soon() {
    if (navigator.connection && navigator.connection.saveData) return; // Data Saver: stay lazy
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 600);
  }
  if (document.readyState === 'complete') soon();
  else window.addEventListener('load', soon);
})();

/* Product videos: autoplay muted while on screen; preload="metadata" ships
   the first frame so iOS paints a poster immediately instead of a black box,
   playback deferred until the card scrolls into view. Each plate gets a
   pause/play button; pausing holds until the visitor presses play again.
   Autoplays for everyone, reduced motion included (the button is the off
   switch). */
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll('.work-plate--video video'));
  if (!vids.length) return;

  function play(v) { if (!v._held) v.play().catch(function () {}); }

  vids.forEach(function (v) {
    v._held = false;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'video-pause';
    b.setAttribute('aria-label', 'Pause video');
    b.setAttribute('aria-pressed', String(v._held));
    b.innerHTML =
      '<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12"/><rect x="9.5" y="2" width="3.5" height="12"/></svg>' +
      '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z"/></svg>';
    b.addEventListener('click', function () {
      v._held = !v._held;
      b.setAttribute('aria-pressed', String(v._held));
      if (v._held) v.pause();
      else play(v);
    });
    // On the plate, not inside the link wrapping the video (no button in a link).
    v.closest('.work-plate').appendChild(b);
  });

  if (!('IntersectionObserver' in window)) {
    vids.forEach(play);
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) play(en.target);
      else en.target.pause();
    });
  }, { rootMargin: '200px 0px', threshold: 0.2 });
  vids.forEach(function (v) { io.observe(v); });
})();

/* Collage video tiles are GIF-style loops: muted, autoplaying, looping, no
   controls. Autoplay ships in the markup; this nudges any tile the browser
   suspended after the defer/load race. */
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll('.collage video'));
  if (!vids.length || document.querySelector('.collage.is-paused')) return;
  vids.forEach(function (v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  });
})();

/* Contact form: AJAX submit to Formspree so the page stays put and shows an
   inline status. Recipients are configured in the Formspree dashboard, so the
   email addresses never appear in the page source. */
(function () {
  var form = document.querySelector('.contact-form');
  if (!form) return;
  var status = form.querySelector('.contact-status');
  var submit = form.querySelector('.contact-submit');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });

    submit.disabled = true;
    status.classList.remove('is-sent');
    status.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          status.classList.add('is-sent');
          status.textContent = 'Thanks, your message is on its way.';
        } else {
          return res.json().catch(function () { return {}; }).then(function (body) {
            throw new Error(body.message || 'Something went wrong. Please try again.');
          });
        }
      })
      .catch(function (err) { status.textContent = err.message; })
      .finally(function () { submit.disabled = false; });
  });
})();
