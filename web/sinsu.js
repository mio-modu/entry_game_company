/* 신수 10종 절차적 수묵 렌더러.
   붓질을 코드로 흉내낸다 — 테이퍼 스트로크(끝이 가늘어지는 획)와
   먹 번짐(반투명 겹침)만으로 그린다. 어두운 먹 바탕 위에 한지색으로
   긋는 음각 수묵이라, 게임의 다크 UI와 같은 결로 붙는다.
   같은 스펙에서 4등급(어린/기본/성난/수호신)이 나오도록 설계했다. */
(function (root) {
  "use strict";

  var INK = "236,234,227";      // 한지
  var RED = "214,69,58";        // 인장 주홍
  var GOLD = "201,162,39";      // 금니

  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function ink(a) { return "rgba(" + INK + "," + a + ")"; }

  // 끝으로 갈수록 가늘어지는 붓획. 양쪽 외곽선을 만들어 채운다.
  function brush(ctx, pts, w0, w1, color, R) {
    if (pts.length < 2) return;
    var n = pts.length, L = [], Rt = [];
    for (var i = 0; i < n; i++) {
      var p = pts[i];
      var q = pts[Math.min(i + 1, n - 1)], o = pts[Math.max(i - 1, 0)];
      var dx = q[0] - o[0], dy = q[1] - o[1];
      var len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var t = i / (n - 1);
      var w = (w0 + (w1 - w0) * t) * (0.88 + (R ? R() : 0.5) * 0.24) / 2;
      L.push([p[0] + nx * w, p[1] + ny * w]);
      Rt.push([p[0] - nx * w, p[1] - ny * w]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (i = n - 1; i >= 0; i--) ctx.lineTo(Rt[i][0], Rt[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function curve(a, b, c, steps) {       // 2차 베지어를 점열로
    steps = steps || 18;
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, u = 1 - t;
      pts.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
                u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]);
    }
    return pts;
  }

  // 가장자리가 울렁이는 먹덩이. 붓으로 찍어 번진 느낌.
  function blob(ctx, cx, cy, rx, ry, color, R, wob) {
    wob = wob == null ? 0.16 : wob;
    var pts = [], N = 26;
    for (var i = 0; i < N; i++) {
      var a = (i / N) * Math.PI * 2;
      var k = 1 + (R() - 0.5) * wob * 2;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < N; i++) {
      var p = pts[i], q = pts[(i + 1) % N];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function eye(ctx, x, y, r, angry) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = "rgba(" + GOLD + ",.95)"; ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * .18, y, r * .42, 0, 7); ctx.fillStyle = "rgba(10,12,18,.9)"; ctx.fill();
    if (angry) {
      ctx.beginPath();
      ctx.moveTo(x - r * 1.5, y - r * 1.5); ctx.lineTo(x + r * 1.3, y - r * .5);
      ctx.lineWidth = r * .62; ctx.strokeStyle = ink(.9); ctx.lineCap = "round"; ctx.stroke();
    }
  }

  /* ── 몸체 타입 세 가지 ───────────────────────────────────────── */

  function beast(ctx, s, R, g) {
    var a = g.ia;
    // 종마다 비례가 달라야 실루엣만 보고도 구분된다
    var p = s.p || {};
    var bw = p.bw || 1, bh = p.bh || 1, lg = p.leg || 1;
    var nk = p.neck || 1, hd = p.head || 1, cy = 300 + (p.low || 0);
    var legY = cy + 136 * lg, lw = 27 * (p.limb || 1);
    var hx = 256 + 126 * bw * 0.84, hy = cy - 86 * nk;

    [[196, cy + 30, 184, legY], [236, cy + 34, 232, legY + 4]].forEach(function (L) {
      brush(ctx, curve([L[0], L[1]], [L[0] - 14, (L[1] + L[3]) / 2], [L[2], L[3]]), lw, lw * .5, ink(a * .72), R);
    });
    blob(ctx, 243, cy, 108 * bw, 70 * bh, ink(a * .9), R);        // 몸통
    blob(ctx, 243 - 62 * bw, cy - 4, 68 * bw, 62 * bh, ink(a * .82), R);  // 엉덩이
    [[243 + 58 * bw, cy + 36, 243 + 68 * bw, legY + 4],
     [243 + 96 * bw, cy + 30, 243 + 110 * bw, legY]].forEach(function (L) {
      brush(ctx, curve([L[0], L[1]], [L[0] + 12, (L[1] + L[3]) / 2], [L[2], L[3]]), lw + 1, lw * .52, ink(a), R);
    });
    // 꼬리
    if (s.tail === "fluffy") {
      brush(ctx, curve([150, 282], [78, 238], [96, 158]), 30, 10, ink(a * .85), R);
      blob(ctx, 98, 162, 26, 30, ink(a * .7), R, .3);
    } else if (s.tail === "long") {
      brush(ctx, curve([152, 288], [60, 290], [40, 200]), 22, 5, ink(a * .85), R);
    } else {
      brush(ctx, curve([154, 286], [96, 262], [86, 206]), 20, 7, ink(a * .8), R);
    }
    // 목 — 길수록 가늘어진다
    brush(ctx, curve([243 + 70 * bw, cy - 28], [hx - 22, hy + 30], [hx - 6, hy + 8]),
          58 / Math.sqrt(nk), 44 / Math.sqrt(nk), ink(a * .95), R);
    blob(ctx, hx, hy, 54 * hd, 48 * hd, ink(a), R, .13);          // 머리
    if (s.mane) {
      for (var i = 0; i < 11; i++) {
        var th = -1.7 + i * 0.32;
        brush(ctx, [[hx + Math.cos(th) * 42 * hd, hy + Math.sin(th) * 40 * hd],
                    [hx + Math.cos(th) * 86 * hd, hy + Math.sin(th) * 82 * hd]], 16, 2, ink(a * .72), R);
      }
    }
    if (s.horns) {
      brush(ctx, curve([hx - 14, hy - 38 * hd], [hx - 26, hy - 86], [hx - 2, hy - 108]), 15, 4, ink(a), R);
      if (s.horns > 1) brush(ctx, curve([hx + 22, hy - 36 * hd], [hx + 30, hy - 84], [hx + 10, hy - 106]), 13, 4, ink(a * .9), R);
    }
    if (s.stripes) {
      for (i = 0; i < 6; i++) {
        var x = 243 - 86 * bw + i * 34 * bw;
        brush(ctx, curve([x, cy - 52 * bh], [x - 12, cy], [x + 4, cy + 46 * bh]), 13, 4, ink(a * .42), R);
      }
    }
    if (s.plate) {                                                // 등껍질
      blob(ctx, 243, cy - 10 * bh, 100 * bw, 54 * bh, ink(a * .42), R, .08);
      for (i = 0; i < 4; i++)
        brush(ctx, [[243 - 70 * bw + i * 46 * bw, cy - 54 * bh], [243 - 62 * bw + i * 46 * bw, cy + 22 * bh]],
              7, 3, ink(a * .3), R);
    }
    brush(ctx, [[hx + 32 * hd, hy + 18], [hx + 74 * hd, hy + 26]], 13, 3, ink(a * .9), R);  // 주둥이
    eye(ctx, hx + 16 * hd, hy - 12 * hd, 7.5, g.angry);
  }

  function bird(ctx, s, R, g) {
    var a = g.ia;
    // 꼬리깃 — 화려할수록 길고 많다
    var fn = s.tailFeathers || 4;
    for (var i = 0; i < fn; i++) {
      var sp = (i - (fn - 1) / 2) * 0.22;
      brush(ctx, curve([228, 332], [150 + sp * 60, 390 + sp * 40], [84 + sp * 110, 440 + sp * 30]),
            s.fancy ? 24 : 16, 3, ink(a * (.58 + .06 * i)), R);
      if (s.fancy) blob(ctx, 84 + sp * 110, 440 + sp * 30, 13, 9, "rgba(" + RED + ",.5)", R, .3);
    }
    // 날개
    brush(ctx, curve([252, 262], [300, 140], [398, 112]), 52, 10, ink(a * .9), R);
    brush(ctx, curve([244, 274], [182, 158], [112, 136]), 46, 9, ink(a * .78), R);
    blob(ctx, 258, 296, 72, 92, ink(a * .95), R);                  // 몸통
    // 다리 (삼족오는 셋)
    var legs = s.legs || 2;
    for (i = 0; i < legs; i++) {
      var lx = 236 + i * 30;
      brush(ctx, [[lx, 374], [lx + 4, 438]], 12, 7, ink(a * .9), R);
      brush(ctx, [[lx + 4, 438], [lx + 26, 446]], 8, 3, "rgba(" + GOLD + ",.8)", R);
    }
    blob(ctx, 296, 196, 44, 40, ink(a), R, .12);                   // 머리
    brush(ctx, [[330, 206], [372, 216]], 16, 2, "rgba(" + GOLD + ",.9)", R);  // 부리
    if (s.crest) for (i = 0; i < 3; i++)
      brush(ctx, curve([290, 160], [276 - i * 12, 120], [300 - i * 24, 92]), 10, 2, ink(a * .8), R);
    eye(ctx, 310, 188, 7, g.angry);
  }

  function serpent(ctx, s, R, g) {
    var a = g.ia;
    var spine = [];
    for (var i = 0; i <= 30; i++) {
      var t = i / 30;
      spine.push([70 + t * 300, 400 - t * 210 + Math.sin(t * Math.PI * 2.1) * 62]);
    }
    brush(ctx, spine, 14, 62, ink(a * .92), R);
    // 비늘 결
    for (i = 4; i < 28; i += 3) {
      var p = spine[i];
      brush(ctx, [[p[0] - 16, p[1] + 6], [p[0] + 10, p[1] - 10]], 6, 2, ink(a * .4), R);
    }
    if (s.legs) {
      [[170, 330], [258, 244]].forEach(function (L) {
        brush(ctx, curve([L[0], L[1]], [L[0] - 26, L[1] + 44], [L[0] - 46, L[1] + 70]), 17, 6, ink(a * .85), R);
        brush(ctx, [[L[0] - 46, L[1] + 70], [L[0] - 66, L[1] + 78]], 7, 2, "rgba(" + GOLD + ",.85)", R);
      });
    }
    var h = spine[30];
    blob(ctx, h[0] + 8, h[1] - 10, 54, 44, ink(a), R, .12);        // 머리
    if (s.horns) {
      brush(ctx, curve([h[0] - 6, h[1] - 44], [h[0] - 22, h[1] - 86], [h[0] + 8, h[1] - 104]), 14, 3, ink(a), R);
      brush(ctx, curve([h[0] + 30, h[1] - 42], [h[0] + 48, h[1] - 80], [h[0] + 22, h[1] - 100]), 12, 3, ink(a * .9), R);
    }
    if (s.whiskers) {
      brush(ctx, curve([h[0] + 46, h[1] - 4], [h[0] + 96, h[1] - 34], [h[0] + 128, h[1] + 16]), 8, 2, ink(a * .72), R);
      brush(ctx, curve([h[0] + 44, h[1] + 10], [h[0] + 92, h[1] + 36], [h[0] + 126, h[1] + 18]), 7, 2, ink(a * .62), R);
    }
    brush(ctx, [[h[0] + 44, h[1] + 2], [h[0] + 82, h[1] + 10]], 14, 3, ink(a * .9), R);
    eye(ctx, h[0] + 22, h[1] - 20, 8, g.angry);
  }

  /* ── 10종 스펙 ───────────────────────────────────────────────── */
  var LIST = [
    { k: "불가사리", m: "북한산", lv: 1,  t: "beast",   seed: 11, tail: "stub",
      p: { bw: .80, bh: 1.18, leg: .52, neck: .40, head: .86, limb: 1.15, low: 26 } },
    { k: "삼족오",   m: "속리산", lv: 2,  t: "bird",    seed: 23, legs: 3, tailFeathers: 3 },
    { k: "해태",     m: "계룡산", lv: 3,  t: "beast",   seed: 37, mane: true, horns: 1, tail: "fluffy",
      p: { bw: .96, bh: 1.00, leg: .86, neck: .92, head: 1.08, limb: 1.05 } },
    { k: "현무",     m: "설악산", lv: 4,  t: "beast",   seed: 41, plate: true, tail: "long",
      p: { bw: 1.18, bh: .80, leg: .46, neck: 1.46, head: .74, limb: 1.1, low: 34 } },
    { k: "백호",     m: "소백산", lv: 5,  t: "beast",   seed: 53, stripes: true, tail: "fluffy", mane: true,
      p: { bw: 1.14, bh: .86, leg: .92, neck: .66, head: 1.02, limb: 1.0, low: 10 } },
    { k: "기린",     m: "덕유산", lv: 6,  t: "beast",   seed: 61, horns: 2, tail: "long",
      p: { bw: .82, bh: .80, leg: 1.34, neck: 1.62, head: .74, limb: .72, low: -24 } },
    { k: "주작",     m: "지리산", lv: 7,  t: "bird",    seed: 73, tailFeathers: 5, fancy: true, crest: true },
    { k: "백록",     m: "한라산", lv: 8,  t: "beast",   seed: 83, horns: 2, tail: "stub",
      p: { bw: .88, bh: .84, leg: 1.22, neck: 1.40, head: .78, limb: .78, low: -16 } },
    { k: "봉황",     m: "금강산", lv: 9,  t: "bird",    seed: 97, tailFeathers: 6, fancy: true, crest: true },
    { k: "천지의 용", m: "백두산", lv: 10, t: "serpent", seed: 101, horns: 1, whiskers: true, legs: true }
  ];

  // 등급: 원본 하나에서 크기·먹 농도·이펙트만 바꾼다 (다시 그리지 않는다)
  var GRADES = {
    young:  { label: "어린",   k: 0.74, ia: 0.66, angry: false },
    base:   { label: "",       k: 0.94, ia: 0.86, angry: false },
    angry:  { label: "성난",   k: 1.02, ia: 1.00, angry: true  },
    guard:  { label: "수호신", k: 1.10, ia: 1.00, angry: true, gold: true }
  };

  function draw(canvas, key, grade, opts) {
    opts = opts || {};
    var s = LIST.filter(function (x) { return x.k === key; })[0] || LIST[0];
    var g = GRADES[grade || "base"];
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var R = rng(s.seed * 7 + (grade === "young" ? 3 : grade === "angry" ? 5 : grade === "guard" ? 9 : 1));

    ctx.clearRect(0, 0, W, H);
    if (opts.bg) { ctx.fillStyle = opts.bg; ctx.fillRect(0, 0, W, H); }

    ctx.save();
    ctx.scale(W / 512, H / 512);

    if (g.gold) {                                   // 수호신 — 뒤에 인장
      ctx.save(); ctx.translate(256, 256); ctx.rotate(-0.04);
      ctx.fillStyle = "rgba(" + RED + ",.18)";
      ctx.fillRect(-150, -150, 300, 300);
      ctx.lineWidth = 7; ctx.strokeStyle = "rgba(" + GOLD + ",.5)";
      ctx.strokeRect(-150, -150, 300, 300);
      ctx.restore();
    }
    if (g.angry) blob(ctx, 256, 282, 190, 160, "rgba(" + RED + ",.12)", R, .22);
    blob(ctx, 250, 300, 180, 130, ink(g.ia * .07), R, .26);        // 먹 번짐
    blob(ctx, 262, 430, 150, 26, ink(g.ia * .16), R, .35);         // 바닥 그림자

    ctx.save();
    ctx.translate(256, 290); ctx.scale(g.k, g.k); ctx.translate(-256, -290);
    (s.t === "bird" ? bird : s.t === "serpent" ? serpent : beast)(ctx, s, R, g);
    ctx.restore();

    ctx.restore();
  }

  root.Sinsu = { LIST: LIST, GRADES: GRADES, draw: draw };
})(typeof window !== "undefined" ? window : this);
