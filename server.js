import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { serveApp } from './server/http.mjs';
const server=createServer((req,res)=>{void serveApp(req,res,{clientCount:clients.size});});
const wss=new WebSocketServer({server,path:'/realtime',maxPayload:1024}), clients=new Map();
const demos=new Set([1,4,7,10,13,16,19,20,22,3]),actions=new Set(['idle','tea','read','stretch']);
let serial=0;
function send(ws,value){if(ws.readyState===1)ws.send(JSON.stringify(value));}
function broadcast(){const users=[...clients.values()].map(({last,greetAt,...user})=>user);for(const ws of clients.keys())send(ws,{type:'state',users});}
wss.on('connection',ws=>{
 const num=++serial;const user={id:randomUUID(),name:['잔잔한 바람','느긋한 파도','다정한 구름','고요한 노을'][(num-1)%4]+' '+num,seat:null,x:0,z:4.8,yaw:Math.PI,mode:'standing',action:'idle',last:0,greetAt:0};
 clients.set(ws,user);send(ws,{type:'welcome',id:user.id});broadcast();
 ws.on('message',data=>{try{const m=JSON.parse(data);
  if(m.type==='greet'&&Date.now()-user.greetAt>1500){user.greetAt=Date.now();for(const other of clients.keys())send(other,{type:'greet',id:user.id,name:user.name});}
  else if(m.type==='seat'&&Number.isInteger(m.seat)&&m.seat>=0&&m.seat<24){
   if(demos.has(m.seat)||[...clients.values()].some(u=>u!==user&&u.seat===m.seat)){send(ws,{type:'seat-rejected',requestId:m.requestId});return;}
   user.seat=m.seat;user.mode='walking';user.action='idle';send(ws,{type:'seat-granted',seat:m.seat,requestId:m.requestId});broadcast();
  }else if(m.type==='settle'&&user.seat!==null){user.mode='seated';user.yaw=0;broadcast();}
  else if(m.type==='leave'){user.seat=null;user.mode='standing';user.action='idle';broadcast();}
  else if(m.type==='action'&&actions.has(m.action)&&user.mode==='seated'){user.action=m.action;broadcast();}
  else if(m.type==='move'&&Number.isFinite(m.x)&&Number.isFinite(m.z)&&Number.isFinite(m.yaw)&&Date.now()-user.last>75){user.x=Math.max(-3.45,Math.min(3.45,m.x));user.z=Math.max(-8.8,Math.min(9,m.z));user.yaw=m.yaw;user.mode='walking';user.last=Date.now();broadcast();}
  else if(m.type==='stop'&&user.seat===null){user.mode='standing';broadcast();}
 }catch{}});
 ws.on('close',()=>{clients.delete(ws);broadcast();});ws.on('error',()=>{});
});
server.listen(process.env.PORT||3001,process.env.HOST||'127.0.0.1',()=>console.log('Sea Train listening '+server.address().port));
