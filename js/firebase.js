const db = window._db;

// ── Core catalog ──
// Layout in Firestore:  catalog/meta  = settings + brand/category/model tree (models are stubs: id, name, hidden)
//                       parts/{modelId} = that model's parts, images, columns, synonyms, notes
// Sub-category models used to live INSIDE meta (making it huge and easy to overwrite). They now get their own
// parts/{id} document like every other model; old embedded ones are moved over automatically on the next save.
//
// Saving is a MERGE, not an overwrite — see sync.js. SYNC_ST remembers what this browser last synced.
const SYNC_ST = { loaded:false, meta:null, models:{}, pending:new Set() };

async function fbLoad() {
  SYNC_ST.loaded = false;
  const md = await db.collection('catalog').doc('meta').get();
  if (!md.exists) { SYNC_ST.loaded = true; SYNC_ST.meta = null; SYNC_ST.models = {}; SYNC_ST.pending = new Set(); return null; }
  const d = md.data().d;
  const rawMeta = syncClean(JSON.parse(JSON.stringify(d)));   // exactly what the server holds (the merge "base")
  if (!d.users) d.users = DEFAULT_USERS;
  if (!d.partsDisclaimer) d.partsDisclaimer = DEFAULT_DISCLAIMER;
  const all = syncAllModels(d);
  const mids = all.map(x => x.m.id);
  const pm = {};
  if (mids.length) {
    const chunks = [];
    for (let i=0;i<mids.length;i+=20) chunks.push(mids.slice(i,i+20));
    for (const ch of chunks) {
      const docs = await Promise.all(ch.map(id => db.collection('parts').doc(id).get()));
      docs.forEach(doc => { if (doc.exists) pm[doc.id] = doc.data(); });
    }
  }
  const models = {}; const pending = new Set();
  all.forEach(({m, sub}) => {
    const pd = pm[m.id];
    const embedded = sub && !pd && Array.isArray(m.parts);   // legacy sub-category model stored inside meta
    const src = pd || (embedded ? {parts:m.parts, images:m.images, columns:m.columns, synonyms:m.synonyms, notes:m.notes} : {});
    if (embedded) pending.add(m.id);
    m.parts    = (src.parts||[]).map(syncDefaults);
    m.images   = src.images   || [];
    m.columns  = src.columns  || DCOLS();
    m.synonyms = src.synonyms || [];
    m.notes    = src.notes    || '';
    models[m.id] = syncModelDoc(m);
  });
  SYNC_ST.meta = rawMeta; SYNC_ST.models = models; SYNC_ST.pending = pending; SYNC_ST.loaded = true;
  return d;
}

// Firestore rejects any single document above ~1 MiB (1,048,576 bytes). Hebrew
// text is 2 bytes/char, so measure real UTF-8 bytes, not string length.
const FS_DOC_LIMIT = 1000000;
function fsBytes(o){ try{ return new TextEncoder().encode(JSON.stringify(o)).length; }catch(e){ return 0; } }
const SAVE_CHUNK = 20;   // model documents per transaction

function fbSaveError(msg, nonRetryable) { const e = new Error(msg); if (nonRetryable) e.nonRetryable = true; return e; }

// Merge-save. Works out what THIS browser changed since it last synced and applies only that on top of the
// latest server version, inside transactions — so two admins saving at the same time don't overwrite each other.
// Returns what was sent / what the server now holds, so the app can show other editors' changes (fbIncorporate).
async function fbSave(data, midsHint) {
  const st = SYNC_ST;
  if (!st.loaded) throw fbSaveError('הקטלוג לא נטען מהשרת, ולכן השמירה נעצרה כדי לא לדרוס את המידע האמיתי. רענן את הדף.', true);

  const localMeta = syncSlimMeta(data);
  const localModels = new Map();
  syncAllModels(data).forEach(({m}) => localModels.set(m.id, syncModelDoc(m)));

  const dirty = [];
  localModels.forEach((doc, id) => {
    const base = st.models[id];
    if (!base || st.pending.has(id) || (midsHint && midsHint.has && midsHint.has(id)) || !syncDocEq(doc, base)) dirty.push(id);
  });
  // moving legacy embedded sub-models to their own documents also means slimming the meta document
  const metaDirty = !st.meta || !syncEq(localMeta, syncNormMeta(st.meta)) || dirty.some(id => st.pending.has(id));
  if (!dirty.length && !metaDirty) return null;
  console.info('[fbSave] models to write: '+dirty.length+' · meta '+(metaDirty?'changed':'unchanged'));

  const metaRef = db.collection('catalog').doc('meta');
  const mergedDocs = {};
  const tooBig = [];

  // 1) model documents (parts first, so meta never points at a model that has no document yet)
  for (let i=0; i<dirty.length; i+=SAVE_CHUNK) {
    const ids = dirty.slice(i, i+SAVE_CHUNK);
    const res = await db.runTransaction(async tx => {
      const snaps = await Promise.all(ids.map(id => tx.get(db.collection('parts').doc(id))));
      const out = {}; const bigIds = [];
      ids.forEach((id, k) => {
        const local = localModels.get(id);
        const server = snaps[k].exists ? snaps[k].data() : null;
        out[id] = syncClean(server ? syncMergeModelDoc(st.models[id], local, server) : local);
      });
      ids.forEach(id => {
        if (fsBytes(out[id]) > FS_DOC_LIMIT) bigIds.push(id);
        else tx.set(db.collection('parts').doc(id), out[id]);
      });
      return {out, bigIds};
    });
    ids.forEach(id => {
      if (res.bigIds.includes(id)) {
        const nm = (syncAllModels(data).find(x => x.m.id===id) || {m:{name:id}}).m.name;
        tooBig.push(nm+' ('+Math.round(fsBytes(res.out[id])/1024)+'KB)');
      } else mergedDocs[id] = res.out[id];
    });
  }

  // 2) the slim meta document
  let mergedMeta = null;
  if (metaDirty) {
    mergedMeta = await db.runTransaction(async tx => {
      const s = await tx.get(metaRef);
      const server = s.exists ? s.data().d : null;
      const m = syncClean(server ? syncMergeMeta(st.meta, localMeta, server) : localMeta);
      const bytes = fsBytes(m);
      if (bytes > FS_DOC_LIMIT) throw fbSaveError('מסמך ה-meta גדול מדי ('+Math.round(bytes/1024)+'KB, מגבלת Firestore ~1MB). השמירה נעצרה כדי לא להעמיס על Firebase.', true);
      tx.set(metaRef, {d:m});
      return m;
    });
  } else {
    mergedMeta = localMeta;
  }

  // 3) models another editor added (they appear in the merged meta but not here) — fetch them so we can show them
  const remoteNew = {};
  const newIds = [];
  syncAllModels(mergedMeta).forEach(({m}) => { if (!localModels.has(m.id)) newIds.push(m.id); });
  if (newIds.length) {
    const docs = await Promise.all(newIds.map(id => db.collection('parts').doc(id).get()));
    docs.forEach((doc, k) => { remoteNew[newIds[k]] = doc.exists ? doc.data() : {}; });
  }

  // 4) verify: read back from the SERVER and make sure the parts we sent are really there
  const written = Object.keys(mergedDocs);
  if (written.length) {
    const back = await Promise.all(written.map(id => db.collection('parts').doc(id).get({source:'server'})));
    const bad = [];
    back.forEach((doc, k) => {
      const id = written[k], want = mergedDocs[id], got = doc.exists ? doc.data() : null;
      const wantIds = (want.parts||[]).map(p=>p.id), gotIds = new Set(((got&&got.parts)||[]).map(p=>p.id));
      if (!got || wantIds.some(x => !gotIds.has(x)) || ((want.images||[]).length !== ((got.images||[]).length))) bad.push(id);
    });
    if (bad.length) throw fbSaveError('אימות השמירה נכשל (ייתכן שהשרת עדיין לא עדכן). המערכת תנסה שוב אוטומטית.', false);
  }

  // 5) remember what we synced
  written.forEach(id => { st.models[id] = localModels.get(id); st.pending.delete(id); });
  if (metaDirty) st.meta = localMeta;

  const sentModels = {};
  written.forEach(id => { sentModels[id] = localModels.get(id); });
  const result = {sent:{meta:localMeta, models:sentModels}, merged:{meta:mergedMeta, models:mergedDocs}, remoteNew};
  if (tooBig.length) {
    const err = fbSaveError('הדגמים הבאים גדולים מדי לשמירה (מעל ~1MB למסמך, לרוב בגלל תמונות/שרטוטים): '+tooBig.join(', ')+'. שאר השינויים נשמרו. הקטן או הסר תמונות מהדגמים האלה.', true);
    err.result = result; throw err;
  }
  return result;
}

// After a save: show what other editors added, but only where this browser has no newer edits of its own
function fbIncorporate(result, d) {
  if (!result || !d) return d;
  const st = SYNC_ST;
  const sentMeta = result.sent.meta, mergedMeta = result.merged.meta;
  let out = syncMapModels(d, m => {
    const sent = result.sent.models[m.id], merged = result.merged.models[m.id];
    if (!sent || !merged) return m;
    if (!syncDocEq(syncModelDoc(m), sent)) return m;      // edited again while saving → next save merges again
    if (syncDocEq(sent, merged)) return m;
    const nm = {...m, parts:(merged.parts||[]).map(syncDefaults), images:merged.images||[], columns:merged.columns||DCOLS(), synonyms:merged.synonyms||[], notes:merged.notes||''};
    st.models[m.id] = syncModelDoc(nm);
    return nm;
  });
  if (mergedMeta && syncEq(syncSlimMeta(d), sentMeta) && !syncEq(mergedMeta, sentMeta)) {
    const have = new Map(); syncAllModels(out).forEach(({m}) => have.set(m.id, m));
    Object.keys(result.remoteNew||{}).forEach(id => {
      const nm = syncHydrate({id, name:'', hidden:false}, result.remoteNew[id]);
      have.set(id, nm); st.models[id] = syncModelDoc(nm);
    });
    const brands = syncRebuildBrands(mergedMeta, have, null);
    const top = {}; Object.keys(mergedMeta).forEach(k => { if (k!=='brands') top[k] = mergedMeta[k]; });
    out = {...out, ...top, brands};
    st.meta = mergedMeta;
  }
  return out;
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
