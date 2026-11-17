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
  photo: { name:'תמונה',  photo:true, bg:null,    fg:C.white, accent:C.red1,  tagBg:C.red1,  tagFg:C.black, logo:C.white, grid:C.red2 },
  grey:  { name:'אפור',   bg:C.grey,  fg:C.black, accent:C.red1,  tagBg:C.red1,  tagFg:C.black, logo:C.black, grid:C.red2 },
  white: { name:'לבן',    bg:C.white, fg:C.black, accent:C.red1,  tagBg:C.red1,  tagFg:C.black, logo:C.black, grid:C.red2 },
  red:   { name:'אדום',   bg:C.red1,  fg:C.black, accent:C.white, tagBg:C.black, tagFg:C.white, logo:C.black, grid:C.white },
  black: { name:'שחור',   bg:C.black, fg:C.white, accent:C.red1,  tagBg:C.red1,  tagFg:C.black, logo:C.white, grid:C.red2 },
};
/* צבעים לשדה בודד: ערכים קבועים או 'fg'/'acc' לפי ערכת הצבעים */
const COLOR_OPTS = [['fg','ראשי'],['acc','הדגשה'],['#000000','שחור'],['#FFFFFF','לבן'],['#FF4141','אדום']];
const FONT_OPTS = [['','ברירת מחדל'],[F.title,'כותרת (Black / Medium)'],[F.med,'Narkis Medium'],[F.reg,'Narkis Regular'],[F.thin,'Narkis Thin'],[F.en,'Franklin Gothic']];
function lum(hex) { const n = parseInt(String(hex).slice(1), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }


// לוגו TEXTILE אינו בשימוש עוד — רק החתימה התלת-לשונית העדכנית
const LOGO_MODES = {
  full:    'חתימה תלת-לשונית',
};

const TEMPLATES = {
  openday: {
    name:'יום פתוח', bgs:['photo','grey','white','red','black'], defBg:'photo',
    fields:[
      ['title','כותרת','text','יום פתוח'],
      ['subtitle','שורת משנה','text','במחלקה לעיצוב טקסטיל, שנקר'],
      ['date','תאריך','text','28.7'],
      ['details','פרטים (שעה, מקום)','area','יום שלישי | 16:00–20:00\nשנקר, אנה פרנק 12, רמת גן'],
      ['tag','תגית אדומה (אפשר להשאיר ריק)','text','הכניסה חופשית'],
    ],
  },
  exhibition: {
    name:'תערוכה / פתיחה', bgs:['photo','grey','white','red','black'], defBg:'photo',
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
    name:'הזמנה להגשה / מפגש מחלקתי', bgs:['grey','white','red','black'], defBg:'grey',
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
  tpl:'openday', fmt:'square', bg:{}, logo:'full', logoColor:'auto', grid:true, credit:'',
  custom:{}, fx:{}, colW:100, name:'', docId:null,
  values:{}, photo:null, dark:0.3,
  img:{ zoom:1, px:0, py:0, rot:0, flip:false, fit:'cover', op:1, blend:'source-over', gray:false, base:'#000000' },
};
for (const [k,t] of Object.entries(TEMPLATES)) {
  S.bg[k] = t.defBg; S.custom[k] = null; S.fx[k] = {};
  S.values[k] = Object.fromEntries(t.fields.map(f => [f[0], f[3]]));
}
try {
  const saved = JSON.parse(localStorage.getItem('tex-invite') || 'null');
  if (saved) {
    for (const k of ['tpl','fmt','logo','logoColor','grid','credit','dark','colW']) if (k in saved) S[k] = saved[k];
    if (saved.custom) Object.assign(S.custom, saved.custom);
    if (saved.fx) for (const k in saved.fx) if (S.fx[k]) Object.assign(S.fx[k], saved.fx[k]);
    if (saved.img) for (const k of ['fit','op','blend','gray','base']) if (k in saved.img) S.img[k] = saved.img[k];
    if (!(S.logo in LOGO_MODES)) S.logo = 'full';
    if (saved.bg) Object.assign(S.bg, saved.bg);
    if (saved.values) for (const k in saved.values) if (S.values[k]) Object.assign(S.values[k], saved.values[k]);
  }
} catch (e) { /* אין אחסון — ממשיכים */ }
function stateOf() {
  return JSON.parse(JSON.stringify({tpl:S.tpl, fmt:S.fmt, logo:S.logo, logoColor:S.logoColor, grid:S.grid, credit:S.credit, dark:S.dark, colW:S.colW, img:S.img, bg:S.bg, values:S.values, custom:S.custom, fx:S.fx}));
}
function applyState(st) {
  for (const k of ['tpl','fmt','logo','logoColor','grid','credit','dark','colW']) if (k in st) S[k] = st[k];
  if (!(S.logo in LOGO_MODES)) S.logo = 'full';
  if (!(S.tpl in TEMPLATES)) S.tpl = 'openday';
  if (!(S.fmt in FORMATS)) S.fmt = 'square';
  if (st.img) Object.assign(S.img, st.img);
  for (const k of Object.keys(TEMPLATES)) {
    if (st.bg && st.bg[k]) S.bg[k] = st.bg[k];
    S.custom[k] = st.custom && st.custom[k] || null;
    S.fx[k] = st.fx && st.fx[k] || {};
    if (st.values && st.values[k]) Object.assign(S.values[k], st.values[k]);
  }
}
function persist() {
  try { localStorage.setItem('tex-invite', JSON.stringify(stateOf())); } catch (e) {}
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
      ctx.fillStyle = b.color || color;
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
  /* תגית עם הגדרות שדה */
  P.tagK = (k, text, fam, size, x, y, align, bg, fg) => {
    const f = fxOf(k), c = colorOpt(f.color);
    return P.tag(text, fam, size * f.size, x, y, align, c || bg, c ? (lum(c) > 0.45 ? C.black : C.white) : fg);
  };
  P.logo = (key, color, x, y, h) => {
    const w = h * aspect(key);
    if (P.draw) {
      if (color === 'auto') {   // לפי בהירות מה שמתחת ללוגו
        color = C.black;
        try {
          const d = ctx.getImageData(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)).data;
          let t = 0, n = 0;
          for (let i = 0; i < d.length; i += 64) { t += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; }
          color = t / n < 0.5 ? C.white : C.black;
        } catch (e) {}
      }
      ctx.drawImage(logoImg(key, color), x, y, w, h);
    }
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
const PHOTO_BASES = [['#000000','שחור'],[C.red1,'אדום'],[C.grey,'אפור'],[C.white,'לבן']];
let photoRect = null;   // אזור התמונה האחרון (לגרירה ויישור)
function photoGeom(R) {
  const I = S.img, iw = S.photo.naturalWidth, ih = S.photo.naturalHeight;
  const fitS = I.fit === 'contain' ? Math.min(R.w / iw, R.h / ih) : Math.max(R.w / iw, R.h / ih);
  const sc = fitS * I.zoom;
  return { dw: iw * sc, dh: ih * sc, cx: R.x + R.w / 2 + I.px * R.w, cy: R.y + R.h / 2 + I.py * R.h };
}
function drawPhoto(P, x, y, w, h, darkOverlay) {
  photoRect = { x, y, w, h };
  if (!P.draw) return;
  const ctx = P.ctx, I = S.img;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (S.photo) {
    ctx.fillStyle = I.base; ctx.fillRect(x, y, w, h);
    const G = photoGeom(photoRect);
    ctx.save();
    ctx.globalAlpha = I.op; ctx.globalCompositeOperation = I.blend;
    if (I.gray) ctx.filter = 'grayscale(1)';
    ctx.translate(G.cx, G.cy); ctx.rotate((I.rot || 0) * Math.PI / 180); if (I.flip) ctx.scale(-1, 1);
    ctx.drawImage(S.photo, -G.dw / 2, -G.dh / 2, G.dw, G.dh);
    ctx.restore();
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
    const colW = (fmt.wide ? W * 0.56 : W - 2 * m) * CW();
    const R = W - m;
    background(P, g, th, th.photo);
    let y = top;
    const t = fitK('title', P.ctx, v.title, F.title, 270 * u * s, 60 * u, colW, 2);
    y = P.text(t, R + t.size * 0.02, y, 'right', th.fg);
    if (v.subtitle) {
      y += 34 * u * s;
      const b = fitK('subtitle', P.ctx, v.subtitle, F.med, 58 * u * s, 26 * u, colW, 2);
      y = P.text(b, R, y, 'right', th.fg);
    }
    if (v.date) {
      y += 40 * u * s;
      const b = fitK('date', P.ctx, v.date, F.title, 150 * u * s, 50 * u, colW, 2);
      y = P.text(b, R, y, 'right', th.fg);
    }
    if (v.details) {
      y += 36 * u * s;
      const b = fitK('details', P.ctx, v.details, F.reg, 46 * u * s, 24 * u, colW, 4);
      y = P.text(b, R, y, 'right', th.fg);
    }
    if (v.tag) {
      y += 30 * u * s;
      y += P.tagK('tag', v.tag, F.med, 40 * u * s, R, y, 'right', th.tagBg, th.tagFg).h;
    }
    const logosTop = footerLogos(P, g, logoCol(th), H - bottom);
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
    background(P, g, th, th.photo);
    let y = top;
    if (v.kicker) y += P.tagK('kicker', v.kicker, F.med, 40 * u * s, R, y, 'right', th.tagBg, th.tagFg).h + 30 * u * s;
    const titleW = (fmt.wide ? W * 0.62 : W - 2 * m) * CW();
    const t = fitK('title', P.ctx, v.title, F.title, 200 * u * s, 56 * u, titleW, 3);
    y = P.text(t, R + t.size * 0.02, y, 'right', th.fg);
    const titleBottom = y;

    // אזור תחתון: עמודת תאריך משמאל, שמות מימין
    const logosTop = footerLogos(P, g, logoCol(th), H - bottom);
    const zoneBottom = logosTop - 64 * u;
    const leftW = fmt.wide ? W * 0.3 : (W - 2 * m) * 0.44;
    const rightW = (fmt.wide ? W * 0.36 : (W - 2 * m) * 0.5) * Math.min(1, CW() + 0.2);

    // עמודה שמאלית — מלמטה למעלה
    const placeSize = 38 * u * s;
    let placeH = 0;
    if (v.place) { P.draw = false; placeH = P.tagK('place', v.place, F.med, placeSize, m, 0, 'left', th.tagBg, th.tagFg).h; P.draw = g.draw; }
    const dl = [v.day, v.date, v.time].filter(Boolean).join('\n');
    const d = fitK('date', P.ctx, dl, F.title, 120 * u * s, 40 * u, leftW, 3);
    const dH = blockH(d);
    const dTop = zoneBottom - (placeH ? placeH + 22 * u : 0) - dH;
    P.text(d, m, dTop, 'left', th.fg);
    if (v.place) P.tagK('place', v.place, F.med, placeSize, m, dTop + dH + 22 * u, 'left', th.tagBg, th.tagFg);

    // עמודה ימנית — שמות מיושרים לתחתית
    const n = fitK('names', P.ctx, v.names, F.title, 76 * u * s, 30 * u, rightW, 3);
    const nH = blockH(n);
    const nTop = zoneBottom - nH;
    P.text(n, R, nTop, 'right', th.fg);
    let labelH = 0;
    if (v.namesLabel) {
      P.draw = false; labelH = P.tagK('namesLabel', v.namesLabel, F.med, 36 * u * s, R, 0, 'right', th.tagBg, th.tagFg).h; P.draw = g.draw;
      P.tagK('namesLabel', v.namesLabel, F.med, 36 * u * s, R, nTop - labelH - 20 * u, 'right', th.tagBg, th.tagFg);
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
    const pm = panelL + m, R = W - m, colW = R - pm, tW = colW * CW();

    // לוגואים עליונים
    const hW = 46 * u, hS = 52 * u;
    let logosH = hW;
    if (S.logo === 'full') {
      const w = Math.min(colW, 1000 * u), h = w / aspect('lockup');
      P.logo('lockup', logoCol(th), R - w, top, h); logosH = h;
    } else {
      P.logo('wordmark', th.logo, pm, top, hW);
      if (S.logo === 'compact') { P.logo('shenkar', th.logo, R - hS * aspect('shenkar'), top, hS); logosH = hS; }
    }
    let y = top + logosH + 60 * u * s;
    const intro = fitK('intro', P.ctx, v.intro, F.reg, 56 * u * s, 24 * u, tW, 3);
    y = P.text(intro, R, y, 'right', th.fg);
    if (v.highlight) {
      y += 16 * u * s;
      const b = fitK('highlight', P.ctx, v.highlight, F.med, 60 * u * s, 26 * u, tW, 4);
      y = P.text(b, R, y, 'right', th.accent);
    }
    if (v.detail) {
      y += 16 * u * s;
      const b = fitK('detail', P.ctx, v.detail, F.reg, 56 * u * s, 24 * u, tW, 3);
      y = P.text(b, R, y, 'right', th.fg);
    }
    const textBottom = y;

    // כותרת תחתונה
    const url = v.url ? fitK('url', P.ctx, v.url, F.en, 34 * u * s, 18 * u, colW, 1) : { lines:[], size:0, fam:F.en };
    const dept = v.dept ? fitK('dept', P.ctx, v.dept, F.reg, 44 * u * s, 20 * u, colW, 2) : { lines:[], size:0, fam:F.reg };
    const tl = v.tagline ? fitK('tagline', P.ctx, v.tagline, F.reg, 24 * u * s, 14 * u, colW, 2) : { lines:[], size:0, fam:F.reg };
    const gapF = 14 * u;
    const footH = blockH(url) + blockH(dept) + blockH(tl) + gapF * 2;
    const footTop = H - bottom - footH;
    let fy = footTop;
    fy = P.text(url, R, fy, 'right', th.fg) + gapF;
    fy = P.text(dept, R, fy, 'right', th.accent) + gapF;
    P.text(tl, R, fy, 'right', th.fg);

    // תאריכים
    const dSize = 66 * u * s;
    const dates = fitK('dates', P.ctx, v.dates, F.title, dSize, 28 * u, tW * 0.9, 5);
    const hours = v.hours ? fitK('hours', P.ctx, v.hours, F.title, dSize * 0.92, 26 * u, tW * 0.95, 2) : null;
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
      dates.lines.forEach(l => labels.push({ t:l, size:dates.size, fam:dates.fam, color:dates.color }));
      if (hours) hours.lines.forEach((l, i) => labels.push({ t:l, size:hours.size, fam:hours.fam, color:hours.color, gapBefore: i === 0 }));
      let ly = phBottom - 44 * u;
      const step = lb => lb.size * (ASC[lb.fam] + 0.4) + 8 * u;
      for (let i = labels.length - 1; i >= 0; i--) {
        const lb = labels[i];
        ly -= step(lb);
        P.tag(lb.t, lb.fam, lb.size, R + lb.size * 0.32, ly, 'right', th.photo ? C.white : th.bg, lb.color || (th.photo ? C.black : th.fg));
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

/* ---------- ערכת צבעים פעילה (כולל צבעים מותאמים) ---------- */
let CUR_TH = BGS.grey;
function themeFor(tpl) {
  const base = BGS[S.bg[tpl]] || BGS.grey, c = S.custom[tpl], th = { ...base };
  if (!c) return th;
  if (c.bg) { th.bg = c.bg; if (!base.photo) th.logo = lum(c.bg) < 0.5 ? C.white : C.black; }
  if (c.fg) th.fg = c.fg;
  if (c.acc) {
    th.accent = c.acc; th.tagBg = c.acc; th.tagFg = lum(c.acc) > 0.45 ? C.black : C.white;
    th.grid = c.acc.toUpperCase() === C.red1 ? C.red2 : c.acc;
  }
  return th;
}
function colorOpt(v) {
  if (!v) return null;
  if (v === 'fg') return CUR_TH.fg;
  if (v === 'acc') return CUR_TH.accent;
  return v;
}
const fxOf = k => Object.assign({ size:1, color:null, font:'' }, S.fx[S.tpl][k] || {});
/* fit עם הגדרות השדה: גודל, פונט וצבע */
function fitK(k, ctx, text, fam, maxSize, minSize, maxW, maxLines) {
  const f = fxOf(k);
  const r = fit(ctx, text, fam, maxSize * f.size, minSize * Math.min(1, f.size), maxW, maxLines);
  r.color = colorOpt(f.color);
  return r;
}
const CW = () => S.colW / 100;
const logoCol = th => S.logoColor === 'auto' ? 'auto' : S.logoColor;

/* ---------- רינדור ---------- */
function render(canvas, fmtKey) {
  const fmt = FORMATS[fmtKey];
  canvas.width = fmt.w; canvas.height = fmt.h;
  const ctx = canvas.getContext('2d');
  const tpl = S.tpl, th = themeFor(tpl), v = S.values[tpl];
  CUR_TH = th;
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
  const ok = layout(makePainter(ctx, fmt.w, fmt.h, true), g, th, v, Math.max(s, 0.5), fmt);
  return { s, ok };
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

  const usesPhoto = S.tpl === 'submission' || S.bg[S.tpl] === 'photo';
  $('photoArea').style.display = usesPhoto ? '' : 'none';
  $('photoCtl').hidden = !S.photo;
  $('pDark').parentElement.style.display = S.tpl === 'submission' ? 'none' : '';

  buildFields(t);
  // צבעים מותאמים
  const th = themeFor(S.tpl);
  $('cBg').value = (th.bg || S.img.base || '#000000').toLowerCase();
  $('cFg').value = th.fg.toLowerCase();
  $('cAcc').value = th.accent.toLowerCase();
  $('cReset').disabled = !S.custom[S.tpl];
  $('colW').value = S.colW; $('vColW').textContent = S.colW + '%';
  $('logoColor').value = S.logoColor;
  $('invName').value = S.name || '';
  $('saveHint').textContent = S.docId ? 'פתוחה הזמנה שמורה. שמירה תעדכן אותה או תיצור עותק.' : '';
  $('gridOn').checked = S.grid;
  $('credit').value = S.credit;
  $('pDark').value = S.dark;
  syncPhotoUI();
  const f = FORMATS[S.fmt];
  $('sizeHint').textContent = `${f.name} · ${f.w}x${f.h} פיקסלים` + (f.story ? ' · השוליים העליונים והתחתונים שמורים לממשק של אינסטגרם' : '');
}

/* שדות תוכן עם הגדרות עיצוב (גודל, צבע) */
const openFx = new Set();
function buildFields(t) {
  const box = $('fields'); box.innerHTML = '';
  for (const [k, label, type] of t.fields) {
    const d = document.createElement('div'); d.className = 'field';
    const f = fxOf(k);
    const isCustom = f.size !== 1 || f.color;
    if (openFx.has(S.tpl + k)) d.classList.add('open');
    if (isCustom) d.classList.add('custom');
    d.innerHTML = `<div class="fh"><span></span><button type="button">עיצוב${isCustom ? ' •' : ''}</button></div>
      <div class="fx">
        <label class="f"><span>גודל <b class="val"></b></span><input type="range" min="0.5" max="1.8" step="0.05"></label>
        <div class="sw"></div>
        <button class="btn small" type="button" data-reset>איפוס עיצוב השדה</button>
      </div>`;
    d.querySelector('.fh span').textContent = label;
    const inp = document.createElement(type === 'area' ? 'textarea' : 'input');
    if (type !== 'area') inp.type = 'text';
    inp.value = S.values[S.tpl][k];
    inp.oninput = () => { S.values[S.tpl][k] = inp.value; update(); };
    d.querySelector('.fh').after(inp);
    const setFx = (key, val) => { S.fx[S.tpl][k] = Object.assign(fxOf(k), { [key]: val }); buildFields(t); update(); };
    d.querySelector('.fh button').onclick = () => { const id = S.tpl + k; openFx.has(id) ? openFx.delete(id) : openFx.add(id); d.classList.toggle('open'); };
    const rng = d.querySelector('input[type=range]'), val = d.querySelector('.val');
    rng.value = f.size; val.textContent = Math.round(f.size * 100) + '%';
    rng.oninput = () => { S.fx[S.tpl][k] = Object.assign(fxOf(k), { size: +rng.value }); val.textContent = Math.round(rng.value * 100) + '%'; update(); };
    rng.onchange = () => buildFields(t);
    const sw = d.querySelector('.sw');
    for (const [v, n] of [['', 'ברירת מחדל'], ...COLOR_OPTS]) {
      const b = document.createElement('button'); b.type = 'button';
      const c = v ? colorOpt(v) || v : null;
      b.innerHTML = (c ? `<i style="background:${c}"></i>` : '') + n;
      if ((f.color || '') === v) b.classList.add('on');
      b.onclick = () => setFx('color', v || null);
      sw.appendChild(b);
    }
    d.querySelector('[data-reset]').onclick = () => { delete S.fx[S.tpl][k]; buildFields(t); update(); };
    box.appendChild(d);
  }
}

let raf = 0;
function update() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const r = render(out, S.fmt);
    const w = $('warn');
    const msg = !r.ok ? 'יש התנגשות בין טקסטים — קצרו טקסט, הקטינו גדלים או הרחיבו את עמודת הטקסט.'
      : r.s < 0.999 ? 'הטקסט הוקטן אוטומטית כדי להישאר בשוליים.' : '';
    w.textContent = msg; w.style.display = msg ? 'block' : 'none';
    persist();
  });
}

/* תמונה: העלאה, שליטה, גרירה */
const resetPos = () => Object.assign(S.img, { zoom:1, px:0, py:0, rot:0, flip:false });
function loadPhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const img = new Image();
  img.onload = () => { S.photo = img; photoData = null; resetPos(); buildUI(); update(); };
  img.src = URL.createObjectURL(file);
}
function syncPhotoUI() {
  const I = S.img;
  $('pZoom').value = I.zoom; $('pRot').value = I.rot; $('pPx').value = I.px; $('pPy').value = I.py;
  $('pFlip').checked = I.flip; $('pOp').value = I.op; $('pBlend').value = I.blend; $('pGray').checked = I.gray;
  $('vZoom').textContent = Math.round(I.zoom * 100) + '%'; $('vRot').textContent = I.rot + '°';
  document.querySelectorAll('#pFit .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.v === I.fit));
  chips($('pBase'), PHOTO_BASES, I.base, k => { S.img.base = k; syncPhotoUI(); update(); });
}
const imgSet = (k, v) => { S.img[k] = v; syncPhotoUI(); update(); };
$('photoIn').onchange = e => { loadPhoto(e.target.files[0]); e.target.value = ''; };
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => { e.preventDefault(); if (S.tpl !== 'submission' && S.bg[S.tpl] !== 'photo') { S.bg[S.tpl] = 'photo'; } loadPhoto(e.dataTransfer.files[0]); });
$('pZoom').oninput = e => imgSet('zoom', +e.target.value);
$('pRot').oninput  = e => imgSet('rot', +e.target.value);
$('pPx').oninput   = e => imgSet('px', +e.target.value);
$('pPy').oninput   = e => imgSet('py', +e.target.value);
$('pOp').oninput   = e => imgSet('op', +e.target.value);
$('pFlip').onchange  = e => imgSet('flip', e.target.checked);
$('pGray').onchange  = e => imgSet('gray', e.target.checked);
$('pBlend').onchange = e => imgSet('blend', e.target.value);
$('pReset').onclick = () => { resetPos(); syncPhotoUI(); update(); };
document.querySelectorAll('#pFit .chip').forEach(b => b.onclick = () => { S.img.fit = b.dataset.v; S.img.zoom = 1; syncPhotoUI(); update(); });
for (const ay of [-1, 0, 1]) for (const ax of [-1, 0, 1]) {
  const b = document.createElement('button'); b.type = 'button'; b.title = 'יישור התמונה';
  b.onclick = () => {
    if (!S.photo || !photoRect) return;
    const G = photoGeom(photoRect);
    S.img.px = ax * (photoRect.w - G.dw) / (2 * photoRect.w);
    S.img.py = ay * (photoRect.h - G.dh) / (2 * photoRect.h);
    syncPhotoUI(); update();
  };
  $('pAnchor').appendChild(b);
}
$('pDark').oninput = e => { S.dark = +e.target.value; update(); };
$('pRemove').onclick = () => { S.photo = null; photoData = null; buildUI(); update(); };
$('credit').oninput = e => { S.credit = e.target.value; update(); };
$('gridOn').onchange = e => { S.grid = e.target.checked; update(); };

const clampP = v => Math.max(-1.5, Math.min(1.5, v));
let drag = null;
out.addEventListener('pointerdown', e => {
  if (!S.photo || !photoRect) return;
  drag = { x:e.clientX, y:e.clientY, px:S.img.px, py:S.img.py };
  out.setPointerCapture(e.pointerId); out.classList.add('dragging');
});
out.addEventListener('pointermove', e => {
  if (!drag) return;
  const k = out.width / out.getBoundingClientRect().width;
  S.img.px = clampP(drag.px + (e.clientX - drag.x) * k / photoRect.w);
  S.img.py = clampP(drag.py + (e.clientY - drag.y) * k / photoRect.h);
  syncPhotoUI(); update();
});
const endDrag = () => { drag = null; out.classList.remove('dragging'); };
out.addEventListener('pointerup', endDrag);
out.addEventListener('pointercancel', endDrag);
out.addEventListener('wheel', e => {
  if (!S.photo || !photoRect) return;
  e.preventDefault();
  S.img.zoom = Math.max(0.2, Math.min(4, S.img.zoom * Math.exp(-e.deltaY * 0.0015)));
  syncPhotoUI(); update();
}, { passive:false });

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
$('dlJpg').onclick = () => { const c = document.createElement('canvas'); render(c, S.fmt); c.toBlob(b => download(b, fileBase(S.fmt) + '.jpg'), 'image/jpeg', 0.93); };
$('dlAll').onclick = async () => {
  for (const k of Object.keys(FORMATS)) {
    download(await pngOf(k), fileBase(k) + '.png');
    await new Promise(r => setTimeout(r, 400));
  }
  render(out, S.fmt);
};

/* ---------- צבעים מותאמים, רוחב עמודה, לוגו ---------- */
function setCustom(key, val) {
  const c = Object.assign({}, S.custom[S.tpl] || {}); c[key] = val.toUpperCase();
  S.custom[S.tpl] = c;
  if (key === 'bg' && BGS[S.bg[S.tpl]].photo) S.img.base = c.bg;
  $('cReset').disabled = false; update();
}
$('cBg').oninput = e => setCustom('bg', e.target.value);
$('cFg').oninput = e => setCustom('fg', e.target.value);
$('cAcc').oninput = e => setCustom('acc', e.target.value);
$('cBg').onchange = $('cFg').onchange = $('cAcc').onchange = () => buildUI();
$('cReset').onclick = () => { S.custom[S.tpl] = null; buildUI(); update(); };
$('colW').oninput = e => { S.colW = +e.target.value; $('vColW').textContent = S.colW + '%'; update(); };
$('logoColor').onchange = e => { S.logoColor = e.target.value; update(); };
$('invName').oninput = e => { S.name = e.target.value; };
try { $('author').value = localStorage.getItem('tex-author') || ''; } catch (e) {}
$('author').oninput = e => { try { localStorage.setItem('tex-author', e.target.value); } catch (er) {} };

/* ---------- הודעות ---------- */
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('show'), 2600); }
function modal(title, body, actions) {
  $('mT').textContent = title; $('mB').textContent = body;
  const a = $('mA'); a.innerHTML = '';
  return new Promise(res => {
    for (const [t, v, cls] of actions) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || ''); b.textContent = t;
      b.onclick = () => { $('modal').style.display = 'none'; res(v); };
      a.appendChild(b);
    }
    $('modal').style.display = 'flex';
  });
}

/* ---------- אחסון מקומי (IndexedDB): פונטים והזמנות ---------- */
function idb() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open('tex-invites', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('fonts'); r.result.createObjectStore('invites', { keyPath:'id' }); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
async function idbDo(store, mode, fn) {
  const d = await idb();
  return new Promise((res, rej) => {
    const tx = d.transaction(store, mode), st = tx.objectStore(store);
    const r = fn(st);
    tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error);
  });
}
const idbPut = (store, v, k) => idbDo(store, 'readwrite', st => st.put(v, k));
const idbDel = (store, k) => idbDo(store, 'readwrite', st => st.delete(k));
const idbAll = store => idbDo(store, 'readonly', st => st.getAll());
const idbKeys = store => idbDo(store, 'readonly', st => st.getAllKeys());
const idbGet = (store, k) => idbDo(store, 'readonly', st => st.get(k));

/* ---------- פונטים ---------- */
const FONT_ROLES = [[F.title, 'כותרות — Narkis Block Black'], [F.med, 'Narkis Block Medium'], [F.reg, 'Narkis Block Regular'], [F.thin, 'Narkis Block Thin'], [F.en, 'Franklin Gothic']];
const userFonts = {};   // role -> file name
let hasBlack = false;
function guessRole(name) {
  const n = name.toLowerCase();
  if (n.includes('franklin')) return F.en;
  if (n.includes('black') || n.includes('heavy')) return F.title;
  if (n.includes('thin') || n.includes('light')) return F.thin;
  if (n.includes('medium')) return F.med;
  if (n.includes('narkis') || n.includes('regular')) return F.reg;
  return null;
}
async function installFont(role, buf, name) {
  const ff = new FontFace(role, buf.slice(0));
  await ff.load(); document.fonts.add(ff);
  userFonts[role] = name; if (role === F.title) hasBlack = true;
}
function renderFontStatus() {
  if (!$('fontStatus')) return;
  $('fontStatus').innerHTML = FONT_ROLES.map(([r, label]) => {
    let st;
    if (userFonts[r]) st = '<span class="ok">נטען מקובץ</span>';
    else if (r === F.title) st = hasBlack ? '<span class="ok">פעיל</span>' : '<span class="no">חסר — הכותרות ב-Medium</span>';
    else st = '<span class="ok">מוטמע</span>';
    return `<div class="fontrow"><span>${label}</span>${st}</div>`;
  }).join('');
}
async function restoreFonts() {
  try { const r = await fetch('fonts/NarkisBlock-Black.ttf', { method:'HEAD' }); if (r.ok) hasBlack = true; } catch (e) {}
  try {
    const keys = await idbKeys('fonts');
    for (const k of keys) { const v = await idbGet('fonts', k); if (v && v.buf) await installFont(k, v.buf, v.name); }
  } catch (e) {}
  renderFontStatus(); refresh();
}
if ($('fontIn')) $('fontIn').onchange = async e => {
  let n = 0; const miss = [];
  for (const f of e.target.files) {
    const role = guessRole(f.name);
    if (!role) { miss.push(f.name); continue; }
    try { const buf = await f.arrayBuffer(); await installFont(role, buf, f.name); await idbPut('fonts', { name:f.name, buf }, role); n++; }
    catch (err) { miss.push(f.name); }
  }
  e.target.value = '';
  renderFontStatus(); refresh();
  if (n) toast(`נטענו ${n} פונטים`);
  if (miss.length) modal('קבצים שלא זוהו', 'שם הקובץ צריך לכלול Narkis או Franklin, ואת המשקל (Black / Medium / Regular / Thin): ' + miss.join(', '), [['הבנתי', 1]]);
};

/* ---------- תמונה לשמירה (דחוסה) ---------- */
let photoData = null;
function photoToData(img) {
  const max = 1800, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}
function loadImgData(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function snapshot() {
  if (S.photo && !photoData) photoData = photoToData(S.photo);
  return { app:'textile-invites', v:1, name:S.name || '', state:stateOf(), photo:S.photo ? photoData : null };
}
async function openSnapshot(snap, id) {
  if (!snap || snap.app !== 'textile-invites' || !snap.state) throw new Error('bad');
  applyState(snap.state);
  S.name = snap.name || ''; S.docId = id || null;
  S.photo = null; photoData = null;
  if (typeof snap.photo === 'string' && snap.photo.startsWith('data:image/')) { S.photo = await loadImgData(snap.photo); photoData = snap.photo; }
  buildUI(); update(); showTab('edit');
}
function thumb() {
  const c = document.createElement('canvas'); const sc = 360 / Math.max(out.width, out.height);
  c.width = Math.round(out.width * sc); c.height = Math.round(out.height * sc);
  c.getContext('2d').drawImage(out, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8);
}
function defaultName() { const v = S.values[S.tpl]; return String(v.title || v.highlight || TEMPLATES[S.tpl].name).split('\n').join(' ').slice(0, 60); }

/* ---------- ההזמנות שלי ---------- */
$('saveBtn').onclick = async () => {
  if (!S.name.trim()) { S.name = defaultName(); $('invName').value = S.name; }
  let mode = 'new';
  if (S.docId) { mode = await modal('שמירה', 'לעדכן את ההזמנה השמורה או לשמור עותק חדש?', [['עדכון', 'update', 'primary'], ['עותק חדש', 'new'], ['ביטול', null]]); if (!mode) return; }
  try {
    const id = mode === 'update' ? S.docId : 'inv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const prev = mode === 'update' ? await idbGet('invites', id) : null;
    const now = Date.now();
    await idbPut('invites', { id, name:S.name, author:$('author').value || '', createdAt: prev ? prev.createdAt : now, updatedAt: now, thumb: thumb(), snap: snapshot() });
    S.docId = id; buildUI(); toast('נשמר ב"ההזמנות שלי"');
  } catch (e) { toast('השמירה נכשלה — ייתכן שהדפדפן חוסם אחסון'); }
};
async function renderGallery() {
  const g = $('grid');
  let docs = [];
  try { docs = (await idbAll('invites')).sort((a, b) => b.updatedAt - a.updatedAt); } catch (e) {}
  if (!docs.length) { g.innerHTML = '<div class="empty">עדיין אין הזמנות שמורות. צרו הזמנה ולחצו "שמירה ב׳ההזמנות שלי׳".</div>'; return; }
  g.innerHTML = '';
  for (const d of docs) {
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = '<img alt=""><div class="meta"><b></b><span></span><div class="acts"><button type="button" data-a="dup">שכפול</button><button type="button" data-a="file">קובץ פרויקט</button><button type="button" data-a="del">מחיקה</button></div></div>';
    el.querySelector('img').src = d.thumb || '';
    el.querySelector('b').textContent = d.name || 'ללא שם';
    el.querySelector('span').textContent = [d.author, new Date(d.updatedAt).toLocaleDateString('he-IL')].filter(Boolean).join(' · ');
    el.onclick = () => openSnapshot(d.snap, d.id).then(() => toast('נפתח לעריכה')).catch(() => toast('לא הצלחתי לפתוח'));
    el.querySelector('[data-a=dup]').onclick = async ev => {
      ev.stopPropagation();
      const id = 'inv-' + Date.now().toString(36);
      await idbPut('invites', { ...d, id, name: d.name + ' (עותק)', createdAt: Date.now(), updatedAt: Date.now() });
      renderGallery();
    };
    el.querySelector('[data-a=file]').onclick = ev => { ev.stopPropagation(); download(new Blob([JSON.stringify(d.snap)], { type:'application/json' }), safeName(d.name) + '.textile.json'); };
    el.querySelector('[data-a=del]').onclick = async ev => {
      ev.stopPropagation();
      const ok = await modal('מחיקה', `למחוק את "${d.name || 'ללא שם'}"? אי אפשר לשחזר.`, [['מחיקה', 1, 'primary'], ['ביטול', 0]]);
      if (!ok) return;
      await idbDel('invites', d.id); if (S.docId === d.id) S.docId = null; renderGallery(); toast('נמחק');
    };
    g.appendChild(el);
  }
}
function showTab(t) {
  $('tabEdit').classList.toggle('on', t === 'edit'); $('tabGal').classList.toggle('on', t === 'gal');
  $('editor').style.display = t === 'edit' ? '' : 'none';
  $('gallery').style.display = t === 'gal' ? 'block' : 'none';
  if (t === 'gal') renderGallery(); else update();
}
$('tabEdit').onclick = () => showTab('edit');
$('tabGal').onclick = () => showTab('gal');

/* ---------- קובצי פרויקט וגיבוי ---------- */
const safeName = n => (n || 'הזמנה').replace(/[\\/:*?"<>|\n]/g, '').trim().slice(0, 60) || 'הזמנה';
$('projOut').onclick = () => {
  if (!S.name.trim()) { S.name = defaultName(); $('invName').value = S.name; }
  download(new Blob([JSON.stringify(snapshot())], { type:'application/json' }), safeName(S.name) + '.textile.json');
};
async function readJson(file) { return JSON.parse(await file.text()); }
$('projIn').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { await openSnapshot(await readJson(f), null); toast('הפרויקט נפתח'); }
  catch (err) { modal('לא הצלחתי לפתוח', 'הקובץ אינו קובץ פרויקט של מחולל ההזמנות.', [['הבנתי', 1]]); }
};
$('backupOut').onclick = async () => {
  const docs = await idbAll('invites').catch(() => []);
  if (!docs.length) { toast('אין הזמנות לגבות'); return; }
  download(new Blob([JSON.stringify({ app:'textile-invites-backup', v:1, invites:docs })], { type:'application/json' }), 'textile-invites-backup.json');
};
$('backupIn').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const b = await readJson(f); let n = 0;
    if (b.app === 'textile-invites') { await idbPut('invites', { id:'inv-' + Date.now().toString(36), name:b.name || 'הזמנה', author:'', createdAt:Date.now(), updatedAt:Date.now(), thumb:'', snap:b }); n = 1; }
    else if (b.app === 'textile-invites-backup') for (const d of b.invites || []) { if (d && d.id && d.snap) { await idbPut('invites', d); n++; } }
    else throw 0;
    renderGallery(); toast(`שוחזרו ${n} הזמנות`);
  } catch (err) { modal('לא הצלחתי לשחזר', 'הקובץ אינו גיבוי של מחולל ההזמנות.', [['הבנתי', 1]]); }
};

/* ---------- הזמנה חדשה ---------- */
$('newBtn').onclick = async () => {
  const ok = await modal('הזמנה חדשה', 'להתחיל מחדש? הטקסטים, הצבעים והתמונה יחזרו לברירת המחדל. מה שלא נשמר ב"ההזמנות שלי" יאבד.', [['כן, חדשה', 1, 'primary'], ['ביטול', 0]]);
  if (!ok) return;
  const t = TEMPLATES[S.tpl];
  S.values[S.tpl] = Object.fromEntries(t.fields.map(f => [f[0], f[3]]));
  S.fx[S.tpl] = {}; S.custom[S.tpl] = null; S.bg[S.tpl] = t.defBg; S.colW = 100; S.credit = '';
  S.photo = null; photoData = null; resetPos(); S.name = ''; S.docId = null;
  buildUI(); update();
};

/* הפעלה */
$('hdrLogo').src = logoImg('lockup', C.black).src;
const fontsReady = Promise.all(Object.values(F).map(f => document.fonts.load(`40px "${f}"`, 'אבג ABC 123'))).catch(() => {});
Promise.all([fontsReady, preloadLogos()]).then(() => {
  measureAscents(out.getContext('2d'));
  buildUI(); update();
  window.__ready = true;
  renderFontStatus(); restoreFonts();
});
/* אם גופן מסתיים להיטען מאוחר — מציירים מחדש */
function refresh() { if (!window.__ready) return; measureAscents(out.getContext('2d')); update(); }
document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', refresh);
document.fonts.ready.then(refresh);
window.__S = S; window.__render = render; window.__buildUI = buildUI;
})();
