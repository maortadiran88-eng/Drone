// ══════════ MAKAT REVIEW PANEL (Admin — overview by brand/model) ══════════
function MakatReviewPanel({data, onClose, approvals}){
  const REVIEW_COLS = ['nameHe','nameEn','mfgPn','tadPn'];
  const COL_LABELS  = {nameHe:'שם בעברית', nameEn:'Part Name', mfgPn:'מק"ט יצרן', tadPn:'מק"ט תדיראן'};

  const [expandedBrand, setExpandedBrand] = useState(null);
  const [search, setSearch] = useState('');

  // ── helpers ──────────────────────────────────────────────
  const getModelStats = (bid, mid, parts) => {
    const relevant = parts.filter(p => REVIEW_COLS.some(c => (p.values[c]||'').trim()));
    const ok  = relevant.filter(p => approvals[bid+'__'+mid+'__'+p.id]==='ok').length;
    const fix = relevant.filter(p => approvals[bid+'__'+mid+'__'+p.id]==='fix').length;
    const pct = relevant.length ? Math.round(ok/relevant.length*100) : 0;
    return {total: relevant.length, ok, fix, pending: relevant.length-ok-fix, pct};
  };

  const getBrandStats = (b) => {
    let total=0, ok=0, fix=0;
    const scanModels = (models) => models.forEach(m => {
      const s = getModelStats(b.id, m.id, m.parts);
      total += s.total; ok += s.ok; fix += s.fix;
    });
    b.categories.forEach(c => {
      scanModels(c.models);
      (c.subCategories||[]).forEach(sc => scanModels(sc.models));
    });
    const pct = total ? Math.round(ok/total*100) : 0;
    return {total, ok, fix, pending: total-ok-fix, pct};
  };

  const barColor = pct => pct>=80?'var(--green)':pct>=40?'var(--orange)':'var(--red)';

  // ── grand total ───────────────────────────────────────────
  let grandTotal=0, grandOk=0, grandFix=0;
  data.brands.forEach(b => {
    const s = getBrandStats(b);
    grandTotal += s.total; grandOk += s.ok; grandFix += s.fix;
  });
  const grandPct = grandTotal ? Math.round(grandOk/grandTotal*100) : 0;

  const filteredBrands = data.brands.filter(b => {
    if(!search) return true;
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) ||
      b.categories.some(c =>
        c.models.some(m => m.name.toLowerCase().includes(q)) ||
        (c.subCategories||[]).some(sc => sc.models.some(m => m.name.toLowerCase().includes(q)))
      );
  });

  return(
    <Modal onClose={onClose} wide title="✅ בדיקת מק&quot;טים — סקירה כללית">

      {/* Grand progress bar */}
      <div style={{background:'var(--row2)',borderRadius:12,padding:'14px 16px',marginBottom:16,border:'1px solid var(--border)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <span style={{fontWeight:'bold',fontSize:14,color:'var(--text)'}}>סה"כ כל המערכת</span>
          <span style={{fontWeight:'bold',fontSize:16,color:barColor(grandPct)}}>{grandOk}/{grandTotal} ({grandPct}%)</span>
        </div>
        <div style={{height:16,background:'var(--border)',borderRadius:8,overflow:'hidden',marginBottom:8}}>
          <div style={{height:'100%',width:grandPct+'%',background:barColor(grandPct),transition:'width .4s',borderRadius:8}}/>
        </div>
        <div style={{display:'flex',gap:20,fontSize:12}}>
          <span style={{color:'var(--green)',fontWeight:'bold'}}>✓ אושרו: {grandOk}</span>
          <span style={{color:'var(--red)',fontWeight:'bold'}}>✗ לתיקון: {grandFix}</span>
          <span style={{color:'var(--sub)'}}>⏳ ממתינים: {grandTotal-grandOk-grandFix}</span>
        </div>
      </div>

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder="חיפוש מותג / דגם..."
        style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:8,fontSize:13,
          color:'var(--inp)',background:'var(--ibg)',marginBottom:12,boxSizing:'border-box'}}/>

      {/* Brands list */}
      <div style={{maxHeight:'60vh',overflowY:'auto'}}>
        {filteredBrands.map(b => {
          const bs = getBrandStats(b);
          const isOpen = expandedBrand === b.id;

          // collect all models (flat)
          const allModels = [];
          b.categories.forEach(c => {
            c.models.forEach(m => allModels.push({m, catName: c.name}));
            (c.subCategories||[]).forEach(sc =>
              sc.models.forEach(m => allModels.push({m, catName: c.name+' / '+sc.name}))
            );
          });

          const filteredModels = search
            ? allModels.filter(({m}) => m.name.toLowerCase().includes(search.toLowerCase()))
            : allModels;

          return(
            <div key={b.id} style={{marginBottom:8,borderRadius:10,overflow:'hidden',border:'1px solid var(--border)',boxShadow:'0 1px 4px var(--shadow)'}}>

              {/* Brand header */}
              <div onClick={()=>setExpandedBrand(isOpen?null:b.id)}
                style={{padding:'12px 16px',background:b.color,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontWeight:'bold',fontSize:14,flex:1}}>{b.name}</span>
                <span style={{fontSize:12,opacity:.9}}>{bs.ok}/{bs.total} חלקים</span>
                <span style={{fontSize:12,opacity:.8}}>{bs.pct}%</span>
                <span style={{fontSize:11}}>{isOpen?'▲':'▼'}</span>
              </div>

              {/* Brand progress bar */}
              <div style={{height:6,background:b.color+'44'}}>
                <div style={{height:'100%',width:bs.pct+'%',background:barColor(bs.pct),transition:'width .4s'}}/>
              </div>

              {/* Models list */}
              {(isOpen||search) && (
                <div style={{background:'var(--card)'}}>
                  {filteredModels.length===0 && (
                    <div style={{padding:'12px 16px',color:'var(--sub)',fontSize:12,textAlign:'center'}}>אין דגמים</div>
                  )}
                  {filteredModels.map(({m, catName},i) => {
                    const ms = getModelStats(b.id, m.id, m.parts);
                    const bc = barColor(ms.pct);
                    return(
                      <div key={m.id} style={{
                        padding:'10px 16px',
                        borderBottom:'1px solid var(--border)',
                        background:i%2?'var(--row2)':'var(--row1)',
                        display:'flex',alignItems:'center',gap:10
                      }}>
                        {/* Model name + cat */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:'bold',fontSize:13,color:'var(--text)',marginBottom:1}}>{m.name}</div>
                          <div style={{fontSize:10,color:'var(--sub)'}}>{catName}</div>
                        </div>

                        {/* Mini progress bar */}
                        <div style={{width:90,flexShrink:0}}>
                          <div style={{height:6,background:'var(--border)',borderRadius:4,overflow:'hidden',marginBottom:3}}>
                            <div style={{height:'100%',width:ms.pct+'%',background:bc,borderRadius:4}}/>
                          </div>
                          <div style={{fontSize:10,color:bc,textAlign:'center',fontWeight:'bold'}}>{ms.pct}%</div>
                        </div>

                        {/* Counts */}
                        <div style={{fontSize:11,textAlign:'center',flexShrink:0,minWidth:50}}>
                          <span style={{color:'var(--green)',fontWeight:'bold'}}>{ms.ok}✓</span>
                          {ms.fix>0&&<span style={{color:'var(--red)',fontWeight:'bold',marginRight:4}}>{ms.fix}✗</span>}
                          {ms.pending>0&&<span style={{color:'var(--sub)',marginRight:4}}>{ms.pending}⏳</span>}
                        </div>

                        {/* Status badge */}
                        <div style={{
                          width:32,height:32,borderRadius:'50%',flexShrink:0,
                          background:ms.pct===100?'var(--green)':ms.pct===0?'var(--border)':bc+'33',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:16
                        }}>
                          {ms.pct===100?'✅':ms.fix>0?'⚠️':ms.pending===ms.total?'⬜':'🔄'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={onClose} style={{width:'100%',marginTop:14,...BST}}>סגור</button>
    </Modal>
  );
}
