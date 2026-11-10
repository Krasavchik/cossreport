// Page-by-page report viewer (PDF.js legacy build, for older Safari too).
// Reads the PDF path from #viewer[data-pdf].
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/';
const viewer = document.getElementById('viewer');
const stage = document.getElementById('slide-stage');
const canvas = document.getElementById('slide-canvas');
const statusEl = document.getElementById('slide-status');
const prevBtn = document.getElementById('slide-prev');
const nextBtn = document.getElementById('slide-next');
const countEl = document.getElementById('slide-count');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const PDF_URL = viewer.dataset.pdf;

const yearEl = document.getElementById('y');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Full screen (iOS Safari can't full-screen an element: open the PDF instead)
const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);

function toggleFullscreen() {
  if (isIOSSafari) {
    window.open(PDF_URL, '_blank');
    return;
  }
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (viewer.requestFullscreen) {
      viewer.requestFullscreen().catch(err => {
        console.log('Fullscreen failed:', err);
        window.open(PDF_URL, '_blank');
      });
    } else if (viewer.webkitRequestFullscreen) {
      viewer.webkitRequestFullscreen();
    } else if (viewer.msRequestFullscreen) {
      viewer.msRequestFullscreen();
    } else {
      window.open(PDF_URL, '_blank');
    }
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}
fullscreenBtn.addEventListener('click', toggleFullscreen);

let pdf = null, current = 1, renderSeq = 0, task = null;

function fail(err) {
  console.error('Report viewer:', err);
  statusEl.hidden = false;
  statusEl.innerHTML = '<a href="' + PDF_URL + '" target="_blank" rel="noopener">Open the report (PDF)</a>';
}

async function render() {
  if (!pdf) return;
  const seq = ++renderSeq;
  const page = await pdf.getPage(current);
  if (seq !== renderSeq) return;
  const box = stage.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const base = page.getViewport({ scale: 1 });
  const fit = Math.min(box.width / base.width, box.height / base.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const viewport = page.getViewport({ scale: fit * dpr });
  // Render off-screen, then swap in, so page turns don't flash
  const off = document.createElement('canvas');
  off.width = Math.floor(viewport.width);
  off.height = Math.floor(viewport.height);
  if (task) task.cancel();
  task = page.render({ canvasContext: off.getContext('2d'), viewport });
  try {
    await task.promise;
  } catch (e) {
    if (e && e.name === 'RenderingCancelledException') return;
    throw e;
  }
  if (seq !== renderSeq) return;
  canvas.width = off.width;
  canvas.height = off.height;
  canvas.style.width = Math.floor(base.width * fit) + 'px';
  canvas.style.height = Math.floor(base.height * fit) + 'px';
  canvas.getContext('2d').drawImage(off, 0, 0);
  statusEl.hidden = true;
}

function updateNav() {
  countEl.textContent = current + ' / ' + pdf.numPages;
  prevBtn.disabled = current <= 1;
  nextBtn.disabled = current >= pdf.numPages;
}

function go(n) {
  if (!pdf) return;
  const target = Math.max(1, Math.min(pdf.numPages, n));
  if (target === current) return;
  current = target;
  updateNav();
  render().catch(fail);
}

prevBtn.addEventListener('click', () => go(current - 1));
nextBtn.addEventListener('click', () => go(current + 1));

// Click the left third to go back, anywhere else to go forward
stage.addEventListener('click', (e) => {
  if (e.target.closest('button, a')) return;
  const r = stage.getBoundingClientRect();
  go(e.clientX - r.left < r.width * 0.3 ? current - 1 : current + 1);
});

// Swipe on touch screens
let touchX = null, touchY = null;
stage.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) { touchX = null; return; }
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
}, { passive: true });
stage.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  touchX = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? current + 1 : current - 1);
});

// Arrow keys (and presentation clickers) when the viewer is focused or full screen
document.addEventListener('keydown', (e) => {
  const fs = document.fullscreenElement || document.webkitFullscreenElement;
  if (fs !== viewer && !viewer.contains(document.activeElement)) return;
  if (e.altKey || e.ctrlKey || e.metaKey || !pdf) return;
  const step = { ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 }[e.key];
  if (step) { e.preventDefault(); go(current + step); }
  else if (e.key === 'Home') { e.preventDefault(); go(1); }
  else if (e.key === 'End') { e.preventDefault(); go(pdf.numPages); }
});

// Re-render sharply on resize and full screen
let raf = 0;
new ResizeObserver(() => {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => render().catch(fail));
}).observe(stage);

try {
  const pdfjsLib = await import(PDFJS + 'pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';
  pdf = await pdfjsLib.getDocument({ url: PDF_URL, isEvalSupported: false }).promise;
  updateNav();
  await render();
} catch (err) {
  fail(err);
}
