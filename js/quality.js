// ══════════ DATA QUALITY PANEL (Admin — קריאה בלבד, לא משנה נתונים) ══════════
function qualityScan(data){
    const out = [];
    const names = {};
    const scan = (b, c, m, sub) => {
      const where = [b.name, c.name, sub && sub.name].filter(Boolean).join(' › ');
      const base = {bid:b.id, cid:c.id, mid:m.id, model:m.name, where};
      const parts = m.parts || [];
      const key = (m.name||'').trim().toLowerCase();
      if(key){ (names[key] = names[key] || []).push(base); }
      if(!parts.length) out.push({...base, type:'noParts', msg:'אין חלקים ברשימה'});
      if(!(m.images||[]).length) out.push({...base, type:'noImages', msg:'אין שרטוטים מצורפים'});
      const seen = {};
      parts.forEach((p, i) => {
        const v = p.values || {};
        const tad = (v.tadPn||'');
        const label = (v.nameHe||v.nameEn||'').trim() || ('שורה '+(i+1));
        const hasAny = Object.values(v).some(x => String(x||'').trim());
        if(!hasAny) return;
        if(!tad.trim()) out.push({...base, type:'noTadPn', msg:label});
        if(!(v.nameHe||'').trim() && !(v.nameEn||'').trim()) out.push({...base, type:'noName', msg:'שורה '+(i+1)+(tad.trim()?' — '+tad.trim():'')});
        if(tad && tad !== tad.trim()) out.push({...base, type:'spacePn', msg:label+' — "'+tad+'"'});
        const t = tad.trim().toLowerCase();
        if(t){ if(seen[t]) out.push({...base, type:'dupPn', msg:tad.trim()+' ('+label+')'}); else seen[t]=1; }
      });
    };
    (data.brands||[]).forEach(b => (b.categories||[]).forEach(c => {
      (c.models||[]).forEach(m => scan(b,c,m,null));
      (c.subCategories||[]).forEach(sc => (sc.models||[]).forEach(m => scan(b,c,m,sc)));
    }));
    Object.values(names).forEach(list => { if(list.length>1) list.forEach(x => out.push({...x, type:'dupModel', msg:'מופיע '+list.length+' פעמים'})); });
    return out;
}

function DataQualityPanel({data, onClose, onOpen}){
  const TYPES = {
    noParts:   {label:'דגמים ללא חלקים',            sev:'red'},
    noImages:  {label:'דגמים ללא שרטוטים',          sev:'orange'},
    noTadPn:   {label:'חלקים ללא מק"ט תדיראן',      sev:'orange'},
    noName:    {label:'חלקים ללא שם (עברית/אנגלית)', sev:'orange'},
    dupPn:     {label:'מק"ט תדיראן כפול באותו דגם', sev:'red'},
    spacePn:   {label:'מק"ט עם רווחים מיותרים',     sev:'blue'},
    dupModel:  {label:'שם דגם שמופיע יותר מפעם',    sev:'blue'},
  };
  const [filter, setFilter] = useState('all');
  const [limit, setLimit]   = useState(120);

  const issues = useMemo(() => qualityScan(data), [data]);

  const counts = useMemo(() => { const c={}; issues.forEach(i => c[i.type]=(c[i.type]||0)+1); return c; }, [issues]);
  const shown = issues.filter(i => filter==='all' || i.type===filter);
  const col = s => s==='red'?'var(--red)':s==='orange'?'var(--orange)':'var(--primary)';
  const bg  = s => s==='red'?'var(--red-bg)':s==='orange'?'var(--orange-bg)':'var(--primary-light)';

  return(
    <Modal wide onClose={onClose} title="בדיקת איכות נתונים">
      <p className="tc-meta" style={{marginBottom:12,lineHeight:1.6}}>
        סריקה אוטומטית של כל הקטלוג. הבדיקה לקריאה בלבד ואינה משנה נתונים. לחיצה על שורה פותחת את הדגם.
      </p>
      {issues.length===0 ? (
        <div className="empty-state"><div className="icon">✅</div>לא נמצאו בעיות. הקטלוג נקי.</div>
      ) : (<>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
          <button className={'btn btn-sm '+(filter==='all'?'btn-primary':'btn-secondary')} onClick={()=>{setFilter('all');setLimit(120);}}>הכול ({issues.length})</button>
          {Object.keys(TYPES).filter(k=>counts[k]).map(k => (
            <button key={k} className={'btn btn-sm '+(filter===k?'btn-primary':'btn-secondary')} onClick={()=>{setFilter(k);setLimit(120);}}>{TYPES[k].label} ({counts[k]})</button>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {shown.slice(0,limit).map((i,idx) => (
            <button key={idx} onClick={()=>{onClose();onOpen(i.bid,i.cid,i.mid);}}
              style={{textAlign:'right',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,border:'1px solid var(--border)',background:'var(--card2)',color:'var(--text)',cursor:'pointer',fontFamily:'inherit'}}>
              <span className="badge" style={{background:bg(TYPES[i.type].sev),color:col(TYPES[i.type].sev),flexShrink:0}}>{TYPES[i.type].label}</span>
              <span style={{flex:1,minWidth:0}}>
                <b style={{fontWeight:700}}>{i.model}</b> <span className="tc-meta">{i.where}</span>
                <span className="tc-meta" style={{display:'block',direction:'auto'}}>{i.msg}</span>
              </span>
            </button>
          ))}
        </div>
        {shown.length>limit && <div style={{textAlign:'center',marginTop:12}}><button className="btn btn-secondary" onClick={()=>setLimit(l=>l+200)}>הצג עוד ({shown.length-limit})</button></div>}
      </>)}
      <div style={{marginTop:16,textAlign:'left'}}><button className="btn btn-secondary" onClick={onClose}>סגור</button></div>
    </Modal>
  );
}
