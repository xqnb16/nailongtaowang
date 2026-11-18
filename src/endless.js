/* Endless rainforest, collectible coins and the pursuer */
window.makeExpedition = (world) => {
  const T=THREE,scene=world.scene, exit=190, forward=0;
  const textures=world.textures;
  const material=(name,color,roughness)=>new T.MeshStandardMaterial({
    map:textures[name+'_color'],normalMap:textures[name+'_normal'],roughnessMap:textures[name+'_rough'],roughness,color
  });
  const stone=material('floor',0x9aab83,.56);
  const soil=material('rock',0x728350,.85);
  const bark=material('rock',0x57513b,.9);
  const leafCard=(()=>{
    const image=document.createElement('canvas');image.width=image.height=256;
    const ctx=image.getContext('2d');
    let key=721;
    const next=()=>((key=Math.imul(1664525,key)+1013904223|0)>>>0)/4294967296;
    const blade=(x,y,length,width,angle,light)=>{
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);
      const gradient=ctx.createLinearGradient(-width,0,width,0);
      gradient.addColorStop(0,'#101d0a');gradient.addColorStop(.44,light?'#506728':'#283c1a');
      gradient.addColorStop(.52,light?'#828f43':'#495730');gradient.addColorStop(1,light?'#344719':'#142516');
      ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(0,0);
      ctx.bezierCurveTo(-width,-length*.20,-width*1.09,-length*.62,0,-length);
      ctx.bezierCurveTo(width*.94,-length*.69,width,-length*.29,0,0);ctx.fill();
      ctx.strokeStyle='rgba(182,187,99,.31)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-length*.96);ctx.stroke();
      ctx.restore();
    };
    for(let i=0;i<210;i++){
      const a=next()*6.28, d=Math.sqrt(next())*94;
      blade(128+Math.sin(a)*d,128+Math.cos(a)*d,12+next()*30,3+next()*8,a+next()*1.3,next()>.62);
    }
    const tex=new T.CanvasTexture(image);tex.colorSpace=T.SRGBColorSpace;
    tex.anisotropy=4;
    return new T.MeshStandardMaterial({map:tex,alphaTest:.45,side:T.DoubleSide,roughness:.83,vertexColors:false});
  })();
  const frondCard=(()=>{
    const image=document.createElement('canvas');image.width=128;image.height=256;
    const ctx=image.getContext('2d');
    ctx.strokeStyle='#727a3d';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(64,254);ctx.quadraticCurveTo(56,125,70,9);ctx.stroke();
    for(let j=0;j<25;j++){
      const h=j/25,y=244-h*229,m=62+Math.sin(h*3.2)*-4+h*7;
      const width=8+Math.sin(Math.PI*h)*49;
      for(const side of [-1,1]){
        const g=ctx.createLinearGradient(m,y,m+side*width,y-17);
        g.addColorStop(0,'#839754');g.addColorStop(.35,'#405b2c');g.addColorStop(1,'#253b1d');ctx.fillStyle=g;
        ctx.beginPath();ctx.moveTo(m,y+1);ctx.quadraticCurveTo(m+side*width*.61,y-18,m+side*width,y-22);
        ctx.quadraticCurveTo(m+side*width*.75,y-10,m,y+4);ctx.fill();
      }
    }
    const tex=new T.CanvasTexture(image);tex.colorSpace=T.SRGBColorSpace;
    return new T.MeshStandardMaterial({map:tex,alphaTest:.47,side:T.DoubleSide,roughness:.65});
  })();
  const foliagePlane=new T.PlaneGeometry(2,2);
  const fernPlane=new T.PlaneGeometry(1,1);
  fernPlane.translate(0,.5,0);
  const hints=new T.MeshStandardMaterial({color:0xf3b863,emissive:0xb97424,emissiveIntensity:.5});
  const gold=new T.MeshStandardMaterial({color:0xffbb35,metalness:.69,roughness:.23,emissive:0xa64c04,emissiveIntensity:.52,envMapIntensity:1.9});
  const inlay=new T.MeshStandardMaterial({color:0xffe185,metalness:.52,roughness:.28,emissive:0x9b5609,emissiveIntensity:.25});
  const water=new T.MeshPhysicalMaterial({color:0x456a5e,roughness:.23,metalness:.31,clearcoat:1,transparent:true,opacity:.87,normalMap:textures.rock_normal,normalScale:new T.Vector2(.19,.15)});
  const rock=new T.IcosahedronGeometry(1,1);
  const slab=new T.BoxGeometry(2.24,.28,2.2);
  const cube=new T.BoxGeometry(1,1,1);
  const cylinder=new T.CylinderGeometry(.57,1,1,9);
  const branch=new T.CylinderGeometry(.61,1,1,7);
  const coinGeo=new T.CylinderGeometry(.22,.22,.067,20);
  coinGeo.rotateX(Math.PI/2);
  const ringGeo=new T.TorusGeometry(.176,.013,6,24);
  const jewelGeo=new T.OctahedronGeometry(.125);
  const scratch=new T.Object3D();
  const right=h=>[Math.cos(h),-Math.sin(h)];
  const along=h=>[-Math.sin(h),-Math.cos(h)];
  let legs=[],active=0,coins=[],seed=71;
  const random=()=>((seed=Math.imul(1664525,seed)+1013904223|0)>>>0)/4294967296;
  const r=(a,b)=>a+(b-a)*random();
  function coin(owner,x,y,z,d,lane){
    const g=new T.Group();
    g.add(new T.Mesh(coinGeo,gold),new T.Mesh(ringGeo,inlay));
    g.children[1].position.z=.039;
    const sign=new T.Mesh(jewelGeo,inlay);sign.scale.set(.66,1,.21);sign.position.z=.036;g.add(sign);
    g.position.set(x,y,z);owner.add(g);
    coins.push({g,y,d,lane});
  }
  function batch(owner,geometry,mat,data){
    if(!data.length)return;
    const mesh=new T.InstancedMesh(geometry,mat,data.length);
    const color=new T.Color();
    for(let i=0;i<data.length;i++){
      const [x,y,z,sx,sy,sz,ry=0,rx=0,rz=0,tone=1]=data[i];
      scratch.position.set(x,y,z);scratch.scale.set(sx,sy,sz);scratch.rotation.set(rx,ry,rz);scratch.updateMatrix();
      mesh.setMatrixAt(i,scratch.matrix);mesh.setColorAt(i,color.setRGB(tone,tone,tone));
    }
    mesh.receiveShadow=true;mesh.computeBoundingSphere();owner.add(mesh);
  }
  const biomes=['雨林石道','雾谷栈桥','洪水浅滩','榕根废墟'];
  function grow(leg){
    const group=new T.Group();leg.group=group;group.position.set(leg.x,0,leg.z);group.rotation.y=leg.h;scene.add(group);
    const pavers=[],rocks=[],trunks=[],crowns=[],fronds=[],markers=[],planks=[],brush=[],background=[];
    const variant=leg.i%biomes.length;
    const landscape=new T.Mesh(cube,soil);
    landscape.scale.set(115,.4,120);landscape.position.set(0,-4.8,-leg.len*.5);group.add(landscape);
    const len=leg.len;
    const forestFloor=new T.Mesh(cube,variant===1||variant===2?water:soil);
    forestFloor.scale.set(44,.35,len+12);forestFloor.position.set(0,variant===1?-3.6:-.88,-len/2);group.add(forestFloor);
    if(leg.hole&&variant!==1){
      const stream=new T.Mesh(cube,water);stream.scale.set(15,.10,leg.hole[1]-leg.hole[0]+.6);stream.position.set(0,-.47,-(leg.hole[0]+leg.hole[1])/2);group.add(stream);
    }
    for(let d=0;d<len;d+=2.2){
      const length=Math.min(2.2,len-d), mid=d+length/2;
      if(leg.hole&&d>=leg.hole[0]-.01&&d<leg.hole[1]-.01)continue;
      for(const x of [-2.24,0,2.24]){
        if(variant===1)planks.push([x,-.14,-mid,2.23,.28,length-.038,0,0,r(-.02,.02),r(.53,1.1)]);
        else pavers.push([x,-.14+r(-.044,.008),-mid,.99,1,length/2.20*.986,r(-.02,.02),0,0,r(.59,1.24)]);
      }
    }
    for(let d=.5;d<len;d+=1.8){
      for(const s of [-1,1]){
        const edge=s*r(3.36,4.35);
        rocks.push([edge,-.25,-d,r(.36,.78),r(.28,.68),r(.34,.95),r(0,6),r(0,.4),r(0,.4),r(.61,1.14)]);
        if(d<len-4.4&&random()<.72){
          const px=s*r(4.0,13), z=-d+r(-2,2), h=r(7.5,19), width=r(.33,.92);
          trunks.push([px,h/2-.5,z,width,h,width,r(0,6),r(-.15,.15),r(-.14,.14),r(.52,1.05)]);
          for(let j=0;j<4;j++){
            const a=r(0,6.28),reach=r(.6,2.8);
            trunks.push([px+Math.cos(a)*reach*.44,.19,z+Math.sin(a)*reach*.44,width*.64,reach,width*.55,-a,1.15,0,r(.55,1.15)]);
            const ax=px+r(-2.6,2.6),ay=h+r(-1.8,1.8),az=z+r(-2.6,2.6);
            for(let k=0;k<3;k++)crowns.push([ax,ay,az,r(2.9,5.3),r(2.4,4.7),1,r(0,6),r(.3,2.45),r(-.8,.8),r(.58,1.17)]);
            trunks.push([px+(ax-px)*.56,h*.75,z+(az-z)*.46,width*.36,h*.54,width*.36,r(0,6),r(-.76,.76),r(-.76,.76),.8]);
          }
        }
        for(let clump=0;d<len-4.4&&clump<2;clump++){
          const x=s*r(3.08,7), z=-d+r(-.65,.65);
          for(let j=0;j<7;j++){
            const size=r(.47,1.69);
            fronds.push([x,r(-.12,.25),z,size*.84,size*1.11,1,r(0,6.28),r(.32,1.19),r(-.25,.25),r(.6,1.40)]);
          }
        }
      }
    }
    for(let i=0;i<52;i++){
      const s=i%2===0?-1:1,x=s*r(9,39),d=r(0,len+7),h=r(7.5,20),w=r(.18,.56);
      background.push([x,h/2-2.1,-d,w,h,w,r(0,6),r(-.13,.13),r(-.20,.20),r(.58,.97)]);
      crowns.push([x,h-1,-d,r(2.5,4.5),r(2.0,4.3),1,r(0,6),r(.39,2.7),r(-.5,.5)]);
      if(i%4===1)rocks.push([x,-1.8,-d,r(3,7),r(2.5,7),r(2.2,6),r(0,6),r(-.6,.6),r(-.6,.6),r(.61,.98)]);
      for(let j=0;j<2;j++)brush.push([x,r(0,3.5),-d,r(1.6,4.4),r(1.1,3.2),1,r(0,6),r(.1,1.9),r(-.5,.5)]);
    }
    if(leg.block){
      const b=leg.block, mid=(b.a+b.b)/2;
      if(b.crawl){
        const m=new T.Mesh(branch,bark);
        m.scale.set(.51,7.4,.54);m.rotation.z=Math.PI/2;m.position.set(0,1.52,-mid);group.add(m);
        for(let i=-5;i<=5;i++)markers.push([i*.44,1.50,-b.a+.03,.08,.25,.069,0,0,.57]);
      }else{
        for(let i=0;i<8;i++)rocks.push([b.x+r(-.68,.68),r(.21,.89),-mid+r(-.57,.57),r(.45,.8),r(.39,.95),r(.48,.85),r(0,6)]);
      }
    }
    // The junction platform connects the full width of the incoming and outgoing trails.
    const pad=leg.turn==='both'?8.9:7.1;
    pavers.push([0,-.15,-len,pad/2.24,1,pad/2.2]);
    const directions=leg.turn==='both'?[-1,1]:[leg.turn];
    for(const s of directions){
      for(let k=0;k<2;k++)pavers.push([-s*(5.3+k*2.2),-.18,-len,1.01,1,pad*.68/2.2]);
      for(let j=0;j<6;j++){
        const x=-s*(.57+j*.36);
        markers.push([x,.04,-len+.8,.24,.045,.065,0,0,0]);
        if(j>=3){
          markers.push([x,.04,-len+.8+(5-j)*.20,.26,.046,.065,s*.57]);
          markers.push([x,.04,-len+.8-(5-j)*.20,.26,.046,.065,-s*.57]);
        }
      }
    }
    rocks.push([0,1.15,-len-5.15,2.75,1.78,1.4,r(-.3,.3)]);
    rocks.push([-2.9,.69,-len-4.4,1.2,1.1,1.24,r(0,6)]);
    rocks.push([2.9,.69,-len-4.4,1.2,1.1,1.24,r(0,6)]);
    batch(group,slab,stone,pavers);batch(group,cube,bark,planks);batch(group,rock,soil,rocks);
    batch(group,cylinder,bark,trunks.concat(background));batch(group,foliagePlane,leafCard,crowns.concat(brush));batch(group,fernPlane,frondCard,fronds);batch(group,cube,hints,markers);

    const lane=leg.block&&!leg.block.crawl?-Math.sign(leg.block.x)*1.63:[0,-1.76,1.76][leg.i%3];
    for(let d=6;d<len-3;d+=2.62){
      const hole=leg.hole&&d>=leg.hole[0]-.6&&d<=leg.hole[1]+.3;
      const over=leg.block?.crawl&&d>leg.block.a-.8&&d<leg.block.b+.6;
      coin(group,lane,hole?1.33:over?.50:.92,-d,leg.start+d,lane);
    }
  }
  function newLeg(x,z,h,start,i,entryTurn=0){
    const straight=i%2===0, len=straight?48.4+(i%6)*2.2:33.0;
    const leg={x,z,h,start,i,len,turn:straight?'both':-entryTurn,zone:biomes[i%biomes.length],
      hole:i%3!==2?[17.6,22]:null,
      block:i%3===2?{a:15,b:17.3,x:0,crawl:true,w:3.6}:i%3===0?{a:30,b:32,x:i%4===0?-1.66:1.66,w:1.25}:null};
    legs.push(leg);grow(leg);return leg;
  }
  function retire(leg){
    leg.group.traverse(obj=>{if(obj.isInstancedMesh)obj.dispose();});
    scene.remove(leg.group);
  }
  function reset(){
    for(const leg of legs)retire(leg);
    for(const c of coins)c.g.removeFromParent();
    seed=71;legs=[];coins=[];active=0;
    newLeg(0,-exit,forward,exit,0);
    const lines=[[4,0],[12,1.37],[20,-1.35],[27.4,0],[34,0],[40,0],[48.1,0],[54,-1.2],[67,0],[74,1.7],[80,0],[88,-1.4],[94.2,0],[102,0],[111,0],[120,0],[128,0],[135.3,0],[141,0],[151,-1.65],[162,0],[173,0],[182,0]];
    for(const [start,lane] of lines){
      for(let i=0;i<3;i++){
        const d=start+i*1.55;
        if(world.breaches.some(([a,b])=>d>a-.4&&d<b+.4))continue;
        const b=world.blocks.find(v=>d>v.a-.4&&d<v.b+.4);
        const x=b&&!b.crawl?-Math.sign(b.x)*1.63:lane;
        coin(scene,x,b?.crawl?.50:.91,-d,d,x);
      }
    }
  }
  const current=()=>legs[active];
  function turn(side){
    const last=current();
    if(last.turn!=='both'&&last.turn!==side)return false;
    const step=along(last.h), h=last.h+side*Math.PI/2;
    newLeg(last.x+step[0]*last.len,last.z+step[1]*last.len,h,last.start+last.len,last.i+1,side);
    active++;
    if(active>2){
      const old=legs.shift();retire(old);active--;
      coins=coins.filter(c=>c.d>=old.start+old.len);
    }
    return true;
  }
  function position(d,x){
    if(d<exit)return {x,z:-d,h:0};
    let leg=legs[0];
    for(const item of legs){if(d>=item.start)leg=item;else break;}
    const step=along(leg.h),across=right(leg.h),local=d-leg.start;
    return {x:leg.x+step[0]*local+across[0]*x,z:leg.z+step[1]*local+across[1]*x,h:leg.h};
  }
  function collect(t,d,x,y){
    let gained=0;
    for(const c of coins){
      if(c.got)continue;
      const delta=c.d-d;
      c.g.visible=Math.abs(delta)<55;
      if(!c.g.visible)continue;
      c.g.rotation.y=t*3.6+c.d*.23;c.g.position.y=c.y+Math.sin(t*4+c.d)*.071;
      if(Math.abs(delta)<.76&&Math.abs(c.lane-x)<.63&&Math.abs(c.y-(y+.59))<.79){
        c.got=true;c.g.removeFromParent();gained++;
      }
    }
    return gained;
  }

  const dragon=new T.Group(), body=new T.Group();dragon.add(body);
  const yellow=new T.MeshStandardMaterial({color:0xffc332,roughness:.53});
  const skin=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.54});
  const belly=new T.MeshStandardMaterial({color:0xffdda0,roughness:.64});
  const palm=new T.MeshStandardMaterial({color:0x6c5c38,roughness:.75});
  const eyeGreen=new T.MeshStandardMaterial({color:0x71b852,roughness:.32});
  const eyeDark=new T.MeshStandardMaterial({color:0x142019,roughness:.23});
  const glint=new T.MeshStandardMaterial({color:0xe2efb3,roughness:.18});
  const mouth=new T.MeshStandardMaterial({color:0x5e391c,roughness:.65});
  const sphere=new T.SphereGeometry(1,36,24);
  function form(owner,geometry,mat,x,y,z,sx,sy,sz,rx=0,rz=0){
    const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,0,rz);owner.add(m);return m;
  }

  // Radius, depth and center offset at each height of the continuous body.
  const silhouette=[
    [.60,0,0,.03],[.68,.40,.36,.04],[.87,.66,.48,.04],[1.09,.77,.57,.03],
    [1.34,.79,.57,.02],[1.60,.72,.50,.02],[1.85,.57,.40,.012],[2.09,.44,.34,-.005],
    [2.27,.345,.302,-.035],[2.43,.307,.280,-.060],[2.59,.292,.272,-.066],
    [2.73,.245,.239,-.059],[2.84,.155,.161,-.048],[2.89,.001,.001,-.036]
  ];
  function profile(y,column){
    const upper=silhouette.findIndex(p=>p[0]>=y);
    const i=upper<0?silhouette.length-2:Math.max(0,upper-1);
    const a=silhouette[i],b=silhouette[i+1],previous=silhouette[Math.max(0,i-1)],next=silhouette[Math.min(i+2,silhouette.length-1)];
    const span=b[0]-a[0],t=Math.max(0,Math.min(1,(y-a[0])/span)),t2=t*t,t3=t2*t;
    const ma=(b[column]-previous[column])/(b[0]-previous[0]),mb=(next[column]-a[column])/(next[0]-a[0]);
    return (2*t3-3*t2+1)*a[column]+(t3-2*t2+t)*span*ma+(-2*t3+3*t2)*b[column]+(t3-t2)*span*mb;
  }
  function surface(y,angle,lift=0){
    return new T.Vector3(Math.sin(angle)*(profile(y,1)+lift),y,profile(y,3)-Math.cos(angle)*(profile(y,2)+lift));
  }
  function grid(rows,cols,point,withColor=false){
    const positions=[],indices=[],colors=[];
    const warm=new T.Color(0xe5a124),bright=new T.Color(0xffce40),sample=new T.Color();
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
      const v=point(i/rows,j/cols);
      positions.push(v.x,v.y,v.z);
      if(withColor){
        sample.copy(warm).lerp(bright,Math.min(1,(v.y-.55)*.50+.13));
        colors.push(sample.r,sample.g,sample.b);
      }
      if(i&&j){
        const k=i*(cols+1)+j;
        indices.push(k-cols-2,k-1,k,k-cols-2,k,k-cols-1);
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    if(withColor)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  body.add(new T.Mesh(grid(69,68,(t,u)=>surface(.60+t*2.29,u*Math.PI*2),true),skin));
  body.add(new T.Mesh(grid(42,44,(t,u)=>{
    const width=.98*Math.pow(Math.sin(Math.PI*t),.61);
    return surface(1.00+t*.96,(u*2-1)*width,.006);
  }),belly));
  const smile=[];
  for(let i=0;i<=18;i++){
    const t=(i/18)*2-1, a=t*.55;
    smile.push(surface(2.428+.035*t*t+.010*t,a,.012));
  }
  body.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(smile),24,.010,8,false),mouth));
  const legJoints=[],arms=[];
  for(const side of [-1,1]){
    const eye=new T.Group();eye.position.copy(surface(2.626,side*.70,.02));eye.rotation.y=-side*.48;body.add(eye);
    form(eye,sphere,eyeGreen,0,0,0,.117,.126,.085);
    form(eye,sphere,eyeDark,-side*.010,.001,-.071,.068,.079,.024);
    form(eye,sphere,glint,-.021,.029,-.091,.016,.017,.007);
    const arm=new T.Group();arm.position.set(side*.44,1.91,-.010);body.add(arm);arms.push(arm);
    form(arm,sphere,yellow,side*.13,-.18,-.008,.211,.355,.209,.05,side*.49);
    form(arm,sphere,yellow,side*.225,-.53,-.090,.153,.315,.160,.24,-side*.13);
    form(arm,sphere,palm,side*.225,-.767,-.185,.128,.148,.130,.11,-side*.11);

    const leg=new T.Group();leg.position.set(side*.40,.90,.035);body.add(leg);legJoints.push(leg);
    form(leg,sphere,yellow,side*.043,-.29,-.016,.228,.416,.215,-.07,side*.16);
    form(leg,sphere,yellow,side*.101,-.56,-.006,.142,.296,.145,.10,side*.16);
    form(leg,sphere,yellow,side*.112,-.827,-.105,.128,.073,.211,.02,side*.02);
  }
  const dragonLight=new T.PointLight(0xffdeb0,20,7,2);
  dragonLight.position.set(-1.55,2.8,-1.65);dragon.add(dragonLight);
  scene.add(dragon);dragon.visible=false;
  function chase(t,d,pace,playerX){
    dragon.visible=true;
    const stride=t*(pace>0?9.3:3.0), gait=pace>0?.77:.06;
    const p=position(d,Math.sin(t*1.6)*.31+playerX*.16);
    dragon.position.set(p.x,.008+Math.abs(Math.sin(stride))*.078,p.z);dragon.rotation.y=p.h;
    legJoints[0].rotation.x=Math.sin(stride)*gait;
    legJoints[1].rotation.x=-legJoints[0].rotation.x;
    arms[0].rotation.x=-legJoints[0].rotation.x*.82;
    arms[1].rotation.x=-legJoints[1].rotation.x*.82;
    body.rotation.z=Math.sin(stride)*.055;
    body.rotation.x=pace>0?.12+.029*Math.cos(stride*2):0;
  }

  return {reset,current,turn,position,collect,chase,exit,dragon};
};