/* The Rainworn Temple — world composition and effects */
window.buildTemple = async (renderer) => {
  const T = THREE;
  const scene = new T.Scene();
  scene.background = new T.Color(0x8aacae);
  scene.fog = new T.FogExp2(0x537077, .031);
  const random = (function(seed) {
    return () => ((seed = Math.imul(1664525, seed) + 1013904223 | 0) >>> 0) / 4294967296;
  })(8701);
  const rand = (a,b) => a + (b-a)*random();
  const clock = {value:0};
  const loader = new T.TextureLoader();
  const textures = {};
  await Promise.all(Object.entries(TEMPLE_TEXTURES).map(async ([key,source]) => {
    const map = await loader.loadAsync(source);
    map.wrapS = map.wrapT = T.RepeatWrapping;
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (key.endsWith('_color')) map.colorSpace = T.SRGBColorSpace;
    textures[key] = map;
  }));
  function material(name, color, roughness, strength) {
    return new T.MeshStandardMaterial({
      map:textures[name+'_color'], normalMap:textures[name+'_normal'],
      roughnessMap:textures[name+'_rough'], color, roughness,
      normalScale:new T.Vector2(strength,strength), envMapIntensity:.60
    });
  }
  const stone = material('masonry',0xa0aaa2,.81,1.15);
  const trim = material('rock',0x8b958d,.78,1.0);
  const cliff = material('rock',0x626e68,.95,1.45);
  const floor = material('floor',0x858c82,.50,1.2);
  const metal = new T.MeshStandardMaterial({color:0x412b1c,roughness:.55,metalness:.72});
  const vineMat = new T.MeshStandardMaterial({color:0x2e3020,roughness:.86});
  const leafMat = new T.MeshStandardMaterial({color:0x40532b,roughness:.57,side:T.DoubleSide,vertexColors:true});
  const paint = new T.MeshStandardMaterial({color:0xb68a51,roughness:.8,emissive:0x6a3716,emissiveIntensity:.32});
  const env = document.createElement('canvas');
  env.width=512;env.height=256;
  const ec=env.getContext('2d');
  const grad=ec.createLinearGradient(0,0,0,256);
  ['#60818d','#41606a','#233038','#171e1d','#111612'].forEach((color,i)=>grad.addColorStop(i/4,color));
  ec.fillStyle=grad;ec.fillRect(0,0,512,256);
  const skyLight=ec.createRadialGradient(280,78,0,280,78,88);
  skyLight.addColorStop(0,'#f0ffff');skyLight.addColorStop(1,'#91c7d600');
  ec.fillStyle=skyLight;ec.fillRect(0,0,512,256);
  const envTex=new T.CanvasTexture(env);envTex.colorSpace=T.SRGBColorSpace;envTex.mapping=T.EquirectangularReflectionMapping;
  const pmrem=new T.PMREMGenerator(renderer);
  scene.environment=pmrem.fromEquirectangular(envTex).texture;
  pmrem.dispose();envTex.dispose();

  scene.add(new T.HemisphereLight(0xa1c9df,0x42412b,1.67));
  const sun = new T.DirectionalLight(0xc0e2f4,2.65);
  sun.position.set(-24,31,20);sun.target.position.set(0,0,-65);
  sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-22,right:22,top:40,bottom:-48,near:1,far:145});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.12;sun.shadow.bias=-.00019;
  scene.add(sun,sun.target);

  const stamp = new T.Object3D();
  const groups = new Map();
  const breaches = [[29,32],[61,65],[105,108.4],[144,148]];
  const blocks = [
    {a:14,b:17,x:-2.2,w:2.1,h:2.8},
    {a:21,b:23,x:2.1,w:2.2,h:2.5},
    {a:48,b:50,x:0,w:3.55,h:1.13,crawl:true},
    {a:71,b:75,x:-1.55,w:3.6,h:3},
    {a:83,b:86,x:1.8,w:3.1,h:2.2},
    {a:94,b:96,x:0,w:3.55,h:1.13,crawl:true},
    {a:113,b:115,x:-1.9,w:2.8,h:3},
    {a:122,b:124,x:2.0,w:2.6,h:3},
    {a:134,b:137,x:0,w:3.55,h:1.13,crawl:true},
    {a:155,b:159,x:1.8,w:3.05,h:2.6}
  ];
  const routeHalf = () => 3.45;
  const finish=190;
  const zones = [[0,'沉井回廊'],[38,'暴雨中庭'],[78,'断柱祭廊'],[130,'泄洪石门']];
  function geoBox(dims) {
    const [w,h,d]=dims;
    const s=new T.Shape(), r=Math.min(.115,w*.12,h*.12,d*.14);
    for(const [i,x,y] of [[0,-w/2+r,-h/2+r],[1,w/2-r,-h/2+r],[2,w/2-r,h/2-r],[3,-w/2+r,h/2-r]]) {
      if(i===0)s.moveTo(x,y);else s.lineTo(x,y);
    }
    s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,curveSegments:1});
    g.translate(0,0,-(d-2*r)/2);
    const uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/2.8,uv.getY(i)/2.8);
    return g;
  }
  const kinds = {};
  function kind(name, geometry, mat, cast=true) { kinds[name]={geometry,mat,cast}; }
  kind('tile',geoBox([2.3,.42,2.8]),floor);
  kind('wall',geoBox([1.14,1.10,3.1]),stone);
  kind('roof',geoBox([2.64,.73,3.18]),stone);
  kind('base',geoBox([1.4,.39,1.40]),trim);
  kind('column',geoBox([.88,2.6,.91]),trim);
  kind('cap',geoBox([1.25,.42,1.25]),trim);
  kind('beam',geoBox([8.5,.62,1.05]),trim);
  function fracturedRock(){
    const geometry=new T.IcosahedronGeometry(1,2);
    const vertices=geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);
      const shape=1+.14*Math.sin(4*x+3*y)*Math.cos(4*z-1.3*y)+.14*Math.sin(3*z+4*y)+.09*Math.sin(8*x+4*z);
      vertices.setXYZ(i,x*shape,Math.max(-.72,y*shape),z*shape);
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  kind('rock',fracturedRock(),cliff);
  kind('spall',geoBox([1.14,.28,1.57]),trim);
  kind('backing',new T.BoxGeometry(.40,6.0,6.6),stone);
  kind('chip',new T.IcosahedronGeometry(1,0),trim);
  kind('cut',geoBox([.23,1.1,.13]),trim);
  kind('mark',new T.BoxGeometry(.047,.54,.055),paint,false);
  kind('rod',new T.CylinderGeometry(.045,.074,1,7),metal,false);
  kind('bowl',new T.CylinderGeometry(.22,.093,.15,10),metal,false);
  function add(name,x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0,tone=1) {
    const list=groups.get(name)||[];
    list.push([x,y,z,sx,sy,sz,ry,rx,rz,tone]);
    groups.set(name,list);
  }
  function piece(name,x,y,d,...args){add(name,x,y,-d,...args);}
  function bridgeSection(a,b) {
    for(let d=a;d<b-.01;d+=2.80){
      const len=Math.min(2.80,b-d);
      for(let i=-1;i<=1;i++){
        piece('tile',i*2.30,-.22+rand(-.035,.012),d+len/2,
          rand(.985,1.005),1,len/2.8*.996,rand(-.012,.012),rand(-.012,.012),rand(-.012,.012),rand(.62,1.21));
      }
    }
  }
  let prev=-16;
  for(const [a,b] of breaches){
    bridgeSection(prev,a);
    for(const side of [-1,1]){
      for(let i=0;i<8;i++){
        piece('chip',side*rand(2.75,3.35),rand(-.42,-.01),rand(a-.22,a+.28),rand(.16,.34),.13,rand(.14,.42),rand(0,7));
      }
    }
    prev=b;
  }
  bridgeSection(prev,190);
  const closed=d=>d<36||d>77&&d<128||d>164;
  for(let d=-16;d<185;d+=3.11){
    for(const sign of [-1,1]){
      for(let row=0;row<(closed(d)?6:1);row++){
        piece('wall',sign*(3.99+rand(0,.15)),.50+row*1.085,d+row%2*.54,1,1,rand(.97,1.034),rand(-.035,.035),0,0,rand(.56,1.16));
      }
      if(!closed(d)){
        piece('rock',sign*rand(10,15),rand(2,8),d,rand(3,7),rand(8,19),rand(3.8,6.5),rand(0,7),rand(-.35,.35),rand(-.34,.34),rand(.62,1.02));
        piece('rock',sign*rand(6,10),rand(-5,-1),d,rand(2,4),rand(4,10),rand(3,7),rand(0,7));
      }
    }
    if(closed(d))for(let i=-1;i<=1;i++)piece('roof',i*2.55,5.52,d,1,1,1,rand(-.028,.028),0,0,rand(.55,1.12));
  }
  for(let d=-15;d<185;d+=6.5){
    if(!closed(d))continue;
    for(const side of [-1,1])piece('backing',side*4.63,2.64,d,1,1,1,0,0,0,.45);
  }
  for(const d of [3,12,26,38,47,54,69,85,99,117,132,151,165,172]){
    for(const side of [-1,1]){
      piece('spall',side*3.34,.23,d,1.01,1.1,1.07,side*.25,0,side*.11,.79);
      piece('spall',side*3.19,.18,d+.88,.47,.88,.52,side*.8,.09,0,.69);
    }
  }
  for(let i=-1;i<=1;i++)for(let row=0;row<5;row++)piece('wall',i*2.53,.61+row*1.09,-16,2.23,1,.33,0,0,0,.51);
  function portal(d,full=true){
    for(const s of [-1,1]){
      piece('base',s*3.1,.20,d,1.18,1,1.25);
      piece('base',s*3.1,.52,d,1.05,.53,1.07);
      piece('column',s*3.1,1.92,d,1.12,1.04,1.04,rand(-.037,.037),0,0,rand(.72,1.1));
      piece('column',s*3.1,3.93,d,.99,.53,1.02,rand(-.044,.044));
      piece('cap',s*3.1,3.28,d,1,.7,1.04);
      piece('cap',s*3.1,4.64,d,1.22,1,1.20);
      for(let i=0;i<4;i++){
        const z=d-.505,x=s*3.1+(i-1.5)*.19;
        piece('cut',x,3.98,z,.50,.94,.65);
      }
      for(let i=0;i<3;i++){
        piece('mark',s*3.1+(i-1)*.16,1.56,d-.488,1,1,.65,0,0,(i-1)*.52);
      }
    }
    if(full){
      piece('beam',0,5.11,d,1,1,1);
      piece('beam',0,5.50,d,1.06,.30,1.15);
      for(let i=-6;i<=6;i++)piece('cut',i*.53,5.08,d-.56,1.47,.36,.8,0,0,i%2*.22);
    }
  }
  for(const d of [-10.3,-4.2,1.3,8.1,19,26,34,40,52,67,78,90,100,110,118,128,139,150,162,171,178])portal(d,![52,67,139,150].includes(d));
  for(const block of blocks) {
    const d=(block.a+block.b)/2,size=block.b-block.a;
    if(block.crawl){
      piece('beam',0,1.56,d,.85,1.37,size/.95,0,.023,.055,.78);
      piece('beam',0,2.07,d,.72,.49,size/.96,0,-.075,-.08,.65);
      for(const s of [-1,1])piece('rock',s*3.23,.88,d,.73,1.0,size*.62,rand(0,7));
      for(let j=-5;j<=5;j++)piece('mark',j*.46,1.57,block.a-.14,1.5,.50,1,0,0,.66);
    } else {
      for(let j=0;j<10;j++)piece('rock',block.x+rand(-.27,.27)*block.w,rand(.37,block.h-.51),d+rand(-.39,.39)*size,rand(.45,.72),rand(.40,.70),rand(.52,.79),rand(0,7),rand(-.35,.35),rand(-.3,.3));
      piece('column',block.x,.8,d,1.25,block.w/2.6,1.16,.24,.8,1.36,.76);
    }
  }
  for(let i=0;i<690;i++){
    const d=rand(-4,175), x=rand(-3.42,3.42);
    if(breaches.some(([a,b])=>d>a-.15&&d<b+.15))continue;
    const s=rand(.026,.2)*(Math.abs(x)>2.4?1.5:1);
    piece('chip',x,s*.32,d,s,rand(.33,.78)*s,s*rand(.7,1.8),rand(0,7),rand(0,1.6),rand(0,1.6),rand(.47,1.15));
  }
  for(let i=0;i<30;i++)piece('rock',(i%2===0?-1:1)*rand(13,20),rand(1,16),rand(180,195),rand(2,6),rand(4,12),rand(2,5),rand(0,7));
  const leafPos=[],leafColors=[];
  function leaf(a,b,width){
    const normal=new T.Vector3(0,1,0);
    const direction=b.clone().sub(a);
    const cross=normal.clone().cross(direction).normalize().multiplyScalar(width);
    const mid=a.clone().lerp(b,.43);
    const vein=mid.clone().add(new T.Vector3(0,width*.38,0));
    const left=mid.clone().add(cross),right=mid.clone().sub(cross);
    for(const [points,shade] of [[[a,left,vein,b,vein,left],rand(.65,1.19)],[[a,vein,right,b,right,vein],rand(.38,.84)]]){
      for(const v of points){leafPos.push(v.x,v.y,v.z);leafColors.push(shade*.85,shade,shade*.66);}
    }
  }
  const roots=[];
  for(let i=0;i<136;i++){
    const d=rand(1,174), sign=random()<.5?-1:1;
    if(i<76){
      const top=rand(2.2,5.9), drop=rand(.75,3.1);
      const baseX=sign*rand(3.21,3.99),pts=[];
      for(let j=0;j<8;j++){
        const dx=Math.sin(j*.76+i)*.16;
        const p=new T.Vector3(baseX+dx,top-(j/7)*drop,-d+Math.sin(j*.4+i)*.26);
        pts.push(p);
        if(random()>.36)leaf(p,p.clone().add(new T.Vector3(rand(-.28,.28),rand(-.23,-.06),rand(-.32,.32))),rand(.038,.092));
      }
      roots.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),12,rand(.014,.043),4,false));
    }else{
      if(breaches.some(([a,b])=>d>a&&d<b))continue;
      const p=new T.Vector3(sign*rand(2.84,3.48),.035,-d);
      for(let j=0;j<9;j++){
        const angle=rand(0,6.3),length=rand(.24,.70),rise=rand(.12,.65);
        const end=p.clone().add(new T.Vector3(Math.cos(angle)*length,rise,Math.sin(angle)*length));
        leaf(p,end,rand(.075,.15)); 
        for(let k=2;k<5;k++){
          const v=p.clone().lerp(end,k/5);
          leaf(v,v.clone().add(new T.Vector3(Math.sin(angle)*.24,.09,-Math.cos(angle)*.18)),.048);
          leaf(v,v.clone().add(new T.Vector3(-Math.sin(angle)*.23,.07,Math.cos(angle)*.19)),.055);
        }
      }
    }
  }
  for(const depth of [2.1,6.6,17.4,33,40,68,79,101,127,151,169]){
    for(let i=0;i<5;i++){
      const x=rand(-3.35,3.35), low=rand(3.3,4.65),pts=[];
      for(let j=0;j<9;j++){
        const p=new T.Vector3(x+Math.sin(j*.67+i)*.16,5.6-(5.6-low)*j/8,-depth+Math.sin(j*.64+i)*.22);
        pts.push(p);
        if(j>1)leaf(p,p.clone().add(new T.Vector3(rand(-.31,.31),rand(-.22,-.08),rand(-.22,.22))),rand(.028,.069));
      }
      roots.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts),12,rand(.011,.028),5,false));
    }
  }
  const rootPositions=[],rootNormals=[];
  for(const mesh of roots){
    const g=mesh.toNonIndexed();
    rootPositions.push(...g.attributes.position.array);
    rootNormals.push(...g.attributes.normal.array);
    mesh.dispose();g.dispose();
  }
  const rootGeometry=new T.BufferGeometry();
  rootGeometry.setAttribute('position',new T.Float32BufferAttribute(rootPositions,3));
  rootGeometry.setAttribute('normal',new T.Float32BufferAttribute(rootNormals,3));
  scene.add(new T.Mesh(rootGeometry,vineMat));
  const foliage=new T.BufferGeometry();
  foliage.setAttribute('position',new T.Float32BufferAttribute(leafPos,3));
  foliage.setAttribute('color',new T.Float32BufferAttribute(leafColors,3));
  foliage.computeVertexNormals();
  scene.add(new T.Mesh(foliage,leafMat));

  const fogTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(64,64,1,64,64,64);g.addColorStop(0,'rgba(220,237,240,.83)');g.addColorStop(.42,'rgba(195,223,229,.42)');g.addColorStop(1,'rgba(190,219,226,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new T.CanvasTexture(c)})();
  const mist=[];
  function vapor(x,y,d,w,h,opacity,color=0xc9e0dd){
    const m=new T.SpriteMaterial({map:fogTexture,color,transparent:true,opacity,depthWrite:false});
    const s=new T.Sprite(m);s.position.set(x,y,-d);s.scale.set(w,h,1);scene.add(s);
    mist.push({s,x,y,z:-d,opacity,phase:rand(0,9)});
  }
  const flowVert='varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
  for(const d of [10,20,32,46,54,70,90,109,130,141,153,174])vapor(rand(-1.8,1.8),.43,d,rand(6,9),rand(1.4,2.9),rand(.075,.19));
  const waterLights=[];
  const falls=new T.ShaderMaterial({
    uniforms:{t:clock},vertexShader:flowVert,transparent:true,depthWrite:false,side:T.DoubleSide,
    fragmentShader:'varying vec2 v; uniform float t; float h(float x){return fract(sin(x*127.1)*43758.5);} void main(){vec2 p=v; float u=p.x*139.; float y=p.y*38.+t*15.; float a=h(floor(u)+floor(y)*31.); float b=h(floor(u)+(floor(y)+1.)*31.); float n=mix(a,b,smoothstep(0.,1.,fract(y))); float r=pow(n,2.)*.55+pow(h(floor(u)),3.)*.4; float edge=smoothstep(0.,.12,p.x)*smoothstep(1.,.85,p.x); gl_FragColor=vec4(mix(vec3(.29,.45,.48),vec3(.83,.96,.99),r),edge*(.32+.59*r)*smoothstep(0.,.18,p.y));}'
  });
  for(const [side,d,w,h] of [[-1,43,7,17],[1,57,5,15],[-1,73,6,15],[1,140,5.5,17],[-1,154,7,20],[-1,182,8,16]]){
    const m=new T.Mesh(new T.PlaneGeometry(w,h),falls);
    m.position.set(side*8.8,h/2-2,-d);
    m.rotation.y=side===0?0:side*1.16;
    scene.add(m);
    for(let j=0;j<4;j++)vapor(side*rand(5,8),rand(-.45,1.15),d+rand(-3,3),rand(6,11),rand(1.4,3.7),rand(.11,.28));
    waterLights.push({d:d-1.2,x:side*4.8});
  }
  const beamMat=new T.ShaderMaterial({
    vertexShader:flowVert,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    fragmentShader:'varying vec2 v; void main(){float b=pow(sin(v.x*3.14159),4.)*smoothstep(0.,.52,v.y)*smoothstep(1.,.77,v.y);gl_FragColor=vec4(.47,.66,.71,b*.15);}'
  });
  for(const d of [7,38,52,70,80,130,150,169,178]){
    for(let i=0;i<3;i++){
      const s=new T.Mesh(new T.PlaneGeometry(rand(.9,2.5),rand(7,12)),beamMat);
      s.position.set(-1.2+i*.8,4.2,-d+i*.9);s.rotation.z=rand(-.45,-.30);s.rotation.y=rand(-.5,.5);scene.add(s);
    }
  }
  for(const [a,b] of breaches){
    const bottom=new T.Mesh(new T.PlaneGeometry(8,b-a+1),new T.MeshStandardMaterial({color:0x101d21,roughness:.32,metalness:.44}));
    bottom.rotation.x=-Math.PI/2;bottom.position.set(0,-5.2,-(a+b)/2);scene.add(bottom);
    vapor(0,-2.6,(a+b)/2,8,2,.41);
  }

  const puddle=new T.ShaderMaterial({
    uniforms:{t:clock},vertexShader:flowVert,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,
    fragmentShader:'varying vec2 v; uniform float t; void main(){vec2 p=(v-.5)*2.; float l=length(p)+.11*sin(p.x*11.+p.y*17.)+.05*sin(p.x*32.-p.y*37.);float k=(1.-smoothstep(.53,1.,l));float a=sin(length(p+vec2(.22,-.19))*30.-t*3.);float b=sin(p.y*45.+p.x*10.+t*2.);float ir=.35+.065*a+.065*b;float n=pow(max(0.,sin(p.x*5.+p.y*2.+a*.06)),8.);gl_FragColor=vec4(mix(vec3(.06,.089,.085),vec3(.36,.52,.55),ir+n*.52),k*.40);}'
  });
  for(let d=2;d<174;d+=2.7){
    if(breaches.some(([a,b])=>d>a-1.4&&d<b+1.4))continue;
    const m=new T.Mesh(new T.PlaneGeometry(rand(.75,2.25),rand(1,3.0)),puddle);
    m.rotation.x=-Math.PI/2;m.position.set(rand(-2.2,2.2),.031,-d);scene.add(m);
  }
  const flameMat=new T.ShaderMaterial({
    uniforms:{t:clock},vertexShader:flowVert,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    fragmentShader:'varying vec2 v;uniform float t;void main(){float y=v.y;float x=(v.x-.5)+sin(t*11.+y*12.)*.07*y+sin(t*6.-y*17.)*.07*y;float w=(1.-y)*(.27+sin(y*18.-t*13.)*.078);float b=1.-smoothstep(w*.10,w,abs(x));float tip=smoothstep(0.,.10,y)*smoothstep(1.,.52+sin(t*8.)*.14,y);vec3 c=mix(vec3(1.,.16,.014),vec3(1.,.88,.48),pow(1.-y,2.2)*b);gl_FragColor=vec4(c,b*tip*.98);}'
  });
  const fire=[];
  for(const [i,d] of [-13.8,-7.2,4.4,11.6,20,26.4,33.4,41,53,58.6,66,77,87,100,109.4,119,130,142.4,149,161,173].entries()){
    const x=i%2===0?2.9:-2.9;
    piece('rod',x,1.70,d,1,.74,1,0,0,x>0?.28:-.28);
    piece('bowl',x,2.05,d);
    const flame=new T.Group();
    for(const a of [0,Math.PI/2]){const m=new T.Mesh(new T.PlaneGeometry(.59,.79),flameMat);m.rotation.y=a;flame.add(m);}
    flame.position.set(x,2.42,-d);scene.add(flame);
    const halo=new T.Sprite(new T.SpriteMaterial({map:fogTexture,color:0xff8d35,opacity:.26,depthWrite:false,blending:T.AdditiveBlending}));
    halo.position.set(x,2.39,-d);halo.scale.set(1.65,1.65,1);scene.add(halo);
    fire.push({x,halo,d});
  }
  waterLights.push({d:180,x:0});
  const makeLights=(count,color,distance)=>Array.from({length:count},()=>{
    const light=new T.PointLight(color,0,distance,2);scene.add(light);return light;
  });
  const torchPool=makeLights(4,0xff9f64,15);
  const waterPool=makeLights(2,0xb9e9f7,27);

  const rainCount=1100, rainPos=new Float32Array(rainCount*6), drops=[];
  const rainGeo=new T.BufferGeometry();
  rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3).setUsage(T.DynamicDrawUsage));
  const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xc9ebf3,transparent:true,opacity:.22,depthWrite:false}));
  rain.frustumCulled=false;scene.add(rain);
  for(let i=0;i<rainCount;i++) drops.push([rand(-12,12),rand(0,12),rand(-18,18),rand(.11,.43),rand(8,18)]);
  const emberCount=168,emberPos=new Float32Array(emberCount*3),embers=[];
  const eg=new T.BufferGeometry();
  eg.setAttribute('position',new T.BufferAttribute(emberPos,3).setUsage(T.DynamicDrawUsage));
  const sparks=new T.Points(eg,new T.PointsMaterial({map:fogTexture,size:.085,color:0xffa057,transparent:true,opacity:.76,depthWrite:false,blending:T.AdditiveBlending}));
  sparks.frustumCulled=false;scene.add(sparks);
  for(let i=0;i<emberCount;i++)embers.push([i%fire.length,rand(0,1),rand(0,9),rand(.23,.75)]);
  const grit=new T.Group();
  for(let i=0;i<54;i++){
    const m=new T.Mesh(kinds.chip.geometry,trim);
    m.scale.setScalar(rand(.055,.37));m.userData={x:rand(-4,4),y:rand(0,6),z:rand(-3,4),spin:rand(1,4)};
    grit.add(m);
  }
  scene.add(grit);
  const dustMat=new T.SpriteMaterial({map:fogTexture,color:0x8b7863,opacity:.43,depthWrite:false});
  const dust=new T.Sprite(dustMat);dust.scale.set(12,7,1);scene.add(dust);

  for(const [name,list] of groups){
    const k=kinds[name],mesh=new T.InstancedMesh(k.geometry,k.mat,list.length);
    const color=new T.Color();
    list.forEach(([x,y,z,sx,sy,sz,ry,rx,rz,tone],i)=>{
      stamp.position.set(x,y,z);stamp.scale.set(sx,sy,sz);stamp.rotation.set(rx,ry,rz);stamp.updateMatrix();
      mesh.setMatrixAt(i,stamp.matrix);mesh.setColorAt(i,color.setRGB(tone,tone,tone));
    });
    mesh.castShadow=k.cast;mesh.receiveShadow=true;
    scene.add(mesh);
  }

  function animate(t,d,collapse,quality,position){
    const outside=position&&d>=190;
    clock.value=t;
    const outdoor=!closed(d);
    const active=quality==='low'?420:outdoor?rainCount:580;
    rainGeo.setDrawRange(0,active*2);
    for(let i=0;i<active;i++){
      const [x,phase,z,len,vel]=drops[i],j=i*6, dropD=d-z;
      const y=(phase-t*vel%12+12)%12;
      const underground=!outside&&closed(dropD);
      const rx=x+(y-6)*.103+(outside?position.x:0);
      const worldZ=outside?position.z+z:-dropD;
      rainPos.set([rx,underground?y*.52:y,worldZ,rx+len*.10,(underground?y*.52:y)+len*(underground?.58:1),worldZ],j);
      if(underground&&(i%9!==0||Math.abs(rx)>3.2))rainPos[j+1]=rainPos[j+4]=-20;
    }
    rainGeo.attributes.position.needsUpdate=true;
    const nearest=list=>list.slice().sort((a,b)=>Math.abs(a.d-d)-Math.abs(b.d-d));
    for(const [i,entry] of fire.entries()){
      entry.wave=1+.17*Math.sin(t*14+i)+.10*Math.sin(t*26.6+i*8);
      entry.halo.material.opacity=.24*entry.wave;
    }
    nearest(fire).slice(0,torchPool.length).forEach((entry,i)=>{
      const light=torchPool[i];light.position.set(entry.x*.92,2.45,-entry.d-.13);light.intensity=82*entry.wave;
    });
    nearest(waterLights).slice(0,waterPool.length).forEach((entry,i)=>{
      const light=waterPool[i];light.position.set(entry.x,5.2,-entry.d);light.intensity=entry.d>177?470:262;
    });
    for(let i=0;i<emberCount;i++){
      const [j,phase,w,v]=embers[i], f=fire[j];
      const life=(t*v+phase)%1;
      emberPos.set([f.x+Math.sin(t*3+w)*.36*life,2.13+life*1.52,-f.d+Math.cos(t*2+w)*.26*life],i*3);
    }
    eg.attributes.position.needsUpdate=true;
    for(const m of mist){m.s.position.x=m.x+Math.sin(t*.55+m.phase)*1.12;m.s.position.y=m.y+Math.cos(t*.41+m.phase)*.22;m.s.material.opacity=m.opacity*(.83+.17*Math.sin(t*.8+m.phase));}
    grit.visible=Number.isFinite(collapse);
    dust.visible=grit.visible;
    if(grit.visible){
      dust.position.set(0,2.1,-collapse+1);
      for(const m of grit.children){
        const {x,y,z,spin}=m.userData;
        m.position.set(x,((y-t*spin)%6+6)%6,-collapse+z);
        m.rotation.set(t*spin,t*2.2,t*.8);
      }
    }
  }
  return {scene,animate,breaches,blocks,routeHalf,finish,zones,sun,textures};
};