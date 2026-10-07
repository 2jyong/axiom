import * as THREE from './vendor/three.module.min.js';

const clamp = THREE.MathUtils.clamp;
const smooth = value => { const x=clamp(value,0,1); return x*x*(3-2*x); };
const progress = (time,start,end) => smooth((time-start)/(end-start));

// Screw, hex bit and chuck share the Z axis throughout engagement and extraction.
export async function playOpening({ element, onComplete, reducedMotion=false }) {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  try {
  renderer.setClearColor(0x000000,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  const mobile=innerWidth<650;
  let pixelRatio=Math.min(devicePixelRatio,mobile?1.35:1.6);
  renderer.setPixelRatio(pixelRatio);
  renderer.domElement.setAttribute('aria-hidden','true');
  element.prepend(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(37,1,.1,90);
  const materials=new Set(), geometries=new Set(), textures=new Set();
  const material=properties=>{const value=new THREE.MeshStandardMaterial(properties);materials.add(value);return value;};
  const mesh=(geometry,mat,parent,x=0,y=0,z=0)=>{geometries.add(geometry);const value=new THREE.Mesh(geometry,mat);value.position.set(x,y,z);value.castShadow=true;value.receiveShadow=true;parent.add(value);return value;};
  const group=parent=>{const value=new THREE.Group();parent.add(value);return value;};
  const cylinder=(parent,r1,r2,length,z,mat,segments=48)=>{const value=mesh(new THREE.CylinderGeometry(r1,r2,length,segments),mat,parent,0,0,z);value.rotation.x=Math.PI/2;return value;};
  function roundedBox(parent,width,height,depth,radius,mat,x=0,y=0,z=0) {
    const w=width/2,h=height/2,r=radius,shape=new THREE.Shape();
    shape.moveTo(-w+r,-h);shape.lineTo(w-r,-h);shape.quadraticCurveTo(w,-h,w,-h+r);
    shape.lineTo(w,h-r);shape.quadraticCurveTo(w,h,w-r,h);shape.lineTo(-w+r,h);
    shape.quadraticCurveTo(-w,h,-w,h-r);shape.lineTo(-w,-h+r);shape.quadraticCurveTo(-w,-h,-w+r,-h);
    const bevel=Math.min(.025,radius*.5,width*.08,height*.08,depth*.15);
    const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:6});
    geo.translate(0,0,-depth/2);return mesh(geo,mat,parent,x,y,z);
  }
  function brushTexture() {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#929292';ctx.fillRect(0,0,256,256);
    let seed=31;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    for(let y=0;y<256;y++){const shade=120+Math.floor(random()*33);ctx.fillStyle=`rgb(${shade},${shade},${shade})`;ctx.fillRect(0,y,256,1);}
    for(let i=0;i<75;i++){ctx.strokeStyle=`rgba(230,230,230,${random()*.09})`;ctx.beginPath();const x=random()*256,y=random()*256;ctx.moveTo(x,y);ctx.lineTo(x+random()*90,y);ctx.stroke();}
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(7,7);textures.add(texture);return texture;
  }
  const brushed=brushTexture();
  const plateMetal=material({color:0x788d94,metalness:.9,roughness:.39,bumpMap:brushed,bumpScale:.006,roughnessMap:brushed});
  const brightSteel=material({color:0xd1d7d8,metalness:.98,roughness:.23});
  const turnedSteel=material({color:0x9eaeb5,metalness:.95,roughness:.33,bumpMap:brushed,bumpScale:.003});
  const blackSteel=material({color:0x273238,metalness:.8,roughness:.34});
  const rubber=material({color:0x151d20,metalness:.08,roughness:.83});
  const shell=material({color:0xa97125,metalness:.08,roughness:.52,bumpMap:brushed,bumpScale:.0008});
  const darkShell=material({color:0x28333a,metalness:.25,roughness:.42});
  const socketDark=material({color:0x10181d,metalness:.62,roughness:.52});

  // Small studio reflection map, generated locally rather than downloaded.
  const faces=[];
  for(let side=0;side<6;side++){
    const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
    const gradient=ctx.createLinearGradient(0,0,128,128);gradient.addColorStop(0,'#8ca3af');gradient.addColorStop(.45,'#23313c');gradient.addColorStop(1,'#091015');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    ctx.fillStyle=side===2?'#e8e9df':'#b8cbd2';ctx.fillRect(side%2?90:18,4,12,116);ctx.fillStyle='#576978';ctx.fillRect(55,0,5,128);faces.push(c);
  }
  const environment=new THREE.CubeTexture(faces);environment.needsUpdate=true;environment.colorSpace=THREE.SRGBColorSpace;textures.add(environment);
  const pmrem=new THREE.PMREMGenerator(renderer);const envTarget=pmrem.fromCubemap(environment);scene.environment=envTarget.texture;pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xd1e1ed,0x26333c,1.6));
  const key=new THREE.DirectionalLight(0xf6f1dd,4.3);key.position.set(-4,6,7);key.castShadow=true;
  key.shadow.mapSize.set(mobile?768:1024,mobile?768:1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;
  key.shadow.bias=-.0003;key.shadow.normalBias=.022;key.shadow.radius=3;scene.add(key);
  const fill=new THREE.DirectionalLight(0xa4c9e4,2);fill.position.set(5,1,5);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffd18c,1.5);rim.position.set(-3,-4,3);scene.add(rim);

  const left=group(scene),right=group(scene);
  for(const [plate,sign] of [[left,-1],[right,1]]){
    mesh(new THREE.BoxGeometry(30,40,.2),plateMetal,plate,sign*15.018,0,-.13);
    mesh(new THREE.BoxGeometry(.045,40,.22),turnedSteel,plate,sign*.047,0,-.105);
    mesh(new THREE.BoxGeometry(.012,40,.012),brightSteel,plate,sign*.074,0,.012);
    mesh(new THREE.BoxGeometry(.018,40,.01),blackSteel,plate,sign*2.8,0,-.021);
  }

  const screw=group(scene);
  const washerShape=new THREE.Shape();washerShape.absarc(0,0,.73,0,Math.PI*2,false);
  const washerHole=new THREE.Path();washerHole.absarc(0,0,.19,0,Math.PI*2,true);washerShape.holes.push(washerHole);
  mesh(new THREE.ExtrudeGeometry(washerShape,{depth:.048,bevelEnabled:true,bevelSegments:2,bevelSize:.018,bevelThickness:.018,curveSegments:40}),turnedSteel,left,0,0,.07);
  const headShape=new THREE.Shape();headShape.absarc(0,0,.54,0,Math.PI*2,false);
  const hexHole=new THREE.Path();for(let i=0;i<6;i++){const a=i*Math.PI/3;const x=Math.cos(a)*.173,y=Math.sin(a)*.173;i===0?hexHole.moveTo(x,y):hexHole.lineTo(x,y);}hexHole.closePath();headShape.holes.push(hexHole);
  mesh(new THREE.ExtrudeGeometry(headShape,{depth:.27,bevelEnabled:true,bevelSegments:3,bevelSize:.028,bevelThickness:.025,curveSegments:48}),brightSteel,screw,0,0,.15);
  cylinder(screw,.167,.167,.02,.23,socketDark,6);
  mesh(new THREE.TorusGeometry(.497,.013,6,64),turnedSteel,screw,0,0,.45);
  cylinder(screw,.148,.148,1.42,-.56,turnedSteel);
  const threadPoints=[];const turns=7.2;
  for(let i=0;i<=250;i++){const p=i/250,a=p*turns*Math.PI*2;threadPoints.push(new THREE.Vector3(Math.cos(a)*.166,Math.sin(a)*.166,-1.27+p*1.42));}
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(threadPoints),250,.026,5,false),brightSteel,screw);
  cylinder(screw,.145,.1,.065,-1.315,brightSteel);

  const tool=group(scene),rotor=group(tool);
  const bitShape=new THREE.Shape();for(let i=0;i<6;i++){const a=i*Math.PI/3;const x=Math.cos(a)*.16,y=Math.sin(a)*.16;i===0?bitShape.moveTo(x,y):bitShape.lineTo(x,y);}bitShape.closePath();
  mesh(new THREE.ExtrudeGeometry(bitShape,{depth:.39,bevelEnabled:true,bevelSegments:1,bevelSize:.004,bevelThickness:.006}),brightSteel,rotor,0,0,.325);
  cylinder(rotor,.13,.13,.22,.815,turnedSteel,12);
  cylinder(rotor,.25,.20,.18,.94,turnedSteel);
  cylinder(rotor,.32,.29,.31,1.18,blackSteel);
  cylinder(rotor,.325,.325,.045,1.02,brightSteel);
  cylinder(rotor,.326,.326,.055,1.35,turnedSteel);
  const ribGeometry=new THREE.BoxGeometry(.018,.031,.25);geometries.add(ribGeometry);
  const chuckRibs=new THREE.InstancedMesh(ribGeometry,turnedSteel,36);const dummy=new THREE.Object3D();
  for(let i=0;i<36;i++){const a=i/36*Math.PI*2;dummy.position.set(Math.cos(a)*.318,Math.sin(a)*.318,1.19);dummy.rotation.z=a-Math.PI/2;dummy.updateMatrix();chuckRibs.setMatrixAt(i,dummy.matrix);}rotor.add(chuckRibs);
  cylinder(tool,.37,.33,.15,1.44,blackSteel);
  const bodyProfile=[new THREE.Vector2(.32,1.48),new THREE.Vector2(.43,1.57),new THREE.Vector2(.46,1.82),new THREE.Vector2(.43,2.25),new THREE.Vector2(.36,2.56),new THREE.Vector2(.32,2.62)];
  const housing=mesh(new THREE.LatheGeometry(bodyProfile,48),shell,tool);housing.rotation.x=Math.PI/2;
  cylinder(tool,.34,.34,.13,2.64,darkShell);
  cylinder(tool,.30,.32,.05,2.735,rubber);
  cylinder(tool,.44,.44,.032,1.67,rubber);
  cylinder(tool,.369,.369,.028,2.51,rubber);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const vent=roundedBox(tool,.056,.018,.17,.008,rubber,Math.cos(a)*.371,Math.sin(a)*.371,2.5);vent.rotation.z=a-Math.PI/2;}
  roundedBox(tool,.025,.25,.48,.012,rubber,.433,0,1.99);
  roundedBox(tool,.025,.25,.48,.012,rubber,-.433,0,1.99);
  const grip=roundedBox(tool,.48,1.15,.48,.14,rubber,0,-.75,2.15);grip.rotation.x=-.13;
  const gripInset=roundedBox(tool,.22,.68,.022,.075,shell,0,-.89,2.417);gripInset.rotation.x=-.13;
  roundedBox(tool,.2,.16,.25,.055,darkShell,0,-.43,1.8);
  for(let i=0;i<5;i++){const ridge=roundedBox(tool,.36,.033,.015,.014,darkShell,0,-.6-i*.13,1.895+i*.017);ridge.rotation.x=-.13;}
  roundedBox(tool,1.02,.4,.78,.08,darkShell,0,-1.46,2.23);
  roundedBox(tool,.96,.08,.76,.02,rubber,0,-1.7,2.23);
  roundedBox(tool,.76,.09,.58,.025,shell,0,-1.21,2.23);
  const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=64;
  const labelContext=labelCanvas.getContext('2d');labelContext.fillStyle='#17232a';labelContext.fillRect(0,0,256,64);labelContext.fillStyle='#d7dfe0';labelContext.font='bold 29px Arial';labelContext.fillText('AXIOM',22,42);
  const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;textures.add(labelTexture);
  const labelMat=new THREE.MeshBasicMaterial({map:labelTexture});materials.add(labelMat);
  mesh(new THREE.PlaneGeometry(.63,.157),labelMat,tool,0,-1.45,2.631);
  const led=material({color:0xf1e6c2,emissive:0xffe6b0,emissiveIntensity:1.4,roughness:.28});
  mesh(new THREE.SphereGeometry(.037,12,8),led,tool,0,-.27,1.43);
  const workLight=new THREE.PointLight(0xffe6b0,0,2.3);workLight.position.set(0,-.27,1.39);tool.add(workLight);

  let disposed=false,animationFrame=0,start=0,previous=0,frames=0,intervalTotal=0,renderDue=0;
  const inspectParams=new URLSearchParams(location.search);
  const reviewFrame=inspectParams.has('intro-frame')?clamp(Number(inspectParams.get('intro-frame')),0,6.85):null;
  function resize(){const width=element.clientWidth,height=element.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  resize();addEventListener('resize',resize);
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(animationFrame);removeEventListener('resize',resize);key.shadow.dispose();chuckRibs.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());envTarget.dispose();renderer.dispose();renderer.domElement.remove();}
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();onComplete();},{once:true});
  function pose(t){
    // After the screw and driver clear the plate, orbit into the fastener axis.
    // Hold the frontal view briefly before the doors reveal the flat page behind it.
    const centerView=reducedMotion?1:progress(t,4.55,5.33);
    const portrait=camera.aspect<.8;
    camera.position.set(
      (portrait?6.5:4.6)*(1-centerView),
      (portrait?2.6:2.1)*(1-centerView),
      (portrait?14.2:9.5)-(portrait?3.1:1.9)*centerView
    );
    camera.lookAt((portrait?-.4:-.25)*(1-centerView),-.25*(1-centerView),.35-.2*centerView);
    const opening=progress(t,reducedMotion?.45:5.38,reducedMotion?1.4:6.72);
    left.position.x=-opening*12;right.position.x=opening*12;
    const unwind=progress(t,1.35,3.15);const lift=unwind*1.42;
    const withdraw=progress(t,3.35,4.5)*9;
    const approach=(1-progress(t,.18,1.05))*4.1;
    screw.position.z=lift+withdraw;screw.rotation.z=unwind*turns*Math.PI*2;
    tool.position.z=approach+lift+withdraw;rotor.rotation.z=screw.rotation.z;
    const vibration=t>1.35&&t<3.15?.002:0;tool.position.x=Math.sin(t*240)*vibration;tool.position.y=Math.cos(t*220)*vibration;
    tool.visible=!reducedMotion&&t<4.55;screw.visible=reducedMotion?opening<.14:t<4.55;
    workLight.intensity=t>1.05&&t<3.35?.7:0;
    element.style.setProperty('--opening-ui',String(1-progress(t,reducedMotion?.7:5.38,reducedMotion?1.35:6.45)));
    element.dataset.phase=reducedMotion?'reveal':t<1.1?'approach':t<1.35?'engage':t<3.15?'unscrew':t<4.55?'withdraw':t<5.38?'align':'reveal';
  }
  pose(reviewFrame??0);
  if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
  if(element.classList.contains('complete')){dispose();return{dispose};}
  renderer.render(scene,camera);
  element.classList.add('webgl-ready');element.dataset.renderer='webgl';
  function tick(now){
    if(disposed)return;if(!start){start=now;renderDue=now;}
    // Limit GPU rendering to 60 fps even on high-refresh desktop displays.
    if(reviewFrame===null&&now+.5<renderDue){animationFrame=requestAnimationFrame(tick);return;}
    renderDue+=1000/60;if(now-renderDue>1000/60)renderDue=now+1000/60;
    const t=reviewFrame===null?(now-start)/1000:reviewFrame;
    if(previous&&t>.25){const interval=now-previous;intervalTotal+=interval;frames++;if(frames===20&&intervalTotal/frames>25&&pixelRatio>1){pixelRatio=1;renderer.setPixelRatio(pixelRatio);resize();}}
    previous=now;pose(t);renderer.render(scene,camera);
    if(reviewFrame!==null){element.dataset.fps='review';return;}
    if(t>=(reducedMotion?1.45:6.8)){element.dataset.fps=String(Math.round(frames*1000/intervalTotal));element.dataset.frames=String(frames);onComplete();return;}
    animationFrame=requestAnimationFrame(tick);
  }
  animationFrame=requestAnimationFrame(tick);
  return{dispose};
  } catch(error) {
    renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    throw error;
  }
}
