'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {ContentStore}=require('./store.cjs'),{Publisher}=require('./publish.cjs'),{createAdmin}=require('./server.cjs');
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jrM8AAAAASUVORK5CYII=','base64');
const {fit,encodeToBudget,PROFILES}=require('./ui/image-compression.js');
test('Photo encoding falls back to JPEG when WebP export is unavailable',async t=>{
 const previous=global.document,requests=[],fills=[];
 t.after(()=>{if(previous===undefined)delete global.document;else global.document=previous;});
 const canvas={width:0,height:0,getContext:()=>({drawImage(){},fillRect(){fills.push('white');}}),toBlob(callback,mime){requests.push(mime);callback(new Blob([new Uint8Array(100)],{type:mime==='image/webp'?'image/png':mime}));}};
 global.document={createElement:()=>canvas};
 const result=await require('./ui/image-compression.js').compressBitmap({width:120,height:180},PROFILES.portrait);
 assert.equal(result.blob.type,'image/jpeg');assert.deepEqual(requests,['image/webp','image/jpeg']);assert.equal(fills.length,1);assert.equal(result.width,120);assert.equal(result.height,180);assert.equal(canvas.width,1);
});
test('Photo sizing preserves aspect ratio, never upscales and enforces size budgets',async()=>{
 assert.deepEqual(fit(4000,6000,960,1200),{width:800,height:1200});
 assert.deepEqual(fit(200,300,960,1200),{width:200,height:300});
 assert.throws(()=>fit(0,10,960,1200),/尺寸/);
 const photo=await encodeToBudget(4000,6000,PROFILES.portrait,async(w,h,q)=>({size:Math.round(w*h*q*.24)}));
 assert.ok(photo.blob.size<=PROFILES.portrait.targetBytes);assert.equal(photo.width,800);assert.ok(photo.quality>=.72&&photo.quality<.9);
 const noisy=await encodeToBudget(4000,6000,PROFILES.portrait,async(w,h,q)=>({size:Math.round(w*h*q)}));
 assert.ok(noisy.blob.size<=PROFILES.portrait.targetBytes);assert.ok(noisy.height<1200);assert.ok(Math.abs(noisy.width/noisy.height-2/3)<.01);
 await assert.rejects(encodeToBudget(100,100,PROFILES.portrait,async()=>null),/无法生成/);
 await assert.rejects(encodeToBudget(100,100,PROFILES.portrait,async()=>({size:1024*1024})),/目标体积/);
});
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biohai-admin-test-'));t.after(()=>{assert.equal(path.dirname(root),fs.realpathSync(os.tmpdir()));assert.match(path.basename(root),/^biohai-admin-test-[a-zA-Z0-9]+$/);fs.rmSync(root,{recursive:true,force:true});});
 const write=(f,v)=>{const full=path.join(root,f);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,typeof v==='object'&&!Buffer.isBuffer(v)?JSON.stringify(v,null,2)+'\n':v);};
 for(const file of ['person.png','cover.png','certificate.png','thumbnail.png'])write('images/'+file,PNG);
 write('assets/data/people.json',[{name:'导师甲',role:'faculty',email:'mentor@hnu.edu.cn',cohort:'',image:'images/person.png',url:'https://example.org/mentor',bio:'原简介',rank:'Professor',rankZh:'教授',interests:['AI'],source:'https://example.org/mentor'}]);
 write('assets/data/lab-content.json',{professors:[{name:'导师甲',slug:'mentor',image:'images/person.png',url:'https://example.org/mentor',rank:'Professor',rankZh:'教授',recruitment:{year:'长期招收',types:['博士'],summary:'原招生简介',email:'mentor@hnu.edu.cn'}}],projects:[{owner:'导师甲',title:'项目'}],recognition:[{name:'导师甲',title:'荣誉'}]});
 write('assets/data/publications.json',[{id:'existing',title:'An Existing Paper',authors:'A, B',venue:'Nature',year:2026,source:'https://example.org/article',url:'https://example.org/article',image:'images/cover.png',thumbnail:'images/thumbnail.png',figureSource:'https://example.org/figure',family:'Nature portfolio',topic:'Genomics',sourceRecord:{title:'Original title'},customMetadata:'retain me',quality:{kind:'if',value:10,year:2025,label:'IF 10 · 2025',source:'https://example.org/metrics'}}]);
 write('assets/data/figure-sources.json',{existing:{image:'images/cover.png',articleSource:'https://example.org/figure'}});
 write('assets/data/legacy-news.json',{paperInformation:{keep:['legacy']},rewardInformation:{2024:[{image_file:'images/certificate.png',thumbnail:'images/thumbnail.png',thumbnailWidth:1,thumbnailHeight:1,textdescription:'原荣誉'}]}});
 write('assets/js/vendor/vue.global.prod.js','/* fixture */');write('index.html','<h1>Public preview</h1>');write('.git/config','private');
 const store=new ContentStore(root);return{root,store,read:f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),write};
}
test('Member edits preserve metadata and update teacher, recruitment, project and recognition names together',t=>{
 const f=fixture(t),v=f.store.view(),p=v.members[0];p.name='导师乙';p.email='changed@hnu.edu.cn';p.bio='新简介';p.recruitment.summary='新招生简介';p.recruitment.email='changed@hnu.edu.cn';
 const result=f.store.save('members',p.editorKey,p,v.revision),person=result.members[0],lab=f.read('assets/data/lab-content.json');assert.equal(person.source,'https://example.org/mentor');assert.equal(lab.professors[0].name,'导师乙');assert.equal(lab.professors[0].bio,'新简介');assert.equal(lab.professors[0].recruitment.summary,'新招生简介');assert.equal(lab.projects[0].owner,'导师乙');assert.equal(lab.recognition[0].name,'导师乙');assert.equal(fs.readdirSync(path.join(f.root,'.local-admin/backups')).length,1);
 const edited={...person,bio:'再次编辑'};const second=f.store.save('members',person.editorKey,edited,result.revision);assert.equal(second.members.length,1);assert.equal(second.members[0].id,person.id);
});
test('Uploads stay private until a valid record is saved; PNG previews support browsers without WebP export',t=>{
 const f=fixture(t),u=f.store.stageUpload('members',PNG.toString('base64'),PNG.toString('base64'),1,1);assert.equal(fs.existsSync(path.join(f.root,'images/uploads')),false);
 const v=f.store.view();const result=f.store.save('members','',{name:'新同学',email:'student@hnu.edu.cn',role:'phd',cohort:'2024',image:u.image},v.revision),p=result.members.find(p=>p.name==='新同学');assert.match(p.image,/^images\/uploads\/members\/.+\.png$/);assert.ok(fs.existsSync(path.join(f.root,p.thumbnail)));assert.equal(p.cohort,'2024');
 assert.throws(()=>f.store.stageUpload('members',Buffer.from('<svg onload="evil()">').toString('base64'),PNG.toString('base64'),1,1),/JPG/);
 assert.throws(()=>f.store.stageUpload('members',Buffer.alloc(300*1024).toString('base64'),PNG.toString('base64'),1,1),/尚未压缩/);
 assert.throws(()=>f.store.stageUpload('members',PNG.toString('base64'),Buffer.alloc(70*1024).toString('base64'),1,1),/过大/);
});
test('Validation and revision checks prevent conflicting or unsafe edits without changing saved data',t=>{
 const f=fixture(t),v=f.store.view(),before=fs.readFileSync(path.join(f.root,'assets/data/people.json'),'utf8');
 assert.throws(()=>f.store.save('members','',{name:'重复',role:'phd',cohort:'2024',email:'mentor@hnu.edu.cn'},v.revision),/已存在/);
 assert.throws(()=>f.store.save('members','',{name:'测试',role:'phd',cohort:'2024',url:'javascript:alert(1)'},v.revision),/http/);
 assert.throws(()=>f.store.save('members','',{name:'测试',role:'phd',cohort:'2024',image:'images/../../.git/config'},v.revision),/不存在|路径/);
 assert.equal(fs.readFileSync(path.join(f.root,'assets/data/people.json'),'utf8'),before);
 f.store.save('members','',{name:'新成员',role:'master',cohort:'2025'},v.revision);
 assert.throws(()=>f.store.save('members','',{name:'另一个成员',role:'phd',cohort:'2024'},v.revision),e=>e.status===409);
 const current=f.store.view();const p={...current.members[0],openingsEnabled:false};assert.throws(()=>f.store.save('members',p.editorKey,p,current.revision),/项目关联/);
});
test('Paper edits preserve synchronization provenance, normalize DOI and validate metric sources',t=>{
 const f=fixture(t),v=f.store.view(),paper=v.papers[0];paper.title='An Updated Paper';paper.authors='A, B, C';
 const updated=f.store.save('papers',paper.editorKey,paper,v.revision).papers[0];assert.equal(updated.customMetadata,'retain me');assert.equal(updated.sourceRecord.title,'Original title');assert.equal(updated.quality.label,'IF 10 · 2025');
 const next={title:'A New Paper',authors:'D, E',venue:'AAAI',year:2026,url:'10.1234/example',family:'Conferences',quality:{kind:'ccf',grade:'A',source:'https://www.ccf.org.cn/Academic_Evaluation/AI/'}};
 const saved=f.store.save('papers','',next,f.store.view().revision).papers.find(p=>p.title==='A New Paper');assert.equal(saved.url,'https://doi.org/10.1234/example');assert.equal(saved.source,saved.url);assert.equal(saved.quality.label,'CCF-A');
 assert.throws(()=>f.store.save('papers','',{...next,title:'Another Paper',quality:{kind:'if',value:5,year:2025}},f.store.view().revision),/指标来源/);
});
test('Honor edits move years without losing other news and require optimized previews',t=>{
 const f=fixture(t),v=f.store.view(),award=v.awards[0];award.image=award.image_file;award.year='2025';award.textdescription='更新后的荣誉';const result=f.store.save('awards',award.editorKey,award,v.revision);assert.equal(result.awards[0].year,'2025');assert.deepEqual(f.read('assets/data/legacy-news.json').paperInformation,{keep:['legacy']});assert.equal(f.read('assets/data/legacy-news.json').rewardInformation['2024'],undefined);
 assert.throws(()=>f.store.save('awards','',{year:2026,textdescription:'缺图片'},result.revision),/上传荣誉图片/);
});
test('Local API requires a session, CSRF header, exact origin and safe preview paths',async t=>{
 const f=fixture(t),publisher={busy:false,job:null,settings:()=>({proxy:''}),status:async()=>({available:true,changes:[]}),stop(){},refresh:async()=>null};const app=createAdmin({root:f.root,publisher,testMode:true});const address=await app.listen(0);t.after(()=>app.close());const base='http://127.0.0.1:'+address.port;
 const page=await fetch(base+'/'),html=await page.text(),cookie=page.headers.get('set-cookie').split(';')[0],token=html.match(/name="admin-token" content="([^"]+)/)[1],headers={Cookie:cookie,'X-Admin-Token':token,'Content-Type':'application/json',Origin:base};
 assert.equal((await fetch(base+'/api/state')).status,401);assert.equal((await fetch(base+'/api/state',{headers:{Cookie:cookie}})).status,403);
 const state=await(await fetch(base+'/api/state',{headers})).json();assert.equal(state.members.length,1);
 assert.equal((await fetch(base+'/api/save',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'})).status,403);
 const response=await fetch(base+'/api/save',{method:'POST',headers,body:JSON.stringify({kind:'members',revision:state.revision,record:{name:'API成员',role:'postdoc',cohort:'2025'}})});assert.equal(response.status,200);assert.equal((await response.json()).members.length,2);
 assert.equal((await fetch(base+'/preview/index.html')).status,200);assert.notEqual((await fetch(base+'/preview/.git/config')).status,200);assert.notEqual((await fetch(base+'/preview/tools/admin/server.cjs')).status,200);
 assert.equal((await fetch(base+'/api/publish',{method:'POST',headers,body:JSON.stringify({revision:app.store.view().revision})})).status,403);
});
function publisherFixture(t,{changed=true,ahead=0,behind=0,other=false,invalid=false,failCheck=false}={}){
 const f=fixture(t),calls=[],head='a'.repeat(40);let added=false;
 const execute=async(program,args)=>{calls.push([program,...args]);if(program==='curl')return{out:JSON.stringify({workflow_runs:[{head_sha:head,path:'.github/workflows/update-research.yml',status:'completed',conclusion:'success',html_url:'https://github.com/BioHAI/BioHAI.github.io/actions/runs/1'}]})};if(program!== 'git'){if(failCheck&&args.includes('tools/check-site.cjs'))throw Error('Invalid content');return{out:''};}
  if(args[0]==='branch')return{out:'main\n'};if(args[0]==='remote')return{out:invalid?'https://github.com/other/repository.git\n':'https://github.com/BioHAI/BioHAI.github.io.git\n'};if(args[0]==='diff')return{out:other?'assets/js/site.js\0':changed?'assets/data/people.json\0':''};if(args[0]==='ls-files')return{out:''};if(args[0]==='rev-list')return{out:ahead+' '+behind};if(args[0]==='rev-parse')return{out:head};if(args[0]==='add')added=true;return{out:''};};
 const publisher=new Publisher(f.root,{run:execute,pollMs:1,deadlineMs:100});return{publisher,calls,get added(){return added;}};
}
test('One-click publish checks, stages only managed files, commits and waits for successful Pages deployment',async t=>{
 const f=publisherFixture(t);f.publisher.start('Update content');await f.publisher.task;assert.equal(f.publisher.job.status,'success');const args=f.calls.filter(c=>c[0]==='git').map(c=>c.slice(1));assert.ok(args.some(a=>a[0]==='add'&&a[2]==='assets/data/people.json'));assert.ok(args.findIndex(a=>a[0]==='commit')<args.findIndex(a=>a[0]==='push'));assert.ok(!args.flat().includes('--force'));
});
test('Publishing rejects unrelated changes, a wrong destination or a behind branch before pushing',async t=>{
 for(const options of [{other:true},{behind:1},{invalid:true},{failCheck:true}]){const f=publisherFixture(t,options);f.publisher.start();await f.publisher.task;assert.equal(f.publisher.job.status,'failed');assert.equal(f.calls.some(c=>c[0]==='git'&&c[1]==='push'),false);assert.equal(f.added,false);}
});
test('Publishing an already synchronized checkout does not create a commit or duplicate deployment',async t=>{
 const f=publisherFixture(t,{changed:false});f.publisher.start();await f.publisher.task;assert.equal(f.publisher.job.status,'unchanged');assert.equal(f.calls.some(c=>c[0]==='git'&&['commit','push'].includes(c[1])),false);
 const ahead=publisherFixture(t,{changed:false,ahead:1});ahead.publisher.start();await ahead.publisher.task;assert.equal(ahead.publisher.job.status,'success');assert.equal(ahead.calls.some(c=>c[0]==='git'&&c[1]==='push'),true);
});
