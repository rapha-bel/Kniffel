'use strict';
/* Leichte Konfetti-Animation ohne Abhängigkeiten. Aufruf: window.celebrate() */
window.celebrate = function () {
  if (document.getElementById('confetti-canvas')) return;   // nicht stapeln
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth;
  let H = canvas.height = window.innerHeight;

  const colors = ['#c56a3d', '#d4a017', '#f6d365', '#a9502a', '#e6ac7d', '#5a6270'];
  const parts = Array.from({ length: 150 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.4,
    r: 5 + Math.random() * 7,
    c: colors[Math.random() * colors.length | 0],
    vx: -2 + Math.random() * 4,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
    rect: Math.random() < 0.5,
  }));

  const onResize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  window.addEventListener('resize', onResize);

  const start = performance.now();
  const DURATION = 2800;
  function frame(t) {
    const elapsed = t - start;
    ctx.clearRect(0, 0, W, H);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = elapsed > DURATION - 700 ? Math.max(0, (DURATION - elapsed) / 700) : 1;
      ctx.fillStyle = p.c;
      if (p.rect) ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
    if (elapsed < DURATION) requestAnimationFrame(frame);
    else cleanup();
  }
  function cleanup() {
    window.removeEventListener('resize', onResize);
    if (canvas.isConnected) canvas.remove();
  }
  requestAnimationFrame(frame);
  // Sicherheitsnetz: Canvas auch entfernen, falls rAF nie läuft (z.B. Tab im Hintergrund)
  setTimeout(cleanup, DURATION + 1000);
};
