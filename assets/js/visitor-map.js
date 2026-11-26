/* World visitor map: local preview stays offline; live statistics require a site-owned widget. */
(function(root){
  'use strict';
  function resolveVisitorMap(config={},hostname=''){
    const host=hostname.toLowerCase(),local=['localhost','127.0.0.1','::1','[::1]'].includes(host);
    const allowed=Array.isArray(config.siteHosts)&&config.siteHosts.some(h=>typeof h==='string'&&h.toLowerCase()===host);
    const key=typeof config.widgetKey==='string'&&/^[a-zA-Z0-9_=-]{8,256}$/.test(config.widgetKey)?config.widgetKey:'';
    const configured=config.enabled===true&&config.provider==='mapmyvisitors'&&!!key;
    const active=!local&&allowed&&configured;
    let statsUrl='';
    try{const u=new URL(config.statsUrl);if(u.protocol==='https:'&&u.hostname==='mapmyvisitors.com'&&!u.username&&!u.password&&/^\/web\/[^/]+\/?$/.test(u.pathname))statsUrl=u.href;}catch{}
    return {local,active,configured,show:local||active,imageUrl:active?'https://mapmyvisitors.com/map.png?d='+encodeURIComponent(key)+'&w=1200&co=f5f8fd&cl=cfddf0&ct=17304f':'',statsUrl:active?statsUrl:''};
  }
  if(typeof module==='object'&&module.exports)module.exports={resolveVisitorMap};
  if(!root.Vue)return;
  const {ref,computed,onMounted,nextTick}=root.Vue;
  root.BioHAIVisitorMap={setup(){
    const config=ref({}),failed=ref(false),loaded=ref(false);
    const state=computed(()=>resolveVisitorMap(config.value,location.hostname));
    onMounted(async()=>{try{const response=await fetch('assets/data/visitor-map.json',{cache:'no-cache'});if(response.ok)config.value=await response.json();}catch{/* An unavailable counter cannot block the website. */}if(location.hash==='#visitor-map'){await nextTick();document.getElementById('visitor-map')?.scrollIntoView({block:'start',behavior:'auto'});}});
    return{state,failed,loaded};
  },template:`<section v-if="state.show" class="visitor-map-section" id="visitor-map" aria-labelledby="visitor-map-title"><div class="wrap visitor-map-inner"><div class="visitor-map-heading"><h2 id="visitor-map-title">Global visitors</h2><p>访客地图</p><span v-if="state.local" class="visitor-map-status">本地预览</span><a v-if="state.statsUrl" class="visitor-map-details" :href="state.statsUrl" target="_blank" rel="noopener noreferrer">查看访问统计</a></div><figure class="visitor-map-figure"><div class="visitor-map-canvas" :class="{'is-live':state.active&&!failed}"><component v-if="state.active&&!failed" :is="state.statsUrl?'a':'div'" class="visitor-map-live" :class="{'is-loaded':loaded}" :aria-busy="!loaded" :href="state.statsUrl||undefined" :target="state.statsUrl?'_blank':undefined" :rel="state.statsUrl?'noopener noreferrer':undefined" :aria-label="state.statsUrl?'打开访客地图统计':undefined"><img :src="state.imageUrl" width="1200" height="612" alt="网站访客的世界地图分布" decoding="async" fetchpriority="low" referrerpolicy="strict-origin" @load="loaded=true" @error="failed=true"></component><template v-else><img class="visitor-map-base" src="images/brand/world-land.svg" width="1000" height="400" alt="世界陆地图，标记湖南大学所在地，不包含访客数据" loading="lazy"><span class="visitor-map-lab-pin" role="img" aria-label="课题组所在地：湖南大学，长沙"><i></i><span>湖南大学 · 长沙</span></span></template></div><figcaption v-if="state.local"><span class="visitor-map-legend"><i></i>课题组所在地</span><span>{{state.configured?'本地访问不计入统计':'连接统计服务后显示真实访问分布'}}</span></figcaption><figcaption v-else><span>{{failed?'访问统计暂时无法加载':'访客位置基于 IP 大致定位'}}</span><a href="https://mapmyvisitors.com/b/policy" target="_blank" rel="noopener noreferrer">MapMyVisitors · 隐私说明</a></figcaption></figure></div></section>`};
})(typeof window==='undefined'?globalThis:window);
