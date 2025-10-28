import { useRef as t, useLayoutEffect as e, useEffect as r } from "react";
function n(t) {
  if (void 0 === t)
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called"
    );
  return t;
}
function i(t, e) {
  (t.prototype = Object.create(e.prototype)),
    (t.prototype.constructor = t),
    (t.__proto__ = e);
}
var o,
  s,
  a,
  l,
  u,
  h,
  c,
  f,
  p,
  d,
  g,
  m,
  _,
  v,
  y,
  x,
  w,
  T = {
    autoSleep: 120,
    force3D: "auto",
    nullTargetWarn: 1,
    units: { lineHeight: "" },
  },
  b = { duration: 0.5, overwrite: !1, delay: 0 },
  M = 1e8,
  k = 1e-8,
  O = 2 * Math.PI,
  C = O / 4,
  E = 0,
  D = Math.sqrt,
  S = Math.cos,
  P = Math.sin,
  A = function (t) {
    return "string" == typeof t;
  },
  R = function (t) {
    return "function" == typeof t;
  },
  L = function (t) {
    return "number" == typeof t;
  },
  X = function (t) {
    return void 0 === t;
  },
  Y = function (t) {
    return "object" == typeof t;
  },
  F = function (t) {
    return !1 !== t;
  },
  N = function () {
    return "undefined" != typeof window;
  },
  z = function (t) {
    return R(t) || A(t);
  },
  B =
    ("function" == typeof ArrayBuffer && ArrayBuffer.isView) || function () {},
  I = Array.isArray,
  H = /(?:-?\.?\d|\.)+/gi,
  W = /[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g,
  U = /[-+=.]*\d+[.e-]*\d*[a-z%]*/g,
  V = /[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi,
  q = /[+-]=-?[.\d]+/,
  j = /[^,'"\[\]\s]+/gi,
  G = /^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i,
  K = {},
  $ = {},
  Q = function (t) {
    return ($ = Ct(t, K)) && Er;
  },
  Z = function (t, e) {},
  J = function (t, e) {
    return !e && void 0;
  },
  tt = function (t, e) {
    return (t && (K[t] = e) && $ && ($[t] = e)) || K;
  },
  et = function () {
    return 0;
  },
  rt = { suppressEvents: !0, isStart: !0, kill: !1 },
  nt = { suppressEvents: !0, kill: !1 },
  it = { suppressEvents: !0 },
  ot = {},
  st = [],
  at = {},
  lt = {},
  ut = {},
  ht = 30,
  ct = [],
  ft = "",
  pt = function (t) {
    var e,
      r,
      n = t[0];
    if ((Y(n) || R(n) || (t = [t]), !(e = (n._gsap || {}).harness))) {
      for (r = ct.length; r-- && !ct[r].targetTest(n); );
      e = ct[r];
    }
    for (r = t.length; r--; )
      (t[r] && (t[r]._gsap || (t[r]._gsap = new He(t[r], e)))) ||
        t.splice(r, 1);
    return t;
  },
  dt = function (t) {
    return t._gsap || pt(oe(t))[0]._gsap;
  },
  gt = function (t, e, r) {
    return (r = t[e]) && R(r)
      ? t[e]()
      : (X(r) && t.getAttribute && t.getAttribute(e)) || r;
  },
  mt = function (t, e) {
    return (t = t.split(",")).forEach(e) || t;
  },
  _t = function (t) {
    return Math.round(1e5 * t) / 1e5 || 0;
  },
  vt = function (t) {
    return Math.round(1e7 * t) / 1e7 || 0;
  },
  yt = function (t, e) {
    var r = e.charAt(0),
      n = parseFloat(e.substr(2));
    return (
      (t = parseFloat(t)),
      "+" === r ? t + n : "-" === r ? t - n : "*" === r ? t * n : t / n
    );
  },
  xt = function (t, e) {
    for (var r = e.length, n = 0; t.indexOf(e[n]) < 0 && ++n < r; );
    return n < r;
  },
  wt = function () {
    var t,
      e,
      r = st.length,
      n = st.slice(0);
    for (at = {}, st.length = 0, t = 0; t < r; t++)
      (e = n[t]) && e._lazy && (e.render(e._lazy[0], e._lazy[1], !0)._lazy = 0);
  },
  Tt = function (t) {
    return !!(t._initted || t._startAt || t.add);
  },
  bt = function (t, e, r, n) {
    st.length && !s && wt(),
      t.render(e, r, n || !!(s && e < 0 && Tt(t))),
      st.length && !s && wt();
  },
  Mt = function (t) {
    var e = parseFloat(t);
    return (e || 0 === e) && (t + "").match(j).length < 2
      ? e
      : A(t)
      ? t.trim()
      : t;
  },
  kt = function (t) {
    return t;
  },
  Ot = function (t, e) {
    for (var r in e) r in t || (t[r] = e[r]);
    return t;
  },
  Ct = function (t, e) {
    for (var r in e) t[r] = e[r];
    return t;
  },
  Et = function t(e, r) {
    for (var n in r)
      "__proto__" !== n &&
        "constructor" !== n &&
        "prototype" !== n &&
        (e[n] = Y(r[n]) ? t(e[n] || (e[n] = {}), r[n]) : r[n]);
    return e;
  },
  Dt = function (t, e) {
    var r,
      n = {};
    for (r in t) r in e || (n[r] = t[r]);
    return n;
  },
  St = function (t) {
    var e,
      r = t.parent || l,
      n = t.keyframes
        ? ((e = I(t.keyframes)),
          function (t, r) {
            for (var n in r)
              n in t ||
                ("duration" === n && e) ||
                "ease" === n ||
                (t[n] = r[n]);
          })
        : Ot;
    if (F(t.inherit))
      for (; r; ) n(t, r.vars.defaults), (r = r.parent || r._dp);
    return t;
  },
  Pt = function (t, e, r, n, i) {
    void 0 === r && (r = "_first"), void 0 === n && (n = "_last");
    var o,
      s = t[n];
    if (i) for (o = e[i]; s && s[i] > o; ) s = s._prev;
    return (
      s ? ((e._next = s._next), (s._next = e)) : ((e._next = t[r]), (t[r] = e)),
      e._next ? (e._next._prev = e) : (t[n] = e),
      (e._prev = s),
      (e.parent = e._dp = t),
      e
    );
  },
  At = function (t, e, r, n) {
    void 0 === r && (r = "_first"), void 0 === n && (n = "_last");
    var i = e._prev,
      o = e._next;
    i ? (i._next = o) : t[r] === e && (t[r] = o),
      o ? (o._prev = i) : t[n] === e && (t[n] = i),
      (e._next = e._prev = e.parent = null);
  },
  Rt = function (t, e) {
    t.parent &&
      (!e || t.parent.autoRemoveChildren) &&
      t.parent.remove &&
      t.parent.remove(t),
      (t._act = 0);
  },
  Lt = function (t, e) {
    if (t && (!e || e._end > t._dur || e._start < 0))
      for (var r = t; r; ) (r._dirty = 1), (r = r.parent);
    return t;
  },
  Xt = function (t, e, r, n) {
    return (
      t._startAt &&
      (s
        ? t._startAt.revert(nt)
        : (t.vars.immediateRender && !t.vars.autoRevert) ||
          t._startAt.render(e, !0, n))
    );
  },
  Yt = function t(e) {
    return !e || (e._ts && t(e.parent));
  },
  Ft = function (t) {
    return t._repeat ? Nt(t._tTime, (t = t.duration() + t._rDelay)) * t : 0;
  },
  Nt = function (t, e) {
    var r = Math.floor((t = vt(t / e)));
    return t && r === t ? r - 1 : r;
  },
  zt = function (t, e) {
    return (
      (t - e._start) * e._ts +
      (e._ts >= 0 ? 0 : e._dirty ? e.totalDuration() : e._tDur)
    );
  },
  Bt = function (t) {
    return (t._end = vt(
      t._start + (t._tDur / Math.abs(t._ts || t._rts || k) || 0)
    ));
  },
  It = function (t, e) {
    var r = t._dp;
    return (
      r &&
        r.smoothChildTiming &&
        t._ts &&
        ((t._start = vt(
          r._time -
            (t._ts > 0
              ? e / t._ts
              : ((t._dirty ? t.totalDuration() : t._tDur) - e) / -t._ts)
        )),
        Bt(t),
        r._dirty || Lt(r, t)),
      t
    );
  },
  Ht = function (t, e) {
    var r;
    if (
      ((e._time ||
        (!e._dur && e._initted) ||
        (e._start < t._time && (e._dur || !e.add))) &&
        ((r = zt(t.rawTime(), e)),
        (!e._dur || te(0, e.totalDuration(), r) - e._tTime > k) &&
          e.render(r, !0)),
      Lt(t, e)._dp && t._initted && t._time >= t._dur && t._ts)
    ) {
      if (t._dur < t.duration())
        for (r = t; r._dp; )
          r.rawTime() >= 0 && r.totalTime(r._tTime), (r = r._dp);
      t._zTime = -1e-8;
    }
  },
  Wt = function (t, e, r, n) {
    return (
      e.parent && Rt(e),
      (e._start = vt(
        (L(r) ? r : r || t !== l ? Qt(t, r, e) : t._time) + e._delay
      )),
      (e._end = vt(
        e._start + (e.totalDuration() / Math.abs(e.timeScale()) || 0)
      )),
      Pt(t, e, "_first", "_last", t._sort ? "_start" : 0),
      jt(e) || (t._recent = e),
      n || Ht(t, e),
      t._ts < 0 && It(t, t._tTime),
      t
    );
  },
  Ut = function (t, e) {
    return K.ScrollTrigger ? K.ScrollTrigger.create(e, t) : void 0;
  },
  Vt = function (t, e, r, n, i) {
    return (
      $e(t, e, i),
      t._initted
        ? !r &&
          t._pt &&
          !s &&
          ((t._dur && !1 !== t.vars.lazy) || (!t._dur && t.vars.lazy)) &&
          p !== De.frame
          ? (st.push(t), (t._lazy = [i, n]), 1)
          : void 0
        : 1
    );
  },
  qt = function t(e) {
    var r = e.parent;
    return r && r._ts && r._initted && !r._lock && (r.rawTime() < 0 || t(r));
  },
  jt = function (t) {
    var e = t.data;
    return "isFromStart" === e || "isStart" === e;
  },
  Gt = function (t, e, r, n) {
    var i = t._repeat,
      o = vt(e) || 0,
      s = t._tTime / t._tDur;
    return (
      s && !n && (t._time *= o / t._dur),
      (t._dur = o),
      (t._tDur = i ? (i < 0 ? 1e10 : vt(o * (i + 1) + t._rDelay * i)) : o),
      s > 0 && !n && It(t, (t._tTime = t._tDur * s)),
      t.parent && Bt(t),
      r || Lt(t.parent, t),
      t
    );
  },
  Kt = function (t) {
    return t instanceof Ue ? Lt(t) : Gt(t, t._dur);
  },
  $t = { _start: 0, endTime: et, totalDuration: et },
  Qt = function t(e, r, n) {
    var i,
      o,
      s,
      a = e.labels,
      l = e._recent || $t,
      u = e.duration() >= M ? l.endTime(!1) : e._dur;
    return A(r) && (isNaN(r) || r in a)
      ? ((o = r.charAt(0)),
        (s = "%" === r.substr(-1)),
        (i = r.indexOf("=")),
        "<" === o || ">" === o
          ? (i >= 0 && (r = r.replace(/=/, "")),
            ("<" === o ? l._start : l.endTime(l._repeat >= 0)) +
              (parseFloat(r.substr(1)) || 0) *
                (s ? (i < 0 ? l : n).totalDuration() / 100 : 1))
          : i < 0
          ? (r in a || (a[r] = u), a[r])
          : ((o = parseFloat(r.charAt(i - 1) + r.substr(i + 1))),
            s && n && (o = (o / 100) * (I(n) ? n[0] : n).totalDuration()),
            i > 1 ? t(e, r.substr(0, i - 1), n) + o : u + o))
      : null == r
      ? u
      : +r;
  },
  Zt = function (t, e, r) {
    var n,
      i,
      o = L(e[1]),
      s = (o ? 2 : 1) + (t < 2 ? 0 : 1),
      a = e[s];
    if ((o && (a.duration = e[1]), (a.parent = r), t)) {
      for (n = a, i = r; i && !("immediateRender" in n); )
        (n = i.vars.defaults || {}), (i = F(i.vars.inherit) && i.parent);
      (a.immediateRender = F(n.immediateRender)),
        t < 2 ? (a.runBackwards = 1) : (a.startAt = e[s - 1]);
    }
    return new er(e[0], a, e[s + 1]);
  },
  Jt = function (t, e) {
    return t || 0 === t ? e(t) : e;
  },
  te = function (t, e, r) {
    return r < t ? t : r > e ? e : r;
  },
  ee = function (t, e) {
    return A(t) && (e = G.exec(t)) ? e[1] : "";
  },
  re = [].slice,
  ne = function (t, e) {
    return (
      t &&
      Y(t) &&
      "length" in t &&
      ((!e && !t.length) || (t.length - 1 in t && Y(t[0]))) &&
      !t.nodeType &&
      t !== u
    );
  },
  ie = function (t, e, r) {
    return (
      void 0 === r && (r = []),
      t.forEach(function (t) {
        var n;
        return (A(t) && !e) || ne(t, 1)
          ? (n = r).push.apply(n, oe(t))
          : r.push(t);
      }) || r
    );
  },
  oe = function (t, e, r) {
    return a && !e && a.selector
      ? a.selector(t)
      : !A(t) || r || (!h && Se())
      ? I(t)
        ? ie(t, r)
        : ne(t)
        ? re.call(t, 0)
        : t
        ? [t]
        : []
      : re.call((e || c).querySelectorAll(t), 0);
  },
  se = function (t) {
    return (
      (t = oe(t)[0] || J() || {}),
      function (e) {
        var r = t.current || t.nativeElement || t;
        return oe(
          e,
          r.querySelectorAll ? r : r === t ? J() || c.createElement("div") : t
        );
      }
    );
  },
  ae = function (t) {
    return t.sort(function () {
      return 0.5 - Math.random();
    });
  },
  le = function (t) {
    if (R(t)) return t;
    var e = Y(t) ? t : { each: t },
      r = Fe(e.ease),
      n = e.from || 0,
      i = parseFloat(e.base) || 0,
      o = {},
      s = n > 0 && n < 1,
      a = isNaN(n) || s,
      l = e.axis,
      u = n,
      h = n;
    return (
      A(n)
        ? (u = h = { center: 0.5, edges: 0.5, end: 1 }[n] || 0)
        : !s && a && ((u = n[0]), (h = n[1])),
      function (t, s, c) {
        var f,
          p,
          d,
          g,
          m,
          _,
          v,
          y,
          x,
          w = (c || e).length,
          T = o[w];
        if (!T) {
          if (!(x = "auto" === e.grid ? 0 : (e.grid || [1, M])[1])) {
            for (
              v = -1e8;
              v < (v = c[x++].getBoundingClientRect().left) && x < w;

            );
            x < w && x--;
          }
          for (
            T = o[w] = [],
              f = a ? Math.min(x, w) * u - 0.5 : n % x,
              p = x === M ? 0 : a ? (w * h) / x - 0.5 : (n / x) | 0,
              v = 0,
              y = M,
              _ = 0;
            _ < w;
            _++
          )
            (d = (_ % x) - f),
              (g = p - ((_ / x) | 0)),
              (T[_] = m = l ? Math.abs("y" === l ? g : d) : D(d * d + g * g)),
              m > v && (v = m),
              m < y && (y = m);
          "random" === n && ae(T),
            (T.max = v - y),
            (T.min = y),
            (T.v = w =
              (parseFloat(e.amount) ||
                parseFloat(e.each) *
                  (x > w
                    ? w - 1
                    : l
                    ? "y" === l
                      ? w / x
                      : x
                    : Math.max(x, w / x)) ||
                0) * ("edges" === n ? -1 : 1)),
            (T.b = w < 0 ? i - w : i),
            (T.u = ee(e.amount || e.each) || 0),
            (r = r && w < 0 ? Xe(r) : r);
        }
        return (
          (w = (T[t] - T.min) / T.max || 0),
          vt(T.b + (r ? r(w) : w) * T.v) + T.u
        );
      }
    );
  },
  ue = function (t) {
    var e = Math.pow(10, ((t + "").split(".")[1] || "").length);
    return function (r) {
      var n = vt(Math.round(parseFloat(r) / t) * t * e);
      return (n - (n % 1)) / e + (L(r) ? 0 : ee(r));
    };
  },
  he = function (t, e) {
    var r,
      n,
      i = I(t);
    return (
      !i &&
        Y(t) &&
        ((r = i = t.radius || M),
        t.values
          ? ((t = oe(t.values)), (n = !L(t[0])) && (r *= r))
          : (t = ue(t.increment))),
      Jt(
        e,
        i
          ? R(t)
            ? function (e) {
                return (n = t(e)), Math.abs(n - e) <= r ? n : e;
              }
            : function (e) {
                for (
                  var i,
                    o,
                    s = parseFloat(n ? e.x : e),
                    a = parseFloat(n ? e.y : 0),
                    l = M,
                    u = 0,
                    h = t.length;
                  h--;

                )
                  (i = n
                    ? (i = t[h].x - s) * i + (o = t[h].y - a) * o
                    : Math.abs(t[h] - s)) < l && ((l = i), (u = h));
                return (
                  (u = !r || l <= r ? t[u] : e),
                  n || u === e || L(e) ? u : u + ee(e)
                );
              }
          : ue(t)
      )
    );
  },
  ce = function (t, e, r, n) {
    return Jt(I(t) ? !e : !0 === r ? !!(r = 0) : !n, function () {
      return I(t)
        ? t[~~(Math.random() * t.length)]
        : (r = r || 1e-5) &&
            (n = r < 1 ? Math.pow(10, (r + "").length - 2) : 1) &&
            Math.floor(
              Math.round((t - r / 2 + Math.random() * (e - t + 0.99 * r)) / r) *
                r *
                n
            ) / n;
    });
  },
  fe = function (t, e, r) {
    return Jt(r, function (r) {
      return t[~~e(r)];
    });
  },
  pe = function (t) {
    for (var e, r, n, i, o = 0, s = ""; ~(e = t.indexOf("random(", o)); )
      (n = t.indexOf(")", e)),
        (i = "[" === t.charAt(e + 7)),
        (r = t.substr(e + 7, n - e - 7).match(i ? j : H)),
        (s +=
          t.substr(o, e - o) + ce(i ? r : +r[0], i ? 0 : +r[1], +r[2] || 1e-5)),
        (o = n + 1);
    return s + t.substr(o, t.length - o);
  },
  de = function (t, e, r, n, i) {
    var o = e - t,
      s = n - r;
    return Jt(i, function (e) {
      return r + (((e - t) / o) * s || 0);
    });
  },
  ge = function (t, e, r) {
    var n,
      i,
      o,
      s = t.labels,
      a = M;
    for (n in s)
      (i = s[n] - e) < 0 == !!r &&
        i &&
        a > (i = Math.abs(i)) &&
        ((o = n), (a = i));
    return o;
  },
  me = function (t, e, r) {
    var n,
      i,
      o,
      s = t.vars,
      l = s[e],
      u = a,
      h = t._ctx;
    if (l)
      return (
        (n = s[e + "Params"]),
        (i = s.callbackScope || t),
        r && st.length && wt(),
        h && (a = h),
        (o = n ? l.apply(i, n) : l.call(i)),
        (a = u),
        o
      );
  },
  _e = function (t) {
    return (
      Rt(t),
      t.scrollTrigger && t.scrollTrigger.kill(!!s),
      t.progress() < 1 && me(t, "onInterrupt"),
      t
    );
  },
  ve = [],
  ye = function (t) {
    if (t)
      if (((t = (!t.name && t.default) || t), N() || t.headless)) {
        var e = t.name,
          r = R(t),
          n =
            e && !r && t.init
              ? function () {
                  this._props = [];
                }
              : t,
          i = {
            init: et,
            render: hr,
            add: Ge,
            kill: fr,
            modifier: cr,
            rawVars: 0,
          },
          o = {
            targetTest: 0,
            get: 0,
            getSetter: sr,
            aliases: {},
            register: 0,
          };
        if ((Se(), t !== n)) {
          if (lt[e]) return;
          Ot(n, Ot(Dt(t, i), o)),
            Ct(n.prototype, Ct(i, Dt(t, o))),
            (lt[(n.prop = e)] = n),
            t.targetTest && (ct.push(n), (ot[e] = 1)),
            (e =
              ("css" === e ? "CSS" : e.charAt(0).toUpperCase() + e.substr(1)) +
              "Plugin");
        }
        tt(e, n), t.register && t.register(Er, n, gr);
      } else ve.push(t);
  },
  xe = 255,
  we = {
    aqua: [0, xe, xe],
    lime: [0, xe, 0],
    silver: [192, 192, 192],
    black: [0, 0, 0],
    maroon: [128, 0, 0],
    teal: [0, 128, 128],
    blue: [0, 0, xe],
    navy: [0, 0, 128],
    white: [xe, xe, xe],
    olive: [128, 128, 0],
    yellow: [xe, xe, 0],
    orange: [xe, 165, 0],
    gray: [128, 128, 128],
    purple: [128, 0, 128],
    green: [0, 128, 0],
    red: [xe, 0, 0],
    pink: [xe, 192, 203],
    cyan: [0, xe, xe],
    transparent: [xe, xe, xe, 0],
  },
  Te = function (t, e, r) {
    return (
      ((6 * (t += t < 0 ? 1 : t > 1 ? -1 : 0) < 1
        ? e + (r - e) * t * 6
        : t < 0.5
        ? r
        : 3 * t < 2
        ? e + (r - e) * (2 / 3 - t) * 6
        : e) *
        xe +
        0.5) |
      0
    );
  },
  be = function (t, e, r) {
    var n,
      i,
      o,
      s,
      a,
      l,
      u,
      h,
      c,
      f,
      p = t ? (L(t) ? [t >> 16, (t >> 8) & xe, t & xe] : 0) : we.black;
    if (!p) {
      if (("," === t.substr(-1) && (t = t.substr(0, t.length - 1)), we[t]))
        p = we[t];
      else if ("#" === t.charAt(0)) {
        if (
          (t.length < 6 &&
            ((n = t.charAt(1)),
            (i = t.charAt(2)),
            (o = t.charAt(3)),
            (t =
              "#" +
              n +
              n +
              i +
              i +
              o +
              o +
              (5 === t.length ? t.charAt(4) + t.charAt(4) : ""))),
          9 === t.length)
        )
          return [
            (p = parseInt(t.substr(1, 6), 16)) >> 16,
            (p >> 8) & xe,
            p & xe,
            parseInt(t.substr(7), 16) / 255,
          ];
        p = [(t = parseInt(t.substr(1), 16)) >> 16, (t >> 8) & xe, t & xe];
      } else if ("hsl" === t.substr(0, 3))
        if (((p = f = t.match(H)), e)) {
          if (~t.indexOf("="))
            return (p = t.match(W)), r && p.length < 4 && (p[3] = 1), p;
        } else
          (s = (+p[0] % 360) / 360),
            (a = +p[1] / 100),
            (n =
              2 * (l = +p[2] / 100) -
              (i = l <= 0.5 ? l * (a + 1) : l + a - l * a)),
            p.length > 3 && (p[3] *= 1),
            (p[0] = Te(s + 1 / 3, n, i)),
            (p[1] = Te(s, n, i)),
            (p[2] = Te(s - 1 / 3, n, i));
      else p = t.match(H) || we.transparent;
      p = p.map(Number);
    }
    return (
      e &&
        !f &&
        ((n = p[0] / xe),
        (i = p[1] / xe),
        (o = p[2] / xe),
        (l = ((u = Math.max(n, i, o)) + (h = Math.min(n, i, o))) / 2),
        u === h
          ? (s = a = 0)
          : ((c = u - h),
            (a = l > 0.5 ? c / (2 - u - h) : c / (u + h)),
            (s =
              u === n
                ? (i - o) / c + (i < o ? 6 : 0)
                : u === i
                ? (o - n) / c + 2
                : (n - i) / c + 4),
            (s *= 60)),
        (p[0] = ~~(s + 0.5)),
        (p[1] = ~~(100 * a + 0.5)),
        (p[2] = ~~(100 * l + 0.5))),
      r && p.length < 4 && (p[3] = 1),
      p
    );
  },
  Me = function (t) {
    var e = [],
      r = [],
      n = -1;
    return (
      t.split(Oe).forEach(function (t) {
        var i = t.match(U) || [];
        e.push.apply(e, i), r.push((n += i.length + 1));
      }),
      (e.c = r),
      e
    );
  },
  ke = function (t, e, r) {
    var n,
      i,
      o,
      s,
      a = "",
      l = (t + a).match(Oe),
      u = e ? "hsla(" : "rgba(",
      h = 0;
    if (!l) return t;
    if (
      ((l = l.map(function (t) {
        return (
          (t = be(t, e, 1)) &&
          u +
            (e ? t[0] + "," + t[1] + "%," + t[2] + "%," + t[3] : t.join(",")) +
            ")"
        );
      })),
      r && ((o = Me(t)), (n = r.c).join(a) !== o.c.join(a)))
    )
      for (s = (i = t.replace(Oe, "1").split(U)).length - 1; h < s; h++)
        a +=
          i[h] +
          (~n.indexOf(h)
            ? l.shift() || u + "0,0,0,0)"
            : (o.length ? o : l.length ? l : r).shift());
    if (!i) for (s = (i = t.split(Oe)).length - 1; h < s; h++) a += i[h] + l[h];
    return a + i[s];
  },
  Oe = (function () {
    var t,
      e =
        "(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b";
    for (t in we) e += "|" + t + "\\b";
    return new RegExp(e + ")", "gi");
  })(),
  Ce = /hsl[a]?\(/,
  Ee = function (t) {
    var e,
      r = t.join(" ");
    if (((Oe.lastIndex = 0), Oe.test(r)))
      return (
        (e = Ce.test(r)),
        (t[1] = ke(t[1], e)),
        (t[0] = ke(t[0], e, Me(t[1]))),
        !0
      );
  },
  De = (function () {
    var t,
      e,
      r,
      n,
      i,
      o,
      s = Date.now,
      a = 500,
      l = 33,
      p = s(),
      d = p,
      m = 1e3 / 240,
      _ = m,
      v = [],
      y = function r(u) {
        var h,
          c,
          f,
          g,
          y = s() - d,
          x = !0 === u;
        if (
          ((y > a || y < 0) && (p += y - l),
          ((h = (f = (d += y) - p) - _) > 0 || x) &&
            ((g = ++n.frame),
            (i = f - 1e3 * n.time),
            (n.time = f /= 1e3),
            (_ += h + (h >= m ? 4 : m - h)),
            (c = 1)),
          x || (t = e(r)),
          c)
        )
          for (o = 0; o < v.length; o++) v[o](f, i, g, u);
      };
    return (n = {
      time: 0,
      frame: 0,
      tick: function () {
        y(!0);
      },
      deltaRatio: function (t) {
        return i / (1e3 / (t || 60));
      },
      wake: function () {
        f &&
          (!h &&
            N() &&
            ((u = h = window),
            (c = u.document || {}),
            (K.gsap = Er),
            (u.gsapVersions || (u.gsapVersions = [])).push(Er.version),
            Q($ || u.GreenSockGlobals || (!u.gsap && u) || {}),
            ve.forEach(ye)),
          (r =
            "undefined" != typeof requestAnimationFrame &&
            requestAnimationFrame),
          t && n.sleep(),
          (e =
            r ||
            function (t) {
              return setTimeout(t, (_ - 1e3 * n.time + 1) | 0);
            }),
          (g = 1),
          y(2));
      },
      sleep: function () {
        (r ? cancelAnimationFrame : clearTimeout)(t), (g = 0), (e = et);
      },
      lagSmoothing: function (t, e) {
        (a = t || 1 / 0), (l = Math.min(e || 33, a));
      },
      fps: function (t) {
        (m = 1e3 / (t || 240)), (_ = 1e3 * n.time + m);
      },
      add: function (t, e, r) {
        var i = e
          ? function (e, r, o, s) {
              t(e, r, o, s), n.remove(i);
            }
          : t;
        return n.remove(t), v[r ? "unshift" : "push"](i), Se(), i;
      },
      remove: function (t, e) {
        ~(e = v.indexOf(t)) && v.splice(e, 1) && o >= e && o--;
      },
      _listeners: v,
    });
  })(),
  Se = function () {
    return !g && De.wake();
  },
  Pe = {},
  Ae = /^[\d.\-M][\d.\-,\s]/,
  Re = /["']/g,
  Le = function (t) {
    for (
      var e,
        r,
        n,
        i = {},
        o = t.substr(1, t.length - 3).split(":"),
        s = o[0],
        a = 1,
        l = o.length;
      a < l;
      a++
    )
      (r = o[a]),
        (e = a !== l - 1 ? r.lastIndexOf(",") : r.length),
        (n = r.substr(0, e)),
        (i[s] = isNaN(n) ? n.replace(Re, "").trim() : +n),
        (s = r.substr(e + 1).trim());
    return i;
  },
  Xe = function (t) {
    return function (e) {
      return 1 - t(1 - e);
    };
  },
  Ye = function t(e, r) {
    for (var n, i = e._first; i; )
      i instanceof Ue
        ? t(i, r)
        : !i.vars.yoyoEase ||
          (i._yoyo && i._repeat) ||
          i._yoyo === r ||
          (i.timeline
            ? t(i.timeline, r)
            : ((n = i._ease),
              (i._ease = i._yEase),
              (i._yEase = n),
              (i._yoyo = r))),
        (i = i._next);
  },
  Fe = function (t, e) {
    return (
      (t &&
        (R(t)
          ? t
          : Pe[t] ||
            (function (t) {
              var e,
                r,
                n,
                i,
                o = (t + "").split("("),
                s = Pe[o[0]];
              return s && o.length > 1 && s.config
                ? s.config.apply(
                    null,
                    ~t.indexOf("{")
                      ? [Le(o[1])]
                      : ((e = t),
                        (r = e.indexOf("(") + 1),
                        (n = e.indexOf(")")),
                        (i = e.indexOf("(", r)),
                        e.substring(r, ~i && i < n ? e.indexOf(")", n + 1) : n))
                          .split(",")
                          .map(Mt)
                  )
                : Pe._CE && Ae.test(t)
                ? Pe._CE("", t)
                : s;
            })(t))) ||
      e
    );
  },
  Ne = function (t, e, r, n) {
    void 0 === r &&
      (r = function (t) {
        return 1 - e(1 - t);
      }),
      void 0 === n &&
        (n = function (t) {
          return t < 0.5 ? e(2 * t) / 2 : 1 - e(2 * (1 - t)) / 2;
        });
    var i,
      o = { easeIn: e, easeOut: r, easeInOut: n };
    return (
      mt(t, function (t) {
        for (var e in ((Pe[t] = K[t] = o), (Pe[(i = t.toLowerCase())] = r), o))
          Pe[
            i + ("easeIn" === e ? ".in" : "easeOut" === e ? ".out" : ".inOut")
          ] = Pe[t + "." + e] = o[e];
      }),
      o
    );
  },
  ze = function (t) {
    return function (e) {
      return e < 0.5 ? (1 - t(1 - 2 * e)) / 2 : 0.5 + t(2 * (e - 0.5)) / 2;
    };
  },
  Be = function t(e, r, n) {
    var i = r >= 1 ? r : 1,
      o = (n || (e ? 0.3 : 0.45)) / (r < 1 ? r : 1),
      s = (o / O) * (Math.asin(1 / i) || 0),
      a = function (t) {
        return 1 === t ? 1 : i * Math.pow(2, -10 * t) * P((t - s) * o) + 1;
      },
      l =
        "out" === e
          ? a
          : "in" === e
          ? function (t) {
              return 1 - a(1 - t);
            }
          : ze(a);
    return (
      (o = O / o),
      (l.config = function (r, n) {
        return t(e, r, n);
      }),
      l
    );
  },
  Ie = function t(e, r) {
    void 0 === r && (r = 1.70158);
    var n = function (t) {
        return t ? --t * t * ((r + 1) * t + r) + 1 : 0;
      },
      i =
        "out" === e
          ? n
          : "in" === e
          ? function (t) {
              return 1 - n(1 - t);
            }
          : ze(n);
    return (
      (i.config = function (r) {
        return t(e, r);
      }),
      i
    );
  };
mt("Linear,Quad,Cubic,Quart,Quint,Strong", function (t, e) {
  var r = e < 5 ? e + 1 : e;
  Ne(
    t + ",Power" + (r - 1),
    e
      ? function (t) {
          return Math.pow(t, r);
        }
      : function (t) {
          return t;
        },
    function (t) {
      return 1 - Math.pow(1 - t, r);
    },
    function (t) {
      return t < 0.5
        ? Math.pow(2 * t, r) / 2
        : 1 - Math.pow(2 * (1 - t), r) / 2;
    }
  );
}),
  (Pe.Linear.easeNone = Pe.none = Pe.Linear.easeIn),
  Ne("Elastic", Be("in"), Be("out"), Be()),
  (m = 7.5625),
  (y = 2 * (v = 1 / (_ = 2.75))),
  (x = 2.5 * v),
  Ne(
    "Bounce",
    function (t) {
      return 1 - w(1 - t);
    },
    (w = function (t) {
      return t < v
        ? m * t * t
        : t < y
        ? m * Math.pow(t - 1.5 / _, 2) + 0.75
        : t < x
        ? m * (t -= 2.25 / _) * t + 0.9375
        : m * Math.pow(t - 2.625 / _, 2) + 0.984375;
    })
  ),
  Ne("Expo", function (t) {
    return Math.pow(2, 10 * (t - 1)) * t + t * t * t * t * t * t * (1 - t);
  }),
  Ne("Circ", function (t) {
    return -(D(1 - t * t) - 1);
  }),
  Ne("Sine", function (t) {
    return 1 === t ? 1 : 1 - S(t * C);
  }),
  Ne("Back", Ie("in"), Ie("out"), Ie()),
  (Pe.SteppedEase =
    Pe.steps =
    K.SteppedEase =
      {
        config: function (t, e) {
          void 0 === t && (t = 1);
          var r = 1 / t,
            n = t + (e ? 0 : 1),
            i = e ? 1 : 0;
          return function (t) {
            return (((n * te(0, 0.99999999, t)) | 0) + i) * r;
          };
        },
      }),
  (b.ease = Pe["quad.out"]),
  mt(
    "onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt",
    function (t) {
      return (ft += t + "," + t + "Params,");
    }
  );
var He = function (t, e) {
    (this.id = E++),
      (t._gsap = this),
      (this.target = t),
      (this.harness = e),
      (this.get = e ? e.get : gt),
      (this.set = e ? e.getSetter : sr);
  },
  We = (function () {
    function t(t) {
      (this.vars = t),
        (this._delay = +t.delay || 0),
        (this._repeat = t.repeat === 1 / 0 ? -2 : t.repeat || 0) &&
          ((this._rDelay = t.repeatDelay || 0),
          (this._yoyo = !!t.yoyo || !!t.yoyoEase)),
        (this._ts = 1),
        Gt(this, +t.duration, 1, 1),
        (this.data = t.data),
        a && ((this._ctx = a), a.data.push(this)),
        g || De.wake();
    }
    var e = t.prototype;
    return (
      (e.delay = function (t) {
        return t || 0 === t
          ? (this.parent &&
              this.parent.smoothChildTiming &&
              this.startTime(this._start + t - this._delay),
            (this._delay = t),
            this)
          : this._delay;
      }),
      (e.duration = function (t) {
        return arguments.length
          ? this.totalDuration(
              this._repeat > 0 ? t + (t + this._rDelay) * this._repeat : t
            )
          : this.totalDuration() && this._dur;
      }),
      (e.totalDuration = function (t) {
        return arguments.length
          ? ((this._dirty = 0),
            Gt(
              this,
              this._repeat < 0
                ? t
                : (t - this._repeat * this._rDelay) / (this._repeat + 1)
            ))
          : this._tDur;
      }),
      (e.totalTime = function (t, e) {
        if ((Se(), !arguments.length)) return this._tTime;
        var r = this._dp;
        if (r && r.smoothChildTiming && this._ts) {
          for (It(this, t), !r._dp || r.parent || Ht(r, this); r && r.parent; )
            r.parent._time !==
              r._start +
                (r._ts >= 0
                  ? r._tTime / r._ts
                  : (r.totalDuration() - r._tTime) / -r._ts) &&
              r.totalTime(r._tTime, !0),
              (r = r.parent);
          !this.parent &&
            this._dp.autoRemoveChildren &&
            ((this._ts > 0 && t < this._tDur) ||
              (this._ts < 0 && t > 0) ||
              (!this._tDur && !t)) &&
            Wt(this._dp, this, this._start - this._delay);
        }
        return (
          (this._tTime !== t ||
            (!this._dur && !e) ||
            (this._initted && Math.abs(this._zTime) === k) ||
            (!t && !this._initted && (this.add || this._ptLookup))) &&
            (this._ts || (this._pTime = t), bt(this, t, e)),
          this
        );
      }),
      (e.time = function (t, e) {
        return arguments.length
          ? this.totalTime(
              Math.min(this.totalDuration(), t + Ft(this)) %
                (this._dur + this._rDelay) || (t ? this._dur : 0),
              e
            )
          : this._time;
      }),
      (e.totalProgress = function (t, e) {
        return arguments.length
          ? this.totalTime(this.totalDuration() * t, e)
          : this.totalDuration()
          ? Math.min(1, this._tTime / this._tDur)
          : this.rawTime() >= 0 && this._initted
          ? 1
          : 0;
      }),
      (e.progress = function (t, e) {
        return arguments.length
          ? this.totalTime(
              this.duration() *
                (!this._yoyo || 1 & this.iteration() ? t : 1 - t) +
                Ft(this),
              e
            )
          : this.duration()
          ? Math.min(1, this._time / this._dur)
          : this.rawTime() > 0
          ? 1
          : 0;
      }),
      (e.iteration = function (t, e) {
        var r = this.duration() + this._rDelay;
        return arguments.length
          ? this.totalTime(this._time + (t - 1) * r, e)
          : this._repeat
          ? Nt(this._tTime, r) + 1
          : 1;
      }),
      (e.timeScale = function (t, e) {
        if (!arguments.length) return -1e-8 === this._rts ? 0 : this._rts;
        if (this._rts === t) return this;
        var r =
          this.parent && this._ts ? zt(this.parent._time, this) : this._tTime;
        return (
          (this._rts = +t || 0),
          (this._ts = this._ps || -1e-8 === t ? 0 : this._rts),
          this.totalTime(
            te(-Math.abs(this._delay), this.totalDuration(), r),
            !1 !== e
          ),
          Bt(this),
          (function (t) {
            for (var e = t.parent; e && e.parent; )
              (e._dirty = 1), e.totalDuration(), (e = e.parent);
            return t;
          })(this)
        );
      }),
      (e.paused = function (t) {
        return arguments.length
          ? (this._ps !== t &&
              ((this._ps = t),
              t
                ? ((this._pTime =
                    this._tTime || Math.max(-this._delay, this.rawTime())),
                  (this._ts = this._act = 0))
                : (Se(),
                  (this._ts = this._rts),
                  this.totalTime(
                    this.parent && !this.parent.smoothChildTiming
                      ? this.rawTime()
                      : this._tTime || this._pTime,
                    1 === this.progress() &&
                      Math.abs(this._zTime) !== k &&
                      (this._tTime -= k)
                  ))),
            this)
          : this._ps;
      }),
      (e.startTime = function (t) {
        if (arguments.length) {
          this._start = t;
          var e = this.parent || this._dp;
          return (
            e && (e._sort || !this.parent) && Wt(e, this, t - this._delay), this
          );
        }
        return this._start;
      }),
      (e.endTime = function (t) {
        return (
          this._start +
          (F(t) ? this.totalDuration() : this.duration()) /
            Math.abs(this._ts || 1)
        );
      }),
      (e.rawTime = function (t) {
        var e = this.parent || this._dp;
        return e
          ? t &&
            (!this._ts ||
              (this._repeat && this._time && this.totalProgress() < 1))
            ? this._tTime % (this._dur + this._rDelay)
            : this._ts
            ? zt(e.rawTime(t), this)
            : this._tTime
          : this._tTime;
      }),
      (e.revert = function (t) {
        void 0 === t && (t = it);
        var e = s;
        return (
          (s = t),
          Tt(this) &&
            (this.timeline && this.timeline.revert(t),
            this.totalTime(-0.01, t.suppressEvents)),
          "nested" !== this.data && !1 !== t.kill && this.kill(),
          (s = e),
          this
        );
      }),
      (e.globalTime = function (t) {
        for (var e = this, r = arguments.length ? t : e.rawTime(); e; )
          (r = e._start + r / (Math.abs(e._ts) || 1)), (e = e._dp);
        return !this.parent && this._sat ? this._sat.globalTime(t) : r;
      }),
      (e.repeat = function (t) {
        return arguments.length
          ? ((this._repeat = t === 1 / 0 ? -2 : t), Kt(this))
          : -2 === this._repeat
          ? 1 / 0
          : this._repeat;
      }),
      (e.repeatDelay = function (t) {
        if (arguments.length) {
          var e = this._time;
          return (this._rDelay = t), Kt(this), e ? this.time(e) : this;
        }
        return this._rDelay;
      }),
      (e.yoyo = function (t) {
        return arguments.length ? ((this._yoyo = t), this) : this._yoyo;
      }),
      (e.seek = function (t, e) {
        return this.totalTime(Qt(this, t), F(e));
      }),
      (e.restart = function (t, e) {
        return (
          this.play().totalTime(t ? -this._delay : 0, F(e)),
          this._dur || (this._zTime = -1e-8),
          this
        );
      }),
      (e.play = function (t, e) {
        return null != t && this.seek(t, e), this.reversed(!1).paused(!1);
      }),
      (e.reverse = function (t, e) {
        return (
          null != t && this.seek(t || this.totalDuration(), e),
          this.reversed(!0).paused(!1)
        );
      }),
      (e.pause = function (t, e) {
        return null != t && this.seek(t, e), this.paused(!0);
      }),
      (e.resume = function () {
        return this.paused(!1);
      }),
      (e.reversed = function (t) {
        return arguments.length
          ? (!!t !== this.reversed() &&
              this.timeScale(-this._rts || (t ? -1e-8 : 0)),
            this)
          : this._rts < 0;
      }),
      (e.invalidate = function () {
        return (this._initted = this._act = 0), (this._zTime = -1e-8), this;
      }),
      (e.isActive = function () {
        var t,
          e = this.parent || this._dp,
          r = this._start;
        return !(
          e &&
          !(
            this._ts &&
            this._initted &&
            e.isActive() &&
            (t = e.rawTime(!0)) >= r &&
            t < this.endTime(!0) - k
          )
        );
      }),
      (e.eventCallback = function (t, e, r) {
        var n = this.vars;
        return arguments.length > 1
          ? (e
              ? ((n[t] = e),
                r && (n[t + "Params"] = r),
                "onUpdate" === t && (this._onUpdate = e))
              : delete n[t],
            this)
          : n[t];
      }),
      (e.then = function (t) {
        var e = this;
        return new Promise(function (r) {
          var n = R(t) ? t : kt,
            i = function () {
              var t = e.then;
              (e.then = null),
                R(n) && (n = n(e)) && (n.then || n === e) && (e.then = t),
                r(n),
                (e.then = t);
            };
          (e._initted && 1 === e.totalProgress() && e._ts >= 0) ||
          (!e._tTime && e._ts < 0)
            ? i()
            : (e._prom = i);
        });
      }),
      (e.kill = function () {
        _e(this);
      }),
      t
    );
  })();
Ot(We.prototype, {
  _time: 0,
  _start: 0,
  _end: 0,
  _tTime: 0,
  _tDur: 0,
  _dirty: 0,
  _repeat: 0,
  _yoyo: !1,
  parent: null,
  _initted: !1,
  _rDelay: 0,
  _ts: 1,
  _dp: 0,
  ratio: 0,
  _zTime: -1e-8,
  _prom: 0,
  _ps: !1,
  _rts: 1,
});
var Ue = (function (t) {
  function e(e, r) {
    var i;
    return (
      void 0 === e && (e = {}),
      ((i = t.call(this, e) || this).labels = {}),
      (i.smoothChildTiming = !!e.smoothChildTiming),
      (i.autoRemoveChildren = !!e.autoRemoveChildren),
      (i._sort = F(e.sortChildren)),
      l && Wt(e.parent || l, n(i), r),
      e.reversed && i.reverse(),
      e.paused && i.paused(!0),
      e.scrollTrigger && Ut(n(i), e.scrollTrigger),
      i
    );
  }
  i(e, t);
  var r = e.prototype;
  return (
    (r.to = function (t, e, r) {
      return Zt(0, arguments, this), this;
    }),
    (r.from = function (t, e, r) {
      return Zt(1, arguments, this), this;
    }),
    (r.fromTo = function (t, e, r, n) {
      return Zt(2, arguments, this), this;
    }),
    (r.set = function (t, e, r) {
      return (
        (e.duration = 0),
        (e.parent = this),
        St(e).repeatDelay || (e.repeat = 0),
        (e.immediateRender = !!e.immediateRender),
        new er(t, e, Qt(this, r), 1),
        this
      );
    }),
    (r.call = function (t, e, r) {
      return Wt(this, er.delayedCall(0, t, e), r);
    }),
    (r.staggerTo = function (t, e, r, n, i, o, s) {
      return (
        (r.duration = e),
        (r.stagger = r.stagger || n),
        (r.onComplete = o),
        (r.onCompleteParams = s),
        (r.parent = this),
        new er(t, r, Qt(this, i)),
        this
      );
    }),
    (r.staggerFrom = function (t, e, r, n, i, o, s) {
      return (
        (r.runBackwards = 1),
        (St(r).immediateRender = F(r.immediateRender)),
        this.staggerTo(t, e, r, n, i, o, s)
      );
    }),
    (r.staggerFromTo = function (t, e, r, n, i, o, s, a) {
      return (
        (n.startAt = r),
        (St(n).immediateRender = F(n.immediateRender)),
        this.staggerTo(t, e, n, i, o, s, a)
      );
    }),
    (r.render = function (t, e, r) {
      var n,
        i,
        o,
        a,
        u,
        h,
        c,
        f,
        p,
        d,
        g,
        m,
        _ = this._time,
        v = this._dirty ? this.totalDuration() : this._tDur,
        y = this._dur,
        x = t <= 0 ? 0 : vt(t),
        w = this._zTime < 0 != t < 0 && (this._initted || !y);
      if (
        (this !== l && x > v && t >= 0 && (x = v), x !== this._tTime || r || w)
      ) {
        if (
          (_ !== this._time &&
            y &&
            ((x += this._time - _), (t += this._time - _)),
          (n = x),
          (p = this._start),
          (h = !(f = this._ts)),
          w && (y || (_ = this._zTime), (t || !e) && (this._zTime = t)),
          this._repeat)
        ) {
          if (
            ((g = this._yoyo),
            (u = y + this._rDelay),
            this._repeat < -1 && t < 0)
          )
            return this.totalTime(100 * u + t, e, r);
          if (
            ((n = vt(x % u)),
            x === v
              ? ((a = this._repeat), (n = y))
              : ((a = ~~(d = vt(x / u))) && a === d && ((n = y), a--),
                n > y && (n = y)),
            (d = Nt(this._tTime, u)),
            !_ &&
              this._tTime &&
              d !== a &&
              this._tTime - d * u - this._dur <= 0 &&
              (d = a),
            g && 1 & a && ((n = y - n), (m = 1)),
            a !== d && !this._lock)
          ) {
            var T = g && 1 & d,
              b = T === (g && 1 & a);
            if (
              (a < d && (T = !T),
              (_ = T ? 0 : x % y ? y : x),
              (this._lock = 1),
              (this.render(_ || (m ? 0 : vt(a * u)), e, !y)._lock = 0),
              (this._tTime = x),
              !e && this.parent && me(this, "onRepeat"),
              this.vars.repeatRefresh && !m && (this.invalidate()._lock = 1),
              (_ && _ !== this._time) ||
                h !== !this._ts ||
                (this.vars.onRepeat && !this.parent && !this._act))
            )
              return this;
            if (
              ((y = this._dur),
              (v = this._tDur),
              b &&
                ((this._lock = 2),
                (_ = T ? y : -1e-4),
                this.render(_, !0),
                this.vars.repeatRefresh && !m && this.invalidate()),
              (this._lock = 0),
              !this._ts && !h)
            )
              return this;
            Ye(this, m);
          }
        }
        if (
          (this._hasPause &&
            !this._forcing &&
            this._lock < 2 &&
            ((c = (function (t, e, r) {
              var n;
              if (r > e)
                for (n = t._first; n && n._start <= r; ) {
                  if ("isPause" === n.data && n._start > e) return n;
                  n = n._next;
                }
              else
                for (n = t._last; n && n._start >= r; ) {
                  if ("isPause" === n.data && n._start < e) return n;
                  n = n._prev;
                }
            })(this, vt(_), vt(n))),
            c && (x -= n - (n = c._start))),
          (this._tTime = x),
          (this._time = n),
          (this._act = !f),
          this._initted ||
            ((this._onUpdate = this.vars.onUpdate),
            (this._initted = 1),
            (this._zTime = t),
            (_ = 0)),
          !_ && x && !e && !d && (me(this, "onStart"), this._tTime !== x))
        )
          return this;
        if (n >= _ && t >= 0)
          for (i = this._first; i; ) {
            if (
              ((o = i._next), (i._act || n >= i._start) && i._ts && c !== i)
            ) {
              if (i.parent !== this) return this.render(t, e, r);
              if (
                (i.render(
                  i._ts > 0
                    ? (n - i._start) * i._ts
                    : (i._dirty ? i.totalDuration() : i._tDur) +
                        (n - i._start) * i._ts,
                  e,
                  r
                ),
                n !== this._time || (!this._ts && !h))
              ) {
                (c = 0), o && (x += this._zTime = -1e-8);
                break;
              }
            }
            i = o;
          }
        else {
          i = this._last;
          for (var M = t < 0 ? t : n; i; ) {
            if (((o = i._prev), (i._act || M <= i._end) && i._ts && c !== i)) {
              if (i.parent !== this) return this.render(t, e, r);
              if (
                (i.render(
                  i._ts > 0
                    ? (M - i._start) * i._ts
                    : (i._dirty ? i.totalDuration() : i._tDur) +
                        (M - i._start) * i._ts,
                  e,
                  r || (s && Tt(i))
                ),
                n !== this._time || (!this._ts && !h))
              ) {
                (c = 0), o && (x += this._zTime = M ? -1e-8 : k);
                break;
              }
            }
            i = o;
          }
        }
        if (
          c &&
          !e &&
          (this.pause(),
          (c.render(n >= _ ? 0 : -1e-8)._zTime = n >= _ ? 1 : -1),
          this._ts)
        )
          return (this._start = p), Bt(this), this.render(t, e, r);
        this._onUpdate && !e && me(this, "onUpdate", !0),
          ((x === v && this._tTime >= this.totalDuration()) || (!x && _)) &&
            ((p !== this._start && Math.abs(f) === Math.abs(this._ts)) ||
              this._lock ||
              ((t || !y) &&
                ((x === v && this._ts > 0) || (!x && this._ts < 0)) &&
                Rt(this, 1),
              e ||
                (t < 0 && !_) ||
                (!x && !_ && v) ||
                (me(
                  this,
                  x === v && t >= 0 ? "onComplete" : "onReverseComplete",
                  !0
                ),
                this._prom &&
                  !(x < v && this.timeScale() > 0) &&
                  this._prom())));
      }
      return this;
    }),
    (r.add = function (t, e) {
      var r = this;
      if ((L(e) || (e = Qt(this, e, t)), !(t instanceof We))) {
        if (I(t))
          return (
            t.forEach(function (t) {
              return r.add(t, e);
            }),
            this
          );
        if (A(t)) return this.addLabel(t, e);
        if (!R(t)) return this;
        t = er.delayedCall(0, t);
      }
      return this !== t ? Wt(this, t, e) : this;
    }),
    (r.getChildren = function (t, e, r, n) {
      void 0 === t && (t = !0),
        void 0 === e && (e = !0),
        void 0 === r && (r = !0),
        void 0 === n && (n = -1e8);
      for (var i = [], o = this._first; o; )
        o._start >= n &&
          (o instanceof er
            ? e && i.push(o)
            : (r && i.push(o), t && i.push.apply(i, o.getChildren(!0, e, r)))),
          (o = o._next);
      return i;
    }),
    (r.getById = function (t) {
      for (var e = this.getChildren(1, 1, 1), r = e.length; r--; )
        if (e[r].vars.id === t) return e[r];
    }),
    (r.remove = function (t) {
      return A(t)
        ? this.removeLabel(t)
        : R(t)
        ? this.killTweensOf(t)
        : (t.parent === this && At(this, t),
          t === this._recent && (this._recent = this._last),
          Lt(this));
    }),
    (r.totalTime = function (e, r) {
      return arguments.length
        ? ((this._forcing = 1),
          !this._dp &&
            this._ts &&
            (this._start = vt(
              De.time -
                (this._ts > 0
                  ? e / this._ts
                  : (this.totalDuration() - e) / -this._ts)
            )),
          t.prototype.totalTime.call(this, e, r),
          (this._forcing = 0),
          this)
        : this._tTime;
    }),
    (r.addLabel = function (t, e) {
      return (this.labels[t] = Qt(this, e)), this;
    }),
    (r.removeLabel = function (t) {
      return delete this.labels[t], this;
    }),
    (r.addPause = function (t, e, r) {
      var n = er.delayedCall(0, e || et, r);
      return (
        (n.data = "isPause"), (this._hasPause = 1), Wt(this, n, Qt(this, t))
      );
    }),
    (r.removePause = function (t) {
      var e = this._first;
      for (t = Qt(this, t); e; )
        e._start === t && "isPause" === e.data && Rt(e), (e = e._next);
    }),
    (r.killTweensOf = function (t, e, r) {
      for (var n = this.getTweensOf(t, r), i = n.length; i--; )
        Ve !== n[i] && n[i].kill(t, e);
      return this;
    }),
    (r.getTweensOf = function (t, e) {
      for (var r, n = [], i = oe(t), o = this._first, s = L(e); o; )
        o instanceof er
          ? xt(o._targets, i) &&
            (s
              ? (!Ve || (o._initted && o._ts)) &&
                o.globalTime(0) <= e &&
                o.globalTime(o.totalDuration()) > e
              : !e || o.isActive()) &&
            n.push(o)
          : (r = o.getTweensOf(i, e)).length && n.push.apply(n, r),
          (o = o._next);
      return n;
    }),
    (r.tweenTo = function (t, e) {
      e = e || {};
      var r,
        n = this,
        i = Qt(n, t),
        o = e,
        s = o.startAt,
        a = o.onStart,
        l = o.onStartParams,
        u = o.immediateRender,
        h = er.to(
          n,
          Ot(
            {
              ease: e.ease || "none",
              lazy: !1,
              immediateRender: !1,
              time: i,
              overwrite: "auto",
              duration:
                e.duration ||
                Math.abs(
                  (i - (s && "time" in s ? s.time : n._time)) / n.timeScale()
                ) ||
                k,
              onStart: function () {
                if ((n.pause(), !r)) {
                  var t =
                    e.duration ||
                    Math.abs(
                      (i - (s && "time" in s ? s.time : n._time)) /
                        n.timeScale()
                    );
                  h._dur !== t && Gt(h, t, 0, 1).render(h._time, !0, !0),
                    (r = 1);
                }
                a && a.apply(h, l || []);
              },
            },
            e
          )
        );
      return u ? h.render(0) : h;
    }),
    (r.tweenFromTo = function (t, e, r) {
      return this.tweenTo(e, Ot({ startAt: { time: Qt(this, t) } }, r));
    }),
    (r.recent = function () {
      return this._recent;
    }),
    (r.nextLabel = function (t) {
      return void 0 === t && (t = this._time), ge(this, Qt(this, t));
    }),
    (r.previousLabel = function (t) {
      return void 0 === t && (t = this._time), ge(this, Qt(this, t), 1);
    }),
    (r.currentLabel = function (t) {
      return arguments.length
        ? this.seek(t, !0)
        : this.previousLabel(this._time + k);
    }),
    (r.shiftChildren = function (t, e, r) {
      void 0 === r && (r = 0);
      for (var n, i = this._first, o = this.labels; i; )
        i._start >= r && ((i._start += t), (i._end += t)), (i = i._next);
      if (e) for (n in o) o[n] >= r && (o[n] += t);
      return Lt(this);
    }),
    (r.invalidate = function (e) {
      var r = this._first;
      for (this._lock = 0; r; ) r.invalidate(e), (r = r._next);
      return t.prototype.invalidate.call(this, e);
    }),
    (r.clear = function (t) {
      void 0 === t && (t = !0);
      for (var e, r = this._first; r; ) (e = r._next), this.remove(r), (r = e);
      return (
        this._dp && (this._time = this._tTime = this._pTime = 0),
        t && (this.labels = {}),
        Lt(this)
      );
    }),
    (r.totalDuration = function (t) {
      var e,
        r,
        n,
        i = 0,
        o = this,
        s = o._last,
        a = M;
      if (arguments.length)
        return o.timeScale(
          (o._repeat < 0 ? o.duration() : o.totalDuration()) /
            (o.reversed() ? -t : t)
        );
      if (o._dirty) {
        for (n = o.parent; s; )
          (e = s._prev),
            s._dirty && s.totalDuration(),
            (r = s._start) > a && o._sort && s._ts && !o._lock
              ? ((o._lock = 1), (Wt(o, s, r - s._delay, 1)._lock = 0))
              : (a = r),
            r < 0 &&
              s._ts &&
              ((i -= r),
              ((!n && !o._dp) || (n && n.smoothChildTiming)) &&
                ((o._start += r / o._ts), (o._time -= r), (o._tTime -= r)),
              o.shiftChildren(-r, !1, -Infinity),
              (a = 0)),
            s._end > i && s._ts && (i = s._end),
            (s = e);
        Gt(o, o === l && o._time > i ? o._time : i, 1, 1), (o._dirty = 0);
      }
      return o._tDur;
    }),
    (e.updateRoot = function (t) {
      if ((l._ts && (bt(l, zt(t, l)), (p = De.frame)), De.frame >= ht)) {
        ht += T.autoSleep || 120;
        var e = l._first;
        if ((!e || !e._ts) && T.autoSleep && De._listeners.length < 2) {
          for (; e && !e._ts; ) e = e._next;
          e || De.sleep();
        }
      }
    }),
    e
  );
})(We);
Ot(Ue.prototype, { _lock: 0, _hasPause: 0, _forcing: 0 });
var Ve,
  qe,
  je = function (t, e, r, n, i, o, s) {
    var a,
      l,
      u,
      h,
      c,
      f,
      p,
      d,
      g = new gr(this._pt, t, e, 0, 1, ur, null, i),
      m = 0,
      _ = 0;
    for (
      g.b = r,
        g.e = n,
        r += "",
        (p = ~(n += "").indexOf("random(")) && (n = pe(n)),
        o && (o((d = [r, n]), t, e), (r = d[0]), (n = d[1])),
        l = r.match(V) || [];
      (a = V.exec(n));

    )
      (h = a[0]),
        (c = n.substring(m, a.index)),
        u ? (u = (u + 1) % 5) : "rgba(" === c.substr(-5) && (u = 1),
        h !== l[_++] &&
          ((f = parseFloat(l[_ - 1]) || 0),
          (g._pt = {
            _next: g._pt,
            p: c || 1 === _ ? c : ",",
            s: f,
            c: "=" === h.charAt(1) ? yt(f, h) - f : parseFloat(h) - f,
            m: u && u < 4 ? Math.round : 0,
          }),
          (m = V.lastIndex));
    return (
      (g.c = m < n.length ? n.substring(m, n.length) : ""),
      (g.fp = s),
      (q.test(n) || p) && (g.e = 0),
      (this._pt = g),
      g
    );
  },
  Ge = function (t, e, r, n, i, o, s, a, l, u) {
    R(n) && (n = n(i || 0, t, o));
    var h,
      c = t[e],
      f =
        "get" !== r
          ? r
          : R(c)
          ? l
            ? t[
                e.indexOf("set") || !R(t["get" + e.substr(3)])
                  ? e
                  : "get" + e.substr(3)
              ](l)
            : t[e]()
          : c,
      p = R(c) ? (l ? ir : nr) : rr;
    if (
      (A(n) &&
        (~n.indexOf("random(") && (n = pe(n)),
        "=" === n.charAt(1) &&
          ((h = yt(f, n) + (ee(f) || 0)) || 0 === h) &&
          (n = h)),
      !u || f !== n || qe)
    )
      return isNaN(f * n) || "" === n
        ? je.call(this, t, e, f, n, p, a || T.stringFilter, l)
        : ((h = new gr(
            this._pt,
            t,
            e,
            +f || 0,
            n - (f || 0),
            "boolean" == typeof c ? lr : ar,
            0,
            p
          )),
          l && (h.fp = l),
          s && h.modifier(s, this, t),
          (this._pt = h));
  },
  Ke = function (t, e, r, n, i, o) {
    var s, a, l, u;
    if (
      lt[t] &&
      !1 !==
        (s = new lt[t]()).init(
          i,
          s.rawVars
            ? e[t]
            : (function (t, e, r, n, i) {
                if (
                  (R(t) && (t = Ze(t, i, e, r, n)),
                  !Y(t) || (t.style && t.nodeType) || I(t) || B(t))
                )
                  return A(t) ? Ze(t, i, e, r, n) : t;
                var o,
                  s = {};
                for (o in t) s[o] = Ze(t[o], i, e, r, n);
                return s;
              })(e[t], n, i, o, r),
          r,
          n,
          o
        ) &&
      ((r._pt = a = new gr(r._pt, i, t, 0, 1, s.render, s, 0, s.priority)),
      r !== d)
    )
      for (l = r._ptLookup[r._targets.indexOf(i)], u = s._props.length; u--; )
        l[s._props[u]] = a;
    return s;
  },
  $e = function t(e, r, n) {
    var i,
      a,
      u,
      h,
      c,
      f,
      p,
      d,
      g,
      m,
      _,
      v,
      y,
      x = e.vars,
      w = x.ease,
      T = x.startAt,
      O = x.immediateRender,
      C = x.lazy,
      E = x.onUpdate,
      D = x.runBackwards,
      S = x.yoyoEase,
      P = x.keyframes,
      A = x.autoRevert,
      R = e._dur,
      L = e._startAt,
      X = e._targets,
      Y = e.parent,
      N = Y && "nested" === Y.data ? Y.vars.targets : X,
      z = "auto" === e._overwrite && !o,
      B = e.timeline;
    if (
      (B && (!P || !w) && (w = "none"),
      (e._ease = Fe(w, b.ease)),
      (e._yEase = S ? Xe(Fe(!0 === S ? w : S, b.ease)) : 0),
      S &&
        e._yoyo &&
        !e._repeat &&
        ((S = e._yEase), (e._yEase = e._ease), (e._ease = S)),
      (e._from = !B && !!x.runBackwards),
      !B || (P && !x.stagger))
    ) {
      if (
        ((v = (d = X[0] ? dt(X[0]).harness : 0) && x[d.prop]),
        (i = Dt(x, ot)),
        L &&
          (L._zTime < 0 && L.progress(1),
          r < 0 && D && O && !A ? L.render(-1, !0) : L.revert(D && R ? nt : rt),
          (L._lazy = 0)),
        T)
      ) {
        if (
          (Rt(
            (e._startAt = er.set(
              X,
              Ot(
                {
                  data: "isStart",
                  overwrite: !1,
                  parent: Y,
                  immediateRender: !0,
                  lazy: !L && F(C),
                  startAt: null,
                  delay: 0,
                  onUpdate:
                    E &&
                    function () {
                      return me(e, "onUpdate");
                    },
                  stagger: 0,
                },
                T
              )
            ))
          ),
          (e._startAt._dp = 0),
          (e._startAt._sat = e),
          r < 0 && (s || (!O && !A)) && e._startAt.revert(nt),
          O && R && r <= 0 && n <= 0)
        )
          return void (r && (e._zTime = r));
      } else if (D && R && !L)
        if (
          (r && (O = !1),
          (u = Ot(
            {
              overwrite: !1,
              data: "isFromStart",
              lazy: O && !L && F(C),
              immediateRender: O,
              stagger: 0,
              parent: Y,
            },
            i
          )),
          v && (u[d.prop] = v),
          Rt((e._startAt = er.set(X, u))),
          (e._startAt._dp = 0),
          (e._startAt._sat = e),
          r < 0 && (s ? e._startAt.revert(nt) : e._startAt.render(-1, !0)),
          (e._zTime = r),
          O)
        ) {
          if (!r) return;
        } else t(e._startAt, k, k);
      for (
        e._pt = e._ptCache = 0, C = (R && F(C)) || (C && !R), a = 0;
        a < X.length;
        a++
      ) {
        if (
          ((p = (c = X[a])._gsap || pt(X)[a]._gsap),
          (e._ptLookup[a] = m = {}),
          at[p.id] && st.length && wt(),
          (_ = N === X ? a : N.indexOf(c)),
          d &&
            !1 !== (g = new d()).init(c, v || i, e, _, N) &&
            ((e._pt = h =
              new gr(e._pt, c, g.name, 0, 1, g.render, g, 0, g.priority)),
            g._props.forEach(function (t) {
              m[t] = h;
            }),
            g.priority && (f = 1)),
          !d || v)
        )
          for (u in i)
            lt[u] && (g = Ke(u, i, e, _, c, N))
              ? g.priority && (f = 1)
              : (m[u] = h =
                  Ge.call(e, c, u, "get", i[u], _, N, 0, x.stringFilter));
        e._op && e._op[a] && e.kill(c, e._op[a]),
          z &&
            e._pt &&
            ((Ve = e),
            l.killTweensOf(c, m, e.globalTime(r)),
            (y = !e.parent),
            (Ve = 0)),
          e._pt && C && (at[p.id] = 1);
      }
      f && dr(e), e._onInit && e._onInit(e);
    }
    (e._onUpdate = E),
      (e._initted = (!e._op || e._pt) && !y),
      P && r <= 0 && B.render(M, !0, !0);
  },
  Qe = function (t, e, r, n) {
    var i,
      o,
      s = e.ease || n || "power1.inOut";
    if (I(e))
      (o = r[t] || (r[t] = [])),
        e.forEach(function (t, r) {
          return o.push({ t: (r / (e.length - 1)) * 100, v: t, e: s });
        });
    else
      for (i in e)
        (o = r[i] || (r[i] = [])),
          "ease" === i || o.push({ t: parseFloat(t), v: e[i], e: s });
  },
  Ze = function (t, e, r, n, i) {
    return R(t)
      ? t.call(e, r, n, i)
      : A(t) && ~t.indexOf("random(")
      ? pe(t)
      : t;
  },
  Je = ft + "repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,autoRevert",
  tr = {};
mt(Je + ",id,stagger,delay,duration,paused,scrollTrigger", function (t) {
  return (tr[t] = 1);
});
var er = (function (t) {
  function e(e, r, i, s) {
    var a;
    "number" == typeof r && ((i.duration = r), (r = i), (i = null));
    var u,
      h,
      c,
      f,
      p,
      d,
      g,
      m,
      _ = (a = t.call(this, s ? r : St(r)) || this).vars,
      v = _.duration,
      y = _.delay,
      x = _.immediateRender,
      w = _.stagger,
      b = _.overwrite,
      M = _.keyframes,
      k = _.defaults,
      O = _.scrollTrigger,
      C = _.yoyoEase,
      E = r.parent || l,
      D = (I(e) || B(e) ? L(e[0]) : "length" in r) ? [e] : oe(e);
    if (
      ((a._targets = D.length ? pt(D) : J(0, !T.nullTargetWarn) || []),
      (a._ptLookup = []),
      (a._overwrite = b),
      M || w || z(v) || z(y))
    ) {
      if (
        ((r = a.vars),
        (u = a.timeline =
          new Ue({
            data: "nested",
            defaults: k || {},
            targets: E && "nested" === E.data ? E.vars.targets : D,
          })).kill(),
        (u.parent = u._dp = n(a)),
        (u._start = 0),
        w || z(v) || z(y))
      ) {
        if (((f = D.length), (g = w && le(w)), Y(w)))
          for (p in w) ~Je.indexOf(p) && (m || (m = {}), (m[p] = w[p]));
        for (h = 0; h < f; h++)
          ((c = Dt(r, tr)).stagger = 0),
            C && (c.yoyoEase = C),
            m && Ct(c, m),
            (d = D[h]),
            (c.duration = +Ze(v, n(a), h, d, D)),
            (c.delay = (+Ze(y, n(a), h, d, D) || 0) - a._delay),
            !w &&
              1 === f &&
              c.delay &&
              ((a._delay = y = c.delay), (a._start += y), (c.delay = 0)),
            u.to(d, c, g ? g(h, d, D) : 0),
            (u._ease = Pe.none);
        u.duration() ? (v = y = 0) : (a.timeline = 0);
      } else if (M) {
        St(Ot(u.vars.defaults, { ease: "none" })),
          (u._ease = Fe(M.ease || r.ease || "none"));
        var S,
          P,
          A,
          R = 0;
        if (I(M))
          M.forEach(function (t) {
            return u.to(D, t, ">");
          }),
            u.duration();
        else {
          for (p in ((c = {}), M))
            "ease" === p || "easeEach" === p || Qe(p, M[p], c, M.easeEach);
          for (p in c)
            for (
              S = c[p].sort(function (t, e) {
                return t.t - e.t;
              }),
                R = 0,
                h = 0;
              h < S.length;
              h++
            )
              ((A = {
                ease: (P = S[h]).e,
                duration: ((P.t - (h ? S[h - 1].t : 0)) / 100) * v,
              })[p] = P.v),
                u.to(D, A, R),
                (R += A.duration);
          u.duration() < v && u.to({}, { duration: v - u.duration() });
        }
      }
      v || a.duration((v = u.duration()));
    } else a.timeline = 0;
    return (
      !0 !== b || o || ((Ve = n(a)), l.killTweensOf(D), (Ve = 0)),
      Wt(E, n(a), i),
      r.reversed && a.reverse(),
      r.paused && a.paused(!0),
      (x ||
        (!v &&
          !M &&
          a._start === vt(E._time) &&
          F(x) &&
          Yt(n(a)) &&
          "nested" !== E.data)) &&
        ((a._tTime = -1e-8), a.render(Math.max(0, -y) || 0)),
      O && Ut(n(a), O),
      a
    );
  }
  i(e, t);
  var r = e.prototype;
  return (
    (r.render = function (t, e, r) {
      var n,
        i,
        o,
        a,
        l,
        u,
        h,
        c,
        f,
        p = this._time,
        d = this._tDur,
        g = this._dur,
        m = t < 0,
        _ = t > d - k && !m ? d : t < k ? 0 : t;
      if (g) {
        if (
          _ !== this._tTime ||
          !t ||
          r ||
          (!this._initted && this._tTime) ||
          (this._startAt && this._zTime < 0 !== m) ||
          this._lazy
        ) {
          if (((n = _), (c = this.timeline), this._repeat)) {
            if (((a = g + this._rDelay), this._repeat < -1 && m))
              return this.totalTime(100 * a + t, e, r);
            if (
              ((n = vt(_ % a)),
              _ === d
                ? ((o = this._repeat), (n = g))
                : (o = ~~(l = vt(_ / a))) && o === l
                ? ((n = g), o--)
                : n > g && (n = g),
              (u = this._yoyo && 1 & o) && ((f = this._yEase), (n = g - n)),
              (l = Nt(this._tTime, a)),
              n === p && !r && this._initted && o === l)
            )
              return (this._tTime = _), this;
            o !== l &&
              (c && this._yEase && Ye(c, u),
              this.vars.repeatRefresh &&
                !u &&
                !this._lock &&
                n !== a &&
                this._initted &&
                ((this._lock = r = 1),
                (this.render(vt(a * o), !0).invalidate()._lock = 0)));
          }
          if (!this._initted) {
            if (Vt(this, m ? t : n, r, e, _)) return (this._tTime = 0), this;
            if (
              !(p === this._time || (r && this.vars.repeatRefresh && o !== l))
            )
              return this;
            if (g !== this._dur) return this.render(t, e, r);
          }
          if (
            ((this._tTime = _),
            (this._time = n),
            !this._act && this._ts && ((this._act = 1), (this._lazy = 0)),
            (this.ratio = h = (f || this._ease)(n / g)),
            this._from && (this.ratio = h = 1 - h),
            !p && _ && !e && !l && (me(this, "onStart"), this._tTime !== _))
          )
            return this;
          for (i = this._pt; i; ) i.r(h, i.d), (i = i._next);
          (c && c.render(t < 0 ? t : c._dur * c._ease(n / this._dur), e, r)) ||
            (this._startAt && (this._zTime = t)),
            this._onUpdate &&
              !e &&
              (m && Xt(this, t, 0, r), me(this, "onUpdate")),
            this._repeat &&
              o !== l &&
              this.vars.onRepeat &&
              !e &&
              this.parent &&
              me(this, "onRepeat"),
            (_ !== this._tDur && _) ||
              this._tTime !== _ ||
              (m && !this._onUpdate && Xt(this, t, 0, !0),
              (t || !g) &&
                ((_ === this._tDur && this._ts > 0) || (!_ && this._ts < 0)) &&
                Rt(this, 1),
              e ||
                (m && !p) ||
                !(_ || p || u) ||
                (me(this, _ === d ? "onComplete" : "onReverseComplete", !0),
                this._prom &&
                  !(_ < d && this.timeScale() > 0) &&
                  this._prom()));
        }
      } else
        !(function (t, e, r, n) {
          var i,
            o,
            a,
            l = t.ratio,
            u =
              e < 0 ||
              (!e &&
                ((!t._start && qt(t) && (t._initted || !jt(t))) ||
                  ((t._ts < 0 || t._dp._ts < 0) && !jt(t))))
                ? 0
                : 1,
            h = t._rDelay,
            c = 0;
          if (
            (h &&
              t._repeat &&
              ((c = te(0, t._tDur, e)),
              (o = Nt(c, h)),
              t._yoyo && 1 & o && (u = 1 - u),
              o !== Nt(t._tTime, h) &&
                ((l = 1 - u),
                t.vars.repeatRefresh && t._initted && t.invalidate())),
            u !== l || s || n || t._zTime === k || (!e && t._zTime))
          ) {
            if (!t._initted && Vt(t, e, n, r, c)) return;
            for (
              a = t._zTime,
                t._zTime = e || (r ? k : 0),
                r || (r = e && !a),
                t.ratio = u,
                t._from && (u = 1 - u),
                t._time = 0,
                t._tTime = c,
                i = t._pt;
              i;

            )
              i.r(u, i.d), (i = i._next);
            e < 0 && Xt(t, e, 0, !0),
              t._onUpdate && !r && me(t, "onUpdate"),
              c && t._repeat && !r && t.parent && me(t, "onRepeat"),
              (e >= t._tDur || e < 0) &&
                t.ratio === u &&
                (u && Rt(t, 1),
                r ||
                  s ||
                  (me(t, u ? "onComplete" : "onReverseComplete", !0),
                  t._prom && t._prom()));
          } else t._zTime || (t._zTime = e);
        })(this, t, e, r);
      return this;
    }),
    (r.targets = function () {
      return this._targets;
    }),
    (r.invalidate = function (e) {
      return (
        (!e || !this.vars.runBackwards) && (this._startAt = 0),
        (this._pt = this._op = this._onUpdate = this._lazy = this.ratio = 0),
        (this._ptLookup = []),
        this.timeline && this.timeline.invalidate(e),
        t.prototype.invalidate.call(this, e)
      );
    }),
    (r.resetTo = function (t, e, r, n, i) {
      g || De.wake(), this._ts || this.play();
      var o = Math.min(this._dur, (this._dp._time - this._start) * this._ts);
      return (
        this._initted || $e(this, o),
        (function (t, e, r, n, i, o, s, a) {
          var l,
            u,
            h,
            c,
            f = ((t._pt && t._ptCache) || (t._ptCache = {}))[e];
          if (!f)
            for (
              f = t._ptCache[e] = [], h = t._ptLookup, c = t._targets.length;
              c--;

            ) {
              if ((l = h[c][e]) && l.d && l.d._pt)
                for (l = l.d._pt; l && l.p !== e && l.fp !== e; ) l = l._next;
              if (!l)
                return (
                  (qe = 1), (t.vars[e] = "+=0"), $e(t, s), (qe = 0), a ? J() : 1
                );
              f.push(l);
            }
          for (c = f.length; c--; )
            ((l = (u = f[c])._pt || u).s =
              (!n && 0 !== n) || i ? l.s + (n || 0) + o * l.c : n),
              (l.c = r - l.s),
              u.e && (u.e = _t(r) + ee(u.e)),
              u.b && (u.b = l.s + ee(u.b));
        })(this, t, e, r, n, this._ease(o / this._dur), o, i)
          ? this.resetTo(t, e, r, n, 1)
          : (It(this, 0),
            this.parent ||
              Pt(
                this._dp,
                this,
                "_first",
                "_last",
                this._dp._sort ? "_start" : 0
              ),
            this.render(0))
      );
    }),
    (r.kill = function (t, e) {
      if ((void 0 === e && (e = "all"), !(t || (e && "all" !== e))))
        return (
          (this._lazy = this._pt = 0),
          this.parent
            ? _e(this)
            : this.scrollTrigger && this.scrollTrigger.kill(!!s),
          this
        );
      if (this.timeline) {
        var r = this.timeline.totalDuration();
        return (
          this.timeline.killTweensOf(t, e, Ve && !0 !== Ve.vars.overwrite)
            ._first || _e(this),
          this.parent &&
            r !== this.timeline.totalDuration() &&
            Gt(this, (this._dur * this.timeline._tDur) / r, 0, 1),
          this
        );
      }
      var n,
        i,
        o,
        a,
        l,
        u,
        h,
        c = this._targets,
        f = t ? oe(t) : c,
        p = this._ptLookup,
        d = this._pt;
      if (
        (!e || "all" === e) &&
        (function (t, e) {
          for (
            var r = t.length, n = r === e.length;
            n && r-- && t[r] === e[r];

          );
          return r < 0;
        })(c, f)
      )
        return "all" === e && (this._pt = 0), _e(this);
      for (
        n = this._op = this._op || [],
          "all" !== e &&
            (A(e) &&
              ((l = {}),
              mt(e, function (t) {
                return (l[t] = 1);
              }),
              (e = l)),
            (e = (function (t, e) {
              var r,
                n,
                i,
                o,
                s = t[0] ? dt(t[0]).harness : 0,
                a = s && s.aliases;
              if (!a) return e;
              for (n in ((r = Ct({}, e)), a))
                if ((n in r))
                  for (i = (o = a[n].split(",")).length; i--; ) r[o[i]] = r[n];
              return r;
            })(c, e))),
          h = c.length;
        h--;

      )
        if (~f.indexOf(c[h]))
          for (l in ((i = p[h]),
          "all" === e
            ? ((n[h] = e), (a = i), (o = {}))
            : ((o = n[h] = n[h] || {}), (a = e)),
          a))
            (u = i && i[l]) &&
              (("kill" in u.d && !0 !== u.d.kill(l)) || At(this, u, "_pt"),
              delete i[l]),
              "all" !== o && (o[l] = 1);
      return this._initted && !this._pt && d && _e(this), this;
    }),
    (e.to = function (t, r) {
      return new e(t, r, arguments[2]);
    }),
    (e.from = function (t, e) {
      return Zt(1, arguments);
    }),
    (e.delayedCall = function (t, r, n, i) {
      return new e(r, 0, {
        immediateRender: !1,
        lazy: !1,
        overwrite: !1,
        delay: t,
        onComplete: r,
        onReverseComplete: r,
        onCompleteParams: n,
        onReverseCompleteParams: n,
        callbackScope: i,
      });
    }),
    (e.fromTo = function (t, e, r) {
      return Zt(2, arguments);
    }),
    (e.set = function (t, r) {
      return (r.duration = 0), r.repeatDelay || (r.repeat = 0), new e(t, r);
    }),
    (e.killTweensOf = function (t, e, r) {
      return l.killTweensOf(t, e, r);
    }),
    e
  );
})(We);
Ot(er.prototype, { _targets: [], _lazy: 0, _startAt: 0, _op: 0, _onInit: 0 }),
  mt("staggerTo,staggerFrom,staggerFromTo", function (t) {
    er[t] = function () {
      var e = new Ue(),
        r = re.call(arguments, 0);
      return r.splice("staggerFromTo" === t ? 5 : 4, 0, 0), e[t].apply(e, r);
    };
  });
var rr = function (t, e, r) {
    return (t[e] = r);
  },
  nr = function (t, e, r) {
    return t[e](r);
  },
  ir = function (t, e, r, n) {
    return t[e](n.fp, r);
  },
  or = function (t, e, r) {
    return t.setAttribute(e, r);
  },
  sr = function (t, e) {
    return R(t[e]) ? nr : X(t[e]) && t.setAttribute ? or : rr;
  },
  ar = function (t, e) {
    return e.set(e.t, e.p, Math.round(1e6 * (e.s + e.c * t)) / 1e6, e);
  },
  lr = function (t, e) {
    return e.set(e.t, e.p, !!(e.s + e.c * t), e);
  },
  ur = function (t, e) {
    var r = e._pt,
      n = "";
    if (!t && e.b) n = e.b;
    else if (1 === t && e.e) n = e.e;
    else {
      for (; r; )
        (n =
          r.p +
          (r.m ? r.m(r.s + r.c * t) : Math.round(1e4 * (r.s + r.c * t)) / 1e4) +
          n),
          (r = r._next);
      n += e.c;
    }
    e.set(e.t, e.p, n, e);
  },
  hr = function (t, e) {
    for (var r = e._pt; r; ) r.r(t, r.d), (r = r._next);
  },
  cr = function (t, e, r, n) {
    for (var i, o = this._pt; o; )
      (i = o._next), o.p === n && o.modifier(t, e, r), (o = i);
  },
  fr = function (t) {
    for (var e, r, n = this._pt; n; )
      (r = n._next),
        (n.p === t && !n.op) || n.op === t
          ? At(this, n, "_pt")
          : n.dep || (e = 1),
        (n = r);
    return !e;
  },
  pr = function (t, e, r, n) {
    n.mSet(t, e, n.m.call(n.tween, r, n.mt), n);
  },
  dr = function (t) {
    for (var e, r, n, i, o = t._pt; o; ) {
      for (e = o._next, r = n; r && r.pr > o.pr; ) r = r._next;
      (o._prev = r ? r._prev : i) ? (o._prev._next = o) : (n = o),
        (o._next = r) ? (r._prev = o) : (i = o),
        (o = e);
    }
    t._pt = n;
  },
  gr = (function () {
    function t(t, e, r, n, i, o, s, a, l) {
      (this.t = e),
        (this.s = n),
        (this.c = i),
        (this.p = r),
        (this.r = o || ar),
        (this.d = s || this),
        (this.set = a || rr),
        (this.pr = l || 0),
        (this._next = t),
        t && (t._prev = this);
    }
    return (
      (t.prototype.modifier = function (t, e, r) {
        (this.mSet = this.mSet || this.set),
          (this.set = pr),
          (this.m = t),
          (this.mt = r),
          (this.tween = e);
      }),
      t
    );
  })();
mt(
  ft +
    "parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger",
  function (t) {
    return (ot[t] = 1);
  }
),
  (K.TweenMax = K.TweenLite = er),
  (K.TimelineLite = K.TimelineMax = Ue),
  (l = new Ue({
    sortChildren: !1,
    defaults: b,
    autoRemoveChildren: !0,
    id: "root",
    smoothChildTiming: !0,
  })),
  (T.stringFilter = Ee);
var mr = [],
  _r = {},
  vr = [],
  yr = 0,
  xr = 0,
  wr = function (t) {
    return (_r[t] || vr).map(function (t) {
      return t();
    });
  },
  Tr = function () {
    var t = Date.now(),
      e = [];
    t - yr > 2 &&
      (wr("matchMediaInit"),
      mr.forEach(function (t) {
        var r,
          n,
          i,
          o,
          s = t.queries,
          a = t.conditions;
        for (n in s)
          (r = u.matchMedia(s[n]).matches) && (i = 1),
            r !== a[n] && ((a[n] = r), (o = 1));
        o && (t.revert(), i && e.push(t));
      }),
      wr("matchMediaRevert"),
      e.forEach(function (t) {
        return t.onMatch(t, function (e) {
          return t.add(null, e);
        });
      }),
      (yr = t),
      wr("matchMedia"));
  },
  br = (function () {
    function t(t, e) {
      (this.selector = e && se(e)),
        (this.data = []),
        (this._r = []),
        (this.isReverted = !1),
        (this.id = xr++),
        t && this.add(t);
    }
    var e = t.prototype;
    return (
      (e.add = function (t, e, r) {
        R(t) && ((r = e), (e = t), (t = R));
        var n = this,
          i = function () {
            var t,
              i = a,
              o = n.selector;
            return (
              i && i !== n && i.data.push(n),
              r && (n.selector = se(r)),
              (a = n),
              (t = e.apply(n, arguments)),
              R(t) && n._r.push(t),
              (a = i),
              (n.selector = o),
              (n.isReverted = !1),
              t
            );
          };
        return (
          (n.last = i),
          t === R
            ? i(n, function (t) {
                return n.add(null, t);
              })
            : t
            ? (n[t] = i)
            : i
        );
      }),
      (e.ignore = function (t) {
        var e = a;
        (a = null), t(this), (a = e);
      }),
      (e.getTweens = function () {
        var e = [];
        return (
          this.data.forEach(function (r) {
            return r instanceof t
              ? e.push.apply(e, r.getTweens())
              : r instanceof er &&
                  !(r.parent && "nested" === r.parent.data) &&
                  e.push(r);
          }),
          e
        );
      }),
      (e.clear = function () {
        this._r.length = this.data.length = 0;
      }),
      (e.kill = function (t, e) {
        var r = this;
        if (
          (t
            ? (function () {
                for (var e, n = r.getTweens(), i = r.data.length; i--; )
                  "isFlip" === (e = r.data[i]).data &&
                    (e.revert(),
                    e.getChildren(!0, !0, !1).forEach(function (t) {
                      return n.splice(n.indexOf(t), 1);
                    }));
                for (
                  n
                    .map(function (t) {
                      return {
                        g:
                          t._dur ||
                          t._delay ||
                          (t._sat && !t._sat.vars.immediateRender)
                            ? t.globalTime(0)
                            : -1 / 0,
                        t: t,
                      };
                    })
                    .sort(function (t, e) {
                      return e.g - t.g || -1 / 0;
                    })
                    .forEach(function (e) {
                      return e.t.revert(t);
                    }),
                    i = r.data.length;
                  i--;

                )
                  (e = r.data[i]) instanceof Ue
                    ? "nested" !== e.data &&
                      (e.scrollTrigger && e.scrollTrigger.revert(), e.kill())
                    : !(e instanceof er) && e.revert && e.revert(t);
                r._r.forEach(function (e) {
                  return e(t, r);
                }),
                  (r.isReverted = !0);
              })()
            : this.data.forEach(function (t) {
                return t.kill && t.kill();
              }),
          this.clear(),
          e)
        )
          for (var n = mr.length; n--; )
            mr[n].id === this.id && mr.splice(n, 1);
      }),
      (e.revert = function (t) {
        this.kill(t || {});
      }),
      t
    );
  })(),
  Mr = (function () {
    function t(t) {
      (this.contexts = []), (this.scope = t), a && a.data.push(this);
    }
    var e = t.prototype;
    return (
      (e.add = function (t, e, r) {
        Y(t) || (t = { matches: t });
        var n,
          i,
          o,
          s = new br(0, r || this.scope),
          l = (s.conditions = {});
        for (i in (a && !s.selector && (s.selector = a.selector),
        this.contexts.push(s),
        (e = s.add("onMatch", e)),
        (s.queries = t),
        t))
          "all" === i
            ? (o = 1)
            : (n = u.matchMedia(t[i])) &&
              (mr.indexOf(s) < 0 && mr.push(s),
              (l[i] = n.matches) && (o = 1),
              n.addListener
                ? n.addListener(Tr)
                : n.addEventListener("change", Tr));
        return (
          o &&
            e(s, function (t) {
              return s.add(null, t);
            }),
          this
        );
      }),
      (e.revert = function (t) {
        this.kill(t || {});
      }),
      (e.kill = function (t) {
        this.contexts.forEach(function (e) {
          return e.kill(t, !0);
        });
      }),
      t
    );
  })(),
  kr = {
    registerPlugin: function () {
      for (var t = arguments.length, e = new Array(t), r = 0; r < t; r++)
        e[r] = arguments[r];
      e.forEach(function (t) {
        return ye(t);
      });
    },
    timeline: function (t) {
      return new Ue(t);
    },
    getTweensOf: function (t, e) {
      return l.getTweensOf(t, e);
    },
    getProperty: function (t, e, r, n) {
      A(t) && (t = oe(t)[0]);
      var i = dt(t || {}).get,
        o = r ? kt : Mt;
      return (
        "native" === r && (r = ""),
        t
          ? e
            ? o(((lt[e] && lt[e].get) || i)(t, e, r, n))
            : function (e, r, n) {
                return o(((lt[e] && lt[e].get) || i)(t, e, r, n));
              }
          : t
      );
    },
    quickSetter: function (t, e, r) {
      if ((t = oe(t)).length > 1) {
        var n = t.map(function (t) {
            return Er.quickSetter(t, e, r);
          }),
          i = n.length;
        return function (t) {
          for (var e = i; e--; ) n[e](t);
        };
      }
      t = t[0] || {};
      var o = lt[e],
        s = dt(t),
        a = (s.harness && (s.harness.aliases || {})[e]) || e,
        l = o
          ? function (e) {
              var n = new o();
              (d._pt = 0),
                n.init(t, r ? e + r : e, d, 0, [t]),
                n.render(1, n),
                d._pt && hr(1, d);
            }
          : s.set(t, a);
      return o
        ? l
        : function (e) {
            return l(t, a, r ? e + r : e, s, 1);
          };
    },
    quickTo: function (t, e, r) {
      var n,
        i = Er.to(
          t,
          Ot(
            (((n = {})[e] = "+=0.1"), (n.paused = !0), (n.stagger = 0), n),
            r || {}
          )
        ),
        o = function (t, r, n) {
          return i.resetTo(e, t, r, n);
        };
      return (o.tween = i), o;
    },
    isTweening: function (t) {
      return l.getTweensOf(t, !0).length > 0;
    },
    defaults: function (t) {
      return t && t.ease && (t.ease = Fe(t.ease, b.ease)), Et(b, t || {});
    },
    config: function (t) {
      return Et(T, t || {});
    },
    registerEffect: function (t) {
      var e = t.name,
        r = t.effect,
        n = t.plugins,
        i = t.defaults,
        o = t.extendTimeline;
      (n || "").split(",").forEach(function (t) {
        return t && !lt[t] && !K[t] && J();
      }),
        (ut[e] = function (t, e, n) {
          return r(oe(t), Ot(e || {}, i), n);
        }),
        o &&
          (Ue.prototype[e] = function (t, r, n) {
            return this.add(ut[e](t, Y(r) ? r : (n = r) && {}, this), n);
          });
    },
    registerEase: function (t, e) {
      Pe[t] = Fe(e);
    },
    parseEase: function (t, e) {
      return arguments.length ? Fe(t, e) : Pe;
    },
    getById: function (t) {
      return l.getById(t);
    },
    exportRoot: function (t, e) {
      void 0 === t && (t = {});
      var r,
        n,
        i = new Ue(t);
      for (
        i.smoothChildTiming = F(t.smoothChildTiming),
          l.remove(i),
          i._dp = 0,
          i._time = i._tTime = l._time,
          r = l._first;
        r;

      )
        (n = r._next),
          (!e &&
            !r._dur &&
            r instanceof er &&
            r.vars.onComplete === r._targets[0]) ||
            Wt(i, r, r._start - r._delay),
          (r = n);
      return Wt(l, i, 0), i;
    },
    context: function (t, e) {
      return t ? new br(t, e) : a;
    },
    matchMedia: function (t) {
      return new Mr(t);
    },
    matchMediaRefresh: function () {
      return (
        mr.forEach(function (t) {
          var e,
            r,
            n = t.conditions;
          for (r in n) n[r] && ((n[r] = !1), (e = 1));
          e && t.revert();
        }) || Tr()
      );
    },
    addEventListener: function (t, e) {
      var r = _r[t] || (_r[t] = []);
      ~r.indexOf(e) || r.push(e);
    },
    removeEventListener: function (t, e) {
      var r = _r[t],
        n = r && r.indexOf(e);
      n >= 0 && r.splice(n, 1);
    },
    utils: {
      wrap: function t(e, r, n) {
        var i = r - e;
        return I(e)
          ? fe(e, t(0, e.length), r)
          : Jt(n, function (t) {
              return ((i + ((t - e) % i)) % i) + e;
            });
      },
      wrapYoyo: function t(e, r, n) {
        var i = r - e,
          o = 2 * i;
        return I(e)
          ? fe(e, t(0, e.length - 1), r)
          : Jt(n, function (t) {
              return e + ((t = (o + ((t - e) % o)) % o || 0) > i ? o - t : t);
            });
      },
      distribute: le,
      random: ce,
      snap: he,
      normalize: function (t, e, r) {
        return de(t, e, 0, 1, r);
      },
      getUnit: ee,
      clamp: function (t, e, r) {
        return Jt(r, function (r) {
          return te(t, e, r);
        });
      },
      splitColor: be,
      toArray: oe,
      selector: se,
      mapRange: de,
      pipe: function () {
        for (var t = arguments.length, e = new Array(t), r = 0; r < t; r++)
          e[r] = arguments[r];
        return function (t) {
          return e.reduce(function (t, e) {
            return e(t);
          }, t);
        };
      },
      unitize: function (t, e) {
        return function (r) {
          return t(parseFloat(r)) + (e || ee(r));
        };
      },
      interpolate: function t(e, r, n, i) {
        var o = isNaN(e + r)
          ? 0
          : function (t) {
              return (1 - t) * e + t * r;
            };
        if (!o) {
          var s,
            a,
            l,
            u,
            h,
            c = A(e),
            f = {};
          if ((!0 === n && (i = 1) && (n = null), c))
            (e = { p: e }), (r = { p: r });
          else if (I(e) && !I(r)) {
            for (l = [], u = e.length, h = u - 2, a = 1; a < u; a++)
              l.push(t(e[a - 1], e[a]));
            u--,
              (o = function (t) {
                t *= u;
                var e = Math.min(h, ~~t);
                return l[e](t - e);
              }),
              (n = r);
          } else i || (e = Ct(I(e) ? [] : {}, e));
          if (!l) {
            for (s in r) Ge.call(f, e, s, "get", r[s]);
            o = function (t) {
              return hr(t, f) || (c ? e.p : e);
            };
          }
        }
        return Jt(n, o);
      },
      shuffle: ae,
    },
    install: Q,
    effects: ut,
    ticker: De,
    updateRoot: Ue.updateRoot,
    plugins: lt,
    globalTimeline: l,
    core: {
      PropTween: gr,
      globals: tt,
      Tween: er,
      Timeline: Ue,
      Animation: We,
      getCache: dt,
      _removeLinkedListItem: At,
      reverting: function () {
        return s;
      },
      context: function (t) {
        return t && a && (a.data.push(t), (t._ctx = a)), a;
      },
      suppressOverwrites: function (t) {
        return (o = t);
      },
    },
  };
mt("to,from,fromTo,delayedCall,set,killTweensOf", function (t) {
  return (kr[t] = er[t]);
}),
  De.add(Ue.updateRoot),
  (d = kr.to({}, { duration: 0 }));
var Or = function (t, e) {
    for (var r = t._pt; r && r.p !== e && r.op !== e && r.fp !== e; )
      r = r._next;
    return r;
  },
  Cr = function (t, e) {
    return {
      name: t,
      headless: 1,
      rawVars: 1,
      init: function (t, r, n) {
        n._onInit = function (t) {
          var n, i;
          if (
            (A(r) &&
              ((n = {}),
              mt(r, function (t) {
                return (n[t] = 1);
              }),
              (r = n)),
            e)
          ) {
            for (i in ((n = {}), r)) n[i] = e(r[i]);
            r = n;
          }
          !(function (t, e) {
            var r,
              n,
              i,
              o = t._targets;
            for (r in e)
              for (n = o.length; n--; )
                (i = t._ptLookup[n][r]) &&
                  (i = i.d) &&
                  (i._pt && (i = Or(i, r)),
                  i && i.modifier && i.modifier(e[r], t, o[n], r));
          })(t, r);
        };
      },
    };
  },
  Er =
    kr.registerPlugin(
      {
        name: "attr",
        init: function (t, e, r, n, i) {
          var o, s, a;
          for (o in ((this.tween = r), e))
            (a = t.getAttribute(o) || ""),
              ((s = this.add(
                t,
                "setAttribute",
                (a || 0) + "",
                e[o],
                n,
                i,
                0,
                0,
                o
              )).op = o),
              (s.b = a),
              this._props.push(o);
        },
        render: function (t, e) {
          for (var r = e._pt; r; )
            s ? r.set(r.t, r.p, r.b, r) : r.r(t, r.d), (r = r._next);
        },
      },
      {
        name: "endArray",
        headless: 1,
        init: function (t, e) {
          for (var r = e.length; r--; )
            this.add(t, r, t[r] || 0, e[r], 0, 0, 0, 0, 0, 1);
        },
      },
      Cr("roundProps", ue),
      Cr("modifiers"),
      Cr("snap", he)
    ) || kr;
(er.version = Ue.version = Er.version = "3.13.0"),
  (f = 1),
  N() && Se(),
  Pe.Power0,
  Pe.Power1,
  Pe.Power2,
  Pe.Power3,
  Pe.Power4,
  Pe.Linear,
  Pe.Quad,
  Pe.Cubic,
  Pe.Quart,
  Pe.Quint,
  Pe.Strong,
  Pe.Elastic,
  Pe.Back,
  Pe.SteppedEase,
  Pe.Bounce,
  Pe.Sine,
  Pe.Expo,
  Pe.Circ;
var Dr,
  Sr,
  Pr,
  Ar,
  Rr,
  Lr,
  Xr,
  Yr,
  Fr = {},
  Nr = 180 / Math.PI,
  zr = Math.PI / 180,
  Br = Math.atan2,
  Ir = /([A-Z])/g,
  Hr = /(left|right|width|margin|padding|x)/i,
  Wr = /[\s,\(]\S/,
  Ur = {
    autoAlpha: "opacity,visibility",
    scale: "scaleX,scaleY",
    alpha: "opacity",
  },
  Vr = function (t, e) {
    return e.set(e.t, e.p, Math.round(1e4 * (e.s + e.c * t)) / 1e4 + e.u, e);
  },
  qr = function (t, e) {
    return e.set(
      e.t,
      e.p,
      1 === t ? e.e : Math.round(1e4 * (e.s + e.c * t)) / 1e4 + e.u,
      e
    );
  },
  jr = function (t, e) {
    return e.set(
      e.t,
      e.p,
      t ? Math.round(1e4 * (e.s + e.c * t)) / 1e4 + e.u : e.b,
      e
    );
  },
  Gr = function (t, e) {
    var r = e.s + e.c * t;
    e.set(e.t, e.p, ~~(r + (r < 0 ? -0.5 : 0.5)) + e.u, e);
  },
  Kr = function (t, e) {
    return e.set(e.t, e.p, t ? e.e : e.b, e);
  },
  $r = function (t, e) {
    return e.set(e.t, e.p, 1 !== t ? e.b : e.e, e);
  },
  Qr = function (t, e, r) {
    return (t.style[e] = r);
  },
  Zr = function (t, e, r) {
    return t.style.setProperty(e, r);
  },
  Jr = function (t, e, r) {
    return (t._gsap[e] = r);
  },
  tn = function (t, e, r) {
    return (t._gsap.scaleX = t._gsap.scaleY = r);
  },
  en = function (t, e, r, n, i) {
    var o = t._gsap;
    (o.scaleX = o.scaleY = r), o.renderTransform(i, o);
  },
  rn = function (t, e, r, n, i) {
    var o = t._gsap;
    (o[e] = r), o.renderTransform(i, o);
  },
  nn = "transform",
  on = nn + "Origin",
  sn = function t(e, r) {
    var n = this,
      i = this.target,
      o = i.style,
      s = i._gsap;
    if (e in Fr && o) {
      if (((this.tfm = this.tfm || {}), "transform" === e))
        return Ur.transform.split(",").forEach(function (e) {
          return t.call(n, e, r);
        });
      if (
        (~(e = Ur[e] || e).indexOf(",")
          ? e.split(",").forEach(function (t) {
              return (n.tfm[t] = Mn(i, t));
            })
          : (this.tfm[e] = s.x ? s[e] : Mn(i, e)),
        e === on && (this.tfm.zOrigin = s.zOrigin),
        this.props.indexOf(nn) >= 0)
      )
        return;
      s.svg &&
        ((this.svgo = i.getAttribute("data-svg-origin")),
        this.props.push(on, r, "")),
        (e = nn);
    }
    (o || r) && this.props.push(e, r, o[e]);
  },
  an = function (t) {
    t.translate &&
      (t.removeProperty("translate"),
      t.removeProperty("scale"),
      t.removeProperty("rotate"));
  },
  ln = function () {
    var t,
      e,
      r = this.props,
      n = this.target,
      i = n.style,
      o = n._gsap;
    for (t = 0; t < r.length; t += 3)
      r[t + 1]
        ? 2 === r[t + 1]
          ? n[r[t]](r[t + 2])
          : (n[r[t]] = r[t + 2])
        : r[t + 2]
        ? (i[r[t]] = r[t + 2])
        : i.removeProperty(
            "--" === r[t].substr(0, 2)
              ? r[t]
              : r[t].replace(Ir, "-$1").toLowerCase()
          );
    if (this.tfm) {
      for (e in this.tfm) o[e] = this.tfm[e];
      o.svg &&
        (o.renderTransform(),
        n.setAttribute("data-svg-origin", this.svgo || "")),
        ((t = Xr()) && t.isStart) ||
          i[nn] ||
          (an(i),
          o.zOrigin &&
            i[on] &&
            ((i[on] += " " + o.zOrigin + "px"),
            (o.zOrigin = 0),
            o.renderTransform()),
          (o.uncache = 1));
    }
  },
  un = function (t, e) {
    var r = { target: t, props: [], revert: ln, save: sn };
    return (
      t._gsap || Er.core.getCache(t),
      e &&
        t.style &&
        t.nodeType &&
        e.split(",").forEach(function (t) {
          return r.save(t);
        }),
      r
    );
  },
  hn = function (t, e) {
    var r = Sr.createElementNS
      ? Sr.createElementNS(
          (e || "http://www.w3.org/1999/xhtml").replace(/^https/, "http"),
          t
        )
      : Sr.createElement(t);
    return r && r.style ? r : Sr.createElement(t);
  },
  cn = function t(e, r, n) {
    var i = getComputedStyle(e);
    return (
      i[r] ||
      i.getPropertyValue(r.replace(Ir, "-$1").toLowerCase()) ||
      i.getPropertyValue(r) ||
      (!n && t(e, pn(r) || r, 1)) ||
      ""
    );
  },
  fn = "O,Moz,ms,Ms,Webkit".split(","),
  pn = function (t, e, r) {
    var n = (e || Rr).style,
      i = 5;
    if (t in n && !r) return t;
    for (
      t = t.charAt(0).toUpperCase() + t.substr(1);
      i-- && !(fn[i] + t in n);

    );
    return i < 0 ? null : (3 === i ? "ms" : i >= 0 ? fn[i] : "") + t;
  },
  dn = function () {
    "undefined" != typeof window &&
      window.document &&
      ((Dr = window),
      (Sr = Dr.document),
      (Pr = Sr.documentElement),
      (Rr = hn("div") || { style: {} }),
      hn("div"),
      (nn = pn(nn)),
      (on = nn + "Origin"),
      (Rr.style.cssText =
        "border-width:0;line-height:0;position:absolute;padding:0"),
      (Yr = !!pn("perspective")),
      (Xr = Er.core.reverting),
      (Ar = 1));
  },
  gn = function (t) {
    var e,
      r = t.ownerSVGElement,
      n = hn(
        "svg",
        (r && r.getAttribute("xmlns")) || "http://www.w3.org/2000/svg"
      ),
      i = t.cloneNode(!0);
    (i.style.display = "block"), n.appendChild(i), Pr.appendChild(n);
    try {
      e = i.getBBox();
    } catch (t) {}
    return n.removeChild(i), Pr.removeChild(n), e;
  },
  mn = function (t, e) {
    for (var r = e.length; r--; )
      if (t.hasAttribute(e[r])) return t.getAttribute(e[r]);
  },
  _n = function (t) {
    var e, r;
    try {
      e = t.getBBox();
    } catch (n) {
      (e = gn(t)), (r = 1);
    }
    return (
      (e && (e.width || e.height)) || r || (e = gn(t)),
      !e || e.width || e.x || e.y
        ? e
        : {
            x: +mn(t, ["x", "cx", "x1"]) || 0,
            y: +mn(t, ["y", "cy", "y1"]) || 0,
            width: 0,
            height: 0,
          }
    );
  },
  vn = function (t) {
    return !(!t.getCTM || (t.parentNode && !t.ownerSVGElement) || !_n(t));
  },
  yn = function (t, e) {
    if (e) {
      var r,
        n = t.style;
      e in Fr && e !== on && (e = nn),
        n.removeProperty
          ? (("ms" !== (r = e.substr(0, 2)) && "webkit" !== e.substr(0, 6)) ||
              (e = "-" + e),
            n.removeProperty(
              "--" === r ? e : e.replace(Ir, "-$1").toLowerCase()
            ))
          : n.removeAttribute(e);
    }
  },
  xn = function (t, e, r, n, i, o) {
    var s = new gr(t._pt, e, r, 0, 1, o ? $r : Kr);
    return (t._pt = s), (s.b = n), (s.e = i), t._props.push(r), s;
  },
  wn = { deg: 1, rad: 1, turn: 1 },
  Tn = { grid: 1, flex: 1 },
  bn = function t(e, r, n, i) {
    var o,
      s,
      a,
      l,
      u = parseFloat(n) || 0,
      h = (n + "").trim().substr((u + "").length) || "px",
      c = Rr.style,
      f = Hr.test(r),
      p = "svg" === e.tagName.toLowerCase(),
      d = (p ? "client" : "offset") + (f ? "Width" : "Height"),
      g = 100,
      m = "px" === i,
      _ = "%" === i;
    if (i === h || !u || wn[i] || wn[h]) return u;
    if (
      ("px" !== h && !m && (u = t(e, r, n, "px")),
      (l = e.getCTM && vn(e)),
      (_ || "%" === h) && (Fr[r] || ~r.indexOf("adius")))
    )
      return (
        (o = l ? e.getBBox()[f ? "width" : "height"] : e[d]),
        _t(_ ? (u / o) * g : (u / 100) * o)
      );
    if (
      ((c[f ? "width" : "height"] = g + (m ? h : i)),
      (s =
        ("rem" !== i && ~r.indexOf("adius")) ||
        ("em" === i && e.appendChild && !p)
          ? e
          : e.parentNode),
      l && (s = (e.ownerSVGElement || {}).parentNode),
      (s && s !== Sr && s.appendChild) || (s = Sr.body),
      (a = s._gsap) && _ && a.width && f && a.time === De.time && !a.uncache)
    )
      return _t((u / a.width) * g);
    if (!_ || ("height" !== r && "width" !== r))
      (_ || "%" === h) &&
        !Tn[cn(s, "display")] &&
        (c.position = cn(e, "position")),
        s === e && (c.position = "static"),
        s.appendChild(Rr),
        (o = Rr[d]),
        s.removeChild(Rr),
        (c.position = "absolute");
    else {
      var v = e.style[r];
      (e.style[r] = g + i), (o = e[d]), v ? (e.style[r] = v) : yn(e, r);
    }
    return (
      f && _ && (((a = dt(s)).time = De.time), (a.width = s[d])),
      _t(m ? (o * u) / g : o && u ? (g / o) * u : 0)
    );
  },
  Mn = function (t, e, r, n) {
    var i;
    return (
      Ar || dn(),
      e in Ur &&
        "transform" !== e &&
        ~(e = Ur[e]).indexOf(",") &&
        (e = e.split(",")[0]),
      Fr[e] && "transform" !== e
        ? ((i = Yn(t, n)),
          (i =
            "transformOrigin" !== e
              ? i[e]
              : i.svg
              ? i.origin
              : Fn(cn(t, on)) + " " + i.zOrigin + "px"))
        : (!(i = t.style[e]) ||
            "auto" === i ||
            n ||
            ~(i + "").indexOf("calc(")) &&
          (i =
            (Dn[e] && Dn[e](t, e, r)) ||
            cn(t, e) ||
            gt(t, e) ||
            ("opacity" === e ? 1 : 0)),
      r && !~(i + "").trim().indexOf(" ") ? bn(t, e, i, r) + r : i
    );
  },
  kn = function (t, e, r, n) {
    if (!r || "none" === r) {
      var i = pn(e, t, 1),
        o = i && cn(t, i, 1);
      o && o !== r
        ? ((e = i), (r = o))
        : "borderColor" === e && (r = cn(t, "borderTopColor"));
    }
    var s,
      a,
      l,
      u,
      h,
      c,
      f,
      p,
      d,
      g,
      m,
      _ = new gr(this._pt, t.style, e, 0, 1, ur),
      v = 0,
      y = 0;
    if (
      ((_.b = r),
      (_.e = n),
      (r += ""),
      "var(--" === (n += "").substring(0, 6) &&
        (n = cn(t, n.substring(4, n.indexOf(")")))),
      "auto" === n &&
        ((c = t.style[e]),
        (t.style[e] = n),
        (n = cn(t, e) || n),
        c ? (t.style[e] = c) : yn(t, e)),
      Ee((s = [r, n])),
      (n = s[1]),
      (l = (r = s[0]).match(U) || []),
      (n.match(U) || []).length)
    ) {
      for (; (a = U.exec(n)); )
        (f = a[0]),
          (d = n.substring(v, a.index)),
          h
            ? (h = (h + 1) % 5)
            : ("rgba(" !== d.substr(-5) && "hsla(" !== d.substr(-5)) || (h = 1),
          f !== (c = l[y++] || "") &&
            ((u = parseFloat(c) || 0),
            (m = c.substr((u + "").length)),
            "=" === f.charAt(1) && (f = yt(u, f) + m),
            (p = parseFloat(f)),
            (g = f.substr((p + "").length)),
            (v = U.lastIndex - g.length),
            g ||
              ((g = g || T.units[e] || m),
              v === n.length && ((n += g), (_.e += g))),
            m !== g && (u = bn(t, e, c, g) || 0),
            (_._pt = {
              _next: _._pt,
              p: d || 1 === y ? d : ",",
              s: u,
              c: p - u,
              m: (h && h < 4) || "zIndex" === e ? Math.round : 0,
            }));
      _.c = v < n.length ? n.substring(v, n.length) : "";
    } else _.r = "display" === e && "none" === n ? $r : Kr;
    return q.test(n) && (_.e = 0), (this._pt = _), _;
  },
  On = { top: "0%", bottom: "100%", left: "0%", right: "100%", center: "50%" },
  Cn = function (t) {
    var e = t.split(" "),
      r = e[0],
      n = e[1] || "50%";
    return (
      ("top" !== r && "bottom" !== r && "left" !== n && "right" !== n) ||
        ((t = r), (r = n), (n = t)),
      (e[0] = On[r] || r),
      (e[1] = On[n] || n),
      e.join(" ")
    );
  },
  En = function (t, e) {
    if (e.tween && e.tween._time === e.tween._dur) {
      var r,
        n,
        i,
        o = e.t,
        s = o.style,
        a = e.u,
        l = o._gsap;
      if ("all" === a || !0 === a) (s.cssText = ""), (n = 1);
      else
        for (i = (a = a.split(",")).length; --i > -1; )
          (r = a[i]),
            Fr[r] && ((n = 1), (r = "transformOrigin" === r ? on : nn)),
            yn(o, r);
      n &&
        (yn(o, nn),
        l &&
          (l.svg && o.removeAttribute("transform"),
          (s.scale = s.rotate = s.translate = "none"),
          Yn(o, 1),
          (l.uncache = 1),
          an(s)));
    }
  },
  Dn = {
    clearProps: function (t, e, r, n, i) {
      if ("isFromStart" !== i.data) {
        var o = (t._pt = new gr(t._pt, e, r, 0, 0, En));
        return (o.u = n), (o.pr = -10), (o.tween = i), t._props.push(r), 1;
      }
    },
  },
  Sn = [1, 0, 0, 1, 0, 0],
  Pn = {},
  An = function (t) {
    return "matrix(1, 0, 0, 1, 0, 0)" === t || "none" === t || !t;
  },
  Rn = function (t) {
    var e = cn(t, nn);
    return An(e) ? Sn : e.substr(7).match(W).map(_t);
  },
  Ln = function (t, e) {
    var r,
      n,
      i,
      o,
      s = t._gsap || dt(t),
      a = t.style,
      l = Rn(t);
    return s.svg && t.getAttribute("transform")
      ? "1,0,0,1,0,0" ===
        (l = [
          (i = t.transform.baseVal.consolidate().matrix).a,
          i.b,
          i.c,
          i.d,
          i.e,
          i.f,
        ]).join(",")
        ? Sn
        : l
      : (l !== Sn ||
          t.offsetParent ||
          t === Pr ||
          s.svg ||
          ((i = a.display),
          (a.display = "block"),
          ((r = t.parentNode) &&
            (t.offsetParent || t.getBoundingClientRect().width)) ||
            ((o = 1), (n = t.nextElementSibling), Pr.appendChild(t)),
          (l = Rn(t)),
          i ? (a.display = i) : yn(t, "display"),
          o &&
            (n
              ? r.insertBefore(t, n)
              : r
              ? r.appendChild(t)
              : Pr.removeChild(t))),
        e && l.length > 6 ? [l[0], l[1], l[4], l[5], l[12], l[13]] : l);
  },
  Xn = function (t, e, r, n, i, o) {
    var s,
      a,
      l,
      u = t._gsap,
      h = i || Ln(t, !0),
      c = u.xOrigin || 0,
      f = u.yOrigin || 0,
      p = u.xOffset || 0,
      d = u.yOffset || 0,
      g = h[0],
      m = h[1],
      _ = h[2],
      v = h[3],
      y = h[4],
      x = h[5],
      w = e.split(" "),
      T = parseFloat(w[0]) || 0,
      b = parseFloat(w[1]) || 0;
    r
      ? h !== Sn &&
        (a = g * v - m * _) &&
        ((l = T * (-m / a) + b * (g / a) - (g * x - m * y) / a),
        (T = T * (v / a) + b * (-_ / a) + (_ * x - v * y) / a),
        (b = l))
      : ((T = (s = _n(t)).x + (~w[0].indexOf("%") ? (T / 100) * s.width : T)),
        (b = s.y + (~(w[1] || w[0]).indexOf("%") ? (b / 100) * s.height : b))),
      n || (!1 !== n && u.smooth)
        ? ((y = T - c),
          (x = b - f),
          (u.xOffset = p + (y * g + x * _) - y),
          (u.yOffset = d + (y * m + x * v) - x))
        : (u.xOffset = u.yOffset = 0),
      (u.xOrigin = T),
      (u.yOrigin = b),
      (u.smooth = !!n),
      (u.origin = e),
      (u.originIsAbsolute = !!r),
      (t.style[on] = "0px 0px"),
      o &&
        (xn(o, u, "xOrigin", c, T),
        xn(o, u, "yOrigin", f, b),
        xn(o, u, "xOffset", p, u.xOffset),
        xn(o, u, "yOffset", d, u.yOffset)),
      t.setAttribute("data-svg-origin", T + " " + b);
  },
  Yn = function (t, e) {
    var r = t._gsap || new He(t);
    if ("x" in r && !e && !r.uncache) return r;
    var n,
      i,
      o,
      s,
      a,
      l,
      u,
      h,
      c,
      f,
      p,
      d,
      g,
      m,
      _,
      v,
      y,
      x,
      w,
      b,
      M,
      k,
      O,
      C,
      E,
      D,
      S,
      P,
      A,
      R,
      L,
      X,
      Y = t.style,
      F = r.scaleX < 0,
      N = "px",
      z = "deg",
      B = getComputedStyle(t),
      I = cn(t, on) || "0";
    return (
      (n = i = o = l = u = h = c = f = p = 0),
      (s = a = 1),
      (r.svg = !(!t.getCTM || !vn(t))),
      B.translate &&
        (("none" === B.translate &&
          "none" === B.scale &&
          "none" === B.rotate) ||
          (Y[nn] =
            ("none" !== B.translate
              ? "translate3d(" +
                (B.translate + " 0 0").split(" ").slice(0, 3).join(", ") +
                ") "
              : "") +
            ("none" !== B.rotate ? "rotate(" + B.rotate + ") " : "") +
            ("none" !== B.scale
              ? "scale(" + B.scale.split(" ").join(",") + ") "
              : "") +
            ("none" !== B[nn] ? B[nn] : "")),
        (Y.scale = Y.rotate = Y.translate = "none")),
      (m = Ln(t, r.svg)),
      r.svg &&
        (r.uncache
          ? ((E = t.getBBox()),
            (I = r.xOrigin - E.x + "px " + (r.yOrigin - E.y) + "px"),
            (C = ""))
          : (C = !e && t.getAttribute("data-svg-origin")),
        Xn(t, C || I, !!C || r.originIsAbsolute, !1 !== r.smooth, m)),
      (d = r.xOrigin || 0),
      (g = r.yOrigin || 0),
      m !== Sn &&
        ((x = m[0]),
        (w = m[1]),
        (b = m[2]),
        (M = m[3]),
        (n = k = m[4]),
        (i = O = m[5]),
        6 === m.length
          ? ((s = Math.sqrt(x * x + w * w)),
            (a = Math.sqrt(M * M + b * b)),
            (l = x || w ? Br(w, x) * Nr : 0),
            (c = b || M ? Br(b, M) * Nr + l : 0) &&
              (a *= Math.abs(Math.cos(c * zr))),
            r.svg && ((n -= d - (d * x + g * b)), (i -= g - (d * w + g * M))))
          : ((X = m[6]),
            (R = m[7]),
            (S = m[8]),
            (P = m[9]),
            (A = m[10]),
            (L = m[11]),
            (n = m[12]),
            (i = m[13]),
            (o = m[14]),
            (u = (_ = Br(X, A)) * Nr),
            _ &&
              ((C = k * (v = Math.cos(-_)) + S * (y = Math.sin(-_))),
              (E = O * v + P * y),
              (D = X * v + A * y),
              (S = k * -y + S * v),
              (P = O * -y + P * v),
              (A = X * -y + A * v),
              (L = R * -y + L * v),
              (k = C),
              (O = E),
              (X = D)),
            (h = (_ = Br(-b, A)) * Nr),
            _ &&
              ((v = Math.cos(-_)),
              (L = M * (y = Math.sin(-_)) + L * v),
              (x = C = x * v - S * y),
              (w = E = w * v - P * y),
              (b = D = b * v - A * y)),
            (l = (_ = Br(w, x)) * Nr),
            _ &&
              ((C = x * (v = Math.cos(_)) + w * (y = Math.sin(_))),
              (E = k * v + O * y),
              (w = w * v - x * y),
              (O = O * v - k * y),
              (x = C),
              (k = E)),
            u &&
              Math.abs(u) + Math.abs(l) > 359.9 &&
              ((u = l = 0), (h = 180 - h)),
            (s = _t(Math.sqrt(x * x + w * w + b * b))),
            (a = _t(Math.sqrt(O * O + X * X))),
            (_ = Br(k, O)),
            (c = Math.abs(_) > 2e-4 ? _ * Nr : 0),
            (p = L ? 1 / (L < 0 ? -L : L) : 0)),
        r.svg &&
          ((C = t.getAttribute("transform")),
          (r.forceCSS = t.setAttribute("transform", "") || !An(cn(t, nn))),
          C && t.setAttribute("transform", C))),
      Math.abs(c) > 90 &&
        Math.abs(c) < 270 &&
        (F
          ? ((s *= -1), (c += l <= 0 ? 180 : -180), (l += l <= 0 ? 180 : -180))
          : ((a *= -1), (c += c <= 0 ? 180 : -180))),
      (e = e || r.uncache),
      (r.x =
        n -
        ((r.xPercent =
          n &&
          ((!e && r.xPercent) ||
            (Math.round(t.offsetWidth / 2) === Math.round(-n) ? -50 : 0)))
          ? (t.offsetWidth * r.xPercent) / 100
          : 0) +
        N),
      (r.y =
        i -
        ((r.yPercent =
          i &&
          ((!e && r.yPercent) ||
            (Math.round(t.offsetHeight / 2) === Math.round(-i) ? -50 : 0)))
          ? (t.offsetHeight * r.yPercent) / 100
          : 0) +
        N),
      (r.z = o + N),
      (r.scaleX = _t(s)),
      (r.scaleY = _t(a)),
      (r.rotation = _t(l) + z),
      (r.rotationX = _t(u) + z),
      (r.rotationY = _t(h) + z),
      (r.skewX = c + z),
      (r.skewY = f + z),
      (r.transformPerspective = p + N),
      (r.zOrigin = parseFloat(I.split(" ")[2]) || (!e && r.zOrigin) || 0) &&
        (Y[on] = Fn(I)),
      (r.xOffset = r.yOffset = 0),
      (r.force3D = T.force3D),
      (r.renderTransform = r.svg ? Un : Yr ? Wn : zn),
      (r.uncache = 0),
      r
    );
  },
  Fn = function (t) {
    return (t = t.split(" "))[0] + " " + t[1];
  },
  Nn = function (t, e, r) {
    var n = ee(e);
    return _t(parseFloat(e) + parseFloat(bn(t, "x", r + "px", n))) + n;
  },
  zn = function (t, e) {
    (e.z = "0px"),
      (e.rotationY = e.rotationX = "0deg"),
      (e.force3D = 0),
      Wn(t, e);
  },
  Bn = "0deg",
  In = "0px",
  Hn = ") ",
  Wn = function (t, e) {
    var r = e || this,
      n = r.xPercent,
      i = r.yPercent,
      o = r.x,
      s = r.y,
      a = r.z,
      l = r.rotation,
      u = r.rotationY,
      h = r.rotationX,
      c = r.skewX,
      f = r.skewY,
      p = r.scaleX,
      d = r.scaleY,
      g = r.transformPerspective,
      m = r.force3D,
      _ = r.target,
      v = r.zOrigin,
      y = "",
      x = ("auto" === m && t && 1 !== t) || !0 === m;
    if (v && (h !== Bn || u !== Bn)) {
      var w,
        T = parseFloat(u) * zr,
        b = Math.sin(T),
        M = Math.cos(T);
      (T = parseFloat(h) * zr),
        (w = Math.cos(T)),
        (o = Nn(_, o, b * w * -v)),
        (s = Nn(_, s, -Math.sin(T) * -v)),
        (a = Nn(_, a, M * w * -v + v));
    }
    g !== In && (y += "perspective(" + g + Hn),
      (n || i) && (y += "translate(" + n + "%, " + i + "%) "),
      (x || o !== In || s !== In || a !== In) &&
        (y +=
          a !== In || x
            ? "translate3d(" + o + ", " + s + ", " + a + ") "
            : "translate(" + o + ", " + s + Hn),
      l !== Bn && (y += "rotate(" + l + Hn),
      u !== Bn && (y += "rotateY(" + u + Hn),
      h !== Bn && (y += "rotateX(" + h + Hn),
      (c === Bn && f === Bn) || (y += "skew(" + c + ", " + f + Hn),
      (1 === p && 1 === d) || (y += "scale(" + p + ", " + d + Hn),
      (_.style[nn] = y || "translate(0, 0)");
  },
  Un = function (t, e) {
    var r,
      n,
      i,
      o,
      s,
      a = e || this,
      l = a.xPercent,
      u = a.yPercent,
      h = a.x,
      c = a.y,
      f = a.rotation,
      p = a.skewX,
      d = a.skewY,
      g = a.scaleX,
      m = a.scaleY,
      _ = a.target,
      v = a.xOrigin,
      y = a.yOrigin,
      x = a.xOffset,
      w = a.yOffset,
      T = a.forceCSS,
      b = parseFloat(h),
      M = parseFloat(c);
    (f = parseFloat(f)),
      (p = parseFloat(p)),
      (d = parseFloat(d)) && ((p += d = parseFloat(d)), (f += d)),
      f || p
        ? ((f *= zr),
          (p *= zr),
          (r = Math.cos(f) * g),
          (n = Math.sin(f) * g),
          (i = Math.sin(f - p) * -m),
          (o = Math.cos(f - p) * m),
          p &&
            ((d *= zr),
            (s = Math.tan(p - d)),
            (i *= s = Math.sqrt(1 + s * s)),
            (o *= s),
            d &&
              ((s = Math.tan(d)), (r *= s = Math.sqrt(1 + s * s)), (n *= s))),
          (r = _t(r)),
          (n = _t(n)),
          (i = _t(i)),
          (o = _t(o)))
        : ((r = g), (o = m), (n = i = 0)),
      ((b && !~(h + "").indexOf("px")) || (M && !~(c + "").indexOf("px"))) &&
        ((b = bn(_, "x", h, "px")), (M = bn(_, "y", c, "px"))),
      (v || y || x || w) &&
        ((b = _t(b + v - (v * r + y * i) + x)),
        (M = _t(M + y - (v * n + y * o) + w))),
      (l || u) &&
        ((s = _.getBBox()),
        (b = _t(b + (l / 100) * s.width)),
        (M = _t(M + (u / 100) * s.height))),
      (s =
        "matrix(" + r + "," + n + "," + i + "," + o + "," + b + "," + M + ")"),
      _.setAttribute("transform", s),
      T && (_.style[nn] = s);
  },
  Vn = function (t, e, r, n, i) {
    var o,
      s,
      a = 360,
      l = A(i),
      u = parseFloat(i) * (l && ~i.indexOf("rad") ? Nr : 1) - n,
      h = n + u + "deg";
    return (
      l &&
        ("short" === (o = i.split("_")[1]) &&
          (u %= a) !== u % 180 &&
          (u += u < 0 ? a : -360),
        "cw" === o && u < 0
          ? (u = ((u + 36e9) % a) - ~~(u / a) * a)
          : "ccw" === o && u > 0 && (u = ((u - 36e9) % a) - ~~(u / a) * a)),
      (t._pt = s = new gr(t._pt, e, r, n, u, qr)),
      (s.e = h),
      (s.u = "deg"),
      t._props.push(r),
      s
    );
  },
  qn = function (t, e) {
    for (var r in e) t[r] = e[r];
    return t;
  },
  jn = function (t, e, r) {
    var n,
      i,
      o,
      s,
      a,
      l,
      u,
      h = qn({}, r._gsap),
      c = r.style;
    for (i in (h.svg
      ? ((o = r.getAttribute("transform")),
        r.setAttribute("transform", ""),
        (c[nn] = e),
        (n = Yn(r, 1)),
        yn(r, nn),
        r.setAttribute("transform", o))
      : ((o = getComputedStyle(r)[nn]),
        (c[nn] = e),
        (n = Yn(r, 1)),
        (c[nn] = o)),
    Fr))
      (o = h[i]) !== (s = n[i]) &&
        "perspective,force3D,transformOrigin,svgOrigin".indexOf(i) < 0 &&
        ((a = ee(o) !== (u = ee(s)) ? bn(r, i, o, u) : parseFloat(o)),
        (l = parseFloat(s)),
        (t._pt = new gr(t._pt, n, i, a, l - a, Vr)),
        (t._pt.u = u || 0),
        t._props.push(i));
    qn(n, h);
  };
mt("padding,margin,Width,Radius", function (t, e) {
  var r = "Top",
    n = "Right",
    i = "Bottom",
    o = "Left",
    s = (e < 3 ? [r, n, i, o] : [r + o, r + n, i + n, i + o]).map(function (r) {
      return e < 2 ? t + r : "border" + r + t;
    });
  Dn[e > 1 ? "border" + t : t] = function (t, e, r, n, i) {
    var o, a;
    if (arguments.length < 4)
      return (
        (o = s.map(function (e) {
          return Mn(t, e, r);
        })),
        5 === (a = o.join(" ")).split(o[0]).length ? o[0] : a
      );
    (o = (n + "").split(" ")),
      (a = {}),
      s.forEach(function (t, e) {
        return (a[t] = o[e] = o[e] || o[((e - 1) / 2) | 0]);
      }),
      t.init(e, a, i);
  };
});
var Gn,
  Kn,
  $n,
  Qn = {
    name: "css",
    register: dn,
    targetTest: function (t) {
      return t.style && t.nodeType;
    },
    init: function (t, e, r, n, i) {
      var o,
        s,
        a,
        l,
        u,
        h,
        c,
        f,
        p,
        d,
        g,
        m,
        _,
        v,
        y,
        x,
        w = this._props,
        b = t.style,
        M = r.vars.startAt;
      for (c in (Ar || dn(),
      (this.styles = this.styles || un(t)),
      (x = this.styles.props),
      (this.tween = r),
      e))
        if ("autoRound" !== c && ((s = e[c]), !lt[c] || !Ke(c, e, r, n, t, i)))
          if (
            ((u = typeof s),
            (h = Dn[c]),
            "function" === u && (u = typeof (s = s.call(r, n, t, i))),
            "string" === u && ~s.indexOf("random(") && (s = pe(s)),
            h)
          )
            h(this, t, c, s, r) && (y = 1);
          else if ("--" === c.substr(0, 2))
            (o = (getComputedStyle(t).getPropertyValue(c) + "").trim()),
              (s += ""),
              (Oe.lastIndex = 0),
              Oe.test(o) || ((f = ee(o)), (p = ee(s))),
              p ? f !== p && (o = bn(t, c, o, p) + p) : f && (s += f),
              this.add(b, "setProperty", o, s, n, i, 0, 0, c),
              w.push(c),
              x.push(c, 0, b[c]);
          else if ("undefined" !== u) {
            if (
              (M && c in M
                ? ((o =
                    "function" == typeof M[c] ? M[c].call(r, n, t, i) : M[c]),
                  A(o) && ~o.indexOf("random(") && (o = pe(o)),
                  ee(o + "") ||
                    "auto" === o ||
                    (o += T.units[c] || ee(Mn(t, c)) || ""),
                  "=" === (o + "").charAt(1) && (o = Mn(t, c)))
                : (o = Mn(t, c)),
              (l = parseFloat(o)),
              (d = "string" === u && "=" === s.charAt(1) && s.substr(0, 2)) &&
                (s = s.substr(2)),
              (a = parseFloat(s)),
              c in Ur &&
                ("autoAlpha" === c &&
                  (1 === l && "hidden" === Mn(t, "visibility") && a && (l = 0),
                  x.push("visibility", 0, b.visibility),
                  xn(
                    this,
                    b,
                    "visibility",
                    l ? "inherit" : "hidden",
                    a ? "inherit" : "hidden",
                    !a
                  )),
                "scale" !== c &&
                  "transform" !== c &&
                  ~(c = Ur[c]).indexOf(",") &&
                  (c = c.split(",")[0])),
              (g = c in Fr))
            )
              if (
                (this.styles.save(c),
                "string" === u &&
                  "var(--" === s.substring(0, 6) &&
                  ((s = cn(t, s.substring(4, s.indexOf(")")))),
                  (a = parseFloat(s))),
                m ||
                  (((_ = t._gsap).renderTransform && !e.parseTransform) ||
                    Yn(t, e.parseTransform),
                  (v = !1 !== e.smoothOrigin && _.smooth),
                  ((m = this._pt =
                    new gr(
                      this._pt,
                      b,
                      nn,
                      0,
                      1,
                      _.renderTransform,
                      _,
                      0,
                      -1
                    )).dep = 1)),
                "scale" === c)
              )
                (this._pt = new gr(
                  this._pt,
                  _,
                  "scaleY",
                  _.scaleY,
                  (d ? yt(_.scaleY, d + a) : a) - _.scaleY || 0,
                  Vr
                )),
                  (this._pt.u = 0),
                  w.push("scaleY", c),
                  (c += "X");
              else {
                if ("transformOrigin" === c) {
                  x.push(on, 0, b[on]),
                    (s = Cn(s)),
                    _.svg
                      ? Xn(t, s, 0, v, 0, this)
                      : ((p = parseFloat(s.split(" ")[2]) || 0) !== _.zOrigin &&
                          xn(this, _, "zOrigin", _.zOrigin, p),
                        xn(this, b, c, Fn(o), Fn(s)));
                  continue;
                }
                if ("svgOrigin" === c) {
                  Xn(t, s, 1, v, 0, this);
                  continue;
                }
                if (c in Pn) {
                  Vn(this, _, c, l, d ? yt(l, d + s) : s);
                  continue;
                }
                if ("smoothOrigin" === c) {
                  xn(this, _, "smooth", _.smooth, s);
                  continue;
                }
                if ("force3D" === c) {
                  _[c] = s;
                  continue;
                }
                if ("transform" === c) {
                  jn(this, s, t);
                  continue;
                }
              }
            else c in b || (c = pn(c) || c);
            if (
              g ||
              ((a || 0 === a) && (l || 0 === l) && !Wr.test(s) && c in b)
            )
              a || (a = 0),
                (f = (o + "").substr((l + "").length)) !==
                  (p = ee(s) || (c in T.units ? T.units[c] : f)) &&
                  (l = bn(t, c, o, p)),
                (this._pt = new gr(
                  this._pt,
                  g ? _ : b,
                  c,
                  l,
                  (d ? yt(l, d + a) : a) - l,
                  g || ("px" !== p && "zIndex" !== c) || !1 === e.autoRound
                    ? Vr
                    : Gr
                )),
                (this._pt.u = p || 0),
                f !== p && "%" !== p && ((this._pt.b = o), (this._pt.r = jr));
            else if (c in b) kn.call(this, t, c, o, d ? d + s : s);
            else if (c in t) this.add(t, c, o || t[c], d ? d + s : s, n, i);
            else if ("parseTransform" !== c) {
              Z();
              continue;
            }
            g ||
              (c in b
                ? x.push(c, 0, b[c])
                : "function" == typeof t[c]
                ? x.push(c, 2, t[c]())
                : x.push(c, 1, o || t[c])),
              w.push(c);
          }
      y && dr(this);
    },
    render: function (t, e) {
      if (e.tween._time || !Xr())
        for (var r = e._pt; r; ) r.r(t, r.d), (r = r._next);
      else e.styles.revert();
    },
    get: Mn,
    aliases: Ur,
    getSetter: function (t, e, r) {
      var n = Ur[e];
      return (
        n && n.indexOf(",") < 0 && (e = n),
        e in Fr && e !== on && (t._gsap.x || Mn(t, "x"))
          ? r && Lr === r
            ? "scale" === e
              ? tn
              : Jr
            : (Lr = r || {}) && ("scale" === e ? en : rn)
          : t.style && !X(t.style[e])
          ? Qr
          : ~e.indexOf("-")
          ? Zr
          : sr(t, e)
      );
    },
    core: { _removeProperty: yn, _getMatrix: Ln },
  };
(Er.utils.checkPrefix = pn),
  (Er.core.getStyleSaver = un),
  ($n = mt(
    (Gn = "x,y,z,scale,scaleX,scaleY,xPercent,yPercent") +
      "," +
      (Kn = "rotation,rotationX,rotationY,skewX,skewY") +
      ",transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective",
    function (t) {
      Fr[t] = 1;
    }
  )),
  mt(Kn, function (t) {
    (T.units[t] = "deg"), (Pn[t] = 1);
  }),
  (Ur[$n[13]] = Gn + "," + Kn),
  mt(
    "0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY",
    function (t) {
      var e = t.split(":");
      Ur[e[1]] = $n[e[0]];
    }
  ),
  mt(
    "x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",
    function (t) {
      T.units[t] = "px";
    }
  ),
  Er.registerPlugin(Qn);
var Zn = Er.registerPlugin(Qn) || Er;
Zn.core.Tween;
var Jn,
  ti,
  ei,
  ri,
  ni,
  ii,
  oi,
  si,
  ai,
  li = "transform",
  ui = li + "Origin",
  hi = function (t) {
    var e = t.ownerDocument || t;
    !(li in t.style) &&
      "msTransform" in t.style &&
      (ui = (li = "msTransform") + "Origin");
    for (; e.parentNode && (e = e.parentNode); );
    if (((ti = window), (oi = new vi()), e)) {
      (Jn = e),
        (ei = e.documentElement),
        (ri = e.body),
        ((si = Jn.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        )).style.transform = "none");
      var r = e.createElement("div"),
        n = e.createElement("div"),
        i = e && (e.body || e.firstElementChild);
      i &&
        i.appendChild &&
        (i.appendChild(r),
        r.appendChild(n),
        r.setAttribute(
          "style",
          "position:static;transform:translate3d(0,0,1px)"
        ),
        (ai = n.offsetParent !== r),
        i.removeChild(r));
    }
    return e;
  },
  ci = [],
  fi = [],
  pi = function (t) {
    return (
      t.ownerSVGElement || ("svg" === (t.tagName + "").toLowerCase() ? t : null)
    );
  },
  di = function t(e) {
    return (
      "fixed" === ti.getComputedStyle(e).position ||
      ((e = e.parentNode) && 1 === e.nodeType ? t(e) : void 0)
    );
  },
  gi = function t(e, r) {
    if (e.parentNode && (Jn || hi(e))) {
      var n = pi(e),
        i = n
          ? n.getAttribute("xmlns") || "http://www.w3.org/2000/svg"
          : "http://www.w3.org/1999/xhtml",
        o = n ? (r ? "rect" : "g") : "div",
        s = 2 !== r ? 0 : 100,
        a = 3 === r ? 100 : 0,
        l =
          "position:absolute;display:block;pointer-events:none;margin:0;padding:0;",
        u = Jn.createElementNS
          ? Jn.createElementNS(i.replace(/^https/, "http"), o)
          : Jn.createElement(o);
      return (
        r &&
          (n
            ? (ii || (ii = t(e)),
              u.setAttribute("width", 0.01),
              u.setAttribute("height", 0.01),
              u.setAttribute("transform", "translate(" + s + "," + a + ")"),
              ii.appendChild(u))
            : (ni || ((ni = t(e)).style.cssText = l),
              (u.style.cssText =
                l +
                "width:0.1px;height:0.1px;top:" +
                a +
                "px;left:" +
                s +
                "px"),
              ni.appendChild(u))),
        u
      );
    }
    throw "Need document and parent.";
  },
  mi = function (t, e) {
    var r,
      n,
      i,
      o,
      s,
      a,
      l = pi(t),
      u = t === l,
      h = l ? ci : fi,
      c = t.parentNode,
      f =
        c && !l && c.shadowRoot && c.shadowRoot.appendChild ? c.shadowRoot : c;
    if (t === ti) return t;
    if (
      (h.length || h.push(gi(t, 1), gi(t, 2), gi(t, 3)), (r = l ? ii : ni), l)
    )
      u
        ? ((i = (function (t) {
            var e,
              r = t.getCTM();
            return (
              r ||
                ((e = t.style[li]),
                (t.style[li] = "none"),
                t.appendChild(si),
                (r = si.getCTM()),
                t.removeChild(si),
                e
                  ? (t.style[li] = e)
                  : t.style.removeProperty(
                      li.replace(/([A-Z])/g, "-$1").toLowerCase()
                    )),
              r || oi.clone()
            );
          })(t)),
          (o = -i.e / i.a),
          (s = -i.f / i.d),
          (n = oi))
        : t.getBBox
        ? ((i = t.getBBox()),
          (n = (n = t.transform ? t.transform.baseVal : {}).numberOfItems
            ? n.numberOfItems > 1
              ? (function (t) {
                  for (var e = new vi(), r = 0; r < t.numberOfItems; r++)
                    e.multiply(t.getItem(r).matrix);
                  return e;
                })(n)
              : n.getItem(0).matrix
            : oi),
          (o = n.a * i.x + n.c * i.y),
          (s = n.b * i.x + n.d * i.y))
        : ((n = new vi()), (o = s = 0)),
        e && "g" === t.tagName.toLowerCase() && (o = s = 0),
        (u ? l : c).appendChild(r),
        r.setAttribute(
          "transform",
          "matrix(" +
            n.a +
            "," +
            n.b +
            "," +
            n.c +
            "," +
            n.d +
            "," +
            (n.e + o) +
            "," +
            (n.f + s) +
            ")"
        );
    else {
      if (((o = s = 0), ai))
        for (
          n = t.offsetParent, i = t;
          i && (i = i.parentNode) && i !== n && i.parentNode;

        )
          (ti.getComputedStyle(i)[li] + "").length > 4 &&
            ((o = i.offsetLeft), (s = i.offsetTop), (i = 0));
      if (
        "absolute" !== (a = ti.getComputedStyle(t)).position &&
        "fixed" !== a.position
      )
        for (n = t.offsetParent; c && c !== n; )
          (o += c.scrollLeft || 0), (s += c.scrollTop || 0), (c = c.parentNode);
      ((i = r.style).top = t.offsetTop - s + "px"),
        (i.left = t.offsetLeft - o + "px"),
        (i[li] = a[li]),
        (i[ui] = a[ui]),
        (i.position = "fixed" === a.position ? "fixed" : "absolute"),
        f.appendChild(r);
    }
    return r;
  },
  _i = function (t, e, r, n, i, o, s) {
    return (t.a = e), (t.b = r), (t.c = n), (t.d = i), (t.e = o), (t.f = s), t;
  },
  vi = (function () {
    function t(t, e, r, n, i, o) {
      void 0 === t && (t = 1),
        void 0 === e && (e = 0),
        void 0 === r && (r = 0),
        void 0 === n && (n = 1),
        void 0 === i && (i = 0),
        void 0 === o && (o = 0),
        _i(this, t, e, r, n, i, o);
    }
    var e = t.prototype;
    return (
      (e.inverse = function () {
        var t = this.a,
          e = this.b,
          r = this.c,
          n = this.d,
          i = this.e,
          o = this.f,
          s = t * n - e * r || 1e-10;
        return _i(
          this,
          n / s,
          -e / s,
          -r / s,
          t / s,
          (r * o - n * i) / s,
          -(t * o - e * i) / s
        );
      }),
      (e.multiply = function (t) {
        var e = this.a,
          r = this.b,
          n = this.c,
          i = this.d,
          o = this.e,
          s = this.f,
          a = t.a,
          l = t.c,
          u = t.b,
          h = t.d,
          c = t.e,
          f = t.f;
        return _i(
          this,
          a * e + u * n,
          a * r + u * i,
          l * e + h * n,
          l * r + h * i,
          o + c * e + f * n,
          s + c * r + f * i
        );
      }),
      (e.clone = function () {
        return new t(this.a, this.b, this.c, this.d, this.e, this.f);
      }),
      (e.equals = function (t) {
        var e = this.a,
          r = this.b,
          n = this.c,
          i = this.d,
          o = this.e,
          s = this.f;
        return (
          e === t.a &&
          r === t.b &&
          n === t.c &&
          i === t.d &&
          o === t.e &&
          s === t.f
        );
      }),
      (e.apply = function (t, e) {
        void 0 === e && (e = {});
        var r = t.x,
          n = t.y,
          i = this.a,
          o = this.b,
          s = this.c,
          a = this.d,
          l = this.e,
          u = this.f;
        return (
          (e.x = r * i + n * s + l || 0), (e.y = r * o + n * a + u || 0), e
        );
      }),
      t
    );
  })();
function yi(t, e, r, n) {
  if (!t || !t.parentNode || (Jn || hi(t)).documentElement === t)
    return new vi();
  var i = (function (t) {
      for (var e, r; t && t !== ri; )
        (r = t._gsap) && r.uncache && r.get(t, "x"),
          r &&
            !r.scaleX &&
            !r.scaleY &&
            r.renderTransform &&
            ((r.scaleX = r.scaleY = 1e-4),
            r.renderTransform(1, r),
            e ? e.push(r) : (e = [r])),
          (t = t.parentNode);
      return e;
    })(t),
    o = pi(t) ? ci : fi,
    s = mi(t, r),
    a = o[0].getBoundingClientRect(),
    l = o[1].getBoundingClientRect(),
    u = o[2].getBoundingClientRect(),
    h = s.parentNode,
    c = !n && di(t),
    f = new vi(
      (l.left - a.left) / 100,
      (l.top - a.top) / 100,
      (u.left - a.left) / 100,
      (u.top - a.top) / 100,
      a.left +
        (c
          ? 0
          : ti.pageXOffset ||
            Jn.scrollLeft ||
            ei.scrollLeft ||
            ri.scrollLeft ||
            0),
      a.top +
        (c
          ? 0
          : ti.pageYOffset || Jn.scrollTop || ei.scrollTop || ri.scrollTop || 0)
    );
  if ((h.removeChild(s), i))
    for (a = i.length; a--; )
      ((l = i[a]).scaleX = l.scaleY = 0), l.renderTransform(1, l);
  return e ? f.inverse() : f;
}
function xi(t) {
  if (void 0 === t)
    throw new ReferenceError(
      "this hasn't been initialised - super() hasn't been called"
    );
  return t;
}
var wi,
  Ti,
  bi,
  Mi,
  ki,
  Oi,
  Ci,
  Ei,
  Di,
  Si,
  Pi,
  Ai,
  Ri,
  Li,
  Xi,
  Yi,
  Fi,
  Ni,
  zi,
  Bi,
  Ii,
  Hi,
  Wi = 0,
  Ui = function () {
    return "undefined" != typeof window;
  },
  Vi = function () {
    return wi || (Ui() && (wi = window.gsap) && wi.registerPlugin && wi);
  },
  qi = function (t) {
    return "function" == typeof t;
  },
  ji = function (t) {
    return "object" == typeof t;
  },
  Gi = function (t) {
    return void 0 === t;
  },
  Ki = function () {
    return !1;
  },
  $i = "transform",
  Qi = "transformOrigin",
  Zi = function (t) {
    return Math.round(1e4 * t) / 1e4;
  },
  Ji = Array.isArray,
  to = function (t, e) {
    var r = bi.createElementNS
      ? bi.createElementNS(
          (e || "http://www.w3.org/1999/xhtml").replace(/^https/, "http"),
          t
        )
      : bi.createElement(t);
    return r.style ? r : bi.createElement(t);
  },
  eo = 180 / Math.PI,
  ro = 1e20,
  no = new vi(),
  io =
    Date.now ||
    function () {
      return new Date().getTime();
    },
  oo = [],
  so = {},
  ao = 0,
  lo = /^(?:a|input|textarea|button|select)$/i,
  uo = 0,
  ho = {},
  co = {},
  fo = function (t, e) {
    var r,
      n = {};
    for (r in t) n[r] = e ? t[r] * e : t[r];
    return n;
  },
  po = function t(e, r) {
    for (var n, i = e.length; i--; )
      r
        ? (e[i].style.touchAction = r)
        : e[i].style.removeProperty("touch-action"),
        (n = e[i].children) && n.length && t(n, r);
  },
  go = function () {
    return oo.forEach(function (t) {
      return t();
    });
  },
  mo = function () {
    return !oo.length && wi.ticker.remove(go);
  },
  _o = function (t) {
    for (var e = oo.length; e--; ) oo[e] === t && oo.splice(e, 1);
    wi.to(mo, {
      overwrite: !0,
      delay: 15,
      duration: 0,
      onComplete: mo,
      data: "_draggable",
    });
  },
  vo = function (t, e, r, n) {
    if (t.addEventListener) {
      var i = Ri[e];
      (n = n || (Pi ? { passive: !1 } : null)),
        t.addEventListener(i || e, r, n),
        i && e !== i && t.addEventListener(e, r, n);
    }
  },
  yo = function (t, e, r, n) {
    if (t.removeEventListener) {
      var i = Ri[e];
      t.removeEventListener(i || e, r, n),
        i && e !== i && t.removeEventListener(e, r, n);
    }
  },
  xo = function (t) {
    t.preventDefault && t.preventDefault(),
      t.preventManipulation && t.preventManipulation();
  },
  wo = function t(e) {
    (Li = e.touches && Wi < e.touches.length), yo(e.target, "touchend", t);
  },
  To = function (t) {
    (Li = t.touches && Wi < t.touches.length), vo(t.target, "touchend", wo);
  },
  bo = function (t) {
    return (
      Ti.pageYOffset ||
      t.scrollTop ||
      t.documentElement.scrollTop ||
      t.body.scrollTop ||
      0
    );
  },
  Mo = function (t) {
    return (
      Ti.pageXOffset ||
      t.scrollLeft ||
      t.documentElement.scrollLeft ||
      t.body.scrollLeft ||
      0
    );
  },
  ko = function t(e, r) {
    vo(e, "scroll", r), Co(e.parentNode) || t(e.parentNode, r);
  },
  Oo = function t(e, r) {
    yo(e, "scroll", r), Co(e.parentNode) || t(e.parentNode, r);
  },
  Co = function (t) {
    return !(
      t &&
      t !== Mi &&
      9 !== t.nodeType &&
      t !== bi.body &&
      t !== Ti &&
      t.nodeType &&
      t.parentNode
    );
  },
  Eo = function (t, e) {
    var r = "x" === e ? "Width" : "Height",
      n = "scroll" + r,
      i = "client" + r;
    return Math.max(
      0,
      Co(t)
        ? Math.max(Mi[n], ki[n]) - (Ti["inner" + r] || Mi[i] || ki[i])
        : t[n] - t[i]
    );
  },
  Do = function t(e, r) {
    var n = Eo(e, "x"),
      i = Eo(e, "y");
    Co(e) ? (e = co) : t(e.parentNode, r),
      (e._gsMaxScrollX = n),
      (e._gsMaxScrollY = i),
      r ||
        ((e._gsScrollX = e.scrollLeft || 0), (e._gsScrollY = e.scrollTop || 0));
  },
  So = function (t, e, r) {
    var n = t.style;
    n &&
      (Gi(n[e]) && (e = Di(e, t) || e),
      null == r
        ? n.removeProperty &&
          n.removeProperty(e.replace(/([A-Z])/g, "-$1").toLowerCase())
        : (n[e] = r));
  },
  Po = function (t) {
    return Ti.getComputedStyle(
      t instanceof Element ? t : t.host || (t.parentNode || {}).host || t
    );
  },
  Ao = {},
  Ro = function (t) {
    if (t === Ti)
      return (
        (Ao.left = Ao.top = 0),
        (Ao.width = Ao.right =
          Mi.clientWidth || t.innerWidth || ki.clientWidth || 0),
        (Ao.height = Ao.bottom =
          (t.innerHeight || 0) - 20 < Mi.clientHeight
            ? Mi.clientHeight
            : t.innerHeight || ki.clientHeight || 0),
        Ao
      );
    var e = t.ownerDocument || bi,
      r = Gi(t.pageX)
        ? t.nodeType || Gi(t.left) || Gi(t.top)
          ? Si(t)[0].getBoundingClientRect()
          : t
        : {
            left: t.pageX - Mo(e),
            top: t.pageY - bo(e),
            right: t.pageX - Mo(e) + 1,
            bottom: t.pageY - bo(e) + 1,
          };
    return (
      Gi(r.right) && !Gi(r.width)
        ? ((r.right = r.left + r.width), (r.bottom = r.top + r.height))
        : Gi(r.width) &&
          (r = {
            width: r.right - r.left,
            height: r.bottom - r.top,
            right: r.right,
            left: r.left,
            bottom: r.bottom,
            top: r.top,
          }),
      r
    );
  },
  Lo = function (t, e, r) {
    var n,
      i = t.vars,
      o = i[r],
      s = t._listeners[e];
    return (
      qi(o) &&
        (n = o.apply(
          i.callbackScope || t,
          i[r + "Params"] || [t.pointerEvent]
        )),
      s && !1 === t.dispatchEvent(e) && (n = !1),
      n
    );
  },
  Xo = function (t, e) {
    var r,
      n,
      i,
      o = Si(t)[0];
    return o.nodeType || o === Ti
      ? Fo(o, e)
      : Gi(t.left)
      ? {
          left: (n = t.min || t.minX || t.minRotation || 0),
          top: (r = t.min || t.minY || 0),
          width: (t.max || t.maxX || t.maxRotation || 0) - n,
          height: (t.max || t.maxY || 0) - r,
        }
      : ((i = { x: 0, y: 0 }),
        {
          left: t.left - i.x,
          top: t.top - i.y,
          width: t.width,
          height: t.height,
        });
  },
  Yo = {},
  Fo = function (t, e) {
    e = Si(e)[0];
    var r,
      n,
      i,
      o,
      s,
      a,
      l,
      u,
      h,
      c,
      f,
      p,
      d,
      g = t.getBBox && t.ownerSVGElement,
      m = t.ownerDocument || bi;
    if (t === Ti)
      (i = bo(m)),
        (n =
          (r = Mo(m)) +
          (m.documentElement.clientWidth ||
            t.innerWidth ||
            m.body.clientWidth ||
            0)),
        (o =
          i +
          ((t.innerHeight || 0) - 20 < m.documentElement.clientHeight
            ? m.documentElement.clientHeight
            : t.innerHeight || m.body.clientHeight || 0));
    else {
      if (e === Ti || Gi(e)) return t.getBoundingClientRect();
      (r = i = 0),
        g
          ? ((f = (c = t.getBBox()).width), (p = c.height))
          : (t.viewBox &&
              (c = t.viewBox.baseVal) &&
              ((r = c.x || 0), (i = c.y || 0), (f = c.width), (p = c.height)),
            f ||
              ((c = "border-box" === (d = Po(t)).boxSizing),
              (f =
                (parseFloat(d.width) || t.clientWidth || 0) +
                (c
                  ? 0
                  : parseFloat(d.borderLeftWidth) +
                    parseFloat(d.borderRightWidth))),
              (p =
                (parseFloat(d.height) || t.clientHeight || 0) +
                (c
                  ? 0
                  : parseFloat(d.borderTopWidth) +
                    parseFloat(d.borderBottomWidth))))),
        (n = f),
        (o = p);
    }
    return t === e
      ? { left: r, top: i, width: n - r, height: o - i }
      : ((a = (s = yi(e, !0).multiply(yi(t))).apply({ x: r, y: i })),
        (l = s.apply({ x: n, y: i })),
        (u = s.apply({ x: n, y: o })),
        (h = s.apply({ x: r, y: o })),
        {
          left: (r = Math.min(a.x, l.x, u.x, h.x)),
          top: (i = Math.min(a.y, l.y, u.y, h.y)),
          width: Math.max(a.x, l.x, u.x, h.x) - r,
          height: Math.max(a.y, l.y, u.y, h.y) - i,
        });
  },
  No = function (t, e, r, n, i, o) {
    var s,
      a,
      l,
      u = {};
    if (e)
      if (1 !== i && e instanceof Array) {
        if (((u.end = s = []), (l = e.length), ji(e[0])))
          for (a = 0; a < l; a++) s[a] = fo(e[a], i);
        else for (a = 0; a < l; a++) s[a] = e[a] * i;
        (r += 1.1), (n -= 1.1);
      } else
        qi(e)
          ? (u.end = function (r) {
              var n,
                o,
                s = e.call(t, r);
              if (1 !== i)
                if (ji(s)) {
                  for (o in ((n = {}), s)) n[o] = s[o] * i;
                  s = n;
                } else s *= i;
              return s;
            })
          : (u.end = e);
    return (
      (r || 0 === r) && (u.max = r),
      (n || 0 === n) && (u.min = n),
      o && (u.velocity = 0),
      u
    );
  },
  zo = function t(e) {
    var r;
    return (
      !(!e || !e.getAttribute || e === ki) &&
      (!(
        "true" !== (r = e.getAttribute("data-clickable")) &&
        ("false" === r ||
          (!lo.test(e.nodeName + "") &&
            "true" !== e.getAttribute("contentEditable")))
      ) ||
        t(e.parentNode))
    );
  },
  Bo = function (t, e) {
    for (var r, n = t.length; n--; )
      ((r = t[n]).ondragstart = r.onselectstart = e ? null : Ki),
        wi.set(r, { lazy: !0, userSelect: e ? "text" : "none" });
  },
  Io = function t(e) {
    return (
      "fixed" === Po(e).position ||
      ((e = e.parentNode) && 1 === e.nodeType ? t(e) : void 0)
    );
  },
  Ho = function (t, e) {
    (t = wi.utils.toArray(t)[0]), (e = e || {});
    var r,
      n,
      i,
      o,
      s,
      a,
      l = document.createElement("div"),
      u = l.style,
      h = t.firstChild,
      c = 0,
      f = 0,
      p = t.scrollTop,
      d = t.scrollLeft,
      g = t.scrollWidth,
      m = t.scrollHeight,
      _ = 0,
      v = 0,
      y = 0;
    Ii && !1 !== e.force3D
      ? ((s = "translate3d("), (a = "px,0px)"))
      : $i && ((s = "translate("), (a = "px)")),
      (this.scrollTop = function (t, e) {
        if (!arguments.length) return -this.top();
        this.top(-t, e);
      }),
      (this.scrollLeft = function (t, e) {
        if (!arguments.length) return -this.left();
        this.left(-t, e);
      }),
      (this.left = function (r, n) {
        if (!arguments.length) return -(t.scrollLeft + f);
        var i = t.scrollLeft - d,
          o = f;
        if ((i > 2 || i < -2) && !n)
          return (
            (d = t.scrollLeft),
            wi.killTweensOf(this, { left: 1, scrollLeft: 1 }),
            this.left(-d),
            void (e.onKill && e.onKill())
          );
        (r = -r) < 0
          ? ((f = (r - 0.5) | 0), (r = 0))
          : r > v
          ? ((f = (r - v) | 0), (r = v))
          : (f = 0),
          (f || o) &&
            (this._skip || (u[$i] = s + -f + "px," + -c + a),
            f + _ >= 0 && (u.paddingRight = f + _ + "px")),
          (t.scrollLeft = 0 | r),
          (d = t.scrollLeft);
      }),
      (this.top = function (r, n) {
        if (!arguments.length) return -(t.scrollTop + c);
        var i = t.scrollTop - p,
          o = c;
        if ((i > 2 || i < -2) && !n)
          return (
            (p = t.scrollTop),
            wi.killTweensOf(this, { top: 1, scrollTop: 1 }),
            this.top(-p),
            void (e.onKill && e.onKill())
          );
        (r = -r) < 0
          ? ((c = (r - 0.5) | 0), (r = 0))
          : r > y
          ? ((c = (r - y) | 0), (r = y))
          : (c = 0),
          (c || o) && (this._skip || (u[$i] = s + -f + "px," + -c + a)),
          (t.scrollTop = 0 | r),
          (p = t.scrollTop);
      }),
      (this.maxScrollTop = function () {
        return y;
      }),
      (this.maxScrollLeft = function () {
        return v;
      }),
      (this.disable = function () {
        for (h = l.firstChild; h; )
          (o = h.nextSibling), t.appendChild(h), (h = o);
        t === l.parentNode && t.removeChild(l);
      }),
      (this.enable = function () {
        if ((h = t.firstChild) !== l) {
          for (; h; ) (o = h.nextSibling), l.appendChild(h), (h = o);
          t.appendChild(l), this.calibrate();
        }
      }),
      (this.calibrate = function (e) {
        var o,
          s,
          a,
          h = t.clientWidth === r;
        (p = t.scrollTop),
          (d = t.scrollLeft),
          (h &&
            t.clientHeight === n &&
            l.offsetHeight === i &&
            g === t.scrollWidth &&
            m === t.scrollHeight &&
            !e) ||
            ((c || f) &&
              ((s = this.left()),
              (a = this.top()),
              this.left(-t.scrollLeft),
              this.top(-t.scrollTop)),
            (o = Po(t)),
            (h && !e) ||
              ((u.display = "block"),
              (u.width = "auto"),
              (u.paddingRight = "0px"),
              (_ = Math.max(0, t.scrollWidth - t.clientWidth)) &&
                (_ +=
                  parseFloat(o.paddingLeft) +
                  (Hi ? parseFloat(o.paddingRight) : 0))),
            (u.display = "inline-block"),
            (u.position = "relative"),
            (u.overflow = "visible"),
            (u.verticalAlign = "top"),
            (u.boxSizing = "content-box"),
            (u.width = "100%"),
            (u.paddingRight = _ + "px"),
            Hi && (u.paddingBottom = o.paddingBottom),
            (r = t.clientWidth),
            (n = t.clientHeight),
            (g = t.scrollWidth),
            (m = t.scrollHeight),
            (v = t.scrollWidth - r),
            (y = t.scrollHeight - n),
            (i = l.offsetHeight),
            (u.display = "block"),
            (s || a) && (this.left(s), this.top(a)));
      }),
      (this.content = l),
      (this.element = t),
      (this._skip = !1),
      this.enable();
  },
  Wo = function (t) {
    if (Ui() && document.body) {
      var e = window && window.navigator;
      (Ti = window),
        (bi = document),
        (Mi = bi.documentElement),
        (ki = bi.body),
        (Oi = to("div")),
        (Ni = !!window.PointerEvent),
        ((Ci = to("div")).style.cssText =
          "visibility:hidden;height:1px;top:-1px;pointer-events:none;position:relative;clear:both;cursor:grab"),
        (Fi = "grab" === Ci.style.cursor ? "grab" : "move"),
        (Xi = e && -1 !== e.userAgent.toLowerCase().indexOf("android")),
        (Ai =
          ("ontouchstart" in Mi && "orientation" in Ti) ||
          (e && (e.MaxTouchPoints > 0 || e.msMaxTouchPoints > 0))),
        (n = to("div")),
        (i = to("div")),
        (o = i.style),
        (s = ki),
        (o.display = "inline-block"),
        (o.position = "relative"),
        (n.style.cssText =
          "width:90px;height:40px;padding:10px;overflow:auto;visibility:hidden"),
        n.appendChild(i),
        s.appendChild(n),
        (r = i.offsetHeight + 18 > n.scrollHeight),
        s.removeChild(n),
        (Hi = r),
        (Ri = (function (t) {
          for (
            var e = t.split(","),
              r = (
                ("onpointerdown" in Oi)
                  ? "pointerdown,pointermove,pointerup,pointercancel"
                  : ("onmspointerdown" in Oi)
                  ? "MSPointerDown,MSPointerMove,MSPointerUp,MSPointerCancel"
                  : t
              ).split(","),
              n = {},
              i = 4;
            --i > -1;

          )
            (n[e[i]] = r[i]), (n[r[i]] = e[i]);
          try {
            Mi.addEventListener(
              "test",
              null,
              Object.defineProperty({}, "passive", {
                get: function () {
                  Pi = 1;
                },
              })
            );
          } catch (t) {}
          return n;
        })("touchstart,touchmove,touchend,touchcancel")),
        vo(bi, "touchcancel", Ki),
        vo(Ti, "touchmove", Ki),
        ki && ki.addEventListener("touchstart", Ki),
        vo(bi, "contextmenu", function () {
          for (var t in so) so[t].isPressed && so[t].endDrag();
        }),
        (wi = Ei = Vi());
    }
    var r, n, i, o, s;
    wi &&
      ((Yi = wi.plugins.inertia),
      (zi = wi.core.context || function () {}),
      (Di = wi.utils.checkPrefix),
      ($i = Di($i)),
      (Qi = Di(Qi)),
      (Si = wi.utils.toArray),
      (Bi = wi.core.getStyleSaver),
      (Ii = !!Di("perspective")));
  },
  Uo = (function (t) {
    var e, r;
    function n(e, r) {
      var i;
      (i = t.call(this) || this),
        Ei || Wo(),
        (e = Si(e)[0]),
        (i.styles = Bi && Bi(e, "transform,left,top")),
        Yi || (Yi = wi.plugins.inertia),
        (i.vars = r = fo(r || {})),
        (i.target = e),
        (i.x = i.y = i.rotation = 0),
        (i.dragResistance = parseFloat(r.dragResistance) || 0),
        (i.edgeResistance = isNaN(r.edgeResistance)
          ? 1
          : parseFloat(r.edgeResistance) || 0),
        (i.lockAxis = r.lockAxis),
        (i.autoScroll = r.autoScroll || 0),
        (i.lockedAxis = null),
        (i.allowEventDefault = !!r.allowEventDefault),
        wi.getProperty(e, "x");
      var o,
        s,
        a,
        l,
        u,
        h,
        c,
        f,
        p,
        d,
        g,
        m,
        _,
        v,
        y,
        x,
        w,
        T,
        b,
        M,
        k,
        O,
        C,
        E,
        D,
        S,
        P,
        A,
        R,
        L,
        X,
        Y,
        F,
        N = (r.type || "x,y").toLowerCase(),
        z = ~N.indexOf("x") || ~N.indexOf("y"),
        B = -1 !== N.indexOf("rotation"),
        I = B ? "rotation" : z ? "x" : "left",
        H = z ? "y" : "top",
        W = !(!~N.indexOf("x") && !~N.indexOf("left") && "scroll" !== N),
        U = !(!~N.indexOf("y") && !~N.indexOf("top") && "scroll" !== N),
        V = r.minimumMovement || 2,
        q = xi(i),
        j = Si(r.trigger || r.handle || e),
        G = {},
        K = 0,
        $ = !1,
        Q = r.autoScrollMarginTop || 40,
        Z = r.autoScrollMarginRight || 40,
        J = r.autoScrollMarginBottom || 40,
        tt = r.autoScrollMarginLeft || 40,
        et = r.clickableTest || zo,
        rt = 0,
        nt = e._gsap || wi.core.getCache(e),
        it = Io(e),
        ot = function (t, r) {
          return parseFloat(nt.get(e, t, r));
        },
        st = e.ownerDocument || bi,
        at = function (t) {
          return (
            xo(t),
            t.stopImmediatePropagation && t.stopImmediatePropagation(),
            !1
          );
        },
        lt = function t(r) {
          if (q.autoScroll && q.isDragging && ($ || w)) {
            var n,
              i,
              o,
              a,
              l,
              u,
              h,
              c,
              p = e,
              d = 15 * q.autoScroll;
            for (
              $ = !1,
                co.scrollTop =
                  null != Ti.pageYOffset
                    ? Ti.pageYOffset
                    : null != st.documentElement.scrollTop
                    ? st.documentElement.scrollTop
                    : st.body.scrollTop,
                co.scrollLeft =
                  null != Ti.pageXOffset
                    ? Ti.pageXOffset
                    : null != st.documentElement.scrollLeft
                    ? st.documentElement.scrollLeft
                    : st.body.scrollLeft,
                a = q.pointerX - co.scrollLeft,
                l = q.pointerY - co.scrollTop;
              p && !i;

            )
              (n = (i = Co(p.parentNode)) ? co : p.parentNode),
                (o = i
                  ? {
                      bottom: Math.max(Mi.clientHeight, Ti.innerHeight || 0),
                      right: Math.max(Mi.clientWidth, Ti.innerWidth || 0),
                      left: 0,
                      top: 0,
                    }
                  : n.getBoundingClientRect()),
                (u = h = 0),
                U &&
                  ((c = n._gsMaxScrollY - n.scrollTop) < 0
                    ? (h = c)
                    : l > o.bottom - J && c
                    ? (($ = !0),
                      (h = Math.min(
                        c,
                        (d * (1 - Math.max(0, o.bottom - l) / J)) | 0
                      )))
                    : l < o.top + Q &&
                      n.scrollTop &&
                      (($ = !0),
                      (h = -Math.min(
                        n.scrollTop,
                        (d * (1 - Math.max(0, l - o.top) / Q)) | 0
                      ))),
                  h && (n.scrollTop += h)),
                W &&
                  ((c = n._gsMaxScrollX - n.scrollLeft) < 0
                    ? (u = c)
                    : a > o.right - Z && c
                    ? (($ = !0),
                      (u = Math.min(
                        c,
                        (d * (1 - Math.max(0, o.right - a) / Z)) | 0
                      )))
                    : a < o.left + tt &&
                      n.scrollLeft &&
                      (($ = !0),
                      (u = -Math.min(
                        n.scrollLeft,
                        (d * (1 - Math.max(0, a - o.left) / tt)) | 0
                      ))),
                  u && (n.scrollLeft += u)),
                i &&
                  (u || h) &&
                  (Ti.scrollTo(n.scrollLeft, n.scrollTop),
                  wt(q.pointerX + u, q.pointerY + h)),
                (p = n);
          }
          if (w) {
            var g = q.x,
              m = q.y;
            B
              ? ((q.deltaX = g - parseFloat(nt.rotation)),
                (q.rotation = g),
                (nt.rotation = g + "deg"),
                nt.renderTransform(1, nt))
              : s
              ? (U && ((q.deltaY = m - s.top()), s.top(m)),
                W && ((q.deltaX = g - s.left()), s.left(g)))
              : z
              ? (U && ((q.deltaY = m - parseFloat(nt.y)), (nt.y = m + "px")),
                W && ((q.deltaX = g - parseFloat(nt.x)), (nt.x = g + "px")),
                nt.renderTransform(1, nt))
              : (U &&
                  ((q.deltaY = m - parseFloat(e.style.top || 0)),
                  (e.style.top = m + "px")),
                W &&
                  ((q.deltaX = g - parseFloat(e.style.left || 0)),
                  (e.style.left = g + "px"))),
              !f ||
                r ||
                A ||
                ((A = !0),
                !1 === Lo(q, "drag", "onDrag") &&
                  (W && (q.x -= q.deltaX), U && (q.y -= q.deltaY), t(!0)),
                (A = !1));
          }
          w = !1;
        },
        ut = function (t, r) {
          var n,
            i,
            o = q.x,
            a = q.y;
          e._gsap || (nt = wi.core.getCache(e)),
            nt.uncache && wi.getProperty(e, "x"),
            z
              ? ((q.x = parseFloat(nt.x)), (q.y = parseFloat(nt.y)))
              : B
              ? (q.x = q.rotation = parseFloat(nt.rotation))
              : s
              ? ((q.y = s.top()), (q.x = s.left()))
              : ((q.y = parseFloat(e.style.top || ((i = Po(e)) && i.top)) || 0),
                (q.x = parseFloat(e.style.left || (i || {}).left) || 0)),
            (b || M || k) &&
              !r &&
              (q.isDragging || q.isThrowing) &&
              (k &&
                ((ho.x = q.x),
                (ho.y = q.y),
                (n = k(ho)).x !== q.x && ((q.x = n.x), (w = !0)),
                n.y !== q.y && ((q.y = n.y), (w = !0))),
              b &&
                (n = b(q.x)) !== q.x &&
                ((q.x = n), B && (q.rotation = n), (w = !0)),
              M && ((n = M(q.y)) !== q.y && (q.y = n), (w = !0))),
            w && lt(!0),
            t ||
              ((q.deltaX = q.x - o),
              (q.deltaY = q.y - a),
              Lo(q, "throwupdate", "onThrowUpdate"));
        },
        ht = function (t, e, r, n) {
          return (
            null == e && (e = -ro),
            null == r && (r = ro),
            qi(t)
              ? function (i) {
                  var o = q.isPressed ? 1 - q.edgeResistance : 1;
                  return (
                    t.call(
                      q,
                      (i > r ? r + (i - r) * o : i < e ? e + (i - e) * o : i) *
                        n
                    ) * n
                  );
                }
              : Ji(t)
              ? function (n) {
                  for (var i, o, s = t.length, a = 0, l = ro; --s > -1; )
                    (o = (i = t[s]) - n) < 0 && (o = -o),
                      o < l && i >= e && i <= r && ((a = s), (l = o));
                  return t[a];
                }
              : isNaN(t)
              ? function (t) {
                  return t;
                }
              : function () {
                  return t * n;
                }
          );
        },
        ct = function () {
          var t, n, i, o;
          (c = !1),
            s
              ? (s.calibrate(),
                (q.minX = g = -s.maxScrollLeft()),
                (q.minY = _ = -s.maxScrollTop()),
                (q.maxX = d = q.maxY = m = 0),
                (c = !0))
              : r.bounds &&
                ((t = Xo(r.bounds, e.parentNode)),
                B
                  ? ((q.minX = g = t.left),
                    (q.maxX = d = t.left + t.width),
                    (q.minY = _ = q.maxY = m = 0))
                  : Gi(r.bounds.maxX) && Gi(r.bounds.maxY)
                  ? ((n = Xo(e, e.parentNode)),
                    (q.minX = g = Math.round(ot(I, "px") + t.left - n.left)),
                    (q.minY = _ = Math.round(ot(H, "px") + t.top - n.top)),
                    (q.maxX = d = Math.round(g + (t.width - n.width))),
                    (q.maxY = m = Math.round(_ + (t.height - n.height))))
                  : ((t = r.bounds),
                    (q.minX = g = t.minX),
                    (q.minY = _ = t.minY),
                    (q.maxX = d = t.maxX),
                    (q.maxY = m = t.maxY)),
                g > d && ((q.minX = d), (q.maxX = d = g), (g = q.minX)),
                _ > m && ((q.minY = m), (q.maxY = m = _), (_ = q.minY)),
                B && ((q.minRotation = g), (q.maxRotation = d)),
                (c = !0)),
            r.liveSnap &&
              ((i = !0 === r.liveSnap ? r.snap || {} : r.liveSnap),
              (o = Ji(i) || qi(i)),
              B
                ? ((b = ht(o ? i : i.rotation, g, d, 1)), (M = null))
                : i.points
                ? (k = (function (t, e, r, n, i, o, s) {
                    return (
                      (o = o && o < ro ? o * o : ro),
                      qi(t)
                        ? function (a) {
                            var l,
                              u,
                              h,
                              c = q.isPressed ? 1 - q.edgeResistance : 1,
                              f = a.x,
                              p = a.y;
                            return (
                              (a.x = f =
                                f > r
                                  ? r + (f - r) * c
                                  : f < e
                                  ? e + (f - e) * c
                                  : f),
                              (a.y = p =
                                p > i
                                  ? i + (p - i) * c
                                  : p < n
                                  ? n + (p - n) * c
                                  : p),
                              (l = t.call(q, a)) !== a &&
                                ((a.x = l.x), (a.y = l.y)),
                              1 !== s && ((a.x *= s), (a.y *= s)),
                              o < ro &&
                                (u = a.x - f) * u + (h = a.y - p) * h > o &&
                                ((a.x = f), (a.y = p)),
                              a
                            );
                          }
                        : Ji(t)
                        ? function (e) {
                            for (
                              var r, n, i, s, a = t.length, l = 0, u = ro;
                              --a > -1;

                            )
                              (s =
                                (r = (i = t[a]).x - e.x) * r +
                                (n = i.y - e.y) * n) < u && ((l = a), (u = s));
                            return u <= o ? t[l] : e;
                          }
                        : function (t) {
                            return t;
                          }
                    );
                  })(o ? i : i.points, g, d, _, m, i.radius, s ? -1 : 1))
                : (W &&
                    (b = ht(
                      o ? i : i.x || i.left || i.scrollLeft,
                      g,
                      d,
                      s ? -1 : 1
                    )),
                  U &&
                    (M = ht(
                      o ? i : i.y || i.top || i.scrollTop,
                      _,
                      m,
                      s ? -1 : 1
                    ))));
        },
        ft = function () {
          (q.isThrowing = !1), Lo(q, "throwcomplete", "onThrowComplete");
        },
        pt = function () {
          q.isThrowing = !1;
        },
        dt = function (t, n) {
          var i, o, a, l;
          t && Yi
            ? (!0 === t &&
                ((i = r.snap || r.liveSnap || {}),
                (o = Ji(i) || qi(i)),
                (t = {
                  resistance:
                    (r.throwResistance || r.resistance || 1e3) / (B ? 10 : 1),
                }),
                B
                  ? (t.rotation = No(q, o ? i : i.rotation, d, g, 1, n))
                  : (W &&
                      (t[I] = No(
                        q,
                        o ? i : i.points || i.x || i.left,
                        d,
                        g,
                        s ? -1 : 1,
                        n || "x" === q.lockedAxis
                      )),
                    U &&
                      (t[H] = No(
                        q,
                        o ? i : i.points || i.y || i.top,
                        m,
                        _,
                        s ? -1 : 1,
                        n || "y" === q.lockedAxis
                      )),
                    (i.points || (Ji(i) && ji(i[0]))) &&
                      ((t.linkedProps = I + "," + H), (t.radius = i.radius)))),
              (q.isThrowing = !0),
              (l = isNaN(r.overshootTolerance)
                ? 1 === r.edgeResistance
                  ? 0
                  : 1 - q.edgeResistance + 0.2
                : r.overshootTolerance),
              t.duration ||
                (t.duration = {
                  max: Math.max(
                    r.minDuration || 0,
                    "maxDuration" in r ? r.maxDuration : 2
                  ),
                  min: isNaN(r.minDuration)
                    ? 0 === l || (ji(t) && t.resistance > 1e3)
                      ? 0
                      : 0.5
                    : r.minDuration,
                  overshoot: l,
                }),
              (q.tween = a =
                wi.to(s || e, {
                  inertia: t,
                  data: "_draggable",
                  inherit: !1,
                  onComplete: ft,
                  onInterrupt: pt,
                  onUpdate: r.fastMode ? Lo : ut,
                  onUpdateParams: r.fastMode
                    ? [q, "onthrowupdate", "onThrowUpdate"]
                    : i && i.radius
                    ? [!1, !0]
                    : [],
                })),
              r.fastMode ||
                (s && (s._skip = !0),
                a.render(1e9, !0, !0),
                ut(!0, !0),
                (q.endX = q.x),
                (q.endY = q.y),
                B && (q.endRotation = q.x),
                a.play(0),
                ut(!0, !0),
                s && (s._skip = !1)))
            : c && q.applyBounds();
        },
        gt = function (t) {
          var r,
            n = E;
          (E = yi(e.parentNode, !0)),
            t &&
              q.isPressed &&
              !E.equals(n || new vi()) &&
              ((r = n.inverse().apply({ x: a, y: l })),
              E.apply(r, r),
              (a = r.x),
              (l = r.y)),
            E.equals(no) && (E = null);
        },
        mt = function () {
          var t,
            r,
            n,
            i = 1 - q.edgeResistance,
            o = it ? Mo(st) : 0,
            f = it ? bo(st) : 0;
          z &&
            ((nt.x = ot(I, "px") + "px"),
            (nt.y = ot(H, "px") + "px"),
            nt.renderTransform()),
            gt(!1),
            (Yo.x = q.pointerX - o),
            (Yo.y = q.pointerY - f),
            E && E.apply(Yo, Yo),
            (a = Yo.x),
            (l = Yo.y),
            w && (wt(q.pointerX, q.pointerY), lt(!0)),
            (Y = yi(e)),
            s
              ? (ct(), (h = s.top()), (u = s.left()))
              : (_t() ? (ut(!0, !0), ct()) : q.applyBounds(),
                B
                  ? ((t = e.ownerSVGElement
                      ? [nt.xOrigin - e.getBBox().x, nt.yOrigin - e.getBBox().y]
                      : (Po(e)[Qi] || "0 0").split(" ")),
                    (x = q.rotationOrigin =
                      yi(e).apply({
                        x: parseFloat(t[0]) || 0,
                        y: parseFloat(t[1]) || 0,
                      })),
                    ut(!0, !0),
                    (r = q.pointerX - x.x - o),
                    (n = x.y - q.pointerY + f),
                    (u = q.x),
                    (h = q.y = Math.atan2(n, r) * eo))
                  : ((h = ot(H, "px")), (u = ot(I, "px")))),
            c &&
              i &&
              (u > d ? (u = d + (u - d) / i) : u < g && (u = g - (g - u) / i),
              B ||
                (h > m
                  ? (h = m + (h - m) / i)
                  : h < _ && (h = _ - (_ - h) / i))),
            (q.startX = u = Zi(u)),
            (q.startY = h = Zi(h));
        },
        _t = function () {
          return q.tween && q.tween.isActive();
        },
        vt = function () {
          !Ci.parentNode ||
            _t() ||
            q.isDragging ||
            Ci.parentNode.removeChild(Ci);
        },
        yt = function (t, i) {
          var u;
          if (
            !o ||
            q.isPressed ||
            !t ||
            (!(("mousedown" !== t.type && "pointerdown" !== t.type) || i) &&
              io() - rt < 30 &&
              Ri[q.pointerEvent.type])
          )
            X && t && o && xo(t);
          else {
            if (
              ((D = _t()),
              (F = !1),
              (q.pointerEvent = t),
              Ri[t.type]
                ? ((C = ~t.type.indexOf("touch")
                    ? t.currentTarget || t.target
                    : st),
                  vo(C, "touchend", Tt),
                  vo(C, "touchmove", xt),
                  vo(C, "touchcancel", Tt),
                  vo(st, "touchstart", To))
                : ((C = null), vo(st, "mousemove", xt)),
              (P = null),
              (Ni && C) ||
                (vo(st, "mouseup", Tt),
                t && t.target && vo(t.target, "mouseup", Tt)),
              (O = et.call(q, t.target) && !1 === r.dragClickables && !i))
            )
              return (
                vo(t.target, "change", Tt),
                Lo(q, "pressInit", "onPressInit"),
                Lo(q, "press", "onPress"),
                Bo(j, !0),
                void (X = !1)
              );
            var h;
            if (
              ((S =
                !(
                  !C ||
                  W === U ||
                  !1 === q.vars.allowNativeTouchScrolling ||
                  (q.vars.allowContextMenu && t && (t.ctrlKey || t.which > 2))
                ) && (W ? "y" : "x")),
              (X = !S && !q.allowEventDefault) &&
                (xo(t), vo(Ti, "touchforcechange", xo)),
              t.changedTouches
                ? ((t = v = t.changedTouches[0]), (y = t.identifier))
                : t.pointerId
                ? (y = t.pointerId)
                : (v = y = null),
              Wi++,
              (h = lt),
              oo.push(h),
              1 === oo.length && wi.ticker.add(go),
              (l = q.pointerY = t.pageY),
              (a = q.pointerX = t.pageX),
              Lo(q, "pressInit", "onPressInit"),
              (S || q.autoScroll) && Do(e.parentNode),
              !e.parentNode ||
                !q.autoScroll ||
                s ||
                B ||
                !e.parentNode._gsMaxScrollX ||
                Ci.parentNode ||
                e.getBBox ||
                ((Ci.style.width = e.parentNode.scrollWidth + "px"),
                e.parentNode.appendChild(Ci)),
              mt(),
              q.tween && q.tween.kill(),
              (q.isThrowing = !1),
              wi.killTweensOf(s || e, G, !0),
              s && wi.killTweensOf(e, { scrollTo: 1 }, !0),
              (q.tween = q.lockedAxis = null),
              (r.zIndexBoost || (!B && !s && !1 !== r.zIndexBoost)) &&
                (e.style.zIndex = n.zIndex++),
              (q.isPressed = !0),
              (f = !(!r.onDrag && !q._listeners.drag)),
              (p = !(!r.onMove && !q._listeners.move)),
              !1 !== r.cursor || r.activeCursor)
            )
              for (u = j.length; --u > -1; )
                wi.set(j[u], {
                  cursor:
                    r.activeCursor ||
                    r.cursor ||
                    ("grab" === Fi ? "grabbing" : Fi),
                });
            Lo(q, "press", "onPress");
          }
        },
        xt = function (t) {
          var r,
            n,
            i,
            s,
            u,
            h,
            c = t;
          if (o && !Li && q.isPressed && t) {
            if (((q.pointerEvent = t), (r = t.changedTouches))) {
              if ((t = r[0]) !== v && t.identifier !== y) {
                for (
                  s = r.length;
                  --s > -1 && (t = r[s]).identifier !== y && t.target !== e;

                );
                if (s < 0) return;
              }
            } else if (t.pointerId && y && t.pointerId !== y) return;
            C &&
            S &&
            !P &&
            ((Yo.x = t.pageX - (it ? Mo(st) : 0)),
            (Yo.y = t.pageY - (it ? bo(st) : 0)),
            E && E.apply(Yo, Yo),
            (n = Yo.x),
            (i = Yo.y),
            (((u = Math.abs(n - a)) !== (h = Math.abs(i - l)) &&
              (u > V || h > V)) ||
              (Xi && S === P)) &&
              ((P = u > h && W ? "x" : "y"),
              S && P !== S && vo(Ti, "touchforcechange", xo),
              !1 !== q.vars.lockAxisOnTouchScroll &&
                W &&
                U &&
                ((q.lockedAxis = "x" === P ? "y" : "x"),
                qi(q.vars.onLockAxis) && q.vars.onLockAxis.call(q, c)),
              Xi && S === P))
              ? Tt(c)
              : (q.allowEventDefault ||
                (S && (!P || S === P)) ||
                !1 === c.cancelable
                  ? X && (X = !1)
                  : (xo(c), (X = !0)),
                q.autoScroll && ($ = !0),
                wt(t.pageX, t.pageY, p));
          } else X && t && o && xo(t);
        },
        wt = function (t, e, r) {
          var n,
            i,
            o,
            s,
            f,
            p,
            v = 1 - q.dragResistance,
            y = 1 - q.edgeResistance,
            T = q.pointerX,
            O = q.pointerY,
            C = h,
            D = q.x,
            S = q.y,
            P = q.endX,
            A = q.endY,
            R = q.endRotation,
            L = w;
          (q.pointerX = t),
            (q.pointerY = e),
            it && ((t -= Mo(st)), (e -= bo(st))),
            B
              ? ((s = Math.atan2(x.y - e, t - x.x) * eo),
                (f = q.y - s) > 180
                  ? ((h -= 360), (q.y = s))
                  : f < -180 && ((h += 360), (q.y = s)),
                q.x !== u || Math.max(Math.abs(a - t), Math.abs(l - e)) > V
                  ? ((q.y = s), (o = u + (h - s) * v))
                  : (o = u))
              : (E &&
                  ((p = t * E.a + e * E.c + E.e),
                  (e = t * E.b + e * E.d + E.f),
                  (t = p)),
                (i = e - l) < V && i > -V && (i = 0),
                (n = t - a) < V && n > -V && (n = 0),
                (q.lockAxis || q.lockedAxis) &&
                  (n || i) &&
                  ((p = q.lockedAxis) ||
                    ((q.lockedAxis = p =
                      W && Math.abs(n) > Math.abs(i) ? "y" : U ? "x" : null),
                    p &&
                      qi(q.vars.onLockAxis) &&
                      q.vars.onLockAxis.call(q, q.pointerEvent)),
                  "y" === p ? (i = 0) : "x" === p && (n = 0)),
                (o = Zi(u + n * v)),
                (s = Zi(h + i * v))),
            (b || M || k) &&
              (q.x !== o || (q.y !== s && !B)) &&
              (k &&
                ((ho.x = o),
                (ho.y = s),
                (p = k(ho)),
                (o = Zi(p.x)),
                (s = Zi(p.y))),
              b && (o = Zi(b(o))),
              M && (s = Zi(M(s)))),
            c &&
              (o > d
                ? (o = d + Math.round((o - d) * y))
                : o < g && (o = g + Math.round((o - g) * y)),
              B ||
                (s > m
                  ? (s = Math.round(m + (s - m) * y))
                  : s < _ && (s = Math.round(_ + (s - _) * y)))),
            (q.x !== o || (q.y !== s && !B)) &&
              (B
                ? ((q.endRotation = q.x = q.endX = o), (w = !0))
                : (U && ((q.y = q.endY = s), (w = !0)),
                  W && ((q.x = q.endX = o), (w = !0))),
              r && !1 === Lo(q, "move", "onMove")
                ? ((q.pointerX = T),
                  (q.pointerY = O),
                  (h = C),
                  (q.x = D),
                  (q.y = S),
                  (q.endX = P),
                  (q.endY = A),
                  (q.endRotation = R),
                  (w = L))
                : !q.isDragging &&
                  q.isPressed &&
                  ((q.isDragging = F = !0), Lo(q, "dragstart", "onDragStart")));
        },
        Tt = function t(n, i) {
          if (
            o &&
            q.isPressed &&
            (!n ||
              null == y ||
              i ||
              !(
                (n.pointerId && n.pointerId !== y && n.target !== e) ||
                (n.changedTouches &&
                  !(function (t, e) {
                    for (var r = t.length; r--; )
                      if (t[r].identifier === e) return !0;
                  })(n.changedTouches, y))
              ))
          ) {
            q.isPressed = !1;
            var s,
              a,
              l,
              u,
              h,
              c = n,
              f = q.isDragging,
              p = q.vars.allowContextMenu && n && (n.ctrlKey || n.which > 2),
              d = wi.delayedCall(0.001, vt);
            if (
              (C
                ? (yo(C, "touchend", t),
                  yo(C, "touchmove", xt),
                  yo(C, "touchcancel", t),
                  yo(st, "touchstart", To))
                : yo(st, "mousemove", xt),
              yo(Ti, "touchforcechange", xo),
              (Ni && C) ||
                (yo(st, "mouseup", t),
                n && n.target && yo(n.target, "mouseup", t)),
              (w = !1),
              f && ((K = uo = io()), (q.isDragging = !1)),
              _o(lt),
              O && !p)
            )
              return (
                n && (yo(n.target, "change", t), (q.pointerEvent = c)),
                Bo(j, !1),
                Lo(q, "release", "onRelease"),
                Lo(q, "click", "onClick"),
                void (O = !1)
              );
            for (a = j.length; --a > -1; )
              So(j[a], "cursor", r.cursor || (!1 !== r.cursor ? Fi : null));
            if ((Wi--, n)) {
              if (
                (s = n.changedTouches) &&
                (n = s[0]) !== v &&
                n.identifier !== y
              ) {
                for (
                  a = s.length;
                  --a > -1 && (n = s[a]).identifier !== y && n.target !== e;

                );
                if (a < 0 && !i) return;
              }
              (q.pointerEvent = c),
                (q.pointerX = n.pageX),
                (q.pointerY = n.pageY);
            }
            return (
              p && c
                ? (xo(c), (X = !0), Lo(q, "release", "onRelease"))
                : c && !f
                ? ((X = !1),
                  D && (r.snap || r.bounds) && dt(r.inertia || r.throwProps),
                  Lo(q, "release", "onRelease"),
                  (Xi && "touchmove" === c.type) ||
                    -1 !== c.type.indexOf("cancel") ||
                    (Lo(q, "click", "onClick"),
                    io() - rt < 300 && Lo(q, "doubleclick", "onDoubleClick"),
                    (u = c.target || e),
                    (rt = io()),
                    (h = function () {
                      rt === R ||
                        !q.enabled() ||
                        q.isPressed ||
                        c.defaultPrevented ||
                        (u.click
                          ? u.click()
                          : st.createEvent &&
                            ((l = st.createEvent("MouseEvents")).initMouseEvent(
                              "click",
                              !0,
                              !0,
                              Ti,
                              1,
                              q.pointerEvent.screenX,
                              q.pointerEvent.screenY,
                              q.pointerX,
                              q.pointerY,
                              !1,
                              !1,
                              !1,
                              !1,
                              0,
                              null
                            ),
                            u.dispatchEvent(l)));
                    }),
                    Xi || c.defaultPrevented || wi.delayedCall(0.05, h)))
                : (dt(r.inertia || r.throwProps),
                  q.allowEventDefault ||
                  !c ||
                  (!1 === r.dragClickables && et.call(q, c.target)) ||
                  !f ||
                  (S && (!P || S !== P)) ||
                  !1 === c.cancelable
                    ? (X = !1)
                    : ((X = !0), xo(c)),
                  Lo(q, "release", "onRelease")),
              _t() && d.duration(q.tween.duration()),
              f && Lo(q, "dragend", "onDragEnd"),
              !0
            );
          }
          X && n && o && xo(n);
        },
        bt = function (t) {
          if (t && q.isDragging && !s) {
            var r = t.target || e.parentNode,
              n = r.scrollLeft - r._gsScrollX,
              i = r.scrollTop - r._gsScrollY;
            (n || i) &&
              (E
                ? ((a -= n * E.a + i * E.c), (l -= i * E.d + n * E.b))
                : ((a -= n), (l -= i)),
              (r._gsScrollX += n),
              (r._gsScrollY += i),
              wt(q.pointerX, q.pointerY));
          }
        },
        Mt = function (t) {
          var e = io(),
            r = e - rt < 100,
            n = e - K < 50,
            i = r && R === rt,
            o = q.pointerEvent && q.pointerEvent.defaultPrevented,
            s = r && L === rt,
            a = t.isTrusted || (null == t.isTrusted && r && i);
          if (
            ((i || (n && !1 !== q.vars.suppressClickOnDrag)) &&
              t.stopImmediatePropagation &&
              t.stopImmediatePropagation(),
            r &&
              (!q.pointerEvent || !q.pointerEvent.defaultPrevented) &&
              (!i || (a && !s)))
          )
            return a && i && (L = rt), void (R = rt);
          (q.isPressed || n || r) && ((a && t.detail && r && !o) || xo(t)),
            r ||
              n ||
              F ||
              (t && t.target && (q.pointerEvent = t),
              Lo(q, "click", "onClick"));
        },
        kt = function (t) {
          return E
            ? { x: t.x * E.a + t.y * E.c + E.e, y: t.x * E.b + t.y * E.d + E.f }
            : { x: t.x, y: t.y };
        };
      return (
        (T = n.get(e)) && T.kill(),
        (i.startDrag = function (t, r) {
          var n, i, o, s;
          yt(t || q.pointerEvent, !0),
            r &&
              !q.hitTest(t || q.pointerEvent) &&
              ((n = Ro(t || q.pointerEvent)),
              (i = Ro(e)),
              (o = kt({ x: n.left + n.width / 2, y: n.top + n.height / 2 })),
              (s = kt({ x: i.left + i.width / 2, y: i.top + i.height / 2 })),
              (a -= o.x - s.x),
              (l -= o.y - s.y)),
            q.isDragging ||
              ((q.isDragging = F = !0), Lo(q, "dragstart", "onDragStart"));
        }),
        (i.drag = xt),
        (i.endDrag = function (t) {
          return Tt(t || q.pointerEvent, !0);
        }),
        (i.timeSinceDrag = function () {
          return q.isDragging ? 0 : (io() - K) / 1e3;
        }),
        (i.timeSinceClick = function () {
          return (io() - rt) / 1e3;
        }),
        (i.hitTest = function (t, e) {
          return n.hitTest(q.target, t, e);
        }),
        (i.getDirection = function (t, r) {
          var n,
            i,
            o,
            s,
            a,
            l,
            c = "velocity" === t && Yi ? t : ji(t) && !B ? "element" : "start";
          return (
            "element" === c && ((a = Ro(q.target)), (l = Ro(t))),
            (n =
              "start" === c
                ? q.x - u
                : "velocity" === c
                ? Yi.getVelocity(e, I)
                : a.left + a.width / 2 - (l.left + l.width / 2)),
            B
              ? n < 0
                ? "counter-clockwise"
                : "clockwise"
              : ((r = r || 2),
                (i =
                  "start" === c
                    ? q.y - h
                    : "velocity" === c
                    ? Yi.getVelocity(e, H)
                    : a.top + a.height / 2 - (l.top + l.height / 2)),
                (s =
                  (o = Math.abs(n / i)) < 1 / r
                    ? ""
                    : n < 0
                    ? "left"
                    : "right"),
                o < r && ("" !== s && (s += "-"), (s += i < 0 ? "up" : "down")),
                s)
          );
        }),
        (i.applyBounds = function (t, n) {
          var i, o, s, a, l, u;
          if (t && r.bounds !== t) return (r.bounds = t), q.update(!0, n);
          if ((ut(!0), ct(), c && !_t())) {
            if (
              ((i = q.x),
              (o = q.y),
              i > d ? (i = d) : i < g && (i = g),
              o > m ? (o = m) : o < _ && (o = _),
              (q.x !== i || q.y !== o) &&
                ((s = !0),
                (q.x = q.endX = i),
                B ? (q.endRotation = i) : (q.y = q.endY = o),
                (w = !0),
                lt(!0),
                q.autoScroll && !q.isDragging))
            )
              for (
                Do(e.parentNode),
                  a = e,
                  co.scrollTop =
                    null != Ti.pageYOffset
                      ? Ti.pageYOffset
                      : null != st.documentElement.scrollTop
                      ? st.documentElement.scrollTop
                      : st.body.scrollTop,
                  co.scrollLeft =
                    null != Ti.pageXOffset
                      ? Ti.pageXOffset
                      : null != st.documentElement.scrollLeft
                      ? st.documentElement.scrollLeft
                      : st.body.scrollLeft;
                a && !u;

              )
                (l = (u = Co(a.parentNode)) ? co : a.parentNode),
                  U &&
                    l.scrollTop > l._gsMaxScrollY &&
                    (l.scrollTop = l._gsMaxScrollY),
                  W &&
                    l.scrollLeft > l._gsMaxScrollX &&
                    (l.scrollLeft = l._gsMaxScrollX),
                  (a = l);
            q.isThrowing &&
              (s || q.endX > d || q.endX < g || q.endY > m || q.endY < _) &&
              dt(r.inertia || r.throwProps, s);
          }
          return q;
        }),
        (i.update = function (t, r, n) {
          if (r && q.isPressed) {
            var i = yi(e),
              o = Y.apply({ x: q.x - u, y: q.y - h }),
              s = yi(e.parentNode, !0);
            s.apply({ x: i.e - o.x, y: i.f - o.y }, o),
              (q.x -= o.x - s.e),
              (q.y -= o.y - s.f),
              lt(!0),
              mt();
          }
          var a = q.x,
            l = q.y;
          return (
            gt(!r),
            t ? q.applyBounds() : (w && n && lt(!0), ut(!0)),
            r && (wt(q.pointerX, q.pointerY), w && lt(!0)),
            q.isPressed &&
              !r &&
              ((W && Math.abs(a - q.x) > 0.01) ||
                (U && Math.abs(l - q.y) > 0.01 && !B)) &&
              mt(),
            q.autoScroll &&
              (Do(e.parentNode, q.isDragging),
              ($ = q.isDragging),
              lt(!0),
              Oo(e, bt),
              ko(e, bt)),
            q
          );
        }),
        (i.enable = function (t) {
          var n,
            i,
            a,
            l = { lazy: !0 };
          if (
            (!1 !== r.cursor && (l.cursor = r.cursor || Fi),
            wi.utils.checkPrefix("touchCallout") && (l.touchCallout = "none"),
            "soft" !== t)
          ) {
            for (
              po(
                j,
                W === U
                  ? "none"
                  : (r.allowNativeTouchScrolling &&
                      (e.scrollHeight === e.clientHeight) ==
                        (e.scrollWidth === e.clientHeight)) ||
                    r.allowEventDefault
                  ? "manipulation"
                  : W
                  ? "pan-y"
                  : "pan-x"
              ),
                i = j.length;
              --i > -1;

            )
              (a = j[i]),
                Ni || vo(a, "mousedown", yt),
                vo(a, "touchstart", yt),
                vo(a, "click", Mt, !0),
                wi.set(a, l),
                a.getBBox &&
                  a.ownerSVGElement &&
                  W !== U &&
                  wi.set(a.ownerSVGElement, {
                    touchAction:
                      r.allowNativeTouchScrolling || r.allowEventDefault
                        ? "manipulation"
                        : W
                        ? "pan-y"
                        : "pan-x",
                  }),
                r.allowContextMenu || vo(a, "contextmenu", at);
            Bo(j, !1);
          }
          return (
            ko(e, bt),
            (o = !0),
            Yi &&
              "soft" !== t &&
              Yi.track(s || e, z ? "x,y" : B ? "rotation" : "top,left"),
            (e._gsDragID = n = e._gsDragID || "d" + ao++),
            (so[n] = q),
            s && (s.enable(), (s.element._gsDragID = n)),
            (r.bounds || B) && mt(),
            r.bounds && q.applyBounds(),
            q
          );
        }),
        (i.disable = function (t) {
          for (var r, n = q.isDragging, i = j.length; --i > -1; )
            So(j[i], "cursor", null);
          if ("soft" !== t) {
            for (po(j, null), i = j.length; --i > -1; )
              (r = j[i]),
                So(r, "touchCallout", null),
                yo(r, "mousedown", yt),
                yo(r, "touchstart", yt),
                yo(r, "click", Mt, !0),
                yo(r, "contextmenu", at);
            Bo(j, !0),
              C &&
                (yo(C, "touchcancel", Tt),
                yo(C, "touchend", Tt),
                yo(C, "touchmove", xt)),
              yo(st, "mouseup", Tt),
              yo(st, "mousemove", xt);
          }
          return (
            Oo(e, bt),
            (o = !1),
            Yi &&
              "soft" !== t &&
              (Yi.untrack(s || e, z ? "x,y" : B ? "rotation" : "top,left"),
              q.tween && q.tween.kill()),
            s && s.disable(),
            _o(lt),
            (q.isDragging = q.isPressed = O = !1),
            n && Lo(q, "dragend", "onDragEnd"),
            q
          );
        }),
        (i.enabled = function (t, e) {
          return arguments.length ? (t ? q.enable(e) : q.disable(e)) : o;
        }),
        (i.kill = function () {
          return (
            (q.isThrowing = !1),
            q.tween && q.tween.kill(),
            q.disable(),
            wi.set(j, { clearProps: "userSelect" }),
            delete so[e._gsDragID],
            q
          );
        }),
        (i.revert = function () {
          this.kill(), this.styles && this.styles.revert();
        }),
        ~N.indexOf("scroll") &&
          ((s = i.scrollProxy =
            new Ho(
              e,
              (function (t, e) {
                for (var r in e) r in t || (t[r] = e[r]);
                return t;
              })(
                {
                  onKill: function () {
                    q.isPressed && Tt(null);
                  },
                },
                r
              )
            )),
          (e.style.overflowY = U && !Ai ? "auto" : "hidden"),
          (e.style.overflowX = W && !Ai ? "auto" : "hidden"),
          (e = s.content)),
        B ? (G.rotation = 1) : (W && (G[I] = 1), U && (G[H] = 1)),
        (nt.force3D = !("force3D" in r) || r.force3D),
        zi(xi(i)),
        i.enable(),
        i
      );
    }
    return (
      (r = t),
      ((e = n).prototype = Object.create(r.prototype)),
      (e.prototype.constructor = e),
      (e.__proto__ = r),
      (n.register = function (t) {
        (wi = t), Wo();
      }),
      (n.create = function (t, e) {
        return (
          Ei || Wo(),
          Si(t).map(function (t) {
            return new n(t, e);
          })
        );
      }),
      (n.get = function (t) {
        return so[(Si(t)[0] || {})._gsDragID];
      }),
      (n.timeSinceDrag = function () {
        return (io() - uo) / 1e3;
      }),
      (n.hitTest = function (t, e, r) {
        if (t === e) return !1;
        var n,
          i,
          o,
          s = Ro(t),
          a = Ro(e),
          l = s.top,
          u = s.left,
          h = s.right,
          c = s.bottom,
          f = s.width,
          p = s.height,
          d = a.left > h || a.right < u || a.top > c || a.bottom < l;
        return d || !r
          ? !d
          : ((o = -1 !== (r + "").indexOf("%")),
            (r = parseFloat(r) || 0),
            ((n = {
              left: Math.max(u, a.left),
              top: Math.max(l, a.top),
            }).width = Math.min(h, a.right) - n.left),
            (n.height = Math.min(c, a.bottom) - n.top),
            !(n.width < 0 || n.height < 0) &&
              (o
                ? ((r *= 0.01),
                  (i = n.width * n.height) >= f * p * r ||
                    i >= a.width * a.height * r)
                : n.width > r && n.height > r));
      }),
      n
    );
  })(
    (function () {
      function t(t) {
        (this._listeners = {}), (this.target = t || this);
      }
      var e = t.prototype;
      return (
        (e.addEventListener = function (t, e) {
          var r = this._listeners[t] || (this._listeners[t] = []);
          ~r.indexOf(e) || r.push(e);
        }),
        (e.removeEventListener = function (t, e) {
          var r = this._listeners[t],
            n = r && r.indexOf(e);
          n >= 0 && r.splice(n, 1);
        }),
        (e.dispatchEvent = function (t) {
          var e,
            r = this;
          return (
            (this._listeners[t] || []).forEach(function (n) {
              return (
                !1 === n.call(r, { type: t, target: r.target }) && (e = !1)
              );
            }),
            e
          );
        }),
        t
      );
    })()
  );
!(function (t, e) {
  for (var r in e) r in t || (t[r] = e[r]);
})(Uo.prototype, {
  pointerX: 0,
  pointerY: 0,
  startX: 0,
  startY: 0,
  deltaX: 0,
  deltaY: 0,
  isDragging: !1,
  isPressed: !1,
}),
  (Uo.zIndex = 1e3),
  (Uo.version = "3.13.0"),
  Vi() && wi.registerPlugin(Uo);
var Vo,
  qo,
  jo,
  Go,
  Ko,
  $o,
  Qo,
  Zo,
  Jo = function () {
    return Vo || ("undefined" != typeof window && (Vo = window.gsap));
  },
  ts = {},
  es = function (t) {
    return Zo(t).id;
  },
  rs = function (t) {
    return ts[es("string" == typeof t ? jo(t)[0] : t)];
  },
  ns = function (t) {
    var e,
      r = Ko;
    if (t - Qo >= 0.05)
      for (Qo = t; r; )
        ((e = r.g(r.t, r.p)) !== r.v1 || t - r.t1 > 0.2) &&
          ((r.v2 = r.v1), (r.v1 = e), (r.t2 = r.t1), (r.t1 = t)),
          (r = r._next);
  },
  is = { deg: 360, rad: 2 * Math.PI },
  os = function () {
    (Vo = Jo()) &&
      ((jo = Vo.utils.toArray),
      (Go = Vo.utils.getUnit),
      (Zo = Vo.core.getCache),
      ($o = Vo.ticker),
      (qo = 1));
  },
  ss = function (t, e, r, n) {
    (this.t = t),
      (this.p = e),
      (this.g = t._gsap.get),
      (this.rCap = is[r || Go(this.g(t, e))]),
      (this.v1 = this.v2 = 0),
      (this.t1 = this.t2 = $o.time),
      n && ((this._next = n), (n._prev = this));
  },
  as = (function () {
    function t(t, e) {
      qo || os(),
        (this.target = jo(t)[0]),
        (ts[es(this.target)] = this),
        (this._props = {}),
        e && this.add(e);
    }
    t.register = function (t) {
      (Vo = t), os();
    };
    var e = t.prototype;
    return (
      (e.get = function (t, e) {
        var r,
          n,
          i,
          o = this._props[t] || void 0;
        return (
          (r = parseFloat(e ? o.v1 : o.g(o.t, o.p)) - parseFloat(o.v2)),
          (n = o.rCap) &&
            (r %= n) !== r % (n / 2) &&
            (r = r < 0 ? r + n : r - n),
          (i = r / ((e ? o.t1 : $o.time) - o.t2)),
          Math.round(1e4 * i) / 1e4
        );
      }),
      (e.getAll = function () {
        var t,
          e = {},
          r = this._props;
        for (t in r) e[t] = this.get(t);
        return e;
      }),
      (e.isTracking = function (t) {
        return t in this._props;
      }),
      (e.add = function (t, e) {
        t in this._props ||
          (Ko || ($o.add(ns), (Qo = $o.time)),
          (Ko = this._props[t] = new ss(this.target, t, e, Ko)));
      }),
      (e.remove = function (t) {
        var e,
          r,
          n = this._props[t];
        n &&
          ((e = n._prev),
          (r = n._next),
          e && (e._next = r),
          r ? (r._prev = e) : Ko === n && ($o.remove(ns), (Ko = 0)),
          delete this._props[t]);
      }),
      (e.kill = function (t) {
        for (var e in this._props) this.remove(e);
        t || delete ts[es(this.target)];
      }),
      (t.track = function (e, r, n) {
        qo || os();
        for (
          var i,
            o,
            s = [],
            a = jo(e),
            l = r.split(","),
            u = (n || "").split(","),
            h = a.length;
          h--;

        ) {
          for (i = rs(a[h]) || new t(a[h]), o = l.length; o--; )
            i.add(l[o], u[o] || u[0]);
          s.push(i);
        }
        return s;
      }),
      (t.untrack = function (t, e) {
        var r = (e || "").split(",");
        jo(t).forEach(function (t) {
          var e = rs(t);
          e &&
            (r.length
              ? r.forEach(function (t) {
                  return e.remove(t);
                })
              : e.kill(1));
        });
      }),
      (t.isTracking = function (t, e) {
        var r = rs(t);
        return r && r.isTracking(e);
      }),
      (t.getVelocity = function (t, e) {
        var r = rs(t);
        return r && r.isTracking(e) ? r.get(e) : void 0;
      }),
      t
    );
  })();
(as.getByTarget = rs), Jo() && Vo.registerPlugin(as);
var ls,
  us,
  hs,
  cs,
  fs,
  ps,
  ds,
  gs,
  ms,
  _s,
  vs,
  ys,
  xs,
  ws,
  Ts = as.getByTarget,
  bs = function () {
    return (
      ls ||
      ("undefined" != typeof window &&
        (ls = window.gsap) &&
        ls.registerPlugin &&
        ls)
    );
  },
  Ms = function (t) {
    return "number" == typeof t;
  },
  ks = function (t) {
    return "object" == typeof t;
  },
  Os = function (t) {
    return "function" == typeof t;
  },
  Cs = Array.isArray,
  Es = function (t) {
    return t;
  },
  Ds = 1e10,
  Ss = function (t) {
    return Math.round(1e4 * t) / 1e4;
  },
  Ps = function (t, e, r) {
    for (var n in e) n in t || n === r || (t[n] = e[n]);
    return t;
  },
  As = function t(e) {
    var r,
      n,
      i = {};
    for (r in e) i[r] = ks((n = e[r])) && !Cs(n) ? t(n) : n;
    return i;
  },
  Rs = function (t, e, r, n, i) {
    var o,
      s,
      a,
      l,
      u = e.length,
      h = 0,
      c = Ds;
    if (ks(t)) {
      for (; u--; ) {
        for (a in ((o = e[u]), (s = 0), t)) s += (l = o[a] - t[a]) * l;
        s < c && ((h = u), (c = s));
      }
      if ((i || Ds) < Ds && i < Math.sqrt(c)) return t;
    } else
      for (; u--; )
        (s = (o = e[u]) - t) < 0 && (s = -s),
          s < c && o >= n && o <= r && ((h = u), (c = s));
    return e[h];
  },
  Ls = function (t, e, r, n, i, o, s) {
    if ("auto" === t.end) return t;
    var a,
      l,
      u = t.end;
    if (((r = isNaN(r) ? Ds : r), (n = isNaN(n) ? -Ds : n), ks(e))) {
      if (
        ((a = e.calculated ? e : (Os(u) ? u(e, s) : Rs(e, u, r, n, o)) || e),
        !e.calculated)
      ) {
        for (l in a) e[l] = a[l];
        e.calculated = !0;
      }
      a = a[i];
    } else a = Os(u) ? u(e, s) : Cs(u) ? Rs(e, u, r, n, o) : parseFloat(u);
    return (
      a > r ? (a = r) : a < n && (a = n),
      { max: a, min: a, unitFactor: t.unitFactor }
    );
  },
  Xs = function (t, e, r) {
    return isNaN(t[e]) ? r : +t[e];
  },
  Ys = function (t, e) {
    return (0.05 * e * t) / _s;
  },
  Fs = function (t, e, r) {
    return Math.abs(((e - t) * _s) / r / 0.05);
  },
  Ns = {
    resistance: 1,
    checkpoint: 1,
    preventOvershoot: 1,
    linkedProps: 1,
    radius: 1,
    duration: 1,
  },
  zs = function (t, e, r, n) {
    if (e.linkedProps) {
      var i,
        o,
        s,
        a,
        l,
        u,
        h = e.linkedProps.split(","),
        c = {};
      for (i = 0; i < h.length; i++)
        (s = e[(o = h[i])]) &&
          ((a = Ms(s.velocity)
            ? s.velocity
            : (l = l || Ts(t)) && l.isTracking(o)
            ? l.get(o)
            : 0),
          (u = Math.abs(a / Xs(s, "resistance", n))),
          (c[o] = parseFloat(r(t, o)) + Ys(a, u)));
      return c;
    }
  },
  Bs = function () {
    (ls = bs()) &&
      ((hs = ls.parseEase),
      (cs = ls.utils.toArray),
      (ds = ls.utils.getUnit),
      (ms = ls.core.getCache),
      (vs = ls.utils.clamp),
      (xs = ls.core.getStyleSaver),
      (ws = ls.core.reverting || function () {}),
      (fs = hs("power3")),
      (_s = fs(0.05)),
      (gs = ls.core.PropTween),
      ls.config({
        resistance: 100,
        unitFactors: {
          time: 1e3,
          totalTime: 1e3,
          progress: 1e3,
          totalProgress: 1e3,
        },
      }),
      (ps = ls.config()),
      ls.registerPlugin(as),
      (us = 1));
  },
  Is = {
    version: "3.13.0",
    name: "inertia",
    register: function (t) {
      (ls = t), Bs();
    },
    init: function (t, e, r, n, i) {
      us || Bs();
      var o = Ts(t);
      if ("auto" === e) {
        if (!o) return;
        e = o.getAll();
      }
      (this.styles = xs && "object" == typeof t.style && xs(t)),
        (this.target = t),
        (this.tween = r),
        (ys = e);
      var s,
        a,
        l,
        u,
        h,
        c,
        f,
        p,
        d,
        g = t._gsap,
        m = g.get,
        _ = e.duration,
        v = ks(_),
        y = e.preventOvershoot || (v && 0 === _.overshoot),
        x = Xs(e, "resistance", ps.resistance),
        w = Ms(_)
          ? _
          : (function (t, e, r, n, i, o) {
              if (
                (void 0 === r && (r = 10),
                void 0 === n && (n = 0.2),
                void 0 === i && (i = 1),
                void 0 === o && (o = 0),
                "string" == typeof t && (t = cs(t)[0]),
                !t)
              )
                return 0;
              var s,
                a,
                l,
                u,
                h,
                c,
                f,
                p,
                d,
                g,
                m = 0,
                _ = Ds,
                v = e.inertia || e,
                y = ms(t).get,
                x = Xs(v, "resistance", ps.resistance);
              for (s in ((g = zs(t, v, y, x)), v))
                Ns[s] ||
                  ((a = v[s]),
                  ks(a) ||
                    ((p = p || Ts(t)) && p.isTracking(s)
                      ? (a = Ms(a) ? { velocity: a } : { velocity: p.get(s) })
                      : ((u = +a || 0), (l = Math.abs(u / x)))),
                  ks(a) &&
                    ((u = Ms(a.velocity)
                      ? a.velocity
                      : (p = p || Ts(t)) && p.isTracking(s)
                      ? p.get(s)
                      : 0),
                    (l = vs(n, r, Math.abs(u / Xs(a, "resistance", x)))),
                    (c = (h = parseFloat(y(t, s)) || 0) + Ys(u, l)),
                    "end" in a &&
                      ((a = Ls(
                        a,
                        g && s in g ? g : c,
                        a.max,
                        a.min,
                        s,
                        v.radius,
                        u
                      )),
                      o &&
                        (ys === e && (ys = v = As(e)),
                        (v[s] = Ps(a, v[s], "end")))),
                    "max" in a && c > +a.max + 1e-10
                      ? ((d = a.unitFactor || ps.unitFactors[s] || 1),
                        (f =
                          (h > a.max && a.min !== a.max) ||
                          (u * d > -15 && u * d < 45)
                            ? n + 0.1 * (r - n)
                            : Fs(h, a.max, u)) +
                          i <
                          _ && (_ = f + i))
                      : "min" in a &&
                        c < +a.min - 1e-10 &&
                        ((d = a.unitFactor || ps.unitFactors[s] || 1),
                        (f =
                          (h < a.min && a.min !== a.max) ||
                          (u * d > -45 && u * d < 15)
                            ? n + 0.1 * (r - n)
                            : Fs(h, a.min, u)) +
                          i <
                          _ && (_ = f + i)),
                    f > m && (m = f)),
                  l > m && (m = l));
              return m > _ && (m = _), m > r ? r : m < n ? n : m;
            })(
              t,
              e,
              (v && _.max) || 10,
              (v && _.min) || 0.2,
              v && "overshoot" in _ ? +_.overshoot : y ? 0 : 1,
              !0
            );
      for (s in ((e = ys), (ys = 0), (d = zs(t, e, m, x)), e))
        Ns[s] ||
          ((a = e[s]),
          Os(a) && (a = a(n, t, i)),
          Ms(a)
            ? (h = a)
            : ks(a) && !isNaN(a.velocity)
            ? (h = +a.velocity)
            : o && o.isTracking(s) && (h = o.get(s)),
          (c = Ys(h, w)),
          (p = 0),
          (l = m(t, s)),
          (u = ds(l)),
          (l = parseFloat(l)),
          ks(a) &&
            ((f = l + c),
            "end" in a &&
              (a = Ls(a, d && s in d ? d : f, a.max, a.min, s, e.radius, h)),
            "max" in a && +a.max < f
              ? y || a.preventOvershoot
                ? (c = a.max - l)
                : (p = a.max - l - c)
              : "min" in a &&
                +a.min > f &&
                (y || a.preventOvershoot
                  ? (c = a.min - l)
                  : (p = a.min - l - c))),
          this._props.push(s),
          this.styles && this.styles.save(s),
          (this._pt = new gs(this._pt, t, s, l, 0, Es, 0, g.set(t, s, this))),
          (this._pt.u = u || 0),
          (this._pt.c1 = c),
          (this._pt.c2 = p));
      return r.duration(w), 1;
    },
    render: function (t, e) {
      var r = e._pt;
      if ((t = fs(e.tween._time / e.tween._dur)) || !ws())
        for (; r; )
          r.set(r.t, r.p, Ss(r.s + r.c1 * t + r.c2 * t * t) + r.u, r.d, t),
            (r = r._next);
      else e.styles.revert();
    },
  };
"track,untrack,isTracking,getVelocity,getByTarget"
  .split(",")
  .forEach(function (t) {
    return (Is[t] = as[t]);
  }),
  bs() && ls.registerPlugin(Is);
let Hs = "undefined" != typeof document ? e : r,
  Ws = (t) => t && !Array.isArray(t) && "object" == typeof t,
  Us = [],
  Vs = {},
  qs = Zn;
const js = (e, r = Us) => {
  let n = Vs;
  Ws(e)
    ? ((n = e), (e = null), (r = "dependencies" in n ? n.dependencies : Us))
    : Ws(r) && ((n = r), (r = "dependencies" in n ? n.dependencies : Us));
  const { scope: i, revertOnUpdate: o } = n,
    s = t(!1),
    a = t(qs.context(() => {}, i)),
    l = t((t) => a.current.add(null, t)),
    u = r && r.length && !o;
  return (
    u && Hs(() => ((s.current = !0), () => a.current.revert()), Us),
    Hs(() => {
      if ((e && a.current.add(e, i), !u || !s.current))
        return () => a.current.revert();
    }, r),
    { context: a.current, contextSafe: l.current }
  );
};
(js.register = (t) => {
  qs = t;
}),
  (js.headless = !0),
  Zn.registerPlugin(Uo, Is);
export { Uo as Draggable, Is as InertiaPlugin, Zn as gsap, js as useGSAP };
