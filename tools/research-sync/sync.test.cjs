'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {parseSource,matchExisting,normalize}=require('./parse.cjs');
const {resolveArticle,firstFigure,imageExtension}=require('./enrich.cjs');
const {sync,mergeCache}=require('../sync-research.cjs');
const source='https://csee.hnu.edu.cn/people/zengxiangxiang';
const config={source,startYear:2025,minimumSourceRecords:1,maximumNewRecords:30,aliases:{curated:['TRACE: Transformation-Aware Graph Refinement for Reaction Condition Prediction']}};
const known={id:'curated',year:2026,title:'TRACE: Transformation-Aware Graph Refinement for Reaction Condition Prediction',authors:'Yujie Chen, Xiangxiang Zeng',venue:'AAAI',family:'Conferences',topic:'Molecular learning',url:'https://ojs.aaai.org/paper',image:'images/existing.png',source,quality:{label:'CCF-A',kind:'ccf',grade:'A',source:'https://www.ccf.org.cn/Academic_Evaluation/AI/'}};
const old='<p>[1] Yujie Chen, Xiangxiang Zeng, TRACE: Transformation-Aware Graph Refinement for Reaction Condition Prediction. AAAI 2025.</p>';
const fresh='<p>[2] Ann Lin, Xiangxiang Zeng, SafeFuture: Reliable Molecular Reasoning for Scientific Discovery, NeurIPS 2026.</p>';
const page=(content)=>'<h2>学术著作</h2>'+content+'<h2>科研项目</h2>';
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'biohai-sync-test-'));
  t.after(()=>{const target=path.resolve(root);if(path.dirname(target)!==path.resolve(os.tmpdir())||!path.basename(target).startsWith('biohai-sync-test-'))throw Error('Unexpected test cleanup path');fs.rmSync(target,{recursive:true,force:true});});
  const write=(file,value)=>{const f=path.join(root,file);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof value==='string'?value:JSON.stringify(value));};
  write('assets/data/research-sync-config.json',config);write('assets/data/publications.json',[known]);write('assets/data/figure-sources.json',{});write('assets/data/venue-metrics.json',{journals:[],ccf:{a:['NeurIPS','AAAI'],b:['EMNLP'],source:'https://www.ccf.org.cn/Academic_Evaluation/AI/'}});write('images/existing.png','existing figure');
  const get=async()=>({body:Buffer.from(page(fresh+old)),type:'text/html',url:source});
  return {root,write,get,read:file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))};
}
test('Faculty markup, punctuation, lower-case author names and title commas parse correctly',()=>{
  const html=page('<p>[4] Hongxin xiang, <strong>Xiangxiang Zeng</strong>, TestBench: Learning Molecules, Proteins and Reactions, NeurIPS 2026.</p><p>[3] H Lai, et al. Xiangxiang Zeng. Unlocking diverse molecular binding modes using latent feature sampling. Nature Machine Intelligence, 2026.</p>'+old);
  const r=parseSource(html,config);assert.equal(r.errors.length,0);assert.equal(r.entries.length,3);assert.equal(r.entries[0].title,'TestBench: Learning Molecules, Proteins and Reactions');assert.equal(r.entries[1].authors,'H Lai, et al. Xiangxiang Zeng');
});
test('Aliases and spelling changes identify an existing paper',()=>{
  assert.equal(matchExisting({title:'MPO: Multi-Perspective Study'},[{id:'m2po',title:'M²PO: Multi-Perspective Study'}],{m2po:['MPO: Multi-Perspective Study']}).id,'m2po');
  assert.equal(normalize('DNA sequence modelling'),normalize('DNA sequence modeling'));
});
test('Import is idempotent and preserves corrected years, primary URLs, covers and labels',async t=>{
  const f=fixture(t);const first=await sync({root:f.root,request:f.get,offline:true});assert.equal(first.added.length,1);const saved=f.read('assets/data/publications.json');const curated=saved.find(p=>p.id==='curated');
  for(const key of ['year','url','image','title','quality'])assert.deepEqual(curated[key],known[key]);
  const second=await sync({root:f.root,request:f.get,offline:true});assert.equal(second.added.length,0);assert.deepEqual(f.read('assets/data/publications.json'),saved);assert.equal(saved.length,2);
});
test('A missing figure does not discard the new publication',async t=>{
  const f=fixture(t);await sync({root:f.root,request:f.get,offline:true});const added=f.read('assets/data/publications.json').find(p=>p.autoSync);assert.ok(added);assert.equal(added.image,'');assert.equal(added.source,source);assert.equal(added.quality.label,'CCF-A');
});
test('Source outage or layout drift leaves the current archive untouched',async t=>{
  const f=fixture(t),before=fs.readFileSync(path.join(f.root,'assets/data/publications.json'),'utf8');
  await assert.rejects(sync({root:f.root,request:async()=>{throw Error('503');}}));
  await assert.rejects(sync({root:f.root,request:async()=>({body:Buffer.from('<h1>Maintenance</h1>')})}));
  await assert.rejects(sync({root:f.root,request:async()=>({body:Buffer.from(page('<p>[1] Broken entry. Unknown 2026.</p>'))})}));
  assert.equal(fs.readFileSync(path.join(f.root,'assets/data/publications.json'),'utf8'),before);
});
test('Dry run writes no archive, report or cache files',async t=>{
  const f=fixture(t);await sync({root:f.root,request:f.get,dryRun:true});assert.equal(f.read('assets/data/publications.json').length,1);assert.equal(fs.existsSync(path.join(f.root,'.research-sync-cache')),false);assert.equal(fs.existsSync(path.join(f.root,'assets/data/research-sync-status.json')),false);
});
test('A similarly titled Crossref result is rejected',async()=>{
  const fake=async url=>({body:Buffer.from(url.includes('crossref')?JSON.stringify({message:{items:[{title:['Unrelated molecular reasoning paper'],type:'journal-article',DOI:'10.1234/wrong',author:[{given:'Xiangxiang',family:'Zeng'}]}]}}):'<feed></feed>')});
  assert.deepEqual(await resolveArticle({title:'Our New Molecular Discovery',links:[]},fake),{});
});
test('A title match from a different author is rejected',async()=>{
  const fake=async url=>({body:Buffer.from(url.includes('crossref')?JSON.stringify({message:{items:[{title:['Our New Molecular Discovery'],type:'journal-article',DOI:'10.1234/wrong',author:[{given:'Someone',family:'Else'}]}]}}):'<feed></feed>')});
  assert.deepEqual(await resolveArticle({title:'Our New Molecular Discovery',links:[]},fake),{});
});
test('Only Figure 1 is selected, rather than Figure 10 or the website logo',()=>{
  const f=firstFigure('<img src="logo.png"><figure><img src="ten.png"><figcaption>Figure 10: Results</figcaption></figure><figure><img src="fig1.png"><figcaption>Figure <b>1</b>: Architecture</figcaption></figure>','https://arxiv.org/html/1234.56789');assert.equal(f.url,'https://arxiv.org/html/fig1.png');
  assert.equal(firstFigure('<meta property="og:image" content="logo.png">','https://example.org'),null);
  assert.throws(()=>imageExtension(Buffer.from('<html>error</html>')));
});
test('Cached automatic records restore their local image and preserve manually edited records',t=>{
  const f=fixture(t),auto={...known,id:'auto-123',title:'An Automatically Imported Paper',autoSync:true,image:'images/research/auto/auto-123.png'};f.write('.research-sync-cache/files/auto-123.png','cached image');
  const papers=[structuredClone(known)];mergeCache(papers,{papers:[{...known,year:2024},auto],figures:{}},{},f.root);assert.equal(papers[0].year,2026);assert.equal(papers[1].image,auto.image);assert.equal(fs.existsSync(path.join(f.root,auto.image)),true);
});
