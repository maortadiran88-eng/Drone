function ModelView({brand,cat,model,editor,admin,viewer,hq,data,favorites,onToggleFav,loginRole,
  onUpdate,onRenameModel,onAddPart,onDelPart,onCell,onColName,onMoveCol,onAddCol,onDelCol,onPaste,
  onImgUpload,onDelImg,onImgUrl,onOpenImg,onMove,onDuplicate,onCopyPartsFrom,
  onAddToCart,onReport,waDefaults,partsDisclaimer,onUpdateDisclaimer,
  reviewApprovals,onReviewApprovalsChange,onOpenCompare,onOpenCart,compareCount,cartCount}) {

  const [synIn,       setSynIn]       = useState(model.synonyms?.join(', ')||'');
  const [editSyn,     setEditSyn]     = useState(false);
  const [imgUrl,      setImgUrl]      = useState('');
  const [editUrl,     setEditUrl]     = useState(false);
  const [filter,      setFilter]      = useState('');
  const [sortCol,     setSortCol]     = useState(null);
  const [quickMode,   setQuickMode]   = useState(false);
  const [showPaste,   setShowPaste]   = useState(false);
  const [pasteText,   setPasteText]   = useState('');
  const [showMove,    setShowMove]    = useState(false);
  const [showCopy,    setShowCopy]    = useState(false);
  const [selRows,     setSelRows]     = useState(new Set());
  const [showWaEditor,setShowWaEditor]= useState(false);
  const [showReport,  setShowReport]  = useState(false);
  const [reportText,  setReportText]  = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(model.name);
  const [reviewMode,  setReviewMode]  = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [showHiddenParts, setShowHiddenParts] = useState(false);
  const firstHiRef = useRef(null);
  const q      = hq.trim().toLowerCase();
  const images = model.images || [];
  const [copiedId, setCopiedId] = useState(null);
  const copyVal = (v,key) => {
    if(!v) return;
    (navigator.clipboard?.writeText(v)||Promise.reject()).then(()=>{setCopiedId(key);setTimeout(()=>setCopiedId(c=>c===key?null:c),1400);}).catch(()=>alert('מק"ט: '+v));
  };
  // Driven purely by the column's current displayed name (not its internal
  // id) — so typing "מק"ט" into a header turns the copy button on, and
  // editing it back out turns it off again, with no hidden id-based override.
  const isPnCol = col => /מק["״׳]?ט/.test(col.name||'');

  useEffect(() => { setSynIn(model.synonyms?.join(', ')||''); setNameInput(model.name); setEditingName(false); }, [model.id]);
  useEffect(() => {
    if (q && firstHiRef.current)
      setTimeout(() => firstHiRef.current?.scrollIntoView({behavior:'smooth',block:'center'}), 200);
  }, [q]);

  const saveSyn = () => { onUpdate({synonyms:synIn.split(',').map(s=>s.trim()).filter(Boolean)}); setEditSyn(false); };

  const visibleCols = useMemo(() =>
    editor
      ? model.columns
      : model.columns.filter(col => model.parts.some(p => (p.values[col.id]||'').trim()!=='')),
  [model.columns, model.parts, editor]);

  // Parts hidden from customers: viewers never see them; editors (non-admin)
  // keep seeing everything exactly as before (unaffected); admins see the
  // normal filtered view by default and can reveal them via the toolbar toggle.
  const partsBase = (viewer || (admin && !showHiddenParts)) ? model.parts.filter(p=>!p.hidden) : model.parts;
  const hiddenCount = model.parts.filter(p=>p.hidden).length;
  const shownCount  = model.parts.length - hiddenCount;

  let filtered = [...partsBase.filter(p=>p.pinned), ...partsBase.filter(p=>!p.pinned)];
  if (filter.trim()) filtered = filtered.filter(p => partMatches(filter,p,model.columns));
  if (sortCol) {
    filtered = [...filtered].sort((a,b) => {
      const va=(a.values[sortCol.id]||'').toLowerCase();
      const vb=(b.values[sortCol.id]||'').toLowerCase();
      const n = va.localeCompare(vb,'he');
      return sortCol.dir==='asc' ? n : -n;
    });
  }

  const rowHi  = p => q && Object.values(p.values).some(v => String(v).toLowerCase().includes(q));
  const cellHi = v => q && String(v).toLowerCase().includes(q);

  const submitPaste = () => {
    const rows = pasteText.trim().split('\n').map(r=>r.split('\t').map(c=>c.trim())).filter(r=>r.some(c=>c));
    if (rows.length) { onPaste(rows); setPasteText(''); setShowPaste(false); }
  };
  const toggleRow  = id => setSelRows(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const clearRows  = ()  => setSelRows(new Set());
  const moveRow = (id, dir) => {
    const disp = filtered;
    const idx = disp.findIndex(p=>p.id===id);
    const swapIdx = idx+dir;
    if (idx<0 || swapIdx<0 || swapIdx>=disp.length) return;
    if (!!disp[idx].pinned !== !!disp[swapIdx].pinned) return; // don't cross the pinned/regular boundary
    const arr = [...model.parts];
    const posA = arr.findIndex(p=>p.id===disp[idx].id);
    const posB = arr.findIndex(p=>p.id===disp[swapIdx].id);
    [arr[posA],arr[posB]] = [arr[posB],arr[posA]];
    onUpdate({parts:arr});
  };
  const sortAndSave = cid => {
    const sorted = [...model.parts].sort((a,b) =>
      (a.values[cid]||'').toString().localeCompare((b.values[cid]||'').toString(),'he',{numeric:true,sensitivity:'base'}));
    onUpdate({parts:sorted});
  };
  const handleSort = cid => {
    if (!sortCol||sortCol.id!==cid) setSortCol({id:cid,dir:'asc'});
    else if (sortCol.dir==='asc')   setSortCol({id:cid,dir:'desc'});
    else setSortCol(null);
  };
  const sortIcon = cid => !sortCol||sortCol.id!==cid ? '⇅' : sortCol.dir==='asc' ? '↑' : '↓';

  const exportPDF = () => {
    const w = window.open('','_blank');
    // Hide empty columns and empty rows
    const pdfCols = visibleCols.filter(col => model.parts.some(p => (p.values[col.id]||'').trim() !== ''));
    const pdfRows = model.parts.filter(p => pdfCols.some(col => (p.values[col.id]||'').trim() !== ''));
    const rows = pdfRows.map(p =>
      `<tr style="${p.discontinued?'opacity:.75':''}">
        ${pdfCols.map(c=>`<td style="${p.discontinued?'color:#c62828;text-decoration:line-through;':''}">${p.values[c.id]||''}</td>`).join('')}
        <td>${p.discontinued?'<span style="color:#c62828;font-weight:bold;background:#ffebee;padding:2px 6px;border-radius:4px">⛔ הופסק</span>':''}</td>
      </tr>`).join('');
    const imgs = images.map(img=>`<img src="${img}" style="max-width:280px;max-height:200px;border:1px solid #ddd;border-radius:6px;margin:4px;object-fit:contain">`).join('');
    const nh = model.notes ? `<div style="background:#fff3f3;border-right:4px solid #e53935;padding:10px 14px;border-radius:6px;color:#e53935;font-weight:bold;margin:10px 0">${model.notes}</div>` : '';
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>${model.name}</title>
      <style>body{font-family:Arial;padding:30px;color:#1a1a2a;direction:rtl}h1{color:${brand.color};font-size:22px}table{border-collapse:collapse;width:100%;margin-top:14px;font-size:13px}th{background:${brand.color};color:#fff;padding:9px 12px;text-align:right}td{border:1px solid #e5e7eb;padding:7px 12px}tr:nth-child(even){background:#f9fafb}@page{margin:20mm}</style></head>
      <body><h1>🔧 ${brand.name} — ${model.name}</h1>
      <p style="color:#6b7280">${cat.name}${model.synonyms?.length?' · '+model.synonyms.join(', '):''}</p>
      ${nh}${imgs?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0">${imgs}</div>`:''}
      <table><thead><tr>${pdfCols.map(c=>`<th>${c.name}</th>`).join('')}<th>סטטוס</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="font-size:11px;color:#94a3b8;margin-top:8px">${model.parts.length} חלקים · ${new Date().toLocaleDateString('he-IL')}</p>
      <script>window.onload=()=>window.print();<\/script></body></html>`);
    w.document.close();
  };

  const exportModelXLS = () => {
    const wb = XLSX.utils.book_new();

    // Info sheet — model name, synonyms, notes, drawings count
    const infoRows = [
      ['שם דגם', model.name],
      ['קטגוריה', cat.name],
      ['מותג', brand.name],
      ['שמות נרדפים', (model.synonyms||[]).join(' | ')],
      ['הערות', model.notes||''],
      ['מספר שרטוטים/תמונות מצורפים', (model.images||[]).length],
      ['מספר חלקים', model.parts.length],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
    wsInfo['!cols'] = [{wch:26},{wch:50}];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'פרטי דגם');

    // Parts sheet — every column defined on the model, in order
    const hdr = model.columns.map(c=>c.name);
    const rows = model.parts.map(p => [...model.columns.map(c=>p.values[c.id]||''), p.pinned?'נפוץ':'', p.discontinued?'הופסק':'']);
    const ws = XLSX.utils.aoa_to_sheet([[ ...hdr,'נפוץ','סטטוס'], ...rows]);
    ws['!cols'] = hdr.map(()=>({wch:20})).concat([{wch:10},{wch:12}]);
    XLSX.utils.book_append_sheet(wb, ws, 'חלקים'.slice(0,31));

    XLSX.writeFile(wb,`${brand.name}-${model.name}.xlsx`);
  };

  const shareLink = () => {
    const url = window.location.href.split('?')[0]+`?b=${brand.id}&c=${cat.id}&m=${model.id}`;
    navigator.clipboard?.writeText(url).then(()=>alert('✅ קישור הועתק')).catch(()=>alert('קישור:\n'+url));
  };

  // ── Quick (mobile) mode ──
  if (quickMode) {
    const qc = visibleCols.filter(c => ['nameHe','tadPn','mfgPn'].includes(c.id));
    const dc = qc.length ? qc : visibleCols.slice(0,3);
    return (
      <div style={{maxWidth:600,margin:'0 auto'}}>
        <div style={{background:brand.color,color:'#fff',borderRadius:14,padding:'14px 16px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:16}}><Ic n="mark" s={22} sw={1.8} style={{display:'inline-block',verticalAlign:'-4px',marginLeft:10,color:'var(--cyan)'}}/>{model.name}</div>
            <div style={{fontSize:12,opacity:.85}}>{cat.name} · {model.parts.length} חלקים</div>
          </div>
          <button onClick={()=>setQuickMode(false)} style={{background:'rgba(255,255,255,.25)',border:'none',color:'#fff',borderRadius:9,padding:'8px 14px',cursor:'pointer',fontSize:12.5,fontWeight:700}}>📋 תצוגה מלאה</button>
        </div>
        {model.notes && <div style={{background:'var(--red-bg)',borderRadius:11,padding:'11px 14px',marginBottom:12,color:'var(--red)',fontWeight:700,fontSize:13}}>{model.notes}</div>}
        <div className="card-sm" style={{padding:10,marginBottom:10}}>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="🔍 חיפוש מהיר..."
            style={{width:'100%',border:'1px solid var(--border)',borderRadius:22,padding:'11px 16px',fontSize:15,outline:'none',color:'var(--inp)',background:'var(--ibg)',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:9}}>
          {filtered.map(p => (
            <div key={p.id} onClick={()=>toggleRow(p.id)}
              className="card-sm"
              style={{background:selRows.has(p.id)?'var(--sel)':p.discontinued?'var(--red-bg)':'var(--card)',padding:'13px 15px',borderRight:`4px solid ${p.discontinued?'var(--red)':selRows.has(p.id)?'#25D366':brand.color}`,cursor:'pointer'}}>
              {p.pinned       && <div style={{fontSize:10.5,color:'var(--orange)',fontWeight:700,marginBottom:5}}>📌 חלק נפוץ</div>}
              {/* ⛔ הופסק — מוצג בולט אבל החלק נראה */}
              {p.discontinued && (
                <div style={{display:'inline-flex',alignItems:'center',gap:4,background:'var(--red)',color:'#fff',borderRadius:6,padding:'2px 9px',fontSize:11,fontWeight:700,marginBottom:7}}>
                  ⛔ הופסק לייצור
                </div>
              )}
              {p.hidden && (
                <div className="badge-hidden" style={{marginBottom:7}}>🙈 מוסתר מלקוחות</div>
              )}
              {dc.map(col => {const v=(p.values[col.id]||'').trim();if(!v)return null;const pn=isPnCol(col);const ckey=p.id+'__'+col.id;return(
                <div key={col.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4,fontSize:13.5}}>
                  <span style={{color:'var(--sub)',marginLeft:10}}>{col.name}:</span>
                  <span style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:700,color:p.discontinued?'var(--red)':pn?'var(--primary)':'var(--text)',textDecoration:p.discontinued?'line-through':'',fontFamily:pn?'monospace':'inherit'}}>{v}</span>
                    {pn && <button onClick={e=>{e.stopPropagation();copyVal(v,ckey);}} style={{background:'none',border:'none',cursor:'pointer',fontSize:15,color:copiedId===ckey?'var(--green)':'var(--sub)',padding:'4px'}}>{copiedId===ckey?<Ic n="check" s={14} sw={2}/>:<Ic n="copy" s={14}/>}</button>}
                  </span>
                </div>
              );})}
              {selRows.has(p.id) && <div style={{textAlign:'center',color:'#25D366',fontSize:11.5,fontWeight:700,marginTop:5}}>✓ נבחר</div>}
            </div>
          ))}
        </div>
        {selRows.size>0 && (
          <div style={{position:'fixed',bottom:16,right:16,left:16,zIndex:100,background:'#25D366',borderRadius:16,padding:'14px 18px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 6px 20px rgba(0,0,0,.3)'}}>
            <span style={{color:'#fff',fontWeight:700,flex:1}}>✓ {selRows.size} נבחרו</span>
            <button onClick={()=>setShowWaEditor(true)} style={{background:'#fff',border:'none',borderRadius:9,padding:'9px 18px',cursor:'pointer',fontWeight:700,color:'#25D366',fontSize:13.5}}>📱 שלח</button>
            <button onClick={clearRows} style={{background:'rgba(255,255,255,.25)',border:'none',borderRadius:9,padding:'9px 14px',cursor:'pointer',color:'#fff',fontSize:12.5}}>✕</button>
          </div>
        )}
        {showWaEditor && <WaEditorModal brand={brand} cat={cat} model={model} selRows={selRows} defaultCols={waDefaults} onClose={()=>setShowWaEditor(false)}/>}
      </div>
    );
  }

  // ── Full table mode ──
  let firstHiSet = false;

  return (
    <div className="tc-container" style={{maxWidth:1100}}>

      {/* Header card */}
      <div className="card-md" style={{padding:'16px 18px',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:8}}>
          <span className="badge" style={{background:brand.color,color:'#fff'}}>{brand.name}</span>
          <span className="tc-meta">{cat.name}</span>
          {editor && editingName
            ? <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input value={nameInput} onChange={e=>setNameInput(e.target.value)} autoFocus
                  onKeyDown={e=>{if(e.key==='Enter'){onRenameModel(nameInput.trim()||model.name);setEditingName(false);}if(e.key==='Escape')setEditingName(false);}}
                  style={{fontSize:16,fontWeight:700,border:'1px solid var(--border)',borderRadius:8,padding:'4px 9px',color:'var(--inp)',background:'var(--ibg)',width:200}}/>
                <button onClick={()=>{onRenameModel(nameInput.trim()||model.name);setEditingName(false);}} className="btn btn-sm" style={{background:'var(--green)',color:'#fff'}}>✓</button>
                <button onClick={()=>setEditingName(false)} className="btn btn-sm btn-secondary">✕</button>
              </div>
            : <span onClick={()=>{if(editor){setNameInput(model.name);setEditingName(true);}}}
                className="disp" style={{fontSize:28,color:'var(--text)',cursor:editor?'pointer':'default',borderBottom:editor?'2px dashed var(--border2)':'none'}}
                title={editor?'לחץ לעריכת שם הדגם':''}>
                <Ic n="mark" s={22} sw={1.8} style={{display:'inline-block',verticalAlign:'-4px',marginLeft:10,color:'var(--cyan)'}}/>{model.name}
              </span>
          }
          <button onClick={()=>onToggleFav(model.id)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',marginRight:'auto'}}><Ic n="star" s={22} fill={favorites.has(model.id)?'#f5b301':'none'} style={{color:favorites.has(model.id)?'#f5b301':'var(--sub)'}}/></button>
          <span className="tc-meta">{partsBase.length.toLocaleString()} חלקים</span>
        </div>
        {model.hidden && (
          <div style={{background:'var(--orange-bg)',color:'var(--orange)',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,marginBottom:8,display:'inline-block'}}>
            🙈 הדגם מוסתר — לא מוצג לצופים
          </div>
        )}
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',fontSize:12,marginBottom:12}}>
          <span className="tc-meta">שמות נרדפים:</span>
          {!editSyn
            ? <><span style={{color:'var(--text2)'}}>{model.synonyms?.length?model.synonyms.join(' | '):'—'}</span>
                {editor && <button onClick={()=>setEditSyn(true)} className="btn btn-sm btn-ghost">✏ עריכה</button>}</>
            : <><input value={synIn} onChange={e=>setSynIn(e.target.value)} placeholder="שם1, שם2"
                  style={{border:'1px solid var(--border)',borderRadius:7,padding:'4px 9px',fontSize:12,width:200,color:'var(--inp)',background:'var(--ibg)'}}/>
               <button onClick={saveSyn} className="btn btn-sm" style={{background:'var(--green)',color:'#fff'}}>✓</button>
               <button onClick={()=>setEditSyn(false)} className="btn btn-sm btn-secondary">✕</button></>}
        </div>
        {/* Actions toolbar — grouped, glass panel matching the home screen's design language */}
        <div className="toolbar-panel" style={{marginTop:12}}>
          <div className="tool-group">
            {onOpenCompare&&<button onClick={onOpenCompare} className="tool-btn tt" data-tt="פתח את חלון השוואת הדגמים">
              <span className="ic"><Ic n="compare" s={17}/></span><span className="lbl">השוואה</span>{compareCount>0&&<span className="cnt">{compareCount}</span>}
            </button>}
            {onOpenCart&&<button onClick={onOpenCart} className="tool-btn tt" data-tt="פתח את סל החלקים">
              <span className="ic"><Ic n="cart" s={17}/></span><span className="lbl">סל חלקים</span>{cartCount>0&&<span className="cnt">{cartCount}</span>}
            </button>}
            <button onClick={exportModelXLS} className="tool-btn tt" data-tt="הורד קובץ Excel עם רשימת החלקים">
              <span className="ic"><Ic n="sheet" s={17}/></span><span className="lbl">ייצוא Excel</span>
            </button>
            <button onClick={exportPDF} className="tool-btn tt" data-tt="הורד קובץ PDF עם רשימת החלקים">
              <span className="ic"><Ic n="file" s={17}/></span><span className="lbl">ייצוא PDF</span>
            </button>
            <button onClick={shareLink} className="tool-btn tt" data-tt="העתק קישור לשיתוף הדגם">
              <span className="ic"><Ic n="share" s={17}/></span><span className="lbl">שיתוף</span>
            </button>
            <button onClick={()=>setQuickMode(true)} className="tool-btn tt" data-tt="עבור לתצוגה נוחה לנייד">
              <span className="ic"><Ic n="phone" s={17}/></span><span className="lbl">תצוגת נייד</span>
            </button>
            <button onClick={()=>setShowReport(true)} className="tool-btn warn tt" data-tt="דווח על טעות או אי-התאמה בדגם זה">
              <span className="ic"><Ic n="warn" s={17}/></span><span className="lbl">דווח שגיאה</span>
            </button>
          </div>

          {editor && <>
            <div className="tool-group" style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--border)'}}>
              <span className="tool-group-label">ניהול</span>
              <button onClick={()=>setShowMove(true)} className="tool-btn tt" data-tt="העבר את הדגם למותג/קטגוריה אחרים">
                <span className="ic"><Ic n="shuffle" s={17}/></span><span className="lbl">העבר</span>
              </button>
              <button onClick={()=>{if(confirm('לשכפל?'))onDuplicate();}} className="tool-btn tt" data-tt="צור עותק זהה של הדגם">
                <span className="ic"><Ic n="dup" s={17}/></span><span className="lbl">שכפל</span>
              </button>
              <button onClick={()=>setShowCopy(true)} className="tool-btn tt" data-tt="העתק חלקים מדגם אחר לתוך זה">
                <span className="ic"><Ic n="clipboard" s={17}/></span><span className="lbl">העתק חלקים</span>
              </button>
              <button onClick={()=>onUpdate({hidden:!model.hidden})}
                className={'tool-btn tt'+(model.hidden?' active':'')}
                data-tt={model.hidden?'הדגם מוסתר מצופים — לחץ כדי להציג':'הצג את הדגם לצופים'}>
                <span className="ic"><Ic n={model.hidden?'eyeoff':'eye'} s={17}/></span><span className="lbl">{model.hidden?'מוסתר מצופים':'הסתר מצופים'}</span>
              </button>
              {admin && <>
                <button onClick={()=>setReviewMode(true)} className="tool-btn tt" data-tt="עבור על כל החלקים ואשר את המק&quot;טים">
                  <span className="ic"><Ic n="checkc" s={17}/></span><span className="lbl">בדיקת מק"טים</span>
                </button>
                <button onClick={()=>setShowHiddenParts(v=>!v)}
                  className={'tool-btn tt'+(showHiddenParts?' active':'')}
                  data-tt={showHiddenParts?'הסתר חלקים מוסתרים':'הצג חלקים מוסתרים מלקוחות (תצוגת ניהול בלבד — לא משנה למי שהם מוסתרים)'}>
                  <span className="ic"><Ic n={showHiddenParts?'eyeoff':'eye'} s={17}/></span><span className="lbl">{showHiddenParts?'מציג חלקים מוסתרים':'הצג חלקים מוסתרים'}</span>
                </button>
                {hiddenCount>0 && (
                  <span className="tc-meta" style={{padding:'0 4px'}}>
                    {showHiddenParts
                      ? <>מוצגים {model.parts.length.toLocaleString()} (כולל {hiddenCount} מוסתרים)</>
                      : <>מוצגים {shownCount.toLocaleString()} · מוסתרים {hiddenCount.toLocaleString()}</>}
                  </span>
                )}
              </>}
            </div>
          </>}
        </div>
      </div>


      {/* Notes */}
      {(editor||model.notes) && (
        <div className="card-md" style={{padding:'14px 16px',marginBottom:12}}>
          <div className="tc-sub-title" style={{marginBottom:8}}><Ic n="note" s={16} style={{display:'inline-block',verticalAlign:'-3px',marginLeft:6}}/>הערות</div>
          {editor
            ? <textarea value={model.notes||''} onChange={e=>onUpdate({notes:e.target.value})} placeholder="הוסף הערות חשובות..."
                style={{width:'100%',border:'1px solid var(--border)',borderRadius:9,padding:'10px',fontSize:13,resize:'vertical',minHeight:72,color:'var(--red)',background:'var(--ibg)',fontFamily:'inherit',lineHeight:1.6,boxSizing:'border-box'}}/>
            : <div style={{color:'var(--red)',fontSize:14,lineHeight:1.7,fontWeight:600,whiteSpace:'pre-wrap'}}>{model.notes}</div>}
        </div>
      )}

      {/* Images / Drawings — enlarged, clearer preview */}
      {(editor||images.length>0) && (
        <div className="card-md" style={{padding:'14px 16px',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <span className="tc-sub-title"><Ic n="ruler" s={16} style={{display:'inline-block',verticalAlign:'-3px',marginLeft:6}}/>שרטוטים</span>
            {editor && <>
              <label className="btn btn-sm btn-secondary" style={{cursor:'pointer'}}>📁 העלה
                <input type="file" accept="image/*" multiple onChange={onImgUpload} style={{display:'none'}}/>
              </label>
              <button onClick={()=>setEditUrl(v=>!v)} className="btn btn-sm btn-secondary">🔗 URL</button>
            </>}
            {images.length>0 && <span className="tc-meta" style={{marginRight:'auto'}}>{images.length} תמונות</span>}
          </div>
          {editUrl && editor && (
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <input value={imgUrl} onChange={e=>setImgUrl(e.target.value)} placeholder="https://..."
                style={{flex:1,border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px',fontSize:13,color:'var(--inp)',background:'var(--ibg)'}}/>
              <button onClick={()=>{if(imgUrl.trim()){onImgUrl(imgUrl.trim());setImgUrl('');setEditUrl(false);}}}
                className="btn btn-sm btn-primary">הוסף</button>
            </div>
          )}
          {images.length>0
            ? <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                {images.map((img,idx) => (
                  <div key={idx} style={{borderRadius:11,overflow:'hidden',border:'1px solid var(--border)',background:'var(--card2)'}}>
                    <img src={img} alt={`שרטוט ${idx+1}`} onClick={()=>onOpenImg(images,idx)} style={{width:'100%',height:170,objectFit:'contain',cursor:'zoom-in',display:'block',background:'var(--card2)'}}/>
                    <div style={{padding:'5px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--card2)',borderTop:'1px solid var(--border)'}}>
                      <span className="tc-meta">תמונה {idx+1} · לחץ להגדלה</span>
                      {editor && <button onClick={()=>{if(confirm('למחוק?'))onDelImg(idx);}} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:13}}>🗑</button>}
                    </div>
                  </div>
                ))}
              </div>
            : <div className="empty-state" style={{background:'var(--card2)',borderRadius:9,border:'2px dashed var(--border)',padding:24}}>העלה שרטוטים</div>}
        </div>
      )}

      {/* Parts table */}
      <div className="card-md" style={{padding:'14px 16px'}}>

        {/* Disclaimer */}
        <div style={{background:'var(--orange-bg)',borderRadius:9,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--orange)',lineHeight:1.6,display:'flex',alignItems:'flex-start',gap:8}}>
          <span style={{flexShrink:0,display:'flex',marginTop:1}}><Ic n="warn" s={17}/></span>
          {admin
            ?<textarea value={partsDisclaimer||DEFAULT_DISCLAIMER} onChange={e=>onUpdateDisclaimer(e.target.value)}
                style={{flex:1,background:'transparent',border:'none',outline:'none',fontSize:12,color:'var(--orange)',resize:'none',fontFamily:'inherit',lineHeight:1.6,cursor:'text'}} rows={2}/>
            :<span style={{flex:1}}>{partsDisclaimer||DEFAULT_DISCLAIMER}</span>
          }
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          <span className="tc-section-title"><Ic n="clipboard" s={18} style={{display:'inline-block',verticalAlign:'-3px',marginLeft:8,color:'var(--cyan)'}}/>רשימת חלקים</span>
          <div style={{position:'relative'}}>
            <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="חיפוש בתוך הדגם..."
              style={{border:'1px solid var(--border)',borderRadius:18,padding:'7px 12px',fontSize:12.5,outline:'none',width:170,color:'var(--inp)',background:'var(--ibg)'}}/>
            {filter&&<button onClick={()=>setFilter('')} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--sub)',fontSize:13}}>✕</button>}
          </div>
          {sortCol && <button onClick={()=>setSortCol(null)} className="btn btn-sm btn-ghost" title="בטל מיון">↺ בטל מיון</button>}
          {editor && <>
            <button onClick={onAddPart}              className="btn btn-sm btn-primary">+ שורה</button>
            <button onClick={onAddCol}               className="btn btn-sm btn-secondary">+ עמודה</button>
            <button onClick={()=>setShowPaste(v=>!v)} className="btn btn-sm btn-secondary">📋 הדבק</button>
          </>}
          <span className="tc-meta" style={{marginRight:'auto'}}>
            {filtered.length===partsBase.length
              ? <>{filtered.length.toLocaleString()} חלקים</>
              : <>מציג {filtered.length.toLocaleString()} מתוך {partsBase.length.toLocaleString()} חלקים</>}
            {sortCol?' · מוין':''}
          </span>
        </div>

        {selRows.size>0 && (
          <div style={{position:'sticky',bottom:12,zIndex:100,background:'#25D366',borderRadius:999,padding:'9px 12px 9px 20px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 14px 32px -10px rgba(0,0,0,.4)',marginBottom:12,flexWrap:'wrap',animation:'fadeIn .2s'}}>
            <span style={{color:'#fff',fontWeight:700,fontSize:13,flex:1}}>✓ {selRows.size} נבחרו</span>
            <button onClick={()=>setShowWaEditor(true)} style={{background:'#fff',border:'none',borderRadius:8,padding:'7px 16px',cursor:'pointer',fontWeight:700,color:'#25D366',fontSize:13}}>✏️ ערוך ושלח</button>
            <button onClick={()=>{selRows.forEach(pid=>onAddToCart(brand.id,cat.id,model.id,pid));clearRows();alert(`✅ ${selRows.size} פריטים נוספו לסל`);}}
              style={{background:'rgba(255,255,255,.25)',border:'none',borderRadius:8,padding:'7px 14px',cursor:'pointer',color:'#fff',fontSize:12}}>+ סל</button>
            <button onClick={clearRows} style={{background:'rgba(255,255,255,.25)',border:'none',borderRadius:8,padding:'7px 12px',cursor:'pointer',color:'#fff',fontSize:12}}>ביטול</button>
          </div>
        )}

        {showPaste && editor && (
          <div style={{background:'var(--orange-bg)',border:'1px solid var(--orange)',borderRadius:9,padding:12,marginBottom:12}}>
            <div style={{fontSize:12,color:'var(--orange)',marginBottom:4,fontWeight:700}}>📋 סדר: {model.columns.map(c=>c.name).join(' ➔ ')}</div>
            <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder="הדבק כאן..." rows={5}
              style={{width:'100%',border:'1px solid var(--border2)',borderRadius:7,padding:'8px 10px',fontSize:12,fontFamily:'monospace',resize:'vertical',boxSizing:'border-box',direction:'ltr',background:'var(--ibg)',color:'var(--inp)'}}/>
            {pasteText.trim() && <div className="tc-meta" style={{margin:'4px 0'}}>{pasteText.trim().split('\n').filter(r=>r.trim()).length} שורות</div>}
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button onClick={submitPaste} className="btn btn-sm" style={{background:'var(--green)',color:'#fff'}}>✓ ייבא</button>
              <button onClick={()=>{setPasteText('');setShowPaste(false);}} className="btn btn-sm btn-secondary">ביטול</button>
            </div>
          </div>
        )}

        <div style={{overflowX:'auto',border:'1px solid var(--border)',borderRadius:11}}>
          <table className="tc-table" style={{width:'100%',minWidth:300}}>
            <thead>
              <tr style={{background:'var(--card2)'}}>
                <th style={{width:36,padding:'10px 6px',borderBottom:`2px solid ${brand.color}`}}>
                  <div onClick={()=>{if(selRows.size===filtered.length&&filtered.length>0)clearRows();else setSelRows(new Set(filtered.map(p=>p.id)));}}
                    style={{width:18,height:18,borderRadius:4,border:`2px solid ${brand.color}`,background:selRows.size===filtered.length&&filtered.length>0?brand.color:'transparent',cursor:'pointer',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {selRows.size===filtered.length&&filtered.length>0&&<span style={{color:'#fff',fontSize:11,fontWeight:'bold'}}>✓</span>}
                  </div>
                </th>
                {visibleCols.map((col,ci) => (
                  <th key={col.id} style={{padding:'10px 10px',textAlign:'right',color:'var(--sub)',fontWeight:700,borderBottom:`2px solid ${brand.color}`,whiteSpace:'nowrap',minWidth:80,fontSize:11.5}}>
                    {editor
                      ? <div style={{display:'flex',alignItems:'center',gap:3}}>
                          <div style={{display:'flex',flexDirection:'column',gap:1,flexShrink:0}}>
                            <button onClick={()=>onMoveCol(col.id,-1)} disabled={ci===0} style={{background:'none',border:'none',cursor:ci===0?'default':'pointer',color:ci===0?'var(--border2)':'var(--sub)',fontSize:10,padding:0,lineHeight:1}}>◀</button>
                            <button onClick={()=>onMoveCol(col.id,1)} disabled={ci===visibleCols.length-1} style={{background:'none',border:'none',cursor:ci===visibleCols.length-1?'default':'pointer',color:ci===visibleCols.length-1?'var(--border2)':'var(--sub)',fontSize:10,padding:0,lineHeight:1}}>▶</button>
                          </div>
                          <input value={col.name} onChange={e=>onColName(col.id,e.target.value)}
                            style={{border:'1px dashed var(--border2)',borderRadius:4,padding:'2px 5px',fontSize:12,fontWeight:700,width:'100%',minWidth:50,background:'transparent',color:'var(--inp)'}}/>
                          <button onClick={()=>sortAndSave(col.id)} title={'מיין ושמור סדר לפי '+col.name} style={{background:'none',border:'none',cursor:'pointer',color:'var(--sub)',fontSize:12,padding:0,flexShrink:0}}>🔢</button>
                          {(admin||editor)&&model.columns.length>1&&<button onClick={()=>onDelCol(col.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16,padding:0,lineHeight:1,flexShrink:0}}>×</button>}
                        </div>
                      : <div onClick={()=>handleSort(col.id)} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:4,userSelect:'none'}}>
                          {col.name}<span style={{fontSize:10,color:sortCol?.id===col.id?brand.color:'var(--border2)'}}>{sortIcon(col.id)}</span>
                        </div>}
                  </th>
                ))}
                {editor && <th style={{padding:'10px 6px',borderBottom:`2px solid ${brand.color}`,fontSize:11,color:'var(--sub)',minWidth:70}}>תגיות</th>}
                <th style={{width:editor?84:40,borderBottom:`2px solid ${brand.color}`}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,i) => {
                const hi    = rowHi(p);
                const isSel = selRows.has(p.id);
                let ref = null;
                if (hi && !firstHiSet) { firstHiSet=true; ref=firstHiRef; }
                return (
                  <tr key={p.id} ref={ref} className="part-row"
                    style={{'--i':i,background:p.discontinued?'var(--red-bg)':isSel?'var(--sel)':p.pinned?'var(--hi)':hi?'var(--hi)':i%2?'var(--row2)':'var(--row1)',transition:'background .15s',cursor:'pointer'}}
                    onClick={()=>toggleRow(p.id)}
                    onMouseEnter={e=>{if(!isSel&&!hi&&!p.pinned&&!p.discontinued)e.currentTarget.style.background='var(--row-hover)';}}
                    onMouseLeave={e=>{if(!isSel&&!hi)e.currentTarget.style.background=p.discontinued?'var(--red-bg)':p.pinned?'var(--hi)':i%2?'var(--row2)':'var(--row1)';}}>

                    <td style={{padding:'7px 6px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
                      <div onClick={()=>toggleRow(p.id)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${isSel?'#25D366':'var(--border2)'}`,background:isSel?'#25D366':'transparent',cursor:'pointer',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {isSel&&<span style={{color:'#fff',fontSize:11,fontWeight:'bold'}}>✓</span>}
                      </div>
                    </td>

                    {visibleCols.map(col => {
                      const v = p.values[col.id]||'';
                      const pn = isPnCol(col);
                      const ckey = p.id+'__'+col.id;
                      return (
                        <td key={col.id} style={{padding:'7px 10px',borderBottom:'1px solid var(--border)',background:cellHi(v)?'var(--hi)':undefined}}>
                          {/* ⛔ הופסק — badge בולט, החלק עדיין נראה */}
                          {col.id===visibleCols[0]?.id && p.discontinued && (
                            <span style={{display:'inline-block',background:'var(--red)',color:'#fff',borderRadius:999,padding:'2px 10px',fontSize:11,fontWeight:700,marginLeft:6,verticalAlign:'middle'}}>הופסק</span>
                          )}
                          {col.id===visibleCols[0]?.id && p.hidden && (
                            <span className="badge-hidden" style={{marginLeft:6,verticalAlign:'middle'}}>מוסתר מלקוחות</span>
                          )}
                          {p.pinned && !p.discontinued && col.id===visibleCols[0]?.id && (
                            <span style={{color:'var(--orange)',marginLeft:6,display:'inline-flex',verticalAlign:'middle'}}><Ic n="pin" s={14}/></span>
                          )}
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            {editor
                              ? <input value={v} onChange={e=>onCell(p.id,col.id,e.target.value)} onClick={e=>e.stopPropagation()}
                                  style={{border:'none',borderBottom:'1px solid var(--border)',width:'100%',minWidth:50,padding:'2px 4px',fontSize:13,background:'transparent',outline:'none',color:p.discontinued?'var(--red)':'var(--inp)',textDecoration:p.discontinued?'line-through':'',fontWeight:pn?700:400,fontFamily:pn?'monospace':'inherit'}}/>
                              : <span style={{color:p.discontinued?'var(--red)':pn?'var(--primary)':'var(--text)',textDecoration:p.discontinued?'line-through':'',fontWeight:pn?700:400,fontFamily:pn&&v?'monospace':'inherit'}}>{v}</span>}
                            {pn && v && (
                              <button onClick={e=>{e.stopPropagation();copyVal(v,ckey);}} title="העתק מק&quot;ט"
                                style={{background:'none',border:'none',cursor:'pointer',fontSize:12,color:copiedId===ckey?'var(--green)':'var(--sub)',flexShrink:0,padding:0}}>
                                {copiedId===ckey?'✓':'📋'}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {editor && (
                      <td style={{padding:'5px 6px',borderBottom:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
                        <input value={p.tags||''} onChange={e=>onUpdate({parts:model.parts.map(pp=>pp.id!==p.id?pp:{...pp,tags:e.target.value})})}
                          onClick={e=>e.stopPropagation()}
                          style={{border:'none',borderBottom:'1px solid var(--border)',width:'100%',padding:'2px 4px',fontSize:11,background:'transparent',outline:'none',color:'var(--sub)'}}/>
                      </td>
                    )}

                    <td style={{padding:'5px 4px',textAlign:'center',borderBottom:'1px solid var(--border)'}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:'flex',gap:2,justifyContent:'center',flexWrap:'wrap',alignItems:'center'}}>
                        {(admin||editor) && !filter.trim() && (
                          <div style={{display:'flex',flexDirection:'column',gap:0}}>
                            <button onClick={()=>moveRow(p.id,-1)} disabled={i===0} title="הזז למעלה"
                              style={{background:'none',border:'none',cursor:i===0?'default':'pointer',color:i===0?'var(--border2)':'var(--sub)',fontSize:10,padding:0,lineHeight:1}}>▲</button>
                            <button onClick={()=>moveRow(p.id,1)} disabled={i===filtered.length-1} title="הזז למטה"
                              style={{background:'none',border:'none',cursor:i===filtered.length-1?'default':'pointer',color:i===filtered.length-1?'var(--border2)':'var(--sub)',fontSize:10,padding:0,lineHeight:1}}>▼</button>
                          </div>
                        )}
                        <button onClick={()=>onAddToCart(brand.id,cat.id,model.id,p.id)} className="icon-btn tt" data-tt="הוסף לסל"><Ic n="cart" s={16}/></button>
                        {editor && <>
                          <button onClick={()=>onUpdate({parts:model.parts.map(pp=>pp.id!==p.id?pp:{...pp,pinned:!pp.pinned})})}
                            className={'icon-btn tt'+(p.pinned?' active':'')} data-tt={p.pinned?'הסר סימון "נפוץ"':'סמן כחלק נפוץ'}><Ic n="pin" s={16} fill={p.pinned?'currentColor':'none'}/></button>
                          <button onClick={()=>onUpdate({parts:model.parts.map(pp=>pp.id!==p.id?pp:{...pp,discontinued:!pp.discontinued})})}
                            className="icon-btn tt" data-tt={p.discontinued?'החזר לפעיל':'סמן כהופסק לייצור'}><Ic n={p.discontinued?'checkc':'close'} s={16}/></button>
                        </>}
                        {admin && (
                          <button onClick={()=>onUpdate({parts:model.parts.map(pp=>pp.id!==p.id?pp:{...pp,hidden:!pp.hidden})})}
                            className={'icon-btn tt'+(p.hidden?' active':'')}
                            data-tt={p.hidden?'החלק מוסתר מלקוחות — לחץ כדי להציג':'הסתר חלק זה מלקוחות'}><Ic n={p.hidden?'eyeoff':'eye'} s={16}/></button>
                        )}
                        {(admin||editor) && <button onClick={()=>onDelPart(p.id)} className="icon-btn tt danger" data-tt="מחק חלק"><Ic n="trash" s={16}/></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={visibleCols.length+(editor?3:2)} style={{padding:32,textAlign:'center',color:'var(--sub)'}}>
                  {editor?'לחץ "+ שורה" להוספת חלק':'אין חלקים תואמים לחיפוש'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewMode && admin && (() => {
        const reviewCols = ['nameHe','nameEn','mfgPn','tadPn'];
        const colLabels  = {'nameHe':'שם בעברית','nameEn':'Part Name','mfgPn':'מק"ט יצרן','tadPn':'מק"ט תדיראן'};
        const parts = model.parts.filter(p => reviewCols.some(c => (p.values[c]||'').trim()));
        const approved = reviewApprovals;
        const okCount  = parts.filter(p => approved[brand.id+'__'+model.id+'__'+p.id]==='ok').length;
        const fixCount = parts.filter(p => approved[brand.id+'__'+model.id+'__'+p.id]==='fix').length;
        const pct = parts.length ? Math.round(okCount/parts.length*100) : 0;
        const barColor = pct>=80?'#4caf50':pct>=40?'#ff9800':'#e53935';
        const setStatus = (pid, status) => {
          const key = brand.id+'__'+model.id+'__'+pid;
          const next = {...approved, [key]: approved[key]===status ? undefined : status};
          Object.keys(next).forEach(k => next[k]===undefined && delete next[k]);
          onReviewApprovalsChange(next);
        };
        // בעבר כל שורה קראה ל-setStatus בנפרד בתוך forEach, וכל קריאה חישבה
        // מחדש את ה-state מתוך הערך הישן (approved) — כך שרק החלק האחרון
        // בפועל נשמר. עכשיו בונים אובייקט אחד ושומרים פעם אחת.
        const approveAll = () => {
          const next = {...approved};
          parts.forEach(p => { next[brand.id+'__'+model.id+'__'+p.id] = 'ok'; });
          onReviewApprovalsChange(next);
        };
        const visibleParts = pendingOnly ? parts.filter(p=>!approved[brand.id+'__'+model.id+'__'+p.id]) : parts;
        return(
          <Modal onClose={()=>setReviewMode(false)} wide title={'בדיקת מק"טים — '+model.name}>
            {/* Progress */}
            <div style={{marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <span style={{fontWeight:700,fontSize:13}}>התקדמות אישור</span>
                <span style={{fontWeight:700,color:barColor}}>{okCount}/{parts.length} ({pct}%)</span>
              </div>
              <div style={{height:12,background:'var(--border)',borderRadius:8,overflow:'hidden'}}>
                <div style={{height:'100%',width:pct+'%',background:barColor,transition:'width .3s',borderRadius:8}}/>
              </div>
              <div style={{display:'flex',gap:16,marginTop:6,fontSize:12}}>
                <span style={{color:'var(--green)'}}>✓ אושרו: {okCount}</span>
                <span style={{color:'var(--red)'}}>✗ לתיקון: {fixCount}</span>
                <span style={{color:'var(--sub)'}}>⏳ ממתינים: {parts.length-okCount-fixCount}</span>
              </div>
            </div>

            {/* Bulk actions */}
            <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
              <button onClick={approveAll}
                style={{flex:1,padding:'9px',background:'var(--green-bg)',border:'1px solid var(--green)',borderRadius:9,cursor:'pointer',fontSize:12.5,fontWeight:700,color:'var(--green)',minWidth:120}}>
                ✓ אשר הכל ({parts.length})
              </button>
              <button onClick={()=>{const next={...approved};parts.forEach(p=>{const k=brand.id+'__'+model.id+'__'+p.id;delete next[k];});onReviewApprovalsChange(next);}}
                style={{flex:1,padding:'9px',background:'var(--orange-bg)',border:'1px solid var(--orange)',borderRadius:9,cursor:'pointer',fontSize:12.5,fontWeight:700,color:'var(--orange)',minWidth:120}}>
                ↺ איפוס הכל
              </button>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,color:'var(--sub)',cursor:'pointer',padding:'0 6px'}}>
                <input type="checkbox" checked={pendingOnly} onChange={e=>setPendingOnly(e.target.checked)}/>
                הצג רק ממתינים
              </label>
            </div>

            {/* Table — click anywhere on the row = ✓ אשר (הדרך הכי מהירה לסמן הרבה שורות) */}
            <div style={{overflowX:'auto',border:'1px solid var(--border)',borderRadius:9,maxHeight:'55vh',overflowY:'auto'}}>
              <table style={{borderCollapse:'collapse',width:'100%',direction:'rtl',fontSize:13}}>
                <thead style={{position:'sticky',top:0,zIndex:2}}>
                  <tr style={{background:'var(--card2)'}}>
                    <th style={{padding:'8px 10px',borderBottom:'2px solid var(--border)',textAlign:'right',fontWeight:700,color:'var(--sub)',fontSize:11.5,minWidth:30}}>#</th>
                    {reviewCols.map(c=>(
                      <th key={c} style={{padding:'8px 10px',borderBottom:'2px solid var(--border)',textAlign:'right',fontWeight:700,color:'var(--sub)',fontSize:11.5,minWidth:120}}>{colLabels[c]}</th>
                    ))}
                    <th style={{padding:'8px 10px',borderBottom:'2px solid var(--border)',textAlign:'center',fontWeight:700,color:'var(--sub)',fontSize:11.5,minWidth:100}}>סטטוס · לחץ לאישור מהיר</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleParts.map((p,i)=>{
                    const key = brand.id+'__'+model.id+'__'+p.id;
                    const status = approved[key];
                    const rowBg = status==='ok'?'var(--green-bg)':status==='fix'?'var(--red-bg)':i%2?'var(--row2)':'var(--row1)';
                    const missing = reviewCols.filter(c=>!(p.values[c]||'').trim());
                    return(
                      <tr key={p.id} style={{background:rowBg,cursor:'pointer'}} onClick={()=>setStatus(p.id,'ok')} title="לחץ לאישור מהיר">
                        <td style={{padding:'8px 10px',borderBottom:'1px solid var(--border)',color:'var(--sub)',fontSize:11}}>{i+1}</td>
                        {reviewCols.map(c=>{
                          const val = (p.values[c]||'').trim();
                          const isEmpty = !val;
                          return(
                            <td key={c} style={{padding:'8px 10px',borderBottom:'1px solid var(--border)'}}>
                              {isEmpty
                                ? <span style={{color:'var(--red)',fontSize:11,fontStyle:'italic'}}>חסר</span>
                                : <span style={{color: c==='tadPn'?'var(--primary)':c==='mfgPn'?'var(--green)':'var(--text)', fontFamily:c==='tadPn'||c==='mfgPn'?'monospace':'inherit', fontWeight:c==='tadPn'?700:400}}>{val}</span>
                              }
                            </td>
                          );
                        })}
                        <td style={{padding:'6px 8px',borderBottom:'1px solid var(--border)',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
                          <div style={{display:'flex',gap:5,justifyContent:'center'}}>
                            <button onClick={()=>setStatus(p.id,'ok')}
                              style={{padding:'5px 12px',border:'1px solid var(--green)',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:700,
                                background:status==='ok'?'var(--green)':'transparent',color:status==='ok'?'#fff':'var(--green)'}}>✓</button>
                            <button onClick={()=>setStatus(p.id,'fix')}
                              style={{padding:'5px 12px',border:'1px solid var(--red)',borderRadius:7,cursor:'pointer',fontSize:13,fontWeight:700,
                                background:status==='fix'?'var(--red)':'transparent',color:status==='fix'?'#fff':'var(--red)'}}>✗</button>
                          </div>
                          {missing.length>0&&!status&&(
                            <div style={{fontSize:9,color:'var(--orange)',marginTop:2}}>חסר: {missing.map(c=>colLabels[c]).join(', ')}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!visibleParts.length&&(
                    <tr><td colSpan={reviewCols.length+2} style={{padding:24,textAlign:'center',color:'var(--sub)'}}>הכל טופל</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <button onClick={()=>setReviewMode(false)} style={{width:'100%',marginTop:12,...BST}}>סגור</button>
          </Modal>
        );
      })()}

      {showReport && (
        <Modal onClose={()=>setShowReport(false)} title="דיווח על שגיאה בנתונים">
          <div style={{fontSize:13,color:'var(--sub)',marginBottom:12}}>מצאת שגיאה? תאר בקצרה מה לא נכון:</div>
          <textarea value={reportText} onChange={e=>setReportText(e.target.value)} rows={4}
            placeholder={'לדוגמא: מק"ט יצרן לא נכון עבור מנוע מאוורר...'}
            style={{width:'100%',border:'1px solid var(--border)',borderRadius:8,padding:'10px',fontSize:13,resize:'vertical',color:'var(--inp)',background:'var(--ibg)',boxSizing:'border-box'}}/>
          <div style={{display:'flex',gap:8,marginTop:12}}>
            <button onClick={async()=>{if(!reportText.trim()){alert('כתוב תיאור');return;}await onReport(reportText);setReportText('');setShowReport(false);}}
              style={{flex:1,...BPr('#e65100')}}><Ic n="send" s={16}/> שלח דיווח</button>
            <button onClick={()=>setShowReport(false)} style={{flex:1,...BST}}>ביטול</button>
          </div>
        </Modal>
      )}

      {showMove     && <MoveModal      data={data} currentBid={brand.id} currentCid={cat.id} onMove={onMove} onClose={()=>setShowMove(false)}/>}
      {showCopy     && <CopyPartsModal data={data} currentMid={model.id} onCopy={onCopyPartsFrom} onClose={()=>setShowCopy(false)}/>}
      {showWaEditor && <WaEditorModal  brand={brand} cat={cat} model={model} selRows={selRows} defaultCols={waDefaults} onClose={()=>setShowWaEditor(false)}/>}
    </div>
  );
}
