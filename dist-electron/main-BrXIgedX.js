import { app, BrowserWindow, ipcMain, dialog, nativeImage, Tray, Menu, globalShortcut } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import path$1 from "path";
import fs from "fs";
import fs$1 from "node:fs";
import { open } from "node:fs/promises";
import require$$1 from "tty";
import require$$1$1, { promisify } from "util";
import require$$0 from "os";
import crypto from "crypto";
import axios from "axios";
import require$$0$1 from "events";
import require$$1$2, { execFile } from "child_process";
import https from "https";
import require$$5 from "stream";
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
function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, "__esModule")) return n;
  var f = n.default;
  if (typeof f == "function") {
    var a = function a2() {
      var isInstance = false;
      try {
        isInstance = this instanceof a2;
      } catch {
      }
      if (isInstance) {
        return Reflect.construct(f, arguments, this.constructor);
      }
      return f.apply(this, arguments);
    };
    a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n).forEach(function(k) {
    var d = Object.getOwnPropertyDescriptor(n, k);
    Object.defineProperty(a, k, d.get ? d : {
      enumerable: true,
      get: function() {
        return n[k];
      }
    });
  });
  return a;
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
        let index = 0;
        args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
          if (match === "%%") {
            return "%";
          }
          index++;
          const formatter = createDebug.formatters[format];
          if (typeof formatter === "function") {
            const val = args[index];
            match = formatter.call(self, val);
            args.splice(index, 1);
            index--;
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
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
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
    const util2 = require$$1$1;
    exports$1.init = init;
    exports$1.log = log;
    exports$1.formatArgs = formatArgs;
    exports$1.save = save;
    exports$1.load = load;
    exports$1.useColors = useColors;
    exports$1.destroy = util2.deprecate(
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
      return process.stderr.write(util2.formatWithOptions(exports$1.inspectOpts, ...args) + "\n");
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
      return util2.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts);
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
const Debug = /* @__PURE__ */ getDefaultExportFromCjs(srcExports);
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
const debug$5 = Debug("tokenizer:inflate");
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
const byteToHexLookupTable = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, "0"));
function uint8ArrayToHex(array) {
  assertUint8Array(array);
  let hexString = "";
  for (let index = 0; index < array.length; index++) {
    hexString += byteToHexLookupTable[array[index]];
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
  for (let index = 0; index < resultLength; index++) {
    const highNibble = hexToDecimalLookupTable[hexString[index * 2]];
    const lowNibble = hexToDecimalLookupTable[hexString[index * 2 + 1]];
    if (highNibble === void 0 || lowNibble === void 0) {
      throw new Error(`Invalid Hex character encountered at position ${index * 2}`);
    }
    bytes[index] = highNibble << 4 | lowNibble;
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
    for (let index = 0; index < string.length; index++) {
      const code = string.charCodeAt(index);
      bytes.push(code & 255, code >> 8 & 255);
    }
    return bytes;
  }
  if (encoding === "utf-16be") {
    const bytes = [];
    for (let index = 0; index < string.length; index++) {
      const code = string.charCodeAt(index);
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
  for (let index = offset; index < offset + 148; index++) {
    sum += arrayBuffer[index];
  }
  for (let index = offset + 156; index < offset + 512; index++) {
    sum += arrayBuffer[index];
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
  for (const [index, header] of headers.entries()) {
    if (options.mask) {
      if (header !== (options.mask[index] & buffer[index + options.offset])) {
        return false;
      }
    } else if (header !== buffer[index + options.offset]) {
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
    var index = header.indexOf(";");
    var type = index !== -1 ? header.slice(0, index).trim() : header.trim();
    if (!TYPE_REGEXP.test(type)) {
      throw new TypeError("invalid media type");
    }
    var obj = new ContentType2(type.toLowerCase());
    if (index !== -1) {
      var key;
      var match;
      var value;
      PARAM_REGEXP.lastIndex = index;
      while (match = PARAM_REGEXP.exec(header)) {
        if (match.index !== index) {
          throw new TypeError("invalid parameter format");
        }
        index += match[0].length;
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
      if (index !== header.length) {
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
    var index = subtype.lastIndexOf("+");
    if (index !== -1) {
      suffix = subtype.substr(index + 1);
      subtype = subtype.substr(0, index);
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
const debug$4 = Debug("music-metadata:collector");
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
    return (await import("./MpegParser-B3_hYLo3.js")).MpegParser;
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
    return (await import("./AsfParser-CqjnP1LD.js")).AsfParser;
  }
};
const dsdiffParserLoader = {
  parserType: "dsdiff",
  extensions: [".dff"],
  mimeTypes: ["audio/dsf", "audio/dsd"],
  async load() {
    return (await import("./DsdiffParser-Da0QLVFM.js")).DsdiffParser;
  }
};
const aiffParserLoader = {
  parserType: "aiff",
  extensions: [".aif", "aiff", "aifc"],
  mimeTypes: ["audio/aiff", "audio/aif", "audio/aifc", "application/aiff"],
  async load() {
    return (await import("./AiffParser-DPKmeS07.js")).AIFFParser;
  }
};
const dsfParserLoader = {
  parserType: "dsf",
  extensions: [".dsf"],
  mimeTypes: ["audio/dsf"],
  async load() {
    return (await import("./DsfParser-BQzP3F_0.js")).DsfParser;
  }
};
const flacParserLoader = {
  parserType: "flac",
  extensions: [".flac"],
  mimeTypes: ["audio/flac"],
  async load() {
    return (await import("./FlacParser-B6wSN7v1.js").then((n) => n.d)).FlacParser;
  }
};
const matroskaParserLoader = {
  parserType: "matroska",
  extensions: [".mka", ".mkv", ".mk3d", ".mks", "webm"],
  mimeTypes: ["audio/matroska", "video/matroska", "audio/webm", "video/webm"],
  async load() {
    return (await import("./MatroskaParser-DL9qMiph.js")).MatroskaParser;
  }
};
const mp4ParserLoader = {
  parserType: "mp4",
  extensions: [".mp4", ".m4a", ".m4b", ".m4pa", "m4v", "m4r", "3gp", ".mov", ".movie", ".qt"],
  mimeTypes: ["audio/mp4", "audio/m4a", "video/m4v", "video/mp4", "video/quicktime"],
  async load() {
    return (await import("./MP4Parser-C-TzXdad.js")).MP4Parser;
  }
};
const musepackParserLoader = {
  parserType: "musepack",
  extensions: [".mpc"],
  mimeTypes: ["audio/musepack"],
  async load() {
    return (await import("./MusepackParser-DjDWWDD9.js")).MusepackParser;
  }
};
const oggParserLoader = {
  parserType: "ogg",
  extensions: [".ogg", ".ogv", ".oga", ".ogm", ".ogx", ".opus", ".spx"],
  mimeTypes: ["audio/ogg", "audio/opus", "audio/speex", "video/ogg"],
  // RFC 7845, RFC 6716, RFC 5574
  async load() {
    return (await import("./OggParser-CWBOapKY.js")).OggParser;
  }
};
const wavpackParserLoader = {
  parserType: "wavpack",
  extensions: [".wv", ".wvp"],
  mimeTypes: ["audio/wavpack"],
  async load() {
    return (await import("./WavPackParser-2X1k9nnz.js")).WavPackParser;
  }
};
const riffParserLoader = {
  parserType: "riff",
  extensions: [".wav", "wave", ".bwf"],
  mimeTypes: ["audio/vnd.wave", "audio/wav", "audio/wave"],
  async load() {
    return (await import("./WaveParser-C0Yg-sPu.js")).WaveParser;
  }
};
const debug$3 = Debug("music-metadata:parser:factory");
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
const debug$2 = Debug("music-metadata:parser:APEv2");
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
const debug$1 = Debug("music-metadata:parser:ID3v1");
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
const debug = Debug("music-metadata:parser");
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
var lib = { exports: {} };
function commonjsRequire(path2) {
  throw new Error('Could not dynamically require "' + path2 + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var util = {};
var hasRequiredUtil;
function requireUtil() {
  if (hasRequiredUtil) return util;
  hasRequiredUtil = 1;
  util.getBooleanOption = (options, key) => {
    let value = false;
    if (key in options && typeof (value = options[key]) !== "boolean") {
      throw new TypeError(`Expected the "${key}" option to be a boolean`);
    }
    return value;
  };
  util.cppdb = Symbol();
  util.inspect = Symbol.for("nodejs.util.inspect.custom");
  return util;
}
var sqliteError;
var hasRequiredSqliteError;
function requireSqliteError() {
  if (hasRequiredSqliteError) return sqliteError;
  hasRequiredSqliteError = 1;
  const descriptor = { value: "SqliteError", writable: true, enumerable: false, configurable: true };
  function SqliteError(message, code) {
    if (new.target !== SqliteError) {
      return new SqliteError(message, code);
    }
    if (typeof code !== "string") {
      throw new TypeError("Expected second argument to be a string");
    }
    Error.call(this, message);
    descriptor.value = "" + message;
    Object.defineProperty(this, "message", descriptor);
    Error.captureStackTrace(this, SqliteError);
    this.code = code;
  }
  Object.setPrototypeOf(SqliteError, Error);
  Object.setPrototypeOf(SqliteError.prototype, Error.prototype);
  Object.defineProperty(SqliteError.prototype, "name", descriptor);
  sqliteError = SqliteError;
  return sqliteError;
}
var bindings = { exports: {} };
var fileUriToPath_1;
var hasRequiredFileUriToPath;
function requireFileUriToPath() {
  if (hasRequiredFileUriToPath) return fileUriToPath_1;
  hasRequiredFileUriToPath = 1;
  var sep = path$1.sep || "/";
  fileUriToPath_1 = fileUriToPath;
  function fileUriToPath(uri) {
    if ("string" != typeof uri || uri.length <= 7 || "file://" != uri.substring(0, 7)) {
      throw new TypeError("must pass in a file:// URI to convert to a file path");
    }
    var rest = decodeURI(uri.substring(7));
    var firstSlash = rest.indexOf("/");
    var host = rest.substring(0, firstSlash);
    var path2 = rest.substring(firstSlash + 1);
    if ("localhost" == host) host = "";
    if (host) {
      host = sep + sep + host;
    }
    path2 = path2.replace(/^(.+)\|/, "$1:");
    if (sep == "\\") {
      path2 = path2.replace(/\//g, "\\");
    }
    if (/^.+\:/.test(path2)) ;
    else {
      path2 = sep + path2;
    }
    return host + path2;
  }
  return fileUriToPath_1;
}
var hasRequiredBindings;
function requireBindings() {
  if (hasRequiredBindings) return bindings.exports;
  hasRequiredBindings = 1;
  (function(module, exports$1) {
    var fs$12 = fs, path2 = path$1, fileURLToPath2 = requireFileUriToPath(), join = path2.join, dirname = path2.dirname, exists = fs$12.accessSync && function(path22) {
      try {
        fs$12.accessSync(path22);
      } catch (e) {
        return false;
      }
      return true;
    } || fs$12.existsSync || path2.existsSync, defaults = {
      arrow: process.env.NODE_BINDINGS_ARROW || " → ",
      compiled: process.env.NODE_BINDINGS_COMPILED_DIR || "compiled",
      platform: process.platform,
      arch: process.arch,
      nodePreGyp: "node-v" + process.versions.modules + "-" + process.platform + "-" + process.arch,
      version: process.versions.node,
      bindings: "bindings.node",
      try: [
        // node-gyp's linked version in the "build" dir
        ["module_root", "build", "bindings"],
        // node-waf and gyp_addon (a.k.a node-gyp)
        ["module_root", "build", "Debug", "bindings"],
        ["module_root", "build", "Release", "bindings"],
        // Debug files, for development (legacy behavior, remove for node v0.9)
        ["module_root", "out", "Debug", "bindings"],
        ["module_root", "Debug", "bindings"],
        // Release files, but manually compiled (legacy behavior, remove for node v0.9)
        ["module_root", "out", "Release", "bindings"],
        ["module_root", "Release", "bindings"],
        // Legacy from node-waf, node <= 0.4.x
        ["module_root", "build", "default", "bindings"],
        // Production "Release" buildtype binary (meh...)
        ["module_root", "compiled", "version", "platform", "arch", "bindings"],
        // node-qbs builds
        ["module_root", "addon-build", "release", "install-root", "bindings"],
        ["module_root", "addon-build", "debug", "install-root", "bindings"],
        ["module_root", "addon-build", "default", "install-root", "bindings"],
        // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
        ["module_root", "lib", "binding", "nodePreGyp", "bindings"]
      ]
    };
    function bindings2(opts) {
      if (typeof opts == "string") {
        opts = { bindings: opts };
      } else if (!opts) {
        opts = {};
      }
      Object.keys(defaults).map(function(i2) {
        if (!(i2 in opts)) opts[i2] = defaults[i2];
      });
      if (!opts.module_root) {
        opts.module_root = exports$1.getRoot(exports$1.getFileName());
      }
      if (path2.extname(opts.bindings) != ".node") {
        opts.bindings += ".node";
      }
      var requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
      var tries = [], i = 0, l = opts.try.length, n, b, err;
      for (; i < l; i++) {
        n = join.apply(
          null,
          opts.try[i].map(function(p) {
            return opts[p] || p;
          })
        );
        tries.push(n);
        try {
          b = opts.path ? requireFunc.resolve(n) : requireFunc(n);
          if (!opts.path) {
            b.path = n;
          }
          return b;
        } catch (e) {
          if (e.code !== "MODULE_NOT_FOUND" && e.code !== "QUALIFIED_PATH_RESOLUTION_FAILED" && !/not find/i.test(e.message)) {
            throw e;
          }
        }
      }
      err = new Error(
        "Could not locate the bindings file. Tried:\n" + tries.map(function(a) {
          return opts.arrow + a;
        }).join("\n")
      );
      err.tries = tries;
      throw err;
    }
    module.exports = exports$1 = bindings2;
    exports$1.getFileName = function getFileName(calling_file) {
      var origPST = Error.prepareStackTrace, origSTL = Error.stackTraceLimit, dummy = {}, fileName;
      Error.stackTraceLimit = 10;
      Error.prepareStackTrace = function(e, st) {
        for (var i = 0, l = st.length; i < l; i++) {
          fileName = st[i].getFileName();
          if (fileName !== __filename) {
            if (calling_file) {
              if (fileName !== calling_file) {
                return;
              }
            } else {
              return;
            }
          }
        }
      };
      Error.captureStackTrace(dummy);
      dummy.stack;
      Error.prepareStackTrace = origPST;
      Error.stackTraceLimit = origSTL;
      var fileSchema = "file://";
      if (fileName.indexOf(fileSchema) === 0) {
        fileName = fileURLToPath2(fileName);
      }
      return fileName;
    };
    exports$1.getRoot = function getRoot(file) {
      var dir = dirname(file), prev;
      while (true) {
        if (dir === ".") {
          dir = process.cwd();
        }
        if (exists(join(dir, "package.json")) || exists(join(dir, "node_modules"))) {
          return dir;
        }
        if (prev === dir) {
          throw new Error(
            'Could not find module root given file: "' + file + '". Do you have a `package.json` file? '
          );
        }
        prev = dir;
        dir = join(dir, "..");
      }
    };
  })(bindings, bindings.exports);
  return bindings.exports;
}
var wrappers = {};
var hasRequiredWrappers;
function requireWrappers() {
  if (hasRequiredWrappers) return wrappers;
  hasRequiredWrappers = 1;
  const { cppdb } = requireUtil();
  wrappers.prepare = function prepare(sql) {
    return this[cppdb].prepare(sql, this, false);
  };
  wrappers.exec = function exec(sql) {
    this[cppdb].exec(sql);
    return this;
  };
  wrappers.close = function close() {
    this[cppdb].close();
    return this;
  };
  wrappers.loadExtension = function loadExtension(...args) {
    this[cppdb].loadExtension(...args);
    return this;
  };
  wrappers.defaultSafeIntegers = function defaultSafeIntegers(...args) {
    this[cppdb].defaultSafeIntegers(...args);
    return this;
  };
  wrappers.unsafeMode = function unsafeMode(...args) {
    this[cppdb].unsafeMode(...args);
    return this;
  };
  wrappers.getters = {
    name: {
      get: function name() {
        return this[cppdb].name;
      },
      enumerable: true
    },
    open: {
      get: function open2() {
        return this[cppdb].open;
      },
      enumerable: true
    },
    inTransaction: {
      get: function inTransaction() {
        return this[cppdb].inTransaction;
      },
      enumerable: true
    },
    readonly: {
      get: function readonly() {
        return this[cppdb].readonly;
      },
      enumerable: true
    },
    memory: {
      get: function memory() {
        return this[cppdb].memory;
      },
      enumerable: true
    }
  };
  return wrappers;
}
var transaction;
var hasRequiredTransaction;
function requireTransaction() {
  if (hasRequiredTransaction) return transaction;
  hasRequiredTransaction = 1;
  const { cppdb } = requireUtil();
  const controllers = /* @__PURE__ */ new WeakMap();
  transaction = function transaction2(fn) {
    if (typeof fn !== "function") throw new TypeError("Expected first argument to be a function");
    const db = this[cppdb];
    const controller = getController(db, this);
    const { apply } = Function.prototype;
    const properties = {
      default: { value: wrapTransaction(apply, fn, db, controller.default) },
      deferred: { value: wrapTransaction(apply, fn, db, controller.deferred) },
      immediate: { value: wrapTransaction(apply, fn, db, controller.immediate) },
      exclusive: { value: wrapTransaction(apply, fn, db, controller.exclusive) },
      database: { value: this, enumerable: true }
    };
    Object.defineProperties(properties.default.value, properties);
    Object.defineProperties(properties.deferred.value, properties);
    Object.defineProperties(properties.immediate.value, properties);
    Object.defineProperties(properties.exclusive.value, properties);
    return properties.default.value;
  };
  const getController = (db, self) => {
    let controller = controllers.get(db);
    if (!controller) {
      const shared = {
        commit: db.prepare("COMMIT", self, false),
        rollback: db.prepare("ROLLBACK", self, false),
        savepoint: db.prepare("SAVEPOINT `	_bs3.	`", self, false),
        release: db.prepare("RELEASE `	_bs3.	`", self, false),
        rollbackTo: db.prepare("ROLLBACK TO `	_bs3.	`", self, false)
      };
      controllers.set(db, controller = {
        default: Object.assign({ begin: db.prepare("BEGIN", self, false) }, shared),
        deferred: Object.assign({ begin: db.prepare("BEGIN DEFERRED", self, false) }, shared),
        immediate: Object.assign({ begin: db.prepare("BEGIN IMMEDIATE", self, false) }, shared),
        exclusive: Object.assign({ begin: db.prepare("BEGIN EXCLUSIVE", self, false) }, shared)
      });
    }
    return controller;
  };
  const wrapTransaction = (apply, fn, db, { begin, commit, rollback, savepoint, release, rollbackTo }) => function sqliteTransaction() {
    let before, after, undo;
    if (db.inTransaction) {
      before = savepoint;
      after = release;
      undo = rollbackTo;
    } else {
      before = begin;
      after = commit;
      undo = rollback;
    }
    before.run();
    try {
      const result = apply.call(fn, this, arguments);
      if (result && typeof result.then === "function") {
        throw new TypeError("Transaction function cannot return a promise");
      }
      after.run();
      return result;
    } catch (ex) {
      if (db.inTransaction) {
        undo.run();
        if (undo !== rollback) after.run();
      }
      throw ex;
    }
  };
  return transaction;
}
var pragma;
var hasRequiredPragma;
function requirePragma() {
  if (hasRequiredPragma) return pragma;
  hasRequiredPragma = 1;
  const { getBooleanOption, cppdb } = requireUtil();
  pragma = function pragma2(source, options) {
    if (options == null) options = {};
    if (typeof source !== "string") throw new TypeError("Expected first argument to be a string");
    if (typeof options !== "object") throw new TypeError("Expected second argument to be an options object");
    const simple = getBooleanOption(options, "simple");
    const stmt = this[cppdb].prepare(`PRAGMA ${source}`, this, true);
    return simple ? stmt.pluck().get() : stmt.all();
  };
  return pragma;
}
var backup;
var hasRequiredBackup;
function requireBackup() {
  if (hasRequiredBackup) return backup;
  hasRequiredBackup = 1;
  const fs$12 = fs;
  const path2 = path$1;
  const { promisify: promisify2 } = require$$1$1;
  const { cppdb } = requireUtil();
  const fsAccess = promisify2(fs$12.access);
  backup = async function backup2(filename, options) {
    if (options == null) options = {};
    if (typeof filename !== "string") throw new TypeError("Expected first argument to be a string");
    if (typeof options !== "object") throw new TypeError("Expected second argument to be an options object");
    filename = filename.trim();
    const attachedName = "attached" in options ? options.attached : "main";
    const handler = "progress" in options ? options.progress : null;
    if (!filename) throw new TypeError("Backup filename cannot be an empty string");
    if (filename === ":memory:") throw new TypeError('Invalid backup filename ":memory:"');
    if (typeof attachedName !== "string") throw new TypeError('Expected the "attached" option to be a string');
    if (!attachedName) throw new TypeError('The "attached" option cannot be an empty string');
    if (handler != null && typeof handler !== "function") throw new TypeError('Expected the "progress" option to be a function');
    await fsAccess(path2.dirname(filename)).catch(() => {
      throw new TypeError("Cannot save backup because the directory does not exist");
    });
    const isNewFile = await fsAccess(filename).then(() => false, () => true);
    return runBackup(this[cppdb].backup(this, attachedName, filename, isNewFile), handler || null);
  };
  const runBackup = (backup2, handler) => {
    let rate = 0;
    let useDefault = true;
    return new Promise((resolve, reject) => {
      setImmediate(function step() {
        try {
          const progress = backup2.transfer(rate);
          if (!progress.remainingPages) {
            backup2.close();
            resolve(progress);
            return;
          }
          if (useDefault) {
            useDefault = false;
            rate = 100;
          }
          if (handler) {
            const ret = handler(progress);
            if (ret !== void 0) {
              if (typeof ret === "number" && ret === ret) rate = Math.max(0, Math.min(2147483647, Math.round(ret)));
              else throw new TypeError("Expected progress callback to return a number or undefined");
            }
          }
          setImmediate(step);
        } catch (err) {
          backup2.close();
          reject(err);
        }
      });
    });
  };
  return backup;
}
var serialize;
var hasRequiredSerialize;
function requireSerialize() {
  if (hasRequiredSerialize) return serialize;
  hasRequiredSerialize = 1;
  const { cppdb } = requireUtil();
  serialize = function serialize2(options) {
    if (options == null) options = {};
    if (typeof options !== "object") throw new TypeError("Expected first argument to be an options object");
    const attachedName = "attached" in options ? options.attached : "main";
    if (typeof attachedName !== "string") throw new TypeError('Expected the "attached" option to be a string');
    if (!attachedName) throw new TypeError('The "attached" option cannot be an empty string');
    return this[cppdb].serialize(attachedName);
  };
  return serialize;
}
var _function;
var hasRequired_function;
function require_function() {
  if (hasRequired_function) return _function;
  hasRequired_function = 1;
  const { getBooleanOption, cppdb } = requireUtil();
  _function = function defineFunction(name, options, fn) {
    if (options == null) options = {};
    if (typeof options === "function") {
      fn = options;
      options = {};
    }
    if (typeof name !== "string") throw new TypeError("Expected first argument to be a string");
    if (typeof fn !== "function") throw new TypeError("Expected last argument to be a function");
    if (typeof options !== "object") throw new TypeError("Expected second argument to be an options object");
    if (!name) throw new TypeError("User-defined function name cannot be an empty string");
    const safeIntegers = "safeIntegers" in options ? +getBooleanOption(options, "safeIntegers") : 2;
    const deterministic = getBooleanOption(options, "deterministic");
    const directOnly = getBooleanOption(options, "directOnly");
    const varargs = getBooleanOption(options, "varargs");
    let argCount = -1;
    if (!varargs) {
      argCount = fn.length;
      if (!Number.isInteger(argCount) || argCount < 0) throw new TypeError("Expected function.length to be a positive integer");
      if (argCount > 100) throw new RangeError("User-defined functions cannot have more than 100 arguments");
    }
    this[cppdb].function(fn, name, argCount, safeIntegers, deterministic, directOnly);
    return this;
  };
  return _function;
}
var aggregate;
var hasRequiredAggregate;
function requireAggregate() {
  if (hasRequiredAggregate) return aggregate;
  hasRequiredAggregate = 1;
  const { getBooleanOption, cppdb } = requireUtil();
  aggregate = function defineAggregate(name, options) {
    if (typeof name !== "string") throw new TypeError("Expected first argument to be a string");
    if (typeof options !== "object" || options === null) throw new TypeError("Expected second argument to be an options object");
    if (!name) throw new TypeError("User-defined function name cannot be an empty string");
    const start = "start" in options ? options.start : null;
    const step = getFunctionOption(options, "step", true);
    const inverse = getFunctionOption(options, "inverse", false);
    const result = getFunctionOption(options, "result", false);
    const safeIntegers = "safeIntegers" in options ? +getBooleanOption(options, "safeIntegers") : 2;
    const deterministic = getBooleanOption(options, "deterministic");
    const directOnly = getBooleanOption(options, "directOnly");
    const varargs = getBooleanOption(options, "varargs");
    let argCount = -1;
    if (!varargs) {
      argCount = Math.max(getLength(step), inverse ? getLength(inverse) : 0);
      if (argCount > 0) argCount -= 1;
      if (argCount > 100) throw new RangeError("User-defined functions cannot have more than 100 arguments");
    }
    this[cppdb].aggregate(start, step, inverse, result, name, argCount, safeIntegers, deterministic, directOnly);
    return this;
  };
  const getFunctionOption = (options, key, required) => {
    const value = key in options ? options[key] : null;
    if (typeof value === "function") return value;
    if (value != null) throw new TypeError(`Expected the "${key}" option to be a function`);
    if (required) throw new TypeError(`Missing required option "${key}"`);
    return null;
  };
  const getLength = ({ length }) => {
    if (Number.isInteger(length) && length >= 0) return length;
    throw new TypeError("Expected function.length to be a positive integer");
  };
  return aggregate;
}
var table;
var hasRequiredTable;
function requireTable() {
  if (hasRequiredTable) return table;
  hasRequiredTable = 1;
  const { cppdb } = requireUtil();
  table = function defineTable(name, factory) {
    if (typeof name !== "string") throw new TypeError("Expected first argument to be a string");
    if (!name) throw new TypeError("Virtual table module name cannot be an empty string");
    let eponymous = false;
    if (typeof factory === "object" && factory !== null) {
      eponymous = true;
      factory = defer(parseTableDefinition(factory, "used", name));
    } else {
      if (typeof factory !== "function") throw new TypeError("Expected second argument to be a function or a table definition object");
      factory = wrapFactory(factory);
    }
    this[cppdb].table(factory, name, eponymous);
    return this;
  };
  function wrapFactory(factory) {
    return function virtualTableFactory(moduleName, databaseName, tableName, ...args) {
      const thisObject = {
        module: moduleName,
        database: databaseName,
        table: tableName
      };
      const def = apply.call(factory, thisObject, args);
      if (typeof def !== "object" || def === null) {
        throw new TypeError(`Virtual table module "${moduleName}" did not return a table definition object`);
      }
      return parseTableDefinition(def, "returned", moduleName);
    };
  }
  function parseTableDefinition(def, verb, moduleName) {
    if (!hasOwnProperty.call(def, "rows")) {
      throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition without a "rows" property`);
    }
    if (!hasOwnProperty.call(def, "columns")) {
      throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition without a "columns" property`);
    }
    const rows = def.rows;
    if (typeof rows !== "function" || Object.getPrototypeOf(rows) !== GeneratorFunctionPrototype) {
      throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "rows" property (should be a generator function)`);
    }
    let columns = def.columns;
    if (!Array.isArray(columns) || !(columns = [...columns]).every((x) => typeof x === "string")) {
      throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "columns" property (should be an array of strings)`);
    }
    if (columns.length !== new Set(columns).size) {
      throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with duplicate column names`);
    }
    if (!columns.length) {
      throw new RangeError(`Virtual table module "${moduleName}" ${verb} a table definition with zero columns`);
    }
    let parameters;
    if (hasOwnProperty.call(def, "parameters")) {
      parameters = def.parameters;
      if (!Array.isArray(parameters) || !(parameters = [...parameters]).every((x) => typeof x === "string")) {
        throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "parameters" property (should be an array of strings)`);
      }
    } else {
      parameters = inferParameters(rows);
    }
    if (parameters.length !== new Set(parameters).size) {
      throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with duplicate parameter names`);
    }
    if (parameters.length > 32) {
      throw new RangeError(`Virtual table module "${moduleName}" ${verb} a table definition with more than the maximum number of 32 parameters`);
    }
    for (const parameter of parameters) {
      if (columns.includes(parameter)) {
        throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with column "${parameter}" which was ambiguously defined as both a column and parameter`);
      }
    }
    let safeIntegers = 2;
    if (hasOwnProperty.call(def, "safeIntegers")) {
      const bool = def.safeIntegers;
      if (typeof bool !== "boolean") {
        throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "safeIntegers" property (should be a boolean)`);
      }
      safeIntegers = +bool;
    }
    let directOnly = false;
    if (hasOwnProperty.call(def, "directOnly")) {
      directOnly = def.directOnly;
      if (typeof directOnly !== "boolean") {
        throw new TypeError(`Virtual table module "${moduleName}" ${verb} a table definition with an invalid "directOnly" property (should be a boolean)`);
      }
    }
    const columnDefinitions = [
      ...parameters.map(identifier).map((str) => `${str} HIDDEN`),
      ...columns.map(identifier)
    ];
    return [
      `CREATE TABLE x(${columnDefinitions.join(", ")});`,
      wrapGenerator(rows, new Map(columns.map((x, i) => [x, parameters.length + i])), moduleName),
      parameters,
      safeIntegers,
      directOnly
    ];
  }
  function wrapGenerator(generator, columnMap, moduleName) {
    return function* virtualTable(...args) {
      const output = args.map((x) => Buffer.isBuffer(x) ? Buffer.from(x) : x);
      for (let i = 0; i < columnMap.size; ++i) {
        output.push(null);
      }
      for (const row of generator(...args)) {
        if (Array.isArray(row)) {
          extractRowArray(row, output, columnMap.size, moduleName);
          yield output;
        } else if (typeof row === "object" && row !== null) {
          extractRowObject(row, output, columnMap, moduleName);
          yield output;
        } else {
          throw new TypeError(`Virtual table module "${moduleName}" yielded something that isn't a valid row object`);
        }
      }
    };
  }
  function extractRowArray(row, output, columnCount, moduleName) {
    if (row.length !== columnCount) {
      throw new TypeError(`Virtual table module "${moduleName}" yielded a row with an incorrect number of columns`);
    }
    const offset = output.length - columnCount;
    for (let i = 0; i < columnCount; ++i) {
      output[i + offset] = row[i];
    }
  }
  function extractRowObject(row, output, columnMap, moduleName) {
    let count = 0;
    for (const key of Object.keys(row)) {
      const index = columnMap.get(key);
      if (index === void 0) {
        throw new TypeError(`Virtual table module "${moduleName}" yielded a row with an undeclared column "${key}"`);
      }
      output[index] = row[key];
      count += 1;
    }
    if (count !== columnMap.size) {
      throw new TypeError(`Virtual table module "${moduleName}" yielded a row with missing columns`);
    }
  }
  function inferParameters({ length }) {
    if (!Number.isInteger(length) || length < 0) {
      throw new TypeError("Expected function.length to be a positive integer");
    }
    const params = [];
    for (let i = 0; i < length; ++i) {
      params.push(`$${i + 1}`);
    }
    return params;
  }
  const { hasOwnProperty } = Object.prototype;
  const { apply } = Function.prototype;
  const GeneratorFunctionPrototype = Object.getPrototypeOf(function* () {
  });
  const identifier = (str) => `"${str.replace(/"/g, '""')}"`;
  const defer = (x) => () => x;
  return table;
}
var inspect;
var hasRequiredInspect;
function requireInspect() {
  if (hasRequiredInspect) return inspect;
  hasRequiredInspect = 1;
  const DatabaseInspection = function Database2() {
  };
  inspect = function inspect2(depth, opts) {
    return Object.assign(new DatabaseInspection(), this);
  };
  return inspect;
}
var database;
var hasRequiredDatabase;
function requireDatabase() {
  if (hasRequiredDatabase) return database;
  hasRequiredDatabase = 1;
  const fs$12 = fs;
  const path2 = path$1;
  const util2 = requireUtil();
  const SqliteError = requireSqliteError();
  let DEFAULT_ADDON;
  function Database2(filenameGiven, options) {
    if (new.target == null) {
      return new Database2(filenameGiven, options);
    }
    let buffer;
    if (Buffer.isBuffer(filenameGiven)) {
      buffer = filenameGiven;
      filenameGiven = ":memory:";
    }
    if (filenameGiven == null) filenameGiven = "";
    if (options == null) options = {};
    if (typeof filenameGiven !== "string") throw new TypeError("Expected first argument to be a string");
    if (typeof options !== "object") throw new TypeError("Expected second argument to be an options object");
    if ("readOnly" in options) throw new TypeError('Misspelled option "readOnly" should be "readonly"');
    if ("memory" in options) throw new TypeError('Option "memory" was removed in v7.0.0 (use ":memory:" filename instead)');
    const filename = filenameGiven.trim();
    const anonymous = filename === "" || filename === ":memory:";
    const readonly = util2.getBooleanOption(options, "readonly");
    const fileMustExist = util2.getBooleanOption(options, "fileMustExist");
    const timeout = "timeout" in options ? options.timeout : 5e3;
    const verbose = "verbose" in options ? options.verbose : null;
    const nativeBinding = "nativeBinding" in options ? options.nativeBinding : null;
    if (readonly && anonymous && !buffer) throw new TypeError("In-memory/temporary databases cannot be readonly");
    if (!Number.isInteger(timeout) || timeout < 0) throw new TypeError('Expected the "timeout" option to be a positive integer');
    if (timeout > 2147483647) throw new RangeError('Option "timeout" cannot be greater than 2147483647');
    if (verbose != null && typeof verbose !== "function") throw new TypeError('Expected the "verbose" option to be a function');
    if (nativeBinding != null && typeof nativeBinding !== "string" && typeof nativeBinding !== "object") throw new TypeError('Expected the "nativeBinding" option to be a string or addon object');
    let addon;
    if (nativeBinding == null) {
      addon = DEFAULT_ADDON || (DEFAULT_ADDON = requireBindings()("better_sqlite3.node"));
    } else if (typeof nativeBinding === "string") {
      const requireFunc = typeof __non_webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
      addon = requireFunc(path2.resolve(nativeBinding).replace(/(\.node)?$/, ".node"));
    } else {
      addon = nativeBinding;
    }
    if (!addon.isInitialized) {
      addon.setErrorConstructor(SqliteError);
      addon.isInitialized = true;
    }
    if (!anonymous && !filename.startsWith("file:") && !fs$12.existsSync(path2.dirname(filename))) {
      throw new TypeError("Cannot open database because the directory does not exist");
    }
    Object.defineProperties(this, {
      [util2.cppdb]: { value: new addon.Database(filename, filenameGiven, anonymous, readonly, fileMustExist, timeout, verbose || null, buffer || null) },
      ...wrappers2.getters
    });
  }
  const wrappers2 = requireWrappers();
  Database2.prototype.prepare = wrappers2.prepare;
  Database2.prototype.transaction = requireTransaction();
  Database2.prototype.pragma = requirePragma();
  Database2.prototype.backup = requireBackup();
  Database2.prototype.serialize = requireSerialize();
  Database2.prototype.function = require_function();
  Database2.prototype.aggregate = requireAggregate();
  Database2.prototype.table = requireTable();
  Database2.prototype.loadExtension = wrappers2.loadExtension;
  Database2.prototype.exec = wrappers2.exec;
  Database2.prototype.close = wrappers2.close;
  Database2.prototype.defaultSafeIntegers = wrappers2.defaultSafeIntegers;
  Database2.prototype.unsafeMode = wrappers2.unsafeMode;
  Database2.prototype[util2.inspect] = requireInspect();
  database = Database2;
  return database;
}
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib.exports;
  hasRequiredLib = 1;
  lib.exports = requireDatabase();
  lib.exports.SqliteError = requireSqliteError();
  return lib.exports;
}
var libExports = requireLib();
const Database = /* @__PURE__ */ getDefaultExportFromCjs(libExports);
class MetadataCache {
  db = null;
  dbPath;
  constructor() {
    const userDataPath = app.getPath("userData");
    this.dbPath = path$1.join(userDataPath, "metadata-cache.db");
  }
  /**
   * Initializes the database connection and creates schema if needed
   */
  initialize() {
    if (this.db) {
      return;
    }
    this.db = new Database(this.dbPath);
    this.initSchema();
    console.log("Metadata cache database initialized:", this.dbPath);
  }
  /**
   * Creates the database schema
   */
  initSchema() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata_cache (
        filePath TEXT PRIMARY KEY,
        fileHash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unscanned',
        scannedAt INTEGER,
        mbid TEXT,
        hasMetadata INTEGER DEFAULT 0
      )
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_status ON metadata_cache(status)
    `);
  }
  /**
   * Generates a hash from file path + size + modification time
   * This detects if a file has been modified since last scan
   */
  getFileHash(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const data = `${filePath}:${stats.size}:${stats.mtimeMs}`;
      return crypto.createHash("sha256").update(data).digest("hex");
    } catch (error) {
      console.warn(`Failed to get file hash for ${filePath}:`, error);
      return null;
    }
  }
  /**
   * Registers a file path in the database
   * If the file already exists, does nothing
   * If it's new, sets status to 'unscanned'
   * 
   * @param filePath - Full path to the music file
   */
  registerFile(filePath) {
    if (!this.db) {
      console.warn("Database not initialized, cannot register file");
      return;
    }
    const hash = this.getFileHash(filePath);
    if (!hash) {
      return;
    }
    try {
      const existing = this.db.prepare("SELECT filePath FROM metadata_cache WHERE filePath = ?").get(filePath);
      if (existing) {
        const currentEntry = this.db.prepare("SELECT fileHash, status FROM metadata_cache WHERE filePath = ?").get(filePath);
        if (currentEntry && currentEntry.fileHash !== hash) {
          this.db.prepare("UPDATE metadata_cache SET fileHash = ?, status = ?, scannedAt = NULL, mbid = NULL, hasMetadata = 0 WHERE filePath = ?").run(hash, "unscanned", filePath);
          console.log(`File modified, reset to unscanned: ${path$1.basename(filePath)}`);
        }
      } else {
        this.db.prepare("INSERT INTO metadata_cache (filePath, fileHash, status, scannedAt, mbid, hasMetadata) VALUES (?, ?, ?, ?, ?, ?)").run(filePath, hash, "unscanned", null, null, 0);
      }
    } catch (error) {
      console.error(`Error registering file ${filePath}:`, error);
    }
  }
  /**
   * Registers multiple file paths at once (batch operation)
   * 
   * @param filePaths - Array of file paths to register
   */
  registerFiles(filePaths) {
    if (!this.db) {
      console.warn("Database not initialized, cannot register files");
      return;
    }
    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO metadata_cache (filePath, fileHash, status, scannedAt, mbid, hasMetadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const updateHashStmt = this.db.prepare(`
      UPDATE metadata_cache 
      SET fileHash = ?, status = 'unscanned', scannedAt = NULL, mbid = NULL, hasMetadata = 0
      WHERE filePath = ? AND fileHash != ?
    `);
    const transaction2 = this.db.transaction((paths) => {
      for (const filePath of paths) {
        const hash = this.getFileHash(filePath);
        if (!hash) continue;
        try {
          insertStmt.run(filePath, hash, "unscanned", null, null, 0);
          updateHashStmt.run(hash, filePath, hash);
        } catch (error) {
          console.error(`Error registering file ${filePath}:`, error);
        }
      }
    });
    transaction2(filePaths);
    console.log(`Registered ${filePaths.length} files in metadata cache`);
  }
  /**
   * Gets the scan status of a file
   * 
   * @param filePath - Full path to the music file
   * @returns Scan status or null if file not in database
   */
  getStatus(filePath) {
    if (!this.db) return null;
    try {
      const row = this.db.prepare("SELECT status FROM metadata_cache WHERE filePath = ?").get(filePath);
      return row?.status || null;
    } catch (error) {
      console.error(`Error getting status for ${filePath}:`, error);
      return null;
    }
  }
  /**
   * Checks if a file has been scanned (status is 'scanned')
   * 
   * @param filePath - Full path to the music file
   * @returns True if file is scanned and hasn't changed
   */
  isScanned(filePath) {
    const status = this.getStatus(filePath);
    if (status !== "scanned") return false;
    const hash = this.getFileHash(filePath);
    if (!hash) return false;
    const row = this.db.prepare("SELECT fileHash FROM metadata_cache WHERE filePath = ?").get(filePath);
    return row?.fileHash === hash;
  }
  /**
   * Marks a file as scanned
   * 
   * @param filePath - Full path to the music file
   * @param mbid - MusicBrainz ID (optional)
   * @param hasMetadata - Whether metadata was written to file
   */
  markScanned(filePath, mbid, hasMetadata = false) {
    if (!this.db) return;
    const hash = this.getFileHash(filePath);
    if (!hash) return;
    try {
      this.db.prepare("UPDATE metadata_cache SET status = ?, scannedAt = ?, mbid = ?, hasMetadata = ?, fileHash = ? WHERE filePath = ?").run("scanned", Date.now(), mbid || null, hasMetadata ? 1 : 0, hash, filePath);
    } catch (error) {
      console.error(`Error marking file as scanned ${filePath}:`, error);
    }
  }
  /**
   * Marks a file as scanning (in progress)
   * 
   * @param filePath - Full path to the music file
   */
  markScanning(filePath) {
    if (!this.db) return;
    try {
      this.db.prepare("UPDATE metadata_cache SET status = ? WHERE filePath = ?").run("scanning", filePath);
    } catch (error) {
      console.error(`Error marking file as scanning ${filePath}:`, error);
    }
  }
  /**
   * Marks a file as failed (scan attempted but failed)
   * 
   * @param filePath - Full path to the music file
   */
  markFailed(filePath) {
    if (!this.db) return;
    try {
      this.db.prepare("UPDATE metadata_cache SET status = ? WHERE filePath = ?").run("failed", filePath);
    } catch (error) {
      console.error(`Error marking file as failed ${filePath}:`, error);
    }
  }
  /**
   * Gets all unscanned file paths
   * 
   * @returns Array of file paths that are unscanned
   */
  getUnscannedFiles() {
    if (!this.db) return [];
    try {
      const rows = this.db.prepare("SELECT filePath FROM metadata_cache WHERE status = ?").all("unscanned");
      return rows.map((row) => row.filePath);
    } catch (error) {
      console.error("Error getting unscanned files:", error);
      return [];
    }
  }
  /**
   * Gets statistics about scan status
   * 
   * @returns Object with counts for each status
   */
  getStatistics() {
    if (!this.db) {
      return { unscanned: 0, scanning: 0, scanned: 0, failed: 0, total: 0 };
    }
    try {
      const stats = this.db.prepare(`
          SELECT 
            status,
            COUNT(*) as count
          FROM metadata_cache
          GROUP BY status
        `).all();
      const result = { unscanned: 0, scanning: 0, scanned: 0, failed: 0, total: 0 };
      for (const row of stats) {
        result[row.status] = row.count;
        result.total += row.count;
      }
      return result;
    } catch (error) {
      console.error("Error getting statistics:", error);
      return { unscanned: 0, scanning: 0, scanned: 0, failed: 0, total: 0 };
    }
  }
  /**
   * Closes the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
let metadataCacheInstance = null;
function getMetadataCache() {
  if (!metadataCacheInstance) {
    metadataCacheInstance = new MetadataCache();
  }
  return metadataCacheInstance;
}
function initializeMetadataCache() {
  const cache = getMetadataCache();
  cache.initialize();
}
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
    if (!fs$1.existsSync(directoryPath)) {
      console.error(`Directory does not exist: ${directoryPath}`);
      return musicFiles;
    }
    const stats = fs$1.statSync(directoryPath);
    if (!stats.isDirectory()) {
      console.error(`Path is not a directory: ${directoryPath}`);
      return musicFiles;
    }
    await scanDirectory(directoryPath, musicFiles);
    if (musicFiles.length > 0) {
      const filePaths = musicFiles.map((file) => file.path);
      const cache = getMetadataCache();
      cache.registerFiles(filePaths);
    }
    return musicFiles;
  } catch (error) {
    console.error(`Error scanning directory ${directoryPath}:`, error);
    return musicFiles;
  }
}
async function scanDirectory(dirPath, musicFiles) {
  try {
    const entries = fs$1.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        if (entry.isDirectory()) {
          await scanDirectory(fullPath, musicFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (MUSIC_EXTENSIONS.includes(ext)) {
            const stats = fs$1.statSync(fullPath);
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
function registerMusicHandlers() {
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
  ipcMain.handle("read-file-buffer", async (_event, filePath) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return buffer;
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  });
  ipcMain.handle("write-cover-art", async (_event, filePath, imagePath) => {
    try {
      const { TagLib } = await import("taglib-wasm");
      const taglib = await TagLib.initialize();
      const fileBuffer = fs.readFileSync(filePath);
      const data = new Uint8Array(fileBuffer);
      const file = await taglib.open(data);
      let resolvedImagePath = imagePath;
      if (imagePath.startsWith("assets/")) {
        const userDataPath = app.getPath("userData");
        resolvedImagePath = path$1.join(userDataPath, imagePath);
      }
      console.log("File format detected:", file.getFormat());
      const imageBuffer = fs.readFileSync(resolvedImagePath);
      const imageUint8 = new Uint8Array(imageBuffer);
      const ext = path$1.extname(resolvedImagePath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
      const picture = {
        mimeType,
        data: imageUint8,
        type: "Cover (front)",
        description: "Cover Art"
      };
      console.log("Writing picture with size:", imageBuffer.length, "MIME:", mimeType);
      const tag = file.tag();
      if (!tag.title) {
        console.log("Title empty, setting placeholder to force tag creation (using filename)");
        tag.setTitle(path$1.basename(filePath, path$1.extname(filePath)));
      }
      file.setPictures([picture]);
      if (!file.save()) {
        throw new Error("TagLib failed to save changes to memory buffer");
      }
      const updatedBuffer = file.getFileBuffer();
      fs.writeFileSync(filePath, updatedBuffer);
      file.dispose();
      console.log("Cover art written to disk:", filePath);
      return { success: true };
    } catch (error) {
      console.error("Error writing cover art:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
  ipcMain.handle("write-metadata", async (_event, filePath, metadata) => {
    try {
      const { TagLib } = await import("taglib-wasm");
      const taglib = await TagLib.initialize();
      const fileBuffer = fs.readFileSync(filePath);
      const data = new Uint8Array(fileBuffer);
      const file = await taglib.open(data);
      console.log("=== Writing Metadata ===");
      console.log("File:", filePath);
      console.log("Format:", file.getFormat());
      const tag = file.tag();
      if (metadata.title !== void 0) {
        tag.setTitle(metadata.title);
        console.log("  Title:", metadata.title);
      }
      if (metadata.artist !== void 0) {
        tag.setArtist(metadata.artist);
        console.log("  Artist:", metadata.artist);
      }
      if (metadata.album !== void 0) {
        tag.setAlbum(metadata.album);
        console.log("  Album:", metadata.album);
      }
      if (metadata.year !== void 0 && metadata.year > 0) {
        tag.setYear(metadata.year);
        console.log("  Year:", metadata.year);
      }
      if (metadata.trackNumber !== void 0 && metadata.trackNumber > 0) {
        tag.setTrack(metadata.trackNumber);
        console.log("  Track:", metadata.trackNumber);
      }
      if (metadata.genre !== void 0) {
        tag.setGenre(metadata.genre);
        console.log("  Genre:", metadata.genre);
      }
      if (metadata.comment !== void 0) {
        tag.setComment(metadata.comment);
        console.log("  Comment:", metadata.comment);
      }
      if (metadata.coverArtPath) {
        let resolvedImagePath = metadata.coverArtPath;
        if (metadata.coverArtPath.startsWith("assets/")) {
          const userDataPath = app.getPath("userData");
          resolvedImagePath = path$1.join(userDataPath, metadata.coverArtPath);
        }
        if (fs.existsSync(resolvedImagePath)) {
          const imageBuffer = fs.readFileSync(resolvedImagePath);
          const imageUint8 = new Uint8Array(imageBuffer);
          const ext = path$1.extname(resolvedImagePath).toLowerCase();
          const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
          const picture = {
            mimeType,
            data: imageUint8,
            type: "Cover (front)",
            description: "Cover Art"
          };
          file.setPictures([picture]);
          console.log("  Cover Art: embedded (" + imageBuffer.length + " bytes)");
        } else {
          console.warn("  Cover Art: file not found at", resolvedImagePath);
        }
      }
      if (!file.save()) {
        throw new Error("TagLib failed to save changes to memory buffer");
      }
      const updatedBuffer = file.getFileBuffer();
      fs.writeFileSync(filePath, updatedBuffer);
      file.dispose();
      console.log("=== Metadata Written Successfully ===");
      return { success: true };
    } catch (error) {
      console.error("Error writing metadata:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
  ipcMain.handle("get-metadata-status", async (_event, filePath) => {
    try {
      initializeMetadataCache();
      const cache = getMetadataCache();
      const status = cache.getStatus(filePath);
      const isScanned = cache.isScanned(filePath);
      return { status, isScanned };
    } catch (error) {
      console.error("Error getting metadata status:", error);
      return { status: null, isScanned: false };
    }
  });
  ipcMain.handle("mark-metadata-scanned", async (_event, filePath, mbid, hasMetadata) => {
    try {
      initializeMetadataCache();
      const cache = getMetadataCache();
      cache.markScanned(filePath, mbid, hasMetadata || false);
      return { success: true };
    } catch (error) {
      console.error("Error marking file as scanned:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
  ipcMain.handle("mark-metadata-scanning", async (_event, filePath) => {
    try {
      initializeMetadataCache();
      const cache = getMetadataCache();
      cache.markScanning(filePath);
      return { success: true };
    } catch (error) {
      console.error("Error marking file as scanning:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
  ipcMain.handle("mark-metadata-failed", async (_event, filePath) => {
    try {
      initializeMetadataCache();
      const cache = getMetadataCache();
      cache.markFailed(filePath);
      return { success: true };
    } catch (error) {
      console.error("Error marking file as failed:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
  ipcMain.handle("get-unscanned-files", async () => {
    try {
      initializeMetadataCache();
      const cache = getMetadataCache();
      return cache.getUnscannedFiles();
    } catch (error) {
      console.error("Error getting unscanned files:", error);
      return [];
    }
  });
  ipcMain.handle("get-metadata-statistics", async () => {
    try {
      initializeMetadataCache();
      const cache = getMetadataCache();
      return cache.getStatistics();
    } catch (error) {
      console.error("Error getting metadata statistics:", error);
      return { unscanned: 0, scanning: 0, scanned: 0, failed: 0, total: 0 };
    }
  });
}
function registerApiHandlers() {
  ipcMain.handle("lookup-acoustid", async (_event, fingerprint, duration) => {
    const ACOUSTID_API_KEY = "wWcEq1oIC4";
    const ACOUSTID_API_URL = "https://api.acoustid.org/v2/lookup";
    console.log("Sending AcoustID request from backend");
    const params = new URLSearchParams({
      client: ACOUSTID_API_KEY,
      duration: Math.round(duration).toString(),
      fingerprint,
      meta: "recordings"
    });
    try {
      const response = await axios.get(`${ACOUSTID_API_URL}?${params.toString()}`);
      const data = response.data;
      if (data.results && data.results.length > 0) {
        const bestMatch = data.results[0];
        if (bestMatch.recordings && bestMatch.recordings.length > 0) {
          const recording = bestMatch.recordings[0];
          const result = {
            mbid: recording.id,
            title: recording.title,
            artist: recording.artists?.[0]?.name
          };
          console.log("AcoustID Result:", result);
          return result;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to query AcoustID API:", error);
      return null;
    }
  });
  ipcMain.handle("lookup-musicbrainz", async (_event, mbid) => {
    try {
      const { MusicBrainzApi } = await import("./entry-node-DIwuWM9l.js");
      const mbApi = new MusicBrainzApi({
        appName: "Music Sync App",
        appVersion: "1.0.0",
        appContactInfo: "abdullahusmanicod@gmail.com"
      });
      console.log(`Fetching MusicBrainz metadata for MBID: ${mbid}`);
      const data = await mbApi.lookup("recording", mbid, ["artists", "releases"]);
      console.log("MusicBrainz Data fetched successfully");
      return data;
    } catch (error) {
      console.error("Failed to fetch from MusicBrainz:", error);
      return null;
    }
  });
  ipcMain.handle("download-image", async (_event, url, filePath) => {
    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const buffer = Buffer.from(response.data);
      let targetPath = filePath;
      if (filePath.startsWith("assets/")) {
        const userDataPath = app.getPath("userData");
        targetPath = path$1.join(userDataPath, filePath);
        const dir = path$1.dirname(targetPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      fs.writeFileSync(targetPath, buffer);
      console.log("Image saved to:", targetPath);
      return { success: true };
    } catch (error) {
      console.error("Error downloading image:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });
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
  var fs_1 = __importDefault(fs);
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
      const file = fs.createWriteStream(binaryPath);
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
            fs.chmodSync(binaryPath, 493);
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
          if (fs.existsSync(binaryPath)) {
            fs.unlinkSync(binaryPath);
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
    if (!fs.existsSync(binaryDir)) {
      fs.mkdirSync(binaryDir, { recursive: true });
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
    if (!fs.existsSync(binaryPath)) {
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
      if (!fs.existsSync(options.outputPath)) {
        fs.mkdirSync(options.outputPath, { recursive: true });
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
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        resolve({
          success: true,
          filePath: downloadedFile,
          title: videoTitle
        });
      } else {
        const files = fs.readdirSync(options.outputPath).map((f) => ({
          name: f,
          path: path$1.join(options.outputPath, f),
          time: fs.statSync(path$1.join(options.outputPath, f)).mtime.getTime()
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
const execFileAsync = promisify(execFile);
function getBinaryDir() {
  const userDataPath = app.getPath("userData");
  return path$1.join(userDataPath, "yt-dlp-binaries");
}
function getBinaryPath() {
  const binaryDir = getBinaryDir();
  let binaryFileName;
  if (process.platform === "win32") {
    binaryFileName = process.arch === "arm64" ? "yt-dlp_win_arm64.exe" : "yt-dlp.exe";
  } else if (process.platform === "darwin") {
    binaryFileName = process.arch === "arm64" ? "yt-dlp_macos_arm64" : "yt-dlp_macos";
  } else {
    binaryFileName = process.arch === "arm64" ? "yt-dlp_linux_arm64" : "yt-dlp_linux";
  }
  return path$1.join(binaryDir, binaryFileName);
}
async function getInstalledVersion(binaryPath) {
  try {
    if (!fs.existsSync(binaryPath)) {
      return null;
    }
    const { stdout } = await execFileAsync(binaryPath, ["--version"]);
    return stdout.trim() || null;
  } catch (error) {
    console.error(`Failed to get installed version for ${binaryPath}:`, error);
    return null;
  }
}
async function getLatestVersionFromGitHub() {
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
    console.error("Failed to get latest version from GitHub:", error);
    return null;
  }
}
async function getYtDlpStatus() {
  const binaryPath = getBinaryPath();
  const installed = fs.existsSync(binaryPath);
  let version = null;
  let latestVersion = null;
  if (installed) {
    version = await getInstalledVersion(binaryPath);
  }
  latestVersion = await getLatestVersionFromGitHub();
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
async function getAllBinaryStatuses() {
  const statuses = [];
  statuses.push(await getYtDlpStatus());
  return statuses;
}
function registerYoutubeHandlers() {
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
  ipcMain.handle("get-binary-statuses", async () => {
    try {
      return await getAllBinaryStatuses();
    } catch (error) {
      console.error("Error getting binary statuses:", error);
      return [];
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
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
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
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving config:", error);
    throw error;
  }
}
function registerSystemHandlers() {
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
  ipcMain.on("playback-state-changed", (_event, isPlaying2) => {
    updatePlaybackState(isPlaying2);
  });
  ipcMain.on("window-visibility-changed", (_event, visible) => {
    updateWindowVisibility();
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
  ipcMain.handle("get-platform-info", async () => {
    return {
      platform: process.platform,
      arch: process.arch
    };
  });
}
function registerIpcHandlers() {
  registerMusicHandlers();
  registerApiHandlers();
  registerYoutubeHandlers();
  registerSystemHandlers();
}
Menu.setApplicationMenu(null);
initializeMetadataCache();
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
  getMetadataCache().close();
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
  INT8 as C,
  Debug as D,
  EndOfStreamError as E,
  FourCcToken as F,
  UINT24_BE as G,
  Token as H,
  INT16_BE as I,
  textDecode as J,
  Genres as K,
  tryParseApeHeader as L,
  trimRightNull as M,
  ID3v2Header as N,
  ID3v1Parser as O,
  UINT24_LE as P,
  TextEncodingToken as Q,
  findZero as R,
  StringType as S,
  TrackType as T,
  UINT32_BE as U,
  decodeUintBE as V,
  TextHeader as W,
  SyncTextHeader as X,
  ExtendedHeader as Y,
  UINT32SYNCSAFE as Z,
  getDefaultExportFromCjs as a,
  getBitAllignedNumber as b,
  UINT16_BE as c,
  UINT8 as d,
  Uint8ArrayType as e,
  decodeString as f,
  getAugmentedNamespace as g,
  hexToUint8Array as h,
  isBitSet$1 as i,
  UINT32_LE as j,
  UINT64_LE as k,
  UINT16_LE as l,
  makeUnexpectedFileContentError as m,
  getBit as n,
  INT64_BE as o,
  fromBuffer as p,
  INT64_LE as q,
  INT32_LE as r,
  stripNulls as s,
  Float64_BE as t,
  uint8ArrayToHex as u,
  Float32_BE as v,
  UINT64_BE as w,
  TargetType as x,
  INT32_BE as y,
  INT24_BE as z
};
