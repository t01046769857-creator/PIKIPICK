import fs from 'node:fs/promises';
const stage=process.argv[2]??'after';
const pages=await(await fetch('http://127.0.0.1:9225/json/list')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}});
const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async exp=>{for(let i=0;i<100;i++){if(await evaluate(exp))return;await delay(100)}throw Error('Timeout '+exp)};
await call('Page.enable');
await call('Emulation.setEmulatedMedia',{features:[]});
const report=[];
for(const [name,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844],['small-mobile',320,740]]){
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:5173'});
 await wait(`!!document.querySelector('.play-start-hand__target')`);
 await evaluate(`document.querySelector('.play-start-hand__target').click()`);
 await wait(`document.querySelectorAll('.mode-card').length===4`);
 await evaluate(`Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))`);
 await delay(250);
 const snapshot=await evaluate(`(()=>{const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return {viewport:[innerWidth,innerHeight],bodyWidth:document.documentElement.scrollWidth,logo:box(document.querySelector('.app-brand')),menu:box(document.querySelector('.story-navigation')),stars:box(document.querySelector('.stars')),character:box(document.querySelector('.center-panel > .piki-character')),cards:[...document.querySelectorAll('.mode-card')].map(c=>({box:box(c),mode:c.dataset.mode,background:getComputedStyle(c).backgroundColor,hands:[...c.querySelectorAll('.piki-hand')].map(i=>({gesture:i.dataset.gesture,role:i.closest('[data-role]')?.dataset.role,winner:i.closest('.mode-hand-slot')?.classList.contains('is-winner'),loaded:i.complete&&i.naturalWidth===1024,box:box(i),fit:getComputedStyle(i).objectFit})),winners:c.querySelectorAll('.is-winner').length}))}})()`);
 report.push({name,...snapshot});
 if(stage==='after'){
  const [win,lose,draw,practice]=snapshot.cards;
  if(win.hands[0].role!=='piki'||win.hands[1].role!=='child'||win.hands[0].gesture!=='PAPER'||win.hands[1].gesture!=='SCISSORS')throw Error('WIN incorrect');
  if(lose.hands[0].role!=='piki'||lose.hands[1].role!=='child'||lose.hands[0].gesture!=='SCISSORS'||lose.hands[1].gesture!=='PAPER')throw Error('LOSE incorrect');
  if(Math.abs(win.hands[1].box.width/win.hands[0].box.width-1.3)>.015||Math.abs(lose.hands[0].box.width/lose.hands[1].box.width-1.3)>.015)throw Error('Winner ratio incorrect');
  if(draw.hands[0].gesture!==draw.hands[1].gesture||Math.abs(draw.hands[0].box.width-draw.hands[1].box.width)>1||draw.winners!==0)throw Error('DRAW incorrect');
  if(practice.hands.length!==3||practice.hands.some(h=>Math.abs(h.box.width-practice.hands[0].box.width)>1)||practice.winners!==0)throw Error('Practice size incorrect');
  if(new Set(snapshot.cards.map(c=>c.background)).size!==4)throw Error('Backgrounds not distinct');
  for(const c of snapshot.cards){
   if(Math.abs(c.box.width-win.box.width)>1||Math.abs(c.box.height-win.box.height)>1)throw Error('Unequal cards');
   if(c.box.x<0||c.box.right>width+1)throw Error('Card outside viewport');
   for(let i=0;i<c.hands.length;i++){const h=c.hands[i];if(!h.loaded||h.fit!=='contain'||h.box.x<c.box.x||h.box.right>c.box.right||h.box.y<c.box.y||h.box.bottom>c.box.bottom)throw Error('Hand cropped or outside card');if(i&&c.hands[i-1].box.right>h.box.x+1)throw Error('Hands overlap');}
  }
 }
 const capture=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 await fs.writeFile(`frontend/docs/screenshots/mode-card-winners/${stage}-${name}.png`,Buffer.from(capture.data,'base64'));
 if(stage==='after'){
  for(let i=0;i<3;i++){
   await evaluate(`document.querySelectorAll('.mode-card')[${i}].click()`);
   await wait(`!!document.querySelector('.app-shell--game')`);
   await evaluate(`document.querySelector('.story-navigation > button').click()`);
   await evaluate(`[...document.querySelectorAll('.story-menu-cards button')].find(b=>b.textContent.trim()==='놀이 선택').click()`);
   await wait(`document.querySelectorAll('.mode-card').length===4`);
  }
  await evaluate(`document.querySelectorAll('.mode-card')[3].click()`);
  await wait(`!!document.querySelector('.rule-practice')`);
 }
}
if(stage==='after'){
 const before=JSON.parse(await fs.readFile('frontend/docs/screenshots/mode-card-winners/before-measurements.json','utf8'));
 // 피키의 기존 고개 기울이기 애니메이션은 측정한 경계 상자를 바꾸지만, 코드와 스타일은 변경하지 않았다.
 for(const current of report){const original=before.find(b=>b.name===current.name);for(const part of ['logo','menu','stars'])for(const key of ['x','y','width','height'])if(Math.abs(original[part][key]-current[part][key])>.1)throw Error('Protected geometry changed '+current.name+' '+part+' '+key);for(let i=0;i<4;i++)for(const key of ['x','y','width','height'])if(Math.abs(original.cards[i].box[key]-current.cards[i].box[key])>.1)throw Error('Card geometry changed '+current.name+' '+i+' '+key);}
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await call('Page.navigate',{url:'http://127.0.0.1:5173'});
 await wait(`!!document.querySelector('.play-start-hand__target')`);
 await evaluate(`document.querySelector('.play-start-hand__target').click()`);
 await wait(`document.querySelectorAll('.mode-card').length===4`);
 if(!await evaluate(`[...document.querySelectorAll('.mode-hand-emphasis')].every(e=>getComputedStyle(e).animationName==='none')`))throw Error('Reduced motion not respected');
}
await fs.writeFile(`frontend/docs/screenshots/mode-card-winners/${stage}-measurements.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({stage,viewports:report.length,passed:true}));ws.close();
