import { D as wa, g as Da, a as Ta } from "./main-C14CSr-v.js";
import { randomFillSync as Ra, randomUUID as qa } from "node:crypto";
const Na = wa("musicbrainz-api-node");
function Ma(e) {
  const a = e?.cause?.code ?? e?.code;
  return typeof a == "string" && a === "ECONNRESET";
}
class xa {
  constructor(a) {
    this.httpOptions = a;
  }
  get(a, r) {
    return this._fetch("get", a, r);
  }
  post(a, r) {
    return this._fetch("post", a, r);
  }
  postForm(a, r, u) {
    const i = new URLSearchParams(r).toString();
    return this._fetch("post", a, { ...u, body: i, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  }
  postJson(a, r, u) {
    const i = JSON.stringify(r);
    return this._fetch("post", a, { ...u, body: i, headers: { "Content-Type": "application/json." } });
  }
  async _fetch(a, r, u) {
    u || (u = {});
    let i = u.retryLimit && u.retryLimit > 1 ? u.retryLimit : 1;
    const v = this.httpOptions.timeout ? this.httpOptions.timeout : 500, g = this._buildUrl(r, u.query), h = await this.getCookies(), p = new Headers(u.headers);
    for (p.set("User-Agent", this.httpOptions.userAgent), h !== null && p.set("Cookie", h); i > 0; ) {
      let f;
      try {
        f = await fetch(g, {
          method: a,
          ...u,
          headers: p,
          body: u.body,
          redirect: u.followRedirects === !1 ? "manual" : "follow"
        });
      } catch (d) {
        if (Ma(d)) {
          await this._delay(v);
          continue;
        }
        throw d;
      }
      if ((f.status === 429 || f.status === 503) && (Na(`Received status=${f.status}, assume reached rate limit, retry in ${v} ms`), i--, i > 0)) {
        await this._delay(v);
        continue;
      }
      return await this.registerCookies(f), f;
    }
    throw new Error(`Failed to fetch ${g} after retries`);
  }
  // Helper: Builds URL with query string
  _buildUrl(a, r) {
    let u = a.startsWith("/") ? `${this.httpOptions.baseUrl}${a}` : `${this.httpOptions.baseUrl}/${a}`;
    if (r) {
      const i = new URLSearchParams();
      for (const v of Object.keys(r)) {
        const g = r[v];
        (Array.isArray(g) ? g : [g]).forEach((h) => {
          i.append(v, h);
        });
      }
      u += `?${i.toString()}`;
    }
    return u;
  }
  // Helper: Delays execution
  _delay(a) {
    return new Promise((r) => setTimeout(r, a));
  }
  registerCookies(a) {
    return Promise.resolve(void 0);
  }
  async getCookies() {
    return Promise.resolve(null);
  }
}
var Z;
(function(e) {
  e[e.CONTINUE = 100] = "CONTINUE", e[e.SWITCHING_PROTOCOLS = 101] = "SWITCHING_PROTOCOLS", e[e.PROCESSING = 102] = "PROCESSING", e[e.EARLY_HINTS = 103] = "EARLY_HINTS", e[e.OK = 200] = "OK", e[e.CREATED = 201] = "CREATED", e[e.ACCEPTED = 202] = "ACCEPTED", e[e.NON_AUTHORITATIVE_INFORMATION = 203] = "NON_AUTHORITATIVE_INFORMATION", e[e.NO_CONTENT = 204] = "NO_CONTENT", e[e.RESET_CONTENT = 205] = "RESET_CONTENT", e[e.PARTIAL_CONTENT = 206] = "PARTIAL_CONTENT", e[e.MULTI_STATUS = 207] = "MULTI_STATUS", e[e.MULTIPLE_CHOICES = 300] = "MULTIPLE_CHOICES", e[e.MOVED_PERMANENTLY = 301] = "MOVED_PERMANENTLY", e[e.MOVED_TEMPORARILY = 302] = "MOVED_TEMPORARILY", e[e.SEE_OTHER = 303] = "SEE_OTHER", e[e.NOT_MODIFIED = 304] = "NOT_MODIFIED", e[e.USE_PROXY = 305] = "USE_PROXY", e[e.TEMPORARY_REDIRECT = 307] = "TEMPORARY_REDIRECT", e[e.PERMANENT_REDIRECT = 308] = "PERMANENT_REDIRECT", e[e.BAD_REQUEST = 400] = "BAD_REQUEST", e[e.UNAUTHORIZED = 401] = "UNAUTHORIZED", e[e.PAYMENT_REQUIRED = 402] = "PAYMENT_REQUIRED", e[e.FORBIDDEN = 403] = "FORBIDDEN", e[e.NOT_FOUND = 404] = "NOT_FOUND", e[e.METHOD_NOT_ALLOWED = 405] = "METHOD_NOT_ALLOWED", e[e.NOT_ACCEPTABLE = 406] = "NOT_ACCEPTABLE", e[e.PROXY_AUTHENTICATION_REQUIRED = 407] = "PROXY_AUTHENTICATION_REQUIRED", e[e.REQUEST_TIMEOUT = 408] = "REQUEST_TIMEOUT", e[e.CONFLICT = 409] = "CONFLICT", e[e.GONE = 410] = "GONE", e[e.LENGTH_REQUIRED = 411] = "LENGTH_REQUIRED", e[e.PRECONDITION_FAILED = 412] = "PRECONDITION_FAILED", e[e.REQUEST_TOO_LONG = 413] = "REQUEST_TOO_LONG", e[e.REQUEST_URI_TOO_LONG = 414] = "REQUEST_URI_TOO_LONG", e[e.UNSUPPORTED_MEDIA_TYPE = 415] = "UNSUPPORTED_MEDIA_TYPE", e[e.REQUESTED_RANGE_NOT_SATISFIABLE = 416] = "REQUESTED_RANGE_NOT_SATISFIABLE", e[e.EXPECTATION_FAILED = 417] = "EXPECTATION_FAILED", e[e.IM_A_TEAPOT = 418] = "IM_A_TEAPOT", e[e.INSUFFICIENT_SPACE_ON_RESOURCE = 419] = "INSUFFICIENT_SPACE_ON_RESOURCE", e[e.METHOD_FAILURE = 420] = "METHOD_FAILURE", e[e.MISDIRECTED_REQUEST = 421] = "MISDIRECTED_REQUEST", e[e.UNPROCESSABLE_ENTITY = 422] = "UNPROCESSABLE_ENTITY", e[e.LOCKED = 423] = "LOCKED", e[e.FAILED_DEPENDENCY = 424] = "FAILED_DEPENDENCY", e[e.UPGRADE_REQUIRED = 426] = "UPGRADE_REQUIRED", e[e.PRECONDITION_REQUIRED = 428] = "PRECONDITION_REQUIRED", e[e.TOO_MANY_REQUESTS = 429] = "TOO_MANY_REQUESTS", e[e.REQUEST_HEADER_FIELDS_TOO_LARGE = 431] = "REQUEST_HEADER_FIELDS_TOO_LARGE", e[e.UNAVAILABLE_FOR_LEGAL_REASONS = 451] = "UNAVAILABLE_FOR_LEGAL_REASONS", e[e.INTERNAL_SERVER_ERROR = 500] = "INTERNAL_SERVER_ERROR", e[e.NOT_IMPLEMENTED = 501] = "NOT_IMPLEMENTED", e[e.BAD_GATEWAY = 502] = "BAD_GATEWAY", e[e.SERVICE_UNAVAILABLE = 503] = "SERVICE_UNAVAILABLE", e[e.GATEWAY_TIMEOUT = 504] = "GATEWAY_TIMEOUT", e[e.HTTP_VERSION_NOT_SUPPORTED = 505] = "HTTP_VERSION_NOT_SUPPORTED", e[e.INSUFFICIENT_STORAGE = 507] = "INSUFFICIENT_STORAGE", e[e.NETWORK_AUTHENTICATION_REQUIRED = 511] = "NETWORK_AUTHENTICATION_REQUIRED";
})(Z || (Z = {}));
var Ce = { exports: {} }, Ye;
function Ua() {
  return Ye || (Ye = 1, (function(e) {
    var a = "a-zA-Z_À-ÖØ-öø-ÿͰ-ͽͿ-῿‌-‍⁰-↏Ⰰ-⿿、-퟿豈-﷏ﷰ-�", r = "-.0-9·̀-ͯ‿⁀", u = new RegExp("^([^" + a + "])|^((x|X)(m|M)(l|L))|([^" + a + r + "])", "g"), i = /[^\x09\x0A\x0D\x20-\xFF\x85\xA0-\uD7FF\uE000-\uFDCF\uFDE0-\uFFFD]/gm, v = function(f, d) {
      var z = function(j, w, P, _, x) {
        var l = d.indent !== void 0 ? d.indent : "	", c = d.prettyPrint ? `
` + new Array(_).join(l) : "";
        d.removeIllegalNameCharacters && (j = j.replace(u, "_"));
        var t = [c, "<", j, P || ""];
        return w && w.length > 0 || d.html ? (t.push(">"), t.push(w), x && t.push(c), t.push("</"), t.push(j), t.push(">")) : t.push("/>"), t.join("");
      };
      return (function j(w, P, _) {
        var x = typeof w;
        switch ((Array.isArray ? Array.isArray(w) : w instanceof Array) ? x = "array" : w instanceof Date && (x = "date"), x) {
          //if value is an array create child nodes from values
          case "array":
            var l = [];
            return w.map(function(M) {
              l.push(j(M, 1, _ + 1));
            }), d.prettyPrint && l.push(`
`), l.join("");
          case "date":
            return w.toJSON ? w.toJSON() : w + "";
          case "object":
            if (P == 1 && w.name) {
              var c = [], t = [];
              if (w.attrs)
                if (typeof w.attrs != "object")
                  t.push(" "), t.push(w.attrs);
                else
                  for (var n in w.attrs) {
                    var s = w.attrs[n];
                    t.push(" "), t.push(n), t.push('="'), t.push(d.escape ? h(s) : s), t.push('"');
                  }
              if (typeof w.value < "u") {
                var o = "" + w.value;
                c.push(d.escape && !w.noescape ? h(o) : o);
              } else if (typeof w.text < "u") {
                var o = "" + w.text;
                c.push(d.escape && !w.noescape ? h(o) : o);
              }
              return w.children && c.push(j(w.children, 0, _ + 1)), z(w.name, c.join(""), t.join(""), _, !!w.children);
            } else {
              var y = [];
              for (var T in w)
                y.push(z(T, j(w[T], 0, _ + 1), null, _ + 1));
              return d.prettyPrint && y.length > 0 && y.push(`
`), y.join("");
            }
          case "function":
            return w();
          default:
            return d.escape ? h(w) : "" + w;
        }
      })(f, 0, 0);
    }, g = function(f) {
      var d = ['<?xml version="1.0" encoding="utf-8"'];
      return f && d.push(' standalone="yes"'), d.push("?>"), d.join("");
    };
    e.exports = function(f, d) {
      var z = typeof Buffer < "u" ? Buffer : function() {
      };
      if (typeof f == "string" || f instanceof z)
        try {
          f = JSON.parse(f.toString());
        } catch {
          return !1;
        }
      var j = "", w = "";
      d && (typeof d == "object" ? (d.xmlHeader && (j = g(!!d.xmlHeader.standalone)), typeof d.docType < "u" && (w = "<!DOCTYPE " + d.docType + ">")) : j = g()), d = d || {};
      var P = [
        j,
        d.prettyPrint && w ? `
` : "",
        w,
        v(f, d)
      ];
      return P.join("");
    }, e.exports.json_to_xml = e.exports.obj_to_xml = e.exports, e.exports.escape = h;
    function h(f) {
      return ("" + f).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;").replace(i, "");
    }
    e.exports.cdata = p;
    function p(f) {
      return f ? "<![CDATA[" + f.replace(/]]>/g, "") + "]]>" : "<![CDATA[]]>";
    }
  })(Ce)), Ce.exports;
}
Ua();
var Pe = {}, te = {}, me = {}, Qe;
function Me() {
  if (Qe) return me;
  Qe = 1, Object.defineProperty(me, "__esModule", { value: !0 }), me.pathMatch = e;
  function e(a, r) {
    return !!(r === a || a.indexOf(r) === 0 && (r[r.length - 1] === "/" || a.startsWith(r) && a[r.length] === "/"));
  }
  return me;
}
var de = {}, he = {};
function La(e, a) {
  return e.endsWith(a) ? e.length === a.length || e[e.length - a.length - 1] === "." : !1;
}
function Fa(e, a) {
  const r = e.length - a.length - 2, u = e.lastIndexOf(".", r);
  return u === -1 ? e : e.slice(u + 1);
}
function Ba(e, a, r) {
  if (r.validHosts !== null) {
    const i = r.validHosts;
    for (const v of i)
      if (
        /*@__INLINE__*/
        La(a, v)
      )
        return v;
  }
  let u = 0;
  if (a.startsWith("."))
    for (; u < a.length && a[u] === "."; )
      u += 1;
  return e.length === a.length - u ? null : (
    /*@__INLINE__*/
    Fa(a, e)
  );
}
function $a(e, a) {
  return e.slice(0, -a.length - 1);
}
function Xe(e, a) {
  let r = 0, u = e.length, i = !1;
  if (!a) {
    if (e.startsWith("data:"))
      return null;
    for (; r < e.length && e.charCodeAt(r) <= 32; )
      r += 1;
    for (; u > r + 1 && e.charCodeAt(u - 1) <= 32; )
      u -= 1;
    if (e.charCodeAt(r) === 47 && e.charCodeAt(r + 1) === 47)
      r += 2;
    else {
      const f = e.indexOf(":/", r);
      if (f !== -1) {
        const d = f - r, z = e.charCodeAt(r), j = e.charCodeAt(r + 1), w = e.charCodeAt(r + 2), P = e.charCodeAt(r + 3), _ = e.charCodeAt(r + 4);
        if (!(d === 5 && z === 104 && j === 116 && w === 116 && P === 112 && _ === 115)) {
          if (!(d === 4 && z === 104 && j === 116 && w === 116 && P === 112)) {
            if (!(d === 3 && z === 119 && j === 115 && w === 115)) {
              if (!(d === 2 && z === 119 && j === 115)) for (let x = r; x < f; x += 1) {
                const l = e.charCodeAt(x) | 32;
                if (!(l >= 97 && l <= 122 || // [a, z]
                l >= 48 && l <= 57 || // [0, 9]
                l === 46 || // '.'
                l === 45 || // '-'
                l === 43))
                  return null;
              }
            }
          }
        }
        for (r = f + 2; e.charCodeAt(r) === 47; )
          r += 1;
      }
    }
    let g = -1, h = -1, p = -1;
    for (let f = r; f < u; f += 1) {
      const d = e.charCodeAt(f);
      if (d === 35 || // '#'
      d === 47 || // '/'
      d === 63) {
        u = f;
        break;
      } else d === 64 ? g = f : d === 93 ? h = f : d === 58 ? p = f : d >= 65 && d <= 90 && (i = !0);
    }
    if (g !== -1 && g > r && g < u && (r = g + 1), e.charCodeAt(r) === 91)
      return h !== -1 ? e.slice(r + 1, h).toLowerCase() : null;
    p !== -1 && p > r && p < u && (u = p);
  }
  for (; u > r + 1 && e.charCodeAt(u - 1) === 46; )
    u -= 1;
  const v = r !== 0 || u !== e.length ? e.slice(r, u) : e;
  return i ? v.toLowerCase() : v;
}
function Ha(e) {
  if (e.length < 7 || e.length > 15)
    return !1;
  let a = 0;
  for (let r = 0; r < e.length; r += 1) {
    const u = e.charCodeAt(r);
    if (u === 46)
      a += 1;
    else if (u < 48 || u > 57)
      return !1;
  }
  return a === 3 && e.charCodeAt(0) !== 46 && e.charCodeAt(e.length - 1) !== 46;
}
function Va(e) {
  if (e.length < 3)
    return !1;
  let a = e.startsWith("[") ? 1 : 0, r = e.length;
  if (e[r - 1] === "]" && (r -= 1), r - a > 39)
    return !1;
  let u = !1;
  for (; a < r; a += 1) {
    const i = e.charCodeAt(a);
    if (i === 58)
      u = !0;
    else if (!(i >= 48 && i <= 57 || // 0-9
    i >= 97 && i <= 102 || // a-f
    i >= 65 && i <= 90))
      return !1;
  }
  return u;
}
function Ga(e) {
  return Va(e) || Ha(e);
}
function Ke(e) {
  return e >= 97 && e <= 122 || e >= 48 && e <= 57 || e > 127;
}
function Ze(e) {
  if (e.length > 255 || e.length === 0 || /*@__INLINE__*/
  !Ke(e.charCodeAt(0)) && e.charCodeAt(0) !== 46 && // '.' (dot)
  e.charCodeAt(0) !== 95)
    return !1;
  let a = -1, r = -1;
  const u = e.length;
  for (let i = 0; i < u; i += 1) {
    const v = e.charCodeAt(i);
    if (v === 46) {
      if (
        // Check that previous label is < 63 bytes long (64 = 63 + '.')
        i - a > 64 || // Check that previous character was not already a '.'
        r === 46 || // Check that the previous label does not end with a '-' (dash)
        r === 45 || // Check that the previous label does not end with a '_' (underscore)
        r === 95
      )
        return !1;
      a = i;
    } else if (!/*@__INLINE__*/
    (Ke(v) || v === 45 || v === 95))
      return !1;
    r = v;
  }
  return (
    // Check that last label is shorter than 63 chars
    u - a - 1 <= 63 && // Check that the last character is an allowed trailing label character.
    // Since we already checked that the char is a valid hostname character,
    // we only need to check that it's different from '-'.
    r !== 45
  );
}
function ja({ allowIcannDomains: e = !0, allowPrivateDomains: a = !1, detectIp: r = !0, extractHostname: u = !0, mixedInputs: i = !0, validHosts: v = null, validateHostname: g = !0 }) {
  return {
    allowIcannDomains: e,
    allowPrivateDomains: a,
    detectIp: r,
    extractHostname: u,
    mixedInputs: i,
    validHosts: v,
    validateHostname: g
  };
}
const Ja = (
  /*@__INLINE__*/
  ja({})
);
function Wa(e) {
  return e === void 0 ? Ja : (
    /*@__INLINE__*/
    ja(e)
  );
}
function Ya(e, a) {
  return a.length === e.length ? "" : e.slice(0, -a.length - 1);
}
function _a() {
  return {
    domain: null,
    domainWithoutSuffix: null,
    hostname: null,
    isIcann: null,
    isIp: null,
    isPrivate: null,
    publicSuffix: null,
    subdomain: null
  };
}
function ue(e) {
  e.domain = null, e.domainWithoutSuffix = null, e.hostname = null, e.isIcann = null, e.isIp = null, e.isPrivate = null, e.publicSuffix = null, e.subdomain = null;
}
function ee(e, a, r, u, i) {
  const v = (
    /*@__INLINE__*/
    Wa(u)
  );
  return typeof e != "string" || (v.extractHostname ? v.mixedInputs ? i.hostname = Xe(e, Ze(e)) : i.hostname = Xe(e, !1) : i.hostname = e, a === 0 || i.hostname === null) || v.detectIp && (i.isIp = Ga(i.hostname), i.isIp) ? i : v.validateHostname && v.extractHostname && !Ze(i.hostname) ? (i.hostname = null, i) : (r(i.hostname, v, i), a === 2 || i.publicSuffix === null || (i.domain = Ba(i.publicSuffix, i.hostname, v), a === 3 || i.domain === null) || (i.subdomain = Ya(i.hostname, i.domain), a === 4) || (i.domainWithoutSuffix = $a(i.domain, i.publicSuffix)), i);
}
function Qa(e, a, r) {
  if (!a.allowPrivateDomains && e.length > 3) {
    const u = e.length - 1, i = e.charCodeAt(u), v = e.charCodeAt(u - 1), g = e.charCodeAt(u - 2), h = e.charCodeAt(u - 3);
    if (i === 109 && v === 111 && g === 99 && h === 46)
      return r.isIcann = !0, r.isPrivate = !1, r.publicSuffix = "com", !0;
    if (i === 103 && v === 114 && g === 111 && h === 46)
      return r.isIcann = !0, r.isPrivate = !1, r.publicSuffix = "org", !0;
    if (i === 117 && v === 100 && g === 101 && h === 46)
      return r.isIcann = !0, r.isPrivate = !1, r.publicSuffix = "edu", !0;
    if (i === 118 && v === 111 && g === 103 && h === 46)
      return r.isIcann = !0, r.isPrivate = !1, r.publicSuffix = "gov", !0;
    if (i === 116 && v === 101 && g === 110 && h === 46)
      return r.isIcann = !0, r.isPrivate = !1, r.publicSuffix = "net", !0;
    if (i === 101 && v === 100 && g === 46)
      return r.isIcann = !0, r.isPrivate = !1, r.publicSuffix = "de", !0;
  }
  return !1;
}
const Xa = /* @__PURE__ */ (function() {
  const e = [1, {}], a = [2, {}], r = [0, { city: e }];
  return [0, { ck: [0, { www: e }], jp: [0, { kawasaki: r, kitakyushu: r, kobe: r, nagoya: r, sapporo: r, sendai: r, yokohama: r }], dev: [0, { hrsn: [0, { psl: [0, { wc: [0, { ignored: a, sub: [0, { ignored: a }] }] }] }] }] }];
})(), Ka = /* @__PURE__ */ (function() {
  const e = [1, {}], a = [2, {}], r = [1, { com: e, edu: e, gov: e, net: e, org: e }], u = [1, { com: e, edu: e, gov: e, mil: e, net: e, org: e }], i = [0, { "*": a }], v = [2, { s: i }], g = [0, { relay: a }], h = [2, { id: a }], p = [1, { gov: e }], f = [0, { "transfer-webapp": a }], d = [0, { notebook: a, studio: a }], z = [0, { labeling: a, notebook: a, studio: a }], j = [0, { notebook: a }], w = [0, { labeling: a, notebook: a, "notebook-fips": a, studio: a }], P = [0, { notebook: a, "notebook-fips": a, studio: a, "studio-fips": a }], _ = [0, { "*": e }], x = [1, { co: a }], l = [0, { objects: a }], c = [2, { nodes: a }], t = [0, { my: i }], n = [0, { s3: a, "s3-accesspoint": a, "s3-website": a }], s = [0, { s3: a, "s3-accesspoint": a }], o = [0, { direct: a }], y = [0, { "webview-assets": a }], T = [0, { vfs: a, "webview-assets": a }], M = [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: n, s3: a, "s3-accesspoint": a, "s3-object-lambda": a, "s3-website": a, "aws-cloud9": y, cloud9: T }], O = [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: s, s3: a, "s3-accesspoint": a, "s3-object-lambda": a, "s3-website": a, "aws-cloud9": y, cloud9: T }], m = [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: n, s3: a, "s3-accesspoint": a, "s3-object-lambda": a, "s3-website": a, "analytics-gateway": a, "aws-cloud9": y, cloud9: T }], k = [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: n, s3: a, "s3-accesspoint": a, "s3-object-lambda": a, "s3-website": a }], b = [0, { s3: a, "s3-accesspoint": a, "s3-accesspoint-fips": a, "s3-fips": a, "s3-website": a }], E = [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: b, s3: a, "s3-accesspoint": a, "s3-accesspoint-fips": a, "s3-fips": a, "s3-object-lambda": a, "s3-website": a, "aws-cloud9": y, cloud9: T }], A = [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: b, s3: a, "s3-accesspoint": a, "s3-accesspoint-fips": a, "s3-deprecated": a, "s3-fips": a, "s3-object-lambda": a, "s3-website": a, "analytics-gateway": a, "aws-cloud9": y, cloud9: T }], C = [0, { s3: a, "s3-accesspoint": a, "s3-accesspoint-fips": a, "s3-fips": a }], R = [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: C, s3: a, "s3-accesspoint": a, "s3-accesspoint-fips": a, "s3-fips": a, "s3-object-lambda": a, "s3-website": a }], S = [0, { auth: a }], F = [0, { auth: a, "auth-fips": a }], q = [0, { "auth-fips": a }], $ = [0, { apps: a }], X = [0, { paas: a }], ie = [2, { eu: a }], V = [0, { app: a }], Q = [0, { site: a }], N = [1, { com: e, edu: e, net: e, org: e }], D = [0, { j: a }], U = [0, { dyn: a }], H = [1, { co: e, com: e, edu: e, gov: e, net: e, org: e }], K = [0, { p: a }], $e = [0, { user: a }], He = [0, { shop: a }], ne = [0, { cdn: a }], Oe = [0, { cust: a, reservd: a }], Ve = [0, { cust: a }], Se = [0, { s3: a }], Ge = [1, { biz: e, com: e, edu: e, gov: e, info: e, net: e, org: e }], Ie = [0, { ipfs: a }], ce = [1, { framer: a }], Je = [0, { forgot: a }], L = [1, { gs: e }], We = [0, { nes: e }], I = [1, { k12: e, cc: e, lib: e }], le = [1, { cc: e, lib: e }];
  return [0, { ac: [1, { com: e, edu: e, gov: e, mil: e, net: e, org: e, drr: a, feedback: a, forms: a }], ad: e, ae: [1, { ac: e, co: e, gov: e, mil: e, net: e, org: e, sch: e }], aero: [1, { airline: e, airport: e, "accident-investigation": e, "accident-prevention": e, aerobatic: e, aeroclub: e, aerodrome: e, agents: e, "air-surveillance": e, "air-traffic-control": e, aircraft: e, airtraffic: e, ambulance: e, association: e, author: e, ballooning: e, broker: e, caa: e, cargo: e, catering: e, certification: e, championship: e, charter: e, civilaviation: e, club: e, conference: e, consultant: e, consulting: e, control: e, council: e, crew: e, design: e, dgca: e, educator: e, emergency: e, engine: e, engineer: e, entertainment: e, equipment: e, exchange: e, express: e, federation: e, flight: e, freight: e, fuel: e, gliding: e, government: e, groundhandling: e, group: e, hanggliding: e, homebuilt: e, insurance: e, journal: e, journalist: e, leasing: e, logistics: e, magazine: e, maintenance: e, marketplace: e, media: e, microlight: e, modelling: e, navigation: e, parachuting: e, paragliding: e, "passenger-association": e, pilot: e, press: e, production: e, recreation: e, repbody: e, res: e, research: e, rotorcraft: e, safety: e, scientist: e, services: e, show: e, skydiving: e, software: e, student: e, taxi: e, trader: e, trading: e, trainer: e, union: e, workinggroup: e, works: e }], af: r, ag: [1, { co: e, com: e, net: e, nom: e, org: e, obj: a }], ai: [1, { com: e, net: e, off: e, org: e, uwu: a, framer: a }], al: u, am: [1, { co: e, com: e, commune: e, net: e, org: e, radio: a }], ao: [1, { co: e, ed: e, edu: e, gov: e, gv: e, it: e, og: e, org: e, pb: e }], aq: e, ar: [1, { bet: e, com: e, coop: e, edu: e, gob: e, gov: e, int: e, mil: e, musica: e, mutual: e, net: e, org: e, seg: e, senasa: e, tur: e }], arpa: [1, { e164: e, home: e, "in-addr": e, ip6: e, iris: e, uri: e, urn: e }], as: p, asia: [1, { cloudns: a, daemon: a, dix: a }], at: [1, { ac: [1, { sth: e }], co: e, gv: e, or: e, funkfeuer: [0, { wien: a }], futurecms: [0, { "*": a, ex: i, in: i }], futurehosting: a, futuremailing: a, ortsinfo: [0, { ex: i, kunden: i }], biz: a, info: a, "123webseite": a, priv: a, myspreadshop: a, "12hp": a, "2ix": a, "4lima": a, "lima-city": a }], au: [1, { asn: e, com: [1, { cloudlets: [0, { mel: a }], myspreadshop: a }], edu: [1, { act: e, catholic: e, nsw: [1, { schools: e }], nt: e, qld: e, sa: e, tas: e, vic: e, wa: e }], gov: [1, { qld: e, sa: e, tas: e, vic: e, wa: e }], id: e, net: e, org: e, conf: e, oz: e, act: e, nsw: e, nt: e, qld: e, sa: e, tas: e, vic: e, wa: e }], aw: [1, { com: e }], ax: e, az: [1, { biz: e, co: e, com: e, edu: e, gov: e, info: e, int: e, mil: e, name: e, net: e, org: e, pp: e, pro: e }], ba: [1, { com: e, edu: e, gov: e, mil: e, net: e, org: e, rs: a }], bb: [1, { biz: e, co: e, com: e, edu: e, gov: e, info: e, net: e, org: e, store: e, tv: e }], bd: _, be: [1, { ac: e, cloudns: a, webhosting: a, interhostsolutions: [0, { cloud: a }], kuleuven: [0, { ezproxy: a }], "123website": a, myspreadshop: a, transurl: i }], bf: p, bg: [1, { 0: e, 1: e, 2: e, 3: e, 4: e, 5: e, 6: e, 7: e, 8: e, 9: e, a: e, b: e, c: e, d: e, e, f: e, g: e, h: e, i: e, j: e, k: e, l: e, m: e, n: e, o: e, p: e, q: e, r: e, s: e, t: e, u: e, v: e, w: e, x: e, y: e, z: e, barsy: a }], bh: r, bi: [1, { co: e, com: e, edu: e, or: e, org: e }], biz: [1, { activetrail: a, "cloud-ip": a, cloudns: a, jozi: a, dyndns: a, "for-better": a, "for-more": a, "for-some": a, "for-the": a, selfip: a, webhop: a, orx: a, mmafan: a, myftp: a, "no-ip": a, dscloud: a }], bj: [1, { africa: e, agro: e, architectes: e, assur: e, avocats: e, co: e, com: e, eco: e, econo: e, edu: e, info: e, loisirs: e, money: e, net: e, org: e, ote: e, restaurant: e, resto: e, tourism: e, univ: e }], bm: r, bn: [1, { com: e, edu: e, gov: e, net: e, org: e, co: a }], bo: [1, { com: e, edu: e, gob: e, int: e, mil: e, net: e, org: e, tv: e, web: e, academia: e, agro: e, arte: e, blog: e, bolivia: e, ciencia: e, cooperativa: e, democracia: e, deporte: e, ecologia: e, economia: e, empresa: e, indigena: e, industria: e, info: e, medicina: e, movimiento: e, musica: e, natural: e, nombre: e, noticias: e, patria: e, plurinacional: e, politica: e, profesional: e, pueblo: e, revista: e, salud: e, tecnologia: e, tksat: e, transporte: e, wiki: e }], br: [1, { "9guacu": e, abc: e, adm: e, adv: e, agr: e, aju: e, am: e, anani: e, aparecida: e, app: e, arq: e, art: e, ato: e, b: e, barueri: e, belem: e, bet: e, bhz: e, bib: e, bio: e, blog: e, bmd: e, boavista: e, bsb: e, campinagrande: e, campinas: e, caxias: e, cim: e, cng: e, cnt: e, com: [1, { simplesite: a }], contagem: e, coop: e, coz: e, cri: e, cuiaba: e, curitiba: e, def: e, des: e, det: e, dev: e, ecn: e, eco: e, edu: e, emp: e, enf: e, eng: e, esp: e, etc: e, eti: e, far: e, feira: e, flog: e, floripa: e, fm: e, fnd: e, fortal: e, fot: e, foz: e, fst: e, g12: e, geo: e, ggf: e, goiania: e, gov: [1, { ac: e, al: e, am: e, ap: e, ba: e, ce: e, df: e, es: e, go: e, ma: e, mg: e, ms: e, mt: e, pa: e, pb: e, pe: e, pi: e, pr: e, rj: e, rn: e, ro: e, rr: e, rs: e, sc: e, se: e, sp: e, to: e }], gru: e, imb: e, ind: e, inf: e, jab: e, jampa: e, jdf: e, joinville: e, jor: e, jus: e, leg: [1, { ac: a, al: a, am: a, ap: a, ba: a, ce: a, df: a, es: a, go: a, ma: a, mg: a, ms: a, mt: a, pa: a, pb: a, pe: a, pi: a, pr: a, rj: a, rn: a, ro: a, rr: a, rs: a, sc: a, se: a, sp: a, to: a }], leilao: e, lel: e, log: e, londrina: e, macapa: e, maceio: e, manaus: e, maringa: e, mat: e, med: e, mil: e, morena: e, mp: e, mus: e, natal: e, net: e, niteroi: e, nom: _, not: e, ntr: e, odo: e, ong: e, org: e, osasco: e, palmas: e, poa: e, ppg: e, pro: e, psc: e, psi: e, pvh: e, qsl: e, radio: e, rec: e, recife: e, rep: e, ribeirao: e, rio: e, riobranco: e, riopreto: e, salvador: e, sampa: e, santamaria: e, santoandre: e, saobernardo: e, saogonca: e, seg: e, sjc: e, slg: e, slz: e, sorocaba: e, srv: e, taxi: e, tc: e, tec: e, teo: e, the: e, tmp: e, trd: e, tur: e, tv: e, udi: e, vet: e, vix: e, vlog: e, wiki: e, zlg: e }], bs: [1, { com: e, edu: e, gov: e, net: e, org: e, we: a }], bt: r, bv: e, bw: [1, { ac: e, co: e, gov: e, net: e, org: e }], by: [1, { gov: e, mil: e, com: e, of: e, mediatech: a }], bz: [1, { co: e, com: e, edu: e, gov: e, net: e, org: e, za: a, mydns: a, gsj: a }], ca: [1, { ab: e, bc: e, mb: e, nb: e, nf: e, nl: e, ns: e, nt: e, nu: e, on: e, pe: e, qc: e, sk: e, yk: e, gc: e, barsy: a, awdev: i, co: a, "no-ip": a, myspreadshop: a, box: a }], cat: e, cc: [1, { cleverapps: a, cloudns: a, ftpaccess: a, "game-server": a, myphotos: a, scrapping: a, twmail: a, csx: a, fantasyleague: a, spawn: [0, { instances: a }] }], cd: p, cf: e, cg: e, ch: [1, { square7: a, cloudns: a, cloudscale: [0, { cust: a, lpg: l, rma: l }], flow: [0, { ae: [0, { alp1: a }], appengine: a }], "linkyard-cloud": a, gotdns: a, dnsking: a, "123website": a, myspreadshop: a, firenet: [0, { "*": a, svc: i }], "12hp": a, "2ix": a, "4lima": a, "lima-city": a }], ci: [1, { ac: e, "xn--aroport-bya": e, aéroport: e, asso: e, co: e, com: e, ed: e, edu: e, go: e, gouv: e, int: e, net: e, or: e, org: e }], ck: _, cl: [1, { co: e, gob: e, gov: e, mil: e, cloudns: a }], cm: [1, { co: e, com: e, gov: e, net: e }], cn: [1, { ac: e, com: [1, { amazonaws: [0, { "cn-north-1": [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: n, s3: a, "s3-accesspoint": a, "s3-deprecated": a, "s3-object-lambda": a, "s3-website": a }], "cn-northwest-1": [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: s, s3: a, "s3-accesspoint": a, "s3-object-lambda": a, "s3-website": a }], compute: i, airflow: [0, { "cn-north-1": i, "cn-northwest-1": i }], eb: [0, { "cn-north-1": a, "cn-northwest-1": a }], elb: i }], sagemaker: [0, { "cn-north-1": d, "cn-northwest-1": d }] }], edu: e, gov: e, mil: e, net: e, org: e, "xn--55qx5d": e, 公司: e, "xn--od0alg": e, 網絡: e, "xn--io0a7i": e, 网络: e, ah: e, bj: e, cq: e, fj: e, gd: e, gs: e, gx: e, gz: e, ha: e, hb: e, he: e, hi: e, hk: e, hl: e, hn: e, jl: e, js: e, jx: e, ln: e, mo: e, nm: e, nx: e, qh: e, sc: e, sd: e, sh: [1, { as: a }], sn: e, sx: e, tj: e, tw: e, xj: e, xz: e, yn: e, zj: e, "canva-apps": a, canvasite: t, myqnapcloud: a, quickconnect: o }], co: [1, { com: e, edu: e, gov: e, mil: e, net: e, nom: e, org: e, carrd: a, crd: a, otap: i, leadpages: a, lpages: a, mypi: a, xmit: i, firewalledreplit: h, repl: h, supabase: a }], com: [1, { a2hosted: a, cpserver: a, adobeaemcloud: [2, { dev: i }], africa: a, airkitapps: a, "airkitapps-au": a, aivencloud: a, alibabacloudcs: a, kasserver: a, amazonaws: [0, { "af-south-1": M, "ap-east-1": O, "ap-northeast-1": m, "ap-northeast-2": m, "ap-northeast-3": M, "ap-south-1": m, "ap-south-2": k, "ap-southeast-1": m, "ap-southeast-2": m, "ap-southeast-3": k, "ap-southeast-4": k, "ap-southeast-5": [0, { "execute-api": a, dualstack: n, s3: a, "s3-accesspoint": a, "s3-deprecated": a, "s3-object-lambda": a, "s3-website": a }], "ca-central-1": E, "ca-west-1": [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: b, s3: a, "s3-accesspoint": a, "s3-accesspoint-fips": a, "s3-fips": a, "s3-object-lambda": a, "s3-website": a }], "eu-central-1": m, "eu-central-2": k, "eu-north-1": O, "eu-south-1": M, "eu-south-2": k, "eu-west-1": [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: n, s3: a, "s3-accesspoint": a, "s3-deprecated": a, "s3-object-lambda": a, "s3-website": a, "analytics-gateway": a, "aws-cloud9": y, cloud9: T }], "eu-west-2": O, "eu-west-3": M, "il-central-1": [0, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: n, s3: a, "s3-accesspoint": a, "s3-object-lambda": a, "s3-website": a, "aws-cloud9": y, cloud9: [0, { vfs: a }] }], "me-central-1": k, "me-south-1": O, "sa-east-1": M, "us-east-1": [2, { "execute-api": a, "emrappui-prod": a, "emrnotebooks-prod": a, "emrstudio-prod": a, dualstack: b, s3: a, "s3-accesspoint": a, "s3-accesspoint-fips": a, "s3-deprecated": a, "s3-fips": a, "s3-object-lambda": a, "s3-website": a, "analytics-gateway": a, "aws-cloud9": y, cloud9: T }], "us-east-2": A, "us-gov-east-1": R, "us-gov-west-1": R, "us-west-1": E, "us-west-2": A, compute: i, "compute-1": i, airflow: [0, { "af-south-1": i, "ap-east-1": i, "ap-northeast-1": i, "ap-northeast-2": i, "ap-northeast-3": i, "ap-south-1": i, "ap-south-2": i, "ap-southeast-1": i, "ap-southeast-2": i, "ap-southeast-3": i, "ap-southeast-4": i, "ca-central-1": i, "ca-west-1": i, "eu-central-1": i, "eu-central-2": i, "eu-north-1": i, "eu-south-1": i, "eu-south-2": i, "eu-west-1": i, "eu-west-2": i, "eu-west-3": i, "il-central-1": i, "me-central-1": i, "me-south-1": i, "sa-east-1": i, "us-east-1": i, "us-east-2": i, "us-west-1": i, "us-west-2": i }], s3: a, "s3-1": a, "s3-ap-east-1": a, "s3-ap-northeast-1": a, "s3-ap-northeast-2": a, "s3-ap-northeast-3": a, "s3-ap-south-1": a, "s3-ap-southeast-1": a, "s3-ap-southeast-2": a, "s3-ca-central-1": a, "s3-eu-central-1": a, "s3-eu-north-1": a, "s3-eu-west-1": a, "s3-eu-west-2": a, "s3-eu-west-3": a, "s3-external-1": a, "s3-fips-us-gov-east-1": a, "s3-fips-us-gov-west-1": a, "s3-global": [0, { accesspoint: [0, { mrap: a }] }], "s3-me-south-1": a, "s3-sa-east-1": a, "s3-us-east-2": a, "s3-us-gov-east-1": a, "s3-us-gov-west-1": a, "s3-us-west-1": a, "s3-us-west-2": a, "s3-website-ap-northeast-1": a, "s3-website-ap-southeast-1": a, "s3-website-ap-southeast-2": a, "s3-website-eu-west-1": a, "s3-website-sa-east-1": a, "s3-website-us-east-1": a, "s3-website-us-gov-west-1": a, "s3-website-us-west-1": a, "s3-website-us-west-2": a, elb: i }], amazoncognito: [0, { "af-south-1": S, "ap-east-1": S, "ap-northeast-1": S, "ap-northeast-2": S, "ap-northeast-3": S, "ap-south-1": S, "ap-south-2": S, "ap-southeast-1": S, "ap-southeast-2": S, "ap-southeast-3": S, "ap-southeast-4": S, "ap-southeast-5": S, "ca-central-1": S, "ca-west-1": S, "eu-central-1": S, "eu-central-2": S, "eu-north-1": S, "eu-south-1": S, "eu-south-2": S, "eu-west-1": S, "eu-west-2": S, "eu-west-3": S, "il-central-1": S, "me-central-1": S, "me-south-1": S, "sa-east-1": S, "us-east-1": F, "us-east-2": F, "us-gov-east-1": q, "us-gov-west-1": q, "us-west-1": F, "us-west-2": F }], amplifyapp: a, awsapprunner: i, awsapps: a, elasticbeanstalk: [2, { "af-south-1": a, "ap-east-1": a, "ap-northeast-1": a, "ap-northeast-2": a, "ap-northeast-3": a, "ap-south-1": a, "ap-southeast-1": a, "ap-southeast-2": a, "ap-southeast-3": a, "ca-central-1": a, "eu-central-1": a, "eu-north-1": a, "eu-south-1": a, "eu-west-1": a, "eu-west-2": a, "eu-west-3": a, "il-central-1": a, "me-south-1": a, "sa-east-1": a, "us-east-1": a, "us-east-2": a, "us-gov-east-1": a, "us-gov-west-1": a, "us-west-1": a, "us-west-2": a }], awsglobalaccelerator: a, siiites: a, appspacehosted: a, appspaceusercontent: a, "on-aptible": a, myasustor: a, "balena-devices": a, boutir: a, bplaced: a, cafjs: a, "canva-apps": a, "cdn77-storage": a, br: a, cn: a, de: a, eu: a, jpn: a, mex: a, ru: a, sa: a, uk: a, us: a, za: a, "clever-cloud": [0, { services: i }], dnsabr: a, "ip-ddns": a, jdevcloud: a, wpdevcloud: a, "cf-ipfs": a, "cloudflare-ipfs": a, trycloudflare: a, co: a, devinapps: i, builtwithdark: a, datadetect: [0, { demo: a, instance: a }], dattolocal: a, dattorelay: a, dattoweb: a, mydatto: a, digitaloceanspaces: i, discordsays: a, discordsez: a, drayddns: a, dreamhosters: a, durumis: a, mydrobo: a, blogdns: a, cechire: a, dnsalias: a, dnsdojo: a, doesntexist: a, dontexist: a, doomdns: a, "dyn-o-saur": a, dynalias: a, "dyndns-at-home": a, "dyndns-at-work": a, "dyndns-blog": a, "dyndns-free": a, "dyndns-home": a, "dyndns-ip": a, "dyndns-mail": a, "dyndns-office": a, "dyndns-pics": a, "dyndns-remote": a, "dyndns-server": a, "dyndns-web": a, "dyndns-wiki": a, "dyndns-work": a, "est-a-la-maison": a, "est-a-la-masion": a, "est-le-patron": a, "est-mon-blogueur": a, "from-ak": a, "from-al": a, "from-ar": a, "from-ca": a, "from-ct": a, "from-dc": a, "from-de": a, "from-fl": a, "from-ga": a, "from-hi": a, "from-ia": a, "from-id": a, "from-il": a, "from-in": a, "from-ks": a, "from-ky": a, "from-ma": a, "from-md": a, "from-mi": a, "from-mn": a, "from-mo": a, "from-ms": a, "from-mt": a, "from-nc": a, "from-nd": a, "from-ne": a, "from-nh": a, "from-nj": a, "from-nm": a, "from-nv": a, "from-oh": a, "from-ok": a, "from-or": a, "from-pa": a, "from-pr": a, "from-ri": a, "from-sc": a, "from-sd": a, "from-tn": a, "from-tx": a, "from-ut": a, "from-va": a, "from-vt": a, "from-wa": a, "from-wi": a, "from-wv": a, "from-wy": a, getmyip: a, gotdns: a, "hobby-site": a, homelinux: a, homeunix: a, iamallama: a, "is-a-anarchist": a, "is-a-blogger": a, "is-a-bookkeeper": a, "is-a-bulls-fan": a, "is-a-caterer": a, "is-a-chef": a, "is-a-conservative": a, "is-a-cpa": a, "is-a-cubicle-slave": a, "is-a-democrat": a, "is-a-designer": a, "is-a-doctor": a, "is-a-financialadvisor": a, "is-a-geek": a, "is-a-green": a, "is-a-guru": a, "is-a-hard-worker": a, "is-a-hunter": a, "is-a-landscaper": a, "is-a-lawyer": a, "is-a-liberal": a, "is-a-libertarian": a, "is-a-llama": a, "is-a-musician": a, "is-a-nascarfan": a, "is-a-nurse": a, "is-a-painter": a, "is-a-personaltrainer": a, "is-a-photographer": a, "is-a-player": a, "is-a-republican": a, "is-a-rockstar": a, "is-a-socialist": a, "is-a-student": a, "is-a-teacher": a, "is-a-techie": a, "is-a-therapist": a, "is-an-accountant": a, "is-an-actor": a, "is-an-actress": a, "is-an-anarchist": a, "is-an-artist": a, "is-an-engineer": a, "is-an-entertainer": a, "is-certified": a, "is-gone": a, "is-into-anime": a, "is-into-cars": a, "is-into-cartoons": a, "is-into-games": a, "is-leet": a, "is-not-certified": a, "is-slick": a, "is-uberleet": a, "is-with-theband": a, "isa-geek": a, "isa-hockeynut": a, issmarterthanyou: a, "likes-pie": a, likescandy: a, "neat-url": a, "saves-the-whales": a, selfip: a, "sells-for-less": a, "sells-for-u": a, servebbs: a, "simple-url": a, "space-to-rent": a, "teaches-yoga": a, writesthisblog: a, ddnsfree: a, ddnsgeek: a, giize: a, gleeze: a, kozow: a, loseyourip: a, ooguy: a, theworkpc: a, mytuleap: a, "tuleap-partners": a, encoreapi: a, evennode: [0, { "eu-1": a, "eu-2": a, "eu-3": a, "eu-4": a, "us-1": a, "us-2": a, "us-3": a, "us-4": a }], onfabrica: a, "fastly-edge": a, "fastly-terrarium": a, "fastvps-server": a, mydobiss: a, firebaseapp: a, fldrv: a, forgeblocks: a, framercanvas: a, "freebox-os": a, freeboxos: a, freemyip: a, aliases121: a, gentapps: a, gentlentapis: a, githubusercontent: a, "0emm": i, appspot: [2, { r: i }], blogspot: a, codespot: a, googleapis: a, googlecode: a, pagespeedmobilizer: a, withgoogle: a, withyoutube: a, grayjayleagues: a, hatenablog: a, hatenadiary: a, herokuapp: a, gr: a, smushcdn: a, wphostedmail: a, wpmucdn: a, pixolino: a, "apps-1and1": a, "live-website": a, dopaas: a, "hosted-by-previder": X, hosteur: [0, { "rag-cloud": a, "rag-cloud-ch": a }], "ik-server": [0, { jcloud: a, "jcloud-ver-jpc": a }], jelastic: [0, { demo: a }], massivegrid: X, wafaicloud: [0, { jed: a, ryd: a }], webadorsite: a, joyent: [0, { cns: i }], lpusercontent: a, linode: [0, { members: a, nodebalancer: i }], linodeobjects: i, linodeusercontent: [0, { ip: a }], localtonet: a, lovableproject: a, barsycenter: a, barsyonline: a, modelscape: a, mwcloudnonprod: a, polyspace: a, mazeplay: a, miniserver: a, atmeta: a, fbsbx: $, meteorapp: ie, routingthecloud: a, mydbserver: a, hostedpi: a, "mythic-beasts": [0, { caracal: a, customer: a, fentiger: a, lynx: a, ocelot: a, oncilla: a, onza: a, sphinx: a, vs: a, x: a, yali: a }], nospamproxy: [0, { cloud: [2, { o365: a }] }], "4u": a, nfshost: a, "3utilities": a, blogsyte: a, ciscofreak: a, damnserver: a, ddnsking: a, ditchyourip: a, dnsiskinky: a, dynns: a, geekgalaxy: a, "health-carereform": a, homesecuritymac: a, homesecuritypc: a, myactivedirectory: a, mysecuritycamera: a, myvnc: a, "net-freaks": a, onthewifi: a, point2this: a, quicksytes: a, securitytactics: a, servebeer: a, servecounterstrike: a, serveexchange: a, serveftp: a, servegame: a, servehalflife: a, servehttp: a, servehumour: a, serveirc: a, servemp3: a, servep2p: a, servepics: a, servequake: a, servesarcasm: a, stufftoread: a, unusualperson: a, workisboring: a, myiphost: a, observableusercontent: [0, { static: a }], simplesite: a, orsites: a, operaunite: a, "customer-oci": [0, { "*": a, oci: i, ocp: i, ocs: i }], oraclecloudapps: i, oraclegovcloudapps: i, "authgear-staging": a, authgearapps: a, skygearapp: a, outsystemscloud: a, ownprovider: a, pgfog: a, pagexl: a, gotpantheon: a, paywhirl: i, upsunapp: a, "postman-echo": a, prgmr: [0, { xen: a }], pythonanywhere: ie, qa2: a, "alpha-myqnapcloud": a, "dev-myqnapcloud": a, mycloudnas: a, mynascloud: a, myqnapcloud: a, qualifioapp: a, ladesk: a, qbuser: a, quipelements: i, rackmaze: a, "readthedocs-hosted": a, rhcloud: a, onrender: a, render: V, "subsc-pay": a, "180r": a, dojin: a, sakuratan: a, sakuraweb: a, x0: a, code: [0, { builder: i, "dev-builder": i, "stg-builder": i }], salesforce: [0, { platform: [0, { "code-builder-stg": [0, { test: [0, { "001": i }] }] }] }], logoip: a, scrysec: a, "firewall-gateway": a, myshopblocks: a, myshopify: a, shopitsite: a, "1kapp": a, appchizi: a, applinzi: a, sinaapp: a, vipsinaapp: a, streamlitapp: a, "try-snowplow": a, "playstation-cloud": a, myspreadshop: a, "w-corp-staticblitz": a, "w-credentialless-staticblitz": a, "w-staticblitz": a, "stackhero-network": a, stdlib: [0, { api: a }], strapiapp: [2, { media: a }], "streak-link": a, streaklinks: a, streakusercontent: a, "temp-dns": a, dsmynas: a, familyds: a, mytabit: a, taveusercontent: a, "tb-hosting": Q, reservd: a, thingdustdata: a, "townnews-staging": a, typeform: [0, { pro: a }], hk: a, it: a, "deus-canvas": a, vultrobjects: i, wafflecell: a, hotelwithflight: a, "reserve-online": a, cprapid: a, pleskns: a, remotewd: a, wiardweb: [0, { pages: a }], wixsite: a, wixstudio: a, messwithdns: a, "woltlab-demo": a, wpenginepowered: [2, { js: a }], xnbay: [2, { u2: a, "u2-local": a }], yolasite: a }], coop: e, cr: [1, { ac: e, co: e, ed: e, fi: e, go: e, or: e, sa: e }], cu: [1, { com: e, edu: e, gob: e, inf: e, nat: e, net: e, org: e }], cv: [1, { com: e, edu: e, id: e, int: e, net: e, nome: e, org: e, publ: e }], cw: N, cx: [1, { gov: e, cloudns: a, ath: a, info: a, assessments: a, calculators: a, funnels: a, paynow: a, quizzes: a, researched: a, tests: a }], cy: [1, { ac: e, biz: e, com: [1, { scaleforce: D }], ekloges: e, gov: e, ltd: e, mil: e, net: e, org: e, press: e, pro: e, tm: e }], cz: [1, { contentproxy9: [0, { rsc: a }], realm: a, e4: a, co: a, metacentrum: [0, { cloud: i, custom: a }], muni: [0, { cloud: [0, { flt: a, usr: a }] }] }], de: [1, { bplaced: a, square7: a, com: a, cosidns: U, dnsupdater: a, "dynamisches-dns": a, "internet-dns": a, "l-o-g-i-n": a, ddnss: [2, { dyn: a, dyndns: a }], "dyn-ip24": a, dyndns1: a, "home-webserver": [2, { dyn: a }], "myhome-server": a, dnshome: a, fuettertdasnetz: a, isteingeek: a, istmein: a, lebtimnetz: a, leitungsen: a, traeumtgerade: a, frusky: i, goip: a, "xn--gnstigbestellen-zvb": a, günstigbestellen: a, "xn--gnstigliefern-wob": a, günstigliefern: a, "hs-heilbronn": [0, { it: [0, { pages: a, "pages-research": a }] }], "dyn-berlin": a, "in-berlin": a, "in-brb": a, "in-butter": a, "in-dsl": a, "in-vpn": a, iservschule: a, "mein-iserv": a, schulplattform: a, schulserver: a, "test-iserv": a, keymachine: a, "git-repos": a, "lcube-server": a, "svn-repos": a, barsy: a, webspaceconfig: a, "123webseite": a, rub: a, "ruhr-uni-bochum": [2, { noc: [0, { io: a }] }], logoip: a, "firewall-gateway": a, "my-gateway": a, "my-router": a, spdns: a, speedpartner: [0, { customer: a }], myspreadshop: a, "taifun-dns": a, "12hp": a, "2ix": a, "4lima": a, "lima-city": a, "dd-dns": a, "dray-dns": a, draydns: a, "dyn-vpn": a, dynvpn: a, "mein-vigor": a, "my-vigor": a, "my-wan": a, "syno-ds": a, "synology-diskstation": a, "synology-ds": a, uberspace: i, "virtual-user": a, virtualuser: a, "community-pro": a, diskussionsbereich: a }], dj: e, dk: [1, { biz: a, co: a, firm: a, reg: a, store: a, "123hjemmeside": a, myspreadshop: a }], dm: H, do: [1, { art: e, com: e, edu: e, gob: e, gov: e, mil: e, net: e, org: e, sld: e, web: e }], dz: [1, { art: e, asso: e, com: e, edu: e, gov: e, net: e, org: e, pol: e, soc: e, tm: e }], ec: [1, { com: e, edu: e, fin: e, gob: e, gov: e, info: e, k12: e, med: e, mil: e, net: e, org: e, pro: e, base: a, official: a }], edu: [1, { rit: [0, { "git-pages": a }] }], ee: [1, { aip: e, com: e, edu: e, fie: e, gov: e, lib: e, med: e, org: e, pri: e, riik: e }], eg: [1, { ac: e, com: e, edu: e, eun: e, gov: e, info: e, me: e, mil: e, name: e, net: e, org: e, sci: e, sport: e, tv: e }], er: _, es: [1, { com: e, edu: e, gob: e, nom: e, org: e, "123miweb": a, myspreadshop: a }], et: [1, { biz: e, com: e, edu: e, gov: e, info: e, name: e, net: e, org: e }], eu: [1, { airkitapps: a, cloudns: a, dogado: [0, { jelastic: a }], barsy: a, spdns: a, transurl: i, diskstation: a }], fi: [1, { aland: e, dy: a, "xn--hkkinen-5wa": a, häkkinen: a, iki: a, cloudplatform: [0, { fi: a }], datacenter: [0, { demo: a, paas: a }], kapsi: a, "123kotisivu": a, myspreadshop: a }], fj: [1, { ac: e, biz: e, com: e, gov: e, info: e, mil: e, name: e, net: e, org: e, pro: e }], fk: _, fm: [1, { com: e, edu: e, net: e, org: e, radio: a, user: i }], fo: e, fr: [1, { asso: e, com: e, gouv: e, nom: e, prd: e, tm: e, avoues: e, cci: e, greta: e, "huissier-justice": e, "en-root": a, "fbx-os": a, fbxos: a, "freebox-os": a, freeboxos: a, goupile: a, "123siteweb": a, "on-web": a, "chirurgiens-dentistes-en-france": a, dedibox: a, aeroport: a, avocat: a, chambagri: a, "chirurgiens-dentistes": a, "experts-comptables": a, medecin: a, notaires: a, pharmacien: a, port: a, veterinaire: a, myspreadshop: a, ynh: a }], ga: e, gb: e, gd: [1, { edu: e, gov: e }], ge: [1, { com: e, edu: e, gov: e, net: e, org: e, pvt: e, school: e }], gf: e, gg: [1, { co: e, net: e, org: e, botdash: a, kaas: a, stackit: a, panel: [2, { daemon: a }] }], gh: [1, { com: e, edu: e, gov: e, mil: e, org: e }], gi: [1, { com: e, edu: e, gov: e, ltd: e, mod: e, org: e }], gl: [1, { co: e, com: e, edu: e, net: e, org: e, biz: a }], gm: e, gn: [1, { ac: e, com: e, edu: e, gov: e, net: e, org: e }], gov: e, gp: [1, { asso: e, com: e, edu: e, mobi: e, net: e, org: e }], gq: e, gr: [1, { com: e, edu: e, gov: e, net: e, org: e, barsy: a, simplesite: a }], gs: e, gt: [1, { com: e, edu: e, gob: e, ind: e, mil: e, net: e, org: e }], gu: [1, { com: e, edu: e, gov: e, guam: e, info: e, net: e, org: e, web: e }], gw: e, gy: H, hk: [1, { com: e, edu: e, gov: e, idv: e, net: e, org: e, "xn--ciqpn": e, 个人: e, "xn--gmqw5a": e, 個人: e, "xn--55qx5d": e, 公司: e, "xn--mxtq1m": e, 政府: e, "xn--lcvr32d": e, 敎育: e, "xn--wcvs22d": e, 教育: e, "xn--gmq050i": e, 箇人: e, "xn--uc0atv": e, 組織: e, "xn--uc0ay4a": e, 組织: e, "xn--od0alg": e, 網絡: e, "xn--zf0avx": e, 網络: e, "xn--mk0axi": e, 组織: e, "xn--tn0ag": e, 组织: e, "xn--od0aq3b": e, 网絡: e, "xn--io0a7i": e, 网络: e, inc: a, ltd: a }], hm: e, hn: [1, { com: e, edu: e, gob: e, mil: e, net: e, org: e }], hr: [1, { com: e, from: e, iz: e, name: e, brendly: He }], ht: [1, { adult: e, art: e, asso: e, com: e, coop: e, edu: e, firm: e, gouv: e, info: e, med: e, net: e, org: e, perso: e, pol: e, pro: e, rel: e, shop: e, rt: a }], hu: [1, { 2e3: e, agrar: e, bolt: e, casino: e, city: e, co: e, erotica: e, erotika: e, film: e, forum: e, games: e, hotel: e, info: e, ingatlan: e, jogasz: e, konyvelo: e, lakas: e, media: e, news: e, org: e, priv: e, reklam: e, sex: e, shop: e, sport: e, suli: e, szex: e, tm: e, tozsde: e, utazas: e, video: e }], id: [1, { ac: e, biz: e, co: e, desa: e, go: e, mil: e, my: e, net: e, or: e, ponpes: e, sch: e, web: e, zone: a }], ie: [1, { gov: e, myspreadshop: a }], il: [1, { ac: e, co: [1, { ravpage: a, mytabit: a, tabitorder: a }], gov: e, idf: e, k12: e, muni: e, net: e, org: e }], "xn--4dbrk0ce": [1, { "xn--4dbgdty6c": e, "xn--5dbhl8d": e, "xn--8dbq2a": e, "xn--hebda8b": e }], ישראל: [1, { אקדמיה: e, ישוב: e, צהל: e, ממשל: e }], im: [1, { ac: e, co: [1, { ltd: e, plc: e }], com: e, net: e, org: e, tt: e, tv: e }], in: [1, { "5g": e, "6g": e, ac: e, ai: e, am: e, bihar: e, biz: e, business: e, ca: e, cn: e, co: e, com: e, coop: e, cs: e, delhi: e, dr: e, edu: e, er: e, firm: e, gen: e, gov: e, gujarat: e, ind: e, info: e, int: e, internet: e, io: e, me: e, mil: e, net: e, nic: e, org: e, pg: e, post: e, pro: e, res: e, travel: e, tv: e, uk: e, up: e, us: e, cloudns: a, barsy: a, web: a, supabase: a }], info: [1, { cloudns: a, "dynamic-dns": a, "barrel-of-knowledge": a, "barrell-of-knowledge": a, dyndns: a, "for-our": a, "groks-the": a, "groks-this": a, "here-for-more": a, knowsitall: a, selfip: a, webhop: a, barsy: a, mayfirst: a, mittwald: a, mittwaldserver: a, typo3server: a, dvrcam: a, ilovecollege: a, "no-ip": a, forumz: a, nsupdate: a, dnsupdate: a, "v-info": a }], int: [1, { eu: e }], io: [1, { 2038: a, co: e, com: e, edu: e, gov: e, mil: e, net: e, nom: e, org: e, "on-acorn": i, myaddr: a, apigee: a, "b-data": a, beagleboard: a, bitbucket: a, bluebite: a, boxfuse: a, brave: v, browsersafetymark: a, bubble: ne, bubbleapps: a, bigv: [0, { uk0: a }], cleverapps: a, cloudbeesusercontent: a, dappnode: [0, { dyndns: a }], darklang: a, definima: a, dedyn: a, "fh-muenster": a, shw: a, forgerock: [0, { id: a }], github: a, gitlab: a, lolipop: a, "hasura-app": a, hostyhosting: a, hypernode: a, moonscale: i, beebyte: X, beebyteapp: [0, { sekd1: a }], jele: a, webthings: a, loginline: a, barsy: a, azurecontainer: i, ngrok: [2, { ap: a, au: a, eu: a, in: a, jp: a, sa: a, us: a }], nodeart: [0, { stage: a }], pantheonsite: a, pstmn: [2, { mock: a }], protonet: a, qcx: [2, { sys: i }], qoto: a, vaporcloud: a, myrdbx: a, "rb-hosting": Q, "on-k3s": i, "on-rio": i, readthedocs: a, resindevice: a, resinstaging: [0, { devices: a }], hzc: a, sandcats: a, scrypted: [0, { client: a }], "mo-siemens": a, lair: $, stolos: i, musician: a, utwente: a, edugit: a, telebit: a, thingdust: [0, { dev: Oe, disrec: Oe, prod: Ve, testing: Oe }], tickets: a, webflow: a, webflowtest: a, editorx: a, wixstudio: a, basicserver: a, virtualserver: a }], iq: u, ir: [1, { ac: e, co: e, gov: e, id: e, net: e, org: e, sch: e, "xn--mgba3a4f16a": e, ایران: e, "xn--mgba3a4fra": e, ايران: e, arvanedge: a }], is: e, it: [1, { edu: e, gov: e, abr: e, abruzzo: e, "aosta-valley": e, aostavalley: e, bas: e, basilicata: e, cal: e, calabria: e, cam: e, campania: e, "emilia-romagna": e, emiliaromagna: e, emr: e, "friuli-v-giulia": e, "friuli-ve-giulia": e, "friuli-vegiulia": e, "friuli-venezia-giulia": e, "friuli-veneziagiulia": e, "friuli-vgiulia": e, "friuliv-giulia": e, "friulive-giulia": e, friulivegiulia: e, "friulivenezia-giulia": e, friuliveneziagiulia: e, friulivgiulia: e, fvg: e, laz: e, lazio: e, lig: e, liguria: e, lom: e, lombardia: e, lombardy: e, lucania: e, mar: e, marche: e, mol: e, molise: e, piedmont: e, piemonte: e, pmn: e, pug: e, puglia: e, sar: e, sardegna: e, sardinia: e, sic: e, sicilia: e, sicily: e, taa: e, tos: e, toscana: e, "trentin-sud-tirol": e, "xn--trentin-sd-tirol-rzb": e, "trentin-süd-tirol": e, "trentin-sudtirol": e, "xn--trentin-sdtirol-7vb": e, "trentin-südtirol": e, "trentin-sued-tirol": e, "trentin-suedtirol": e, trentino: e, "trentino-a-adige": e, "trentino-aadige": e, "trentino-alto-adige": e, "trentino-altoadige": e, "trentino-s-tirol": e, "trentino-stirol": e, "trentino-sud-tirol": e, "xn--trentino-sd-tirol-c3b": e, "trentino-süd-tirol": e, "trentino-sudtirol": e, "xn--trentino-sdtirol-szb": e, "trentino-südtirol": e, "trentino-sued-tirol": e, "trentino-suedtirol": e, "trentinoa-adige": e, trentinoaadige: e, "trentinoalto-adige": e, trentinoaltoadige: e, "trentinos-tirol": e, trentinostirol: e, "trentinosud-tirol": e, "xn--trentinosd-tirol-rzb": e, "trentinosüd-tirol": e, trentinosudtirol: e, "xn--trentinosdtirol-7vb": e, trentinosüdtirol: e, "trentinosued-tirol": e, trentinosuedtirol: e, "trentinsud-tirol": e, "xn--trentinsd-tirol-6vb": e, "trentinsüd-tirol": e, trentinsudtirol: e, "xn--trentinsdtirol-nsb": e, trentinsüdtirol: e, "trentinsued-tirol": e, trentinsuedtirol: e, tuscany: e, umb: e, umbria: e, "val-d-aosta": e, "val-daosta": e, "vald-aosta": e, valdaosta: e, "valle-aosta": e, "valle-d-aosta": e, "valle-daosta": e, valleaosta: e, "valled-aosta": e, valledaosta: e, "vallee-aoste": e, "xn--valle-aoste-ebb": e, "vallée-aoste": e, "vallee-d-aoste": e, "xn--valle-d-aoste-ehb": e, "vallée-d-aoste": e, valleeaoste: e, "xn--valleaoste-e7a": e, valléeaoste: e, valleedaoste: e, "xn--valledaoste-ebb": e, valléedaoste: e, vao: e, vda: e, ven: e, veneto: e, ag: e, agrigento: e, al: e, alessandria: e, "alto-adige": e, altoadige: e, an: e, ancona: e, "andria-barletta-trani": e, "andria-trani-barletta": e, andriabarlettatrani: e, andriatranibarletta: e, ao: e, aosta: e, aoste: e, ap: e, aq: e, aquila: e, ar: e, arezzo: e, "ascoli-piceno": e, ascolipiceno: e, asti: e, at: e, av: e, avellino: e, ba: e, balsan: e, "balsan-sudtirol": e, "xn--balsan-sdtirol-nsb": e, "balsan-südtirol": e, "balsan-suedtirol": e, bari: e, "barletta-trani-andria": e, barlettatraniandria: e, belluno: e, benevento: e, bergamo: e, bg: e, bi: e, biella: e, bl: e, bn: e, bo: e, bologna: e, bolzano: e, "bolzano-altoadige": e, bozen: e, "bozen-sudtirol": e, "xn--bozen-sdtirol-2ob": e, "bozen-südtirol": e, "bozen-suedtirol": e, br: e, brescia: e, brindisi: e, bs: e, bt: e, bulsan: e, "bulsan-sudtirol": e, "xn--bulsan-sdtirol-nsb": e, "bulsan-südtirol": e, "bulsan-suedtirol": e, bz: e, ca: e, cagliari: e, caltanissetta: e, "campidano-medio": e, campidanomedio: e, campobasso: e, "carbonia-iglesias": e, carboniaiglesias: e, "carrara-massa": e, carraramassa: e, caserta: e, catania: e, catanzaro: e, cb: e, ce: e, "cesena-forli": e, "xn--cesena-forl-mcb": e, "cesena-forlì": e, cesenaforli: e, "xn--cesenaforl-i8a": e, cesenaforlì: e, ch: e, chieti: e, ci: e, cl: e, cn: e, co: e, como: e, cosenza: e, cr: e, cremona: e, crotone: e, cs: e, ct: e, cuneo: e, cz: e, "dell-ogliastra": e, dellogliastra: e, en: e, enna: e, fc: e, fe: e, fermo: e, ferrara: e, fg: e, fi: e, firenze: e, florence: e, fm: e, foggia: e, "forli-cesena": e, "xn--forl-cesena-fcb": e, "forlì-cesena": e, forlicesena: e, "xn--forlcesena-c8a": e, forlìcesena: e, fr: e, frosinone: e, ge: e, genoa: e, genova: e, go: e, gorizia: e, gr: e, grosseto: e, "iglesias-carbonia": e, iglesiascarbonia: e, im: e, imperia: e, is: e, isernia: e, kr: e, "la-spezia": e, laquila: e, laspezia: e, latina: e, lc: e, le: e, lecce: e, lecco: e, li: e, livorno: e, lo: e, lodi: e, lt: e, lu: e, lucca: e, macerata: e, mantova: e, "massa-carrara": e, massacarrara: e, matera: e, mb: e, mc: e, me: e, "medio-campidano": e, mediocampidano: e, messina: e, mi: e, milan: e, milano: e, mn: e, mo: e, modena: e, monza: e, "monza-brianza": e, "monza-e-della-brianza": e, monzabrianza: e, monzaebrianza: e, monzaedellabrianza: e, ms: e, mt: e, na: e, naples: e, napoli: e, no: e, novara: e, nu: e, nuoro: e, og: e, ogliastra: e, "olbia-tempio": e, olbiatempio: e, or: e, oristano: e, ot: e, pa: e, padova: e, padua: e, palermo: e, parma: e, pavia: e, pc: e, pd: e, pe: e, perugia: e, "pesaro-urbino": e, pesarourbino: e, pescara: e, pg: e, pi: e, piacenza: e, pisa: e, pistoia: e, pn: e, po: e, pordenone: e, potenza: e, pr: e, prato: e, pt: e, pu: e, pv: e, pz: e, ra: e, ragusa: e, ravenna: e, rc: e, re: e, "reggio-calabria": e, "reggio-emilia": e, reggiocalabria: e, reggioemilia: e, rg: e, ri: e, rieti: e, rimini: e, rm: e, rn: e, ro: e, roma: e, rome: e, rovigo: e, sa: e, salerno: e, sassari: e, savona: e, si: e, siena: e, siracusa: e, so: e, sondrio: e, sp: e, sr: e, ss: e, "xn--sdtirol-n2a": e, südtirol: e, suedtirol: e, sv: e, ta: e, taranto: e, te: e, "tempio-olbia": e, tempioolbia: e, teramo: e, terni: e, tn: e, to: e, torino: e, tp: e, tr: e, "trani-andria-barletta": e, "trani-barletta-andria": e, traniandriabarletta: e, tranibarlettaandria: e, trapani: e, trento: e, treviso: e, trieste: e, ts: e, turin: e, tv: e, ud: e, udine: e, "urbino-pesaro": e, urbinopesaro: e, va: e, varese: e, vb: e, vc: e, ve: e, venezia: e, venice: e, verbania: e, vercelli: e, verona: e, vi: e, "vibo-valentia": e, vibovalentia: e, vicenza: e, viterbo: e, vr: e, vs: e, vt: e, vv: e, "12chars": a, ibxos: a, iliadboxos: a, neen: [0, { jc: a }], "123homepage": a, "16-b": a, "32-b": a, "64-b": a, myspreadshop: a, syncloud: a }], je: [1, { co: e, net: e, org: e, of: a }], jm: _, jo: [1, { agri: e, ai: e, com: e, edu: e, eng: e, fm: e, gov: e, mil: e, net: e, org: e, per: e, phd: e, sch: e, tv: e }], jobs: e, jp: [1, { ac: e, ad: e, co: e, ed: e, go: e, gr: e, lg: e, ne: [1, { aseinet: $e, gehirn: a, ivory: a, "mail-box": a, mints: a, mokuren: a, opal: a, sakura: a, sumomo: a, topaz: a }], or: e, aichi: [1, { aisai: e, ama: e, anjo: e, asuke: e, chiryu: e, chita: e, fuso: e, gamagori: e, handa: e, hazu: e, hekinan: e, higashiura: e, ichinomiya: e, inazawa: e, inuyama: e, isshiki: e, iwakura: e, kanie: e, kariya: e, kasugai: e, kira: e, kiyosu: e, komaki: e, konan: e, kota: e, mihama: e, miyoshi: e, nishio: e, nisshin: e, obu: e, oguchi: e, oharu: e, okazaki: e, owariasahi: e, seto: e, shikatsu: e, shinshiro: e, shitara: e, tahara: e, takahama: e, tobishima: e, toei: e, togo: e, tokai: e, tokoname: e, toyoake: e, toyohashi: e, toyokawa: e, toyone: e, toyota: e, tsushima: e, yatomi: e }], akita: [1, { akita: e, daisen: e, fujisato: e, gojome: e, hachirogata: e, happou: e, higashinaruse: e, honjo: e, honjyo: e, ikawa: e, kamikoani: e, kamioka: e, katagami: e, kazuno: e, kitaakita: e, kosaka: e, kyowa: e, misato: e, mitane: e, moriyoshi: e, nikaho: e, noshiro: e, odate: e, oga: e, ogata: e, semboku: e, yokote: e, yurihonjo: e }], aomori: [1, { aomori: e, gonohe: e, hachinohe: e, hashikami: e, hiranai: e, hirosaki: e, itayanagi: e, kuroishi: e, misawa: e, mutsu: e, nakadomari: e, noheji: e, oirase: e, owani: e, rokunohe: e, sannohe: e, shichinohe: e, shingo: e, takko: e, towada: e, tsugaru: e, tsuruta: e }], chiba: [1, { abiko: e, asahi: e, chonan: e, chosei: e, choshi: e, chuo: e, funabashi: e, futtsu: e, hanamigawa: e, ichihara: e, ichikawa: e, ichinomiya: e, inzai: e, isumi: e, kamagaya: e, kamogawa: e, kashiwa: e, katori: e, katsuura: e, kimitsu: e, kisarazu: e, kozaki: e, kujukuri: e, kyonan: e, matsudo: e, midori: e, mihama: e, minamiboso: e, mobara: e, mutsuzawa: e, nagara: e, nagareyama: e, narashino: e, narita: e, noda: e, oamishirasato: e, omigawa: e, onjuku: e, otaki: e, sakae: e, sakura: e, shimofusa: e, shirako: e, shiroi: e, shisui: e, sodegaura: e, sosa: e, tako: e, tateyama: e, togane: e, tohnosho: e, tomisato: e, urayasu: e, yachimata: e, yachiyo: e, yokaichiba: e, yokoshibahikari: e, yotsukaido: e }], ehime: [1, { ainan: e, honai: e, ikata: e, imabari: e, iyo: e, kamijima: e, kihoku: e, kumakogen: e, masaki: e, matsuno: e, matsuyama: e, namikata: e, niihama: e, ozu: e, saijo: e, seiyo: e, shikokuchuo: e, tobe: e, toon: e, uchiko: e, uwajima: e, yawatahama: e }], fukui: [1, { echizen: e, eiheiji: e, fukui: e, ikeda: e, katsuyama: e, mihama: e, minamiechizen: e, obama: e, ohi: e, ono: e, sabae: e, sakai: e, takahama: e, tsuruga: e, wakasa: e }], fukuoka: [1, { ashiya: e, buzen: e, chikugo: e, chikuho: e, chikujo: e, chikushino: e, chikuzen: e, chuo: e, dazaifu: e, fukuchi: e, hakata: e, higashi: e, hirokawa: e, hisayama: e, iizuka: e, inatsuki: e, kaho: e, kasuga: e, kasuya: e, kawara: e, keisen: e, koga: e, kurate: e, kurogi: e, kurume: e, minami: e, miyako: e, miyama: e, miyawaka: e, mizumaki: e, munakata: e, nakagawa: e, nakama: e, nishi: e, nogata: e, ogori: e, okagaki: e, okawa: e, oki: e, omuta: e, onga: e, onojo: e, oto: e, saigawa: e, sasaguri: e, shingu: e, shinyoshitomi: e, shonai: e, soeda: e, sue: e, tachiarai: e, tagawa: e, takata: e, toho: e, toyotsu: e, tsuiki: e, ukiha: e, umi: e, usui: e, yamada: e, yame: e, yanagawa: e, yukuhashi: e }], fukushima: [1, { aizubange: e, aizumisato: e, aizuwakamatsu: e, asakawa: e, bandai: e, date: e, fukushima: e, furudono: e, futaba: e, hanawa: e, higashi: e, hirata: e, hirono: e, iitate: e, inawashiro: e, ishikawa: e, iwaki: e, izumizaki: e, kagamiishi: e, kaneyama: e, kawamata: e, kitakata: e, kitashiobara: e, koori: e, koriyama: e, kunimi: e, miharu: e, mishima: e, namie: e, nango: e, nishiaizu: e, nishigo: e, okuma: e, omotego: e, ono: e, otama: e, samegawa: e, shimogo: e, shirakawa: e, showa: e, soma: e, sukagawa: e, taishin: e, tamakawa: e, tanagura: e, tenei: e, yabuki: e, yamato: e, yamatsuri: e, yanaizu: e, yugawa: e }], gifu: [1, { anpachi: e, ena: e, gifu: e, ginan: e, godo: e, gujo: e, hashima: e, hichiso: e, hida: e, higashishirakawa: e, ibigawa: e, ikeda: e, kakamigahara: e, kani: e, kasahara: e, kasamatsu: e, kawaue: e, kitagata: e, mino: e, minokamo: e, mitake: e, mizunami: e, motosu: e, nakatsugawa: e, ogaki: e, sakahogi: e, seki: e, sekigahara: e, shirakawa: e, tajimi: e, takayama: e, tarui: e, toki: e, tomika: e, wanouchi: e, yamagata: e, yaotsu: e, yoro: e }], gunma: [1, { annaka: e, chiyoda: e, fujioka: e, higashiagatsuma: e, isesaki: e, itakura: e, kanna: e, kanra: e, katashina: e, kawaba: e, kiryu: e, kusatsu: e, maebashi: e, meiwa: e, midori: e, minakami: e, naganohara: e, nakanojo: e, nanmoku: e, numata: e, oizumi: e, ora: e, ota: e, shibukawa: e, shimonita: e, shinto: e, showa: e, takasaki: e, takayama: e, tamamura: e, tatebayashi: e, tomioka: e, tsukiyono: e, tsumagoi: e, ueno: e, yoshioka: e }], hiroshima: [1, { asaminami: e, daiwa: e, etajima: e, fuchu: e, fukuyama: e, hatsukaichi: e, higashihiroshima: e, hongo: e, jinsekikogen: e, kaita: e, kui: e, kumano: e, kure: e, mihara: e, miyoshi: e, naka: e, onomichi: e, osakikamijima: e, otake: e, saka: e, sera: e, seranishi: e, shinichi: e, shobara: e, takehara: e }], hokkaido: [1, { abashiri: e, abira: e, aibetsu: e, akabira: e, akkeshi: e, asahikawa: e, ashibetsu: e, ashoro: e, assabu: e, atsuma: e, bibai: e, biei: e, bifuka: e, bihoro: e, biratori: e, chippubetsu: e, chitose: e, date: e, ebetsu: e, embetsu: e, eniwa: e, erimo: e, esan: e, esashi: e, fukagawa: e, fukushima: e, furano: e, furubira: e, haboro: e, hakodate: e, hamatonbetsu: e, hidaka: e, higashikagura: e, higashikawa: e, hiroo: e, hokuryu: e, hokuto: e, honbetsu: e, horokanai: e, horonobe: e, ikeda: e, imakane: e, ishikari: e, iwamizawa: e, iwanai: e, kamifurano: e, kamikawa: e, kamishihoro: e, kamisunagawa: e, kamoenai: e, kayabe: e, kembuchi: e, kikonai: e, kimobetsu: e, kitahiroshima: e, kitami: e, kiyosato: e, koshimizu: e, kunneppu: e, kuriyama: e, kuromatsunai: e, kushiro: e, kutchan: e, kyowa: e, mashike: e, matsumae: e, mikasa: e, minamifurano: e, mombetsu: e, moseushi: e, mukawa: e, muroran: e, naie: e, nakagawa: e, nakasatsunai: e, nakatombetsu: e, nanae: e, nanporo: e, nayoro: e, nemuro: e, niikappu: e, niki: e, nishiokoppe: e, noboribetsu: e, numata: e, obihiro: e, obira: e, oketo: e, okoppe: e, otaru: e, otobe: e, otofuke: e, otoineppu: e, oumu: e, ozora: e, pippu: e, rankoshi: e, rebun: e, rikubetsu: e, rishiri: e, rishirifuji: e, saroma: e, sarufutsu: e, shakotan: e, shari: e, shibecha: e, shibetsu: e, shikabe: e, shikaoi: e, shimamaki: e, shimizu: e, shimokawa: e, shinshinotsu: e, shintoku: e, shiranuka: e, shiraoi: e, shiriuchi: e, sobetsu: e, sunagawa: e, taiki: e, takasu: e, takikawa: e, takinoue: e, teshikaga: e, tobetsu: e, tohma: e, tomakomai: e, tomari: e, toya: e, toyako: e, toyotomi: e, toyoura: e, tsubetsu: e, tsukigata: e, urakawa: e, urausu: e, uryu: e, utashinai: e, wakkanai: e, wassamu: e, yakumo: e, yoichi: e }], hyogo: [1, { aioi: e, akashi: e, ako: e, amagasaki: e, aogaki: e, asago: e, ashiya: e, awaji: e, fukusaki: e, goshiki: e, harima: e, himeji: e, ichikawa: e, inagawa: e, itami: e, kakogawa: e, kamigori: e, kamikawa: e, kasai: e, kasuga: e, kawanishi: e, miki: e, minamiawaji: e, nishinomiya: e, nishiwaki: e, ono: e, sanda: e, sannan: e, sasayama: e, sayo: e, shingu: e, shinonsen: e, shiso: e, sumoto: e, taishi: e, taka: e, takarazuka: e, takasago: e, takino: e, tamba: e, tatsuno: e, toyooka: e, yabu: e, yashiro: e, yoka: e, yokawa: e }], ibaraki: [1, { ami: e, asahi: e, bando: e, chikusei: e, daigo: e, fujishiro: e, hitachi: e, hitachinaka: e, hitachiomiya: e, hitachiota: e, ibaraki: e, ina: e, inashiki: e, itako: e, iwama: e, joso: e, kamisu: e, kasama: e, kashima: e, kasumigaura: e, koga: e, miho: e, mito: e, moriya: e, naka: e, namegata: e, oarai: e, ogawa: e, omitama: e, ryugasaki: e, sakai: e, sakuragawa: e, shimodate: e, shimotsuma: e, shirosato: e, sowa: e, suifu: e, takahagi: e, tamatsukuri: e, tokai: e, tomobe: e, tone: e, toride: e, tsuchiura: e, tsukuba: e, uchihara: e, ushiku: e, yachiyo: e, yamagata: e, yawara: e, yuki: e }], ishikawa: [1, { anamizu: e, hakui: e, hakusan: e, kaga: e, kahoku: e, kanazawa: e, kawakita: e, komatsu: e, nakanoto: e, nanao: e, nomi: e, nonoichi: e, noto: e, shika: e, suzu: e, tsubata: e, tsurugi: e, uchinada: e, wajima: e }], iwate: [1, { fudai: e, fujisawa: e, hanamaki: e, hiraizumi: e, hirono: e, ichinohe: e, ichinoseki: e, iwaizumi: e, iwate: e, joboji: e, kamaishi: e, kanegasaki: e, karumai: e, kawai: e, kitakami: e, kuji: e, kunohe: e, kuzumaki: e, miyako: e, mizusawa: e, morioka: e, ninohe: e, noda: e, ofunato: e, oshu: e, otsuchi: e, rikuzentakata: e, shiwa: e, shizukuishi: e, sumita: e, tanohata: e, tono: e, yahaba: e, yamada: e }], kagawa: [1, { ayagawa: e, higashikagawa: e, kanonji: e, kotohira: e, manno: e, marugame: e, mitoyo: e, naoshima: e, sanuki: e, tadotsu: e, takamatsu: e, tonosho: e, uchinomi: e, utazu: e, zentsuji: e }], kagoshima: [1, { akune: e, amami: e, hioki: e, isa: e, isen: e, izumi: e, kagoshima: e, kanoya: e, kawanabe: e, kinko: e, kouyama: e, makurazaki: e, matsumoto: e, minamitane: e, nakatane: e, nishinoomote: e, satsumasendai: e, soo: e, tarumizu: e, yusui: e }], kanagawa: [1, { aikawa: e, atsugi: e, ayase: e, chigasaki: e, ebina: e, fujisawa: e, hadano: e, hakone: e, hiratsuka: e, isehara: e, kaisei: e, kamakura: e, kiyokawa: e, matsuda: e, minamiashigara: e, miura: e, nakai: e, ninomiya: e, odawara: e, oi: e, oiso: e, sagamihara: e, samukawa: e, tsukui: e, yamakita: e, yamato: e, yokosuka: e, yugawara: e, zama: e, zushi: e }], kochi: [1, { aki: e, geisei: e, hidaka: e, higashitsuno: e, ino: e, kagami: e, kami: e, kitagawa: e, kochi: e, mihara: e, motoyama: e, muroto: e, nahari: e, nakamura: e, nankoku: e, nishitosa: e, niyodogawa: e, ochi: e, okawa: e, otoyo: e, otsuki: e, sakawa: e, sukumo: e, susaki: e, tosa: e, tosashimizu: e, toyo: e, tsuno: e, umaji: e, yasuda: e, yusuhara: e }], kumamoto: [1, { amakusa: e, arao: e, aso: e, choyo: e, gyokuto: e, kamiamakusa: e, kikuchi: e, kumamoto: e, mashiki: e, mifune: e, minamata: e, minamioguni: e, nagasu: e, nishihara: e, oguni: e, ozu: e, sumoto: e, takamori: e, uki: e, uto: e, yamaga: e, yamato: e, yatsushiro: e }], kyoto: [1, { ayabe: e, fukuchiyama: e, higashiyama: e, ide: e, ine: e, joyo: e, kameoka: e, kamo: e, kita: e, kizu: e, kumiyama: e, kyotamba: e, kyotanabe: e, kyotango: e, maizuru: e, minami: e, minamiyamashiro: e, miyazu: e, muko: e, nagaokakyo: e, nakagyo: e, nantan: e, oyamazaki: e, sakyo: e, seika: e, tanabe: e, uji: e, ujitawara: e, wazuka: e, yamashina: e, yawata: e }], mie: [1, { asahi: e, inabe: e, ise: e, kameyama: e, kawagoe: e, kiho: e, kisosaki: e, kiwa: e, komono: e, kumano: e, kuwana: e, matsusaka: e, meiwa: e, mihama: e, minamiise: e, misugi: e, miyama: e, nabari: e, shima: e, suzuka: e, tado: e, taiki: e, taki: e, tamaki: e, toba: e, tsu: e, udono: e, ureshino: e, watarai: e, yokkaichi: e }], miyagi: [1, { furukawa: e, higashimatsushima: e, ishinomaki: e, iwanuma: e, kakuda: e, kami: e, kawasaki: e, marumori: e, matsushima: e, minamisanriku: e, misato: e, murata: e, natori: e, ogawara: e, ohira: e, onagawa: e, osaki: e, rifu: e, semine: e, shibata: e, shichikashuku: e, shikama: e, shiogama: e, shiroishi: e, tagajo: e, taiwa: e, tome: e, tomiya: e, wakuya: e, watari: e, yamamoto: e, zao: e }], miyazaki: [1, { aya: e, ebino: e, gokase: e, hyuga: e, kadogawa: e, kawaminami: e, kijo: e, kitagawa: e, kitakata: e, kitaura: e, kobayashi: e, kunitomi: e, kushima: e, mimata: e, miyakonojo: e, miyazaki: e, morotsuka: e, nichinan: e, nishimera: e, nobeoka: e, saito: e, shiiba: e, shintomi: e, takaharu: e, takanabe: e, takazaki: e, tsuno: e }], nagano: [1, { achi: e, agematsu: e, anan: e, aoki: e, asahi: e, azumino: e, chikuhoku: e, chikuma: e, chino: e, fujimi: e, hakuba: e, hara: e, hiraya: e, iida: e, iijima: e, iiyama: e, iizuna: e, ikeda: e, ikusaka: e, ina: e, karuizawa: e, kawakami: e, kiso: e, kisofukushima: e, kitaaiki: e, komagane: e, komoro: e, matsukawa: e, matsumoto: e, miasa: e, minamiaiki: e, minamimaki: e, minamiminowa: e, minowa: e, miyada: e, miyota: e, mochizuki: e, nagano: e, nagawa: e, nagiso: e, nakagawa: e, nakano: e, nozawaonsen: e, obuse: e, ogawa: e, okaya: e, omachi: e, omi: e, ookuwa: e, ooshika: e, otaki: e, otari: e, sakae: e, sakaki: e, saku: e, sakuho: e, shimosuwa: e, shinanomachi: e, shiojiri: e, suwa: e, suzaka: e, takagi: e, takamori: e, takayama: e, tateshina: e, tatsuno: e, togakushi: e, togura: e, tomi: e, ueda: e, wada: e, yamagata: e, yamanouchi: e, yasaka: e, yasuoka: e }], nagasaki: [1, { chijiwa: e, futsu: e, goto: e, hasami: e, hirado: e, iki: e, isahaya: e, kawatana: e, kuchinotsu: e, matsuura: e, nagasaki: e, obama: e, omura: e, oseto: e, saikai: e, sasebo: e, seihi: e, shimabara: e, shinkamigoto: e, togitsu: e, tsushima: e, unzen: e }], nara: [1, { ando: e, gose: e, heguri: e, higashiyoshino: e, ikaruga: e, ikoma: e, kamikitayama: e, kanmaki: e, kashiba: e, kashihara: e, katsuragi: e, kawai: e, kawakami: e, kawanishi: e, koryo: e, kurotaki: e, mitsue: e, miyake: e, nara: e, nosegawa: e, oji: e, ouda: e, oyodo: e, sakurai: e, sango: e, shimoichi: e, shimokitayama: e, shinjo: e, soni: e, takatori: e, tawaramoto: e, tenkawa: e, tenri: e, uda: e, yamatokoriyama: e, yamatotakada: e, yamazoe: e, yoshino: e }], niigata: [1, { aga: e, agano: e, gosen: e, itoigawa: e, izumozaki: e, joetsu: e, kamo: e, kariwa: e, kashiwazaki: e, minamiuonuma: e, mitsuke: e, muika: e, murakami: e, myoko: e, nagaoka: e, niigata: e, ojiya: e, omi: e, sado: e, sanjo: e, seiro: e, seirou: e, sekikawa: e, shibata: e, tagami: e, tainai: e, tochio: e, tokamachi: e, tsubame: e, tsunan: e, uonuma: e, yahiko: e, yoita: e, yuzawa: e }], oita: [1, { beppu: e, bungoono: e, bungotakada: e, hasama: e, hiji: e, himeshima: e, hita: e, kamitsue: e, kokonoe: e, kuju: e, kunisaki: e, kusu: e, oita: e, saiki: e, taketa: e, tsukumi: e, usa: e, usuki: e, yufu: e }], okayama: [1, { akaiwa: e, asakuchi: e, bizen: e, hayashima: e, ibara: e, kagamino: e, kasaoka: e, kibichuo: e, kumenan: e, kurashiki: e, maniwa: e, misaki: e, nagi: e, niimi: e, nishiawakura: e, okayama: e, satosho: e, setouchi: e, shinjo: e, shoo: e, soja: e, takahashi: e, tamano: e, tsuyama: e, wake: e, yakage: e }], okinawa: [1, { aguni: e, ginowan: e, ginoza: e, gushikami: e, haebaru: e, higashi: e, hirara: e, iheya: e, ishigaki: e, ishikawa: e, itoman: e, izena: e, kadena: e, kin: e, kitadaito: e, kitanakagusuku: e, kumejima: e, kunigami: e, minamidaito: e, motobu: e, nago: e, naha: e, nakagusuku: e, nakijin: e, nanjo: e, nishihara: e, ogimi: e, okinawa: e, onna: e, shimoji: e, taketomi: e, tarama: e, tokashiki: e, tomigusuku: e, tonaki: e, urasoe: e, uruma: e, yaese: e, yomitan: e, yonabaru: e, yonaguni: e, zamami: e }], osaka: [1, { abeno: e, chihayaakasaka: e, chuo: e, daito: e, fujiidera: e, habikino: e, hannan: e, higashiosaka: e, higashisumiyoshi: e, higashiyodogawa: e, hirakata: e, ibaraki: e, ikeda: e, izumi: e, izumiotsu: e, izumisano: e, kadoma: e, kaizuka: e, kanan: e, kashiwara: e, katano: e, kawachinagano: e, kishiwada: e, kita: e, kumatori: e, matsubara: e, minato: e, minoh: e, misaki: e, moriguchi: e, neyagawa: e, nishi: e, nose: e, osakasayama: e, sakai: e, sayama: e, sennan: e, settsu: e, shijonawate: e, shimamoto: e, suita: e, tadaoka: e, taishi: e, tajiri: e, takaishi: e, takatsuki: e, tondabayashi: e, toyonaka: e, toyono: e, yao: e }], saga: [1, { ariake: e, arita: e, fukudomi: e, genkai: e, hamatama: e, hizen: e, imari: e, kamimine: e, kanzaki: e, karatsu: e, kashima: e, kitagata: e, kitahata: e, kiyama: e, kouhoku: e, kyuragi: e, nishiarita: e, ogi: e, omachi: e, ouchi: e, saga: e, shiroishi: e, taku: e, tara: e, tosu: e, yoshinogari: e }], saitama: [1, { arakawa: e, asaka: e, chichibu: e, fujimi: e, fujimino: e, fukaya: e, hanno: e, hanyu: e, hasuda: e, hatogaya: e, hatoyama: e, hidaka: e, higashichichibu: e, higashimatsuyama: e, honjo: e, ina: e, iruma: e, iwatsuki: e, kamiizumi: e, kamikawa: e, kamisato: e, kasukabe: e, kawagoe: e, kawaguchi: e, kawajima: e, kazo: e, kitamoto: e, koshigaya: e, kounosu: e, kuki: e, kumagaya: e, matsubushi: e, minano: e, misato: e, miyashiro: e, miyoshi: e, moroyama: e, nagatoro: e, namegawa: e, niiza: e, ogano: e, ogawa: e, ogose: e, okegawa: e, omiya: e, otaki: e, ranzan: e, ryokami: e, saitama: e, sakado: e, satte: e, sayama: e, shiki: e, shiraoka: e, soka: e, sugito: e, toda: e, tokigawa: e, tokorozawa: e, tsurugashima: e, urawa: e, warabi: e, yashio: e, yokoze: e, yono: e, yorii: e, yoshida: e, yoshikawa: e, yoshimi: e }], shiga: [1, { aisho: e, gamo: e, higashiomi: e, hikone: e, koka: e, konan: e, kosei: e, koto: e, kusatsu: e, maibara: e, moriyama: e, nagahama: e, nishiazai: e, notogawa: e, omihachiman: e, otsu: e, ritto: e, ryuoh: e, takashima: e, takatsuki: e, torahime: e, toyosato: e, yasu: e }], shimane: [1, { akagi: e, ama: e, gotsu: e, hamada: e, higashiizumo: e, hikawa: e, hikimi: e, izumo: e, kakinoki: e, masuda: e, matsue: e, misato: e, nishinoshima: e, ohda: e, okinoshima: e, okuizumo: e, shimane: e, tamayu: e, tsuwano: e, unnan: e, yakumo: e, yasugi: e, yatsuka: e }], shizuoka: [1, { arai: e, atami: e, fuji: e, fujieda: e, fujikawa: e, fujinomiya: e, fukuroi: e, gotemba: e, haibara: e, hamamatsu: e, higashiizu: e, ito: e, iwata: e, izu: e, izunokuni: e, kakegawa: e, kannami: e, kawanehon: e, kawazu: e, kikugawa: e, kosai: e, makinohara: e, matsuzaki: e, minamiizu: e, mishima: e, morimachi: e, nishiizu: e, numazu: e, omaezaki: e, shimada: e, shimizu: e, shimoda: e, shizuoka: e, susono: e, yaizu: e, yoshida: e }], tochigi: [1, { ashikaga: e, bato: e, haga: e, ichikai: e, iwafune: e, kaminokawa: e, kanuma: e, karasuyama: e, kuroiso: e, mashiko: e, mibu: e, moka: e, motegi: e, nasu: e, nasushiobara: e, nikko: e, nishikata: e, nogi: e, ohira: e, ohtawara: e, oyama: e, sakura: e, sano: e, shimotsuke: e, shioya: e, takanezawa: e, tochigi: e, tsuga: e, ujiie: e, utsunomiya: e, yaita: e }], tokushima: [1, { aizumi: e, anan: e, ichiba: e, itano: e, kainan: e, komatsushima: e, matsushige: e, mima: e, minami: e, miyoshi: e, mugi: e, nakagawa: e, naruto: e, sanagochi: e, shishikui: e, tokushima: e, wajiki: e }], tokyo: [1, { adachi: e, akiruno: e, akishima: e, aogashima: e, arakawa: e, bunkyo: e, chiyoda: e, chofu: e, chuo: e, edogawa: e, fuchu: e, fussa: e, hachijo: e, hachioji: e, hamura: e, higashikurume: e, higashimurayama: e, higashiyamato: e, hino: e, hinode: e, hinohara: e, inagi: e, itabashi: e, katsushika: e, kita: e, kiyose: e, kodaira: e, koganei: e, kokubunji: e, komae: e, koto: e, kouzushima: e, kunitachi: e, machida: e, meguro: e, minato: e, mitaka: e, mizuho: e, musashimurayama: e, musashino: e, nakano: e, nerima: e, ogasawara: e, okutama: e, ome: e, oshima: e, ota: e, setagaya: e, shibuya: e, shinagawa: e, shinjuku: e, suginami: e, sumida: e, tachikawa: e, taito: e, tama: e, toshima: e }], tottori: [1, { chizu: e, hino: e, kawahara: e, koge: e, kotoura: e, misasa: e, nanbu: e, nichinan: e, sakaiminato: e, tottori: e, wakasa: e, yazu: e, yonago: e }], toyama: [1, { asahi: e, fuchu: e, fukumitsu: e, funahashi: e, himi: e, imizu: e, inami: e, johana: e, kamiichi: e, kurobe: e, nakaniikawa: e, namerikawa: e, nanto: e, nyuzen: e, oyabe: e, taira: e, takaoka: e, tateyama: e, toga: e, tonami: e, toyama: e, unazuki: e, uozu: e, yamada: e }], wakayama: [1, { arida: e, aridagawa: e, gobo: e, hashimoto: e, hidaka: e, hirogawa: e, inami: e, iwade: e, kainan: e, kamitonda: e, katsuragi: e, kimino: e, kinokawa: e, kitayama: e, koya: e, koza: e, kozagawa: e, kudoyama: e, kushimoto: e, mihama: e, misato: e, nachikatsuura: e, shingu: e, shirahama: e, taiji: e, tanabe: e, wakayama: e, yuasa: e, yura: e }], yamagata: [1, { asahi: e, funagata: e, higashine: e, iide: e, kahoku: e, kaminoyama: e, kaneyama: e, kawanishi: e, mamurogawa: e, mikawa: e, murayama: e, nagai: e, nakayama: e, nanyo: e, nishikawa: e, obanazawa: e, oe: e, oguni: e, ohkura: e, oishida: e, sagae: e, sakata: e, sakegawa: e, shinjo: e, shirataka: e, shonai: e, takahata: e, tendo: e, tozawa: e, tsuruoka: e, yamagata: e, yamanobe: e, yonezawa: e, yuza: e }], yamaguchi: [1, { abu: e, hagi: e, hikari: e, hofu: e, iwakuni: e, kudamatsu: e, mitou: e, nagato: e, oshima: e, shimonoseki: e, shunan: e, tabuse: e, tokuyama: e, toyota: e, ube: e, yuu: e }], yamanashi: [1, { chuo: e, doshi: e, fuefuki: e, fujikawa: e, fujikawaguchiko: e, fujiyoshida: e, hayakawa: e, hokuto: e, ichikawamisato: e, kai: e, kofu: e, koshu: e, kosuge: e, "minami-alps": e, minobu: e, nakamichi: e, nanbu: e, narusawa: e, nirasaki: e, nishikatsura: e, oshino: e, otsuki: e, showa: e, tabayama: e, tsuru: e, uenohara: e, yamanakako: e, yamanashi: e }], "xn--ehqz56n": e, 三重: e, "xn--1lqs03n": e, 京都: e, "xn--qqqt11m": e, 佐賀: e, "xn--f6qx53a": e, 兵庫: e, "xn--djrs72d6uy": e, 北海道: e, "xn--mkru45i": e, 千葉: e, "xn--0trq7p7nn": e, 和歌山: e, "xn--5js045d": e, 埼玉: e, "xn--kbrq7o": e, 大分: e, "xn--pssu33l": e, 大阪: e, "xn--ntsq17g": e, 奈良: e, "xn--uisz3g": e, 宮城: e, "xn--6btw5a": e, 宮崎: e, "xn--1ctwo": e, 富山: e, "xn--6orx2r": e, 山口: e, "xn--rht61e": e, 山形: e, "xn--rht27z": e, 山梨: e, "xn--nit225k": e, 岐阜: e, "xn--rht3d": e, 岡山: e, "xn--djty4k": e, 岩手: e, "xn--klty5x": e, 島根: e, "xn--kltx9a": e, 広島: e, "xn--kltp7d": e, 徳島: e, "xn--c3s14m": e, 愛媛: e, "xn--vgu402c": e, 愛知: e, "xn--efvn9s": e, 新潟: e, "xn--1lqs71d": e, 東京: e, "xn--4pvxs": e, 栃木: e, "xn--uuwu58a": e, 沖縄: e, "xn--zbx025d": e, 滋賀: e, "xn--8pvr4u": e, 熊本: e, "xn--5rtp49c": e, 石川: e, "xn--ntso0iqx3a": e, 神奈川: e, "xn--elqq16h": e, 福井: e, "xn--4it168d": e, 福岡: e, "xn--klt787d": e, 福島: e, "xn--rny31h": e, 秋田: e, "xn--7t0a264c": e, 群馬: e, "xn--uist22h": e, 茨城: e, "xn--8ltr62k": e, 長崎: e, "xn--2m4a15e": e, 長野: e, "xn--32vp30h": e, 青森: e, "xn--4it797k": e, 静岡: e, "xn--5rtq34k": e, 香川: e, "xn--k7yn95e": e, 高知: e, "xn--tor131o": e, 鳥取: e, "xn--d5qv7z876c": e, 鹿児島: e, kawasaki: _, kitakyushu: _, kobe: _, nagoya: _, sapporo: _, sendai: _, yokohama: _, buyshop: a, fashionstore: a, handcrafted: a, kawaiishop: a, supersale: a, theshop: a, "0am": a, "0g0": a, "0j0": a, "0t0": a, mydns: a, pgw: a, wjg: a, usercontent: a, angry: a, babyblue: a, babymilk: a, backdrop: a, bambina: a, bitter: a, blush: a, boo: a, boy: a, boyfriend: a, but: a, candypop: a, capoo: a, catfood: a, cheap: a, chicappa: a, chillout: a, chips: a, chowder: a, chu: a, ciao: a, cocotte: a, coolblog: a, cranky: a, cutegirl: a, daa: a, deca: a, deci: a, digick: a, egoism: a, fakefur: a, fem: a, flier: a, floppy: a, fool: a, frenchkiss: a, girlfriend: a, girly: a, gloomy: a, gonna: a, greater: a, hacca: a, heavy: a, her: a, hiho: a, hippy: a, holy: a, hungry: a, icurus: a, itigo: a, jellybean: a, kikirara: a, kill: a, kilo: a, kuron: a, littlestar: a, lolipopmc: a, lolitapunk: a, lomo: a, lovepop: a, lovesick: a, main: a, mods: a, mond: a, mongolian: a, moo: a, namaste: a, nikita: a, nobushi: a, noor: a, oops: a, parallel: a, parasite: a, pecori: a, peewee: a, penne: a, pepper: a, perma: a, pigboat: a, pinoko: a, punyu: a, pupu: a, pussycat: a, pya: a, raindrop: a, readymade: a, sadist: a, schoolbus: a, secret: a, staba: a, stripper: a, sub: a, sunnyday: a, thick: a, tonkotsu: a, under: a, upper: a, velvet: a, verse: a, versus: a, vivian: a, watson: a, weblike: a, whitesnow: a, zombie: a, hateblo: a, hatenablog: a, hatenadiary: a, "2-d": a, bona: a, crap: a, daynight: a, eek: a, flop: a, halfmoon: a, jeez: a, matrix: a, mimoza: a, netgamers: a, nyanta: a, o0o0: a, rdy: a, rgr: a, rulez: a, sakurastorage: [0, { isk01: Se, isk02: Se }], saloon: a, sblo: a, skr: a, tank: a, "uh-oh": a, undo: a, webaccel: [0, { rs: a, user: a }], websozai: a, xii: a }], ke: [1, { ac: e, co: e, go: e, info: e, me: e, mobi: e, ne: e, or: e, sc: e }], kg: [1, { com: e, edu: e, gov: e, mil: e, net: e, org: e, us: a }], kh: _, ki: Ge, km: [1, { ass: e, com: e, edu: e, gov: e, mil: e, nom: e, org: e, prd: e, tm: e, asso: e, coop: e, gouv: e, medecin: e, notaires: e, pharmaciens: e, presse: e, veterinaire: e }], kn: [1, { edu: e, gov: e, net: e, org: e }], kp: [1, { com: e, edu: e, gov: e, org: e, rep: e, tra: e }], kr: [1, { ac: e, ai: e, co: e, es: e, go: e, hs: e, io: e, it: e, kg: e, me: e, mil: e, ms: e, ne: e, or: e, pe: e, re: e, sc: e, busan: e, chungbuk: e, chungnam: e, daegu: e, daejeon: e, gangwon: e, gwangju: e, gyeongbuk: e, gyeonggi: e, gyeongnam: e, incheon: e, jeju: e, jeonbuk: e, jeonnam: e, seoul: e, ulsan: e, c01: a, "eliv-dns": a }], kw: [1, { com: e, edu: e, emb: e, gov: e, ind: e, net: e, org: e }], ky: N, kz: [1, { com: e, edu: e, gov: e, mil: e, net: e, org: e, jcloud: a }], la: [1, { com: e, edu: e, gov: e, info: e, int: e, net: e, org: e, per: e, bnr: a }], lb: r, lc: [1, { co: e, com: e, edu: e, gov: e, net: e, org: e, oy: a }], li: e, lk: [1, { ac: e, assn: e, com: e, edu: e, gov: e, grp: e, hotel: e, int: e, ltd: e, net: e, ngo: e, org: e, sch: e, soc: e, web: e }], lr: r, ls: [1, { ac: e, biz: e, co: e, edu: e, gov: e, info: e, net: e, org: e, sc: e }], lt: p, lu: [1, { "123website": a }], lv: [1, { asn: e, com: e, conf: e, edu: e, gov: e, id: e, mil: e, net: e, org: e }], ly: [1, { com: e, edu: e, gov: e, id: e, med: e, net: e, org: e, plc: e, sch: e }], ma: [1, { ac: e, co: e, gov: e, net: e, org: e, press: e }], mc: [1, { asso: e, tm: e }], md: [1, { ir: a }], me: [1, { ac: e, co: e, edu: e, gov: e, its: e, net: e, org: e, priv: e, c66: a, craft: a, edgestack: a, filegear: a, glitch: a, "filegear-sg": a, lohmus: a, barsy: a, mcdir: a, brasilia: a, ddns: a, dnsfor: a, hopto: a, loginto: a, noip: a, webhop: a, soundcast: a, tcp4: a, vp4: a, diskstation: a, dscloud: a, i234: a, myds: a, synology: a, transip: Q, nohost: a }], mg: [1, { co: e, com: e, edu: e, gov: e, mil: e, nom: e, org: e, prd: e }], mh: e, mil: e, mk: [1, { com: e, edu: e, gov: e, inf: e, name: e, net: e, org: e }], ml: [1, { ac: e, art: e, asso: e, com: e, edu: e, gouv: e, gov: e, info: e, inst: e, net: e, org: e, pr: e, presse: e }], mm: _, mn: [1, { edu: e, gov: e, org: e, nyc: a }], mo: r, mobi: [1, { barsy: a, dscloud: a }], mp: [1, { ju: a }], mq: e, mr: p, ms: [1, { com: e, edu: e, gov: e, net: e, org: e, minisite: a }], mt: N, mu: [1, { ac: e, co: e, com: e, gov: e, net: e, or: e, org: e }], museum: e, mv: [1, { aero: e, biz: e, com: e, coop: e, edu: e, gov: e, info: e, int: e, mil: e, museum: e, name: e, net: e, org: e, pro: e }], mw: [1, { ac: e, biz: e, co: e, com: e, coop: e, edu: e, gov: e, int: e, net: e, org: e }], mx: [1, { com: e, edu: e, gob: e, net: e, org: e }], my: [1, { biz: e, com: e, edu: e, gov: e, mil: e, name: e, net: e, org: e }], mz: [1, { ac: e, adv: e, co: e, edu: e, gov: e, mil: e, net: e, org: e }], na: [1, { alt: e, co: e, com: e, gov: e, net: e, org: e }], name: [1, { her: Je, his: Je }], nc: [1, { asso: e, nom: e }], ne: e, net: [1, { adobeaemcloud: a, "adobeio-static": a, adobeioruntime: a, akadns: a, akamai: a, "akamai-staging": a, akamaiedge: a, "akamaiedge-staging": a, akamaihd: a, "akamaihd-staging": a, akamaiorigin: a, "akamaiorigin-staging": a, akamaized: a, "akamaized-staging": a, edgekey: a, "edgekey-staging": a, edgesuite: a, "edgesuite-staging": a, alwaysdata: a, myamaze: a, cloudfront: a, appudo: a, "atlassian-dev": [0, { prod: ne }], myfritz: a, onavstack: a, shopselect: a, blackbaudcdn: a, boomla: a, bplaced: a, square7: a, cdn77: [0, { r: a }], "cdn77-ssl": a, gb: a, hu: a, jp: a, se: a, uk: a, clickrising: a, "ddns-ip": a, "dns-cloud": a, "dns-dynamic": a, cloudaccess: a, cloudflare: [2, { cdn: a }], cloudflareanycast: ne, cloudflarecn: ne, cloudflareglobal: ne, ctfcloud: a, "feste-ip": a, "knx-server": a, "static-access": a, cryptonomic: i, dattolocal: a, mydatto: a, debian: a, definima: a, deno: a, "at-band-camp": a, blogdns: a, "broke-it": a, buyshouses: a, dnsalias: a, dnsdojo: a, "does-it": a, dontexist: a, dynalias: a, dynathome: a, endofinternet: a, "from-az": a, "from-co": a, "from-la": a, "from-ny": a, "gets-it": a, "ham-radio-op": a, homeftp: a, homeip: a, homelinux: a, homeunix: a, "in-the-band": a, "is-a-chef": a, "is-a-geek": a, "isa-geek": a, "kicks-ass": a, "office-on-the": a, podzone: a, "scrapper-site": a, selfip: a, "sells-it": a, servebbs: a, serveftp: a, thruhere: a, webhop: a, casacam: a, dynu: a, dynv6: a, twmail: a, ru: a, channelsdvr: [2, { u: a }], fastly: [0, { freetls: a, map: a, prod: [0, { a, global: a }], ssl: [0, { a, b: a, global: a }] }], fastlylb: [2, { map: a }], edgeapp: a, "keyword-on": a, "live-on": a, "server-on": a, "cdn-edges": a, heteml: a, cloudfunctions: a, "grafana-dev": a, iobb: a, moonscale: a, "in-dsl": a, "in-vpn": a, oninferno: a, botdash: a, "apps-1and1": a, ipifony: a, cloudjiffy: [2, { "fra1-de": a, "west1-us": a }], elastx: [0, { "jls-sto1": a, "jls-sto2": a, "jls-sto3": a }], massivegrid: [0, { paas: [0, { "fr-1": a, "lon-1": a, "lon-2": a, "ny-1": a, "ny-2": a, "sg-1": a }] }], saveincloud: [0, { jelastic: a, "nordeste-idc": a }], scaleforce: D, kinghost: a, uni5: a, krellian: a, ggff: a, localcert: a, localhostcert: a, localto: i, barsy: a, memset: a, "azure-api": a, "azure-mobile": a, azureedge: a, azurefd: a, azurestaticapps: [2, { 1: a, 2: a, 3: a, 4: a, 5: a, 6: a, 7: a, centralus: a, eastasia: a, eastus2: a, westeurope: a, westus2: a }], azurewebsites: a, cloudapp: a, trafficmanager: a, windows: [0, { core: [0, { blob: a }], servicebus: a }], mynetname: [0, { sn: a }], routingthecloud: a, bounceme: a, ddns: a, "eating-organic": a, mydissent: a, myeffect: a, mymediapc: a, mypsx: a, mysecuritycamera: a, nhlfan: a, "no-ip": a, pgafan: a, privatizehealthinsurance: a, redirectme: a, serveblog: a, serveminecraft: a, sytes: a, dnsup: a, hicam: a, "now-dns": a, ownip: a, vpndns: a, cloudycluster: a, ovh: [0, { hosting: i, webpaas: i }], rackmaze: a, myradweb: a, in: a, "subsc-pay": a, squares: a, schokokeks: a, "firewall-gateway": a, seidat: a, senseering: a, siteleaf: a, mafelo: a, myspreadshop: a, "vps-host": [2, { jelastic: [0, { atl: a, njs: a, ric: a }] }], srcf: [0, { soc: a, user: a }], supabase: a, dsmynas: a, familyds: a, ts: [2, { c: i }], torproject: [2, { pages: a }], vusercontent: a, "reserve-online": a, "community-pro": a, meinforum: a, yandexcloud: [2, { storage: a, website: a }], za: a }], nf: [1, { arts: e, com: e, firm: e, info: e, net: e, other: e, per: e, rec: e, store: e, web: e }], ng: [1, { com: e, edu: e, gov: e, i: e, mil: e, mobi: e, name: e, net: e, org: e, sch: e, biz: [2, { co: a, dl: a, go: a, lg: a, on: a }], col: a, firm: a, gen: a, ltd: a, ngo: a, plc: a }], ni: [1, { ac: e, biz: e, co: e, com: e, edu: e, gob: e, in: e, info: e, int: e, mil: e, net: e, nom: e, org: e, web: e }], nl: [1, { co: a, "hosting-cluster": a, gov: a, khplay: a, "123website": a, myspreadshop: a, transurl: i, cistron: a, demon: a }], no: [1, { fhs: e, folkebibl: e, fylkesbibl: e, idrett: e, museum: e, priv: e, vgs: e, dep: e, herad: e, kommune: e, mil: e, stat: e, aa: L, ah: L, bu: L, fm: L, hl: L, hm: L, "jan-mayen": L, mr: L, nl: L, nt: L, of: L, ol: L, oslo: L, rl: L, sf: L, st: L, svalbard: L, tm: L, tr: L, va: L, vf: L, akrehamn: e, "xn--krehamn-dxa": e, åkrehamn: e, algard: e, "xn--lgrd-poac": e, ålgård: e, arna: e, bronnoysund: e, "xn--brnnysund-m8ac": e, brønnøysund: e, brumunddal: e, bryne: e, drobak: e, "xn--drbak-wua": e, drøbak: e, egersund: e, fetsund: e, floro: e, "xn--flor-jra": e, florø: e, fredrikstad: e, hokksund: e, honefoss: e, "xn--hnefoss-q1a": e, hønefoss: e, jessheim: e, jorpeland: e, "xn--jrpeland-54a": e, jørpeland: e, kirkenes: e, kopervik: e, krokstadelva: e, langevag: e, "xn--langevg-jxa": e, langevåg: e, leirvik: e, mjondalen: e, "xn--mjndalen-64a": e, mjøndalen: e, "mo-i-rana": e, mosjoen: e, "xn--mosjen-eya": e, mosjøen: e, nesoddtangen: e, orkanger: e, osoyro: e, "xn--osyro-wua": e, osøyro: e, raholt: e, "xn--rholt-mra": e, råholt: e, sandnessjoen: e, "xn--sandnessjen-ogb": e, sandnessjøen: e, skedsmokorset: e, slattum: e, spjelkavik: e, stathelle: e, stavern: e, stjordalshalsen: e, "xn--stjrdalshalsen-sqb": e, stjørdalshalsen: e, tananger: e, tranby: e, vossevangen: e, aarborte: e, aejrie: e, afjord: e, "xn--fjord-lra": e, åfjord: e, agdenes: e, akershus: We, aknoluokta: e, "xn--koluokta-7ya57h": e, ákŋoluokta: e, al: e, "xn--l-1fa": e, ål: e, alaheadju: e, "xn--laheadju-7ya": e, álaheadju: e, alesund: e, "xn--lesund-hua": e, ålesund: e, alstahaug: e, alta: e, "xn--lt-liac": e, áltá: e, alvdal: e, amli: e, "xn--mli-tla": e, åmli: e, amot: e, "xn--mot-tla": e, åmot: e, andasuolo: e, andebu: e, andoy: e, "xn--andy-ira": e, andøy: e, ardal: e, "xn--rdal-poa": e, årdal: e, aremark: e, arendal: e, "xn--s-1fa": e, ås: e, aseral: e, "xn--seral-lra": e, åseral: e, asker: e, askim: e, askoy: e, "xn--asky-ira": e, askøy: e, askvoll: e, asnes: e, "xn--snes-poa": e, åsnes: e, audnedaln: e, aukra: e, aure: e, aurland: e, "aurskog-holand": e, "xn--aurskog-hland-jnb": e, "aurskog-høland": e, austevoll: e, austrheim: e, averoy: e, "xn--avery-yua": e, averøy: e, badaddja: e, "xn--bdddj-mrabd": e, bådåddjå: e, "xn--brum-voa": e, bærum: e, bahcavuotna: e, "xn--bhcavuotna-s4a": e, báhcavuotna: e, bahccavuotna: e, "xn--bhccavuotna-k7a": e, báhccavuotna: e, baidar: e, "xn--bidr-5nac": e, báidár: e, bajddar: e, "xn--bjddar-pta": e, bájddar: e, balat: e, "xn--blt-elab": e, bálát: e, balestrand: e, ballangen: e, balsfjord: e, bamble: e, bardu: e, barum: e, batsfjord: e, "xn--btsfjord-9za": e, båtsfjord: e, bearalvahki: e, "xn--bearalvhki-y4a": e, bearalváhki: e, beardu: e, beiarn: e, berg: e, bergen: e, berlevag: e, "xn--berlevg-jxa": e, berlevåg: e, bievat: e, "xn--bievt-0qa": e, bievát: e, bindal: e, birkenes: e, bjarkoy: e, "xn--bjarky-fya": e, bjarkøy: e, bjerkreim: e, bjugn: e, bodo: e, "xn--bod-2na": e, bodø: e, bokn: e, bomlo: e, "xn--bmlo-gra": e, bømlo: e, bremanger: e, bronnoy: e, "xn--brnny-wuac": e, brønnøy: e, budejju: e, buskerud: We, bygland: e, bykle: e, cahcesuolo: e, "xn--hcesuolo-7ya35b": e, čáhcesuolo: e, davvenjarga: e, "xn--davvenjrga-y4a": e, davvenjárga: e, davvesiida: e, deatnu: e, dielddanuorri: e, divtasvuodna: e, divttasvuotna: e, donna: e, "xn--dnna-gra": e, dønna: e, dovre: e, drammen: e, drangedal: e, dyroy: e, "xn--dyry-ira": e, dyrøy: e, eid: e, eidfjord: e, eidsberg: e, eidskog: e, eidsvoll: e, eigersund: e, elverum: e, enebakk: e, engerdal: e, etne: e, etnedal: e, evenassi: e, "xn--eveni-0qa01ga": e, evenášši: e, evenes: e, "evje-og-hornnes": e, farsund: e, fauske: e, fedje: e, fet: e, finnoy: e, "xn--finny-yua": e, finnøy: e, fitjar: e, fjaler: e, fjell: e, fla: e, "xn--fl-zia": e, flå: e, flakstad: e, flatanger: e, flekkefjord: e, flesberg: e, flora: e, folldal: e, forde: e, "xn--frde-gra": e, førde: e, forsand: e, fosnes: e, "xn--frna-woa": e, fræna: e, frana: e, frei: e, frogn: e, froland: e, frosta: e, froya: e, "xn--frya-hra": e, frøya: e, fuoisku: e, fuossko: e, fusa: e, fyresdal: e, gaivuotna: e, "xn--givuotna-8ya": e, gáivuotna: e, galsa: e, "xn--gls-elac": e, gálsá: e, gamvik: e, gangaviika: e, "xn--ggaviika-8ya47h": e, gáŋgaviika: e, gaular: e, gausdal: e, giehtavuoatna: e, gildeskal: e, "xn--gildeskl-g0a": e, gildeskål: e, giske: e, gjemnes: e, gjerdrum: e, gjerstad: e, gjesdal: e, gjovik: e, "xn--gjvik-wua": e, gjøvik: e, gloppen: e, gol: e, gran: e, grane: e, granvin: e, gratangen: e, grimstad: e, grong: e, grue: e, gulen: e, guovdageaidnu: e, ha: e, "xn--h-2fa": e, hå: e, habmer: e, "xn--hbmer-xqa": e, hábmer: e, hadsel: e, "xn--hgebostad-g3a": e, hægebostad: e, hagebostad: e, halden: e, halsa: e, hamar: e, hamaroy: e, hammarfeasta: e, "xn--hmmrfeasta-s4ac": e, hámmárfeasta: e, hammerfest: e, hapmir: e, "xn--hpmir-xqa": e, hápmir: e, haram: e, hareid: e, harstad: e, hasvik: e, hattfjelldal: e, haugesund: e, hedmark: [0, { os: e, valer: e, "xn--vler-qoa": e, våler: e }], hemne: e, hemnes: e, hemsedal: e, hitra: e, hjartdal: e, hjelmeland: e, hobol: e, "xn--hobl-ira": e, hobøl: e, hof: e, hol: e, hole: e, holmestrand: e, holtalen: e, "xn--holtlen-hxa": e, holtålen: e, hordaland: [0, { os: e }], hornindal: e, horten: e, hoyanger: e, "xn--hyanger-q1a": e, høyanger: e, hoylandet: e, "xn--hylandet-54a": e, høylandet: e, hurdal: e, hurum: e, hvaler: e, hyllestad: e, ibestad: e, inderoy: e, "xn--indery-fya": e, inderøy: e, iveland: e, ivgu: e, jevnaker: e, jolster: e, "xn--jlster-bya": e, jølster: e, jondal: e, kafjord: e, "xn--kfjord-iua": e, kåfjord: e, karasjohka: e, "xn--krjohka-hwab49j": e, kárášjohka: e, karasjok: e, karlsoy: e, karmoy: e, "xn--karmy-yua": e, karmøy: e, kautokeino: e, klabu: e, "xn--klbu-woa": e, klæbu: e, klepp: e, kongsberg: e, kongsvinger: e, kraanghke: e, "xn--kranghke-b0a": e, kråanghke: e, kragero: e, "xn--krager-gya": e, kragerø: e, kristiansand: e, kristiansund: e, krodsherad: e, "xn--krdsherad-m8a": e, krødsherad: e, "xn--kvfjord-nxa": e, kvæfjord: e, "xn--kvnangen-k0a": e, kvænangen: e, kvafjord: e, kvalsund: e, kvam: e, kvanangen: e, kvinesdal: e, kvinnherad: e, kviteseid: e, kvitsoy: e, "xn--kvitsy-fya": e, kvitsøy: e, laakesvuemie: e, "xn--lrdal-sra": e, lærdal: e, lahppi: e, "xn--lhppi-xqa": e, láhppi: e, lardal: e, larvik: e, lavagis: e, lavangen: e, leangaviika: e, "xn--leagaviika-52b": e, leaŋgaviika: e, lebesby: e, leikanger: e, leirfjord: e, leka: e, leksvik: e, lenvik: e, lerdal: e, lesja: e, levanger: e, lier: e, lierne: e, lillehammer: e, lillesand: e, lindas: e, "xn--linds-pra": e, lindås: e, lindesnes: e, loabat: e, "xn--loabt-0qa": e, loabát: e, lodingen: e, "xn--ldingen-q1a": e, lødingen: e, lom: e, loppa: e, lorenskog: e, "xn--lrenskog-54a": e, lørenskog: e, loten: e, "xn--lten-gra": e, løten: e, lund: e, lunner: e, luroy: e, "xn--lury-ira": e, lurøy: e, luster: e, lyngdal: e, lyngen: e, malatvuopmi: e, "xn--mlatvuopmi-s4a": e, málatvuopmi: e, malselv: e, "xn--mlselv-iua": e, målselv: e, malvik: e, mandal: e, marker: e, marnardal: e, masfjorden: e, masoy: e, "xn--msy-ula0h": e, måsøy: e, "matta-varjjat": e, "xn--mtta-vrjjat-k7af": e, "mátta-várjjat": e, meland: e, meldal: e, melhus: e, meloy: e, "xn--mely-ira": e, meløy: e, meraker: e, "xn--merker-kua": e, meråker: e, midsund: e, "midtre-gauldal": e, moareke: e, "xn--moreke-jua": e, moåreke: e, modalen: e, modum: e, molde: e, "more-og-romsdal": [0, { heroy: e, sande: e }], "xn--mre-og-romsdal-qqb": [0, { "xn--hery-ira": e, sande: e }], "møre-og-romsdal": [0, { herøy: e, sande: e }], moskenes: e, moss: e, mosvik: e, muosat: e, "xn--muost-0qa": e, muosát: e, naamesjevuemie: e, "xn--nmesjevuemie-tcba": e, nååmesjevuemie: e, "xn--nry-yla5g": e, nærøy: e, namdalseid: e, namsos: e, namsskogan: e, nannestad: e, naroy: e, narviika: e, narvik: e, naustdal: e, navuotna: e, "xn--nvuotna-hwa": e, návuotna: e, "nedre-eiker": e, nesna: e, nesodden: e, nesseby: e, nesset: e, nissedal: e, nittedal: e, "nord-aurdal": e, "nord-fron": e, "nord-odal": e, norddal: e, nordkapp: e, nordland: [0, { bo: e, "xn--b-5ga": e, bø: e, heroy: e, "xn--hery-ira": e, herøy: e }], "nordre-land": e, nordreisa: e, "nore-og-uvdal": e, notodden: e, notteroy: e, "xn--nttery-byae": e, nøtterøy: e, odda: e, oksnes: e, "xn--ksnes-uua": e, øksnes: e, omasvuotna: e, oppdal: e, oppegard: e, "xn--oppegrd-ixa": e, oppegård: e, orkdal: e, orland: e, "xn--rland-uua": e, ørland: e, orskog: e, "xn--rskog-uua": e, ørskog: e, orsta: e, "xn--rsta-fra": e, ørsta: e, osen: e, osteroy: e, "xn--ostery-fya": e, osterøy: e, ostfold: [0, { valer: e }], "xn--stfold-9xa": [0, { "xn--vler-qoa": e }], østfold: [0, { våler: e }], "ostre-toten": e, "xn--stre-toten-zcb": e, "østre-toten": e, overhalla: e, "ovre-eiker": e, "xn--vre-eiker-k8a": e, "øvre-eiker": e, oyer: e, "xn--yer-zna": e, øyer: e, oygarden: e, "xn--ygarden-p1a": e, øygarden: e, "oystre-slidre": e, "xn--ystre-slidre-ujb": e, "øystre-slidre": e, porsanger: e, porsangu: e, "xn--porsgu-sta26f": e, porsáŋgu: e, porsgrunn: e, rade: e, "xn--rde-ula": e, råde: e, radoy: e, "xn--rady-ira": e, radøy: e, "xn--rlingen-mxa": e, rælingen: e, rahkkeravju: e, "xn--rhkkervju-01af": e, ráhkkerávju: e, raisa: e, "xn--risa-5na": e, ráisa: e, rakkestad: e, ralingen: e, rana: e, randaberg: e, rauma: e, rendalen: e, rennebu: e, rennesoy: e, "xn--rennesy-v1a": e, rennesøy: e, rindal: e, ringebu: e, ringerike: e, ringsaker: e, risor: e, "xn--risr-ira": e, risør: e, rissa: e, roan: e, rodoy: e, "xn--rdy-0nab": e, rødøy: e, rollag: e, romsa: e, romskog: e, "xn--rmskog-bya": e, rømskog: e, roros: e, "xn--rros-gra": e, røros: e, rost: e, "xn--rst-0na": e, røst: e, royken: e, "xn--ryken-vua": e, røyken: e, royrvik: e, "xn--ryrvik-bya": e, røyrvik: e, ruovat: e, rygge: e, salangen: e, salat: e, "xn--slat-5na": e, sálat: e, "xn--slt-elab": e, sálát: e, saltdal: e, samnanger: e, sandefjord: e, sandnes: e, sandoy: e, "xn--sandy-yua": e, sandøy: e, sarpsborg: e, sauda: e, sauherad: e, sel: e, selbu: e, selje: e, seljord: e, siellak: e, sigdal: e, siljan: e, sirdal: e, skanit: e, "xn--sknit-yqa": e, skánit: e, skanland: e, "xn--sknland-fxa": e, skånland: e, skaun: e, skedsmo: e, ski: e, skien: e, skierva: e, "xn--skierv-uta": e, skiervá: e, skiptvet: e, skjak: e, "xn--skjk-soa": e, skjåk: e, skjervoy: e, "xn--skjervy-v1a": e, skjervøy: e, skodje: e, smola: e, "xn--smla-hra": e, smøla: e, snaase: e, "xn--snase-nra": e, snåase: e, snasa: e, "xn--snsa-roa": e, snåsa: e, snillfjord: e, snoasa: e, sogndal: e, sogne: e, "xn--sgne-gra": e, søgne: e, sokndal: e, sola: e, solund: e, somna: e, "xn--smna-gra": e, sømna: e, "sondre-land": e, "xn--sndre-land-0cb": e, "søndre-land": e, songdalen: e, "sor-aurdal": e, "xn--sr-aurdal-l8a": e, "sør-aurdal": e, "sor-fron": e, "xn--sr-fron-q1a": e, "sør-fron": e, "sor-odal": e, "xn--sr-odal-q1a": e, "sør-odal": e, "sor-varanger": e, "xn--sr-varanger-ggb": e, "sør-varanger": e, sorfold: e, "xn--srfold-bya": e, sørfold: e, sorreisa: e, "xn--srreisa-q1a": e, sørreisa: e, sortland: e, sorum: e, "xn--srum-gra": e, sørum: e, spydeberg: e, stange: e, stavanger: e, steigen: e, steinkjer: e, stjordal: e, "xn--stjrdal-s1a": e, stjørdal: e, stokke: e, "stor-elvdal": e, stord: e, stordal: e, storfjord: e, strand: e, stranda: e, stryn: e, sula: e, suldal: e, sund: e, sunndal: e, surnadal: e, sveio: e, svelvik: e, sykkylven: e, tana: e, telemark: [0, { bo: e, "xn--b-5ga": e, bø: e }], time: e, tingvoll: e, tinn: e, tjeldsund: e, tjome: e, "xn--tjme-hra": e, tjøme: e, tokke: e, tolga: e, tonsberg: e, "xn--tnsberg-q1a": e, tønsberg: e, torsken: e, "xn--trna-woa": e, træna: e, trana: e, tranoy: e, "xn--trany-yua": e, tranøy: e, troandin: e, trogstad: e, "xn--trgstad-r1a": e, trøgstad: e, tromsa: e, tromso: e, "xn--troms-zua": e, tromsø: e, trondheim: e, trysil: e, tvedestrand: e, tydal: e, tynset: e, tysfjord: e, tysnes: e, "xn--tysvr-vra": e, tysvær: e, tysvar: e, ullensaker: e, ullensvang: e, ulvik: e, unjarga: e, "xn--unjrga-rta": e, unjárga: e, utsira: e, vaapste: e, vadso: e, "xn--vads-jra": e, vadsø: e, "xn--vry-yla5g": e, værøy: e, vaga: e, "xn--vg-yiab": e, vågå: e, vagan: e, "xn--vgan-qoa": e, vågan: e, vagsoy: e, "xn--vgsy-qoa0j": e, vågsøy: e, vaksdal: e, valle: e, vang: e, vanylven: e, vardo: e, "xn--vard-jra": e, vardø: e, varggat: e, "xn--vrggt-xqad": e, várggát: e, varoy: e, vefsn: e, vega: e, vegarshei: e, "xn--vegrshei-c0a": e, vegårshei: e, vennesla: e, verdal: e, verran: e, vestby: e, vestfold: [0, { sande: e }], vestnes: e, "vestre-slidre": e, "vestre-toten": e, vestvagoy: e, "xn--vestvgy-ixa6o": e, vestvågøy: e, vevelstad: e, vik: e, vikna: e, vindafjord: e, voagat: e, volda: e, voss: e, co: a, "123hjemmeside": a, myspreadshop: a }], np: _, nr: Ge, nu: [1, { merseine: a, mine: a, shacknet: a, enterprisecloud: a }], nz: [1, { ac: e, co: e, cri: e, geek: e, gen: e, govt: e, health: e, iwi: e, kiwi: e, maori: e, "xn--mori-qsa": e, māori: e, mil: e, net: e, org: e, parliament: e, school: e, cloudns: a }], om: [1, { co: e, com: e, edu: e, gov: e, med: e, museum: e, net: e, org: e, pro: e }], onion: e, org: [1, { altervista: a, pimienta: a, poivron: a, potager: a, sweetpepper: a, cdn77: [0, { c: a, rsc: a }], "cdn77-secure": [0, { origin: [0, { ssl: a }] }], ae: a, cloudns: a, "ip-dynamic": a, ddnss: a, dpdns: a, duckdns: a, tunk: a, blogdns: a, blogsite: a, boldlygoingnowhere: a, dnsalias: a, dnsdojo: a, doesntexist: a, dontexist: a, doomdns: a, dvrdns: a, dynalias: a, dyndns: [2, { go: a, home: a }], endofinternet: a, endoftheinternet: a, "from-me": a, "game-host": a, gotdns: a, "hobby-site": a, homedns: a, homeftp: a, homelinux: a, homeunix: a, "is-a-bruinsfan": a, "is-a-candidate": a, "is-a-celticsfan": a, "is-a-chef": a, "is-a-geek": a, "is-a-knight": a, "is-a-linux-user": a, "is-a-patsfan": a, "is-a-soxfan": a, "is-found": a, "is-lost": a, "is-saved": a, "is-very-bad": a, "is-very-evil": a, "is-very-good": a, "is-very-nice": a, "is-very-sweet": a, "isa-geek": a, "kicks-ass": a, misconfused: a, podzone: a, readmyblog: a, selfip: a, sellsyourhome: a, servebbs: a, serveftp: a, servegame: a, "stuff-4-sale": a, webhop: a, accesscam: a, camdvr: a, freeddns: a, mywire: a, webredirect: a, twmail: a, eu: [2, { al: a, asso: a, at: a, au: a, be: a, bg: a, ca: a, cd: a, ch: a, cn: a, cy: a, cz: a, de: a, dk: a, edu: a, ee: a, es: a, fi: a, fr: a, gr: a, hr: a, hu: a, ie: a, il: a, in: a, int: a, is: a, it: a, jp: a, kr: a, lt: a, lu: a, lv: a, me: a, mk: a, mt: a, my: a, net: a, ng: a, nl: a, no: a, nz: a, pl: a, pt: a, ro: a, ru: a, se: a, si: a, sk: a, tr: a, uk: a, us: a }], fedorainfracloud: a, fedorapeople: a, fedoraproject: [0, { cloud: a, os: V, stg: [0, { os: V }] }], freedesktop: a, hatenadiary: a, hepforge: a, "in-dsl": a, "in-vpn": a, js: a, barsy: a, mayfirst: a, routingthecloud: a, bmoattachments: a, "cable-modem": a, collegefan: a, couchpotatofries: a, hopto: a, mlbfan: a, myftp: a, mysecuritycamera: a, nflfan: a, "no-ip": a, "read-books": a, ufcfan: a, zapto: a, dynserv: a, "now-dns": a, "is-local": a, httpbin: a, pubtls: a, jpn: a, "my-firewall": a, myfirewall: a, spdns: a, "small-web": a, dsmynas: a, familyds: a, teckids: Se, tuxfamily: a, diskstation: a, hk: a, us: a, toolforge: a, wmcloud: a, wmflabs: a, za: a }], pa: [1, { abo: e, ac: e, com: e, edu: e, gob: e, ing: e, med: e, net: e, nom: e, org: e, sld: e }], pe: [1, { com: e, edu: e, gob: e, mil: e, net: e, nom: e, org: e }], pf: [1, { com: e, edu: e, org: e }], pg: _, ph: [1, { com: e, edu: e, gov: e, i: e, mil: e, net: e, ngo: e, org: e, cloudns: a }], pk: [1, { ac: e, biz: e, com: e, edu: e, fam: e, gkp: e, gob: e, gog: e, gok: e, gop: e, gos: e, gov: e, net: e, org: e, web: e }], pl: [1, { com: e, net: e, org: e, agro: e, aid: e, atm: e, auto: e, biz: e, edu: e, gmina: e, gsm: e, info: e, mail: e, media: e, miasta: e, mil: e, nieruchomosci: e, nom: e, pc: e, powiat: e, priv: e, realestate: e, rel: e, sex: e, shop: e, sklep: e, sos: e, szkola: e, targi: e, tm: e, tourism: e, travel: e, turystyka: e, gov: [1, { ap: e, griw: e, ic: e, is: e, kmpsp: e, konsulat: e, kppsp: e, kwp: e, kwpsp: e, mup: e, mw: e, oia: e, oirm: e, oke: e, oow: e, oschr: e, oum: e, pa: e, pinb: e, piw: e, po: e, pr: e, psp: e, psse: e, pup: e, rzgw: e, sa: e, sdn: e, sko: e, so: e, sr: e, starostwo: e, ug: e, ugim: e, um: e, umig: e, upow: e, uppo: e, us: e, uw: e, uzs: e, wif: e, wiih: e, winb: e, wios: e, witd: e, wiw: e, wkz: e, wsa: e, wskr: e, wsse: e, wuoz: e, wzmiuw: e, zp: e, zpisdn: e }], augustow: e, "babia-gora": e, bedzin: e, beskidy: e, bialowieza: e, bialystok: e, bielawa: e, bieszczady: e, boleslawiec: e, bydgoszcz: e, bytom: e, cieszyn: e, czeladz: e, czest: e, dlugoleka: e, elblag: e, elk: e, glogow: e, gniezno: e, gorlice: e, grajewo: e, ilawa: e, jaworzno: e, "jelenia-gora": e, jgora: e, kalisz: e, karpacz: e, kartuzy: e, kaszuby: e, katowice: e, "kazimierz-dolny": e, kepno: e, ketrzyn: e, klodzko: e, kobierzyce: e, kolobrzeg: e, konin: e, konskowola: e, kutno: e, lapy: e, lebork: e, legnica: e, lezajsk: e, limanowa: e, lomza: e, lowicz: e, lubin: e, lukow: e, malbork: e, malopolska: e, mazowsze: e, mazury: e, mielec: e, mielno: e, mragowo: e, naklo: e, nowaruda: e, nysa: e, olawa: e, olecko: e, olkusz: e, olsztyn: e, opoczno: e, opole: e, ostroda: e, ostroleka: e, ostrowiec: e, ostrowwlkp: e, pila: e, pisz: e, podhale: e, podlasie: e, polkowice: e, pomorskie: e, pomorze: e, prochowice: e, pruszkow: e, przeworsk: e, pulawy: e, radom: e, "rawa-maz": e, rybnik: e, rzeszow: e, sanok: e, sejny: e, skoczow: e, slask: e, slupsk: e, sosnowiec: e, "stalowa-wola": e, starachowice: e, stargard: e, suwalki: e, swidnica: e, swiebodzin: e, swinoujscie: e, szczecin: e, szczytno: e, tarnobrzeg: e, tgory: e, turek: e, tychy: e, ustka: e, walbrzych: e, warmia: e, warszawa: e, waw: e, wegrow: e, wielun: e, wlocl: e, wloclawek: e, wodzislaw: e, wolomin: e, wroclaw: e, zachpomor: e, zagan: e, zarow: e, zgora: e, zgorzelec: e, art: a, gliwice: a, krakow: a, poznan: a, wroc: a, zakopane: a, beep: a, "ecommerce-shop": a, cfolks: a, dfirma: a, dkonto: a, you2: a, shoparena: a, homesklep: a, sdscloud: a, unicloud: a, lodz: a, pabianice: a, plock: a, sieradz: a, skierniewice: a, zgierz: a, krasnik: a, leczna: a, lubartow: a, lublin: a, poniatowa: a, swidnik: a, co: a, torun: a, simplesite: a, myspreadshop: a, gda: a, gdansk: a, gdynia: a, med: a, sopot: a, bielsko: a }], pm: [1, { own: a, name: a }], pn: [1, { co: e, edu: e, gov: e, net: e, org: e }], post: e, pr: [1, { biz: e, com: e, edu: e, gov: e, info: e, isla: e, name: e, net: e, org: e, pro: e, ac: e, est: e, prof: e }], pro: [1, { aaa: e, aca: e, acct: e, avocat: e, bar: e, cpa: e, eng: e, jur: e, law: e, med: e, recht: e, "12chars": a, cloudns: a, barsy: a, ngrok: a }], ps: [1, { com: e, edu: e, gov: e, net: e, org: e, plo: e, sec: e }], pt: [1, { com: e, edu: e, gov: e, int: e, net: e, nome: e, org: e, publ: e, "123paginaweb": a }], pw: [1, { gov: e, cloudns: a, x443: a }], py: [1, { com: e, coop: e, edu: e, gov: e, mil: e, net: e, org: e }], qa: [1, { com: e, edu: e, gov: e, mil: e, name: e, net: e, org: e, sch: e }], re: [1, { asso: e, com: e, netlib: a, can: a }], ro: [1, { arts: e, com: e, firm: e, info: e, nom: e, nt: e, org: e, rec: e, store: e, tm: e, www: e, co: a, shop: a, barsy: a }], rs: [1, { ac: e, co: e, edu: e, gov: e, in: e, org: e, brendly: He, barsy: a, ox: a }], ru: [1, { ac: a, edu: a, gov: a, int: a, mil: a, eurodir: a, adygeya: a, bashkiria: a, bir: a, cbg: a, com: a, dagestan: a, grozny: a, kalmykia: a, kustanai: a, marine: a, mordovia: a, msk: a, mytis: a, nalchik: a, nov: a, pyatigorsk: a, spb: a, vladikavkaz: a, vladimir: a, na4u: a, mircloud: a, myjino: [2, { hosting: i, landing: i, spectrum: i, vps: i }], cldmail: [0, { hb: a }], mcdir: [2, { vps: a }], mcpre: a, net: a, org: a, pp: a, lk3: a, ras: a }], rw: [1, { ac: e, co: e, coop: e, gov: e, mil: e, net: e, org: e }], sa: [1, { com: e, edu: e, gov: e, med: e, net: e, org: e, pub: e, sch: e }], sb: r, sc: r, sd: [1, { com: e, edu: e, gov: e, info: e, med: e, net: e, org: e, tv: e }], se: [1, { a: e, ac: e, b: e, bd: e, brand: e, c: e, d: e, e, f: e, fh: e, fhsk: e, fhv: e, g: e, h: e, i: e, k: e, komforb: e, kommunalforbund: e, komvux: e, l: e, lanbib: e, m: e, n: e, naturbruksgymn: e, o: e, org: e, p: e, parti: e, pp: e, press: e, r: e, s: e, t: e, tm: e, u: e, w: e, x: e, y: e, z: e, com: a, iopsys: a, "123minsida": a, itcouldbewor: a, myspreadshop: a }], sg: [1, { com: e, edu: e, gov: e, net: e, org: e, enscaled: a }], sh: [1, { com: e, gov: e, mil: e, net: e, org: e, hashbang: a, botda: a, platform: [0, { ent: a, eu: a, us: a }], now: a }], si: [1, { f5: a, gitapp: a, gitpage: a }], sj: e, sk: e, sl: r, sm: e, sn: [1, { art: e, com: e, edu: e, gouv: e, org: e, perso: e, univ: e }], so: [1, { com: e, edu: e, gov: e, me: e, net: e, org: e, surveys: a }], sr: e, ss: [1, { biz: e, co: e, com: e, edu: e, gov: e, me: e, net: e, org: e, sch: e }], st: [1, { co: e, com: e, consulado: e, edu: e, embaixada: e, mil: e, net: e, org: e, principe: e, saotome: e, store: e, helioho: a, kirara: a, noho: a }], su: [1, { abkhazia: a, adygeya: a, aktyubinsk: a, arkhangelsk: a, armenia: a, ashgabad: a, azerbaijan: a, balashov: a, bashkiria: a, bryansk: a, bukhara: a, chimkent: a, dagestan: a, "east-kazakhstan": a, exnet: a, georgia: a, grozny: a, ivanovo: a, jambyl: a, kalmykia: a, kaluga: a, karacol: a, karaganda: a, karelia: a, khakassia: a, krasnodar: a, kurgan: a, kustanai: a, lenug: a, mangyshlak: a, mordovia: a, msk: a, murmansk: a, nalchik: a, navoi: a, "north-kazakhstan": a, nov: a, obninsk: a, penza: a, pokrovsk: a, sochi: a, spb: a, tashkent: a, termez: a, togliatti: a, troitsk: a, tselinograd: a, tula: a, tuva: a, vladikavkaz: a, vladimir: a, vologda: a }], sv: [1, { com: e, edu: e, gob: e, org: e, red: e }], sx: p, sy: u, sz: [1, { ac: e, co: e, org: e }], tc: e, td: e, tel: e, tf: [1, { sch: a }], tg: e, th: [1, { ac: e, co: e, go: e, in: e, mi: e, net: e, or: e, online: a, shop: a }], tj: [1, { ac: e, biz: e, co: e, com: e, edu: e, go: e, gov: e, int: e, mil: e, name: e, net: e, nic: e, org: e, test: e, web: e }], tk: e, tl: p, tm: [1, { co: e, com: e, edu: e, gov: e, mil: e, net: e, nom: e, org: e }], tn: [1, { com: e, ens: e, fin: e, gov: e, ind: e, info: e, intl: e, mincom: e, nat: e, net: e, org: e, perso: e, tourism: e, orangecloud: a }], to: [1, { 611: a, com: e, edu: e, gov: e, mil: e, net: e, org: e, oya: a, x0: a, quickconnect: o, vpnplus: a }], tr: [1, { av: e, bbs: e, bel: e, biz: e, com: e, dr: e, edu: e, gen: e, gov: e, info: e, k12: e, kep: e, mil: e, name: e, net: e, org: e, pol: e, tel: e, tsk: e, tv: e, web: e, nc: p }], tt: [1, { biz: e, co: e, com: e, edu: e, gov: e, info: e, mil: e, name: e, net: e, org: e, pro: e }], tv: [1, { "better-than": a, dyndns: a, "on-the-web": a, "worse-than": a, from: a, sakura: a }], tw: [1, { club: e, com: [1, { mymailer: a }], ebiz: e, edu: e, game: e, gov: e, idv: e, mil: e, net: e, org: e, url: a, mydns: a }], tz: [1, { ac: e, co: e, go: e, hotel: e, info: e, me: e, mil: e, mobi: e, ne: e, or: e, sc: e, tv: e }], ua: [1, { com: e, edu: e, gov: e, in: e, net: e, org: e, cherkassy: e, cherkasy: e, chernigov: e, chernihiv: e, chernivtsi: e, chernovtsy: e, ck: e, cn: e, cr: e, crimea: e, cv: e, dn: e, dnepropetrovsk: e, dnipropetrovsk: e, donetsk: e, dp: e, if: e, "ivano-frankivsk": e, kh: e, kharkiv: e, kharkov: e, kherson: e, khmelnitskiy: e, khmelnytskyi: e, kiev: e, kirovograd: e, km: e, kr: e, kropyvnytskyi: e, krym: e, ks: e, kv: e, kyiv: e, lg: e, lt: e, lugansk: e, luhansk: e, lutsk: e, lv: e, lviv: e, mk: e, mykolaiv: e, nikolaev: e, od: e, odesa: e, odessa: e, pl: e, poltava: e, rivne: e, rovno: e, rv: e, sb: e, sebastopol: e, sevastopol: e, sm: e, sumy: e, te: e, ternopil: e, uz: e, uzhgorod: e, uzhhorod: e, vinnica: e, vinnytsia: e, vn: e, volyn: e, yalta: e, zakarpattia: e, zaporizhzhe: e, zaporizhzhia: e, zhitomir: e, zhytomyr: e, zp: e, zt: e, cc: a, inf: a, ltd: a, cx: a, ie: a, biz: a, co: a, pp: a, v: a }], ug: [1, { ac: e, co: e, com: e, edu: e, go: e, gov: e, mil: e, ne: e, or: e, org: e, sc: e, us: e }], uk: [1, { ac: e, co: [1, { bytemark: [0, { dh: a, vm: a }], layershift: D, barsy: a, barsyonline: a, retrosnub: Ve, "nh-serv": a, "no-ip": a, adimo: a, myspreadshop: a }], gov: [1, { api: a, campaign: a, service: a }], ltd: e, me: e, net: e, nhs: e, org: [1, { glug: a, lug: a, lugs: a, affinitylottery: a, raffleentry: a, weeklylottery: a }], plc: e, police: e, sch: _, conn: a, copro: a, hosp: a, "independent-commission": a, "independent-inquest": a, "independent-inquiry": a, "independent-panel": a, "independent-review": a, "public-inquiry": a, "royal-commission": a, pymnt: a, barsy: a, nimsite: a, oraclegovcloudapps: i }], us: [1, { dni: e, isa: e, nsn: e, ak: I, al: I, ar: I, as: I, az: I, ca: I, co: I, ct: I, dc: I, de: [1, { cc: e, lib: a }], fl: I, ga: I, gu: I, hi: le, ia: I, id: I, il: I, in: I, ks: I, ky: I, la: I, ma: [1, { k12: [1, { chtr: e, paroch: e, pvt: e }], cc: e, lib: e }], md: I, me: I, mi: [1, { k12: e, cc: e, lib: e, "ann-arbor": e, cog: e, dst: e, eaton: e, gen: e, mus: e, tec: e, washtenaw: e }], mn: I, mo: I, ms: I, mt: I, nc: I, nd: le, ne: I, nh: I, nj: I, nm: I, nv: I, ny: I, oh: I, ok: I, or: I, pa: I, pr: I, ri: le, sc: I, sd: le, tn: I, tx: I, ut: I, va: I, vi: I, vt: I, wa: I, wi: I, wv: [1, { cc: e }], wy: I, cloudns: a, "is-by": a, "land-4-sale": a, "stuff-4-sale": a, heliohost: a, enscaled: [0, { phx: a }], mircloud: a, ngo: a, golffan: a, noip: a, pointto: a, freeddns: a, srv: [2, { gh: a, gl: a }], platterp: a, servername: a }], uy: [1, { com: e, edu: e, gub: e, mil: e, net: e, org: e }], uz: [1, { co: e, com: e, net: e, org: e }], va: e, vc: [1, { com: e, edu: e, gov: e, mil: e, net: e, org: e, gv: [2, { d: a }], "0e": i, mydns: a }], ve: [1, { arts: e, bib: e, co: e, com: e, e12: e, edu: e, emprende: e, firm: e, gob: e, gov: e, info: e, int: e, mil: e, net: e, nom: e, org: e, rar: e, rec: e, store: e, tec: e, web: e }], vg: [1, { edu: e }], vi: [1, { co: e, com: e, k12: e, net: e, org: e }], vn: [1, { ac: e, ai: e, biz: e, com: e, edu: e, gov: e, health: e, id: e, info: e, int: e, io: e, name: e, net: e, org: e, pro: e, angiang: e, bacgiang: e, backan: e, baclieu: e, bacninh: e, "baria-vungtau": e, bentre: e, binhdinh: e, binhduong: e, binhphuoc: e, binhthuan: e, camau: e, cantho: e, caobang: e, daklak: e, daknong: e, danang: e, dienbien: e, dongnai: e, dongthap: e, gialai: e, hagiang: e, haiduong: e, haiphong: e, hanam: e, hanoi: e, hatinh: e, haugiang: e, hoabinh: e, hungyen: e, khanhhoa: e, kiengiang: e, kontum: e, laichau: e, lamdong: e, langson: e, laocai: e, longan: e, namdinh: e, nghean: e, ninhbinh: e, ninhthuan: e, phutho: e, phuyen: e, quangbinh: e, quangnam: e, quangngai: e, quangninh: e, quangtri: e, soctrang: e, sonla: e, tayninh: e, thaibinh: e, thainguyen: e, thanhhoa: e, thanhphohochiminh: e, thuathienhue: e, tiengiang: e, travinh: e, tuyenquang: e, vinhlong: e, vinhphuc: e, yenbai: e }], vu: N, wf: [1, { biz: a, sch: a }], ws: [1, { com: e, edu: e, gov: e, net: e, org: e, advisor: i, cloud66: a, dyndns: a, mypets: a }], yt: [1, { org: a }], "xn--mgbaam7a8h": e, امارات: e, "xn--y9a3aq": e, հայ: e, "xn--54b7fta0cc": e, বাংলা: e, "xn--90ae": e, бг: e, "xn--mgbcpq6gpa1a": e, البحرين: e, "xn--90ais": e, бел: e, "xn--fiqs8s": e, 中国: e, "xn--fiqz9s": e, 中國: e, "xn--lgbbat1ad8j": e, الجزائر: e, "xn--wgbh1c": e, مصر: e, "xn--e1a4c": e, ею: e, "xn--qxa6a": e, ευ: e, "xn--mgbah1a3hjkrd": e, موريتانيا: e, "xn--node": e, გე: e, "xn--qxam": e, ελ: e, "xn--j6w193g": [1, { "xn--gmqw5a": e, "xn--55qx5d": e, "xn--mxtq1m": e, "xn--wcvs22d": e, "xn--uc0atv": e, "xn--od0alg": e }], 香港: [1, { 個人: e, 公司: e, 政府: e, 教育: e, 組織: e, 網絡: e }], "xn--2scrj9c": e, ಭಾರತ: e, "xn--3hcrj9c": e, ଭାରତ: e, "xn--45br5cyl": e, ভাৰত: e, "xn--h2breg3eve": e, भारतम्: e, "xn--h2brj9c8c": e, भारोत: e, "xn--mgbgu82a": e, ڀارت: e, "xn--rvc1e0am3e": e, ഭാരതം: e, "xn--h2brj9c": e, भारत: e, "xn--mgbbh1a": e, بارت: e, "xn--mgbbh1a71e": e, بھارت: e, "xn--fpcrj9c3d": e, భారత్: e, "xn--gecrj9c": e, ભારત: e, "xn--s9brj9c": e, ਭਾਰਤ: e, "xn--45brj9c": e, ভারত: e, "xn--xkc2dl3a5ee0h": e, இந்தியா: e, "xn--mgba3a4f16a": e, ایران: e, "xn--mgba3a4fra": e, ايران: e, "xn--mgbtx2b": e, عراق: e, "xn--mgbayh7gpa": e, الاردن: e, "xn--3e0b707e": e, 한국: e, "xn--80ao21a": e, қаз: e, "xn--q7ce6a": e, ລາວ: e, "xn--fzc2c9e2c": e, ලංකා: e, "xn--xkc2al3hye2a": e, இலங்கை: e, "xn--mgbc0a9azcg": e, المغرب: e, "xn--d1alf": e, мкд: e, "xn--l1acc": e, мон: e, "xn--mix891f": e, 澳門: e, "xn--mix082f": e, 澳门: e, "xn--mgbx4cd0ab": e, مليسيا: e, "xn--mgb9awbf": e, عمان: e, "xn--mgbai9azgqp6j": e, پاکستان: e, "xn--mgbai9a5eva00b": e, پاكستان: e, "xn--ygbi2ammx": e, فلسطين: e, "xn--90a3ac": [1, { "xn--80au": e, "xn--90azh": e, "xn--d1at": e, "xn--c1avg": e, "xn--o1ac": e, "xn--o1ach": e }], срб: [1, { ак: e, обр: e, од: e, орг: e, пр: e, упр: e }], "xn--p1ai": e, рф: e, "xn--wgbl6a": e, قطر: e, "xn--mgberp4a5d4ar": e, السعودية: e, "xn--mgberp4a5d4a87g": e, السعودیة: e, "xn--mgbqly7c0a67fbc": e, السعودیۃ: e, "xn--mgbqly7cvafr": e, السعوديه: e, "xn--mgbpl2fh": e, سودان: e, "xn--yfro4i67o": e, 新加坡: e, "xn--clchc0ea0b2g2a9gcd": e, சிங்கப்பூர்: e, "xn--ogbpf8fl": e, سورية: e, "xn--mgbtf8fl": e, سوريا: e, "xn--o3cw4h": [1, { "xn--o3cyx2a": e, "xn--12co0c3b4eva": e, "xn--m3ch0j3a": e, "xn--h3cuzk1di": e, "xn--12c1fe0br": e, "xn--12cfi8ixb8l": e }], ไทย: [1, { ทหาร: e, ธุรกิจ: e, เน็ต: e, รัฐบาล: e, ศึกษา: e, องค์กร: e }], "xn--pgbs0dh": e, تونس: e, "xn--kpry57d": e, 台灣: e, "xn--kprw13d": e, 台湾: e, "xn--nnx388a": e, 臺灣: e, "xn--j1amh": e, укр: e, "xn--mgb2ddes": e, اليمن: e, xxx: e, ye: u, za: [0, { ac: e, agric: e, alt: e, co: e, edu: e, gov: e, grondar: e, law: e, mil: e, net: e, ngo: e, nic: e, nis: e, nom: e, org: e, school: e, tm: e, web: e }], zm: [1, { ac: e, biz: e, co: e, com: e, edu: e, gov: e, info: e, mil: e, net: e, org: e, sch: e }], zw: [1, { ac: e, co: e, gov: e, mil: e, org: e }], aaa: e, aarp: e, abb: e, abbott: e, abbvie: e, abc: e, able: e, abogado: e, abudhabi: e, academy: [1, { official: a }], accenture: e, accountant: e, accountants: e, aco: e, actor: e, ads: e, adult: e, aeg: e, aetna: e, afl: e, africa: e, agakhan: e, agency: e, aig: e, airbus: e, airforce: e, airtel: e, akdn: e, alibaba: e, alipay: e, allfinanz: e, allstate: e, ally: e, alsace: e, alstom: e, amazon: e, americanexpress: e, americanfamily: e, amex: e, amfam: e, amica: e, amsterdam: e, analytics: e, android: e, anquan: e, anz: e, aol: e, apartments: e, app: [1, { adaptable: a, aiven: a, beget: i, brave: v, clerk: a, clerkstage: a, wnext: a, csb: [2, { preview: a }], convex: a, deta: a, ondigitalocean: a, easypanel: a, encr: a, evervault: g, expo: [2, { staging: a }], edgecompute: a, "on-fleek": a, flutterflow: a, e2b: a, framer: a, hosted: i, run: i, web: a, hasura: a, botdash: a, loginline: a, lovable: a, medusajs: a, messerli: a, netfy: a, netlify: a, ngrok: a, "ngrok-free": a, developer: i, noop: a, northflank: i, upsun: i, replit: h, nyat: a, snowflake: [0, { "*": a, privatelink: i }], streamlit: a, storipress: a, telebit: a, typedream: a, vercel: a, bookonline: a, wdh: a, windsurf: a, zeabur: a, zerops: i }], apple: e, aquarelle: e, arab: e, aramco: e, archi: e, army: e, art: e, arte: e, asda: e, associates: e, athleta: e, attorney: e, auction: e, audi: e, audible: e, audio: e, auspost: e, author: e, auto: e, autos: e, aws: [1, { sagemaker: [0, { "ap-northeast-1": z, "ap-northeast-2": z, "ap-south-1": z, "ap-southeast-1": z, "ap-southeast-2": z, "ca-central-1": w, "eu-central-1": z, "eu-west-1": z, "eu-west-2": z, "us-east-1": w, "us-east-2": w, "us-west-2": w, "af-south-1": d, "ap-east-1": d, "ap-northeast-3": d, "ap-south-2": j, "ap-southeast-3": d, "ap-southeast-4": j, "ca-west-1": [0, { notebook: a, "notebook-fips": a }], "eu-central-2": d, "eu-north-1": d, "eu-south-1": d, "eu-south-2": d, "eu-west-3": d, "il-central-1": d, "me-central-1": d, "me-south-1": d, "sa-east-1": d, "us-gov-east-1": P, "us-gov-west-1": P, "us-west-1": [0, { notebook: a, "notebook-fips": a, studio: a }], experiments: i }], repost: [0, { private: i }], on: [0, { "ap-northeast-1": f, "ap-southeast-1": f, "ap-southeast-2": f, "eu-central-1": f, "eu-north-1": f, "eu-west-1": f, "us-east-1": f, "us-east-2": f, "us-west-2": f }] }], axa: e, azure: e, baby: e, baidu: e, banamex: e, band: e, bank: e, bar: e, barcelona: e, barclaycard: e, barclays: e, barefoot: e, bargains: e, baseball: e, basketball: [1, { aus: a, nz: a }], bauhaus: e, bayern: e, bbc: e, bbt: e, bbva: e, bcg: e, bcn: e, beats: e, beauty: e, beer: e, bentley: e, berlin: e, best: e, bestbuy: e, bet: e, bharti: e, bible: e, bid: e, bike: e, bing: e, bingo: e, bio: e, black: e, blackfriday: e, blockbuster: e, blog: e, bloomberg: e, blue: e, bms: e, bmw: e, bnpparibas: e, boats: e, boehringer: e, bofa: e, bom: e, bond: e, boo: e, book: e, booking: e, bosch: e, bostik: e, boston: e, bot: e, boutique: e, box: e, bradesco: e, bridgestone: e, broadway: e, broker: e, brother: e, brussels: e, build: [1, { v0: a, windsurf: a }], builders: [1, { cloudsite: a }], business: x, buy: e, buzz: e, bzh: e, cab: e, cafe: e, cal: e, call: e, calvinklein: e, cam: e, camera: e, camp: [1, { emf: [0, { at: a }] }], canon: e, capetown: e, capital: e, capitalone: e, car: e, caravan: e, cards: e, care: e, career: e, careers: e, cars: e, casa: [1, { nabu: [0, { ui: a }] }], case: e, cash: e, casino: e, catering: e, catholic: e, cba: e, cbn: e, cbre: e, center: e, ceo: e, cern: e, cfa: e, cfd: e, chanel: e, channel: e, charity: e, chase: e, chat: e, cheap: e, chintai: e, christmas: e, chrome: e, church: e, cipriani: e, circle: e, cisco: e, citadel: e, citi: e, citic: e, city: e, claims: e, cleaning: e, click: e, clinic: e, clinique: e, clothing: e, cloud: [1, { convex: a, elementor: a, encoway: [0, { eu: a }], statics: i, ravendb: a, axarnet: [0, { "es-1": a }], diadem: a, jelastic: [0, { vip: a }], jele: a, "jenv-aruba": [0, { aruba: [0, { eur: [0, { it1: a }] }], it1: a }], keliweb: [2, { cs: a }], oxa: [2, { tn: a, uk: a }], primetel: [2, { uk: a }], reclaim: [0, { ca: a, uk: a, us: a }], trendhosting: [0, { ch: a, de: a }], jotelulu: a, kuleuven: a, laravel: a, linkyard: a, magentosite: i, matlab: a, observablehq: a, perspecta: a, vapor: a, "on-rancher": i, scw: [0, { baremetal: [0, { "fr-par-1": a, "fr-par-2": a, "nl-ams-1": a }], "fr-par": [0, { cockpit: a, fnc: [2, { functions: a }], k8s: c, s3: a, "s3-website": a, whm: a }], instances: [0, { priv: a, pub: a }], k8s: a, "nl-ams": [0, { cockpit: a, k8s: c, s3: a, "s3-website": a, whm: a }], "pl-waw": [0, { cockpit: a, k8s: c, s3: a, "s3-website": a }], scalebook: a, smartlabeling: a }], servebolt: a, onstackit: [0, { runs: a }], trafficplex: a, "unison-services": a, urown: a, voorloper: a, zap: a }], club: [1, { cloudns: a, jele: a, barsy: a }], clubmed: e, coach: e, codes: [1, { owo: i }], coffee: e, college: e, cologne: e, commbank: e, community: [1, { nog: a, ravendb: a, myforum: a }], company: e, compare: e, computer: e, comsec: e, condos: e, construction: e, consulting: e, contact: e, contractors: e, cooking: e, cool: [1, { elementor: a, de: a }], corsica: e, country: e, coupon: e, coupons: e, courses: e, cpa: e, credit: e, creditcard: e, creditunion: e, cricket: e, crown: e, crs: e, cruise: e, cruises: e, cuisinella: e, cymru: e, cyou: e, dad: e, dance: e, data: e, date: e, dating: e, datsun: e, day: e, dclk: e, dds: e, deal: e, dealer: e, deals: e, degree: e, delivery: e, dell: e, deloitte: e, delta: e, democrat: e, dental: e, dentist: e, desi: e, design: [1, { graphic: a, bss: a }], dev: [1, { "12chars": a, myaddr: a, panel: a, lcl: i, lclstage: i, stg: i, stgstage: i, pages: a, r2: a, workers: a, deno: a, "deno-staging": a, deta: a, evervault: g, fly: a, githubpreview: a, gateway: i, hrsn: [2, { psl: [0, { sub: a, wc: [0, { "*": a, sub: i }] }] }], botdash: a, inbrowser: i, "is-a-good": a, "is-a": a, iserv: a, runcontainers: a, localcert: [0, { user: i }], loginline: a, barsy: a, mediatech: a, modx: a, ngrok: a, "ngrok-free": a, "is-a-fullstack": a, "is-cool": a, "is-not-a": a, localplayer: a, xmit: a, "platter-app": a, replit: [2, { archer: a, bones: a, canary: a, global: a, hacker: a, id: a, janeway: a, kim: a, kira: a, kirk: a, odo: a, paris: a, picard: a, pike: a, prerelease: a, reed: a, riker: a, sisko: a, spock: a, staging: a, sulu: a, tarpit: a, teams: a, tucker: a, wesley: a, worf: a }], crm: [0, { d: i, w: i, wa: i, wb: i, wc: i, wd: i, we: i, wf: i }], vercel: a, webhare: i }], dhl: e, diamonds: e, diet: e, digital: [1, { cloudapps: [2, { london: a }] }], direct: [1, { libp2p: a }], directory: e, discount: e, discover: e, dish: e, diy: e, dnp: e, docs: e, doctor: e, dog: e, domains: e, dot: e, download: e, drive: e, dtv: e, dubai: e, dunlop: e, dupont: e, durban: e, dvag: e, dvr: e, earth: e, eat: e, eco: e, edeka: e, education: x, email: [1, { crisp: [0, { on: a }], tawk: K, tawkto: K }], emerck: e, energy: e, engineer: e, engineering: e, enterprises: e, epson: e, equipment: e, ericsson: e, erni: e, esq: e, estate: [1, { compute: i }], eurovision: e, eus: [1, { party: $e }], events: [1, { koobin: a, co: a }], exchange: e, expert: e, exposed: e, express: e, extraspace: e, fage: e, fail: e, fairwinds: e, faith: e, family: e, fan: e, fans: e, farm: [1, { storj: a }], farmers: e, fashion: e, fast: e, fedex: e, feedback: e, ferrari: e, ferrero: e, fidelity: e, fido: e, film: e, final: e, finance: e, financial: x, fire: e, firestone: e, firmdale: e, fish: e, fishing: e, fit: e, fitness: e, flickr: e, flights: e, flir: e, florist: e, flowers: e, fly: e, foo: e, food: e, football: e, ford: e, forex: e, forsale: e, forum: e, foundation: e, fox: e, free: e, fresenius: e, frl: e, frogans: e, frontier: e, ftr: e, fujitsu: e, fun: e, fund: e, furniture: e, futbol: e, fyi: e, gal: e, gallery: e, gallo: e, gallup: e, game: e, games: [1, { pley: a, sheezy: a }], gap: e, garden: e, gay: [1, { pages: a }], gbiz: e, gdn: [1, { cnpy: a }], gea: e, gent: e, genting: e, george: e, ggee: e, gift: e, gifts: e, gives: e, giving: e, glass: e, gle: e, global: [1, { appwrite: a }], globo: e, gmail: e, gmbh: e, gmo: e, gmx: e, godaddy: e, gold: e, goldpoint: e, golf: e, goo: e, goodyear: e, goog: [1, { cloud: a, translate: a, usercontent: i }], google: e, gop: e, got: e, grainger: e, graphics: e, gratis: e, green: e, gripe: e, grocery: e, group: [1, { discourse: a }], gucci: e, guge: e, guide: e, guitars: e, guru: e, hair: e, hamburg: e, hangout: e, haus: e, hbo: e, hdfc: e, hdfcbank: e, health: [1, { hra: a }], healthcare: e, help: e, helsinki: e, here: e, hermes: e, hiphop: e, hisamitsu: e, hitachi: e, hiv: e, hkt: e, hockey: e, holdings: e, holiday: e, homedepot: e, homegoods: e, homes: e, homesense: e, honda: e, horse: e, hospital: e, host: [1, { cloudaccess: a, freesite: a, easypanel: a, fastvps: a, myfast: a, tempurl: a, wpmudev: a, jele: a, mircloud: a, wp2: a, half: a }], hosting: [1, { opencraft: a }], hot: e, hotels: e, hotmail: e, house: e, how: e, hsbc: e, hughes: e, hyatt: e, hyundai: e, ibm: e, icbc: e, ice: e, icu: e, ieee: e, ifm: e, ikano: e, imamat: e, imdb: e, immo: e, immobilien: e, inc: e, industries: e, infiniti: e, ing: e, ink: e, institute: e, insurance: e, insure: e, international: e, intuit: e, investments: e, ipiranga: e, irish: e, ismaili: e, ist: e, istanbul: e, itau: e, itv: e, jaguar: e, java: e, jcb: e, jeep: e, jetzt: e, jewelry: e, jio: e, jll: e, jmp: e, jnj: e, joburg: e, jot: e, joy: e, jpmorgan: e, jprs: e, juegos: e, juniper: e, kaufen: e, kddi: e, kerryhotels: e, kerryproperties: e, kfh: e, kia: e, kids: e, kim: e, kindle: e, kitchen: e, kiwi: e, koeln: e, komatsu: e, kosher: e, kpmg: e, kpn: e, krd: [1, { co: a, edu: a }], kred: e, kuokgroup: e, kyoto: e, lacaixa: e, lamborghini: e, lamer: e, lancaster: e, land: e, landrover: e, lanxess: e, lasalle: e, lat: e, latino: e, latrobe: e, law: e, lawyer: e, lds: e, lease: e, leclerc: e, lefrak: e, legal: e, lego: e, lexus: e, lgbt: e, lidl: e, life: e, lifeinsurance: e, lifestyle: e, lighting: e, like: e, lilly: e, limited: e, limo: e, lincoln: e, link: [1, { myfritz: a, cyon: a, dweb: i, inbrowser: i, nftstorage: Ie, mypep: a, storacha: Ie, w3s: Ie }], live: [1, { aem: a, hlx: a, ewp: i }], living: e, llc: e, llp: e, loan: e, loans: e, locker: e, locus: e, lol: [1, { omg: a }], london: e, lotte: e, lotto: e, love: e, lpl: e, lplfinancial: e, ltd: e, ltda: e, lundbeck: e, luxe: e, luxury: e, madrid: e, maif: e, maison: e, makeup: e, man: e, management: e, mango: e, map: e, market: e, marketing: e, markets: e, marriott: e, marshalls: e, mattel: e, mba: e, mckinsey: e, med: e, media: ce, meet: e, melbourne: e, meme: e, memorial: e, men: e, menu: [1, { barsy: a, barsyonline: a }], merck: e, merckmsd: e, miami: e, microsoft: e, mini: e, mint: e, mit: e, mitsubishi: e, mlb: e, mls: e, mma: e, mobile: e, moda: e, moe: e, moi: e, mom: [1, { ind: a }], monash: e, money: e, monster: e, mormon: e, mortgage: e, moscow: e, moto: e, motorcycles: e, mov: e, movie: e, msd: e, mtn: e, mtr: e, music: e, nab: e, nagoya: e, navy: e, nba: e, nec: e, netbank: e, netflix: e, network: [1, { alces: i, co: a, arvo: a, azimuth: a, tlon: a }], neustar: e, new: e, news: [1, { noticeable: a }], next: e, nextdirect: e, nexus: e, nfl: e, ngo: e, nhk: e, nico: e, nike: e, nikon: e, ninja: e, nissan: e, nissay: e, nokia: e, norton: e, now: e, nowruz: e, nowtv: e, nra: e, nrw: e, ntt: e, nyc: e, obi: e, observer: e, office: e, okinawa: e, olayan: e, olayangroup: e, ollo: e, omega: e, one: [1, { kin: i, service: a }], ong: [1, { obl: a }], onl: e, online: [1, { eero: a, "eero-stage": a, websitebuilder: a, barsy: a }], ooo: e, open: e, oracle: e, orange: [1, { tech: a }], organic: e, origins: e, osaka: e, otsuka: e, ott: e, ovh: [1, { nerdpol: a }], page: [1, { aem: a, hlx: a, hlx3: a, translated: a, codeberg: a, heyflow: a, prvcy: a, rocky: a, pdns: a, plesk: a }], panasonic: e, paris: e, pars: e, partners: e, parts: e, party: e, pay: e, pccw: e, pet: e, pfizer: e, pharmacy: e, phd: e, philips: e, phone: e, photo: e, photography: e, photos: ce, physio: e, pics: e, pictet: e, pictures: [1, { 1337: a }], pid: e, pin: e, ping: e, pink: e, pioneer: e, pizza: [1, { ngrok: a }], place: x, play: e, playstation: e, plumbing: e, plus: e, pnc: e, pohl: e, poker: e, politie: e, porn: e, pramerica: e, praxi: e, press: e, prime: e, prod: e, productions: e, prof: e, progressive: e, promo: e, properties: e, property: e, protection: e, pru: e, prudential: e, pub: [1, { id: i, kin: i, barsy: a }], pwc: e, qpon: e, quebec: e, quest: e, racing: e, radio: e, read: e, realestate: e, realtor: e, realty: e, recipes: e, red: e, redstone: e, redumbrella: e, rehab: e, reise: e, reisen: e, reit: e, reliance: e, ren: e, rent: e, rentals: e, repair: e, report: e, republican: e, rest: e, restaurant: e, review: e, reviews: e, rexroth: e, rich: e, richardli: e, ricoh: e, ril: e, rio: e, rip: [1, { clan: a }], rocks: [1, { myddns: a, stackit: a, "lima-city": a, webspace: a }], rodeo: e, rogers: e, room: e, rsvp: e, rugby: e, ruhr: e, run: [1, { appwrite: i, development: a, ravendb: a, liara: [2, { iran: a }], servers: a, build: i, code: i, database: i, migration: i, onporter: a, repl: a, stackit: a, val: [0, { express: a, web: a }], wix: a }], rwe: e, ryukyu: e, saarland: e, safe: e, safety: e, sakura: e, sale: e, salon: e, samsclub: e, samsung: e, sandvik: e, sandvikcoromant: e, sanofi: e, sap: e, sarl: e, sas: e, save: e, saxo: e, sbi: e, sbs: e, scb: e, schaeffler: e, schmidt: e, scholarships: e, school: e, schule: e, schwarz: e, science: e, scot: [1, { gov: [2, { service: a }] }], search: e, seat: e, secure: e, security: e, seek: e, select: e, sener: e, services: [1, { loginline: a }], seven: e, sew: e, sex: e, sexy: e, sfr: e, shangrila: e, sharp: e, shell: e, shia: e, shiksha: e, shoes: e, shop: [1, { base: a, hoplix: a, barsy: a, barsyonline: a, shopware: a }], shopping: e, shouji: e, show: e, silk: e, sina: e, singles: e, site: [1, { square: a, canva: t, cloudera: i, convex: a, cyon: a, fastvps: a, figma: a, heyflow: a, jele: a, jouwweb: a, loginline: a, barsy: a, notion: a, omniwe: a, opensocial: a, madethis: a, platformsh: i, tst: i, byen: a, srht: a, novecore: a, cpanel: a, wpsquared: a }], ski: e, skin: e, sky: e, skype: e, sling: e, smart: e, smile: e, sncf: e, soccer: e, social: e, softbank: e, software: e, sohu: e, solar: e, solutions: e, song: e, sony: e, soy: e, spa: e, space: [1, { myfast: a, heiyu: a, hf: [2, { static: a }], "app-ionos": a, project: a, uber: a, xs4all: a }], sport: e, spot: e, srl: e, stada: e, staples: e, star: e, statebank: e, statefarm: e, stc: e, stcgroup: e, stockholm: e, storage: e, store: [1, { barsy: a, sellfy: a, shopware: a, storebase: a }], stream: e, studio: e, study: e, style: e, sucks: e, supplies: e, supply: e, support: [1, { barsy: a }], surf: e, surgery: e, suzuki: e, swatch: e, swiss: e, sydney: e, systems: [1, { knightpoint: a }], tab: e, taipei: e, talk: e, taobao: e, target: e, tatamotors: e, tatar: e, tattoo: e, tax: e, taxi: e, tci: e, tdk: e, team: [1, { discourse: a, jelastic: a }], tech: [1, { cleverapps: a }], technology: x, temasek: e, tennis: e, teva: e, thd: e, theater: e, theatre: e, tiaa: e, tickets: e, tienda: e, tips: e, tires: e, tirol: e, tjmaxx: e, tjx: e, tkmaxx: e, tmall: e, today: [1, { prequalifyme: a }], tokyo: e, tools: [1, { addr: U, myaddr: a }], top: [1, { ntdll: a, wadl: i }], toray: e, toshiba: e, total: e, tours: e, town: e, toyota: e, toys: e, trade: e, trading: e, training: e, travel: e, travelers: e, travelersinsurance: e, trust: e, trv: e, tube: e, tui: e, tunes: e, tushu: e, tvs: e, ubank: e, ubs: e, unicom: e, university: e, uno: e, uol: e, ups: e, vacations: e, vana: e, vanguard: e, vegas: e, ventures: e, verisign: e, versicherung: e, vet: e, viajes: e, video: e, vig: e, viking: e, villas: e, vin: e, vip: e, virgin: e, visa: e, vision: e, viva: e, vivo: e, vlaanderen: e, vodka: e, volvo: e, vote: e, voting: e, voto: e, voyage: e, wales: e, walmart: e, walter: e, wang: e, wanggou: e, watch: e, watches: e, weather: e, weatherchannel: e, webcam: e, weber: e, website: ce, wed: e, wedding: e, weibo: e, weir: e, whoswho: e, wien: e, wiki: ce, williamhill: e, win: e, windows: e, wine: e, winners: e, wme: e, wolterskluwer: e, woodside: e, work: e, works: e, world: e, wow: e, wtc: e, wtf: e, xbox: e, xerox: e, xihuan: e, xin: e, "xn--11b4c3d": e, कॉम: e, "xn--1ck2e1b": e, セール: e, "xn--1qqw23a": e, 佛山: e, "xn--30rr7y": e, 慈善: e, "xn--3bst00m": e, 集团: e, "xn--3ds443g": e, 在线: e, "xn--3pxu8k": e, 点看: e, "xn--42c2d9a": e, คอม: e, "xn--45q11c": e, 八卦: e, "xn--4gbrim": e, موقع: e, "xn--55qw42g": e, 公益: e, "xn--55qx5d": e, 公司: e, "xn--5su34j936bgsg": e, 香格里拉: e, "xn--5tzm5g": e, 网站: e, "xn--6frz82g": e, 移动: e, "xn--6qq986b3xl": e, 我爱你: e, "xn--80adxhks": e, москва: e, "xn--80aqecdr1a": e, католик: e, "xn--80asehdb": e, онлайн: e, "xn--80aswg": e, сайт: e, "xn--8y0a063a": e, 联通: e, "xn--9dbq2a": e, קום: e, "xn--9et52u": e, 时尚: e, "xn--9krt00a": e, 微博: e, "xn--b4w605ferd": e, 淡马锡: e, "xn--bck1b9a5dre4c": e, ファッション: e, "xn--c1avg": e, орг: e, "xn--c2br7g": e, नेट: e, "xn--cck2b3b": e, ストア: e, "xn--cckwcxetd": e, アマゾン: e, "xn--cg4bki": e, 삼성: e, "xn--czr694b": e, 商标: e, "xn--czrs0t": e, 商店: e, "xn--czru2d": e, 商城: e, "xn--d1acj3b": e, дети: e, "xn--eckvdtc9d": e, ポイント: e, "xn--efvy88h": e, 新闻: e, "xn--fct429k": e, 家電: e, "xn--fhbei": e, كوم: e, "xn--fiq228c5hs": e, 中文网: e, "xn--fiq64b": e, 中信: e, "xn--fjq720a": e, 娱乐: e, "xn--flw351e": e, 谷歌: e, "xn--fzys8d69uvgm": e, 電訊盈科: e, "xn--g2xx48c": e, 购物: e, "xn--gckr3f0f": e, クラウド: e, "xn--gk3at1e": e, 通販: e, "xn--hxt814e": e, 网店: e, "xn--i1b6b1a6a2e": e, संगठन: e, "xn--imr513n": e, 餐厅: e, "xn--io0a7i": e, 网络: e, "xn--j1aef": e, ком: e, "xn--jlq480n2rg": e, 亚马逊: e, "xn--jvr189m": e, 食品: e, "xn--kcrx77d1x4a": e, 飞利浦: e, "xn--kput3i": e, 手机: e, "xn--mgba3a3ejt": e, ارامكو: e, "xn--mgba7c0bbn0a": e, العليان: e, "xn--mgbab2bd": e, بازار: e, "xn--mgbca7dzdo": e, ابوظبي: e, "xn--mgbi4ecexp": e, كاثوليك: e, "xn--mgbt3dhd": e, همراه: e, "xn--mk1bu44c": e, 닷컴: e, "xn--mxtq1m": e, 政府: e, "xn--ngbc5azd": e, شبكة: e, "xn--ngbe9e0a": e, بيتك: e, "xn--ngbrx": e, عرب: e, "xn--nqv7f": e, 机构: e, "xn--nqv7fs00ema": e, 组织机构: e, "xn--nyqy26a": e, 健康: e, "xn--otu796d": e, 招聘: e, "xn--p1acf": [1, { "xn--90amc": a, "xn--j1aef": a, "xn--j1ael8b": a, "xn--h1ahn": a, "xn--j1adp": a, "xn--c1avg": a, "xn--80aaa0cvac": a, "xn--h1aliz": a, "xn--90a1af": a, "xn--41a": a }], рус: [1, { биз: a, ком: a, крым: a, мир: a, мск: a, орг: a, самара: a, сочи: a, спб: a, я: a }], "xn--pssy2u": e, 大拿: e, "xn--q9jyb4c": e, みんな: e, "xn--qcka1pmc": e, グーグル: e, "xn--rhqv96g": e, 世界: e, "xn--rovu88b": e, 書籍: e, "xn--ses554g": e, 网址: e, "xn--t60b56a": e, 닷넷: e, "xn--tckwe": e, コム: e, "xn--tiq49xqyj": e, 天主教: e, "xn--unup4y": e, 游戏: e, "xn--vermgensberater-ctb": e, vermögensberater: e, "xn--vermgensberatung-pwb": e, vermögensberatung: e, "xn--vhquv": e, 企业: e, "xn--vuq861b": e, 信息: e, "xn--w4r85el8fhu5dnra": e, 嘉里大酒店: e, "xn--w4rs40l": e, 嘉里: e, "xn--xhq521b": e, 广东: e, "xn--zfr164b": e, 政务: e, xyz: [1, { botdash: a, telebit: i }], yachts: e, yahoo: e, yamaxun: e, yandex: e, yodobashi: e, yoga: e, yokohama: e, you: e, youtube: e, yun: e, zappos: e, zara: e, zero: e, zip: e, zone: [1, { cloud66: a, triton: i, stackit: a, lima: a }], zuerich: e }];
})();
function ea(e, a, r, u) {
  let i = null, v = a;
  for (; v !== void 0 && ((v[0] & u) !== 0 && (i = {
    index: r + 1,
    isIcann: v[0] === 1,
    isPrivate: v[0] === 2
  }), r !== -1); ) {
    const g = v[1];
    v = Object.prototype.hasOwnProperty.call(g, e[r]) ? g[e[r]] : g["*"], r -= 1;
  }
  return i;
}
function ae(e, a, r) {
  var u;
  if (Qa(e, a, r))
    return;
  const i = e.split("."), v = (a.allowPrivateDomains ? 2 : 0) | (a.allowIcannDomains ? 1 : 0), g = ea(i, Xa, i.length - 1, v);
  if (g !== null) {
    r.isIcann = g.isIcann, r.isPrivate = g.isPrivate, r.publicSuffix = i.slice(g.index + 1).join(".");
    return;
  }
  const h = ea(i, Ka, i.length - 1, v);
  if (h !== null) {
    r.isIcann = h.isIcann, r.isPrivate = h.isPrivate, r.publicSuffix = i.slice(h.index).join(".");
    return;
  }
  r.isIcann = !1, r.isPrivate = !1, r.publicSuffix = (u = i[i.length - 1]) !== null && u !== void 0 ? u : null;
}
const Y = _a();
function Za(e, a = {}) {
  return ee(e, 5, ae, a, _a());
}
function ei(e, a = {}) {
  return ue(Y), ee(e, 0, ae, a, Y).hostname;
}
function ai(e, a = {}) {
  return ue(Y), ee(e, 2, ae, a, Y).publicSuffix;
}
function ii(e, a = {}) {
  return ue(Y), ee(e, 3, ae, a, Y).domain;
}
function ni(e, a = {}) {
  return ue(Y), ee(e, 4, ae, a, Y).subdomain;
}
function ti(e, a = {}) {
  return ue(Y), ee(e, 5, ae, a, Y).domainWithoutSuffix;
}
const oi = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getDomain: ii,
  getDomainWithoutSuffix: ti,
  getHostname: ei,
  getPublicSuffix: ai,
  getSubdomain: ni,
  parse: Za
}, Symbol.toStringTag, { value: "Module" })), ri = /* @__PURE__ */ Da(oi);
var aa;
function ze() {
  if (aa) return he;
  aa = 1, Object.defineProperty(he, "__esModule", { value: !0 }), he.getPublicSuffix = i;
  const e = ri, a = ["local", "example", "invalid", "localhost", "test"], r = ["localhost", "invalid"], u = {
    allowSpecialUseDomain: !1,
    ignoreError: !1
  };
  function i(v, g = {}) {
    g = { ...u, ...g };
    const h = v.split("."), p = h[h.length - 1], f = !!g.allowSpecialUseDomain, d = !!g.ignoreError;
    if (f && p !== void 0 && a.includes(p)) {
      if (h.length > 1)
        return `${h[h.length - 2]}.${p}`;
      if (r.includes(p))
        return p;
    }
    if (!d && p !== void 0 && a.includes(p))
      throw new Error(`Cookie has domain set to the public suffix "${p}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain: true, rejectPublicSuffixes: false}.`);
    const z = (0, e.getDomain)(v, {
      allowIcannDomains: !0,
      allowPrivateDomains: !0
    });
    if (z)
      return z;
  }
  return he;
}
var ia;
function za() {
  if (ia) return de;
  ia = 1, Object.defineProperty(de, "__esModule", { value: !0 }), de.permuteDomain = a;
  const e = ze();
  function a(r, u) {
    const i = (0, e.getPublicSuffix)(r, {
      allowSpecialUseDomain: u
    });
    if (!i)
      return;
    if (i == r)
      return [r];
    r.slice(-1) == "." && (r = r.slice(0, -1));
    const g = r.slice(0, -(i.length + 1)).split(".").reverse();
    let h = i;
    const p = [h];
    for (; g.length; )
      h = `${g.shift()}.${h}`, p.push(h);
    return p;
  }
  return de;
}
var oe = {}, na;
function Ue() {
  if (na) return oe;
  na = 1, Object.defineProperty(oe, "__esModule", { value: !0 }), oe.Store = void 0;
  class e {
    constructor() {
      this.synchronous = !1;
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    findCookie(r, u, i, v) {
      throw new Error("findCookie is not implemented");
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    findCookies(r, u, i = !1, v) {
      throw new Error("findCookies is not implemented");
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    putCookie(r, u) {
      throw new Error("putCookie is not implemented");
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    updateCookie(r, u, i) {
      throw new Error("updateCookie is not implemented");
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    removeCookie(r, u, i, v) {
      throw new Error("removeCookie is not implemented");
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    removeCookies(r, u, i) {
      throw new Error("removeCookies is not implemented");
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    removeAllCookies(r) {
      throw new Error("removeAllCookies is not implemented");
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    getAllCookies(r) {
      throw new Error("getAllCookies is not implemented (therefore jar cannot be serialized)");
    }
  }
  return oe.Store = e, oe;
}
var De = {}, ta;
function Ee() {
  return ta || (ta = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), e.safeToString = e.objectToString = void 0, e.createPromiseCallback = v, e.inOperator = g;
    const a = (h) => Object.prototype.toString.call(h);
    e.objectToString = a;
    const r = (h, p) => typeof h.join != "function" ? (0, e.objectToString)(h) : (p.add(h), h.map((d) => d == null || p.has(d) ? "" : u(d, p)).join()), u = (h, p = /* @__PURE__ */ new WeakSet()) => typeof h != "object" || h === null ? String(h) : typeof h.toString == "function" ? Array.isArray(h) ? (
      // Arrays have a weird custom toString that we need to replicate
      r(h, p)
    ) : (
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      String(h)
    ) : (0, e.objectToString)(h), i = (h) => u(h);
    e.safeToString = i;
    function v(h) {
      let p, f, d;
      const z = new Promise((j, w) => {
        f = j, d = w;
      });
      return typeof h == "function" ? p = (j, w) => {
        try {
          j ? h(j) : h(null, w);
        } catch (P) {
          d(P instanceof Error ? P : new Error());
        }
      } : p = (j, w) => {
        try {
          j ? d(j) : f(w);
        } catch (P) {
          d(P instanceof Error ? P : new Error());
        }
      }, {
        promise: z,
        callback: p,
        resolve: (j) => (p(null, j), z),
        reject: (j) => (p(j), z)
      };
    }
    function g(h, p) {
      return h in p;
    }
  })(De)), De;
}
var oa;
function Ea() {
  if (oa) return te;
  oa = 1, Object.defineProperty(te, "__esModule", { value: !0 }), te.MemoryCookieStore = void 0;
  const e = Me(), a = za(), r = Ue(), u = Ee();
  class i extends r.Store {
    /**
     * Create a new {@link MemoryCookieStore}.
     */
    constructor() {
      super(), this.synchronous = !0, this.idx = /* @__PURE__ */ Object.create(null);
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    findCookie(g, h, p, f) {
      const d = (0, u.createPromiseCallback)(f);
      if (g == null || h == null || p == null)
        return d.resolve(void 0);
      const z = this.idx[g]?.[h]?.[p];
      return d.resolve(z);
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    findCookies(g, h, p = !1, f) {
      typeof p == "function" && (f = p, p = !0);
      const d = [], z = (0, u.createPromiseCallback)(f);
      if (!g)
        return z.resolve([]);
      let j;
      h ? j = function(x) {
        for (const l in x)
          if ((0, e.pathMatch)(h, l)) {
            const c = x[l];
            for (const t in c) {
              const n = c[t];
              n && d.push(n);
            }
          }
      } : j = function(x) {
        for (const l in x) {
          const c = x[l];
          for (const t in c) {
            const n = c[t];
            n && d.push(n);
          }
        }
      };
      const w = (0, a.permuteDomain)(g, p) || [g], P = this.idx;
      return w.forEach((_) => {
        const x = P[_];
        x && j(x);
      }), z.resolve(d);
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    putCookie(g, h) {
      const p = (0, u.createPromiseCallback)(h), { domain: f, path: d, key: z } = g;
      if (f == null || d == null || z == null)
        return p.resolve(void 0);
      const j = this.idx[f] ?? /* @__PURE__ */ Object.create(null);
      this.idx[f] = j;
      const w = j[d] ?? /* @__PURE__ */ Object.create(null);
      return j[d] = w, w[z] = g, p.resolve(void 0);
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    updateCookie(g, h, p) {
      if (p)
        this.putCookie(h, p);
      else
        return this.putCookie(h);
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    removeCookie(g, h, p, f) {
      const d = (0, u.createPromiseCallback)(f);
      return delete this.idx[g]?.[h]?.[p], d.resolve(void 0);
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    removeCookies(g, h, p) {
      const f = (0, u.createPromiseCallback)(p), d = this.idx[g];
      return d && (h ? delete d[h] : delete this.idx[g]), f.resolve(void 0);
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    removeAllCookies(g) {
      const h = (0, u.createPromiseCallback)(g);
      return this.idx = /* @__PURE__ */ Object.create(null), h.resolve(void 0);
    }
    /**
     * @internal No doc because this is an overload that supports the implementation
     */
    getAllCookies(g) {
      const h = (0, u.createPromiseCallback)(g), p = [], f = this.idx;
      return Object.keys(f).forEach((z) => {
        const j = f[z] ?? {};
        Object.keys(j).forEach((P) => {
          const _ = j[P] ?? {};
          Object.keys(_).forEach((l) => {
            const c = _[l];
            c != null && p.push(c);
          });
        });
      }), p.sort((z, j) => (z.creationIndex || 0) - (j.creationIndex || 0)), h.resolve(p);
    }
  }
  return te.MemoryCookieStore = i, te;
}
var G = {}, ra;
function _e() {
  if (ra) return G;
  ra = 1, Object.defineProperty(G, "__esModule", { value: !0 }), G.ParameterError = void 0, G.isNonEmptyString = a, G.isDate = r, G.isEmptyString = u, G.isString = i, G.isObject = v, G.isInteger = g, G.validate = h;
  const e = Ee();
  function a(f) {
    return i(f) && f !== "";
  }
  function r(f) {
    return f instanceof Date && g(f.getTime());
  }
  function u(f) {
    return f === "" || f instanceof String && f.toString() === "";
  }
  function i(f) {
    return typeof f == "string" || f instanceof String;
  }
  function v(f) {
    return (0, e.objectToString)(f) === "[object Object]";
  }
  function g(f) {
    return typeof f == "number" && f % 1 === 0;
  }
  function h(f, d, z) {
    if (f)
      return;
    const j = typeof d == "function" ? d : void 0;
    let w = typeof d == "function" ? z : d;
    v(w) || (w = "[object Object]");
    const P = new p((0, e.safeToString)(w));
    if (j)
      j(P);
    else
      throw P;
  }
  class p extends Error {
  }
  return G.ParameterError = p, G;
}
var re = {}, sa;
function Aa() {
  return sa || (sa = 1, Object.defineProperty(re, "__esModule", { value: !0 }), re.version = void 0, re.version = "5.1.2"), re;
}
var fe = {}, Te = {}, ua;
function Le() {
  return ua || (ua = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), e.IP_V6_REGEX_OBJECT = e.PrefixSecurityEnum = void 0, e.PrefixSecurityEnum = {
      SILENT: "silent",
      STRICT: "strict",
      DISABLED: "unsafe-disabled"
    }, Object.freeze(e.PrefixSecurityEnum);
    const a = `
\\[?(?:
(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|
(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|
(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|
(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|
(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:))
)(?:%[0-9a-zA-Z]{1,})?\\]?
`.replace(/\s*\/\/.*$/gm, "").replace(/\n/g, "").trim();
    e.IP_V6_REGEX_OBJECT = new RegExp(`^${a}$`);
  })(Te)), Te;
}
var ca;
function Ae() {
  if (ca) return fe;
  ca = 1, Object.defineProperty(fe, "__esModule", { value: !0 }), fe.canonicalDomain = r;
  const e = Le();
  function a(u) {
    return new URL(`http://${u}`).hostname;
  }
  function r(u) {
    if (u == null)
      return;
    let i = u.trim().replace(/^\./, "");
    return e.IP_V6_REGEX_OBJECT.test(i) ? (i.startsWith("[") || (i = "[" + i), i.endsWith("]") || (i = i + "]"), a(i).slice(1, -1)) : /[^\u0001-\u007f]/.test(i) ? a(i) : i.toLowerCase();
  }
  return fe;
}
var J = {}, ge = {}, la;
function Oa() {
  if (la) return ge;
  la = 1, Object.defineProperty(ge, "__esModule", { value: !0 }), ge.formatDate = e;
  function e(a) {
    return a.toUTCString();
  }
  return ge;
}
var pe = {}, ma;
function Sa() {
  if (ma) return pe;
  ma = 1, Object.defineProperty(pe, "__esModule", { value: !0 }), pe.parseDate = v;
  const e = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/, a = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11
  };
  function r(g, h, p, f) {
    let d = 0;
    for (; d < g.length; ) {
      const z = g.charCodeAt(d);
      if (z <= 47 || z >= 58)
        break;
      d++;
    }
    if (!(d < h || d > p) && !(!f && d != g.length))
      return parseInt(g.slice(0, d), 10);
  }
  function u(g) {
    const h = g.split(":"), p = [0, 0, 0];
    if (h.length === 3) {
      for (let f = 0; f < 3; f++) {
        const d = f == 2, z = h[f];
        if (z === void 0)
          return;
        const j = r(z, 1, 2, d);
        if (j === void 0)
          return;
        p[f] = j;
      }
      return p;
    }
  }
  function i(g) {
    switch (g = String(g).slice(0, 3).toLowerCase(), g) {
      case "jan":
        return a.jan;
      case "feb":
        return a.feb;
      case "mar":
        return a.mar;
      case "apr":
        return a.apr;
      case "may":
        return a.may;
      case "jun":
        return a.jun;
      case "jul":
        return a.jul;
      case "aug":
        return a.aug;
      case "sep":
        return a.sep;
      case "oct":
        return a.oct;
      case "nov":
        return a.nov;
      case "dec":
        return a.dec;
      default:
        return;
    }
  }
  function v(g) {
    if (!g)
      return;
    const h = g.split(e);
    let p, f, d, z, j, w;
    for (let P = 0; P < h.length; P++) {
      const _ = (h[P] ?? "").trim();
      if (_.length) {
        if (d === void 0) {
          const x = u(_);
          if (x) {
            p = x[0], f = x[1], d = x[2];
            continue;
          }
        }
        if (z === void 0) {
          const x = r(_, 1, 2, !0);
          if (x !== void 0) {
            z = x;
            continue;
          }
        }
        if (j === void 0) {
          const x = i(_);
          if (x !== void 0) {
            j = x;
            continue;
          }
        }
        if (w === void 0) {
          const x = r(_, 2, 4, !0);
          x !== void 0 && (w = x, w >= 70 && w <= 99 ? w += 1900 : w >= 0 && w <= 69 && (w += 2e3));
        }
      }
    }
    if (!(z === void 0 || j === void 0 || w === void 0 || p === void 0 || f === void 0 || d === void 0 || z < 1 || z > 31 || w < 1601 || p > 23 || f > 59 || d > 59))
      return new Date(Date.UTC(w, j, z, p, f, d));
  }
  return pe;
}
var da;
function qe() {
  if (da) return J;
  da = 1;
  var e = J && J.__createBinding || (Object.create ? (function(t, n, s, o) {
    o === void 0 && (o = s);
    var y = Object.getOwnPropertyDescriptor(n, s);
    (!y || ("get" in y ? !n.__esModule : y.writable || y.configurable)) && (y = { enumerable: !0, get: function() {
      return n[s];
    } }), Object.defineProperty(t, o, y);
  }) : (function(t, n, s, o) {
    o === void 0 && (o = s), t[o] = n[s];
  })), a = J && J.__setModuleDefault || (Object.create ? (function(t, n) {
    Object.defineProperty(t, "default", { enumerable: !0, value: n });
  }) : function(t, n) {
    t.default = n;
  }), r = J && J.__importStar || function(t) {
    if (t && t.__esModule) return t;
    var n = {};
    if (t != null) for (var s in t) s !== "default" && Object.prototype.hasOwnProperty.call(t, s) && e(n, t, s);
    return a(n, t), n;
  };
  Object.defineProperty(J, "__esModule", { value: !0 }), J.Cookie = void 0;
  const u = ze(), i = r(_e()), v = Ee(), g = Oa(), h = Sa(), p = Ae(), f = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/, d = /[\x20-\x3A\x3C-\x7E]+/, z = /[\x00-\x1F]/, j = [`
`, "\r", "\0"];
  function w(t) {
    if (i.isEmptyString(t))
      return t;
    for (let n = 0; n < j.length; n++) {
      const s = j[n], o = s ? t.indexOf(s) : -1;
      o !== -1 && (t = t.slice(0, o));
    }
    return t;
  }
  function P(t, n) {
    t = w(t);
    let s = t.indexOf("=");
    if (n)
      s === 0 && (t = t.substring(1), s = t.indexOf("="));
    else if (s <= 0)
      return;
    let o, y;
    if (s <= 0 ? (o = "", y = t.trim()) : (o = t.slice(0, s).trim(), y = t.slice(s + 1).trim()), z.test(o) || z.test(y))
      return;
    const T = new c();
    return T.key = o, T.value = y, T;
  }
  function _(t, n) {
    if (i.isEmptyString(t) || !i.isString(t))
      return;
    t = t.trim();
    const s = t.indexOf(";"), o = s === -1 ? t : t.slice(0, s), y = P(o, n?.loose ?? !1);
    if (!y)
      return;
    if (s === -1)
      return y;
    const T = t.slice(s + 1).trim();
    if (T.length === 0)
      return y;
    const M = T.split(";");
    for (; M.length; ) {
      const O = (M.shift() ?? "").trim();
      if (O.length === 0)
        continue;
      const m = O.indexOf("=");
      let k, b;
      switch (m === -1 ? (k = O, b = null) : (k = O.slice(0, m), b = O.slice(m + 1)), k = k.trim().toLowerCase(), b && (b = b.trim()), k) {
        case "expires":
          if (b) {
            const E = (0, h.parseDate)(b);
            E && (y.expires = E);
          }
          break;
        case "max-age":
          if (b && /^-?[0-9]+$/.test(b)) {
            const E = parseInt(b, 10);
            y.setMaxAge(E);
          }
          break;
        case "domain":
          if (b) {
            const E = b.trim().replace(/^\./, "");
            E && (y.domain = E.toLowerCase());
          }
          break;
        case "path":
          y.path = b && b[0] === "/" ? b : null;
          break;
        case "secure":
          y.secure = !0;
          break;
        case "httponly":
          y.httpOnly = !0;
          break;
        case "samesite":
          switch (b ? b.toLowerCase() : "") {
            case "strict":
              y.sameSite = "strict";
              break;
            case "lax":
              y.sameSite = "lax";
              break;
            case "none":
              y.sameSite = "none";
              break;
            default:
              y.sameSite = void 0;
              break;
          }
          break;
        default:
          y.extensions = y.extensions || [], y.extensions.push(O);
          break;
      }
    }
    return y;
  }
  function x(t) {
    if (!t || i.isEmptyString(t))
      return;
    let n;
    if (typeof t == "string")
      try {
        n = JSON.parse(t);
      } catch {
        return;
      }
    else
      n = t;
    const s = new c();
    return c.serializableProperties.forEach((o) => {
      if (n && typeof n == "object" && (0, v.inOperator)(o, n)) {
        const y = n[o];
        if (y === void 0 || (0, v.inOperator)(o, l) && y === l[o])
          return;
        switch (o) {
          case "key":
          case "value":
          case "sameSite":
            typeof y == "string" && (s[o] = y);
            break;
          case "expires":
          case "creation":
          case "lastAccessed":
            typeof y == "number" || typeof y == "string" || y instanceof Date ? s[o] = n[o] == "Infinity" ? "Infinity" : new Date(y) : y === null && (s[o] = null);
            break;
          case "maxAge":
            (typeof y == "number" || y === "Infinity" || y === "-Infinity") && (s[o] = y);
            break;
          case "domain":
          case "path":
            (typeof y == "string" || y === null) && (s[o] = y);
            break;
          case "secure":
          case "httpOnly":
            typeof y == "boolean" && (s[o] = y);
            break;
          case "extensions":
            Array.isArray(y) && y.every((T) => typeof T == "string") && (s[o] = y);
            break;
          case "hostOnly":
          case "pathIsDefault":
            (typeof y == "boolean" || y === null) && (s[o] = y);
            break;
        }
      }
    }), s;
  }
  const l = {
    // the order in which the RFC has them:
    key: "",
    value: "",
    expires: "Infinity",
    maxAge: null,
    domain: null,
    path: null,
    secure: !1,
    httpOnly: !1,
    extensions: null,
    // set by the CookieJar:
    hostOnly: null,
    pathIsDefault: null,
    creation: null,
    lastAccessed: null,
    sameSite: void 0
  };
  class c {
    /**
     * Create a new Cookie instance.
     * @public
     * @param options - The attributes to set on the cookie
     */
    constructor(n = {}) {
      this.key = n.key ?? l.key, this.value = n.value ?? l.value, this.expires = n.expires ?? l.expires, this.maxAge = n.maxAge ?? l.maxAge, this.domain = n.domain ?? l.domain, this.path = n.path ?? l.path, this.secure = n.secure ?? l.secure, this.httpOnly = n.httpOnly ?? l.httpOnly, this.extensions = n.extensions ?? l.extensions, this.creation = n.creation ?? l.creation, this.hostOnly = n.hostOnly ?? l.hostOnly, this.pathIsDefault = n.pathIsDefault ?? l.pathIsDefault, this.lastAccessed = n.lastAccessed ?? l.lastAccessed, this.sameSite = n.sameSite ?? l.sameSite, this.creation = n.creation ?? /* @__PURE__ */ new Date(), Object.defineProperty(this, "creationIndex", {
        configurable: !1,
        enumerable: !1,
        // important for assert.deepEqual checks
        writable: !0,
        value: ++c.cookiesCreated
      }), this.creationIndex = c.cookiesCreated;
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
      const n = Date.now(), s = this.hostOnly != null ? this.hostOnly.toString() : "?", o = this.creation && this.creation !== "Infinity" ? `${String(n - this.creation.getTime())}ms` : "?", y = this.lastAccessed && this.lastAccessed !== "Infinity" ? `${String(n - this.lastAccessed.getTime())}ms` : "?";
      return `Cookie="${this.toString()}; hostOnly=${s}; aAge=${y}; cAge=${o}"`;
    }
    /**
     * For convenience in using `JSON.stringify(cookie)`. Returns a plain-old Object that can be JSON-serialized.
     *
     * @remarks
     * - Any `Date` properties (such as {@link Cookie.expires}, {@link Cookie.creation}, and {@link Cookie.lastAccessed}) are exported in ISO format (`Date.toISOString()`).
     *
     *  - Custom Cookie properties are discarded. In tough-cookie 1.x, since there was no {@link Cookie.toJSON} method explicitly defined, all enumerable properties were captured.
     *      If you want a property to be serialized, add the property name to {@link Cookie.serializableProperties}.
     */
    toJSON() {
      const n = {};
      for (const s of c.serializableProperties) {
        const o = this[s];
        if (o !== l[s])
          switch (s) {
            case "key":
            case "value":
            case "sameSite":
              typeof o == "string" && (n[s] = o);
              break;
            case "expires":
            case "creation":
            case "lastAccessed":
              typeof o == "number" || typeof o == "string" || o instanceof Date ? n[s] = o == "Infinity" ? "Infinity" : new Date(o).toISOString() : o === null && (n[s] = null);
              break;
            case "maxAge":
              (typeof o == "number" || o === "Infinity" || o === "-Infinity") && (n[s] = o);
              break;
            case "domain":
            case "path":
              (typeof o == "string" || o === null) && (n[s] = o);
              break;
            case "secure":
            case "httpOnly":
              typeof o == "boolean" && (n[s] = o);
              break;
            case "extensions":
              Array.isArray(o) && (n[s] = o);
              break;
            case "hostOnly":
            case "pathIsDefault":
              (typeof o == "boolean" || o === null) && (n[s] = o);
              break;
          }
      }
      return n;
    }
    /**
     * Does a deep clone of this cookie, implemented exactly as `Cookie.fromJSON(cookie.toJSON())`.
     * @public
     */
    clone() {
      return x(this.toJSON());
    }
    /**
     * Validates cookie attributes for semantic correctness. Useful for "lint" checking any `Set-Cookie` headers you generate.
     * For now, it returns a boolean, but eventually could return a reason string.
     *
     * @remarks
     * Works for a few things, but is by no means comprehensive.
     *
     * @beta
     */
    validate() {
      if (!this.value || !f.test(this.value) || this.expires != "Infinity" && !(this.expires instanceof Date) && !(0, h.parseDate)(this.expires) || this.maxAge != null && this.maxAge !== "Infinity" && (this.maxAge === "-Infinity" || this.maxAge <= 0) || this.path != null && !d.test(this.path))
        return !1;
      const n = this.cdomain();
      return !(n && (n.match(/\.$/) || (0, u.getPublicSuffix)(n) == null));
    }
    /**
     * Sets the 'Expires' attribute on a cookie.
     *
     * @remarks
     * When given a `string` value it will be parsed with {@link parseDate}. If the value can't be parsed as a cookie date
     * then the 'Expires' attribute will be set to `"Infinity"`.
     *
     * @param exp - the new value for the 'Expires' attribute of the cookie.
     */
    setExpires(n) {
      n instanceof Date ? this.expires = n : this.expires = (0, h.parseDate)(n) || "Infinity";
    }
    /**
     * Sets the 'Max-Age' attribute (in seconds) on a cookie.
     *
     * @remarks
     * Coerces `-Infinity` to `"-Infinity"` and `Infinity` to `"Infinity"` so it can be serialized to JSON.
     *
     * @param age - the new value for the 'Max-Age' attribute (in seconds).
     */
    setMaxAge(n) {
      n === 1 / 0 ? this.maxAge = "Infinity" : n === -1 / 0 ? this.maxAge = "-Infinity" : this.maxAge = n;
    }
    /**
     * Encodes to a `Cookie` header value (specifically, the {@link Cookie.key} and {@link Cookie.value} properties joined with "=").
     * @public
     */
    cookieString() {
      const n = this.value || "";
      return this.key ? `${this.key}=${n}` : n;
    }
    /**
     * Encodes to a `Set-Cookie header` value.
     * @public
     */
    toString() {
      let n = this.cookieString();
      return this.expires != "Infinity" && this.expires instanceof Date && (n += `; Expires=${(0, g.formatDate)(this.expires)}`), this.maxAge != null && this.maxAge != 1 / 0 && (n += `; Max-Age=${String(this.maxAge)}`), this.domain && !this.hostOnly && (n += `; Domain=${this.domain}`), this.path && (n += `; Path=${this.path}`), this.secure && (n += "; Secure"), this.httpOnly && (n += "; HttpOnly"), this.sameSite && this.sameSite !== "none" && (this.sameSite.toLowerCase() === c.sameSiteCanonical.lax.toLowerCase() ? n += `; SameSite=${c.sameSiteCanonical.lax}` : this.sameSite.toLowerCase() === c.sameSiteCanonical.strict.toLowerCase() ? n += `; SameSite=${c.sameSiteCanonical.strict}` : n += `; SameSite=${this.sameSite}`), this.extensions && this.extensions.forEach((s) => {
        n += `; ${s}`;
      }), n;
    }
    /**
     * Computes the TTL relative to now (milliseconds).
     *
     * @remarks
     * - `Infinity` is returned for cookies without an explicit expiry
     *
     * - `0` is returned if the cookie is expired.
     *
     * - Otherwise a time-to-live in milliseconds is returned.
     *
     * @param now - passing an explicit value is mostly used for testing purposes since this defaults to the `Date.now()`
     * @public
     */
    TTL(n = Date.now()) {
      if (this.maxAge != null && typeof this.maxAge == "number")
        return this.maxAge <= 0 ? 0 : this.maxAge * 1e3;
      const s = this.expires;
      return s === "Infinity" ? 1 / 0 : (s?.getTime() ?? n) - (n || Date.now());
    }
    /**
     * Computes the absolute unix-epoch milliseconds that this cookie expires.
     *
     * The "Max-Age" attribute takes precedence over "Expires" (as per the RFC). The {@link Cookie.lastAccessed} attribute
     * (or the `now` parameter if given) is used to offset the {@link Cookie.maxAge} attribute.
     *
     * If Expires ({@link Cookie.expires}) is set, that's returned.
     *
     * @param now - can be used to provide a time offset (instead of {@link Cookie.lastAccessed}) to use when calculating the "Max-Age" value
     */
    expiryTime(n) {
      if (this.maxAge != null) {
        const s = n || this.lastAccessed || /* @__PURE__ */ new Date(), o = typeof this.maxAge == "number" ? this.maxAge : -1 / 0, y = o <= 0 ? -1 / 0 : o * 1e3;
        return s === "Infinity" ? 1 / 0 : s.getTime() + y;
      }
      return this.expires == "Infinity" ? 1 / 0 : this.expires ? this.expires.getTime() : void 0;
    }
    /**
     * Similar to {@link Cookie.expiryTime}, computes the absolute unix-epoch milliseconds that this cookie expires and returns it as a Date.
     *
     * The "Max-Age" attribute takes precedence over "Expires" (as per the RFC). The {@link Cookie.lastAccessed} attribute
     * (or the `now` parameter if given) is used to offset the {@link Cookie.maxAge} attribute.
     *
     * If Expires ({@link Cookie.expires}) is set, that's returned.
     *
     * @param now - can be used to provide a time offset (instead of {@link Cookie.lastAccessed}) to use when calculating the "Max-Age" value
     */
    expiryDate(n) {
      const s = this.expiryTime(n);
      return s == 1 / 0 ? /* @__PURE__ */ new Date(2147483647e3) : s == -1 / 0 ? /* @__PURE__ */ new Date(0) : s == null ? void 0 : new Date(s);
    }
    /**
     * Indicates if the cookie has been persisted to a store or not.
     * @public
     */
    isPersistent() {
      return this.maxAge != null || this.expires != "Infinity";
    }
    /**
     * Calls {@link canonicalDomain} with the {@link Cookie.domain} property.
     * @public
     */
    canonicalizedDomain() {
      return (0, p.canonicalDomain)(this.domain);
    }
    /**
     * Alias for {@link Cookie.canonicalizedDomain}
     * @public
     */
    cdomain() {
      return (0, p.canonicalDomain)(this.domain);
    }
    /**
     * Parses a string into a Cookie object.
     *
     * @remarks
     * Note: when parsing a `Cookie` header it must be split by ';' before each Cookie string can be parsed.
     *
     * @example
     * ```
     * // parse a `Set-Cookie` header
     * const setCookieHeader = 'a=bcd; Expires=Tue, 18 Oct 2011 07:05:03 GMT'
     * const cookie = Cookie.parse(setCookieHeader)
     * cookie.key === 'a'
     * cookie.value === 'bcd'
     * cookie.expires === new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT'))
     * ```
     *
     * @example
     * ```
     * // parse a `Cookie` header
     * const cookieHeader = 'name=value; name2=value2; name3=value3'
     * const cookies = cookieHeader.split(';').map(Cookie.parse)
     * cookies[0].name === 'name'
     * cookies[0].value === 'value'
     * cookies[1].name === 'name2'
     * cookies[1].value === 'value2'
     * cookies[2].name === 'name3'
     * cookies[2].value === 'value3'
     * ```
     *
     * @param str - The `Set-Cookie` header or a Cookie string to parse.
     * @param options - Configures `strict` or `loose` mode for cookie parsing
     */
    static parse(n, s) {
      return _(n, s);
    }
    /**
     * Does the reverse of {@link Cookie.toJSON}.
     *
     * @remarks
     * Any Date properties (such as .expires, .creation, and .lastAccessed) are parsed via Date.parse, not tough-cookie's parseDate, since ISO timestamps are being handled at this layer.
     *
     * @example
     * ```
     * const json = JSON.stringify({
     *   key: 'alpha',
     *   value: 'beta',
     *   domain: 'example.com',
     *   path: '/foo',
     *   expires: '2038-01-19T03:14:07.000Z',
     * })
     * const cookie = Cookie.fromJSON(json)
     * cookie.key === 'alpha'
     * cookie.value === 'beta'
     * cookie.domain === 'example.com'
     * cookie.path === '/foo'
     * cookie.expires === new Date(Date.parse('2038-01-19T03:14:07.000Z'))
     * ```
     *
     * @param str - An unparsed JSON string or a value that has already been parsed as JSON
     */
    static fromJSON(n) {
      return x(n);
    }
  }
  return J.Cookie = c, c.cookiesCreated = 0, c.sameSiteLevel = {
    strict: 3,
    lax: 2,
    none: 1
  }, c.sameSiteCanonical = {
    strict: "Strict",
    lax: "Lax"
  }, c.serializableProperties = [
    "key",
    "value",
    "expires",
    "maxAge",
    "domain",
    "path",
    "secure",
    "httpOnly",
    "extensions",
    "hostOnly",
    "pathIsDefault",
    "creation",
    "lastAccessed",
    "sameSite"
  ], J;
}
var ke = {}, ha;
function Ia() {
  if (ha) return ke;
  ha = 1, Object.defineProperty(ke, "__esModule", { value: !0 }), ke.cookieCompare = a;
  const e = 2147483647e3;
  function a(r, u) {
    let i;
    const v = r.path ? r.path.length : 0;
    if (i = (u.path ? u.path.length : 0) - v, i !== 0)
      return i;
    const h = r.creation && r.creation instanceof Date ? r.creation.getTime() : e, p = u.creation && u.creation instanceof Date ? u.creation.getTime() : e;
    return i = h - p, i !== 0 || (i = (r.creationIndex || 0) - (u.creationIndex || 0)), i;
  }
  return ke;
}
var W = {}, be = {}, fa;
function Ca() {
  if (fa) return be;
  fa = 1, Object.defineProperty(be, "__esModule", { value: !0 }), be.defaultPath = e;
  function e(a) {
    if (!a || a.slice(0, 1) !== "/")
      return "/";
    if (a === "/")
      return a;
    const r = a.lastIndexOf("/");
    return r === 0 ? "/" : a.slice(0, r);
  }
  return be;
}
var ye = {}, ga;
function Pa() {
  if (ga) return ye;
  ga = 1, Object.defineProperty(ye, "__esModule", { value: !0 }), ye.domainMatch = r;
  const e = Ae(), a = /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-f\d]{1,4}:){7}(?:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,2}|:)|(?:[a-f\d]{1,4}:){4}(?:(?::[a-f\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,3}|:)|(?:[a-f\d]{1,4}:){3}(?:(?::[a-f\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,4}|:)|(?:[a-f\d]{1,4}:){2}(?:(?::[a-f\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,5}|:)|(?:[a-f\d]{1,4}:){1}(?:(?::[a-f\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,6}|:)|(?::(?:(?::[a-f\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,7}|:)))$)/;
  function r(u, i, v) {
    if (u == null || i == null)
      return;
    let g, h;
    if (v !== !1 ? (g = (0, e.canonicalDomain)(u), h = (0, e.canonicalDomain)(i)) : (g = u, h = i), g == null || h == null)
      return;
    if (g == h)
      return !0;
    const p = g.lastIndexOf(h);
    return p <= 0 || g.length !== h.length + p || g.substring(p - 1, p) !== "." ? !1 : !a.test(g);
  }
  return ye;
}
var pa;
function si() {
  if (pa) return W;
  pa = 1;
  var e = W && W.__createBinding || (Object.create ? (function(O, m, k, b) {
    b === void 0 && (b = k);
    var E = Object.getOwnPropertyDescriptor(m, k);
    (!E || ("get" in E ? !m.__esModule : E.writable || E.configurable)) && (E = { enumerable: !0, get: function() {
      return m[k];
    } }), Object.defineProperty(O, b, E);
  }) : (function(O, m, k, b) {
    b === void 0 && (b = k), O[b] = m[k];
  })), a = W && W.__setModuleDefault || (Object.create ? (function(O, m) {
    Object.defineProperty(O, "default", { enumerable: !0, value: m });
  }) : function(O, m) {
    O.default = m;
  }), r = W && W.__importStar || function(O) {
    if (O && O.__esModule) return O;
    var m = {};
    if (O != null) for (var k in O) k !== "default" && Object.prototype.hasOwnProperty.call(O, k) && e(m, O, k);
    return a(m, O), m;
  };
  Object.defineProperty(W, "__esModule", { value: !0 }), W.CookieJar = void 0;
  const u = ze(), i = r(_e()), v = _e(), g = Ue(), h = Ea(), p = Me(), f = qe(), d = Ee(), z = Ae(), j = Le(), w = Ca(), P = Pa(), _ = Ia(), x = Aa(), l = {
    loose: !1,
    sameSiteContext: void 0,
    ignoreError: !1,
    http: !0
  }, c = {
    http: !0,
    expire: !0,
    allPaths: !1,
    sameSiteContext: void 0,
    sort: void 0
  }, t = 'Invalid sameSiteContext option for getCookies(); expected one of "strict", "lax", or "none"';
  function n(O) {
    if (O && typeof O == "object" && "hostname" in O && typeof O.hostname == "string" && "pathname" in O && typeof O.pathname == "string" && "protocol" in O && typeof O.protocol == "string")
      return {
        hostname: O.hostname,
        pathname: O.pathname,
        protocol: O.protocol
      };
    if (typeof O == "string")
      try {
        return new URL(decodeURI(O));
      } catch {
        return new URL(O);
      }
    else
      throw new v.ParameterError("`url` argument is not a string or URL.");
  }
  function s(O) {
    const m = String(O).toLowerCase();
    if (m === "none" || m === "lax" || m === "strict")
      return m;
  }
  function o(O) {
    return !(typeof O.key == "string" && O.key.startsWith("__Secure-")) || O.secure;
  }
  function y(O) {
    return !(typeof O.key == "string" && O.key.startsWith("__Host-")) || !!(O.secure && O.hostOnly && O.path != null && O.path === "/");
  }
  function T(O) {
    const m = O.toLowerCase();
    switch (m) {
      case j.PrefixSecurityEnum.STRICT:
      case j.PrefixSecurityEnum.SILENT:
      case j.PrefixSecurityEnum.DISABLED:
        return m;
      default:
        return j.PrefixSecurityEnum.SILENT;
    }
  }
  class M {
    /**
     * Creates a new `CookieJar` instance.
     *
     * @remarks
     * - If a custom store is not passed to the constructor, an in-memory store ({@link MemoryCookieStore} will be created and used.
     * - If a boolean value is passed as the `options` parameter, this is equivalent to passing `{ rejectPublicSuffixes: <value> }`
     *
     * @param store - a custom {@link Store} implementation (defaults to {@link MemoryCookieStore})
     * @param options - configures how cookies are processed by the cookie jar
     */
    constructor(m, k) {
      typeof k == "boolean" && (k = { rejectPublicSuffixes: k }), this.rejectPublicSuffixes = k?.rejectPublicSuffixes ?? !0, this.enableLooseMode = k?.looseMode ?? !1, this.allowSpecialUseDomain = k?.allowSpecialUseDomain ?? !0, this.prefixSecurity = T(k?.prefixSecurity ?? "silent"), this.store = m ?? new h.MemoryCookieStore();
    }
    callSync(m) {
      if (!this.store.synchronous)
        throw new Error("CookieJar store is not synchronous; use async API instead.");
      let k = null, b;
      try {
        m.call(this, (E, A) => {
          k = E, b = A;
        });
      } catch (E) {
        k = E;
      }
      if (k)
        throw k;
      return b;
    }
    /**
     * @internal No doc because this is the overload implementation
     */
    setCookie(m, k, b, E) {
      typeof b == "function" && (E = b, b = void 0);
      const A = (0, d.createPromiseCallback)(E), C = A.callback;
      let R;
      try {
        if (typeof k == "string" && i.validate(i.isNonEmptyString(k), E, (0, d.safeToString)(b)), R = n(k), typeof k == "function")
          return A.reject(new Error("No URL was specified"));
        if (typeof b == "function" && (b = l), i.validate(typeof C == "function", C), !i.isNonEmptyString(m) && !i.isObject(m) && m instanceof String && m.length == 0)
          return A.resolve(void 0);
      } catch (N) {
        return A.reject(N);
      }
      const S = (0, z.canonicalDomain)(R.hostname) ?? null, F = b?.loose || this.enableLooseMode;
      let q = null;
      if (b?.sameSiteContext && (q = s(b.sameSiteContext), !q))
        return A.reject(new Error(t));
      if (typeof m == "string" || m instanceof String) {
        const N = f.Cookie.parse(m.toString(), { loose: F });
        if (!N) {
          const D = new Error("Cookie failed to parse");
          return b?.ignoreError ? A.resolve(void 0) : A.reject(D);
        }
        m = N;
      } else if (!(m instanceof f.Cookie)) {
        const N = new Error("First argument to setCookie must be a Cookie object or string");
        return b?.ignoreError ? A.resolve(void 0) : A.reject(N);
      }
      const $ = b?.now || /* @__PURE__ */ new Date();
      if (this.rejectPublicSuffixes && m.domain)
        try {
          const N = m.cdomain();
          if ((typeof N == "string" ? (0, u.getPublicSuffix)(N, {
            allowSpecialUseDomain: this.allowSpecialUseDomain,
            ignoreError: b?.ignoreError
          }) : null) == null && !j.IP_V6_REGEX_OBJECT.test(m.domain)) {
            const U = new Error("Cookie has domain set to a public suffix");
            return b?.ignoreError ? A.resolve(void 0) : A.reject(U);
          }
        } catch (N) {
          return b?.ignoreError ? A.resolve(void 0) : (
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            A.reject(N)
          );
        }
      if (m.domain) {
        if (!(0, P.domainMatch)(S ?? void 0, m.cdomain() ?? void 0, !1)) {
          const N = new Error(`Cookie not in this host's domain. Cookie:${m.cdomain() ?? "null"} Request:${S ?? "null"}`);
          return b?.ignoreError ? A.resolve(void 0) : A.reject(N);
        }
        m.hostOnly == null && (m.hostOnly = !1);
      } else
        m.hostOnly = !0, m.domain = S;
      if ((!m.path || m.path[0] !== "/") && (m.path = (0, w.defaultPath)(R.pathname), m.pathIsDefault = !0), b?.http === !1 && m.httpOnly) {
        const N = new Error("Cookie is HttpOnly and this isn't an HTTP API");
        return b.ignoreError ? A.resolve(void 0) : A.reject(N);
      }
      if (m.sameSite !== "none" && m.sameSite !== void 0 && q && q === "none") {
        const N = new Error("Cookie is SameSite but this is a cross-origin request");
        return b?.ignoreError ? A.resolve(void 0) : A.reject(N);
      }
      const X = this.prefixSecurity === j.PrefixSecurityEnum.SILENT;
      if (!(this.prefixSecurity === j.PrefixSecurityEnum.DISABLED)) {
        let N = !1, D;
        if (o(m) ? y(m) || (N = !0, D = "Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'") : (N = !0, D = "Cookie has __Secure prefix but Secure attribute is not set"), N)
          return b?.ignoreError || X ? A.resolve(void 0) : A.reject(new Error(D));
      }
      const V = this.store;
      V.updateCookie || (V.updateCookie = async function(N, D, U) {
        return this.putCookie(D).then(() => U?.(null), (H) => U?.(H));
      });
      const Q = function(D, U) {
        if (D) {
          C(D);
          return;
        }
        const H = function(K) {
          K ? C(K) : typeof m == "string" ? C(null, void 0) : C(null, m);
        };
        if (U) {
          if (b && "http" in b && b.http === !1 && U.httpOnly) {
            D = new Error("old Cookie is HttpOnly and this isn't an HTTP API"), b.ignoreError ? C(null, void 0) : C(D);
            return;
          }
          m instanceof f.Cookie && (m.creation = U.creation, m.creationIndex = U.creationIndex, m.lastAccessed = $, V.updateCookie(U, m, H));
        } else
          m instanceof f.Cookie && (m.creation = m.lastAccessed = $, V.putCookie(m, H));
      };
      return V.findCookie(m.domain, m.path, m.key, Q), A.promise;
    }
    /**
     * Synchronously attempt to set the {@link Cookie} in the {@link CookieJar}.
     *
     * <strong>Note:</strong> Only works if the configured {@link Store} is also synchronous.
     *
     * @remarks
     * - If successfully persisted, the {@link Cookie} will have updated
     *     {@link Cookie.creation}, {@link Cookie.lastAccessed} and {@link Cookie.hostOnly}
     *     properties.
     *
     * - As per the RFC, the {@link Cookie.hostOnly} flag is set if there was no `Domain={value}`
     *     atttribute on the cookie string. The {@link Cookie.domain} property is set to the
     *     fully-qualified hostname of `currentUrl` in this case. Matching this cookie requires an
     *     exact hostname match (not a {@link domainMatch} as per usual)
     *
     * @param cookie - The cookie object or cookie string to store. A string value will be parsed into a cookie using {@link Cookie.parse}.
     * @param url - The domain to store the cookie with.
     * @param options - Configuration settings to use when storing the cookie.
     * @public
     */
    setCookieSync(m, k, b) {
      const E = b ? this.setCookie.bind(this, m, k, b) : this.setCookie.bind(this, m, k);
      return this.callSync(E);
    }
    /**
     * @internal No doc because this is the overload implementation
     */
    getCookies(m, k, b) {
      typeof k == "function" ? (b = k, k = c) : k === void 0 && (k = c);
      const E = (0, d.createPromiseCallback)(b), A = E.callback;
      let C;
      try {
        typeof m == "string" && i.validate(i.isNonEmptyString(m), A, m), C = n(m), i.validate(i.isObject(k), A, (0, d.safeToString)(k)), i.validate(typeof A == "function", A);
      } catch (D) {
        return E.reject(D);
      }
      const R = (0, z.canonicalDomain)(C.hostname), S = C.pathname || "/", F = C.protocol && (C.protocol == "https:" || C.protocol == "wss:");
      let q = 0;
      if (k.sameSiteContext) {
        const D = s(k.sameSiteContext);
        if (D == null)
          return E.reject(new Error(t));
        if (q = f.Cookie.sameSiteLevel[D], !q)
          return E.reject(new Error(t));
      }
      const $ = k.http ?? !0, X = Date.now(), ie = k.expire ?? !0, V = k.allPaths ?? !1, Q = this.store;
      function N(D) {
        if (D.hostOnly) {
          if (D.domain != R)
            return !1;
        } else if (!(0, P.domainMatch)(R ?? void 0, D.domain ?? void 0, !1))
          return !1;
        if (!V && typeof D.path == "string" && !(0, p.pathMatch)(S, D.path) || D.secure && !F || D.httpOnly && !$)
          return !1;
        if (q) {
          let H;
          if (D.sameSite === "lax" ? H = f.Cookie.sameSiteLevel.lax : D.sameSite === "strict" ? H = f.Cookie.sameSiteLevel.strict : H = f.Cookie.sameSiteLevel.none, H > q)
            return !1;
        }
        const U = D.expiryTime();
        return ie && U != null && U <= X ? (Q.removeCookie(D.domain, D.path, D.key, () => {
        }), !1) : !0;
      }
      return Q.findCookies(R, V ? null : S, this.allowSpecialUseDomain, (D, U) => {
        if (D) {
          A(D);
          return;
        }
        if (U == null) {
          A(null, []);
          return;
        }
        U = U.filter(N), "sort" in k && k.sort !== !1 && (U = U.sort(_.cookieCompare));
        const H = /* @__PURE__ */ new Date();
        for (const K of U)
          K.lastAccessed = H;
        A(null, U);
      }), E.promise;
    }
    /**
     * Synchronously retrieve the list of cookies that can be sent in a Cookie header for the
     * current URL.
     *
     * <strong>Note</strong>: Only works if the configured Store is also synchronous.
     *
     * @remarks
     * - The array of cookies returned will be sorted according to {@link cookieCompare}.
     *
     * - The {@link Cookie.lastAccessed} property will be updated on all returned cookies.
     *
     * @param url - The domain to store the cookie with.
     * @param options - Configuration settings to use when retrieving the cookies.
     */
    getCookiesSync(m, k) {
      return this.callSync(this.getCookies.bind(this, m, k)) ?? [];
    }
    /**
     * @internal No doc because this is the overload implementation
     */
    getCookieString(m, k, b) {
      typeof k == "function" && (b = k, k = void 0);
      const E = (0, d.createPromiseCallback)(b), A = function(C, R) {
        C ? E.callback(C) : E.callback(null, R?.sort(_.cookieCompare).map((S) => S.cookieString()).join("; "));
      };
      return this.getCookies(m, k, A), E.promise;
    }
    /**
     * Synchronous version of `.getCookieString()`. Accepts the same options as `.getCookies()` but returns a string suitable for a
     * `Cookie` header rather than an Array.
     *
     * <strong>Note</strong>: Only works if the configured Store is also synchronous.
     *
     * @param url - The domain to store the cookie with.
     * @param options - Configuration settings to use when retrieving the cookies.
     */
    getCookieStringSync(m, k) {
      return this.callSync(k ? this.getCookieString.bind(this, m, k) : this.getCookieString.bind(this, m)) ?? "";
    }
    /**
     * @internal No doc because this is the overload implementation
     */
    getSetCookieStrings(m, k, b) {
      typeof k == "function" && (b = k, k = void 0);
      const E = (0, d.createPromiseCallback)(b), A = function(C, R) {
        C ? E.callback(C) : E.callback(null, R?.map((S) => S.toString()));
      };
      return this.getCookies(m, k, A), E.promise;
    }
    /**
     * Synchronous version of `.getSetCookieStrings()`. Returns an array of strings suitable for `Set-Cookie` headers.
     * Accepts the same options as `.getCookies()`.
     *
     * <strong>Note</strong>: Only works if the configured Store is also synchronous.
     *
     * @param url - The domain to store the cookie with.
     * @param options - Configuration settings to use when retrieving the cookies.
     */
    getSetCookieStringsSync(m, k = {}) {
      return this.callSync(this.getSetCookieStrings.bind(this, m, k)) ?? [];
    }
    /**
     * @internal No doc because this is the overload implementation
     */
    serialize(m) {
      const k = (0, d.createPromiseCallback)(m);
      let b = this.store.constructor.name;
      i.isObject(b) && (b = null);
      const E = {
        // The version of tough-cookie that serialized this jar. Generally a good
        // practice since future versions can make data import decisions based on
        // known past behavior. When/if this matters, use `semver`.
        version: `tough-cookie@${x.version}`,
        // add the store type, to make humans happy:
        storeType: b,
        // CookieJar configuration:
        rejectPublicSuffixes: this.rejectPublicSuffixes,
        enableLooseMode: this.enableLooseMode,
        allowSpecialUseDomain: this.allowSpecialUseDomain,
        prefixSecurity: T(this.prefixSecurity),
        // this gets filled from getAllCookies:
        cookies: []
      };
      return typeof this.store.getAllCookies != "function" ? k.reject(new Error("store does not support getAllCookies and cannot be serialized")) : (this.store.getAllCookies((A, C) => {
        if (A) {
          k.callback(A);
          return;
        }
        if (C == null) {
          k.callback(null, E);
          return;
        }
        E.cookies = C.map((R) => {
          const S = R.toJSON();
          return delete S.creationIndex, S;
        }), k.callback(null, E);
      }), k.promise);
    }
    /**
     * Serialize the CookieJar if the underlying store supports `.getAllCookies`.
     *
     * <strong>Note</strong>: Only works if the configured Store is also synchronous.
     */
    serializeSync() {
      return this.callSync((m) => {
        this.serialize(m);
      });
    }
    /**
     * Alias of {@link CookieJar.serializeSync}. Allows the cookie to be serialized
     * with `JSON.stringify(cookieJar)`.
     */
    toJSON() {
      return this.serializeSync();
    }
    /**
     * Use the class method CookieJar.deserialize instead of calling this directly
     * @internal
     */
    _importCookies(m, k) {
      let b;
      if (m && typeof m == "object" && (0, d.inOperator)("cookies", m) && Array.isArray(m.cookies) && (b = m.cookies), !b) {
        k(new Error("serialized jar has no cookies array"), void 0);
        return;
      }
      b = b.slice();
      const E = (A) => {
        if (A) {
          k(A, void 0);
          return;
        }
        if (Array.isArray(b)) {
          if (!b.length) {
            k(A, this);
            return;
          }
          let C;
          try {
            C = f.Cookie.fromJSON(b.shift());
          } catch (R) {
            k(R instanceof Error ? R : new Error(), void 0);
            return;
          }
          if (C === void 0) {
            E(null);
            return;
          }
          this.store.putCookie(C, E);
        }
      };
      E(null);
    }
    /**
     * @internal
     */
    _importCookiesSync(m) {
      this.callSync(this._importCookies.bind(this, m));
    }
    /**
     * @internal No doc because this is the overload implementation
     */
    clone(m, k) {
      typeof m == "function" && (k = m, m = void 0);
      const b = (0, d.createPromiseCallback)(k), E = b.callback;
      return this.serialize((A, C) => A ? b.reject(A) : M.deserialize(C ?? "", m, E)), b.promise;
    }
    /**
     * @internal
     */
    _cloneSync(m) {
      const k = m && typeof m != "function" ? this.clone.bind(this, m) : this.clone.bind(this);
      return this.callSync((b) => {
        k(b);
      });
    }
    /**
     * Produces a deep clone of this CookieJar. Modifications to the original do
     * not affect the clone, and vice versa.
     *
     * <strong>Note</strong>: Only works if both the configured Store and destination
     * Store are synchronous.
     *
     * @remarks
     * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
     *
     * - Transferring between store types is supported so long as the source
     *     implements `.getAllCookies()` and the destination implements `.putCookie()`.
     *
     * @param newStore - The target {@link Store} to clone cookies into.
     */
    cloneSync(m) {
      if (!m)
        return this._cloneSync();
      if (!m.synchronous)
        throw new Error("CookieJar clone destination store is not synchronous; use async API instead.");
      return this._cloneSync(m);
    }
    /**
     * @internal No doc because this is the overload implementation
     */
    removeAllCookies(m) {
      const k = (0, d.createPromiseCallback)(m), b = k.callback, E = this.store;
      return typeof E.removeAllCookies == "function" && E.removeAllCookies !== g.Store.prototype.removeAllCookies ? (E.removeAllCookies(b), k.promise) : (E.getAllCookies((A, C) => {
        if (A) {
          b(A);
          return;
        }
        if (C || (C = []), C.length === 0) {
          b(null, void 0);
          return;
        }
        let R = 0;
        const S = [], F = function($) {
          if ($ && S.push($), R++, R === C.length) {
            S[0] ? b(S[0]) : b(null, void 0);
            return;
          }
        };
        C.forEach((q) => {
          E.removeCookie(q.domain, q.path, q.key, F);
        });
      }), k.promise);
    }
    /**
     * Removes all cookies from the CookieJar.
     *
     * <strong>Note</strong>: Only works if the configured Store is also synchronous.
     *
     * @remarks
     * - This is a new backwards-compatible feature of tough-cookie version 2.5,
     *     so not all Stores will implement it efficiently. For Stores that do not
     *     implement `removeAllCookies`, the fallback is to call `removeCookie` after
     *     `getAllCookies`.
     *
     * - If `getAllCookies` fails or isn't implemented in the Store, an error is returned.
     *
     * - If one or more of the `removeCookie` calls fail, only the first error is returned.
     */
    removeAllCookiesSync() {
      this.callSync((m) => {
        this.removeAllCookies(m);
      });
    }
    /**
     * @internal No doc because this is the overload implementation
     */
    static deserialize(m, k, b) {
      typeof k == "function" && (b = k, k = void 0);
      const E = (0, d.createPromiseCallback)(b);
      let A;
      if (typeof m == "string")
        try {
          A = JSON.parse(m);
        } catch (q) {
          return E.reject(q instanceof Error ? q : new Error());
        }
      else
        A = m;
      const C = (q) => A && typeof A == "object" && (0, d.inOperator)(q, A) ? A[q] : void 0, R = (q) => {
        const $ = C(q);
        return typeof $ == "boolean" ? $ : void 0;
      }, S = (q) => {
        const $ = C(q);
        return typeof $ == "string" ? $ : void 0;
      }, F = new M(k, {
        rejectPublicSuffixes: R("rejectPublicSuffixes"),
        looseMode: R("enableLooseMode"),
        allowSpecialUseDomain: R("allowSpecialUseDomain"),
        prefixSecurity: T(S("prefixSecurity") ?? "silent")
      });
      return F._importCookies(A, (q) => {
        if (q) {
          E.callback(q);
          return;
        }
        E.callback(null, F);
      }), E.promise;
    }
    /**
     * A new CookieJar is created and the serialized {@link Cookie} values are added to
     * the underlying store. Each {@link Cookie} is added via `store.putCookie(...)` in
     * the order in which they appear in the serialization.
     *
     * <strong>Note</strong>: Only works if the configured Store is also synchronous.
     *
     * @remarks
     * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
     *
     * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
     *
     * @param strOrObj - A JSON string or object representing the deserialized cookies.
     * @param store - The underlying store to persist the deserialized cookies into.
     */
    static deserializeSync(m, k) {
      const b = typeof m == "string" ? JSON.parse(m) : m, E = (S) => b && typeof b == "object" && (0, d.inOperator)(S, b) ? b[S] : void 0, A = (S) => {
        const F = E(S);
        return typeof F == "boolean" ? F : void 0;
      }, C = (S) => {
        const F = E(S);
        return typeof F == "string" ? F : void 0;
      }, R = new M(k, {
        rejectPublicSuffixes: A("rejectPublicSuffixes"),
        looseMode: A("enableLooseMode"),
        allowSpecialUseDomain: A("allowSpecialUseDomain"),
        prefixSecurity: T(C("prefixSecurity") ?? "silent")
      });
      if (!R.store.synchronous)
        throw new Error("CookieJar store is not synchronous; use async API instead.");
      return R._importCookiesSync(b), R;
    }
    /**
     * Alias of {@link CookieJar.deserializeSync}.
     *
     * @remarks
     * - When no {@link Store} is provided, a new {@link MemoryCookieStore} will be used.
     *
     * - As a convenience, if `strOrObj` is a string, it is passed through `JSON.parse` first.
     *
     * @param jsonString - A JSON string or object representing the deserialized cookies.
     * @param store - The underlying store to persist the deserialized cookies into.
     */
    static fromJSON(m, k) {
      return M.deserializeSync(m, k);
    }
  }
  return W.CookieJar = M, W;
}
var ve = {}, ka;
function ui() {
  if (ka) return ve;
  ka = 1, Object.defineProperty(ve, "__esModule", { value: !0 }), ve.permutePath = e;
  function e(a) {
    if (a === "/")
      return ["/"];
    const r = [a];
    for (; a.length > 1; ) {
      const u = a.lastIndexOf("/");
      if (u === 0)
        break;
      a = a.slice(0, u), r.push(a);
    }
    return r.push("/"), r;
  }
  return ve;
}
var ba;
function ci() {
  return ba || (ba = 1, (function(e) {
    Object.defineProperty(e, "__esModule", { value: !0 }), e.permutePath = e.parseDate = e.formatDate = e.domainMatch = e.defaultPath = e.CookieJar = e.cookieCompare = e.Cookie = e.PrefixSecurityEnum = e.canonicalDomain = e.version = e.ParameterError = e.Store = e.getPublicSuffix = e.permuteDomain = e.pathMatch = e.MemoryCookieStore = void 0, e.parse = t, e.fromJSON = n;
    var a = Ea();
    Object.defineProperty(e, "MemoryCookieStore", { enumerable: !0, get: function() {
      return a.MemoryCookieStore;
    } });
    var r = Me();
    Object.defineProperty(e, "pathMatch", { enumerable: !0, get: function() {
      return r.pathMatch;
    } });
    var u = za();
    Object.defineProperty(e, "permuteDomain", { enumerable: !0, get: function() {
      return u.permuteDomain;
    } });
    var i = ze();
    Object.defineProperty(e, "getPublicSuffix", { enumerable: !0, get: function() {
      return i.getPublicSuffix;
    } });
    var v = Ue();
    Object.defineProperty(e, "Store", { enumerable: !0, get: function() {
      return v.Store;
    } });
    var g = _e();
    Object.defineProperty(e, "ParameterError", { enumerable: !0, get: function() {
      return g.ParameterError;
    } });
    var h = Aa();
    Object.defineProperty(e, "version", { enumerable: !0, get: function() {
      return h.version;
    } });
    var p = Ae();
    Object.defineProperty(e, "canonicalDomain", { enumerable: !0, get: function() {
      return p.canonicalDomain;
    } });
    var f = Le();
    Object.defineProperty(e, "PrefixSecurityEnum", { enumerable: !0, get: function() {
      return f.PrefixSecurityEnum;
    } });
    var d = qe();
    Object.defineProperty(e, "Cookie", { enumerable: !0, get: function() {
      return d.Cookie;
    } });
    var z = Ia();
    Object.defineProperty(e, "cookieCompare", { enumerable: !0, get: function() {
      return z.cookieCompare;
    } });
    var j = si();
    Object.defineProperty(e, "CookieJar", { enumerable: !0, get: function() {
      return j.CookieJar;
    } });
    var w = Ca();
    Object.defineProperty(e, "defaultPath", { enumerable: !0, get: function() {
      return w.defaultPath;
    } });
    var P = Pa();
    Object.defineProperty(e, "domainMatch", { enumerable: !0, get: function() {
      return P.domainMatch;
    } });
    var _ = Oa();
    Object.defineProperty(e, "formatDate", { enumerable: !0, get: function() {
      return _.formatDate;
    } });
    var x = Sa();
    Object.defineProperty(e, "parseDate", { enumerable: !0, get: function() {
      return x.parseDate;
    } });
    var l = ui();
    Object.defineProperty(e, "permutePath", { enumerable: !0, get: function() {
      return l.permutePath;
    } });
    const c = qe();
    function t(s, o) {
      return c.Cookie.parse(s, o);
    }
    function n(s) {
      return c.Cookie.fromJSON(s);
    }
  })(Pe)), Pe;
}
var li = ci();
class mi extends xa {
  constructor(a) {
    super(a), this.cookieJar = new li.CookieJar();
  }
  registerCookies(a) {
    const r = a.headers.get("set-cookie");
    return r ? this.cookieJar.setCookie(r, a.url) : Promise.resolve(void 0);
  }
  getCookies() {
    return this.cookieJar.getCookieString(this.httpOptions.baseUrl);
  }
}
const B = [];
for (let e = 0; e < 256; ++e)
  B.push((e + 256).toString(16).slice(1));
function di(e, a = 0) {
  return (B[e[a + 0]] + B[e[a + 1]] + B[e[a + 2]] + B[e[a + 3]] + "-" + B[e[a + 4]] + B[e[a + 5]] + "-" + B[e[a + 6]] + B[e[a + 7]] + "-" + B[e[a + 8]] + B[e[a + 9]] + "-" + B[e[a + 10]] + B[e[a + 11]] + B[e[a + 12]] + B[e[a + 13]] + B[e[a + 14]] + B[e[a + 15]]).toLowerCase();
}
const xe = new Uint8Array(256);
let we = xe.length;
function hi() {
  return we > xe.length - 16 && (Ra(xe), we = 0), xe.slice(we, we += 16);
}
const ya = { randomUUID: qa };
function fi(e, a, r) {
  e = e || {};
  const u = e.random ?? e.rng?.() ?? hi();
  if (u.length < 16)
    throw new Error("Random bytes length must be >= 16");
  return u[6] = u[6] & 15 | 64, u[8] = u[8] & 63 | 128, di(u);
}
function gi(e, a, r) {
  return ya.randomUUID && !e ? ya.randomUUID() : fi(e);
}
var Re = { exports: {} }, va;
function pi() {
  return va || (va = 1, (function(e, a) {
    (function(r) {
      e.exports = r();
    })(function(r) {
      var u = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
      function i(l, c) {
        var t = l[0], n = l[1], s = l[2], o = l[3];
        t += (n & s | ~n & o) + c[0] - 680876936 | 0, t = (t << 7 | t >>> 25) + n | 0, o += (t & n | ~t & s) + c[1] - 389564586 | 0, o = (o << 12 | o >>> 20) + t | 0, s += (o & t | ~o & n) + c[2] + 606105819 | 0, s = (s << 17 | s >>> 15) + o | 0, n += (s & o | ~s & t) + c[3] - 1044525330 | 0, n = (n << 22 | n >>> 10) + s | 0, t += (n & s | ~n & o) + c[4] - 176418897 | 0, t = (t << 7 | t >>> 25) + n | 0, o += (t & n | ~t & s) + c[5] + 1200080426 | 0, o = (o << 12 | o >>> 20) + t | 0, s += (o & t | ~o & n) + c[6] - 1473231341 | 0, s = (s << 17 | s >>> 15) + o | 0, n += (s & o | ~s & t) + c[7] - 45705983 | 0, n = (n << 22 | n >>> 10) + s | 0, t += (n & s | ~n & o) + c[8] + 1770035416 | 0, t = (t << 7 | t >>> 25) + n | 0, o += (t & n | ~t & s) + c[9] - 1958414417 | 0, o = (o << 12 | o >>> 20) + t | 0, s += (o & t | ~o & n) + c[10] - 42063 | 0, s = (s << 17 | s >>> 15) + o | 0, n += (s & o | ~s & t) + c[11] - 1990404162 | 0, n = (n << 22 | n >>> 10) + s | 0, t += (n & s | ~n & o) + c[12] + 1804603682 | 0, t = (t << 7 | t >>> 25) + n | 0, o += (t & n | ~t & s) + c[13] - 40341101 | 0, o = (o << 12 | o >>> 20) + t | 0, s += (o & t | ~o & n) + c[14] - 1502002290 | 0, s = (s << 17 | s >>> 15) + o | 0, n += (s & o | ~s & t) + c[15] + 1236535329 | 0, n = (n << 22 | n >>> 10) + s | 0, t += (n & o | s & ~o) + c[1] - 165796510 | 0, t = (t << 5 | t >>> 27) + n | 0, o += (t & s | n & ~s) + c[6] - 1069501632 | 0, o = (o << 9 | o >>> 23) + t | 0, s += (o & n | t & ~n) + c[11] + 643717713 | 0, s = (s << 14 | s >>> 18) + o | 0, n += (s & t | o & ~t) + c[0] - 373897302 | 0, n = (n << 20 | n >>> 12) + s | 0, t += (n & o | s & ~o) + c[5] - 701558691 | 0, t = (t << 5 | t >>> 27) + n | 0, o += (t & s | n & ~s) + c[10] + 38016083 | 0, o = (o << 9 | o >>> 23) + t | 0, s += (o & n | t & ~n) + c[15] - 660478335 | 0, s = (s << 14 | s >>> 18) + o | 0, n += (s & t | o & ~t) + c[4] - 405537848 | 0, n = (n << 20 | n >>> 12) + s | 0, t += (n & o | s & ~o) + c[9] + 568446438 | 0, t = (t << 5 | t >>> 27) + n | 0, o += (t & s | n & ~s) + c[14] - 1019803690 | 0, o = (o << 9 | o >>> 23) + t | 0, s += (o & n | t & ~n) + c[3] - 187363961 | 0, s = (s << 14 | s >>> 18) + o | 0, n += (s & t | o & ~t) + c[8] + 1163531501 | 0, n = (n << 20 | n >>> 12) + s | 0, t += (n & o | s & ~o) + c[13] - 1444681467 | 0, t = (t << 5 | t >>> 27) + n | 0, o += (t & s | n & ~s) + c[2] - 51403784 | 0, o = (o << 9 | o >>> 23) + t | 0, s += (o & n | t & ~n) + c[7] + 1735328473 | 0, s = (s << 14 | s >>> 18) + o | 0, n += (s & t | o & ~t) + c[12] - 1926607734 | 0, n = (n << 20 | n >>> 12) + s | 0, t += (n ^ s ^ o) + c[5] - 378558 | 0, t = (t << 4 | t >>> 28) + n | 0, o += (t ^ n ^ s) + c[8] - 2022574463 | 0, o = (o << 11 | o >>> 21) + t | 0, s += (o ^ t ^ n) + c[11] + 1839030562 | 0, s = (s << 16 | s >>> 16) + o | 0, n += (s ^ o ^ t) + c[14] - 35309556 | 0, n = (n << 23 | n >>> 9) + s | 0, t += (n ^ s ^ o) + c[1] - 1530992060 | 0, t = (t << 4 | t >>> 28) + n | 0, o += (t ^ n ^ s) + c[4] + 1272893353 | 0, o = (o << 11 | o >>> 21) + t | 0, s += (o ^ t ^ n) + c[7] - 155497632 | 0, s = (s << 16 | s >>> 16) + o | 0, n += (s ^ o ^ t) + c[10] - 1094730640 | 0, n = (n << 23 | n >>> 9) + s | 0, t += (n ^ s ^ o) + c[13] + 681279174 | 0, t = (t << 4 | t >>> 28) + n | 0, o += (t ^ n ^ s) + c[0] - 358537222 | 0, o = (o << 11 | o >>> 21) + t | 0, s += (o ^ t ^ n) + c[3] - 722521979 | 0, s = (s << 16 | s >>> 16) + o | 0, n += (s ^ o ^ t) + c[6] + 76029189 | 0, n = (n << 23 | n >>> 9) + s | 0, t += (n ^ s ^ o) + c[9] - 640364487 | 0, t = (t << 4 | t >>> 28) + n | 0, o += (t ^ n ^ s) + c[12] - 421815835 | 0, o = (o << 11 | o >>> 21) + t | 0, s += (o ^ t ^ n) + c[15] + 530742520 | 0, s = (s << 16 | s >>> 16) + o | 0, n += (s ^ o ^ t) + c[2] - 995338651 | 0, n = (n << 23 | n >>> 9) + s | 0, t += (s ^ (n | ~o)) + c[0] - 198630844 | 0, t = (t << 6 | t >>> 26) + n | 0, o += (n ^ (t | ~s)) + c[7] + 1126891415 | 0, o = (o << 10 | o >>> 22) + t | 0, s += (t ^ (o | ~n)) + c[14] - 1416354905 | 0, s = (s << 15 | s >>> 17) + o | 0, n += (o ^ (s | ~t)) + c[5] - 57434055 | 0, n = (n << 21 | n >>> 11) + s | 0, t += (s ^ (n | ~o)) + c[12] + 1700485571 | 0, t = (t << 6 | t >>> 26) + n | 0, o += (n ^ (t | ~s)) + c[3] - 1894986606 | 0, o = (o << 10 | o >>> 22) + t | 0, s += (t ^ (o | ~n)) + c[10] - 1051523 | 0, s = (s << 15 | s >>> 17) + o | 0, n += (o ^ (s | ~t)) + c[1] - 2054922799 | 0, n = (n << 21 | n >>> 11) + s | 0, t += (s ^ (n | ~o)) + c[8] + 1873313359 | 0, t = (t << 6 | t >>> 26) + n | 0, o += (n ^ (t | ~s)) + c[15] - 30611744 | 0, o = (o << 10 | o >>> 22) + t | 0, s += (t ^ (o | ~n)) + c[6] - 1560198380 | 0, s = (s << 15 | s >>> 17) + o | 0, n += (o ^ (s | ~t)) + c[13] + 1309151649 | 0, n = (n << 21 | n >>> 11) + s | 0, t += (s ^ (n | ~o)) + c[4] - 145523070 | 0, t = (t << 6 | t >>> 26) + n | 0, o += (n ^ (t | ~s)) + c[11] - 1120210379 | 0, o = (o << 10 | o >>> 22) + t | 0, s += (t ^ (o | ~n)) + c[2] + 718787259 | 0, s = (s << 15 | s >>> 17) + o | 0, n += (o ^ (s | ~t)) + c[9] - 343485551 | 0, n = (n << 21 | n >>> 11) + s | 0, l[0] = t + l[0] | 0, l[1] = n + l[1] | 0, l[2] = s + l[2] | 0, l[3] = o + l[3] | 0;
      }
      function v(l) {
        var c = [], t;
        for (t = 0; t < 64; t += 4)
          c[t >> 2] = l.charCodeAt(t) + (l.charCodeAt(t + 1) << 8) + (l.charCodeAt(t + 2) << 16) + (l.charCodeAt(t + 3) << 24);
        return c;
      }
      function g(l) {
        var c = [], t;
        for (t = 0; t < 64; t += 4)
          c[t >> 2] = l[t] + (l[t + 1] << 8) + (l[t + 2] << 16) + (l[t + 3] << 24);
        return c;
      }
      function h(l) {
        var c = l.length, t = [1732584193, -271733879, -1732584194, 271733878], n, s, o, y, T, M;
        for (n = 64; n <= c; n += 64)
          i(t, v(l.substring(n - 64, n)));
        for (l = l.substring(n - 64), s = l.length, o = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], n = 0; n < s; n += 1)
          o[n >> 2] |= l.charCodeAt(n) << (n % 4 << 3);
        if (o[n >> 2] |= 128 << (n % 4 << 3), n > 55)
          for (i(t, o), n = 0; n < 16; n += 1)
            o[n] = 0;
        return y = c * 8, y = y.toString(16).match(/(.*?)(.{0,8})$/), T = parseInt(y[2], 16), M = parseInt(y[1], 16) || 0, o[14] = T, o[15] = M, i(t, o), t;
      }
      function p(l) {
        var c = l.length, t = [1732584193, -271733879, -1732584194, 271733878], n, s, o, y, T, M;
        for (n = 64; n <= c; n += 64)
          i(t, g(l.subarray(n - 64, n)));
        for (l = n - 64 < c ? l.subarray(n - 64) : new Uint8Array(0), s = l.length, o = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], n = 0; n < s; n += 1)
          o[n >> 2] |= l[n] << (n % 4 << 3);
        if (o[n >> 2] |= 128 << (n % 4 << 3), n > 55)
          for (i(t, o), n = 0; n < 16; n += 1)
            o[n] = 0;
        return y = c * 8, y = y.toString(16).match(/(.*?)(.{0,8})$/), T = parseInt(y[2], 16), M = parseInt(y[1], 16) || 0, o[14] = T, o[15] = M, i(t, o), t;
      }
      function f(l) {
        var c = "", t;
        for (t = 0; t < 4; t += 1)
          c += u[l >> t * 8 + 4 & 15] + u[l >> t * 8 & 15];
        return c;
      }
      function d(l) {
        var c;
        for (c = 0; c < l.length; c += 1)
          l[c] = f(l[c]);
        return l.join("");
      }
      d(h("hello")), typeof ArrayBuffer < "u" && !ArrayBuffer.prototype.slice && (function() {
        function l(c, t) {
          return c = c | 0 || 0, c < 0 ? Math.max(c + t, 0) : Math.min(c, t);
        }
        ArrayBuffer.prototype.slice = function(c, t) {
          var n = this.byteLength, s = l(c, n), o = n, y, T, M, O;
          return t !== r && (o = l(t, n)), s > o ? new ArrayBuffer(0) : (y = o - s, T = new ArrayBuffer(y), M = new Uint8Array(T), O = new Uint8Array(this, s, y), M.set(O), T);
        };
      })();
      function z(l) {
        return /[\u0080-\uFFFF]/.test(l) && (l = unescape(encodeURIComponent(l))), l;
      }
      function j(l, c) {
        var t = l.length, n = new ArrayBuffer(t), s = new Uint8Array(n), o;
        for (o = 0; o < t; o += 1)
          s[o] = l.charCodeAt(o);
        return c ? s : n;
      }
      function w(l) {
        return String.fromCharCode.apply(null, new Uint8Array(l));
      }
      function P(l, c, t) {
        var n = new Uint8Array(l.byteLength + c.byteLength);
        return n.set(new Uint8Array(l)), n.set(new Uint8Array(c), l.byteLength), n;
      }
      function _(l) {
        var c = [], t = l.length, n;
        for (n = 0; n < t - 1; n += 2)
          c.push(parseInt(l.substr(n, 2), 16));
        return String.fromCharCode.apply(String, c);
      }
      function x() {
        this.reset();
      }
      return x.prototype.append = function(l) {
        return this.appendBinary(z(l)), this;
      }, x.prototype.appendBinary = function(l) {
        this._buff += l, this._length += l.length;
        var c = this._buff.length, t;
        for (t = 64; t <= c; t += 64)
          i(this._hash, v(this._buff.substring(t - 64, t)));
        return this._buff = this._buff.substring(t - 64), this;
      }, x.prototype.end = function(l) {
        var c = this._buff, t = c.length, n, s = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], o;
        for (n = 0; n < t; n += 1)
          s[n >> 2] |= c.charCodeAt(n) << (n % 4 << 3);
        return this._finish(s, t), o = d(this._hash), l && (o = _(o)), this.reset(), o;
      }, x.prototype.reset = function() {
        return this._buff = "", this._length = 0, this._hash = [1732584193, -271733879, -1732584194, 271733878], this;
      }, x.prototype.getState = function() {
        return {
          buff: this._buff,
          length: this._length,
          hash: this._hash.slice()
        };
      }, x.prototype.setState = function(l) {
        return this._buff = l.buff, this._length = l.length, this._hash = l.hash, this;
      }, x.prototype.destroy = function() {
        delete this._hash, delete this._buff, delete this._length;
      }, x.prototype._finish = function(l, c) {
        var t = c, n, s, o;
        if (l[t >> 2] |= 128 << (t % 4 << 3), t > 55)
          for (i(this._hash, l), t = 0; t < 16; t += 1)
            l[t] = 0;
        n = this._length * 8, n = n.toString(16).match(/(.*?)(.{0,8})$/), s = parseInt(n[2], 16), o = parseInt(n[1], 16) || 0, l[14] = s, l[15] = o, i(this._hash, l);
      }, x.hash = function(l, c) {
        return x.hashBinary(z(l), c);
      }, x.hashBinary = function(l, c) {
        var t = h(l), n = d(t);
        return c ? _(n) : n;
      }, x.ArrayBuffer = function() {
        this.reset();
      }, x.ArrayBuffer.prototype.append = function(l) {
        var c = P(this._buff.buffer, l), t = c.length, n;
        for (this._length += l.byteLength, n = 64; n <= t; n += 64)
          i(this._hash, g(c.subarray(n - 64, n)));
        return this._buff = n - 64 < t ? new Uint8Array(c.buffer.slice(n - 64)) : new Uint8Array(0), this;
      }, x.ArrayBuffer.prototype.end = function(l) {
        var c = this._buff, t = c.length, n = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], s, o;
        for (s = 0; s < t; s += 1)
          n[s >> 2] |= c[s] << (s % 4 << 3);
        return this._finish(n, t), o = d(this._hash), l && (o = _(o)), this.reset(), o;
      }, x.ArrayBuffer.prototype.reset = function() {
        return this._buff = new Uint8Array(0), this._length = 0, this._hash = [1732584193, -271733879, -1732584194, 271733878], this;
      }, x.ArrayBuffer.prototype.getState = function() {
        var l = x.prototype.getState.call(this);
        return l.buff = w(l.buff), l;
      }, x.ArrayBuffer.prototype.setState = function(l) {
        return l.buff = j(l.buff, !0), x.prototype.setState.call(this, l);
      }, x.ArrayBuffer.prototype.destroy = x.prototype.destroy, x.ArrayBuffer.prototype._finish = x.prototype._finish, x.ArrayBuffer.hash = function(l, c) {
        var t = p(new Uint8Array(l)), n = d(t);
        return c ? _(n) : n;
      }, x;
    });
  })(Re)), Re.exports;
}
var ki = pi();
const bi = /* @__PURE__ */ Ta(ki), se = bi.hash;
class Fe {
  /**
   * RFC 2617: handle both MD5 and MD5-sess algorithms.
   *
   * If the algorithm directive's value is "MD5" or unspecified, then HA1 is
   *   HA1=MD5(username:realm:password)
   * If the algorithm directive's value is "MD5-sess", then HA1 is
   *   HA1=MD5(MD5(username:realm:password):nonce:cnonce)
   */
  static ha1Compute(a, r, u, i, v, g) {
    const h = se(`${r}:${u}:${i}`);
    return a && a.toLowerCase() === "md5-sess" ? se(`${h}:${v}:${g}`) : h;
  }
  constructor(a) {
    this.credentials = a, this.hasAuth = !1, this.sentAuth = !1, this.bearerToken = null;
  }
  digest(a, r, u) {
    const i = {}, v = /([a-z0-9_-]+)=(?:"([^"]+)"|([a-z0-9_-]+))/gi;
    for (; ; ) {
      const _ = v.exec(u);
      if (!_)
        break;
      i[_[1]] = _[2] || _[3];
    }
    const g = /(^|,)\s*auth\s*($|,)/.test(i.qop) && "auth", h = g && "00000001", p = g && gi().replace(/-/g, ""), f = Fe.ha1Compute(i.algorithm, this.credentials.username, i.realm, this.credentials.password, i.nonce, p), d = se(`${a}:${r}`), z = se(g ? `${f}:${i.nonce}:${h}:${p}:${g}:${d}` : `${f}:${i.nonce}:${d}`), j = {
      username: this.credentials.username,
      realm: i.realm,
      nonce: i.nonce,
      uri: r,
      qop: g,
      response: z,
      nc: h,
      cnonce: p,
      algorithm: i.algorithm,
      opaque: i.opaque
    }, w = [];
    Object.entries(j).forEach(([_, x]) => {
      x && (_ === "qop" || _ === "nc" || _ === "algorithm" ? w.push(`${_}=${x}`) : w.push(`${_}="${x}"`));
    });
    const P = `Digest ${w.join(", ")}`;
    return this.sentAuth = !0, P;
  }
}
class Be {
  static sleep(a) {
    return new Promise((r) => setTimeout(r, a));
  }
  /**
   * @param requests Number of allowed requests with period
   * @param period Period in seconds
   */
  constructor(a, r) {
    this.requests = a, this.queue = [], this.period = 1e3 * r;
  }
  /**
   * Call limit before the function you want call no more than `requests` in per `period`.
   * @return Resolved when timeout completed comply with rate limit threshold
   */
  async limit() {
    const a = (/* @__PURE__ */ new Date()).getTime(), r = a - this.period;
    for (; this.queue.length > 0 && this.queue[0] < r; )
      this.queue.shift();
    let u = 0;
    return this.queue.length >= this.requests && (u = this.queue[0] + this.period - a, await Be.sleep(u)), this.queue.push((/* @__PURE__ */ new Date()).getTime()), u;
  }
}
var Ne;
(function(e) {
  e[e.license = 302] = "license", e[e.production = 256] = "production", e[e.samples_IMDb_entry = 258] = "samples_IMDb_entry", e[e.get_the_music = 257] = "get_the_music", e[e.purchase_for_download = 254] = "purchase_for_download", e[e.download_for_free = 255] = "download_for_free", e[e.stream_for_free = 268] = "stream_for_free", e[e.crowdfunding_page = 905] = "crowdfunding_page", e[e.other_databases = 306] = "other_databases", e[e.Allmusic = 285] = "Allmusic";
})(Ne || (Ne = {}));
const yi = wa("musicbrainz-api");
let vi = class je {
  static fetchCsrf(a) {
    return {
      sessionKey: je.fetchValue(a, "csrf_session_key"),
      token: je.fetchValue(a, "csrf_token")
    };
  }
  static fetchValue(a, r) {
    let u = a.indexOf(`name="${r}"`);
    if (u >= 0 && (u = a.indexOf('value="', u + r.length + 7), u >= 0)) {
      u += 7;
      const i = a.indexOf('"', u);
      return a.substring(u, i);
    }
  }
  constructor(a) {
    this.config = {
      baseUrl: "https://musicbrainz.org",
      ...a
    }, this.httpClient = this.initHttpClient();
    const r = this.config.rateLimit ?? [15, 18];
    this.rateLimiter = new Be(r[0], r[1]);
  }
  initHttpClient() {
    return new xa({
      baseUrl: this.config.baseUrl,
      timeout: 500,
      userAgent: `${this.config.appName}/${this.config.appVersion} ( ${this.config.appContactInfo} )`
    });
  }
  async restGet(a, r = {}) {
    return r.fmt = "json", await this.applyRateLimiter(), (await this.httpClient.get(`/ws/2${a}`, {
      query: r,
      retryLimit: 10
    })).json();
  }
  lookup(a, r, u = []) {
    return this.restGet(`/${a}/${r}`, { inc: u.join(" ") });
  }
  async lookupUrl(a, r = []) {
    const u = await this.restGet("/url", { resource: a, inc: r.join(" ") });
    return Array.isArray(a) && a.length <= 1 ? {
      "url-count": 1,
      "url-offset": 0,
      urls: [u]
    } : u;
  }
  browse(a, r, u) {
    r = r || {}, u && (r.inc = u.join(" "));
    for (const i of ["type", "status"])
      r[i] && (r[i] = r[i].join("|"));
    return this.restGet(`/${a}`, r);
  }
  search(a, r) {
    const u = { ...r };
    return typeof r.query == "object" && (u.query = wi(r.query)), Array.isArray(r.inc) && (u.inc = u.inc.join(" ")), this.restGet(`/${a}/`, u);
  }
  // ---------------------------------------------------------------------------
  async postRecording(a) {
    return this.post("recording", a);
  }
  async post(a, r) {
    if (!this.config.appName || !this.config.appVersion)
      throw new Error("XML-Post requires the appName & appVersion to be defined");
    const u = `${this.config.appName.replace(/-/g, ".")}-${this.config.appVersion}`, i = `/ws/2/${a}/`;
    let v = "", g = 1;
    const h = r.toXml();
    do {
      await this.applyRateLimiter();
      const p = await this.httpClient.post(i, {
        query: { client: u },
        headers: {
          authorization: v,
          "Content-Type": "application/xml"
        },
        body: h
      });
      if (p.statusCode === Z.UNAUTHORIZED) {
        const f = new Fe(this.config.botAccount), d = p.requestUrl.pathname;
        v = f.digest(p.request.method, d, p.headers["www-authenticate"]), ++g;
      } else
        break;
    } while (g++ < 5);
  }
  /**
   * Submit entity
   * @param entity Entity type e.g. 'recording'
   * @param mbid
   * @param formData
   */
  async editEntity(a, r, u) {
    await this.applyRateLimiter(), this.session = await this.getSession(), u.csrf_session_key = this.session.csrf.sessionKey, u.csrf_token = this.session.csrf.token, u.username = this.config.botAccount?.username, u.password = this.config.botAccount?.password, u.remember_me = 1;
    const i = await this.httpClient.postForm(`/${a}/${r}/edit`, u, {
      followRedirects: !1
    });
    if (i.status === Z.OK)
      throw new Error("Failed to submit form data");
    if (i.status !== Z.MOVED_TEMPORARILY)
      throw new Error(`Unexpected status code: ${i.status}`);
  }
  /**
   * Set URL to recording
   * @param recording Recording to update
   * @param url2add URL to add to the recording
   * @param editNote Edit note
   */
  async addUrlToRecording(a, r, u = "") {
    const i = {};
    return i["edit-recording.name"] = a.title, i["edit-recording.comment"] = a.disambiguation, i["edit-recording.make_votable"] = !0, i["edit-recording.url.0.link_type_id"] = r.linkTypeId, i["edit-recording.url.0.text"] = r.text, a.isrcs?.forEach((v, g) => {
      i[`edit-recording.isrcs.${g}`] = v;
    }), i["edit-recording.edit_note"] = u, this.editEntity("recording", a.id, i);
  }
  /**
   * Add ISRC to recording
   * @param recording Recording to update
   * @param isrc ISRC code to add
   */
  async addIsrc(a, r) {
    const u = {};
    if (u["edit-recording.name"] = a.title, !a.isrcs)
      throw new Error("You must retrieve recording with existing ISRC values");
    if (a.isrcs.indexOf(r) === -1) {
      a.isrcs.push(r);
      for (const i in a.isrcs)
        u[`edit-recording.isrcs.${i}`] = a.isrcs[i];
      return this.editEntity("recording", a.id, u);
    }
  }
  // -----------------------------------------------------------------------------------------------------------------
  // Helper functions
  // -----------------------------------------------------------------------------------------------------------------
  /**
   * Add Spotify-ID to MusicBrainz recording.
   * This function will automatically lookup the recording title, which is required to submit the recording URL
   * @param recording MBID of the recording
   * @param spotifyId Spotify ID
   * @param editNote Comment to add.
   */
  addSpotifyIdToRecording(a, r, u) {
    if (r.length !== 22)
      throw new Error("Invalid Spotify ID length");
    return this.addUrlToRecording(a, {
      linkTypeId: Ne.stream_for_free,
      text: `https://open.spotify.com/track/${r}`
    }, u);
  }
  async getSession() {
    const a = await this.httpClient.get("login", {
      followRedirects: !1
    });
    return {
      csrf: je.fetchCsrf(await a.text())
    };
  }
  async applyRateLimiter() {
    if (!this.config.disableRateLimiting) {
      const a = await this.rateLimiter.limit();
      yi(`Client side rate limiter activated: cool down for ${Math.round(a / 100) / 10} s...`);
    }
  }
};
function wi(e) {
  return Object.keys(e).map((a) => `${a}:"${e[a]}"`).join(" AND ");
}
class zi extends vi {
  initHttpClient() {
    return new mi({
      baseUrl: this.config.baseUrl,
      timeout: 500,
      userAgent: `${this.config.appName}/${this.config.appVersion} ( ${this.config.appContactInfo} )`
    });
  }
  async login() {
    if (!this.config.botAccount?.username)
      throw new Error("bot username should be set");
    if (!this.config.botAccount?.password)
      throw new Error("bot password should be set");
    if (this.session?.loggedIn)
      return (await this.httpClient.getCookies()).indexOf("musicbrainz_server_session") !== -1;
    this.session = await this.getSession();
    const a = "/success", r = {
      username: this.config.botAccount.username,
      password: this.config.botAccount.password,
      csrf_session_key: this.session.csrf.sessionKey,
      csrf_token: this.session.csrf.token,
      remember_me: "1"
    }, u = await this.httpClient.postForm("login", r, {
      query: {
        returnto: a
      },
      followRedirects: !1
    }), i = u.status === Z.MOVED_TEMPORARILY && u.headers.get("location") === a;
    return i && (this.session.loggedIn = !0), i;
  }
  /**
   * Logout
   */
  async logout() {
    const a = "/success", r = await this.httpClient.post("logout", {
      followRedirects: !1,
      query: {
        returnto: a
      }
    }), u = r.status === Z.MOVED_TEMPORARILY && r.headers.get("location") === a;
    return u && this.session && (this.session.loggedIn = !0), u;
  }
}
export {
  xa as HttpClient,
  Ne as LinkType,
  zi as MusicBrainzApi
};
