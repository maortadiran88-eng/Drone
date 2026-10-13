// ══════════ TcMusic — calm "lo-fi / chill" background music for focused work ══════════
// Generated live in the browser with Web Audio (warm electric-piano chords, soft bass, light
// swung drums, a few sparse bell notes, faint vinyl crackle). No audio files, no network.
// Browsers only allow sound after a user gesture, so it starts on the first click / key press.
// A speaker toggle (login corner + ⋮ menu) mutes it; the choice is remembered per device.
const TcMusic=(()=>{
  const KEY='tc_music';
  const BPM=72, STEP=60/BPM/2, SWING=.2, VOL=.15;
  const N=null;
  // 8-bar loop:  Dm9 · G13 · Cmaj9 · Am9 · Dm9 · G13 · Cmaj9 · Fmaj9
  const CH=[
    {b:38,p:[53,57,60,64]},   // Dm9
    {b:43,p:[53,59,64,67]},   // G13
    {b:36,p:[55,59,62,64]},   // Cmaj9
    {b:45,p:[55,59,60,64]},   // Am9
    {b:41,p:[57,60,64,67]}    // Fmaj9
  ];
  const PROG=[0,1,2,3,0,1,2,4];
  const MEL=[
    N,N,N,81,N,N,77,N,   76,N,N,N,74,N,N,N,   N,79,N,N,76,N,74,N,   N,N,72,N,N,N,76,N,
    N,N,N,81,N,N,84,N,   83,N,N,79,N,N,N,N,   N,N,76,N,79,N,N,74,   72,N,N,N,N,69,N,N
  ];
  let ctx=null,master=null,dry=null,wet=null,mel=null,noise=null,timer=null,step=0,nextT=0,playing=false;
  const subs=new Set();
  const readPref=()=>{try{return localStorage.getItem(KEY)!=='off';}catch(e){return true;}};
  let enabled=readPref();
  const state=()=>({enabled,playing});
  const emit=()=>{const s=state();subs.forEach(f=>f(s));};
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  const rnd=(a,b)=>a+Math.random()*(b-a);

  const impulse=(c,sec,decay)=>{
    const len=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}
    return b;
  };
  const build=()=>{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    ctx=new AC();
    const lpf=ctx.createBiquadFilter();lpf.type='lowpass';lpf.frequency.value=4200;lpf.Q.value=.4;     // warm / tape-like
    const comp=ctx.createDynamicsCompressor();
    master=ctx.createGain();master.gain.value=0;
    master.connect(lpf);lpf.connect(comp);comp.connect(ctx.destination);
    dry=ctx.createGain();dry.connect(master);
    const verb=ctx.createConvolver();verb.buffer=impulse(ctx,1.9,2.4);
    wet=ctx.createGain();wet.gain.value=.4;wet.connect(verb);verb.connect(master);
    const echo=ctx.createDelay(1);echo.delayTime.value=STEP*3;
    const fb=ctx.createGain();fb.gain.value=.3;echo.connect(fb);fb.connect(echo);
    mel=ctx.createGain();mel.connect(dry);mel.connect(wet);
    const es=ctx.createGain();es.gain.value=.45;mel.connect(es);es.connect(echo);echo.connect(master);
    // shared white-noise buffer for drums
    const nb=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),nd=nb.getChannelData(0);
    for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    noise=nb;
    // faint vinyl crackle (sparse pops), looped
    const cb=ctx.createBuffer(1,ctx.sampleRate*5,ctx.sampleRate),cd=cb.getChannelData(0);
    for(let i=0;i<cd.length;i++){const r=Math.random();cd[i]=r<.0007?(Math.random()*2-1):0;}
    const cs=ctx.createBufferSource();cs.buffer=cb;cs.loop=true;
    const chp=ctx.createBiquadFilter();chp.type='highpass';chp.frequency.value=1800;
    const cg=ctx.createGain();cg.gain.value=.03;
    cs.connect(chp);chp.connect(cg);cg.connect(master);cs.start();
    return true;
  };

  // electric-piano voice: fundamental + soft overtones, quick bloom then gentle decay
  const keys=(t,f,dur,g,dests,det)=>{
    [[1,1],[2,.26],[4,.06]].forEach(([m,a])=>{
      const o=ctx.createOscillator(),e=ctx.createGain();
      o.type='sine';o.frequency.value=f*m;o.detune.value=det||0;
      const pk=g*a;
      e.gain.setValueAtTime(.0001,t);
      e.gain.linearRampToValueAtTime(pk,t+.008);
      e.gain.exponentialRampToValueAtTime(pk*.4,t+.55);
      e.gain.setValueAtTime(pk*.4,t+Math.max(.56,dur));
      e.gain.exponentialRampToValueAtTime(.0001,t+dur+1.3);
      o.connect(e);dests.forEach(d=>e.connect(d));
      o.start(t);o.stop(t+dur+1.4);
    });
  };
  const bass=(t,f,dur,g)=>{
    const o=ctx.createOscillator(),e=ctx.createGain();
    o.type='sine';o.frequency.value=f;
    e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(g,t+.02);
    e.gain.setValueAtTime(g,t+dur*.6);e.gain.exponentialRampToValueAtTime(.0001,t+dur+.25);
    o.connect(e);e.connect(dry);o.start(t);o.stop(t+dur+.3);
  };
  const kick=(t,g)=>{
    const o=ctx.createOscillator(),e=ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(42,t+.13);
    e.gain.setValueAtTime(g,t);e.gain.exponentialRampToValueAtTime(.0001,t+.3);
    o.connect(e);e.connect(dry);o.start(t);o.stop(t+.32);
  };
  const noiseHit=(t,type,freq,q,g,len,dests)=>{
    const s=ctx.createBufferSource();s.buffer=noise;
    const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
    const e=ctx.createGain();e.gain.setValueAtTime(g,t);e.gain.exponentialRampToValueAtTime(.0001,t+len);
    s.connect(f);f.connect(e);dests.forEach(d=>e.connect(d));s.start(t,Math.random()*.5);s.stop(t+len+.02);
  };

  const playStep=(s,t0)=>{
    const bar=Math.floor(s/8),pos=s%8,ch=CH[PROG[bar]];
    const t=t0+(pos%2?STEP*SWING:0);                       // swing the off-beats
    // chords — "boom … chk" comping
    if(pos===0){ch.p.forEach((n,i)=>keys(t+i*.014+rnd(0,.008),mtof(n),STEP*3.2,.05*rnd(.88,1),[dry,wet],rnd(-6,6)));}
    if(pos===5&&bar%2===0){ch.p.slice(1).forEach((n,i)=>keys(t+i*.012,mtof(n),STEP*1.2,.032,[dry,wet],rnd(-5,5)));}
    // bass
    if(pos===0)bass(t,mtof(ch.b),STEP*2.6,.17);
    if(pos===6)bass(t,mtof(ch.b),STEP*1,.1);
    // drums — soft and unobtrusive
    if(pos===0||pos===5)kick(t,pos===0?.34:.24);
    if(pos===2||pos===6){noiseHit(t,'bandpass',1900,.8,.1,.17,[dry,wet]);}
    noiseHit(t,'highpass',7500,.7,pos%2?.012:.022,.05,[dry]);
    // sparse bell melody
    const m=MEL[s];
    if(m!=null)keys(t,mtof(m),STEP*1.6,.045,[mel],0);
  };
  const sched=()=>{
    if(!ctx||!playing)return;
    while(nextT<ctx.currentTime+.5){playStep(step,nextT);nextT+=STEP;step=(step+1)%MEL.length;}
  };
  const start=()=>{
    if(!enabled||playing)return;
    if(!ctx&&!build())return;
    if(ctx.state==='suspended')ctx.resume();
    playing=true;step=0;nextT=ctx.currentTime+.3;
    const now=ctx.currentTime;
    master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(master.gain.value,now);
    master.gain.linearRampToValueAtTime(VOL,now+4);
    clearInterval(timer);timer=setInterval(sched,120);sched();
    emit();
  };
  const stop=()=>{
    if(!playing)return;
    playing=false;clearInterval(timer);
    if(ctx){const now=ctx.currentTime;master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(master.gain.value,now);master.gain.linearRampToValueAtTime(0,now+.9);}
    emit();
  };
  const toggle=()=>{
    if(enabled&&!playing){start();return;}                 // icon says "on" but nothing plays yet → this click starts it
    enabled=!enabled;try{localStorage.setItem(KEY,enabled?'on':'off');}catch(e){}
    if(enabled)start();else stop();
    emit();
  };
  const evs=['pointerdown','keydown','touchstart'];
  const go=e=>{
    if(e.target&&e.target.closest&&e.target.closest('[data-music-toggle]'))return;
    evs.forEach(ev=>window.removeEventListener(ev,go,true));
    if(enabled)start();
  };
  evs.forEach(ev=>window.addEventListener(ev,go,true));
  document.addEventListener('visibilitychange',()=>{
    if(!ctx||!playing)return;
    if(document.hidden)ctx.suspend();else ctx.resume();
  });
  return{state,toggle,start,stop,subscribe:f=>{subs.add(f);return()=>subs.delete(f);}};
})();

function useMusic(){
  const[s,setS]=useState(TcMusic.state());
  useEffect(()=>TcMusic.subscribe(setS),[]);
  return s;
}

function MusicToggle(){
  const m=useMusic();
  const label=m.enabled?'השתק מוזיקת רקע':'הפעל מוזיקת רקע';
  return(
    <button type="button" data-music-toggle className="music-btn" title={label} aria-label={label} aria-pressed={m.enabled} onClick={()=>TcMusic.toggle()}>
      <Ic n={m.enabled?'volume':'volumeoff'} s={19}/>
      {m.enabled&&<span className={'eq'+(m.playing?' on':'')} aria-hidden="true"><i/><i/><i/></span>}
    </button>
  );
}
