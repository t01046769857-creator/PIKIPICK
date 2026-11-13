import fs from 'node:fs/promises';
const stage = process.argv[2] ?? 'after';
const pages=await(await fetch('http://127.0.0.1:9224/json/list')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}});
const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async exp=>{for(let i=0;i<100;i++){if(await evaluate(exp))return;await delay(100)}throw Error('Timeout '+exp)};
await call('Page.enable');
if(stage==='reduced') await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const report=[];
const viewports=stage==='reduced'?[['mobile',390,844]]:[['desktop',1440,900],['tablet',768,1024],['mobile',390,844],['small-mobile',320,740],['landscape',844,390]];
for(const [name,width,height] of viewports){
 await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:5173'});
 await wait(`document.querySelector('.intro-v2')?.dataset.phase==='IDLE'`);
 await evaluate(`Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))`);
 await delay(350);
 const snapshot=await evaluate(`(()=>{const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return {viewport:[innerWidth,innerHeight],phase:document.querySelector('.intro-v2').dataset.phase,character:box(document.querySelector('.intro-v2-motion')),body:box(document.querySelector('.intro-reach-body')),hand:box(document.querySelector('.play-start-hand__target')),logo:box(document.querySelector('.intro-brand')),menu:box(document.querySelector('.story-navigation')),footer:box(document.querySelector('.intro-footer')),large:box(document.querySelector('.intro-v2-speech')),small:box(document.querySelector('.intro-hand-cue')),texts:[...document.querySelectorAll('.intro-v2-speech,.intro-hand-cue')].map(e=>e.textContent),animations:[...document.querySelectorAll('.intro-v2-motion,.intro-v2-hop,.play-start-hand')].map(e=>({class:e.className,animation:getComputedStyle(e).animation,transform:getComputedStyle(e).transform})),touchStyle:{pointerEvents:getComputedStyle(document.querySelector('.play-start-hand__target')).pointerEvents},bubbles:[...document.querySelectorAll('.intro-v2-speech,.intro-hand-cue')].map(e=>({pointerEvents:getComputedStyle(e).pointerEvents,lines:e.scrollHeight,client:e.clientHeight}))}})()`);
 report.push({name,...snapshot});
 const capture=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 await fs.writeFile(`frontend/docs/screenshots/intro-bubbles/${stage}-${name}.png`,Buffer.from(capture.data,'base64'));
 if(stage!=='before'){
  for(const b of [snapshot.large,snapshot.small])if(b.x<0||b.right>width||b.y<0||b.bottom>height)throw Error('Bubble outside viewport '+name+JSON.stringify(b));
  const hit=await evaluate(`(()=>{const r=document.querySelector('.play-start-hand__target').getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.classList.contains('play-start-hand__target')})()`);
  if(!hit)throw Error('Hand target blocked '+name);
  if(stage==='reduced'&&!await evaluate(`[...document.querySelectorAll('.intro-bubble-illustration,.play-start-hand')].every(e=>getComputedStyle(e).animationName==='none')`))throw Error('Reduced motion not respected');
  await evaluate(`document.querySelector('.play-start-hand__target').click()`);
  await wait(`document.querySelectorAll('.mode-card').length===4`);
 }
}
if(stage==='after'){
 const before=JSON.parse(await fs.readFile('frontend/docs/screenshots/intro-bubbles/before-measurements.json','utf8'));
 for(const current of report){const original=before.find(b=>b.name===current.name);for(const part of ['character','body','logo','menu','footer'])for(const key of ['x','y','width','height'])if(Math.abs(original[part][key]-current[part][key])>.1)throw Error('Protected geometry changed '+current.name+' '+part+' '+key);}
}
await fs.writeFile(`frontend/docs/screenshots/intro-bubbles/${stage}-measurements.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({stage,viewports:report.length,passed:true}));ws.close();
