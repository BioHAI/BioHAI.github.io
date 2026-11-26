// One-time migration of the original site's Vue data; no network or DOM execution.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'assets/data');
fs.mkdirSync(dest, {recursive:true});
function capture(file, extra = '') {
  const html = fs.readFileSync(path.join(root,file), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.includes('new Vue'));
  const context = {console:{log(){}}, Vue:function(options){this.$el=null;context.captured=options.data;}};
  vm.createContext(context);
  vm.runInContext(scripts.join('\n')+extra,context,{timeout:2000});
  return context;
}
const people=capture('People.html','\nthis.faculty=teacher_template.data().teacher_information; this.visitors=visit_teacher_template.data().visit_information;');
const members=[];
for(const t of people.faculty) members.push({name:t.teacher_name,email:t.teacher_email.replace('[at]','@'),bio:t.teacher_description,image:t.teacher_image,url:t.teacher_index,scholar:t.teacher_google,role:'faculty',cohort:''});
for(const t of people.visitors) members.push({name:t.visit_name,email:t.visit_email,bio:[t.visit_organization,t.visit_description].filter(Boolean).join(' · '),image:t.visit_image,url:t.visit_page,scholar:t.visit_google,role:'visiting',cohort:''});
for(const [key,role] of [['post_student_information','postdoc'],['bs_student_information','phd'],['ss_student_information','master']])
  for(const [cohort,students] of Object.entries(people.captured[key])) for(const s of students) members.push({name:s.student_name,email:s.student_email,bio:s.student_description,image:s.student_image,url:s.student_page,scholar:s.student_google,role,cohort});
fs.writeFileSync(path.join(dest,'people.json'),JSON.stringify(members,null,2)+'\n');
const papers=capture('Publication.html').captured.paperInformation;
const publications=[];
for(const [year,items] of Object.entries(papers)) for(const [i,p] of items.entries()) publications.push({id:`legacy-${year}-${i}`,year:Number(year),title:p.paper_title.trim().replace(/\.$/,''),authors:p.paper_authors.replace(/\s+/g,' ').trim(),venue:p.paper_publiation.trim(),image:p.image_src,url:p.image_target,pdf:p.pdf_download,code:p.code_download,source:'Original BioHAI publication archive'});
fs.writeFileSync(path.join(dest,'publications.json'),JSON.stringify(publications,null,2)+'\n');
const news=capture('News.html').captured;
fs.writeFileSync(path.join(dest,'legacy-news.json'),JSON.stringify(news,null,2)+'\n');
// Keep original secondary-page content for the shared redesigned layout.
for(const name of ['Research','Openings','OtherStu']) {
 const raw=fs.readFileSync(path.join(root,name+'.html'),'utf8').replace(/<!--[\s\S]*?-->/g,'');
 let content;
 if(name==='OtherStu') content=[...raw.matchAll(/<table\b[\s\S]*?<\/table>/gi)].map(m=>m[0]).join('\n');
 else content=raw.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||'';
 content=content.replace(/\s(?:style|width|height|align)\s*=\s*(?:"[^"]*"|'[^']*')/gi,'').replace(/<\/?(?:u1|span)\b[^>]*>/gi,'').replace(/<div class\s*=\s*['"]line['"]>[\s\S]*?<\/div>/i,'');
 fs.writeFileSync(path.join(dest,name.toLowerCase()+'.html'),content);
}
console.log(JSON.stringify({members:members.length,publications:publications.length,years:Object.keys(papers),news:Object.keys(news)}));
