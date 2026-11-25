// ══════════ סל מחזור — כל מה שנמחק נשמר 30 יום ואפשר לשחזר אותו למקומו ══════════
// אוספים ב-Firestore: `trash` (רשומה קטנה לכל פריט) ו-`trash_data` (תוכן הפריט, מחולק לחלקים כדי לעמוד במגבלת 1MB למסמך).
// הסל לא נוגע בקטלוג עצמו: הקטלוג ממשיך להישמר כרגיל, והסל רק מחזיק עותק בטוח של המחוק.
const TRASH_CHUNK = 350000;           // תווים למסמך (בטוח מתחת ל-1MiB גם עם עברית)
const TRASH_DAYS  = 30;

async function trashPut(rec, payload){
  const id = gid();
  const json = JSON.stringify(payload == null ? null : payload);
  const parts = []; for (let i = 0; i < json.length; i += TRASH_CHUNK) parts.push(json.slice(i, i + TRASH_CHUNK));
  if (!parts.length) parts.push('null');
  // קודם התוכן, ורק אחר כך הרשומה — כך כל רשומה בסל תמיד שלמה
  for (let i = 0; i < parts.length; i++) await db.collection('trash_data').doc(id + '_' + i).set({tid:id, i, s:parts[i]});
  await db.collection('trash').doc(id).set(syncClean({...rec, id, deletedAt:Date.now(), chunks:parts.length, bytes:json.length}));
  return id;
}
async function trashList(){
  const snap = await db.collection('trash').get();
  return snap.docs.map(d => d.data()).sort((a,b) => (b.deletedAt||0) - (a.deletedAt||0));
}
async function trashRead(rec){
  let s = '';
  for (let i = 0; i < rec.chunks; i++){
    const d = await db.collection('trash_data').doc(rec.id + '_' + i).get();
    if (!d.exists) throw new Error('חלק מהנתונים בסל חסר');
    s += d.data().s;
  }
  return JSON.parse(s);
}
async function trashRemove(rec){
  for (let i = 0; i < rec.chunks; i++) { try { await db.collection('trash_data').doc(rec.id + '_' + i).delete(); } catch(e) {} }
  await db.collection('trash').doc(rec.id).delete();
}
// מחיקת קטגוריה / תת-קטגוריה: כל דגם נשמר בנפרד + רשומת "מעטפת" של הקטגוריה (אותו batch)
async function trashGroup(kind, ctx, shell, models){
  const batch = gid();
  const base = {bid:ctx.bid, bname:ctx.bname, cid:ctx.cid, cname:ctx.cname, batch, deletedBy:ctx.by};
  for (const {m, scid, scname, idx} of models)
    await trashPut({...base, kind:'model', name:m.name, scid:scid||null, scname:scname||'', idx}, m);
  await trashPut({...base, kind, name:shell.name, scid:ctx.scid||null, scname:ctx.scname||'', idx:ctx.idx, models:models.length}, shell);
}

function TrashModal({onClose, onRestore}){
  const [items, setItems] = useState(null);
  const [busy, setBusy]   = useState(null);
  const [err, setErr]     = useState('');
  const load = async () => {
    try {
      let list = await trashList();
      const old = list.filter(r => Date.now() - (r.deletedAt||0) > TRASH_DAYS*864e5);
      for (const r of old) { try { await trashRemove(r); } catch(e) {} }
      setItems(list.filter(r => !old.includes(r))); setErr('');
    } catch(e) { setErr('לא ניתן לטעון את הסל (בדוק חיבור לאינטרנט)'); setItems([]); }
  };
  useEffect(() => { load(); }, []);

  const groupBatches = new Set((items||[]).filter(r => r.kind !== 'model').map(r => r.batch));
  const rows = (items||[]).filter(r => r.kind !== 'model' || !groupBatches.has(r.batch));
  const relatedOf = r => (items||[]).filter(x => x.kind === 'model' && x.batch === r.batch && r.kind !== 'model');
  const icon = k => k === 'model' ? '📄' : k === 'category' ? '📁' : '📂';
  const when = r => new Date(r.deletedAt).toLocaleString('he-IL', {dateStyle:'short', timeStyle:'short'});
  const left = r => Math.max(0, Math.ceil(TRASH_DAYS - (Date.now() - r.deletedAt)/864e5));

  const restore = async r => {
    setBusy(r.id);
    try { const ok = await onRestore(r, relatedOf(r)); if (ok) await load(); }
    catch(e) { alert('השחזור נכשל: ' + (e && e.message || e)); }
    setBusy(null);
  };
  const purge = async r => {
    const rel = relatedOf(r);
    if (!confirm('למחוק לצמיתות' + (r.kind !== 'model' ? ' את "' + r.name + '"' + (rel.length ? ' ו-' + rel.length + ' הדגמים שבו' : '') : ' את "' + r.name + '"') + '? לא ניתן לשחזר אחר כך.')) return;
    setBusy(r.id);
    try { for (const x of [r, ...rel]) await trashRemove(x); await load(); } catch(e) { alert('המחיקה נכשלה'); }
    setBusy(null);
  };
  const emptyAll = async () => {
    if (!items || !items.length || !confirm('לרוקן את כל הסל לצמיתות? לא ניתן לשחזר אחר כך.')) return;
    setBusy('all');
    try { for (const x of items) await trashRemove(x); await load(); } catch(e) { alert('הריקון נכשל'); }
    setBusy(null);
  };

  return (
    <Modal wide onClose={onClose} title="🗑 סל מחזור">
      <p className="tc-meta" style={{marginBottom:12,lineHeight:1.6}}>
        דגמים וקטגוריות שנמחקו נשמרים כאן {TRASH_DAYS} ימים ואפשר לשחזר אותם למקומם. אחרי {TRASH_DAYS} ימים הם נמחקים אוטומטית.
      </p>
      {err && <div className="tc-meta" style={{color:'var(--red)',marginBottom:10}}>{err}</div>}
      {items === null ? <div className="empty-state">טוען…</div> :
       rows.length === 0 ? <div className="empty-state"><div className="icon">🗑️</div>הסל ריק</div> :
       <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {rows.map(r => {
          const rel = relatedOf(r);
          return (
            <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:14,border:'1px solid var(--border)',background:'var(--card2)',flexWrap:'wrap'}}>
              <span style={{fontSize:20}}>{icon(r.kind)}</span>
              <div style={{flex:1,minWidth:150}}>
                <b style={{fontWeight:700}}>{r.name}</b>{rel.length > 0 && <span className="tc-meta"> · כולל {rel.length} דגמים</span>}
                <div className="tc-meta">{[r.bname, r.kind === 'model' ? r.cname : '', r.kind === 'model' ? r.scname : ''].filter(Boolean).join(' › ')}</div>
                <div className="tc-meta">נמחק {when(r)}{r.deletedBy ? ' · ' + r.deletedBy : ''} · יימחק בעוד {left(r)} ימים</div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => restore(r)}>{busy === r.id ? '…' : 'שחזר'}</button>
                <button className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => purge(r)}>מחק לצמיתות</button>
              </div>
            </div>
          );
        })}
       </div>}
      <div style={{marginTop:16,display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
        <button className="btn btn-secondary" disabled={!rows.length || !!busy} onClick={emptyAll}>רוקן סל</button>
        <button className="btn btn-primary" onClick={onClose}>סגור</button>
      </div>
    </Modal>
  );
}
