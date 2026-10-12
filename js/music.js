// ══════════ TcMusic — login-screen background music ══════════
// Main source : the YouTube track chosen by the owner, played through YouTube's own embedded player
//               (visible mini-player, as YouTube's terms require). Starts on the first click / key press,
//               because browsers block sound before a user gesture.
// Fallback    : if YouTube can't load or the video can't be embedded, an original ambient melody is
//               synthesised live with Web Audio (no files), so the screen is never silent by accident.
// Scope       : the login screen only. Leaving it (logging in) stops and removes the player.
const TcMusic=(()=>{
  const KEY='tc_music';
  const VIDEO='xAR6N9N8e6U';
  const readPref=()=>{try{return localStorage.getItem(KEY)!=='off';}catch(e){return true;}};
  let enabled=readPref(), gesture=false;
  const subs=new Set();

  // ── YouTube backend ──
  let yt=null,ytReady=false,ytFailed=false,ytPlaying=false,pending=false;
  const ytPlay=()=>{try{yt.unMute();yt.setVolume(65);yt.playVideo();}catch(e){}};

  // ── Synth backend (fallback) ──
  const BPM=68, STEP=60/BPM/2;
  const CH=[{b:48,p:[60,64,67,71]},{b:45,p:[57,60,64,67]},{b:41,p:[57,60,64,65]},{b:43,p:[55,59,62,64]},{b:43,p:[55,60,62,67]}];
  const PROG=[0,1,2,3,0,1,2,4];
  const N=null;
  const MEL=[76,N,N,79,N,76,N,74, 72,N,N,74,N,76,N,N, 76,N,N,72,N,74,N,76, 79,N,N,76,N,74,N,N,
             76,N,79,N,81,N,79,N, 72,N,74,N,76,N,N,N, 81,N,N,79,N,76,N,72, 74,N,N,72,N,N,N,N];
  let ctx=null,master=null,dry=null,wet=null,mel=null,timer=null,step=0,nextT=0,synthOn=false;
  const mtof=m=>440*Math.pow(2,(m-69)/12);
  const impulse=(c,sec,decay)=>{const len=Math.floor(c.sampleRate*sec),b=c.createBuffer(2,len,c.sampleRate);
    for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}return b;};
  const build=()=>{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    ctx=new AC();const comp=ctx.createDynamicsCompressor();
    master=ctx.createGain();master.gain.value=0;master.connect(comp);comp.connect(ctx.destination);
    dry=ctx.createGain();dry.connect(master);
    const verb=ctx.createConvolver();verb.buffer=impulse(ctx,3,2.6);
    wet=ctx.createGain();wet.gain.value=.55;wet.connect(verb);verb.connect(master);
    const echo=ctx.createDelay(1);echo.delayTime.value=STEP*3;
    const fb=ctx.createGain();fb.gain.value=.32;echo.connect(fb);fb.connect(echo);
    mel=ctx.createGain();mel.connect(dry);mel.connect(wet);
    const es=ctx.createGain();es.gain.value=.5;mel.connect(es);es.connect(echo);echo.connect(master);
    return true;
  };
  const tone=(t,f,dur,type,gain,att,rel,dests,detune)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;if(detune)o.detune.value=detune;
    g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(gain,t+att);
    g.gain.setValueAtTime(gain,t+Math.max(att,dur));g.gain.exponentialRampToValueAtTime(.0001,t+dur+rel);
    o.connect(g);dests.forEach(d=>g.connect(d));o.start(t);o.stop(t+dur+rel+.05);
  };
  const playStep=(s,t)=>{
    const bar=Math.floor(s/8),pos=s%8,ch=CH[PROG[bar]];
    if(pos===0){
      ch.p.forEach((n,i)=>{tone(t,mtof(n),8*STEP*.96,'triangle',.032,1.4,2.4,[dry,wet],i%2?4:-4);tone(t,mtof(n),8*STEP*.96,'sine',.026,1.4,2.4,[dry,wet]);});
      tone(t,mtof(ch.b),4*STEP,'sine',.1,.06,.9,[dry]);
    }
    if(pos===4)tone(t,mtof(ch.b),3*STEP,'sine',.07,.06,.9,[dry]);
    const m=MEL[s];
    if(m!=null){tone(t,mtof(m),STEP*1.5,'sine',.07,.012,.9,[mel]);tone(t,mtof(m)*2,STEP*.7,'triangle',.014,.008,.5,[mel]);}
  };
  const sched=()=>{if(!ctx||!synthOn)return;while(nextT<ctx.currentTime+.4){playStep(step,nextT);nextT+=STEP;step=(step+1)%MEL.length;}};
  const synthStart=()=>{
    if(synthOn)return;if(!ctx&&!build())return;if(ctx.state==='suspended')ctx.resume();
    synthOn=true;step=0;nextT=ctx.currentTime+.25;const now=ctx.currentTime;
    master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(master.gain.value,now);master.gain.linearRampToValueAtTime(.17,now+3);
    clearInterval(timer);timer=setInterval(sched,120);sched();
  };
  const synthStop=()=>{
    if(!synthOn)return;synthOn=false;clearInterval(timer);
    if(ctx){const now=ctx.currentTime;master.gain.cancelScheduledValues(now);master.gain.setValueAtTime(master.gain.value,now);master.gain.linearRampToValueAtTime(0,now+.8);}
  };

  // ── shared ──
  const playingNow=()=>ytPlaying||synthOn;
  const state=()=>({enabled,playing:playingNow(),ytFailed});
  const emit=()=>{const s=state();subs.forEach(f=>f(s));};
  const start=()=>{
    if(!enabled)return;
    if(ytFailed){synthStart();emit();return;}
    if(yt&&ytReady){ytPlay();return;}
    pending=true;                                   // player still loading — start the moment it is ready
  };
  const pauseAll=()=>{pending=false;try{if(yt&&ytReady)yt.pauseVideo();}catch(e){}synthStop();};
  const toggle=()=>{
    if(enabled&&!playingNow()){gesture=true;start();emit();return;}   // icon says "on" but nothing plays yet → start
    enabled=!enabled;try{localStorage.setItem(KEY,enabled?'on':'off');}catch(e){}
    if(enabled){gesture=true;start();}else pauseAll();
    emit();
  };
  const evs=['pointerdown','keydown','touchstart'];
  const go=e=>{
    if(e.target&&e.target.closest&&e.target.closest('[data-music-toggle]'))return;
    evs.forEach(ev=>window.removeEventListener(ev,go,true));
    gesture=true;if(enabled)start();
  };
  evs.forEach(ev=>window.addEventListener(ev,go,true));

  return{
    state,toggle,start,
    subscribe:f=>{subs.add(f);return()=>subs.delete(f);},
    VIDEO,
    _attach:p=>{yt=p;ytReady=true;ytFailed=false;if(pending&&enabled){pending=false;ytPlay();}emit();},
    _ready:()=>ytReady,
    _state:code=>{const was=ytPlaying;ytPlaying=(code===1);if(was!==ytPlaying)emit();},
    _fail:force=>{if(ytReady&&!force)return;try{if(yt)yt.destroy();}catch(e){}ytFailed=true;yt=null;ytReady=false;ytPlaying=false;pending=false;if(enabled&&gesture)synthStart();emit();},
    _detach:()=>{try{if(yt)yt.destroy();}catch(e){}yt=null;ytReady=false;ytPlaying=false;pending=false;ytFailed=false;synthStop();emit();}
  };
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

// Visible YouTube mini-player (YouTube requires the embedded player to stay visible while it plays).
function LoginPlayer(){
  const box=useRef(null);
  const m=useMusic();
  useEffect(()=>{
    let dead=false,player=null,t=null;
    const make=()=>{
      if(dead||!box.current)return;
      try{
        const host=document.createElement('div');box.current.appendChild(host);
        player=new window.YT.Player(host,{
          videoId:TcMusic.VIDEO,width:'100%',height:'200',
          playerVars:{controls:1,rel:0,playsinline:1,loop:1,playlist:TcMusic.VIDEO,modestbranding:1,iv_load_policy:3},
          events:{
            onReady:()=>{clearTimeout(t);TcMusic._attach(player);},
            onStateChange:e=>TcMusic._state(e.data),
            onError:()=>TcMusic._fail(true)
          }
        });
      }catch(e){TcMusic._fail();}
    };
    if(window.YT&&window.YT.Player)make();
    else{
      const prev=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{if(prev)prev();make();};
      if(!document.getElementById('yt-api')){
        const s=document.createElement('script');s.id='yt-api';s.src='https://www.youtube.com/iframe_api';
        s.onerror=()=>TcMusic._fail();document.head.appendChild(s);
      }
      t=setTimeout(()=>{if(!TcMusic._ready())TcMusic._fail();},9000);
    }
    return()=>{dead=true;clearTimeout(t);TcMusic._detach();};
  },[]);
  return <div className="yt-card" ref={box} style={m.ytFailed?{display:'none'}:undefined} aria-label="נגן מוזיקת רקע"/>;
}
