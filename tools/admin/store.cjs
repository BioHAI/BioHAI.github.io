'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FILES={people:'assets/data/people.json',papers:'assets/data/publications.json',news:'assets/data/legacy-news.json',lab:'assets/data/lab-content.json',figures:'assets/data/figure-sources.json'};
class UserError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const required=(value,label)=>{if(!String(value||'').trim())throw new UserError('请填写'+label);return String(value).trim();};
function text(value,max=10000){if(value==null)return '';if(typeof value!=='string'||value.length>max)throw new UserError('文字内容过长或格式不正确');return value.trim();}
function link(value,label='链接'){value=text(value,3000);if(!value)return '';try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error();return u.href;}catch{throw new UserError(label+'请使用完整的 http / https 地址');}}
function email(value){value=text(value,250);if(value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new UserError('邮箱格式不正确');return value;}
function year(value,optional=false){if(optional&&(value===''||value==null))return '';const n=Number(value);if(!Number.isInteger(n)||n<1950||n>new Date().getFullYear()+1)throw new UserError('年份不在有效范围内');return String(n);}
const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const keyFor=(kind,item,extra='')=>item.id||kind+'-'+crypto.createHash('sha256').update(JSON.stringify([item.name,item.email,item.title,item.textdescription,item.image_file,extra])).digest('hex').slice(0,20);
const clone=value=>JSON.parse(JSON.stringify(value));
const day=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
class ContentStore{
 constructor(root){this.root=root;this.local=path.join(root,'.local-admin');this.uploads=new Map();}
 read(){const data={};let digest=crypto.createHash('sha256');for(const [key,file]of Object.entries(FILES)){const raw=fs.readFileSync(path.join(this.root,file),'utf8');data[key]=JSON.parse(raw);digest.update(key).update(raw);}return{data,revision:digest.digest('hex')};}
 view(){const {data,revision}=this.read();return{revision,members:data.people.map(p=>{const faculty=data.lab.professors.find(f=>f.name===p.name);return{...p,editorKey:keyFor('member',p),openingsEnabled:!!faculty,recruitment:clone(faculty?.recruitment||{year:'',types:[],summary:'',detail:'',quota:'',email:p.email||''})};}),papers:data.papers.map(p=>({...p,editorKey:p.id})),awards:Object.entries(data.news.rewardInformation).flatMap(([y,items])=>items.map((p,i)=>({...p,year:y,editorKey:keyFor('award',p,y+':'+i)}))).sort((a,b)=>Number(b.year)-Number(a.year))};}
 asset(value){value=text(value,1000);if(!value)return '';if(!value.startsWith('images/')||value.includes('\\')||value.includes('?')||value.includes('#'))throw new UserError('图片路径不正确，请上传图片');const full=path.resolve(this.root,value);if(!full.startsWith(path.resolve(this.root,'images')+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())throw new UserError('图片文件不存在，请重新上传');const real=fs.realpathSync(full);if(!real.startsWith(fs.realpathSync(path.join(this.root,'images'))+path.sep))throw new UserError('图片路径不能指向项目以外');return value;}
 stageUpload(kind,original,thumbnail,width,height){
  if(!['members','papers','awards'].includes(kind))throw new UserError('上传类别不正确');
  function decode(value,limit){if(typeof value!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(value)||value.length%4)throw new UserError('图片编码不正确');const b=Buffer.from(value,'base64');if(!b.length||b.length>limit)throw new UserError('图片文件过大');return b;}
  const raw=decode(original,15*1024*1024),small=decode(thumbnail,4*1024*1024);
  function format(b){if(b.length>24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'png';if(b.length>4&&b[0]===255&&b[1]===216&&b[2]===255)return'jpg';if(b.length>16&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return'webp';throw new UserError('仅支持 JPG、PNG 和 WebP 图片');}
  const ext=format(raw),previewExt=format(small);
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1200||height>1200)throw new UserError('预览图尺寸不正确');
  const id=crypto.randomUUID(),directory=path.join(this.local,'uploads',id);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'original.'+ext),raw);fs.writeFileSync(path.join(directory,'preview.'+previewExt),small);
  this.uploads.set(id,{id,kind,ext,previewExt,width,height,directory});return{image:'@upload:'+id,previewUrl:'/api/media/'+id+'/thumbnail',width,height};
 }
 resolveImage(record,kind){if(String(record.image||'').startsWith('@upload:')){const draft=this.uploads.get(record.image.slice(8));if(!draft||draft.kind!==kind)throw new UserError('上传已失效，请重新选择图片');return{image:'images/uploads/'+kind+'/'+draft.id+'.'+draft.ext,thumbnail:'images/uploads/'+kind+'/'+draft.id+'-preview.'+draft.previewExt,width:draft.width,height:draft.height,draft};}return{image:this.asset(record.image),thumbnail:record.image?this.asset(record.thumbnail||''):'',width:record.thumbnailWidth,height:record.thumbnailHeight};}
 save(kind,key,record,revision){
  if(!record||typeof record!=='object'||Array.isArray(record))throw new UserError('表单内容不正确');
  const current=this.read();if(revision!==current.revision)throw new UserError('数据已被其他窗口或程序更新，请刷新列表后再保存。当前表单仍保留。',409);
  const data=clone(current.data),changed=new Set(),media=this.resolveImage(record,kind);let savedKey,label;
  if(kind==='members'){
   const index=key?data.people.findIndex(p=>keyFor('member',p)===key):-1;if(key&&index<0)throw new UserError('成员记录已不存在',409);
   const old=index>=0?data.people[index]:{},p={...old,id:old.id||'member-'+crypto.randomUUID()};
   p.name=required(text(record.name,120),'姓名');p.role=record.role;if(!['faculty','visiting','postdoc','phd','master'].includes(p.role))throw new UserError('请选择成员类别');
   p.email=email(record.email);p.cohort=year(record.cohort,true);if(['phd','master'].includes(p.role)&&!p.cohort)throw new UserError('请填写学生入学年份');
   if(data.people.some((x,i)=>i!==index&&(x.name===p.name||(p.email&&x.email===p.email))))throw new UserError('姓名或邮箱已存在，请编辑已有成员');
   for(const f of ['bio','english','rank','rankZh'])p[f]=text(record[f]);
   for(const f of ['url','scholar','website'])p[f]=link(record[f]);
   p.alternateEmail=email(record.alternateEmail);p.interests=Array.isArray(record.interests)?record.interests.map(x=>text(x,100)).filter(Boolean).slice(0,12):[];
   p.image=media.image;if(media.thumbnail)p.thumbnail=media.thumbnail;else delete p.thumbnail;if(media.draft)delete p.photoSource;
   const oldFaculty=data.lab.professors.find(f=>f.name===old.name);
   if(oldFaculty&&!record.openingsEnabled&&data.lab.projects.some(x=>x.owner===old.name))throw new UserError('该导师有科研项目关联，请保留招生页展示；项目调整请先维护关联记录');
   if(oldFaculty&&p.role!=='faculty'&&data.lab.projects.some(x=>x.owner===old.name))throw new UserError('该导师有科研项目关联，暂不能更改成员类别');
   if(p.role==='faculty'){p.rank=required(p.rank,'英文职称');p.rankZh=required(p.rankZh,'中文职称');}
   if(index>=0)data.people[index]=p;else data.people.push(p);changed.add('people');
   if(oldFaculty||p.role==='faculty'&&record.openingsEnabled){
    if(p.role==='faculty'&&record.openingsEnabled){const r=record.recruitment||{};const f={...(oldFaculty||{}),name:p.name,slug:oldFaculty?.slug||p.id,rank:p.rank,rankZh:p.rankZh,bio:p.bio,interests:p.interests,url:p.url,image:p.image,alternateEmail:p.alternateEmail,recruitment:{year:text(r.year)||'招生咨询',types:Array.isArray(r.types)?r.types.filter(t=>['博士后','博士','硕士','本科科研'].includes(t)):[],summary:required(text(r.summary),'招生简介'),detail:text(r.detail),quota:text(r.quota)||'具体名额请邮件咨询',email:required(email(r.email||p.email),'招生邮箱')}};
     if(oldFaculty)data.lab.professors[data.lab.professors.indexOf(oldFaculty)]=f;else data.lab.professors.push(f);
    }else data.lab.professors=data.lab.professors.filter(f=>f.name!==old.name);
    changed.add('lab');
   }
   if(old.name&&old.name!==p.name){for(const project of data.lab.projects)if(project.owner===old.name){project.owner=p.name;changed.add('lab');}for(const item of data.lab.recognition||[])if(item.name===old.name){item.name=p.name;changed.add('lab');}}
   savedKey=p.id;label=p.name;
  }else if(kind==='papers'){
   const index=key?data.papers.findIndex(p=>p.id===key):-1;if(key&&index<0)throw new UserError('论文记录已不存在',409);
   const old=index>=0?data.papers[index]:{},p={...old,id:old.id||'paper-'+crypto.randomUUID()};
   p.title=required(text(record.title,1000),'论文标题');p.authors=required(text(record.authors,5000),'作者');p.venue=required(text(record.venue,300),'期刊 / 会议');p.year=Number(year(record.year));if(p.year<2000)throw new UserError('论文年份应为 2000 年及以后');
   if(data.papers.some((x,i)=>i!==index&&normalize(x.title)===normalize(p.title)))throw new UserError('这篇论文已存在，请编辑已有记录');
   let article=text(record.url);if(/^10\.\d{4,9}\//.test(article))article='https://doi.org/'+article;p.url=link(article,'论文链接');p.source=link(record.source||p.url,'来源网页');if(!p.source)throw new UserError('请提供论文链接或来源网页');if(p.year>=2025&&!p.source.startsWith('https://'))throw new UserError('近期论文的来源网页请使用 https 地址');
   for(const f of ['pdf','code','imageSource','figureSource'])p[f]=link(record[f]);
   for(const f of ['topic','family','figure','note'])p[f]=text(record[f]);p.topic=p.topic||'Scientific AI';if(!['Nature portfolio','Cell portfolio','Conferences','Journals'].includes(p.family))throw new UserError('请选择出版类型');
   p.image=media.image;if(media.thumbnail)p.thumbnail=media.thumbnail;else delete p.thumbnail;p.sourceChecked=day();
   if(!p.figure)p.figure='研究配图';if(!p.figureSource)p.figureSource=p.url||p.source;
   if(record.quality){const q=record.quality;const source=link(q.source,'指标来源');if(!source)throw new UserError('请填写指标来源网页');if(q.kind==='ccf'){if(!['A','B','C'].includes(q.grade))throw new UserError('CCF 等级不正确');p.quality={kind:'ccf',grade:q.grade,label:'CCF-'+q.grade,source,note:text(q.note)};}else if(q.kind==='if'){const value=Number(q.value);if(!Number.isFinite(value)||value<=0)throw new UserError('影响因子应为正数');const metricYear=Number(year(q.year));p.quality={kind:'if',value,year:metricYear,label:'IF '+value+' · '+metricYear,source,note:text(q.note)};}else throw new UserError('指标类型不正确');}else delete p.quality;
   if(index>=0)data.papers[index]=p;else data.papers.unshift(p);changed.add('papers');
   if(p.image)data.figures[p.id]={...(data.figures[p.id]||{}),image:p.image,imageSource:p.imageSource,articleSource:p.figureSource,figure:p.figure,retrieved:day()};else delete data.figures[p.id];changed.add('figures');savedKey=p.id;label=p.title;
  }else if(kind==='awards'){
   let old,oldYear,oldIndex;for(const [y,items]of Object.entries(data.news.rewardInformation))for(let i=0;i<items.length;i++)if(keyFor('award',items[i],y+':'+i)===key){old=items[i];oldYear=y;oldIndex=i;}
   if(key&&!old)throw new UserError('荣誉记录已不存在',409);const y=year(record.year),p={...(old||{}),id:old?.id||'award-'+crypto.randomUUID(),textdescription:required(text(record.textdescription,1000),'荣誉标题')};
   if(!media.image||!media.thumbnail||!Number(media.width)||!Number(media.height))throw new UserError('请上传荣誉图片，自动生成卡片预览');
   p.image_file=media.image;p.thumbnail=media.thumbnail;p.thumbnailWidth=Number(media.width);p.thumbnailHeight=Number(media.height);
   if(old&&oldYear===y)data.news.rewardInformation[y][oldIndex]=p;
   else{if(old){data.news.rewardInformation[oldYear].splice(oldIndex,1);if(!data.news.rewardInformation[oldYear].length)delete data.news.rewardInformation[oldYear];}(data.news.rewardInformation[y]||=[]).push(p);}changed.add('news');savedKey=p.id;label=p.textdescription;
  }else throw new UserError('内容类别不正确');
  this.persist(data,current.data,[...changed],{kind,label},media);return{...this.view(),savedKey};
 }
 persist(data,old,keys,description,media){
  const backup=path.join(this.local,'backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8));fs.mkdirSync(backup,{recursive:true});
  for(const key of keys)fs.writeFileSync(path.join(backup,key+'.json'),JSON.stringify(old[key],null,2)+'\n');fs.writeFileSync(path.join(backup,'record.json'),JSON.stringify({...description,savedAt:new Date().toISOString(),files:keys.map(k=>FILES[k])},null,2));
  const written=[],created=[];try{
   if(media.draft){for(const [from,to]of [['original.'+media.draft.ext,media.image],['preview.'+media.draft.previewExt,media.thumbnail]]){const destination=path.join(this.root,to);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(media.draft.directory,from),destination,fs.constants.COPYFILE_EXCL);created.push(destination);}}
   for(const key of keys){const destination=path.join(this.root,FILES[key]),temporary=destination+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temporary,JSON.stringify(data[key],null,2)+'\n');try{fs.renameSync(temporary,destination);}finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}written.push(key);}
  }catch(error){for(const key of written)fs.writeFileSync(path.join(this.root,FILES[key]),JSON.stringify(old[key],null,2)+'\n');for(const file of created)fs.unlinkSync(file);throw error;}
 }
}
module.exports={ContentStore,UserError,FILES,normalize,link};
