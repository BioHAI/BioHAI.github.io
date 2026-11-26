/* Local previews never track; the live map keeps a visible fallback while loading. */
(function(root){
  'use strict';
  function parseVisitorConfig(text){
    try{const value=JSON.parse(text);return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}
  }
  function resolveVisitorMap(config={},hostname='',requestedWidth=1200){
    const host=hostname.toLowerCase(),local=['localhost','127.0.0.1','::1','[::1]'].includes(host);
    const allowed=Array.isArray(config.siteHosts)&&config.siteHosts.some(h=>typeof h==='string'&&h.toLowerCase()===host);
    const key=typeof config.widgetKey==='string'&&/^[a-zA-Z0-9_=-]{8,256}$/.test(config.widgetKey)?config.widgetKey:'';
    const configured=config.enabled===true&&config.provider==='mapmyvisitors'&&!!key;
    const active=!local&&allowed&&configured;
    let statsUrl='';
    try{const u=new URL(config.statsUrl);if(u.protocol==='https:'&&u.hostname==='mapmyvisitors.com'&&!u.username&&!u.password&&/^\/web\/[^/]+\/?$/.test(u.pathname))statsUrl=u.href;}catch{}
    const width=Math.max(240,Math.min(1600,Math.round(Number(requestedWidth)||1200)));
    return {local,active,configured,show:local||active,imageUrl:active?'https://mapmyvisitors.com/map.png?d='+encodeURIComponent(key)+'&w='+width+'&co=f5f8fd&cl=cfddf0&ct=17304f':'',statsUrl:active?statsUrl:''};
  }
  if(typeof module==='object'&&module.exports)module.exports={resolveVisitorMap,parseVisitorConfig};
  if(!root.Vue)return;
  const {ref,computed,onMounted,onBeforeUnmount,nextTick}=root.Vue;
  root.BioHAIVisitorMap={setup(){
    const embedded=document.getElementById('visitor-map-config');
    const config=ref(parseVisitorConfig(embedded?.textContent||''));
    const failed=ref(false),loaded=ref(false),pending=ref(false),slow=ref(false),attempt=ref(0),mapCanvas=ref(null),mapWidth=ref(0);
    const state=computed(()=>resolveVisitorMap(config.value,location.hostname,mapWidth.value||1200));
    const zoom=ref(1),panX=ref(0),panY=ref(0),dragging=ref(false);
    const canZoom=computed(()=>state.value.local||loaded.value);
    const viewStyle=computed(()=>({transform:'translate('+panX.value*100+'%,'+panY.value*100+'%) scale('+zoom.value+')'}));
    let drag;
    function clampPan(){const limit=(zoom.value-1)/2;panX.value=Math.max(-limit,Math.min(limit,panX.value));panY.value=Math.max(-limit,Math.min(limit,panY.value));}
    function resetView(){zoom.value=1;panX.value=0;panY.value=0;dragging.value=false;drag=undefined;}
    function changeZoom(amount){if(!canZoom.value)return;zoom.value=Math.max(1,Math.min(3,zoom.value+amount));clampPan();}
    function zoomIn(){changeZoom(.5);}
    function zoomOut(){changeZoom(-.5);}
    function pointerDown(event){
      if(!canZoom.value||zoom.value===1||event.isPrimary===false||(event.button!==undefined&&event.button!==0)||event.target.closest('button,a'))return;
      const rect=event.currentTarget.getBoundingClientRect();
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,panX:panX.value,panY:panY.value,width:rect.width,height:rect.height};dragging.value=true;
      event.currentTarget.setPointerCapture?.(event.pointerId);event.preventDefault();
    }
    function pointerMove(event){if(!drag||drag.id!==event.pointerId)return;panX.value=drag.panX+(event.clientX-drag.x)/drag.width;panY.value=drag.panY+(event.clientY-drag.y)/drag.height;clampPan();}
    function pointerUp(event){if(drag?.id!==event.pointerId)return;drag=undefined;dragging.value=false;}
    function keyDown(event){
      if(event.target!==event.currentTarget||!canZoom.value)return;
      if(['+','=','-','Home','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))event.preventDefault();else return;
      if(event.key==='+'||event.key==='=')zoomIn();else if(event.key==='-')zoomOut();else if(event.key==='Home'||event.key==='0')resetView();
      else{if(event.key==='ArrowLeft')panX.value+=.08;if(event.key==='ArrowRight')panX.value-=.08;if(event.key==='ArrowUp')panY.value+=.08;if(event.key==='ArrowDown')panY.value-=.08;clampPan();}
    }
    let timer;
    function clearWait(){if(timer!==undefined){clearTimeout(timer);timer=undefined;}}
    function beginLoad(){
      clearWait();pending.value=true;slow.value=false;loaded.value=false;
      timer=setTimeout(()=>{if(pending.value)slow.value=true;},10000);
    }
    function onLoad(){clearWait();loaded.value=true;pending.value=false;slow.value=false;failed.value=false;}
    function onError(){clearWait();failed.value=true;loaded.value=false;pending.value=false;slow.value=false;resetView();}
    function retry(){if(!failed.value)return;failed.value=false;attempt.value++;beginLoad();}
    onMounted(async()=>{
      if(!embedded){try{const response=await fetch('assets/data/visitor-map.json',{cache:'no-cache'});if(response.ok)config.value=await response.json();}catch{}}
      if(state.value.active){await nextTick();beginLoad();mapWidth.value=Math.round(mapCanvas.value?.getBoundingClientRect().width||600);}
      if(location.hash==='#visitor-map'){await nextTick();document.getElementById('visitor-map')?.scrollIntoView({block:'start',behavior:'auto'});}
    });
    onBeforeUnmount(clearWait);
    return{state,failed,loaded,pending,slow,attempt,mapCanvas,mapWidth,onLoad,onError,retry,zoom,panX,panY,dragging,canZoom,viewStyle,zoomIn,zoomOut,resetView,pointerDown,pointerMove,pointerUp,keyDown};
  },template:`
<section v-if="state.show" class="visitor-map-section" id="visitor-map" aria-labelledby="visitor-map-title">
  <div class="wrap visitor-map-inner">
    <div class="visitor-map-heading"><h2 id="visitor-map-title">Global visitors</h2><p>访客地图</p><span v-if="state.local" class="visitor-map-status">本地预览</span><a v-if="state.statsUrl" class="visitor-map-details" :href="state.statsUrl" target="_blank" rel="noopener noreferrer">查看访问统计</a></div>
    <figure class="visitor-map-figure">
      <div ref="mapCanvas" id="visitor-map-viewport" class="visitor-map-canvas" :class="{'is-live':state.active,'is-zoomed':zoom>1,'is-dragging':dragging}" :style="state.active&&mapWidth?{'--visitor-map-aspect':mapWidth+'/'+Math.ceil(mapWidth/2.04+24),'--visitor-mask-width':3600/mapWidth+'%','--visitor-mask-height':6500/Math.ceil(mapWidth/2.04+24)+'%'}:undefined" tabindex="0" role="group" aria-label="访客地图，可用加减键缩放，方向键移动，Home 键复位" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp" @lostpointercapture="pointerUp" @keydown="keyDown">
        <div class="visitor-map-layer" :style="viewStyle">
          <div v-if="state.active&&mapWidth" class="visitor-map-live" :class="{'is-loaded':loaded}" :aria-busy="pending">
            <img v-if="!failed" :key="attempt" :src="state.imageUrl" :width="mapWidth" :height="Math.ceil(mapWidth/2.04+24)" alt="网站访客的世界地图分布" draggable="false" decoding="async" fetchpriority="auto" referrerpolicy="strict-origin" @load="onLoad" @error="onError">
            <span v-if="loaded" class="visitor-map-image-mask" aria-hidden="true"></span>
          </div>
          <template v-else><img class="visitor-map-base" src="images/brand/world-land.svg" width="1000" height="400" alt="世界陆地图，标记湖南大学所在地，不包含访客数据" draggable="false" loading="lazy"><span v-if="state.local" class="visitor-map-lab-pin" role="img" aria-label="课题组所在地：湖南大学，长沙"><i></i><span>湖南大学 · 长沙</span></span></template>
        </div>
        <div class="visitor-map-controls" role="group" aria-label="地图缩放">
          <button type="button" aria-label="放大地图" title="放大地图" aria-controls="visitor-map-viewport" :disabled="!canZoom||zoom>=3" @click="zoomIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg></button>
          <button type="button" aria-label="缩小地图" title="缩小地图" aria-controls="visitor-map-viewport" :disabled="!canZoom||zoom<=1" @click="zoomOut"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>
          <button type="button" class="visitor-map-reset" aria-label="复位地图" title="复位地图" aria-controls="visitor-map-viewport" :disabled="zoom===1" @click="resetView">复位</button>
        </div>
        <output v-if="zoom>1" class="visitor-map-zoom-status" aria-live="polite">{{Math.round(zoom*100)}}% · 拖动查看</output>
      </div>
      <figcaption v-if="state.local"><span class="visitor-map-legend"><i></i>课题组所在地</span><span>{{state.configured?'本地访问不计入统计':'连接统计服务后显示真实访问分布'}}</span></figcaption>
      <figcaption v-else><span class="visitor-map-load-status" role="status" aria-live="polite"><template v-if="failed">访问统计暂时无法加载 <button type="button" class="visitor-map-retry" @click="retry">重试</button></template><template v-else-if="pending">{{slow?'统计服务响应较慢，正在等待':'正在加载访问分布'}}</template><template v-else>访客位置基于 IP 大致定位</template></span><a href="https://mapmyvisitors.com/b/policy" target="_blank" rel="noopener noreferrer">MapMyVisitors · 隐私说明</a></figcaption>
    </figure>
  </div>
</section>`};})(typeof window==='undefined'?globalThis:window);
