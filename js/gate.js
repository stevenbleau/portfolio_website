/* Password gate for NDA'd case studies. Only loaded on gated pages.

   The page ships ciphertext in [data-enc]; the password derives the key in the
   browser via PBKDF2 + AES-GCM (WebCrypto). Nothing readable is in the source,
   so this is real protection, not a hidden div — it is exactly as strong as the
   password. Produce the blob with work/_archive/_tools/encrypt.py.

   Needs a secure context (https, or localhost) for crypto.subtle. */
(function () {
  var host = document.querySelector('[data-enc]');
  var form = document.querySelector('[data-gate]');
  if (!host || !form) return;

  var input = form.querySelector('input[type="password"]');
  var status = form.querySelector('[data-gate-status]');
  var ITERATIONS = 250000;

  if (!window.crypto || !crypto.subtle) {
    status.textContent = 'This browser can’t decrypt here (needs a secure connection).';
    return;
  }

  form.hidden = false;

  function bytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var password = input.value;
    if (!password) return;

    status.textContent = 'Checking…';

    var raw = bytes(host.getAttribute('data-enc').replace(/\s+/g, ''));
    var salt = raw.slice(0, 16);
    var iv = raw.slice(16, 28);
    var data = raw.slice(28);

    crypto.subtle
      .importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      })
      .then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
      })
      .then(function (plain) {
        // AES-GCM authenticates, so reaching here means the password was right.
        host.innerHTML = new TextDecoder().decode(plain);
        host.hidden = false;
        form.hidden = true;
        host.setAttribute('tabindex', '-1');
        host.focus();
      })
      .catch(function () {
        status.textContent = 'That password didn’t work.';
        input.select();
      });
  });
})();
