/* The Rainworn Temple — controls, run state and accessibility options */
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('view'), intro = $('intro'), hud = $('hud'), panel = $('modal');
  const keys = new Set();
  const isTouch=matchMedia('(pointer: coarse), (hover: none) and (any-pointer: coarse)').matches;
  document.documentElement.classList.toggle('touch',isTouch);
  const preference = {quality:isTouch?'low':'high',sensitivity:1,sound:true,shake:!matchMedia('(prefers-reduced-motion: reduce)').matches};
  try { Object.assign(preference,JSON.parse(localStorage.getItem(isTouch?'rainworn.mobile':'rainworn.preferences') || '{}')); } catch {}
  for(const key of Object.keys(preference)) {
    const el=$(key), checkbox=el.type==='checkbox';
    el[checkbox?'checked':'value']=preference[key];
    el.addEventListener('input',()=>{
      preference[key]=checkbox?el.checked:el.type==='range'?Number(el.value):el.value;
      try { localStorage.setItem(isTouch?'rainworn.mobile':'rainworn.preferences',JSON.stringify(preference)); } catch {}
      if(key==='quality')resize();
      if(key==='sound'&&audio)audio.master.gain.value=preference.sound?.72:0;
    });
  }
  let renderer,world,expedition,camera,state='loading',pausedFrom='menu',run,last=0,sceneTime=0,hudTick=0;
  let yaw=0,pitch=0,eye=1.69,jumpPending=false,dragging=false,lockedPreviously=false,audio;
  const limit = (x,a,b)=>Math.min(b,Math.max(a,x));
  const ease=(a,b,dt,rate)=>a+(b-a)*(1-Math.exp(-dt*rate));
  const format=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
  function fieldOfView(fov){
    if(!isTouch||camera.aspect>=1)return fov;
    const narrow=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(25))/camera.aspect));
    return Math.min(104,Math.max(fov,narrow));
  }
  function resize(){
    if(!renderer)return;
    const ratio=preference.quality==='high'?Math.min(devicePixelRatio,1.65):preference.quality==='balanced'?1:.72;
    const renderCap=preference.quality==='high'?1440:preference.quality==='balanced'?1100:900;
    renderer.setPixelRatio(isTouch?Math.min(ratio,renderCap/Math.max(innerWidth,innerHeight)):ratio);
    renderer.setSize(innerWidth,innerHeight,false);
    renderer.shadowMap.enabled=preference.quality!=='low';
    renderer.shadowMap.needsUpdate=true;
    camera.aspect=innerWidth/Math.max(1,innerHeight);
    camera.fov=fieldOfView(69);camera.updateProjectionMatrix();
  }
  function setupAudio(){
    if(audio){audio.ctx.resume().catch(()=>{});return;}
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return;
    const ctx=new Context(),master=ctx.createGain();
    master.gain.value=preference.sound?.72:0;master.connect(ctx.destination);
    const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);
    const samples=buffer.getChannelData(0);
    for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    function layer(type,freq,amount){
      const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      src.buffer=buffer;src.loop=true;filter.type=type;filter.frequency.value=freq;gain.gain.value=amount;
      src.connect(filter).connect(gain).connect(master);src.start();return gain;
    }
    audio={ctx,master,buffer,rain:layer('bandpass',1400,.095),water:layer('lowpass',520,.13),rumble:layer('lowpass',92,.12)};
    ctx.resume().catch(()=>{});
  }
  function sound(kind){
    if(!audio||!preference.sound)return;
    const {ctx,master,buffer}=audio, now=ctx.currentTime;
    if(kind==='growl'){
      const tone=ctx.createOscillator(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
      tone.type='sawtooth';tone.frequency.setValueAtTime(78,now);tone.frequency.exponentialRampToValueAtTime(43,now+.34);
      filter.type='lowpass';filter.frequency.setValueAtTime(228,now);filter.frequency.exponentialRampToValueAtTime(89,now+.43);
      gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(.13,now+.07);gain.gain.exponentialRampToValueAtTime(.001,now+.43);
      tone.connect(filter).connect(gain).connect(master);tone.start(now);tone.stop(now+.45);
      return;
    }
    if(kind==='coin'){
      for(const [delay,note] of [[0,830],[.067,1250]]){
        const tone=ctx.createOscillator(), level=ctx.createGain();
        tone.type='sine';tone.frequency.value=note;
        level.gain.setValueAtTime(.068,now+delay);level.gain.exponentialRampToValueAtTime(.001,now+delay+.18);
        tone.connect(level).connect(master);tone.start(now+delay);tone.stop(now+delay+.2);
      }
      return;
    }
    const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    const [freq,vol,life]=kind==='step'?[360,.34,.09]:kind==='jump'?[540,.32,.16]:kind==='land'?[250,.53,.19]:[105,.90,.63];
    src.buffer=buffer;filter.type='lowpass';filter.frequency.value=freq;
    gain.gain.setValueAtTime(.001,now);gain.gain.exponentialRampToValueAtTime(vol,now+.018);gain.gain.exponentialRampToValueAtTime(.001,now+life);
    src.connect(filter).connect(gain).connect(master);src.start(now,Math.random()*2);src.stop(now+life+.03);
  }
  function setAudioActive(active){
    if(audio)audio.master.gain.setTargetAtTime(active&&preference.sound?.72:0,audio.ctx.currentTime,.10);
  }
  function requestLook(){
    if(isTouch||!canvas.requestPointerLock||document.pointerLockElement===canvas)return;
    try {const result=canvas.requestPointerLock();if(result)result.catch(()=>{});} catch {}
  }
  function begin(){
    if(!world)return;
    expedition.reset();
    run={x:0,d:0,y:0,vy:0,vx:0,vz:0,grounded:true,crouch:false,elapsed:0,pursuer:-10,step:0,flash:0,coins:0,coinFlash:0,turn:0,stumble:0,facing:0,wrongUntil:0,nextGrowl:1.2,reveal:0,openingRoar:false,openingBeat:0,touchLane:null,duckUntil:0};
    yaw=pitch=0;eye=1.69;keys.clear();clearTouch();jumpPending=false;hudTick=0;
    state='opening';intro.hidden=true;panel.hidden=true;hud.hidden=true;$('opening').hidden=false;
    $('hint').textContent='自动奔跑 · A / D 横移 · R 回头看追兵';
    setupAudio();setAudioActive(true);requestLook();
  }
  const revealLength=2.72;
  const smooth=(a,b,t)=>{const s=limit((t-a)/(b-a),0,1);return s*s*(3-2*s);};
  function startRunning(){
    run.d=.70;run.vz=5;run.pursuer=-6.05;
    state='playing';hud.hidden=false;$('opening').hidden=true;
    drawHud();
  }
  function openingShot(dt){
    const p=run;
    p.reveal=Math.min(revealLength,p.reveal+dt);
    const t=p.reveal;
    const motion=preference.shake?smooth(1.68,2.55,t):Number(t>=2.20);
    const retreat=.70*smooth(.82,revealLength,t);
    const approach=smooth(.035,2.65,t);
    const pursuer=-13.2+7.15*approach;
    const shake=preference.shake?Math.sin(t*17)*.014*approach:0;
    camera.position.set(.135*Math.sin(motion*Math.PI)+shake,1.69+shake*.40,-retreat);
    camera.rotation.set(.034*(1-motion),Math.PI*(1-motion),shake*.8,'YXZ');
    camera.fov=fieldOfView(63+8*motion);camera.updateProjectionMatrix();
    expedition.chase(t,pursuer,7.8,0);
    world.animate(sceneTime,retreat,NaN,preference.quality);
    if(t>.29&&!p.openingRoar){p.openingRoar=true;sound('growl');}
    const beat=Math.floor(t*3.8);
    if(beat!==p.openingBeat){p.openingBeat=beat;if(t>.25&&t<1.95)sound('land');}
    renderer.render(world.scene,camera);
    if(t>=revealLength)startRunning();
  }
  function showModal(kicker,title,body,button,handler,options=false,back=true){
    $('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-body').textContent=body;
    $('action').textContent=button;$('action').onclick=handler;$('options').hidden=!options;$('back').hidden=!back;
    panel.hidden=false;$('action').focus({preventScroll:true});
  }
  function release(){
    keys.clear();clearTouch();jumpPending=false;dragging=false;
    if(document.pointerLockElement===canvas)document.exitPointerLock();
  }
  function toMenu(){
    state='menu';release();intro.hidden=false;hud.hidden=true;$('opening').hidden=true;panel.hidden=true;setAudioActive(false);
  }
  function pause(){
    if(state!=='playing'&&state!=='opening')return;
    pausedFrom=state;state='paused';$('opening').hidden=true;release();setAudioActive(false);
    showModal('雨蚀神殿','已暂停','继续时将从当前位置出发。','继续逃亡',resume,true);
  }
  function resume(){
    if(pausedFrom==='menu'){toMenu();return;}
    state=pausedFrom;panel.hidden=true;$('opening').hidden=state!=='opening';setAudioActive(true);requestLook();
  }
  function end(reason,caught=false){
    run.caught=caught;state='lost';release();hud.hidden=true;sound('crash');setAudioActive(false);
    const result=reason+' 跑了 '+Math.floor(run.d)+' 米，捡到 '+run.coins+' 枚金币。';
    showModal('本轮结束',caught?'被追上了':'坠入水中',result,'再跑一次',begin);
  }
  $('start').addEventListener('click',begin);
  $('settings').addEventListener('click',()=>{
    if(state!=='menu')return;
    state='settings';pausedFrom='menu';
    showModal('雨蚀神殿','设置','可调整画质、声音和镜头晃动。','完成',toMenu,true,false);
  });
  $('back').addEventListener('click',toMenu);
  $('hud-pause').addEventListener('click',pause);
  canvas.addEventListener('pointerdown',e=>{
    if(state!=='playing'||e.pointerType==='touch')return;
    dragging=true;requestLook();
  });
  window.addEventListener('pointerup',()=>{dragging=false});
  document.addEventListener('pointerlockchange',()=>{
    const locked=document.pointerLockElement===canvas;
    if(!locked&&lockedPreviously&&(state==='playing'||state==='opening'))pause();
    lockedPreviously=locked;
  });
  window.addEventListener('mousemove',e=>{
    if(state!=='playing'||(document.pointerLockElement!==canvas&&!dragging))return;
    yaw=limit(yaw-e.movementX*.00205*preference.sensitivity,-.67,.67);
    pitch=limit(pitch-e.movementY*.00195*preference.sensitivity,-1.26,1.26);
  });
  window.addEventListener('keydown',e=>{
    if(e.code==='Escape'){
      if(state==='playing'||state==='opening')pause();
      else if(state==='settings')toMenu();
      else if(state==='paused')resume();
      return;
    }
    if(state==='opening'&&e.code==='Space'){
      e.preventDefault();if(!e.repeat)startRunning();return;
    }
    if(state!=='playing')return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft','ControlRight','KeyC'].includes(e.code))e.preventDefault();
    if(e.code==='Space'&&!e.repeat)jumpPending=true;
    if(!e.repeat&&['KeyQ','KeyE','ArrowLeft','ArrowRight'].includes(e.code))run.turn=['KeyQ','ArrowLeft'].includes(e.code)?1:-1;
    keys.add(e.code);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',pause);
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();pause();
    showModal('渲染连接已中断','需要重新加载','重新加载后即可再次进入神殿。','重新加载',()=>location.reload(),false,false);
  });

  const laneWidth=2.12;
  const heldTouch=new Set();
  let gesture=null;
  function clearTouch(){
    heldTouch.clear();gesture=null;
    for(const id of ['touch-back','touch-sprint','touch-duck'])$(id).setAttribute('aria-pressed','false');
  }
  function touchInput(){
    canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||state!=='playing'||gesture)return;
      gesture={id:e.pointerId,x:e.clientX,y:e.clientY};
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup',e=>{
      if(gesture?.id!==e.pointerId)return;
      const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
      gesture=null;
      if(state!=='playing'||Math.max(Math.abs(dx),Math.abs(dy))<23)return;
      if(Math.abs(dx)>Math.abs(dy)){
        run.touchLane=limit((run.touchLane??Math.round(run.x/laneWidth))+Math.sign(dx),-1,1);
      }else if(dy<0){
        jumpPending=true;
      }else{
        run.duckUntil=run.elapsed+1.6;
      }
    });
    for(const type of ['pointercancel','lostpointercapture']){
      canvas.addEventListener(type,e=>{if(gesture?.id===e.pointerId)gesture=null;});
    }
    for(const [id,action] of [['touch-back','back'],['touch-sprint','sprint'],['touch-duck','duck']]){
      const button=$(id);
      let pointer=null;
      button.addEventListener('pointerdown',e=>{
        if(state!=='playing'||pointer!==null)return;
        pointer=e.pointerId;heldTouch.add(action);button.setAttribute('aria-pressed','true');
        button.setPointerCapture(e.pointerId);
      });
      for(const type of ['pointerup','pointercancel','lostpointercapture']){
        button.addEventListener(type,e=>{
          if(pointer!==e.pointerId)return;
          pointer=null;heldTouch.delete(action);button.setAttribute('aria-pressed','false');
        });
      }
    }
    $('touch-jump').addEventListener('click',()=>{if(state==='playing')jumpPending=true;});
    $('touch-left').addEventListener('click',()=>{if(state==='playing')run.turn=1;});
    $('touch-right').addEventListener('click',()=>{if(state==='playing')run.turn=-1;});
    $('touch-skip').addEventListener('click',()=>{if(state==='opening')startRunning();});
  }
  touchInput();

  function inBlock(x,d,b){return b&&d>b.a-.23&&d<b.b+.23&&Math.abs(x-b.x)<(b.crawl?b.w:(b.radius||b.w*.55))+.20;}
  function obstacles(){
    if(run.d<expedition.exit)return {holes:world.breaches,blocks:world.blocks};
    const leg=expedition.current();
    return {
      leg,holes:leg.hole?[[leg.start+leg.hole[0],leg.start+leg.hole[1]]]:[],
      blocks:leg.block?[{...leg.block,a:leg.start+leg.block.a,b:leg.start+leg.block.b,radius:leg.block.w}]:[]
    };
  }
  function physics(dt){
    const p=run;
    p.elapsed+=dt;
    const {leg,holes,blocks}=obstacles();
    const hold=heldTouch.has('duck')||p.duckUntil>p.elapsed||keys.has('KeyC')||keys.has('ControlLeft')||keys.has('ControlRight');
    p.crouch=hold||blocks.some(b=>b.crawl&&inBlock(p.x,p.d,b));
    const keyboardSide=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
    if(keyboardSide)p.touchLane=null;
    const side=p.touchLane===null?keyboardSide:limit((p.touchLane*laneWidth-p.x)*2.8,-1,1);
    const sprint=heldTouch.has('sprint')||keys.has('ShiftLeft')||keys.has('ShiftRight');
    const brake=keys.has('KeyS')||keys.has('ArrowDown');
    const gain=Math.min(3.9,Math.max(0,p.d-expedition.exit)*.0035);
    const speed=p.crouch?5.55:sprint?11.2+gain:brake?2.9:8.85+gain;
    p.vx=ease(p.vx,side*(p.crouch?4.1:5.9),dt,p.grounded?13:6);
    p.vz=ease(p.vz,speed,dt,14);
    const x=limit(p.x+p.vx*dt,-3.13,3.13);
    const next=p.d+p.vz*dt;
    const blocked=(nx,nd)=>blocks.some(b=>inBlock(nx,nd,b)&&(!b.crawl||!p.crouch||p.y>.13));
    if(!blocked(x,p.d))p.x=x;else p.vx=0;
    if(!blocked(p.x,next))p.d=next;
    else{p.vz=0;if(p.stumble<=0){p.stumble=.65;sound('land');}}
    p.stumble=Math.max(0,p.stumble-dt);
    const edge=leg?leg.start+leg.len:Infinity;
    if(p.d>edge-13&&p.turn&&leg){
      if(leg.turn!=='both'&&leg.turn!==p.turn){
        p.turn=0;p.wrongUntil=p.elapsed+.8;
      }
    }else p.turn=0;
    if(p.d>=edge){
      const side=p.turn;
      if(side&&expedition.turn(side)){
        p.facing-=side*Math.PI/2;
        p.x=0;p.vx=0;p.turn=0;p.touchLane=null;
      }else{
        p.d=edge-.01;p.vz=0;
        if(p.stumble<=0){p.stumble=.8;sound('land');}
      }
    }
    if(jumpPending&&p.grounded&&!p.crouch){p.grounded=false;p.vy=7.35;sound('jump');}
    jumpPending=false;
    const hole=holes.some(([a,b])=>p.d>a&&p.d<b);
    if(hole&&p.grounded)p.grounded=false;
    if(!p.grounded){
      const lastY=p.y;
      p.vy-=15.5*dt;p.y+=p.vy*dt;
      if(!hole&&p.y<=0&&lastY>=-.10&&p.vy<0){
        p.y=0;p.vy=0;p.grounded=true;p.flash=.19;sound('land');
      }
    }
    const speedNow=Math.hypot(p.vz,p.vx);
    p.step+=dt*speedNow;
    if(p.step>(p.crouch?1.72:2.35)&&p.grounded){p.step=0;sound('step');}
    const chaseSpeed=p.elapsed<2?5.7:p.d-p.pursuer>16?Math.max(8.2+gain,p.vz-.42):8.2+gain;
    p.pursuer+=Math.max(0,Math.min(p.d-p.pursuer-.1,chaseSpeed*dt));
    if(p.y<-3.6){end('你坠入了断桥下的水里。');return;}
    if(p.d-p.pursuer<1.55){end('奶龙追上了你。',true);return;}
    p.flash=Math.max(0,p.flash-dt);
    const collected=expedition.collect(sceneTime,p.d,p.x,p.y);
    if(collected){p.coins+=collected;p.coinFlash=.35;sound('coin');}
    p.coinFlash=Math.max(0,p.coinFlash-dt);
  }
  function drawHud(){
    const gap=Math.max(0,Math.floor(run.d-run.pursuer));
    const {leg,holes,blocks}=obstacles();
    $('sector').textContent=leg?leg.zone:world.zones.reduce((name,[d,zone])=>run.d>=d?zone:name,world.zones[0][1]);
    $('gap').textContent=gap+' 米';
    $('pressure-bar').style.width=limit(gap/25*100,0,100)+'%';
    $('pressure-bar').style.background=gap<7?'#ff785a':'';
    $('meter').textContent=Math.floor(run.d)+' 米';
    $('score').textContent=run.coins;
    $('score').parentElement.classList.toggle('pulse',run.coinFlash>0);
    $('clock').textContent=format(run.elapsed);
    const edge=holes.find(([a])=>a-run.d<8.4&&a-run.d>.07);
    const obstacle=blocks.find(b=>b.a-run.d<6.5&&b.b-run.d>0);
    const remaining=leg?leg.start+leg.len-run.d:Infinity;
    const atTurn=remaining<12;
    if(isTouch){
      $('touch-turns').hidden=!atTurn;
      $('touch-left').hidden=!atTurn||leg.turn===-1;
      $('touch-right').hidden=!atTurn||leg.turn===1;
      $('touch-left').setAttribute('aria-pressed',String(run.turn===1));
      $('touch-right').setAttribute('aria-pressed',String(run.turn===-1));
    }
    let prompt='';
    if(atTurn){
      const choice=leg.turn==='both'?'Q 左转 · E 右转':leg.turn>0?'Q · 左转':'E · 右转';
      prompt=run.turn?(run.turn>0?'↰ 左转已准备':'↱ 右转已准备'):isTouch?'岔口在前 · 点箭头转弯':(run.wrongUntil>run.elapsed?'前方只有一条路 · ':'')+choice;
    }else if(edge)prompt=edge[0]-run.d<2.5?(isTouch?'上滑或点跳跃 · 现在起跳':'空格 · 现在起跳'):'断桥 · 到边缘起跳';
    else if(obstacle?.crawl)prompt=isTouch?'下滑或按住下蹲 · 钻过去':'按住 C · 从下方钻过去';
    else if(obstacle)prompt=obstacle.x<0?(isTouch?'右滑 · 从右侧绕过':'D · 从右侧绕过'):(isTouch?'左滑 · 从左侧绕过':'A · 从左侧绕过');
    else if(run.elapsed<4)prompt=isTouch?'左右滑换道 · 上滑跳 · 下滑蹲':'自动奔跑 · A / D 横移 · R 回头看追兵';
    else if(gap<6)prompt=isTouch?'追兵靠近 · 按住疾跑':'追兵靠近 · Shift 疾跑';
    else if(run.d>170&&run.d<expedition.exit)prompt='冲出神殿 · 进入雨林';
    $('hint').textContent=prompt;
  }

  function render(now){
    requestAnimationFrame(render);
    const dt=last?Math.min((now-last)/1000,.10):0;
    last=now;
    if(!world||state==='menu'||state==='settings'||state==='loading')return;
    if(state==='paused'){
      renderer.render(world.scene,camera);return;
    }
    if(state==='won'||state==='lost')return;
    sceneTime+=dt;
    if(state==='opening'){openingShot(dt);return;}
    const steps=Math.max(1,Math.ceil(dt/.012));
    for(let i=0;i<steps&&state==='playing';i++)physics(dt/steps);
    const p=run, motion=Math.min(1,Math.hypot(p.vz,p.vx)/8);
    const around=Math.max(0,1-(p.d-p.pursuer)/14);
    const shake=preference.shake?Math.sin(sceneTime*42)*.027*around:0;
    eye=ease(eye,p.crouch?.82:1.69,dt,17);
    const bob=preference.shake&&p.grounded?Math.sin(sceneTime*(p.crouch?13:17))*.038*motion:0;
    const where=expedition.position(p.d,p.x+shake);
    p.facing=ease(p.facing,0,dt,12);
    const back=p.caught||heldTouch.has('back')||keys.has('KeyR');
    camera.position.set(where.x,p.y+eye+bob-p.flash*.20,where.z);
    camera.rotation.set(p.caught?-.02:pitch+bob*.39,where.h+p.facing+(back?Math.PI:yaw),shake*.75,'YXZ');
    expedition.chase(sceneTime,p.pursuer,p.vz,p.x);
    if(state==='playing'&&p.elapsed>p.nextGrowl&&(back||around>.30||p.nextGrowl<2)){
      sound('growl');p.nextGrowl=p.elapsed+2.9;
    }
    const fov=fieldOfView(69+motion*4);
    if(Math.abs(camera.fov-fov)>.08){camera.fov=ease(camera.fov,fov,dt,5);camera.updateProjectionMatrix();}
    world.animate(sceneTime,p.d,NaN,preference.quality,where);
    if(audio){
      const t=audio.ctx.currentTime;
      audio.rumble.gain.setTargetAtTime(.11+around*.48,t,.24);
      const exterior=(p.d>=36&&p.d<=77)||(p.d>=128&&p.d<=164)||p.d>=expedition.exit;
      audio.water.gain.setTargetAtTime(exterior?.27:.11,t,.5);
      audio.rain.gain.setTargetAtTime(exterior?.14:.067,t,.5);
    }
    hudTick+=dt;
    if(hudTick>.073){hudTick=0;drawHud();}
    renderer.render(world.scene,camera);
  }
  (async()=>{
    try{
      if(!window.THREE||!window.buildTemple||!window.makeExpedition||!window.TEMPLE_TEXTURES)throw Error('资源文件缺失');
      renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.15;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
      camera=new THREE.PerspectiveCamera(69,1,.045,125);
      resize();
      world=await window.buildTemple(renderer);
      expedition=window.makeExpedition(world);
      state='menu';
      const button=$('start');button.disabled=false;button.innerHTML='进入神殿 <span class="arr" aria-hidden="true">→</span>';
      requestAnimationFrame(render);
    }catch(e){
      console.error(e);
      $('start').textContent='场景加载失败';
      $('load-error').textContent='请用支持 WebGL 的系统浏览器打开。电脑可使用 Edge 或 Chrome。';
    }
  })();
})();