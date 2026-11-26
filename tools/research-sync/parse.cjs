'use strict';
const crypto = require('node:crypto');
const entities = {nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',sup2:'²'};
function decode(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole,key) => {
    if (key[0] !== '#') return entities[key.toLowerCase()] ?? whole;
    const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2),16) : Number(key.slice(1));
    return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  });
}
function plain(value) {
  return decode(value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,''))
    .replace(/\s+/g,' ').trim();
}
function normalize(value) {
  return value.normalize('NFKD').toLowerCase().replace(/modelling/g,'modeling').replace(/[^a-z0-9]/g,'');
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),decode(m[2] ?? m[3])]));
}
function httpsURL(value, base) {
  try {const u=new URL(value,base);return u.protocol==='https:' && !u.username && !u.password ? u.href : '';}catch{return '';}
}
const venueNames = [
  'Nature Machine Intelligence','Nature Computational Science','Nature Communications','Nature Protocols',
  'Cell Reports Medicine','Cell Reports Methods','ACM Computing Surveys','Science China Information Sciences',
  'Science China Information Science','IEEE Transactions on Neural Networks and Learning Systems',
  'IEEE Transactions on Parallel and Distributed Systems','IEEE Transactions on Computers',
  'Information and Computation','WIREs Comput Mol Sci','Advanced Science','Bioinformatics',
  'NeurIPS','ICML','ICLR','EMNLP','IJCAI','AAAI','CVPR','ACL','KDD'
];
const escapeRE=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function splitAuthors(prefix,knownTitles=[]) {
  const ends=/[\s,，;；.。]+$/;
  const boundaries=[...prefix.matchAll(/[,，;；]\s*|\.\s+/g)].map(m=>m.index+m[0].length);
  const candidates=boundaries.map(at=>({authors:prefix.slice(0,at).replace(ends,''),title:prefix.slice(at).replace(ends,'')})).filter(p=>normalize(p.authors).includes('xiangxiangzeng')&&!normalize(p.title).includes('xiangxiangzeng')&&!/^et al\b/i.test(p.title)&&p.title.length>=12);
  const known=new Set(knownTitles.map(normalize));
  const exact=candidates.find(c=>known.has(normalize(c.title)));
  if(exact)return exact;
  const isName=t=>/^(?:[A-ZÀ-Þ][\p{L}'’.-]*\s*){1,5}\*?$/u.test(t.trim());
  const firstTitle=candidates.find(c=>!isName(c.title.split(/[,，;；]/)[0]));
  if(firstTitle)return firstTitle;
  const last=candidates.at(-1);
  if(last&&last.title.split(/\s+/).length>=4&&!/[,，;；]/.test(last.title))return last;
  throw Error('Cannot distinguish the title from its author list');
}
function parseSource(html, config, knownVenues=[], knownTitles=[]) {
  const section=html.split(/学术著作/)[1]?.split(/科研项目/)[0];
  if(!section)throw Error('Publication section markers are missing; source layout may have changed.');
  const paragraphs=[...section.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)];
  const venues=[...new Set([...venueNames,...knownVenues])].sort((a,b)=>b.length-a.length);
  const venueRE=new RegExp('(?:^|[,.，。]\\s*)('+venues.map(escapeRE).join('|')+')(?![a-z])','i');
  const entries=[],errors=[];let candidates=0;
  for(const [raw]of paragraphs) {
    const text=plain(raw);const index=text.match(/^\[\s*(\d+)\s*\]\s*/);if(!index)continue;candidates++;
    try{
      const citation=text.slice(index[0].length);
      const match=venueRE.exec(citation);
      if(!match)throw Error('Unrecognized venue');
      const venueStart=match.index+match[0].indexOf(match[1]);
      const suffix=citation.slice(venueStart+match[1].length);
      const yearMatch=suffix.match(/\b(20\d{2})\b/);
      if(!yearMatch)throw Error('No publication year');
      const year=Number(yearMatch[1]);
      if(year<2000||year>new Date().getFullYear()+1)throw Error('Invalid publication year');
      const {authors,title}=splitAuthors(citation.slice(0,venueStart).replace(/[\s,，;；.。]+$/,''),knownTitles);
      if(title.length<12||!authors||!normalize(authors).includes('xiangxiangzeng'))throw Error('Incomplete author/title boundary');
      const links=[...raw.matchAll(/<a\b([^>]*)>/gi)].map(m=>httpsURL(attributes(m[1]).href,config.source)).filter(Boolean);
      const doi=citation.match(/(?:doi(?:\.org\/|:\s*))(10\.\d{4,9}\/[a-z0-9._;()/:\-]+)/i)?.[1]?.replace(/[.,;]+$/,'');
      entries.push({ordinal:Number(index[1]),title,authors,year,venue:match[1],links,doi:doi||''});
    }catch(error){errors.push({ordinal:Number(index[1]),citation:text,error:error.message});}
  }
  if(candidates<config.minimumSourceRecords)throw Error(`Only ${candidates} numbered records found; refusing an incomplete source.`);
  return {entries,errors,candidates};
}
function matchExisting(entry, papers, aliases={}) {
  const key=normalize(entry.title);
  return papers.find(p=>[p.title,p.sourceRecord?.title,...(aliases[p.id]||[])].filter(Boolean).some(t=>normalize(t)===key));
}
function topicFor(title) {
  if(/protein|peptide|binding mode/i.test(title))return 'Protein design';
  if(/genom|DNA|transcriptom|RNA|single.cell/i.test(title))return 'Genomics';
  if(/whole.slide|medical|clinical|prognos/i.test(title))return 'Medical AI';
  if(/drug|therapeutic/i.test(title))return 'Drug discovery';
  if(/molecul|electron.density|reaction|chemical/i.test(title))return 'Molecular learning';
  return 'Scientific AI';
}
function familyFor(venue) {
  if(/^Nature/i.test(venue))return 'Nature portfolio';
  if(/^Cell /i.test(venue))return 'Cell portfolio';
  return /^(NeurIPS|ICML|ICLR|EMNLP|IJCAI|AAAI|CVPR|ACL|KDD)$/i.test(venue)?'Conferences':'Journals';
}
function qualityFor(venue,metrics) {
  const journal=metrics.journals.find(j=>normalize(j.name)===normalize(venue));
  if(journal)return {label:`IF ${journal.value} · ${journal.year}`,kind:'if',value:journal.value,year:journal.year,source:journal.source,note:`出版社公布的 ${journal.year} 年 Journal Impact Factor，非论文发表当年的指标。`};
  const grade=metrics.ccf.a.includes(venue)||venue==='KDD'?'A':metrics.ccf.b.includes(venue)?'B':'';
  if(grade)return {label:`CCF-${grade}`,kind:'ccf',grade,source:venue==='KDD'?metrics.ccf.kddSource:metrics.ccf.source,note:'依据已核实的 CCF 推荐目录；分类列表由维护者更新。'};
}
function newPaper(entry,config,metrics) {
  const quality=qualityFor(entry.venue,metrics);
  return {id:'auto-'+crypto.createHash('sha256').update(normalize(entry.title)).digest('hex').slice(0,16),year:entry.year,title:entry.title,authors:entry.authors,venue:entry.venue,family:familyFor(entry.venue),topic:topicFor(entry.title),url:'',pdf:'',code:'',image:'',source:config.source,verification:'faculty',autoSync:true,...(quality?{quality}:{})};
}
module.exports={decode,plain,normalize,attributes,httpsURL,parseSource,matchExisting,topicFor,familyFor,qualityFor,newPaper};
