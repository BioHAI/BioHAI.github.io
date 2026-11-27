'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {ContentStore,UserError}=require('./store.cjs');const {Publisher}=require('./publish.cjs');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf','.pdf':'application/pdf'};
function createAdmin(options={}){
 const root=path.resolve(options.root||path.join(__dirname,'../..')),store=new ContentStore(root),publisher=options.publisher||new Publisher(root),token=crypto.randomBytes(32).toString('hex'),session=crypto.randomBytes(32).toString('hex');
 const appDirectory=path.join(__dirname,'ui');
 const server=http.createServer(async(req,res)=>{
  const port=server.address().port,cookieName='biohai_admin_'+port,hosts=['127.0.0.1:'+port,'localhost:'+port],host=req.headers.host;
  const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
  try{
   if(!hosts.includes(host))throw new UserError('只允许通过本机地址访问管理界面',403);
   const url=new URL(req.url,'http://'+host),route=url.pathname;
   if(req.method==='OPTIONS')throw new UserError('不允许跨站请求',403);
   if(route.startsWith('/api/')){
    const authenticated=(req.headers.cookie||'').split(';').some(v=>v.trim()===cookieName+'='+session);
    if(!authenticated)throw new UserError('请从本地管理首页重新打开页面',401);
    if(route.startsWith('/api/media/')&&req.method==='GET'){
     const match=route.match(/^\/api\/media\/([a-f0-9-]{36})\/thumbnail$/),draft=match&&store.uploads.get(match[1]);if(!draft)throw new UserError('预览图片已失效',404);return sendFile(path.join(draft.directory,'preview.'+(draft.previewExt||'webp')),res);
    }
    if(req.headers['x-admin-token']!==token)throw new UserError('请求校验失败，请刷新管理页面',403);
    if(!['GET','POST'].includes(req.method))throw new UserError('不支持的请求方法',405);
    if(req.method==='POST'){
     if(req.headers.origin!=='http://'+host)throw new UserError('不允许跨站修改内容',403);
     if(!(req.headers['content-type']||'').startsWith('application/json'))throw new UserError('仅接受 JSON 表单',415);
    }
    if(req.method==='GET'&&route==='/api/state')return json(200,{...store.view(),settings:publisher.settings(),git:await publisher.status(),job:publisher.job,testMode:!!options.testMode});
    if(req.method==='GET'&&route==='/api/publish')return json(200,{job:await publisher.refresh()});
    if(req.method==='POST'){
     if(publisher.busy)throw new UserError('发布正在进行，请等待完成后再修改内容',423);
     const body=await readJSON(req);
     if(route==='/api/save')return json(200,store.save(body.kind,body.key,body.record,body.revision));
     if(route==='/api/upload')return json(200,store.stageUpload(body.kind,body.original,body.thumbnail,body.width,body.height));
     if(route==='/api/settings')return json(200,publisher.saveSettings(body));
     if(route==='/api/publish'){if(options.testMode)throw new UserError('测试数据不会发布到 GitHub',403);if(body.revision!==store.read().revision)throw new UserError('数据已有更新，请刷新后再发布',409);return json(202,{job:publisher.start(body.message)});}
    }
    throw new UserError('接口不存在',404);
   }
   if(!['GET','HEAD'].includes(req.method))throw new UserError('不支持的请求方法',405);
   if(route==='/'){
    res.setHeader('Set-Cookie',cookieName+'='+session+'; HttpOnly; SameSite=Strict; Path=/');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'");
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(appDirectory,'index.html'),'utf8').replace('__ADMIN_TOKEN__',token));
   }
   if(/^\/admin\/(app\.js|image-compression\.js|style\.css)$/.test(route))return sendFile(path.join(appDirectory,path.basename(route)),res,req.method);
   if(route==='/vendor/vue.js')return sendFile(path.join(root,'assets/js/vendor/vue.global.prod.js'),res,req.method);
   if(route.startsWith('/preview/')){
    let relative;try{relative=decodeURIComponent(route.slice(9));}catch{throw new UserError('地址格式不正确');}
    if(!relative)relative='index.html';
    if(!/^(?:index|People|Publication|Research|Openings|News|OtherStu)\.html$/.test(relative)&&!relative.startsWith('assets/')&&!relative.startsWith('images/'))throw new UserError('页面不存在',404);
    if(relative.includes('\\')||relative.split('/').some(x=>x==='..'||x.startsWith('.')))throw new UserError('不允许访问该文件',403);
    const full=path.resolve(root,relative);if(!full.startsWith(root+path.sep))throw new UserError('不允许访问该文件',403);
    if(fs.existsSync(full)&&!fs.realpathSync(full).startsWith(fs.realpathSync(root)+path.sep))throw new UserError('不允许访问项目外的文件',403);
    return sendFile(full,res,req.method);
   }
   throw new UserError('页面不存在',404);
  }catch(error){if(!res.headersSent)json(error.status||500,{error:error instanceof UserError?error.message:'操作未完成：'+error.message});else res.end();}
 });
 server.requestTimeout=60000;server.headersTimeout=15000;
 return{server,store,publisher,listen:port=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server.address()));}),close:()=>new Promise(resolve=>{publisher.stop?.();server.close(resolve);server.closeIdleConnections?.();})};
}
function sendFile(file,res,method='GET'){if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new UserError('文件不存在',404);res.writeHead(200,{'Content-Type':MIME[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':fs.statSync(file).size});if(method==='HEAD')return res.end();const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);}
function readJSON(req){return new Promise((resolve,reject)=>{let size=0,parts=[];req.on('data',part=>{size+=part.length;if(size>30*1024*1024){parts=[];reject(new UserError('上传内容过大，单张原图最多 15 MB',413));}else parts.push(part);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(parts).toString()));}catch{reject(new UserError('表单内容不是有效 JSON'));}});req.on('error',reject);});}
if(require.main===module){const admin=createAdmin(),port=Number(process.env.ADMIN_PORT||8001);if(!Number.isInteger(port)||port<1||port>65535)throw Error('ADMIN_PORT must be between 1 and 65535');admin.listen(port).then(()=>{const url='http://127.0.0.1:'+port+'/';console.log('BioHAI 本地内容管理：'+url+'\n仅本机可访问。保存为本地修改，点击“一键发布”才会更新线上网站。\n按 Ctrl+C 关闭。');if(!process.argv.includes('--no-open')){const args=process.platform==='win32'?['cmd',['/c','start','',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];const child=cp.spawn(args[0],args[1],{detached:true,windowsHide:true,stdio:'ignore'});child.on('error',()=>{});child.unref();}}).catch(error=>{console.error(error.code==='EADDRINUSE'?'端口已占用，请打开现有管理界面：http://127.0.0.1:'+port+'/':error.message);process.exitCode=1;});}
module.exports={createAdmin,readJSON};
