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

await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await call('Page.navigate', { url: 'http://127.0.0.1:5173/play/world?debug=terrain&progress=0.5' });
for (let attempt = 0; attempt < 80; attempt += 1) {
  if (await evaluate("Boolean(document.querySelector('.lxp-secret__terrain-layer'))")) break;
  await delay(100);
}
await delay(300);
await evaluate("Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)))");
const injected = await evaluate(`(() => {
  const world = document.querySelector('.lxp-secret__world');
  const route = document.querySelector('.lxp-secret__terrain-path');
  if (!world || !route) throw new Error('world or route not found');
  const image = document.createElement('img');
  image.src = '/src/assets/secret-land/place-rainbow-bridge-v2.png';
  image.alt = '';
  image.dataset.reviewOnly = 'true';
  image.style.cssText = 'position:absolute;z-index:20;left:48.8889%;top:35%;width:5.1111%;height:28.8889%;object-fit:contain;object-position:center;transform:translate(-50%,-50%);pointer-events:none;opacity:.92;';
  world.appendChild(image);
  route.style.zIndex = '21';
  return { source: image.src, routeZIndex: route.style.zIndex };
})()`);
await delay(500);
const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
await fs.writeFile(new URL('./bridge-place-review.png', outputDir), Buffer.from(screenshot.data, 'base64'));
const metrics = await evaluate(`(() => {
  const image = document.querySelector('img[data-review-only="true"]');
  const route = document.querySelector('.lxp-secret__terrain-path');
  const box = (element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  return { image: box(image), route: box(route), source: image?.src, pathUnchanged: route?.querySelectorAll('path').length > 0 };
})()`);
await fs.writeFile(new URL('./bridge-place-review.json', outputDir), `${JSON.stringify({ injected, metrics }, null, 2)}\n`);
ws.close();
console.log(JSON.stringify({ injected, metrics }, null, 2));
