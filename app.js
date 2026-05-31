/**
 * Boostly — AI growth assistant (vanilla JS)
 * Flow: Sign in → Caption (step 1) → Flyer/Video (step 2) → Brand upload (step 3) → Preview (step 4)
 */
(function () {
  'use strict';

  const MAX_HISTORY = 50;
  const MAX_IMAGE_BYTES = 400000;

  let records = [];
  let activeRecordId = null;
  let wizardStep = 1;
  let selectedFormat = null;
  let brandKit = { logo: null, photo1: null, photo2: null, font: '', colors: '' };

  const $ = (id) => document.getElementById(id);

  const INDUSTRY_LABELS = {
    food: 'Food & Restaurants',
    fashion: 'Fashion & Clothing',
    beauty: 'Beauty & Cosmetics',
    tech: 'Tech & Electronics',
    retail: 'Retail & E-commerce',
    health: 'Health & Wellness',
    education: 'Education & Training',
    other: 'Other',
  };

  const PLATFORM_LABELS = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp Status',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    twitter: 'X (Twitter)',
    linkedin: 'LinkedIn',
    pinterest: 'Pinterest',
    snapchat: 'Snapchat',
  };

  const VIDEO_PLATFORMS = new Set(['tiktok', 'youtube', 'instagram', 'snapchat', 'whatsapp']);
  const FLYER_PLATFORMS = new Set(['facebook', 'pinterest', 'linkedin', 'twitter', 'whatsapp']);

  const PLATFORM_TIPS = {
    instagram: { bestTime: '12pm', hashtags: '8–12', tipExtra: 'Use a Reel or carousel for offers. Pin your WhatsApp link in bio.' },
    facebook: { bestTime: '1pm', hashtags: '3–5', tipExtra: 'Share to your Page and local groups.' },
    whatsapp: { bestTime: '7pm', hashtags: 'N/A', tipExtra: 'Post to Status at lunch and evening.' },
    tiktok: { bestTime: '6pm', hashtags: '4–6', tipExtra: 'Hook viewers in the first 2 seconds.' },
    youtube: { bestTime: '5pm', hashtags: '5–8', tipExtra: 'Use Shorts for promos.' },
    twitter: { bestTime: '9am', hashtags: '2–4', tipExtra: 'Post offers with an image.' },
    linkedin: { bestTime: '8am', hashtags: '3–5', tipExtra: 'Lead with a business story.' },
    pinterest: { bestTime: '8pm', hashtags: '5–10', tipExtra: 'Vertical pins with bold text.' },
    snapchat: { bestTime: '10pm', hashtags: 'N/A', tipExtra: 'Use Stories with DM prompts.' },
  };

  function storageKey() {
    return window.BoostlyAuth?.storageKey('boostly_generations_v1') || 'boostly_generations_v1_guest';
  }

  function brandKey() {
    return window.BoostlyAuth?.storageKey('boostly_brand_v1') || 'boostly_brand_v1_guest';
  }

  // ── loadData / saveData ───────────────────────────────────────────────

  function loadData() {
    try {
      const raw = window.BoostlyAuth?.getData(storageKey());
      records = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(records)) records = [];
    } catch {
      records = [];
    }
  }

  function saveData() {
    try {
      const result = window.BoostlyAuth?.setData(storageKey(), JSON.stringify(records));
      if (result && !result.ok) throw new Error('Save failed');
    } catch (err) {
      console.error('Boostly: could not save', err);
      alert('Could not save content. Try running start.bat and use http://localhost:3000');
    }
  }

  function loadBrandKit() {
    try {
      const raw = window.BoostlyAuth?.getData(brandKey());
      if (raw) brandKit = { ...brandKit, ...JSON.parse(raw) };
    } catch { /* keep defaults */ }
    applyBrandKitToUI();
  }

  function saveBrandKit() {
    try {
      window.BoostlyAuth?.setData(brandKey(), JSON.stringify(brandKit));
    } catch (err) {
      console.error('Boostly: could not save brand kit', err);
    }
  }

  // ── auth ──────────────────────────────────────────────────────────────

  let appStarted = false;
  let signOutBound = false;

  function initAuth() {
    if (typeof window.BoostlyAuth === 'undefined') return false;

    const session = BoostlyAuth.getSession();
    const gate = $('auth-gate');
    const shell = $('app-shell');

    if (!session) {
      appStarted = false;
      gate?.removeAttribute('hidden');
      shell?.setAttribute('hidden', '');
      return false;
    }

    gate?.setAttribute('hidden', '');
    shell?.removeAttribute('hidden');

    const name = session.name || 'User';
    setText('nav-username', name.split(' ')[0]);
    setText('nav-avatar', initials(name));

    if (session.businessName && $('input-biz-name') && !$('input-biz-name').value) {
      $('input-biz-name').value = session.businessName;
      if ($('input-business-name')) $('input-business-name').value = session.businessName;
    }

    if (!signOutBound) {
      signOutBound = true;
      $('btn-signout')?.addEventListener('click', () => {
        BoostlyAuth.signOut();
        appStarted = false;
        gate?.removeAttribute('hidden');
        shell?.setAttribute('hidden', '');
        window.scrollTo(0, 0);
      });
    }

    return true;
  }

  function startApp() {
    if (appStarted) return;
    appStarted = true;
    loadData();
    loadBrandKit();
    if (records.length) activeRecordId = records[0].id;
    renderSavedList();
    renderInsights();
    updateHeroStats();
    setFooterYear();
    bindCopyButtons();
    bindWizardEvents();
    setWizardStep(1);
  }

  // ── helpers ───────────────────────────────────────────────────────────

  function uid() {
    return `gen_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function initials(name) {
    if (!name) return '??';
    return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function dayKey(iso) {
    return (iso || '').slice(0, 10);
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString('en-NG', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function showEl(id, show) {
    const el = $(id);
    if (!el) return;
    if (show) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  }

  function showInsightsResults(show) {
    showEl('insights-empty', !show);
    showEl('insights-results', show);
  }

  function ensureFormDefaults() {
    if ($('input-industry') && !$('input-industry').value) $('input-industry').value = 'other';
    if ($('input-platform') && !$('input-platform').value) $('input-platform').value = 'instagram';
  }

  function getFormPayload() {
    ensureFormDefaults();
    return {
      bizName: ($('input-biz-name')?.value || $('input-business-name')?.value || '').trim(),
      product: ($('input-product')?.value || '').trim(),
      industry: $('input-industry')?.value || 'other',
      audience: ($('input-audience')?.value || '').trim(),
      platform: $('input-platform')?.value || 'instagram',
      promo: ($('input-promo')?.value || '').trim(),
    };
  }

  function syncHeroToMainForm() {
    const name = $('input-business-name')?.value.trim();
    const product = $('input-product')?.value.trim();
    if (name) $('input-biz-name').value = name;
    if (product && !$('input-promo')?.value.trim()) {
      $('input-promo').placeholder = `Promote: ${product}`;
    }
  }

  function validateHero() {
    if (!$('input-business-name')?.value.trim()) { $('input-business-name')?.focus(); return false; }
    if (!$('input-product')?.value.trim()) { $('input-product')?.focus(); return false; }
    return true;
  }

  function validateGenerateForm() {
    syncHeroToMainForm();
    ensureFormDefaults();
    let valid = true;
    if (!$('input-biz-name')?.value.trim()) {
      $('input-biz-name')?.closest('.field')?.classList.add('field--error');
      valid = false;
    } else {
      $('input-biz-name')?.closest('.field')?.classList.remove('field--error');
    }
    ['input-industry', 'input-platform'].forEach((id) => {
      const el = $(id);
      el?.closest('.field')?.classList.toggle('field--error', !el?.value);
      if (!el?.value) valid = false;
    });
    if (!valid) alert('Please enter your business name and choose a platform.');
    return valid;
  }

  /** Recommend flyer vs video from platform + industry. */
  function recommendFormat(platform, industry) {
    if (['tiktok', 'youtube', 'snapchat'].includes(platform)) return 'video';
    if (platform === 'pinterest' || platform === 'facebook') return 'flyer';
    if (platform === 'instagram') return industry === 'food' || industry === 'fashion' ? 'video' : 'flyer';
    if (platform === 'whatsapp') return 'video';
    if (VIDEO_PLATFORMS.has(platform) && !FLYER_PLATFORMS.has(platform)) return 'video';
    return 'flyer';
  }

  function buildContent(data) {
    const name = data.bizName || 'Your business';
    const offer = data.promo || data.product || 'something special';
    const industry = INDUSTRY_LABELS[data.industry] || INDUSTRY_LABELS.other;
    const audience = data.audience || 'customers in your area';
    const platform = data.platform || 'instagram';
    const tips = PLATFORM_TIPS[platform] || PLATFORM_TIPS.instagram;
    const platformLabel = PLATFORM_LABELS[platform] || platform;
    const tag = name.replace(/\s+/g, '');

    const caption =
      platform === 'whatsapp'
        ? `🔥 ${name} — ${offer}\n\nMade for ${audience}. Reply *ORDER* or DM to get yours today. Limited slots! 🚀`
        : `✨ ${offer} at ${name}!\n\nPerfect for ${audience}. Link in bio or DM to order — we reply fast. 📲\n\n#${tag} #LagosBusiness #OrderNow`;

    const design = `${name} promo for ${platformLabel}: "${offer}" — ${industry} style, brand colours, CTA "DM to order".`;

    const tip = `Post on ${platformLabel} around ${tips.bestTime} on weekdays. Audience: ${audience}. ${tips.tipExtra}`;

    return { caption, design, tip, bestTime: tips.bestTime, hashtags: tips.hashtags };
  }

  function createRecord(data) {
    const content = buildContent(data);
    return {
      id: uid(),
      bizName: data.bizName,
      product: data.product || '',
      industry: data.industry,
      audience: data.audience || '',
      platform: data.platform,
      promo: data.promo || '',
      caption: content.caption,
      design: content.design,
      tip: content.tip,
      bestTime: content.bestTime,
      hashtags: content.hashtags,
      visualFormat: null,
      visualBrief: '',
      brandKit: null,
      visualReady: false,
      timeCreated: new Date().toISOString(),
    };
  }

  function pushRecord(data) {
    const record = createRecord(data);
    records.unshift(record);
    if (records.length > MAX_HISTORY) records.length = MAX_HISTORY;
    activeRecordId = record.id;
    saveData();
    return record;
  }

  function getActiveRecord() {
    return records.find((r) => r.id === activeRecordId) || records[0] || null;
  }

  function updateActiveRecord(patch) {
    const idx = records.findIndex((r) => r.id === activeRecordId);
    if (idx === -1) return;
    records[idx] = { ...records[idx], ...patch };
    saveData();
  }

  // ── wizard ────────────────────────────────────────────────────────────

  function setWizardStep(step) {
    wizardStep = step;
    document.querySelectorAll('.wizard-progress__step').forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.toggle('is-active', n === step);
      el.classList.toggle('is-done', n < step);
    });
    showEl('step-format', step === 2);
    showEl('step-brand', step === 3);
    showEl('step-preview', step === 4);
  }

  function showFormatStep(record) {
    const rec = recommendFormat(record.platform, record.industry);
    selectedFormat = rec;

    const platLabel = PLATFORM_LABELS[record.platform] || record.platform;
    const recEl = $('format-recommendation');
    if (recEl) {
      recEl.innerHTML = rec === 'video'
        ? `<strong>Video recommended</strong> for ${platLabel} — short clips get more reach on this platform.`
        : `<strong>Flyer recommended</strong> for ${platLabel} — a bold image works great for feeds and shares.`;
    }

    showEl('badge-flyer', rec === 'flyer');
    showEl('badge-video', rec === 'video');
    document.querySelectorAll('.format-card').forEach((c) => {
      c.classList.toggle('is-selected', c.dataset.format === rec);
    });
    if ($('btn-to-brand')) $('btn-to-brand').disabled = false;

    setWizardStep(2);
    $('step-format')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function selectFormat(format) {
    selectedFormat = format;
    document.querySelectorAll('.format-card').forEach((c) => {
      c.classList.toggle('is-selected', c.dataset.format === format);
    });
    if ($('btn-to-brand')) $('btn-to-brand').disabled = false;
    updateActiveRecord({ visualFormat: format });
  }

  function openBrandStep() {
    if (!selectedFormat) return;
    const isVideo = selectedFormat === 'video';
    setText('label-visual-brief', isVideo ? 'Describe your promo video' : 'Describe your flyer');
    $('input-visual-brief').placeholder = isVideo
      ? 'e.g. 20s Reel, upbeat music, product close-ups, text overlays with price and CTA…'
      : 'e.g. Bold weekend sale flyer, big price tag, food photo centre, festive feel…';
    setText('btn-generate-visual-text', isVideo ? 'Generate video' : 'Generate flyer');
    setWizardStep(3);
    $('step-brand')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) { resolve(null); return; }
      if (file.size > MAX_IMAGE_BYTES) {
        reject(new Error('Image too large — use under 400KB.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function applyBrandKitToUI() {
    [['logo', 'preview-logo', 'zone-logo'], ['photo1', 'preview-photo1', 'zone-photo1'], ['photo2', 'preview-photo2', 'zone-photo2']].forEach(([key, previewId, zoneId]) => {
      const url = brandKit[key];
      const preview = $(previewId);
      const zone = $(zoneId);
      if (url && preview) {
        preview.src = url;
        preview.removeAttribute('hidden');
        zone?.classList.add('has-file');
        zone?.querySelectorAll('.upload-zone__icon, .upload-zone__label, .upload-zone__hint').forEach((el) => el.setAttribute('hidden', ''));
      }
    });
    if ($('input-font')) $('input-font').value = brandKit.font || '';
    if ($('input-brand-colors')) $('input-brand-colors').value = brandKit.colors || '';
  }

  async function handleFileUpload(inputId, brandKeyName, previewId, zoneId) {
    const input = $(inputId);
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      brandKit[brandKeyName] = dataUrl;
      saveBrandKit();
      applyBrandKitToUI();
    } catch (err) {
      alert(err.message || 'Could not upload image.');
      input.value = '';
    }
  }

  function collectBrandFromForm() {
    brandKit.font = $('input-font')?.value.trim() || '';
    brandKit.colors = $('input-brand-colors')?.value.trim() || '';
    saveBrandKit();
    return {
      logo: brandKit.logo,
      photo1: brandKit.photo1,
      photo2: brandKit.photo2,
      font: brandKit.font,
      colors: brandKit.colors,
    };
  }

  function buildVisualPreview(record) {
    const offer = record.promo || record.product || record.bizName;
    const isVideo = record.visualFormat === 'video';
    const preview = $('visual-preview');
    const headline = $('preview-headline');
    const sub = $('preview-sub');
    const cta = $('preview-cta');
    const logo = $('preview-brand-logo');
    const tag = $('preview-format-tag');

    if (preview) {
      preview.classList.toggle('visual-preview--flyer', !isVideo);
    }
    setText('preview-title', isVideo ? 'Your promo video' : 'Your promo flyer');
    setText('preview-format-tag', isVideo ? 'Video · 20s' : 'Flyer');
    if (headline) headline.textContent = offer;
    if (sub) sub.textContent = `${record.bizName} · ${PLATFORM_LABELS[record.platform] || record.platform}`;
    if (cta) cta.textContent = record.platform === 'whatsapp' ? 'Reply to order' : 'DM to order';

    if (logo && brandKit.logo) {
      logo.src = brandKit.logo;
      logo.removeAttribute('hidden');
    } else if (logo) {
      logo.setAttribute('hidden', '');
    }

    if (brandKit.photo1 && preview) {
      preview.style.backgroundImage = `linear-gradient(rgba(8,15,31,.55), rgba(8,15,31,.75)), url(${brandKit.photo1})`;
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
    }
  }

  function finishVisualGenerate() {
    const record = getActiveRecord();
    if (!record) return;

    const brief = $('input-visual-brief')?.value.trim();
    if (!brief) {
      alert('Describe the flyer or video you want.');
      $('input-visual-brief')?.focus();
      return;
    }

    const kit = collectBrandFromForm();
    const btn = $('btn-generate-visual');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }

    window.setTimeout(() => {
      const design = buildContent(record);
      const visualDesign = selectedFormat === 'video'
        ? `Video: ${brief}. ${design.design} Motion: text overlays, 20s, vertical 9:16.`
        : `Flyer: ${brief}. ${design.design}`;

      updateActiveRecord({
        visualFormat: selectedFormat,
        visualBrief: brief,
        brandKit: kit,
        design: visualDesign,
        visualReady: true,
      });

      buildVisualPreview(getActiveRecord());
      setWizardStep(4);
      renderSavedList();
      showEl('insight-design-card', true);
      setText('insight-design', visualDesign);

      if (btn) {
        btn.disabled = false;
        setText('btn-generate-visual-text', selectedFormat === 'video' ? 'Generate video' : 'Generate flyer');
      }
      $('step-preview')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 1200);
  }

  function downloadVisual() {
    const record = getActiveRecord();
    if (!record?.visualReady) return;

    const canvas = document.createElement('canvas');
    const isVideo = record.visualFormat === 'video';
    canvas.width = isVideo ? 1080 : 1080;
    canvas.height = isVideo ? 1920 : 1350;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#152847');
    grad.addColorStop(1, '#1e3f72');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#eef4ff';
    ctx.font = 'bold 52px Fraunces, Georgia, serif';
    ctx.textAlign = 'center';
    wrapText(ctx, record.promo || record.product || record.bizName, canvas.width / 2, canvas.height * 0.45, canvas.width - 80, 58);

    ctx.font = '600 28px DM Sans, sans-serif';
    ctx.fillStyle = 'rgba(238,244,255,.8)';
    ctx.fillText(record.bizName, canvas.width / 2, canvas.height * 0.62);

    ctx.fillStyle = '#4f9cf9';
    roundRect(ctx, canvas.width / 2 - 120, canvas.height * 0.72, 240, 56, 28);
    ctx.fill();
    ctx.fillStyle = '#080f1f';
    ctx.font = 'bold 24px DM Sans, sans-serif';
    ctx.fillText('DM to order', canvas.width / 2, canvas.height * 0.72 + 36);

    const link = document.createElement('a');
    link.download = `boostly-${record.visualFormat}-${record.bizName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && i > 0) {
        ctx.fillText(line, x, yy);
        line = words[i] + ' ';
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, yy);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function resetCampaign() {
    selectedFormat = null;
    setWizardStep(1);
    showEl('btn-continue-visual', false);
    showEl('insight-design-card', false);
    if ($('input-visual-brief')) $('input-visual-brief').value = '';
    $('form-generate')?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── analytics ─────────────────────────────────────────────────────────

  function getLastNDays(n) {
    const days = [];
    const d = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const copy = new Date(d);
      copy.setDate(copy.getDate() - i);
      days.push(copy.toISOString().slice(0, 10));
    }
    return days;
  }

  function countByDay() {
    const map = {};
    records.forEach((r) => { map[dayKey(r.timeCreated)] = (map[dayKey(r.timeCreated)] || 0) + 1; });
    return map;
  }

  function calcStreak() {
    if (!records.length) return 0;
    const daysWithPosts = new Set(records.map((r) => dayKey(r.timeCreated)));
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = d.toISOString().slice(0, 10);
      if (daysWithPosts.has(key)) { streak++; d.setDate(d.getDate() - 1); }
      else if (i === 0) { d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }

  function recordsToday() {
    return records.filter((r) => dayKey(r.timeCreated) === todayKey());
  }

  function recordsThisWeek() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const cutoff = weekAgo.toISOString().slice(0, 10);
    return records.filter((r) => dayKey(r.timeCreated) >= cutoff);
  }

  // ── renderSavedList ─────────────────────────────────────────────────────

  function renderSavedList() {
    const root = $('saved-list');
    const section = $('saved-section');
    if (!root) return;

    if (section) {
      if (records.length) section.removeAttribute('hidden');
      else section.setAttribute('hidden', '');
    }
    if (!records.length) { root.innerHTML = ''; return; }

    root.innerHTML = records.map((r) => {
      const plat = PLATFORM_LABELS[r.platform] || r.platform;
      const fmt = r.visualFormat ? (r.visualFormat === 'video' ? '🎬' : '🖼️') : '✏️';
      const active = r.id === activeRecordId ? ' style="border-color:rgba(79,156,249,.55)"' : '';
      const preview = (r.caption || '').replace(/\s+/g, ' ').slice(0, 60);
      return `
        <li class="feat-card boostly-history-item" role="listitem" data-id="${escapeHtml(r.id)}" tabindex="0"${active}>
          <div class="feat-icon" aria-hidden="true" style="font-size:.75rem;font-weight:700;color:var(--cream)">${escapeHtml(initials(r.bizName))}</div>
          <div class="feat-body">
            <p class="feat-title">${fmt} ${escapeHtml(r.bizName)} · ${escapeHtml(plat)}</p>
            <p class="feat-desc">${escapeHtml(formatTime(r.timeCreated))} — ${escapeHtml(preview)}…</p>
          </div>
        </li>`;
    }).join('');

    root.querySelectorAll('.boostly-history-item').forEach((li) => {
      li.addEventListener('click', () => selectRecord(li.getAttribute('data-id')));
    });
  }

  function selectRecord(id) {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    activeRecordId = id;
    renderSavedList();
    renderInsights(record);
    if (record.visualReady) {
      selectedFormat = record.visualFormat;
      buildVisualPreview(record);
      setWizardStep(4);
    } else if (record.caption) {
      showEl('btn-continue-visual', true);
      setWizardStep(1);
    }
    $('insights-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── renderInsights ──────────────────────────────────────────────────────

  function renderInsights(record) {
    const latest = record || getActiveRecord();
    const statusText = $('insights-status-text');
    const subtitle = $('insights-subtitle');
    const week = recordsThisWeek();
    const streak = calcStreak();
    const byDay = countByDay();
    const last5 = getLastNDays(5);
    const maxDay = Math.max(1, ...last5.map((d) => byDay[d] || 0));
    const weekRate = last5.length ? Math.round((last5.filter((d) => (byDay[d] || 0) > 0).length / last5.length) * 100) : 0;

    if (!latest) {
      showInsightsResults(false);
      showEl('btn-continue-visual', false);
      if (statusText) statusText.textContent = 'Ready';
      if (subtitle) subtitle.textContent = 'Powered by Boostly';
      setText('stat-best-time', '—');
      setText('stat-hashtags', '—');
      removeActivityBars();
      return;
    }

    showInsightsResults(true);
    showEl('btn-continue-visual', !latest.visualReady);
    showEl('insight-design-card', !!latest.visualReady);
    if (statusText) statusText.textContent = latest.visualReady ? 'Complete' : 'Caption ready';
    if (subtitle) subtitle.textContent = `${week.length} this week · ${streak}d streak`;

    setText('insight-caption', latest.caption);
    setText('insight-design', latest.design || '');
    setText('insight-tip', latest.tip);
    setText('stat-best-time', latest.bestTime || '—');
    setText('stat-hashtags', latest.hashtags || '—');

    renderActivityBars(last5, byDay, maxDay);
    bindCopyButtons();
  }

  function removeActivityBars() {
    document.getElementById('boostly-activity-bars')?.remove();
  }

  function renderActivityBars(days, byDay, maxDay) {
    removeActivityBars();
    const stats = document.querySelector('.insights__stats');
    if (!stats) return;
    const wrap = document.createElement('div');
    wrap.id = 'boostly-activity-bars';
    wrap.style.cssText = 'grid-column:1/-1;display:flex;align-items:flex-end;gap:6px;height:48px;margin-bottom:4px;padding:0 4px';
    days.forEach((d) => {
      const count = byDay[d] || 0;
      const h = Math.round((count / maxDay) * 100) || 4;
      const label = new Date(d + 'T12:00:00').toLocaleDateString('en-NG', { weekday: 'narrow' });
      const col = document.createElement('div');
      col.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:4px';
      col.innerHTML = `<div style="width:100%;background:rgba(79,156,249,.15);border-radius:4px;height:36px;display:flex;align-items:flex-end"><div style="width:100%;height:${h}%;min-height:4px;background:var(--amber);border-radius:4px 4px 0 0"></div></div><span style="font-size:.65rem;color:#64748b">${label}</span>`;
      wrap.appendChild(col);
    });
    stats.insertBefore(wrap, stats.firstChild);
  }

  function updateHeroStats() {
    const trust = document.querySelector('.hero__trust');
    if (!trust) return;
    const total = records.length;
    const today = recordsToday().length;
    const msg = total === 0
      ? '1,200+ businesses growing with Boostly'
      : `${today} post${today === 1 ? '' : 's'} today · ${total} saved`;
    const span = trust.querySelector('.hero__trust-msg') || document.createElement('span');
    span.className = 'hero__trust-msg';
    span.textContent = msg;
    if (!span.parentElement) trust.appendChild(span);
  }

  function setBusy(busy) {
    [$('btn-primary'), $('btn-generate')].forEach((btn) => {
      if (!btn) return;
      btn.disabled = busy;
      btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    });
    $('insights-status')?.classList.toggle('insights__status--busy', busy);
    if ($('insights-status-text')) {
      $('insights-status-text').textContent = busy ? 'Generating…' : 'Ready';
    }
  }

  function bindCopyButtons() {
    document.querySelectorAll('.insight-card__copy').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        const text = $(btn.getAttribute('data-target'))?.textContent;
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          const orig = btn.innerHTML;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.innerHTML = orig; }, 2000);
        } catch {
          alert('Copy failed — select the text manually.');
        }
      });
    });
  }

  function setFooterYear() {
    const line = document.querySelector('.footer__bottom p');
    if (line) line.textContent = `© ${new Date().getFullYear()} Boostly Technologies Ltd. All rights reserved.`;
  }

  // ── generate handlers ─────────────────────────────────────────────────

  function finishGenerate(data) {
    setBusy(true);
    window.setTimeout(() => {
      const record = pushRecord(data);
      renderSavedList();
      renderInsights(record);
      updateHeroStats();
      setBusy(false);
      setWizardStep(1);
      $('insights-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 900);
  }

  function runGenerate() {
    syncHeroToMainForm();
    if (!validateGenerateForm()) return;
    finishGenerate(getFormPayload());
  }

  function handleHeroSubmit(e) {
    e.preventDefault();
    syncHeroToMainForm();
    if (!validateHero()) return;
    if (!$('input-biz-name')?.value.trim()) $('input-biz-name').value = $('input-business-name').value.trim();
    const hasDetail = $('input-industry')?.value && $('input-platform')?.value;
    if (hasDetail) { runGenerate(); return; }
    $('main')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => ($('input-industry')?.value ? $('input-platform') : $('input-industry'))?.focus(), 400);
  }

  // ── init ────────────────────────────────────────────────────────────────

  function bindWizardEvents() {
    $('btn-continue-visual')?.addEventListener('click', () => {
      const record = getActiveRecord();
      if (record) showFormatStep(record);
    });

    document.querySelectorAll('.format-card').forEach((card) => {
      card.addEventListener('click', () => selectFormat(card.dataset.format));
    });

    $('btn-to-brand')?.addEventListener('click', openBrandStep);
    $('btn-back-caption')?.addEventListener('click', () => {
      setWizardStep(1);
      $('insights-panel')?.scrollIntoView({ behavior: 'smooth' });
    });
    $('btn-back-format')?.addEventListener('click', () => {
      const record = getActiveRecord();
      if (record) showFormatStep(record);
    });
    $('btn-back-brand')?.addEventListener('click', openBrandStep);
    $('btn-generate-visual')?.addEventListener('click', finishVisualGenerate);
    $('btn-download-visual')?.addEventListener('click', downloadVisual);
    $('btn-new-campaign')?.addEventListener('click', resetCampaign);

    ['input-logo', 'input-photo1', 'input-photo2'].forEach((id, i) => {
      const keys = ['logo', 'photo1', 'photo2'];
      const previews = ['preview-logo', 'preview-photo1', 'preview-photo2'];
      const zones = ['zone-logo', 'zone-photo1', 'zone-photo2'];
      $(id)?.addEventListener('change', () => handleFileUpload(id, keys[i], previews[i], zones[i]));
    });
  }

  function init() {
    $('form-hero')?.addEventListener('submit', handleHeroSubmit);
    $('form-generate')?.addEventListener('submit', (e) => { e.preventDefault(); runGenerate(); });
    $('btn-newsletter')?.addEventListener('click', () => {
      const email = $('input-newsletter')?.value.trim();
      if (!email?.includes('@')) { alert('Please enter a valid email.'); return; }
      alert(`Thanks! We'll send tips to ${email}`);
      $('input-newsletter').value = '';
    });

    if (initAuth()) startApp();

    window.addEventListener('boostly-authed', () => {
      if (initAuth()) startApp();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
