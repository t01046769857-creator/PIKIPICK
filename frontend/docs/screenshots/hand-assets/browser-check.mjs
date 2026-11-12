import fs from 'node:fs/promises';
const pages = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, {once:true}));
let sequence = 0;
const pending = new Map();
ws.addEventListener('message', ({data}) => {
  const message = JSON.parse(data);
  if (message.id) { const p = pending.get(message.id); pending.delete(message.id); message.error ? p.reject(message.error) : p.resolve(message.result); }
});
const call = (method, params = {}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); ws.send(JSON.stringify({id,method,params})); });
const evaluate = async expression => {
  const result = await call('Runtime.evaluate', {expression,returnByValue:true,awaitPromise:true});
  if (result.exceptionDetails) throw Error(result.exceptionDetails.text + JSON.stringify(result.exceptionDetails.exception));
  return result.result.value;
};
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const waitFor = async expression => { for(let i=0;i<100;i++){ if(await evaluate(expression)) return; await delay(100); } throw Error('Timeout: '+expression); };
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const menu = async label => {
  await click('.story-navigation > button');
  await evaluate(`[...document.querySelectorAll('.story-menu-cards button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}).click()`);
  await delay(100);
};
const screenshot = async name => {
  await evaluate(`Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))`);
  await delay(300);
  const {data} = await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
  await fs.writeFile('frontend/docs/screenshots/hand-assets/'+name+'.png',Buffer.from(data,'base64'));
};
const inspect = () => evaluate(`(() => {
  const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
  return { viewport:[innerWidth,innerHeight], bodyWidth:document.documentElement.scrollWidth,
    cards:[...document.querySelectorAll('.mode-card')].map(box),
    hands:[...document.querySelectorAll('img.piki-hand')].map(e=>({gesture:e.dataset.gesture,loaded:e.complete&&e.naturalWidth===1024,box:box(e),fit:getComputedStyle(e).objectFit})),
    opponent:document.querySelector('.piki-opponent-character img')?.getAttribute('src'),
    highlighted:document.querySelector('.piki-opponent-move img')?.dataset.gesture,
    opponentBox:document.querySelector('.opponent-area')?box(document.querySelector('.opponent-area')):null,
    choicesBox:document.querySelector('.player-choice')?box(document.querySelector('.player-choice')):null,
    oldMasks:document.querySelectorAll('clipPath,mask').length,
    svgHands:document.querySelectorAll('.piki-opponent-hand,.mode-original-hand').length};
})()`);
const report=[];
await call('Page.enable');
for (const [name,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844],['small-mobile',320,740]]) {
  await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:'http://127.0.0.1:5173'});
  await waitFor(`!!document.querySelector('.play-start-hand__target')`);
  await click('.play-start-hand__target');
  await waitFor(`document.querySelectorAll('.mode-card').length===4`);
  await screenshot(name+'-selection');
  const selection=await inspect();
  if(selection.cards[0].y!==selection.cards[1].y||selection.cards[2].y!==selection.cards[3].y||selection.cards[0].x!==selection.cards[2].x) throw Error('Wrong card grid');
  if(selection.cards.some(c=>Math.abs(c.width-selection.cards[0].width)>1||Math.abs(c.height-selection.cards[0].height)>1)) throw Error('Unequal cards');
  if(selection.cards.some(c=>c.x<0||c.right>width+1))throw Error('Card outside viewport');
  report.push({name,screen:'selection',...selection});
  await click('.mode-card:last-child');
  await waitFor(`!!document.querySelector('.rule-practice')`);
  await screenshot(name+'-practice');
  report.push({name,screen:'practice',...await inspect()});
  const recordsBefore = await evaluate(`document.querySelector('.success-count').textContent`);
  for(let step=0;step<9;step++) {
    const gesture=await evaluate(`document.querySelector('.rule-practice-guide img').dataset.gesture`);
    const expected=['ROCK','SCISSORS','PAPER'][step%3];
    if(gesture!==expected)throw Error('Practice guide mismatch');
    const source=await evaluate(`document.querySelector('.rule-practice-opponent .piki-character img').getAttribute('src')`);
    if(!source.includes('piki-'+gesture.toLowerCase()+'.png')) throw Error('Practice character mismatch');
    const mode=['WIN','LOSE','DRAW'][Math.floor(step/3)];
    const answer=mode==='DRAW'?gesture:mode==='WIN'?{ROCK:'PAPER',SCISSORS:'ROCK',PAPER:'SCISSORS'}[gesture]:{ROCK:'SCISSORS',SCISSORS:'PAPER',PAPER:'ROCK'}[gesture];
    await click(`.rule-practice-choices button:has(img[data-gesture="${answer}"])`);
    await waitFor(`document.querySelector('.rule-practice-feedback').textContent.includes('정답')`);
    await click('.rule-practice-navigation button:last-child');
    await delay(30);
  }
  await waitFor(`document.querySelectorAll('.mode-card').length===4`);
  if(recordsBefore!==await evaluate(`document.querySelector('.success-count').textContent`))throw Error('Practice changed records');
  for(let mode=0;mode<3;mode++) {
    await click(`.mode-card:nth-child(${mode+1})`);
    await waitFor(`!!document.querySelector('.piki-opponent-move img')`);
    await screenshot(name+'-'+['win','lose','draw'][mode]);
    const game=await inspect();
    if(!game.opponent.includes('piki-'+game.highlighted.toLowerCase()+'.png'))throw Error('Live opponent mismatch');
    if(game.opponentBox.bottom>game.choicesBox.y+1)throw Error('Opponent overlaps choices');
    if(game.hands.some(h=>!h.loaded||h.fit!=='contain'))throw Error('Hand image invalid');
    report.push({name,screen:['WIN','LOSE','DRAW'][mode],...game});
    if(mode===0) {
      const answer={ROCK:'PAPER',SCISSORS:'ROCK',PAPER:'SCISSORS'}[game.highlighted];
      await click(`.gesture-button--${answer.toLowerCase()}`);
      await waitFor(`!!document.querySelector('.piki-feedback.success')`);
      if(await evaluate(`document.querySelector('.piki-opponent-move img').dataset.gesture`)!==game.highlighted)throw Error('Result hand changed');
      await screenshot(name+'-result');
    }
    await menu('놀이 선택');
  }
  await menu('규칙 연습');
  await click('.rule-practice-skip');
  await waitFor(`document.querySelectorAll('.mode-card').length===4`);
  await menu('내 별');
  await waitFor(`!!document.querySelector('.story-records')`);
  await click('.story-back-row button');
  await waitFor(`document.querySelectorAll('.mode-card').length===4`);
}
await fs.writeFile('frontend/docs/screenshots/hand-assets/browser-check.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({viewports:4,practiceExamples:36,modeStarts:12,resultChecks:4,captures:24,passed:true}));
ws.close();
