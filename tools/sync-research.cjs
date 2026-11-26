'use strict';
const fs=require('node:fs'),path=require('node:path');
const {parseSource,matchExisting,newPaper,normalize}=require('./research-sync/parse.cjs');
const {request,resolveArticle,findFigure}=require('./research-sync/enrich.cjs');
const defaultRoot=path.resolve(__dirname,'..');
const readJSON=(file,root=defaultRoot)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
function writeJSON(file,value,root=defaultRoot){const full=path.join(root,file);fs.mkdirSync(path.dirname(full),{recursive:true});const temp=full+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n');fs.renameSync(temp,full);}
function cachedAsset(value){return typeof value==='string'&&/^images\/research\/auto\/[a-z0-9-]+\.(png|jpg|webp)$/.test(value);}
function mergeCache(papers,cache,figures,root=defaultRoot) {
  for(const old of cache.papers||[]){
    let paper=papers.find(p=>p.id===old.id);
    if(!paper&&old.autoSync){paper={...old,image:''};delete paper.thumbnail;papers.push(paper);}
    if(!paper||normalize(paper.title)!==normalize(old.title))continue;
    if(!paper.url&&old.url&&old.verification==='primary'){paper.url=old.url;paper.verification=old.verification;}
    if(paper.image||!cachedAsset(old.image))continue;
    const src=path.join(root,'.research-sync-cache/files',path.basename(old.image));
    if(!fs.existsSync(src))continue;
    fs.mkdirSync(path.dirname(path.join(root,old.image)),{recursive:true});fs.copyFileSync(src,path.join(root,old.image));
    for(const key of ['image','imageSource','figure','figureSource'])paper[key]=old[key];
    if(cache.figures?.[old.id])figures[old.id]=cache.figures[old.id];
  }
}
function validate(papers,root=defaultRoot) {
  const ids=new Set(),titles=new Set();
  for(const p of papers){
    if(!p.id||!p.title||!p.authors||!p.venue||!p.source||!Number.isInteger(p.year))throw Error('Incomplete publication record');
    if(ids.has(p.id)||titles.has(normalize(p.title)))throw Error('Duplicate publication: '+p.title);
    ids.add(p.id);titles.add(normalize(p.title));
    if(p.image&&!fs.existsSync(path.join(root,p.image)))throw Error('Missing cover: '+p.image);
  }
}
async function sync(options={}) {
  const root=options.root||defaultRoot;
  const read=file=>readJSON(file,root),write=(file,value)=>writeJSON(file,value,root);
  const config=read('assets/data/research-sync-config.json'),metrics=read('assets/data/venue-metrics.json');
  const papers=read('assets/data/publications.json'),figures=read('assets/data/figure-sources.json');
  const get=options.request||request;
  const html=options.sourceFile?fs.readFileSync(options.sourceFile,'utf8'):(await get(config.source)).body.toString();
  const parsed=parseSource(html,config,papers.map(p=>p.venue),papers.flatMap(p=>[p.title,p.sourceRecord?.title,...(config.aliases[p.id]||[])].filter(Boolean)));
  if(parsed.errors.length)throw Error('Source parser needs review: '+parsed.errors.map(e=>'['+e.ordinal+'] '+e.error).join('; '));
  if(!options.dryRun&&fs.existsSync(path.join(root,'.research-sync-cache/snapshot.json')))mergeCache(papers,read('.research-sync-cache/snapshot.json'),figures,root);
  const now=new Date().toISOString(),entries=parsed.entries.filter(e=>e.year>=config.startYear);
  const added=[],enriched=[],warnings=[];let requests=0;
  const staged=[],enrichmentStarted=Date.now();
  for(const entry of entries){
    let paper=matchExisting(entry,papers,config.aliases);
    if(!paper){paper=newPaper(entry,config,metrics);papers.push(paper);added.push(paper.id);}
    paper.sourceRecord={ordinal:entry.ordinal,title:entry.title,authors:entry.authors,venue:entry.venue,year:entry.year};
    // Existing titles, corrected years, figures, URLs and verified quality labels remain authoritative.
    if(!paper.image&&!options.offline&&!options.dryRun&&requests<12&&Date.now()-enrichmentStarted<180000){
      requests++;
      try{
        if(!paper.url){const link=await resolveArticle(entry,get);if(link.url)Object.assign(paper,link);}
        const figure=await findFigure(paper,get);
        if(figure){
          const file='images/research/auto/'+paper.id+'.'+figure.extension;
          Object.assign(paper,{image:file,imageSource:figure.imageSource,figure:figure.figure,figureSource:figure.articleSource});
          figures[paper.id]={image:file,imageSource:figure.imageSource,articleSource:figure.articleSource,figure:figure.figure,retrieved:now.slice(0,10)};
          staged.push({file,buffer:figure.buffer});enriched.push(paper.id);
        }
      }catch(error){warnings.push(paper.id+': '+(error.stderr?String(error.stderr).trim().split('\n').at(-1):error.message.split('\n')[0]));}
    }
  }
  if(added.length>config.maximumNewRecords)throw Error(`Found ${added.length} new records; review the source before importing a large batch.`);
  const ordinal=p=>p.sourceRecord?.ordinal||0;
  papers.sort((a,b)=>b.year-a.year||ordinal(b)-ordinal(a));
  const report={source:config.source,checkedAt:now,sourceRecords:parsed.candidates,recentRecords:entries.length,totalRecords:papers.length,added,enriched,withoutFigure:papers.filter(p=>!p.image).map(p=>p.id),warnings};
  if(!options.dryRun){
    for(const {file,buffer}of staged){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),buffer);}
    validate(papers,root);
    write('assets/data/publications.json',papers);write('assets/data/figure-sources.json',figures);write('assets/data/research-sync-status.json',report);
    for(const p of papers.filter(p=>cachedAsset(p.image))){const to=path.join(root,'.research-sync-cache/files',path.basename(p.image));fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,p.image),to);}
    write('.research-sync-cache/snapshot.json',{papers,figures});
  }
  return report;
}
if(require.main===module){
  const args=process.argv.slice(2),value=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
  sync({sourceFile:value('--source-file'),dryRun:args.includes('--dry-run'),offline:args.includes('--offline')})
    .then(report=>console.log(JSON.stringify(report,null,2))).catch(error=>{console.error('Research sync failed; existing data retained. '+error.message);process.exitCode=1;});
}
module.exports={sync,validate,mergeCache};
