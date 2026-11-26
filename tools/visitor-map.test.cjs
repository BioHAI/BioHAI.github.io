'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const config={enabled:true,provider:'mapmyvisitors',siteHosts:['biohai.github.io'],widgetKey:'valid-demo-key'};
function setup(host='biohai.github.io'){
  let mounted,unmount,callback;let scheduled=0,cleared=0,fetches=0;
  const Vue={ref:value=>({value}),computed:fn=>({get value(){return fn();}}),onMounted:fn=>{mounted=fn;},onBeforeUnmount:fn=>{unmount=fn;},nextTick:()=>Promise.resolve()};
  const sandbox={Vue,location:{hostname:host,hash:''},document:{getElementById:id=>id==='visitor-map-config'?{textContent:JSON.stringify(config)}:null},URL,fetch:()=>{fetches++;throw Error('Unexpected config request');},setTimeout:fn=>{callback=fn;scheduled++;return scheduled;},clearTimeout:()=>{cleared++;}};
  sandbox.window=sandbox;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/js/visitor-map.js'),'utf8'),sandbox);
  const state=sandbox.BioHAIVisitorMap.setup();state.mapCanvas.value={getBoundingClientRect:()=>({width:640})};
  return {state,mount:()=>mounted(),unmount:()=>unmount(),timeout:()=>callback(),get scheduled(){return scheduled;},get cleared(){return cleared;},get fetches(){return fetches;}};
}
test('Embedded configuration starts one live request without a second configuration fetch',async()=>{
  const f=setup();await f.mount();assert.equal(f.fetches,0);assert.equal(f.state.mapWidth.value,640);assert.equal(f.state.pending.value,true);assert.equal(f.scheduled,1);assert.equal(new URL(f.state.state.value.imageUrl).searchParams.get('w'),'640');
});
test('A slow response keeps waiting and never starts automatic tracking retries',async()=>{
  const f=setup();await f.mount();f.timeout();assert.equal(f.state.slow.value,true);assert.equal(f.state.pending.value,true);assert.equal(f.state.failed.value,false);assert.equal(f.state.attempt.value,0);assert.equal(f.scheduled,1);
  f.state.onLoad();assert.equal(f.state.loaded.value,true);assert.equal(f.state.pending.value,false);assert.equal(f.state.slow.value,false);
});
test('An error exposes a manual retry and a successful retry clears the error',async()=>{
  const f=setup();await f.mount();f.state.onError();assert.equal(f.state.failed.value,true);assert.equal(f.state.pending.value,false);assert.equal(f.state.attempt.value,0);
  f.state.retry();assert.equal(f.state.failed.value,false);assert.equal(f.state.pending.value,true);assert.equal(f.state.attempt.value,1);
  f.state.onLoad();assert.equal(f.state.loaded.value,true);assert.equal(f.state.failed.value,false);assert.equal(f.state.pending.value,false);
  const requests=f.scheduled;f.state.retry();assert.equal(f.scheduled,requests);
});
test('Local previews do not start tracking timers or external configuration requests',async()=>{
  const f=setup('127.0.0.1');await f.mount();assert.equal(f.state.state.value.active,false);assert.equal(f.state.mapWidth.value,0);assert.equal(f.fetches,0);assert.equal(f.scheduled,0);
});
test('Unmount cleans up the pending response timer',async()=>{
  const f=setup();await f.mount();const before=f.cleared;f.unmount();assert.equal(f.cleared,before+1);
});
