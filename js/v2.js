// ══════════ V2 — NEW EXPERIENCE LAYER ══════════
// Home 3D stage · command palette · mobile tab bar · 3D parts wall · drawing viewer · segmented tabs.
// Pure presentation: reads the same data / handlers the app already has, never writes to Firebase.

const allModelsOf = c => [...(c.models||[]), ...((c.subCategories||[]).flatMap(sc=>sc.models||[]))];
const findModelDeep = (data,mid) => {
  for (const b of data.brands) for (const c of b.categories) {
    const m = allModelsOf(c).find(x=>x.id===mid);
    if (m) return {b,c,m};
  }
  return null;
};

// ─── pointer-follow rotation (smooth, eased). `restRef.current` = {y,x} can change at any time; returns a ref whose .current() re-aims ───
function usePointerFollow(ref, ry, rx, restRef){
  const api = useRef(null);
  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const R = () => restRef.current;
    let ty=R().y, tx=R().x, cy=ty, cx=tx, raf=0;
    const clamp = v => Math.max(-1, Math.min(1, v));
    const apply = () => { el.style.transform = `rotateX(${cx.toFixed(2)}deg) rotateY(${cy.toFixed(2)}deg)`; el.style.setProperty('--ry', cy.toFixed(2)); el.style.setProperty('--rx', cx.toFixed(2)); };
    const loop = () => {
      cy += (ty-cy)*.085; cx += (tx-cx)*.085; apply();
      raf = (Math.abs(ty-cy)>.02 || Math.abs(tx-cx)>.02) ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => { if(!raf) raf = requestAnimationFrame(loop); };
    const onMove = e => {
      const r = el.getBoundingClientRect();
      const nx = clamp((e.clientX-(r.left+r.width/2))/(window.innerWidth*.45));
      const ny = clamp((e.clientY-(r.top+r.height/2))/(window.innerHeight*.45));
      ty = R().y + nx*ry; tx = R().x - ny*rx; wake();
    };
    const onLeave = () => { ty=R().y; tx=R().x; wake(); };
    api.current = () => { ty=R().y; tx=R().x; wake(); };
    apply();
    if (reduce) return;
    window.addEventListener('pointermove', onMove, {passive:true});
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => { window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('mouseleave', onLeave); if(raf) cancelAnimationFrame(raf); };
  }, []);
  return api;
}

// ══════════ 3D HERO UNIT — the Tadiran wall-mounted indoor unit (silver glass, 24° display) ══════════
// Follows the cursor. Hover / tap takes it apart: the cover lifts away and the real components separate in depth —
// electronic board (far right, label top-right), fan motor (behind the board, label bottom-right),
// cross-flow roller "מאיץ" (full length, label on the left), plus filter, coil and chassis.
function HeroUnit3D(){
  const ref = useRef(null);
  const restRef = useRef({y:-24, x:10});
  const [open,setOpen] = useState(false);
  const retarget = usePointerFollow(ref, 28, 12, restRef);
  useEffect(()=>{ restRef.current = open ? {y:-24, x:-10} : {y:-24, x:10}; if(retarget.current) retarget.current(); },[open]);
  const slices = [];
  for (let k=1;k<=18;k++) slices.push(<i key={k} className="hu-sl" style={{'--k':k}}/>);
  const air = [];
  for (let k=0;k<8;k++) air.push(<i key={k} style={{'--k':k,'--d':((k*.37)%1.5).toFixed(2)+'s'}}/>);
  return(
    <div className={'hu-wrap'+(open?' is-open':'')} aria-hidden="true"
      onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onClick={()=>setOpen(v=>!v)}>
      <div className="hu-glow"/>
      <div className="hu-float">
        <div className="hu" ref={ref}>
          <div className={'hu-ac'+(open?' open flapopen':'')}>
            {/* ── real components ── */}
            <div className="hu-inner">
              <div className="hu-part hu-chassis" style={{'--z0':'-60px','--z1':'-125px','--dl':'.35s'}}>
                <i className="hu-tray"/>
                <i className="hu-screw" style={{left:'3%',top:'8%'}}/><i className="hu-screw" style={{right:'3%',top:'8%'}}/><i className="hu-screw" style={{left:'3%',bottom:'30%'}}/><i className="hu-screw" style={{right:'3%',bottom:'30%'}}/>
              </div>
              <div className="hu-part hu-coil" style={{'--z0':'-54px','--z1':'-82px','--dl':'.25s'}}/>
              <div className="hu-part hu-filter" style={{'--z0':'-14px','--z1':'96px','--dl':'.1s'}}/>
              <div className="hu-part hu-roller" style={{'--z0':'-46px','--z1':'-30px','--dl':'.15s'}}>
                {['0','25%','50%','75%','calc(100% - 6px)'].map(x=><i key={x} className="hu-ring" style={{'--x':x}}/>)}
                <span className="hu-lab l ml" style={{'--lz':'150px'}}><i/>מאיץ</span>
              </div>
              <div className="hu-part hu-motor" style={{'--z0':'-42px','--z1':'-44px','--dl':'.3s'}}>
                <svg viewBox="0 -14 64 60">
                  <defs><linearGradient id="huMt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3246"/><stop offset=".4" stopColor="#7787a8"/><stop offset="1" stopColor="#1f2638"/></linearGradient></defs>
                  <rect x="10" y="37" width="46" height="8" rx="2" fill="#8b929f"/>
                  <rect x="0" y="20" width="14" height="5" rx="2" fill="#cfd5df"/>
                  <path d="M46 8C46 -6 55 -2 55 -13" stroke="#e5c34a" strokeWidth="1.6" fill="none"/><path d="M50 8C50 -4 58 -4 58 -12" stroke="#d94a4a" strokeWidth="1.6" fill="none"/><path d="M54 8C54 -2 61 -2 61 -11" stroke="#1d1f26" strokeWidth="1.6" fill="none"/>
                  <rect x="12" y="8" width="44" height="30" rx="10" fill="url(#huMt)" stroke="#161c2b" strokeWidth="1.2"/>
                  <g stroke="#0f1522" strokeOpacity=".5" strokeWidth="1"><path d="M22 10v26M27 9v28M32 9v28M37 9v28M42 10v26"/></g>
                  <ellipse cx="55" cy="23" rx="4" ry="15" fill="#3a4560" stroke="#161c2b"/>
                </svg>
                <span className="hu-lab r br" style={{'--lz':'150px'}}><i/>מנוע מאוורר</span>
              </div>
              <div className="hu-part hu-board" style={{'--z0':'-50px','--z1':'64px','--dl':'0s'}}>
                <svg viewBox="0 0 100 86">
                  <defs><linearGradient id="huPcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#127a58"/><stop offset="1" stopColor="#0b5a43"/></linearGradient></defs>
                  <rect width="100" height="86" rx="5" fill="url(#huPcb)" stroke="#073d2e" strokeWidth="1.5"/>
                  <g stroke="#52d9a8" strokeOpacity=".45" strokeWidth=".8" fill="none"><path d="M8 20H38V34H60"/><path d="M8 28H30V46H70"/><path d="M12 60H44V72H88"/><path d="M60 14H90V30"/><path d="M20 78H52"/><path d="M70 40V58H90"/></g>
                  <g fill="#06281f" stroke="#c9d3df" strokeWidth=".8"><circle cx="6" cy="6" r="2.4"/><circle cx="94" cy="6" r="2.4"/><circle cx="6" cy="80" r="2.4"/><circle cx="94" cy="80" r="2.4"/></g>
                  <rect x="10" y="10" width="26" height="16" rx="2" fill="#2d62c8" stroke="#1b3f8a" strokeWidth=".8"/><rect x="13" y="13" width="20" height="3" rx="1" fill="#9db9f0" opacity=".6"/>
                  <rect x="44" y="12" width="20" height="14" rx="1.4" fill="#16181d"/><g stroke="#c4c9d2" strokeWidth="1"><path d="M46 10v2M50 10v2M54 10v2M58 10v2M62 10v2M46 26v2M50 26v2M54 26v2M58 26v2M62 26v2"/></g>
                  <rect x="10" y="40" width="30" height="24" rx="2" fill="#9a8f7e" stroke="#6b6254" strokeWidth=".8"/><path d="M14 44h22M14 50h22M14 56h22" stroke="#6b6254" strokeWidth=".8"/>
                  <circle cx="58" cy="52" r="8" fill="#1f3a78"/><circle cx="58" cy="52" r="5.6" fill="#c8cfda"/><path d="M55 49l6 6M61 49l-6 6" stroke="#8892a3" strokeWidth=".8"/>
                  <circle cx="78" cy="52" r="8" fill="#1f3a78"/><circle cx="78" cy="52" r="5.6" fill="#c8cfda"/><path d="M75 49l6 6M81 49l-6 6" stroke="#8892a3" strokeWidth=".8"/>
                  <rect x="72" y="12" width="20" height="10" rx="1.5" fill="#f1f3f0"/><g fill="#caa24a"><rect x="75" y="14" width="2" height="6"/><rect x="80" y="14" width="2" height="6"/><rect x="85" y="14" width="2" height="6"/></g>
                  <rect x="44" y="68" width="46" height="12" rx="1.6" fill="#e9efe7" stroke="#b8c5b6" strokeWidth=".6"/><g fill="#8b95a3"><circle cx="52" cy="74" r="2.4"/><circle cx="61" cy="74" r="2.4"/><circle cx="70" cy="74" r="2.4"/><circle cx="79" cy="74" r="2.4"/></g>
                  <circle cx="16" cy="72" r="1.8" fill="#4ade80"/><circle cx="22" cy="72" r="1.8" fill="#fbbf24"/>
                </svg>
                <span className="hu-lab r tr" style={{'--lz':'60px'}}><i/>כרטיס אלקטרוני</span>
              </div>
            </div>
            {/* ── cover: glass front, lip, chin with discharge flap ── */}
            <div className="hu-shell">
              {slices}
              <div className="hu-glass">
                <svg className="hu-sw" viewBox="0 0 440 102" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="huBand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0"/><stop offset=".3" stopColor="#fff" stopOpacity=".34"/><stop offset=".75" stopColor="#fff" stopOpacity=".26"/><stop offset="1" stopColor="#fff" stopOpacity=".08"/></linearGradient>
                    <linearGradient id="huShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d80a0" stopOpacity="0"/><stop offset="1" stopColor="#7d80a0" stopOpacity=".16"/></linearGradient>
                  </defs>
                  <path d="M0 66 C 110 80, 230 58, 330 40 C 385 30, 420 22, 440 16 L 440 36 C 405 44, 360 54, 300 66 C 205 86, 100 98, 0 90 Z" fill="url(#huBand)"/>
                  <path d="M0 66 C 110 80, 230 58, 330 40 C 385 30, 420 22, 440 16" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1"/>
                  <rect x="0" y="52" width="440" height="50" fill="url(#huShade)"/>
                </svg>
                <i className="hu-toplip"/>
                <div className="hu-disp">
                  <svg viewBox="-13 -1 44 38">
                    <g className="on">
                      <g transform="translate(-6.5 11)" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"><path d="M0 -4.2V4.2M-3.6 -2.1L3.6 2.1M-3.6 2.1L3.6 -2.1"/></g>
                      <rect x="2" y="0" width="8" height="3" rx="1.2"/><rect x="9" y="2" width="3" height="8" rx="1.2"/><rect x="2" y="9.5" width="8" height="3" rx="1.2"/><rect x="0" y="12" width="3" height="8" rx="1.2"/><rect x="2" y="19" width="8" height="3" rx="1.2"/>
                      <g transform="translate(17 0)"><rect x="0" y="2" width="3" height="8" rx="1.2"/><rect x="2" y="9.5" width="8" height="3" rx="1.2"/><rect x="9" y="2" width="3" height="8" rx="1.2"/><rect x="9" y="12" width="3" height="8" rx="1.2"/></g>
                      <g transform="translate(14.5 30)" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M-2.6 -2.3A4 4 0 1 0 2.6 -2.3"/><path d="M0 -4.6V0"/></g>
                    </g>
                  </svg>
                </div>
                <div className="hu-logo">
                  <span className="hu-em"><svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M2.4 3h7.2M6 3v7M3.4 5.2l2.6 1.3 2.6-1.3"/></svg></span>
                  <b>TADIRAN</b><u>VRF G</u>
                </div>
                <i className="hu-glare"/>
              </div>
              <i className="hu-lip"/>
              <div className="hu-chin"><i className="hu-slotd"/><i className="hu-flap"/></div>
              <div className="hu-air">{air}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="hu-hint">{open?'כל חלק במערכת, עם המק"ט שלו':'הציבו עכבר או לחצו כדי לפרק את היחידה'}</div>
    </div>
  );
}

// ══════════ HOW IT WORKS — three steps, easy to grasp ══════════
function HowItWorks(){
  const steps = [
    ['search','חפשו','לפי מק"ט, דגם או שם חלק, בעברית או באנגלית.','hw-a'],
    ['checkc','בחרו','לחצו על שורה כדי לבחור חלקים, או הוסיפו אותם לסל.','hw-b'],
    ['send','שלחו','שליחה בווצאפ בלחיצה אחת, או ייצוא ל-Excel ול-PDF.','hw-c'],
  ];
  return(
    <div className="hw-grid">
      {steps.map(([ic,t,d,cls],i)=>(
        <div key={t} className={'hw-card '+cls}>
          <span className="hw-n">{i+1}</span>
          <span className="hw-ic"><Ic n={ic} s={26} sw={1.6}/></span>
          <div className="hw-t">{t}</div>
          <div className="hw-d">{d}</div>
        </div>
      ))}
    </div>
  );
}

// ══════════ SEGMENTED CONTROL (tabs / view switch) with a sliding pill ══════════
function Segmented({value,onChange,options,compact}){
  const idx = Math.max(0, options.findIndex(o=>o.v===value));
  return(
    <div className={'seg'+(compact?' seg-sm':'')} role="tablist" style={{'--n':options.length,'--i':idx}}>
      <span className="seg-pill"/>
      {options.map(o=>(
        <button key={o.v} role="tab" aria-selected={o.v===value} onClick={()=>onChange(o.v)}
          className={'seg-btn'+(o.tt?' tt':'')+(o.v===value?' on':'')} data-tt={o.tt||undefined}>
          {o.icon&&<Ic n={o.icon} s={compact?16:18}/>}
          <span className="seg-l">{o.label}</span>
          {o.count!=null&&<span className="seg-c">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ══════════ COMMAND PALETTE — one search for everything (Ctrl/⌘ + K, or "/") ══════════
function CommandPalette({open,onClose,query,setQuery,results,onSelect,recent,data,canSeeHidden}){
  const inRef = useRef(null);
  const [act,setAct] = useState(0);
  useEffect(()=>{ if(open){ setAct(0); setTimeout(()=>inRef.current&&inRef.current.focus(),30); } },[open]);
  useEffect(()=>{ setAct(0); },[query]);
  const recents = useMemo(()=>{
    if(!open||query.trim()) return [];
    const out=[];
    (recent||[]).slice(0,6).forEach(rv=>{
      const f=findModelDeep(data,rv.mid); if(!f) return;
      if(!canSeeHidden&&(f.b.hidden||f.m.hidden)) return;
      out.push({b:f.b,c:f.c,m:f.m,ph:[],ms:null});
    });
    return out;
  },[open,query,recent,data,canSeeHidden]);
  if(!open) return null;
  const list = query.trim() ? results.slice(0,40) : recents;
  const pick = r => { onSelect(r); onClose(); };
  const onKey = e => {
    if(e.key==='Escape'){ e.preventDefault(); onClose(); }
    else if(e.key==='ArrowDown'){ e.preventDefault(); setAct(a=>Math.min(list.length-1,a+1)); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setAct(a=>Math.max(0,a-1)); }
    else if(e.key==='Enter'&&list[act]){ e.preventDefault(); pick(list[act]); }
  };
  return(
    <div className="cp-back" onClick={onClose}>
      <div className="cp" role="dialog" aria-label="חיפוש" onClick={e=>e.stopPropagation()} onKeyDown={onKey}>
        <div className="cp-in">
          <span className="cp-ic"><Ic n="search" s={22}/></span>
          <input ref={inRef} value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="חיפוש לפי מק&quot;ט, דגם או שם חלק..." aria-label="חיפוש"/>
          <button className="cp-x" onClick={onClose} aria-label="סגור">Esc</button>
        </div>
        <div className="cp-body">
          {!query.trim()&&<div className="cp-label">{recents.length?'נצפו לאחרונה':'התחילו להקליד כדי לחפש בכל הקטלוג'}</div>}
          {query.trim()&&!list.length&&(
            <div className="cp-empty">
              <div className="cp-empty-ic"><Ic n="search" s={30}/></div>
              <b>לא נמצאו תוצאות עבור "{query}"</b>
              <span>נסו לחפש לפי שם דגם, מק"ט יצרן, מק"ט תדיראן או שם חלק</span>
            </div>
          )}
          {list.map((r,i)=>(
            <div key={r.m.id} className={'cp-row'+(i===act?' on':'')} style={{'--bc':r.b.color,'--i':Math.min(i,10)}}
              onMouseEnter={()=>setAct(i)} onClick={()=>pick(r)}>
              <span className="cp-tile" style={{background:r.b.light||(r.b.color+'18'),color:r.b.color}}>{r.b.name.slice(0,2)}</span>
              <span className="cp-main">
                <span className="cp-top">
                  <b className="cp-name">{r.m.name}</b>
                  {r.ms&&<span className="cp-syn">≡ {r.ms}</span>}
                  <span className="cp-meta">{r.b.name} · {r.c.name}</span>
                  {r.ph&&r.ph.length>0&&<span className="cp-cnt">{r.ph.length} חלקים תואמים</span>}
                </span>
                {r.ph&&r.ph.slice(0,2).map(p=>{
                  const he=(p.values.nameHe||'').trim(),tad=(p.values.tadPn||'').trim();
                  return(<span key={p.id} className="cp-part">{p.discontinued&&<em>הופסק</em>}{he}{tad&&<span className="num">{tad}</span>}</span>);
                })}
              </span>
              <span className="cp-go"><Ic n="arrow" s={17}/></span>
            </div>
          ))}
        </div>
        <div className="cp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> ניווט</span><span><kbd>Enter</kbd> פתיחה</span><span><kbd>Esc</kbd> סגירה</span></div>
      </div>
    </div>
  );
}

// ══════════ MOBILE TAB BAR ══════════
function BottomNav({isHome,onHome,onBrowse,onSearch,onCart,onMenu,cartCount,browseOpen}){
  const items = [
    ['home','בית',onHome,isHome&&!browseOpen],
    ['folder','מותגים',onBrowse,browseOpen],
    ['search','חיפוש',onSearch,false],
    ['cart','סל',onCart,false,cartCount],
    ['dots','עוד',onMenu,false],
  ];
  return(
    <nav className="bn" aria-label="ניווט ראשי">
      {items.map(([ic,l,fn,on,badge])=>(
        <button key={l} className={'bn-b'+(on?' on':'')} onClick={fn} aria-label={l}>
          <span className="bn-ic"><Ic n={ic} s={22}/>{badge>0&&<span className="bn-badge">{badge}</span>}</span>
          <span className="bn-l">{l}</span>
        </button>
      ))}
    </nav>
  );
}

// ══════════ 3D PARTS WALL — the card view of a parts list ══════════
function PartsWall({parts,cols,brand,selRows,toggleRow,isPnCol,copiedId,copyVal,onAddToCart,rowHi,editor}){
  const heCol = cols.find(c=>c.id==='nameHe') || cols.find(c=>!isPnCol(c));
  const enCol = cols.find(c=>c.id==='nameEn');
  const pnCols = cols.filter(isPnCol);
  const other = cols.filter(c=>c!==heCol&&c!==enCol&&!isPnCol(c));
  if(!parts.length) return <div className="pw-empty">אין חלקים תואמים לחיפוש</div>;
  return(
    <div className="pw" style={{'--bc':brand.color}}>
      {parts.map((p,i)=>{
        const sel = selRows.has(p.id);
        const he = heCol ? (p.values[heCol.id]||'').trim() : '';
        const en = enCol ? (p.values[enCol.id]||'').trim() : '';
        return(
          <div key={p.id} className={'pc3'+(sel?' sel':'')+(p.discontinued?' disc':'')+(p.pinned?' pin':'')+(rowHi(p)?' hi':'')}
            style={{'--i':i}} onClick={()=>toggleRow(p.id)}>
            <div className="pc3-top">
              <span className={'pc3-check'+(sel?' on':'')}>{sel&&<Ic n="check" s={14} sw={2.4}/>}</span>
              {p.pinned&&<span className="pc3-b pin"><Ic n="pin" s={12}/>נפוץ</span>}
              {p.discontinued&&<span className="pc3-b disc">הופסק</span>}
              {p.hidden&&<span className="pc3-b hid">מוסתר מלקוחות</span>}
            </div>
            <div className="pc3-he">{he||'—'}</div>
            {en&&<div className="pc3-en en">{en}</div>}
            <div className="pc3-nums">
              {pnCols.map(col=>{
                const v=(p.values[col.id]||'').trim(); if(!v) return null;
                const ck=p.id+'__'+col.id;
                return(
                  <div key={col.id} className="pc3-n">
                    <span className="pc3-nl">{col.name}</span>
                    <span className="pc3-nv">
                      <b className="num">{v}</b>
                      <button className={'pc3-cp tt'+(copiedId===ck?' ok':'')} data-tt="העתק"
                        onClick={e=>{e.stopPropagation();copyVal(v,ck);}} aria-label={'העתק '+col.name}>
                        <Ic n={copiedId===ck?'check':'copy'} s={15} sw={copiedId===ck?2:1.7}/>
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
            {other.some(c=>(p.values[c.id]||'').trim())&&(
              <div className="pc3-more">
                {other.map(c=>{const v=(p.values[c.id]||'').trim();return v?<span key={c.id}><i>{c.name}</i>{v}</span>:null;})}
              </div>
            )}
            <div className="pc3-act" onClick={e=>e.stopPropagation()}>
              <button className="pc3-btn tt" data-tt="הוסף את החלק לסל" onClick={()=>onAddToCart(p.id)}><Ic n="cart" s={16}/>הוסף לסל</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════ DRAWING VIEWER — zoom · pan · swipe · keyboard ══════════
function ImageViewer({imgs,idx,onIdx,onClose}){
  const [z,setZ] = useState(1);
  const [pos,setPos] = useState({x:0,y:0});
  const drag = useRef(null);
  const sw = useRef(null);
  const N = imgs.length;
  const go = d => { const n=idx+d; if(n>=0&&n<N){ onIdx(n); } };
  useEffect(()=>{ setZ(1); setPos({x:0,y:0}); },[idx]);
  useEffect(()=>{
    const h = e => {
      if(e.key==='Escape') onClose();
      else if(e.key==='ArrowLeft') go(1);      // RTL: left = next
      else if(e.key==='ArrowRight') go(-1);
      else if(e.key==='+'||e.key==='=') setZ(v=>Math.min(8,v*1.25));
      else if(e.key==='-') setZ(v=>Math.max(1,v/1.25));
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[idx,N]);
  useEffect(()=>{ if(z<=1) setPos({x:0,y:0}); },[z]);
  const onDown = e => {
    if(z>1){ drag.current={x:e.clientX-pos.x,y:e.clientY-pos.y}; }
    else { sw.current={x:e.clientX}; }
    e.currentTarget.setPointerCapture&&e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = e => { if(drag.current) setPos({x:e.clientX-drag.current.x,y:e.clientY-drag.current.y}); };
  const onUp = e => {
    if(sw.current){ const dx=e.clientX-sw.current.x; if(Math.abs(dx)>70) go(dx<0?1:-1); }
    drag.current=null; sw.current=null;
  };
  const onWheel = e => { setZ(v=>Math.max(1,Math.min(8,v*(e.deltaY<0?1.12:.89)))); };
  const img = imgs[idx];
  return(
    <div className="iv" onClick={onClose}>
      <div className="iv-top" onClick={e=>e.stopPropagation()}>
        <span className="iv-count">{idx+1} / {N}</span>
        <span className="iv-sp"/>
        <button className="iv-b tt tt-hdr" data-tt="הקטנה" onClick={()=>setZ(v=>Math.max(1,v/1.25))} aria-label="הקטנה"><Ic n="minuscirc" s={20}/></button>
        <span className="iv-z">{Math.round(z*100)}%</span>
        <button className="iv-b tt tt-hdr" data-tt="הגדלה" onClick={()=>setZ(v=>Math.min(8,v*1.25))} aria-label="הגדלה"><Ic n="pluscirc" s={20}/></button>
        <button className="iv-b tt tt-hdr" data-tt="איפוס תצוגה" onClick={()=>{setZ(1);setPos({x:0,y:0});}} aria-label="איפוס"><Ic n="history" s={20}/></button>
        <a className="iv-b tt tt-hdr" data-tt="פתח בלשונית חדשה" href={img} target="_blank" rel="noopener noreferrer" aria-label="פתח בלשונית חדשה"><Ic n="export" s={20}/></a>
        <button className="iv-b close tt tt-hdr tt-l" data-tt="סגור (Esc)" onClick={onClose} aria-label="סגור"><Ic n="close" s={20}/></button>
      </div>
      <div className="iv-stage" onClick={e=>e.stopPropagation()} onWheel={onWheel}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onDoubleClick={()=>{ if(z>1){setZ(1);} else setZ(2.5); }} style={{cursor:z>1?'grab':'default'}}>
        <img key={idx} className="iv-img" src={img} alt={'שרטוט '+(idx+1)} draggable="false"
          style={{transform:`translate(${pos.x}px,${pos.y}px) scale(${z})`}}/>
        {idx>0&&<button className="iv-nav prev" onClick={()=>go(-1)} aria-label="הקודם"><Ic n="back" s={26}/></button>}
        {idx<N-1&&<button className="iv-nav next" onClick={()=>go(1)} aria-label="הבא"><Ic n="back" s={26} style={{transform:'scaleX(-1)'}}/></button>}
      </div>
      {N>1&&(
        <div className="iv-thumbs" onClick={e=>e.stopPropagation()}>
          {imgs.map((s,i)=>(
            <button key={i} className={'iv-th'+(i===idx?' on':'')} onClick={()=>onIdx(i)} aria-label={'שרטוט '+(i+1)}><img src={s} alt="" draggable="false"/></button>
          ))}
        </div>
      )}
    </div>
  );
}
