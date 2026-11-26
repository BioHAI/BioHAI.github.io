'use strict';
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {plain,normalize,attributes,httpsURL}=require('./parse.cjs');
const exec=promisify(execFile);
const marker='\n__BIOHAI_RESPONSE_INFO_4fd28f__';
let lastArxivQuery=0;
async function request(url) {
  if(!httpsURL(url))throw Error('Only HTTPS sources are supported');
  const {stdout}=await exec(process.platform==='win32'?'curl.exe':'curl',[
    '--fail','--location','--silent','--show-error','--proto','=https','--proto-redir','=https',
    '--connect-timeout','10','--max-time','30','--retry','1','--retry-delay','1','--max-filesize','12000000',
    '--user-agent','BioHAI-ResearchSync/1.0 (+https://biohai.github.io/)',
    '--write-out',marker+'%{content_type}\t%{url_effective}',url
  ],{encoding:'buffer',maxBuffer:13_000_000,windowsHide:true});
  const at=stdout.lastIndexOf(Buffer.from(marker));
  if(at<0)throw Error('Incomplete HTTP response');
  const [type,finalURL]=stdout.subarray(at+marker.length).toString().split('\t');
  return {body:stdout.subarray(0,at),type,url:finalURL};
}
const primaryHost=u=>{try{return /(^|\.)(arxiv\.org|nature\.com|doi\.org|aclanthology\.org|openreview\.net|mlr\.press|thecvf\.com|ijcai\.org|aaai\.org|acm\.org|sciencedirect\.com|springer\.com|springernature\.com|cell\.com|neurips\.cc)$/.test(new URL(u).hostname);}catch{return false;}};
async function resolveArticle(entry, requestFn=request) {
  if(entry.doi)return {url:'https://doi.org/'+entry.doi,verification:'primary'};
  const direct=entry.links.find(primaryHost);
  if(direct)return {url:direct,verification:'primary'};
  try{
    const endpoint=new URL('https://api.crossref.org/works');endpoint.searchParams.set('query.title',entry.title);endpoint.searchParams.set('rows','3');
    const data=JSON.parse((await requestFn(endpoint.href)).body.toString());
    const work=data.message?.items?.find(w=>normalize(w.title?.[0]||'')===normalize(entry.title)&&['journal-article','proceedings-article','posted-content'].includes(w.type)&&w.author?.some(a=>normalize((a.given||'')+' '+(a.family||''))==='xiangxiangzeng'));
    if(work?.DOI)return {url:'https://doi.org/'+work.DOI,verification:'primary'};
  }catch{/* A missing metadata service does not hide a faculty-listed paper. */}
  try{
    const endpoint=new URL('https://export.arxiv.org/api/query');endpoint.searchParams.set('search_query','ti:"'+entry.title.replace(/"/g,'')+'"');endpoint.searchParams.set('max_results','3');
    if(requestFn===request){const delay=3000-(Date.now()-lastArxivQuery);if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));lastArxivQuery=Date.now();}
    const xml=(await requestFn(endpoint.href)).body.toString();
    for(const [item]of xml.matchAll(/<entry\b[^>]*>[\s\S]*?<\/entry>/g)){
      const title=plain(item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]||'');
      const authors=[...item.matchAll(/<name[^>]*>([\s\S]*?)<\/name>/g)].map(m=>normalize(plain(m[1])));
      if(normalize(title)!==normalize(entry.title)||!authors.includes('xiangxiangzeng'))continue;
      const id=plain(item.match(/<id[^>]*>([\s\S]*?)<\/id>/)?.[1]||'').replace(/^http:/,'https:');
      if(httpsURL(id))return {url:id,verification:'primary'};
    }
  }catch{/* Keep the public faculty source as a usable fallback. */}
  return {};
}
function firstFigure(html,base) {
  for(const [block]of html.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)){
    const caption=plain(block.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1]||'');
    if(!/\b(?:Figure|Fig\.?)\s*1\b/i.test(caption))continue;
    for(const [tag]of block.matchAll(/<img\b[^>]*>/gi)){
      const a=attributes(tag),url=httpsURL(a['data-src']||a.src,base);
      if(url&&!/\.(?:svg|gif)(?:\?|$)/i.test(url))return {url,caption};
    }
  }
  return null;
}
function imageExtension(buffer) {
  if(buffer.length<2048)throw Error('Image response is too small');
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){if(buffer.readUInt32BE(16)<240||buffer.readUInt32BE(20)<120)throw Error('Figure resolution is too small');return 'png';}
  if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'jpg';
  if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'webp';
  throw Error('Response is not a PNG, JPEG or WebP image');
}
async function findFigure(paper,requestFn=request) {
  if(!paper.url)return null;
  let article=paper.url;
  const arxiv=article.match(/^https:\/\/(?:export\.)?arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}(?:v\d+)?)/);
  if(arxiv)article='https://arxiv.org/html/'+arxiv[1];
  const response=await requestFn(article);
  if(!/html|xml/.test(response.type))return null;
  const figure=firstFigure(response.body.toString(),response.url);
  if(!figure)return null;
  const image=await requestFn(figure.url),extension=imageExtension(image.body);
  return {buffer:image.body,extension,imageSource:image.url,articleSource:response.url,figure:'Figure 1',caption:figure.caption};
}
module.exports={request,resolveArticle,firstFigure,imageExtension,findFigure};
