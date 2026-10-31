/* 효과음 — 음원 파일 없이 합성한다.
 *
 * 아티팩트는 외부 오디오를 불러올 수 없고, data URI로 박아 넣으면 용량만
 * 불어난다. Web Audio로 만들면 0KB이고 음색도 마음대로 고칠 수 있다.
 *
 * 음정은 국악 평조(황·태·중·임·남)에서 골랐다. 서양 7음계로 올리면
 * 수묵 세계관과 어긋나고, 5음계는 어떤 순서로 쳐도 거슬리지 않는다.
 *
 * 소리는 사용자가 화면을 한 번 건드린 뒤에만 난다(브라우저 정책).
 */
(function (root) {
  "use strict";

  var ctx = null, master = null, on = true;

  // 평조 5음 — 황(C) 태(D) 중(F) 임(G) 남(A)
  var P = [523.25, 587.33, 698.46, 783.99, 880.00];

  function ac() {
    if (!on) return null;
    if (!ctx) {
      var C = root.AudioContext || root.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain();
      master.gain.value = 0.28;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  function tone(freq, dur, o) {
    var c = ac(); if (!c) return;
    o = o || {};
    var t = c.currentTime + (o.delay || 0);
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    var peak = o.gain == null ? 0.4 : o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  // 북·장구의 가죽 울림. 짧은 잡음을 저역만 남겨 쓴다.
  function thud(dur, o) {
    var c = ac(); if (!c) return;
    o = o || {};
    var n = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
    var src = c.createBufferSource(); src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = o.cut || 900;
    var g = c.createGain(); g.gain.value = o.gain == null ? 0.25 : o.gain;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(c.currentTime + (o.delay || 0));
  }

  var SFX = {
    // 소리를 켜고 끈다. 끈 상태에서는 오디오를 아예 만들지 않는다.
    set: function (v) {
      on = !!v;
      if (!on && ctx) { try { ctx.suspend(); } catch (e) {} }
      if (on) ac();
    },
    isOn: function () { return on; },

    tap: function () { tone(1180, 0.04, { type: "triangle", gain: 0.13 }); },

    // 낱말 성사 — 글자 수만큼 음을 올려 짚는다
    word: function (len) {
      var n = Math.max(2, Math.min(4, len || 2));
      for (var i = 0; i < n; i++) {
        tone(P[i], 0.17, { type: "triangle", gain: 0.2, delay: i * 0.045 });
      }
    },

    // 기세를 꺾는 한 방 — 북
    hit: function () {
      tone(96, 0.2, { type: "sine", to: 54, gain: 0.5 });
      thud(0.09, { cut: 700, gain: 0.22 });
    },

    // 글자판을 다 털었을 때
    clear: function () {
      [0, 2, 3, 4].forEach(function (k, i) {
        tone(P[k], 0.3, { type: "triangle", gain: 0.22, delay: i * 0.065 });
      });
    },

    win: function () {
      [0, 2, 4].forEach(function (k, i) {
        tone(P[k], 0.75, { type: "sine", gain: 0.2, delay: i * 0.02 });
      });
      tone(P[4] * 2, 0.9, { type: "triangle", gain: 0.1, delay: 0.1 });
    },

    lose: function () {
      tone(P[2], 0.6, { type: "sine", to: P[0] / 2, gain: 0.3 });
      thud(0.2, { cut: 400, gain: 0.15 });
    },

    // 강화 성공 — 맑은 종
    up: function () {
      tone(P[4], 0.55, { type: "sine", gain: 0.26 });
      tone(P[4] * 1.5, 0.5, { type: "sine", gain: 0.12, delay: 0.015 });
      tone(P[4] * 2, 0.4, { type: "triangle", gain: 0.07, delay: 0.03 });
    },

    // 강화 실패 — 둔탁하게. 벌주는 소리가 아니라 '아쉽다' 정도로
    down: function () {
      tone(165, 0.26, { type: "triangle", to: 116, gain: 0.2 });
      thud(0.12, { cut: 350, gain: 0.14 });
    },

    // 사전에 없는 낱말 — 아주 짧고 낮게. 혼내는 느낌이면 안 된다
    bad: function () { tone(233, 0.07, { type: "triangle", gain: 0.09 }); },

    // ── 수호신전 ──────────────────────────────────────────────
    // 폭주 진입 — 아래로 끌어내리는 울음. 북을 두 번 겹쳐 덩치를 만든다
    rage: function () {
      tone(220, 0.9, { type: "sawtooth", to: 62, gain: 0.3 });
      tone(110, 1.1, { type: "sine", to: 46, gain: 0.34, delay: 0.04 });
      thud(0.3, { cut: 260, gain: 0.3 });
      thud(0.22, { cut: 420, gain: 0.2, delay: 0.26 });
    },

    // 결정타 구간 — 숨을 들이켜듯 위로
    final: function () {
      tone(P[0], 0.5, { type: "triangle", to: P[4] * 2, gain: 0.22 });
      tone(78, 0.5, { type: "sine", gain: 0.3 });
    },

    // 포효 — 연속이 끊긴다. 벌이니까 둔하고 길게
    roar: function () {
      tone(132, 0.7, { type: "sawtooth", to: 54, gain: 0.26 });
      thud(0.26, { cut: 300, gain: 0.24 });
    },

    // 약점 적중 — 북 위에 맑은 쇠소리를 얹는다
    weak: function () {
      tone(84, 0.24, { type: "sine", to: 50, gain: 0.5 });
      thud(0.1, { cut: 800, gain: 0.24 });
      tone(P[4] * 2, 0.4, { type: "triangle", gain: 0.2, delay: 0.02 });
      tone(P[4] * 3, 0.32, { type: "sine", gain: 0.11, delay: 0.05 });
    },

    // 수호신이 두 글자를 흘려보낸다 — 맞은 소리가 아니라 막힌 소리
    guard: function () {
      thud(0.11, { cut: 220, gain: 0.2 });
      tone(146, 0.1, { type: "triangle", gain: 0.08 });
    }
  };

  root.SFX = SFX;
})(window);
