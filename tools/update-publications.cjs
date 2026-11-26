const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dataDir=path.join(root,'assets/data');
const source='https://csee.hnu.edu.cn/people/zengxiangxiang';
const rows=[
['bindingmodes',2026,'Unlocking diverse molecular binding modes using latent feature sampling','Nature Machine Intelligence','https://doi.org/10.21203/rs.3.rs-9511630/v1','Protein design'],
['dynamicdna',2026,'Explicit dynamic cross-strand interactions for DNA sequence language modelling','Nature Machine Intelligence','https://www.nature.com/articles/s42256-026-01249-1','Genomics'],
['safedrug',2026,'SafeDrug: A Benchmark Dataset for Safety-Critical Pharmacological Reasoning in LLMs','NeurIPS','https://loop113.github.io/safedrug-benchmark/','Scientific AI'],
['piedg',2026,'PI-EDG: Physics-Informed Full-Space Electron Density Generation from Molecular Geometry','NeurIPS','','Molecular learning'],
['bindmol',2026,'Binding Mode Matters: Hotspot-Aware Drug Discovery via Explorative Preferences','NeurIPS','https://arxiv.org/abs/2611.14956','Drug discovery'],
['opticaldna',2026,'Rethinking Genomic Modeling Through Optical Character Recognition','ICML','https://hongxinxiang.github.io/projects/OpticalDNA/','Genomics'],
['visioned',2026,'Physics-Informed Self-Supervised Learning on Efficient Electron-Density Images for Organic Material Property Prediction','ICML','','Molecular learning'],
['latentchem',2026,'LatentChem: From Textual CoT to Latent Thinking in Chemical Reasoning','ICML','https://arxiv.org/abs/2602.07075','Scientific AI'],
['agentfold',2026,'AgentFold: Closed-Loop Agentic Search for Protein Folding Model Design','EMNLP','https://arxiv.org/abs/2608.26747','Protein design'],
['captchamind',2026,'CaptchaMind: Training CAPTCHA Solvers via Reinforcement Learning with Explicit Reasoning Supervision','EMNLP','https://aclanthology.org/2026.emnlp-main.1140/','Scientific AI'],
['laco',2026,'Expanding Knowledge Boundaries via LLM-Grounded Alignment for Drug Combination Recommendation','KDD','https://dl.acm.org/doi/10.1145/3770855.3818967','Drug discovery'],
['surfdesign',2026,'SurfDesign: Effective Protein Design on Molecular Surfaces','KDD','https://arxiv.org/abs/2606.07567','Protein design'],
['caml',2026,'CAML: A Conflict-Aware Molecular Language Model Merging Framework for Multi-Constraint Molecular Generation','ACL','https://aclanthology.org/2026.acl-long.896/','Drug discovery'],
['m2po',2026,'M²PO: Multi-Perspective Multi-Pair Preference Optimization for Machine Translation','ACL','https://aclanthology.org/2026.acl-long.469/','Scientific AI'],
['steph',2026,'Sparse Task Vector Mixup with Hypernetworks for Efficient Knowledge Transfer in Whole-Slide Image Prognosis','CVPR','https://openaccess.thecvf.com/content/CVPR2026/html/Liu_Sparse_Task_Vector_Mixup_with_Hypernetworks_for_Efficient_Knowledge_Transfer_CVPR_2026_paper.html','Medical AI'],
['mamo',2026,'Expert-Inspired Multi-Agent Coordination for Multi-Objective Molecular Optimization','AAAI','https://ojs.aaai.org/index.php/AAAI/article/view/40757','Drug discovery'],
['trace',2026,'TRACE: Transformation-Aware Graph Refinement for Reaction Condition Prediction','AAAI','https://ojs.aaai.org/index.php/AAAI/article/view/36971','Molecular learning'],
['sketchmol',2025,'Image-based generation for molecule design with SketchMol','Nature Machine Intelligence','https://www.nature.com/articles/s42256-025-00982-3','Drug discovery'],
['rareddie',2025,'Predicting rare drug-drug interaction events with dual-granular structure-adaptive and pair variational representation','Nature Communications','https://www.nature.com/articles/s41467-025-59431-9','Drug discovery'],
['s2vm',2025,'Self-supervised Blending Structural Context of Visual Molecules for Robust Drug Interaction Prediction','NeurIPS','https://neurips.cc/virtual/2025/loc/san-diego/poster/119726','Drug discovery'],
['edbench',2025,'EDBench: Large-Scale Electron Density Data for Molecular Modeling','NeurIPS','https://proceedings.neurips.cc/paper_files/paper/2025/hash/d412ba5c76774f921762644e82515da3-Abstract-Datasets_and_Benchmarks_Track.html','Molecular learning'],
['ppi',2025,'Large Language and Protein Assistant for Protein-Protein Interactions Prediction','ACL','https://aclanthology.org/2025.acl-long.554/','Protein design'],
['surfflow',2025,'Surface-based Molecular Design with Multi-modal Flow Matching','KDD','https://arxiv.org/abs/2601.04506','Protein design'],
['apm',2025,'An All-Atom Generative Model for Designing Protein Complexes','ICML','https://proceedings.mlr.press/v267/chen25bz.html','Protein design'],
['peptidereview',2025,'Deep Generative Models for Therapeutic Peptide Discovery: A Comprehensive Review','ACM Computing Surveys','https://doi.org/10.1145/3714455','Drug discovery'],
['sslreview',2025,'Self-supervised learning in drug discovery','Science China Information Sciences','https://doi.org/10.1007/s11432-024-4453-4','Drug discovery'],
['edg',2025,'Electron Density-enhanced Molecular Geometry Learning','IJCAI','https://ijcai.org/proceedings/2025/872','Molecular learning'],
['chemdual',2025,'Enhancing Chemical Reaction and Retrosynthesis Prediction with Large Language Model and Dual-task Learning','IJCAI','https://www.ijcai.org/proceedings/2025/840','Molecular learning'],
['kgexplainer',2025,'Towards Synergistic Path-based Explanations for Knowledge Graph Completion: Exploration and Evaluation','ICLR','https://openreview.net/forum?id=WQvkqarwXi','Scientific AI'],
['s2dn',2025,'S2DN: Learning to Denoise Unconvincing Knowledge for Inductive Knowledge Graph Completion','AAAI','','Scientific AI'],
['pareto',2025,'Multi-Objective Molecular Design Through Learning Latent Pareto Set','AAAI','','Drug discovery']
];
const decode=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const faculty=fs.readFileSync(path.resolve(root,'../.research-cache/faculty.html'),'utf8');
const paragraphs=[...faculty.matchAll(/<p\b[^>]*>[\s\S]*?<\/p>/gi)].map(m=>decode(m[0]));
const figures=JSON.parse(fs.readFileSync(path.join(dataDir,'figure-sources.json'),'utf8'));
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
let archive=JSON.parse(fs.readFileSync(path.join(dataDir,'publications.json'),'utf8'));
// Idempotent merge; original records retain their images, PDFs and code links.
const records=rows.map(([id,year,title,venue,url,topic])=>{
 const old=archive.find(p=>norm(p.title)===norm(title)||id==='sketchmol'&&/SketchMol/.test(p.title)||id==='s2dn'&&/^S2DN/.test(p.title));
 const needle=norm(title).slice(0,65);
 const paragraph=paragraphs.find(p=>norm(p).includes(needle));
 let authors=paragraph?paragraph.slice(0,paragraph.toLowerCase().indexOf(title.slice(0,22).toLowerCase())).replace(/^\[\s*\d+\s*\]\s*/,'').replace(/[,，]\s*$/,'').replace(/\s+,/g,',').trim():'';
 if(!authors||authors.length>700) authors=old?.authors||'';
 return {...old,id,year,title,venue,url:url||old?.url||'',topic,authors:authors||old?.authors||'Xiangxiang Zeng et al.',image:figures[id]?.image||old?.image||'',imageSource:figures[id]?.imageSource||'',figure:figures[id]?.figure||'Research figure',source,sourceChecked:'2026-11-26',figureSource:figures[id]?.articleSource||old?.url||'',verification:url?'primary':'faculty',pdf:old?.pdf||'',code:old?.code||''};
});
archive=archive.filter(p=>!rows.some(r=>norm(p.title)===norm(r[2])||r[0]===p.id||r[0]==='sketchmol'&&/SketchMol/.test(p.title)||r[0]==='s2dn'&&/^S2DN/.test(p.title)));
const codeLinks={agentfold:'https://github.com/lmqfly/AgentFold',s2vm:'https://github.com/xiaomingaaa/S2VM',laco:'https://github.com/xiaomingaaa/LaCo',surfdesign:'https://github.com/smiles724/SurfDesign',chemdual:'https://github.com/JacklinGroup/ChemDual',edg:'https://github.com/HongxinXiang/EDG',kgexplainer:'https://github.com/xiaomingaaa/KGExplainer',captchamind:'https://github.com/AlibabaResearch/captcha-mind'};
const notes={bindingmodes:'期刊与年份依据教师主页；原文链接为作者公开预印本。',mamo:'教师主页写作 AAAI 2025；按 AAAI 官方论文集更正为 2026。',trace:'教师主页写作 AAAI 2025；按 AAAI 官方论文集更正为 2026。',kgexplainer:'采用 ICLR 正式版本标题；教师主页使用较早的 KGExplainer 预印本标题。',surfflow:'KDD 2025 会议年份据教师主页；图像来自作者 2026 年上传的预印本。'};
const authorsOverride={bindingmodes:'Houtim Lai, Peng Zhou, Huaxian Jia, Kun Xie, Geyan Ye, Wei Liu, Alexander Ng, Xiangxiang Zeng',agentfold:'Mingquan Liu, Jiangyu Chen, Hanqun Cao, Xujun Zhang, Pengsen Ma, Xiangru Tang, Shuting Jin, Zhuo Yang, Tianfan Fu, Fang Wu, Xiangxiang Zeng',mamo:'Daojian Zeng, Tianle Li, Jiahao Yang, Jiacai Yi, Xieping Gao, Lincheng Jiang, Tengfei Ma, Xiangxiang Zeng',safedrug:'Tengfei Ma, Yushan Yang, Yujie Chen, Jiahao Hou, Guanghui Ye, Xuanbai Ren, Yiping Liu, Bosheng Song, Xiangxiang Zeng',ppi:'Peng Zhou, Pengsen Ma, Jianmin Wang, Xibao Cai, Haitao Huang, Wei Liu, Longyue Wang, Lai Hou Tim, Xiangxiang Zeng',chemdual:'Xuan Lin, Qingrui Liu, Hongxin Xiang, Daojian Zeng, Xiangxiang Zeng',kgexplainer:'Tengfei Ma, Xiang Song, Wen Tao, Mufei Li, Jiani Zhang, Xiaoqin Pan, Yijun Wang, Bosheng Song, Xiangxiang Zeng'};
for(const p of records){p.code=codeLinks[p.id]||p.code;p.note=notes[p.id]||'';p.authors=authorsOverride[p.id]||p.authors;}
const all=[...records,...archive].sort((a,b)=>b.year-a.year);
for(const p of all){
 p.topic ||= /protein|peptide/i.test(p.title)?'Protein design':/single.cell|RNA/i.test(p.title)?'Medical AI':/drug|molecul/i.test(p.title)?'Drug discovery':'Scientific AI';
 p.family=/^Nature/.test(p.venue)?'Nature portfolio':/Cell/.test(p.venue)?'Cell portfolio':/NeurIPS|ICML|ICLR|AAAI|IJCAI|ACL|EMNLP|CVPR|KDD|Conference/.test(p.venue)?'Conferences':'Journals';
 if(p.image) p.image=decodeURIComponent(p.image);
}
fs.writeFileSync(path.join(dataDir,'publications.json'),JSON.stringify(all,null,2)+'\n');
console.log(JSON.stringify({total:all.length,recent:records.length,covers:all.filter(p=>p.image).length,years:[...new Set(all.map(p=>p.year))]}));
