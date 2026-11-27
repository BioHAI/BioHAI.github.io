'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.site-dist');
require('./build-pages.cjs');
// Only public site assets enter the deployment artifact; repository/cache files stay local.
if(path.dirname(out)!==root||path.basename(out)!=='.site-dist')throw new Error('Invalid site output directory');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
const files=['index.html','People.html','Publication.html','Research.html','Openings.html','News.html','OtherStu.html','LICENSE.txt'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const directory of ['assets','images'])fs.cpSync(path.join(root,directory),path.join(out,directory),{recursive:true});
if(fs.existsSync(path.join(root,'CNAME')))fs.copyFileSync(path.join(root,'CNAME'),path.join(out,'CNAME'));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Packaged public site files in '+out);
