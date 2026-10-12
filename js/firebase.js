const db = window._db;

// ── Core catalog ──
async function fbLoad() {
  const md = await db.collection('catalog').doc('meta').get();
  if (!md.exists) return null;
  const d = md.data().d;
  if (!d.users) d.users = DEFAULT_USERS;
  if (!d.partsDisclaimer) d.partsDisclaimer = DEFAULT_DISCLAIMER;
  const mids = [];
  d.brands.forEach(b => b.categories.forEach(c => c.models.forEach(m => mids.push(m.id))));
  if (!mids.length) return d;
  const chunks = [];
  for (let i=0;i<mids.length;i+=20) chunks.push(mids.slice(i,i+20));
  const allD = [];
  for (const ch of chunks) {
    const docs = await Promise.all(ch.map(id => db.collection('parts').doc(id).get()));
    allD.push(...docs);
  }
  const pm = {};
  allD.forEach(doc => { if (doc.exists) pm[doc.id] = doc.data(); });
  d.brands.forEach(b => b.categories.forEach(c => c.models.forEach(m => {
    const pd = pm[m.id]||{};
    m.parts    = (pd.parts||[]).map(p=>({discontinued:false,tags:'',pinned:false,comments:[],hidden:false,...p}));
    m.images   = pd.images   || [];
    m.columns  = pd.columns  || DCOLS();
    m.synonyms = pd.synonyms || [];
    m.notes    = pd.notes    || '';
  })));
  return d;
}

// Firestore rejects any single document above ~1 MiB (1,048,576 bytes). Hebrew
// text is 2 bytes/char, so measure real UTF-8 bytes, not string length.
const FS_DOC_LIMIT = 1000000;
function fsBytes(o){ try{ return new TextEncoder().encode(JSON.stringify(o)).length; }catch(e){ return 0; } }

async function fbSave(data, mids) {
  const meta = {
    users: data.users || DEFAULT_USERS,
    pass:data.pass, editorPass:data.editorPass, viewerPass:data.viewerPass,
    waDefaults:data.waDefaults||['nameHe','tadPn'],
    welcomeTitle:data.welcomeTitle, welcomeSub:data.welcomeSub,
    disclaimer:data.disclaimer, partsDisclaimer:data.partsDisclaimer||DEFAULT_DISCLAIMER,
    tips:data.tips||[], greetings:data.greetings||null, systemMsg:data.systemMsg||null,
    brands:data.brands.map(b=>({...b,categories:b.categories.map(c=>({...c,models:c.models.map(m=>({id:m.id,name:m.name,hidden:m.hidden||false}))}))}))
  };
  const metaBytes = fsBytes(meta);
  console.info('[fbSave] meta '+Math.round(metaBytes/1024)+'KB · models to write: '+mids.size);
  if (metaBytes > FS_DOC_LIMIT) {
    const err = new Error('מסמך ה-meta גדול מדי ('+Math.round(metaBytes/1024)+'KB, מגבלת Firestore ~1MB) — כנראה בגלל דגמים בתת-קטגוריות שנשמרים בתוכו (כולל חלקים ותמונות). השמירה נעצרה כדי לא להעמיס על Firebase.');
    err.nonRetryable = true; throw err;
  }
  await db.collection('catalog').doc('meta').set({d:meta});
  const batch = db.batch();
  const tooBig = []; let n = 0;
  data.brands.forEach(b=>b.categories.forEach(c=>c.models.forEach(m=>{
    if(!mids.has(m.id))return;
    const payload = {parts:m.parts||[],images:m.images||[],columns:m.columns||DCOLS(),synonyms:m.synonyms||[],notes:m.notes||''};
    const bytes = fsBytes(payload);
    if (bytes > FS_DOC_LIMIT) { tooBig.push(m.name+' ('+Math.round(bytes/1024)+'KB)'); return; }
    batch.set(db.collection('parts').doc(m.id), payload); n++;
  })));
  if (n) await batch.commit();
  if (tooBig.length) {
    const err = new Error('הדגמים הבאים גדולים מדי לשמירה (מעל ~1MB למסמך, לרוב בגלל תמונות/שרטוטים): '+tooBig.join(', ')+'. שאר השינויים נשמרו. הקטן או הסר תמונות מהדגמים האלה.');
    err.nonRetryable = true; throw err;
  }
}

// ── Activity log ──
async function fbHist(e) {
  try { await db.collection('history').add({...e,ts:firebase.firestore.FieldValue.serverTimestamp()}); } catch {}
}
async function fbGetHist() {
  try {
    const s = await db.collection('history').orderBy('ts','desc').limit(200).get();
    return s.docs.map(d=>({id:d.id,...d.data(),ts:d.data().ts?.toDate?.()?.toLocaleString('he-IL')||''}));
  } catch { return []; }
}
async function fbClearHist() {
  try {
    const s = await db.collection('history').get();
    const batch = db.batch();
    s.docs.forEach(d=>batch.delete(d.ref));
    await batch.commit();
  } catch {}
}

// ── News ──
async function fbAddNews(text) { return db.collection('news').add({text,ts:firebase.firestore.FieldValue.serverTimestamp()}); }
async function fbGetNews() {
  try {
    const s = await db.collection('news').orderBy('ts','desc').limit(30).get();
    return s.docs.map(d=>({id:d.id,...d.data(),ts:d.data().ts?.toDate?.()?.toLocaleString('he-IL')||''}));
  } catch { return []; }
}
async function fbDeleteNews(id) { return db.collection('news').doc(id).delete(); }

// ── Reports ──
async function fbSaveReport(r) { return db.collection('reports').add({...r,ts:firebase.firestore.FieldValue.serverTimestamp(),resolved:false}); }
async function fbGetReports() {
  try {
    const s = await db.collection('reports').orderBy('ts','desc').limit(100).get();
    return s.docs.map(d=>({id:d.id,...d.data(),ts:d.data().ts?.toDate?.()?.toLocaleString('he-IL')||''}));
  } catch { return []; }
}
async function fbResolveReport(id) { return db.collection('reports').doc(id).update({resolved:true}); }

// ── Tech requests ──
async function fbSaveTechRequest(r) { return db.collection('techRequests').add({...r,ts:firebase.firestore.FieldValue.serverTimestamp(),resolved:false}); }
async function fbGetTechRequests() {
  try {
    const s = await db.collection('techRequests').orderBy('ts','desc').limit(100).get();
    return s.docs.map(d=>({id:d.id,...d.data(),ts:d.data().ts?.toDate?.()?.toLocaleString('he-IL')||''}));
  } catch { return []; }
}
async function fbResolveTechRequest(id) { return db.collection('techRequests').doc(id).update({resolved:true}); }

// ── Broadcast ──
async function fbSetBroadcast(msg) {
  return db.collection('system').doc('broadcast').set({msg,ts:firebase.firestore.FieldValue.serverTimestamp(),active:!!msg});
}
async function fbGetBroadcast() {
  try { const d=await db.collection('system').doc('broadcast').get(); if(!d.exists||!d.data().active)return null; return d.data(); } catch { return null; }
}

// ── Snapshots ──
async function fbSaveSnapshot(data, actor, action) {
  try {
    // A snapshot is the WHOLE catalog (every part + image) in one document. If
    // it can't fit in a single Firestore document the server rejects it anyway —
    // but only after we've pushed megabytes through the shared write stream,
    // which starves/blocks the real saves queued behind it. Skip it instead.
    const brandsJson = JSON.stringify(data.brands);
    const bytes = new TextEncoder().encode(brandsJson).length;
    if (bytes > FS_DOC_LIMIT) {
      console.warn('[snapshot] דילוג: הקטלוג המלא ('+Math.round(bytes/1024)+'KB) גדול ממסמך Firestore בודד (~1MB), ולכן לא נשמר גיבוי גרסה.');
      return;
    }
    const col = db.collection('snapshots');
    await col.add({actor,action,ts:firebase.firestore.FieldValue.serverTimestamp(),brands:brandsJson});
    // Only fetch the newest 11 (not every snapshot ever stored — each can be ~1MB)
    const recent = await col.orderBy('ts','desc').limit(11).get();
    if (recent.docs.length>10) await Promise.all(recent.docs.slice(10).map(d=>d.ref.delete()));
  } catch {}
}
async function fbGetSnapshots() {
  try {
    const s = await db.collection('snapshots').orderBy('ts','desc').limit(10).get();
    return s.docs.map(d=>({id:d.id,...d.data(),brands:undefined,ts:d.data().ts?.toDate?.()?.toLocaleString('he-IL')||''}));
  } catch { return []; }
}
async function fbRestoreSnapshot(snapId) {
  const doc = await db.collection('snapshots').doc(snapId).get();
  if (!doc.exists) throw new Error('לא נמצא');
  return JSON.parse(doc.data().brands);
}

// ── Views (dashboard) ──
async function fbTrackView(mid, modelName, brandName) {
  try {
    const ref = db.collection('views').doc(mid);
    const d = await ref.get();
    if (d.exists) await ref.update({count:(d.data().count||0)+1,modelName,brandName,lastSeen:firebase.firestore.FieldValue.serverTimestamp()});
    else await ref.set({count:1,modelName,brandName,lastSeen:firebase.firestore.FieldValue.serverTimestamp()});
  } catch {}
}
async function fbGetTopViews() {
  try { const s=await db.collection('views').orderBy('count','desc').limit(20).get(); return s.docs.map(d=>({id:d.id,...d.data()})); } catch { return []; }
}
async function fbResetViews() {
  try {
    const s = await db.collection('views').get();
    const batch = db.batch();
    s.docs.forEach(d=>batch.delete(d.ref));
    await batch.commit();
  } catch {}
}

// ── Alerts log (model/part add/delete events) ──
async function fbLogAlert(e) {
  try { await db.collection('alerts').add({...e,ts:firebase.firestore.FieldValue.serverTimestamp()}); } catch {}
}
async function fbGetAlerts() {
  try {
    const s = await db.collection('alerts').orderBy('ts','desc').limit(100).get();
    return s.docs.map(d=>({id:d.id,...d.data(),ts:d.data().ts?.toDate?.()?.toLocaleString('he-IL')||''}));
  } catch { return []; }
}

// ── Bulk resolve/clear for notifications ──
async function fbResolveAllReports() {
  try {
    const s = await db.collection('reports').where('resolved','==',false).get();
    const batch = db.batch();
    s.docs.forEach(d=>batch.update(d.ref,{resolved:true}));
    await batch.commit();
  } catch {}
}
async function fbResolveAllTechRequests() {
  try {
    const s = await db.collection('techRequests').where('resolved','==',false).get();
    const batch = db.batch();
    s.docs.forEach(d=>batch.update(d.ref,{resolved:true}));
    await batch.commit();
  } catch {}
}
async function fbClearAlerts() {
  try {
    const s = await db.collection('alerts').get();
    const batch = db.batch();
    s.docs.forEach(d=>batch.delete(d.ref));
    await batch.commit();
  } catch {}
}
