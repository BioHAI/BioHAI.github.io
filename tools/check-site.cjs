const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const papers=JSON.parse(read('assets/data/publications.json'));
const people=JSON.parse(read('assets/data/people.json'));
const figures=JSON.parse(read('assets/data/figure-sources.json'));
const ids=new Set(),titles=new Set();
const normalized=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
let references=0;
function asset(file){if(!file||/^(https?:|data:)/.test(file))return;assert.ok(fs.existsSync(path.join(root,decodeURIComponent(file))),`Missing asset: ${file}`);references++;}
function url(value){if(value)assert.ok(/^https?:\/\//.test(value),`Invalid URL: ${value}`);}
for(const paper of papers){
 assert.ok(paper.title&&paper.authors&&paper.venue,`Incomplete paper: ${paper.id}`);
 assert.ok(Number.isInteger(paper.year)&&paper.year>=2000&&paper.year<=new Date().getFullYear()+1,`Invalid year: ${paper.id}`);
 assert.ok(!ids.has(paper.id),`Duplicate ID: ${paper.id}`);ids.add(paper.id);
 assert.ok(!titles.has(normalized(paper.title)),`Duplicate title: ${paper.title}`);titles.add(normalized(paper.title));
 assert.ok(!/^\[\s*\d+/.test(paper.authors),`Unclean author field: ${paper.id}`);
 asset(paper.image);asset(paper.thumbnail);for(const value of [paper.url,paper.pdf,paper.code])url(value);
 if(paper.year>=2025)assert.ok(paper.source?.startsWith('https://'),`Missing recent-paper provenance: ${paper.id}`);
 if(paper.quality){url(paper.quality.source);if(paper.quality.kind==='if'){assert.ok(paper.quality.value>0&&Number.isInteger(paper.quality.year),`Unversioned impact factor: ${paper.id}`);}else assert.ok(['A','B','C'].includes(paper.quality.grade),`Invalid CCF grade: ${paper.id}`);}
}
for(const person of people){assert.ok(person.name&&person.role);asset(person.image);asset(person.thumbnail);url(person.url);url(person.scholar);}
for(const figure of Object.values(figures)){asset(figure.image);url(figure.imageSource);url(figure.articleSource);}
const news=JSON.parse(read('assets/data/legacy-news.json'));
for(const items of Object.values(news.rewardInformation))for(const item of items)asset(item.image_file);
for(const file of ['index','People','Publication','News','Research','Openings','OtherStu']){
 const html=read(file+'.html');assert.ok(html.includes('width=device-width')&&!html.includes('user-scalable=no'));
 for(const m of html.matchAll(/(?:src|href)="((?:assets\/)[^"]+)"/g))asset(m[1]);
 assert.ok(html.includes('assets/js/site.js')&&html.includes('assets/css/site.css'));
 assert.ok(html.includes('assets/css/blue-refresh.css')&&html.includes('assets/js/lab-pages.js'));
}
for(const file of ['research','openings','otherstu'])assert.ok(read('assets/data/'+file+'.html').length>100);
const lab=JSON.parse(read('assets/data/lab-content.json'));
assert.equal(new Set(lab.professors.map(p=>p.name)).size,lab.professors.length);
for(const p of lab.professors){assert.ok(people.some(m=>m.name===p.name&&m.role==='faculty'));assert.ok(p.rank&&p.rankZh&&p.recruitment.email&&p.recruitment.summary);asset(p.image);url(p.url);}
for(const project of lab.projects){assert.ok(project.title&&project.program&&project.period);assert.ok(lab.professors.some(p=>p.name===project.owner));url(project.source);}
for(const file of ['images/brand/ai4health-logo.png','images/brand/slogan.png','images/brand/world-land.svg','assets/data/visitor-map.json','assets/fonts/Manrope-Variable.ttf','assets/fonts/Manrope-OFL.txt','assets/fonts/NotoSansSC-Site.woff2','assets/fonts/NotoSansSC-OFL.txt'])asset(file);
assert.ok(!read('assets/js/site.js').includes('/ RESEARCH FIGURE'));
for(const file of ['assets/js/site.js','assets/js/lab-pages.js','assets/js/visitor-map.js','tools/build-world-map.cjs','tools/serve.cjs','tools/build-pages.cjs','tools/sync-research.cjs','tools/research-sync/parse.cjs','tools/research-sync/enrich.cjs','tools/watch-research.cjs','tools/package-site.cjs'])cp.execFileSync(process.execPath,['--check',path.join(root,file)],{stdio:'pipe'});
const {resolveVisitorMap}=require('../assets/js/visitor-map.js');
const visitorConfig=JSON.parse(read('assets/data/visitor-map.json'));
assert.ok(Array.isArray(visitorConfig.siteHosts)&&typeof visitorConfig.enabled==='boolean');
assert.ok(visitorConfig.siteHosts.every(h=>typeof h==='string'&&/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i.test(h)));
if(visitorConfig.enabled)assert.ok(resolveVisitorMap(visitorConfig,visitorConfig.siteHosts[0]).active,'Visitor map is enabled but its configuration is invalid');
const enabledMap={enabled:true,provider:'mapmyvisitors',siteHosts:['biohai.github.io'],widgetKey:'valid-demo-key',statsUrl:'https://mapmyvisitors.com/web/example'};
assert.equal(resolveVisitorMap(enabledMap,'127.0.0.1').active,false);
assert.equal(resolveVisitorMap(enabledMap,'localhost').imageUrl,'');
assert.equal(resolveVisitorMap({...enabledMap,enabled:false},'biohai.github.io').show,false);
assert.equal(resolveVisitorMap(enabledMap,'unlisted.example').active,false);
assert.equal(resolveVisitorMap({...enabledMap,widgetKey:''},'biohai.github.io').active,false);
assert.equal(resolveVisitorMap(enabledMap,'biohai.github.io').active,true);
assert.equal(resolveVisitorMap({...enabledMap,statsUrl:'javascript:alert(1)'},'biohai.github.io').statsUrl,'');
console.log(`PASS: ${papers.length} unique publications, ${people.length} members, ${references} local asset references, 7 page entries, JavaScript syntax.`);
console.log(`Research gallery: ${papers.length} papers, ${papers.filter(p=>p.image).length} real covers. Records awaiting a cover: ${papers.filter(p=>!p.image).map(p=>p.id).join(', ')}.`);
console.log(`Updated profiles: ${lab.professors.length}; source-linked projects: ${lab.projects.length}; verified publication labels: ${papers.filter(p=>p.quality).length}.`);
