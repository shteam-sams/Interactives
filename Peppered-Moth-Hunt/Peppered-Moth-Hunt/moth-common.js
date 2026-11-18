/* Peppered Moth Hunt — shared engine (scene, moths, drawing, results).
   Used by display.html, join.html and control.html. */
"use strict";

/* ===== Settings you may change ===== */
const CONFIG = {
  // Leave null to use the free PeerJS cloud server.
  // To self-host: { host: 'peer.example.com', port: 443, path: '/', secure: true }
  peerServer: null,
  peerPrefix: "pepmoth-v1-",   // keeps our room ids separate from other PeerJS apps
  channel: "pepperedmoth"      // BroadcastChannel name shared by display + control
};

/* Optional override for testing or self-hosting: add ?peer=host:port to any page URL. */
(() => {
  const p = new URLSearchParams(location.search).get("peer");
  if (!p) return;
  const [host, port] = p.split(":");
  const secure = location.protocol === "https:";
  CONFIG.peerServer = { host, port: +(port || (secure ? 443 : 80)), path: "/", secure };
  CONFIG.peerParam = p;
})();

/* ===== constants ===== */
const W = 1600, H = 1000, CS = 3;
const MASK = ["....#...#....", ".....###.....", "#############", "#############", ".###########.", "..#########..", "...#######...", "....#####....", "......#......"];
const MC = 13, MR = MASK.length;
const CELLS = [], CELLIDX = MASK.map(() => Array(MC).fill(-1));
MASK.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "#") { CELLIDX[r][c] = CELLS.length; CELLS.push([c, r]); } }));
const MIRROR = CELLS.map(([c, r]) => CELLIDX[r][MC - 1 - c]);
const NC = CELLS.length, BLANK = "f2f0e8";
const CW = 176, CH = 110;
const CODE_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ";

/* ===== helpers ===== */
const $ = s => document.querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k]; if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex2 = n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
const toHex = ([r, g, b]) => hex2(r) + hex2(g) + hex2(b);
const fromHex = s => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
const lum = ([r, g, b]) => .299 * r + .587 * g + .114 * b;
function cdist(a, b) { const rm = (a[0] + b[0]) / 2, dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db); }
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
function newCode() { let s = ""; for (let i = 0; i < 5; i++) s += CODE_ALPHA[Math.floor(Math.random() * CODE_ALPHA.length)]; return s; }
const cleanName = (s, n = 20) => String(s || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);
const validCells = s => typeof s === "string" && s.length === NC * 6 && /^[0-9a-f]+$/i.test(s);
let toastT;
function toast(msg) { let t = $("#toast"); if (!t) { t = h("div", { id: "toast", role: "status", "aria-live": "polite" }); document.body.append(t); } t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2600); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

/* ===== scene generation (deterministic from seed) ===== */
function sootFor(x) { const t = clamp((x / W - .28) / .5, 0, 1); return t * t * (3 - 2 * t); }
function genScene(seed) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  const r = rng(seed), R = (a, b) => a + (b - a) * r(), pick = a => a[Math.floor(r() * a.length)];
  const mix = (c, s) => { const k = 1 - s * .72; return `rgb(${Math.round(c[0] * k + 18 * s)},${Math.round(c[1] * k + 16 * s)},${Math.round(c[2] * k + 14 * s)})`; };
  const mixA = (c, s, a) => { const k = 1 - s * .72; return `rgba(${Math.round(c[0] * k + 18 * s)},${Math.round(c[1] * k + 16 * s)},${Math.round(c[2] * k + 14 * s)},${a})`; };
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#c3cbb9"); gr.addColorStop(.55, "#88957b"); gr.addColorStop(1, "#4c5743"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(60,50,40,0)"); gr.addColorStop(.5, "rgba(62,54,46,.18)"); gr.addColorStop(1, "rgba(40,36,32,.62)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // distant trunks (soft)
  for (let i = 0; i < 54; i++) {
    const x = R(-20, W), w = R(8, 36), s = sootFor(x), l = R(150, 205), a = R(.18, .38);
    for (let k = 0; k < 3; k++) { g.fillStyle = mixA([l, l + 4, l - 8], s, a / (k + 1)); g.fillRect(x - k * 2, -10, w + k * 4, H * .82); }
  }
  g.fillStyle = "rgba(205,210,195,.16)"; g.fillRect(0, 0, W, H);
  // ground + leaf litter
  g.fillStyle = "#4f3f2c"; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 40) g.lineTo(x, 835 + Math.sin(x * .01) * 14 + R(-6, 6)); g.lineTo(W, H); g.fill();
  const litter = [[156, 96, 48], [184, 128, 60], [120, 74, 40], [200, 160, 92], [96, 66, 38], [150, 140, 80], [90, 100, 52], [170, 80, 40]];
  for (let i = 0; i < 3200; i++) { const x = R(0, W), y = R(822, H + 10), s = sootFor(x) * R(.7, 1.1); g.fillStyle = mix(pick(litter), clamp(s, 0, 1)); g.beginPath(); g.ellipse(x, y, R(4, 11), R(2, 5), R(0, Math.PI), 0, Math.PI * 2); g.fill(); }
  // stone wall (left)
  const stones = [[150, 150, 140], [176, 172, 160], [128, 126, 118], [190, 186, 172]];
  for (let y = 730; y < 1000; y += 34) {
    for (let x = -20 + (Math.floor(y / 34) % 2) * 28; x < 470; x += R(48, 70)) {
      const w = R(44, 66), hh = R(26, 32); g.fillStyle = mix(pick(stones), sootFor(x) * .6);
      g.beginPath(); if (g.roundRect) g.roundRect(x, y + R(-2, 2), w, hh, 8); else g.rect(x, y, w, hh); g.fill();
      g.strokeStyle = "rgba(30,30,26,.45)"; g.lineWidth = 2; g.stroke();
      const n = R(4, 14);
      for (let k = 0; k < n; k++) { g.fillStyle = pick(["#c7d0a2", "#dfe2c9", "#9fae6e", "#e8e3b0", "#6f8a3c"]); g.globalAlpha = .8; g.beginPath(); g.arc(x + R(4, w - 4), y + R(4, hh - 4), R(1.5, 5), 0, 7); g.fill(); }
      g.globalAlpha = 1;
    }
  }
  // sooty brick wall (right)
  const bricks = [[150, 62, 44], [128, 52, 38], [164, 82, 58], [112, 46, 36]];
  for (let y = 690, row = 0; y < 990; y += 20, row++) for (let x = 1170 - (row % 2) * 24; x < W + 50; x += 48) { const s = clamp(.55 + R(0, .4) + (y < 760 ? .15 : 0), 0, 1); g.fillStyle = mix(pick(bricks), s); g.fillRect(x, y, 45, 17); }
  g.fillStyle = "rgba(22,20,18,.22)"; g.fillRect(1146, 690, W - 1146, 300);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(14,12,10,${R(.08, .25)})`; g.fillRect(R(1150, W), 690, R(4, 18), R(60, 300)); }
  // trunks
  const trunks = [];
  [90, 300, 520, 770, 1010, 1250, 1470].forEach(x0 => { const cx = x0 + R(-40, 40), w = R(108, 190); trunks.push({ cx, w, type: r() < .5 ? "birch" : "oak", s: clamp(sootFor(cx) * R(.85, 1.15), 0, 1), base: R(880, 985) }); });
  for (const t of trunks) drawTrunk(g, t, r, R, pick, mix, mixA);
  // branches
  for (let i = 0; i < 9; i++) {
    const t = pick(trunks), dir = r() < .5 ? -1 : 1, y = R(140, 520), len = R(110, 240);
    const x1 = t.cx + dir * t.w * .42, x2 = x1 + dir * len, y2 = y - R(40, 140);
    g.strokeStyle = mix(t.type === "birch" ? [205, 203, 192] : [104, 90, 76], t.s); g.lineCap = "round"; g.lineWidth = R(10, 20);
    g.beginPath(); g.moveTo(x1, y); g.quadraticCurveTo((x1 + x2) / 2, y - R(0, 40), x2, y2); g.stroke();
    for (let k = 0; k < 26; k++) { const u = r(), bx = x1 + (x2 - x1) * u, by = y + (y2 - y) * u + R(-5, 5); g.fillStyle = mixA(pick([[205, 214, 170], [226, 228, 210], [150, 170, 110]]), t.s * .9, .8); g.beginPath(); g.arc(bx, by, R(1.5, 4), 0, 7); g.fill(); }
  }
  // canopy
  const greens = [[62, 96, 48], [84, 120, 58], [110, 142, 70], [48, 74, 40], [140, 150, 70], [176, 150, 64]];
  for (let i = 0; i < 38; i++) { const cx = R(-40, W + 40), cy = R(-30, 150), s = sootFor(cx) * .55; for (let k = 0; k < 55; k++) { g.fillStyle = mix(pick(greens), s); g.beginPath(); g.ellipse(cx + R(-70, 70), cy + R(-40, 40), R(6, 13), R(3, 6), R(0, Math.PI), 0, 7); g.fill(); } }
  // ivy
  for (let i = 0; i < 2; i++) { const t = pick(trunks); for (let k = 0; k < 70; k++) { g.fillStyle = mix(pick([[52, 86, 44], [70, 108, 52], [40, 66, 36]]), t.s * .6); const y = R(t.base - 380, t.base - 20); g.beginPath(); g.ellipse(t.cx + R(-t.w * .45, -t.w * .1), y, R(5, 9), R(4, 7), R(0, 3), 0, 7); g.fill(); } }
  // film grain
  const id = g.getImageData(0, 0, W, H), d = id.data; let q = seed * 7 + 3;
  for (let i = 0; i < d.length; i += 4) { q = (q * 1103515245 + 12345) & 0x7fffffff; const n = ((q >> 16) & 31) - 15; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
  return cv;
}
function drawTrunk(g, t, r, R, pick, mix, mixA) {
  const L = [], Rt = [], half = t.w / 2;
  for (let y = -20; y <= t.base; y += 20) {
    const fl = y > t.base - 110 ? Math.pow((y - (t.base - 110)) / 110, 2) * 34 : 0;
    L.push([t.cx - half - fl + Math.sin(y * .013 + t.cx) * 4 + R(-1.5, 1.5), y]); Rt.push([t.cx + half + fl + Math.sin(y * .011 + t.w) * 4 + R(-1.5, 1.5), y]);
  }
  const path = new Path2D(); path.moveTo(...L[0]); L.forEach(p => path.lineTo(...p)); Rt.reverse().forEach(p => path.lineTo(...p)); path.closePath();
  const base = t.type === "birch" ? [226, 223, 212] : [110, 96, 80];
  g.save(); g.fillStyle = mix(base, t.s); g.fill(path); g.clip(path);
  const x0 = t.cx - half - 40, x1 = t.cx + half + 40;
  if (t.type === "oak") {
    for (let i = 0; i < 260; i++) { const x = R(x0, x1), y = R(-20, t.base), len = R(50, 200), dark = r() < .6; g.strokeStyle = dark ? mixA([58, 48, 38], t.s, .7) : mixA([150, 136, 116], t.s, .55); g.lineWidth = R(1, 4); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + R(-6, 6), y + len / 2, x + R(-4, 4), y + len); g.stroke(); }
  } else {
    for (let i = 0; i < 190; i++) { g.fillStyle = mixA([40, 38, 34], t.s * .5, R(.55, .9)); g.beginPath(); g.ellipse(R(x0, x1), R(-20, t.base), R(4, 17), R(1, 2.6), 0, 0, 7); g.fill(); }
    for (let i = 0; i < 22; i++) { const x = R(x0 + 30, x1 - 30), y = R(0, t.base); g.fillStyle = mixA([30, 28, 26], t.s * .4, .85); g.beginPath(); g.moveTo(x - R(8, 20), y); g.lineTo(x, y - R(5, 12)); g.lineTo(x + R(8, 20), y); g.lineTo(x, y + R(5, 12)); g.fill(); }
  }
  const lich = [[200, 210, 168], [226, 229, 212], [168, 184, 130], [214, 222, 180], [236, 232, 200], [150, 170, 112]];
  const nCl = Math.round(R(10, 22) * Math.pow(1 - t.s, 1.6)) + 1;
  for (let i = 0; i < nCl; i++) { const cx = R(x0 + 40, x1 - 40), cy = R(0, t.base), sp = R(14, 40), n = R(30, 80); for (let k = 0; k < n; k++) { g.fillStyle = mixA(pick(lich), t.s * .85, R(.6, .9)); g.beginPath(); g.arc(cx + R(-sp, sp), cy + R(-sp * 1.3, sp * 1.3), R(1.2, 5.5), 0, 7); g.fill(); } }
  for (let k = 0; k < 160; k++) { g.fillStyle = mixA(pick([[78, 110, 46], [96, 128, 56], [60, 90, 40]]), t.s * .7, .8); g.beginPath(); g.arc(R(x0, x1), t.base - Math.pow(r(), 2) * 120, R(1.5, 4), 0, 7); g.fill(); }
  for (let i = 0; i < 1400; i++) { g.fillStyle = r() < .5 ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.28)"; g.fillRect(R(x0, x1), R(-20, t.base), 1.5, 1.5); }
  if (t.s > .15) for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(16,14,12,${.16 * t.s})`; g.fillRect(R(x0, x1), R(-20, t.base), R(4, 16), R(80, 400)); }
  const sh = g.createLinearGradient(t.cx - half, 0, t.cx + half, 0); sh.addColorStop(0, "rgba(0,0,0,.42)"); sh.addColorStop(.3, "rgba(255,255,255,.05)"); sh.addColorStop(.55, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.5)");
  g.fillStyle = sh; g.fillRect(x0, -20, x1 - x0, t.base + 40);
  g.restore();
}
function photoCanvas(dataUrl) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d"); const s = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * s, hh = img.naturalHeight * s; g.drawImage(img, (W - w) / 2, (H - hh) / 2, w, hh); res(cv); };
    img.onerror = rej; img.src = dataUrl;
  });
}
/* Turn an uploaded File into a 1600x1000 JPEG data URL (small enough to send to every student). */
async function fileToSceneDataUrl(file) {
  const url = URL.createObjectURL(file);
  try { const cv = await photoCanvas(url); return cv.toDataURL("image/jpeg", .82); } finally { URL.revokeObjectURL(url); }
}
/* A Scene = canvas + pixel data. */
async function makeScene(seed, photo) {
  let cv = null;
  if (photo) { try { cv = await photoCanvas(photo); } catch (e) { cv = null; } }
  if (!cv) cv = genScene(seed || 1);
  return { canvas: cv, data: cv.getContext("2d").getImageData(0, 0, W, H).data };
}
function px(scene, x, y) { x = clamp(Math.floor(x), 0, W - 1); y = clamp(Math.floor(y), 0, H - 1); const i = (y * W + x) * 4, d = scene.data; return [d[i], d[i + 1], d[i + 2]]; }

/* ===== moths ===== */
const orig = m => ({ x0: Math.round(m.x) - 19, y0: Math.round(m.y) - 13 });
function parseCells(s) { const a = []; for (let i = 0; i < NC; i++) a.push(s.slice(i * 6, i * 6 + 6)); return a; }
function drawCells(g, m, cells, sx, sy, s) {
  const o = orig(m), pad = s < 2 ? .4 : 0;
  for (let i = 0; i < NC; i++) { const [c, r] = CELLS[i]; g.fillStyle = "#" + cells[i]; g.fillRect((o.x0 + c * CS - sx) * s, (o.y0 + r * CS - sy) * s, CS * s + pad, CS * s + pad); }
}
function cellAt(m, wx, wy) { const o = orig(m), c = Math.floor((wx - o.x0) / CS), r = Math.floor((wy - o.y0) / CS); if (r < 0 || r >= MR || c < 0 || c >= MC) return -1; return CELLIDX[r][c]; }
function hitMoth(m, wx, wy) { for (const [dx, dy] of [[0, 0], [-3, 0], [3, 0], [0, -3], [0, 3], [-3, -3], [3, 3], [-3, 3], [3, -3]]) if (cellAt(m, wx + dx, wy + dy) >= 0) return true; return false; }
function cropRect(m) { return { x: Math.round(clamp(m.x - CW / 2, 0, W - CW)), y: Math.round(clamp(m.y - CH / 2, 0, H - CH)), w: CW, h: CH }; }
function drawGhost(g, m, sx, sy, s) {
  const o = orig(m); g.fillStyle = "rgba(255,255,255,.55)";
  for (const [c, r] of CELLS) g.fillRect((o.x0 + c * CS - sx) * s, (o.y0 + r * CS - sy) * s, CS * s, CS * s);
  g.strokeStyle = "rgba(20,20,20,.9)"; g.lineWidth = Math.max(1, s * .5); g.setLineDash([4, 3]); g.strokeRect((o.x0 - sx) * s - 2, (o.y0 - sy) * s - 2, MC * CS * s + 4, MR * CS * s + 4); g.setLineDash([]);
}
function drawRing(g, x, y, rad, a = 1, color = "#e0b44a") { g.save(); g.globalAlpha = a; g.lineWidth = Math.max(2, rad * .09); g.strokeStyle = "rgba(0,0,0,.55)"; g.beginPath(); g.arc(x, y, rad + 1.5, 0, 7); g.stroke(); g.strokeStyle = color; g.beginPath(); g.arc(x, y, rad, 0, 7); g.stroke(); g.restore(); }
function drawCrop(cv, scene, m, scale, opt = {}) {
  const cr = cropRect(m); cv.width = cr.w * scale; cv.height = cr.h * scale; const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(scene.canvas, cr.x, cr.y, cr.w, cr.h, 0, 0, cv.width, cv.height);
  for (const o of (opt.moths || [m])) drawCells(g, o, parseCells(o.cells), cr.x, cr.y, scale);
  if (opt.ghost) drawGhost(g, m, cr.x, cr.y, scale);
  if (opt.ring) drawRing(g, (m.x - cr.x) * scale, (m.y - cr.y) * scale, 28 * scale, opt.ringAlpha ?? 1);
  return cr;
}
function matchScore(scene, m) {
  const cells = parseCells(m.cells), o = orig(m); let tot = 0;
  for (let i = 0; i < NC; i++) {
    const [c, r] = CELLS[i]; const a = [0, 0, 0];
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) { const p = px(scene, o.x0 + c * CS + dx, o.y0 + r * CS + dy); a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; }
    tot += cdist(fromHex(cells[i]), a.map(v => v / 9));
  }
  return Math.round(100 * clamp(1 - (tot / NC) / 260, 0, 1));
}
function paletteFor(scene, cr, k = 12) {
  const pts = []; for (let y = cr.y; y < cr.y + cr.h; y += 2) for (let x = cr.x; x < cr.x + cr.w; x += 2) pts.push(px(scene, x, y));
  pts.sort((a, b) => lum(a) - lum(b)); let cen = []; for (let i = 0; i < k; i++) cen.push(pts[Math.floor((i + .5) / k * pts.length)].slice());
  for (let it = 0; it < 8; it++) {
    const sum = cen.map(() => [0, 0, 0, 0]);
    for (const p of pts) { let bi = 0, bd = 1e9; for (let j = 0; j < cen.length; j++) { const d = (p[0] - cen[j][0]) ** 2 + (p[1] - cen[j][1]) ** 2 + (p[2] - cen[j][2]) ** 2; if (d < bd) { bd = d; bi = j; } } const s = sum[bi]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; }
    cen = cen.map((c, j) => sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c);
  }
  const out = []; for (const c of cen.sort((a, b) => lum(a) - lum(b))) if (!out.some(o => cdist(o, c) < 18)) out.push(c);
  return out.map(toHex);
}
/* Computer-made practice moths: half blend in, half stand out. */
function makeBots(scene, n, taken) {
  const made = [];
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = Math.round(30 + Math.random() * (W - 60)); y = Math.round(24 + Math.random() * (H - 48)); tries++; } while (tries < 80 && [...taken, ...made].some(m => Math.hypot(m.x - x, m.y - y) < 44));
    const good = i % 2 === 0, o = { x0: x - 19, y0: y - 13 }, off = lum(px(scene, x, y)) > 120 ? [62, 58, 52] : [226, 222, 208];
    const j = () => (Math.random() - .5) * 26;
    const cells = CELLS.map(([c, r]) => { const p = px(scene, o.x0 + c * 3 + 1, o.y0 + r * 3 + 1); return toHex(good ? [p[0] + j(), p[1] + j(), p[2] + j()] : [off[0] + j(), off[1] + j(), off[2] + j()]); }).join("");
    made.push({ id: "bot-" + newId(), x, y, cells });
  }
  return made;
}

/* ===== results ===== */
/* moths: [{id, owner, x, y, cells, name, maker, bot}]
   hunters: Map(hunterId -> Set(found moth ids)), times: Map(mothId -> first found time) */
function rankMoths(scene, moths, hunters, times) {
  const rows = moths.map(m => {
    let elig = 0, found = 0; for (const [hid, set] of hunters) { if (hid === m.owner) continue; elig++; if (set.has(m.id)) found++; }
    return { id: m.id, owner: m.owner, name: m.name, maker: m.maker, bot: !!m.bot, x: m.x, y: m.y, cells: m.cells, found, elig, pct: elig ? found / elig : 0, first: times.get(m.id) || 0, match: matchScore(scene, m) };
  });
  rows.sort((a, b) => a.pct - b.pct || (b.first || 9e15) - (a.first || 9e15) || b.match - a.match);
  rows.forEach((r, i) => r.rank = i + 1);
  return rows;
}
function drawChart(box, rows) {
  box.replaceChildren(h("h3", { text: "Did camouflage matter?" }), h("p", { class: "small", text: "Each dot is a moth. Color match compares every square of the moth with the bark, lichen, or brick right under it." }));
  if (rows.length < 2) return;
  const w = 640, hh = 300, L = 52, B = 44, T = 12, Rr = 16, xs = v => L + v / 100 * (w - L - Rr), ys = v => T + (1 - v) * (hh - T - B);
  const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", `0 0 ${w} ${hh}`); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Scatter plot of color match versus share of birds that found each moth");
  const el = (t, a, txt) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.append(e); return e; };
  for (const v of [0, .25, .5, .75, 1]) { el("line", { x1: L, x2: w - Rr, y1: ys(v), y2: ys(v), stroke: "var(--line)" }); el("text", { x: L - 8, y: ys(v) + 4, "text-anchor": "end", "font-size": 12, fill: "var(--muted)" }, Math.round(v * 100) + "%"); }
  for (const v of [0, 25, 50, 75, 100]) el("text", { x: xs(v), y: hh - B + 18, "text-anchor": "middle", "font-size": 12, fill: "var(--muted)" }, v);
  el("text", { x: (L + w - Rr) / 2, y: hh - 6, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)" }, "Color match with background (%)");
  el("text", { x: 14, y: (T + hh - B) / 2, "text-anchor": "middle", "font-size": 13, fill: "var(--muted)", transform: `rotate(-90 14 ${(T + hh - B) / 2})` }, "Birds that found it");
  for (const r of rows) { const c = el("circle", { cx: xs(r.match), cy: ys(r.pct), r: r.rank <= 3 ? 7 : 5.5, fill: r.rank <= 3 ? "var(--gold)" : "var(--moss)", "fill-opacity": .85, stroke: "var(--surface)", "stroke-width": 1.5 }); const t = document.createElementNS(ns, "title"); t.textContent = `${r.name}: match ${r.match}%, found by ${Math.round(r.pct * 100)}%`; c.append(t); }
  box.append(svg);
  const n = rows.length, mx = rows.reduce((a, r) => a + r.match, 0) / n, my = rows.reduce((a, r) => a + r.pct, 0) / n; let sxy = 0, sxx = 0, syy = 0;
  for (const r of rows) { sxy += (r.match - mx) * (r.pct - my); sxx += (r.match - mx) ** 2; syy += (r.pct - my) ** 2; }
  const cor = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
  box.append(h("p", { text: cor < -.3 ? "Moths that matched their background were found less often. That's natural selection: the environment decides which colors survive." : cor > .3 ? "Surprise: better-matched moths were found more often this round. Why might that be? Easy spots to search? Remembering where friends hid?" : "No clear pattern this round. With more moths or more rounds, does matching the background start to matter?" }));
}

/* ===== pan / zoom / click view ===== */
function makeView(cv, { image, onClick, overlay, maxZoom = 6, maxH = .72 }) {
  const v = { z: 1, vx: 0, vy: 0, cw: 1, ch: 1, dpr: 1 }; const g = cv.getContext("2d"); let lastW = 0;
  v.k = () => v.cw * v.z / W; v.toWorld = (x, y) => [v.vx + x / v.k(), v.vy + y / v.k()]; v.toScreen = (x, y) => [(x - v.vx) * v.k(), (y - v.vy) * v.k()];
  const cl = () => { v.vx = clamp(v.vx, 0, W - W / v.z); v.vy = clamp(v.vy, 0, H - H / v.z); };
  v.draw = () => { g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0); g.clearRect(0, 0, v.cw, v.ch); const img = image(); if (img) { g.imageSmoothingEnabled = v.z < 2.5; g.drawImage(img, v.vx, v.vy, W / v.z, H / v.z, 0, 0, v.cw, v.ch); } overlay && overlay(g, v); };
  const size = () => {
    const w = cv.parentElement.clientWidth; if (!w || w === lastW) return; lastW = w;
    const mh = Math.max(260, innerHeight * maxH); let cw = w, ch = w * H / W; if (ch > mh) { ch = mh; cw = ch * W / H; }
    v.dpr = devicePixelRatio || 1; v.cw = cw; v.ch = ch; cv.style.width = cw + "px"; cv.style.height = ch + "px"; cv.width = Math.round(cw * v.dpr); cv.height = Math.round(ch * v.dpr); cl(); v.draw();
  };
  v.zoomAt = (f, x = v.cw / 2, y = v.ch / 2) => { const [wx, wy] = v.toWorld(x, y); v.z = clamp(v.z * f, 1, maxZoom); v.vx = wx - x / v.k(); v.vy = wy - y / v.k(); cl(); v.draw(); };
  v.reset = () => { v.z = 1; v.vx = 0; v.vy = 0; v.draw(); };
  const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  let down = null;
  cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); down = { x, y, vx: v.vx, vy: v.vy, drag: false }; });
  cv.addEventListener("pointermove", e => { if (!down) return; const [x, y] = pos(e), dx = x - down.x, dy = y - down.y; if (!down.drag && Math.hypot(dx, dy) > 7 && v.z > 1) down.drag = true; if (down.drag) { v.vx = down.vx - dx / v.k(); v.vy = down.vy - dy / v.k(); cl(); v.draw(); cv.style.cursor = "grabbing"; } });
  cv.addEventListener("pointerup", e => { if (down && !down.drag && onClick) { const [x, y] = pos(e); onClick(...v.toWorld(x, y)); } down = null; cv.style.cursor = ""; });
  cv.addEventListener("pointercancel", () => { down = null; });
  cv.addEventListener("wheel", e => { e.preventDefault(); const [x, y] = pos(e); v.zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, x, y); }, { passive: false });
  const ro = new ResizeObserver(size); ro.observe(cv.parentElement); v.destroy = () => ro.disconnect();
  requestAnimationFrame(size);
  return v;
}
function zoomBar(v) {
  return h("div", { class: "zoombar" }, h("button", { class: "btn small", "aria-label": "Zoom out", text: "−", onclick: () => v.zoomAt(1 / 1.5) }),
    h("button", { class: "btn small", "aria-label": "Zoom in", text: "+", onclick: () => v.zoomAt(1.5) }), h("button", { class: "btn small", text: "Whole forest", onclick: () => v.reset() }));
}

/* ===== confetti ===== */
function confetti(host, isStopped) {
  if (reduceMotion) return; const c = h("canvas", { class: "confetti" }); host.append(c); const g = c.getContext("2d");
  c.width = innerWidth; c.height = innerHeight;
  const cols = ["#e0b44a", "#f2f0e8", "#8dbd67", "#c9d1b4", "#3b3732", "#b9532b"];
  const ps = Array.from({ length: 170 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .6, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6, s: 4 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], w: Math.random() * 6 }));
  const t0 = performance.now();
  const step = () => {
    if (isStopped() || !c.isConnected) return; g.clearRect(0, 0, c.width, c.height); const t = performance.now() - t0;
    for (const p of ps) { p.x += p.vx + Math.sin(t / 300 + p.w); p.y += p.vy; p.r += .05; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.beginPath(); g.moveTo(0, -p.s * .6); g.lineTo(p.s, p.s * .3); g.lineTo(0, p.s * .6); g.lineTo(-p.s, p.s * .3); g.fill(); g.restore(); }
    if (t < 5500) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}
