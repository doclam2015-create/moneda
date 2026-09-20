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
const GOLD = '#d4b04c', GOLD2 = '#a8862f', SILVER = '#d9dbe0', SILVER2 = '#a4a8b0', COPPER = '#c4784a', BRONZE = '#b9925a';
const TEX = 512;
// helpers for face drawing (ctx in 512x512 space, center 256, radius ~236)
const H = {
  arcText(c, txt, r, a0, a1, size, color, weight) {
    c.save(); c.fillStyle = color; c.font = `${weight || 700} ${size}px Georgia, "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const n = txt.length, total = a1 - a0;
    for (let i = 0; i < n; i++) { const a = a0 + total * (i + 0.5) / n; c.save(); c.translate(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); c.rotate(a + Math.PI / 2); c.fillText(txt[i], 0, 0); c.restore(); }
    c.restore();
  },
  text(c, txt, x, y, size, color, weight, font) { c.fillStyle = color; c.font = `${weight || 800} ${size}px ${font || 'Georgia, "Times New Roman", serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y); },
  star(c, x, y, r, color, pts) {
    pts = pts || 5; c.beginPath();
    for (let i = 0; i < pts * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / pts, rr = i % 2 ? r * 0.4 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = color; c.fill();
  },
  laurel(c, x, y, r, color, side) {
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const ang = side > 0 ? Math.PI * 0.62 + i * 0.1 : Math.PI * 0.38 - i * 0.1;
      const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
      c.save(); c.translate(px, py); c.rotate(ang + (side > 0 ? -0.9 : 0.9)); c.beginPath(); c.ellipse(0, 0, 14, 6, 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    c.beginPath(); c.arc(x, y, r, side > 0 ? Math.PI * 0.6 : Math.PI * 0.4, side > 0 ? Math.PI * 1.45 : -Math.PI * 0.45, side < 0); c.stroke();
  },
  profile(c, x, y, s, color) { // stylized head silhouette facing left
    c.fillStyle = color; c.beginPath();
    c.moveTo(x + 0.1 * s, y + 0.55 * s); c.lineTo(x - 0.05 * s, y + 0.55 * s); c.lineTo(x - 0.05 * s, y + 0.3 * s);
    c.bezierCurveTo(x - 0.45 * s, y + 0.25 * s, x - 0.5 * s, y - 0.05 * s, x - 0.38 * s, y - 0.2 * s);
    c.bezierCurveTo(x - 0.42 * s, y - 0.3 * s, x - 0.3 * s, y - 0.35 * s, x - 0.33 * s, y - 0.42 * s);
    c.bezierCurveTo(x - 0.2 * s, y - 0.62 * s, x + 0.25 * s, y - 0.62 * s, x + 0.32 * s, y - 0.3 * s);
    c.bezierCurveTo(x + 0.36 * s, y, x + 0.32 * s, y + 0.2 * s, x + 0.1 * s, y + 0.3 * s); c.closePath(); c.fill();
  },
  sun(c, x, y, r, color, rays) {
    rays = rays || 16; c.fillStyle = color; c.beginPath(); c.arc(x, y, r * 0.5, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < rays; i++) { const a = i * Math.PI * 2 / rays; c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(r * 0.55, -r * 0.09); c.lineTo(r, 0); c.lineTo(r * 0.55, r * 0.09); c.closePath(); c.fill(); c.restore(); }
  },
  flower(c, x, y, r, color) { c.fillStyle = color; for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45, r * 0.3, a, 0, Math.PI * 2); c.fill(); } c.beginPath(); c.arc(x, y, r * 0.22, 0, Math.PI * 2); c.fillStyle = '#fff'; c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1; },
  shield(c, x, y, s, fill, stroke) { c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.5); c.lineTo(x + s * 0.5, y - s * 0.5); c.lineTo(x + s * 0.5, y + s * 0.15); c.quadraticCurveTo(x + s * 0.5, y + s * 0.55, x, y + s * 0.7); c.quadraticCurveTo(x - s * 0.5, y + s * 0.55, x - s * 0.5, y + s * 0.15); c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 6; c.strokeStyle = stroke; c.stroke(); },
  crown(c, x, y, s, color) { c.fillStyle = color; c.beginPath(); c.moveTo(x - s * 0.5, y + s * 0.3); c.lineTo(x - s * 0.5, y - s * 0.2); c.lineTo(x - s * 0.25, y + s * 0.05); c.lineTo(x, y - s * 0.4); c.lineTo(x + s * 0.25, y + s * 0.05); c.lineTo(x + s * 0.5, y - s * 0.2); c.lineTo(x + s * 0.5, y + s * 0.3); c.closePath(); c.fill(); c.fillRect(x - s * 0.5, y + s * 0.32, s, s * 0.14); },
  eagle(c, x, y, s, color) { c.fillStyle = color; c.beginPath(); c.moveTo(x, y - s * 0.35); c.bezierCurveTo(x + s * 0.3, y - s * 0.6, x + s * 0.9, y - s * 0.5, x + s * 0.95, y - s * 0.1); c.bezierCurveTo(x + s * 0.6, y - s * 0.1, x + s * 0.45, y + s * 0.05, x + s * 0.15, y + s * 0.15); c.lineTo(x + s * 0.1, y + s * 0.5); c.lineTo(x - s * 0.1, y + s * 0.5); c.lineTo(x - s * 0.15, y + s * 0.15); c.bezierCurveTo(x - s * 0.45, y + s * 0.05, x - s * 0.6, y - s * 0.1, x - s * 0.95, y - s * 0.1); c.bezierCurveTo(x - s * 0.9, y - s * 0.5, x - s * 0.3, y - s * 0.6, x, y - s * 0.35); c.closePath(); c.fill(); c.beginPath(); c.arc(x, y - s * 0.4, s * 0.12, 0, Math.PI * 2); c.fill(); },
  ring(c, r0, r1, color) { c.beginPath(); c.arc(256, 256, r1, 0, Math.PI * 2); c.arc(256, 256, r0, 0, Math.PI * 2, true); c.fillStyle = color; c.fill(); },
  dots(c, r, n, color, size) { c.fillStyle = color; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; c.beginPath(); c.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, size || 3, 0, Math.PI * 2); c.fill(); } }
};
const dk = (hex, m) => rgbStr(hex2rgb(hex), m);
const COINS = [
  { id: 'cl500', name: '500 pesos', country: 'Chile', flag: '🇨🇱', outer: GOLD, inner: SILVER, innerR: 0.68, thick: 0.17, size: 1.0, ttext: 'sello',
    heads(c, i) { H.arcText(c, 'REPUBLICA DE CHILE', 205, Math.PI * 1.15, Math.PI * 1.85, 30, dk(GOLD, 0.55)); H.profile(c, 262, 250, 300, i); H.text(c, '2024', 256, 425, 26, dk(GOLD, 0.55)); },
    tails(c, i) { H.text(c, '500', 256, 235, 150, i, 800, '"Helvetica Neue", Arial, sans-serif'); H.text(c, 'PESOS', 256, 335, 40, i, 700, '"Helvetica Neue", Arial, sans-serif'); H.laurel(c, 256, 256, 200, dk(GOLD, 0.6), 1); H.laurel(c, 256, 256, 200, dk(GOLD, 0.6), -1); H.star(c, 256, 100, 22, dk(GOLD, 0.6)); } },
  { id: 'cl100', name: '100 pesos', country: 'Chile', flag: '🇨🇱', outer: SILVER, inner: GOLD, innerR: 0.68, thick: 0.17, size: 0.95, ttext: 'sello',
    heads(c, i) { H.arcText(c, 'REPUBLICA DE CHILE', 205, Math.PI * 1.15, Math.PI * 1.85, 30, dk(SILVER, 0.5)); H.profile(c, 262, 250, 300, i); H.text(c, '2023', 256, 425, 26, dk(SILVER, 0.5)); },
    tails(c, i) { H.text(c, '100', 256, 235, 150, i, 800, '"Helvetica Neue", Arial, sans-serif'); H.text(c, 'PESOS', 256, 335, 40, i, 700, '"Helvetica Neue", Arial, sans-serif'); H.laurel(c, 256, 256, 200, dk(SILVER, 0.5), 1); H.laurel(c, 256, 256, 200, dk(SILVER, 0.5), -1); H.star(c, 256, 100, 22, dk(SILVER, 0.5)); } },
  { id: 'cl10', name: '10 pesos', country: 'Chile', flag: '🇨🇱', outer: GOLD, inner: null, thick: 0.14, size: 0.82, ttext: 'sello',
    heads(c, i) { H.arcText(c, 'REPUBLICA DE CHILE', 205, Math.PI * 1.15, Math.PI * 1.85, 30, i); H.profile(c, 262, 250, 290, i); H.text(c, '2022', 256, 425, 26, i); },
    tails(c, i) { H.text(c, '10', 256, 235, 170, i); H.text(c, 'PESOS', 256, 340, 40, i); H.star(c, 256, 105, 24, i); } },
  { id: 'usq', name: 'Quarter dollar', country: 'Estados Unidos', flag: '🇺🇸', outer: SILVER, inner: null, thick: 0.14, size: 0.95, ttext: 'cruz',
    heads(c, i) { H.arcText(c, 'LIBERTY', 205, Math.PI * 1.3, Math.PI * 1.7, 34, i); H.profile(c, 262, 250, 300, i); H.arcText(c, 'IN GOD WE TRUST', 210, Math.PI * 0.2, Math.PI * 0.8, 22, i); H.text(c, '1998', 256, 420, 26, i); },
    tails(c, i) { H.arcText(c, 'UNITED STATES OF AMERICA', 210, Math.PI * 1.1, Math.PI * 1.9, 24, i); H.eagle(c, 256, 250, 190, i); H.arcText(c, 'QUARTER DOLLAR', 212, Math.PI * 0.2, Math.PI * 0.8, 26, i); } },
  { id: 'eur1', name: '1 euro', country: 'Unión Europea', flag: '🇪🇺', outer: SILVER, inner: GOLD, innerR: 0.7, thick: 0.15, size: 0.92, ttext: 'cruz',
    heads(c, i) { H.text(c, '1', 205, 250, 210, i); H.text(c, 'EURO', 300, 330, 44, i); c.strokeStyle = i; c.lineWidth = 5; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(60, 120 + k * 45); c.lineTo(140, 120 + k * 45); c.stroke(); } H.dots(c, 220, 12, dk(SILVER, 0.55), 8); },
    tails(c, i) { H.dots(c, 215, 12, i, 9); H.crown(c, 256, 240, 130, i); H.text(c, '2002', 256, 350, 30, i); } },
  { id: 'gbp1', name: '1 pound', country: 'Reino Unido', flag: '🇬🇧', outer: GOLD, inner: SILVER, innerR: 0.66, thick: 0.17, size: 0.9, sides: 12, ttext: 'cruz',
    heads(c, i) { H.profile(c, 250, 250, 300, i); H.arcText(c, 'ELIZABETH II · D · G · REG · F · D', 205, Math.PI * 1.05, Math.PI * 1.95, 22, dk(GOLD, 0.55)); H.text(c, '2017', 256, 425, 26, dk(GOLD, 0.55)); },
    tails(c, i) { H.crown(c, 256, 175, 120, i); H.flower(c, 256, 290, 55, i); H.text(c, 'ONE POUND', 256, 400, 32, dk(GOLD, 0.55)); } },
  { id: 'mx10', name: '10 pesos', country: 'México', flag: '🇲🇽', outer: GOLD, inner: SILVER, innerR: 0.66, thick: 0.17, size: 0.98, ttext: 'cruz',
    heads(c, i) { H.eagle(c, 256, 250, 170, i); H.arcText(c, 'ESTADOS UNIDOS MEXICANOS', 205, Math.PI * 1.08, Math.PI * 1.92, 24, dk(GOLD, 0.55)); },
    tails(c, i) { H.sun(c, 256, 245, 150, i, 20); c.beginPath(); c.arc(256, 245, 60, 0, Math.PI * 2); c.fillStyle = SILVER; c.fill(); H.text(c, '$10', 256, 245, 44, i); H.text(c, 'DIEZ PESOS', 256, 415, 26, dk(GOLD, 0.55)); } },
  { id: 'ar1', name: '1 peso', country: 'Argentina', flag: '🇦🇷', outer: SILVER, inner: GOLD, innerR: 0.66, thick: 0.16, size: 0.9, ttext: 'cruz',
    heads(c, i) { H.sun(c, 256, 250, 140, i, 16); H.arcText(c, 'REPUBLICA ARGENTINA', 205, Math.PI * 1.1, Math.PI * 1.9, 26, dk(SILVER, 0.5)); H.arcText(c, 'EN UNION Y LIBERTAD', 210, Math.PI * 0.15, Math.PI * 0.85, 22, dk(SILVER, 0.5)); },
    tails(c, i) { H.text(c, '1', 256, 230, 190, i); H.text(c, 'PESO', 256, 340, 46, i); H.text(c, '1995', 256, 415, 26, dk(SILVER, 0.5)); } },
  { id: 'jp100', name: '100 yen', country: 'Japón', flag: '🇯🇵', outer: SILVER, inner: null, thick: 0.13, size: 0.88, ttext: 'cruz',
    heads(c, i) { H.flower(c, 180, 200, 60, i); H.flower(c, 330, 200, 60, i); H.flower(c, 256, 320, 60, i); H.text(c, '日本国', 256, 90, 40, i, 700, 'sans-serif'); H.text(c, '百円', 256, 430, 40, i, 700, 'sans-serif'); },
    tails(c, i) { H.text(c, '100', 256, 245, 170, i, 800, '"Helvetica Neue", Arial, sans-serif'); H.text(c, '平成 30 年', 256, 400, 34, i, 700, 'sans-serif'); } },
  { id: 'br1', name: '1 real', country: 'Brasil', flag: '🇧🇷', outer: SILVER, inner: GOLD, innerR: 0.64, thick: 0.16, size: 0.92, ttext: 'cruz',
    heads(c, i) { H.profile(c, 262, 250, 280, i); H.arcText(c, 'BRASIL', 200, Math.PI * 1.32, Math.PI * 1.68, 40, dk(SILVER, 0.5)); H.dots(c, 220, 20, dk(SILVER, 0.5), 4); },
    tails(c, i) { H.text(c, '1', 256, 235, 200, i); H.text(c, 'REAL', 256, 345, 46, i); H.text(c, '2019', 256, 415, 26, dk(SILVER, 0.5)); } },
  { id: 'pe1', name: '1 sol', country: 'Perú', flag: '🇵🇪', outer: SILVER, inner: null, thick: 0.15, size: 0.9, ttext: 'cruz',
    heads(c, i) { H.shield(c, 256, 245, 190, dk(SILVER, 0.85), i); H.star(c, 256, 215, 40, i); H.arcText(c, 'BANCO CENTRAL DE RESERVA DEL PERU', 210, Math.PI * 1.05, Math.PI * 1.95, 20, i); },
    tails(c, i) { H.text(c, 'S/1', 256, 240, 150, i); H.text(c, 'UN SOL', 256, 345, 40, i); H.laurel(c, 256, 256, 205, i, 1); H.laurel(c, 256, 256, 205, i, -1); } },
  { id: 'co500', name: '500 pesos', country: 'Colombia', flag: '🇨🇴', outer: GOLD, inner: SILVER, innerR: 0.66, thick: 0.16, size: 0.92, ttext: 'cruz',
    heads(c, i) { c.fillStyle = i; c.beginPath(); c.arc(256, 260, 95, 0, Math.PI * 2); c.fill(); c.fillStyle = SILVER; c.beginPath(); c.arc(256, 260, 70, 0, Math.PI * 2); c.fill(); c.fillStyle = i; c.beginPath(); c.arc(256, 260, 40, 0, Math.PI * 2); c.fill(); H.arcText(c, 'REPUBLICA DE COLOMBIA', 205, Math.PI * 1.1, Math.PI * 1.9, 26, dk(GOLD, 0.55)); },
    tails(c, i) { H.text(c, '500', 256, 235, 150, i, 800, '"Helvetica Neue", Arial, sans-serif'); H.text(c, 'PESOS', 256, 335, 40, i); H.text(c, '2016', 256, 415, 26, dk(GOLD, 0.55)); } },
];
const coinTex = {};
function buildTex(coin) {
  if (coinTex[coin.id]) return coinTex[coin.id];
  const mk = side => {
    const cv = document.createElement('canvas'); cv.width = TEX; cv.height = TEX; const c = cv.getContext('2d');
    c.beginPath(); c.arc(256, 256, 252, 0, Math.PI * 2); c.clip();
    // base metal with soft radial sheen
    const base = coin.outer, g = c.createRadialGradient(200, 180, 20, 256, 256, 300);
    g.addColorStop(0, dk(base, 1.12)); g.addColorStop(0.6, base); g.addColorStop(1, dk(base, 0.8)); c.fillStyle = g; c.fillRect(0, 0, TEX, TEX);
    // raised rim
    H.ring(c, 232, 252, dk(base, 0.78)); H.ring(c, 226, 234, dk(base, 1.15));
    let ink = dk(base, 0.5);
    if (coin.inner) {
      const r = 236 * coin.innerR, g2 = c.createRadialGradient(220, 220, 10, 256, 256, r);
      g2.addColorStop(0, dk(coin.inner, 1.1)); g2.addColorStop(1, dk(coin.inner, 0.82));
      c.beginPath(); c.arc(256, 256, r, 0, Math.PI * 2); c.fillStyle = g2; c.fill();
      H.ring(c, r - 3, r + 2, dk(base, 0.7)); ink = dk(coin.inner, 0.45);
    }
    c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 2; c.shadowOffsetX = 1; c.shadowOffsetY = 1.5;
    coin[side](c, ink); c.restore();
    // relief highlight (light from top-left)
    c.save(); c.globalCompositeOperation = 'source-atop'; const hl = c.createLinearGradient(0, 0, TEX, TEX); hl.addColorStop(0, 'rgba(255,255,255,0.16)'); hl.addColorStop(0.5, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,0.14)'); c.fillStyle = hl; c.fillRect(0, 0, TEX, TEX); c.restore();
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
const DEFAULT_CFG = { sound: true, shake: false, haptic: true, table: 'verde', power: 1, theme: null, coin: 'cl500', n: 1, tailsName: 'sello', eco: false };
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
let W = 0, H_ = 0, DPR = 1, cam = null, bounds = { x: 6, zMin: -6, zMax: 6 }, feltCache = null;
function makeCamera() {
  const eye = [0, 15, 11], target = [0, 0.4, -0.2];
  const fwd = V.norm(V.sub(target, eye)), right = V.norm(V.cross(fwd, [0, 1, 0])), up = V.cross(right, fwd);
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
  bounds = { x: Math.min(xTop, xBot) - m, zMin: cam.unproject(W / 2, 0, 3)[2] + m, zMax: cam.unproject(W / 2, H_ - 70, 0.2)[2] - m };
  feltCache = null; needsDraw = true;
}
new ResizeObserver(resize).observe(canvas);

/* ================= Physics ================= */
const G = 40, DT = 1 / 200, REST = 0.42, FRICTION = 0.5, NR = 20;
const coins = [];
let rolling = false, rollStart = 0, needsDraw = true, lastT = 0, acc = 0;
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
    const diff = Math.max(0, V.dot(rn, LIGHT)), shade = (0.45 + 0.55 * diff) * (i & 1 ? 0.93 : 1);
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
    c.vel = [rnd(-1.5, 1.5) + (dirHint ? dirHint[0] * 4 : 0), rnd(12, 15) * p, rnd(-1.5, 1.5) + (dirHint ? dirHint[1] * 4 : 0)];
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
function renderSettings() {
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
  const stage = $('.stage'), fsBtn = $('#fsBtn');
  if (!(stage.requestFullscreen || stage.webkitRequestFullscreen)) fsBtn.style.display = 'none';
  fsBtn.addEventListener('click', () => { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (stage.requestFullscreen || stage.webkitRequestFullscreen).call(stage); });
}

applyTheme(); bind(); renderCoins(); renderStats(); resize(); setupCoins(); requestAnimationFrame(loop);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
window.MONEDA = { coins, flip, cfg, history, physicsStep, render, COINS, setupCoins, get cam() { return cam; } };
})();
