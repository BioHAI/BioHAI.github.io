const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'assets/data');
const checked='2026-11-26';
const profiles=[
 {name:'曾湘祥',slug:'zengxiangxiang',rank:'Distinguished Professor',rankZh:'二级教授 · 博士生导师',bio:'湖南大学二级教授、人工智能交叉研究院院长。聚焦 AI4Science、生物医药基础模型与计算智能，主持国家杰青、国家优青等项目，获吴文俊人工智能优秀青年奖、亚马逊机器学习研究奖。2020–2025 年连续入选科睿维安全球高被引科学家。',interests:['AI4Science','生物医药基础模型','计算智能'],recruitment:{year:'持续招收',types:['博士后','博士','硕士'],summary:'欢迎对世界模型、空间智能、多模态与生物医药交叉研究感兴趣的同学联系。',detail:'博士培养通常采用联合培养模式，在湖南大学与合作单位分别开展约两年研究。申请前请阅读一篇人工智能顶级会议或 Nature 子刊论文，并在邮件中说明兴趣、读研动机和未来目标。',quota:'主页未公布固定名额',email:'xzeng@foxmail.com'}},
 {name:'宋勃升',slug:'songbosheng',rank:'Professor',rankZh:'教授 · 博士生导师',bio:'教授、博士生导师，入选湖湘青年英才、湖南省优青。研究生物计算、生物信息学与药物发现，发表相关论文 100 余篇，其中第一或通讯作者 SCI 论文 60 余篇。主持国家级项目 3 项、省部级项目 4 项。',interests:['生物计算','生物信息学','药物发现'],recruitment:{year:'2027 招生',types:['博士','硕士','本科科研'],summary:'2027 年硕士、博士研究生尚有名额，研究方向为生物信息学、生物计算等。',detail:'常年欢迎优秀本科生入组参与科研，并争取国家自然科学基金青年学生项目支持。具体名额与培养安排请直接联系导师。',quota:'2027 年硕博名额开放',email:'boshengsong@hnu.edu.cn'}},
 {name:'刘元盛',slug:'liuyuansheng',rank:'Associate Professor',rankZh:'副教授 · 博士生导师',bio:'副教授、博士生导师，湖湘青年英才。2019 年获悉尼科技大学博士学位，研究人工智能与生物信息学。获湖南省自然科学奖一等奖（排名第二）、ACM SIGBIO 中国新星奖，在 Nature Machine Intelligence、Bioinformatics、EMNLP 等发表第一或通讯作者论文 40 余篇。',interests:['人工智能','生物信息学','序列建模'],recruitment:{year:'2027 博士招生',types:['博士','硕士'],summary:'每年招收硕士研究生 2 名；2027 年招收博士研究生 1 名。',detail:'研究方向为人工智能、生物信息学。申请与具体培养安排请邮件联系导师，主页同时提供近期代表论文供阅读。',quota:'硕士 2 名 / 年 · 2027 博士 1 名',email:'yuanshengliu@hnu.edu.cn'}},
 {name:'刘益萍',slug:'liuyiping',rank:'Professor',rankZh:'教授 · 博士生导师',bio:'教授、博士生导师，获国家高层次青年人才项目资助。研究计算智能、AI4Science、多目标智能优化与药物研发，主持国家级项目 4 项、省级项目 2 项。获 GECCO 最佳论文奖、中国自动化学会自然科学奖二等奖等，入选全球前 2% 顶尖科学家。',interests:['多目标智能优化','AI4Science','药物研发'],website:'https://yiping0liu.github.io/',alternateEmail:'yiping0liu@gmail.com',recruitment:{year:'长期招收',types:['博士后','博士','硕士','本科科研'],summary:'长期招收博士后、博士及硕士研究生，也欢迎优秀本科生加入。',detail:'面向希望在学术界或工业界长期发展的同学，鼓励具有国际影响力的研究；对高水平论文提供科研奖励和出国参会支持。',quota:'具体名额请联系导师',email:'ypliu@hnu.edu.cn'}}
];
const people=JSON.parse(fs.readFileSync(path.join(dir,'people.json'),'utf8'));
for(const profile of profiles){const person=people.find(p=>p.name===profile.name);Object.assign(person,{bio:profile.bio,rank:profile.rank,rankZh:profile.rankZh,interests:profile.interests,source:'https://csee.hnu.edu.cn/people/'+profile.slug,sourceChecked:checked,url:'https://csee.hnu.edu.cn/people/'+profile.slug});if(profile.website)person.website=profile.website;if(profile.alternateEmail)person.alternateEmail=profile.alternateEmail;}
fs.writeFileSync(path.join(dir,'people.json'),JSON.stringify(people,null,2)+'\n');
const project=(owner,title,program,period,code='')=>({owner,title,program,period,code,source:people.find(p=>p.name===owner).source});
const content={checked,professors:profiles.map(p=>({...p,url:'https://csee.hnu.edu.cn/people/'+p.slug,image:people.find(x=>x.name===p.name).thumbnail||people.find(x=>x.name===p.name).image})),directions:[
 {id:'01',title:'智能药物发现',en:'AI for drug discovery',description:'连接分子表征、生成模型与多目标优化，研究药物分子设计、药物组合和生物医药基础模型。',tags:['分子生成','药物相互作用','多目标优化'],query:'Drug discovery'},
 {id:'02',title:'生命信息与基础模型',en:'Learning the language of life',description:'面向基因组、蛋白质与生物序列，探索多模态学习与计算生物学，建立理解生命数据的新方法。',tags:['基因组建模','蛋白质设计','生物信息学'],query:'Genomics'},
 {id:'03',title:'计算智能与科学学习',en:'Intelligence for science',description:'融合计算智能、物理知识与生物计算，在科学数据中发现规律，发展可解释、可迁移的学习与优化方法。',tags:['科学机器学习','生物计算','智能优化'],query:'Scientific AI'}
],projects:[
 project('曾湘祥','生物信息学','国家杰出青年科学基金','2025–2029','62425204'),
 project('曾湘祥','基于超算和多组学数据的智能医药关键技术研究','国家联合基金重点项目','2023–2026','U22A2037'),
 project('曾湘祥','支持生物序列机','国家自然科学基金原创探索计划','2025–2026','62450002'),
 project('曾湘祥','基于宏基因组病毒大数据的菌株级微生物相互作用关系','国家自然科学基金重点项目','2025–2029','62432011'),
 project('曾湘祥','基于知识引导的反应预测与优化','科技创新 2030 重大项目课题','2024–2026','2023ZD0120902'),
 project('宋勃升','多通道膜系统及应用研究','国家自然科学基金面上项目','2023–2026','62272151'),
 project('宋勃升','动态结构膜系统及应用研究','国家自然科学基金面上项目','2020–2023','61972138'),
 project('宋勃升','湖南省青年科技人才（荷尖人才）项目','省级人才项目','2022–2025','2022RC1099'),
 project('宋勃升','生物计算模型理论及实现','湖南省优秀青年科学基金','2022–2024','2022JJ20016'),
 project('刘益萍','国家自然科学基金青年项目（B 类）','国家自然科学基金 · 原优秀青年科学基金','2026–2028'),
 project('刘益萍','多空间对齐的多目标智能药物分子设计方法与应用','国家自然科学基金面上项目','2025–2028'),
 project('刘益萍','合成与逆合成问题的人工智能求解：基于多目标优化的可解释合成路线设计和平台搭建','国家新一代人工智能重大专项子课题','2024–2026'),
 project('刘益萍','面向多模态多目标组合优化问题的进化算法与应用','国家自然科学基金青年项目','2022–2024'),
 project('刘益萍','多目标智能优化','湖南省自然科学基金优青项目','2024–2026'),
 project('刘益萍','学习引导的多模态多目标进化优化方法研究','湖南省自然科学基金青年项目','2021–2023')
],recognition:[
 {name:'曾湘祥',title:'全球高被引科学家',detail:'2020–2025 年连续入选科睿维安全球高被引科学家；获吴文俊人工智能优秀青年奖、亚马逊机器学习研究奖。',source:people[0].source},
 {name:'宋勃升',title:'生物计算与药物发现',detail:'入选湖湘青年英才、湖南省优青，主持多项国家级与省部级研究项目。',source:people[1].source},
 {name:'刘元盛',title:'湖南省自然科学奖一等奖',detail:'获湖南省自然科学奖一等奖（排名第二）与 ACM SIGBIO 中国新星奖，入选湖湘青年英才。',source:people[2].source},
 {name:'刘益萍',title:'计算智能与多目标优化',detail:'获国家高层次青年人才项目资助、GECCO 最佳论文奖等，入选全球前 2% 顶尖科学家。',source:people[3].source}
],application:[{step:'01',title:'找到感兴趣的方向',text:'阅读研究方向和代表论文，了解导师近期工作，选择与你的兴趣相符的研究问题。',link:'Research.html',label:'探索研究方向'}, {step:'02',title:'准备一封具体的来信',text:'建议附上个人简历，说明研究经历、申请类别与未来计划。申请曾湘祥导师前，请先阅读一篇 AI 顶会或 Nature 子刊论文，并说明兴趣所在。',link:'Publication.html',label:'浏览代表论文'}, {step:'03',title:'与导师沟通培养安排',text:'直接联系对应导师，讨论研究计划与培养机会。曾湘祥导师主页说明可能安排科研任务与面谈，以便相互了解。',link:'People.html',label:'认识导师团队'}],training:[{title:'联合培养',text:'曾湘祥导师的博士培养通常包含合作单位约两年、湖南大学约两年的研究安排，具体方案与导师沟通。'}, {title:'持续成长',text:'支持继续深造与产业发展。曾湘祥导师主页列有争取海外博士机会和国内科研、产业实践的培养安排。'}, {title:'学术交流',text:'曾湘祥、刘益萍导师主页均说明对高水平成果给予科研奖励，并支持国际学术交流。'}]};
fs.writeFileSync(path.join(dir,'lab-content.json'),JSON.stringify(content,null,2)+'\n');
console.log('Updated 4 official profiles, 15 funded projects, current recruitment and training information.');
