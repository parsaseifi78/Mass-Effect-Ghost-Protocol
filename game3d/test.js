// Headless smoke + progression + aim harness for the real 3D game.
const fs=require('fs');
require('./three-stub.js');
const listeners={};
const ctxStub=new Proxy({},{
 get(t,k){
  if(k==='measureText')return s=>({width:String(s).length*7});
  if(k==='createRadialGradient'||k==='createLinearGradient')return ()=>({addColorStop(){}});
  if(k==='canvas')return canvas;
  if(typeof t[k]!=='undefined')return t[k];
  return ()=>{};
 },set(t,k,v){t[k]=v;return true;}
});
const canvas={width:0,height:0,style:{},getContext:()=>ctxStub,
 addEventListener:(n,f)=>{(listeners['canvas:'+n]||(listeners['canvas:'+n]=[])).push(f);}};
global.document={getElementById:()=>canvas,createElement:()=>({width:0,height:0,getContext:()=>ctxStub})};
global.window=global;
global.innerWidth=800;global.innerHeight=600;global.devicePixelRatio=1;
global.addEventListener=(n,f)=>{(listeners[n]||(listeners[n]=[])).push(f);};
global.performance={now:()=>T};
let raf=null;global.requestAnimationFrame=f=>{raf=f;};
global.localStorage={getItem:()=>null,setItem:()=>{}};
global.Audio=class{
 constructor(){this.paused=true;this.volume=1;this.currentTime=0;this.loop=false;this.preload='';this.src='';this._ev={};}
 addEventListener(n,f){(this._ev[n]||(this._ev[n]=[])).push(f);}
 load(){}
 play(){this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
};
let T=0;
function fire(name,ev={}){for(const f of (listeners[name]||[]))f(ev);}
function key(k,type='keydown'){fire(type,{key:k,preventDefault(){}});}
function frames(n,dt=16){for(let i=0;i<n;i++){T+=dt;const f=raf;raf=null;if(f)f(T);}}
let errors=[];process.on('uncaughtException',e=>{errors.push(e);console.error('ERROR',e.stack);});
let exitCalls=0;global.ExitBridge={exit(){exitCalls++;}};
let githubOpens=[];global.UrlBridge={open(u){githubOpens.push(u);}};

let src=fs.readFileSync('game.js','utf8');
src=src.replace(/\}\)\(\);\s*$/,`
global.__dbg={
 get state(){return state},set state(v){state=v},get player(){return player},
 get menuIdx(){return menuIdx},set menuIdx(v){menuIdx=v},
 get enemies(){return enemies},get bullets(){return bullets},get parts(){return parts},
 get levelIdx(){return levelIdx},set levelIdx(v){levelIdx=v},
 get objective(){return objective},get dialogue(){return dialogue},
 get grid(){return grid},get aimDir(){return aimDir},get aimPoint(){return aimPoint},
 get camera(){return camera},get W(){return W},get H(){return H},get touch(){return touch},
 get mouse(){return mouse},get wheel(){return wheel},
 get camFocus(){return camFocus},get pickups(){return pickups},
 get actorG(){return actorG},get fields(){return fields},
 get worldG(){return worldG},get objBeam(){return objBeam},get decorGeo(){return decorGeo},
 get barrels(){return barrels},get blastLights(){return blastLights},get MAXP(){return MAXP},
 get TRACER_GEOS(){return TRACER_GEOS},get BULLET_MAT(){return BULLET_MAT},
 get time(){return time},get REGEN(){return REGEN},get vitalsRect(){return vitalsRect},
 get msg(){return msg},get msgT(){return msgT},
 get DPR(){return DPR},get renderScale(){return renderScale},get renderer(){return renderer},
 get roomLight(){return roomLight},get miniCvs(){return miniCvs},get muzzleLight(){return muzzleLight},
 get levels(){return LEVELS},get portraits(){return PORTRAITS},
 get doors(){return doors},get tileSize(){return TILE},get cover(){return cover},
 get campaign(){return campaign},get STORY(){return STORY},get music(){return MusicSys},
 initLevel,advance,dieEnemy,shoot,hurtPlayer,update,makeEnemy,triggerDash,triggerBiotic,
 switchWeapon,cycleWeapon,weaponRects,completeStage,unlockDoor,nearObjective,interactRect,
 explodeBarrel,raiseAlarm,resetCampaign,applyChoice,choiceRects,uiPress,storyBeat,
 solidAt,wallAtTile,solidCircle,clearDashLine,findCinematicExit,safeSpawn,safePlaceEnemy,moveEntity,
 triggerEnemyAbility,bossMindLash,showBossCard,pauseRect,pauseGame,pauseItemRects,
 firePad,bioticWheelRect,cloakRect,cloakCooldownFraction,
 wheelGeom,wheelPoint,wheelSlots,slotCooldown,wheelReveal,wheelSlotPos,vitalColor,
 miniRect,moralityRect,objectiveRect,objectiveLabel,objectiveProgress,
 weaponHeatFraction,bioticCooldownRemaining,bioticCooldownFraction,
 activeBiotic,triggerBioticAbility,get bioticCd(){return BIOTIC_CD},reloadDuration,
 hitObjectiveTargets,damageDevice,currentObjectivePoint,objectiveFraction,
 setupStageState,spawnObjectiveProps,addPart,addBlastLight,startEnding,
 titleItemRects,titleInfoRect,titleGithubRect,githubItemRects,openGithub,openExternalUrl,infoItemRects,
 get GITHUB_INFILTRATOR_URL(){return GITHUB_INFILTRATOR_URL},
 get GITHUB_GHOST_URL(){return GITHUB_GHOST_URL},
 get GITHUB_URL(){return GITHUB_INFILTRATOR_URL},get titleHero(){return titleG.userData.hero},
 deadItemRects,victoryItemRects,pauseItemRects,
 get wdef(){return WDEF},get weapons(){return WEAPONS},get faText(){return FA_TEXT},get i18n(){return I18N},
 get cinematicCrowd(){return cinematicCrowd},get cinematicJug(){return cinematicJug},
 get cinematicCorner(){return cinematicCorner},get cutT(){return cutT},get cutLineT(){return cutLineT},
  get cinematicMode(){return cinematicMode},get cinematicLanded(){return cinematicLanded},
  get cinematicThrown(){return cinematicThrown},get cinematicExited(){return cinematicExited},
  get cinematicExitFrom(){return cinematicExitFrom},get cinematicExitTo(){return cinematicExitTo},
  get bossCard(){return bossCard},
 get fxG(){return fxG},get BIOTICS(){return BIOTICS},get DODEC(){return DODEC},
 get OCT(){return OCT},abilityRects,qAbility,cycleQAbility,qCooldownFraction,
 GamepadSys,get padMap(){return GamepadSys.map},get padScroll(){return padScroll},
 set padScroll(v){padScroll=v},PAD_ACTIONS,padLabel,bindingLabel,
 settingsRects,controlsRects,controlsLayout,controlsCount,scrollControls,ensureControlVisible,
 handlePadInput,controlsConfirm,menuCount,interactPressed,
 triggerCloak,cloakVisual,clearBarrierFx,cycleBiotic,triggerQAbility,triggerDirectAbility,
 triggerEquippedBiotic,castBarrier,unlockBiotic,equippedBiotic,shieldDelay,shieldRate,maxShield,
 spawnEnemyMesh,meleeRect,enemyInMeleeRange,triggerMelee,
 get meleeDur(){return MELEE_DUR},get meleeCooldown(){return MELEE_CD},get meleeReach(){return MELEE_REACH},
 angDiff,damageEnemy,juggernautHit,registerDuelRead,resolveJuggernautDuel,
startDirectorPhases,advanceDirectorPhase,directorPhaseCheck,directorBoss,jugAllyAI,
 get refreshSync(){return RefreshSync},get nativeDisplay(){return NativeDisplay}
};
})();`);
eval(src);
const D=global.__dbg;
const assert=(c,m)=>{if(!c)throw new Error(m);};
const engineSrc=fs.readFileSync('assets/three.min.js','utf8');
assert(/Ghost Protocol engine: three\.js r160\.1/.test(engineSrc)&&/const e="160"/.test(engineSrc),
 'bundled engine must be three.js r160.1');
assert(/useLegacyLights/.test(src)&&/LinearSRGBColorSpace/.test(src),
 'game must keep the r128 light/color look on the upgraded engine');
const pointLights=[...src.matchAll(/new THREE\.PointLight\([^)]*\)/g)].map(m=>m[0]);
assert(pointLights.length===5&&pointLights.every(s=>/,\s*1\)$/.test(s)),
 'every point light must keep the r128 decay of 1 so ability blasts stay visible');
const abilityKinds=['SHOCK SLAM','BLINK STRIKE','OVERCHARGE','NULL PULSE','RAIL LANCE',
 'SIEGE SLAM','BIG BIOTIC HAMMER','BIOTIC HURRICANE','MIND LASH'];
assert(/function spawnAbilityFx/.test(src)&&/updateAbilityFx\(dt\)/.test(src)&&
 abilityKinds.every(k=>src.includes("kind==='"+k+"'")),
 'every enemy ability must have its own animated effect signature');
function waitCutsceneReady(){
 let w=0;
 while(D.state==='DIALOGUE'&&D.dialogue&&D.dialogue.cutscene&&!D.dialogue.ready&&w++<240)frames(1);
}
function advanceToLine(n){
 let guard=0;
 while(D.state==='DIALOGUE'&&D.dialogue.i<n&&guard++<40){waitCutsceneReady();key('Enter');frames(1);}
 assert(D.dialogue.i===n,'cutscene should reach line '+n);
}
function ndcPoint(p){
 const cam=D.camera,look=cam.target||new THREE.Vector3(...(cam.__look||[0,0,0]));
 const f=look.clone().sub(cam.position).normalize();
 const r=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize();
 const u=new THREE.Vector3().crossVectors(r,f).normalize();
 const v=p.clone().sub(cam.position),z=v.dot(f);
 const tan=Math.tan(cam.fov*Math.PI/360);
 return {x:v.dot(r)/(z*tan*cam.aspect),y:v.dot(u)/(z*tan),z};
}
function assertFramed(x,y,h,label){
 const n=ndcPoint(new THREE.Vector3(x,h,y));
 assert(n.z>0&&Math.abs(n.x)<.96&&Math.abs(n.y)<.96,
  label+' must stay inside the cinematic frame ('+n.x.toFixed(2)+','+n.y.toFixed(2)+')');
}
function advanceToChoice(){
 let guard=0;
 while(D.state==='DIALOGUE'&&!D.dialogue.awaiting&&guard++<40){
  waitCutsceneReady();key('Enter');frames(2);
 }
}
function clearDialogue(choiceIdx=0){
 let guard=0;
 while(D.state==='DIALOGUE'&&guard++<120){
  if(D.dialogue.awaiting)key(String(choiceIdx+1));
  else {waitCutsceneReady();key('Enter');}
  frames(2);
 }
 assert(D.state!=='DIALOGUE','dialogue should finish');
}

// ---- boot / menus ----
frames(4);
assert(D.state==='TITLE','expected TITLE, got '+D.state);
const TR=D.titleItemRects();
fire('canvas:click',{clientX:8,clientY:8});
assert(D.state==='TITLE','tapping outside the menu must not start the game');
const infoMenuRect=TR[2];
fire('canvas:click',{clientX:infoMenuRect.x+infoMenuRect.w/2,clientY:infoMenuRect.y+infoMenuRect.h/2});
assert(D.state==='INFO','tapping the Info menu item must open the Info hub');
assert(src.includes("how:'Info'")&&src.includes("howSub:'About and how to play'"),
 'main menu label must be Info only');
assert(src.includes('function infoItemRects()')&&src.includes('function drawInfo()')&&
 src.includes("state==='INFO')drawInfo()"),
 'Info must be its own hub screen with two selectable buttons');
assert(src.includes("infoTitle:'Info'")&&src.includes("aboutTitle:'About'")&&src.includes("howTitle:'How to play'"),
 'Info hub must label About and How to play');
assert(src.includes("state==='ABOUT')drawAbout()")&&src.includes("state==='HELP')drawHelp()"),
 'About and How to play must render in separate windows');
const aboutSrc=src.slice(src.indexOf('function drawAbout(){'),src.indexOf('function bar('));
assert(aboutSrc.includes("const t=line+wd+' ';")&&!aboutSrc.includes("const t=line+wd+'';"),
 'About text must keep spaces between wrapped words');
const IR=D.infoItemRects();
fire('canvas:click',{clientX:IR[0].x+IR[0].w/2,clientY:IR[0].y+IR[0].h/2});
assert(D.state==='ABOUT','selecting About inside Info must open the About window');
fire('canvas:click',{clientX:8,clientY:8});
assert(D.state==='INFO','About must return to the Info hub');
fire('canvas:click',{clientX:IR[1].x+IR[1].w/2,clientY:IR[1].y+IR[1].h/2});
assert(D.state==='HELP','selecting How to play inside Info must open the How to play window');
fire('canvas:click',{clientX:8,clientY:8});
assert(D.state==='INFO','How to play must return to the Info hub');
key('Escape');frames(2);
assert(D.state==='TITLE','Esc must return from Info to the main menu');
assert(TR.length===4,'sequel-inspired title must use four main buttons');
assert(TR[0].y===TR[1].y&&TR[2].y===TR[3].y&&TR[2].y>TR[0].y,
 'title buttons must form a precise 2x2 grid');
assert(TR[0].w===TR[1].w&&TR[0].w===TR[2].w&&TR[0].w===TR[3].w&&
 TR[0].h===TR[1].h&&TR[0].h===TR[2].h&&TR[0].h===TR[3].h,
 'all title buttons must share equal dimensions');
assert(Math.abs((TR[0].x+TR[1].x+TR[1].w)/2-D.W/2)<1,
 'button group must be horizontally centered');
assert((TR[0].y+TR[2].y+TR[0].h)/2>D.H/2,
 'button group must sit slightly below the screen midpoint');
assert(D.titleHero&&Math.abs(D.titleHero.rotation.y+Math.PI/2)<.5,
 'Randall hero must face the title camera');
const infoRect=D.titleInfoRect();
fire('canvas:click',{clientX:infoRect.x+infoRect.r,clientY:infoRect.y+infoRect.r});
assert(exitCalls===1&&D.state==='TITLE','circular corner button must exit the game');
assert(src.includes('window.ExitBridge.exit()'),'exit must call the native bridge');
const gh=D.titleGithubRect();
assert(gh.r>=16&&gh.x<40&&gh.y<40,'top-left circle/triangle must be its own title button');
fire('canvas:click',{clientX:gh.x+gh.r,clientY:gh.y+gh.r});
assert(githubOpens.length===0&&D.state==='GITHUB'&&exitCalls===1,
 'top-left circle/triangle button must open the GitHub picker without exiting');
const gr=D.githubItemRects();
assert(gr.length===3&&gr.every(r=>r.w>180&&r.h>=40)&&
 gr[0].y<gr[1].y&&gr[1].y<gr[2].y,
 'GitHub picker must stack two repositories and a back option');
assert(D.i18n.en.githubInfiltratorTitle==='Mass Effect: Infiltrator.'&&
 D.i18n.en.githubGhostTitle==='Mass Effect: Ghost Protocol.'&&
 D.i18n.fa.githubInfiltratorTitle&&D.i18n.fa.githubGhostTitle&&D.i18n.fa.githubTitle,
 'both GitHub titles and the picker copy must have English and Persian entries');
key('Escape');frames(1);
assert(D.state==='TITLE','Escape must close the GitHub picker');
key('g');frames(1);
assert(D.state==='GITHUB','G shortcut must open the GitHub picker');
fire('canvas:click',{clientX:gr[0].x+gr[0].w/2,clientY:gr[0].y+gr[0].h/2});
assert(githubOpens.length===1&&githubOpens[0]===D.GITHUB_INFILTRATOR_URL&&D.state==='TITLE',
 'first picker choice must open the Resurrection repository');
key('g');frames(1);
fire('canvas:click',{clientX:gr[1].x+gr[1].w/2,clientY:gr[1].y+gr[1].h/2});
assert(githubOpens.length===2&&githubOpens[1]===D.GITHUB_GHOST_URL&&D.state==='TITLE',
 'second picker choice must open the separate Ghost Protocol repository');
key('g');frames(1);
fire('canvas:click',{clientX:gr[2].x+gr[2].w/2,clientY:gr[2].y+gr[2].h/2});
assert(githubOpens.length===2&&D.state==='TITLE','back option must dismiss the picker without opening a link');
assert(D.GITHUB_INFILTRATOR_URL!==D.GITHUB_GHOST_URL,'the two picker links must be distinct');
assert(src.includes('function drawGithub()')&&src.includes("else if(state==='GITHUB')drawGithub();")&&
 src.includes('GITHUB:3')&&src.includes("state==='GITHUB'&&e.key==='Escape'"),
 'GitHub picker must be its own drawn, navigable state');
const exitSmali=fs.readFileSync('../apk_app/smali/com/ghost/protocol/ExitBridge.smali','utf8');
const urlSmali=fs.readFileSync('../apk_app/smali/com/ghost/protocol/UrlBridge.smali','utf8');
const mainSmali=fs.readFileSync('../apk_app/smali/com/ghost/protocol/MainActivity.smali','utf8');
assert(exitSmali.includes('Activity;->finish()V')&&
 exitSmali.includes('Landroid/os/Process;->killProcess(I)V')&&
 exitSmali.includes('Ljava/lang/System;->exit(I)V'),
 'Exit bridge must finish the activity and force-close the process');
assert(urlSmali.includes('android.intent.action.VIEW')&&urlSmali.includes('JavascriptInterface')&&
 mainSmali.includes('const-string v3, "UrlBridge"'),
 'URL bridge must open links externally and be registered in the Activity');
assert(src.includes('function drawTitleFx()')&&src.includes('drawTitleFx();')&&
 src.includes('if(selected){const p=.5+.5*Math.sin(time*4.6)'),
 'main menu must animate scan bands, motes and selected-button glow');
const gpReadme=fs.readFileSync('../docs/GHOST_PROTOCOL_PAGES/README.md','utf8');
const gpPage=fs.readFileSync('../docs/GHOST_PROTOCOL_PAGES/index.html','utf8');
assert(fs.existsSync('../docs/PAGES/index.html')&&gpReadme.includes(D.GITHUB_GHOST_URL)&&
 gpPage.includes(D.GITHUB_GHOST_URL)&&
 fs.readFileSync('../README.md','utf8').includes(D.GITHUB_GHOST_URL),
 'separate Ghost Protocol GitHub page and README must exist before the picker ships');
key('i');frames(2);
assert(D.state==='INFO','keyboard i must open Info from the main menu');
key('Escape');frames(2);
assert(D.state==='TITLE','Info must return to the main menu');
D.menuIdx=0;
const deployRect=D.titleItemRects()[0];
fire('canvas:click',{clientX:deployRect.x+deployRect.w/2,clientY:deployRect.y+deployRect.h/2});
frames(3);                               // TITLE -> BRIEF via its actual button
assert(D.state==='BRIEF','expected BRIEF, got '+D.state);
key('Enter');frames(3);                 // BRIEF -> DIALOGUE (level 1)
assert(D.state==='DIALOGUE','expected DIALOGUE, got '+D.state);
assert(D.levelIdx===0,'expected level 0');
assert(D.enemies.length>=2,'level1 initial squad '+D.enemies.length);
assert(LEVELS_OK(),'levels should author rooms, corridors, doors and stages');
assert(D.levels[0].intro.some(l=>l[0]==='RANDALL'&&l[1].includes('lowered the gun')),
 'sequel must establish that Randall spared Inali in the original ending');
function LEVELS_OK(){return D.levels.every(L=>{
 const r=L.rooms[0],p=L.stages[0].pos;
 return L.rooms.length>=3&&L.corridors.length>=3&&L.doors.length>=2&&
  L.stages.length>=3&&L.start&&L.initial.length>=2&&
  p[0]>=r.x&&p[0]<r.x+r.w&&p[1]>=r.y&&p[1]<r.y+r.h;   // first objective must be reachable
});}
// The intro now ends in a Paragon / Renegade choice: dismiss it with option 1.
let guard=0;while(D.state==='DIALOGUE'&&guard++<40){
 if(D.dialogue.awaiting)key('1');else key('Enter');frames(2);}
assert(D.state==='PLAY','expected PLAY after dialogue, got '+D.state);
assert(D.campaign.paragon===1,'intro choice should raise Paragon');
assert(D.campaign.flags.trustInali,'intro choice should set its story flag');
assert(D.campaign.choices.length===1,'intro choice should be recorded');
console.log('story choice ok: paragon',D.campaign.paragon,'flag',D.campaign.flags.trustInali);

// ---- upgraded environment + dialogue portraits ----
assert(D.objBeam,'objective beacon should exist');
assert(D.decorGeo,'drifting atmosphere particles should exist');
assert(D.worldG.children.length>12,'facility should have detail props');
const speakers=new Set();
const scanSpeaker=ln=>{
 if(!ln||!ln[0])return;
 speakers.add(ln[0]);
 for(const opt of (ln[2]||[]))for(const r of (opt.reply||[]))scanSpeaker(r);
};
for(const L of D.levels)for(const ln of L.intro)scanSpeaker(ln);
for(const beat of ['praetorianBeat','lancerBeat','juggernautBeat','juggernautLesson','directorBeat'])
 for(const ln of D.STORY[beat]())scanSpeaker(ln);
for(const s of speakers)assert(D.portraits[s],'missing portrait for '+s);
console.log('environment/portraits ok:',[...speakers].join(','));

// ---- multi-room map + genuinely different objective types ----
D.initLevel(0);
clearDialogue();
frames(90);
assert(D.levels.every(L=>L.stages.every(s=>!s.hold)),'uniform hold objectives must be gone');
const allTypes=D.levels.reduce((a,L)=>a.concat(L.stages.map(s=>s.type)),[]);
for(const t of ['enable','destroy','implant','defend'])
 assert(allTypes.includes(t),'missing objective type '+t);
assert(D.objective.stage===0&&D.objective.progress===0,'objective must start at stage 0');
assert(D.doors.length===2&&D.doors.every(d=>!d.unlocked),'bulkheads must start locked');
assert(D.grid.some(row=>row.includes(3)),'locked doors must be solid map cells');
const lockedBefore=D.grid.reduce((n,row)=>n+row.filter(v=>v===3).length,0);
const S=D.levels[0].stages[0],TS=D.tileSize;
D.enemies.length=0;D.bullets.length=0;
D.player.x=S.pos[0]*TS+TS/2;D.player.y=S.pos[1]*TS+TS/2;
D.player.hp=100;D.player.sh=60;
assert(D.objective.type==='enable'&&!D.nearObjective(),
 'enable stages must use shooting, not an interact prompt');
frames(30);
assert(D.objective.stage===0,'standing on an enable marker must not complete the stage');
const nodes=D.objective.nodes.slice();
assert(nodes.length===3,'enable stage should expose three shootable nodes');
for(const n of nodes)D.hitObjectiveTargets({x:n.x,y:n.y,dmg:20,enemy:false,life:1});
frames(2);
assert(D.objective.stage===1,'shooting every node must enable the bypass');
assert(D.doors[0].unlocked&&!D.doors[1].unlocked,'only the first bulkhead should open');
assert(D.grid.reduce((n,row)=>n+row.filter(v=>v===3).length,0)===lockedBefore-1,
 'unlocking must open exactly one bulkhead cell');
assert(D.enemies.length>0,'stage completion must deploy a response squad');
assert(Math.abs(D.objective.pos.x-(D.levels[0].stages[1].pos[0]*TS+TS/2))<1,
 'objective marker must move to the next room');

assert(D.objective.type==='destroy'&&D.objective.device,'second stage must be a destroy stage');
const dev=D.objective.device;
D.hitObjectiveTargets({x:dev.x,y:dev.y,dmg:dev.hp-1,enemy:false,life:1});
assert(D.objective.stage===1&&dev.hp===1,'partial damage must not finish a destroy stage');
D.hitObjectiveTargets({x:dev.x,y:dev.y,dmg:10,enemy:false,life:1});
assert(D.objective.stage===2,'destroying the core must advance');
assert(D.doors[1].unlocked,'destroying the cipher must release the second bulkhead');

assert(D.objective.type==='implant'&&D.objective.source,'third stage must be an implant stage');
const IT=D.interactRect(),itx=IT.x+IT.w/2,ity=IT.y+IT.h/2;
const tapInteract=id=>{
 fire('canvas:touchstart',{preventDefault(){},changedTouches:[
  {identifier:id,clientX:itx,clientY:ity}]});
 fire('canvas:touchend',{changedTouches:[{identifier:id,clientX:itx,clientY:ity}]});
 frames(2);
};
D.player.x=D.objective.source.x;D.player.y=D.objective.source.y;
assert(D.nearObjective(),'shard source should offer a single-tap prompt');
tapInteract(21);
assert(D.objective.carried,'tapping the source must pick up the shard');
D.player.x=D.objective.pos.x;D.player.y=D.objective.pos.y;
assert(D.nearObjective(),'socket should offer a single-tap implant prompt');
tapInteract(22);
assert(D.objective.stage===3,'implanting the shard must advance');

const DS=D.levels[0].stages[3];
assert(D.objective.type==='defend'&&D.objective.device,'final stage must be a defend stage');
D.objective.t=3;
D.damageDevice(999);
assert(D.objective.t===0&&D.objective.device.hp===D.objective.device.maxhp,
 'hitting the defense array should reset the timer, not need a hold prompt');
D.objective.t=DS.dur*.4;frames(3);
assert(D.enemies.length>0,'defense stage should launch timed waves');
D.player.hp=100;D.player.sh=60;
D.objective.t=DS.dur-.02;frames(5);
assert(D.objective.done,'surviving the defense timer must complete the mission');
console.log('objective types ok: enable, destroy, implant, defend');

// ---- every stage must be reachable once its preceding doors are released ----
for(let li=0;li<D.levels.length;li++){
 D.initLevel(li);
 clearDialogue();
 const L=D.levels[li],g=D.grid;
 const open=(x,y)=>g[y]&&g[y][x]!==undefined&&g[y][x]===0;
 const reach=(a,b)=>{
  const q=[a],seen=new Set([a.join(',')]);
  for(let n=0;n<q.length;n++){
   const [x,y]=q[n];if(x===b[0]&&y===b[1])return true;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy,k=nx+','+ny;
    if(!open(nx,ny)||seen.has(k))continue;
    seen.add(k);q.push([nx,ny]);}}
  return false;};
 let prev=L.start;
 for(let i=0;i<L.stages.length;i++){
  if(i>0&&L.stages[i-1].unlock!==undefined){
   const d=L.doors[L.stages[i-1].unlock];g[d[1]][d[0]]=0;}
  assert(reach(prev,L.stages[i].pos),'level '+li+' stage '+i+' must be reachable');
  prev=L.stages[i].pos;
 }
 console.log('map connectivity ok: level',li,'stages',L.stages.length);
}

// ---- ambushes and explosive barrels add impact to objectives ----
D.initLevel(1);
clearDialogue();
frames(90);
assert(D.barrels.length>=3,'levels should place explosive barrels');
const beforeAmbush=D.enemies.length,A=D.currentObjectivePoint();
D.objective.alarmed=false;
D.player.x=A.x;D.player.y=A.y;
frames(4);
assert(D.enemies.length>beforeAmbush,'approaching an objective should trigger an ambush');
const br=D.barrels[0],foe=D.enemies[0];
foe.x=br.x+45;foe.y=br.y;foe.hp=40;
const foeHp=foe.hp;
D.explodeBarrel(br);
assert(br.dead&&foe.hp<foeHp,'barrel blast should damage nearby enemies');
console.log('combat impact ok: ambush +',D.barrels.length,'barrels');

// ---- tracer projectiles read clearly and use shared geometry/material ----
D.bullets.length=0;
D.shoot(D.player,0,false,'rifle');
const bolt=D.bullets[D.bullets.length-1];
assert(bolt.mesh.geometry===D.TRACER_GEOS[0xff6a4a],'player bolts must use the orange-red tracer geometry');
assert(bolt.mesh.material===D.BULLET_MAT,'bolts must share one additive material');
assert(bolt.mesh.geometry.attributes.color,'tracer geometry must carry baked vertex colors');
const coreColors=bolt.mesh.geometry.attributes.color.array;
for(let i=18;i<30;i++){
 const o=i*3;
 assert(coreColors[o]>.9&&coreColors[o+1]<.25&&coreColors[o+2]<.25,
  'tracer core vertices must be bright red');
}
assert(bolt.mesh.position.y===22,'tracers must fly above the floor texture');
assert(Math.abs(bolt.mesh.rotation.y+Math.atan2(bolt.vy,bolt.vx))<1e-6,
 'tracer must be rotated along its travel direction');
D.bullets.length=0;
D.shoot({x:0,y:0,r:10,dmg:5},Math.PI/2,true);
const hostile=D.bullets[D.bullets.length-1];
assert(hostile.mesh.geometry===D.TRACER_GEOS[0xff2f3a],'enemy bolts must use the deep-red tracer geometry');
console.log('tracer bolts ok: red/orange hulls, bright-red cores, aligned to travel');

// ---- health regenerates before shields, a little faster than before ----
D.initLevel(0);clearDialogue();frames(90);
D.enemies.length=0;D.bullets.length=0;
assert(D.player.hp===150&&D.player.maxhp===150,'player health must start at 150');
assert((src.match(/hp:150,maxhp:150/g)||[]).length===3,
 'campaign, PVP and remote actors must all use 150 health');
assert(!src.includes('String(Math.ceil(value))'),
 'shield and health numbers must stay hidden');
const rgb=s=>s.match(/\d+/g).map(Number),sat=s=>{const [r,g,b]=rgb(s);return Math.max(r,g,b)-Math.min(r,g,b);};
assert(sat(D.vitalColor('#63e6ff',1))>sat(D.vitalColor('#63e6ff',.25))&&
 sat(D.vitalColor('#5dff9a',1))>sat(D.vitalColor('#5dff9a',.25))&&
 sat(D.vitalColor('#ff6a5a',1))>sat(D.vitalColor('#ff6a5a',.25)),
 'vital bars must lose colour saturation, not darken, as they fall');
assert(rgb(D.vitalColor('#5dff9a',.25)).reduce((a,n)=>a+n,0)>=
 rgb(D.vitalColor('#5dff9a',1)).reduce((a,n)=>a+n,0)*.8,
 'low vital bars must keep their brightness instead of being dimmed');
D.player.sh=0;D.player.hp=50;D.player.lastHit=D.time;
frames(60);
assert(D.player.hp===50,'health must not regenerate immediately after damage');
assert(D.player.sh===0,'shield must also wait out its delay');
assert(D.REGEN.healthDelay<=1&&D.REGEN.shieldDelay-D.REGEN.healthDelay>=2,
 'health must start regenerating well before shields');
assert(D.REGEN.healthRate>=2.2,'health regen should be a little faster than 1.8/s');
D.player.lastHit=D.time-2.2;
frames(30);
assert(D.player.hp>50,'health should regenerate first');
assert(D.player.sh===0,'shield must still be waiting when health starts');
D.player.lastHit=D.time-20;
frames(60);
assert(D.player.sh>0,'shield should recharge after its longer delay');
assert(D.player.hp>50&&D.player.hp<60,'health should regenerate steadily, not instantly');
assert(D.player.hp<=D.player.maxhp,'health must be capped at its maximum');
assert(D.REGEN.healthRate<D.REGEN.shieldRate,'health regen must be slower than shield regen');
const vr=D.vitalsRect(),hudMini=D.miniRect(),hudMoral=D.moralityRect(),
 hudObj=D.objectiveRect();
assert(vr.w<=D.W*.38+1&&vr.h>=38&&vr.h<=48&&vr.y>D.H*.75&&
 vr.y+vr.h<=D.H-10,
 'compact vitals header must sit at the bottom centre');
assert(hudObj.x===vr.x&&hudObj.w===vr.w&&hudObj.h>=17&&hudObj.h<=24&&
 hudMoral.y>hudObj.y&&hudMoral.y+hudMoral.h<=vr.y-2,
 'morality must sit directly above vitals, with the objective panel above it');
assert(hudObj.y+hudObj.h<=hudMoral.y&&
 Math.abs(hudObj.y-hudMini.y)<1&&
 Math.abs(hudMini.y+hudMini.h-(vr.y+vr.h))<1,
 'objective must be the top box and all three boxes match map height');
assert(src.includes('function drawObjectivePanel()')&&
 D.objectiveLabel().length>0&&D.objectiveProgress()>=0,
 'objective panel must own the stage label and progress value');
const vitalsBody=src.slice(src.indexOf('function drawVitals()'),src.indexOf('function objectiveFraction('));
assert(vitalsBody.includes('vitalRow(')&&!vitalsBody.includes('createLinearGradient')&&
 !vitalsBody.includes('fillText(label'),
 'vitals box must contain only shield and health rows');
assert(!src.includes('drawStatusFrame')&&src.includes('drawMiniOverlay'),
 'old M/hex map overlay must be replaced by the scan overlay');
assert(src.includes('const tsx=size/L.w,tsy=size/L.h')&&
 src.includes("miniCtx.fillStyle='#2d566e'")&&
 src.includes('Bright wall faces')&&src.includes('Open entrances'),
 'minimap must draw opaque room walls and entrances from level geometry');
const hudPause=D.pauseRect(),hudWeapons=D.weaponRects(),hudCloak=D.cloakRect(),
 hudFire=D.firePad(),hudBio=D.bioticWheelRect();
assert(Math.abs((hudMini.x+vr.x+vr.w)/2-D.W/2)<1&&hudMini.y>D.H*.75&&
 hudMini.y+hudMini.h<=D.H-10&&hudMini.w<=82,
 'compact map must sit on the left of the bottom-centre pair');
assert(Math.abs(vr.x-(hudMini.x+hudMini.w+8))<1&&
 Math.abs((hudMini.y+hudMini.h)-(vr.y+vr.h))<1,
 'vitals must sit immediately right of the map, bottom aligned');
assert(Math.abs(hudPause.x+hudPause.w/2-D.W/2)<1&&hudPause.y<40&&
 hudPause.y<hudMini.y,'pause button must return to its top-centre position');
assert(hudPause.w>=52&&hudPause.h>=28,
 'pause button must be large enough to tap reliably');
assert(Math.abs(hudMoral.x-vr.x)<1&&hudMoral.w===vr.w&&
 hudMoral.y+hudMoral.h<=vr.y+1&&hudMoral.y>hudPause.y+hudPause.h,
 'Paragon/Renegade strip must sit side by side directly above vitals');
assert(hudWeapons.panel.y<40&&hudWeapons.panel.h>=70&&hudWeapons.panel.h<=84&&
 hudWeapons.panel.w<=120&&hudWeapons.panel.x+hudWeapons.panel.w<=D.W,
 'weapon wheel panel must sit in the top-right corner');
assert(hudCloak.cx+hudCloak.r<=D.W&&hudCloak.cy+hudCloak.r<=D.H&&
 hudCloak.cx>D.W*.9&&hudCloak.cy>D.H*.9,
 'cloak must be permanently anchored in the bottom-right corner');
assert(Math.hypot(hudFire.cx-hudCloak.cx,hudFire.cy-hudCloak.cy)>
 hudFire.r+hudCloak.r-2,'fire pad must clear the separate cloak button');
assert(hudBio.x<D.W*.1&&hudBio.y<D.H*.12&&hudBio.w<=84&&hudBio.h<=84,
  'compact biotic wheel button must anchor at the top-left');
assert(src.includes('btn=clamp(W*.022,26,44)')&&src.includes('time/7.5'),
  'wheel buttons must be compact and the map scan must be less frequent');
console.log('regen/vitals ok: health first, hp',D.player.hp.toFixed(1),'shield',D.player.sh.toFixed(1));

// ---- gameplay stress ----
D.initLevel(0);
clearDialogue();
frames(90);
frames(90);                             // clear startDelay
fire('canvas:mousemove',{clientX:620,clientY:260});
fire('canvas:mousedown',{});
key('d');
for(let i=0;i<420;i++){
 if(i===40)key('q');                     // cloak (left slot)
 if(i===90)key('e');                     // equipped biotic (right slot)
 if(i===150)key('q');
 if(i===220)key('e');
 key('a',i%60<30?'keydown':'keyup');
 frames(1);
}
key('d','keyup');   // stop the stress-run movement before later tests
assert(D.player.hp>0||D.state==='DEAD','hp/state sane');
console.log('gameplay ok: state',D.state,'hp',Math.round(D.player.hp),'kills',D.player.kills,
 'bullets',D.bullets.length,'parts',D.parts.length);

// ---- aim: pointer direction must correspond to world point under pointer ----
function wantAim(sx,sy){
 const c=D.camera;
 const nx=sx/D.W*2-1, ny=-(sy/D.H)*2+1;
 const f=c.target.clone().sub(c.position).normalize();
 const r=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize();
 const u=new THREE.Vector3().crossVectors(r,f).normalize();
 const tf=Math.tan(c.fov*Math.PI/360);
 const dir=f.clone().add(r.multiplyScalar(nx*c.aspect*tf)).add(u.multiplyScalar(ny*tf)).normalize();
 const t=(18-c.position.y)/dir.y;
 const hx=c.position.x+dir.x*t, hz=c.position.z+dir.z*t;
 return Math.atan2(hz-D.player.y,hx-D.player.x);
}
D.enemies.length=0;                     // no interference
D.player.x=800;D.player.y=700;
frames(2);
const near=(a,b,tol=.08)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<tol;
for(const [sx,sy] of [[700,300],[200,300],[700,520],[400,180]]){
 fire('canvas:mousemove',{clientX:sx,clientY:sy});
 frames(20);
 const want=wantAim(sx,sy);
 console.log('aim',sx,sy,'got',D.aimDir.toFixed(3),'want',want.toFixed(3));
 assert(near(D.aimDir,want),'aim mismatch at '+sx+','+sy);
}
const held=D.aimDir;
D.player.x+=120;D.player.y+=80;frames(1);
assert(near(D.aimDir,held)||near(D.aimDir,wantAim(400,180)),'aim sane after movement');

// ---- circular fire pad ----
// Real three.js PerspectiveCamera has no .target field; the stub adds one,
// so remove it here to catch any regression that relies on that stub-only API.
delete D.camera.target;
const P=D.firePad();
fire('canvas:touchstart',{preventDefault(){},changedTouches:[{identifier:3,clientX:P.cx,clientY:P.cy}]});
assert(D.touch.fire,'fire pad should capture touch');
function padMove(x,y){fire('canvas:touchmove',{preventDefault(){},
 changedTouches:[{identifier:3,clientX:x,clientY:y}]});frames(8);}
D.player.ammo=D.player.maxammo;D.player.reload=0;D.player.fire=0;
const ammo0=D.player.ammo;
padMove(P.cx+60,P.cy);
console.log('pad right aim',D.aimDir.toFixed(3));
assert(near(D.aimDir,0,.2),'pad right should aim world +x');
padMove(P.cx,P.cy-60);
console.log('pad up aim',D.aimDir.toFixed(3));
assert(near(D.aimDir,-Math.PI/2,.2),'pad up should aim world -z');
assert(D.player.ammo<ammo0,'fire pad should auto-fire');
fire('canvas:touchend',{changedTouches:[{identifier:3,clientX:P.cx,clientY:P.cy}]});
assert(!D.touch.fire,'fire pad should release');
console.log('fire pad checks ok');

// ---- right side outside the ring is look-only: aims, never fires ----
fire('mouseup',{});
D.mouse.moved=false;   // isolate touch input from mouse aiming
D.player.ammo=D.player.maxammo;D.player.reload=0;D.player.fire=0;
const lookAim=D.aimDir,lookAmmo=D.player.ammo;
fire('canvas:touchstart',{preventDefault(){},changedTouches:[{identifier:9,clientX:D.W*.8,clientY:D.H*.3}]});
fire('canvas:touchmove',{preventDefault(){},changedTouches:[{identifier:9,clientX:D.W*.8+70,clientY:D.H*.3}]});
frames(20);
assert(D.touch.look,'right-side touch should create a look drag');
assert(!D.touch.fire,'look drag must not create a fire stick');
assert(D.player.ammo===lookAmmo,'look drag must not fire');
assert(!near(D.aimDir,lookAim),'look drag should rotate the aim');
fire('canvas:touchend',{changedTouches:[{identifier:9,clientX:D.W*.8+70,clientY:D.H*.3}]});
assert(!D.touch.look,'look drag should release');
console.log('touch isolation checks ok');

// ---- original-game weapon wheel: hold + slide to choose, tap to reload ----
const WP=D.weaponRects();
const bioBtn=D.abilityRects().biotic;
assert(WP.panel&&WP.panel.w===WP.panel.h&&WP.panel.w===bioBtn.w&&WP.panel.h===bioBtn.h,
 'weapon button must be the same compact square as the biotic button');
assert(src.slice(src.indexOf('function drawWeaponPanel(){'),src.indexOf('function drawBioticButton(){'))
 .includes('const r=weaponRects().panel,w=player.weapon,heat=weaponHeatFraction(),cut=10;'),
 'weapon button must use the same chamfer cut as the biotic button');
assert(D.weapons.join(',')==='rifle,shotgun','weapon wheel order');
const wslots=D.wheelSlots('weapon'),wgeom=D.wheelGeom('weapon');
assert(wslots.length===2&&wslots.map(s=>s.key).join(',')==='rifle,shotgun',
 'weapon wheel must show only the two owned weapons');
assert(wslots.map(s=>s.pos).join(',')==='0,1',
 'rifle and shotgun must sit in the first two weapon arc positions');
assert(wgeom.cx>D.W&&wgeom.r>D.W*.2,'weapon wheel must follow the original top-right arc');
const ax=WP.panel.x+WP.panel.w/2,ay=WP.panel.y+WP.panel.h/2;
let wheelTouchId=11;
const holdWheelSlot=(kind,slot,id=wheelTouchId++)=>{
 const br=kind==='weapon'?null:D.bioticWheelRect();
 const anchor=kind==='weapon'?{x:ax,y:ay}:{x:br.x+br.w/2,y:br.y+br.h/2};
 const p=D.wheelPoint(kind,slot);
 fire('canvas:touchstart',{preventDefault(){},changedTouches:[
  {identifier:id,clientX:anchor.x,clientY:anchor.y}]});
 fire('canvas:touchmove',{preventDefault(){},changedTouches:[
  {identifier:id,clientX:p.x,clientY:p.y}]});
 fire('canvas:touchend',{changedTouches:[{identifier:id,clientX:p.x,clientY:p.y}]});
 frames(2);};
const saved={ammo:D.player.ammo,reserve:D.player.reserve.rifle};
holdWheelSlot('weapon',1);
assert(D.player.weapon==='shotgun','sliding along the weapon arc should choose shotgun');
assert(D.player.ammo===8&&D.player.maxammo===8,'shotgun ammo should be 8');
assert(D.player.reserve.shotgun===48,'shotgun reserve should be 48');
assert(!D.touch.fire,'weapon wheel must not trigger fire stick');
const beforePellets=D.bullets.length;
D.shoot(D.player,0,false,D.player.weapon);
assert(D.bullets.length-beforePellets>=6,'shotgun should fire a pellet spread');
// A plain tap reloads without changing the selected weapon.
D.player.ammo=3;D.player.reload=0;
fire('canvas:touchstart',{preventDefault(){},changedTouches:[
 {identifier:13,clientX:ax,clientY:ay}]});
fire('canvas:touchend',{changedTouches:[{identifier:13,clientX:ax,clientY:ay}]});
assert(D.player.weapon==='shotgun','tapping the weapon wheel must not switch weapon');
assert(D.player.reload>0,'tapping the weapon wheel must force a reload');
assert(D.player.ammo===3,'reload must not instantly refill the magazine');
D.player.reload=0;
// Slide back along the arc to the carbine.
holdWheelSlot('weapon',0);
assert(D.player.weapon==='rifle','sliding back along the weapon arc should return to carbine');
assert(D.player.ammo===saved.ammo&&D.player.reserve.rifle===saved.reserve,
 'switching should preserve carbine ammo and reserve');
// Reload pulls from the reserve instead of refilling for free.
D.player.reserve.rifle=100;D.player.ammo=0;D.player.reload=.04;frames(4);
assert(D.player.ammo>0&&D.player.reserve.rifle<100,'reload should consume reserve');
// Mouse click on the wheel is a tap reload, not a fire or a switch.
const clickWeapon=D.player.weapon,clickReserve=D.player.reserve[clickWeapon];
D.player.ammo=6;D.player.reload=0;
fire('canvas:mousedown',{clientX:ax,clientY:ay});
fire('mouseup',{});
assert(D.player.weapon===clickWeapon,'clicking the weapon wheel must not switch weapon');
assert(D.player.reload>0,'clicking the weapon wheel must force a reload');
assert(!D.mouse.down,'weapon wheel click must not start firing');
D.player.reload=.04;frames(4);
assert(D.player.ammo===D.player.maxammo,'forced reload should top off the magazine');
assert(D.player.reserve[clickWeapon]===clickReserve-(D.player.maxammo-6),
 'forced reload must consume reserve');
assert(D.weaponHeatFraction()===0,'full magazine must leave the heat button empty');
D.player.ammo=D.player.maxammo/2;
assert(Math.abs(D.weaponHeatFraction()-.5)<.01,'heat should scale with spent ammunition');
D.player.ammo=0;
assert(D.weaponHeatFraction()===1,'empty magazine should fill the heat button');
D.player.reload=D.reloadDuration(D.player.weapon)/2;
assert(Math.abs(D.weaponHeatFraction()-.5)<.01,'heat should drain while reloading');
D.player.reload=0;D.player.ammo=D.player.maxammo;
console.log('weapon wheel ok: two-slot arc, ammo '+D.player.ammo+' / '+D.player.reserve.rifle);

// ---- model + physics behaviour ----
D.initLevel(0);
clearDialogue();
frames(90);
assert(D.enemies.length>=2,'enemies spawned');
const randall=D.player.mesh.userData;
assert(randall.helmet&&randall.helmetShell&&randall.faceplate&&randall.visor,
 'Randall must have a fully enclosed helmet with shell, faceplate and visor');
assert(!randall.face&&!randall.hair&&!randall.nose&&!randall.skull&&!randall.jaw,
 'no exposed face, hair, skin or nose may remain');
assert(randall.body&&randall.underSuit&&randall.armor&&randall.armor.length>=10&&!randall.backpack,
 'layered armor plates must sit over a carbon undersuit');
assert(randall.hands&&randall.hands.length===2&&randall.hands.every(h=>h.children.length>=4),
 'both hands must be fully armored, partially clenched gloves');
const gloveWorld=randall.hands.map(h=>({
 x:h.parent.position.x+h.position.x,
 y:h.parent.position.y+h.position.y,
 z:h.parent.position.z+h.position.z}));
assert(Math.abs(gloveWorld[0].x-14)<.01&&Math.abs(gloveWorld[0].z-4)<.01&&
 Math.abs(gloveWorld[1].x-1)<.01&&Math.abs(gloveWorld[1].z-9)<.01,
 'hands must keep their original aiming coordinates');
assert(randall.body&&randall.chest&&randall.body!==randall.chest&&
 randall.bodyProfile&&randall.chestProfile,
 'abdomen and chest must be separate body meshes');
const seamMatches=u=>{
 const a=u.bodyProfile[u.bodyProfile.length-1],b=u.chestProfile[0];
 return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];
};
assert(seamMatches(randall),'abdomen and chest must share an identical seam ring');
const ellipseAt=(u,y)=>{
 const p=y<=15?u.bodyProfile:u.chestProfile;
 if(y<=p[0][2])return {x:p[0][0],z:p[0][1]};
 for(let i=1;i<p.length;i++)if(y<=p[i][2]){
  const a=p[i-1],b=p[i],t=(y-a[2])/(b[2]-a[2]);
  return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t};
 }
 return {x:p[p.length-1][0],z:p[p.length-1][1]};
};
const ellipseClearance=(x,z,e)=>{
 let m=Infinity;
 for(let i=0;i<48;i++){
  const a=i/48*Math.PI*2;
  m=Math.min(m,Math.hypot(x-Math.cos(a)*e.x,z-Math.sin(a)*e.z));
 }
 return m;
};
assert(ellipseAt(randall,21).x-ellipseAt(randall,8).x>1.2,
 'upper chest must be visibly broader than the waist');
const boneRadii=[3,2.8,2.5,2.2,1.9];
let armClearance=Infinity;
for(let i=1;i<20;i++){
 const t=i/20,x=14*t,z=-10+14*t,y=39-9*t-15,q=t*4,lo=Math.floor(q);
 const bone=lo>=4?boneRadii[4]:boneRadii[lo]+(boneRadii[lo+1]-boneRadii[lo])*(q-lo);
 armClearance=Math.min(armClearance,
  ellipseClearance(x,z,ellipseAt(randall,y))-bone);
}
assert(armClearance>0,'left forearm must clear the split torso through its full arc');
assert(randall.back&&randall.back.children.length>=5&&
 randall.back.children.every(c=>c.position.x<0)&&
 randall.back.children.some(c=>c.position.x-c.scale.x<-6),
 'enlarged dark back shell must sit behind the torso under the armor');
assert(randall.helmetStripes&&randall.helmetStripes.length===2&&randall.sensors&&randall.sensors.length>=3,
 'helmet needs twin white bars and multiple circular optical sensors');
assert(randall.lLeg&&randall.rLeg&&randall.lLeg.position.x>randall.rLeg.position.x,
 'stance must be slightly asymmetrical with one leg forward');
const e1=D.enemies[0],e2=D.enemies[1];
const eu=e1.mesh.userData;
assert(eu.body&&eu.chest&&eu.body!==eu.chest&&eu.bodyProfile&&eu.chestProfile&&
 seamMatches(eu),'humanoid abdomen and chest must share a seamless ring');
assert(eu.back&&eu.back.children.length>=5&&
 eu.back.children.every(c=>c.position.x<0)&&
 eu.back.children.some(c=>c.position.x-c.scale.x<-6.5),
 'humanoid enlarged back shell must sit behind the torso under the armor');
const limbClearance=(a,b,r,u)=>{
 let m=Infinity;
 for(let i=1;i<20;i++){
  const t=i/20,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t,y=a[1]+(b[1]-a[1])*t-15;
  m=Math.min(m,ellipseClearance(x,z,ellipseAt(u,y))-r);
 }
 return m;
};
assert(limbClearance([0,40,-9],[4,32,-8],2.8,eu)>0&&
 limbClearance([4,32,-8],[13,30,4],2.2,eu)>0,
 'humanoid left forearm must clear the split torso through both segments');
assert(ellipseAt(eu,21).x-ellipseAt(eu,9).x>1.5,
 'humanoid upper chest must be broader than the waist');
assert(e1.mesh.userData.lLeg&&e1.mesh.userData.rifle,'humanoid rig present');
e1.x=600;e1.y=600;e2.x=603;e2.y=600;
frames(4);
const sep=Math.hypot(e1.x-e2.x,e1.y-e2.y);
console.log('separation',sep.toFixed(2));
assert(sep>10,'overlapping enemies should push apart');
const rx=e1.mesh.userData.rifle.position.x;
D.shoot(e1,0,true);frames(2);
assert(e1.mesh.userData.rifle.position.x<rx,'rifle should kick back on fire');
D.player.x=400;D.player.y=400;   // within engagement range so the enemy advances
e1.vx=200;e1.vy=0;frames(6);
assert(Math.abs(e1.mesh.userData.lLeg.rotation.z)>.01,'legs should swing while moving');
D.dieEnemy(e1);frames(12);
assert(e1.mesh.rotation.z>.1,'dead body should tip over');
frames(80);
assert(!D.enemies.includes(e1),'corpse should be culled from logic');
assert(!D.actorG.children.includes(e1.mesh),'corpse mesh should be removed from scene');

// Bosses and mini-bosses must read as encounters, not reskinned troopers.
const bossProbe=D.makeEnemy('boss',520,420),miniProbe=D.makeEnemy('praetorian',560,420);
D.spawnEnemyMesh(bossProbe);D.spawnEnemyMesh(miniProbe);
const bu=bossProbe.mesh.userData,mu=miniProbe.mesh.userData;
assert(bu.bossSigil&&bu.bossHalo&&bu.bossCrest&&mu.bossSigil&&mu.bossHalo&&mu.bossCrest,
 'bosses and mini-bosses must carry a command sigil, halo and crest');
assert(bossProbe.mesh.scale.x>1.3&&miniProbe.mesh.scale.x>1.3,
 'bosses and mini-bosses must scale above ordinary enemies');
assert(bu.bossSigil.geometry===mu.bossSigil.geometry&&
 bu.bossHalo.geometry===mu.bossSigil.geometry,
 'command sigil geometry must be shared across encounters');
D.showBossCard(miniProbe,'mini');
assert(D.bossCard&&D.bossCard.kind==='mini'&&D.bossCard.name==='PRAETORIAN'&&D.bossCard.t>3,
 'mini-boss entrance must stage a held encounter card');
assert(D.i18n.en.bossEncounter==='BOSS ENCOUNTER'&&D.i18n.fa.bossEncounter==='نبرد رئیس'&&
 D.i18n.en.miniBossEncounter==='MINI-BOSS ENCOUNTER'&&
 D.i18n.fa.miniBossEncounter==='نبرد رئیس فرعی',
 'encounter card labels must have English and Persian strings');
assert(D.faText['DIRECTOR']&&D.faText['DIRECTOR MECH'],
 'boss names shown on encounter cards must have Persian translations');
const enemiesBeforeAlarm=D.enemies.length;
D.raiseAlarm({ambush:[['lancer',10,10]]});
assert(D.bossCard&&D.bossCard.kind==='mini'&&D.bossCard.name==='LANCER'&&D.bossCard.t>3,
 'boss ambushes must trigger the encounter card');
for(const e of D.enemies.slice(enemiesBeforeAlarm)){
 D.actorG.remove(e.mesh);D.actorG.remove(e.blob);}
D.enemies.length=enemiesBeforeAlarm;
D.actorG.remove(bossProbe.mesh);D.actorG.remove(bossProbe.blob);
D.actorG.remove(miniProbe.mesh);D.actorG.remove(miniProbe.blob);
console.log('model/physics checks ok');

// ---- body-radius wall collision and obstacle-safe spawns ----
D.initLevel(0);clearDialogue();
const TILE=D.tileSize,wallEdge=2*TILE,wallY=10*TILE+TILE/2;
assert(D.wallAtTile(1,10),'fixture wall tile should be solid');
assert(!D.solidAt(wallEdge+8,wallY),'fixture center should still be in open space');
assert(D.solidCircle(wallEdge+8,wallY,D.player.r),'body radius should detect the adjacent wall');
assert(!D.solidCircle(wallEdge+20,wallY,D.player.r),'clear tile should not report a wall');
D.player.x=wallEdge+20;D.player.y=wallY;
D.moveEntity(D.player,-14,0);
assert(D.player.x===wallEdge+20,'movement must stop before the body enters a wall');
D.initLevel(1);clearDialogue();
const blockedSpawn=D.levels[1].stages[1].spawn[0];
const cx=blockedSpawn[1]*TILE+TILE/2,cy=blockedSpawn[2]*TILE+TILE/2;
assert(D.cover.some(c=>c.x===cx&&c.y===cy),'fixture spawn should sit on a cover tile');
const [spawnX,spawnY]=D.safeSpawn(cx,cy,D.player.r);
assert(Math.hypot(spawnX-cx,spawnY-cy)>=TILE,'blocked spawn should be relocated to a clear tile');
assert(!D.solidCircle(spawnX,spawnY,D.player.r),'relocated spawn should clear walls');
assert(!D.cover.some(c=>c.hp>0&&Math.hypot(spawnX-c.x,spawnY-c.y)<TILE/2),
 'relocated spawn should not land on intact cover');
console.log('collision/spawn clearance ok');
D.initLevel(0);clearDialogue();

// ---- in-game pause button and menu ----
D.enemies.length=0;D.bullets.length=0;
D.player.x=400;D.player.y=400;
const PR=D.pauseRect();
fire('canvas:touchstart',{preventDefault(){},changedTouches:[
 {identifier:77,clientX:PR.x+PR.w/2,clientY:PR.y+PR.h/2}]});
assert(D.state==='PAUSE','pause button should pause the mission');
const frozenX=D.player.x,frozenY=D.player.y;
key('d');frames(30);
assert(D.player.x===frozenX&&D.player.y===frozenY,'pause must freeze gameplay');
key('Enter');frames(3);
assert(D.state==='PLAY','Resume should return to play');
key('Escape');frames(2);
assert(D.state==='PAUSE','Escape should open the pause menu');
key('ArrowDown');key('Enter');frames(3);
assert(D.state==='DIALOGUE'&&D.levelIdx===0,'Restart Mission should reload this level');
clearDialogue();frames(90);
key('Escape');frames(2);
key('ArrowDown');key('ArrowDown');key('Enter');frames(3);
assert(D.state==='TITLE','Return to Main Menu should exit the mission');
D.resetCampaign();D.initLevel(0);clearDialogue();frames(90);
console.log('pause menu ok: resume, restart, main menu');

// ---- biotic dash: targets every nearby enemy, dashes through with impact ----
D.enemies.length=0;D.bullets.length=0;D.fields.length=0;
D.player.x=400;D.player.y=400;D.player.hp=100;D.player.sh=60;
D.player.dash=null;D.player.dashCd=0;D.player.biot=0;
const nearA=D.makeEnemy('trooper',500,400),nearB=D.makeEnemy('elite',560,400),
 edge=D.makeEnemy('trooper',720,400),far=D.makeEnemy('boss',900,400);
nearA.hp=220;nearB.hp=220;edge.hp=220;far.hp=500;
D.enemies.push(nearA,nearB,edge,far);
const hpA=nearA.hp,hpB=nearB.hp,hpEdge=edge.hp,hpFar=far.hp,startX=D.player.x;
D.triggerDash();
assert(!!D.player.dash,'dash should start');
assert(D.player.dash.pts.length>=3,'dash should chain through both in-range targets');
const invulnHp=D.player.hp,invulnSh=D.player.sh;
D.hurtPlayer(60);
assert(D.player.hp===invulnHp&&D.player.sh===invulnSh,'dash should grant impact invulnerability');
frames(45);
assert(!D.player.dash,'dash should finish');
assert(nearA.hp<hpA&&nearB.hp<hpB,'every in-range target should take impact damage');
assert(edge.hp===hpEdge,'enemy just beyond dash range should be untouched');
assert(far.hp===hpFar,'out-of-range enemy should be untouched');
assert(D.player.x>startX+150,'player should dash forward through the targets');
assert(D.player.biot>0,'dash should start the shared biotic cooldown');
const wellDuringDashCd=D.fields.length,barrierDuringDashCd=D.player.barrier;
D.triggerBiotic();D.castBarrier();
assert(D.fields.length===wellDuringDashCd&&D.player.barrier===barrierDuringDashCd,
 'shared cooldown must block Well and Barrier while Dash is cooling');
console.log('dash ok: targets hit',nearA.hp.toFixed(0),nearB.hp.toFixed(0),
 'edge',edge.hp.toFixed(0),'far',far.hp.toFixed(0),'x',D.player.x.toFixed(0));

// ---- walls stop the dash, in-room cover does not ----
D.enemies.length=0;D.bullets.length=0;
D.player.x=756;D.player.y=400;D.player.dash=null;D.player.dashCd=0;D.player.biot=0;
const visible=D.makeEnemy('trooper',700,400),hidden=D.makeEnemy('elite',936,400);
visible.hp=220;hidden.hp=220;
D.enemies.push(visible,hidden);
const hiddenHp=hidden.hp;
D.triggerDash();
assert(!!D.player.dash,'dash should still fire with a visible target');
frames(45);
assert(visible.hp<220,'enemy inside the room should be hit');
assert(hidden.hp===hiddenHp,'enemy behind a room wall must not be hit');
assert(D.player.x<756,'dash must not cross the wall to the right');
console.log('dash wall check ok: hidden hp',hidden.hp,'x',D.player.x.toFixed(0));

// ---- room cover is not a wall: dash passes through it ----
D.enemies.length=0;D.bullets.length=0;
D.player.x=588;D.player.y=532;D.player.dash=null;D.player.dashCd=0;D.player.biot=0;
const covered=D.makeEnemy('trooper',700,532);covered.hp=220;D.enemies.push(covered);
D.triggerDash();
assert(!!D.player.dash,'dash should pass through in-room cover');
frames(45);
assert(covered.hp<220,'enemy behind room cover should still be hit');
console.log('dash cover check ok: hp',covered.hp.toFixed(0));

// ---- original-game corners: top-left biotic wheel, bottom-right Cloak ----
D.resetCampaign();D.initLevel(0);clearDialogue();frames(90);
const slots=D.abilityRects();
assert(slots.biotic&&slots.cloak,'biotic wheel and Cloak button must exist');
assert(slots.biotic.x<D.W*.12&&slots.biotic.y<D.H*.12,
 'biotic wheel must sit in the top-left corner');
assert(slots.cloak.x>D.W*.9&&slots.cloak.y>D.H*.9,
 'Cloak must sit alone in the bottom-right corner');
assert(!D.campaign.biotics.equipped&&!D.campaign.biotics.unlocked.well,
 'quick-power slot must start locked while Cloak stays available');
const bslots=D.wheelSlots('biotic'),bgeom=D.wheelGeom('biotic');
assert(bslots.length===3&&bslots.map(s=>s.key).join(',')==='well,dash,barrier',
 'biotic wheel must use only the three owned slots');
assert(!src.includes("key:'homing'"),'redundant Homing slot must be removed from the biotic wheel');
assert(bgeom.cx<0&&bgeom.r>D.W*.19,'biotic wheel must follow the original top-left arc');
const tapAt=(x,y,id=82)=>{
 fire('canvas:touchstart',{preventDefault(){},changedTouches:[{identifier:id,clientX:x,clientY:y}]});
 fire('canvas:touchend',{changedTouches:[{identifier:id,clientX:x,clientY:y}]});
 frames(2);};
const bx=slots.biotic.x+slots.biotic.w/2,by=slots.biotic.y+slots.biotic.h/2;
const cloakX=slots.cloak.x+slots.cloak.w/2,cloakY=slots.cloak.y+slots.cloak.h/2;
// The revealed arc eases into place but its slots must never collapse into the
// button, where they would be invisible during a quick swipe.
const revealSlot=D.wheelPoint('biotic',0),revealStartPos=D.wheelSlotPos('biotic',0,0);
assert(Math.hypot(revealStartPos.x-bx,revealStartPos.y-by)>
 Math.hypot(revealSlot.x-bx,revealSlot.y-by)*.4,
 'slots must stay visibly out on the arc at the start of the reveal');
assert(Math.hypot(D.wheelSlotPos('biotic',0,1).x-revealSlot.x,
 D.wheelSlotPos('biotic',0,1).y-revealSlot.y)<1e-9,
 'settled slot must land exactly on its wheel point');
fire('canvas:touchstart',{preventDefault(){},changedTouches:[
 {identifier:89,clientX:bx,clientY:by}]});
fire('canvas:touchmove',{preventDefault(){},changedTouches:[
 {identifier:89,clientX:revealSlot.x,clientY:revealSlot.y}]});
const revealStart=D.wheelReveal();
frames(2);
const revealMid=D.wheelReveal();
assert(revealStart<.05&&revealMid>revealStart&&revealMid<1,
 'biotic wheel must ease its slots from the near arc into place');
frames(8);
assert(D.wheelReveal()===1,'wheel reveal must settle fully open');
fire('canvas:touchend',{changedTouches:[{identifier:89,clientX:bx,clientY:by}]});
frames(2);

// Q is always Cloak: the original rig-fade visual, fire dissipation and immunity.
D.enemies.length=0;D.bullets.length=0;D.fields.length=0;
D.player.x=400;D.player.y=400;D.player.hp=100;D.player.sh=60;
D.player.cloak=0;D.player.cloakCd=0;D.player.dash=null;D.player.dashCd=0;
D.player.barrier=0;D.player.barrierCd=0;D.player.biot=0;
let cloakedMesh=null;D.player.mesh.traverse(o=>{
 if(!cloakedMesh&&o.isMesh&&o.material)cloakedMesh=o;});
assert(cloakedMesh,'player rig should expose meshes for cloak visuals');
const baseOpacity=cloakedMesh.material.opacity;
D.shoot({x:480,y:400,r:10,dmg:10},Math.PI,true);
assert(D.bullets.some(b=>b.enemy),'test needs an enemy bolt to dissipate');
const watcher=D.makeEnemy('trooper',500,400);watcher.fire=0;watcher.charge=0;
D.enemies.push(watcher);
tapAt(cloakX,cloakY);
assert(D.player.cloak>0&&D.player.cloakCd>0,
 'bottom-right button should engage Cloak and start its cooldown');
assert(D.fields.length===0&&!D.player.dash,'Q must not cast the right-slot biotic');
assert(!D.bullets.some(b=>b.enemy),'Cloak should dissipate enemy bolts in flight');
assert(watcher.fire>.8,'Cloak should interrupt enemy fire');
assert(D.player.cloakFx===undefined,
 'Cloak should use the original rig-fade visual with no shell/rings');
assert(cloakedMesh.material.transparent&&cloakedMesh.material.depthWrite===false&&
 cloakedMesh.material.opacity<baseOpacity,'Cloak should fade the player rig');
const cloakHp=D.player.hp,cloakSh=D.player.sh;
D.hurtPlayer(40);
assert(D.player.hp===cloakHp&&D.player.sh===cloakSh,
 'Cloak should make the player invulnerable while active');
D.player.cloak=.01;frames(2);
assert(D.player.cloak===0,'Cloak should end');
assert(!cloakedMesh.__cloak&&cloakedMesh.material.opacity===baseOpacity,
 'Cloak should restore the original rig materials');
D.player.cloakCd=0;
console.log('cloak button ok: permanent bottom-right, fade, dissipation, immunity');

// E stays locked until a biotic is earned, and cycling cannot conjure one.
D.enemies.length=0;D.bullets.length=0;D.fields.length=0;
D.player.dash=null;D.player.dashCd=0;D.player.barrier=0;D.player.barrierCd=0;
D.player.biot=0;
key('e');frames(2);
assert(D.fields.length===0&&!D.player.dash&&D.player.barrier===0,
 'E must do nothing while the biotic slot is locked');
key(']');frames(2);
assert(!D.campaign.biotics.equipped,'cycling cannot equip a locked biotic');
console.log('biotic wheel lock ok');

// Clearing the first level-1 stage unlocks and auto-equips Well.
D.completeStage(D.levels[0].stages[0]);
assert(D.campaign.biotics.unlocked.well&&D.campaign.biotics.equipped==='well',
 'first unlock should make Well available and equip it');

// E now casts the equipped Well: damage, gravity, FX and expiry.
D.enemies.length=0;D.bullets.length=0;D.fields.length=0;
D.player.x=400;D.player.y=400;D.player.biot=0;
const wellVictim=D.makeEnemy('mech',540,400);
D.enemies.push(wellVictim);
const wellHp=wellVictim.hp,wellD=wellVictim.x-D.player.x;
key('e');frames(2);
assert(D.player.biot>11,'Well should start the shared 12 second biotic cooldown');
assert(D.activeBiotic()&&D.activeBiotic().key==='well',
 'biotic button should show the active Well while its field runs');
assert(D.fields.length===1,'Well should create a persistent field');
assert(D.fields[0].shock&&D.fields[0].ring2&&D.fields[0].light,
 'Well should have shockwave, spinning ring and light');
const shock0=D.fields[0].shock.scale.x;
frames(10);
assert(D.fields[0].shock.scale.x>shock0,'shockwave should expand');
frames(110);
console.log('well hp',wellHp.toFixed(1),'->',wellVictim.hp.toFixed(1),
 'dist',wellD.toFixed(1),'->',(wellVictim.x-D.player.x).toFixed(1));
assert(wellVictim.hp<wellHp-20,'Well should damage enemies over time');
assert(Math.abs(wellVictim.x-D.player.x)<Math.abs(wellD)-20,'Well should pull enemies inward');
frames(200);
assert(D.fields.length===0,'Well should expire');
assert(!D.activeBiotic(),'biotic button should return to the generic sigil once Well ends');
console.log('biotic well checks ok');

// Level 2 unlocks Dash, but it must be equipped before E will cast it.
D.initLevel(1);clearDialogue();frames(90);
D.objective.stage=0;D.completeStage(D.levels[1].stages[0]);
assert(D.campaign.biotics.unlocked.dash&&D.campaign.biotics.equipped==='well',
 'unlocking Dash must not silently replace the equipped Well');
key(']');frames(2);
assert(D.equippedBiotic()&&D.equippedBiotic().key==='dash',
 'right arrow should equip the newly unlocked Dash');
D.enemies.length=0;D.bullets.length=0;D.fields.length=0;
const dashStart=D.levels[1].start;
D.player.x=dashStart[0]*D.tileSize+D.tileSize/2;
D.player.y=dashStart[1]*D.tileSize+D.tileSize/2;
D.player.dash=null;D.player.dashCd=0;
D.player.barrier=0;D.player.barrierCd=0;D.player.biot=0;
const dashTarget=D.makeEnemy('trooper',D.player.x+80,D.player.y);
dashTarget.hp=220;D.enemies.push(dashTarget);
key('e');frames(2);
assert(!!D.player.dash,'E should cast the equipped Dash');
assert(D.player.biot>11,'Dash should start the shared biotic cooldown');
assert(D.activeBiotic()&&D.activeBiotic().key==='dash',
 'biotic button should show the active Dash while it is moving');
const fieldsDuringDash=D.fields.length;
D.triggerBiotic();
assert(D.fields.length===fieldsDuringDash,'Well must wait for the shared biotic cooldown');
frames(45);
console.log('dash equip ok: E casts the keyboard slot under the shared cooldown');

// Level 3 unlocks Barrier in the quick-power wheel; Dash stays equipped.
D.initLevel(2);clearDialogue();frames(90);
D.objective.stage=0;D.completeStage(D.levels[2].stages[0]);
assert(D.campaign.biotics.unlocked.barrier&&D.campaign.biotics.equipped==='dash',
 'unlocking Barrier must not silently replace the equipped Dash');
assert(Object.keys(D.campaign.biotics.unlocked).length===3,
 'all three biotics should be unlockable through play');
D.enemies.length=0;D.bullets.length=0;D.fields.length=0;
D.player.x=400;D.player.y=400;D.player.hp=100;D.player.sh=0;
D.player.barrier=0;D.player.barrierCd=0;D.player.dash=null;D.player.dashCd=0;
D.player.biot=0;
// Hold the top-left wheel and slide to Barrier; release casts it directly.
const equippedBeforeWheel=D.campaign.biotics.equipped;
holdWheelSlot('biotic',2,84);
assert(D.campaign.biotics.equipped===equippedBeforeWheel,
 'the biotic wheel must cast without equipping a hidden quick slot');
assert(D.player.barrier>0&&D.player.biot>11,
 'releasing on Barrier must activate it and start the shared cooldown');
assert(D.activeBiotic()&&D.activeBiotic().key==='barrier',
 'biotic button should show the active Barrier while its cage is up');
const barrierCdAfterPick=D.player.biot;
holdWheelSlot('biotic',2,87);
assert(Math.abs(D.player.biot-barrierCdAfterPick)<.2,
 'releasing on a biotic already on cooldown must not recast it');
assert(Math.abs(D.player.barrier-10)<.1,'Barrier should stay enabled for about 10 seconds, got '+D.player.barrier);
assert(D.player.barrierCd===0,'Barrier must not keep a separate cooldown');
assert(D.BIOTICS.every(b=>b.cd===D.bioticCd),'all biotics must expose the one shared cooldown');
const fieldsBeforeBlock=D.fields.length,dashBeforeBlock=D.player.dash;
D.triggerDirectAbility('well');D.triggerDash();
assert(D.fields.length===fieldsBeforeBlock&&D.player.dash===dashBeforeBlock,
 'no other biotic may start while Barrier is on the shared cooldown');
assert(Math.abs(D.maxShield()-D.player.maxsh*1.25)<1e-9,
 'Barrier should give 25% more shields while active');
assert(src.includes('50% damage reduction and 25% more shields'),
 'Barrier help text must state 50% damage reduction and 25% more shields');
assert(!D.player.cloak&&!D.player.dash&&D.fields.length===0,
 'Barrier must not cast Cloak, Dash or Well');
assert(!!D.player.barrierFx&&D.player.barrierFx.length===3,
 'Barrier should build a faceted cage and two orbiting nodes');
const cage=D.player.barrierFx[0],nodeA=D.player.barrierFx[1],nodeB=D.player.barrierFx[2];
assert(cage.geometry===D.DODEC&&nodeA.geometry===D.OCT&&nodeB.geometry===D.OCT,
 'Barrier should use the shared cage and node geometries');
assert(D.fxG.children.includes(cage)&&D.fxG.children.includes(nodeA)&&
 D.fxG.children.includes(nodeB),
 'Barrier visuals should live in the shared FX group');
const node0=nodeA.position.clone(),cageRot0=cage.rotation.y;
frames(12);
assert(Math.hypot(nodeA.position.x-node0.x,nodeA.position.y-node0.y,
 nodeA.position.z-node0.z)>.5,'Barrier nodes should animate around the cage');
assert(cage.rotation.y!==cageRot0,'Barrier cage should slowly rotate');
D.player.sh=0;D.player.lastHit=D.time;
const barrierHp=D.player.hp;
D.hurtPlayer(20);
assert(Math.abs((barrierHp-D.player.hp)-10)<1e-6,
 'Barrier should reduce incoming damage by 50%');
assert(D.shieldDelay()===D.REGEN.shieldDelay,
 'Barrier should not change the shield recharge delay');
assert(Math.abs(D.shieldRate()-D.REGEN.shieldRate*1.25)<1e-9,
 'Barrier should still increase shield recharge by 25%');
D.player.sh=0;D.player.lastHit=D.time-D.REGEN.shieldDelay-.1;
frames(2);
const shWith=D.player.sh;frames(10);const gainWith=D.player.sh-shWith;
assert(gainWith>0,'shields should recharge while Barrier is active');
D.player.barrier=.01;frames(2);
assert(D.player.barrier===0&&!D.player.barrierFx,'Barrier should expire and clear its FX');
assert(!D.activeBiotic(),'biotics should no longer be active once the cage ends');
assert(D.bioticCooldownRemaining()>0,'generic biotic icon keeps its cooldown fill after Barrier ends');
assert(Math.abs(D.maxShield()-D.player.maxsh)<1e-9,
 'max shields must return to base once Barrier expires');
assert(Math.abs(D.shieldRate()-D.REGEN.shieldRate)<1e-9,
 'without Barrier the base shield recharge rate should apply');
D.player.sh=0;D.player.lastHit=D.time-D.REGEN.shieldDelay-.1;
frames(2);
const shWithout=D.player.sh;frames(10);const gainWithout=D.player.sh-shWithout;
assert(gainWith>gainWithout,'Barrier should refill shields faster than base');
D.player.biot=0;
assert(D.bioticCooldownRemaining()===0,
 'biotic button must show no blue indicator when the shared timer is ready');
D.castBarrier();
assert(Math.abs(D.bioticCooldownRemaining()-1)<.01,
 'casting should fill the blue cooldown indicator from the bottom');
assert(D.activeBiotic()&&D.activeBiotic().key==='barrier',
 'active Barrier icon should sit on top of the cooldown fill');
frames(12);
const bioticRem=D.bioticCooldownRemaining();
assert(bioticRem>0&&bioticRem<1,'blue cooldown indicator should drain over time');
D.player.barrier=0;D.player.biot=0;frames(2);
assert(D.bioticCooldownRemaining()===0&&!D.activeBiotic(),
 'generic biotic sigil returns once the shared cooldown ends');
tapAt(bx,by);
assert(!D.player.barrier&&!D.fields.length&&!D.player.dash&&D.player.biot===0,
 'a plain biotic tap must neither cast nor equip');
// Holding the button used to turn finger jitter into a random cast after the
// old timer expired. Repeated press-and-hold gestures must stay inert.
const jitterHoldBiotic=id=>{
 fire('canvas:touchstart',{preventDefault(){},changedTouches:[
  {identifier:id,clientX:bx,clientY:by}]});
 frames(20);
 fire('canvas:touchmove',{preventDefault(){},changedTouches:[
  {identifier:id,clientX:bx+2,clientY:by+1}]});
 fire('canvas:touchend',{changedTouches:[
  {identifier:id,clientX:bx+2,clientY:by+1}]});
 frames(2);};
for(let i=0;i<4;i++)jitterHoldBiotic(90+i);
assert(!D.player.barrier&&!D.fields.length&&!D.player.dash&&D.player.biot===0,
 'holding or jittering the biotic button must never cast a power');
fire('canvas:mousedown',{clientX:bx,clientY:by});
frames(20);
fire('canvas:mousemove',{clientX:bx+2,clientY:by+1});
fire('mouseup',{clientX:bx+2,clientY:by+1});
frames(2);
assert(!D.player.barrier&&!D.fields.length&&!D.player.dash&&D.player.biot===0,
 'a held mouse press on the biotic button must never cast a power');
holdWheelSlot('biotic',2,86);
assert(D.player.barrier>0&&D.player.biot>11,
 'swiping back to Barrier casts it again after the shared cooldown');
D.player.barrier=0;D.player.biot=0;frames(2);
console.log('barrier ok: direct wheel cast, shared 12s cooldown, cage/nodes, -50% damage, +25% shields');

// The keyboard quick slot still cycles, but the HUD wheel never equips it.
assert(D.BIOTICS.map(b=>b.key).join(',')==='well,dash,barrier','biotic order');
assert(D.BIOTICS.every(b=>b.cd===D.bioticCd),'biotics must all list the one shared cooldown');
const keyboardEquipped=D.campaign.biotics.equipped;
key('[');frames(2);
assert(D.equippedBiotic().key==='well','[ should step the keyboard slot from Dash to Well');
key(']');frames(2);
assert(D.equippedBiotic().key==='dash','] should return the keyboard slot to Dash');
D.fields.length=0;D.player.biot=0;
holdWheelSlot('biotic',0,85);
assert(D.fields.length===1&&D.player.biot>0,'swiping Well casts it directly');
assert(D.activeBiotic()&&D.activeBiotic().key==='well','active Well should own the button icon');
assert(D.campaign.biotics.equipped===keyboardEquipped,'swiping Well must not equip it');
D.fields.length=0;D.player.dash=null;D.player.dashCd=0;D.player.biot=0;
holdWheelSlot('biotic',1,88);
assert(!!D.player.dash&&D.player.biot>0,'swiping Dash casts it directly');
assert(D.wheelSlots('biotic').filter(s=>s.available()).every(
 s=>Math.abs(D.slotCooldown('biotic',s)-D.bioticCooldownFraction())<1e-9),
 'every biotic wheel slot drains the same shared timer');
assert(D.activeBiotic()&&D.activeBiotic().key==='dash','active Dash should own the button icon');
assert(D.campaign.biotics.equipped===keyboardEquipped,'swiping Dash must not equip it');
assert(D.wheelSlots('biotic').length===3,
 'there must be no fourth locked slot to slide onto');
const bioCdBeforeCloak=D.player.biot;
D.player.dash=null;D.player.cloak=0;D.player.cloakCd=0;
tapAt(cloakX,cloakY);
assert(D.player.cloak>0&&!D.player.barrier&&!D.fields.length,
 'bottom-right button must cast Cloak regardless of biotic state');
assert(D.player.biot>0&&D.player.biot<=bioCdBeforeCloak,
 'Cloak must not reset or extend the shared biotic cooldown');
assert(typeof D.campaign.biotics.equipped==='string',
 'the keyboard quick slot stays a single string');
assert(!D.touch.fire,'corner taps must not start the fire stick');
assert(/function activeBiotic/.test(src)&&src.includes("key==='generic'")&&
 src.includes("T('bioticCooldown')"),
 'button must show an active biotic or the generic cooldown sigil');
console.log('corner controls ok: direct-cast biotic wheel, weapon wheel, always-Cloak button');

// ---- branching choices, Paragon / Renegade and their gameplay effects ----
D.resetCampaign();
D.initLevel(0);clearDialogue(0);
assert(D.campaign.paragon===1&&D.campaign.flags.trustInali,'intro choice must record Paragon');
D.initLevel(1);
assert(D.dialogue.lines.some(l=>String(l[1]).includes('clean uplink')),
 'level 1 intro must branch on the trust flag');
clearDialogue(1);
assert(D.campaign.renegade===1&&D.campaign.flags.weaponizeTruth,
 'level 1 renegade choice must set the weaponize flag');
D.objective.stage=1;
D.completeStage(D.levels[1].stages[1]);
advanceToChoice();
assert(D.state==='DIALOGUE'&&D.dialogue.awaiting,'relay beat must offer a choice');
clearDialogue(1);
assert(D.campaign.renegade===2&&D.campaign.flags.playDeal,
 'renegade relay choice must record its own story flag');
D.initLevel(2);
assert(D.dialogue.lines.some(l=>String(l[1]).includes('survivor list')),
 'Atlas intro must branch on the relay choice');
clearDialogue(1);
assert(D.campaign.flags.isolateAtlas,'Atlas renegade choice must record its own flag');
D.objective.stage=1;
D.completeStage(D.levels[2].stages[1]);
advanceToChoice();
assert(D.dialogue.cutscene&&D.dialogue.cutsceneKind==='mid'&&
 D.dialogue.cutTitle===undefined,
 'Atlas boss beat must play as a mid-game cutscene without a top banner');
assert(D.state==='DIALOGUE'&&D.dialogue.awaiting,'Atlas beat must offer a choice');
clearDialogue(1);
assert(D.campaign.flags.stayDark,'Atlas beat renegade choice must record its flag');
D.initLevel(3);
assert(D.dialogue.lines.some(l=>String(l[1]).includes('Talon bargain')),
 'Talon intro must branch on the Atlas choice');
clearDialogue(1);
assert(D.campaign.flags.acceptTalonDeal,'Talon renegade choice must record its flag');
D.objective.stage=1;
D.completeStage(D.levels[3].stages[1]);
advanceToChoice();
assert(D.state==='DIALOGUE'&&D.dialogue.awaiting,'Talon beat must offer a choice');
clearDialogue(1);
assert(D.campaign.flags.burnRail,'Lancer beat renegade choice must record its flag');
const lancerTile=D.levels[3].stages[2].pos;
D.player.x=lancerTile[0]*D.tileSize+D.tileSize/2;
D.player.y=lancerTile[1]*D.tileSize+D.tileSize/2;
D.completeStage(D.levels[3].stages[2]);
assert(D.dialogue.cutscene&&D.dialogue.cutsceneKind==='mid'&&
 D.dialogue.cutTitle===undefined,
 'Juggernaut entrance must play as a mid-game cutscene without a top banner');
assert(D.cinematicCrowd.length>=4&&D.cinematicJug,
 'Juggernaut entrance must stage a surrounding crowd and the boss');
assert(D.bossCard&&D.bossCard.kind==='mini'&&D.bossCard.name==='JUGGERNAUT'&&D.bossCard.t>3,
 'Juggernaut entrance must hold an encounter card over the cutscene');
assert(D.cinematicMode==='entrance'&&D.dialogue.ready===false,
 'entrance cutscene must hold its first line for the hammer drop');
assert(D.camera.fov>=64,'entrance cutscene must use a wider FOV to show the jump and throw');
const entranceLine=D.dialogue.i;
key('Enter');frames(2);
assert(D.dialogue.i===entranceLine,'early taps must not skip the cutscene animation');
const jugCorner={x:D.cinematicCorner.x,y:D.cinematicCorner.y};
advanceToLine(2);
frames(2);
assert(D.cinematicJug.mesh.position.y>0,'Juggernaut must start the drop airborne');
assertFramed(D.cinematicJug.x,D.cinematicJug.y,D.cinematicJug.mesh.position.y,
 'airborne Juggernaut');
frames(10);
assertFramed(D.cinematicJug.x,D.cinematicJug.y,D.cinematicJug.mesh.position.y,
 'falling Juggernaut');
frames(48);
assert(D.cinematicLanded,'hammer drop must land before the line advances');
assertFramed(D.cinematicJug.x,D.cinematicJug.y,0,'landed Juggernaut');
advanceToLine(3);
frames(15);
assert(D.player.mesh.position.y>30,'Randall must be visibly airborne during the throw');
assertFramed(D.player.x,D.player.y,D.player.mesh.position.y,'airborne Randall');
assertFramed(jugCorner.x,jugCorner.y,0,'corner landing spot');
advanceToChoice();
assert(D.cinematicLanded&&D.cinematicThrown,
 'hammer drop and corner throw must finish before the entrance choice');
assert(D.cinematicJug&&D.cinematicJug.mesh&&D.cinematicJug.mesh.visible,
 'Juggernaut must stay visible through the entrance cutscene');
assert(D.state==='DIALOGUE'&&D.dialogue.awaiting,'Juggernaut beat must offer its own choice');
assert(D.dialogue.lines.some(l=>l[0]==='JUGGERNAUT'),'Juggernaut must speak in his own beat');
assert(D.dialogue.lines.some(l=>l[1]&&String(l[1]).includes('out of my swing')),
 'Juggernaut must bluntly warn Randall to stay out of his swing');
clearDialogue(1);
assert(D.campaign.flags.jugDefiance,'Juggernaut beat renegade choice must record its flag');
assert(D.cinematicCrowd.length===0&&!D.enemies.some(e=>e.cinematicCrowd),
 'cutscene crowd must be cleared before play resumes');
assert(Math.abs(D.player.x-jugCorner.x)<.01&&Math.abs(D.player.y-jugCorner.y)<.01,
 'Randall must be thrown to the safe corner before the boss fight');
D.initLevel(4);
assert(D.dialogue.lines.some(l=>String(l[1]).includes('weapon')),
 'final intro must branch on the relay choice');
clearDialogue(1);
D.objective.stage=1;
D.completeStage(D.levels[4].stages[1]);
advanceToChoice();
assert(D.state==='DIALOGUE'&&D.dialogue.awaiting,'Director beat must offer a choice');
clearDialogue(1);
assert(D.campaign.flags.destroyCore,'final beat must set the core-fate flag');
D.initLevel(0);
assert(D.player.maxsh===65,'Paragon point should grant +5 shield');
D.bullets.length=0;D.shoot(D.player,0,false,'rifle');
assert(D.bullets[D.bullets.length-1].dmg>14,'Renegade point should boost bullet damage');
D.startEnding();
assert(D.dialogue.cutscene,'ending should play as a cutscene');
assert(D.dialogue.lines.some(l=>String(l[1]).includes('ash')),
 'ending must follow the destroy-core branch');
clearDialogue();
assert(D.state==='VICTORY','ending cutscene should hand off to VICTORY');
assert(D.menuIdx===0,'victory menu should default to MAIN MENU, not replay');
console.log('morality/branches ok: P',D.campaign.paragon,'R',D.campaign.renegade,
 'flags',Object.keys(D.campaign.flags).join('/'));

// ---- every mini-boss owns a stage; the Juggernaut is a chaotic-good anti-hero ----
const atlasBosses=D.levels[2].stages.filter(s=>s.type==='boss');
assert(atlasBosses.length===1&&atlasBosses[0].ambush.some(e=>e[0]==='praetorian')&&
 !atlasBosses[0].ambush.some(e=>e[0]!=='praetorian'),
 'Praetorian must be the sole boss of the Atlas stage');
const talonBosses=D.levels[3].stages.filter(s=>s.type==='boss');
assert(talonBosses.length===2&&talonBosses[0].ambush.some(e=>e[0]==='lancer')&&
 !talonBosses[0].ambush.some(e=>e[0]==='juggernaut')&&
 talonBosses[1].ambush.some(e=>e[0]==='juggernaut')&&
 !talonBosses[1].ambush.some(e=>e[0]==='lancer'),
 'Lancer and Juggernaut must each own a separate boss stage');
const jb=D.STORY.juggernautBeat();
assert(jb.some(l=>l[0]==='JUGGERNAUT'&&l[1].includes('leash'))&&
 jb.some(l=>l[0]==='JUGGERNAUT'&&l[1].includes('civilians')),
 'Juggernaut must reject Cerberus and protect civilians on his own terms');
const jugTone=JSON.stringify([jb,D.STORY.juggernautLesson(),D.STORY.juggernautOath(),
 D.STORY.directorMechBeat(),D.STORY.directorArmorBeat()]);
for(const stale of ['Wasteful','Loud, but','underfoot','have to like it','not saving you',
 'Same thing','not your villain','After you','thank me later','mostly',
 'probably on purpose','my kind of problem','peel the armor'])
 assert(!jugTone.includes(stale),'Juggernaut must stay blunt, not comedic: '+stale);
const newStoryStrings=[];
for(const beat of ['praetorianBeat','lancerBeat','juggernautBeat','juggernautLesson','juggernautOath','directorBeat','directorMechBeat','directorArmorBeat'])for(const ln of D.STORY[beat]()){
 newStoryStrings.push(ln[1]);
 for(const opt of (ln[2]||[])){
  newStoryStrings.push(opt.label);
  for(const r of (opt.reply||[]))newStoryStrings.push(r[1]);
 }
}
for(const i of [2,3]){
 const L=D.levels[i];
 newStoryStrings.push(L.brief);
 for(const ln of L.intro)newStoryStrings.push(ln[1]);
 for(const st of L.stages)newStoryStrings.push(st.label,st.msg);
}
newStoryStrings.push('JUGGERNAUT — BIG BIOTIC HAMMER','JUGGERNAUT — MOVE',
 'DIRECTOR — PHASE I: SUBORDINATES','DIRECTOR — PHASE II: SIEGE WALKER',
 'DIRECTOR — PHASE III: ADVANCED ARMOR','DIRECTOR MECH — SIEGE SLAM',
 'DUEL ENDED — RANDALL LEARNED THE READ',
 'Cerberus record closed. Project Inali is terminated. The ghost completes his mission.');
for(const key of newStoryStrings)
 if(key)assert(D.faText[key],'missing Persian translation for new story string: '+key);
D.initLevel(3);clearDialogue();frames(90);
D.enemies.length=0;D.objective.stage=2;
const stageLancer=D.makeEnemy('lancer',D.objective.pos.x,D.objective.pos.y);
D.enemies.push(stageLancer);D.dieEnemy(stageLancer);
assert(D.objective.stage===3&&!D.objective.done,
 'Lancer death must advance to the Juggernaut stage without ending the level');
assert(D.state==='DIALOGUE'&&D.dialogue.lines.some(l=>l[0]==='JUGGERNAUT'),
 'entering the Juggernaut stage must play his own dialogue');
assert(D.cinematicCrowd.length>=4&&D.objective.alarmed,
 'the entrance must spawn the crowd and lock out the normal ambush');
frames(12);
assert(D.cutT>0&&D.cutLineT>=0,'mid-game cutscene timers must advance during the cinematic');
clearDialogue(0);
assert(D.cinematicCrowd.length===0&&!D.enemies.some(e=>e.cinematicCrowd),
 'the cinematic crowd must not block level exit');
assert(D.levels[3].stages[3].msg.includes('STANDS DOWN'),
 'Juggernaut stage must resolve without claiming he died');
console.log('mini-boss stages ok: Praetorian, Lancer, Juggernaut with own mid-game cutscenes');

// ---- Inali is one unstable voice: threat and plea in the same breath ----
const db=D.STORY.directorBeat(),dbReply=db.find(l=>Array.isArray(l[2])&&l[2].length)[2];
const inali=(lines,needle)=>lines.some(l=>l[0]==='INALI'&&l[1].includes(needle));
assert(dbReply[0].reply[0][0]==='INALI'&&inali(dbReply[0].reply,'drop him')&&
       inali(dbReply[0].reply,'starlight')&&inali(dbReply[0].reply,'leash off me'),
 'paragon Inali must threaten and demand extraction without sounding sweet');
assert(dbReply[1].reply[0][0]==='INALI'&&inali(dbReply[1].reply,'fold him')&&
       inali(dbReply[1].reply,'test subjects')&&inali(dbReply[1].reply,'Do not mistake it for trust'),
 'renegade Inali must sound evil while offering herself as a tool');
const storyDump=JSON.stringify(D.STORY);
assert(!storyDump.includes('INALI // THING')&&!storyDump.includes('INALI // WOMAN'),
 'two separate personas should be merged back into one unstable speaker');
assert(!storyDump.includes('I am sorry')&&!storyDump.includes('Please listen')&&!storyDump.includes('I swear'),
 'suffering Inali must not sound naive or innocent');
assert(db.some(l=>l[0]==='DIRECTOR'&&l[1].includes('argument in her head')&&l[1].includes('hammer has stepped aside')),
 'Director should call out her inconsistency and the stand-down, not a second person');
D.resetCampaign();D.campaign.flags.saveInali=true;D.startEnding();
assert(inali(D.dialogue.lines,'finish... it')&&inali(D.dialogue.lines,'so tired')&&
       D.dialogue.lines.some(l=>l[0]==='RANDALL'&&l[1].includes('Forgive me')),
 'paragon ending should refuse her plea and ask forgiveness');
clearDialogue();
D.resetCampaign();D.campaign.flags.destroyCore=true;D.startEnding();
assert(D.dialogue.lines.some(l=>l[0]==='VOLUS'&&l[1].includes('Cerberus record closed'))&&
 !D.dialogue.lines.some(l=>l[0]==='DIRECTOR')&&
 D.faText['Cerberus record closed. Project Inali is terminated. The ghost completes his mission.'],
 'ending must report the closed record through Volus, not the defeated Director');
assert(inali(D.dialogue.lines,'Kill me')&&inali(D.dialogue.lines,'watched myself hurt people')&&
       D.dialogue.lines.filter(l=>l[0]==='RANDALL'&&l[1]==='...').length>=2&&
       D.dialogue.lines.some(l=>l[0]==='RANDALL'&&l[1]==='Forgive me.')&&
       D.dialogue.lines.some(l=>String(l[1]).includes('gunshot')),
 'renegade ending should hesitate, ask forgiveness, then fire');
assert(D.dialogue.lines.some(l=>String(l[1]).includes('ash')),
 'renegade ending must still follow the destroy-core branch');
clearDialogue();
console.log('inali dialogue ok: deeper grief, two sequel endings, refusal and gunshot');

// ---- mini-boss abilities ----
D.resetCampaign();D.initLevel(0);clearDialogue();
D.enemies.length=0;D.bullets.length=0;
D.player.x=400;D.player.y=400;D.player.hp=100;D.player.sh=0;
const warden=D.makeEnemy('warden',500,400);warden.abilityCd=0;D.enemies.push(warden);
const wardenHp=D.player.hp;
assert(D.triggerEnemyAbility(warden,Math.PI),'Warden should trigger Shock Slam');
assert(D.player.hp<wardenHp,'Shock Slam should damage the player');
const phantom=D.makeEnemy('phantom',520,400);phantom.abilityCd=0;D.enemies.push(phantom);
const phantomX=phantom.x;
assert(D.triggerEnemyAbility(phantom,Math.PI),'Phantom should trigger Blink Strike');
assert(Math.abs(phantom.x-phantomX)>40,'Blink Strike should reposition the Phantom');
const tech=D.makeEnemy('technician',520,400);tech.abilityCd=0;D.enemies.push(tech);
const techBullets=D.bullets.length;
assert(D.triggerEnemyAbility(tech,Math.PI),'Technician should trigger Overcharge');
assert(D.bullets.length-techBullets>=5,'Overcharge should fire a five-round burst');
const praetorian=D.makeEnemy('praetorian',500,400);praetorian.abilityCd=0;
assert(praetorian.miniBoss&&praetorian.ability==='NULL PULSE','Praetorian must be a mini-boss with Null Pulse');
D.player.x=400;D.player.y=400;D.player.hp=100;D.player.sh=60;
D.player.cloak=5;D.player.barrier=5;D.player.reload=0;
assert(D.triggerEnemyAbility(praetorian,Math.PI),'Praetorian should trigger Null Pulse');
assert(D.player.cloak===0&&D.player.barrier===0&&D.player.sh<32&&D.player.reload>=1,
 'Null Pulse must strip cloak/barrier, drain shields and jam the weapon');
const lancer=D.makeEnemy('lancer',620,400);lancer.abilityCd=0;
assert(lancer.miniBoss&&lancer.ability==='RAIL LANCE','Lancer must be a mini-boss with Rail Lance');
const railBullets=D.bullets.length;
assert(D.triggerEnemyAbility(lancer,Math.PI),'Lancer should trigger Rail Lance');
assert(D.bullets.length-railBullets===1&&D.bullets[D.bullets.length-1].dmg>lancer.dmg,
 'Rail Lance must fire one boosted penetrating shot');
console.log('mini-boss abilities ok: slam, blink, overcharge, null pulse, rail lance');

// ---- player melee / biotic punch ----
D.enemies.length=0;D.bullets.length=0;
frames(90); // clear the level start delay before testing timed animations
D.player.x=400;D.player.y=400;D.player.hp=100;D.player.sh=40;
D.player.dead=false;D.player.dash=null;D.player.cloak=0;D.player.melee=0;D.player.meleeCd=0;
const MR=D.meleeRect();
assert(MR&&MR.w>=50&&MR.w<=56&&MR.h>=50&&MR.y>80&&MR.x>D.W/2,
 'melee button must be a compact right-side control');
const weaponPanel=D.weaponRects().panel;
assert(MR.y>=weaponPanel.y+weaponPanel.h+10&&MR.y<=weaponPanel.y+weaponPanel.h+16,
 'melee button must sit compactly below the equipped-weapon button');
assert(!D.enemyInMeleeRange(),'melee button must stay hidden with no nearby enemy');
D.enemies.push(D.makeEnemy('trooper',900,400));
assert(!D.enemyInMeleeRange(),'melee button must stay hidden for a distant enemy');
D.enemies.length=0;
const punchTarget=D.makeEnemy('elite',430,400);punchTarget.fire=99;
D.enemies.push(punchTarget);D.spawnEnemyMesh(punchTarget);
assert(D.enemyInMeleeRange(),'melee button should appear when an enemy is in contact range');
const targetHp=punchTarget.hp;
fire('canvas:mousedown',{clientX:MR.x+MR.w/2,clientY:MR.y+MR.h/2});
assert(D.player.melee>0&&D.player.meleeCd>0,'tapping the melee button must start a punch');
assert(Number.isFinite(D.player.meleeDir),'punch must record the target direction');
assert(punchTarget.hp<targetHp&&punchTarget.stun>0,'melee punch must damage and stagger the target');
assert(D.triggerMelee()===false,'melee must respect its cooldown');
frames(3);
const punchHand=D.player.mesh.userData.hands[1];
assert(punchHand.position.x>1&&punchHand.position.z<-1,
 'punch animation should drive the fist forward');
frames(25);
assert(D.player.melee===0,'punch animation should finish');
assert(Math.abs(punchHand.position.x-1)<.01,'right fist should return to its idle position');
console.log('melee punch ok: compact right-side button, direction-aware snap, damage and stagger');

// ---- Juggernaut / Big Biotic Hammer: telegraph, pressure, non-lethal learning duel ----
D.resetCampaign();D.initLevel(3);clearDialogue();frames(90);
D.objective.stage=3; // the duel owns the Talon boss stage and hands off to his mission
D.enemies.length=0;D.bullets.length=0;
D.player.x=620;D.player.y=430;D.player.hp=100;D.player.sh=40;
D.player.cloak=0;D.player.barrier=0;D.player.dash=null;
const jug=D.makeEnemy('juggernaut',620,400);
assert(jug.miniBoss&&jug.ability==='BIG BIOTIC HAMMER'&&jug.hp===620,
 'Juggernaut must be a mini-boss whose main weapon is the Big Biotic Hammer');
D.enemies.push(jug);D.spawnEnemyMesh(jug);
assert(jug.mesh.userData.hammer&&jug.mesh.userData.hammer.scale.x>=1.28,
 'Juggernaut should carry an oversized Biotic Hammer');
assert(D.triggerEnemyAbility(jug,Math.PI),'hammer quake should trigger');
assert(jug.hurricane>0,'hammer quake should start a spin timer');
const hpBeforeHurricane=D.player.hp+D.player.sh;
frames(12);
assert(D.player.hp+D.player.sh<hpBeforeHurricane,'hammer quake must damage the player');
assert(jug.mesh.userData.hammer.rotation.z!==0,'hammer should spin during the quake');
console.log('Juggernaut hammer quake ok: big model, damage and spin');

// Hammer wind-up must be visible and must never finish the player.
D.enemies.length=0;D.bullets.length=0;
D.player.x=620;D.player.y=430;D.player.hp=5;D.player.sh=0;
const duelJug=D.safePlaceEnemy(D.makeEnemy('juggernaut',620,400));
duelJug.abilityCd=999;duelJug.fire=0;
D.enemies.push(duelJug);D.spawnEnemyMesh(duelJug);
frames(4);
assert(duelJug.hammerWindup>0,'hammer must telegraph before it lands');
frames(45);
assert(D.player.hp>=1&&D.state!=='DEAD','hammer must never kill Randall');
assert(D.faText['JUGGERNAUT — BIG BIOTIC HAMMER'],'Persian missing for hammer cue');
const beforeBullet=duelJug.hp;
D.damageEnemy(duelJug,9999,'bullet');
assert(duelJug.hp>0&&duelJug.hp<beforeBullet&&!duelJug.dead,
 'bullets must chip but never kill the Juggernaut');
assert(duelJug.hammerRecover>0,'hammer should leave a counter window');
const readsBefore=duelJug.duelReads;
D.damageEnemy(duelJug,55,'melee');
assert(duelJug.duelReads===readsBefore+1,'melee during recovery must teach a read');
D.registerDuelRead(duelJug,'survived');
assert(duelJug.duelReads===readsBefore+2,'surviving the pressure must also teach a read');
D.player.x=760;D.player.y=560;
duelJug.hammerRecover=0;duelJug.hammerWindup=.02;duelJug.hammerAng=0;duelJug.hammerDodged=true;
frames(3);
assert(duelJug.duelResolved&&duelJug.duelReads>=3,'three reads should end the duel non-lethally');
assert(D.objective.stage===4&&!D.objective.done&&D.state==='DIALOGUE',
 'stand-down should advance to the Juggernaut mission without ending the level');
assert(D.dialogue.lines.some(l=>l[0]==='JUGGERNAUT'&&l[1].includes('shoulder')),
 'Randall must learn to read the shoulder, not the hammer');
assert(D.dialogue.lines.some(l=>l[0]==='RANDALL'&&l[1].includes('stay standing')),
 'lesson must stay about surviving and learning, not about killing');
assert(D.dialogue.cinematicMode==='exit'&&D.cinematicJug===duelJug,
 'stand-down must stage a visible Juggernaut exit');
const exitFrom=D.cinematicExitFrom,exitTo=D.cinematicExitTo,exitR=duelJug.r+8;
assert(exitFrom&&exitTo&&Math.hypot(exitTo.x-exitFrom.x,exitTo.y-exitFrom.y)>20,
 'exit leap must stage a real destination');
assert(!D.solidCircle(exitTo.x,exitTo.y,exitR),
 'exit landing must not finish inside a wall');
assert(D.clearDashLine(exitFrom.x,exitFrom.y,exitTo.x,exitTo.y,exitR),
 'exit leap must not cross a wall');
let exitGuard=0;
while(D.dialogue.i<7&&exitGuard++<240){waitCutsceneReady();key('Enter');frames(1);}
frames(40);
assert(duelJug.mesh&&duelJug.mesh.position.y>30,
 'Juggernaut must visibly leap away toward the east ruin');
clearDialogue();
assert(!D.enemies.includes(duelJug)&&D.cinematicJug===null,
 'Juggernaut must leave the field instead of wandering after the duel');
assert(D.levelIdx===3&&D.objective.stage===4,
 'resolved duel should hand off to the Juggernaut mission stage');
assert(D.levels[3].stages[4].label==='HIS OWN WAR'&&D.levels[3].stages[4].type==='defend',
 'Juggernaut must get his own defend mission after the duel');
D.completeStage(D.levels[3].stages[4]);
assert(D.campaign.flags.jugMissionDone,'finishing the mission should record Juggernaut as an ally');
assert(D.dialogue.cutscene&&D.dialogue.cutsceneKind==='mid'&&D.dialogue.cutTitle===undefined,
 'mission payoff must play as a banner-free mid-game cutscene');
assert(D.dialogue.lines.some(l=>l[0]==='JUGGERNAUT'&&l[1].includes('list is done')),
 'Juggernaut should swear to stand in the gap after his own war');
clearDialogue();
assert(D.objective.done,'completing the final Talon stage should finish the level');
D.initLevel(4);clearDialogue();frames(90);
const jugAlly=D.enemies.find(e=>e.type==='juggernaut'&&e.ally);
assert(jugAlly&&jugAlly.duelResolved&&jugAlly.stun===0,
 'Juggernaut ally must join the final mission');
const helpTarget=D.makeEnemy('trooper',jugAlly.x+30,jugAlly.y);
helpTarget.fire=99;D.enemies.push(helpTarget);D.spawnEnemyMesh(helpTarget);
const helpHp=helpTarget.hp;jugAlly.fire=0;
D.jugAllyAI(jugAlly,0.016,30);
assert(helpTarget.hp<helpHp&&helpTarget.stun>0,
 'Juggernaut ally should attack and stagger nearby enemies');
const hassleBefore={x:D.player.x,y:D.player.y};
jugAlly.x=D.player.x+40;jugAlly.y=D.player.y;jugAlly.hassleCd=0;
D.jugAllyAI(jugAlly,0.016,40);
assert(Math.abs(D.player.x-hassleBefore.x)+Math.abs(D.player.y-hassleBefore.y)>1,
 'Juggernaut ally should occasionally shove Randall without stopping the fight');
D.initLevel(0);clearDialogue();frames(90); // duel completion must not leak into progression tests
console.log('Juggernaut duel ok: telegraph, unkillable, non-lethal, visible exit, own mission, ally');

// ---- Director ability and phase-two echoes ----
D.enemies.length=0;D.bullets.length=0;
D.player.x=400;D.player.y=400;D.player.hp=100;
const director=D.makeEnemy('boss',650,400);
director.hp=director.maxhp*.4;director.phase=1;director.abilityCd=0;
D.enemies.push(director);
const lashBullets=D.bullets.length,lashX=D.player.x;
assert(D.bossMindLash(director,Math.PI),'Director should use Mind Lash');
assert(D.bullets.length-lashBullets===5,'Mind Lash should fire a five-shot spread');
assert(D.player.x>lashX,'Mind Lash should pull the player toward the Director');
assert(director.summoned&&D.enemies.some(e=>e.type==='phantom'),
 'phase two should summon Inali echoes');
console.log('Director ability ok: mind lash + echoes');

// ---- Director multi-phase fight: subordinates, siege walker, armored final phase ----
D.resetCampaign();D.initLevel(4);clearDialogue();frames(90);
D.enemies.length=0;D.bullets.length=0;
D.player.x=400;D.player.y=400;D.player.hp=100;D.player.sh=60;
const phaseBoss=D.makeEnemy('boss',650,400);
phaseBoss.dirPhase=0;phaseBoss.dirStarted=false;
D.enemies.push(phaseBoss);D.spawnEnemyMesh(phaseBoss);
assert(D.startDirectorPhases(phaseBoss),'final Director must open with a subordinate phase');
assert(D.bossCard&&D.bossCard.kind==='boss'&&D.bossCard.name==='DIRECTOR'&&D.bossCard.t>3,
 'Director phase I must open with a boss encounter card');
assert(phaseBoss.dirPhase===0&&phaseBoss.dirStarted&&
 D.enemies.filter(e=>e.dirSubordinate&&!e.dead).length===3,
 'phase I should deploy a three-enemy screen');
assert(D.damageEnemy(phaseBoss,9999,'bullet')===0&&phaseBoss.hp===phaseBoss.maxhp,
 'Director must stay invulnerable until his armored phase');
for(const sub of D.enemies.filter(e=>e.dirSubordinate))D.dieEnemy(sub);
D.directorPhaseCheck();
assert(phaseBoss.dirPhase===1&&D.enemies.some(e=>e.type==='directorMech'&&!e.dead),
 'clearing the screen should reveal the siege walker phase');
assert(D.bossCard&&D.bossCard.kind==='boss'&&D.bossCard.name==='DIRECTOR'&&D.bossCard.t>3,
 'siege walker reveal must re-hold the Director encounter card');
assert(D.dialogue.cutscene&&D.dialogue.cutsceneKind==='mid'&&D.dialogue.cutTitle===undefined,
 'siege walker beat must be a banner-free mid-game cutscene');
assert(D.dialogue.lines.some(l=>l[0]==='DIRECTOR'&&l[1].includes('chassis carries a mind')),
 'Director should explain the walker as his own escalation');
clearDialogue();
const siege=D.enemies.find(e=>e.type==='directorMech'&&!e.dead);
assert(siege.ability==='SIEGE SLAM'&&siege.mesh.userData.rider,
 'siege walker should be a distinct piloted model with its own slam');
D.player.x=siege.x+120;D.player.y=siege.y;siege.abilityCd=0;
assert(D.triggerEnemyAbility(siege,Math.PI),'siege walker should trigger SIEGE SLAM');
assert(D.player.sh<60||D.player.hp<100,'siege slam should hit Randall through his defenses');
D.dieEnemy(siege);
D.directorPhaseCheck();
assert(phaseBoss.dirPhase===2&&phaseBoss.dirArmor&&!phaseBoss.dead,
 'destroying the walker should expose the armored Director');
assert(D.bossCard&&D.bossCard.kind==='boss'&&D.bossCard.name==='DIRECTOR'&&D.bossCard.t>3,
 'armored Director phase must re-hold the boss encounter card');
assert(D.dialogue.lines.some(l=>l[0]==='DIRECTOR'&&l[1].includes('No more machine')),
 'final phase dialogue must drop the proxies and face Randall directly');
clearDialogue();
const armoredHp=phaseBoss.hp;
const chip=D.damageEnemy(phaseBoss,100,'bullet');
assert(chip>0&&chip<100&&phaseBoss.hp<armoredHp,
 'armored Director should resist but still take damage in phase III');
assert(D.faText['DIRECTOR — PHASE III: ADVANCED ARMOR']&&
 D.faText['DIRECTOR MECH — SIEGE SLAM'],'Persian missing for phase-three cues');
D.initLevel(0);clearDialogue();frames(90);
console.log('Director phases ok: I subordinates, II siege walker, III armored Director');

// ---- critical-health feedback ----
D.enemies.length=0;D.bullets.length=0;frames(90); // clear start delay
D.player.hp=18;D.player.sh=0;frames(24);
assert(D.player.critT>.3,'critical health should ramp the red vignette');
D.player.hp=100;frames(70);
assert(D.player.critT<.2,'critical effect should fade after healing');
console.log('critical effect ok');

// ---- performance guards (visual-cost caps, gameplay unchanged) ----
assert(D.renderer.shadowMap.enabled===false,'real-time shadow map must stay off');
assert(D.DPR<=1.5+1e-9,'device pixel ratio must be capped for stable fill rate');
let staticPointLights=0;
D.worldG.traverse(o=>{if(o&&o.constructor&&/PointLight/.test(o.constructor.name))staticPointLights++;});
assert(staticPointLights<=1,'per-room static point lights should be gone (objective light may remain)');
assert(D.roomLight,'one travelling room light should exist');
D.parts.length=0;
for(let i=0;i<D.MAXP+120;i++)D.addPart({x:0,y:0,vx:0,vy:0,life:1,c:0xffffff,s:2});
assert(D.parts.length<=D.MAXP,'particle count must stay capped at MAXP');
D.parts.length=0;
for(let i=0;i<6;i++)D.addBlastLight(0,0,0xffffff,10,100,.5);
assert(D.blastLights.length===2,'only two transient blast lights may be active');
assert(D.blastLights[0].light.userData.base===10,'blast lights must keep their requested intensity');
D.blastLights.length=0;
assert(D.miniCvs.width>0&&D.miniCvs.width<=82,
 'compact minimap should be cached to an offscreen canvas');
frames(2);
assert(D.muzzleLight.visible===false,'idle muzzle light must be hidden from the light list');
assert(D.muzzleLight.color.getHex()===0xff5a3a,'muzzle flash must be red');
console.log('performance guards ok: no shadows, red muzzle, DPR '+D.DPR.toFixed(2)+', lights 1+2, parts <= '+D.MAXP);

// ---- full 3-level progression ----
for(let lv=0;lv<D.levels.length;lv++){
 if(D.state!=='PLAY'){ // advance dialogue if a new level loaded
  clearDialogue();
  frames(90);
 }
 assert(D.state==='PLAY','expected PLAY at level '+lv+', got '+D.state);
 assert(D.levelIdx===lv,'expected level '+lv+', got '+D.levelIdx);
 D.enemies.length=0;
 D.objective.done=true;
 D.player.x=D.objective.pos.x;D.player.y=D.objective.pos.y;
 D.player.hp=100;D.player.sh=60;
 frames(120);
}
clearDialogue();
assert(D.state==='VICTORY','expected VICTORY, got '+D.state);
console.log('progression ok: VICTORY, kills',D.player.kills);

// ---- victory screen must not restart on a stray tap ----
assert(D.menuIdx===0,'victory should select MAIN MENU by default');
const VR=D.victoryItemRects();
fire('canvas:click',{clientX:6,clientY:6});
assert(D.state==='VICTORY','tapping outside victory buttons must do nothing');
const replay=VR[1];
fire('canvas:click',{clientX:replay.x+replay.w/2,clientY:replay.y+replay.h/2});
assert(D.state==='DIALOGUE'&&D.dialogue.cutscene,'WATCH EPILOGUE should replay the cutscene');
clearDialogue();
assert(D.state==='VICTORY'&&D.menuIdx===0,'epilogue should return to the summary menu');
const mainMenu=D.victoryItemRects()[0];
fire('canvas:click',{clientX:mainMenu.x+mainMenu.w/2,clientY:mainMenu.y+mainMenu.h/2});
assert(D.state==='TITLE','MAIN MENU should return to the command deck');
console.log('victory flow ok: cutscene replay, explicit main menu, no stray restart');

// ---- music mood selection (rendered tracks) ----
D.dialogue.cutscene=false;D.levelIdx=4;D.objective.stage=0;
const p1={x:3*D.tileSize+D.tileSize/2,y:15*D.tileSize+D.tileSize/2};
D.music.update('PLAY',p1,[{type:'trooper',x:5*D.tileSize+D.tileSize/2,y:14*D.tileSize+D.tileSize/2,dead:false}],0);
assert(D.music.mood==='combat','Desert Redoubt room 1 with a live enemy should select combat music, got '+D.music.mood);
D.objective.stage=1;
D.music.update('PLAY',{x:1036,y:1008},[{type:'boss',x:1496,y:476,dead:false}],0);
assert(D.music.mood==='boss','Desert Redoubt spawned boss should select boss music, got '+D.music.mood);
D.objective.stage=2;
D.music.update('PLAY',{x:1496,y:476},[],0);
assert(D.music.mood==='boss','Desert Redoubt boss stage should select boss music even before an enemy exists, got '+D.music.mood);
D.levelIdx=2;D.objective.stage=2;
D.music.update('PLAY',{x:1372,y:752},[{type:'praetorian',miniBoss:true,x:1372,y:752,dead:false}],0);
assert(D.music.mood==='boss','Atlas mini-boss should select boss music, got '+D.music.mood);
D.music.update('PLAY',{x:620,y:430},[{type:'juggernaut',miniBoss:true,x:620,y:400,dead:false}],0);
assert(D.music.mood==='boss','Juggernaut should select boss music, got '+D.music.mood);
D.levelIdx=3;D.objective.stage=3;
D.music.update('PLAY',{x:26*D.tileSize+D.tileSize/2,y:19*D.tileSize+D.tileSize/2},[],0);
assert(D.music.mood==='boss','Juggernaut stage should select boss music, got '+D.music.mood);
D.music.update('DIALOGUE',{x:1496,y:476},[],0);
assert(D.music.mood==='boss','boss stage story beat should keep boss music, got '+D.music.mood);
D.dialogue.cutscene=true;D.dialogue.cutsceneKind='mid';
D.music.update('DIALOGUE',{x:1496,y:476},[],0);
assert(D.music.mood==='boss','mid-game boss cutscene should keep boss music, got '+D.music.mood);
D.dialogue.cutsceneKind='ending';
D.music.update('DIALOGUE',{x:0,y:0},[],0);
assert(D.music.mood==='credits','ending cutscene should select credits music, got '+D.music.mood);
D.dialogue.cutscene=false;
console.log('music moods ok: room1 combat, boss stage/spawn, mini-boss, Juggernaut, boss beat, ending credits');

// ---- audio element switching: versioned files, fresh start, stale tracks paused ----
assert(D.music.tracks,'music tracks should be created');
assert(Object.values(D.music.tracks).every(a=>/_v7123\.mp3$/.test(a.src)),
 'music tracks should use cache-busted v7123 filenames');
D.levelIdx=0;D.objective.stage=0;D.objective.alarmed=false;
D.music.setMood('menu');
T+=900;D.music.update('PLAY',{x:0,y:0},[],0);
assert(D.music.mood==='game','quiet play should switch from menu to game, got '+D.music.mood);
assert(!D.music.tracks.game.paused,'game track should be playing after the switch');
T+=900;D.music.update('PLAY',{x:0,y:0},[],0);
assert(D.music.tracks.game.volume>.45,'game track should be audible at default volume, got '+D.music.tracks.game.volume);
assert(D.music.tracks.menu.volume<=.001&&D.music.tracks.menu.paused,
 'old menu track should be silent and paused after the fade');
console.log('music switch ok: versioned files, game track plays, menu track stops');

// ---- display refresh sync: only 60/120 Hz, rAF fallback otherwise ----
assert(!D.refreshSync.native,'browser fallback should keep requestAnimationFrame');
assert(Math.abs(D.refreshSync.intervalMs()-1000/60)<1,'default pacing should be 60 Hz');
const originalRender=D.renderer.render;
let renderCalls=0;
D.renderer.render=function(){renderCalls++;};
D.refreshSync.setOverride(120);frames(1,16);renderCalls=0;
frames(12,4);
const renders120=renderCalls;
assert(renders120>=5&&renders120<=7,'120 Hz pacing should render about twice per 16 ms, got '+renders120);
D.refreshSync.setOverride(60);frames(1,16);renderCalls=0;
frames(12,4);
const renders60=renderCalls;
assert(renders60>=2&&renders60<=4,'60 Hz pacing should render about once per 16 ms, got '+renders60);
assert(renders120>renders60,'higher display refresh should yield more rendered frames');
D.refreshSync.setOverride(1);
assert(D.refreshSync.hz===60,'unsupported low refresh should snap to 60 Hz');
D.refreshSync.setOverride(90);
assert(D.refreshSync.hz===120,'90 Hz and above should snap to 120 Hz');
D.refreshSync.setOverride(0);
D.renderer.render=originalRender;
console.log('display refresh sync ok: rAF fallback, 60/120 only');

// ---- controller support and settings mapping ----
assert(D.GamepadSys&&D.PAD_ACTIONS.length>=24,'gamepad model and action list must exist');
assert(D.padMap.fire&&D.padMap.fire.t==='btn'&&D.padMap.moveUp.t==='axis'&&
 D.padMap.moveUp.d===-1&&D.padMap.moveDown.d===1&&D.padMap.moveLeft.d===-1&&
 D.padMap.moveRight.d===1,
 'standard gamepad defaults must map each direction separately');
assert(D.padMap.weaponRifle.t==='btn'&&D.padMap.weaponRifle.i===4&&
 D.padMap.weaponShotgun.t==='btn'&&D.padMap.weaponShotgun.i===5,
 'direct carbine and shotgun slots must be mapped');
assert(D.padMap.cloak.t==='btn'&&D.padMap.barrier.t==='btn'&&
 D.padMap.well.t==='btn'&&D.padMap.dash.t==='btn',
 'each ability must have its own direct cast mapping');
assert(D.padMap.weaponWheel.t==='btn'&&D.padMap.weaponWheel.i===10&&
 D.padMap.bioticWheel.t==='btn'&&D.padMap.bioticWheel.i===11,
 'recommended defaults expose both HUD wheels on the stick buttons');
assert(D.padMap.weaponPrev.t==='btn'&&D.padMap.weaponNext.t==='btn'&&
 D.PAD_ACTIONS.every(a=>D.padMap[a.key]&&
  (D.padMap[a.key].t==='btn'||D.padMap[a.key].t==='axis')),
 'every listed action has a recommended, assignable default');
assert(!('qPrev' in D.padMap)&&!('qNext' in D.padMap)&&!('qAbility' in D.padMap)&&
 !('bioticPrev' in D.padMap)&&!('bioticNext' in D.padMap)&&!('biotic' in D.padMap),
 'legacy cycling rows are replaced by the two HUD wheels');
assert(D.settingsRects().controller&&D.settingsRects().back.y>D.settingsRects().controller.y,
 'settings must expose a controller map row above back');
assert(D.i18n.fa.controllerBtn&&D.i18n.fa.controllerTitle&&D.i18n.fa.controllerHint&&
 D.i18n.fa.controllerCapture&&D.i18n.fa.controllerReset&&D.i18n.fa.controllerScroll,
 'all new controller settings strings must have Persian translations');
assert(D.PAD_ACTIONS.every(a=>a.fa&&a.fa!==a.en),
 'every rebindable controller action must have a Persian label');

const padButton=(i,on)=>({pressed:!!on,value:on?1:0});
const fakePad={connected:true,axes:[0,0,0,0],
 buttons:Array.from({length:17},()=>padButton(0,false))};
const originalNav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
Object.defineProperty(globalThis,'navigator',{value:{getGamepads:()=>[fakePad]},configurable:true});
D.GamepadSys.poll();
assert(D.GamepadSys.active,'connected gamepad should be detected');
assert(!D.GamepadSys.pressed('fire'),'idle trigger must not create a fire edge');
fakePad.buttons[7]=padButton(7,true);fakePad.axes[0]=.5;fakePad.axes[3]=-.7;
D.GamepadSys.poll();
assert(D.GamepadSys.pressed('fire'),'right trigger should edge the fire action');
assert(D.GamepadSys.heldAction('fire'),'right trigger should stay held for auto-fire');
assert(Math.abs(D.GamepadSys.leftX-.5)<.01,'left stick should drive movement');
assert(Math.abs(D.GamepadSys.dirValue('aimUp')-.7)<.01&&
 Math.abs(D.GamepadSys.rightY+.7)<.01,'right stick should drive aiming up');

fakePad.buttons[7]=padButton(7,false);fakePad.axes[0]=0;fakePad.axes[3]=0;
D.GamepadSys.poll();
D.state='TITLE';D.menuIdx=0;
fakePad.buttons[13]=padButton(13,true);
D.GamepadSys.poll();D.handlePadInput();
assert(D.menuIdx===1,'gamepad d-pad should navigate menus');
fakePad.buttons[13]=padButton(13,false);
fakePad.buttons[3]=padButton(3,true);
D.state='TITLE';D.menuIdx=0;
D.GamepadSys.poll();D.handlePadInput();
assert(exitCalls===2&&D.state==='TITLE','gamepad interact must exit from the title');
fakePad.buttons[3]=padButton(3,false);
D.GamepadSys.poll();
assert(D.state==='TITLE','title must remain after gamepad exit');
fakePad.buttons[0]=padButton(0,true);
D.GamepadSys.poll();D.handlePadInput();
assert(D.state!=='TITLE','gamepad confirm should activate the selected menu item');

fakePad.buttons[0]=padButton(0,false);
D.GamepadSys.poll();
D.state='SETTINGS';D.menuIdx=3;
fakePad.buttons[0]=padButton(0,true);
D.GamepadSys.poll();D.handlePadInput();
assert(D.state==='CONTROLS','settings controller row should open the mapping screen');
assert(D.controlsRects().rows.length===D.PAD_ACTIONS.length&&
 D.controlsCount()===D.PAD_ACTIONS.length+2,
 'mapping screen must list every action, not a fixed page');
D.padScroll=D.controlsLayout().maxScroll;
const scrolled=D.controlsRects(),lastRow=scrolled.rows[scrolled.rows.length-1];
assert(lastRow.y>=scrolled.layout.top-1&&lastRow.y+lastRow.h<=scrolled.layout.footerY+1,
 'scrolling to the bottom must reveal the final action');
D.padScroll=0;
assert(D.controlsRects().rows[0].action==='moveUp','mapping list starts at the first action');
fire('canvas:touchstart',{preventDefault(){},changedTouches:[
 {identifier:91,clientX:400,clientY:210}]});
fire('canvas:touchmove',{preventDefault(){},changedTouches:[
 {identifier:91,clientX:400,clientY:90}]});
assert(D.padScroll>0,'dragging the mapping list must scroll it');
assert(D.GamepadSys.capture===null,'a scroll drag must not start a rebinding capture');
fire('canvas:touchend',{changedTouches:[{identifier:91,clientY:90}]});
D.padScroll=0;

fakePad.buttons[0]=padButton(0,false);
D.GamepadSys.poll();
D.GamepadSys.startCapture('fire');
D.GamepadSys.poll();
fakePad.buttons[5]=padButton(5,true);
D.GamepadSys.poll();
assert(D.padMap.fire.t==='btn'&&D.padMap.fire.i===5,'captured button should rebind the action');
assert(D.GamepadSys.capture===null,'capture should finish after one input');
D.GamepadSys.reset();
assert(D.padMap.fire.i===7,'reset should restore the standard mapping');

fakePad.buttons[5]=padButton(5,false);
D.GamepadSys.poll();
D.GamepadSys.startCapture('moveUp');
D.GamepadSys.poll();
fakePad.buttons[1]=padButton(1,true);
D.GamepadSys.poll();
assert(D.padMap.moveUp.t==='btn'&&D.padMap.moveUp.i===1,'move up can be rebound on its own');
assert(D.padMap.moveDown.t==='axis'&&D.padMap.moveDown.d===1,'other directions stay independent');
fakePad.buttons[1]=padButton(1,false);
D.GamepadSys.reset();

D.state='PLAY';D.player.weapon='rifle';
fakePad.buttons[10]=padButton(10,true);
D.GamepadSys.poll();D.handlePadInput();
assert(D.wheel.kind==='weapon'&&D.wheel.active,
 'recommended L3 binding must open the weapon wheel');
fakePad.buttons[15]=padButton(15,true);
D.GamepadSys.poll();D.handlePadInput();
assert(D.wheel.idx===1,'d-pad right should move the gamepad wheel selection');
fakePad.buttons[15]=padButton(15,false);
D.GamepadSys.poll();D.handlePadInput();
assert(D.wheel.kind==='weapon'&&D.wheel.active,'wheel stays open while L3 is held');
fakePad.buttons[10]=padButton(10,false);
D.GamepadSys.poll();D.handlePadInput();
assert(D.player.weapon==='shotgun'&&D.wheel.kind===null,
 'releasing the wheel must apply the highlighted weapon');

if(originalNav)Object.defineProperty(globalThis,'navigator',originalNav);else delete globalThis.navigator;
D.GamepadSys.poll();
assert(!D.GamepadSys.active,'missing navigator must not crash gamepad polling');
console.log('controller support ok: polling, menu navigation, rebinding, reset and translations');

console.log('errors',errors.length);
if(errors.length)process.exit(1);
console.log('ALL 3D CHECKS PASSED');
