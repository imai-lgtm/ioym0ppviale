/* 音：BGM（Gemini で作った曲）と効果音（効果音ラボ）。読みこめないときは合成音で代わりに鳴らす */
(function () {
  const A = {};
  let ctx = null, master = null, bgmGain = null, sfxGain = null;
  const buffers = {};
  let muted = false;
  try { muted = localStorage.getItem('start_mute') === '1'; } catch (e) {}
  let bgmNode = null, bgmName = null, bgmWant = null;

  const SFX_FILES = {
    tap: 'audio/se_tap.mp3', msg: 'audio/se_msg.mp3', send: 'audio/se_send.mp3',
    ok: 'audio/se_ok.mp3', ng: 'audio/se_ng.mp3', sticker: 'audio/se_sticker.mp3',
    perfect: 'audio/se_perfect.mp3', miss: 'audio/se_miss.mp3', whistle: 'audio/se_whistle.mp3',
    count: 'audio/se_count.mp3', fanfare: 'audio/se_fanfare.mp3', swipe: 'audio/se_swipe.mp3',
  };
  const SE_VOL = { lid: 1.8, kick: 1.7, box: 1.7, tap: 0.7, msg: 0.8, send: 0.7, ok: 0.8, crane: 0.7, press: 1.2, whistle: 0.6 };
  /* BGM（Gemini で作った曲を1本、場面ごとに使い分け。ループ点は曲の小節に合わせてある：125BPM・44小節） */
  const BGM_MAIN = { file: 'audio/bgm_main.mp3', loopStart: 23.69, loopEnd: 108.17 };
  const BGM = (window.COMPANY && window.COMPANY.bgm) || {
    chat: Object.assign({}, BGM_MAIN, { start: 0, vol: 0.3, lowpass: 2600 }),   // 会話：音をやわらかく・小さめ
    work: Object.assign({}, BGM_MAIN, { start: 23.69, vol: 0.5 }),              // 作業：サビから全開
  };

  function ensure() {
    if (ctx) return ctx;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { ctx = null; return null; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    bgmGain = ctx.createGain(); bgmGain.gain.value = 0.5; bgmGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.8; sfxGain.connect(master);
    for (const k in SFX_FILES) load(k, SFX_FILES[k]);
    const seen = {};
    for (const k in BGM) { const f = BGM[k].file; if (!seen[f]) { seen[f] = 1; load('file:' + f, f); } }
    return ctx;
  }
  function load(key, url) {
    fetch(url).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
      .then(buf => { buffers[key] = buf; if (bgmWant && BGM[bgmWant] && key === 'file:' + BGM[bgmWant].file && bgmName !== bgmWant) A.bgm(bgmWant, true); })
      .catch(() => {});
  }

  A.unlock = function () { const c = ensure(); if (c && c.state !== 'running' && c.state !== 'closed') { try { const r = c.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) {} } };
  A.isMuted = () => muted;
  A.setMuted = function (m) {
    muted = m; try { localStorage.setItem('start_mute', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05);
  };

  /* ---- 合成音（ファイルがないときの代わり） ---- */
  function tone(f, t, d, type, v, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(t, d, v, hp) {
    const len = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, len, ctx.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp || 800;
    const g = ctx.createGain(); g.gain.value = v || 0.2;
    s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t);
  }
  const SYN = {
    tap: t => tone(880, t, 0.05, 'triangle', 0.15),
    msg: t => { tone(1046, t, 0.08, 'sine', 0.2); tone(1568, t + 0.07, 0.12, 'sine', 0.18); },
    send: t => tone(660, t, 0.06, 'triangle', 0.15, 990),
    ok: t => { tone(784, t, 0.1, 'triangle', 0.25); tone(1175, t + 0.08, 0.18, 'triangle', 0.25); },
    ng: t => tone(220, t, 0.25, 'square', 0.12, 160),
    sticker: t => { [1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.05, 0.15, 'sine', 0.18)); },
    lid: t => { tone(2400, t, 0.05, 'square', 0.08); noise(t, 0.05, 0.2, 3000); tone(520, t, 0.08, 'triangle', 0.2); },
    perfect: t => { tone(1568, t, 0.08, 'sine', 0.2); tone(2093, t + 0.05, 0.16, 'sine', 0.2); },
    miss: t => tone(180, t, 0.2, 'sawtooth', 0.12, 120),
    kick: t => { noise(t, 0.12, 0.25, 1200); tone(300, t, 0.1, 'triangle', 0.15, 120); },
    box: t => { noise(t, 0.1, 0.3, 300); tone(140, t, 0.12, 'sine', 0.3); },
    whistle: t => tone(2600, t, 0.5, 'sine', 0.15, 2500),
    count: t => tone(988, t, 0.12, 'square', 0.12),
    press: t => { noise(t, 0.3, 0.45, 100); tone(80, t, 0.35, 'sine', 0.5, 40); tone(1800, t, 0.06, 'square', 0.06); },
    crane: t => tone(140, t, 0.8, 'sawtooth', 0.05, 180),
    clamp: t => { tone(1500, t, 0.04, 'square', 0.08); noise(t, 0.06, 0.2, 2000); },
    fanfare: t => { [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.1, 0.3, 'triangle', 0.2)); },
    stamp: t => { noise(t, 0.12, 0.35, 200); tone(110, t, 0.15, 'sine', 0.4); },
    swipe: t => noise(t, 0.15, 0.15, 2500),
    combo: t => tone(1318, t, 0.1, 'triangle', 0.15, 1760),
  };

  A.se = function (name, vol, rate) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const buf = buffers[name];
    if (buf) {
      const s = ctx.createBufferSource(); s.buffer = buf; if (rate) s.playbackRate.value = rate;
      const g = ctx.createGain(); g.gain.value = (vol == null ? 1 : vol) * (SE_VOL[name] || 1);
      s.connect(g); g.connect(sfxGain); s.start(t);
    } else if (SYN[name]) SYN[name](t);
  };

  /* BGM：曲ごとにクロスフェード */
  A.bgm = function (name, force) {
    bgmWant = name;
    if (!ensure()) return;
    if (bgmName === name && !force) return;
    const t = ctx.currentTime;
    if (bgmNode) {
      const old = bgmNode; old.g.gain.cancelScheduledValues(t);
      old.g.gain.setTargetAtTime(0, t, 0.25); setTimeout(() => { try { old.s.stop(); } catch (e) {} }, 1500);
      bgmNode = null; bgmName = null;
    }
    if (!name) return;
    const cfg = BGM[name]; if (!cfg) return;
    const buf = buffers['file:' + cfg.file];
    if (!buf) return; // 読みこみ後に自動で流れる
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    if (cfg.loopEnd && cfg.loopEnd <= buf.duration) { s.loopStart = cfg.loopStart || 0; s.loopEnd = cfg.loopEnd; }
    const g = ctx.createGain(); g.gain.value = 0;
    if (cfg.lowpass) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cfg.lowpass; s.connect(f); f.connect(g); }
    else s.connect(g);
    g.connect(bgmGain);
    s.start(t, Math.min(cfg.start || 0, buf.duration - 1)); g.gain.setTargetAtTime(cfg.vol || 0.45, t, 0.4);
    bgmNode = { s, g }; bgmName = name;
  };
  A.bgmRate = function (r) { if (bgmNode) bgmNode.s.playbackRate.setTargetAtTime(r, ctx.currentTime, 0.3); };
  A.duck = function (on) { if (bgmGain) bgmGain.gain.setTargetAtTime(on ? 0.18 : 0.5, ctx.currentTime, 0.2); };

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    try { const r = document.hidden ? ctx.suspend() : ctx.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  });
  window.AUDIO = A;
})();
