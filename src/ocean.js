import * as THREE from 'three';

export function buildOcean(scene,panorama){
 const material=new THREE.ShaderMaterial({uniforms:{time:{value:0},panorama:{value:panorama}},side:THREE.DoubleSide,
 vertexShader:`varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
 fragmentShader:`
 uniform float time;uniform sampler2D panorama;varying vec3 world;
 float wave(vec2 p){return sin(p.x*.62+p.y*.16-time*.24)*.35+sin(p.x*1.18-p.y*.36+time*.19)*.17+sin(p.y*2.8+sin(p.x*.71+time*.12))*.07;}
 void main(){
  vec2 p=world.xz;
  vec3 eye=normalize(world-cameraPosition);
  float a=wave(p);
  vec3 normal=normalize(vec3((wave(p+vec2(.18,0.))-a)*.12,1.0,(wave(p+vec2(0.,.18))-a)*.12));
  vec3 reflection=reflect(eye,normal);
  float u=fract(atan(reflection.z,reflection.x)/6.2831853+.75);
  float v=clamp(.405+asin(clamp(reflection.y,-1.,1.))*.72,.01,.99);
  vec3 sky=texture2D(panorama,vec2(u,v)).rgb;
  float distanceFade=smoothstep(10.,140.,length(world.xz-cameraPosition.xz));
  float fresnel=pow(1.-max(dot(-eye,normal),0.),3.);
  vec3 painted=texture2D(panorama,vec2(u+a*.0008,clamp(.405-abs(eye.y)*.34+a*.0008,.025,.402))).rgb;
  vec3 water=mix(painted,sky,.10+fresnel*.12);
  water+=a*.004;
  // Broad gold path and delicate, irregular highlights instead of a tiled wave pattern.
  vec3 sun=normalize(vec3(-.7,.10,-.65));
  float glow=pow(max(dot(reflection,sun),0.),50.);
  float glints=pow(max(sin(p.x*3.6+p.y*.2+sin(p.y*.6-time*.2))*sin(p.y*2.2-time*.34),0.),15.);
  water+=vec3(.70,.35,.11)*glow*(.06+glints*.2);
  vec3 horizon=texture2D(panorama,vec2(u,.405)).rgb;
  water=mix(water,horizon*.84,distanceFade*.10);
  gl_FragColor=vec4(water,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const water=new THREE.Mesh(new THREE.PlaneGeometry(600,600),material);water.rotation.x=-Math.PI/2;water.position.y=-1.2;scene.add(water);
 const islands=[],birds=[];
 const stone=new THREE.MeshBasicMaterial({color:'#6c7485'}),moss=new THREE.MeshBasicMaterial({color:'#657782'}),trunk=new THREE.MeshStandardMaterial({color:'#50483f',roughness:1}),leaves=new THREE.MeshBasicMaterial({color:'#4b666b'});
 function mesh(parent,geo,mat,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
 function tree(parent,x,z,scale=1){
  const g=new THREE.Group();g.position.set(x,.45,z);g.scale.setScalar(scale);parent.add(g);
  const stem=mesh(g,new THREE.CylinderGeometry(.09,.16,2.4,9),trunk,0,1.15,0);stem.rotation.z=-.12;
  for(let i=0;i<5;i++){const branch=mesh(g,new THREE.SphereGeometry(1,16,10),leaves,Math.sin(i*2.3)*.7,1.9+i*.18,Math.cos(i*2.3)*.4);branch.scale.set(1.1,.3,.7);}
 }
 const specs=[[-28,-42,3.4,true],[44,-76,4.6,false],[-68,22,7,true],[32,74,2.5,false],[-40,-116,4.3,false],[82,-123,8,true],[56,112,4.1,true]];
 for(const [i,[x,z,size,hasTree]] of specs.entries()){
  const island=new THREE.Group();island.position.set(x*1.5,-1.2,z);scene.add(island);
  const rock=mesh(island,new THREE.SphereGeometry(1,20,12),stone,0,0,0);rock.scale.set(size,.32+size*.08,size*.63);
  const top=mesh(island,new THREE.SphereGeometry(1,20,10),moss,0,.28,0);top.scale.set(size*.9,.42,size*.56);
  if(hasTree)tree(island,-.5,.1,.6+size*.1);
  if(i===1){
   const ivory=new THREE.MeshStandardMaterial({color:'#e0d7c8',roughness:.8});
   mesh(island,new THREE.CylinderGeometry(.36,.6,3.6,16),ivory,.2,2.05,0);
   mesh(island,new THREE.CylinderGeometry(.56,.56,.65,12),new THREE.MeshStandardMaterial({color:'#ffc789',emissive:'#efaf62',emissiveIntensity:.6}),.2,4.15,0);
   mesh(island,new THREE.ConeGeometry(.78,.6,16),new THREE.MeshStandardMaterial({color:'#68657b'}),.2,4.75,0);
  }
  islands.push({object:island,start:z});
 }
 // A small sailboat far off the rail line, with a slight swell.
 const boat=new THREE.Group();boat.position.set(-58,-.87,-58);scene.add(boat);
 const hull=mesh(boat,new THREE.SphereGeometry(1,16,10),new THREE.MeshStandardMaterial({color:'#8c6953'}),0,0,0);hull.scale.set(1.7,.22,.5);
 mesh(boat,new THREE.CylinderGeometry(.035,.035,3.1,6),trunk,0,1.45,0);
 const sailGeo=new THREE.BufferGeometry();sailGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,2.9,0,0,.3,0,1.4,.3,0],3));sailGeo.computeVertexNormals();
 mesh(boat,sailGeo,new THREE.MeshStandardMaterial({color:'#eee1ce',side:THREE.DoubleSide,roughness:1}),0,0,0).rotation.y=Math.PI/2;
 for(let i=0;i<3;i++){const g=new THREE.Group();const positions=[-.35,0,.05,0,.08,0,.35,0,.05];const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.add(new THREE.Line(geom,new THREE.LineBasicMaterial({color:'#5d687b',transparent:true,opacity:.65})));scene.add(g);birds.push(g);}
 return(time)=>{
  material.uniforms.time.value=time;
  for(const item of islands)item.object.position.z=((item.start+time*.85+140)%280)-140;
  boat.position.y=-.87+Math.sin(time*.35)*.045;boat.rotation.z=Math.sin(time*.3)*.02;boat.position.z=((time*.5-58+160)%320)-160;
  for(const [i,bird] of birds.entries()){bird.position.set(-42+Math.sin(time*.055+i*.25)*9,8+i*.5,-30+Math.cos(time*.045+i*.1)*12);bird.rotation.z=Math.sin(time*.7+i)*.08;}
 };
}
