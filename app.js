'use strict';
(() => {
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ================= Math ================= */
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
};
const Q = {
  id: () => [0, 0, 0, 1],
  mul: (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]],
  norm: q => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; },
  fromAxis: (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; },
  rotate: (q, v) => {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
    return [ix * w - iw * x - iy * z + iz * y, iy * w - iw * y - iz * x + ix * z, iz * w - iw * z - ix * y + iy * x];
  },
  slerp: (a, b, t) => {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(x => -x); d = -d; }
    if (d > 0.9995) return Q.norm(a.map((x, i) => x + (b[i] - x) * t));
    const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return a.map((x, i) => x * wa + b[i] * wb);
  },
  between: (from, to) => {
    const d = V.dot(from, to);
    if (d > 0.99999) return Q.id();
    if (d < -0.99999) { let ax = V.cross([1, 0, 0], from); if (V.len(ax) < 1e-4) ax = V.cross([0, 0, 1], from); return Q.fromAxis(V.norm(ax), Math.PI); }
    const ax = V.cross(from, to); return Q.norm([ax[0], ax[1], ax[2], 1 + d]);
  }
};
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgbStr = (c, m, add) => `rgb(${clamp(c[0] * m + (add || 0), 0, 255) | 0},${clamp(c[1] * m + (add || 0), 0, 255) | 0},${clamp(c[2] * m + (add || 0), 0, 255) | 0})`;

/* ================= Coins ================= */
const dk = (hex, m) => rgbStr(hex2rgb(hex), m);
/* Coin designs — stylized vector renditions with embossed relief (not official reproductions) */
const GOLD = '#d2ad4e', SILVER = '#d6d8dd', COPPER = '#b9733f', NICKEL = '#c9cbd0';
const TEX = 640, CX = TEX / 2, RR = TEX / 2 - 6; // texture size, center, radius
const SERIF = 'Georgia, "Times New Roman", "Palatino", serif', SANS = '"Helvetica Neue", Arial, sans-serif';
const H = {
  arcText(c, txt, r, a0, a1, size, weight, font, spacingFix) {
    c.save(); c.font = `${weight || 700} ${size}px ${font || SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const n = txt.length, total = a1 - a0;
    for (let i = 0; i < n; i++) { const a = a0 + total * (i + 0.5) / n; c.save(); c.translate(CX + Math.cos(a) * r, CX + Math.sin(a) * r); c.rotate(a + Math.PI / 2 + (spacingFix ? Math.PI : 0)); c.fillText(txt[i], 0, 0); c.restore(); }
    c.restore();
  },
  arcTextBottom(c, txt, r, a0, a1, size, weight, font) { // reads left→right along the bottom arc
    c.save(); c.font = `${weight || 700} ${size}px ${font || SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const n = txt.length, total = a1 - a0;
    for (let i = 0; i < n; i++) { const a = a1 - total * (i + 0.5) / n; c.save(); c.translate(CX + Math.cos(a) * r, CX + Math.sin(a) * r); c.rotate(a - Math.PI / 2); c.fillText(txt[i], 0, 0); c.restore(); }
    c.restore();
  },
  text(c, txt, x, y, size, weight, font) { c.font = `${weight || 800} ${size}px ${font || SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y); },
  star(c, x, y, r, pts) {
    pts = pts || 5; c.beginPath();
    for (let i = 0; i < pts * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / pts, rr = i % 2 ? r * 0.4 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  },
  leaf(c, x, y, len, wid, ang) { c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -wid, len, 0); c.quadraticCurveTo(len * 0.5, wid, 0, 0); c.fill(); c.restore(); },
  wreath(c, x, y, r, side, n) { // laurel branch along an arc; side +1 = left, -1 = right
    n = n || 11; c.lineWidth = 4; c.lineCap = 'round';
    const a0 = side > 0 ? Math.PI * 0.55 : Math.PI * 0.45, a1 = side > 0 ? Math.PI * 1.42 : -Math.PI * 0.42;
    c.beginPath(); c.arc(x, y, r, a0, a1, side < 0); c.stroke();
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), a = a0 + (a1 - a0) * t, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, tangent = a + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      H.leaf(c, px, py, 30, 9, tangent + 0.55); H.leaf(c, px, py, 30, 9, tangent - 0.55);
    }
  },
  bead(c, r, n, size) { for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; c.beginPath(); c.arc(CX + Math.cos(a) * r, CX + Math.sin(a) * r, size, 0, Math.PI * 2); c.fill(); } },
  bust(c, x, y, s, style) { // stylized effigy: head in profile facing left + shoulders
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
    // shoulders / torso
    c.beginPath(); c.moveTo(-58, 62); c.quadraticCurveTo(-40, 28, -12, 22); c.lineTo(10, 22); c.quadraticCurveTo(52, 26, 62, 62); c.closePath(); c.fill();
    if (style === 'cardinal') { c.save(); c.globalCompositeOperation = 'destination-out'; c.fillRect(-9, 22, 10, 11); c.restore(); } // clerical collar
    if (style === 'ohiggins') { c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.moveTo(-14, 24); c.lineTo(-2, 40); c.lineTo(-24, 40); c.closePath(); c.fill(); c.restore(); c.beginPath(); c.arc(46, 40, 10, 0, Math.PI * 2); c.fill(); } // high collar + epaulette
    // neck
    c.beginPath(); c.moveTo(-12, 24); c.lineTo(-10, 4); c.lineTo(14, 2); c.lineTo(14, 24); c.closePath(); c.fill();
    // head
    c.beginPath(); c.moveTo(-8, 8);
    c.bezierCurveTo(-22, 6, -26, -6, -24, -14); // chin → jaw
    c.bezierCurveTo(-34, -16, -33, -24, -27, -26); // lips
    c.bezierCurveTo(-30, -30, -30, -34, -26, -36); // nose base
    c.bezierCurveTo(-36, -40, -34, -50, -27, -50); // nose
    c.bezierCurveTo(-30, -56, -28, -60, -24, -62); // brow
    c.bezierCurveTo(-18, -78, 10, -84, 24, -68); // forehead → crown
    c.bezierCurveTo(32, -58, 30, -40, 26, -28); // back of head
    c.bezierCurveTo(28, -14, 20, 0, 14, 4); c.closePath(); c.fill();
    if (style === 'mapuche') { // headband + braid
      c.save(); c.globalCompositeOperation = 'destination-out'; c.lineWidth = 3; c.beginPath(); c.moveTo(-26, -58); c.quadraticCurveTo(0, -66, 28, -58); c.stroke(); c.restore();
      c.beginPath(); c.moveTo(22, -50); c.quadraticCurveTo(40, -20, 30, 30); c.quadraticCurveTo(24, 40, 18, 30); c.quadraticCurveTo(26, -10, 14, -40); c.closePath(); c.fill();
    }
    if (style === 'cardinal') { c.save(); c.globalCompositeOperation = 'destination-out'; c.lineWidth = 2.5; c.beginPath(); c.arc(4, -68, 22, Math.PI * 1.15, Math.PI * 1.95); c.stroke(); c.restore(); } // zucchetto line
    if (style === 'queen') { c.beginPath(); c.moveTo(-6, -80); c.lineTo(2, -96); c.lineTo(10, -84); c.lineTo(18, -98); c.lineTo(24, -82); c.lineTo(30, -92); c.lineTo(30, -74); c.closePath(); c.fill(); }
    if (style === 'liberty') { c.beginPath(); c.moveTo(-10, -84); c.quadraticCurveTo(10, -100, 26, -80); c.quadraticCurveTo(14, -90, -4, -80); c.closePath(); c.fill(); } // cap
    // eye (cut out)
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.ellipse(-12, -46, 4.5, 2.5, -0.2, 0, Math.PI * 2); c.fill(); c.restore();
    c.restore();
  },
  chileShield(c, x, y, s) { // shield with star, plume, huemul (left) and condor (right) — simplified
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
    c.beginPath(); c.moveTo(-30, -26); c.lineTo(30, -26); c.lineTo(30, 6); c.quadraticCurveTo(30, 30, 0, 40); c.quadraticCurveTo(-30, 30, -30, 6); c.closePath(); c.fill();
    c.save(); c.globalCompositeOperation = 'destination-out'; c.fillRect(-30, 4, 60, 3); H.star(c, 0, -10, 12); c.restore();
    // plume
    for (let i = -1; i <= 1; i++) { H.leaf(c, i * 12, -28, 26, 6, -Math.PI / 2 + i * 0.35); }
    // huemul (deer) left
    c.beginPath(); c.ellipse(-52, 8, 18, 10, 0.2, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(-66, -8, 7, 6, 0, 0, Math.PI * 2); c.fill();
    c.lineWidth = 3; c.beginPath(); c.moveTo(-68, -12); c.lineTo(-74, -26); c.moveTo(-64, -13); c.lineTo(-62, -26); c.stroke();
    [-60, -52, -44, -38].forEach((lx, i) => { c.beginPath(); c.moveTo(lx, 14); c.lineTo(lx + (i % 2 ? 2 : -2), 34); c.stroke(); });
    // condor right
    c.beginPath(); c.ellipse(52, 8, 16, 11, -0.2, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(64, -8, 6, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(40, 0); c.quadraticCurveTo(46, -34, 82, -30); c.quadraticCurveTo(60, -22, 56, 2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(68, -8); c.lineTo(76, -5); c.lineTo(68, -3); c.closePath(); c.fill();
    // motto banner
    c.fillRect(-46, 46, 92, 12); c.save(); c.globalCompositeOperation = 'destination-out'; H.text(c, 'POR LA RAZON O LA FUERZA', 0, 52, 8, 700, SANS); c.restore();
    c.restore();
  },
  eagle(c, x, y, s) { // heraldic eagle, wings spread
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
    const wing = dir => { c.beginPath(); c.moveTo(0, -10); c.bezierCurveTo(dir * 20, -40, dir * 70, -50, dir * 96, -28); c.bezierCurveTo(dir * 90, -22, dir * 84, -16, dir * 78, -10); c.bezierCurveTo(dir * 82, -6, dir * 84, 0, dir * 70, 4); c.bezierCurveTo(dir * 72, 10, dir * 66, 14, dir * 52, 14); c.bezierCurveTo(dir * 40, 18, dir * 30, 20, dir * 10, 16); c.closePath(); c.fill(); };
    wing(1); wing(-1);
    c.beginPath(); c.ellipse(0, 8, 16, 26, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(0, -26, 11, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(8, -28); c.lineTo(22, -24); c.lineTo(9, -20); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-14, 30); c.lineTo(14, 30); c.lineTo(20, 52); c.lineTo(-20, 52); c.closePath(); c.fill(); // tail
    c.lineWidth = 4; [-10, 10].forEach(lx => { c.beginPath(); c.moveTo(lx, 32); c.lineTo(lx * 1.6, 48); c.stroke(); });
    c.restore();
  },
  sunFace(c, x, y, r, rays) { // Sun of May
    rays = rays || 32; c.beginPath(); c.arc(x, y, r * 0.48, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < rays; i++) { const a = i * Math.PI * 2 / rays, wavy = i % 2; c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(r * 0.5, -r * 0.06); if (wavy) { c.quadraticCurveTo(r * 0.75, -r * 0.14, r, 0); c.quadraticCurveTo(r * 0.75, r * 0.14, r * 0.5, r * 0.06); } else { c.lineTo(r, 0); c.lineTo(r * 0.5, r * 0.06); } c.closePath(); c.fill(); c.restore(); }
    c.save(); c.globalCompositeOperation = 'destination-out'; c.lineWidth = r * 0.04; c.beginPath(); c.arc(x - r * 0.16, y - r * 0.1, r * 0.05, 0, Math.PI * 2); c.arc(x + r * 0.16, y - r * 0.1, r * 0.05, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(x - r * 0.06, y - r * 0.12); c.quadraticCurveTo(x - r * 0.14, y + r * 0.02, x - r * 0.04, y + r * 0.06); c.stroke(); c.beginPath(); c.arc(x, y + r * 0.14, r * 0.16, 0.25, Math.PI - 0.25); c.stroke(); c.restore();
  },
  sakura(c, x, y, r) { for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; c.save(); c.translate(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); c.rotate(a); c.beginPath(); c.moveTo(-r * 0.5, 0); c.quadraticCurveTo(-r * 0.2, -r * 0.42, r * 0.36, -r * 0.16); c.lineTo(r * 0.5, 0); c.lineTo(r * 0.36, r * 0.16); c.quadraticCurveTo(-r * 0.2, r * 0.42, -r * 0.5, 0); c.fill(); c.restore(); } c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(x, y, r * 0.14, 0, Math.PI * 2); c.fill(); c.restore(); },
  cactusEagle(c, x, y, s) { // Mexican eagle on nopal with serpent — simplified
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(i * 22, 50 - Math.abs(i) * 6, 12, 22, i * 0.25, 0, Math.PI * 2); c.fill(); }
    c.beginPath(); c.ellipse(-4, 4, 20, 30, 0.3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(6, -14); c.bezierCurveTo(30, -60, 60, -50, 70, -30); c.bezierCurveTo(50, -30, 36, -14, 16, 4); c.closePath(); c.fill();
    c.beginPath(); c.arc(-20, -26, 10, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(-28, -28); c.lineTo(-42, -22); c.lineTo(-28, -20); c.closePath(); c.fill();
    c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-40, -20); c.quadraticCurveTo(-60, 0, -44, 18); c.quadraticCurveTo(-30, 30, -50, 40); c.stroke();
    c.restore();
  },
  frog(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.beginPath(); c.ellipse(0, 0, 40, 26, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(-36, -14, 16, 12, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(-42, -22, 5, 0, Math.PI * 2); c.fill(); c.lineWidth = 8; c.lineCap = 'round'; [[-20, 18, -46, 40], [22, 18, 52, 34], [30, -8, 60, -26], [-14, -20, -30, -44]].forEach(l => { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); }); c.restore(); },
  vicuna(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.beginPath(); c.ellipse(0, 10, 30, 16, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(-22, 0); c.lineTo(-30, -44); c.stroke(); c.beginPath(); c.ellipse(-32, -50, 10, 7, -0.3, 0, Math.PI * 2); c.fill(); c.lineWidth = 6; [[-18, 22, -20, 48], [-6, 24, -8, 48], [8, 24, 10, 48], [20, 22, 24, 48]].forEach(l => { c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); }); c.restore(); },
  cornucopia(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(-30, 30); c.quadraticCurveTo(10, 40, 26, 0); c.quadraticCurveTo(34, -24, 14, -30); c.stroke(); for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(-30 + Math.cos(i) * 14, 30 + Math.sin(i * 1.7) * 12, 7, 0, Math.PI * 2); c.fill(); } c.restore(); },
  tree(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.fillRect(-5, 0, 10, 40); c.beginPath(); c.arc(0, -10, 28, 0, Math.PI * 2); c.arc(-18, 4, 18, 0, Math.PI * 2); c.arc(18, 4, 18, 0, Math.PI * 2); c.fill(); c.restore(); },
  europe(c, x, y, s) { // very rough continent outline
    c.save(); c.translate(x, y); c.scale(s / 100, s / 100); c.beginPath(); c.moveTo(-60, 40); c.lineTo(-40, 10); c.lineTo(-56, -6); c.lineTo(-30, -20); c.lineTo(-20, -50); c.lineTo(0, -70); c.lineTo(20, -60); c.lineTo(16, -30); c.lineTo(50, -40); c.lineTo(70, -10); c.lineTo(60, 20); c.lineTo(30, 30); c.lineTo(30, 56); c.lineTo(10, 40); c.lineTo(-20, 60); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-30, -60); c.lineTo(-10, -84); c.lineTo(-4, -60); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-70, -10); c.lineTo(-60, -30); c.lineTo(-52, -12); c.closePath(); c.fill(); c.restore();
  },
  rose(c, x, y, r) { for (let k = 0; k < 2; k++) for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + k * Math.PI / 5, rr = k ? r * 0.55 : r; c.beginPath(); c.ellipse(x + Math.cos(a) * rr * 0.55, y + Math.sin(a) * rr * 0.55, rr * 0.5, rr * 0.34, a, 0, Math.PI * 2); c.fill(); } },
};
const COINS = [
  { id: 'cl500', name: '500 pesos', country: 'Chile', flag: '🇨🇱', outer: GOLD, inner: SILVER, innerR: 0.7, thick: 0.17, size: 1.0, ttext: 'sello', reeded: false,
    heads(c) { H.bust(c, CX + 8, CX + 30, 210, 'cardinal'); H.arcText(c, 'REPUBLICA DE CHILE', RR * 0.83, Math.PI * 1.12, Math.PI * 1.88, 40); H.arcTextBottom(c, 'CARDENAL RAUL SILVA HENRIQUEZ', RR * 0.83, Math.PI * 0.12, Math.PI * 0.88, 24); },
    tails(c) { H.chileShield(c, CX, CX - 95, 105); H.text(c, '500', CX, CX + 55, 120, 800, SANS); H.text(c, 'PESOS', CX, CX + 130, 38, 700, SANS); H.text(c, '2024', CX, CX + 185, 26, 700, SANS); H.wreath(c, CX, CX, RR * 0.84, 1, 9); H.wreath(c, CX, CX, RR * 0.84, -1, 9); } },
  { id: 'cl100', name: '100 pesos', country: 'Chile', flag: '🇨🇱', outer: SILVER, inner: GOLD, innerR: 0.7, thick: 0.17, size: 0.95, ttext: 'sello', reeded: false,
    heads(c) { H.bust(c, CX + 8, CX + 30, 210, 'mapuche'); H.arcText(c, 'REPUBLICA DE CHILE', RR * 0.83, Math.PI * 1.12, Math.PI * 1.88, 40); H.arcTextBottom(c, 'PUEBLOS ORIGINARIOS', RR * 0.83, Math.PI * 0.16, Math.PI * 0.84, 26); },
    tails(c) { H.chileShield(c, CX, CX - 95, 105); H.text(c, '100', CX, CX + 55, 120, 800, SANS); H.text(c, 'PESOS', CX, CX + 130, 38, 700, SANS); H.text(c, '2023', CX, CX + 185, 26, 700, SANS); H.wreath(c, CX, CX, RR * 0.84, 1, 9); H.wreath(c, CX, CX, RR * 0.84, -1, 9); } },
  { id: 'cl10', name: '10 pesos', country: 'Chile', flag: '🇨🇱', outer: GOLD, inner: null, thick: 0.14, size: 0.82, ttext: 'sello', reeded: true,
    heads(c) { H.bust(c, CX + 8, CX + 30, 215, 'ohiggins'); H.arcText(c, 'REPUBLICA DE CHILE', RR * 0.83, Math.PI * 1.12, Math.PI * 1.88, 40); H.arcTextBottom(c, 'LIBERTADOR B. O\'HIGGINS', RR * 0.83, Math.PI * 0.14, Math.PI * 0.86, 26); },
    tails(c) { H.text(c, '10', CX, CX - 30, 200, 800, SANS); H.text(c, 'PESOS', CX, CX + 95, 44, 700, SANS); H.star(c, CX, CX - 190, 26); H.text(c, '2022', CX, CX + 175, 28, 700, SANS); H.wreath(c, CX, CX, RR * 0.84, 1, 9); H.wreath(c, CX, CX, RR * 0.84, -1, 9); } },
  { id: 'usq', name: 'Quarter dollar', country: 'Estados Unidos', flag: '🇺🇸', outer: NICKEL, inner: null, thick: 0.14, size: 0.95, ttext: 'cruz', reeded: true, photo: { heads: 'img/usq_h.jpg', tails: 'img/usq_t.jpg' }, credit: 'Anverso: United States Mint (dominio público). Reverso: Wikimedia Commons, CC BY-SA 3.0.',
    heads(c) { H.bust(c, CX + 10, CX + 40, 215, 'liberty'); H.arcText(c, 'LIBERTY', RR * 0.83, Math.PI * 1.3, Math.PI * 1.7, 46); H.text(c, 'IN GOD', CX - 170, CX - 40, 22, 700, SANS); H.text(c, 'WE TRUST', CX - 170, CX - 14, 22, 700, SANS); H.arcTextBottom(c, '1998', RR * 0.83, Math.PI * 0.4, Math.PI * 0.6, 34); },
    tails(c) { H.eagle(c, CX, CX - 10, 190); H.arcText(c, 'UNITED STATES OF AMERICA', RR * 0.84, Math.PI * 1.1, Math.PI * 1.9, 30); H.arcTextBottom(c, 'QUARTER DOLLAR', RR * 0.84, Math.PI * 0.22, Math.PI * 0.78, 32); H.text(c, 'E PLURIBUS UNUM', CX, CX - 150, 16, 700, SANS); } },
  { id: 'eur1', name: '1 euro', country: 'Unión Europea', flag: '🇪🇺', outer: NICKEL, inner: GOLD, innerR: 0.7, thick: 0.15, size: 0.92, ttext: 'cruz', reeded: false, photo: { heads: 'img/eur1_h.jpg' }, credit: 'Cara común: foto de Wikimedia Commons, CC BY 2.0. Cara nacional: ilustración.',
    heads(c) { H.europe(c, CX + 60, CX + 10, 150); H.text(c, '1', CX - 150, CX - 20, 200, 800, SANS); H.text(c, 'EURO', CX - 120, CX + 110, 40, 700, SANS); for (let i = 0; i < 6; i++) { c.fillRect(CX - 250, CX - 60 + i * 26, 70, 5); } for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; H.star(c, CX + Math.cos(a) * RR * 0.86, CX + Math.sin(a) * RR * 0.86, 14); } },
    tails(c) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; H.star(c, CX + Math.cos(a) * RR * 0.86, CX + Math.sin(a) * RR * 0.86, 15); } H.bust(c, CX + 8, CX + 40, 200, 'queen'); H.text(c, '2002', CX - 160, CX + 130, 30, 700, SANS); } },
  { id: 'gbp1', name: '1 pound', country: 'Reino Unido', flag: '🇬🇧', outer: GOLD, inner: NICKEL, innerR: 0.66, thick: 0.17, size: 0.9, sides: 12, ttext: 'cruz', reeded: false,
    heads(c) { H.bust(c, CX + 8, CX + 40, 200, 'queen'); H.arcText(c, 'ELIZABETH II · D · G · REG · F · D · 2017', RR * 0.84, Math.PI * 1.02, Math.PI * 1.98, 26); },
    tails(c) { H.rose(c, CX - 60, CX - 40, 60); H.leaf(c, CX + 20, CX - 90, 90, 22, 0.5); H.leaf(c, CX + 20, CX - 90, 90, 22, 1.2); H.sakura(c, CX + 70, CX + 60, 60); H.leaf(c, CX - 90, CX + 60, 80, 26, 2.2); H.arcTextBottom(c, 'ONE POUND', RR * 0.84, Math.PI * 0.25, Math.PI * 0.75, 38); } },
  { id: 'mx10', name: '10 pesos', country: 'México', flag: '🇲🇽', outer: GOLD, inner: NICKEL, innerR: 0.66, thick: 0.17, size: 0.98, ttext: 'cruz', reeded: false,
    heads(c) { H.cactusEagle(c, CX, CX - 10, 150); H.arcText(c, 'ESTADOS UNIDOS MEXICANOS', RR * 0.84, Math.PI * 1.06, Math.PI * 1.94, 30); H.wreath(c, CX, CX + 10, RR * 0.6, 1, 7); H.wreath(c, CX, CX + 10, RR * 0.6, -1, 7); },
    tails(c) { for (let i = 0; i < 20; i++) { c.save(); c.translate(CX, CX - 10); c.rotate(i * Math.PI / 10); c.beginPath(); c.moveTo(150, -14); c.lineTo(205, 0); c.lineTo(150, 14); c.closePath(); c.fill(); c.restore(); } c.beginPath(); c.arc(CX, CX - 10, 150, 0, Math.PI * 2); c.arc(CX, CX - 10, 120, 0, Math.PI * 2, true); c.fill(); c.beginPath(); c.arc(CX, CX - 10, 95, 0, Math.PI * 2); c.arc(CX, CX - 10, 75, 0, Math.PI * 2, true); c.fill(); H.text(c, '$10', CX, CX - 10, 60, 800, SANS); H.text(c, 'DIEZ PESOS', CX, CX + 200, 28, 700, SANS); } },
  { id: 'ar1', name: '1 peso', country: 'Argentina', flag: '🇦🇷', outer: NICKEL, inner: GOLD, innerR: 0.66, thick: 0.16, size: 0.9, ttext: 'cruz', reeded: false,
    heads(c) { H.sunFace(c, CX, CX, 150, 32); H.arcText(c, 'REPUBLICA ARGENTINA', RR * 0.84, Math.PI * 1.1, Math.PI * 1.9, 32); H.arcTextBottom(c, 'EN UNION Y LIBERTAD', RR * 0.84, Math.PI * 0.14, Math.PI * 0.86, 28); },
    tails(c) { H.text(c, '1', CX, CX - 30, 230, 800, SANS); H.text(c, 'PESO', CX, CX + 110, 52, 700, SANS); H.text(c, '1995', CX, CX + 185, 28, 700, SANS); H.wreath(c, CX, CX, RR * 0.84, 1, 9); H.wreath(c, CX, CX, RR * 0.84, -1, 9); } },
  { id: 'jp100', name: '100 yen', country: 'Japón', flag: '🇯🇵', outer: NICKEL, inner: null, thick: 0.13, size: 0.88, ttext: 'cruz', reeded: true, photo: { heads: 'img/jp100_h.jpg', tails: 'img/jp100_t.jpg' }, credit: 'Fotos: Wikimedia Commons, dominio público.',
    heads(c) { H.sakura(c, CX - 90, CX - 40, 70); H.sakura(c, CX + 90, CX - 40, 70); H.sakura(c, CX, CX + 70, 70); H.leaf(c, CX - 40, CX + 10, 60, 14, 2.6); H.leaf(c, CX + 40, CX + 10, 60, 14, 0.5); H.text(c, '日本国', CX, CX - 190, 50, 700, 'sans-serif'); H.text(c, '百円', CX, CX + 195, 50, 700, 'sans-serif'); },
    tails(c) { H.text(c, '100', CX, CX - 20, 210, 800, SANS); H.text(c, '平成 30 年', CX, CX + 130, 44, 700, 'sans-serif'); c.beginPath(); c.arc(CX, CX, RR * 0.9, 0, Math.PI * 2); c.arc(CX, CX, RR * 0.86, 0, Math.PI * 2, true); c.fill(); } },
  { id: 'br1', name: '1 real', country: 'Brasil', flag: '🇧🇷', outer: NICKEL, inner: GOLD, innerR: 0.64, thick: 0.16, size: 0.92, ttext: 'cruz', reeded: false, photo: { heads: 'img/br1_h.jpg', tails: 'img/br1_t.jpg' }, credit: 'Fotos: Wikimedia Commons, dominio público.',
    heads(c) { H.bust(c, CX + 8, CX + 40, 200, 'liberty'); H.arcText(c, 'BRASIL', RR * 0.84, Math.PI * 1.3, Math.PI * 1.7, 52); for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; H.star(c, CX + Math.cos(a) * RR * 0.88, CX + Math.sin(a) * RR * 0.88, 7); } },
    tails(c) { H.text(c, '1', CX - 40, CX - 20, 240, 800, SANS); H.text(c, 'REAL', CX + 60, CX + 120, 52, 700, SANS); c.lineWidth = 6; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(CX + 60, CX - 200 + i * 30); c.lineTo(CX + 200, CX - 200 + i * 30); c.stroke(); } H.text(c, '2019', CX - 150, CX + 150, 28, 700, SANS); } },
  { id: 'pe1', name: '1 sol', country: 'Perú', flag: '🇵🇪', outer: NICKEL, inner: null, thick: 0.15, size: 0.9, ttext: 'cruz', reeded: true,
    heads(c) { c.beginPath(); c.moveTo(CX - 90, CX - 110); c.lineTo(CX + 90, CX - 110); c.lineTo(CX + 90, CX + 20); c.quadraticCurveTo(CX + 90, CX + 90, CX, CX + 120); c.quadraticCurveTo(CX - 90, CX + 90, CX - 90, CX + 20); c.closePath(); c.fill(); c.save(); c.globalCompositeOperation = 'destination-out'; H.vicuna(c, CX - 45, CX - 60, 55); H.tree(c, CX + 45, CX - 70, 55); H.cornucopia(c, CX, CX + 55, 60); c.restore(); H.wreath(c, CX, CX + 10, RR * 0.7, 1, 8); H.wreath(c, CX, CX + 10, RR * 0.7, -1, 8); H.arcText(c, 'BANCO CENTRAL DE RESERVA DEL PERU', RR * 0.86, Math.PI * 1.04, Math.PI * 1.96, 24); },
    tails(c) { H.text(c, 'S/', CX - 100, CX - 10, 90, 700, SANS); H.text(c, '1', CX + 50, CX - 20, 230, 800, SANS); H.text(c, 'UN SOL', CX, CX + 130, 46, 700, SANS); H.text(c, '2021', CX, CX + 190, 26, 700, SANS); H.wreath(c, CX, CX, RR * 0.84, 1, 9); H.wreath(c, CX, CX, RR * 0.84, -1, 9); } },
  { id: 'co500', name: '500 pesos', country: 'Colombia', flag: '🇨🇴', outer: GOLD, inner: NICKEL, innerR: 0.66, thick: 0.16, size: 0.92, ttext: 'cruz', reeded: false, photo: { tails: 'img/co500_t.jpg' }, credit: 'Reverso: foto de Wikimedia Commons, CC BY-SA 4.0. Anverso: ilustración.',
    heads(c) { H.frog(c, CX, CX + 10, 130); H.arcText(c, 'REPUBLICA DE COLOMBIA', RR * 0.84, Math.PI * 1.08, Math.PI * 1.92, 30); H.arcTextBottom(c, 'RANA DE CRISTAL', RR * 0.84, Math.PI * 0.2, Math.PI * 0.8, 24); },
    tails(c) { H.text(c, '500', CX, CX - 20, 190, 800, SANS); H.text(c, 'PESOS', CX, CX + 110, 46, 700, SANS); H.text(c, '2016', CX, CX + 180, 28, 700, SANS); c.beginPath(); c.arc(CX, CX, RR * 0.9, 0, Math.PI * 2); c.arc(CX, CX, RR * 0.87, 0, Math.PI * 2, true); c.fill(); } },
];
const coinTex = {}, photoCache = {};
function photoSrc(coin, side) { // user photo (localStorage) > bundled photo > null
  try { const u = localStorage.getItem('moneda_photo_' + coin.id + '_' + side); if (u) return u; } catch (e) { }
  return coin.photo && coin.photo[side] || null;
}
function loadPhoto(src) {
  if (photoCache[src]) return photoCache[src];
  const im = new Image(); im.onload = () => { im.ready = true; Object.keys(coinTex).forEach(k => delete coinTex[k]); onTexReload(); }; im.src = src;
  photoCache[src] = im; return im;
}
let onTexReload = () => { };
function drawPhotoFace(c, img) {
  c.save(); c.beginPath(); c.arc(CX, CX, RR, 0, Math.PI * 2); c.clip();
  c.drawImage(img, 0, 0, TEX, TEX);
  // subtle rim shading so the photo reads as a solid disc
  const g = c.createRadialGradient(CX, CX, RR * 0.9, CX, CX, RR); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); c.fillStyle = g; c.fillRect(0, 0, TEX, TEX);
  c.restore();
}
function buildTex(coin) {
  if (coinTex[coin.id]) return coinTex[coin.id];
  const mk = side => {
    const cv = document.createElement('canvas'); cv.width = TEX; cv.height = TEX; const c = cv.getContext('2d');
    const src = photoSrc(coin, side);
    if (src) { const img = loadPhoto(src); if (img.ready || img.complete && img.naturalWidth) { drawPhotoFace(c, img); return cv; } }
    c.beginPath(); c.arc(CX, CX, RR, 0, Math.PI * 2); c.clip();
    const metal = (col, r, brushed) => {
      const g = c.createRadialGradient(CX - r * 0.35, CX - r * 0.4, r * 0.05, CX, CX, r * 1.05);
      g.addColorStop(0, dk(col, 1.18)); g.addColorStop(0.45, col); g.addColorStop(0.8, dk(col, 0.9)); g.addColorStop(1, dk(col, 0.72));
      c.beginPath(); c.arc(CX, CX, r, 0, Math.PI * 2); c.fillStyle = g; c.fill();
      if (brushed) { c.save(); c.beginPath(); c.arc(CX, CX, r, 0, Math.PI * 2); c.clip(); c.globalAlpha = 0.08; for (let k = 0; k < 90; k++) { c.beginPath(); c.arc(CX, CX, r * (k / 90), 0, Math.PI * 2); c.strokeStyle = k & 1 ? '#fff' : '#000'; c.lineWidth = 1; c.stroke(); } c.restore(); }
    };
    metal(coin.outer, RR, true);
    // raised rim + beading
    c.fillStyle = dk(coin.outer, 0.72); c.beginPath(); c.arc(CX, CX, RR, 0, Math.PI * 2); c.arc(CX, CX, RR - 12, 0, Math.PI * 2, true); c.fill();
    c.fillStyle = dk(coin.outer, 1.22); c.beginPath(); c.arc(CX, CX, RR - 12, 0, Math.PI * 2); c.arc(CX, CX, RR - 18, 0, Math.PI * 2, true); c.fill();
    if (coin.inner) {
      const r = RR * coin.innerR; metal(coin.inner, r, true);
      c.fillStyle = dk(coin.outer, 0.62); c.beginPath(); c.arc(CX, CX, r + 3, 0, Math.PI * 2); c.arc(CX, CX, r - 1, 0, Math.PI * 2, true); c.fill();
    } else { c.fillStyle = dk(coin.outer, 0.8); H.bead(c, RR - 26, 110, 2.6); }
    // design drawn on a mask, then composited as embossed relief
    const mask = document.createElement('canvas'); mask.width = TEX; mask.height = TEX; const m = mask.getContext('2d');
    m.fillStyle = '#000'; m.strokeStyle = '#000'; coin[side](m);
    const relief = (dx, dy, color, alpha) => { c.save(); c.globalAlpha = alpha; c.globalCompositeOperation = 'source-over'; const t = document.createElement('canvas'); t.width = TEX; t.height = TEX; const tc = t.getContext('2d'); tc.drawImage(mask, dx, dy); tc.globalCompositeOperation = 'source-in'; tc.fillStyle = color; tc.fillRect(0, 0, TEX, TEX); c.drawImage(t, 0, 0); c.restore(); };
    relief(3.5, 4, '#000', 0.55); relief(-2, -2.5, '#fff', 0.6);
    // raised surface tone: same metal, a touch lighter, with a directional sheen
    const top = document.createElement('canvas'); top.width = TEX; top.height = TEX; const tc = top.getContext('2d');
    const base = coin.inner && side ? coin.inner : coin.outer;
    const sg = tc.createLinearGradient(0, 0, TEX, TEX); sg.addColorStop(0, dk(coin.inner || coin.outer, 1.35)); sg.addColorStop(0.5, dk(coin.inner || coin.outer, 1.12)); sg.addColorStop(1, dk(coin.inner || coin.outer, 0.8));
    tc.fillStyle = sg; tc.fillRect(0, 0, TEX, TEX);
    if (coin.inner) { // outer-ring lettering keeps the ring's metal
      const r = RR * coin.innerR; const og = tc.createLinearGradient(0, 0, TEX, TEX); og.addColorStop(0, dk(coin.outer, 1.35)); og.addColorStop(1, dk(coin.outer, 0.8)); tc.fillStyle = og; tc.beginPath(); tc.arc(CX, CX, RR, 0, Math.PI * 2); tc.arc(CX, CX, r, 0, Math.PI * 2, true); tc.fill();
    }
    tc.globalCompositeOperation = 'destination-in'; tc.drawImage(mask, 0, 0);
    c.drawImage(top, 0, 0);
    // global specular sweep
    c.save(); const hl = c.createLinearGradient(0, 0, TEX, TEX); hl.addColorStop(0, 'rgba(255,255,255,0.22)'); hl.addColorStop(0.42, 'rgba(255,255,255,0)'); hl.addColorStop(0.6, 'rgba(0,0,0,0)'); hl.addColorStop(1, 'rgba(0,0,0,0.2)'); c.fillStyle = hl; c.fillRect(0, 0, TEX, TEX); c.restore();
    return cv;
  };
  coinTex[coin.id] = { heads: mk('heads'), tails: mk('tails') }; return coinTex[coin.id];
}

/* ================= Config ================= */
const TABLES = {
  verde: { c: '#237a44', e: '#0c3a1f', rim: '#5a3a1e', rim2: '#3b2411', name: 'Fieltro bosque' },
  medianoche: { c: '#1c2a4a', e: '#080c1a', rim: '#2a2a30', rim2: '#121216', name: 'Fieltro medianoche' },
  burdeo: { c: '#7a2430', e: '#3c0f16', rim: '#3a2416', rim2: '#20130a', name: 'Fieltro burdeo' },
  madera: { c: '#a06a3a', e: '#5a3618', rim: '#2b2b2b', rim2: '#151515', name: 'Madera' },
  marmol: { c: '#e8e4dc', e: '#a9a39a', rim: '#3a3a40', rim2: '#1b1b1f', name: 'Mármol' },
  pizarra: { c: '#4a505a', e: '#22262d', rim: '#1a1c20', rim2: '#0e0f11', name: 'Pizarra' },
};
const DEFAULT_CFG = { sound: true, shake: false, haptic: true, table: 'verde', power: 1, theme: null, coin: 'cl500', n: 1, tailsName: 'sello', eco: false, view: 'persp' };
let cfg = Object.assign({}, DEFAULT_CFG);
const LS = {
  get(k, d) { try { const v = localStorage.getItem('moneda_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('moneda_' + k, JSON.stringify(v)); } catch (e) { } }
};
cfg = Object.assign(cfg, LS.get('cfg', {}));
const tailsName = () => cfg.tailsName === 'cruz' ? 'Cruz' : 'Sello';

/* ================= Audio ================= */
let actx = null, noiseBuf = null;
function audioInit() {
  if (actx || !cfg.sound) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const len = actx.sampleRate * 0.25; noiseBuf = actx.createBuffer(1, len, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { actx = null; }
}
function ding(vol, freq, dur) {
  if (!actx || !cfg.sound) return;
  if (actx.state === 'suspended') actx.resume();
  const t = actx.currentTime;
  const src = actx.createBufferSource(); src.buffer = noiseBuf;
  const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 1.6; bp.Q.value = 2;
  const g = actx.createGain(); g.gain.setValueAtTime(vol * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.4);
  src.connect(bp); bp.connect(g); g.connect(actx.destination); src.start(t); src.stop(t + dur);
  [1, 2.32, 3.9].forEach((m, k) => { // metallic partials
    const o = actx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * m;
    const g2 = actx.createGain(); g2.gain.setValueAtTime(vol * (k ? 0.18 : 0.4), t); g2.gain.exponentialRampToValueAtTime(0.001, t + dur / (1 + k * 0.6));
    o.connect(g2); g2.connect(actx.destination); o.start(t); o.stop(t + dur);
  });
}
function haptic(ms) { if (cfg.haptic && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { } } }

/* ================= Camera ================= */
const canvas = $('#table'), ctx = canvas.getContext('2d');
let W = 0, H_ = 0, DPR = 1, cam = null, maxH = 12, bounds = { x: 6, zMin: -6, zMax: 6 }, feltCache = null;
function makeCamera() {
  const top = cfg.view === 'top';
  const eye = top ? [0, 16.5, 0.6] : [0, 15, 11], target = top ? [0, 0, 0] : [0, 0.4, -0.2];
  const fwd = V.norm(V.sub(target, eye)), right = V.norm(V.cross(fwd, top ? [0, 0, -1] : [0, 1, 0])), up = V.cross(right, fwd);
  const f = Math.min(H_ * 1.3, W * 1.9), cx = W / 2, cy = H_ / 2;
  return {
    eye, fwd, right, up, f, cx, cy,
    project(p) { const d = V.sub(p, eye); const z = V.dot(d, fwd); return [cx + f * V.dot(d, right) / z, cy - f * V.dot(d, up) / z, z]; },
    unproject(sx, sy, h) { const dir = V.add(V.add(V.scale(right, (sx - cx) / f), V.scale(up, -(sy - cy) / f)), fwd); const t = (h - eye[1]) / dir[1]; return V.add(eye, V.scale(dir, t)); }
  };
}
function resize() {
  const r = canvas.getBoundingClientRect(); if (!r.width) return;
  DPR = Math.min(window.devicePixelRatio || 1, 2.5); W = r.width; H_ = r.height;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H_ * DPR);
  cam = makeCamera();
  const m = 1.3;
  const xTop = Math.abs(cam.unproject(W, 0, 1)[0]), xBot = Math.abs(cam.unproject(W, H_, 1)[0]);
  bounds = { x: Math.min(xTop, xBot) - m, zMin: cam.unproject(W / 2, 0, cfg.view === 'top' ? 1 : 3)[2] + m, zMax: cam.unproject(W / 2, H_ - 70, 0.2)[2] - m };
  maxH = cam.eye[1] - 3.5;
  feltCache = null; needsDraw = true;
}
new ResizeObserver(resize).observe(canvas);

/* ================= Physics ================= */
const G = 40, DT = 1 / 200, REST = 0.42, FRICTION = 0.5, NR = 20;
const coins = [];
let rolling = false, rollStart = 0, needsDraw = true, lastT = 0, acc = 0;
onTexReload = () => { coins.forEach(c => c.tex = buildTex(c.def)); needsDraw = true; if (typeof renderCoins === 'function') renderCoins(); };
function makeCoin(def) {
  const R = 1.45 * def.size, T = def.thick * 1.45;
  const verts = [];
  for (const y of [T / 2, -T / 2]) for (let i = 0; i < NR; i++) { const a = i * Math.PI * 2 / NR; verts.push([Math.cos(a) * R, y, Math.sin(a) * R]); }
  return { def, R, T, verts, world: verts.map(() => [0, 0, 0]), tex: buildTex(def),
    pos: [0, R, 0], vel: [0, 0, 0], q: Q.fromAxis([1, 0, 0], 0), ang: [0, 0, 0],
    invM: 1, invI: 1 / (0.35 * R * R), settled: true, restN: 0, edgeN: 0, snap: null, result: null, lastSound: 0, glow: 0 };
}
function updateWorld(c) { for (let i = 0; i < c.verts.length; i++) { const w = Q.rotate(c.q, c.verts[i]); c.world[i][0] = w[0] + c.pos[0]; c.world[i][1] = w[1] + c.pos[1]; c.world[i][2] = w[2] + c.pos[2]; } }
function applyImpulse(c, r, j) { c.vel = V.add(c.vel, V.scale(j, c.invM)); c.ang = V.add(c.ang, V.scale(V.cross(r, j), c.invI)); }
function contact(c, p, n, rest, other) {
  const r = V.sub(p, c.pos);
  let vp = V.add(c.vel, V.cross(c.ang, r)); const vn = V.dot(vp, n);
  if (vn < 0) {
    const rn = V.cross(r, n), k = c.invM + V.dot(rn, rn) * c.invI;
    const e = Math.abs(vn) < 1.5 ? 0 : rest, j = -(1 + e) * vn / k;
    applyImpulse(c, r, V.scale(n, j));
    vp = V.add(c.vel, V.cross(c.ang, r));
    const vt = V.sub(vp, V.scale(n, V.dot(vp, n))), lt = V.len(vt);
    if (lt > 1e-4) { const t = V.scale(vt, 1 / lt), rt = V.cross(r, t), kt = c.invM + V.dot(rt, rt) * c.invI; applyImpulse(c, r, V.scale(t, clamp(-lt / kt, -FRICTION * j, FRICTION * j))); }
    if (j > 2 && performance.now() - c.lastSound > 50) { c.lastSound = performance.now(); ding(clamp(j / 30, 0.05, 0.5), other ? 2600 : 2100 + Math.random() * 300, 0.35); }
  }
}
function stepCoin(c) {
  if (c.settled || c.snap) return;
  c.vel[1] -= G * DT; c.vel = V.scale(c.vel, 0.999); c.ang = V.scale(c.ang, 0.996);
  c.pos = V.add(c.pos, V.scale(c.vel, DT));
  if (c.pos[1] > maxH) { c.pos[1] = maxH; if (c.vel[1] > 0) c.vel[1] = 0; }
  const al = V.len(c.ang); if (al > 1e-6) c.q = Q.norm(Q.mul(Q.fromAxis(V.scale(c.ang, 1 / al), al * DT), c.q));
  updateWorld(c);
  let minY = Infinity;
  for (let it = 0; it < 2; it++) {
    let maxPen = 0; minY = Infinity;
    for (const p of c.world) {
      if (p[1] < minY) minY = p[1];
      if (p[1] < 0) { contact(c, p, [0, 1, 0], REST); if (-p[1] > maxPen) maxPen = -p[1]; }
      if (p[0] > bounds.x) contact(c, p, [-1, 0, 0], 0.4); if (p[0] < -bounds.x) contact(c, p, [1, 0, 0], 0.4);
      if (p[2] > bounds.zMax) contact(c, p, [0, 0, -1], 0.4); if (p[2] < bounds.zMin) contact(c, p, [0, 0, 1], 0.4);
    }
    if (maxPen > 0) { c.pos[1] += maxPen; updateWorld(c); }
    c.pos[0] = clamp(c.pos[0], -bounds.x + c.T, bounds.x - c.T); c.pos[2] = clamp(c.pos[2], bounds.zMin + c.T, bounds.zMax - c.T);
  }
  const n = Q.rotate(c.q, [0, 1, 0]), sp = V.len(c.vel), asp = V.len(c.ang);
  // a coin rolling/spinning on its edge loses energy quickly and tips over (like a real coin on felt)
  if (minY < 0.05 && Math.abs(n[1]) < 0.6) {
    c.edgeT = (c.edgeT || 0) + DT;
    if (c.edgeT > 0.25) { const side = V.norm([n[0], 0, n[2]]); c.ang = V.add(V.scale(c.ang, 0.98), V.scale(V.cross([0, 1, 0], side), c.tipDir * 0.9)); c.vel = V.scale(c.vel, 0.98); }
  } else c.edgeT = 0;
  if (minY < 0.05 && Math.abs(n[1]) > 0.8) { c.ang = V.scale(c.ang, 0.975); c.vel = V.scale(c.vel, 0.985); } // wobble on felt dies fast
  if (((sp < 0.4 && asp < 0.8) || (sp < 0.8 && asp < 2.5 && Math.abs(n[1]) > 0.93)) && minY < 0.05) {
    if (Math.abs(n[1]) > 0.75) { c.restN++; if (c.restN > 10) beginSnap(c); }
    else { c.edgeN++; if (c.edgeN > 30) { c.edgeN = 0; const side = V.norm([n[0], 0, n[2]]); c.ang = V.add(c.ang, V.scale(V.cross([0, 1, 0], side), rnd(2.5, 4) * (Math.random() < 0.5 ? 1 : -1))); c.vel[1] += 0.8; } } // tip over an edge-standing coin
  } else c.restN = 0;
  if (sp < 0.5 && asp < 1 && minY >= 0.05) { // resting on another coin → slide off
    c.stuckN = (c.stuckN || 0) + 1;
    if (c.stuckN > 60) { c.stuckN = 0; c.nudges = (c.nudges || 0) + 1; if (c.nudges > 3) beginSnap(c); else { c.vel = V.add(c.vel, [rnd(-3, 3), 2, rnd(-3, 3)]); c.ang = V.add(c.ang, [rnd(-5, 5), rnd(-3, 3), rnd(-5, 5)]); } }
  } else c.stuckN = 0;
}
function collide(a, b) {
  const dlt = V.sub(b.pos, a.pos), dist = V.len(dlt), min = (a.R + b.R) * 0.9;
  if (dist >= min || dist < 1e-6) return;
  const n = V.scale(dlt, 1 / dist), sep = (min - dist) * 0.5;
  const aF = !(a.settled || a.snap), bF = !(b.settled || b.snap);
  if (aF && bF) { a.pos = V.sub(a.pos, V.scale(n, sep / 2)); b.pos = V.add(b.pos, V.scale(n, sep / 2)); } else if (aF) a.pos = V.sub(a.pos, V.scale(n, sep)); else if (bF) b.pos = V.add(b.pos, V.scale(n, sep)); else return;
  const rel = V.sub(b.vel, a.vel), vn = V.dot(rel, n); if (vn >= 0) return;
  const k = (aF ? a.invM : 0) + (bF ? b.invM : 0), j = -(1.3) * vn / k;
  if (aF) a.vel = V.sub(a.vel, V.scale(n, j * a.invM)); if (bF) b.vel = V.add(b.vel, V.scale(n, j * b.invM));
  if (j > 2 && performance.now() - a.lastSound > 50) { a.lastSound = performance.now(); ding(clamp(j / 25, 0.05, 0.4), 3000, 0.3); }
}
function beginSnap(c) {
  const n = Q.rotate(c.q, [0, 1, 0]), up = n[1] > 0;
  const rot = Q.between(n, [0, up ? 1 : -1, 0]);
  c.snap = { q0: c.q.slice(), q1: Q.norm(Q.mul(rot, c.q)), y0: c.pos[1], y1: c.T / 2, t: 0, up };
  c.vel = [0, 0, 0]; c.ang = [0, 0, 0];
}
function physicsStep() {
  for (const c of coins) {
    if (c.snap) {
      c.snap.t += DT / 0.14; const t = Math.min(1, c.snap.t), s = t * t * (3 - 2 * t);
      c.q = Q.slerp(c.snap.q0, c.snap.q1, s); c.pos[1] = c.snap.y0 + (c.snap.y1 - c.snap.y0) * s; updateWorld(c);
      if (t >= 1) { c.q = c.snap.q1; const up = c.snap.up; c.snap = null; c.settled = true; c.result = up ? 'heads' : 'tails'; c.glow = 1; ding(0.12, 2400, 0.5); onSettled(); }
      continue;
    }
    stepCoin(c);
  }
  for (let i = 0; i < coins.length; i++) for (let j = i + 1; j < coins.length; j++) collide(coins[i], coins[j]);
}

/* ================= Rendering ================= */
const LIGHT = V.norm([-0.4, 1, 0.5]);
function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); }
function drawFelt() {
  const T = TABLES[cfg.table] || TABLES.verde;
  const off = document.createElement('canvas'); off.width = canvas.width; off.height = canvas.height;
  const c = off.getContext('2d'); c.scale(DPR, DPR);
  c.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg').trim() || '#111'; c.fillRect(0, 0, W, H_);
  const bx = bounds.x + 1.1, zn = bounds.zMax + 1.2, zf = bounds.zMin - 1.2;
  const rim = [[-bx - 0.9, 0, zn + 0.9], [bx + 0.9, 0, zn + 0.9], [bx + 0.9, 0, zf - 0.9], [-bx - 0.9, 0, zf - 0.9]].map(p => cam.project(p));
  const inner = [[-bx, 0, zn], [bx, 0, zn], [bx, 0, zf], [-bx, 0, zf]].map(p => cam.project(p));
  c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  poly(c, rim); const rg = c.createLinearGradient(0, rim[2][1], 0, rim[0][1]); rg.addColorStop(0, T.rim); rg.addColorStop(1, T.rim2); c.fillStyle = rg; c.fill(); c.restore();
  poly(c, rim); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1.5; c.stroke();
  poly(c, inner); c.save(); c.clip();
  const cxp = (inner[0][0] + inner[2][0]) / 2, cyp = (inner[0][1] + inner[2][1]) / 2;
  const g = c.createRadialGradient(cxp, cyp - H_ * 0.05, 10, cxp, cyp, Math.max(W, H_) * 0.75);
  g.addColorStop(0, T.c); g.addColorStop(1, T.e); c.fillStyle = g; c.fillRect(0, 0, W, H_);
  c.globalAlpha = 0.07; for (let i = 0; i < 2600; i++) { c.fillStyle = i & 1 ? '#fff' : '#000'; c.fillRect(Math.random() * W, Math.random() * H_, 1, 1); } c.globalAlpha = 1;
  poly(c, inner); c.lineWidth = 18; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.filter = 'blur(6px)'; c.stroke(); c.filter = 'none';
  c.restore(); poly(c, inner); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; c.stroke();
  return off;
}
function drawShadow(c) {
  const h = Math.max(0, c.pos[1] - c.T / 2), a = clamp(0.42 - h * 0.045, 0.06, 0.42), sc = 1 + h * 0.07;
  const n = Q.rotate(c.q, [0, 1, 0]);
  // shadow = projection of the coin disc onto the floor (approx: ellipse squashed by tilt)
  const pts = []; const ux = V.norm(Math.abs(n[1]) > 0.99 ? [1, 0, 0] : V.cross(n, [0, 1, 0])), uz = V.cross([0, 1, 0], ux);
  const rx = c.R * sc, rz = c.R * Math.max(0.12, Math.abs(n[1])) * sc;
  for (let i = 0; i < 18; i++) { const t = i / 18 * Math.PI * 2; const p = V.add(V.add([c.pos[0], 0.001, c.pos[2]], V.scale(ux, Math.cos(t) * rx)), V.scale(uz, Math.sin(t) * rz)); pts.push(cam.project(p)); }
  const cp = cam.project([c.pos[0], 0.001, c.pos[2]]);
  const g = ctx.createRadialGradient(cp[0], cp[1], 0, cp[0], cp[1], Math.max(...pts.map(p => Math.hypot(p[0] - cp[0], p[1] - cp[1]))) * 1.05);
  g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.75, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  poly(ctx, pts); ctx.fillStyle = g; ctx.fill();
}
function drawCoin(c) {
  const n = Q.rotate(c.q, [0, 1, 0]), toEye = V.sub(cam.eye, c.pos), up = V.dot(n, toEye) > 0;
  const outer = hex2rgb(c.def.outer);
  const top = c.world.slice(0, NR), bot = c.world.slice(NR);
  const pt = top.map(p => cam.project(p)), pb = bot.map(p => cam.project(p));
  // rim quads
  for (let i = 0; i < NR; i++) {
    const j = (i + 1) % NR;
    const mid = V.scale(V.add(top[i], top[j]), 0.5), rn = V.norm(V.sub(mid, V.add(c.pos, V.scale(n, V.dot(V.sub(mid, c.pos), n)))));
    if (V.dot(rn, V.sub(cam.eye, mid)) <= 0) continue;
    const diff = Math.max(0, V.dot(rn, LIGHT)), shade = (0.45 + 0.55 * diff) * (c.def.reeded === false ? 1 : (i & 1 ? 0.88 : 1.04));
    poly(ctx, [pt[i], pt[j], pb[j], pb[i]]); ctx.fillStyle = rgbStr(outer, shade); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8; ctx.stroke();
  }
  // visible face
  const facePts = up ? pt : pb, nf = up ? n : V.scale(n, -1), center = V.add(c.pos, V.scale(nf, c.T / 2));
  const diff = Math.max(0, V.dot(nf, LIGHT)), shade = 0.5 + 0.5 * diff;
  const viewDir = V.norm(toEye), Hv = V.norm(V.add(LIGHT, viewDir)), spec = Math.pow(Math.max(0, V.dot(nf, Hv)), 40) * 0.5;
  ctx.save(); poly(ctx, facePts); ctx.clip();
  // basis: u = local X, v = nf × u (right-handed) so the design isn't mirrored
  const u = Q.rotate(c.q, [1, 0, 0]), v = V.cross(nf, u), K = 100;
  const pc = cam.project(center), pu = cam.project(V.add(center, V.scale(u, 1 / K))), pv = cam.project(V.add(center, V.scale(v, 1 / K)));
  ctx.transform(pu[0] - pc[0], pu[1] - pc[1], -(pv[0] - pc[0]), -(pv[1] - pc[1]), pc[0], pc[1]);
  const s = (2 * c.R / TEX) * K; ctx.scale(s, s);
  ctx.drawImage(up ? c.tex.heads : c.tex.tails, -TEX / 2, -TEX / 2);
  ctx.restore();
  // lighting overlay
  poly(ctx, facePts);
  if (shade < 1) { ctx.fillStyle = `rgba(0,0,0,${(1 - shade) * 0.55})`; ctx.fill(); }
  if (spec > 0.02) { ctx.fillStyle = `rgba(255,255,255,${spec * 0.6})`; ctx.fill(); }
  ctx.lineJoin = 'round'; ctx.lineWidth = 1; ctx.strokeStyle = rgbStr(outer, 0.55); ctx.stroke();
  if (c.glow > 0) { poly(ctx, facePts); ctx.fillStyle = `rgba(255,240,180,${0.3 * c.glow})`; ctx.fill(); }
}
function render() {
  if (!cam) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!feltCache) feltCache = drawFelt();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(feltCache, 0, 0); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const sorted = coins.slice().sort((a, b) => V.len(V.sub(cam.eye, b.pos)) - V.len(V.sub(cam.eye, a.pos)));
  for (const c of sorted) drawShadow(c);
  for (const c of sorted) drawCoin(c);
}
let frameN = 0;
function loop(t) {
  requestAnimationFrame(loop);
  if (cfg.eco && (++frameN & 1)) return;
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
  let active = false;
  for (const c of coins) { if (!c.settled) active = true; if (c.glow > 0) { c.glow -= dt * 1.2; active = true; } }
  if (active) {
    acc += dt; let n = 0;
    while (acc >= DT && n < 40) { physicsStep(); acc -= DT; n++; }
    if (rolling && performance.now() - rollStart > 8000) coins.forEach(c => { if (!c.settled && !c.snap) beginSnap(c); });
    needsDraw = true;
  }
  if (needsDraw) { render(); needsDraw = active; }
}

/* ================= Game ================= */
let history = LS.get('hist', []), current = null;
const coinDef = () => COINS.find(c => c.id === cfg.coin) || COINS[0];
function setupCoins() {
  coins.length = 0;
  const def = coinDef(), n = cfg.n;
  for (let i = 0; i < n; i++) {
    const c = makeCoin(def); const col = i - (n - 1) / 2;
    c.pos = [col * (c.R * 2.3), c.T / 2, 0.5]; c.q = Math.random() < 0.5 ? Q.id() : Q.fromAxis([1, 0, 0], Math.PI); updateWorld(c);
    coins.push(c);
  }
  needsDraw = true; setStatus('Toca la mesa para lanzar');
}
function setStatus(t) { $('#status').textContent = t; }
function flip(dirHint) {
  audioInit(); if (actx && actx.state === 'suspended') actx.resume();
  if (rolling) return;
  if (!coins.length || coins[0].def.id !== cfg.coin || coins.length !== cfg.n) setupCoins();
  $('#result').classList.remove('show'); $('#flipBtn').classList.add('busy');
  coins.forEach((c, i) => {
    c.settled = false; c.snap = null; c.restN = 0; c.edgeN = 0; c.edgeT = 0; c.stuckN = 0; c.nudges = 0; c.tipDir = Math.random() < 0.5 ? 1 : -1; c.result = null; c.glow = 0;
    const p = cfg.power;
    const vmax = Math.sqrt(2 * G * maxH);
    c.vel = [rnd(-1.5, 1.5) + (dirHint ? dirHint[0] * 4 : 0), Math.min(vmax, rnd(21, 27) * p), rnd(-1.5, 1.5) + (dirHint ? dirHint[1] * 4 : 0)];
    const ax = V.norm([rnd(-1, 1), rnd(-0.15, 0.15), rnd(-1, 1)]);
    c.ang = V.scale(ax, rnd(22, 38) * p);
    c.pos[1] = Math.max(c.pos[1], c.R + 0.2);
    updateWorld(c);
  });
  rolling = true; rollStart = performance.now(); needsDraw = true; setStatus('En el aire…');
  haptic(10); ding(0.25, 1800, 0.25);
}
function onSettled() {
  haptic(8);
  if (!coins.every(c => c.settled)) return;
  rolling = false; $('#flipBtn').classList.remove('busy');
  const heads = coins.filter(c => c.result === 'heads').length, tails = coins.length - heads;
  current = { t: Date.now(), coin: cfg.coin, n: coins.length, heads, tails, res: coins.map(c => c.result === 'heads' ? 'C' : 'S') };
  history.unshift(current); if (history.length > 500) history.length = 500; LS.set('hist', history);
  showResult(current); setStatus('Resultado');
}
function showResult(r) {
  const res = $('#result'), big = $('#big');
  if (r.n === 1) { big.textContent = r.heads ? 'Cara' : tailsName(); res.classList.toggle('tails', !r.heads); }
  else { big.textContent = `${r.heads} cara${r.heads === 1 ? '' : 's'} · ${r.tails} ${tailsName().toLowerCase()}${r.tails === 1 ? '' : 's'}`; res.classList.remove('tails'); }
  const streak = streakLen();
  $('#sub').textContent = streak > 1 ? `Racha de ${streak} seguidas` : (r.n === 1 ? coinDef().name + ' · ' + coinDef().country : coinDef().name);
  res.classList.remove('show'); void res.offsetWidth; res.classList.add('show');
  renderStats();
}
function streakLen() {
  if (!history.length || history[0].n !== 1) return 0;
  const first = history[0].heads; let k = 0;
  for (const h of history) { if (h.n !== 1 || h.heads !== first) break; k++; }
  return k;
}
function renderStats() {
  let h = 0, t = 0; history.forEach(r => { h += r.heads; t += r.tails; });
  const tot = h + t, ph = tot ? h / tot * 100 : 50;
  $('#cntH').textContent = h; $('#cntT').textContent = t; $('#lblT').textContent = tailsName();
  $('#barH').style.width = ph + '%';
  $('#pct').textContent = tot ? `${ph.toFixed(1)}% cara · ${(100 - ph).toFixed(1)}% ${tailsName().toLowerCase()} · ${tot} lanzamientos` : 'Sin lanzamientos todavía';
  $('#histBadge').textContent = history.length || '';
}
function renderHistory() {
  const list = $('#histList'); list.innerHTML = '';
  if (!history.length) list.innerHTML = '<div class="empty">Sin lanzamientos todavía</div>';
  history.slice(0, 80).forEach(r => {
    const d = new Date(r.t), def = COINS.find(c => c.id === r.coin) || COINS[0];
    const el = document.createElement('div'); el.className = 'hrow';
    const txt = r.n === 1 ? (r.heads ? 'Cara' : tailsName()) : r.res.map(x => x === 'C' ? 'C' : (cfg.tailsName === 'cruz' ? 'X' : 'S')).join(' ');
    el.innerHTML = `<b class="${r.n === 1 && !r.heads ? 'tl' : ''}">${txt}</b><span>${def.flag} ${def.name}${r.n > 1 ? ' ×' + r.n : ''}</span><em>${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}</em>`;
    list.appendChild(el);
  });
  // longest streaks
  let best = 0, cur = 0, last = null;
  history.slice().reverse().forEach(r => { if (r.n !== 1) { cur = 0; last = null; return; } if (r.heads === last) cur++; else { cur = 1; last = r.heads; } best = Math.max(best, cur); });
  $('#stBest').textContent = best || '—'; $('#stN').textContent = history.length;
  renderStats();
}
function renderCoins() {
  const box = $('#coins'); box.innerHTML = '';
  COINS.forEach(def => {
    const b = document.createElement('button'); b.className = 'coin-btn' + (cfg.coin === def.id ? ' on' : '');
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const c = cv.getContext('2d');
    c.drawImage(buildTex(def).heads, 0, 0, 128, 128); b.appendChild(cv);
    const l = document.createElement('span'); l.innerHTML = `<b>${def.flag} ${def.name}</b><small>${def.country}</small>`; b.appendChild(l);
    b.addEventListener('click', () => { cfg.coin = def.id; cfg.tailsName = def.ttext; LS.set('cfg', cfg); renderCoins(); setupCoins(); renderStats(); haptic(4); });
    box.appendChild(b);
  });
  $('#nVal').textContent = cfg.n;
}
let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2000); }
function openSheet(id) { closeSheets(); $(id).classList.add('open'); $('#backdrop').classList.add('show'); }
function closeSheets() { $$('.sheet').forEach(s => s.classList.remove('open')); $('#backdrop').classList.remove('show'); }
/* ---- user photos: crop a picture of your own coin ---- */
let cropState = null;
function openCrop(side, file) {
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    cropState = { img, side, zoom: 1, ox: 0, oy: 0 };
    $('#cropTitle').textContent = (side === 'heads' ? 'Cara' : tailsName()) + ' · ' + coinDef().name;
    $('#cropZoom').value = 1; $('#cropBox').classList.add('open'); drawCrop();
  };
  img.src = url;
}
function drawCrop() {
  if (!cropState) return;
  const cv = $('#cropCanvas'), c = cv.getContext('2d'), S = cv.width, { img, zoom, ox, oy } = cropState;
  c.clearRect(0, 0, S, S); c.fillStyle = '#111'; c.fillRect(0, 0, S, S);
  const base = S / Math.min(img.width, img.height) * zoom, w = img.width * base, h = img.height * base;
  c.drawImage(img, S / 2 - w / 2 + ox, S / 2 - h / 2 + oy, w, h);
  c.save(); c.beginPath(); c.rect(0, 0, S, S); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2, true); c.fillStyle = 'rgba(0,0,0,0.6)'; c.fill(); c.restore();
  c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); c.strokeStyle = '#e8c86a'; c.lineWidth = 2; c.stroke();
}
function saveCrop() {
  if (!cropState) return;
  const S = 512, out = document.createElement('canvas'); out.width = S; out.height = S; const c = out.getContext('2d');
  const { img, zoom, ox, oy, side } = cropState, P = $('#cropCanvas').width, k = S / P;
  const base = P / Math.min(img.width, img.height) * zoom, w = img.width * base * k, h = img.height * base * k;
  c.drawImage(img, S / 2 - w / 2 + ox * k, S / 2 - h / 2 + oy * k, w, h);
  try { localStorage.setItem('moneda_photo_' + coinDef().id + '_' + side, out.toDataURL('image/jpeg', 0.86)); }
  catch (e) { toast('Sin espacio para guardar la foto'); return; }
  cropState = null; $('#cropBox').classList.remove('open');
  Object.keys(coinTex).forEach(k => delete coinTex[k]); Object.keys(photoCache).forEach(k => { if (k.startsWith('data:')) delete photoCache[k]; });
  onTexReload(); renderSettings(); toast('Foto guardada');
}
function clearPhoto(side) {
  try { localStorage.removeItem('moneda_photo_' + coinDef().id + '_' + side); } catch (e) { }
  Object.keys(coinTex).forEach(k => delete coinTex[k]); onTexReload(); renderSettings(); toast('Foto quitada');
}
function renderPhotoOpts() {
  const def = coinDef(); $('#photoCoin').textContent = def.flag + ' ' + def.name + ' · ' + def.country;
  ['heads', 'tails'].forEach(side => {
    let custom = false; try { custom = !!localStorage.getItem('moneda_photo_' + def.id + '_' + side); } catch (e) { }
    const el = $('#ph_' + side); el.querySelector('.ps').textContent = custom ? 'Tu foto' : (def.photo && def.photo[side] ? 'Foto real' : 'Ilustración');
    el.querySelector('.rm').style.display = custom ? '' : 'none';
    el.querySelector('.lbl').textContent = side === 'heads' ? 'Cara' : tailsName();
  });
  $('#credit').textContent = def.credit || 'Ilustración propia (no hay fotos con licencia libre de esta moneda). Puedes fotografiar tu moneda con los botones de arriba.';
}
function renderSettings() {
  renderPhotoOpts();
  $('#optSound').classList.toggle('on', cfg.sound); $('#optShake').classList.toggle('on', cfg.shake); $('#optHaptic').classList.toggle('on', cfg.haptic); $('#optEco').classList.toggle('on', cfg.eco);
  $('#power').value = cfg.power;
  $$('.tname').forEach(b => b.classList.toggle('on', b.dataset.v === cfg.tailsName));
  const tb = $('#tables'); tb.innerHTML = '';
  Object.keys(TABLES).forEach(k => { const b = document.createElement('button'); b.className = 'swatch' + (cfg.table === k ? ' on' : ''); b.style.background = `radial-gradient(circle, ${TABLES[k].c}, ${TABLES[k].e})`; b.title = TABLES[k].name; b.addEventListener('click', () => { cfg.table = k; feltCache = null; needsDraw = true; renderSettings(); LS.set('cfg', cfg); }); tb.appendChild(b); });
}
function applyTheme() {
  const dark = cfg.theme ? cfg.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  $('#themeTrack').classList.toggle('dark', dark); feltCache = null; needsDraw = true;
}
let lastAcc = null, lastShake = 0;
function onMotion(e) {
  if (!cfg.shake) return; const a = e.accelerationIncludingGravity; if (!a) return;
  if (lastAcc) { const d = Math.abs(a.x - lastAcc.x) + Math.abs(a.y - lastAcc.y) + Math.abs(a.z - lastAcc.z); if (d > 28 && performance.now() - lastShake > 1500) { lastShake = performance.now(); flip(); } }
  lastAcc = { x: a.x, y: a.y, z: a.z };
}
function enableShake() {
  const D = window.DeviceMotionEvent;
  if (!D) { toast('Este dispositivo no soporta movimiento'); cfg.shake = false; renderSettings(); return; }
  if (typeof D.requestPermission === 'function') D.requestPermission().then(s => { if (s === 'granted') { window.addEventListener('devicemotion', onMotion); toast('Agita para lanzar'); } else { cfg.shake = false; renderSettings(); toast('Permiso denegado'); } LS.set('cfg', cfg); }).catch(() => { cfg.shake = false; renderSettings(); });
  else { window.addEventListener('devicemotion', onMotion); toast('Agita para lanzar'); }
}
function bind() {
  $('#flipBtn').addEventListener('click', () => flip());
  $('#nMinus').addEventListener('click', () => { cfg.n = clamp(cfg.n - 1, 1, 8); LS.set('cfg', cfg); renderCoins(); setupCoins(); });
  $('#nPlus').addEventListener('click', () => { cfg.n = clamp(cfg.n + 1, 1, 8); LS.set('cfg', cfg); renderCoins(); setupCoins(); });
  $('#histBtn').addEventListener('click', () => { renderHistory(); openSheet('#histSheet'); });
  $('#setBtn').addEventListener('click', () => { renderSettings(); openSheet('#setSheet'); });
  $('#backdrop').addEventListener('click', closeSheets);
  $$('.sheet .close').forEach(b => b.addEventListener('click', closeSheets));
  $('#clearHist').addEventListener('click', () => { if (confirm('¿Borrar todo el historial?')) { history = []; LS.set('hist', history); renderHistory(); } });
  $('#optSound').addEventListener('click', () => { cfg.sound = !cfg.sound; renderSettings(); LS.set('cfg', cfg); if (cfg.sound) { audioInit(); ding(0.2, 2200, 0.4); } });
  $('#optHaptic').addEventListener('click', () => { cfg.haptic = !cfg.haptic; renderSettings(); LS.set('cfg', cfg); });
  $('#optEco').addEventListener('click', () => { cfg.eco = !cfg.eco; renderSettings(); LS.set('cfg', cfg); });
  $('#optShake').addEventListener('click', () => { cfg.shake = !cfg.shake; renderSettings(); LS.set('cfg', cfg); if (cfg.shake) enableShake(); });
  $('#power').addEventListener('input', e => { cfg.power = parseFloat(e.target.value); LS.set('cfg', cfg); });
  $$('.tname').forEach(b => b.addEventListener('click', () => { cfg.tailsName = b.dataset.v; LS.set('cfg', cfg); renderSettings(); renderStats(); }));
  $('#themeTrack').addEventListener('click', () => { const dark = document.documentElement.getAttribute('data-theme') === 'dark'; cfg.theme = dark ? 'light' : 'dark'; LS.set('cfg', cfg); applyTheme(); });
  $('#shareBtn').addEventListener('click', () => {
    if (!current) { toast('Nada que compartir'); return; }
    const def = coinDef(), txt = current.n === 1 ? `🪙 ${def.name} (${def.country}): ${current.heads ? 'Cara' : tailsName()}` : `🪙 ${def.name} ×${current.n}: ${current.heads} cara · ${current.tails} ${tailsName().toLowerCase()}`;
    if (navigator.share) navigator.share({ text: txt }).catch(() => { }); else if (navigator.clipboard) { navigator.clipboard.writeText(txt); toast('Copiado'); }
  });
  let p0 = null, t0 = 0;
  const local = (x, y) => { const r = canvas.getBoundingClientRect(); return [x - r.left, y - r.top]; };
  const down = (x, y) => { p0 = local(x, y); t0 = performance.now(); };
  const up = (x, y) => { if (!p0) return; const [lx, ly] = local(x, y); const dx = lx - p0[0], dy = ly - p0[1], dist = Math.hypot(dx, dy), dt = performance.now() - t0; p0 = null; if (dist > 30 && dt < 600) flip([dx / dist, dy / dist]); else if (dist < 12) flip(); };
  canvas.addEventListener('touchstart', e => { const t = e.changedTouches[0]; down(t.clientX, t.clientY); }, { passive: true });
  canvas.addEventListener('touchend', e => { const t = e.changedTouches[0]; up(t.clientX, t.clientY); e.preventDefault(); });
  canvas.addEventListener('mousedown', e => down(e.clientX, e.clientY));
  canvas.addEventListener('mouseup', e => up(e.clientX, e.clientY));
  window.addEventListener('keydown', e => { if ((e.code === 'Space' || e.key === 'Enter') && document.activeElement === document.body) { e.preventDefault(); flip(); } if (e.key === 'Escape') closeSheets(); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!cfg.theme) applyTheme(); });
  if (cfg.shake && window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission !== 'function') window.addEventListener('devicemotion', onMotion);
  ['heads', 'tails'].forEach(side => {
    const inp = $('#file_' + side);
    $('#ph_' + side).querySelector('.pick').addEventListener('click', () => inp.click());
    inp.addEventListener('change', () => { if (inp.files && inp.files[0]) openCrop(side, inp.files[0]); inp.value = ''; });
    $('#ph_' + side).querySelector('.rm').addEventListener('click', () => clearPhoto(side));
  });
  $('#cropZoom').addEventListener('input', e => { if (cropState) { cropState.zoom = parseFloat(e.target.value); drawCrop(); } });
  $('#cropSave').addEventListener('click', saveCrop);
  $('#cropCancel').addEventListener('click', () => { cropState = null; $('#cropBox').classList.remove('open'); });
  { const cv = $('#cropCanvas'); let last = null;
    const st = (x, y) => { last = [x, y]; }, mv = (x, y) => { if (!last || !cropState) return; const r = cv.getBoundingClientRect(), k = cv.width / r.width; cropState.ox += (x - last[0]) * k; cropState.oy += (y - last[1]) * k; last = [x, y]; drawCrop(); };
    cv.addEventListener('mousedown', e => st(e.clientX, e.clientY)); window.addEventListener('mousemove', e => mv(e.clientX, e.clientY)); window.addEventListener('mouseup', () => last = null);
    cv.addEventListener('touchstart', e => { const t = e.touches[0]; st(t.clientX, t.clientY); }, { passive: true });
    cv.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; mv(t.clientX, t.clientY); }, { passive: false });
    cv.addEventListener('touchend', () => last = null); }
  $('#viewBtn').addEventListener('click', () => { cfg.view = cfg.view === 'top' ? 'persp' : 'top'; LS.set('cfg', cfg); resize(); coins.forEach(updateWorld); $('#viewBtn').textContent = cfg.view === 'top' ? '◎' : '⬒'; toast(cfg.view === 'top' ? 'Vista desde arriba' : 'Vista en perspectiva'); });
  $('#viewBtn').textContent = cfg.view === 'top' ? '◎' : '⬒';
  const stage = $('.stage'), fsBtn = $('#fsBtn');
  if (!(stage.requestFullscreen || stage.webkitRequestFullscreen)) fsBtn.style.display = 'none';
  fsBtn.addEventListener('click', () => { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage); });
}

applyTheme(); bind(); renderCoins(); renderStats(); resize(); setupCoins(); requestAnimationFrame(loop);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
window.MONEDA = { coins, flip, cfg, history, physicsStep, render, COINS, setupCoins, tex: buildTex, get cam() { return cam; } };
})();
