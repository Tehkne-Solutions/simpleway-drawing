import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const baseUrl = (process.env.VISUAL_AUDIT_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const chromeBin = process.env.CHROME_BIN;
const outputRoot = resolve(process.cwd(), process.env.VISUAL_AUDIT_OUTPUT ?? "artifacts/visual-smoke-v1-42");
const remotePort = Number(process.env.CROMA_RENDER_CDP_PORT ?? 9224);
const profileDir = join(tmpdir(), `swd-croma-render-${Date.now()}`);
const expectedStates = ["observe", "focus", "curious", "teach", "challenge", "correct", "celebrate", "guide"];
const viewports = [
  { key: "desktop", width: 1440, height: 960, mobile: false },
  { key: "mobile", width: 390, height: 844, mobile: true },
];

assert.ok(chromeBin, "CHROME_BIN is required");
const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

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

async function capture(cdp, path) {
  await mkdir(outputRoot, { recursive: true });
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(path, Buffer.from(screenshot.data, "base64"));
}

async function main() {
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

      const results = [];
      for (const viewport of viewports) {
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
          screenWidth: viewport.width, screenHeight: viewport.height,
        });
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 });
        await navigate(cdp, `${baseUrl}/codex`);

        const audit = await evaluate(cdp, `(() => {
          const cards = [...document.querySelectorAll('.croma-expression-card')];
          const states = cards.map((card) => card.getAttribute('data-croma-state'));
          const pigments = cards.map((card) => card.getAttribute('data-croma-pigment'));
          const visibleCards = cards.filter((card) => {
            const rect = card.getBoundingClientRect();
            const style = getComputedStyle(card);
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          }).length;
          const marks = cards.filter((card) => card.querySelector('.croma-mark svg')).length;
          const sketch = document.querySelector('.codex-hero-croma .croma-mark[data-croma-variant="sketch"]');
          const root = document.documentElement;
          return {
            states,
            pigments,
            cardCount: cards.length,
            visibleCards,
            marks,
            sketchVisible: Boolean(sketch && sketch.getBoundingClientRect().width > 0 && sketch.getBoundingClientRect().height > 0),
            horizontalOverflowPx: Math.max(0, root.scrollWidth - innerWidth),
          };
        })()`);

        assert.equal(audit.cardCount, expectedStates.length, `${viewport.key}: expression card count`);
        assert.equal(audit.visibleCards, expectedStates.length, `${viewport.key}: all expression cards must render`);
        assert.equal(audit.marks, expectedStates.length, `${viewport.key}: every state needs authored SVG`);
        assert.deepEqual(audit.states, expectedStates, `${viewport.key}: state order/coverage changed`);
        assert.equal(audit.sketchVisible, true, `${viewport.key}: Croma Sketch missing`);
        assert.ok(audit.horizontalOverflowPx <= 2, `${viewport.key}: document overflow ${audit.horizontalOverflowPx}px`);
        await capture(cdp, join(outputRoot, `croma-vivo-${viewport.key}.png`));
        results.push({ viewport: viewport.key, ...audit });
      }

      await writeFile(join(outputRoot, "croma-vivo-manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), expectedStates, results }, null, 2), "utf8");
      console.log(`CROMA_VIVO_RENDER_GUARD=PASS (${expectedStates.length} states × ${viewports.length} viewports)`);
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
