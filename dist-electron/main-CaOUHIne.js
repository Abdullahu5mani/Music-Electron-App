import { app, BrowserWindow, nativeImage, Tray, Menu, ipcMain, dialog, globalShortcut } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { open } from "node:fs/promises";
import require$$1 from "tty";
import require$$1$1, { promisify } from "util";
import require$$0 from "os";
import require$$0$1 from "events";
import require$$1$2, { execFile } from "child_process";
import fs$1 from "fs";
import https from "https";
import require$$5 from "stream";
import path$1 from "path";
import { createRequire } from "module";
const __dirname$2 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$2, "..");
const VITE_DEV_SERVER_URL$1 = process.env["VITE_DEV_SERVER_URL"];
path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST$1 = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL$1 ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST$1;
let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 800,
    // Default width
    height: 700,
    // Default height
    minWidth: 450,
    // Minimum width
    minHeight: 600,
    // Minimum height
    frame: false,
    // Remove default frame
    titleBarStyle: "hidden",
    // Hide title bar (macOS)
    backgroundColor: "#1a1a1a",
    // Match app background
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$2, "preload.mjs"),
      webSecurity: false,
      // Allow loading local files via file:// protocol for audio playback
      allowRunningInsecureContent: true,
      // Allow loading local resources
      devTools: true
      // Keep dev tools enabled
    }
  });
  win.on("maximize", () => {
    win?.webContents.send("window-state-changed", true);
  });
  win.on("unmaximize", () => {
    win?.webContents.send("window-state-changed", false);
  });
  win.setMenuBarVisibility(false);
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
    if (win) {
      win.webContents.send("window-state-changed", win.isMaximized());
    }
  });
  if (VITE_DEV_SERVER_URL$1) {
    win.webContents.openDevTools();
  }
  if (VITE_DEV_SERVER_URL$1) {
    win.loadURL(VITE_DEV_SERVER_URL$1);
  } else {
    win.loadFile(path.join(RENDERER_DIST$1, "index.html"));
  }
  return win;
}
function setupWindowEvents() {
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
      win = null;
    }
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
const defaultMessages = "End-Of-Stream";
class EndOfStreamError extends Error {
  constructor() {
    super(defaultMessages);
    this.name = "EndOfStreamError";
  }
}
class AbortError extends Error {
  constructor(message = "The operation was aborted") {
    super(message);
    this.name = "AbortError";
  }
}
class AbstractStreamReader {
  constructor() {
    this.endOfStream = false;
    this.interrupted = false;
    this.peekQueue = [];
  }
  async peek(uint8Array, mayBeLess = false) {
    const bytesRead = await this.read(uint8Array, mayBeLess);
    this.peekQueue.push(uint8Array.subarray(0, bytesRead));
    return bytesRead;
  }
  async read(buffer, mayBeLess = false) {
    if (buffer.length === 0) {
      return 0;
    }
    let bytesRead = this.readFromPeekBuffer(buffer);
    if (!this.endOfStream) {
      bytesRead += await this.readRemainderFromStream(buffer.subarray(bytesRead), mayBeLess);
    }
    if (bytesRead === 0 && !mayBeLess) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }
  /**
   * Read chunk from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @returns Number of bytes read
   */
  readFromPeekBuffer(buffer) {
    let remaining = buffer.length;
    let bytesRead = 0;
    while (this.peekQueue.length > 0 && remaining > 0) {
      const peekData = this.peekQueue.pop();
      if (!peekData)
        throw new Error("peekData should be defined");
      const lenCopy = Math.min(peekData.length, remaining);
      buffer.set(peekData.subarray(0, lenCopy), bytesRead);
      bytesRead += lenCopy;
      remaining -= lenCopy;
      if (lenCopy < peekData.length) {
        this.peekQueue.push(peekData.subarray(lenCopy));
      }
    }
    return bytesRead;
  }
  async readRemainderFromStream(buffer, mayBeLess) {
    let bytesRead = 0;
    while (bytesRead < buffer.length && !this.endOfStream) {
      if (this.interrupted) {
        throw new AbortError();
      }
      const chunkLen = await this.readFromStream(buffer.subarray(bytesRead), mayBeLess);
      if (chunkLen === 0)
        break;
      bytesRead += chunkLen;
    }
    if (!mayBeLess && bytesRead < buffer.length) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }
}
class WebStreamReader extends AbstractStreamReader {
  constructor(reader) {
    super();
    this.reader = reader;
  }
  async abort() {
    return this.close();
  }
  async close() {
    this.reader.releaseLock();
  }
}
class WebStreamByobReader extends WebStreamReader {
  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  async readFromStream(buffer, mayBeLess) {
    if (buffer.length === 0)
      return 0;
    const result = await this.reader.read(new Uint8Array(buffer.length), { min: mayBeLess ? void 0 : buffer.length });
    if (result.done) {
      this.endOfStream = result.done;
    }
    if (result.value) {
      buffer.set(result.value);
      return result.value.length;
    }
    return 0;
  }
}
class WebStreamDefaultReader extends AbstractStreamReader {
  constructor(reader) {
    super();
    this.reader = reader;
    this.buffer = null;
  }
  /**
   * Copy chunk to target, and store the remainder in this.buffer
   */
  writeChunk(target, chunk) {
    const written = Math.min(chunk.length, target.length);
    target.set(chunk.subarray(0, written));
    if (written < chunk.length) {
      this.buffer = chunk.subarray(written);
    } else {
      this.buffer = null;
    }
    return written;
  }
  /**
   * Read from stream
   * @param buffer - Target Uint8Array (or Buffer) to store data read from stream in
   * @param mayBeLess - If true, may fill the buffer partially
   * @protected Bytes read
   */
  async readFromStream(buffer, mayBeLess) {
    if (buffer.length === 0)
      return 0;
    let totalBytesRead = 0;
    if (this.buffer) {
      totalBytesRead += this.writeChunk(buffer, this.buffer);
    }
    while (totalBytesRead < buffer.length && !this.endOfStream) {
      const result = await this.reader.read();
      if (result.done) {
        this.endOfStream = true;
        break;
      }
      if (result.value) {
        totalBytesRead += this.writeChunk(buffer.subarray(totalBytesRead), result.value);
      }
    }
    if (!mayBeLess && totalBytesRead === 0 && this.endOfStream) {
      throw new EndOfStreamError();
    }
    return totalBytesRead;
  }
  abort() {
    this.interrupted = true;
    return this.reader.cancel();
  }
  async close() {
    await this.abort();
    this.reader.releaseLock();
  }
}
function makeWebStreamReader(stream) {
  try {
    const reader = stream.getReader({ mode: "byob" });
    if (reader instanceof ReadableStreamDefaultReader) {
      return new WebStreamDefaultReader(reader);
    }
    return new WebStreamByobReader(reader);
  } catch (error) {
    if (error instanceof TypeError) {
      return new WebStreamDefaultReader(stream.getReader());
    }
    throw error;
  }
}
class AbstractTokenizer {
  /**
   * Constructor
   * @param options Tokenizer options
   * @protected
   */
  constructor(options) {
    this.numBuffer = new Uint8Array(8);
    this.position = 0;
    this.onClose = options?.onClose;
    if (options?.abortSignal) {
      options.abortSignal.addEventListener("abort", () => {
        this.abort();
      });
    }
  }
  /**
   * Read a token from the tokenizer-stream
   * @param token - The token to read
   * @param position - If provided, the desired position in the tokenizer-stream
   * @returns Promise with token data
   */
  async readToken(token, position = this.position) {
    const uint8Array = new Uint8Array(token.len);
    const len = await this.readBuffer(uint8Array, { position });
    if (len < token.len)
      throw new EndOfStreamError();
    return token.get(uint8Array, 0);
  }
  /**
   * Peek a token from the tokenizer-stream.
   * @param token - Token to peek from the tokenizer-stream.
   * @param position - Offset where to begin reading within the file. If position is null, data will be read from the current file position.
   * @returns Promise with token data
   */
  async peekToken(token, position = this.position) {
    const uint8Array = new Uint8Array(token.len);
    const len = await this.peekBuffer(uint8Array, { position });
    if (len < token.len)
      throw new EndOfStreamError();
    return token.get(uint8Array, 0);
  }
  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  async readNumber(token) {
    const len = await this.readBuffer(this.numBuffer, { length: token.len });
    if (len < token.len)
      throw new EndOfStreamError();
    return token.get(this.numBuffer, 0);
  }
  /**
   * Read a numeric token from the stream
   * @param token - Numeric token
   * @returns Promise with number
   */
  async peekNumber(token) {
    const len = await this.peekBuffer(this.numBuffer, { length: token.len });
    if (len < token.len)
      throw new EndOfStreamError();
    return token.get(this.numBuffer, 0);
  }
  /**
   * Ignore number of bytes, advances the pointer in under tokenizer-stream.
   * @param length - Number of bytes to ignore
   * @return resolves the number of bytes ignored, equals length if this available, otherwise the number of bytes available
   */
  async ignore(length) {
    if (this.fileInfo.size !== void 0) {
      const bytesLeft = this.fileInfo.size - this.position;
      if (length > bytesLeft) {
        this.position += bytesLeft;
        return bytesLeft;
      }
    }
    this.position += length;
    return length;
  }
  async close() {
    await this.abort();
    await this.onClose?.();
  }
  normalizeOptions(uint8Array, options) {
    if (!this.supportsRandomAccess() && options && options.position !== void 0 && options.position < this.position) {
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    }
    return {
      ...{
        mayBeLess: false,
        offset: 0,
        length: uint8Array.length,
        position: this.position
      },
      ...options
    };
  }
  abort() {
    return Promise.resolve();
  }
}
const maxBufferSize = 256e3;
class ReadStreamTokenizer extends AbstractTokenizer {
  /**
   * Constructor
   * @param streamReader stream-reader to read from
   * @param options Tokenizer options
   */
  constructor(streamReader, options) {
    super(options);
    this.streamReader = streamReader;
    this.fileInfo = options?.fileInfo ?? {};
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Target Uint8Array to fill with data read from the tokenizer-stream
   * @param options - Read behaviour options
   * @returns Promise with number of bytes read
   */
  async readBuffer(uint8Array, options) {
    const normOptions = this.normalizeOptions(uint8Array, options);
    const skipBytes = normOptions.position - this.position;
    if (skipBytes > 0) {
      await this.ignore(skipBytes);
      return this.readBuffer(uint8Array, options);
    }
    if (skipBytes < 0) {
      throw new Error("`options.position` must be equal or greater than `tokenizer.position`");
    }
    if (normOptions.length === 0) {
      return 0;
    }
    const bytesRead = await this.streamReader.read(uint8Array.subarray(0, normOptions.length), normOptions.mayBeLess);
    this.position += bytesRead;
    if ((!options || !options.mayBeLess) && bytesRead < normOptions.length) {
      throw new EndOfStreamError();
    }
    return bytesRead;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise with number of bytes peeked
   */
  async peekBuffer(uint8Array, options) {
    const normOptions = this.normalizeOptions(uint8Array, options);
    let bytesRead = 0;
    if (normOptions.position) {
      const skipBytes = normOptions.position - this.position;
      if (skipBytes > 0) {
        const skipBuffer = new Uint8Array(normOptions.length + skipBytes);
        bytesRead = await this.peekBuffer(skipBuffer, { mayBeLess: normOptions.mayBeLess });
        uint8Array.set(skipBuffer.subarray(skipBytes));
        return bytesRead - skipBytes;
      }
      if (skipBytes < 0) {
        throw new Error("Cannot peek from a negative offset in a stream");
      }
    }
    if (normOptions.length > 0) {
      try {
        bytesRead = await this.streamReader.peek(uint8Array.subarray(0, normOptions.length), normOptions.mayBeLess);
      } catch (err) {
        if (options?.mayBeLess && err instanceof EndOfStreamError) {
          return 0;
        }
        throw err;
      }
      if (!normOptions.mayBeLess && bytesRead < normOptions.length) {
        throw new EndOfStreamError();
      }
    }
    return bytesRead;
  }
  async ignore(length) {
    const bufSize = Math.min(maxBufferSize, length);
    const buf = new Uint8Array(bufSize);
    let totBytesRead = 0;
    while (totBytesRead < length) {
      const remaining = length - totBytesRead;
      const bytesRead = await this.readBuffer(buf, { length: Math.min(bufSize, remaining) });
      if (bytesRead < 0) {
        return bytesRead;
      }
      totBytesRead += bytesRead;
    }
    return totBytesRead;
  }
  abort() {
    return this.streamReader.abort();
  }
  async close() {
    return this.streamReader.close();
  }
  supportsRandomAccess() {
    return false;
  }
}
class BufferTokenizer extends AbstractTokenizer {
  /**
   * Construct BufferTokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(uint8Array, options) {
    super(options);
    this.uint8Array = uint8Array;
    this.fileInfo = { ...options?.fileInfo ?? {}, ...{ size: uint8Array.length } };
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async readBuffer(uint8Array, options) {
    if (options?.position) {
      this.position = options.position;
    }
    const bytesRead = await this.peekBuffer(uint8Array, options);
    this.position += bytesRead;
    return bytesRead;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param uint8Array
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async peekBuffer(uint8Array, options) {
    const normOptions = this.normalizeOptions(uint8Array, options);
    const bytes2read = Math.min(this.uint8Array.length - normOptions.position, normOptions.length);
    if (!normOptions.mayBeLess && bytes2read < normOptions.length) {
      throw new EndOfStreamError();
    }
    uint8Array.set(this.uint8Array.subarray(normOptions.position, normOptions.position + bytes2read));
    return bytes2read;
  }
  close() {
    return super.close();
  }
  supportsRandomAccess() {
    return true;
  }
  setPosition(position) {
    this.position = position;
  }
}
class BlobTokenizer extends AbstractTokenizer {
  /**
   * Construct BufferTokenizer
   * @param blob - Uint8Array to tokenize
   * @param options Tokenizer options
   */
  constructor(blob, options) {
    super(options);
    this.blob = blob;
    this.fileInfo = { ...options?.fileInfo ?? {}, ...{ size: blob.size, mimeType: blob.type } };
  }
  /**
   * Read buffer from tokenizer
   * @param uint8Array - Uint8Array to tokenize
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async readBuffer(uint8Array, options) {
    if (options?.position) {
      this.position = options.position;
    }
    const bytesRead = await this.peekBuffer(uint8Array, options);
    this.position += bytesRead;
    return bytesRead;
  }
  /**
   * Peek (read ahead) buffer from tokenizer
   * @param buffer
   * @param options - Read behaviour options
   * @returns {Promise<number>}
   */
  async peekBuffer(buffer, options) {
    const normOptions = this.normalizeOptions(buffer, options);
    const bytes2read = Math.min(this.blob.size - normOptions.position, normOptions.length);
    if (!normOptions.mayBeLess && bytes2read < normOptions.length) {
      throw new EndOfStreamError();
    }
    const arrayBuffer = await this.blob.slice(normOptions.position, normOptions.position + bytes2read).arrayBuffer();
    buffer.set(new Uint8Array(arrayBuffer));
    return bytes2read;
  }
  close() {
    return super.close();
  }
  supportsRandomAccess() {
    return true;
  }
  setPosition(position) {
    this.position = position;
  }
}
function fromWebStream(webStream, options) {
  const webStreamReader = makeWebStreamReader(webStream);
  const _options = options ?? {};
  const chainedClose = _options.onClose;
  _options.onClose = async () => {
    await webStreamReader.close();
    if (chainedClose) {
      return chainedClose();
    }
  };
  return new ReadStreamTokenizer(webStreamReader, _options);
}
function fromBuffer(uint8Array, options) {
  return new BufferTokenizer(uint8Array, options);
}
function fromBlob(blob, options) {
  return new BlobTokenizer(blob, options);
}
class FileTokenizer extends AbstractTokenizer {
  /**
   * Create tokenizer from provided file path
   * @param sourceFilePath File path
   */
  static async fromFile(sourceFilePath) {
    const fileHandle = await open(sourceFilePath, "r");
    const stat = await fileHandle.stat();
    return new FileTokenizer(fileHandle, { fileInfo: { path: sourceFilePath, size: stat.size } });
  }
  constructor(fileHandle, options) {
    super(options);
    this.fileHandle = fileHandle;
    this.fileInfo = options.fileInfo;
  }
  /**
   * Read buffer from file
   * @param uint8Array - Uint8Array to write result to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  async readBuffer(uint8Array, options) {
    const normOptions = this.normalizeOptions(uint8Array, options);
    this.position = normOptions.position;
    if (normOptions.length === 0)
      return 0;
    const res = await this.fileHandle.read(uint8Array, 0, normOptions.length, normOptions.position);
    this.position += res.bytesRead;
    if (res.bytesRead < normOptions.length && (!options || !options.mayBeLess)) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }
  /**
   * Peek buffer from file
   * @param uint8Array - Uint8Array (or Buffer) to write data to
   * @param options - Read behaviour options
   * @returns Promise number of bytes read
   */
  async peekBuffer(uint8Array, options) {
    const normOptions = this.normalizeOptions(uint8Array, options);
    const res = await this.fileHandle.read(uint8Array, 0, normOptions.length, normOptions.position);
    if (!normOptions.mayBeLess && res.bytesRead < normOptions.length) {
      throw new EndOfStreamError();
    }
    return res.bytesRead;
  }
  async close() {
    await this.fileHandle.close();
    return super.close();
  }
  setPosition(position) {
    this.position = position;
  }
  supportsRandomAccess() {
    return true;
  }
}
const fromFile = FileTokenizer.fromFile;
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var src = { exports: {} };
var browser = { exports: {} };
var ms;
var hasRequiredMs;
function requireMs() {
  if (hasRequiredMs) return ms;
  hasRequiredMs = 1;
  var s = 1e3;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var w = d * 7;
  var y = d * 365.25;
  ms = function(val, options) {
    options = options || {};
    var type = typeof val;
    if (type === "string" && val.length > 0) {
      return parse(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error(
      "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
    );
  };
  function parse(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
      str
    );
    if (!match) {
      return;
    }
    var n = parseFloat(match[1]);
    var type = (match[2] || "ms").toLowerCase();
    switch (type) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return n * y;
      case "weeks":
      case "week":
      case "w":
        return n * w;
      case "days":
      case "day":
      case "d":
        return n * d;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return n * h;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return n * m;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return n * s;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return n;
      default:
        return void 0;
    }
  }
  function fmtShort(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return Math.round(ms2 / d) + "d";
    }
    if (msAbs >= h) {
      return Math.round(ms2 / h) + "h";
    }
    if (msAbs >= m) {
      return Math.round(ms2 / m) + "m";
    }
    if (msAbs >= s) {
      return Math.round(ms2 / s) + "s";
    }
    return ms2 + "ms";
  }
  function fmtLong(ms2) {
    var msAbs = Math.abs(ms2);
    if (msAbs >= d) {
      return plural(ms2, msAbs, d, "day");
    }
    if (msAbs >= h) {
      return plural(ms2, msAbs, h, "hour");
    }
    if (msAbs >= m) {
      return plural(ms2, msAbs, m, "minute");
    }
    if (msAbs >= s) {
      return plural(ms2, msAbs, s, "second");
    }
    return ms2 + " ms";
  }
  function plural(ms2, msAbs, n, name) {
    var isPlural = msAbs >= n * 1.5;
    return Math.round(ms2 / n) + " " + name + (isPlural ? "s" : "");
  }
  return ms;
}
var common;
var hasRequiredCommon;
function requireCommon() {
  if (hasRequiredCommon) return common;
  hasRequiredCommon = 1;
  function setup(env) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = requireMs();
    createDebug.destroy = destroy;
    Object.keys(env).forEach((key) => {
      createDebug[key] = env[key];
    });
    createDebug.names = [];
    createDebug.skips = [];
    createDebug.formatters = {};
    function selectColor(namespace) {
      let hash = 0;
      for (let i = 0; i < namespace.length; i++) {
        hash = (hash << 5) - hash + namespace.charCodeAt(i);
        hash |= 0;
      }
      return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
    }
    createDebug.selectColor = selectColor;
    function createDebug(namespace) {
      let prevTime;
      let enableOverride = null;
      let namespacesCache;
      let enabledCache;
      function debug2(...args) {
        if (!debug2.enabled) {
          return;
        }
        const self = debug2;
        const curr = Number(/* @__PURE__ */ new Date());
        const ms2 = curr - (prevTime || curr);
        self.diff = ms2;
        self.prev = prevTime;
        self.curr = curr;
        prevTime = curr;
        args[0] = createDebug.coerce(args[0]);
        if (typeof args[0] !== "string") {
          args.unshift("%O");
        }
        let index2 = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index2++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index2];
            match = formatter.call(self, val);
            args.splice(index2, 1);
            index2--;
          }
          return match;
        });
        createDebug.formatArgs.call(self, args);
        const logFn = self.log || createDebug.log;
        logFn.apply(self, args);
      }
      debug2.namespace = namespace;
      debug2.useColors = createDebug.useColors();
      debug2.color = createDebug.selectColor(namespace);
      debug2.extend = extend;
      debug2.destroy = createDebug.destroy;
      Object.defineProperty(debug2, "enabled", {
        enumerable: true,
        configurable: false,
        get: () => {
          if (enableOverride !== null) {
            return enableOverride;
          }
          if (namespacesCache !== createDebug.namespaces) {
            namespacesCache = createDebug.namespaces;
            enabledCache = createDebug.enabled(namespace);
          }
          return enabledCache;
        },
        set: (v) => {
          enableOverride = v;
        }
      });
      if (typeof createDebug.init === "function") {
        createDebug.init(debug2);
      }
      return debug2;
    }
    function extend(namespace, delimiter) {
      const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
      newDebug.log = this.log;
      return newDebug;
    }
    function enable(namespaces) {
      createDebug.save(namespaces);
      createDebug.namespaces = namespaces;
      createDebug.names = [];
      createDebug.skips = [];
      const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
      for (const ns of split) {
        if (ns[0] === "-") {
          createDebug.skips.push(ns.slice(1));
        } else {
          createDebug.names.push(ns);
        }
      }
    }
    function matchesTemplate(search, template) {
      let searchIndex = 0;
      let templateIndex = 0;
      let starIndex = -1;
      let matchIndex = 0;
      while (searchIndex < search.length) {
        if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
          if (template[templateIndex] === "*") {
            starIndex = templateIndex;
            matchIndex = searchIndex;
            templateIndex++;
          } else {
            searchIndex++;
            templateIndex++;
          }
        } else if (starIndex !== -1) {
          templateIndex = starIndex + 1;
          matchIndex++;
          searchIndex = matchIndex;
        } else {
          return false;
        }
      }
      while (templateIndex < template.length && template[templateIndex] === "*") {
        templateIndex++;
      }
      return templateIndex === template.length;
    }
    function disable() {
      const namespaces = [
        ...createDebug.names,
        ...createDebug.skips.map((namespace) => "-" + namespace)
      ].join(",");
      createDebug.enable("");
      return namespaces;
    }
    function enabled(name) {
      for (const skip of createDebug.skips) {
        if (matchesTemplate(name, skip)) {
          return false;
        }
      }
      for (const ns of createDebug.names) {
        if (matchesTemplate(name, ns)) {
          return true;
        }
      }
      return false;
    }
    function coerce(val) {
      if (val instanceof Error) {
        return val.stack || val.message;
      }
      return val;
    }
    function destroy() {
      console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
    }
    createDebug.enable(createDebug.load());
    return createDebug;
  }
  common = setup;
  return common;
}
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser.exports;
  hasRequiredBrowser = 1;
  (function(module, exports$1) {
    exports$1.formatArgs = formatArgs;
    exports$1.save = save;
    exports$1.load = load;
    exports$1.useColors = useColors;
    exports$1.storage = localstorage();
    exports$1.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports$1.colors = [
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
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index2 = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index2++;
        if (match === "%c") {
          lastC = index2;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports$1.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports$1.storage.setItem("debug", namespaces);
        } else {
          exports$1.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports$1.storage.getItem("debug") || exports$1.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = requireCommon()(exports$1);
    const { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  })(browser, browser.exports);
  return browser.exports;
}
var node = { exports: {} };
var hasFlag;
var hasRequiredHasFlag;
function requireHasFlag() {
  if (hasRequiredHasFlag) return hasFlag;
  hasRequiredHasFlag = 1;
  hasFlag = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
  return hasFlag;
}
var supportsColor_1;
var hasRequiredSupportsColor;
function requireSupportsColor() {
  if (hasRequiredSupportsColor) return supportsColor_1;
  hasRequiredSupportsColor = 1;
  const os = require$$0;
  const tty = require$$1;
  const hasFlag2 = requireHasFlag();
  const { env } = process;
  let forceColor;
  if (hasFlag2("no-color") || hasFlag2("no-colors") || hasFlag2("color=false") || hasFlag2("color=never")) {
    forceColor = 0;
  } else if (hasFlag2("color") || hasFlag2("colors") || hasFlag2("color=true") || hasFlag2("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
    }
  }
  function translateLevel(level) {
    if (level === 0) {
      return false;
    }
    return {
      level,
      hasBasic: true,
      has256: level >= 2,
      has16m: level >= 3
    };
  }
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag2("color=16m") || hasFlag2("color=full") || hasFlag2("color=truecolor")) {
      return 3;
    }
    if (hasFlag2("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env) {
      const version = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream) {
    const level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  supportsColor_1 = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
  return supportsColor_1;
}
var hasRequiredNode;
function requireNode() {
  if (hasRequiredNode) return node.exports;
  hasRequiredNode = 1;
  (function(module, exports$1) {
    const tty = require$$1;
    const util = require$$1$1;
    exports$1.init = init;
    exports$1.log = log;
    exports$1.formatArgs = formatArgs;
    exports$1.save = save;
    exports$1.load = load;
    exports$1.useColors = useColors;
    exports$1.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports$1.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = requireSupportsColor();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports$1.colors = [
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
        ];
      }
    } catch (error) {
    }
    exports$1.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports$1.inspectOpts ? Boolean(exports$1.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports$1.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports$1.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports$1.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports$1.inspectOpts[keys[i]];
      }
    }
    module.exports = requireCommon()(exports$1);
    const { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  })(node, node.exports);
  return node.exports;
}
var hasRequiredSrc;
function requireSrc() {
  if (hasRequiredSrc) return src.exports;
  hasRequiredSrc = 1;
  if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
    src.exports = requireBrowser();
  } else {
    src.exports = requireNode();
  }
  return src.exports;
}
var srcExports = requireSrc();
const initDebug = /* @__PURE__ */ getDefaultExportFromCjs(srcExports);
var ieee754 = {};
var hasRequiredIeee754;
function requireIeee754() {
  if (hasRequiredIeee754) return ieee754;
  hasRequiredIeee754 = 1;
  ieee754.read = function(buffer, offset, isLE, mLen, nBytes) {
    var e, m;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var nBits = -7;
    var i = isLE ? nBytes - 1 : 0;
    var d = isLE ? -1 : 1;
    var s = buffer[offset + i];
    i += d;
    e = s & (1 << -nBits) - 1;
    s >>= -nBits;
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {
    }
    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {
    }
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity;
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  };
  ieee754.write = function(buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c;
    var eLen = nBytes * 8 - mLen - 1;
    var eMax = (1 << eLen) - 1;
    var eBias = eMax >> 1;
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
    var i = isLE ? 0 : nBytes - 1;
    var d = isLE ? 1 : -1;
    var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
    value = Math.abs(value);
    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }
      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }
    for (; mLen >= 8; buffer[offset + i] = m & 255, i += d, m /= 256, mLen -= 8) {
    }
    e = e << mLen | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 255, i += d, e /= 256, eLen -= 8) {
    }
    buffer[offset + i - d] |= s * 128;
  };
  return ieee754;
}
var ieee754Exports = requireIeee754();
const WINDOWS_1252_EXTRA$1 = {
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
for (const [code, char] of Object.entries(WINDOWS_1252_EXTRA$1)) {
}
function textDecode$1(bytes, encoding = "utf-8") {
  switch (encoding.toLowerCase()) {
    case "utf-8":
    case "utf8":
      if (typeof globalThis.TextDecoder !== "undefined") {
        return new globalThis.TextDecoder("utf-8").decode(bytes);
      }
      return decodeUTF8$1(bytes);
    case "utf-16le":
      return decodeUTF16LE$1(bytes);
    case "ascii":
      return decodeASCII$1(bytes);
    case "latin1":
    case "iso-8859-1":
      return decodeLatin1$1(bytes);
    case "windows-1252":
      return decodeWindows1252$1(bytes);
    default:
      throw new RangeError(`Encoding '${encoding}' not supported`);
  }
}
function decodeUTF8$1(bytes) {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 128) {
      out += String.fromCharCode(b1);
    } else if (b1 < 224) {
      const b2 = bytes[i++] & 63;
      out += String.fromCharCode((b1 & 31) << 6 | b2);
    } else if (b1 < 240) {
      const b2 = bytes[i++] & 63;
      const b3 = bytes[i++] & 63;
      out += String.fromCharCode((b1 & 15) << 12 | b2 << 6 | b3);
    } else {
      const b2 = bytes[i++] & 63;
      const b3 = bytes[i++] & 63;
      const b4 = bytes[i++] & 63;
      let cp = (b1 & 7) << 18 | b2 << 12 | b3 << 6 | b4;
      cp -= 65536;
      out += String.fromCharCode(55296 + (cp >> 10 & 1023), 56320 + (cp & 1023));
    }
  }
  return out;
}
function decodeUTF16LE$1(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 2) {
    out += String.fromCharCode(bytes[i] | bytes[i + 1] << 8);
  }
  return out;
}
function decodeASCII$1(bytes) {
  return String.fromCharCode(...bytes.map((b) => b & 127));
}
function decodeLatin1$1(bytes) {
  return String.fromCharCode(...bytes);
}
function decodeWindows1252$1(bytes) {
  let out = "";
  for (const b of bytes) {
    if (b >= 128 && b <= 159 && WINDOWS_1252_EXTRA$1[b]) {
      out += WINDOWS_1252_EXTRA$1[b];
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}
function dv(array) {
  return new DataView(array.buffer, array.byteOffset);
}
const UINT8 = {
  len: 1,
  get(array, offset) {
    return dv(array).getUint8(offset);
  },
  put(array, offset, value) {
    dv(array).setUint8(offset, value);
    return offset + 1;
  }
};
const UINT16_LE = {
  len: 2,
  get(array, offset) {
    return dv(array).getUint16(offset, true);
  },
  put(array, offset, value) {
    dv(array).setUint16(offset, value, true);
    return offset + 2;
  }
};
const UINT16_BE = {
  len: 2,
  get(array, offset) {
    return dv(array).getUint16(offset);
  },
  put(array, offset, value) {
    dv(array).setUint16(offset, value);
    return offset + 2;
  }
};
const UINT24_LE = {
  len: 3,
  get(array, offset) {
    const dataView = dv(array);
    return dataView.getUint8(offset) + (dataView.getUint16(offset + 1, true) << 8);
  },
  put(array, offset, value) {
    const dataView = dv(array);
    dataView.setUint8(offset, value & 255);
    dataView.setUint16(offset + 1, value >> 8, true);
    return offset + 3;
  }
};
const UINT24_BE = {
  len: 3,
  get(array, offset) {
    const dataView = dv(array);
    return (dataView.getUint16(offset) << 8) + dataView.getUint8(offset + 2);
  },
  put(array, offset, value) {
    const dataView = dv(array);
    dataView.setUint16(offset, value >> 8);
    dataView.setUint8(offset + 2, value & 255);
    return offset + 3;
  }
};
const UINT32_LE = {
  len: 4,
  get(array, offset) {
    return dv(array).getUint32(offset, true);
  },
  put(array, offset, value) {
    dv(array).setUint32(offset, value, true);
    return offset + 4;
  }
};
const UINT32_BE = {
  len: 4,
  get(array, offset) {
    return dv(array).getUint32(offset);
  },
  put(array, offset, value) {
    dv(array).setUint32(offset, value);
    return offset + 4;
  }
};
const INT8 = {
  len: 1,
  get(array, offset) {
    return dv(array).getInt8(offset);
  },
  put(array, offset, value) {
    dv(array).setInt8(offset, value);
    return offset + 1;
  }
};
const INT16_BE = {
  len: 2,
  get(array, offset) {
    return dv(array).getInt16(offset);
  },
  put(array, offset, value) {
    dv(array).setInt16(offset, value);
    return offset + 2;
  }
};
const INT16_LE = {
  len: 2,
  get(array, offset) {
    return dv(array).getInt16(offset, true);
  },
  put(array, offset, value) {
    dv(array).setInt16(offset, value, true);
    return offset + 2;
  }
};
const INT24_LE = {
  len: 3,
  get(array, offset) {
    const unsigned = UINT24_LE.get(array, offset);
    return unsigned > 8388607 ? unsigned - 16777216 : unsigned;
  },
  put(array, offset, value) {
    const dataView = dv(array);
    dataView.setUint8(offset, value & 255);
    dataView.setUint16(offset + 1, value >> 8, true);
    return offset + 3;
  }
};
const INT24_BE = {
  len: 3,
  get(array, offset) {
    const unsigned = UINT24_BE.get(array, offset);
    return unsigned > 8388607 ? unsigned - 16777216 : unsigned;
  },
  put(array, offset, value) {
    const dataView = dv(array);
    dataView.setUint16(offset, value >> 8);
    dataView.setUint8(offset + 2, value & 255);
    return offset + 3;
  }
};
const INT32_BE = {
  len: 4,
  get(array, offset) {
    return dv(array).getInt32(offset);
  },
  put(array, offset, value) {
    dv(array).setInt32(offset, value);
    return offset + 4;
  }
};
const INT32_LE = {
  len: 4,
  get(array, offset) {
    return dv(array).getInt32(offset, true);
  },
  put(array, offset, value) {
    dv(array).setInt32(offset, value, true);
    return offset + 4;
  }
};
const UINT64_LE = {
  len: 8,
  get(array, offset) {
    return dv(array).getBigUint64(offset, true);
  },
  put(array, offset, value) {
    dv(array).setBigUint64(offset, value, true);
    return offset + 8;
  }
};
const INT64_LE = {
  len: 8,
  get(array, offset) {
    return dv(array).getBigInt64(offset, true);
  },
  put(array, offset, value) {
    dv(array).setBigInt64(offset, value, true);
    return offset + 8;
  }
};
const UINT64_BE = {
  len: 8,
  get(array, offset) {
    return dv(array).getBigUint64(offset);
  },
  put(array, offset, value) {
    dv(array).setBigUint64(offset, value);
    return offset + 8;
  }
};
const INT64_BE = {
  len: 8,
  get(array, offset) {
    return dv(array).getBigInt64(offset);
  },
  put(array, offset, value) {
    dv(array).setBigInt64(offset, value);
    return offset + 8;
  }
};
const Float16_BE = {
  len: 2,
  get(dataView, offset) {
    return ieee754Exports.read(dataView, offset, false, 10, this.len);
  },
  put(dataView, offset, value) {
    ieee754Exports.write(dataView, value, offset, false, 10, this.len);
    return offset + this.len;
  }
};
const Float16_LE = {
  len: 2,
  get(array, offset) {
    return ieee754Exports.read(array, offset, true, 10, this.len);
  },
  put(array, offset, value) {
    ieee754Exports.write(array, value, offset, true, 10, this.len);
    return offset + this.len;
  }
};
const Float32_BE = {
  len: 4,
  get(array, offset) {
    return dv(array).getFloat32(offset);
  },
  put(array, offset, value) {
    dv(array).setFloat32(offset, value);
    return offset + 4;
  }
};
const Float32_LE = {
  len: 4,
  get(array, offset) {
    return dv(array).getFloat32(offset, true);
  },
  put(array, offset, value) {
    dv(array).setFloat32(offset, value, true);
    return offset + 4;
  }
};
const Float64_BE = {
  len: 8,
  get(array, offset) {
    return dv(array).getFloat64(offset);
  },
  put(array, offset, value) {
    dv(array).setFloat64(offset, value);
    return offset + 8;
  }
};
const Float64_LE = {
  len: 8,
  get(array, offset) {
    return dv(array).getFloat64(offset, true);
  },
  put(array, offset, value) {
    dv(array).setFloat64(offset, value, true);
    return offset + 8;
  }
};
const Float80_BE = {
  len: 10,
  get(array, offset) {
    return ieee754Exports.read(array, offset, false, 63, this.len);
  },
  put(array, offset, value) {
    ieee754Exports.write(array, value, offset, false, 63, this.len);
    return offset + this.len;
  }
};
const Float80_LE = {
  len: 10,
  get(array, offset) {
    return ieee754Exports.read(array, offset, true, 63, this.len);
  },
  put(array, offset, value) {
    ieee754Exports.write(array, value, offset, true, 63, this.len);
    return offset + this.len;
  }
};
class IgnoreType {
  /**
   * @param len number of bytes to ignore
   */
  constructor(len) {
    this.len = len;
  }
  // ToDo: don't read, but skip data
  get(_array, _off) {
  }
}
class Uint8ArrayType {
  constructor(len) {
    this.len = len;
  }
  get(array, offset) {
    return array.subarray(offset, offset + this.len);
  }
}
class StringType {
  constructor(len, encoding) {
    this.len = len;
    this.encoding = encoding;
  }
  get(data, offset = 0) {
    const bytes = data.subarray(offset, offset + this.len);
    return textDecode$1(bytes, this.encoding);
  }
}
class AnsiStringType extends StringType {
  constructor(len) {
    super(len, "windows-1252");
  }
}
const Token = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AnsiStringType,
  Float16_BE,
  Float16_LE,
  Float32_BE,
  Float32_LE,
  Float64_BE,
  Float64_LE,
  Float80_BE,
  Float80_LE,
  INT16_BE,
  INT16_LE,
  INT24_BE,
  INT24_LE,
  INT32_BE,
  INT32_LE,
  INT64_BE,
  INT64_LE,
  INT8,
  IgnoreType,
  StringType,
  UINT16_BE,
  UINT16_LE,
  UINT24_BE,
  UINT24_LE,
  UINT32_BE,
  UINT32_LE,
  UINT64_BE,
  UINT64_LE,
  UINT8,
  Uint8ArrayType
}, Symbol.toStringTag, { value: "Module" }));
const Signature = {
  LocalFileHeader: 67324752,
  DataDescriptor: 134695760,
  CentralFileHeader: 33639248,
  EndOfCentralDirectory: 101010256
};
const DataDescriptor = {
  get(array) {
    return {
      signature: UINT32_LE.get(array, 0),
      compressedSize: UINT32_LE.get(array, 8),
      uncompressedSize: UINT32_LE.get(array, 12)
    };
  },
  len: 16
};
const LocalFileHeaderToken = {
  get(array) {
    const flags = UINT16_LE.get(array, 6);
    return {
      signature: UINT32_LE.get(array, 0),
      minVersion: UINT16_LE.get(array, 4),
      dataDescriptor: !!(flags & 8),
      compressedMethod: UINT16_LE.get(array, 8),
      compressedSize: UINT32_LE.get(array, 18),
      uncompressedSize: UINT32_LE.get(array, 22),
      filenameLength: UINT16_LE.get(array, 26),
      extraFieldLength: UINT16_LE.get(array, 28),
      filename: null
    };
  },
  len: 30
};
const EndOfCentralDirectoryRecordToken = {
  get(array) {
    return {
      signature: UINT32_LE.get(array, 0),
      nrOfThisDisk: UINT16_LE.get(array, 4),
      nrOfThisDiskWithTheStart: UINT16_LE.get(array, 6),
      nrOfEntriesOnThisDisk: UINT16_LE.get(array, 8),
      nrOfEntriesOfSize: UINT16_LE.get(array, 10),
      sizeOfCd: UINT32_LE.get(array, 12),
      offsetOfStartOfCd: UINT32_LE.get(array, 16),
      zipFileCommentLength: UINT16_LE.get(array, 20)
    };
  },
  len: 22
};
const FileHeader = {
  get(array) {
    const flags = UINT16_LE.get(array, 8);
    return {
      signature: UINT32_LE.get(array, 0),
      minVersion: UINT16_LE.get(array, 6),
      dataDescriptor: !!(flags & 8),
      compressedMethod: UINT16_LE.get(array, 10),
      compressedSize: UINT32_LE.get(array, 20),
      uncompressedSize: UINT32_LE.get(array, 24),
      filenameLength: UINT16_LE.get(array, 28),
      extraFieldLength: UINT16_LE.get(array, 30),
      fileCommentLength: UINT16_LE.get(array, 32),
      relativeOffsetOfLocalHeader: UINT32_LE.get(array, 42),
      filename: null
    };
  },
  len: 46
};
function signatureToArray(signature) {
  const signatureBytes = new Uint8Array(UINT32_LE.len);
  UINT32_LE.put(signatureBytes, 0, signature);
  return signatureBytes;
}
const debug$5 = initDebug("tokenizer:inflate");
const syncBufferSize = 256 * 1024;
const ddSignatureArray = signatureToArray(Signature.DataDescriptor);
const eocdSignatureBytes = signatureToArray(Signature.EndOfCentralDirectory);
class ZipHandler {
  constructor(tokenizer) {
    this.tokenizer = tokenizer;
    this.syncBuffer = new Uint8Array(syncBufferSize);
  }
  async isZip() {
    return await this.peekSignature() === Signature.LocalFileHeader;
  }
  peekSignature() {
    return this.tokenizer.peekToken(UINT32_LE);
  }
  async findEndOfCentralDirectoryLocator() {
    const randomReadTokenizer = this.tokenizer;
    const chunkLength = Math.min(16 * 1024, randomReadTokenizer.fileInfo.size);
    const buffer = this.syncBuffer.subarray(0, chunkLength);
    await this.tokenizer.readBuffer(buffer, { position: randomReadTokenizer.fileInfo.size - chunkLength });
    for (let i = buffer.length - 4; i >= 0; i--) {
      if (buffer[i] === eocdSignatureBytes[0] && buffer[i + 1] === eocdSignatureBytes[1] && buffer[i + 2] === eocdSignatureBytes[2] && buffer[i + 3] === eocdSignatureBytes[3]) {
        return randomReadTokenizer.fileInfo.size - chunkLength + i;
      }
    }
    return -1;
  }
  async readCentralDirectory() {
    if (!this.tokenizer.supportsRandomAccess()) {
      debug$5("Cannot reading central-directory without random-read support");
      return;
    }
    debug$5("Reading central-directory...");
    const pos = this.tokenizer.position;
    const offset = await this.findEndOfCentralDirectoryLocator();
    if (offset > 0) {
      debug$5("Central-directory 32-bit signature found");
      const eocdHeader = await this.tokenizer.readToken(EndOfCentralDirectoryRecordToken, offset);
      const files = [];
      this.tokenizer.setPosition(eocdHeader.offsetOfStartOfCd);
      for (let n = 0; n < eocdHeader.nrOfEntriesOfSize; ++n) {
        const entry = await this.tokenizer.readToken(FileHeader);
        if (entry.signature !== Signature.CentralFileHeader) {
          throw new Error("Expected Central-File-Header signature");
        }
        entry.filename = await this.tokenizer.readToken(new StringType(entry.filenameLength, "utf-8"));
        await this.tokenizer.ignore(entry.extraFieldLength);
        await this.tokenizer.ignore(entry.fileCommentLength);
        files.push(entry);
        debug$5(`Add central-directory file-entry: n=${n + 1}/${files.length}: filename=${files[n].filename}`);
      }
      this.tokenizer.setPosition(pos);
      return files;
    }
    this.tokenizer.setPosition(pos);
  }
  async unzip(fileCb) {
    const entries = await this.readCentralDirectory();
    if (entries) {
      return this.iterateOverCentralDirectory(entries, fileCb);
    }
    let stop = false;
    do {
      const zipHeader = await this.readLocalFileHeader();
      if (!zipHeader)
        break;
      const next = fileCb(zipHeader);
      stop = !!next.stop;
      let fileData;
      await this.tokenizer.ignore(zipHeader.extraFieldLength);
      if (zipHeader.dataDescriptor && zipHeader.compressedSize === 0) {
        const chunks = [];
        let len = syncBufferSize;
        debug$5("Compressed-file-size unknown, scanning for next data-descriptor-signature....");
        let nextHeaderIndex = -1;
        while (nextHeaderIndex < 0 && len === syncBufferSize) {
          len = await this.tokenizer.peekBuffer(this.syncBuffer, { mayBeLess: true });
          nextHeaderIndex = indexOf(this.syncBuffer.subarray(0, len), ddSignatureArray);
          const size = nextHeaderIndex >= 0 ? nextHeaderIndex : len;
          if (next.handler) {
            const data = new Uint8Array(size);
            await this.tokenizer.readBuffer(data);
            chunks.push(data);
          } else {
            await this.tokenizer.ignore(size);
          }
        }
        debug$5(`Found data-descriptor-signature at pos=${this.tokenizer.position}`);
        if (next.handler) {
          await this.inflate(zipHeader, mergeArrays(chunks), next.handler);
        }
      } else {
        if (next.handler) {
          debug$5(`Reading compressed-file-data: ${zipHeader.compressedSize} bytes`);
          fileData = new Uint8Array(zipHeader.compressedSize);
          await this.tokenizer.readBuffer(fileData);
          await this.inflate(zipHeader, fileData, next.handler);
        } else {
          debug$5(`Ignoring compressed-file-data: ${zipHeader.compressedSize} bytes`);
          await this.tokenizer.ignore(zipHeader.compressedSize);
        }
      }
      debug$5(`Reading data-descriptor at pos=${this.tokenizer.position}`);
      if (zipHeader.dataDescriptor) {
        const dataDescriptor = await this.tokenizer.readToken(DataDescriptor);
        if (dataDescriptor.signature !== 134695760) {
          throw new Error(`Expected data-descriptor-signature at position ${this.tokenizer.position - DataDescriptor.len}`);
        }
      }
    } while (!stop);
  }
  async iterateOverCentralDirectory(entries, fileCb) {
    for (const fileHeader of entries) {
      const next = fileCb(fileHeader);
      if (next.handler) {
        this.tokenizer.setPosition(fileHeader.relativeOffsetOfLocalHeader);
        const zipHeader = await this.readLocalFileHeader();
        if (zipHeader) {
          await this.tokenizer.ignore(zipHeader.extraFieldLength);
          const fileData = new Uint8Array(fileHeader.compressedSize);
          await this.tokenizer.readBuffer(fileData);
          await this.inflate(zipHeader, fileData, next.handler);
        }
      }
      if (next.stop)
        break;
    }
  }
  async inflate(zipHeader, fileData, cb) {
    if (zipHeader.compressedMethod === 0) {
      return cb(fileData);
    }
    if (zipHeader.compressedMethod !== 8) {
      throw new Error(`Unsupported ZIP compression method: ${zipHeader.compressedMethod}`);
    }
    debug$5(`Decompress filename=${zipHeader.filename}, compressed-size=${fileData.length}`);
    const uncompressedData = await ZipHandler.decompressDeflateRaw(fileData);
    return cb(uncompressedData);
  }
  static async decompressDeflateRaw(data) {
    const input = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    });
    const ds = new DecompressionStream("deflate-raw");
    const output = input.pipeThrough(ds);
    try {
      const response = new Response(output);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (err) {
      const message = err instanceof Error ? `Failed to deflate ZIP entry: ${err.message}` : "Unknown decompression error in ZIP entry";
      throw new TypeError(message);
    }
  }
  async readLocalFileHeader() {
    const signature = await this.tokenizer.peekToken(UINT32_LE);
    if (signature === Signature.LocalFileHeader) {
      const header = await this.tokenizer.readToken(LocalFileHeaderToken);
      header.filename = await this.tokenizer.readToken(new StringType(header.filenameLength, "utf-8"));
      return header;
    }
    if (signature === Signature.CentralFileHeader) {
      return false;
    }
    if (signature === 3759263696) {
      throw new Error("Encrypted ZIP");
    }
    throw new Error("Unexpected signature");
  }
}
function indexOf(buffer, portion) {
  const bufferLength = buffer.length;
  const portionLength = portion.length;
  if (portionLength > bufferLength)
    return -1;
  for (let i = 0; i <= bufferLength - portionLength; i++) {
    let found = true;
    for (let j = 0; j < portionLength; j++) {
      if (buffer[i + j] !== portion[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      return i;
    }
  }
  return -1;
}
function mergeArrays(chunks) {
  const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
  const mergedArray = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    mergedArray.set(chunk, offset);
    offset += chunk.length;
  }
  return mergedArray;
}
class GzipHandler {
  constructor(tokenizer) {
    this.tokenizer = tokenizer;
  }
  inflate() {
    const tokenizer = this.tokenizer;
    return new ReadableStream({
      async pull(controller) {
        const buffer = new Uint8Array(1024);
        const size = await tokenizer.readBuffer(buffer, { mayBeLess: true });
        if (size === 0) {
          controller.close();
          return;
        }
        controller.enqueue(buffer.subarray(0, size));
      }
    }).pipeThrough(new DecompressionStream("gzip"));
  }
}
const objectToString = Object.prototype.toString;
const uint8ArrayStringified = "[object Uint8Array]";
function isType(value, typeConstructor, typeStringified) {
  if (!value) {
    return false;
  }
  if (value.constructor === typeConstructor) {
    return true;
  }
  return objectToString.call(value) === typeStringified;
}
function isUint8Array(value) {
  return isType(value, Uint8Array, uint8ArrayStringified);
}
function assertUint8Array(value) {
  if (!isUint8Array(value)) {
    throw new TypeError(`Expected \`Uint8Array\`, got \`${typeof value}\``);
  }
}
({
  utf8: new globalThis.TextDecoder("utf8")
});
function assertString(value) {
  if (typeof value !== "string") {
    throw new TypeError(`Expected \`string\`, got \`${typeof value}\``);
  }
}
new globalThis.TextEncoder();
const byteToHexLookupTable = Array.from({ length: 256 }, (_, index2) => index2.toString(16).padStart(2, "0"));
function uint8ArrayToHex(array) {
  assertUint8Array(array);
  let hexString = "";
  for (let index2 = 0; index2 < array.length; index2++) {
    hexString += byteToHexLookupTable[array[index2]];
  }
  return hexString;
}
const hexToDecimalLookupTable = {
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
function hexToUint8Array(hexString) {
  assertString(hexString);
  if (hexString.length % 2 !== 0) {
    throw new Error("Invalid Hex string length.");
  }
  const resultLength = hexString.length / 2;
  const bytes = new Uint8Array(resultLength);
  for (let index2 = 0; index2 < resultLength; index2++) {
    const highNibble = hexToDecimalLookupTable[hexString[index2 * 2]];
    const lowNibble = hexToDecimalLookupTable[hexString[index2 * 2 + 1]];
    if (highNibble === void 0 || lowNibble === void 0) {
      throw new Error(`Invalid Hex character encountered at position ${index2 * 2}`);
    }
    bytes[index2] = highNibble << 4 | lowNibble;
  }
  return bytes;
}
function getUintBE(view) {
  const { byteLength } = view;
  if (byteLength === 6) {
    return view.getUint16(0) * 2 ** 32 + view.getUint32(2);
  }
  if (byteLength === 5) {
    return view.getUint8(0) * 2 ** 32 + view.getUint32(1);
  }
  if (byteLength === 4) {
    return view.getUint32(0);
  }
  if (byteLength === 3) {
    return view.getUint8(0) * 2 ** 16 + view.getUint16(1);
  }
  if (byteLength === 2) {
    return view.getUint16(0);
  }
  if (byteLength === 1) {
    return view.getUint8(0);
  }
}
function stringToBytes(string, encoding) {
  if (encoding === "utf-16le") {
    const bytes = [];
    for (let index2 = 0; index2 < string.length; index2++) {
      const code = string.charCodeAt(index2);
      bytes.push(code & 255, code >> 8 & 255);
    }
    return bytes;
  }
  if (encoding === "utf-16be") {
    const bytes = [];
    for (let index2 = 0; index2 < string.length; index2++) {
      const code = string.charCodeAt(index2);
      bytes.push(code >> 8 & 255, code & 255);
    }
    return bytes;
  }
  return [...string].map((character) => character.charCodeAt(0));
}
function tarHeaderChecksumMatches(arrayBuffer, offset = 0) {
  const readSum = Number.parseInt(new StringType(6).get(arrayBuffer, 148).replace(/\0.*$/, "").trim(), 8);
  if (Number.isNaN(readSum)) {
    return false;
  }
  let sum = 8 * 32;
  for (let index2 = offset; index2 < offset + 148; index2++) {
    sum += arrayBuffer[index2];
  }
  for (let index2 = offset + 156; index2 < offset + 512; index2++) {
    sum += arrayBuffer[index2];
  }
  return readSum === sum;
}
const uint32SyncSafeToken = {
  get: (buffer, offset) => buffer[offset + 3] & 127 | buffer[offset + 2] << 7 | buffer[offset + 1] << 14 | buffer[offset] << 21,
  len: 4
};
const extensions = [
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
];
const mimeTypes = [
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
];
const reasonableDetectionSizeInBytes = 4100;
async function fileTypeFromBuffer(input, options) {
  return new FileTypeParser(options).fromBuffer(input);
}
function getFileTypeFromMimeType(mimeType) {
  mimeType = mimeType.toLowerCase();
  switch (mimeType) {
    case "application/epub+zip":
      return {
        ext: "epub",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.text":
      return {
        ext: "odt",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.text-template":
      return {
        ext: "ott",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.spreadsheet":
      return {
        ext: "ods",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.spreadsheet-template":
      return {
        ext: "ots",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.presentation":
      return {
        ext: "odp",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.presentation-template":
      return {
        ext: "otp",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.graphics":
      return {
        ext: "odg",
        mime: mimeType
      };
    case "application/vnd.oasis.opendocument.graphics-template":
      return {
        ext: "otg",
        mime: mimeType
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.slideshow":
      return {
        ext: "ppsx",
        mime: mimeType
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return {
        ext: "xlsx",
        mime: mimeType
      };
    case "application/vnd.ms-excel.sheet.macroenabled":
      return {
        ext: "xlsm",
        mime: "application/vnd.ms-excel.sheet.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.template":
      return {
        ext: "xltx",
        mime: mimeType
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
        mime: mimeType
      };
    case "application/vnd.ms-word.document.macroenabled":
      return {
        ext: "docm",
        mime: "application/vnd.ms-word.document.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.template":
      return {
        ext: "dotx",
        mime: mimeType
      };
    case "application/vnd.ms-word.template.macroenabledtemplate":
      return {
        ext: "dotm",
        mime: "application/vnd.ms-word.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.template":
      return {
        ext: "potx",
        mime: mimeType
      };
    case "application/vnd.ms-powerpoint.template.macroenabled":
      return {
        ext: "potm",
        mime: "application/vnd.ms-powerpoint.template.macroenabled.12"
      };
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return {
        ext: "pptx",
        mime: mimeType
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
function _check(buffer, headers, options) {
  options = {
    offset: 0,
    ...options
  };
  for (const [index2, header] of headers.entries()) {
    if (options.mask) {
      if (header !== (options.mask[index2] & buffer[index2 + options.offset])) {
        return false;
      }
    } else if (header !== buffer[index2 + options.offset]) {
      return false;
    }
  }
  return true;
}
class FileTypeParser {
  constructor(options) {
    this.options = {
      mpegOffsetTolerance: 0,
      ...options
    };
    this.detectors = [
      ...options?.customDetectors ?? [],
      { id: "core", detect: this.detectConfident },
      { id: "core.imprecise", detect: this.detectImprecise }
    ];
    this.tokenizerOptions = {
      abortSignal: options?.signal
    };
  }
  async fromTokenizer(tokenizer) {
    const initialPosition = tokenizer.position;
    for (const detector of this.detectors) {
      const fileType = await detector.detect(tokenizer);
      if (fileType) {
        return fileType;
      }
      if (initialPosition !== tokenizer.position) {
        return void 0;
      }
    }
  }
  async fromBuffer(input) {
    if (!(input instanceof Uint8Array || input instanceof ArrayBuffer)) {
      throw new TypeError(`Expected the \`input\` argument to be of type \`Uint8Array\` or \`ArrayBuffer\`, got \`${typeof input}\``);
    }
    const buffer = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (!(buffer?.length > 1)) {
      return;
    }
    return this.fromTokenizer(fromBuffer(buffer, this.tokenizerOptions));
  }
  async fromBlob(blob) {
    const tokenizer = fromBlob(blob, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(tokenizer);
    } finally {
      await tokenizer.close();
    }
  }
  async fromStream(stream) {
    const tokenizer = fromWebStream(stream, this.tokenizerOptions);
    try {
      return await this.fromTokenizer(tokenizer);
    } finally {
      await tokenizer.close();
    }
  }
  async toDetectionStream(stream, options) {
    const { sampleSize = reasonableDetectionSizeInBytes } = options;
    let detectedFileType;
    let firstChunk;
    const reader = stream.getReader({ mode: "byob" });
    try {
      const { value: chunk, done } = await reader.read(new Uint8Array(sampleSize));
      firstChunk = chunk;
      if (!done && chunk) {
        try {
          detectedFileType = await this.fromBuffer(chunk.subarray(0, sampleSize));
        } catch (error) {
          if (!(error instanceof EndOfStreamError)) {
            throw error;
          }
          detectedFileType = void 0;
        }
      }
      firstChunk = chunk;
    } finally {
      reader.releaseLock();
    }
    const transformStream = new TransformStream({
      async start(controller) {
        controller.enqueue(firstChunk);
      },
      transform(chunk, controller) {
        controller.enqueue(chunk);
      }
    });
    const newStream = stream.pipeThrough(transformStream);
    newStream.fileType = detectedFileType;
    return newStream;
  }
  check(header, options) {
    return _check(this.buffer, header, options);
  }
  checkString(header, options) {
    return this.check(stringToBytes(header, options?.encoding), options);
  }
  // Detections with a high degree of certainty in identifying the correct file type
  detectConfident = async (tokenizer) => {
    this.buffer = new Uint8Array(reasonableDetectionSizeInBytes);
    if (tokenizer.fileInfo.size === void 0) {
      tokenizer.fileInfo.size = Number.MAX_SAFE_INTEGER;
    }
    this.tokenizer = tokenizer;
    await tokenizer.peekBuffer(this.buffer, { length: 32, mayBeLess: true });
    if (this.check([66, 77])) {
      return {
        ext: "bmp",
        mime: "image/bmp"
      };
    }
    if (this.check([11, 119])) {
      return {
        ext: "ac3",
        mime: "audio/vnd.dolby.dd-raw"
      };
    }
    if (this.check([120, 1])) {
      return {
        ext: "dmg",
        mime: "application/x-apple-diskimage"
      };
    }
    if (this.check([77, 90])) {
      return {
        ext: "exe",
        mime: "application/x-msdownload"
      };
    }
    if (this.check([37, 33])) {
      await tokenizer.peekBuffer(this.buffer, { length: 24, mayBeLess: true });
      if (this.checkString("PS-Adobe-", { offset: 2 }) && this.checkString(" EPSF-", { offset: 14 })) {
        return {
          ext: "eps",
          mime: "application/eps"
        };
      }
      return {
        ext: "ps",
        mime: "application/postscript"
      };
    }
    if (this.check([31, 160]) || this.check([31, 157])) {
      return {
        ext: "Z",
        mime: "application/x-compress"
      };
    }
    if (this.check([199, 113])) {
      return {
        ext: "cpio",
        mime: "application/x-cpio"
      };
    }
    if (this.check([96, 234])) {
      return {
        ext: "arj",
        mime: "application/x-arj"
      };
    }
    if (this.check([239, 187, 191])) {
      this.tokenizer.ignore(3);
      return this.detectConfident(tokenizer);
    }
    if (this.check([71, 73, 70])) {
      return {
        ext: "gif",
        mime: "image/gif"
      };
    }
    if (this.check([73, 73, 188])) {
      return {
        ext: "jxr",
        mime: "image/vnd.ms-photo"
      };
    }
    if (this.check([31, 139, 8])) {
      const gzipHandler = new GzipHandler(tokenizer);
      const stream = gzipHandler.inflate();
      let shouldCancelStream = true;
      try {
        let compressedFileType;
        try {
          compressedFileType = await this.fromStream(stream);
        } catch {
          shouldCancelStream = false;
        }
        if (compressedFileType && compressedFileType.ext === "tar") {
          return {
            ext: "tar.gz",
            mime: "application/gzip"
          };
        }
      } finally {
        if (shouldCancelStream) {
          await stream.cancel();
        }
      }
      return {
        ext: "gz",
        mime: "application/gzip"
      };
    }
    if (this.check([66, 90, 104])) {
      return {
        ext: "bz2",
        mime: "application/x-bzip2"
      };
    }
    if (this.checkString("ID3")) {
      await tokenizer.ignore(6);
      const id3HeaderLength = await tokenizer.readToken(uint32SyncSafeToken);
      if (tokenizer.position + id3HeaderLength > tokenizer.fileInfo.size) {
        return {
          ext: "mp3",
          mime: "audio/mpeg"
        };
      }
      await tokenizer.ignore(id3HeaderLength);
      return this.fromTokenizer(tokenizer);
    }
    if (this.checkString("MP+")) {
      return {
        ext: "mpc",
        mime: "audio/x-musepack"
      };
    }
    if ((this.buffer[0] === 67 || this.buffer[0] === 70) && this.check([87, 83], { offset: 1 })) {
      return {
        ext: "swf",
        mime: "application/x-shockwave-flash"
      };
    }
    if (this.check([255, 216, 255])) {
      if (this.check([247], { offset: 3 })) {
        return {
          ext: "jls",
          mime: "image/jls"
        };
      }
      return {
        ext: "jpg",
        mime: "image/jpeg"
      };
    }
    if (this.check([79, 98, 106, 1])) {
      return {
        ext: "avro",
        mime: "application/avro"
      };
    }
    if (this.checkString("FLIF")) {
      return {
        ext: "flif",
        mime: "image/flif"
      };
    }
    if (this.checkString("8BPS")) {
      return {
        ext: "psd",
        mime: "image/vnd.adobe.photoshop"
      };
    }
    if (this.checkString("MPCK")) {
      return {
        ext: "mpc",
        mime: "audio/x-musepack"
      };
    }
    if (this.checkString("FORM")) {
      return {
        ext: "aif",
        mime: "audio/aiff"
      };
    }
    if (this.checkString("icns", { offset: 0 })) {
      return {
        ext: "icns",
        mime: "image/icns"
      };
    }
    if (this.check([80, 75, 3, 4])) {
      let fileType;
      await new ZipHandler(tokenizer).unzip((zipHeader) => {
        switch (zipHeader.filename) {
          case "META-INF/mozilla.rsa":
            fileType = {
              ext: "xpi",
              mime: "application/x-xpinstall"
            };
            return {
              stop: true
            };
          case "META-INF/MANIFEST.MF":
            fileType = {
              ext: "jar",
              mime: "application/java-archive"
            };
            return {
              stop: true
            };
          case "mimetype":
            return {
              async handler(fileData) {
                const mimeType = new TextDecoder("utf-8").decode(fileData).trim();
                fileType = getFileTypeFromMimeType(mimeType);
              },
              stop: true
            };
          case "[Content_Types].xml":
            return {
              async handler(fileData) {
                let xmlContent = new TextDecoder("utf-8").decode(fileData);
                const endPos = xmlContent.indexOf('.main+xml"');
                if (endPos === -1) {
                  const mimeType = "application/vnd.ms-package.3dmanufacturing-3dmodel+xml";
                  if (xmlContent.includes(`ContentType="${mimeType}"`)) {
                    fileType = getFileTypeFromMimeType(mimeType);
                  }
                } else {
                  xmlContent = xmlContent.slice(0, Math.max(0, endPos));
                  const firstPos = xmlContent.lastIndexOf('"');
                  const mimeType = xmlContent.slice(Math.max(0, firstPos + 1));
                  fileType = getFileTypeFromMimeType(mimeType);
                }
              },
              stop: true
            };
          default:
            if (/classes\d*\.dex/.test(zipHeader.filename)) {
              fileType = {
                ext: "apk",
                mime: "application/vnd.android.package-archive"
              };
              return { stop: true };
            }
            return {};
        }
      }).catch((error) => {
        if (!(error instanceof EndOfStreamError)) {
          throw error;
        }
      });
      return fileType ?? {
        ext: "zip",
        mime: "application/zip"
      };
    }
    if (this.checkString("OggS")) {
      await tokenizer.ignore(28);
      const type = new Uint8Array(8);
      await tokenizer.readBuffer(type);
      if (_check(type, [79, 112, 117, 115, 72, 101, 97, 100])) {
        return {
          ext: "opus",
          mime: "audio/ogg; codecs=opus"
        };
      }
      if (_check(type, [128, 116, 104, 101, 111, 114, 97])) {
        return {
          ext: "ogv",
          mime: "video/ogg"
        };
      }
      if (_check(type, [1, 118, 105, 100, 101, 111, 0])) {
        return {
          ext: "ogm",
          mime: "video/ogg"
        };
      }
      if (_check(type, [127, 70, 76, 65, 67])) {
        return {
          ext: "oga",
          mime: "audio/ogg"
        };
      }
      if (_check(type, [83, 112, 101, 101, 120, 32, 32])) {
        return {
          ext: "spx",
          mime: "audio/ogg"
        };
      }
      if (_check(type, [1, 118, 111, 114, 98, 105, 115])) {
        return {
          ext: "ogg",
          mime: "audio/ogg"
        };
      }
      return {
        ext: "ogx",
        mime: "application/ogg"
      };
    }
    if (this.check([80, 75]) && (this.buffer[2] === 3 || this.buffer[2] === 5 || this.buffer[2] === 7) && (this.buffer[3] === 4 || this.buffer[3] === 6 || this.buffer[3] === 8)) {
      return {
        ext: "zip",
        mime: "application/zip"
      };
    }
    if (this.checkString("MThd")) {
      return {
        ext: "mid",
        mime: "audio/midi"
      };
    }
    if (this.checkString("wOFF") && (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString("OTTO", { offset: 4 }))) {
      return {
        ext: "woff",
        mime: "font/woff"
      };
    }
    if (this.checkString("wOF2") && (this.check([0, 1, 0, 0], { offset: 4 }) || this.checkString("OTTO", { offset: 4 }))) {
      return {
        ext: "woff2",
        mime: "font/woff2"
      };
    }
    if (this.check([212, 195, 178, 161]) || this.check([161, 178, 195, 212])) {
      return {
        ext: "pcap",
        mime: "application/vnd.tcpdump.pcap"
      };
    }
    if (this.checkString("DSD ")) {
      return {
        ext: "dsf",
        mime: "audio/x-dsf"
        // Non-standard
      };
    }
    if (this.checkString("LZIP")) {
      return {
        ext: "lz",
        mime: "application/x-lzip"
      };
    }
    if (this.checkString("fLaC")) {
      return {
        ext: "flac",
        mime: "audio/flac"
      };
    }
    if (this.check([66, 80, 71, 251])) {
      return {
        ext: "bpg",
        mime: "image/bpg"
      };
    }
    if (this.checkString("wvpk")) {
      return {
        ext: "wv",
        mime: "audio/wavpack"
      };
    }
    if (this.checkString("%PDF")) {
      return {
        ext: "pdf",
        mime: "application/pdf"
      };
    }
    if (this.check([0, 97, 115, 109])) {
      return {
        ext: "wasm",
        mime: "application/wasm"
      };
    }
    if (this.check([73, 73])) {
      const fileType = await this.readTiffHeader(false);
      if (fileType) {
        return fileType;
      }
    }
    if (this.check([77, 77])) {
      const fileType = await this.readTiffHeader(true);
      if (fileType) {
        return fileType;
      }
    }
    if (this.checkString("MAC ")) {
      return {
        ext: "ape",
        mime: "audio/ape"
      };
    }
    if (this.check([26, 69, 223, 163])) {
      async function readField() {
        const msb = await tokenizer.peekNumber(UINT8);
        let mask = 128;
        let ic = 0;
        while ((msb & mask) === 0 && mask !== 0) {
          ++ic;
          mask >>= 1;
        }
        const id = new Uint8Array(ic + 1);
        await tokenizer.readBuffer(id);
        return id;
      }
      async function readElement() {
        const idField = await readField();
        const lengthField = await readField();
        lengthField[0] ^= 128 >> lengthField.length - 1;
        const nrLength = Math.min(6, lengthField.length);
        const idView = new DataView(idField.buffer);
        const lengthView = new DataView(lengthField.buffer, lengthField.length - nrLength, nrLength);
        return {
          id: getUintBE(idView),
          len: getUintBE(lengthView)
        };
      }
      async function readChildren(children) {
        while (children > 0) {
          const element = await readElement();
          if (element.id === 17026) {
            const rawValue = await tokenizer.readToken(new StringType(element.len));
            return rawValue.replaceAll(/\00.*$/g, "");
          }
          await tokenizer.ignore(element.len);
          --children;
        }
      }
      const re = await readElement();
      const documentType = await readChildren(re.len);
      switch (documentType) {
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
    if (this.checkString("SQLi")) {
      return {
        ext: "sqlite",
        mime: "application/x-sqlite3"
      };
    }
    if (this.check([78, 69, 83, 26])) {
      return {
        ext: "nes",
        mime: "application/x-nintendo-nes-rom"
      };
    }
    if (this.checkString("Cr24")) {
      return {
        ext: "crx",
        mime: "application/x-google-chrome-extension"
      };
    }
    if (this.checkString("MSCF") || this.checkString("ISc(")) {
      return {
        ext: "cab",
        mime: "application/vnd.ms-cab-compressed"
      };
    }
    if (this.check([237, 171, 238, 219])) {
      return {
        ext: "rpm",
        mime: "application/x-rpm"
      };
    }
    if (this.check([197, 208, 211, 198])) {
      return {
        ext: "eps",
        mime: "application/eps"
      };
    }
    if (this.check([40, 181, 47, 253])) {
      return {
        ext: "zst",
        mime: "application/zstd"
      };
    }
    if (this.check([127, 69, 76, 70])) {
      return {
        ext: "elf",
        mime: "application/x-elf"
      };
    }
    if (this.check([33, 66, 68, 78])) {
      return {
        ext: "pst",
        mime: "application/vnd.ms-outlook"
      };
    }
    if (this.checkString("PAR1") || this.checkString("PARE")) {
      return {
        ext: "parquet",
        mime: "application/vnd.apache.parquet"
      };
    }
    if (this.checkString("ttcf")) {
      return {
        ext: "ttc",
        mime: "font/collection"
      };
    }
    if (this.check([207, 250, 237, 254])) {
      return {
        ext: "macho",
        mime: "application/x-mach-binary"
      };
    }
    if (this.check([4, 34, 77, 24])) {
      return {
        ext: "lz4",
        mime: "application/x-lz4"
        // Invented by us
      };
    }
    if (this.checkString("regf")) {
      return {
        ext: "dat",
        mime: "application/x-ft-windows-registry-hive"
      };
    }
    if (this.check([79, 84, 84, 79, 0])) {
      return {
        ext: "otf",
        mime: "font/otf"
      };
    }
    if (this.checkString("#!AMR")) {
      return {
        ext: "amr",
        mime: "audio/amr"
      };
    }
    if (this.checkString("{\\rtf")) {
      return {
        ext: "rtf",
        mime: "application/rtf"
      };
    }
    if (this.check([70, 76, 86, 1])) {
      return {
        ext: "flv",
        mime: "video/x-flv"
      };
    }
    if (this.checkString("IMPM")) {
      return {
        ext: "it",
        mime: "audio/x-it"
      };
    }
    if (this.checkString("-lh0-", { offset: 2 }) || this.checkString("-lh1-", { offset: 2 }) || this.checkString("-lh2-", { offset: 2 }) || this.checkString("-lh3-", { offset: 2 }) || this.checkString("-lh4-", { offset: 2 }) || this.checkString("-lh5-", { offset: 2 }) || this.checkString("-lh6-", { offset: 2 }) || this.checkString("-lh7-", { offset: 2 }) || this.checkString("-lzs-", { offset: 2 }) || this.checkString("-lz4-", { offset: 2 }) || this.checkString("-lz5-", { offset: 2 }) || this.checkString("-lhd-", { offset: 2 })) {
      return {
        ext: "lzh",
        mime: "application/x-lzh-compressed"
      };
    }
    if (this.check([0, 0, 1, 186])) {
      if (this.check([33], { offset: 4, mask: [241] })) {
        return {
          ext: "mpg",
          // May also be .ps, .mpeg
          mime: "video/MP1S"
        };
      }
      if (this.check([68], { offset: 4, mask: [196] })) {
        return {
          ext: "mpg",
          // May also be .mpg, .m2p, .vob or .sub
          mime: "video/MP2P"
        };
      }
    }
    if (this.checkString("ITSF")) {
      return {
        ext: "chm",
        mime: "application/vnd.ms-htmlhelp"
      };
    }
    if (this.check([202, 254, 186, 190])) {
      return {
        ext: "class",
        mime: "application/java-vm"
      };
    }
    if (this.checkString(".RMF")) {
      return {
        ext: "rm",
        mime: "application/vnd.rn-realmedia"
      };
    }
    if (this.checkString("DRACO")) {
      return {
        ext: "drc",
        mime: "application/vnd.google.draco"
        // Invented by us
      };
    }
    if (this.check([253, 55, 122, 88, 90, 0])) {
      return {
        ext: "xz",
        mime: "application/x-xz"
      };
    }
    if (this.checkString("<?xml ")) {
      return {
        ext: "xml",
        mime: "application/xml"
      };
    }
    if (this.check([55, 122, 188, 175, 39, 28])) {
      return {
        ext: "7z",
        mime: "application/x-7z-compressed"
      };
    }
    if (this.check([82, 97, 114, 33, 26, 7]) && (this.buffer[6] === 0 || this.buffer[6] === 1)) {
      return {
        ext: "rar",
        mime: "application/x-rar-compressed"
      };
    }
    if (this.checkString("solid ")) {
      return {
        ext: "stl",
        mime: "model/stl"
      };
    }
    if (this.checkString("AC")) {
      const version = new StringType(4, "latin1").get(this.buffer, 2);
      if (version.match("^d*") && version >= 1e3 && version <= 1050) {
        return {
          ext: "dwg",
          mime: "image/vnd.dwg"
        };
      }
    }
    if (this.checkString("070707")) {
      return {
        ext: "cpio",
        mime: "application/x-cpio"
      };
    }
    if (this.checkString("BLENDER")) {
      return {
        ext: "blend",
        mime: "application/x-blender"
      };
    }
    if (this.checkString("!<arch>")) {
      await tokenizer.ignore(8);
      const string = await tokenizer.readToken(new StringType(13, "ascii"));
      if (string === "debian-binary") {
        return {
          ext: "deb",
          mime: "application/x-deb"
        };
      }
      return {
        ext: "ar",
        mime: "application/x-unix-archive"
      };
    }
    if (this.checkString("WEBVTT") && // One of LF, CR, tab, space, or end of file must follow "WEBVTT" per the spec (see `fixture/fixture-vtt-*.vtt` for examples). Note that `\0` is technically the null character (there is no such thing as an EOF character). However, checking for `\0` gives us the same result as checking for the end of the stream.
    ["\n", "\r", "	", " ", "\0"].some((char7) => this.checkString(char7, { offset: 6 }))) {
      return {
        ext: "vtt",
        mime: "text/vtt"
      };
    }
    if (this.check([137, 80, 78, 71, 13, 10, 26, 10])) {
      await tokenizer.ignore(8);
      async function readChunkHeader() {
        return {
          length: await tokenizer.readToken(INT32_BE),
          type: await tokenizer.readToken(new StringType(4, "latin1"))
        };
      }
      do {
        const chunk = await readChunkHeader();
        if (chunk.length < 0) {
          return;
        }
        switch (chunk.type) {
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
            await tokenizer.ignore(chunk.length + 4);
        }
      } while (tokenizer.position + 8 < tokenizer.fileInfo.size);
      return {
        ext: "png",
        mime: "image/png"
      };
    }
    if (this.check([65, 82, 82, 79, 87, 49, 0, 0])) {
      return {
        ext: "arrow",
        mime: "application/vnd.apache.arrow.file"
      };
    }
    if (this.check([103, 108, 84, 70, 2, 0, 0, 0])) {
      return {
        ext: "glb",
        mime: "model/gltf-binary"
      };
    }
    if (this.check([102, 114, 101, 101], { offset: 4 }) || this.check([109, 100, 97, 116], { offset: 4 }) || this.check([109, 111, 111, 118], { offset: 4 }) || this.check([119, 105, 100, 101], { offset: 4 })) {
      return {
        ext: "mov",
        mime: "video/quicktime"
      };
    }
    if (this.check([73, 73, 82, 79, 8, 0, 0, 0, 24])) {
      return {
        ext: "orf",
        mime: "image/x-olympus-orf"
      };
    }
    if (this.checkString("gimp xcf ")) {
      return {
        ext: "xcf",
        mime: "image/x-xcf"
      };
    }
    if (this.checkString("ftyp", { offset: 4 }) && (this.buffer[8] & 96) !== 0) {
      const brandMajor = new StringType(4, "latin1").get(this.buffer, 8).replace("\0", " ").trim();
      switch (brandMajor) {
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
          if (brandMajor.startsWith("3g")) {
            if (brandMajor.startsWith("3g2")) {
              return { ext: "3g2", mime: "video/3gpp2" };
            }
            return { ext: "3gp", mime: "video/3gpp" };
          }
          return { ext: "mp4", mime: "video/mp4" };
      }
    }
    if (this.checkString("REGEDIT4\r\n")) {
      return {
        ext: "reg",
        mime: "application/x-ms-regedit"
      };
    }
    if (this.check([82, 73, 70, 70])) {
      if (this.checkString("WEBP", { offset: 8 })) {
        return {
          ext: "webp",
          mime: "image/webp"
        };
      }
      if (this.check([65, 86, 73], { offset: 8 })) {
        return {
          ext: "avi",
          mime: "video/vnd.avi"
        };
      }
      if (this.check([87, 65, 86, 69], { offset: 8 })) {
        return {
          ext: "wav",
          mime: "audio/wav"
        };
      }
      if (this.check([81, 76, 67, 77], { offset: 8 })) {
        return {
          ext: "qcp",
          mime: "audio/qcelp"
        };
      }
    }
    if (this.check([73, 73, 85, 0, 24, 0, 0, 0, 136, 231, 116, 216])) {
      return {
        ext: "rw2",
        mime: "image/x-panasonic-rw2"
      };
    }
    if (this.check([48, 38, 178, 117, 142, 102, 207, 17, 166, 217])) {
      async function readHeader() {
        const guid = new Uint8Array(16);
        await tokenizer.readBuffer(guid);
        return {
          id: guid,
          size: Number(await tokenizer.readToken(UINT64_LE))
        };
      }
      await tokenizer.ignore(30);
      while (tokenizer.position + 24 < tokenizer.fileInfo.size) {
        const header = await readHeader();
        let payload = header.size - 24;
        if (_check(header.id, [145, 7, 220, 183, 183, 169, 207, 17, 142, 230, 0, 192, 12, 32, 83, 101])) {
          const typeId = new Uint8Array(16);
          payload -= await tokenizer.readBuffer(typeId);
          if (_check(typeId, [64, 158, 105, 248, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) {
            return {
              ext: "asf",
              mime: "audio/x-ms-asf"
            };
          }
          if (_check(typeId, [192, 239, 25, 188, 77, 91, 207, 17, 168, 253, 0, 128, 95, 92, 68, 43])) {
            return {
              ext: "asf",
              mime: "video/x-ms-asf"
            };
          }
          break;
        }
        await tokenizer.ignore(payload);
      }
      return {
        ext: "asf",
        mime: "application/vnd.ms-asf"
      };
    }
    if (this.check([171, 75, 84, 88, 32, 49, 49, 187, 13, 10, 26, 10])) {
      return {
        ext: "ktx",
        mime: "image/ktx"
      };
    }
    if ((this.check([126, 16, 4]) || this.check([126, 24, 4])) && this.check([48, 77, 73, 69], { offset: 4 })) {
      return {
        ext: "mie",
        mime: "application/x-mie"
      };
    }
    if (this.check([39, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { offset: 2 })) {
      return {
        ext: "shp",
        mime: "application/x-esri-shape"
      };
    }
    if (this.check([255, 79, 255, 81])) {
      return {
        ext: "j2c",
        mime: "image/j2c"
      };
    }
    if (this.check([0, 0, 0, 12, 106, 80, 32, 32, 13, 10, 135, 10])) {
      await tokenizer.ignore(20);
      const type = await tokenizer.readToken(new StringType(4, "ascii"));
      switch (type) {
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
    }
    if (this.check([255, 10]) || this.check([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10])) {
      return {
        ext: "jxl",
        mime: "image/jxl"
      };
    }
    if (this.check([254, 255])) {
      if (this.checkString("<?xml ", { offset: 2, encoding: "utf-16be" })) {
        return {
          ext: "xml",
          mime: "application/xml"
        };
      }
      return void 0;
    }
    if (this.check([208, 207, 17, 224, 161, 177, 26, 225])) {
      return {
        ext: "cfb",
        mime: "application/x-cfb"
      };
    }
    await tokenizer.peekBuffer(this.buffer, { length: Math.min(256, tokenizer.fileInfo.size), mayBeLess: true });
    if (this.check([97, 99, 115, 112], { offset: 36 })) {
      return {
        ext: "icc",
        mime: "application/vnd.iccprofile"
      };
    }
    if (this.checkString("**ACE", { offset: 7 }) && this.checkString("**", { offset: 12 })) {
      return {
        ext: "ace",
        mime: "application/x-ace-compressed"
      };
    }
    if (this.checkString("BEGIN:")) {
      if (this.checkString("VCARD", { offset: 6 })) {
        return {
          ext: "vcf",
          mime: "text/vcard"
        };
      }
      if (this.checkString("VCALENDAR", { offset: 6 })) {
        return {
          ext: "ics",
          mime: "text/calendar"
        };
      }
    }
    if (this.checkString("FUJIFILMCCD-RAW")) {
      return {
        ext: "raf",
        mime: "image/x-fujifilm-raf"
      };
    }
    if (this.checkString("Extended Module:")) {
      return {
        ext: "xm",
        mime: "audio/x-xm"
      };
    }
    if (this.checkString("Creative Voice File")) {
      return {
        ext: "voc",
        mime: "audio/x-voc"
      };
    }
    if (this.check([4, 0, 0, 0]) && this.buffer.length >= 16) {
      const jsonSize = new DataView(this.buffer.buffer).getUint32(12, true);
      if (jsonSize > 12 && this.buffer.length >= jsonSize + 16) {
        try {
          const header = new TextDecoder().decode(this.buffer.subarray(16, jsonSize + 16));
          const json = JSON.parse(header);
          if (json.files) {
            return {
              ext: "asar",
              mime: "application/x-asar"
            };
          }
        } catch {
        }
      }
    }
    if (this.check([6, 14, 43, 52, 2, 5, 1, 1, 13, 1, 2, 1, 1, 2])) {
      return {
        ext: "mxf",
        mime: "application/mxf"
      };
    }
    if (this.checkString("SCRM", { offset: 44 })) {
      return {
        ext: "s3m",
        mime: "audio/x-s3m"
      };
    }
    if (this.check([71]) && this.check([71], { offset: 188 })) {
      return {
        ext: "mts",
        mime: "video/mp2t"
      };
    }
    if (this.check([71], { offset: 4 }) && this.check([71], { offset: 196 })) {
      return {
        ext: "mts",
        mime: "video/mp2t"
      };
    }
    if (this.check([66, 79, 79, 75, 77, 79, 66, 73], { offset: 60 })) {
      return {
        ext: "mobi",
        mime: "application/x-mobipocket-ebook"
      };
    }
    if (this.check([68, 73, 67, 77], { offset: 128 })) {
      return {
        ext: "dcm",
        mime: "application/dicom"
      };
    }
    if (this.check([76, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 192, 0, 0, 0, 0, 0, 0, 70])) {
      return {
        ext: "lnk",
        mime: "application/x.ms.shortcut"
        // Invented by us
      };
    }
    if (this.check([98, 111, 111, 107, 0, 0, 0, 0, 109, 97, 114, 107, 0, 0, 0, 0])) {
      return {
        ext: "alias",
        mime: "application/x.apple.alias"
        // Invented by us
      };
    }
    if (this.checkString("Kaydara FBX Binary  \0")) {
      return {
        ext: "fbx",
        mime: "application/x.autodesk.fbx"
        // Invented by us
      };
    }
    if (this.check([76, 80], { offset: 34 }) && (this.check([0, 0, 1], { offset: 8 }) || this.check([1, 0, 2], { offset: 8 }) || this.check([2, 0, 2], { offset: 8 }))) {
      return {
        ext: "eot",
        mime: "application/vnd.ms-fontobject"
      };
    }
    if (this.check([6, 6, 237, 245, 216, 29, 70, 229, 189, 49, 239, 231, 254, 116, 183, 29])) {
      return {
        ext: "indd",
        mime: "application/x-indesign"
      };
    }
    await tokenizer.peekBuffer(this.buffer, { length: Math.min(512, tokenizer.fileInfo.size), mayBeLess: true });
    if (this.checkString("ustar", { offset: 257 }) && (this.checkString("\0", { offset: 262 }) || this.checkString(" ", { offset: 262 })) || this.check([0, 0, 0, 0, 0, 0], { offset: 257 }) && tarHeaderChecksumMatches(this.buffer)) {
      return {
        ext: "tar",
        mime: "application/x-tar"
      };
    }
    if (this.check([255, 254])) {
      const encoding = "utf-16le";
      if (this.checkString("<?xml ", { offset: 2, encoding })) {
        return {
          ext: "xml",
          mime: "application/xml"
        };
      }
      if (this.check([255, 14], { offset: 2 }) && this.checkString("SketchUp Model", { offset: 4, encoding })) {
        return {
          ext: "skp",
          mime: "application/vnd.sketchup.skp"
        };
      }
      if (this.checkString("Windows Registry Editor Version 5.00\r\n", { offset: 2, encoding })) {
        return {
          ext: "reg",
          mime: "application/x-ms-regedit"
        };
      }
      return void 0;
    }
    if (this.checkString("-----BEGIN PGP MESSAGE-----")) {
      return {
        ext: "pgp",
        mime: "application/pgp-encrypted"
      };
    }
  };
  // Detections with limited supporting data, resulting in a higher likelihood of false positives
  detectImprecise = async (tokenizer) => {
    this.buffer = new Uint8Array(reasonableDetectionSizeInBytes);
    await tokenizer.peekBuffer(this.buffer, { length: Math.min(8, tokenizer.fileInfo.size), mayBeLess: true });
    if (this.check([0, 0, 1, 186]) || this.check([0, 0, 1, 179])) {
      return {
        ext: "mpg",
        mime: "video/mpeg"
      };
    }
    if (this.check([0, 1, 0, 0, 0])) {
      return {
        ext: "ttf",
        mime: "font/ttf"
      };
    }
    if (this.check([0, 0, 1, 0])) {
      return {
        ext: "ico",
        mime: "image/x-icon"
      };
    }
    if (this.check([0, 0, 2, 0])) {
      return {
        ext: "cur",
        mime: "image/x-icon"
      };
    }
    await tokenizer.peekBuffer(this.buffer, { length: Math.min(2 + this.options.mpegOffsetTolerance, tokenizer.fileInfo.size), mayBeLess: true });
    if (this.buffer.length >= 2 + this.options.mpegOffsetTolerance) {
      for (let depth = 0; depth <= this.options.mpegOffsetTolerance; ++depth) {
        const type = this.scanMpeg(depth);
        if (type) {
          return type;
        }
      }
    }
  };
  async readTiffTag(bigEndian) {
    const tagId = await this.tokenizer.readToken(bigEndian ? UINT16_BE : UINT16_LE);
    this.tokenizer.ignore(10);
    switch (tagId) {
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
  async readTiffIFD(bigEndian) {
    const numberOfTags = await this.tokenizer.readToken(bigEndian ? UINT16_BE : UINT16_LE);
    for (let n = 0; n < numberOfTags; ++n) {
      const fileType = await this.readTiffTag(bigEndian);
      if (fileType) {
        return fileType;
      }
    }
  }
  async readTiffHeader(bigEndian) {
    const version = (bigEndian ? UINT16_BE : UINT16_LE).get(this.buffer, 2);
    const ifdOffset = (bigEndian ? UINT32_BE : UINT32_LE).get(this.buffer, 4);
    if (version === 42) {
      if (ifdOffset >= 6) {
        if (this.checkString("CR", { offset: 8 })) {
          return {
            ext: "cr2",
            mime: "image/x-canon-cr2"
          };
        }
        if (ifdOffset >= 8) {
          const someId1 = (bigEndian ? UINT16_BE : UINT16_LE).get(this.buffer, 8);
          const someId2 = (bigEndian ? UINT16_BE : UINT16_LE).get(this.buffer, 10);
          if (someId1 === 28 && someId2 === 254 || someId1 === 31 && someId2 === 11) {
            return {
              ext: "nef",
              mime: "image/x-nikon-nef"
            };
          }
        }
      }
      await this.tokenizer.ignore(ifdOffset);
      const fileType = await this.readTiffIFD(bigEndian);
      return fileType ?? {
        ext: "tif",
        mime: "image/tiff"
      };
    }
    if (version === 43) {
      return {
        ext: "tif",
        mime: "image/tiff"
      };
    }
  }
  /**
  	Scan check MPEG 1 or 2 Layer 3 header, or 'layer 0' for ADTS (MPEG sync-word 0xFFE).
  
  	@param offset - Offset to scan for sync-preamble.
  	@returns {{ext: string, mime: string}}
  	*/
  scanMpeg(offset) {
    if (this.check([255, 224], { offset, mask: [255, 224] })) {
      if (this.check([16], { offset: offset + 1, mask: [22] })) {
        if (this.check([8], { offset: offset + 1, mask: [8] })) {
          return {
            ext: "aac",
            mime: "audio/aac"
          };
        }
        return {
          ext: "aac",
          mime: "audio/aac"
        };
      }
      if (this.check([2], { offset: offset + 1, mask: [6] })) {
        return {
          ext: "mp3",
          mime: "audio/mpeg"
        };
      }
      if (this.check([4], { offset: offset + 1, mask: [6] })) {
        return {
          ext: "mp2",
          mime: "audio/mpeg"
        };
      }
      if (this.check([6], { offset: offset + 1, mask: [6] })) {
        return {
          ext: "mp1",
          mime: "audio/mpeg"
        };
      }
    }
  }
}
new Set(extensions);
new Set(mimeTypes);
var contentType = {};
var hasRequiredContentType;
function requireContentType() {
  if (hasRequiredContentType) return contentType;
  hasRequiredContentType = 1;
  var PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g;
  var TEXT_REGEXP = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/;
  var TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
  var QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g;
  var QUOTE_REGEXP = /([\\"])/g;
  var TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
  contentType.format = format;
  contentType.parse = parse;
  function format(obj) {
    if (!obj || typeof obj !== "object") {
      throw new TypeError("argument obj is required");
    }
    var parameters = obj.parameters;
    var type = obj.type;
    if (!type || !TYPE_REGEXP.test(type)) {
      throw new TypeError("invalid type");
    }
    var string = type;
    if (parameters && typeof parameters === "object") {
      var param;
      var params = Object.keys(parameters).sort();
      for (var i = 0; i < params.length; i++) {
        param = params[i];
        if (!TOKEN_REGEXP.test(param)) {
          throw new TypeError("invalid parameter name");
        }
        string += "; " + param + "=" + qstring(parameters[param]);
      }
    }
    return string;
  }
  function parse(string) {
    if (!string) {
      throw new TypeError("argument string is required");
    }
    var header = typeof string === "object" ? getcontenttype(string) : string;
    if (typeof header !== "string") {
      throw new TypeError("argument string is required to be a string");
    }
    var index2 = header.indexOf(";");
    var type = index2 !== -1 ? header.slice(0, index2).trim() : header.trim();
    if (!TYPE_REGEXP.test(type)) {
      throw new TypeError("invalid media type");
    }
    var obj = new ContentType2(type.toLowerCase());
    if (index2 !== -1) {
      var key;
      var match;
      var value;
      PARAM_REGEXP.lastIndex = index2;
      while (match = PARAM_REGEXP.exec(header)) {
        if (match.index !== index2) {
          throw new TypeError("invalid parameter format");
        }
        index2 += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];
        if (value.charCodeAt(0) === 34) {
          value = value.slice(1, -1);
          if (value.indexOf("\\") !== -1) {
            value = value.replace(QESC_REGEXP, "$1");
          }
        }
        obj.parameters[key] = value;
      }
      if (index2 !== header.length) {
        throw new TypeError("invalid parameter format");
      }
    }
    return obj;
  }
  function getcontenttype(obj) {
    var header;
    if (typeof obj.getHeader === "function") {
      header = obj.getHeader("content-type");
    } else if (typeof obj.headers === "object") {
      header = obj.headers && obj.headers["content-type"];
    }
    if (typeof header !== "string") {
      throw new TypeError("content-type header is missing from object");
    }
    return header;
  }
  function qstring(val) {
    var str = String(val);
    if (TOKEN_REGEXP.test(str)) {
      return str;
    }
    if (str.length > 0 && !TEXT_REGEXP.test(str)) {
      throw new TypeError("invalid parameter value");
    }
    return '"' + str.replace(QUOTE_REGEXP, "\\$1") + '"';
  }
  function ContentType2(type) {
    this.parameters = /* @__PURE__ */ Object.create(null);
    this.type = type;
  }
  return contentType;
}
var contentTypeExports = requireContentType();
const ContentType = /* @__PURE__ */ getDefaultExportFromCjs(contentTypeExports);
var mediaTyper = {};
var hasRequiredMediaTyper;
function requireMediaTyper() {
  if (hasRequiredMediaTyper) return mediaTyper;
  hasRequiredMediaTyper = 1;
  var SUBTYPE_NAME_REGEXP = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.-]{0,126}$/;
  var TYPE_NAME_REGEXP = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/;
  var TYPE_REGEXP = /^ *([A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126})\/([A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}) *$/;
  mediaTyper.format = format;
  mediaTyper.parse = parse;
  mediaTyper.test = test;
  function format(obj) {
    if (!obj || typeof obj !== "object") {
      throw new TypeError("argument obj is required");
    }
    var subtype = obj.subtype;
    var suffix = obj.suffix;
    var type = obj.type;
    if (!type || !TYPE_NAME_REGEXP.test(type)) {
      throw new TypeError("invalid type");
    }
    if (!subtype || !SUBTYPE_NAME_REGEXP.test(subtype)) {
      throw new TypeError("invalid subtype");
    }
    var string = type + "/" + subtype;
    if (suffix) {
      if (!TYPE_NAME_REGEXP.test(suffix)) {
        throw new TypeError("invalid suffix");
      }
      string += "+" + suffix;
    }
    return string;
  }
  function test(string) {
    if (!string) {
      throw new TypeError("argument string is required");
    }
    if (typeof string !== "string") {
      throw new TypeError("argument string is required to be a string");
    }
    return TYPE_REGEXP.test(string.toLowerCase());
  }
  function parse(string) {
    if (!string) {
      throw new TypeError("argument string is required");
    }
    if (typeof string !== "string") {
      throw new TypeError("argument string is required to be a string");
    }
    var match = TYPE_REGEXP.exec(string.toLowerCase());
    if (!match) {
      throw new TypeError("invalid media type");
    }
    var type = match[1];
    var subtype = match[2];
    var suffix;
    var index2 = subtype.lastIndexOf("+");
    if (index2 !== -1) {
      suffix = subtype.substr(index2 + 1);
      subtype = subtype.substr(0, index2);
    }
    return new MediaType(type, subtype, suffix);
  }
  function MediaType(type, subtype, suffix) {
    this.type = type;
    this.subtype = subtype;
    this.suffix = suffix;
  }
  return mediaTyper;
}
var mediaTyperExports = requireMediaTyper();
const TargetType = {
  10: "shot",
  20: "scene",
  30: "track",
  40: "part",
  50: "album",
  60: "edition",
  70: "collection"
};
const TrackType = {
  video: 1,
  audio: 2,
  complex: 3,
  logo: 4,
  subtitle: 17,
  button: 18,
  control: 32
};
const TrackTypeValueToKeyMap = {
  [TrackType.video]: "video",
  [TrackType.audio]: "audio",
  [TrackType.complex]: "complex",
  [TrackType.logo]: "logo",
  [TrackType.subtitle]: "subtitle",
  [TrackType.button]: "button",
  [TrackType.control]: "control"
};
const makeParseError = (name) => {
  return class ParseError extends Error {
    constructor(message) {
      super(message);
      this.name = name;
    }
  };
};
class CouldNotDetermineFileTypeError extends makeParseError("CouldNotDetermineFileTypeError") {
}
class UnsupportedFileTypeError extends makeParseError("UnsupportedFileTypeError") {
}
class UnexpectedFileContentError extends makeParseError("UnexpectedFileContentError") {
  constructor(fileType, message) {
    super(message);
    this.fileType = fileType;
  }
  // Override toString to include file type information.
  toString() {
    return `${this.name} (FileType: ${this.fileType}): ${this.message}`;
  }
}
class FieldDecodingError extends makeParseError("FieldDecodingError") {
}
class InternalParserError extends makeParseError("InternalParserError") {
}
const makeUnexpectedFileContentError = (fileType) => {
  return class extends UnexpectedFileContentError {
    constructor(message) {
      super(fileType, message);
    }
  };
};
function getBit(buf, off, bit) {
  return (buf[off] & 1 << bit) !== 0;
}
function findZero(uint8Array, start, end, encoding) {
  let i = start;
  if (encoding === "utf-16le") {
    while (uint8Array[i] !== 0 || uint8Array[i + 1] !== 0) {
      if (i >= end)
        return end;
      i += 2;
    }
    return i;
  }
  while (uint8Array[i] !== 0) {
    if (i >= end)
      return end;
    i++;
  }
  return i;
}
function trimRightNull(x) {
  const pos0 = x.indexOf("\0");
  return pos0 === -1 ? x : x.substr(0, pos0);
}
function swapBytes(uint8Array) {
  const l = uint8Array.length;
  if ((l & 1) !== 0)
    throw new FieldDecodingError("Buffer length must be even");
  for (let i = 0; i < l; i += 2) {
    const a = uint8Array[i];
    uint8Array[i] = uint8Array[i + 1];
    uint8Array[i + 1] = a;
  }
  return uint8Array;
}
function decodeString(uint8Array, encoding) {
  if (uint8Array[0] === 255 && uint8Array[1] === 254) {
    return decodeString(uint8Array.subarray(2), encoding);
  }
  if (encoding === "utf-16le" && uint8Array[0] === 254 && uint8Array[1] === 255) {
    if ((uint8Array.length & 1) !== 0)
      throw new FieldDecodingError("Expected even number of octets for 16-bit unicode string");
    return decodeString(swapBytes(uint8Array), encoding);
  }
  return new StringType(uint8Array.length, encoding).get(uint8Array, 0);
}
function stripNulls(str) {
  str = str.replace(/^\x00+/g, "");
  str = str.replace(/\x00+$/g, "");
  return str;
}
function getBitAllignedNumber(source, byteOffset, bitOffset, len) {
  const byteOff = byteOffset + ~~(bitOffset / 8);
  const bitOff = bitOffset % 8;
  let value = source[byteOff];
  value &= 255 >> bitOff;
  const bitsRead = 8 - bitOff;
  const bitsLeft = len - bitsRead;
  if (bitsLeft < 0) {
    value >>= 8 - bitOff - len;
  } else if (bitsLeft > 0) {
    value <<= bitsLeft;
    value |= getBitAllignedNumber(source, byteOffset, bitOffset + bitsRead, bitsLeft);
  }
  return value;
}
function isBitSet$1(source, byteOffset, bitOffset) {
  return getBitAllignedNumber(source, byteOffset, bitOffset, 1) === 1;
}
function a2hex(str) {
  const arr = [];
  for (let i = 0, l = str.length; i < l; i++) {
    const hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex.length === 1 ? `0${hex}` : hex);
  }
  return arr.join(" ");
}
function ratioToDb(ratio) {
  return 10 * Math.log10(ratio);
}
function dbToRatio(dB) {
  return 10 ** (dB / 10);
}
function toRatio(value) {
  const ps = value.split(" ").map((p) => p.trim().toLowerCase());
  if (ps.length >= 1) {
    const v = Number.parseFloat(ps[0]);
    return ps.length === 2 && ps[1] === "db" ? {
      dB: v,
      ratio: dbToRatio(v)
    } : {
      dB: ratioToDb(v),
      ratio: v
    };
  }
}
function decodeUintBE(uint8Array) {
  if (uint8Array.length === 0) {
    throw new Error("decodeUintBE: empty Uint8Array");
  }
  const view = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength);
  return getUintBE(view);
}
const AttachedPictureType = {
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
};
const LyricsContentType = {
  lyrics: 1
};
const TimestampFormat = {
  notSynchronized: 0,
  milliseconds: 2
};
const UINT32SYNCSAFE = {
  get: (buf, off) => {
    return buf[off + 3] & 127 | buf[off + 2] << 7 | buf[off + 1] << 14 | buf[off] << 21;
  },
  len: 4
};
const ID3v2Header = {
  len: 10,
  get: (buf, off) => {
    return {
      // ID3v2/file identifier   "ID3"
      fileIdentifier: new StringType(3, "ascii").get(buf, off),
      // ID3v2 versionIndex
      version: {
        major: INT8.get(buf, off + 3),
        revision: INT8.get(buf, off + 4)
      },
      // ID3v2 flags
      flags: {
        // Unsynchronisation
        unsynchronisation: getBit(buf, off + 5, 7),
        // Extended header
        isExtendedHeader: getBit(buf, off + 5, 6),
        // Experimental indicator
        expIndicator: getBit(buf, off + 5, 5),
        footer: getBit(buf, off + 5, 4)
      },
      size: UINT32SYNCSAFE.get(buf, off + 6)
    };
  }
};
const ExtendedHeader = {
  len: 10,
  get: (buf, off) => {
    return {
      // Extended header size
      size: UINT32_BE.get(buf, off),
      // Extended Flags
      extendedFlags: UINT16_BE.get(buf, off + 4),
      // Size of padding
      sizeOfPadding: UINT32_BE.get(buf, off + 6),
      // CRC data present
      crcDataPresent: getBit(buf, off + 4, 31)
    };
  }
};
const TextEncodingToken = {
  len: 1,
  get: (uint8Array, off) => {
    switch (uint8Array[off]) {
      case 0:
        return { encoding: "latin1" };
      // binary
      case 1:
        return { encoding: "utf-16le", bom: true };
      case 2:
        return { encoding: "utf-16le", bom: false };
      case 3:
        return { encoding: "utf8", bom: false };
      default:
        return { encoding: "utf8", bom: false };
    }
  }
};
const TextHeader = {
  len: 4,
  get: (uint8Array, off) => {
    return {
      encoding: TextEncodingToken.get(uint8Array, off),
      language: new StringType(3, "latin1").get(uint8Array, off + 1)
    };
  }
};
const SyncTextHeader = {
  len: 6,
  get: (uint8Array, off) => {
    const text = TextHeader.get(uint8Array, off);
    return {
      encoding: text.encoding,
      language: text.language,
      timeStampFormat: UINT8.get(uint8Array, off + 4),
      contentType: UINT8.get(uint8Array, off + 5)
    };
  }
};
const defaultTagInfo = {
  multiple: false
};
const commonTags = {
  year: defaultTagInfo,
  track: defaultTagInfo,
  disk: defaultTagInfo,
  title: defaultTagInfo,
  artist: defaultTagInfo,
  artists: { multiple: true, unique: true },
  albumartist: defaultTagInfo,
  album: defaultTagInfo,
  date: defaultTagInfo,
  originaldate: defaultTagInfo,
  originalyear: defaultTagInfo,
  releasedate: defaultTagInfo,
  comment: { multiple: true, unique: false },
  genre: { multiple: true, unique: true },
  picture: { multiple: true, unique: true },
  composer: { multiple: true, unique: true },
  lyrics: { multiple: true, unique: false },
  albumsort: { multiple: false, unique: true },
  titlesort: { multiple: false, unique: true },
  work: { multiple: false, unique: true },
  artistsort: { multiple: false, unique: true },
  albumartistsort: { multiple: false, unique: true },
  composersort: { multiple: false, unique: true },
  lyricist: { multiple: true, unique: true },
  writer: { multiple: true, unique: true },
  conductor: { multiple: true, unique: true },
  remixer: { multiple: true, unique: true },
  arranger: { multiple: true, unique: true },
  engineer: { multiple: true, unique: true },
  producer: { multiple: true, unique: true },
  technician: { multiple: true, unique: true },
  djmixer: { multiple: true, unique: true },
  mixer: { multiple: true, unique: true },
  label: { multiple: true, unique: true },
  grouping: defaultTagInfo,
  subtitle: { multiple: true },
  discsubtitle: defaultTagInfo,
  totaltracks: defaultTagInfo,
  totaldiscs: defaultTagInfo,
  compilation: defaultTagInfo,
  rating: { multiple: true },
  bpm: defaultTagInfo,
  mood: defaultTagInfo,
  media: defaultTagInfo,
  catalognumber: { multiple: true, unique: true },
  tvShow: defaultTagInfo,
  tvShowSort: defaultTagInfo,
  tvSeason: defaultTagInfo,
  tvEpisode: defaultTagInfo,
  tvEpisodeId: defaultTagInfo,
  tvNetwork: defaultTagInfo,
  podcast: defaultTagInfo,
  podcasturl: defaultTagInfo,
  releasestatus: defaultTagInfo,
  releasetype: { multiple: true },
  releasecountry: defaultTagInfo,
  script: defaultTagInfo,
  language: defaultTagInfo,
  copyright: defaultTagInfo,
  license: defaultTagInfo,
  encodedby: defaultTagInfo,
  encodersettings: defaultTagInfo,
  gapless: defaultTagInfo,
  barcode: defaultTagInfo,
  isrc: { multiple: true },
  asin: defaultTagInfo,
  musicbrainz_recordingid: defaultTagInfo,
  musicbrainz_trackid: defaultTagInfo,
  musicbrainz_albumid: defaultTagInfo,
  musicbrainz_artistid: { multiple: true },
  musicbrainz_albumartistid: { multiple: true },
  musicbrainz_releasegroupid: defaultTagInfo,
  musicbrainz_workid: defaultTagInfo,
  musicbrainz_trmid: defaultTagInfo,
  musicbrainz_discid: defaultTagInfo,
  acoustid_id: defaultTagInfo,
  acoustid_fingerprint: defaultTagInfo,
  musicip_puid: defaultTagInfo,
  musicip_fingerprint: defaultTagInfo,
  website: defaultTagInfo,
  "performer:instrument": { multiple: true, unique: true },
  averageLevel: defaultTagInfo,
  peakLevel: defaultTagInfo,
  notes: { multiple: true, unique: false },
  key: defaultTagInfo,
  originalalbum: defaultTagInfo,
  originalartist: defaultTagInfo,
  discogs_artist_id: { multiple: true, unique: true },
  discogs_release_id: defaultTagInfo,
  discogs_label_id: defaultTagInfo,
  discogs_master_release_id: defaultTagInfo,
  discogs_votes: defaultTagInfo,
  discogs_rating: defaultTagInfo,
  replaygain_track_peak: defaultTagInfo,
  replaygain_track_gain: defaultTagInfo,
  replaygain_album_peak: defaultTagInfo,
  replaygain_album_gain: defaultTagInfo,
  replaygain_track_minmax: defaultTagInfo,
  replaygain_album_minmax: defaultTagInfo,
  replaygain_undo: defaultTagInfo,
  description: { multiple: true },
  longDescription: defaultTagInfo,
  category: { multiple: true },
  hdVideo: defaultTagInfo,
  keywords: { multiple: true },
  movement: defaultTagInfo,
  movementIndex: defaultTagInfo,
  movementTotal: defaultTagInfo,
  podcastId: defaultTagInfo,
  showMovement: defaultTagInfo,
  stik: defaultTagInfo,
  playCounter: defaultTagInfo
};
function isSingleton(alias) {
  return commonTags[alias] && !commonTags[alias].multiple;
}
function isUnique(alias) {
  return !commonTags[alias].multiple || commonTags[alias].unique || false;
}
class CommonTagMapper {
  static toIntOrNull(str) {
    const cleaned = Number.parseInt(str, 10);
    return Number.isNaN(cleaned) ? null : cleaned;
  }
  // TODO: a string of 1of1 would fail to be converted
  // converts 1/10 to no : 1, of : 10
  // or 1 to no : 1, of : 0
  static normalizeTrack(origVal) {
    const split = origVal.toString().split("/");
    return {
      no: Number.parseInt(split[0], 10) || null,
      of: Number.parseInt(split[1], 10) || null
    };
  }
  constructor(tagTypes, tagMap2) {
    this.tagTypes = tagTypes;
    this.tagMap = tagMap2;
  }
  /**
   * Process and set common tags
   * write common tags to
   * @param tag Native tag
   * @param warnings Register warnings
   * @return common name
   */
  mapGenericTag(tag, warnings) {
    tag = { id: tag.id, value: tag.value };
    this.postMap(tag, warnings);
    const id = this.getCommonName(tag.id);
    return id ? { id, value: tag.value } : null;
  }
  /**
   * Convert native tag key to common tag key
   * @param tag Native header tag
   * @return common tag name (alias)
   */
  getCommonName(tag) {
    return this.tagMap[tag];
  }
  /**
   * Handle post mapping exceptions / correction
   * @param tag Tag e.g. {"©alb", "Buena Vista Social Club")
   * @param warnings Used to register warnings
   */
  postMap(_tag, _warnings) {
    return;
  }
}
CommonTagMapper.maxRatingScore = 1;
const id3v1TagMap = {
  title: "title",
  artist: "artist",
  album: "album",
  year: "year",
  comment: "comment",
  track: "track",
  genre: "genre"
};
class ID3v1TagMapper extends CommonTagMapper {
  constructor() {
    super(["ID3v1"], id3v1TagMap);
  }
}
class CaseInsensitiveTagMap extends CommonTagMapper {
  constructor(tagTypes, tagMap2) {
    const upperCaseMap = {};
    for (const tag of Object.keys(tagMap2)) {
      upperCaseMap[tag.toUpperCase()] = tagMap2[tag];
    }
    super(tagTypes, upperCaseMap);
  }
  /**
   * @tag  Native header tag
   * @return common tag name (alias)
   */
  getCommonName(tag) {
    return this.tagMap[tag.toUpperCase()];
  }
}
const id3v24TagMap = {
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
class ID3v24TagMapper extends CaseInsensitiveTagMap {
  static toRating(popm) {
    return {
      source: popm.email,
      rating: popm.rating > 0 ? (popm.rating - 1) / 254 * CommonTagMapper.maxRatingScore : void 0
    };
  }
  constructor() {
    super(["ID3v2.3", "ID3v2.4"], id3v24TagMap);
  }
  /**
   * Handle post mapping exceptions / correction
   * @param tag to post map
   * @param warnings Wil be used to register (collect) warnings
   */
  postMap(tag, warnings) {
    switch (tag.id) {
      case "UFID":
        {
          const idTag = tag.value;
          if (idTag.owner_identifier === "http://musicbrainz.org") {
            tag.id += `:${idTag.owner_identifier}`;
            tag.value = decodeString(idTag.identifier, "latin1");
          }
        }
        break;
      case "PRIV":
        {
          const customTag = tag.value;
          switch (customTag.owner_identifier) {
            // decode Windows Media Player
            case "AverageLevel":
            case "PeakValue":
              tag.id += `:${customTag.owner_identifier}`;
              tag.value = customTag.data.length === 4 ? UINT32_LE.get(customTag.data, 0) : null;
              if (tag.value === null) {
                warnings.addWarning("Failed to parse PRIV:PeakValue");
              }
              break;
            default:
              warnings.addWarning(`Unknown PRIV owner-identifier: ${customTag.data}`);
          }
        }
        break;
      case "POPM":
        tag.value = ID3v24TagMapper.toRating(tag.value);
        break;
    }
  }
}
const asfTagMap = {
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
class AsfTagMapper extends CommonTagMapper {
  static toRating(rating) {
    return {
      rating: Number.parseFloat(rating + 1) / 5
    };
  }
  constructor() {
    super(["asf"], asfTagMap);
  }
  postMap(tag) {
    switch (tag.id) {
      case "WM/SharedUserRating": {
        const keys = tag.id.split(":");
        tag.value = AsfTagMapper.toRating(tag.value);
        tag.id = keys[0];
        break;
      }
    }
  }
}
const id3v22TagMap = {
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
class ID3v22TagMapper extends CaseInsensitiveTagMap {
  constructor() {
    super(["ID3v2.2"], id3v22TagMap);
  }
}
const apev2TagMap = {
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
class APEv2TagMapper extends CaseInsensitiveTagMap {
  constructor() {
    super(["APEv2"], apev2TagMap);
  }
}
const mp4TagMap = {
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
};
const tagType = "iTunes";
class MP4TagMapper extends CaseInsensitiveTagMap {
  constructor() {
    super([tagType], mp4TagMap);
  }
  postMap(tag, _warnings) {
    switch (tag.id) {
      case "rate":
        tag.value = {
          source: void 0,
          rating: Number.parseFloat(tag.value) / 100
        };
        break;
    }
  }
}
const vorbisTagMap = {
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
class VorbisTagMapper extends CommonTagMapper {
  static toRating(email, rating, maxScore) {
    return {
      source: email ? email.toLowerCase() : void 0,
      rating: Number.parseFloat(rating) / maxScore * CommonTagMapper.maxRatingScore
    };
  }
  constructor() {
    super(["vorbis"], vorbisTagMap);
  }
  postMap(tag) {
    if (tag.id === "RATING") {
      tag.value = VorbisTagMapper.toRating(void 0, tag.value, 100);
    } else if (tag.id.indexOf("RATING:") === 0) {
      const keys = tag.id.split(":");
      tag.value = VorbisTagMapper.toRating(keys[1], tag.value, 1);
      tag.id = keys[0];
    }
  }
}
const riffInfoTagMap = {
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
class RiffInfoTagMapper extends CommonTagMapper {
  constructor() {
    super(["exif"], riffInfoTagMap);
  }
}
const ebmlTagMap = {
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
class MatroskaTagMapper extends CaseInsensitiveTagMap {
  constructor() {
    super(["matroska"], ebmlTagMap);
  }
}
const tagMap = {
  NAME: "title",
  AUTH: "artist",
  "(c) ": "copyright",
  ANNO: "comment"
};
class AiffTagMapper extends CommonTagMapper {
  constructor() {
    super(["AIFF"], tagMap);
  }
}
class CombinedTagMapper {
  constructor() {
    this.tagMappers = {};
    [
      new ID3v1TagMapper(),
      new ID3v22TagMapper(),
      new ID3v24TagMapper(),
      new MP4TagMapper(),
      new MP4TagMapper(),
      new VorbisTagMapper(),
      new APEv2TagMapper(),
      new AsfTagMapper(),
      new RiffInfoTagMapper(),
      new MatroskaTagMapper(),
      new AiffTagMapper()
    ].forEach((mapper) => {
      this.registerTagMapper(mapper);
    });
  }
  /**
   * Convert native to generic (common) tags
   * @param tagType Originating tag format
   * @param tag     Native tag to map to a generic tag id
   * @param warnings
   * @return Generic tag result (output of this function)
   */
  mapTag(tagType2, tag, warnings) {
    const tagMapper = this.tagMappers[tagType2];
    if (tagMapper) {
      return this.tagMappers[tagType2].mapGenericTag(tag, warnings);
    }
    throw new InternalParserError(`No generic tag mapper defined for tag-format: ${tagType2}`);
  }
  registerTagMapper(genericTagMapper) {
    for (const tagType2 of genericTagMapper.tagTypes) {
      this.tagMappers[tagType2] = genericTagMapper;
    }
  }
}
const TIMESTAMP_REGEX = /\[(\d{2}):(\d{2})\.(\d{2,3})]/;
function parseLyrics(input) {
  if (TIMESTAMP_REGEX.test(input)) {
    return parseLrc(input);
  }
  return toUnsyncedLyrics(input);
}
function toUnsyncedLyrics(lyrics) {
  return {
    contentType: LyricsContentType.lyrics,
    timeStampFormat: TimestampFormat.notSynchronized,
    text: lyrics.trim(),
    syncText: []
  };
}
function parseLrc(lrcString) {
  const lines = lrcString.split("\n");
  const syncText = [];
  for (const line of lines) {
    const match = line.match(TIMESTAMP_REGEX);
    if (match) {
      const minutes = Number.parseInt(match[1], 10);
      const seconds = Number.parseInt(match[2], 10);
      const ms2 = match[3].length === 3 ? Number.parseInt(match[3], 10) : Number.parseInt(match[3], 10) * 10;
      const timestamp = (minutes * 60 + seconds) * 1e3 + ms2;
      const text = line.replace(TIMESTAMP_REGEX, "").trim();
      syncText.push({ timestamp, text });
    }
  }
  return {
    contentType: LyricsContentType.lyrics,
    timeStampFormat: TimestampFormat.milliseconds,
    text: syncText.map((line) => line.text).join("\n"),
    syncText
  };
}
const debug$4 = initDebug("music-metadata:collector");
const TagPriority = ["matroska", "APEv2", "vorbis", "ID3v2.4", "ID3v2.3", "ID3v2.2", "exif", "asf", "iTunes", "AIFF", "ID3v1"];
class MetadataCollector {
  constructor(opts) {
    this.format = {
      tagTypes: [],
      trackInfo: []
    };
    this.native = {};
    this.common = {
      track: { no: null, of: null },
      disk: { no: null, of: null },
      movementIndex: { no: null, of: null }
    };
    this.quality = {
      warnings: []
    };
    this.commonOrigin = {};
    this.originPriority = {};
    this.tagMapper = new CombinedTagMapper();
    this.opts = opts;
    let priority = 1;
    for (const tagType2 of TagPriority) {
      this.originPriority[tagType2] = priority++;
    }
    this.originPriority.artificial = 500;
    this.originPriority.id3v1 = 600;
  }
  /**
   * @returns {boolean} true if one or more tags have been found
   */
  hasAny() {
    return Object.keys(this.native).length > 0;
  }
  addStreamInfo(streamInfo) {
    debug$4(`streamInfo: type=${streamInfo.type ? TrackTypeValueToKeyMap[streamInfo.type] : "?"}, codec=${streamInfo.codecName}`);
    this.format.trackInfo.push(streamInfo);
  }
  setFormat(key, value) {
    debug$4(`format: ${key} = ${value}`);
    this.format[key] = value;
    if (this.opts?.observer) {
      this.opts.observer({ metadata: this, tag: { type: "format", id: key, value } });
    }
  }
  setAudioOnly() {
    this.setFormat("hasAudio", true);
    this.setFormat("hasVideo", false);
  }
  async addTag(tagType2, tagId, value) {
    debug$4(`tag ${tagType2}.${tagId} = ${value}`);
    if (!this.native[tagType2]) {
      this.format.tagTypes.push(tagType2);
      this.native[tagType2] = [];
    }
    this.native[tagType2].push({ id: tagId, value });
    await this.toCommon(tagType2, tagId, value);
  }
  addWarning(warning) {
    this.quality.warnings.push({ message: warning });
  }
  async postMap(tagType2, tag) {
    switch (tag.id) {
      case "artist":
        if (this.commonOrigin.artist === this.originPriority[tagType2]) {
          return this.postMap("artificial", { id: "artists", value: tag.value });
        }
        if (!this.common.artists) {
          this.setGenericTag("artificial", { id: "artists", value: tag.value });
        }
        break;
      case "artists":
        if (!this.common.artist || this.commonOrigin.artist === this.originPriority.artificial) {
          if (!this.common.artists || this.common.artists.indexOf(tag.value) === -1) {
            const artists = (this.common.artists || []).concat([tag.value]);
            const value = joinArtists(artists);
            const artistTag = { id: "artist", value };
            this.setGenericTag("artificial", artistTag);
          }
        }
        break;
      case "picture":
        return this.postFixPicture(tag.value).then((picture) => {
          if (picture !== null) {
            tag.value = picture;
            this.setGenericTag(tagType2, tag);
          }
        });
      case "totaltracks":
        this.common.track.of = CommonTagMapper.toIntOrNull(tag.value);
        return;
      case "totaldiscs":
        this.common.disk.of = CommonTagMapper.toIntOrNull(tag.value);
        return;
      case "movementTotal":
        this.common.movementIndex.of = CommonTagMapper.toIntOrNull(tag.value);
        return;
      case "track":
      case "disk":
      case "movementIndex": {
        const of = this.common[tag.id].of;
        this.common[tag.id] = CommonTagMapper.normalizeTrack(tag.value);
        this.common[tag.id].of = of != null ? of : this.common[tag.id].of;
        return;
      }
      case "bpm":
      case "year":
      case "originalyear":
        tag.value = Number.parseInt(tag.value, 10);
        break;
      case "date": {
        const year = Number.parseInt(tag.value.substr(0, 4), 10);
        if (!Number.isNaN(year)) {
          this.common.year = year;
        }
        break;
      }
      case "discogs_label_id":
      case "discogs_release_id":
      case "discogs_master_release_id":
      case "discogs_artist_id":
      case "discogs_votes":
        tag.value = typeof tag.value === "string" ? Number.parseInt(tag.value, 10) : tag.value;
        break;
      case "replaygain_track_gain":
      case "replaygain_track_peak":
      case "replaygain_album_gain":
      case "replaygain_album_peak":
        tag.value = toRatio(tag.value);
        break;
      case "replaygain_track_minmax":
        tag.value = tag.value.split(",").map((v) => Number.parseInt(v, 10));
        break;
      case "replaygain_undo": {
        const minMix = tag.value.split(",").map((v) => Number.parseInt(v, 10));
        tag.value = {
          leftChannel: minMix[0],
          rightChannel: minMix[1]
        };
        break;
      }
      case "gapless":
      // iTunes gap-less flag
      case "compilation":
      case "podcast":
      case "showMovement":
        tag.value = tag.value === "1" || tag.value === 1;
        break;
      case "isrc": {
        const commonTag = this.common[tag.id];
        if (commonTag && commonTag.indexOf(tag.value) !== -1)
          return;
        break;
      }
      case "comment":
        if (typeof tag.value === "string") {
          tag.value = { text: tag.value };
        }
        if (tag.value.descriptor === "iTunPGAP") {
          this.setGenericTag(tagType2, { id: "gapless", value: tag.value.text === "1" });
        }
        break;
      case "lyrics":
        if (typeof tag.value === "string") {
          tag.value = parseLyrics(tag.value);
        }
        break;
    }
    if (tag.value !== null) {
      this.setGenericTag(tagType2, tag);
    }
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
  async postFixPicture(picture) {
    if (picture.data && picture.data.length > 0) {
      if (!picture.format) {
        const fileType = await fileTypeFromBuffer(Uint8Array.from(picture.data));
        if (fileType) {
          picture.format = fileType.mime;
        } else {
          return null;
        }
      }
      picture.format = picture.format.toLocaleLowerCase();
      switch (picture.format) {
        case "image/jpg":
          picture.format = "image/jpeg";
      }
      return picture;
    }
    this.addWarning("Empty picture tag found");
    return null;
  }
  /**
   * Convert native tag to common tags
   */
  async toCommon(tagType2, tagId, value) {
    const tag = { id: tagId, value };
    const genericTag = this.tagMapper.mapTag(tagType2, tag, this);
    if (genericTag) {
      await this.postMap(tagType2, genericTag);
    }
  }
  /**
   * Set generic tag
   */
  setGenericTag(tagType2, tag) {
    debug$4(`common.${tag.id} = ${tag.value}`);
    const prio0 = this.commonOrigin[tag.id] || 1e3;
    const prio1 = this.originPriority[tagType2];
    if (isSingleton(tag.id)) {
      if (prio1 <= prio0) {
        this.common[tag.id] = tag.value;
        this.commonOrigin[tag.id] = prio1;
      } else {
        return debug$4(`Ignore native tag (singleton): ${tagType2}.${tag.id} = ${tag.value}`);
      }
    } else {
      if (prio1 === prio0) {
        if (!isUnique(tag.id) || this.common[tag.id].indexOf(tag.value) === -1) {
          this.common[tag.id].push(tag.value);
        } else {
          debug$4(`Ignore duplicate value: ${tagType2}.${tag.id} = ${tag.value}`);
        }
      } else if (prio1 < prio0) {
        this.common[tag.id] = [tag.value];
        this.commonOrigin[tag.id] = prio1;
      } else {
        return debug$4(`Ignore native tag (list): ${tagType2}.${tag.id} = ${tag.value}`);
      }
    }
    if (this.opts?.observer) {
      this.opts.observer({ metadata: this, tag: { type: "common", id: tag.id, value: tag.value } });
    }
  }
}
function joinArtists(artists) {
  if (artists.length > 2) {
    return `${artists.slice(0, artists.length - 1).join(", ")} & ${artists[artists.length - 1]}`;
  }
  return artists.join(" & ");
}
const mpegParserLoader = {
  parserType: "mpeg",
  extensions: [".mp2", ".mp3", ".m2a", ".aac", "aacp"],
  mimeTypes: ["audio/mpeg", "audio/mp3", "audio/aacs", "audio/aacp"],
  async load() {
    return (await import("./MpegParser-CKjo51in.js")).MpegParser;
  }
};
const apeParserLoader = {
  parserType: "apev2",
  extensions: [".ape"],
  mimeTypes: ["audio/ape", "audio/monkeys-audio"],
  async load() {
    return (await Promise.resolve().then(() => APEv2Parser$1)).APEv2Parser;
  }
};
const asfParserLoader = {
  parserType: "asf",
  extensions: [".asf"],
  mimeTypes: ["audio/ms-wma", "video/ms-wmv", "audio/ms-asf", "video/ms-asf", "application/vnd.ms-asf"],
  async load() {
    return (await import("./AsfParser-Cz5xNjNV.js")).AsfParser;
  }
};
const dsdiffParserLoader = {
  parserType: "dsdiff",
  extensions: [".dff"],
  mimeTypes: ["audio/dsf", "audio/dsd"],
  async load() {
    return (await import("./DsdiffParser-DRDvqt7M.js")).DsdiffParser;
  }
};
const aiffParserLoader = {
  parserType: "aiff",
  extensions: [".aif", "aiff", "aifc"],
  mimeTypes: ["audio/aiff", "audio/aif", "audio/aifc", "application/aiff"],
  async load() {
    return (await import("./AiffParser-DPSBbOUJ.js")).AIFFParser;
  }
};
const dsfParserLoader = {
  parserType: "dsf",
  extensions: [".dsf"],
  mimeTypes: ["audio/dsf"],
  async load() {
    return (await import("./DsfParser-CgmtUQb1.js")).DsfParser;
  }
};
const flacParserLoader = {
  parserType: "flac",
  extensions: [".flac"],
  mimeTypes: ["audio/flac"],
  async load() {
    return (await import("./FlacParser-Cr6Xn4Z0.js").then((n) => n.d)).FlacParser;
  }
};
const matroskaParserLoader = {
  parserType: "matroska",
  extensions: [".mka", ".mkv", ".mk3d", ".mks", "webm"],
  mimeTypes: ["audio/matroska", "video/matroska", "audio/webm", "video/webm"],
  async load() {
    return (await import("./MatroskaParser-42eapde5.js")).MatroskaParser;
  }
};
const mp4ParserLoader = {
  parserType: "mp4",
  extensions: [".mp4", ".m4a", ".m4b", ".m4pa", "m4v", "m4r", "3gp", ".mov", ".movie", ".qt"],
  mimeTypes: ["audio/mp4", "audio/m4a", "video/m4v", "video/mp4", "video/quicktime"],
  async load() {
    return (await import("./MP4Parser-g7Jbbbza.js")).MP4Parser;
  }
};
const musepackParserLoader = {
  parserType: "musepack",
  extensions: [".mpc"],
  mimeTypes: ["audio/musepack"],
  async load() {
    return (await import("./MusepackParser-CPobSUCI.js")).MusepackParser;
  }
};
const oggParserLoader = {
  parserType: "ogg",
  extensions: [".ogg", ".ogv", ".oga", ".ogm", ".ogx", ".opus", ".spx"],
  mimeTypes: ["audio/ogg", "audio/opus", "audio/speex", "video/ogg"],
  // RFC 7845, RFC 6716, RFC 5574
  async load() {
    return (await import("./OggParser-Biq9vDIl.js")).OggParser;
  }
};
const wavpackParserLoader = {
  parserType: "wavpack",
  extensions: [".wv", ".wvp"],
  mimeTypes: ["audio/wavpack"],
  async load() {
    return (await import("./WavPackParser-PDxbSRNE.js")).WavPackParser;
  }
};
const riffParserLoader = {
  parserType: "riff",
  extensions: [".wav", "wave", ".bwf"],
  mimeTypes: ["audio/vnd.wave", "audio/wav", "audio/wave"],
  async load() {
    return (await import("./WaveParser-Can7JtF2.js")).WaveParser;
  }
};
const debug$3 = initDebug("music-metadata:parser:factory");
function parseHttpContentType(contentType2) {
  const type = ContentType.parse(contentType2);
  const mime = mediaTyperExports.parse(type.type);
  return {
    type: mime.type,
    subtype: mime.subtype,
    suffix: mime.suffix,
    parameters: type.parameters
  };
}
class ParserFactory {
  constructor() {
    this.parsers = [];
    [
      flacParserLoader,
      mpegParserLoader,
      apeParserLoader,
      mp4ParserLoader,
      matroskaParserLoader,
      riffParserLoader,
      oggParserLoader,
      asfParserLoader,
      aiffParserLoader,
      wavpackParserLoader,
      musepackParserLoader,
      dsfParserLoader,
      dsdiffParserLoader
    ].forEach((parser) => {
      this.registerParser(parser);
    });
  }
  registerParser(parser) {
    this.parsers.push(parser);
  }
  async parse(tokenizer, parserLoader, opts) {
    if (tokenizer.supportsRandomAccess()) {
      debug$3("tokenizer supports random-access, scanning for appending headers");
      await scanAppendingHeaders(tokenizer, opts);
    } else {
      debug$3("tokenizer does not support random-access, cannot scan for appending headers");
    }
    if (!parserLoader) {
      const buf = new Uint8Array(4100);
      if (tokenizer.fileInfo.mimeType) {
        parserLoader = this.findLoaderForContentType(tokenizer.fileInfo.mimeType);
      }
      if (!parserLoader && tokenizer.fileInfo.path) {
        parserLoader = this.findLoaderForExtension(tokenizer.fileInfo.path);
      }
      if (!parserLoader) {
        debug$3("Guess parser on content...");
        await tokenizer.peekBuffer(buf, { mayBeLess: true });
        const guessedType = await fileTypeFromBuffer(buf, { mpegOffsetTolerance: 10 });
        if (!guessedType || !guessedType.mime) {
          throw new CouldNotDetermineFileTypeError("Failed to determine audio format");
        }
        debug$3(`Guessed file type is mime=${guessedType.mime}, extension=${guessedType.ext}`);
        parserLoader = this.findLoaderForContentType(guessedType.mime);
        if (!parserLoader) {
          throw new UnsupportedFileTypeError(`Guessed MIME-type not supported: ${guessedType.mime}`);
        }
      }
    }
    debug$3(`Loading ${parserLoader.parserType} parser...`);
    const metadata = new MetadataCollector(opts);
    const ParserImpl = await parserLoader.load();
    const parser = new ParserImpl(metadata, tokenizer, opts ?? {});
    debug$3(`Parser ${parserLoader.parserType} loaded`);
    await parser.parse();
    if (metadata.format.trackInfo) {
      if (metadata.format.hasAudio === void 0) {
        metadata.setFormat("hasAudio", !!metadata.format.trackInfo.find((track) => track.type === TrackType.audio));
      }
      if (metadata.format.hasVideo === void 0) {
        metadata.setFormat("hasVideo", !!metadata.format.trackInfo.find((track) => track.type === TrackType.video));
      }
    }
    return metadata.toCommonMetadata();
  }
  /**
   * @param filePath - Path, filename or extension to audio file
   * @return Parser submodule name
   */
  findLoaderForExtension(filePath) {
    if (!filePath)
      return;
    const extension = getExtension(filePath).toLocaleLowerCase() || filePath;
    return this.parsers.find((parser) => parser.extensions.indexOf(extension) !== -1);
  }
  findLoaderForContentType(httpContentType) {
    let mime;
    if (!httpContentType)
      return;
    try {
      mime = parseHttpContentType(httpContentType);
    } catch (_err) {
      debug$3(`Invalid HTTP Content-Type header value: ${httpContentType}`);
      return;
    }
    const subType = mime.subtype.indexOf("x-") === 0 ? mime.subtype.substring(2) : mime.subtype;
    return this.parsers.find((parser) => parser.mimeTypes.find((loader) => loader.indexOf(`${mime.type}/${subType}`) !== -1));
  }
  getSupportedMimeTypes() {
    const mimeTypeSet = /* @__PURE__ */ new Set();
    this.parsers.forEach((loader) => {
      loader.mimeTypes.forEach((mimeType) => {
        mimeTypeSet.add(mimeType);
        mimeTypeSet.add(mimeType.replace("/", "/x-"));
      });
    });
    return Array.from(mimeTypeSet);
  }
}
function getExtension(fname) {
  const i = fname.lastIndexOf(".");
  return i === -1 ? "" : fname.substring(i);
}
class BasicParser {
  /**
   * Initialize parser with output (metadata), input (tokenizer) & parsing options (options).
   * @param {INativeMetadataCollector} metadata Output
   * @param {ITokenizer} tokenizer Input
   * @param {IOptions} options Parsing options
   */
  constructor(metadata, tokenizer, options) {
    this.metadata = metadata;
    this.tokenizer = tokenizer;
    this.options = options;
  }
}
const WINDOWS_1252_EXTRA = {
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
const WINDOWS_1252_REVERSE = {};
for (const [code, char] of Object.entries(WINDOWS_1252_EXTRA)) {
  WINDOWS_1252_REVERSE[char] = Number.parseInt(code);
}
function textDecode(bytes, encoding = "utf-8") {
  switch (encoding.toLowerCase()) {
    case "utf-8":
    case "utf8":
      if (typeof globalThis.TextDecoder !== "undefined") {
        return new globalThis.TextDecoder("utf-8").decode(bytes);
      }
      return decodeUTF8(bytes);
    case "utf-16le":
      return decodeUTF16LE(bytes);
    case "ascii":
      return decodeASCII(bytes);
    case "latin1":
    case "iso-8859-1":
      return decodeLatin1(bytes);
    case "windows-1252":
      return decodeWindows1252(bytes);
    default:
      throw new RangeError(`Encoding '${encoding}' not supported`);
  }
}
function textEncode(input = "", encoding = "utf-8") {
  switch (encoding.toLowerCase()) {
    case "utf-8":
    case "utf8":
      if (typeof globalThis.TextEncoder !== "undefined") {
        return new globalThis.TextEncoder().encode(input);
      }
      return encodeUTF8(input);
    case "utf-16le":
      return encodeUTF16LE(input);
    case "ascii":
      return encodeASCII(input);
    case "latin1":
    case "iso-8859-1":
      return encodeLatin1(input);
    case "windows-1252":
      return encodeWindows1252(input);
    default:
      throw new RangeError(`Encoding '${encoding}' not supported`);
  }
}
function decodeUTF8(bytes) {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 128) {
      out += String.fromCharCode(b1);
    } else if (b1 < 224) {
      const b2 = bytes[i++] & 63;
      out += String.fromCharCode((b1 & 31) << 6 | b2);
    } else if (b1 < 240) {
      const b2 = bytes[i++] & 63;
      const b3 = bytes[i++] & 63;
      out += String.fromCharCode((b1 & 15) << 12 | b2 << 6 | b3);
    } else {
      const b2 = bytes[i++] & 63;
      const b3 = bytes[i++] & 63;
      const b4 = bytes[i++] & 63;
      let cp = (b1 & 7) << 18 | b2 << 12 | b3 << 6 | b4;
      cp -= 65536;
      out += String.fromCharCode(55296 + (cp >> 10 & 1023), 56320 + (cp & 1023));
    }
  }
  return out;
}
function decodeUTF16LE(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 2) {
    out += String.fromCharCode(bytes[i] | bytes[i + 1] << 8);
  }
  return out;
}
function decodeASCII(bytes) {
  return String.fromCharCode(...bytes.map((b) => b & 127));
}
function decodeLatin1(bytes) {
  return String.fromCharCode(...bytes);
}
function decodeWindows1252(bytes) {
  let out = "";
  for (const b of bytes) {
    if (b >= 128 && b <= 159 && WINDOWS_1252_EXTRA[b]) {
      out += WINDOWS_1252_EXTRA[b];
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}
function encodeUTF8(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    const cp = str.charCodeAt(i);
    if (cp < 128) {
      out.push(cp);
    } else if (cp < 2048) {
      out.push(192 | cp >> 6, 128 | cp & 63);
    } else if (cp < 65536) {
      out.push(224 | cp >> 12, 128 | cp >> 6 & 63, 128 | cp & 63);
    } else {
      out.push(240 | cp >> 18, 128 | cp >> 12 & 63, 128 | cp >> 6 & 63, 128 | cp & 63);
    }
  }
  return new Uint8Array(out);
}
function encodeUTF16LE(str) {
  const out = new Uint8Array(str.length * 2);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    out[i * 2] = code & 255;
    out[i * 2 + 1] = code >> 8;
  }
  return out;
}
function encodeASCII(str) {
  return new Uint8Array([...str].map((ch) => ch.charCodeAt(0) & 127));
}
function encodeLatin1(str) {
  return new Uint8Array([...str].map((ch) => ch.charCodeAt(0) & 255));
}
function encodeWindows1252(str) {
  return new Uint8Array([...str].map((ch) => {
    const code = ch.charCodeAt(0);
    if (code <= 255)
      return code;
    if (WINDOWS_1252_REVERSE[ch] !== void 0)
      return WINDOWS_1252_REVERSE[ch];
    return 63;
  }));
}
const validFourCC = /^[\x21-\x7e©][\x20-\x7e\x00()]{3}/;
const FourCcToken = {
  len: 4,
  get: (buf, off) => {
    const id = textDecode(buf.subarray(off, off + FourCcToken.len), "latin1");
    if (!id.match(validFourCC)) {
      throw new FieldDecodingError(`FourCC contains invalid characters: ${a2hex(id)} "${id}"`);
    }
    return id;
  },
  put: (buffer, offset, id) => {
    const str = textEncode(id, "latin1");
    if (str.length !== 4)
      throw new InternalParserError("Invalid length");
    buffer.set(str, offset);
    return offset + 4;
  }
};
const DataType = {
  text_utf8: 0,
  binary: 1,
  external_info: 2,
  reserved: 3
};
const DescriptorParser = {
  len: 52,
  get: (buf, off) => {
    return {
      // should equal 'MAC '
      ID: FourCcToken.get(buf, off),
      // versionIndex number * 1000 (3.81 = 3810) (remember that 4-byte alignment causes this to take 4-bytes)
      version: UINT32_LE.get(buf, off + 4) / 1e3,
      // the number of descriptor bytes (allows later expansion of this header)
      descriptorBytes: UINT32_LE.get(buf, off + 8),
      // the number of header APE_HEADER bytes
      headerBytes: UINT32_LE.get(buf, off + 12),
      // the number of header APE_HEADER bytes
      seekTableBytes: UINT32_LE.get(buf, off + 16),
      // the number of header data bytes (from original file)
      headerDataBytes: UINT32_LE.get(buf, off + 20),
      // the number of bytes of APE frame data
      apeFrameDataBytes: UINT32_LE.get(buf, off + 24),
      // the high order number of APE frame data bytes
      apeFrameDataBytesHigh: UINT32_LE.get(buf, off + 28),
      // the terminating data of the file (not including tag data)
      terminatingDataBytes: UINT32_LE.get(buf, off + 32),
      // the MD5 hash of the file (see notes for usage... it's a little tricky)
      fileMD5: new Uint8ArrayType(16).get(buf, off + 36)
    };
  }
};
const Header = {
  len: 24,
  get: (buf, off) => {
    return {
      // the compression level (see defines I.E. COMPRESSION_LEVEL_FAST)
      compressionLevel: UINT16_LE.get(buf, off),
      // any format flags (for future use)
      formatFlags: UINT16_LE.get(buf, off + 2),
      // the number of audio blocks in one frame
      blocksPerFrame: UINT32_LE.get(buf, off + 4),
      // the number of audio blocks in the final frame
      finalFrameBlocks: UINT32_LE.get(buf, off + 8),
      // the total number of frames
      totalFrames: UINT32_LE.get(buf, off + 12),
      // the bits per sample (typically 16)
      bitsPerSample: UINT16_LE.get(buf, off + 16),
      // the number of channels (1 or 2)
      channel: UINT16_LE.get(buf, off + 18),
      // the sample rate (typically 44100)
      sampleRate: UINT32_LE.get(buf, off + 20)
    };
  }
};
const TagFooter = {
  len: 32,
  get: (buf, off) => {
    return {
      // should equal 'APETAGEX'
      ID: new StringType(8, "ascii").get(buf, off),
      // equals CURRENT_APE_TAG_VERSION
      version: UINT32_LE.get(buf, off + 8),
      // the complete size of the tag, including this footer (excludes header)
      size: UINT32_LE.get(buf, off + 12),
      // the number of fields in the tag
      fields: UINT32_LE.get(buf, off + 16),
      // reserved for later use (must be zero),
      flags: parseTagFlags(UINT32_LE.get(buf, off + 20))
    };
  }
};
const TagItemHeader = {
  len: 8,
  get: (buf, off) => {
    return {
      // Length of assigned value in bytes
      size: UINT32_LE.get(buf, off),
      // reserved for later use (must be zero),
      flags: parseTagFlags(UINT32_LE.get(buf, off + 4))
    };
  }
};
function parseTagFlags(flags) {
  return {
    containsHeader: isBitSet(flags, 31),
    containsFooter: isBitSet(flags, 30),
    isHeader: isBitSet(flags, 29),
    readOnly: isBitSet(flags, 0),
    dataType: (flags & 6) >> 1
  };
}
function isBitSet(num, bit) {
  return (num & 1 << bit) !== 0;
}
const debug$2 = initDebug("music-metadata:parser:APEv2");
const tagFormat = "APEv2";
const preamble = "APETAGEX";
class ApeContentError extends makeUnexpectedFileContentError("APEv2") {
}
function tryParseApeHeader(metadata, tokenizer, options) {
  const apeParser = new APEv2Parser(metadata, tokenizer, options);
  return apeParser.tryParseApeHeader();
}
class APEv2Parser extends BasicParser {
  constructor() {
    super(...arguments);
    this.ape = {};
  }
  /**
   * Calculate the media file duration
   * @param ah ApeHeader
   * @return {number} duration in seconds
   */
  static calculateDuration(ah) {
    let duration = ah.totalFrames > 1 ? ah.blocksPerFrame * (ah.totalFrames - 1) : 0;
    duration += ah.finalFrameBlocks;
    return duration / ah.sampleRate;
  }
  /**
   * Calculates the APEv1 / APEv2 first field offset
   * @param tokenizer
   * @param offset
   */
  static async findApeFooterOffset(tokenizer, offset) {
    const apeBuf = new Uint8Array(TagFooter.len);
    const position = tokenizer.position;
    if (offset <= TagFooter.len) {
      debug$2(`Offset is too small to read APE footer: offset=${offset}`);
      return void 0;
    }
    if (offset > TagFooter.len) {
      await tokenizer.readBuffer(apeBuf, { position: offset - TagFooter.len });
      tokenizer.setPosition(position);
      const tagFooter = TagFooter.get(apeBuf, 0);
      if (tagFooter.ID === "APETAGEX") {
        if (tagFooter.flags.isHeader) {
          debug$2(`APE Header found at offset=${offset - TagFooter.len}`);
        } else {
          debug$2(`APE Footer found at offset=${offset - TagFooter.len}`);
          offset -= tagFooter.size;
        }
        return { footer: tagFooter, offset };
      }
    }
  }
  static parseTagFooter(metadata, buffer, options) {
    const footer = TagFooter.get(buffer, buffer.length - TagFooter.len);
    if (footer.ID !== preamble)
      throw new ApeContentError("Unexpected APEv2 Footer ID preamble value");
    fromBuffer(buffer);
    const apeParser = new APEv2Parser(metadata, fromBuffer(buffer), options);
    return apeParser.parseTags(footer);
  }
  /**
   * Parse APEv1 / APEv2 header if header signature found
   */
  async tryParseApeHeader() {
    if (this.tokenizer.fileInfo.size && this.tokenizer.fileInfo.size - this.tokenizer.position < TagFooter.len) {
      debug$2("No APEv2 header found, end-of-file reached");
      return;
    }
    const footer = await this.tokenizer.peekToken(TagFooter);
    if (footer.ID === preamble) {
      await this.tokenizer.ignore(TagFooter.len);
      return this.parseTags(footer);
    }
    debug$2(`APEv2 header not found at offset=${this.tokenizer.position}`);
    if (this.tokenizer.fileInfo.size) {
      const remaining = this.tokenizer.fileInfo.size - this.tokenizer.position;
      const buffer = new Uint8Array(remaining);
      await this.tokenizer.readBuffer(buffer);
      return APEv2Parser.parseTagFooter(this.metadata, buffer, this.options);
    }
  }
  async parse() {
    const descriptor = await this.tokenizer.readToken(DescriptorParser);
    if (descriptor.ID !== "MAC ")
      throw new ApeContentError("Unexpected descriptor ID");
    this.ape.descriptor = descriptor;
    const lenExp = descriptor.descriptorBytes - DescriptorParser.len;
    const header = await (lenExp > 0 ? this.parseDescriptorExpansion(lenExp) : this.parseHeader());
    this.metadata.setAudioOnly();
    await this.tokenizer.ignore(header.forwardBytes);
    return this.tryParseApeHeader();
  }
  async parseTags(footer) {
    const keyBuffer = new Uint8Array(256);
    let bytesRemaining = footer.size - TagFooter.len;
    debug$2(`Parse APE tags at offset=${this.tokenizer.position}, size=${bytesRemaining}`);
    for (let i = 0; i < footer.fields; i++) {
      if (bytesRemaining < TagItemHeader.len) {
        this.metadata.addWarning(`APEv2 Tag-header: ${footer.fields - i} items remaining, but no more tag data to read.`);
        break;
      }
      const tagItemHeader = await this.tokenizer.readToken(TagItemHeader);
      bytesRemaining -= TagItemHeader.len + tagItemHeader.size;
      await this.tokenizer.peekBuffer(keyBuffer, { length: Math.min(keyBuffer.length, bytesRemaining) });
      let zero = findZero(keyBuffer, 0, keyBuffer.length);
      const key = await this.tokenizer.readToken(new StringType(zero, "ascii"));
      await this.tokenizer.ignore(1);
      bytesRemaining -= key.length + 1;
      switch (tagItemHeader.flags.dataType) {
        case DataType.text_utf8: {
          const value = await this.tokenizer.readToken(new StringType(tagItemHeader.size, "utf8"));
          const values = value.split(/\x00/g);
          await Promise.all(values.map((val) => this.metadata.addTag(tagFormat, key, val)));
          break;
        }
        case DataType.binary:
          if (this.options.skipCovers) {
            await this.tokenizer.ignore(tagItemHeader.size);
          } else {
            const picData = new Uint8Array(tagItemHeader.size);
            await this.tokenizer.readBuffer(picData);
            zero = findZero(picData, 0, picData.length);
            const description = textDecode(picData.subarray(0, zero), "utf-8");
            const data = picData.subarray(zero + 1);
            await this.metadata.addTag(tagFormat, key, {
              description,
              data
            });
          }
          break;
        case DataType.external_info:
          debug$2(`Ignore external info ${key}`);
          await this.tokenizer.ignore(tagItemHeader.size);
          break;
        case DataType.reserved:
          debug$2(`Ignore external info ${key}`);
          this.metadata.addWarning(`APEv2 header declares a reserved datatype for "${key}"`);
          await this.tokenizer.ignore(tagItemHeader.size);
          break;
      }
    }
  }
  async parseDescriptorExpansion(lenExp) {
    await this.tokenizer.ignore(lenExp);
    return this.parseHeader();
  }
  async parseHeader() {
    const header = await this.tokenizer.readToken(Header);
    this.metadata.setFormat("lossless", true);
    this.metadata.setFormat("container", "Monkey's Audio");
    this.metadata.setFormat("bitsPerSample", header.bitsPerSample);
    this.metadata.setFormat("sampleRate", header.sampleRate);
    this.metadata.setFormat("numberOfChannels", header.channel);
    this.metadata.setFormat("duration", APEv2Parser.calculateDuration(header));
    if (!this.ape.descriptor) {
      throw new ApeContentError("Missing APE descriptor");
    }
    return {
      forwardBytes: this.ape.descriptor.seekTableBytes + this.ape.descriptor.headerDataBytes + this.ape.descriptor.apeFrameDataBytes + this.ape.descriptor.terminatingDataBytes
    };
  }
}
const APEv2Parser$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  APEv2Parser,
  ApeContentError,
  tryParseApeHeader
}, Symbol.toStringTag, { value: "Module" }));
const debug$1 = initDebug("music-metadata:parser:ID3v1");
const Genres = [
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
];
const Iid3v1Token = {
  len: 128,
  /**
   * @param buf Buffer possibly holding the 128 bytes ID3v1.1 metadata header
   * @param off Offset in buffer in bytes
   * @returns ID3v1.1 header if first 3 bytes equals 'TAG', otherwise null is returned
   */
  get: (buf, off) => {
    const header = new Id3v1StringType(3).get(buf, off);
    return header === "TAG" ? {
      header,
      title: new Id3v1StringType(30).get(buf, off + 3),
      artist: new Id3v1StringType(30).get(buf, off + 33),
      album: new Id3v1StringType(30).get(buf, off + 63),
      year: new Id3v1StringType(4).get(buf, off + 93),
      comment: new Id3v1StringType(28).get(buf, off + 97),
      // ID3v1.1 separator for track
      zeroByte: UINT8.get(buf, off + 127),
      // track: ID3v1.1 field added by Michael Mutschler
      track: UINT8.get(buf, off + 126),
      genre: UINT8.get(buf, off + 127)
    } : null;
  }
};
class Id3v1StringType {
  constructor(len) {
    this.len = len;
    this.stringType = new StringType(len, "latin1");
  }
  get(buf, off) {
    let value = this.stringType.get(buf, off);
    value = trimRightNull(value);
    value = value.trim();
    return value.length > 0 ? value : void 0;
  }
}
class ID3v1Parser extends BasicParser {
  constructor(metadata, tokenizer, options) {
    super(metadata, tokenizer, options);
    this.apeHeader = options.apeHeader;
  }
  static getGenre(genreIndex) {
    if (genreIndex < Genres.length) {
      return Genres[genreIndex];
    }
    return void 0;
  }
  async parse() {
    if (!this.tokenizer.fileInfo.size) {
      debug$1("Skip checking for ID3v1 because the file-size is unknown");
      return;
    }
    if (this.apeHeader) {
      this.tokenizer.ignore(this.apeHeader.offset - this.tokenizer.position);
      const apeParser = new APEv2Parser(this.metadata, this.tokenizer, this.options);
      await apeParser.parseTags(this.apeHeader.footer);
    }
    const offset = this.tokenizer.fileInfo.size - Iid3v1Token.len;
    if (this.tokenizer.position > offset) {
      debug$1("Already consumed the last 128 bytes");
      return;
    }
    const header = await this.tokenizer.readToken(Iid3v1Token, offset);
    if (header) {
      debug$1("ID3v1 header found at: pos=%s", this.tokenizer.fileInfo.size - Iid3v1Token.len);
      const props = ["title", "artist", "album", "comment", "track", "year"];
      for (const id of props) {
        if (header[id] && header[id] !== "")
          await this.addTag(id, header[id]);
      }
      const genre = ID3v1Parser.getGenre(header.genre);
      if (genre)
        await this.addTag("genre", genre);
    } else {
      debug$1("ID3v1 header not found at: pos=%s", this.tokenizer.fileInfo.size - Iid3v1Token.len);
    }
  }
  async addTag(id, value) {
    await this.metadata.addTag("ID3v1", id, value);
  }
}
async function hasID3v1Header(tokenizer) {
  if (tokenizer.fileInfo.size >= 128) {
    const tag = new Uint8Array(3);
    const position = tokenizer.position;
    await tokenizer.readBuffer(tag, { position: tokenizer.fileInfo.size - 128 });
    tokenizer.setPosition(position);
    return textDecode(tag, "latin1") === "TAG";
  }
  return false;
}
const endTag2 = "LYRICS200";
async function getLyricsHeaderLength(tokenizer) {
  const fileSize = tokenizer.fileInfo.size;
  if (fileSize >= 143) {
    const buf = new Uint8Array(15);
    const position = tokenizer.position;
    await tokenizer.readBuffer(buf, { position: fileSize - 143 });
    tokenizer.setPosition(position);
    const txt = textDecode(buf, "latin1");
    const tag = txt.substring(6);
    if (tag === endTag2) {
      return Number.parseInt(txt.substring(0, 6), 10) + 15;
    }
  }
  return 0;
}
async function scanAppendingHeaders(tokenizer, options = {}) {
  let apeOffset = tokenizer.fileInfo.size;
  if (await hasID3v1Header(tokenizer)) {
    apeOffset -= 128;
    const lyricsLen = await getLyricsHeaderLength(tokenizer);
    apeOffset -= lyricsLen;
  }
  options.apeHeader = await APEv2Parser.findApeFooterOffset(tokenizer, apeOffset);
}
const debug = initDebug("music-metadata:parser");
async function parseFile(filePath, options = {}) {
  debug(`parseFile: ${filePath}`);
  const fileTokenizer = await fromFile(filePath);
  const parserFactory = new ParserFactory();
  try {
    const parserLoader = parserFactory.findLoaderForExtension(filePath);
    if (!parserLoader)
      debug("Parser could not be determined by file extension");
    try {
      return await parserFactory.parse(fileTokenizer, parserLoader, options);
    } catch (error) {
      if (error instanceof CouldNotDetermineFileTypeError || error instanceof UnsupportedFileTypeError) {
        error.message += `: ${filePath}`;
      }
      throw error;
    }
  } finally {
    await fileTokenizer.close();
  }
}
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CouldNotDetermineFileTypeError,
  FieldDecodingError,
  InternalParserError,
  LyricsContentType,
  TimestampFormat,
  UnsupportedFileTypeError,
  makeParseError,
  makeUnexpectedFileContentError,
  parseFile,
  scanAppendingHeaders
}, Symbol.toStringTag, { value: "Module" }));
const MUSIC_EXTENSIONS = [
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
async function scanMusicFiles(directoryPath) {
  const musicFiles = [];
  try {
    if (!fs.existsSync(directoryPath)) {
      console.error(`Directory does not exist: ${directoryPath}`);
      return musicFiles;
    }
    const stats = fs.statSync(directoryPath);
    if (!stats.isDirectory()) {
      console.error(`Path is not a directory: ${directoryPath}`);
      return musicFiles;
    }
    await scanDirectory(directoryPath, musicFiles);
    return musicFiles;
  } catch (error) {
    console.error(`Error scanning directory ${directoryPath}:`, error);
    return musicFiles;
  }
}
async function scanDirectory(dirPath, musicFiles) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          await scanDirectory(fullPath, musicFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (MUSIC_EXTENSIONS.includes(ext)) {
            const stats = fs.statSync(fullPath);
            let metadata;
            try {
              const parsed = await parseFile(fullPath);
              let albumArt;
              if (parsed.common.picture && parsed.common.picture.length > 0) {
                const picture = parsed.common.picture[0];
                const buffer = Buffer.from(picture.data);
                albumArt = `data:${picture.format};base64,${buffer.toString("base64")}`;
              }
              metadata = {
                title: parsed.common.title,
                artist: parsed.common.artist,
                album: parsed.common.album,
                albumArtist: parsed.common.albumartist,
                genre: parsed.common.genre,
                year: parsed.common.year,
                track: parsed.common.track,
                disk: parsed.common.disk,
                duration: parsed.format.duration,
                albumArt
              };
            } catch (error) {
              console.warn(`Could not extract metadata for ${entry.name}:`, error);
            }
            musicFiles.push({
              path: fullPath,
              name: entry.name,
              extension: ext,
              size: stats.size,
              metadata
            });
          }
        }
      } catch (error) {
        console.warn(`Skipping ${fullPath}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
}
var dist = {};
var hasRequiredDist;
function requireDist() {
  if (hasRequiredDist) return dist;
  hasRequiredDist = 1;
  var __awaiter = dist && dist.__awaiter || function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator = dist && dist.__generator || function(thisArg, body) {
    var _ = { label: 0, sent: function() {
      if (t[0] & 1) throw t[1];
      return t[1];
    }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
      return this;
    }), g;
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (_) try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
        if (y = 0, t) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var __importDefault = dist && dist.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { "default": mod };
  };
  Object.defineProperty(dist, "__esModule", { value: true });
  var events_1 = require$$0$1;
  var child_process_1 = require$$1$2;
  var fs_1 = __importDefault(fs$1);
  var https_1 = __importDefault(https);
  var os_1 = __importDefault(require$$0);
  var stream_1 = require$$5;
  var executableName = "yt-dlp";
  var progressRegex = /\[download\] *(.*) of ([^ ]*)(:? *at *([^ ]*))?(:? *ETA *([^ ]*))?/;
  var YTDlpWrap2 = (
    /** @class */
    (function() {
      function YTDlpWrap3(binaryPath) {
        if (binaryPath === void 0) {
          binaryPath = executableName;
        }
        this.binaryPath = binaryPath;
      }
      YTDlpWrap3.prototype.getBinaryPath = function() {
        return this.binaryPath;
      };
      YTDlpWrap3.prototype.setBinaryPath = function(binaryPath) {
        this.binaryPath = binaryPath;
      };
      YTDlpWrap3.createGetMessage = function(url) {
        return new Promise(function(resolve, reject) {
          https_1.default.get(url, function(httpResponse) {
            httpResponse.on("error", function(e) {
              return reject(e);
            });
            resolve(httpResponse);
          });
        });
      };
      YTDlpWrap3.processMessageToFile = function(message, filePath) {
        var file = fs_1.default.createWriteStream(filePath);
        return new Promise(function(resolve, reject) {
          message.pipe(file);
          message.on("error", function(e) {
            return reject(e);
          });
          file.on("finish", function() {
            return message.statusCode == 200 ? resolve(message) : reject(message);
          });
        });
      };
      YTDlpWrap3.downloadFile = function(fileURL, filePath) {
        return __awaiter(this, void 0, void 0, function() {
          var currentUrl, message;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                currentUrl = fileURL;
                _a.label = 1;
              case 1:
                if (!currentUrl) return [3, 6];
                return [4, YTDlpWrap3.createGetMessage(currentUrl)];
              case 2:
                message = _a.sent();
                if (!message.headers.location) return [3, 3];
                currentUrl = message.headers.location;
                return [3, 5];
              case 3:
                return [4, YTDlpWrap3.processMessageToFile(message, filePath)];
              case 4:
                return [2, _a.sent()];
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
      };
      YTDlpWrap3.getGithubReleases = function(page, perPage) {
        if (page === void 0) {
          page = 1;
        }
        if (perPage === void 0) {
          perPage = 1;
        }
        return new Promise(function(resolve, reject) {
          var apiURL = "https://api.github.com/repos/yt-dlp/yt-dlp/releases?page=" + page + "&per_page=" + perPage;
          https_1.default.get(apiURL, { headers: { "User-Agent": "node" } }, function(response) {
            var resonseString = "";
            response.setEncoding("utf8");
            response.on("data", function(body) {
              return resonseString += body;
            });
            response.on("error", function(e) {
              return reject(e);
            });
            response.on("end", function() {
              return response.statusCode == 200 ? resolve(JSON.parse(resonseString)) : reject(response);
            });
          });
        });
      };
      YTDlpWrap3.downloadFromGithub = function(filePath, version, platform) {
        if (platform === void 0) {
          platform = os_1.default.platform();
        }
        return __awaiter(this, void 0, void 0, function() {
          var isWin32, fileName, fileURL;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                isWin32 = platform == "win32";
                fileName = "".concat(executableName).concat(isWin32 ? ".exe" : "");
                if (!!version) return [3, 2];
                return [4, YTDlpWrap3.getGithubReleases(1, 1)];
              case 1:
                version = _a.sent()[0].tag_name;
                _a.label = 2;
              case 2:
                if (!filePath)
                  filePath = "./" + fileName;
                fileURL = "https://github.com/yt-dlp/yt-dlp/releases/download/" + version + "/" + fileName;
                return [4, YTDlpWrap3.downloadFile(fileURL, filePath)];
              case 3:
                _a.sent();
                !isWin32 && fs_1.default.chmodSync(filePath, "777");
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      };
      YTDlpWrap3.prototype.exec = function(ytDlpArguments, options, abortSignal) {
        if (ytDlpArguments === void 0) {
          ytDlpArguments = [];
        }
        if (options === void 0) {
          options = {};
        }
        if (abortSignal === void 0) {
          abortSignal = null;
        }
        options = YTDlpWrap3.setDefaultOptions(options);
        var execEventEmitter = new events_1.EventEmitter();
        var ytDlpProcess = (0, child_process_1.spawn)(this.binaryPath, ytDlpArguments, options);
        execEventEmitter.ytDlpProcess = ytDlpProcess;
        YTDlpWrap3.bindAbortSignal(abortSignal, ytDlpProcess);
        var stderrData = "";
        var processError;
        ytDlpProcess.stdout.on("data", function(data) {
          return YTDlpWrap3.emitYoutubeDlEvents(data.toString(), execEventEmitter);
        });
        ytDlpProcess.stderr.on("data", function(data) {
          return stderrData += data.toString();
        });
        ytDlpProcess.on("error", function(error) {
          return processError = error;
        });
        ytDlpProcess.on("close", function(code) {
          if (code === 0 || ytDlpProcess.killed)
            execEventEmitter.emit("close", code);
          else
            execEventEmitter.emit("error", YTDlpWrap3.createError(code, processError, stderrData));
        });
        return execEventEmitter;
      };
      YTDlpWrap3.prototype.execPromise = function(ytDlpArguments, options, abortSignal) {
        var _this = this;
        if (ytDlpArguments === void 0) {
          ytDlpArguments = [];
        }
        if (options === void 0) {
          options = {};
        }
        if (abortSignal === void 0) {
          abortSignal = null;
        }
        var ytDlpProcess;
        var ytDlpPromise = new Promise(function(resolve, reject) {
          options = YTDlpWrap3.setDefaultOptions(options);
          ytDlpProcess = (0, child_process_1.execFile)(_this.binaryPath, ytDlpArguments, options, function(error, stdout, stderr) {
            if (error)
              reject(YTDlpWrap3.createError(error, null, stderr));
            resolve(stdout);
          });
          YTDlpWrap3.bindAbortSignal(abortSignal, ytDlpProcess);
        });
        ytDlpPromise.ytDlpProcess = ytDlpProcess;
        return ytDlpPromise;
      };
      YTDlpWrap3.prototype.execStream = function(ytDlpArguments, options, abortSignal) {
        if (ytDlpArguments === void 0) {
          ytDlpArguments = [];
        }
        if (options === void 0) {
          options = {};
        }
        if (abortSignal === void 0) {
          abortSignal = null;
        }
        var readStream = new stream_1.Readable({ read: function(size) {
        } });
        options = YTDlpWrap3.setDefaultOptions(options);
        ytDlpArguments = ytDlpArguments.concat(["-o", "-"]);
        var ytDlpProcess = (0, child_process_1.spawn)(this.binaryPath, ytDlpArguments, options);
        readStream.ytDlpProcess = ytDlpProcess;
        YTDlpWrap3.bindAbortSignal(abortSignal, ytDlpProcess);
        var stderrData = "";
        var processError;
        ytDlpProcess.stdout.on("data", function(data) {
          return readStream.push(data);
        });
        ytDlpProcess.stderr.on("data", function(data) {
          var stringData = data.toString();
          YTDlpWrap3.emitYoutubeDlEvents(stringData, readStream);
          stderrData += stringData;
        });
        ytDlpProcess.on("error", function(error) {
          return processError = error;
        });
        ytDlpProcess.on("close", function(code) {
          if (code === 0 || ytDlpProcess.killed) {
            readStream.emit("close");
            readStream.destroy();
            readStream.emit("end");
          } else {
            var error = YTDlpWrap3.createError(code, processError, stderrData);
            readStream.emit("error", error);
            readStream.destroy(error);
          }
        });
        return readStream;
      };
      YTDlpWrap3.prototype.getExtractors = function() {
        return __awaiter(this, void 0, void 0, function() {
          var ytDlpStdout;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                return [4, this.execPromise(["--list-extractors"])];
              case 1:
                ytDlpStdout = _a.sent();
                return [2, ytDlpStdout.split("\n")];
            }
          });
        });
      };
      YTDlpWrap3.prototype.getExtractorDescriptions = function() {
        return __awaiter(this, void 0, void 0, function() {
          var ytDlpStdout;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                return [4, this.execPromise(["--extractor-descriptions"])];
              case 1:
                ytDlpStdout = _a.sent();
                return [2, ytDlpStdout.split("\n")];
            }
          });
        });
      };
      YTDlpWrap3.prototype.getHelp = function() {
        return __awaiter(this, void 0, void 0, function() {
          var ytDlpStdout;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                return [4, this.execPromise(["--help"])];
              case 1:
                ytDlpStdout = _a.sent();
                return [2, ytDlpStdout];
            }
          });
        });
      };
      YTDlpWrap3.prototype.getUserAgent = function() {
        return __awaiter(this, void 0, void 0, function() {
          var ytDlpStdout;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                return [4, this.execPromise(["--dump-user-agent"])];
              case 1:
                ytDlpStdout = _a.sent();
                return [2, ytDlpStdout];
            }
          });
        });
      };
      YTDlpWrap3.prototype.getVersion = function() {
        return __awaiter(this, void 0, void 0, function() {
          var ytDlpStdout;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                return [4, this.execPromise(["--version"])];
              case 1:
                ytDlpStdout = _a.sent();
                return [2, ytDlpStdout];
            }
          });
        });
      };
      YTDlpWrap3.prototype.getVideoInfo = function(ytDlpArguments) {
        return __awaiter(this, void 0, void 0, function() {
          var ytDlpStdout;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                if (typeof ytDlpArguments == "string")
                  ytDlpArguments = [ytDlpArguments];
                if (!ytDlpArguments.includes("-f") && !ytDlpArguments.includes("--format"))
                  ytDlpArguments = ytDlpArguments.concat(["-f", "best"]);
                return [4, this.execPromise(ytDlpArguments.concat(["--dump-json"]))];
              case 1:
                ytDlpStdout = _a.sent();
                try {
                  return [2, JSON.parse(ytDlpStdout)];
                } catch (e) {
                  return [2, JSON.parse("[" + ytDlpStdout.replace(/\n/g, ",").slice(0, -1) + "]")];
                }
                return [
                  2
                  /*return*/
                ];
            }
          });
        });
      };
      YTDlpWrap3.bindAbortSignal = function(signal, process2) {
        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", function() {
          try {
            if (os_1.default.platform() === "win32")
              (0, child_process_1.execSync)("taskkill /pid ".concat(process2.pid, " /T /F"));
            else {
              (0, child_process_1.execSync)("pgrep -P ".concat(process2.pid, " | xargs -L 1 kill"));
            }
          } catch (e) {
          } finally {
            process2.kill();
          }
        });
      };
      YTDlpWrap3.setDefaultOptions = function(options) {
        if (!options.maxBuffer)
          options.maxBuffer = 1024 * 1024 * 1024;
        return options;
      };
      YTDlpWrap3.createError = function(code, processError, stderrData) {
        var errorMessage = "\nError code: " + code;
        if (processError)
          errorMessage += "\n\nProcess error:\n" + processError;
        if (stderrData)
          errorMessage += "\n\nStderr:\n" + stderrData;
        return new Error(errorMessage);
      };
      YTDlpWrap3.emitYoutubeDlEvents = function(stringData, emitter) {
        var outputLines = stringData.split(/\r|\n/g).filter(Boolean);
        for (var _i = 0, outputLines_1 = outputLines; _i < outputLines_1.length; _i++) {
          var outputLine = outputLines_1[_i];
          if (outputLine[0] == "[") {
            var progressMatch = outputLine.match(progressRegex);
            if (progressMatch) {
              var progressObject = {};
              progressObject.percent = parseFloat(progressMatch[1].replace("%", ""));
              progressObject.totalSize = progressMatch[2].replace("~", "");
              progressObject.currentSpeed = progressMatch[4];
              progressObject.eta = progressMatch[6];
              emitter.emit("progress", progressObject);
            }
            var eventType = outputLine.split(" ")[0].replace("[", "").replace("]", "");
            var eventData = outputLine.substring(outputLine.indexOf(" "), outputLine.length);
            emitter.emit("ytDlpEvent", eventType, eventData);
          }
        }
      };
      return YTDlpWrap3;
    })()
  );
  dist.default = YTDlpWrap2;
  return dist;
}
var distExports = requireDist();
const YTDlpWrap = /* @__PURE__ */ getDefaultExportFromCjs(distExports);
const execFileAsync$1 = promisify(execFile);
let ytDlpWrap = null;
let lastDownloadTime = 0;
const DOWNLOAD_DELAY_MS = 1e4;
async function getInstalledVersion$1(binaryPath) {
  try {
    const { stdout } = await execFileAsync$1(binaryPath, ["--version"]);
    return stdout.trim();
  } catch (error) {
    console.error("Failed to get installed version:", error);
    return null;
  }
}
async function getLatestVersion() {
  try {
    return new Promise((resolve, reject) => {
      https.get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
        headers: { "User-Agent": "music-sync-app" }
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const release = JSON.parse(data);
            resolve(release.tag_name || null);
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    });
  } catch (error) {
    console.error("Failed to get latest version:", error);
    return null;
  }
}
async function checkBinaryVersion(binaryPath, onProgress) {
  onProgress?.({
    status: "version-check",
    message: "Checking yt-dlp version..."
  });
  const [installedVersion, latestVersion] = await Promise.all([
    getInstalledVersion$1(binaryPath),
    getLatestVersion()
  ]);
  if (!installedVersion || !latestVersion) {
    return { isUpToDate: false, needsUpdate: false };
  }
  const isUpToDate = installedVersion === latestVersion;
  return {
    isUpToDate,
    installedVersion,
    latestVersion,
    needsUpdate: !isUpToDate
  };
}
function getAssetNameForPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32") {
    if (arch === "arm64") {
      return "yt-dlp_win_arm64.exe";
    } else {
      return "yt-dlp.exe";
    }
  } else if (platform === "darwin") {
    if (arch === "arm64") {
      return "yt-dlp_macos_arm64";
    } else {
      return "yt-dlp_macos";
    }
  } else if (platform === "linux") {
    if (arch === "arm64") {
      return "yt-dlp_linux_arm64";
    } else {
      return "yt-dlp_linux";
    }
  }
  return null;
}
function findAssetForPlatform(assets) {
  const targetAssetName = getAssetNameForPlatform();
  if (!targetAssetName) {
    console.error(`Unsupported platform: ${process.platform} ${process.arch}`);
    return null;
  }
  let asset = assets.find((a) => a.name === targetAssetName);
  if (asset) {
    return asset;
  }
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32") {
    if (arch === "arm64") {
      asset = assets.find(
        (a) => a.name.includes("yt-dlp") && a.name.includes("win") && (a.name.includes("arm64") || a.name.includes("arm"))
      );
    } else {
      asset = assets.find(
        (a) => a.name === "yt-dlp.exe" || a.name.includes("yt-dlp") && a.name.includes(".exe") && !a.name.includes("arm")
      );
    }
  } else if (platform === "darwin") {
    if (arch === "arm64") {
      asset = assets.find(
        (a) => a.name.includes("yt-dlp") && a.name.includes("macos") && (a.name.includes("arm64") || a.name.includes("arm") || a.name.includes("m1") || a.name.includes("m2"))
      );
    } else {
      asset = assets.find(
        (a) => a.name.includes("yt-dlp") && a.name.includes("macos") && !a.name.includes("arm") && !a.name.includes(".exe")
      );
    }
  } else if (platform === "linux") {
    if (arch === "arm64") {
      asset = assets.find(
        (a) => a.name.includes("yt-dlp") && a.name.includes("linux") && (a.name.includes("arm64") || a.name.includes("arm"))
      );
    } else {
      asset = assets.find(
        (a) => a.name.includes("yt-dlp") && a.name.includes("linux") && !a.name.includes("arm") && !a.name.includes(".exe")
      );
    }
  }
  return asset || null;
}
async function downloadBinaryWithProgress(binaryPath, onProgress) {
  return new Promise((resolve, reject) => {
    const getLatestRelease = () => {
      return new Promise((resolveRelease, rejectRelease) => {
        https.get("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest", {
          headers: { "User-Agent": "music-sync-app" }
        }, (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            try {
              resolveRelease(JSON.parse(data));
            } catch (e) {
              rejectRelease(e);
            }
          });
        }).on("error", rejectRelease);
      });
    };
    getLatestRelease().then(async (release) => {
      const asset = findAssetForPlatform(release.assets);
      if (!asset) {
        const platform = process.platform;
        const arch = process.arch;
        const availableAssets = release.assets.map((a) => a.name).join(", ");
        console.error(`Binary not found for platform: ${platform} (${arch})`);
        console.error(`Available assets: ${availableAssets}`);
        reject(new Error(`Binary not found for platform: ${platform} (${arch}). Available assets: ${availableAssets}`));
        return;
      }
      console.log(`Downloading yt-dlp binary: ${asset.name} for ${process.platform} (${process.arch})`);
      onProgress?.({
        status: "downloading",
        message: "yt-dlp binary downloading...",
        percentage: 0
      });
      const file = fs$1.createWriteStream(binaryPath);
      let downloadedBytes = 0;
      const totalBytes = asset.size;
      const request = https.get(asset.browser_download_url, {
        headers: { "User-Agent": "music-sync-app" }
      }, (res) => {
        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          const percentage = totalBytes > 0 ? downloadedBytes / totalBytes * 100 : 0;
          onProgress?.({
            status: "downloading",
            message: "yt-dlp binary downloading...",
            percentage: Math.min(percentage, 99)
          });
          file.write(chunk);
        });
        res.on("end", () => {
          file.end();
          if (process.platform !== "win32") {
            fs$1.chmodSync(binaryPath, 493);
          }
          onProgress?.({
            status: "downloaded",
            message: "yt-dlp binary downloaded",
            percentage: 100
          });
          resolve();
        });
      });
      request.on("error", (err) => {
        file.close();
        try {
          if (fs$1.existsSync(binaryPath)) {
            fs$1.unlinkSync(binaryPath);
          }
        } catch {
        }
        reject(err);
      });
    }).catch(reject);
  });
}
async function getYtDlpWrap(onBinaryProgress) {
  if (!ytDlpWrap) {
    const userDataPath = app.getPath("userData");
    const binaryDir = path$1.join(userDataPath, "yt-dlp-binaries");
    if (!fs$1.existsSync(binaryDir)) {
      fs$1.mkdirSync(binaryDir, { recursive: true });
    }
    let binaryName;
    if (process.platform === "win32") {
      binaryName = process.arch === "arm64" ? "yt-dlp_win_arm64.exe" : "yt-dlp.exe";
    } else if (process.platform === "darwin") {
      binaryName = process.arch === "arm64" ? "yt-dlp_macos_arm64" : "yt-dlp_macos";
    } else {
      binaryName = process.arch === "arm64" ? "yt-dlp_linux_arm64" : "yt-dlp_linux";
    }
    const binaryPath = path$1.join(binaryDir, binaryName);
    if (!fs$1.existsSync(binaryPath)) {
      onBinaryProgress?.({
        status: "not-found",
        message: "yt-dlp binary not found"
      });
      onBinaryProgress?.({
        status: "downloading",
        message: "yt-dlp binary downloading...",
        percentage: 0
      });
      try {
        await downloadBinaryWithProgress(binaryPath, onBinaryProgress);
        onBinaryProgress?.({
          status: "downloaded",
          message: "yt-dlp binary downloaded",
          percentage: 100
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        onBinaryProgress?.({
          status: "installed",
          message: "yt-dlp binary installed"
        });
      } catch (error) {
        console.error("Failed to download yt-dlp binary:", error);
        throw new Error("Failed to download yt-dlp binary. Please check your internet connection.");
      }
    } else {
      const versionCheck = await checkBinaryVersion(binaryPath, onBinaryProgress);
      if (versionCheck.needsUpdate && versionCheck.installedVersion && versionCheck.latestVersion) {
        onBinaryProgress?.({
          status: "updating",
          message: `Updating yt-dlp from ${versionCheck.installedVersion} to ${versionCheck.latestVersion}...`,
          percentage: 0
        });
        try {
          await downloadBinaryWithProgress(binaryPath, onBinaryProgress);
          onBinaryProgress?.({
            status: "downloaded",
            message: `yt-dlp updated to ${versionCheck.latestVersion}`,
            percentage: 100
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
          onBinaryProgress?.({
            status: "installed",
            message: "yt-dlp binary updated"
          });
        } catch (error) {
          console.error("Failed to update yt-dlp binary:", error);
          onBinaryProgress?.({
            status: "checking",
            message: "Update failed, using existing version"
          });
        }
      } else if (versionCheck.isUpToDate && versionCheck.installedVersion) {
        onBinaryProgress?.({
          status: "checking",
          message: `yt-dlp is up to date (${versionCheck.installedVersion}). Starting download...`
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    ytDlpWrap = new YTDlpWrap(binaryPath);
  }
  return ytDlpWrap;
}
async function getVideoTitle(url, ytDlp) {
  try {
    const result = await ytDlp.execPromise([
      url,
      "--get-title",
      "--no-warnings"
    ]);
    return result.trim() || "Unknown Title";
  } catch (error) {
    console.error("Failed to get video title:", error);
    return "Unknown Title";
  }
}
async function downloadYouTubeAudio(options) {
  return new Promise(async (resolve) => {
    try {
      const ytDlp = await getYtDlpWrap(options.onBinaryProgress);
      const now = Date.now();
      const timeSinceLastDownload = now - lastDownloadTime;
      if (timeSinceLastDownload < DOWNLOAD_DELAY_MS && lastDownloadTime > 0) {
        const waitTime = DOWNLOAD_DELAY_MS - timeSinceLastDownload;
        options.onBinaryProgress?.({
          status: "checking",
          message: `Waiting ${Math.ceil(waitTime / 1e3)} seconds to avoid rate limiting...`
        });
        await new Promise((resolve2) => setTimeout(resolve2, waitTime));
      }
      lastDownloadTime = Date.now();
      const videoTitle = await getVideoTitle(options.url, ytDlp);
      options.onTitleReceived?.(videoTitle);
      if (!fs$1.existsSync(options.outputPath)) {
        fs$1.mkdirSync(options.outputPath, { recursive: true });
      }
      const outputTemplate = path$1.join(options.outputPath, "%(title)s.%(ext)s");
      const eventEmitter = ytDlp.exec([
        options.url,
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
        outputTemplate,
        "--newline",
        "--progress",
        "--no-warnings"
      ]);
      let downloadedFile = null;
      let hasError = false;
      eventEmitter.on("progress", (progress) => {
        if (options.onProgress && !hasError) {
          const percent = progress.percent || 0;
          const downloaded = progress.downloaded || 0;
          const total = progress.total || 0;
          const speed = progress.speed || "0 B/s";
          const eta = progress.eta || "--:--";
          options.onProgress({
            percentage: percent,
            downloaded,
            total,
            speed: typeof speed === "string" ? speed : `${speed} B/s`,
            eta: typeof eta === "string" ? eta : "--:--"
          });
        }
      });
      eventEmitter.on("ytDlpEvent", (eventType, eventData) => {
        if (eventType === "download" && eventData.filename) {
          downloadedFile = eventData.filename;
        }
      });
      eventEmitter.on("error", (error) => {
        hasError = true;
        resolve({
          success: false,
          error: error.message
        });
      });
      await new Promise((resolvePromise, rejectPromise) => {
        eventEmitter.on("close", (code) => {
          if (code === 0 || code === null) {
            resolvePromise();
          } else {
            rejectPromise(new Error(`yt-dlp exited with code ${code}`));
          }
        });
        eventEmitter.on("error", rejectPromise);
      });
      if (downloadedFile && fs$1.existsSync(downloadedFile)) {
        resolve({
          success: true,
          filePath: downloadedFile,
          title: videoTitle
        });
      } else {
        const files = fs$1.readdirSync(options.outputPath).map((f) => ({
          name: f,
          path: path$1.join(options.outputPath, f),
          time: fs$1.statSync(path$1.join(options.outputPath, f)).mtime.getTime()
        })).filter((f) => f.name.endsWith(".mp3")).sort((a, b) => b.time - a.time);
        if (files.length > 0) {
          resolve({
            success: true,
            filePath: files[0].path,
            title: videoTitle
          });
        } else {
          resolve({
            success: false,
            error: "Download completed but file not found"
          });
        }
      }
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let tray = null;
let isPlaying = false;
function createTrayMenu() {
  const windows = BrowserWindow.getAllWindows();
  const hasWindow = windows.length > 0;
  const isVisible = hasWindow && windows[0].isVisible();
  return Menu.buildFromTemplate([
    {
      label: isVisible ? "Hide" : "Show",
      click: () => {
        const windows2 = BrowserWindow.getAllWindows();
        if (windows2.length === 0) {
          createWindow();
        } else {
          const window2 = windows2[0];
          if (window2.isVisible()) {
            window2.hide();
          } else {
            window2.show();
            window2.focus();
          }
        }
        updateTrayMenu();
      }
    },
    { type: "separator" },
    {
      label: isPlaying ? "Pause" : "Play",
      click: () => {
        const windows2 = BrowserWindow.getAllWindows();
        if (windows2.length > 0) {
          windows2[0].webContents.send("tray-play-pause");
        }
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      }
    }
  ]);
}
function updateTrayMenu() {
  if (tray) {
    const menu = createTrayMenu();
    tray.setContextMenu(menu);
  }
}
function updatePlaybackState(playing) {
  isPlaying = playing;
  updateTrayMenu();
}
function updateWindowVisibility(_visible) {
  updateTrayMenu();
}
function createTray() {
  const iconPath = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "src", "assets", "trayIcon.svg") : path.join(process.env.APP_ROOT, "dist", "assets", "trayIcon.svg");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip("Music Sync App");
  updateTrayMenu();
  tray.on("click", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length === 0) {
      createWindow();
    } else {
      const window2 = windows[0];
      if (window2.isVisible()) {
        window2.hide();
      } else {
        window2.show();
        window2.focus();
      }
    }
    updateTrayMenu();
  });
  return tray;
}
const CONFIG_FILE = "app-config.json";
function getConfigPath() {
  return path$1.join(app.getPath("userData"), CONFIG_FILE);
}
function getStoredSettings() {
  try {
    const configPath = getConfigPath();
    if (fs$1.existsSync(configPath)) {
      const data = fs$1.readFileSync(configPath, "utf-8");
      const config = JSON.parse(data);
      return {
        musicFolderPath: config.musicFolderPath || null,
        downloadFolderPath: config.downloadFolderPath || null
      };
    }
  } catch (error) {
    console.error("Error reading config:", error);
  }
  return {
    musicFolderPath: null,
    downloadFolderPath: null
  };
}
function saveSettings(settings) {
  try {
    const configPath = getConfigPath();
    const config = {
      musicFolderPath: settings.musicFolderPath,
      downloadFolderPath: settings.downloadFolderPath
    };
    fs$1.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving config:", error);
    throw error;
  }
}
const execFileAsync = promisify(execFile);
const require$1 = createRequire(import.meta.url);
let ffmpegInstaller = null;
try {
  ffmpegInstaller = require$1("@ffmpeg-installer/ffmpeg");
} catch (error) {
  console.warn("@ffmpeg-installer/ffmpeg not available:", error);
}
function getBinaryDir(binaryName) {
  const userDataPath = app.getPath("userData");
  return path$1.join(userDataPath, `${binaryName}-binaries`);
}
function getBinaryPath(binaryName) {
  const binaryDir = getBinaryDir(binaryName);
  let binaryFileName;
  {
    if (process.platform === "win32") {
      binaryFileName = process.arch === "arm64" ? "yt-dlp_win_arm64.exe" : "yt-dlp.exe";
    } else if (process.platform === "darwin") {
      binaryFileName = process.arch === "arm64" ? "yt-dlp_macos_arm64" : "yt-dlp_macos";
    } else {
      binaryFileName = process.arch === "arm64" ? "yt-dlp_linux_arm64" : "yt-dlp_linux";
    }
  }
  return path$1.join(binaryDir, binaryFileName);
}
async function getInstalledVersion(binaryPath) {
  try {
    if (!fs$1.existsSync(binaryPath)) {
      return null;
    }
    const { stdout } = await execFileAsync(binaryPath, ["--version"]);
    const versionMatch = stdout.match(/version\s+([^\s]+)/i);
    if (versionMatch) {
      return versionMatch[1];
    }
    return stdout.trim().split("\n")[0] || null;
  } catch (error) {
    console.error(`Failed to get installed version for ${binaryPath}:`, error);
    return null;
  }
}
async function getLatestVersionFromGitHub(repo) {
  try {
    return new Promise((resolve, reject) => {
      https.get(`https://api.github.com/repos/${repo}/releases/latest`, {
        headers: { "User-Agent": "music-sync-app" }
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const release = JSON.parse(data);
            resolve(release.tag_name || null);
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    });
  } catch (error) {
    console.error(`Failed to get latest version from GitHub for ${repo}:`, error);
    return null;
  }
}
async function getYtDlpStatus() {
  const binaryName = "yt-dlp";
  const binaryPath = getBinaryPath(binaryName);
  const installed = fs$1.existsSync(binaryPath);
  let version = null;
  let latestVersion = null;
  if (installed) {
    version = await getInstalledVersion(binaryPath);
  }
  latestVersion = await getLatestVersionFromGitHub("yt-dlp/yt-dlp");
  const needsUpdate = installed && version && latestVersion && version !== latestVersion;
  return {
    name: "yt-dlp",
    installed,
    version,
    path: installed ? binaryPath : null,
    latestVersion,
    needsUpdate: needsUpdate || false
  };
}
function getFfmpegPath() {
  if (!ffmpegInstaller) {
    return null;
  }
  let ffmpegPath = ffmpegInstaller.path;
  if (ffmpegPath.includes("app.asar")) {
    ffmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");
  }
  if (fs$1.existsSync(ffmpegPath)) {
    return ffmpegPath;
  }
  return null;
}
async function getFfmpegStatus() {
  const ffmpegPath = getFfmpegPath();
  const installed = ffmpegPath !== null && fs$1.existsSync(ffmpegPath);
  let version = null;
  let latestVersion = null;
  if (installed && ffmpegPath) {
    if (ffmpegInstaller?.version) {
      version = ffmpegInstaller.version;
    } else {
      version = await getInstalledVersion(ffmpegPath);
    }
  }
  latestVersion = version;
  return {
    name: "ffmpeg",
    installed,
    version,
    path: installed ? ffmpegPath : null,
    latestVersion,
    needsUpdate: false
    // Managed by npm package, always up to date
  };
}
async function getAllBinaryStatuses() {
  const statuses = [];
  statuses.push(await getYtDlpStatus());
  statuses.push(await getFfmpegStatus());
  return statuses;
}
var createChromaprintModule = /* @__PURE__ */ (() => {
  return (async function(moduleArg = {}) {
    var moduleRtn;
    var Module2 = moduleArg;
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var _scriptName = import.meta.url;
    var scriptDirectory = "";
    function locateFile(path2) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path2, scriptDirectory);
      }
      return scriptDirectory + path2;
    }
    var readAsync;
    {
      try {
        scriptDirectory = new URL(".", _scriptName).href;
      } catch {
      }
      if (!(typeof window == "object" || typeof WorkerGlobalScope != "undefined")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      {
        readAsync = async (url) => {
          assert(!isFileURI(url), "readAsync does not work with file:// URLs");
          var response = await fetch(url, { credentials: "same-origin" });
          if (response.ok) {
            return response.arrayBuffer();
          }
          throw new Error(response.status + " : " + response.url);
        };
      }
    }
    var out = console.log.bind(console);
    var err = console.error.bind(console);
    assert(true, "worker environment detected but not enabled at build time.  Add `worker` to `-sENVIRONMENT` to enable.");
    assert(true, "node environment detected but not enabled at build time.  Add `node` to `-sENVIRONMENT` to enable.");
    assert(true, "shell environment detected but not enabled at build time.  Add `shell` to `-sENVIRONMENT` to enable.");
    var wasmBinary;
    if (typeof WebAssembly != "object") {
      err("no native wasm support detected");
    }
    var ABORT = false;
    var EXITSTATUS;
    function assert(condition, text) {
      if (!condition) {
        abort("Assertion failed" + (text ? ": " + text : ""));
      }
    }
    var isFileURI = (filename) => filename.startsWith("file://");
    function writeStackCookie() {
      var max = _emscripten_stack_get_end();
      assert((max & 3) == 0);
      if (max == 0) {
        max += 4;
      }
      HEAPU32[max >> 2] = 34821223;
      HEAPU32[max + 4 >> 2] = 2310721022;
      HEAPU32[0 >> 2] = 1668509029;
    }
    function checkStackCookie() {
      if (ABORT) return;
      var max = _emscripten_stack_get_end();
      if (max == 0) {
        max += 4;
      }
      var cookie1 = HEAPU32[max >> 2];
      var cookie2 = HEAPU32[max + 4 >> 2];
      if (cookie1 != 34821223 || cookie2 != 2310721022) {
        abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
      }
      if (HEAPU32[0 >> 2] != 1668509029) {
        abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
      }
    }
    (() => {
      var h16 = new Int16Array(1);
      var h8 = new Int8Array(h16.buffer);
      h16[0] = 25459;
      if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
    })();
    function consumedModuleProp(prop) {
      if (!Object.getOwnPropertyDescriptor(Module2, prop)) {
        Object.defineProperty(Module2, prop, { configurable: true, set() {
          abort(`Attempt to set \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`);
        } });
      }
    }
    function makeInvalidEarlyAccess(name) {
      return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);
    }
    function ignoredModuleProp(prop) {
      if (Object.getOwnPropertyDescriptor(Module2, prop)) {
        abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
      }
    }
    function isExportedByForceFilesystem(name) {
      return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
    }
    function hookGlobalSymbolAccess(sym, func) {
      if (typeof globalThis != "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
        Object.defineProperty(globalThis, sym, { configurable: true, get() {
          func();
          return void 0;
        } });
      }
    }
    function missingGlobal(sym, msg) {
      hookGlobalSymbolAccess(sym, () => {
        warnOnce(`\`${sym}\` is not longer defined by emscripten. ${msg}`);
      });
    }
    missingGlobal("buffer", "Please use HEAP8.buffer or wasmMemory.buffer");
    missingGlobal("asm", "Please use wasmExports instead");
    function missingLibrarySymbol(sym) {
      hookGlobalSymbolAccess(sym, () => {
        var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
        var librarySymbol = sym;
        if (!librarySymbol.startsWith("_")) {
          librarySymbol = "$" + sym;
        }
        msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
        if (isExportedByForceFilesystem(sym)) {
          msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
        }
        warnOnce(msg);
      });
      unexportedRuntimeSymbol(sym);
    }
    function unexportedRuntimeSymbol(sym) {
      if (!Object.getOwnPropertyDescriptor(Module2, sym)) {
        Object.defineProperty(Module2, sym, { configurable: true, get() {
          var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
          if (isExportedByForceFilesystem(sym)) {
            msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
          }
          abort(msg);
        } });
      }
    }
    var readyPromiseResolve, readyPromiseReject;
    var wasmMemory;
    var HEAP8, HEAPU8, HEAP16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    var HEAP64;
    var runtimeInitialized = false;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      HEAP8 = new Int8Array(b);
      Module2["HEAP16"] = HEAP16 = new Int16Array(b);
      HEAPU8 = new Uint8Array(b);
      Module2["HEAP32"] = HEAP32 = new Int32Array(b);
      HEAPU32 = new Uint32Array(b);
      HEAPF32 = new Float32Array(b);
      HEAPF64 = new Float64Array(b);
      HEAP64 = new BigInt64Array(b);
      new BigUint64Array(b);
    }
    assert(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != void 0 && Int32Array.prototype.set != void 0, "JS engine does not provide full typed array support");
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      consumedModuleProp("preRun");
      callRuntimeCallbacks(onPreRuns);
    }
    function initRuntime() {
      assert(!runtimeInitialized);
      runtimeInitialized = true;
      checkStackCookie();
      wasmExports["__wasm_call_ctors"]();
    }
    function postRun() {
      checkStackCookie();
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      consumedModuleProp("postRun");
      callRuntimeCallbacks(onPostRuns);
    }
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    var runDependencyTracking = {};
    var runDependencyWatcher = null;
    function addRunDependency(id) {
      runDependencies++;
      Module2["monitorRunDependencies"]?.(runDependencies);
      {
        assert(!runDependencyTracking[id]);
        runDependencyTracking[id] = 1;
        if (runDependencyWatcher === null && typeof setInterval != "undefined") {
          runDependencyWatcher = setInterval(() => {
            if (ABORT) {
              clearInterval(runDependencyWatcher);
              runDependencyWatcher = null;
              return;
            }
            var shown = false;
            for (var dep in runDependencyTracking) {
              if (!shown) {
                shown = true;
                err("still waiting on run dependencies:");
              }
              err(`dependency: ${dep}`);
            }
            if (shown) {
              err("(end of list)");
            }
          }, 1e4);
        }
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      Module2["monitorRunDependencies"]?.(runDependencies);
      {
        assert(runDependencyTracking[id]);
        delete runDependencyTracking[id];
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      Module2["onAbort"]?.(what);
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject?.(e);
      throw e;
    }
    var FS = { error() {
      abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM");
    }, init() {
      FS.error();
    }, createDataFile() {
      FS.error();
    }, createPreloadedFile() {
      FS.error();
    }, createLazyFile() {
      FS.error();
    }, open() {
      FS.error();
    }, mkdev() {
      FS.error();
    }, registerDevice() {
      FS.error();
    }, analyzePath() {
      FS.error();
    }, ErrnoError() {
      FS.error();
    } };
    function createExportWrapper(name, nargs) {
      return (...args) => {
        assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
        var f = wasmExports[name];
        assert(f, `exported native function \`${name}\` not found`);
        assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
        return f(...args);
      };
    }
    var wasmBinaryFile;
    function findWasmBinary() {
      if (Module2["locateFile"]) {
        return locateFile("chromaprint.wasm");
      }
      return new URL("data:application/wasm;base64,AGFzbQEAAAAB1AEfYAF/AX9gAn9/AGABfwBgA39/fwBgAn9/AX9gA39/fwF/YAAAYAR/f39/AGAEf39/fwF/YAV/f39/fwF/YAV/f39/fwBgAAF/YAZ/f39/f38AYAF8AXxgA39+fwF+YAABfGADf35/AGACfHwBfGACfH8BfGAEf35/fwF/YAJ/fAF/YAV/f35/fwBgBH5+f38AYAl/f39/f39/f38Bf2AGf39/f39/AX9gB39/f39/f38AYAJ+fwF/YAZ/fH9/f38Bf2ACfH8Bf2ADfHx/AXxgAn98AALCAw8DZW52FmVtc2NyaXB0ZW5fcmVzaXplX2hlYXAAABZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxCGZkX3dyaXRlAAgDZW52EmVtc2NyaXB0ZW5fZ2V0X25vdwAPA2Vudg5lbXNjcmlwdGVuX2VycgACA2VudhNlbXNjcmlwdGVuX2RhdGVfbm93AA8Wd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQpyYW5kb21fZ2V0AAQWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQhmZF9jbG9zZQAAFndhc2lfc25hcHNob3RfcHJldmlldzEHZmRfc2VlawATA2VudglfYWJvcnRfanMABhZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxEWVudmlyb25fc2l6ZXNfZ2V0AAQWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQtlbnZpcm9uX2dldAAEA2VudgtfX2N4YV90aHJvdwADA2Vudg1fc2V0aXRpbWVyX2pzABQDZW52I19lbXNjcmlwdGVuX3J1bnRpbWVfa2VlcGFsaXZlX2NsZWFyAAYWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQlwcm9jX2V4aXQAAgPnAeUBBgYLCwsDAwIABQAFAAkCAAACAgEABAcHAAECAQABAQQAAwMDAwIBAQEVFgcDAwQJBQMICwUFBQgFBAgJFwoDBwIBAAQDBwEEAQEECQgJCRgIGQMBAwICAwECAQgFAwgBBgsAAgYGBgAEBAUCAQMABAEABAQABAAFBAAGDQEGAAIGEQACAQACARIDDAAKAQACAwMAAgIJAAIDAAIDAAIBAAEAAgAABQUABAUEAAYCAAsAAAYOBQkDAAMaChsBEgQEAA4GBgACAAICAAAAAgUFAQwHCgcDBwoMAgAGDQ0RHB0NAB4CAgQFAXABQEAFBwEBggKAgAIGEgN/AUHA+wcLfwFBAAt/AUEACwfqBzEGbWVtb3J5AgARX193YXNtX2NhbGxfY3RvcnMADw9jaHJvbWFwcmludF9uZXcAsAEQY2hyb21hcHJpbnRfZnJlZQCxARVjaHJvbWFwcmludF9nZXRfZGVsYXkAsgEYY2hyb21hcHJpbnRfZ2V0X2RlbGF5X21zALMBEWNocm9tYXByaW50X3N0YXJ0ALQBEGNocm9tYXByaW50X2ZlZWQAtQESY2hyb21hcHJpbnRfZmluaXNoALYBG2Nocm9tYXByaW50X2dldF9maW5nZXJwcmludAC3AR9jaHJvbWFwcmludF9nZXRfcmF3X2ZpbmdlcnByaW50ALgBJGNocm9tYXByaW50X2dldF9yYXdfZmluZ2VycHJpbnRfc2l6ZQC5AR1jaHJvbWFwcmludF9jbGVhcl9maW5nZXJwcmludAC6AQZmZmx1c2gA8AETX2Vtc2NyaXB0ZW5fdGltZW91dADxAQZzdHJkdXAAfQhzdHJlcnJvcgCuAQdzdHJuZHVwAH4GX1pkYVB2AHoHX1pkYVB2bQB/B19aZGxQdm0AfwVfWm5hagCAARRfWm5halN0MTFhbGlnbl92YWxfdACBAQVfWm53agCAARRfWm53alN0MTFhbGlnbl92YWxfdACBAQ1fX2xpYmNfY2FsbG9jAHcLX19saWJjX2ZyZWUAeg1fX2xpYmNfbWFsbG9jAHYOX19saWJjX3JlYWxsb2MAeAZjYWxsb2MAdxllbXNjcmlwdGVuX2J1aWx0aW5fY2FsbG9jAHcXZW1zY3JpcHRlbl9idWlsdGluX2ZyZWUAehllbXNjcmlwdGVuX2J1aWx0aW5fbWFsbG9jAHYaZW1zY3JpcHRlbl9idWlsdGluX3JlYWxsb2MAeARmcmVlAHoGbWFsbG9jAHYLbWFsbG9jX3NpemUAgwESbWFsbG9jX3VzYWJsZV9zaXplAIMBB3JlYWxsb2MAeAhyZWFsbG9jZgCCARVlbXNjcmlwdGVuX3N0YWNrX2luaXQAEBllbXNjcmlwdGVuX3N0YWNrX2dldF9mcmVlABEZZW1zY3JpcHRlbl9zdGFja19nZXRfYmFzZQASGGVtc2NyaXB0ZW5fc3RhY2tfZ2V0X2VuZAATGV9lbXNjcmlwdGVuX3N0YWNrX3Jlc3RvcmUAvAEXX2Vtc2NyaXB0ZW5fc3RhY2tfYWxsb2MAvQEcZW1zY3JpcHRlbl9zdGFja19nZXRfY3VycmVudAC+ASJfX2N4YV9pbmNyZW1lbnRfZXhjZXB0aW9uX3JlZmNvdW50AOcBGV9faW5kaXJlY3RfZnVuY3Rpb25fdGFibGUBAAl9AQBBAQs/HygsN3WQAasBjQGOAYsBkQGSAZMBlAGVAZYBnQGeAZ8BoQGiAaABpQGmAacBqAGpAaoBqwGsAa0B0wHKAcsBvwHDAcIBzwHQAdYB1QHXAdkB1wHaAasBrAEWFtwB5gHlAeQB2wHfAeEB4gHpAdQB1wHYAfMB8gEMApgCCsOZBeUB/wQBBH9BwPsHJAJBwPsDJAEDQCAAQQR0IgFB1LsBaiABQdC7AWoiAjYCACABQdi7AWogAjYCACAAQQFqIgBBwABHDQALQTAQGRojAEEQayIAJAACQCAAQQxqIABBCGoQCQ0AQYz6AyAAKAIMQQJ0QQRqEHYiATYCACABRQ0AIAAoAggQdiIBBEBBjPoDKAIAIgIgACgCDEECdGpBADYCACACIAEQCkUNAQtBjPoDQQA2AgALIABBEGokAEHgoAEoAgBFBEBB4KABQQE2AgBB2KABQcygATYCAEHsoAEQIEHgoAFB0KABEHE2AgBB5KABQdCgARBxNgIAQeigAUHQoAEQcTYCAAtBsPADQQE6AABBACEAIwBBEGsiASQAQfTDAUH0wwEoAgAiAkEBajYCAEGAgAIgAiACQYCAAk8bQYDEAWoiAkEAOgAAQYDEAS0AAARAQYDEARADCyACQQo6AABB4MMBQQI2AgADQCAAQRRsIgNB8JsBaiECIANB9JsBaigCAEUEQCACECkLIAIoAgwhAyABIAIoAgA2AgQgASADNgIAIAFB8BBB8BBB8x8gAEEXRhsgAEEJRhs2AghBshcgARAqIABBAWoiAEEdRw0AC0HwngEoAgBFBEBB7J4BECkLQbSgAUHsngEoAgA2AgBBhJ8BKAIARQRAQYCfARApC0G4oAFBgJ8BKAIANgIAIAFBEGokAEG48AMtAABFBEBBuPADQQE6AABBzKABQdCgATYCAAsQdEHwoQEtAABBAUYEQEHsoAEQIAtBhPkDQYDAADYCAEH8+ANBwPsHNgIAQeD4A0EqNgIAQaj5A0Hs+QM2AgBBgPkDQYCABDYCAAsOAEHA+wckAkHA+wMkAQsHACMAIwFrCwQAIwILBAAjAQvwAgICfwF+AkAgAkUNACAAIAE6AAAgACACaiIDQQFrIAE6AAAgAkEDSQ0AIAAgAToAAiAAIAE6AAEgA0EDayABOgAAIANBAmsgAToAACACQQdJDQAgACABOgADIANBBGsgAToAACACQQlJDQAgAEEAIABrQQNxIgRqIgMgAUH/AXFBgYKECGwiADYCACADIAIgBGtBfHEiAmoiAUEEayAANgIAIAJBCUkNACADIAA2AgggAyAANgIEIAFBCGsgADYCACABQQxrIAA2AgAgAkEZSQ0AIAMgADYCGCADIAA2AhQgAyAANgIQIAMgADYCDCABQRBrIAA2AgAgAUEUayAANgIAIAFBGGsgADYCACABQRxrIAA2AgAgAiADQQRxQRhyIgFrIgJBIEkNACAArUKBgICAEH4hBSABIANqIQEDQCABIAU3AxggASAFNwMQIAEgBTcDCCABIAU3AwAgAUEgaiEBIAJBIGsiAkEfSw0ACwsLhQQBAn8gAkGABE8EQCACBEAgACABIAL8CgAACw8LIAAgAmohAwJAIAAgAXNBA3FFBEACQCAAQQNxRQRAIAAhAgwBCyACRQRAIAAhAgwBCyAAIQIDQCACIAEtAAA6AAAgAUEBaiEBIAJBAWoiAkEDcUUNASACIANJDQALCyADQXxxIQACQCADQcAASQ0AIAIgAEFAaiIESw0AA0AgAiABKAIANgIAIAIgASgCBDYCBCACIAEoAgg2AgggAiABKAIMNgIMIAIgASgCEDYCECACIAEoAhQ2AhQgAiABKAIYNgIYIAIgASgCHDYCHCACIAEoAiA2AiAgAiABKAIkNgIkIAIgASgCKDYCKCACIAEoAiw2AiwgAiABKAIwNgIwIAIgASgCNDYCNCACIAEoAjg2AjggAiABKAI8NgI8IAFBQGshASACQUBrIgIgBE0NAAsLIAAgAk0NAQNAIAIgASgCADYCACABQQRqIQEgAkEEaiICIABJDQALDAELIANBBEkEQCAAIQIMAQsgA0EEayIEIABJBEAgACECDAELIAAhAgNAIAIgAS0AADoAACACIAEtAAE6AAEgAiABLQACOgACIAIgAS0AAzoAAyABQQRqIQEgAkEE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GyEBQeTDASgCACECIAAEQCAAIAIgAREBAAsgA0HQAGogAiABEQEAC0GBxANBADoAAAsgA0HQBGokAAukAQECfyMAQRBrIgMkACADIAI2AgxBnJwBKAIARQRAQZicARApCwJAAkBBmJwBKAIADQBB9JsBKAIARQRAQfCbARApC0HwmwEoAgBFDQFBtKABKAIAQQBIDQBBhMQDQYTEAygCACIEQQFqNgIAIARBtKABKAIASg0BC0GwEiABIAIQMgtB7MMBKAIAIgEEQCAAQfDDASgCACABEQEACyADQRBqJAALTAACQCAAQcDqA0kNACAAQfDvA08NACAAIAApAwhCAXw3AwggACAAKQMAQgF8NwMADwsgACAAKQMIQgF8NwMIIAAgACkDAEIBfDcDAAufAQEEfiABBEAgAa0hAwJAIABBwOoDSQ0AIABB8O8DTw0AIAAgACkDGCADfCIFNwMYIAApAxAhAgNAIAIgBVMEQCAAIAUgACkDECIEIAIgBFEbNwMQIAIgBFIgBCECDQELCyAAIAApAwAgA3w3AwAPCyAAIAApAxggA3wiAjcDGCAAKQMQIAJTBEAgACACNwMQCyAAIAApAwAgA3w3AwALC6YBAQR+IAEEQCABrSEDAkAgAEHA6gNJDQAgAEHw7wNPDQAgACAAKQMYIgIgA303AxggAiADfSEFIAApAxAhAgNAIAIgBVMEQCAAIAUgACkDECIEIAIgBFEbNwMQIAIgBFIgBCECDQELCyAAIAApAwggA3w3AwgPCyAAIAApAxggA30iAjcDGCAAKQMQIAJTBEAgACACNwMQCyAAIAApAwggA3w3AwgLC6kBAQJ/AkAgAEUNACABRQ0AIAAtAAAiAkUNAANAIAEoAgwiAyABKAIQTwRAIAEoAgggA2pBADoAACABKAIAIAEoAgQgASgCCBAwQQAhAwsgASADQQFqNgIMIAEoAgggA2ogAjoAACACQQpGBEAgASgCCCABKAIMakEAOgAAIAEoAgAgASgCBCABKAIIEDAgAUEANgIMCyAALQABIQIgAEEBaiEAIAINAAsLC+UDAgF/AX4jAEGwAWsiBSQAIAUgATYCgAEgA0GYESAFQYABahAxAkAgAkIAUgRAIAApAxAhBgJAIAJCAFUEQCAGQgEgA0EAEDkgACkDAEIBIANBABA5IAApAwhCASADQQAQ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ASAJIAtxBH8gASABIAlwawUgAUEAIAlrcQshASAAIANHBEAgACAKIAIQOwsgAyEAIAEgCmoiCSAGRg0AIAAgAWogBiAJayACEDsLIABFDQELIAUtAHshASAFLQB6IQcgBUH8AGpBAEEUEBQgBUEDNgKMASAFIAc6AIoBIAUgAjoAiQEgBSABOgCIASAEQQM2AhAgBCAFKQJ8NwIAIAQgBSkChAE3AgggBCAINgIEIAQgAzYCACAAIQcLIAVBkAFqJAAgBwu6AQEDfyMAQSBrIgMkACACBEAgAkEAOgAAC0Gg6wMgARA1QcDuAxA0AkAgAEUNACABRQ0AQbygASgCACIEQQFrIgUgACABamohAQJ/IAQgBXFFBEAgAUEAIARrIgRxIQEgACAEcQwBCyABIAEgBHBrIQEgACAAIARwawshACABIABrIgFBAEwNACADQQA6AB8gA0EAOgAfAkAgAkUNACADLQAfQQFxRQ0AIAJBAToAAAsLIANBIGokAEEBC44BAQN/IwBBEGsiAyQAAkAgAEUNACABRQ0AIAAgAWohASAAQbygASgCACIEQQFrIgVqIQACfyAEIAVxRQRAQQAgBGsiBCABcSEBIAAgBHEMAQsgASABIARwayEBIAAgACAEcGsLIQAgASAAayIBQQBMDQAgAkGAAWogARA1IAJBkARqEDQMAAsgA0EQaiQAC+sBAQJ/IwBBIGsiBCQAAkBBDxArQQBIDQAgA0GgBGoQNCADQaABaiABEDUCQEEFEC9FDQBBsPADLQAAQX9zQQFxDQAgBEEBOgAfQaDrAyABEDYCQCAARQ0AIAFFDQAgACABaiEBIABBvKABKAIAIgJBAWsiA2ohAAJ/IAIgA3FFBEBBACACayICIAFxIQEgACACcQwBCyABIAEgAnBrIQEgACAAIAJwawshACABIABrIgFBAEwNACAEQQE6AB8gBEEAOgAfDAALIAQtAB8hBQwBCyACRQ0AIAAgASADEEALIARBIGokACAFQQFxC0oBAn8jAEEQayIBJABBmMQDKAIAIgBFBEBBEBArIgBBAEwEQEEBIQALQZjEAyAANgIAIAEgADYCAEG0FiABECoLIAFBEGokACAAC0sAIAAgAkEDdkH8////AXFqIgAgACgCACIAAn9BfyABQR9LDQAaQQAgAUUNABpBfyABdEF/cyACdAsi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//8HWRunIgNB6AduIgY2AgQgACADIAZB6AdsazYCCCABQe8RIAAQMUIBIAFBugwQOSACBEAgAUHkEUEAEDEgAq1CASABQboMEDkLIABBnAJqQfIfQQAQMSAAQeAEaiQACyALQdigASgCADYCAEHaEyALECpBsPADQQA6AAALIAtBEGokAAtfAQN/QcygASgCACEBIABBgARNBEAgASAAQQNqQXxxaigCuAEiAigCECIDRQRAIAEgAEEAQQAQag8LIAIgAygCADYCECACIAIvARhBAWo7ARggAw8LIAEgAEEAQQAQagukAQICfwF+QcygASgCACEDAkAgAEEBRwRAIACtIAGtfiIEQiCIpw0BIASnIQELIAFBgARNBEAgAyABQQNqQXxxaigCuAEiACgCECICRQRAIAMgAUEBQQAQag8LIAAgAigCADYCECAAIAAvARhBAWo7ARggAC0AD0EBcQRAIAJBADYCACACDwsgAkEAIAAoAhwQFCACDwsgAyABQQFBABBqIQILIAILDwBBzKABKAIAIAAgARB5C+ECAQR/AkAgAUEAIAFBAWtBgICAfnEiBBtFDQAgBCABIARrQQ92QThsaiIDIAMoAnhrIgVB9ABqIQMCfyAFLQCCAUECcUUEQCADKAIcDAELIAMgARCEAQsiBSACQQFrTQ0AIAIgBUEBdkkNACABDwsCfwJAAkAgAkGABEsNACAAIAJBA2pBfHFqKAK4ASIGKAIQIgNFDQAgBiADKAIANgIQIAYgBi8BGEEBajsBGAwBC0EAIAAgAkEAQQAQaiIDRQ0BGgsgAkUEQCADQQA6AAALAkAgAUUNACADIAEgAiAFIAIgBUkbEBUgBEUNACAEIAEgBGtBD3ZBOGxqIgAgACgCeGtB9ABqIQAgBCgCcEHMoAFGBEAgAC0ADkUEQCABIAAoAhQ2AgAgACABNgIUIAAgAC8BGEEBayIBOwEYIAFB//8DcQ0CIAAQaAwCCyAAIAEQewwBCyAAIAQgARB8CyADCwuLAQECfwJAIABFDQAgAEEBa0GAgIB+cSICRQ0AIAIgACACa0EPdkE4bGoiASABKAJ4a0H0AGohASACKAJwQcygAUYEQCABLQAORQRAIAAgASgCFDYCACABIAA2AhQgASABLwEYQQFrIgA7ARggAEH//wNxDQIgARBoDwsgASAAEHsPCyAB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IgRJBEAgASAHOgAAIAFBAWohAQwBCyABIAAoAgAiA2siAUEBaiICQQBIDQUgAUH/////ByAEIANrIgRBAXQiBSACIAIgBUkbIARB/////wNPGyIFBH8gBRDAAQVBAAsiAmoiCSAHOgAAIAEEQCACIAMgAfwKAAALIAAgAiAFajYCCCAAIAlBAWoiATYCBCAAIAI2AgAgA0UNACADIAQQfwsgACABNgIECyAGIQILIAZBAWohBiAIQQF2IQEgCEEBSw0ACwsgACgCBCIBIAAoAggiA0kEQCABQQA6AAAgACABQQFqNgIEDwsgASAAKAIAIgFrIgJBAWoiCEEASA0AQQAhBkH/////ByADIAFrIgNBAXQiByAIIAcgCEsbIANB/////wNPGyIIBEAgCBDAASEGCyACIAZqIgdBADoAACACBEAgBiABIAL8CgAACyAAIAYgCGo2AgggACAHQQFqIgI2AgQgACAGNgIAIAEEQCABIAMQfwsgACACNgIEDwsQjwEAC54UAgt/AnxBzAAQwAEiBSAANgIAAn8CQAJAAkACQAJAAkAgAA4FAAECAwQFC0EkEMABEIgBDAULQSQQwAEiAEEANgIYIABBADsBFCAAQpCAgICAAjcCACAAQoCggICw1QI3AhwgAEEFNgIMIABB0Ds2AgggAEGgOzYCECAADAQLQSQQwAEiAEEANgIgIABBATsBFCAAQpCAgICAAjcCACAAQoCAgICAgAQ3AhggAEEFNgIMIABB0MAANgIIIABBoDs2AhAgAAwDC0EkEMABIgBCkICAgIACNwIAIABBqxU2AiAgAEEFNgIMIABCsoCAgICABDcCGCAAQYACOwEUIABBoDs2AhAgAEHQOzYCCCAADAILQSQQwAEiAEEANgIYIABBADsBFCAAQpCAgICAAjcCACAAQoCQgICAgAE3AhwgAEEFNgIMIABB0Ds2AgggAEGgOzYCECAAIQELIAELIQhBACEAQQAhASAFQYC4ATYCBCAIRQRAQSQQwAEQiAEhCAtBNBDAASECIAgoAgghAyACIAgoAgAiBDYCCCACIAM2AgQgAkIANwIUIAJCgICAgJAgNwIMIAJCADcCHCACQgA3AiQgAkIANwIsIAJBuLYBNgIAIAQEQCAEQQRPBEAgBEF8cSEKA0AgASADIABBKGxqKAIMIgkgASAJSxsiASAD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AwghByMAQSBrIggkACAHQv///////z+DIQQCfiAHQjCIQv//AYMiA6ciCkGB+ABrQf0PTQRAIARCBIYgAkI8iIQhAyAKQYD4AGutIQQCQCACQv//////////D4MiAkKBgICAgICAgAhaBEAgA0IBfCEDDAELIAJCgICAgICAgIAIUg0AIANCAYMgA3whAwtCACADIANC/////////wdWIgAbIQIgAK0gBHwMAQsCQCACIASEUA0AIANC//8BUg0AIARCBIYgAkI8iIRCgICAgICAgASEIQJC/w8MAQsgCkH+hwFLBEBCACECQv8PDAELQYD4AEGB+AAgA1AiARsiACAKayIJQfAASgRAQgAhAkIADAELIAIhAyAEIARCgICAgICAwACEIAEbIgUhBgJAQYABIAlrIgFBwABxBEAgAiABQUBqrYYhBkIAIQMMAQsgAUUNACAGIAGtIgSGIANBwAAgAWutiIQhBiADIASGIQMLIAggAzcDECAIIAY3AxgCQCAJQcAAcQRAIAUgCUFAaq2IIQJCACEFDAELIAlFDQAgBUHAACAJa62GIAIgCa0iA4iEIQIgBSADiCEFCyAIIAI3AwAgCCAFNwMIIAgpAwhCBIYgCCkDACIDQjyIhCECAkAgACAKRyAIKQMQIAgpAxiEQgBSca0gA0L//////////w+DhCIDQoGAgICAgICACFoEQCACQgF8IQIMAQsgA0KAgICAgICAgAhSDQAgAkIBgyACfCECCyACQoCAgICAgIAIhSACIAJC/////////wdWIgAbIQIgAK0LIQMgCEEgaiQAIAdCgICAgICAgICAf4MgA0I0hoQgAoS/OQMAC38CAX8BfiAAvSIDQjSIp0H/D3EiAkH/D0cEfCACRQRAIAEgAEQAAAAAAAAAAGEEf0EABSAARAAAAAAAAPBDoiABEMwBIQAgASgCAEFAags2AgAgAA8LIAEgAkH+B2s2AgAgA0L/////////h4B/g0KAgICAgICA8D+EvwUgAAsLvAEBAX8gAUEARyECAkACQAJAIABBA3FFDQAgAUUNAANAIAAtAABFDQIgAUEBayIBQQBHIQIgAEEBaiIAQQNxRQ0BIAENAAsLIAJFDQECQCAALQAARQ0AIAFBBEkNAANAQYCChAggACgCACICayACckGAgYKEeHFBgIGChHhHDQIgAEEEaiEAIAFBBGsiAUEDSw0ACwsgAUUNAQsDQCAALQAARQRAIAAPCyAAQQFqIQAgAUEBayIBDQALC0EAC4ECAAJAIAFB/wBNDQACQEGo+QMoAgAoAgBFBEAgAUGAf3FBgL8DRg0CDAELIAFB/w9NBEAgACABQT9xQYABcjoAASAAIAFBBnZBwAFyOgAAQQIPCyABQYBAcUGAwANHIAFBgLADT3FFBEAgACABQT9xQYABcjoAAiAAIAFBDHZB4AFyOgAAIAAgAUEGdkE/cUGAAXI6AAFBAw8LIAFBgIAEa0H//z9NBEAgACABQT9xQYABcjoAAyAAIAFBEnZB8AFyOgAAIAAgAUEGdkE/cUGAAXI6AAIgACABQQx2QT9xQYABcjoAAUEEDwsLQcC7AUEZNgIAQX8PCyAAIAE6AABBAQscACAAKAI8EAYiAAR/QcC7ASAANgIAQX8FQQALC0sBAX8gACgCPCMAQRBrIgAkACABIAJB/wFxIABBCGoQByICBH9BwLsBIAI2AgBBfwVBAAshAiAAKQMIIQEgAEEQaiQAQn8gASACGwv7AQMDfwR8AX4jAEEQayIBJAAgAUIANwMIIAFCADcDAEEcIQACQCABKAIIIgJB/5Pr3ANLDQAgASkDACIHQgBTDQAgB7pEAAAAAABAj0CiIAK4RAAAAACAhC5Bo6AhBRACIgYhAwNAQQAhAANAAkAgAEEDdEGg+gNqIgIrAwAiBEQAAAAAAAAAAGENACADRAAAAAAAAAAAYQRAEAIhAyACKwMAIQQLIAMgBGZFDQAgACADEPEBCyAAQQFqIgBBA0cNAAsQAiIDIAahIAVjDQALQQAhAAtBACAAayIAQYFgTwR/QcC7AUEAIABrNgIAQQAFIAALGiABQRBqJAALBQAQCAALMgECfyAAQYyDATYCACAAKAIEQQxrIgEgASgCCEEBayICNgIIIAJBAEgEQCABEHoLIAALCwAgABDTAUEIEH8LBwAgACgCBAsOACAAENMBGiAAQQgQfwsIACAAQQQQfwsFAEGPDQsFAEGXEAsFAEHgDQsIACAAQQwQfwv7BAEGfyMAQdAAayIEJAACQAJ/QQEgACABQQAQ3QENABpBACABRQ0AGiMAQRBrIgUkACAFIAEoAgAiA0EIaygCACIGNgIMIAUgASAGajYCBCAFIANBBGsoAgA2AgggBSgCBCEHAkAgBSgCCCIDQayBAUEAEN0BBEBBACAHIAUoAgwbIQMMAQsgAyEGIwBBQGoiAyQAIAEgB04EQCADQayBATYCDCADIAY2AgQgAyABNgIIIANBEGpBAEEk/AsAIANBADYCPCADQoGAgICAgICAATcCNCAGIANBBGogByAHQQFBACAGKAIAKAIUEQwAIAFBACADKAIcGyEICyADQUBrJAAgCCIDDQAjAEFAaiIDJAAgA0H8gAE2AgwgAyABNgIIIANBrIEBNgIEQQAhASADQRBqQQBBK/wLACADQQA2AjwgA0EBOgA7IAYgA0EEaiAHQQFBACAGKAIAKAIYEQoAAkACQAJAIAMoAigOAgABAgsgAygCGEEAIAMoAiRBAUYbQQAgAygCIEEBRhtBACADKAIsQQFGGyEBDAELIAMoAhxBAUcEQCADKAIsDQEgAygCIEEBRw0BIAMoAiRBAUcNAQsgAygCFCEBCyADQUBrJAAgASEDCyAFQRBqJABBACADRQ0AGiACKAIAIgFFDQEgBEEYakEAQTj8CwAgBEEBOgBLIARBfzYCICAEIAA2AhwgBCADNgIUIARBATYCRCADIARBFGogAUEBIAMoAgAoAhwRBwAgBCgCLCIAQQFGBEAgAiAEKAIkNgIACyAAQQFGCyAEQdAAaiQADwsgBEH0EDYCCCAEQecDNgIEIARBzww2AgBBswwgBBDeAQALdAEBfyACRQRAIAAoAgQgASgCBEYPCyAAIAFGBEBBAQ8LIAEoAgQiAi0AACEBAkAgACgCBCIDLQAAIgBFDQAgACABRw0AA0AgAi0AASEBIAMtAAEiAEUNASACQQFqIQIgA0EBaiEDIAAgAUYNAAsLIAAgAUYLwAQBA38jAEEQayICJABBrLoBKAIAGkHCEkELQeC5ARAYGiACIAE2AgwjAEHQAWsiAiQAIAIgATYCzAEgAkGgAWoiAUEAQSj8CwAgAiACKALMATYCyAECQEEAIAAgAkHIAWogAkHQAGogARDEAUEASA0AQay6ASgCAEEASEHguQFB4LkBKAIAIgRBX3E2AgACfwJAAkBBkLoBKAIARQRAQZC6AUHQADYCAEH8uQFBADYCAEHwuQFCADcDAEGMugEoAgAhA0GMugEgAjYCAAwBC0HwuQEoAgANAQtBf0HguQEQFw0BGgtB4LkBIAAgAkHIAWogAkHQAGogAkGgAWoQxAELIQAgAwR/QeC5AUEAQQBBhLoBKAIAEQUAGkGQugFBADYCAEGMugEgAzYCAEH8uQFBADYCAEH0uQEoAgAaQfC5AUIANwMAQQAFIAALGkHguQFB4LkBKAIAIARBIHFyNgIADQALIAJB0AFqJAACQAJAQay6ASgCACIAQQBOBEAgAEUNAUHg+AMoAgAgAEH/////A3FHDQELAkBBsLoBKAIAQQpGDQBB9LkBKAIAIgBB8LkBKAIARg0AQfS5ASAAQQFqNgIAIABBCjoAAAwCCxCJAQwBC0GsugFBrLoBKAIAIgBB/////wMgABs2AgACQAJAQbC6ASgCAEEKRg0AQfS5ASgCACIAQfC5ASgCAEYNAEH0uQEgAEEBajYCACAAQQo6AAAMAQsQiQELQay6ASgCABpBrLoBQQA2AgALENIBAAs5ACAAIAEoAgggBRDdAQRAIAEgAiADIAQQ4AEPCyAAKAIIIgAgASACIAMgBCAFIAAoAgAoAhQRDAALmgEAIABBAToANQJAIAIgACgCBEcNACAAQQE6ADQCQCAAKAIQIgJFBEAgAEEBNgIkIAAgAzYCGCAAIAE2AhAgA0EBRw0CIAAoAjBBAUYNAQwCCyABIAJGBEAgACgCGCICQQJGBEAgACADNgIYIAMhAgsgACgCMEEBRw0CIAJBAUYNAQwCCyAAIAAoAiRBAWo2AiQLIABBAToANgsLjQIAIAAgASgCCCAEEN0BBEACQCACIAEoAgRHDQAgASgCHEEBRg0AIAEgAzYCHAsPCwJAIAAgASgCACAEEN0BBEACQCABKAIQIAJHBEAgAiABKAIURw0BCyADQQFHDQIgAUEBNgIgDwsgASADNgIgAkAgASgCLEEERg0AIAFBADsBNCAAKAIIIgAgASACIAJBASAEIAAoAgAoAhQRDAAgAS0ANUEBRgRAIAFBAzYCLCABLQA0RQ0BDAMLIAFBBDYCLAsgASACNgIUIAEgASgCKEEBajYCKCABKAIkQQFHDQEgASgCGEECRw0BIAFBAToANg8LIAAoAggiACABIAIgAyAEIAAoAgAoAhgRCgALCzMAIAAgASgCCEEAEN0BBEAgASACIAMQ4wEPCyAAKAIIIgAgASACIAMgACgCACgCHBEHAAt2AQF/IAAoAiQiA0UEQCAAIAI2AhggACABNgIQIABBATYCJCAAIAAoAjg2AhQPCwJAAkAgACgCFCAAKAI4Rw0AIAAoAhAgAUcNACAAKAIYQQJHDQEgACACNgIYDwsgAEEBOgA2IABBAjYCGCAAIANBAWo2AiQLCxoAIAAgASgCCEEAEN0BBEAgASACIAMQ4wELC6kBACAAIAEoAgggBBDdAQRAAkAgAiABKAIERw0AIAEoAhxBAUYNACABIAM2AhwLDwsCQCAAIAEoAgAgBBDdAUUNAAJAIAEoAhAgAkcEQCACIAEoAhRHDQELIANBAUcNASABQQE2AiAPCyABIAI2AhQgASADNgIgIAEgASgCKEEBajYCKAJAIAEoAiRBAUcNACABKAIYQQJHDQAgAUEBOgA2CyABQQQ2AiwLCxwAIAAgASgCCCAFEN0BBEAgASACIAMgBBDgAQsLGgAgAARAQfS6ASgCABEGAEGUD0EAEN4BAAsLDgAgAEHQAGoQdkHQAGoLCwBB9Q1BABDeAQALpAEDAXwBfgF/IAC9IgJCNIinQf8PcSIDQbIITQR8IANB/QdNBEAgAEQAAAAAAAAAAKIPCwJ8IACZIgBEAAAAAAAAMEOgRAAAAAAAADDDoCAAoSIBRAAAAAAAAOA/ZARAIAAgAaBEAAAAAAAA8L+gDAELIAAgAaAiACABRAAAAAAAAOC/ZUUNABogAEQAAAAAAADwP6ALIgCaIAAgAkIAUxsFIAALC8IBAgF8An8jAEEQayICJAACfCAAvUIgiKdB/////wdxIgNB+8Ok/wNNBEBEAAAAAAAA8D8gA0GewZryA0kNARogAEQAAAAAAAAAABDsAQwBCyAAIAChIANBgIDA/wdPDQAaIAAgAhDtASEDIAIrAwghACACKwMAIQECQAJAAkACQCADQQNxQQFrDgMBAgMACyABIAAQ7AEMAwsgASAAQQEQ7gGaDAILIAEgABDsAZoMAQsgASAAQQEQ7gELIAJBEGokAAuSAQEDfEQAAAAAAADwPyAAIACiIgJEAAAAAAAA4D+iIgOhIgREAAAAAAAA8D8gBKEgA6EgAiACIAIgAkSQFcsZoAH6PqJEd1HBFmzBVr+gokRMVVVVVVWlP6CiIAIgAqIiAyADoiACIAJE1DiIvun6qL2iRMSxtL2e7iE+oKJErVKcgE9+kr6goqCiIAAgAaKhoKALyhYDE38EfAF+IwBBMGsiCSQAAkACQAJAIAC9IhlCIIinIgNB/////wdxIgZB+tS9gARNBEAgA0H//z9xQfvDJEYNASAGQfyyi4AETQRAIBlCAFkEQCABIABEAABAVPsh+b+gIgBEMWNiGmG00L2gIhU5AwAgASAAIBWhRDFjYhphtNC9oDkDCEEBIQMMBQsgASAARAAAQFT7Ifk/oCIARDFjYhphtNA9oCIVOQMAIAEgACAVoUQxY2IaYbTQPaA5AwhBfyEDDAQLIBlCAFkEQCABIABEAABAVPshCcCgIgBEMWNiGmG04L2gIhU5AwAgASAAIBWhRDFjYhphtOC9oDkDCEECIQMMBAsgASAARAAAQFT7IQlAoCIARDFjYhphtOA9oCIVOQMAIAEgACAVoUQxY2IaYbTgPaA5AwhBfiEDDAMLIAZBu4zxgARNBEAgBkG8+9eABE0EQCAGQfyyy4AERg0CIBlCAFkEQCABIABEAAAwf3zZEsCgIgBEypSTp5EO6b2gIhU5AwAgASAAIBWhRMqUk6eRDum9oDkDCEEDIQMMBQsgASAARAAAMH982RJAoCIARMqUk6eRDuk9oCIVOQMAIAEgACAVoUTKlJOnkQ7pPaA5AwhBfSEDDAQLIAZB+8PkgARGDQEgGUIAWQRAIAEgAEQAAEBU+yEZwKAiAEQxY2IaYbTwvaAiFTkDACABIAAgFaFEMWNiGmG08L2gOQMIQQQhAwwECyABIABEAABAVPshGUCgIgBEMWNiGmG08D2gIhU5AwAgASAAIBWhRDFjYhphtPA9oDkDCEF8IQMMAwsgBkH6w+SJBEsNAQsgAESDyMltMF/kP6JEAAAAAAAAOEOgRAAAAAAAADjDoCIW/AIhAwJAIAAgFkQAAEBU+yH5v6KgIhUgFkQxY2IaYbTQPaIiF6EiGEQYLURU+yHpv2MEQCADQQFrIQMgFkQAAAAAAADwv6AiFkQxY2IaYbTQPaIhFyAAIBZEAABAVPsh+b+ioCEVDAELIBhEGC1EVPsh6T9kRQ0AIANBAWohAyAWRAAAAAAAAPA/oCIWRDFjYhphtNA9oiEXIAAgFkQAAEBU+yH5v6KgIRULIAEgFSAXoSIAOQMAAkAgBkEUdiICIAC9QjSIp0H/D3FrQRFIDQAgASAVIBZEAABgGmG00D2iIgChIhggFkRzcAMuihmjO6IgFSAYoSAAoaEiF6EiADkDACACIAC9QjSIp0H/D3FrQTJIBEAgGCEVDAELIAEgGCAWRAAAAC6KGaM7oiIAoSIVIBZEwUkgJZqDezmiIBggFaEgAKGhIhehIgA5AwALIAEgFSAAoSAXoTkDCAwBCyAGQYCAwP8HTwRAIAEgACAAoSIAOQMAIAEgADkDCEEAIQMMAQsgCUEQaiIDQQhyIQQgGUL/////////B4NCgICAgICAgLDBAIS/IQBBASECA0AgAyAA/AK3IhU5AwAgACAVoUQAAAAAAABwQaIhACACQQAhAiAEIQMNAAsgCSAAOQMgQQIhAwNAIAMiAkEBayEDIAlBEGoiDiACQQN0aisDAEQAAAAAAAAAAGENAAsCf0EAIQQjAEGwBGsiBSQAIAZBFHZBlghrIgNBA2tBGG0iB0EAIAdBAEobIg9BaGwgA2ohBkG0gwEoAgAiByACQQFqIgtBAWsiCGpBAE4EQCAHIAtqIQMgDyAIayECA0AgBUHAAmogBEEDdGogAkEASAR8RAAAAAAAAAAABSACQQJ0QcCDAWooAgC3CzkDACACQQFqIQIgBEEBaiIEIANHDQALCyAGQRhrIQpBACEDIAdBACAHQQBKGyEEIAtBAEwhDANAAkAgDARARAAAAAAAAAAAIQAMAQsgAyAIaiENQQAhAkQAAAAAAAAAACEAA0AgDiACQQN0aisDACAFQcACaiANIAJrQQN0aisDAKIgAKAhACACQQFqIgIgC0cNAAsLIAUgA0EDdGogADkDACADIARGIANBAWohA0UNAAtBLyAGayESQTAgBmshECAGQRlIIREgBkEZayETIAchAwNAIAUgA0EDdGorAwAhAEEAIQIgAyEEIANBAEoEQANAIAVB4ANqIAJBAnRqIABEAAAAAAAAcD6i/AK3IhVEAAAAAAAAcMGiIACg/AI2AgAgBSAEQQFrIgRBA3RqKwMAIBWgIQAgAkEBaiICIANHDQALCyAAIAoQlwEiACAARAAAAAAAAMA/opxEAAAAAAAAIMCioCIAIAD8AiIMt6EhAAJAAkACQAJ/IBFFBEAgA0ECdCAFaiICIAIoAtwDIgIgAiAQdSICIBB0ayIENgLcAyACIAxqIQwgBCASdQwBCyAKDQEgA0ECdCAFaigC3ANBF3ULIghBAEwNAgwBC0ECIQggAEQAAAAAAADgP2YNAEEAIQgMAQtBACECQQAhDUEBIQQgA0EASgRAA0AgBUHgA2ogAkECdGoiFCgCACEEAn8CQCAUIA0Ef0H///8HBSAERQ0BQYCAgAgLIARrNgIAQQEhDUEADAELQQAhDUEBCyEEIAJBAWoiAiADRw0ACwsCQCARDQBB////AyECAkACQCATDgIBAAILQf///wEhAgsgA0ECdCAFaiINIA0oAtwDIAJxNgLcAwsgDEEBaiEMIAhBAkcNAEQAAAAAAADwPyAAoSEAQQIhCCAEDQAgAEQAAAAAAADwPyAKEJcBoSEACwJAAkAgAEQAAAAAAAAAAGEEQEEAIQQgAyECIAMgB0wNAgNAIAVB4ANqIAJBAWsiAkECdGooAgAgBHIhBCACIAdKDQALIARFDQIDQCAKQRhrIQogBUHgA2ogA0EBayIDQQJ0aigCAEUNAAsMAQsCQCAAQRggBmsQlwEiAEQAAAAAAABwQWYEQCAFQeADaiADQQJ0aiAARAAAAAAAAHA+ovwCIgK3RAAAAAAAAHDBoiAAoPwCNgIAIANBAWohAyAGIQoMAQsgAPwCIQILIAVB4ANqIANBAnRqIAI2AgALRAAAAAAAAPA/IAoQlwEhACADQQBOBEAgAyECA0AgBSACIgRBA3RqIAAgBUHgA2ogAkECdGooAgC3ojkDACACQQFrIQIgAEQAAAAAAABwPqIhACAEDQALIAMhBANARAAAAAAAAAAAIQBBACECIAcgAyAEayIGIAYgB0obIgpBAE4EQANAIAJBA3RBkJkBaisDACAFIAIgBGpBA3RqKwMAoiAAoCEAIAIgCkcgAkEBaiECDQALCyAFQaABaiAGQQN0aiAAOQMAIARBAEogBEEBayEEDQALC0QAAAAAAAAAACEAIANBAE4EQCADIQIDQCACIgRBAWshAiAAIAVBoAFqIARBA3RqKwMAoCEAIAQNAAsLIAkgAJogACAIGzkDACAFKwOgASAAoSEAQQEhAiADQQBKBEADQCAAIAVBoAFqIAJBA3RqKwMAoCEAIAIgA0cgAkEBaiECDQALCyAJIACaIAAgCBs5AwggBUGwBGokACAMQQdxDAILQQEhAgNAIAIiBEEBaiECIAVB4ANqIAcgBGtBAnRqKAIARQ0ACyADIARqIQQDQCAFQcACaiADIAtqIghBA3RqIANBAWoiAyAPakECdEHAgwFqKAIAtzkDAEEAIQJEAAAAAAAAAAAhACALQQBKBEADQCAOIAJBA3RqKwMAIAVBwAJqIAggAmtBA3RqKwMAoiAAoCEAIAJBAWoiAiALRw0ACwsgBSADQQN0aiAAOQMAIAMgBEgNAAsgBCEDDAALAAshAyAJKwMAIQAgGUIAUwRAIAEgAJo5AwAgASAJKwMImjkDCEEAIANrIQMMAQsgASAAOQMAIAEgCSsDCDkDCAsgCUEwaiQAIAMLmQEBA3wgACAAoiIDIAMgA6KiIANEfNXPWjrZ5T2iROucK4rm5Vq+oKIgAyADRH3+sVfjHcc+okTVYcEZoAEqv6CiRKb4EBEREYE/oKAhBSAAIAOiIQQgAkUEQCAEIAMgBaJESVVVVVVVxb+goiAAoA8LIAAgAyABRAAAAAAAAOA/oiAEIAWioaIgAaEgBERJVVVVVVXFP6KgoQvKAQICfwF8IwBBEGsiASQAAkAgAL1CIIinQf////8HcSICQfvDpP8DTQRAIAJBgIDA8gNJDQEgAEQAAAAAAAAAAEEAEO4BIQAMAQsgAkGAgMD/B08EQCAAIAChIQAMAQsgACABEO0BIQIgASsDCCEAIAErAwAhAwJAAkACQAJAIAJBA3FBAWsOAwECAwALIAMgAEEBEO4BIQAMAwsgAyAAEOwBIQAMAgsgAyAAQQEQ7gGaIQAMAQsgAyAAEOwBmiEACyABQRBqJAAgAAvBAQEEfwJAA0AgAEUEQEEAIQFB2LkBKAIAIgAEQCAAEPABIQELQfC6ASgCACIARQ0CIAEgAnIhAgwBCwsgACgCTEEASCEDAkACQCAAKAIUIAAoAhxGDQAgAEEAQQAgACgCJBEFABogACgCFA0AQX8hASADRQ0BDAILIAAoAgQiASAAKAIIIgRHBEAgACABIARrrEEBIAAoAigRDgAaC0EAIQEgAEEANgIcIABCADcDECAAQgA3AgQgAw0BCwsgASACcgt7AQF/IABBA3RBoPoDakIANwMAIABEAAAAAAAAAAAQDBoCQEG4+gMoAgBBG0EaQQ4gAEEBRhsgAEECRhsiAEEBa3ZBAXEEQEG4+wNBuPsDKAIAQQEgAEEBa3RyNgIADAELIABBAnRB0JkBaigCACICBEAgACACEQIACwsLBgAQ0gEACw0AEA0gAEGAAWoQDgALC+qXAZgCAEGACAvzF3Jlc2VydmVfb3NfbWVtb3J5AGVhZ2VyX2NvbW1pdF9kZWxheQByZXNldF9kZWxheQBwdXJnZV9kZWxheQBkZWNvbW1pdF9leHRlbmRfZGVsYXkAcHVyZ2VfZXh0ZW5kX2RlbGF5AC0rICAgMFgweAAtMFgrMFggMFgtMHgrMHggMHgAYXJlbmFfcHVyZ2VfbXVsdABkZXN0cm95X29uX2V4aXQAYXJlbmFfZWFnZXJfY29tbWl0AGVhZ2VyX3JlZ2lvbl9jb21taXQAZGVwcmVjYXRlZF9zZWdtZW50X3Jlc2V0AGRlcHJlY2F0ZWRfcGFnZV9yZXNldABhYmFuZG9uZWRfcGFnZV9yZXNldAByZXNlcnZlX2h1Z2Vfb3NfcGFnZXNfYXQAc2VnbWVudHMAcmVzZXRfZGVjb21taXRzAHB1cmdlX2RlY29tbWl0cwByZXNldHMAc2hvd19zdGF0cwBoZWFwIHN0YXRzAHByb2Nlc3MAbWF4X2Vycm9ycwBzaG93X2Vycm9ycwBtbWFwcwBtYXhfd2FybmluZ3MAc2VhcmNoZXMAcHVyZ2VzAHJlc2VydmVfaHVnZV9vc19wYWdlcwBhbGxvd19sYXJnZV9vc19wYWdlcwB1c2VfbnVtYV9ub2RlcwBudW1hIG5vZGVzAHRocmVhZHMAYXJlbmFzACUyNHMAJWxkLiVsZCAlLTNzACVsbGQgICAlLTNzACUxMnMAJTExcwAlcyVzJXMAJXM6JWQ6ICVzAHZlY3RvcgAtY3Jvc3NvdmVyAC9lbXNkay9lbXNjcmlwdGVuL3N5c3RlbS9saWIvbGliY3h4YWJpL3NyYy9wcml2YXRlX3R5cGVpbmZvLmNwcABzdGQ6OmV4Y2VwdGlvbgBuYW4AcmV0cnlfb25fb29tAG1heF9zZWdtZW50X3JlY2xhaW0ALXJvbGxiYWNrAGV4cGFuZCAzMi1ieXRlIGsAaQBiYWRfYXJyYXlfbmV3X2xlbmd0aAB0ZXJtaW5hdGluZwBvc190YWcAaW5mAGFyZW5hX3Jlc2VydmUAdmVyYm9zZQAtbm9yZXRpcmUAbm9uZQBkZXByZWNhdGVkX3NlZ21lbnRfY2FjaGUAYWJhbmRvbmVkX3BhZ2VfcHVyZ2UAYWJhbmRvbmVkX3JlY2xhaW1fb25fZnJlZQByZXNlcnZlZABjb21taXR0ZWQAZWxhcHNlZAB0ZXJtaW5hdGVfaGFuZGxlciB1bmV4cGVjdGVkbHkgcmV0dXJuZWQALWFiYW5kb25lZAB0b3VjaGVkAC1jYWNoZWQAcHVyZ2VkAG5vdCBhbGwgZnJlZWQALWV4dGVuZGVkAGRpc2FsbG93X29zX2FsbG9jAGxpbWl0X29zX2FsbG9jAHN0ZDo6YmFkX2FsbG9jAGRpc2FsbG93X2FyZW5hX2FsbG9jAG1pbWFsbG9jXwAxO1RSVUU7WUVTO09OAE5BTgBNAEsARwBJTkYAMDtGQUxTRTtOTztPRkYAS2lCAGNhdGNoaW5nIGEgY2xhc3Mgd2l0aG91dCBhbiBvYmplY3Q/ACUxMHM6AC4AIChpbiBsYXJnZSBvcyBwYWdlcykAKG51bGwpAG91dCBvZiBtZW1vcnkgaW4gJ25ldycAJXN0aHJlYWQgMHgldHg6IAAsIGNvbW1pdDogACUxMHM6IHVzZXI6ICVsZC4lMDNsZCBzLCBzeXN0ZW06ICVsZC4lMDNsZCBzLCBmYXVsdHM6ICVsdSwgcnNzOiAAbWltYWxsb2M6IGVycm9yOiAAbGliYysrYWJpOiAAbWltYWxsb2M6IHdhcm5pbmc6IABtaW1hbGxvYzogAGNvdW50ICAgAGN1cnJlbnQgICAAdW5pdCAgIAB0b3RhbCAgIABwZWFrICAgAGZyZWVkICAgAGZhaWxlZCB0byByZXNlcnZlICV6dSBLaUIgbWVtb3J5CgBwcm9jZXNzIGluaXQ6IDB4JXp4CgBwcm9jZXNzIGRvbmU6IDB4JXp4CgB0cnlpbmcgdG8gZnJlZSBmcm9tIGFuIGludmFsaWQgYXJlbmEgYmxvY2s6ICVwLCBzaXplICV6dSwgbWVtaWQ6IDB4JXp4CgB0cnlpbmcgdG8gZnJlZSBmcm9tIGFuIGludmFsaWQgYXJlbmE6ICVwLCBzaXplICV6dSwgbWVtaWQ6IDB4JXp4CgAlMTBzOiAlNXp1CgBjb21taXQgbWFzayBvdmVyZmxvdzogaWR4PSV6dSBjb3VudD0lenUgc3RhcnQ9JXp4IGVuZD0lenggcD0weCVwIHNpemU9JXp1IGZ1bGxzaXplPSV6dQoAdHJ5aW5nIHRvIGZyZWUgYW4gYWxyZWFkeSBmcmVlZCBhcmVuYSBibG9jazogJXAsIHNpemUgJXp1CgBjb3JydXB0ZWQgdGhyZWFkLWZyZWUgbGlzdAoAdXNpbmcgJXpkIG51bWEgcmVnaW9ucwoAZmFpbGVkIHRvIHJlc2VydmUgJXp1IEdpQiBodWdlIHBhZ2VzCgAlMTBzOiAlMTFzICUxMXMgJTExcyAlMTFzICUxMXMgJTExcwoAcmVzZXJ2ZWQgJXp1IEtpQiBtZW1vcnklcwoAb3B0aW9uICclcyc6ICVsZCAlcwoAbWVtIHRyYWNraW5nOiAlcwoAJTEwczogJTVsZC4lMDNsZCBzCgAgIG9rCgAlMTBzOiAlNWxkLiVsZCBhdmcKAHNlY3VyZSBsZXZlbDogJWQKAGVudmlyb25tZW50IG9wdGlvbiBtaW1hbGxvY18lcyBoYXMgYW4gaW52YWxpZCB2YWx1ZS4KAGVudmlyb25tZW50IG9wdGlvbiAibWltYWxsb2NfJXMiIGlzIGRlcHJlY2F0ZWQgLS0gdXNlICJtaW1hbGxvY18lcyIgaW5zdGVhZC4KAGNhbm5vdCBkZWNvbW1pdCBPUyBtZW1vcnkgKGVycm9yOiAlZCAoMHgleCksIGFkZHJlc3M6ICVwLCBzaXplOiAweCV6eCBieXRlcykKAGNhbm5vdCBjb21taXQgT1MgbWVtb3J5IChlcnJvcjogJWQgKDB4JXgpLCBhZGRyZXNzOiAlcCwgc2l6ZTogMHglenggYnl0ZXMpCgBjYW5ub3QgcmVzZXQgT1MgbWVtb3J5IChlcnJvcjogJWQgKDB4JXgpLCBhZGRyZXNzOiAlcCwgc2l6ZTogMHglenggYnl0ZXMpCgB1bmFibGUgdG8gYWxsb2NhdGUgbWVtb3J5ICglenUgYnl0ZXMpCgBhbGxvY2F0aW9uIHJlcXVlc3QgaXMgdG9vIGxhcmdlICglenUgYnl0ZXMpCgB1bmFibGUgdG8gYWxsb2NhdGUgdGhyZWFkIGxvY2FsIGhlYXAgbWV0YWRhdGEgKCV6dSBieXRlcykKAHVuYWJsZSB0byBmcmVlIE9TIG1lbW9yeSAoZXJyb3I6ICVkICgweCV4KSwgc2l6ZTogMHglenggYnl0ZXMsIGFkZHJlc3M6ICVwKQoAbnVtYSBub2RlICVpOiByZXNlcnZlZCAlenUgR2lCIGh1Z2UgcGFnZXMgKG9mIHRoZSAlenUgR2lCIHJlcXVlc3RlZCkKAHBhZ2Ugd2l0aCB0YWcgJXUgY2Fubm90IGJlIHJlY2xhaW1lZCBieSBhIGhlYXAgd2l0aCB0aGUgc2FtZSB0YWcgKHVzaW5nICV1IGluc3RlYWQpCgB1bmFibGUgdG8gYWxsb2NhdGUgYWxpZ25lZCBPUyBtZW1vcnkgZGlyZWN0bHksIGZhbGwgYmFjayB0byBvdmVyLWFsbG9jYXRpb24gKHNpemU6IDB4JXp4IGJ5dGVzLCBhZGRyZXNzOiAlcCwgYWxpZ25tZW50OiAweCV6eCwgY29tbWl0OiAlZCkKAHVuYWJsZSB0byBhbGxvY2F0ZSBPUyBtZW1vcnkgKGVycm9yOiAlZCAoMHgleCksIHNpemU6IDB4JXp4IGJ5dGVzLCBhbGlnbjogMHglengsIGNvbW1pdDogJWQsIGFsbG93IGxhcmdlOiAlZCkKAEHgIQsJAQAAAAAAAABKAEH5IQuBBBAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEABBhCYLAQQAQZAmCwEEAEGcJgsBCABBqCYLAQwAQbQmCwEQAEHAJgsBFABBzCYLARgAQdgmCwEcAEHkJgsBIABB8CYLASgAQfwmCwEwAEGIJwsBOABBlCcLAUAAQaAnCwFQAEGsJwsBYABBuCcLAXAAQcQnCwGAAEHQJwsBoABB3CcLAcAAQegnCwHgAEH1JwsBAQBBgCgLAkABAEGMKAsCgAEAQZgoCwLAAQBBpSgLAQIAQbAoCwKAAgBBvSgLAQMAQcgoCwKAAwBB1SgLAQQAQeEoCwEFAEHtKAsBBgBB+SgLAQcAQYUpCwEIAEGRKQsBCgBBnSkLAQwAQakpCwEOAEG1KQsBEABBwSkLARQAQc0pCwEYAEHZKQsBHABB5SkLASAAQfEpCwEoAEH9KQsBMABBiSoLATgAQZUqCwFAAEGhKgsBUABBrSoLAWAAQbkqCwFwAEHFKgsBgABB0SoLAaAAQd0qCwHAAEHpKgsB4ABB9ioLAQEAQYErCwJAAQBBjSsLAoABAEGZKwsCwAEAQaYrCwECAEGxKwsCgAIAQb4rCwEDAEHJKwsCgAMAQdYrCwEEAEHiKwsBBQBB7isLAQYAQforCwEHAEGGLAsBCABBkiwLAQoAQZ4sCwEMAEGqLAsBDgBBtiwLARAAQcIsCwEUAEHOLAsBGABB2iwLARwAQeYsCwEgAEHwLAsDBAABAEH8LAsDCAABAEGcLQsBAQBBqC0LAQEAQbQtCwECAEHALQsBAwBBzC0LAQQAQdgtCwEFAEHkLQsBBgBB8C0LAQcAQfwtCwEKAEGILgsBDABBlC4LAQ4AQaAuCwEQAEGsLgsBFABBuC4LARgAQcQuCwEcAEHQLgsBIABB3C4LASgAQeguCwEwAEH0LgsBOABBgC8LAUAAQYwvCwFQAEGYLwsBYABBpC8LAXAAQbAvCwGAAEG8LwsBoABByC8LAcAAQdQvCwHgAEHhLwsBAQBB7C8LAkABAEH4LwsCgAEAQYQwCwLAAQBBkTALAQIAQZwwCwKAAgBBqTALAQMAQbQwCwKAAwBBwTALAQQAQdgwCw5oGAAAYBgAAAAAAABoGABBqDYLoAUDAAAADwAAAGQjEK/r1wBAN2xblNmgA0B2w7ZFmY0FQAEAAAAAAAAABAAAAA4AAADj4T0HliPWv/rrulxpvqc/vaqzWmCP3D8BAAAABAAAAAQAAAALAAAAvcPt0LAY2b8MQz+uaM6dP57OFaWEYNw/AwAAAAAAAAAEAAAADgAAAFwdAHFXr8i/bUiS1s7mdz+/SdOgaB7KPwIAAAAIAAAAAgAAAAQAAAD4Sf/c4cCzv4ZfA4XuUIS/WGpiJvZ1rT8FAAAABgAAAAIAAAAPAAAAiskbYOa75r+5G0RrRZvgv4ocIm5OJdW/AQAAAAkAAAACAAAAEAAAAAXc8/xpo9a/lAMsqF5tk79YWdsUj4vSPwMAAAAEAAAAAgAAAAoAAACD3htDAHDAv7dJoBxgQZ2/KqM2FrlMrj8DAAAACQAAAAIAAAAQAAAAEsE4uHTMwb8Q5EXLJmWXv9gydEdahbY/AgAAAAEAAAADAAAABgAAAFGC/kKPGMG/uohKfh9pez8baD7nbtfDPwMAAAADAAAABgAAAAIAAAAQejarPlebv9i0tTKfe4A/sH23L1aKpz8CAAAACAAAAAEAAAAKAAAAmbROAdXkuL9tKkE1FC2PP2H+Cpkrg8A/AwAAAAQAAAAEAAAADgAAAHZvRWKCGsK/On2YGCaubj8bTMPwETHDPwUAAAAEAAAAAgAAAA8AAACSy39Iv33kv+nwEMZP492/1CmPboRF0r8FAAAACQAAAAIAAAADAAAAhUTaxp+o1L9+xK9Yw0XQv9rFNNO9Tsa/AgAAAAEAAAAIAAAABAAAAEI+6Nms+rK/S9l1sWE0eL/cVy/Q/7yuPwAAAAAAANA/AAAAAAAA6D8AAAAAAADwPwAAAAAAAOg/AAAAAAAA0D8AQdQ7C+I8BAAAAAMAAAAPAAAALUMc6+K2/z89RKM7iN0CQDCBW3fzFAVABAAAAAQAAAAGAAAADwAAAM7fhEIEnPC/YHR5c7jW5L/rqkAtBg/SvwEAAAAAAAAABAAAABAAAACY/E/+7h3Tv0LSp1X0h74/aEC9GTXf4T8DAAAACAAAAAIAAAAMAAAA3BK54Az+ur/rrkc8NIePP13AywwbZcE/AwAAAAQAAAAEAAAACAAAACxF8pVASsK/UbNR55t+mj8r+kMzT67JPwQAAAAAAAAAAwAAAAUAAACSByKLNHHqvz8BFCNL5uK/X3r7c9GQ178BAAAAAgAAAAIAAAAJAAAAwt8vZkvW4b/cY+lDF9TNv65kx0YgXqs/AgAAAAcAAAADAAAABAAAAK7InvMJj7C/XPN4lClqeT/TgrzDkhe0PwIAAAAGAAAAAgAAABAAAAB9eJYgI6DIvxdH5SZqaZ6/U8vW+iKhyz8CAAAAAQAAAAMAAAACAAAA87fzs0depL84ralmtUR3v2kq1U9J550/BQAAAAoAAAABAAAADwAAAAw89x4uOeG/9Gvrp/+s17/S+8bXnlnIvwMAAAAGAAAAAgAAAAoAAACXyAVn8Pe/vysqh7sfXJ4/hPOpY5XSwT8CAAAAAQAAAAEAAAAOAAAA0ZFc/kP6ub87k5EOahqXP8tpT8k5sc0/AwAAAAUAAAAGAAAABAAAAHA+daxSerS/hdNhCZTifb+FXRQ98DGwPwEAAAAJAAAAAgAAAAwAAABkB5W4jnHRvyGvB5Pi45M/2BGHbCBd0z8DAAAABAAAAAIAAAAOAAAAjEl/L4UHxb9wbCwX4HGgv/0HojiRqrU/AAAAAAQAAAADAAAADwAAAC1DHOvitv8/PUSjO4jdAkAwgVt38xQFQAQAAAAEAAAABgAAAA8AAADO34RCBJzwv2B0eXO41uS/66pALQYP0r8BAAAAAAAAAAQAAAAQAAAAmPxP/u4d079C0qdV9Ie+P2hAvRk13+E/AwAAAAgAAAACAAAADAAAANwSueAM/rq/665HPDSHjz9dwMsMG2XBPwMAAAAEAAAABAAAAAgAAAAsRfKVQErCv1GzUeebfpo/K/pDM0+uyT8EAAAAAAAAAAMAAAAFAAAAkgciizRx6r8/ARQjS+biv196+3PRkNe/AQAAAAIAAAACAAAACQAAAMLfL2ZL1uG/3GPpQxfUzb+uZMdGIF6rPwIAAAAHAAAAAwAAAAQAAACuyJ7zCY+wv1zzeJQpank/04K8w5IXtD8CAAAABgAAAAIAAAAQAAAAfXiWICOgyL8XR+Umammev1PL1voiocs/AgAAAAEAAAADAAAAAgAAAPO387NHXqS/OK2pZrVEd79pKtVPSeedPwUAAAAKAAAAAQAAAA8AAAAMPPceLjnhv/Rr66f/rNe/0vvG155ZyL8DAAAABgAAAAIAAAAKAAAAl8gFZ/D3v78rKoe7H1yeP4TzqWOV0sE/AgAAAAEAAAABAAAADgAAANGRXP5D+rm/O5ORDmoalz/LaU/JObHNPwMAAAAFAAAABgAAAAQAAABwPnWsUnq0v4XTYQmU4n2/hV0UPfAxsD8BAAAACQAAAAIAAAAMAAAAZAeVuI5x0b8hrweT4uOTP9gRh2wgXdM/AwAAAAQAAAACAAAADgAAAIxJfy+FB8W/cGwsF+BxoL/9B6I4kaq1PwA4+v5CLuY/MGfHk1fzLj0BAAAAAADgv1swUVVVVdU/kEXr////z78RAfEks5nJP5/IBuV1VcW/AAAAAAAA4L93VVVVVVXVP8v9/////8+/DN2VmZmZyT+nRWdVVVXFvzDeRKMkScI/ZT1CpP//v7/K1ioohHG8P/9osEPrmbm/hdCv94KBtz/NRdF1E1K1v5/e4MPwNPc/AJDmeX/M178f6SxqeBP3PwAADcLub9e/oLX6CGDy9j8A4FET4xPXv32MEx+m0fY/AHgoOFu41r/RtMULSbH2PwB4gJBVXda/ugwvM0eR9j8AABh20ALWvyNCIhifcfY/AJCQhsqo1b/ZHqWZT1L2PwBQA1ZDT9W/xCSPqlYz9j8AQGvDN/bUvxTcnWuzFPY/AFCo/aed1L9MXMZSZPb1PwCoiTmSRdS/TyyRtWfY9T8AuLA59O3Tv96QW8u8uvU/AHCPRM6W0794GtnyYZ31PwCgvRceQNO/h1ZGElaA9T8AgEbv4unSv9Nr586XY/U/AOAwOBuU0r+Tf6fiJUf1PwCI2ozFPtK/g0UGQv8q9T8AkCcp4enRv9+9stsiD/U/APhIK22V0b/X3jRHj/P0PwD4uZpnQdG/QCjez0PY9D8AmO+U0O3Qv8ijeMA+vfQ/ABDbGKWa0L+KJeDDf6L0PwC4Y1LmR9C/NITUJAWI9D8A8IZFIuvPvwstGRvObfQ/ALAXdUpHz79UGDnT2VP0PwAwED1EpM6/WoS0RCc69D8AsOlEDQLOv/v4FUG1IPQ/APB3KaJgzb+x9D7aggf0PwCQlQQBwMy/j/5XXY/u8z8AEIlWKSDMv+lMC6DZ1fM/ABCBjReBy78rwRDAYL3zPwDQ08zJ4sq/uNp1KySl8z8AkBIuQEXKvwLQn80ijfM/APAdaHeoyb8ceoTFW3XzPwAwSGltDMm/4jatSc5d8z8AwEWmIHHIv0DUTZh5RvM/ADAUtI/Wx78ky//OXC/zPwBwYjy4PMe/SQ2hdXcY8z8AYDebmqPGv5A5PjfIAfM/AKC3VDELxr9B+JW7TuvyPwAwJHZ9c8W/0akZAgrV8j8AMMKPe9zEvyr9t6j5vvI/AADSUSxGxL+rGwx6HKnyPwAAg7yKsMO/MLUUYHKT8j8AAElrmRvDv/WhV1f6ffI/AECkkFSHwr+/Ox2bs2jyPwCgefi588G/vfWPg51T8j8AoCwlyGDBvzsIyaq3PvI/ACD3V3/OwL+2QKkrASryPwCg/kncPMC/MkHMlnkV8j8AgEu8vVe/v5v80h0gAfI/AEBAlgg3vr8LSE1J9OzxPwBA+T6YF72/aWWPUvXY8T8AoNhOZ/m7v3x+VxEjxfE/AGAvIHncur/pJst0fLHxPwCAKOfDwLm/thosDAGe8T8AwHKzRqa4v71wtnuwivE/AACsswGNt7+2vO8linfxPwAAOEXxdLa/2jFMNY1k8T8AgIdtDl61v91fJ5C5UfE/AOCh3lxItL9M0jKkDj/xPwCgak3ZM7O/2vkQcoss8T8AYMX4eSCyvzG17CgwGvE/ACBimEYOsb+vNITa+wfxPwAA0mps+q+/s2tOD+718D8AQHdKjdqtv86fKl0G5PA/AACF5Oy8q78hpSxjRNLwPwDAEkCJoam/GpjifKfA8D8AwAIzWIinv9E2xoMvr/A/AIDWZ15xpb85E6CY253wPwCAZUmKXKO/3+dSr6uM8D8AQBVk40mhv/soTi+fe/A/AIDrgsBynr8ZjzWMtWrwPwCAUlLxVZq/LPnspe5Z8D8AgIHPYj2Wv5As0c1JSfA/AACqjPsokr+prfDGxjjwPwAA+SB7MYy/qTJ5E2Uo8D8AAKpdNRmEv0hz6ickGPA/AADswgMSeL+VsRQGBAjwPwAAJHkJBGC/Gvom9x/g7z8AAJCE8+9vP3TqYcIcoe8/AAA9NUHchz8umYGwEGPvPwCAwsSjzpM/za3uPPYl7z8AAIkUwZ+bP+cTkQPI6e4/AAARztiwoT+rsct4gK7uPwDAAdBbiqU/mwydohp07j8AgNhAg1ypP7WZCoOROu4/AIBX72onrT9WmmAJ4AHuPwDAmOWYdbA/mLt35QHK7T8AIA3j9VOyPwORfAvyku0/AAA4i90utD/OXPtmrFztPwDAV4dZBrY/nd5eqiwn7T8AAGo1dtq3P80saz5u8uw/AGAcTkOruT8Ceaeibb7sPwBgDbvHeLs/bQg3bSaL7D8AIOcyE0O9PwRYXb2UWOw/AGDecTEKvz+Mn7sztSbsPwBAkSsVZ8A/P+fs7oP16z8AsJKChUfBP8GW23X9xOs/ADDKzW4mwj8oSoYMHpXrPwBQxabXA8M/LD7vxeJl6z8AEDM8w9/DP4uIyWdIN+s/AIB6aza6xD9KMB0hSwnrPwDw0Sg5k8U/fu/yhejb6j8A8BgkzWrGP6I9YDEdr+o/AJBm7PhAxz+nWNM/5oLqPwDwGvXAFcg/i3MJ70BX6j8AgPZUKenIPydLq5AqLOo/AED4Aja7yT/R8pMToAHqPwAALBzti8o/GzzbJJ/X6T8A0AFcUVvLP5CxxwUlruk/AMC8zGcpzD8vzpfyLoXpPwBgSNU19sw/dUuk7rpc6T8AwEY0vcHNPzhI553GNOk/AODPuAGMzj/mUmcvTw3pPwCQF8AJVc8/ndf/jlLm6D8AuB8SbA7QP3wAzJ/Ov+g/ANCTDrhx0D8Ow77awJnoPwBwhp5r1NA/+xcjqid06D8A0EszhzbRPwias6wAT+g/AEgjZw2Y0T9VPmXoSSroPwCAzOD/+NE/YAL0lQEG6D8AaGPXX1nSPymj4GMl4uc/AKgUCTC50j+ttdx3s77nPwBgQxByGNM/wiWXZ6qb5z8AGOxtJnfTP1cGF/IHeec/ADCv+0/V0z8ME9bbylbnPwDgL+PuMtQ/a7ZPAQAQ5j88W0KRbAJ+PJW0TQMAMOY/QV0ASOq/jTx41JQNAFDmP7el1oanf448rW9OBwBw5j9MJVRr6vxhPK4P3/7/j+Y//Q5ZTCd+fLy8xWMHALDmPwHa3EhowYq89sFcHgDQ5j8Rk0mdHD+DPD72Bev/7+Y/Uy3iGgSAfryAl4YOABDnP1J5CXFm/3s8Euln/P8v5z8kh70m4gCMPGoRgd//T+c/0gHxbpECbryQnGcPAHDnP3ScVM1x/Ge8Nch++v+P5z+DBPWewb6BPObCIP7/r+c/ZWTMKRd+cLwAyT/t/8/nPxyLewhygIC8dhom6f/v5z+u+Z1tKMCNPOijnAQAEOg/M0zlUdJ/iTyPLJMXADDoP4HzMLbp/oq8nHMzBgBQ6D+8NWVrv7+JPMaJQiAAcOg/dXsR82W/i7wEefXr/4/oP1fLPaJuAIm83wS8IgCw6D8KS+A43wB9vIobDOX/z+g/BZ//RnEAiLxDjpH8/+/oPzhwetB7gYM8x1/6HgAQ6T8DtN92kT6JPLl7RhMAMOk/dgKYS06AfzxvB+7m/0/pPy5i/9nwfo+80RI83v9v6T+6OCaWqoJwvA2KRfT/j+k/76hkkRuAh7w+Lpjd/6/pPzeTWorgQIe8ZvtJ7f/P6T8A4JvBCM4/PFGc8SAA8Ok/CluIJ6o/irwGsEURABDqP1baWJlI/3Q8+va7BwAw6j8YbSuKq76MPHkdlxAAUOo/MHl43cr+iDxILvUdAHDqP9ur2D12QY+8UjNZHACQ6j8SdsKEAr+OvEs+TyoAsOo/Xz//PAT9abzRHq7X/8/qP7RwkBLnPoK8eARR7v/v6j+j3g7gPgZqPFsNZdv/D+s/uQofOMgGWjxXyqr+/y/rPx08I3QeAXm83LqV2f9P6z+fKoZoEP95vJxlniQAcOs/Pk+G0EX/ijxAFof5/4/rP/nDwpZ3/nw8T8sE0v+v6z/EK/LuJ/9jvEVcQdL/z+s/Ieo77rf/bLzfCWP4/+/rP1wLLpcDQYG8U3a14f8P7D8ZareUZMGLPONX+vH/L+w/7cYwje/+ZLwk5L/c/0/sP3VH7LxoP4S897lU7f9v7D/s4FPwo36EPNWPmev/j+w/8ZL5jQaDczyaISUhALDsPwQOGGSO/Wi8nEaU3f/P7D9y6sccvn6OPHbE/er/7+w//oifrTm+jjwr+JoWABDtP3FauaiRfXU8HfcPDQAw7T/ax3BpkMGJPMQPeer/T+0/DP5YxTcOWLzlh9wuAHDtP0QPwU3WgH+8qoLcIQCQ7T9cXP2Uj3x0vIMCa9j/r+0/fmEhxR1/jDw5R2wpANDtP1Ox/7KeAYg89ZBE5f/v7T+JzFLG0gBuPJT2q83/D+4/0mktIECDf7zdyFLb/y/uP2QIG8rBAHs87xZC8v9P7j9Rq5SwqP9yPBFeiuj/b+4/Wb7vsXP2V7wN/54RAJDuPwHIC16NgIS8RBel3/+v7j+1IEPVBgB4PKF/EhoA0O4/klxWYPgCULzEvLoHAPDuPxHmNV1EQIW8Ao169f8P7z8Fke85MftPvMeK5R4AMO8/VRFz8qyBijyUNIL1/0/vP0PH19RBP4o8a0yp/P9v7z91eJgc9AJivEHE+eH/j+8/S+d39NF9dzx+4+DS/6/vPzGjfJoZAW+8nuR3HADQ7z+xrM5L7oFxPDHD4Pf/7+8/WodwATcFbrxuYGX0/w/wP9oKHEmtfoq8WHqG8/8v8D/gsvzDaX+XvBcN/P3/T/A/W5TLNP6/lzyCTc0DAHDwP8tW5MCDAII86Mvy+f+P8D8adTe+3/9tvGXaDAEAsPA/6ybmrn8/kbw406QBANDwP/efSHn6fYA8/f3a+v/v8D/Aa9ZwBQR3vJb9ugsAEPE/YgtthNSAjjxd9OX6/y/xP+82/WT6v5082ZrVDQBQ8T+uUBJwdwCaPJpVIQ8AcPE/7t7j4vn9jTwmVCf8/4/xP3NyO9wwAJE8WTw9EgCw8T+IAQOAeX+ZPLeeKfj/z/E/Z4yfqzL5ZbwA1Ir0/+/xP+tbp52/f5M8pIaLDAAQ8j8iW/2Ra4CfPANDhQMAMPI/M7+f68L/kzyE9rz//0/yP3IuLn7nAXY82SEp9f9v8j9hDH92u/x/PDw6kxQAkPI/K0ECPMoCcrwTY1UUALDyPwIf8jOCgJK8O1L+6//P8j/y3E84fv+IvJatuAsA8PI/xUEwUFH/hbyv4nr7/w/zP50oXohxAIG8f1+s/v8v8z8Vt7c/Xf+RvFZnpgwAUPM/vYKLIoJ/lTwh9/sRAHDzP8zVDcS6AIA8uS9Z+f+P8z9Rp7ItnT+UvELS3QQAsPM/4Th2cGt/hTxXybL1/8/zPzESvxA6Ano8GLSw6v/v8z+wUrFmbX+YPPSvMhUAEPQ/JIUZXzf4Zzwpi0cXADD0P0NR3HLmAYM8Y7SV5/9P9D9aibK4af+JPOB1BOj/b/Q/VPLCm7HAlbznwW/v/4/0P3IqOvIJQJs8BKe+5f+v9D9FfQ2/t/+UvN4nEBcA0PQ/PWrccWTAmbziPvAPAPD0PxxThQuJf5c80UvcEgAQ9T82pGZxZQRgPHonBRYAMPU/CTIjzs6/lrxMcNvs/0/1P9ehBQVyAom8qVRf7/9v9T8SZMkO5r+bPBIQ5hcAkPU/kO+vgcV+iDySPskDALD1P8AMvwoIQZ+8vBlJHQDQ9T8pRyX7KoGYvIl6uOf/7/U/BGntgLd+lLxOMTFjaHJvbWFwcmludDIxRmluZ2VycHJpbnRDYWxjdWxhdG9yRQAAAQMCTjExY2hyb21hcHJpbnQxMkNocm9tYUZpbHRlckUATjExY2hyb21hcHJpbnQ2Q2hyb21hRQBOMTFjaHJvbWFwcmludDE2RkZURnJhbWVDb25zdW1lckUATjExY2hyb21hcHJpbnQzRkZURQBOMTFjaHJvbWFwcmludDE0U2lsZW5jZVJlbW92ZXJFAE4xMWNocm9tYXByaW50MTRBdWRpb1Byb2Nlc3NvckUATjExY2hyb21hcHJpbnQxM0ZpbmdlcnByaW50ZXJFAE4xMWNocm9tYXByaW50MTNBdWRpb0NvbnN1bWVyRQBOMTFjaHJvbWFwcmludDE2Q2hyb21hTm9ybWFsaXplckUATjExY2hyb21hcHJpbnQyMUZlYXR1cmVWZWN0b3JDb25zdW1lckUATm8gZXJyb3IgaW5mb3JtYXRpb24ASWxsZWdhbCBieXRlIHNlcXVlbmNlAERvbWFpbiBlcnJvcgBSZXN1bHQgbm90IHJlcHJlc2VudGFibGUATm90IGEgdHR5AFBlcm1pc3Npb24gZGVuaWVkAE9wZXJhdGlvbiBub3QgcGVybWl0dGVkAE5vIHN1Y2ggZmlsZSBvciBkaXJlY3RvcnkATm8gc3VjaCBwcm9jZXNzAEZpbGUgZXhpc3RzAFZhbHVlIHRvbyBsYXJnZSBmb3IgZGF0YSB0eXBlAE5vIHNwYWNlIGxlZnQgb24gZGV2aWNlAE91dCBvZiBtZW1vcnkAUmVzb3VyY2UgYnVzeQBJbnRlcnJ1cHRlZCBzeXN0ZW0gY2FsbABSZXNvdXJjZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZQBJbnZhbGlkIHNlZWsAQ3Jvc3MtZGV2aWNlIGxpbmsAUmVhZC1vbmx5IGZpbGUgc3lzdGVtAERpcmVjdG9yeSBub3QgZW1wdHkAQ29ubmVjdGlvbiByZXNldCBieSBwZWVyAE9wZXJhdGlvbiB0aW1lZCBvdXQAQ29ubmVjdGlvbiByZWZ1c2VkAEhvc3QgaXMgZG93bgBIb3N0IGlzIHVucmVhY2hhYmxlAEFkZHJlc3MgaW4gdXNlAEJyb2tlbiBwaXBlAEkvTyBlcnJvcgBObyBzdWNoIGRldmljZSBvciBhZGRyZXNzAEJsb2NrIGRldmljZSByZXF1aXJlZABObyBzdWNoIGRldmljZQBOb3QgYSBkaXJlY3RvcnkASXMgYSBkaXJlY3RvcnkAVGV4dCBmaWxlIGJ1c3kARXhlYyBmb3JtYXQgZXJyb3IASW52YWxpZCBhcmd1bWVudABBcmd1bWVudCBsaXN0IHRvbyBsb25nAFN5bWJvbGljIGxpbmsgbG9vcABGaWxlbmFtZSB0b28gbG9uZwBUb28gbWFueSBvcGVuIGZpbGVzIGluIHN5c3RlbQBObyBmaWxlIGRlc2NyaXB0b3JzIGF2YWlsYWJsZQBCYWQgZmlsZSBkZXNjcmlwdG9yAE5vIGNoaWxkIHByb2Nlc3MAQmFkIGFkZHJlc3MARmlsZSB0b28gbGFyZ2UAVG9vIG1hbnkgbGlua3MATm8gbG9ja3MgYXZhaWxhYmxlAFJlc291cmNlIGRlYWRsb2NrIHdvdWxkIG9jY3VyAFN0YXRlIG5vdCByZWNvdmVyYWJsZQBQcmV2aW91cyBvd25lciBkaWVkAE9wZXJhdGlvbiBjYW5jZWxlZABGdW5jdGlvbiBub3QgaW1wbGVtZW50ZWQATm8gbWVzc2FnZSBvZiBkZXNpcmVkIHR5cGUASWRlbnRpZmllciByZW1vdmVkAERldmljZSBub3QgYSBzdHJlYW0ATm8gZGF0YSBhdmFpbGFibGUARGV2aWNlIHRpbWVvdXQAT3V0IG9mIHN0cmVhbXMgcmVzb3VyY2VzAExpbmsgaGFzIGJlZW4gc2V2ZXJlZABQcm90b2NvbCBlcnJvcgBCYWQgbWVzc2FnZQBGaWxlIGRlc2NyaXB0b3IgaW4gYmFkIHN0YXRlAE5vdCBhIHNvY2tldABEZXN0aW5hdGlvbiBhZGRyZXNzIHJlcXVpcmVkAE1lc3NhZ2UgdG9vIGxhcmdlAFByb3RvY29sIHdyb25nIHR5cGUgZm9yIHNvY2tldABQcm90b2NvbCBub3QgYXZhaWxhYmxlAFByb3RvY29sIG5vdCBzdXBwb3J0ZWQAU29ja2V0IHR5cGUgbm90IHN1cHBvcnRlZABOb3Qgc3VwcG9ydGVkAFByb3RvY29sIGZhbWlseSBub3Qgc3VwcG9ydGVkAEFkZHJlc3MgZmFtaWx5IG5vdCBzdXBwb3J0ZWQgYnkgcHJvdG9jb2wAQWRkcmVzcyBub3QgYXZhaWxhYmxlAE5ldHdvcmsgaXMgZG93bgBOZXR3b3JrIHVucmVhY2hhYmxlAENvbm5lY3Rpb24gcmVzZXQgYnkgbmV0d29yawBDb25uZWN0aW9uIGFib3J0ZWQATm8gYnVmZmVyIHNwYWNlIGF2YWlsYWJsZQBTb2NrZXQgaXMgY29ubmVjdGVkAFNvY2tldCBub3QgY29ubmVjdGVkAENhbm5vdCBzZW5kIGFmdGVyIHNv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", import.meta.url).href;
    }
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    async function getWasmBinary(binaryFile) {
      if (!wasmBinary) {
        try {
          var response = await readAsync(binaryFile);
          return new Uint8Array(response);
        } catch {
        }
      }
      return getBinarySync(binaryFile);
    }
    async function instantiateArrayBuffer(binaryFile, imports) {
      try {
        var binary = await getWasmBinary(binaryFile);
        var instance = await WebAssembly.instantiate(binary, imports);
        return instance;
      } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        if (isFileURI(wasmBinaryFile)) {
          err(`warning: Loading from a file URI (${wasmBinaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
        }
        abort(reason);
      }
    }
    async function instantiateAsync(binary, binaryFile, imports) {
      if (!binary && typeof WebAssembly.instantiateStreaming == "function") {
        try {
          var response = fetch(binaryFile, { credentials: "same-origin" });
          var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
          return instantiationResult;
        } catch (reason) {
          err(`wasm streaming compile failed: ${reason}`);
          err("falling back to ArrayBuffer instantiation");
        }
      }
      return instantiateArrayBuffer(binaryFile, imports);
    }
    function getWasmImports() {
      return { env: wasmImports, wasi_snapshot_preview1: wasmImports };
    }
    async function createWasm() {
      function receiveInstance(instance, module) {
        wasmExports = instance.exports;
        wasmMemory = wasmExports["memory"];
        assert(wasmMemory, "memory not found in wasm exports");
        updateMemoryViews();
        assignWasmExports(wasmExports);
        removeRunDependency("wasm-instantiate");
        return wasmExports;
      }
      addRunDependency("wasm-instantiate");
      var trueModule = Module2;
      function receiveInstantiationResult(result2) {
        assert(Module2 === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
        trueModule = null;
        return receiveInstance(result2["instance"]);
      }
      var info = getWasmImports();
      if (Module2["instantiateWasm"]) {
        return new Promise((resolve, reject) => {
          try {
            Module2["instantiateWasm"](info, (mod, inst) => {
              resolve(receiveInstance(mod, inst));
            });
          } catch (e) {
            err(`Module.instantiateWasm callback failed with error: ${e}`);
            reject(e);
          }
        });
      }
      wasmBinaryFile ??= findWasmBinary();
      var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
      var exports$1 = receiveInstantiationResult(result);
      return exports$1;
    }
    class ExitStatus {
      name = "ExitStatus";
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }
    var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    };
    var onPostRuns = [];
    var addOnPostRun = (cb) => onPostRuns.push(cb);
    var onPreRuns = [];
    var addOnPreRun = (cb) => onPreRuns.push(cb);
    function getValue(ptr, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          return HEAP8[ptr];
        case "i8":
          return HEAP8[ptr];
        case "i16":
          return HEAP16[ptr >> 1];
        case "i32":
          return HEAP32[ptr >> 2];
        case "i64":
          return HEAP64[ptr >> 3];
        case "float":
          return HEAPF32[ptr >> 2];
        case "double":
          return HEAPF64[ptr >> 3];
        case "*":
          return HEAPU32[ptr >> 2];
        default:
          abort(`invalid type for getValue: ${type}`);
      }
    }
    var noExitRuntime = true;
    var ptrToString = (ptr) => {
      assert(typeof ptr === "number");
      ptr >>>= 0;
      return "0x" + ptr.toString(16).padStart(8, "0");
    };
    var stackRestore = (val) => __emscripten_stack_restore(val);
    var stackSave = () => _emscripten_stack_get_current();
    var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        err(text);
      }
    };
    class ExceptionInfo {
      constructor(excPtr) {
        this.excPtr = excPtr;
        this.ptr = excPtr - 24;
      }
      set_type(type) {
        HEAPU32[this.ptr + 4 >> 2] = type;
      }
      get_type() {
        return HEAPU32[this.ptr + 4 >> 2];
      }
      set_destructor(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor;
      }
      get_destructor() {
        return HEAPU32[this.ptr + 8 >> 2];
      }
      set_caught(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12] = caught;
      }
      get_caught() {
        return HEAP8[this.ptr + 12] != 0;
      }
      set_rethrown(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13] = rethrown;
      }
      get_rethrown() {
        return HEAP8[this.ptr + 13] != 0;
      }
      init(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
      }
      set_adjusted_ptr(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
      }
      get_adjusted_ptr() {
        return HEAPU32[this.ptr + 16 >> 2];
      }
    }
    var ___cxa_throw = (ptr, type, destructor) => {
      var info = new ExceptionInfo(ptr);
      info.init(type, destructor);
      assert(false, "Exception thrown, but exception catching is not enabled. Compile with -sNO_DISABLE_EXCEPTION_CATCHING or -sEXCEPTION_CATCHING_ALLOWED=[..] to catch.");
    };
    var __abort_js = () => abort("native code called abort()");
    var runtimeKeepaliveCounter = 0;
    var __emscripten_runtime_keepalive_clear = () => {
      noExitRuntime = false;
      runtimeKeepaliveCounter = 0;
    };
    var timers = {};
    var handleException = (e) => {
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err("Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)");
        }
      }
      quit_(1, e);
    };
    var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
    var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module2["onExit"]?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
    var exitJS = (status, implicit) => {
      EXITSTATUS = status;
      checkUnflushedContent();
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        readyPromiseReject?.(msg);
        err(msg);
      }
      _proc_exit(status);
    };
    var _exit = exitJS;
    var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
    var callUserCallback = (func) => {
      if (ABORT) {
        err("user callback triggered after runtime exited or application aborted.  Ignoring.");
        return;
      }
      try {
        func();
        maybeExit();
      } catch (e) {
        handleException(e);
      }
    };
    var _emscripten_get_now = () => performance.now();
    var __setitimer_js = (which, timeout_ms) => {
      if (timers[which]) {
        clearTimeout(timers[which].id);
        delete timers[which];
      }
      if (!timeout_ms) return 0;
      var id = setTimeout(() => {
        assert(which in timers);
        delete timers[which];
        callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
      }, timeout_ms);
      timers[which] = { id, timeout_ms };
      return 0;
    };
    var _emscripten_date_now = () => Date.now();
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
    var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte " + ptrToString(u0) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    };
    var UTF8ToString = (ptr, maxBytesToRead) => {
      assert(typeof ptr == "number", `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    };
    var _emscripten_err = (str) => err(UTF8ToString(str));
    var getHeapMax = () => 2147483648;
    var alignMemory = (size, alignment) => {
      assert(alignment, "alignment argument is required");
      return Math.ceil(size / alignment) * alignment;
    };
    var growMemory = (size) => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {
        err(`growMemory: Attempted to grow heap from ${b.byteLength} bytes to ${size} bytes, but got error: ${e}`);
      }
    };
    var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      assert(requestedSize > oldSize);
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err(`Cannot enlarge memory, requested ${requestedSize} bytes, but the limit is ${maxHeapSize} bytes!`);
        return false;
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      err(`Failed to grow the heap from ${oldSize} bytes to ${newSize} bytes, not enough memory!`);
      return false;
    };
    var ENV = {};
    var getExecutableName = () => thisProgram || "./this.program";
    var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.language || "C").replace("-", "_") + ".UTF-8";
        var env = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: lang, _: getExecutableName() };
        for (var x in ENV) {
          if (ENV[x] === void 0) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
    var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === "string", `stringToUTF8Array expects a string (got ${typeof str})`);
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.codePointAt(i);
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 1114111) warnOnce("Invalid Unicode code point " + ptrToString(u) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
          i++;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
    var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
    var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + envp >> 2] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };
    var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
    var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    };
    var _fd_close = (fd) => {
      abort("fd_close called without SYSCALLS_REQUIRE_FILESYSTEM");
    };
    function _fd_seek(fd, offset, whence, newOffset) {
      return 70;
    }
    var printCharBuffers = [null, [], []];
    var printChar = (stream, curr) => {
      var buffer = printCharBuffers[stream];
      assert(buffer);
      if (curr === 0 || curr === 10) {
        (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
        buffer.length = 0;
      } else {
        buffer.push(curr);
      }
    };
    var flush_NO_FILESYSTEM = () => {
      _fflush(0);
      if (printCharBuffers[1].length) printChar(1, 10);
      if (printCharBuffers[2].length) printChar(2, 10);
    };
    var _fd_write = (fd, iov, iovcnt, pnum) => {
      var num = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        for (var j = 0; j < len; j++) {
          printChar(fd, HEAPU8[ptr + j]);
        }
        num += len;
      }
      HEAPU32[pnum >> 2] = num;
      return 0;
    };
    var initRandomFill = () => (view) => crypto.getRandomValues(view);
    var randomFill = (view) => {
      (randomFill = initRandomFill())(view);
    };
    var _random_get = (buffer, size) => {
      randomFill(HEAPU8.subarray(buffer, buffer + size));
      return 0;
    };
    var getCFunc = (ident) => {
      var func = Module2["_" + ident];
      assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
      return func;
    };
    var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
      HEAP8.set(array, buffer);
    };
    var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
    var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };
    var ccall = (ident, returnType, argTypes, args, opts) => {
      var toC = { string: (str) => {
        var ret2 = 0;
        if (str !== null && str !== void 0 && str !== 0) {
          ret2 = stringToUTF8OnStack(str);
        }
        return ret2;
      }, array: (arr) => {
        var ret2 = stackAlloc(arr.length);
        writeArrayToMemory(arr, ret2);
        return ret2;
      } };
      function convertReturnValue(ret2) {
        if (returnType === "string") {
          return UTF8ToString(ret2);
        }
        if (returnType === "boolean") return Boolean(ret2);
        return ret2;
      }
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== "array", 'Return type should not be "array".');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      var ret = func(...cArgs);
      function onDone(ret2) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret2);
      }
      ret = onDone(ret);
      return ret;
    };
    var cwrap = (ident, returnType, argTypes, opts) => (...args) => ccall(ident, returnType, argTypes, args);
    {
      if (Module2["noExitRuntime"]) noExitRuntime = Module2["noExitRuntime"];
      if (Module2["print"]) out = Module2["print"];
      if (Module2["printErr"]) err = Module2["printErr"];
      if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
      Module2["FS_createDataFile"] = FS.createDataFile;
      Module2["FS_createPreloadedFile"] = FS.createPreloadedFile;
      checkIncomingModuleAPI();
      if (Module2["arguments"]) Module2["arguments"];
      if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
      assert(typeof Module2["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
      assert(typeof Module2["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
      assert(typeof Module2["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
      assert(typeof Module2["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
      assert(typeof Module2["read"] == "undefined", "Module.read option was removed");
      assert(typeof Module2["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
      assert(typeof Module2["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
      assert(typeof Module2["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)");
      assert(typeof Module2["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
      assert(typeof Module2["ENVIRONMENT"] == "undefined", "Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
      assert(typeof Module2["STACK_SIZE"] == "undefined", "STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time");
      assert(typeof Module2["wasmMemory"] == "undefined", "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");
      assert(typeof Module2["INITIAL_MEMORY"] == "undefined", "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");
    }
    Module2["ccall"] = ccall;
    Module2["cwrap"] = cwrap;
    Module2["getValue"] = getValue;
    Module2["UTF8ToString"] = UTF8ToString;
    var missingLibrarySymbols = ["writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromI64", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "getTempRet0", "setTempRet0", "zeroMemory", "withStackSave", "strError", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "emscriptenLog", "readEmAsmArgs", "jstoi_q", "autoResumeAudioContext", "getDynCaller", "dynCall", "runtimeKeepalivePush", "runtimeKeepalivePop", "asmjsMangle", "asyncLoad", "mmapAlloc", "HandleAllocator", "getNativeTypeSize", "getUniqueRunDependency", "addOnInit", "addOnPostCtor", "addOnPreMain", "addOnExit", "STACK_SIZE", "STACK_ALIGN", "POINTER_SIZE", "ASSERTIONS", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "getFunctionAddress", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "intArrayFromString", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "stringToNewUTF8", "registerKeyEventCallback", "maybeCStringToJsString", "findEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "jsStackTrace", "getCallstack", "convertPCtoSourceLocation", "checkWasiClock", "wasiRightsToMuslOFlags", "wasiOFlagsToMuslOFlags", "safeSetTimeout", "setImmediateWrapped", "safeRequestAnimationFrame", "clearImmediateWrapped", "registerPostMainLoop", "registerPreMainLoop", "getPromise", "makePromise", "idsToPromises", "makePromiseCallback", "findMatchingCatch", "Browser_asyncPrepareDataCounter", "isLeapYear", "ydayFromDate", "arraySum", "addDays", "getSocketFromFD", "getSocketAddress", "FS_createPreloadedFile", "FS_modeStringToFlags", "FS_getMode", "FS_stdin_getChar", "FS_mkdirTree", "_setNetworkCallback", "heapObjectForWebGLType", "toTypedArrayIndex", "webgl_enable_ANGLE_instanced_arrays", "webgl_enable_OES_vertex_array_object", "webgl_enable_WEBGL_draw_buffers", "webgl_enable_WEBGL_multi_draw", "webgl_enable_EXT_polygon_offset_clamp", "webgl_enable_EXT_clip_control", "webgl_enable_WEBGL_polygon_mode", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "colorChannelsInGlTextureFormat", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "__glGetActiveAttribOrUniform", "writeGLArray", "registerWebGlEventCallback", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate", "writeStringToMemory", "writeAsciiToMemory", "demangle", "stackTrace"];
    missingLibrarySymbols.forEach(missingLibrarySymbol);
    var unexportedSymbols = ["run", "addRunDependency", "removeRunDependency", "out", "err", "callMain", "abort", "wasmMemory", "wasmExports", "HEAPF32", "HEAPF64", "HEAP8", "HEAPU8", "HEAPU16", "HEAPU32", "HEAP64", "HEAPU64", "writeStackCookie", "checkStackCookie", "INT53_MAX", "INT53_MIN", "bigintToI53Checked", "stackSave", "stackRestore", "stackAlloc", "ptrToString", "exitJS", "getHeapMax", "growMemory", "ENV", "ERRNO_CODES", "DNS", "Protocols", "Sockets", "timers", "warnOnce", "readEmAsmArgsArray", "getExecutableName", "handleException", "keepRuntimeAlive", "callUserCallback", "maybeExit", "alignMemory", "wasmTable", "noExitRuntime", "addOnPreRun", "addOnPostRun", "freeTableIndexes", "functionsInTableMap", "setValue", "PATH", "PATH_FS", "UTF8Decoder", "UTF8ArrayToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "UTF16Decoder", "stringToUTF8OnStack", "writeArrayToMemory", "JSEvents", "specialHTMLTargets", "findCanvasEventTarget", "currentFullscreenStrategy", "restoreOldWindowedStyle", "UNWIND_CACHE", "ExitStatus", "getEnvStrings", "flush_NO_FILESYSTEM", "initRandomFill", "randomFill", "emSetImmediate", "emClearImmediate_deps", "emClearImmediate", "promiseMap", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "Browser", "requestFullscreen", "requestFullScreen", "setCanvasSize", "getUserMedia", "createContext", "getPreloadedImageData__data", "wget", "MONTH_DAYS_REGULAR", "MONTH_DAYS_LEAP", "MONTH_DAYS_REGULAR_CUMULATIVE", "MONTH_DAYS_LEAP_CUMULATIVE", "SYSCALLS", "preloadPlugins", "FS_stdin_getChar_buffer", "FS_unlink", "FS_createPath", "FS_createDevice", "FS_readFile", "FS", "FS_root", "FS_mounts", "FS_devices", "FS_streams", "FS_nextInode", "FS_nameTable", "FS_currentPath", "FS_initialized", "FS_ignorePermissions", "FS_filesystems", "FS_syncFSRequests", "FS_readFiles", "FS_lookupPath", "FS_getPath", "FS_hashName", "FS_hashAddNode", "FS_hashRemoveNode", "FS_lookupNode", "FS_createNode", "FS_destroyNode", "FS_isRoot", "FS_isMountpoint", "FS_isFile", "FS_isDir", "FS_isLink", "FS_isChrdev", "FS_isBlkdev", "FS_isFIFO", "FS_isSocket", "FS_flagsToPermissionString", "FS_nodePermissions", "FS_mayLookup", "FS_mayCreate", "FS_mayDelete", "FS_mayOpen", "FS_checkOpExists", "FS_nextfd", "FS_getStreamChecked", "FS_getStream", "FS_createStream", "FS_closeStream", "FS_dupStream", "FS_doSetAttr", "FS_chrdev_stream_ops", "FS_major", "FS_minor", "FS_makedev", "FS_registerDevice", "FS_getDevice", "FS_getMounts", "FS_syncfs", "FS_mount", "FS_unmount", "FS_lookup", "FS_mknod", "FS_statfs", "FS_statfsStream", "FS_statfsNode", "FS_create", "FS_mkdir", "FS_mkdev", "FS_symlink", "FS_rename", "FS_rmdir", "FS_readdir", "FS_readlink", "FS_stat", "FS_fstat", "FS_lstat", "FS_doChmod", "FS_chmod", "FS_lchmod", "FS_fchmod", "FS_doChown", "FS_chown", "FS_lchown", "FS_fchown", "FS_doTruncate", "FS_truncate", "FS_ftruncate", "FS_utime", "FS_open", "FS_close", "FS_isClosed", "FS_llseek", "FS_read", "FS_write", "FS_mmap", "FS_msync", "FS_ioctl", "FS_writeFile", "FS_cwd", "FS_chdir", "FS_createDefaultDirectories", "FS_createDefaultDevices", "FS_createSpecialDirectories", "FS_createStandardStreams", "FS_staticInit", "FS_init", "FS_quit", "FS_findObject", "FS_analyzePath", "FS_createFile", "FS_createDataFile", "FS_forceLoadFile", "FS_createLazyFile", "FS_absolutePath", "FS_createFolder", "FS_createLink", "FS_joinPath", "FS_mmapAlloc", "FS_standardizePath", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "miniTempWebGLIntBuffers", "GL", "AL", "GLUT", "EGL", "GLEW", "IDBStore", "SDL", "SDL_gfx", "allocateUTF8", "allocateUTF8OnStack", "print", "printErr", "jstoi_s"];
    unexportedSymbols.forEach(unexportedRuntimeSymbol);
    function checkIncomingModuleAPI() {
      ignoredModuleProp("fetchSettings");
    }
    Module2["_chromaprint_new"] = makeInvalidEarlyAccess("_chromaprint_new");
    Module2["_chromaprint_free"] = makeInvalidEarlyAccess("_chromaprint_free");
    Module2["_chromaprint_get_delay"] = makeInvalidEarlyAccess("_chromaprint_get_delay");
    Module2["_chromaprint_get_delay_ms"] = makeInvalidEarlyAccess("_chromaprint_get_delay_ms");
    Module2["_chromaprint_start"] = makeInvalidEarlyAccess("_chromaprint_start");
    Module2["_chromaprint_feed"] = makeInvalidEarlyAccess("_chromaprint_feed");
    Module2["_chromaprint_finish"] = makeInvalidEarlyAccess("_chromaprint_finish");
    Module2["_chromaprint_get_fingerprint"] = makeInvalidEarlyAccess("_chromaprint_get_fingerprint");
    Module2["_chromaprint_get_raw_fingerprint"] = makeInvalidEarlyAccess("_chromaprint_get_raw_fingerprint");
    Module2["_chromaprint_get_raw_fingerprint_size"] = makeInvalidEarlyAccess("_chromaprint_get_raw_fingerprint_size");
    Module2["_chromaprint_clear_fingerprint"] = makeInvalidEarlyAccess("_chromaprint_clear_fingerprint");
    var _fflush = makeInvalidEarlyAccess("_fflush");
    var __emscripten_timeout = makeInvalidEarlyAccess("__emscripten_timeout");
    Module2["_strdup"] = makeInvalidEarlyAccess("_strdup");
    Module2["_strndup"] = makeInvalidEarlyAccess("_strndup");
    Module2["__ZdaPv"] = makeInvalidEarlyAccess("__ZdaPv");
    Module2["__ZdaPvm"] = makeInvalidEarlyAccess("__ZdaPvm");
    Module2["__ZdlPvm"] = makeInvalidEarlyAccess("__ZdlPvm");
    Module2["__Znaj"] = makeInvalidEarlyAccess("__Znaj");
    Module2["__ZnajSt11align_val_t"] = makeInvalidEarlyAccess("__ZnajSt11align_val_t");
    Module2["__Znwj"] = makeInvalidEarlyAccess("__Znwj");
    Module2["__ZnwjSt11align_val_t"] = makeInvalidEarlyAccess("__ZnwjSt11align_val_t");
    Module2["___libc_calloc"] = makeInvalidEarlyAccess("___libc_calloc");
    Module2["___libc_free"] = makeInvalidEarlyAccess("___libc_free");
    Module2["___libc_malloc"] = makeInvalidEarlyAccess("___libc_malloc");
    Module2["___libc_realloc"] = makeInvalidEarlyAccess("___libc_realloc");
    Module2["_emscripten_builtin_calloc"] = makeInvalidEarlyAccess("_emscripten_builtin_calloc");
    Module2["_emscripten_builtin_free"] = makeInvalidEarlyAccess("_emscripten_builtin_free");
    Module2["_emscripten_builtin_malloc"] = makeInvalidEarlyAccess("_emscripten_builtin_malloc");
    Module2["_emscripten_builtin_realloc"] = makeInvalidEarlyAccess("_emscripten_builtin_realloc");
    Module2["_free"] = makeInvalidEarlyAccess("_free");
    Module2["_malloc"] = makeInvalidEarlyAccess("_malloc");
    Module2["_malloc_size"] = makeInvalidEarlyAccess("_malloc_size");
    Module2["_malloc_usable_size"] = makeInvalidEarlyAccess("_malloc_usable_size");
    Module2["_reallocf"] = makeInvalidEarlyAccess("_reallocf");
    var _emscripten_stack_init = makeInvalidEarlyAccess("_emscripten_stack_init");
    var _emscripten_stack_get_end = makeInvalidEarlyAccess("_emscripten_stack_get_end");
    var __emscripten_stack_restore = makeInvalidEarlyAccess("__emscripten_stack_restore");
    var __emscripten_stack_alloc = makeInvalidEarlyAccess("__emscripten_stack_alloc");
    var _emscripten_stack_get_current = makeInvalidEarlyAccess("_emscripten_stack_get_current");
    function assignWasmExports(wasmExports2) {
      Module2["_chromaprint_new"] = createExportWrapper("chromaprint_new", 1);
      Module2["_chromaprint_free"] = createExportWrapper("chromaprint_free", 1);
      Module2["_chromaprint_get_delay"] = createExportWrapper("chromaprint_get_delay", 1);
      Module2["_chromaprint_get_delay_ms"] = createExportWrapper("chromaprint_get_delay_ms", 1);
      Module2["_chromaprint_start"] = createExportWrapper("chromaprint_start", 3);
      Module2["_chromaprint_feed"] = createExportWrapper("chromaprint_feed", 3);
      Module2["_chromaprint_finish"] = createExportWrapper("chromaprint_finish", 1);
      Module2["_chromaprint_get_fingerprint"] = createExportWrapper("chromaprint_get_fingerprint", 2);
      Module2["_chromaprint_get_raw_fingerprint"] = createExportWrapper("chromaprint_get_raw_fingerprint", 3);
      Module2["_chromaprint_get_raw_fingerprint_size"] = createExportWrapper("chromaprint_get_raw_fingerprint_size", 2);
      Module2["_chromaprint_clear_fingerprint"] = createExportWrapper("chromaprint_clear_fingerprint", 1);
      _fflush = createExportWrapper("fflush", 1);
      __emscripten_timeout = createExportWrapper("_emscripten_timeout", 2);
      Module2["_strdup"] = createExportWrapper("strdup", 1);
      Module2["_strndup"] = createExportWrapper("strndup", 2);
      Module2["__ZdaPv"] = createExportWrapper("_ZdaPv", 1);
      Module2["__ZdaPvm"] = createExportWrapper("_ZdaPvm", 2);
      Module2["__ZdlPvm"] = createExportWrapper("_ZdlPvm", 2);
      Module2["__Znaj"] = createExportWrapper("_Znaj", 1);
      Module2["__ZnajSt11align_val_t"] = createExportWrapper("_ZnajSt11align_val_t", 2);
      Module2["__Znwj"] = createExportWrapper("_Znwj", 1);
      Module2["__ZnwjSt11align_val_t"] = createExportWrapper("_ZnwjSt11align_val_t", 2);
      Module2["___libc_calloc"] = createExportWrapper("__libc_calloc", 2);
      Module2["___libc_free"] = createExportWrapper("__libc_free", 1);
      Module2["___libc_malloc"] = createExportWrapper("__libc_malloc", 1);
      Module2["___libc_realloc"] = createExportWrapper("__libc_realloc", 2);
      Module2["_emscripten_builtin_calloc"] = createExportWrapper("emscripten_builtin_calloc", 2);
      Module2["_emscripten_builtin_free"] = createExportWrapper("emscripten_builtin_free", 1);
      Module2["_emscripten_builtin_malloc"] = createExportWrapper("emscripten_builtin_malloc", 1);
      Module2["_emscripten_builtin_realloc"] = createExportWrapper("emscripten_builtin_realloc", 2);
      Module2["_free"] = createExportWrapper("free", 1);
      Module2["_malloc"] = createExportWrapper("malloc", 1);
      Module2["_malloc_size"] = createExportWrapper("malloc_size", 1);
      Module2["_malloc_usable_size"] = createExportWrapper("malloc_usable_size", 1);
      Module2["_reallocf"] = createExportWrapper("reallocf", 2);
      _emscripten_stack_init = wasmExports2["emscripten_stack_init"];
      wasmExports2["emscripten_stack_get_free"];
      wasmExports2["emscripten_stack_get_base"];
      _emscripten_stack_get_end = wasmExports2["emscripten_stack_get_end"];
      __emscripten_stack_restore = wasmExports2["_emscripten_stack_restore"];
      __emscripten_stack_alloc = wasmExports2["_emscripten_stack_alloc"];
      _emscripten_stack_get_current = wasmExports2["emscripten_stack_get_current"];
    }
    var wasmImports = { __cxa_throw: ___cxa_throw, _abort_js: __abort_js, _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear, _setitimer_js: __setitimer_js, emscripten_date_now: _emscripten_date_now, emscripten_err: _emscripten_err, emscripten_get_now: _emscripten_get_now, emscripten_resize_heap: _emscripten_resize_heap, environ_get: _environ_get, environ_sizes_get: _environ_sizes_get, fd_close: _fd_close, fd_seek: _fd_seek, fd_write: _fd_write, proc_exit: _proc_exit, random_get: _random_get };
    var wasmExports = await createWasm();
    var calledRun;
    function stackCheckInit() {
      _emscripten_stack_init();
      writeStackCookie();
    }
    function run() {
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      stackCheckInit();
      preRun();
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      function doRun() {
        assert(!calledRun);
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve?.(Module2);
        Module2["onRuntimeInitialized"]?.();
        consumedModuleProp("onRuntimeInitialized");
        assert(!Module2["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
        postRun();
      }
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(() => {
          setTimeout(() => Module2["setStatus"](""), 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
      checkStackCookie();
    }
    function checkUnflushedContent() {
      var oldOut = out;
      var oldErr = err;
      var has = false;
      out = err = (x) => {
        has = true;
      };
      try {
        flush_NO_FILESYSTEM();
      } catch (e) {
      }
      out = oldOut;
      err = oldErr;
      if (has) {
        warnOnce("stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.");
        warnOnce("(this may also be due to not including full filesystem support - try building with -sFORCE_FILESYSTEM)");
      }
    }
    function preInit() {
      if (Module2["preInit"]) {
        if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
        while (Module2["preInit"].length > 0) {
          Module2["preInit"].shift()();
        }
      }
      consumedModuleProp("preInit");
    }
    preInit();
    run();
    if (runtimeInitialized) {
      moduleRtn = Module2;
    } else {
      moduleRtn = new Promise((resolve, reject) => {
        readyPromiseResolve = resolve;
        readyPromiseReject = reject;
      });
    }
    for (const prop of Object.keys(Module2)) {
      if (!(prop in moduleArg)) {
        Object.defineProperty(moduleArg, prop, { configurable: true, get() {
          abort(`Access to module property ('${prop}') is no longer possible via the module constructor argument; Instead, use the result of the module constructor.`);
        } });
      }
    }
    return moduleRtn;
  });
})();
const Module = await createChromaprintModule();
var ChromaprintAlgorithm;
(function(ChromaprintAlgorithm2) {
  ChromaprintAlgorithm2[ChromaprintAlgorithm2["Test1"] = 0] = "Test1";
  ChromaprintAlgorithm2[ChromaprintAlgorithm2["Test2"] = 1] = "Test2";
  ChromaprintAlgorithm2[ChromaprintAlgorithm2["Test3"] = 2] = "Test3";
  ChromaprintAlgorithm2[ChromaprintAlgorithm2["Test4"] = 3] = "Test4";
  ChromaprintAlgorithm2[ChromaprintAlgorithm2["Test5"] = 4] = "Test5";
  ChromaprintAlgorithm2[ChromaprintAlgorithm2["Default"] = 1] = "Default";
})(ChromaprintAlgorithm || (ChromaprintAlgorithm = {}));
const defaultConfig = {
  maxDuration: 120,
  chunkDuration: 0,
  algorithm: ChromaprintAlgorithm.Default,
  rawOutput: false,
  overlap: false
};
function getFingerprint(config, ctx) {
  if (config.rawOutput) {
    const sizePtr = Module._malloc(4);
    const dataPtr = Module._malloc(4);
    const rawDataPtr = Module.HEAP32[dataPtr / 4];
    try {
      if (!Module._chromaprint_get_raw_fingerprint_size(ctx, sizePtr)) {
        throw new Error("Could not get fingerprinting size");
      }
      const size = Module.HEAP32[sizePtr / 4];
      if (size <= 0) {
        throw new Error("Empty fingerprint");
      }
      if (!Module._chromaprint_get_raw_fingerprint(ctx, dataPtr, sizePtr)) {
        throw new Error("Could not get raw fingerprint");
      }
      const rawData = [];
      for (let i = 0; i < size; i++) {
        rawData.push(Module.HEAP32[(rawDataPtr + i * 4) / 4]);
      }
      return rawData.join(",");
    } finally {
      Module._free(sizePtr);
      Module._free(rawDataPtr);
      Module._free(dataPtr);
    }
  } else {
    const fpPtr = Module._malloc(4);
    if (!Module._chromaprint_get_fingerprint(ctx, fpPtr)) {
      throw new Error("Failed to get fingerprint");
    }
    const cStrFp = Module.HEAP32[fpPtr / 4];
    const fp = Module.UTF8ToString(cStrFp);
    Module._free(fpPtr);
    Module._free(cStrFp);
    return fp;
  }
}
async function* processAudioFile(file, config = defaultConfig) {
  try {
    const audioBuffer = await decodeAudioFile(file);
    const pcmData = convertPcmF32ToI16(config, audioBuffer);
    const ctx = Module._chromaprint_new(1);
    if (!ctx) {
      throw new Error("Failed to create Chromaprint context");
    }
    try {
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      if (!Module._chromaprint_start(ctx, sampleRate, channels)) {
        throw new Error("Failed to start fingerprinting");
      }
      yield* processAudioData(config, ctx, pcmData, sampleRate, channels);
    } finally {
      Module._chromaprint_free(ctx);
    }
  } catch (error) {
    throw new Error(`Failed processing file: ${error instanceof Error ? error.message : error}`);
  }
}
async function decodeAudioFile(buffer) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return await audioContext.decodeAudioData(buffer);
}
function convertPcmF32ToI16(config, audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = Math.min(audioBuffer.length, config.maxDuration * audioBuffer.sampleRate * audioBuffer.numberOfChannels);
  const pcmData = new Int16Array(length * numberOfChannels);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      pcmData[i * numberOfChannels + channel] = sample * 32767;
    }
  }
  return pcmData;
}
async function* processAudioData(config, ctx, pcmData, sampleRate, channels) {
  const maxSamples = config.maxDuration * sampleRate * channels;
  const chunkSamples = config.chunkDuration > 0 ? config.chunkDuration * sampleRate * channels : 0;
  let processedSamples = 0;
  let chunkCount = 0;
  const dataPtr = Module._malloc(pcmData.length * 2);
  try {
    Module.HEAP16.set(pcmData, dataPtr / 2);
    if (chunkSamples > 0) {
      while (processedSamples < Math.min(pcmData.length, maxSamples)) {
        const remainingSamples = Math.min(pcmData.length - processedSamples, maxSamples - processedSamples);
        const currentChunkSamples = Math.min(chunkSamples, remainingSamples);
        if (!Module._chromaprint_feed(ctx, dataPtr + processedSamples * 2, currentChunkSamples)) {
          throw new Error("Failed to feed audio data");
        }
        processedSamples += currentChunkSamples;
        if (!Module._chromaprint_finish(ctx)) {
          throw new Error("Failed to finish fingerprinting");
        }
        const fingerprint = getFingerprint(config, ctx);
        yield fingerprint;
        chunkCount++;
        if (processedSamples < Math.min(pcmData.length, maxSamples)) {
          if (config.overlap) {
            Module._chromaprint_clear_fingerprint(ctx);
          }
          Module._chromaprint_start(ctx, sampleRate, channels);
        }
      }
    } else {
      const samplesToProcess = Math.min(pcmData.length, maxSamples);
      if (!Module._chromaprint_feed(ctx, dataPtr, samplesToProcess)) {
        throw new Error("Failed to feed audio data");
      }
      if (!Module._chromaprint_finish(ctx)) {
        throw new Error("Failed to finish fingerprinting");
      }
      const fingerprint = getFingerprint(config, ctx);
      yield fingerprint;
    }
  } finally {
    Module._free(dataPtr);
  }
}
async function generateFingerprint(audioFilePath) {
  try {
    if (!fs$1.existsSync(audioFilePath)) {
      console.error(`Audio file not found: ${audioFilePath}`);
      return null;
    }
    const fileBuffer = fs$1.readFileSync(audioFilePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
    const fingerprintGenerator = processAudioFile(arrayBuffer);
    const result = await fingerprintGenerator.next();
    if (result.done || !result.value) {
      console.error(`Failed to generate fingerprint for ${audioFilePath}`);
      return null;
    }
    return result.value;
  } catch (error) {
    console.error(`Failed to generate fingerprint for ${audioFilePath}:`, error);
    return null;
  }
}
async function getAudioDuration(audioFilePath) {
  try {
    const { parseFile: parseFile2 } = await Promise.resolve().then(() => index);
    const metadata = await parseFile2(audioFilePath);
    return metadata.format.duration || null;
  } catch (error) {
    console.error(`Failed to get audio duration for ${audioFilePath}:`, error);
    return null;
  }
}
const ACOUSTID_API_KEY = "48H8QTB2n3";
const ACOUSTID_API_URL = "https://api.acoustid.org/v2/lookup";
async function lookupFingerprint(fingerprint, duration) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      client: ACOUSTID_API_KEY,
      fingerprint,
      duration: Math.round(duration).toString(),
      meta: "recordings"
      // Include recording metadata
    });
    const url = `${ACOUSTID_API_URL}?${params.toString()}`;
    console.log("🔍 Sending to AcoustID API:");
    console.log("   Fingerprint:", fingerprint.substring(0, 50) + "...");
    console.log("   Duration:", duration, "seconds");
    console.log("   URL:", url);
    https.get(url, {
      headers: {
        "User-Agent": "Music-Sync-App/1.0"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          console.log("✅ AcoustID API Response:");
          console.log(JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          console.error("❌ Failed to parse AcoustID response:", error);
          reject(new Error("Failed to parse AcoustID response"));
        }
      });
    }).on("error", (error) => {
      console.error("❌ AcoustID API Error:", error);
      reject(error);
    });
  });
}
const SCAN_DELAY_MS = 5e3;
const ACOUSTID_RATE_LIMIT_MS = 1e3;
let isScanning = false;
let scanCancelled = false;
async function scanMetadataForSongs(musicFolderPath, onProgress) {
  if (isScanning) {
    console.log("⚠️ Scan already in progress");
    return;
  }
  isScanning = true;
  scanCancelled = false;
  try {
    console.log("📁 Scanning music folder:", musicFolderPath);
    const musicFiles = await scanMusicFiles(musicFolderPath);
    if (musicFiles.length === 0) {
      console.log("❌ No music files found");
      return;
    }
    console.log(`✅ Found ${musicFiles.length} music files`);
    console.log("🎵 Starting metadata scan (5 seconds between files)...\n");
    let lastAcoustIDCall = 0;
    for (let i = 0; i < musicFiles.length; i++) {
      if (scanCancelled) {
        console.log("\n⚠️ Scan cancelled by user");
        break;
      }
      const file = musicFiles[i];
      const filePath = file.path;
      if (!fs$1.existsSync(filePath)) {
        console.log(`⚠️ File not found: ${filePath}`);
        continue;
      }
      onProgress?.(i + 1, musicFiles.length, file.name);
      console.log(`
[${i + 1}/${musicFiles.length}] Processing: ${file.name}`);
      console.log("   Path:", filePath);
      try {
        console.log("🔍 Step 1: Generating fingerprint...");
        const fingerprint = await generateFingerprint(filePath);
        if (!fingerprint) {
          console.log("   ❌ Failed to generate fingerprint");
          await new Promise((resolve) => setTimeout(resolve, SCAN_DELAY_MS));
          continue;
        }
        console.log("   ✅ Fingerprint generated:");
        console.log("   ", fingerprint.substring(0, 80) + "...");
        console.log("⏱️  Step 2: Getting audio duration...");
        const duration = await getAudioDuration(filePath);
        if (!duration) {
          console.log("   ❌ Failed to get duration");
          await new Promise((resolve) => setTimeout(resolve, SCAN_DELAY_MS));
          continue;
        }
        console.log("   ✅ Duration:", duration, "seconds");
        const timeSinceLastCall = Date.now() - lastAcoustIDCall;
        if (timeSinceLastCall < ACOUSTID_RATE_LIMIT_MS) {
          const waitTime = ACOUSTID_RATE_LIMIT_MS - timeSinceLastCall;
          console.log(`   ⏳ Waiting ${waitTime}ms to respect AcoustID rate limit...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
        console.log("🌐 Step 3: Sending to AcoustID API...");
        lastAcoustIDCall = Date.now();
        const acoustidResponse = await lookupFingerprint(fingerprint, duration);
        console.log("   ✅ AcoustID Response received");
        console.log("   Status:", acoustidResponse.status);
        if (acoustidResponse.results && acoustidResponse.results.length > 0) {
          console.log("   Results:", acoustidResponse.results.length, "match(es)");
          acoustidResponse.results.forEach((result, idx) => {
            console.log(`   Result ${idx + 1}:`);
            console.log(`     Score: ${result.score}`);
            console.log(`     Recordings: ${result.recordings?.length || 0}`);
            if (result.recordings) {
              result.recordings.forEach((recording, recIdx) => {
                console.log(`       Recording ${recIdx + 1}:`);
                console.log(`         MBID: ${recording.id}`);
                console.log(`         Title: ${recording.title || "N/A"}`);
              });
            }
          });
        } else {
          console.log("   ℹ️  No matches found in AcoustID database");
        }
        if (i < musicFiles.length - 1) {
          console.log(`
⏳ Waiting 5 seconds before next file...`);
          await new Promise((resolve) => setTimeout(resolve, SCAN_DELAY_MS));
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${file.name}:`, error);
        await new Promise((resolve) => setTimeout(resolve, SCAN_DELAY_MS));
      }
    }
    console.log("\n✅ Metadata scan complete!");
  } catch (error) {
    console.error("❌ Error during metadata scan:", error);
    throw error;
  } finally {
    isScanning = false;
    scanCancelled = false;
  }
}
function cancelMetadataScan() {
  if (isScanning) {
    scanCancelled = true;
    console.log("🛑 Cancelling metadata scan...");
  }
}
function isMetadataScanInProgress() {
  return isScanning;
}
function registerIpcHandlers() {
  ipcMain.handle("scan-music-folder", async (_event, folderPath) => {
    try {
      return await scanMusicFiles(folderPath);
    } catch (error) {
      console.error("Error scanning folder:", error);
      throw error;
    }
  });
  ipcMain.handle("select-music-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Music Folder"
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
  ipcMain.on("playback-state-changed", (_event, isPlaying2) => {
    updatePlaybackState(isPlaying2);
  });
  ipcMain.on("window-visibility-changed", (_event, visible) => {
    updateWindowVisibility();
  });
  ipcMain.on("window-minimize", (event) => {
    const window2 = BrowserWindow.fromWebContents(event.sender);
    window2?.minimize();
  });
  ipcMain.on("window-maximize", (event) => {
    const window2 = BrowserWindow.fromWebContents(event.sender);
    if (window2?.isMaximized()) {
      window2.unmaximize();
      window2.webContents.send("window-state-changed", false);
    } else {
      window2?.maximize();
      window2?.webContents.send("window-state-changed", true);
    }
  });
  ipcMain.on("window-close", (event) => {
    const window2 = BrowserWindow.fromWebContents(event.sender);
    window2?.close();
  });
  ipcMain.handle("download-youtube", async (event, url, outputPath) => {
    const window2 = BrowserWindow.fromWebContents(event.sender);
    try {
      const result = await downloadYouTubeAudio({
        url,
        outputPath,
        onProgress: (progress) => {
          window2?.webContents.send("download-progress", progress);
        },
        onBinaryProgress: (progress) => {
          window2?.webContents.send("binary-download-progress", progress);
        },
        onTitleReceived: (title) => {
          window2?.webContents.send("download-title", title);
        }
      });
      return result;
    } catch (error) {
      console.error("YouTube download error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  });
  ipcMain.handle("get-settings", async () => {
    try {
      return getStoredSettings();
    } catch (error) {
      console.error("Error getting settings:", error);
      return {
        musicFolderPath: null,
        downloadFolderPath: null
      };
    }
  });
  ipcMain.handle("save-settings", async (_event, settings) => {
    try {
      saveSettings(settings);
      return { success: true };
    } catch (error) {
      console.error("Error saving settings:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  });
  ipcMain.handle("select-download-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Download Folder"
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
  ipcMain.handle("get-binary-statuses", async () => {
    try {
      return await getAllBinaryStatuses();
    } catch (error) {
      console.error("Error getting binary statuses:", error);
      return [];
    }
  });
  ipcMain.handle("get-platform-info", async () => {
    return {
      platform: process.platform,
      arch: process.arch
    };
  });
  ipcMain.handle("scan-metadata", async (_event, musicFolderPath) => {
    try {
      await scanMetadataForSongs(musicFolderPath, (current, total, fileName) => {
        BrowserWindow.getAllWindows().forEach((window2) => {
          window2.webContents.send("metadata-scan-progress", {
            current,
            total,
            fileName
          });
        });
      });
      return { success: true };
    } catch (error) {
      console.error("Error scanning metadata:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  });
  ipcMain.handle("cancel-metadata-scan", async () => {
    cancelMetadataScan();
    return { success: true };
  });
  ipcMain.handle("is-metadata-scan-in-progress", async () => {
    return isMetadataScanInProgress();
  });
}
Menu.setApplicationMenu(null);
registerIpcHandlers();
setupWindowEvents();
app.whenReady().then(() => {
  globalShortcut.register("F12", () => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win2) => {
      if (win2.webContents.isDevToolsOpened()) {
        win2.webContents.closeDevTools();
      } else {
        win2.webContents.openDevTools();
      }
    });
  });
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win2) => {
      if (win2.webContents.isDevToolsOpened()) {
        win2.webContents.closeDevTools();
      } else {
        win2.webContents.openDevTools();
      }
    });
  });
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
app.whenReady().then(async () => {
  const window2 = createWindow();
  createTray();
  window2.on("show", () => {
    updateWindowVisibility();
  });
  window2.on("hide", () => {
    updateWindowVisibility();
  });
});
export {
  AttachedPictureType as A,
  BasicParser as B,
  UINT24_BE as C,
  Token as D,
  EndOfStreamError as E,
  FourCcToken as F,
  textDecode as G,
  Genres as H,
  INT16_BE as I,
  tryParseApeHeader as J,
  trimRightNull as K,
  ID3v2Header as L,
  ID3v1Parser as M,
  UINT24_LE as N,
  TextEncodingToken as O,
  findZero as P,
  decodeUintBE as Q,
  TextHeader as R,
  StringType as S,
  TrackType as T,
  UINT32_BE as U,
  SyncTextHeader as V,
  ExtendedHeader as W,
  UINT32SYNCSAFE as X,
  UINT16_BE as a,
  UINT8 as b,
  initDebug as c,
  Uint8ArrayType as d,
  decodeString as e,
  UINT32_LE as f,
  getBitAllignedNumber as g,
  hexToUint8Array as h,
  isBitSet$1 as i,
  UINT64_LE as j,
  UINT16_LE as k,
  getBit as l,
  makeUnexpectedFileContentError as m,
  INT64_BE as n,
  fromBuffer as o,
  INT64_LE as p,
  INT32_LE as q,
  Float64_BE as r,
  stripNulls as s,
  Float32_BE as t,
  uint8ArrayToHex as u,
  UINT64_BE as v,
  TargetType as w,
  INT32_BE as x,
  INT24_BE as y,
  INT8 as z
};
