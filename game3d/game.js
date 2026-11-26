/* MASS EFFECT: GHOST PROTOCOL — real 3D WebGL game (three.js).
   Original code, procedural models and synthesized audio. */
(() => {
'use strict';
const TAU=Math.PI*2, clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a), rndi=(a,b)=>Math.floor(rnd(a,b+1));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y), ang=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const angDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

/* ---------------- WEBGL SCENE ---------------- */
const glCvs=document.getElementById('gl'), uiCvs=document.getElementById('ui');
const ctx=uiCvs.getContext('2d');
let W=0,H=0,DPR=1,renderScale=1,perfAcc=0,perfFrames=0;
const MAX_DPR=1.5;
// MSAA plus a 2x device ratio was the largest fill-rate cost on phones.
// r160 changed light/color defaults and PointLight.decay (1 -> 2). Keep the
// original r128 look/glow falloff while the adaptive render-scale guard stays in charge.
if(THREE.ColorManagement)THREE.ColorManagement.enabled=false;
const renderer=new THREE.WebGLRenderer({canvas:glCvs,antialias:false,powerPreference:'high-performance'});
if('useLegacyLights' in renderer)renderer.useLegacyLights=true;
if(THREE.LinearSRGBColorSpace&&renderer.outputColorSpace!==undefined)
 renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
renderer.shadowMap.enabled=false; // cheap blob shadows replace the per-frame shadow pass
const miniCvs=document.createElement('canvas'),miniCtx=miniCvs.getContext('2d');
let miniDirty=true,miniKey='';
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x060b12);
scene.fog=new THREE.FogExp2(0x060b12,.0026);
const camera=new THREE.PerspectiveCamera(56,1,1,2600);
const worldG=new THREE.Group(), actorG=new THREE.Group(), fxG=new THREE.Group(), titleG=new THREE.Group();
scene.add(worldG,actorG,fxG,titleG);
const hemi=new THREE.HemisphereLight(0x9fc8ff,0x141a20,.85);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xdcecff,1.0);
sun.castShadow=false;
scene.add(sun,sun.target);
// One travelling room light replaces three permanent room lights. It follows
// the camera focus, so every visible room stays lit with a single dynamic light.
const roomLight=new THREE.PointLight(0x8fd8ff,16,320,1);scene.add(roomLight);
const muzzleLight=new THREE.PointLight(0xff5a3a,0,150,1);scene.add(muzzleLight);
const RAY=new THREE.Raycaster(),NDC=new THREE.Vector2();
const AIMPLANE=new THREE.Plane(new THREE.Vector3(0,1,0),-18),HIT=new THREE.Vector3();
const camFocus={x:0,y:0};
function resize(){
 DPR=Math.min((devicePixelRatio||1)*renderScale,MAX_DPR);W=innerWidth;H=innerHeight;
 renderer.setPixelRatio(DPR);renderer.setSize(W,H,false);
 uiCvs.width=Math.round(W*DPR);uiCvs.height=Math.round(H*DPR);
 uiCvs.style.width=W+'px';uiCvs.style.height=H+'px';
 ctx.setTransform(DPR,0,0,DPR,0,0);
 camera.aspect=W/H;camera.updateProjectionMatrix();
 miniDirty=true;
}
addEventListener('resize',resize);resize();

/* ---------------- AUDIO ---------------- */
const AudioSys={
 ac:null,noiseCache:{},sfxGain:null,
 sfxVol:(function(){try{const v=parseFloat(localStorage.getItem('gp_sfx_vol'));return isFinite(v)?clamp(v,0,2):1;}catch(e){return 1;}})(),
 init(){if(!this.ac)try{this.ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}
  if(this.ac&&!this.sfxGain)try{this.sfxGain=this.ac.createGain();this.sfxGain.gain.value=this.sfxVol;this.sfxGain.connect(this.ac.destination);}catch(e){}
  if(this.ac&&this.ac.state==='suspended'){try{this.ac.resume();}catch(e){}}
  try{MusicSys.init();}catch(e){} },
 setSfxVolume(v){this.sfxVol=clamp(v,0,2);try{localStorage.setItem('gp_sfx_vol',String(this.sfxVol));}catch(e){}
  if(this.sfxGain&&this.ac)try{this.sfxGain.gain.setTargetAtTime(this.sfxVol,this.ac.currentTime,.02);}catch(e){} },
 tone(f,d,type='sine',vol=.08,slide=0){if(!this.ac)return;const t=this.ac.currentTime,o=this.ac.createOscillator(),g=this.ac.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(1,f+slide),t+d);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(this.sfxGain||this.ac.destination);o.start(t);o.stop(t+d);},
 noise(d,vol=.05){if(!this.ac)return;const key=d.toFixed(3);let b=this.noiseCache[key];
  if(!b){const n=Math.max(1,Math.floor(this.ac.sampleRate*d));
   b=this.ac.createBuffer(1,n,this.ac.sampleRate);const a=b.getChannelData(0);
   for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);this.noiseCache[key]=b;}
  const s=this.ac.createBufferSource(),g=this.ac.createGain();s.buffer=b;
  g.gain.value=vol;s.connect(g);g.connect(this.sfxGain||this.ac.destination);s.start();},
 shot(){this.tone(320,.08,'sawtooth',.05,-180);this.noise(.05,.03);},
 hit(){this.tone(180,.12,'square',.06,-80);},hurt(){this.tone(120,.25,'sawtooth',.09,-60);this.noise(.15,.05);},
 biotic(){this.tone(90,.5,'sine',.09,320);this.tone(140,.45,'triangle',.05,200);},
 cloak(){this.tone(600,.4,'sine',.05,-400);this.noise(.2,.02);},
pickup(){this.tone(520,.1,'sine',.06,300);this.tone(780,.15,'sine',.04,200);},
 boss(){this.tone(70,.8,'sawtooth',.12,-20);this.noise(.5,.08);},
 win(){[440,554,659,880].forEach((f,i)=>setTimeout(()=>this.tone(f,.4,'triangle',.07),i*140));}};

// Android game flag keeps the panel at 60 or 120 Hz. Native Choreographer
// drives the render loop; browsers/PWA use requestAnimationFrame.
const NativeDisplay=(function(){
 let bridge=null;
 try{bridge=window.DisplayBridge||null;}catch(e){}
 const call=(name,fallback)=>{try{return bridge&&typeof bridge[name]==='function'?bridge[name]():fallback;}catch(e){return fallback;}};
 return {
  nativeDriven(){return !!call('isNativeDriven',false);},
  hz(){return Number(call('getRefreshRate',0))||0;}
 };
})();
const RefreshSync=(function(){
 let nativeHz=0,overrideHz=0,carry=0;
 function snap(hz){return hz>=90?120:60;}
 function hz(){return snap(overrideHz||nativeHz||60);}
 function intervalMs(){return 1000/hz();}
 function active(){return overrideHz>0||NativeDisplay.nativeDriven()||nativeHz>0;}
 function step(dt){
  nativeHz=NativeDisplay.hz()||nativeHz;
  if(!Number.isFinite(dt)||dt<0)dt=0;
  if(!active())return dt;
  carry+=dt;
  const need=intervalMs()/1000;
  if(carry+.0006<need)return null;
  const out=carry;carry=0;return out;
 }
 return {intervalMs,active,step,
  setOverride(v){overrideHz=v>0?v:0;carry=0;},
  get hz(){return hz();},
  get native(){return NativeDisplay.nativeDriven();}};
})();

const GITHUB_INFILTRATOR_URL='https://github.com/parsaseifi78/Mass-effect-infiltrater-Resurrection';
const GITHUB_GHOST_URL='https://github.com/parsaseifi78/Mass-Effect-Ghost-Protocol';
const MUSIC_TRACKS={menu:'music/menu_v7123.mp3',game:'music/game_v7123.mp3',combat:'music/combat_v7123.mp3',boss:'music/boss_v7123.mp3',credits:'music/credits_v7123.mp3'};
const MusicSys={
 ac:null,master:null,filter:null,delay:null,delayGain:null,tracks:null,trackErrors:{},retryAt:{},unlocked:false,fadeStart:0,fadeFrom:{},mood:'silent',next:0,step:0,started:false,
 vol:(function(){try{const v=parseFloat(localStorage.getItem('gp_music_vol'));
  if(!isFinite(v)||Math.abs(v-4.8)<.01)return 6.4;  // old 3x default -> new 4x default
  return clamp(v,0,12.8);}catch(e){return 6.4;}})(),
 init(){if(this.started)return; this.ac=AudioSys.ac;
  try{
   this.tracks={};
   for(const k in MUSIC_TRACKS){
    const a=new Audio(); a.loop=true; a.preload='auto'; a.volume=0;
    a.addEventListener('error',()=>{this.trackErrors[k]=true;});
    a.addEventListener('canplay',()=>{this.trackErrors[k]=false;});
    a.src=MUSIC_TRACKS[k]; try{a.load();}catch(e){}
    this.tracks[k]=a;
   }
  }catch(e){this.tracks=null;}
  try{
   this.master=this.ac.createGain(); this.master.gain.value=this.vol;
   this.filter=this.ac.createBiquadFilter(); this.filter.type='lowpass'; this.filter.frequency.value=1800; this.filter.Q.value=0.7;
   this.delay=this.ac.createDelay(1.0); this.delay.delayTime.value=0.28;
   this.delayGain=this.ac.createGain(); this.delayGain.gain.value=0.18;
   this.master.connect(this.filter); this.filter.connect(this.ac.destination);
   this.filter.connect(this.delay); this.delay.connect(this.delayGain); this.delayGain.connect(this.filter);
   try{this.ac.onstatechange=()=>{if(this.ac&&this.ac.state==='running'){this.next=this.ac.currentTime+.05;}};}catch(e){}
  }catch(e){}
  this.started=true;
 },
 unlockTracks(){
  if(this.unlocked||!this.tracks)return;
  this.unlocked=true;
  for(const k in this.tracks){
   const a=this.tracks[k]; a.volume=0;
   try{const p=a.play();
    const stopIfIdle=()=>{if(this.mood!==k){try{a.pause();}catch(e){}}};
    if(p&&p.then)p.then(stopIfIdle).catch(()=>{});
    else stopIfIdle();
   }catch(e){}
  }
  setTimeout(()=>{try{this.kick();}catch(e){}},180);
 },
 retryPlay(k){
  const a=this.tracks&&this.tracks[k];
  if(!a||this.trackErrors[k])return;
  // A pending play() that has not advanced is not a playing track; retry it.
  if(!a.paused&&a.currentTime>0.02)return;
  const now=performance.now();
  if(now<(this.retryAt[k]||0))return;
  this.retryAt[k]=now+400;
  try{const p=a.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}
 },
 kick(){
  try{if(this.tracks){
   this.retryPlay(this.mood==='silent'?'menu':this.mood);
   this.updateTrackVolumes(true);
   return;}}
  catch(e){}
  this.next=this.ac?this.ac.currentTime+.05:0; this.step=0;
  try{if(this.ac&&this.ac.state==='suspended')this.ac.resume();}catch(e){}
 },
 trackTarget(k){return k===this.mood?clamp(this.vol/12.8,0,1):0;},
 updateTrackVolumes(immediate){
  if(!this.tracks)return;
  const now=performance.now();
  if(immediate){this.fadeStart=0;for(const k in this.tracks)this.tracks[k].volume=this.trackTarget(k);return;}
  if(!this.fadeStart){for(const k in this.tracks)this.tracks[k].volume=this.trackTarget(k);return;}
  const p=clamp((now-this.fadeStart)/800,0,1);
  for(const k in this.tracks){
   const from=this.fadeFrom[k]||0;const to=this.trackTarget(k);
   const v=from+(to-from)*p;
   this.tracks[k].volume=v;
   if(k!==this.mood&&v<=0.001&&!this.tracks[k].paused){try{this.tracks[k].pause();}catch(e){}}
  }
  if(p>=1){this.fadeStart=0;
   for(const k in this.tracks)if(k!==this.mood&&!this.tracks[k].paused){try{this.tracks[k].pause();}catch(e){}}}
 },
 setVolume(v){this.vol=clamp(v,0,12.8);try{localStorage.setItem('gp_music_vol',String(this.vol));}catch(e){}
  if(this.master&&this.ac)try{this.master.gain.setTargetAtTime(this.vol,this.ac.currentTime,.05);}catch(e){}
  this.updateTrackVolumes(false); },
 setMood(m){
  if(this.mood===m){if(this.tracks)this.retryPlay(m);return;}
  this.mood=m; this.step=0;
  this.next=this.ac?this.ac.currentTime+.05:0;
  if(this.tracks){
   const a=this.tracks[m];
   if(a){try{a.currentTime=0;}catch(e){}}
   this.retryPlay(m);
   this.fadeFrom={};for(const k in this.tracks)this.fadeFrom[k]=this.tracks[k].volume;
   this.fadeStart=performance.now();
  }
  try{if(this.filter){const f=m==='menu'?2600:m==='game'?1100:m==='combat'?2600:m==='boss'?2400:m==='credits'?2200:1800;
   this.filter.frequency.setTargetAtTime(f,this.ac.currentTime,.35);}}catch(e){}
 },
 note(freq,dur,vol,type='sine',when=0,det=0,slide=0){
  if(!this.ac||!this.master||!freq) return;
  const t=(when||this.ac.currentTime);
  try{
   const o=this.ac.createOscillator(), g=this.ac.createGain();
   o.type=type; o.frequency.setValueAtTime(Math.max(20,freq+det),t);
   if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+dur);
   g.gain.setValueAtTime(0.0001,t);
   g.gain.exponentialRampToValueAtTime(Math.max(0.0001,vol),t+.08);
   g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
   o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+.05);
  }catch(e){}
 },
 pad(freqs,dur,vol,type='sine',when=0){
  const t=when||this.ac.currentTime;
  freqs.forEach((f,i)=>this.note(f,dur,vol,type,t,i*.7));
 },
 noiseHit(dur,vol,when){
  if(!this.ac||!this.master) return;
  const t=when||this.ac.currentTime, n=Math.max(1,Math.floor(this.ac.sampleRate*dur));
  try{
   const b=this.ac.createBuffer(1,n,this.ac.sampleRate), a=b.getChannelData(0);
   for(let i=0;i<n;i++) a[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);
   const s=this.ac.createBufferSource(), g=this.ac.createGain(), f=this.ac.createBiquadFilter();
   f.type='lowpass'; f.frequency.value=1200;
   g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
   s.buffer=b; s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t+dur);
  }catch(e){}
 },
 moodInterval(m){ return m==='menu'?1.2:m==='game'?3.6:m==='combat'?1.4:m==='boss'?1.8:m==='credits'?2.4:2; },
 scheduleStep(mood,when){
  const s=this.step++;
  if(mood==='menu'){
   // Cinematic main-menu theme: driving minor arpeggio + bass pulse.
   const chords=[[130.81,155.56,196,233.08],[116.54,138.59,174.61,220],[146.83,174.61,220,261.63],[130.81,164.81,196,246.94]];
   const ch=chords[s%chords.length];
   this.pad(ch,3.2,.014,'sawtooth',when);
   this.pad(ch.map(f=>f*2),2.8,.006,'triangle',when);
   this.note(ch[0]/2,2.4,.016,'triangle',when,0,-2);
   const arp=[0,2,3,2,1,3,2,1];
   this.note(ch[arp[s%arp.length]]*2,.9,.010,'triangle',when+.05);
   this.note(ch[arp[(s+2)%arp.length]]*3,.7,.005,'sine',when+.55);
   if(s%4===0)this.noiseHit(.1,.012,when);
  } else if(mood==='game'){
   // Very sparse ambient drone: no pulse, no arpeggio.
   const chords=[[110,130.81,164.81],[98,123.47,146.83],[130.81,155.56,196],[110,138.59,164.81]];
   const ch=chords[s%chords.length];
   this.pad(ch,8.0,.012,'sine',when);
   if(s%2===0)this.note(ch[0]/2,8.5,.010,'sine',when);
   if(s%4===2)this.note(ch[2]*2,4.0,.003,'triangle',when+1.0);
  } else if(mood==='combat'){
   const chords=[[130.81,155.56,196,233.08],[116.54,138.59,174.61,207.65],[146.83,174.61,220,261.63],[123.47,146.83,185,220]];
   const ch=chords[s%chords.length];
   this.pad(ch,3.0,.014,'triangle',when);
   this.pad(ch.map(f=>f*2),2.6,.005,'sine',when);
   this.note(ch[0]/2,2.2,.012,'square',when);
   const arp=[0,2,1,3,2,1,0,2];
   this.note(ch[arp[s%arp.length]]*2,1.0,.009,'triangle',when+.1);
   if(s%2===0)this.noiseHit(.08,.010,when);
  } else if(mood==='boss'){
   const chords=[[110,130.81,164.81,220],[123.47,146.83,185,246.94],[130.81,155.56,196,261.63],[98,123.47,146.83,196]];
   const ch=chords[s%chords.length];
   this.pad(ch,4.5,.018,'sine',when);
   this.pad(ch.map(f=>f*2),4.0,.007,'triangle',when);
   this.pad(ch.map(f=>f*3),3.5,.003,'sine',when);
   this.note(ch[0]/2,4.0,.014,'triangle',when);
   const arp=[0,2,3,1,2,3,0,2];
   this.note(ch[arp[s%arp.length]]*2,1.6,.010,'triangle',when+.3);
   if(s%2===1)this.note(ch[arp[(s+2)%arp.length]]*3,2.0,.005,'sine',when+1.0);
   if(s%8===0)this.noiseHit(.18,.015,when);
  } else if(mood==='credits'){
   const chords=[[130.81,164.81,196,261.63],[146.83,185,220,293.66],[164.81,196,246.94,329.63],[130.81,155.56,196,261.63]];
   const ch=chords[s%chords.length];
   this.pad(ch,6.0,.020,'sine',when);
   this.pad(ch.map(f=>f*2),5.5,.007,'triangle',when);
   this.note(ch[0]/2,7.0,.010,'sine',when);
   const mel=[2,3,4,3,2,1,2,3], mi=mel[s%mel.length];
   this.note((ch[mi%ch.length]||ch[2])*2,2.4,.010,'triangle',when+.6);
   if(s%2===1)this.note(ch[1]*3,3.5,.004,'sine',when+1.5);
  }
 },
 update(state,player,enemies,dt){
  if(!this.started)this.init();
  let mood='menu';
  const L=LEVELS[levelIdx],st=L&&L.stages[objective.stage];
  const bossActive=!!(st&&st.type==='boss')||
   !!(enemies&&enemies.some(e=>(e.type==='boss'||e.miniBoss)&&!e.dead));
  if(state==='VICTORY'||(dialogue&&dialogue.cutscene&&dialogue.cutsceneKind!=='mid'))mood='credits';
  else if(bossActive&&(state==='PLAY'||state==='DIALOGUE'||state==='PAUSE'))mood='boss';
  else if(state==='PLAY'){
   const room=L&&L.rooms&&L.rooms.find(r=>player&&
    player.x>=r.x*TILE&&player.x<(r.x+r.w)*TILE&&
    player.y>=r.y*TILE&&player.y<(r.y+r.h)*TILE);
   const roomFight=!!(room&&enemies&&enemies.some(e=>!e.dead&&
    e.x>=room.x*TILE&&e.x<(room.x+room.w)*TILE&&
    e.y>=room.y*TILE&&e.y<(room.y+room.h)*TILE));
   const nearCombat=roomFight||!!(objective&&objective.alarmed)||
    !!(enemies&&enemies.some(e=>!e.dead&&Math.hypot(e.x-(player?player.x:0),e.y-(player?player.y:0))<500));
   mood=nearCombat?'combat':'game';
  } else if(state==='TITLE'||state==='BRIEF'||state==='DIALOGUE'||state==='MP_MENU'||state==='MP_COOP_MENU'||state==='MP_PVP_MODE'||state==='MP_PVP_JOIN'||state==='MP_LOBBY'||state==='MP_LOADOUT'||state==='INFO'||state==='GITHUB'||state==='ABOUT'||state==='HELP'||state==='PAUSE'||state==='SETTINGS'){
   mood='menu';
  }
  this.setMood(mood);
  if(this.tracks&&!this.trackErrors[mood]){
   this.retryPlay(mood);
   this.updateTrackVolumes(false);
   return;
  }
  // Procedural fallback still requires a running WebAudio context.
  if(!AudioSys.ac||!this.ac||!this.master)return;
  if(this.ac.state==='suspended'){try{this.ac.resume();}catch(e){}return;}
  const now=this.ac.currentTime;
  if(!this.next||this.next<now)this.next=now+.05;
  let guard=0;
  while(this.next<now+.6 && guard++<8){
   this.scheduleStep(mood,this.next);
   this.next+=this.moodInterval(mood);
  }
 }
};
function cueMusic(m){try{MusicSys.setMood(m);MusicSys.retryPlay(m);MusicSys.updateTrackVolumes(false);}catch(e){}}
// Non-blocking encounter card: bosses get a held name plate, camera kick and
// stinger the moment they enter, while the player keeps control of the fight.
function showBossCard(e,kind){
 if(!e)return;
 bossCard={name:e.name||loc(e.type.toUpperCase()),kind:kind||(e.type==='boss'?'boss':'mini'),
  col:e.col||0x9fd8ff,t:3.2,max:3.2};
 shake=Math.max(shake,14);flash=Math.max(flash,.22);
 AudioSys.boss();cueMusic('boss');
}

/* ---------------- INPUT ---------------- */
const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;AudioSys.init();
 if(['q','e','[',']',';',"'",' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
addEventListener('touchstart',()=>AudioSys.init(),{passive:true});addEventListener('mousedown',()=>AudioSys.init());
let audioUnlocked=false;
function unlockAudio(){if(audioUnlocked)return;audioUnlocked=true;
 try{MusicSys.unlockTracks();}catch(e){try{MusicSys.kick();}catch(e2){}}}
addEventListener('touchstart',unlockAudio,{once:true,passive:true});
addEventListener('mousedown',unlockAudio,{once:true});
addEventListener('keydown',unlockAudio,{once:true});
const mouse={x:0,y:0,down:false,moved:false,interactTap:false};
// Original-game selection: hold the top-left/right corner icon and slide to
// slide to cast a biotic or choose a weapon; a short tap only reloads weapons. Cloak stays bottom-right.
const wheel={kind:null,id:null,x0:0,y0:0,x:0,y:0,idx:0,active:false,start:0,
 activeAt:0,pointer:false,castReady:false};
let padWheel=null;
const aimPoint={x:0,y:0};
let aimDir=-Math.PI/4;
cvsListeners();
function cvsListeners(){
 uiCvs.addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.moved=true;
 moveWheel(-1,e.clientX,e.clientY);
 if(state==='SETTINGS'&&settingsDrag)setSettingsVolume(settingsDrag,e.clientX);});
uiCvs.addEventListener('mouseup',()=>{settingsDrag=null;});
addEventListener('mouseup',e=>{settingsDrag=null;
 endWheel(-1,e.clientX!==undefined?e.clientX:mouse.x,e.clientY!==undefined?e.clientY:mouse.y);});
 uiCvs.addEventListener('mousedown',e=>{
 mouse.x=e.clientX;mouse.y=e.clientY;
 if(state==='SETTINGS'){
  const k=settingsVolumeAt(e.clientX,e.clientY);
  if(k){settingsDrag=k;setSettingsVolume(k,e.clientX);return;}
 }
 if(state!=='PLAY')return;
 if(inRect(e.clientX,e.clientY,pauseRect())){pauseGame();return;}
 const I=interactRect(),BR=bioticWheelRect(),WR=weaponRects().panel,C=cloakRect();
 if(enemyInMeleeRange()&&inRect(e.clientX,e.clientY,meleeRect())){triggerMelee();AudioSys.init();return;}
 if(Math.hypot(e.clientX-C.cx,e.clientY-C.cy)<=C.r){triggerCloak();AudioSys.init();return;}
 // Corner wheels: hold and slide; release casts a biotic or switches weapons.
 if(inRect(e.clientX,e.clientY,BR)){
  if(beginWheel('biotic',-1,e.clientX,e.clientY)){AudioSys.init();return;}}
 if(inRect(e.clientX,e.clientY,WR)){
  if(beginWheel('weapon',-1,e.clientX,e.clientY)){AudioSys.init();return;}}
 if(nearObjective()&&inRect(e.clientX,e.clientY,I)){
  mouse.interactTap=true;AudioSys.init();return;}
 mouse.down=true;AudioSys.init();});
 addEventListener('mouseup',()=>mouse.down=false);
}
const touch={move:null,fire:null,interact:null,interactTap:false,look:null};
const PAD_ACTIONS=[
 {key:'moveUp',en:'MOVE UP',fa:'حرکت بالا'},
 {key:'moveDown',en:'MOVE DOWN',fa:'حرکت پایین'},
 {key:'moveLeft',en:'MOVE LEFT',fa:'حرکت چپ'},
 {key:'moveRight',en:'MOVE RIGHT',fa:'حرکت راست'},
 {key:'aimUp',en:'AIM UP',fa:'نشانه بالا'},
 {key:'aimDown',en:'AIM DOWN',fa:'نشانه پایین'},
 {key:'aimLeft',en:'AIM LEFT',fa:'نشانه چپ'},
 {key:'aimRight',en:'AIM RIGHT',fa:'نشانه راست'},
 {key:'fire',en:'FIRE',fa:'شلیک'},
 {key:'melee',en:'MELEE',fa:'مشتی'},
 {key:'interact',en:'INTERACT',fa:'تعامل'},
 {key:'reload',en:'RELOAD',fa:'خشاب'},
 {key:'weaponWheel',en:'WEAPON WHEEL',fa:'چرخ سلاح'},
 {key:'weaponRifle',en:'CARBINE SLOT',fa:'اسلات کاربین'},
 {key:'weaponShotgun',en:'SHOTGUN SLOT',fa:'اسلات شاتگان'},
 {key:'weaponPrev',en:'PREVIOUS WEAPON',fa:'سلاح قبلی'},
 {key:'weaponNext',en:'NEXT WEAPON',fa:'سلاح بعدی'},
 {key:'bioticWheel',en:'BIOTIC WHEEL',fa:'چرخ بیوتیک'},
 {key:'cloak',en:'CAST CLOAK',fa:'اجرای پنهانسازی'},
 {key:'barrier',en:'CAST BARRIER',fa:'اجرای سپر'},
 {key:'well',en:'CAST BIOTIC WELL',fa:'اجرای چاه بیوتیک'},
 {key:'dash',en:'CAST BIOTIC DASH',fa:'اجرای دش بیوتیک'},
 {key:'pause',en:'PAUSE',fa:'توقف'},
 {key:'confirm',en:'CONFIRM',fa:'تأیید'},
 {key:'cancel',en:'CANCEL',fa:'لغو'}
];
const PAD_DEFAULT={
 moveUp:{t:'axis',i:1,d:-1},moveDown:{t:'axis',i:1,d:1},
 moveLeft:{t:'axis',i:0,d:-1},moveRight:{t:'axis',i:0,d:1},
 aimUp:{t:'axis',i:3,d:-1},aimDown:{t:'axis',i:3,d:1},
 aimLeft:{t:'axis',i:2,d:-1},aimRight:{t:'axis',i:2,d:1},
 fire:{t:'btn',i:7},melee:{t:'btn',i:0},interact:{t:'btn',i:3},reload:{t:'btn',i:2},
 weaponWheel:{t:'btn',i:10},weaponRifle:{t:'btn',i:4},weaponShotgun:{t:'btn',i:5},
 weaponPrev:{t:'btn',i:14},weaponNext:{t:'btn',i:15},
 bioticWheel:{t:'btn',i:11},cloak:{t:'btn',i:1},
 barrier:{t:'btn',i:12},well:{t:'btn',i:13},dash:{t:'btn',i:8},
 pause:{t:'btn',i:9},confirm:{t:'btn',i:0},cancel:{t:'btn',i:1}
};
function clonePadMap(m){const o={};for(const k of Object.keys(m))o[k]=m[k]?{...m[k]}:null;return o;}
function loadPadMap(){
 try{
  const raw=localStorage.getItem('ghostProtocolPadMap2');
  if(raw){const saved=JSON.parse(raw),out=clonePadMap(PAD_DEFAULT);
   for(const a of PAD_ACTIONS){const v=saved&&saved[a.key];
    if(v&&Number.isInteger(v.i)&&
      ((v.t==='btn')||(v.t==='axis'&&(v.d===1||v.d===-1))))out[a.key]={...v};}
   return out;}
 }catch(e){}
 return clonePadMap(PAD_DEFAULT);
}
function padLabel(a){return lang==='fa'?a.fa:a.en;}
function bindingLabel(m){
 if(!m)return lang==='fa'?'تنظیم نشده':'UNSET';
 if(m.t==='btn')return (lang==='fa'?'دکمه ':'BTN ')+(m.i+1);
 return (lang==='fa'?'محور ':'AXIS ')+(m.i+1)+(m.d<0?' −':' +');
}
function padButton(gp,i){
 return !!(gp&&gp.buttons&&gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>.55));
}
function padAxis(gp,i){
 return (gp&&gp.axes&&typeof gp.axes[i]==='number'&&Number.isFinite(gp.axes[i]))?gp.axes[i]:0;
}
const GamepadSys={
 map:loadPadMap(),active:false,index:-1,
 prev:{},down:{},held:{},leftX:0,leftY:0,rightX:0,rightY:0,
 capture:null,captureArmed:false,
 pad(){
  try{
   const list=(typeof navigator!=='undefined'&&navigator.getGamepads)?navigator.getGamepads():[];
   for(let i=0;i<list.length;i++)if(list[i]&&list[i].connected!==false)return list[i];
  }catch(e){}
  return null;
 },
 poll(){
  const gp=this.pad();this.active=!!gp;
  const btn=i=>padButton(gp,i),axis=i=>padAxis(gp,i);
  if(this.capture){
   let found=null;
   for(let i=0;i<17&&!found;i++)if(btn(i))found={t:'btn',i};
   for(let i=0;i<4&&!found;i++){const v=axis(i);if(Math.abs(v)>.65)found={t:'axis',i,d:v>0?1:-1};}
   if(!found)this.captureArmed=true;
   else if(this.captureArmed){
    this.map[this.capture]=found;this.save();this.capture=null;this.captureArmed=false;
   }
  }
  const capturing=!!this.capture;
  for(const a of Object.keys(this.map)){
   const m=this.map[a];let v=0;
   if(m&&m.t==='btn')v=btn(m.i)?1:0;
   else if(m&&m.t==='axis')v=axis(m.i)*m.d>.5?1:0;
   this.down[a]=!capturing&&!!v&&!this.prev[a];
   this.held[a]=!capturing&&!!v;this.prev[a]=!!v;
  }
  const nav={up:this.pressed('moveUp')||btn(12),down:this.pressed('moveDown')||btn(13),
   left:this.pressed('moveLeft')||btn(14),right:this.pressed('moveRight')||btn(15)};
  for(const k of Object.keys(nav)){
   this.down[k]=!capturing&&!!nav[k]&&!this.prev[k];this.prev[k]=!!nav[k];
  }
  this.leftX=clamp(this.dirValue('moveRight')-this.dirValue('moveLeft'),-1,1);
  this.leftY=clamp(this.dirValue('moveDown')-this.dirValue('moveUp'),-1,1);
  this.rightX=clamp(this.dirValue('aimRight')-this.dirValue('aimLeft'),-1,1);
  this.rightY=clamp(this.dirValue('aimDown')-this.dirValue('aimUp'),-1,1);
 },
 dirValue(action){
  const m=this.map[action];if(!m)return 0;
  const gp=this.pad();
  const v=m.t==='axis'?padAxis(gp,m.i)*m.d:(padButton(gp,m.i)?1:0);
  return v<.18?0:clamp(v,0,1);
 },
 pressed(action){return !!this.down[action];},
 heldAction(action){return !!this.held[action];},
 startCapture(action){this.capture=action;this.captureArmed=false;},
 reset(){this.map=clonePadMap(PAD_DEFAULT);this.save();this.capture=null;this.captureArmed=false;},
 save(){try{localStorage.setItem('ghostProtocolPadMap2',JSON.stringify(this.map));}catch(e){}}
};
function firePad(){const r=clamp(W*.10,62,82);return {cx:W-r-58,cy:H-r-26,r};}
// The camera never rotates around Y in this game: screen right is world +x
// and screen down is world +z, so the stick maps directly to a world angle.
// (Do not use camera.target here - real three.js cameras have no such field.)
function stickAim(nx,ny){return Math.atan2(ny,nx);}
function bioticWheelRect(){const ms=Math.min(84,Math.max(54,W*.10));return {x:12,y:12,w:ms,h:ms};}
function cloakRect(){const r=clamp(W*.026,20,30);return {cx:W-r-12,cy:H-r-12,r};}
function abilityRects(){
 const b=bioticWheelRect(),c=cloakRect();
 return {
  biotic:{x:b.x,y:b.y,w:b.w,h:b.h},
  cloak:{x:c.cx-c.r,y:c.cy-c.r,w:c.r*2,h:c.r*2}};
}
function meleeRect(){const s=clamp(W*.07,50,56),wp=weaponRects().panel;
 return {x:W-s-12,y:wp.y+wp.h+12,w:s,h:s};}
function enemyInMeleeRange(){
 if(!player||player.dead||player.dash)return false;
 return enemies.some(e=>!e.dead&&!(e.type==='juggernaut'&&e.ally)&&
  !(e.type==='boss'&&e.dirPhase===1)&&
  dist(player,e)<(e.r||16)+player.r+MELEE_REACH);
}
// One bottom-centre layout drives the map and the three stacked HUD boxes so
// their combined height matches the map exactly instead of towering above it.
function hudStack(){
 const ms=Math.min(82,Math.max(74,W*.105)),vw=Math.min(270,W*.38),
  hgap=8,vgap=2,bottom=H-12,
  mh=clamp(Math.round(ms*.195),14,18),oh=clamp(Math.round(ms*.245),17,22),
  vh=ms-mh-oh-vgap*2;
 const map={x:(W-(ms+hgap+vw))/2,y:bottom-ms,w:ms,h:ms};
 const v={x:map.x+map.w+hgap,y:bottom-vh,w:vw,h:vh};
 const mr={x:v.x,y:v.y-vgap-mh,w:vw,h:mh};
 const o={x:mr.x,y:mr.y-vgap-oh,w:vw,h:oh};
 return {map,vitals:v,objective:o,morality:mr};
}
function miniRect(){return hudStack().map;}
function pauseRect(){const w=clamp(W*.09,52,68),h=clamp(H*.045,28,36);return {x:W/2-w/2,y:8,w,h};}
function moralityRect(){return hudStack().morality;}
function pauseItemRects(){
 const cx=W/2,w=Math.min(360,W-40),x=cx-w/2;
 return [H*.38,H*.46,H*.54,H*.62].map(y=>({x,y:y-20,w,h:34}));
}
function titleItemRects(){
 const gapX=clamp(W*.035,10,20),gapY=clamp(H*.012,6,10);
 const w=Math.min(232,(W-44-gapX)/2),h=clamp(H*.085,46,64);
 const total=w*2+gapX,x=(W-total)/2;
 const y=clamp(H*.58,H*.52,H-(h*2+gapY)-Math.max(58,H*.10));
 return [0,1,2,3].map(i=>({x:x+(i%2)*(w+gapX),y:y+Math.floor(i/2)*(h+gapY),w,h}));
}
function titleInfoRect(){
 const r=clamp(W*.045,24,34);
 return {x:W-r-18,y:H-r-18,r};
}
function titleGithubRect(){return {x:10,y:10,r:18};}
function infoItemRects(){
 const w=Math.min(360,W-44),h=clamp(H*.09,50,66),gap=clamp(H*.02,10,16);
 const x=(W-w)/2,y=clamp(H*.46,H*.40,H-(h*2+gap)-H*.12);
 return [y,y+h+gap].map(yy=>({x,y:yy,w,h}));
}
function githubItemRects(){
 const w=Math.min(400,W-44),h=clamp(H*.09,46,60),gap=clamp(H*.014,8,12);
 const x=(W-w)/2,y=clamp(H*.40,H*.34,H-(h*3+gap*2)-H*.08);
 return [0,1,2].map(i=>({x,y:y+i*(h+gap),w,h}));
}
function exitGame(){
 try{if(window.ExitBridge&&window.ExitBridge.exit){window.ExitBridge.exit();return;}}catch(e){}
 try{if(window.close)window.close();}catch(e){}
}
function openExternalUrl(url){
 try{if(window.UrlBridge&&window.UrlBridge.open){window.UrlBridge.open(url);return;}}catch(e){}
 try{if(window.open)window.open(url,'_system');}catch(e){}
 try{window.location.href=url;}catch(e){}
}
function openGithub(){state='GITHUB';menuIdx=0;}
function settingsRects(){
 const w=Math.min(440,W-36),x=(W-w)/2;
 const top=Math.max(88,Math.min(H*.22,142));
 const gap=Math.min(72,(H-top-78)/4);
 return {
  lang:{x,y:top,w,h:42},
  music:{x,y:top+gap,w,h:54},
  sfx:{x,y:top+gap*2,w,h:54},
  controller:{x,y:top+gap*3,w,h:48},
  back:{x,y:top+gap*4,w,h:42}
 };
}
let padScroll=0,padChoice=0,controlsDrag=null;
function controlsLayout(){
 const w=Math.min(520,W-36),x=(W-w)/2,top=Math.max(76,H*.10);
 const footerY=H-64,gh=clamp((footerY-top-14)/7,32,46),gap=6;
 const step=gh+gap,trackH=footerY-top;
 const totalH=PAD_ACTIONS.length*step-gap;
 const maxScroll=Math.max(0,totalH-trackH);
 padScroll=clamp(padScroll,0,maxScroll);
 return {w,x,top,footerY,gh,gap,step,trackH,totalH,maxScroll,
  visible:Math.max(3,Math.floor(trackH/step))};
}
function controlsRects(){
 const L=controlsLayout(),fw=(L.w-8)/2;
 const rows=PAD_ACTIONS.map((a,i)=>
  ({x:L.x,y:L.top+i*L.step-padScroll,w:L.w,h:L.gh,action:a.key,index:i}));
 return {rows,layout:L,reset:{x:L.x,y:L.footerY,w:fw,h:40},
  back:{x:L.x+fw+8,y:L.footerY,w:fw,h:40}};
}
function controlsCount(){return PAD_ACTIONS.length+2;}
function scrollControls(delta){const L=controlsLayout();padScroll=clamp(padScroll+delta,0,L.maxScroll);}
function ensureControlVisible(){
 const c=controlsRects(),L=c.layout;
 if(menuIdx>=c.rows.length)return;
 const r=c.rows[menuIdx];
 if(r.y<L.top)padScroll=clamp(padScroll-(L.top-r.y),0,L.maxScroll);
 else if(r.y+r.h>L.footerY)
  padScroll=clamp(padScroll+(r.y+r.h-L.footerY),0,L.maxScroll);
}
function exitControls(){state='SETTINGS';menuIdx=3;padScroll=0;controlsDrag=null;}
function controlsConfirm(){
 const c=controlsRects();
 if(menuIdx<c.rows.length)GamepadSys.startCapture(c.rows[menuIdx].action);
 else if(menuIdx===c.rows.length)GamepadSys.reset();
 else exitControls();
}
function menuCount(){
 const counts={TITLE:4,PAUSE:4,SETTINGS:5,DEAD:2,VICTORY:3,INFO:2,ABOUT:1,HELP:1,GITHUB:3,
  MP_MENU:3,MP_COOP_MENU:3,MP_PVP_MODE:3,MP_PVP_JOIN:3,MP_LOBBY:3,MP_LOADOUT:1};
 return counts[state]||1;
}
function padCancel(){
 if(state==='CONTROLS')return exitControls();
 if(state==='GITHUB'){state='TITLE';menuIdx=0;return;}
 if(state==='INFO'){state='TITLE';menuIdx=0;return;}
 if(state==='ABOUT'||state==='HELP'){state=infoReturn||'TITLE';menuIdx=0;return;}
 if(state==='SETTINGS'){state=settingsReturn||'TITLE';menuIdx=0;settingsDrag=null;return;}
 if(state==='PAUSE'){menuIdx=0;advance();return;}
 if(state==='MP_MENU'){mpReset();state='TITLE';menuIdx=0;return;}
 if(state==='MP_COOP_MENU'||state==='MP_PVP_MODE'||state==='MP_PVP_JOIN'){state='MP_MENU';menuIdx=0;return;}
 if(state==='MP_LOBBY'){mpClose('Cancelled');return;}
 if(state==='MP_LOADOUT'){mpClose('Cancelled');return;}
 if(state==='DIALOGUE'||state==='PLAY')return;
 state='TITLE';menuIdx=0;
}
function handlePadInput(){
 const g=GamepadSys;if(!g.active)return;
 if(g.pressed('pause')){
  if(state==='PLAY')pauseGame();
  else if(state==='PAUSE'){menuIdx=0;advance();}
  else padCancel();
  return;
 }
 if(state==='TITLE'&&g.pressed('interact')){exitGame();return;}
 if(state==='CONTROLS'){
  if(g.down.up){menuIdx=Math.max(0,menuIdx-1);ensureControlVisible();}
  if(g.down.down){menuIdx=Math.min(controlsCount()-1,menuIdx+1);ensureControlVisible();}
  if(g.down.left||g.down.right){
   const L=controlsLayout(),step=Math.max(1,Math.floor(L.visible/2));
   menuIdx=clamp(menuIdx+(g.down.right?step:-step),0,controlsCount()-1);
   ensureControlVisible();}
  if(g.pressed('confirm'))controlsConfirm();
  if(g.pressed('cancel'))exitControls();
  return;
 }
 if(state==='DIALOGUE'&&dialogue&&dialogue.awaiting){
  const n=dialogue.options.length;
  if(padChoice>=n)padChoice=0;
  if(g.down.up||g.down.left)padChoice=(padChoice-1+n)%n;
  if(g.down.down||g.down.right)padChoice=(padChoice+1)%n;
  if(g.pressed('confirm'))applyChoice(padChoice);
  return;
 }
 if(state==='PLAY'){
  if(updatePadWheel(g))return;
  const directWeapon=g.pressed('weaponRifle')?'rifle':g.pressed('weaponShotgun')?'shotgun':null;
  if(directWeapon)switchWeapon(directWeapon);
  else {
   if(g.pressed('weaponPrev'))cycleWeapon(-1);
   if(g.pressed('weaponNext'))cycleWeapon(1);
  }
  const directAbility=['cloak','barrier','well','dash'].find(k=>g.pressed(k));
  if(directAbility)triggerDirectAbility(directAbility);
  if(g.pressed('melee')&&enemyInMeleeRange())triggerMelee();
  if(g.pressed('reload'))reloadWeapon();
  return;
 }
 if(g.down.up)menuIdx=Math.max(0,menuIdx-1);
 if(g.down.down)menuIdx=Math.min(menuCount()-1,menuIdx+1);
 if(state==='SETTINGS'){
  if(menuIdx===1||menuIdx===2){
   const dir=isRTL()?-1:1;
   if(g.down.left)nudgeSettingsVolume(menuIdx===1?'music':'sfx',-dir);
   if(g.down.right)nudgeSettingsVolume(menuIdx===1?'music':'sfx',dir);
  }
  if(g.pressed('confirm')){
   if(menuIdx===0)toggleLang();
   else if(menuIdx===3){state='CONTROLS';menuIdx=0;padScroll=0;}
   else if(menuIdx===4){state=settingsReturn||'TITLE';menuIdx=0;settingsDrag=null;}
  }
  if(g.pressed('cancel'))padCancel();
  return;
 }
 if(g.pressed('confirm'))advance();
 if(g.pressed('cancel'))padCancel();
}
function deadItemRects(){
 const w=Math.min(320,W-40),x=(W-w)/2;
 return [H*.60,H*.67].map(y=>({x,y:y-18,w,h:36}));
}
function victoryItemRects(){
 const w=Math.min(320,W-40),x=(W-w)/2;
 return [H*.72,H*.79,H*.86].map(y=>({x,y:y-18,w,h:36}));
}
function interactRect(){const w=Math.min(168,Math.max(112,W*.22));
 return {x:W/2-w/2,y:H-196,w:w,h:44};}
function nearObjective(){
 if(!player||objective.done)return false;
 const st=LEVELS[levelIdx]&&LEVELS[levelIdx].stages[objective.stage];
 if(!st||st.type==='boss'||st.type==='enable'||st.type==='destroy'||st.type==='defend')return false;
 return dist(player,currentObjectivePoint())<(st.radius||96)*1.45;
}
function holdingInteract(){
 return !!touch.interact||(mouse.down&&inRect(mouse.x,mouse.y,interactRect()))||!!keys[' '];
}
// Quick taps can begin and end between two animation frames. Consume a tap
// edge so grabbing / implanting never depends on the button still being held.
function interactPressed(){
 if(touch.interactTap){touch.interactTap=false;return true;}
 if(mouse.interactTap){mouse.interactTap=false;return true;}
 if(GamepadSys.pressed('interact'))return true;
 return holdingInteract();
}
// Screen-space pointer for the current objective. The camera never yaws, so
// its basis can be derived from camFocus without relying on camera.target.
function objectiveScreenPos(){
 const p=currentObjectivePoint(),cp=camera.position;
 let fx=camFocus.x-cp.x,fy=12-cp.y,fz=camFocus.y-6-cp.z;
 const fl=Math.hypot(fx,fy,fz)||1;fx/=fl;fy/=fl;fz/=fl;
 let rx=-fz,rz=fx;const rl=Math.hypot(rx,rz)||1;rx/=rl;rz/=rl;
 const ux=-fx*fy,uy=fx*fx+fz*fz,uz=-fz*fy;
 const dx=p.x-cp.x,dy=42-cp.y,dz=p.y-cp.z;
 const depth=dx*fx+dy*fy+dz*fz,dep=Math.max(1,depth);
 const tf=Math.tan(camera.fov*Math.PI/360);
 const nx=(dx*rx+dz*rz)/(dep*tf*camera.aspect);
 const ny=(dx*ux+dy*uy+dz*uz)/(dep*tf);
 return {x:(nx+1)*W/2,y:(1-ny)*H/2,on:Math.abs(nx)<.96&&Math.abs(ny)<.92&&depth>0};
}
const WEAPONS=['rifle','shotgun'];
const WDEF={
 rifle:{mag:24,reserve:480,label:'CARBINE',col:'#63e6ff'},
 shotgun:{mag:8,reserve:48,label:'SHOTGUN',col:'#ffb04a'}
};
function weaponRects(){
 // Match the top-left biotic button: same compact square and chamfer style.
 const ms=Math.min(84,Math.max(54,W*.10)),x=W-ms-10,y=12;
 return {panel:{x,y,w:ms,h:ms},left:{x:x+ms-30,y:y+ms-24,w:13,h:18},
  right:{x:x+ms-15,y:y+ms-24,w:13,h:18}};}
function wheelSlots(kind){
 // Only the owned weapons remain: first two arc positions so removing the
 // old outer slots does not leave a dead gap before the pair.
 if(kind==='weapon')return [
  {key:'rifle',label:'CARBINE',fa:'کاربین',col:'#63e6ff',pos:0,available:()=>true},
  {key:'shotgun',label:'SHOTGUN',fa:'شاتگان',col:'#ffb04a',pos:1,available:()=>true}];
 return [
  {key:'well',label:'WELL',fa:'چاه',col:'#9fd8ff',pos:0,available:()=>!!campaign.biotics.unlocked.well},
  {key:'dash',label:'DASH',fa:'داش',col:'#63e6ff',pos:1,available:()=>!!campaign.biotics.unlocked.dash},
  {key:'barrier',label:'BARRIER',fa:'سپر',col:'#7fffa0',pos:2,available:()=>!!campaign.biotics.unlocked.barrier}];
}
function wheelOptions(kind){return wheelSlots(kind).filter(s=>s.available());}
function wheelLabel(kind,s){return lang==='fa'?(s.fa||s.label):s.label;}
function wheelAnchor(kind){
 if(kind==='weapon'){const p=weaponRects().panel;return {cx:p.x+p.w/2,cy:p.y+p.h/2};}
 const r=bioticWheelRect();return {cx:r.x+r.w/2,cy:r.y+r.h/2};
}
// Original HUD wheels are four-button arcs tucked into the top corners. The
// centres sit just outside the screen; buttons follow the measured game arc.
function wheelGeom(kind){
 if(kind==='weapon')return {cx:W*1.0775,cy:H*.066,r:W*.263,
  angles:[2.96,2.70,2.39,2.08]};
 return {cx:-W*.021,cy:H*.105,r:W*.2075,
  angles:[.09,.48,.87,1.26]};
}
function wheelPoint(kind,i){
 const slot=wheelSlots(kind)[i],g=wheelGeom(kind),a=g.angles[slot?slot.pos:i];
 return {x:g.cx+Math.cos(a)*g.r,y:g.cy+Math.sin(a)*g.r};
}
function wheelIndexAt(x,y){
 const g=wheelGeom(wheel.kind),slots=wheelSlots(wheel.kind),
  ang=Math.atan2(y-g.cy,x-g.cx);
 let best=0,bd=Infinity;
 for(let i=0;i<slots.length;i++){
  const d=Math.abs(ang-g.angles[slots[i].pos]);
  if(d<bd){bd=d;best=i;}
 }
 return best;
}
// A pointer only commits when it finishes on an actual arc slot. Proximity,
// not elapsed time, is the gate: holding or jittering on the button must never
// cast by accident.
function wheelSlotAt(x,y){
 const slots=wheelSlots(wheel.kind),hit=Math.max(28,Math.min(W,H)*.055);
 let best=-1,bd=Infinity;
 for(let i=0;i<slots.length;i++){
  const p=wheelPoint(wheel.kind,i),d=Math.hypot(x-p.x,y-p.y);
  if(d<bd){bd=d;best=i;}}
 return bd<=hit?best:-1;
}
function beginWheel(kind,id,x,y){
 wheel.kind=kind;wheel.id=id;wheel.x0=x;wheel.y0=y;wheel.x=x;wheel.y=y;
 wheel.start=performance.now();wheel.active=false;wheel.activeAt=0;wheel.castReady=false;
 wheel.pointer=typeof id==='number';
 const slots=wheelSlots(kind);
 let i;
 if(kind==='weapon')i=slots.findIndex(s=>s.key===player.weapon);
 else{
  const act=activeBiotic();
  i=act?slots.findIndex(s=>s.key===act.key):slots.findIndex(s=>s.available());
 }
 wheel.idx=i<0?0:i;
 return true;
}
function moveWheel(id,x,y){
 if(wheel.id!==id)return;
 wheel.x=x;wheel.y=y;
 const moved=Math.hypot(x-wheel.x0,y-wheel.y0)>12;
 if(!wheel.active&&(moved||performance.now()-wheel.start>220)){
  wheel.active=true;wheel.activeAt=performance.now();}
 if(!wheel.active){wheel.castReady=false;return;}
 const hit=wheelSlotAt(x,y);
 if(hit>=0){wheel.idx=hit;wheel.castReady=true;}
 else wheel.castReady=false;
}
function endWheel(id,x,y){
 if(wheel.pointer&&typeof x==='number'&&typeof y==='number')moveWheel(id,x,y);
 if(wheel.id!==id)return;
 const kind=wheel.kind,idx=wheel.idx,cast=wheel.castReady;
 wheel.kind=null;wheel.id=null;wheel.active=false;wheel.castReady=false;wheel.pointer=false;
 if(!kind)return;
 const slot=wheelSlots(kind)[idx];
 if(cast){
  if(!slot||!slot.available()){
   msg=lang==='fa'?'اسلات قفل است':'SLOT LOCKED';msgT=1;
   AudioSys.tone(120,.1,'square',.02);return;}
  if(kind==='weapon')switchWeapon(slot.key);
  // The biotic wheel is a direct-cast wheel: release on a power to use it,
  // never to equip a hidden quick slot.
  else triggerBioticAbility(slot.key);
 } else if(kind==='weapon')reloadWeapon();
 // Pressing/holding the biotic button itself only opens the wheel.
}
// Gamepad-held HUD wheels: L3 opens the weapon wheel, R3 the biotic wheel.
// D-pad left/right moves the highlighted slot; releasing casts/chooses it.
function updatePadWheel(g){
 const kind=g.heldAction('weaponWheel')?'weapon':g.heldAction('bioticWheel')?'biotic':null;
 if(kind){
  if(!padWheel||padWheel.kind!==kind){
   const a=wheelAnchor(kind);
   beginWheel(kind,'pad-'+kind,a.cx,a.cy);wheel.active=true;wheel.activeAt=performance.now();wheel.castReady=true;
   padWheel={kind,id:'pad-'+kind};
  }
  const slots=wheelSlots(kind);
  if(g.pressed('weaponPrev'))wheel.idx=(wheel.idx-1+slots.length)%slots.length;
  if(g.pressed('weaponNext'))wheel.idx=(wheel.idx+1)%slots.length;
  return true;
 }
 if(padWheel){
  const k=padWheel.kind,id=padWheel.id,a=wheelAnchor(k);
  padWheel=null;
  endWheel(id,a.cx,a.cy);
  return true;
 }
 return false;
}
function cycleWeapon(d){
 const i=WEAPONS.indexOf(player.weapon);
 switchWeapon(WEAPONS[(i+d+WEAPONS.length)%WEAPONS.length]);
}
function switchWeapon(w){
 if(!player||player.dead||player.weapon===w)return;
 if(mp.active&&mp.loadout&&w!==mp.loadout.weapon){msg=T('loadoutLocked');msgT=.8;return;}
 player.wammo[player.weapon]=player.ammo;
 player.weapon=w;player.maxammo=WDEF[w].mag;player.ammo=player.wammo[w];
 player.reload=0;player.fire=Math.max(player.fire,.3);
 AudioSys.tone(w==='shotgun'?160:320,.12,'square',.045,120);
 msg=(lang==='fa'?(w==='rifle'?'کاربین':'شاتگان'):WDEF[w].label)+T('equipped');msgT=.9;
}
function reloadDuration(w){return w==='shotgun'?1.35:1;}
function reloadWeapon(){
 if(!player||player.dead||player.reload>0)return false;
 if(player.ammo>=player.maxammo||player.reserve[player.weapon]<=0){
  AudioSys.tone(120,.07,'square',.025);return false;}
 player.reload=reloadDuration(player.weapon);
 AudioSys.tone(200,.1,'square',.04);
 msg=T('reloading');msgT=.75;
 return true;
}
function inRect(x,y,r){return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;}
function indexAt(rects,x,y){for(let i=0;i<rects.length;i++)if(inRect(x,y,rects[i]))return i;return -1;}
const DASH_RANGE=180,DASH_CD=9,WELL_CD=12,
 // All three biotics share one cooldown; it also outlasts every active effect
 // so a second biotic can never start while the first is still running.
 BIOTIC_CD=12,CLOAK_DUR=3.5,CLOAK_CD=9,
 BARRIER_DUR=10,BARRIER_CD=16,
 MELEE_DUR=.32,MELEE_CD=.55,MELEE_REACH=14;
// Only room walls and locked bulkheads stop a dash. Cover tiles (2) and
// barrels are in-room obstacles the biotic dash passes straight through.
function dashWallAt(x,y,r=0){return r?solidCircle(x,y,r):wallAtTile(Math.floor(x/TILE),Math.floor(y/TILE));}
function clearDashLine(ax,ay,bx,by,r=0){
 const d=Math.hypot(bx-ax,by-ay),steps=Math.max(1,Math.ceil(d/8));
 for(let i=1;i<=steps;i++){
  const t=i/steps;
  if(dashWallAt(ax+(bx-ax)*t,ay+(by-ay)*t,r))return false;
 }
 return true;
}
function clipDashToWalls(from,to,r=0){
 const d=Math.hypot(to.x-from.x,to.y-from.y),steps=Math.max(1,Math.ceil(d/6));
 let last={x:from.x,y:from.y};
 for(let i=1;i<=steps;i++){
  const t=i/steps,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t;
  if(dashWallAt(x,y,r))break;
  last={x,y};
 }
 return last;
}
function bioticCooling(){
 if(!player||player.biot<=0)return false;
 msg=T('bioticCooldown');msgT=.8;
 AudioSys.tone(120,.08,'square',.02);return true;
}
function triggerDash(){
 if(!player||player.dead||player.dash||bioticCooling())return;
 const targets=enemies.filter(e=>!e.dead&&dist(e,player)<DASH_RANGE&&
  clearDashLine(player.x,player.y,e.x,e.y,player.r))
  .sort((a,b)=>dist(a,player)-dist(b,player)).slice(0,6);
 const pts=[];let cur={x:player.x,y:player.y};
 for(const e of targets){
  const hit=clipDashToWalls(cur,{x:e.x,y:e.y},player.r);
  if(Math.hypot(hit.x-e.x,hit.y-e.y)>18)break;   // wall blocks this target and the rest
  pts.push({x:e.x,y:e.y,e});cur={x:e.x,y:e.y};
 }
 if(!targets.length){
  const hit=clipDashToWalls(cur,{x:cur.x+Math.cos(aimDir)*190,y:cur.y+Math.sin(aimDir)*190},player.r);
  if(Math.hypot(hit.x-cur.x,hit.y-cur.y)>10)pts.push({x:hit.x,y:hit.y,e:null});
 }else{
  const prev=pts.length>1?pts[pts.length-2]:{x:player.x,y:player.y};
  const a=Math.atan2(cur.y-prev.y,cur.x-prev.x);
  const hit=clipDashToWalls(cur,{x:cur.x+Math.cos(a)*70,y:cur.y+Math.sin(a)*70},player.r);
  if(Math.hypot(hit.x-cur.x,hit.y-cur.y)>10)pts.push({x:hit.x,y:hit.y,e:null});
 }
 if(!pts.length){msg=lang==='fa'?'مسیر دش باز نیست':'NO CLEAR DASH PATH';msgT=.9;return;}
 const first=pts[0];
 player.dash={pts,i:0,t:0,from:{x:player.x,y:player.y},to:first,
  dur:clamp(Math.hypot(first.x-player.x,first.y-player.y)/1400,.07,.2),
  ang:Math.atan2(first.y-player.y,first.x-player.x)};
 player.biot=BIOTIC_CD;
 burst(player.x,player.y,18,0x9fd8ff,1.1);
 addBlastLight(player.x,player.y,0x63e6ff,70,200,.22);
 AudioSys.biotic();AudioSys.noise(.3,.06);
 msg=targets.length?(lang==='fa'?'دش بیوتیک — '+targets.length+' هدف':'BIOTIC DASH — '+targets.length+' TARGET'+(targets.length>1?'S':'')):(lang==='fa'?'دش بیوتیک':'BIOTIC DASH');
 msgT=1.2;shake=Math.max(shake,6);
}
function dashImpact(point,ang){
 const x=point.x,y=point.y;
 burst(x,y,22,0xbfe8ff,1.5);
 addBlastLight(x,y,0x9fd8ff,90,190,.2);
 shake=Math.max(shake,8);flash=Math.max(flash,.14);
 AudioSys.tone(240,.12,'sawtooth',.05,-80);
 if(point.e&&!point.e.dead){
  damageEnemy(point.e,150,'dash');point.e.stun=Math.max(point.e.stun,.7);
  point.e.vx+=Math.cos(ang)*280;point.e.vy+=Math.sin(ang)*280;
 }
 for(const e of enemies){
  if(e.dead||e===point.e)continue;
  if(dist(e,point)<70&&clearDashLine(x,y,e.x,e.y,player.r)){
   damageEnemy(e,45,'dash');e.stun=Math.max(e.stun,.4);}
 }
}
function updateDash(dt){
 const d=player.dash;if(!d)return;
 d.t+=dt;const k=clamp(d.t/d.dur,0,1);
 const nx=lerp(d.from.x,d.to.x,k),ny=lerp(d.from.y,d.to.y,k);
 if(Math.random()<.8)addPart({x:player.x+rnd(-8,8),y:player.y+rnd(-8,8),
  vx:rnd(-30,30),vy:rnd(-30,30),life:rnd(.12,.3),c:0x9fd8ff,s:rnd(2,5)});
 player.ang=d.ang;player.x=nx;player.y=ny;
 player.vx=(d.to.x-d.from.x)/d.dur;player.vy=(d.to.y-d.from.y)/d.dur;
 if(k<1)return;
 dashImpact(d.to,d.ang);d.i++;
 if(d.i>=d.pts.length){player.dash=null;player.vx=0;player.vy=0;return;}
 d.from=d.to;d.to=d.pts[d.i];
 d.dur=clamp(Math.hypot(d.to.x-d.from.x,d.to.y-d.from.y)/1400,.07,.2);
 d.ang=Math.atan2(d.to.y-d.from.y,d.to.x-d.from.x);d.t=0;
}
function cloakVisual(on){
 if(!player||!player.mesh)return;
 player.mesh.traverse(o=>{
  if(!o.isMesh||!o.material)return;
  const m=o.material;
  if(on){
   if(!o.__cloak)o.__cloak={op:m.opacity,em:m.emissiveIntensity,
    ec:m.emissive?m.emissive.getHex():0};
   m.transparent=true;m.depthWrite=false;
  }else if(o.__cloak){
   m.opacity=o.__cloak.op;m.transparent=o.__cloak.op<1;m.depthWrite=true;
   if(m.emissiveIntensity!==undefined)m.emissiveIntensity=o.__cloak.em;
   if(m.emissive&&m.emissive.setHex)m.emissive.setHex(o.__cloak.ec);
   o.__cloak=null;
  }
 });
}
function triggerCloak(){
 if(!player||player.dead||player.cloak>0||player.cloakCd>0)return;
 player.cloak=CLOAK_DUR;player.cloakCd=CLOAK_CD;
 cloakVisual(true);
 for(const b of bullets)if(b.enemy){burst(b.x,b.y,4,0x63e6ff,.4);b.life=0;}
 for(const e of enemies)if(!e.dead){e.charge=0;e.fire=Math.max(e.fire,rnd(.9,1.6));}
 AudioSys.cloak();msg=lang==='fa'?'پنهان‌سازی فعال':'CLOAK ENGAGED';msgT=1.1;
}
function clearBarrierFx(){
 if(!player||!player.barrierFx)return;
 for(const o of player.barrierFx)fxG.remove(o);
 player.barrierFx=null;
}
function castBarrier(){
 if(!player||player.dead||player.barrier>0||bioticCooling())return;
 player.barrier=BARRIER_DUR;player.biot=BIOTIC_CD;
 clearBarrierFx();
 const cage=new THREE.Mesh(DODEC,BARRIER_SHELL_MAT);cage.scale.setScalar(38);
 const nodeA=new THREE.Mesh(OCT,BARRIER_NODE_MAT);
 const nodeB=new THREE.Mesh(OCT,BARRIER_NODE_MAT);
 fxG.add(cage,nodeA,nodeB);
 player.barrierFx=[cage,nodeA,nodeB];
 burst(player.x,player.y,24,0x7fffa0,1.1);
 AudioSys.biotic();msg=lang==='fa'?'سپر بیوتیک':'BIOTIC BARRIER';msgT=1.3;
}
function triggerBiotic(){
 if(!player||player.dead||fields.length||bioticCooling())return;
 player.biot=BIOTIC_CD;AudioSys.biotic();
 const f={x:player.x,y:player.y,r:270,life:4.2,maxLife:4.2,t:0};
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.02,8,48),
  new THREE.MeshBasicMaterial({color:0x9fd8ff,transparent:true,opacity:.75}));
 ring.rotation.x=-Math.PI/2;ring.position.set(f.x,3,f.y);fxG.add(ring);f.mesh=ring;
 const core=new THREE.Mesh(SPH,new THREE.MeshBasicMaterial({color:0xbfe8ff,
  transparent:true,opacity:.32}));
 core.position.set(f.x,30,f.y);fxG.add(core);f.core=core;
 const shock=new THREE.Mesh(new THREE.TorusGeometry(1,.035,8,64),
  new THREE.MeshBasicMaterial({color:0xdff6ff,transparent:true,opacity:.95}));
 shock.rotation.x=-Math.PI/2;shock.position.set(f.x,5,f.y);fxG.add(shock);f.shock=shock;
 const ring2=new THREE.Mesh(new THREE.TorusGeometry(1,.02,8,48),
  new THREE.MeshBasicMaterial({color:0x7fd4ff,transparent:true,opacity:.6}));
 ring2.position.set(f.x,38,f.y);fxG.add(ring2);f.ring2=ring2;
 const light=new THREE.PointLight(0x9fe8ff,80,320,1);
 light.position.set(f.x,40,f.y);fxG.add(light);f.light=light;
 for(let i=0;i<28;i++){
  const a=rnd(0,TAU),v=rnd(260,540);
  addPart({x:f.x,y:f.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,
   life:rnd(.25,.55),c:i%3?0x9fd8ff:0xeaffff,s:rnd(2,5)});
 }
 fields.push(f);shake=14;flash=.35;msg=lang==='fa'?'تکینگی بیوتیک':'BIOTIC SINGULARITY';msgT=1.4;
}
uiCvs.addEventListener('touchstart',e=>{AudioSys.init();e.preventDefault();
 if(state!=='PLAY')return;
 const PR=pauseRect();
 for(const t of e.changedTouches)if(inRect(t.clientX,t.clientY,PR)){pauseGame();return;}
 const P=firePad(),I=interactRect(),M=meleeRect(),
  BR=bioticWheelRect(),WR=weaponRects().panel,C=cloakRect();
 for(const t of e.changedTouches){
  if(enemyInMeleeRange()&&inRect(t.clientX,t.clientY,M)){triggerMelee();continue;}
  if(Math.hypot(t.clientX-C.cx,t.clientY-C.cy)<=C.r){triggerCloak();continue;}
  if(inRect(t.clientX,t.clientY,BR)){
   if(beginWheel('biotic',t.identifier,t.clientX,t.clientY))continue;}
  if(inRect(t.clientX,t.clientY,WR)){
   if(beginWheel('weapon',t.identifier,t.clientX,t.clientY))continue;}
  if(nearObjective()&&inRect(t.clientX,t.clientY,I)){
   touch.interact={id:t.identifier};touch.interactTap=true;continue;}
  if(Math.hypot(t.clientX-P.cx,t.clientY-P.cy)<P.r*1.12&&!touch.fire){
   touch.fire={id:t.identifier,cx:P.cx,cy:P.cy,r:P.r,ox:0,oy:0};continue;}
  // Right side outside the ring is a look-only drag: it rotates the aim but
  // never fires. Left half remains movement.
  if(t.clientX>W*.5&&!touch.look){
   touch.look={id:t.identifier,x0:t.clientX,y0:t.clientY,ang0:aimDir};continue;}
  if(t.clientX<W*.45&&!touch.move)
   touch.move={id:t.identifier,x0:t.clientX,y0:t.clientY,x:t.clientX,y:t.clientY};
 }},{passive:false});
uiCvs.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches){
 moveWheel(t.identifier,t.clientX,t.clientY);
 if(touch.move&&t.identifier===touch.move.id){touch.move.x=t.clientX;touch.move.y=t.clientY;}
 if(touch.look&&t.identifier===touch.look.id){
  aimDir=touch.look.ang0+(t.clientX-touch.look.x0)*.008+
   (t.clientY-touch.look.y0)*.003;
  aimPoint.x=player.x+Math.cos(aimDir)*300;
  aimPoint.y=player.y+Math.sin(aimDir)*300;}
 if(touch.fire&&t.identifier===touch.fire.id){
  let dx=t.clientX-touch.fire.cx,dy=t.clientY-touch.fire.cy;
  const mag=Math.hypot(dx,dy),lim=touch.fire.r;
  if(mag>lim){dx=dx/mag*lim;dy=dy/mag*lim;}
  touch.fire.ox=dx;touch.fire.oy=dy;}}},{passive:false});
function endTouch(e){for(const t of e.changedTouches){
 endWheel(t.identifier,t.clientX,t.clientY);
 if(touch.look&&t.identifier===touch.look.id)touch.look=null;
 if(touch.interact&&t.identifier===touch.interact.id)touch.interact=null;
 if(touch.move&&t.identifier===touch.move.id)touch.move=null;
 if(touch.fire&&t.identifier===touch.fire.id)touch.fire=null;}}
uiCvs.addEventListener('touchend',endTouch);uiCvs.addEventListener('touchcancel',endTouch);

/* ---------------- LEVELS ---------------- */
const TILE=56;
const LEVELS=[
 {name:'01 · SUR’KESH REBUILD',sub:'CERBERUS BLACK SITE — INFILTRATION',w:34,h:24,theme:'snow',
  brief:'The facility you burned on Sur’Kesh has been rebuilt. A ghost signal is broadcasting Inali Renata’s voice from its data core. The Alliance sends you back — with a Volus defector in your ear — to seize the experiments before Cerberus moves them.',
  intro:[['VOLUS','Randall Ezno. Officially, you died at Sur’Kesh. Three cycles ago, a relay began transmitting in Lieutenant Inali Renata’s voice.'],
         ['RANDALL','I lowered the gun. Cerberus took her anyway. Now her voice is coming out of a data core.'],
         ['VOLUS','Then move. Bypass the bay security, clear the vault, pull the data from the core, and get back here.']],
  goal:'BYPASS BAY SECURITY',
  rooms:[{x:2,y:5,w:12,h:11},{x:17,y:2,w:9,h:9},{x:25,y:13,w:8,h:8}],
  corridors:[[13,9,20,9],[20,9,20,6],[25,6,28,6],[28,6,28,15]],
  doors:[[16,9],[28,11]], start:[4,10],
  cover:[[5,7],[8,12],[11,9],[19,4],[22,8],[20,10],[27,15],[30,18],[28,19]],
  pickup:[['shield',6,11],['med',20,5],['ammo',29,16]],
  barrels:[[9,9],[18,6],[20,8],[28,16]],
  initial:[['trooper',6,8],['trooper',9,12],['elite',11,7]],
  stages:[
   {label:'BYPASS BAY SECURITY',pos:[10,13],type:'enable',
    nodes:[[8,10],[12,11],[11,15]],unlock:0,
    ambush:[['trooper',11,6],['trooper',8,14]],
    spawn:[['trooper',19,3],['trooper',23,8]],msg:'SECURITY NODES LINKED — VAULT UNSEALED'},
   {label:'DESTROY THE VAULT CIPHER',pos:[21,5],type:'destroy',hp:170,unlock:1,
    ambush:[['trooper',18,3],['trooper',24,9]],
    spawn:[['elite',27,14],['warden',31,15]],msg:'CIPHER DESTROYED — DATA CORE OPEN'},
   {label:'IMPLANT THE INALI SHARD',pos:[29,17],type:'implant',source:[26,14],
    ambush:[['trooper',26,19],['elite',31,14]],
    msg:'SHARD IMPLANTED — INTEL SECURED'},
   {label:'DEFEND THE LANDING BAY',pos:[4,12],type:'defend',dur:16,hp:120,
    waves:[[['trooper',8,14],['elite',11,11]],[['trooper',6,9]]],
    ambush:[['trooper',6,14]],msg:'EXTRACTION CALLED'}]},

 {name:'02 · ALLIANCE COMM RELAY',sub:'UPLINK STATION — TRANSMIT THE TRUTH',w:32,h:26,theme:'relay',
  brief:'The data proves Cerberus rebuilt Overlord with Inali’s mind as its core. Deliver it to the Alliance and the Illusive Man loses his greatest weapon. UDI has turned the relay’s own security against you.',
  intro:[['VOLUS','Security is ours until UDI wakes up. Override the access panel, then bring relay control online.'],
         ['RANDALL','Once the truth is out, he will burn every facility to erase the proof.'],
         ['DIRECTOR','You spared her once. I corrected that mistake. Come and see what I rebuilt from her.']],
  goal:'OVERRIDE ACCESS PANEL',
  rooms:[{x:2,y:11,w:7,h:5},{x:13,y:4,w:8,h:7},{x:23,y:14,w:7,h:8}],
  corridors:[[9,13,16,13],[16,13,16,8],[20,7,26,7],[26,7,26,16]],
  doors:[[12,13],[26,11]], start:[3,13],
  cover:[[4,12],[6,14],[15,6],[18,9],[25,15],[27,19]],
  pickup:[['med',5,14],['ammo',17,6],['shield',27,17]],
  barrels:[[8,13],[17,5],[19,9],[26,16]],
  initial:[['trooper',4,14],['elite',7,12]],
  stages:[
   {label:'OVERRIDE ACCESS PANEL',pos:[7,13],type:'enable',
    nodes:[[3,13],[5,11],[7,12]],unlock:0,
    ambush:[['trooper',3,11],['trooper',7,15]],
    spawn:[['mech',15,9],['trooper',19,5]],msg:'ACCESS NODES LINKED — CORRIDOR OPEN'},
   {label:'SHATTER THE UDI JAMMER',pos:[16,6],type:'destroy',hp:210,unlock:1,
    ambush:[['trooper',14,9],['mech',19,4]],
    spawn:[['elite',25,15],['phantom',28,16]],msg:'JAMMER DESTROYED — UPLINK OPEN'},
   {label:'IMPLANT THE RELAY KEY',pos:[28,20],type:'implant',source:[23,17],
    ambush:[['elite',24,18],['technician',29,15]],
    msg:'RELAY KEY SEATED — UPLOAD BEGINNING'},
   {label:'DEFEND THE COMMS LOCK',pos:[3,12],type:'defend',dur:18,hp:140,
    waves:[[['trooper',5,11],['elite',7,15]],[['mech',6,14]]],
    ambush:[['trooper',5,11]],msg:'CHANNEL SECURED'}]},

 {name:'02A · ATLAS INTERDICT',sub:'CERBERUS PURGE SWEEP — BREAK THE CORDON',w:28,h:22,theme:'snow',
  brief:'The relay broadcast puts Cerberus on a timer. A Praetorian coordinator is erasing every witness between you and the desert redoubt. Break its cordon before the purge reaches the survivors.',
  intro:[['VOLUS','Cerberus purge teams are sweeping the approach. One Praetorian is coordinating them — its null field shreds barriers and cloaks. It has a list, and it is working through it.'],
         ['RANDALL','Then we take the coordinator first. Everything else is noise.']],
  goal:'BREAK THE ATLAS CORDON',
  rooms:[{x:2,y:3,w:7,h:6},{x:12,y:5,w:8,h:7},{x:22,y:10,w:5,h:8}],
  corridors:[[8,6,13,6],[19,9,23,9],[23,9,23,12]],
  doors:[[11,6],[23,10]], start:[3,6],
  cover:[[4,5],[6,7],[14,6],[17,9],[24,12],[25,15]],
  pickup:[['med',5,7],['ammo',16,8],['shield',24,14]],
  barrels:[[9,6],[18,9],[22,12]],
  initial:[['trooper',4,5],['elite',7,7]],
  stages:[
   {label:'BREAK THE ATLAS CORDON',pos:[7,6],type:'destroy',hp:220,unlock:0,
    ambush:[['technician',6,4],['trooper',8,8]],
    spawn:[['elite',14,7],['warden',17,6]],msg:'CORDON RELAY DOWN — GATE OPEN'},
   {label:'PLANT THE ATLAS BLACKBOX',pos:[18,9],type:'implant',source:[13,6],unlock:1,
    ambush:[['phantom',15,10],['technician',18,6]],
    spawn:[['elite',22,11],['trooper',23,12]],msg:'BLACKBOX SEEDED — CORDON COLLAPSING'},
   {label:'DEFEAT THE PRAETORIAN',pos:[24,13],type:'boss',
    ambush:[['praetorian',24,13]],msg:'PRAETORIAN DOWN — INTERDICT BROKEN'}]},
 {name:'02B · TALON AMBUSH',sub:'ORBITAL DROP — SILENCE THE INTERCEPT',w:30,h:24,theme:'relay',
  brief:'A Cerberus Talon team is falling in ahead of the convoy. Their Lancer marks the shot; a Juggernaut escort — unaffiliated, uncontrolled, and brutally protective — follows his own code. Cut the beacon, blind the uplink, then face each in turn.',
  intro:[['VOLUS','Talons have dropped ahead of us. The Lancer uses a rail lance. Behind him walks a Juggernaut with a biotic hammer — Cerberus built him, then lost him.'],
         ['DIRECTOR','You are predictable, Ezno. I counted on you coming through the relay.'],
         ['RANDALL','Then count on me stopping the shot. And the hammer.']],
  goal:'RESTORE THE NAV BEACON',
  rooms:[{x:2,y:2,w:7,h:6},{x:12,y:7,w:8,h:8},{x:22,y:13,w:7,h:8}],
  corridors:[[8,5,13,5],[13,5,13,9],[19,11,23,11],[23,11,23,14]],
  doors:[[11,5],[23,12]], start:[3,5],
  cover:[[4,4],[6,6],[15,9],[18,12],[24,15],[27,18]],
  pickup:[['med',5,6],['ammo',16,11],['shield',25,17]],
  barrels:[[9,5],[18,11],[22,14]],
  initial:[['elite',4,4],['phantom',7,6]],
  stages:[
   {label:'RESTORE THE NAV BEACON',pos:[6,5],type:'enable',unlock:0,nodes:[[3,5],[5,3],[7,6]],
    ambush:[['trooper',7,4],['technician',5,7]],
    spawn:[['warden',15,9],['elite',18,12]],msg:'NAV BEACON ONLINE — TALON ROUTE OPEN'},
   {label:'CRIPPLE THE INTERCEPT UPLINK',pos:[18,11],type:'destroy',hp:250,unlock:1,
    ambush:[['phantom',16,9],['trooper',19,13]],
    spawn:[['technician',24,15],['elite',27,16]],msg:'UPLINK DOWN — LANCER EXPOSED'},
   {label:'HUNT THE TALON LANCER',pos:[25,16],type:'boss',
    ambush:[['lancer',25,16],['phantom',27,18]],msg:'TALON LANCER DOWN — HAMMER EXPOSED'},
   {label:'FACE THE JUGGERNAUT',pos:[26,19],type:'boss',
    ambush:[['juggernaut',26,19]],msg:'JUGGERNAUT STANDS DOWN — EAST RUIN NEXT'},
   {label:'HIS OWN WAR',pos:[25,18],type:'defend',dur:16,hp:220,
    waves:[[['elite',24,17]],[['phantom',27,19]],[['warden',28,18]]],
    msg:'CONVOY CLEAR — JUGGERNAUT JOINS THE FIGHT'}]},
 {name:'03 · DESERT REDOUBT',sub:'CERBERUS STRONGHOLD — CONFRONT THE DIRECTOR',w:30,h:30,theme:'desert',
  brief:'The Director has taken the reconstructed Inali to a desert redoubt. She is no longer the woman Randall knew — she is his controllable biotic soldier, built to break targets like Ezno. Bring her in, or watch her be unmade again.',
  intro:[['DIRECTOR','Fitting that you return to my workshop. She remembers your pulse — I taught her to hunt it.'],
         ['INALI','Target acquired. I can take him down before the others breach. ...Randall, I still remember the taste of rain on Sur’Kesh. I would trade that memory for one minute where my hands obey me. Do not make me ask twice. I need a way out of this body, not your pity.'],
         ['RANDALL','The woman I knew is buried under your work. I will dig her out or put the thing down.'],
         ['DIRECTOR','Then come. Let her argue with herself while you die.']],
  goal:'BREAK THE PERIMETER GENERATOR',
  rooms:[{x:2,y:12,w:7,h:6},{x:12,y:9,w:9,h:11},{x:23,y:4,w:6,h:9}],
  corridors:[[9,15,14,15],[20,12,25,12],[25,12,25,8]],
  doors:[[11,15],[25,10]], start:[3,15],
  cover:[[4,14],[6,16],[14,11],[17,14],[19,18],[25,6],[27,10]],
  pickup:[['med',5,16],['ammo',16,17],['shield',24,7]],
  barrels:[[8,15],[14,13],[17,16],[25,8]],
  initial:[['trooper',5,14],['technician',7,16]],
  stages:[
   {label:'BREAK THE PERIMETER GENERATOR',pos:[7,14],type:'destroy',hp:240,unlock:0,
    ambush:[['trooper',7,12],['elite',3,17]],
    spawn:[['trooper',14,16],['warden',18,12]],msg:'GENERATOR DESTROYED — SHIELD DOWN'},
   {label:'WAKE THE DIRECTOR',pos:[18,17],type:'enable',
    nodes:[[15,17],[16,12],[18,16]],unlock:1,
    ambush:[['trooper',13,15],['phantom',19,10]],
    spawn:[['boss',26,8]],msg:'CORE NODES LINKED — THE DIRECTOR WAKES'},
   {label:'DESTROY THE DIRECTOR',pos:[26,8],type:'boss',
    ambush:[['technician',24,10],['phantom',27,6]],msg:'THE DIRECTOR IS DOWN'}]}
];

const PVP_LEVEL={
 name:'PVP · SURVIVAL ARENA',sub:'TWO-PLAYER COMBAT SIM',w:20,h:16,theme:'relay',
 brief:'Two operatives. One arena. No story, no mercy.',
 intro:[['SYSTEM','PvP Survival: fight the other operative. Limited ability uses.']],
 goal:'ELIMINATE THE OTHER OPERATIVE',
 rooms:[{x:1,y:1,w:6,h:5},{x:13,y:1,w:6,h:5},{x:7,y:6,w:6,h:4},{x:1,y:10,w:6,h:5},{x:13,y:10,w:6,h:5}],
 corridors:[[6,3,8,3],[12,3,14,3],[4,5,4,7],[15,5,15,7],[4,9,4,11],[15,9,15,11],[6,12,8,12],[12,12,14,12],[9,6,9,7],[10,9,10,11]],
 doors:[], start:[3,3], start2:[16,12],
 cover:[[3,2],[16,2],[9,7],[10,8],[3,13],[16,13],[8,3],[11,12]],
 pickup:[['ammo',3,12],['shield',16,3],['med',10,7]],
 barrels:[[5,4],[14,4],[5,11],[14,11],[10,10]],
 initial:[],
 stages:[{label:'PVP SURVIVAL',pos:[10,8],type:'enable',nodes:[],msg:'ROUND OVER'}]
};

/* ---------------- BRANCHING STORY ---------------- */
function choice(who,text,options){return [who,text,options];}
const STORY={
 intro(i){
  if(i===0)return LEVELS[0].intro.concat([choice('VOLUS',
   'Before we breach: how do we handle a signal that may be Lieutenant Renata?',[
    {tone:'paragon',label:'Trust the signal. Bring her home.',flag:'trustInali',
     reply:[['RANDALL','If she is still in there, she deserves a way out. We take the core intact.'],
            ['VOLUS','Then I will route extra shielding to your suit. Try not to make me regret it.']]},
    {tone:'renegade',label:'It is a trap. Burn the voice.',flag:'distrustInali',
     reply:[['RANDALL','Whatever answers, I put it down. Inali died in that lab.'],
            ['VOLUS','Blunt. Efficient. Cerberus will expect that from you.']]}
   ])]);
  if(i===1){
   const opening=campaign.flags.trustInali
    ? ['VOLUS','Your faith in her bought us a clean uplink. The relay still answers to Inali’s cipher.']
    : ['VOLUS','You cut the voice off. The Core is unstable — expect UDI to throw everything at us.'];
   return [opening].concat(LEVELS[1].intro.slice(1),[
    choice('DIRECTOR','You can still walk away, Ezno. Hand me the data and my soldier stays intact.',[
     {tone:'paragon',label:'Broadcast everything. Let the Alliance decide.',flag:'broadcastTruth',
      reply:[['RANDALL','The truth goes out. All of it. If that burns you, good.'],
             ['DIRECTOR','Then I will erase every witness before the signal leaves this station.']]},
     {tone:'renegade',label:'Use the data as leverage. You answer to me now.',flag:'weaponizeTruth',
      reply:[['RANDALL','I am not your courier. I am the price you pay.'],
             ['DIRECTOR','Crueler than I taught you. Excellent.']]}
    ])]);
  }
  if(i===2){
   const opening=campaign.flags.trustAtlas
    ? ['VOLUS','You shared the survivor list. Cerberus knows exactly who can identify the core.']
    : ['VOLUS','You kept the survivor list to yourself. Cerberus is hunting blind — for now.'];
   return [opening].concat(LEVELS[2].intro.slice(1),[
    choice('VOLUS','The Praetorian is moving witnesses into the cordon. Your call.',[
     {tone:'paragon',label:'Share the evacuation route. Save the witnesses.',flag:'trustAtlas',
      reply:[['RANDALL','Get them out. I will draw the Praetorian off.'],
             ['VOLUS','Route open. You just made yourself the target.']]},
     {tone:'renegade',label:'Keep the route. Close the net on the Praetorian.',flag:'isolateAtlas',
      reply:[['RANDALL','Witnesses wait. The coordinator does not.'],
             ['VOLUS','Cold. Efficient. The route stays dark.']]}
    ])]);
  }
  if(i===3){
   const opening=campaign.flags.acceptTalonDeal
    ? ['DIRECTOR','You took my Talon bargain. The Lancer knows you will hesitate.']
    : ['DIRECTOR','You refused my Talon bargain. The Lancer has orders to make you regret it.'];
   return [opening].concat(LEVELS[3].intro.slice(1),[
    choice('DIRECTOR','The Lancer is close enough to hear this channel. Your call.',[
     {tone:'paragon',label:'Warn the convoy. No deal.',flag:'refuseTalonDeal',
      reply:[['RANDALL','Convoy, scatter. The shot goes through me first.'],
             ['DIRECTOR','Sentiment. It makes the shot cleaner.']]},
     {tone:'renegade',label:'Offer the convoy as bait.',flag:'acceptTalonDeal',
      reply:[['RANDALL','Let them take the bait. I take the Lancer.'],
             ['DIRECTOR','Now you are learning.']]}
    ])]);
  }
  const opening=campaign.flags.broadcastTruth
   ? ['DIRECTOR','You published her confession. The Alliance is watching this redoubt as we speak.']
   : ['DIRECTOR','You turned Inali’s mind into a weapon. Tell me, Ezno — which of us is the monster now?'];
  const mid=campaign.flags.warnConvoy
   ? ['VOLUS','The Atlas witnesses made it out. They will testify.']
   : ['VOLUS','The Atlas survivors are still missing. The record has holes.'];
  return [opening,mid].concat(LEVELS[4].intro.slice(1),[
   choice('DIRECTOR','One last courtesy. What becomes of the soldier I made?',[
    {tone:'paragon',label:'Save what can be saved. Purge the rest.',flag:'saveInali',
     reply:[['RANDALL','Her mind is not yours to own. I will cut the leash, not the woman.'],
            ['DIRECTOR','Sentiment. It always was your weakness.']]},
    {tone:'renegade',label:'Destroy the core. Nothing of hers survives.',flag:'destroyCore',
     reply:[['RANDALL','If she cannot be free, she does not get used. Not by you. Not by anyone.'],
            ['DIRECTOR','Then come and take her from me.']]}
   ])]);
 },
 relayBeat(){
  return [
   ['VOLUS','Relay control is ours. The Director just opened a private channel — she is speaking to you.'],
   ['DIRECTOR','Ezno. The Alliance will bury this report to protect its own. Give me the core and I give you Inali.'],
   choice('RANDALL','The Director is buying time. Your call.',[
    {tone:'paragon',label:'Reject the deal. The truth goes out.',flag:'rejectDeal',
     reply:[['DIRECTOR','Then I will stop your upload personally.'],
            ['VOLUS','Upload window widened. Move.']]},
    {tone:'renegade',label:'String her along. Take the core and the leverage.',flag:'playDeal',
     reply:[['RANDALL','I will take the core. Then I decide what it is worth.'],
            ['DIRECTOR','Careful. You are beginning to sound like me.']]}
   ])
  ];
 },
 praetorianBeat(){
  const opening=campaign.flags.trustAtlas
   ? ['VOLUS','The witnesses are still inside the cordon. The Praetorian knows which ones can name the core.']
   : ['VOLUS','The Praetorian has the witness list. It is deleting anyone who saw the relay broadcast.'];
  return [
   opening,
   ['PRAETORIAN','CIVILIANS ARE CONTAMINATION. I AM THE STERILE FIELD. KNEEL, OR BE ERASED.'],
   choice('RANDALL','The convoy channel is open. One call before the cordon closes.',[
    {tone:'paragon',label:'Send the warning. Expose our position.',flag:'warnConvoy',
     reply:[['RANDALL','Send it. Let them know we are coming.'],
            ['VOLUS','Warning away. Cerberus has our vector now.']]},
    {tone:'renegade',label:'Stay dark. Take the convoy route silently.',flag:'stayDark',
     reply:[['RANDALL','No broadcast. We hunt from the shadows.'],
            ['VOLUS','Silent. The Talons will not see us until we fire.']]}
   ])
  ];
 },
 lancerBeat(){
  return [
   ['VOLUS','Rail signature locked. The Lancer is standing in the open — daring us to take the first shot.'],
   ['LANCER','ONE SHOT. ONE CONVOY. I DO NOT MISS, GHOST.'],
   choice('RANDALL','Rail exposure confirmed. How do we drop him?',[
    {tone:'paragon',label:'Cut the charge, not the man.',flag:'disruptRail',
     reply:[['RANDALL','If he is still breathing, he can testify.'],
            ['VOLUS','Rail capacitor venting. He will fight blinded.']]},
    {tone:'renegade',label:'Put a round through the rail coil.',flag:'burnRail',
     reply:[['RANDALL','Let the Director watch her favorite weapon die.'],
            ['DIRECTOR','Crude. Effective. You are learning.']]}
   ])
  ];
 },
 juggernautBeat(){
  const opening=campaign.flags.disruptRail
   ? ['JUGGERNAUT','You left the Lancer alive. Finish it next time.']
   : ['JUGGERNAUT','You burned his rail. Good. It will not fire again.'];
  return [
   ['VOLUS','Movement in the ruin — too many hostiles for a patrol.'],
   ['RANDALL','Shield is gone, Volus. I need a second.'],
   ['JUGGERNAUT','DOWN. STAY THERE.'],
   ['VOLUS','He dropped in and took the whole ring apart. Then he threw you clear of it.'],
   opening,
   ['JUGGERNAUT','I do not wear their leash. Cerberus points me at crowds; I break the hand. The civilians are not targets.'],
   ['JUGGERNAUT','You are useful alive. Stay down and stay out of my swing.'],
   choice('JUGGERNAUT','One question. Then we move.',[
    {tone:'paragon',label:'Then work with me. Break the Director’s leash.',flag:'jugAlliance',
     reply:[['RANDALL','Fine. Swing at her, not at me.'],
            ['JUGGERNAUT','Move when I swing. Do not swing at me.']]},
    {tone:'renegade',label:'Stay out of it. I finish this my way.',flag:'jugDefiance',
     reply:[['RANDALL','I don\'t take orders from a hammer.'],
            ['JUGGERNAUT','Then stay out of my way. I will not drag you out again.']]}
   ])
  ];
 },
 juggernautLesson(){
  return [
   ['JUGGERNAUT','Enough. You read the swing. You stayed standing. You stopped shooting through me.'],
   ['RANDALL','I wasn\'t trying to kill you. I was trying to stay standing.'],
   ['JUGGERNAUT','Watch the shoulder, not the hammer. When the ground lights, move. When it drops, step in.'],
   ['RANDALL','And if I don\'t?'],
   ['JUGGERNAUT','Then you keep getting thrown. I am not here to save you. I am here to hurt what comes through that door.'],
   ['RANDALL','Then stand beside me. Break the Director’s leash.'],
   ['JUGGERNAUT','I do not wear a leash. I will break hers.'],
   ['JUGGERNAUT','My turn. Cerberus moved a convoy through the east ruin. I break it. You hold the array.'],
   ['RANDALL','And if you decide to make trouble?'],
   ['JUGGERNAUT','Then you deal with it. I do not ask permission.']
  ];
 },
 directorBeat(){
  return [
   ['VOLUS','Her subordinates are screening the chamber. Break their field first — the Director is covered while they stand.'],
   ['DIRECTOR','My soldiers are not a shield. They are a lesson. Watch how quickly you run out of answers.'],
   ['DIRECTOR','My soldier is awake. The Lancer is broken and the hammer has stepped aside. She has been rehearsing your death for three cycles; ignore the argument in her head.'],
   choice('RANDALL','Through the door, Inali’s voice cuts through — one sentence a threat, the next a plea, and neither sounding sincere.',[
    {tone:'paragon',label:'Answer her. Find the person inside.',flag:'answerInali',
     reply:[['INALI','Target in range. I can drop him before the others breach. ...I used to catalog starlight, Randall. Now I count heartbeats and call it science. I need you alive just long enough to get this leash off me. ...Contradiction noted. I still want him dead.'],
            ['RANDALL','Then fight her through me. I am the door out.']]},
    {tone:'renegade',label:'Silence it. No more ghosts.',flag:'silenceInali',
     reply:[['INALI','I am going to fold him into the deck. It will be quick. ...I used to beg for test subjects to be treated gently. Now I am the thing they warn them about. Use me. I am still the fastest way through that door. Do not mistake it for trust. ...Recorded. Irrelevant.'],
            ['RANDALL','Then I will put down the thing he built.']]}
   ])
  ];
 },
 juggernautOath(){
   const ally=campaign.flags.jugMissionDone
    ? ['JUGGERNAUT','My list is done. The Director is still in your path. I stand in the gap.']
    : ['JUGGERNAUT','My list is done. The Director is still in your path. I stand in the gap until it is finished.'];
   return [
    ally,
    ['RANDALL','For how long?'],
    ['JUGGERNAUT','I will break her mech. I will break your line of fire if you stand in it. Move.'],
    ['RANDALL','Understood.'],
    ['JUGGERNAUT','Keep moving. I will move you if you stop.']
   ];
  },
  directorMechBeat(){
   const ally=campaign.flags.jugMissionDone
    ? ['JUGGERNAUT','I take the legs. You take the cockpit. Do not miss.']
    : ['RANDALL','Volus, keep the array between us and that thing.'];
   return [
    ['VOLUS','The Director has climbed into a siege walker. Small arms will not cut that plate — break the legs, then the cockpit.'],
    ['DIRECTOR','You taught me to escalate, Ezno. Now watch the machine do it properly.'],
    ['DIRECTOR','This chassis carries a mind that does not falter. You are looking at the part of me that never learned hesitation.'],
    ['DIRECTOR','Count the armor plates if you like. I am counting the seconds before you break.'],
    ally
   ];
  },
  directorArmorBeat(){
   const ally=campaign.flags.jugMissionDone
    ? ['JUGGERNAUT','I tear the armor off. You get the woman out.']
    : ['RANDALL','Then I take the armor off you and find out who is left.'];
   return [
    ['DIRECTOR','Enough theater. The walker was a wrapper. This is the soldier you came to stop.'],
    ['DIRECTOR','No more machine, no more proxies. Just my hands, her instincts, and your mistakes.'],
    ['DIRECTOR','You wanted the woman behind the weapon. Watch closely — she is still in there, and she still hates you.'],
    ['INALI','Target... still moving. I can help. I can also end him. The instruction keeps changing.'],
    ally
   ];
  },
  ending(){
  const core=campaign.flags.saveInali
   ? ['RANDALL','Inali is free of his control. The Alliance will guard the core — she will not be caged again.']
   : ['RANDALL','The core is ash. Cerberus gets nothing, and neither does the Alliance.'];
  const moral=campaign.paragon>campaign.renegade
   ? ['VOLUS','They will call you a hero, Ezno. Try to deserve it.']
   : ['VOLUS','They will call you a butcher. Try to sleep anyway.'];
  const mid=campaign.flags.warnConvoy
   ? ['VOLUS','The convoy made it because you warned them.']
   : ['VOLUS','The convoy never saw the Talons coming. The silence held.'];
  const finale=campaign.flags.saveInali
   ? [['INALI','Randall... finish... it... I remember the girl who wanted to cure the sick. She is still in here, and she is so tired. I cannot carry what he put in me. Not anymore.'],
      ['RANDALL','I can\'t. Do not ask me to become him.'],
      ['RANDALL','Forgive me. Not for this. For everything I did not stop.'],
      ['INALI','Then leave me the pain. It is the only thing still mine.']]
   : [['INALI','Kill me. Put the round in me and stop pretending you are better than him. I have watched myself hurt people who never deserved it. I would rather be ash in your hands than his weapon in theirs.'],
      ['RANDALL','...'],
      ['RANDALL','...'],
      ['INALI','Do it, Ezno. I am not asking twice.'],
      ['RANDALL','Forgive me.'],
      ['VOLUS','The gunshot cuts the channel. Nothing answers back.']];
  return [
   ['VOLUS','The relay is silent. For the first time since Sur’Kesh, nothing answers back.'],
   ['VOLUS','Cerberus record closed. Project Inali is terminated. The ghost completes his mission.'],
   ['RANDALL','The Director is down. The signal has stopped.'],
   core,
   moral,
   mid,
   ...finale,
   ['VOLUS','Come home, Ezno. The galaxy needs a warning more than it needs a ghost.']
  ];
 }
};

/* ---------------- STATE ---------------- */
let state='TITLE',menuIdx=0,levelIdx=0,time=0,shake=0,flash=0,msg='',msgT=0,cutT=0,cutLineT=0;
let settingsReturn='TITLE',settingsDrag=null,infoReturn='TITLE';
let player=null,enemies=[],bullets=[],parts=[],cover=[],pickups=[],decor=[],fields=[],
 abilityFx=[],barrels=[],blastLights=[],blastQueue=[];
let grid=[],dialogue=null,objective={done:false,progress:0,stage:0,t:0,pos:{x:0,y:0}},
 relayTimer=0,startDelay=0,doors=[],spinProps=[];
let cinematicCrowd=[],cinematicJug=null,cinematicThrowFrom=null,cinematicCorner=null,
 cinematicLanded=false,cinematicThrown=false,cinematicMode='',cinematicExitFrom=null,
 cinematicExitTo=null,cinematicExited=false,cutDt=1/60,cinematicCamDist=243,bossCard=null;
const BIOTICS=[
 {key:'well',name:'WELL',color:'#9fd8ff',cd:BIOTIC_CD},
 {key:'dash',name:'DASH',color:'#63e6ff',cd:BIOTIC_CD},
 {key:'barrier',name:'BARRIER',color:'#7fffa0',cd:BIOTIC_CD}];
let campaign={paragon:0,renegade:0,flags:{},choices:[],
 biotics:{unlocked:{},equipped:null},qAbility:'cloak'};
function resetCampaign(){campaign={paragon:0,renegade:0,flags:{},choices:[],
 biotics:{unlocked:{},equipped:null},qAbility:'cloak'};}
function unlockBiotic(key){
 const b=BIOTICS.find(x=>x.key===key);if(!b||campaign.biotics.unlocked[key])return;
 campaign.biotics.unlocked[key]=true;
 // One quick-power slot, chosen on the top-left wheel; Cloak stays separate.
 if(!campaign.biotics.equipped)campaign.biotics.equipped=key;
 AudioSys.pickup();msg=b.name+(lang==='fa'?' باز شد':' UNLOCKED');msgT=2.2;
}
function cycleBiotic(dir){
 // The single quick-power slot steps through every unlocked biotic.
 const list=BIOTICS.filter(b=>campaign.biotics.unlocked[b.key]);
 if(!list.length){msg=lang==='fa'?'اسلات بیوتیک قفل است':'BIOTIC SLOT LOCKED';msgT=1;return;}
 let i=list.findIndex(b=>b.key===campaign.biotics.equipped);
 i=i<0?0:(i+dir+list.length)%list.length;
 campaign.biotics.equipped=list[i].key;
 msg=list[i].name+(lang==='fa'?' مجهز شد':' EQUIPPED');msgT=1.1;
 AudioSys.tone(420,.08,'triangle',.04,120);
}
function qAbility(){
 return campaign.qAbility==='barrier'&&campaign.biotics.unlocked.barrier?'barrier':'cloak';}
function cycleQAbility(dir){
 const opts=campaign.biotics.unlocked.barrier?['cloak','barrier']:['cloak'];
 if(opts.length<2){msg=lang==='fa'?'اسلات سپر قفل است':'BARRIER SLOT LOCKED';msgT=1;
  AudioSys.tone(120,.1,'square',.02);return;}
 let i=opts.indexOf(qAbility());
 i=(i+dir+opts.length)%opts.length;
 campaign.qAbility=opts[i];
 msg=opts[i].toUpperCase()+(lang==='fa'?' در اسلات Q':' IN Q SLOT');msgT=1.1;
 AudioSys.tone(420,.08,'triangle',.04,120);
}
function equippedBiotic(){
 const b=BIOTICS.find(x=>x.key===campaign.biotics.equipped);
 return b||null;}
function bioticCooldownFraction(){
 return player&&player.biot>0?1-player.biot/BIOTIC_CD:1;
}
function activeBiotic(){
 if(!player)return null;
 if(player.barrier>0)return BIOTICS.find(b=>b.key==='barrier');
 if(player.dash)return BIOTICS.find(b=>b.key==='dash');
 if(fields.length)return BIOTICS.find(b=>b.key==='well');
 return null;
}
function weaponHeatFraction(){
 if(!player||!player.maxammo)return 0;
 const spent=clamp(1-player.ammo/player.maxammo,0,1);
 if(player.reload>0)return spent*clamp(player.reload/reloadDuration(player.weapon),0,1);
 return spent;
}
function bioticCooldownRemaining(){
 return clamp(1-bioticCooldownFraction(),0,1);
}
function cloakCooldownFraction(){
 return player.cloak>0?player.cloak/CLOAK_DUR:
  (player.cloakCd>0?1-player.cloakCd/CLOAK_CD:1);
}
function qCooldownFraction(){
 if(qAbility()==='barrier')return bioticCooldownFraction();
 return player.cloak>0?player.cloak/CLOAK_DUR:
  (player.cloakCd>0?1-player.cloakCd/CLOAK_CD:1);
}
/* ---------------- LAN MULTIPLAYER (WebRTC manual signaling) ---------------- */
const MP_ABILITIES=[
 {key:'cloak',name:'CLOAK',uses:3},
 {key:'barrier',name:'BARRIER',uses:3},
 {key:'well',name:'BIOTIC WELL',uses:2},
 {key:'dash',name:'BIOTIC DASH',uses:3}
];
const MP_PALETTES=[
 {blue:0x1d5f9e,cobalt:0x2c7cbb,bright:0x55baf0,visor:0x8fe8ff},
 {blue:0x7a2f1d,cobalt:0xb94f33,bright:0xff8a5a,visor:0xffc27a},
 {blue:0x2f7a45,cobalt:0x49b968,bright:0x8fffa8,visor:0xb8ffd0},
 {blue:0x6b3f9a,cobalt:0x9360c9,bright:0xd3a8ff,visor:0xe8c8ff}
];
let mp={
 active:false,role:'',pc:null,dc:null,status:'Not connected',
 host:false,peerReady:false,localReady:false,peerJoined:false,
 mode:'coop',pvpMode:'ffa',team:'A',
 loadout:{weapon:'rifle',ability:'cloak',uses:3},
 peerLoadout:{weapon:'rifle',ability:'cloak',uses:3},
 remote:null,remoteMesh:null,remoteBlob:null,remoteBullets:[],
 remotes:[],peers:[],
 snapSeq:0,lastSnap:0,inputSeq:0,signalText:'',signalIn:'',
 abilityUses:3,autoTimer:0,autoMode:'',pvpScore:[0,0],pvpRound:1
};
function mpAutoStop(){
 if(mp.autoTimer){try{clearInterval(mp.autoTimer);}catch(e){}}
 mp.autoTimer=0;mp.autoMode='';
 try{if(window.LanBridge&&LanBridge.stopHost)LanBridge.stopHost();}catch(e){}
}
function mpReset(){
 mpAutoStop();
 if(Array.isArray(mp.remotes))for(const r of mp.remotes){if(!r)continue; if(r.mesh)try{actorG.remove(r.mesh);}catch(e){} if(r.blob)try{actorG.remove(r.blob);}catch(e){} if(r.dc)try{r.dc.close();}catch(e){} if(r.pc)try{r.pc.close();}catch(e){}}
 if(mp.dc){try{mp.dc.close();}catch(e){}}
 if(mp.pc){try{mp.pc.close();}catch(e){}}
 if(Array.isArray(mp.peers))for(const p of mp.peers){try{p.dc&&p.dc.close();}catch(e){}try{p.pc&&p.pc.close();}catch(e){}}
 mp={active:false,role:'',pc:null,dc:null,status:'Not connected',
  host:false,peerReady:false,localReady:false,peerJoined:false,
  mode:'coop',pvpMode:'ffa',team:'A',
  loadout:{weapon:'rifle',ability:'cloak',uses:3},
  peerLoadout:{weapon:'rifle',ability:'cloak',uses:3},
  remote:null,remoteMesh:null,remoteBlob:null,remoteBullets:[],
  remotes:[],peers:[],
  snapSeq:0,lastSnap:0,inputSeq:0,signalText:'',signalIn:'',
  abilityUses:3,autoTimer:0,autoMode:'',pvpScore:[0,0],pvpRound:1};
}
function mpClose(reason,toTitle){
 mpReset();mp.status=reason||'Disconnected';state=toTitle?'TITLE':'MP_MENU';menuIdx=0;
}
const MP_MAX_PVP=8; // host + 7 clients, practical phone cap
function mpPeerCount(){return mpGetRemotes().filter(r=>r&&r.dc&&r.dc.readyState==='open').length;}
function mpCanAcceptMore(){
 if(mp.mode==='coop') return mpPeerCount()<1;
 return mpPeerCount() < (MP_MAX_PVP-1);
}
function mpEnsurePeerConnection(slot){
 slot=slot||0;
 if(!mp.peerSlots) mp.peerSlots=[];
 if(mp.peerSlots[slot]&&mp.peerSlots[slot].pc) return mp.peerSlots[slot].pc;
 const pc=new RTCPeerConnection({iceServers:[]});
 const ps={slot,pc,dc:null,answerApplied:false};
 mp.peerSlots[slot]=ps;
 if(slot===0){mp.pc=pc; mp.dc=null;}
 pc.oniceconnectionstatechange=()=>{mp.status='ICE['+slot+']: '+pc.iceConnectionState;
  if(['failed','disconnected','closed'].includes(pc.iceConnectionState)){
   mp.status='Connection '+pc.iceConnectionState+' (slot '+slot+')';
   if(mp.active&&mp.mode==='coop') mpClose('Peer disconnected');
  }};
 pc.ondatachannel=e=>{ps.dc=e.channel; if(slot===0) mp.dc=ps.dc; mpWireDc(ps);};
 return pc;
}
function mpWireDc(ps){
 const dc=ps?ps.dc:mp.dc; if(!dc) return;
 const slot=ps?ps.slot:0;
 dc.onopen=()=>{
  mp.status='Connected'+(mp.mode==='pvp'?' ('+(mpPeerCount()+1)+'/'+MP_MAX_PVP+')':'');
  mp.peerJoined=true;
  if(mp.mode==='coop'){
   state='MP_LOADOUT';menuIdx=0;mp.localReady=false;mp.peerReady=false;
  } else {
   // PvP: spawn remote for this peer and stay in lobby to accept more, or start if already in loadout/play
   if(!mp.remotes[slot]) mpSpawnRemote(slot,mp.peerLoadout);
   mp.remotes[slot].dc=dc; mp.remotes[slot].pc=ps.pc; mp.remotes[slot].ready=false;
   if(state==='MP_LOBBY'){
    if(mp.mode==='coop' || mpPeerCount()<=1){ state='MP_LOADOUT'; menuIdx=0; mp.localReady=false; mp.peerReady=false; }
    else { mpSendTo(ps,{t:'go_loadout',mode:mp.mode,pvpMode:mp.pvpMode}); }
   }
   else if(state==='MP_LOADOUT'&&mp.host){ mpSendTo(ps,{t:'go_loadout',mode:mp.mode,pvpMode:mp.pvpMode}); }
   else if(state==='PLAY'&&mp.host){ mpSendTo(ps,{t:'start',mode:mp.mode,pvpMode:mp.pvpMode,loadout:mp.loadout,you:mp.remotes[slot]?mp.remotes[slot].loadout:mp.peerLoadout,score:mp.pvpScore,round:mp.pvpRound,youSlot:slot,team:mp.remotes[slot]?mp.remotes[slot].team:'A'}); }
   // prepare next slot for host auto signaling
   if(mp.host&&mpCanAcceptMore()) mpHostPrepareSlot(slot+1);
  }
 };
 dc.onclose=()=>{
  if(!mp.active) return;
  if(mp.mode==='coop'){ mpClose('Peer disconnected'); return; }
  mp.status='Player left (slot '+slot+')';
  const r=mp.remotes&&mp.remotes[slot];
  if(r){ r.dc=null; r.dead=true; if(r.mesh)r.mesh.visible=false; if(r.blob)r.blob.visible=false; }
  if(mpPeerCount()===0 && state!=='MP_LOBBY' && state!=='MP_LOADOUT'){ mpClose('All peers disconnected',true); }
 };
 dc.onmessage=e=>{try{mpOnMsg(JSON.parse(e.data), mp.remotes?mp.remotes[slot]:null);}catch(err){}};
}
function mpSendTo(ps,obj){
 const dc=ps?ps.dc:null;
 if(dc&&dc.readyState==='open'){try{dc.send(JSON.stringify(obj));}catch(e){}}
}
function mpSend(obj){
 // broadcast to all open peer DCs
 let sent=false;
 if(mp.peerSlots){ for(const ps of mp.peerSlots){ if(ps&&ps.dc&&ps.dc.readyState==='open'){try{ps.dc.send(JSON.stringify(obj));sent=true;}catch(e){}} } }
 if(!sent && mp.dc&&mp.dc.readyState==='open'){try{mp.dc.send(JSON.stringify(obj));}catch(e){}}
}
function mpWaitIce(pc){
 return new Promise(resolve=>{
  if(pc.iceGatheringState==='complete')return resolve();
  const t=setTimeout(resolve,1500);
  pc.onicegatheringstatechange=()=>{if(pc.iceGatheringState==='complete'){clearTimeout(t);resolve();}};
 });
}
async function mpHostPrepareSlot(slot){
 if(!mp.host) return;
 if(mp.mode==='coop' && slot>0) return;
 if(slot>=MP_MAX_PVP) return;
 if(mp.peerSlots&&mp.peerSlots[slot]&&mp.peerSlots[slot].dc&&mp.peerSlots[slot].dc.readyState==='open') return;
 const pc=mpEnsurePeerConnection(slot);
 if(mp.peerSlots[slot].dc) return; // already has dc
 const dc=pc.createDataChannel('gp'); mp.peerSlots[slot].dc=dc; if(slot===0) mp.dc=dc; mpWireDc(mp.peerSlots[slot]);
 const offer=await pc.createOffer(); await pc.setLocalDescription(offer);
 await mpWaitIce(pc);
 const txt=JSON.stringify(pc.localDescription);
 if(slot===0) mp.signalText=txt;
 try{ if(window.LanBridge && LanBridge.setHostOfferSlot) LanBridge.setHostOfferSlot(slot,txt); else if(slot===0&&window.LanBridge&&LanBridge.setHostOffer) LanBridge.setHostOffer(txt); }catch(e){}
 try{if(navigator.clipboard&&slot===0)navigator.clipboard.writeText(txt);}catch(e){}
 return txt;
}
async function mpHost(){
 mpReset();mp.role='host';mp.host=true;mp.active=true; mp.peerSlots=[];
 await mpHostPrepareSlot(0);
 mp.status=mp.mode==='pvp' ? 'PvP host: hotspot on, share offer. Up to '+MP_MAX_PVP+' players.' : 'Hotspot on. Offer copied - send to client.';
 state='MP_LOBBY';menuIdx=0;
 mpAutoHostStart();
 try{if(window.LanBridge)window.location.href='ghost://hotspot';}catch(e){}
}
async function mpJoin(){
 mpReset();mp.role='join';mp.host=false;mp.active=true; mp.peerSlots=[];
 mpEnsurePeerConnection(0);
 mp.status='Join host hotspot/Wi-Fi, then paste host offer';
 state='MP_LOBBY';menuIdx=0;
 mpAutoClientStart();
 try{if(window.LanBridge)window.location.href='ghost://wifi';}catch(e){}
}
async function mpApplySignal(){
 try{
  const obj=JSON.parse(mp.signalIn.trim());
  const slot=mp._applySlot||0;
  const pc=mpEnsurePeerConnection(slot);
  if(obj.type==='offer'){
   await pc.setRemoteDescription(obj);
   const ans=await pc.createAnswer();await pc.setLocalDescription(ans);
   await mpWaitIce(pc);
   mp.signalText=JSON.stringify(pc.localDescription);
   mp.status='Answer copied - send back to host';
   try{if(navigator.clipboard)navigator.clipboard.writeText(mp.signalText);}catch(e){}
  } else if(obj.type==='answer'){
   await pc.setRemoteDescription(obj);
   mp.status='Answer applied - waiting for connection';
  }
 }catch(e){mp.status='Invalid signal';}
}
const MP_SIGNAL_PORT=8765;
const MP_HOST_IPS=['192.168.43.1','192.168.49.1','10.0.0.1','192.168.1.1'];
function mpAutoHostStart(){
 if(!window.LanBridge) return;
 try{
  LanBridge.clear(); LanBridge.startHost();
  if(mp.peerSlots&&mp.peerSlots[0]) LanBridge.setHostOfferSlot?LanBridge.setHostOfferSlot(0,mp.signalText||''):LanBridge.setHostOffer(mp.signalText||'');
  mp.autoMode='host'; mp.status='Auto signal: host server on port '+MP_SIGNAL_PORT;
  if(mp.autoTimer)clearInterval(mp.autoTimer);
  mp.autoTimer=setInterval(()=>{
   try{
    const maxSlots = mp.mode==='coop' ? 1 : MP_MAX_PVP;
    for(let slot=0;slot<maxSlots;slot++){
     const ans = LanBridge.getHostAnswerSlot ? LanBridge.getHostAnswerSlot(slot) : (slot===0?LanBridge.getHostAnswer():'');
     const ps = mp.peerSlots&&mp.peerSlots[slot];
     if(ans && ans.indexOf('"answer"')>-1 && ps && !ps.answerApplied){
      ps.answerApplied=true; mp._applySlot=slot; mp.signalIn=ans; mpApplySignal();
     }
     // ensure next slot offer exists if PvP and previous is connected/answered
     if(mp.mode==='pvp' && slot>0 && !mp.peerSlots[slot] && mp.peerSlots[slot-1] && mp.peerSlots[slot-1].dc){
      mpHostPrepareSlot(slot);
     }
    }
    if(mp.mode==='coop' && mp.dc && mp.dc.readyState==='open'){clearInterval(mp.autoTimer);mp.autoTimer=0;}
   }catch(e){}
  },1200);
 }catch(e){}
}
function mpAutoClientStart(){
 if(mp.autoTimer)clearInterval(mp.autoTimer);
 mp.autoMode='client'; mp.status='Auto signal: looking for host...';
 let idx=0,found=false,slotTry=0;
 const tryPoll=()=>{
  if(found|| (mp.dc&&mp.dc.readyState==='open')){if(mp.autoTimer)clearInterval(mp.autoTimer);mp.autoTimer=0;return;}
  const ip=MP_HOST_IPS[idx%MP_HOST_IPS.length]; idx++;
  const slot = slotTry % (MP_MAX_PVP);
  const path = slot===0 ? '/offer' : '/offer'+slot;
  fetch('http://'+ip+':'+MP_SIGNAL_PORT+path,{cache:'no-store'}).then(r=>r.text()).then(t=>{
   t=(t||'').trim();
   if(!t||t.indexOf('"offer"')===-1){ slotTry++; return; }
   if(found) return; found=true;
   mp._applySlot=0; mp.signalIn=t; mp.status='Auto signal: offer found at '+ip;
   Promise.resolve(mpApplySignal()).then(()=>{
    const ans=mp.signalText||'';
    if(ans.indexOf('"answer"')>-1){
     const apath = slot===0 ? '/answer' : '/answer'+slot;
     fetch('http://'+ip+':'+MP_SIGNAL_PORT+apath,{method:'POST',body:ans,headers:{'Content-Type':'text/plain'}}).catch(()=>{});
     mp.status='Auto signal: answer sent to '+ip;
    }
   });
  }).catch(()=>{ slotTry++; });
 };
 mp.autoTimer=setInterval(tryPoll,1500); tryPoll();
}
function mpClearRemotes(){
 if(Array.isArray(mp.remotes)){
  for(const r of mp.remotes){
   if(r.mesh){try{actorG.remove(r.mesh);}catch(e){}}
   if(r.blob){try{actorG.remove(r.blob);}catch(e){}}
   if(r.dc){try{r.dc.close();}catch(e){}}
   if(r.pc){try{r.pc.close();}catch(e){}}
  }
 }
 mp.remotes=[]; mp.remote=null; mp.remoteMesh=null; mp.remoteBlob=null;
}
function mpSpawnRemote(peerIndex,loadout){
 if(!mp.remotes)mp.remotes=[];
 while(mp.remotes.length<=peerIndex)mp.remotes.push(null);
 const old=mp.remotes[peerIndex];
 if(old){if(old.mesh)try{actorG.remove(old.mesh);}catch(e){} if(old.blob)try{actorG.remove(old.blob);}catch(e){}}
 const pal=MP_PALETTES[(peerIndex+1)%MP_PALETTES.length];
 const mesh=armoredPersonModel(pal); mesh.userData.peerIndex=peerIndex;
 const blob=blobShadow(); actorG.add(mesh,blob);
 const r={x:player?player.x+40:0,y:player?player.y:0,r:15,hp:150,maxhp:150,sh:80,maxsh:80,ang:0,dead:false,
  walk:0,recoil:0,vx:0,vy:0,fire:0,reload:0,ammo:24,maxammo:24,reserve:{rifle:480,shotgun:48},wammo:{rifle:24,shotgun:8},
  weapon:'rifle',mpAbility:'cloak',mpUses:3,abilityCd:0,dashCd:0,cloak:0,cloakCd:0,barrier:0,barrierCd:0,biot:0,melee:0,meleeCd:0,
  isRemote:true,mesh,blob,peerIndex,input:{mx:0,my:0,ang:0,firing:false,ability:false},loadout:loadout||mp.peerLoadout,ready:false,dc:null,pc:null};
 mp.remotes[peerIndex]=r; mp.remote=mp.remotes[0]; mp.remoteMesh=mp.remotes[0]?mp.remotes[0].mesh:null; mp.remoteBlob=mp.remotes[0]?mp.remotes[0].blob:null;
 return r;
}
function mpGetRemotes(){return (mp.remotes||[]).filter(Boolean);}
function mpApplyLoadout(p,lo,isRemote){
 p.weapon=lo.weapon; p.wammo=p.wammo||{rifle:24,shotgun:8};
 p.maxammo=WDEF[lo.weapon].mag; p.ammo=p.maxammo;
 p.reserve={rifle:WDEF.rifle.reserve,shotgun:WDEF.shotgun.reserve};
 p.mpAbility=lo.ability; p.mpUses=lo.uses;
 p.cloak=0;p.cloakCd=0;p.barrier=0;p.barrierCd=0;p.dash=null;p.dashCd=0;p.biot=0;
 if(!isRemote){mp.abilityUses=lo.uses;}
}
function mpAssignTeams(){
 const rs=mpGetRemotes();
 if(mp.pvpMode==='team'){
  player.team='A'; mp.team='A';
  for(let i=0;i<rs.length;i++){ rs[i].team = (i%2===0)?'B':'A'; }
 } else {
  player.team='FFA'; mp.team='FFA';
  for(let i=0;i<rs.length;i++) rs[i].team='FFA';
 }
}
function mpStartRound(){
 mp.localReady=false;mp.peerReady=false;mp.active=true;mp._pvpEnding=false;
 if(mp.mode==='pvp'){ initPvpArena(); } else { initLevel(levelIdx||0); }
 mpApplyLoadout(player,mp.loadout,false);
 const peers=mpGetRemotes();
 if(!peers.length){ mpSpawnRemote(0,mp.peerLoadout); }
 for(let i=0;i<mpGetRemotes().length;i++){
  const r=mpGetRemotes()[i]; if(!r) continue;
  if(!r.mesh){ mpSpawnRemote(i,r.loadout||mp.peerLoadout); }
  r.dead=false;r.hp=r.maxhp;r.sh=r.maxsh;r.fire=0;r.reload=0;
  mpApplyLoadout(r,r.loadout||mp.peerLoadout,true);
 }
 if(mp.mode==='pvp') mpAssignTeams();
 if(mp.mode==='pvp'){
  const spawns=[tilePos(PVP_LEVEL.start[0],PVP_LEVEL.start[1]),tilePos(PVP_LEVEL.start2[0],PVP_LEVEL.start2[1]),
   tilePos(4,12),tilePos(15,3),tilePos(3,12),tilePos(16,12),tilePos(10,3),tilePos(10,12)];
  if(mp.host){
   player.x=spawns[0].x;player.y=spawns[0].y;
   const rs=mpGetRemotes();
   for(let i=0;i<rs.length;i++){rs[i].x=spawns[(i+1)%spawns.length].x;rs[i].y=spawns[(i+1)%spawns.length].y;}
  } else {
   // client: position comes from snapshot; set reasonable default
   const rs=mpGetRemotes();
   for(let i=0;i<rs.length;i++){ if(rs[i].x===undefined) {rs[i].x=spawns[0].x;rs[i].y=spawns[0].y;} }
  }
  mp.pvpScore=mp.pvpScore||[0,0]; mp.pvpRound=mp.pvpRound||1;
  msg=(lang==='fa'?'راند PVP ':'PVP ROUND ')+mp.pvpRound+(mp.pvpMode==='team'?(lang==='fa'?' تیم A مقابل B':' TEAM A vs B'):(lang==='fa'?' هرکس برای خودش':' FFA')); msgT=1.8;
 }
 mp.remote=mp.remotes[0]||null; mp.remoteMesh=mp.remote?mp.remote.mesh:null; mp.remoteBlob=mp.remote?mp.remote.blob:null;
 mp.status='In match'; state='PLAY';startDelay=1.2;
 if(mp.host){
  if(mp.peerSlots){
   for(let i=0;i<mp.peerSlots.length;i++){
    const ps=mp.peerSlots[i]; if(!ps||!ps.dc||ps.dc.readyState!=='open') continue;
    const r=mp.remotes[i];
    mpSendTo(ps,{t:'start',mode:mp.mode,pvpMode:mp.pvpMode,loadout:mp.loadout,you:r?r.loadout:mp.peerLoadout,score:mp.pvpScore,round:mp.pvpRound,youSlot:i,team:r?r.team:'A'});
   }
  } else {
   mpSend({t:'start',mode:mp.mode,pvpMode:mp.pvpMode,loadout:mp.loadout,you:mp.peerLoadout,score:mp.pvpScore,round:mp.pvpRound});
  }
 }
}
function mpOnMsg(m,peer){
 if(!m||!m.t)return;
 const pr=peer||mp.remotes[0]||null;
 if(m.t==='loadout'){
  mp.peerLoadout=m.loadout; if(pr){pr.loadout=m.loadout;pr.ready=!!m.ready;}
  mp.peerReady=!!m.ready;
  const allReady = mpGetRemotes().filter(r=>r.dc||r.pc||mp.mode==='coop').every(r=>r.ready);
  if(mp.host&&mp.localReady && (mp.mode==='coop' ? mp.peerReady : allReady && mpGetRemotes().length>0)) mpStartRound();
 } else if(m.t==='go_loadout'){
  mp.mode=m.mode||mp.mode; mp.pvpMode=m.pvpMode||mp.pvpMode;
  state='MP_LOADOUT'; menuIdx=0; mp.localReady=false; mp.peerReady=false; mp.status='Connected - choose loadout';
 } else if(m.t==='start'){
  mp.mode=m.mode||mp.mode; mp.pvpMode=m.pvpMode||mp.pvpMode; mp.peerLoadout=m.loadout; mp.loadout=m.you;
  if(m.score)mp.pvpScore=m.score; if(m.round)mp.pvpRound=m.round;
  if(m.team) mp.team=m.team;
  mpStartRound();
 } else if(m.t==='input'&&mp.host){
  if(pr)pr.input=m; else mp.remoteInput=m;
 } else if(m.t==='snap'&&!mp.host){ mpApplySnapshot(m); }
 else if(m.t==='pvp'){mp.pvpScore=m.score||mp.pvpScore; mp.pvpRound=m.round||mp.pvpRound; if(m.msg){msg=m.msg;msgT=2.5;} if(mp.pvpScore[0]>=5||mp.pvpScore[1]>=5){setTimeout(()=>{if(mp.active)mpClose('',true);},3000);} }
 else if(m.t==='ping'){mpSend({t:'pong'});}
}
function mpCollectInput(){
 const mx=(keys['a']||keys['arrowleft']?-1:0)+(keys['d']||keys['arrowright']?1:0)+(touch.move&&Math.hypot(touch.move.x-touch.move.x0,touch.move.y-touch.move.y0)>8?(touch.move.x-touch.move.x0)/60:0)+(GamepadSys.active?GamepadSys.leftX:0);
 const my=(keys['w']||keys['arrowup']?-1:0)+(keys['s']||keys['arrowdown']?1:0)+(touch.move&&Math.hypot(touch.move.x-touch.move.x0,touch.move.y-touch.move.y0)>8?(touch.move.y-touch.move.y0)/60:0)+(GamepadSys.active?GamepadSys.leftY:0);
 const firing=!player.dash&&(mouse.down||GamepadSys.heldAction('fire')||(!!touch.fire&&Math.hypot(touch.fire.ox,touch.fire.oy)>6));
 return {t:'input',mx,my,ang:aimDir,firing,ability:!!mp._abilityPressed};
}
function mpSyncRemoteMesh(dt,r){
 r=r||mp.remote; if(!r||!r.mesh)return;
 r.mesh.visible=!r.dead;
 if(r.blob){r.blob.visible=!r.dead;r.blob.position.set(r.x,1.4,r.y);r.blob.scale.set(14*1.12,.35,12*1.12);}
 r.mesh.position.set(r.x,0,r.y); r.mesh.rotation.y=-r.ang;
}
function mpSyncAllRemotes(dt){ for(const r of mpGetRemotes())mpSyncRemoteMesh(dt,r); }
function mpPvpRoundEnd(winnerTeamOrId){
 if(!mp.active||mp.mode!=='pvp')return;
 // winnerTeamOrId: 'A','B','FFA:<slot>' or legacy 'host'/'client'
 let msgTxt='';
 if(mp.pvpMode==='team'){
  const win = (winnerTeamOrId==='host')?'A':(winnerTeamOrId==='client')?'B':winnerTeamOrId;
  if(win==='A') mp.pvpScore[0]=(mp.pvpScore[0]||0)+1; else mp.pvpScore[1]=(mp.pvpScore[1]||0)+1;
  msgTxt='TEAM '+win+' WINS ROUND  '+mp.pvpScore[0]+'-'+mp.pvpScore[1];
 } else {
  // FFA: track host as score[0], best remote as score[1] for simplicity; announce winner
  if(winnerTeamOrId==='host'||winnerTeamOrId==='A'){ mp.pvpScore[0]=(mp.pvpScore[0]||0)+1; msgTxt='HOST WINS ROUND  '+mp.pvpScore[0]+'-'+mp.pvpScore[1]; }
  else { mp.pvpScore[1]=(mp.pvpScore[1]||0)+1; msgTxt='OPPONENT WINS ROUND  '+mp.pvpScore[0]+'-'+mp.pvpScore[1]; }
 }
 mp.pvpRound=(mp.pvpRound||1)+1;
 msg=msgTxt; msgT=2.5;
 mpSend({t:'pvp',score:mp.pvpScore.slice(),round:mp.pvpRound,msg:msg,mode:mp.pvpMode});
 const h=mp.pvpScore[0],c=mp.pvpScore[1];
 if(h>=5||c>=5){
  const winFinal = h>=5 ? (mp.pvpMode==='team'?'Team A':'You') : (mp.pvpMode==='team'?'Team B':'Opponent');
  mp.status=winFinal+' won the match!';
  setTimeout(()=>{if(mp.active)mpClose(winFinal+' won',true);},3000);
  return;
 }
 setTimeout(()=>{if(mp.active&&mp.mode==='pvp'){mp._pvpEnding=false;mpStartRound();}},2200);
}
function mpHurtRemote(d,r){
 r=r||mp.remote; if(!r||r.dead)return; if(!Number.isFinite(d)||d<=0)return;
 r.hitT=.2; if(r.sh>0){r.sh-=d;if(r.sh<0){r.hp+=r.sh;r.sh=0;}}else r.hp-=d;
 if(r.hp<=0){r.hp=0;r.dead=true;}
}
function mpUpdateRemote(dt,r){
 r=r||mp.remote; const inp=r?r.input:null; if(!r||r.dead)return;
 r.fire-=dt;r.reload-=dt;r.hitT-=dt;
 if(r.sh<r.maxsh)r.sh=Math.min(r.maxsh,r.sh+16*dt*0.5);
 const mx=clamp((inp?.mx)||0,-1,1),my=clamp((inp?.my)||0,-1,1),m=Math.hypot(mx,my)||1,ps=205;
 r.vx=lerp(r.vx,mx/m*ps,1-Math.exp(-dt*11)); r.vy=lerp(r.vy,my/m*ps,1-Math.exp(-dt*11));
 moveEntity(r,r.vx*dt,r.vy*dt); r.walk+=Math.hypot(r.vx,r.vy)*dt*.055; r.recoil=Math.max(0,r.recoil-dt*8);
 if(inp&&Number.isFinite(inp.ang))r.ang=inp.ang;
 const firing=!!inp?.firing, sg=r.weapon==='shotgun';
 if(firing&&r.ammo>0&&r.fire<=0&&r.reload<=0){r.isRemote=true; shoot(r,r.ang,false,r.weapon); r.isRemote=false; r.ammo--;r.fire=sg?.62:.075;if(r.ammo<=0&&r.reserve[r.weapon]>0)r.reload=reloadDuration(r.weapon);}
 if(r.reload<=0&&r.ammo<=0&&(r.reserve[r.weapon]||0)>0)r.reload=reloadDuration(r.weapon);
 if(r.reload>0&&r.reload<.05){const need=r.maxammo-r.ammo,take=Math.min(need,r.reserve[r.weapon]||0);r.ammo+=take;r.reserve[r.weapon]-=take;r.reload=0;}
 if(inp&&inp.ability&&r.mpUses>0&&r.abilityCd<=0){r.mpUses--;r.abilityCd=8;msg=(lang==='fa'?'هم‌تیمی استفاده کرد: ':'PEER USED ')+(r.mpAbility||'ABILITY').toUpperCase();msgT=.8;}
 if(r.abilityCd>0)r.abilityCd-=dt;
 mpSyncRemoteMesh(dt,r);
}
function mpUpdateAllRemotes(dt){ for(const r of mpGetRemotes())mpUpdateRemote(dt,r); }
function mpSendSnapshot(){
 if(!mp.host) return;
 if(time-mp.lastSnap<0.05) return; mp.lastSnap=time;
 const remotes=mpGetRemotes().map((r,i)=>({slot:i,x:r.x,y:r.y,ang:r.ang,hp:r.hp,sh:r.sh,dead:r.dead,weapon:r.weapon,team:r.team||'A'}));
 const base={t:'snap',s:++mp.snapSeq,
  host:{x:player.x,y:player.y,ang:player.ang,hp:player.hp,sh:player.sh,dead:player.dead,weapon:player.weapon,team:'A'},
  p1:{x:player.x,y:player.y,ang:player.ang,hp:player.hp,sh:player.sh,dead:player.dead,weapon:player.weapon},
  remotes,
  e:enemies.map(e=>({x:e.x,y:e.y,hp:e.hp,dead:e.dead,ang:e.ang,t:e.type})),
  obj:{done:objective.done,progress:objective.progress,stage:objective.stage},
  pvp:mp.mode==='pvp'?{score:mp.pvpScore.slice(),round:mp.pvpRound,mode:mp.pvpMode}:null,
  bs:mp.mode==='pvp'?bullets.filter(b=>!b.enemy&&b.life>0).slice(-40).map(b=>({x:b.x,y:b.y,vx:b.vx,vy:b.vy,life:b.life,col:b.col,or:!!b.ownerRemote,os:b.ownerSlot,op:!!b.ownerPlayer})):undefined
 };
 // send per-peer so each client knows its own index
 if(mp.peerSlots){
  for(let i=0;i<mp.peerSlots.length;i++){
   const ps=mp.peerSlots[i]; if(!ps||!ps.dc||ps.dc.readyState!=='open') continue;
   const snap=Object.assign({},base,{you:i,p2:remotes[i]||null});
   try{ps.dc.send(JSON.stringify(snap));}catch(e){}
  }
 } else {
  const snap=Object.assign({},base,{you:0,p2:remotes[0]||null});
  mpSend(snap);
 }
}
function mpApplySnapshot(m){
 if(!m) return;
 const myIdx = (typeof m.you==='number') ? m.you : 0;
 // Host is always a remote from client perspective
 const hostP = m.host || m.p1;
 const remArr = Array.isArray(m.remotes) ? m.remotes : (m.p1?[m.p1]:[]);
 // Ensure we have enough remote slots: host + other peers
 // Map: remote 0 = host, remote 1..n = other peers (excluding self)
 const needed = 1 + Math.max(0, remArr.length-1);
 while(mpGetRemotes().length < needed) mpSpawnRemote(mpGetRemotes().length, mp.peerLoadout);
 // update host as remote 0
 if(hostP && mp.remotes[0]){ const r=mp.remotes[0]; r.x=hostP.x;r.y=hostP.y;r.ang=hostP.ang;r.hp=hostP.hp;r.sh=hostP.sh;r.dead=hostP.dead;r.weapon=hostP.weapon||r.weapon; r.team=hostP.team||r.team; }
 // update other peers
 let ri=1;
 for(let i=0;i<remArr.length;i++){
  if(i===myIdx) continue;
  if(!mp.remotes[ri]) mpSpawnRemote(ri, mp.peerLoadout);
  const s=remArr[i], r=mp.remotes[ri];
  r.x=s.x;r.y=s.y;r.ang=s.ang;r.hp=s.hp;r.sh=s.sh;r.dead=s.dead;r.weapon=s.weapon||r.weapon; r.team=s.team||r.team;
  ri++;
 }
 // hide extra remotes
 for(let i=ri;i<mp.remotes.length;i++){ const r=mp.remotes[i]; if(r){r.dead=true;if(r.mesh)r.mesh.visible=false;if(r.blob)r.blob.visible=false;} }
 // update local player from my slot
 const me = remArr[myIdx];
 if(me){ player.x=me.x;player.y=me.y;player.ang=me.ang;player.hp=me.hp;player.sh=me.sh;player.dead=me.dead; if(me.team) mp.team=me.team; }
 if(Array.isArray(m.e)){
  for(let i=0;i<enemies.length&&i<m.e.length;i++){const e=enemies[i],s=m.e[i];e.x=s.x;e.y=s.y;e.hp=s.hp;e.dead=s.dead;e.ang=s.ang;}
 }
 if(m.obj){objective.done=m.obj.done;objective.progress=m.obj.progress;objective.stage=m.obj.stage;}
 if(m.pvp){mp.pvpScore=m.pvp.score||mp.pvpScore;mp.pvpRound=m.pvp.round||mp.pvpRound; if(m.pvp.mode) mp.pvpMode=m.pvp.mode;}
 // PvP bullet visuals on client (non-authoritative)
 if(mp.mode==='pvp' && Array.isArray(m.bs)){
  // remove old net bullets
  for(let i=bullets.length-1;i>=0;i--) if(bullets[i].netPvp) { if(bullets[i].mesh)try{fxG.remove(bullets[i].mesh);}catch(e){} bullets.splice(i,1); }
  for(const b of m.bs){
   // skip my own bullets (I already have them locally)
   if(b.op && !mp.host) continue;
   const nb={x:b.x,y:b.y,vx:b.vx,vy:b.vy,life:Math.min(b.life,.2),dmg:0,enemy:false,col:b.col||0xff6a4a,ownerRemote:!!b.or,ownerSlot:b.os,ownerPlayer:!!b.op,netPvp:true,team:null};
   nb.mesh=new THREE.Mesh(TRACER_GEOS[nb.col]||TRACER_GEOS[0xff6a4a],BULLET_MAT);
   nb.mesh.scale.setScalar(.75); nb.mesh.position.set(nb.x,22,nb.y); nb.mesh.rotation.y=-Math.atan2(nb.vy,nb.vx);
   fxG.add(nb.mesh); bullets.push(nb);
  }
 }
}

function mpTriggerAbility(){
 if(!mp.active) return false;
 if((mp.abilityUses||0)<=0){msg=lang==='fa'?'توانایی تمام شد':'NO ABILITY USES LEFT';msgT=1;AudioSys.tone(120,.1,'square',.02);return true;}
 const k=mp.loadout.ability;
 let can=true;
 if(k==='cloak')can=player.cloak<=0&&player.cloakCd<=0;
 if(k==='barrier')can=player.barrier<=0&&player.barrierCd<=0;
 if(k==='well')can=player.biot<=0;
 if(k==='dash')can=player.dashCd<=0&&!player.dash;
 if(!can){msg=lang==='fa'?'توانایی در شارژ':'ABILITY ON COOLDOWN';msgT=.8;return true;}
 if(k==='cloak')triggerCloak();
 else if(k==='barrier')castBarrier();
 else if(k==='well')triggerBiotic();
 else if(k==='dash')triggerDash();
 mp.abilityUses=Math.max(0,(mp.abilityUses||0)-1);
 msg=mp.loadout.ability.toUpperCase()+' USES '+mp.abilityUses;msgT=1;
 return true;
}
function triggerMelee(){
 if(!player||player.dead||player.dash||player.meleeCd>0)return false;
 let target=null,best=Infinity;
 for(const e of enemies){
  if(e.dead)continue;
  const d=dist(player,e),reach=(e.r||16)+player.r+MELEE_REACH;
  if(d<reach&&d<best){target=e;best=d;}
 }
 if(!target)return false;
 player.melee=MELEE_DUR;player.meleeCd=MELEE_CD;
 const a=ang(player,target);
 player.meleeDir=a;
 damageEnemy(target,55,'melee');target.stun=Math.max(target.stun,.4);
 target.vx+=Math.cos(a)*240;target.vy+=Math.sin(a)*240;
 burst(target.x,target.y,18,0x9fd8ff,1.4);
 addBlastLight(target.x,target.y,0x9fd8ff,110,220,.28);
 shake=Math.max(shake,7);flash=Math.max(flash,.14);
 AudioSys.biotic();AudioSys.hit();
 return true;
}
function triggerQAbility(){
 if(mp.active){if(!mp.host){mp._abilityPressed=true;return;} mpTriggerAbility();return;}
 if(qAbility()==='barrier')castBarrier();else triggerCloak();
}
function triggerBioticAbility(key){
 if(mp.active){triggerQAbility();return;}
 if(!campaign.biotics.unlocked[key]){
  msg=lang==='fa'?'اسلات بیوتیک قفل است':'BIOTIC SLOT LOCKED';msgT=1;
  AudioSys.tone(120,.1,'square',.02);return;
 }
 if(key==='well')triggerBiotic();
 else if(key==='dash')triggerDash();
 else if(key==='barrier'){campaign.qAbility='barrier';castBarrier();}
}
function triggerDirectAbility(key){
 if(mp.active){triggerQAbility();return;}
 if(key==='cloak'){campaign.qAbility='cloak';triggerCloak();return;}
 if(key==='barrier'){campaign.qAbility='barrier';triggerBioticAbility('barrier');return;}
 if(key==='well'||key==='dash')triggerBioticAbility(key);
}
function triggerEquippedBiotic(){
 if(mp.active){if(!mp.host){mp._abilityPressed=true;return;} mpTriggerAbility();return;}
 const b=equippedBiotic();
 if(!b){msg=lang==='fa'?'اسلات بیوتیک قفل است':'BIOTIC SLOT LOCKED';msgT=1;AudioSys.tone(120,.1,'square',.02);return;}
 triggerBioticAbility(b.key);
}
function shieldDelay(){return REGEN.shieldDelay;}
function shieldRate(){return player.barrier>0?REGEN.shieldRate*1.25:REGEN.shieldRate;}
function maxShield(){return player&&player.barrier>0?player.maxsh*1.25:player.maxsh;}
let highscore=0;try{highscore=+localStorage.getItem('gp_hi')||0;}catch(e){}

// Armor starts repairing first; kinetic shields follow after a slightly longer lull.
const REGEN={shieldDelay:3,shieldRate:16,healthDelay:1,healthRate:2.2};

const tilePos=(tx,ty)=>({x:tx*TILE+TILE/2,y:ty*TILE+TILE/2});
function buildGrid(L){
 const g=Array.from({length:L.h},()=>Array(L.w).fill(1));
 for(const r of L.rooms)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)g[y][x]=0;
 for(const [x1,y1,x2,y2] of L.corridors){
  if(x1===x2){for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)g[y][x1]=0;}
  else{for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)g[y1][x]=0;}}
 for(const [x,y] of L.cover)g[y][x]=2;
 for(const [x,y] of L.doors)g[y][x]=3;
 return g;
}
function randOpenTile(L,avoid){
 for(let i=0;i<100;i++){
  const tx=rndi(1,L.w-2),ty=rndi(1,L.h-2);
  if(tileAt(tx,ty)!==0)continue;
  if(avoid&&avoid.some(a=>Math.abs(a[0]-tx)<2&&Math.abs(a[1]-ty)<2))continue;
  return [tx,ty];}
 return [L.start[0],L.start[1]];
}
function tileAt(tx,ty){if(tx<0||ty<0||ty>=grid.length||tx>=grid[0].length)return 1;return grid[ty][tx];}
function solidAt(x,y){return tileAt(Math.floor(x/TILE),Math.floor(y/TILE))>=1;}
// Walls and locked bulkheads are the only tiles that block a body. Cover tiles
// stay clear here because they are handled as separate destructible obstacles.
function wallAtTile(tx,ty){const v=tileAt(tx,ty);return v===1||v===3;}
function solidCircle(x,y,r){
 if(!r)return solidAt(x,y);
 const minX=Math.floor((x-r)/TILE),maxX=Math.floor((x+r)/TILE);
 const minY=Math.floor((y-r)/TILE),maxY=Math.floor((y+r)/TILE);
 for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++){
  if(!wallAtTile(tx,ty))continue;
  const nx=clamp(x,tx*TILE,(tx+1)*TILE),ny=clamp(y,ty*TILE,(ty+1)*TILE);
  if((x-nx)*(x-nx)+(y-ny)*(y-ny)<r*r)return true;
 }
 return false;
}
// Spawns use the actor's real radius, not just its center tile, so an enemy
// never appears halfway inside a wall, crate, barrel, the player or another foe.
function safeSpawn(x,y,r){
 const p={x:0,y:0};
 const clear=(px,py)=>{
  p.x=px;p.y=py;
  if(solidCircle(px,py,r))return false;
  for(const c of cover)if(c.hp>0&&dist(p,c)<r+TILE/2-4)return false;
  for(const b of barrels)if(!b.dead&&dist(p,b)<r+b.r+4)return false;
  if(player&&!player.dead&&dist(p,player)<r+player.r+8)return false;
  for(const e of enemies)if(!e.dead&&dist(p,e)<r+e.r+4)return false;
  return true;
 };
 if(clear(x,y))return [x,y];
 const tx0=Math.floor(x/TILE),ty0=Math.floor(y/TILE);
 for(let ring=1;ring<=5;ring++){
  for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
   const tx=tx0+dx,ty=ty0+dy;
   if(tx<0||ty<0||ty>=grid.length||tx>=grid[0].length)continue;
   if(tileAt(tx,ty)!==0)continue;
   const px=tx*TILE+TILE/2,py=ty*TILE+TILE/2;
   if(clear(px,py))return [px,py];
  }
 }
 return [x,y];
}
function safePlaceEnemy(e){const [px,py]=safeSpawn(e.x,e.y,e.r);e.x=px;e.y=py;return e;}
function makeEnemy(type,x,y){
 const D={trooper:{hp:55,r:15,spd:62,fire:1.1,dmg:9,col:0xe8483c,range:330},
  elite:{hp:100,r:16,spd:74,fire:.75,dmg:12,col:0xff7a2f,range:360},
  mech:{hp:220,r:22,spd:40,fire:1.5,dmg:18,col:0xb0423c,range:380},
  warden:{hp:380,r:24,spd:48,fire:1.0,dmg:14,col:0xffb04a,range:340,ability:'SHOCK SLAM'},
  phantom:{hp:250,r:17,spd:94,fire:.62,dmg:13,col:0xb07aff,range:390,ability:'BLINK STRIKE'},
  technician:{hp:190,r:16,spd:54,fire:.82,dmg:10,col:0x7affb0,range:360,ability:'OVERCHARGE'},
  praetorian:{hp:540,r:26,spd:44,fire:.9,dmg:16,col:0x7ad8ff,range:380,ability:'NULL PULSE',
   name:'PRAETORIAN',miniBoss:true},
  lancer:{hp:470,r:20,spd:68,fire:.75,dmg:18,col:0xff5a8a,range:470,ability:'RAIL LANCE',
   name:'LANCER',miniBoss:true},
  juggernaut:{hp:620,r:24,spd:54,fire:1.05,dmg:26,col:0x9fd8ff,range:150,
   ability:'BIG BIOTIC HAMMER',name:'JUGGERNAUT',miniBoss:true},
  boss:{hp:900,r:30,spd:52,fire:.9,dmg:20,col:0xffcf3b,range:420,ability:'MIND LASH',name:'DIRECTOR'},
  directorMech:{hp:720,r:32,spd:44,fire:1.15,dmg:24,col:0xff5a3c,range:420,
   ability:'SIEGE SLAM',name:'DIRECTOR MECH'}}[type];
 if(type==='boss'){
  if(campaign.flags.saveInali)D.hp=760;
  if(campaign.flags.destroyCore)D.hp=1080;
 }
 if(type==='directorMech'&&campaign.flags.destroyCore)D.hp+=120;
 if(type==='phantom'&&campaign.flags.weaponizeTruth)D.hp+=40;
 const e={type,x,y,r:D.r,hp:D.hp,maxhp:D.hp,spd:D.spd,fire:rnd(0,D.fire),ft:D.fire,dmg:D.dmg,col:D.col,
  range:D.range,ability:D.ability||'',abilityCd:D.ability?(type==='boss'?5.5:rnd(1.8,3.4)):0,
  name:D.name||'',miniBoss:!!D.miniBoss,
  summoned:false,ang:0,hitT:0,stun:0,dead:false,charge:0,ca:0,phase:0,
  hurricane:0,hurricaneHitCd:0,hammerAng:0,hammerWindup:0,hammerRecover:0,
  hammerDodged:false,counterCounted:false,duelReads:0,duelResolved:false,duelTimer:0,
  dirPhase:type==='boss'?(levelIdx===4?0:2):-1,dirArmor:false,dirStarted:false,
  dirSubordinate:false,dirMount:null,ally:false,hassleCd:rnd(5,8),
  vx:0,vy:0,walk:0,recoil:0,deathT:0};
 if(type==='boss'&&campaign.flags.saveInali)e.abilityCd=7;
 if(type==='boss'&&campaign.flags.destroyCore)e.abilityCd=3.4;
 if(type==='praetorian')e.abilityCd=3.2;
 if(type==='lancer')e.abilityCd=2.6;
 if(type==='juggernaut')e.abilityCd=2.6;
 if(type==='directorMech')e.abilityCd=2.8;
 return e;
}

/* ---------------- 3D MODELS ---------------- */
/* ---------------- 3D MODELS (organic geometry, no boxes) ---------------- */
const SPH=new THREE.SphereGeometry(1,14,10), CYL=new THREE.CylinderGeometry(1,1,1,10);
const CONE=new THREE.ConeGeometry(1,1,10), OCT=new THREE.OctahedronGeometry(1,0), DODEC=new THREE.DodecahedronGeometry(1,0);
// Flat transparent blobs replace the real-time shadow map without a shadow pass.
const BLOB_GEO=new THREE.SphereGeometry(1,10,6);
// One reusable ring for short-lived enemy-ability shockwaves and vortices.
const ABILITY_RING_GEO=new THREE.TorusGeometry(1,.055,6,28);
// Shared command sigil for bosses and mini-bosses so they read as encounters,
// not reskinned troopers, without adding per-enemy geometry churn.
const BOSS_SIGIL_GEO=new THREE.TorusGeometry(1,.05,6,36);
const BLOB_MAT=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.26,depthWrite:false});
function blobShadow(){const m=new THREE.Mesh(BLOB_GEO,BLOB_MAT);m.scale.set(14,.35,12);return m;}
const UP=new THREE.Vector3(0,1,0), VEC=new THREE.Vector3();
function mat(color,emissive=0,metal=.35,rough=.5){
 return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,
  emissive:emissive||0x000000,emissiveIntensity:emissive?1.1:0});
}
function shape(geo,sx,sy,sz,color,emissive,metal){
 const m=new THREE.Mesh(geo,mat(color,emissive,metal));
 m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;return m;
}
function ball(x,y,z,rx,ry,rz,color,emissive,metal){
 const m=shape(SPH,rx,ry===undefined?rx:ry,rz===undefined?rx:rz,color,emissive,metal);
 m.position.set(x,y,z);return m;
}
function rod(a,b,r,color){
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz)||1;
 const m=shape(CYL,r,len,r,color);
 m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
 m.quaternion.setFromUnitVectors(UP,VEC.set(dx,dy,dz).normalize());
 return m;
}
// Elliptical lathe: [xRadius, zRadius, height]. The chest and abdomen use
// separate meshes but share the same ring at the seam so they read as one body.
function ellipticBodyGeo(profile,segments=18){
 const verts=[],ring=(p,i)=>{
  const a=i/segments*TAU;
  return [Math.cos(a)*p[0],p[2],Math.sin(a)*p[1]];
 };
 for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){
  const a=ring(profile[j],i),b=ring(profile[j],i+1),
   c=ring(profile[j+1],i+1),d=ring(profile[j+1],i);
  verts.push(...a,...b,...d,...b,...c,...d);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(verts),3));
 geo.computeVertexNormals();return geo;
}
function bodyMesh(profile,material,segments=18){
 const m=new THREE.Mesh(ellipticBodyGeo(profile,segments),material);
 m.castShadow=true;m.receiveShadow=true;m.userData.profile=profile;return m;
}
// Smooth tapered body part: [radius, height] pairs, bottom-to-top.
// This keeps arms and legs continuous instead of visible ball-jointed sticks.
function smoothLimb(profile,color,metal=.1,rough=.85){
 const pts=profile.map(p=>new THREE.Vector2(p[0],p[1]));
 const m=new THREE.Mesh(new THREE.LatheGeometry(pts,12),mat(color,0,metal,rough));
 m.material.side=THREE.DoubleSide||2;
 m.castShadow=true;m.receiveShadow=true;return m;
}
// Smooth tapered bone between two arbitrary points, so arms do not look like
// separate cylinders joined by exposed balls.
function smoothBone(a,b,radii,color,metal=.1,rough=.85){
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz)||1;
 const pts=radii.map((r,i)=>new THREE.Vector2(r,-len/2+len*i/(radii.length-1)));
 const m=new THREE.Mesh(new THREE.LatheGeometry(pts,12),mat(color,0,metal,rough));
 m.material.side=THREE.DoubleSide||2;
 m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);
 m.quaternion.setFromUnitVectors(UP,VEC.set(dx,dy,dz).normalize());
 m.castShadow=true;m.receiveShadow=true;return m;
}
// Flat circular armor hardware. axis='x' faces forward, 'z' faces the side,
// 'y' faces up. Used for attachment points, optical sensors and comms.
function armorRing(parent,x,y,z,r,tube,color,emissive,axis){
 const m=new THREE.Mesh(new THREE.TorusGeometry(r,tube,6,14),
  mat(color,emissive||0,.72,.34));
 m.position.set(x,y,z);
 if(axis==='x')m.rotation.y=Math.PI/2;
 else if(axis==='y')m.rotation.x=Math.PI/2;
 parent.add(m);return m;
}
// Compact, blunt carbine held diagonally across the body - no long protruding barrel.
function rifleModel(visor){
 const r=new THREE.Group();
 r.add(ball(0,0,0,6.5,2.8,3.2,0x1a2632));
 const stock=ball(-8,-1.5,0,4.5,3.5,2.8,0x14202c);stock.rotation.z=-.25;r.add(stock);
 const grip=shape(CONE,1.8,6,1.8,0x101a24);grip.position.set(-3,-5.5,0);grip.rotation.z=Math.PI+.25;r.add(grip);
 const mag=ball(3,-5,0,2.6,4.5,2.2,0x223445);mag.rotation.z=-.35;r.add(mag);
 r.add(ball(9.5,0,0,4.6,2.1,2.4,0x0f1a24));
 const brake=shape(CYL,2.2,3.4,2.2,0x0a121a);brake.rotation.z=Math.PI/2;brake.position.set(15,0,0);r.add(brake);
 r.add(ball(-1,3.4,0,2.4,1.4,1.6,visor,visor));
 for(const s of [-1,1]){const v=shape(OCT,1.1,1.1,1.1,visor,visor);v.position.set(2,1.6,s*3.1);r.add(v);}
 const flash=shape(CONE,2.6,7,2.6,visor,visor);flash.rotation.z=-Math.PI/2;
 flash.position.set(19,0,0);flash.visible=false;r.add(flash);
 r.userData.flash=flash;return r;
}
// Randall: enclosed blue-and-black powered tactical armor. No exposed face,
// no skin and no hair. Layered cobalt plates over a carbon undersuit, glossy
// black helmet, off-white faceplate, twin white bars and circular sensors.
function armoredPersonModel(palette){
 const pal=Object.assign({blue:0x1d5f9e,cobalt:0x2c7cbb,bright:0x55baf0,
  carbon:0x070c12,graphite:0x15212c,dark:0x0d151e,
  silver:0xa8bccb,white:0xe3edf3,amber:0xffc23a,visor:0x8fe8ff},palette||{});
 const {blue,cobalt,bright,carbon,graphite,dark,silver,white,amber,visor}=pal;
 const g=new THREE.Group(),u={},pulse=[],hands=[],armorParts=[],sensors=[],helmetStripes=[];
 const addPart=(parent,p)=>{parent.add(p);armorParts.push(p);return p;};
 const indicator=(parent,x,y,z,r=.5)=>{
  const b=ball(x,y,z,r,r,r,amber,amber,.6,.3);parent.add(b);pulse.push(b);return b;};
 const attach=(parent,x,y,z,r)=>{
  armorRing(parent,x,y,z,r,.28*r+0.14,blue,0,'x');
  const hub=ball(x+.22,y,z,r*.5,r*.5,r*.5,amber,amber,.6,.3);
  parent.add(hub);pulse.push(hub);sensors.push(hub);return hub;};
 const scratch=(parent,a,b)=>{
  const s=rod(a,b,.1,silver);s.material.metalness=.2;s.material.roughness=.95;
  parent.add(s);return s;};
 // ----- torso: broad armored shoulders, tapered waist, sealed collar -----
 const torso=new THREE.Group();torso.position.y=15;g.add(torso);u.torso=torso;
 // Separate abdomen and chest meshes. They share an identical ring at y=15,
 // while the chest widens across X and stays shallow in Z for the arm to clear.
 const abdomenProfile=[[0,0,0],[3.0,3.0,0],[3.4,3.4,3],[3.2,3.2,8],
  [3.5,3.5,12],[3.7,3.7,15]];
 const chestProfile=[[3.7,3.7,15],[4.6,3.5,18],[5.2,3.4,21],
  [4.8,3.3,24],[3.6,3.0,26],[0,0,28]];
 const abdomen=bodyMesh(abdomenProfile,mat(carbon,0,.2,.8));
 const chest=bodyMesh(chestProfile,mat(carbon,0,.2,.8));
 abdomen.material.side=THREE.DoubleSide||2;chest.material.side=THREE.DoubleSide||2;
 torso.add(abdomen,chest);
 u.body=abdomen;u.chest=chest;u.underSuit=abdomen;u.bodyProfile=abdomenProfile;u.chestProfile=chestProfile;
 torso.add(ball(0,-1,0,4.0,2.8,4.4,carbon,0,.2,.8));
 // faint carbon weave where the undersuit shows between plates
 for(let i=0;i<5;i++){
  const y=4.5+i*3.2;
  torso.add(rod([4.0,y,-2.7],[4.0,y+2.2,2.7],.1,graphite));
  torso.add(rod([4.03,y,2.7],[4.03,y+2.2,-2.7],.1,graphite));
 }
 const neck=smoothLimb([[2.2,0],[2.4,1.5],[2.5,3],[2.3,4]],graphite,.45,.45);
 neck.position.y=25;torso.add(neck);u.neck=neck;
 // layered anatomical chest, scaled to the slimmer frame
 addPart(torso,ball(3.4,18.5,-0.8,2.8,5.2,1.0,blue,0,.64,.4));
 addPart(torso,ball(3.4,18.5,0.8,2.8,5.2,1.0,blue,0,.64,.4));
 addPart(torso,ball(4.4,19,0,1.8,5.0,1.0,cobalt,0,.68,.36));
 addPart(torso,ball(3.4,9.2,0,2.0,4.2,2.6,blue,0,.66,.4));
 for(let i=0;i<3;i++)
  addPart(torso,ball(3.5,6+i*3.1,0,1.8,1.0,2.4,cobalt,0,.7,.34));
 for(const s of [-1,1])
  addPart(torso,ball(2.5,12.5,s*3.3,1.6,4.0,1.1,graphite,0,.6,.45));
 // Enlarged separate back shell under the armor: local -X is the rear.
 // Dark carbon/graphite keep it reading as padded undersuit, not bare skin.
 const back=new THREE.Group();torso.add(back);u.back=back;
 addPart(back,ball(-3.2,23.5,0,3.4,3.0,4.8,carbon,0,.24,.8));
 for(const s of [-1,1]){
  addPart(back,ball(-4.2,18,s*2.6,3.0,6.4,3.2,carbon,0,.24,.78));
  addPart(back,ball(-4.6,22.5,s*3.0,1.7,3.4,2.6,graphite,0,.5,.6));
  addPart(back,ball(-3.6,10.5,s*2.0,2.1,4.2,2.4,carbon,0,.24,.78));
  addPart(back,rod([-5.0,8,s*1.2],[-5.1,22,s*1.4],1.2,graphite));
 }
 addPart(back,ball(-5.0,14.5,0,1.4,7.4,1.5,graphite,0,.45,.65));
 // reinforced collar and belt
 const collar=new THREE.Mesh(new THREE.TorusGeometry(5.0,0.95,6,16),mat(dark,0,.55,.5));
 collar.rotation.x=-Math.PI/2;collar.position.y=25;torso.add(collar);
 const collarBlue=new THREE.Mesh(new THREE.TorusGeometry(5.4,0.4,6,16),mat(blue,0,.7,.35));
 collarBlue.rotation.x=-Math.PI/2;collarBlue.position.y=25.8;torso.add(collarBlue);
 const belt=new THREE.Mesh(new THREE.TorusGeometry(4.6,0.85,6,16),mat(dark,0,.5,.55));
 belt.rotation.x=-Math.PI/2;belt.position.y=3;torso.add(belt);
 for(const s of [-1,1]){
  addPart(torso,ball(4.5,3,s*2.8,1.7,1.5,1.6,graphite,0,.55,.48));
  addPart(torso,ball(-3.0,2.2,s*4.8,2.1,3.5,1.5,graphite,0,.55,.5));
  const holster=shape(CONE,2,6,1.7,dark,0,.4);
  holster.position.set(-1.5,.2,s*5.4);holster.rotation.z=Math.PI+.12;torso.add(holster);
 }
 // attachment points, insignia, small amber indicators and field scratches
 attach(torso,5.4,20.5,-.7,.8);attach(torso,5.4,20.5,.7,.8);
 attach(torso,4.4,9,0,.8);
 const badge=ball(5.2,23.4,-.6,.4,1.6,.7,white,0,.7,.35);torso.add(badge);
 torso.add(rod([-1.5,24,3.2],[1.6,17,3.6],.55,bright));
 torso.add(rod([1.2,23,3.4],[3.2,19.5,3.5],.4,white));
 indicator(torso,5.0,15.2,-1.2);indicator(torso,5.0,15.2,1.2);
 scratch(torso,[4.6,20,-1.6],[4.0,16.5,-1.4]);
 scratch(torso,[4.0,12,1.2],[3.4,9.5,1.6]);
 u.armor=armorParts;u.sensors=sensors;
 // ----- legs: asymmetrical combat stance, contoured plates over carbon -----
 const mkLeg=(side,forward)=>{
  const leg=new THREE.Group();leg.position.set(forward,16,side*5.2);
  leg.add(smoothLimb([[1.9,-16],[2.3,-14],[2.7,-11],[2.6,-8],[3,-5],[3.3,-2],[3.3,0],[2.9,1]],
   carbon,.2,.72));
  addPart(leg,ball(1.5,-3,side*2.3,2.7,4.6,2.05,blue,0,.66,.4));
  addPart(leg,ball(2.1,-.8,side*1.8,2.4,2.2,2.2,cobalt,0,.68,.36));
  addPart(leg,ball(2.4,-8,side*1.8,2.5,2.4,2.3,graphite,0,.62,.44));
  addPart(leg,ball(3.45,-8,side*1.8,1.2,2,1.85,silver,0,.75,.32));
  addPart(leg,ball(1.6,-11,side*2.15,2.2,2.5,1.95,blue,0,.66,.4));
  addPart(leg,ball(1.35,-13.5,side*2.05,2,2,1.8,cobalt,0,.68,.36));
  addPart(leg,ball(3,-15.6,0,3.4,2.2,3.2,dark,0,.55,.5));
  addPart(leg,ball(6.2,-16.4,0,2.6,1.4,2.8,graphite,0,.6,.44));
  addPart(leg,ball(8,-16.4,0,1.2,1,2.3,silver,0,.75,.32));
  indicator(leg,4.1,-3,side*3.2,.42);
  scratch(leg,[4,-3.5,side*3.4],[2.5,-5.8,side*3]);
  return leg;};
 u.lLeg=mkLeg(-1,1.8);u.rLeg=mkLeg(1,-1.2);g.add(u.lLeg,u.rLeg);
 // ----- arms: biceps, exposed black elbows, forearm plates, armored gloves -----
 const mkArm=(side,hx,hy,hz,elbow)=>{
  const arm=new THREE.Group();arm.position.set(0,39,side*10);
  const hand=[hx,hy-39,hz-side*10];
  const el=elbow||[hand[0]*.48,hand[1]*.48,hand[2]*.48];
  arm.add(smoothBone([0,0,0],el,[3,2.9,2.7,2.4],carbon,.25,.68));
  arm.add(smoothBone(el,hand,[2.4,2.3,2.1,1.9],carbon,.25,.68));
  addPart(arm,ball(el[0]*.55+.4,el[1]*.55+1.2,el[2]*.55+side*.2,
   2.3,3.0,2.2,blue,0,.66,.4));
  addPart(arm,ball(el[0],el[1],el[2],2.15,2.15,2.15,graphite,0,.6,.46));
  const fa=(t)=>[el[0]+(hand[0]-el[0])*t,el[1]+(hand[1]-el[1])*t,el[2]+(hand[2]-el[2])*t];
  const f1=fa(.45),f2=fa(.78);
  addPart(arm,ball(f1[0]+.8,f1[1],f1[2]+side*.3,2.1,2.8,2.0,blue,0,.66,.4));
  addPart(arm,ball(f2[0]+.8,f2[1],f2[2],1.7,1.4,1.7,graphite,0,.65,.42));
  indicator(arm,f1[0]+2.1,f1[1]+.5,f1[2]+side*.3,.38);
  const handG=new THREE.Group();handG.position.set(hand[0],hand[1],hand[2]);arm.add(handG);
  handG.add(ball(0,0,0,2.1,1.95,1.95,graphite,0,.6,.45));
  handG.add(ball(2.15,-.25,0,1.6,1.4,2,blue,0,.68,.38));
  for(let f=-1;f<=1;f++){
   handG.add(ball(2.75,-.45,f*1.05,.62,1,.62,silver,0,.72,.32));
   handG.add(rod([2.9,-.9,f*1.05],[2.35,-1.9,f*1.15],.44,graphite));
  }
  handG.add(ball(1.6,-1.5,-1.5,1,1.1,.8,blue,0,.66,.4));
  handG.add(ball(1.6,-1.5,1.5,1,1.1,.8,blue,0,.66,.4));
  hands.push(handG);
  return arm;};
 // Left arm gets a natural elbow bend; hand coordinates stay fixed.
 u.lArm=mkArm(-1,14,30,4,[6,-3,4]);
 u.rArm=mkArm(1,1,30,9,[.6,-4.5,-.3]);
 g.add(u.lArm,u.rArm);
 // compact asymmetrical shoulder plates
 const leftPad=ball(0,41.6,-10.4,4.4,2.6,4.2,blue,0,.66,.4);
 leftPad.rotation.set(-.14,0,.08);g.add(leftPad);u.pauldron=leftPad;armorParts.push(leftPad);
 addPart(g,ball(1.4,42.8,-11.0,3.3,1.5,3.0,cobalt,0,.7,.34));
 const rightPad=ball(0,41,-10.5+21,3.8,2.3,3.6,blue,0,.66,.4);
 rightPad.rotation.set(.12,0,-.06);g.add(rightPad);armorParts.push(rightPad);
 addPart(g,ball(1.1,41.8,10.9,2.9,1.3,2.7,cobalt,0,.7,.34));
 indicator(g,1.8,42.8,-10.8,.48);indicator(g,1.3,41.8,10.8,.4);
 // arm/waist mechanical devices
 const omni=shape(OCT,1.25,1.7,1.25,graphite,0,.7,.35);
 omni.position.set(11,29,3);g.add(omni);u.omni=omni;pulse.push(omni);
 armorRing(g,11,29,3,1.7,.25,blue,0,'z');
 indicator(g,11.7,29,3,.42);
 // ----- fully enclosed helmet -----
 const head=new THREE.Group();head.position.set(0,47,0);g.add(head);u.helmet=head;u.head=head;
 const shell=ball(-.6,.9,0,5.6,5.2,5.5,carbon,0,.72,.18);
 shell.material.roughness=.16;head.add(shell);u.helmetShell=shell;
 // blue structural framing around the sides and lower shell
 for(const s of [-1,1]){
  head.add(rod([-3.6,4.3,s*3.5],[2.7,2.6,s*4.6],.68,blue));
  head.add(rod([2.7,2.6,s*4.6],[2.4,-3.2,s*3.8],.62,blue));
  head.add(ball(-1,-.5,s*5.15,1.5,2.4,.9,graphite,0,.65,.42));
  head.add(ball(-1.2,-.5,s*5.85,.85,1.25,.55,silver,0,.75,.3));
  armorRing(head,-1.2,-.5,s*6.05,.85,.22,amber,amber,'z');
  attach(head,4.9,1.2,s*2.7,.85);
 }
 armorRing(head,2.2,-.8,0,4.6,.62,blue,0,'x');
 armorRing(head,1.5,-3.3,0,3.6,.48,cobalt,0,'x');
 // off-white metallic lower faceplate and reinforced chin
 const faceplate=ball(3.3,-2.5,0,2.8,2.6,3.8,white,0,.75,.32);
 head.add(faceplate);u.faceplate=faceplate;
 head.add(ball(4.4,-4.2,0,1.8,1.4,2.6,silver,0,.7,.35));
 // two prominent white vertical reflective bars
 for(const s of [-1,1]){
  const stripe=rod([6.1,3.1,s*1.75],[6.25,-3.4,s*1.75],.5,white);
  stripe.material.emissive.setHex(0x36596b);stripe.material.emissiveIntensity=.38;
  head.add(stripe);helmetStripes.push(stripe);
 }
 // circular optical sensors / visor lens
 armorRing(head,5,3.6,0,1.05,.3,graphite,0,'x');
 const visorMesh=ball(5.35,3.6,0,.62,.62,.62,visor,visor,.55,.2);
 head.add(visorMesh);sensors.push(visorMesh);
 armorRing(head,4.7,-1.5,-3.4,.55,.18,silver,0,'x');
 armorRing(head,4.7,-1.5,3.4,.55,.18,silver,0,'x');
 u.helmetStripes=helmetStripes;u.sensors=sensors;
 u.hands=hands;u.visor=visorMesh.material;u.pulse=pulse;
 const rifle=rifleModel(visor);rifle.position.set(5,34,6);
 rifle.rotation.set(0,-.18,-.42);g.add(rifle);
 const shotgun=rifleModel(visor);shotgun.position.copy(rifle.position);
 shotgun.rotation.set(rifle.rotation.x,rifle.rotation.y,rifle.rotation.z);
 shotgun.scale.set(.82,1.15,1.32);g.add(shotgun);
 u.rifle=rifle;u.shotgun=shotgun;u.guns=[rifle,shotgun];
 u.rifleX=5;u.rifleRotZ=-.42;
 g.userData=u;return g;
}
function humanoidModel(color,dark,visor,scale=1,opts={}){
 const g=new THREE.Group(),u={};
 g.add(ball(0,17,0,5,4,5.5,dark));
 const torso=new THREE.Group();torso.position.y=15;g.add(torso);u.torso=torso;
 const abdomenProfile=[[0,0,0],[3.2,3.2,0],[3.6,3.6,4],[3.4,3.4,9],
  [3.8,3.8,13],[4.0,4.0,15]];
 const chestProfile=[[4.0,4.0,15],[5.2,4.0,18],[6.0,4.2,21],
  [5.4,3.8,24],[3.8,3.2,26],[0,0,28]];
 const abdomen=bodyMesh(abdomenProfile,mat(color,0,.35,.55));
 const chest=bodyMesh(chestProfile,mat(color,0,.35,.55));
 abdomen.material.side=THREE.DoubleSide||2;chest.material.side=THREE.DoubleSide||2;
 torso.add(abdomen,chest);
 u.body=abdomen;u.chest=chest;u.bodyProfile=abdomenProfile;u.chestProfile=chestProfile;
 // Matching enlarged rear shell, dark and armored rather than exposed skin.
 const back=new THREE.Group();torso.add(back);u.back=back;
 back.add(ball(-3.4,23.5,0,3.2,2.8,4.6,dark));
 for(const s of [-1,1]){
  back.add(ball(-4.6,18,s*2.7,3.0,6.2,3.2,color));
  back.add(ball(-4.9,22.5,s*3.0,1.6,3.2,2.4,dark));
  back.add(ball(-3.8,10.5,s*2.1,2.1,4.0,2.4,color));
  back.add(rod([-5.2,8,s*1.2],[-5.3,22,s*1.4],1.1,dark));
 }
 back.add(ball(-5.2,14.5,0,1.4,7.2,1.5,color));
 const mark=shape(OCT,1.8,4,1.8,opts.mark||0xdfefff);mark.position.set(6.6,32,0);g.add(mark);
 const collar=new THREE.Mesh(new THREE.TorusGeometry(4.6,1.2,6,14),mat(dark));
 collar.position.y=43;g.add(collar);
 g.add(rod([0,42,0],[0,45,0],2.3,dark));
 const head=new THREE.Group();head.position.set(0,48,0);
 head.add(ball(0,0,0,5.4,6,5.4,0x0b121b));
 head.add(ball(0,2.5,0,6.2,3.8,6.2,color));
 const visorMesh=ball(5,0,0,1.6,2.4,4.6,visor,visor);head.add(visorMesh);
 if(opts.crest){const cr=shape(CONE,1.8,7,1.8,color);cr.position.set(-1,7,0);head.add(cr);}
 g.add(head);u.head=head;
 const mkLeg=side=>{
  const leg=new THREE.Group();leg.position.set(0,16,side*5);
  leg.add(ball(0,0,0,3.6,3.6,3.6,dark));
  const knee=[2,-8,0],ankle=[0,-15,0];
  leg.add(rod([0,0,0],knee,3,color));
  leg.add(ball(knee[0],knee[1],knee[2],2.8,2.8,2.8,dark));
  leg.add(rod(knee,ankle,2.4,color));
  leg.add(ball(3,-16,0,4.2,2.2,3.4,dark));
  return leg;};
 u.lLeg=mkLeg(-1);u.rLeg=mkLeg(1);g.add(u.lLeg,u.rLeg);
 const mkArm=(side,hx,hy,hz)=>{
  const arm=new THREE.Group();arm.position.set(0,40,side*9);
  const elbow=[4,-8,side*1],hand=[hx,hy-40,hz-side*9];
  arm.add(ball(0,0,0,3.4,3.4,3.4,dark));
  arm.add(rod([0,0,0],elbow,2.8,color));
  arm.add(ball(elbow[0],elbow[1],elbow[2],2.5,2.5,2.5,dark));
  arm.add(rod(elbow,hand,2.2,color));
  arm.add(ball(hand[0],hand[1],hand[2],2.5,2.5,2.5,dark));
  return arm;};
 u.lArm=mkArm(-1,13,30,4);u.rArm=mkArm(1,1,30,9);g.add(u.lArm,u.rArm);
 const rifle=rifleModel(visor);rifle.position.set(5,34,6);rifle.rotation.set(0,-.18,-.42);g.add(rifle);
 const shotgun=rifleModel(visor);shotgun.position.copy(rifle.position);
 shotgun.rotation.set(rifle.rotation.x,rifle.rotation.y,rifle.rotation.z);
 shotgun.scale.set(.82,1.15,1.32);g.add(shotgun);
 u.rifle=rifle;u.shotgun=shotgun;u.guns=[rifle,shotgun];
 u.rifleX=5;u.rifleRotZ=-.42;u.visor=visorMesh.material;
 if(opts.spikes)for(const s of [-1,1]){
  const sp=shape(CONE,2.6,9,2.6,opts.spikes);sp.position.set(0,46,s*13);sp.rotation.x=s*.5;g.add(sp);}
 g.scale.setScalar(scale);g.userData=u;return g;
}
function mechModel(color){
 const g=new THREE.Group(),u={},dark=0x3a1512;
 const mkLeg=side=>{
  const leg=new THREE.Group();leg.position.set(0,22,side*11);
  leg.add(ball(0,0,0,5,5,5,dark));
  leg.add(rod([0,0,0],[3,-11,0],4.2,color));
  leg.add(ball(3,-11,0,4,4,4,dark));
  leg.add(rod([3,-11,0],[1,-20,0],3.6,color));
  leg.add(ball(4,-21,0,7,2.6,6,dark));
  return leg;};
 u.lLeg=mkLeg(-1);u.rLeg=mkLeg(1);g.add(u.lLeg,u.rLeg);
 const hull=ball(0,34,0,15,10,14,color);g.add(hull);u.torso=hull;
 const cockpit=ball(3,46,0,10,6,10,0x160a08);g.add(cockpit);u.head=cockpit;
 const eye=ball(13,46,0,1.5,2.6,5,0xff6a4a,0xff3a20);g.add(eye);u.visor=eye.material;
 u.cannons=[];
 for(const s of [-1,1]){
  const c=new THREE.Group();c.position.set(3,35,s*16);
  c.add(ball(0,0,0,4.5,4.5,4.5,dark));
  const barrel=shape(CYL,2.2,12,2.2,0x2a1a18);barrel.rotation.z=Math.PI/2;barrel.position.set(7,0,0);c.add(barrel);
  c.add(ball(13,0,0,2.6,2.6,2.6,0xff6a4a,0xff3a20));
  g.add(c);u.cannons.push(c);}
 g.userData=u;return g;
}
function bossModel(){
 const g=humanoidModel(0xd4a017,0x3a2a08,0xfff3a0,1.35,{mark:0xfff3a0,crest:true});
 const u=g.userData;
 u.core=ball(10,33,0,5,5,5,0xfff3a0,0xffcc40);g.add(u.core);
 g.add(ball(-9,27,0,3,20,16,0x5a1414));
 for(let i=-1;i<=1;i++){
  const sp=shape(CONE,2.4,10,2.4,0xffe98a,0xffb020);
  sp.position.set(0,68,i*6);sp.rotation.z=i*.3;g.add(sp);}
 return g;
}
function directorMechModel(){
 const g=mechModel(0xa82924),u=g.userData;
 g.scale.setScalar(1.28);
 for(const s of [-1,1]){
  const plate=shape(CONE,4.5,14,4.5,0xff6a4a,0xff2a10);
  plate.position.set(0,51,s*18);plate.rotation.x=s*.55;g.add(plate);}
 const rider=humanoidModel(0xd4a017,0x3a2a08,0xfff3a0,.44,{mark:0xfff3a0,crest:true});
 rider.position.set(-2,28,0);g.add(rider);u.rider=rider;
 const core=ball(15,35,0,6,6,6,0xff5a3c,0xff2a10);g.add(core);u.core=core;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(20,1.1,6,24),mat(0xff7a4a,0xff3a10));
 ring.rotation.x=-Math.PI/2;ring.position.y=34;g.add(ring);u.field=ring;
 return g;
}
function armoredBossModel(){
 const g=bossModel(),u=g.userData;u.armor=[];
 for(const s of [-1,1]){
  const shoulder=ball(-2,46,s*16,9,5,7,0xffe08a,0xffb020);g.add(shoulder);u.armor.push(shoulder);
  const plate=shape(CONE,3.2,15,3.2,0xfff3a0,0xffcc40);
  plate.position.set(-8,38,s*13);plate.rotation.x=s*.35;g.add(plate);u.armor.push(plate);}
 const chest=ball(-5,35,0,13,18,14,0xb08918,0xffcc40);g.add(chest);u.armor.push(chest);
 g.scale.setScalar(1.18);
 return g;
}
// Bosses keep their own colour identity, but this shared command silhouette —
// ground sigil, torso halo, crown and heavy pauldrons — makes them instantly
// readable as encounters instead of ordinary humanoid enemies.
function addBossPresence(g,e){
 const u=g.userData,col=e.col||0xffffff;
 const major=e.type==='boss'||e.type==='directorMech';
 g.scale.multiplyScalar(major?1.16:1.1);
 u.bossSigil=new THREE.Mesh(BOSS_SIGIL_GEO,fxMat(col,.48));
 u.bossSigil.scale.set(major?34:27,major?34:27,1);
 u.bossSigil.rotation.x=-Math.PI/2;u.bossSigil.position.y=2.6;g.add(u.bossSigil);
 u.bossHalo=new THREE.Mesh(BOSS_SIGIL_GEO,fxMat(col,.3,true));
 u.bossHalo.scale.setScalar(major?31:25);
 u.bossHalo.rotation.y=Math.PI/2;u.bossHalo.position.y=major?44:41;g.add(u.bossHalo);
 const crest=shape(CONE,major?4.2:3.2,major?18:14,major?4.2:3.2,col,col);
 crest.position.set(-1,major?78:72,0);g.add(crest);u.bossCrest=crest;
 for(const s of [-1,1]){
  const pauldron=shape(CONE,major?5.6:4.4,major?15:12,major?5.6:4.4,col,col);
  pauldron.position.set(-2,major?52:48,s*(major?21:18));
  pauldron.rotation.x=s*.58;g.add(pauldron);
 }
}
function enemyModel(e){
 let g;
 if(e.type==='directorMech')g=directorMechModel();
 else if(e.type==='boss')g=e.dirArmor?armoredBossModel():bossModel();
 else if(e.type==='mech')g=mechModel(e.col);
 else if(e.type==='elite')g=humanoidModel(0xe07b2f,0x4a2a10,0xffb04a,1.1,{mark:0xffd27a,spikes:0xffb04a,crest:true});
 else if(e.type==='praetorian'){
  g=humanoidModel(0x2c7894,0x102a38,0xbff2ff,1.24,{mark:0x7ad8ff,crest:true});
  const u=g.userData;
  u.core=ball(10,33,0,5.5,5.5,5.5,0x7ad8ff,0x30b8ff);g.add(u.core);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(15,.8,6,24),mat(0x7ad8ff,0x7ad8ff));
  ring.rotation.x=-Math.PI/2;ring.position.y=34;g.add(ring);u.field=ring;
 }
 else if(e.type==='lancer'){
  g=humanoidModel(0x8f2848,0x320c18,0xff9ab8,1.16,{mark:0xff5a8a,spikes:0xff5a8a,crest:true});
  const u=g.userData;
  const rail=shape(CYL,1.5,30,1.5,0xff5a8a,0xff2050);
  rail.rotation.z=Math.PI/2;rail.position.set(18,36,0);g.add(rail);
  for(const s of [-1,1]){
   const fin=shape(CONE,2.6,11,2.6,0xff9ab8,0xff5a8a);
   fin.position.set(0,50,s*12);fin.rotation.x=s*.45;g.add(fin);}
  u.visor=rail.material;
 }
 else if(e.type==='juggernaut'){
  g=humanoidModel(0x5d6d7a,0x18232d,0xbfefff,1.3,{mark:0x9fd8ff,spikes:0x9fd8ff,crest:true});
  const u=g.userData;
  const hammer=new THREE.Group();hammer.position.set(1,-10,0);hammer.scale.setScalar(1.28);u.rArm.add(hammer);
  hammer.add(rod([0,-14,0],[0,12,0],2.1,0x26333f));
  hammer.add(ball(0,12,0,7.4,5,8.6,0x9fd8ff,0x6fcfff));
  hammer.add(ball(0,12,0,4,2.8,5,0xe6faff,0xbfe8ff));
  const edge=new THREE.Mesh(new THREE.TorusGeometry(9,.7,6,20),mat(0xbfe8ff,0x6fcfff));
  edge.rotation.y=Math.PI/2;edge.position.set(0,12,0);hammer.add(edge);
  u.hammer=hammer;
  u.core=ball(8,34,0,5,5,5,0x9fd8ff,0x4fb5ff);g.add(u.core);
 }
 else if(e.type==='warden'){
  g=humanoidModel(0xc78a2a,0x3a2410,0xffd070,1.28,{mark:0xffe2a0,spikes:0xffb84a,crest:true});
  const u=g.userData;u.core=ball(10,33,0,5.5,5.5,5.5,0xffb84a,0xff7a10);g.add(u.core);
  for(const s of [-1,1])g.add(ball(0,43,s*14,6.5,3.5,6,0xc78a2a));
 }
 else if(e.type==='phantom'){
  g=humanoidModel(0x6b46a8,0x1d1238,0xd7b0ff,1.05,{mark:0xc79bff,crest:true});
  const u=g.userData;
  const halo=new THREE.Mesh(new THREE.TorusGeometry(8,.7,6,20),
   mat(0xb07aff,0xb07aff));halo.position.set(-2,63,0);halo.rotation.y=Math.PI/2;g.add(halo);
  u.halo=halo;
 }
 else if(e.type==='technician'){
  g=mechModel(e.col);const u=g.userData;
  const aerial=shape(CYL,.7,18,.7,0x7affb0);aerial.position.set(-6,59,0);g.add(aerial);
  const node=ball(-6,69,0,3,3,3,0x7affb0,0x7affb0);g.add(node);u.visor=node.material;
 }
 else g=humanoidModel(0xc0392b,0x3a1210,0xff6050,1,{mark:0xff9a8a});
 if(e.miniBoss||e.type==='boss'||e.type==='directorMech')addBossPresence(g,e);
 return g;
}
function animateModel(m,e,moving){
 const u=m&&m.userData;if(!u)return;
 const sw=Math.sin(e.walk||0),rec=e.recoil||0;
 const idle=Math.sin(time*2.2+(e.x||0)*.01)*.5+.5;
 if(u.lLeg)u.lLeg.rotation.z=sw*.6*moving;
 if(u.rLeg)u.rLeg.rotation.z=-sw*.6*moving;
 if(u.lArm)u.lArm.rotation.z=-sw*.25*moving-rec*.6;
 if(u.rArm)u.rArm.rotation.z=sw*.25*moving-rec*.8;
 if(u.torso){u.torso.rotation.z=rec*.12+(e.hitT>0?Math.sin(time*45)*.09:0);
  u.torso.scale.y=1+idle*.015;}
 if(u.head){u.head.rotation.z=e.hitT>0?Math.sin(time*38)*.16:0;
  u.head.rotation.y=Math.sin(time*.9+(e.y||0)*.01)*.12;}
 if(u.guns)for(const gun of u.guns){
  gun.position.x=u.rifleX-rec*4;
  gun.rotation.z=u.rifleRotZ-(e.reload>0?.55:0)-rec*.12;
  if(gun.userData.flash)gun.userData.flash.visible=gun.visible&&rec>.6;}
 if(u.halo){u.halo.rotation.z+=.04;u.halo.scale.setScalar(1+.12*Math.sin(time*5));}
 if(u.bossSigil){u.bossSigil.rotation.z+=.012;
  u.bossSigil.material.opacity=.34+.16*Math.sin(time*3.4);}
 if(u.bossHalo){u.bossHalo.rotation.z-=.018;
  u.bossHalo.rotation.y=Math.PI/2+Math.sin(time*1.4)*.16;}
 if(u.bossCrest)u.bossCrest.scale.y=1+.12*Math.sin(time*3.6);
 if(u.core)u.core.scale.setScalar(1+.18*Math.sin(time*4));
 if(u.tail)u.tail.rotation.z=Math.PI+.22+Math.sin(time*2)*.05;
 if(u.pulse)for(const p of u.pulse)
  if(p.material)p.material.emissiveIntensity=.85+.45*Math.sin(time*5);
}
function floorTexture(theme){
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
 g.fillStyle=theme==='desert'?'#4a2f18':theme==='relay'?'#0d1a26':'#203b4d';
 g.fillRect(0,0,256,256);
 if(theme==='snow'){
  for(let i=0;i<800;i++){g.fillStyle='rgba(230,248,255,'+(Math.random()*.05)+')';
   g.fillRect(Math.random()*256,Math.random()*256,Math.random()*18+1,1);}
  g.strokeStyle='rgba(150,220,255,.22)';g.lineWidth=2;
  for(let i=0;i<14;i++){g.beginPath();let x=rnd(0,256),y=rnd(0,256);
   g.moveTo(x,y);for(let k=0;k<4;k++){x+=rnd(-40,40);y+=rnd(-40,40);g.lineTo(x,y);}g.stroke();}
  g.strokeStyle='rgba(10,40,60,.5)';g.lineWidth=3;
  for(let x=0;x<256;x+=64)for(let y=0;y<256;y+=64)g.strokeRect(x+4,y+4,56,56);
 }else if(theme==='relay'){
  g.strokeStyle='rgba(80,200,255,.28)';g.lineWidth=2;
  for(let i=0;i<26;i++){
   let x=rndi(0,7)*32,y=rndi(0,7)*32;g.beginPath();g.moveTo(x,y);
   for(let k=0;k<3;k++){if(Math.random()<.5)x+=rndi(-3,3)*32;else y+=rndi(-3,3)*32;g.lineTo(x,y);}
   g.stroke();g.fillStyle='rgba(120,230,255,.6)';g.fillRect(x-3,y-3,6,6);}
  g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=4;
  for(let x=0;x<256;x+=64)for(let y=0;y<256;y+=64)g.strokeRect(x+3,y+3,58,58);
 }else{
  for(let i=0;i<22;i++){g.strokeStyle='rgba(255,190,120,'+(.06+Math.random()*.08)+')';
   g.lineWidth=rnd(2,6);g.beginPath();const y=rnd(0,256);
   for(let x=0;x<=256;x+=16)g.lineTo(x,y+Math.sin(x*.05+i)*6);g.stroke();}
  g.strokeStyle='rgba(60,30,12,.45)';g.lineWidth=2;
  for(let i=0;i<10;i++){let x=rnd(0,256),y=rnd(0,256);g.beginPath();g.moveTo(x,y);
   for(let k=0;k<4;k++){x+=rnd(-32,32);y+=rnd(-32,32);g.lineTo(x,y);}g.stroke();}
 }
 g.fillStyle=theme==='desert'?'rgba(255,180,110,.35)':'rgba(160,220,255,.3)';
 for(let x=0;x<256;x+=64)for(let y=0;y<256;y+=64){
  g.beginPath();g.arc(x+8,y+8,2,0,TAU);g.arc(x+56,y+56,2,0,TAU);g.fill();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.repeat.set(LEVELS[levelIdx].w/3,LEVELS[levelIdx].h/3);return t;
}
const DUMMY=new THREE.Object3D();
function buildSnow(L,col){
 for(let i=0;i<34;i++){
  const [tx,ty]=randOpenTile(L,[L.start,L.stages[0].pos]);const p=tilePos(tx,ty);
  const spire=shape(CONE,rnd(3,7),rnd(16,38),rnd(3,7),0x9fd8ee,0x1a4a66,.05,.3);
  spire.position.set(p.x+rnd(-16,16),19,p.y+rnd(-16,16));
  spire.rotation.z=rnd(-.16,.16);worldG.add(spire);}
 for(let i=0;i<24;i++){
  const [tx,ty]=randOpenTile(L);const p=tilePos(tx,ty);
  const patch=new THREE.Mesh(SPH,new THREE.MeshBasicMaterial({color:0xdff4ff,transparent:true,opacity:.15}));
  patch.scale.set(rnd(18,38),1.4,rnd(18,38));patch.position.set(p.x,1.4,p.y);worldG.add(patch);}
 // Rooms are lit by the single travelling roomLight instead of one light each.
}
function buildRelay(L,col){
 for(const r of L.rooms){
  const step=Math.max(1,Math.floor((r.w-2)/4));
  for(let i=0;i<5;i++){
   const p=tilePos(r.x+1+i*step,r.y+1);
   const rack=new THREE.Mesh(new THREE.CylinderGeometry(8,10,52,8),
    new THREE.MeshStandardMaterial({color:0x1c3b52,emissive:0x0a3550,
     emissiveIntensity:.9,metalness:.7,roughness:.35}));
   rack.position.set(p.x,26,p.y);worldG.add(rack);
   for(let k=0;k<3;k++){
    const strip=new THREE.Mesh(new THREE.TorusGeometry(9,1,4,8),
     new THREE.MeshBasicMaterial({color:k%2?0x63e6ff:0xffb04a,transparent:true,opacity:.75}));
    strip.rotation.x=-Math.PI/2;strip.position.set(p.x,12+k*14,p.y);worldG.add(strip);}}
 }
 for(let i=0;i<3;i++){
  const [tx,ty]=randOpenTile(L);const p=tilePos(tx,ty);
  const dish=new THREE.Group();dish.position.set(p.x,58,p.y);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(24,2,6,20),
   new THREE.MeshStandardMaterial({color:0x9fd8ff,emissive:0x1a6a88,
    emissiveIntensity:.8,metalness:.8,roughness:.3}));
  ring.rotation.x=.6;dish.add(ring);
  const feed=shape(CONE,3,14,3,0xdff4ff,0x2a7fa0);feed.position.y=16;dish.add(feed);
  worldG.add(dish);spinProps.push(dish);}
}
function buildDesert(L,col){
 for(let i=0;i<30;i++){
  const [tx,ty]=randOpenTile(L);const p=tilePos(tx,ty);
  const dune=new THREE.Mesh(SPH,new THREE.MeshStandardMaterial({color:0x8a5a32,roughness:1,metalness:0}));
  dune.scale.set(rnd(24,48),rnd(3,8),rnd(20,40));
  dune.position.set(p.x+rnd(-16,16),2,p.y+rnd(-16,16));worldG.add(dune);}
 for(let i=0;i<20;i++){
  const [tx,ty]=randOpenTile(L);const p=tilePos(tx,ty),hh=rnd(18,46);
  const cm=new THREE.MeshStandardMaterial({color:0xa97a4f,roughness:1,metalness:0});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(rnd(4,7),rnd(6,10),hh,7),cm);
  shaft.position.set(p.x,hh/2,p.y);shaft.rotation.z=rnd(-.2,.2);worldG.add(shaft);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(7,10,7),cm);
  cap.position.set(p.x,hh+4,p.y);worldG.add(cap);}
 // Rooms are lit by the single travelling roomLight instead of one light each.
}
function buildLevel3D(L){
 disposeGroup(worldG);
 const th=L.theme;
 const fogCol=th==='desert'?0x2a160c:th==='snow'?0x0a1a26:0x050d18;
 scene.background=new THREE.Color(fogCol);scene.fog.color.setHex(fogCol);
 scene.fog.density=th==='desert'?.0042:th==='snow'?.0032:.0022;
 hemi.color.setHex(th==='desert'?0xffc08a:th==='snow'?0xbfe4ff:0x8fd0ff);
 hemi.groundColor.setHex(th==='desert'?0x3a1c0c:th==='snow'?0x10202c:0x0a1420);
 hemi.intensity=th==='desert'?1.05:th==='snow'?.95:.8;
 sun.color.setHex(th==='desert'?0xffb070:th==='snow'?0xd8f0ff:0xa8d8ff);
 sun.intensity=th==='desert'?1.25:1;
 roomLight.color.setHex(th==='desert'?0xff9a4a:th==='snow'?0x8fe8ff:0x63e6ff);
 roomLight.intensity=th==='desert'?16:14;
 roomLight.distance=th==='desert'?280:260;
 miniDirty=true;
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(L.w*TILE,L.h*TILE),
  new THREE.MeshStandardMaterial({map:floorTexture(th),
   roughness:th==='relay'?.55:.95,metalness:th==='relay'?.35:.05}));
 floor.rotation.x=-Math.PI/2;floor.position.set(L.w*TILE/2,0,L.h*TILE/2);floor.receiveShadow=true;
 worldG.add(floor);
 const trimCol=th==='desert'?0xff9a4a:th==='snow'?0x8fe8ff:0x63e6ff;
 const wallCol=th==='desert'?0x8a5f3c:th==='snow'?0x4d7f9a:0x2c5068;
 const cells=[];for(let y=0;y<L.h;y++)for(let x=0;x<L.w;x++)
  if(grid[y][x]>=1&&grid[y][x]!==3)cells.push([x,y]);
 const wallGeo=th==='snow'?new THREE.IcosahedronGeometry(TILE*.66,0)
  :th==='desert'?new THREE.DodecahedronGeometry(TILE*.7,0)
  :new THREE.CylinderGeometry(TILE*.62,TILE*.62,52,8);
 const wallMat=new THREE.MeshStandardMaterial({color:wallCol,
  roughness:th==='relay'?.55:.9,metalness:th==='relay'?.4:.1,
  emissive:th==='desert'?0x2a1205:0x081c2a,emissiveIntensity:.55});
 const walls=new THREE.InstancedMesh(wallGeo,wallMat,cells.length);
 walls.castShadow=true;walls.receiveShadow=true;
 cells.forEach(([x,y],i)=>{DUMMY.position.set(x*TILE+TILE/2,26,y*TILE+TILE/2);DUMMY.rotation.set(0,0,0);
  DUMMY.scale.set(1,th==='relay'?1:1.3,1);DUMMY.updateMatrix();walls.setMatrixAt(i,DUMMY.matrix);});
 walls.instanceMatrix.needsUpdate=true;worldG.add(walls);
 const trimMat=new THREE.MeshBasicMaterial({color:trimCol,transparent:true,opacity:.55});
 for(const yy of [5,49]){
  const trims=new THREE.InstancedMesh(new THREE.TorusGeometry(TILE*.64,.55,4,8),trimMat,cells.length);
  cells.forEach(([x,y],i)=>{DUMMY.position.set(x*TILE+TILE/2,yy,y*TILE+TILE/2);
   DUMMY.rotation.set(-Math.PI/2,0,0);DUMMY.scale.set(1,1,1);
   DUMMY.updateMatrix();trims.setMatrixAt(i,DUMMY.matrix);});
  trims.instanceMatrix.needsUpdate=true;worldG.add(trims);
 }
 // Bulkhead doors seal each corridor until its objective is complete.
 for(const d of doors){
  const grp=new THREE.Group();grp.position.set(d.x*TILE+TILE/2,0,d.y*TILE+TILE/2);
  const frame=new THREE.Mesh(new THREE.TorusGeometry(TILE*.55,3,6,8),
   new THREE.MeshStandardMaterial({color:trimCol,emissive:0x1a6a88,emissiveIntensity:.9,metalness:.6}));
  frame.rotation.x=-Math.PI/2;frame.position.y=5;grp.add(frame);
  const axis=(tileAt(d.x-1,d.y)===0||tileAt(d.x+1,d.y)===0)?'z':'x';
  d.panels=[];
  for(const s of [-1,1]){
   const panel=new THREE.Mesh(new THREE.BoxGeometry(TILE*.44,42,5),
    new THREE.MeshStandardMaterial({color:th==='desert'?0x7a5236:0x2a4a5e,
     emissive:0x0a2a3a,emissiveIntensity:.6,metalness:.7,roughness:.4}));
   if(axis==='x')panel.rotation.y=Math.PI/2;
   panel.position.set(axis==='x'?s*TILE*.23:0,22,axis==='z'?s*TILE*.23:0);
   grp.add(panel);d.panels.push({mesh:panel,sign:s,axis});}
  d.group=grp;worldG.add(grp);
 }
 for(const c of cover){
  c.mesh=shape(DODEC,TILE*.48,24,TILE*.48,th==='desert'?0x6d4c33:th==='snow'?0x3f6c83:0x35536b,
   th==='desert'?0x2a1004:0x0a2234,.2,.75);
  c.mesh.position.set(c.x,23,c.y);worldG.add(c.mesh);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(TILE*.4,.6,5,10),
   new THREE.MeshBasicMaterial({color:trimCol,transparent:true,opacity:.5}));
  lip.rotation.x=-Math.PI/2;lip.position.set(c.x,45,c.y);worldG.add(lip);}
 for(const p of pickups){const col=p.type==='med'?0x6dff9a:p.type==='shield'?0x63e6ff:0xffce4a;
  p.mesh=new THREE.Mesh(SPH,new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.7}));
  p.mesh.scale.setScalar(11);p.mesh.position.set(p.x,20,p.y);worldG.add(p.mesh);
  const pool=new THREE.Mesh(SPH,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.12}));
  pool.scale.set(30,.4,30);pool.position.set(p.x,1.6,p.y);worldG.add(pool);}
 for(const b of barrels){
  const grp=new THREE.Group();grp.position.set(b.x,0,b.y);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(9,10,26,10),
   new THREE.MeshStandardMaterial({color:0x7a2f1c,emissive:0x431206,
    emissiveIntensity:.7,metalness:.45,roughness:.45}));
  body.position.y=13;body.castShadow=true;grp.add(body);
  const band=new THREE.Mesh(new THREE.TorusGeometry(9.5,1.2,6,14),
   new THREE.MeshBasicMaterial({color:0xff7a3a,transparent:true,opacity:.8}));
  band.rotation.x=-Math.PI/2;band.position.y=22;grp.add(band);
  const cap=new THREE.Mesh(SPH,new THREE.MeshBasicMaterial({color:0xffb04a}));
  cap.scale.set(4,2,4);cap.position.y=27;grp.add(cap);
  b.mesh=grp;worldG.add(grp);}
 if(th==='snow')buildSnow(L,trimCol);
 else if(th==='relay')buildRelay(L,trimCol);
 else buildDesert(L,trimCol);
 const count=th==='desert'?150:th==='snow'?110:70;
 for(let i=decor.length;i<count;i++)decor.push({x:rnd(0,L.w*TILE),y:rnd(0,L.h*TILE),s:rnd(2,6),a:rnd(.1,.35)});
 const dg=new THREE.BufferGeometry(),dp=new Float32Array(decor.length*3);
 decor.forEach((d,i)=>{d.v=rnd(.3,1.3);dp[i*3]=d.x;dp[i*3+1]=rnd(1,70);dp[i*3+2]=d.y;});
 dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
 worldG.add(new THREE.Points(dg,new THREE.PointsMaterial({
  color:th==='desert'?0xffb070:th==='snow'?0xe8f8ff:0x9fd8ff,
  size:th==='snow'?4:th==='desert'?3:2,transparent:true,opacity:.7})));
 decorGeo=dg;decorArr=dp;decorDrift=th==='snow'?-1:th==='desert'?1:.35;
 const op=objective.pos;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(38,1.4,8,40),
  new THREE.MeshBasicMaterial({color:trimCol,transparent:true,opacity:.38}));
 ring.rotation.x=-Math.PI/2;ring.position.set(op.x,3,op.y);worldG.add(ring);objRing=ring;
 const diamond=shape(OCT,9,9,9,trimCol,0x102a38);
 diamond.material.transparent=true;diamond.material.opacity=.55;
 diamond.position.set(op.x,38,op.y);worldG.add(diamond);objDiamond=diamond;
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(4,11,110,10),
  new THREE.MeshBasicMaterial({color:trimCol,transparent:true,opacity:.045,
   side:THREE.DoubleSide||2,depthWrite:false}));
 beam.position.set(op.x,55,op.y);worldG.add(beam);objBeam=beam;
 objLight=new THREE.PointLight(trimCol,13,150,1);objLight.position.set(op.x,46,op.y);
 worldG.add(objLight);
}
let objRing=null,objBeam=null,objDiamond=null,objLight=null,
 decorGeo=null,decorArr=null,decorDrift=1;
function spawnEnemyMesh(e){e.mesh=enemyModel(e);actorG.add(e.mesh);
 e.blob=blobShadow();actorG.add(e.blob);}
function spawnActors3D(){
 disposeGroup(actorG);clearAbilityFx();fxG.clear();fxG.add(pts);
 player.mesh=armoredPersonModel();player.mesh.scale.setScalar(1.12);
 player.baseScale=1.12;player.blob=blobShadow();
 actorG.add(player.mesh,player.blob);
 for(const e of enemies)spawnEnemyMesh(e);
 spawnObjectiveProps();
}
// Flat, white-hot tracer bolts read clearly against the dark floor instead of
// looking like little balls. One shared additive material, two tinted geometries.
const BULLET_MAT=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,
 opacity:.96,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide||2});
function tracerGeometry(hex){
 const c=new THREE.Color(hex),v=[],cols=[];
 const put=(x,z,r,g,b)=>{v.push(x,0,z);cols.push(Math.min(1,r),Math.min(1,g),Math.min(1,b));};
 const fade=p=>p[0]>4?1:p[0]<-7?.3:.72;
 const hull=[[8,0],[2.5,2.8],[-9,1.9],[-10,0],[-9,-1.9],[2.5,-2.8]];
 for(let i=0;i<hull.length;i++){
  const a=hull[i],b=hull[(i+1)%hull.length];
  put(0,0,1,.12,.1);
  put(a[0],a[1],c.r*fade(a),c.g*fade(a),c.b*fade(a));
  put(b[0],b[1],c.r*fade(b),c.g*fade(b),c.b*fade(b));
 }
 // Narrow bright-red core down the middle so the bolt never disappears into the floor.
 const core=[[6,0],[1,1.1],[-6,0],[1,-1.1]];
 for(let i=0;i<core.length;i++){
  const a=core[i],b=core[(i+1)%core.length];
  put(0,0,1,.12,.1);put(a[0],a[1],1,.12,.1);put(b[0],b[1],1,.12,.1);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(v),3));
 g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(cols),3));
 return g;
}
const TRACER_GEOS={0xff6a4a:tracerGeometry(0xff6a4a),0xff2f3a:tracerGeometry(0xff2f3a)};
const BARRIER_SHELL_MAT=new THREE.MeshBasicMaterial({color:0x7fffa0,transparent:true,
 opacity:.15,depthWrite:false,wireframe:true,blending:THREE.AdditiveBlending,
 side:THREE.DoubleSide||2});
const BARRIER_NODE_MAT=new THREE.MeshBasicMaterial({color:0xd8ffe8,transparent:true,
 opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide||2});
const SHARED_GEOS=new Set([SPH,CYL,CONE,OCT,DODEC,BLOB_GEO,ABILITY_RING_GEO,BOSS_SIGIL_GEO,
 TRACER_GEOS[0xff6a4a],TRACER_GEOS[0xff2f3a]]);
const SHARED_MATS=new Set([BLOB_MAT,BULLET_MAT,BARRIER_SHELL_MAT,BARRIER_NODE_MAT]);
// Free GPU buffers when a level restarts; leaks here showed up as GC stutters.
function disposeGroup(g){
 const seenG=new Set(),seenM=new Set();
 g.traverse(o=>{
  if(o.geometry&&!SHARED_GEOS.has(o.geometry)&&!seenG.has(o.geometry)){
   if(o.geometry.dispose)o.geometry.dispose();seenG.add(o.geometry);}
  const mats=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
  for(const m of mats)if(m&&!SHARED_MATS.has(m)&&!seenM.has(m)){
   if(m.map&&m.map.dispose)m.map.dispose();
   if(m.dispose)m.dispose();seenM.add(m);}
 });
 g.clear();
}
const MAXP=500,pg=new THREE.BufferGeometry(),pp=new Float32Array(MAXP*3),pc=new Float32Array(MAXP*3);
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('color',new THREE.BufferAttribute(pc,3));
const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:5,vertexColors:true,transparent:true,opacity:.9,sizeAttenuation:false}));
fxG.add(pts);
const PART_COL=new THREE.Color();
function addPart(p){
 if(parts.length>=MAXP)parts.splice(0,parts.length-MAXP+1);
 parts.push(p);
}

/* ---------------- LEVEL FLOW ---------------- */
function initLevel(idx){
 if(player){cloakVisual(false);clearBarrierFx();}
 camera.fov=56;camera.updateProjectionMatrix();
 levelIdx=idx;const L=LEVELS[idx];grid=buildGrid(L);
 const sp=tilePos(L.start[0],L.start[1]),bonusSh=Math.min(20,campaign.paragon*5);
 player={x:sp.x,y:sp.y,r:15,hp:150,maxhp:150,sh:60+bonusSh,maxsh:60+bonusSh,ang:-Math.PI/4,
  weapon:'rifle',wammo:{rifle:24,shotgun:8},reserve:{rifle:480,shotgun:48},ammo:24,maxammo:24,
  reload:0,fire:0,dash:null,dashCd:0,biot:0,melee:0,meleeCd:0,
  cloak:0,cloakCd:0,barrier:0,barrierCd:0,barrierFx:null,
  hitT:0,critT:0,beatCd:0,hurtSnd:0,dead:false,kills:0,
  vx:0,vy:0,walk:0,recoil:0,deathT:0};
 clearAbilityFx();bossCard=null;
 enemies=[];bullets=[];parts=[];pickups=[];cover=[];decor=[];fields=[];abilityFx=[];
 barrels=[];blastLights=[];blastQueue=[];spinProps=[];
 doors=L.doors.map(([x,y],i)=>({x,y,i,unlocked:false,openT:0}));
 for(const [tx,ty] of L.cover)cover.push({...tilePos(tx,ty),hp:60,maxhp:60});
 for(const [tx,ty] of (L.barrels||[]))barrels.push({...tilePos(tx,ty),r:15,dead:false});
 for(const [type,tx,ty] of L.initial)
  enemies.push(safePlaceEnemy(makeEnemy(type,tx*TILE+TILE/2,ty*TILE+TILE/2)));
 if(idx===4&&campaign.flags.jugMissionDone){
  const ap=tilePos(23,12);
  const ally=safePlaceEnemy(makeEnemy('juggernaut',ap.x,ap.y));
  ally.ally=true;ally.duelResolved=true;ally.stun=0;
  ally.hp=ally.maxhp*.68;ally.dmg=18;ally.range=300;ally.abilityCd=1e6;
  enemies.push(ally);
 }
 for(const [type,tx,ty] of (L.pickup||[]))pickups.push({type,x:tx*TILE+TILE/2,y:ty*TILE+TILE/2,t:0});
 for(let i=0;i<40;i++)decor.push({x:rnd(0,L.w*TILE),y:rnd(0,L.h*TILE),s:rnd(2,6),a:rnd(.1,.35)});
 objective={done:false,progress:0,stage:0,t:0,alarmed:false,
  type:'enable',pos:tilePos(L.stages[0].pos[0],L.stages[0].pos[1]),
  device:null,nodes:[],source:null,socket:null,sourceMesh:null,propG:null,wave:0,carried:false};
 setupStageState(L.stages[0]);
 relayTimer=0;startDelay=1.2;msg='';msgT=0;
 const op=currentObjectivePoint();
 aimDir=Math.atan2(op.y-player.y,op.x-player.x);
 aimPoint.x=op.x;aimPoint.y=op.y;
 camFocus.x=player.x;camFocus.y=player.y;
 camera.position.set(player.x,165,player.y+112);camera.lookAt(player.x,12,player.y-6);
 sun.position.set(player.x-130,260,player.y+90);
 sun.target.position.set(player.x,0,player.y);sun.target.updateMatrixWorld();
 buildLevel3D(L);spawnActors3D();
 dialogue={lines:STORY.intro(idx),i:0,who:'',text:'',after:null};setDialogueLine();
 state='DIALOGUE';
}
function initPvpArena(){
 if(player){cloakVisual(false);clearBarrierFx();}
 camera.fov=68;camera.updateProjectionMatrix();
 const L=PVP_LEVEL; grid=buildGrid(L);
 const sp=tilePos(L.start[0],L.start[1]);
 player={x:sp.x,y:sp.y,r:15,hp:150,maxhp:150,sh:80,maxsh:80,ang:-Math.PI/4,
  weapon:'rifle',wammo:{rifle:24,shotgun:8},reserve:{rifle:480,shotgun:48},ammo:24,maxammo:24,
  reload:0,fire:0,dash:null,dashCd:0,biot:0,melee:0,meleeCd:0,
  cloak:0,cloakCd:0,barrier:0,barrierCd:0,barrierFx:null,
  hitT:0,critT:0,beatCd:0,hurtSnd:0,dead:false,kills:0,
  vx:0,vy:0,walk:0,recoil:0,deathT:0};
 clearAbilityFx();bossCard=null;
 enemies=[];bullets=[];parts=[];pickups=[];cover=[];decor=[];fields=[];abilityFx=[];
 barrels=[];blastLights=[];blastQueue=[];spinProps=[];doors=[];
 for(const [tx,ty] of L.cover)cover.push({...tilePos(tx,ty),hp:60,maxhp:60});
 for(const [tx,ty] of (L.barrels||[]))barrels.push({...tilePos(tx,ty),r:15,dead:false});
 for(const [type,tx,ty] of (L.pickup||[]))pickups.push({type,x:tx*TILE+TILE/2,y:ty*TILE+TILE/2,t:0});
 for(let i=0;i<40;i++)decor.push({x:rnd(0,L.w*TILE),y:rnd(0,L.h*TILE),s:rnd(2,6),a:rnd(.1,.35)});
 objective={done:false,progress:0,stage:0,t:0,alarmed:false,type:'pvp',
  pos:tilePos(L.start2[0],L.start2[1]),device:null,nodes:[],source:null,socket:null,sourceMesh:null,propG:null,wave:0,carried:false};
 relayTimer=0;startDelay=1.2;msg='PVP SURVIVAL';msgT=1.5;
 aimDir=Math.atan2(objective.pos.y-player.y,objective.pos.x-player.x);
 aimPoint.x=objective.pos.x;aimPoint.y=objective.pos.y;
 camFocus.x=player.x;camFocus.y=player.y;
 camera.position.set(player.x,165,player.y+112);camera.lookAt(player.x,12,player.y-6);
 sun.position.set(player.x-130,260,player.y+90);
 sun.target.position.set(player.x,0,player.y);sun.target.updateMatrixWorld();
 buildLevel3D(L);spawnActors3D();
 state='PLAY';
}
function cutsceneLineMin(d){
 if(!d||!d.cutscene)return 0;
 const mode=d.cinematicMode||d.cutsceneKind;
 if(mode==='entrance'){
  if(d.i===2)return 1.15;   // hammer drop
  if(d.i===3)return 1.9;    // crowd sweep + Randall throw
 } else if(mode==='exit'&&d.i===7)return 1.6; // leap toward the east ruin
 return .85;
}
function setDialogueLine(){
 const d=dialogue,ln=d.lines[d.i];
 d.who=ln[0];d.text=ln[1];d.options=ln[2]||null;d.awaiting=!!d.options;
 if(d.cutscene)cutLineT=0;
 d.ready=!d.cutscene||cutLineT>=cutsceneLineMin(d);
}
function choiceRects(n=2){
 const w=Math.min(430,W-36),x=(W-w)/2,y=H-286,gap=6,h=38;
 return Array.from({length:n},(_,i)=>({x,y:y+i*(h+gap),w,h}));
}
function applyChoice(i){
 const d=dialogue,opt=d&&d.options&&d.options[i];if(!opt)return;
 const tone=opt.tone==='renegade'?'renegade':'paragon';
 campaign[tone]++;campaign.choices.push(opt.label);
 if(opt.flag)campaign.flags[opt.flag]=true;
 if(opt.reply)d.lines.splice(d.i+1,0,...opt.reply);
 d.options=null;d.awaiting=false;
 AudioSys.tone(tone==='paragon'?680:180,.16,'triangle',.07,tone==='paragon'?220:-80);
 msg=tone.toUpperCase()+' +1';msgT=1.5;
 d.i++;
 if(d.i>=d.lines.length){
  finishCutscene();
  if(d.after){const after=d.after;d.after=null;state=after;startDelay=.8;}
  else{state='PLAY';startDelay=1.2;}
 } else setDialogueLine();
}
function storyBeat(lines,after){
 if(!lines||!lines.length)return;
 dialogue={lines,i:0,who:'',text:'',after:after||null};setDialogueLine();state='DIALOGUE';
}
function startCutscene(kind,lines,after,mode){
 storyBeat(lines,after||'PLAY');
 if(dialogue){
  dialogue.cutscene=true;dialogue.cutsceneKind=kind;
  dialogue.cinematicMode=mode||kind;
  cutT=0;cutLineT=0;
  dialogue.ready=!dialogue.cutscene||cutLineT>=cutsceneLineMin(dialogue);
 }
}
function clearCinematicCrowd(){
 enemies=enemies.filter(e=>!e.cinematicCrowd);
 for(const e of cinematicCrowd){if(e.mesh)actorG.remove(e.mesh);if(e.blob)actorG.remove(e.blob);}
 cinematicCrowd.length=0;
}
function removeActorQuietly(e){
 if(!e)return;
 enemies=enemies.filter(x=>x!==e);
 if(e.mesh){actorG.remove(e.mesh);e.mesh=null;}
 if(e.blob){actorG.remove(e.blob);e.blob=null;}
}
function finishCutscene(){
 if(dialogue&&dialogue.cutsceneKind==='mid'){
  clearCinematicCrowd();
  if(cinematicCorner&&player){player.x=cinematicCorner.x;player.y=cinematicCorner.y;}
  if(cinematicMode==='exit'&&cinematicJug)removeActorQuietly(cinematicJug);
  camera.fov=56;camera.updateProjectionMatrix();
 }
 cinematicJug=null;cinematicThrowFrom=null;cinematicCorner=null;
 cinematicLanded=false;cinematicThrown=false;cinematicMode='';
 cinematicExitFrom=null;cinematicExitTo=null;cinematicExited=false;cinematicCamDist=243;
}
function startJuggernautEntrance(){
 const px=player?player.x:objective.pos.x,py=player?player.y:objective.pos.y;
 cinematicThrowFrom={x:px,y:py};
 cinematicCorner=tilePos(23,14);
 cinematicLanded=false;cinematicThrown=false;cinematicMode='entrance';
 cinematicExitFrom=null;cinematicExitTo=null;cinematicExited=false;cinematicCamDist=243;
 if(player){player.hp=Math.max(18,Math.min(player.hp,32));player.sh=0;player.melee=0;player.meleeCd=0;}
 const spots=[[-78,-42],[72,-48],[-84,52],[78,46],[0,96]],
  types=['trooper','elite','phantom','trooper','elite'];
 cinematicCrowd=[];
 for(let i=0;i<spots.length;i++){
  const e=safePlaceEnemy(makeEnemy(types[i],px+spots[i][0],py+spots[i][1]));
  e.cinematicCrowd=true;e.hp=Math.min(e.hp,90);e.maxhp=e.hp;e.stun=2;
  enemies.push(e);spawnEnemyMesh(e);cinematicCrowd.push(e);
 }
 cinematicJug=enemies.find(e=>e.type==='juggernaut'&&!e.dead)||null;
 if(!cinematicJug){
  cinematicJug=safePlaceEnemy(makeEnemy('juggernaut',objective.pos.x,objective.pos.y));
  cinematicJug.cinematicEntrance=true;
  enemies.push(cinematicJug);spawnEnemyMesh(cinematicJug);
 }
 objective.alarmed=true;
 cueMusic('boss');
 camera.fov=66;camera.updateProjectionMatrix();
 startCutscene('mid',STORY.juggernautBeat(),'PLAY','entrance');
 showBossCard(cinematicJug,'mini');
}
function directorBoss(){
 return enemies.find(e=>e.type==='boss'&&!e.dead&&e.dirPhase>=0)||null;
}
function spawnDirectorSubordinate(boss,type,ox,oy){
 const e=safePlaceEnemy(makeEnemy(type,boss.x+ox,boss.y+oy));
 e.dirSubordinate=true;e.hp=Math.min(e.hp,260);e.maxhp=e.hp;
 enemies.push(e);spawnEnemyMesh(e);return e;
}
function startDirectorPhases(e){
 if(!e||e.type!=='boss'||e.dirPhase!==0||e.dirStarted)return false;
 e.dirStarted=true;e.hp=e.maxhp;e.fire=1.4;e.abilityCd=2.2;
 spawnDirectorSubordinate(e,'elite',-90,40);
 spawnDirectorSubordinate(e,'phantom',85,45);
 spawnDirectorSubordinate(e,'technician',0,95);
 msg=loc('DIRECTOR — PHASE I: SUBORDINATES');msgT=2.4;
 showBossCard(e,'boss');return true;
}
function advanceDirectorPhase(e,next){
 if(!e||e.dead||e.dirPhase>=next)return false;
 e.dirPhase=next;
 if(next===1){
  e.hp=e.maxhp;e.charge=0;e.fire=99;e.abilityCd=99;
  if(e.mesh)e.mesh.visible=false;if(e.blob)e.blob.visible=false;
  const mech=enemies.find(m=>m.type==='directorMech'&&!m.dead);
  if(!mech){
   const m=safePlaceEnemy(makeEnemy('directorMech',e.x+60,e.y+20));
   m.dirMount=e;enemies.push(m);spawnEnemyMesh(m);
  }
  msg=loc('DIRECTOR — PHASE II: SIEGE WALKER');msgT=2.6;
  if(e.mesh)actorG.remove(e.mesh);if(e.blob)actorG.remove(e.blob);
  e.mesh=null;e.blob=null;e.baseScale=0;
  startCutscene('mid',STORY.directorMechBeat(),'PLAY');
 } else if(next===2){
  e.hp=Math.min(e.hp,e.maxhp*(campaign.flags.saveInali?.62:.72));
  e.dirArmor=true;e.summoned=false;
  e.spd*=1.16;e.dmg+=4;e.ft*=.84;e.fire=1.1;e.abilityCd=1.6;
  if(e.mesh)actorG.remove(e.mesh);if(e.blob)actorG.remove(e.blob);
  e.mesh=null;e.blob=null;e.baseScale=0;spawnEnemyMesh(e);
  msg=loc('DIRECTOR — PHASE III: ADVANCED ARMOR');msgT=2.6;
  startCutscene('mid',STORY.directorArmorBeat(),'PLAY');
 }
 showBossCard(e,'boss');return true;
}
function directorPhaseCheck(){
 if(state!=='PLAY')return;
 const e=directorBoss();if(!e)return;
 if(e.dirPhase===0){
  if(!enemies.some(x=>x!==e&&!x.dead&&x.dirSubordinate))advanceDirectorPhase(e,1);
 } else if(e.dirPhase===1){
  if(!enemies.some(x=>x.type==='directorMech'&&!x.dead))advanceDirectorPhase(e,2);
 }
}
function jugAllyAI(e,dt,d){
 e.stun=0;
 let target=null,best=Infinity;
 for(const t of enemies){
  if(t===e||t.dead||t.ally||t.duelResolved||t.cinematicCrowd)continue;
  const dd=dist(e,t);if(dd<best){best=dd;target=t;}
 }
 if(target&&best<460){
  const ta=ang(e,target),reach=e.r+target.r+64;e.ang=ta;
  if(best>reach*.72)steer(e,Math.cos(ta),Math.sin(ta),e.spd*.95,dt);
  else steer(e,Math.cos(ta+Math.PI/2),Math.sin(ta+Math.PI/2),e.spd*.4,dt);
  if(best<reach&&e.fire<=0){
   damageEnemy(target,e.dmg*1.7,'blast');target.stun=Math.max(target.stun,.35);
   burst(target.x,target.y,24,0x9fd8ff,1.6);
   addBlastLight(target.x,target.y,0x9fd8ff,120,240,.25);
   AudioSys.hit();shake=Math.max(shake,5);e.fire=.8;e.hitT=.18;
  }
 } else steer(e,Math.cos(e.ang+2.2),Math.sin(e.ang+2.2),e.spd*.35,dt);
 e.hassleCd=(Number.isFinite(e.hassleCd)?e.hassleCd:rnd(5,8))-dt;
 if(e.hassleCd<=0&&dist(e,player)<170&&!player.dead){
  e.hassleCd=rnd(6,10);const ha=rnd(0,TAU);
  moveEntity(player,Math.cos(ha)*58,Math.sin(ha)*58);
  player.fire=Math.max(player.fire,.32);player.hitT=Math.max(player.hitT,.12);
  msg=loc('JUGGERNAUT — MOVE');msgT=1.3;
  AudioSys.tone(180,.12,'sawtooth',.05,-30);
 }
}
function damageEnemy(e,dmg,source){
 if(!e||e.dead||!Number.isFinite(dmg)||dmg<=0)return 0;
 if(e.type==='boss'&&e.dirPhase>=0&&e.dirPhase<2){
  e.hitT=Math.max(e.hitT,.08);return 0;
 }
 if(e.type==='boss'&&e.dirArmor){
  let scaled=dmg;
  if(source==='bullet')scaled*=.45;
  else if(source==='melee')scaled*=1.15;
  else if(source==='dash')scaled*=1.05;
  else scaled*=.8;
  e.hp-=scaled;e.hitT=Math.max(e.hitT,.12);
  if(e.hp<=0)dieEnemy(e);
  return scaled;
 }
 if(e.type==='juggernaut'){
  if(e.duelResolved)return 0;
  const recover=e.hammerRecover>0;
  let scaled=dmg;
  if(source==='melee')scaled*=recover?2.2:.75;
  else if(source==='dash')scaled*=recover?1.6:.8;
  else if(source==='bullet')scaled*=.2;
  else scaled*=.35;
  const floor=e.maxhp*.14;
  e.hp=Math.max(floor,e.hp-scaled);
  e.hitT=Math.max(e.hitT,.12);
  if(source==='melee'&&recover&&!e.counterCounted){
   e.counterCounted=true;registerDuelRead(e,'counter');}
  return scaled;
 }
 e.hp-=dmg;e.hitT=Math.max(e.hitT,.12);
 if(e.hp<=0)dieEnemy(e);
 return dmg;
}
function juggernautHit(d){
 const before=player.hp+player.sh;
 hurtPlayer(d);
 if(player.hp<1){player.hp=1;player.sh=0;}
 player.hitT=Math.max(player.hitT,.35);
 return Math.max(0,before-(player.hp+player.sh));
}
function registerDuelRead(e,reason){
 if(!e||e.type!=='juggernaut'||e.duelResolved)return;
 e.duelReads=(e.duelReads||0)+1;
 e.duelTimer=0;e.lastDuelRead=reason||'';
 msg=(lang==='fa'?'خوانش جاگرناوت — ':'JUGGERNAUT READ — ')+e.duelReads+'/3';
 msgT=1.6;
 if(e.duelReads>=3)resolveJuggernautDuel(e);
}
// The exit leap must never cross or finish inside a bulkhead. Keep the
// original east/up intent, but stop short of the first wall and fall back to a
// shorter clear arc when the ruin side is sealed.
function findCinematicExit(e){
 if(!e)return null;
 const from={x:e.x,y:e.y},r=(e.r||24)+8;
 const aim={x:from.x+260,y:from.y-110},a0=Math.atan2(aim.y-from.y,aim.x-from.x);
 const clipped=clipDashToWalls(from,aim,r);
 const reach=Math.hypot(clipped.x-from.x,clipped.y-from.y);
 if(reach>90){
  const back=Math.min(reach-40,Math.max(r+18,reach*.12)),d=reach-back;
  const to={x:from.x+(clipped.x-from.x)/reach*d,y:from.y+(clipped.y-from.y)/reach*d};
  if(!solidCircle(to.x,to.y,r)&&clearDashLine(from.x,from.y,to.x,to.y,r))return to;
 }
 for(const dist of [210,170,130,95]){
  for(const da of [0,.12,-.12,.25,-.25,.4,-.4,.6,-.6,.85,-.85,1.1,-1.1]){
   const a=a0+da,to={x:from.x+Math.cos(a)*dist,y:from.y+Math.sin(a)*dist};
   if(!solidCircle(to.x,to.y,r)&&clearDashLine(from.x,from.y,to.x,to.y,r))return to;
  }
 }
 return null;
}
function resolveJuggernautDuel(e){
 if(!e||e.type!=='juggernaut'||e.duelResolved)return;
 e.duelResolved=true;e.ally=true;e.stun=0;e.hp=Math.max(e.hp,e.maxhp*.55);
 e.hammerWindup=0;e.hammerRecover=0;e.hurricane=0;
 e.ability='';e.abilityCd=1e6;e.vx=0;e.vy=0;e.dmg=18;e.range=300;
 player.hp=Math.max(player.hp,Math.min(player.maxhp||100,player.hp+14));
 player.sh=Math.max(player.sh,10);player.hitT=0;
 const L=LEVELS[levelIdx],st=L&&L.stages[objective.stage];
 if(st&&st.type==='boss'&&!objective.done)completeStage(st);
 else objective.done=true;
 msg=loc('DUEL ENDED — RANDALL LEARNED THE READ');msgT=3;
 AudioSys.biotic();burst(e.x,e.y,34,0xe6faff,2.2);
 addBlastLight(e.x,e.y,0x9fd8ff,140,300,.4);
 cinematicJug=e;cinematicMode='exit';cinematicThrowFrom=null;cinematicCorner=null;
 cinematicExitFrom={x:e.x,y:e.y};
 cinematicExitTo=findCinematicExit(e);
 cinematicExited=false;cinematicCamDist=243;
 camera.fov=54;camera.updateProjectionMatrix();
 startCutscene('mid',STORY.juggernautLesson(),'PLAY','exit');
}
function dieEnemy(e){
 if(!e||e.dead)return;
 if(e.type==='boss'&&e.dirPhase>=0&&e.dirPhase<2){e.hp=Math.max(1,e.hp);return;}
 e.dead=true;e.deathT=0;player.kills++;AudioSys.hit();
 e.hitT=0;
 for(let i=0;i<14;i++)addPart({x:e.x,y:e.y,vx:rnd(-140,140),vy:rnd(-140,140),life:rnd(.3,.7),c:e.col,s:rnd(2,5)});
 if(e.type==='boss'||e.miniBoss){AudioSys.boss();
  const bossMsg=e.type==='boss'?'THE DIRECTOR IS DOWN':(e.name+' DOWN');
  const L=LEVELS[levelIdx],st=L&&L.stages[objective.stage];
  const next=st&&st.type==='boss'&&L.stages[objective.stage+1];
  if(next&&!objective.done){
   completeStage(st);
   msg=bossMsg;msgT=3;
  }else{
   msg=bossMsg;msgT=3;
   objective.done=true;objective.progress=1;
  }}}
function fxMat(color,opacity=1,wire=false){
 const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity,
  depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide||2});
 if(wire)m.wireframe=true;return m;
}
function clearAbilityFx(){
 for(const f of abilityFx)for(const o of f.items){
  fxG.remove(o.mesh);if(o.mesh.material.dispose)o.mesh.material.dispose();}
 abilityFx.length=0;
}
// Each enemy power gets its own short-lived additive-geometry signature instead
// of sharing one generic burst. Geometries are shared; only materials are owned.
function spawnAbilityFx(kind,x,y,color,a=0,ox=x,oy=y){
 if(abilityFx.length>=8){
  const old=abilityFx.shift();
  for(const o of old.items){fxG.remove(o.mesh);if(o.mesh.material.dispose)o.mesh.material.dispose();}
 }
 const it=[];
 const add=(m,update)=>{fxG.add(m);it.push({mesh:m,update});};
 const ring=(r,dx=0,dy=0,h=32,spin=0)=>{
  const m=new THREE.Mesh(ABILITY_RING_GEO,fxMat(color,.9));
  m.rotation.x=-Math.PI/2;m.rotation.z=rnd(0,TAU);
  m.position.set(x+dx,h,y+dy);m.scale.setScalar(r);
  add(m,(t,k)=>{m.scale.setScalar(r*(1+2.2*t));m.material.opacity=.9*k;m.rotation.z+=spin;});
 };
 const shards=(n,spread,size,h=26)=>{
  for(let i=0;i<n;i++){
   const ang=rnd(0,TAU),sp=rnd(spread*.45,spread),lift=rnd(4,16);
   const m=new THREE.Mesh(OCT,fxMat(color,.95));m.position.set(x,h,y);m.scale.setScalar(size);
   add(m,(t,k)=>{m.position.set(x+Math.cos(ang)*sp*t,h+Math.sin(t*Math.PI)*lift,y+Math.sin(ang)*sp*t);
    m.scale.setScalar(size*(1-k*.55));m.rotation.x+=.09;m.rotation.y+=.13;m.material.opacity=.95*k;});
  }
 };
 const beam=(len,width,h=26)=>{
  const m=new THREE.Mesh(CYL,fxMat(color,.85));
  m.quaternion.setFromUnitVectors(UP,VEC.set(Math.cos(a),0,Math.sin(a)).normalize());
  m.position.set(x+Math.cos(a)*len/2,h,y+Math.sin(a)*len/2);m.scale.set(width,len,width);
  add(m,(t,k)=>{m.scale.set(width*(1-k*.8),len,width*(1-k*.8));m.material.opacity=.85*k;});
 };
 const core=(r)=>{
  const m=new THREE.Mesh(SPH,fxMat(color,.9));m.position.set(x,26,y);m.scale.setScalar(r);
  add(m,(t,k)=>{m.scale.setScalar(r*(1+t*1.6));m.material.opacity=.9*k;});
 };
 if(kind==='SHOCK SLAM'){
  ring(10,0,0,4,.07);ring(14,0,0,8,-.05);shards(10,150,4,18);
 }else if(kind==='BLINK STRIKE'){
  ring(8,0,0,25,.2);ring(8,ox-x,oy-y,25,-.2);
  const ghost=new THREE.Mesh(OCT,fxMat(color,.8));
  ghost.position.set(ox,26,oy);ghost.scale.setScalar(8);
  add(ghost,(t,k)=>{ghost.scale.setScalar(8*(1+t));ghost.material.opacity=.8*k;ghost.rotation.y+=.15;});
  shards(8,80,3,26);
 }else if(kind==='OVERCHARGE'){
  ring(16,0,0,22,.24);ring(10,0,0,22,-.3);core(6);shards(5,55,3.2,24);
 }else if(kind==='NULL PULSE'){
  const shell=new THREE.Mesh(SPH,fxMat(color,.32,true));
  shell.position.set(x,28,y);shell.scale.setScalar(18);
  add(shell,(t,k)=>{shell.scale.setScalar(18+150*t);shell.material.opacity=.32*k;shell.rotation.y+=.03;});
  ring(12,0,0,8,.05);shards(14,140,3.5,24);
 }else if(kind==='RAIL LANCE'){
  beam(300,2.6);ring(9,0,0,26,.12);shards(6,60,2.5,26);
 }else if(kind==='SIEGE SLAM'){
  ring(14,0,0,4,.06);ring(20,0,0,9,-.045);ring(26,0,0,14,.03);shards(16,190,5,20);
 }else if(kind==='BIG BIOTIC HAMMER'){
  const cone=new THREE.Mesh(CONE,fxMat(color,.55));
  cone.position.set(x,62,y);cone.scale.set(16,34,16);
  add(cone,(t,k)=>{cone.scale.set(16*(1+t*.7),34*(1+t*.5),16*(1+t*.7));
   cone.material.opacity=.55*k;cone.rotation.y+=.08;});
  ring(18,0,0,5,.1);shards(12,110,4,22);
 }else if(kind==='BIOTIC HURRICANE'){
  ring(14,0,0,22,.32);ring(18,0,0,30,-.38);shards(14,95,3.6,26);
 }else if(kind==='MIND LASH'){
  beam(320,3.2,30);ring(11,0,0,30,.15);shards(10,100,3.2,30);
 }else{
  ring(12,0,0,24,.12);shards(8,80,3,24);
 }
 const life=(kind==='BIOTIC HURRICANE'||kind==='NULL PULSE')?.6:.42;
 abilityFx.push({items:it,t:0,life});
}
function updateAbilityFx(dt){
 for(let i=abilityFx.length-1;i>=0;i--){
  const f=abilityFx[i];f.t+=dt;
  const k=clamp(1-f.t/f.life,0,1);
  if(k<=0){
   for(const o of f.items){fxG.remove(o.mesh);if(o.mesh.material.dispose)o.mesh.material.dispose();}
   abilityFx.splice(i,1);continue;
  }
  for(const o of f.items)o.update(f.t,k);
 }
}
function addBlastLight(x,y,color=0xff8a3a,intensity=130,range=300,life=.28){
 // More than two transient lights destroys WebGL forward-renderer frame time.
 if(blastLights.length>=2){const old=blastLights.shift();fxG.remove(old.light);}
 const l=new THREE.PointLight(color,intensity,range,1);
 l.position.set(x,42,y);l.userData.base=intensity;fxG.add(l);
 blastLights.push({light:l,t:life,max:life});
}
function explodeBarrel(b){
 if(b.dead)return;b.dead=true;
 if(b.mesh)worldG.remove(b.mesh);
 burst(b.x,b.y,32,0xff9a4a,2.1);
 for(let i=0;i<12;i++)addPart({x:b.x,y:b.y,vx:rnd(-70,70),vy:rnd(-70,70),
  life:rnd(.5,1.1),c:0x5a5048,s:rnd(5,11)});
 addBlastLight(b.x,b.y);
 shake=Math.max(shake,13);flash=Math.max(flash,.3);
 AudioSys.noise(.55,.11);AudioSys.tone(70,.5,'sawtooth',.09,-45);
 for(const e of enemies){if(e.dead)continue;const d=dist(e,b);
  if(d<175){damageEnemy(e,115*(1-d/175),'blast');e.stun=Math.max(e.stun,.5);}}
 const pd=dist(player,b);
 if(pd<155)hurtPlayer(8+26*(1-pd/155));
 for(const o of barrels)if(o!==b&&!o.dead&&dist(o,b)<190)
  blastQueue.push({br:o,t:rnd(.06,.16)});
}
function raiseAlarm(st){
 const list=st.ambush||[];if(!list.length)return;
 let bossSpawned=null;
 for(const s of list){const e=safePlaceEnemy(makeEnemy(s[0],s[1]*TILE+TILE/2,s[2]*TILE+TILE/2));
  enemies.push(e);spawnEnemyMesh(e);
  if(e.type==='boss'||e.miniBoss)bossSpawned=e;}
 if(bossSpawned)showBossCard(bossSpawned,bossSpawned.type==='boss'?'boss':'mini');
 msg='ALARM — RESPONSE TEAM INBOUND';msgT=2.2;
 shake=Math.max(shake,10);flash=Math.max(flash,.16);
 AudioSys.tone(880,.14,'square',.055);AudioSys.noise(.3,.04);
}
function unlockDoor(i){
 const d=doors[i];if(!d||d.unlocked)return;
 d.unlocked=true;grid[d.y][d.x]=0;miniDirty=true;
 const p=tilePos(d.x,d.y);
 burst(p.x,p.y,22,0x8fe8ff,1.4);
 addBlastLight(p.x,p.y,0x63e6ff,90,220,.3);
 shake=Math.max(shake,9);
 AudioSys.tone(140,.5,'sawtooth',.07,-60);AudioSys.noise(.35,.05);
 msg='BULKHEAD RELEASED';msgT=1.8;
}
function moveObjectiveMarker(x,y){
 if(objRing)objRing.position.set(x,3,y);
 if(objDiamond)objDiamond.position.set(x,42,y);
 if(objBeam)objBeam.position.set(x,65,y);
 if(objLight)objLight.position.set(x,52,y);
}
function currentObjectivePoint(){
 const st=LEVELS[levelIdx]&&LEVELS[levelIdx].stages[objective.stage];
 if(st&&st.type==='enable'){
  const next=(objective.nodes||[]).find(n=>!n.lit);
  if(next)return next;
 }
 if(st&&st.type==='implant'&&objective.source&&!objective.carried)return objective.source;
 if(levelIdx===4&&st&&st.type==='boss'){
  const mech=enemies.find(e=>e.type==='directorMech'&&!e.dead);
  if(mech)return mech;
 }
 return objective.pos;
}
function syncObjectiveMarker(){const p=currentObjectivePoint();moveObjectiveMarker(p.x,p.y);}
function setupStageState(st){
 objective.type=st?st.type:'enable';
 objective.t=0;objective.progress=0;objective.carried=false;objective.wave=0;
 objective.device=null;objective.nodes=[];objective.source=null;
 objective.socket=null;objective.sourceMesh=null;objective.propG=null;
 if(objective.type==='destroy'||objective.type==='defend'){
  const hp=st.hp||160;
  objective.device={x:objective.pos.x,y:objective.pos.y,hp:hp,maxhp:hp};
 }
 if(objective.type==='enable'){
  const pts=st.nodes&&st.nodes.length?st.nodes:[st.pos];
  objective.nodes=pts.map(p=>{const w=tilePos(p[0],p[1]);return {x:w.x,y:w.y,lit:false};});
 }
 if(objective.type==='implant'&&st.source){
  const w=tilePos(st.source[0],st.source[1]);objective.source={x:w.x,y:w.y};
 }
}
function spawnWave(list){
 for(const s of (list||[])){
  const e=safePlaceEnemy(makeEnemy(s[0],s[1]*TILE+TILE/2,s[2]*TILE+TILE/2));
  enemies.push(e);spawnEnemyMesh(e);
 }
 if(list&&list.length){
  msg='DEFENSE WAVE INBOUND';msgT=1.8;
  AudioSys.tone(540,.18,'square',.05);
 }
}
function spawnObjectiveProps(){
 if(objective.propG)worldG.remove(objective.propG);
 objective.propG=null;objective.sourceMesh=null;objective.socket=null;
 const st=LEVELS[levelIdx]&&LEVELS[levelIdx].stages[objective.stage];
 if(!st||objective.done)return;
 const grp=new THREE.Group();worldG.add(grp);objective.propG=grp;
 const glow=0x8fe8ff,warn=0xff9a4a;
 if(st.type==='enable'){
  for(const n of objective.nodes){
   const node=new THREE.Group();node.position.set(n.x,0,n.y);
   const base=shape(CYL,10,6,10,0x1a3040);base.position.y=3;node.add(base);
   const orb=ball(0,14,0,6,6,6,glow,glow);node.add(orb);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(9,.8,6,16),mat(glow,glow));
   ring.rotation.x=-Math.PI/2;ring.position.y=14;node.add(ring);
   n.mesh=node;n.orb=orb;n.ring=ring;grp.add(node);
  }
 } else if(st.type==='destroy'){
  const d=objective.device;
  const node=new THREE.Group();node.position.set(d.x,0,d.y);
  const base=shape(CYL,13,7,13,0x2a1b18);base.position.y=3.5;node.add(base);
  const cage=new THREE.Mesh(new THREE.TorusGeometry(12,1.2,6,18),mat(warn,warn));
  cage.rotation.x=-Math.PI/2;cage.position.y=18;node.add(cage);
  const core=ball(0,18,0,8,8,8,0xff9a4a,0xff5a20);node.add(core);
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2,fin=shape(CONE,2.4,10,2.4,0x5a2a18);
   fin.position.set(Math.cos(a)*11,18,Math.sin(a)*11);fin.rotation.z=-a;node.add(fin);
  }
  d.mesh=node;d.core=core;d.ring=cage;grp.add(node);
 } else if(st.type==='implant'){
  if(objective.source){
   const src=new THREE.Group();src.position.set(objective.source.x,0,objective.source.y);
   const ped=shape(CYL,8,5,8,0x1a3040);ped.position.y=2.5;src.add(ped);
   const shard=shape(OCT,5,7,5,glow,glow);shard.position.y=14;src.add(shard);
   objective.sourceMesh=src;grp.add(src);
  }
  const socket=new THREE.Group();socket.position.set(objective.pos.x,0,objective.pos.y);
  const base=shape(CYL,11,5,11,0x1a3040);base.position.y=2.5;socket.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(9,1.2,6,18),mat(glow,glow));
  ring.rotation.x=-Math.PI/2;ring.position.y=12;socket.add(ring);
  const slot=shape(CONE,4,7,4,0x244b60);slot.position.y=12;slot.rotation.z=Math.PI/2;socket.add(slot);
  objective.socket=socket;grp.add(socket);
 } else if(st.type==='defend'){
  const d=objective.device;
  const node=new THREE.Group();node.position.set(d.x,0,d.y);
  const base=shape(CYL,14,6,14,0x1a3040);base.position.y=3;node.add(base);
  const core=ball(0,16,0,7,7,7,glow,glow);node.add(core);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(12,1.1,6,18),mat(glow,glow));
  ring.rotation.x=-Math.PI/2;ring.position.y=16;node.add(ring);
  d.mesh=node;d.core=core;d.ring=ring;grp.add(node);
 }
 syncObjectiveMarker();
}
function damageDevice(dmg){
 const d=objective.device;
 if(!d||d.hp<=0||objective.type!=='defend')return;
 d.hp-=dmg;burst(d.x,d.y,7,0xff9a4a);
 if(d.hp<=0){
  d.hp=d.maxhp;objective.t=0;objective.wave=0;
  msg='DEFENSE ARRAY RESET — HOLD THE LINE';msgT=2.4;
  AudioSys.tone(140,.4,'sawtooth',.07,-60);
 }
}
function hitObjectiveTargets(b){
 if(b.enemy||objective.done)return;
 const st=LEVELS[levelIdx]&&LEVELS[levelIdx].stages[objective.stage];if(!st)return;
 if(st.type==='enable'){
  for(const n of objective.nodes){
   if(n.lit||dist(b,n)>18)continue;
   n.lit=true;b.life=0;burst(n.x,n.y,16,0x8fe8ff,1.1);
   syncObjectiveMarker();
   addBlastLight(n.x,n.y,0x8fe8ff,50,120,.2);
   AudioSys.tone(720,.12,'triangle',.05,180);
   if(n.orb)n.orb.visible=false;
   if(n.ring&&n.ring.material&&n.ring.material.color&&n.ring.material.color.setHex)
    n.ring.material.color.setHex(0x4a7a8c);
   if(objective.nodes.every(x=>x.lit))completeStage(st);
   return;
  }
 }
 if(st.type==='destroy'&&objective.device&&objective.device.hp>0&&dist(b,objective.device)<22){
  b.life=0;objective.device.hp-=b.dmg;burst(b.x,b.y,8,0xffb04a);
  if(objective.device.hp<=0){objective.device.hp=0;completeStage(st);}
 }
}
function completeStage(st){
 const L=LEVELS[levelIdx];
 if(st.unlock!==undefined)unlockDoor(st.unlock);
 for(const s of (st.spawn||[])){
  const e=safePlaceEnemy(makeEnemy(s[0],s[1]*TILE+TILE/2,s[2]*TILE+TILE/2));
  enemies.push(e);spawnEnemyMesh(e);}
 msg=st.msg||'OBJECTIVE COMPLETE';msgT=2.6;AudioSys.pickup();
 objective.alarmed=false;
 objective.stage++;
 if(objective.stage>=L.stages.length){
  objective.done=true;objective.progress=1;
  if(objective.propG){worldG.remove(objective.propG);objective.propG=null;}
 }
 else{
  const ns=L.stages[objective.stage];
  objective.pos=tilePos(ns.pos[0],ns.pos[1]);
  setupStageState(ns);
  spawnObjectiveProps();
  if(ns.type==='boss')cueMusic('boss');
  msg=ns.label;msgT=2.4;
 }
 if(levelIdx===1&&objective.stage===2)storyBeat(STORY.relayBeat());
 if(levelIdx===2&&objective.stage===2)startCutscene('mid',STORY.praetorianBeat(),'PLAY');
 if(levelIdx===3&&objective.stage===2)storyBeat(STORY.lancerBeat());
 if(levelIdx===3&&objective.stage===3)startJuggernautEntrance();
 if(levelIdx===3&&st.type==='defend'){
  campaign.flags.jugMissionDone=true;
  const ally=enemies.find(e=>e.type==='juggernaut'&&e.duelResolved);
  if(ally){ally.ally=true;ally.stun=0;}
  startCutscene('mid',STORY.juggernautOath(),'PLAY');
 }
 if(levelIdx===4&&objective.stage===2){
  startDirectorPhases(enemies.find(e=>e.type==='boss'&&!e.dead));
  storyBeat(STORY.directorBeat());
 }
 if(levelIdx===0&&objective.stage===1)unlockBiotic('well');
 if(levelIdx===1&&objective.stage===1)unlockBiotic('dash');
 if(levelIdx===2&&objective.stage===1)unlockBiotic('barrier');
}
function shoot(from,angle,enemy=false,weapon='rifle'){
 const sg=!enemy&&weapon==='shotgun',pellets=enemy?1:(sg?7:1),sp=enemy?300:(sg?520:680);
 from.recoil=1;let last=null;
 for(let i=0;i<pellets;i++){
  const a=angle+(sg?rnd(-.17,.17):rnd(-.012,.012));
  const b={x:from.x+Math.cos(a)*(from.r+4),y:from.y+Math.sin(a)*(from.r+4),
   vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:enemy?2.2:(sg?.6:1.3),
   dmg:enemy?from.dmg:(sg?9:14)*(1+Math.min(4,campaign.renegade)*.08),
   enemy,col:enemy?0xff2f3a:0xff6a4a,ownerRemote:!!from.isRemote,
   team:(!enemy&&mp.active&&mp.mode==='pvp')?(from.team||(from===player?mp.team:null)||null):null,
   ownerPlayer:(!enemy&&from===player),
   ownerSlot:(from&&from.peerIndex!=null)?from.peerIndex:null};  b.mesh=new THREE.Mesh(TRACER_GEOS[b.col],BULLET_MAT);
  b.mesh.scale.setScalar(enemy?.9:(sg?.75:1));
  b.mesh.position.set(b.x,22,b.y);b.mesh.rotation.y=-a;fxG.add(b.mesh);
  bullets.push(b);last=b;
 }
 if(!enemy){AudioSys.shot();shake=Math.max(shake,sg?5:2);muzzleLight.intensity=sg?3.5:2.5;}
 return last;
}
function burst(x,y,n,c,spd=1){for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(40,180)*spd;
 addPart({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.2,.6),c,s:rnd(1.5,4)});}}

function triggerEnemyAbility(e,a){
 const d=dist(e,player);
 if(e.ability==='SHOCK SLAM'){
  if(d>190)return false;
  e.hitT=.35;burst(e.x,e.y,18,0xffb04a,1.5);
  spawnAbilityFx('SHOCK SLAM',e.x,e.y,0xffb04a,a);
  addBlastLight(e.x,e.y,0xffb04a,120,220,.3);
  shake=Math.max(shake,8);flash=Math.max(flash,.12);
  AudioSys.tone(90,.3,'sawtooth',.08,-40);AudioSys.noise(.3,.05);
  msg='WARDEN — SHOCK SLAM';msgT=1.1;
  if(d<175){hurtPlayer(18);const pa=ang(e,player);
   moveEntity(player,Math.cos(pa)*55,Math.sin(pa)*55);}
  return true;
 }
 if(e.ability==='BLINK STRIKE'){
  const side=Math.random()<.5?1:-1;
  const bx=player.x+Math.cos(a+side*.9)*95,by=player.y+Math.sin(a+side*.9)*95;
  if(solidAt(bx,by))return false;
  const ox=e.x,oy=e.y;
  burst(ox,oy,16,0xb07aff,1.6);
  e.x=bx;e.y=by;e.vx=0;e.vy=0;e.fire=.28;e.hitT=.25;
  burst(e.x,e.y,18,0xd7b0ff,1.8);
  spawnAbilityFx('BLINK STRIKE',e.x,e.y,0xb07aff,a,ox,oy);
  addBlastLight(e.x,e.y,0xb07aff,100,200,.3);
  AudioSys.tone(420,.16,'triangle',.06,320);
  msg='PHANTOM — BLINK STRIKE';msgT=1;
  if(dist(e,player)<70)hurtPlayer(10);
  return true;
 }
 if(e.ability==='OVERCHARGE'){
  for(let i=-2;i<=2;i++)shoot(e,a+i*.14,true);
  e.fire=Math.max(e.fire,.55);e.hitT=.2;
  spawnAbilityFx('OVERCHARGE',e.x,e.y,0x7affb0,a);
  addBlastLight(e.x,e.y,0x7affb0,80,180,.22);
  AudioSys.tone(980,.12,'square',.05,120);
  msg='TECHNICIAN — OVERCHARGE';msgT=1;
  return true;
 }
 if(e.ability==='NULL PULSE'){
  if(d>240)return false;
  const hadCloak=player.cloak>0,hadBarrier=player.barrier>0;
  player.cloak=0;player.barrier=0;player.biot=0;
  if(hadCloak)cloakVisual(false);
  if(hadBarrier)clearBarrierFx();
  player.sh=Math.max(0,player.sh-32);
  player.reload=Math.max(player.reload,1.1);
  e.hitT=.35;burst(e.x,e.y,24,0x7ad8ff,1.7);
  spawnAbilityFx('NULL PULSE',e.x,e.y,0x7ad8ff,a);
  addBlastLight(e.x,e.y,0x7ad8ff,140,280,.35);
  shake=Math.max(shake,9);flash=Math.max(flash,.16);
  AudioSys.tone(160,.34,'sawtooth',.08,-30);AudioSys.noise(.28,.05);
  msg='PRAETORIAN — NULL PULSE';msgT=1.4;
  hurtPlayer(7);
  return true;
 }
 if(e.ability==='RAIL LANCE'){
  if(d>430)return false;
  const b=shoot(e,a,true);
  if(b){b.vx*=2.1;b.vy*=2.1;b.dmg=e.dmg*2.4;b.life=1.6;
   if(b.mesh)b.mesh.scale.setScalar(1.7);}
  e.hitT=.3;e.fire=Math.max(e.fire,1.05);
  spawnAbilityFx('RAIL LANCE',e.x,e.y,0xff5a8a,a);
  addBlastLight(e.x,e.y,0xff5a8a,130,260,.28);
  AudioSys.tone(220,.22,'square',.07,-25);
  msg='LANCER — RAIL LANCE';msgT=1.2;
  if(d<300){hurtPlayer(5);const pa=ang(e,player);
   moveEntity(player,Math.cos(pa)*24,Math.sin(pa)*24);}
  return true;
 }
 if(e.ability==='SIEGE SLAM'){
  if(d>230)return false;
  e.hitT=.4;burst(e.x,e.y,30,0xff6a4a,2);
  spawnAbilityFx('SIEGE SLAM',e.x,e.y,0xff6a4a,a);
  addBlastLight(e.x,e.y,0xff5a3c,170,340,.4);
  shake=Math.max(shake,13);flash=Math.max(flash,.2);
  AudioSys.tone(80,.42,'sawtooth',.09,-42);AudioSys.noise(.4,.06);
  msg=loc('DIRECTOR MECH — SIEGE SLAM');msgT=1.4;
  if(d<205){hurtPlayer(21);const pa=ang(e,player);
   moveEntity(player,Math.cos(pa)*74,Math.sin(pa)*74);}
  return true;
 }
 if(e.ability==='BIG BIOTIC HAMMER'||e.ability==='BIOTIC HURRICANE'){
  if(d>210)return false;
  const big=e.ability==='BIG BIOTIC HAMMER';
  e.hurricane=big?1.25:1.5;e.hurricaneHitCd=0;e.hitT=.3;
  e.hammerWindup=0;e.hammerRecover=0;
  spawnAbilityFx(e.ability,e.x,e.y,0x9fd8ff,a);
  addBlastLight(e.x,e.y,0x9fd8ff,big?180:150,big?340:300,.4);
  burst(e.x,e.y,big?36:30,0x9fd8ff,2.1);
  shake=Math.max(shake,big?12:9);flash=Math.max(flash,.16);
  AudioSys.tone(120,.5,'sawtooth',.09,-35);AudioSys.noise(.35,.05);
  msg=loc(big?'JUGGERNAUT — BIG BIOTIC HAMMER':'JUGGERNAUT — BIOTIC HURRICANE');msgT=1.5;
  return true;
 }
 return false;
}
function enemyAbilityCooldown(a){
 if(a==='OVERCHARGE')return 4.2;
 if(a==='BLINK STRIKE')return 3.4;
 if(a==='NULL PULSE')return 4.8;
 if(a==='RAIL LANCE')return 3.8;
 if(a==='SIEGE SLAM')return 4.2;
 if(a==='BIG BIOTIC HAMMER')return 5.4;
 if(a==='BIOTIC HURRICANE')return 6.5;
 return 4.6;
}
function bossMindLash(e,a){
 const before=bullets.length,pull=Math.min(60,dist(e,player)*.22);
 const pa=ang(player,e);
 moveEntity(player,Math.cos(pa)*pull,Math.sin(pa)*pull);
 for(const off of [-.28,-.14,0,.14,.28])shoot(e,a+off,true);
 for(let i=before;i<bullets.length;i++){
  bullets[i].dmg=11;bullets[i].col=0xff7ad7;
  if(bullets[i].mesh)bullets[i].mesh.material.color.setHex(0xff7ad7);}
 e.hitT=.4;e.fire=Math.max(e.fire,.8);
 addBlastLight(e.x,e.y,0xff7ad7,140,320,.4);
 burst(e.x,e.y,26,0xff7ad7,1.7);
 spawnAbilityFx('MIND LASH',e.x,e.y,0xff7ad7,a);
 shake=Math.max(shake,10);flash=Math.max(flash,.18);
 AudioSys.tone(150,.4,'sawtooth',.08,-55);
 msg='DIRECTOR — MIND LASH';msgT=1.5;
 if(e.phase&&!e.summoned){
  e.summoned=true;
  const count=campaign.flags.saveInali?1:2;
  for(let i=0;i<count;i++){
   const ox=e.x+(i?70:-70),oy=e.y+50;
   const ph=safePlaceEnemy(makeEnemy('phantom',ox,oy));
   enemies.push(ph);spawnEnemyMesh(ph);
   burst(ph.x,ph.y,20,0xb07aff,1.6);}
  msg='DIRECTOR — INALI ECHOES';msgT=2;
 }
 return true;
}

/* ---------------- UPDATE ---------------- */
function steer(e,dx,dy,spd,dt){
 e.vx=lerp(e.vx,dx*spd,1-Math.exp(-dt*8));
 e.vy=lerp(e.vy,dy*spd,1-Math.exp(-dt*8));
 moveEntity(e,e.vx*dt,e.vy*dt);
 e.walk+=Math.hypot(e.vx,e.vy)*dt*.055;
}
function update(dt){
 time+=dt;shake=Math.max(0,shake-dt*12);flash=Math.max(0,flash-dt*3);
 if(msgT>0)msgT-=dt;
 if(bossCard&&bossCard.t>0)bossCard.t-=dt;
 if(state==='DIALOGUE'&&dialogue&&dialogue.cutscene){
  cutT+=dt;cutLineT+=dt;cutDt=dt;
  if(!dialogue.ready&&cutLineT>=cutsceneLineMin(dialogue))dialogue.ready=true;
 }
 muzzleLight.intensity=Math.max(0,muzzleLight.intensity-dt*18);
 muzzleLight.visible=muzzleLight.intensity>.1;
 if(state!=='PLAY')return;
 if(startDelay>0){startDelay-=dt;return;}
 const L=LEVELS[levelIdx];
 if(mp.active&&!mp.host){
  // Client: send input, host simulates. Keep camera/aim responsive.
  if(touch.fire){const mag=Math.hypot(touch.fire.ox,touch.fire.oy); if(mag>6){aimDir=stickAim(touch.fire.ox/touch.fire.r,touch.fire.oy/touch.fire.r); aimPoint.x=player.x+Math.cos(aimDir)*300; aimPoint.y=player.y+Math.sin(aimDir)*300;}}
  const padAim=GamepadSys.active&&Math.hypot(GamepadSys.rightX,GamepadSys.rightY)>.18;
  if(padAim){aimDir=Math.atan2(GamepadSys.rightY,GamepadSys.rightX); aimPoint.x=player.x+Math.cos(aimDir)*300; aimPoint.y=player.y+Math.sin(aimDir)*300;}
  let ptrX=null,ptrY=null;
  if(!touch.fire&&!touch.look&&!padAim&&mouse.moved){ptrX=mouse.x;ptrY=mouse.y;}
  if(ptrX!==null){NDC.set(ptrX/W*2-1,-(ptrY/H)*2+1);RAY.setFromCamera(NDC,camera); if(RAY.ray.intersectPlane(AIMPLANE,HIT)){aimPoint.x=HIT.x;aimPoint.y=HIT.z; const dx=HIT.x-player.x,dy=HIT.z-player.y; if(dx*dx+dy*dy>100)aimDir=Math.atan2(dy,dx);}}
  const mi=mpCollectInput(); mpSend(mi); mp._abilityPressed=false;
  if(!player.dash){const turn=Math.atan2(Math.sin(aimDir-player.ang),Math.cos(aimDir-player.ang)); player.ang+=turn*(1-Math.exp(-dt*24));}
  camFocus.x=lerp(camFocus.x,player.x,Math.min(1,dt*9));
  camFocus.y=lerp(camFocus.y,player.y,Math.min(1,dt*9));
  camera.position.set(camFocus.x,165,camFocus.y+112);
  camera.lookAt(camFocus.x,12,camFocus.y-6);
  sun.position.set(camFocus.x-130,260,camFocus.y+90);
  sun.target.position.set(camFocus.x,0,camFocus.y);sun.target.updateMatrixWorld();
  roomLight.position.set(camFocus.x,100,camFocus.y);
  mpSyncAllRemotes(dt);
  return;
 }
 if(player.dash)updateDash(dt);
 else {
  let mx=0,my=0;
  if(keys['a']||keys['arrowleft'])mx--;if(keys['d']||keys['arrowright'])mx++;
  if(keys['w']||keys['arrowup'])my--;if(keys['s']||keys['arrowdown'])my++;
  if(touch.move){const dx=touch.move.x-touch.move.x0,dy=touch.move.y-touch.move.y0,mag=Math.hypot(dx,dy);
   if(mag>8){mx+=dx/mag*Math.min(1,mag/60);my+=dy/mag*Math.min(1,mag/60);}}
  if(GamepadSys.active){mx+=GamepadSys.leftX;my+=GamepadSys.leftY;}
  const m=Math.hypot(mx,my)||1,ps=205;
  player.vx=lerp(player.vx,mx/m*ps,1-Math.exp(-dt*11));
  player.vy=lerp(player.vy,my/m*ps,1-Math.exp(-dt*11));
  moveEntity(player,player.vx*dt,player.vy*dt);
  player.walk+=Math.hypot(player.vx,player.vy)*dt*.055;
  player.recoil=Math.max(0,player.recoil-dt*8);
 }
 // camera follows before raycast so aim uses this frame's view
 camFocus.x=lerp(camFocus.x,player.x,Math.min(1,dt*9));
 camFocus.y=lerp(camFocus.y,player.y,Math.min(1,dt*9));
 camera.position.set(camFocus.x,165,camFocus.y+112);
 camera.lookAt(camFocus.x,12,camFocus.y-6);
 sun.position.set(camFocus.x-130,260,camFocus.y+90);
 sun.target.position.set(camFocus.x,0,camFocus.y);sun.target.updateMatrixWorld();
 roomLight.position.set(camFocus.x,100,camFocus.y);
 muzzleLight.position.set(player.x,26,player.y);
 muzzleLight.visible=muzzleLight.intensity>.1;
 // circular fire pad: drag around the ring to aim, auto-fire while held
 if(touch.fire){
  const mag=Math.hypot(touch.fire.ox,touch.fire.oy);
  if(mag>6){
   aimDir=stickAim(touch.fire.ox/touch.fire.r,touch.fire.oy/touch.fire.r);
   aimPoint.x=player.x+Math.cos(aimDir)*300;
   aimPoint.y=player.y+Math.sin(aimDir)*300;
  }
 }
 // Mouse-only absolute aiming; touch aiming happens exclusively in the ring.
 const padAim=GamepadSys.active&&Math.hypot(GamepadSys.rightX,GamepadSys.rightY)>.18;
 if(padAim){
  aimDir=Math.atan2(GamepadSys.rightY,GamepadSys.rightX);
  aimPoint.x=player.x+Math.cos(aimDir)*300;aimPoint.y=player.y+Math.sin(aimDir)*300;
 }
 let ptrX=null,ptrY=null;
 if(!touch.fire&&!touch.look&&!padAim&&mouse.moved){ptrX=mouse.x;ptrY=mouse.y;}
 if(ptrX!==null){
  NDC.set(ptrX/W*2-1,-(ptrY/H)*2+1);
  RAY.setFromCamera(NDC,camera);
  if(RAY.ray.intersectPlane(AIMPLANE,HIT)){
   aimPoint.x=HIT.x;aimPoint.y=HIT.z;
   const dx=HIT.x-player.x,dy=HIT.z-player.y;
   if(dx*dx+dy*dy>100)aimDir=Math.atan2(dy,dx);
  }}
 if(!player.dash){
  const turn=Math.atan2(Math.sin(aimDir-player.ang),Math.cos(aimDir-player.ang));
  player.ang+=turn*(1-Math.exp(-dt*24));}
 player.fire-=dt;player.reload-=dt;player.hitT-=dt;
 if(player.melee>0)player.melee=Math.max(0,player.melee-dt);
 if(player.meleeCd>0)player.meleeCd=Math.max(0,player.meleeCd-dt);
 if(!Number.isFinite(player.fire))player.fire=0;
 if(!Number.isFinite(player.reload))player.reload=0;
 if(!Number.isFinite(player.ammo))player.ammo=0;
 if(!Number.isFinite(player.sh))player.sh=0;
 if(!Number.isFinite(player.hp))player.hp=Math.max(0,player.hp||0);
 const firing=!player.dead&&!player.dash&&(mouse.down||GamepadSys.heldAction('fire')||
  (!!touch.fire&&Math.hypot(touch.fire.ox,touch.fire.oy)>6));
 const sg=player.weapon==='shotgun';
 if(firing&&player.ammo>0&&player.fire<=0&&player.reload<=0){
  shoot(player,player.ang,false,player.weapon);player.ammo--;
  player.fire=sg?.62:.075;
  if(player.ammo<=0)reloadWeapon();}
 if(player.reload<=0&&player.ammo<=0&&(player.reserve[player.weapon]||0)>0)reloadWeapon();
 if(player.reload>0&&player.reload<.05){
  const need=player.maxammo-player.ammo;
  const take=Math.min(need,player.reserve[player.weapon]);
  player.ammo+=take;player.reserve[player.weapon]-=take;
  player.wammo[player.weapon]=player.ammo;player.reload=0;AudioSys.pickup();}
 if(keys['q']){triggerQAbility();keys['q']=false;}
 if(keys['e']){triggerEquippedBiotic();keys['e']=false;}
 if(keys['[']){cycleBiotic(-1);keys['[']=false;}
 if(keys[']']){cycleBiotic(1);keys[']']=false;}
 if(keys[';']){cycleQAbility(-1);keys[';']=false;}
 if(keys["'"]){cycleQAbility(1);keys["'"]=false;}
 if(player.cloak>0){player.cloak-=dt;
  if(player.cloak<=0){player.cloak=0;cloakVisual(false);}}
 if(player.cloakCd>0)player.cloakCd=Math.max(0,player.cloakCd-dt);
 if(player.barrier>0){player.barrier-=dt;if(player.barrier<=0){player.barrier=0;player.sh=Math.min(player.sh,player.maxsh);clearBarrierFx();}}
 if(player.barrierCd>0)player.barrierCd=Math.max(0,player.barrierCd-dt);
 if(player.dashCd>0)player.dashCd=Math.max(0,player.dashCd-dt);
 if(player.biot>0)player.biot-=dt;
 const quiet=time-(player.lastHit||0);
  if(quiet>shieldDelay()&&player.sh<maxShield())player.sh=Math.min(maxShield(),player.sh+shieldRate()*dt);
  if(quiet>REGEN.healthDelay&&player.hp<player.maxhp)player.hp=Math.min(player.maxhp,player.hp+REGEN.healthRate*dt);
 const critical=player.hp/player.maxhp<.3;
 player.critT=lerp(player.critT||0,critical?1:0,1-Math.exp(-dt*6));
 if(critical){
  player.beatCd=(player.beatCd||0)-dt;
  if(player.beatCd<=0){
   AudioSys.tone(72,.1,'sine',.08,-24);AudioSys.tone(54,.13,'sine',.05,-18);
   player.beatCd=.82;shake=Math.max(shake,1.6);}
 }
 for(const e of enemies){
  if(e.dead){e.deathT+=dt;continue;}
  e.hitT-=dt;e.fire-=dt;e.stun-=dt;e.recoil=Math.max(0,e.recoil-dt*8);
  if(e.ability)e.abilityCd-=dt;
  if(e.stun>0){e.vx=lerp(e.vx,0,1-Math.exp(-dt*5));e.vy=lerp(e.vy,0,1-Math.exp(-dt*5));
   moveEntity(e,e.vx*dt,e.vy*dt);continue;}
  const d=dist(e,player),a=ang(e,player);
  if(player.cloak>0){
   e.charge=0;
   e.wanderT=(e.wanderT||0)-dt;
   if(e.wanderT<=0){ e.wanderA=rnd(0,TAU); e.wanderT=rnd(0.8,1.8); }
   steer(e,Math.cos(e.wanderA||0),Math.sin(e.wanderA||0),24,dt);
   const spd=Math.hypot(e.vx,e.vy);
   if(spd>2) e.ang=Math.atan2(e.vy,e.vx);
   continue;
  }
  e.ang=a;
   if(e.type==='directorMech'){
    if(e.abilityCd<=0&&d<e.range&&triggerEnemyAbility(e,a))
     e.abilityCd=enemyAbilityCooldown(e.ability);
    if(e.charge>0){e.charge-=dt;steer(e,Math.cos(e.ca),Math.sin(e.ca),300,dt);
     if(dist(e,player)<e.r+player.r+8)hurtPlayer(15);}
    else if(e.fire<=0&&d<e.range){e.charge=.5;e.ca=a;e.fire=1.25;AudioSys.boss();}
    else if(d>150)steer(e,Math.cos(a),Math.sin(a),e.spd,dt);
    if(e.fire<=0&&d<e.range){shoot(e,a,true);e.fire=.85;}
   } else if(e.type==='boss'){
    if(e.dirPhase===1)continue;
    e.phase=e.dirArmor?1:(e.hp<e.maxhp*.5?1:0);
    if(e.abilityCd<=0&&d<e.range&&bossMindLash(e,a))
     e.abilityCd=e.phase?4.4:6.2;
    if(e.dirPhase===0){
     if(e.fire<=0&&d<e.range){shoot(e,a,true);e.fire=1.8;}
     if(d>200)steer(e,Math.cos(a),Math.sin(a),e.spd*.55,dt);
    } else {
     if(e.charge>0){e.charge-=dt;steer(e,Math.cos(e.ca),Math.sin(e.ca),260,dt);
      if(dist(e,player)<e.r+player.r+6)hurtPlayer(16);}
     else if(e.fire<=0&&d<e.range){e.charge=.55;e.ca=a;e.fire=e.phase?1.6:2.4;AudioSys.boss();}
     else if(d>120)steer(e,Math.cos(a),Math.sin(a),e.spd,dt);
     if(e.fire<=0&&d<e.range){shoot(e,a,true);e.fire=.7;}
    }
   } else if(e.type==='juggernaut'){
    const reach=e.r+player.r+72;
    if(e.duelResolved){
     if(e.ally)jugAllyAI(e,dt,d);
     else {
      e.vx=lerp(e.vx,0,1-Math.exp(-dt*7));e.vy=lerp(e.vy,0,1-Math.exp(-dt*7));
      if(d>90)steer(e,Math.cos(a+2.2),Math.sin(a+2.2),e.spd*.35,dt);
     }
    } else {
     e.duelTimer+=dt;
     if(e.duelTimer>7){e.duelTimer=0;registerDuelRead(e,'survived');}
     if(e.hurricane>0){
      e.hurricane=Math.max(0,e.hurricane-dt);
      e.hurricaneHitCd=Math.max(0,e.hurricaneHitCd-dt);
      if(e.hurricaneHitCd<=0&&d<e.r+player.r+58){
       juggernautHit(18);e.hurricaneHitCd=.4;
       const pa=ang(e,player);
       moveEntity(player,Math.cos(pa)*46,Math.sin(pa)*46);
       if(player.barrier>0)registerDuelRead(e,'barrier');
       burst(player.x,player.y,12,0x9fd8ff,1.3);
      }
      steer(e,Math.cos(a),Math.sin(a),e.spd*.42,dt);
     } else if(e.hammerRecover>0){
      e.hammerRecover=Math.max(0,e.hammerRecover-dt);
      e.vx=lerp(e.vx,0,1-Math.exp(-dt*9));e.vy=lerp(e.vy,0,1-Math.exp(-dt*9));
     } else if(e.hammerWindup>0){
      e.hammerWindup=Math.max(0,e.hammerWindup-dt);
      e.vx=lerp(e.vx,0,1-Math.exp(-dt*10));e.vy=lerp(e.vy,0,1-Math.exp(-dt*10));
      const tracking=Math.abs(angDiff(ang(e,player),e.hammerAng));
      if(player.dash||player.cloak>0||d>reach*1.15||tracking>1.05)e.hammerDodged=true;
      if(e.hammerWindup<=0){
       const hit=d<reach&&tracking<1.05;
       if(hit){
        juggernautHit(e.dmg+4);
        const pa=ang(e,player);
        moveEntity(player,Math.cos(pa)*64,Math.sin(pa)*64);
        if(player.barrier>0)registerDuelRead(e,'barrier');
       } else if(e.hammerDodged)registerDuelRead(e,'read');
       e.hammerRecover=.5;e.counterCounted=false;e.fire=e.ft*rnd(1.15,1.4);
       for(let i=0;i<14;i++){
        const oa=e.hammerAng+rnd(-.95,.95),rr=rnd(38,reach);
        addPart({x:e.x+Math.cos(oa)*rr,y:e.y+Math.sin(oa)*rr,
         vx:Math.cos(oa)*rnd(120,260),vy:Math.sin(oa)*rnd(120,260),
         life:rnd(.2,.45),c:i%3?0xe6faff:0x9fd8ff,s:rnd(2,4.5)});
       }
       addBlastLight(e.x+Math.cos(e.hammerAng)*50,e.y+Math.sin(e.hammerAng)*50,
         0x9fd8ff,140,280,.24);
       shake=Math.max(shake,10);AudioSys.biotic();AudioSys.hit();
      }
     } else {
      if(e.ability&&e.abilityCd<=0&&d<195&&triggerEnemyAbility(e,a))
       e.abilityCd=enemyAbilityCooldown(e.ability);
      if(d<reach&&e.fire<=0){
       e.hammerWindup=.58;e.hammerAng=a;e.hammerDodged=false;
       e.counterCounted=false;e.fire=e.ft+.85;
       msg=loc('JUGGERNAUT — BIG BIOTIC HAMMER');msgT=.7;
       AudioSys.tone(150,.22,'sawtooth',.06,-45);
       burst(e.x+Math.cos(a)*44,e.y+Math.sin(a)*44,16,0xbfe8ff,1.1);
      } else if(d>reach*.72)steer(e,Math.cos(a),Math.sin(a),e.spd,dt);
      else steer(e,Math.cos(a+Math.PI/2),Math.sin(a+Math.PI/2),e.spd*.42,dt);
     }
    }
   } else {
    if(e.ability&&e.abilityCd<=0&&d<Math.min(e.range,240)&&
       triggerEnemyAbility(e,a))
     e.abilityCd=enemyAbilityCooldown(e.ability);
    const dev=objective.device,defend=objective.type==='defend'&&dev&&dev.hp>0;
    const dd=defend?dist(e,dev):Infinity;
    if(defend&&dd<e.range&&dd<d*1.12){
     // Defense stages give enemies a real target: the array, not just Randall.
     const da=ang(e,dev);
     if(dd>90)steer(e,Math.cos(da),Math.sin(da),e.spd*.65,dt);
     if(e.fire<=0){damageDevice(e.dmg);e.fire=e.ft*rnd(.8,1.25);}
    }
    else if(d<e.range){if(d>170)steer(e,Math.cos(a),Math.sin(a),e.spd,dt);
     if(e.fire<=0){shoot(e,a+rnd(-.08,.08),true);e.fire=e.ft*rnd(.8,1.25);}}
    else {e.vx=lerp(e.vx,0,1-Math.exp(-dt*6));e.vy=lerp(e.vy,0,1-Math.exp(-dt*6));}
   }
  }
 // keep bodies from stacking: soft separation between all live actors
 const live=[];
 if(!player.dead)live.push(player);
 for(let i=0;i<enemies.length;i++)if(!enemies[i].dead)live.push(enemies[i]);
 for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
  const a=live[i],b=live[j],dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy,min=(a.r+b.r)*.9;
  if(d2>1&&d2<min*min){const d=Math.sqrt(d2),push=(min-d)/2,nx=dx/d,ny=dy/d;
   moveEntity(a,-nx*push,-ny*push);moveEntity(b,nx*push,ny*push);}
 }
 // Biotic singularity: persistent area that drags enemies inward, damages
 // them over time, and bends/swallows incoming enemy fire.
 for(const f of fields){
  f.life-=dt;f.t+=dt;
  const k=clamp(f.life/f.maxLife,0,1);
  if(f.mesh){const rr=f.r*(.3+.7*k);f.mesh.scale.set(rr,rr,rr);
   f.mesh.material.opacity=.75*k;f.mesh.rotation.z+=dt*1.6;}
  if(f.shock){const t=clamp(f.t/.55,0,1),rr=f.r*(.05+1.05*t);
   f.shock.scale.set(rr,rr,rr);f.shock.material.opacity=.95*(1-t);}
  if(f.ring2){f.ring2.scale.setScalar(f.r*(.42+.5*k)*(1+.06*Math.sin(f.t*9)));
   f.ring2.rotation.z-=dt*2.4;f.ring2.rotation.x=.85+Math.sin(f.t*3)*.3;
   f.ring2.material.opacity=.55*k;}
  if(f.core){f.core.scale.setScalar(16+8*Math.sin(f.t*9));f.core.material.opacity=.42*k;}
  if(f.light){f.light.intensity=(70+45*Math.sin(f.t*13))*k;
   f.light.position.set(f.x,38+Math.sin(f.t*6)*12,f.y);}
  for(const e of enemies){
   if(e.dead)continue;
   const dx=f.x-e.x,dy=f.y-e.y,d=Math.hypot(dx,dy);
   if(d>f.r||d<1)continue;
   const fall=1-d/f.r;
   e.vx+=dx/d*700*fall*dt;e.vy+=dy/d*700*fall*dt;
   e.stun=Math.max(e.stun,.12);e.hitT=.1;
   damageEnemy(e,24*fall*dt,'field');
  }
  for(const b of bullets){
   if(!b.enemy)continue;
   const dx=f.x-b.x,dy=f.y-b.y,d=Math.hypot(dx,dy);
   if(d>f.r||d<1)continue;
   b.vx+=dx/d*520*dt;b.vy+=dy/d*520*dt;
   if(d<26){b.life=0;burst(b.x,b.y,4,0x9fd8ff,.4);}
  }
  for(let i=0;i<6;i++){
   const a=rnd(0,TAU),rr=f.r*rnd(.55,1.05);
   addPart({x:f.x+Math.cos(a)*rr,y:f.y+Math.sin(a)*rr,
    vx:-Math.cos(a)*rnd(160,360),vy:-Math.sin(a)*rnd(160,360),
    life:rnd(.22,.55),c:i%3?0x9fd8ff:0xeaffff,s:rnd(1.5,4.5)});
  }
 }
 let wf=0;
 for(let i=0;i<fields.length;i++){const f=fields[i];
  if(f.life>0){fields[wf++]=f;continue;}
  for(const key of ['mesh','core','shock','ring2','light'])if(f[key])fxG.remove(f[key]);}
 fields.length=wf;
 let wq=0;const qlen=blastQueue.length;
 for(let i=0;i<qlen;i++){const q=blastQueue[i];q.t-=dt;
  if(q.t<=0)explodeBarrel(q.br);else blastQueue[wq++]=q;}
 blastQueue.length=wq;
 let wl=0;
 for(let i=0;i<blastLights.length;i++){const bl=blastLights[i];bl.t-=dt;
  if(bl.t>0){bl.light.intensity=bl.light.userData.base*Math.max(0,bl.t/bl.max);
   blastLights[wl++]=bl;}else fxG.remove(bl.light);}
 blastLights.length=wl;
 updateAbilityFx(dt);
 for(const b of bullets){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.life<=0||solidAt(b.x,b.y)){if(b.life>0)burst(b.x,b.y,5,b.col,.4);b.life=0;continue;}
  if(b.enemy){
   if(player.cloak>0){b.life=0;burst(b.x,b.y,4,0x63e6ff,.4);continue;}
   if(dist(b,player)<player.r+4){hurtPlayer(b.dmg);b.life=0;burst(b.x,b.y,6,b.col);}
   else if(mp.active&&mp.host){for(const rr of mpGetRemotes()){if(!rr.dead&&dist(b,rr)<rr.r+4){mpHurtRemote(b.dmg,rr);b.life=0;burst(b.x,b.y,6,b.col);break;}}}
  }
  else {
   hitObjectiveTargets(b);
   if(mp.active&&mp.mode==='pvp'){
    const teamMode = mp.pvpMode==='team';
    if(b.ownerRemote){
     if(teamMode && b.team && b.team===mp.team) { /* friendly fire off */ }
     else if(dist(b,player)<player.r+4&&!player.dead){hurtPlayer(b.dmg);b.life=0;burst(b.x,b.y,6,b.col);}
     // remote-vs-remote friendly fire in team mode: host sim handles via ownerSlot
     if(b.life>0 && mp.host){
      for(const rr of mpGetRemotes()){
       if(rr.dead||dist(b,rr)>=rr.r+4) continue;
       if(b.ownerSlot!=null && rr.peerIndex===b.ownerSlot) continue;
       if(teamMode && b.team && rr.team===b.team) continue;
       mpHurtRemote(b.dmg,rr);b.life=0;burst(b.x,b.y,6,b.col);break;
      }
     }
    } else if(mp.host){
     for(const rr of mpGetRemotes()){
      if(rr.dead||dist(b,rr)>=rr.r+4) continue;
      if(teamMode && b.team && rr.team===b.team) continue;
      mpHurtRemote(b.dmg,rr);b.life=0;burst(b.x,b.y,6,b.col);break;
     }
    }
   }
   if(b.life>0)for(const e of enemies){
    if(!e.dead&&dist(b,e)<e.r+4){damageEnemy(e,b.dmg,'bullet');b.life=0;burst(b.x,b.y,7,b.col);break;}}
  }
  for(const br of barrels){
   if(!br.dead&&dist(b,br)<br.r+6){explodeBarrel(br);b.life=0;break;}}
  for(const c of cover){if(c.hp>0&&Math.abs(b.x-c.x)<TILE/2&&Math.abs(b.y-c.y)<TILE/2&&!b.enemy){c.hp-=b.dmg;b.life=0;
    burst(b.x,b.y,5,0x8fa6b8);if(c.hp<=0&&c.mesh)worldG.remove(c.mesh);break;}}
 }
 let wb=0;
 for(let i=0;i<bullets.length;i++){const b=bullets[i];
  if(b.life<=0){if(b.mesh)fxG.remove(b.mesh);continue;}
  bullets[wb++]=b;}
 bullets.length=wb;
 for(const p of pickups){p.t+=dt;if(dist(p,player)<player.r+16){
   if(p.type==='med')player.hp=Math.min(player.maxhp,player.hp+45);
   if(p.type==='shield')player.sh=maxShield();
   if(p.type==='ammo'){
    for(const w of WEAPONS){player.wammo[w]=WDEF[w].mag;player.reserve[w]=WDEF[w].reserve;}
    player.ammo=player.maxammo;player.reload=0;}
   p.t=-999;AudioSys.pickup();msg=p.type==='med'?(lang==='fa'?'مدی‌ژل اعمال شد':'MEDIGEL APPLIED'):p.type==='shield'?(lang==='fa'?'سپر بازیابی شد':'SHIELDS RESTORED'):(lang==='fa'?'مهمات پر شد':'AMMO RESTOCKED');msgT=1.5;
   if(p.mesh)worldG.remove(p.mesh);}}
 let wpk=0;
 for(let i=0;i<pickups.length;i++)if(pickups[i].t>-100)pickups[wpk++]=pickups[i];
 pickups.length=wpk;
 const st=LEVELS[levelIdx].stages[objective.stage];
 if(st&&!objective.done){
  const focus=currentObjectivePoint(),rad=st.radius||96;
  if(!objective.alarmed&&dist(player,focus)<rad*1.45){
   objective.alarmed=true;raiseAlarm(st);}
  if(st.type==='enable'){
   const lit=objective.nodes.filter(n=>n.lit).length;
   objective.progress=objective.nodes.length?lit/objective.nodes.length:0;
   if(objective.nodes.length&&lit===objective.nodes.length)completeStage(st);
  } else if(st.type==='destroy'){
   const d=objective.device;
   objective.progress=d?clamp(1-d.hp/d.maxhp,0,1):0;
  } else if(st.type==='implant'){
   const grab=interactPressed();
   if(!objective.carried&&objective.source&&dist(player,objective.source)<rad&&grab){
    objective.carried=true;
    if(objective.sourceMesh)objective.sourceMesh.visible=false;
    syncObjectiveMarker();
    msg='SHARD ACQUIRED — REACH THE SOCKET';msgT=2.2;AudioSys.pickup();
   } else if(objective.carried&&dist(player,objective.pos)<rad&&grab){
    completeStage(st);
   }
   objective.progress=objective.carried?0.5:0;
  } else if(st.type==='defend'){
   const d=objective.device;
   if(d&&d.hp>0){
    objective.t+=dt;objective.progress=clamp(objective.t/st.dur,0,1);
    const waves=st.waves||[],wi=Math.ceil(objective.progress*waves.length);
    if(wi>objective.wave){objective.wave=wi;spawnWave(waves[wi-1]);}
    if(objective.t>=st.dur)completeStage(st);
   }
  }
 }
 directorPhaseCheck();
 let we=0;
 for(let i=0;i<enemies.length;i++){const e=enemies[i];
  if(e.dead&&e.deathT>1.3){
   if(e.mesh)actorG.remove(e.mesh);if(e.blob)actorG.remove(e.blob);continue;}
  enemies[we++]=e;}
 enemies.length=we;
 let wpt=0;
 for(let i=0;i<parts.length;i++){const p=parts[i];
  p.vx*=.94;p.vy*=.94;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
  if(p.life>0)parts[wpt++]=p;}
 parts.length=wpt;
 if(mp.active&&mp.host){mpUpdateAllRemotes(dt);mpSendSnapshot();}
 if(mp.active&&mp.mode==='pvp'&&mp.host && !mp._pvpEnding){
  const rem=mpGetRemotes();
  const hostAlive=!player.dead;
  if(mp.pvpMode==='team'){
   const aAlive=hostAlive || rem.some(r=>!r.dead && r.team==='A');
   const bAlive=rem.some(r=>!r.dead && r.team==='B');
   if(!aAlive&&bAlive){mp._pvpEnding=true;mpPvpRoundEnd('B');}
   else if(!bAlive&&aAlive){mp._pvpEnding=true;mpPvpRoundEnd('A');}
   else if(!aAlive&&!bAlive){mp._pvpEnding=true;mpPvpRoundEnd('A');}
  } else {
   const aliveRem=rem.filter(r=>!r.dead);
   if(hostAlive && aliveRem.length===0){mp._pvpEnding=true;mpPvpRoundEnd('host');}
   else if(!hostAlive && aliveRem.length<=1){
    // last remote alive wins, or draw -> host
    mp._pvpEnding=true;mpPvpRoundEnd('client');
   }
  }
 }
 if(player.hp<=0&&!player.dead){player.dead=true;if(!(mp.active&&mp.mode==='pvp'))state='DEAD';}
 const CLEAR_LEVEL=LEVELS[levelIdx];
 const clearBeforeExit=!!(CLEAR_LEVEL&&CLEAR_LEVEL.stages&&CLEAR_LEVEL.stages.some(s=>s.type==='boss'));
 const blockers=enemies.filter(e=>!e.dead&&
  !(e.type==='juggernaut'&&(e.duelResolved||e.ally))&&
  !(e.type==='boss'&&e.dirPhase===1));
if(!(mp.active&&mp.mode==='pvp')&&objective.done&&(!clearBeforeExit||blockers.length===0)){
  if((player.exitT=(player.exitT||0)+dt)>1.4)completeLevel();}
}
function hurtPlayer(d){if(player.dash||player.cloak>0||player.dead)return;
 if(!Number.isFinite(d)||d<=0)return;
 player.lastHit=time;
 const dmg=player.barrier>0?d*.5:d;
 if(player.sh>0){player.sh-=dmg;if(player.sh<0){player.hp+=player.sh;player.sh=0;}}else player.hp-=dmg;
 if(!Number.isFinite(player.hp))player.hp=0;
 if(!Number.isFinite(player.sh))player.sh=0;
 player.hitT=.2;
 if(time-(player.hurtSnd||0)>.08){
  player.hurtSnd=time;shake=Math.max(shake,6);flash=Math.max(flash,.5);
  AudioSys.hurt();burst(player.x,player.y,8,0xff5a4a);
 }
}
function moveEntity(e,dx,dy){
 if(!solidCircle(e.x+dx,e.y,e.r))e.x+=dx;
 if(!solidCircle(e.x,e.y+dy,e.r))e.y+=dy;
 // solid cover crates push actors out instead of being walked through
 for(const c of cover){if(c.hp<=0)continue;const rr=e.r+TILE/2-6,d=dist(e,c);
  if(d>1&&d<rr){const nx=(e.x-c.x)/d,ny=(e.y-c.y)/d;
   e.x=c.x+nx*rr;e.y=c.y+ny*rr;}}
 const L=LEVELS[levelIdx];e.x=clamp(e.x,e.r,L.w*TILE-e.r);e.y=clamp(e.y,e.r,L.h*TILE-e.r);}
function completeLevel(){
 AudioSys.win();
 if(levelIdx<LEVELS.length-1)initLevel(levelIdx+1);
 else{
  highscore=Math.max(highscore,player.kills);
  try{localStorage.setItem('gp_hi',highscore);}catch(e){}
  startEnding();
 }
}
function startEnding(){
 startCutscene('ending',STORY.ending(),'VICTORY');
 menuIdx=0;
}

/* ---------------- SYNC 3D ---------------- */
function sync3D(){
 const show=['PLAY','DIALOGUE','DEAD','PAUSE'].includes(state);
 worldG.visible=actorG.visible=fxG.visible=show;titleG.visible=!show;
 if(!show){
  camera.position.set(0,70,360);camera.lookAt(0,60,0);
  sun.position.set(-140,300,200);sun.target.position.set(0,0,0);sun.target.updateMatrixWorld();
  if(titleG.children.length===0){
   titleG.position.y=0;
   const rings=new THREE.Group();titleG.add(rings);titleG.userData.rings=rings;
   const ring=new THREE.Mesh(new THREE.TorusGeometry(120,2.5,8,64),
    new THREE.MeshBasicMaterial({color:0x63e6ff,transparent:true,opacity:.4}));
   ring.rotation.x=.35;rings.add(ring);
   const ring2=new THREE.Mesh(new THREE.TorusGeometry(88,1.5,8,48),
    new THREE.MeshBasicMaterial({color:0x2f7fa3,transparent:true,opacity:.55}));
   ring2.rotation.x=-.5;rings.add(ring2);
   for(let i=0;i<7;i++){
    const b=shape(CONE,5,20,5,i%2?0x1d5a78:0x2f88ad,0x0d3448);
    const a=i/7*TAU;
    b.position.set(Math.cos(a)*105,Math.sin(a*3)*18,Math.sin(a)*105);
    b.rotation.y=-a;rings.add(b);
   }
   const core=new THREE.Mesh(SPH,new THREE.MeshStandardMaterial({color:0x63e6ff,
    emissive:0x2a7fa0,emissiveIntensity:1.2,metalness:.6,roughness:.25}));
   core.scale.setScalar(30);rings.add(core);
   // Sequel menu hero: Randall stands behind the 2D glass buttons.
   const hero=armoredPersonModel();
   // The model's chest faces local +X, so turn it toward the menu camera on +Z.
   hero.position.set(0,-22,90);hero.scale.setScalar(2.5);hero.rotation.y=-Math.PI/2+.28;
   titleG.add(hero);titleG.userData.hero=hero;
  }
  const rings=titleG.userData.rings;
  if(rings){rings.rotation.y+=.003;rings.position.y=60+Math.sin(time*.8)*8;}
  return;
 }
 if(!player||!player.mesh)return;
 const pmv=Math.hypot(player.vx,player.vy)>12?1:0;
 const pbase=player.baseScale||(player.baseScale=player.mesh.scale.x);
 if(player.blob){player.blob.visible=!player.dead;player.blob.position.set(player.x,1.4,player.y);
  player.blob.scale.set(14*pbase,.35,12*pbase);}
 if(player.dead){
  player.deathT+=1/60;
  const t=clamp(player.deathT/.8,0,1);
  player.mesh.visible=true;player.mesh.rotation.z=t*1.4;
  player.mesh.position.set(player.x,-t*14,player.y);
  player.mesh.scale.setScalar(pbase*(1-t*.25));
 } else {
  const dashing=!!player.dash;
  player.mesh.visible=true;
  player.mesh.rotation.z=dashing?Math.sin(time*34)*.06:0;
  player.mesh.scale.set(pbase*(dashing?1.16:1),pbase*(dashing?.92:1),pbase*(dashing?.84:1));
  player.mesh.position.set(player.x,(pmv?Math.abs(Math.sin(player.walk))*2:0)+
   (dashing?Math.sin(time*26)*1.8:0),player.y);
  player.mesh.rotation.y=-player.ang+(dashing?Math.sin(time*20)*.09:0);
  animateModel(player.mesh,player,pmv);
  const pu=player.mesh.userData;
  const mt=player.melee>0?1-player.melee/MELEE_DUR:0;
  const wind=mt<.12?Math.sin(mt/.12*Math.PI/2):1;
  const snap=player.melee>0?(mt<.12?-.28*wind:Math.sin((mt-.12)/.88*Math.PI)):0;
  const punch=Math.max(0,snap),ma=player.meleeDir||player.ang||0;
  if(pu.hands&&pu.hands[1])pu.hands[1].position.set(1+38*punch,-9+4*punch,-1-6*punch);
  if(pu.rArm)pu.rArm.rotation.y=-.95*punch;
  if(pu.lArm)pu.lArm.rotation.y=.28*wind*(player.melee>0?1:0);
  if(player.melee>0)player.mesh.rotation.y+=.32*punch;
  if(player.melee>0&&punch>.86&&Math.random()<.45)addPart({x:player.x+Math.cos(ma)*12,
   y:player.y+Math.sin(ma)*12,vx:rnd(-30,30),vy:rnd(-30,30),life:rnd(.1,.22),c:0xbfe8ff,s:rnd(1.5,3.5)});
  if(pu.guns)for(const gun of pu.guns)gun.visible=gun===pu[player.weapon]&&player.melee<=0;
  if(player.hitT>0)player.mesh.position.y+=Math.sin(time*60)*1.5;
  if(dashing&&Math.random()<.9)addPart({x:player.x+rnd(-10,10),y:player.y+rnd(-10,10),
   vx:rnd(-40,40),vy:rnd(-40,40),life:rnd(.12,.32),c:0xbfe8ff,s:rnd(2,6)});
  if(player.cloak>0){
   const fade=clamp(player.cloak/.28,0,1)*clamp((CLOAK_DUR-player.cloak)/.2,0,1);
   const pulse=.5+.5*Math.sin(time*11);
   player.mesh.rotation.z=Math.sin(time*3.4)*.035;
   player.mesh.scale.setScalar(pbase*(1-.06*(player.cloak/CLOAK_DUR)+Math.sin(time*9)*.012));
   player.mesh.position.y+=Math.sin(time*5.5)*2.5;
   player.mesh.rotation.y-=Math.sin(time*2)*.12;
   player.mesh.traverse(o=>{
    if(!o.isMesh||!o.material||!o.__cloak)return;
    const m=o.material;
    m.opacity=(.09+.26*pulse)*fade;
    if(m.emissive&&m.emissive.setHex)m.emissive.setHex(0x2b9fd4);
    if(m.emissiveIntensity!==undefined)m.emissiveIntensity=1.2+1.1*pulse;
   });
   if(Math.random()<.55)addPart({x:player.x+rnd(-18,18),y:player.y+rnd(-18,18),
    vx:rnd(-25,25),vy:rnd(-35,35),life:rnd(.2,.5),c:0x8fe8ff,s:rnd(1,3)});
  }
  if(player.barrier>0){
   const fade=clamp(player.barrier/.4,0,1),pulse=.5+.5*Math.sin(time*8);
   if(player.barrierFx){
    const cage=player.barrierFx[0],nodeA=player.barrierFx[1],nodeB=player.barrierFx[2];
    cage.position.set(player.x,22,player.y);
    cage.scale.setScalar(38+2*pulse);
    cage.rotation.y=time*.35;cage.rotation.x=Math.sin(time*.7)*.22;
    BARRIER_SHELL_MAT.opacity=.18*fade;
    const a1=time*1.6,a2=-time*1.25+Math.PI;
    nodeA.position.set(player.x+Math.cos(a1)*34,32+Math.sin(time*4)*3,
     player.y+Math.sin(a1)*34);
    nodeB.position.set(player.x+Math.cos(a2)*34,12+Math.sin(time*4+1.4)*3,
     player.y+Math.sin(a2)*34);
    nodeA.scale.setScalar(5+1.5*pulse);nodeB.scale.setScalar(5+1.5*(1-pulse));
    nodeA.rotation.set(time*1.2,time*.8,0);
    nodeB.rotation.set(-time*.9,time*1.1,0);
    BARRIER_NODE_MAT.opacity=.62*fade;
   }
   if(Math.random()<.3)addPart({x:player.x+rnd(-26,26),y:player.y+rnd(-26,26),
    vx:rnd(-20,20),vy:rnd(-20,20),life:rnd(.25,.55),c:0x7fffa0,s:rnd(2,5)});
  }
 }
 if(objRing){objRing.visible=!objective.done;objRing.rotation.z+=.01;
  objRing.scale.setScalar(1+Math.sin(time*4)*.06);}
 if(objDiamond){objDiamond.visible=!objective.done;objDiamond.rotation.y+=.02;
  objDiamond.rotation.x+=.01;objDiamond.position.y=42+Math.sin(time*3)*5;}
 if(objBeam){objBeam.visible=!objective.done;objBeam.rotation.y+=.008;
  objBeam.material.opacity=.035+.018*Math.sin(time*3);}
 if(objLight){objLight.visible=!objective.done;objLight.intensity=9+4*Math.sin(time*5);}
 for(const n of objective.nodes||[])if(n.ring&&!n.lit){
  n.ring.rotation.z+=.015;n.ring.scale.setScalar(1+.1*Math.sin(time*4+n.x));}
 if(objective.device&&objective.device.core){
  const hp=objective.device.hp/objective.device.maxhp;
  objective.device.ring.rotation.z+=.012;
  objective.device.core.scale.setScalar(1+.12*Math.sin(time*5)*(2-hp));
  objective.device.core.material.emissiveIntensity=.7+1.1*(1-hp)+.2*Math.sin(time*7);}
 if(objective.sourceMesh&&objective.sourceMesh.visible)
  objective.sourceMesh.children[1].rotation.y+=.02;
 if(objective.socket)objective.socket.rotation.y+=.01;
 for(const p of spinProps)p.rotation.y+=.006;
 for(const d of doors){
  if(!d.unlocked||!d.panels)continue;
  d.openT=Math.min(1,d.openT+.026);
  for(const p of d.panels)p.mesh.position[p.axis]=p.sign*TILE*.23*(1+d.openT*1.5);
  if(d.group&&d.openT>=1)d.group.visible=false;
 }
 if(decorGeo&&decorArr){
  for(let i=0;i<decor.length;i++){
   decorArr[i*3+1]+=decorDrift*decor[i].v*.45;
   if(decorArr[i*3+1]>72)decorArr[i*3+1]=1;
   if(decorArr[i*3+1]<1)decorArr[i*3+1]=72;
  }
  decorGeo.attributes.position.needsUpdate=true;
 }
 for(const e of enemies){if(!e.mesh)continue;
  const base=e.baseScale||(e.baseScale=e.mesh.scale.x);
  if(e.blob){e.blob.visible=!e.dead;e.blob.position.set(e.x,1.4,e.y);
   e.blob.scale.set(14*base,.35,12*base);}
  if(e.dead){const t=clamp(e.deathT/.7,0,1);
   e.mesh.position.set(e.x,-t*16,e.y);e.mesh.rotation.z=t*1.45;
   e.mesh.scale.setScalar(base*(1-t*.25));continue;}
  const mv=Math.hypot(e.vx,e.vy)>12?1:0;
  e.mesh.position.set(e.x,(mv?Math.abs(Math.sin(e.walk))*2:0)+(e.type==='boss'?Math.sin(time*2)*2:0),e.y);
  e.mesh.rotation.y=-e.ang;e.mesh.scale.setScalar(base);
  animateModel(e.mesh,e,mv);
  const eu=e.mesh.userData;
  if(eu.hammer){
   if(e.hurricane>0){
    eu.hammer.rotation.z=time*22;eu.hammer.rotation.y=time*14;
   } else if(e.hammerWindup>0){
    const t=1-clamp(e.hammerWindup/.58,0,1);
    eu.hammer.rotation.z=-1.45+t*.25;eu.hammer.rotation.y=0;
   } else if(e.hammerRecover>0){
    const t=1-clamp(e.hammerRecover/.5,0,1);
    eu.hammer.rotation.z=-1.2+t*2.55;eu.hammer.rotation.y=0;
   } else {
    eu.hammer.rotation.z=Math.sin(time*2+e.x*.01)*.12;eu.hammer.rotation.y=0;
   }
   eu.hammer.scale.setScalar(e.hurricane>0?1.32:1.28);
  }
  if(e.stun>0)e.mesh.rotation.z=Math.sin(time*18)*.12;
  if(e.mesh.userData.core)e.mesh.userData.core.scale.setScalar(7+Math.sin(time*4)*1.2);
 }
 for(const b of bullets)if(b.mesh)b.mesh.position.set(b.x,22,b.y);
 for(const c of cover)if(c.mesh)c.mesh.visible=c.hp>0;
 for(const p of pickups)if(p.mesh){p.mesh.position.y=20+Math.sin(time*4+p.x)*4;p.mesh.rotation.y+=.02;}
 const n=Math.min(parts.length,MAXP);
 for(let i=0;i<n;i++){const p=parts[i];pp[i*3]=p.x;pp[i*3+1]=22+p.s;pp[i*3+2]=p.y;
  PART_COL.setHex(p.c);pc[i*3]=PART_COL.r;pc[i*3+1]=PART_COL.g;pc[i*3+2]=PART_COL.b;}
 pg.setDrawRange(0,n);pg.attributes.position.needsUpdate=true;pg.attributes.color.needsUpdate=true;
 animateMidCutscene();
}

function frameCinematicShot(points,camK){
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,maxH=0;
 for(const p of points){
  const x=p.x||0,z=p.y||0,h=p.h||0;
  if(x<minX)minX=x;if(x>maxX)maxX=x;
  if(z<minZ)minZ=z;if(z>maxZ)maxZ=z;
  if(h>maxH)maxH=h;
 }
 const tx=(minX+maxX)/2,tz=(minZ+maxZ)/2;
 const snap=Math.hypot(camFocus.x-tx,camFocus.y-tz)>260;
 camFocus.x=snap?tx:lerp(camFocus.x,tx,camK);
 camFocus.y=snap?tz:lerp(camFocus.y,tz,camK);
 const spanX=maxX-minX+120,spanZ=maxZ-minZ+120+maxH;
 const tan=Math.tan(camera.fov*Math.PI/360);
 const needD=Math.max(243,spanX*1.25/(2*tan*camera.aspect),spanZ*.75/(2*tan));
 cinematicCamDist=snap?clamp(needD,243,520):lerp(cinematicCamDist,clamp(needD,243,520),camK);
 camera.position.set(camFocus.x,cinematicCamDist*.80,camFocus.y+cinematicCamDist*.60);
 camera.lookAt(camFocus.x,clamp(20+maxH*.18,20,58),camFocus.y-8);
 if(shake>.2){camera.position.x+=rnd(-shake,shake)*.4;camera.position.y+=rnd(-shake,shake)*.2;}
}
function animateMidCutscene(){
 const d=dialogue;
 if(!d||!d.cutscene||d.cutsceneKind!=='mid')return;
 const jug=cinematicJug;
 const mode=d.cinematicMode||d.cutsceneKind;
 const camK=Math.min(1,cutDt*10);
 if(mode==='exit'){
  if(jug&&jug.mesh){
   if(d.i<7){
    jug.mesh.visible=true;
    if(jug.blob)jug.blob.visible=true;
   } else if(d.i===7&&cinematicExitFrom&&cinematicExitTo&&
    Math.hypot(cinematicExitTo.x-cinematicExitFrom.x,
     cinematicExitTo.y-cinematicExitFrom.y)>20){
    const t=clamp(cutLineT/1.35,0,1),ease=t*t*(3-2*t);
    const jx=lerp(cinematicExitFrom.x,cinematicExitTo.x,ease);
    const jy=lerp(cinematicExitFrom.y,cinematicExitTo.y,ease);
    jug.mesh.visible=true;
    jug.mesh.position.set(jx,Math.sin(t*Math.PI)*155,jy);
    jug.mesh.rotation.z=-Math.sin(t*Math.PI)*.22;
    if(jug.blob)jug.blob.visible=false;
    jug.x=jx;jug.y=jy;
    if(t>=1&&!cinematicExited){
     cinematicExited=true;shake=Math.max(shake,10);
     burst(jx,jy,18,0x9fd8ff,1.1);
    }
   } else {
    jug.mesh.visible=false;
    if(jug.blob)jug.blob.visible=false;
   }
  }
  if(jug){
   const px=player?player.x:jug.x,py=player?player.y:jug.y;
   frameCinematicShot([{x:px,y:py,h:0},{x:jug.x,y:jug.y,h:jug.mesh.position.y||0}],camK);
  }
  return;
 }
 if(jug&&jug.mesh){
  if(d.i<2){
   jug.mesh.visible=false;if(jug.blob)jug.blob.visible=false;
  } else if(d.i===2){
   const drop=clamp(cutLineT/.75,0,1),ease=1-Math.pow(1-drop,3);
   jug.mesh.visible=true;
   jug.mesh.position.set(jug.x,(1-ease)*190,jug.y);
   if(jug.blob){jug.blob.visible=true;jug.blob.position.set(jug.x,1.4,jug.y);}
   if(drop>=1&&!cinematicLanded){
    cinematicLanded=true;shake=Math.max(shake,16);flash=Math.max(flash,.24);
    burst(jug.x,jug.y,42,0x9fd8ff,2.2);addBlastLight(jug.x,jug.y,0x9fd8ff,150,320,.4);
    AudioSys.boss();AudioSys.hit();
   }
  } else {
   jug.mesh.visible=true;
   jug.mesh.position.set(jug.x,0,jug.y);
   if(jug.blob){jug.blob.visible=true;jug.blob.position.set(jug.x,1.4,jug.y);}
  }
 }
 if(d.i===3){
  for(let k=0;k<cinematicCrowd.length;k++){
   const e=cinematicCrowd[k];if(!e.mesh)continue;
   const hitAt=.16+k*.3;
   if(!e.cinematicHit&&cutLineT>=hitAt){
    e.cinematicHit=true;e.hitT=.3;
    burst(e.x,e.y,22,0x9fd8ff,1.6);addBlastLight(e.x,e.y,0x9fd8ff,100,200,.22);
    AudioSys.hit();shake=Math.max(shake,6);
   }
   if(e.cinematicHit){
    const t=clamp((cutLineT-hitAt)/.38,0,1);
    e.mesh.rotation.z=t*1.5;e.mesh.position.set(e.x,-t*24,e.y);
    e.mesh.visible=t<.94;if(e.blob)e.blob.visible=false;
    if(t>=1)e.dead=true;
   }
  }
 } else if(d.i>3){
  for(const e of cinematicCrowd){
   if(e.mesh)e.mesh.visible=false;
   if(e.blob)e.blob.visible=false;
  }
 }
 if(d.i===3&&cinematicThrowFrom&&cinematicCorner){
  const t=clamp(cutLineT/.5,0,1),ease=1-Math.pow(1-t,3);
  player.x=lerp(cinematicThrowFrom.x,cinematicCorner.x,ease);
  player.y=lerp(cinematicThrowFrom.y,cinematicCorner.y,ease);
  if(player.mesh){player.mesh.position.set(player.x,Math.sin(t*Math.PI)*92,player.y);
   player.mesh.rotation.z=Math.sin(t*Math.PI*2)*.22;}
  if(t>=1&&!cinematicThrown){
   cinematicThrown=true;burst(player.x,player.y,18,0xbfe8ff,1.2);shake=Math.max(shake,8);
  }
 }
 if(jug){
  const px=player?player.x:jug.x,py=player?player.y:jug.y;
  const nearPlayer=Math.hypot(px-jug.x,py-jug.y)<430;
  const ax=nearPlayer?px:jug.x-90,ay=nearPlayer?py:jug.y-70;
  const pts=[{x:ax,y:ay,h:0},{x:jug.x,y:jug.y,h:jug.mesh.position.y||0}];
  if(d.i===3&&cinematicCorner)pts.push({x:cinematicCorner.x,y:cinematicCorner.y,h:0});
  if(d.i===3&&nearPlayer&&player&&player.mesh)pts.push({x:player.x,y:player.y,h:player.mesh.position.y||0});
  frameCinematicShot(pts,camK);
 }
}

/* ---------------- I18N ---------------- */
const LANGS=['en','fa'];
let lang = (function(){ try{ return localStorage.getItem('gp_lang')==='fa'?'fa':'en'; }catch(e){ return 'en'; } })();
function setLang(l){ lang=LANGS.includes(l)?l:'en'; try{localStorage.setItem('gp_lang',lang);}catch(e){} }
function toggleLang(){ setLang(lang==='fa'?'en':'fa'); }
function isRTL(){ return lang==='fa'; }
function uiFont(size,weight){
  const w=weight?weight+' ':'';
  // Persian fallback stack; Eurostile may not have Arabic glyphs
  return w+size+'px Eurostile, "Noto Naskh Arabic", "Noto Sans Arabic", "IRANSans", Tahoma, Arial, sans-serif';
}
const I18N={
 en:{
  deploy:'DEPLOY', deploySub:'Begin the Sur’Kesh operation',
  lan:'LAN MULTIPLAYER', lanSub:'Host or join a Wi-Fi co-op round',
  how:'Info', howSub:'About and how to play', infoTitle:'Info',
   helpSub:'Controls, abilities, objectives',
   infoHint:'TAP / ENTER TO OPEN  •  ESC TO RETURN',
  about:'ABOUT', aboutSub:'Credits and fan-made notice',
  langBtn:'LANGUAGE: EN', langSub:'Switch to Persian / فارسی',
  settings:'SETTINGS', settingsSub:'Language and audio levels',
  musicVol:'MUSIC VOLUME', sfxVol:'SOUND EFFECTS',
  back:'BACK', backSub:'Return to previous menu',
  settingsHint:'Tap or drag a bar to adjust',
  controllerBtn:'CONTROLLER MAP', controllerSub:'Rebind buttons and sticks',
  controllerTitle:'CONTROLLER MAPPING', controllerHint:'Select an action, then press a button or move a stick to bind it',
  controllerScroll:'Drag / scroll to see every action',
  controllerReset:'RESET DEFAULTS', controllerResetSub:'Restore standard gamepad layout',
  controllerCapture:'WAITING FOR INPUT...', controllerPage:'PAGE',
  briefOp:'OPERATION', objective:'OBJECTIVE: ', begin:'PRESS ENTER / TAP TO BEGIN',
  howTitle:'How to play', tapReturn:'TAP / ENTER TO RETURN',
  paused:'PAUSED', resume:'RESUME', restart:'RESTART MISSION', mainMenu:'MAIN MENU',
  signalLost:'SIGNAL LOST', down:'Randall Ezno is down. The intel dies with him.',
  retry:'RETRY MISSION', retrySub:'Reinsert at the last objective', abort:'ABORT TO TITLE', abortSub:'End the operation',
  missionComplete:'MISSION COMPLETE', totalKills:'TOTAL KILLS  ', best:'BEST  ',
  watchEpilogue:'WATCH EPILOGUE', watchSub:'Replay the final transmission', playAgain:'PLAY AGAIN', playSub:'Start a fresh campaign',
  mainMenuSub:'Return to the command deck',
  mpTitle:'MULTIPLAYER', mpChoose:'Choose a category',
  coop:'CO-OP STORY', coopSub:'2 players only: 1 host + 1 client',
  pvp:'PVP SURVIVAL', pvpSub:'Up to 8 players. Fight other players',
  back:'BACK', backTitle:'Return to title', backMp:'Back to multiplayer categories',
  hostCoop:'HOST CO-OP', hostCoopSub:'Create hotspot and host story co-op',
  joinCoop:'JOIN CO-OP', joinCoopSub:'Join host hotspot and play co-op',
  hostPvp:'HOST PVP', hostPvpSub:'Create hotspot and host PvP',
  joinPvp:'JOIN PVP', joinPvpSub:'Join host hotspot and enter PvP',
  ffa:'FREE-FOR-ALL', ffaSub:'Every player fights for themselves',
  team:'TEAM A VS TEAM B', teamSub:'Players split into two teams',
  pvpModeTitle:'PVP SURVIVAL', pvpModeSub:'Up to 8 players. Choose match type',
  pvpJoinSub:'Up to 8 players (host star topology).',
  loadout:'LOADOUT', loadoutSub:'Pick 1 weapon and 1 ability (limited uses per round).',
  weapon:'WEAPON', abilityUse:'ABILITY (LIMITED USE)',
  ready:'READY', waitingPeer:'Waiting for peer...', waitingHost:'Waiting for host...',
  cancel:'CANCEL', cancelSub:'Disconnect and return',
  openHotspot:'OPEN HOTSPOT SETTINGS', openWifi:'OPEN WI-FI SETTINGS',
  openHotspotSub:'Enable hotspot, then share your offer', openWifiSub:'Join the host hotspot/Wi-Fi network',
  applyPaste:'APPLY / PASTE', applyPasteSub:'Paste peer signal from clipboard/prompt',
  proceedLoadout:'PROCEED TO LOADOUT', proceedLoadoutSub:'Start loadout (more players can still join)',
  critical:'CRITICAL', ammo:'AMMO ', hp:'HP', sh:'SH',
  victory:'THE PROMISE KEPT',
  aboutTitle:'About',
   githubTitle:'OPEN PROJECT GITHUB', githubHint:'Choose a repository to open',
   githubBack:'BACK TO TITLE', githubBackSub:'Return to the main menu',
   githubInfiltratorTitle:'Mass Effect: Infiltrator.', githubInfiltratorSub:'Resurrection project repository',
   githubGhostTitle:'Mass Effect: Ghost Protocol.', githubGhostSub:'Fan-made sequel repository',
  aboutBody:'MASS EFFECT: GHOST PROTOCOL is a fan-made tribute inspired by the Mass Effect universe. It is not affiliated with, endorsed by, or connected to BioWare or Electronic Arts. All original Mass Effect characters, names, and settings belong to their respective owners.',
  yourSignal:'Your signal (copy/share):', peerSignal:'Peer signal (paste):',
  noneYet:'(none yet)', tapPaste:'(tap APPLY to paste)',
  hostInstr:'Host: hotspot on -> copy offer -> peer joins -> paste answer.',
  joinInstr:'Join: connect to host hotspot -> paste offer -> copy answer to host.',
  players:'Players: ', uses:'USES', readyWaiting:'READY — WAITING...', readyStart:'READY / START ROUND',
  hostWord:'HOST', joinWord:'JOIN', pvpSurvival:'PVP SURVIVAL', coopStory:'CO-OP STORY',
  reloading:'RELOADING', equipped:' EQUIPPED', loadoutLocked:'LOADOUT LOCKED',
 biotic:'BIOTIC', bioticActive:'ACTIVE', bioticCooldown:'BIOTIC COOLDOWN',
 bossEncounter:'BOSS ENCOUNTER', miniBossEncounter:'MINI-BOSS ENCOUNTER',
  pvpBackSel:'Back to PvP mode select', tapReturnAbout:'TAP / ENTER TO RETURN',
  aboutText:'A fan-made 3D continuation of Mass Effect Infiltrator. Randall Ezno returns after Sur’Kesh to face what Cerberus rebuilt from Inali Renata. Original procedural models and synthesized audio. No EA assets are used.',
  helpLines:[
   'MOVE — WASD / arrows, or drag left side of screen',
   'AIM & FIRE — mouse, or drag inside the FIRE ring (bottom right)',
   'RIGHT SIDE — drag outside the ring to turn aim without firing',
   '1 / 2 — switch weapons (tap arrows / swipe top-right panel)',
   'WEAPONS — tap top-right weapon box to reload. Tap ◈ to grab / implant shards.',
   'Q / LEFT SLOT — cast Cloak, or Barrier once unlocked. Tap ‹ › to switch.',
   'E / RIGHT SLOT — cast Well or Dash. Tap ‹ › or use [ / ] to switch.',
   'BIOTIC BUTTON — swipe onto a power and release to cast. All biotics share one cooldown; no two can run at once.',
   'UNLOCKS — WELL after first objective, DASH after mission 2, BARRIER after mission 3.',
   'BARRIER — 50% damage reduction and 25% more shields while active.',
   'MELEE — appears at point-blank range. Tap for a biotic punch.',
   'CONTROLLER — connect a standard gamepad; remap buttons in SETTINGS > CONTROLLER MAP.',
   'OBJECTIVES — shoot nodes, break cores, or survive defense timers.',
   'Cover blocks enemy fire and your own shots.'
  ]
 },
 fa:{
  deploy:'اعزام', deploySub:'آغاز عملیات در سورکش',
  lan:'چندنفره LAN', lanSub:'میزبانی یا پیوستن به بازی وای‌فای',
  how:'اطلاعات', howSub:'درباره و راهنمای بازی', infoTitle:'اطلاعات',
   helpSub:'کنترل‌ها، توانایی‌ها، اهداف',
   infoHint:'برای باز کردن لمس کنید / ENTER  •  برای بازگشت ESC',
  about:'درباره', aboutSub:'سازندگان و اطلاعیه طرفداران',
  langBtn:'زبان: فارسی', langSub:'تغییر به English',
  settings:'تنظیمات', settingsSub:'زبان و میزان صدا',
  musicVol:'موسیقی', sfxVol:'جلوه‌های صوتی',
  back:'بازگشت', backSub:'بازگشت به منوی پیشین',
  settingsHint:'روی نوار بزنید یا بکشید تا تنظیم شود',
  controllerBtn:'نقشه کنترلر', controllerSub:'تغییر دکمه‌ها و محورها',
  controllerTitle:'تنظیم کنترلر', controllerHint:'یک عمل را انتخاب کنید، سپس دکمه بزنید یا محور را حرکت دهید',
  controllerScroll:'برای دیدن تمام عمل‌ها بکشید یا پیمایش کنید',
  controllerReset:'بازنشانی پیشفرض', controllerResetSub:'بازگرداندن چیدمان استاندارد',
  controllerCapture:'در انتظار ورودی...', controllerPage:'صفحه',
  briefOp:'عملیات', objective:'هدف: ', begin:'ENTER / لمس برای شروع',
  howTitle:'راهنمای بازی', tapReturn:'برای بازگشت لمس کنید / ENTER',
  paused:'توقف', resume:'ادامه', restart:'شروع دوباره مأموریت', mainMenu:'منوی اصلی',
  signalLost:'سیگنال قطع شد', down:'رندال ازنو سقوط کرد. اطلاعات با او از دست رفت.',
  retry:'تلاش دوباره', retrySub:'بازگشت به آخرین هدف', abort:'خروج به عنوان', abortSub:'پایان عملیات',
  missionComplete:'مأموریت کامل شد', totalKills:'کشته‌ها  ', best:'بهترین  ',
  watchEpilogue:'نمایش پایان', watchSub:'پخش دوباره پیام پایانی', playAgain:'بازی دوباره', playSub:'شروع کمپین جدید',
  mainMenuSub:'بازگشت به اتاق فرمان',
  mpTitle:'چندنفره', mpChoose:'یک دسته را انتخاب کنید',
  coop:'همکاری داستانی', coopSub:'فقط ۲ بازیکن: ۱ میزبان + ۱ مهمان',
  pvp:'نبرد PVP', pvpSub:'تا ۸ بازیکن. مبارزه با دیگران',
  back:'بازگشت', backTitle:'بازگشت به عنوان', backMp:'بازگشت به دسته‌های چندنفره',
  hostCoop:'میزبانی همکاری', hostCoopSub:'ساخت هات‌اسپات و میزبانی داستان',
  joinCoop:'پیوستن همکاری', joinCoopSub:'پیوستن به هات‌اسپات میزبان',
  hostPvp:'میزبانی PVP', hostPvpSub:'ساخت هات‌اسپات و میزبانی PVP',
  joinPvp:'پیوستن PVP', joinPvpSub:'پیوستن به هات‌اسپات میزبان',
  ffa:'هرکس برای خودش', ffaSub:'همه با هم مبارزه می‌کنند',
  team:'تیم A مقابل تیم B', teamSub:'بازیکنان به دو تیم تقسیم می‌شوند',
  pvpModeTitle:'نبرد PVP', pvpModeSub:'تا ۸ بازیکن. نوع مسابقه را انتخاب کنید',
  pvpJoinSub:'تا ۸ بازیکن (توپولوژی ستاره‌ای میزبان).',
  loadout:'تجهیزات', loadoutSub:'۱ سلاح و ۱ توانایی (استفاده محدود) انتخاب کنید.',
  weapon:'سلاح', abilityUse:'توانایی (استفاده محدود)',
  ready:'آماده', waitingPeer:'در انتظار هم‌تیمی...', waitingHost:'در انتظار میزبان...',
  cancel:'لغو', cancelSub:'قطع اتصال و بازگشت',
  openHotspot:'تنظیمات هات‌اسپات', openWifi:'تنظیمات وای‌فای',
  openHotspotSub:'هات‌اسپات را روشن کنید و پیشنهاد را بفرستید', openWifiSub:'به هات‌اسپات/وای‌فای میزبان بپیوندید',
  applyPaste:'اعمال / چسباندن', applyPasteSub:'چسباندن سیگنال هم‌تیمی از کلیپ‌بورد',
  proceedLoadout:'رفتن به تجهیزات', proceedLoadoutSub:'شروع تجهیزات (بازیکنان بیشتر می‌توانند بپیوندند)',
  critical:'بحرانی', ammo:'مهمات ', hp:'جان', sh:'سپر',
  victory:'وعده وفا شد',
  aboutTitle:'درباره',
   githubTitle:'باز کردن گیت\u200cهاب پروژه', githubHint:'مخزنی را برای باز کردن انتخاب کنید',
   githubBack:'بازگشت به عنوان', githubBackSub:'بازگشت به منوی اصلی',
   githubInfiltratorTitle:'Mass Effect: Infiltrator.', githubInfiltratorSub:'مخزن پروژه رستورکشن',
   githubGhostTitle:'Mass Effect: Ghost Protocol.', githubGhostSub:'مخزن دنباله طرفداران',
  aboutBody:'MASS EFFECT: GHOST PROTOCOL یک ادای احترام طرفداران به دنیای Mass Effect است. این بازی وابسته، تأییدشده یا مرتبط با BioWare یا Electronic Arts نیست. همه شخصیت‌ها، نام‌ها و تنظیمات اصلی Mass Effect متعلق به صاحبان مربوطه هستند.',
  yourSignal:'سیگنال شما (کپی/اشتراک):', peerSignal:'سیگنال هم‌تیمی (چسباندن):',
  noneYet:'(هنوز نیست)', tapPaste:'(برای چسباندن APPLY را بزنید)',
  hostInstr:'میزبان: هات‌اسپات روشن -> کپی پیشنهاد -> پیوستن هم‌تیمی -> چسباندن پاسخ.',
  joinInstr:'مهمان: اتصال به هات‌اسپات -> چسباندن پیشنهاد -> کپی پاسخ برای میزبان.',
  players:'بازیکنان: ', uses:'بار', readyWaiting:'آماده — در انتظار...', readyStart:'آماده / شروع راند',
  hostWord:'میزبان', joinWord:'مهمان', pvpSurvival:'نبرد PVP', coopStory:'داستان همکاری',
  reloading:'خشاب‌گذاری', equipped:' مجهز شد', loadoutLocked:'تجهیزات قفل است',
 biotic:'بیوتیک', bioticActive:'فعال', bioticCooldown:'تاخیر بیوتیک',
 bossEncounter:'نبرد رئیس', miniBossEncounter:'نبرد رئیس فرعی',
  pvpBackSel:'بازگشت به انتخاب حالت PVP', tapReturnAbout:'برای بازگشت لمس کنید / ENTER',
  aboutText:'ادامه سه‌بعدی طرفداران برای Mass Effect Infiltrator. رندال ازنو پس از سورکش بازمی‌گردد تا با آنچه سربروس از اینالی رناتا بازسازی کرده روبه‌رو شود. مدل‌ها و صداها به‌صورت procedural ساخته شده‌اند. از دارایی‌های EA استفاده نشده است.',
  helpLines:[
   'حرکت — WASD / کلیدهای جهت، یا کشیدن سمت چپ صفحه',
   'نشانه و شلیک — ماوس، یا کشیدن داخل حلقه FIRE (پایین راست)',
   'سمت راست — بیرون حلقه بکشید تا بدون شلیک نشانه بگیرید',
   '۱ / ۲ — تعویض سلاح (فلش‌ها / کشیدن پنل بالا راست)',
   'سلاح‌ها — برای خشاب‌گذاری روی جعبه سلاح بزنید. برای برداشتن/جاگذاری قطعات ◈ را بزنید.',
   'Q / اسلات چپ — نامرئی یا سپر (پس از باز شدن). با ‹ › تعویض کنید.',
   'E / اسلات راست — چاه بیوتیک یا دش. با ‹ › یا [ / ] تعویض کنید.',
   'دکمه بیوتیک — روی یک توانایی بکشید و رها کنید تا اجرا شود. همه بیوتیکها یک تاخیر مشترک دارند و همزمان اجرا نمیشوند.',
   'باز شدن‌ها — WELL بعد از هدف اول، DASH بعد از مأموریت ۲، BARRIER بعد از مأموریت ۳.',
   'BARRIER — در حالت فعال ۵۰٪ آسیب کمتر و سپر ۲۵٪ قوی‌تر.',
   'مشتی — وقتی دشمن در تماس است ظاهر میشود. برای مشت بیوتیک بزنید.',
   'کنترلر — یک گیمپد استاندارد وصل کنید و دکمه‌ها را در تنظیمات > نقشه کنترلر تغییر دهید.',
   'اهداف — گره‌ها را بزنید، هسته‌ها را بشکنید، یا تایمر دفاع را بگذرانید.',
   'سنگر جلوی شلیک دشمن و شلیک خودتان را می‌گیرد.'
  ]
 }
};
function T(k){ return (I18N[lang]&&I18N[lang][k]) || I18N.en[k] || k; }
const FA_TEXT={
  "01 · SUR’KESH REBUILD":"۰۱ · بازسازی سورکش",
  "CERBERUS BLACK SITE — INFILTRATION":"پایگاه سیاه سربروس — نفوذ",
  "The facility you burned on Sur’Kesh has been rebuilt. A ghost signal is broadcasting Inali Renata’s voice from its data core. The Alliance sends you back — with a Volus defector in your ear — to seize the experiments before Cerberus moves them.":"تأسیساتی که در سورکش سوزاندی دوباره ساخته شده. یک سیگنال شبح، صدای اینالی رناتا را از هسته داده پخش می‌کند. اتحاد تو را با یک ولوس جداشده در گوش بازمی‌گرداند تا پیش از جابه‌جایی آزمایش‌ها توسط سربروس، آنها را تصاحب کنی.",
  "BYPASS BAY SECURITY":"دور زدن امنیت اسکله",
  "DESTROY THE VAULT CIPHER":"نابودی رمز گاوصندوق",
  "IMPLANT THE INALI SHARD":"جاگذاری قطعه اینالی",
  "DEFEND THE LANDING BAY":"دفاع از اسکله فرود",
  "SECURITY NODES LINKED — VAULT UNSEALED":"گره‌های امنیتی وصل شد — گاوصندوق باز شد",
  "CIPHER DESTROYED — DATA CORE OPEN":"رمز نابود شد — هسته داده باز است",
  "SHARD IMPLANTED — INTEL SECURED":"قطعه جاگذاری شد — اطلاعات امن شد",
  "EXTRACTION CALLED":"درخواست تخلیه ارسال شد",
  "02 · ALLIANCE COMM RELAY":"۰۲ · رله ارتباطی اتحاد",
  "UPLINK STATION — TRANSMIT THE TRUTH":"ایستگاه ارتباط — ارسال حقیقت",
  "The data proves Cerberus rebuilt Overlord with Inali’s mind as its core. Deliver it to the Alliance and the Illusive Man loses his greatest weapon. UDI has turned the relay’s own security against you.":"داده‌ها ثابت می‌کند سربروس Overlord را با ذهن اینالی به عنوان هسته بازسازی کرده. آن را به اتحاد برسان تا مرد وهم‌آلود بزرگ‌ترین سلاحش را از دست بدهد. UDI امنیت خود رله را علیه تو برگردانده است.",
  "OVERRIDE ACCESS PANEL":"دستکاری پنل دسترسی",
  "SHATTER THE UDI JAMMER":"شکستن اخلالگر UDI",
  "IMPLANT THE RELAY KEY":"جاگذاری کلید رله",
  "DEFEND THE COMMS LOCK":"دفاع از قفل ارتباطات",
  "ACCESS NODES LINKED — CORRIDOR OPEN":"گره‌های دسترسی وصل شد — راهرو باز شد",
  "JAMMER DESTROYED — UPLINK OPEN":"اخلالگر نابود شد — لینک باز است",
  "RELAY KEY SEATED — UPLOAD BEGINNING":"کلید رله قرار گرفت — بارگذاری آغاز شد",
  "CHANNEL SECURED":"کانال امن شد",
  "03 · DESERT REDOUBT":"۰۳ · دژ بیابانی",
  "CERBERUS STRONGHOLD — CONFRONT THE DIRECTOR":"دژ سربروس — رویارویی با مدیر",
  "The Director has taken the reconstructed Inali to a desert redoubt. She is no longer the woman Randall knew — she is his controllable biotic soldier, built to break targets like Ezno. Bring her in, or watch her be unmade again.":"مدیر، اینالی بازسازی‌شده را به دژ بیابانی برده. او دیگر زنی نیست که رندال می‌شناخت — او سرباز بیوتیک قابل کنترل اوست، ساخته‌شده برای شکستن اهدافی مثل ازنو. او را برگردان، یا ببین دوباره نابودش می‌کنند.",
  "BREAK THE PERIMETER GENERATOR":"نابودی ژنراتور محیطی",
  "WAKE THE DIRECTOR":"بیدار کردن مدیر",
  "DESTROY THE DIRECTOR":"نابودی مدیر",
  "GENERATOR DESTROYED — SHIELD DOWN":"ژنراتور نابود شد — سپر سقوط کرد",
  "CORE NODES LINKED — THE DIRECTOR WAKES":"گره‌های هسته وصل شد — مدیر بیدار می‌شود",
  "THE DIRECTOR IS DOWN":"مدیر سقوط کرد",
  "PVP · SURVIVAL ARENA":"PVP · میدان بقا",
  "TWO-PLAYER COMBAT SIM":"شبیه‌ساز نبرد دو نفره",
  "Two operatives. One arena. No story, no mercy.":"دو عامل. یک میدان. بدون داستان، بدون رحم.",
  "ELIMINATE THE OTHER OPERATIVE":"عامل دیگر را حذف کن",
  "PVP SURVIVAL":"بقای PVP",
  "ROUND OVER":"راند تمام شد",
  "SYSTEM":"سیستم",
  "Randall Ezno. Officially, you died at Sur’Kesh. Three cycles ago, a relay began transmitting in Lieutenant Inali Renata’s voice.":"رندال ازنو. رسماً تو در سورکش مردی. سه چرخه پیش، یک رله شروع به پخش با صدای ستوان اینالی رناتا کرد.",
  "I lowered the gun. Cerberus took her anyway. Now her voice is coming out of a data core.":"اسلحه را پایین آوردم. سربروس با این حال او را برد. حالا صدایش از یک هسته داده بیرون می‌آید.",
  "Then move. Bypass the bay security, clear the vault, pull the data from the core, and get back here.":"پس حرکت کن. امنیت اسکله را دور بزن، گاوصندوق را پاک کن، داده را از هسته بکش بیرون و برگرد اینجا.",
  "Security is ours until UDI wakes up. Override the access panel, then bring relay control online.":"تا وقتی UDI بیدار نشده امنیت دست ماست. پنل دسترسی را دستکاری کن، بعد کنترل رله را آنلاین کن.",
  "Once the truth is out, he will burn every facility to erase the proof.":"وقتی حقیقت بیرون بیاید، او هر تأسیساتی را می‌سوزاند تا مدرک را پاک کند.",
  "You spared her once. I corrected that mistake. Come and see what I rebuilt from her.":"یک بار او را بخشیدی. من آن اشتباه را تصحیح کردم. بیا ببین از او چه ساخته‌ام.",
  "Fitting that you return to my workshop. She remembers your pulse — I taught her to hunt it.":"مناسب است که به کارگاه من برمی‌گردی. او ضربان تو را به یاد دارد — به او یاد دادم شکارش کند.",
  "Target acquired. I can take him down before the others breach. ...Randall, I still remember the taste of rain on Sur’Kesh. I would trade that memory for one minute where my hands obey me. Do not make me ask twice. I need a way out of this body, not your pity.":"هدف شناسایی شد. می‌توانم قبل از نفوذ بقیه او را بندازم. ...رندال، هنوز طعم باران روی سورکش را یادم است. آن خاطره را با یک دقیقه که دست‌هایم از من اطاعت کنند عوض می‌کنم. دو بار مجبورم نکن. از این بدن راه خروج می‌خواهم، نه ترحم تو.",
  "The woman I knew is buried under your work. I will dig her out or put the thing down.":"زنی که می‌شناختم زیر کار تو دفن شده. یا او را بیرون می‌کشم یا این چیز را از پا درمی‌آورم.",
  "Then come. Let her argue with herself while you die.":"پس بیا. بگذار در حالی که می‌میری با خودش بحث کند.",
  "Before we breach: how do we handle a signal that may be Lieutenant Renata?":"قبل از نفوذ: با سیگنالی که شاید ستوان رناتا باشد چه کنیم؟",
  "Trust the signal. Bring her home.":"به سیگنال اعتماد کن. او را به خانه برگردان.",
  "It is a trap. Burn the voice.":"تله است. صدا را بسوزان.",
  "If she is still in there, she deserves a way out. We take the core intact.":"اگر هنوز آنجاست، حق راه خروج دارد. هسته را سالم می‌بریم.",
  "Then I will route extra shielding to your suit. Try not to make me regret it.":"پس سپر اضافی به زره‌ات می‌فرستم. سعی کن پشیمانم نکنی.",
  "Whatever answers, I put it down. Inali died in that lab.":"هرچه جواب می‌دهد از پا درمی‌آورم. اینالی در آن آزمایشگاه مرد.",
  "Blunt. Efficient. Cerberus will expect that from you.":"بی‌پرده. کارآمد. سربروس همین را از تو انتظار دارد.",
  "Your faith in her bought us a clean uplink. The relay still answers to Inali’s cipher.":"اعتمادت به او یک لینک تمیز برایمان خرید. رله هنوز به رمز اینالی جواب می‌دهد.",
  "You cut the voice off. The Core is unstable — expect UDI to throw everything at us.":"صدا را قطع کردی. هسته ناپایدار است — انتظار داشته باش UDI همه چیز را سمت ما بفرستد.",
  "You can still walk away, Ezno. Hand me the data and my soldier stays intact.":"هنوز می‌توانی بروی، ازنو. داده را بده به من و سربازم سالم می‌ماند.",
  "Broadcast everything. Let the Alliance decide.":"همه چیز را پخش کن. بگذار اتحاد تصمیم بگیرد.",
  "Use the data as leverage. You answer to me now.":"از داده به عنوان اهرم استفاده کن. حالا تو جواب من را می‌دهی.",
  "The truth goes out. All of it. If that burns you, good.":"حقیقت منتشر می‌شود. همه‌اش. اگر تو را بسوزاند، خوب است.",
  "Then I will erase every witness before the signal leaves this station.":"پس قبل از خروج سیگنال از این ایستگاه هر شاهدی را پاک می‌کنم.",
  "I am not your courier. I am the price you pay.":"پیک تو نیستم. بهایی هستم که می‌پردازی.",
  "Crueler than I taught you. Excellent.":"بی‌رحم‌تر از چیزی که یادت دادم. عالی.",
  "You published her confession. The Alliance is watching this redoubt as we speak.":"اعتراف او را منتشر کردی. همین الآن اتحاد این دژ را زیر نظر دارد.",
  "You turned Inali’s mind into a weapon. Tell me, Ezno — which of us is the monster now?":"ذهن اینالی را به سلاح تبدیل کردی. بگو ازنو — حالا کدام یک از ما هیولاست؟",
  "One last courtesy. What becomes of the soldier I made?":"یک لطف آخر. سربازی که ساختم چه می‌شود؟",
  "Save what can be saved. Purge the rest.":"آنچه را می‌شود نجات داد، نجات بده. بقیه را پاک کن.",
  "Destroy the core. Nothing of hers survives.":"هسته را نابود کن. چیزی از او باقی نماند.",
  "Her mind is not yours to own. I will cut the leash, not the woman.":"ذهن او مال تو نیست. زنجیر را می‌برم، نه خود زن را.",
  "Sentiment. It always was your weakness.":"احساسات. همیشه نقطه ضعف تو بود.",
  "If she cannot be free, she does not get used. Not by you. Not by anyone.":"اگر نمی‌تواند آزاد باشد، استفاده نمی‌شود. نه توسط تو. نه توسط هیچکس.",
  "Then come and take her from me.":"پس بیا و او را از من بگیر.",
  "Relay control is ours. The Director just opened a private channel — she is speaking to you.":"کنترل رله دست ماست. مدیر همین الان یک کانال خصوصی باز کرد — دارد با تو حرف می‌زند.",
  "Ezno. The Alliance will bury this report to protect its own. Give me the core and I give you Inali.":"ازنو. اتحاد این گزارش را برای محافظت از خودش دفن می‌کند. هسته را بده به من و اینالی را به تو می‌دهم.",
  "The Director is buying time. Your call.":"مدیر وقت می‌خرد. تصمیم با توست.",
  "Reject the deal. The truth goes out.":"معامله را رد کن. حقیقت منتشر می‌شود.",
  "String her along. Take the core and the leverage.":"سرش گرم کن. هسته و اهرم را بگیر.",
  "Then I will stop your upload personally.":"پس شخصاً بارگذاری تو را متوقف می‌کنم.",
  "Upload window widened. Move.":"پنجره بارگذاری بازتر شد. حرکت کن.",
  "I will take the core. Then I decide what it is worth.":"هسته را می‌گیرم. بعد خودم تصمیم می‌گیرم چه ارزشی دارد.",
  "Careful. You are beginning to sound like me.":"مواظب باش. داری شبیه من می‌شوی.",
  "My soldier is awake. The Lancer is broken and the hammer has stepped aside. She has been rehearsing your death for three cycles; ignore the argument in her head.":"سرباز من بیدار است. لانسر شکسته است. چکش کنار رفت. او سه چرخه است که مرگ تو را تمرین میکند. حرفهای درون سرش را نادیده بگیر.",
  "Through the door, Inali’s voice cuts through — one sentence a threat, the next a plea, and neither sounding sincere.":"از پشت در، صدای اینالی می‌آید — یک جمله تهدید، جمله بعد التماس، و هیچکدام صادقانه به نظر نمی‌رسد.",
  "Answer her. Find the person inside.":"به او جواب بده. آدم درونش را پیدا کن.",
  "Silence it. No more ghosts.":"ساکتش کن. دیگر شبحی در کار نیست.",
  "Target in range. I can drop him before the others breach. ...I used to catalog starlight, Randall. Now I count heartbeats and call it science. I need you alive just long enough to get this leash off me. ...Contradiction noted. I still want him dead.":"هدف در برد است. می‌توانم قبل از نفوذ بقیه او را بندازم. ...رندال، قبلاً نور ستاره‌ها را فهرست می‌کردم. حالا ضربان قلب می‌شمارم و اسمش را علم می‌گذارم. فقط به اندازه‌ای زنده‌ات می‌خواهم که این زنجیر را از گردنم باز کنی. ...تناقض ثبت شد. هنوز هم می‌خواهم بمیرد.",
  "Then fight her through me. I am the door out.":"پس از طریق من با او بجنگ. من در خروجی هستم.",
  "I am going to fold him into the deck. It will be quick. ...I used to beg for test subjects to be treated gently. Now I am the thing they warn them about. Use me. I am still the fastest way through that door. Do not mistake it for trust. ...Recorded. Irrelevant.":"می‌خواهم او را روی زمین خم کنم. سریع تمام می‌شود. ...قبلاً التماس می‌کردم با سوژه‌ها ملایم باشند. حالا خودم همان چیزی هستم که درباره‌اش هشدار می‌دهند. از من استفاده کن. هنوز سریع‌ترین راه عبور از آن درم. با اعتماد اشتباه نگیر. ...ثبت شد. بی‌اهمیت.",
  "Then I will put down the thing he built.":"پس چیزی را که او ساخته از پا درمی‌آورم.",
  "The relay is silent. For the first time since Sur’Kesh, nothing answers back.":"رله خاموش است. برای اولین بار از سورکش، هیچ چیزی جواب نمی‌دهد.",
  "Project Inali is terminated. The ghost completes his mission.":"پروژه اینالی خاتمه یافت. شبح مأموریتش را کامل می‌کند.",
  "The Director is down. The signal has stopped.":"مدیر سقوط کرد. سیگنال متوقف شد.",
  "Inali is free of his control. The Alliance will guard the core — she will not be caged again.":"اینالی از کنترل او آزاد است. اتحاد از هسته محافظت می‌کند — او دیگر قفس نمی‌شود.",
  "The core is ash. Cerberus gets nothing, and neither does the Alliance.":"هسته خاکستر شد. سربروس چیزی نمی‌گیرد، اتحاد هم همینطور.",
  "They will call you a hero, Ezno. Try to deserve it.":"تو را قهرمان می‌نامند، ازنو. سعی کن لایقش باشی.",
  "They will call you a butcher. Try to sleep anyway.":"تو را قصاب می‌نامند. به هر حال سعی کن بخوابی.",
  "Randall... finish... it... I remember the girl who wanted to cure the sick. She is still in here, and she is so tired. I cannot carry what he put in me. Not anymore.":"رندال... تمامش... کن... دخترکی را یادم می‌آید که می‌خواست بیماران را درمان کند. او هنوز اینجاست، و خیلی خسته است. نمی‌توانم آنچه در من گذاشت حمل کنم. دیگر نه.",
  "I can't. Do not ask me to become him.":"نمی‌توانم. از من نخواه مثل او شوم.",
  "Forgive me. Not for this. For everything I did not stop.":"ببخشید. نه برای این. برای هر چیزی که جلویش را نگرفتم.",
  "Then leave me the pain. It is the only thing still mine.":"پس درد را برایم بگذار. تنها چیزی است که هنوز مال خودم است.",
  "Kill me. Put the round in me and stop pretending you are better than him. I have watched myself hurt people who never deserved it. I would rather be ash in your hands than his weapon in theirs.":"مرا بکش. تیر را بزن و وانمود نکن بهتر از اویی. دیدم چطور به آدم‌هایی که سزاوارش نبودند آسیب زدم. ترجیح می‌دهم در دستان تو خاکستر شوم تا سلاح او در دست‌هایشان.",
  "...":"...",
  "Do it, Ezno. I am not asking twice.":"انجامش بده، ازنو. دو بار نمی‌خواهم.",
  "Forgive me.":"ببخشید.",
  "The gunshot cuts the channel. Nothing answers back.":"صدای تیر کانال را قطع می‌کند. هیچ چیزی جواب نمی‌دهد.",
  "Come home, Ezno. The galaxy needs a warning more than it needs a ghost.":"بیا خانه، ازنو. کهکشان بیشتر از یک شبح، به یک هشدار نیاز دارد.",
  "PvP Survival: fight the other operative. Limited ability uses.":"بقای PVP: با عامل دیگر بجنگ. استفاده محدود از توانایی.",
  "PVP SURVIVAL":"بقای PVP",
  "THE DIRECTOR IS DOWN":"مدیر سقوط کرد",
  "ALARM — RESPONSE TEAM INBOUND":"هشدار — تیم واکنش در راه است",
  "BULKHEAD RELEASED":"درگاه حجیم باز شد",
  "DEFENSE WAVE INBOUND":"موج دفاعی در راه است",
  "DEFENSE ARRAY RESET — HOLD THE LINE":"آرایه دفاعی ریست شد — خط را نگه دار",
  "WARDEN — SHOCK SLAM":"نگهبان — کوبش شوکی",
  "PHANTOM — BLINK STRIKE":"شبح — ضربه چشمک‌زن",
  "TECHNICIAN — OVERCHARGE":"تکنسین — شارژ بیش از حد",
  "DIRECTOR — MIND LASH":"مدیر — تازیانه ذهن",
  "DIRECTOR — INALI ECHOES":"مدیر — پژواک‌های اینالی",
  "SHARD ACQUIRED — REACH THE SOCKET":"قطعه گرفته شد — به جایگاه برس",
  "ALLIANCE INTELLIGENCE // BLACK OPS":"اطلاعات اتحاد // عملیات سیاه",
  "OPERATION: SUR’KESH REBUILD":"عملیات: بازسازی سورکش",
  "02A · ATLAS INTERDICT":"۰۲الف · بازداشت اطلس",
  "CERBERUS PURGE SWEEP — BREAK THE CORDON":"جستجوی پاکسازی سربروس — شکستن حلقه محاصره",
  "The relay broadcast puts Cerberus on a timer. A Praetorian coordinator is erasing every witness between you and the desert redoubt. Break its cordon before the purge reaches the survivors.":"پخش رله سربروس را وارد شمارش معکوس کرده است. یک هماهنگکننده پرتورین هر شاهد بین تو و دژ بیابانی را پاک میکند. قبل از رسیدن پاکسازی به بازماندگان، محاصرهاش را بشکن.",
  "Cerberus purge teams are sweeping the approach. One Praetorian is coordinating them — its null field shreds barriers and cloaks. It has a list, and it is working through it.":"تیمهای پاکسازی سربروس در حال جارو کردن مسیرند. یک پرتورین آنها را هماهنگ میکند — میدان خنثیاش سپرها و پوشش را پاره میکند. یک لیست دارد و آن را یکی یکی پیش میبرد.",
  "Then we take the coordinator first. Everything else is noise.":"پس اول هماهنگکننده را میگیریم. بقیه فقط سر و صداست.",
  "BREAK THE ATLAS CORDON":"شکستن حلقه اطلس",
  "CORDON RELAY DOWN — GATE OPEN":"رله محاصره از کار افتاد — دروازه باز شد",
  "PLANT THE ATLAS BLACKBOX":"کاشت جعبه سیاه اطلس",
  "BLACKBOX SEEDED — CORDON COLLAPSING":"جعبه سیاه کارگذاشته شد — محاصره در حال فروپاشی است",
  "DEFEAT THE PRAETORIAN":"شکست پرتورین",
  "PRAETORIAN DOWN — INTERDICT BROKEN":"پرتورین سقوط کرد — بازداشت پایان یافت",
  "02B · TALON AMBUSH":"۰۲ب · کمین تالون",
  "ORBITAL DROP — SILENCE THE INTERCEPT":"فرود مداری — خاموش کردن رهگیر",
  "A Cerberus Talon team is falling in ahead of the convoy. Their Lancer marks the shot; a Juggernaut escort — unaffiliated, uncontrolled, and brutally protective — follows his own code. Cut the beacon, blind the uplink, then face each in turn.":"یک تیم تالون سربروس پیش از کاروان فرود میآید. لانسرشان نشانه میگذارد و یک یاور جاگرناوت — بیپیوند، بیفراد و بهشدت محافظ — از قانون خودش پیروی میکند. چراغ مسیریابی را قطع کن، پیوند رهگیری را کور کن، سپس با هرکدام به نوبت روبهرو شو.",
  "Talons have dropped ahead of us. The Lancer uses a rail lance. Behind him walks a Juggernaut with a biotic hammer — Cerberus built him, then lost him.":"تالونها جلوتر از ما فرود آمدند. لانسر تیر ریلی دارد. پشت سرش جاگرناوتی با چکش بیوتیک حرکت میکند — سربروس او را ساخت، سپس او را از دست داد.",
  "You are predictable, Ezno. I counted on you coming through the relay.":"قابل پیشبینیی، ازنو. حساب کرده بودم که از رله عبور کنی.",
  "Then count on me stopping the shot. And the hammer.":"پس حساب کن که جلوی تیر را میگیرم. و چکش را هم.",
  "RESTORE THE NAV BEACON":"روشن کردن چراغ مسیریابی",
  "NAV BEACON ONLINE — TALON ROUTE OPEN":"چراغ مسیریابی روشن شد — مسیر تالون باز شد",
  "CRIPPLE THE INTERCEPT UPLINK":"پیوند رهگیری را فلج کن",
  "UPLINK DOWN — LANCER EXPOSED":"پیوند از کار افتاد — لانسر نمایان شد",
  "HUNT THE TALON LANCER":"شکار لانسر تالون",
  "TALON LANCER DOWN — HAMMER EXPOSED":"لانسر تالون سقوط کرد — چکش نمایان شد",
  "FACE THE JUGGERNAUT":"روبهرو شدن با جاگرناوت",
  "JUGGERNAUT STANDS DOWN — DESERT ROAD OPEN":"جاگرناوت عقب نشینی کرد — راه بیابان باز شد",
  "You shared the survivor list. Cerberus knows exactly who can identify the core.":"لیست بازماندگان را به اشتراک گذاشتی. سربروس دقیقاً میداند چه کسی هسته را شناسایی میکند.",
  "You kept the survivor list to yourself. Cerberus is hunting blind — for now.":"لیست بازماندگان را نزد خود نگه داشتی. سربروس فعلاً کور میشکارد.",
  "The Praetorian is moving witnesses into the cordon. Your call.":"پرتورین شاهدان را به داخل محاصره میبرد. تصمیم با توست.",
  "Share the evacuation route. Save the witnesses.":"مسیر تخلیه را بفرست. شاهدان را نجات بده.",
  "Keep the route. Close the net on the Praetorian.":"مسیر را مخفی نگه دار. دام را روی پرتورین ببند.",
  "Get them out. I will draw the Praetorian off.":"آنها را بیرون ببر. من پرتورین را منحرف میکنم.",
  "Route open. You just made yourself the target.":"مسیر باز شد. خودت را هدف کردی.",
  "Witnesses wait. The coordinator does not.":"شاهدان صبر میکنند. هماهنگکننده نه.",
  "Cold. Efficient. The route stays dark.":"سرد. کارآمد. مسیر تاریک میماند.",
  "You took my Talon bargain. The Lancer knows you will hesitate.":"معامله تالون من را پذیرفتی. لانسر میداند که تردید میکنی.",
  "You refused my Talon bargain. The Lancer has orders to make you regret it.":"معامله تالون من را رد کردی. لانسر دستور دارد پشیمانت کند.",
  "The Lancer is close enough to hear this channel. Your call.":"لانسر آنقدر نزدیک است که این کانال را میشنود. تصمیم با توست.",
  "Warn the convoy. No deal.":"به کاروان هشدار بده. معاملهای نیست.",
  "Offer the convoy as bait.":"کاروان را به عنوان طعمه بده.",
  "Convoy, scatter. The shot goes through me first.":"کاروان، پراکنده شوید. تیر اول از من میگذرد.",
  "Sentiment. It makes the shot cleaner.":"احساسات. تیر را تمیزتر میکند.",
  "Let them take the bait. I take the Lancer.":"بگذار طعمه را بگیرند. من لانسر را میگیرم.",
  "Now you are learning.":"حالا داری یاد میگیری.",
  "The Atlas witnesses made it out. They will testify.":"شاهدان اطلس بیرون رفتند. آنها شهادت میدهند.",
  "The Atlas survivors are still missing. The record has holes.":"بازماندگان اطلس هنوز مفقودند. پرونده روزنه دارد.",
  "The Praetorian field is collapsing. The cordon is broken.":"میدان پرتورین در حال فروپاشی است. محاصره شکسته شد.",
  "We can use the captured relay to warn the convoy. Your call.":"میتوانیم از رله تصرفشده برای هشدار به کاروان استفاده کنیم. تصمیم با توست.",
  "Send the warning. Expose our position.":"هشدار بفرست. موقعیتمان را لو بده.",
  "Stay dark. Take the convoy route silently.":"تاریک بمان. بیصدا از مسیر کاروان برو.",
  "Send it. Let them know we are coming.":"بفرست. بگذار بدانند میآییم.",
  "Warning away. Cerberus has our vector now.":"هشدار رفت. سربروس حالا بردار ماست.",
  "No broadcast. We hunt from the shadows.":"پخشی نیست. از سایهها شکار میکنیم.",
  "Silent. The Talons will not see us until we fire.":"ساکت. تالونها تا قبل از شلیک ما را نمیبینند.",
  "The Lancer is broken and the Juggernaut has stepped aside. You are closer to the core than you have ever been.":"لانسر شکسته و جاگرناوت کنار رفته است. تو هرگز به هسته اینقدر نزدیک نبودهای.",
  "The desert channel opens. One last question before we go.":"کانال بیابان باز میشود. قبل از رفتن یک سؤال آخر.",
  "Go in for Inali, not the core.":"برای اینالی برو، نه هسته.",
  "Go in for the core. Everything else waits.":"برای هسته برو. بقیه صبر میکند.",
  "I am taking her home.":"او را به خانه میبرم.",
  "Then bring a door opener. She will not thank you.":"پس بازکننده در بیاور. ازت تشکر نمیکند.",
  "The core ends this. She is part of it.":"هسته تمامش میکند. او بخشی از آن است.",
  "Good. Bring less sentiment next time.":"خوب. دفعه بعد احساسات کمتری بیاور.",
  "The convoy made it because you warned them.":"کاروان به خاطر هشدار تو نجات پیدا کرد.",
  "The convoy never saw the Talons coming. The silence held.":"کاروان هرگز تالونها را ندید. سکوت برقرار ماند.",
  "PRAETORIAN":"پرتورین",
  "LANCER":"لانسر",
  "JUGGERNAUT":"جاگرناوت",
  "DIRECTOR":"مدیر",
  "DIRECTOR MECH":"ماشین محاصره مدیر",
  "The witnesses are still inside the cordon. The Praetorian knows which ones can name the core.":"شاهدان هنوز داخل محاصرهاند. پرتورین میداند کدامشان میتواند هسته را نام ببرد.",
  "The Praetorian has the witness list. It is deleting anyone who saw the relay broadcast.":"پرتورین لیست شاهدان را دارد. هر کسی را که پخش رله را دیده بود پاک میکند.",
  "CIVILIANS ARE CONTAMINATION. I AM THE STERILE FIELD. KNEEL, OR BE ERASED.":"غیرنظامیان آلودگیاند. من میدان استریلم. زانو بزن، یا پاک شو.",
  "The convoy channel is open. One call before the cordon closes.":"کانال کاروان باز است. یک تماس قبل از بسته شدن محاصره.",
  "Rail signature locked. The Lancer is standing in the open — daring us to take the first shot.":"امضای ریلی قفل شد. لانسر در معرض دید ایستاده — انگار ما را به اولین شلیک دعوت میکند.",
  "ONE SHOT. ONE CONVOY. I DO NOT MISS, GHOST.":"یک تیر. یک کاروان. من اشتباه نمیکنم، شبح.",
  "Rail exposure confirmed. How do we drop him?":"نمایان شدن ریل تأیید شد. چگونه او را میاندازیم؟",
  "Cut the charge, not the man.":"شارژ را قطع کن، نه آدم را.",
  "If he is still breathing, he can testify.":"اگر هنوز نفس میکشد، میتواند شهادت دهد.",
  "Rail capacitor venting. He will fight blinded.":"خازن ریل در حال تخلیه است. کور میجنگد.",
  "Put a round through the rail coil.":"گلولهای به سیمپیچ ریل بزن.",
  "Let the Director watch her favorite weapon die.":"بگذار مدیر ببیند سلاح محبوبش میمیرد.",
  "Crude. Effective. You are learning.":"خام. مؤثر. داری یاد میگیری.",
  "Movement in the ruin — too many hostiles for a patrol.":"حرکتی در ویرانه — دشمنان بیشتر از یک گزمه معمولی.",
  "Shield is gone, Volus. I need a second.":"سپر رفت، ولوس. به یک ثانیه زمان نیاز دارم.",
  "DOWN. STAY THERE.":"پایین. همانجام بمان.",
  "He dropped in and took the whole ring apart. Then he threw you clear of it.":"از بالا آمد و تمام حلقه را از هم پاشید. بعد تو را از میانه بیرون انداخت.",
  "You left the Lancer alive. Finish it next time.":"لانسر را زنده گذاشتی. دفعه بعد تمامش کن.",
  "You burned his rail. Good. It will not fire again.":"ریلش را سوزاندی. خوب. دیگر شلیک نخواهد کرد.",
  "I do not wear their leash. Cerberus points me at crowds; I break the hand. The civilians are not targets.":"من قلادهای از آنها به گردن ندارم. سربروس مرا به سمت جمعیتها میفرستد؛ من دستش را میشکنم. غیرنظامیان هدف نیستند.",
  "You are useful alive. Stay down and stay out of my swing.":"زنده بودنت به درد میخورد. پایین بمان و از ضربهام دور باش.",
  "One question. Then we move.":"یک سؤال. بعد حرکت میکنیم.",
  "Then work with me. Break the Director’s leash.":"پس با من کار کن. قلاده مدیر را بشکن.",
  "Then stand beside me. Break the Director’s leash.":"پس کنار من بایست. قلاده مدیر را بشکن.",
  "Fine. Swing at her, not at me.":"باشه. چکشت را به سوی او بچرخان، نه من.",
  "Move when I swing. Do not swing at me.":"وقتی من زدم، حرکت کن. به من نزن.",
  "Stay out of it. I finish this my way.":"دخالت نکن. خودم به روش خودم تمامش میکنم.",
  "I don't take orders from a hammer.":"من از چکش دستور نمیگیرم.",
  "Then stay out of my way. I will not drag you out again.":"پس از سر راهم برو کنار. دوباره بیرونت نمیکشم.",
  "PRAETORIAN — NULL PULSE":"پرتورین — پالس خنثی",
  "LANCER — RAIL LANCE":"لانسر — تیر ریلی",
  "PRAETORIAN DOWN":"پرتورین سقوط کرد",
  "LANCER DOWN":"لانسر سقوط کرد",
  "JUGGERNAUT DOWN":"جاگرناوت سقوط کرد",
  "JUGGERNAUT — BIOTIC HAMMER":"جاگرناوت — چکش بیوتیک",
  "JUGGERNAUT — BIOTIC HURRICANE":"جاگرناوت — طوفان بیوتیک",
  "JUGGERNAUT — BIG BIOTIC HAMMER":"جاگرناوت — چکش بیوتیک بزرگ",
  "DUEL ENDED — RANDALL LEARNED THE READ":"دوئل تمام شد — راندل حرکت چکش را آموخت",
  "Enough. You read the swing. You stayed standing. You stopped shooting through me.":"بس است. ضربه را خواندی. روی پایت ماندی. از میان من شلیک نکردی.",
  "I wasn't trying to kill you. I was trying to stay standing.":"نمیخواستم تو را بکشم. سعی میکردم سرپا بمانم.",
  "Watch the shoulder, not the hammer. When the ground lights, move. When it drops, step in.":"شانه را نگاه کن، نه چکش را. زمین که روشن شد، حرکت کن. چکش که فرود آمد، داخل شو.",
  "And if I don't?":"و اگر این کار را نکنم؟",
  "Then you keep getting thrown. I am not here to save you. I am here to hurt what comes through that door.":"پس مدام پرتاب میشوی. من اینجا نیستم که نجاتت دهم. اینجا هستم تا هرچه از آن در میآید را بزنم.",
  "I do not wear a leash. I will break hers.":"من قلادهای ندارم. قلاده او را میشکنم.",
  "JUGGERNAUT STANDS DOWN — EAST RUIN NEXT":"جاگرناوت عقب نشینی کرد — بعدی ویرانه شرقی",
  "HIS OWN WAR":"جنگ خود او",
  "CONVOY CLEAR — JUGGERNAUT JOINS THE FIGHT":"کاروان پاک شد — جاگرناوت وارد نبرد میشود",
  "Her subordinates are screening the chamber. Break their field first — the Director is covered while they stand.":"زیردستانش اتاق را پوشش میدهند. اول میدان آنها را بشکن — تا آنها ایستادهاند مدیر پوشش دارد.",
  "My soldiers are not a shield. They are a lesson. Watch how quickly you run out of answers.":"سربازان من سپر نیستند. آنها یک درساند. ببین چقدر زود جوابهایت تمام میشود.",
  "My turn. Cerberus moved a convoy through the east ruin. I break it. You hold the array.":"نوبت من. سربروس کاروانی را از ویرانه شرقی رد کرده. من آن را میشکنم. تو آرایه را نگه دار.",
  "And if you decide to make trouble?":"و اگر تصمیم بگیری دردسر درست کنی؟",
  "Then you deal with it. I do not ask permission.":"پس خودت با آن کنار بیا. من اجازه نمیگیرم.",
  "My list is done. The Director is still in your path. I stand in the gap.":"لیست من تمام شد. مدیر هنوز در مسیر توست. من در شکاف میایستم.",
  "My list is done. The Director is still in your path. I stand in the gap until it is finished.":"لیست من تمام شد. مدیر هنوز در مسیر توست. تا تمام شدنش در شکاف میایستم.",
  "For how long?":"تا کی؟",
  "I will break her mech. I will break your line of fire if you stand in it. Move.":"ماشین او را میشکنم. خط آتش تو را هم میشکنم اگر در آن بایستی. حرکت کن.",
  "Understood.":"فهمیدم.",
  "Keep moving. I will move you if you stop.":"حرکت کن. اگر ایستادی، خودم جابت را عوض میکنم.",
  "I take the legs. You take the cockpit. Do not miss.":"من پاها را میگیرم. تو کابین را. خطا نکن.",
  "Volus, keep the array between us and that thing.":"ولوس، آرایه را بین ما و آن چیز نگه دار.",
  "The Director has climbed into a siege walker. Small arms will not cut that plate — break the legs, then the cockpit.":"مدیر سوار یک walker محاصره شده است. سلاحهای سبک آن زره را نمیشکافند — پاها را بشکن، بعد کابین.",
  "You taught me to escalate, Ezno. Now watch the machine do it properly.":"تو به من یاد دادی تشدید کنم، ازنو. حالا ببین ماشین چطور درست انجاماش میدهد.",
  "This chassis carries a mind that does not falter. You are looking at the part of me that never learned hesitation.":"این شاسی ذهنی را حمل میکند که لرزهای ندارد. تو بخشی از من را میبینی که هرگز تردید نیاموخت.",
  "Count the armor plates if you like. I am counting the seconds before you break.":"اگر دلت خواست زرهها را بشمار. من ثانیههای قبل از شکستنت را میشمارم.",
  "I tear the armor off. You get the woman out.":"من زره را پاره میکنم. تو زن را بیرون بیاور.",
  "Then I take the armor off you and find out who is left.":"پس زره را از تن تو برمیدارم و میبینم چه کسی باقی مانده است.",
  "Enough theater. The walker was a wrapper. This is the soldier you came to stop.":"بس نمایش. walker فقط بستهبندی بود. این همان سربازی است که آمدی متوقفش کنی.",
  "No more machine, no more proxies. Just my hands, her instincts, and your mistakes.":"دیگر ماشینی نیست، واسطهای هم نیست. فقط دستان من، غرایز او و اشتباهات تو.",
  "You wanted the woman behind the weapon. Watch closely — she is still in there, and she still hates you.":"میخواستی زن پشت سلاح را ببینی. خوب نگاه کن — او هنوز آنجاست و هنوز از تو متنفر است.",
  "Target... still moving. I can help. I can also end him. The instruction keeps changing.":"هدف... هنوز حرکت میکند. میتوانم کمک کنم. میتوانم هم او را تمام کنم. دستور مدام عوض میشود.",
  "DIRECTOR — PHASE I: SUBORDINATES":"مدیر — فاز اول: زیردستان",
  "DIRECTOR — PHASE II: SIEGE WALKER":"مدیر — فاز دوم: walker محاصره",
  "DIRECTOR — PHASE III: ADVANCED ARMOR":"مدیر — فاز سوم: زره پیشرفته",
  "DIRECTOR MECH — SIEGE SLAM":"ماشین مدیر — کوبش محاصره",
  "JUGGERNAUT — MOVE":"جاگرناوت — حرکت کن",
  "Cerberus record closed. Project Inali is terminated. The ghost completes his mission.":"پرونده سربروس بسته شد. پروژه اینالی خاتمه یافت. شبح مأموریتش را کامل میکند."
};
function loc(s){ return (lang==='fa' && typeof s==='string' && FA_TEXT[s]) ? FA_TEXT[s] : s; }


/* ---------------- 2D UI ---------------- */
function panel(x,y,w,h){ctx.fillStyle='rgba(8,20,32,.92)';ctx.fillRect(x,y,w,h);
 ctx.strokeStyle='rgba(99,230,255,.35)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 ctx.strokeStyle='rgba(99,230,255,.12)';ctx.strokeRect(x+5.5,y+5.5,w-11,h-11);}
function menuItem(label,y,sel){const cx=W/2;ctx.textAlign='center';
 ctx.fillStyle=sel?'#63e6ff':'#7a9ab0';ctx.font=(sel?'bold ':'')+uiFont(18);
 ctx.fillText((sel?'▸ ':'')+label+' '+(sel?' ◂':''),cx,y);
 if(sel){ctx.fillStyle='rgba(99,230,255,.5)';ctx.fillRect(cx-110,y+8,220,1);}}
function drawMenuCard(r,label,sub,sel,i){
 ctx.save();
 const rtl=isRTL(); ctx.direction=rtl?'rtl':'ltr';
 chamferPath(r.x,r.y,r.w,r.h,10);
 ctx.fillStyle=sel?'rgba(12,48,66,.94)':'rgba(8,20,32,.88)';ctx.fill();
 ctx.strokeStyle=sel?'#63e6ff':'rgba(99,230,255,.28)';ctx.lineWidth=sel?2:1;ctx.stroke();
 if(sel){chamferPath(r.x+3,r.y+3,r.w-6,r.h-6,7);
  ctx.strokeStyle='rgba(99,230,255,.22)';ctx.lineWidth=1;ctx.stroke();}
 const left = rtl ? r.x+r.w-14 : r.x+14;
 const textX = rtl ? r.x+r.w-44 : r.x+44;
 ctx.textAlign=rtl?'right':'left';ctx.fillStyle=sel?'#63e6ff':'#4d6e82';ctx.font=uiFont(10,'bold');
 ctx.fillText('0'+(i+1),left,r.y+r.h/2-2);
 ctx.fillStyle=sel?'#eaf6ff':'#a9c2d2';ctx.font=uiFont(16,'bold');
 ctx.fillText(label,textX,r.y+r.h/2-3);
 ctx.fillStyle=sel?'#8fc4dc':'#5f7d90';ctx.font=uiFont(10);
 ctx.fillText(sub,textX,r.y+r.h/2+14);
 if(sel){ctx.fillStyle='#63e6ff';ctx.fillRect(rtl?r.x+12:r.x+r.w-16,r.y+r.h/2-9,4,18);}
 ctx.restore();
}
function titleFrac(v){return v-Math.floor(v);}
function drawTitleFx(){
 ctx.save();
 // Slow vertical signal sweep behind the menu cards.
 const sy=((time*38)%(H+180))-90,sg=ctx.createLinearGradient(0,sy-70,0,sy+70);
 sg.addColorStop(0,'rgba(99,230,255,0)');sg.addColorStop(.5,'rgba(99,230,255,.07)');
 sg.addColorStop(1,'rgba(99,230,255,0)');
 ctx.fillStyle=sg;ctx.fillRect(0,sy-70,W,140);
 // Drifting telemetry motes, all generated locally.
 for(let i=0;i<34;i++){
  const seed=i*17.13,x=titleFrac(Math.sin(seed)*43758.5453)*W,
   y=(titleFrac(Math.sin(seed*1.7)*12345.6789)*H+time*(5+i%5*2))%(H*.78),
   a=.06+.18*titleFrac(Math.sin(seed*.7+time*.8)*8123.4),s=i%6===0?2:1;
  ctx.fillStyle='rgba(143,232,255,'+a+')';ctx.fillRect(x,y,s,s);
 }
 // Soft diagonal scan bands for a little parallax depth.
 ctx.globalCompositeOperation='lighter';
 for(let i=0;i<3;i++){
  const off=((time*(10+i*5)+i*W*.37)%(W*1.6))-W*.3;
  const bg=ctx.createLinearGradient(off,0,off+W*.18,H);
  bg.addColorStop(0,'rgba(99,230,255,0)');bg.addColorStop(.5,'rgba(99,230,255,.035)');
  bg.addColorStop(1,'rgba(99,230,255,0)');
  ctx.fillStyle=bg;ctx.fillRect(off-W*.18,0,W*.36,H);
 }
 ctx.restore();
}
function drawTitleButton(r,label,selected){
 ctx.save();
 if(selected){const p=.5+.5*Math.sin(time*4.6);
  ctx.shadowColor='rgba(255,176,74,'+(.35+.35*p)+')';ctx.shadowBlur=10+12*p;}
 chamferPath(r.x,r.y,r.w,r.h,12);
 const g=ctx.createLinearGradient(r.x,r.y,r.x,r.y+r.h);
 if(selected){g.addColorStop(0,'rgba(138,30,32,.94)');g.addColorStop(1,'rgba(56,10,14,.94)');}
 else {g.addColorStop(0,'rgba(14,34,52,.82)');g.addColorStop(1,'rgba(6,17,28,.88)');}
 ctx.fillStyle=g;ctx.fill();
 ctx.strokeStyle=selected?'#ffb04a':'rgba(99,230,255,.62)';ctx.lineWidth=selected?2:1;ctx.stroke();
 chamferPath(r.x+3,r.y+3,r.w-6,r.h-6,9);
 ctx.strokeStyle=selected?'rgba(255,178,90,.45)':'rgba(99,230,255,.18)';ctx.lineWidth=1;ctx.stroke();
 ctx.save();chamferPath(r.x,r.y,r.w,r.h,12);ctx.clip();
 const sh=ctx.createLinearGradient(r.x,r.y,r.x,r.y+r.h);
 sh.addColorStop(0,'rgba(255,255,255,.14)');sh.addColorStop(.45,'rgba(255,255,255,.02)');
 sh.addColorStop(1,'rgba(0,0,0,.18)');ctx.fillStyle=sh;ctx.fillRect(r.x,r.y,r.w,r.h);
 if(selected){
  const sx=r.x+((time*110)%(r.w+140))-70,
   sg=ctx.createLinearGradient(sx-45,0,sx+45,0);
  sg.addColorStop(0,'rgba(255,207,138,0)');sg.addColorStop(.5,'rgba(255,207,138,.16)');
  sg.addColorStop(1,'rgba(255,207,138,0)');
  ctx.fillStyle=sg;ctx.fillRect(sx-45,r.y,90,r.h);
 }
 ctx.restore();
 ctx.fillStyle=selected?'#ffcf8a':'#63e6ff';
 ctx.fillRect(r.x+8,r.y+8,12,2);ctx.fillRect(r.x+r.w-20,r.y+r.h-10,12,2);
 ctx.textAlign='center';ctx.fillStyle=selected?'#ffc266':'#bfe9ff';
 ctx.font=uiFont(clamp(r.w*.11,15,24),'bold');
 ctx.fillText(label.toUpperCase(),r.x+r.w/2,r.y+r.h/2+7);
 ctx.restore();
}
function drawTitleEmblems(){
 ctx.save();
 const gr=titleGithubRect(),lx=gr.x+gr.r,ly=gr.y+gr.r,lr=gr.r;
 const hover=Math.hypot(mouse.x-lx,mouse.y-ly)<=lr,pulse=.5+.5*Math.sin(time*3.4);
 ctx.shadowColor=hover?'#8fe8ff':'#63e6ff';ctx.shadowBlur=hover?24:14+pulse*6;
 const lg=ctx.createRadialGradient(lx,ly,2,lx,ly,lr);
 lg.addColorStop(0,'rgba(160,240,255,.95)');lg.addColorStop(1,'rgba(12,60,90,.22)');
 ctx.fillStyle=lg;ctx.beginPath();ctx.arc(lx,ly,lr,0,TAU);ctx.fill();
 ctx.shadowBlur=0;ctx.strokeStyle='rgba(99,230,255,'+(.62+.3*pulse)+')';ctx.lineWidth=hover?2:1;ctx.stroke();
 ctx.fillStyle='#dffbff';ctx.beginPath();ctx.moveTo(lx,ly-9);ctx.lineTo(lx+7,ly+6);
 ctx.lineTo(lx,ly+2);ctx.lineTo(lx-7,ly+6);ctx.closePath();ctx.fill();
 const rx=W-30,ry=30,rr=19;
 ctx.fillStyle='rgba(8,24,36,.62)';ctx.beginPath();ctx.arc(rx,ry,rr,0,TAU);ctx.fill();
 ctx.strokeStyle='rgba(99,230,255,.5)';ctx.stroke();
 ctx.fillStyle='rgba(223,251,255,.86)';ctx.font=uiFont(14,'bold');ctx.textAlign='center';
 ctx.fillText('EA',rx,ry+5);
 ctx.restore();
}
function drawTitleHub(rects){
 const cx=W/2,cy=(rects[0].y+rects[0].h+rects[2].y)/2;
 const R=Math.min(W,H)*.095;
 ctx.save();ctx.translate(cx,cy);
 ctx.globalAlpha=.5;ctx.strokeStyle='#63e6ff';
 ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,R,0,TAU);ctx.stroke();
 ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,R*.62,0,TAU);ctx.stroke();
 ctx.rotate(time*.12);
 for(let i=0;i<12;i++){
  const a=i/12*TAU;
  ctx.save();ctx.rotate(a);ctx.fillStyle=i%2?'rgba(99,230,255,.5)':'rgba(80,150,190,.35)';
  ctx.fillRect(R*.72,-2,R*.22,4);ctx.restore();
 }
 ctx.rotate(-time*.28);
 ctx.fillStyle='rgba(99,230,255,.12)';ctx.beginPath();ctx.arc(0,0,R*.4,0,TAU);ctx.fill();
 ctx.restore();
}
function drawTitleInfoButton(){
 // The old corner Info button is now the explicit Exit control.
 const ir=titleInfoRect(),cx=ir.x+ir.r,cy=ir.y+ir.r;
 ctx.save();ctx.shadowColor='#ff8f7a';ctx.shadowBlur=12;
 ctx.fillStyle='rgba(36,12,16,.82)';ctx.beginPath();ctx.arc(cx,cy,ir.r,0,TAU);ctx.fill();
 ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,150,125,.8)';ctx.lineWidth=1.5;ctx.stroke();
 ctx.strokeStyle='#ffd2c8';ctx.lineWidth=2.5;ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(cx-6,cy-6);ctx.lineTo(cx+6,cy+6);
 ctx.moveTo(cx+6,cy-6);ctx.lineTo(cx-6,cy+6);ctx.stroke();
 ctx.restore();
}
function drawTitle(){
 ctx.save();ctx.direction=isRTL()?'rtl':'ltr';
 const bg=ctx.createLinearGradient(0,0,0,H);
 bg.addColorStop(0,'#02060d');bg.addColorStop(.52,'#061626');bg.addColorStop(1,'#02070c');
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.fillStyle='#bfe9ff';
 for(let i=0;i<90;i++){
  const sx=titleFrac(Math.sin(i*12.9898)*43758.5453)*W;
  const sy=titleFrac(Math.sin(i*78.233)*12345.6789)*H*.76;
  ctx.globalAlpha=.12+.38*titleFrac(Math.sin(i*3.17)*987.123);
  ctx.fillRect(sx,sy,i%9===0?2:1,i%9===0?2:1);
 }
 ctx.restore();
 drawTitleFx();
 const px=W*.17,py=H*.19,pr=Math.min(W,H)*.17;
 ctx.save();ctx.beginPath();ctx.arc(px,py,pr,0,TAU);ctx.clip();
 const pg=ctx.createRadialGradient(px-pr*.4,py-pr*.45,pr*.1,px,py,pr);
 pg.addColorStop(0,'#5f8fb2');pg.addColorStop(.42,'#1b3f60');pg.addColorStop(1,'#07121f');
 ctx.fillStyle=pg;ctx.fillRect(px-pr,py-pr,pr*2,pr*2);
 ctx.globalAlpha=.16;ctx.strokeStyle='#a8d8f0';ctx.lineWidth=pr*.08;
 for(let i=-2;i<=2;i++){ctx.beginPath();ctx.ellipse(px,py+i*pr*.32,pr*1.1,pr*.16,0,0,TAU);ctx.stroke();}
 ctx.restore();
 ctx.strokeStyle='rgba(120,200,245,.32)';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(px,py,pr,Math.PI*.62,Math.PI*1.42);ctx.stroke();
 ctx.save();ctx.beginPath();ctx.ellipse(W*1.02,H*.99,W*.68,H*.36,0,0,TAU);ctx.clip();
 const hg=ctx.createLinearGradient(0,H*.56,0,H);
 hg.addColorStop(0,'rgba(16,68,96,0)');hg.addColorStop(.6,'rgba(20,96,132,.7)');
 hg.addColorStop(1,'rgba(94,214,246,.35)');
 ctx.fillStyle=hg;ctx.fillRect(0,H*.5,W,H*.5);ctx.restore();
 ctx.save();ctx.strokeStyle='rgba(130,225,255,.55)';ctx.lineWidth=3;
 ctx.shadowColor='#63e6ff';ctx.shadowBlur=20;
 ctx.beginPath();ctx.ellipse(W*1.02,H*.99,W*.68,H*.36,0,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
 ctx.restore();
 const glow=ctx.createRadialGradient(W*.56,H*.52,10,W*.56,H*.52,Math.max(W,H)*.55);
 glow.addColorStop(0,'rgba(35,140,190,.18)');glow.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.textAlign='center';ctx.fillStyle='#eaf6ff';ctx.font=uiFont(clamp(W*.033,16,30),'bold');
 ctx.fillText('MASS EFFECT',W/2,Math.max(34,H*.055));
 ctx.fillStyle='#63e6ff';ctx.font=uiFont(clamp(W*.019,10,15),'bold');
 ctx.fillText('GHOST PROTOCOL',W/2,Math.max(56,H*.055+24));
 drawTitleEmblems();
 const rects=titleItemRects();
 drawTitleHub(rects);
 const items=[[T('deploy'),0],[T('lan'),1],[T('how'),2],[T('settings'),3]];
 items.forEach((it,i)=>drawTitleButton(rects[i],it[0],menuIdx===i));
 drawTitleInfoButton();
 ctx.textAlign='center';ctx.fillStyle='#3d5a6c';ctx.font=uiFont(9);
 ctx.fillText(lang==='fa'?'GHOST PROTOCOL · ادای احترام غیررسمی':'GHOST PROTOCOL · FAN-MADE TRIBUTE',W/2,H-14);
 ctx.restore();
}
function drawVolumeRow(rect,label,value,max,color,selected){
 ctx.save();
 ctx.fillStyle='rgba(6,18,28,.9)';ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
 ctx.strokeStyle=selected?'#dffbff':'rgba(99,230,255,.3)';ctx.lineWidth=selected?2:1;
 ctx.strokeRect(rect.x+1,rect.y+1,rect.w-2,rect.h-2);
 ctx.textAlign='left';ctx.fillStyle='#dfefff';ctx.font=uiFont(12,'bold');
 ctx.fillText(label,rect.x+12,rect.y+19);
 ctx.textAlign='right';ctx.fillStyle=color;ctx.font=uiFont(11,'bold');
 ctx.fillText(Math.round(clamp(value/max,0,1)*100)+'%',rect.x+rect.w-12,rect.y+19);
 const bx=rect.x+12,bw=rect.w-24,by=rect.y+32,bh=8;
 ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(bx,by,bw,bh);
 ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;ctx.strokeRect(bx+.5,by+.5,bw-1,bh-1);
 const fw=bw*clamp(value/max,0,1),fx=isRTL()?bx+bw-fw:bx;
 ctx.fillStyle=color;ctx.fillRect(fx,by,fw,bh);
 ctx.restore();
}
function drawSettings(){
 ctx.save();ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.94)';ctx.fillRect(0,0,W,H);
 const r=settingsRects(),cx=W/2;
 ctx.fillText(lang==='fa'?'پیکربندی سامانه':'SYSTEM CONFIG',cx,Math.max(48,r.lang.y-54));
 ctx.fillStyle='#eaf6ff';ctx.font=uiFont(Math.min(28,W/12),'bold');
 ctx.fillText(T('settings'),cx,Math.max(76,r.lang.y-24));
 drawMenuCard(r.lang,T('langBtn'),T('langSub'),menuIdx===0,0);
 drawVolumeRow(r.music,T('musicVol'),MusicSys.vol,12.8,'#63e6ff',menuIdx===1);
 drawVolumeRow(r.sfx,T('sfxVol'),AudioSys.sfxVol,2,'#7fffa0',menuIdx===2);
 drawMenuCard(r.controller,T('controllerBtn'),T('controllerSub'),menuIdx===3,3);
 drawMenuCard(r.back,T('back'),T('backSub'),menuIdx===4,4);
 ctx.textAlign='center';ctx.fillStyle='#7a9ab0';ctx.font=uiFont(10);
 ctx.fillText(T('settingsHint'),cx,H-22);
 ctx.restore();
}
function drawControls(){
 ctx.save();ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.94)';ctx.fillRect(0,0,W,H);
 const c=controlsRects(),L=c.layout,cx=W/2;
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(11,'bold');
 ctx.fillText(T('controllerTitle'),cx,Math.max(42,L.top-38));
 ctx.fillStyle='#7a9ab0';ctx.font=uiFont(10);
 ctx.fillText(T('controllerHint'),cx,Math.max(60,L.top-19));
 ctx.save();ctx.beginPath();ctx.rect(L.x,L.top,L.w,L.trackH);ctx.clip();
 c.rows.forEach((r,i)=>{
  const a=PAD_ACTIONS[i],sel=menuIdx===i;
  const binding=GamepadSys.capture===a.key?T('controllerCapture'):bindingLabel(GamepadSys.map[a.key]);
  drawMenuCard(r,padLabel(a),binding,sel,i+1);
 });
 ctx.restore();
 const thumbH=Math.max(28,L.trackH*L.trackH/L.totalH);
 const sy=L.top+(L.maxScroll?padScroll/L.maxScroll*(L.trackH-thumbH):0);
 ctx.fillStyle='rgba(99,230,255,.16)';ctx.fillRect(L.x+L.w-4,L.top,4,L.trackH);
 ctx.fillStyle='rgba(99,230,255,.65)';ctx.fillRect(L.x+L.w-4,sy,4,thumbH);
 drawMenuCard(c.reset,T('controllerReset'),T('controllerResetSub'),menuIdx===c.rows.length,0);
 drawMenuCard(c.back,T('back'),T('backSub'),menuIdx===c.rows.length+1,0);
 ctx.textAlign='center';ctx.fillStyle='#7a9ab0';ctx.font=uiFont(9);
 ctx.fillText(GamepadSys.capture?T('controllerCapture'):T('controllerScroll'),cx,H-9);
 ctx.restore();
}
function drawBrief(){
 ctx.save(); ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.9)';ctx.fillRect(0,0,W,H);
 const L=LEVELS[levelIdx],cx=W/2,w=Math.min(620,W-32),h=Math.min(460,H-40),x=cx-w/2,y=(H-h)/2;
 panel(x,y,w,h);ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(11,'bold');
 ctx.fillText(T('briefOp')+'  '+loc(L.name),cx,y+34);
 ctx.fillStyle='#eaf6ff';ctx.font=uiFont(Math.min(26,w/18),'bold');ctx.fillText(loc(L.sub),cx,y+62);
 ctx.fillStyle='#9fb8c8';ctx.font=uiFont(13);ctx.textAlign='left';wrapText(loc(L.brief),x+36,y+104,w-72,22);
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(12);ctx.fillText(T('objective')+loc(L.goal),cx,y+h-70);
 ctx.fillStyle='#7a9ab0';ctx.font=uiFont(11);ctx.fillText(T('begin'),cx,y+h-36);}
function wrapText(text,x,y,maxw,lh){const words=text.split(' ');let line='',yy=y;
 ctx.textAlign='left';for(const wd of words){const t=line+wd+' ';
  if(ctx.measureText(t).width>maxw&&line){ctx.fillText(line,x,yy);line=wd+' ';yy+=lh;}else line=t;}
 ctx.fillText(line,x,yy);}
const PORTRAITS={
 RANDALL:{skin:'#b98a6d',suit:'#1b3c50',trim:'#63e6ff',hair:'#2a1b14',visor:true},
 VOLUS:{skin:'#5f8f86',suit:'#16414a',trim:'#9fffd8',helmet:true},
 DIRECTOR:{skin:'#9d7a68',suit:'#4a1620',trim:'#ff6a5a',hair:'#c8c8c8',angry:true},
 INALI:{skin:'#c79572',suit:'#244b5e',trim:'#b07aff',hair:'#1c1210',headset:true,angry:true},
 PRAETORIAN:{skin:'#8fa9b5',suit:'#173b4d',trim:'#7ad8ff',helmet:true},
 LANCER:{skin:'#b8788c',suit:'#3a1224',trim:'#ff5a8a',hair:'#2a0c16',angry:true},
 JUGGERNAUT:{skin:'#8a6a55',suit:'#33424d',trim:'#9fd8ff',hair:'#101820',scar:true}
};
function drawPortrait(who,x,y,s){
 const p=PORTRAITS[who]||PORTRAITS.RANDALL,c=ctx;
 c.save();c.translate(x,y);c.scale(s/100,s/100);
 const bg=c.createLinearGradient(0,0,0,100);bg.addColorStop(0,'#102230');bg.addColorStop(1,'#050b12');
 c.fillStyle=bg;c.fillRect(0,0,100,100);
 const halo=c.createRadialGradient(50,44,4,50,44,52);
 halo.addColorStop(0,p.trim+'55');halo.addColorStop(1,'transparent');
 c.fillStyle=halo;c.fillRect(0,0,100,100);
 c.fillStyle='rgba(255,255,255,.025)';for(let i=0;i<100;i+=4)c.fillRect(0,i,100,1);
 c.fillStyle=p.suit;c.beginPath();c.ellipse(50,110,48,36,0,0,TAU);c.fill();
 c.fillStyle=p.trim;c.fillRect(20,88,60,3);
 c.fillStyle=p.skin;c.fillRect(42,70,16,22);
 c.beginPath();c.ellipse(50,45,24,30,0,0,TAU);c.fill();
 c.beginPath();c.ellipse(25,48,4,7,0,0,TAU);c.ellipse(75,48,4,7,0,0,TAU);c.fill();
 if(p.helmet){
  c.fillStyle='rgba(120,220,220,.3)';c.beginPath();c.ellipse(50,42,30,34,0,0,TAU);c.fill();
  c.strokeStyle=p.trim;c.lineWidth=3;c.stroke();
  c.fillStyle='#0b2028';c.beginPath();c.ellipse(50,46,20,15,0,0,TAU);c.fill();
  c.fillStyle=p.trim;c.beginPath();c.ellipse(43,45,5,7,0,0,TAU);c.ellipse(57,45,5,7,0,0,TAU);c.fill();
 }else{
  if(p.hair){c.fillStyle=p.hair;c.beginPath();c.ellipse(50,24,25,15,0,Math.PI,TAU);c.fill();}
  c.fillStyle='#16212b';c.fillRect(36,40,12,3);c.fillRect(52,40,12,3);
  c.fillStyle=p.angry?'#ff6a5a':p.trim;c.fillRect(39,45,6,3);c.fillRect(55,45,6,3);
  c.strokeStyle='rgba(30,15,12,.75)';c.lineWidth=2;c.beginPath();c.moveTo(43,60);
  c.quadraticCurveTo(50,p.angry?57:63,57,60);c.stroke();
  if(p.scar){c.strokeStyle='#d9e8f0';c.lineWidth=2;c.beginPath();
   c.moveTo(37,34);c.lineTo(45,53);c.stroke();}
  if(p.visor){c.fillStyle='rgba(20,45,60,.9)';c.beginPath();c.ellipse(50,40,28,30,0,Math.PI,TAU);c.fill();
   c.strokeStyle=p.trim;c.lineWidth=2;c.beginPath();c.moveTo(24,42);c.lineTo(76,42);c.stroke();}
 }
 if(p.headset){c.strokeStyle=p.trim;c.lineWidth=3;c.beginPath();
  c.arc(50,45,29,Math.PI*1.05,Math.PI*1.95);c.stroke();
  c.fillStyle=p.trim;c.fillRect(72,44,5,12);c.fillRect(24,44,5,12);}
 c.strokeStyle='rgba(99,230,255,.45)';c.lineWidth=2;c.strokeRect(1,1,98,98);
 c.restore();
}
function drawBossCard(){
 const b=bossCard;if(!b||b.t<=0)return;
 const fade=Math.min(1,b.t/.45,(b.max-b.t)/.3),c='#'+(b.col>>>0).toString(16).padStart(6,'0');
 const w=Math.min(W-38,420),h=62,x=(W-w)/2,y=H*.17;
 ctx.save();ctx.globalAlpha=clamp(fade,0,1);ctx.textAlign='center';
 ctx.fillStyle='rgba(3,9,15,.90)';ctx.fillRect(x,y,w,h);
 ctx.fillStyle=c;ctx.fillRect(x,y,4,h);ctx.fillRect(x+w-4,y,4,h);
 ctx.font=uiFont(9,'bold');ctx.fillStyle=c;
 ctx.fillText(b.kind==='boss'?T('bossEncounter'):T('miniBossEncounter'),W/2,y+18);
 ctx.font=uiFont(18,'bold');ctx.fillStyle='#eaf6ff';ctx.fillText(loc(b.name),W/2,y+44);
 ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 ctx.restore();
}
function drawDialogue(){ctx.save();ctx.direction=isRTL()?'rtl':'ltr';const d=dialogue,cut=!!d.cutscene;
 const h=cut?Math.min(154,Math.max(122,H*.27)):134,y=H-h-14,x=14,w=W-28;
 if(cut){
  const bar=Math.max(26,H*.055);
  ctx.fillStyle='rgba(0,0,0,.92)';ctx.fillRect(0,0,W,bar);ctx.fillRect(0,H-bar,W,bar);
  ctx.fillStyle='#7a9ab0';ctx.font=uiFont(9);
  ctx.fillText((lang==='fa'?'آرشیو پیام — ':'TRANSMISSION ARCHIVE — ')+String(d.i+1).padStart(2,'0')+
   ' / '+String(d.lines.length).padStart(2,'0'),W/2,H-bar*.45);
 }
 panel(x,y,w,h);
 const ps=Math.min(cut?132:106,h-22),px=x+14,py=y+11;
 drawPortrait(d.who,px,py,ps);
 const tx=px+ps+16,tw=w-(ps+44);
 ctx.textAlign='left';ctx.fillStyle='#63e6ff';ctx.font=uiFont(15,'bold');ctx.fillText(loc(d.who),tx,y+30);
 ctx.fillStyle='#dfefff';ctx.font=uiFont(14);wrapText(loc(d.text),tx,y+56,tw,22);
 if(d.awaiting){
  const rects=choiceRects(d.options.length);
  d.options.forEach((o,i)=>{
   const r=rects[i],p=o.tone==='renegade'?'#ff7a6a':'#63e6ff';
   const sel=GamepadSys.active&&i===padChoice;
   ctx.fillStyle=sel?'rgba(99,230,255,.24)':'rgba(6,14,22,.94)';ctx.fillRect(r.x,r.y,r.w,r.h);
   ctx.strokeStyle=sel?'#eaf6ff':p;ctx.lineWidth=sel?2:1;ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);
   ctx.textAlign='left';ctx.fillStyle=p;ctx.font=uiFont(11,'bold');
   ctx.fillText((i+1)+'  '+loc(o.label),r.x+10,r.y+24);
  });
  ctx.textAlign='right';ctx.fillStyle='#7a9ab0';ctx.font=uiFont(10);
  ctx.fillText(lang==='fa'?'۱ / ۲ / یک گزینه را انتخاب کنید':'1 / 2 / TAP A CHOICE',x+w-18,y+h-14);
 } else {
  ctx.textAlign='right';ctx.fillStyle='#7a9ab0';ctx.font=uiFont(10);
  ctx.fillText(cut?(lang==='fa'?'ENTER / لمس برای ادامه':'ENTER / TAP TO CONTINUE'):
   (d.i+1)+' / '+d.lines.length+'   ·   '+(lang==='fa'?'ENTER / لمس برای ادامه':'ENTER / TAP TO CONTINUE'),x+w-18,y+h-14);
 } drawBossCard();ctx.restore();
}
function mpMenuRects(){const w=Math.min(360,W-40),x=(W-w)/2;return [H*.40,H*.52,H*.64].map(y=>({x,y:y-20,w,h:40}));}
function mpCoopRects(){const w=Math.min(360,W-40),x=(W-w)/2;return [H*.42,H*.54,H*.66].map(y=>({x,y:y-20,w,h:40}));}
function mpPvpModeRects(){const w=Math.min(360,W-40),x=(W-w)/2;return [H*.42,H*.54,H*.66].map(y=>({x,y:y-20,w,h:40}));}
function mpPvpJoinRects(){const w=Math.min(360,W-40),x=(W-w)/2;return [H*.42,H*.54,H*.66].map(y=>({x,y:y-20,w,h:40}));}
function mpLobbyRects(){const w=Math.min(360,W-40),x=(W-w)/2;return [H*.62,H*.72,H*.82].map(y=>({x,y:y-18,w,h:36}));}
function drawMpMenu(){
 ctx.save(); ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.92)';ctx.fillRect(0,0,W,H);
 const cx=W/2;ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(22,'bold');ctx.fillText(T('mpTitle'),cx,H*.20);
 ctx.fillStyle='#9fb8c8';ctx.font=uiFont(13);ctx.fillText(T('mpChoose'),cx,H*.27);
 const r=mpMenuRects();
 drawMenuCard(r[0],T('coop'),T('coopSub'),menuIdx===0,0);
 drawMenuCard(r[1],T('pvp'),T('pvpSub'),menuIdx===1,1);
 drawMenuCard(r[2],T('back'),T('backTitle'),menuIdx===2,2);
 ctx.fillStyle='#7a9ab0';ctx.font=uiFont(10);ctx.fillText(mp.status||'',cx,H*.90);

 ctx.restore();
}
function drawMpCoopMenu(){
 ctx.save(); ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.92)';ctx.fillRect(0,0,W,H);
 const cx=W/2;ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(22,'bold');ctx.fillText(T('coop'),cx,H*.20);
 ctx.fillStyle='#9fb8c8';ctx.font=uiFont(13);ctx.fillText(T('coopSub'),cx,H*.27);
 const r=mpCoopRects();
 drawMenuCard(r[0],T('hostCoop'),T('hostCoopSub'),menuIdx===0,0);
 drawMenuCard(r[1],T('joinCoop'),T('joinCoopSub'),menuIdx===1,1);
 drawMenuCard(r[2],T('back'),T('backMp'),menuIdx===2,2);

 ctx.restore();
}
function drawMpPvpModeMenu(){
 ctx.save(); ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.92)';ctx.fillRect(0,0,W,H);
 const cx=W/2;ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(22,'bold');ctx.fillText(T('pvpModeTitle'),cx,H*.20);
 ctx.fillStyle='#9fb8c8';ctx.font=uiFont(13);ctx.fillText(T('pvpModeSub'),cx,H*.27);
 const r=mpPvpModeRects();
 drawMenuCard(r[0],T('ffa'),T('ffaSub'),menuIdx===0,0);
 drawMenuCard(r[1],T('team'),T('teamSub'),menuIdx===1,1);
 drawMenuCard(r[2],T('back'),T('backMp'),menuIdx===2,2);

 ctx.restore();
}
function drawMpPvpJoinMenu(){
 ctx.save(); ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.92)';ctx.fillRect(0,0,W,H);
 const cx=W/2;ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(22,'bold');
 ctx.fillText(mp.pvpMode==='team'?T('team'):T('ffa'),cx,H*.20);
 ctx.fillStyle='#9fb8c8';ctx.font=uiFont(13);ctx.fillText(T('pvpJoinSub'),cx,H*.27);
 const r=mpPvpJoinRects();
 drawMenuCard(r[0],T('hostPvp'),T('hostPvpSub'),menuIdx===0,0);
 drawMenuCard(r[1],T('joinPvp'),T('joinPvpSub'),menuIdx===1,1);
 drawMenuCard(r[2],T('back'),T('pvpBackSel'),menuIdx===2,2);

 ctx.restore();
}
function drawMpLobby(){
 ctx.save(); ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.94)';ctx.fillRect(0,0,W,H);
 const cx=W/2,w=Math.min(680,W-30),x=cx-w/2;
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(22,'bold');
 ctx.fillText((mp.role==='host'?T('hostWord'):T('joinWord'))+' '+(mp.mode==='pvp'?T('pvpSurvival'):T('coopStory')),cx,H*.13);
 const pc=mpPeerCount?mpPeerCount():0;
 const pinfo = mp.mode==='pvp' ? (T('players')+(pc+1)+'/'+MP_MAX_PVP+'  '+(mp.pvpMode==='team'?T('team'):T('ffa'))) : (T('players')+(pc+1)+'/2');
 ctx.fillStyle='#9fb8c8';ctx.font=uiFont(12);ctx.fillText(pinfo,cx,H*.18);

 // Big status
 const status=mp.status||(lang==='fa'?'در حال آماده‌سازی...':'Preparing...');
 ctx.fillStyle='#eaf6ff';ctx.font=uiFont(16,'bold');wrapText(status,cx- w/2 +20,H*.28,w-40,24);
 ctx.textAlign='center';
 ctx.fillStyle='#7fb8cd';ctx.font=uiFont(11);
 const hint = mp.role==='host'
  ? (lang==='fa'?'هات‌اسپات را روشن کنید. دیگران با وای‌فای به شما وصل شوند؛ اتصال خودکار انجام می‌شود.':'Turn hotspot on. Others join your Wi-Fi; connection is automatic.')
  : (lang==='fa'?'به هات‌اسپات میزبان وصل شوید. اتصال خودکار انجام می‌شود.':'Connect to host hotspot/Wi-Fi. Connection is automatic.');
 wrapText(hint,cx-w/2+20,H*.36,w-40,18);

 // Small manual signal details
 ctx.textAlign='left';ctx.fillStyle='#55788d';ctx.font=uiFont(10);
 ctx.fillText((lang==='fa'?'سیگنال (پشتیبان دستی): ':'Signal (manual fallback): ')+(mp.signalText||T('noneYet')).slice(0,60)+'...',x,H*.48);

 const r=mpLobbyRects();
 drawMenuCard(r[0],mp.role==='host'?T('openHotspot'):T('openWifi'),mp.role==='host'?T('openHotspotSub'):T('openWifiSub'),menuIdx===0,0);
 const pvpHostReady = mp.host && mp.mode==='pvp' && mpPeerCount()>0;
 if(pvpHostReady){
  drawMenuCard(r[1],T('proceedLoadout'),T('proceedLoadoutSub'),menuIdx===1,1);
 } else {
  drawMenuCard(r[1],lang==='fa'?'تلاش دوباره اتصال خودکار':'RETRY AUTO CONNECT',lang==='fa'?'اسکن مجدد و اعمال سیگنال':'Rescan and apply signal automatically',menuIdx===1,1);
 }
 drawMenuCard(r[2],T('cancel'),T('cancelSub'),menuIdx===2,2);
 ctx.textAlign='center';ctx.fillStyle='#7a9ab0';ctx.font=uiFont(10);
 ctx.fillText(lang==='fa'?'در صورت نیاز، سیگنال دستی هنوز در پس‌زمینه کار می‌کند.':'Manual signal copy/paste still works in background if needed.',cx,H*.93);
 ctx.restore();
}
function mpLoadoutRects(){
 const cx=W/2,w=Math.min(720,W-30),x=cx-w/2,top=H*.24;
 const wRects=WEAPONS.map((_,i)=>({x:x+20+i*170,y:top,w:150,h:44}));
 const aRects=MP_ABILITIES.map((_,i)=>({x:x+20+(i%2)*220,y:top+120+Math.floor(i/2)*54,w:200,h:44}));
 const ready={x:cx-120,y:H*.82,w:240,h:40};
 return {wRects,aRects,ready};
}
function mpLoadoutClick(x,y){
 const R=mpLoadoutRects();
 for(let i=0;i<R.wRects.length;i++)if(inRect(x,y,R.wRects[i])){mp.loadout.weapon=WEAPONS[i];}
 for(let i=0;i<R.aRects.length;i++)if(inRect(x,y,R.aRects[i])){mp.loadout.ability=MP_ABILITIES[i].key;mp.loadout.uses=MP_ABILITIES[i].uses;}
 if(inRect(x,y,R.ready))advance();
}
function drawMpLoadout(){
 ctx.save(); ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.94)';ctx.fillRect(0,0,W,H);
 const cx=W/2,w=Math.min(720,W-30),x=cx-w/2;
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(20,'bold');
 ctx.fillText((mp.mode==='pvp'?'PVP':'CO-OP')+' '+T('loadout'),cx,H*.12);
 ctx.fillStyle='#9fb8c8';ctx.font=uiFont(12);
 let sub=T('loadoutSub');
 if(mp.mode==='pvp'&&mp.pvpMode==='team') sub+='  Team: '+(mp.team||'A');
 if(mp.mode==='pvp') sub+='  '+mp.pvpMode.toUpperCase();
 ctx.fillText(sub,cx,H*.17);
 const R=mpLoadoutRects();
 ctx.textAlign='left';ctx.fillStyle='#dfefff';ctx.font=uiFont(12);ctx.fillText(T('weapon'),x+20,H*.22);
 WEAPONS.forEach((w,i)=>{const r=R.wRects[i],sel=mp.loadout.weapon===w;
  ctx.fillStyle=sel?'rgba(99,230,255,.18)':'rgba(0,0,0,.25)';ctx.fillRect(r.x,r.y,r.w,r.h);
  ctx.strokeStyle=sel?'#63e6ff':'rgba(99,230,255,.25)';ctx.strokeRect(r.x,r.y,r.w,r.h);
  ctx.fillStyle=sel?'#eaf6ff':'#9fb8c8';const wl=lang==='fa'?(w==='rifle'?'کاربین':'شاتگان'):WDEF[w].label;ctx.fillText(wl,r.x+10,r.y+27);});
 ctx.fillStyle='#dfefff';ctx.fillText(T('abilityUse'),x+20,H*.22+116);
 MP_ABILITIES.forEach((a,i)=>{const r=R.aRects[i],sel=mp.loadout.ability===a.key;
  ctx.fillStyle=sel?'rgba(99,230,255,.18)':'rgba(0,0,0,.25)';ctx.fillRect(r.x,r.y,r.w,r.h);
  ctx.strokeStyle=sel?'#63e6ff':'rgba(99,230,255,.25)';ctx.strokeRect(r.x,r.y,r.w,r.h);
  ctx.fillStyle=sel?'#eaf6ff':'#9fb8c8';const an=lang==='fa'?({cloak:'پنهان‌سازی',barrier:'سپر',well:'چاه بیوتیک',dash:'دش بیوتیک'}[a.key]||a.name):a.name;ctx.fillText(an+'  ['+a.uses+' '+T('uses')+']',r.x+10,r.y+27);});
 const rr=R.ready;ctx.fillStyle=mp.localReady?'rgba(99,230,255,.12)':'rgba(99,230,255,.22)';
 ctx.fillRect(rr.x,rr.y,rr.w,rr.h);ctx.strokeStyle='#63e6ff';ctx.strokeRect(rr.x,rr.y,rr.w,rr.h);
 ctx.textAlign='center';ctx.fillStyle='#eaf6ff';ctx.font=uiFont(14,'bold');
 ctx.fillText(mp.localReady?T('readyWaiting'):T('readyStart'),cx,rr.y+25);
 ctx.fillStyle='#7a9ab0';ctx.font=uiFont(10);ctx.fillText(mp.status||'',cx,H*.93);

 ctx.restore();
}
function drawPause(){
 ctx.save(); ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.86)';ctx.fillRect(0,0,W,H);
 const cx=W/2;ctx.textAlign='center';
 ctx.fillStyle='#63e6ff';ctx.font=uiFont(12,'bold');ctx.fillText(lang==='fa'?'سیستم متوقف شد':'SYSTEM HALTED',cx,H*.24);
 ctx.fillStyle='#eaf6ff';ctx.font=uiFont(Math.min(34,W/11),'bold');
 ctx.fillText(T('paused'),cx,H*.31);
 const items=pauseItemRects();
 [T('resume'),T('restart'),T('mainMenu'),T('settings')].forEach((label,i)=>
  menuItem(label,items[i].y+15,menuIdx===i));
 ctx.fillStyle='#7a9ab0';ctx.font=uiFont(10);
 ctx.fillText(lang==='fa'?'ESC / دکمه توقف برای بازگشت':'ESC / TAP THE PAUSE BUTTON TO RETURN',cx,H*.72);
 ctx.restore();
}
function drawDead(){ctx.save();ctx.direction=isRTL()?'rtl':'ltr';ctx.fillStyle='rgba(40,0,0,.55)';ctx.fillRect(0,0,W,H);
 const cx=W/2;ctx.textAlign='center';ctx.fillStyle='#ff6a5a';ctx.font=uiFont(38,'bold');ctx.fillText(T('signalLost'),cx,H*.36);
 ctx.fillStyle='#dfefff';ctx.font=uiFont(14);ctx.fillText(T('down'),cx,H*.43);
 const rects=deadItemRects();
 drawMenuCard(rects[0],T('retry'),T('retrySub'),menuIdx===0,0);
 drawMenuCard(rects[1],T('abort'),T('abortSub'),menuIdx===1,1);ctx.restore();}
function drawVictory(){ctx.save();ctx.direction=isRTL()?'rtl':'ltr';ctx.fillStyle='rgba(4,9,15,.92)';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#eaf6ff';ctx.font=uiFont(Math.min(38,W/11),'bold');ctx.fillText(T('victory'),cx,H*.20);
 ctx.fillStyle='#9fb8c8';ctx.font=uiFont(13);
 const truth=campaign.flags.broadcastTruth
  ? 'The Alliance has the proof, and the truth is already spreading.'
  : 'The data is in your hands now. Cerberus will never know what it was worth.';
 const fate=campaign.flags.saveInali
  ? 'What was taken from Inali has been returned to her.'
  : 'Nothing of the core survived the redoubt.';
 const maxw=Math.min(520,W-48);
 wrapText('The Director is gone, and the thing built from Inali is silent. '+truth+' '+fate+' The Illusive Man is still out there, and the voice on the relay was only the beginning. Randall Ezno is no longer a ghost. He is a warning.',cx-maxw/2,H*.27,maxw,20);
 ctx.fillStyle='#63e6ff';ctx.font=uiFont(13);ctx.fillText(T('totalKills')+player.kills+'     '+T('best')+highscore,cx,H*.60);
 const rects=victoryItemRects();
 drawMenuCard(rects[0],T('mainMenu'),T('mainMenuSub'),menuIdx===0,0);
 drawMenuCard(rects[1],T('watchEpilogue'),T('watchSub'),menuIdx===1,1);
 drawMenuCard(rects[2],T('playAgain'),T('playSub'),menuIdx===2,2);ctx.restore();}
function drawGithub(){
 ctx.save();ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.94)';ctx.fillRect(0,0,W,H);
 const r=githubItemRects(),cx=W/2;
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(W<420?20:24,'bold');
 ctx.fillText(T('githubTitle'),cx,Math.max(58,r[0].y-42));
 ctx.fillStyle='#7fa3b8';ctx.font=uiFont(11);
 ctx.fillText(T('githubHint'),cx,Math.max(78,r[0].y-20));
 drawMenuCard(r[0],T('githubInfiltratorTitle'),T('githubInfiltratorSub'),menuIdx===0,0);
 drawMenuCard(r[1],T('githubGhostTitle'),T('githubGhostSub'),menuIdx===1,1);
 drawMenuCard(r[2],T('githubBack'),T('githubBackSub'),menuIdx===2,2);
 ctx.restore();
}
function drawInfo(){
 ctx.save();ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.94)';ctx.fillRect(0,0,W,H);
 const r=infoItemRects(),cx=W/2;
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(W<420?20:24,'bold');
 ctx.fillText(T('infoTitle'),cx,Math.max(58,r[0].y-42));
 ctx.fillStyle='#7fa3b8';ctx.font=uiFont(11);
 ctx.fillText(T('howSub'),cx,Math.max(78,r[0].y-20));
 drawMenuCard(r[0],T('aboutTitle'),T('aboutSub'),menuIdx===0,0);
 drawMenuCard(r[1],T('howTitle'),T('helpSub'),menuIdx===1,1);
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(11);
 ctx.fillText(T('infoHint'),cx,r[1].y+r[1].h+26);
 ctx.restore();
}
function drawHelp(){
 ctx.save();ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.94)';ctx.fillRect(0,0,W,H);
 const cx=W/2, margin=16;
 const w=Math.min(620,W-margin*2), x=cx-w/2;
 const padX=24, padTop=22, padBottom=20;
 const lines=T('helpLines')||I18N.en.helpLines;
 const titleH=44, footerH=28;
 const fontSize=W<420?12:13;
 ctx.font=fontSize+'px Eurostile';
 const maxTextW=w-padX*2;
 // precompute wrapped line heights
 const wrapped=[];
 for(const l of lines){
  const words=l.split(' '); let line='',count=1;
  for(const wd of words){ const t=line+wd+' '; if(ctx.measureText(t).width>maxTextW&&line){count++; line=wd+' ';} else line=t; }
  wrapped.push({text:l,rows:count});
 }
 const rowH=Math.max(18,Math.round(fontSize*1.55));
 const gap=Math.max(6,Math.round(fontSize*0.55));
 let contentH=0; for(const it of wrapped) contentH += it.rows*rowH + gap;
 contentH = Math.max(0, contentH-gap);
 const hNeeded = padTop + titleH + contentH + footerH + padBottom;
 const h=Math.min(H-margin*2, Math.max(260, hNeeded));
 const y=Math.max(margin, Math.round((H-h)/2));
 panel(x,y,w,h);
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(22,'bold');ctx.fillText(T('howTitle'),cx,y+padTop+24);
 ctx.textAlign='left';ctx.fillStyle='#cfe4f2';ctx.font=fontSize+'px Eurostile';
 let yy=y+padTop+titleH+8;
 const maxY=y+h-padBottom-footerH;
 for(const it of wrapped){
  if(yy + it.rows*rowH > maxY+2) break; // safety clamp
  const words=it.text.split(' '); let line='';
  for(const wd of words){
   const t=line+wd+' ';
   if(ctx.measureText(t).width>maxTextW&&line){ ctx.fillText(line,x+padX,yy); line=wd+' '; yy+=rowH; }
   else line=t;
  }
  ctx.fillText(line,x+padX,yy); yy+=rowH+gap;
 }
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(12);
 ctx.fillText(T('tapReturn'),cx,y+h-padBottom-6);
 ctx.restore();
}
function drawAbout(){
 // About is its own window, opened from the Info hub.
 ctx.save();ctx.direction=isRTL()?'rtl':'ltr';
 ctx.fillStyle='rgba(4,9,15,.94)';ctx.fillRect(0,0,W,H);
 const cx=W/2,margin=16,w=Math.min(640,W-margin*2),x=cx-w/2;
 const padX=22,padTop=20,padBottom=18,titleH=36,footerH=24;
 const fs=W<420?12:13,lh=Math.round(fs*1.55),maxW=w-padX*2;
 ctx.font=fs+'px Eurostile';
 const wrap=s=>{const out=[];let line='';
  for(const wd of String(s).split(' ')){const t=line+wd+' ';
   if(ctx.measureText(t).width>maxW&&line){out.push(line.trim());line=wd+' ';}else line=t;}
  if(line.trim())out.push(line.trim());return out;};
 const lines=[...wrap(T('aboutText')),...wrap(T('aboutBody'))];
 const h=Math.min(H-margin*2,Math.max(260,padTop+titleH+lines.length*lh+footerH+padBottom));
 const y=Math.max(margin,Math.round((H-h)/2));
 panel(x,y,w,h);
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(W<420?18:22,'bold');
 ctx.fillText(T('aboutTitle'),cx,y+padTop+22);
 ctx.textAlign='left';ctx.fillStyle='#cfe4f2';ctx.font=fs+'px Eurostile';
 let yy=y+padTop+titleH;
 const maxY=y+h-padBottom-footerH;
 for(const line of lines){if(yy+lh>maxY)break;ctx.fillText(line,x+padX,yy);yy+=lh;}
 ctx.textAlign='center';ctx.fillStyle='#63e6ff';ctx.font=uiFont(12);
 ctx.fillText(T('tapReturnAbout'),cx,y+h-padBottom-6);
 ctx.restore();
}
function bar(x,y,w,h,f,c,label){ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(x,y,w,h);
 ctx.fillStyle=c;ctx.fillRect(x,y,w*clamp(f,0,1),h);ctx.strokeStyle='rgba(255,255,255,.15)';ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 ctx.fillStyle='#dfefff';ctx.font=uiFont(9);ctx.textAlign='left';ctx.fillText(label,x+4,y-3);}
function abilityBtn(r,f,c,icon,label,locked){
 const ready=f>=.999&&!locked;
 const round=Math.abs(r.w-r.h)<2;
 ctx.fillStyle='rgba(6,18,28,.78)';
 if(round){ctx.beginPath();ctx.arc(r.x+r.w/2,r.y+r.h/2,r.w/2-1,0,TAU);ctx.fill();}
 else ctx.fillRect(r.x,r.y,r.w,r.h);
 ctx.strokeStyle=locked?'rgba(90,130,155,.45)':(ready?c:'rgba(90,130,155,.45)');
 ctx.lineWidth=2;
 if(round){ctx.beginPath();ctx.arc(r.x+r.w/2,r.y+r.h/2,r.w/2-1,0,TAU);ctx.stroke();}
 else ctx.strokeRect(r.x+1,r.y+1,r.w-2,r.h-2);
 ctx.save();ctx.translate(r.x+r.w/2,r.y+r.h/2-3);
 if(icon==='melee')ctx.scale(.84,.84);
 ctx.strokeStyle=locked||!ready?'#5c7a8e':c;ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2;
 if(locked){
  ctx.strokeRect(-8,-2,16,12);
  ctx.beginPath();ctx.arc(0,-2,6,Math.PI,0);ctx.stroke();
 }else if(icon==='cloak'){
  // Fading helmet: a solid rig dissolving into blue scanlines.
  ctx.beginPath();ctx.arc(-4,-5,4,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-10,7);ctx.lineTo(-10,1);
  ctx.quadraticCurveTo(-4,-3,2,1);ctx.lineTo(2,7);ctx.stroke();
  for(let i=0;i<3;i++){
   ctx.globalAlpha=.75-i*.22;
   ctx.fillRect(6+i*3,-7+i*2,1.5,14-i*4);
  }
  ctx.globalAlpha=1;
 }else if(icon==='dash'){
  ctx.beginPath();ctx.moveTo(-12,-9);ctx.lineTo(4,0);ctx.lineTo(-12,9);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-2,-9);ctx.lineTo(14,0);ctx.lineTo(-2,9);ctx.stroke();
 }else if(icon==='melee'){
  // Armored fist: knuckles plus a biotic palm flare.
  ctx.fillRect(-9,-2,18,13);
  for(let i=-1;i<=1;i++)ctx.fillRect(-9+i*6,-8,5,7);
  ctx.beginPath();ctx.moveTo(-9,4);ctx.lineTo(-15,7);ctx.stroke();
  ctx.beginPath();ctx.arc(0,12,5,Math.PI,0);ctx.stroke();
 }else if(icon==='barrier'){
  ctx.beginPath();
  for(let i=0;i<6;i++){
   const a=-Math.PI/2+i*TAU/6,x=Math.cos(a)*11,y=Math.sin(a)*11;
   if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
  ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,4,0,TAU);ctx.fill();
 }else{
  for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(0,0,i*4,-Math.PI*.2,Math.PI*1.2);ctx.stroke();}
  ctx.beginPath();ctx.arc(0,0,2,0,TAU);ctx.fill();
 }
 ctx.restore();
 if(label){
  ctx.fillStyle=locked?'#5c7a8e':(ready?c:'#8fb0c4');
  ctx.font=uiFont(8);ctx.textAlign='center';
  ctx.fillText(label,r.x+r.w/2,r.y+11);
 }
 ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(r.x+4,r.y+r.h-9,r.w-8,5);
 ctx.fillStyle=locked?'#5c7a8e':c;ctx.fillRect(r.x+4,r.y+r.h-9,(r.w-8)*clamp(f,0,1),5);
}
function drawHexFlag(x,y,r,c){
 ctx.save();hexPath(x,y,r);ctx.fillStyle=c;ctx.fill();
 ctx.strokeStyle='rgba(255,220,220,.7)';ctx.lineWidth=1;ctx.stroke();
 ctx.fillStyle='#fff';ctx.font=uiFont(7,'bold');ctx.textAlign='center';
 ctx.fillText('!',x,y+3);ctx.restore();
}
// Chamfered top-right / bottom-left tactical panel used for the weapon carousel.
function chamferPath(x,y,w,h,c){
 ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w-c,y);ctx.lineTo(x+w,y+c);
 ctx.lineTo(x+w,y+h);ctx.lineTo(x+c,y+h);ctx.lineTo(x,y+h-c);ctx.closePath();}
function gunSilhouette(kind,x,y,w,h){
 ctx.save();ctx.translate(x,y);ctx.scale(w/100,h/40);ctx.fillStyle='#eaf6ff';
 if(kind==='rifle'){
  ctx.beginPath();ctx.moveTo(1,12);ctx.lineTo(19,12);ctx.lineTo(19,19);
  ctx.lineTo(8,19);ctx.lineTo(1,28);ctx.lineTo(1,23);ctx.lineTo(8,17);
  ctx.lineTo(1,17);ctx.closePath();ctx.fill();
  ctx.fillRect(17,14,15,5);
  ctx.fillRect(30,11,31,12);ctx.fillRect(44,8,8,3);
  ctx.beginPath();ctx.moveTo(39,23);ctx.lineTo(47,23);ctx.lineTo(45,37);
  ctx.lineTo(37,37);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(51,23);ctx.lineTo(61,23);
  ctx.quadraticCurveTo(64,32,59,39);ctx.lineTo(51,37);
  ctx.quadraticCurveTo(55,30,51,23);ctx.closePath();ctx.fill();
  ctx.fillRect(61,13,23,8);
  ctx.fillStyle='rgba(10,30,45,.85)';for(let i=0;i<3;i++)ctx.fillRect(65+i*7,14,3,6);
  ctx.fillStyle='#eaf6ff';ctx.fillRect(84,16,11,3);ctx.fillRect(95,13,5,9);
 }else{
  ctx.fillRect(1,14,20,6);
  ctx.beginPath();ctx.moveTo(1,20);ctx.lineTo(15,20);ctx.lineTo(1,31);ctx.closePath();ctx.fill();
  ctx.fillRect(20,11,32,13);ctx.fillRect(40,8,7,3);
  ctx.fillRect(36,24,15,5);
  ctx.fillStyle='rgba(10,30,45,.85)';for(let i=0;i<4;i++)ctx.fillRect(38+i*3.5,24,1.5,5);
  ctx.fillStyle='#eaf6ff';ctx.fillRect(52,17,31,5);ctx.fillRect(83,17,12,3);
  ctx.fillRect(95,15,5,7);
 }
 ctx.restore();}
function chevron(r,dir){
 const cx=r.x+r.w/2,cy=r.y+r.h/2;
 ctx.fillStyle='rgba(200,240,255,.9)';ctx.beginPath();
 if(dir<0){ctx.moveTo(cx+5,cy-7);ctx.lineTo(cx-4,cy);ctx.lineTo(cx+5,cy+7);}
 else{ctx.moveTo(cx-5,cy-7);ctx.lineTo(cx+4,cy);ctx.lineTo(cx-5,cy+7);}
 ctx.closePath();ctx.fill();}
function drawPauseBtn(){
 const r=pauseRect(),cut=8;
 ctx.save();
 chamferPath(r.x,r.y,r.w,r.h,cut);
 ctx.fillStyle='rgba(6,14,22,.82)';ctx.fill();
 chamferPath(r.x+.5,r.y+.5,r.w-1,r.h-1,cut-1);
 ctx.strokeStyle='rgba(99,230,255,.62)';ctx.lineWidth=2;ctx.stroke();
 const bw=Math.max(4,r.w*.075),gap=Math.max(3,r.w*.055),bh=r.h*.52;
 const bx=r.x+r.w/2-gap/2-bw,by=r.y+(r.h-bh)/2;
 ctx.fillStyle='#dffbff';ctx.fillRect(bx,by,bw,bh);
 ctx.fillRect(bx+bw+gap,by,bw,bh);
 ctx.restore();
}
function drawWeaponPanel(){
 const r=weaponRects().panel,w=player.weapon,heat=weaponHeatFraction(),cut=10;
 ctx.save();
 chamferPath(r.x,r.y,r.w,r.h,cut);
 ctx.fillStyle='rgba(6,18,30,.82)';ctx.fill();
 // Transparent red heat rises from the bottom and fills the full button at
 // the fire limit. It drains back down while the weapon reloads.
 if(heat>.001){
  ctx.save();chamferPath(r.x,r.y,r.w,r.h,cut);ctx.clip();
  ctx.fillStyle='rgba(255,64,48,.34)';
  ctx.fillRect(r.x,r.y+r.h*(1-heat),r.w,r.h*heat);
  ctx.fillStyle='rgba(255,190,170,.10)';
  for(let y=r.y+r.h*(1-heat);y<r.y+r.h;y+=7)ctx.fillRect(r.x,y,r.w,1);
  ctx.restore();
 }
 const hot=heat>.75;
 chamferPath(r.x+.5,r.y+.5,r.w-1,r.h-1,cut-1);
 ctx.strokeStyle=hot?'rgba(255,120,90,.92)':'rgba(99,230,255,.62)';
 ctx.lineWidth=2;ctx.stroke();
 const cx=r.x+r.w/2;
 wheelIcon('weapon',w,cx,r.y+r.h*.34,Math.min(r.w*.23,22),hot?'#ffd0c4':'#bff4ff');
 ctx.textAlign='center';ctx.fillStyle='#eaf6ff';ctx.font=uiFont(9,'bold');
 ctx.fillText(lang==='fa'?(w==='rifle'?'کاربین':'شاتگان'):WDEF[w].label,cx,r.y+r.h*.68);
 ctx.font=uiFont(8);ctx.fillStyle=hot?'#ffc0b0':'#8fc4dc';
 ctx.fillText(player.ammo+' / '+player.reserve[w],cx,r.y+r.h*.84);
 ctx.restore();
}
function drawBioticButton(){
 const r=bioticWheelRect(),act=activeBiotic(),rem=bioticCooldownRemaining();
 const cooling=rem>.001,fa={well:'چاه',dash:'داش',barrier:'سپر'};
 ctx.save();
 chamferPath(r.x,r.y,r.w,r.h,10);
 ctx.fillStyle='rgba(6,18,30,.82)';ctx.fill();
 // Shared biotic timer: blue fills only while any power is cooling down.
 if(cooling){
  ctx.save();chamferPath(r.x,r.y,r.w,r.h,10);ctx.clip();
  ctx.fillStyle='rgba(72,170,255,.34)';
  ctx.fillRect(r.x,r.y+r.h*(1-rem),r.w,r.h*rem);
  ctx.fillStyle='rgba(190,230,255,.10)';
  for(let y=r.y+r.h*(1-rem);y<r.y+r.h;y+=7)ctx.fillRect(r.x,y,r.w,1);
  ctx.restore();
 }
 chamferPath(r.x+.5,r.y+.5,r.w-1,r.h-1,9);
 ctx.strokeStyle=cooling?'rgba(130,205,255,.92)':'rgba(99,230,255,.62)';
 ctx.lineWidth=2;ctx.stroke();
 const col=act?act.color:'#63e6ff',cx=r.x+r.w/2,cy=r.y+r.h*.45;
 // Only the running power gets a specific icon; otherwise a generic biotic sigil.
 wheelIcon('biotic',act?act.key:'generic',cx,cy,Math.min(r.w*.23,23),
  cooling?'#eaf6ff':col);
 ctx.textAlign='center';ctx.font=uiFont(8,'bold');
 ctx.fillStyle=act||cooling?'#eaf6ff':'#8fc4dc';
 const name=act?(lang==='fa'?(fa[act.key]||act.name):act.name):'';
 ctx.fillText(act?T('bioticActive')+' '+name:(cooling?T('bioticCooldown'):T('biotic')),
  cx,r.y+r.h-7);
 ctx.restore();
}
function drawFirePad(){
 const P=firePad(),f=touch.fire,ox=f?f.ox:0,oy=f?f.oy:0;
 ctx.save();
 ctx.beginPath();ctx.arc(P.cx,P.cy,P.r,0,TAU);
 ctx.fillStyle='rgba(8,22,34,.55)';ctx.fill();
 ctx.strokeStyle='rgba(99,230,255,.5)';ctx.lineWidth=2;ctx.stroke();
 ctx.beginPath();ctx.arc(P.cx,P.cy,P.r*.6,0,TAU);
 ctx.strokeStyle='rgba(99,230,255,.18)';ctx.lineWidth=1;ctx.stroke();
 const mag=Math.hypot(ox,oy);
 if(mag>6){ctx.beginPath();ctx.moveTo(P.cx,P.cy);ctx.lineTo(P.cx+ox,P.cy+oy);
  ctx.strokeStyle='rgba(99,230,255,.55)';ctx.lineWidth=2;ctx.stroke();}
 ctx.beginPath();ctx.arc(P.cx+ox,P.cy+oy,16,0,TAU);
 ctx.fillStyle=mag>6?'rgba(99,230,255,.55)':'rgba(120,160,185,.35)';ctx.fill();
 ctx.strokeStyle='#bff4ff';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#63e6ff';ctx.font=uiFont(9);ctx.textAlign='center';
 ctx.fillText(lang==='fa'?'شلیک':'FIRE',P.cx,P.cy+P.r+14);
 ctx.restore();
}
function miniBar(x,y,w,h,f,c){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(x,y,w,h);
 ctx.fillStyle=c;ctx.fillRect(x,y,w*clamp(f,0,1),h);
 ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(x,y,w,1);}
function vitalsRect(){return hudStack().vitals;}
function objectiveRect(){return hudStack().objective;}
function segmentedBar(x,y,w,h,f,c){
 ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(x,y,w,h);
 ctx.fillStyle=c;ctx.fillRect(x,y,w*clamp(f,0,1),h);
 ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(x,y,w,1);
 ctx.fillStyle='rgba(4,9,14,.8)';
 for(let i=10;i<w;i+=10)ctx.fillRect(x+i,y,1,h);
 ctx.strokeStyle='rgba(180,230,255,.14)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
}
function drawGear(cx,cy,r){
 ctx.save();ctx.translate(cx,cy);ctx.fillStyle='rgba(190,236,255,.92)';
 for(let i=0;i<8;i++){
  ctx.save();ctx.rotate(i*TAU/8);ctx.fillRect(r*.72,-1.1,r*.56,2.2);ctx.restore();
 }
 ctx.beginPath();ctx.arc(0,0,r*.7,0,TAU);ctx.fill();
 ctx.fillStyle='#07131d';ctx.beginPath();ctx.arc(0,0,r*.3,0,TAU);ctx.fill();
 ctx.restore();
}
function hexPath(x,y,r){
 ctx.beginPath();
 for(let i=0;i<6;i++){
  const a=-Math.PI/2+i*TAU/6,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
  if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);
 }
 ctx.closePath();
}
function drawMiniOverlay(x,y,ms){
 // A clean tactical frame replaces the old hex/M overlay. A translucent blue
 // band sweeps from the bottom to the top on a repeating timer.
 ctx.save();ctx.beginPath();ctx.rect(x,y,ms,ms);ctx.clip();
 const scan=(time/7.5)%1,sy=y+ms*(1-scan),g=ctx.createLinearGradient(0,sy-12,0,sy+12);
 g.addColorStop(0,'rgba(99,230,255,0)');
 g.addColorStop(.5,'rgba(99,230,255,.34)');
 g.addColorStop(1,'rgba(99,230,255,0)');
 ctx.fillStyle=g;ctx.fillRect(x,sy-12,ms,24);
 ctx.fillStyle='rgba(180,245,255,.72)';ctx.fillRect(x,sy-1,ms,2);
 ctx.restore();
 ctx.save();ctx.strokeStyle='rgba(99,230,255,.72)';ctx.lineWidth=2;
 const c=Math.max(7,Math.round(ms*.12));
 ctx.beginPath();
 ctx.moveTo(x,y+c);ctx.lineTo(x,y);ctx.lineTo(x+c,y);
 ctx.moveTo(x+ms-c,y);ctx.lineTo(x+ms,y);ctx.lineTo(x+ms,y+c);
 ctx.moveTo(x+ms,y+ms-c);ctx.lineTo(x+ms,y+ms);ctx.lineTo(x+ms-c,y+ms);
 ctx.moveTo(x+c,y+ms);ctx.lineTo(x,y+ms);ctx.lineTo(x,y+ms-c);
 ctx.stroke();ctx.restore();
}
function drawCloakButton(){
 const c=cloakRect(),f=cloakCooldownFraction();
 ctx.save();
 ctx.shadowColor='#63e6ff';ctx.shadowBlur=12;
 ctx.beginPath();ctx.arc(c.cx,c.cy,c.r,0,TAU);
 ctx.fillStyle='rgba(7,20,32,.72)';ctx.fill();
 ctx.strokeStyle='rgba(99,230,255,.72)';ctx.lineWidth=2;ctx.stroke();
 ctx.shadowBlur=0;
 ctx.strokeStyle='#bff4ff';ctx.lineWidth=Math.max(1.5,c.r*.08);
 ctx.beginPath();ctx.arc(c.cx,c.cy-c.r*.34,c.r*.18,0,TAU);ctx.stroke();
 ctx.beginPath();
 ctx.moveTo(c.cx-c.r*.32,c.cy+c.r*.36);
 ctx.lineTo(c.cx-c.r*.22,c.cy-c.r*.08);
 ctx.lineTo(c.cx+c.r*.22,c.cy-c.r*.08);
 ctx.lineTo(c.cx+c.r*.32,c.cy+c.r*.36);
 ctx.moveTo(c.cx-c.r*.22,c.cy);ctx.lineTo(c.cx-c.r*.44,c.cy+c.r*.22);
 ctx.moveTo(c.cx+c.r*.22,c.cy);ctx.lineTo(c.cx+c.r*.44,c.cy+c.r*.22);
 ctx.stroke();
 ctx.lineWidth=3;
 ctx.strokeStyle='rgba(99,230,255,.16)';
 ctx.beginPath();ctx.arc(c.cx,c.cy,c.r*.84,-Math.PI*.8,Math.PI*1.2);ctx.stroke();
 ctx.strokeStyle=f>=1?'#63e6ff':'#7fb8cd';
 ctx.beginPath();ctx.arc(c.cx,c.cy,c.r*.84,-Math.PI*.8,-Math.PI*.8+TAU*f);ctx.stroke();
 ctx.textAlign='center';ctx.font=uiFont(7,'bold');ctx.fillStyle='#bff4ff';
 ctx.fillText(lang==='fa'?'پنهانسازی':'CLOAK',c.cx,c.cy+c.r+9);
 ctx.restore();
}
function slotCooldown(kind,s){
 if(!s.available())return 0;
 if(kind==='weapon')return s.key!==player.weapon?1:
  (player.reload>0?1-player.reload/reloadDuration(player.weapon):1);
 /* all unlocked biotics share the same timer */
 return bioticCooldownFraction();
}
function wheelIcon(kind,key,x,y,r,col){
 ctx.save();ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=2;
 if(key==='beam'){
  ctx.beginPath();ctx.moveTo(x-r,y+r*.5);ctx.lineTo(x-r*.2,y);
  ctx.lineTo(x+r*.2,y+r*.35);ctx.lineTo(x+r,y-r*.5);ctx.stroke();
 } else if(key==='rifle'||key==='assault'){
  ctx.fillRect(x-r*.75,y-r*.18,r*1.5,r*.36);
  ctx.fillRect(x-r*.2,y+r*.18,r*.35,r*.55);
 } else if(key==='shotgun'){
  ctx.fillRect(x-r*.75,y-r*.34,r*1.5,r*.24);
  ctx.fillRect(x-r*.75,y+r*.1,r*1.5,r*.24);
 } else if(key==='sniper'){
  ctx.fillRect(x-r*.8,y-r*.1,r*1.6,r*.2);
  ctx.strokeRect(x-r*.25,y-r*.62,r*.5,r*.3);
 } else if(key==='well'){
  ctx.beginPath();ctx.arc(x,y,r*.72,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r*.28,0,TAU);ctx.fill();
 } else if(key==='dash'){
  ctx.beginPath();ctx.moveTo(x-r*.7,y+r*.5);ctx.lineTo(x+r*.5,y-r*.5);
  ctx.lineTo(x+r*.1,y-r*.5);ctx.moveTo(x+r*.5,y-r*.5);
  ctx.lineTo(x+r*.5,y-r*.05);ctx.stroke();
 } else if(key==='barrier'){
  ctx.beginPath();ctx.moveTo(x,y-r*.8);ctx.lineTo(x+r*.68,y-r*.4);
  ctx.lineTo(x+r*.68,y+r*.4);ctx.lineTo(x,y+r*.8);
  ctx.lineTo(x-r*.68,y+r*.4);ctx.lineTo(x-r*.68,y-r*.4);ctx.closePath();ctx.stroke();
 } else if(key==='generic'){
  ctx.beginPath();ctx.arc(x,y,r*.72,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,y-r*.72);ctx.lineTo(x+r*.58,y);
  ctx.lineTo(x,y+r*.72);ctx.lineTo(x-r*.58,y);ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r*.18,0,TAU);ctx.fill();
 } else {
  ctx.beginPath();ctx.arc(x,y,r*.65,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x-r*.35,y);
  ctx.moveTo(x+r*.35,y);ctx.lineTo(x+r,y);
  ctx.moveTo(x,y-r);ctx.lineTo(x,y-r*.35);ctx.moveTo(x,y+r*.35);ctx.lineTo(x,y+r);ctx.stroke();
 }
 ctx.restore();
}
// Eased opening, but slots begin already out on their arc: the motion is a
// short settle, not a collapse into the button where they disappear.
function wheelReveal(){
 const t=clamp((performance.now()-wheel.activeAt)/120,0,1);
 return 1-Math.pow(1-t,3);
}
function wheelSlotPos(kind,i,e){
 const a=wheelAnchor(kind),p=wheelPoint(kind,i),travel=.45+.55*e;
 return {x:a.cx+(p.x-a.cx)*travel,y:a.cy+(p.y-a.cy)*travel};
}
function drawWheel(){
 if(!wheel.active||!wheel.kind)return;
 const g=wheelGeom(wheel.kind),slots=wheelSlots(wheel.kind),a=wheelAnchor(wheel.kind),
  ac=wheel.kind==='weapon',btn=clamp(W*.022,26,44),e=wheelReveal(),
  sbtn=btn*(.9+.1*e),
  a0=g.angles[slots[0].pos]-.11,a1=g.angles[slots[slots.length-1].pos]+.11;
 ctx.save();
 ctx.globalAlpha=.45+.55*e;
 // Original wheel rails span only the slots this fork actually owns.
 ctx.strokeStyle='rgba(99,230,255,.17)';ctx.lineWidth=btn*.7;
 ctx.beginPath();ctx.arc(g.cx,g.cy,g.r,a0,a1,ac);ctx.stroke();
 ctx.strokeStyle='rgba(99,230,255,.5)';ctx.lineWidth=2;
 ctx.beginPath();ctx.arc(g.cx,g.cy,g.r+sbtn*.95,a0,a1,ac);ctx.stroke();
 for(let i=0;i<slots.length;i++){
  const s=slots[i],p=wheelSlotPos(wheel.kind,i,e),
   px=p.x,py=p.y,sel=i===wheel.idx,av=s.available(),col=av?s.col:'#45606f',
   f=slotCooldown(wheel.kind,s),alpha=.45+.55*e;
  ctx.shadowColor=col;ctx.shadowBlur=sel?16:(av?6:0);
  hexPath(px,py,sbtn);
  ctx.fillStyle=sel?'rgba(99,230,255,.26)':(av?'rgba(5,17,27,.92)':'rgba(5,12,18,.9)');ctx.fill();
  ctx.strokeStyle=sel?'#e2fbff':col;ctx.lineWidth=sel?2.5:1.5;ctx.stroke();
  ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(99,230,255,.14)';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(px,py,sbtn*.86,0,TAU);ctx.stroke();
  ctx.strokeStyle=f>=1?col:'rgba(150,190,205,.7)';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(px,py,sbtn*.86,-Math.PI/2,-Math.PI/2+TAU*f);ctx.stroke();
  ctx.globalAlpha=alpha*(av?1:.35);
  wheelIcon(wheel.kind,s.key,px,py,sbtn*.44,col);
  ctx.globalAlpha=alpha;
  if(sel){
   ctx.textAlign='center';ctx.font=uiFont(8,'bold');ctx.fillStyle='#eaf6ff';
   ctx.fillText(wheelLabel(wheel.kind,s),px,py+sbtn+12);
  }
 }
 // Hold feedback on the corner icon stays crisp while the arc settles.
 ctx.globalAlpha=1;
 const pulse=.5+.5*Math.sin(time*9);
 hexPath(a.cx,a.cy,clamp(W*.025,28,44)+pulse*3);
 ctx.strokeStyle='rgba(150,240,255,'+(.35+.3*pulse)+')';ctx.lineWidth=2;ctx.stroke();
 ctx.restore();
}
// Remaining fraction drives saturation, not brightness: low bars keep their
// luminance but lose their cyan/green/red toward neutral steel. No numbers.
function vitalColor(hex,f){
 const n=parseInt(hex.slice(1),16),k=.25+.75*clamp(f,0,1),
  nr=0x9a,ng=0xa8,nb=0xb0;
 const r=Math.round(nr+(((n>>16)&255)-nr)*k),
  g=Math.round(ng+(((n>>8)&255)-ng)*k),b=Math.round(nb+((n&255)-nb)*k);
 return 'rgb('+r+','+g+','+b+')';
}
function vitalRow(x,y,w,h,f,col,label,bright){
 ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(x,y,w,h);
 ctx.fillStyle=vitalColor(col,f);ctx.fillRect(x,y,w*clamp(f,0,1),h);
 ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x,y,w,1);
 ctx.fillStyle='rgba(4,9,14,.72)';
 for(let i=12;i<w;i+=12)ctx.fillRect(x+i,y,1,h);
 ctx.strokeStyle='rgba(180,230,255,.16)';ctx.lineWidth=1;
 ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 ctx.save();ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=2;
 ctx.font=uiFont(8,'bold');ctx.textAlign='left';
 ctx.fillStyle=bright?'#ffffff':'#d8f1ff';ctx.fillText(label,x+3,y+h-1);
 ctx.restore();
}
function currentObjectiveStage(){
 return (mp.active&&mp.mode==='pvp')?null:(LEVELS[levelIdx]&&LEVELS[levelIdx].stages[objective.stage]);
}
function objectiveLabel(){
 const st=currentObjectiveStage();
 return st?loc(st.label):(mp.active?(lang==='fa'?'بقا در نبرد':'PVP SURVIVAL'):
  objective.done?(lang==='fa'?'ماموریت کامل':'MISSION COMPLETE'):(lang==='fa'?'هدف':'OBJECTIVE'));
}
function objectiveProgress(){
 const st=currentObjectiveStage();
 return st?objectiveFraction(st):(mp.active?clamp((mp.pvpRound||1)/5,0,1):(objective.done?1:0));
}
function drawObjectivePanel(){
 const r=objectiveRect(),bx=r.x+8,bw=r.w-16,
  label=objectiveLabel(),frac=clamp(objectiveProgress(),0,1);
 ctx.save();
 chamferPath(r.x,r.y,r.w,r.h,7);
 ctx.fillStyle='rgba(4,12,20,.9)';ctx.fill();
 ctx.strokeStyle='rgba(99,230,255,.36)';ctx.lineWidth=1;ctx.stroke();
 ctx.textAlign='center';ctx.fillStyle='#eaf6ff';
 ctx.font=uiFont(label.length>22?clamp(W*.007,8,10):clamp(W*.0085,9,12),'bold');
 ctx.fillText(label,r.x+r.w/2,r.y+11);
 ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(bx,r.y+14,bw,3);
 const pg=ctx.createLinearGradient(bx,0,bx+bw,0);
 pg.addColorStop(0,'#2f7fa3');pg.addColorStop(1,'#8fe8ff');
 ctx.fillStyle=pg;ctx.fillRect(bx,r.y+14,bw*frac,3);
 ctx.restore();
}
function drawVitals(){
 const r=vitalsRect(),q=time-(player.lastHit||0);
 const shf=clamp(player.sh/maxShield(),0,1),hpf=clamp(player.hp/player.maxhp,0,1);
 const shReg=q>REGEN.shieldDelay&&shf<1,hpReg=q>REGEN.healthDelay&&hpf<1;
 const bx=r.x+8,bw=r.w-16;
 ctx.save();
 chamferPath(r.x,r.y,r.w,r.h,8);
 ctx.fillStyle='rgba(4,12,20,.9)';ctx.fill();
 ctx.strokeStyle='rgba(99,230,255,.44)';ctx.lineWidth=1;ctx.stroke();
 chamferPath(r.x+3,r.y+3,r.w-6,r.h-6,6);
 ctx.strokeStyle='rgba(99,230,255,.1)';ctx.stroke();
 vitalRow(bx,r.y+8,bw,11,shf,'#63e6ff',T('sh'),shReg);
 vitalRow(bx,r.y+23,bw,11,hpf,hpf<.3?'#ff6a5a':'#5dff9a',T('hp'),hpReg);
 ctx.restore();
}
function objectiveFraction(st){
 if(objective.done)return 1;
 if(!st)return 0;
 if(st.type==='enable'){
  const n=objective.nodes||[];return n.length?n.filter(x=>x.lit).length/n.length:0;}
 if(st.type==='destroy')return objective.device?clamp(1-objective.device.hp/objective.device.maxhp,0,1):0;
 if(st.type==='defend')return clamp(objective.t/st.dur,0,1);
 if(st.type==='implant')return objective.carried?0.5:0;
 return objective.progress||0;
}
function objectiveSubLabel(st){
 if(!st)return '';
 if(st.type==='enable')return (objective.nodes||[]).filter(n=>n.lit).length+'/'+(objective.nodes||[]).length+(lang==='fa'?' گره':' NODES');
 if(st.type==='destroy')return (lang==='fa'?'هسته ':'CORE ')+Math.max(0,Math.round(objective.device?objective.device.hp:0));
 if(st.type==='defend')return Math.max(0,Math.ceil(st.dur-objective.t))+'s  ·  '+(lang==='fa'?'آرایه ':'ARRAY ')+Math.max(0,Math.round(objective.device?objective.device.hp:0));
 if(st.type==='implant')return objective.carried?(lang==='fa'?'قطعه بارگذاری شد':'SHARD LOADED'):(lang==='fa'?'قطعه شناسایی شد':'SHARD DETECTED');
 return '';
}
function drawInteractBtn(){
 const st=LEVELS[levelIdx]&&LEVELS[levelIdx].stages[objective.stage];
 if(!st||st.type!=='implant'||objective.done)return;
 const near=nearObjective(),I=interactRect(),held=near&&holdingInteract();
 ctx.save();ctx.globalAlpha=near?1:.42;
 ctx.fillStyle=held?'rgba(99,230,255,.24)':'rgba(6,18,28,.9)';
 ctx.fillRect(I.x,I.y,I.w,I.h);
 ctx.strokeStyle=held?'#dffbff':'#63e6ff';ctx.lineWidth=2;
 ctx.strokeRect(I.x+1,I.y+1,I.w-2,I.h-2);
 ctx.textAlign='center';ctx.fillStyle='#e6faff';ctx.font=uiFont(12,'bold');
 ctx.fillText(near
  ?(objective.carried?(lang==='fa'?'لمس  ◈  جاگذاری قطعه':'TAP  ◈  IMPLANT SHARD'):(lang==='fa'?'لمس  ◈  برداشتن قطعه':'TAP  ◈  TAKE SHARD'))
  :(objective.carried?(lang==='fa'?'به جایگاه برو':'MOVE TO SOCKET'):(lang==='fa'?'به منبع قطعه برو':'MOVE TO SHARD SOURCE')),I.x+I.w/2,I.y+18);
 ctx.fillStyle='#8fe8ff';ctx.font=uiFont(9);
 ctx.fillText(objectiveSubLabel(st),I.x+I.w/2,I.y+32);
 ctx.restore();
}
function drawMeleeBtn(){
 if(!enemyInMeleeRange())return;
 const r=meleeRect(),f=player.meleeCd>0?1-player.meleeCd/MELEE_CD:1;
 abilityBtn(r,f,'#9fd8ff','melee',lang==='fa'?'مشتی':'PUNCH');
}
function drawObjectiveIndicator(){
 if(objective.done||!player)return;
 const st=LEVELS[levelIdx].stages[objective.stage];if(!st)return;
 const s=objectiveScreenPos(),pad=52;
 let x=s.x,y=s.y,off=!s.on;
 if(off){const dx=s.x-W/2,dy=s.y-H/2;
  const k=Math.min((W/2-pad)/(Math.abs(dx)||1),(H/2-pad)/(Math.abs(dy)||1));
  x=W/2+dx*k;y=H/2+dy*k;}
 const a=Math.atan2(s.y-H/2,s.x-W/2),pulse=.7+.3*Math.sin(time*5);
 ctx.save();ctx.globalAlpha=pulse;
 if(off){
  ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=st.type==='boss'?'#ffb04a':'#63e6ff';
  ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(-8,-9);ctx.lineTo(-3,0);
  ctx.lineTo(-8,9);ctx.closePath();ctx.fill();
 }else{
  ctx.strokeStyle=st.type==='boss'?'#ffb04a':'#8fe8ff';ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(x,y,11,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-16,y);ctx.lineTo(x-11,y);
  ctx.moveTo(x+11,y);ctx.lineTo(x+16,y);ctx.stroke();
 }
 ctx.restore();
 ctx.textAlign='center';ctx.font=uiFont(9,'bold');
 ctx.fillStyle=st.type==='boss'?'#ffcf8a':'#bff0ff';
 let tag=st.type==='boss'?(lang==='fa'?'رئیس':'BOSS'):st.type==='enable'?(lang==='fa'?'گره':'NODE'):st.type==='destroy'?(lang==='fa'?'هدف':'TARGET'):
  st.type==='implant'?(objective.carried?(lang==='fa'?'جایگاه':'SOCKET'):(lang==='fa'?'قطعه':'SHARD')):(lang==='fa'?'دفاع':'DEFEND');
 const phaseBoss=st.type==='boss'?directorBoss():null;
 if(phaseBoss&&phaseBoss.dirPhase>=0)
  tag+=(lang==='fa'?' فاز ':' PHASE ')+(phaseBoss.dirPhase+1);
 ctx.fillText(tag+' '+Math.round(dist(player,currentObjectivePoint())/TILE)+'m',x,y-18);
}
function drawMiniStatic(L,ms){
 const key=((mp.active&&mp.mode==='pvp')?'pvp':levelIdx)+':'+ms;
 if(!miniDirty&&miniKey===key)return;
 const size=Math.ceil(ms);
 if(miniCvs.width!==size)miniCvs.width=size;
 if(miniCvs.height!==size)miniCvs.height=size;
 miniCtx.clearRect(0,0,size,size);
 const tsx=size/L.w,tsy=size/L.h; // tile-index scale (markers use world scale in drawHUD)
 const walkable=(tx,ty)=>tx>=0&&ty>=0&&ty<grid.length&&tx<grid[0].length&&
  (grid[ty][tx]===0||grid[ty][tx]===2);
 // Opaque wall body. Walkable rooms and corridors are carved out of it below.
 miniCtx.fillStyle='#2d566e';miniCtx.fillRect(0,0,size,size);
 miniCtx.fillStyle='#3d738e';
 for(let y=0;y<L.h;y++)for(let x=0;x<L.w;x++)
  if(grid[y][x]===1||grid[y][x]===3)
   miniCtx.fillRect(x*tsx,y*tsy,Math.ceil(tsx),Math.ceil(tsy));
 const floor='#0a2233',wall='#bfefff';
 const corridorRect=(x1,y1,x2,y2)=>x1===x2
  ?{x:x1*tsx,y:Math.min(y1,y2)*tsy,w:tsx,h:(Math.abs(y2-y1)+1)*tsy}
  :{x:Math.min(x1,x2)*tsx,y:y1*tsy,w:(Math.abs(x2-x1)+1)*tsx,h:tsy};
 for(const c of (L.corridors||[])){
  const r=corridorRect(c[0],c[1],c[2],c[3]);
  miniCtx.fillStyle=floor;miniCtx.fillRect(r.x,r.y,r.w,r.h);
 }
 for(const r0 of (L.rooms||[])){
  miniCtx.fillStyle=floor;
  miniCtx.fillRect(r0.x*tsx,r0.y*tsy,r0.w*tsx,r0.h*tsy);
 }
 // Bright wall faces wherever a wall tile touches a walkable tile.
 miniCtx.strokeStyle=wall;miniCtx.lineWidth=1;
 for(let y=0;y<L.h;y++)for(let x=0;x<L.w;x++){
  const v=grid[y][x];if(v!==1&&v!==3)continue;
  const x0=Math.round(x*tsx)+.5,x1=Math.round((x+1)*tsx)-.5,
   y0=Math.round(y*tsy)+.5,y1=Math.round((y+1)*tsy)-.5;
  if(walkable(x,y-1)){miniCtx.beginPath();miniCtx.moveTo(x0,y0);miniCtx.lineTo(x1,y0);miniCtx.stroke();}
  if(walkable(x,y+1)){miniCtx.beginPath();miniCtx.moveTo(x0,y1);miniCtx.lineTo(x1,y1);miniCtx.stroke();}
  if(walkable(x-1,y)){miniCtx.beginPath();miniCtx.moveTo(x0,y0);miniCtx.lineTo(x0,y1);miniCtx.stroke();}
  if(walkable(x+1,y)){miniCtx.beginPath();miniCtx.moveTo(x1,y0);miniCtx.lineTo(x1,y1);miniCtx.stroke();}
 }
 // Open entrances at corridor endpoints, drawn over the room walls.
 miniCtx.fillStyle='#7fffa0';
 for(const c of (L.corridors||[]))for(const [tx,ty] of [[c[0],c[1]],[c[2],c[3]]]){
  if(!walkable(tx,ty))continue;
  miniCtx.fillRect(tx*tsx+tsx*.25,ty*tsy+tsy*.25,Math.max(2,tsx*.5),Math.max(2,tsy*.5));
 }
 for(const [tx,ty] of (L.cover||[])){
  miniCtx.fillStyle='#d8f1ff';
  miniCtx.fillRect(tx*tsx+tsx*.35,ty*tsy+tsy*.35,Math.max(1,tsx*.3),Math.max(1,tsy*.3));
 }
 for(const [tx,ty] of (L.doors||[])){
  if(grid[ty]&&grid[ty][tx]===3){
   miniCtx.fillStyle='#ffb04a';
   miniCtx.fillRect(tx*tsx,ty*tsy,Math.max(2,tsx),Math.max(2,tsy));
  }
 }
 miniCtx.strokeStyle='#63e6ff';miniCtx.lineWidth=1;
 miniCtx.strokeRect(.5,.5,size-1,size-1);
 miniDirty=false;miniKey=key;
}
function drawHUD(){
 ctx.save();ctx.direction=isRTL()?'rtl':'ltr';
 if(player.critT>.01){
  ctx.save();
  ctx.globalAlpha=player.critT*(.35+.16*Math.sin(time*7));
  const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.22,W/2,H/2,Math.max(W,H)*.62);
  vg.addColorStop(0,'rgba(255,0,0,0)');vg.addColorStop(1,'rgba(255,24,20,.95)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=player.critT;
  ctx.textAlign='center';ctx.fillStyle='#ff6a5a';ctx.font=uiFont(11,'bold');
  ctx.fillText(T('critical'),W/2,H*.34);
  ctx.restore();
 }
 drawObjectivePanel();drawVitals();drawBossCard();
 if(mp.active&&mp.mode==='pvp'){
  const mr=moralityRect();
  ctx.save();ctx.textAlign='center';ctx.font=uiFont(10,'bold');
  ctx.fillStyle='rgba(4,9,15,.55)';ctx.fillRect(W/2-130,mr.y-23,260,20);
  ctx.fillStyle='#63e6ff';
  const teamTxt = mp.pvpMode==='team' ? ((lang==='fa'?'تیم ':'TEAM ')+(mp.team||'A')+'  ') : (lang==='fa'?'هرکس برای خودش  ':'FFA  ');
  ctx.fillText(teamTxt+(mp.pvpScore?mp.pvpScore[0]+'-'+mp.pvpScore[1]:'0-0')+'  '+(lang==='fa'?'ر':'R')+(mp.pvpRound||1)+'  '+(lang==='fa'?'ب':'P')+(mpPeerCount()+1)+'/'+MP_MAX_PVP, W/2, mr.y-9);
  ctx.restore();
 }
 // Equipped-weapon button sits top-right, equipped-biotic button top-left.
 // Map sits down-centre on the left with vitals immediately to its right;
 // pause returns to its old top-centre spot. Cloak stays bottom-right.
 drawWeaponPanel();
 drawBioticButton();
 drawFirePad();
 drawCloakButton();
 const M=miniRect(),ms=M.w,mx=M.x,my=M.y;
 const L=(mp.active&&mp.mode==='pvp')?PVP_LEVEL:LEVELS[levelIdx],sx=ms/(L.w*TILE),sy=ms/(L.h*TILE);
 drawMiniStatic(L,ms);
 ctx.drawImage(miniCvs,mx,my,ms,ms);
 const mk=Math.max(4,Math.round(ms/26));
 ctx.fillStyle='#63e6ff';ctx.fillRect(mx+player.x*sx-mk/2,my+player.y*sy-mk/2,mk,mk);
 for(const e of enemies){ctx.fillStyle='#'+e.col.toString(16).padStart(6,'0');
  const s=Math.max(2,mk-2);ctx.fillRect(mx+e.x*sx-s/2,my+e.y*sy-s/2,s,s);}
 ctx.fillStyle='#7fffa0';
 ctx.fillRect(mx+objective.pos.x*sx-mk/2,my+objective.pos.y*sy-mk/2,mk,mk);
 drawMiniOverlay(mx,my,ms);
 drawPauseBtn();
 // Paragon / Renegade sit side by side above the separate objective panel.
 const mr=moralityRect(),py=mr.y,half=mr.w/2;
 ctx.fillStyle='rgba(6,14,22,.82)';ctx.fillRect(mr.x,py,mr.w,mr.h);
 ctx.strokeStyle='#3a6a86';ctx.lineWidth=1;ctx.strokeRect(mr.x+.5,py+.5,mr.w-1,mr.h-1);
 ctx.beginPath();ctx.moveTo(mr.x+half+.5,py+2);ctx.lineTo(mr.x+half+.5,py+mr.h-2);
 ctx.strokeStyle='rgba(120,170,200,.35)';ctx.stroke();
 ctx.textAlign='left';ctx.font=uiFont(7,'bold');
 ctx.fillStyle='#63e6ff';ctx.fillText('P '+campaign.paragon,mr.x+5,py+8);
 ctx.fillStyle='#ff7a6a';ctx.fillText('R '+campaign.renegade,mr.x+half+5,py+8);
 miniBar(mr.x+5,py+11,half-10,4,Math.min(1,campaign.paragon/4),'#63e6ff');
 miniBar(mr.x+half+5,py+11,half-10,4,Math.min(1,campaign.renegade/4),'#ff7a6a');
 drawObjectiveIndicator();
 drawInteractBtn();
 drawMeleeBtn();
 drawWheel();
 if(msgT>0){ctx.globalAlpha=Math.min(1,msgT);ctx.fillStyle='#63e6ff';ctx.font=uiFont(18,'bold');
  ctx.textAlign='center';ctx.fillText(loc(msg),W/2,H*.24);ctx.globalAlpha=1;}
 ctx.restore();}

/* ---------------- FLOW ---------------- */
function pauseGame(){
 if(state!=='PLAY')return;
 state='PAUSE';menuIdx=0;mouse.down=false;mouse.interactTap=false;
 touch.move=touch.fire=touch.interact=touch.look=null;
 wheel.kind=null;wheel.id=null;wheel.active=false;wheel.activeAt=0;wheel.castReady=false;wheel.pointer=false;padWheel=null;
 touch.interactTap=false;
 for(const k in keys)delete keys[k];
 AudioSys.tone(320,.1,'triangle',.05,-80);
}
function settingsVolumeAt(x,y){
 const r=settingsRects();
 if(inRect(x,y,r.music))return 'music';
 if(inRect(x,y,r.sfx))return 'sfx';
 return null;
}
function setSettingsVolume(kind,x){
 const rect=settingsRects()[kind],bx=rect.x+12,bw=rect.w-24;
 let p=clamp((x-bx)/bw,0,1); if(isRTL())p=1-p;
 if(kind==='music')MusicSys.setVolume(p*12.8); else AudioSys.setSfxVolume(p*2);
}
function nudgeSettingsVolume(kind,dir){
 if(kind==='music')MusicSys.setVolume(MusicSys.vol+dir*.4);
 else if(kind==='sfx')AudioSys.setSfxVolume(AudioSys.sfxVol+dir*.06);
}
function uiPress(x,y){
 if(state==='DIALOGUE'&&dialogue.awaiting){
  const rects=choiceRects(dialogue.options.length);
  for(let i=0;i<rects.length;i++)if(inRect(x,y,rects[i])){applyChoice(i);return;}
  return;
 }
 if(state==='CONTROLS'){
  const c=controlsRects(),L=c.layout;
  const visible=c.rows.filter(r=>r.y+r.h>L.top&&r.y<L.footerY);
  const ri=indexAt(visible.map(v=>({x:v.x,y:v.y,w:v.w,h:v.h})),x,y);
  if(ri>=0){menuIdx=visible[ri].index;GamepadSys.startCapture(visible[ri].action);return;}
  if(inRect(x,y,c.reset)){menuIdx=c.rows.length;GamepadSys.reset();return;}
  if(inRect(x,y,c.back)){menuIdx=c.rows.length+1;exitControls();return;}
  return;
 }
 if(state==='SETTINGS'){
  const r=settingsRects();
  if(inRect(x,y,r.lang)){toggleLang();return;}
  if(inRect(x,y,r.controller)){state='CONTROLS';menuIdx=0;padScroll=0;return;}
  if(inRect(x,y,r.back)){state=settingsReturn||'TITLE';menuIdx=0;settingsDrag=null;return;}
  const k=settingsVolumeAt(x,y);
  if(k){settingsDrag=k;setSettingsVolume(k,x);}
  return;
 }
 if(state==='PAUSE'){
  const i=indexAt(pauseItemRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='TITLE'){
  const gr=titleGithubRect(),ir=titleInfoRect();
  if(Math.hypot(x-(gr.x+gr.r),y-(gr.y+gr.r))<=gr.r){openGithub();return;}
  if(Math.hypot(x-(ir.x+ir.r),y-(ir.y+ir.r))<=ir.r){exitGame();return;}
  const i=indexAt(titleItemRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='GITHUB'){
  const i=indexAt(githubItemRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  else {state='TITLE';menuIdx=0;}
  return;
 }
 if(state==='INFO'){
  const i=indexAt(infoItemRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  else {state='TITLE';menuIdx=0;}
  return;
 }
 if(state==='DEAD'){
  const i=indexAt(deadItemRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='VICTORY'){
  const i=indexAt(victoryItemRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='MP_MENU'){
  const i=indexAt(mpMenuRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='MP_COOP_MENU'){
  const i=indexAt(mpCoopRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='MP_PVP_MODE'){
  const i=indexAt(mpPvpModeRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='MP_PVP_JOIN'){
  const i=indexAt(mpPvpJoinRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='MP_LOBBY'){
  const i=indexAt(mpLobbyRects(),x,y);
  if(i>=0){menuIdx=i;advance();}
  return;
 }
 if(state==='MP_LOADOUT'){
  mpLoadoutClick(x,y);return;
 }
 advance();
}
function advance(){
 if(state==='DIALOGUE'&&dialogue.awaiting)return;
 if(state==='TITLE'){if(menuIdx===0){resetCampaign();menuIdx=0;state='BRIEF';initBrief(0);}
  else if(menuIdx===1){mpReset();state='MP_MENU';menuIdx=0;}
  else if(menuIdx===2){infoReturn='TITLE';state='INFO';menuIdx=0;}
  else {settingsReturn='TITLE';state='SETTINGS';menuIdx=0;}}
 else if(state==='GITHUB'){
  if(menuIdx===0)openExternalUrl(GITHUB_INFILTRATOR_URL);
  else if(menuIdx===1)openExternalUrl(GITHUB_GHOST_URL);
  state='TITLE';menuIdx=0;
 }
 else if(state==='INFO'){infoReturn='INFO';state=menuIdx===0?'ABOUT':'HELP';menuIdx=0;}
 else if(state==='BRIEF')initLevel(levelIdx);
 else if(state==='DIALOGUE'){
  if(dialogue.cutscene&&!dialogue.ready)return;
  dialogue.i++;
  if(dialogue.i>=dialogue.lines.length){
   finishCutscene();
   if(dialogue.after){const after=dialogue.after;dialogue.after=null;state=after;startDelay=.8;
    if(after==='VICTORY')menuIdx=0;}
   else{state='PLAY';startDelay=1.2;}
  } else setDialogueLine();
 }
 else if(state==='ABOUT'||state==='HELP')state=infoReturn||'TITLE';
 else if(state==='MP_MENU'){
  if(menuIdx===0){mp.mode='coop';state='MP_COOP_MENU';menuIdx=0;}
  else if(menuIdx===1){mp.mode='pvp';state='MP_PVP_MODE';menuIdx=0;}
  else {mpReset();state='TITLE';menuIdx=0;}
 }
 else if(state==='MP_COOP_MENU'){
  if(menuIdx===0){mp.mode='coop';mpHost();}
  else if(menuIdx===1){mp.mode='coop';mpJoin();}
  else {state='MP_MENU';menuIdx=0;}
 }
 else if(state==='MP_PVP_MODE'){
  if(menuIdx===0){mp.pvpMode='ffa';state='MP_PVP_JOIN';menuIdx=0;}
  else if(menuIdx===1){mp.pvpMode='team';state='MP_PVP_JOIN';menuIdx=0;}
  else {state='MP_MENU';menuIdx=0;}
 }
 else if(state==='MP_PVP_JOIN'){
  if(menuIdx===0){mp.mode='pvp';mpHost();}
  else if(menuIdx===1){mp.mode='pvp';mpJoin();}
  else {state='MP_PVP_MODE';menuIdx=0;}
 }
 else if(state==='MP_LOBBY'){
  if(menuIdx===0){
   try{if(window.LanBridge)window.location.href=mp.role==='host'?'ghost://hotspot':'ghost://wifi';}catch(e){}
  }
  else if(menuIdx===1){
   if(mp.host && mp.mode==='pvp' && mpPeerCount()>0){ state='MP_LOADOUT'; menuIdx=0; mp.localReady=false; mp.peerReady=false; }
   else {
    // Retry auto-connect first; also try clipboard manual fallback
    if(mp.host) { try{mpAutoHostStart();}catch(e){} mp.status=lang==='fa'?'در حال تلاش دوباره برای اتصال خودکار...':'Retrying auto-connect...'; }
    else { try{mpAutoClientStart();}catch(e){} mp.status=lang==='fa'?'در حال اسکن مجدد میزبان...':'Scanning for host again...'; }
    // silent clipboard attempt as fallback
    if(navigator.clipboard&&navigator.clipboard.readText){
     navigator.clipboard.readText().then(t=>{
      t=(t||'').trim();
      if((t.indexOf('"offer"')>-1||t.indexOf('"answer"')>-1)&&t!==mp.signalText){ mp.signalIn=t; mpApplySignal(); }
     }).catch(()=>{});
    }
   }
  }
  else {mpClose('Cancelled');}
 }
 else if(state==='MP_LOADOUT'){
  mp.localReady=true;
  if(mp.host){if(mp.peerReady)mpStartRound(); else mp.status='Waiting for peer...';}
  else {mpSend({t:'loadout',loadout:mp.loadout,ready:true});mp.status='Waiting for host...';}
 }
 else if(state==='PAUSE'){
  if(menuIdx===0){state='PLAY';menuIdx=0;startDelay=.25;}
  else if(menuIdx===1){menuIdx=0;if(mp.active)mpStartRound(); else initLevel(levelIdx);}
  else if(menuIdx===2){if(mp.active)mpClose('Left match',true); else {resetCampaign();menuIdx=0;state='TITLE';}}
  else {settingsReturn='PAUSE';state='SETTINGS';menuIdx=0;}
 }
 else if(state==='SETTINGS'){
  if(menuIdx===0)toggleLang();
  else if(menuIdx===3){state='CONTROLS';menuIdx=0;padScroll=0;}
  else if(menuIdx===4){state=settingsReturn||'TITLE';menuIdx=0;settingsDrag=null;}
 }
 else if(state==='DEAD'){if(menuIdx===0){if(mp.active)mpStartRound(); else initLevel(levelIdx);} else {if(mp.active)mpClose('Left match',true); else state='TITLE';}}
 else if(state==='VICTORY'){
  if(menuIdx===0){if(mp.active)mpClose('Left match',true); else {resetCampaign();menuIdx=0;state='TITLE';}}
  else if(menuIdx===1){startEnding();}
  else {if(mp.active)mpClose('Left match',true); else {resetCampaign();menuIdx=0;state='BRIEF';initBrief(0);}}
 }}
function initBrief(i){levelIdx=i;menuIdx=0;}
addEventListener('keydown',e=>{
 if(state==='TITLE'&&e.key==='Escape'){e.preventDefault();exitGame();return;}
 if(state==='GITHUB'&&e.key==='Escape'){e.preventDefault();state='TITLE';menuIdx=0;return;}
 if(state==='TITLE'&&(e.key==='g'||e.key==='G')){e.preventDefault();openGithub();return;}
 if(state==='TITLE'&&(e.key==='i'||e.key==='I')){e.preventDefault();infoReturn='TITLE';state='INFO';menuIdx=0;return;}
 if(state==='CONTROLS'){
  if(e.key==='ArrowUp'){e.preventDefault();menuIdx=Math.max(0,menuIdx-1);ensureControlVisible();return;}
  if(e.key==='ArrowDown'){e.preventDefault();menuIdx=Math.min(controlsCount()-1,menuIdx+1);ensureControlVisible();return;}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();const L=controlsLayout(),step=Math.max(1,Math.floor(L.visible/2));
   menuIdx=clamp(menuIdx+(e.key==='ArrowRight'?step:-step),0,controlsCount()-1);
   ensureControlVisible();return;}
  if(e.key==='Enter'||e.key===' '){e.preventDefault();controlsConfirm();return;}
  if(e.key==='Escape'){e.preventDefault();exitControls();return;}
  return;
 }
 if(state==='DIALOGUE'&&dialogue.awaiting&&/^[1-3]$/.test(e.key)){
  e.preventDefault();applyChoice(+e.key-1);return;}
 if(state==='PAUSE'&&/^[1-3]$/.test(e.key)){
  e.preventDefault();menuIdx=+e.key-1;advance();return;}
 if(state==='SETTINGS'&&/^[1-5]$/.test(e.key)){
  e.preventDefault();menuIdx=+e.key-1;
  if(menuIdx===0)toggleLang();
  else if(menuIdx===3){state='CONTROLS';menuIdx=0;padScroll=0;}
  else if(menuIdx===4){state=settingsReturn||'TITLE';menuIdx=0;settingsDrag=null;}
  return;}
 if(e.key==='Enter'||e.key===' '){e.preventDefault();advance();}
 if(state==='PLAY'){
  if(e.key==='1')switchWeapon('rifle');
  if(e.key==='2'||e.key==='f'||e.key==='F')switchWeapon('shotgun');
  if(e.key==='v'||e.key==='V')triggerMelee();
 }
 if(e.key==='Escape'&&state==='PLAY')pauseGame();
 else if(e.key==='Escape'&&state==='PAUSE'){menuIdx=0;advance();}
 else if(e.key==='Escape'&&state==='SETTINGS'){state=settingsReturn||'TITLE';menuIdx=0;settingsDrag=null;}
 else if(e.key==='Escape'&&state==='INFO'){state='TITLE';menuIdx=0;}
 else if(e.key==='Escape'&&(state==='ABOUT'||state==='HELP')){state=infoReturn||'TITLE';menuIdx=0;}
 else if(e.key==='Escape'&&state==='CONTROLS')exitControls();
 else if(e.key==='Escape'&&state==='MP_MENU'){mpReset();state='TITLE';menuIdx=0;}
 else if(e.key==='Escape'&&state==='MP_COOP_MENU'){state='MP_MENU';menuIdx=0;}
 else if(e.key==='Escape'&&state==='MP_PVP_MODE'){state='MP_MENU';menuIdx=0;}
 else if(e.key==='Escape'&&state==='MP_PVP_JOIN'){state='MP_PVP_MODE';menuIdx=0;}
 else if(e.key==='Escape'&&state==='MP_LOBBY'){mpClose('Cancelled');}
 else if(e.key==='Escape'&&state==='MP_LOADOUT'){ if(mp.active&&mp.host&&mp.mode==='pvp'){state='MP_LOBBY';menuIdx=0;} else mpClose('Cancelled'); }
 const navStates=['TITLE','GITHUB','INFO','DEAD','VICTORY','PAUSE','SETTINGS','MP_MENU','MP_COOP_MENU','MP_PVP_MODE','MP_PVP_JOIN','MP_LOBBY'];
 if((e.key==='ArrowUp'||e.key==='w')&&navStates.includes(state))
  menuIdx=Math.max(0,menuIdx-1);
 if((e.key==='ArrowDown'||e.key==='s')&&navStates.includes(state)){
  const max=state==='TITLE'?3:state==='PAUSE'?3:state==='SETTINGS'?3:state==='VICTORY'?2:state==='MP_LOBBY'?2:state==='GITHUB'?2:state==='INFO'?1:2;
  menuIdx=Math.min(max,menuIdx+1);}
 if(state==='SETTINGS'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){
  e.preventDefault();
  const kind=menuIdx===1?'music':menuIdx===2?'sfx':null;
  if(kind){const d=isRTL()?-1:1;nudgeSettingsVolume(kind,(e.key==='ArrowRight'?1:-1)*d);}
 }});
const uiStates=['TITLE','GITHUB','INFO','BRIEF','DIALOGUE','HELP','ABOUT','DEAD','VICTORY','PAUSE','SETTINGS','CONTROLS','MP_MENU','MP_COOP_MENU','MP_PVP_MODE','MP_PVP_JOIN','MP_LOBBY','MP_LOADOUT'];
uiCvs.addEventListener('click',e=>{if(uiStates.includes(state)) uiPress(e.clientX,e.clientY);});
uiCvs.addEventListener('touchstart',e=>{if(uiStates.includes(state)){
 e.preventDefault();const t=e.changedTouches[0];
 if(state==='SETTINGS'&&t){const k=settingsVolumeAt(t.clientX,t.clientY);if(k){settingsDrag=k;setSettingsVolume(k,t.clientX);return;}}
 if(state==='CONTROLS'&&t){
  controlsDrag={id:t.identifier,x:t.clientX,y:t.clientY,scroll:padScroll,moved:false};
  return;}
 uiPress(t?t.clientX:0,t?t.clientY:0);}},{passive:false});
uiCvs.addEventListener('touchmove',e=>{if(uiStates.includes(state)){
 const t=e.changedTouches[0];if(!t)return;
 if(state==='SETTINGS'&&settingsDrag){e.preventDefault();setSettingsVolume(settingsDrag,t.clientX);return;}
 if(state==='CONTROLS'&&controlsDrag){
  e.preventDefault();
  if(controlsDrag.id!==undefined&&t.identifier!==undefined&&t.identifier!==controlsDrag.id)return;
  const dy=t.clientY-controlsDrag.y;
  if(Math.abs(dy)>6)controlsDrag.moved=true;
  padScroll=clamp(controlsDrag.scroll-dy,0,controlsLayout().maxScroll);
 }
}},{passive:false});
function endUiTouch(e){
 if(state==='CONTROLS'&&controlsDrag){
  if(!controlsDrag.moved)uiPress(controlsDrag.x,controlsDrag.y);
  controlsDrag=null;return;
 }
 settingsDrag=null;
}
uiCvs.addEventListener('touchend',endUiTouch,{passive:true});
uiCvs.addEventListener('touchcancel',endUiTouch,{passive:true});
uiCvs.addEventListener('wheel',e=>{if(state==='CONTROLS'){
 e.preventDefault();scrollControls(e.deltaY);
}},{passive:false});

/* ---------------- LOOP ---------------- */
function render(){
 sync3D();
 renderer.render(scene,camera);
 ctx.clearRect(0,0,W,H);
 if(state==='TITLE')drawTitle();
 else if(state==='GITHUB')drawGithub();
 else if(state==='INFO')drawInfo();
 else if(state==='HELP')drawHelp();
 else if(state==='ABOUT')drawAbout();
 else if(state==='BRIEF')drawBrief();
 else if(state==='DIALOGUE')drawDialogue();
 else if(state==='PAUSE')drawPause();
 else if(state==='SETTINGS')drawSettings();
 else if(state==='CONTROLS')drawControls();
 else if(state==='DEAD')drawDead();
 else if(state==='VICTORY')drawVictory();
 else if(state==='MP_MENU')drawMpMenu();
 else if(state==='MP_COOP_MENU')drawMpCoopMenu();
 else if(state==='MP_PVP_MODE')drawMpPvpModeMenu();
 else if(state==='MP_PVP_JOIN')drawMpPvpJoinMenu();
 else if(state==='MP_LOBBY')drawMpLobby();
 else if(state==='MP_LOADOUT')drawMpLoadout();
 else {drawHUD();}
}
let last=performance.now(),nativeTicks=0;
function scheduleFrame(){
 if(NativeDisplay.nativeDriven()&&nativeTicks>0)return; // native Choreographer owns the clock
 requestAnimationFrame(loop);
}
function loop(now){
 const stepped=RefreshSync.step((now-last)/1000);last=now;
 if(stepped===null){scheduleFrame();return;}
 const dt=Math.min(stepped,.05);
 GamepadSys.poll();handlePadInput();
 update(dt);
 try{MusicSys.update(state,player,enemies,dt);}catch(e){}
 render();
 // Adaptive resolution follows the active 60/120 Hz display interval.
 const target=RefreshSync.intervalMs()/1000;
 perfAcc+=dt;perfFrames++;
 if(perfFrames>=90){
  const avg=perfAcc/perfFrames;
  if(avg>target*1.08&&renderScale>.7){renderScale=Math.max(.7,renderScale-.12);resize();}
  else if(avg<target*.74&&renderScale<1){renderScale=Math.min(1,renderScale+.08);resize();}
  perfAcc=0;perfFrames=0;
 }
 scheduleFrame();
}
window.GhostFrame=function(){nativeTicks++;loop(performance.now());};
try{AudioSys.init();MusicSys.kick();}catch(e){}
scheduleFrame();
})();
