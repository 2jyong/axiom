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
  renderer.toneMappingExposure=1.05;
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
    const bevel=Math.min(.045,radius*.6,width*.08,height*.08,depth*.15);
    const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:6});
    geo.translate(0,0,-depth/2);return mesh(geo,mat,parent,x,y,z);
  }
  function surfaceTexture(kind,size=512) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size);
    let seed=31;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    for(let y=0;y<size;y++){
      const grain=(random()-.5)*9;
      for(let x=0;x<size;x++){
        const radial=kind==='radial'?Math.sin(Math.hypot(x-size/2,y-size/2)*2.6)*6:0;
        const value=kind==='rough'?243+random()*9:128+(random()-.5)*(kind==='grain'?2:11)+(kind==='grain'?grain:radial);
        const offset=(y*size+x)*4;pixels.data[offset]=pixels.data[offset+1]=pixels.data[offset+2]=value;pixels.data[offset+3]=255;
      }
    }
    ctx.putImageData(pixels,0,0);
    if(kind==='grain')for(let i=0;i<110;i++){
      ctx.strokeStyle=`rgba(180,180,180,${.03+random()*.07})`;ctx.lineWidth=.5;
      const x=random()*size,y=random()*size;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+30+random()*100,y);ctx.stroke();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.add(texture);return texture;
  }
  const brushed=surfaceTexture('grain',1024),roughness=surfaceTexture('rough'),polymer=surfaceTexture('polymer'),radial=surfaceTexture('radial');
  const plateMetal=material({color:0x858c8e,metalness:1,roughness:.36,bumpMap:brushed,bumpScale:.00008,roughnessMap:roughness,envMapIntensity:.75});
  const brightSteel=material({color:0xc4c9ca,metalness:1,roughness:.22,envMapIntensity:1});
  const turnedSteel=material({color:0xa2a9aa,metalness:1,roughness:.3,bumpMap:brushed,bumpScale:.0005,roughnessMap:roughness});
  const machinedFace=material({color:0xb5bcbd,metalness:1,roughness:.28,bumpMap:radial,bumpScale:.0007});
  const blackSteel=material({color:0x24282b,metalness:.95,roughness:.32});
  const rubber=material({color:0x101214,metalness:0,roughness:.86,bumpMap:polymer,bumpScale:.002});
  const shell=material({color:0xc38828,metalness:0,roughness:.43,bumpMap:polymer,bumpScale:.001});
  const darkShell=material({color:0x24272a,metalness:0,roughness:.5,bumpMap:polymer,bumpScale:.001});
  const socketDark=material({color:0x15191b,metalness:.8,roughness:.48});

  // Bake a studio with broad softboxes once; the animation only samples its map.
  const studio=new THREE.Scene();studio.background=new THREE.Color(0x161a1e);
  const studioGeometry=new THREE.BoxGeometry(1,1,1),studioMaterials=[];
  const roomMaterial=new THREE.MeshBasicMaterial({color:0x252a2d,side:THREE.BackSide});studioMaterials.push(roomMaterial);
  const room=new THREE.Mesh(studioGeometry,roomMaterial);room.scale.set(30,24,30);studio.add(room);
  for(const [position,scale,intensity] of [
    [[-6,5,7],[2.5,8,.1],5],[[5,3,5],[1.4,6,.1],3],[[1.4,.6,10],[3,6,.1],.7],[[0,9,0],[7,.1,5],4],[[0,-5,8],[8,.1,3],.6],[[1,2,-8],[4,6,.1],2]
  ]){
    const softboxMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity,intensity)});studioMaterials.push(softboxMaterial);
    const box=new THREE.Mesh(studioGeometry,softboxMaterial);box.position.fromArray(position);box.scale.fromArray(scale);studio.add(box);
  }
  const pmrem=new THREE.PMREMGenerator(renderer);const envTarget=pmrem.fromScene(studio,.04,.1,40);scene.environment=envTarget.texture;
  studioGeometry.dispose();studioMaterials.forEach(m=>m.dispose());pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe5ecf1,0x242b31,.65));
  const key=new THREE.DirectionalLight(0xf4f1e8,3.1);key.position.set(-4,6,7);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;
  key.shadow.bias=-.0002;key.shadow.normalBias=.012;key.shadow.radius=3.5;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe2eaf3,.9);fill.position.set(5,1,5);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xf4e8d4,1.1);rim.position.set(-3,-4,3);scene.add(rim);

  const left=group(scene),right=group(scene);
  for(const [plate,sign] of [[left,-1],[right,1]]){
    const outline=new THREE.Shape(),holeRadius=.246;
    if(sign<0){
      outline.moveTo(-30,-20);outline.lineTo(-.02,-20);outline.lineTo(-.02,-holeRadius);outline.lineTo(0,-holeRadius);
      outline.absarc(0,0,holeRadius,-Math.PI/2,-Math.PI*1.5,true);
      outline.lineTo(-.02,holeRadius);outline.lineTo(-.02,20);outline.lineTo(-30,20);outline.closePath();
    }else{
      outline.moveTo(.02,-20);outline.lineTo(30,-20);outline.lineTo(30,20);outline.lineTo(.02,20);outline.lineTo(.02,holeRadius);outline.lineTo(0,holeRadius);
      outline.absarc(0,0,holeRadius,Math.PI/2,-Math.PI/2,true);outline.lineTo(.02,-holeRadius);outline.closePath();
    }
    const plateGeometry=new THREE.ExtrudeGeometry(outline,{depth:.26,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:2,curveSegments:32});
    plateGeometry.translate(0,0,-.26);
    const uv=plateGeometry.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/8,uv.getY(i)/8);
    mesh(plateGeometry,plateMetal,plate);
  }

  const screw=group(scene);
  function planarUV(geometry,radius){const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');for(let i=0;i<positions.count;i++)if(Math.abs(normals.getZ(i))>.9)uv.setXY(i,positions.getX(i)/(radius*2)+.5,positions.getY(i)/(radius*2)+.5);return geometry;}
  const washerShape=new THREE.Shape();washerShape.absarc(0,0,.55,0,Math.PI*2,false);
  const washerHole=new THREE.Path();washerHole.absarc(0,0,.246,0,Math.PI*2,true);washerShape.holes.push(washerHole);
  mesh(planarUV(new THREE.ExtrudeGeometry(washerShape,{depth:.038,bevelEnabled:true,bevelSegments:3,bevelSize:.009,bevelThickness:.009,curveSegments:48}),.55),machinedFace,left,0,0,.019);
  for(const radius of [.286,.445,.523]){const groove=mesh(new THREE.TorusGeometry(radius,.0012,5,80),turnedSteel,left,0,0,.066);groove.castShadow=false;}
  const headShape=new THREE.Shape();headShape.absarc(0,0,.385,0,Math.PI*2,false);
  const hexHole=new THREE.Path();for(let i=0;i<6;i++){const a=i*Math.PI/3;const x=Math.cos(a)*.173,y=Math.sin(a)*.173;i===0?hexHole.moveTo(x,y):hexHole.lineTo(x,y);}hexHole.closePath();headShape.holes.push(hexHole);
  mesh(planarUV(new THREE.ExtrudeGeometry(headShape,{depth:.34,bevelEnabled:true,bevelSegments:3,bevelSize:.023,bevelThickness:.023,curveSegments:64}),.385),machinedFace,screw,0,0,.082);
  cylinder(screw,.169,.169,.018,.19,socketDark,6);
  cylinder(screw,.199,.199,1.42,-.628,turnedSteel);
  const turns=7.2,threadSpan=1.275,threadVertices=[],threadIndices=[],threadSegments=360;
  const profile=[[.199,-.085],[.238,-.018],[.238,.018],[.199,.085]];
  for(let i=0;i<=threadSegments;i++){
    const p=i/threadSegments,angle=p*turns*Math.PI*2;
    const taper=Math.min(1,p*20,(1-p)*20);
    for(const [radius,offset] of profile){const r=.199+(radius-.199)*Math.max(0,taper);threadVertices.push(Math.cos(angle)*r,Math.sin(angle)*r,-1.265+p*threadSpan+offset);}
    if(i<threadSegments)for(let k=0;k<3;k++){const a=i*4+k,b=a+4;threadIndices.push(a,b,a+1,b,b+1,a+1);}
  }
  const threadGeometry=new THREE.BufferGeometry();threadGeometry.setAttribute('position',new THREE.Float32BufferAttribute(threadVertices,3));threadGeometry.setIndex(threadIndices);threadGeometry.computeVertexNormals();
  mesh(threadGeometry,brightSteel,screw);
  cylinder(screw,.199,.165,.08,-1.365,brightSteel);
  const headRibGeometry=new THREE.BoxGeometry(.009,.012,.23);geometries.add(headRibGeometry);
  const headRibs=new THREE.InstancedMesh(headRibGeometry,turnedSteel,60);
  const headDummy=new THREE.Object3D();for(let i=0;i<60;i++){const angle=i/60*Math.PI*2;headDummy.position.set(Math.cos(angle)*.384,Math.sin(angle)*.384,.252);headDummy.rotation.z=angle-Math.PI/2;headDummy.updateMatrix();headRibs.setMatrixAt(i,headDummy.matrix);}screw.add(headRibs);

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
  const torqueCanvas=document.createElement('canvas');torqueCanvas.width=1024;torqueCanvas.height=128;
  const torqueContext=torqueCanvas.getContext('2d');torqueContext.fillStyle='#242527';torqueContext.fillRect(0,0,1024,128);
  torqueContext.font='600 30px Arial';torqueContext.textAlign='center';torqueContext.fillStyle='#d8d7d0';
  for(let i=0;i<12;i++){const x=(i+.5)*1024/12;torqueContext.fillText(String(i*2+1),x,72);torqueContext.fillRect(x-1,13,2,15);}
  const torqueTexture=new THREE.CanvasTexture(torqueCanvas);torqueTexture.colorSpace=THREE.SRGBColorSpace;textures.add(torqueTexture);
  const torqueMaterial=material({map:torqueTexture,roughness:.57,metalness:.04});
  cylinder(tool,.372,.372,.14,1.445,torqueMaterial);
  const bodyProfile=[new THREE.Vector2(.32,1.48),new THREE.Vector2(.43,1.57),new THREE.Vector2(.46,1.82),new THREE.Vector2(.43,2.25),new THREE.Vector2(.36,2.56),new THREE.Vector2(.32,2.62)];
  const housing=mesh(new THREE.LatheGeometry(bodyProfile,48),shell,tool);housing.rotation.x=Math.PI/2;
  const bodyRadius=z=>{for(let i=1;i<bodyProfile.length;i++){const a=bodyProfile[i-1],b=bodyProfile[i];if(z<=b.y)return THREE.MathUtils.lerp(a.x,b.x,(z-a.y)/(b.y-a.y));}return bodyProfile.at(-1).x;};
  // Molded panels follow the curved shell, avoiding intersecting flat overlays.
  function shellPatch(angle,halfAngle,zStart,zEnd,offset,mat){
    const vertices=[],indices=[],uv=[],rows=20,columns=12;
    for(let j=0;j<=rows;j++){
      const v=j/rows,z=THREE.MathUtils.lerp(zStart,zEnd,v),r=bodyRadius(z)+offset;
      const edge=Math.min(v,1-v),round=edge<.13?Math.sqrt(Math.max(.001,1-Math.pow(1-edge/.13,2))):1;
      for(let i=0;i<=columns;i++){const u=i/columns,a=angle+(u*2-1)*halfAngle*round;vertices.push(Math.cos(a)*r,Math.sin(a)*r,z);uv.push(u,v);}
      if(j<rows)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const patch=mesh(geometry,mat,tool);patch.castShadow=false;return patch;
  }
  const rearProfile=[[.34,2.58],[.36,2.63],[.35,2.74],[.32,2.8],[.25,2.84],[0,2.855]].map(v=>new THREE.Vector2(...v));
  const rearCap=mesh(new THREE.LatheGeometry(rearProfile,48),darkShell,tool);rearCap.rotation.x=Math.PI/2;
  cylinder(tool,.24,.24,.015,2.856,rubber);
  for(let i=0;i<5;i++)roundedBox(tool,.29-Math.abs(i-2)*.045,.018,.009,.006,socketDark,0,(i-2)*.057,2.875);
  cylinder(tool,.44,.44,.032,1.67,rubber);
  cylinder(tool,.369,.369,.028,2.51,rubber);
  for(let i=0;i<12;i++)shellPatch(i/12*Math.PI*2,.065,2.36,2.54,.005,rubber);
  for(const sign of [-1,1]){
    const sideAngle=sign>0?0:Math.PI;
    shellPatch(sideAngle,.43,1.7,2.38,.006,darkShell);
    shellPatch(sideAngle,.35,1.76,2.32,.009,shell);
    for(const z of [1.77,2.33]){
      const r=bodyRadius(z)+.018,x=Math.sqrt(r*r-.13*.13);
      const screwHead=mesh(new THREE.CylinderGeometry(.027,.027,.014,16),blackSteel,tool,sign*x,-.13,z);screwHead.rotation.z=sign*Math.acos(-.13/r);
      roundedBox(tool,.002,.006,.034,.001,socketDark,sign*(x+.009),-.13,z);
    }
    shellPatch(sideAngle,.3,2.4,2.59,.008,rubber);
  }
  for(const sign of [-1,1]){
    const seamPath=new THREE.CatmullRomCurve3(bodyProfile.map(v=>new THREE.Vector3(0,sign*v.x,v.y)));
    mesh(new THREE.TubeGeometry(seamPath,28,.0035,4,false),darkShell,tool);
  }
  // Loft an ergonomic oval grip: narrower at the fingers and swept toward the pack.
  const gripRings=[[-.25,.2,.28,2.12],[-.38,.235,.265,2.13],[-.53,.212,.226,2.15],[-.7,.19,.208,2.19],[-.9,.185,.22,2.24],[-1.08,.204,.25,2.28],[-1.23,.23,.267,2.3],[-1.3,.235,.27,2.31]];
  const gripVertices=[],gripIndices=[],gripUV=[],gripSegments=36;
  for(let j=0;j<gripRings.length;j++){
    const [y,rx,rz,z]=gripRings[j];
    for(let i=0;i<=gripSegments;i++){const a=i/gripSegments*Math.PI*2;gripVertices.push(Math.cos(a)*rx,y,z+Math.sin(a)*rz);gripUV.push(i/gripSegments,j/(gripRings.length-1));}
    if(j<gripRings.length-1)for(let i=0;i<gripSegments;i++){const a=j*(gripSegments+1)+i,b=a+gripSegments+1;gripIndices.push(a,a+1,b,a+1,b+1,b);}
  }
  const gripGeometry=new THREE.BufferGeometry();gripGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gripVertices,3));gripGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(gripUV,2));gripGeometry.setIndex(gripIndices);gripGeometry.computeVertexNormals();
  mesh(gripGeometry,rubber,tool);
  const spineShape=new THREE.Shape();spineShape.moveTo(-.045,-.34);spineShape.lineTo(.045,-.34);spineShape.lineTo(.04,-1.21);spineShape.quadraticCurveTo(0,-1.26,-.04,-1.21);spineShape.closePath();
  const spineGeometry=new THREE.ExtrudeGeometry(spineShape,{depth:.015,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:3});
  const spine=mesh(spineGeometry,shell,tool,0,0,2.365);spine.rotation.x=-.15;
  roundedBox(tool,.2,.16,.25,.055,darkShell,0,-.43,1.8);
  roundedBox(tool,.13,.08,.31,.035,rubber,0,-.24,2.03);
  for(let i=0;i<4;i++){
    const y=-.62-i*.16,z=2.17+i*.043,points=[];
    for(let j=0;j<=32;j++){const a=j/32*Math.PI*2;points.push(new THREE.Vector3(Math.cos(a)*.2,y,z+Math.sin(a)*.226));}
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.003,4,false),darkShell,tool);
  }
  roundedBox(tool,1.02,.4,.78,.08,darkShell,0,-1.46,2.23);
  roundedBox(tool,.96,.08,.76,.02,rubber,0,-1.7,2.23);
  roundedBox(tool,.76,.09,.58,.025,shell,0,-1.21,2.23);
  for(const sign of [-1,1]){
    roundedBox(tool,.08,.16,.32,.025,shell,sign*.503,-1.4,2.22);
    roundedBox(tool,.018,.2,.62,.04,rubber,sign*.515,-1.52,2.23);
    for(let i=0;i<4;i++)roundedBox(tool,.016,.012,.5,.005,darkShell,sign*.523,-1.465-i*.04,2.22);
  }
  const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=64;
  const labelContext=labelCanvas.getContext('2d');labelContext.fillStyle='#222628';labelContext.fillRect(0,0,256,64);labelContext.fillStyle='#d7d9d5';labelContext.font='bold 24px Arial';labelContext.fillText('AXIOM',15,29);labelContext.font='9px Arial';labelContext.fillText('ENGINEERING / BRUSHLESS',16,46);labelContext.fillStyle='#868c8c';for(let i=0;i<16;i++)labelContext.fillRect(178+i*3,14,1+(i%2),32);
  const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;textures.add(labelTexture);
  const labelMat=material({map:labelTexture,roughness:.6,metalness:.05});
  mesh(new THREE.PlaneGeometry(.63,.157),labelMat,tool,0,-1.45,2.675);
  const led=material({color:0xf1e6c2,emissive:0xffe6b0,emissiveIntensity:1.4,roughness:.28});
  mesh(new THREE.SphereGeometry(.037,12,8),led,tool,0,-.27,1.43);
  const workLight=new THREE.PointLight(0xffe6b0,0,2.3);workLight.position.set(0,-.27,1.39);tool.add(workLight);

  let disposed=false,animationFrame=0,start=0,previous=0,frames=0,intervalTotal=0,renderDue=0;
  const inspectParams=new URLSearchParams(location.search);
  const reviewFrame=inspectParams.has('intro-frame')?clamp(Number(inspectParams.get('intro-frame')),0,5.2):null;
  let currentTime=reviewFrame??0;
  function resize(){const width=element.clientWidth,height=element.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(element.classList.contains('webgl-ready')){pose(currentTime);renderer.render(scene,camera);}}
  resize();addEventListener('resize',resize);
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(animationFrame);removeEventListener('resize',resize);key.shadow.dispose();chuckRibs.dispose();headRibs.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());envTarget.dispose();renderer.dispose();renderer.domElement.remove();}
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();onComplete();},{once:true});
  function pose(t){
    currentTime=t;
    // After the screw and driver clear the plate, orbit into the fastener axis.
    // Hold the frontal view briefly before the doors reveal the flat page behind it.
    const centerView=reducedMotion?1:progress(t,3.32,3.72);
    const portrait=camera.aspect<.8;
    camera.position.set(
      (portrait?6.5:4.6)*(1-centerView),
      (portrait?2.6:2.1)*(1-centerView),
      (portrait?14.2:9.5)-(portrait?3.1:1.9)*centerView
    );
    camera.lookAt((portrait?-.4:-.25)*(1-centerView),-.25*(1-centerView),.35-.2*centerView);
    const opening=progress(t,reducedMotion?.45:3.77,reducedMotion?1.4:5.11);
    const halfFrame=(portrait?11.1:7.6)*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*camera.aspect;
    const panelTravel=halfFrame+.8;
    left.position.x=-opening*panelTravel;right.position.x=opening*panelTravel;
    const unwind=progress(t,1.35,2.45);const lift=unwind*threadSpan+progress(t,2.45,2.53)*.145;
    const withdraw=progress(t,2.65,3.27)*9;
    const approach=(1-progress(t,.18,1.05))*4.1;
    screw.position.z=lift+withdraw;screw.rotation.z=unwind*turns*Math.PI*2;
    tool.position.z=approach+lift+withdraw;rotor.rotation.z=screw.rotation.z;
    const vibration=t>1.35&&t<2.45?.0015:0;tool.position.x=Math.sin(t*240)*vibration;tool.position.y=Math.cos(t*220)*vibration;
    tool.visible=!reducedMotion&&t<3.32;screw.visible=reducedMotion?opening<.14:t<3.32;
    workLight.intensity=t>1.05&&t<2.65?.65:0;
    element.style.setProperty('--opening-ui',String(1-progress(t,reducedMotion?.7:3.77,reducedMotion?1.35:4.84)));
    element.dataset.phase=reducedMotion?'reveal':t<1.05?'approach':t<1.35?'engage':t<2.45?'unscrew':t<3.32?'withdraw':t<3.77?'align':'reveal';
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
    if(t>=(reducedMotion?1.45:5.2)){element.dataset.fps=String(Math.round(frames*1000/intervalTotal));element.dataset.frames=String(frames);onComplete();return;}
    animationFrame=requestAnimationFrame(tick);
  }
  animationFrame=requestAnimationFrame(tick);
  return{dispose};
  } catch(error) {
    renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    throw error;
  }
}
