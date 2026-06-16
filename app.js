/* ═══════════════════════════════════════════════════════════
   LabShot v3 – app.js
   ID 100% cocok dengan index.html yang ada di GitHub.

   Perbaikan dari v39:
   ✓ Tidak ada Drive/JSONP – frame dari file lokal GitHub
   ✓ Manifest dibaca via fetch() biasa dari assets/frames/manifest.json
   ✓ Splash tombol langsung bekerja (tidak tunggu fetch)
   ✓ Kamera: startCameraBtn listener dipasang pertama sebelum apapun
   ✓ Frame preview: auto-detect area slot (gelap/terang/transparan)
   ✓ populateThemeOptions/populateFrameOptions: logis, tidak 'all'
═══════════════════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────────────────
   KONSTANTA
──────────────────────────────────────────────────────── */
const STORY_W        = 1080;
const STORY_H        = 1920;
const MANIFEST_PATH  = 'assets/frames/manifest.json';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyo7rb9TPvHjp6NJNphJfgirDSpkkiAWo_srxlpi1qsPQWbAQGGAIzW3t3lLxt6tq4QLw/exec';

/* ────────────────────────────────────────────────────────
   ELEMEN DOM  — ID sesuai index.html yang ada di GitHub
──────────────────────────────────────────────────────── */
const el = {
  // Splash
  splashScreen:      document.getElementById('splashScreen'),
  splashStartBtn:    document.getElementById('splashStartBtn'),
  showGuideBtn:      document.getElementById('showGuideBtn'),
  appShell:          document.getElementById('appShell'),

  // Pengaturan kiri
  themeSelect:       document.getElementById('themeSelect'),
  frameTheme:        document.getElementById('frameTheme'),
  filterMode:        document.getElementById('filterMode'),
  frameAutoCount:    document.getElementById('frameAutoCount'),
  frameAutoHint:     document.getElementById('frameAutoHint'),
  framePreviewTitle: document.getElementById('framePreviewTitle'),
  framePreviewCount: document.getElementById('framePreviewCount'),
  framePreviewNote:  document.getElementById('framePreviewNote'),
  framePreviewCanvas:document.getElementById('framePreviewCanvas'),
  mirrorToggle:      document.getElementById('mirrorToggle'),
  soundToggle:       document.getElementById('soundToggle'),
  cameraSelect:      document.getElementById('cameraSelect'),
  cameraSelectWrap:  document.getElementById('cameraSelectWrap'),

  // Kamera tengah
  video:             document.getElementById('cameraPreview'),
  shotCanvas:        document.getElementById('shotCanvas'),
  emptyCamera:       document.getElementById('emptyCamera'),
  countdown:         document.getElementById('countdown'),
  flash:             document.getElementById('flash'),
  progressBar:       document.getElementById('progressBar'),
  statusText:        document.getElementById('statusText'),
  statusToast:       document.getElementById('statusToast'),
  statusToastText:   document.getElementById('statusToastText'),
  photoGrid:         document.getElementById('photoGrid'),
  reviewControls:    document.getElementById('reviewControls'),
  selectedPhotoLabel:document.getElementById('selectedPhotoLabel'),
  moveLeftBtn:       document.getElementById('moveLeftBtn'),
  moveRightBtn:      document.getElementById('moveRightBtn'),
  retakeSelectedBtn: document.getElementById('retakeSelectedBtn'),
  finishBtn:         document.getElementById('finishBtn'),
  startCameraBtn:    document.getElementById('startCameraBtn'),
  startSessionBtn:   document.getElementById('startSessionBtn'),
  retakeBtn:         document.getElementById('retakeBtn'),
  stepProgressChip:  document.getElementById('stepProgressChip'),
  stepChipLabel:     document.getElementById('stepChipLabel'),
  stepChipTrack:     document.getElementById('stepChipTrack'),

  // Hasil kanan
  finalPreview:      document.getElementById('finalPreview'),
  emptyResult:       document.getElementById('emptyResult'),
  downloadBtn:       document.getElementById('downloadBtn'),
  shareBtn:          document.getElementById('shareBtn'),
  shotCounter:       document.getElementById('shotCounter'),
  uploadStatus:      document.getElementById('uploadStatus'),
  qrCode:            document.getElementById('qrCode'),
  qrCodeOuter:       document.getElementById('qrCodeOuter'),
  qrNote:            document.getElementById('qrNote'),
};

/* ────────────────────────────────────────────────────────
   STATE TEMPLATE
──────────────────────────────────────────────────────── */
let FRAME_THEMES  = {};  // { slug: label }
let FRAME_CONFIGS = {};  // { key: config }

const frameImgCache  = {};
const frameInFlight  = {};

/* ────────────────────────────────────────────────────────
   STATE SESI
──────────────────────────────────────────────────────── */
let stream         = null;
let sessionRunning = false;
let capturedPhotos = [];
let capturedImgs   = [];
let selectedIdx    = -1;
let retakeIdx      = -1;
let reviewReady    = false;
let previewTimer   = null;
let mirrorOn       = true;
let soundOn        = true;
let finalObjectUrl = null;
let audioCtx       = null;
let _toastTimer    = null;

/* ════════════════════════════════════════════════════════
   INIT  — entry point
════════════════════════════════════════════════════════ */
(function boot() {
  // Cegah double-init
  if (window._labshotBooted) return;
  window._labshotBooted = true;

  // ① Pasang listener splash PERTAMA — tidak boleh bergantung apapun
  if (el.splashStartBtn) el.splashStartBtn.addEventListener('click', openApp);
  if (el.showGuideBtn)   el.showGuideBtn.addEventListener('click', showSplash);

  // ② Pasang listener kamera — tidak perlu tunggu manifest
  if (el.startCameraBtn)  el.startCameraBtn.addEventListener('click', () => startCamera());
  if (el.startSessionBtn) el.startSessionBtn.addEventListener('click', startSession);
  if (el.retakeBtn)       el.retakeBtn.addEventListener('click', doRedo);

  // ③ Review controls
  if (el.moveLeftBtn)       el.moveLeftBtn.addEventListener('click', () => movePhoto(-1));
  if (el.moveRightBtn)      el.moveRightBtn.addEventListener('click', () => movePhoto(1));
  if (el.retakeSelectedBtn) el.retakeSelectedBtn.addEventListener('click', doRetakeSelected);
  if (el.finishBtn)         el.finishBtn.addEventListener('click', doFinish);
  if (el.shareBtn)          el.shareBtn.addEventListener('click', newSession);

  // ④ Toggle
  if (el.mirrorToggle) el.mirrorToggle.addEventListener('change', () => {
    mirrorOn = el.mirrorToggle.checked; applyMirror(); renderPreview();
  });
  if (el.soundToggle) el.soundToggle.addEventListener('change', () => {
    soundOn = el.soundToggle.checked;
  });
  if (el.cameraSelect) el.cameraSelect.addEventListener('change', () => {
    startCamera(el.cameraSelect.value);
  });

  // ⑤ Tema / Frame / Filter
  if (el.themeSelect) el.themeSelect.addEventListener('change', () => {
    buildFrameOptions(el.themeSelect.value);
    resetSession(true);
  });
  if (el.frameTheme) el.frameTheme.addEventListener('change', () => {
    updateFrameInfo(); resetSession(true);
  });
  if (el.filterMode) el.filterMode.addEventListener('change', () => {
    applyFilter(); renderPreview();
  });

  // ⑥ Muat manifest di background — tidak block UI
  loadManifest()
    .then(ok => {
      buildThemeOptions();
      buildFrameOptions('');
      updateFrameInfo();
      if (ok) setStatus('✅ Template siap. Pilih tema dan frame.', 'success', 3000);
    })
    .catch(() => {
      buildThemeOptions();
      buildFrameOptions('');
    });

  // ⑦ Status awal
  setStatus('Kamera belum aktif. Klik Aktifkan Kamera.', 'idle');
  renderPreview();
})();

/* ════════════════════════════════════════════════════════
   SPLASH
════════════════════════════════════════════════════════ */
function openApp() {
  if (!el.appShell || !el.splashScreen) return;

  // Tampilkan app SEKARANG — tidak tunggu transisi
  el.appShell.classList.remove('hidden');
  el.appShell.removeAttribute('aria-hidden');

  // Sembunyikan splash dengan fallback timer
  el.splashScreen.classList.add('splash-exit');
  const hide = () => {
    el.splashScreen.style.display = 'none';
    el.splashScreen.setAttribute('aria-hidden', 'true');
  };
  const t = setTimeout(hide, 520);
  el.splashScreen.addEventListener('transitionend', () => { clearTimeout(t); hide(); }, { once: true });

  setTimeout(() => { updateFrameInfo(); renderPreview(); }, 100);
}

function showSplash() {
  if (!el.splashScreen || !el.appShell) return;
  el.splashScreen.style.display = '';
  el.splashScreen.removeAttribute('aria-hidden');
  el.splashScreen.classList.remove('splash-exit');
  el.appShell.classList.add('hidden');
}

/* ════════════════════════════════════════════════════════
   MANIFEST & TEMPLATE
════════════════════════════════════════════════════════ */
async function loadManifest() {
  const candidates = [
    'assets/frames/manifest.json',
    'manifest.json',
  ];

  for (const path of candidates) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      let res;
      try {
        res = await fetch(`${path}?_=${Date.now()}`, { signal: ctrl.signal });
      } finally { clearTimeout(t); }

      if (!res.ok) { console.log('[LabShot]', path, '→', res.status); continue; }

      const json = await res.json();
      if (!Array.isArray(json.themes) || !json.themes.length) {
        console.warn('[LabShot] manifest kosong:', path); continue;
      }

      const baseDir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
      const nextThemes  = {};
      const nextConfigs = {};

      json.themes.forEach(theme => {
        if (!theme.slug || !theme.label) return;
        nextThemes[theme.slug] = theme.label;
        (theme.frames || []).forEach(frame => {
          if (!frame.key || !frame.file) return;
          const key = theme.slug + '__' + frame.key;
          nextConfigs[key] = {
            theme:        theme.slug,
            label:        frame.label || frame.key,
            path:         baseDir + theme.slug + '/' + frame.file,
            defaultCount: frame.defaultCount || 1,
            slotsByCount: frame.slotsByCount || null,
          };
        });
      });

      if (!Object.keys(nextConfigs).length) {
        // Tema ada tapi frame masih kosong - tetap set tema agar dropdown tema muncul
        FRAME_THEMES = nextThemes;
        console.log('[LabShot] manifest OK (frame masih kosong):', path);
        return true;
      }

      FRAME_THEMES  = nextThemes;
      FRAME_CONFIGS = nextConfigs;
      console.log('[LabShot] manifest OK:', Object.keys(nextConfigs).length,
        'frame dari', Object.keys(nextThemes).length, 'tema. Path:', path);
      return true;

    } catch (e) { console.log('[LabShot]', path, '→', e.message); }
  }

  console.warn('[LabShot] manifest tidak ditemukan — tidak ada template.');
  return false;
}

/* ── Dropdown ────────────────────────────────────────── */
function buildThemeOptions() {
  if (!el.themeSelect) return;
  const cur = el.themeSelect.value;
  el.themeSelect.innerHTML = '<option value="" disabled>— Pilih Tema —</option>';

  const keys = Object.keys(FRAME_THEMES);
  if (!keys.length) {
    el.themeSelect.innerHTML += '<option value="" disabled>(Belum ada tema)</option>';
    el.themeSelect.value = '';
    return;
  }
  keys.forEach(slug => {
    const opt = document.createElement('option');
    opt.value = slug; opt.textContent = FRAME_THEMES[slug];
    el.themeSelect.appendChild(opt);
  });
  if (cur && FRAME_THEMES[cur]) el.themeSelect.value = cur;
  else el.themeSelect.value = '';
}

function buildFrameOptions(themeSlug) {
  if (!el.frameTheme) return;
  el.frameTheme.innerHTML = '';

  if (!themeSlug) {
    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = '— Pilih tema dulu —';
    ph.disabled = true; ph.selected = true;
    el.frameTheme.appendChild(ph);
    el.frameTheme.disabled = true;
    if (el.startSessionBtn) el.startSessionBtn.disabled = true;
    updateFrameInfo(); return;
  }

  const entries = Object.entries(FRAME_CONFIGS).filter(([, f]) => f.theme === themeSlug);
  el.frameTheme.disabled = false;

  if (!entries.length) {
    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = '(Belum ada frame di tema ini)';
    ph.disabled = true; ph.selected = true;
    el.frameTheme.appendChild(ph);
    el.frameTheme.disabled = true;
    updateFrameInfo(); return;
  }

  entries.forEach(([key, f]) => {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = f.label;
    el.frameTheme.appendChild(opt);
  });
  el.frameTheme.value = entries[0][0];
  updateFrameInfo();
}

/* ── Info box ────────────────────────────────────────── */
function currentFrameKey() { return el.frameTheme?.value || ''; }
function currentConfig()   { return FRAME_CONFIGS[currentFrameKey()] || null; }

function photoCount() {
  const cfg = currentConfig();
  if (!cfg) return 1;
  if (cfg.slotsByCount) {
    const keys = Object.keys(cfg.slotsByCount).map(Number).sort((a,b)=>a-b);
    return keys[0] || 1;
  }
  return cfg.defaultCount || 1;
}

function getSlotsFor(frameKey, count) {
  const cfg = FRAME_CONFIGS[frameKey];
  if (cfg?.slotsByCount?.[count]) return cfg.slotsByCount[count];
  if (cfg?.slotsByCount) return Object.values(cfg.slotsByCount)[0] || [genericSlot(count)];
  return [genericSlot(count)];
}

function genericSlot(n) {
  const map = {
    1: { x:150, y:390, w:780, h:1140, radius:12 },
    2: { x:145, y:390, w:790, h:520,  radius:12 },
    3: { x:150, y:340, w:780, h:360,  radius:12 },
    4: { x:150, y:300, w:780, h:300,  radius:12 },
  };
  return map[n] || map[1];
}

function updateFrameInfo() {
  const cfg   = currentConfig();
  const total = photoCount();

  if (el.framePreviewTitle) el.framePreviewTitle.textContent = cfg?.label || '—';
  if (el.framePreviewCount) el.framePreviewCount.textContent = cfg ? `${total} foto` : '—';
  if (el.frameAutoCount)    el.frameAutoCount.textContent    = cfg ? `${total} foto otomatis` : '—';
  if (el.frameAutoHint)     el.frameAutoHint.textContent     = cfg
    ? `${cfg.label} akan mengambil ${total} foto secara otomatis.`
    : 'Pilih tema dan frame terlebih dahulu.';
  if (el.framePreviewNote) el.framePreviewNote.textContent = cfg
    ? 'Preview frame. Aktifkan kamera untuk preview live.'
    : 'Pilih tema dan frame untuk melihat preview.';
  if (el.shotCounter) el.shotCounter.textContent = `${total} foto`;

  refreshReviewControls();
  renderPreview();
}

/* ════════════════════════════════════════════════════════
   GAMBAR FRAME (load, cache, auto-detect slot)
════════════════════════════════════════════════════════ */
function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
}

async function getFrameImg(frameKey) {
  if (!frameKey || !FRAME_CONFIGS[frameKey]) return null;
  if (frameImgCache[frameKey])   return frameImgCache[frameKey];
  if (frameInFlight[frameKey])   return frameInFlight[frameKey];

  frameInFlight[frameKey] = (async () => {
    try {
      const cfg = FRAME_CONFIGS[frameKey];
      const raw = await loadImg(cfg.path);

      // Render ke canvas 1080×1920
      const cv  = document.createElement('canvas');
      cv.width  = STORY_W; cv.height = STORY_H;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(raw, 0, 0, STORY_W, STORY_H);

      // Auto-detect slot jika belum ada dari manifest
      if (!cfg.slotsByCount) {
        const detected = detectSlots(cv, cfg.defaultCount || 1);
        if (detected.length) {
          cfg.slotsByCount = { [detected.length]: detected };
          cfg.defaultCount  = detected.length;
        }
      }

      // Clear area slot → foto muncul di balik frame
      const n     = cfg.defaultCount || 1;
      const slots = getSlotsFor(frameKey, n);
      slots.forEach(s => {
        const p = 4;
        ctx.clearRect(
          Math.max(0, s.x - p), Math.max(0, s.y - p),
          Math.min(STORY_W - (s.x - p), s.w + p*2),
          Math.min(STORY_H - (s.y - p), s.h + p*2)
        );
      });

      const img = await loadImg(cv.toDataURL('image/png'));
      frameImgCache[frameKey] = img;
      return img;
    } catch (e) {
      console.warn('[LabShot] gagal load frame:', frameKey, e.message);
      return null;
    } finally {
      delete frameInFlight[frameKey];
    }
  })();

  return frameInFlight[frameKey];
}

/* ── Auto-detect slot area ──────────────────────────── */
function detectSlots(canvas, desiredCount) {
  const SW = 216, SH = 384;
  const sm  = document.createElement('canvas');
  sm.width  = SW; sm.height = SH;
  const sc  = sm.getContext('2d', { willReadFrequently: true });
  sc.drawImage(canvas, 0, 0, SW, SH);
  const { data } = sc.getImageData(0, 0, SW, SH);

  const dark  = new Uint8Array(SW * SH);
  const light = new Uint8Array(SW * SH);
  for (let i = 0; i < SW * SH; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2], a = data[i*4+3];
    if (r < 52 && g < 52 && b < 52)               dark[i]  = 1;
    if (r > 200 && g > 200 && b > 200 && a > 180) light[i] = 1;
  }

  function findBest(mask) {
    const vis = new Uint8Array(SW * SH);
    let best = null, bestArea = 0;
    for (let sy = 0; sy < SH; sy++) {
      for (let sx = 0; sx < SW; sx++) {
        const si = sy * SW + sx;
        if (!mask[si] || vis[si]) continue;
        const q = [si]; vis[si] = 1; let head = 0;
        let minX = sx, maxX = sx, minY = sy, maxY = sy;
        while (head < q.length) {
          const idx = q[head++];
          const cy = (idx / SW)|0, cx = idx % SW;
          if (cx < minX) minX=cx; if (cx > maxX) maxX=cx;
          if (cy < minY) minY=cy; if (cy > maxY) maxY=cy;
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
        const tooBig   = area > SW*SH*0.82;
        const tooSmall = bw<SW*0.10||bh<SH*0.08||area<SW*SH*0.03;
        if (!touchAll && !tooBig && !tooSmall && area > bestArea) {
          bestArea=area; best={x:minX,y:minY,w:bw,h:bh};
        }
      }
    }
    return { slot: best, area: bestArea };
  }

  const d = findBest(dark);
  const l = findBest(light);
  const w = l.area > d.area ? l.slot : d.slot;
  if (!w) return [];

  const SX = STORY_W/SW, SY = STORY_H/SH;
  return [{ x: Math.round(w.x*SX), y: Math.round(w.y*SY),
            w: Math.round(w.w*SX), h: Math.round(w.h*SY), radius: 10 }];
}

/* ════════════════════════════════════════════════════════
   PREVIEW CANVAS
════════════════════════════════════════════════════════ */
function startPreviewLoop() {
  stopPreviewLoop();
  renderPreview();
  if (stream) previewTimer = setInterval(renderPreview, 90);
}
function stopPreviewLoop() {
  if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }
}

let _rpRunning = false;
async function renderPreview() {
  if (_rpRunning) return;
  _rpRunning = true;
  try { await _doRenderPreview(); } finally { _rpRunning = false; }
}

async function _doRenderPreview() {
  const cv = el.framePreviewCanvas;
  if (!cv) return;

  const SCALE = 1.5;
  const tw = Math.round(STORY_W * SCALE), th = Math.round(STORY_H * SCALE);
  if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; }

  const ctx = cv.getContext('2d');
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, STORY_W, STORY_H);

  const frameKey = currentFrameKey();
  const total    = photoCount();
  const slots    = getSlotsFor(frameKey, total);
  const liveIdx  = retakeIdx >= 0 ? retakeIdx : Math.min(capturedImgs.length, total - 1);
  const hasLive  = !!stream && el.video && el.video.readyState >= 2;

  // Background gradient
  const bg = ctx.createLinearGradient(0,0,0,STORY_H);
  bg.addColorStop(0,'#f8fafc'); bg.addColorStop(1,'#ecfeff');
  ctx.fillStyle = bg; ctx.fillRect(0,0,STORY_W,STORY_H);

  // Draw per slot
  slots.forEach((s, i) => {
    const captured = capturedImgs[i] && retakeIdx !== i;
    if (captured) {
      drawCover(ctx, capturedImgs[i], s.x, s.y, s.w, s.h, s.radius||0);
    } else if (hasLive && i === liveIdx) {
      drawLiveFrame(ctx, s.x, s.y, s.w, s.h, s.radius||0);
      drawBadge(ctx, s.x, s.y, s.w, 'LIVE');
    } else {
      drawPlaceholder(ctx, s, i, i === liveIdx);
    }
  });

  // Frame overlay
  if (frameKey) {
    const img = await getFrameImg(frameKey);
    if (img) ctx.drawImage(img, 0, 0, STORY_W, STORY_H);
  }

  // Update hint text
  if (el.framePreviewNote) {
    const cfg = currentConfig();
    if (!cfg) {
      el.framePreviewNote.textContent = 'Pilih tema dan frame untuk melihat preview.';
    } else if (!stream) {
      el.framePreviewNote.textContent = 'Aktifkan kamera untuk preview live di kotak foto.';
    } else if (capturedImgs.length < total) {
      el.framePreviewNote.textContent = `Slot aktif: foto ${liveIdx+1} dari ${total}. Posisikan wajah pada kotak LIVE.`;
    } else {
      el.framePreviewNote.textContent = 'Semua slot terisi. Atur urutan/retake, lalu klik Finish & Buat QR.';
    }
  }
}

/* ── Canvas helpers ─────────────────────────────────── */
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r||0, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

function drawCover(ctx, img, x, y, w, h, r) {
  const scale = Math.max(w/img.width, h/img.height);
  const sw = w/scale, sh = h/scale;
  const sx = (img.width-sw)/2, sy = (img.height-sh)/2;
  ctx.save();
  if (r>0) { rrect(ctx,x,y,w,h,r); ctx.clip(); }
  ctx.drawImage(img, sx,sy,sw,sh, x,y,w,h);
  ctx.restore();
}

function drawLiveFrame(ctx, x, y, w, h, r) {
  const v   = el.video;
  const vW  = v.videoWidth||1, vH = v.videoHeight||1;
  const dW  = v.clientWidth||w, dH = v.clientHeight||h;
  const sc  = Math.max(dW/vW, dH/vH);
  const vsW = dW/sc, vsH = dH/sc;
  const vsx = (vW-vsW)/2, vsy = (vH-vsH)/2;
  const sc2 = Math.max(w/vsW, h/vsH);
  const dsW = w/sc2, dsH = h/sc2;
  const dsx = vsx+(vsW-dsW)/2, dsy = vsy+(vsH-dsH)/2;
  ctx.save();
  if (r>0) { rrect(ctx,x,y,w,h,r); ctx.clip(); }
  ctx.filter = getFilterCSS();
  if (mirrorOn) { ctx.translate(x+w,y); ctx.scale(-1,1); ctx.drawImage(v,dsx,dsy,dsW,dsH,0,0,w,h); }
  else ctx.drawImage(v, dsx,dsy,dsW,dsH, x,y,w,h);
  ctx.restore();
}

function drawBadge(ctx, x, y, w, text) {
  ctx.save();
  ctx.font = '800 18px Inter,sans-serif';
  const tw2 = ctx.measureText(text).width;
  const px=11, bx=x+w-tw2-px*2-12, by=y+12;
  ctx.fillStyle='rgba(13,148,136,.9)'; rrect(ctx,bx,by,tw2+px*2,28,14); ctx.fill();
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text, bx+(tw2+px*2)/2, by+14);
  ctx.restore();
}

function drawPlaceholder(ctx, s, i, isActive) {
  ctx.save();
  rrect(ctx,s.x,s.y,s.w,s.h,s.radius||0); ctx.clip();
  const g = ctx.createLinearGradient(s.x,s.y,s.x,s.y+s.h);
  if (isActive) { g.addColorStop(0,'rgba(125,211,252,.35)'); g.addColorStop(1,'rgba(187,247,208,.25)'); }
  else          { g.addColorStop(0,'rgba(255,255,255,.75)'); g.addColorStop(1,'rgba(236,254,255,.5)'); }
  ctx.fillStyle=g; ctx.fillRect(s.x,s.y,s.w,s.h);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = isActive ? '#0ea5e9' : 'rgba(0,0,0,.15)';
  ctx.lineWidth   = isActive ? 6 : 3;
  ctx.setLineDash(isActive ? [] : [12,7]);
  rrect(ctx,s.x,s.y,s.w,s.h,s.radius||0); ctx.stroke();
  ctx.setLineDash([]);
  // Nomor
  const nr = Math.min(22, s.w*.1);
  ctx.fillStyle = isActive ? '#0f766e' : 'rgba(15,79,62,.65)';
  ctx.beginPath(); ctx.arc(s.x+16+nr,s.y+16+nr,nr,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font=`700 ${Math.round(nr*.9)}px Inter,sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(String(i+1), s.x+16+nr, s.y+16+nr+1);
  ctx.restore();
}

/* ════════════════════════════════════════════════════════
   KAMERA
════════════════════════════════════════════════════════ */
async function startCamera(deviceId = null) {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('⚠️ Browser tidak mendukung kamera atau halaman perlu HTTPS.', 'error');
    alert('Browser tidak mendukung kamera atau halaman harus dibuka via HTTPS / localhost.');
    return;
  }
  if (stream) { stream.getTracks().forEach(t=>t.stop()); stream = null; }
  setStatus('Menghubungkan kamera…', 'info');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: deviceId
        ? { deviceId: {exact: deviceId}, width:{ideal:1920}, height:{ideal:1080} }
        : { facingMode: 'user', width:{ideal:1920}, height:{ideal:1080} },
      audio: false,
    });
    el.video.srcObject = stream;
    await el.video.play();

    if (el.emptyCamera) el.emptyCamera.classList.add('hidden');
    if (el.startSessionBtn) el.startSessionBtn.disabled = false;
    if (el.startCameraBtn) {
      el.startCameraBtn.textContent = '✓ Kamera Aktif';
      el.startCameraBtn.classList.add('btn-active');
    }
    applyMirror(); applyFilter();
    setStatus('📷 Kamera aktif. Pilih tema & frame, lalu Mulai Foto.', 'active');
    await enumCams();
    startPreviewLoop();
  } catch (err) {
    const msg = err?.name === 'NotAllowedError'
      ? 'Izin kamera ditolak. Klik ikon gembok/kamera di address bar lalu izinkan.'
      : err?.name === 'NotFoundError'
        ? 'Kamera tidak ditemukan. Pastikan webcam terpasang.'
        : 'Kamera tidak bisa diakses. Pastikan halaman via HTTPS atau localhost.';
    setStatus('⚠️ ' + msg, 'error');
    console.error('[LabShot] camera error:', err);
  }
}

async function enumCams() {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    const cams  = devs.filter(d => d.kind === 'videoinput');
    if (!el.cameraSelectWrap || !el.cameraSelect) return;
    if (cams.length <= 1) { el.cameraSelectWrap.classList.add('hidden'); return; }
    el.cameraSelectWrap.classList.remove('hidden');
    el.cameraSelect.innerHTML = '';
    cams.forEach((c,i) => {
      const o = document.createElement('option');
      o.value = c.deviceId; o.textContent = c.label || `Kamera ${i+1}`;
      el.cameraSelect.appendChild(o);
    });
    const active = stream?.getVideoTracks()[0]?.getSettings()?.deviceId;
    if (active) el.cameraSelect.value = active;
  } catch(_) {}
}

const FILTER_MAP = {
  none:'none', bw:'grayscale(1) contrast(1.08)',
  warm:'sepia(.20) saturate(1.24) brightness(1.04)',
  bright:'brightness(1.16) contrast(1.04)',
  vintage:'sepia(.42) contrast(1.05) saturate(.82)',
  cool:'hue-rotate(20deg) saturate(1.1) brightness(1.05)',
};
const getFilterCSS = () => FILTER_MAP[el.filterMode?.value] || 'none';
const applyFilter  = () => { if (el.video) el.video.style.filter    = getFilterCSS(); };
const applyMirror  = () => { if (el.video) el.video.style.transform = mirrorOn ? 'scaleX(-1)' : 'none'; };

/* ════════════════════════════════════════════════════════
   SESI FOTO
════════════════════════════════════════════════════════ */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function startSession() {
  if (!stream || sessionRunning) return;
  if (!currentFrameKey()) {
    setStatus('⚠️ Pilih frame terlebih dahulu.', 'warning'); return;
  }
  ensureAudio();
  sessionRunning = true;
  setBusy(true);
  resetSession(false);
  capturedPhotos = []; capturedImgs = [];
  selectedIdx = -1; retakeIdx = -1; reviewReady = false;
  updateThumbs(); setProgress(0);

  const frameKey = currentFrameKey();
  const total    = photoCount();
  updateChip(0, total);

  for (let i = 0; i < total; i++) {
    updateChip(i, total);
    setStatus(`📸 Foto ${i+1} dari ${total} — bersiap…`, 'active');
    await runCountdown(3);

    const shot = capturePhoto();
    capturedPhotos.push(shot);
    capturedImgs.push(await loadImg(shot));
    selectedIdx = i;
    if (el.shotCounter) el.shotCounter.textContent = `${capturedPhotos.length}/${total} foto`;
    updateThumbs(); renderPreview();
    setProgress(Math.round((i+1)/total*70));
    if (i < total-1) await sleep(400);
  }

  reviewReady = true; selectedIdx = 0;
  updateThumbs(); renderPreview(); setProgress(70);
  updateChip(total, total);
  setStatus('✅ Semua foto diambil. Atur urutan/retake, lalu klik Finish & Buat QR.', 'success');
  sessionRunning = false; setBusy(false); refreshReviewControls();
}

function capturePhoto() {
  const v = el.video, c = el.shotCanvas;
  const vW=v.videoWidth||1, vH=v.videoHeight||1;
  const dW=v.clientWidth||vW, dH=v.clientHeight||vH;
  const sc=Math.max(dW/vW, dH/vH);
  const sw=dW/sc, sh=dH/sc;
  const sx=(vW-sw)/2, sy=(vH-sh)/2;
  c.width=Math.round(sw); c.height=Math.round(sh);
  const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.filter=getFilterCSS();
  ctx.save();
  if (mirrorOn) { ctx.translate(c.width,0); ctx.scale(-1,1); }
  ctx.drawImage(v, sx,sy,sw,sh, 0,0,c.width,c.height);
  ctx.restore();
  return c.toDataURL('image/jpeg', 0.95);
}

async function runCountdown(sec=3) {
  el.countdown.classList.remove('hidden');
  for (let i=sec; i>=1; i--) {
    el.countdown.textContent = i;
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

/* ── Thumbnails ─────────────────────────────────────── */
function updateThumbs() {
  if (!el.photoGrid) return;
  el.photoGrid.innerHTML = '';
  if (!capturedPhotos.length) { el.photoGrid.classList.add('hidden'); return; }
  el.photoGrid.classList.remove('hidden');
  capturedPhotos.forEach((src,i) => {
    const wrap=document.createElement('button');
    wrap.type='button';
    wrap.className='thumb-wrap'+(i===selectedIdx?' selected':'');
    wrap.addEventListener('click', ()=>selectPhoto(i));
    const img=document.createElement('img'); img.src=src; img.alt=`Foto ${i+1}`;
    img.className='thumb-img';
    const badge=document.createElement('span'); badge.className='thumb-index';
    badge.textContent=i+1;
    wrap.appendChild(img); wrap.appendChild(badge);
    el.photoGrid.appendChild(wrap);
  });
  refreshReviewControls();
}

function selectPhoto(i) {
  selectedIdx = i>=0&&i<capturedPhotos.length ? i : 0;
  updateThumbs(); renderPreview();
}

/* ── Review controls ──────────────────────────────────*/
function refreshReviewControls() {
  const total = photoCount();
  const has   = capturedPhotos.length>0;
  const done  = capturedPhotos.length===total;
  const sel   = selectedIdx>=0&&selectedIdx<capturedPhotos.length;

  if (el.reviewControls) el.reviewControls.classList.toggle('hidden', !has);
  if (el.selectedPhotoLabel) el.selectedPhotoLabel.textContent = sel
    ? `Foto terpilih: ${selectedIdx+1} dari ${capturedPhotos.length}`
    : 'Foto terpilih: —';
  if (el.moveLeftBtn)       el.moveLeftBtn.disabled       = !sel||selectedIdx===0||sessionRunning;
  if (el.moveRightBtn)      el.moveRightBtn.disabled      = !sel||selectedIdx===capturedPhotos.length-1||sessionRunning;
  if (el.retakeSelectedBtn) el.retakeSelectedBtn.disabled = !sel||sessionRunning||!stream;
  if (el.finishBtn)         el.finishBtn.disabled         = !done||sessionRunning;
}

function movePhoto(dir) {
  const next=selectedIdx+dir;
  if (next<0||next>=capturedPhotos.length) return;
  [capturedPhotos[selectedIdx],capturedPhotos[next]]=[capturedPhotos[next],capturedPhotos[selectedIdx]];
  [capturedImgs[selectedIdx],capturedImgs[next]]=[capturedImgs[next],capturedImgs[selectedIdx]];
  selectedIdx=next;
  updateThumbs(); renderPreview();
  setStatus('🔀 Urutan foto diubah.', 'info');
}

async function doRetakeSelected() {
  if (!stream||sessionRunning||selectedIdx<0) return;
  ensureAudio(); sessionRunning=true; setBusy(true);
  retakeIdx=selectedIdx; renderPreview();
  setStatus(`📸 Retake foto ${selectedIdx+1}…`, 'active');
  await runCountdown(3);
  const shot=capturePhoto();
  capturedPhotos[selectedIdx]=shot;
  capturedImgs[selectedIdx]=await loadImg(shot);
  retakeIdx=-1;
  updateThumbs(); renderPreview();
  setStatus(`✅ Foto ${selectedIdx+1} sudah diganti.`, 'success');
  sessionRunning=false; setBusy(false); refreshReviewControls();
}

async function doFinish() {
  const total=photoCount();
  if (capturedPhotos.length!==total||sessionRunning) return;
  sessionRunning=true; setBusy(true);
  setStatus('⏳ Membuat hasil akhir dan QR…', 'active');
  setProgress(80);
  await renderFinal();
  setProgress(100);
  setStatus('🎉 Selesai! Download atau scan QR.', 'success');
  sessionRunning=false; setBusy(false); refreshReviewControls();
}

function doRedo() {
  resetSession(true); stopPreviewLoop(); startPreviewLoop();
  if (el.retakeBtn) el.retakeBtn.disabled=true;
}

/* ════════════════════════════════════════════════════════
   RENDER FINAL
════════════════════════════════════════════════════════ */
async function renderFinal() {
  if (!capturedPhotos.length) return;
  const imgs     = await Promise.all(capturedPhotos.map(loadImg));
  const frameKey = currentFrameKey();
  const total    = imgs.length;
  const slots    = getSlotsFor(frameKey, total);

  const cv=document.createElement('canvas');
  cv.width=STORY_W; cv.height=STORY_H;
  const ctx=cv.getContext('2d');

  // Background
  const bg=ctx.createLinearGradient(0,0,0,STORY_H);
  bg.addColorStop(0,'#f8fafc'); bg.addColorStop(1,'#ecfeff');
  ctx.fillStyle=bg; ctx.fillRect(0,0,STORY_W,STORY_H);

  // Blurred bg
  if (imgs[0]) {
    ctx.save();
    ctx.filter='blur(16px) brightness(.7) saturate(1.1)';
    drawCover(ctx,imgs[0],-24,-24,STORY_W+48,STORY_H+48,0);
    ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(0,0,STORY_W,STORY_H);
  }

  // Photos in slots
  slots.forEach((s,i) => {
    const img=imgs[i%imgs.length];
    drawCover(ctx,img,s.x,s.y,s.w,s.h,s.radius||0);
    // Depth shading
    ctx.save();
    rrect(ctx,s.x,s.y,s.w,s.h,s.radius||0); ctx.clip();
    const sd=ctx.createLinearGradient(s.x,s.y,s.x,s.y+s.h);
    sd.addColorStop(0,'rgba(0,0,0,.14)'); sd.addColorStop(.06,'rgba(0,0,0,0)');
    sd.addColorStop(.94,'rgba(0,0,0,0)'); sd.addColorStop(1,'rgba(0,0,0,.10)');
    ctx.fillStyle=sd; ctx.fillRect(s.x,s.y,s.w,s.h);
    ctx.restore();
  });

  // Frame overlay
  const frameImg = frameKey ? await getFrameImg(frameKey) : null;
  if (frameImg) ctx.drawImage(frameImg,0,0,STORY_W,STORY_H);

  // Tampilkan preview
  const dataUrl = cv.toDataURL('image/png');
  if (el.finalPreview) {
    el.finalPreview.src = dataUrl;
    el.finalPreview.classList.remove('hidden');
  }
  if (el.emptyResult) el.emptyResult.classList.add('hidden');

  if (finalObjectUrl) URL.revokeObjectURL(finalObjectUrl);
  const blob = await new Promise(r=>cv.toBlob(r,'image/png'));
  finalObjectUrl = URL.createObjectURL(blob);
  if (el.downloadBtn) {
    el.downloadBtn.href     = finalObjectUrl;
    el.downloadBtn.download = `labshot-${Date.now()}.png`;
    el.downloadBtn.classList.remove('disabled');
  }
  if (el.shareBtn) el.shareBtn.disabled = false;
  if (el.retakeBtn) el.retakeBtn.disabled = false;

  // Upload Drive
  const uploadName = makeFileName();
  const shareUrl   = `${APPS_SCRIPT_URL}?n=${encodeURIComponent(uploadName)}`;
  renderQR(shareUrl);
  setUploadStatus('uploading', 'Mengunggah ke Google Drive…');
  if (el.qrCodeOuter) el.qrCodeOuter.classList.add('uploading');

  const driveBlob = await resizeForDrive(cv);
  uploadToDrive(driveBlob, uploadName)
    .then(() => {
      setUploadStatus('done', 'Foto berhasil diunggah ✓');
      if (el.qrCodeOuter) el.qrCodeOuter.classList.remove('uploading');
      if (el.qrNote) el.qrNote.innerHTML =
        `Scan QR untuk foto ini. Atau <a class="qr-note-link" href="${shareUrl}" target="_blank" rel="noopener">buka link foto</a>.`;
    })
    .catch(err => {
      console.error('[LabShot] upload error:', err);
      setUploadStatus('error', 'Upload gagal — gunakan tombol Download');
      if (el.qrCodeOuter) el.qrCodeOuter.classList.remove('uploading');
    });
}

/* ── QR ─────────────────────────────────────────────── */
function renderQR(url) {
  if (!el.qrCode) return;
  el.qrCode.innerHTML = '';
  if (!window.QRCode) { if (el.qrNote) el.qrNote.textContent='QR library belum termuat.'; return; }
  new QRCode(el.qrCode, { text:url, width:176, height:176,
    colorDark:'#111827', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M });
  if (el.qrNote) el.qrNote.textContent = 'Scan QR untuk melihat & menyimpan foto.';
}

/* ── New session ─────────────────────────────────────── */
function newSession() {
  resetSession(true);
  if (stream) { startPreviewLoop(); if (el.startSessionBtn) el.startSessionBtn.disabled=false; }
  setStatus('👋 Siap untuk sesi berikutnya. Atur frame dan mulai foto.', 'info');
}

function resetSession(clearPhotos) {
  if (clearPhotos) {
    capturedPhotos=[]; capturedImgs=[]; selectedIdx=-1; retakeIdx=-1;
    reviewReady=false; updateThumbs();
  }
  if (finalObjectUrl) { URL.revokeObjectURL(finalObjectUrl); finalObjectUrl=null; }
  if (el.finalPreview) { el.finalPreview.src=''; el.finalPreview.classList.add('hidden'); }
  if (el.emptyResult)  el.emptyResult.classList.remove('hidden');
  if (el.downloadBtn)  { el.downloadBtn.removeAttribute('href'); el.downloadBtn.classList.add('disabled'); }
  if (el.shareBtn)     el.shareBtn.disabled=true;
  if (el.qrCode)       el.qrCode.innerHTML='';
  if (el.qrCodeOuter)  el.qrCodeOuter.classList.remove('uploading');
  if (el.qrNote)       el.qrNote.textContent='QR foto pribadi aktif setelah hasil dibuat.';
  setUploadStatus('','');
  if (!capturedPhotos.length) { setProgress(0); updateChip(0,0); }
  updateFrameInfo();
}

/* ── Helpers ─────────────────────────────────────────── */
function setBusy(v) {
  if (el.startCameraBtn)  el.startCameraBtn.disabled  = v;
  if (el.startSessionBtn) el.startSessionBtn.disabled = v || !stream;
  if (el.themeSelect)     el.themeSelect.disabled     = v;
  if (el.frameTheme)      el.frameTheme.disabled      = v || !el.themeSelect?.value;
  if (el.filterMode)      el.filterMode.disabled      = v;
  if (el.retakeBtn)       el.retakeBtn.disabled       = v || capturedPhotos.length===0;
  refreshReviewControls();
}

function setProgress(pct) {
  if (el.progressBar) el.progressBar.style.width = pct+'%';
}

function updateChip(current, total) {
  if (!el.stepProgressChip) return;
  if (!total) { el.stepProgressChip.classList.remove('visible'); return; }
  el.stepProgressChip.classList.add('visible');
  if (el.stepChipLabel) el.stepChipLabel.textContent = `Langkah ${Math.min(current+1,total)} dari ${total}`;
  if (el.stepChipTrack) {
    el.stepChipTrack.innerHTML='';
    for (let i=0;i<total;i++) {
      const pip=document.createElement('span');
      pip.className='step-chip-pip'+(i<current?' done':i===current?' active':'');
      el.stepChipTrack.appendChild(pip);
    }
  }
}

/* ── Toast ──────────────────────────────────────────── */
const TOAST_MAP = {
  idle:    {icon:'💤',cls:'idle'},    info:   {icon:'ℹ️',cls:'info'},
  active:  {icon:'📷',cls:'active'},  success:{icon:'✅',cls:'success'},
  warning: {icon:'⚠️',cls:'warning'}, error:  {icon:'🚫',cls:'error'},
};

function setStatus(msg, type='info', autoDismiss=0) {
  if (el.statusText) el.statusText.textContent = msg;
  const toast=el.statusToast; if (!toast) return;

  let fl=type;
  if (fl==='info') {
    if (msg.startsWith('✅')||msg.startsWith('🎉'))                               fl='success';
    else if (msg.startsWith('⚠️')||msg.startsWith('❌')||msg.startsWith('🚫'))   fl='error';
    else if (msg.startsWith('📷')||msg.startsWith('📸')||msg.startsWith('⏳'))   fl='active';
    else if (msg.startsWith('🔀')||msg.startsWith('👋'))                          fl='info';
  }
  const f=TOAST_MAP[fl]||TOAST_MAP.info;

  const iconEl=toast.querySelector('.toast-icon');
  if (iconEl) iconEl.textContent=f.icon;
  if (el.statusToastText) el.statusToastText.textContent=msg.replace(/^[^\s]+\s*/,'');

  toast.className='status-toast '+f.cls+' show';
  if (_toastTimer) clearTimeout(_toastTimer);
  if (autoDismiss>0) _toastTimer=setTimeout(()=>toast.className='status-toast '+f.cls, autoDismiss);
}

function setUploadStatus(state, msg) {
  if (!el.uploadStatus) return;
  el.uploadStatus.className='upload-status '+(state||'');
  const dot = state ? `<span class="upload-dot"></span>` : '';
  el.uploadStatus.innerHTML = dot + (msg||'');
}

/* ── Audio ──────────────────────────────────────────── */
function ensureAudio() {
  if (!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
}
function playTone(freq,dur,vol=0.38) {
  if (!soundOn||!audioCtx) return;
  try {
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
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

/* ── Drive upload ───────────────────────────────────── */
function makeFileName() {
  const now=new Date(), pad=n=>String(n).padStart(2,'0');
  return `ls-${String(now.getFullYear()).slice(-2)}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${Math.random().toString(36).slice(2,5)}.jpg`;
}

async function resizeForDrive(src) {
  const W=720,H=1280,c=document.createElement('canvas');
  c.width=W; c.height=H; c.getContext('2d').drawImage(src,0,0,W,H);
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
  const b64=await blobToB64(blob);
  await fetch(APPS_SCRIPT_URL,{method:'POST',mode:'no-cors',
    body:JSON.stringify({imageBase64:b64,fileName})});
}
