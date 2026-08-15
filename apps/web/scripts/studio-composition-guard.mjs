import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rm } from "node:fs/promises";

const baseUrl = (process.env.VISUAL_AUDIT_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const chromeBin = process.env.CHROME_BIN;
const remotePort = Number(process.env.STUDIO_COMPOSITION_CDP_PORT ?? 9223);
const profileDir = join(tmpdir(), `swd-studio-composition-${Date.now()}`);
const viewport = { width: 390, height: 844 };

assert.ok(chromeBin, "CHROME_BIN is required");

const studios = [
  { key: "work", path: "/create/work", selector: ".work-canvas-frame" },
  { key: "manga", path: "/create/manga", selector: ".manga-canvas" },
  { key: "isometric", path: "/create/isometric", selector: ".iso-canvas" },
  { key: "pixel", path: "/create/pixel", selector: ".pixel-canvas" },
  { key: "sprite", path: "/create/pixel/sprite", selector: ".sprite-canvas" },
  { key: "tile", path: "/create/pixel/tile", selector: ".tile-editor" },
  { key: "animation", path: "/create/pixel/animation", selector: ".animation-editor" },
  { key: "quest", path: "/create/pixel/quest", selector: ".quest-map" },
];

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function guestCookie() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST", redirect: "manual" });
  assert.equal(response.status, 201, `guest session failed: ${response.status}`);
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "guest session must set cookie");
  return setCookie.split(";", 1)[0];
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.id = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => reject(new Error("CDP open timeout")), 10000);
      this.ws.addEventListener("open", () => { clearTimeout(timeout); resolvePromise(); }, { once: true });
      this.ws.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("CDP websocket error")); }, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result ?? {});
        return;
      }
      for (const listener of this.listeners.get(message.method) ?? []) listener(message.params ?? {});
    });
  }
  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  once(method, timeoutMs = 20000) {
    return new Promise((resolvePromise, reject) => {
      const listener = (params) => { clearTimeout(timeout); this.listeners.get(method)?.delete(listener); resolvePromise(params); };
      if (!this.listeners.has(method)) this.listeners.set(method, new Set());
      this.listeners.get(method).add(listener);
      const timeout = setTimeout(() => { this.listeners.get(method)?.delete(listener); reject(new Error(`timeout ${method}`)); }, timeoutMs);
    });
  }
  close() { this.ws?.close(); }
}

async function waitTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${remotePort}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === "page");
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome CDP target unavailable");
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Runtime.evaluate failed");
  return result.result?.value;
}

async function navigate(cdp, url) {
  const loaded = cdp.once("Page.loadEventFired").catch(() => null);
  const result = await cdp.send("Page.navigate", { url });
  if (result.errorText) throw new Error(`${url}: ${result.errorText}`);
  await loaded;
  await evaluate(cdp, "Promise.resolve(document.fonts?.ready).then(() => true)");
  await sleep(500);
}

function validateGeometry(studio, geometry) {
  assert.ok(geometry, `${studio.key}: primary surface ${studio.selector} not found`);
  assert.ok(geometry.visible, `${studio.key}: primary surface is not visible`);
  assert.ok(geometry.widthShare >= 0.72, `${studio.key}: width share ${geometry.widthShare} < 0.72`);
  assert.ok(geometry.visibleHeightShare >= 0.34, `${studio.key}: visible height share ${geometry.visibleHeightShare} < 0.34`);
  assert.ok(geometry.topShare <= 0.34, `${studio.key}: primary surface starts too low (${geometry.topShare})`);
  assert.ok(geometry.viewportAreaShare >= 0.25, `${studio.key}: visible surface area share ${geometry.viewportAreaShare} < 0.25`);
}

async function main() {
  const cookie = await guestCookie();
  const chrome = spawn(chromeBin, [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    `--remote-debugging-port=${remotePort}`, "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profileDir}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  try {
    const cdp = new Cdp(await waitTarget());
    await cdp.connect();
    try {
      await cdp.send("Page.enable");
      await cdp.send("Runtime.enable");
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.setExtraHTTPHeaders", { headers: { Cookie: cookie } });
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: true,
        screenWidth: viewport.width, screenHeight: viewport.height,
      });
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

      const results = [];
      for (const studio of studios) {
        await navigate(cdp, `${baseUrl}${studio.path}`);
        const geometry = await evaluate(cdp, `(() => {
          const element = document.querySelector(${JSON.stringify(studio.selector)});
          if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return null;
          const rect = element.getBoundingClientRect();
          const vw = innerWidth; const vh = innerHeight;
          const left = Math.max(0, rect.left); const right = Math.min(vw, rect.right);
          const top = Math.max(0, rect.top); const bottom = Math.min(vh, rect.bottom);
          const visibleWidth = Math.max(0, right - left); const visibleHeight = Math.max(0, bottom - top);
          const style = getComputedStyle(element);
          return {
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && visibleWidth > 0 && visibleHeight > 0,
            widthShare: Number((visibleWidth / vw).toFixed(3)),
            visibleHeightShare: Number((visibleHeight / vh).toFixed(3)),
            topShare: Number((Math.max(0, rect.top) / vh).toFixed(3)),
            viewportAreaShare: Number(((visibleWidth * visibleHeight) / (vw * vh)).toFixed(3)),
          };
        })()`);
        validateGeometry(studio, geometry);
        results.push({ studio: studio.key, path: studio.path, selector: studio.selector, geometry });
      }
      console.log(JSON.stringify({ status: "PASS", viewport, studios: results }, null, 2));
      console.log(`STUDIO_COMPOSITION_GUARD=PASS (${results.length}/${studios.length})`);
    } finally {
      cdp.close();
    }
  } finally {
    chrome.kill("SIGTERM");
    await sleep(250);
    await rm(profileDir, { recursive: true, force: true });
  }
}

await main();
