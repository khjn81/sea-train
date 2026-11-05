import * as THREE from 'three';

// One panoramic environment shared by the sky and water reflection.
export function buildAtmosphere(scene,onReady=()=>{}){
 const texture=new THREE.TextureLoader().load('/landscape-panorama.jpg',onReady);
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
