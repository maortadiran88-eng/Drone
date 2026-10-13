const { useState, useEffect, useMemo, useRef } = React;

function App() {
  const [data,           setData]           = useState(null);
  const [loaded,         setLoaded]         = useState(false);
  const [saving,         setSaving]         = useState('');
  const [saveErr,        setSaveErr]        = useState('');
  const [loginRole,      setLoginRole]      = useState(null);
  const [loginLabel,     setLoginLabel]     = useState('');
  const [sel,            setSel]            = useState(null);
  const [dark,           setDark]           = useState(() => localStorage.getItem('ac_dark')==='1');
  const [sidebar,        setSidebar]        = useState(false);
  const [sidebarFilter,  setSidebarFilter]  = useState('');
  const [query,          setQuery]          = useState('');
  const [imgModal,       setImgModal]       = useState({imgs:[],idx:0});
  const [imgZoom,        setImgZoom]        = useState(1);
  const [cart,           setCart]           = useState([]);
  const [openBrandReq, setOpenBrandReq] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Ctrl/⌘+K or "/" opens the global search
  useEffect(()=>{
    const h=e=>{
      const t=(document.activeElement&&document.activeElement.tagName||'').toLowerCase();
      const typing=t==='input'||t==='textarea'||t==='select'||(document.activeElement&&document.activeElement.isContentEditable);
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPaletteOpen(true);}
      else if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();setPaletteOpen(true);}
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[]);
  const [showCart,       setShowCart]       = useState(false);
  const [showNotif,      setShowNotif]      = useState(false);
  const [showMakatReview,setShowMakatReview]= useState(false);
  const [makatApprovals, setMakatApprovals] = useState(()=>{try{return JSON.parse(localStorage.getItem('makat_approvals')||'{}');}catch{return{};}});
  const [notifInitTab,   setNotifInitTab]   = useState('missing');
  const [reports,        setReports]        = useState([]);
  const [techRequests,   setTechRequests]   = useState([]);
  const [alerts,         setAlerts]         = useState([]);
  const [histData,       setHistData]       = useState([]);
  const [showHistory,    setShowHistory]    = useState(false);
  const [brandMgr,       setBrandMgr]       = useState(false);
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [chPwd,          setChPwd]          = useState(false);
  const [showXls,        setShowXls]        = useState(false);
  const [showBulkMove,   setShowBulkMove]   = useState(false);
  const [showBulkDel,    setShowBulkDel]    = useState(false);
  const [showHelp,       setShowHelp]       = useState(false);
  const [showDashboard,  setShowDashboard]  = useState(false);
  const [showNewsEditor, setShowNewsEditor] = useState(false);
  const [showBroadcast,  setShowBroadcast]  = useState(false);
  const [showUsersMgr,   setShowUsersMgr]   = useState(false);
  const [showTipsEdit,   setShowTipsEdit]   = useState(false);
  const [undoStack,      setUndoStack]      = useState([]); // last 5 reversible actions
  const [showUndo,       setShowUndo]       = useState(null); // {msg, fn}
  const [compareList,    setCompareList]    = useState([]); // [{bid,cid,mid}]
  const [showCompare,    setShowCompare]    = useState(false);
  const [broadcast,      setBroadcast]      = useState(null);
  const [newsItems,      setNewsItems]      = useState([]);
  const [favorites,      setFavorites]      = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('ac_fav')||'[]')); } catch { return new Set(); }
  });
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ac_recent')||'[]'); } catch { return []; }
  });
  const [now, setNow] = useState(new Date());

  const saveTimer    = useRef(null);
  const firstLoad    = useRef(true);
  const changedMids  = useRef(new Set());
  const navStack     = useRef([]);
  const headerRef    = useRef(null);
  const saveCount    = useRef(0);
  const saveInFlight = useRef(false);
  const saveAgain    = useRef(false);
  const latestData   = useRef(null);
  const retryTimer   = useRef(null);

  const admin  = loginRole==='admin';
  const editor = loginRole==='editor' || loginRole==='admin';
  const viewer = loginRole==='viewer';

  useEffect(() => { document.documentElement.className=dark?'dark':''; document.body.style.background='var(--bg)'; }, [dark]);
  useEffect(() => { const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); }, []);

  useEffect(() => {
    fbLoad().then(d => { setData(d||INIT()); setLoaded(true); }).catch(() => { setData(INIT()); setLoaded(true); });
    fbGetNews().then(docs => setNewsItems(docs.map(d=>d.text)));
    fbGetBroadcast().then(b => { if(b&&b.active) setBroadcast(b.msg); });
  }, []);

  // Load alerts/reports when editor logs in
  useEffect(() => {
    if (!loginRole) return;
    if (editor) {
      fbGetReports().then(setReports);
      fbGetTechRequests().then(setTechRequests);
      fbGetAlerts().then(setAlerts);
    }
  }, [loginRole]);

  // Single-flight autosave: only ONE fbSave may be in flight at a time. If the
  // network/backend is slow or backing off, further edits just flag "save
  // again" instead of stacking more (large) writes onto Firestore's write
  // stream — that pile-up is what ends in "resource-exhausted: Write stream
  // exhausted maximum allowed queued writes".
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_,rej) => setTimeout(() => {
    const err = new Error('Firebase לא אישר את השמירה תוך '+Math.round(ms/1000)+' שניות (עומס/חסימה בצד השרת). אל תרענן עדיין — השינויים עדיין בזיכרון. לחץ אישור כדי לנסות שוב.');
    err.nonRetryable = true; rej(err);
  }, ms))]);
  const runSave = async () => {
    if (saveInFlight.current) { saveAgain.current = true; return; }
    saveInFlight.current = true;
    try {
      do {
        saveAgain.current = false;
        setSaving('saving');
        const snap = latestData.current;
        // Capture + clear BEFORE awaiting — edits made mid-save go to a fresh Set
        const midsToSave = changedMids.current;
        changedMids.current = new Set();
        try {
          await withTimeout(fbSave(snap, midsToSave), 60000);
          saveCount.current++;
          if (saveCount.current % 5 === 0) fbSaveSnapshot(snap, loginLabel||loginRole||'system', 'שמירה אוטומטית');
          clearTimeout(retryTimer.current);
          setSaving('saved'); setSaveErr('');
          setTimeout(() => setSaving(s => s==='saved' ? '' : s), 3000);
        } catch(e) {
          // Put the ids back so the next save retries them instead of losing them
          midsToSave.forEach(id => changedMids.current.add(id));
          setSaving('error'); setSaveErr(e.message||String(e));
          if (!e.nonRetryable) { clearTimeout(retryTimer.current); retryTimer.current = setTimeout(runSave, 20000); }
          break;
        }
      } while (saveAgain.current);
    } finally { saveInFlight.current = false; }
  };
  useEffect(() => {
    if (!loaded||!data) return;
    latestData.current = data;
    if (firstLoad.current) { firstLoad.current=false; return; }
    setSaving('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(runSave, 2500);
  }, [data, loaded]);

  const missingAlerts = useMemo(() => {
    if (!data) return [];
    const res = [];
    data.brands.forEach(b => b.categories.forEach(c => c.models.forEach(m => {
      // Find the tadPn column in this model (might have custom ID)
      const tadCol = m.columns.find(col => col.id==='tadPn' || col.name.includes('תדיראן') || col.name.toLowerCase().includes('tadpn'));
      if (!tadCol) return; // no tadPn column at all - skip
      m.parts.forEach(p => {
        const nameHe = (p.values.nameHe||'').trim();
        const tadPn  = (p.values[tadCol.id]||'').trim();
        // Only alert if part has a Hebrew name AND the tadPn field is truly empty
        if (nameHe && !tadPn)
          res.push({b,c,m,p,field:'מק"ט תדיראן'});
      });
    })));
    return res;
  }, [data]);

  const unresolvedCount = useMemo(() => reports.filter(r=>!r.resolved).length, [reports]);
  const unresolvedTech  = useMemo(() => techRequests.filter(r=>!r.resolved).length, [techRequests]);
  const notifCount      = unresolvedCount + missingAlerts.length + unresolvedTech;

  const brand = sel&&data ? data.brands.find(b=>b.id===sel.bid) : null;
  const cat   = brand     ? brand.categories.find(c=>c.id===sel.cid) : null;
  const model = cat       ? (cat.models.find(m=>m.id===sel.mid) || (cat.subCategories||[]).flatMap(sc=>sc.models).find(m=>m.id===sel.mid)) : null;

  const results = useMemo(() => {
    if (!data||!loginRole) return [];
    const q = query.trim().toLowerCase(); if (!q) return [];
    const canSeeHidden = editor;
    const res=[]; const seen=new Set();
    data.brands.forEach(b => {
      if (!canSeeHidden && b.hidden) return;
      b.categories.forEach(c => {
        const allModels=[...c.models,...(c.subCategories||[]).flatMap(sc=>sc.models)];
        allModels.forEach(m => {
          if (!canSeeHidden && m.hidden) return;
          const ms  = m.synonyms?.find(s => fuzzyMatch(q,s));
          const mh  = fuzzyMatch(q,m.name) || !!ms;
          const ph  = m.parts.filter(p => partMatches(q,p,m.columns));
          if ((mh||ph.length) && !seen.has(m.id)) { seen.add(m.id); res.push({b,c,m,ph,ms:ms||null}); }
        });
      });
    });
    return res;
  }, [query, data, loginRole, editor]);

  const nav = (bid,cid,mid,hq='') => {
    if (sel) navStack.current = [...navStack.current.slice(-9), sel];
    setSel({bid,cid,mid,hq}); setQuery('');
    const b=data?.brands.find(x=>x.id===bid);
    const c=b?.categories.find(x=>x.id===cid);
    const m=c?.models.find(x=>x.id===mid);
    if (m) fbTrackView(mid, m.name, b?.name||'');
    setRecent(p => {
      const e={bid,cid,mid,ts:Date.now()};
      const f=p.filter(x=>x.mid!==mid).slice(0,11);
      const n=[e,...f];
      try { localStorage.setItem('ac_recent',JSON.stringify(n)); } catch {}
      return n;
    });
    if (window.innerWidth<700) setSidebar(false);
  };
  const goBack = () => { if(navStack.current.length>0){const p=navStack.current.pop();setSel(p);}else setSel(null); };
  const goHome = () => { setSel(null); setQuery(''); navStack.current=[]; };

  const mut  = fn => setData(d => fn(d));
  const mutM = (bid,cid,mid,fn) => { changedMids.current.add(mid); mut(d=>({...d,brands:updBrands(d.brands,bid,cid,mid,fn)})); };

  const logAction = (action, extra={}) => fbHist({action,...extra,role:loginRole,actor:loginLabel||loginRole});

  // Undo helper — stores up to 5 reversible snapshots in memory
  const pushUndo = (msg, restoreFn) => {
    setUndoStack(prev => {
      const next = [{msg, restoreFn, ts:Date.now()}, ...prev].slice(0, 5);
      return next;
    });
    setShowUndo({msg, fn: restoreFn});
    setTimeout(() => setShowUndo(null), 8000); // hide snackbar after 8s
  };
  const logAlert  = (type, text) => {
    fbLogAlert({type,text,actor:loginLabel||loginRole}).then(()=>fbGetAlerts().then(setAlerts));
  };

  const toggleDark = () => setDark(v => { localStorage.setItem('ac_dark',v?'0':'1'); return !v; });
  const toggleFav  = mid => setFavorites(p => {
    const n=new Set(p); n.has(mid)?n.delete(mid):n.add(mid);
    try { localStorage.setItem('ac_fav',JSON.stringify([...n])); } catch {}
    return n;
  });

  const handleImgUpload = async (e,bid,cid,mid) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    const b64 = await Promise.all(files.map(compressImg));
    mutM(bid,cid,mid, m=>({...m,images:[...(m.images||[]),...b64]}));
  };

  const addToCart = (bid,cid,mid,pid) => {
    if (cart.find(i=>i.mid===mid&&i.pid===pid)) { alert('כבר בסל'); return; }
    const b=data.brands.find(x=>x.id===bid),c=b?.categories.find(x=>x.id===cid),m=c?.models.find(x=>x.id===mid),p=m?.parts.find(x=>x.id===pid);
    if (!m||!p) return;
    setCart(prev => [...prev,{id:gid(),bid,cid,mid,pid,modelName:m.name,brandName:b.name,brandColor:b.color,catName:c.name,values:{...p.values},columns:m.columns}]);
  };
  const removeFromCart = id => setCart(p => p.filter(i=>i.id!==id));
  const clearCart      = ()  => setCart([]);

  const moveModel = (fBid,fCid,mid,toBid,toCid) => {
    let moved=null;
    mut(d => {
      const brands=d.brands.map(b => { if(b.id!==fBid)return b; return{...b,categories:b.categories.map(c=>{if(c.id!==fCid)return c;moved=c.models.find(m=>m.id===mid);return{...c,models:c.models.filter(m=>m.id!==mid)};})}; });
      if(!moved)return d;
      return{...d,brands:brands.map(b=>b.id!==toBid?b:{...b,categories:b.categories.map(c=>c.id!==toCid?c:{...c,models:[...c.models,moved]})})};
    });
    changedMids.current.add(mid); setSel(s=>({...s,bid:toBid,cid:toCid}));
  };

  const bulkMoveModels = (sels,toBid,toCid) => {
    mut(d => {
      let moved=[];
      let brands=d.brands.map(b=>({...b,categories:b.categories.map(c=>({...c,models:c.models.filter(m=>{const s=sels.some(x=>x.mid===m.id&&x.bid===b.id&&x.cid===c.id);if(s)moved.push(m);return!s;})}))}));
      brands=brands.map(b=>b.id!==toBid?b:{...b,categories:b.categories.map(c=>c.id!==toCid?c:{...c,models:[...c.models,...moved]})});
      return{...d,brands};
    });
    sels.forEach(s=>changedMids.current.add(s.mid));
    logAction('העברה מרובה',{count:sels.length});
  };

  const bulkDeleteModels = async sels => {
    if(!confirm(`למחוק ${sels.length} דגמים לצמיתות?`))return;
    fbSaveSnapshot(data, loginLabel||loginRole, `לפני מחיקת ${sels.length} דגמים`);

    // Build every Firestore operation (part-doc delete + alert log) up front,
    // then send them as chunked db.batch() writes instead of firing one
    // un-batched request per model — that per-model loop was what exhausted
    // the write stream on larger selections.
    const ops = [];
    sels.forEach(s => {
      const b=data.brands.find(x=>x.id===s.bid);
      const c=b?.categories.find(x=>x.id===s.cid);
      const m=c?.models.find(x=>x.id===s.mid);
      ops.push({type:'delete', ref:db.collection('parts').doc(s.mid)});
      if(m) ops.push({type:'alert', ref:db.collection('alerts').doc(), data:{
        type:'delete', text:`נמחק דגם: ${m.name} (${b?.name||''} / ${c?.name||''})`,
        actor:loginLabel||loginRole, ts:firebase.firestore.FieldValue.serverTimestamp()
      }});
    });
    const CHUNK = 450; // stay safely under Firestore's 500-operation batch limit
    try {
      for (let i=0; i<ops.length; i+=CHUNK) {
        const batch = db.batch();
        ops.slice(i,i+CHUNK).forEach(op => op.type==='delete' ? batch.delete(op.ref) : batch.set(op.ref, op.data));
        await batch.commit();
      }
      fbGetAlerts().then(setAlerts);
    } catch(e) { console.error('מחיקה מרובה — שגיאת כתיבה:', e); }

    mut(d=>({...d,brands:d.brands.map(b=>({...b,categories:b.categories.map(c=>({...c,models:c.models.filter(m=>!sels.some(s=>s.mid===m.id&&s.bid===b.id&&s.cid===c.id))}))}))}));
    if(sels.some(s=>s.mid===sel?.mid))setSel(null);
    logAction('מחיקה מרובה',{count:sels.length});
  };

  const duplicateModel = (bid,cid,mid) => {
    const orig=data.brands.find(b=>b.id===bid)?.categories.find(c=>c.id===cid)?.models.find(m=>m.id===mid);
    if(!orig)return;
    const newId=gid(); changedMids.current.add(newId);
    const dup={...JSON.parse(JSON.stringify(orig)),id:newId,name:orig.name+' (עותק)',synonyms:[]};
    mut(d=>({...d,brands:d.brands.map(b=>b.id!==bid?b:{...b,categories:b.categories.map(c=>c.id!==cid?c:{...c,models:[...c.models,dup]})})}));
  };

  const copyPartsFrom = (sb,sc,sm,db2,dc,dm) => {
    const srcM=data.brands.find(b=>b.id===sb)?.categories.find(c=>c.id===sc)?.models.find(m=>m.id===sm);
    if(!srcM)return;
    changedMids.current.add(dm);
    mutM(db2,dc,dm,m=>({...m,parts:[...m.parts,...srcM.parts.map(p=>({...p,id:gid()}))]}));
  };

  const handleAddModel = (b,cid,name,scid) => {
    const id=gid(); changedMids.current.add(id);
    const nm={id,name,synonyms:[],images:[],notes:'',columns:DCOLS(),parts:[]};
    mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>{
      if(c.id!==cid)return c;
      if(scid)return{...c,subCategories:(c.subCategories||[]).map(sc=>sc.id!==scid?sc:{...sc,models:[...sc.models,nm]})};
      return{...c,models:[...c.models,nm]};
    })})}));
    logAction('הוסף דגם',{model:name,brand:b.name});
    logAlert('add', `נוסף דגם חדש: ${name} (${b.name})`);
    fbAddNews(`נוסף דגם חדש: ${name} (${b.name})`).then(()=>fbGetNews().then(docs=>setNewsItems(docs.map(d=>d.text))));
  };

  const importFromXls = (rows,colMap,tBid,tCid,excluded) => {
    const grouped={};
    rows.forEach(r=>{const mn=String(r[colMap.model]||'').trim();if(!mn||excluded.has(mn))return;if(!grouped[mn])grouped[mn]=[];grouped[mn].push(r);});
    let total=0;
    mut(d=>{
      const brands=d.brands.map(b=>{if(b.id!==tBid)return b;return{...b,categories:b.categories.map(c=>{if(c.id!==tCid)return c;let models=[...c.models];Object.entries(grouped).forEach(([mn,pRows])=>{let m=models.find(x=>x.name===mn);const newId=m?m.id:gid();if(!m){m={id:newId,name:mn,synonyms:[],images:[],notes:'',columns:DCOLS(),parts:[]};models.push(m);}const np=pRows.map(r=>({id:gid(),discontinued:false,tags:'',pinned:false,comments:[],values:{ref:'',nameHe:String(r[colMap.nameHe]||'').trim(),nameEn:String(r[colMap.nameEn]||'').trim(),mfgPn:String(r[colMap.mfgPn]||'').trim(),tadPn:String(r[colMap.tadPn]||'').trim()}}));total+=np.length;changedMids.current.add(newId);models=models.map(x=>x.name===mn?{...x,parts:[...x.parts,...np]}:x);});return{...c,models};})};});
      return{...d,brands};
    });
    const modelNames=Object.keys(grouped).join(', ');
    if(modelNames){
      fbAddNews(`נוספו דגמים חדשים: ${modelNames}`).then(()=>fbGetNews().then(docs=>setNewsItems(docs.map(d=>d.text))));
      logAlert('add',`יובאו ${Object.keys(grouped).length} דגמים מ-Excel: ${modelNames.slice(0,60)}`);
    }
    logAction('ייבוא Excel',{models:Object.keys(grouped).length,parts:total});
    return{models:Object.keys(grouped).length,parts:total};
  };

  const expXLS = () => {
    if(!data)return;
    try{
      const wb = XLSX.utils.book_new();

      // Build the full ordered set of column ids/names used anywhere in the catalog.
      // Defaults first (in their standard order, incl. the identification number "ref"),
      // then any extra custom columns editors have added, in first-seen order.
      const defaultOrder = ['ref','nameHe','nameEn','mfgPn','tadPn'];
      const colNameMap = {};
      DCOLS().forEach(c=>{colNameMap[c.id]=c.name;});
      const extraIds = [];
      data.brands.forEach(b=>b.categories.forEach(c=>c.models.forEach(m=>{
        (m.columns||[]).forEach(col=>{
          if(!colNameMap[col.id]) colNameMap[col.id]=col.name;
          if(!defaultOrder.includes(col.id) && !extraIds.includes(col.id)) extraIds.push(col.id);
        });
      })));
      const colIds   = [...defaultOrder, ...extraIds];
      const colNames = colIds.map(id=>colNameMap[id]||id);

      const fixedHead = ['שם דגם','שמות נרדפים','הערות דגם','מספר שרטוטים/תמונות'];
      const allHeader = ['מותג','קטגוריה', ...fixedHead, ...colNames, 'נפוץ','סטטוס'];
      const allRows = [allHeader];

      // One sheet per BRAND
      data.brands.forEach(b => {
        const brandHeader = ['קטגוריה', ...fixedHead, ...colNames, 'נפוץ','סטטוס'];
        const brandRows = [brandHeader];
        let brandHasParts = false;

        b.categories.forEach(cat => {
          cat.models.forEach(m => {
            if(!m.parts.length) return;
            brandHasParts = true;

            const modelInfo = [m.name, (m.synonyms||[]).join(' | '), m.notes||'', (m.images||[]).length||0];

            m.parts.forEach(p => {
              const vals = colIds.map(id=>p.values[id]||'');
              brandRows.push([cat.name, ...modelInfo, ...vals, p.pinned?'נפוץ':'', p.discontinued ? 'הופסק לייצור' : '']);
              allRows.push([b.name, cat.name, ...modelInfo, ...vals, p.pinned?'נפוץ':'', p.discontinued?'הופסק לייצור':'']);
            });
          });
        });

        if(!brandHasParts) return; // skip brand with no parts

        const ws = XLSX.utils.aoa_to_sheet(brandRows);
        ws['!cols'] = brandHeader.map(()=>({wch:18}));

        const sheetName = b.name.replace(/[\/:*?\[\]]/g,'').slice(0,31);
        try { XLSX.utils.book_append_sheet(wb, ws, sheetName); }
        catch  { XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0,25)+gid().slice(0,5)); }
      });

      // Final sheet — all data
      const wsAll = XLSX.utils.aoa_to_sheet(allRows);
      wsAll['!cols'] = allHeader.map(()=>({wch:18}));
      XLSX.utils.book_append_sheet(wb, wsAll, 'כל הנתונים');

      XLSX.writeFile(wb, `ac-catalog-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch(err) { alert('שגיאה בייצוא Excel: '+err.message); console.error(err); }
  };

  const expJSON = () => {
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download=`ac-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const impFile = e => {
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{try{const d=JSON.parse(ev.target.result);d.brands?.forEach(b=>b.categories?.forEach(c=>c.models?.forEach(m=>changedMids.current.add(m.id))));setData(d);setSel(null);alert('✅ נטען');}catch{alert('❌ שגיאה');}};
    r.readAsText(f);e.target.value='';
  };

  if (!loaded) return(
    <div className="login-bg" style={{position:'fixed',inset:0,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',direction:'rtl'}}>
      <div aria-hidden className="login-blob-a" style={{position:'absolute',width:280,height:280,borderRadius:'50%',filter:'blur(70px)',opacity:.5,top:-70,right:-60}}/>
      <div aria-hidden className="login-blob-b" style={{position:'absolute',width:240,height:240,borderRadius:'50%',filter:'blur(70px)',opacity:.5,bottom:-50,left:-40}}/>
      <div aria-hidden className="login-blob-c" style={{position:'absolute',width:200,height:200,borderRadius:'50%',filter:'blur(70px)',opacity:.45,top:'42%',left:'28%'}}/>
      <div style={{position:'relative',zIndex:1,textAlign:'center',animation:'fadeIn .4s ease-out'}}>
        <div style={{fontWeight:900,fontSize:24,letterSpacing:2,color:'var(--text)',marginBottom:2}}>TADI<span style={{color:'var(--primary)'}}>RAN</span></div>
        <div style={{fontSize:10,letterSpacing:3,color:'var(--sub)',fontWeight:700,marginBottom:26}}>P A R T S &nbsp; C A T A L O G</div>
        <div style={{width:34,height:34,margin:'0 auto',border:'3px solid var(--border2)',borderTop:'3px solid var(--cyan)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
        <div style={{fontSize:12.5,color:'var(--sub)',marginTop:16,fontWeight:600}}>טוען...</div>
      </div>
    </div>
  );

  if (!loginRole) return <LoginScreen data={data} onLogin={(role,id,label)=>{setLoginRole(role);setLoginLabel(label||role);}}/>;

  const hdrBg = brand?.color || 'var(--primary)';
  const tips  = data.tips&&data.tips.length ? data.tips : DEFAULT_TIPS;
  const partsDisclaimer = data.partsDisclaimer || DEFAULT_DISCLAIMER;

  const openNotif = (tab='missing') => {
    setNotifInitTab(tab);
    setShowNotif(true);
    fbGetReports().then(setReports);
    fbGetTechRequests().then(setTechRequests);
    fbGetAlerts().then(setAlerts);
  };

  return(
    <div dir="rtl" style={{fontFamily:'var(--font)',position:'relative',minHeight:'100vh',background:'var(--bg)',fontSize:14,color:'var(--text)'}}>
      <AirParticles/>
      <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',minHeight:'100vh',animation:'fadeIn .6s ease-out'}}>

      {/* Broadcast */}
      {broadcast && <BroadcastBanner msg={broadcast} onDismiss={()=>setBroadcast(null)}/>}

      {/* HEADER */}
      <header ref={headerRef} className="glass" style={{color:'var(--text)',borderBottom:`2px solid ${hdrBg}`,boxShadow:'0 3px 16px var(--shadow)',position:'sticky',top:0,zIndex:200,transition:'border-color .3s'}}>

        {/* Row 1 — minimized: identity + search toggle + one consolidated menu */}
        <div className="hdr-row">

          {/* start (right): side menu · back · home · search */}
          <div className="hdr-zone">
            <button onClick={()=>setSidebar(v=>!v)} className="hdr-btn tt tt-hdr tt-r" data-tt="פתיחה וסגירה של סרגל המותגים והדגמים" aria-label="פתח או סגור תפריט צד"><Ic n="menu" s={19}/></button>
            {sel&&(<>
              <button onClick={goBack} className="hdr-btn tt tt-hdr" data-tt="חזרה למסך הקודם" aria-label="חזרה אחורה"><Ic n="back" s={19}/></button>
              <button onClick={goHome} className="hdr-btn tt tt-hdr" data-tt="חזרה למסך הבית" aria-label="מסך הבית"><Ic n="home" s={18}/></button>
            </>)}
            <button onClick={()=>setPaletteOpen(true)} className="hdr-btn tt tt-hdr" data-tt="חיפוש בכל הקטלוג (Ctrl+K)" aria-label="חיפוש"><Ic n="search" s={18}/></button>
          </div>

          {/* centre: title + date & time */}
          <div className="hdr-center">
            <div className="hdr-id"><div className="hdr-mark"><Ic n="mark" s={19} sw={1.8}/></div><span className="hdr-title">חלקי חילוף</span></div>
            <span className="hdr-date">{now.toLocaleDateString('he-IL',{day:'2-digit',month:'2-digit'})} · {now.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</span>
          </div>

          {/* end (left): save state + main menu */}
          <div className="hdr-zone hdr-end">
            {saving==='saving'&&<span className="tt tt-hdr" data-tt="שומר שינויים..." style={{fontSize:11,flexShrink:0,display:'flex'}}><Ic n="save" s={15}/></span>}
            {saving==='saved' &&<span className="tt tt-hdr" data-tt="השינויים נשמרו" style={{flexShrink:0,color:'var(--green)',display:'flex'}}><Ic n="check" s={16} sw={2.2}/></span>}
            {saving==='error' &&<button onClick={()=>{alert('שגיאת שמירה: '+saveErr);runSave();}} style={{fontSize:11,color:'#fff',background:'var(--red)',border:'none',borderRadius:5,padding:'3px 7px',cursor:'pointer',flexShrink:0}}>⚠</button>}
          <div className="menu-wrap">
            <button onClick={()=>setMenuOpen(v=>!v)} className={'hdr-btn tt tt-hdr tt-l'+(menuOpen?' on':'')} data-tt="תפריט ראשי: השוואה, סל, מצב כהה ועוד" aria-label="תפריט"><Ic n="dots" s={19}/></button>
            {menuOpen&&<>
              <div onClick={()=>setMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:240}}/>
              <div className="menu-panel" dir="rtl" style={{left:0,minWidth:250}}>
                <button className="menu-item" onClick={()=>{goHome();setMenuOpen(false);}}><span className="ic"><Ic n="home" s={17}/></span>מסך הבית</button>
                {sel&&<button className="menu-item" onClick={()=>{goBack();setMenuOpen(false);}}><span className="ic"><Ic n="back" s={17}/></span>חזור אחורה</button>}
                <button className="menu-item" onClick={()=>{setShowCompare(true);setMenuOpen(false);}}><span className="ic"><Ic n="compare" s={17}/></span>השוואת דגמים{compareList.length>0&&<span className="tc-meta" style={{marginRight:'auto'}}>({compareList.length})</span>}</button>
                <button className="menu-item" onClick={()=>{setShowCart(true);setMenuOpen(false);}}><span className="ic"><Ic n="cart" s={17}/></span>סל חלקים{cart.length>0&&<span className="tc-meta" style={{marginRight:'auto'}}>({cart.length})</span>}</button>
                <button className="menu-item" onClick={()=>{setShowHelp(true);setMenuOpen(false);}}><span className="ic"><Ic n="help" s={17}/></span>מדריך שימוש</button>
                {editor&&<button className="menu-item" onClick={()=>{openNotif();setMenuOpen(false);}}><span className="ic"><Ic n="bell" s={17}/></span>התראות{notifCount>0&&<span className="tc-meta" style={{marginRight:'auto'}}>({notifCount})</span>}</button>}
                <button className="menu-item" onClick={()=>{toggleDark();}}><span className="ic"><Ic n={dark?'sun':'moon'} s={17}/></span>{dark?'מצב בהיר':'מצב כהה'}</button>

                {editor&&<div className="menu-divider"/>}
                {admin&&<button className="menu-item" onClick={()=>{setShowMakatReview(true);setMenuOpen(false);}}><span className="ic"><Ic n="checkc" s={17}/></span>בדיקת מק"טים</button>}
                {editor&&<button className="menu-item" onClick={()=>{setShowXls(true);setMenuOpen(false);}}><span className="ic"><Ic n="import" s={17}/></span>ייבוא מ-Excel</button>}
                {editor&&!admin&&<button className="menu-item" onClick={()=>{setShowNewsEditor(true);setMenuOpen(false);}}><span className="ic"><Ic n="news" s={17}/></span>עריכת חדשות</button>}
                {editor&&!admin&&<button className="menu-item" onClick={()=>{setShowBroadcast(true);setMenuOpen(false);}}><span className="ic"><Ic n="megaphone" s={17}/></span>שליחת הודעת מערכת</button>}
                {editor&&!admin&&<button className="menu-item" onClick={()=>{setShowDashboard(true);setMenuOpen(false);}}><span className="ic"><Ic n="chart" s={17}/></span>דשבורד</button>}

                {admin&&<>
                  <div className="menu-divider"/>
                  <button className="menu-item" onClick={()=>{setBrandMgr(true);setMenuOpen(false);}}><span className="ic"><Ic n="settings" s={17}/></span>ניהול מותגים</button>
                  <button className="menu-item" onClick={()=>{setShowDashboard(true);setMenuOpen(false);}}><span className="ic"><Ic n="chart" s={17}/></span>דשבורד</button>
                  <button className="menu-item" onClick={()=>{setShowUsersMgr(true);setMenuOpen(false);}}><span className="ic"><Ic n="users" s={17}/></span>ניהול משתמשים</button>
                  <button className="menu-item" onClick={()=>{setChPwd(true);setMenuOpen(false);}}><span className="ic"><Ic n="key" s={17}/></span>שינוי סיסמה</button>
                  <div className="menu-divider"/>
                  <button className="menu-item" onClick={()=>{setShowNewsEditor(true);setMenuOpen(false);}}><span className="ic"><Ic n="news" s={17}/></span>עריכת חדשות</button>
                  <button className="menu-item" onClick={()=>{setShowBroadcast(true);setMenuOpen(false);}}><span className="ic"><Ic n="megaphone" s={17}/></span>הודעת מערכת</button>
                  <button className="menu-item" onClick={()=>{setShowHistory(true);fbGetHist().then(setHistData);setMenuOpen(false);}}><span className="ic"><Ic n="history" s={17}/></span>היסטוריה / גרסאות</button>
                  <div className="menu-divider"/>
                  <button className="menu-item" onClick={()=>{setShowBulkMove(true);setMenuOpen(false);}}><span className="ic"><Ic n="shuffle" s={17}/></span>העברה גורפת</button>
                  <button className="menu-item danger" onClick={()=>{setShowBulkDel(true);setMenuOpen(false);}}><span className="ic"><Ic n="trash" s={17}/></span>מחיקה גורפת</button>
                  <div className="menu-divider"/>
                  <button className="menu-item" onClick={()=>{expXLS();setMenuOpen(false);}}><span className="ic"><Ic n="sheet" s={17}/></span>ייצוא ל-Excel</button>
                  <button className="menu-item" onClick={()=>{expJSON();setMenuOpen(false);}}><span className="ic"><Ic n="save" s={17}/></span>ייצוא גיבוי (JSON)</button>
                  <label className="menu-item" style={{cursor:'pointer'}}>
                    <span className="ic"><Ic n="folder" s={17}/></span>ייבוא גיבוי (JSON)
                    <input type="file" accept=".json" onChange={e=>{impFile(e);setMenuOpen(false);}} style={{display:'none'}}/>
                  </label>
                </>}

                <div className="menu-divider"/>
                <button className="menu-item danger" onClick={()=>{setLoginRole(null);setSel(null);setSidebar(false);setMenuOpen(false);}}><span className="ic"><Ic n="power" s={17}/></span>יציאה מהמערכת</button>
              </div>
            </>}
          </div>
          </div>
        </div>

        {/* Row 2 — compact search, revealed via the 🔍 toggle (Home has its own hero search) */}
        {sel&&(
          <div style={{position:'relative'}}>
            <div style={{maxHeight:searchOpen?60:0,overflow:'hidden',transition:'max-height .28s ease'}}>
              <div style={{padding:'0 10px 8px'}}>
                <div style={{position:'relative'}}>
                  <input value={query} onChange={e=>setQuery(e.target.value)} autoFocus={searchOpen}
                    placeholder="חיפוש — דגם / מק&quot;ט / שם חלק..."
                    style={{width:'100%',padding:'8px 36px 8px 12px',borderRadius:22,border:'1px solid var(--border2)',fontSize:14,outline:'none',color:'var(--inp)',background:'var(--ibg)',boxSizing:'border-box',boxShadow:'0 1px 4px rgba(0,0,0,.15)'}}/>
                  {query&&<button onClick={()=>setQuery('')} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:16}}>✕</button>}
                </div>
              </div>
            </div>
            {/* Rendered outside the collapsing (overflow:hidden) box above, so results are never clipped */}
            {searchOpen&&query&&<SearchResultsPanel results={results} query={query} onClose={()=>setQuery('')} onSelect={r=>nav(r.b.id,r.c.id,r.m.id,query)}/>}
          </div>
        )}
      </header>

      {/* News Ticker — below header */}
      <NewsTicker items={newsItems}/>

      {/* Tips — below news ticker */}
      <TipsBar tips={tips} canEdit={editor} onEdit={()=>setShowTipsEdit(true)}/>

      {/* Breadcrumb — always know where you are */}
      {model&&(
        <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',padding:'9px 14px'}}>
          <div className="tc-container">
            <Breadcrumb
              onHome={goHome}
              items={[
                {label:brand.name, onClick:()=>setSidebar(true)},
                {label:cat.name, onClick:()=>setSidebar(true)},
                {label:model.name}
              ]}
            />
          </div>
        </div>
      )}

      {/* BODY */}
      <div style={{display:'flex',flex:1,overflow:'hidden',height:'calc(100vh - 56px)'}}>

        {/* SIDEBAR */}
        <aside className="sb-aside" style={{width:sidebar?265:0,flexShrink:0,overflow:'hidden',transition:'width .28s var(--ease)'}}>
          <div style={{width:265,overflowY:'auto',height:'100%',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'8px 10px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
              <div style={{position:'relative'}}>
                <input value={sidebarFilter} onChange={e=>setSidebarFilter(e.target.value)}
                  placeholder="סינון דגמים..." className="sb-filter"
                  style={{width:'100%',padding:'6px 28px 6px 10px',borderRadius:16,border:'1px solid var(--border)',fontSize:12,outline:'none',color:'var(--inp)',background:'var(--ibg)',boxSizing:'border-box'}}/>
                {sidebarFilter&&<button onClick={()=>setSidebarFilter('')} style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#999',fontSize:13}}>✕</button>}
              </div>
            </div>
            <div style={{flex:1,overflowY:'auto'}}>
              {data.brands.filter(b=>editor||!b.hidden).map(b=>(
                <SidebarBrand key={b.id} openReq={openBrandReq} brand={b} sel={sel} editor={editor} admin={admin} canSeeHidden={editor}
                  favorites={favorites} onToggleFav={toggleFav} onNav={nav}
                  sidebarFilter={sidebarFilter}
                  compareList={compareList}
                  onToggleCompare={(bid,cid,mid)=>{
                    setCompareList(p=>{
                      const exists=p.some(x=>x.mid===mid);
                      if(exists)return p.filter(x=>x.mid!==mid);
                      if(p.length>=3){alert('ניתן להשוות עד 3 דגמים בו-זמנית');return p;}
                      return[...p,{bid,cid,mid}];
                    });
                    setShowCompare(true);
                  }}
                  onAddModel={(cid,name,scid)=>handleAddModel(b,cid,name,scid)}
                  onDelModel={async(cid,mid,scid)=>{
                    if(!confirm('למחוק?'))return;
                    const catObj=b.categories.find(c=>c.id===cid);
                    const sourceModels=scid?(catObj?.subCategories||[]).find(sc=>sc.id===scid)?.models:catObj?.models;
                    const m=sourceModels&&sourceModels.find(m=>m.id===mid);
                    const savedModel=m?JSON.parse(JSON.stringify(m)):null;
                    fbSaveSnapshot(data,loginLabel||loginRole,'לפני מחיקת דגם');
                    if(m) logAlert('delete',`נמחק דגם: ${m.name} (${b.name})`);
                    try{await db.collection('parts').doc(mid).delete();}catch{}
                    mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>{
                      if(c.id!==cid)return c;
                      if(scid)return{...c,subCategories:(c.subCategories||[]).map(sc=>sc.id!==scid?sc:{...sc,models:sc.models.filter(m=>m.id!==mid)})};
                      return{...c,models:c.models.filter(m=>m.id!==mid)};
                    })})}));
                    if(sel&&sel.mid===mid)setSel(null);
                    if(savedModel){
                      changedMids.current.add(savedModel.id);
                      pushUndo(`ביטול מחיקת דגם: ${savedModel.name}`,()=>{
                        mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>{
                          if(c.id!==cid)return c;
                          if(scid)return{...c,subCategories:(c.subCategories||[]).map(sc=>sc.id!==scid?sc:{...sc,models:[...sc.models,savedModel]})};
                          return{...c,models:[...c.models,savedModel]};
                        })})}));
                      });
                    }
                  }}
                  onAddCat={name=>mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:[...bb.categories,{id:gid(),name,models:[],subCategories:[]}]})}))}
                  onEditCat={(cid,name)=>mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>c.id!==cid?c:{...c,name})})}))}
                  onDelCat={cid=>{if(!confirm('למחוק?'))return;mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.filter(c=>c.id!==cid)})}));}}
                  onAddSubCat={(cid,name)=>mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>c.id!==cid?c:{...c,subCategories:[...(c.subCategories||[]),{id:gid(),name,models:[]}]})})}))}
                  onEditSubCat={(cid,scid,name)=>mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>c.id!==cid?c:{...c,subCategories:(c.subCategories||[]).map(sc=>sc.id!==scid?sc:{...sc,name})})})}))}
                  onDelSubCat={(cid,scid)=>{if(!confirm('למחוק תת-קטגוריה?'))return;mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>c.id!==cid?c:{...c,subCategories:(c.subCategories||[]).filter(sc=>sc.id!==scid)})})}));}}
                />
              ))}
            </div>

          </div>
        </aside>

        {/* MAIN */}
        <main className="app-main" style={{flex:1,overflowY:'auto',padding:14,paddingBottom:44}}>
          <div key={model?model.id:'home'} className="page-in">
          {!model
            ?<HomeScreen data={data} onNav={nav} recent={recent} favorites={favorites} onToggleFav={toggleFav} loginRole={loginRole} reports={reports} techRequests={techRequests} alerts={alerts}
                onOpenSidebar={()=>setSidebar(true)} onOpenBrand={bid=>{setSidebar(true);setOpenBrandReq({id:bid,n:Date.now()});}}
                query={query} setQuery={setQuery} results={results} canSeeHidden={editor}/>
            :<ModelView
                key={model.id} brand={brand} cat={cat} model={model}
                editor={editor} admin={admin} viewer={viewer} hq={sel?.hq||''}
                data={data} favorites={favorites} onToggleFav={toggleFav} loginRole={loginRole}
                partsDisclaimer={partsDisclaimer}
                onUpdateDisclaimer={v=>mut(d=>({...d,partsDisclaimer:v}))}
                onUpdate={u=>{changedMids.current.add(model.id);mutM(brand.id,cat.id,model.id,m=>({...m,...u}));}}
                onRenameModel={name=>{
                  changedMids.current.add(model.id);
                  mut(d=>({...d,brands:d.brands.map(b=>b.id!==brand.id?b:{...b,categories:b.categories.map(c=>c.id!==cat.id?c:{...c,models:c.models.map(m=>m.id!==model.id?m:{...m,name})})})}));
                  logAction('שינוי שם דגם',{from:model.name,to:name});
                }}
                onAddPart={()=>mutM(brand.id,cat.id,model.id,m=>({...m,parts:[...m.parts,{id:gid(),discontinued:false,tags:'',pinned:false,comments:[],values:Object.fromEntries(m.columns.map(c=>[c.id,'']))}]}))}
                onDelPart={pid=>{
                  const p=model.parts.find(x=>x.id===pid);
                  const partName=p?.values?.nameHe||p?.values?.nameEn||pid;
                  const savedParts=[...model.parts];
                  if(p){logAlert('delete',`נמחק חלק: ${partName} מדגם ${model.name}`);}
                  mutM(brand.id,cat.id,model.id,m=>({...m,parts:m.parts.filter(p=>p.id!==pid)}));
                  pushUndo(`ביטול מחיקת חלק: ${partName}`,()=>{
                    mutM(brand.id,cat.id,model.id,m=>({...m,parts:savedParts}));
                  });
                }}
                onCell={(pid,cid,v)=>mutM(brand.id,cat.id,model.id,m=>({...m,parts:m.parts.map(p=>p.id!==pid?p:{...p,values:{...p.values,[cid]:v}})}))}
                onColName={(cid,n)=>mutM(brand.id,cat.id,model.id,m=>({...m,columns:m.columns.map(c=>c.id!==cid?c:{...c,name:n})}))}
                onMoveCol={(cid,dir)=>mutM(brand.id,cat.id,model.id,m=>{const cols=[...m.columns];const idx=cols.findIndex(c=>c.id===cid);const ni=idx+dir;if(ni<0||ni>=cols.length)return m;[cols[idx],cols[ni]]=[cols[ni],cols[idx]];return{...m,columns:cols};})}
                onAddCol={()=>mutM(brand.id,cat.id,model.id,m=>{const cid=gid();return{...m,columns:[...m.columns,{id:cid,name:'עמודה חדשה'}],parts:m.parts.map(p=>({...p,values:{...p.values,[cid]:''}}))}})}
                onDelCol={cid=>{
                  const savedCols=[...model.columns];
                  const savedParts=JSON.parse(JSON.stringify(model.parts));
                  const colName=model.columns.find(c=>c.id===cid)?.name||cid;
                  mutM(brand.id,cat.id,model.id,m=>({...m,columns:m.columns.filter(c=>c.id!==cid),parts:m.parts.map(p=>{const v={...p.values};delete v[cid];return{...p,values:v}})}));
                  pushUndo(`ביטול מחיקת עמודה: ${colName}`,()=>{
                    mutM(brand.id,cat.id,model.id,m=>({...m,columns:savedCols,parts:savedParts}));
                  });
                }}
                onPaste={rows=>mutM(brand.id,cat.id,model.id,m=>({...m,parts:[...m.parts,...rows.map(r=>({id:gid(),discontinued:false,tags:'',pinned:false,comments:[],values:Object.fromEntries(m.columns.map((c,i)=>[c.id,r[i]||'']))}))]}))}
                onImgUpload={e=>handleImgUpload(e,brand.id,cat.id,model.id)}
                onDelImg={idx=>mutM(brand.id,cat.id,model.id,m=>({...m,images:m.images.filter((_,i)=>i!==idx)}))}
                onImgUrl={url=>mutM(brand.id,cat.id,model.id,m=>({...m,images:[...(m.images||[]),url]}))}
                onOpenImg={(imgs,idx)=>{setImgModal({imgs,idx});setImgZoom(1);}}
                onMove={(toBid,toCid)=>moveModel(brand.id,cat.id,model.id,toBid,toCid)}
                onDuplicate={()=>duplicateModel(brand.id,cat.id,model.id)}
                onCopyPartsFrom={(sb,sc,sm)=>copyPartsFrom(sb,sc,sm,brand.id,cat.id,model.id)}
                onAddToCart={addToCart}
                onOpenCompare={()=>setShowCompare(true)} onOpenCart={()=>setShowCart(true)} compareCount={compareList.length} cartCount={cart.length}
                reviewApprovals={makatApprovals}
                onReviewApprovalsChange={n=>{setMakatApprovals(n);try{localStorage.setItem('makat_approvals',JSON.stringify(n));}catch{}}}
                onReport={async text=>{await fbSaveReport({bid:brand.id,cid:cat.id,mid:model.id,modelName:model.name,brandName:brand.name,text,role:loginRole});alert('הדיווח נשלח למנהל');}}
                waDefaults={data.waDefaults||['nameHe','tadPn']}
              />
          }
          </div>
        </main>
      </div>


      {/* DRAWING VIEWER */}
      {imgModal.imgs.length>0&&(
        <ImageViewer imgs={imgModal.imgs} idx={imgModal.idx}
          onIdx={n=>setImgModal(p=>({...p,idx:n}))}
          onClose={()=>setImgModal({imgs:[],idx:0})}/>
      )}

      {/* COMMAND PALETTE + MOBILE TAB BAR */}
      <CommandPalette open={paletteOpen} onClose={()=>{setPaletteOpen(false);setQuery('');}}
        query={query} setQuery={setQuery} results={results} recent={recent} data={data} canSeeHidden={editor}
        onSelect={r=>nav(r.b.id,r.c.id,r.m.id,query)}/>
      <BottomNav isHome={!model} browseOpen={sidebar}
        onHome={goHome} onBrowse={()=>setSidebar(v=>!v)} onSearch={()=>setPaletteOpen(true)}
        onCart={()=>setShowCart(true)} onMenu={()=>setMenuOpen(v=>!v)} cartCount={cart.length}/>

      {/* PANELS */}
      {showCart     &&<CartPanel cart={cart} data={data} onRemove={removeFromCart} onClear={clearCart} onClose={()=>setShowCart(false)} waDefaults={data.waDefaults||['nameHe','tadPn']}/>}
      {showCompare  &&<ComparePanel compareList={compareList} data={data} onClose={()=>setShowCompare(false)} onRemove={mid=>setCompareList(p=>p.filter(x=>x.mid!==mid))}/>}
      {showMakatReview&&admin&&<MakatReviewPanel data={data} onClose={()=>setShowMakatReview(false)} approvals={makatApprovals}
        onApprove={key=>{const n={...makatApprovals,[key]:'ok'};setMakatApprovals(n);try{localStorage.setItem('makat_approvals',JSON.stringify(n));}catch{}}}
        onReject={key=>{const n={...makatApprovals,[key]:'fix'};setMakatApprovals(n);try{localStorage.setItem('makat_approvals',JSON.stringify(n));}catch{}}}
      />}
      {showNotif    &&<NotificationsPanel
        missingAlerts={missingAlerts} reports={reports} techRequests={techRequests} alerts={alerts}
        data={data} initialTab={notifInitTab}
        onNav={(bid,cid,mid)=>{nav(bid,cid,mid);setShowNotif(false);}}
        onResolve={async id=>{await fbResolveReport(id);fbGetReports().then(setReports);}}
        onResolveTech={async id=>{await fbResolveTechRequest(id);fbGetTechRequests().then(setTechRequests);}}
        onResolveAllReports={async()=>{await fbResolveAllReports();fbGetReports().then(setReports);}}
        onResolveAllTech={async()=>{await fbResolveAllTechRequests();fbGetTechRequests().then(setTechRequests);}}
        onClearAlerts={async()=>{await fbClearAlerts();fbGetAlerts().then(setAlerts);}}
        onClose={()=>setShowNotif(false)}/>}
      {showHelp     &&<HelpModal role={loginRole} onClose={()=>setShowHelp(false)}/>}
      {showDashboard&&<DashboardModal data={data} onClose={()=>setShowDashboard(false)}/>}
      {showNewsEditor&&<NewsEditorModal onClose={()=>{setShowNewsEditor(false);fbGetNews().then(docs=>setNewsItems(docs.map(d=>d.text)));}}/>}
      {showBroadcast&&<BroadcastModal currentMsg={data.systemMsg||''} onClose={()=>setShowBroadcast(false)}/>}
      {showUsersMgr &&<UsersManagerModal data={data} onSave={users=>{mut(d=>({...d,users}));setShowUsersMgr(false);alert('✅ המשתמשים עודכנו');}} onClose={()=>setShowUsersMgr(false)}/>}

      {showHistory&&(
        <Modal onClose={()=>setShowHistory(false)} title="📋 לוג פעילות" wide>
          <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
            <div style={{fontSize:12,color:'var(--sub)',flex:1}}>200 פעולות אחרונות</div>
            <button onClick={async()=>{if(!confirm('לאפס את הלוג לצמיתות?'))return;await fbClearHist();setHistData([]);}} style={sB('#e53935')}>🔄 איפוס לוג</button>
          </div>
          <div style={{maxHeight:'60vh',overflowY:'auto'}}>
            {!histData.length&&<div style={{textAlign:'center',color:'var(--sub)',padding:30}}>אין רשומות</div>}
            {histData.map((h,i)=>(
              <div key={h.id||i} style={{display:'flex',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border)',alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:'bold',fontSize:13,color:'var(--text)'}}>{h.action}</div>
                  <div style={{fontSize:11,color:'var(--sub)',marginTop:2}}>{h.model&&`דגם: ${h.model} · `}{h.brand&&`מותג: ${h.brand} · `}{h.count&&`כמות: ${h.count} · `}{h.parts&&`חלקים: ${h.parts} · `}{h.from&&`מ: ${h.from} → ${h.to} · `}משתמש: {h.actor||h.role||'?'}</div>
                </div>
                <div style={{fontSize:10,color:'var(--sub)',flexShrink:0}}>{h.ts}</div>
              </div>
            ))}
          </div>
          <button onClick={()=>setShowHistory(false)} style={{width:'100%',marginTop:14,...BST}}>סגור</button>
        </Modal>
      )}

      {showTipsEdit&&<TipsEditModal tips={tips} onSave={newTips=>{mut(d=>({...d,tips:newTips}));setShowTipsEdit(false);}} onClose={()=>setShowTipsEdit(false)}/>}
      {/* UNDO SNACKBAR */}
      {showUndo&&(
        <div style={{position:'fixed',bottom:40,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'#323232',color:'#fff',borderRadius:10,padding:'12px 20px',display:'flex',alignItems:'center',gap:14,boxShadow:'0 4px 20px rgba(0,0,0,.4)',animation:'fadeIn .2s',whiteSpace:'nowrap'}}>
          <span style={{fontSize:13}}>{showUndo.msg}</span>
          <button onClick={()=>{showUndo.fn();setShowUndo(null);}} style={{background:'#a5d6a7',border:'none',borderRadius:6,padding:'6px 14px',cursor:'pointer',fontWeight:'bold',color:'#1b5e20',fontSize:12}}>↩ בטל מחיקה</button>
          <button onClick={()=>setShowUndo(null)} style={{background:'none',border:'none',color:'#aaa',cursor:'pointer',fontSize:16}}>✕</button>
        </div>
      )}

      {/* UNDO HISTORY BUTTON (for editor/admin) */}
      {undoStack.length>0&&!showUndo&&(
        <div style={{position:'fixed',bottom:40,left:16,zIndex:998}}>
          <button onClick={()=>{const last=undoStack[0];if(last){last.restoreFn();setUndoStack(p=>p.slice(1));alert('✅ הפעולה בוטלה: '+last.msg);}}}
            style={{background:'#546e7a',color:'#fff',border:'none',borderRadius:20,padding:'8px 16px',cursor:'pointer',fontSize:12,fontWeight:'bold',boxShadow:'0 2px 8px rgba(0,0,0,.3)'}}>
            ↩ בטל ({undoStack.length})
          </button>
        </div>
      )}

      {chPwd    &&<ChangePwd   data={data} onSave={d=>{mut(()=>({...d}));setChPwd(false);alert('✅ נשמר');}} onClose={()=>setChPwd(false)}/>}
      {brandMgr &&<BrandMgr   data={data} onSave={brands=>{mut(d=>({...d,brands}));setBrandMgr(false);}} onClose={()=>setBrandMgr(false)}/>}
      {showXls  &&<XlsImportModal data={data} onImport={importFromXls} onClose={()=>setShowXls(false)}/>}
      {showBulkMove&&<BulkMoveModal data={data} onMove={bulkMoveModels} onClose={()=>setShowBulkMove(false)}/>}
      {showBulkDel &&<BulkDeleteModal data={data} onDelete={bulkDeleteModels} onClose={()=>setShowBulkDel(false)}/>}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
