import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const baseUrl = (process.env.VISUAL_AUDIT_BASE_URL ?? "https://simpleway-drawing.vercel.app").replace(/\/$/, "");
const expectedBaseSha = process.env.VISUAL_AUDIT_EXPECTED_BASE_SHA ?? null;
const chromeBin = process.env.CHROME_BIN;
const outputRoot = resolve(process.cwd(), process.env.VISUAL_AUDIT_OUTPUT ?? "artifacts/visual-smoke-v1-42");
const remotePort = Number(process.env.VISUAL_AUDIT_CDP_PORT ?? 9222);
const profileDir = join(tmpdir(), `swd-visual-audit-${Date.now()}`);

assert.ok(chromeBin, "CHROME_BIN is required");

const pngA = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZxkAAAAASUVORK5CYII=", "base64");
const pngB = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/l2GfWQAAAABJRU5ErkJggg==", "base64");

const viewports = [
  { key: "desktop", width: 1440, height: 960, mobile: false },
  { key: "mobile", width: 390, height: 844, mobile: true },
];

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function assertHttp(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label} failed: ${response.status} ${await response.text()}`);
  }
}

async function preflight() {
  const ready = await fetch(`${baseUrl}/api/ready`, { cache: "no-store" });
  await assertHttp(ready, 200, "production readiness");
  const readyJson = await ready.json();
  assert.equal(readyJson.status, "ready");

  const marker = await fetch(`${baseUrl}/studies/c4-form-check.svg`, { cache: "no-store" });
  await assertHttp(marker, 200, "V1.41 visual marker");
  const svg = await marker.text();
  assert.match(svg, /<title id="title">HNK Form Check testa coerência espacial<\/title>/);

  const lesson = await fetch(`${baseUrl}/learn/c4/lesson.swd.c4.self_check`, { cache: "no-store" });
  await assertHttp(lesson, 200, "V1.41 lesson marker");
  const lessonHtml = await lesson.text();
  assert.match(lessonHtml, /c4-form-check\.svg/);

  return { ready: readyJson, marker: "V1.41 C4 Form Check" };
}

async function createGuestSession() {
  const response = await fetch(`${baseUrl}/api/session/guest`, { method: "POST", redirect: "manual" });
  await assertHttp(response, 201, "guest session");
  const payload = await response.json();
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "guest session must set a cookie");
  const cookiePair = setCookie.split(";", 1)[0];
  const separator = cookiePair.indexOf("=");
  assert.ok(separator > 0, "invalid guest cookie");
  return {
    userId: payload.userId,
    cookieHeader: cookiePair,
    cookieName: cookiePair.slice(0, separator),
    cookieValue: cookiePair.slice(separator + 1),
  };
}

async function uploadPrivate(cookieHeader, bytes) {
  const prepare = await fetch(`${baseUrl}/api/files/private-upload`, {
    method: "POST",
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/png", byteSize: bytes.byteLength }),
  });
  await assertHttp(prepare, 201, "prepare visual audit upload");
  const intent = await prepare.json();

  const put = await fetch(intent.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "image/png", "content-length": String(bytes.byteLength) },
    body: bytes,
  });
  await assertHttp(put, 200, "put visual audit object");

  const confirm = await fetch(`${baseUrl}/api/files/confirm`, {
    method: "POST",
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId: intent.fileAssetId }),
  });
  await assertHttp(confirm, 200, "confirm visual audit upload");
  assert.equal((await confirm.json()).ready, true);
  return intent.fileAssetId;
}

async function createArtwork(cookieHeader, { bytes, title, type, source = "UPLOAD", notes }) {
  const fileAssetId = await uploadPrivate(cookieHeader, bytes);
  if (type === "BASELINE") {
    const response = await fetch(`${baseUrl}/api/drawing-zero`, {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ fileAssetId, source }),
    });
    await assertHttp(response, 201, "create Drawing Zero");
    const baseline = await response.json();
    return { id: baseline.artworkId };
  }

  const response = await fetch(`${baseUrl}/api/artworks`, {
    method: "POST",
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId, title, type, source, notes }),
  });
  await assertHttp(response, 201, `create ${title}`);
  return (await response.json()).artwork;
}

async function addVersion(cookieHeader, artworkId, bytes, notes) {
  const fileAssetId = await uploadPrivate(cookieHeader, bytes);
  const response = await fetch(`${baseUrl}/api/artworks/${encodeURIComponent(artworkId)}/versions`, {
    method: "POST",
    headers: { cookie: cookieHeader, "content-type": "application/json" },
    body: JSON.stringify({ fileAssetId, source: "CANVAS", notes }),
  });
  await assertHttp(response, 201, "add visual audit version");
  return (await response.json()).version;
}

async function seedVisualState(cookieHeader) {
  const baseline = await createArtwork(cookieHeader, {
    bytes: pngA,
    title: "Drawing Zero",
    type: "BASELINE",
    notes: "Visual acceptance baseline",
  });
  const revisit = await createArtwork(cookieHeader, {
    bytes: pngB,
    title: "Drawing Zero Revisited",
    type: "STUDY",
    notes: "Visual acceptance revisit",
  });
  const artwork = await createArtwork(cookieHeader, {
    bytes: pngB,
    title: "Câmara · Visual Acceptance",
    type: "ARTWORK",
    source: "CANVAS",
    notes: "Primeira passagem para auditoria renderizada",
  });
  await addVersion(cookieHeader, artwork.id, pngA, "Segunda passagem para comparação visual");
  return { baselineId: baseline.id, revisitId: revisit.id, artworkId: artwork.id };
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ws = null;
  }

  async connect() {
    assert.equal(typeof WebSocket, "function", "Node 22 global WebSocket is required");
    this.ws = new WebSocket(this.url);
    await new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => reject(new Error("CDP websocket open timeout")), 10_000);
      this.ws.addEventListener("open", () => {
        clearTimeout(timeout);
        resolvePromise();
      }, { once: true });
      this.ws.addEventListener("error", (event) => {
        clearTimeout(timeout);
        reject(new Error(`CDP websocket error: ${event?.message ?? "unknown"}`));
      }, { once: true });
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
      const callbacks = this.listeners.get(message.method);
      if (!callbacks) return;
      for (const callback of [...callbacks]) callback(message.params ?? {});
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, reject) => {
      this.pending.set(id, { resolve: resolvePromise, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method, timeoutMs = 20_000) {
    return new Promise((resolvePromise, reject) => {
      const callback = (params) => {
        clearTimeout(timeout);
        this.listeners.get(method)?.delete(callback);
        resolvePromise(params);
      };
      if (!this.listeners.has(method)) this.listeners.set(method, new Set());
      this.listeners.get(method).add(callback);
      const timeout = setTimeout(() => {
        this.listeners.get(method)?.delete(callback);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
    });
  }

  close() {
    this.ws?.close();
  }
}

async function waitForJson(url, attempts = 80) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(`Runtime.evaluate failed: ${result.exceptionDetails.text}`);
  return result.result?.value;
}

async function navigate(cdp, url) {
  const loaded = cdp.once("Page.loadEventFired", 25_000).catch(() => null);
  const navigation = await cdp.send("Page.navigate", { url });
  if (navigation.errorText) throw new Error(`Navigation failed for ${url}: ${navigation.errorText}`);
  await loaded;
  await evaluate(cdp, `Promise.resolve(document.fonts?.ready).then(() => true)`);
  await sleep(650);
}

async function setViewport(cdp, viewport) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 });
}

async function pageMetrics(cdp, viewport) {
  const metrics = await evaluate(cdp, `(() => {
    const all = [...document.querySelectorAll('*')];
    const gradients = [];
    const filters = [];
    const textShadows = [];
    for (const element of all) {
      const style = getComputedStyle(element);
      if (/gradient\\(/i.test(style.backgroundImage)) gradients.push(element.className || element.tagName);
      if (style.filter && style.filter !== 'none') filters.push(element.className || element.tagName);
      if (style.textShadow && style.textShadow !== 'none') textShadows.push(element.className || element.tagName);
    }
    const hugeHeadings = [...document.querySelectorAll('h1,h2,h3')]
      .map((element) => ({ text: (element.textContent || '').trim().slice(0, 100), px: Number.parseFloat(getComputedStyle(element).fontSize) || 0 }))
      .filter((item) => item.px > ${viewport.mobile ? 46 : 64});
    const bodyText = document.body?.innerText || '';
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      finalUrl: location.href,
      title: document.title,
      responseStatus: navigation?.responseStatus ?? 0,
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      scrollScreens: Number((document.documentElement.scrollHeight / Math.max(1, innerHeight)).toFixed(2)),
      errorBoundary: bodyText.includes('Algo interrompeu esta etapa'),
      sessionError: bodyText.includes('Não foi possível iniciar sua sessão'),
      gradients: gradients.slice(0, 20),
      filters: filters.slice(0, 20),
      textShadows: textShadows.slice(0, 20),
      hugeHeadings,
      imageCount: document.images.length,
    };
  })()`);

  await evaluate(cdp, `document.activeElement instanceof HTMLElement && document.activeElement.blur(); true`);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await sleep(80);
  metrics.keyboardFocus = await evaluate(cdp, `(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || element === document.body) return null;
    const style = getComputedStyle(element);
    return {
      tag: element.tagName,
      text: (element.innerText || element.getAttribute('aria-label') || '').trim().slice(0, 80),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
    };
  })()`);

  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await sleep(80);
  metrics.reducedMotion = await evaluate(cdp, `({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    runningAnimations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
  })`);
  await cdp.send("Emulation.setEmulatedMedia", { features: [] });

  return metrics;
}

async function captureScreenshot(cdp, destination, fullPage = false) {
  await mkdir(dirname(destination), { recursive: true });
  const params = { format: "png", fromSurface: true };
  if (fullPage) {
    const layout = await cdp.send("Page.getLayoutMetrics");
    params.captureBeyondViewport = true;
    params.clip = {
      x: 0,
      y: 0,
      width: Math.max(1, Math.ceil(layout.contentSize.width)),
      height: Math.max(1, Math.ceil(layout.contentSize.height)),
      scale: 1,
    };
  }
  const screenshot = await cdp.send("Page.captureScreenshot", params);
  await writeFile(destination, Buffer.from(screenshot.data, "base64"));
}

function contactSheetHtml(viewportKey, captures) {
  const columns = viewportKey === "desktop" ? 2 : 4;
  const cards = captures.map((item) => `
    <article>
      <header><b>${item.order}. ${item.label}</b><code>${item.path}</code></header>
      <img src="${viewportKey}/${item.fileName}" alt="${item.label}">
    </article>`).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:18px;background:#292722;color:#f6f0df;font-family:Arial,sans-serif}
    h1{font-size:22px;margin:0 0 16px}.grid{display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:14px;align-items:start}
    article{background:#f4eedf;color:#211f1a;border:2px solid #b88a21;padding:8px}header{display:grid;gap:4px;margin-bottom:7px}b{font-size:13px}code{font-size:10px;overflow-wrap:anywhere}
    img{display:block;width:100%;height:auto;border:1px solid #6e6252;background:white}
  </style></head><body><h1>SimpleWay Drawing · V1.44 · ${viewportKey}</h1><div class="grid">${cards}</div></body></html>`;
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const preflightState = await preflight();
  const guest = await createGuestSession();
  const seeded = await seedVisualState(guest.cookieHeader);

  const routes = [
    { order: "01", key: "home", label: "Home / App Shell", path: "/" },
    { order: "02", key: "onboarding", label: "Onboarding", path: "/onboarding" },
    { order: "03", key: "drawing-zero", label: "Drawing Zero", path: "/drawing-zero" },
    { order: "04", key: "learn", label: "Learn / Campaign", path: "/learn" },
    { order: "05", key: "lesson-player", label: "Lesson Player", path: "/learn/c0/lesson.swd.c0.intentional_marks" },
    { order: "06", key: "gym", label: "Gym / Gesto", path: "/gym" },
    { order: "07", key: "observation", label: "Observation / Olhar", path: "/observation" },
    { order: "08", key: "construction", label: "Construction / Estrutura", path: "/construction" },
    { order: "09", key: "form", label: "Form / Volume", path: "/form" },
    { order: "10", key: "create", label: "Create / Atelier Livre", path: "/create" },
    { order: "11", key: "artwork-detail", label: "Artwork detail / versions", path: `/create/${seeded.artworkId}` },
    { order: "12", key: "journey", label: "Journey + Before / After", path: "/journey" },
    { order: "13", key: "skills", label: "Skills", path: "/skills" },
    { order: "14", key: "resume", label: "Resume / Bússola", path: "/resume" },
    { order: "15", key: "alpha", label: "Alpha Rite", path: "/alpha" },
    { order: "16", key: "work-studio", label: "Câmara da Obra", path: "/create/work" },
    { order: "17", key: "manga-studio", label: "Manga Canvas", path: "/create/manga" },
    { order: "18", key: "isometric-studio", label: "Isometric Canvas", path: "/create/isometric" },
    { order: "19", key: "pixel-studio", label: "Pixel Studio", path: "/create/pixel" },
    { order: "20", key: "pixel-sprite", label: "Pixel Sprite Lab", path: "/create/pixel/sprite" },
    { order: "21", key: "pixel-tile", label: "Pixel Tile Lab", path: "/create/pixel/tile" },
    { order: "22", key: "pixel-animation", label: "Pixel Animation Lab", path: "/create/pixel/animation" },
    { order: "23", key: "pixel-quest", label: "Pixel Expedition", path: "/create/pixel/quest" },
  ];

  const chrome = spawn(chromeBin, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars=false",
    "--allow-file-access-from-files",
    `--remote-debugging-port=${remotePort}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  let stderr = "";
  chrome.stderr.on("data", (chunk) => { stderr += String(chunk); });

  try {
    const targets = await waitForJson(`http://127.0.0.1:${remotePort}/json/list`);
    const pageTarget = targets.find((target) => target.type === "page");
    assert.ok(pageTarget?.webSocketDebuggerUrl, `Chrome page target unavailable: ${stderr}`);

    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    try {
      await cdp.send("Page.enable");
      await cdp.send("Network.enable");
      await cdp.send("Runtime.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.setExtraHTTPHeaders", {
        headers: { Cookie: guest.cookieHeader },
      });

      const results = [];
      const captureIndex = { desktop: [], mobile: [] };

      for (const viewport of viewports) {
        await setViewport(cdp, viewport);
        for (const route of routes) {
          const url = `${baseUrl}${route.path}`;
          await navigate(cdp, url);
          const fileName = `${route.order}-${route.key}.png`;
          const screenshotPath = join(outputRoot, viewport.key, fileName);
          await captureScreenshot(cdp, screenshotPath, false);
          const metrics = await pageMetrics(cdp, viewport);

          const p0 = [];
          if (metrics.responseStatus && metrics.responseStatus >= 400) p0.push(`HTTP ${metrics.responseStatus}`);
          if (metrics.errorBoundary) p0.push("error boundary visible");
          if (metrics.sessionError) p0.push("session error visible");
          if (metrics.horizontalOverflowPx > 2) p0.push(`horizontal overflow ${metrics.horizontalOverflowPx}px`);

          const warnings = [];
          if (metrics.gradients.length) warnings.push(`${metrics.gradients.length} gradient candidate(s)`);
          if (metrics.filters.length) warnings.push(`${metrics.filters.length} filter candidate(s)`);
          if (metrics.textShadows.length) warnings.push(`${metrics.textShadows.length} text-shadow candidate(s)`);
          if (metrics.hugeHeadings.length) warnings.push(`${metrics.hugeHeadings.length} oversized heading candidate(s)`);
          if (!metrics.keyboardFocus) warnings.push("no keyboard focus target after Tab");
          if (!metrics.reducedMotion?.matches) warnings.push("reduced-motion emulation did not match");
          if ((metrics.reducedMotion?.runningAnimations ?? 0) > 0) warnings.push(`${metrics.reducedMotion.runningAnimations} animation(s) still running under reduced motion`);

          results.push({
            route: route.key,
            label: route.label,
            path: route.path,
            viewport: viewport.key,
            screenshot: `${viewport.key}/${fileName}`,
            metrics,
            p0,
            warnings,
          });
          captureIndex[viewport.key].push({ ...route, fileName });
        }
      }

      for (const viewport of viewports) {
        const htmlPath = join(outputRoot, `contact-${viewport.key}.html`);
        await writeFile(htmlPath, contactSheetHtml(viewport.key, captureIndex[viewport.key]), "utf8");
        await setViewport(cdp, { key: "contact", width: 1600, height: 1000, mobile: false });
        await navigate(cdp, pathToFileURL(htmlPath).href);
        await captureScreenshot(cdp, join(outputRoot, `contact-${viewport.key}.png`), true);
      }

      const p0Findings = results.flatMap((result) => result.p0.map((finding) => `${result.viewport}/${result.route}: ${finding}`));
      const warnings = results.flatMap((result) => result.warnings.map((finding) => `${result.viewport}/${result.route}: ${finding}`));
      const manifest = {
        generatedAt: new Date().toISOString(),
        baseUrl,
        expectedBaseSha,
        preflight: preflightState,
        seeded,
        viewports,
        routes: routes.map(({ order, key, label, path }) => ({ order, key, label, path })),
        summary: {
          captures: results.length,
          p0Count: p0Findings.length,
          warningCount: warnings.length,
          p0Findings,
          warnings,
        },
        results,
      };
      await writeFile(join(outputRoot, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

      console.log(`VISUAL_ACCEPTANCE_CAPTURED=${results.length}`);
      console.log(`VISUAL_ACCEPTANCE_P0=${p0Findings.length}`);
      console.log(`VISUAL_ACCEPTANCE_WARNINGS=${warnings.length}`);
      if (p0Findings.length) throw new Error(`Visual acceptance P0 guard failed:\n${p0Findings.join("\n")}`);
    } finally {
      cdp.close();
    }
  } finally {
    chrome.kill("SIGTERM");
    await sleep(300);
    await rm(profileDir, { recursive: true, force: true });
  }
}

await main();