'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {UserError,FILES}=require('./store.cjs');
const REPOSITORY='BioHAI/BioHAI.github.io';
const managed=file=>Object.values(FILES).includes(file)||/^(index|People|Publication|Research|Openings|News|OtherStu)\.html$/.test(file)||/^images\/uploads\/(members|papers|awards)\/[a-z0-9-]+(?:-preview)?\.(jpg|png|webp)$/.test(file);
const redact=text=>String(text).replace(/(Bearer\s+|Authorization:\s*[^\s]*\s+)[^\s]+/gi,'$1[hidden]').slice(-6000);
function run(program,args,options={}){return new Promise((resolve,reject)=>{const child=cp.spawn(program,args,{cwd:options.cwd,env:options.env||process.env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});let out='',err='';child.stdout.on('data',b=>{out=(out+b).slice(-1024*1024);});child.stderr.on('data',b=>{err=(err+b).slice(-1024*1024);});const timer=setTimeout(()=>{child.kill();reject(new Error('操作超时，请检查网络和 Git 登录状态'));},options.timeout||60000);child.on('error',error=>{clearTimeout(timer);reject(new Error(error.code==='ENOENT'?'未找到 '+program+'，请先安装并加入 PATH':error.message));});child.on('close',code=>{clearTimeout(timer);if((options.codes||[0]).includes(code))resolve({out,err,code});else reject(new Error(redact(err||out)||program+' 执行失败'));});});}
function proxyValue(value){value=String(value||'').trim();if(!value)return '';try{const u=new URL(value);if(!['http:','https:','socks5:','socks5h:'].includes(u.protocol)||u.username||u.password)throw Error();return u.href.replace(/\/$/,'');}catch{throw new UserError('代理地址请填写 http://127.0.0.1:端口 等地址，不能包含账号或密码');}}
class Publisher{
 constructor(root,options={}){this.root=root;this.local=path.join(root,'.local-admin');this.execute=options.run||run;this.pollMs=options.pollMs??15000;this.deadlineMs=options.deadlineMs??600000;this.stopped=false;this.job=null;try{this.job=JSON.parse(fs.readFileSync(path.join(this.local,'publish.json'),'utf8'));if(this.job.status==='running'){this.job.status='submitted';this.job.message='上次任务已中断，请查看 GitHub Actions 确认发布结果';}}catch{}}
 get busy(){return this.job?.status==='running';}
 settings(){try{return JSON.parse(fs.readFileSync(path.join(this.local,'settings.json'),'utf8'));}catch{return{proxy:''};}}
 saveSettings(value){const proxy=proxyValue(value.proxy);fs.mkdirSync(this.local,{recursive:true});fs.writeFileSync(path.join(this.local,'settings.json'),JSON.stringify({proxy},null,2));return{proxy};}
 git(args,options={}){const proxy=this.settings().proxy;const env={...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'};for(const name of Object.keys(env))if(/^GIT_(TRACE|CURL_VERBOSE)/.test(name))delete env[name];return this.execute('git',[...(proxy?['-c','http.proxy='+proxy]:[]),...args],{cwd:this.root,env,...options});}
 async changes(){const [modified,untracked]=await Promise.all([this.git(['diff','HEAD','--name-only','-z']),this.git(['ls-files','--others','--exclude-standard','-z'])]);return[...new Set((modified.out+untracked.out).split('\0').filter(Boolean))].map(file=>({path:file,managed:managed(file)}));}
 async status(){try{const [branch,remote,changes]=await Promise.all([this.git(['branch','--show-current']),this.git(['remote','get-url','origin']),this.changes()]);let destination=remote.out.trim();try{const u=new URL(destination);if(u.username||u.password)destination='[包含凭据的远程地址，请使用 Git 凭据管理器]';}catch{}return{branch:branch.out.trim(),remote:destination,changes,available:true};}catch(error){return{available:false,error:redact(error.message),changes:[]};}}
 update(message,extra={}){Object.assign(this.job,extra,{message,updatedAt:new Date().toISOString()});this.job.log.push({time:this.job.updatedAt,message});fs.mkdirSync(this.local,{recursive:true});fs.writeFileSync(path.join(this.local,'publish.json'),JSON.stringify(this.job,null,2));}
 start(message){if(this.busy)throw new UserError('发布正在进行，请等待当前任务完成',409);this.stopped=false;this.job={id:Date.now().toString(36),status:'running',startedAt:new Date().toISOString(),message:'正在准备发布',log:[]};this.update('正在检查待发布内容');this.task=this.perform(String(message||'Update website content through local manager').replace(/[\r\n]/g,' ').slice(0,160)).catch(error=>{this.update(redact(error.message),{status:'failed'});});return this.job;}
 async perform(message){
  const state=await this.status();if(!state.available)throw new UserError('无法使用 Git：'+state.error);
  if(state.branch!=='main')throw new UserError('一键发布只支持 main 分支，请先切回 main');
  if(!['https://github.com/'+REPOSITORY+'.git','https://github.com/'+REPOSITORY,'git@github.com:'+REPOSITORY+'.git'].includes(state.remote))throw new UserError('远程仓库与本站不符，已停止发布');
  const other=state.changes.filter(f=>!f.managed);if(other.length)throw new UserError('项目中有内容管理之外的改动，请先处理后再发布：'+other.map(f=>f.path).slice(0,6).join('、'));
  this.update('正在同步远端状态');await this.git(['fetch','origin','main'],{timeout:90000});
  const counts=(await this.git(['rev-list','--left-right','--count','HEAD...origin/main'])).out.trim().split(/\s+/).map(Number);if(counts[1]>0)throw new UserError('GitHub 上有更新，本地尚未同步。请先同步仓库，再点击发布；本地内容已保留。');
  this.update('正在生成页面');await this.execute(process.execPath,['tools/build-pages.cjs'],{cwd:this.root});
  this.update('正在校验资料、图片和页面');await this.execute(process.execPath,['tools/check-site.cjs'],{cwd:this.root});
  const changes=await this.changes();if(changes.some(f=>!f.managed))throw new UserError('检查期间发现其他文件改动，已停止发布');
  if(changes.length){this.update('正在保存版本');await this.git(['add','--',...changes.map(f=>f.path)]);await this.git(['commit','-m',message]);}
  const head=(await this.git(['rev-parse','HEAD'])).out.trim();if(!/^[a-f0-9]{40,64}$/.test(head))throw new Error('无法读取版本号');
  if(!changes.length&&counts[0]===0){this.update('本地内容已与线上版本同步，没有需要发布的更改',{status:'unchanged',commit:head});return;}
  this.update('正在推送到 GitHub',{commit:head});await this.git(['push','origin','main'],{timeout:120000});
  this.update('已推送，正在等待 GitHub Pages 部署',{runUrl:'https://github.com/'+REPOSITORY+'/actions',pushed:true});
  const deadline=Date.now()+this.deadlineMs;while(!this.stopped&&Date.now()<deadline){if(await this.checkDeployment())return;await new Promise(resolve=>{this.wake=resolve;this.timer=setTimeout(resolve,this.pollMs);});}
  this.update('内容已推送，部署仍在进行，可打开 GitHub Actions 查看结果',{status:'submitted'});
 }
 async checkDeployment(){
  try{const proxy=this.settings().proxy;const args=['--fail','--silent','--show-error','--max-time','20',...(proxy?['--proxy',proxy]:[]),'-H','Accept: application/vnd.github+json','-H','User-Agent: BioHAI-Local-Manager','https://api.github.com/repos/'+REPOSITORY+'/actions/runs?head_sha='+this.job.commit+'&event=push&per_page=5'];const result=await this.execute('curl',args,{cwd:this.root,timeout:25000});const runs=JSON.parse(result.out).workflow_runs||[],workflow=runs.find(r=>r.head_sha===this.job.commit&&r.path==='.github/workflows/update-research.yml');if(!workflow)return false;
   this.job.runUrl=workflow.html_url;if(workflow.status!=='completed'){this.update('GitHub 正在构建并部署网站');return false;}
   if(workflow.conclusion==='success')this.update('发布成功，网站已更新',{status:'success',siteUrl:'https://biohai.github.io/'});else this.update('GitHub 部署未成功，请打开发布任务查看详情；本地内容已保留',{status:'failed'});return true;
  }catch(error){this.job.statusWarning='暂时无法查询部署状态：'+redact(error.message);return false;}
 }
 async refresh(){if(this.job?.status==='submitted'&&this.job.commit)await this.checkDeployment();return this.job;}
 stop(){this.stopped=true;clearTimeout(this.timer);this.wake?.();}
}
module.exports={Publisher,run,managed,proxyValue};
