/* Size-bounded photo encoding, shared by the local editor and its tests. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BioHAIImageCompression=api;})(typeof window==='object'?window:this,function(){
 'use strict';
 const PROFILES={portrait:{maxWidth:960,maxHeight:1200,targetBytes:180*1024},portraitPreview:{maxWidth:360,maxHeight:450,targetBytes:40*1024},figurePreview:{maxWidth:1000,maxHeight:800,targetBytes:180*1024}};
 function fit(width,height,maxWidth,maxHeight){
  if(![width,height,maxWidth,maxHeight].every(n=>Number.isFinite(n)&&n>0))throw Error('图片尺寸不正确');
  const ratio=Math.min(1,maxWidth/width,maxHeight/height);
  return{width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
 }
 // Prefer resolution and facial detail: find the highest acceptable quality,
 // then reduce dimensions only when even the quality floor exceeds the budget.
 async function encodeToBudget(width,height,profile,encode){
  let size=fit(width,height,profile.maxWidth,profile.maxHeight);
  for(let scale=0;scale<12;scale++){
   const render=async quality=>{const blob=await encode(size.width,size.height,quality);if(!blob||!Number.isFinite(blob.size)||blob.size<=0)throw Error('无法生成压缩图片');return{blob,...size,quality};};
   const high=await render(.9);if(high.blob.size<=profile.targetBytes)return high;
   let best=await render(.72);
   if(best.blob.size<=profile.targetBytes){let lo=.72,hi=.9;for(let i=0;i<5;i++){const q=(lo+hi)/2,result=await render(q);if(result.blob.size<=profile.targetBytes){best=result;lo=q;}else hi=q;}return best;}
   size={width:Math.max(1,Math.floor(size.width*.82)),height:Math.max(1,Math.floor(size.height*.82))};
  }
  throw Error('图片压缩未达到目标体积，请换一张照片');
 }
 async function compressBitmap(bitmap,profile){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('浏览器无法处理图片');
  let mime='image/webp',drawn='';
  const draw=(w,h)=>{const key=w+'x'+h+mime;if(drawn===key)return;canvas.width=w;canvas.height=h;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(mime==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}ctx.drawImage(bitmap,0,0,w,h);drawn=key;};
  try{return await encodeToBudget(bitmap.width,bitmap.height,profile,async(w,h,q)=>{
   draw(w,h);let blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,q));
   if(mime==='image/webp'&&(!blob||blob.type!=='image/webp')){mime='image/jpeg';draw(w,h);blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,q));}
   return blob;
  });}finally{canvas.width=canvas.height=1;}
 }
 const formatBytes=n=>n>=1024*1024?(n/1024/1024).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
 return{PROFILES,fit,encodeToBudget,compressBitmap,formatBytes};
});
