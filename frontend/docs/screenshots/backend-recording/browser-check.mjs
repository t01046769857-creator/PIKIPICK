import fs from 'node:fs/promises';
// 기본값: VITE_API_BASE_URL=http://127.0.0.1:8001 및 명시적으로 구성한 browser_app 테스트용 임시 API로 Vite를 실행한다.
// 실제 TiDB 검증에서는 PIKIPICK_BROWSER_API_BASE=http://127.0.0.1:8000을 설정한다.
const apiBase=process.env.PIKIPICK_BROWSER_API_BASE ?? 'http://127.0.0.1:8001';
const reportDir=process.env.PIKIPICK_BROWSER_REPORT_DIR ?? 'frontend/docs/screenshots/backend-recording';
const cdpBase=process.env.PIKIPICK_BROWSER_CDP_BASE ?? 'http://127.0.0.1:9227';
await fs.mkdir(reportDir,{recursive:true});
const pages=await(await fetch(cdpBase+'/json/list')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}});
const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser evaluation failed (details withheld)');return r.result.value};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const wait=async exp=>{for(let i=0;i<120;i++){if(await evaluate(exp))return;await delay(100)}throw Error('Browser condition did not complete')};
const report={database:apiBase.endsWith(':8000')?'tidb-cloud':'isolated-sqlite-in-memory',realTiDBVerified:apiBase.endsWith(':8000'),modes:[]};
await call('Page.enable');await call('Network.enable');
await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
await call('Page.navigate',{url:'http://127.0.0.1:5173'});
const apiReachable=await evaluate(`(async()=>{try{return (await fetch('${apiBase}/health')).status===200}catch{return false}})()`);
if(!apiReachable)throw Error('Configured API is not reachable from the browser');
await wait(`!!document.querySelector('.play-start-hand__target')`);
await evaluate(`document.querySelector('.play-start-hand__target').click()`);
await wait(`document.querySelectorAll('.mode-card').length===4`);
const before=await evaluate(`JSON.parse(localStorage.getItem('pikipick.records.v1')).successCount`);
const play=async index=>{
 await evaluate(`document.querySelectorAll('.mode-card')[${index}].click()`);
 await wait(`!!document.querySelector('.piki-opponent-move img')`);
 const opponent=await evaluate(`document.querySelector('.piki-opponent-move img').dataset.gesture`);
 const answer=index===0?{ROCK:'PAPER',SCISSORS:'ROCK',PAPER:'SCISSORS'}[opponent]:index===1?{ROCK:'SCISSORS',SCISSORS:'PAPER',PAPER:'ROCK'}[opponent]:opponent;
 await evaluate(`document.querySelector('.gesture-button--${answer.toLowerCase()}').click()`);
 await wait(`!!document.querySelector('.piki-feedback.success')`);
 return {opponent,player:answer};
};
const readCurrent=()=>evaluate(`(async()=>{const jobs=JSON.parse(localStorage.getItem('pikipick.api.outbox.v1'));const job=jobs.findLast(j=>!j.closed);const response=await fetch('${apiBase}/api/sessions/'+job.serverId,{headers:{Authorization:'Bearer '+job.request.session_token}});const saved=await response.json();return {status:response.status,mode:saved.session.mode,eventCount:saved.event_count,result:saved.events.find(e=>e.event_type==='round_result'),sameSession:saved.session.id===job.serverId}})()`);
const select=async()=>{await evaluate(`document.querySelector('.story-navigation > button').click()`);await evaluate(`[...document.querySelectorAll('.story-menu-cards button')].find(b=>b.textContent.trim()==='놀이 선택').click()`);await wait(`document.querySelectorAll('.mode-card').length===4`)};
for(let index=0;index<3;index++){
 const expected=await play(index);
 await wait(`JSON.parse(localStorage.getItem('pikipick.api.outbox.v1')).some(j=>!j.closed&&j.serverId&&j.events.length===0)`);
 const saved=await readCurrent();
 if(saved.status!==200||!saved.sameSession||saved.result.details.opponent!==expected.opponent||saved.result.details.player!==expected.player||!saved.result.success)throw Error('Stored result differs from actual game');
 report.modes.push({mode:saved.mode,sameSession:saved.sameSession,eventCount:saved.eventCount,opponentMatches:true,playerMatches:true,success:true});
 if(index===0){const capture=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(reportDir+'/online-result.png',Buffer.from(capture.data,'base64'));}
 await select();
}
await wait(`JSON.parse(localStorage.getItem('pikipick.api.outbox.v1')).length===0`);
await call('Network.setBlockedURLs',{urls:['*'+new URL(apiBase).host+'*']});
await play(0);
const afterOffline=await evaluate(`JSON.parse(localStorage.getItem('pikipick.records.v1')).successCount`);
const pendingCount=await evaluate(`JSON.parse(localStorage.getItem('pikipick.api.outbox.v1')).reduce((n,j)=>n+j.events.filter(e=>e.event_type==='round_result').length,0)`);
if(afterOffline!==before+4||pendingCount!==1)throw Error('Offline gameplay/local reward retention failed');
const capture=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile(reportDir+'/offline-result.png',Buffer.from(capture.data,'base64'));
await call('Network.setBlockedURLs',{urls:[]});
await evaluate(`window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('online'))`);
await wait(`JSON.parse(localStorage.getItem('pikipick.api.outbox.v1')).some(j=>!j.closed&&j.serverId&&j.events.length===0)`);
const recovered=await readCurrent();
if(recovered.eventCount!==1||!recovered.result.success)throw Error('Offline retry duplicated or lost a result');
report.offline={gameContinued:true,localRewardsPreserved:true,pendingResults:pendingCount,recoverySavedOnce:true};
report.productionHealth=await evaluate(`(async()=>{const r=await fetch('http://127.0.0.1:8000/health/db');return {httpStatus:r.status,...await r.json()}})()`);
await fs.writeFile(reportDir+'/browser-check.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));ws.close();
