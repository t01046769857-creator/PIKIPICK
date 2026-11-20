import fs from 'node:fs/promises';

const outputDir = new URL('./', import.meta.url);
await fs.mkdir(outputDir, { recursive: true });
const pages = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const page = pages.find((item) => item.type === 'page');
if (!page) throw new Error('No CDP page available');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const current = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) current.reject(message.error);
  else current.resolve(message.result);
});

const call = (method, params = {}) => new Promise((resolve, reject) => {
  const key = ++id;
  pending.set(key, { resolve, reject });
  ws.send(JSON.stringify({ id: key, method, params }));
});
const evaluate = async (expression) => {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
};
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const measurements = [];
for (const [width, height, name] of [[1440, 900, 'desktop'], [1024, 768, 'tablet'], [390, 844, 'mobile']]) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/play/world' });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate("Boolean(document.querySelector('.lxp-secret__terrain-layer'))")) break;
    await delay(100);
  }
  await evaluate("Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)))");
  await delay(250);
  const result = await evaluate(`(() => {
    const box = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: +rect.x.toFixed(2), y: +rect.y.toFixed(2), width: +rect.width.toFixed(2), height: +rect.height.toFixed(2), right: +rect.right.toFixed(2), bottom: +rect.bottom.toFixed(2) };
    };
    const query = (selector) => document.querySelector(selector);
    return {
      viewport: [innerWidth, innerHeight],
      document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
      world: box(query('.lxp-secret__world')),
      terrain: box(query('.lxp-secret__terrain-layer')),
      background: box(query('.lxp-secret__world-background')),
      bridge: box(query('.lxp-secret__world-bridge')),
      transitionForest: box(query('.lxp-secret__world-transition-forest')),
      routeLayer: box(query('.lxp-secret__terrain-path')),
      environmentAssets: [...document.querySelectorAll('.lxp-secret__world-environment')].map((element) => ({ id: element.dataset.assetId, zone: element.dataset.zoneId, box: box(element) })),
      landmarkCount: document.querySelectorAll('.lxp-secret__terrain-landmark').length,
      traveler: box(query('.lxp-secret__traveler')),
      legacyApprovedBridgeCount: document.querySelectorAll('.lxp-secret__approved-world-segment').length,
      legacyPathCount: document.querySelectorAll('.lxp-secret__world .lxp-secret__path').length,
    };
  })()`);
  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(new URL(`./${name}.png`, outputDir), Buffer.from(screenshot.data, 'base64'));
  if (name === 'desktop') {
    const fullScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(new URL('./desktop-full.png', outputDir), Buffer.from(fullScreenshot.data, 'base64'));
  }
  let motion = { status: 'not-run' };
  if (name === 'desktop') {
    const savedPosition = await evaluate("localStorage.getItem('pikipick.secret-land.position.v1')");
    if (savedPosition !== null) {
      await evaluate("document.querySelector('.lxp-secret__viewport')?.focus()");
      const before = await evaluate("(()=>{const e=document.querySelector('.lxp-secret__traveler'); return e ? {left:e.style.left,top:e.style.top} : null})()");
      const clickPoint = await evaluate("(()=>{const viewport=document.querySelector('.lxp-secret__viewport')?.getBoundingClientRect(); const traveler=document.querySelector('.lxp-secret__traveler')?.getBoundingClientRect(); if(!viewport||!traveler)return null; return {x:Math.max(viewport.left+80,traveler.left-250),y:Math.min(viewport.bottom-80,traveler.top+50)}})()");
      if (clickPoint) {
        await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: clickPoint.x, y: clickPoint.y, button: 'left', clickCount: 1 });
        await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: clickPoint.x, y: clickPoint.y, button: 'left', clickCount: 1 });
      }
      await delay(900);
      const afterClick = await evaluate("(()=>{const e=document.querySelector('.lxp-secret__traveler'); return e ? {left:e.style.left,top:e.style.top} : null})()");
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
      await delay(700);
      const afterRight = await evaluate("(()=>{const e=document.querySelector('.lxp-secret__traveler'); return e ? {left:e.style.left,top:e.style.top} : null})()");
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
      await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 });
      await delay(700);
      const afterLeft = await evaluate("(()=>{const e=document.querySelector('.lxp-secret__traveler'); return e ? {left:e.style.left,top:e.style.top} : null})()");
      await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 });
      await evaluate(`localStorage.setItem('pikipick.secret-land.position.v1', ${JSON.stringify(savedPosition)})`);
      await call('Page.navigate', { url: 'http://127.0.0.1:5173/play/world' });
      motion = { status: 'verified', before, afterClick, afterRight, afterLeft, clickChanged: before?.left !== afterClick?.left, rightChanged: afterClick?.left !== afterRight?.left, leftChanged: afterRight?.left !== afterLeft?.left, restoredPosition: savedPosition };
    } else {
      motion = { status: 'not-run-no-existing-position-key' };
    }
  }
  measurements.push({ name, ...result, motion, screenshot: `${name}.png` });
}

const zoneChecks = [];
for (const [progress, name] of [[0, 'sprout'], [0.25, 'spring'], [0.5, 'bridge'], [0.75, 'castle'], [1, 'gate']]) {
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: `http://127.0.0.1:5173/play/world?debug=terrain&progress=${progress}` });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate("Boolean(document.querySelector('.lxp-secret__terrain-layer'))")) break;
    await delay(100);
  }
  await delay(250);
  const zone = await evaluate(`(() => {
    const box = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: +rect.x.toFixed(2), y: +rect.y.toFixed(2), width: +rect.width.toFixed(2), height: +rect.height.toFixed(2), visible: rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight };
    };
    return {
      progress: ${progress},
      traveler: box(document.querySelector('.lxp-secret__traveler')),
      landmarks: [...document.querySelectorAll('.lxp-secret__terrain-landmark')].map(box),
      environmentAssets: [...document.querySelectorAll('.lxp-secret__world-environment')].map((element) => ({ id: element.dataset.assetId, zone: element.dataset.zoneId, box: box(element) })),
      routeLayer: box(document.querySelector('.lxp-secret__terrain-path')),
    };
  })()`);
  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(new URL(`./zone-${name}.png`, outputDir), Buffer.from(screenshot.data, 'base64'));
  zoneChecks.push({ name, ...zone, screenshot: `zone-${name}.png` });
}

await fs.writeFile(new URL('./measurements.json', outputDir), `${JSON.stringify(measurements, null, 2)}\n`);
await fs.writeFile(new URL('./zone-checks.json', outputDir), `${JSON.stringify(zoneChecks, null, 2)}\n`);
console.log(JSON.stringify({ measurements, zoneChecks }, null, 2));
ws.close();
