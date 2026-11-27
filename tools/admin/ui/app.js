/* Local-only content editor. Never stores GitHub credentials in the browser. */
(()=>{'use strict';const {createApp,ref,reactive,computed,onMounted,onBeforeUnmount,nextTick}=Vue;
createApp({setup(){
 const token=document.querySelector('meta[name="admin-token"]').content;
 const tabs=[{id:'members',collection:'members',label:'团队成员',singular:'成员',symbol:'人',description:'教师、访问学者、博士后与学生，在这里统一维护。'},{id:'papers',collection:'papers',label:'研究论文',singular:'论文',symbol:'文',description:'更新论文信息、研究方向和主图，让新成果及时呈现。'},{id:'awards',collection:'awards',label:'奖励与荣誉',singular:'荣誉',symbol:'誉',description:'记录值得珍藏的学术荣誉，上传图片即可生成卡片。'}];
 const roles=[{id:'faculty',name:'教师'},{id:'visiting',name:'访问学者'},{id:'postdoc',name:'博士后'},{id:'phd',name:'博士研究生'},{id:'master',name:'硕士研究生'}];
 const state=reactive({members:[],papers:[],awards:[],revision:'',job:null,git:null,settings:{proxy:''}}),kind=ref('members'),query=ref(''),roleFilter=ref('all'),yearFilter=ref('all'),editor=ref(null),loading=ref(true),operation=ref(false),uploading=ref(false),error=ref(''),toast=ref(''),form=ref(null),showPreview=ref(false),showSettings=ref(false),showPublish=ref(false),previewDevice=ref('desktop'),previewUrl=ref('/preview/index.html'),proxy=ref('');let timer,toastTimer;
 const currentYear=new Date().getFullYear(),activeTab=computed(()=>tabs.find(t=>t.id===kind.value)),collection=computed(()=>state[activeTab.value.collection]),changes=computed(()=>state.git?.changes||[]),publishing=computed(()=>state.job?.status==='running'),jobLabel=computed(()=>({running:'查看进度',success:'发布成功',failed:'发布未完成',submitted:'等待部署',unchanged:'已同步'}[state.job?.status]||'发布记录'));
 const signature=e=>JSON.stringify([e.record,e.interestsText,e.qualityKind,e.metric]);
 const dirty=computed(()=>!!editor.value&&signature(editor.value)!==editor.value.snapshot);
 const years=computed(()=>[...new Set(collection.value.map(p=>p.cohort||p.year).filter(Boolean).map(String))].sort((a,b)=>Number(b)-Number(a)));
 const topics=computed(()=>[...new Set(state.papers.map(p=>p.topic).filter(Boolean))]);
 const filtered=computed(()=>{const q=query.value.toLowerCase().trim();return collection.value.filter(p=>(kind.value!=='members'||roleFilter.value==='all'||p.role===roleFilter.value)&&(yearFilter.value==='all'||String(p.cohort||p.year)===yearFilter.value)&&[p.name,p.email,p.bio,p.title,p.authors,p.venue,p.textdescription].filter(Boolean).join(' ').toLowerCase().includes(q));});
 function notify(message){toast.value=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.value='',4500);}
 async function api(route,body){const response=await fetch('/api'+route,{method:body===undefined?'GET':'POST',headers:{'X-Admin-Token':token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});let result;try{result=await response.json();}catch{throw Error('本地服务连接已中断，请重新启动管理界面');}if(!response.ok)throw Error(result.error||'操作未完成');return result;}
 async function load(){const data=await api('/state');Object.assign(state,data);if(publishing.value)schedulePoll();}
 function assetUrl(value){if(!value)return '';return value.startsWith('@upload:')?'':'/preview/'+value.split('/').map(encodeURIComponent).join('/');}
 function rowMeta(p){return kind.value==='members'?(roles.find(r=>r.id===p.role)?.name||p.role)+(p.cohort?' · '+p.cohort+' 级':''):kind.value==='papers'?p.year+' · '+p.venue:p.year+' 年';}
 function mayDiscard(){if(operation.value||uploading.value){error.value='正在处理内容，请稍候再切换记录';return false;}return !dirty.value||window.confirm('当前表单尚未保存，确定放弃这些修改吗？');}
 function choose(item,force=false){if(!force&&!mayDiscard())return;const record=JSON.parse(JSON.stringify(item));delete record.editorKey;if(kind.value==='awards')record.image=record.image_file||'';record.recruitment={year:'',types:[],summary:'',detail:'',quota:'',email:record.email||'',...(record.recruitment||{})};const e={key:item.editorKey||'',revision:state.revision,record,interestsText:(record.interests||[]).join('、'),qualityKind:record.quality?.kind||'none',metric:{grade:'A',value:'',year:currentYear,source:'',note:'',...(record.quality||{})},previewUrl:''};e.snapshot=signature(e);editor.value=e;error.value='';}
 function createRecord(){if(!mayDiscard())return;let record;if(kind.value==='members')record={name:'',role:'phd',cohort:'',email:'',bio:'',image:'',thumbnail:'',english:'',url:'',scholar:'',website:'',alternateEmail:'',rank:'',rankZh:'',interests:[],openingsEnabled:false};else if(kind.value==='papers')record={title:'',authors:'',venue:'',year:currentYear,family:'Journals',topic:'Scientific AI',url:'',source:'',pdf:'',code:'',image:'',thumbnail:'',figure:'',figureSource:'',imageSource:'',note:''};else record={textdescription:'',year:currentYear,image:'',thumbnail:''};choose(record,true);editor.value.snapshot='';}
 function switchKind(value){if(kind.value===value)return;if(!mayDiscard())return;kind.value=value;query.value='';roleFilter.value='all';yearFilter.value='all';editor.value=null;error.value='';}
 async function refresh(){if(!mayDiscard())return;editor.value=null;error.value='';loading.value=true;try{await load();notify('列表已刷新');}catch(e){error.value=e.message;}finally{loading.value=false;}}
 function discard(){if(!mayDiscard())return;const item=collection.value.find(p=>p.editorKey===editor.value?.key);if(item)choose(item,true);else editor.value=null;}
 async function save(withPreview){if(!editor.value||operation.value||uploading.value)return;if(!form.value.reportValidity())return;operation.value=true;error.value='';try{const e=editor.value,record=JSON.parse(JSON.stringify(e.record));record.interests=e.interestsText.split(/[,，、;；\n]/).map(t=>t.trim()).filter(Boolean);record.quality=e.qualityKind==='none'?null:{...e.metric,kind:e.qualityKind};const result=await api('/save',{kind:kind.value,key:e.key,record,revision:e.revision});Object.assign(state,result);choose(collection.value.find(p=>p.editorKey===result.savedKey),true);notify('已保存到本地，并自动备份');try{await load();}catch{}if(withPreview)openPreview(true);}catch(e){error.value=e.message;}finally{operation.value=false;}}
 async function fileBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('图片读取失败'));r.readAsDataURL(file);});}
 async function upload(event){
  const file=event.target.files?.[0];if(!file||!editor.value)return;
  const portrait=kind.value==='members',limit=(portrait?50:15)*1024*1024;
  if(file.size>limit){error.value=portrait?'照片最大 50 MB，请选择较小的文件':'原图最大 15 MB，请先缩小图片后上传';event.target.value='';return;}
  uploading.value=true;error.value='';let bitmap;
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 图片');
   bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>80000000)throw Error('图片超过 8000 万像素，请先缩小后上传');
   const {PROFILES,compressBitmap,formatBytes}=BioHAIImageCompression;
   const optimized=portrait?await compressBitmap(bitmap,PROFILES.portrait):null;
   const alreadySmall=portrait&&file.size<=PROFILES.portrait.targetBytes&&file.size<optimized.blob.size&&bitmap.width<=PROFILES.portrait.maxWidth&&bitmap.height<=PROFILES.portrait.maxHeight;
   const websitePhoto=alreadySmall?file:optimized?.blob||file;
   const preview=await compressBitmap(bitmap,portrait?PROFILES.portraitPreview:PROFILES.figurePreview);
   const [original,small]=await Promise.all([fileBase64(websitePhoto),fileBase64(preview.blob)]);
   const uploaded=await api('/upload',{kind:kind.value,original,thumbnail:small,width:preview.width,height:preview.height});
   editor.value.record.image=uploaded.image;editor.value.record.thumbnail='';editor.value.previewUrl=uploaded.previewUrl;
   editor.value.uploadInfo=portrait?'照片已优化：'+formatBytes(file.size)+' → '+formatBytes(websitePhoto.size)+'；列表预览 '+formatBytes(preview.blob.size):'预览图已优化：'+formatBytes(preview.blob.size);
   notify('图片已准备好，保存后即可出现在网站中');
  }catch(e){error.value=e.message||'图片处理失败，请选择 JPG、PNG 或 WebP 图片';}
  finally{bitmap?.close();uploading.value=false;event.target.value='';}
 }
 function clearImage(){if(uploading.value)return;editor.value.record.image='';editor.value.record.thumbnail='';editor.value.previewUrl='';editor.value.uploadInfo='';}
 function openPreview(saved=false){if(dirty.value&&!saved){error.value='表单有未保存修改，请点击“保存并预览”查看最新内容';return;}let url='/preview/index.html';const r=editor.value?.record;if(kind.value==='members')url='/preview/People.html'+(r?.name?'?q='+encodeURIComponent(r.name):'');if(kind.value==='papers')url='/preview/index.html'+(r?.title?'?q='+encodeURIComponent(r.title):'')+'#latest-research';if(kind.value==='awards')url='/preview/News.html?tab=awards';previewUrl.value=url;showPreview.value=true;}
 function openSettings(){proxy.value=state.settings?.proxy||'';showSettings.value=true;}
 async function saveSettings(){operation.value=true;error.value='';try{state.settings=await api('/settings',{proxy:proxy.value});showSettings.value=false;notify('连接设置已保存在本机');}catch(e){error.value=e.message;showSettings.value=false;}finally{operation.value=false;}}
 function schedulePoll(){clearTimeout(timer);timer=setTimeout(pollJob,1500);}
 async function pollJob(){try{const data=await api('/publish');state.job=data.job;if(publishing.value)schedulePoll();else{try{await load();}catch{}}}catch(e){error.value=e.message;if(publishing.value)schedulePoll();}}
 async function publish(){if(dirty.value){error.value='请先保存表单，再发布已保存内容';return;}error.value='';try{const data=await api('/publish',{revision:state.revision});state.job=data.job;showPublish.value=true;schedulePoll();}catch(e){error.value=e.message;}}
 const formatTime=value=>new Date(value).toLocaleTimeString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'});
 function beforeUnload(e){if(dirty.value){e.preventDefault();e.returnValue='';}}
 function escape(e){if(e.key==='Escape'){showPreview.value=false;showSettings.value=false;showPublish.value=false;}}
 onMounted(async()=>{try{await load();}catch(e){error.value=e.message;}finally{loading.value=false;}window.addEventListener('beforeunload',beforeUnload);document.addEventListener('keydown',escape);});onBeforeUnmount(()=>{clearTimeout(timer);clearTimeout(toastTimer);window.removeEventListener('beforeunload',beforeUnload);document.removeEventListener('keydown',escape);});
 return{tabs,roles,state,kind,query,roleFilter,yearFilter,editor,loading,operation,uploading,error,toast,form,showPreview,showSettings,showPublish,previewDevice,previewUrl,proxy,currentYear,activeTab,changes,publishing,jobLabel,dirty,years,topics,filtered,assetUrl,rowMeta,choose,createRecord,switchKind,refresh,discard,save,upload,clearImage,openPreview,openSettings,saveSettings,publish,pollJob,formatTime};
}}).mount('#admin');})();
