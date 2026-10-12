async function compressImg(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        let w=img.width,h=img.height,M=1200;
        if(w>M||h>M){const ratio=Math.min(M/w,M/h);w=Math.round(w*ratio);h=Math.round(h*ratio);}
        c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
        res(c.toDataURL('image/jpeg',.72));
      };
      img.src=e.target.result;
    };
    r.readAsDataURL(file);
  });
}

const updBrands=(brands,bid,cid,mid,fn)=>brands.map(b=>b.id!==bid?b:{...b,categories:b.categories.map(c=>c.id!==cid?c:{...c,models:c.models.map(m=>m.id!==mid?m:fn(m))})});

function fuzzyMatch(q,text){
  // Exact match only — no typo tolerance
  const n=s=>s.toLowerCase().replace(/[\s\-_'"]/g,'');
  const nq=n(q),nt=n(text);
  if(!nq)return false;
  return nt.includes(nq);
}
function partMatches(q,p,cols){
  const qParts=q.trim().toLowerCase().split(/\s+/);
  const allText=[...Object.values(p.values),p.tags||''].join(' ').toLowerCase();
  return qParts.every(qp=>fuzzyMatch(qp,allText));
}

// Kept as functions/objects with identical shapes so every existing call site
// (bB('#e53935'), style={{...BPr('#1565c0')}}, etc.) keeps working unchanged —
// only the visual values were modernized.
const bB  = bg=>({background:bg,border:'none',color:'#fff',padding:'8px 12px',borderRadius:9,cursor:'pointer',fontSize:13,fontWeight:600,whiteSpace:'nowrap',flexShrink:0,transition:'background .15s,transform .08s'});
const sB  = bg=>({background:bg,border:'none',color:'#fff',padding:'5px 11px',borderRadius:7,cursor:'pointer',fontSize:11.5,fontWeight:600,whiteSpace:'nowrap'});
const BPr = bg=>({background:bg,border:'none',color:'#fff',padding:'11px 0',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:14,transition:'opacity .15s'});
const BST = {background:'var(--card2)',border:'1px solid var(--border2)',color:'var(--text)',padding:'11px 0',borderRadius:10,cursor:'pointer',fontSize:14,fontWeight:600};
const INS = {width:'100%',padding:'10px 14px',borderRadius:9,border:'1px solid var(--border)',fontSize:14,boxSizing:'border-box',textAlign:'right',color:'var(--inp)',outline:'none',display:'block',background:'var(--ibg)'};

function Modal({children,onClose,wide,title}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',zIndex:800,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(6px)'}} onClick={onClose}>
      <div style={{background:'var(--card)',borderRadius:24,padding:26,width:'100%',maxWidth:wide?720:390,maxHeight:'92vh',overflowY:'auto',animation:'popIn .2s var(--ease)',border:'1px solid var(--border)',color:'var(--text)',boxShadow:'0 20px 60px rgba(0,0,0,.35)'}} dir="rtl" onClick={e=>e.stopPropagation()}>
        {title&&<div className="disp" style={{fontSize:21,marginBottom:16,borderBottom:'1px solid var(--border)',paddingBottom:14}}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ── Search results dropdown — anchored right below whichever search box is
// showing it (rendered inside a position:relative wrapper around the input),
// so it never covers what the user is typing. ──
function SearchResultsPanel({results,query,onClose,onSelect}){
  return(
    <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,left:0,zIndex:300,background:'var(--card)',borderRadius:12,boxShadow:'0 10px 30px var(--shadow2)',border:'1px solid var(--border)',maxHeight:'55vh',overflowY:'auto',animation:'fadeIn .12s'}}>
      <div style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',color:'var(--sub)',fontSize:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span>{results.length} תוצאות עבור: <strong style={{color:'var(--text)'}}>{query}</strong></span>
        <button onClick={onClose} style={{background:'var(--red)',border:'none',borderRadius:6,color:'#fff',padding:'3px 10px',cursor:'pointer',fontSize:12}}>✕ סגור</button>
      </div>
      {!results.length&&(
        <div style={{padding:28,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>🔍</div>
          <div style={{color:'var(--sub)',fontSize:14,fontWeight:700}}>לא נמצאו תוצאות עבור "{query}"</div>
          <div style={{color:'var(--sub)',fontSize:12,marginTop:6}}>נסה לחפש לפי שם דגם, מק"ט יצרן, מק"ט תדיראן או שם חלק</div>
        </div>
      )}
      {results.map((r,i)=>(
        <div key={i} onClick={()=>onSelect(r)}
          style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:'var(--card)'}}
          onMouseEnter={e=>e.currentTarget.style.background='var(--row2)'}
          onMouseLeave={e=>e.currentTarget.style.background='var(--card)'}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
            <span style={{background:r.b.color,color:'#fff',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700}}>{r.b.name}</span>
            <span style={{fontWeight:700,color:'var(--text)',fontSize:14}}>{r.m.name}</span>
            {r.ms&&<span style={{background:'var(--primary-light)',color:'var(--primary)',padding:'1px 7px',borderRadius:4,fontSize:11,fontWeight:700}}>≡ {r.ms}</span>}
            {r.m.synonyms?.filter(s=>s!==r.ms).map((s,si)=>(
              <span key={si} style={{background:'var(--primary-light)',color:'var(--primary)',padding:'1px 6px',borderRadius:4,fontSize:10}}>{s}</span>
            ))}
            <span style={{color:'var(--sub)',fontSize:11}}>{r.c.name}</span>
            {r.ph.length>0&&<span style={{color:'var(--orange)',fontSize:11,background:'var(--orange-bg)',padding:'1px 6px',borderRadius:4}}>✦ {r.ph.length} חלקים</span>}
          </div>
          {r.ph.slice(0,3).map(p=>{
            const he=(p.values.nameHe||'').trim(),tadPn=(p.values.tadPn||'').trim(),mfgPn=(p.values.mfgPn||'').trim();
            return(
              <div key={p.id} style={{fontSize:11,color:'var(--sub)',paddingRight:8,marginBottom:2,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                {p.discontinued&&<span style={{background:'var(--red)',color:'#fff',borderRadius:4,padding:'1px 6px',fontSize:10,fontWeight:700}}>⛔ הופסק</span>}
                {he&&<span style={{color:'var(--text)',fontWeight:500}}>{he}</span>}
                {tadPn&&<span>מק"ט תדיראן: <strong style={{color:'var(--primary)'}}>{tadPn}</strong></span>}
                {mfgPn&&<span>מק"ט יצרן: <strong>{mfgPn}</strong></span>}
              </div>
            );
          })}
          {r.ph.length>3&&<div style={{fontSize:10,color:'var(--sub)',paddingRight:8}}>ועוד {r.ph.length-3} חלקים...</div>}
        </div>
      ))}
    </div>
  );
}

// ── TiltCard — bento tile with 3D tilt + cursor-tracked cyan glow on hover ──
// Purely presentational wrapper: forwards onClick untouched, adds no state to
// the app, so it never affects data or navigation logic.
function TiltCard({className,style,onClick,children}){
  const ref = useRef(null);
  const onMove = e => {
    const el = ref.current; if(!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX-r.left, y = e.clientY-r.top;
    const rx = ((y/r.height)-.5) * -7;
    const ry = ((x/r.width)-.5) * 7;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
    el.style.setProperty('--mx', x+'px');
    el.style.setProperty('--my', y+'px');
  };
  const onLeave = () => { if(ref.current) ref.current.style.transform = ''; };
  return (
    <div ref={ref} className={'bento-tile '+(className||'')} style={style} onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="glow-layer"></div>
      {children}
    </div>
  );
}

// ── Reveal — wraps a section so it fades/slides in once scrolled into view.
// Wrapper only; never alters what's rendered inside it. ──
function Reveal({children,className,style}){
  const ref = useRef(null);
  const [shown,setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if(!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if(entry.isIntersecting){ setShown(true); io.unobserve(el); }
    }, {threshold:.12});
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={'reveal '+(shown?'show ':'')+(className||'')} style={style}>{children}</div>;
}

// ── AirParticles — decorative cool-air particle canvas for the hero. Reads
// nothing from app state and writes nothing back; safe to mount/unmount freely. ──
function AirParticles(){
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, W, H, mouseX=0, mouseY=0;
    const resize = () => { W=canvas.width=canvas.offsetWidth; H=canvas.height=canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);
    const move = e => { const r=canvas.getBoundingClientRect(); mouseX=e.clientX-r.left; mouseY=e.clientY-r.top; };
    const parent = canvas.parentElement;
    if(parent) parent.addEventListener('mousemove', move);
    const particles = Array.from({length:34}, () => ({
      x:Math.random()*W, y:Math.random()*H+H*.2,
      r:Math.random()*2+1, vy:-(Math.random()*.4+.2), vx:(Math.random()-.5)*.25,
      a:Math.random()*.4+.12
    }));
    const tick = () => {
      ctx.clearRect(0,0,W,H);
      const dark = document.documentElement.classList.contains('dark');
      const color = dark ? '59,217,234' : '10,42,99';
      particles.forEach(p => {
        const dx=(mouseX-p.x)*.0005, dy=(mouseY-p.y)*.0005;
        p.x+=p.vx+dx; p.y+=p.vy+dy;
        if(p.y<-10){ p.y=H+10; p.x=Math.random()*W; }
        if(p.x<-10) p.x=W+10; if(p.x>W+10) p.x=-10;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = `rgba(${color},${p.a})`; ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if(parent) parent.removeEventListener('mousemove', move);
    };
  }, []);
  return <canvas ref={ref} className="air-canvas" aria-hidden="true"/>;
}

function Breadcrumb({items,onHome}){
  // items: [{label, onClick}] — last item renders as the current (non-clickable) page
  return(
    <div className="tc-breadcrumb" dir="rtl">
      <span className="seg" onClick={onHome}><Ic n="home" s={15}/>קטלוג חלקי חילוף</span>
      {items.map((it,i)=>(
        <React.Fragment key={i}>
          <span className="sep">›</span>
          {i===items.length-1||!it.onClick
            ?<span className="seg current">{it.label}</span>
            :<span className="seg" onClick={it.onClick}>{it.label}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── News Ticker ──
function NewsTicker({items}){
  const[idx,setIdx]=useState(0);
  const[visible,setVisible]=useState(true);
  useEffect(()=>{
    if(!items||items.length<=1)return;
    const t=setInterval(()=>{
      setVisible(false);
      setTimeout(()=>{setIdx(i=>(i+1)%items.length);setVisible(true);},400);
    },10000);
    return()=>clearInterval(t);
  },[items]);
  if(!items||!items.length)return null;
  return(
    <div style={{background:'var(--ticker-bg)',color:'#fff',height:34,overflow:'hidden',display:'flex',alignItems:'center',position:'relative',zIndex:190,boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}>
      <div style={{flexShrink:0,background:'var(--ticker-label)',padding:'0 14px',height:'100%',display:'flex',alignItems:'center',fontWeight:'bold',fontSize:12,whiteSpace:'nowrap',gap:5,letterSpacing:.3}}>
        <Ic n="news" s={15}/><span>עדכון</span>
        {items.length>1&&<span style={{background:'rgba(255,255,255,.2)',borderRadius:10,padding:'1px 7px',fontSize:11}}>{idx+1}/{items.length}</span>}
      </div>
      <div style={{overflow:'hidden',flex:1,padding:'0 16px',display:'flex',alignItems:'center'}}>
        <span style={{fontSize:13,transition:'opacity .4s',opacity:visible?1:0,fontWeight:'500'}}>
          {items[idx]||''}
        </span>
      </div>
      {items.length>1&&(
        <div style={{display:'flex',gap:4,padding:'0 10px',flexShrink:0}}>
          {items.map((_,i)=>(
            <div key={i} onClick={()=>{setVisible(false);setTimeout(()=>{setIdx(i);setVisible(true);},200);}}
              style={{width:6,height:6,borderRadius:'50%',background:i===idx?'#fff':'rgba(255,255,255,.35)',cursor:'pointer',transition:'background .3s'}}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tips Bar — fixed at BOTTOM ──
function TipsBar({tips,canEdit,onEdit}){
  const[idx,setIdx]=useState(0);
  const[visible,setVisible]=useState(true);
  useEffect(()=>{
    if(!tips||!tips.length)return;
    const t=setInterval(()=>{setVisible(false);setTimeout(()=>{setIdx(i=>(i+1)%tips.length);setVisible(true);},400);},20000);
    return()=>clearInterval(t);
  },[tips]);
  if(!tips||!tips.length)return null;
  return(
    <div style={{background:'var(--card2)',borderBottom:'1px solid var(--border)',padding:'6px 14px',fontSize:12.5,color:'var(--text2)',display:'flex',alignItems:'center',gap:8,minHeight:28}}>
      <span style={{flexShrink:0,color:'var(--cyan)',display:'flex'}}><Ic n="bolt" s={15}/></span>
      <span style={{transition:'opacity .4s',opacity:visible?1:0,flex:1}}>{tips[idx]||''}</span>
      {canEdit&&<button onClick={onEdit} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--sub)',flexShrink:0,padding:'0 4px',display:'flex'}} title="ערוך טיפים"><Ic n="edit" s={15}/></button>}
    </div>
  );
}

// ══════════ TIPS EDIT MODAL ══════════
function TipsEditModal({tips,onSave,onClose}){
  const[localTips,setLocalTips]=useState([...tips]);
  const[newTip,setNewTip]=useState('');
  return(
    <Modal onClose={onClose} wide title="💡 עריכת טיפים">
      <div style={{maxHeight:'50vh',overflowY:'auto',marginBottom:12}}>
        {localTips.map((t,i)=>(
          <div key={i} style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
            <input value={t} onChange={e=>setLocalTips(p=>p.map((x,j)=>j===i?e.target.value:x))}
              style={{flex:1,border:'1px solid var(--border)',borderRadius:6,padding:'7px 10px',fontSize:13,color:'var(--inp)',background:'var(--ibg)'}}/>
            <button onClick={()=>setLocalTips(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'#e53935',cursor:'pointer',fontSize:16,flexShrink:0}}>🗑</button>
          </div>
        ))}
        {!localTips.length&&<div style={{textAlign:'center',color:'var(--sub)',padding:20}}>אין טיפים — הוסף למטה</div>}
      </div>
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        <input value={newTip} onChange={e=>setNewTip(e.target.value)} placeholder="הוסף טיפ חדש..."
          onKeyDown={e=>{if(e.key==='Enter'&&newTip.trim()){setLocalTips(p=>[...p,newTip.trim()]);setNewTip('');}}}
          style={{flex:1,border:'1px solid var(--border)',borderRadius:6,padding:'7px 10px',fontSize:13,color:'var(--inp)',background:'var(--ibg)'}}/>
        <button onClick={()=>{if(newTip.trim()){setLocalTips(p=>[...p,newTip.trim()]);setNewTip('');}}} style={{...sB('#1565c0'),padding:'7px 14px'}}>+ הוסף</button>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>onSave(localTips)} style={{flex:1,...BPr('#1565c0')}}>✓ שמור</button>
        <button onClick={onClose} style={{flex:1,...BST}}>ביטול</button>
      </div>
    </Modal>
  );
}

// ── Broadcast Banner ──
function BroadcastBanner({msg,onDismiss}){
  if(!msg)return null;
  return(
    <div style={{background:'linear-gradient(135deg,#e65100,#f57c00)',color:'#fff',padding:'10px 16px',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',zIndex:195,position:'relative'}}>
      <span style={{fontSize:16,flexShrink:0}}>📢</span>
      <span style={{flex:1,fontWeight:'bold',fontSize:13}}>{msg}</span>
      <button onClick={onDismiss} style={{background:'rgba(255,255,255,.25)',border:'none',borderRadius:6,color:'#fff',padding:'4px 12px',cursor:'pointer',fontSize:12,flexShrink:0}}>הבנתי ✓</button>
    </div>
  );
}

// ── Time-based greeting ──
function getGreeting(greetings){
  const h=new Date().getHours();
  if(greetings){
    if(h>=5&&h<12&&greetings.morning)  return greetings.morning;
    if(h>=12&&h<17&&greetings.noon)    return greetings.noon;
    if(h>=17&&h<21&&greetings.evening) return greetings.evening;
    if(greetings.night)                return greetings.night;
  }
  if(h>=5&&h<12)  return'🌅 בוקר טוב!';
  if(h>=12&&h<17) return'☀️ צהריים טובים!';
  if(h>=17&&h<21) return'🌆 ערב טוב!';
  return'🌙 לילה טוב!';
}

// ── Help Modal ──
function HelpModal({role,onClose}){
  const isViewer=role==='viewer',isEditor=role==='editor',isAdmin=role==='admin';
  const sections=isViewer?[
    {icon:'🔍',title:'חיפוש',text:'השתמש בשורת החיפוש למעלה. ניתן לחפש לפי שם חלק, מק"ט, שם דגם. החיפוש סולח על שגיאות כתיב.'},
    {icon:'📁',title:'ניווט',text:'בסרגל הצד השמאלי תמצא את כל המותגים והדגמים. לחץ ☰ לפתיחת הסרגל.'},
    {icon:'✅',title:'בחירת חלקים',text:'לחץ על שורה לבחירתה. בחר מספר שורות ושלח בווצאפ בלחיצה אחת.'},
    {icon:'🛒',title:'סל חלקים',text:'לחץ 🛒 על חלק כדי להוסיפו לסל. מהסל ניתן לשלוח את כל החלקים יחד.'},
    {icon:'⭐',title:'מועדפים',text:'לחץ ⭐ ליד דגם לשמירה במועדפים לגישה מהירה מדף הבית.'},
    {icon:'💬',title:'חסר דגם?',text:'בדף הבית: "חסר לך דגם?" — השתמש בטופס כדי לבקש הוספת דגם חדש.'},
  ]:isEditor?[
    {icon:'➕',title:'הוספת דגמים',text:'בסרגל הצד לחץ + ליד קטגוריה להוספת דגם. הקלד שם ובחר מהרשימה למניעת כפילויות.'},
    {icon:'✏️',title:'עריכה',text:'לחץ ישירות על תא בטבלה לעריכה. שינויים נשמרים אוטומטית. ניתן לערוך שם דגם בלחיצה על השם בכותרת.'},
    {icon:'📋',title:'הדבקת נתונים',text:'לחץ "הדבק" להדבקת נתונים מ-Excel. הסדר: לפי עמודות הטבלה.'},
    {icon:'⛔',title:'הופסק',text:'לחץ ⛔ לסימון חלק כהופסק. הוא ימשיך להופיע באדום.'},
    {icon:'📋',title:'לוח משימות',text:'בדף הבית תראה לוח משימות עם דגמים חסרי מק"ט ודיווחים ממתינים.'},
  ]:[
    {icon:'⚙',title:'ניהול מותגים',text:'לחץ ⚙ לניהול מותגים — הוספה, עריכה, שינוי צבע.'},
    {icon:'🔑',title:'הגדרות',text:'לחץ 🔑 לשינוי סיסמאות, טיפים, ברכות ומסך כניסה.'},
    {icon:'📢',title:'הודעת מערכת',text:'לחץ 📢 לשליחת הודעה שתופיע לכל המשתמשים בכניסה הבאה.'},
    {icon:'📊',title:'דשבורד',text:'לחץ 📊 לדשבורד עם גרפי צפיות ולוח משימות.'},
    {icon:'🕐',title:'גרסאות',text:'לחץ 🕐 לגרסאות קודמות — ניתן לשחזר כל גרסה בלחיצה אחת.'},
    {icon:'📰',title:'חדשות',text:'לחץ 📰 לעריכת שורת החדשות הרצה בראש האתר.'},
  ];
  return(
    <Modal onClose={onClose} wide title="❓ מדריך שימוש">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {sections.map((s,i)=>(
          <div key={i} style={{background:'var(--row2)',borderRadius:10,padding:'12px 14px',borderRight:'3px solid #1565c0'}}>
            <div style={{fontWeight:'bold',fontSize:13,marginBottom:4,color:'var(--text)'}}>{s.icon} {s.title}</div>
            <div style={{fontSize:12,color:'var(--sub)',lineHeight:1.6}}>{s.text}</div>
          </div>
        ))}
      </div>
      <button onClick={onClose} style={{width:'100%',...BPr('#1565c0')}}>הבנתי ✓</button>
    </Modal>
  );
}
