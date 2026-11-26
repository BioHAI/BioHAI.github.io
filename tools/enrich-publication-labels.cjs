const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets/data');
const metrics={checked:'2026-11-26',journals:[
 {name:'Nature Machine Intelligence',value:29.8,year:2025,source:'https://www.nature.com/natmachintell/journal-impact'},
 {name:'Nature Communications',value:18.1,year:2025,source:'https://www.nature.com/ncomms/journal-impact'},
 {name:'Nature Protocols',value:18.4,year:2025,source:'https://www.nature.com/nprot/journal-impact'}
],ccf:{source:'https://www.ccf.org.cn/Academic_Evaluation/AI/',a:['AAAI','NeurIPS','ICML','IJCAI','CVPR','ACL'],b:['EMNLP'],kddSource:'https://www.ccf.org.cn/Academic_Evaluation/DM_CS/'} };
const papers=JSON.parse(fs.readFileSync(path.join(dir,'publications.json'),'utf8'));
for(const p of papers){
 const j=metrics.journals.find(j=>p.venue.startsWith(j.name));
 if(j)p.quality={label:`IF ${j.value} · ${j.year}`,kind:'if',value:j.value,year:j.year,source:j.source,note:`出版社公布的 ${j.year} 年 Journal Impact Factor，非论文发表当年的指标。`};
 else if(/\bKDD\b/.test(p.venue))p.quality={label:'CCF-A',kind:'ccf',grade:'A',source:metrics.ccf.kddSource,note:'CCF 推荐国际学术会议目录 · 数据挖掘与内容检索'};
 else {let grade='';if(metrics.ccf.a.some(v=>new RegExp('\\b'+v+'\\b').test(p.venue))||/International Conference on Machine Learning|AAAI Conference|International Joint Conference/.test(p.venue))grade='A';if(metrics.ccf.b.some(v=>new RegExp('\\b'+v+'\\b').test(p.venue)))grade='B';if(/IEEE Transactions on Neural Networks and Learning Systems/i.test(p.venue))grade='B';if(grade)p.quality={label:'CCF-'+grade,kind:'ccf',grade,source:metrics.ccf.source,note:'依据 CCF 人工智能类推荐目录核对；未在目录中定位的会议不添加分类。'};}
}
fs.writeFileSync(path.join(dir,'venue-metrics.json'),JSON.stringify(metrics,null,2)+'\n');
fs.writeFileSync(path.join(dir,'publications.json'),JSON.stringify(papers,null,2)+'\n');
console.log('Added verified quality labels to '+papers.filter(p=>p.quality).length+' publications.');
