// ══════════ גיבוי מלא + מצב עבודה מקומית במחשב ══════════
// 1) גיבוי מלא (ZIP): קובץ שחזור (JSON), רשימת חלקים של כל הדגמים (CSV לאקסל) והשרטוטים כקבצי תמונה מסודרים בתיקיות.
// 2) עבודה מקומית: אם האתר או השרת לא זמינים אפשר להמשיך לערוך. השינויים נשמרים בדפדפן (IndexedDB)
//    וגם בקובץ במחשב (בכרום/אדג'), ואפשר להעלות אותם לשרת כשהוא חוזר. השרת לא נוגע בהם בזמן העבודה המקומית.

// ───────── ZIP (ללא דחיסה — התמונות כבר דחוסות) ─────────
const _crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8){ let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = _crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zipBuild(files){                       // files: [{name, data:Uint8Array}] → Blob
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0, cdSize = 0;
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = (((d.getFullYear() - 1980) & 127) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const nameB = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
    parts.push(lh.buffer, nameB, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, nameB.length, true);
    ch.setUint32(42, offset, true);
    central.push(ch.buffer, nameB); cdSize += 46 + nameB.length;
    offset += 30 + nameB.length + size;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], {type:'application/zip'});
}

async function zipReadEntry(buf, match){        // buf: Uint8Array; מחזיר Uint8Array של הקובץ הראשון ששמו מתאים
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('קובץ ZIP לא תקין');
  let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true), dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nl));
    if (match(name)) {
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
      const raw = buf.subarray(start, start + csize);
      if (method === 0) return raw;
      if (method === 8 && typeof DecompressionStream !== 'undefined') return new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      throw new Error('שיטת דחיסה לא נתמכת בקובץ');
    }
    p += 46 + nl + xl + cl;
  }
  return null;
}

// ───────── עזרים ─────────
const _tick = () => new Promise(r => setTimeout(r, 0));
const bkStamp = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '_' + z(d.getHours()) + z(d.getMinutes()); };
const safeName = (s, fb) => (String(s == null ? '' : s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60)) || fb || 'ללא שם';
function dataUrlToBytes(url){
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(url || ''); if (!m) return null;
  const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const ext = ({'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg','application/pdf':'pdf'})[m[1].toLowerCase()] || 'bin';
  return {bytes: u8, ext};
}
const csvCell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
function downloadBlob(blob, name){
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
const markBackupDone = () => { try { localStorage.setItem('ac_last_backup', String(Date.now())); } catch(e) {} };

function backupStats(data){
  let models = 0, parts = 0, images = 0;
  try { syncAllModels(data).forEach(({m}) => { models++; parts += (m.parts || []).length; images += (m.images || []).length; }); } catch(e) {}
  return {brands: (data.brands || []).length, models, parts, images};
}

// ───────── בניית גיבוי מלא ─────────
async function buildFullBackup(data, onProgress){
  const enc = new TextEncoder(), say = t => { try { onProgress && onProgress(t); } catch(e) {} };
  const files = [], stats = backupStats(data);
  const all = syncAllModels(data);
  // 1) קובץ שחזור
  say('מכין קובץ שחזור…'); await _tick();
  files.push({name:'catalog-backup.json', data: enc.encode(JSON.stringify(data))});
  // 2) רשימת חלקים ושרטוטים
  const colName = {}, colOrder = [];
  const rows = [], imgList = [];
  let n = 0, drawings = 0;
  const used = new Set();
  const uniq = p => { let q = p, i = 2; while (used.has(q.toLowerCase())) q = p.replace(/(\.[a-z0-9]+)?$/i, ' (' + (i++) + ')$1'); used.add(q.toLowerCase()); return q; };
  for (const it of all) {
    const m = it.m;
    const brand = it.b ? it.b.name : '', cat = it.c ? it.c.name : '', sub = it.sc ? it.sc.name : '';
    (m.columns && m.columns.length ? m.columns : DCOLS()).forEach(c => { if (!(c.id in colName)) { colName[c.id] = c.name || c.id; colOrder.push(c.id); } });
    (m.parts || []).forEach(p => {
      const v = p.values || {}; Object.keys(v).forEach(k => { if (!(k in colName)) { colName[k] = k; colOrder.push(k); } });
      rows.push({brand, cat, sub, model: m.name, v, disc: !!p.discontinued, hid: !!p.hidden});
    });
    const folder = 'drawings/' + [safeName(brand, 'מותג'), safeName(cat, 'קטגוריה'), sub ? safeName(sub) : null, safeName(m.name, 'דגם')].filter(Boolean).join('/') + '/';
    (m.images || []).forEach((img, i) => {
      const dec = dataUrlToBytes(img);
      if (dec) { files.push({name: uniq(folder + 'שרטוט ' + (i + 1) + '.' + dec.ext), data: dec.bytes}); drawings++; }
      else if (img) imgList.push([brand, cat, sub, m.name, img]);
    });
    if (++n % 15 === 0) { say('מעבד דגמים… ' + n + ' / ' + all.length); await _tick(); }
  }
  const head = ['מותג', 'קטגוריה', 'תת-קטגוריה', 'דגם', ...colOrder.map(id => colName[id]), 'הופסק', 'מוסתר'];
  const csv = '\uFEFF' + [head.map(csvCell).join(','), ...rows.map(r => [r.brand, r.cat, r.sub, r.model, ...colOrder.map(id => r.v[id]), r.disc ? 'כן' : '', r.hid ? 'כן' : ''].map(csvCell).join(','))].join('\r\n');
  files.push({name:'parts-all.csv', data: enc.encode(csv)});
  if (imgList.length) files.push({name:'drawings-links.txt', data: enc.encode('שרטוטים שמאוחסנים כקישור (לא נשמרו כקבצים):\r\n' + imgList.map(r => r.join(' | ')).join('\r\n'))});
  const readme = [
    'גיבוי מלא של קטלוג חלקי חילוף — תדיראן VRF',
    'נוצר: ' + new Date().toLocaleString('he-IL'),
    '',
    'תוכן הגיבוי: ' + stats.brands + ' מותגים · ' + stats.models + ' דגמים · ' + stats.parts + ' חלקים · ' + drawings + ' שרטוטים',
    '',
    'catalog-backup.json — קובץ השחזור המלא (כולל משתמשים והגדרות). לשחזור: באתר, תפריט ⋮ ← גיבוי ועבודה במחשב ← פתח קובץ גיבוי.',
    'parts-all.csv — רשימת החלקים של כל הדגמים בקובץ אחד, נפתח באקסל.',
    'drawings/ — כל השרטוטים כקבצי תמונה, מסודרים לפי מותג / קטגוריה / דגם.',
    '',
    'שימו לב: הקובץ מכיל גם את סיסמאות המשתמשים. שמרו אותו במקום מאובטח ואל תשלחו אותו הלאה.'
  ].join('\r\n');
  files.unshift({name:'README.txt', data: enc.encode(readme)});
  say('אורז קובץ ZIP…'); await _tick();
  const blob = zipBuild(files);
  return {blob, stats: {...stats, drawings}};
}

// ───────── קריאת קובץ גיבוי (JSON או ZIP) ─────────
function validateBackup(d){
  if (!d || !Array.isArray(d.brands)) throw new Error('זה לא קובץ גיבוי של הקטלוג');
  if (!d.brands.every(b => b && typeof b.id === 'string' && Array.isArray(b.categories))) throw new Error('מבנה הגיבוי לא תקין');
  return d;
}
async function parseBackupFile(file){
  const buf = new Uint8Array(await file.arrayBuffer());
  let bytes = buf;
  if (buf[0] === 0x50 && buf[1] === 0x4B) {
    bytes = await zipReadEntry(buf, nm => /(^|\/)catalog-backup\.json$/.test(nm));
    if (!bytes) throw new Error('בקובץ ה-ZIP אין catalog-backup.json');
  }
  return validateBackup(JSON.parse(new TextDecoder().decode(bytes)));
}

// ───────── אחסון מקומי (IndexedDB + קובץ במחשב) ─────────
const LOCAL_ST = {handle:null, fileName:''};
const _kv = (mode, fn) => _offIdb().then(db0 => new Promise((res, rej) => { const tx = db0.transaction('kv', mode); const rq = fn(tx.objectStore('kv')); tx.oncomplete = () => res(rq && rq.result); tx.onerror = () => rej(tx.error); }));
const kvPut = (k, v) => _kv('readwrite', s => s.put(v, k));
const kvGet = k => _kv('readonly', s => s.get(k));
const kvDel = k => _kv('readwrite', s => s.delete(k));

async function workPut(json){ await kvPut('work', '{"savedAt":' + Date.now() + ',"data":' + json + '}'); try { localStorage.setItem('ac_haswork', '1'); } catch(e) {} }
function workLoad(){
  return Promise.race([
    kvGet('work').then(raw => { if (!raw) return null; const o = JSON.parse(raw); return (o && o.data && Array.isArray(o.data.brands)) ? o : null; }).catch(() => null),
    new Promise(r => setTimeout(() => r(null), 2500))
  ]);
}
const fsSupported = () => typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
async function fileEnsurePerm(h, ask){
  const o = {mode:'readwrite'};
  if (h.queryPermission && (await h.queryPermission(o)) === 'granted') return true;
  return !!(ask && h.requestPermission && (await h.requestPermission(o)) === 'granted');
}
async function fileWrite(h, json){ const w = await h.createWritable(); await w.write(json); await w.close(); }
async function localInit(){
  try { const h = await kvGet('fh'); if (h) { LOCAL_ST.handle = h; LOCAL_ST.fileName = h.name || ''; } } catch(e) {}
  return LOCAL_ST.fileName;
}
async function localPickFile(){
  const h = await window.showSaveFilePicker({suggestedName:'tadiran-catalog-work.json', types:[{description:'קובץ עבודה של הקטלוג', accept:{'application/json':['.json']}}]});
  LOCAL_ST.handle = h; LOCAL_ST.fileName = h.name || '';
  try { await kvPut('fh', h); } catch(e) {}
  return LOCAL_ST.fileName;
}
// שמירה מקומית: תמיד ל-IndexedDB, ובנוסף לקובץ אם נבחר וההרשאה קיימת
async function localPersist(data){
  const json = JSON.stringify(data);
  await workPut(json);
  let fileOk = false;
  if (LOCAL_ST.handle) { try { if (await fileEnsurePerm(LOCAL_ST.handle, false)) { await fileWrite(LOCAL_ST.handle, json); fileOk = true; } } catch(e) {} }
  return {savedAt: Date.now(), fileOk};
}

// ───────── ממשק ─────────
function LocalModeBanner({info, saving, onSaveNow, onOpen}){
  const t = info && info.savedAt ? new Date(info.savedAt).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}) : '';
  return (
    <div className="save-banner local-banner" role="status">
      <span style={{fontSize:18}}>🖥️</span>
      <div className="sb-txt">
        <b>מצב עבודה מקומית</b>
        <span>{saving === 'saving' ? 'שומר במחשב…' : 'השינויים נשמרים במחשב שלך ולא בשרת' + (t ? ' · נשמר ב-' + t : '')}{info && info.fileName ? ' · קובץ: ' + info.fileName + (info.fileOk ? ' ✓' : ' (נדרש אישור הרשאה)') : ''}</span>
      </div>
      <button onClick={onSaveNow}>שמור עכשיו</button>
      <button onClick={onOpen}>אפשרויות</button>
    </div>
  );
}

function BackupModal({data, onClose, localActive, localInfo, onStartLocal, onPickFile, onSaveNow, onUploadToServer, onDiscardLocal}){
  const [busy, setBusy] = useState('');
  const [prog, setProg] = useState('');
  const stats = useMemo(() => backupStats(data), [data]);
  const last = Number((() => { try { return localStorage.getItem('ac_last_backup') || 0; } catch(e) { return 0; } })());
  const days = last ? Math.floor((Date.now() - last) / 864e5) : null;
  const card = {background:'var(--card2)', border:'1px solid var(--border)', borderRadius:16, padding:'14px 16px', marginBottom:12};

  const doZip = async () => {
    setBusy('zip'); setProg('מתחיל…');
    try {
      const {blob, stats: s} = await buildFullBackup(data, setProg);
      downloadBlob(blob, 'tadiran-backup-' + bkStamp() + '.zip'); markBackupDone();
      setProg('✅ הורד קובץ של ' + (blob.size / 1048576).toFixed(1) + 'MB: ' + s.models + ' דגמים, ' + s.parts + ' חלקים, ' + s.drawings + ' שרטוטים');
    } catch(e) { setProg(''); alert('הגיבוי נכשל: ' + (e && e.message || e)); }
    setBusy('');
  };
  const doJson = () => { downloadBlob(new Blob([JSON.stringify(data)], {type:'application/json'}), 'ac-backup-' + bkStamp() + '.json'); markBackupDone(); setProg('✅ הורד קובץ שחזור (JSON)'); };
  const openFile = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const d = await parseBackupFile(f), s = backupStats(d);
      if (!confirm('לפתוח את הגיבוי (' + s.models + ' דגמים, ' + s.parts + ' חלקים) במצב עבודה מקומית?\\nהנתונים בשרת לא ישתנו עד שתחליט להעלות.')) return;
      await onStartLocal(d); onClose();
    } catch(err) { alert('לא ניתן לפתוח את הקובץ: ' + (err && err.message || err)); }
  };

  return (
    <Modal wide onClose={onClose} title="💾 גיבוי ועבודה במחשב">
      <div style={card}>
        <div style={{fontWeight:800, marginBottom:4}}>גיבוי מלא להורדה למחשב</div>
        <div className="tc-meta" style={{lineHeight:1.65, marginBottom:10}}>
          כל הקטלוג ({stats.brands} מותגים · {stats.models} דגמים · {stats.parts} חלקים · {stats.images} שרטוטים) בקובץ ZIP אחד:
          קובץ שחזור, רשימת החלקים של כל הדגמים (נפתחת באקסל) והשרטוטים כקבצי תמונה בתיקיות לפי מותג וקטגוריה ודגם.
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn btn-primary" disabled={!!busy} onClick={doZip}>{busy === 'zip' ? 'מכין…' : '⬇️ הורד גיבוי מלא (ZIP)'}</button>
          <button className="btn btn-secondary" disabled={!!busy} onClick={doJson}>הורד קובץ שחזור בלבד (JSON)</button>
        </div>
        {prog && <div className="tc-meta" style={{marginTop:10}}>{prog}</div>}
        <div className="tc-meta" style={{marginTop:8, color: days === null || days > 14 ? 'var(--orange)' : 'var(--sub)'}}>
          {days === null ? 'עדיין לא הורד גיבוי מהמכשיר הזה. מומלץ לגבות לפחות פעם בשבועיים.' : 'גיבוי אחרון מהמכשיר הזה: לפני ' + (days === 0 ? 'פחות מיום' : days + ' ימים') + '.'}
        </div>
      </div>

      <div style={card}>
        <div style={{fontWeight:800, marginBottom:4}}>🖥️ עבודה במחשב (אם האתר או השרת לא זמינים)</div>
        {localActive ? (<>
          <div className="tc-meta" style={{lineHeight:1.65, marginBottom:10}}>
            אתה במצב עבודה מקומית: כל שינוי נשמר במחשב שלך ולא נשלח לשרת.
            {localInfo && localInfo.savedAt ? ' נשמר לאחרונה ב-' + new Date(localInfo.savedAt).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'}) + '.' : ''}
            {localInfo && localInfo.fileName ? ' קובץ שמירה אוטומטית: ' + localInfo.fileName + '.' : ''}
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={onSaveNow}>💾 שמור עכשיו</button>
            {fsSupported()
              ? <button className="btn btn-secondary" onClick={onPickFile}>📁 {localInfo && localInfo.fileName ? 'החלף קובץ שמירה' : 'בחר קובץ לשמירה אוטומטית במחשב'}</button>
              : <span className="tc-meta">שמירה לקובץ אוטומטית זמינה בכרום או באדג' במחשב. בדפדפן הזה העבודה נשמרת בדפדפן, ואפשר להוריד גיבוי כשרוצים.</span>}
            <button className="btn btn-secondary" onClick={doZip} disabled={!!busy}>⬇️ הורד גיבוי עכשיו</button>
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)'}}>
            <button className="btn btn-primary" onClick={onUploadToServer}>⬆️ חזרה לשרת והעלאת העבודה</button>
            <button className="btn btn-secondary" onClick={onDiscardLocal}>בטל עבודה מקומית (חזרה לנתוני השרת)</button>
          </div>
          <div className="tc-meta" style={{marginTop:8, lineHeight:1.6}}>העלאה לשרת שומרת קודם את מצב השרת הנוכחי בהיסטוריה (גרסאות), כך שאפשר לשחזר אותו.</div>
        </>) : (<>
          <div className="tc-meta" style={{lineHeight:1.65, marginBottom:10}}>
            במצב עבודה מקומית אפשר להמשיך לערוך דגמים, חלקים ושרטוטים גם בלי שרת. כל שינוי נשמר במחשב (ובקובץ לבחירתך), ואחרי שהשרת חוזר אפשר להעלות אותו.
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={async () => { if (confirm('להתחיל עבודה מקומית מהנתונים הנוכחיים?\\nמעכשיו שינויים יישמרו במחשב בלבד ולא בשרת, עד שתחזור לשרת.')) { await onStartLocal(data); onClose(); } }}>▶ התחל עבודה מקומית מהנתונים הנוכחיים</button>
            <label className="btn btn-secondary" style={{cursor:'pointer'}}>📂 פתח קובץ גיבוי (ZIP / JSON)
              <input type="file" accept=".zip,.json" onChange={openFile} style={{display:'none'}}/>
            </label>
          </div>
        </>)}
      </div>
      <div style={{textAlign:'left'}}><button className="btn btn-secondary" onClick={onClose}>סגור</button></div>
    </Modal>
  );
}
