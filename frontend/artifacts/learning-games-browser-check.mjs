import fs from 'node:fs/promises';

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
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(message.error); else request.resolve(message.result);
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
const waitFor = async (selector) => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${selector}`);
};
const click = (expression) => evaluate(`(() => { const element = ${expression}; if (!element) return false; element.click(); return true; })()`);

const saved = await evaluate(`({ progress: localStorage.getItem('pikipick.learning-progress.v1'), last: localStorage.getItem('pikipick.learning-last-game.v1') })`);
const results = [];
try {
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/play/games' });
  await waitFor('.activity-selection');
  const menu = await evaluate(`(() => [...document.querySelectorAll('.activity-card')].map(card => ({ title: card.querySelector('strong')?.textContent?.trim(), status: card.querySelector('.activity-card__status')?.textContent?.trim() })))()`);
  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(new URL('./learning-games-selection.png', import.meta.url), Buffer.from(screenshot.data, 'base64'));
  for (const title of ['묵찌빠', '수 세기 놀이', '숫자 놀이', '패턴·순서 놀이']) {
    await click(` [...document.querySelectorAll('.activity-card')].find(card => card.querySelector('strong')?.textContent?.trim() === ${JSON.stringify(title)}) `);
    await waitFor('.learning-games');
    const screen = await evaluate(`(() => ({ title: document.querySelector('#learning-games-title')?.textContent?.trim(), level: document.querySelector('.learning-level-picker .is-selected')?.textContent?.trim(), hasHelp: Boolean(document.querySelector('.learning-games__tools .text-action')), hasQuestion: Boolean(document.querySelector('.learning-question')) }))()`);
    if (title === '묵찌빠') {
      const learningScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await fs.writeFile(new URL('./learning-mukjjippa.png', import.meta.url), Buffer.from(learningScreenshot.data, 'base64'));
    }
    await click(`document.querySelector('.learning-games__tools .text-action')`);
    const hintVisible = await evaluate(`Boolean(document.querySelector('.learning-hint'))`);
    await click(`document.querySelector('.learning-question .learning-choice')`);
    await waitFor('.learning-feedback');
    const feedback = await evaluate(`document.querySelector('.learning-feedback')?.textContent?.trim()`);
    await click(`document.querySelector('.learning-feedback .primary')`);
    await delay(80);
    await click(`document.querySelector('.learning-games__footer .secondary-action')`);
    await waitFor('.activity-selection');
    results.push({ title, screen, hintVisible, feedback: Boolean(feedback) });
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: 'http://127.0.0.1:5173/play/games' });
  await waitFor('.activity-selection');
  const mobileScreenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(new URL('./learning-games-selection-mobile.png', import.meta.url), Buffer.from(mobileScreenshot.data, 'base64'));
  const mobile = await evaluate(`({ scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth, cards: document.querySelectorAll('.activity-card').length })`);
  console.log(JSON.stringify({ menu, results, mobile }, null, 2));
} finally {
  await evaluate(`(() => { const saved = ${JSON.stringify(saved)}; if (saved.progress === null) localStorage.removeItem('pikipick.learning-progress.v1'); else localStorage.setItem('pikipick.learning-progress.v1', saved.progress); if (saved.last === null) localStorage.removeItem('pikipick.learning-last-game.v1'); else localStorage.setItem('pikipick.learning-last-game.v1', saved.last); })()`);
  ws.close();
}
