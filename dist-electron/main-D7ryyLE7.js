import { app as B, BrowserWindow as z, nativeImage as rr, Tray as ir, Menu as kt, ipcMain as O, dialog as Qe, globalShortcut as Oe } from "electron";
import F from "node:path";
import { fileURLToPath as St } from "node:url";
import ge from "node:fs";
import { open as nr } from "node:fs/promises";
import Ct from "tty";
import ar, { promisify as It } from "util";
import Et from "os";
import sr from "events";
import or, { execFile as At } from "child_process";
import I from "fs";
import we from "https";
import cr from "stream";
import M from "path";
const Rt = F.dirname(St(import.meta.url));
process.env.APP_ROOT = F.join(Rt, "..");
const he = process.env.VITE_DEV_SERVER_URL;
F.join(process.env.APP_ROOT, "dist-electron");
const _t = F.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = he ? F.join(process.env.APP_ROOT, "public") : _t;
let R = null;
function ve() {
  return R = new z({
    width: 800,
    // Default width
    height: 700,
    // Default height
    minWidth: 450,
    // Minimum width
    minHeight: 600,
    // Minimum height
    frame: !1,
    // Remove default frame
    titleBarStyle: "hidden",
    // Hide title bar (macOS)
    backgroundColor: "#1a1a1a",
    // Match app background
    icon: F.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: F.join(Rt, "preload.mjs"),
      webSecurity: !1,
      // Allow loading local files via file:// protocol for audio playback
      allowRunningInsecureContent: !0,
      // Allow loading local resources
      devTools: !0
      // Keep dev tools enabled
    }
  }), R.on("maximize", () => {
    R?.webContents.send("window-state-changed", !0);
  }), R.on("unmaximize", () => {
    R?.webContents.send("window-state-changed", !1);
  }), R.setMenuBarVisibility(!1), R.webContents.on("did-finish-load", () => {
    R?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString()), R && R.webContents.send("window-state-changed", R.isMaximized());
  }), he && R.webContents.openDevTools(), he ? R.loadURL(he) : R.loadFile(F.join(_t, "index.html")), R;
}
function lr() {
  B.on("window-all-closed", () => {
    process.platform !== "darwin" && (B.quit(), R = null);
  }), B.on("activate", () => {
    z.getAllWindows().length === 0 && ve();
  });
}
const ur = "End-Of-Stream";
class _ extends Error {
  constructor() {
    super(ur), this.name = "EndOfStreamError";
  }
}
class dr extends Error {
  constructor(e = "The operation was aborted") {
    super(e), this.name = "AbortError";
  }
}
class Ft {
  constructor() {
    this.endOfStream = !1, this.interrupted = !1, this.peekQueue = [];
  }
  async peek(e, t = !1) {
    const i = await this.read(e, t);
    return this.peekQueue.push(e.subarray(0, i)), i;
  }
  async read(e, t = !1) {
    if (e.length === 0)
      return 0;
    let i = this.readFromPeekBuffer(e);
    if (this.endOfStream || (i += await this.readRemainderFromStream(e.subarray(i), t)), i === 0 && !t)
      throw new _();
    return i;
  }
  /**
   * Read chunk from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @returns Number of bytes read
   */
  readFromPeekBuffer(e) {
    let t = e.length, i = 0;
    for (; this.peekQueue.length > 0 && t > 0; ) {
      const n = this.peekQueue.pop();
      if (!n)
        throw new Error("peekData should be defined");
      const a = Math.min(n.length, t);
      e.set(n.subarray(0, a), i), i += a, t -= a, a < n.length && this.peekQueue.push(n.subarray(a));
    }
    return i;
  }
  async readRemainderFromStream(e, t) {
    let i = 0;
    for (; i < e.length && !this.endOfStream; ) {
      if (this.interrupted)
        throw new dr();
      const n = await this.readFromStream(e.subarray(i), t);
      if (n === 0)
        break;
      i += n;
    }
    if (!t && i < e.length)
      throw new _();
    return i;
  }
}
class pr extends Ft {
  constructor(e) {
    super(), this.reader = e;
  }
  async abort() {
    return this.close();
  }
  async close() {
    this.reader.releaseLock();
  }
}
class mr extends pr {
  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  async readFromStream(e, t) {
    if (e.length === 0)
      return 0;
    const i = await this.reader.read(new Uint8Array(e.length), { min: t ? void 0 : e.length });
    return i.done && (this.endOfStream = i.done), i.value ? (e.set(i.value), i.value.length) : 0;
  }
}
class et extends Ft {
  constructor(e) {
    super(), this.reader = e, this.buffer = null;
  }
  /**
   * Copy chunk to target, and store the remainder in this.buffer
   */
  writeChunk(e, t) {
    const i = Math.min(t.length, e.length);
    return e.set(t.subarray(0, i)), i < t.length ? this.buffer = t.subarray(i) : this.buffer = null, i;
  }
  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  async readFromStream(e, t) {
    if (e.length === 0)
      return 0;
    let i = 0;
    for (this.buffer && (i += this.writeChunk(e, this.buffer)); i < e.length && !this.endOfStream; ) {
      const n = await this.reader.read();
      if (n.done) {
        this.endOfStream = !0;
        break;
      }
      n.value && (i += this.writeChunk(e.subarray(i), n.value));
    }
    if (!t && i === 0 && this.endOfStream)
      throw new _();
    return i;
  }
  abort() {
    return this.interrupted = !0, this.reader.cancel();
  }
  async close() {
    await this.abort(), this.reader.releaseLock();
  }
}
function fr(r) {
  try {
    const e = r.getReader({ mode: "byob" });
    return e instanceof ReadableStreamDefaultReader ? new et(e) : new mr(e);
  } catch (e) {
    if (e instanceof TypeError)
      return new et(r.getReader());
    throw e;
  }
}
class ke {
  /**
   * Constructor
   * @param options Tokenizer options
   * @protected
   */
  constructor(e) {
    this.numBuffer = new Uint8Array(8), this.position = 0, this.onClose = e?.onClose, e?.abortSignal && e.abortSignal.addEventListener("abort", () => {
      this.abort();
    });
  }
  /**
   * Read a token from the tokenizer-stream
   * @param token - The token to read
   * @param position - If provided, the desired position in the tokenizer-stream
   * @returns Promise with token data
   */
  async readToken(e, t = this.position) {
    const i = new Uint8Array(e.len);
    if (await this.readBuffer(i, { position: t }) < e.len)
      throw new _();
    return e.get(i, 0);
  }
  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @returns Promise with token data
   */
  async peekToken(e, t = this.position) {
    const i = new Uint8Array(e.len);
    if (await this.peekBuffer(i, { position: t }) < e.len)
      throw new _();
    return e.get(i, 0);
  }
  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  async readNumber(e) {
    if (await this.readBuffer(this.numBuffer, { length: e.len }) < e.len)
      throw new _();
    return e.get(this.numBuffer, 0);
  }
  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  async peekNumber(e) {
    if (await this.peekBuffer(this.numBuffer, { length: e.len }) < e.len)
      throw new _();
    return e.get(this.numBuffer, 0);
  }
  /**
   * Ignore number of bytes, advances the pointer in under tokenizer-stream.
   * @param length - Number of bytes to ignore
   * @return resolves the number of bytes ignored, equals length if this available, otherwise the number of bytes available
   */
  async ignore(e) {
    if (this.fileInfo.size !== void 0) {
      const t = this.fileInfo.size - this.position;
      if (e > t)
        return this.position += t, t;
    }
    return this.position += e, e;
  }
  async close() {
    await this.abort(), await this.onClose?.();
  }
  normalizeOptions(e, t) {
    if (!this.supportsRandomAccess() && t && t.position !== void 0 && t.position < this.position)
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    return {
      mayBeLess: !1,
      offset: 0,
      length: e.length,
      position: this.position,
      ...t
    };
  }
  abort() {
    return Promise.resolve();
  }
}
const hr = 256e3;
class xr extends ke {
  /**
   * Constructor
   * @param streamReader stream-reader to read from
   * @param options Tokenizer options
   */
  constructor(e, t) {
    super(t), this.streamReader = e, this.fileInfo = t?.fileInfo ?? {};
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Target Uint8Array to fill with data read from the tokenizer-stream
   * @param options - Read behaviour options
   * @returns Promise with number of bytes read
   */
  async readBuffer(e, t) {
    const i = this.normalizeOptions(e, t), n = i.position - this.position;
    if (n > 0)
      return await this.ignore(n), this.readBuffer(e, t);
    if (n < 0)
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    if (i.length === 0)
      return 0;
    const a = await this.streamReader.read(e.subarray(0, i.length), i.mayBeLess);
    if (this.position += a, (!t || !t.mayBeLess) && a < i.length)
      throw new _();
    return a;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise with number of bytes peeked
   */
  async peekBuffer(e, t) {
    const i = this.normalizeOptions(e, t);
    let n = 0;
    if (i.position) {
      const a = i.position - this.position;
      if (a > 0) {
        const d = new Uint8Array(i.length + a);
        return n = await this.peekBuffer(d, { mayBeLess: i.mayBeLess }), e.set(d.subarray(a)), n - a;
      }
      if (a < 0)
        throw new Error("Cannot peek from a negative offset in a stream");
    }
    if (i.length > 0) {
      try {
        n = await this.streamReader.peek(e.subarray(0, i.length), i.mayBeLess);
      } catch (a) {
        if (t?.mayBeLess && a instanceof _)
          return 0;
        throw a;
      }
      if (!i.mayBeLess && n < i.length)
        throw new _();
    }
    return n;
  }
  async ignore(e) {
    const t = Math.min(hr, e), i = new Uint8Array(t);
    let n = 0;
    for (; n < e; ) {
      const a = e - n, d = await this.readBuffer(i, { length: Math.min(t, a) });
      if (d < 0)
        return d;
      n += d;
    }
    return n;
  }
  abort() {
    return this.streamReader.abort();
  }
  async close() {
    return this.streamReader.close();
  }
  supportsRandomAccess() {
    return !1;
  }
}
class gr extends ke {
  /**
   * Construct BufferTokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(e, t) {
    super(t), this.uint8Array = e, this.fileInfo = { ...t?.fileInfo ?? {}, size: e.length };
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async readBuffer(e, t) {
    t?.position && (this.position = t.position);
    const i = await this.peekBuffer(e, t);
    return this.position += i, i;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async peekBuffer(e, t) {
    const i = this.normalizeOptions(e, t), n = Math.min(this.uint8Array.length - i.position, i.length);
    if (!i.mayBeLess && n < i.length)
      throw new _();
    return e.set(this.uint8Array.subarray(i.position, i.position + n)), n;
  }
  close() {
    return super.close();
  }
  supportsRandomAccess() {
    return !0;
  }
  setPosition(e) {
    this.position = e;
  }
}
class wr extends ke {
  /**
   * Construct BufferTokenizer
   * @param blob - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(e, t) {
    super(t), this.blob = e, this.fileInfo = { ...t?.fileInfo ?? {}, size: e.size, mimeType: e.type };
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async readBuffer(e, t) {
    t?.position && (this.position = t.position);
    const i = await this.peekBuffer(e, t);
    return this.position += i, i;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async peekBuffer(e, t) {
    const i = this.normalizeOptions(e, t), n = Math.min(this.blob.size - i.position, i.length);
    if (!i.mayBeLess && n < i.length)
      throw new _();
    const a = await this.blob.slice(i.position, i.position + n).arrayBuffer();
    return e.set(new Uint8Array(a)), n;
  }
  close() {
    return super.close();
  }
  supportsRandomAccess() {
    return !0;
  }
  setPosition(e) {
    this.position = e;
  }
}
function yr(r, e) {
  const t = fr(r), i = e ?? {}, n = i.onClose;
  return i.onClose = async () => {
    if (await t.close(), n)
      return n();
  }, new xr(t, i);
}
function ze(r, e) {
  return new gr(r, e);
}
function Tr(r, e) {
  return new wr(r, e);
}
class qe extends ke {
  /**
   * Create tokenizer from provided file path
   * @param sourceFilePath File path
   */
  static async fromFile(e) {
    const t = await nr(e, "r"), i = await t.stat();
    return new qe(t, { fileInfo: { path: e, size: i.size } });
  }
  constructor(e, t) {
    super(t), this.fileHandle = e, this.fileInfo = t.fileInfo;
  }
  /**
   * Read buffer from file
   * @param uint8Array - Uint8Array to write result to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  async readBuffer(e, t) {
    const i = this.normalizeOptions(e, t);
    if (this.position = i.position, i.length === 0)
      return 0;
    const n = await this.fileHandle.read(e, 0, i.length, i.position);
    if (this.position += n.bytesRead, n.bytesRead < i.length && (!t || !t.mayBeLess))
      throw new _();
    return n.bytesRead;
  }
  /**
   * Peek buffer from file
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  async peekBuffer(e, t) {
    const i = this.normalizeOptions(e, t), n = await this.fileHandle.read(e, 0, i.length, i.position);
    if (!i.mayBeLess && n.bytesRead < i.length)
      throw new _();
    return n.bytesRead;
  }
  async close() {
    return await this.fileHandle.close(), super.close();
  }
  setPosition(e) {
    this.position = e;
  }
  supportsRandomAccess() {
    return !0;
  }
}
const br = qe.fromFile;
function He(r) {
  return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
}
var ae = { exports: {} }, se = { exports: {} }, Ie, tt;
function vr() {
  if (tt) return Ie;
  tt = 1;
  var r = 1e3, e = r * 60, t = e * 60, i = t * 24, n = i * 7, a = i * 365.25;
  Ie = function(p, o) {
    o = o || {};
    var s = typeof p;
    if (s === "string" && p.length > 0)
      return d(p);
    if (s === "number" && isFinite(p))
      return o.long ? l(p) : m(p);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(p)
    );
  };
  function d(p) {
    if (p = String(p), !(p.length > 100)) {
      var o = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        p
      );
      if (o) {
        var s = parseFloat(o[1]), c = (o[2] || "ms").toLowerCase();
        switch (c) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return s * a;
          case "weeks":
          case "week":
          case "w":
            return s * n;
          case "days":
          case "day":
          case "d":
            return s * i;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return s * t;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return s * e;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return s * r;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return s;
          default:
            return;
        }
      }
    }
  }
  function m(p) {
    var o = Math.abs(p);
    return o >= i ? Math.round(p / i) + "d" : o >= t ? Math.round(p / t) + "h" : o >= e ? Math.round(p / e) + "m" : o >= r ? Math.round(p / r) + "s" : p + "ms";
  }
  function l(p) {
    var o = Math.abs(p);
    return o >= i ? x(p, o, i, "day") : o >= t ? x(p, o, t, "hour") : o >= e ? x(p, o, e, "minute") : o >= r ? x(p, o, r, "second") : p + " ms";
  }
  function x(p, o, s, c) {
    var u = o >= s * 1.5;
    return Math.round(p / s) + " " + c + (u ? "s" : "");
  }
  return Ie;
}
var Ee, rt;
function Mt() {
  if (rt) return Ee;
  rt = 1;
  function r(e) {
    i.debug = i, i.default = i, i.coerce = x, i.disable = m, i.enable = a, i.enabled = l, i.humanize = vr(), i.destroy = p, Object.keys(e).forEach((o) => {
      i[o] = e[o];
    }), i.names = [], i.skips = [], i.formatters = {};
    function t(o) {
      let s = 0;
      for (let c = 0; c < o.length; c++)
        s = (s << 5) - s + o.charCodeAt(c), s |= 0;
      return i.colors[Math.abs(s) % i.colors.length];
    }
    i.selectColor = t;
    function i(o) {
      let s, c = null, u, g;
      function h(...f) {
        if (!h.enabled)
          return;
        const y = h, S = Number(/* @__PURE__ */ new Date()), k = S - (s || S);
        y.diff = k, y.prev = s, y.curr = S, s = S, f[0] = i.coerce(f[0]), typeof f[0] != "string" && f.unshift("%O");
        let T = 0;
        f[0] = f[0].replace(/%([a-zA-Z%])/g, (X, er) => {
          if (X === "%%")
            return "%";
          T++;
          const Je = i.formatters[er];
          if (typeof Je == "function") {
            const tr = f[T];
            X = Je.call(y, tr), f.splice(T, 1), T--;
          }
          return X;
        }), i.formatArgs.call(y, f), (y.log || i.log).apply(y, f);
      }
      return h.namespace = o, h.useColors = i.useColors(), h.color = i.selectColor(o), h.extend = n, h.destroy = i.destroy, Object.defineProperty(h, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () => c !== null ? c : (u !== i.namespaces && (u = i.namespaces, g = i.enabled(o)), g),
        set: (f) => {
          c = f;
        }
      }), typeof i.init == "function" && i.init(h), h;
    }
    function n(o, s) {
      const c = i(this.namespace + (typeof s > "u" ? ":" : s) + o);
      return c.log = this.log, c;
    }
    function a(o) {
      i.save(o), i.namespaces = o, i.names = [], i.skips = [];
      const s = (typeof o == "string" ? o : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const c of s)
        c[0] === "-" ? i.skips.push(c.slice(1)) : i.names.push(c);
    }
    function d(o, s) {
      let c = 0, u = 0, g = -1, h = 0;
      for (; c < o.length; )
        if (u < s.length && (s[u] === o[c] || s[u] === "*"))
          s[u] === "*" ? (g = u, h = c, u++) : (c++, u++);
        else if (g !== -1)
          u = g + 1, h++, c = h;
        else
          return !1;
      for (; u < s.length && s[u] === "*"; )
        u++;
      return u === s.length;
    }
    function m() {
      const o = [
        ...i.names,
        ...i.skips.map((s) => "-" + s)
      ].join(",");
      return i.enable(""), o;
    }
    function l(o) {
      for (const s of i.skips)
        if (d(o, s))
          return !1;
      for (const s of i.names)
        if (d(o, s))
          return !0;
      return !1;
    }
    function x(o) {
      return o instanceof Error ? o.stack || o.message : o;
    }
    function p() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    return i.enable(i.load()), i;
  }
  return Ee = r, Ee;
}
var it;
function kr() {
  return it || (it = 1, (function(r, e) {
    e.formatArgs = i, e.save = n, e.load = a, e.useColors = t, e.storage = d(), e.destroy = /* @__PURE__ */ (() => {
      let l = !1;
      return () => {
        l || (l = !0, console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."));
      };
    })(), e.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function t() {
      if (typeof window < "u" && window.process && (window.process.type === "renderer" || window.process.__nwjs))
        return !0;
      if (typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/))
        return !1;
      let l;
      return typeof document < "u" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window < "u" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator < "u" && navigator.userAgent && (l = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(l[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function i(l) {
      if (l[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + l[0] + (this.useColors ? "%c " : " ") + "+" + r.exports.humanize(this.diff), !this.useColors)
        return;
      const x = "color: " + this.color;
      l.splice(1, 0, x, "color: inherit");
      let p = 0, o = 0;
      l[0].replace(/%[a-zA-Z%]/g, (s) => {
        s !== "%%" && (p++, s === "%c" && (o = p));
      }), l.splice(o, 0, x);
    }
    e.log = console.debug || console.log || (() => {
    });
    function n(l) {
      try {
        l ? e.storage.setItem("debug", l) : e.storage.removeItem("debug");
      } catch {
      }
    }
    function a() {
      let l;
      try {
        l = e.storage.getItem("debug") || e.storage.getItem("DEBUG");
      } catch {
      }
      return !l && typeof process < "u" && "env" in process && (l = process.env.DEBUG), l;
    }
    function d() {
      try {
        return localStorage;
      } catch {
      }
    }
    r.exports = Mt()(e);
    const { formatters: m } = r.exports;
    m.j = function(l) {
      try {
        return JSON.stringify(l);
      } catch (x) {
        return "[UnexpectedJSONParseError]: " + x.message;
      }
    };
  })(se, se.exports)), se.exports;
}
var oe = { exports: {} }, Ae, nt;
function Sr() {
  return nt || (nt = 1, Ae = (r, e = process.argv) => {
    const t = r.startsWith("-") ? "" : r.length === 1 ? "-" : "--", i = e.indexOf(t + r), n = e.indexOf("--");
    return i !== -1 && (n === -1 || i < n);
  }), Ae;
}
var Re, at;
function Cr() {
  if (at) return Re;
  at = 1;
  const r = Et, e = Ct, t = Sr(), { env: i } = process;
  let n;
  t("no-color") || t("no-colors") || t("color=false") || t("color=never") ? n = 0 : (t("color") || t("colors") || t("color=true") || t("color=always")) && (n = 1), "FORCE_COLOR" in i && (i.FORCE_COLOR === "true" ? n = 1 : i.FORCE_COLOR === "false" ? n = 0 : n = i.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(i.FORCE_COLOR, 10), 3));
  function a(l) {
    return l === 0 ? !1 : {
      level: l,
      hasBasic: !0,
      has256: l >= 2,
      has16m: l >= 3
    };
  }
  function d(l, x) {
    if (n === 0)
      return 0;
    if (t("color=16m") || t("color=full") || t("color=truecolor"))
      return 3;
    if (t("color=256"))
      return 2;
    if (l && !x && n === void 0)
      return 0;
    const p = n || 0;
    if (i.TERM === "dumb")
      return p;
    if (process.platform === "win32") {
      const o = r.release().split(".");
      return Number(o[0]) >= 10 && Number(o[2]) >= 10586 ? Number(o[2]) >= 14931 ? 3 : 2 : 1;
    }
    if ("CI" in i)
      return ["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((o) => o in i) || i.CI_NAME === "codeship" ? 1 : p;
    if ("TEAMCITY_VERSION" in i)
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(i.TEAMCITY_VERSION) ? 1 : 0;
    if (i.COLORTERM === "truecolor")
      return 3;
    if ("TERM_PROGRAM" in i) {
      const o = parseInt((i.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (i.TERM_PROGRAM) {
        case "iTerm.app":
          return o >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    return /-256(color)?$/i.test(i.TERM) ? 2 : /^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(i.TERM) || "COLORTERM" in i ? 1 : p;
  }
  function m(l) {
    const x = d(l, l && l.isTTY);
    return a(x);
  }
  return Re = {
    supportsColor: m,
    stdout: a(d(!0, e.isatty(1))),
    stderr: a(d(!0, e.isatty(2)))
  }, Re;
}
var st;
function Ir() {
  return st || (st = 1, (function(r, e) {
    const t = Ct, i = ar;
    e.init = p, e.log = m, e.formatArgs = a, e.save = l, e.load = x, e.useColors = n, e.destroy = i.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    ), e.colors = [6, 2, 3, 4, 5, 1];
    try {
      const s = Cr();
      s && (s.stderr || s).level >= 2 && (e.colors = [
        20,
        21,
        26,
        27,
        32,
        33,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        56,
        57,
        62,
        63,
        68,
        69,
        74,
        75,
        76,
        77,
        78,
        79,
        80,
        81,
        92,
        93,
        98,
        99,
        112,
        113,
        128,
        129,
        134,
        135,
        148,
        149,
        160,
        161,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        171,
        172,
        173,
        178,
        179,
        184,
        185,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        203,
        204,
        205,
        206,
        207,
        208,
        209,
        214,
        215,
        220,
        221
      ]);
    } catch {
    }
    e.inspectOpts = Object.keys(process.env).filter((s) => /^debug_/i.test(s)).reduce((s, c) => {
      const u = c.substring(6).toLowerCase().replace(/_([a-z])/g, (h, f) => f.toUpperCase());
      let g = process.env[c];
      return /^(yes|on|true|enabled)$/i.test(g) ? g = !0 : /^(no|off|false|disabled)$/i.test(g) ? g = !1 : g === "null" ? g = null : g = Number(g), s[u] = g, s;
    }, {});
    function n() {
      return "colors" in e.inspectOpts ? !!e.inspectOpts.colors : t.isatty(process.stderr.fd);
    }
    function a(s) {
      const { namespace: c, useColors: u } = this;
      if (u) {
        const g = this.color, h = "\x1B[3" + (g < 8 ? g : "8;5;" + g), f = `  ${h};1m${c} \x1B[0m`;
        s[0] = f + s[0].split(`
`).join(`
` + f), s.push(h + "m+" + r.exports.humanize(this.diff) + "\x1B[0m");
      } else
        s[0] = d() + c + " " + s[0];
    }
    function d() {
      return e.inspectOpts.hideDate ? "" : (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function m(...s) {
      return process.stderr.write(i.formatWithOptions(e.inspectOpts, ...s) + `
`);
    }
    function l(s) {
      s ? process.env.DEBUG = s : delete process.env.DEBUG;
    }
    function x() {
      return process.env.DEBUG;
    }
    function p(s) {
      s.inspectOpts = {};
      const c = Object.keys(e.inspectOpts);
      for (let u = 0; u < c.length; u++)
        s.inspectOpts[c[u]] = e.inspectOpts[c[u]];
    }
    r.exports = Mt()(e);
    const { formatters: o } = r.exports;
    o.o = function(s) {
      return this.inspectOpts.colors = this.useColors, i.inspect(s, this.inspectOpts).split(`
`).map((c) => c.trim()).join(" ");
    }, o.O = function(s) {
      return this.inspectOpts.colors = this.useColors, i.inspect(s, this.inspectOpts);
    };
  })(oe, oe.exports)), oe.exports;
}
var ot;
function Er() {
  return ot || (ot = 1, typeof process > "u" || process.type === "renderer" || process.browser === !0 || process.__nwjs ? ae.exports = kr() : ae.exports = Ir()), ae.exports;
}
var Ar = Er();
const Q = /* @__PURE__ */ He(Ar);
var ce = {};
var ct;
function Rr() {
  return ct || (ct = 1, ce.read = function(r, e, t, i, n) {
    var a, d, m = n * 8 - i - 1, l = (1 << m) - 1, x = l >> 1, p = -7, o = t ? n - 1 : 0, s = t ? -1 : 1, c = r[e + o];
    for (o += s, a = c & (1 << -p) - 1, c >>= -p, p += m; p > 0; a = a * 256 + r[e + o], o += s, p -= 8)
      ;
    for (d = a & (1 << -p) - 1, a >>= -p, p += i; p > 0; d = d * 256 + r[e + o], o += s, p -= 8)
      ;
    if (a === 0)
      a = 1 - x;
    else {
      if (a === l)
        return d ? NaN : (c ? -1 : 1) * (1 / 0);
      d = d + Math.pow(2, i), a = a - x;
    }
    return (c ? -1 : 1) * d * Math.pow(2, a - i);
  }, ce.write = function(r, e, t, i, n, a) {
    var d, m, l, x = a * 8 - n - 1, p = (1 << x) - 1, o = p >> 1, s = n === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, c = i ? 0 : a - 1, u = i ? 1 : -1, g = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
    for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (m = isNaN(e) ? 1 : 0, d = p) : (d = Math.floor(Math.log(e) / Math.LN2), e * (l = Math.pow(2, -d)) < 1 && (d--, l *= 2), d + o >= 1 ? e += s / l : e += s * Math.pow(2, 1 - o), e * l >= 2 && (d++, l /= 2), d + o >= p ? (m = 0, d = p) : d + o >= 1 ? (m = (e * l - 1) * Math.pow(2, n), d = d + o) : (m = e * Math.pow(2, o - 1) * Math.pow(2, n), d = 0)); n >= 8; r[t + c] = m & 255, c += u, m /= 256, n -= 8)
      ;
    for (d = d << n | m, x += n; x > 0; r[t + c] = d & 255, c += u, d /= 256, x -= 8)
      ;
    r[t + c - u] |= g * 128;
  }), ce;
}
var j = Rr();
const Le = {
  128: "€",
  130: "‚",
  131: "ƒ",
  132: "„",
  133: "…",
  134: "†",
  135: "‡",
  136: "ˆ",
  137: "‰",
  138: "Š",
  139: "‹",
  140: "Œ",
  142: "Ž",
  145: "‘",
  146: "’",
  147: "“",
  148: "”",
  149: "•",
  150: "–",
  151: "—",
  152: "˜",
  153: "™",
  154: "š",
  155: "›",
  156: "œ",
  158: "ž",
  159: "Ÿ"
};
for (const [r, e] of Object.entries(Le))
  ;
function _r(r, e = "utf-8") {
  switch (e.toLowerCase()) {
    case "utf-8":
    case "utf8":
      return typeof globalThis.TextDecoder < "u" ? new globalThis.TextDecoder("utf-8").decode(r) : Fr(r);
    case "utf-16le":
      return Mr(r);
    case "ascii":
      return Dr(r);
    case "latin1":
    case "iso-8859-1":
      return Pr(r);
    case "windows-1252":
      return Br(r);
    default:
      throw new RangeError(`Encoding '${e}' not supported`);
  }
}
function Fr(r) {
  let e = "", t = 0;
  for (; t < r.length; ) {
    const i = r[t++];
    if (i < 128)
      e += String.fromCharCode(i);
    else if (i < 224) {
      const n = r[t++] & 63;
      e += String.fromCharCode((i & 31) << 6 | n);
    } else if (i < 240) {
      const n = r[t++] & 63, a = r[t++] & 63;
      e += String.fromCharCode((i & 15) << 12 | n << 6 | a);
    } else {
      const n = r[t++] & 63, a = r[t++] & 63, d = r[t++] & 63;
      let m = (i & 7) << 18 | n << 12 | a << 6 | d;
      m -= 65536, e += String.fromCharCode(55296 + (m >> 10 & 1023), 56320 + (m & 1023));
    }
  }
  return e;
}
function Mr(r) {
  let e = "";
  for (let t = 0; t < r.length; t += 2)
    e += String.fromCharCode(r[t] | r[t + 1] << 8);
  return e;
}
function Dr(r) {
  return String.fromCharCode(...r.map((e) => e & 127));
}
function Pr(r) {
  return String.fromCharCode(...r);
}
function Br(r) {
  let e = "";
  for (const t of r)
    t >= 128 && t <= 159 && Le[t] ? e += Le[t] : e += String.fromCharCode(t);
  return e;
}
function b(r) {
  return new DataView(r.buffer, r.byteOffset);
}
const Y = {
  len: 1,
  get(r, e) {
    return b(r).getUint8(e);
  },
  put(r, e, t) {
    return b(r).setUint8(e, t), e + 1;
  }
}, C = {
  len: 2,
  get(r, e) {
    return b(r).getUint16(e, !0);
  },
  put(r, e, t) {
    return b(r).setUint16(e, t, !0), e + 2;
  }
}, V = {
  len: 2,
  get(r, e) {
    return b(r).getUint16(e);
  },
  put(r, e, t) {
    return b(r).setUint16(e, t), e + 2;
  }
}, Dt = {
  len: 3,
  get(r, e) {
    const t = b(r);
    return t.getUint8(e) + (t.getUint16(e + 1, !0) << 8);
  },
  put(r, e, t) {
    const i = b(r);
    return i.setUint8(e, t & 255), i.setUint16(e + 1, t >> 8, !0), e + 3;
  }
}, Pt = {
  len: 3,
  get(r, e) {
    const t = b(r);
    return (t.getUint16(e) << 8) + t.getUint8(e + 2);
  },
  put(r, e, t) {
    const i = b(r);
    return i.setUint16(e, t >> 8), i.setUint8(e + 2, t & 255), e + 3;
  }
}, v = {
  len: 4,
  get(r, e) {
    return b(r).getUint32(e, !0);
  },
  put(r, e, t) {
    return b(r).setUint32(e, t, !0), e + 4;
  }
}, ye = {
  len: 4,
  get(r, e) {
    return b(r).getUint32(e);
  },
  put(r, e, t) {
    return b(r).setUint32(e, t), e + 4;
  }
}, Ne = {
  len: 1,
  get(r, e) {
    return b(r).getInt8(e);
  },
  put(r, e, t) {
    return b(r).setInt8(e, t), e + 1;
  }
}, Or = {
  len: 2,
  get(r, e) {
    return b(r).getInt16(e);
  },
  put(r, e, t) {
    return b(r).setInt16(e, t), e + 2;
  }
}, zr = {
  len: 2,
  get(r, e) {
    return b(r).getInt16(e, !0);
  },
  put(r, e, t) {
    return b(r).setInt16(e, t, !0), e + 2;
  }
}, Lr = {
  len: 3,
  get(r, e) {
    const t = Dt.get(r, e);
    return t > 8388607 ? t - 16777216 : t;
  },
  put(r, e, t) {
    const i = b(r);
    return i.setUint8(e, t & 255), i.setUint16(e + 1, t >> 8, !0), e + 3;
  }
}, Nr = {
  len: 3,
  get(r, e) {
    const t = Pt.get(r, e);
    return t > 8388607 ? t - 16777216 : t;
  },
  put(r, e, t) {
    const i = b(r);
    return i.setUint16(e, t >> 8), i.setUint8(e + 2, t & 255), e + 3;
  }
}, Bt = {
  len: 4,
  get(r, e) {
    return b(r).getInt32(e);
  },
  put(r, e, t) {
    return b(r).setInt32(e, t), e + 4;
  }
}, Ur = {
  len: 4,
  get(r, e) {
    return b(r).getInt32(e, !0);
  },
  put(r, e, t) {
    return b(r).setInt32(e, t, !0), e + 4;
  }
}, Ot = {
  len: 8,
  get(r, e) {
    return b(r).getBigUint64(e, !0);
  },
  put(r, e, t) {
    return b(r).setBigUint64(e, t, !0), e + 8;
  }
}, Xr = {
  len: 8,
  get(r, e) {
    return b(r).getBigInt64(e, !0);
  },
  put(r, e, t) {
    return b(r).setBigInt64(e, t, !0), e + 8;
  }
}, Gr = {
  len: 8,
  get(r, e) {
    return b(r).getBigUint64(e);
  },
  put(r, e, t) {
    return b(r).setBigUint64(e, t), e + 8;
  }
}, Wr = {
  len: 8,
  get(r, e) {
    return b(r).getBigInt64(e);
  },
  put(r, e, t) {
    return b(r).setBigInt64(e, t), e + 8;
  }
}, $r = {
  len: 2,
  get(r, e) {
    return j.read(r, e, !1, 10, this.len);
  },
  put(r, e, t) {
    return j.write(r, t, e, !1, 10, this.len), e + this.len;
  }
}, jr = {
  len: 2,
  get(r, e) {
    return j.read(r, e, !0, 10, this.len);
  },
  put(r, e, t) {
    return j.write(r, t, e, !0, 10, this.len), e + this.len;
  }
}, qr = {
  len: 4,
  get(r, e) {
    return b(r).getFloat32(e);
  },
  put(r, e, t) {
    return b(r).setFloat32(e, t), e + 4;
  }
}, Hr = {
  len: 4,
  get(r, e) {
    return b(r).getFloat32(e, !0);
  },
  put(r, e, t) {
    return b(r).setFloat32(e, t, !0), e + 4;
  }
}, Vr = {
  len: 8,
  get(r, e) {
    return b(r).getFloat64(e);
  },
  put(r, e, t) {
    return b(r).setFloat64(e, t), e + 8;
  }
}, Yr = {
  len: 8,
  get(r, e) {
    return b(r).getFloat64(e, !0);
  },
  put(r, e, t) {
    return b(r).setFloat64(e, t, !0), e + 8;
  }
}, Zr = {
  len: 10,
  get(r, e) {
    return j.read(r, e, !1, 63, this.len);
  },
  put(r, e, t) {
    return j.write(r, t, e, !1, 63, this.len), e + this.len;
  }
}, Kr = {
  len: 10,
  get(r, e) {
    return j.read(r, e, !0, 63, this.len);
  },
  put(r, e, t) {
    return j.write(r, t, e, !0, 63, this.len), e + this.len;
  }
};
class Jr {
  /**
   * @param len number of bytes to ignore
   */
  constructor(e) {
    this.len = e;
  }
  // ToDo: don't read, but skip data
  get(e, t) {
  }
}
class zt {
  constructor(e) {
    this.len = e;
  }
  get(e, t) {
    return e.subarray(t, t + this.len);
  }
}
class E {
  constructor(e, t) {
    this.len = e, this.encoding = t;
  }
  get(e, t = 0) {
    const i = e.subarray(t, t + this.len);
    return _r(i, this.encoding);
  }
}
class Qr extends E {
  constructor(e) {
    super(e, "windows-1252");
  }
}
const Ma = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AnsiStringType: Qr,
  Float16_BE: $r,
  Float16_LE: jr,
  Float32_BE: qr,
  Float32_LE: Hr,
  Float64_BE: Vr,
  Float64_LE: Yr,
  Float80_BE: Zr,
  Float80_LE: Kr,
  INT16_BE: Or,
  INT16_LE: zr,
  INT24_BE: Nr,
  INT24_LE: Lr,
  INT32_BE: Bt,
  INT32_LE: Ur,
  INT64_BE: Wr,
  INT64_LE: Xr,
  INT8: Ne,
  IgnoreType: Jr,
  StringType: E,
  UINT16_BE: V,
  UINT16_LE: C,
  UINT24_BE: Pt,
  UINT24_LE: Dt,
  UINT32_BE: ye,
  UINT32_LE: v,
  UINT64_BE: Gr,
  UINT64_LE: Ot,
  UINT8: Y,
  Uint8ArrayType: zt
}, Symbol.toStringTag, { value: "Module" })), K = {
  LocalFileHeader: 67324752,
  DataDescriptor: 134695760,
  CentralFileHeader: 33639248,
  EndOfCentralDirectory: 101010256
}, lt = {
  get(r) {
    return {
      signature: v.get(r, 0),
      compressedSize: v.get(r, 8),
      uncompressedSize: v.get(r, 12)
    };
  },
  len: 16
}, ei = {
  get(r) {
    const e = C.get(r, 6);
    return {
      signature: v.get(r, 0),
      minVersion: C.get(r, 4),
      dataDescriptor: !!(e & 8),
      compressedMethod: C.get(r, 8),
      compressedSize: v.get(r, 18),
      uncompressedSize: v.get(r, 22),
      filenameLength: C.get(r, 26),
      extraFieldLength: C.get(r, 28),
      filename: null
    };
  },
  len: 30
}, ti = {
  get(r) {
    return {
      signature: v.get(r, 0),
      nrOfThisDisk: C.get(r, 4),
      nrOfThisDiskWithTheStart: C.get(r, 6),
      nrOfEntriesOnThisDisk: C.get(r, 8),
      nrOfEntriesOfSize: C.get(r, 10),
      sizeOfCd: v.get(r, 12),
      offsetOfStartOfCd: v.get(r, 16),
      zipFileCommentLength: C.get(r, 20)
    };
  },
  len: 22
}, ri = {
  get(r) {
    const e = C.get(r, 8);
    return {
      signature: v.get(r, 0),
      minVersion: C.get(r, 6),
      dataDescriptor: !!(e & 8),
      compressedMethod: C.get(r, 10),
      compressedSize: v.get(r, 20),
      uncompressedSize: v.get(r, 24),
      filenameLength: C.get(r, 28),
      extraFieldLength: C.get(r, 30),
      fileCommentLength: C.get(r, 32),
      relativeOffsetOfLocalHeader: v.get(r, 42),
      filename: null
    };
  },
  len: 46
};
function Lt(r) {
  const e = new Uint8Array(v.len);
  return v.put(e, 0, r), e;
}
const L = Q("tokenizer:inflate"), _e = 256 * 1024, ii = Lt(K.DataDescriptor), le = Lt(K.EndOfCentralDirectory);
class Ve {
  constructor(e) {
    this.tokenizer = e, this.syncBuffer = new Uint8Array(_e);
  }
  async isZip() {
    return await this.peekSignature() === K.LocalFileHeader;
  }
  peekSignature() {
    return this.tokenizer.peekToken(v);
  }
  async findEndOfCentralDirectoryLocator() {
    const e = this.tokenizer, t = Math.min(16 * 1024, e.fileInfo.size), i = this.syncBuffer.subarray(0, t);
    await this.tokenizer.readBuffer(i, { position: e.fileInfo.size - t });
    for (let n = i.length - 4; n >= 0; n--)
      if (i[n] === le[0] && i[n + 1] === le[1] && i[n + 2] === le[2] && i[n + 3] === le[3])
        return e.fileInfo.size - t + n;
    return -1;
  }
  async readCentralDirectory() {
    if (!this.tokenizer.supportsRandomAccess()) {
      L("Cannot reading central-directory without random-read support");
      return;
    }
    L("Reading central-directory...");
    const e = this.tokenizer.position, t = await this.findEndOfCentralDirectoryLocator();
    if (t > 0) {
      L("Central-directory 32-bit signature found");
      const i = await this.tokenizer.readToken(ti, t), n = [];
      this.tokenizer.setPosition(i.offsetOfStartOfCd);
      for (let a = 0; a < i.nrOfEntriesOfSize; ++a) {
        const d = await this.tokenizer.readToken(ri);
        if (d.signature !== K.CentralFileHeader)
          throw new Error("Expected Central-File-Header signature");
        d.filename = await this.tokenizer.readToken(new E(d.filenameLength, "utf-8")), await this.tokenizer.ignore(d.extraFieldLength), await this.tokenizer.ignore(d.fileCommentLength), n.push(d), L(`Add central-directory file-entry: n=${a + 1}/${n.length}: filename=${n[a].filename}`);
      }
      return this.tokenizer.setPosition(e), n;
    }
    this.tokenizer.setPosition(e);
  }
  async unzip(e) {
    const t = await this.readCentralDirectory();
    if (t)
      return this.iterateOverCentralDirectory(t, e);
    let i = !1;
    do {
      const n = await this.readLocalFileHeader();
      if (!n)
        break;
      const a = e(n);
      i = !!a.stop;
      let d;
      if (await this.tokenizer.ignore(n.extraFieldLength), n.dataDescriptor && n.compressedSize === 0) {
        const m = [];
        let l = _e;
        L("Compressed-file-size unknown, scanning for next data-descriptor-signature....");
        let x = -1;
        for (; x < 0 && l === _e; ) {
          l = await this.tokenizer.peekBuffer(this.syncBuffer, { mayBeLess: !0 }), x = ni(this.syncBuffer.subarray(0, l), ii);
          const p = x >= 0 ? x : l;
          if (a.handler) {
            const o = new Uint8Array(p);
            await this.tokenizer.readBuffer(o), m.push(o);
          } else
            await this.tokenizer.ignore(p);
        }
        L(`Found data-descriptor-signature at pos=${this.tokenizer.position}`), a.handler && await this.inflate(n, ai(m), a.handler);
      } else
        a.handler ? (L(`Reading compressed-file-data: ${n.compressedSize} bytes`), d = new Uint8Array(n.compressedSize), await this.tokenizer.readBuffer(d), await this.inflate(n, d, a.handler)) : (L(`Ignoring compressed-file-data: ${n.compressedSize} bytes`), await this.tokenizer.ignore(n.compressedSize));
      if (L(`Reading data-descriptor at pos=${this.tokenizer.position}`), n.dataDescriptor && (await this.tokenizer.readToken(lt)).signature !== 134695760)
        throw new Error(`Expected data-descriptor-signature at position ${this.tokenizer.position - lt.len}`);
    } while (!i);
  }
  async iterateOverCentralDirectory(e, t) {
    for (const i of e) {
      const n = t(i);
      if (n.handler) {
        this.tokenizer.setPosition(i.relativeOffsetOfLocalHeader);
        const a = await this.readLocalFileHeader();
        if (a) {
          await this.tokenizer.ignore(a.extraFieldLength);
          const d = new Uint8Array(i.compressedSize);
          await this.tokenizer.readBuffer(d), await this.inflate(a, d, n.handler);
        }
      }
      if (n.stop)
        break;
    }
  }
  async inflate(e, t, i) {
    if (e.compressedMethod === 0)
      return i(t);
    if (e.compressedMethod !== 8)
      throw new Error(`Unsupported ZIP compression method: ${e.compressedMethod}`);
    L(`Decompress filename=${e.filename}, compressed-size=${t.length}`);
    const n = await Ve.decompressDeflateRaw(t);
    return i(n);
  }
  static async decompressDeflateRaw(e) {
    const t = new ReadableStream({
      start(a) {
        a.enqueue(e), a.close();
      }
    }), i = new DecompressionStream("deflate-raw"), n = t.pipeThrough(i);
    try {
      const d = await new Response(n).arrayBuffer();
      return new Uint8Array(d);
    } catch (a) {
      const d = a instanceof Error ? `Failed to deflate ZIP entry: ${a.message}` : "Unknown decompression error in ZIP entry";
      throw new TypeError(d);
    }
  }
  async readLocalFileHeader() {
    const e = await this.tokenizer.peekToken(v);
    if (e === K.LocalFileHeader) {
      const t = await this.tokenizer.readToken(ei);
      return t.filename = await this.tokenizer.readToken(new E(t.filenameLength, "utf-8")), t;
    }
    if (e === K.CentralFileHeader)
      return !1;
    throw e === 3759263696 ? new Error("Encrypted ZIP") : new Error("Unexpected signature");
  }
}
function ni(r, e) {
  const t = r.length, i = e.length;
  if (i > t)
    return -1;
  for (let n = 0; n <= t - i; n++) {
    let a = !0;
    for (let d = 0; d < i; d++)
      if (r[n + d] !== e[d]) {
        a = !1;
        break;
      }
    if (a)
      return n;
  }
  return -1;
}
function ai(r) {
  const e = r.reduce((n, a) => n + a.length, 0), t = new Uint8Array(e);
  let i = 0;
  for (const n of r)
    t.set(n, i), i += n.length;
  return t;
}
class si {
  constructor(e) {
    this.tokenizer = e;
  }
  inflate() {
    const e = this.tokenizer;
    return new ReadableStream({
      async pull(t) {
        const i = new Uint8Array(1024), n = await e.readBuffer(i, { mayBeLess: !0 });
        if (n === 0) {
          t.close();
          return;
        }
        t.enqueue(i.subarray(0, n));
      }
    }).pipeThrough(new DecompressionStream("gzip"));
  }
}
const oi = Object.prototype.toString, ci = "[object Uint8Array]";
function li(r, e, t) {
  return r ? r.constructor === e ? !0 : oi.call(r) === t : !1;
}
function ui(r) {
  return li(r, Uint8Array, ci);
}
function di(r) {
  if (!ui(r))
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof r}\``);
}
new globalThis.TextDecoder("utf8");
function pi(r) {
  if (typeof r != "string")
    throw new TypeError(`Expected \`string\`, got \`${typeof r}\``);
}
new globalThis.TextEncoder();
const mi = Array.from({ length: 256 }, (r, e) => e.toString(16).padStart(2, "0"));
function Da(r) {
  di(r);
  let e = "";
  for (let t = 0; t < r.length; t++)
    e += mi[r[t]];
  return e;
}
const ut = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15
};
function Pa(r) {
  if (pi(r), r.length % 2 !== 0)
    throw new Error("Invalid Hex string length.");
  const e = r.length / 2, t = new Uint8Array(e);
  for (let i = 0; i < e; i++) {
    const n = ut[r[i * 2]], a = ut[r[i * 2 + 1]];
    if (n === void 0 || a === void 0)
      throw new Error(`Invalid Hex character encountered at position ${i * 2}`);
    t[i] = n << 4 | a;
  }
  return t;
}
function Ue(r) {
  const { byteLength: e } = r;
  if (e === 6)
    return r.getUint16(0) * 2 ** 32 + r.getUint32(2);
  if (e === 5)
    return r.getUint8(0) * 2 ** 32 + r.getUint32(1);
  if (e === 4)
    return r.getUint32(0);
  if (e === 3)
    return r.getUint8(0) * 2 ** 16 + r.getUint16(1);
  if (e === 2)
    return r.getUint16(0);
  if (e === 1)
    return r.getUint8(0);
}
function fi(r, e) {
  if (e === "utf-16le") {
    const t = [];
    for (let i = 0; i < r.length; i++) {
      const n = r.charCodeAt(i);
      t.push(n & 255, n >> 8 & 255);
    }
    return t;
  }
  if (e === "utf-16be") {
    const t = [];
    for (let i = 0; i < r.length; i++) {
      const n = r.charCodeAt(i);
      t.push(n >> 8 & 255, n & 255);
    }
    return t;
  }
  return [...r].map((t) => t.charCodeAt(0));
}
function hi(r, e = 0) {
  const t = Number.parseInt(new E(6).get(r, 148).replace(/\0.*$/, "").trim(), 8);
  if (Number.isNaN(t))
    return !1;
  let i = 256;
  for (let n = e; n < e + 148; n++)
    i += r[n];
  for (let n = e + 156; n < e + 512; n++)
    i += r[n];
  return t === i;
}
const xi = {
  get: (r, e) => r[e + 3] & 127 | r[e + 2] << 7 | r[e + 1] << 14 | r[e] << 21,
  len: 4
}, gi = [
  "jpg",
  "png",
  "apng",
  "gif",
  "webp",
  "flif",
  "xcf",
  "cr2",
  "cr3",
  "orf",
  "arw",
  "dng",
  "nef",
  "rw2",
  "raf",
  "tif",
  "bmp",
  "icns",
  "jxr",
  "psd",
  "indd",
  "zip",
  "tar",
  "rar",
  "gz",
  "bz2",
  "7z",
  "dmg",
  "mp4",
  "mid",
  "mkv",
  "webm",
  "mov",
  "avi",
  "mpg",
  "mp2",
  "mp3",
  "m4a",
  "oga",
  "ogg",
  "ogv",
  "opus",
  "flac",
  "wav",
  "spx",
  "amr",
  "pdf",
  "epub",
  "elf",
  "macho",
  "exe",
  "swf",
  "rtf",
  "wasm",
  "woff",
  "woff2",
  "eot",
  "ttf",
  "otf",
  "ttc",
  "ico",
  "flv",
  "ps",
  "xz",
  "sqlite",
  "nes",
  "crx",
  "xpi",
  "cab",
  "deb",
  "ar",
  "rpm",
  "Z",
  "lz",
  "cfb",
  "mxf",
  "mts",
  "blend",
  "bpg",
  "docx",
  "pptx",
  "xlsx",
  "3gp",
  "3g2",
  "j2c",
  "jp2",
  "jpm",
  "jpx",
  "mj2",
  "aif",
  "qcp",
  "odt",
  "ods",
  "odp",
  "xml",
  "mobi",
  "heic",
  "cur",
  "ktx",
  "ape",
  "wv",
  "dcm",
  "ics",
  "glb",
  "pcap",
  "dsf",
  "lnk",
  "alias",
  "voc",
  "ac3",
  "m4v",
  "m4p",
  "m4b",
  "f4v",
  "f4p",
  "f4b",
  "f4a",
  "mie",
  "asf",
  "ogm",
  "ogx",
  "mpc",
  "arrow",
  "shp",
  "aac",
  "mp1",
  "it",
  "s3m",
  "xm",
  "skp",
  "avif",
  "eps",
  "lzh",
  "pgp",
  "asar",
  "stl",
  "chm",
  "3mf",
  "zst",
  "jxl",
  "vcf",
  "jls",
  "pst",
  "dwg",
  "parquet",
  "class",
  "arj",
  "cpio",
  "ace",
  "avro",
  "icc",
  "fbx",
  "vsdx",
  "vtt",
  "apk",
  "drc",
  "lz4",
  "potx",
  "xltx",
  "dotx",
  "xltm",
  "ott",
  "ots",
  "otp",
  "odg",
  "otg",
  "xlsm",
  "docm",
  "dotm",
  "potm",
  "pptm",
  "jar",
  "rm",
  "ppsm",
  "ppsx",
  "tar.gz",
  "reg",
  "dat"
], wi = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/flif",
  "image/x-xcf",
  "image/x-canon-cr2",
  "image/x-canon-cr3",
  "image/tiff",
  "image/bmp",
  "image/vnd.ms-photo",
  "image/vnd.adobe.photoshop",
  "application/x-indesign",
  "application/epub+zip",
  "application/x-xpinstall",
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/zip",
  "application/x-tar",
  "application/x-rar-compressed",
  "application/gzip",
  "application/x-bzip2",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/vnd.apache.arrow.file",
  "video/mp4",
  "audio/midi",
  "video/matroska",
  "video/webm",
  "video/quicktime",
  "video/vnd.avi",
  "audio/wav",
  "audio/qcelp",
  "audio/x-ms-asf",
  "video/x-ms-asf",
  "application/vnd.ms-asf",
  "video/mpeg",
  "video/3gpp",
  "audio/mpeg",
  "audio/mp4",
  // RFC 4337
  "video/ogg",
  "audio/ogg",
  "audio/ogg; codecs=opus",
  "application/ogg",
  "audio/flac",
  "audio/ape",
  "audio/wavpack",
  "audio/amr",
  "application/pdf",
  "application/x-elf",
  "application/x-mach-binary",
  "application/x-msdownload",
  "application/x-shockwave-flash",
  "application/rtf",
  "application/wasm",
  "font/woff",
  "font/woff2",
  "application/vnd.ms-fontobject",
  "font/ttf",
  "font/otf",
  "font/collection",
  "image/x-icon",
  "video/x-flv",
  "application/postscript",
  "application/eps",
  "application/x-xz",
  "application/x-sqlite3",
  "application/x-nintendo-nes-rom",
  "application/x-google-chrome-extension",
  "application/vnd.ms-cab-compressed",
  "application/x-deb",
  "application/x-unix-archive",
  "application/x-rpm",
  "application/x-compress",
  "application/x-lzip",
  "application/x-cfb",
  "application/x-mie",
  "application/mxf",
  "video/mp2t",
  "application/x-blender",
  "image/bpg",
  "image/j2c",
  "image/jp2",
  "image/jpx",
  "image/jpm",
  "image/mj2",
  "audio/aiff",
  "application/xml",
  "application/x-mobipocket-ebook",
  "image/heif",
  "image/heif-sequence",
  "image/heic",
  "image/heic-sequence",
  "image/icns",
  "image/ktx",
  "application/dicom",
  "audio/x-musepack",
  "text/calendar",
  "text/vcard",
  "text/vtt",
  "model/gltf-binary",
  "application/vnd.tcpdump.pcap",
  "audio/x-dsf",
  // Non-standard
  "application/x.ms.shortcut",
  // Invented by us
  "application/x.apple.alias",
  // Invented by us
  "audio/x-voc",
  "audio/vnd.dolby.dd-raw",
  "audio/x-m4a",
  "image/apng",
  "image/x-olympus-orf",
  "image/x-sony-arw",
  "image/x-adobe-dng",
  "image/x-nikon-nef",
  "image/x-panasonic-rw2",
  "image/x-fujifilm-raf",
  "video/x-m4v",
  "video/3gpp2",
  "application/x-esri-shape",
  "audio/aac",
  "audio/x-it",
  "audio/x-s3m",
  "audio/x-xm",
  "video/MP1S",
  "video/MP2P",
  "application/vnd.sketchup.skp",
  "image/avif",
  "application/x-lzh-compressed",
  "application/pgp-encrypted",
  "application/x-asar",
  "model/stl",
  "application/vnd.ms-htmlhelp",
  "model/3mf",
  "image/jxl",
  "application/zstd",
  "image/jls",
  "application/vnd.ms-outlook",
  "image/vnd.dwg",
  "application/vnd.apache.parquet",
  "application/java-vm",
  "application/x-arj",
  "application/x-cpio",
  "application/x-ace-compressed",
  "application/avro",
  "application/vnd.iccprofile",
  "application/x.autodesk.fbx",
  // Invented by us
  "application/vnd.visio",
  "application/vnd.android.package-archive",
  "application/vnd.google.draco",
  // Invented by us
  "application/x-lz4",
  // Invented by us
  "application/vnd.openxmlformats-officedocument.presentationml.template",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  "application/vnd.ms-excel.template.macroenabled.12",
  "application/vnd.oasis.opendocument.text-template",
  "application/vnd.oasis.opendocument.spreadsheet-template",
  "application/vnd.oasis.opendocument.presentation-template",
  "application/vnd.oasis.opendocument.graphics",
  "application/vnd.oasis.opendocument.graphics-template",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.ms-word.document.macroenabled.12",
  "application/vnd.ms-word.template.macroenabled.12",
  "application/vnd.ms-powerpoint.template.macroenabled.12",
  "application/vnd.ms-powerpoint.presentation.macroenabled.12",
  "application/java-archive",
  "application/vnd.rn-realmedia",
  "application/x-ms-regedit",
  "application/x-ft-windows-registry-hive"
], Fe = 4100;
async function Nt(r, e) {
  return new yi(e).fromBuffer(r);
}
function Me(r) {
  switch (r = r.toLowerCase(), r) {
    case "application/epub+zip":
      return {
        ext: "epub",
        mime: r
      };
    case "application/vnd.oasis.opendocument.text":
      return {
        ext: "odt",
        mime: r
      };
    case "application/vnd.oasis.opendocument.text-template":
      return {
        ext: "ott",
        mime: r
      };
    case "application/vnd.oasis.opendocument.spreadsheet":
      return {
        ext: "ods",
        mime: r
      };
    case "application/vnd.oasis.opendocument.spreadsheet-template":
      return {
        ext: "ots",
        mime: r
      };
    case "application/vnd.oasis.opendocument.presentation":
      return {
        ext: "odp",
        mime: r
      };
    case "application/vnd.oasis.opendocument.presentation-template":
      return {
        ext: "otp",
        mime: r
      };
    case "application/vnd.oasis.opendocument.graphics":
      return {
        ext: "odg",
        mime: r
      };
    case "application/vnd.oasis.opendocument.graphics-template":
      return {
        ext: "otg",
        mime: r
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.slideshow":
      return {
        ext: "ppsx",
        mime: r
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return {
        ext: "xlsx",
        mime: r
      };
    case "application/vnd.ms-excel.sheet.macroenabled":
      return {
        ext: "xlsm",
        mime: "application/vnd.ms-excel.sheet.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.template":
      return {
        ext: "xltx",
        mime: r
      };
    case "application/vnd.ms-excel.template.macroenabled":
      return {
        ext: "xltm",
        mime: "application/vnd.ms-excel.template.macroenabled.12"
      };
    case "application/vnd.ms-powerpoint.slideshow.macroenabled":
      return {
        ext: "ppsm",
        mime: "application/vnd.ms-powerpoint.slideshow.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return {
        ext: "docx",
        mime: r
      };
    case "application/vnd.ms-word.document.macroenabled":
      return {
        ext: "docm",
        mime: "application/vnd.ms-word.document.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.template":
      return {
        ext: "dotx",
        mime: r
      };
    case "application/vnd.ms-word.template.macroenabledtemplate":
      return {
        ext: "dotm",
        mime: "application/vnd.ms-word.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.template":
      return {
        ext: "potx",
        mime: r
      };
    case "application/vnd.ms-powerpoint.template.macroenabled":
      return {
        ext: "potm",
        mime: "application/vnd.ms-powerpoint.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return {
        ext: "pptx",
        mime: r
      };
    case "application/vnd.ms-powerpoint.presentation.macroenabled":
      return {
        ext: "pptm",
        mime: "application/vnd.ms-powerpoint.presentation.macroenabled.12"
      };
    case "application/vnd.ms-visio.drawing":
      return {
        ext: "vsdx",
        mime: "application/vnd.visio"
      };
    case "application/vnd.ms-package.3dmanufacturing-3dmodel+xml":
      return {
        ext: "3mf",
        mime: "model/3mf"
      };
  }
}
function N(r, e, t) {
  t = {
    offset: 0,
    ...t
  };
  for (const [i, n] of e.entries())
    if (t.mask) {
      if (n !== (t.mask[i] & r[i + t.offset]))
        return !1;
    } else if (n !== r[i + t.offset])
      return !1;
  return !0;
}
class yi {
  constructor(e) {
    this.options = {
      mpegOffsetTolerance: 0,
      ...e
    }, this.detectors = [
      ...e?.customDetectors ?? [],
      { id: "core", detect: this.detectConfident },
      { id: "core.imprecise", detect: this.detectImprecise }
    ], this.tokenizerOptions = {
      abortSignal: e?.signal
    };
  }
  async fromTokenizer(e) {
    const t = e.position;
    for (const i of this.detectors) {
      const n = await i.detect(e);
      if (n)
        return n;
      if (t !== e.position)
        return;
    }
  }
  async fromBuffer(e) {
    if (!(e instanceof Uint8Array || e instanceof ArrayBuffer))
      throw new TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof e}\``);
    const t = e instanceof Uint8Array ? e : new Uint8Array(e);
    if (t?.length > 1)
      return this.fromTokenizer(ze(t, this.tokenizerOptions));
  }
  async fromBlob(e) {
    const t = Tr(e, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(t);
    } finally {
      await t.close();
    }
  }
  async fromStream(e) {
    const t = yr(e, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(t);
    } finally {
      await t.close();
    }
  }
  async toDetectionStream(e, t) {
    const { sampleSize: i = Fe } = t;
    let n, a;
    const d = e.getReader({ mode: "byob" });
    try {
      const { value: x, done: p } = await d.read(new Uint8Array(i));
      if (a = x, !p && x)
        try {
          n = await this.fromBuffer(x.subarray(0, i));
        } catch (o) {
          if (!(o instanceof _))
            throw o;
          n = void 0;
        }
      a = x;
    } finally {
      d.releaseLock();
    }
    const m = new TransformStream({
      async start(x) {
        x.enqueue(a);
      },
      transform(x, p) {
        p.enqueue(x);
      }
    }), l = e.pipeThrough(m);
    return l.fileType = n, l;
  }
  check(e, t) {
    return N(this.buffer, e, t);
  }
  checkString(e, t) {
    return this.check(fi(e, t?.encoding), t);
  }
  // Detections with a high degree of certainty in identifying the correct file type
  detectConfident = async (e) => {
    if (this.buffer = new Uint8Array(Fe), e.fileInfo.size === void 0 && (e.fileInfo.size = Number.MAX_SAFE_INTEGER), this.tokenizer = e, await e.peekBuffer(this.buffer, { length: 32, mayBeLess: !0 }), this.check([66, 77]))
      return {
        ext: "bmp",
        mime: "image/bmp"
      };
    if (this.check([11, 119]))
      return {
        ext: "ac3",
        mime: "audio/vnd.dolby.dd-raw"
      };
    if (this.check([120, 1]))
      return {
        ext: "dmg",
        mime: "application/x-apple-diskimage"
      };
    if (this.check([77, 90]))
      return {
        ext: "exe",
        mime: "application/x-msdownload"
      };
    if (this.check([37, 33]))
      return await e.peekBuffer(this.buffer, { length: 24, mayBeLess: !0 }), this.checkString("PS-Adobe-", { offset: 2 }) && this.checkString(" EPSF-", { offset: 14 }) ? {
        ext: "eps",
        mime: "application/eps"
      } : {
        ext: "ps",
        mime: "application/postscript"
      };
    if (this.check([31, 160]) || this.check([31, 157]))
      return {
        ext: "Z",
        mime: "application/x-compress"
      };
    if (this.check([199, 113]))
      return {
        ext: "cpio",
        mime: "application/x-cpio"
      };
    if (this.check([96, 234]))
      return {
        ext: "arj",
        mime: "application/x-arj"
      };
    if (this.check([239, 187, 191]))
      return this.tokenizer.ignore(3), this.detectConfident(e);
    if (this.check([71, 73, 70]))
      return {
        ext: "gif",
        mime: "image/gif"
      };
    if (this.check([73, 73, 188]))
      return {
        ext: "jxr",
        mime: "image/vnd.ms-photo"
      };
    if (this.check([31, 139, 8])) {
      const i = new si(e).inflate();
      let n = !0;
      try {
        let a;
        try {
          a = await this.fromStream(i);
        } catch {
          n = !1;
        }
        if (a && a.ext === "tar")
          return {
            ext: "tar.gz",
            mime: "application/gzip"
          };
      } finally {
        n && await i.cancel();
      }
      return {
        ext: "gz",
        mime: "application/gzip"
      };
    }
    if (this.check([66, 90, 104]))
      return {
        ext: "bz2",
        mime: "application/x-bzip2"
      };
    if (this.checkString("ID3")) {
      await e.ignore(6);
      const t = await e.readToken(xi);
      return e.position + t > e.fileInfo.size ? {
        ext: "mp3",
        mime: "audio/mpeg"
      } : (await e.ignore(t), this.fromTokenizer(e));
    }
    if (this.checkString("MP+"))
      return {
        ext: "mpc",
        mime: "audio/x-musepack"
      };
    if ((this.buffer[0] === 67 || this.buffer[0] === 70) && this.check([87, 83], { offset: 1 }))
      return {
        ext: "swf",
        mime: "application/x-shockwave-flash"
      };
    if (this.check([255, 216, 255]))
      return this.check([247], { offset: 3 }) ? {
        ext: "jls",
        mime: "image/jls"
      } : {
        ext: "jpg",
        mime: "image/jpeg"
      };
    if (this.check([79, 98, 106, 1]))
      return {
        ext: "avro",
        mime: "application/avro"
      };
    if (this.checkString("FLIF"))
      return {
        ext: "flif",
        mime: "image/flif"
      };
    if (this.checkString("8BPS"))
      return {
        ext: "psd",
        mime: "image/vnd.adobe.photoshop"
      };
    if (this.checkString("MPCK"))
      return {
        ext: "mpc",
        mime: "audio/x-musepack"
      };
    if (this.checkString("FORM"))
      return {
        ext: "aif",
        mime: "audio/aiff"
      };
    if (this.checkString("icns", { offset: 0 }))
      return {
        ext: "icns",
        mime: "image/icns"
      };
    if (this.check([80, 75, 3, 4])) {
      let t;
      return await new Ve(e).unzip((i) => {
        switch (i.filename) {
          case "META-INF/mozilla.rsa":
            return t = {
              ext: "xpi",
              mime: "application/x-xpinstall"
            }, {
              stop: !0
            };
          case "META-INF/MANIFEST.MF":
            return t = {
              ext: "jar",
              mime: "application/java-archive"
            }, {
              stop: !0
            };
          case "mimetype":
            return {
              async handler(n) {
                const a = new TextDecoder("utf-8").decode(n).trim();
                t = Me(a);
              },
              stop: !0
            };
          case "[Content_Types].xml":
            return {
              async handler(n) {
                let a = new TextDecoder("utf-8").decode(n);
                const d = a.indexOf('.main+xml"');
                if (d === -1) {
                  const m = "application/vnd.ms-package.3dmanufacturing-3dmodel+xml";
                  a.includes(`ContentType="${m}"`) && (t = Me(m));
                } else {
                  a = a.slice(0, Math.max(0, d));
                  const m = a.lastIndexOf('"'), l = a.slice(Math.max(0, m + 1));
                  t = Me(l);
                }
              },
              stop: !0
            };
          default:
            return /classes\d*\.dex/.test(i.filename) ? (t = {
              ext: "apk",
              mime: "application/vnd.android.package-archive"
            }, { stop: !0 }) : {};
        }
      }).catch((i) => {
        if (!(i instanceof _))
          throw i;
      }), t ?? {
        ext: "zip",
        mime: "application/zip"
      };
    }
    if (this.checkString("OggS")) {
      await e.ignore(28);
      const t = new Uint8Array(8);
      return await e.readBuffer(t), N(t, [79, 112, 117, 115, 72, 101, 97, 100]) ? {
        ext: "opus",
        mime: "audio/ogg; codecs=opus"
      } : N(t, [128, 116, 104, 101, 111, 114, 97]) ? {
        ext: "ogv",
        mime: "video/ogg"
      } : N(t, [1, 118, 105, 100, 101, 111, 0]) ? {
        ext: "ogm",
        mime: "video/ogg"
      } : N(t, [127, 70, 76, 65, 67]) ? {
        ext: "oga",
        mime: "audio/ogg"
      } : N(t, [83, 112, 101, 101, 120, 32, 32]) ? {
        ext: "spx",
        mime: "audio/ogg"
      } : N(t, [1, 118, 111, 114, 98, 105, 115]) ? {
        ext: "ogg",
        mime: "audio/ogg"
      } : {
        ext: "ogx",
        mime: "application/ogg"
      };
    }
    if (this.check([80, 75]) && (this.buffer[2] === 3 || this.buffer[2] === 5 || this.buffer[2] === 7) && (this.buffer[3] === 4 || this.buffer[3] === 6 || this.buffer[3] === 8))
      return {
        ext: "zip",
        mime: "application/zip"
      };
    if (this.checkString("MThd"))
      return {
        ext: "mid",
        mime: "audio/midi"
      };
    if (this.checkString("wOFF") && (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString("OTTO", { offset: 4 })))
      return {
        ext: "woff",
        mime: "font/woff"
      };
    if (this.checkString("wOF2") && (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString("OTTO", { offset: 4 })))
      return {
        ext: "woff2",
        mime: "font/woff2"
      };
    if (this.check([212, 195, 178, 161]) || this.check([161, 178, 195, 212]))
      return {
        ext: "pcap",
        mime: "application/vnd.tcpdump.pcap"
      };
    if (this.checkString("DSD "))
      return {
        ext: "dsf",
        mime: "audio/x-dsf"
        // Non-standard
      };
    if (this.checkString("LZIP"))
      return {
        ext: "lz",
        mime: "application/x-lzip"
      };
    if (this.checkString("fLaC"))
      return {
        ext: "flac",
        mime: "audio/flac"
      };
    if (this.check([66, 80, 71, 251]))
      return {
        ext: "bpg",
        mime: "image/bpg"
      };
    if (this.checkString("wvpk"))
      return {
        ext: "wv",
        mime: "audio/wavpack"
      };
    if (this.checkString("%PDF"))
      return {
        ext: "pdf",
        mime: "application/pdf"
      };
    if (this.check([0, 97, 115, 109]))
      return {
        ext: "wasm",
        mime: "application/wasm"
      };
    if (this.check([73, 73])) {
      const t = await this.readTiffHeader(!1);
      if (t)
        return t;
    }
    if (this.check([77, 77])) {
      const t = await this.readTiffHeader(!0);
      if (t)
        return t;
    }
    if (this.checkString("MAC "))
      return {
        ext: "ape",
        mime: "audio/ape"
      };
    if (this.check([26, 69, 223, 163])) {
      async function t() {
        const m = await e.peekNumber(Y);
        let l = 128, x = 0;
        for (; (m & l) === 0 && l !== 0; )
          ++x, l >>= 1;
        const p = new Uint8Array(x + 1);
        return await e.readBuffer(p), p;
      }
      async function i() {
        const m = await t(), l = await t();
        l[0] ^= 128 >> l.length - 1;
        const x = Math.min(6, l.length), p = new DataView(m.buffer), o = new DataView(l.buffer, l.length - x, x);
        return {
          id: Ue(p),
          len: Ue(o)
        };
      }
      async function n(m) {
        for (; m > 0; ) {
          const l = await i();
          if (l.id === 17026)
            return (await e.readToken(new E(l.len))).replaceAll(/\00.*$/g, "");
          await e.ignore(l.len), --m;
        }
      }
      const a = await i();
      switch (await n(a.len)) {
        case "webm":
          return {
            ext: "webm",
            mime: "video/webm"
          };
        case "matroska":
          return {
            ext: "mkv",
            mime: "video/matroska"
          };
        default:
          return;
      }
    }
    if (this.checkString("SQLi"))
      return {
        ext: "sqlite",
        mime: "application/x-sqlite3"
      };
    if (this.check([78, 69, 83, 26]))
      return {
        ext: "nes",
        mime: "application/x-nintendo-nes-rom"
      };
    if (this.checkString("Cr24"))
      return {
        ext: "crx",
        mime: "application/x-google-chrome-extension"
      };
    if (this.checkString("MSCF") || this.checkString("ISc("))
      return {
        ext: "cab",
        mime: "application/vnd.ms-cab-compressed"
      };
    if (this.check([237, 171, 238, 219]))
      return {
        ext: "rpm",
        mime: "application/x-rpm"
      };
    if (this.check([197, 208, 211, 198]))
      return {
        ext: "eps",
        mime: "application/eps"
      };
    if (this.check([40, 181, 47, 253]))
      return {
        ext: "zst",
        mime: "application/zstd"
      };
    if (this.check([127, 69, 76, 70]))
      return {
        ext: "elf",
        mime: "application/x-elf"
      };
    if (this.check([33, 66, 68, 78]))
      return {
        ext: "pst",
        mime: "application/vnd.ms-outlook"
      };
    if (this.checkString("PAR1") || this.checkString("PARE"))
      return {
        ext: "parquet",
        mime: "application/vnd.apache.parquet"
      };
    if (this.checkString("ttcf"))
      return {
        ext: "ttc",
        mime: "font/collection"
      };
    if (this.check([207, 250, 237, 254]))
      return {
        ext: "macho",
        mime: "application/x-mach-binary"
      };
    if (this.check([4, 34, 77, 24]))
      return {
        ext: "lz4",
        mime: "application/x-lz4"
        // Invented by us
      };
    if (this.checkString("regf"))
      return {
        ext: "dat",
        mime: "application/x-ft-windows-registry-hive"
      };
    if (this.check([79, 84, 84, 79, 0]))
      return {
        ext: "otf",
        mime: "font/otf"
      };
    if (this.checkString("#!AMR"))
      return {
        ext: "amr",
        mime: "audio/amr"
      };
    if (this.checkString("{\\rtf"))
      return {
        ext: "rtf",
        mime: "application/rtf"
      };
    if (this.check([70, 76, 86, 1]))
      return {
        ext: "flv",
        mime: "video/x-flv"
      };
    if (this.checkString("IMPM"))
      return {
        ext: "it",
        mime: "audio/x-it"
      };
    if (this.checkString("-lh0-", { offset: 2 }) || this.checkString("-lh1-", { offset: 2 }) || this.checkString("-lh2-", { offset: 2 }) || this.checkString("-lh3-", { offset: 2 }) || this.checkString("-lh4-", { offset: 2 }) || this.checkString("-lh5-", { offset: 2 }) || this.checkString("-lh6-", { offset: 2 }) || this.checkString("-lh7-", { offset: 2 }) || this.checkString("-lzs-", { offset: 2 }) || this.checkString("-lz4-", { offset: 2 }) || this.checkString("-lz5-", { offset: 2 }) || this.checkString("-lhd-", { offset: 2 }))
      return {
        ext: "lzh",
        mime: "application/x-lzh-compressed"
      };
    if (this.check([0, 0, 1, 186])) {
      if (this.check([33], { offset: 4, mask: [241] }))
        return {
          ext: "mpg",
          // May also be .ps, .mpeg
          mime: "video/MP1S"
        };
      if (this.check([68], { offset: 4, mask: [196] }))
        return {
          ext: "mpg",
          // May also be .mpg, .m2p, .vob or .sub
          mime: "video/MP2P"
        };
    }
    if (this.checkString("ITSF"))
      return {
        ext: "chm",
        mime: "application/vnd.ms-htmlhelp"
      };
    if (this.check([202, 254, 186, 190]))
      return {
        ext: "class",
        mime: "application/java-vm"
      };
    if (this.checkString(".RMF"))
      return {
        ext: "rm",
        mime: "application/vnd.rn-realmedia"
      };
    if (this.checkString("DRACO"))
      return {
        ext: "drc",
        mime: "application/vnd.google.draco"
        // Invented by us
      };
    if (this.check([253, 55, 122, 88, 90, 0]))
      return {
        ext: "xz",
        mime: "application/x-xz"
      };
    if (this.checkString("<?xml "))
      return {
        ext: "xml",
        mime: "application/xml"
      };
    if (this.check([55, 122, 188, 175, 39, 28]))
      return {
        ext: "7z",
        mime: "application/x-7z-compressed"
      };
    if (this.check([82, 97, 114, 33, 26, 7]) && (this.buffer[6] === 0 || this.buffer[6] === 1))
      return {
        ext: "rar",
        mime: "application/x-rar-compressed"
      };
    if (this.checkString("solid "))
      return {
        ext: "stl",
        mime: "model/stl"
      };
    if (this.checkString("AC")) {
      const t = new E(4, "latin1").get(this.buffer, 2);
      if (t.match("^d*") && t >= 1e3 && t <= 1050)
        return {
          ext: "dwg",
          mime: "image/vnd.dwg"
        };
    }
    if (this.checkString("070707"))
      return {
        ext: "cpio",
        mime: "application/x-cpio"
      };
    if (this.checkString("BLENDER"))
      return {
        ext: "blend",
        mime: "application/x-blender"
      };
    if (this.checkString("!<arch>"))
      return await e.ignore(8), await e.readToken(new E(13, "ascii")) === "debian-binary" ? {
        ext: "deb",
        mime: "application/x-deb"
      } : {
        ext: "ar",
        mime: "application/x-unix-archive"
      };
    if (this.checkString("WEBVTT") && // One of LF, CR, tab, space, or end of file must follow "WEBVTT" per the spec (see `fixture/fixture-vtt-*.vtt` for examples). Note that `\0` is technically the null character (there is no such thing as an EOF character). However, checking for `\0` gives us the same result as checking for the end of the stream.
    [`
`, "\r", "	", " ", "\0"].some((t) => this.checkString(t, { offset: 6 })))
      return {
        ext: "vtt",
        mime: "text/vtt"
      };
    if (this.check([137, 80, 78, 71, 13, 10, 26, 10])) {
      await e.ignore(8);
      async function t() {
        return {
          length: await e.readToken(Bt),
          type: await e.readToken(new E(4, "latin1"))
        };
      }
      do {
        const i = await t();
        if (i.length < 0)
          return;
        switch (i.type) {
          case "IDAT":
            return {
              ext: "png",
              mime: "image/png"
            };
          case "acTL":
            return {
              ext: "apng",
              mime: "image/apng"
            };
          default:
            await e.ignore(i.length + 4);
        }
      } while (e.position + 8 < e.fileInfo.size);
      return {
        ext: "png",
        mime: "image/png"
      };
    }
    if (this.check([65, 82, 82, 79, 87, 49, 0, 0]))
      return {
        ext: "arrow",
        mime: "application/vnd.apache.arrow.file"
      };
    if (this.check([103, 108, 84, 70, 2, 0, 0, 0]))
      return {
        ext: "glb",
        mime: "model/gltf-binary"
      };
    if (this.check([102, 114, 101, 101], { offset: 4 }) || this.check([109, 100, 97, 116], { offset: 4 }) || this.check([109, 111, 111, 118], { offset: 4 }) || this.check([119, 105, 100, 101], { offset: 4 }))
      return {
        ext: "mov",
        mime: "video/quicktime"
      };
    if (this.check([73, 73, 82, 79, 8, 0, 0, 0, 24]))
      return {
        ext: "orf",
        mime: "image/x-olympus-orf"
      };
    if (this.checkString("gimp xcf "))
      return {
        ext: "xcf",
        mime: "image/x-xcf"
      };
    if (this.checkString("ftyp", { offset: 4 }) && (this.buffer[8] & 96) !== 0) {
      const t = new E(4, "latin1").get(this.buffer, 8).replace("\0", " ").trim();
      switch (t) {
        case "avif":
        case "avis":
          return { ext: "avif", mime: "image/avif" };
        case "mif1":
          return { ext: "heic", mime: "image/heif" };
        case "msf1":
          return { ext: "heic", mime: "image/heif-sequence" };
        case "heic":
        case "heix":
          return { ext: "heic", mime: "image/heic" };
        case "hevc":
        case "hevx":
          return { ext: "heic", mime: "image/heic-sequence" };
        case "qt":
          return { ext: "mov", mime: "video/quicktime" };
        case "M4V":
        case "M4VH":
        case "M4VP":
          return { ext: "m4v", mime: "video/x-m4v" };
        case "M4P":
          return { ext: "m4p", mime: "video/mp4" };
        case "M4B":
          return { ext: "m4b", mime: "audio/mp4" };
        case "M4A":
          return { ext: "m4a", mime: "audio/x-m4a" };
        case "F4V":
          return { ext: "f4v", mime: "video/mp4" };
        case "F4P":
          return { ext: "f4p", mime: "video/mp4" };
        case "F4A":
          return { ext: "f4a", mime: "audio/mp4" };
        case "F4B":
          return { ext: "f4b", mime: "audio/mp4" };
        case "crx":
          return { ext: "cr3", mime: "image/x-canon-cr3" };
        default:
          return t.startsWith("3g") ? t.startsWith("3g2") ? { ext: "3g2", mime: "video/3gpp2" } : { ext: "3gp", mime: "video/3gpp" } : { ext: "mp4", mime: "video/mp4" };
      }
    }
    if (this.checkString(`REGEDIT4\r
`))
      return {
        ext: "reg",
        mime: "application/x-ms-regedit"
      };
    if (this.check([82, 73, 70, 70])) {
      if (this.checkString("WEBP", { offset: 8 }))
        return {
          ext: "webp",
          mime: "image/webp"
        };
      if (this.check([65, 86, 73], { offset: 8 }))
        return {
          ext: "avi",
          mime: "video/vnd.avi"
        };
      if (this.check([87, 65, 86, 69], { offset: 8 }))
        return {
          ext: "wav",
          mime: "audio/wav"
        };
      if (this.check([81, 76, 67, 77], { offset: 8 }))
        return {
          ext: "qcp",
          mime: "audio/qcelp"
        };
    }
    if (this.check([73, 73, 85, 0, 24, 0, 0, 0, 136, 231, 116, 216]))
      return {
        ext: "rw2",
        mime: "image/x-panasonic-rw2"
      };
    if (this.check([48, 38, 178, 117, 142, 102, 207, 17, 166, 217])) {
      async function t() {
        const i = new Uint8Array(16);
        return await e.readBuffer(i), {
          id: i,
          size: Number(await e.readToken(Ot))
        };
      }
      for (await e.ignore(30); e.position + 24 < e.fileInfo.size; ) {
        const i = await t();
        let n = i.size - 24;
        if (N(i.id, [145, 7, 220, 183, 183, 169, 207, 17, 142, 230, 0, 192, 12, 32, 83, 101])) {
          const a = new Uint8Array(16);
          if (n -= await e.readBuffer(a), N(a, [64, 158, 105, 248, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43]))
            return {
              ext: "asf",
              mime: "audio/x-ms-asf"
            };
          if (N(a, [192, 239, 25, 188, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43]))
            return {
              ext: "asf",
              mime: "video/x-ms-asf"
            };
          break;
        }
        await e.ignore(n);
      }
      return {
        ext: "asf",
        mime: "application/vnd.ms-asf"
      };
    }
    if (this.check([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10]))
      return {
        ext: "ktx",
        mime: "image/ktx"
      };
    if ((this.check([126, 16, 4]) || this.check([126, 24, 4])) && this.check([48, 77, 73, 69], { offset: 4 }))
      return {
        ext: "mie",
        mime: "application/x-mie"
      };
    if (this.check([39, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { offset: 2 }))
      return {
        ext: "shp",
        mime: "application/x-esri-shape"
      };
    if (this.check([255, 79, 255, 81]))
      return {
        ext: "j2c",
        mime: "image/j2c"
      };
    if (this.check([0, 0, 0, 12, 106, 80, 32, 32, 13, 10, 135, 10]))
      switch (await e.ignore(20), await e.readToken(new E(4, "ascii"))) {
        case "jp2 ":
          return {
            ext: "jp2",
            mime: "image/jp2"
          };
        case "jpx ":
          return {
            ext: "jpx",
            mime: "image/jpx"
          };
        case "jpm ":
          return {
            ext: "jpm",
            mime: "image/jpm"
          };
        case "mjp2":
          return {
            ext: "mj2",
            mime: "image/mj2"
          };
        default:
          return;
      }
    if (this.check([255, 10]) || this.check([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10]))
      return {
        ext: "jxl",
        mime: "image/jxl"
      };
    if (this.check([254, 255]))
      return this.checkString("<?xml ", { offset: 2, encoding: "utf-16be" }) ? {
        ext: "xml",
        mime: "application/xml"
      } : void 0;
    if (this.check([208, 207, 17, 224, 161, 177, 26, 225]))
      return {
        ext: "cfb",
        mime: "application/x-cfb"
      };
    if (await e.peekBuffer(this.buffer, { length: Math.min(256, e.fileInfo.size), mayBeLess: !0 }), this.check([97, 99, 115, 112], { offset: 36 }))
      return {
        ext: "icc",
        mime: "application/vnd.iccprofile"
      };
    if (this.checkString("**ACE", { offset: 7 }) && this.checkString("**", { offset: 12 }))
      return {
        ext: "ace",
        mime: "application/x-ace-compressed"
      };
    if (this.checkString("BEGIN:")) {
      if (this.checkString("VCARD", { offset: 6 }))
        return {
          ext: "vcf",
          mime: "text/vcard"
        };
      if (this.checkString("VCALENDAR", { offset: 6 }))
        return {
          ext: "ics",
          mime: "text/calendar"
        };
    }
    if (this.checkString("FUJIFILMCCD-RAW"))
      return {
        ext: "raf",
        mime: "image/x-fujifilm-raf"
      };
    if (this.checkString("Extended Module:"))
      return {
        ext: "xm",
        mime: "audio/x-xm"
      };
    if (this.checkString("Creative Voice File"))
      return {
        ext: "voc",
        mime: "audio/x-voc"
      };
    if (this.check([4, 0, 0, 0]) && this.buffer.length >= 16) {
      const t = new DataView(this.buffer.buffer).getUint32(12, !0);
      if (t > 12 && this.buffer.length >= t + 16)
        try {
          const i = new TextDecoder().decode(this.buffer.subarray(16, t + 16));
          if (JSON.parse(i).files)
            return {
              ext: "asar",
              mime: "application/x-asar"
            };
        } catch {
        }
    }
    if (this.check([6, 14, 43, 52, 2, 5, 1, 1, 13, 1, 2, 1, 1, 2]))
      return {
        ext: "mxf",
        mime: "application/mxf"
      };
    if (this.checkString("SCRM", { offset: 44 }))
      return {
        ext: "s3m",
        mime: "audio/x-s3m"
      };
    if (this.check([71]) && this.check([71], { offset: 188 }))
      return {
        ext: "mts",
        mime: "video/mp2t"
      };
    if (this.check([71], { offset: 4 }) && this.check([71], { offset: 196 }))
      return {
        ext: "mts",
        mime: "video/mp2t"
      };
    if (this.check([66, 79, 79, 75, 77, 79, 66, 73], { offset: 60 }))
      return {
        ext: "mobi",
        mime: "application/x-mobipocket-ebook"
      };
    if (this.check([68, 73, 67, 77], { offset: 128 }))
      return {
        ext: "dcm",
        mime: "application/dicom"
      };
    if (this.check([76, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70]))
      return {
        ext: "lnk",
        mime: "application/x.ms.shortcut"
        // Invented by us
      };
    if (this.check([98, 111, 111, 107, 0, 0, 0, 0, 109, 97, 114, 107, 0, 0, 0, 0]))
      return {
        ext: "alias",
        mime: "application/x.apple.alias"
        // Invented by us
      };
    if (this.checkString("Kaydara FBX Binary  \0"))
      return {
        ext: "fbx",
        mime: "application/x.autodesk.fbx"
        // Invented by us
      };
    if (this.check([76, 80], { offset: 34 }) && (this.check([0, 0, 1], { offset: 8 }) || this.check([1, 0, 2], { offset: 8 }) || this.check([2, 0, 2], { offset: 8 })))
      return {
        ext: "eot",
        mime: "application/vnd.ms-fontobject"
      };
    if (this.check([6, 6, 237, 245, 216, 29, 70, 229, 189, 49, 239, 231, 254, 116, 183, 29]))
      return {
        ext: "indd",
        mime: "application/x-indesign"
      };
    if (await e.peekBuffer(this.buffer, { length: Math.min(512, e.fileInfo.size), mayBeLess: !0 }), this.checkString("ustar", { offset: 257 }) && (this.checkString("\0", { offset: 262 }) || this.checkString(" ", { offset: 262 })) || this.check([0, 0, 0, 0, 0, 0], { offset: 257 }) && hi(this.buffer))
      return {
        ext: "tar",
        mime: "application/x-tar"
      };
    if (this.check([255, 254])) {
      const t = "utf-16le";
      return this.checkString("<?xml ", { offset: 2, encoding: t }) ? {
        ext: "xml",
        mime: "application/xml"
      } : this.check([255, 14], { offset: 2 }) && this.checkString("SketchUp Model", { offset: 4, encoding: t }) ? {
        ext: "skp",
        mime: "application/vnd.sketchup.skp"
      } : this.checkString(`Windows Registry Editor Version 5.00\r
`, { offset: 2, encoding: t }) ? {
        ext: "reg",
        mime: "application/x-ms-regedit"
      } : void 0;
    }
    if (this.checkString("-----BEGIN PGP MESSAGE-----"))
      return {
        ext: "pgp",
        mime: "application/pgp-encrypted"
      };
  };
  // Detections with limited supporting data, resulting in a higher likelihood of false positives
  detectImprecise = async (e) => {
    if (this.buffer = new Uint8Array(Fe), await e.peekBuffer(this.buffer, { length: Math.min(8, e.fileInfo.size), mayBeLess: !0 }), this.check([0, 0, 1, 186]) || this.check([0, 0, 1, 179]))
      return {
        ext: "mpg",
        mime: "video/mpeg"
      };
    if (this.check([0, 1, 0, 0, 0]))
      return {
        ext: "ttf",
        mime: "font/ttf"
      };
    if (this.check([0, 0, 1, 0]))
      return {
        ext: "ico",
        mime: "image/x-icon"
      };
    if (this.check([0, 0, 2, 0]))
      return {
        ext: "cur",
        mime: "image/x-icon"
      };
    if (await e.peekBuffer(this.buffer, { length: Math.min(2 + this.options.mpegOffsetTolerance, e.fileInfo.size), mayBeLess: !0 }), this.buffer.length >= 2 + this.options.mpegOffsetTolerance)
      for (let t = 0; t <= this.options.mpegOffsetTolerance; ++t) {
        const i = this.scanMpeg(t);
        if (i)
          return i;
      }
  };
  async readTiffTag(e) {
    const t = await this.tokenizer.readToken(e ? V : C);
    switch (this.tokenizer.ignore(10), t) {
      case 50341:
        return {
          ext: "arw",
          mime: "image/x-sony-arw"
        };
      case 50706:
        return {
          ext: "dng",
          mime: "image/x-adobe-dng"
        };
    }
  }
  async readTiffIFD(e) {
    const t = await this.tokenizer.readToken(e ? V : C);
    for (let i = 0; i < t; ++i) {
      const n = await this.readTiffTag(e);
      if (n)
        return n;
    }
  }
  async readTiffHeader(e) {
    const t = (e ? V : C).get(this.buffer, 2), i = (e ? ye : v).get(this.buffer, 4);
    if (t === 42) {
      if (i >= 6) {
        if (this.checkString("CR", { offset: 8 }))
          return {
            ext: "cr2",
            mime: "image/x-canon-cr2"
          };
        if (i >= 8) {
          const a = (e ? V : C).get(this.buffer, 8), d = (e ? V : C).get(this.buffer, 10);
          if (a === 28 && d === 254 || a === 31 && d === 11)
            return {
              ext: "nef",
              mime: "image/x-nikon-nef"
            };
        }
      }
      return await this.tokenizer.ignore(i), await this.readTiffIFD(e) ?? {
        ext: "tif",
        mime: "image/tiff"
      };
    }
    if (t === 43)
      return {
        ext: "tif",
        mime: "image/tiff"
      };
  }
  /**
  	Scan check MPEG 1 or 2 Layer 3 header, or 'layer 0' for ADTS (MPEG sync-word 0xFFE).
  
  	@param offset - Offset to scan for sync-preamble.
  	@returns {{ext: string, mime: string}}
  	*/
  scanMpeg(e) {
    if (this.check([255, 224], { offset: e, mask: [255, 224] })) {
      if (this.check([16], { offset: e + 1, mask: [22] }))
        return this.check([8], { offset: e + 1, mask: [8] }) ? {
          ext: "aac",
          mime: "audio/aac"
        } : {
          ext: "aac",
          mime: "audio/aac"
        };
      if (this.check([2], { offset: e + 1, mask: [6] }))
        return {
          ext: "mp3",
          mime: "audio/mpeg"
        };
      if (this.check([4], { offset: e + 1, mask: [6] }))
        return {
          ext: "mp2",
          mime: "audio/mpeg"
        };
      if (this.check([6], { offset: e + 1, mask: [6] }))
        return {
          ext: "mp1",
          mime: "audio/mpeg"
        };
    }
  }
}
new Set(gi);
new Set(wi);
var ue = {};
var dt;
function Ti() {
  if (dt) return ue;
  dt = 1;
  var r = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g, e = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/, t = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, i = /\\([\u000b\u0020-\u00ff])/g, n = /([\\"])/g, a = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
  ue.format = d, ue.parse = m;
  function d(o) {
    if (!o || typeof o != "object")
      throw new TypeError("argument obj is required");
    var s = o.parameters, c = o.type;
    if (!c || !a.test(c))
      throw new TypeError("invalid type");
    var u = c;
    if (s && typeof s == "object")
      for (var g, h = Object.keys(s).sort(), f = 0; f < h.length; f++) {
        if (g = h[f], !t.test(g))
          throw new TypeError("invalid parameter name");
        u += "; " + g + "=" + x(s[g]);
      }
    return u;
  }
  function m(o) {
    if (!o)
      throw new TypeError("argument string is required");
    var s = typeof o == "object" ? l(o) : o;
    if (typeof s != "string")
      throw new TypeError("argument string is required to be a string");
    var c = s.indexOf(";"), u = c !== -1 ? s.slice(0, c).trim() : s.trim();
    if (!a.test(u))
      throw new TypeError("invalid media type");
    var g = new p(u.toLowerCase());
    if (c !== -1) {
      var h, f, y;
      for (r.lastIndex = c; f = r.exec(s); ) {
        if (f.index !== c)
          throw new TypeError("invalid parameter format");
        c += f[0].length, h = f[1].toLowerCase(), y = f[2], y.charCodeAt(0) === 34 && (y = y.slice(1, -1), y.indexOf("\\") !== -1 && (y = y.replace(i, "$1"))), g.parameters[h] = y;
      }
      if (c !== s.length)
        throw new TypeError("invalid parameter format");
    }
    return g;
  }
  function l(o) {
    var s;
    if (typeof o.getHeader == "function" ? s = o.getHeader("content-type") : typeof o.headers == "object" && (s = o.headers && o.headers["content-type"]), typeof s != "string")
      throw new TypeError("content-type header is missing from object");
    return s;
  }
  function x(o) {
    var s = String(o);
    if (t.test(s))
      return s;
    if (s.length > 0 && !e.test(s))
      throw new TypeError("invalid parameter value");
    return '"' + s.replace(n, "\\$1") + '"';
  }
  function p(o) {
    this.parameters = /* @__PURE__ */ Object.create(null), this.type = o;
  }
  return ue;
}
var bi = Ti();
const vi = /* @__PURE__ */ He(bi);
var ee = {};
var pt;
function ki() {
  if (pt) return ee;
  pt = 1;
  var r = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/, e = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/, t = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;
  ee.format = i, ee.parse = a, ee.test = n;
  function i(m) {
    if (!m || typeof m != "object")
      throw new TypeError("argument obj is required");
    var l = m.subtype, x = m.suffix, p = m.type;
    if (!p || !e.test(p))
      throw new TypeError("invalid type");
    if (!l || !r.test(l))
      throw new TypeError("invalid subtype");
    var o = p + "/" + l;
    if (x) {
      if (!e.test(x))
        throw new TypeError("invalid suffix");
      o += "+" + x;
    }
    return o;
  }
  function n(m) {
    if (!m)
      throw new TypeError("argument string is required");
    if (typeof m != "string")
      throw new TypeError("argument string is required to be a string");
    return t.test(m.toLowerCase());
  }
  function a(m) {
    if (!m)
      throw new TypeError("argument string is required");
    if (typeof m != "string")
      throw new TypeError("argument string is required to be a string");
    var l = t.exec(m.toLowerCase());
    if (!l)
      throw new TypeError("invalid media type");
    var x = l[1], p = l[2], o, s = p.lastIndexOf("+");
    return s !== -1 && (o = p.substr(s + 1), p = p.substr(0, s)), new d(x, p, o);
  }
  function d(m, l, x) {
    this.type = m, this.subtype = l, this.suffix = x;
  }
  return ee;
}
var Si = ki();
const Ba = {
  10: "shot",
  20: "scene",
  30: "track",
  40: "part",
  50: "album",
  60: "edition",
  70: "collection"
}, G = {
  video: 1,
  audio: 2,
  complex: 3,
  logo: 4,
  subtitle: 17,
  button: 18,
  control: 32
}, Ci = {
  [G.video]: "video",
  [G.audio]: "audio",
  [G.complex]: "complex",
  [G.logo]: "logo",
  [G.subtitle]: "subtitle",
  [G.button]: "button",
  [G.control]: "control"
}, ie = (r) => class extends Error {
  constructor(t) {
    super(t), this.name = r;
  }
};
class Ut extends ie("CouldNotDetermineFileTypeError") {
}
class Xt extends ie("UnsupportedFileTypeError") {
}
class Ii extends ie("UnexpectedFileContentError") {
  constructor(e, t) {
    super(t), this.fileType = e;
  }
  // Override toString to include file type information.
  toString() {
    return `${this.name} (FileType: ${this.fileType}): ${this.message}`;
  }
}
class Ye extends ie("FieldDecodingError") {
}
class Gt extends ie("InternalParserError") {
}
const Ei = (r) => class extends Ii {
  constructor(e) {
    super(r, e);
  }
};
function te(r, e, t) {
  return (r[e] & 1 << t) !== 0;
}
function mt(r, e, t, i) {
  let n = e;
  if (i === "utf-16le") {
    for (; r[n] !== 0 || r[n + 1] !== 0; ) {
      if (n >= t)
        return t;
      n += 2;
    }
    return n;
  }
  for (; r[n] !== 0; ) {
    if (n >= t)
      return t;
    n++;
  }
  return n;
}
function Ai(r) {
  const e = r.indexOf("\0");
  return e === -1 ? r : r.substr(0, e);
}
function Ri(r) {
  const e = r.length;
  if ((e & 1) !== 0)
    throw new Ye("Buffer length must be even");
  for (let t = 0; t < e; t += 2) {
    const i = r[t];
    r[t] = r[t + 1], r[t + 1] = i;
  }
  return r;
}
function Xe(r, e) {
  if (r[0] === 255 && r[1] === 254)
    return Xe(r.subarray(2), e);
  if (e === "utf-16le" && r[0] === 254 && r[1] === 255) {
    if ((r.length & 1) !== 0)
      throw new Ye("Expected even number of octets for 16-bit unicode string");
    return Xe(Ri(r), e);
  }
  return new E(r.length, e).get(r, 0);
}
function za(r) {
  return r = r.replace(/^\x00+/g, ""), r = r.replace(/\x00+$/g, ""), r;
}
function Wt(r, e, t, i) {
  const n = e + ~~(t / 8), a = t % 8;
  let d = r[n];
  d &= 255 >> a;
  const m = 8 - a, l = i - m;
  return l < 0 ? d >>= 8 - a - i : l > 0 && (d <<= l, d |= Wt(r, e, t + m, l)), d;
}
function La(r, e, t) {
  return Wt(r, e, t, 1) === 1;
}
function _i(r) {
  const e = [];
  for (let t = 0, i = r.length; t < i; t++) {
    const n = Number(r.charCodeAt(t)).toString(16);
    e.push(n.length === 1 ? `0${n}` : n);
  }
  return e.join(" ");
}
function Fi(r) {
  return 10 * Math.log10(r);
}
function Mi(r) {
  return 10 ** (r / 10);
}
function Di(r) {
  const e = r.split(" ").map((t) => t.trim().toLowerCase());
  if (e.length >= 1) {
    const t = Number.parseFloat(e[0]);
    return e.length === 2 && e[1] === "db" ? {
      dB: t,
      ratio: Mi(t)
    } : {
      dB: Fi(t),
      ratio: t
    };
  }
}
function Na(r) {
  if (r.length === 0)
    throw new Error("decodeUintBE: empty Uint8Array");
  const e = new DataView(r.buffer, r.byteOffset, r.byteLength);
  return Ue(e);
}
const Ua = {
  0: "Other",
  1: "32x32 pixels 'file icon' (PNG only)",
  2: "Other file icon",
  3: "Cover (front)",
  4: "Cover (back)",
  5: "Leaflet page",
  6: "Media (e.g. label side of CD)",
  7: "Lead artist/lead performer/soloist",
  8: "Artist/performer",
  9: "Conductor",
  10: "Band/Orchestra",
  11: "Composer",
  12: "Lyricist/text writer",
  13: "Recording Location",
  14: "During recording",
  15: "During performance",
  16: "Movie/video screen capture",
  17: "A bright coloured fish",
  18: "Illustration",
  19: "Band/artist logotype",
  20: "Publisher/Studio logotype"
}, $t = {
  lyrics: 1
}, jt = {
  notSynchronized: 0,
  milliseconds: 2
}, Pi = {
  get: (r, e) => r[e + 3] & 127 | r[e + 2] << 7 | r[e + 1] << 14 | r[e] << 21,
  len: 4
}, Xa = {
  len: 10,
  get: (r, e) => ({
    // ID3v2/file identifier   "ID3"
    fileIdentifier: new E(3, "ascii").get(r, e),
    // ID3v2 versionIndex
    version: {
      major: Ne.get(r, e + 3),
      revision: Ne.get(r, e + 4)
    },
    // ID3v2 flags
    flags: {
      // Unsynchronisation
      unsynchronisation: te(r, e + 5, 7),
      // Extended header
      isExtendedHeader: te(r, e + 5, 6),
      // Experimental indicator
      expIndicator: te(r, e + 5, 5),
      footer: te(r, e + 5, 4)
    },
    size: Pi.get(r, e + 6)
  })
}, Ga = {
  len: 10,
  get: (r, e) => ({
    // Extended header size
    size: ye.get(r, e),
    // Extended Flags
    extendedFlags: V.get(r, e + 4),
    // Size of padding
    sizeOfPadding: ye.get(r, e + 6),
    // CRC data present
    crcDataPresent: te(r, e + 4, 31)
  })
}, Bi = {
  len: 1,
  get: (r, e) => {
    switch (r[e]) {
      case 0:
        return { encoding: "latin1" };
      // binary
      case 1:
        return { encoding: "utf-16le", bom: !0 };
      case 2:
        return { encoding: "utf-16le", bom: !1 };
      case 3:
        return { encoding: "utf8", bom: !1 };
      default:
        return { encoding: "utf8", bom: !1 };
    }
  }
}, Oi = {
  len: 4,
  get: (r, e) => ({
    encoding: Bi.get(r, e),
    language: new E(3, "latin1").get(r, e + 1)
  })
}, Wa = {
  len: 6,
  get: (r, e) => {
    const t = Oi.get(r, e);
    return {
      encoding: t.encoding,
      language: t.language,
      timeStampFormat: Y.get(r, e + 4),
      contentType: Y.get(r, e + 5)
    };
  }
}, w = {
  multiple: !1
}, Te = {
  year: w,
  track: w,
  disk: w,
  title: w,
  artist: w,
  artists: { multiple: !0, unique: !0 },
  albumartist: w,
  album: w,
  date: w,
  originaldate: w,
  originalyear: w,
  releasedate: w,
  comment: { multiple: !0, unique: !1 },
  genre: { multiple: !0, unique: !0 },
  picture: { multiple: !0, unique: !0 },
  composer: { multiple: !0, unique: !0 },
  lyrics: { multiple: !0, unique: !1 },
  albumsort: { multiple: !1, unique: !0 },
  titlesort: { multiple: !1, unique: !0 },
  work: { multiple: !1, unique: !0 },
  artistsort: { multiple: !1, unique: !0 },
  albumartistsort: { multiple: !1, unique: !0 },
  composersort: { multiple: !1, unique: !0 },
  lyricist: { multiple: !0, unique: !0 },
  writer: { multiple: !0, unique: !0 },
  conductor: { multiple: !0, unique: !0 },
  remixer: { multiple: !0, unique: !0 },
  arranger: { multiple: !0, unique: !0 },
  engineer: { multiple: !0, unique: !0 },
  producer: { multiple: !0, unique: !0 },
  technician: { multiple: !0, unique: !0 },
  djmixer: { multiple: !0, unique: !0 },
  mixer: { multiple: !0, unique: !0 },
  label: { multiple: !0, unique: !0 },
  grouping: w,
  subtitle: { multiple: !0 },
  discsubtitle: w,
  totaltracks: w,
  totaldiscs: w,
  compilation: w,
  rating: { multiple: !0 },
  bpm: w,
  mood: w,
  media: w,
  catalognumber: { multiple: !0, unique: !0 },
  tvShow: w,
  tvShowSort: w,
  tvSeason: w,
  tvEpisode: w,
  tvEpisodeId: w,
  tvNetwork: w,
  podcast: w,
  podcasturl: w,
  releasestatus: w,
  releasetype: { multiple: !0 },
  releasecountry: w,
  script: w,
  language: w,
  copyright: w,
  license: w,
  encodedby: w,
  encodersettings: w,
  gapless: w,
  barcode: w,
  isrc: { multiple: !0 },
  asin: w,
  musicbrainz_recordingid: w,
  musicbrainz_trackid: w,
  musicbrainz_albumid: w,
  musicbrainz_artistid: { multiple: !0 },
  musicbrainz_albumartistid: { multiple: !0 },
  musicbrainz_releasegroupid: w,
  musicbrainz_workid: w,
  musicbrainz_trmid: w,
  musicbrainz_discid: w,
  acoustid_id: w,
  acoustid_fingerprint: w,
  musicip_puid: w,
  musicip_fingerprint: w,
  website: w,
  "performer:instrument": { multiple: !0, unique: !0 },
  averageLevel: w,
  peakLevel: w,
  notes: { multiple: !0, unique: !1 },
  key: w,
  originalalbum: w,
  originalartist: w,
  discogs_artist_id: { multiple: !0, unique: !0 },
  discogs_release_id: w,
  discogs_label_id: w,
  discogs_master_release_id: w,
  discogs_votes: w,
  discogs_rating: w,
  replaygain_track_peak: w,
  replaygain_track_gain: w,
  replaygain_album_peak: w,
  replaygain_album_gain: w,
  replaygain_track_minmax: w,
  replaygain_album_minmax: w,
  replaygain_undo: w,
  description: { multiple: !0 },
  longDescription: w,
  category: { multiple: !0 },
  hdVideo: w,
  keywords: { multiple: !0 },
  movement: w,
  movementIndex: w,
  movementTotal: w,
  podcastId: w,
  showMovement: w,
  stik: w,
  playCounter: w
};
function zi(r) {
  return Te[r] && !Te[r].multiple;
}
function Li(r) {
  return !Te[r].multiple || Te[r].unique || !1;
}
class P {
  static toIntOrNull(e) {
    const t = Number.parseInt(e, 10);
    return Number.isNaN(t) ? null : t;
  }
  // TODO: a string of 1of1 would fail to be converted
  // converts 1/10 to no : 1, of : 10
  // or 1 to no : 1, of : 0
  static normalizeTrack(e) {
    const t = e.toString().split("/");
    return {
      no: Number.parseInt(t[0], 10) || null,
      of: Number.parseInt(t[1], 10) || null
    };
  }
  constructor(e, t) {
    this.tagTypes = e, this.tagMap = t;
  }
  /**
   * Process and set common tags
   * write common tags to
   * @param tag Native tag
   * @param warnings Register warnings
   * @return common name
   */
  mapGenericTag(e, t) {
    e = { id: e.id, value: e.value }, this.postMap(e, t);
    const i = this.getCommonName(e.id);
    return i ? { id: i, value: e.value } : null;
  }
  /**
   * Convert native tag key to common tag key
   * @param tag Native header tag
   * @return common tag name (alias)
   */
  getCommonName(e) {
    return this.tagMap[e];
  }
  /**
   * Handle post mapping exceptions / correction
   * @param tag Tag e.g. {"©alb", "Buena Vista Social Club")
   * @param warnings Used to register warnings
   */
  postMap(e, t) {
  }
}
P.maxRatingScore = 1;
const Ni = {
  title: "title",
  artist: "artist",
  album: "album",
  year: "year",
  comment: "comment",
  track: "track",
  genre: "genre"
};
class Ui extends P {
  constructor() {
    super(["ID3v1"], Ni);
  }
}
class ne extends P {
  constructor(e, t) {
    const i = {};
    for (const n of Object.keys(t))
      i[n.toUpperCase()] = t[n];
    super(e, i);
  }
  /**
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  getCommonName(e) {
    return this.tagMap[e.toUpperCase()];
  }
}
const Xi = {
  // id3v2.3
  TIT2: "title",
  TPE1: "artist",
  "TXXX:Artists": "artists",
  TPE2: "albumartist",
  TALB: "album",
  TDRV: "date",
  // [ 'date', 'year' ] ToDo: improve 'year' mapping
  /**
   * Original release year
   */
  TORY: "originalyear",
  TPOS: "disk",
  TCON: "genre",
  APIC: "picture",
  TCOM: "composer",
  USLT: "lyrics",
  TSOA: "albumsort",
  TSOT: "titlesort",
  TOAL: "originalalbum",
  TSOP: "artistsort",
  TSO2: "albumartistsort",
  TSOC: "composersort",
  TEXT: "lyricist",
  "TXXX:Writer": "writer",
  TPE3: "conductor",
  // 'IPLS:instrument': 'performer:instrument', // ToDo
  TPE4: "remixer",
  "IPLS:arranger": "arranger",
  "IPLS:engineer": "engineer",
  "IPLS:producer": "producer",
  "IPLS:DJ-mix": "djmixer",
  "IPLS:mix": "mixer",
  TPUB: "label",
  TIT1: "grouping",
  TIT3: "subtitle",
  TRCK: "track",
  TCMP: "compilation",
  POPM: "rating",
  TBPM: "bpm",
  TMED: "media",
  "TXXX:CATALOGNUMBER": "catalognumber",
  "TXXX:MusicBrainz Album Status": "releasestatus",
  "TXXX:MusicBrainz Album Type": "releasetype",
  /**
   * Release country as documented: https://picard.musicbrainz.org/docs/mappings/#cite_note-0
   */
  "TXXX:MusicBrainz Album Release Country": "releasecountry",
  /**
   * Release country as implemented // ToDo: report
   */
  "TXXX:RELEASECOUNTRY": "releasecountry",
  "TXXX:SCRIPT": "script",
  TLAN: "language",
  TCOP: "copyright",
  WCOP: "license",
  TENC: "encodedby",
  TSSE: "encodersettings",
  "TXXX:BARCODE": "barcode",
  "TXXX:ISRC": "isrc",
  TSRC: "isrc",
  "TXXX:ASIN": "asin",
  "TXXX:originalyear": "originalyear",
  "UFID:http://musicbrainz.org": "musicbrainz_recordingid",
  "TXXX:MusicBrainz Release Track Id": "musicbrainz_trackid",
  "TXXX:MusicBrainz Album Id": "musicbrainz_albumid",
  "TXXX:MusicBrainz Artist Id": "musicbrainz_artistid",
  "TXXX:MusicBrainz Album Artist Id": "musicbrainz_albumartistid",
  "TXXX:MusicBrainz Release Group Id": "musicbrainz_releasegroupid",
  "TXXX:MusicBrainz Work Id": "musicbrainz_workid",
  "TXXX:MusicBrainz TRM Id": "musicbrainz_trmid",
  "TXXX:MusicBrainz Disc Id": "musicbrainz_discid",
  "TXXX:ACOUSTID_ID": "acoustid_id",
  "TXXX:Acoustid Id": "acoustid_id",
  "TXXX:Acoustid Fingerprint": "acoustid_fingerprint",
  "TXXX:MusicIP PUID": "musicip_puid",
  "TXXX:MusicMagic Fingerprint": "musicip_fingerprint",
  WOAR: "website",
  // id3v2.4
  // ToDo: In same sequence as defined at http://id3.org/id3v2.4.0-frames
  TDRC: "date",
  // date YYYY-MM-DD
  TYER: "year",
  TDOR: "originaldate",
  // 'TMCL:instrument': 'performer:instrument',
  "TIPL:arranger": "arranger",
  "TIPL:engineer": "engineer",
  "TIPL:producer": "producer",
  "TIPL:DJ-mix": "djmixer",
  "TIPL:mix": "mixer",
  TMOO: "mood",
  // additional mappings:
  SYLT: "lyrics",
  TSST: "discsubtitle",
  TKEY: "key",
  COMM: "comment",
  TOPE: "originalartist",
  // Windows Media Player
  "PRIV:AverageLevel": "averageLevel",
  "PRIV:PeakLevel": "peakLevel",
  // Discogs
  "TXXX:DISCOGS_ARTIST_ID": "discogs_artist_id",
  "TXXX:DISCOGS_ARTISTS": "artists",
  "TXXX:DISCOGS_ARTIST_NAME": "artists",
  "TXXX:DISCOGS_ALBUM_ARTISTS": "albumartist",
  "TXXX:DISCOGS_CATALOG": "catalognumber",
  "TXXX:DISCOGS_COUNTRY": "releasecountry",
  "TXXX:DISCOGS_DATE": "originaldate",
  "TXXX:DISCOGS_LABEL": "label",
  "TXXX:DISCOGS_LABEL_ID": "discogs_label_id",
  "TXXX:DISCOGS_MASTER_RELEASE_ID": "discogs_master_release_id",
  "TXXX:DISCOGS_RATING": "discogs_rating",
  "TXXX:DISCOGS_RELEASED": "date",
  "TXXX:DISCOGS_RELEASE_ID": "discogs_release_id",
  "TXXX:DISCOGS_VOTES": "discogs_votes",
  "TXXX:CATALOGID": "catalognumber",
  "TXXX:STYLE": "genre",
  "TXXX:REPLAYGAIN_TRACK_PEAK": "replaygain_track_peak",
  "TXXX:REPLAYGAIN_TRACK_GAIN": "replaygain_track_gain",
  "TXXX:REPLAYGAIN_ALBUM_PEAK": "replaygain_album_peak",
  "TXXX:REPLAYGAIN_ALBUM_GAIN": "replaygain_album_gain",
  "TXXX:MP3GAIN_MINMAX": "replaygain_track_minmax",
  "TXXX:MP3GAIN_ALBUM_MINMAX": "replaygain_album_minmax",
  "TXXX:MP3GAIN_UNDO": "replaygain_undo",
  MVNM: "movement",
  MVIN: "movementIndex",
  PCST: "podcast",
  TCAT: "category",
  TDES: "description",
  TDRL: "releasedate",
  TGID: "podcastId",
  TKWD: "keywords",
  WFED: "podcasturl",
  GRP1: "grouping",
  PCNT: "playCounter"
};
class Ze extends ne {
  static toRating(e) {
    return {
      source: e.email,
      rating: e.rating > 0 ? (e.rating - 1) / 254 * P.maxRatingScore : void 0
    };
  }
  constructor() {
    super(["ID3v2.3", "ID3v2.4"], Xi);
  }
  /**
   * Handle post mapping exceptions / correction
   * @param tag to post map
   * @param warnings Wil be used to register (collect) warnings
   */
  postMap(e, t) {
    switch (e.id) {
      case "UFID":
        {
          const i = e.value;
          i.owner_identifier === "http://musicbrainz.org" && (e.id += `:${i.owner_identifier}`, e.value = Xe(i.identifier, "latin1"));
        }
        break;
      case "PRIV":
        {
          const i = e.value;
          switch (i.owner_identifier) {
            // decode Windows Media Player
            case "AverageLevel":
            case "PeakValue":
              e.id += `:${i.owner_identifier}`, e.value = i.data.length === 4 ? v.get(i.data, 0) : null, e.value === null && t.addWarning("Failed to parse PRIV:PeakValue");
              break;
            default:
              t.addWarning(`Unknown PRIV owner-identifier: ${i.data}`);
          }
        }
        break;
      case "POPM":
        e.value = Ze.toRating(e.value);
        break;
    }
  }
}
const Gi = {
  Title: "title",
  Author: "artist",
  "WM/AlbumArtist": "albumartist",
  "WM/AlbumTitle": "album",
  "WM/Year": "date",
  // changed to 'year' to 'date' based on Picard mappings; ToDo: check me
  "WM/OriginalReleaseTime": "originaldate",
  "WM/OriginalReleaseYear": "originalyear",
  Description: "comment",
  "WM/TrackNumber": "track",
  "WM/PartOfSet": "disk",
  "WM/Genre": "genre",
  "WM/Composer": "composer",
  "WM/Lyrics": "lyrics",
  "WM/AlbumSortOrder": "albumsort",
  "WM/TitleSortOrder": "titlesort",
  "WM/ArtistSortOrder": "artistsort",
  "WM/AlbumArtistSortOrder": "albumartistsort",
  "WM/ComposerSortOrder": "composersort",
  "WM/Writer": "lyricist",
  "WM/Conductor": "conductor",
  "WM/ModifiedBy": "remixer",
  "WM/Engineer": "engineer",
  "WM/Producer": "producer",
  "WM/DJMixer": "djmixer",
  "WM/Mixer": "mixer",
  "WM/Publisher": "label",
  "WM/ContentGroupDescription": "grouping",
  "WM/SubTitle": "subtitle",
  "WM/SetSubTitle": "discsubtitle",
  // 'WM/PartOfSet': 'totaldiscs',
  "WM/IsCompilation": "compilation",
  "WM/SharedUserRating": "rating",
  "WM/BeatsPerMinute": "bpm",
  "WM/Mood": "mood",
  "WM/Media": "media",
  "WM/CatalogNo": "catalognumber",
  "MusicBrainz/Album Status": "releasestatus",
  "MusicBrainz/Album Type": "releasetype",
  "MusicBrainz/Album Release Country": "releasecountry",
  "WM/Script": "script",
  "WM/Language": "language",
  Copyright: "copyright",
  LICENSE: "license",
  "WM/EncodedBy": "encodedby",
  "WM/EncodingSettings": "encodersettings",
  "WM/Barcode": "barcode",
  "WM/ISRC": "isrc",
  "MusicBrainz/Track Id": "musicbrainz_recordingid",
  "MusicBrainz/Release Track Id": "musicbrainz_trackid",
  "MusicBrainz/Album Id": "musicbrainz_albumid",
  "MusicBrainz/Artist Id": "musicbrainz_artistid",
  "MusicBrainz/Album Artist Id": "musicbrainz_albumartistid",
  "MusicBrainz/Release Group Id": "musicbrainz_releasegroupid",
  "MusicBrainz/Work Id": "musicbrainz_workid",
  "MusicBrainz/TRM Id": "musicbrainz_trmid",
  "MusicBrainz/Disc Id": "musicbrainz_discid",
  "Acoustid/Id": "acoustid_id",
  "Acoustid/Fingerprint": "acoustid_fingerprint",
  "MusicIP/PUID": "musicip_puid",
  "WM/ARTISTS": "artists",
  "WM/InitialKey": "key",
  ASIN: "asin",
  "WM/Work": "work",
  "WM/AuthorURL": "website",
  "WM/Picture": "picture"
};
class Ke extends P {
  static toRating(e) {
    return {
      rating: Number.parseFloat(e + 1) / 5
    };
  }
  constructor() {
    super(["asf"], Gi);
  }
  postMap(e) {
    switch (e.id) {
      case "WM/SharedUserRating": {
        const t = e.id.split(":");
        e.value = Ke.toRating(e.value), e.id = t[0];
        break;
      }
    }
  }
}
const Wi = {
  TT2: "title",
  TP1: "artist",
  TP2: "albumartist",
  TAL: "album",
  TYE: "year",
  COM: "comment",
  TRK: "track",
  TPA: "disk",
  TCO: "genre",
  PIC: "picture",
  TCM: "composer",
  TOR: "originaldate",
  TOT: "originalalbum",
  TXT: "lyricist",
  TP3: "conductor",
  TPB: "label",
  TT1: "grouping",
  TT3: "subtitle",
  TLA: "language",
  TCR: "copyright",
  WCP: "license",
  TEN: "encodedby",
  TSS: "encodersettings",
  WAR: "website",
  PCS: "podcast",
  TCP: "compilation",
  TDR: "date",
  TS2: "albumartistsort",
  TSA: "albumsort",
  TSC: "composersort",
  TSP: "artistsort",
  TST: "titlesort",
  WFD: "podcasturl",
  TBP: "bpm"
};
class $i extends ne {
  constructor() {
    super(["ID3v2.2"], Wi);
  }
}
const ji = {
  Title: "title",
  Artist: "artist",
  Artists: "artists",
  "Album Artist": "albumartist",
  Album: "album",
  Year: "date",
  Originalyear: "originalyear",
  Originaldate: "originaldate",
  Releasedate: "releasedate",
  Comment: "comment",
  Track: "track",
  Disc: "disk",
  DISCNUMBER: "disk",
  // ToDo: backwards compatibility', valid tag?
  Genre: "genre",
  "Cover Art (Front)": "picture",
  "Cover Art (Back)": "picture",
  Composer: "composer",
  Lyrics: "lyrics",
  ALBUMSORT: "albumsort",
  TITLESORT: "titlesort",
  WORK: "work",
  ARTISTSORT: "artistsort",
  ALBUMARTISTSORT: "albumartistsort",
  COMPOSERSORT: "composersort",
  Lyricist: "lyricist",
  Writer: "writer",
  Conductor: "conductor",
  // 'Performer=artist (instrument)': 'performer:instrument',
  MixArtist: "remixer",
  Arranger: "arranger",
  Engineer: "engineer",
  Producer: "producer",
  DJMixer: "djmixer",
  Mixer: "mixer",
  Label: "label",
  Grouping: "grouping",
  Subtitle: "subtitle",
  DiscSubtitle: "discsubtitle",
  Compilation: "compilation",
  BPM: "bpm",
  Mood: "mood",
  Media: "media",
  CatalogNumber: "catalognumber",
  MUSICBRAINZ_ALBUMSTATUS: "releasestatus",
  MUSICBRAINZ_ALBUMTYPE: "releasetype",
  RELEASECOUNTRY: "releasecountry",
  Script: "script",
  Language: "language",
  Copyright: "copyright",
  LICENSE: "license",
  EncodedBy: "encodedby",
  EncoderSettings: "encodersettings",
  Barcode: "barcode",
  ISRC: "isrc",
  ASIN: "asin",
  musicbrainz_trackid: "musicbrainz_recordingid",
  musicbrainz_releasetrackid: "musicbrainz_trackid",
  MUSICBRAINZ_ALBUMID: "musicbrainz_albumid",
  MUSICBRAINZ_ARTISTID: "musicbrainz_artistid",
  MUSICBRAINZ_ALBUMARTISTID: "musicbrainz_albumartistid",
  MUSICBRAINZ_RELEASEGROUPID: "musicbrainz_releasegroupid",
  MUSICBRAINZ_WORKID: "musicbrainz_workid",
  MUSICBRAINZ_TRMID: "musicbrainz_trmid",
  MUSICBRAINZ_DISCID: "musicbrainz_discid",
  Acoustid_Id: "acoustid_id",
  ACOUSTID_FINGERPRINT: "acoustid_fingerprint",
  MUSICIP_PUID: "musicip_puid",
  Weblink: "website",
  REPLAYGAIN_TRACK_GAIN: "replaygain_track_gain",
  REPLAYGAIN_TRACK_PEAK: "replaygain_track_peak",
  MP3GAIN_MINMAX: "replaygain_track_minmax",
  MP3GAIN_UNDO: "replaygain_undo"
};
class qi extends ne {
  constructor() {
    super(["APEv2"], ji);
  }
}
const Hi = {
  "©nam": "title",
  "©ART": "artist",
  aART: "albumartist",
  /**
   * ToDo: Album artist seems to be stored here while Picard documentation says: aART
   */
  "----:com.apple.iTunes:Band": "albumartist",
  "©alb": "album",
  "©day": "date",
  "©cmt": "comment",
  "©com": "comment",
  trkn: "track",
  disk: "disk",
  "©gen": "genre",
  covr: "picture",
  "©wrt": "composer",
  "©lyr": "lyrics",
  soal: "albumsort",
  sonm: "titlesort",
  soar: "artistsort",
  soaa: "albumartistsort",
  soco: "composersort",
  "----:com.apple.iTunes:LYRICIST": "lyricist",
  "----:com.apple.iTunes:CONDUCTOR": "conductor",
  "----:com.apple.iTunes:REMIXER": "remixer",
  "----:com.apple.iTunes:ENGINEER": "engineer",
  "----:com.apple.iTunes:PRODUCER": "producer",
  "----:com.apple.iTunes:DJMIXER": "djmixer",
  "----:com.apple.iTunes:MIXER": "mixer",
  "----:com.apple.iTunes:LABEL": "label",
  "©grp": "grouping",
  "----:com.apple.iTunes:SUBTITLE": "subtitle",
  "----:com.apple.iTunes:DISCSUBTITLE": "discsubtitle",
  cpil: "compilation",
  tmpo: "bpm",
  "----:com.apple.iTunes:MOOD": "mood",
  "----:com.apple.iTunes:MEDIA": "media",
  "----:com.apple.iTunes:CATALOGNUMBER": "catalognumber",
  tvsh: "tvShow",
  tvsn: "tvSeason",
  tves: "tvEpisode",
  sosn: "tvShowSort",
  tven: "tvEpisodeId",
  tvnn: "tvNetwork",
  pcst: "podcast",
  purl: "podcasturl",
  "----:com.apple.iTunes:MusicBrainz Album Status": "releasestatus",
  "----:com.apple.iTunes:MusicBrainz Album Type": "releasetype",
  "----:com.apple.iTunes:MusicBrainz Album Release Country": "releasecountry",
  "----:com.apple.iTunes:SCRIPT": "script",
  "----:com.apple.iTunes:LANGUAGE": "language",
  cprt: "copyright",
  "©cpy": "copyright",
  "----:com.apple.iTunes:LICENSE": "license",
  "©too": "encodedby",
  pgap: "gapless",
  "----:com.apple.iTunes:BARCODE": "barcode",
  "----:com.apple.iTunes:ISRC": "isrc",
  "----:com.apple.iTunes:ASIN": "asin",
  "----:com.apple.iTunes:NOTES": "comment",
  "----:com.apple.iTunes:MusicBrainz Track Id": "musicbrainz_recordingid",
  "----:com.apple.iTunes:MusicBrainz Release Track Id": "musicbrainz_trackid",
  "----:com.apple.iTunes:MusicBrainz Album Id": "musicbrainz_albumid",
  "----:com.apple.iTunes:MusicBrainz Artist Id": "musicbrainz_artistid",
  "----:com.apple.iTunes:MusicBrainz Album Artist Id": "musicbrainz_albumartistid",
  "----:com.apple.iTunes:MusicBrainz Release Group Id": "musicbrainz_releasegroupid",
  "----:com.apple.iTunes:MusicBrainz Work Id": "musicbrainz_workid",
  "----:com.apple.iTunes:MusicBrainz TRM Id": "musicbrainz_trmid",
  "----:com.apple.iTunes:MusicBrainz Disc Id": "musicbrainz_discid",
  "----:com.apple.iTunes:Acoustid Id": "acoustid_id",
  "----:com.apple.iTunes:Acoustid Fingerprint": "acoustid_fingerprint",
  "----:com.apple.iTunes:MusicIP PUID": "musicip_puid",
  "----:com.apple.iTunes:fingerprint": "musicip_fingerprint",
  "----:com.apple.iTunes:replaygain_track_gain": "replaygain_track_gain",
  "----:com.apple.iTunes:replaygain_track_peak": "replaygain_track_peak",
  "----:com.apple.iTunes:replaygain_album_gain": "replaygain_album_gain",
  "----:com.apple.iTunes:replaygain_album_peak": "replaygain_album_peak",
  "----:com.apple.iTunes:replaygain_track_minmax": "replaygain_track_minmax",
  "----:com.apple.iTunes:replaygain_album_minmax": "replaygain_album_minmax",
  "----:com.apple.iTunes:replaygain_undo": "replaygain_undo",
  // Additional mappings:
  gnre: "genre",
  // ToDo: check mapping
  "----:com.apple.iTunes:ALBUMARTISTSORT": "albumartistsort",
  "----:com.apple.iTunes:ARTISTS": "artists",
  "----:com.apple.iTunes:ORIGINALDATE": "originaldate",
  "----:com.apple.iTunes:ORIGINALYEAR": "originalyear",
  "----:com.apple.iTunes:RELEASEDATE": "releasedate",
  // '----:com.apple.iTunes:PERFORMER': 'performer'
  desc: "description",
  ldes: "longDescription",
  "©mvn": "movement",
  "©mvi": "movementIndex",
  "©mvc": "movementTotal",
  "©wrk": "work",
  catg: "category",
  egid: "podcastId",
  hdvd: "hdVideo",
  keyw: "keywords",
  shwm: "showMovement",
  stik: "stik",
  rate: "rating"
}, Vi = "iTunes";
class ft extends ne {
  constructor() {
    super([Vi], Hi);
  }
  postMap(e, t) {
    switch (e.id) {
      case "rate":
        e.value = {
          source: void 0,
          rating: Number.parseFloat(e.value) / 100
        };
        break;
    }
  }
}
const Yi = {
  TITLE: "title",
  ARTIST: "artist",
  ARTISTS: "artists",
  ALBUMARTIST: "albumartist",
  "ALBUM ARTIST": "albumartist",
  ALBUM: "album",
  DATE: "date",
  ORIGINALDATE: "originaldate",
  ORIGINALYEAR: "originalyear",
  RELEASEDATE: "releasedate",
  COMMENT: "comment",
  TRACKNUMBER: "track",
  DISCNUMBER: "disk",
  GENRE: "genre",
  METADATA_BLOCK_PICTURE: "picture",
  COMPOSER: "composer",
  LYRICS: "lyrics",
  ALBUMSORT: "albumsort",
  TITLESORT: "titlesort",
  WORK: "work",
  ARTISTSORT: "artistsort",
  ALBUMARTISTSORT: "albumartistsort",
  COMPOSERSORT: "composersort",
  LYRICIST: "lyricist",
  WRITER: "writer",
  CONDUCTOR: "conductor",
  // 'PERFORMER=artist (instrument)': 'performer:instrument', // ToDo
  REMIXER: "remixer",
  ARRANGER: "arranger",
  ENGINEER: "engineer",
  PRODUCER: "producer",
  DJMIXER: "djmixer",
  MIXER: "mixer",
  LABEL: "label",
  GROUPING: "grouping",
  SUBTITLE: "subtitle",
  DISCSUBTITLE: "discsubtitle",
  TRACKTOTAL: "totaltracks",
  DISCTOTAL: "totaldiscs",
  COMPILATION: "compilation",
  RATING: "rating",
  BPM: "bpm",
  KEY: "key",
  MOOD: "mood",
  MEDIA: "media",
  CATALOGNUMBER: "catalognumber",
  RELEASESTATUS: "releasestatus",
  RELEASETYPE: "releasetype",
  RELEASECOUNTRY: "releasecountry",
  SCRIPT: "script",
  LANGUAGE: "language",
  COPYRIGHT: "copyright",
  LICENSE: "license",
  ENCODEDBY: "encodedby",
  ENCODERSETTINGS: "encodersettings",
  BARCODE: "barcode",
  ISRC: "isrc",
  ASIN: "asin",
  MUSICBRAINZ_TRACKID: "musicbrainz_recordingid",
  MUSICBRAINZ_RELEASETRACKID: "musicbrainz_trackid",
  MUSICBRAINZ_ALBUMID: "musicbrainz_albumid",
  MUSICBRAINZ_ARTISTID: "musicbrainz_artistid",
  MUSICBRAINZ_ALBUMARTISTID: "musicbrainz_albumartistid",
  MUSICBRAINZ_RELEASEGROUPID: "musicbrainz_releasegroupid",
  MUSICBRAINZ_WORKID: "musicbrainz_workid",
  MUSICBRAINZ_TRMID: "musicbrainz_trmid",
  MUSICBRAINZ_DISCID: "musicbrainz_discid",
  ACOUSTID_ID: "acoustid_id",
  ACOUSTID_ID_FINGERPRINT: "acoustid_fingerprint",
  MUSICIP_PUID: "musicip_puid",
  // 'FINGERPRINT=MusicMagic Fingerprint {fingerprint}': 'musicip_fingerprint', // ToDo
  WEBSITE: "website",
  NOTES: "notes",
  TOTALTRACKS: "totaltracks",
  TOTALDISCS: "totaldiscs",
  // Discogs
  DISCOGS_ARTIST_ID: "discogs_artist_id",
  DISCOGS_ARTISTS: "artists",
  DISCOGS_ARTIST_NAME: "artists",
  DISCOGS_ALBUM_ARTISTS: "albumartist",
  DISCOGS_CATALOG: "catalognumber",
  DISCOGS_COUNTRY: "releasecountry",
  DISCOGS_DATE: "originaldate",
  DISCOGS_LABEL: "label",
  DISCOGS_LABEL_ID: "discogs_label_id",
  DISCOGS_MASTER_RELEASE_ID: "discogs_master_release_id",
  DISCOGS_RATING: "discogs_rating",
  DISCOGS_RELEASED: "date",
  DISCOGS_RELEASE_ID: "discogs_release_id",
  DISCOGS_VOTES: "discogs_votes",
  CATALOGID: "catalognumber",
  STYLE: "genre",
  //
  REPLAYGAIN_TRACK_GAIN: "replaygain_track_gain",
  REPLAYGAIN_TRACK_PEAK: "replaygain_track_peak",
  REPLAYGAIN_ALBUM_GAIN: "replaygain_album_gain",
  REPLAYGAIN_ALBUM_PEAK: "replaygain_album_peak",
  // To Sure if these (REPLAYGAIN_MINMAX, REPLAYGAIN_ALBUM_MINMAX & REPLAYGAIN_UNDO) are used for Vorbis:
  REPLAYGAIN_MINMAX: "replaygain_track_minmax",
  REPLAYGAIN_ALBUM_MINMAX: "replaygain_album_minmax",
  REPLAYGAIN_UNDO: "replaygain_undo"
};
class be extends P {
  static toRating(e, t, i) {
    return {
      source: e ? e.toLowerCase() : void 0,
      rating: Number.parseFloat(t) / i * P.maxRatingScore
    };
  }
  constructor() {
    super(["vorbis"], Yi);
  }
  postMap(e) {
    if (e.id === "RATING")
      e.value = be.toRating(void 0, e.value, 100);
    else if (e.id.indexOf("RATING:") === 0) {
      const t = e.id.split(":");
      e.value = be.toRating(t[1], e.value, 1), e.id = t[0];
    }
  }
}
const Zi = {
  IART: "artist",
  // Artist
  ICRD: "date",
  // DateCreated
  INAM: "title",
  // Title
  TITL: "title",
  IPRD: "album",
  // Product
  ITRK: "track",
  IPRT: "track",
  // Additional tag for track index
  COMM: "comment",
  // Comments
  ICMT: "comment",
  // Country
  ICNT: "releasecountry",
  GNRE: "genre",
  // Genre
  IWRI: "writer",
  // WrittenBy
  RATE: "rating",
  YEAR: "year",
  ISFT: "encodedby",
  // Software
  CODE: "encodedby",
  // EncodedBy
  TURL: "website",
  // URL,
  IGNR: "genre",
  // Genre
  IENG: "engineer",
  // Engineer
  ITCH: "technician",
  // Technician
  IMED: "media",
  // Original Media
  IRPD: "album"
  // Product, where the file was intended for
};
class Ki extends P {
  constructor() {
    super(["exif"], Zi);
  }
}
const Ji = {
  "segment:title": "title",
  "album:ARTIST": "albumartist",
  "album:ARTISTSORT": "albumartistsort",
  "album:TITLE": "album",
  "album:DATE_RECORDED": "originaldate",
  "album:DATE_RELEASED": "releasedate",
  "album:PART_NUMBER": "disk",
  "album:TOTAL_PARTS": "totaltracks",
  "track:ARTIST": "artist",
  "track:ARTISTSORT": "artistsort",
  "track:TITLE": "title",
  "track:PART_NUMBER": "track",
  "track:MUSICBRAINZ_TRACKID": "musicbrainz_recordingid",
  "track:MUSICBRAINZ_ALBUMID": "musicbrainz_albumid",
  "track:MUSICBRAINZ_ARTISTID": "musicbrainz_artistid",
  "track:PUBLISHER": "label",
  "track:GENRE": "genre",
  "track:ENCODER": "encodedby",
  "track:ENCODER_OPTIONS": "encodersettings",
  "edition:TOTAL_PARTS": "totaldiscs",
  picture: "picture"
};
class Qi extends ne {
  constructor() {
    super(["matroska"], Ji);
  }
}
const en = {
  NAME: "title",
  AUTH: "artist",
  "(c) ": "copyright",
  ANNO: "comment"
};
class tn extends P {
  constructor() {
    super(["AIFF"], en);
  }
}
class rn {
  constructor() {
    this.tagMappers = {}, [
      new Ui(),
      new $i(),
      new Ze(),
      new ft(),
      new ft(),
      new be(),
      new qi(),
      new Ke(),
      new Ki(),
      new Qi(),
      new tn()
    ].forEach((e) => {
      this.registerTagMapper(e);
    });
  }
  /**
   * Convert native to generic (common) tags
   * @param tagType Originating tag format
   * @param tag     Native tag to map to a generic tag id
   * @param warnings
   * @return Generic tag result (output of this function)
   */
  mapTag(e, t, i) {
    if (this.tagMappers[e])
      return this.tagMappers[e].mapGenericTag(t, i);
    throw new Gt(`No generic tag mapper defined for tag-format: ${e}`);
  }
  registerTagMapper(e) {
    for (const t of e.tagTypes)
      this.tagMappers[t] = e;
  }
}
const Ge = /\[(\d{2}):(\d{2})\.(\d{2,3})]/;
function nn(r) {
  return Ge.test(r) ? sn(r) : an(r);
}
function an(r) {
  return {
    contentType: $t.lyrics,
    timeStampFormat: jt.notSynchronized,
    text: r.trim(),
    syncText: []
  };
}
function sn(r) {
  const e = r.split(`
`), t = [];
  for (const i of e) {
    const n = i.match(Ge);
    if (n) {
      const a = Number.parseInt(n[1], 10), d = Number.parseInt(n[2], 10), m = n[3].length === 3 ? Number.parseInt(n[3], 10) : Number.parseInt(n[3], 10) * 10, l = (a * 60 + d) * 1e3 + m, x = i.replace(Ge, "").trim();
      t.push({ timestamp: l, text: x });
    }
  }
  return {
    contentType: $t.lyrics,
    timeStampFormat: jt.milliseconds,
    text: t.map((i) => i.text).join(`
`),
    syncText: t
  };
}
const q = Q("music-metadata:collector"), on = ["matroska", "APEv2", "vorbis", "ID3v2.4", "ID3v2.3", "ID3v2.2", "exif", "asf", "iTunes", "AIFF", "ID3v1"];
class cn {
  constructor(e) {
    this.format = {
      tagTypes: [],
      trackInfo: []
    }, this.native = {}, this.common = {
      track: { no: null, of: null },
      disk: { no: null, of: null },
      movementIndex: { no: null, of: null }
    }, this.quality = {
      warnings: []
    }, this.commonOrigin = {}, this.originPriority = {}, this.tagMapper = new rn(), this.opts = e;
    let t = 1;
    for (const i of on)
      this.originPriority[i] = t++;
    this.originPriority.artificial = 500, this.originPriority.id3v1 = 600;
  }
  /**
   * @returns {boolean} true if one or more tags have been found
   */
  hasAny() {
    return Object.keys(this.native).length > 0;
  }
  addStreamInfo(e) {
    q(`streamInfo: type=${e.type ? Ci[e.type] : "?"}, codec=${e.codecName}`), this.format.trackInfo.push(e);
  }
  setFormat(e, t) {
    q(`format: ${e} = ${t}`), this.format[e] = t, this.opts?.observer && this.opts.observer({ metadata: this, tag: { type: "format", id: e, value: t } });
  }
  setAudioOnly() {
    this.setFormat("hasAudio", !0), this.setFormat("hasVideo", !1);
  }
  async addTag(e, t, i) {
    q(`tag ${e}.${t} = ${i}`), this.native[e] || (this.format.tagTypes.push(e), this.native[e] = []), this.native[e].push({ id: t, value: i }), await this.toCommon(e, t, i);
  }
  addWarning(e) {
    this.quality.warnings.push({ message: e });
  }
  async postMap(e, t) {
    switch (t.id) {
      case "artist":
        if (this.commonOrigin.artist === this.originPriority[e])
          return this.postMap("artificial", { id: "artists", value: t.value });
        this.common.artists || this.setGenericTag("artificial", { id: "artists", value: t.value });
        break;
      case "artists":
        if ((!this.common.artist || this.commonOrigin.artist === this.originPriority.artificial) && (!this.common.artists || this.common.artists.indexOf(t.value) === -1)) {
          const i = (this.common.artists || []).concat([t.value]), a = { id: "artist", value: ln(i) };
          this.setGenericTag("artificial", a);
        }
        break;
      case "picture":
        return this.postFixPicture(t.value).then((i) => {
          i !== null && (t.value = i, this.setGenericTag(e, t));
        });
      case "totaltracks":
        this.common.track.of = P.toIntOrNull(t.value);
        return;
      case "totaldiscs":
        this.common.disk.of = P.toIntOrNull(t.value);
        return;
      case "movementTotal":
        this.common.movementIndex.of = P.toIntOrNull(t.value);
        return;
      case "track":
      case "disk":
      case "movementIndex": {
        const i = this.common[t.id].of;
        this.common[t.id] = P.normalizeTrack(t.value), this.common[t.id].of = i ?? this.common[t.id].of;
        return;
      }
      case "bpm":
      case "year":
      case "originalyear":
        t.value = Number.parseInt(t.value, 10);
        break;
      case "date": {
        const i = Number.parseInt(t.value.substr(0, 4), 10);
        Number.isNaN(i) || (this.common.year = i);
        break;
      }
      case "discogs_label_id":
      case "discogs_release_id":
      case "discogs_master_release_id":
      case "discogs_artist_id":
      case "discogs_votes":
        t.value = typeof t.value == "string" ? Number.parseInt(t.value, 10) : t.value;
        break;
      case "replaygain_track_gain":
      case "replaygain_track_peak":
      case "replaygain_album_gain":
      case "replaygain_album_peak":
        t.value = Di(t.value);
        break;
      case "replaygain_track_minmax":
        t.value = t.value.split(",").map((i) => Number.parseInt(i, 10));
        break;
      case "replaygain_undo": {
        const i = t.value.split(",").map((n) => Number.parseInt(n, 10));
        t.value = {
          leftChannel: i[0],
          rightChannel: i[1]
        };
        break;
      }
      case "gapless":
      // iTunes gap-less flag
      case "compilation":
      case "podcast":
      case "showMovement":
        t.value = t.value === "1" || t.value === 1;
        break;
      case "isrc": {
        const i = this.common[t.id];
        if (i && i.indexOf(t.value) !== -1)
          return;
        break;
      }
      case "comment":
        typeof t.value == "string" && (t.value = { text: t.value }), t.value.descriptor === "iTunPGAP" && this.setGenericTag(e, { id: "gapless", value: t.value.text === "1" });
        break;
      case "lyrics":
        typeof t.value == "string" && (t.value = nn(t.value));
        break;
    }
    t.value !== null && this.setGenericTag(e, t);
  }
  /**
   * Convert native tags to common tags
   * @returns {IAudioMetadata} Native + common tags
   */
  toCommonMetadata() {
    return {
      format: this.format,
      native: this.native,
      quality: this.quality,
      common: this.common
    };
  }
  /**
   * Fix some common issues with picture object
   * @param picture Picture
   */
  async postFixPicture(e) {
    if (e.data && e.data.length > 0) {
      if (!e.format) {
        const t = await Nt(Uint8Array.from(e.data));
        if (t)
          e.format = t.mime;
        else
          return null;
      }
      switch (e.format = e.format.toLocaleLowerCase(), e.format) {
        case "image/jpg":
          e.format = "image/jpeg";
      }
      return e;
    }
    return this.addWarning("Empty picture tag found"), null;
  }
  /**
   * Convert native tag to common tags
   */
  async toCommon(e, t, i) {
    const n = { id: t, value: i }, a = this.tagMapper.mapTag(e, n, this);
    a && await this.postMap(e, a);
  }
  /**
   * Set generic tag
   */
  setGenericTag(e, t) {
    q(`common.${t.id} = ${t.value}`);
    const i = this.commonOrigin[t.id] || 1e3, n = this.originPriority[e];
    if (zi(t.id))
      if (n <= i)
        this.common[t.id] = t.value, this.commonOrigin[t.id] = n;
      else
        return q(`Ignore native tag (singleton): ${e}.${t.id} = ${t.value}`);
    else if (n === i)
      !Li(t.id) || this.common[t.id].indexOf(t.value) === -1 ? this.common[t.id].push(t.value) : q(`Ignore duplicate value: ${e}.${t.id} = ${t.value}`);
    else if (n < i)
      this.common[t.id] = [t.value], this.commonOrigin[t.id] = n;
    else
      return q(`Ignore native tag (list): ${e}.${t.id} = ${t.value}`);
    this.opts?.observer && this.opts.observer({ metadata: this, tag: { type: "common", id: t.id, value: t.value } });
  }
}
function ln(r) {
  return r.length > 2 ? `${r.slice(0, r.length - 1).join(", ")} & ${r[r.length - 1]}` : r.join(" & ");
}
const un = {
  parserType: "mpeg",
  extensions: [".mp2", ".mp3", ".m2a", ".aac", "aacp"],
  mimeTypes: ["audio/mpeg", "audio/mp3", "audio/aacs", "audio/aacp"],
  async load() {
    return (await import("./MpegParser-C5BItecH.js")).MpegParser;
  }
}, dn = {
  parserType: "apev2",
  extensions: [".ape"],
  mimeTypes: ["audio/ape", "audio/monkeys-audio"],
  async load() {
    return (await Promise.resolve().then(() => Un)).APEv2Parser;
  }
}, pn = {
  parserType: "asf",
  extensions: [".asf"],
  mimeTypes: ["audio/ms-wma", "video/ms-wmv", "audio/ms-asf", "video/ms-asf", "application/vnd.ms-asf"],
  async load() {
    return (await import("./AsfParser-CaBOcbVc.js")).AsfParser;
  }
}, mn = {
  parserType: "dsdiff",
  extensions: [".dff"],
  mimeTypes: ["audio/dsf", "audio/dsd"],
  async load() {
    return (await import("./DsdiffParser-rrHeRsMy.js")).DsdiffParser;
  }
}, fn = {
  parserType: "aiff",
  extensions: [".aif", "aiff", "aifc"],
  mimeTypes: ["audio/aiff", "audio/aif", "audio/aifc", "application/aiff"],
  async load() {
    return (await import("./AiffParser-DlKU6t0A.js")).AIFFParser;
  }
}, hn = {
  parserType: "dsf",
  extensions: [".dsf"],
  mimeTypes: ["audio/dsf"],
  async load() {
    return (await import("./DsfParser-Bv4iJNTt.js")).DsfParser;
  }
}, xn = {
  parserType: "flac",
  extensions: [".flac"],
  mimeTypes: ["audio/flac"],
  async load() {
    return (await import("./FlacParser-DOAz9jX5.js").then((r) => r.d)).FlacParser;
  }
}, gn = {
  parserType: "matroska",
  extensions: [".mka", ".mkv", ".mk3d", ".mks", "webm"],
  mimeTypes: ["audio/matroska", "video/matroska", "audio/webm", "video/webm"],
  async load() {
    return (await import("./MatroskaParser-Diby4Lg3.js")).MatroskaParser;
  }
}, wn = {
  parserType: "mp4",
  extensions: [".mp4", ".m4a", ".m4b", ".m4pa", "m4v", "m4r", "3gp", ".mov", ".movie", ".qt"],
  mimeTypes: ["audio/mp4", "audio/m4a", "video/m4v", "video/mp4", "video/quicktime"],
  async load() {
    return (await import("./MP4Parser-RM4MOAEY.js")).MP4Parser;
  }
}, yn = {
  parserType: "musepack",
  extensions: [".mpc"],
  mimeTypes: ["audio/musepack"],
  async load() {
    return (await import("./MusepackParser-CGHaOV6B.js")).MusepackParser;
  }
}, Tn = {
  parserType: "ogg",
  extensions: [".ogg", ".ogv", ".oga", ".ogm", ".ogx", ".opus", ".spx"],
  mimeTypes: ["audio/ogg", "audio/opus", "audio/speex", "video/ogg"],
  // RFC 7845, RFC 6716, RFC 5574
  async load() {
    return (await import("./OggParser-Ci6-jUP-.js")).OggParser;
  }
}, bn = {
  parserType: "wavpack",
  extensions: [".wv", ".wvp"],
  mimeTypes: ["audio/wavpack"],
  async load() {
    return (await import("./WavPackParser-Qr7ISsI2.js")).WavPackParser;
  }
}, vn = {
  parserType: "riff",
  extensions: [".wav", "wave", ".bwf"],
  mimeTypes: ["audio/vnd.wave", "audio/wav", "audio/wave"],
  async load() {
    return (await import("./WaveParser-e_axm0mU.js")).WaveParser;
  }
}, H = Q("music-metadata:parser:factory");
function kn(r) {
  const e = vi.parse(r), t = Si.parse(e.type);
  return {
    type: t.type,
    subtype: t.subtype,
    suffix: t.suffix,
    parameters: e.parameters
  };
}
class Sn {
  constructor() {
    this.parsers = [], [
      xn,
      un,
      dn,
      wn,
      gn,
      vn,
      Tn,
      pn,
      fn,
      bn,
      yn,
      hn,
      mn
    ].forEach((e) => {
      this.registerParser(e);
    });
  }
  registerParser(e) {
    this.parsers.push(e);
  }
  async parse(e, t, i) {
    if (e.supportsRandomAccess() ? (H("tokenizer supports random-access, scanning for appending headers"), await $n(e, i)) : H("tokenizer does not support random-access, cannot scan for appending headers"), !t) {
      const m = new Uint8Array(4100);
      if (e.fileInfo.mimeType && (t = this.findLoaderForContentType(e.fileInfo.mimeType)), !t && e.fileInfo.path && (t = this.findLoaderForExtension(e.fileInfo.path)), !t) {
        H("Guess parser on content..."), await e.peekBuffer(m, { mayBeLess: !0 });
        const l = await Nt(m, { mpegOffsetTolerance: 10 });
        if (!l || !l.mime)
          throw new Ut("Failed to determine audio format");
        if (H(`Guessed file type is mime=${l.mime}, extension=${l.ext}`), t = this.findLoaderForContentType(l.mime), !t)
          throw new Xt(`Guessed MIME-type not supported: ${l.mime}`);
      }
    }
    H(`Loading ${t.parserType} parser...`);
    const n = new cn(i), a = await t.load(), d = new a(n, e, i ?? {});
    return H(`Parser ${t.parserType} loaded`), await d.parse(), n.format.trackInfo && (n.format.hasAudio === void 0 && n.setFormat("hasAudio", !!n.format.trackInfo.find((m) => m.type === G.audio)), n.format.hasVideo === void 0 && n.setFormat("hasVideo", !!n.format.trackInfo.find((m) => m.type === G.video))), n.toCommonMetadata();
  }
  /**
   * @param filePath - Path, filename or extension to audio file
   * @return Parser submodule name
   */
  findLoaderForExtension(e) {
    if (!e)
      return;
    const t = Cn(e).toLocaleLowerCase() || e;
    return this.parsers.find((i) => i.extensions.indexOf(t) !== -1);
  }
  findLoaderForContentType(e) {
    let t;
    if (!e)
      return;
    try {
      t = kn(e);
    } catch {
      H(`Invalid HTTP Content-Type header value: ${e}`);
      return;
    }
    const i = t.subtype.indexOf("x-") === 0 ? t.subtype.substring(2) : t.subtype;
    return this.parsers.find((n) => n.mimeTypes.find((a) => a.indexOf(`${t.type}/${i}`) !== -1));
  }
  getSupportedMimeTypes() {
    const e = /* @__PURE__ */ new Set();
    return this.parsers.forEach((t) => {
      t.mimeTypes.forEach((i) => {
        e.add(i), e.add(i.replace("/", "/x-"));
      });
    }), Array.from(e);
  }
}
function Cn(r) {
  const e = r.lastIndexOf(".");
  return e === -1 ? "" : r.substring(e);
}
class qt {
  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  constructor(e, t, i) {
    this.metadata = e, this.tokenizer = t, this.options = i;
  }
}
const We = {
  128: "€",
  130: "‚",
  131: "ƒ",
  132: "„",
  133: "…",
  134: "†",
  135: "‡",
  136: "ˆ",
  137: "‰",
  138: "Š",
  139: "‹",
  140: "Œ",
  142: "Ž",
  145: "‘",
  146: "’",
  147: "“",
  148: "”",
  149: "•",
  150: "–",
  151: "—",
  152: "˜",
  153: "™",
  154: "š",
  155: "›",
  156: "œ",
  158: "ž",
  159: "Ÿ"
}, $e = {};
for (const [r, e] of Object.entries(We))
  $e[e] = Number.parseInt(r);
function Se(r, e = "utf-8") {
  switch (e.toLowerCase()) {
    case "utf-8":
    case "utf8":
      return typeof globalThis.TextDecoder < "u" ? new globalThis.TextDecoder("utf-8").decode(r) : En(r);
    case "utf-16le":
      return An(r);
    case "ascii":
      return Rn(r);
    case "latin1":
    case "iso-8859-1":
      return _n(r);
    case "windows-1252":
      return Fn(r);
    default:
      throw new RangeError(`Encoding '${e}' not supported`);
  }
}
function In(r = "", e = "utf-8") {
  switch (e.toLowerCase()) {
    case "utf-8":
    case "utf8":
      return typeof globalThis.TextEncoder < "u" ? new globalThis.TextEncoder().encode(r) : Mn(r);
    case "utf-16le":
      return Dn(r);
    case "ascii":
      return Pn(r);
    case "latin1":
    case "iso-8859-1":
      return Bn(r);
    case "windows-1252":
      return On(r);
    default:
      throw new RangeError(`Encoding '${e}' not supported`);
  }
}
function En(r) {
  let e = "", t = 0;
  for (; t < r.length; ) {
    const i = r[t++];
    if (i < 128)
      e += String.fromCharCode(i);
    else if (i < 224) {
      const n = r[t++] & 63;
      e += String.fromCharCode((i & 31) << 6 | n);
    } else if (i < 240) {
      const n = r[t++] & 63, a = r[t++] & 63;
      e += String.fromCharCode((i & 15) << 12 | n << 6 | a);
    } else {
      const n = r[t++] & 63, a = r[t++] & 63, d = r[t++] & 63;
      let m = (i & 7) << 18 | n << 12 | a << 6 | d;
      m -= 65536, e += String.fromCharCode(55296 + (m >> 10 & 1023), 56320 + (m & 1023));
    }
  }
  return e;
}
function An(r) {
  let e = "";
  for (let t = 0; t < r.length; t += 2)
    e += String.fromCharCode(r[t] | r[t + 1] << 8);
  return e;
}
function Rn(r) {
  return String.fromCharCode(...r.map((e) => e & 127));
}
function _n(r) {
  return String.fromCharCode(...r);
}
function Fn(r) {
  let e = "";
  for (const t of r)
    t >= 128 && t <= 159 && We[t] ? e += We[t] : e += String.fromCharCode(t);
  return e;
}
function Mn(r) {
  const e = [];
  for (let t = 0; t < r.length; t++) {
    const i = r.charCodeAt(t);
    i < 128 ? e.push(i) : i < 2048 ? e.push(192 | i >> 6, 128 | i & 63) : i < 65536 ? e.push(224 | i >> 12, 128 | i >> 6 & 63, 128 | i & 63) : e.push(240 | i >> 18, 128 | i >> 12 & 63, 128 | i >> 6 & 63, 128 | i & 63);
  }
  return new Uint8Array(e);
}
function Dn(r) {
  const e = new Uint8Array(r.length * 2);
  for (let t = 0; t < r.length; t++) {
    const i = r.charCodeAt(t);
    e[t * 2] = i & 255, e[t * 2 + 1] = i >> 8;
  }
  return e;
}
function Pn(r) {
  return new Uint8Array([...r].map((e) => e.charCodeAt(0) & 127));
}
function Bn(r) {
  return new Uint8Array([...r].map((e) => e.charCodeAt(0) & 255));
}
function On(r) {
  return new Uint8Array([...r].map((e) => {
    const t = e.charCodeAt(0);
    return t <= 255 ? t : $e[e] !== void 0 ? $e[e] : 63;
  }));
}
const zn = /^[\x21-\x7e©][\x20-\x7e\x00()]{3}/, Ht = {
  len: 4,
  get: (r, e) => {
    const t = Se(r.subarray(e, e + Ht.len), "latin1");
    if (!t.match(zn))
      throw new Ye(`FourCC contains invalid characters: ${_i(t)} "${t}"`);
    return t;
  },
  put: (r, e, t) => {
    const i = In(t, "latin1");
    if (i.length !== 4)
      throw new Gt("Invalid length");
    return r.set(i, e), e + 4;
  }
}, de = {
  text_utf8: 0,
  binary: 1,
  external_info: 2,
  reserved: 3
}, ht = {
  len: 52,
  get: (r, e) => ({
    // should equal 'MAC '
    ID: Ht.get(r, e),
    // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
    version: v.get(r, e + 4) / 1e3,
    // the number of descriptor bytes (allows later expansion of this header)
    descriptorBytes: v.get(r, e + 8),
    // the number of header APE_HEADER bytes
    headerBytes: v.get(r, e + 12),
    // the number of header APE_HEADER bytes
    seekTableBytes: v.get(r, e + 16),
    // the number of header data bytes (from original file)
    headerDataBytes: v.get(r, e + 20),
    // the number of bytes of APE frame data
    apeFrameDataBytes: v.get(r, e + 24),
    // the high order number of APE frame data bytes
    apeFrameDataBytesHigh: v.get(r, e + 28),
    // the terminating data of the file (not including tag data)
    terminatingDataBytes: v.get(r, e + 32),
    // the MD5 hash of the file (see notes for usage... it's a little tricky)
    fileMD5: new zt(16).get(r, e + 36)
  })
}, Ln = {
  len: 24,
  get: (r, e) => ({
    // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
    compressionLevel: C.get(r, e),
    // any format flags (for future use)
    formatFlags: C.get(r, e + 2),
    // the number of audio blocks in one frame
    blocksPerFrame: v.get(r, e + 4),
    // the number of audio blocks in the final frame
    finalFrameBlocks: v.get(r, e + 8),
    // the total number of frames
    totalFrames: v.get(r, e + 12),
    // the bits per sample (typically 16)
    bitsPerSample: C.get(r, e + 16),
    // the number of channels (1 or 2)
    channel: C.get(r, e + 18),
    // the sample rate (typically 44100)
    sampleRate: v.get(r, e + 20)
  })
}, D = {
  len: 32,
  get: (r, e) => ({
    // should equal 'APETAGEX'
    ID: new E(8, "ascii").get(r, e),
    // equals CURRENT_APE_TAG_VERSION
    version: v.get(r, e + 8),
    // the complete size of the tag, including this footer (excludes header)
    size: v.get(r, e + 12),
    // the number of fields in the tag
    fields: v.get(r, e + 16),
    // reserved for later use (must be zero),
    flags: Vt(v.get(r, e + 20))
  })
}, De = {
  len: 8,
  get: (r, e) => ({
    // Length of assigned value in bytes
    size: v.get(r, e),
    // reserved for later use (must be zero),
    flags: Vt(v.get(r, e + 4))
  })
};
function Vt(r) {
  return {
    containsHeader: pe(r, 31),
    containsFooter: pe(r, 30),
    isHeader: pe(r, 29),
    readOnly: pe(r, 0),
    dataType: (r & 6) >> 1
  };
}
function pe(r, e) {
  return (r & 1 << e) !== 0;
}
const W = Q("music-metadata:parser:APEv2"), xt = "APEv2", gt = "APETAGEX";
class xe extends Ei("APEv2") {
}
function Nn(r, e, t) {
  return new $(r, e, t).tryParseApeHeader();
}
class $ extends qt {
  constructor() {
    super(...arguments), this.ape = {};
  }
  /**
   * Calculate the media file duration
   * @param ah ApeHeader
   * @return {number} duration in seconds
   */
  static calculateDuration(e) {
    let t = e.totalFrames > 1 ? e.blocksPerFrame * (e.totalFrames - 1) : 0;
    return t += e.finalFrameBlocks, t / e.sampleRate;
  }
  /**
   * Calculates the APEv1 / APEv2 first field offset
   * @param tokenizer
   * @param offset
   */
  static async findApeFooterOffset(e, t) {
    const i = new Uint8Array(D.len), n = e.position;
    if (t <= D.len) {
      W(`Offset is too small to read APE footer: offset=${t}`);
      return;
    }
    if (t > D.len) {
      await e.readBuffer(i, { position: t - D.len }), e.setPosition(n);
      const a = D.get(i, 0);
      if (a.ID === "APETAGEX")
        return a.flags.isHeader ? W(`APE Header found at offset=${t - D.len}`) : (W(`APE Footer found at offset=${t - D.len}`), t -= a.size), { footer: a, offset: t };
    }
  }
  static parseTagFooter(e, t, i) {
    const n = D.get(t, t.length - D.len);
    if (n.ID !== gt)
      throw new xe("Unexpected APEv2 Footer ID preamble value");
    return ze(t), new $(e, ze(t), i).parseTags(n);
  }
  /**
   * Parse APEv1 / APEv2 header if header signature found
   */
  async tryParseApeHeader() {
    if (this.tokenizer.fileInfo.size && this.tokenizer.fileInfo.size - this.tokenizer.position < D.len) {
      W("No APEv2 header found, end-of-file reached");
      return;
    }
    const e = await this.tokenizer.peekToken(D);
    if (e.ID === gt)
      return await this.tokenizer.ignore(D.len), this.parseTags(e);
    if (W(`APEv2 header not found at offset=${this.tokenizer.position}`), this.tokenizer.fileInfo.size) {
      const t = this.tokenizer.fileInfo.size - this.tokenizer.position, i = new Uint8Array(t);
      return await this.tokenizer.readBuffer(i), $.parseTagFooter(this.metadata, i, this.options);
    }
  }
  async parse() {
    const e = await this.tokenizer.readToken(ht);
    if (e.ID !== "MAC ")
      throw new xe("Unexpected descriptor ID");
    this.ape.descriptor = e;
    const t = e.descriptorBytes - ht.len, i = await (t > 0 ? this.parseDescriptorExpansion(t) : this.parseHeader());
    return this.metadata.setAudioOnly(), await this.tokenizer.ignore(i.forwardBytes), this.tryParseApeHeader();
  }
  async parseTags(e) {
    const t = new Uint8Array(256);
    let i = e.size - D.len;
    W(`Parse APE tags at offset=${this.tokenizer.position}, size=${i}`);
    for (let n = 0; n < e.fields; n++) {
      if (i < De.len) {
        this.metadata.addWarning(`APEv2 Tag-header: ${e.fields - n} items remaining, but no more tag data to read.`);
        break;
      }
      const a = await this.tokenizer.readToken(De);
      i -= De.len + a.size, await this.tokenizer.peekBuffer(t, { length: Math.min(t.length, i) });
      let d = mt(t, 0, t.length);
      const m = await this.tokenizer.readToken(new E(d, "ascii"));
      switch (await this.tokenizer.ignore(1), i -= m.length + 1, a.flags.dataType) {
        case de.text_utf8: {
          const x = (await this.tokenizer.readToken(new E(a.size, "utf8"))).split(/\x00/g);
          await Promise.all(x.map((p) => this.metadata.addTag(xt, m, p)));
          break;
        }
        case de.binary:
          if (this.options.skipCovers)
            await this.tokenizer.ignore(a.size);
          else {
            const l = new Uint8Array(a.size);
            await this.tokenizer.readBuffer(l), d = mt(l, 0, l.length);
            const x = Se(l.subarray(0, d), "utf-8"), p = l.subarray(d + 1);
            await this.metadata.addTag(xt, m, {
              description: x,
              data: p
            });
          }
          break;
        case de.external_info:
          W(`Ignore external info ${m}`), await this.tokenizer.ignore(a.size);
          break;
        case de.reserved:
          W(`Ignore external info ${m}`), this.metadata.addWarning(`APEv2 header declares a reserved datatype for "${m}"`), await this.tokenizer.ignore(a.size);
          break;
      }
    }
  }
  async parseDescriptorExpansion(e) {
    return await this.tokenizer.ignore(e), this.parseHeader();
  }
  async parseHeader() {
    const e = await this.tokenizer.readToken(Ln);
    if (this.metadata.setFormat("lossless", !0), this.metadata.setFormat("container", "Monkey's Audio"), this.metadata.setFormat("bitsPerSample", e.bitsPerSample), this.metadata.setFormat("sampleRate", e.sampleRate), this.metadata.setFormat("numberOfChannels", e.channel), this.metadata.setFormat("duration", $.calculateDuration(e)), !this.ape.descriptor)
      throw new xe("Missing APE descriptor");
    return {
      forwardBytes: this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes + this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
    };
  }
}
const Un = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  APEv2Parser: $,
  ApeContentError: xe,
  tryParseApeHeader: Nn
}, Symbol.toStringTag, { value: "Module" })), me = Q("music-metadata:parser:ID3v1"), wt = [
  "Blues",
  "Classic Rock",
  "Country",
  "Dance",
  "Disco",
  "Funk",
  "Grunge",
  "Hip-Hop",
  "Jazz",
  "Metal",
  "New Age",
  "Oldies",
  "Other",
  "Pop",
  "R&B",
  "Rap",
  "Reggae",
  "Rock",
  "Techno",
  "Industrial",
  "Alternative",
  "Ska",
  "Death Metal",
  "Pranks",
  "Soundtrack",
  "Euro-Techno",
  "Ambient",
  "Trip-Hop",
  "Vocal",
  "Jazz+Funk",
  "Fusion",
  "Trance",
  "Classical",
  "Instrumental",
  "Acid",
  "House",
  "Game",
  "Sound Clip",
  "Gospel",
  "Noise",
  "Alt. Rock",
  "Bass",
  "Soul",
  "Punk",
  "Space",
  "Meditative",
  "Instrumental Pop",
  "Instrumental Rock",
  "Ethnic",
  "Gothic",
  "Darkwave",
  "Techno-Industrial",
  "Electronic",
  "Pop-Folk",
  "Eurodance",
  "Dream",
  "Southern Rock",
  "Comedy",
  "Cult",
  "Gangsta Rap",
  "Top 40",
  "Christian Rap",
  "Pop/Funk",
  "Jungle",
  "Native American",
  "Cabaret",
  "New Wave",
  "Psychedelic",
  "Rave",
  "Showtunes",
  "Trailer",
  "Lo-Fi",
  "Tribal",
  "Acid Punk",
  "Acid Jazz",
  "Polka",
  "Retro",
  "Musical",
  "Rock & Roll",
  "Hard Rock",
  "Folk",
  "Folk/Rock",
  "National Folk",
  "Swing",
  "Fast-Fusion",
  "Bebob",
  "Latin",
  "Revival",
  "Celtic",
  "Bluegrass",
  "Avantgarde",
  "Gothic Rock",
  "Progressive Rock",
  "Psychedelic Rock",
  "Symphonic Rock",
  "Slow Rock",
  "Big Band",
  "Chorus",
  "Easy Listening",
  "Acoustic",
  "Humour",
  "Speech",
  "Chanson",
  "Opera",
  "Chamber Music",
  "Sonata",
  "Symphony",
  "Booty Bass",
  "Primus",
  "Porn Groove",
  "Satire",
  "Slow Jam",
  "Club",
  "Tango",
  "Samba",
  "Folklore",
  "Ballad",
  "Power Ballad",
  "Rhythmic Soul",
  "Freestyle",
  "Duet",
  "Punk Rock",
  "Drum Solo",
  "A Cappella",
  "Euro-House",
  "Dance Hall",
  "Goa",
  "Drum & Bass",
  "Club-House",
  "Hardcore",
  "Terror",
  "Indie",
  "BritPop",
  "Negerpunk",
  "Polsk Punk",
  "Beat",
  "Christian Gangsta Rap",
  "Heavy Metal",
  "Black Metal",
  "Crossover",
  "Contemporary Christian",
  "Christian Rock",
  "Merengue",
  "Salsa",
  "Thrash Metal",
  "Anime",
  "JPop",
  "Synthpop",
  "Abstract",
  "Art Rock",
  "Baroque",
  "Bhangra",
  "Big Beat",
  "Breakbeat",
  "Chillout",
  "Downtempo",
  "Dub",
  "EBM",
  "Eclectic",
  "Electro",
  "Electroclash",
  "Emo",
  "Experimental",
  "Garage",
  "Global",
  "IDM",
  "Illbient",
  "Industro-Goth",
  "Jam Band",
  "Krautrock",
  "Leftfield",
  "Lounge",
  "Math Rock",
  "New Romantic",
  "Nu-Breakz",
  "Post-Punk",
  "Post-Rock",
  "Psytrance",
  "Shoegaze",
  "Space Rock",
  "Trop Rock",
  "World Music",
  "Neoclassical",
  "Audiobook",
  "Audio Theatre",
  "Neue Deutsche Welle",
  "Podcast",
  "Indie Rock",
  "G-Funk",
  "Dubstep",
  "Garage Rock",
  "Psybient"
], fe = {
  len: 128,
  /**
   * @param buf Buffer possibly holding the 128 bytes ID3v1.1 metadata header
   * @param off Offset in buffer in bytes
   * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
   */
  get: (r, e) => {
    const t = new Z(3).get(r, e);
    return t === "TAG" ? {
      header: t,
      title: new Z(30).get(r, e + 3),
      artist: new Z(30).get(r, e + 33),
      album: new Z(30).get(r, e + 63),
      year: new Z(4).get(r, e + 93),
      comment: new Z(28).get(r, e + 97),
      // ID3v1.1 separator for track
      zeroByte: Y.get(r, e + 127),
      // track: ID3v1.1 field added by Michael Mutschler
      track: Y.get(r, e + 126),
      genre: Y.get(r, e + 127)
    } : null;
  }
};
class Z {
  constructor(e) {
    this.len = e, this.stringType = new E(e, "latin1");
  }
  get(e, t) {
    let i = this.stringType.get(e, t);
    return i = Ai(i), i = i.trim(), i.length > 0 ? i : void 0;
  }
}
class Yt extends qt {
  constructor(e, t, i) {
    super(e, t, i), this.apeHeader = i.apeHeader;
  }
  static getGenre(e) {
    if (e < wt.length)
      return wt[e];
  }
  async parse() {
    if (!this.tokenizer.fileInfo.size) {
      me("Skip checking for ID3v1 because the file-size is unknown");
      return;
    }
    this.apeHeader && (this.tokenizer.ignore(this.apeHeader.offset - this.tokenizer.position), await new $(this.metadata, this.tokenizer, this.options).parseTags(this.apeHeader.footer));
    const e = this.tokenizer.fileInfo.size - fe.len;
    if (this.tokenizer.position > e) {
      me("Already consumed the last 128 bytes");
      return;
    }
    const t = await this.tokenizer.readToken(fe, e);
    if (t) {
      me("ID3v1 header found at: pos=%s", this.tokenizer.fileInfo.size - fe.len);
      const i = ["title", "artist", "album", "comment", "track", "year"];
      for (const a of i)
        t[a] && t[a] !== "" && await this.addTag(a, t[a]);
      const n = Yt.getGenre(t.genre);
      n && await this.addTag("genre", n);
    } else
      me("ID3v1 header not found at: pos=%s", this.tokenizer.fileInfo.size - fe.len);
  }
  async addTag(e, t) {
    await this.metadata.addTag("ID3v1", e, t);
  }
}
async function Xn(r) {
  if (r.fileInfo.size >= 128) {
    const e = new Uint8Array(3), t = r.position;
    return await r.readBuffer(e, { position: r.fileInfo.size - 128 }), r.setPosition(t), Se(e, "latin1") === "TAG";
  }
  return !1;
}
const Gn = "LYRICS200";
async function Wn(r) {
  const e = r.fileInfo.size;
  if (e >= 143) {
    const t = new Uint8Array(15), i = r.position;
    await r.readBuffer(t, { position: e - 143 }), r.setPosition(i);
    const n = Se(t, "latin1");
    if (n.substring(6) === Gn)
      return Number.parseInt(n.substring(0, 6), 10) + 15;
  }
  return 0;
}
async function $n(r, e = {}) {
  let t = r.fileInfo.size;
  if (await Xn(r)) {
    t -= 128;
    const i = await Wn(r);
    t -= i;
  }
  e.apeHeader = await $.findApeFooterOffset(r, t);
}
const yt = Q("music-metadata:parser");
async function jn(r, e = {}) {
  yt(`parseFile: ${r}`);
  const t = await br(r), i = new Sn();
  try {
    const n = i.findLoaderForExtension(r);
    n || yt("Parser could not be determined by file extension");
    try {
      return await i.parse(t, n, e);
    } catch (a) {
      throw (a instanceof Ut || a instanceof Xt) && (a.message += `: ${r}`), a;
    }
  } finally {
    await t.close();
  }
}
const qn = [
  ".mp3",
  ".flac",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".opus",
  ".wma",
  ".aiff",
  ".mp4",
  // Some MP4 files are audio-only
  ".m4p",
  ".amr"
];
async function Hn(r) {
  const e = [];
  try {
    return ge.existsSync(r) ? ge.statSync(r).isDirectory() ? (await Zt(r, e), e) : (console.error(`Path is not a directory: ${r}`), e) : (console.error(`Directory does not exist: ${r}`), e);
  } catch (t) {
    return console.error(`Error scanning directory ${r}:`, t), e;
  }
}
async function Zt(r, e) {
  try {
    const t = ge.readdirSync(r, { withFileTypes: !0 });
    for (const i of t) {
      const n = F.join(r, i.name);
      try {
        if (i.isDirectory())
          await Zt(n, e);
        else if (i.isFile()) {
          const a = F.extname(i.name).toLowerCase();
          if (qn.includes(a)) {
            const d = ge.statSync(n);
            let m;
            try {
              const l = await jn(n);
              let x;
              if (l.common.picture && l.common.picture.length > 0) {
                const p = l.common.picture[0], o = Buffer.from(p.data);
                x = `data:${p.format};base64,${o.toString("base64")}`;
              }
              m = {
                title: l.common.title,
                artist: l.common.artist,
                album: l.common.album,
                albumArtist: l.common.albumartist,
                genre: l.common.genre,
                year: l.common.year,
                track: l.common.track,
                disk: l.common.disk,
                duration: l.format.duration,
                albumArt: x
              };
            } catch (l) {
              console.warn(`Could not extract metadata for ${i.name}:`, l);
            }
            e.push({
              path: n,
              name: i.name,
              extension: a,
              size: d.size,
              metadata: m
            });
          }
        }
      } catch (a) {
        console.warn(`Skipping ${n}:`, a);
      }
    }
  } catch (t) {
    console.error(`Error reading directory ${r}:`, t);
  }
}
var U = {}, Tt;
function Vn() {
  if (Tt) return U;
  Tt = 1;
  var r = U && U.__awaiter || function(s, c, u, g) {
    function h(f) {
      return f instanceof u ? f : new u(function(y) {
        y(f);
      });
    }
    return new (u || (u = Promise))(function(f, y) {
      function S(A) {
        try {
          T(g.next(A));
        } catch (X) {
          y(X);
        }
      }
      function k(A) {
        try {
          T(g.throw(A));
        } catch (X) {
          y(X);
        }
      }
      function T(A) {
        A.done ? f(A.value) : h(A.value).then(S, k);
      }
      T((g = g.apply(s, c || [])).next());
    });
  }, e = U && U.__generator || function(s, c) {
    var u = { label: 0, sent: function() {
      if (f[0] & 1) throw f[1];
      return f[1];
    }, trys: [], ops: [] }, g, h, f, y;
    return y = { next: S(0), throw: S(1), return: S(2) }, typeof Symbol == "function" && (y[Symbol.iterator] = function() {
      return this;
    }), y;
    function S(T) {
      return function(A) {
        return k([T, A]);
      };
    }
    function k(T) {
      if (g) throw new TypeError("Generator is already executing.");
      for (; u; ) try {
        if (g = 1, h && (f = T[0] & 2 ? h.return : T[0] ? h.throw || ((f = h.return) && f.call(h), 0) : h.next) && !(f = f.call(h, T[1])).done) return f;
        switch (h = 0, f && (T = [T[0] & 2, f.value]), T[0]) {
          case 0:
          case 1:
            f = T;
            break;
          case 4:
            return u.label++, { value: T[1], done: !1 };
          case 5:
            u.label++, h = T[1], T = [0];
            continue;
          case 7:
            T = u.ops.pop(), u.trys.pop();
            continue;
          default:
            if (f = u.trys, !(f = f.length > 0 && f[f.length - 1]) && (T[0] === 6 || T[0] === 2)) {
              u = 0;
              continue;
            }
            if (T[0] === 3 && (!f || T[1] > f[0] && T[1] < f[3])) {
              u.label = T[1];
              break;
            }
            if (T[0] === 6 && u.label < f[1]) {
              u.label = f[1], f = T;
              break;
            }
            if (f && u.label < f[2]) {
              u.label = f[2], u.ops.push(T);
              break;
            }
            f[2] && u.ops.pop(), u.trys.pop();
            continue;
        }
        T = c.call(s, u);
      } catch (A) {
        T = [6, A], h = 0;
      } finally {
        g = f = 0;
      }
      if (T[0] & 5) throw T[1];
      return { value: T[0] ? T[1] : void 0, done: !0 };
    }
  }, t = U && U.__importDefault || function(s) {
    return s && s.__esModule ? s : { default: s };
  };
  Object.defineProperty(U, "__esModule", { value: !0 });
  var i = sr, n = or, a = t(I), d = t(we), m = t(Et), l = cr, x = "yt-dlp", p = /\[download\] *(.*) of ([^ ]*)(:? *at *([^ ]*))?(:? *ETA *([^ ]*))?/, o = (
    /** @class */
    (function() {
      function s(c) {
        c === void 0 && (c = x), this.binaryPath = c;
      }
      return s.prototype.getBinaryPath = function() {
        return this.binaryPath;
      }, s.prototype.setBinaryPath = function(c) {
        this.binaryPath = c;
      }, s.createGetMessage = function(c) {
        return new Promise(function(u, g) {
          d.default.get(c, function(h) {
            h.on("error", function(f) {
              return g(f);
            }), u(h);
          });
        });
      }, s.processMessageToFile = function(c, u) {
        var g = a.default.createWriteStream(u);
        return new Promise(function(h, f) {
          c.pipe(g), c.on("error", function(y) {
            return f(y);
          }), g.on("finish", function() {
            return c.statusCode == 200 ? h(c) : f(c);
          });
        });
      }, s.downloadFile = function(c, u) {
        return r(this, void 0, void 0, function() {
          var g, h;
          return e(this, function(f) {
            switch (f.label) {
              case 0:
                g = c, f.label = 1;
              case 1:
                return g ? [4, s.createGetMessage(g)] : [3, 6];
              case 2:
                return h = f.sent(), h.headers.location ? (g = h.headers.location, [3, 5]) : [3, 3];
              case 3:
                return [4, s.processMessageToFile(h, u)];
              case 4:
                return [2, f.sent()];
              case 5:
                return [3, 1];
              case 6:
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      }, s.getGithubReleases = function(c, u) {
        return c === void 0 && (c = 1), u === void 0 && (u = 1), new Promise(function(g, h) {
          var f = "https://api.github.com/repos/yt-dlp/yt-dlp/releases?page=" + c + "&per_page=" + u;
          d.default.get(f, { headers: { "User-Agent": "node" } }, function(y) {
            var S = "";
            y.setEncoding("utf8"), y.on("data", function(k) {
              return S += k;
            }), y.on("error", function(k) {
              return h(k);
            }), y.on("end", function() {
              return y.statusCode == 200 ? g(JSON.parse(S)) : h(y);
            });
          });
        });
      }, s.downloadFromGithub = function(c, u, g) {
        return g === void 0 && (g = m.default.platform()), r(this, void 0, void 0, function() {
          var h, f, y;
          return e(this, function(S) {
            switch (S.label) {
              case 0:
                return h = g == "win32", f = "".concat(x).concat(h ? ".exe" : ""), u ? [3, 2] : [4, s.getGithubReleases(1, 1)];
              case 1:
                u = S.sent()[0].tag_name, S.label = 2;
              case 2:
                return c || (c = "./" + f), y = "https://github.com/yt-dlp/yt-dlp/releases/download/" + u + "/" + f, [4, s.downloadFile(y, c)];
              case 3:
                return S.sent(), !h && a.default.chmodSync(c, "777"), [
                  2
                  /*return*/
                ];
            }
          });
        });
      }, s.prototype.exec = function(c, u, g) {
        c === void 0 && (c = []), u === void 0 && (u = {}), g === void 0 && (g = null), u = s.setDefaultOptions(u);
        var h = new i.EventEmitter(), f = (0, n.spawn)(this.binaryPath, c, u);
        h.ytDlpProcess = f, s.bindAbortSignal(g, f);
        var y = "", S;
        return f.stdout.on("data", function(k) {
          return s.emitYoutubeDlEvents(k.toString(), h);
        }), f.stderr.on("data", function(k) {
          return y += k.toString();
        }), f.on("error", function(k) {
          return S = k;
        }), f.on("close", function(k) {
          k === 0 || f.killed ? h.emit("close", k) : h.emit("error", s.createError(k, S, y));
        }), h;
      }, s.prototype.execPromise = function(c, u, g) {
        var h = this;
        c === void 0 && (c = []), u === void 0 && (u = {}), g === void 0 && (g = null);
        var f, y = new Promise(function(S, k) {
          u = s.setDefaultOptions(u), f = (0, n.execFile)(h.binaryPath, c, u, function(T, A, X) {
            T && k(s.createError(T, null, X)), S(A);
          }), s.bindAbortSignal(g, f);
        });
        return y.ytDlpProcess = f, y;
      }, s.prototype.execStream = function(c, u, g) {
        c === void 0 && (c = []), u === void 0 && (u = {}), g === void 0 && (g = null);
        var h = new l.Readable({ read: function(k) {
        } });
        u = s.setDefaultOptions(u), c = c.concat(["-o", "-"]);
        var f = (0, n.spawn)(this.binaryPath, c, u);
        h.ytDlpProcess = f, s.bindAbortSignal(g, f);
        var y = "", S;
        return f.stdout.on("data", function(k) {
          return h.push(k);
        }), f.stderr.on("data", function(k) {
          var T = k.toString();
          s.emitYoutubeDlEvents(T, h), y += T;
        }), f.on("error", function(k) {
          return S = k;
        }), f.on("close", function(k) {
          if (k === 0 || f.killed)
            h.emit("close"), h.destroy(), h.emit("end");
          else {
            var T = s.createError(k, S, y);
            h.emit("error", T), h.destroy(T);
          }
        }), h;
      }, s.prototype.getExtractors = function() {
        return r(this, void 0, void 0, function() {
          var c;
          return e(this, function(u) {
            switch (u.label) {
              case 0:
                return [4, this.execPromise(["--list-extractors"])];
              case 1:
                return c = u.sent(), [2, c.split(`
`)];
            }
          });
        });
      }, s.prototype.getExtractorDescriptions = function() {
        return r(this, void 0, void 0, function() {
          var c;
          return e(this, function(u) {
            switch (u.label) {
              case 0:
                return [4, this.execPromise(["--extractor-descriptions"])];
              case 1:
                return c = u.sent(), [2, c.split(`
`)];
            }
          });
        });
      }, s.prototype.getHelp = function() {
        return r(this, void 0, void 0, function() {
          var c;
          return e(this, function(u) {
            switch (u.label) {
              case 0:
                return [4, this.execPromise(["--help"])];
              case 1:
                return c = u.sent(), [2, c];
            }
          });
        });
      }, s.prototype.getUserAgent = function() {
        return r(this, void 0, void 0, function() {
          var c;
          return e(this, function(u) {
            switch (u.label) {
              case 0:
                return [4, this.execPromise(["--dump-user-agent"])];
              case 1:
                return c = u.sent(), [2, c];
            }
          });
        });
      }, s.prototype.getVersion = function() {
        return r(this, void 0, void 0, function() {
          var c;
          return e(this, function(u) {
            switch (u.label) {
              case 0:
                return [4, this.execPromise(["--version"])];
              case 1:
                return c = u.sent(), [2, c];
            }
          });
        });
      }, s.prototype.getVideoInfo = function(c) {
        return r(this, void 0, void 0, function() {
          var u;
          return e(this, function(g) {
            switch (g.label) {
              case 0:
                return typeof c == "string" && (c = [c]), !c.includes("-f") && !c.includes("--format") && (c = c.concat(["-f", "best"])), [4, this.execPromise(c.concat(["--dump-json"]))];
              case 1:
                u = g.sent();
                try {
                  return [2, JSON.parse(u)];
                } catch {
                  return [2, JSON.parse("[" + u.replace(/\n/g, ",").slice(0, -1) + "]")];
                }
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      }, s.bindAbortSignal = function(c, u) {
        c?.addEventListener("abort", function() {
          try {
            m.default.platform() === "win32" ? (0, n.execSync)("taskkill /pid ".concat(u.pid, " /T /F")) : (0, n.execSync)("pgrep -P ".concat(u.pid, " | xargs -L 1 kill"));
          } catch {
          } finally {
            u.kill();
          }
        });
      }, s.setDefaultOptions = function(c) {
        return c.maxBuffer || (c.maxBuffer = 1024 * 1024 * 1024), c;
      }, s.createError = function(c, u, g) {
        var h = `
Error code: ` + c;
        return u && (h += `

Process error:
` + u), g && (h += `

Stderr:
` + g), new Error(h);
      }, s.emitYoutubeDlEvents = function(c, u) {
        for (var g = c.split(/\r|\n/g).filter(Boolean), h = 0, f = g; h < f.length; h++) {
          var y = f[h];
          if (y[0] == "[") {
            var S = y.match(p);
            if (S) {
              var k = {};
              k.percent = parseFloat(S[1].replace("%", "")), k.totalSize = S[2].replace("~", ""), k.currentSpeed = S[4], k.eta = S[6], u.emit("progress", k);
            }
            var T = y.split(" ")[0].replace("[", "").replace("]", ""), A = y.substring(y.indexOf(" "), y.length);
            u.emit("ytDlpEvent", T, A);
          }
        }
      }, s;
    })()
  );
  return U.default = o, U;
}
var Yn = Vn();
const Zn = /* @__PURE__ */ He(Yn), Kn = It(At);
let Pe = null, Be = 0;
const bt = 1e4;
async function Jn(r) {
  try {
    const { stdout: e } = await Kn(r, ["--version"]);
    return e.trim();
  } catch (e) {
    return console.error("Failed to get installed version:", e), null;
  }
}
async function Qn() {
  try {
    return new Promise((r, e) => {
      we.get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
        headers: { "User-Agent": "music-sync-app" }
      }, (t) => {
        let i = "";
        t.on("data", (n) => {
          i += n;
        }), t.on("end", () => {
          try {
            const n = JSON.parse(i);
            r(n.tag_name || null);
          } catch (n) {
            e(n);
          }
        });
      }).on("error", e);
    });
  } catch (r) {
    return console.error("Failed to get latest version:", r), null;
  }
}
async function ea(r, e) {
  e?.({
    status: "version-check",
    message: "Checking yt-dlp version..."
  });
  const [t, i] = await Promise.all([
    Jn(r),
    Qn()
  ]);
  if (!t || !i)
    return { isUpToDate: !1, needsUpdate: !1 };
  const n = t === i;
  return {
    isUpToDate: n,
    installedVersion: t,
    latestVersion: i,
    needsUpdate: !n
  };
}
async function vt(r, e) {
  return new Promise((t, i) => {
    new Promise((a, d) => {
      we.get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
        headers: { "User-Agent": "music-sync-app" }
      }, (m) => {
        let l = "";
        m.on("data", (x) => {
          l += x;
        }), m.on("end", () => {
          try {
            a(JSON.parse(l));
          } catch (x) {
            d(x);
          }
        });
      }).on("error", d);
    }).then(async (a) => {
      const d = a.assets.find(
        (o) => process.platform === "win32" ? o.name.includes("yt-dlp.exe") : o.name.includes("yt-dlp") && !o.name.includes(".exe")
      );
      if (!d) {
        i(new Error("Binary not found in release"));
        return;
      }
      e?.({
        status: "downloading",
        message: "yt-dlp binary downloading...",
        percentage: 0
      });
      const m = I.createWriteStream(r);
      let l = 0;
      const x = d.size;
      we.get(d.browser_download_url, {
        headers: { "User-Agent": "music-sync-app" }
      }, (o) => {
        o.on("data", (s) => {
          l += s.length;
          const c = x > 0 ? l / x * 100 : 0;
          e?.({
            status: "downloading",
            message: "yt-dlp binary downloading...",
            percentage: Math.min(c, 99)
          }), m.write(s);
        }), o.on("end", () => {
          m.end(), process.platform !== "win32" && I.chmodSync(r, 493), e?.({
            status: "downloaded",
            message: "yt-dlp binary downloaded",
            percentage: 100
          }), t();
        });
      }).on("error", (o) => {
        m.close();
        try {
          I.existsSync(r) && I.unlinkSync(r);
        } catch {
        }
        i(o);
      });
    }).catch(i);
  });
}
async function ta(r) {
  if (!Pe) {
    const e = B.getPath("userData"), t = M.join(e, "yt-dlp-binaries");
    I.existsSync(t) || I.mkdirSync(t, { recursive: !0 });
    const i = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp", n = M.join(t, i);
    if (I.existsSync(n)) {
      const a = await ea(n, r);
      if (a.needsUpdate && a.installedVersion && a.latestVersion) {
        r?.({
          status: "updating",
          message: `Updating yt-dlp from ${a.installedVersion} to ${a.latestVersion}...`,
          percentage: 0
        });
        try {
          await vt(n, r), r?.({
            status: "downloaded",
            message: `yt-dlp updated to ${a.latestVersion}`,
            percentage: 100
          }), await new Promise((d) => setTimeout(d, 500)), r?.({
            status: "installed",
            message: "yt-dlp binary updated"
          });
        } catch (d) {
          console.error("Failed to update yt-dlp binary:", d), r?.({
            status: "checking",
            message: "Update failed, using existing version"
          });
        }
      } else a.isUpToDate && a.installedVersion && (r?.({
        status: "checking",
        message: `yt-dlp is up to date (${a.installedVersion}). Starting download...`
      }), await new Promise((d) => setTimeout(d, 500)));
    } else {
      r?.({
        status: "not-found",
        message: "yt-dlp binary not found"
      }), r?.({
        status: "downloading",
        message: "yt-dlp binary downloading...",
        percentage: 0
      });
      try {
        await vt(n, r), r?.({
          status: "downloaded",
          message: "yt-dlp binary downloaded",
          percentage: 100
        }), await new Promise((a) => setTimeout(a, 500)), r?.({
          status: "installed",
          message: "yt-dlp binary installed"
        });
      } catch (a) {
        throw console.error("Failed to download yt-dlp binary:", a), new Error("Failed to download yt-dlp binary. Please check your internet connection.");
      }
    }
    Pe = new Zn(n);
  }
  return Pe;
}
async function ra(r, e) {
  try {
    return (await e.execPromise([
      r,
      "--get-title",
      "--no-warnings"
    ])).trim() || "Unknown Title";
  } catch (t) {
    return console.error("Failed to get video title:", t), "Unknown Title";
  }
}
async function ia(r) {
  return new Promise(async (e) => {
    try {
      const t = await ta(r.onBinaryProgress), n = Date.now() - Be;
      if (n < bt && Be > 0) {
        const p = bt - n;
        r.onBinaryProgress?.({
          status: "checking",
          message: `Waiting ${Math.ceil(p / 1e3)} seconds to avoid rate limiting...`
        }), await new Promise((o) => setTimeout(o, p));
      }
      Be = Date.now();
      const a = await ra(r.url, t);
      r.onTitleReceived?.(a), I.existsSync(r.outputPath) || I.mkdirSync(r.outputPath, { recursive: !0 });
      const d = M.join(r.outputPath, "%(title)s.%(ext)s"), m = t.exec([
        r.url,
        "--extract-audio",
        "--audio-format",
        "mp3",
        "--audio-quality",
        "0",
        // Best quality
        "--embed-thumbnail",
        // Embed thumbnail
        "--add-metadata",
        // Add metadata
        "--write-thumbnail",
        // Save thumbnail separately
        "--output",
        d,
        "--newline",
        "--progress",
        "--no-warnings"
      ]);
      let l = null, x = !1;
      if (m.on("progress", (p) => {
        if (r.onProgress && !x) {
          const o = p.percent || 0, s = p.downloaded || 0, c = p.total || 0, u = p.speed || "0 B/s", g = p.eta || "--:--";
          r.onProgress({
            percentage: o,
            downloaded: s,
            total: c,
            speed: typeof u == "string" ? u : `${u} B/s`,
            eta: typeof g == "string" ? g : "--:--"
          });
        }
      }), m.on("ytDlpEvent", (p, o) => {
        p === "download" && o.filename && (l = o.filename);
      }), m.on("error", (p) => {
        x = !0, e({
          success: !1,
          error: p.message
        });
      }), await new Promise((p, o) => {
        m.on("close", (s) => {
          s === 0 || s === null ? p() : o(new Error(`yt-dlp exited with code ${s}`));
        }), m.on("error", o);
      }), l && I.existsSync(l))
        e({
          success: !0,
          filePath: l,
          title: a
        });
      else {
        const p = I.readdirSync(r.outputPath).map((o) => ({
          name: o,
          path: M.join(r.outputPath, o),
          time: I.statSync(M.join(r.outputPath, o)).mtime.getTime()
        })).filter((o) => o.name.endsWith(".mp3")).sort((o, s) => s.time - o.time);
        p.length > 0 ? e({
          success: !0,
          filePath: p[0].path,
          title: a
        }) : e({
          success: !1,
          error: "Download completed but file not found"
        });
      }
    } catch (t) {
      e({
        success: !1,
        error: t instanceof Error ? t.message : "Unknown error"
      });
    }
  });
}
const na = F.dirname(St(import.meta.url));
process.env.APP_ROOT = F.join(na, "..");
const Kt = process.env.VITE_DEV_SERVER_URL, aa = F.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Kt ? F.join(process.env.APP_ROOT, "public") : aa;
let J = null, Jt = !1;
function sa() {
  const r = z.getAllWindows(), t = r.length > 0 && r[0].isVisible();
  return kt.buildFromTemplate([
    {
      label: t ? "Hide" : "Show",
      click: () => {
        const i = z.getAllWindows();
        if (i.length === 0)
          ve();
        else {
          const n = i[0];
          n.isVisible() ? n.hide() : (n.show(), n.focus());
        }
        re();
      }
    },
    { type: "separator" },
    {
      label: Jt ? "Pause" : "Play",
      click: () => {
        const i = z.getAllWindows();
        i.length > 0 && i[0].webContents.send("tray-play-pause");
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        B.quit();
      }
    }
  ]);
}
function re() {
  if (J) {
    const r = sa();
    J.setContextMenu(r);
  }
}
function oa(r) {
  Jt = r, re();
}
function je(r) {
  re();
}
function ca() {
  const r = Kt ? F.join(process.env.APP_ROOT, "src", "assets", "trayIcon.svg") : F.join(process.env.APP_ROOT, "dist", "assets", "trayIcon.svg"), e = rr.createFromPath(r);
  return J = new ir(e), J.setToolTip("Music Sync App"), re(), J.on("click", () => {
    const t = z.getAllWindows();
    if (t.length === 0)
      ve();
    else {
      const i = t[0];
      i.isVisible() ? i.hide() : (i.show(), i.focus());
    }
    re();
  }), J;
}
const Ce = It(At);
async function la() {
  const r = B.getPath("userData"), e = M.join(r, "yt-dlp-binaries"), t = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp", i = M.join(e, t);
  if (!I.existsSync(i))
    return {
      name: "yt-dlp",
      installed: !1,
      version: null,
      path: null
    };
  try {
    const { stdout: n } = await Ce(i, ["--version"]);
    return {
      name: "yt-dlp",
      installed: !0,
      version: n.trim(),
      path: i
    };
  } catch {
    return {
      name: "yt-dlp",
      installed: !0,
      version: "Unknown",
      path: i
    };
  }
}
async function ua() {
  const r = B.getPath("userData"), e = M.join(r, "ffmpeg-binaries"), t = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg", i = M.join(e, t);
  if (!I.existsSync(i))
    return {
      name: "FFmpeg",
      installed: !1,
      version: null,
      path: null
    };
  try {
    const { stdout: n } = await Ce(i, ["-version"]), a = n.match(/ffmpeg version (\S+)/);
    return {
      name: "FFmpeg",
      installed: !0,
      version: a ? a[1] : "Unknown",
      path: i
    };
  } catch {
    return {
      name: "FFmpeg",
      installed: !0,
      version: "Unknown",
      path: i
    };
  }
}
async function da() {
  const r = B.getPath("userData"), e = M.join(r, "ffmpeg-binaries"), t = process.platform === "win32" ? "ffprobe.exe" : "ffprobe", i = M.join(e, t);
  if (!I.existsSync(i))
    return {
      name: "FFprobe",
      installed: !1,
      version: null,
      path: null
    };
  try {
    const { stdout: n } = await Ce(i, ["-version"]), a = n.match(/ffprobe version (\S+)/);
    return {
      name: "FFprobe",
      installed: !0,
      version: a ? a[1] : "Unknown",
      path: i
    };
  } catch {
    return {
      name: "FFprobe",
      installed: !0,
      version: "Unknown",
      path: i
    };
  }
}
async function pa() {
  const r = B.getPath("userData"), e = M.join(r, "chromaprint-binaries"), t = process.platform === "win32" ? "fpcalc.exe" : "fpcalc", i = M.join(e, t);
  if (!I.existsSync(i))
    return {
      name: "fpcalc",
      installed: !1,
      version: null,
      path: null
    };
  try {
    const { stdout: n } = await Ce(i, ["-version"]), a = n.match(/fpcalc version (\S+)/);
    return {
      name: "fpcalc",
      installed: !0,
      version: a ? a[1] : "Unknown",
      path: i
    };
  } catch {
    return {
      name: "fpcalc",
      installed: !0,
      version: "Unknown",
      path: i
    };
  }
}
async function ma() {
  const [r, e, t, i] = await Promise.all([
    la(),
    ua(),
    da(),
    pa()
  ]);
  return [r, e, t, i];
}
const fa = "app-config.json";
function Qt() {
  return M.join(B.getPath("userData"), fa);
}
function ha() {
  try {
    const r = Qt();
    if (I.existsSync(r)) {
      const e = I.readFileSync(r, "utf-8"), t = JSON.parse(e);
      return {
        musicFolderPath: t.musicFolderPath || null,
        downloadFolderPath: t.downloadFolderPath || null
      };
    }
  } catch (r) {
    console.error("Error reading config:", r);
  }
  return {
    musicFolderPath: null,
    downloadFolderPath: null
  };
}
function xa(r) {
  try {
    const e = Qt(), t = {
      musicFolderPath: r.musicFolderPath,
      downloadFolderPath: r.downloadFolderPath
    };
    I.writeFileSync(e, JSON.stringify(t, null, 2), "utf-8");
  } catch (e) {
    throw console.error("Error saving config:", e), e;
  }
}
function ga() {
  O.handle("scan-music-folder", async (r, e) => {
    try {
      return await Hn(e);
    } catch (t) {
      throw console.error("Error scanning folder:", t), t;
    }
  }), O.handle("select-music-folder", async () => {
    const r = await Qe.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Music Folder"
    });
    return !r.canceled && r.filePaths.length > 0 ? r.filePaths[0] : null;
  }), O.handle("get-settings", async () => {
    try {
      return ha();
    } catch (r) {
      return console.error("Error getting settings:", r), {
        musicFolderPath: null,
        downloadFolderPath: null
      };
    }
  }), O.handle("save-settings", async (r, e) => {
    try {
      return xa(e), { success: !0 };
    } catch (t) {
      return console.error("Error saving settings:", t), {
        success: !1,
        error: t instanceof Error ? t.message : "Unknown error"
      };
    }
  }), O.handle("select-download-folder", async () => {
    const r = await Qe.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Download Folder"
    });
    return !r.canceled && r.filePaths.length > 0 ? r.filePaths[0] : null;
  }), O.on("playback-state-changed", (r, e) => {
    oa(e);
  }), O.on("window-visibility-changed", (r, e) => {
    je();
  }), O.on("window-minimize", (r) => {
    z.fromWebContents(r.sender)?.minimize();
  }), O.on("window-maximize", (r) => {
    const e = z.fromWebContents(r.sender);
    e?.isMaximized() ? (e.unmaximize(), e.webContents.send("window-state-changed", !1)) : (e?.maximize(), e?.webContents.send("window-state-changed", !0));
  }), O.on("window-close", (r) => {
    z.fromWebContents(r.sender)?.close();
  }), O.handle("download-youtube", async (r, e, t) => {
    const i = z.fromWebContents(r.sender);
    try {
      return await ia({
        url: e,
        outputPath: t,
        onProgress: (a) => {
          i?.webContents.send("download-progress", a);
        },
        onBinaryProgress: (a) => {
          i?.webContents.send("binary-download-progress", a);
        },
        onTitleReceived: (a) => {
          i?.webContents.send("download-title", a);
        }
      });
    } catch (n) {
      return console.error("YouTube download error:", n), {
        success: !1,
        error: n instanceof Error ? n.message : "Unknown error"
      };
    }
  }), O.handle("get-binary-statuses", async () => {
    try {
      return await ma();
    } catch (r) {
      return console.error("Error getting binary statuses:", r), [];
    }
  });
}
kt.setApplicationMenu(null);
ga();
lr();
B.whenReady().then(() => {
  Oe.register("F12", () => {
    z.getAllWindows().forEach((e) => {
      e.webContents.isDevToolsOpened() ? e.webContents.closeDevTools() : e.webContents.openDevTools();
    });
  }), Oe.register("CommandOrControl+Shift+I", () => {
    z.getAllWindows().forEach((e) => {
      e.webContents.isDevToolsOpened() ? e.webContents.closeDevTools() : e.webContents.openDevTools();
    });
  });
});
B.on("will-quit", () => {
  Oe.unregisterAll();
});
B.whenReady().then(async () => {
  const r = ve();
  ca(), r.on("show", () => {
    je();
  }), r.on("hide", () => {
    je();
  });
});
export {
  Ua as A,
  qt as B,
  Pt as C,
  Ma as D,
  _ as E,
  Ht as F,
  Se as G,
  wt as H,
  Or as I,
  Nn as J,
  Ai as K,
  Xa as L,
  Yt as M,
  Dt as N,
  Bi as O,
  mt as P,
  Na as Q,
  Oi as R,
  E as S,
  G as T,
  ye as U,
  Wa as V,
  Ga as W,
  Pi as X,
  V as a,
  Y as b,
  Q as c,
  zt as d,
  Xe as e,
  v as f,
  Wt as g,
  Pa as h,
  La as i,
  Ot as j,
  C as k,
  te as l,
  Ei as m,
  Wr as n,
  ze as o,
  Xr as p,
  Ur as q,
  Vr as r,
  za as s,
  qr as t,
  Da as u,
  Gr as v,
  Ba as w,
  Bt as x,
  Nr as y,
  Ne as z
};
