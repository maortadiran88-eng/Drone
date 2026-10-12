// ══════════ LOGIN ══════════
function LoginScreen({data,onLogin}){
  const[pwd,setPwd]=useState('');const[err,setErr]=useState('');const[exiting,setExiting]=useState(false);
  const submit=()=>{
    if(exiting)return;
    const users=data.users||DEFAULT_USERS;
    const match=users.find(u=>u.pass===pwd);
    if(match){
      // Fade/scale the login screen out first, then hand off — so the
      // transition into the home screen feels like one continuous screen
      // instead of an abrupt swap.
      setExiting(true);
      setTimeout(()=>onLogin(match.role,match.id,match.label), 480);
    }
    else setErr('סיסמה שגויה');
  };
  return(
    <div className="login-bg" style={{position:'fixed',inset:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',padding:20,direction:'rtl'}}>
      <AirParticles/>
      <div style={{position:'absolute',top:16,left:16,zIndex:3}}><MusicToggle/></div>
      <LoginPlayer/>
      <div style={{opacity:exiting?0:1,transform:exiting?'scale(1.04)':'scale(1)',transition:'opacity .45s ease, transform .45s ease',width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
        {/* Blurred color blobs behind the glass card */}
        <div aria-hidden className="login-blob-a" style={{position:'absolute',width:280,height:280,borderRadius:'50%',filter:'blur(70px)',opacity:.5,top:-70,right:-60}}/>
        <div aria-hidden className="login-blob-b" style={{position:'absolute',width:240,height:240,borderRadius:'50%',filter:'blur(70px)',opacity:.5,bottom:-50,left:-40}}/>
        <div aria-hidden className="login-blob-c" style={{position:'absolute',width:200,height:200,borderRadius:'50%',filter:'blur(70px)',opacity:.45,top:'42%',left:'28%'}}/>

        <div style={{position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'clamp(24px,7vw,110px)',width:'100%',maxWidth:1000}}><div style={{width:'100%',maxWidth:380,animation:'slideUp .4s var(--ease)'}}>
          <div className="glass" style={{borderRadius:'var(--radius-xl)',padding:'38px 30px 28px',textAlign:'center',boxShadow:'0 20px 50px var(--shadow2)'}}>
            <div style={{marginBottom:22}}>
              <div style={{fontWeight:900,fontSize:22,letterSpacing:2,color:'var(--text)'}}>TADI<span style={{color:'var(--primary)'}}>RAN</span></div>
              <div style={{fontSize:9.5,letterSpacing:3,color:'var(--sub)',marginTop:2,fontWeight:700}}>P A R T S &nbsp; C A T A L O G</div>
            </div>
            <div className="disp" style={{fontSize:26,color:'var(--text)',marginBottom:8,lineHeight:1.25,whiteSpace:'pre-line'}}>{data.welcomeTitle||'ברוך הבא לקטלוג חלקי חילוף'}</div>
            <div style={{fontSize:13.5,color:'var(--sub)',marginBottom:28}}>{data.welcomeSub||'תחת המותג תדיראן'}</div>

            <input type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="הזן סיסמת כניסה" autoFocus
              style={{width:'100%',padding:'13px 16px',borderRadius:12,border:`1.5px solid ${err?'var(--red)':'var(--border2)'}`,fontSize:15,textAlign:'center',marginBottom:err?8:16,outline:'none',boxSizing:'border-box',background:'var(--ibg)',color:'var(--inp)'}}/>
            {err&&<div style={{color:'var(--red)',fontSize:12.5,marginBottom:14,fontWeight:700}}>{err}</div>}
            <button onClick={submit} style={{width:'100%',padding:'13px',fontSize:15.5,marginBottom:22,borderRadius:12,border:'none',background:'var(--primary)',color:'var(--on-primary)',fontWeight:700,cursor:'pointer',boxShadow:'0 14px 28px -12px var(--cyan-glow)',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
              כניסה למערכת<Ic n="arrow" s={18} sw={1.9}/>
            </button>


          <div style={{background:'var(--orange-bg)',border:'1px solid var(--orange)',borderRadius:12,padding:'12px 14px',fontSize:12,color:'var(--orange)',textAlign:'right',lineHeight:1.7,fontWeight:500}}>
            <span style={{display:'flex',gap:10,alignItems:'flex-start'}}><span style={{marginTop:2}}><Ic n="warn" s={16}/></span><span>{data.disclaimer||'מערכת זו מיועדת לשימוש עובדי תדיראן בלבד.'}</span></span>
          </div>
        </div>
        <div style={{textAlign:'center',color:'var(--sub)',fontSize:11.5,marginTop:16,fontWeight:500}}>Tadiran VRF · Professional Spare Parts Catalog</div>
      </div><PhoneMock/></div>
      </div>
    </div>
  );
}



function TodoList({data,reports,techRequests,alerts}){
  const missingTadPn=[];
  data.brands.forEach(b=>b.categories.forEach(c=>c.models.forEach(m=>{
    const miss=m.parts.filter(p=>(p.values.nameHe||'').trim()&&!(p.values.tadPn||'').trim());
    if(miss.length)missingTadPn.push({b,c,m,count:miss.length});
  })));
  const openReports=reports.filter(r=>!r.resolved).length;
  const openTech=techRequests.filter(r=>!r.resolved).length;
  const modelsNoMakat=missingTadPn.reduce((s,x)=>s+x.count,0);
  const recentAlerts=alerts.slice(0,3);

  const items=[
    modelsNoMakat>0&&{icon:'⚠️',color:'#e65100',bg:'#fff3e0',text:`${modelsNoMakat} חלקים ב-${missingTadPn.length} דגמים חסרי מק"ט תדיראן`},
    openReports>0&&{icon:'🔴',color:'#c62828',bg:'#ffebee',text:`${openReports} דיווחי שגיאה ממתינים לטיפול`},
    openTech>0&&{icon:'💬',color:'#1565c0',bg:'#e3f2fd',text:`${openTech} בקשות טכנאים לדגמים חסרים`},
    modelsNoMakat===0&&openReports===0&&openTech===0&&{icon:'✅',color:'#2e7d32',bg:'#e8f5e9',text:'הכל מעודכן! אין משימות פתוחות.'},
  ].filter(Boolean);

  return(
    <div style={{background:'var(--card)',borderRadius:12,padding:'14px 16px',marginBottom:16,boxShadow:'0 1px 4px var(--shadow)'}}>
      <div style={{fontWeight:'bold',fontSize:14,color:'var(--text)',marginBottom:10}}>📋 לוח משימות</div>
      {items.map((item,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,background:item.bg,marginBottom:6,border:`1px solid ${item.color}22`}}>
          <span style={{fontSize:16,flexShrink:0}}>{item.icon}</span>
          <span style={{flex:1,fontSize:13,color:item.color,fontWeight:'500'}}>{item.text}</span>
        </div>
      ))}
      {recentAlerts.length>0&&(
        <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
          <div style={{fontSize:11,color:'var(--sub)',marginBottom:6,fontWeight:'bold'}}>פעולות אחרונות:</div>
          {recentAlerts.map((a,i)=>(
            <div key={i} style={{fontSize:11,color:'var(--sub)',padding:'3px 0',display:'flex',gap:8}}>
              <span style={{color:a.type==='delete'?'#e53935':'#2e7d32',fontWeight:'bold'}}>{a.type==='delete'?'🗑':'➕'}</span>
              <span>{a.text}</span>
              <span style={{marginRight:'auto',color:'var(--border)'}}>{a.ts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════ TECH REQUEST BOX ══════════
function TechRequestBox({loginRole}){
  const[text,setText]=useState('');const[name,setName]=useState('');const[sent,setSent]=useState(false);const[loading,setLoading]=useState(false);
  const send=async()=>{
    if(!text.trim()){alert('נא לרשום את שם הדגם החסר');return;}
    setLoading(true);
    try{await fbSaveTechRequest({text:text.trim(),submittedBy:name.trim()||'אנונימי',role:loginRole});setSent(true);setText('');setName('');setTimeout(()=>setSent(false),4000);}
    catch{alert('שגיאה בשליחה');}
    setLoading(false);
  };
  return(
    <div className="cta-block">
      <div className="cta-title"><Ic n="msg" s={24}/>חסר לך דגם במערכת?</div>
      <div className="cta-sub">רשום את שם הדגם החסר ונוסיף אותו בהקדם</div>
      {sent
        ?<div style={{textAlign:'center',color:'var(--green)',fontWeight:700,padding:'14px',background:'var(--green-bg)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><Ic n="checkc" s={19}/>הבקשה נשלחה! נטפל בהקדם.</div>
        :<>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="שמך (אופציונלי)" style={{...INS,marginBottom:8,fontSize:13,padding:'8px 12px'}}/>
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="לדוגמא: GREE GWH18ACC — יחידה פנימית..." rows={3}
            style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid var(--border)',fontSize:13,resize:'vertical',color:'var(--inp)',background:'var(--ibg)',boxSizing:'border-box',marginBottom:10}}/>
          <button onClick={send} disabled={loading} className="btn cta-btn">{loading?<><Ic n="hourglass" s={17}/>שולח...</>:<><Ic n="send" s={17}/>שלח בקשה</>}</button>
        </>
      }
    </div>
  );
}

// ══════════ TECH SITE LINK ══════════
function TechSiteLink(){
  return(
    <div style={{marginBottom:16}}>
      <button onClick={()=>{if(confirm('לעבור לאתר הטכנאים?\nhttps://maortadiran88-eng.github.io/GREE/'))window.open('https://maortadiran88-eng.github.io/GREE/','_blank');}}
        className="tech-link">
        <span className="tl-ic"><Ic n="wrench" s={19}/></span>
        <span style={{flex:1,textAlign:'right'}}>אתר הטכנאים</span>
        <span className="tl-go">לחץ לכניסה<Ic n="arrow" s={16}/></span>
      </button>
    </div>
  );
}

// ══════════ HOME SCREEN ══════════
function HomeScreen({data,onNav,recent,favorites,onToggleFav,loginRole,reports,techRequests,alerts,onOpenSidebar,query,setQuery,onOpenBrand,results,canSeeHidden}){
  const visBrands=data.brands.filter(b=>canSeeHidden||!b.hidden);
  const total=visBrands.reduce((s,b)=>s+b.categories.reduce((ss,c)=>ss+c.models.filter(m=>canSeeHidden||!m.hidden).length,0),0);
  const totalParts=visBrands.reduce((s,b)=>s+b.categories.reduce((ss,c)=>ss+c.models.filter(m=>canSeeHidden||!m.hidden).reduce((sss,m)=>sss+m.parts.length,0),0),0);
  const greeting=getGreeting(data.greetings);

  const fmtTime=ts=>{const diff=Math.floor((Date.now()-ts)/60000);if(diff<1)return'עכשיו';if(diff<60)return`לפני ${diff} דק'`;if(diff<1440)return`לפני ${Math.floor(diff/60)} שע'`;return new Date(ts).toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit'});};
  const recentModels=recent.slice(0,6).map(rv=>{const b=data.brands.find(x=>x.id===rv.bid);const c=b?.categories.find(x=>x.id===rv.cid);const m=c?.models.find(x=>x.id===rv.mid);if(!b||!c||!m)return null;if(!canSeeHidden&&(b.hidden||m.hidden))return null;return{b,c,m,ts:rv.ts};}).filter(Boolean);
  const favModels=[];data.brands.forEach(b=>b.categories.forEach(c=>c.models.forEach(m=>{if(favorites.has(m.id)&&(canSeeHidden||(!b.hidden&&!m.hidden)))favModels.push({b,c,m});})));

  const brandStats=b=>{
    let models=0,parts=0;
    b.categories.forEach(c=>{const ms=c.models.filter(m=>canSeeHidden||!m.hidden);models+=ms.length;ms.forEach(m=>parts+=m.parts.length);});
    return{models,parts};
  };

  return(
    <div className="tc-container" style={{paddingBottom:44}}>

      {/* ── HERO ── */}
      <div style={{position:'relative',textAlign:'center',padding:'34px 12px 30px'}}>
        <div style={{position:'relative',zIndex:1}}>
          {greeting&&<div className="hero-greet rise-in" style={{'--d':0}}>{greeting}</div>}
          <div className="hero-title rise-in" style={{marginBottom:10,'--d':1}}>קטלוג חלקי חילוף VRF</div>
          <div className="tc-body rise-in" style={{marginBottom:26,color:'var(--sub)',fontSize:16,'--d':2}}>חיפוש חלקי חילוף לפי מק"ט, דגם או שם חלק</div>

          <div className="hero-search-wrap rise-in" style={{'--d':3}}>
            <span className="hs-ic"><Ic n="search" s={21}/></span>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="חיפוש לפי מק&quot;ט, דגם או שם חלק..."
              className="hero-search"/>
            {query&&<button onClick={()=>setQuery('')} style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--sub)',fontSize:18}}>✕</button>}
            {query&&<SearchResultsPanel results={results} query={query} onClose={()=>setQuery('')} onSelect={r=>onNav(r.b.id,r.c.id,r.m.id,query)}/>}
          </div>

        </div>
      </div>

      {/* ── BRAND BENTO GRID ── */}
      <Reveal style={{marginBottom:30}}>
        <div className="tc-sub-title" style={{textAlign:'center',marginBottom:14}}>או בחר מותג</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,maxWidth:760,margin:'0 auto'}}>
          {visBrands.map((b,bi)=>{
            const st=brandStats(b);
            return(
              <TiltCard key={b.id} className="brand-tile" onClick={()=>(onOpenBrand?onOpenBrand(b.id):onOpenSidebar())}
                style={{gridColumn:bi===0&&visBrands.length>1?'span 2':undefined,padding:'26px 18px',display:'flex',flexDirection:'column',alignItems:'center',gap:10,textAlign:'center'}}>
                <div style={{position:'relative',zIndex:2,width:56,height:56,borderRadius:17,background:b.light||(b.color+'18'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:21,fontWeight:700,color:b.color,letterSpacing:.5}}>
                  {b.name.slice(0,2)}
                </div>
                <div style={{position:'relative',zIndex:2,fontSize:21,color:'var(--text)',fontFamily:'var(--disp)'}}>{b.name}</div>
                <div className="tc-meta" style={{position:'relative',zIndex:2}}>{st.models} דגמים · {st.parts.toLocaleString()} חלקים</div>
              </TiltCard>
            );
          })}
        </div>
      </Reveal>

      {/* Favorites */}
      {favModels.length>0&&(
        <Reveal style={{marginBottom:22}}>
          <div className="tc-sub-title" style={{marginBottom:10}}>מועדפים</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
            {favModels.map(({b,c,m})=>(
              <div key={m.id} className="mini-card">
                <button onClick={e=>{e.stopPropagation();onToggleFav(m.id);}} style={{position:'absolute',top:8,left:10,background:'none',border:'none',fontSize:14,cursor:'pointer',display:'flex'}}><Ic n="star" s={16} fill="#f5b301" style={{color:'#f5b301'}}/></button>
                <div onClick={()=>onNav(b.id,c.id,m.id)}>
                  <div className="mini-name" style={{paddingLeft:18}}>{m.name}</div>
                  <div className="tc-meta" style={{marginBottom:4}}><i className="bdot" style={{background:b.color}}/>{b.name} · {c.name}</div>
                  <div style={{fontSize:11.5,color:b.color,fontWeight:700}}>{m.parts.length} חלקים</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Recently viewed */}
      {recentModels.length>0&&(
        <Reveal style={{marginBottom:22}}>
          <div className="tc-sub-title" style={{marginBottom:10}}>נצפו לאחרונה</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
            {recentModels.map(({b,c,m,ts})=>(
              <div key={m.id} onClick={()=>onNav(b.id,c.id,m.id)} className="mini-card">
                <div className="tc-meta" style={{marginBottom:4}}>{fmtTime(ts)}</div>
                <div className="mini-name">{m.name}</div>
                <div className="tc-meta" style={{marginBottom:4}}><i className="bdot" style={{background:b.color}}/>{b.name} · {c.name}</div>
                <div style={{fontSize:11.5,color:b.color,fontWeight:700}}>{m.parts.length} חלקים</div>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Quick stats strip */}
      <Reveal className="stat-strip">
        {[['דגמים',total],['חלקים',totalParts.toLocaleString()],['מותגים',data.brands.length]].map(([lb,v])=>(
          <div key={lb} className="stat-item"><span className="stat-n">{v}</span><span>{lb}</span></div>
        ))}
      </Reveal>
      <div style={{height:30}}/>

      <TechRequestBox loginRole={loginRole}/>
      <TechSiteLink/>
    </div>
  );
}

// ══════════ SIDEBAR BRAND ══════════
function SidebarBrand({openReq,brand,sel,editor,admin,canSeeHidden,favorites,onToggleFav,onNav,onAddModel,onDelModel,onAddCat,onEditCat,onDelCat,onAddSubCat,onEditSubCat,onDelSubCat,sidebarFilter,compareList,onToggleCompare}){
  const[open,setOpen]=useState(false);const[openCats,setOpenCats]=useState({});const[openSubs,setOpenSubs]=useState({});
  const[addingMod,setAddingMod]=useState(null);const[newModName,setNewModName]=useState('');
  const[editCat,setEditCat]=useState(null);const[addingCat,setAddingCat]=useState(false);const[newCatName,setNewCatName]=useState('');
  const[addingSub,setAddingSub]=useState(null);const[newSubName,setNewSubName]=useState('');const[editSub,setEditSub]=useState(null);
  const modRef=useRef();const wrapRef=useRef(null);
  // picking a brand tile on the home screen opens that brand here (and folds the others)
  useEffect(()=>{
    if(!openReq)return;
    const mine=openReq.id===brand.id;
    setOpen(mine);
    if(mine)setTimeout(()=>{if(wrapRef.current)wrapRef.current.scrollIntoView({behavior:'smooth',block:'nearest'});},340);
  },[openReq]);

  useEffect(()=>{if(sel?.bid===brand.id){setOpen(true);setOpenCats(p=>({...p,[sel.cid]:true}));if(sel.scid)setOpenSubs(p=>({...p,[sel.scid]:true}));}},[sel?.bid,sel?.cid,sel?.scid]);
  useEffect(()=>{
    if(!sidebarFilter)return;
    const q=sidebarFilter.toLowerCase();
    const mm=m=>m.name.toLowerCase().includes(q)||(m.synonyms||[]).some(s=>s.toLowerCase().includes(q));
    const has=brand.categories.some(c=>c.models.some(mm)||(c.subCategories||[]).some(sc=>sc.models.some(mm)));
    if(has){
      setOpen(true);
      brand.categories.forEach(c=>{
        if(c.models.some(mm)||(c.subCategories||[]).some(sc=>sc.models.some(mm))){
          setOpenCats(p=>({...p,[c.id]:true}));
          (c.subCategories||[]).forEach(sc=>{if(sc.models.some(mm))setOpenSubs(p=>({...p,[sc.id]:true}));});
        }
      });
    }
  },[sidebarFilter]);

  const toggleCat=id=>setOpenCats(p=>({...p,[id]:!p[id]}));
  const toggleSub=id=>setOpenSubs(p=>({...p,[id]:!p[id]}));
  const allModelNames=brand.categories.flatMap(c=>[...c.models.map(m=>m.name),...(c.subCategories||[]).flatMap(sc=>sc.models.map(m=>m.name))]);
  const isDuplicate=allModelNames.some(n=>n.toLowerCase()===newModName.trim().toLowerCase());
  const suggestions=newModName.trim().length>=1?allModelNames.filter(n=>n.toLowerCase().includes(newModName.toLowerCase())&&n.toLowerCase()!==newModName.toLowerCase()):[];
  const doAddMod=(cid,scid)=>{const n=newModName.trim();if(!n)return;onAddModel(cid,n,scid);setNewModName('');setAddingMod(null);};
  const startAdd=(cid,scid)=>{setAddingMod(scid?cid+'__'+scid:cid);setNewModName('');setTimeout(()=>modRef.current?.focus(),50);};

  const renderAddBox=(cid,scid)=>{
    const key=scid?cid+'__'+scid:cid;
    if(addingMod!==key)return null;
    return(
      <div style={{padding:'6px 10px',background:'var(--row2)',display:'flex',flexDirection:'column',gap:4,borderBottom:'1px solid var(--border)'}}>
        <div style={{display:'flex',gap:6}}>
          <input ref={modRef} value={newModName} onChange={e=>setNewModName(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!isDuplicate)doAddMod(cid,scid);if(e.key==='Escape'){setAddingMod(null);setNewModName('');}}}
            placeholder="שם הדגם..."
            style={{flex:1,border:`1px solid ${isDuplicate?'#e53935':'var(--border)'}`,borderRadius:4,padding:'5px 8px',fontSize:12,color:'var(--inp)',background:'var(--ibg)'}}/>
          <button onClick={()=>{if(!isDuplicate)doAddMod(cid,scid);}} disabled={isDuplicate}
            style={{background:isDuplicate?'#aaa':brand.color,color:'#fff',border:'none',borderRadius:4,padding:'5px 10px',cursor:isDuplicate?'not-allowed':'pointer',fontSize:12}}>הוסף</button>
          <button onClick={()=>{setAddingMod(null);setNewModName('');}} style={{background:'var(--border)',border:'none',borderRadius:4,padding:'5px 8px',cursor:'pointer',fontSize:12,color:'var(--text)'}}>✕</button>
        </div>
        {isDuplicate&&<div style={{fontSize:11,color:'#e53935',fontWeight:'bold'}}>⚠️ דגם בשם זה כבר קיים!</div>}
        {suggestions.length>0&&!isDuplicate&&(
          <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:6,overflow:'hidden',maxHeight:120,overflowY:'auto'}}>
            {suggestions.slice(0,5).map(s=>(
              <div key={s} onClick={()=>setNewModName(s)} style={{padding:'5px 10px',cursor:'pointer',fontSize:12,color:'var(--text)',borderBottom:'1px solid var(--border)'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--row2)'} onMouseLeave={e=>e.currentTarget.style.background=''}>🔍 {s}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderModelRow=(m,cid,scid)=>{
    const inCompare=compareList&&compareList.some(x=>x.mid===m.id);
    return(
      <div key={m.id} className="sb-model" style={{display:'flex',alignItems:'center',borderBottom:'1px solid var(--border)'}}>
        <div className={'sb-model-name'+(sel?.mid===m.id?' on':'')} onClick={()=>onNav(brand.id,cid,m.id,scid)}
          style={{flex:1,padding:'8px 10px 8px 26px',cursor:'pointer',fontSize:13,color:sel?.mid===m.id?brand.color:'var(--text)',fontWeight:sel?.mid===m.id?'bold':'normal',background:sel?.mid===m.id?brand.light+'88':'transparent',borderRight:sel?.mid===m.id?`3px solid ${brand.color}`:'3px solid transparent',opacity:m.hidden?0.6:1}}>
          {m.hidden && <span title="מוסתר מצופים" style={{fontSize:11,marginLeft:4}}>🙈</span>}
          {m.name}
          {m.synonyms?.length>0&&<div style={{fontSize:10,color:'var(--sub)',marginTop:2}}>{m.synonyms.join(' | ')}</div>}
          {sidebarFilter&&(m.synonyms||[]).some(s=>s.toLowerCase().includes(sidebarFilter.toLowerCase()))&&!(m.name.toLowerCase().includes(sidebarFilter.toLowerCase()))&&(
            <div style={{fontSize:10,color:'#7b1fa2',marginTop:2,fontWeight:'bold'}}>≡ {(m.synonyms||[]).filter(s=>s.toLowerCase().includes(sidebarFilter.toLowerCase())).join(', ')}</div>
          )}
        </div>
        {onToggleCompare&&(
          <button onClick={()=>onToggleCompare(brand.id,cid,m.id)} title={inCompare?'הסר מהשוואה':'הוסף להשוואה'}
            style={{background:'none',border:'none',fontSize:14,cursor:'pointer',padding:'0 3px',color:inCompare?'var(--orange)':'var(--sub)',display:'flex'}}>
            <Ic n={inCompare?'minuscirc':'pluscirc'} s={17}/>
          </button>
        )}
        <button onClick={()=>onToggleFav(m.id)} style={{background:'none',border:'none',cursor:'pointer',padding:'0 5px',display:'flex'}}><Ic n="star" s={16} fill={favorites.has(m.id)?'#f5b301':'none'} style={{color:favorites.has(m.id)?'#f5b301':'var(--sub)'}}/></button>
        {admin&&<button onClick={()=>onDelModel(cid,m.id,scid)} style={{background:'none',border:'none',color:'#e53935',cursor:'pointer',fontSize:13,padding:'0 8px'}}>🗑</button>}
      </div>
    );
  };

  return(
    <div className="sb-brand" ref={wrapRef} style={{borderBottom:'1px solid var(--border)'}}>
      <div className="sb-head" onClick={()=>setOpen(v=>!v)} style={{padding:'11px 14px',background:brand.color,color:'#fff',display:'flex',alignItems:'center',cursor:'pointer',userSelect:'none',gap:6}}>
        <span style={{flex:1,fontWeight:'bold',fontSize:14}}>{brand.name}</span>
        {brand.hidden && <span title="מותג מוסתר מצופים" style={{fontSize:11,opacity:.9}}>🙈</span>}
        <span style={{display:'flex',opacity:.85}}><Ic n={open?'chevu':'chevd'} s={16}/></span>
      </div>
      {open&&<div className="sb-body">
        {brand.categories.map(c=>{
          const q=sidebarFilter?sidebarFilter.toLowerCase():'';
          const mm=m=>!q||m.name.toLowerCase().includes(q)||(m.synonyms||[]).some(s=>s.toLowerCase().includes(q));
          const visibleModels=(sidebarFilter?c.models.filter(mm):c.models).filter(m=>canSeeHidden||!m.hidden);
          const subCats=c.subCategories||[];
          const visibleSubs=sidebarFilter?subCats.filter(sc=>sc.models.some(mm)):subCats;
          if(sidebarFilter&&!visibleModels.length&&!visibleSubs.length)return null;
          return(
            <div key={c.id}>
              <div className="sb-cat" style={{display:'flex',alignItems:'center',background:'rgba(127,140,165,.14)',borderBottom:'1px solid var(--border)',minHeight:38}}>
                {editCat?.id===c.id&&admin
                  ?<div style={{flex:1,display:'flex',gap:4,padding:'4px 8px'}}>
                     <input value={editCat.name} autoFocus onChange={e=>setEditCat({id:c.id,name:e.target.value})}
                       onKeyDown={e=>{if(e.key==='Enter'){onEditCat(c.id,editCat.name);setEditCat(null);}if(e.key==='Escape')setEditCat(null);}}
                       style={{flex:1,border:'1px solid var(--border)',borderRadius:4,padding:'3px 6px',fontSize:12,color:'var(--inp)',background:'var(--ibg)'}}/>
                     <button onClick={()=>{onEditCat(c.id,editCat.name);setEditCat(null);}} style={{background:brand.color,color:'#fff',border:'none',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:11}}>✓</button>
                     <button onClick={()=>setEditCat(null)} style={{background:'var(--border)',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontSize:11,color:'var(--text)'}}>✕</button>
                   </div>
                  :<div onClick={()=>toggleCat(c.id)} style={{flex:1,padding:'8px 14px 8px 20px',cursor:'pointer',color:'var(--sub)',fontSize:13,userSelect:'none',display:'flex',alignItems:'center'}}>
                     <span style={{flex:1,fontWeight:600,color:'var(--text)'}}>{c.name}</span><span style={{display:'flex'}}><Ic n={openCats[c.id]?'chevu':'chevd'} s={15}/></span>
                   </div>
                }
                {admin&&editCat?.id!==c.id&&(
                  <div style={{display:'flex',flexShrink:0,paddingLeft:4}}>
                    <button onClick={e=>{e.stopPropagation();startAdd(c.id,null);}} title="הוסף דגם" style={{background:'none',border:'none',color:brand.color,cursor:'pointer',fontSize:20,fontWeight:'bold',padding:'2px 6px',lineHeight:1}}>+</button>
                    <button onClick={e=>{e.stopPropagation();setAddingSub(c.id);setNewSubName('');}} title="הוסף תת-קטגוריה" style={{background:'none',border:'none',color:'#7b1fa2',cursor:'pointer',fontSize:14,padding:'2px 4px'}}>📂</button>
                    <button onClick={e=>{e.stopPropagation();setEditCat({id:c.id,name:c.name});}} style={{background:'none',border:'none',color:'var(--sub)',cursor:'pointer',fontSize:13,padding:'2px 4px'}}>✏</button>
                    <button onClick={e=>{e.stopPropagation();onDelCat(c.id);}} style={{background:'none',border:'none',color:'#e53935',cursor:'pointer',fontSize:13,padding:'2px 5px'}}>🗑</button>
                  </div>
                )}
                {editor&&!admin&&editCat?.id!==c.id&&(
                  <button onClick={e=>{e.stopPropagation();startAdd(c.id,null);}} style={{background:'none',border:'none',color:brand.color,cursor:'pointer',fontSize:20,fontWeight:'bold',padding:'2px 8px',lineHeight:1}}>+</button>
                )}
              </div>
              {admin&&addingSub===c.id&&(
                <div style={{padding:'6px 10px',background:'#f3e5f5',display:'flex',gap:6,borderBottom:'1px solid var(--border)'}}>
                  <input value={newSubName} autoFocus onChange={e=>setNewSubName(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&newSubName.trim()){onAddSubCat(c.id,newSubName.trim());setNewSubName('');setAddingSub(null);}if(e.key==='Escape')setAddingSub(null);}}
                    placeholder="שם תת-קטגוריה..."
                    style={{flex:1,border:'1px solid #ce93d8',borderRadius:4,padding:'5px 8px',fontSize:12,color:'var(--inp)',background:'var(--ibg)'}}/>
                  <button onClick={()=>{if(newSubName.trim()){onAddSubCat(c.id,newSubName.trim());setNewSubName('');setAddingSub(null);}}} style={{background:'#7b1fa2',color:'#fff',border:'none',borderRadius:4,padding:'5px 10px',cursor:'pointer',fontSize:12}}>הוסף</button>
                  <button onClick={()=>setAddingSub(null)} style={{background:'var(--border)',border:'none',borderRadius:4,padding:'5px 8px',cursor:'pointer',fontSize:12,color:'var(--text)'}}>✕</button>
                </div>
              )}
              {(openCats[c.id]||sidebarFilter)&&<>
                {renderAddBox(c.id,null)}
                {visibleModels.map(m=>renderModelRow(m,c.id,null))}
                {!visibleModels.length&&!sidebarFilter&&!subCats.length&&<div style={{padding:'7px 26px',color:'var(--sub)',fontSize:12}}>אין דגמים</div>}
                {(sidebarFilter?visibleSubs:subCats).map(sc=>{
                  const scModels=(sidebarFilter?sc.models.filter(mm):sc.models).filter(m=>canSeeHidden||!m.hidden);
                  if(sidebarFilter&&!scModels.length)return null;
                  return(
                    <div key={sc.id}>
                      <div style={{display:'flex',alignItems:'center',background:'#f3e5f511',borderBottom:'1px solid var(--border)',minHeight:32,paddingRight:12}}>
                        {editSub?.id===sc.id&&admin
                          ?<div style={{flex:1,display:'flex',gap:4,padding:'4px 8px'}}>
                             <input value={editSub.name} autoFocus onChange={e=>setEditSub({id:sc.id,name:e.target.value})}
                               onKeyDown={e=>{if(e.key==='Enter'){onEditSubCat(c.id,sc.id,editSub.name);setEditSub(null);}if(e.key==='Escape')setEditSub(null);}}
                               style={{flex:1,border:'1px solid #ce93d8',borderRadius:4,padding:'3px 6px',fontSize:11,color:'var(--inp)',background:'var(--ibg)'}}/>
                             <button onClick={()=>{onEditSubCat(c.id,sc.id,editSub.name);setEditSub(null);}} style={{background:'#7b1fa2',color:'#fff',border:'none',borderRadius:4,padding:'2px 8px',cursor:'pointer',fontSize:11}}>✓</button>
                             <button onClick={()=>setEditSub(null)} style={{background:'var(--border)',border:'none',borderRadius:4,padding:'2px 6px',cursor:'pointer',fontSize:11,color:'var(--text)'}}>✕</button>
                           </div>
                          :<div onClick={()=>toggleSub(sc.id)} style={{flex:1,padding:'6px 8px 6px 20px',cursor:'pointer',color:'#7b1fa2',fontSize:12,userSelect:'none',display:'flex',alignItems:'center',gap:4}}>
                             <span>📂</span><span style={{flex:1,fontWeight:'600'}}>{sc.name}</span><span style={{fontSize:10}}>{openSubs[sc.id]?'▲':'▼'}</span>
                           </div>
                        }
                        {admin&&editSub?.id!==sc.id&&(
                          <div style={{display:'flex',flexShrink:0,paddingLeft:4}}>
                            <button onClick={e=>{e.stopPropagation();startAdd(c.id,sc.id);}} style={{background:'none',border:'none',color:brand.color,cursor:'pointer',fontSize:18,fontWeight:'bold',padding:'2px 5px',lineHeight:1}}>+</button>
                            <button onClick={e=>{e.stopPropagation();setEditSub({id:sc.id,name:sc.name});}} style={{background:'none',border:'none',color:'var(--sub)',cursor:'pointer',fontSize:12,padding:'2px 4px'}}>✏</button>
                            <button onClick={e=>{e.stopPropagation();onDelSubCat(c.id,sc.id);}} style={{background:'none',border:'none',color:'#e53935',cursor:'pointer',fontSize:12,padding:'2px 5px'}}>🗑</button>
                          </div>
                        )}
                        {editor&&!admin&&editSub?.id!==sc.id&&(
                          <button onClick={e=>{e.stopPropagation();startAdd(c.id,sc.id);}} style={{background:'none',border:'none',color:brand.color,cursor:'pointer',fontSize:18,fontWeight:'bold',padding:'2px 8px',lineHeight:1}}>+</button>
                        )}
                      </div>
                      {(openSubs[sc.id]||sidebarFilter)&&<>
                        {renderAddBox(c.id,sc.id)}
                        {scModels.map(m=>renderModelRow(m,c.id,sc.id))}
                        {!scModels.length&&!sidebarFilter&&<div style={{padding:'7px 36px',color:'var(--sub)',fontSize:11}}>אין דגמים</div>}
                      </>}
                    </div>
                  );
                })}
              </>}
            </div>
          );
        })}
        {admin&&(addingCat
          ?<div style={{padding:'6px 10px',background:'var(--row2)',display:'flex',gap:6}}>
             <input value={newCatName} autoFocus onChange={e=>setNewCatName(e.target.value)}
               onKeyDown={e=>{if(e.key==='Enter'&&newCatName.trim()){onAddCat(newCatName.trim());setNewCatName('');setAddingCat(false);}if(e.key==='Escape')setAddingCat(false);}}
               placeholder="שם קטגוריה..." style={{flex:1,border:'1px solid var(--border)',borderRadius:4,padding:'5px 8px',fontSize:12,color:'var(--inp)',background:'var(--ibg)'}}/>
             <button onClick={()=>{if(newCatName.trim()){onAddCat(newCatName.trim());setNewCatName('');setAddingCat(false);}}} style={{background:brand.color,color:'#fff',border:'none',borderRadius:4,padding:'5px 10px',cursor:'pointer',fontSize:12}}>הוסף</button>
             <button onClick={()=>setAddingCat(false)} style={{background:'var(--border)',border:'none',borderRadius:4,padding:'5px 8px',cursor:'pointer',fontSize:12,color:'var(--text)'}}>✕</button>
           </div>
          :<button onClick={()=>setAddingCat(true)} style={{width:'100%',padding:'8px',background:'none',border:'none',borderTop:'1px dashed var(--border)',color:brand.color,cursor:'pointer',fontSize:12,fontWeight:'bold'}}>+ הוסף קטגוריה</button>
        )}
      </div>}
    </div>
  );
}


// ══════════ CART PANEL ══════════
function CartPanel({cart,data,onRemove,onClear,onClose,waDefaults}){
  const[colSel,setColSel]=useState(new Set(waDefaults));
  const allCols=useMemo(()=>{const s=new Set();cart.forEach(i=>i.columns.forEach(c=>s.add(JSON.stringify({id:c.id,name:c.name}))));return[...s].map(x=>JSON.parse(x));},[cart]);
  const exportCartPDF=()=>{const w=window.open('','_blank');const rows=cart.map(i=>`<tr><td style="background:#f5f5f5;font-weight:bold">${i.modelName}<br><small>${i.brandName}·${i.catName}</small></td>${i.columns.map(c=>`<td>${i.values[c.id]||''}</td>`).join('')}</tr>`).join('');w.document.write(`<html dir="rtl"><head><meta charset="UTF-8"><title>סל חלקים</title><style>body{font-family:Arial;padding:20px;direction:rtl}table{border-collapse:collapse;width:100%}th{background:#1565c0;color:#fff;padding:8px 10px;text-align:right}td{border:1px solid #ddd;padding:6px 10px;font-size:13px}</style></head><body><h2 style="color:#1565c0">🛒 סל חלקים — ${new Date().toLocaleDateString('he-IL')}</h2><p>${cart.length} פריטים</p><table><thead><tr><th>דגם</th>${cart[0]?.columns.map(c=>`<th>${c.name}</th>`).join('')||''}</tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();};
  const sendCartWA=()=>{const activeCols=allCols.filter(c=>colSel.has(c.id));const hdr=`🛒 *סל חלקים*\n${new Date().toLocaleDateString('he-IL')}\n${'─'.repeat(28)}`;const lines=cart.map((item,i)=>{const vals=activeCols.map(c=>{const v=(item.values[c.id]||'').trim();return v?`${c.name}: ${v}`:'';}).filter(Boolean);return`*${i+1}.* [${item.modelName}] ${vals.join(' | ')}`;}).join('\n');window.open('https://wa.me/?text='+encodeURIComponent(`${hdr}\n\n${lines}\n\n_סה"כ ${cart.length} פריטים_`),'_blank');};
  return(
    <Modal onClose={onClose} wide title="🛒 סל חלקים">
      {!cart.length?<div style={{textAlign:'center',padding:40,color:'var(--sub)'}}>הסל ריק</div>
        :<>
          <div style={{maxHeight:'40vh',overflowY:'auto',marginBottom:14}}>
            {cart.map(item=>(
              <div key={item.id} style={{display:'flex',gap:10,padding:'10px 12px',borderRadius:8,background:'var(--row2)',marginBottom:6,alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                    <span style={{background:item.brandColor,color:'#fff',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:'bold'}}>{item.brandName}</span>
                    <span style={{fontWeight:'bold',fontSize:13,color:'var(--text)'}}>{item.modelName}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--sub)'}}>{item.columns.filter(c=>item.values[c.id]?.trim()).map(c=>`${c.name}: ${item.values[c.id]}`).join(' · ')}</div>
                </div>
                <button onClick={()=>onRemove(item.id)} style={{background:'none',border:'none',color:'#e53935',cursor:'pointer',fontSize:16,flexShrink:0}}>🗑</button>
              </div>
            ))}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontWeight:'bold',fontSize:12,color:'var(--sub)',marginBottom:8}}>עמודות לשליחה בווצאפ:</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {allCols.map(c=>{const on=colSel.has(c.id);return(
                <div key={c.id} onClick={()=>setColSel(p=>{const n=new Set(p);on?n.delete(c.id):n.add(c.id);return n;})}
                  style={{padding:'5px 10px',borderRadius:6,border:`2px solid ${on?'#1565c0':'var(--border)'}`,background:on?'#e3f2fd':'var(--ibg)',cursor:'pointer',fontSize:12,color:'var(--text)',userSelect:'none'}}>
                  {on?'✓ ':''}{c.name}
                </div>
              );})}
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={exportCartPDF} style={{flex:1,...BPr('#546e7a')}}>🖨️ PDF</button>
            <button onClick={sendCartWA} style={{flex:1,...BPr('#25D366')}}>📱 ווצאפ</button>
            <button onClick={onClear} style={{...sB('#e53935'),padding:'10px 14px'}}>נקה</button>
          </div>
        </>
      }
    </Modal>
  );
}

// ══════════ NOTIFICATIONS PANEL ══════════
function NotificationsPanel({missingAlerts,reports,techRequests,alerts,data,onNav,onResolve,onResolveTech,onClose,initialTab,
  onResolveAllReports,onResolveAllTech,onClearAlerts}){
  // Duplicate model names detection
  const duplicateNames=useMemo(()=>{
    if(!data)return[];
    const nameMap={};
    data.brands.forEach(b=>b.categories.forEach(c=>c.models.forEach(m=>{
      const key=m.name.trim().toLowerCase();
      if(!nameMap[key])nameMap[key]=[];
      nameMap[key].push({b,c,m});
    })));
    return Object.values(nameMap).filter(arr=>arr.length>1);
  },[data]);
  const[dismissed,setDismissed]=useState(()=>{
    try{return new Set(JSON.parse(localStorage.getItem('ac_dismissed_missing')||'[]'));}catch{return new Set();}
  });
  const dismissAlert=key=>{setDismissed(p=>{const n=new Set(p);n.add(key);try{localStorage.setItem('ac_dismissed_missing',JSON.stringify([...n]));}catch{}return n;});};
  const restoreAll=()=>{setDismissed(new Set());try{localStorage.removeItem('ac_dismissed_missing');}catch{}};

  const activeMissing=missingAlerts.filter(a=>{const key=`${a.m.id}__${a.p.id}`;return!dismissed.has(key);});
  const dismissedCount=missingAlerts.length-activeMissing.length;
  const unresolved=reports.filter(r=>!r.resolved);
  const unresolvedTech=techRequests.filter(r=>!r.resolved);

  const[tab,setTab]=useState(initialTab||'missing');
  const tabs=[
    ['missing',`⚠️ שדות חסרים (${activeMissing.length}${dismissedCount>0?` / ${missingAlerts.length}` :''})`],
    ['reports',`🔴 שגיאות (${unresolved.length})`],
    ['tech',`💬 בקשות (${unresolvedTech.length})`],
    ['activity',`📋 פעולות (${alerts.length})`],
    ...(duplicateNames.length?[['dupes',`🔁 כפולים (${duplicateNames.length})`]]:[]),
  ];

  const resetCurrentTab=async()=>{
    if(tab==='reports'){if(!confirm('לסמן כל הדיווחים כטופלו?'))return;await onResolveAllReports();alert('✅ כל הדיווחים סומנו כטופלו');}
    else if(tab==='tech'){if(!confirm('לסמן כל הבקשות כטופלו?'))return;await onResolveAllTech();alert('✅ כל הבקשות סומנו כטופלו');}
    else if(tab==='activity'){if(!confirm('למחוק את כל הפעולות?'))return;await onClearAlerts();alert('✅ הפעולות נמחקו');}
    else if(tab==='missing'){if(!confirm('לסמן את כל שדות חסרים כטופלו?'))return;missingAlerts.forEach(a=>dismissAlert(`${a.m.id}__${a.p.id}`));alert('✅ כל השדות סומנו כטופלו');}
  };

  return(
    <Modal onClose={onClose} wide title="🔔 התראות ומשימות">
      <div style={{display:'flex',gap:4,marginBottom:10,flexWrap:'wrap'}}>
        {tabs.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:'7px',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold',fontSize:11,background:tab===k?'#1565c0':'var(--row2)',color:tab===k?'#fff':'var(--text)',minWidth:70}}>{l}</button>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
        <button onClick={resetCurrentTab} style={sB('#e53935')}>🔄 איפוס טאב זה</button>
      </div>

      {tab==='missing'&&(
        <div style={{maxHeight:'55vh',overflowY:'auto'}}>
          {dismissedCount>0&&(
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,padding:'8px 12px',background:'#e8f5e9',borderRadius:8,border:'1px solid #c8e6c9'}}>
              <span style={{fontSize:12,color:'#2e7d32',flex:1}}>✅ {dismissedCount} שדות סומנו כטופלו ומוסתרים</span>
              <button onClick={restoreAll} style={sB('#78909c')}>הצג הכל</button>
            </div>
          )}
          {!activeMissing.length&&<div style={{textAlign:'center',color:'#4caf50',padding:30,fontSize:14}}>✅ {missingAlerts.length===0?'אין שדות חסרים!':'כל השדות החסרים טופלו!'}</div>}
          {activeMissing.slice(0,60).map((a,i)=>{
            const key=`${a.m.id}__${a.p.id}`;
            return(
              <div key={i} style={{display:'flex',gap:8,padding:'10px 12px',borderRadius:8,border:'1px solid #ff980022',background:'#fff8e1',marginBottom:6,alignItems:'center'}}>
                <span style={{background:a.b.color,color:'#fff',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:'bold',flexShrink:0}}>{a.b.name}</span>
                <div style={{flex:1,cursor:'pointer'}} onClick={()=>onNav(a.b.id,a.c.id,a.m.id)}>
                  <div style={{fontWeight:'bold',fontSize:12,color:'#333'}}>{a.m.name}</div>
                  <div style={{fontSize:11,color:'#795548'}}>חלק: {a.p.values.nameHe||a.p.id} · חסר: {a.field}</div>
                </div>
                <button onClick={()=>onNav(a.b.id,a.c.id,a.m.id)} style={sB('#1565c0')}>→ פתח</button>
                <button onClick={()=>dismissAlert(key)} style={sB('#4caf50')}>✓ טופל</button>
              </div>
            );
          })}
          {activeMissing.length>60&&<div style={{textAlign:'center',color:'var(--sub)',fontSize:12,padding:8}}>ועוד {activeMissing.length-60} פריטים...</div>}
        </div>
      )}
      {tab==='reports'&&(
        <div style={{maxHeight:'55vh',overflowY:'auto'}}>
          {!unresolved.length&&<div style={{textAlign:'center',color:'#4caf50',padding:30,fontSize:14}}>✅ אין דיווחים פתוחים!</div>}
          {reports.map(r=>(
            <div key={r.id} style={{padding:'12px',borderRadius:8,border:`1px solid ${r.resolved?'var(--border)':'#ff980055'}`,background:r.resolved?'var(--row2)':'#fff8e1',marginBottom:8,opacity:r.resolved?.6:1}}>
              <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{flex:1}}><div style={{fontWeight:'bold',fontSize:12,color:'var(--text)',marginBottom:4}}>{r.modelName||'?'} ({r.brandName||''})</div><div style={{fontSize:13,color:'var(--text)',marginBottom:4,lineHeight:1.5}}>{r.text}</div><div style={{fontSize:10,color:'var(--sub)'}}>{r.ts} · {r.role||'?'}</div></div>
                <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                  <button onClick={()=>onNav(r.bid,r.cid,r.mid)} style={sB('#1565c0')}>→ פתח</button>
                  {!r.resolved&&<button onClick={()=>onResolve(r.id)} style={sB('#4caf50')}>✓ טופל</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='tech'&&(
        <div style={{maxHeight:'55vh',overflowY:'auto'}}>
          {!unresolvedTech.length&&<div style={{textAlign:'center',color:'#4caf50',padding:30,fontSize:14}}>✅ אין בקשות פתוחות!</div>}
          {techRequests.map(r=>(
            <div key={r.id} style={{padding:'12px',borderRadius:8,border:`1px solid ${r.resolved?'var(--border)':'#1565c055'}`,background:r.resolved?'var(--row2)':'#e3f2fd',marginBottom:8,opacity:r.resolved?.6:1}}>
              <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                <div style={{flex:1}}><div style={{fontWeight:'bold',fontSize:13,color:'var(--text)',marginBottom:4}}>{r.text}</div><div style={{fontSize:11,color:'var(--sub)'}}>{r.ts} · {r.submittedBy||'?'}</div></div>
                {!r.resolved&&<button onClick={()=>onResolveTech(r.id)} style={sB('#4caf50')}>✓ טופל</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==='activity'&&(
        <div style={{maxHeight:'55vh',overflowY:'auto'}}>
          {!alerts.length&&<div style={{textAlign:'center',color:'var(--sub)',padding:30}}>אין פעולות עדיין</div>}
          {alerts.map((a,i)=>(
            <div key={a.id||i} style={{display:'flex',gap:10,padding:'9px 12px',borderRadius:8,background:a.type==='delete'?'#ffebee':'#e8f5e9',marginBottom:6,alignItems:'center'}}>
              <span style={{fontSize:16,flexShrink:0}}>{a.type==='delete'?'🗑':'➕'}</span>
              <div style={{flex:1}}><div style={{fontSize:13,color:'var(--text)',fontWeight:'500'}}>{a.text}</div><div style={{fontSize:11,color:'var(--sub)'}}>{a.ts} · {a.actor||'?'}</div></div>
            </div>
          ))}
        </div>
      )}
      {tab==='dupes'&&(
        <div style={{maxHeight:'55vh',overflowY:'auto'}}>
          {!duplicateNames.length&&<div style={{textAlign:'center',color:'#4caf50',padding:30,fontSize:14}}>✅ אין דגמים עם שם זהה!</div>}
          {duplicateNames.map((group,gi)=>(
            <div key={gi} style={{padding:'12px',borderRadius:8,border:'1px solid #ff980055',background:'#fff8e1',marginBottom:8}}>
              <div style={{fontWeight:'bold',fontSize:13,color:'#e65100',marginBottom:8}}>🔁 "{group[0].m.name}" — {group.length} דגמים עם שם זהה</div>
              {group.map(({b,c,m},i)=>(
                <div key={i} onClick={()=>onNav(b.id,c.id,m.id)}
                  style={{display:'flex',gap:8,alignItems:'center',padding:'6px 10px',borderRadius:6,background:'var(--card)',marginBottom:4,cursor:'pointer'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--row2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='var(--card)'}>
                  <span style={{background:b.color,color:'#fff',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:'bold'}}>{b.name}</span>
                  <span style={{fontSize:12,color:'var(--sub)'}}>{c.name}</span>
                  <span style={{fontSize:11,color:'#1565c0',fontWeight:'bold'}}>{m.parts.length} חלקים</span>
                  <span style={{marginRight:'auto',color:'#e65100',fontSize:11}}>→ לחץ לפתיחה</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button onClick={onClose} style={{width:'100%',marginTop:14,...BST}}>סגור</button>
    </Modal>
  );
}


// ══════════ PHONE MOCK — decorative 3D phone on the login screen; follows the cursor ══════════
function PhoneMock(){
  const dev=useRef(null);
  useEffect(()=>{
    const el=dev.current;if(!el)return;
    const REST={y:-10,x:4};
    const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ty=REST.y,tx=REST.x,cy=ty,cx=tx,raf=0;
    const apply=()=>{
      el.style.transform=`rotateY(${cy.toFixed(2)}deg) rotateX(${cx.toFixed(2)}deg)`;
      el.style.setProperty('--gx',(50+cy*1.1)+'%');
      el.style.setProperty('--gy',(30-cx*2.2)+'%');
    };
    const loop=()=>{
      cy+=(ty-cy)*.085;cx+=(tx-cx)*.085;apply();
      if(Math.abs(ty-cy)>.02||Math.abs(tx-cx)>.02)raf=requestAnimationFrame(loop);else raf=0;
    };
    const wake=()=>{if(!raf)raf=requestAnimationFrame(loop);};
    const onMove=e=>{
      const r=el.getBoundingClientRect();
      const nx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(window.innerWidth*.45)));
      const ny=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(window.innerHeight*.45)));
      ty=nx*32;          // turn toward the cursor
      tx=-ny*22;         // tilt toward the cursor
      wake();
    };
    const onLeave=()=>{ty=REST.y;tx=REST.x;wake();};
    apply();
    if(reduce)return;
    window.addEventListener('pointermove',onMove,{passive:true});
    document.documentElement.addEventListener('mouseleave',onLeave);
    return()=>{window.removeEventListener('pointermove',onMove);document.documentElement.removeEventListener('mouseleave',onLeave);if(raf)cancelAnimationFrame(raf);};
  },[]);
  const MODEL='GMV-160WL\\C-X';
  const parts=[
    ['כרטיס מדחס ZQ3316D','30223000038','52001014143','0s',true],
    ['חיישן','322101002','52001009460','.25s',false],
    ['מנוע מאוורר','1570410001301','52001014088','.5s',false]
  ];
  return(
    <div className="pm-wrap" aria-hidden="true">
      <div className="pm-halo"/>
      <div className="pm-float" style={{transformStyle:'preserve-3d'}}>
        <div className="pm-dev" ref={dev}>
          <div className="pm-chip" style={{left:-128,top:140,'--cz':'90px'}}><span>מק"ט תדיראן</span><b>52001014143</b></div>
          <div className="pm-chip" style={{right:-132,top:310,'--cz':'120px'}}><span>מק"ט יצרן</span><b>1570410001301</b></div>
          <div className="pm-body"><div className="pm-screen">
            <div className="pm-top"><span className="pm-mark"><Ic n="mark" s={16} sw={1.8}/></span>חלקי חילוף</div>
            <div className="pm-search"><span style={{color:'#8a99b5',display:'flex'}}><Ic n="search" s={17}/></span><span className="pm-q">{MODEL}</span></div>
            <div className="pm-model"><b>{MODEL}</b><span>3 חלקים</span></div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {parts.map(([n,mfg,tad,d,sel])=>(
                <div key={tad} className={'pm-row'+(sel?' sel':'')} style={{'--pd':d}}>
                  <span className="pm-n">{n}</span>
                  <div className="pm-nums">
                    <div><i>מק"ט יצרן</i><b className="pm-c">{mfg}</b></div>
                    <div><i>מק"ט תדיראן</i><b className="pm-c">{tad}</b></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pm-sent"><Ic n="checkc" s={18} sw={1.9}/><span>נשלח</span></div>
            <div className="pm-sheet"><div className="t">נבחר חלק אחד</div>
              <div className="pm-btn wa"><Ic n="send" s={16}/>שלח בווצאפ</div>
              <div className="pm-btn"><Ic n="cart" s={16}/>הוסף לסל</div></div>
          </div></div>
        </div>
      </div>
    </div>
  );
}
