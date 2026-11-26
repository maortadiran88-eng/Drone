const { useState, useEffect, useMemo, useRef } = React;

// במובייל התפריט נפתח כגיליון תחתון מחוץ לכותרת (portal), כדי שלא ייתפס בתוך הכותרת השקופה
// האם הנתונים אחרי שמירה זהים בתוכן לנתונים לפניה (נרמול בלבד)? משמש להחלטה אם לשמור את היסטוריית הביטול
function histAdoptNoop(prev, next){
  if (!prev || !next) return false;
  if (!syncEq(syncSlimMeta(prev), syncSlimMeta(next))) return false;
  const norm = m => { const d = syncModelDoc(m); return {...d, parts:d.parts.map(syncDefaults)}; };
  const A = new Map(syncAllModels(prev).map(x => [x.m.id, x.m])), all = syncAllModels(next);
  if (all.length !== A.size) return false;
  return all.every(({m}) => { const o = A.get(m.id); return !!o && (o === m || syncDocEq(norm(o), norm(m))); });
}

function MenuHost({mob,children}){ return mob ? ReactDOM.createPortal(children, document.body) : children; }

function App() {
  const [data,           setData]           = useState(null);
  const [loaded,         setLoaded]         = useState(false);
  const [saving,         setSaving]         = useState('');
  const [saveErr,        setSaveErr]        = useState('');
  const [savedAt,        setSavedAt]        = useState(null);
  const [loadErr,        setLoadErr]        = useState(false);
  const [loginRole,      setLoginRole]      = useState(null);
  const [sessionTried,   setSessionTried]   = useState(false);
  const loadStartRef = useRef(Date.now());
  const [loginLabel,     setLoginLabel]     = useState('');
  const [sel,            setSel]            = useState(null);
  const [dark,           setDark]           = useState(() => localStorage.getItem('ac_dark')==='1');
  const [techMode,       setTechMode]       = useState(() => { try{ return localStorage.getItem('ac_tech')==='1'; }catch(e){ return false; } });
  const [sidebar,        setSidebar]        = useState(false);
  const [isMob,          setIsMob]          = useState(() => window.innerWidth <= 720);
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
  const [showQuality,setShowQuality]= useState(false);
  const [makatApprovals, setMakatApprovals] = useState(()=>{try{return JSON.parse(localStorage.getItem('makat_approvals')||'{}');}catch{return{};}});
  const [notifInitTab,   setNotifInitTab]   = useState('missing');
  const [reports,        setReports]        = useState([]);
  const [techRequests,   setTechRequests]   = useState([]);
  const [alerts,         setAlerts]         = useState([]);
  const [histData,       setHistData]       = useState([]);
  const [showHistory,    setShowHistory]    = useState(false);
  const [brandMgr,       setBrandMgr]       = useState(false);
  const [sbEdit,         setSbEdit]         = useState(false);
  const [localMode,      setLocalMode]      = useState(false);
  const [localInfo,      setLocalInfo]      = useState(null);
  const [showBackup,     setShowBackup]     = useState(false);
  const [showFR,         setShowFR]         = useState(false);
  const [showHub,        setShowHub]        = useState(false);
  const localModeRef = useRef(false);
  const [showTrash,      setShowTrash]      = useState(false);
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
  const dirtyRef     = useRef(false);   // true while there are changes that are not on the server yet
  const savePromise  = useRef(null);
  const histPast = useRef([]), histFuture = useRef([]), histPrev = useRef(null), histApplying = useRef(false), histLast = useRef(0);
  const [histVer, setHistVer] = useState(0);
  const adoptedData  = useRef(null);    // data we just replaced with other editors' changes (not a local edit)
  const runSaveRef   = useRef(null);

  const admin  = loginRole==='admin';
  const editor = loginRole==='editor' || loginRole==='admin';
  const viewer = loginRole==='viewer';

  useEffect(() => { document.documentElement.classList.toggle('dark', !!dark); }, [dark]);
  useEffect(() => { const t=setInterval(()=>setNow(new Date()),1000); return()=>clearInterval(t); }, []);

  useEffect(() => {
    const loadFromServer = () => {
      fbLoad().then(d => { setData(d||INIT()); setLoaded(true); setLoadErr(false); OFFLINE_ST.fromCache = false; }).catch(() => {
        setLoadErr(true);
        offlineLoad().then(c => {
          if (c) { OFFLINE_ST.fromCache = true; OFFLINE_ST.savedAt = c.savedAt; setData(c.data); }
          else setData(INIT());
          setLoaded(true);
        });
      });
      fbGetNews().then(docs => setNewsItems(docs.map(d=>d.text)));
      fbGetBroadcast().then(b => { if(b&&b.active) setBroadcast(b.msg); });
    };
    let wasLocal = false; try { wasLocal = localStorage.getItem('ac_localmode') === '1'; } catch(e) {}
    if (!wasLocal) { loadFromServer(); return; }
    // נשארנו במצב עבודה מקומית: טוענים את העבודה השמורה במחשב ולא מהשרת (כדי לא לדרוס אותה בטעות)
    workLoad().then(w => {
      if (!w) { try { localStorage.removeItem('ac_localmode'); } catch(e) {} loadFromServer(); return; }
      localModeRef.current = true; window.__LOCAL_MODE__ = true; setLocalMode(true);
      setLocalInfo({savedAt:w.savedAt, fileName:'', fileOk:false});
      localInit().then(n => setLocalInfo(i => ({...(i||{}), fileName:n})));
      setData(w.data); setLoaded(true);
    });
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
    rej(new Error('Firebase לא אישר את השמירה תוך '+Math.round(ms/1000)+' שניות. השינויים שמורים בזיכרון, והמערכת תנסה שוב אוטומטית. אל תרענן את הדף.'));
  }, ms))]);
  // שמירה מקומית (מצב עבודה מקומית): ל-IndexedDB ולקובץ במחשב, לא לשרת
  const runLocalSave = async () => {
    const snap = latestData.current; if (!snap) return;
    try {
      setSaving('saving');
      const info = await localPersist(snap);
      dirtyRef.current = false; setSaving('saved'); setSavedAt(new Date());
      setLocalInfo({...info, fileName: LOCAL_ST.fileName});
    } catch(e) { setSaving('error'); setSaveErr('השמירה במחשב נכשלה: ' + (e && e.message || e)); }
  };
  const runSave = () => {
    if (localModeRef.current) return runLocalSave();
    if (saveInFlight.current) { saveAgain.current = true; return savePromise.current; }
    saveInFlight.current = true;
    savePromise.current = (async () => {
      try {
        do {
          saveAgain.current = false;
          setSaving('saving');
          const snap = latestData.current;
          // Capture + clear BEFORE awaiting — edits made mid-save go to a fresh Set
          // רק סימונים של דגמים שנמצאים בצילום הזה נצרכים; השאר (למשל דגם ששוחזר ברגע שהצילום כבר נלקח) נשארים לשמירה הבאה
          let midsToSave = changedMids.current;
          try {
            const inSnap = new Set(snap ? syncAllModels(snap).map(x=>x.m.id) : []);
            if (snap) {
              midsToSave = new Set([...changedMids.current].filter(id => inSnap.has(id)));
              changedMids.current = new Set([...changedMids.current].filter(id => !inSnap.has(id)));
            } else changedMids.current = new Set();
          } catch(e) { changedMids.current = new Set(); }
          try {
            // merge-save in transactions (see sync.js / firebase.js): two editors saving together both keep their changes
            const res = await withTimeout(fbSave(snap, midsToSave), 90000);
            if (res) setData(d => { const n = fbIncorporate(res, d); if (n !== d) adoptedData.current = n; return n; });
            saveCount.current++;
            if (saveCount.current % 5 === 0) fbSaveSnapshot(snap, loginLabel||loginRole||'system', 'שמירה אוטומטית');
            clearTimeout(retryTimer.current);
            setSaveErr('');
            // edits that arrived while we were saving are still waiting for their own save
            if (latestData.current === snap || latestData.current === adoptedData.current) { dirtyRef.current = false; setSaving('saved'); setSavedAt(new Date()); }
            else setSaving('dirty');
          } catch(e) {
            // Put the ids back so the next save retries them instead of losing them
            midsToSave.forEach(id => changedMids.current.add(id));
            dirtyRef.current = true;
            setSaving('error'); setSaveErr(e.message||String(e));
            if (!e.nonRetryable) { clearTimeout(retryTimer.current); retryTimer.current = setTimeout(() => runSaveRef.current && runSaveRef.current(), 8000); }
            break;
          }
        } while (saveAgain.current);
      } finally { saveInFlight.current = false; }
    })();
    return savePromise.current;
  };
  runSaveRef.current = runSave;
  // Save right now (used on logout / when the tab is hidden). Resolves to true when everything is on the server.
  const flushSave = async () => {
    clearTimeout(saveTimer.current);
    if (!dirtyRef.current && saving !== 'error') return true;
    await runSave();
    return !dirtyRef.current;
  };
  useEffect(() => {
    if (!loaded||!data) return;
    latestData.current = data;
    if (firstLoad.current) { firstLoad.current=false; histPrev.current=data; return; }
    if (adoptedData.current === data) {                                        // just showing other editors' changes
      adoptedData.current = null;
      // אחרי כל שמירה הנתונים מוחלפים בגרסה "מנורמלת" עם אותו תוכן. רק אם עורך אחר שינה משהו באמת מנקים את היסטוריית הביטול (כדי לא לבטל שינויים של אחרים)
      let noop = false; try { noop = histAdoptNoop(histPrev.current, data); } catch(e) {}
      if (!noop) { histPast.current=[]; histFuture.current=[]; setHistVer(v=>v+1); }
      histPrev.current = data; return;
    }
    // היסטוריית ביטול גלובלית: כל שינוי מקומי נשמר כצעד; רצף עריכות מהיר (הקלדה) הוא צעד אחד
    if (histApplying.current) histApplying.current = false;
    else if (histPrev.current && histPrev.current !== data) {
      const nowTs = Date.now();
      if (nowTs - histLast.current > 900 || !histPast.current.length) { histPast.current.push(histPrev.current); if (histPast.current.length > 60) histPast.current.shift(); }
      histLast.current = nowTs; histFuture.current = []; setHistVer(v=>v+1);
    }
    histPrev.current = data;
    dirtyRef.current = true;
    setSaving('dirty');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => runSaveRef.current && runSaveRef.current(), 1200);
  }, [data, loaded]);
  // never lose work: warn before closing with unsaved changes, and save as soon as the tab is hidden
  useEffect(() => {
    const warn = e => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; return ''; } };
    const hide = e => { if (dirtyRef.current && (e.type==='pagehide' || document.visibilityState==='hidden')) { clearTimeout(saveTimer.current); runSaveRef.current && runSaveRef.current(); } };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('visibilitychange', hide); window.removeEventListener('pagehide', hide); };
  }, []);

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
    if (window.innerWidth<=720) setSidebar(false);
  };
  // קישור ישיר לדגם (?b=&c=&m=) — נפתח אוטומטית אחרי כניסה, פעם אחת
  // עותק מקומי לצפייה בלי קליטה: נשמר פעם אחת אחרי כניסה, רק אם הקטלוג נטען מהשרת
  const offlineCached = useRef(false);
  useEffect(()=>{
    if (offlineCached.current || !data || !loginRole || loadErr || !loaded) return;
    offlineCached.current = true;
    setTimeout(()=>offlineSave(data, editor), 4000);
  },[data,loginRole,loadErr,loaded]);
  // כניסה שמורה: אם נכנסת ב-יומיים ימים האחרונים לא צריך להקליד סיסמה שוב
  useEffect(()=>{
    if (!loaded || !data || sessionTried) return;
    const r = restoreSession(data.users || DEFAULT_USERS);
    if (r) { setLoginRole(r.role); setLoginLabel(r.label || r.role); }
    setSessionTried(true);
  },[loaded,data]);
  // מובייל? + גובה הכותרת (למיקום מגירת המותגים מתחתיה)
  useEffect(()=>{
    const onR = () => {
      setIsMob(window.innerWidth <= 720);
      const h = headerRef.current && headerRef.current.offsetHeight;
      if (h) document.documentElement.style.setProperty('--hdr-h', h + 'px');
    };
    onR(); window.addEventListener('resize', onR);
    const ro = (window.ResizeObserver && headerRef.current) ? new ResizeObserver(onR) : null;
    if (ro) ro.observe(headerRef.current);
    return () => { window.removeEventListener('resize', onR); if (ro) ro.disconnect(); };
  },[loginRole, loaded]);
  // תזכורת גיבוי למנהל: אם לא הורד גיבוי מלא מעל שבועיים (פעם ביום לכל היותר)
  useEffect(()=>{
    if (!admin || !loaded || localMode) return;
    try {
      const day = 864e5, last = Number(localStorage.getItem('ac_last_backup')||0), nag = Number(localStorage.getItem('ac_backup_nag')||0);
      if (Date.now()-nag < day) return;
      if (!last || Date.now()-last > 14*day) {
        localStorage.setItem('ac_backup_nag', String(Date.now()));
        setTimeout(()=>{ window.toast && window.toast(last ? '💾 עברו '+Math.floor((Date.now()-last)/day)+' ימים מהגיבוי האחרון. תפריט ⋮ ← גיבוי ועבודה במחשב' : '💾 עדיין לא הורדת גיבוי מלא. תפריט ⋮ ← גיבוי ועבודה במחשב'); }, 3500);
      }
    } catch(e) {}
  },[admin,loaded]);
  const deepLinkDone = useRef(false);
  useEffect(()=>{
    if (deepLinkDone.current || !data || !loginRole) return;
    deepLinkDone.current = true;
    let q; try { q = new URLSearchParams(window.location.search); } catch(e) { return; }
    const bid=q.get('b'), cid=q.get('c'), mid=q.get('m'); if (!bid||!cid||!mid) return;
    const b=data.brands.find(x=>x.id===bid);
    const c=b&&b.categories.find(x=>x.id===cid);
    const m=c&&[...c.models,...(c.subCategories||[]).flatMap(sc=>sc.models)].find(x=>x.id===mid);
    try { window.history.replaceState(null,'',window.location.pathname); } catch(e) {}
    if (!m || (!editor && (b.hidden||m.hidden))) { if (window.toast) window.toast('הדגם מהקישור לא נמצא או לא זמין'); return; }
    nav(bid,cid,mid);
  },[data,loginRole]);

  const goBack = () => { if(navStack.current.length>0){const p=navStack.current.pop();setSel(p);}else setSel(null); };
  const goHome = () => { setSel(null); setQuery(''); navStack.current=[]; };

  const mut  = fn => setData(d => fn(d));
  const mutM = (bid,cid,mid,fn) => { changedMids.current.add(mid); mut(d=>({...d,brands:updBrands(d.brands,bid,cid,mid,fn)})); };

  // ── ביטול / ביצוע מחדש גלובלי (Ctrl+Z / Ctrl+Y) ──
  const histApply = dir => {
    const from = dir<0 ? histPast : histFuture, to = dir<0 ? histFuture : histPast;
    if (!from.current.length) return false;
    const cur = latestData.current || data, target = from.current.pop();
    to.current.push(cur);
    // דגמים ששונו בין שני המצבים נשמרים מחדש בשרת
    const A = new Map(syncAllModels(cur).map(x=>[x.m.id,x.m])), B = new Map(syncAllModels(target).map(x=>[x.m.id,x.m]));
    const changed = new Set();
    B.forEach((m,id)=>{ if (A.get(id)!==m) { changed.add(id); changedMids.current.add(id); } });
    A.forEach((m,id)=>{ if (!B.has(id)) changedMids.current.add(id); });
    // שדות ברירת המחדל של חלקים (הסתר/הופסק וכו') נכתבים במפורש, אחרת מיזוג השרת רואה "שדה חסר" כ"בלי שינוי" ולא מבטל
    const restored = syncMapModels(target, m => changed.has(m.id) ? {...m, parts:(m.parts||[]).map(syncDefaults)} : m);
    histApplying.current = true;
    setData(restored);
    setSel(s => (s && !B.has(s.mid)) ? null : s);
    setHistVer(v=>v+1);
    if (window.toast) window.toast(dir<0 ? '↶ הפעולה האחרונה בוטלה' : '↷ הפעולה בוצעה מחדש');
    return true;
  };
  const undoAll = () => histApply(-1), redoAll = () => histApply(1);
  const undoRef = useRef(null); undoRef.current = {undo:undoAll, redo:redoAll};
  useEffect(()=>{
    const onKey = e => {
      if (!(e.ctrlKey||e.metaKey)) return;
      const t = e.target, tag = t && t.tagName;
      if (tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)) return;   // בשדות טקסט נשאר הביטול של הדפדפן
      const k = (e.key||'').toLowerCase();
      if (k==='z' && !e.shiftKey) { if (undoRef.current.undo()) e.preventDefault(); }
      else if (k==='y' || (k==='z' && e.shiftKey)) { if (undoRef.current.redo()) e.preventDefault(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  },[]);

  // ── מרכז ניהול: פתיחת כלי לפי מפתח ──
  const openTool = k => {
    const guardTrash = () => { if (localModeRef.current) alert('סל המחזור זמין רק כשמחוברים לשרת'); else setShowTrash(true); };
    ({
      'brands-edit': () => { setSidebar(true); setSbEdit(true); },
      brandmgr: () => setBrandMgr(true), findreplace: () => setShowFR(true), xls: () => setShowXls(true),
      bulkmove: () => setShowBulkMove(true), bulkdel: () => setShowBulkDel(true),
      undo: () => undoAll(), trash: guardTrash, history: () => setShowHistory(true), backup: () => setShowBackup(true),
      quality: () => setShowQuality(true), makat: () => setShowMakatReview(true),
      users: () => setShowUsersMgr(true), pwd: () => setChPwd(true),
      notif: () => setShowNotif(true), news: () => setShowNewsEditor(true), broadcast: () => setShowBroadcast(true),
      tips: () => setShowTipsEdit(true), dashboard: () => setShowDashboard(true),
    }[k] || (() => {}))();
  };
  // חיפוש והחלפה: מחיל את ההחלפות שנבחרו (גרסה נשמרת בהיסטוריה, ואפשר לבטל)
  const applyFindReplace = changes => {
    try { fbSaveSnapshot(data, loginLabel||loginRole, 'לפני חיפוש והחלפה'); } catch(e) {}
    const byMid = new Map();
    changes.forEach(c => { if (!byMid.has(c.mid)) byMid.set(c.mid, []); byMid.get(c.mid).push(c); });
    byMid.forEach((_, id) => changedMids.current.add(id));
    mut(d => syncMapModels(d, m => {
      const list = byMid.get(m.id); if (!list) return m;
      return {...m, parts:(m.parts||[]).map(p => {
        const mine = list.filter(c => c.pid === p.id); if (!mine.length) return p;
        const v = {...(p.values||{})}; mine.forEach(c => { v[c.field] = c.after; });
        return {...p, values:v};
      })};
    }));
    logAlert('edit', 'חיפוש והחלפה: ' + changes.length + ' תאים ב-' + byMid.size + ' דגמים');
    alert('✅ בוצעו ' + changes.length + ' החלפות ב-' + byMid.size + ' דגמים. אפשר לבטל עם ↶');
  };

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

  useEffect(()=>{ document.documentElement.classList.toggle('tech', techMode); },[techMode]);
  const toggleTech = () => setTechMode(v => { try{ localStorage.setItem('ac_tech',v?'0':'1'); }catch(e){} return !v; });
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
    if(!confirm(`להעביר ${sels.length} דגמים לסל המחזור?`))return;
    fbSaveSnapshot(data, loginLabel||loginRole, `לפני מחיקת ${sels.length} דגמים`);
    try {
      const bt = gid();
      for (const s of sels) {
        const b=data.brands.find(x=>x.id===s.bid), c=b?.categories.find(x=>x.id===s.cid), m=c?.models.find(x=>x.id===s.mid);
        if (m) await trashPut({kind:'model',name:m.name,bid:b.id,bname:b.name,cid:c.id,cname:c.name,scid:null,scname:'',idx:c.models.findIndex(x=>x.id===m.id),batch:bt,deletedBy:loginLabel||loginRole}, JSON.parse(JSON.stringify(m)));
      }
    } catch(e) { if(!confirm('לא הצלחתי לשמור עותק בסל המחזור. למחוק בכל זאת?')) return; }

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

  // ── שינוי סדר (מצב עריכה בסרגל) ──
  const swapById = (arr,id,dir) => { const i=arr.findIndex(x=>x.id===id), j=i+dir; if(i<0||j<0||j>=arr.length) return arr; const n=arr.slice(); [n[i],n[j]]=[n[j],n[i]]; return n; };
  const moveBrandPos = (bid,dir) => mut(d=>({...d,brands:swapById(d.brands,bid,dir)}));
  const moveCatPos   = (bid,cid,dir) => mut(d=>({...d,brands:d.brands.map(b=>b.id!==bid?b:{...b,categories:swapById(b.categories,cid,dir)})}));
  const moveSubPos   = (bid,cid,scid,dir) => mut(d=>({...d,brands:d.brands.map(b=>b.id!==bid?b:{...b,categories:b.categories.map(c=>c.id!==cid?c:{...c,subCategories:swapById(c.subCategories||[],scid,dir)})})}));
  const moveModelPos = (bid,cid,scid,mid,dir) => mut(d=>({...d,brands:d.brands.map(b=>b.id!==bid?b:{...b,categories:b.categories.map(c=>c.id!==cid?c:(scid
    ? {...c,subCategories:(c.subCategories||[]).map(sc=>sc.id!==scid?sc:{...sc,models:swapById(sc.models,mid,dir)})}
    : {...c,models:swapById(c.models,mid,dir)}))})}));

  // ── סל מחזור: שחזור פריט למקומו (דגם / קטגוריה / תת-קטגוריה עם הדגמים שבהם) ──
  const restoreFromTrash = async (rec, related) => {
    const brand = data.brands.find(b=>b.id===rec.bid);
    if (!brand) { alert('המותג "'+rec.bname+'" כבר לא קיים, לא ניתן לשחזר.'); return false; }
    const recs = rec.kind==='model' ? [rec] : [rec,...related];
    const loaded = [];
    for (const r of recs) loaded.push({r, p: await trashRead(r)});
    // חשוב: לסמן את הדגמים לשמירה לפני ה-mut (השמירה קוראת את הסימון ברגע שהיא מתחילה), אחרת מסמך החלקים לא נכתב מחדש
    loaded.forEach(({r,p})=>{ if(r.kind==='model') changedMids.current.add(p.id); });
    mut(d=>({...d,brands:d.brands.map(bb=>{
      if (bb.id!==rec.bid) return bb;
      let cats = bb.categories.slice();
      const ensureCat = r => { if(!cats.some(x=>x.id===r.cid)) cats=[...cats,{id:r.cid,name:r.cname||'שוחזר',models:[],subCategories:[]}]; };
      for (const {r,p} of loaded) {
        if (r.kind==='category') { if(!cats.some(x=>x.id===p.id)) cats=[...cats,{id:p.id,name:p.name,models:[],subCategories:(p.subCategories||[]).map(s=>({id:s.id,name:s.name,models:[]}))}]; }
        else if (r.kind==='subcategory') { ensureCat(r); cats=cats.map(c=>c.id!==r.cid?c:((c.subCategories||[]).some(s=>s.id===p.id)?c:{...c,subCategories:[...(c.subCategories||[]),{id:p.id,name:p.name,models:[]}]})); }
      }
      for (const {r,p} of loaded) {
        if (r.kind!=='model') continue;
        ensureCat(r);
        const ins = arr => { if(arr.some(x=>x.id===p.id)) return arr; const at=Math.min(r.idx==null?arr.length:r.idx,arr.length); return [...arr.slice(0,at),p,...arr.slice(at)]; };
        cats = cats.map(c=>{
          if (c.id!==r.cid) return c;
          if (r.scid) { let subs=c.subCategories||[]; if(!subs.some(s=>s.id===r.scid)) subs=[...subs,{id:r.scid,name:r.scname||'שוחזר',models:[]}]; return {...c,subCategories:subs.map(s=>s.id!==r.scid?s:{...s,models:ins(s.models)})}; }
          return {...c,models:ins(c.models)};
        });
      }
      return {...bb,categories:cats};
    })}));
    for (const r of recs) await trashRemove(r);
    logAlert('add','שוחזר מסל המחזור: '+rec.name+' ('+rec.bname+')');
    alert('✅ שוחזר: '+rec.name);
    return true;
  };

  // ── מצב עבודה מקומית ──
  const startLocalMode = async (d) => {
    const info = await localPersist(d);
    try { localStorage.setItem('ac_localmode','1'); } catch(e) {}
    localModeRef.current = true; window.__LOCAL_MODE__ = true; setLocalMode(true);
    setLocalInfo({...info, fileName: LOCAL_ST.fileName});
    setLoadErr(false); OFFLINE_ST.fromCache = false;
    if (d !== data) { latestData.current = d; setData(d); setSel(null); }
    localInit().then(n => setLocalInfo(i => ({...(i||{}), fileName:n})));
  };
  const pickLocalFile = async () => {
    try {
      const name = await localPickFile();
      const info = await localPersist(latestData.current || data);
      setLocalInfo({...info, fileName:name});
      alert('✅ נבחר הקובץ '+name+'. כל שמירה תתעדכן גם בו');
    } catch(e) { if (!(e && e.name === 'AbortError')) alert('לא ניתן לבחור קובץ בדפדפן הזה'); }
  };
  const uploadLocalToServer = async () => {
    if (!confirm('להעלות את העבודה המקומית לשרת?\nמצב השרת הנוכחי יישמר בהיסטוריה (גרסאות) ויוחלף בעבודה המקומית.')) return;
    try {
      const local = latestData.current || data;
      await localPersist(local);                         // עותק בטוח לפני כל דבר
      const server = await fbLoad();                     // קובע בסיס מיזוג מול השרת ומאשר שמירה
      try { await fbSaveSnapshot(server, (loginLabel||loginRole)+' (לפני העלאה ממצב מקומי)', 'לפני העלאה ממצב עבודה מקומית'); } catch(e) {}
      localModeRef.current = false; window.__LOCAL_MODE__ = false; setLocalMode(false);
      try { localStorage.removeItem('ac_localmode'); } catch(e) {}
      changedMids.current = new Set(syncAllModels(local).map(x=>x.m.id));
      setLoadErr(false); OFFLINE_ST.fromCache = false;
      setData({...local});                               // אובייקט חדש כדי שהשמירה האוטומטית תרוץ
      alert('✅ העבודה המקומית הועלתה לשרת');
    } catch(e) { alert('לא ניתן להתחבר לשרת, העבודה נשארת מקומית ושמורה במחשב.\n('+(e && e.message || e)+')'); }
  };
  const discardLocalMode = () => {
    if (!confirm('לבטל את העבודה המקומית ולחזור לנתוני השרת?\nהעותק המקומי נשאר במחשב כגיבוי, אבל השינויים שבו לא יועלו.')) return;
    try { localStorage.removeItem('ac_localmode'); } catch(e) {}
    location.reload();
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

  // copy only the parts the user ticked into another model (columns are matched by id, then by name; missing ones are added)
  const copyPartsTo = (tb,tc,tm,parts,srcCols,skipDup) => {
    if(!parts.length)return;
    const target=data.brands.find(b=>b.id===tb)?.categories.find(c=>c.id===tc);
    const tm0=target&&[...target.models,...(target.subCategories||[]).flatMap(sc=>sc.models)].find(m=>m.id===tm);
    if(!tm0)return;
    const r=copyPartsInto(tm0,parts,srcCols,skipDup,gid);
    changedMids.current.add(tm);
    mutM(tb,tc,tm,m=>copyPartsInto(m,parts,srcCols,skipDup,gid).model);
    logAction('העתקת חלקים נבחרים',{count:parts.length,to:tm});
    setTimeout(()=>alert('✅ '+r.n+' חלקים הועתקו'+(r.skipped?(' ('+r.skipped+' דולגו כי כבר קיימים)'):'')+'. ההעתקה נשמרת אוטומטית.'),0);
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
    a.click(); markBackupDone();
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
        <div className="ld-spin" style={{width:34,height:34,margin:'0 auto',border:'3px solid var(--border2)',borderTop:'3px solid var(--cyan)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
        <div style={{fontSize:12.5,color:'var(--sub)',marginTop:16,fontWeight:600}}>{(()=>{const p=window.__LOAD_PROGRESS__;return p&&p.total?`טוען קטלוג… ${Math.min(p.done,p.total)} / ${p.total}`:'טוען...';})()}</div>
        {Date.now()-loadStartRef.current>12000&&(
          <div style={{marginTop:18,display:'flex',flexDirection:'column',gap:10,alignItems:'center'}}>
            <div style={{fontSize:12.5,color:'var(--sub)',maxWidth:260,lineHeight:1.5}}>הטעינה איטית מהרגיל. בדוק את החיבור לאינטרנט.</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
              <button className="btn btn-primary" onClick={()=>location.reload()}>נסה שוב</button>
              <button className="btn btn-secondary" onClick={()=>{workLoad().then(w=>{if(w){localModeRef.current=true;window.__LOCAL_MODE__=true;setLocalMode(true);setLocalInfo({savedAt:w.savedAt,fileName:'',fileOk:false});try{localStorage.setItem('ac_localmode','1');}catch(e){}setData(w.data);setLoaded(true);}else alert('אין עבודה מקומית שמורה במכשיר.');});}}>פתח עבודה מקומית</button>
              <button className="btn btn-secondary" onClick={()=>{offlineLoad().then(c=>{if(c){OFFLINE_ST.fromCache=true;OFFLINE_ST.savedAt=c.savedAt;setData(c.data);setLoadErr(true);setLoaded(true);}else alert('אין עותק שמור במכשיר. נדרש חיבור לאינטרנט לפתיחה ראשונה.');});}}>פתח עותק שמור</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!loginRole) return !sessionTried ? null : <LoginScreen data={data} onLogin={(role,id,label)=>{setLoginRole(role);setLoginLabel(label||role);}}/>;

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
            {editor&&<SaveBadge status={saving} savedAt={savedAt} err={saveErr} onRetry={()=>{runSave();}}/>}
          {editor&&<><button className="hdr-btn hdr-undo tt tt-hdr" data-tt="ביטול פעולה אחרונה (Ctrl+Z)" aria-label="ביטול פעולה אחרונה" disabled={!histPast.current.length} onClick={undoAll} style={{fontSize:17}}>↶</button><button className="hdr-btn hdr-undo tt tt-hdr" data-tt="ביצוע מחדש (Ctrl+Y)" aria-label="ביצוע מחדש" disabled={!histFuture.current.length} onClick={redoAll} style={{fontSize:17}}>↷</button></>}
          <div className="menu-wrap">
            <button onClick={()=>setMenuOpen(v=>!v)} className={'hdr-btn tt tt-hdr tt-l'+(menuOpen?' on':'')} data-tt="תפריט ראשי: השוואה, סל, מצב כהה ועוד" aria-label="תפריט"><Ic n="dots" s={19}/></button>
            {menuOpen&&<MenuHost mob={isMob}>
              <div className="menu-scrim" onClick={()=>setMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:240}}/>
              <div className="menu-panel" dir="rtl" style={{left:0,minWidth:250}}>
                <button className="menu-item" onClick={()=>{goHome();setMenuOpen(false);}}><span className="ic"><Ic n="home" s={17}/></span>מסך הבית</button>
                {sel&&<button className="menu-item" onClick={()=>{goBack();setMenuOpen(false);}}><span className="ic"><Ic n="back" s={17}/></span>חזור אחורה</button>}
                <button className="menu-item" onClick={()=>{setShowCompare(true);setMenuOpen(false);}}><span className="ic"><Ic n="compare" s={17}/></span>השוואת דגמים{compareList.length>0&&<span className="tc-meta" style={{marginRight:'auto'}}>({compareList.length})</span>}</button>
                <button className="menu-item" onClick={()=>{setShowCart(true);setMenuOpen(false);}}><span className="ic"><Ic n="cart" s={17}/></span>סל חלקים{cart.length>0&&<span className="tc-meta" style={{marginRight:'auto'}}>({cart.length})</span>}</button>
                <button className="menu-item" onClick={()=>{setShowHelp(true);setMenuOpen(false);}}><span className="ic"><Ic n="help" s={17}/></span>מדריך שימוש</button>
                {editor&&<button className="menu-item" onClick={()=>{openNotif();setMenuOpen(false);}}><span className="ic"><Ic n="bell" s={17}/></span>התראות{notifCount>0&&<span className="tc-meta" style={{marginRight:'auto'}}>({notifCount})</span>}</button>}
                <div className="menu-divider"/>
                <div className="menu-label">תצוגה</div>
                <button className="menu-item" onClick={()=>{toggleDark();}}><span className="ic"><Ic n={dark?'sun':'moon'} s={17}/></span>{dark?'מצב בהיר':'מצב כהה'}</button>
                <button className="menu-item" onClick={()=>{toggleTech();}}><span className="ic"><Ic n="wrench" s={17}/></span>{techMode?'כבה מצב טכנאי':'מצב טכנאי (תצוגה גדולה)'}</button>
                {typeof canInstallApp==='function'&&canInstallApp()&&<button className="menu-item" onClick={()=>{installApp();setMenuOpen(false);}}><span className="ic"><Ic n="phone" s={17}/></span>התקנה כאפליקציה</button>}
                {editor&&<>
                <div className="menu-divider"/>
                <div className="menu-label">עריכה</div>
                <button className="menu-item" onClick={()=>{setShowHub(true);setMenuOpen(false);}}><span className="ic"><Ic n="settings" s={17}/></span>מרכז ניהול</button>
                <button className="menu-item" onClick={()=>{setShowFR(true);setMenuOpen(false);}}><span className="ic"><Ic n="search" s={17}/></span>חיפוש והחלפה בקטלוג</button>
                <button className="menu-item" disabled={!histPast.current.length} onClick={()=>{undoAll();setMenuOpen(false);}}><span className="ic" style={{fontSize:17,lineHeight:1}}>↶</span>ביטול פעולה אחרונה{histPast.current.length?` (${histPast.current.length})`:''}</button>
                <button className="menu-item" disabled={!histFuture.current.length} onClick={()=>{redoAll();setMenuOpen(false);}}><span className="ic" style={{fontSize:17,lineHeight:1}}>↷</span>ביצוע מחדש{histFuture.current.length?` (${histFuture.current.length})`:''}</button>
                <button className="menu-item" onClick={()=>{setShowXls(true);setMenuOpen(false);}}><span className="ic"><Ic n="import" s={17}/></span>ייבוא מ-Excel</button>
                {!admin&&<>
                <button className="menu-item" onClick={()=>{setShowNewsEditor(true);setMenuOpen(false);}}><span className="ic"><Ic n="news" s={17}/></span>עריכת חדשות</button>
                <button className="menu-item" onClick={()=>{setShowBroadcast(true);setMenuOpen(false);}}><span className="ic"><Ic n="megaphone" s={17}/></span>שליחת הודעת מערכת</button>
                <button className="menu-item" onClick={()=>{setShowDashboard(true);setMenuOpen(false);}}><span className="ic"><Ic n="chart" s={17}/></span>דשבורד</button>
                </>}
                </>}
                {admin&&<>
                <div className="menu-divider"/>
                <div className="menu-label">ניהול</div>
                  <button className="menu-item" onClick={()=>{setBrandMgr(true);setMenuOpen(false);}}><span className="ic"><Ic n="settings" s={17}/></span>ניהול מותגים</button>
                  <button className="menu-item" onClick={()=>{setShowUsersMgr(true);setMenuOpen(false);}}><span className="ic"><Ic n="users" s={17}/></span>ניהול משתמשים</button>
                  <button className="menu-item" onClick={()=>{setChPwd(true);setMenuOpen(false);}}><span className="ic"><Ic n="key" s={17}/></span>שינוי סיסמה</button>
                  <button className="menu-item" onClick={()=>{setShowDashboard(true);setMenuOpen(false);}}><span className="ic"><Ic n="chart" s={17}/></span>דשבורד</button>
                {admin&&<button className="menu-item" onClick={()=>{setShowMakatReview(true);setMenuOpen(false);}}><span className="ic"><Ic n="checkc" s={17}/></span>בדיקת מק"טים</button>}
                {admin&&<button className="menu-item" onClick={()=>{setShowQuality(true);setMenuOpen(false);}}><span className="ic"><Ic n="chart" s={17}/></span>בדיקת איכות נתונים</button>}
                {admin&&<button className="menu-item" onClick={()=>{if(localModeRef.current){alert('סל המחזור זמין רק כשמחוברים לשרת');}else setShowTrash(true);setMenuOpen(false);}}><span className="ic"><Ic n="trash" s={17}/></span>סל מחזור</button>}
                <div className="menu-divider"/>
                <div className="menu-label">תוכן</div>
                  <button className="menu-item" onClick={()=>{setShowNewsEditor(true);setMenuOpen(false);}}><span className="ic"><Ic n="news" s={17}/></span>עריכת חדשות</button>
                  <button className="menu-item" onClick={()=>{setShowBroadcast(true);setMenuOpen(false);}}><span className="ic"><Ic n="megaphone" s={17}/></span>הודעת מערכת</button>
                  <button className="menu-item" onClick={()=>{setShowHistory(true);fbGetHist().then(setHistData);setMenuOpen(false);}}><span className="ic"><Ic n="history" s={17}/></span>היסטוריה / גרסאות</button>
                <div className="menu-divider"/>
                <div className="menu-label">גיבוי וייצוא</div>
                  <button className="menu-item" onClick={()=>{expXLS();setMenuOpen(false);}}><span className="ic"><Ic n="sheet" s={17}/></span>ייצוא ל-Excel</button>
                  <button className="menu-item" onClick={()=>{setShowBackup(true);setMenuOpen(false);}}><span className="ic"><Ic n="save" s={17}/></span>גיבוי ועבודה במחשב</button>
                  <button className="menu-item" onClick={()=>{expJSON();setMenuOpen(false);}}><span className="ic"><Ic n="save" s={17}/></span>ייצוא גיבוי (JSON)</button>
                  <label className="menu-item" style={{cursor:'pointer'}}>
                    <span className="ic"><Ic n="folder" s={17}/></span>ייבוא גיבוי (JSON)
                    <input type="file" accept=".json" onChange={e=>{impFile(e);setMenuOpen(false);}} style={{display:'none'}}/>
                  </label>
                <div className="menu-divider"/>
                <div className="menu-label">פעולות גורפות</div>
                  <button className="menu-item" onClick={()=>{setShowBulkMove(true);setMenuOpen(false);}}><span className="ic"><Ic n="shuffle" s={17}/></span>העברה גורפת</button>
                  <button className="menu-item danger" onClick={()=>{setShowBulkDel(true);setMenuOpen(false);}}><span className="ic"><Ic n="trash" s={17}/></span>מחיקה גורפת</button>
                </>}
                <div className="menu-divider"/>
                <button className="menu-item danger" onClick={async()=>{setMenuOpen(false);const saved=await flushSave();if(!saved&&!confirm('השינויים האחרונים עדיין לא נשמרו בשרת. לצאת בכל זאת? השינויים האלה יאבדו.'))return;clearSession();setLoginRole(null);setSel(null);setSidebar(false);}}><span className="ic"><Ic n="power" s={17}/></span>יציאה מהמערכת</button>
              </div>
            </MenuHost>}
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
      {localMode&&<LocalModeBanner info={localInfo} saving={saving} onSaveNow={()=>runSave()} onOpen={()=>setShowBackup(true)}/>}
      {((loadErr&&!localMode)||saving==='error')&&(
        <div className="save-banner" role="alert">
          <Ic n="warn" s={18}/>
          <div className="sb-txt">
            <b>{loadErr?(OFFLINE_ST.fromCache?'מצב לא מקוון — מוצג עותק שנשמר ב-'+new Date(OFFLINE_ST.savedAt).toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'}):'הקטלוג לא נטען מהשרת — לא ניתן לשמור שינויים.'):'השינויים האחרונים עדיין לא נשמרו!'}</b>
            <span>{loadErr?(OFFLINE_ST.fromCache?'הנתונים לצפייה בלבד ועלולים לא להיות מעודכנים. עריכה ושמירה חסומות עד לחיבור לאינטרנט.':'רענן את הדף ונסה שוב. אם הבעיה נמשכת בדוק את החיבור לאינטרנט.'):saveErr}</span>
          </div>
          {loadErr&&!localMode?<>{admin&&OFFLINE_ST.fromCache&&<button onClick={()=>startLocalMode(data)}>עבוד מקומית</button>}<button onClick={()=>location.reload()}>רענן</button></>:<button onClick={()=>runSave()}>נסה שוב עכשיו</button>}
        </div>
      )}

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

        {isMob&&sidebar&&<div className="sb-scrim" onClick={()=>setSidebar(false)}/>}
        {/* SIDEBAR */}
        <aside className={'sb-aside'+(sidebar?' open':'')} aria-hidden={!sidebar} style={{width:sidebar?265:0,flexShrink:0,overflow:'hidden',transition:'width .28s var(--ease)'}}>
          <div style={{width:265,overflowY:'auto',height:'100%',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'8px 10px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
              <div style={{position:'relative'}}>
                <input value={sidebarFilter} onChange={e=>setSidebarFilter(e.target.value)}
                  placeholder="סינון דגמים..." className="sb-filter"
                  style={{width:'100%',padding:'6px 28px 6px 10px',borderRadius:16,border:'1px solid var(--border)',fontSize:12,outline:'none',color:'var(--inp)',background:'var(--ibg)',boxSizing:'border-box'}}/>
                {sidebarFilter&&<button onClick={()=>setSidebarFilter('')} style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'#999',fontSize:13}}>✕</button>}
              </div>
            </div>
            {editor&&(
              <div className="sb-tools">
                <button className={'sb-tool'+(sbEdit?' on':'')} onClick={()=>setSbEdit(v=>!v)} aria-pressed={sbEdit}><Ic n="edit" s={15}/>{sbEdit?'סיום עריכה':'עריכה'}</button>
                {admin&&<button className="sb-tool" onClick={()=>{ if(localModeRef.current){alert('סל המחזור זמין רק כשמחוברים לשרת');} else setShowTrash(true); }}><Ic n="trash" s={15}/>סל מחזור</button>}
              </div>
            )}
            <div style={{flex:1,overflowY:'auto'}}>
              {data.brands.filter(b=>editor||!b.hidden).map(b=>(
                <SidebarBrand key={b.id} openReq={openBrandReq} brand={b} brandPos={{first:data.brands[0]?.id===b.id,last:data.brands[data.brands.length-1]?.id===b.id}} editMode={sbEdit} onMoveBrand={dir=>moveBrandPos(b.id,dir)} onMoveCat={(cid,dir)=>moveCatPos(b.id,cid,dir)} onMoveSub={(cid,scid,dir)=>moveSubPos(b.id,cid,scid,dir)} onMoveModel={(cid,scid,mid,dir)=>moveModelPos(b.id,cid,scid,mid,dir)} sel={sel} editor={editor} admin={admin} canSeeHidden={editor}
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
                    if(!confirm('להעביר את הדגם לסל המחזור?'))return;
                    const catObj=b.categories.find(c=>c.id===cid);
                    const sourceModels=scid?(catObj?.subCategories||[]).find(sc=>sc.id===scid)?.models:catObj?.models;
                    const m=sourceModels&&sourceModels.find(m=>m.id===mid);
                    const savedModel=m?JSON.parse(JSON.stringify(m)):null;
                    if(savedModel){
                      try{ await trashPut({kind:'model',name:m.name,bid:b.id,bname:b.name,cid,cname:catObj?.name||'',scid:scid||null,scname:scid?((catObj?.subCategories||[]).find(sc=>sc.id===scid)||{}).name||'':'',idx:sourceModels.findIndex(x=>x.id===mid),batch:gid(),deletedBy:loginLabel||loginRole},savedModel); }
                      catch(e){ if(!confirm('לא הצלחתי לשמור עותק בסל המחזור. למחוק בכל זאת?'))return; }
                    }
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
                  onDelCat={async cid=>{
                    const c=b.categories.find(x=>x.id===cid); if(!c)return;
                    const subs=c.subCategories||[];
                    const n=c.models.length+subs.reduce((t,sc)=>t+sc.models.length,0);
                    if(!confirm(`להעביר את הקטגוריה "${c.name}"${n?` ו-${n} דגמים שבה`:''} לסל המחזור?`))return;
                    try{
                      const list=[...c.models.map((m,i)=>({m:JSON.parse(JSON.stringify(m)),scid:null,scname:'',idx:i})),
                        ...subs.flatMap(sc=>sc.models.map((m,i)=>({m:JSON.parse(JSON.stringify(m)),scid:sc.id,scname:sc.name,idx:i})))];
                      await trashGroup('category',{bid:b.id,bname:b.name,cid:c.id,cname:c.name,idx:b.categories.findIndex(x=>x.id===cid),by:loginLabel||loginRole},{id:c.id,name:c.name,subCategories:subs.map(sc=>({id:sc.id,name:sc.name}))},list);
                    }catch(e){ if(!confirm('לא הצלחתי לשמור עותק בסל המחזור. למחוק בכל זאת?'))return; }
                    fbSaveSnapshot(data,loginLabel||loginRole,'לפני מחיקת קטגוריה');
                    logAlert('delete',`נמחקה קטגוריה: ${c.name} (${b.name})`);
                    mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.filter(x=>x.id!==cid)})}));
                  }}
                  onAddSubCat={(cid,name)=>mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>c.id!==cid?c:{...c,subCategories:[...(c.subCategories||[]),{id:gid(),name,models:[]}]})})}))}
                  onEditSubCat={(cid,scid,name)=>mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(c=>c.id!==cid?c:{...c,subCategories:(c.subCategories||[]).map(sc=>sc.id!==scid?sc:{...sc,name})})})}))}
                  onDelSubCat={async(cid,scid)=>{
                    const c=b.categories.find(x=>x.id===cid); const sc=c&&(c.subCategories||[]).find(x=>x.id===scid); if(!sc)return;
                    if(!confirm(`להעביר את תת-הקטגוריה "${sc.name}"${sc.models.length?` ו-${sc.models.length} דגמים שבה`:''} לסל המחזור?`))return;
                    try{
                      const list=sc.models.map((m,i)=>({m:JSON.parse(JSON.stringify(m)),scid:sc.id,scname:sc.name,idx:i}));
                      await trashGroup('subcategory',{bid:b.id,bname:b.name,cid:c.id,cname:c.name,scid:sc.id,scname:sc.name,idx:(c.subCategories||[]).findIndex(x=>x.id===scid),by:loginLabel||loginRole},{id:sc.id,name:sc.name},list);
                    }catch(e){ if(!confirm('לא הצלחתי לשמור עותק בסל המחזור. למחוק בכל זאת?'))return; }
                    fbSaveSnapshot(data,loginLabel||loginRole,'לפני מחיקת תת-קטגוריה');
                    mut(d=>({...d,brands:d.brands.map(bb=>bb.id!==b.id?bb:{...bb,categories:bb.categories.map(x=>x.id!==cid?x:{...x,subCategories:(x.subCategories||[]).filter(s=>s.id!==scid)})})}));
                  }}
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
                onCopySelectedTo={copyPartsTo}
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
      {showHub&&editor&&<ManagementHub role={loginRole} data={data} saving={saving} localMode={localMode} counts={{open:unresolvedCount+unresolvedTech}} onOpen={openTool} onClose={()=>setShowHub(false)}/>}
      {showFR&&editor&&<FindReplaceModal data={data} currentSel={sel} onApply={applyFindReplace} onOpen={(b,c,m)=>nav(b,c,m)} onClose={()=>setShowFR(false)}/>}
      {showBackup&&admin&&<BackupModal data={data} onClose={()=>setShowBackup(false)} localActive={localMode} localInfo={localInfo} onStartLocal={startLocalMode} onPickFile={pickLocalFile} onSaveNow={()=>runSave()} onUploadToServer={uploadLocalToServer} onDiscardLocal={discardLocalMode}/>}
      {showTrash&&admin&&<TrashModal onClose={()=>setShowTrash(false)} onRestore={restoreFromTrash}/>}
      {showQuality&&admin&&<DataQualityPanel data={data} onClose={()=>setShowQuality(false)} onOpen={(b,c,m)=>nav(b,c,m)}/>}
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

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
