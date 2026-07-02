/* Lightbox for article images: click to enlarge, Escape / backdrop / × to close. */
(function () {
  'use strict';

  var css = [
    '.lb-btn { display: block; width: 100%; padding: 0; border: 0; background: none; position: relative; cursor: zoom-in; }',
    '.lb-btn img { width: 100%; }',
    '.lb-btn .lb-hint {',
    '  position: absolute; top: 10px; right: 10px;',
    '  width: 34px; height: 34px; border-radius: 8px;',
    '  display: flex; align-items: center; justify-content: center;',
    '  background: rgba(17, 24, 39, .6); color: #fff;',
    '  opacity: 0; transition: opacity .15s ease; pointer-events: none;',
    '}',
    '.lb-btn:hover .lb-hint, .lb-btn:focus-visible .lb-hint { opacity: 1; }',
    '.lb-overlay {',
    '  position: fixed; inset: 0; z-index: 1000;',
    '  display: flex; align-items: center; justify-content: center;',
    '  background: rgba(0, 0, 0, .85); padding: 24px; box-sizing: border-box;',
    '}',
    '.lb-overlay img {',
    '  max-width: min(1100px, 100%); max-height: 100%;',
    '  width: auto; height: auto; border-radius: 10px; background: #fff;',
    '}',
    '.lb-close {',
    '  position: absolute; top: 16px; right: 16px;',
    '  width: 40px; height: 40px; border: 0; border-radius: 50%;',
    '  display: flex; align-items: center; justify-content: center;',
    '  background: rgba(255, 255, 255, .12); color: #fff; cursor: pointer;',
    '}',
    '.lb-close:hover { background: rgba(255, 255, 255, .25); }',
    'body.lb-open { overflow: hidden; }'
  ].join('\n');

  var magnifierSvg =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>' +
    '<line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

  var closeSvg =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = null;
  var lastTrigger = null;

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.classList.remove('lb-open');
    document.removeEventListener('keydown', onKeydown);
    if (lastTrigger) lastTrigger.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function open(img, trigger) {
    lastTrigger = trigger;
    overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', img.alt || 'Enlarged image');

    var full = document.createElement('img');
    full.src = img.currentSrc || img.src;
    full.alt = img.alt || '';

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lb-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = closeSvg;

    overlay.appendChild(closeBtn);
    overlay.appendChild(full);
    overlay.addEventListener('click', function (e) {
      if (e.target !== full) close();
    });

    document.body.appendChild(overlay);
    document.body.classList.add('lb-open');
    document.addEventListener('keydown', onKeydown);
    closeBtn.focus();
  }

  document.querySelectorAll('article figure img').forEach(function (img) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lb-btn';
    btn.setAttribute('aria-label', 'Enlarge image');
    img.parentNode.insertBefore(btn, img);
    btn.appendChild(img);

    var hint = document.createElement('span');
    hint.className = 'lb-hint';
    hint.innerHTML = magnifierSvg;
    btn.appendChild(hint);

    btn.addEventListener('click', function () {
      open(img, btn);
    });
  });
})();
