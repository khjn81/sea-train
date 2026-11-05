import * as THREE from 'three';

// One panoramic environment shared by the sky and water reflection.
export function buildAtmosphere(scene,onReady=()=>{}){
 // A tiny original gradient is usable immediately, including offline/failed images.
 const fallback=document.createElement('canvas');fallback.width=256;fallback.height=128;
 const context=fallback.getContext('2d');
 const gradient=context.createLinearGradient(0,0,0,128);
 gradient.addColorStop(0,'#8f92ae');gradient.addColorStop(.48,'#e5b69a');
 gradient.addColorStop(.60,'#f1c49e');gradient.addColorStop(1,'#a1a2af');
 context.fillStyle=gradient;context.fillRect(0,0,256,128);
 const texture=new THREE.CanvasTexture(fallback);
 new THREE.ImageLoader().load('/landscape-panorama.jpg',image=>{
  texture.image=image;texture.needsUpdate=true;onReady();
 },undefined,()=>onReady());
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.ClampToEdgeWrapping;
 const sky=new THREE.Mesh(new THREE.SphereGeometry(150,48,24),new THREE.ShaderMaterial({
  uniforms:{panorama:{value:texture}},side:THREE.BackSide,depthWrite:false,
  vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
  uniform sampler2D panorama;varying vec3 direction;
  void main(){
   vec3 d=normalize(direction);
   float u=fract(atan(d.z,d.x)/6.2831853+.75);
   float v=clamp(.405+asin(clamp(d.y,-1.,1.))*.72,.01,.99);
   vec3 color=texture2D(panorama,vec2(u,v)).rgb;
   float edge=1.-smoothstep(0.,.035,min(u,1.-u));
   vec3 joint=(texture2D(panorama,vec2(.003,v)).rgb+texture2D(panorama,vec2(.997,v)).rgb)*.5;
   color=mix(color,joint,edge);
   gl_FragColor=vec4(color,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`
 }));sky.renderOrder=-1;scene.add(sky);return texture;
}
