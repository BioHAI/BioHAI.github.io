const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),cache=path.resolve(root,'../.research-cache');
const downloads=[
 ['s2vm','https://proceedings.neurips.cc/paper_files/paper/2025/file/c0ebffad509ae02bd60340690b1fdd5d-Paper-Conference.pdf',path.join(cache,'s2vm.pdf')],
 ['laco','https://raw.githubusercontent.com/xiaomingaaa/LaCo/master/method_git.png',path.join(root,'images/research/laco.png')],
 ['kgexplainer','https://raw.githubusercontent.com/xiaomingaaa/KGExplainer/master/intro.jpg',path.join(root,'images/research/kgexplainer.jpg')],
 ['sslreview','https://link.springer.com/article/10.1007/s11432-024-4453-4',path.join(cache,'sslreview.html')]
];
Promise.all(downloads.map(([id,url,file])=>new Promise(resolve=>cp.execFile('curl.exe',['--proxy','http://127.0.0.1:7897','-L','--fail','--max-time','40','-sS',url,'-o',file],{windowsHide:true},e=>{console.log(id+': '+(e?'unavailable':'ok'));resolve([id,url,!e]);})))).then(results=>{
 const mf=path.join(root,'assets/data/figure-sources.json'),manifest=JSON.parse(fs.readFileSync(mf,'utf8'));
 for(const[id,url,ok]of results)if(ok&&['laco','kgexplainer'].includes(id))manifest[id]={image:'images/research/'+id+(id==='laco'?'.png':'.jpg'),imageSource:url,articleSource:'https://github.com/xiaomingaaa/'+(id==='laco'?'LaCo':'KGExplainer'),figure:'Method overview',retrieved:'2026-11-26'};
 fs.writeFileSync(mf,JSON.stringify(manifest,null,2)+'\n');
 const pdfFile=path.join(cache,'pdf-sources.json'),pdfs=JSON.parse(fs.readFileSync(pdfFile,'utf8'));pdfs.s2vm=downloads[0][1];fs.writeFileSync(pdfFile,JSON.stringify(pdfs,null,2));
});
