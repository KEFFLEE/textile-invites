/* מחולל הזמנות — המחלקה לעיצוב טקסטיל, שנקר
   הכול רץ בדפדפן: ציור על canvas, ייצוא PNG/PDF מקומי. */
(() => {
'use strict';

/* ---------- מיתוג ---------- */
const C = { white:'#FFFFFF', grey:'#F5F5F5', red1:'#FF4141', red2:'#FF0000', black:'#000000' };
const F = { title:'TexTitle', med:'TexMed', reg:'TexReg', thin:'TexThin', en:'TexEn' };

const FORMATS = {
  square:    { w:1080, h:1080, name:'פוסט אינסטגרם', sub:'1080x1080' },
  story:     { w:1080, h:1920, name:'סטורי', sub:'1080x1920', story:true },
  landscape: { w:1920, h:1005, name:'קאבר / לרוחב', sub:'1920x1005', wide:true },
  a4:        { w:2480, h:3508, name:'A4 להדפסה', sub:'300dpi', print:true },
};

const BGS = {
  photo: { name:'תמונה',  bg:null,    fg:C.white, accent:C.red1,  tagBg:C.red1,  tagFg:C.black, logo:C.white, grid:C.red2 },
  grey:  { name:'אפור',   bg:C.grey,  fg:C.black, accent:C.red1,  tagBg:C.red1,  tagFg:C.black, logo:C.black, grid:C.red2 },
  white: { name:'לבן',    bg:C.white, fg:C.black, accent:C.red1,  tagBg:C.red1,  tagFg:C.black, logo:C.black, grid:C.red2 },
  red:   { name:'אדום',   bg:C.red1,  fg:C.black, accent:C.white, tagBg:C.black, tagFg:C.white, logo:C.black, grid:C.white },
};

const LOGO_MODES = {
  compact: 'TEXTILE + שנקר',
  full:    'חתימה תלת-לשונית',
  textile: 'TEXTILE בלבד',
};

const TEMPLATES = {
  openday: {
    name:'יום פתוח', bgs:['photo','grey','white','red'], defBg:'photo',
    fields:[
      ['title','כותרת','text','יום פתוח'],
      ['subtitle','שורת משנה','text','במחלקה לעיצוב טקסטיל, שנקר'],
      ['date','תאריך','text','28.7'],
      ['details','פרטים (שעה, מקום)','area','יום שלישי | 16:00–20:00\nשנקר, אנה פרנק 12, רמת גן'],
      ['tag','תגית אדומה (אפשר להשאיר ריק)','text','הכניסה חופשית'],
    ],
  },
  exhibition: {
    name:'תערוכה / פתיחה', bgs:['photo','grey','white','red'], defBg:'photo',
    fields:[
      ['kicker','תגית עליונה','text','הזמנה לפתיחת תערוכה'],
      ['title','שם התערוכה','area','שם התערוכה'],
      ['namesLabel','תגית מעל השמות','text','אוצרת:'],
      ['names','שמות (אמנים/ות, אוצר/ת)','area','שם האוצרת'],
      ['day','יום','text','חמישי'],
      ['date','תאריך','text','11.12'],
      ['time','שעה','text','19:00'],
      ['place','מקום (תגית אדומה)','text','גלריית שנקר'],
    ],
  },
  submission: {
    name:'הזמנה להגשה', bgs:['grey','white','red'], defBg:'grey',
    fields:[
      ['intro','פתיח','area','לסטודנטים/ות ולמרצים/ות המחלקה'],
      ['highlight','שורה מודגשת (אדום)','area','מוזמנים/ות להגשות פרויקט הגמר של מחזור תשפ״ז'],
      ['detail','פירוט','area','ההגשות יתקיימו במהלך תערוכת הבוגרות'],
      ['dates','תאריכים (שורה לכל יום)','area','יום שני 19.7\nיום שלישי 20.7\nיום חמישי 22.7'],
      ['hours','שעות','text','בין השעות 9:30–16:30'],
      ['url','כתובת אתר','text','www.textileshenkar.com'],
      ['dept','שם המחלקה','text','המחלקה לעיצוב טקסטיל, שנקר'],
      ['tagline','שורת סיום קטנה','text','בואו להכיר עולם חדש, בואו לגעת בחומר'],
    ],
  },
};

/* ---------- מצב ---------- */
const S = {
  tpl:'openday', fmt:'square', bg:{}, logo:'compact', grid:true, credit:'',
  values:{}, photo:null, zoom:1, ox:0, oy:0, dark:0.3,
};
for (const [k,t] of Object.entries(TEMPLATES)) {
  S.bg[k] = t.defBg;
  S.values[k] = Object.fromEntries(t.fields.map(f => [f[0], f[3]]));
}
try {
  const saved = JSON.parse(localStorage.getItem('tex-invite') || 'null');
  if (saved) {
    for (const k of ['tpl','fmt','logo','grid','credit','dark']) if (k in saved) S[k] = saved[k];
    if (saved.bg) Object.assign(S.bg, saved.bg);
    if (saved.values) for (const k in saved.values) if (S.values[k]) Object.assign(S.values[k], saved.values[k]);
  }
} catch (e) { /* אין אחסון — ממשיכים */ }
function persist() {
  try { localStorage.setItem('tex-invite', JSON.stringify({tpl:S.tpl, fmt:S.fmt, logo:S.logo, grid:S.grid, credit:S.credit, dark:S.dark, bg:S.bg, values:S.values})); } catch (e) {}
}

/* ---------- לוגואים ---------- */
const logoCache = new Map();
function logoSvg(key, color) {
  const L = window.TEX_LOGOS[key];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${L.vb.join(' ')}"><g fill="${color}">${L.d.map(d => `<path d="${d}"/>`).join('')}</g></svg>`;
}
function logoImg(key, color) {
  const id = key + color;
  if (!logoCache.has(id)) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSvg(key, color));
    logoCache.set(id, img);
  }
  return logoCache.get(id);
}
function preloadLogos() {
  const jobs = [];
  for (const k of Object.keys(window.TEX_LOGOS)) for (const c of [C.white, C.black, C.red1]) {
    const img = logoImg(k, c);
    jobs.push(img.decode ? img.decode().catch(() => {}) : Promise.resolve());
  }
  return Promise.all(jobs);
}
const aspect = key => { const vb = window.TEX_LOGOS[key].vb; return vb[2] / vb[3]; };

/* ---------- טיפוגרפיה ---------- */
const ASC = {};   // גובה אות עברית ביחס לגודל הגופן
function measureAscents(ctx) {
  for (const f of Object.values(F)) {
    ctx.font = `100px "${f}"`;
    const m = ctx.measureText('אבגדהTEX0');
    ASC[f] = (m.actualBoundingBoxAscent || 72) / 100;
  }
}
const LH = 1.08;
function setFont(ctx, fam, size) { ctx.font = `${size}px "${fam}"`; }

function wrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { continue; }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const t = line + ' ' + words[i];
      if (ctx.measureText(t).width <= maxW) line = t; else { out.push(line); line = words[i]; }
    }
    out.push(line);
  }
  return out;
}

/* מוצא את הגודל הגדול ביותר שבו הטקסט נכנס; מעדיף פחות שורות כל עוד הגופן נשאר גדול */
function fitN(ctx, text, fam, maxSize, minSize, maxW, n) {
  let size = maxSize, lines = [];
  while (true) {
    setFont(ctx, fam, size);
    lines = wrap(ctx, text, maxW);
    const widest = Math.max(0, ...lines.map(l => ctx.measureText(l).width));
    if ((lines.length <= n && widest <= maxW) || size <= minSize) return { size, lines, fam, ok: lines.length <= n && widest <= maxW };
    size = Math.max(minSize, size * 0.97);
  }
}
function fit(ctx, text, fam, maxSize, minSize, maxW, maxLines) {
  const hard = String(text).split('\n').filter(t => t.trim()).length || 1;
  for (let n = Math.min(hard, maxLines); n < maxLines; n++) {
    const r = fitN(ctx, text, fam, maxSize, minSize, maxW, n);
    if (r.ok && r.size >= maxSize * 0.7) return r;
  }
  return fitN(ctx, text, fam, maxSize, minSize, maxW, maxLines);
}

function blockH(b) {
  if (!b.lines.length) return 0;
  return b.size * (ASC[b.fam] + (b.lines.length - 1) * LH);
}

/* ---------- הצייר: מודד תמיד, מצייר רק כש-draw=true ---------- */
function makePainter(ctx, W, H, draw) {
  const P = { ctx, W, H, draw };
  P.text = (b, x, y, align, color) => {
    if (P.draw && b.lines.length) {
      setFont(ctx, b.fam, b.size);
      ctx.direction = 'rtl'; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = color;
      b.lines.forEach((l, i) => ctx.fillText(l, x, y + b.size * (ASC[b.fam] + i * LH)));
    }
    return y + blockH(b);
  };
  P.width = b => { setFont(ctx, b.fam, b.size); return Math.max(0, ...b.lines.map(l => ctx.measureText(l).width)); };
  /* תגית: מלבן צבעוני עם טקסט, x הוא הקצה לפי align */
  P.tag = (text, fam, size, x, y, align, bg, fg) => {
    if (!text) return { h:0, w:0 };
    setFont(ctx, fam, size);
    const tw = ctx.measureText(text).width, padX = size * 0.32, padY = size * 0.2;
    const w = tw + padX * 2, h = size * ASC[fam] + padY * 2 + size * 0.06;
    const left = align === 'right' ? x - w : x;
    if (P.draw) {
      ctx.fillStyle = bg; ctx.fillRect(left, y, w, h);
      ctx.fillStyle = fg; ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, left + w - padX, y + padY + size * ASC[fam]);
    }
    return { h, w };
  };
  P.logo = (key, color, x, y, h) => {
    const w = h * aspect(key);
    if (P.draw) ctx.drawImage(logoImg(key, color), x, y, w, h);
    return w;
  };
  P.line = (x1, y1, x2, y2, color, lw) => {
    if (!P.draw) return;
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  };
  P.rect = (x, y, w, h, color) => { if (P.draw) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); } };
  return P;
}

/* ---------- תמונה ---------- */
let photoRect = null;   // לחישוב גרירה
function drawPhoto(P, x, y, w, h, darkOverlay) {
  photoRect = { x, y, w, h };
  if (!P.draw) return;
  const ctx = P.ctx;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (S.photo) {
    const iw = S.photo.naturalWidth, ih = S.photo.naturalHeight;
    const sc = Math.max(w / iw, h / ih) * S.zoom;
    const dw = iw * sc, dh = ih * sc;
    photoRect.dw = dw; photoRect.dh = dh;
    const dx = x + (w - dw) * (0.5 + S.ox / 2), dy = y + (h - dh) * (0.5 + S.oy / 2);
    ctx.drawImage(S.photo, dx, dy, dw, dh);
  } else {
    weave(ctx, x, y, w, h, Math.min(P.W, P.H) / 1080);
  }
  if (darkOverlay > 0) { ctx.fillStyle = `rgba(0,0,0,${darkOverlay})`; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}
/* תבנית אריג כממלא-מקום כשאין תמונה */
function weave(ctx, x, y, w, h, u) {
  ctx.fillStyle = '#c9c4bc'; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 6 * u;
  const s = 22 * u;
  for (let d = -h; d < w + h; d += s) { ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + h * 0.5, y + h); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,.06)'; ctx.lineWidth = 2 * u;
  for (let cy = y; cy < y + h; cy += 8 * u) { ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.stroke(); }
  ctx.restore();
}
/* ---------- חלקים משותפים ---------- */
function geometry(fmt) {
  const W = fmt.w, H = fmt.h, u = Math.min(W, H) / 1080;
  const m = Math.round(78 * u);
  const top = fmt.story ? Math.round(H * 0.11) : m;      // אזור בטוח בסטורי
  const bottom = fmt.story ? Math.round(H * 0.11) : m;
  return { W, H, u, m, top, bottom, lw: Math.max(1.5, 2 * u) };
}

/* חתימה תחתונה. מחזירה את ה-y העליון שלה */
function footerLogos(P, g, color, yBottom) {
  const { W, u, m } = g;
  if (S.logo === 'full') {
    const w = Math.min(W - 2 * m, 1000 * u), h = w / aspect('lockup');
    P.logo('lockup', color, W - m - w, yBottom - h, h);
    return yBottom - h;
  }
  const hW = 46 * u;
  P.logo('wordmark', color, m, yBottom - hW, hW);
  if (S.logo === 'textile') return yBottom - hW;
  const hS = 52 * u;
  const wS = hS * aspect('shenkar');
  P.logo('shenkar', color, W - m - wS, yBottom - hS, hS);
  return yBottom - Math.max(hW, hS);
}

function creditVertical(P, g, color, x, cy) {
  if (!S.credit || !P.draw) return;
  const ctx = P.ctx, size = 19 * g.u;
  ctx.save();
  ctx.translate(x, cy); ctx.rotate(Math.PI / 2);
  setFont(ctx, F.reg, size); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(S.credit, 0, 0);
  ctx.restore();
}

function background(P, g, th, withPhoto) {
  if (withPhoto) drawPhoto(P, 0, 0, g.W, g.H, S.dark);
  else { photoRect = null; P.rect(0, 0, g.W, g.H, th.bg); }
}

/* ---------- תבניות ---------- */
/* כל תבנית מקבלת s (קנה מידה לטקסט) ומחזירה ok=false אם יש התנגשות */
const LAYOUTS = {

  openday(P, g, th, v, s, fmt) {
    const { W, H, u, m, top, bottom } = g;
    const colW = fmt.wide ? W * 0.56 : W - 2 * m;
    const R = W - m;
    background(P, g, th, th === BGS.photo);
    let y = top;
    const t = fit(P.ctx, v.title, F.title, 270 * u * s, 60 * u, colW, 2);
    y = P.text(t, R + t.size * 0.02, y, 'right', th.fg);
    if (v.subtitle) {
      y += 34 * u * s;
      const b = fit(P.ctx, v.subtitle, F.med, 58 * u * s, 26 * u, colW, 2);
      y = P.text(b, R, y, 'right', th.fg);
    }
    if (v.date) {
      y += 40 * u * s;
      const b = fit(P.ctx, v.date, F.title, 150 * u * s, 50 * u, colW, 2);
      y = P.text(b, R, y, 'right', th.fg);
    }
    if (v.details) {
      y += 36 * u * s;
      const b = fit(P.ctx, v.details, F.reg, 46 * u * s, 24 * u, colW, 4);
      y = P.text(b, R, y, 'right', th.fg);
    }
    if (v.tag) {
      y += 30 * u * s;
      y += P.tag(v.tag, F.med, 40 * u * s, R, y, 'right', th.tagBg, th.tagFg).h;
    }
    const logosTop = footerLogos(P, g, th.logo, H - bottom);
    if (S.grid) {
      const ly = y + 44 * u;
      P.line(W * (fmt.wide ? 0.3 : 0.42), ly, W, ly, th.grid, g.lw);
      P.line(m * 0.5, ly - 120 * u, m * 0.5, H, th.grid, g.lw);
    }
    creditVertical(P, g, th.fg, W - m * 0.45, (y + logosTop) / 2 + 40 * u);
    return y + 60 * u < logosTop;
  },

  exhibition(P, g, th, v, s, fmt) {
    const { W, H, u, m, top, bottom } = g;
    const R = W - m;
    background(P, g, th, th === BGS.photo);
    let y = top;
    if (v.kicker) y += P.tag(v.kicker, F.med, 40 * u * s, R, y, 'right', th.tagBg, th.tagFg).h + 30 * u * s;
    const titleW = fmt.wide ? W * 0.62 : W - 2 * m;
    const t = fit(P.ctx, v.title, F.title, 200 * u * s, 56 * u, titleW, 3);
    y = P.text(t, R + t.size * 0.02, y, 'right', th.fg);
    const titleBottom = y;

    // אזור תחתון: עמודת תאריך משמאל, שמות מימין
    const logosTop = footerLogos(P, g, th.logo, H - bottom);
    const zoneBottom = logosTop - 64 * u;
    const leftW = fmt.wide ? W * 0.3 : (W - 2 * m) * 0.44;
    const rightW = fmt.wide ? W * 0.36 : (W - 2 * m) * 0.5;

    // עמודה שמאלית — מלמטה למעלה
    const placeSize = 38 * u * s;
    let placeH = 0;
    if (v.place) { P.draw = false; placeH = P.tag(v.place, F.med, placeSize, m, 0, 'left', th.tagBg, th.tagFg).h; P.draw = g.draw; }
    const dl = [v.day, v.date, v.time].filter(Boolean).join('\n');
    const d = fit(P.ctx, dl, F.title, 120 * u * s, 40 * u, leftW, 3);
    const dH = blockH(d);
    const dTop = zoneBottom - (placeH ? placeH + 22 * u : 0) - dH;
    P.text(d, m, dTop, 'left', th.fg);
    if (v.place) P.tag(v.place, F.med, placeSize, m, dTop + dH + 22 * u, 'left', th.tagBg, th.tagFg);

    // עמודה ימנית — שמות מיושרים לתחתית
    const n = fit(P.ctx, v.names, F.title, 76 * u * s, 30 * u, rightW, 3);
    const nH = blockH(n);
    const nTop = zoneBottom - nH;
    P.text(n, R, nTop, 'right', th.fg);
    let labelH = 0;
    if (v.namesLabel) {
      P.draw = false; labelH = P.tag(v.namesLabel, F.med, 36 * u * s, R, 0, 'right', th.tagBg, th.tagFg).h; P.draw = g.draw;
      P.tag(v.namesLabel, F.med, 36 * u * s, R, nTop - labelH - 20 * u, 'right', th.tagBg, th.tagFg);
    }
    const rightTop = nTop - (labelH ? labelH + 20 * u : 0);
    const zoneTop = Math.min(dTop, rightTop);

    if (S.grid) {
      const ly = zoneTop - 48 * u;
      P.line(0, ly, W * 0.58, ly, th.grid, g.lw);
      P.line(m * 0.5, ly, m * 0.5, H, th.grid, g.lw);
    }
    creditVertical(P, g, th.fg, W - m * 0.45, (titleBottom + rightTop) / 2);
    const gap = 70 * u;
    // הכותרת לא נוגעת באזור התחתון; בפורמט רחב, רק בצד ימין
    return titleBottom + gap < (fmt.wide ? rightTop : zoneTop);
  },

  submission(P, g, th, v, s, fmt) {
    const { W, H, u, m, top, bottom } = g;
    P.rect(0, 0, W, H, th.bg);
    const panelL = fmt.wide ? W * 0.5 : 0;     // בפורמט רחב: תמונה משמאל, טקסט מימין
    const pm = panelL + m, R = W - m, colW = R - pm;

    // לוגואים עליונים
    const hW = 46 * u, hS = 52 * u;
    let logosH = hW;
    if (S.logo === 'full') {
      const w = Math.min(colW, 1000 * u), h = w / aspect('lockup');
      P.logo('lockup', th.logo, R - w, top, h); logosH = h;
    } else {
      P.logo('wordmark', th.logo, pm, top, hW);
      if (S.logo === 'compact') { P.logo('shenkar', th.logo, R - hS * aspect('shenkar'), top, hS); logosH = hS; }
    }
    let y = top + logosH + 60 * u * s;
    const intro = fit(P.ctx, v.intro, F.reg, 56 * u * s, 24 * u, colW, 3);
    y = P.text(intro, R, y, 'right', th.fg);
    if (v.highlight) {
      y += 16 * u * s;
      const b = fit(P.ctx, v.highlight, F.med, 60 * u * s, 26 * u, colW, 4);
      y = P.text(b, R, y, 'right', th.accent);
    }
    if (v.detail) {
      y += 16 * u * s;
      const b = fit(P.ctx, v.detail, F.reg, 56 * u * s, 24 * u, colW, 3);
      y = P.text(b, R, y, 'right', th.fg);
    }
    const textBottom = y;

    // כותרת תחתונה
    const url = v.url ? fit(P.ctx, v.url, F.en, 34 * u * s, 18 * u, colW, 1) : { lines:[], size:0, fam:F.en };
    const dept = v.dept ? fit(P.ctx, v.dept, F.reg, 44 * u * s, 20 * u, colW, 2) : { lines:[], size:0, fam:F.reg };
    const tl = v.tagline ? fit(P.ctx, v.tagline, F.reg, 24 * u * s, 14 * u, colW, 2) : { lines:[], size:0, fam:F.reg };
    const gapF = 14 * u;
    const footH = blockH(url) + blockH(dept) + blockH(tl) + gapF * 2;
    const footTop = H - bottom - footH;
    let fy = footTop;
    fy = P.text(url, R, fy, 'right', th.fg) + gapF;
    fy = P.text(dept, R, fy, 'right', th.accent) + gapF;
    P.text(tl, R, fy, 'right', th.fg);

    // תאריכים
    const dSize = 66 * u * s;
    const dates = fit(P.ctx, v.dates, F.title, dSize, 28 * u, colW * 0.9, 5);
    const hours = v.hours ? fit(P.ctx, v.hours, F.title, dSize * 0.92, 26 * u, colW * 0.95, 2) : null;
    let ok;

    if (fmt.wide) {
      drawPhoto(P, 0, 0, panelL, H, 0);
      let dy = textBottom + 50 * u * s;
      dy = P.text(dates, R, dy, 'right', th.fg);
      if (hours) dy = P.text(hours, R, dy + 26 * u * s, 'right', th.fg);
      ok = dy + 40 * u < footTop;
      if (S.grid) {
        P.line(panelL, textBottom + 26 * u * s, W, textBottom + 26 * u * s, th.grid, g.lw);
        P.line(pm - m * 0.5, 0, pm - m * 0.5, H, th.grid, g.lw);
      }
      creditVertical(P, g, C.white, panelL - m * 0.4, H / 2);
    } else {
      const phTop = textBottom + 70 * u * s;
      const phBottom = footTop - 50 * u;
      drawPhoto(P, 0, phTop, W, phBottom - phTop, 0);
      // תוויות על התמונה, מלמטה למעלה
      const labels = [];
      dates.lines.forEach(l => labels.push({ t:l, size:dates.size }));
      if (hours) hours.lines.forEach((l, i) => labels.push({ t:l, size:hours.size, gapBefore: i === 0 }));
      let ly = phBottom - 44 * u;
      const step = lb => lb.size * (ASC[F.title] + 0.4) + 8 * u;
      for (let i = labels.length - 1; i >= 0; i--) {
        const lb = labels[i];
        ly -= step(lb);
        P.tag(lb.t, F.title, lb.size, R + lb.size * 0.32, ly, 'right', th.bg, th.fg);
        if (lb.gapBefore) ly -= 22 * u;
      }
      ok = (ly - phTop) > 0.12 * H || (ly - phTop) > 120 * u;
      ok = ok && (phBottom - phTop) > H * 0.24;
      if (S.grid) {
        const gy = textBottom + 34 * u * s;
        P.line(0, gy, W * 0.66, gy, th.grid, g.lw);
        P.line(m * 0.5, top - 20 * u, m * 0.5, gy + 60 * u, th.grid, g.lw);
        P.line(W * 0.3, phBottom + 24 * u, W, phBottom + 24 * u, th.grid, g.lw);
      }
      creditVertical(P, g, th.fg, W - m * 0.45, (phTop + phBottom) / 2);
    }
    return ok;
  },
};

/* ---------- רינדור ---------- */
function render(canvas, fmtKey) {
  const fmt = FORMATS[fmtKey];
  canvas.width = fmt.w; canvas.height = fmt.h;
  const ctx = canvas.getContext('2d');
  const tpl = S.tpl, th = BGS[S.bg[tpl]], v = S.values[tpl];
  const g = geometry(fmt);
  const layout = LAYOUTS[tpl];
  // מוצאים קנה מידה שבו אין התנגשויות, ואז מציירים
  let s = 1;
  for (; s > 0.5; s -= 0.05) {
    g.draw = false;
    if (layout(makePainter(ctx, fmt.w, fmt.h, false), g, th, v, s, fmt)) break;
  }
  g.draw = true;
  ctx.clearRect(0, 0, fmt.w, fmt.h);
  layout(makePainter(ctx, fmt.w, fmt.h, true), g, th, v, s, fmt);
}

/* ---------- ממשק ---------- */
const $ = id => document.getElementById(id);
const out = $('out');

function chips(el, items, current, onPick) {
  el.innerHTML = '';
  for (const [k, label, sub] of items) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', k === current);
    b.innerHTML = label + (sub ? `<small>${sub}</small>` : '');
    b.onclick = () => onPick(k);
    el.appendChild(b);
  }
}

function buildUI() {
  chips($('tplChips'), Object.entries(TEMPLATES).map(([k, t]) => [k, t.name]), S.tpl, k => { S.tpl = k; buildUI(); update(); });
  chips($('fmtChips'), Object.entries(FORMATS).map(([k, f]) => [k, f.name, f.sub]), S.fmt, k => { S.fmt = k; buildUI(); update(); });
  const t = TEMPLATES[S.tpl];
  if (!t.bgs.includes(S.bg[S.tpl])) S.bg[S.tpl] = t.defBg;
  chips($('bgChips'), t.bgs.map(k => [k, BGS[k].name]), S.bg[S.tpl], k => { S.bg[S.tpl] = k; buildUI(); update(); });
  chips($('logoChips'), Object.entries(LOGO_MODES), S.logo, k => { S.logo = k; buildUI(); update(); });

  const usesPhoto = S.tpl === 'submission' || S.bg[S.tpl] === 'photo';
  $('photoArea').style.display = usesPhoto ? '' : 'none';
  $('photoCtl').hidden = !S.photo;
  $('pDark').parentElement.style.display = S.tpl === 'submission' ? 'none' : '';

  const box = $('fields'); box.innerHTML = '';
  for (const [k, label, type] of t.fields) {
    const l = document.createElement('label'); l.className = 'f';
    const inp = document.createElement(type === 'area' ? 'textarea' : 'input');
    if (type !== 'area') inp.type = 'text';
    inp.value = S.values[S.tpl][k];
    inp.oninput = () => { S.values[S.tpl][k] = inp.value; update(); };
    l.innerHTML = `<span>${label}</span>`; l.appendChild(inp); box.appendChild(l);
  }
  $('gridOn').checked = S.grid;
  $('credit').value = S.credit;
  $('pDark').value = S.dark;
  const f = FORMATS[S.fmt];
  $('sizeHint').textContent = `${f.name} · ${f.w}x${f.h} פיקסלים` + (f.story ? ' · השוליים העליונים והתחתונים שמורים לממשק של אינסטגרם' : '');
}

let raf = 0;
function update() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => { render(out, S.fmt); persist(); });
}

/* תמונה: העלאה, גרירה למיקום */
function loadPhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const img = new Image();
  img.onload = () => { S.photo = img; S.zoom = 1; S.ox = 0; S.oy = 0; $('pZoom').value = 1; buildUI(); update(); };
  img.src = URL.createObjectURL(file);
}
$('photoIn').onchange = e => loadPhoto(e.target.files[0]);
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); if (S.tpl !== 'submission' && S.bg[S.tpl] !== 'photo') { S.bg[S.tpl] = 'photo'; } loadPhoto(e.dataTransfer.files[0]); });
$('pZoom').oninput = e => { S.zoom = +e.target.value; update(); };
$('pDark').oninput = e => { S.dark = +e.target.value; update(); };
$('pRemove').onclick = () => { S.photo = null; buildUI(); update(); };
$('credit').oninput = e => { S.credit = e.target.value; update(); };
$('gridOn').onchange = e => { S.grid = e.target.checked; update(); };

let drag = null;
out.addEventListener('pointerdown', e => {
  if (!S.photo || !photoRect || !photoRect.dw) return;
  drag = { x:e.clientX, y:e.clientY, ox:S.ox, oy:S.oy };
  out.setPointerCapture(e.pointerId); out.classList.add('dragging');
});
out.addEventListener('pointermove', e => {
  if (!drag) return;
  const k = out.width / out.getBoundingClientRect().width;
  const ex = photoRect.w - photoRect.dw, ey = photoRect.h - photoRect.dh;
  if (ex < -1) S.ox = Math.max(-1, Math.min(1, drag.ox + (e.clientX - drag.x) * k * 2 / ex));
  if (ey < -1) S.oy = Math.max(-1, Math.min(1, drag.oy + (e.clientY - drag.y) * k * 2 / ey));
  update();
});
const endDrag = () => { drag = null; out.classList.remove('dragging'); };
out.addEventListener('pointerup', endDrag);
out.addEventListener('pointercancel', endDrag);

/* ייצוא */
function fileBase(fmtKey) {
  const v = S.values[S.tpl];
  const name = (v.title || TEMPLATES[S.tpl].name).replace(/\s+/g, '-').replace(/[\\/:*?"<>|\n]/g, '').slice(0, 40);
  return `textile_${name}_${fmtKey}`;
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function pngOf(fmtKey) {
  return new Promise(res => { const c = document.createElement('canvas'); render(c, fmtKey); c.toBlob(b => res(b), 'image/png'); });
}
function pdfOf(fmtKey) {
  const c = document.createElement('canvas'); render(c, fmtKey);
  const f = FORMATS[fmtKey];
  const { jsPDF } = window.jspdf;
  const doc = f.print
    ? new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' })
    : new jsPDF({ unit:'px', format:[f.w, f.h], orientation: f.w > f.h ? 'landscape' : 'portrait', hotfixes:['px_scaling'] });
  const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
  doc.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pw, ph);
  return doc.output('blob');
}
$('dlPng').onclick = async () => download(await pngOf(S.fmt), fileBase(S.fmt) + '.png');
$('dlPdf').onclick = () => download(pdfOf(S.fmt), fileBase(S.fmt) + '.pdf');
$('dlAll').onclick = async () => {
  for (const k of Object.keys(FORMATS)) {
    download(await pngOf(k), fileBase(k) + '.png');
    await new Promise(r => setTimeout(r, 400));
  }
  render(out, S.fmt);
};

/* הפעלה */
$('hdrLogo').src = logoImg('wordmark', C.black).src;
const fontsReady = Promise.all(Object.values(F).map(f => document.fonts.load(`40px "${f}"`, 'אבג ABC 123'))).catch(() => {});
Promise.all([fontsReady, preloadLogos()]).then(() => {
  measureAscents(out.getContext('2d'));
  buildUI(); render(out, S.fmt);
  window.__ready = true;
});
/* אם גופן מסתיים להיטען מאוחר — מציירים מחדש */
const refresh = () => { if (!window.__ready) return; measureAscents(out.getContext('2d')); render(out, S.fmt); };
document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', refresh);
document.fonts.ready.then(refresh);
window.__S = S; window.__render = render; window.__buildUI = buildUI;
})();
