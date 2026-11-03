document.documentElement.classList.add('js');

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

var year = document.querySelector('[data-year]');
if (year) year.textContent = String(new Date().getFullYear());

/* Typewriter hero. Lines exist statically in the markup (works JS-off);
   this empties them and retypes, matching stevenbleau.design's landing.
   Runs regardless of prefers-reduced-motion: it's a short text reveal, not
   parallax or large-area motion, so it stays on for phones in Reduce Motion. */
(function () {
  var container = document.getElementById('typed-container');
  if (!container) return;

  var lines = Array.prototype.slice.call(container.querySelectorAll('.typed-line'));
  if (!lines.length) return;

  var texts = lines.map(function (el) { return el.textContent; });
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

    if (charIndex <= text.length) {
      el.textContent = text.substring(0, charIndex);
      charIndex++;
      setTimeout(type, 25);
    } else {
      // keep cursor blinking on the final line
      if (lineIndex < lines.length - 1) el.classList.remove('cursor');
      lineIndex++;
      charIndex = 0;
      if (lineIndex >= lines.length) container.classList.add('typed-done');
      else setTimeout(type, 500);
    }
  }

  /* A keyboard user shouldn't wait on the animation to reach the links: the
     first Tab fills every line in at once. */
  function finish() {
    if (lineIndex >= lines.length) return;
    lines.forEach(function (el, i) {
      el.textContent = texts[i];
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

/* Floating brand widget: over the hero the wordmark shows expanded; once the
   page scrolls past the hero the wordmark condenses to just the logo (CSS in
   .is-condensed) and STAYS condensed for the rest of the page's life, the
   only ways back to expanded are hovering/focusing the mark (CSS) or
   reloading the page. */
(function () {
  var brand = document.querySelector('.brand-float');
  if (!brand) return;
  var hero = document.querySelector('.hero-collage');
  var latched = false;
  function update() {
    if (latched) return;
    var threshold = (hero ? hero.offsetHeight : window.innerHeight) * 0.65;
    if (window.scrollY > threshold) {
      latched = true;
      brand.classList.add('is-condensed');
    }
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
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
  function activate(i) {
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
  dots.forEach(function (d, i) {
    d.addEventListener('click', function () { activate(i); });
  });
  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy);
  spy();
})();

/* Hero collage: slow auto-scroll in a seamless loop + mouse-drag scrolling.
   Touch/trackpad scroll natively (CSS overflow). Clones are aria-hidden; the
   authored tiles are one arrow-key group (the post modal adds names and
   Enter/Space). A pause button stops all gallery motion, and it starts paused
   under reduced motion. Without JS it's a static scrollable strip. */
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
  var period = strip.children[tiles.length].offsetLeft;
  var copies = 2;
  while (strip.scrollWidth < period * 2 + strip.clientWidth && copies < 6) {
    addCopy();
    copies++;
  }

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SPEED = 18; // px per second
  var pos = period; // start one period in so leftward scrolling has room
  var pausedUntil = 0;
  var dragging = false, startX = 0, startScroll = 0;
  var touching = false;
  var kbd = false; // a tile holds keyboard focus: the strip stays put
  var last = null;

  strip.scrollLeft = pos;

  function rest(ms) { pausedUntil = performance.now() + ms; }

  var hero = strip.closest('.hero-collage');
  var brand = document.querySelector('.brand-float');
  var nav = document.querySelector('.dot-nav');
  /* The dot column and the hero intro share one job: guiding the visitor
     through the page. While the intro is on screen in the gallery it is the
     navigation, so the column stays hidden; minimizing the intro hands the job
     over. Everywhere outside the gallery the column is always visible. */
  function syncNav() {
    if (!nav || !hero) return;
    var inGallery = window.scrollY <= hero.offsetHeight * 0.65;
    nav.hidden = inGallery && !hero.classList.contains('browsing');
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
    if (!hero) return;
    var threshold = hero.offsetHeight * 0.65;
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
  var px = null, py = null;
  var scales = [];
  var dotEls = Array.prototype.slice.call(document.querySelectorAll('.dot-nav a'));
  var dotEased = [];

  function gravity() {
    var kids = strip.children;
    var cw = strip.clientWidth || 1;
    if (!hoverCap || reduce) return;
    for (var i = 0; i < kids.length; i++) {
      var t = kids[i];
      var inner = t.firstElementChild || t;
      var r = inner.getBoundingClientRect();
      if (r.right < 0 || r.left > window.innerWidth) continue;
      var cx = r.left + r.width / 2;
      var cy = r.top + Math.min(r.height / 2, 160);
      var fall = 0;
      if (px !== null) {
        var dx = cx - px;
        var dy = cy - py;
        var d = Math.sqrt(dx * dx + dy * dy);
        fall = Math.max(0, 1 - d / (cw * 0.55));
        fall *= fall;
      } else {
        var dx = cx - window.innerWidth / 2;
        var dy = cy - window.innerHeight / 2;
      }
      var cur = scales[i];
      if (cur === undefined) cur = 1;
      cur += (1 + fall * 0.18 - cur) * 0.12;
      scales[i] = cur;
      var tx = fall ? Math.max(-12, Math.min(12, dx * 0.06 * fall)) : 0;
      var ty = fall ? Math.max(-12, Math.min(12, dy * 0.06 * fall)) : 0;
      inner.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + cur.toFixed(3) + ')';
    }

    /* Side dots: grow toward the pointer and open their label by proximity,
       same easing family as the tiles. Text stays fully opaque throughout —
       only the box width moves. */
    for (var j = 0; j < dotEls.length; j++) {
      var a = dotEls[j];
      var ar = a.getBoundingClientRect();
      var acx = ar.right - 7;
      var acy = ar.top + ar.height / 2;
      var afall = 0;
      if (px !== null) {
        var adx = acx - px, ady = acy - py;
        afall = Math.max(0, 1 - Math.sqrt(adx * adx + ady * ady) / 180);
        afall *= afall;
      }
      var acur = dotEased[j];
      if (acur === undefined) acur = 0;
      acur += (afall - acur) * 0.14;
      dotEased[j] = acur;
      a.style.transform = 'scale(' + (1 + acur * 0.5).toFixed(3) + ')';
      var lbl = a.firstElementChild;
      if (lbl) {
        if (acur > 0.5) {
          if (!lbl._full) lbl._full = Math.ceil(lbl.scrollWidth / (parseFloat(getComputedStyle(lbl).fontSize) || 12)) + 1.5;
          lbl.style.maxWidth = lbl._full + 'em';
          lbl.style.paddingInline = '0.5em';
        } else {
          lbl.style.maxWidth = '0';
          lbl.style.paddingInline = '0';
        }
      }
    }
  }

  window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { px = py = null; });

  function frame(ts) {
    /* Auto-scroll runs unless paused (button, or reduced motion at load), a
       tile has keyboard focus, or a drag/touch/rest window is in effect. */
    var auto = !paused && !kbd && !dragging && !touching && ts > pausedUntil;
    if (auto && last !== null) {
      pos += SPEED * Math.min(ts - last, 100) / 1000;
      strip.scrollLeft = pos;
    } else {
      pos = strip.scrollLeft;
    }
    last = ts;

    // Seamless wrap: re-anchor into the home range [period, 2*period) only
    // while the auto-scroll owns the strip. While a user scroll (touch, drag,
    // or wheel/trackpad momentum) is in flight, the native scroll is the source
    // of truth; re-anchoring mid-momentum yanked the strip back to the start
    // (the "bounce"). Deferred until the pause ends, where a modulo wrap
    // absorbs any overshoot in a single frame.
    if (auto) {
      var sl = strip.scrollLeft;
      if (sl >= period * 2 || sl < 0) {
        var wrapped = (sl % period) + period;
        strip.scrollLeft = wrapped;
        pos = wrapped;
      }
    }
    gravity();
    hsbSync();
    requestAnimationFrame(frame);
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

  var thumbDrag = false, tStartX = 0, tStartScroll = 0;
  function hsbSync() {
    var max = strip.scrollWidth - strip.clientWidth;
    var trackW = track.clientWidth;
    if (max <= 0 || trackW <= 0) return;
    thumb.style.width = Math.max(24, (strip.clientWidth / strip.scrollWidth) * trackW) + 'px';
    if (!thumbDrag) thumb.style.marginLeft = (strip.scrollLeft / max) * (trackW - thumb.offsetWidth) + 'px';
  }

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
      rest(2500);
      browsing();
    }, { passive: true });
  });
  // Lift of the finger ends the gesture: keep the auto paused for a grace
  // period, then resume from wherever the user left the strip.
  ['touchend', 'touchcancel'].forEach(function (ev) {
    strip.addEventListener(ev, function () { touching = false; rest(2500); }, { passive: true });
  });

  strip.addEventListener('pointerdown', function (e) {
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
    strip.scrollLeft = startScroll - (e.clientX - startX);
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

  /* Pause / play: stops the drift, the looping video tiles, and the GIF (a
     canvas snapshot of its current frame stands in while paused). */
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
    strip.querySelectorAll('img[src$=".gif"]').forEach(function (img) {
      if (!p) return thawGif(img);
      if (img.complete) freezeGif(img);
      else img.addEventListener('load', function () { if (paused) freezeGif(img); }, { once: true });
    });
  }

  pauseBtn.addEventListener('click', function () { setPaused(!paused); });
  setPaused(reduce);

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

  requestAnimationFrame(frame);
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
    '23': { t: 'Y-Cane walk cycle', x: 'Informational walk cycle of the Y-Cane for Telo Design, animated in Adobe After Effects.' }
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
     during a drag redirects click events to the strip, so hit-test here. */
  var downX = 0, downY = 0, downScroll = 0;
  strip.addEventListener('pointerdown', function (e) {
    downX = e.clientX; downY = e.clientY;
    downScroll = strip.scrollLeft;
  });
  strip.addEventListener('pointerup', function (e) {
    if (Math.abs(e.clientX - downX) > 8 || Math.abs(e.clientY - downY) > 8) return;
    if (Math.abs(strip.scrollLeft - downScroll) > 8) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el.tagName === 'CANVAS') el = el.previousElementSibling; // paused GIF still
    if (el && (el.tagName === 'IMG' || el.tagName === 'VIDEO') && strip.contains(el)) open(el);
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

    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('is-focus', en.isIntersecting);
        if (en.isIntersecting) activate(en.target);
      });
    }, { root: list, threshold: 0.75 });
    items.forEach(function (it) { io.observe(it); });
  });

  /* Cursor proximity scaling: cards in every snap row breathe together —
     each grows toward the pointer (fall-off spans several cards), eased so
     the field settles without overlaps. */
  if (snapLists.length && matchMedia('(hover: hover)').matches && !reduceMotion()) {
    var sx = null, sy = null;
    window.addEventListener('pointermove', function (e) { sx = e.clientX; sy = e.clientY; }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { sx = sy = null; });

    function snapLoop() {
      snapLists.forEach(function (cfg) {
        cfg.els.forEach(function (el) {
          var media = el.querySelectorAll('img, video');
          for (var j = 0; j < media.length; j++) {
            var m = media[j];
            if (m.classList.contains('no-zoom')) continue;
            var r = m.getBoundingClientRect();
            if (r.right < 0 || r.left > window.innerWidth) continue;
            var cx = r.left + r.width / 2;
            var cy = r.top + r.height / 2;
            var fall = 0;
            if (sx !== null) {
              var dx = cx - sx, dy = cy - sy;
              fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (Math.max(r.width, 360) * 1.1));
              fall *= fall;
            }
            var cur = m._gs === undefined ? 1 : m._gs;
            cur += (1 + fall * cfg.cap * 3 - cur) * 0.12;
            m._gs = cur;
            m.style.transform = 'scale(' + cur.toFixed(3) + ')';
          }
        });
      });
      requestAnimationFrame(snapLoop);
    }
    requestAnimationFrame(snapLoop);
  }
})();

/* Product videos: autoplay muted while on screen; preload="metadata" ships
   the first frame so iOS paints a poster immediately instead of a black box,
   playback deferred until the card scrolls into view. Each plate gets a
   pause/play button; pausing holds until the visitor presses play again, and
   under reduced motion the clips start paused. */
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll('.work-plate--video video'));
  if (!vids.length) return;

  function play(v) { if (!v._held) v.play().catch(function () {}); }

  vids.forEach(function (v) {
    v._held = reduceMotion();
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
    v.parentNode.appendChild(b);
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
    status.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
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
