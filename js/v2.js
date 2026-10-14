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

// ─── pointer-follow rotation (smooth, eased) ───
function usePointerFollow(ref, ry, rx, rest){
  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ty=rest.y, tx=rest.x, cy=ty, cx=tx, raf=0;
    const clamp = v => Math.max(-1, Math.min(1, v));
    const apply = () => { el.style.transform = `rotateY(${cy.toFixed(2)}deg) rotateX(${cx.toFixed(2)}deg)`; };
    const loop = () => {
      cy += (ty-cy)*.085; cx += (tx-cx)*.085; apply();
      raf = (Math.abs(ty-cy)>.02 || Math.abs(tx-cx)>.02) ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => { if(!raf) raf = requestAnimationFrame(loop); };
    const onMove = e => {
      const r = el.getBoundingClientRect();
      const nx = clamp((e.clientX-(r.left+r.width/2))/(window.innerWidth*.45));
      const ny = clamp((e.clientY-(r.top+r.height/2))/(window.innerHeight*.45));
      ty = rest.y + nx*ry; tx = rest.x - ny*rx; wake();
    };
    const onLeave = () => { ty=rest.y; tx=rest.x; wake(); };
    apply();
    if (reduce) return;
    window.addEventListener('pointermove', onMove, {passive:true});
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => { window.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('mouseleave', onLeave); if(raf) cancelAnimationFrame(raf); };
  }, []);
}

// ══════════ 3D HERO UNIT — a designed ceiling-type indoor unit (evaporator), TADIRAN VRF G ══════════
// Seen from below, like looking up at the ceiling. Follows the cursor; hover / tap to take it apart.
function HeroUnit3D(){
  const ref = useRef(null);
  const [open,setOpen] = useState(false);
  usePointerFollow(ref, 24, 14, {y:-18, x:16});
  const blades = [];
  for (let i=0;i<11;i++) blades.push(<path key={i} transform={`rotate(${(i*360/11).toFixed(1)})`} d="M0 -9 C 9 -14 16 -30 9 -46 C 4 -34 1 -22 -3 -9 Z"/>);
  const streaks = [];
  [['t',0,-1],['b',0,1],['l',-1,0],['r',1,0]].forEach(([side,dx,dy])=>{
    for (let k=0;k<3;k++) streaks.push(<i key={side+k} className={'hu-st '+side} style={{'--k':k,'--tx':(dx*48)+'px','--ty':(dy*48)+'px','--d':(k*.6+(dx?.25:0))+'s'}}/>);
  });
  return(
    <div className={'hu-wrap'+(open?' is-open':'')} aria-hidden="true"
      onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)} onClick={()=>setOpen(v=>!v)}>
      <div className="hu-glow"/>
      <div className="hu-float">
        <div className={'hu'+(open?' open':'')} ref={ref}>
          {/* back: casing with control box and drain pump */}
          <div className="hu-layer hu-body" style={{'--z0':'-12px','--z1':'-150px'}}>
            <i className="hu-pump"/><i className="hu-ctrl"/>
          </div>
          {/* heat-exchanger coil (copper fins) around the fan */}
          <div className="hu-layer hu-coil" style={{'--z0':'-6px','--z1':'-60px'}}/>
          {/* turbo fan */}
          <div className="hu-layer hu-fan" style={{'--z0':'0px','--z1':'32px'}}>
            <svg className="hu-blades" viewBox="-50 -50 100 100" width="164" height="164">{blades}<circle r="9" fill="#e7edf7"/><circle r="3.2" fill="#8795b0"/></svg>
          </div>
          {/* filter */}
          <div className="hu-layer hu-filter" style={{'--z0':'6px','--z1':'104px'}}/>
          {/* decorative panel: 4 outlets, inlet grille, brand */}
          <div className="hu-layer hu-panel" style={{'--z0':'12px','--z1':'176px'}}>
            <i className="hu-out o-t"/><i className="hu-out o-b"/><i className="hu-out o-l"/><i className="hu-out o-r"/>
            <i className="hu-grl"/>
            <i className="hu-led"/>
            <span className="hu-brand"><b>TADIRAN</b><u>VRF G</u></span>
          </div>
          {streaks}
        </div>
        <div className="hu-lab hu-lab1"><i/>מנוע מאוורר</div>
        <div className="hu-lab hu-lab2"><i/>לוח אלקטרוני</div>
        <div className="hu-lab hu-lab3"><i/>משאבת ניקוז</div>
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
