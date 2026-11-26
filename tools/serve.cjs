const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const port=Number(process.env.PORT||8000);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer between 1 and 65535.');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
 let file;
 try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);return res.end('Bad request');}
 const relative=path.relative(root,file);
 if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(x=>x.startsWith('.'))){res.writeHead(403);return res.end('Forbidden');}
 fs.stat(file,(err,stat)=>{
  if(err){res.writeHead(404);return res.end('Not found');}
  if(stat.isDirectory())file=path.join(file,'index.html');
  fs.stat(file,(err,stat)=>{
   if(err||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
   res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Length':stat.size});
   if(req.method==='HEAD')return res.end();
   const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
 });
});
server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${port} is already in use. Open http://127.0.0.1:${port}/ or choose another PORT.`:err.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`BioHAI is running at http://127.0.0.1:${port}/\nPress Ctrl+C to stop.`));
