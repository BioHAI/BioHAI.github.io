const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const crypto=require('node:crypto');
const versioned=file=>file+'?v='+crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex').slice(0,12);
const mapConfig=JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'assets/data/visitor-map.json'),'utf8'))).replace(/</g,String.fromCharCode(92)+'u003c');
const pages=[['index','home','AI4Health @ Hunan University','湖南大学 AI4Health 课题组：人工智能驱动的药物发现、生物医药基础模型与计算生物学研究。'],['People','people','People · AI4Health','认识 AI4Health 课题组的导师、访问教师、博士后与研究生。'],['Publication','publications','Publications · AI4Health','按年份、研究方向和关键词检索 AI4Health 的论文、原文与代码。'],['News','news','News · AI4Health','AI4Health 研究进展、学术交流与团队动态。'],['Research','research','Research · AI4Health','AI4Health 科研方向、项目与学术荣誉。'],['Openings','openings','Openings · AI4Health','欢迎加入 AI4Health，探索人工智能与生命科学。'],['OtherStu','alumni','Alumni · AI4Health','AI4Health 校友与毕业生去向。']];
for(const[file,page,title,description]of pages){fs.writeFileSync(path.join(root,file+'.html'),`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${description}">
  <meta name="theme-color" content="#174878">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <title>${title}</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" as="image" href="images/brand/ai4health-logo.png" fetchpriority="high">
  <link rel="preload" as="image" href="images/brand/world-land.svg">
  <script type="application/json" id="visitor-map-config">${mapConfig}</script>
${page==='home'?'  <link rel="preload" as="image" href="images/brand/slogan.png" fetchpriority="high">':''}
  <link rel="stylesheet" href="${versioned('assets/css/site.css')}">
  <link rel="stylesheet" href="${versioned('assets/css/blue-refresh.css')}">
  <link rel="stylesheet" href="${versioned('assets/css/visitor-map.css')}">
${page==='people'?'  <link rel="stylesheet" href="'+versioned('assets/css/people-directory.css')+'">':''}
  <script>try{document.documentElement.dataset.theme=localStorage.getItem('biohai-theme')||'light'}catch{}</script>
  <script defer src="${versioned('assets/js/vendor/vue.global.prod.js')}"></script>
  <script defer src="${versioned('assets/js/lab-pages.js')}"></script>
  <script defer src="${versioned('assets/js/visitor-map.js')}"></script>
  <script defer src="${versioned('assets/js/site.js')}"></script>
</head>
<body data-page="${page}">
  <div id="app"><main class="loading-shell"><p>AI4Health @ Hunan University</p><p>正在载入内容…</p></main></div>
  <noscript><main class="wrap content-section"><h1>${title}</h1><p>${description}</p><p>请启用 JavaScript 以使用论文筛选和成员目录。</p><a href="https://csee.hnu.edu.cn/people/zengxiangxiang">访问教师主页获取研究成果</a></main></noscript>
</body>
</html>
`);}
console.log('Generated '+pages.length+' static entry pages.');
