import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

async function until(predicate){const end=Date.now()+2000;while(Date.now()<end){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('Expected network state did not arrive');}
test('10 clients share reserved seating, arrival, actions and greetings',async t=>{
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 t.after(()=>server.kill());
 const [chunk]=await once(server.stdout,'data');const port=Number(String(chunk).trim().split(' ').at(-1));assert(port>0);
 const clients=Array.from({length:10},()=>{const ws=new WebSocket(`ws://127.0.0.1:${port}/realtime`);const item={ws,messages:[]};ws.on('message',raw=>item.messages.push(JSON.parse(raw)));return item;});
 t.after(()=>clients.forEach(c=>c.ws.close()));
 await until(()=>clients.every(c=>c.messages.some(m=>m.type==='welcome')&&c.messages.some(m=>m.type==='state'&&m.users.length===10)));
 const id=clients[0].messages.find(m=>m.type==='welcome').id;
 const send=(i,m)=>clients[i].ws.send(JSON.stringify(m));
 send(0,{type:'seat',seat:0,requestId:1});
 await until(()=>clients[0].messages.some(m=>m.type==='seat-granted'&&m.requestId===1));
 send(1,{type:'seat',seat:0,requestId:2});await until(()=>clients[1].messages.some(m=>m.type==='seat-rejected'&&m.requestId===2));
 send(0,{type:'move',x:-2.25,z:-6.6,yaw:0});
 await until(()=>clients.every(c=>c.messages.some(m=>m.type==='state'&&m.users.some(u=>u.id===id&&u.mode==='walking'&&u.seat===0&&u.x===-2.25))));
 send(0,{type:'settle'});send(0,{type:'action',action:'tea'});
 await until(()=>clients.every(c=>c.messages.some(m=>m.type==='state'&&m.users.some(u=>u.id===id&&u.mode==='seated'&&u.action==='tea'))));
 send(0,{type:'greet'});await until(()=>clients.every(c=>c.messages.some(m=>m.type==='greet'&&m.id===id)));
 send(0,{type:'leave'});send(1,{type:'seat',seat:0,requestId:3});
 await until(()=>clients[1].messages.some(m=>m.type==='seat-granted'&&m.requestId===3));
 const names=clients.at(-1).messages.filter(m=>m.type==='state').at(-1).users.map(u=>u.name);assert.equal(new Set(names).size,10);
});
