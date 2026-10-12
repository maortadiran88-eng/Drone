// ══════════ TcMusic — an original, gentle ambient melody synthesised live with Web Audio.
// No audio files, no network. Browsers only allow sound after a user gesture, so playback
// starts on the first click / key press, with a visible mute toggle (remembered per device).
const TcMusic=(()=>{
  const KEY='tc_music';
  const BPM=68, STEP=60/BPM/2;                       // eighth-note grid
  const CH=[{b:48,p:[60,64,67,71]},{b:45,p:[57,60,64,67]},{b:41,p:[57,60,64,65]},{b:43,p:[55,59,62,64]},{b:43,p:[55,60,62,67]}];
  const PROG=[0,1,2,3,0,1,2,4];                       // 8 bars: Cmaj7 · Am7 · Fmaj7 · G6 · Cmaj7 · Am7 · Fmaj7 · Gsus
  const N=null;
  const MEL=[
    76,N,N,79,N,76,N,74,   72,N,N,74,N,76,N,N,
    76,N,N,72,N,74,N,76,   79,N,N,76,N,74,N,N,
    76,N,79,N,81,N,79,N,   72,N,74,N,76,N,N,N,
    81,N,N,79,N,76,N,72,   74,N,N,72,N,N,N,N
  ];
  let ctx=null,master=null,dry=null,wet=null,mel=null,timer=null,step=0,nextT=0,playing=false;
  const subs=new Set();
  const readPref=()=>{try{return localStorage.getItem(KEY)!=='off';}catch(e){return true;}};
  let enabled=readPref();
  const state=()=>({enabled,playing});
  const emit=()=>{const s=state();subs.forEach(f=>f(s));};
  const mtof=m=>440*Math.pow(2,(m-69)/12);

  const impulse=(c,sec,decay)=>{
    const len=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}
    return b;
  };
  const build=()=>{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false;
    ctx=new AC();
    const comp=ctx.createDynamicsCompressor();
    master=ctx.createGain(); master.gain.value=0;
    master.connect(comp); comp.connect(ctx.destination);
    dry=ctx.createGain(); dry.gain.value=1; dry.connect(master);
    const verb=ctx.createConvolver(); verb.buffer=impulse(ctx,3,2.6);
    wet=ctx.createGain(); wet.gain.value=.55; wet.connect(verb); verb.connect(master);
    const echo=ctx.createDelay(1); echo.delayTime.value=STEP*3;
    const fb=ctx.createGain(); fb.gain.value=.32; echo.connect(fb); fb.connect(echo);
    mel=ctx.createGain(); mel.gain.value=1; mel.connect(dry); mel.connect(wet);
    const es=ctx.createGain(); es.gain.value=.5; mel.connect(es); es.connect(echo); echo.connect(master);
    return true;
  };
  const tone=(t,f,dur,type,gain,att,rel,dests,detune)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.value=f;if(detune)o.detune.value=detune;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(gain,t+att);
    g.gain.setValueAtTime(gain,t+Math.max(att,dur));
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur+rel);
    o.connect(g);dests.forEach(d=>g.connect(d));
    o.start(t);o.stop(t+dur+rel+.05);
  };
  const playStep=(s,t)=>{
    const bar=Math.floor(s/8),pos=s%8,ch=CH[PROG[bar]];
    if(pos===0){
      ch.p.forEach((n,i)=>{
        tone(t,mtof(n),8*STEP*.96,'triangle',.032,1.4,2.4,[dry,wet],i%2?4:-4);
        tone(t,mtof(n),8*STEP*.96,'sine',.026,1.4,2.4,[dry,wet]);
      });
      tone(t,mtof(ch.b),4*STEP,'sine',.1,.06,.9,[dry]);
    }
    if(pos===4) tone(t,mtof(ch.b),3*STEP,'sine',.07,.06,.9,[dry]);
    const m=MEL[s];
    if(m!=null){
      tone(t,mtof(m),STEP*1.5,'sine',.07,.012,.9,[mel]);
      tone(t,mtof(m)*2,STEP*.7,'triangle',.014,.008,.5,[mel]);
    }
  };
  const sched=()=>{
    if(!ctx||!playing) return;
    while(nextT<ctx.currentTime+.4){playStep(step,nextT);nextT+=STEP;step=(step+1)%MEL.length;}
  };
  const start=()=>{
    if(!enabled||playing) return;
    if(!ctx&&!build()) return;
    if(ctx.state==='suspended') ctx.resume();
    playing=true;step=0;nextT=ctx.currentTime+.25;
    const now=ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value,now);
    master.gain.linearRampToValueAtTime(.17,now+3);
    clearInterval(timer);timer=setInterval(sched,120);sched();
    emit();
  };
  const stop=()=>{
    if(!playing) return;
    playing=false;clearInterval(timer);
    if(ctx){
      const now=ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value,now);
      master.gain.linearRampToValueAtTime(0,now+.8);
    }
    emit();
  };
  const toggle=()=>{
    if(enabled&&!playing){start();return;}            // icon says "on" but nothing played yet → this click starts it
    enabled=!enabled;
    try{localStorage.setItem(KEY,enabled?'on':'off');}catch(e){}
    if(enabled) start(); else stop();
    emit();
  };
  // first user gesture anywhere starts the music (unless the user muted it before)
  const evs=['pointerdown','keydown','touchstart'];
  const go=e=>{
    if(e.target&&e.target.closest&&e.target.closest('[data-music-toggle]')) return;
    evs.forEach(ev=>window.removeEventListener(ev,go,true));
    if(enabled) start();
  };
  evs.forEach(ev=>window.addEventListener(ev,go,true));
  document.addEventListener('visibilitychange',()=>{
    if(!ctx||!playing) return;
    if(document.hidden) ctx.suspend(); else ctx.resume();
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
