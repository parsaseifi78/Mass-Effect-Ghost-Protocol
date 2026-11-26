// Generates original cinematic music tracks for Ghost Protocol.
// No external, sampled or copyrighted audio is used: every note is synthesized here.
// Output: stereo MP3 files for the Android WebView and PWA.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SR = 22050;
const TAU = Math.PI * 2;
const TRACK_VERSION = 'v7123';
let seed = 20261124;
function rnd(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const hz = n => 440 * Math.pow(2, (n - 69) / 12);

function newBuf(sec){
  const len = Math.floor(sec * SR);
  return { len, l: new Float32Array(len), r: new Float32Array(len) };
}

function wave(type, ph){
  switch(type){
    case 'bass':
      return Math.sin(ph) * .78 + Math.sin(2*ph) * .17 + Math.sin(3*ph) * .05;
    case 'string':
      return Math.sin(ph) * .58 + Math.sin(2*ph) * .24 +
             Math.sin(3*ph) * .12 + Math.sin(4*ph) * .06;
    case 'brass':
      return Math.sin(ph) * .52 + Math.sin(2*ph) * .26 + Math.sin(3*ph) * .13 +
             Math.sin(4*ph) * .06 + Math.sin(5*ph) * .03;
    case 'bell':
      return Math.sin(ph) * .7 + Math.sin(2.01*ph) * .22 + Math.sin(3.98*ph) * .08;
    case 'pluck':
      return Math.sin(ph) * .64 + Math.sin(2*ph) * .22 + Math.sin(3*ph) * .09 +
             Math.sin(4*ph) * .05;
    case 'pad':
    default:
      return Math.sin(ph) * .66 + Math.sin(2*ph) * .2 +
             Math.sin(3*ph) * .1 + Math.sin(5*ph) * .04;
  }
}

function tone(b, start, dur, freq, amp, opt={}){
  const i0 = Math.max(0, Math.floor(start * SR));
  const n = Math.min(Math.floor(dur * SR), b.len - i0);
  if(n <= 0 || !freq) return;
  const type = opt.type || 'pad';
  const attack = Math.max(.002, opt.attack == null ? .05 : opt.attack);
  const release = Math.max(.002, opt.release == null ? .25 : opt.release);
  const pan = Math.max(-1, Math.min(1, opt.pan || 0));
  const gl = 1 - Math.max(0, pan) * .8;
  const gr = 1 - Math.max(0, -pan) * .8;
  const cutoff = opt.cutoff || 0;
  const a = cutoff ? 1 - Math.exp(-TAU * cutoff / SR) : 1;
  const width = opt.width == null ? .0016 : opt.width;
  const vib = opt.vibrato || 0;
  const vibRate = opt.vibRate || 5.2;
  const slide = opt.slide || 0;
  let phL = opt.phase || 0, phR = (opt.phase || 0) + .05;
  let lpL = 0, lpR = 0;
  for(let i=0; i<n; i++){
    const t = i / SR;
    let env = 1;
    if(t < attack) env = Math.pow(t / attack, 1.4);
    if(t > dur - release) env *= Math.pow((dur - t) / release, 1.5);
    if(env <= 0) continue;
    const v = vib ? Math.sin(TAU * vibRate * t) * vib : 0;
    const f = Math.max(20, freq + (opt.detune || 0) + v + slide * (t / dur));
    phL += TAU * f / SR;
    phR += TAU * f * (1 + width) / SR;
    if(phL > TAU) phL -= TAU;
    if(phR > TAU) phR -= TAU;
    let sl = wave(type, phL), sr = wave(type, phR);
    if(cutoff){ lpL += (sl - lpL) * a; lpR += (sr - lpR) * a; sl = lpL; sr = lpR; }
    b.l[i0+i] += sl * amp * env * gl;
    b.r[i0+i] += sr * amp * env * gr;
  }
}

function noise(b, start, dur, amp, cutoff=1400, pan=0){
  const i0 = Math.max(0, Math.floor(start * SR));
  const n = Math.min(Math.floor(dur * SR), b.len - i0);
  if(n <= 0) return;
  const a = 1 - Math.exp(-TAU * cutoff / SR);
  const gl = 1 - Math.max(0, pan) * .7, gr = 1 - Math.max(0, -pan) * .7;
  let lpL = 0, lpR = 0;
  for(let i=0; i<n; i++){
    const white = rnd() * 2 - 1;
    lpL += (white - lpL) * a;
    lpR += (white - lpR) * a;
    const env = Math.pow(1 - i / n, 2.1);
    b.l[i0+i] += lpL * amp * env * gl;
    b.r[i0+i] += lpR * amp * env * gr;
  }
}

function kick(b, start, amp=.15){
  tone(b, start, .34, 58, amp, {type:'bass',attack:.002,release:.28,slide:-20,cutoff:280,pan:-.1});
  noise(b, start, .07, amp*.22, 900, -.1);
}

function space(b, taps){
  const dl = b.l.slice(), dr = b.r.slice();
  for(const [delay, fb, cross] of taps){
    const d = Math.floor(delay * SR);
    for(let i=d; i<b.len; i++){
      b.l[i] += dl[i-d] * fb + dr[i-d] * cross;
      b.r[i] += dr[i-d] * fb + dl[i-d] * cross;
    }
  }
}

function normalize(b, peak=.88, drive=1.05){
  let mx = 0;
  for(let i=0;i<b.len;i++){
    const v = Math.max(Math.abs(b.l[i]), Math.abs(b.r[i]));
    if(v > mx) mx = v;
  }
  const g = mx > 0 ? peak / mx : 1;
  for(let i=0;i<b.len;i++){
    b.l[i] = Math.tanh(b.l[i] * g * drive) * peak;
    b.r[i] = Math.tanh(b.r[i] * g * drive) * peak;
  }
}

function writeWav(file, b){
  const dataLen = b.len * 4;
  const out = Buffer.alloc(44 + dataLen);
  out.write('RIFF',0); out.writeUInt32LE(36+dataLen,4); out.write('WAVE',8);
  out.write('fmt ',12); out.writeUInt32LE(16,16); out.writeUInt16LE(1,20);
  out.writeUInt16LE(2,22); out.writeUInt32LE(SR,24); out.writeUInt32LE(SR*4,28);
  out.writeUInt16LE(4,32); out.writeUInt16LE(16,34);
  out.write('data',36); out.writeUInt32LE(dataLen,40);
  for(let i=0;i<b.len;i++){
    for(let c=0;c<2;c++){
      const v = Math.max(-1, Math.min(1, c ? b.r[i] : b.l[i]));
      out.writeInt16LE(v < 0 ? v * 32768 : v * 32767, 44 + i*4 + c*2);
    }
  }
  fs.writeFileSync(file, out);
}

function encode(wav, mp3){
  const r = spawnSync('ffmpeg', ['-y','-loglevel','error','-i',wav,
    '-af','loudnorm=I=-15:TP=-1.5:LRA=11',
    '-codec:a','libmp3lame','-b:a','80k','-ac','2','-ar',String(SR),mp3]);
  if(r.status !== 0) throw new Error('ffmpeg failed for '+mp3+': '+(r.stderr||'').toString());
}

const C = {
  Am:[57,60,64], Am9:[57,60,64,67], F:[53,57,60], Fmaj7:[53,57,60,64],
  C:[60,64,67], Cmaj7:[60,64,67,71], G:[55,59,62], G6:[55,59,62,64],
  Dm:[50,53,57], Dm9:[50,53,57,60], E7:[52,56,59,62], Em:[52,55,59],
  Bm7:[47,50,54,57], A7:[57,61,64,67], D:[50,54,57], G7:[55,59,62,65],
  Bb:[46,50,53], Eb:[51,55,58], Csus:[60,65,67], Fsus:[53,58,60],
  Cmaj9:[60,64,67,71,74]
};

function chordPad(b,t,dur,ch,amp,opt={}){
  ch.forEach((n,i)=>{
    tone(b,t,dur,hz(n),amp*(i? .82 : 1),Object.assign({
      type:'pad',attack:opt.attack||1.4,release:opt.release||2.2,
      pan:(i%2? .45 : -.45)+(rnd()-.5)*.15,cutoff:opt.cutoff||0,
      vibrato:opt.vibrato||1.4,vibRate:4.4+ i*.17,width:.0022
    },opt.voice||{}));
  });
}

function menuTrack(){
  const b = newBuf(150);
  const sections = [
    ['Am9','Fmaj7','Cmaj7','G6','Dm9','Am'],
    ['Am','F','C','G','Em','Am9'],
    ['Dm9','Am','E7','Am9','Fmaj7','G'],
    ['Am9','Fmaj7','Cmaj7','G6','Dm9','Am']
  ];
  let t=0;
  for(let s=0;s<4;s++){
    for(let bar=0;bar<6;bar++){
      const ch=C[sections[s][bar]];
      chordPad(b,t,6.2,ch,.042,{attack:1.8,release:2.6,cutoff:2400});
      tone(b,t,3.4,hz(ch[0]-24),.072,{type:'bass',attack:.25,release:1.4,cutoff:320,pan:-.15});
      if(bar%2===1)
        tone(b,t+1.2,2.2,hz(ch[0]-12),.038,{type:'pluck',attack:.01,release:1.3,pan:.25,cutoff:1800});
      const density=s===0?1:s===1?2:s===2?3:4;
      for(let k=0;k<density;k++){
        const deg=(bar*2+k*3+s)%ch.length;
        tone(b,t+1+k*(4/density),1.5,hz(ch[deg]+12),
          .022+s*.003,{type:'bell',attack:.02,release:.9,pan:k%2?.35:-.35,cutoff:4200});
      }
      if(s===3&&bar===5)noise(b,t+5.2,.55,.035,1800,.2);
      t+=6;
    }
  }
  space(b,[[.31,.26,.08],[.53,.14,.06],[.91,.08,.04]]);
  normalize(b,.86);return b;
}

function gameTrack(){
  const b = newBuf(184);
  const prog=['Am9','Fmaj7','Cmaj7','G6','Dm9','Am','Em','Fmaj7','C','G','Am9','Dm'];
  for(let i=0;i<18;i++){
    const ch=C[prog[i%prog.length]],t=i*10;
    chordPad(b,t,10.6,ch,.046,{attack:3.2,release:4.2,cutoff:1700,
      voice:{pan:(i%2?.3:-.3),vibrato:1.1}});
    if(i%2===0)
      tone(b,t,12,hz(ch[0]-24),.05,{type:'bass',attack:3,release:4,cutoff:240,pan:-.2});
    if(i%4===2)
      tone(b,t+4,5,hz(ch[ch.length-1]+12),.018,{type:'bell',attack:1.2,release:2.2,pan:.4,cutoff:3600});
    if(i%6===5)noise(b,t+7,2.5,.012,700,-.25);
  }
  space(b,[[.62,.22,.1],[1.1,.12,.06],[1.7,.06,.03]]);
  normalize(b,.70);return b;
}

function combatTrack(){
  const b = newBuf(128);
  const sections=[
    ['Am','F','C','G'],['Dm','Am','E7','G'],['Bm7','G','D','A7'],['Am','E7','F','G']
  ];
  let t=0;
  for(let s=0;s<4;s++){
    for(let bar=0;bar<8;bar++){
      const ch=C[sections[s][bar%4]];
      chordPad(b,t,3.4,ch,.045,{attack:.5,release:1.4,cutoff:2200,
        voice:{type:'string',vibrato:2.2,vibRate:6}});
      for(const beat of [0,1,2,3]){
        tone(b,t+beat*.8,.5,hz(ch[0]-24),.09,{type:'bass',attack:.006,release:.22,cutoff:360,pan:-.12});
        if(beat===0||beat===2)kick(b,t+beat*.8,.13);
      }
      const pat=[0,2,1,3,2,0,3,1];
      for(let k=0;k<(s<2?4:6);k++){
        const deg=pat[(bar+k+s)%pat.length];
        tone(b,t+k*(3.2/(s<2?4:6)),.55,hz(ch[deg]+12),.026,
          {type:'pluck',attack:.006,release:.28,pan:k%2?.35:-.35,cutoff:2600});
      }
      if(s>=2&&bar%2===0)noise(b,t,.16,.022,2400,.3);
      t+=3.2;
    }
  }
  space(b,[[.28,.24,.09],[.47,.13,.06]]);
  normalize(b,.84);return b;
}

function bossTrack(){
  const b = newBuf(144);
  const sections=[
    ['Dm9','Am','Bb','E7'],['E7','Am','Dm9','G7'],
    ['Bm7','F','Csus','Am'],['Dm9','E7','Am9','Am']
  ];
  let t=0;
  for(let s=0;s<4;s++){
    for(let bar=0;bar<8;bar++){
      const ch=C[sections[s][bar%4]];
      chordPad(b,t,4.2,ch,.052,{attack:.9,release:1.8,cutoff:1200,
        voice:{type:'brass',vibrato:2.8,vibRate:5.6}});
      tone(b,t,3.6,hz(ch[0]-12),.075,{type:'brass',attack:.35,release:1.2,cutoff:500,pan:-.2});
      for(const beat of [0,1,2,3])
        tone(b,t+beat*.9,.55,hz(ch[0]-24),.095,{type:'bass',attack:.008,release:.28,cutoff:300});
      kick(b,t,.17);kick(b,t+1.8,.14);
      const pat=[0,3,1,2,3,0,2,1];
      for(let k=0;k<4;k++)
        tone(b,t+.3+k*.9,.7,hz(ch[pat[(bar+k+s)%pat.length]]+12),.025,
          {type:'string',attack:.02,release:.4,pan:k%2?.4:-.4,cutoff:1900});
      if(bar%4===3)noise(b,t+3.2,.3,.03,1000,.25);
      if(s===3&&bar===7)noise(b,t+3.3,.65,.05,700,.3);
      t+=3.6;
    }
  }
  space(b,[[.34,.27,.1],[.59,.15,.07],[.96,.08,.05]]);
  normalize(b,.88);return b;
}

function creditsTrack(){
  const b = newBuf(156);
  const sections=[
    ['Cmaj7','G6','Am9','Fmaj7'],['Fmaj7','Cmaj7','Dm9','G'],
    ['Am9','E7','Fmaj7','Cmaj7'],['Dm9','G7','Cmaj9','Cmaj9']
  ];
  let t=0;
  for(let s=0;s<4;s++){
    for(let bar=0;bar<6;bar++){
      const ch=C[sections[s][bar%4]];
      chordPad(b,t,6.6,ch,.045,{attack:1.5,release:2.6,cutoff:2100});
      tone(b,t,4.5,hz(ch[0]-24),.055,{type:'bass',attack:.8,release:2,cutoff:300,pan:-.18});
      const mel=[2,3,4,3,2,1,0,1,2,3];
      for(let k=0;k<5;k++){
        const n=ch[mel[(bar*2+k+s)%mel.length]%ch.length]+12;
        tone(b,t+k*1.25,1.5,hz(n),.028,{type:'pluck',attack:.015,release:.8,
          pan:k%2?.32:-.32,cutoff:3200});
      }
      if(bar%2===0)noise(b,t+1,.22,.012,1800,.2);
      t+=6;
    }
  }
  space(b,[[.5,.24,.1],[.88,.13,.07],[1.4,.07,.04]]);
  normalize(b,.84);return b;
}

const tracks={menu:menuTrack,game:gameTrack,combat:combatTrack,boss:bossTrack,credits:creditsTrack};
const outDir=process.argv[2]||path.join(__dirname,'..','game3d','music');
fs.mkdirSync(outDir,{recursive:true});
const tmpDir=fs.mkdtempSync('/tmp/opencode/gp-music-');
for(const [name,fn] of Object.entries(tracks)){
  const b=fn();
  const file=name+'_'+TRACK_VERSION+'.mp3';
  const wav=path.join(tmpDir,file+'.wav'), mp3=path.join(outDir,file);
  writeWav(wav,b);encode(wav,mp3);
  console.log(file,(fs.statSync(mp3).size/1024/1024).toFixed(2)+' MB');
}
fs.rmSync(tmpDir,{recursive:true,force:true});
console.log('done');
