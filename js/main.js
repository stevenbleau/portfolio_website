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
   Touch/trackpad scroll natively (CSS overflow). Decorative, so clones are
   aria-hidden with the container; without JS it's a static scrollable strip. */
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
    tiles.forEach(function (t) { strip.appendChild(t.cloneNode(true)); });
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
  var last = null;

  strip.scrollLeft = pos;

  function rest(ms) { pausedUntil = performance.now() + ms; }

  var hero = strip.closest('.hero-collage');
  var brand = document.querySelector('.brand-float');
  /* Swipe/drag fades the hero type away and condenses the floating brand to
     just the logo. The dismissal holds while the visitor is in the gallery
     section; once they scroll past it and come back, the type is restored
     (until they swipe it away again). Clicking the floating brand restores it
     in place even when already at the top. */
  function browsing() {
    if (!hero) return;
    hero.classList.add('browsing');
    if (brand) brand.classList.add('is-condensed');
  }

  function reshown() {
    if (hero) hero.classList.remove('browsing');
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
  }
  window.addEventListener('scroll', restoreOnReturn, { passive: true });

  if (brand) {
    /* On touch there's no hover-out, so focus keeps the wordmark expanded after
       a tap until something else is clicked. Blur the link on activation: the
       next drag/scroll re-condenses it via .is-condensed. */
    brand.addEventListener('click', function () {
      reshown();
      brand.blur();
    });
  }

  var minBtn = document.querySelector('.typed-min');
  if (minBtn) {
    minBtn.addEventListener('click', function () {
      browsing();
      minBtn.blur();
    });
  }

  /* Cursor gravity: tiles grow and lean toward the pointer, scaled by how
     close they are to it along the strip. Eased every frame; off under
     reduced motion and on touch (no hover). */
  var hoverCap = matchMedia('(hover: hover)').matches;
  var px = null, py = null;
  var scales = [];

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
  }

  window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { px = py = null; });

  function frame(ts) {
    var auto = !reduce && !dragging && ts > pausedUntil;
    if (auto && last !== null) {
      pos += SPEED * Math.min(ts - last, 100) / 1000;
      strip.scrollLeft = pos;
    } else {
      pos = strip.scrollLeft;
    }
    last = ts;

    // seamless wrap, keeping any in-flight drag anchored
    if (strip.scrollLeft >= period * 2) {
      strip.scrollLeft -= period;
      pos -= period;
      startScroll -= period;
    } else if (strip.scrollLeft <= 0) {
      strip.scrollLeft += period;
      pos += period;
      startScroll += period;
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
  thumb.setAttribute('role', 'scrollbar');
  thumb.setAttribute('aria-label', 'Scroll the work gallery');
  thumb.setAttribute('aria-orientation', 'horizontal');
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
    strip.addEventListener(ev, function () { rest(2500); browsing(); }, { passive: true });
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

  requestAnimationFrame(frame);
})();

/* Gallery post modal: clicking a collage tile (without dragging) opens an
   Instagram-style post, shot on the left, caption on the right. Dismiss with
   the X, a click on the backdrop, or Escape. Captions keyed by collage file. */
(function () {
  var strip = document.querySelector('[data-collage]');
  if (!strip) return;

  var CAPTIONS = {
    '01': { t: 'Folded display stand', x: 'Accordion-plate display stand with machined wood inserts, retail-form and packaging studies.' },
    '02': { t: 'Telo Y-Cane', x: 'Telo\'s Y-Cane forearm crutch, the one public product. Ergonomic cuff, clamp, and shaft hardware.' },
    '03': { t: 'Performance eyewear', x: 'Shield-sunglasses development, rim studies in line work beside a true-color lens render.' },
    '04': { t: 'Two-wheeler concept', x: 'Early scooter exploration, marker render in the studio\'s blue-and-yellow palette.' },
    '05': { t: 'Pigeon grocery app', x: 'Pigeon grocery app concept, phone screens for pickup and delivery flows.' },
    '06': { t: 'Weekender duffel', x: 'Weekender bag, hardware, strap, and logo-placement study for a leathergoods line.' },
    '07': { t: 'Jig and printed assembly', x: 'Shop reality, a machined fixture beside a printed assembly from the same build cycle.' },
    '08': { t: 'Utility chassis', x: 'Modular off-road cart chassis, wheel, deck, and packaging study for a robotics platform.' },
    '09': { t: 'Wearable ring concept', x: 'Handheld wearable ring, proportion and grip exploration for a health device.' },
    '10': { t: 'Scooter concept', x: 'Yellow scooter concept, rough sketches beside the polished studio render.' },
    '11': { t: 'Cabin trailer', x: 'Enclosed cabin trailer on oversized wheels, packaging line study.' },
    '12': { t: 'Intake device', x: 'Shroud and impeller study for an airflow device, CFD-facing render.' },
    '13': { t: 'Mobility sketches', x: 'Scooter stance and volume studies, loose marker work.' },
    '14': { t: 'Studio scooter render', x: 'Final surfacing of the mobility concept in the studio render.' },
    '15': { t: 'Modular eyewear system', x: 'Eyewear system with speaker module, visor forms in sketch and render.' },
    '16': { t: 'Footwear form language', x: 'Footwear studies, sole and upper iterations.' },
    '17': { t: 'Cockpit sketch', x: 'Transportation interior study, seat architecture in line work.' },
    '18': { t: 'Auto front-end studies', x: 'Front-end design iterations, grille, surfacing, and proportion.' },
    '19': { t: 'Wellness device sketches', x: 'Wellness device exploration, charger, app, and product-form loops.' },
    '20': { t: 'Robot render', x: 'Robot hardware render, enclosure and packaging study from the R&D bench.' },
    '21': { t: 'Depth-sense test', x: 'Depth-sensing rig test, live depth capture from a sensing bring-up.' },
    '22': { t: 'Dotte motion', x: 'Dotte motion study, an animated brand/product loop from concept motion work.' }
  };

  function keyOf(src) {
    var m = /\/(\d{2})\.(?:webp|mp4|webm|mov)/.exec(src || '');
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
      if (!reduceMotion()) bigVid.play().catch(function () {});
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
    if (el && (el.tagName === 'IMG' || el.tagName === 'VIDEO') && strip.contains(el)) open(el);
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
    if (e.key === 'Escape' && !overlay.hidden) close();
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

/* Product videos: autoplay muted, but only while on screen and only when the
   visitor hasn't asked for reduced motion. preload="metadata" ships the first
   frame so iOS paints a poster immediately instead of a black box; playback
   is still deferred until the card scrolls into view. */
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll('.work-plate--video video'));
  if (!vids.length) return;

  function play(v) { if (!reduceMotion()) v.play().catch(function () {}); }

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
   controls. Autoplay ships in the markup; this only enforces reduced motion
   (hard-pause at frame zero) and nudges any tile the browser suspended. */
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll('.collage video'));
  if (!vids.length) return;
  if (reduceMotion()) {
    vids.forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
    return;
  }
  vids.forEach(function (v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  });
})();
