// ══════════ חיפוש והחלפה בכל הקטלוג (עורכים) — עם תצוגה מקדימה, בחירה פרטנית ואפשרות ביטול ══════════
function frEsc(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function FindReplaceModal({data, currentSel, onApply, onOpen, onClose}){
  const [find, setFind]       = useState('');
  const [repl, setRepl]       = useState('');
  const [scope, setScope]     = useState('all');          // all | current | brand:<id>
  const [field, setField]     = useState('all');          // all | nameHe | nameEn | tadPn | mfgPn
  const [matchCase, setCase]  = useState(false);
  const [whole, setWhole]     = useState(false);
  const [off, setOff]         = useState({});             // key → true כשהשורה הוסרה מהבחירה
  const [limit, setLimit]     = useState(100);

  const matches = useMemo(() => {
    const q = find; if (!q) return [];
    const flags = matchCase ? 'g' : 'gi';
    const re = whole ? null : new RegExp(frEsc(q), flags);
    const eqv = s => matchCase ? s === q : s.toLowerCase() === q.toLowerCase();
    const out = [];
    for (const {b, c, sc, m} of syncAllModels(data)) {
      if (scope.startsWith('brand:') && b.id !== scope.slice(6)) continue;
      if (scope === 'current' && !(currentSel && m.id === currentSel.mid)) continue;
      const colName = {}; (m.columns && m.columns.length ? m.columns : DCOLS()).forEach(x => { colName[x.id] = x.name || x.id; });
      for (const p of (m.parts || [])) {
        const v = p.values || {};
        for (const k of Object.keys(v)) {
          if (field !== 'all' && k !== field) continue;
          const before = v[k]; if (before == null || before === '') continue;
          const s = String(before);
          const hit = whole ? eqv(s.trim()) : (re.lastIndex = 0, re.test(s));
          if (!hit) continue;
          const after = whole ? repl : s.replace(new RegExp(frEsc(q), flags), () => repl);
          if (after === s) continue;
          out.push({key: m.id + '|' + p.id + '|' + k, bid:b.id, cid:c.id, mid:m.id, pid:p.id, field:k, fieldLabel:colName[k] || k, brand:b.name, cat:c.name, sub:sc ? sc.name : '', model:m.name, before:s, after});
        }
      }
    }
    return out;
  }, [data, find, repl, scope, field, matchCase, whole, currentSel]);

  const chosen = matches.filter(x => !off[x.key]);
  const modelsN = new Set(chosen.map(x => x.mid)).size;
  const apply = () => {
    if (!chosen.length) return;
    if (!confirm('לבצע ' + chosen.length + ' החלפות ב-' + modelsN + ' דגמים?\nאפשר לבטל מיד עם ↶ (תפריט ⋮ ← ביטול פעולה אחרונה, או Ctrl+Z), ונשמרת גם גרסה בהיסטוריה.')) return;
    onApply(chosen.map(x => ({mid:x.mid, pid:x.pid, field:x.field, after:x.after, before:x.before})));
    onClose();
  };
  const inp = {width:'100%', padding:'10px 12px', borderRadius:12, border:'1px solid var(--border2)', background:'var(--card)', color:'var(--text)', fontFamily:'inherit', fontSize:14};
  const Hl = ({s}) => { const i = matchCase ? s.indexOf(find) : s.toLowerCase().indexOf(find.toLowerCase()); if (whole || i < 0 || !find) return <>{s}</>; return <>{s.slice(0, i)}<mark className="hl">{s.slice(i, i + find.length)}</mark>{s.slice(i + find.length)}</>; };

  return (
    <Modal wide onClose={onClose} title="🔎 חיפוש והחלפה בקטלוג">
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10, marginBottom:10}}>
        <label><div className="tc-meta">חפש</div><input style={inp} value={find} onChange={e => { setFind(e.target.value); setOff({}); setLimit(100); }} placeholder='למשל: "מנוע ישן"' autoFocus/></label>
        <label><div className="tc-meta">החלף ב (ריק = מחיקת הטקסט)</div><input style={inp} value={repl} onChange={e => setRepl(e.target.value)} placeholder="הטקסט החדש"/></label>
        <label><div className="tc-meta">היכן</div>
          <select style={inp} value={scope} onChange={e => { setScope(e.target.value); setOff({}); }}>
            <option value="all">כל הקטלוג</option>
            {currentSel && <option value="current">הדגם הפתוח בלבד</option>}
            {(data.brands || []).map(b => <option key={b.id} value={'brand:' + b.id}>מותג: {b.name}</option>)}
          </select></label>
        <label><div className="tc-meta">באיזה שדה</div>
          <select style={inp} value={field} onChange={e => { setField(e.target.value); setOff({}); }}>
            <option value="all">כל השדות</option><option value="nameHe">שם בעברית</option><option value="nameEn">שם באנגלית</option>
            <option value="tadPn">מק"ט תדיראן</option><option value="mfgPn">מק"ט יצרן</option>
          </select></label>
      </div>
      <div style={{display:'flex', gap:16, flexWrap:'wrap', marginBottom:12, fontSize:13}}>
        <label><input type="checkbox" checked={matchCase} onChange={e => setCase(e.target.checked)}/> התאם אותיות גדולות/קטנות</label>
        <label><input type="checkbox" checked={whole} onChange={e => setWhole(e.target.checked)}/> התאמה מלאה של התא</label>
      </div>

      {!find ? <div className="empty-state"><div className="icon">🔎</div>הקלידו טקסט לחיפוש. תוצג תצוגה מקדימה לפני כל שינוי.</div>
       : matches.length === 0 ? <div className="empty-state"><div className="icon">🤷</div>לא נמצאו תאים מתאימים</div>
       : (<>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:8}}>
          <b>{matches.length} התאמות</b><span className="tc-meta">· נבחרו {chosen.length} ב-{modelsN} דגמים</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setOff({})}>בחר הכל</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { const o = {}; matches.forEach(x => o[x.key] = true); setOff(o); }}>נקה בחירה</button>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:6, maxHeight:'44vh', overflowY:'auto', paddingInlineEnd:2}}>
          {matches.slice(0, limit).map(x => (
            <div key={x.key} style={{display:'flex', gap:10, alignItems:'flex-start', padding:'8px 10px', borderRadius:12, border:'1px solid var(--border)', background:'var(--card2)', opacity: off[x.key] ? .45 : 1}}>
              <input type="checkbox" checked={!off[x.key]} onChange={() => setOff(o => ({...o, [x.key]: !o[x.key]}))} style={{marginTop:4}}/>
              <div style={{flex:1, minWidth:0}}>
                <div className="tc-meta" style={{marginBottom:2}}>
                  <a href="#" onClick={e => { e.preventDefault(); onClose(); onOpen(x.bid, x.cid, x.mid); }} style={{color:'var(--primary)', fontWeight:700}}>{x.model}</a> · {x.brand} › {x.cat}{x.sub ? ' › ' + x.sub : ''} · {x.fieldLabel}
                </div>
                <div style={{direction:'auto', overflowWrap:'anywhere'}}><s style={{opacity:.65}}><Hl s={x.before}/></s> <span style={{color:'var(--cyan)'}}>←</span> <b>{x.after === '' ? '(ריק)' : x.after}</b></div>
              </div>
            </div>
          ))}
        </div>
        {matches.length > limit && <div style={{textAlign:'center', marginTop:8}}><button className="btn btn-secondary btn-sm" onClick={() => setLimit(l => l + 200)}>הצג עוד ({matches.length - limit})</button></div>}
      </>)}
      <div style={{display:'flex', justifyContent:'space-between', gap:10, marginTop:16, flexWrap:'wrap'}}>
        <button className="btn btn-secondary" onClick={onClose}>סגור</button>
        <button className="btn btn-primary" disabled={!chosen.length} onClick={apply}>החלף {chosen.length ? chosen.length : ''} נבחרים</button>
      </div>
    </Modal>
  );
}
