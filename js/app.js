/* 物語の流れ（タイトル → チャット → 写真クリップ → ホームさんぽ → 見守りラウンド → お昼トーク → 作戦会議 → 正直トーク → 帰り道 → 結果）
   会社ごとの中身は company.js。この画面の作りは全社共通 */
(function () {
  'use strict';
  const C = window.COMPANY, AU0 = window.AUDIO || {};
  // 音まわりで例外が出ても（AudioContext が作れない端末など）ボタンの処理や進行が止まらないようにする
  const AU = {};
  ['unlock', 'setMuted', 'se', 'bgm'].forEach(k => { AU[k] = (...a) => { try { if (AU0[k]) AU0[k](...a); } catch (e) {} }; });
  AU.isMuted = () => { try { return !!(AU0.isMuted && AU0.isMuted()); } catch (e) { return false; } };
  const Q = new URLSearchParams(location.search);
  const FAST = Q.has('fast');
  const RM = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  const $ = s => document.querySelector(s);
  const app = $('#app');
  const wait = ms => new Promise(r => setTimeout(r, FAST ? Math.min(ms, 30) : ms));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (id, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const fmt = n => (Math.round(+n) || 0).toLocaleString('ja-JP');
  const noEmoji = s => String(s).replace(/^[^\p{L}\p{N}「『（(]+/u, '').trim();      // 先頭の絵文字を外す（ボタンには絵文字を使わない）
  const noArrow = s => String(s).replace(/\s*[▶▷→]\s*$/, '');
  // 選択肢の並びを毎回まぜる（正解がいつも同じ位置にならないように）。返すのは元の番号の並び
  const shuffled = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const person = w => C.people[w];
  const N_CHARMS = Object.keys(C.charms).length;
  // ms を指定すると、その時間で読みこめなければ null（通信が止まっても待ち続けない）
  const loadImg = (src, ms) => new Promise(r => {
    const i = new Image(); const to = ms ? setTimeout(() => r(null), ms) : 0;
    i.onload = () => { clearTimeout(to); r(i); }; i.onerror = () => { clearTimeout(to); r(null); }; i.src = src;
  });
  function haptic() { try { if (navigator.vibrate) navigator.vibrate(6); } catch (e) {} }
  function tap(se) { AU.unlock(); AU.se(se || 'tap'); haptic(); }   // unlock：タブから戻ったあと音が止まったままにならないよう、タップのたびに再開をうながす

  const S = { charms: new Set(), axis: Object.fromEntries(Object.keys(C.axes).map(k => [k, 0])), pick: null, unsure: [], work: null,
              quiz: { ok: 0, n: 0 }, asked: [], yes: 0, no: 0, saved: false };
  window.__state = S;

  /* =========================================================
     記録（localStorage。使えないときはメモリだけで動く）
     キー nkmc_records_v1：{ [会社ID]: { name, url, plays, first, last, best, charms } }
     ========================================================= */
  const REC_KEY = 'nkmc_records_v1';
  let memRec = null, recOK = true;
  const clone = o => JSON.parse(JSON.stringify(o));
  function recRead() {
    try {
      const s = localStorage.getItem(REC_KEY);
      if (s) { const o = JSON.parse(s); if (o && typeof o === 'object' && !Array.isArray(o)) return o; }
    } catch (e) { recOK = false; }
    return memRec ? clone(memRec) : {};
  }
  function recWrite(all) {
    memRec = clone(all);
    try { localStorage.setItem(REC_KEY, JSON.stringify(all)); recOK = true; } catch (e) { recOK = false; }
  }
  function sane(r) {
    if (!r || typeof r !== 'object') return null;
    const obj = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
    return {
      name: typeof r.name === 'string' ? r.name : '', short: typeof r.short === 'string' ? r.short : '',
      industry: typeof r.industry === 'string' ? r.industry : '', area: typeof r.area === 'string' ? r.area : '',
      url: typeof r.url === 'string' ? r.url : '', plays: Math.max(0, r.plays | 0), first: typeof r.first === 'string' ? r.first : null,
      last: obj(r.last), best: obj(r.best), charms: Array.isArray(r.charms) ? r.charms.filter(k => typeof k === 'string') : [],
    };
  }
  const gameUrl = () => location.href.split(/[?#]/)[0];
  const PREV = sane(recRead()[C.id]);            // このプレイの前の記録（前回・ベストとの比較用）
  const prevCharms = new Set(PREV ? PREV.charms : []);
  function saveRecord() {
    const all = recRead();
    const r = sane(all[C.id]) || { name: C.name, url: '', plays: 0, first: null, last: null, best: null, charms: [] };
    const now = new Date().toISOString();
    const bestBefore = r.best;
    if (!S.saved) { r.plays += 1; r.first = r.first || now; }
    const w = S.work || { score: 0, rank: '-' };
    const score = Math.max(0, Math.round(+w.score || 0)), rank = String(w.rank || '-');
    Object.assign(r, { name: C.name, short: C.shortName, industry: C.industry, area: C.area, url: gameUrl() });
    r.last = { date: now, score, rank, charms: [...S.charms], total: N_CHARMS, point: C.axes[topAxis()].label };
    const newBest = !!bestBefore && score > (+bestBefore.score || 0);
    if (!bestBefore || newBest) r.best = { score, rank, date: now };
    r.charms = [...new Set([...r.charms, ...S.charms])].filter(k => C.charms[k]);
    all[C.id] = r;
    recWrite(all);
    S.saved = true;
    return { r, all, newBest, score, rank };
  }
  const dt = iso => { const d = new Date(iso); return isNaN(d) ? null : d; };
  const md = iso => { const d = dt(iso); return d ? `${d.getMonth() + 1}/${d.getDate()}` : '—'; };
  const ymd = iso => { const d = dt(iso); return d ? `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` : '—'; };

  /* =========================================================
     画面の切りかえ・右上のピル
     ========================================================= */
  let cur = $('#title');
  // 二度押しの2回目が、切りかわった直後の画面（次のクイズの選択肢・つぎへ など）を押してしまわないように、
  // 画面や中身が切りかわってから少しの間（350ms）は、その画面のボタンへの人のクリックを捨てる
  let guardAt = 0;
  const tapGuard = () => { guardAt = performance.now(); };
  app.addEventListener('click', e => {
    // 人のタップだけ（isTrusted）。プログラムからの click（作業ゲームのボットなど）は通す
    if (e.isTrusted && performance.now() - guardAt < 350 && cur && cur.contains(e.target) && e.target.closest('button')) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  function show(id) {
    const next = $('#' + id);
    app.dataset.scr = id;
    if (next === cur) return;
    tapGuard();
    const prev = cur; cur = next;
    next.classList.remove('leave');
    next.classList.add('on');
    if (!RM) { next.classList.add('enter'); setTimeout(() => next.classList.remove('enter'), 460); }
    if (prev) {
      if (RM) prev.classList.remove('on');
      else { prev.classList.add('leave'); setTimeout(() => { if (prev !== cur) prev.classList.remove('on'); prev.classList.remove('leave'); }, 300); }
    }
  }
  function setMuteIcon() { const m = $('#mute'); m.innerHTML = ic(AU.isMuted() ? 'mute' : 'vol'); m.dataset.muted = AU.isMuted() ? '1' : '0'; m.setAttribute('aria-pressed', AU.isMuted() ? 'true' : 'false'); }
  function setSealCount(n) { $('#sealCount span').textContent = n + '/' + N_CHARMS; }

  /* シール獲得：上部の黒いピルが広がる（ダイナミックアイランド風） */
  const stickerHTML = (k, cls) => { const c = C.charms[k]; return c.sticker ? `<img class="${cls || ''}" src="${c.sticker}" alt="">` : `<span class="emo ${cls || ''}">${ic('spark')}</span>`; };
  let islQ = Promise.resolve();
  function island(html, opt) {
    opt = opt || {};
    islQ = islQ.then(async () => {
      const el = $('#island'), inn = $('#islIn');
      inn.innerHTML = html;
      const Wd = Math.min(app.clientWidth - 24, 380);
      inn.style.width = Wd + 'px';
      const Hd = Math.max(58, inn.offsetHeight);
      const D = FAST ? 700 : (opt.dur || 2700);
      if (el.getAnimations) el.getAnimations().forEach(a => a.cancel());
      if (inn.getAnimations) inn.getAnimations().forEach(a => a.cancel());
      const sm = { width: '120px', height: '34px' }, bg = { width: Wd + 'px', height: Hd + 'px' };
      if (el.animate) {
        if (RM) {
          el.animate([{ ...bg, opacity: 0 }, { ...bg, opacity: 1, offset: .1 }, { ...bg, opacity: 1, offset: .9 }, { ...bg, opacity: 0 }], { duration: D });
          inn.style.opacity = 1; setTimeout(() => { inn.style.opacity = ''; }, D);
        } else {
          const tf = s => `translateX(-50%) scale(${s})`;
          el.animate([
            { ...sm, opacity: 0, transform: tf(.6) }, { ...sm, opacity: 1, transform: tf(1), offset: .07 },
            { ...bg, opacity: 1, transform: tf(1), offset: .2 }, { ...bg, opacity: 1, transform: tf(1), offset: .82 },
            { ...sm, opacity: 1, transform: tf(1), offset: .94 }, { ...sm, opacity: 0, transform: tf(.8) },
          ], { duration: D, easing: 'cubic-bezier(.22,1,.36,1)' });
          inn.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 0, transform: 'scale(.96)', offset: .14 }, { opacity: 1, transform: 'none', offset: .24 },
            { opacity: 1, offset: .78 }, { opacity: 0, offset: .86 }, { opacity: 0 }], { duration: D });
        }
      }
      if (opt.after) setTimeout(opt.after, D * .86);
      await wait(D * .9);
    }).catch(() => {});   // 1回失敗しても、あとの知らせが止まらないように
    return islQ;
  }
  function notify(text, icon) { island(`<span class="emo">${ic(icon || 'check')}</span><div class="tx"><b>${esc(text)}</b></div>`, { dur: 2200 }); }
  function gainCharm(k) {
    if (!k || S.charms.has(k) || !C.charms[k]) return;
    S.charms.add(k);
    const n = S.charms.size, c = C.charms[k];
    AU.se('sticker'); haptic();
    island(`<span class="isl-st">${stickerHTML(k)}<i class="glint"></i></span><div class="tx"><small>魅力シールを見つけた！</small><b>${esc(c.title)}</b></div><span class="cnt">${n}/${N_CHARMS}</span>`, {
      after: () => { setSealCount(n); const sc = $('#sealCount'); sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump'); },
    });
  }
  function addAxis(a, n) { if (a && S.axis[a] != null) S.axis[a] += n || 1; }

  /* 下からのシート */
  function openSheet(html, cls) {
    const opened = app.querySelector('.sheet-bg:not(.out)');
    if (opened) return opened;   // 連打でシートが何枚も重ならないように
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet ${cls || ''}" role="dialog"><div class="grab"></div>${html}</div>`;
    const close = () => { if (bg.classList.contains('out')) return; bg.classList.add('out'); setTimeout(() => bg.remove(), RM ? 0 : 220); };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) { tap(); close(); } });
    app.appendChild(bg);
    return bg;
  }

  /* =========================================================
     タイトル
     ========================================================= */
  const TH = C.theme || {};
  const ACCENT = TH.accent || '#0B5CB5', ACCENT_INK = TH.accentInk || ACCENT;
  const TITLE_PHOTO = TH.titlePhoto || 'img/p_hero.webp';
  document.documentElement.style.setProperty('--accent', ACCENT);
  document.documentElement.style.setProperty('--accent-ink', ACCENT_INK);
  function initTitle() {
    $('#tKv').style.backgroundImage = `url(${TITLE_PHOTO})`;
    if (TH.titlePos) $('#tKv').style.backgroundPosition = TH.titlePos;
    $('#tIssue').textContent = C.issue || '';
    if (C.startLabel) $('#tStartLabel').textContent = C.startLabel;
    if (C.guide) $('#tGuide').src = C.guide.point;
    $('#tGuide').onclick = () => { const g = $('#tGuide'); g.classList.remove('hop'); void g.offsetWidth; g.classList.add('hop'); haptic(); };
    $('#tQuote').innerHTML = esc(C.quote || '');
    $('#tCatch').innerHTML = esc(C.catchLines[0]) + '<br><em>' + esc(C.catchLines[1]) + '</em>';
    $('#tSub').textContent = C.catchSub;
    $('#tPills').innerHTML = `<span>${esc(C.industry)}</span><span>${ic('pin')}${esc(C.area)}</span><span>${esc(C.staff)}</span>`;
    $('#credit').textContent = C.credit;
    $('#bHp').href = C.hp;
    $('#bHp .tx').textContent = C.hpLabel || 'ホームページを見る';
    $('#resLinks').innerHTML = (C.links || []).map(l => `<a class="lrow" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="ib">${ic(l.icon || 'building')}</span><span class="tx">${esc(l.label)}</span>${ic('ext', 'go')}</a>`).join('');
    setMuteIcon();
    setSealCount(0);
    $('#mute').onclick = () => { AU.unlock(); AU.setMuted(!AU.isMuted()); setMuteIcon(); haptic(); };
    const last = PREV && PREV.last;
    if (last) {
      const rec = $('#tRec');
      rec.hidden = false;
      const n = Array.isArray(last.charms) ? last.charms.length : 0;
      rec.innerHTML = `${ic('history')}<span class="tx"><small>前回の記録</small><b>${md(last.date)}</b>・ランク<b>${esc(last.rank || '-')}</b>・<b>${fmt(last.score)}</b>pt・シール<b>${n}/${N_CHARMS}</b></span>${ic('chev-r', 'go')}`;
      rec.onclick = () => { tap(); openRecords(); };
      $('#tStartLabel').textContent = 'もう一度体験する';
    }
  }
  function openRecords() {
    const all = recRead(), r = sane(all[C.id]) || PREV;
    openSheet(`<div class="recsheet"><div class="h3row"><h3 class="h3">あなたの記録</h3><span class="cnt">${r ? r.plays : 0}回 体験</span></div>
      ${recsHTML(r, null)}
      <div class="blk"><div class="h3row"><h3 class="h3">集めた魅力シール</h3><span class="cnt">${r ? r.charms.length : 0} / ${N_CHARMS}</span></div>
        <div class="stk big">${(r ? r.charms : []).filter(k => C.charms[k] && C.charms[k].sticker).map(k => `<img src="${C.charms[k].sticker}" alt="">`).join('') || '<span class="note">まだありません</span>'}</div></div>
      <button class="btn line" data-close style="margin-top:14px">閉じる</button></div>`);
  }

  /* =========================================================
     チャット（LINE風）
     ========================================================= */
  const log = () => $('#cLog');
  let clockMin = 0, nMsg = 0, lastWho = null;
  const clockStr = () => `${Math.floor(clockMin / 60) % 24}:${String(clockMin % 60).padStart(2, '0')}`;
  function scrollEnd() {
    const l = log();
    l.scrollTo({ top: l.scrollHeight, behavior: RM || FAST ? 'auto' : 'smooth' });
  }
  function chatOpen(time, dayLabel) {
    log().innerHTML = ''; lastWho = null; nMsg = 0;
    trayClose(true);
    show('chat');
    $('#cIcons').innerHTML = ['a', 'b'].map(w => `<img src="${person(w).img}" alt="">`).join('');
    $('#cName').textContent = C.groupName + '（3）';
    $('#cSub').textContent = `${person('a').name}・${person('b').name}・あなた`;
    $('#cTime').textContent = time;
    const m = /(\d{1,2}):(\d{2})/.exec(time); clockMin = m ? (+m[1]) * 60 + (+m[2]) : 8 * 60;
    if (dayLabel) { const d = document.createElement('div'); d.className = 'day'; d.innerHTML = `<span>${esc(dayLabel)}</span>`; log().appendChild(d); }
    AU.bgm('chat');
  }
  function tick() { if (++nMsg % 2 === 0) clockMin++; }
  function otherRow(who, cont) {
    const p = person(who);
    const row = document.createElement('div'); row.className = 'row' + (cont ? ' cont' : '');
    row.innerHTML = `<img class="av" src="${p.img}" alt="${esc(p.name)}"><div class="col"><div class="nm">${esc(p.name)}</div><div class="ln"></div></div>`;
    row.querySelector('.av').onclick = () => openProfile(who);
    return row;
  }
  async function say(m) {
    const p = person(m.who), cont = lastWho === m.who;
    const row = otherRow(m.who, cont), ln = row.querySelector('.ln');
    ln.innerHTML = '<div class="bub typing" aria-label="入力中"><i></i><i></i><i></i></div>';
    log().appendChild(row); lastWho = m.who; scrollEnd();
    const len = m.text ? m.text.length : 14;
    await wait(Math.min(1500, 420 + len * 26));
    if (m.face === 2 && p.img2) row.querySelector('.av').src = p.img2;
    ln.innerHTML = (m.img ? `<div class="bub pic${m.stamp ? ' stamp' : ''}${m.res ? ' res' : ''}"><img src="${m.img}" alt=""></div>` : `<div class="bub">${esc(m.text)}</div>`) +
      `<div class="meta"><span>${clockStr()}</span></div>`;
    const b = ln.firstChild;
    if (b.animate && !RM) b.animate([{ opacity: .4, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1.3,.36,1)' });
    const im = ln.querySelector('img'); if (im) im.onload = scrollEnd;
    tick(); scrollEnd();
    AU.se('msg', 0.6);
    if (m.charm) { await wait(250); gainCharm(m.charm); }
    if (m.axis) addAxis(m.axis);
    await wait(380);
  }
  async function sayAll(list) { for (const m of list) await say(m); }
  function meSay(text) {
    const cont = lastWho === 'me';
    const row = document.createElement('div'); row.className = 'row me' + (cont ? ' cont' : '');
    row.innerHTML = `<div class="col"><div class="ln"><div class="bub">${esc(text)}</div><div class="meta"><span class="read">既読 2</span><span>${clockStr()}</span></div></div></div>`;
    log().appendChild(row); lastWho = 'me'; tick(); scrollEnd();
    AU.se('send', 0.6); haptic();
    setTimeout(() => { const r = row.querySelector('.read'); if (r) r.classList.add('on'); }, FAST ? 0 : 650);
  }
  /* 下部の固定エリア（選択肢・つぎへ） */
  function trayOpen(html, many) {
    const t = $('#cTray');
    t.innerHTML = html; t.classList.add('on'); t.classList.toggle('many', !!many);
    tapGuard();
    requestAnimationFrame(() => { log().style.setProperty('--tray-h', t.offsetHeight + 'px'); scrollEnd(); setTimeout(scrollEnd, 360); });
  }
  function trayClose(now) {
    const t = $('#cTray');
    t.classList.remove('on');
    log().style.setProperty('--tray-h', '0px');
    if (now) t.innerHTML = '';
    else setTimeout(() => { if (!t.classList.contains('on')) t.innerHTML = ''; }, 380);
  }
  function choose(options, label) {
    return new Promise(res => {
      const lab = label ? `<div class="tr-lab"><span>${esc(label[0])}</span>${label[1] ? `<em>${esc(label[1])}</em>` : ''}</div>` : '';
      trayOpen(lab + '<div class="tr-opts">' + options.map((o, i) =>
        `<button class="chip" data-i="${i}" style="--d:${i * 45}ms"><span>${esc(noEmoji(o.label || o))}</span>${ic('send')}</button>`).join('') + '</div>', options.length > 3 && options.every(o => noEmoji(o.label || o).length <= 12));
      let done = false;
      $('#cTray').querySelectorAll('.chip').forEach(b => b.onclick = async () => {
        if (done) return; done = true; tap();
        b.classList.add('picked');
        await wait(150);
        trayClose(); res(+b.dataset.i);
      });
    });
  }
  function goButton(text) {
    return new Promise(res => {
      trayOpen(`<button class="btn ink go"><span>${esc(noArrow(text))}</span>${ic('arrow-r')}</button>`);
      const b = $('#cTray .go');
      b.onclick = () => { if (b.dataset.done) return; b.dataset.done = 1; tap(); trayClose(); res(); };
    });
  }
  function openProfile(w) {
    const p = person(w);
    tap();
    openSheet(`<div class="prof"><div class="pf-top"><img src="${p.img}" alt=""><div><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></div></div>
      ${p.profile ? '<ul>' + p.profile.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : ''}
      <button class="btn line" data-close>閉じる</button></div>`);
  }

  async function scenePrologue() {
    chatOpen(C.prologue.time, '入社の前の日');
    const sys = document.createElement('div'); sys.className = 'sysnote';
    sys.textContent = `あなたは明日から ${C.shortName} の ${C.groupName}。アイコンをタップするとプロフィールが見られます`;
    log().appendChild(sys);
    await wait(500);
    await sayAll(C.prologue.msgs);
    const i = await choose(C.prologue.choices);
    meSay(noEmoji(C.prologue.choices[i].label));
    await wait(500);
    await sayAll(C.prologue.choices[i].reply);
    await goButton(C.prologue.next || 'つぎへ');
  }

  /* =========================================================
     1日の写真クリップ（ストーリーズ風）
     ========================================================= */
  function vlogDate() { const d = new Date(); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; }
  // 写真をとても小さく縮めて広げると、やわらかくぼけた背景になる（blur を使わない軽い方法）
  async function ambient(src) {
    try {
      const im = await loadImg(src); if (!im) return null;
      const cv = document.createElement('canvas'); cv.width = 10; cv.height = 16;
      const g = cv.getContext('2d'); g.drawImage(im, 0, 0, 10, 16);
      return cv.toDataURL();
    } catch (e) { return null; }
  }
  function setPhoto(src, pos) {
    const ph = $('#clPh');
    ph.style.backgroundPosition = pos || '';
    ph.style.opacity = 0;
    loadImg(src).then(() => {
      ph.style.backgroundImage = `url(${src})`;
      ph.classList.remove('kb'); void ph.offsetWidth; if (!RM) ph.classList.add('kb');
      ph.style.opacity = 1;
    });
    ambient(src).then(u => { if (u) $('#clAmb').style.backgroundImage = `url(${u})`; });
  }
  async function sceneClips() {
    show('clip'); AU.bgm('chat');
    const n = C.clips.length + 1;
    for (let ci = 0; ci < C.clips.length; ci++) {
      const c = C.clips[ci];
      $('#clBars').innerHTML = Array.from({ length: n }, (_, i) => `<span class="${i < ci ? 'done' : i === ci ? 'run' : ''}"><i></i></span>`).join('');
      $('#clWho').textContent = C.shortName + 'の1日';
      $('#clTime').textContent = c.stamp;
      $('#clStamp').textContent = c.stamp;
      setPhoto(c.img, c.pos);
      const cap = $('#clCap');
      cap.className = 'cl-cap';
      cap.innerHTML = `<span class="t">${esc(c.stamp)} — CLIP ${String(ci + 1).padStart(2, '0')}</span><h2>${esc(c.title)}</h2><p>${esc(c.text)}</p>`;
      if (cap.animate && !RM) cap.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      const card = $('#clCard');
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
      card.scrollTop = 0; $('#clip').scrollTop = 0; $('#clip').classList.remove('answered');
      tapGuard();
      const nextLabel = noArrow(c.next || 'つぎへ');
      if (!c.quiz) {
        card.innerHTML = `<button class="btn ink" id="clNext"><span>${esc(nextLabel)}</span>${ic('arrow-r')}</button>`;
        await new Promise(res => { $('#clNext').onclick = () => { tap(); res(); }; });
        continue;
      }
      card.innerHTML = `<div class="quiz"><div class="ql">QUIZ ${ci + 1}</div><div class="q">${esc(c.quiz.q)}</div><div class="opts">` +
        shuffled(c.quiz.opts.length).map((i, pos) => `<button class="opt" data-i="${i}"><span class="k">${'ABCD'[pos]}</span><span>${esc(c.quiz.opts[i])}</span><span class="r"></span></button>`).join('') + '</div></div>';
      await new Promise(res => {
        const opts = card.querySelector('.opts');
        opts.querySelectorAll('.opt').forEach(b => b.onclick = () => {
          if (opts.classList.contains('done')) return;
          const i = +b.dataset.i, ok = i === c.quiz.ok;
          opts.classList.add('done');
          haptic();
          S.quiz.n++; if (ok) S.quiz.ok++;
          const mark = (el, good) => { el.classList.add(good ? 'ok' : 'bad'); el.querySelector('.k').innerHTML = ic(good ? 'check' : 'x'); el.querySelector('.r').textContent = good ? '正解' : 'ざんねん'; };
          mark(b, ok);
          if (!ok) mark(opts.querySelector(`[data-i="${c.quiz.ok}"]`), true);
          AU.se(ok ? 'ok' : 'ng');
          cap.classList.add('min'); $('#clip').classList.add('answered');   // 答えたら写真を小さくして、問題・答え・つぎへを全部見せる
          const e = document.createElement('div'); e.className = 'exp'; e.innerHTML = `<b>${ok ? '正解！' : '答え'}</b>${esc(c.quiz.exp)}`;
          card.appendChild(e);
          gainCharm(c.quiz.charm);
          const nb = document.createElement('button'); nb.className = 'btn ink'; nb.id = 'clNext';
          nb.innerHTML = `<span>${esc(nextLabel)}</span>${ic('arrow-r')}`;
          nb.onclick = () => { if (nb.dataset.done) return; nb.dataset.done = 1; tap(); res(); };
          card.appendChild(nb);
          tapGuard();   // 選択肢の二度押しで、すぐ下に出た「つぎへ」まで押さないように
          setTimeout(() => {   // 写真が縮み終わってから、必要なぶんだけ（つぎへが見えるまで）スクロール
            const need = nb.offsetTop + nb.offsetHeight + 8 - card.clientHeight;
            if (need > card.scrollTop) card.scrollTo({ top: need, behavior: RM ? 'auto' : 'smooth' });
            const cl = $('#clip');   // 背の低い画面では画面ごとスクロールする（style.css の @container）
            if (getComputedStyle(cl).overflowY === 'auto') cl.scrollTo({ top: cl.scrollHeight, behavior: RM ? 'auto' : 'smooth' });
          }, RM ? 0 : 380);
        });
      });
    }
  }

  /* =========================================================
     ホームさんぽ（♡でシール）
     ========================================================= */
  function sceneWalk() {
    return new Promise(res => {
      show('walk');
      const W = C.walk, n = W.items.length;
      $('#wEye').textContent = (C.walkTime ? C.walkTime + ' — ' : '') + 'HOME WALK';
      $('#wNext span').textContent = W.next || 'つぎへ';
      $('#wTitle').textContent = W.sub;
      $('#wSub').textContent = '見つけた魅力は、最後にシール帳で見られます';
      const tr = $('#wTrack'); tr.scrollLeft = 0;
      tr.innerHTML = W.items.map((it, i) => `<div class="w-card" data-i="${i}"><i class="tape"></i><div class="ph" style="background-image:url(${it.img})${it.pos ? ';background-position:' + esc(it.pos) : ''}"></div>
        <div class="tx"><button class="heart" data-i="${i}" aria-label="いいね">${ic('heart')}</button><small>No.${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</small><b>${esc(it.title)}</b><span>${esc(noEmoji(it.text))}</span></div></div>`).join('');
      const dots = $('#wDots');
      dots.innerHTML = W.items.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('');
      const center = el => tr.scrollTo({ left: el.offsetLeft - (tr.clientWidth - el.offsetWidth) / 2, behavior: RM ? 'auto' : 'smooth' });
      // PC（横スワイプできない）でも、となりのカードや点をクリックすれば移動できる
      [...tr.children].forEach(card => card.addEventListener('click', e => { if (!e.target.closest('.heart')) center(card); }));
      [...dots.children].forEach((d, i) => d.onclick = () => center(tr.children[i]));
      tr.onscroll = () => {
        const mid = tr.scrollLeft + tr.clientWidth / 2;
        let best = 0, bd = 1e9;
        [...tr.children].forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
        [...dots.children].forEach((d, j) => d.classList.toggle('on', j === best));
      };
      tr.querySelectorAll('.heart').forEach(h => h.onclick = () => {
        if (h.classList.contains('on')) return;
        const i = +h.dataset.i, it = W.items[i];
        h.classList.add('on'); haptic();
        if (!RM) {
          const bs = document.createElement('span'); bs.className = 'burst';
          bs.innerHTML = Array.from({ length: 8 }, (_, k) => `<i style="--a:${k * 45}deg"></i>`).join('');
          h.appendChild(bs); setTimeout(() => bs.remove(), 700);
        }
        dots.children[i].classList.add('liked');
        gainCharm(it.charm);
        addAxis(it.axis);
        const nx = tr.children[i + 1];
        if (nx) setTimeout(() => center(nx), 700);
      });
      $('#wNext').onclick = () => { tap(); res(); };
    });
  }

  /* =========================================================
     お昼トーク
     ========================================================= */
  async function sceneLunch() {
    chatOpen(C.lunch.time, C.lunch.time + ' 昼休み');
    const r = S.work && S.work.rank;
    await say({ S: { who: 'a', text: '午前の見守りラウンド、全部気づけてたね！先輩もびっくりだよ', face: 2 },
                A: { who: 'a', text: '午前の見守りラウンド、いい感じだったよ！よく見てたね', face: 2 },
                B: { who: 'b', text: '午前の見守り、ちゃんとできてたよ。慣れたらもっと気づけるようになる', face: 2 } }[r]
              || { who: 'b', text: '午前の見守り、最初はだれでもそう。毎日会ううちに、変化に気づけるようになるよ', face: 2 });
    await sayAll(C.lunch.open);
    const L = C.lunch, used = new Set();
    for (let k = 0; k < L.pick; k++) {
      const left = L.questions.map((q, i) => ({ q, i })).filter(o => !used.has(o.i));
      const i = await choose(left.map(o => o.q), ['先輩に聞いてみる', `あと${L.pick - k}つ`]);
      const qi = left[i].i; used.add(qi);
      const q = L.questions[qi];
      meSay(noEmoji(q.label)); addAxis(q.axis); S.asked.push(noEmoji(q.label));
      await wait(450);
      await sayAll(q.ans);
    }
    await sayAll(L.close);
    await goButton(C.lunch.next || 'つぎへ');
  }

  /* =========================================================
     見守りラウンド（mimamori.js）
     ========================================================= */
  async function sceneWork() {
    show('work');
    const root = $('#work'); root.innerHTML = '';
    const none = { score: 0, rank: '-', stats: {} };
    if (!window.WorkGame) { S.work = none; return; }
    const auto = Q.get('auto');
    // 作業ゲームが例外で終わっても、物語は先へ進める
    try { S.work = (await window.WorkGame.start(root, C, { autoplay: auto || undefined, fast: FAST })) || none; }
    catch (e) { console.error('[work]', e); S.work = none; }
    root.innerHTML = '';
  }
  /* 午後：「その人らしさ」作戦会議 */
  async function sceneDignity() {
    const D = C.dignity;
    chatOpen(D.time, D.day);
    await sayAll(D.open);
    const opts = shuffled(D.choices.length).map(k => D.choices[k]);
    const ch = opts[await choose(opts, ['あなたならどうする？', 'チームで考えよう'])];
    meSay(noEmoji(ch.label));
    addAxis('team'); if (ch.ok) addAxis('yorisoi', 2);
    await wait(500);
    await sayAll(ch.reply);
    await sayAll(D.plan);
    await goButton(D.next || 'つぎへ');
  }

  /* =========================================================
     正直トーク（スワイプ：← ちょっと不安 / いけそう →）
     ========================================================= */
  function sceneReal() {
    return new Promise(res => {
      show('real');
      const R = C.real, N = R.cards.length;
      $('#rTitle').textContent = R.title; $('#rSub').textContent = R.sub;
      const st = $('#rStack'), sayBox = $('#rSay'), eNo = $('#rEdgeNo'), eYes = $('#rEdgeYes'), bNo = $('#rNo'), bYes = $('#rYes');
      let idx = 0, busy = false, demoStop = false;
      bNo.disabled = bYes.disabled = false;
      sayBox.className = 'r-say hint';
      sayBox.innerHTML = `<span class="hintic">${ic('swipe')}</span><span>左右にスワイプ、または下のボタンで答えてね</span>`;
      const setP = p => {
        eNo.style.setProperty('--p', Math.max(0, -p).toFixed(3)); eYes.style.setProperty('--p', Math.max(0, p).toFixed(3));
        bNo.classList.toggle('hot', p < -.45); bYes.classList.toggle('hot', p > .45);
      };
      function apply(el, dx) {
        const p = Math.max(-1, Math.min(1, dx / 110));
        el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 22}deg)` : '';
        el.querySelector('.tint.yes').style.opacity = Math.max(0, p);
        el.querySelector('.tint.no').style.opacity = Math.max(0, -p);
        el.querySelector('.st.yes').style.opacity = Math.max(0, p);
        el.querySelector('.st.no').style.opacity = Math.max(0, -p);
        setP(p);
      }
      function makeCard(k, cls) {
        const c = R.cards[k];
        const el = document.createElement('div'); el.className = 'rcard' + (cls ? ' ' + cls : '');
        el.innerHTML = `<div class="ph" style="background-image:url(${c.img})${c.pos ? ';background-position:' + esc(c.pos) : ''}">${c.stamp ? `<span class="stamp">${esc(c.stamp)}</span>` : ''}</div>
          <div class="tx"><b>${esc(c.head)}</b><span>${esc(c.sub)}</span></div><div class="tint yes"></div><div class="tint no"></div>
          <div class="st yes">いけそう${ic('arrow-r')}</div><div class="st no">${ic('arrow-l')}ちょっと不安</div>`;
        return el;
      }
      function drag(el) {
        let sx = 0, dx = 0, on = false, t0 = 0;
        el.addEventListener('pointerdown', e => {
          if (busy) return;
          on = true; demoStop = true; sx = e.clientX; dx = 0; t0 = performance.now();
          try { el.setPointerCapture(e.pointerId); } catch (er) {}
          el.style.transition = 'none';
        });
        el.addEventListener('pointermove', e => { if (on) { dx = e.clientX - sx; apply(el, dx); } });
        const up = () => {
          if (!on) return; on = false;
          const v = dx / Math.max(1, performance.now() - t0);
          if (Math.abs(dx) > 90 || (Math.abs(dx) > 36 && Math.abs(v) > .5)) answer(dx > 0);
          else { el.style.transition = 'transform .38s cubic-bezier(.22,1.3,.36,1)'; apply(el, 0); }
        };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      }
      // 最初のカードで、左右に小さくゆらして見本を見せる
      async function demo(el) {
        await wait(650);
        const tween = (a, b, ms) => new Promise(r => {
          const t0 = performance.now();
          const f = now => {
            if (demoStop) return r();
            const t = Math.min(1, (now - t0) / ms), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            apply(el, a + (b - a) * e);
            t < 1 ? requestAnimationFrame(f) : r();
          };
          requestAnimationFrame(f);
        });
        if (RM) { el.style.transition = 'none'; return; }
        el.style.transition = 'none';
        for (const [a, b, ms] of [[0, -46, 420], [-46, -46, 260], [-46, 0, 320], [0, 46, 420], [46, 46, 260], [46, 0, 320]]) {
          if (demoStop || busy) break;
          if (a === b) await wait(ms); else await tween(a, b, ms);
        }
        if (!demoStop && !busy) apply(el, 0);
      }
      function setCount() { $('#rCount').textContent = `${Math.min(idx + 1, N)} / ${N}`; }
      function render() {
        st.innerHTML = '';
        for (let k = Math.min(N - 1, idx + 2); k >= idx; k--) {
          const el = makeCard(k, k === idx ? '' : k === idx + 1 ? 'back1' : 'back2');
          st.appendChild(el);
          if (k === idx) drag(el);
        }
        setCount();
      }
      async function answer(yes) {
        if (busy || idx >= N) return;
        busy = true; demoStop = true;
        tap('swipe');
        bNo.disabled = bYes.disabled = true;
        const c = R.cards[idx], el = st.lastElementChild;
        apply(el, yes ? 110 : -110);
        const w = app.clientWidth + 160;
        el.style.pointerEvents = 'none';
        if (el.animate && !RM) {
          const from = getComputedStyle(el).transform;
          el.style.transition = 'none';
          el.animate([{ transform: from === 'none' ? 'none' : from }, { transform: `translateX(${yes ? w : -w}px) rotate(${yes ? 22 : -22}deg)` }],
            { duration: 420, easing: 'cubic-bezier(.4,0,.9,.6)', fill: 'forwards' });
        } else el.style.opacity = 0;
        setTimeout(() => { el.remove(); setP(0); }, RM ? 0 : 430);
        // うしろのカードを前へ
        const nx = el.previousElementSibling;
        if (nx) { nx.classList.remove('back1'); drag(nx); const n2 = nx.previousElementSibling; if (n2) n2.classList.replace('back2', 'back1'); }
        if (idx + 3 < N) st.insertBefore(makeCard(idx + 3, 'back2'), st.firstChild);
        if (yes) { addAxis(c.axis); S.yes++; } else { S.unsure.push(c.memo); S.no++; }
        const p = person(c.who);
        sayBox.className = 'r-say';
        void sayBox.offsetWidth; sayBox.classList.add('said');
        sayBox.innerHTML = `<img src="${p.img2 || p.img}" alt=""><span><small>${esc(p.name)}のひと言</small>${esc(c.say)}</span>`;
        AU.se('msg', 0.6);
        idx++;
        await wait(450);
        setCount();
        await wait(950);
        if (idx >= N) { await wait(500); res(); return; }
        busy = false; bNo.disabled = bYes.disabled = false;
      }
      bYes.onclick = () => answer(true);
      bNo.onclick = () => answer(false);
      render();
      demo(st.lastElementChild);
    });
  }

  /* =========================================================
     帰り道
     ========================================================= */
  async function sceneEvening() {
    chatOpen(C.evening.time, C.evening.day || (C.evening.time + ' 退勤'));
    await sayAll(C.evening.open);
    await say({ who: 'b', text: C.evening.ask });
    const i = await choose(C.evening.choices);
    meSay(noEmoji(C.evening.choices[i].label));
    S.pick = C.evening.choices[i].axis; addAxis(S.pick, 3);
    await wait(400);
    await say(C.evening.bye);
    if (C.evening.stamp) await say({ who: 'a', img: C.evening.stamp, stamp: true });
    await goButton('1日をふりかえる');
  }

  /* =========================================================
     結果（あなたの1日）
     ========================================================= */
  function topAxis() {
    let best = S.pick || 'hito', v = -1;
    for (const k in S.axis) if (S.axis[k] > v || (S.axis[k] === v && k === S.pick)) { v = S.axis[k]; best = k; }
    return best;
  }
  function memos() {
    const m = S.unsure.slice(0, 2);
    if (S.work && C.work.memo) m.push(C.work.memo);
    m.push(C.axes[topAxis()].memo);   // company.js の memo は文として完結させる（例：「〜を見てみる」）
    (C.memoExtra || []).forEach(x => m.push(x));
    return [...new Set(m)].slice(0, 3);
  }
  function recsHTML(r, now) {
    const prev = PREV && PREV.last, best = r && r.best;
    const cell = (cls, k, v, s) => `<div class="${cls}"><small>${k}</small><b>${v}</b><span>${s}</span></div>`;
    return `<div class="recs">` +
      (now ? cell('cur', '今回', fmt(now.score), 'ランク' + esc(now.rank)) : '') +
      cell('', '前回', prev ? fmt(prev.score) : '—', prev ? `${md(prev.date)}・ランク${esc(prev.rank || '-')}` : 'はじめて') +
      cell('', 'ベスト', best ? fmt(best.score) : '—', best ? `${md(best.date)}・ランク${esc(best.rank || '-')}` : '—') +
      (now ? '' : cell('', '体験', (r ? r.plays : 0) + '回', r && r.first ? ymd(r.first) + '〜' : '—')) + '</div>';
  }
  function cosHTML(all) {
    const list = Object.keys(all).map(id => Object.assign({ id }, sane(all[id]))).filter(r => r.name)
      .sort((a, b) => String((b.last && b.last.date) || '').localeCompare(String((a.last && a.last.date) || '')));
    const safeUrl = u => /^https?:\/\//i.test(u) ? u : '';
    return `<div class="h3row"><h3 class="h3">体験した企業</h3><span class="cnt">${list.length}社</span></div><ul class="cos">` +
      (list.length ? list.map(r => {
        const here = r.id === C.id, url = safeUrl(r.url);
        const inner = `<span class="lg">${ic('building')}</span><span class="tx"><b>${esc(r.name)}</b><small>${r.last ? ymd(r.last.date) : '—'}・${r.plays}回${r.industry ? '・' + esc(r.industry) : ''}</small></span>` +
          `<span class="rk">${esc((r.last && r.last.rank) || '-')}</span>` + (here ? '<span class="now">いま</span>' : url ? ic('chev-r') : '');
        return `<li>${!here && url ? `<a class="co" href="${esc(url)}">${inner}</a>` : `<div class="co">${inner}</div>`}</li>`;
      }).join('') : '<li class="note">まだありません</li>') + '</ul>';
  }
  function countUp(el, to) {
    if (RM || FAST) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), D = 1100;
    const f = now => { const t = Math.min(1, (now - t0) / D); el.textContent = fmt(to * (1 - Math.pow(1 - t, 3))); if (t < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }

  // 控えめな紙ふぶき（差し色と黄色）
  function confetti(host) {
    if (RM || FAST || !host) return;
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['var(--accent)', 'var(--joy)', 'color-mix(in srgb,var(--accent) 45%,#fff)'];
    box.innerHTML = Array.from({ length: 26 }, (_, i) => `<i style="left:${(i * 37) % 100}%;--c:${cols[i % 3]};--d:${(i % 7) * 90}ms;--x:${((i * 53) % 60) - 30}px;--r:${(i * 47) % 360}deg;--h:${i % 3 ? 10 : 6}px"></i>`).join('');
    host.appendChild(box); setTimeout(() => box.remove(), 2600);
  }
  let resultBusy = false, resultSeq = 0;
  async function sceneResult() {
    show('result'); AU.bgm('chat'); AU.se('fanfare');
    const rs = $('#result');
    rs.scrollTop = 0; app.classList.remove('hud-light');
    rs.onscroll = () => app.classList.toggle('hud-light', rs.scrollTop > $('#resHero').offsetHeight - 50);
    const sv = saveRecord(), r = sv.r, prev = PREV && PREV.last;
    const ax = C.axes[topAxis()];

    // ヒーロー
    const cmp = [];
    if (prev) {
      const d = sv.score - (+prev.score || 0);
      cmp.push(d > 0 ? `<span class="up">${ic('up')}前回より +${fmt(d)}pt</span>` : d < 0 ? `<span>${ic('down')}前回より −${fmt(-d)}pt</span>` : '<span>前回と同じスコア</span>');
    } else cmp.push(`<span>${ic('spark')}はじめての記録</span>`);
    if (sv.newBest) cmp.push(`<span class="hi">ベスト更新</span>`);
    else if (prev && r.best) cmp.push(`<span>ベスト ${fmt(r.best.score)}pt</span>`);
    cmp.push(`<span>${r.plays}回目の体験</span>`);
    const day = [{ img: C.clips[0].img, t: C.clips[0].stamp, pos: C.clips[0].pos }, ...(C.cardPhotos || []).slice(1).map(p => ({ img: p.img, t: p.stamp, pos: p.pos })), ...(C.walk.items[0] ? [{ img: C.walk.items[0].img, t: C.walkTime, pos: C.walk.items[0].pos }] : [])]
      .filter((v, i, a) => v && v.img && a.findIndex(x => x.img === v.img) === i).slice(0, 4).sort((a, b) => String(a.t).localeCompare(String(b.t)));
    const senior = person('a'), praise = { S: '初日でこれはすごい！', A: 'よく気づけてたよ！', B: 'いい1日だったね！' }[sv.rank] || '少しずつ慣れていこう！';
    $('#resHero').innerHTML = `<div class="top"><span class="eyebrow">Your 1Day</span><span class="stamp">${esc(vlogDate())}</span></div>
      <h1>あなたの1日</h1><p class="co">${esc(C.name)}・介護スタッフ 1日目</p>
      <div class="strip">${day.map((d, i) => `<div class="sp" style="--i:${i};background-image:url(${d.img})${d.pos ? ';background-position:' + esc(d.pos) : ''}"><span class="stamp">${esc(d.t || '')}</span></div>`).join('')}</div>
      <div class="otsu"><img src="${senior.img2 || senior.img}" alt=""><div class="bub">おつかれさま！${esc(praise)}<small>${esc(senior.name)}</small></div></div>
      <div class="band"><div class="l"><small>${esc(C.work.title)}</small><div class="v"><span id="scoreNum">0</span><i>pt</i></div></div>
      <div class="rank"><small>RANK</small><b>${esc(sv.rank)}</b></div></div>
      <div class="cmp">${cmp.join('')}</div>
      <p class="note">※ランクはゲームの得点です。仕事の向き・不向きとは関係ありません</p>`;
    countUp($('#scoreNum'), sv.score);
    confetti($('#resHero'));

    // Wrapped風のまとめ
    const got = [...S.charms], fresh = got.filter(k => !prevCharms.has(k));
    const tiles = [];
    tiles.push(`<div class="tile sky w"><span class="k">あなたが惹かれたのは</span><div class="pt">${esc(ax.label)}</div><div class="tags">${ax.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div></div>`);
    tiles.push(`<div class="tile seals" style="animation-delay:.05s"><span class="k">魅力シール</span>${fresh.length ? `<span class="new">NEW ${fresh.length}</span>` : ''}
      <div class="stk">${got.filter(k => C.charms[k].sticker).slice(0, 6).map((k, i) => `<img src="${C.charms[k].sticker}" alt="" style="--i:${i}">`).join('')}</div>
      <div class="big">${got.length}<i>/ ${N_CHARMS}</i></div></div>`);
    if (S.quiz.n) tiles.push(`<div class="tile sage" style="animation-delay:.1s"><span class="k">クイズ</span><div class="big">${S.quiz.ok}<i>/ ${S.quiz.n}問</i></div><div class="sm">正解</div></div>`);
    else tiles.push(`<div class="tile sage" style="animation-delay:.1s"><span class="k">体験</span><div class="big">${r.plays}<i>回目</i></div></div>`);
    if (S.yes + S.no) {
      const t = S.yes + S.no;
      tiles.push(`<div class="tile sand w" style="animation-delay:.15s"><span class="k">正直トーク</span>
        <div class="bar2"><i class="y" style="width:${S.yes / t * 100}%"></i><i class="n" style="width:${S.no / t * 100}%"></i></div>
        <div class="leg"><span>いけそう <b>${S.yes}</b></span><span>ちょっと不安 <b>${S.no}</b></span></div></div>`);
    }
    if (S.asked.length) tiles.push(`<div class="tile w" style="animation-delay:.2s"><span class="k">お昼に先輩に聞いたこと</span><ul class="asked">${S.asked.map(a => `<li>${ic('chev-r')}${esc(a)}</li>`).join('')}</ul></div>`);
    $('#resTiles').innerHTML = tiles.join('');

    // 記録
    $('#resRec').innerHTML = `<div class="h3row"><h3 class="h3">あなたの記録</h3><span class="cnt">${r.plays}回目</span></div>${recsHTML(r, { score: sv.score, rank: sv.rank })}
      <p class="note" style="margin-top:10px">${recOK ? '記録はこの端末のブラウザにだけ保存されます。' : 'この端末では記録を保存できませんでした（プライベートブラウズなど）。'}</p>`;
    // シール帳（これまでの累計）
    const total = new Set(r.charms);
    $('#bookCount').textContent = total.size + ' / ' + N_CHARMS;
    $('#bookNote').textContent = `これまでに集めたシール（今回 ${got.length}枚${fresh.length ? '・新しく ' + fresh.length + '枚' : ''}）`;
    $('#bookGrid').innerHTML = Object.keys(C.charms).map(k => {
      const c = C.charms[k];
      if (!total.has(k)) return `<div class="seal no"><div class="ph">?</div><b>まだ見つけていません</b></div>`;
      return `<div class="seal">${fresh.includes(k) ? '<span class="new">NEW</span>' : ''}${stickerHTML(k)}<b>${esc(c.title)}</b><p>${esc(c.body)}</p></div>`;
    }).join('');
    // 体験した企業
    $('#resInfo').innerHTML = `<h3 class="h3">このあと、どうする？</h3><ul>
      ${(C.info || []).map(x => `<li>${esc(x)}</li>`).join('')}
      <li>まだ見つけていないシールは、もう一度体験すると見つかるかもしれません。</li></ul>
      ${C.tel ? `<a class="btn accent tel" href="tel:${esc(C.tel.replace(/-/g, ''))}">${ic('phone')}<span>見学について電話で聞く</span></a>` : ''}`;

    // ボタンは先に使えるようにする（カード画像を作っている間・作れなかったときも「もう一度」「最初から」が効くように）
    let url = null;
    $('#bSave').disabled = true;
    $('#bSave').onclick = () => {
      if (!url) return;
      tap();
      const a = document.createElement('a'); a.href = url; a.download = `kaigo1day_${C.id}.jpg`; document.body.appendChild(a); a.click(); a.remove();
      notify('画像を保存しました', 'download');
    };
    $('#bShare').onclick = async () => {
      tap();
      const link = gameUrl();
      const text = C.shareText || `「${C.shortName}」の1日を体験しました。`;
      try {
        if (url) {
          const blob = await (await fetch(url)).blob();
          const file = new File([blob], `kaigo1day_${C.id}.jpg`, { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: C.gameTitle || '1DAY' }); return; }
        }
        if (navigator.share) { await navigator.share({ title: C.gameTitle || '1DAY', text, url: link }); return; }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(text + ' ' + link); notify('リンクをコピーしました。LINEなどに貼りつけて送れます'); }
      catch (e) {
        openSheet(`<h3 class="h3">このリンクを送ってください</h3><p class="note" style="margin:6px 0 10px">長押しでコピーできます</p>
          <div class="blk" style="margin:0;user-select:all;-webkit-user-select:all;word-break:break-all;font-size:15px">${esc(link)}</div>
          <button class="btn line" data-close style="margin-top:14px">閉じる</button>`);
      }
    };
    $('#bHp').onclick = () => tap();
    $('#bRetry').onclick = async () => {
      if (resultBusy) return; resultBusy = true; tap();
      try { await sceneWork(); } finally { resultBusy = false; }
      sceneResult().catch(e => console.error('[result]', e));
    };
    $('#bRestart').onclick = () => { tap(); location.href = location.pathname; };

    // カード画像（もう一度 をくり返したとき、前の回の画像があとから入らないように番号で確かめる）
    const my = ++resultSeq;
    const img = $('#resImg');
    img.removeAttribute('src');
    try { url = await drawCard(); } catch (e) { url = null; }
    if (my !== resultSeq) return;
    if (url) img.src = url;
    $('#bSave').disabled = !url;
  }

  /* ---------- 結果カード画像（縦長。白地に写真とスコア、会社の差し色1色） ---------- */
  async function drawCard() {
    const W = 1080, H = 1920, M = 72;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    try { await Promise.race([Promise.all([document.fonts.load('800 40px StartSans'), document.fonts.load('500 30px StartSans')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
    const F = (w, s) => `${w} ${s}px StartSans, "Hiragino Sans", "Noto Sans JP", sans-serif`;
    const INK = '#111418', INK2 = '#5B6370', INK3 = '#9AA1AB', SOFT = '#F5F6F8';
    const spacing = v => { if ('letterSpacing' in g) g.letterSpacing = v; };
    const w = S.work || { score: 0, rank: '-' };
    const ax = C.axes[topAxis()];

    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
    // 上は差し色の淡い面から白へ
    const bgG = g.createLinearGradient(0, 0, 0, 900); bgG.addColorStop(0, mix(ACCENT, .12)); bgG.addColorStop(1, '#FFFFFF');
    g.fillStyle = bgG; g.fillRect(0, 0, W, 900);

    // ヘッダー：ロゴ・ゲーム名・日付
    const lg = await loadImg(C.logo);
    if (lg) {   // ロゴは白い地の画像なので、白い角丸の台にのせる
      const lh = 64, lw = lh * lg.width / lg.height;
      g.save(); rrect(g, M - 16, 58, lw + 32, lh + 24, 20); g.fillStyle = '#FFFFFF'; g.fill(); g.restore();
      g.drawImage(lg, M, 70, lw, lh);
    }
    g.textAlign = 'right'; g.fillStyle = INK; g.font = F(800, 22); spacing('6px');
    g.fillText('KAIGO 1DAY', W - M + 6, 92); spacing('0px');
    stamp(g, vlogDate(), W - M, 134, 28, 'right');
    g.textAlign = 'left';

    // 見出し
    g.fillStyle = ACCENT_INK; g.font = F(800, 26); g.fillText('介護スタッフの1日を体験しました', M, 236);
    let fs = 76; g.font = F(800, fs);
    while (fs > 44 && g.measureText(C.name).width > W - 2 * M) { fs -= 2; g.font = F(800, fs); }
    g.fillStyle = INK; spacing('-2px'); g.fillText(C.name, M - 3, 318); spacing('0px');

    // 下のブロックの高さを先に測る
    g.font = F(800, 50);
    let pfs = 50, ptLines = lines(g, ax.label, W - 2 * M);
    while (ptLines.length > 2 && pfs > 36) { pfs -= 2; g.font = F(800, pfs); ptLines = lines(g, ax.label, W - 2 * M); }
    const ptH = 40 + ptLines.length * Math.round(pfs * 1.38) + 16 + 52;
    g.font = F(500, 31);
    const ms = memos().map(m => lines(g, m, W - 2 * M - 56));
    const memoH = 40 + 12 + ms.reduce((a, l) => a + l.length * 46 + 18, 0);
    const scoreH = 236, gap = 56, footTop = H - 186;
    const colTop = 372;
    let Hc = footTop - 40 - colTop - 36 - scoreH - gap - ptH - gap - memoH;
    Hc = Math.max(300, Math.min(640, Hc));

    // 写真（角丸だけ。傾けない・フチなし）
    const ph = (C.cardPhotos && C.cardPhotos.length ? C.cardPhotos : [{ img: C.clips[0].img, stamp: C.clips[0].stamp }, { img: C.real.cards[0].img, stamp: C.real.cards[0].stamp || '' }]).slice(0, 3);
    const lw = 588, rw = W - 2 * M - lw - 16, rh = (Hc - 16) / 2;
    const slots = [[M, colTop, lw, Hc], [M + lw + 16, colTop, rw, rh], [M + lw + 16, colTop + rh + 16, rw, rh]];
    for (let i = 0; i < slots.length; i++) {
      const [x, y, sw, sh] = slots[i], p = ph[i] || ph[0];
      const im = await loadImg(p.img);
      g.save(); rrect(g, x, y, sw, sh, 28); g.clip();
      g.fillStyle = SOFT; g.fillRect(x, y, sw, sh);
      if (im) {
        const s = Math.max(sw / im.width, sh / im.height), cw = sw / s, ch = sh / s;
        const fp = String(p.pos || '50% 50%').split(/\s+/).map(v => { const n = parseFloat(v); return (isNaN(n) ? 50 : n) / 100; });
        g.drawImage(im, (im.width - cw) * fp[0], (im.height - ch) * (fp[1] == null ? .5 : fp[1]), cw, ch, x, y, sw, sh);
      }
      const gr = g.createLinearGradient(0, y + sh - 110, 0, y + sh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.32)');
      g.fillStyle = gr; g.fillRect(x, y + sh - 110, sw, 110);
      g.restore();
      if (p.stamp) stamp(g, p.stamp, x + sw - 20, y + sh - 20, i ? 26 : 32, 'right');
    }

    // スコア
    let y = colTop + Hc + 36;
    const bandG = g.createLinearGradient(M, y, W - M, y + scoreH); bandG.addColorStop(0, mix(ACCENT, .78, '#6FD0FF')); bandG.addColorStop(.55, ACCENT); bandG.addColorStop(1, ACCENT_INK);
    g.save(); rrect(g, M, y, W - 2 * M, scoreH, 32); g.fillStyle = bandG; g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = F(800, 25); g.fillText(C.work.title, M + 40, y + 60);
    g.fillStyle = '#fff'; g.font = F(800, 116); spacing('-5px');
    const sc = fmt(w.score || 0); g.fillText(sc, M + 34, y + 162); const sw2 = g.measureText(sc).width; spacing('0px');
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = F(800, 36); g.fillText('pt', M + 48 + sw2, y + 162);
    g.fillStyle = 'rgba(255,255,255,.72)'; g.font = F(500, 21); g.fillText('※ランクはゲームの得点です。仕事の向き・不向きとは関係ありません', M + 40, y + 212);
    const cx = W - M - 112, cy = y + 104, R = 76;
    g.fillStyle = '#FFD43B'; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.textAlign = 'center'; g.fillStyle = '#8A6A00'; g.font = F(800, 19); spacing('4px'); g.fillText('RANK', cx + 2, cy - 28); spacing('0px');
    g.fillStyle = INK; g.font = F(800, 82); g.fillText(String(w.rank || '-'), cx, cy + 46); g.textAlign = 'left';

    // 惹かれたポイント
    y += scoreH + gap;
    g.fillStyle = ACCENT_INK; g.font = F(800, 25); g.fillText('惹かれたポイント', M, y + 26);
    g.fillStyle = INK; g.font = F(800, pfs); spacing('-1.5px');
    let ly = y + 40 + Math.round(pfs * 1.05);
    for (const l of ptLines) { g.fillText(l, M - 2, ly); ly += Math.round(pfs * 1.38); }
    spacing('0px');
    let tx = M; const ty = ly - Math.round(pfs * 1.38) + 28;
    g.font = F(800, 24);
    for (const t of ax.tags) {
      const tw = g.measureText(t).width + 38;
      if (tx + tw > W - M) break;
      g.save(); rrect(g, tx, ty, tw, 50, 25); g.fillStyle = SOFT; g.fill(); g.restore();
      g.fillStyle = INK2; g.fillText(t, tx + 19, ty + 34); tx += tw + 10;
    }

    // 見学メモ
    y += ptH + gap;
    g.fillStyle = ACCENT_INK; g.font = F(800, 25); g.fillText('見学で聞きたい・見たいことメモ', M, y + 26);
    let my = y + 40 + 12;
    g.font = F(500, 31);
    for (const l of ms) {
      g.save(); g.strokeStyle = 'rgba(17,20,24,.28)'; g.lineWidth = 2.5; rrect(g, M, my + 6, 30, 30, 8); g.stroke(); g.restore();
      g.fillStyle = INK; l.forEach((t, k) => g.fillText(t, M + 54, my + 33 + k * 46));
      my += l.length * 46 + 18;
    }

    // フッター
    g.fillStyle = 'rgba(17,20,24,.08)'; g.fillRect(M, footTop, W - 2 * M, 2);
    g.fillStyle = INK; g.font = F(800, 25); g.fillText(`魅力シール ${S.charms.size}/${N_CHARMS}`, M, footTop + 60);
    let sx = M + g.measureText(`魅力シール ${S.charms.size}/${N_CHARMS}`).width + 22;
    for (const k of [...S.charms]) {
      const c = C.charms[k]; if (!c.sticker || sx > W - M - 54) continue;
      const im = await loadImg(c.sticker); if (!im) continue;
      const s2 = 52 / Math.max(im.width, im.height); g.drawImage(im, sx, footTop + 60 - 40 - (im.height * s2 - 52) / 2, im.width * s2, im.height * s2); sx += 56;
    }
    g.fillStyle = INK3; g.font = F(500, 22); g.fillText('職場見学はいつでも歓迎（オンライン見学も）', M, footTop + 122);
    g.textAlign = 'right'; g.fillStyle = INK; g.font = F(800, 24); g.fillText(C.gameTitle || C.shortName, W - M, footTop + 122); g.textAlign = 'left';
    return cv.toDataURL('image/jpeg', 0.92);
  }
  // 色を白（または指定色）と混ぜる：a = 元の色の割合
  function mix(hex, a, base) {
    const h = v => [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16));
    const c = h(hex), b = h(base || '#FFFFFF');
    return '#' + c.map((x, i) => Math.round(x * a + b[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
  }
  // 時刻ラベル（白い文字の小さなピル）
  function stamp(g, t, x, y, s, al) {
    g.save(); g.font = `800 ${s}px StartSans, "Hiragino Sans", sans-serif`;
    const w = g.measureText(t).width + s * 1.1, hgt = s * 1.6, x0 = al === 'right' ? x - w : x;
    rrect(g, x0, y - hgt * .78, w, hgt, hgt / 2); g.fillStyle = 'rgba(17,20,24,.55)'; g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(t, x0 + s * .55, y); g.restore();
  }
  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function lines(g, text, maxW) {
    const out = []; let line = '';
    const noHead = '、。，．,.？！?!）」』】ーっゃゅょッャュョぁぃぅぇぉァィゥェォ…';   // 行頭に来ないようにする文字（ぶら下げ）
    for (const ch of String(text)) { if (g.measureText(line + ch).width > maxW && line && !noHead.includes(ch)) { out.push(line); line = ch; } else line += ch; }
    if (line) out.push(line);
    return out;
  }

  /* =========================================================
     全体の流れ
     ========================================================= */
  async function run() {
    const jump = Q.get('scene');
    const order = ['prologue', 'clip', 'walk', 'work', 'lunch', 'dignity', 'real', 'evening', 'result'];
    const from = Math.max(0, order.indexOf(jump || 'prologue'));
    const at = k => order.indexOf(k) >= from;
    if (at('prologue')) await scenePrologue();
    if (at('clip')) await sceneClips();
    if (at('walk')) await sceneWalk();
    if (at('work')) await sceneWork();
    if (at('lunch')) await sceneLunch();
    if (at('dignity')) await sceneDignity();
    if (at('real')) await sceneReal();
    if (at('evening')) await sceneEvening();
    await sceneResult();
  }

  initTitle();
  let started = false;
  $('#btnStart').onclick = () => {
    if (started) return; started = true; AU.unlock(); tap(); AU.bgm('chat'); try { window.__preloadRest(); } catch (e) {}
    // どこかで例外が出ても止まったままにしない（結果画面までは出す）
    run().catch(e => { console.error('[run]', e); return sceneResult(); }).catch(e => console.error('[run]', e));
  };

  // 起動：ロゴのスプラッシュ（キービジュアルとフォントを待つ。最長1秒）
  (function boot() {
    const sp = $('#splash'), t0 = performance.now();
    const kv = new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = TITLE_PHOTO; });
    let fonts = Promise.resolve();
    try { fonts = Promise.all([document.fonts.load('800 20px StartSans'), document.fonts.load('500 15px StartSans')]); } catch (e) {}
    Promise.race([Promise.all([kv, fonts]).catch(() => {}), new Promise(r => setTimeout(r, 1000))]).then(() => {
      const rest = Math.max(0, (FAST ? 0 : 420) - (performance.now() - t0));
      setTimeout(() => { sp.classList.add('out'); $('#title').classList.add('ready'); setTimeout(() => sp.remove(), 480); }, rest);
    });
  })();

  // 画像の先読み：最初はチャットのアイコンだけ。写真は「はじめる」を押してから順番に（最初の表示を軽くするため）
  const preload = list => list.forEach(s => { const i = new Image(); i.decoding = 'async'; i.src = s; });
  window.addEventListener('load', () => {
    setTimeout(() => preload(Object.values(C.people).flatMap(p => [p.img, p.img2])), 300);
  });
  window.__preloadRest = function () {
    if (window.__preloadRest.done) return; window.__preloadRest.done = true;
    const clips = C.clips.map(c => c.img), walk = C.walk.items.map(w => w.img);
    setTimeout(() => preload(clips), 200);
    const res = C.work.residents.flatMap(r => [r.good, r.tiredImg]);
    setTimeout(() => preload(walk.concat(['img/game_bg.webp'], res)), 2500);
    setTimeout(() => preload([C.lunch.open.find(m => m.img).img, 'img/res2_grumpy.webp', 'img/p_team.webp', ...C.real.cards.map(c => c.img), ...Object.values(C.charms).map(c => c.sticker).filter(Boolean)]), 6000);
  };
})();
