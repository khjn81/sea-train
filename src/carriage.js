import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function texture(kind){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');let seed=73;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
  ctx.fillStyle=kind==='wood'?'#906b50':'#677568';ctx.fillRect(0,0,256,256);
  for(let i=0;i<1100;i++){ctx.strokeStyle=kind==='wood'?`rgba(${rand()>.5?'40,21,12':'218,181,131'},${rand()*.055})`:`rgba(10,20,10,${rand()*.18})`;ctx.lineWidth=kind==='wood'?rand()*1.8+.3:.6;ctx.beginPath();let x=rand()*256,y=rand()*256;ctx.moveTo(x,y);if(kind==='wood'){ctx.bezierCurveTo(x+rand()*10,y+30,x-rand()*5,y+60,x+rand()*4,y+130)}else ctx.lineTo(x+16,y);ctx.stroke()}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='wood'?1:3,kind==='wood'?1:3);return t;
}
export function buildCarriage(scene){
 const materials={wood:new THREE.MeshStandardMaterial({color:'#dec7ab',map:texture('wood'),roughness:.48}),dark:new THREE.MeshStandardMaterial({color:'#3f3029',roughness:.55}),panel:new THREE.MeshStandardMaterial({color:'#b09b7e',roughness:.75}),ivory:new THREE.MeshStandardMaterial({color:'#e9dfcc',roughness:.8}),metal:new THREE.MeshStandardMaterial({color:'#b3a084',metalness:.7,roughness:.32}),fabric:new THREE.MeshStandardMaterial({color:'#b1d1b5',map:texture('fabric'),roughness:.95}),seam:new THREE.MeshStandardMaterial({color:'#596f5a',roughness:.9}),light:new THREE.MeshStandardMaterial({color:'#ffdfab',emissive:'#ffd39c',emissiveIntensity:.55})};
 function box(x,y,z,w,h,d,m,round=0){const mesh=new THREE.Mesh(round?new RoundedBoxGeometry(w,h,d,2,round):new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.castShadow=true;scene.add(mesh);return mesh}
 function rod(a,b,r,m){const pa=new THREE.Vector3(...a),pb=new THREE.Vector3(...b),v=pb.clone().sub(pa);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),8),m);mesh.position.copy(pa.add(pb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());scene.add(mesh);return mesh}
 function label(text,x,y,z,size=.3){const c=document.createElement('canvas');c.width=256;c.height=96;const cx=c.getContext('2d');cx.fillStyle='#283d36';cx.fillRect(0,0,256,96);cx.font='38px serif';cx.fillStyle='#e4d2ad';cx.textAlign='center';cx.fillText(text,128,62);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(size*2.67,size),new THREE.MeshBasicMaterial({map:t}));p.position.set(x,y,z);scene.add(p)}
 box(0,-.16,0,8,.32,21,materials.dark);
 for(let i=0;i<25;i++)box(-3.84+i*.32,.015,0,.312,.055,20.95,materials.wood);
 // Curved pale ceiling with wooden ribs; delicate metal window surrounds.
 for(let i=0;i<24;i++){const x=-3.84+i*.334;const y=4.25+.62*Math.sqrt(1-(x/4)**2);const slope=-.62*x/(16*Math.sqrt(1-(x/4)**2));const p=box(x,y,0,.35,.08,21,materials.ivory);p.rotation.z=Math.atan(slope)}
 for(const side of [-1,1]){const x=side*4;
  box(x,.67,0,.1,1.35,21,materials.wood);box(x,4.05,0,.1,.5,21,materials.ivory);
  box(x-side*.035,1.38,0,.15,.045,21,materials.metal);
  box(x-side*.035,3.8,0,.12,.045,21,materials.metal);
  box(x-side*.02,3.92,0,.12,.14,21,materials.wood);
  for(let z=-10;z<=10;z+=2.8){
   box(x,2.59,z,.075,2.4,.055,materials.dark);
   box(x-side*.012,2.59,z,.09,2.42,.02,materials.metal);
   // Latch and a narrow dividing rail, typical of old passenger carriages.
   box(x-side*.04,2.72,z+1.38,.07,.035,2.72,materials.metal);
   box(x-side*.07,2.69,z+1.38,.08,.06,.18,materials.metal,.015);
   box(x-side*.035,.7,z+1.38,.03,.88,2.4,materials.panel);
   box(x-side*.07,.7,z+1.38,.025,.75,2.24,materials.wood);
  }
  // Open luggage rack with fine brass rails instead of a thick shelf.
  for(let z=-9.4;z<10;z+=2.8){rod([x-side*.05,3.93,z],[x-side*.68,3.6,z],.023,materials.metal);rod([x-side*.68,3.6,z],[x-side*.68,3.85,z],.022,materials.metal)}
  for(let j=0;j<4;j++)rod([x-side*(.1+j*.17),3.64,-10],[x-side*(.1+j*.17),3.64,10],.018,materials.metal);
 }
 // Vestibule and glazed door, with symmetrical wood paneling.
 box(0,2.38,-10.5,8,4.76,.16,materials.ivory);box(0,.8,-10.38,8,1.6,.06,materials.wood);
 box(0,2.05,-10.26,1.85,4,.12,materials.wood,.07);box(0,2.65,-10.16,1.35,1.85,.035,materials.dark,.1);
 box(0,2.65,-10.13,1.22,1.72,.025,materials.panel,.08);box(.67,1.54,-10.1,.06,.31,.06,materials.metal,.025);
 label('01  ·  바다행',0,4.25,-10.15,.32);
 label('노을 ─ 물결 ─ 구름',-2.4,2.65,-10.22,.29);label('잠시 쉬어가요',2.4,2.65,-10.22,.29);
 for(const x of [-2.4,2.4]){box(x,2.6,-10.34,1.15,1.55,.07,materials.wood,.08);box(x,2.6,-10.27,1.0,1.4,.03,materials.panel,.06)}
 for(let z=-7;z<=9;z+=4){box(0,4.57,z,.9,.07,1.9,materials.metal,.06);box(0,4.51,z,.75,.09,1.7,materials.light,.08);}
 const seats=[],targets=[];
 for(let row=0;row<6;row++)for(let side of [-1,1])for(let place=0;place<2;place++){
  const z=-7.5+row*2.8,x=side*(2.25+place*.8),id=seats.length;seats.push({x,z,side});
  box(x,.5,z,.77,.22,1.12,materials.fabric,.09);box(x,1.05,z-.48,.77,1.03,.22,materials.fabric,.09);
  box(x,1.43,z-.35,.62,.16,.08,materials.seam,.035);
  for(const dx of [-.38,.38]){box(x+dx,.73,z,.055,.1,1.08,materials.wood,.025);rod([x+dx,.56,z+.35],[x+dx,.71,z+.35],.025,materials.metal)}
  box(x,.28,z,.16,.5,.66,materials.dark);box(x,.98,z-.62,.5,.3,.035,materials.wood,.025);
  const target=box(x,1,z,.76,1.25,1.17,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));target.userData.seat=id;targets.push(target);
 }
 // Valises on the overhead racks.
 for(const [x,z] of [[-3.65,-4],[3.65,-6],[-3.65,4]]){box(x,3.84,z,.48,.36,.8,materials.wood,.06);for(const d of [-.22,.22])box(x,3.84,z+d,.49,.37,.027,materials.dark)}
 // Batch static opaque surfaces by shared material and shadow policy.
 scene.updateMatrixWorld(true);const groups=new Map(),hitTargets=new Set(targets);
 for(const mesh of [...scene.children]){if(!mesh.isMesh||hitTargets.has(mesh)||mesh.material.transparent||mesh.material.isShaderMaterial||Array.isArray(mesh.material))continue;const key=mesh.material.uuid+mesh.castShadow+mesh.receiveShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);}
 for(const meshes of groups.values()){if(meshes.length<2)continue;const geometry=mergeGeometries(meshes.map(mesh=>{const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);return g;}));if(!geometry)continue;const batch=new THREE.Mesh(geometry,meshes[0].material);batch.castShadow=meshes[0].castShadow;batch.receiveShadow=meshes[0].receiveShadow;for(const mesh of meshes){scene.remove(mesh);mesh.geometry.dispose();}scene.add(batch);}
 return {seats,targets};
}
