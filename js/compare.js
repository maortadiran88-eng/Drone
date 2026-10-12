// ══════════ COMPARE — single model full card (read-only, like ModelView) ══════════
function CompareModelCard({b,c,m,onRemove}){
  const [filter,setFilter]=useState('');
  const visibleCols=m.columns.filter(col=>m.parts.some(p=>(p.values[col.id]||'').trim()!==''));
  let filtered=[...m.parts.filter(p=>p.pinned),...m.parts.filter(p=>!p.pinned)];
  if(filter.trim())filtered=filtered.filter(p=>partMatches(filter,p,m.columns));
  const images=m.images||[];

  return(
    <div style={{minWidth:340,maxWidth:420,flex:'0 0 380px',background:'var(--card)',borderRadius:12,boxShadow:'0 1px 4px var(--shadow)',display:'flex',flexDirection:'column',maxHeight:'72vh'}}>

      {/* Header */}
      <div style={{padding:'12px 14px',borderBottom:'2px solid '+b.color,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <span style={{background:b.color,color:'#fff',padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:'bold'}}>{b.name}</span>
          <span style={{color:'var(--sub)',fontSize:11}}>{c.name}</span>
          <button onClick={()=>onRemove(m.id)} title="הסר מההשוואה"
            style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:15,padding:0,marginRight:'auto',lineHeight:1}}>✕</button>
        </div>
        <div style={{fontSize:16,fontWeight:'bold',color:'var(--text)',marginBottom:4}}><Ic n="mark" s={17} sw={1.8} style={{display:'inline-block',verticalAlign:'-3px',marginLeft:7,color:'var(--cyan)'}}/>{m.name}</div>
        {m.synonyms?.length>0 && (
          <div style={{fontSize:11,color:'var(--sub)',marginBottom:2}}>שמות נרדפים: {m.synonyms.join(' | ')}</div>
        )}
        <div style={{fontSize:11,color:'var(--sub)'}}>{m.parts.length.toLocaleString()} חלקים</div>
      </div>

      {/* Notes */}
      {m.notes && (
        <div style={{background:'var(--red-bg)',color:'var(--red)',fontWeight:'bold',fontSize:12,padding:'8px 12px',margin:'10px 12px 0',borderRadius:8,flexShrink:0}}>
          {m.notes}
        </div>
      )}

      {/* Images */}
      {images.length>0 && (
        <div style={{display:'flex',gap:6,overflowX:'auto',padding:'10px 12px 0',flexShrink:0}}>
          {images.map((img,i)=>(
            <img key={i} src={img} style={{height:70,borderRadius:8,border:'1px solid var(--border)',objectFit:'cover',flexShrink:0}}/>
          ))}
        </div>
      )}

      {/* Quick filter */}
      <div style={{padding:'10px 12px 6px',flexShrink:0}}>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="🔍 חיפוש בתוך הדגם..."
          style={{width:'100%',border:'1px solid var(--border)',borderRadius:20,padding:'7px 12px',fontSize:12,outline:'none',color:'var(--inp)',background:'var(--ibg)',boxSizing:'border-box'}}/>
      </div>

      {/* Full data table — read-only */}
      <div style={{overflow:'auto',flex:1,padding:'0 12px 12px'}}>
        <table style={{borderCollapse:'collapse',width:'100%',direction:'rtl',fontSize:12}}>
          <thead>
            <tr>
              {visibleCols.map(col=>(
                <th key={col.id} style={{padding:'7px 8px',textAlign:'right',color:'var(--sub)',fontWeight:'bold',borderBottom:'2px solid '+b.color,whiteSpace:'nowrap',background:'var(--card)',position:'sticky',top:0}}>
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p,i)=>(
              <tr key={p.id} style={{background:p.discontinued?'var(--red-bg)':p.pinned?'var(--orange-bg)':i%2?'var(--row2)':'var(--row1)'}}>
                {visibleCols.map((col,ci)=>{
                  const v=p.values[col.id]||'';
                  return(
                    <td key={col.id} style={{padding:'6px 8px',borderBottom:'1px solid var(--border)'}}>
                      {ci===0 && p.discontinued && (
                        <span style={{display:'inline-block',background:'var(--red)',color:'#fff',borderRadius:4,padding:'1px 5px',fontSize:9,fontWeight:'bold',marginLeft:5,verticalAlign:'middle'}}>⛔</span>
                      )}
                      {ci===0 && p.pinned && !p.discontinued && (
                        <span style={{fontSize:9,marginLeft:4}}>📌</span>
                      )}
                      <span style={{color:p.discontinued?'var(--red)':'var(--text)',textDecoration:p.discontinued?'line-through':''}}>{v}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={visibleCols.length||1} style={{padding:20,textAlign:'center',color:'var(--sub)'}}>אין חלקים</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════ COMPARE PANEL ══════════
function ComparePanel({compareList,data,onClose,onRemove}){
  if(!compareList||compareList.length===0)return null;
  const models=compareList.map(({bid,cid,mid})=>{
    const b=data.brands.find(x=>x.id===bid);
    const c=b&&b.categories.find(x=>x.id===cid);
    const m=c&&c.models.find(x=>x.id===mid);
    return m?{b,c,m}:null;
  }).filter(Boolean);

  return(
    <Modal onClose={onClose} wide title="⚖️ השוואת דגמים">
      {/* Selected models pills */}
      <div style={{marginBottom:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        {models.map(({b,m})=>(
          <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',borderRadius:20,background:b.color+'22',border:'1px solid '+b.color+'55',fontSize:12}}>
            <span style={{background:b.color,color:'#fff',padding:'1px 7px',borderRadius:10,fontSize:11,fontWeight:'bold'}}>{b.name}</span>
            <span style={{fontWeight:'bold',color:'var(--text)'}}>{m.name}</span>
            <button onClick={()=>onRemove(m.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:14,padding:0,lineHeight:1}}>✕</button>
          </div>
        ))}
        {compareList.length<3&&(
          <span style={{fontSize:11,color:'var(--sub)',background:'var(--row2)',padding:'3px 8px',borderRadius:8}}>
            ניתן להוסיף עוד {3-compareList.length} דגמים — לחץ ⊕ בסרגל
          </span>
        )}
      </div>

      {models.length<2?(
        <div style={{textAlign:'center',padding:40,color:'var(--sub)',fontSize:14}}>
          <div style={{fontSize:40,marginBottom:10}}>⚖️</div>
          <div style={{fontWeight:'bold',marginBottom:6}}>בחר לפחות 2 דגמים להשוואה</div>
          <div style={{fontSize:12}}>לחץ על ⊕ בסרגל לצד שם הדגם</div>
        </div>
      ):(
        <div style={{display:'flex',gap:14,overflowX:'auto',paddingBottom:6}}>
          {models.map(({b,c,m})=>(
            <CompareModelCard key={m.id} b={b} c={c} m={m} onRemove={onRemove}/>
          ))}
        </div>
      )}
      <button onClick={onClose} style={{width:'100%',marginTop:14,...BST}}>סגור</button>
    </Modal>
  );
}
