/* ═══════════════════════════════════════════════════════════
   LabShot v2 – app.js
   Konsep baru: bersih, sederhana, benar-benar berfungsi.

   SISTEM TEMPLATE:
   - Frame disimpan di  assets/frames/{tema}/{file}.webp
   - Daftar tema & frame dibaca dari assets/frames/manifest.json
   - Tambah frame baru: upload file + edit manifest.json → refresh
   - Slot foto: auto-detect area gelap/terang ATAU hardcode di manifest

   Contoh manifest.json:
   {
     "themes": [
       {
         "slug": "pendadaran",
         "label": "Selamat Lulus Pendadaran",
         "frames": [
           { "key": "pendadaran-1", "file": "pendadaran-1.webp", "label": "Pendadaran 1" }
         ]
       }
     ]
   }
═══════════════════════════════════════════════════════════ */

'use strict';

/* ── Konstanta ──────────────────────────────────────────── */
const STORY_W = 1080;
const STORY_H = 1920;

// URL Apps Script untuk upload foto & serve halaman QR
// Ganti dengan URL Web App milik Anda dari Code.gs
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyo7rb9TPvHjp6NJNphJfgirDSpkkiAWo_srxlpi1qsPQWbAQGGAIzW3t3lLxt6tq4QLw/exec';

/* ── Elemen DOM ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const el = {
  // Splash
  splash:      $('splash'),
  btnStart:    $('btnStart'),
  // App
  app:         $('app'),
  // Pengaturan
  selTema:     $('selTema'),
  selFrame:    $('selFrame'),
  selFilter:   $('selFilter'),
  fibName:     $('fibName'),
  fibCount:    $('fibCount'),
  fibHint:     $('fibHint'),
  cvPreview:   $('cvPreview'),
  chkMirror:   $('chkMirror'),
  chkSound:    $('chkSound'),
  selCam:      $('selCam'),
  camWrap:     $('camSelectWrap'),
  btnGuide:    $('btnGuide'),
  // Kamera
  video:       $('video'),
  shotCanvas:  $('shotCanvas'),
  camEmpty:    $('camEmpty'),
  countdown:   $('countdown'),
  flash:       $('flash'),
  progBar:     $('progBar'),
  toast:       $('toast'),
  toastIcon:   $('toastIcon'),
  toastText:   $('toastText'),
  thumbs:      $('thumbs'),
  reviewBar:   $('reviewBar'),
  reviewLabel: $('reviewLabel'),
  btnLeft:     $('btnLeft'),
  btnRight:    $('btnRight'),
  btnRetake:   $('btnRetake'),
  btnFinish:   $('btnFinish'),
  progressChip:$('progressChip'),
  chipLabel:   $('chipLabel'),
  chipPips:    $('chipPips'),
  btnCam:      $('btnCam'),
  btnShoot:    $('btnShoot'),
  btnRedo:     $('btnRedo'),
  // Hasil
  imgResult:   $('imgResult'),
  emptyResult: $('emptyResult'),
  shotCount:   $('shotCount'),
  btnDownload: $('btnDownload'),
  btnNew:      $('btnNew'),
  uploadStatus:$('uploadStatus'),
  qrOuter:     $('qrOuter'),
  qrBox:       $('qrBox'),
  qrNote:      $('qrNote'),
};

/* ── State template ─────────────────────────────────────── */
let THEMES  = {};   // { slug: label }
let FRAMES  = {};   // { frameKey: { theme, label, file, path, defaultCount, slotsByCount } }

const frameImgCache = {};
const frameInFlight = {};

/* ── State sesi ─────────────────────────────────────────── */
let stream         = null;
let sessionRunning = false;
let photos         = [];      // DataURL tiap jepretan
let photoImgs      = [];      // HTMLImageElement tiap jepretan
let selectedIdx    = -1;
let retakeIdx      = -1;
let reviewReady    = false;
let previewTimer   = null;
let finalUrl       = null;    // Object URL hasil final
let mirrorOn       = true;
let soundOn        = true;
let uploadFileName = '';

/* ════════════════════════════════════════════════════════════
   1. INISIALISASI
════════════════════════════════════════════════════════════ */

// Entry point — jalankan segera, splash selalu responsif
document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();

function init() {
  // Cegah double-init
  if (init._done) return;
  init._done = true;

  // ── Pasang listener splash DULU ────────────────────────
  el.btnStart.addEventListener('click', openApp);
  el.btnGuide.addEventListener('click', showSplash);

  // ── Muat manifest di background ────────────────────────
  loadManifest().then(() => {
    buildThemeSelect();
    buildFrameSelect('');
  }).catch(err => {
    console.error('[LabShot] manifest error:', err);
    buildThemeSelect();
  });

  // ── Pasang semua listener lain ─────────────────────────
  el.selTema.addEventListener('change', () => {
    buildFrameSelect(el.selTema.value);
    resetResult(true);
  });
  el.selFrame.addEventListener('change', () => {
    updateFrameInfo();
    resetResult(true);
  });
  el.selFilter.addEventListener('change', () => {
    applyFilter();
    renderPreview();
  });
  el.chkMirror.addEventListener('change', () => {
    mirrorOn = el.chkMirror.checked;
    applyMirror();
    renderPreview();
  });
  el.chkSound.addEventListener('change', () => { soundOn = el.chkSound.checked; });
  el.selCam.addEventListener('change', () => startCamera(el.selCam.value));

  el.btnCam.addEventListener('click', () => startCamera());
  el.btnShoot.addEventListener('click', startSession);
  el.btnRedo.addEventListener('click', () => { resetResult(true); stopPreviewLoop(); startPreviewLoop(); });

  el.btnLeft.addEventListener('click', () => movePhoto(-1));
  el.btnRight.addEventListener('click', () => movePhoto(1));
  el.btnRetake.addEventListener('click', doRetake);
  el.btnFinish.addEventListener('click', doFinish);
  el.btnNew.addEventListener('click', newSession);

  // Inisialisasi awal
  updateFrameInfo();
  setStatus('Kamera belum aktif.', 'idle');
}

/* ════════════════════════════════════════════════════════════
   2. SPLASH
════════════════════════════════════════════════════════════ */

function openApp() {
  // Tampilkan app SEGERA — tidak tunggu transisi
  el.app.classList.remove('hidden');

  // Fade out splash dengan fallback timer
  el.splash.classList.add('out');
  const hide = () => { el.splash.style.display = 'none'; };
  const timer = setTimeout(hide, 500);
  el.splash.addEventListener('transitionend', () => { clearTimeout(timer); hide(); }, { once: true });

  // Render preview
  setTimeout(() => { updateFrameInfo(); renderPreview(); }, 80);
}

function showSplash() {
  el.splash.style.display = '';
  el.splash.classList.remove('out');
  el.app.classList.add('hidden');
}

/* ════════════════════════════════════════════════════════════
   3. MANIFEST & TEMPLATE
════════════════════════════════════════════════════════════ */

async function loadManifest() {
  // Coba beberapa lokasi
  const candidates = [
    'assets/frames/manifest.json',
    'manifest.json',
  ];

  for (const path of candidates) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      let res;
      try { res = await fetch(path + '?_=' + Date.now(), { signal: ctrl.signal }); }
      finally { clearTimeout(t); }

      if (!res.ok) { console.log('[LabShot]', path, '→', res.status); continue; }

      const json = await res.json();
      if (!Array.isArray(json.themes) || !json.themes.length) continue;

      // Bangun THEMES dan FRAMES
      const baseDir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';

      json.themes.forEach(theme => {
        if (!theme.slug || !theme.label) return;
        THEMES[theme.slug] = theme.label;
        (theme.frames || []).forEach((frame, i) => {
          if (!frame.key || !frame.file) return;
          const key = theme.slug + '__' + frame.key;
          FRAMES[key] = {
            theme:        theme.slug,
            label:        frame.label || frame.key,
            path:         baseDir + theme.slug + '/' + frame.file,
            defaultCount: frame.defaultCount || 1,
            slotsByCount: frame.slotsByCount || null, // null = auto-detect
          };
        });
      });

      console.log('[LabShot] manifest OK dari', path,
        '→', Object.keys(FRAMES).length, 'frame,',
        Object.keys(THEMES).length, 'tema');
      return true;

    } catch (e) { console.log('[LabShot]', path, '→', e.message); }
  }

  console.warn('[LabShot] manifest tidak ditemukan, aplikasi tetap berjalan tanpa template.');
  return false;
}

/* ── Populate dropdown ──────────────────────────────────── */

function buildThemeSelect() {
  const current = el.selTema.value;
  el.selTema.innerHTML = '<option value="">— Pilih Tema —</option>';
  Object.entries(THEMES).forEach(([slug, label]) => {
    const opt = document.createElement('option');
    opt.value = slug; opt.textContent = label;
    el.selTema.appendChild(opt);
  });
  if (current && THEMES[current]) el.selTema.value = current;
}

function buildFrameSelect(themeSlug) {
  el.selFrame.innerHTML = '';
  el.selFrame.disabled  = !themeSlug;

  if (!themeSlug) {
    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = '— Pilih tema dulu —';
    ph.disabled = true; ph.selected = true;
    el.selFrame.appendChild(ph);
    updateFrameInfo();
    return;
  }

  const entries = Object.entries(FRAMES).filter(([, f]) => f.theme === themeSlug);
  if (!entries.length) {
    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = '(Belum ada frame)';
    ph.disabled = true; ph.selected = true;
    el.selFrame.appendChild(ph);
    updateFrameInfo();
    return;
  }

  entries.forEach(([key, f]) => {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = f.label;
    el.selFrame.appendChild(opt);
  });
  updateFrameInfo();
}

/* ── Info box & preview ─────────────────────────────────── */

function currentFrameKey() { return el.selFrame.value || ''; }

function currentFrameConfig() { return FRAMES[currentFrameKey()] || null; }

function autoPhotoCount() {
  const cfg = currentFrameConfig();
  if (!cfg) return 1;
  if (cfg.slotsByCount) {
    const keys = Object.keys(cfg.slotsByCount).map(Number).sort((a,b)=>a-b);
    return keys[0] || 1;
  }
  return cfg.defaultCount || 1;
}

function getSlotsFor(frameKey, count) {
  const cfg = FRAMES[frameKey];
  if (!cfg) return [defaultSlot(count)];
  if (cfg.slotsByCount?.[count]) return cfg.slotsByCount[count];
  if (cfg.slotsByCount) {
    const first = Object.values(cfg.slotsByCount)[0];
    return first || [defaultSlot(count)];
  }
  // Slot belum diketahui → akan di-detect saat gambar load
  return [defaultSlot(1)];
}

function defaultSlot(count) {
  const slots = {
    1: { x:150, y:390, w:780, h:1140, radius:12 },
    2: { x:145, y:390, w:790, h:520,  radius:12 },
    3: { x:150, y:340, w:780, h:360,  radius:12 },
    4: { x:150, y:300, w:780, h:300,  radius:12 },
  };
  return slots[count] || slots[1];
}

function updateFrameInfo() {
  const cfg   = currentFrameConfig();
  const total = autoPhotoCount();

  el.fibName.textContent  = cfg ? cfg.label : '—';
  el.fibCount.textContent = cfg ? total + (total > 1 ? ' foto' : ' foto') : '—';
  el.fibHint.textContent  = cfg
    ? 'Preview frame. Aktifkan kamera untuk preview live.'
    : 'Pilih tema dan frame untuk melihat preview.';

  if (el.shotCount) el.shotCount.textContent = total + ' foto';
  refreshReviewBar();
  renderPreview();
}

/* ════════════════════════════════════════════════════════════
   4. GAMBAR FRAME
════════════════════════════════════════════════════════════ */

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

async function getFrameImg(frameKey) {
  if (!frameKey || !FRAMES[frameKey]) return null;
  if (frameImgCache[frameKey]) return frameImgCache[frameKey];
  if (frameInFlight[frameKey]) return frameInFlight[frameKey];

  frameInFlight[frameKey] = (async () => {
    try {
      const cfg = FRAMES[frameKey];
      const raw = await loadImg(cfg.path);

      // Render ke canvas 1080×1920, auto-detect & clear slot
      const cv = document.createElement('canvas');
      cv.width = STORY_W; cv.height = STORY_H;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(raw, 0, 0, STORY_W, STORY_H);

      // Jika slotsByCount belum ada, auto-detect & simpan
      if (!cfg.slotsByCount) {
        const detected = autoDetectSlot(cv, cfg.defaultCount || 1);
        if (detected.length) {
          cfg.slotsByCount = { [detected.length]: detected };
          cfg.defaultCount  = detected.length;
          console.log('[LabShot] Auto-detect slot untuk', cfg.label, ':', detected);
        }
      }

      // Clear area slot supaya foto bisa muncul di balik frame
      const slots = getSlotsFor(frameKey, autoPhotoCountFor(frameKey));
      slots.forEach(s => {
        const p = 4;
        ctx.clearRect(
          Math.max(0, s.x - p), Math.max(0, s.y - p),
          Math.min(STORY_W, s.w + p*2), Math.min(STORY_H, s.h + p*2)
        );
      });

      const img = await loadImg(cv.toDataURL('image/png'));
      frameImgCache[frameKey] = img;
      return img;
    } catch (e) {
      console.warn('[LabShot] gagal load frame', frameKey, ':', e.message);
      return null;
    } finally {
      delete frameInFlight[frameKey];
    }
  })();

  return frameInFlight[frameKey];
}

function autoPhotoCountFor(frameKey) {
  const cfg = FRAMES[frameKey];
  if (!cfg) return 1;
  if (cfg.slotsByCount) {
    return Math.min(...Object.keys(cfg.slotsByCount).map(Number));
  }
  return cfg.defaultCount || 1;
}

/* Auto-detect slot area gelap/terang di canvas */
function autoDetectSlot(canvas, desiredCount) {
  const SW = 216, SH = 384;
  const sm = document.createElement('canvas');
  sm.width = SW; sm.height = SH;
  const sc = sm.getContext('2d', { willReadFrequently: true });
  sc.drawImage(canvas, 0, 0, SW, SH);
  const { data } = sc.getImageData(0, 0, SW, SH);

  const dark  = new Uint8Array(SW * SH);
  const light = new Uint8Array(SW * SH);
  for (let i = 0; i < SW * SH; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
    if (r < 52 && g < 52 && b < 52)               dark[i]  = 1;
    if (r > 200 && g > 200 && b > 200 && a > 180) light[i] = 1;
  }

  const findBest = (mask) => {
    const vis = new Uint8Array(SW * SH);
    let best = null, bestArea = 0;
    for (let sy = 0; sy < SH; sy++) {
      for (let sx = 0; sx < SW; sx++) {
        const si = sy * SW + sx;
        if (!mask[si] || vis[si]) continue;
        const q = [si]; vis[si] = 1; let head = 0;
        let minX=sx,maxX=sx,minY=sy,maxY=sy;
        while (head < q.length) {
          const idx = q[head++];
          const cy = (idx / SW)|0, cx = idx % SW;
          if (cx<minX)minX=cx; if(cx>maxX)maxX=cx;
          if (cy<minY)minY=cy; if(cy>maxY)maxY=cy;
          for (const [ny,nx] of [[cy-1,cx],[cy+1,cx],[cy,cx-1],[cy,cx+1]]) {
            if (ny<0||ny>=SH||nx<0||nx>=SW) continue;
            const ni = ny*SW+nx;
            if (!mask[ni]||vis[ni]) continue;
            vis[ni]=1; q.push(ni);
          }
        }
        const area = q.length;
        const bw=maxX-minX+1, bh=maxY-minY+1;
        const touchAll = minY<=1&&maxY>=SH-2&&minX<=1&&maxX>=SW-2;
        if (!touchAll && area/(SW*SH)<0.82 && bw>SW*0.10 && bh>SH*0.08 && area>bestArea) {
          bestArea=area; best={x:minX,y:minY,w:bw,h:bh};
        }
      }
    }
    return {slot:best,area:bestArea};
  };

  const d = findBest(dark);
  const l = findBest(light);
  const w = l.area > d.area ? l.slot : d.slot;
  if (!w) return [];

  const SX = STORY_W/SW, SY = STORY_H/SH;
  return [{ x:Math.round(w.x*SX), y:Math.round(w.y*SY),
            w:Math.round(w.w*SX), h:Math.round(w.h*SY), radius:10 }];
}

/* ════════════════════════════════════════════════════════════
   5. PREVIEW CANVAS KIRI
════════════════════════════════════════════════════════════ */

let previewRunning = false;

function startPreviewLoop() {
  stopPreviewLoop();
  renderPreview();
  if (stream) previewTimer = setInterval(renderPreview, 90);
}
function stopPreviewLoop() {
  if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }
}

let rfpRunning = false;
async function renderPreview() {
  if (rfpRunning) return;
  rfpRunning = true;
  try { await _renderPreview(); } finally { rfpRunning = false; }
}

async function _renderPreview() {
  const cv  = el.cvPreview;
  const SC  = 1.5;
  const tw  = Math.round(STORY_W * SC);
  const th  = Math.round(STORY_H * SC);
  if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }

  const ctx = cv.getContext('2d');
  ctx.setTransform(SC, 0, 0, SC, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, STORY_W, STORY_H);

  const frameKey = currentFrameKey();
  const total    = autoPhotoCount();
  const slots    = getSlotsFor(frameKey, total);
  const liveIdx  = retakeIdx >= 0 ? retakeIdx : Math.min(photos.length, total - 1);
  const hasLive  = !!stream && el.video.readyState >= 2;

  // Background
  ctx.save();
  const bg = ctx.createLinearGradient(0,0,0,STORY_H);
  bg.addColorStop(0,'#f8fafc'); bg.addColorStop(1,'#ecfeff');
  ctx.fillStyle = bg; ctx.fillRect(0,0,STORY_W,STORY_H);
  ctx.restore();

  // Draw slot placeholders / live / captured
  slots.forEach((s, i) => {
    const captured = photoImgs[i] && retakeIdx !== i;
    if (captured) {
      drawImgCover(ctx, photoImgs[i], s.x, s.y, s.w, s.h, s.radius||0);
    } else if (hasLive && i === liveIdx) {
      drawLive(ctx, s.x, s.y, s.w, s.h, s.radius||0);
      drawLiveBadge(ctx, s.x, s.y, s.w, i, 'LIVE');
    } else {
      drawPlaceholder(ctx, s, i, i === liveIdx && !hasLive ? 'idle' : 'idle');
    }
  });

  // Frame overlay
  const frameImg = frameKey ? await getFrameImg(frameKey) : null;
  if (frameImg) ctx.drawImage(frameImg, 0, 0, STORY_W, STORY_H);
}

function drawImgCover(ctx, img, x, y, w, h, r) {
  const scale = Math.max(w/img.width, h/img.height);
  const sw=w/scale, sh=h/scale;
  const sx=(img.width-sw)/2, sy=(img.height-sh)/2;
  ctx.save();
  if (r>0) { rrect(ctx,x,y,w,h,r); ctx.clip(); }
  ctx.drawImage(img, sx,sy,sw,sh, x,y,w,h);
  ctx.restore();
}

function drawLive(ctx, x, y, w, h, r) {
  const vid = el.video;
  const vw = vid.clientWidth || w, vh = vid.clientHeight || h;
  const vvW = vid.videoWidth||vw, vvH = vid.videoHeight||vh;
  const scale = Math.max(vw/vvW, vh/vvH);
  const sw = vw/scale, sh = vh/scale;
  const sx = (vvW-sw)/2, sy = (vvH-sh)/2;
  const drawW = w, drawH = h;
  const dScale = Math.max(drawW/sw, drawH/sh);
  const dSW = drawW/dScale, dSH = drawH/dScale;
  const dSX = sx+(sw-dSW)/2, dSY = sy+(sh-dSH)/2;
  ctx.save();
  if (r>0) { rrect(ctx,x,y,w,h,r); ctx.clip(); }
  ctx.filter = filterCSS();
  if (mirrorOn) {
    ctx.translate(x+w,y); ctx.scale(-1,1);
    ctx.drawImage(vid, dSX,dSY,dSW,dSH, 0,0,w,h);
  } else {
    ctx.drawImage(vid, dSX,dSY,dSW,dSH, x,y,w,h);
  }
  ctx.restore();
}

function drawLiveBadge(ctx, x, y, w, i, text) {
  ctx.save();
  ctx.font = '800 18px Inter,sans-serif';
  const tw = ctx.measureText(text).width;
  const px=11, py=6, bx=x+w-tw-px*2-12, by=y+12;
  ctx.fillStyle = 'rgba(13,148,136,.88)'; ctx.beginPath();
  rrect(ctx,bx,by,tw+px*2,28,14); ctx.fill();
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text, bx+(tw+px*2)/2, by+14);
  ctx.restore();
}

function drawPlaceholder(ctx, s, i) {
  ctx.save();
  rrect(ctx,s.x,s.y,s.w,s.h,s.radius||0); ctx.clip();
  const g=ctx.createLinearGradient(s.x,s.y,s.x,s.y+s.h);
  g.addColorStop(0,'rgba(255,255,255,.75)'); g.addColorStop(1,'rgba(236,254,255,.5)');
  ctx.fillStyle=g; ctx.fillRect(s.x,s.y,s.w,s.h);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle='rgba(0,0,0,.15)'; ctx.lineWidth=3; ctx.setLineDash([12,7]);
  rrect(ctx,s.x,s.y,s.w,s.h,s.radius||0); ctx.stroke(); ctx.setLineDash([]);
  // Nomor slot
  const r=Math.min(22,s.w*.1);
  ctx.fillStyle='rgba(15,79,62,.65)'; ctx.beginPath();
  ctx.arc(s.x+16+r,s.y+16+r,r,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font=`700 ${Math.round(r*.9)}px Inter,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(String(i+1),s.x+16+r,s.y+16+r+1);
  ctx.restore();
}

function rrect(ctx,x,y,w,h,r) {
  r = Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

/* ════════════════════════════════════════════════════════════
   6. KAMERA
════════════════════════════════════════════════════════════ */

async function startCamera(deviceId=null) {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('⚠️ Browser tidak mendukung kamera atau halaman perlu HTTPS.', 'error');
    return;
  }
  if (stream) { stream.getTracks().forEach(t=>t.stop()); stream=null; }
  toast('Menghubungkan kamera…', 'info');

  try {
    const constraints = {
      video: deviceId
        ? { deviceId:{exact:deviceId}, width:{ideal:1920}, height:{ideal:1080} }
        : { facingMode:'user', width:{ideal:1920}, height:{ideal:1080} },
      audio: false,
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    el.video.srcObject = stream;
    await el.video.play();
    el.camEmpty.classList.add('hidden');
    el.btnShoot.disabled = false;
    el.btnCam.textContent = '✓ Kamera Aktif';
    el.btnCam.classList.add('cam-active');
    applyMirror(); applyFilter();
    toast('📷 Kamera aktif. Pilih tema & frame, lalu Mulai Foto.', 'active');
    await enumCams();
    startPreviewLoop();
  } catch (err) {
    const msg = err?.name==='NotAllowedError'
      ? 'Izin kamera ditolak. Izinkan kamera di browser.'
      : err?.name==='NotFoundError'
        ? 'Kamera tidak ditemukan.'
        : 'Kamera tidak bisa diakses. Pastikan halaman via HTTPS.';
    toast('⚠️ ' + msg, 'error');
  }
}

async function enumCams() {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const cams = devs.filter(d=>d.kind==='videoinput');
    if (cams.length <= 1) { el.camWrap.classList.add('hidden'); return; }
    el.camWrap.classList.remove('hidden');
    el.selCam.innerHTML = '';
    cams.forEach((c,i)=>{
      const o=document.createElement('option');
      o.value=c.deviceId; o.textContent=c.label||`Kamera ${i+1}`;
      el.selCam.appendChild(o);
    });
    const active = stream?.getVideoTracks()[0]?.getSettings()?.deviceId;
    if (active) el.selCam.value = active;
  } catch(_) {}
}

const FILTERS = {
  none:'none', bw:'grayscale(1) contrast(1.08)',
  warm:'sepia(.20) saturate(1.24) brightness(1.04)',
  bright:'brightness(1.16) contrast(1.04)',
  vintage:'sepia(.42) contrast(1.05) saturate(.82)',
  cool:'hue-rotate(20deg) saturate(1.1) brightness(1.05)',
};
const filterCSS = () => FILTERS[el.selFilter.value] || 'none';
const applyFilter = () => { if(el.video) el.video.style.filter = filterCSS(); };
const applyMirror = () => { if(el.video) el.video.style.transform = mirrorOn?'scaleX(-1)':'none'; };

/* ════════════════════════════════════════════════════════════
   7. SESI FOTO
════════════════════════════════════════════════════════════ */

const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function startSession() {
  if (!stream || sessionRunning) return;
  if (!currentFrameKey()) { toast('⚠️ Pilih frame terlebih dahulu.', 'warning'); return; }
  ensureAudio();
  sessionRunning = true;
  setBusy(true);
  resetResult(false);
  photos=[]; photoImgs=[]; selectedIdx=-1; retakeIdx=-1; reviewReady=false;
  updateThumbs();
  setProgress(0);

  const frameKey = currentFrameKey();
  const total    = autoPhotoCount();
  updateChip(0, total);

  for (let i=0; i<total; i++) {
    updateChip(i, total);
    toast(`📸 Foto ${i+1} dari ${total} — bersiap…`, 'active');
    await runCountdown(3);

    const shot = capturePhoto();
    photos.push(shot);
    photoImgs.push(await loadImg(shot));
    selectedIdx = i;
    if (el.shotCount) el.shotCount.textContent = `${photos.length}/${total} foto`;
    updateThumbs();
    renderPreview();
    setProgress(Math.round((i+1)/total*70));
    if (i < total-1) await sleep(400);
  }

  reviewReady = true; selectedIdx = 0;
  updateThumbs(); renderPreview();
  setProgress(70);
  updateChip(total, total);
  toast('✅ Semua foto diambil. Atur urutan/retake jika perlu, lalu Finish.', 'success');
  setBusy(false);
  sessionRunning = false;
  refreshReviewBar();
}

function capturePhoto() {
  const v = el.video, c = el.shotCanvas;
  const vW=v.videoWidth||1, vH=v.videoHeight||1;
  const dispW=v.clientWidth||vW, dispH=v.clientHeight||vH;
  const scale=Math.max(dispW/vW,dispH/vH);
  const sw=dispW/scale, sh=dispH/scale;
  const sx=(vW-sw)/2, sy=(vH-sh)/2;
  c.width=Math.round(sw); c.height=Math.round(sh);
  const ctx=c.getContext('2d');
  ctx.save();
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.filter=filterCSS();
  if (mirrorOn) { ctx.translate(c.width,0); ctx.scale(-1,1); }
  ctx.drawImage(v,sx,sy,sw,sh,0,0,c.width,c.height);
  ctx.restore();
  return c.toDataURL('image/jpeg',0.95);
}

async function runCountdown(sec=3) {
  el.countdown.classList.remove('hidden');
  for (let i=sec; i>=1; i--) {
    el.countdown.textContent=i;
    el.countdown.classList.remove('pop');
    void el.countdown.offsetWidth;
    el.countdown.classList.add('pop');
    playTone(330+i*80, 0.18);
    await sleep(900);
  }
  el.countdown.textContent='📸'; playShutter();
  await sleep(100);
  el.countdown.classList.add('hidden');
  el.flash.classList.remove('hidden');
  await sleep(200);
  el.flash.classList.add('hidden');
}

/* ── Thumbnails ─────────────────────────────────────────── */

function updateThumbs() {
  el.thumbs.innerHTML='';
  if (!photos.length) { el.thumbs.classList.add('hidden'); return; }
  el.thumbs.classList.remove('hidden');
  photos.forEach((src,i) => {
    const wrap=document.createElement('button');
    wrap.type='button';
    wrap.className='thumb'+(i===selectedIdx?' sel':'');
    wrap.addEventListener('click',()=>selectPhoto(i));
    const img=document.createElement('img'); img.src=src; img.alt=`Foto ${i+1}`;
    const badge=document.createElement('span'); badge.className='thumb-num'; badge.textContent=i+1;
    wrap.appendChild(img); wrap.appendChild(badge);
    el.thumbs.appendChild(wrap);
  });
  refreshReviewBar();
}

function selectPhoto(i) {
  selectedIdx = i>=0&&i<photos.length ? i : 0;
  updateThumbs();
  renderPreview();
}

/* ── Review bar ─────────────────────────────────────────── */

function refreshReviewBar() {
  const total = autoPhotoCount();
  const hasPh = photos.length > 0;
  const done  = photos.length === total;
  const sel   = selectedIdx>=0 && selectedIdx<photos.length;

  el.reviewBar.classList.toggle('hidden', !hasPh);
  el.reviewLabel.textContent = sel
    ? `Foto terpilih: ${selectedIdx+1} dari ${photos.length}`
    : 'Foto terpilih: —';

  el.btnLeft.disabled   = !sel||selectedIdx===0||sessionRunning;
  el.btnRight.disabled  = !sel||selectedIdx===photos.length-1||sessionRunning;
  el.btnRetake.disabled = !sel||sessionRunning||!stream;
  el.btnFinish.disabled = !done||sessionRunning;
}

function movePhoto(dir) {
  const next = selectedIdx + dir;
  if (next<0||next>=photos.length) return;
  [photos[selectedIdx],photos[next]]=[photos[next],photos[selectedIdx]];
  [photoImgs[selectedIdx],photoImgs[next]]=[photoImgs[next],photoImgs[selectedIdx]];
  selectedIdx=next;
  updateThumbs(); renderPreview();
  toast('🔀 Urutan diubah.', 'info');
}

async function doRetake() {
  if (!stream||sessionRunning||selectedIdx<0) return;
  ensureAudio(); sessionRunning=true; setBusy(true);
  retakeIdx=selectedIdx;
  renderPreview();
  toast(`📸 Retake foto ${selectedIdx+1}…`, 'active');
  await runCountdown(3);
  const shot=capturePhoto();
  photos[selectedIdx]=shot;
  photoImgs[selectedIdx]=await loadImg(shot);
  retakeIdx=-1;
  updateThumbs(); renderPreview();
  toast(`✅ Foto ${selectedIdx+1} sudah diganti.`, 'success');
  setBusy(false); sessionRunning=false; refreshReviewBar();
}

async function doFinish() {
  const total=autoPhotoCount();
  if (photos.length!==total||sessionRunning) return;
  sessionRunning=true; setBusy(true);
  toast('⏳ Membuat hasil akhir…', 'active');
  setProgress(80);
  await renderFinal();
  setProgress(100);
  toast('🎉 Selesai! Download atau scan QR.', 'success');
  sessionRunning=false; setBusy(false); refreshReviewBar();
}

/* ── Render final image ─────────────────────────────────── */

async function renderFinal() {
  if (!photos.length) return;

  const imgs     = await Promise.all(photos.map(loadImg));
  const frameKey = currentFrameKey();
  const total    = imgs.length;
  const slots    = getSlotsFor(frameKey, total);

  const cv=document.createElement('canvas');
  cv.width=STORY_W; cv.height=STORY_H;
  const ctx=cv.getContext('2d');

  // Background blur
  ctx.save();
  const bg=ctx.createLinearGradient(0,0,0,STORY_H);
  bg.addColorStop(0,'#f8fafc'); bg.addColorStop(1,'#ecfeff');
  ctx.fillStyle=bg; ctx.fillRect(0,0,STORY_W,STORY_H);
  ctx.restore();

  // Blurred bg from first photo
  if (imgs[0]) {
    ctx.save();
    ctx.filter='blur(16px) brightness(.7) saturate(1.1)';
    drawImgCover(ctx,imgs[0],-24,-24,STORY_W+48,STORY_H+48,0);
    ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(0,0,STORY_W,STORY_H);
  }

  // Photos in slots
  slots.forEach((s,i) => {
    const img=imgs[i%imgs.length];
    drawImgCover(ctx,img,s.x,s.y,s.w,s.h,s.radius||0);
    // Subtle depth
    ctx.save();
    rrect(ctx,s.x,s.y,s.w,s.h,s.radius||0); ctx.clip();
    const shade=ctx.createLinearGradient(s.x,s.y,s.x,s.y+s.h);
    shade.addColorStop(0,'rgba(0,0,0,.14)'); shade.addColorStop(.06,'rgba(0,0,0,0)');
    shade.addColorStop(.94,'rgba(0,0,0,0)'); shade.addColorStop(1,'rgba(0,0,0,.10)');
    ctx.fillStyle=shade; ctx.fillRect(s.x,s.y,s.w,s.h);
    ctx.restore();
  });

  // Frame overlay
  const frameImg = frameKey ? await getFrameImg(frameKey) : null;
  if (frameImg) ctx.drawImage(frameImg,0,0,STORY_W,STORY_H);

  // Tampilkan di panel kanan
  const dataUrl = cv.toDataURL('image/png');
  el.imgResult.src = dataUrl;
  el.imgResult.classList.remove('hidden');
  el.emptyResult.classList.add('hidden');

  if (finalUrl) URL.revokeObjectURL(finalUrl);
  const blob = await new Promise(r=>cv.toBlob(r,'image/png'));
  finalUrl = URL.createObjectURL(blob);

  el.btnDownload.href     = finalUrl;
  el.btnDownload.download = `labshot-${Date.now()}.png`;
  el.btnDownload.classList.remove('disabled');
  el.btnNew.disabled = false;
  el.btnRedo.disabled = false;

  // Upload ke Drive
  uploadFileName = makeFileName();
  const shareUrl = APPS_SCRIPT_URL + '?n=' + encodeURIComponent(uploadFileName);
  renderQR(shareUrl);
  setUploadStatus('uploading', '⏳ Mengunggah ke Google Drive…');
  el.qrOuter.classList.add('uploading');

  const driveBlob = await resizeForDrive(cv);
  uploadToDrive(driveBlob, uploadFileName)
    .then(() => {
      setUploadStatus('done', '✅ Foto berhasil diunggah');
      el.qrOuter.classList.remove('uploading');
      el.qrNote.innerHTML =
        `Scan QR atau <a class="qr-link" href="${shareUrl}" target="_blank">buka link foto</a>.`;
    })
    .catch(err => {
      console.error('[LabShot] upload error:', err);
      setUploadStatus('error', '❌ Upload gagal — gunakan tombol Download');
      el.qrOuter.classList.remove('uploading');
    });
}

/* ── QR ─────────────────────────────────────────────────── */

function renderQR(url) {
  el.qrBox.innerHTML='';
  if (!window.QRCode) { el.qrNote.textContent='QR library belum termuat.'; return; }
  new QRCode(el.qrBox, {
    text:url, width:140, height:140,
    colorDark:'#111827', colorLight:'#ffffff',
    correctLevel:QRCode.CorrectLevel.M,
  });
  el.qrNote.textContent='Scan QR untuk lihat & download foto.';
}

/* ── New session ────────────────────────────────────────── */

function newSession() {
  resetResult(true);
  if (stream) { startPreviewLoop(); el.btnShoot.disabled=false; }
  toast('👋 Siap untuk sesi berikutnya.', 'info');
}

function resetResult(clearPhotos) {
  if (clearPhotos) {
    photos=[]; photoImgs=[]; selectedIdx=-1; retakeIdx=-1;
    reviewReady=false; updateThumbs();
  }
  if (finalUrl) { URL.revokeObjectURL(finalUrl); finalUrl=null; }
  el.imgResult.src=''; el.imgResult.classList.add('hidden');
  el.emptyResult.classList.remove('hidden');
  el.btnDownload.removeAttribute('href'); el.btnDownload.classList.add('disabled');
  el.btnNew.disabled=true;
  el.qrBox.innerHTML=''; el.qrOuter.classList.remove('uploading');
  el.qrNote.textContent='QR aktif setelah foto selesai.';
  setUploadStatus('','');
  setProgress(0);
  updateFrameInfo();
  if (clearPhotos) { updateChip(0,0); stopPreviewLoop(); renderPreview(); }
}

/* ── Helpers ─────────────────────────────────────────────── */

function setBusy(v) {
  el.btnCam.disabled   = v;
  el.btnShoot.disabled = v || !stream;
  el.selTema.disabled  = v;
  el.selFrame.disabled = v || !el.selTema.value;
  el.selFilter.disabled= v;
  refreshReviewBar();
}

function setProgress(pct) {
  if (el.progBar) el.progBar.style.width = pct+'%';
}

function updateChip(current, total) {
  if (!el.progressChip) return;
  if (!total) { el.progressChip.classList.add('hidden'); return; }
  el.progressChip.classList.remove('hidden');
  el.chipLabel.textContent = `Foto ${Math.min(current+1,total)} dari ${total}`;
  el.chipPips.innerHTML='';
  for (let i=0;i<total;i++) {
    const pip=document.createElement('span');
    pip.className='chip-pip'+(i<current?' done':i===current?' active':'');
    el.chipPips.appendChild(pip);
  }
}

/* ── Toast ──────────────────────────────────────────────── */

let _toastTimer = null;
const TOAST_ICONS = { idle:'💤', info:'ℹ️', active:'📷', success:'✅', warning:'⚠️', error:'🚫' };

function toast(msg, type='info', autoDismiss=0) {
  if (el.statusText) el.statusText.textContent = msg;
  const t = el.toast; if (!t) return;

  // Auto-detect type dari emoji prefix
  let fl = type;
  if (fl==='info') {
    if (msg.startsWith('✅')||msg.startsWith('🎉')) fl='success';
    else if (msg.startsWith('⚠️')||msg.startsWith('❌')) fl='error';
    else if (msg.startsWith('📷')||msg.startsWith('📸')||msg.startsWith('⏳')) fl='active';
    else if (msg.startsWith('🔀')||msg.startsWith('👋')) fl='info';
  }

  if (el.toastIcon) el.toastIcon.textContent = TOAST_ICONS[fl]||'ℹ️';
  if (el.toastText) el.toastText.textContent = msg.replace(/^[^\s]+\s/,'');

  t.className = 'toast ' + fl;
  if (_toastTimer) clearTimeout(_toastTimer);
  if (autoDismiss>0) _toastTimer=setTimeout(()=>t.className='toast idle',autoDismiss);
}
// Alias untuk kompatibilitas
function setStatus(msg, type='info', ms=0) { toast(msg, type, ms); }

/* ── Upload status ──────────────────────────────────────── */

function setUploadStatus(state, msg) {
  const el2 = el.uploadStatus; if (!el2) return;
  el2.className = 'upload-status ' + state;
  el2.textContent = msg;
}

/* ── Audio ──────────────────────────────────────────────── */

let audioCtx=null;
function ensureAudio() {
  if (!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
}
function playTone(freq,dur,vol=0.38) {
  if (!soundOn||!audioCtx) return;
  try {
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.frequency.value=freq;
    g.gain.setValueAtTime(vol,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);
    o.start(); o.stop(audioCtx.currentTime+dur);
  }catch(_){}
}
function playShutter() {
  if (!soundOn||!audioCtx) return;
  try {
    const buf=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*.07),audioCtx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*.25));
    const s=audioCtx.createBufferSource(); s.buffer=buf;
    const g=audioCtx.createGain(); g.gain.value=0.5;
    s.connect(g); g.connect(audioCtx.destination); s.start();
  }catch(_){}
}

/* ── Drive upload ───────────────────────────────────────── */

function makeFileName() {
  const now=new Date();
  const pad=n=>String(n).padStart(2,'0');
  return `ls-${String(now.getFullYear()).slice(-2)}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${Math.random().toString(36).slice(2,5)}.jpg`;
}

async function resizeForDrive(srcCanvas) {
  const W=720,H=1280;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  c.getContext('2d').drawImage(srcCanvas,0,0,W,H);
  return new Promise(r=>c.toBlob(r,'image/jpeg',0.72));
}

function blobToB64(blob) {
  return new Promise((res,rej)=>{
    const r=new FileReader();
    r.onload=()=>res(String(r.result||'').split(',')[1]||'');
    r.onerror=rej; r.readAsDataURL(blob);
  });
}

async function uploadToDrive(blob, fileName) {
  const b64 = await blobToB64(blob);
  await fetch(APPS_SCRIPT_URL, {
    method:'POST', mode:'no-cors',
    body:JSON.stringify({ imageBase64:b64, fileName }),
  });
}

