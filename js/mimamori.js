/* =========================================================
   見守りラウンド  window.WorkGame
   ---------------------------------------------------------
   WorkGame.start(root, company, opts) → Promise<{ score, rank, stats }>
     root : 画面いっぱいの空の要素（中身はここで作る）
     opts : { autoplay?: 'pro'|'normal'|'rookie', fast?: true }
            URL の ?auto=pro などでもボットが遊ぶ
   流れ：遊び方 → 3人のお部屋をまわる（きのうの様子 → きょうの様子でちがいをタップ → どうする？）→ 結果
   もとにした先輩の声：「目配り気配りして、体調不良など早期発見に努めています」
   ※ 入居者さん・ちがいの中身は演出です
   ========================================================= */
(function () {
  'use strict';

  const SE = (n, v) => { try { if (window.AUDIO) window.AUDIO.se(n, v); } catch (e) {} };
  const AUc = (fn, a) => { try { if (window.AUDIO && window.AUDIO[fn]) window.AUDIO[fn](a); } catch (e) {} };
  const buzz = () => { try { const ua = navigator.userActivation; if (navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate(6); } catch (e) {} };
  const RM = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('ja-JP');
  // 選択肢の並びを毎回まぜる（正解がいつも同じ位置にならないように）。返すのは元の番号の並び
  const shuffled = n => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---- 点数とランク（ボット pro/normal/rookie で回して決めた） ---- */
  const PTS = { find: 100, timeBonus: 12, act: 200, miss: -20 };
  const RANKS = [
    { r: 'S', min: 2200, label: 'みごとな見守り' },
    { r: 'A', min: 1700, label: 'よく気づけた' },
    { r: 'B', min: 1000, label: 'いいスタート' },
    { r: 'C', min: -Infinity, label: 'ここから！' },
  ];
  const rankOf = s => RANKS.find(x => s >= x.min);

  /* ---- ちがいの説明（タップで見つけたときに出す） ---- */
  const DIFF_TEXT = {
    face: '元気がない',
    tray: 'ごはんを残した',
    cup: 'お茶を飲んでない',
    flower: 'お花がしおれた',
    tissue: 'ティッシュが多い',
    pill: 'お薬が残っている',
  };

  /* ---- ボットの腕前（テスト・ランク調整用）：gap=ひとつ見つける間隔(秒)・miss=まちがいタップの回数・find=見つける割合・ok=正しい行動を選ぶか ---- */
  const BOTS = {
    pro:    { gap: [0.9, 1.4], miss: 0, find: 1, ok: true },
    normal: { gap: [2.2, 3.4], miss: 1, find: 0.9, ok: true },
    rookie: { gap: [3.8, 5.5], miss: 3, find: 0.6, ok: false },
  };

  /* =========================================================
     テーブルの上の小物（入居者さん・背景と同じ画風のイラスト。きのう／きょうで絵を差しかえる）
     ========================================================= */
  const ITEM = {
    tray: { empty: 'it_tray_empty', half: 'it_tray_half' },
    cup: { empty: 'it_cup_empty', full: 'it_cup_full' },
    flower: { fresh: 'it_flower_fresh', wilt: 'it_flower_wilt', none: 'it_book' },
    tissue: { false: 'it_tissue_box', true: 'it_tissue_used' },
    pill: { false: '', true: 'it_pill' },
  };
  const itemSrc = (k, v) => { const n = ITEM[k][String(v)]; return n ? 'img/' + n + '.webp' : ''; };
  // 先に全部読んでおく（きのう⇔きょうの切りかえで絵がちらつかないように）
  function preloadItems() { Object.values(ITEM).forEach(m => Object.values(m).forEach(n => { if (n) { const i = new Image(); i.src = 'img/' + n + '.webp'; } })); }

  /* 場面ひとつ分（きのう／きょう）の中身を描く */
  function paint(stage, r, st, isToday) {
    stage.querySelector('.mm-res').src = isToday ? r.tiredImg : r.good;
    for (const k of Object.keys(ITEM)) {
      const el = stage.querySelector('.it-' + k), src = itemSrc(k, st[k]);
      el.hidden = !src;
      if (src && el.getAttribute('src') !== src) el.src = src;
    }
    stage.classList.toggle('yday', !isToday);
  }

  /* =========================================================
     ゲーム本体
     ========================================================= */
  function start(root, C, opts) {
    opts = opts || {};
    const W = C.work || {};
    const RES = W.residents || [];
    const BOT = BOTS[opts.autoplay] || null;
    const FAST = !!opts.fast;
    const SEC = Math.max(8, W.roomSeconds || 16);
    const T = s => (FAST ? Math.min(s, 0.05) : s) * 1000;
    const sleep = s => new Promise(r => setTimeout(r, T(s)));
    const guide = C.guide || {};
    let alive = true;
    const stats = { found: 0, total: 0, acts: 0, miss: 0, rooms: [] };
    let score = 0;

    root.innerHTML = '';
    const wrap = h('div', 'mm');
    wrap.innerHTML = `
      <div class="mm-head">
        <span class="mm-eye">${esc(W.time || '')} — ${esc(W.title || '見守りラウンド')}</span>
        <div class="mm-row"><h2 class="mm-room" id="mmRoom"></h2><div class="mm-pts"><b id="mmScore">0</b><small>pt</small></div></div>
        <div class="mm-prog" id="mmProg">${RES.map(() => '<i></i>').join('')}</div>
      </div>
      <div class="mm-stage" id="mmStage">
        <div class="mm-bg"></div>
        <img class="mm-res" alt="">
        <img class="it it-flower" alt="">
        <img class="it it-tissue" alt="">
        <img class="it it-tray" alt="">
        <img class="it it-cup" alt="">
        <img class="it it-pill" alt="">
        <div class="mm-tag" id="mmTag"></div>
        <div class="mm-time"><i id="mmBar"></i></div>
        <div class="mm-fx" id="mmFx"></div>
      </div>
      <div class="mm-foot">
        <div class="mm-found" id="mmFound"></div>
        <button class="mm-hold" id="mmHold" disabled><svg class="ic" viewBox="0 0 24 24"><use href="#i-history"/></svg><span>おしている間、きのうを見る</span></button>
      </div>
      <div class="mm-layer" id="mmLayer"></div>`;
    root.appendChild(wrap);
    const $ = id => wrap.querySelector('#' + id);
    const stage = $('mmStage'), layer = $('mmLayer'), fx = $('mmFx'), hold = $('mmHold');
    stage.querySelector('.mm-bg').style.backgroundImage = 'url(img/game_bg.webp)';
    const setScore = () => { $('mmScore').textContent = fmt(score); };

    function overlay(html, cls) { const ov = h('div', 'mm-ov ' + (cls || ''), html); layer.appendChild(ov); return ov; }
    function closeOv(ov) { if (!ov || !ov.parentNode) return; ov.classList.add('out'); setTimeout(() => ov.remove(), RM ? 0 : 220); }
    function clickWait(btn, botSec) {
      return new Promise(res => {
        btn.addEventListener('click', () => { AUc('unlock'); SE('tap'); buzz(); res(); }, { once: true });
        if (BOT) sleep(botSec || 0.8).then(() => { if (alive && btn.isConnected) btn.click(); });
      });
    }
    function pop(x, y, text, cls) {
      const p = h('div', 'mm-pop ' + (cls || ''), esc(text));
      p.style.left = x + '%'; p.style.top = y + '%';
      fx.appendChild(p); setTimeout(() => p.remove(), 1100);
    }

    /* ---------- ① 遊び方 ---------- */
    async function howto() {
      const ov = overlay(`<div class="mm-card howto">
        ${guide.point ? `<img class="mm-guide" src="${guide.point}" alt="">` : ''}
        <span class="mm-tag2">${esc(W.time || '')} 見守りラウンド</span>
        <h2>入居者さんの「いつもとちがう」に気づこう</h2>
        ${RES[0] ? `<div class="mm-demo" aria-hidden="true">
          <figure><img src="${RES[0].good}" alt=""><figcaption>きのう</figcaption></figure>
          <span class="arr"><svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>
          <figure class="t"><img src="${RES[0].tiredImg}" alt=""><i class="ring"></i><figcaption>きょう</figcaption></figure>
          <p>表情・食事・身のまわりの<br>小さな変化を見つける</p></div>` : ''}
        <ul class="mm-rules">
          <li><b>1</b><div><strong>まず「きのうの様子」を見る</strong><span>3人のお部屋を順番にまわります</span></div></li>
          <li><b>2</b><div><strong>きょうの様子で、ちがうところをタップ</strong><span>1人につき3つ。下のボタンをおしている間は、きのうの様子が見られます</span></div></li>
          <li><b>3</b><div><strong>見つけたら「どうする？」を選ぶ</strong><span>ひとりで抱えこまないのが、チームの仕事</span></div></li>
        </ul>
        <button class="mm-b">はじめる</button></div>`, 'how');
      await clickWait(ov.querySelector('.mm-b'), 0.8);
      closeOv(ov);
      AUc('bgm', 'work');
    }

    /* ---------- ② 1人分のお部屋 ---------- */
    async function room(ri) {
      const r = RES[ri];
      $('mmRoom').innerHTML = `<small>${esc(r.room)}</small>${esc(r.name)}`;
      [...$('mmProg').children].forEach((d, i) => { d.className = i < ri ? 'done' : i === ri ? 'on' : ''; });
      const diffs = r.diffs.slice();
      stats.total += diffs.length;
      const found = new Set();
      const foundBox = $('mmFound');
      foundBox.innerHTML = diffs.map((_, i) => `<span class="slot"><b>${i + 1}</b><em>ちがいを探そう</em></span>`).join('');
      const tag = $('mmTag');
      const bar = $('mmBar');
      bar.style.transition = 'none'; bar.style.transform = 'scaleX(1)';

      // きのうの様子（自動で少し見せる）→ きょうへ
      paint(stage, r, r.yesterday, false);
      tag.textContent = 'きのう'; tag.className = 'mm-tag y';
      stage.classList.add('enter'); setTimeout(() => stage.classList.remove('enter'), 400);
      const intro = overlay(`<div class="mm-chip"><b>${esc(r.room)}</b> ${esc(r.name)}　きのうの様子をおぼえてね</div>`, 'intro');
      await sleep(2.6);
      closeOv(intro);
      paint(stage, r, r.today, true);
      tag.textContent = 'きょう'; tag.className = 'mm-tag t';
      stage.classList.add('flip'); setTimeout(() => stage.classList.remove('flip'), 500);
      SE('count', 0.6);
      hold.disabled = false;

      // 時間
      const t0 = performance.now();
      const limit = T(SEC);
      requestAnimationFrame(() => { bar.style.transition = `transform ${limit}ms linear`; bar.style.transform = 'scaleX(0)'; });

      let lastMiss = 0, helped = false, done = false, resolveRoom;
      const roomDone = new Promise(res => { resolveRoom = res; });
      const zones = {};
      // 当たりの場所（ステージ上の％）
      const Z = { face: [32, 5, 36, 27], tray: [25, 62, 53, 27], cup: [78, 56, 19, 19], flower: [1, 39, 28, 23], tissue: [1, 70, 27, 18], pill: [76, 76, 23, 14] };
      diffs.forEach(k => {
        const z = h('button', 'mm-zone'); z.setAttribute('aria-label', DIFF_TEXT[k] || k);
        const [x, y, w, hh] = Z[k]; Object.assign(z.style, { left: x + '%', top: y + '%', width: w + '%', height: hh + '%' });
        z.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); hit(k); });
        stage.appendChild(z); zones[k] = z;
      });
      function hit(k) {
        if (done || found.has(k) || stage.classList.contains('yday')) return;
        found.add(k); stats.found++;
        const left = Math.max(0, 1 - (performance.now() - t0) / limit);
        const gain = PTS.find + Math.round(left * PTS.timeBonus * 10);
        score += gain; setScore();
        const z = zones[k]; z.classList.add('ok'); z.classList.remove('hint');
        const [x, y, w, hh] = Z[k];
        pop(x + w / 2, y + hh / 2, '+' + gain, 'plus');
        const slot = foundBox.children[found.size - 1]; slot.className = 'slot got'; slot.innerHTML = `<b>✓</b><em>${esc(DIFF_TEXT[k])}</em>`;
        SE(found.size === diffs.length ? 'perfect' : 'ok', 0.7); buzz();
        if (found.size === diffs.length) finish();
      }
      function onMiss(e) {
        if (done || stage.classList.contains('yday') || e.target.closest('.mm-zone')) return;
        const now = performance.now(); if (now - lastMiss < 450) return; lastMiss = now;
        const rc = stage.getBoundingClientRect();
        const x = (e.clientX - rc.left) / rc.width * 100, y = (e.clientY - rc.top) / rc.height * 100;
        score = Math.max(0, score + PTS.miss); stats.miss++; setScore();
        pop(x, y, '×', 'miss'); SE('miss', 0.5);
      }
      stage.addEventListener('pointerdown', onMiss);
      // 少し見つからないときは、ひとつだけそっと光らせる
      const helpT = setTimeout(() => { if (done) return; const k = diffs.find(d => !found.has(d)); if (k) { zones[k].classList.add('hint'); helped = true; } }, T(SEC * 0.55));
      const endT = setTimeout(() => finish(true), limit);
      function finish(timeup) {
        if (done) return; done = true;
        clearTimeout(helpT); clearTimeout(endT);
        stage.removeEventListener('pointerdown', onMiss);
        hold.disabled = true;
        bar.style.transition = 'none';
        const rest = diffs.filter(d => !found.has(d));
        rest.forEach((k, j) => {
          zones[k].classList.add('missed');
          const slot = foundBox.children[found.size + j]; slot.className = 'slot lost'; slot.innerHTML = `<b>!</b><em>${esc(DIFF_TEXT[k])}</em>`;
        });
        stats.rooms.push({ name: r.name, found: found.size, of: diffs.length, helped });
        if (timeup) SE('whistle', 0.5);
        resolveRoom();
      }
      // ボット
      if (BOT) (async () => {
        await sleep(0.4);
        let misses = BOT.miss;
        for (const k of diffs) {
          if (!alive || done) return;
          await sleep(BOT.gap[0] + Math.random() * (BOT.gap[1] - BOT.gap[0]));
          if (misses > 0 && Math.random() < 0.6) {
            misses--; const rc = stage.getBoundingClientRect();
            onMiss({ target: stage, clientX: rc.left + rc.width * 0.5, clientY: rc.top + rc.height * 0.97 });
          }
          if (Math.random() <= BOT.find) hit(k);
        }
      })();

      await roomDone;
      await sleep(0.9);
      zones && Object.values(zones).forEach(z => z.remove());

      // どうする？
      const ov = overlay(`<div class="mm-card ask">
        <span class="mm-tag2">どうする？</span>
        <h3>${esc(r.ask)}</h3>
        <div class="mm-opts">${shuffled(r.opts.length).map((i, pos) => `<button class="mm-opt" data-i="${i}"><span class="k">${'ABC'[pos]}</span><span>${esc(r.opts[i])}</span></button>`).join('')}</div>
        <div class="mm-exp" hidden></div>
        <button class="mm-b next" hidden>${ri < RES.length - 1 ? 'つぎのお部屋へ' : '見守りラウンドを終える'}</button></div>`, 'askov');
      await new Promise(res => {
        const btns = [...ov.querySelectorAll('.mm-opt')];
        btns.forEach(b => b.addEventListener('click', () => {
          if (ov.classList.contains('answered')) return;
          ov.classList.add('answered'); AUc('unlock'); buzz();
          const i = +b.dataset.i, ok = i === r.ok;
          b.classList.add(ok ? 'good' : 'bad');
          if (!ok) ov.querySelector(`.mm-opt[data-i="${r.ok}"]`).classList.add('good');
          if (ok) { score += PTS.act; stats.acts++; setScore(); }
          SE(ok ? 'ok' : 'ng', 0.7);
          const ex = ov.querySelector('.mm-exp'); ex.hidden = false;
          ex.innerHTML = `${guide.joy && ok ? `<img src="${guide.joy}" alt="">` : guide.point ? `<img src="${guide.point}" alt="">` : ''}<p><b>${ok ? '正解！ +' + PTS.act : 'こうしよう'}</b>${esc(r.exp)}</p>`;
          const nb = ov.querySelector('.next'); nb.hidden = false;
          clickWait(nb, 1.0).then(res);
        }));
        if (BOT) sleep(1.1).then(() => { if (alive) ov.querySelector(`.mm-opt[data-i="${BOT.ok ? r.ok : (r.ok + 1) % btns.length}"]`).click(); });
      });
      closeOv(ov);
      await sleep(0.25);
    }

    /* きのうを見るボタン（おしている間だけ） */
    let holding = false;
    const curRoom = () => RES[Math.min(RES.length - 1, stats.rooms.length)];
    const holdOn = e => { if (hold.disabled) return; e.preventDefault(); holding = true; const r = curRoom(); paint(stage, r, r.yesterday, false); $('mmTag').textContent = 'きのう'; $('mmTag').className = 'mm-tag y'; buzz(); };
    const holdOff = () => { if (!holding) return; holding = false; const r = curRoom(); paint(stage, r, r.today, true); $('mmTag').textContent = 'きょう'; $('mmTag').className = 'mm-tag t'; };
    hold.addEventListener('pointerdown', holdOn);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => hold.addEventListener(ev, holdOff));
    hold.addEventListener('contextmenu', e => e.preventDefault());

    /* ---------- ③ 結果 ---------- */
    async function result() {
      const rk = rankOf(score);
      const ov = overlay(`<div class="mm-card res">
        ${guide.joy ? `<img class="mm-guide big" src="${guide.joy}" alt="">` : ''}
        <span class="mm-tag2">見守りラウンド おわり</span>
        <div class="mm-rank"><small>RANK</small><b>${rk.r}</b><span>${rk.label}</span></div>
        <div class="mm-sum">
          <div><small>スコア</small><b>${fmt(score)}<i>pt</i></b></div>
          <div><small>気づけた変化</small><b>${stats.found}<i>/ ${stats.total}</i></b></div>
          <div><small>チームで動けた</small><b>${stats.acts}<i>/ ${RES.length}</i></b></div>
        </div>
        <p class="mm-note">小さな変化に早く気づいて、チームで共有する。これが毎日の「見守り」です。<br>※ランクはゲームの得点です。仕事の向き・不向きとは関係ありません</p>
        <button class="mm-b">お昼休みへ</button></div>`, 'resov');
      SE('fanfare', 0.8);
      await clickWait(ov.querySelector('.mm-b'), 1.2);
      return rk;
    }

    return (async () => {
      setScore(); preloadItems();
      await howto();
      for (let i = 0; i < RES.length && alive; i++) await room(i);
      [...$('mmProg').children].forEach(d => { d.className = 'done'; });
      const rk = await result();
      alive = false;
      return { score: Math.round(score), rank: rk.r, label: rk.label, stats };
    })();
  }

  window.WorkGame = { start };
})();
