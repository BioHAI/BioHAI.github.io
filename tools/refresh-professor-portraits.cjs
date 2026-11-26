const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets/data'),cache=path.resolve(root,'../.research-cache');
const names={'曾湘祥':'zengxiangxiang','宋勃升':'songbosheng','刘元盛':'liuyuansheng','刘益萍':'liuyiping'};
const people=JSON.parse(fs.readFileSync(path.join(dir,'people.json'),'utf8'));
Promise.all(people.filter(p=>names[p.name]).map(async p=>{const slug=names[p.name],html=fs.readFileSync(path.join(cache,'update-'+slug+'.html'),'utf8'),tag=html.match(/<img\b[^>]*alt="无照片"[^>]*>/)?.[0];if(!tag)return;
 const match=tag.match(/src=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/);if(!match)return;
 const url=new URL(match[1]||match[2]||match[3],p.url);url.search='';const dest='images/teacher/'+slug+'-official.jpg';
 await new Promise(resolve=>cp.execFile('curl.exe',['--proxy','http://127.0.0.1:7897','-L','--fail','--max-time','35','-sS',url.href,'-o',path.join(root,dest)],{windowsHide:true},e=>{if(!e){p.image=dest;p.photoSource=url.href;}console.log(p.name+': '+(e?'kept original portrait':'official portrait updated'));resolve();}));
})).then(()=>fs.writeFileSync(path.join(dir,'people.json'),JSON.stringify(people,null,2)+'\n'));
