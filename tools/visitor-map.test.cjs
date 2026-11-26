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

test('Zoom is bounded and reuses the loaded map without tracking requests',async()=>{
  const f=setup();await f.mount();const url=f.state.state.value.imageUrl;
  f.state.zoomIn();assert.equal(f.state.zoom.value,1);
  f.state.onLoad();for(let i=0;i<10;i++)f.state.zoomIn();assert.equal(f.state.zoom.value,3);
  for(let i=0;i<10;i++)f.state.zoomOut();assert.equal(f.state.zoom.value,1);
  assert.equal(f.state.state.value.imageUrl,url);assert.equal(f.state.attempt.value,0);assert.equal(f.scheduled,1);assert.equal(f.fetches,0);
});

test('Dragging stays inside map bounds; reset and errors restore the whole map',async()=>{
  const f=setup();await f.mount();f.state.onLoad();f.state.zoomIn();
  const event={pointerId:1,button:0,clientX:100,clientY:100,target:{closest:()=>false},currentTarget:{getBoundingClientRect:()=>({width:640,height:320}),setPointerCapture(){}},preventDefault(){}};
  f.state.pointerDown(event);assert.equal(f.state.dragging.value,true);
  f.state.pointerMove({pointerId:2,clientX:1000,clientY:1000});assert.equal(f.state.panX.value,0);
  f.state.pointerMove({pointerId:1,clientX:1000,clientY:-1000});assert.equal(f.state.panX.value,.25);assert.equal(f.state.panY.value,-.25);
  f.state.pointerUp({pointerId:1});assert.equal(f.state.dragging.value,false);
  f.state.resetView();assert.equal(f.state.zoom.value,1);assert.equal(f.state.panX.value,0);assert.equal(f.state.panY.value,0);
  f.state.zoomIn();f.state.onError();assert.equal(f.state.zoom.value,1);assert.equal(f.state.canZoom.value,false);
});

test('Keyboard zoom and movement work on the canvas without intercepting button keys',async()=>{
  const f=setup('127.0.0.1');await f.mount();const target={};let prevented=0;
  const key=key=>f.state.keyDown({key,target,currentTarget:target,preventDefault(){prevented++;}});
  key('+');key('ArrowLeft');assert.equal(f.state.zoom.value,1.5);assert.equal(f.state.panX.value,.08);
  f.state.keyDown({key:'+',target:{},currentTarget:target,preventDefault(){throw Error('Button key intercepted');}});assert.equal(f.state.zoom.value,1.5);
  key('Home');assert.equal(f.state.zoom.value,1);assert.equal(f.state.panX.value,0);assert.equal(prevented,3);assert.equal(f.scheduled,0);
});
