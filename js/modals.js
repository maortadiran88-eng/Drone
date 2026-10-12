// ══════════ WA EDITOR ══════════
function WaEditorModal({brand,cat,model,selRows,defaultCols,onClose}){
  const[colSel,setColSel]=useState(new Set(defaultCols||['nameHe','tadPn']));
  const[preview,setPreview]=useState(false);
  const sp=model.parts.filter(p=>selRows.has(p.id));
  const activeCols=model.columns.filter(c=>colSel.has(c.id));
  const buildMsg=()=>{
    const hdr=`🔧 *${brand.name} — ${model.name}*\n📂 ${cat.name}\n${'─'.repeat(28)}`;
    const lines=sp.map((p,i)=>{const vals=activeCols.map(c=>{const v=(p.values[c.id]||'').trim();return v?`${c.name}: ${v}`:'';}).filter(Boolean);return`*${i+1}.* ${vals.join(' | ')}`;}).join('\n');
    return`${hdr}\n\n${lines}\n\n_סה"כ ${sp.length} חלקים_`;
  };
  const exportSelectedPDF=()=>{
    // Hide empty cols and empty rows from selected
    const pdfCols=activeCols.filter(col=>sp.some(p=>(p.values[col.id]||'').trim()!==''));
    const w=window.open('','_blank');
    const rows=sp.map(p=>{
      const hasData=pdfCols.some(col=>(p.values[col.id]||'').trim()!=='');
      if(!hasData)return'';
      return`<tr style="${p.discontinued?'opacity:.75':''}">
        ${pdfCols.map(col=>`<td style="${p.discontinued?'color:var(--red);text-decoration:line-through;':''}">${p.values[col.id]||''}</td>`).join('')}
        <td>${p.discontinued?'<span style="color:var(--red);font-weight:bold;background:var(--red-bg);padding:2px 6px;border-radius:4px">⛔ הופסק</span>':''}</td>
      </tr>`;
    }).filter(Boolean).join('');
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${model.name} — נבחרים</title>
      <style>body{font-family:Arial;padding:30px;color:#1a1a2a;direction:rtl}h1{color:${brand.color};font-size:20px}
      table{border-collapse:collapse;width:100%;margin-top:14px;font-size:13px}
      th{background:${brand.color};color:#fff;padding:9px 12px;text-align:right}
      td{border:1px solid #e5e7eb;padding:7px 12px}tr:nth-child(even){background:#f9fafb}
      @page{margin:20mm}</style></head>
      <body><h1>🔧 ${brand.name} — ${model.name}</h1>
      <p style="color:#6b7280">${cat.name} · ${sp.length} פריטים נבחרו</p>
      <table><thead><tr>${pdfCols.map(col=>`<th>${col.name}</th>`).join('')}<th>סטטוס</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="font-size:11px;color:#94a3b8;margin-top:8px">${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</p>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    w.document.close();
  };
  return(
    <Modal onClose={onClose} wide title="📱 עריכת הודעת ווצאפ">
      <div style={{marginBottom:14}}>
        <div style={{fontWeight:'bold',fontSize:13,marginBottom:8,color:'var(--text)'}}>בחר עמודות לשליחה:</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
          <button onClick={()=>setColSel(new Set(model.columns.map(c=>c.id)))} style={sB('var(--sub)')}>הכל</button>
          <button onClick={()=>setColSel(new Set())} style={sB('var(--sub)')}>נקה</button>
          <button onClick={()=>setColSel(new Set(defaultCols||['nameHe','tadPn']))} style={sB('var(--primary)')}>ברירת מחדל</button>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {model.columns.map(col=>{const on=colSel.has(col.id);return(
            <div key={col.id} onClick={()=>setColSel(p=>{const n=new Set(p);on?n.delete(col.id):n.add(col.id);return n;})}
              style={{padding:'7px 12px',borderRadius:8,border:`2px solid ${on?brand.color:'var(--border)'}`,background:on?brand.color+'22':'var(--ibg)',cursor:'pointer',fontSize:12,color:'var(--text)',userSelect:'none',transition:'all .15s'}}>
              {on?'✓ ':''}{col.name}
            </div>
          );})}
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <div style={{fontWeight:'bold',fontSize:12,color:'var(--sub)'}}>תצוגה מקדימה:</div>
          <button onClick={()=>setPreview(v=>!v)} style={sB('var(--text2)')}>{preview?'הסתר':'הצג'}</button>
        </div>
        {preview&&<div style={{background:'var(--green-bg)',borderRadius:10,padding:12,fontFamily:'monospace',fontSize:11,whiteSpace:'pre-wrap',maxHeight:200,overflowY:'auto',direction:'ltr',textAlign:'left',border:'1px solid var(--border)'}}>{buildMsg()}</div>}
      </div>
      <div style={{background:'var(--row2)',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'var(--sub)'}}>{sp.length} שורות · {activeCols.length} עמודות נבחרו</div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={exportSelectedPDF} disabled={!colSel.size} style={{flex:1,...BPr(colSel.size?'var(--text2)':'#9aa5b1')}}>🖨️ PDF נבחרים</button>
        <button onClick={()=>window.open('https://wa.me/?text='+encodeURIComponent(buildMsg()),'_blank')} disabled={!colSel.size} style={{flex:1,...BPr(colSel.size?'#25D366':'#9aa5b1')}}>📱 ווצאפ</button>
        <button onClick={onClose} style={{...BST,padding:'10px 14px'}}>✕</button>
      </div>
    </Modal>
  );
}

// ══════════ MOVE MODAL ══════════
function MoveModal({data,currentBid,currentCid,onMove,onClose}){
  const[toBid,setToBid]=useState(currentBid);const[toCid,setToCid]=useState('');
  const brand=data.brands.find(b=>b.id===toBid);
  return(
    <Modal onClose={onClose} title="🔀 העבר דגם">
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
        {data.brands.map(b=><button key={b.id} onClick={()=>{setToBid(b.id);setToCid('');}} style={{padding:'7px 14px',borderRadius:20,border:`2px solid ${toBid===b.id?b.color:'var(--border)'}`,background:toBid===b.id?b.color:'var(--ibg)',color:toBid===b.id?'#fff':'var(--text)',cursor:'pointer',fontWeight:'bold',fontSize:13}}>{b.name}</button>)}
      </div>
      {brand&&brand.categories.map(c=>(
        <div key={c.id} onClick={()=>setToCid(c.id)} style={{padding:'10px 14px',borderRadius:8,border:`2px solid ${toCid===c.id?brand.color:'var(--border)'}`,marginBottom:6,cursor:'pointer',background:toCid===c.id?brand.light:'var(--ibg)',color:'var(--text)',fontSize:13,fontWeight:toCid===c.id?'bold':'normal'}}>
          {c.name}{toBid===currentBid&&c.id===currentCid&&<span style={{fontSize:11,color:'var(--sub)',marginRight:8}}>(נוכחי)</span>}
        </div>
      ))}
      <div style={{display:'flex',gap:8,marginTop:12}}>
        <button onClick={()=>{if(!toCid){alert('בחר קטגוריה');return;}if(toBid===currentBid&&toCid===currentCid){alert('אותה קטגוריה');return;}onMove(toBid,toCid);onClose();}} style={{flex:1,...BPr('var(--primary)')}}>✓ העבר</button>
        <button onClick={onClose} style={{flex:1,...BST}}>ביטול</button>
      </div>
    </Modal>
  );
}

// ══════════ COPY PARTS ══════════
function CopyPartsModal({data,currentMid,onCopy,onClose}){
  const[picked,setPicked]=useState(null);
  const opts=[];data.brands.forEach(b=>b.categories.forEach(c=>c.models.forEach(m=>{if(m.id!==currentMid&&m.parts.length>0)opts.push({b,c,m});})));
  return(
    <Modal onClose={onClose} title="📋 העתק חלקים" wide>
      <div style={{maxHeight:'50vh',overflowY:'auto',marginBottom:12}}>
        {!opts.length&&<div style={{textAlign:'center',color:'var(--sub)',padding:24}}>אין דגמים עם חלקים</div>}
        {opts.map(({b,c,m})=>(
          <div key={m.id} onClick={()=>setPicked({b,c,m})} style={{padding:'10px 14px',borderRadius:8,border:`2px solid ${picked?.m.id===m.id?b.color:'var(--border)'}`,marginBottom:6,cursor:'pointer',background:picked?.m.id===m.id?b.light:'var(--ibg)',display:'flex',alignItems:'center',gap:10}}>
            <span style={{background:b.color,color:'#fff',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:'bold'}}>{b.name}</span>
            <span style={{fontWeight:'bold',color:'var(--text)',flex:1}}>{m.name}</span>
            <span style={{color:'var(--sub)',fontSize:11}}>{c.name}</span>
            <span style={{color:b.color,fontSize:11,fontWeight:'bold'}}>{m.parts.length} חלקים</span>
          </div>
        ))}
      </div>
      {picked&&<div style={{background:'var(--green-bg)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'var(--green)'}}>✓ <strong>{picked.m.name}</strong> — {picked.m.parts.length} חלקים יועתקו</div>}
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>{if(!picked){alert('בחר דגם');return;}onCopy(picked.b.id,picked.c.id,picked.m.id);onClose();alert(`✅ ${picked.m.parts.length} חלקים הועתקו`);}} style={{flex:1,...BPr('var(--green)')}}>✓ העתק</button>
        <button onClick={onClose} style={{flex:1,...BST}}>ביטול</button>
      </div>
    </Modal>
  );
}

// ══════════ BULK MOVE ══════════
function BulkMoveModal({data,onMove,onClose}){
  const[sel,setSel]=useState(new Set());const[toBid,setToBid]=useState('');const[toCid,setToCid]=useState('');const[q,setQ]=useState('');
  const all=[];data.brands.forEach(b=>b.categories.forEach(c=>c.models.forEach(m=>all.push({bid:b.id,cid:c.id,mid:m.id,bname:b.name,cname:c.name,mname:m.name,color:b.color}))));
  const filtered=q.trim()?all.filter(x=>x.mname.toLowerCase().includes(q.toLowerCase())||x.bname.toLowerCase().includes(q.toLowerCase())):all;
  const key=(bid,cid,mid)=>`${bid}§${cid}§${mid}`;
  const toggle=k=>setSel(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});
  const tb=data.brands.find(b=>b.id===toBid);
  return(
    <Modal onClose={onClose} wide title="🔀 העברה מרובה">
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 חפש..." style={{flex:1,minWidth:100,...INS,padding:'7px 12px'}}/>
        <button onClick={()=>setSel(new Set(filtered.map(x=>key(x.bid,x.cid,x.mid))))} style={sB('var(--sub)')}>בחר הכל</button>
        <button onClick={()=>setSel(new Set())} style={sB('var(--sub)')}>נקה</button>
      </div>
      <div style={{maxHeight:'28vh',overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,marginBottom:12}}>
        {filtered.map(x=>{const k=key(x.bid,x.cid,x.mid);const isSel=sel.has(k);return(
          <div key={k} onClick={()=>toggle(k)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:isSel?'var(--sel)':'var(--card)',userSelect:'none'}}>
            <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${isSel?'var(--primary)':'var(--border)'}`,background:isSel?'var(--primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{isSel&&<span style={{color:'#fff',fontSize:11,fontWeight:'bold'}}>✓</span>}</div>
            <span style={{background:x.color,color:'#fff',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:'bold',flexShrink:0}}>{x.bname}</span>
            <span style={{fontWeight:'bold',color:'var(--text)',flex:1,fontSize:13}}>{x.mname}</span>
            <span style={{color:'var(--sub)',fontSize:11}}>{x.cname}</span>
          </div>
        );})}
      </div>
      {sel.size>0&&<div style={{background:'var(--sel)',borderRadius:8,padding:'8px 14px',marginBottom:10,fontSize:13,color:'var(--green)',fontWeight:'bold'}}>✓ {sel.size} דגמים נבחרו</div>}
      <div style={{fontWeight:'bold',fontSize:13,marginBottom:8,color:'var(--text)'}}>העבר אל:</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>{data.brands.map(b=><button key={b.id} onClick={()=>{setToBid(b.id);setToCid('');}} style={{padding:'7px 14px',borderRadius:20,border:`2px solid ${toBid===b.id?b.color:'var(--border)'}`,background:toBid===b.id?b.color:'var(--ibg)',color:toBid===b.id?'#fff':'var(--text)',cursor:'pointer',fontWeight:'bold',fontSize:13}}>{b.name}</button>)}</div>
      {tb&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>{tb.categories.map(c=><div key={c.id} onClick={()=>setToCid(c.id)} style={{padding:'8px 12px',borderRadius:8,border:`2px solid ${toCid===c.id?tb.color:'var(--border)'}`,cursor:'pointer',background:toCid===c.id?tb.light:'var(--ibg)',fontSize:12,color:'var(--text)',fontWeight:toCid===c.id?'bold':'normal'}}>{c.name}</div>)}</div>}
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>{if(!sel.size){alert('בחר דגמים');return;}if(!toCid){alert('בחר יעד');return;}const sels=[...sel].map(k=>{const[bid,cid,mid]=k.split('§');return{bid,cid,mid};});onMove(sels,toBid,toCid);alert(`✅ ${sels.length} דגמים הועברו`);onClose();}} style={{flex:1,...BPr('var(--primary)')}}>✓ העבר{sel.size>0?` (${sel.size})`:''}</button>
        <button onClick={onClose} style={{flex:1,...BST}}>ביטול</button>
      </div>
    </Modal>
  );
}

// ══════════ BULK DELETE ══════════
function BulkDeleteModal({data,onDelete,onClose}){
  const[sel,setSel]=useState(new Set());const[q,setQ]=useState('');
  const all=[];data.brands.forEach(b=>b.categories.forEach(c=>c.models.forEach(m=>all.push({bid:b.id,cid:c.id,mid:m.id,bname:b.name,cname:c.name,mname:m.name,color:b.color,parts:(m.parts||[]).length}))));
  const filtered=q.trim()?all.filter(x=>[x.mname,x.bname,x.cname].some(s=>s.toLowerCase().includes(q.toLowerCase()))):all;
  const key=(bid,cid,mid)=>`${bid}§${cid}§${mid}`;
  const toggle=k=>setSel(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});
  return(
    <Modal onClose={onClose} wide title="🗑 מחיקה מרובה">
      <div style={{background:'var(--red-bg)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'var(--red)',fontWeight:'bold'}}>⚠ המחיקה לצמיתות — לא ניתנת לביטול!</div>
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 חפש..." style={{flex:1,minWidth:100,...INS,padding:'7px 12px'}}/>
        <button onClick={()=>setSel(new Set(filtered.map(x=>key(x.bid,x.cid,x.mid))))} style={sB('var(--sub)')}>בחר הכל</button>
        <button onClick={()=>setSel(new Set())} style={sB('var(--sub)')}>נקה</button>
      </div>
      <div style={{maxHeight:'38vh',overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,marginBottom:12}}>
        {filtered.map(x=>{const k=key(x.bid,x.cid,x.mid);const isSel=sel.has(k);return(
          <div key={k} onClick={()=>toggle(k)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:isSel?'var(--red-bg)':'var(--card)',userSelect:'none'}}
            onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background='var(--row2)';}} onMouseLeave={e=>{e.currentTarget.style.background=isSel?'var(--red-bg)':'var(--card)';}}>
            <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${isSel?'var(--red)':'var(--border)'}`,background:isSel?'var(--red)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{isSel&&<span style={{color:'#fff',fontSize:13,fontWeight:'bold'}}>✓</span>}</div>
            <span style={{background:x.color,color:'#fff',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:'bold',flexShrink:0}}>{x.bname}</span>
            <span style={{fontWeight:'bold',color:'var(--text)',flex:1,fontSize:13}}>{x.mname}</span>
            <span style={{color:'var(--sub)',fontSize:11}}>{x.cname}</span>
            <span style={{color:'var(--red)',fontSize:11,fontWeight:'bold',flexShrink:0}}>{x.parts} חלקים</span>
          </div>
        );})}
      </div>
      {sel.size>0&&<div style={{background:'var(--red-bg)',borderRadius:8,padding:'8px 14px',marginBottom:10,fontSize:13,color:'var(--red)',fontWeight:'bold'}}>🗑 {sel.size} דגמים יימחקו לצמיתות</div>}
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>{if(!sel.size){alert('לא נבחרו דגמים');return;}const sels=[...sel].map(k=>{const[bid,cid,mid]=k.split('§');return{bid,cid,mid};});onDelete(sels);onClose();}} style={{flex:1,...BPr(sel.size?'var(--red)':'#9aa5b1')}}>🗑 מחק{sel.size>0?` (${sel.size})`:''}</button>
        <button onClick={onClose} style={{flex:1,...BST}}>ביטול</button>
      </div>
    </Modal>
  );
}

// ══════════ EXCEL IMPORT ══════════
function XlsImportModal({data,onImport,onClose}){
  const[rows,setRows]=useState([]);const[fn,setFn]=useState('');const[toBid,setToBid]=useState(data.brands[0]?.id||'');const[toCid,setToCid]=useState(data.brands[0]?.categories[0]?.id||'');const[cm,setCm]=useState({model:0,nameHe:1,tadPn:2,nameEn:3,mfgPn:4});const[step,setStep]=useState(1);const[groups,setGroups]=useState([]);const[excl,setExcl]=useState(new Set());
  const tb=data.brands.find(b=>b.id===toBid);
  const parseFile=e=>{const f=e.target.files[0];if(!f)return;setFn(f.name);const r=new FileReader();r.onload=ev=>{const wb=XLSX.read(ev.target.result,{type:'binary'});const ws=wb.Sheets[wb.SheetNames[0]];const all=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});const fc=String(all[0]?.[0]||'').toLowerCase();const dr=(fc.includes('דגם')||fc.includes('model'))?all.slice(1):all;setRows(dr.filter(r=>r.some(c=>String(c).trim())));setStep(2);};r.readAsBinaryString(f);e.target.value='';};
  const buildPreview=()=>{const g={};rows.forEach(r=>{const mn=String(r[cm.model]||'').trim();if(!mn)return;g[mn]=(g[mn]||0)+1;});setGroups(Object.entries(g));setExcl(new Set());setStep(3);};
  const colLbl=i=>{const s=rows.slice(0,3).map(r=>String(r[i]||'').trim()).filter(Boolean).join(', ');return`עמודה ${i+1}${s?' ('+s.slice(0,22)+')':''}`;};
  const maxC=rows[0]?rows[0].length:6;const included=groups.filter(([n])=>!excl.has(n));
  return(
    <Modal onClose={onClose} wide title="📥 ייבוא מ-Excel">
      <div style={{display:'flex',gap:4,marginBottom:20}}>{['1. העלאה','2. מיפוי','3. אישור'].map((s,i)=>(
        <div key={i} style={{flex:1,textAlign:'center',padding:'6px 0',borderRadius:6,fontSize:12,fontWeight:'bold',background:step===i+1?'var(--primary)':step>i+1?'var(--green)':'var(--row2)',color:step>=i+1?'#fff':'var(--sub)'}}>{s}</div>
      ))}</div>
      {step===1&&<label style={{display:'block',border:'2px dashed var(--primary)',borderRadius:12,padding:'32px 20px',textAlign:'center',cursor:'pointer',background:'var(--row2)'}}>
        <div style={{fontSize:40,marginBottom:8}}>📊</div><div style={{fontWeight:'bold',color:'var(--primary)',fontSize:15,marginBottom:4}}>לחץ לבחירת קובץ Excel</div><div style={{color:'var(--sub)',fontSize:12}}>XLSX, XLS, CSV</div>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={parseFile} style={{display:'none'}}/>
      </label>}
      {step===2&&<div>
        <div style={{background:'var(--green-bg)',borderRadius:8,padding:10,marginBottom:12,fontSize:12,color:'var(--green)'}}>✓ {fn} — {rows.length} שורות</div>
        {[['model','שם הדגם (מפתח)'],['nameHe','שם בעברית'],['tadPn','מק"ט תדיראן'],['nameEn','שם באנגלית'],['mfgPn','מק"ט יצרן']].map(([k,lbl])=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <span style={{width:130,fontSize:12,color:'var(--sub)',flexShrink:0}}>{lbl}:</span>
            <select value={cm[k]} onChange={e=>setCm(p=>({...p,[k]:Number(e.target.value)}))} style={{flex:1,border:'1px solid var(--border)',borderRadius:6,padding:'6px 10px',fontSize:12,color:'var(--inp)',background:'var(--ibg)'}}>
              {Array.from({length:maxC},(_,i)=>i).map(i=><option key={i} value={i}>{colLbl(i)}</option>)}
            </select>
          </div>
        ))}
        <div style={{fontWeight:'bold',fontSize:13,marginTop:12,marginBottom:8,color:'var(--text)'}}>ייבא אל:</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>{data.brands.map(b=><button key={b.id} onClick={()=>{setToBid(b.id);setToCid(b.categories[0]?.id||'');}} style={{padding:'7px 14px',borderRadius:20,border:`2px solid ${toBid===b.id?b.color:'var(--border)'}`,background:toBid===b.id?b.color:'var(--ibg)',color:toBid===b.id?'#fff':'var(--text)',cursor:'pointer',fontWeight:'bold',fontSize:13}}>{b.name}</button>)}</div>
        {tb&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:14}}>{tb.categories.map(c=><div key={c.id} onClick={()=>setToCid(c.id)} style={{padding:'8px 12px',borderRadius:8,border:`2px solid ${toCid===c.id?tb.color:'var(--border)'}`,cursor:'pointer',background:toCid===c.id?tb.light:'var(--ibg)',fontSize:12,color:'var(--text)',fontWeight:toCid===c.id?'bold':'normal'}}>{c.name}</div>)}</div>}
        <div style={{display:'flex',gap:8}}><button onClick={buildPreview} disabled={!toCid} style={{flex:1,...BPr(toCid?'var(--primary)':'#9aa5b1')}}>הבא ▶</button><button onClick={()=>setStep(1)} style={{...BST,padding:'10px 16px',borderRadius:8}}>חזור</button></div>
      </div>}
      {step===3&&<div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <div style={{fontWeight:'bold',fontSize:13,color:'var(--text)'}}>בחר דגמים ({groups.length}):</div>
          <button onClick={()=>setExcl(new Set())} style={{...sB('var(--green)'),marginRight:'auto'}}>בחר הכל</button>
          <button onClick={()=>setExcl(new Set(groups.map(([n])=>n)))} style={sB('var(--sub)')}>בטל הכל</button>
        </div>
        <div style={{maxHeight:'34vh',overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,marginBottom:10}}>
          {groups.map(([name,count])=>{const isEx=excl.has(name);const exists=tb?.categories.find(c=>c.id===toCid)?.models.some(m=>m.name===name);return(
            <div key={name} onClick={()=>setExcl(p=>{const n=new Set(p);isEx?n.delete(name):n.add(name);return n;})} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:isEx?'var(--row2)':'var(--card)',opacity:isEx?.45:1}}>
              <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${!isEx?'var(--primary)':'var(--border)'}`,background:!isEx?'var(--primary)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{!isEx&&<span style={{color:'#fff',fontSize:11,fontWeight:'bold'}}>✓</span>}</div>
              <span style={{flex:1,fontWeight:'bold',color:'var(--text)',fontSize:13}}>{name}</span>
              <span style={{color:'var(--sub)',fontSize:11}}>{count} חלקים</span>
              {exists?<span style={{background:'var(--orange-bg)',color:'var(--orange)',padding:'1px 6px',borderRadius:4,fontSize:10}}>יתווסף</span>:<span style={{background:'var(--green-bg)',color:'var(--green)',padding:'1px 6px',borderRadius:4,fontSize:10}}>חדש</span>}
            </div>
          );})}
        </div>
        <div style={{background:'var(--primary-light)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'var(--primary)'}}>יוייבאו: <strong>{included.length} דגמים</strong> עם <strong>{included.reduce((s,[,c])=>s+c,0).toLocaleString()} חלקים</strong></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{const res=onImport(rows,cm,toBid,toCid,excl);alert(`✅ ${res.models} דגמים, ${res.parts.toLocaleString()} חלקים`);onClose();}} disabled={!included.length} style={{flex:1,...BPr(included.length?'var(--green)':'#9aa5b1')}}>✅ ייבא</button>
          <button onClick={()=>setStep(2)} style={{...BST,padding:'10px 16px',borderRadius:8}}>חזור</button>
        </div>
      </div>}
    </Modal>
  );
}

// ══════════ BRAND MGR ══════════
function BrandMgr({data,onClose,onSave}){
  const[brands,setBrands]=useState(JSON.parse(JSON.stringify(data.brands)));
  const add=()=>setBrands(b=>[...b,{id:gid(),name:'מותג חדש',color:'#607d8b',light:'#eceff1',categories:DCATS()}]);
  const upd=(id,k,v)=>setBrands(b=>b.map(x=>x.id!==id?x:{...x,[k]:v}));
  const del=id=>{if(confirm('למחוק?'))setBrands(b=>b.filter(x=>x.id!==id));};
  const move=(idx,dir)=>setBrands(b=>{
    const j=idx+dir; if(j<0||j>=b.length)return b;
    const n=[...b]; [n[idx],n[j]]=[n[j],n[idx]]; return n;
  });
  return(
    <Modal onClose={onClose} wide title="⚙ ניהול מותגים">
      <div style={{fontSize:12,color:'var(--sub)',marginBottom:10}}>הסדר כאן הוא הסדר שבו המותגים יופיעו בתפריט ובדף הבית. מותג מוסתר לא יוצג לצופים (אך יישאר גלוי למנהלים ולעורכים).</div>
      <div style={{maxHeight:'50vh',overflowY:'auto',marginBottom:12}}>
        {brands.map((b,idx)=>(
          <div key={b.id} style={{border:'1px solid var(--border)',borderRadius:10,padding:12,marginBottom:10,borderRight:`5px solid ${b.color}`,opacity:b.hidden?0.55:1}}>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{display:'flex',flexDirection:'column',gap:1}}>
                <button onClick={()=>move(idx,-1)} disabled={idx===0} title="הזז למעלה"
                  style={{background:'none',border:'none',cursor:idx===0?'default':'pointer',color:idx===0?'var(--border2)':'var(--sub)',fontSize:13,padding:0,lineHeight:1}}>▲</button>
                <button onClick={()=>move(idx,1)} disabled={idx===brands.length-1} title="הזז למטה"
                  style={{background:'none',border:'none',cursor:idx===brands.length-1?'default':'pointer',color:idx===brands.length-1?'var(--border2)':'var(--sub)',fontSize:13,padding:0,lineHeight:1}}>▼</button>
              </div>
              <input value={b.name} onChange={e=>upd(b.id,'name',e.target.value)} style={{border:'1px solid var(--border)',borderRadius:6,padding:'6px 10px',fontSize:14,fontWeight:'bold',flex:'1 1 100px',color:'var(--inp)',background:'var(--ibg)'}}/>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <label style={{fontSize:12,color:'var(--sub)'}}>צבע:</label>
                <input type="color" value={b.color} onChange={e=>{const c=e.target.value;upd(b.id,'color',c);upd(b.id,'light',c+'22');}} style={{border:'none',borderRadius:4,height:34,width:44,cursor:'pointer'}}/>
              </div>
              <button onClick={()=>upd(b.id,'hidden',!b.hidden)} title={b.hidden?'הצג לצופים':'הסתר מצופים'}
                className="btn btn-sm btn-secondary">{b.hidden?'🙈 מוסתר':'👁 גלוי'}</button>
              <button onClick={()=>del(b.id)} style={{background:'none',border:'1px solid var(--red)',color:'var(--red)',borderRadius:6,padding:'6px 12px',cursor:'pointer',fontSize:12}}>מחק</button>
            </div>
            <div style={{fontSize:11,color:'var(--sub)',marginTop:6}}>{b.categories.reduce((s,c)=>s+c.models.length,0)} דגמים</div>
          </div>
        ))}
      </div>
      <button onClick={add} style={{width:'100%',padding:10,background:'var(--primary)',color:'var(--on-primary)',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,marginBottom:12}}>+ הוסף מותג</button>
      <div style={{display:'flex',gap:8}}><button onClick={()=>onSave(brands)} style={{flex:1,...BPr('var(--primary)')}}>✓ שמור</button><button onClick={onClose} style={{flex:1,...BST}}>ביטול</button></div>
    </Modal>
  );
}

// ══════════ NEWS EDITOR ══════════
function NewsEditorModal({onClose}){
  const[items,setItems]=useState([]);const[newText,setNewText]=useState('');const[loading,setLoading]=useState(true);
  useEffect(()=>{fbGetNews().then(docs=>{setItems(docs);setLoading(false);});},[ ]);
  const add=async()=>{if(!newText.trim())return;await fbAddNews(newText.trim());setNewText('');const docs=await fbGetNews();setItems(docs);};
  const del=async id=>{await fbDeleteNews(id);setItems(p=>p.filter(x=>x.id!==id));};
  return(
    <Modal onClose={onClose} wide title="📰 עריכת שורת חדשות">
      <div style={{marginBottom:12}}>
        <div style={{fontWeight:'bold',fontSize:13,color:'var(--sub)',marginBottom:8}}>חדשות קיימות:</div>
        {loading&&<div style={{textAlign:'center',padding:20,color:'var(--sub)'}}>טוען...</div>}
        {!loading&&!items.length&&<div style={{textAlign:'center',padding:16,color:'var(--sub)'}}>אין חדשות עדיין</div>}
        {items.map(item=>(
          <div key={item.id} style={{display:'flex',gap:10,padding:'10px 12px',borderRadius:8,background:'var(--row2)',marginBottom:6,alignItems:'center'}}>
            <span style={{flex:1,fontSize:13,color:'var(--text)'}}>{item.text}</span>
            <span style={{fontSize:10,color:'var(--sub)',flexShrink:0}}>{item.ts}</span>
            <button onClick={()=>del(item.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:15,flexShrink:0}}>🗑</button>
          </div>
        ))}
      </div>
      <div style={{fontWeight:'bold',fontSize:13,color:'var(--sub)',marginBottom:8}}>הוסף חדשה:</div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="לדוגמא: נוסף מק&quot;ט חדש למדחס טושיבה..."
          style={{flex:1,border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'var(--inp)',background:'var(--ibg)'}}/>
        <button onClick={add} style={{...BPr('var(--primary)'),padding:'9px 18px',borderRadius:8,whiteSpace:'nowrap'}}>+ הוסף</button>
      </div>
      <button onClick={onClose} style={{width:'100%',...BST}}>סגור</button>
    </Modal>
  );
}

// ══════════ BROADCAST MODAL ══════════
function BroadcastModal({onClose,currentMsg}){
  const[msg,setMsg]=useState(currentMsg||'');
  const send=async()=>{await fbSetBroadcast(msg.trim());alert(msg.trim()?'✅ ההודעה תישלח לכל המשתמשים':'✅ ההודעה בוטלה');onClose();};
  return(
    <Modal onClose={onClose} title="📢 הודעת מערכת לכל המשתמשים">
      <div style={{fontSize:13,color:'var(--sub)',marginBottom:12,lineHeight:1.6}}>ההודעה תופיע כבאנר לכל המשתמשים בכניסה הבאה. השאר ריק לביטול הודעה קיימת.</div>
      <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={4} placeholder="לדוגמא: עודכן מק&quot;ט חדש למדחס טושיבה — אנא בדקו את הקטלוג..."
        style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px',fontSize:13,resize:'vertical',color:'var(--inp)',background:'var(--ibg)',boxSizing:'border-box',marginBottom:14}}/>
      <div style={{display:'flex',gap:8}}>
        <button onClick={send} style={{flex:1,...BPr('var(--orange)')}}>📢 {msg.trim()?'שלח הודעה':'בטל הודעה קיימת'}</button>
        <button onClick={onClose} style={{flex:1,...BST}}>ביטול</button>
      </div>
    </Modal>
  );
}

// ══════════ VERSION HISTORY ══════════
function VersionHistoryModal({onRestore,onClose}){
  const[snaps,setSnaps]=useState([]);const[loading,setLoading]=useState(true);const[restoring,setRestoring]=useState(null);
  useEffect(()=>{fbGetSnapshots().then(s=>{setSnaps(s);setLoading(false);});},[ ]);
  const restore=async snap=>{
    if(!confirm(`לשחזר גרסה מ-${snap.ts}? כל השינויים הנוכחיים יאבדו!`))return;
    setRestoring(snap.id);
    try{const brands=await fbRestoreSnapshot(snap.id);onRestore(brands);onClose();alert('✅ הגרסה שוחזרה בהצלחה!');}
    catch(e){alert('שגיאה: '+e.message);}
    setRestoring(null);
  };
  return(
    <Modal onClose={onClose} wide title="🕐 היסטוריית גרסאות (10 אחרונות)">
      <div style={{fontSize:12,color:'var(--sub)',marginBottom:14,background:'var(--orange-bg)',borderRadius:8,padding:'10px 14px',border:'1px solid var(--orange)'}}>⚠️ שחזור גרסה ישכתב את כל הנתונים הנוכחיים. לא ניתן לבטל!</div>
      {loading&&<div style={{textAlign:'center',padding:30,color:'var(--sub)'}}>טוען היסטוריה...</div>}
      {!loading&&!snaps.length&&<div style={{textAlign:'center',padding:30,color:'var(--sub)'}}>אין גרסאות שמורות עדיין.<br/><span style={{fontSize:12}}>גרסאות נשמרות אוטומטית בכל שמירה.</span></div>}
      {snaps.map((s,i)=>(
        <div key={s.id} style={{display:'flex',gap:12,padding:'12px 14px',borderRadius:10,border:'1px solid var(--border)',marginBottom:8,alignItems:'center',background:i===0?'var(--green-bg)':'var(--card)'}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:'bold',fontSize:13,color:'var(--text)',marginBottom:2}}>{s.action||'שמירה אוטומטית'}{i===0&&<span style={{marginRight:8,background:'var(--green)',color:'#fff',borderRadius:4,padding:'1px 7px',fontSize:10}}>עדכני</span>}</div>
            <div style={{fontSize:11,color:'var(--sub)'}}>{s.ts} · {s.actor||'מערכת'}</div>
          </div>
          <button onClick={()=>restore(s)} disabled={!!restoring}
            style={{...sB(restoring===s.id?'#9aa5b1':'var(--primary)'),padding:'7px 16px',fontSize:12}}>
            {restoring===s.id?'⏳ משחזר...':'↩ שחזר'}
          </button>
        </div>
      ))}
      <button onClick={onClose} style={{width:'100%',marginTop:8,...BST}}>סגור</button>
    </Modal>
  );
}

// ══════════ DASHBOARD ══════════
function DashboardModal({data,onClose}){
  const[views,setViews]=useState([]);const[loading,setLoading]=useState(true);
  const loadViews=()=>{setLoading(true);fbGetTopViews().then(v=>{setViews(v);setLoading(false);});};
  useEffect(()=>{loadViews();},[]);

  const totalModels=data.brands.reduce((s,b)=>s+b.categories.reduce((ss,c)=>ss+c.models.length,0),0);
  const totalParts=data.brands.reduce((s,b)=>s+b.categories.reduce((ss,c)=>ss+c.models.reduce((sss,m)=>sss+m.parts.length,0),0),0);
  const discontinued=data.brands.reduce((s,b)=>s+b.categories.reduce((ss,c)=>ss+c.models.reduce((sss,m)=>sss+m.parts.filter(p=>p.discontinued).length,0),0),0);
  const missingTadPn=data.brands.reduce((s,b)=>s+b.categories.reduce((ss,c)=>ss+c.models.reduce((sss,m)=>sss+m.parts.filter(p=>(p.values.nameHe||'').trim()&&!(p.values.tadPn||'').trim()).length,0),0),0);
  const maxViews=views.length?Math.max(...views.map(v=>v.count),1):1;

  const resetViews=async()=>{
    if(!confirm('לאפס את כל נתוני הצפיות? לא ניתן לבטל!'))return;
    await fbResetViews();setViews([]);
  };

  return(
    <Modal onClose={onClose} wide title="📊 דשבורד מנהל">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10,marginBottom:20}}>
        {[['❄️','דגמים',totalModels,'var(--primary)'],['🔩','חלקים',totalParts,'var(--green)'],['⛔','הופסקו',discontinued,'var(--red)'],['⚠️','חסרי מק"ט',missingTadPn,'var(--orange)']].map(([ic,lb,v,col])=>(
          <div key={lb} style={{background:'var(--row2)',borderRadius:10,padding:'12px',textAlign:'center',border:`2px solid ${col}33`}}>
            <div style={{fontSize:24,marginBottom:4}}>{ic}</div>
            <div style={{fontSize:22,fontWeight:'bold',color:col}}>{v.toLocaleString()}</div>
            <div style={{fontSize:11,color:'var(--sub)'}}>{lb}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <div style={{fontWeight:'bold',fontSize:14,color:'var(--text)',flex:1}}>👁 דגמים הכי נצפים</div>
        <button onClick={resetViews} style={sB('var(--red)')}>🔄 איפוס צפיות</button>
      </div>
      {loading&&<div style={{textAlign:'center',padding:20,color:'var(--sub)'}}>טוען נתונים...</div>}
      {!loading&&!views.length&&<div style={{textAlign:'center',padding:16,color:'var(--sub)',fontSize:13,background:'var(--row2)',borderRadius:8}}>עדיין אין נתוני צפיות. הנתונים ייאספו עם השימוש.</div>}
      {views.slice(0,10).map((v,i)=>(
        <div key={v.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
          <span style={{width:22,height:22,borderRadius:'50%',background:'var(--primary)',color:'var(--on-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:'bold',flexShrink:0}}>{i+1}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:'bold',color:'var(--text)',marginBottom:3}}>{v.modelName}</div>
            <div style={{height:8,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
              <div style={{height:'100%',background:'var(--primary)',borderRadius:4,width:`${Math.round((v.count/maxViews)*100)}%`,transition:'width .5s'}}/>
            </div>
          </div>
          <span style={{fontSize:12,color:'var(--sub)',flexShrink:0,fontWeight:'bold'}}>{v.count} צפיות</span>
        </div>
      ))}
      <button onClick={onClose} style={{width:'100%',marginTop:16,...BST}}>סגור</button>
    </Modal>
  );
}

// ══════════ CHANGE PWD / SETTINGS ══════════
function ChangePwd({data,onSave,onClose}){
  const[wt,   setWt]   = useState(data.welcomeTitle||'');
  const[ws,   setWs]   = useState(data.welcomeSub||'');
  const[wd,   setWd]   = useState(data.waDefaults||['nameHe','tadPn']);
  const[disc, setDisc] = useState(data.disclaimer||'');
  const[tips, setTips] = useState(data.tips||DEFAULT_TIPS);
  const[greetings,setGreetings] = useState(data.greetings||{morning:'🌅 בוקר טוב!',noon:'☀️ צהריים טובים!',evening:'🌆 ערב טוב!',night:'🌙 לילה טוב!'});

  const submit=()=>{
    onSave({...data,waDefaults:wd,welcomeTitle:wt,welcomeSub:ws,disclaimer:disc,tips,greetings});
  };
  const allCols=data.brands[0]?.categories[0]?.models[0]?.columns||DCOLS();
  return(
    <Modal onClose={onClose} wide title="🔑 הגדרות מנהל">
      <div style={{background:'var(--primary-light)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--primary)'}}>
        💡 לניהול סיסמאות ומשתמשים לחץ על כפתור 👥 בסרגל העליון
      </div>

      {/* WA defaults */}
      <div style={{fontWeight:'bold',fontSize:14,color:'var(--sub)',marginBottom:10,paddingTop:12,paddingBottom:8,borderBottom:'1px solid var(--border)',borderTop:'1px solid var(--border)',marginTop:4}}>📱 ברירת מחדל לווצאפ</div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {allCols.map(c=>{const on=wd.includes(c.id);return(
          <div key={c.id} onClick={()=>setWd(p=>on?p.filter(x=>x!==c.id):[...p,c.id])}
            style={{padding:'6px 12px',borderRadius:8,border:`2px solid ${on?'var(--primary)':'var(--border)'}`,background:on?'var(--primary-light)':'var(--ibg)',cursor:'pointer',fontSize:12,color:'var(--text)',userSelect:'none'}}>
            {on?'✓ ':''}{c.name}
          </div>
        );})}
      </div>

      {/* Greetings */}
      <div style={{fontWeight:'bold',fontSize:14,color:'var(--sub)',marginBottom:10,paddingBottom:8,borderBottom:'1px solid var(--border)'}}>🌅 ברכות לפי שעה (ניתן לעריכה)</div>
      {[['morning','05:00-11:59'],['noon','12:00-16:59'],['evening','17:00-20:59'],['night','21:00-04:59']].map(([k,time])=>(
        <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <span style={{width:90,fontSize:11,color:'var(--sub)',flexShrink:0}}>{time}:</span>
          <input value={greetings[k]||''} onChange={e=>setGreetings(p=>({...p,[k]:e.target.value}))} style={{flex:1,border:'1px solid var(--border)',borderRadius:6,padding:'7px 10px',fontSize:13,color:'var(--inp)',background:'var(--ibg)'}}/>
        </div>
      ))}

      {/* Tips editor */}
      <div style={{fontWeight:'bold',fontSize:14,color:'var(--sub)',marginBottom:10,paddingTop:12,paddingBottom:8,borderBottom:'1px solid var(--border)',borderTop:'1px solid var(--border)',marginTop:4}}>💡 טיפים (מתחלפים כל 20 שניות)</div>
      <div style={{maxHeight:160,overflowY:'auto',marginBottom:8}}>
        {tips.map((t,i)=>(
          <div key={i} style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
            <input value={t} onChange={e=>setTips(p=>p.map((x,j)=>j===i?e.target.value:x))} style={{flex:1,border:'1px solid var(--border)',borderRadius:6,padding:'6px 10px',fontSize:12,color:'var(--inp)',background:'var(--ibg)'}}/>
            <button onClick={()=>setTips(p=>p.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16,flexShrink:0}}>🗑</button>
          </div>
        ))}
      </div>
      <button onClick={()=>setTips(p=>[...p,''])} style={{...sB('var(--primary)'),padding:'6px 14px',marginBottom:14}}>+ הוסף טיפ</button>

      {/* Login screen */}
      <div style={{fontWeight:'bold',fontSize:14,color:'var(--sub)',marginBottom:10,paddingBottom:8,borderBottom:'1px solid var(--border)'}}>🏠 מסך כניסה</div>
      {[['כותרת ראשית',wt,setWt,'textarea'],['כותרת משנה',ws,setWs,'input'],['הודעת אחריות',disc,setDisc,'textarea']].map(([l,v,s,t])=>(
        <div key={l} style={{marginBottom:10}}>
          <div style={{fontSize:12,color:'var(--sub)',marginBottom:4}}>{l}</div>
          {t==='textarea'?<textarea value={v} onChange={e=>s(e.target.value)} rows={2} style={{...INS,height:'auto',resize:'vertical'}}/>:<input value={v} onChange={e=>s(e.target.value)} style={INS}/>}
        </div>
      ))}
      <div style={{display:'flex',gap:8,marginTop:14}}>
        <button onClick={submit} style={{flex:1,...BPr('var(--primary)')}}>שמור הכל</button>
        <button onClick={onClose} style={{flex:1,...BST}}>ביטול</button>
      </div>
    </Modal>
  );
}

// ══════════ USERS MANAGER (admin only) ══════════
function UsersManagerModal({data,onSave,onClose}){
  const[users,setUsers]=useState(JSON.parse(JSON.stringify(data.users||DEFAULT_USERS)));
  const roles=[{v:'admin',l:'מנהל'},{v:'editor',l:'עורך'},{v:'viewer',l:'צופה'}];

  const upd=(id,k,v)=>setUsers(p=>p.map(u=>u.id!==id?u:{...u,[k]:v}));
  const del=id=>{if(users.length<=1){alert('חייב להישאר לפחות משתמש אחד');return;}if(!confirm('למחוק משתמש?'))return;setUsers(p=>p.filter(u=>u.id!==id));};
  const add=()=>setUsers(p=>[...p,{id:gid(),label:'משתמש חדש',pass:'pass1234',role:'viewer'}]);

  return(
    <Modal onClose={onClose} wide title="👥 ניהול משתמשים">
      <div style={{fontSize:12,color:'var(--sub)',marginBottom:14,background:'var(--primary-light)',borderRadius:8,padding:'10px 14px'}}>
        ניתן להוסיף/להסיר משתמשים, לשנות סיסמאות, שמות ותפקידים. כל משתמש נכנס עם הסיסמה שלו.
      </div>
      <div style={{maxHeight:'52vh',overflowY:'auto',marginBottom:12}}>
        {users.map((u,i)=>(
          <div key={u.id} style={{display:'flex',gap:8,alignItems:'center',padding:'10px 12px',borderRadius:10,border:'1px solid var(--border)',marginBottom:8,flexWrap:'wrap',background:'var(--row2)'}}>
            <div style={{display:'flex',flexDirection:'column',gap:4,flex:'1 1 120px'}}>
              <div style={{fontSize:10,color:'var(--sub)'}}>שם תפקיד</div>
              <input value={u.label} onChange={e=>upd(u.id,'label',e.target.value)}
                style={{border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',fontSize:13,color:'var(--inp)',background:'var(--ibg)'}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4,flex:'1 1 120px'}}>
              <div style={{fontSize:10,color:'var(--sub)'}}>סיסמה</div>
              <input value={u.pass} onChange={e=>upd(u.id,'pass',e.target.value)}
                style={{border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',fontSize:13,color:'var(--inp)',background:'var(--ibg)',direction:'ltr'}}/>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:4,flex:'0 0 100px'}}>
              <div style={{fontSize:10,color:'var(--sub)'}}>תפקיד</div>
              <select value={u.role} onChange={e=>upd(u.id,'role',e.target.value)}
                style={{border:'1px solid var(--border)',borderRadius:6,padding:'6px 8px',fontSize:13,color:'var(--inp)',background:'var(--ibg)'}}>
                {roles.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
            <button onClick={()=>del(u.id)} style={{background:'none',border:'1px solid var(--red)',color:'var(--red)',borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:12,alignSelf:'flex-end'}}>מחק</button>
          </div>
        ))}
      </div>
      <button onClick={add} style={{width:'100%',padding:10,background:'var(--primary)',color:'var(--on-primary)',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700,marginBottom:12}}>+ הוסף משתמש</button>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>onSave(users)} style={{flex:1,...BPr('var(--primary)')}}>✓ שמור שינויים</button>
        <button onClick={onClose} style={{flex:1,...BST}}>ביטול</button>
      </div>
    </Modal>
  );
}
