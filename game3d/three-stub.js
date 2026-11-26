// Minimal three.js stub for headless logic tests. Enough API surface to run
// the real game.js unmodified, including a pinhole-camera raycaster.
(function(){
const V3=class{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
 clone(){return new V3(this.x,this.y,this.z);}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
 multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
 dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;}
 length(){return Math.hypot(this.x,this.y,this.z);}
 normalize(){const l=this.length()||1;return this.multiplyScalar(1/l);}
 crossVectors(a,b){const x=a.y*b.z-a.z*b.y,y=a.z*b.x-a.x*b.z,z=a.x*b.y-a.y*b.x;
  return this.set(x,y,z);}
 cross(v){return this.crossVectors(this.clone(),v);}
};
const V2=class{constructor(x=0,y=0){this.x=x;this.y=y;}set(x,y){this.x=x;this.y=y;return this;}};
const Color=class{
 constructor(h=0){this.setHex(h);}
 setHex(h){if(typeof h==='string')h=parseInt(h.replace('#',''),16);
  h=(h|0)>>>0;this.r=((h>>16)&255)/255;this.g=((h>>8)&255)/255;this.b=(h&255)/255;return this;}
 getHex(){return (Math.round(this.r*255)<<16)|(Math.round(this.g*255)<<8)|Math.round(this.b*255);}
 multiplyScalar(s){this.r*=s;this.g*=s;this.b*=s;return this;}
 clone(){const c=new Color();c.r=this.r;c.g=this.g;c.b=this.b;return c;}
};
const O3=class{
 constructor(){this.position=new V3();
  this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;}};
  this.scale=new V3(1,1,1);this.scale.setScalar=function(s){this.x=this.y=this.z=s;return this;};
  this.children=[];this.visible=true;this.parent=null;this.matrix={};this.userData={};
  this.quaternion={setFromUnitVectors(){return this;}};}
 add(...o){for(const x of o)if(x){x.parent=this;this.children.push(x);}return this;}
 remove(o){const i=this.children.indexOf(o);if(i>=0)this.children.splice(i,1);return this;}
 clear(){this.children.length=0;return this;}
 updateMatrix(){}updateMatrixWorld(){}
 traverse(f){f(this);for(const c of this.children)c.traverse(f);}
};
const Geo=class{constructor(){this.attributes={};this.drawRange={start:0,count:Infinity};}
 setAttribute(n,a){this.attributes[n]=a;return this;}
 setDrawRange(s,c){this.drawRange={start:s,count:c};return this;}
 computeVertexNormals(){return this;}dispose(){}};
const Attr=class{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false;}};
function mat(){
 return class{constructor(p={}){Object.assign(this,{color:new Color(0xffffff),emissive:new Color(0),
  emissiveIntensity:0,opacity:1,transparent:false,roughness:1,metalness:0,map:null,size:1,
  sizeAttenuation:true,vertexColors:false,side:0},p);
  if(typeof this.color==='number')this.color=new Color(this.color);
  if(typeof this.emissive==='number')this.emissive=new Color(this.emissive);}};
}
const Mesh=class extends O3{constructor(g,m){super();this.geometry=g;this.material=m;
 this.isMesh=true;this.castShadow=false;this.receiveShadow=false;}};
const Inst=class extends Mesh{constructor(g,m,n){super(g,m);this.count=n;
 this.instanceMatrix={needsUpdate:false};}setMatrixAt(){}};
const Points=class extends O3{constructor(g,m){super();this.geometry=g;this.material=m;}};
const Light=class extends O3{constructor(c,i){super();this.color=new Color(c||0xffffff);
 this.intensity=i===undefined?1:i;}};
const Camera=class extends O3{constructor(fov,a,n,f){super();this.fov=fov;this.aspect=a;
 this.near=n;this.far=f;this.target=new V3();}
 updateProjectionMatrix(){}lookAt(x,y,z){if(this.target)this.target.set(x,y,z);this.__look=[x,y,z];}};
const Raycaster=class{
 constructor(){this.ray={origin:new V3(),direction:new V3(),
  intersectPlane:(plane,target)=>{
   const n=plane.normal,d=plane.constant,o=this.ray.origin,dir=this.ray.direction;
   const denom=n.dot(dir);if(Math.abs(denom)<1e-9)return null;
   const t=-(n.dot(o)+d)/denom;if(t<0)return null;
   target.set(o.x+dir.x*t,o.y+dir.y*t,o.z+dir.z*t);return target;}};}
 setFromCamera(ndc,cam){
  this.ray.origin.copy(cam.position);
  const look=cam.target||new V3(...(cam.__look||[0,0,0]));
  const f=look.clone().sub(cam.position).normalize();
  const r=new V3().crossVectors(f,new V3(0,1,0)).normalize();
  const u=new V3().crossVectors(r,f).normalize();
  const tf=Math.tan(cam.fov*Math.PI/360);
  this.ray.direction.copy(f)
   .add(r.multiplyScalar(ndc.x*cam.aspect*tf))
   .add(u.multiplyScalar(ndc.y*tf)).normalize();
 }
};
global.THREE={
 WebGLRenderer:class{constructor(){this.shadowMap={enabled:false,type:null};this.domElement={};}
  setPixelRatio(){}setSize(){}render(){}setClearColor(){}},
 Scene:class extends O3{constructor(){super();this.background=null;this.fog=null;}},
 Group:O3,Object3D:O3,Mesh,InstancedMesh:Inst,Points,PerspectiveCamera:Camera,
 HemisphereLight:class extends Light{constructor(c,g,i){super(c,i);this.groundColor=new Color(g||0);}},
 DirectionalLight:class extends Light{constructor(c,i){super(c,i);this.target=new O3();this.castShadow=false;
  this.shadow={mapSize:{set(){}},camera:{left:0,right:0,top:0,bottom:0,near:0,far:0}};}},
 PointLight:class extends Light{constructor(c,i,d){super(c,i);this.distance=d||0;}},
 FogExp2:class{constructor(c,d){this.color=new Color(c);this.density=d;}},
 Raycaster,Vector2:V2,Vector3:V3,Color,
 Plane:class{constructor(n,c){this.normal=n;this.constant=c;}},
 BoxGeometry:Geo,SphereGeometry:Geo,ConeGeometry:Geo,PlaneGeometry:Geo,TorusGeometry:Geo,
 CylinderGeometry:Geo,LatheGeometry:Geo,DodecahedronGeometry:Geo,OctahedronGeometry:Geo,IcosahedronGeometry:Geo,
 BufferGeometry:Geo,
 BufferAttribute:Attr,
 MeshStandardMaterial:mat(),MeshBasicMaterial:mat(),PointsMaterial:mat(),
 CanvasTexture:class{constructor(){this.wrapS=0;this.wrapT=0;this.repeat={set(){}};}},
 RepeatWrapping:1000,PCFSoftShadowMap:2
};
})();
